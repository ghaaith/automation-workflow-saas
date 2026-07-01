from __future__ import annotations

import json
import logging
import re

import httpx

from app.services.integrations.base import BaseIntegrationService
from app.services.credential_encryption import decrypt_sensitive_fields

logger = logging.getLogger(__name__)

API_CALL_TIMEOUT = 30
API_CALL_MAX_RETRIES = 2


class ApiCallService(BaseIntegrationService):
    async def execute(self, config: dict, context: dict) -> dict:
        decrypted = decrypt_sensitive_fields(config)
        url = self._render_template(decrypted.get("url", ""), context)
        method = decrypted.get("method", "GET").upper()
        headers = decrypted.get("headers", {})
        body = decrypted.get("body", "")
        auth_type = decrypted.get("auth_type", "none")
        auth_credentials = decrypted.get("auth", {})

        rendered_headers = {
            k: self._render_template(v, context)
            for k, v in (headers.items() if isinstance(headers, dict) else {}.items())
        }
        rendered_body = self._render_template(body, context) if isinstance(body, str) else json.dumps(body)

        if not url:
            return {
                "url": url,
                "status_code": 0,
                "response": None,
                "success": False,
                "logs": [{"level": "error", "message": "No URL configured"}],
            }

        client_headers = dict(rendered_headers)
        if auth_type == "bearer":
            token = self._render_template(auth_credentials.get("token", ""), context)
            client_headers["Authorization"] = f"Bearer {token}"
        elif auth_type == "basic":
            username = self._render_template(auth_credentials.get("username", ""), context)
            password = self._render_template(auth_credentials.get("password", ""), context)
            auth = (username, password)
        else:
            auth = None

        for attempt in range(1, API_CALL_MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=API_CALL_TIMEOUT) as client:
                    if method == "GET":
                        resp = await client.get(url, headers=client_headers, auth=auth)
                    elif method == "POST":
                        resp = await client.post(url, headers=client_headers, content=rendered_body, auth=auth)
                    elif method == "PUT":
                        resp = await client.put(url, headers=client_headers, content=rendered_body, auth=auth)
                    elif method == "PATCH":
                        resp = await client.patch(url, headers=client_headers, content=rendered_body, auth=auth)
                    elif method == "DELETE":
                        resp = await client.delete(url, headers=client_headers, auth=auth)
                    else:
                        return {"url": url, "status_code": 0, "response": None, "success": False, "logs": [{"level": "error", "message": f"Unsupported method: {method}"}]}

                    response_body = ""
                    try:
                        response_body = resp.json()
                    except Exception:
                        response_body = resp.text

                    return {
                        "url": url,
                        "method": method,
                        "status_code": resp.status_code,
                        "response": response_body,
                        "success": resp.status_code < 400,
                        "logs": [
                            {"level": "info", "message": f"{method} {url} -> {resp.status_code}"},
                        ],
                    }
            except httpx.TimeoutException as e:
                logger.warning("API call timeout attempt %d/%d: %s", attempt, API_CALL_MAX_RETRIES, e)
                if attempt == API_CALL_MAX_RETRIES:
                    return {"url": url, "status_code": 0, "response": None, "success": False, "logs": [{"level": "error", "message": f"Request timed out: {e}"}]}
            except httpx.HTTPStatusError as e:
                return {"url": url, "status_code": e.response.status_code, "response": e.response.text, "success": False, "logs": [{"level": "error", "message": f"HTTP {e.response.status_code}: {e}"}]}
            except Exception as e:
                logger.warning("API call attempt %d/%d failed: %s", attempt, API_CALL_MAX_RETRIES, e)
                if attempt == API_CALL_MAX_RETRIES:
                    return {"url": url, "status_code": 0, "response": None, "success": False, "logs": [{"level": "error", "message": f"Request failed: {e}"}]}

    async def validate(self, config: dict) -> list[str]:
        errors = []
        if not config.get("url"):
            errors.append("URL is required")
        method = config.get("method", "GET").upper()
        if method not in ("GET", "POST", "PUT", "PATCH", "DELETE"):
            errors.append(f"Unsupported HTTP method: {method}")
        return errors

    async def test_connection(self, config: dict) -> tuple[bool, str]:
        result = await self.execute(config, {})
        if result.get("success"):
            return True, f"{result['method']} {config.get('url', '')} -> {result['status_code']}"
        return False, result.get("logs", [{}])[0].get("message", "Request failed")

    def _render_template(self, template: str, context: dict) -> str:
        if not isinstance(template, str):
            return template

        def replace_var(match: re.Match) -> str:
            path = match.group(1).strip()
            parts = path.split(".")
            val: dict | str | int | float | None = context
            for part in parts:
                if isinstance(val, dict):
                    val = val.get(part)
                else:
                    return match.group(0)
            if val is None:
                return match.group(0)
            if isinstance(val, (dict, list)):
                return json.dumps(val)
            return str(val)

        return re.sub(r"\{\{(.*?)\}\}", replace_var, template)
