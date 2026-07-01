from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings


def _get_fernet() -> Fernet:
    raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key = base64.urlsafe_b64encode(raw)
    return Fernet(key)


def encrypt_value(plain_text: str) -> str:
    if not plain_text:
        return ""
    return _get_fernet().encrypt(plain_text.encode()).decode()


def decrypt_value(cipher_text: str) -> str:
    if not cipher_text:
        return ""
    return _get_fernet().decrypt(cipher_text.encode()).decode()


SENSITIVE_KEYS = {"password", "api_key", "token", "webhook_url", "secret", "private_key", "access_key_id", "secret_access_key"}


def encrypt_sensitive_fields(config: dict) -> dict:
    result = {}
    for key, value in config.items():
        if key in SENSITIVE_KEYS and isinstance(value, str) and value:
            result[key] = encrypt_value(value)
        else:
            result[key] = value
    return result


def decrypt_sensitive_fields(config: dict) -> dict:
    result = {}
    for key, value in config.items():
        if key in SENSITIVE_KEYS and isinstance(value, str) and value:
            try:
                result[key] = decrypt_value(value)
            except Exception:
                result[key] = value
        else:
            result[key] = value
    return result
