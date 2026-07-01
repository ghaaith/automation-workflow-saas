from __future__ import annotations

import hashlib
import hmac
import logging
import secrets

from app.services.integrations.base import BaseIntegrationService
from app.services.credential_encryption import decrypt_sensitive_fields

logger = logging.getLogger(__name__)


def generate_webhook_secret() -> str:
    return secrets.token_urlsafe(32)


def compute_signature(payload: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


def verify_signature(payload: bytes, secret: str, signature: str) -> bool:
    expected = compute_signature(payload, secret)
    return hmac.compare_digest(expected, signature)


class WebhookService(BaseIntegrationService):
    async def execute(self, config: dict, context: dict) -> dict:
        decrypted = decrypt_sensitive_fields(config)
        secret = decrypted.get("webhook_secret", "")
        payload = context.get("incoming_payload", {})
        headers = context.get("incoming_headers", {})

        return {
            "verified": bool(secret),
            "payload_schema": {},
            "payload": payload,
            "headers": dict(headers) if isinstance(headers, dict) else {},
            "logs": [
                {"level": "info", "message": "Webhook triggered"},
                {"level": "info", "message": f"Headers received: {len(headers)}"},
            ],
        }

    async def validate(self, config: dict) -> list[str]:
        return []

    async def test_connection(self, config: dict) -> tuple[bool, str]:
        return True, "Webhook endpoint active"
