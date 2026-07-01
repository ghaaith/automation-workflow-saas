from __future__ import annotations

import logging

import resend as resend_sdk

from app.core.config import settings
from app.services.integrations.base import BaseIntegrationService

logger = logging.getLogger(__name__)


class ResendService(BaseIntegrationService):
    async def execute(self, config: dict, context: dict) -> dict:
        api_key = config.get("resend_api_key") or settings.RESEND_API_KEY
        from_email = config.get("from_email") or settings.RESEND_FROM_EMAIL

        to = config.get("to", "")
        subject_template = config.get("subject", "Workflow Notification")
        body_template = config.get("body", "Your workflow has been processed.")

        subject = self._render_template(subject_template, context)
        body = self._render_template(body_template, context)

        if not to:
            logger.warning("No recipient configured — logging email")
            return {
                "to": "",
                "subject": subject,
                "body_preview": body[:200],
                "sent": False,
                "logs": [{"level": "warn", "message": "No recipient configured"}],
            }

        if not api_key:
            logger.warning("No Resend API key configured")
            return {
                "to": to,
                "subject": subject,
                "body_preview": body[:200],
                "sent": False,
                "logs": [{"level": "warn", "message": "No Resend API key — set RESEND_API_KEY in .env or Settings"}],
            }

        if not from_email:
            from_email = "onboarding@resend.dev"

        try:
            resend_sdk.api_key = api_key

            params = {
                "from": from_email,
                "to": [to],
                "subject": subject,
                "text": body,
            }

            response = resend_sdk.Emails.send(params)

            return {
                "to": to,
                "subject": subject,
                "body_preview": body[:200],
                "sent": True,
                "email_id": response.get("id", ""),
                "logs": [{"level": "info", "message": f"Email sent to {to} via Resend"}],
            }

        except Exception as exc:
            logger.exception("Resend email failed")
            return {
                "to": to,
                "subject": subject,
                "body_preview": body[:200],
                "sent": False,
                "error": str(exc),
                "logs": [{"level": "error", "message": f"Resend error: {exc}"}],
            }

    async def validate(self, config: dict) -> list[str]:
        errors = []
        if not config.get("to"):
            errors.append("recipient (to) is required")
        return errors

    async def test_connection(self, config: dict) -> tuple[bool, str]:
        api_key = config.get("resend_api_key") or settings.RESEND_API_KEY
        if not api_key:
            return False, "No Resend API key configured"
        try:
            resend_sdk.api_key = api_key
            resend_sdk.Domain.list()
            return True, "Resend API key is valid"
        except Exception as exc:
            return False, str(exc)

    def _resolve(self, path: str, context: dict):
        """Resolve a dotted path against context, then search nested values if not found."""
        parts = path.split(".")
        val: dict | str | int | float | None = context
        for part in parts:
            if isinstance(val, dict):
                val = val.get(part)
            else:
                val = None
                break
        if val is not None:
            return val
        # Not found at top level — search all nested values recursively
        for v in context.values():
            if isinstance(v, dict):
                result = self._resolve(path, v)
                if result is not None:
                    return result
        return None

    def _render_template(self, template: str, context: dict) -> str:
        import json as json_mod
        import re

        def replace_var(match: re.Match) -> str:
            expression = match.group(1).strip()
            parts = expression.split("|")
            path = parts[0].strip()
            filters = [f.strip() for f in parts[1:]]

            val = self._resolve(path, context)
            if val is None:
                return match.group(0)

            for f in filters:
                if f == "tojson":
                    return json_mod.dumps(val, ensure_ascii=False)
                if f == "safe":
                    continue
                if f.startswith("default("):
                    fallback = f[8:-1].strip().strip("'\"")
                    if not val:
                        return fallback

            if isinstance(val, (dict, list)):
                return json_mod.dumps(val, ensure_ascii=False)
            return str(val)

        return re.sub(r"\{\{(.*?)\}\}", replace_var, template)
