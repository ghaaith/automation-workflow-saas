from __future__ import annotations

import json
import logging
import re

import httpx

from app.services.integrations.base import BaseIntegrationService
from app.services.credential_encryption import decrypt_sensitive_fields

logger = logging.getLogger(__name__)

SLACK_MAX_RETRIES = 3


class SlackService(BaseIntegrationService):
    async def execute(self, config: dict, context: dict) -> dict:
        decrypted = decrypt_sensitive_fields(config)
        webhook_url = decrypted.get("webhook_url", "")
        channel = decrypted.get("channel", "#general")
        message_template = decrypted.get("message", "")
        bot_token = decrypted.get("bot_token", "")

        message = self._render_template(message_template, context)
        if not message:
            message = self._build_document_summary(context)

        if bot_token:
            return await self._send_via_api(bot_token, channel, message)
        elif webhook_url:
            return await self._send_via_webhook(webhook_url, message, channel)
        else:
            logger.warning("No Slack credentials configured — logging message")
            return {
                "channel": channel,
                "message": message,
                "sent": False,
                "logs": [{"level": "warn", "message": "No Slack credentials configured — message printed to logs"}],
            }

    async def _send_via_webhook(self, webhook_url: str, message: str, channel: str) -> dict:
        for attempt in range(1, SLACK_MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.post(webhook_url, json={"text": message})
                    resp.raise_for_status()
                return {
                    "channel": channel,
                    "message": message,
                    "sent": True,
                    "logs": [{"level": "info", "message": f"Slack message sent to #{channel}"}],
                }
            except httpx.HTTPStatusError as e:
                logger.warning("Slack webhook attempt %d/%d failed: %s", attempt, SLACK_MAX_RETRIES, e)
                if attempt == SLACK_MAX_RETRIES:
                    return {
                        "channel": channel,
                        "message": message,
                        "sent": False,
                        "error": str(e),
                        "logs": [{"level": "error", "message": f"Slack webhook failed: {e}"}],
                    }
            except httpx.RequestError as e:
                logger.warning("Slack webhook network error attempt %d/%d: %s", attempt, SLACK_MAX_RETRIES, e)
                if attempt == SLACK_MAX_RETRIES:
                    return {
                        "channel": channel,
                        "message": message,
                        "sent": False,
                        "error": str(e),
                        "logs": [{"level": "error", "message": f"Slack network error: {e}"}],
                    }

    async def _send_via_api(self, bot_token: str, channel: str, message: str) -> dict:
        for attempt in range(1, SLACK_MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.post(
                        "https://slack.com/api/chat.postMessage",
                        headers={
                            "Authorization": f"Bearer {bot_token}",
                            "Content-Type": "application/json",
                        },
                        json={"channel": channel, "text": message},
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    if not data.get("ok"):
                        raise RuntimeError(data.get("error", "unknown_slack_error"))
                return {
                    "channel": channel,
                    "message": message,
                    "sent": True,
                    "logs": [{"level": "info", "message": f"Slack message sent to #{channel} via API"}],
                }
            except Exception as e:
                logger.warning("Slack API attempt %d/%d failed: %s", attempt, SLACK_MAX_RETRIES, e)
                if attempt == SLACK_MAX_RETRIES:
                    return {
                        "channel": channel,
                        "message": message,
                        "sent": False,
                        "error": str(e),
                        "logs": [{"level": "error", "message": f"Slack API failed: {e}"}],
                    }

    def _build_document_summary(self, context: dict) -> str:
        lines = ["📋 *Workflow Summary*", ""]

        ai_summary = None
        ai_extracted = None
        doc_text = None
        doc_filename = None

        for key, val in context.items():
            if isinstance(val, dict):
                doc_filename = val.get("filename") or doc_filename
                ai_summary = val.get("summary") or ai_summary
                ai_extracted = val.get("extracted") or ai_extracted
                doc_text = val.get("text") or val.get("content") or val.get("extracted_text") or doc_text

        if ai_summary:
            summary_text = ai_summary if isinstance(ai_summary, str) else json.dumps(ai_summary, indent=2)
            lines.append(f"*AI Summary:* {summary_text[:1500]}")
        elif ai_extracted:
            extracted_text = ai_extracted if isinstance(ai_extracted, str) else json.dumps(ai_extracted, indent=2)
            lines.append(f"*Extracted Data:* {extracted_text[:1500]}")
        elif doc_text:
            preview = doc_text[:1500]
            lines.append(f"*Document Content:*\n{preview}")
            if len(doc_text) > 1500:
                lines.append("*(content truncated)*")
        else:
            lines.append("No document content available for summary.")

        if doc_filename:
            lines.insert(1, f"*File:* {doc_filename}")

        return "\n".join(lines)

    async def validate(self, config: dict) -> list[str]:
        errors = []
        webhook = config.get("webhook_url")
        token = config.get("bot_token")
        if not webhook and not token:
            errors.append("either webhook_url or bot_token is required")
        return errors

    async def test_connection(self, config: dict) -> tuple[bool, str]:
        decrypted = decrypt_sensitive_fields(config)
        webhook_url = decrypted.get("webhook_url", "")
        bot_token = decrypted.get("bot_token", "")

        if bot_token:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.post(
                        "https://slack.com/api/auth.test",
                        headers={"Authorization": f"Bearer {bot_token}"},
                    )
                    data = resp.json()
                    if data.get("ok"):
                        return True, f"Authenticated as {data.get('user', 'unknown')}"
                    return False, data.get("error", "auth failed")
            except Exception as e:
                return False, str(e)

        if webhook_url:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.post(webhook_url, json={"text": "Test from AI Workflow SaaS"})
                    if resp.status_code == 200:
                        return True, "Webhook test message sent"
                    return False, f"Webhook returned {resp.status_code}"
            except Exception as e:
                return False, str(e)

        return False, "No credentials configured"

    def _render_template(self, template: str, context: dict) -> str:
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
