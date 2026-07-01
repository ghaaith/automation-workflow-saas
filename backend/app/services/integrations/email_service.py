from __future__ import annotations

import json
import logging
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.services.integrations.base import BaseIntegrationService
from app.services.credential_encryption import decrypt_sensitive_fields

logger = logging.getLogger(__name__)


class EmailService(BaseIntegrationService):
    async def execute(self, config: dict, context: dict) -> dict:
        decrypted = decrypt_sensitive_fields(config)
        to = decrypted.get("to", "")
        subject_template = decrypted.get("subject", "Workflow Notification")
        body_template = decrypted.get("body", "Your workflow has been processed.")
        cc = decrypted.get("cc", "")
        bcc = decrypted.get("bcc", "")

        subject = self._render_template(subject_template, context)
        body = self._render_template(body_template, context)

        if not to:
            logger.warning("No recipient configured — logging email")
            return {
                "to": "",
                "subject": subject,
                "body_preview": body[:200] + "..." if len(body) > 200 else body,
                "sent": False,
                "logs": [{"level": "warn", "message": "No recipient configured — email printed to logs"}],
            }

        smtp_host = decrypted.get("smtp_host", "")
        smtp_port = int(decrypted.get("smtp_port", 587))
        smtp_user = decrypted.get("smtp_user", "")
        smtp_password = decrypted.get("smtp_password", "")
        from_email = decrypted.get("from_email", smtp_user)

        if smtp_host and smtp_user and smtp_password:
            return await self._send_via_smtp(
                smtp_host=smtp_host,
                smtp_port=smtp_port,
                smtp_user=smtp_user,
                smtp_password=smtp_password,
                from_email=from_email,
                to=to,
                cc=cc,
                bcc=bcc,
                subject=subject,
                body=body,
            )
        else:
            logger.info("No SMTP configured — logging email to console")
            return {
                "to": to,
                "subject": subject,
                "body_preview": body[:200] + "..." if len(body) > 200 else body,
                "sent": False,
                "logs": [
                    {"level": "info", "message": f"Email would be sent to {to}"},
                    {"level": "info", "message": f"Subject: {subject}"},
                ],
            }

    async def _send_via_smtp(
        self,
        smtp_host: str,
        smtp_port: int,
        smtp_user: str,
        smtp_password: str,
        from_email: str,
        to: str,
        cc: str,
        bcc: str,
        subject: str,
        body: str,
    ) -> dict:
        recipients = [to]
        if cc:
            recipients.extend([addr.strip() for addr in cc.split(",") if addr.strip()])
        if bcc:
            recipients.extend([addr.strip() for addr in bcc.split(",") if addr.strip()])

        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = from_email
            msg["To"] = to
            msg["Subject"] = subject
            if cc:
                msg["Cc"] = cc

            msg.attach(MIMEText(body, "plain"))

            use_tls = smtp_port == 587

            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                if use_tls:
                    server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, recipients, msg.as_string())

            log_msg = f"Email sent to {to}"
            if cc:
                log_msg += f" (CC: {cc})"

            return {
                "to": to,
                "subject": subject,
                "body_preview": body[:200] + "..." if len(body) > 200 else body,
                "sent": True,
                "logs": [{"level": "info", "message": log_msg}],
            }
        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP authentication failed for %s", smtp_user)
            return {
                "to": to,
                "subject": subject,
                "body_preview": body[:200] + "..." if len(body) > 200 else body,
                "sent": False,
                "error": "SMTP authentication failed",
                "logs": [{"level": "error", "message": "SMTP authentication failed"}],
            }
        except smtplib.SMTPException as e:
            logger.error("SMTP error: %s", e)
            return {
                "to": to,
                "subject": subject,
                "body_preview": body[:200] + "..." if len(body) > 200 else body,
                "sent": False,
                "error": str(e),
                "logs": [{"level": "error", "message": f"SMTP error: {e}"}],
            }

    async def validate(self, config: dict) -> list[str]:
        errors = []
        if not config.get("to"):
            errors.append("recipient (to) is required")
        if not config.get("body"):
            errors.append("body template is required")
        return errors

    async def test_connection(self, config: dict) -> tuple[bool, str]:
        decrypted = decrypt_sensitive_fields(config)
        smtp_host = decrypted.get("smtp_host", "")
        smtp_port = int(decrypted.get("smtp_port", 587))
        smtp_user = decrypted.get("smtp_user", "")
        smtp_password = decrypted.get("smtp_password", "")

        if not smtp_host or not smtp_user or not smtp_password:
            return False, "SMTP credentials not fully configured"

        try:
            use_tls = smtp_port == 587
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                if use_tls:
                    server.starttls()
                server.login(smtp_user, smtp_password)
                server.quit()
            return True, f"SMTP connection successful to {smtp_host}:{smtp_port}"
        except Exception as e:
            return False, str(e)

    def _render_template(self, template: str, context: dict) -> str:
        def _resolve(path: str, ctx: dict):
            parts = path.split(".")
            val: dict | str | int | float | None = ctx
            for part in parts:
                if isinstance(val, dict):
                    val = val.get(part)
                else:
                    val = None
                    break
            if val is not None:
                return val
            for v in ctx.values():
                if isinstance(v, dict):
                    result = _resolve(path, v)
                    if result is not None:
                        return result
            return None

        def replace_var(match: re.Match) -> str:
            expression = match.group(1).strip()
            parts = expression.split("|")
            path = parts[0].strip()
            filters = [f.strip() for f in parts[1:]]
            val = _resolve(path, context)
            if val is None:
                return match.group(0)
            for f in filters:
                if f == "tojson":
                    return json.dumps(val, ensure_ascii=False)
                if f == "safe":
                    continue
                if f.startswith("default("):
                    fallback = f[8:-1].strip().strip("'\"")
                    if not val:
                        return fallback
            if isinstance(val, (dict, list)):
                return json.dumps(val, ensure_ascii=False)
            return str(val)

        return re.sub(r"\{\{(.*?)\}\}", replace_var, template)
