import smtplib
import ssl
import json
from datetime import datetime, timezone
from pathlib import Path
from email.message import EmailMessage
from ..core.config import settings
from ..core.logging import logger

OUTBOX_PATH = Path(__file__).resolve().parents[2] / "sent_emails.json"

def _smtp_configured() -> bool:
    return bool(settings.smtp_user and settings.smtp_password)

def _save_to_outbox(to_email: str, subject: str, html_body: str, text_body: str | None, reset_link: str | None = None):
    try:
        entry = {
            "to": to_email,
            "subject": subject,
            "reset_link": reset_link,
            "text_body": text_body,
            "html_snippet": html_body[:2000],
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "smtp_configured": _smtp_configured(),
        }
        data = []
        if OUTBOX_PATH.exists():
            try:
                data = json.loads(OUTBOX_PATH.read_text())
                if not isinstance(data, list):
                    data = []
            except: data = []
        data.insert(0, entry)
        data = data[:50]  # keep last 50
        OUTBOX_PATH.write_text(json.dumps(data, indent=2))
    except Exception as e:
        logger.warning("Failed to write outbox: %s", e)

def send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None, reset_link: str | None = None) -> bool:
    """Send via Gmail SMTP. Returns True on success. In dev without credentials, saves to outbox and mocks."""
    # always save to dev outbox so user can see in browser
    _save_to_outbox(to_email, subject, html_body, text_body, reset_link)
    if not _smtp_configured():
        # dev fallback: log instead of failing but still treat as sent for UX
        logger.info("SMTP not configured — mock email to %s subject=%s (saved to %s)", to_email, subject, OUTBOX_PATH)
        logger.info("Email body (mock): %s", html_body[:600])
        print(f"[MOCK EMAIL] To: {to_email} | Subject: {subject} | Link: {reset_link}\n{html_body[:400]}\n---")
        return True

    from_addr = settings.smtp_from or settings.smtp_user
    msg = EmailMessage()
    msg["From"] = f"{settings.smtp_from_name} <{from_addr}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    if text_body:
        msg.set_content(text_body)
        msg.add_alternative(html_body, subtype="html")
    else:
        msg.set_content(html_body, subtype="html")

    try:
        if settings.smtp_use_tls and settings.smtp_port == 587:
            context = ssl.create_default_context()
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        else:
            # SSL on 465
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context, timeout=15) as server:
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        logger.info("Reset email sent via Gmail SMTP to %s", to_email)
        return True
    except Exception as e:
        logger.error("Failed to send email via Gmail SMTP to %s: %s", to_email, e)
        # don't raise — still return False so caller can handle
        return False

def send_reset_verification_email(to_email: str, reset_link: str, role: str = "user") -> bool:
    role_label = "Admin" if role.upper() in ("ADMIN", "STAFF") else "Affiliate"
    subject = f"Reset your {role_label} password — AI A to Z"
    text_body = f"""You requested a password reset for your {role_label} account.

Registered email: {to_email}
Reset link (expires in {settings.reset_token_expire_minutes} minutes):
{reset_link}

If you did not request this, ignore this email. The link will expire automatically.

— AI A to Z Affiliate Platform
"""
    html_body = f"""
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#f6faf6;border-radius:12px;padding:24px;border:1px solid #cde8ce">
  <div style="text-align:center;margin-bottom:16px">
    <div style="font-weight:800;color:#0b2816;font-size:18px">AI A to Z</div>
    <div style="color:#5a6b63;font-size:12px">Basics to Brilliance — Affiliate Platform</div>
  </div>
  <h2 style="color:#0f2e1a;margin:0 0 8px">Reset your {role_label} password</h2>
  <p style="color:#344e3d;font-size:13px;line-height:1.6;margin:0">
    You requested a password reset for your <strong>{role_label.lower()}</strong> account registered as <strong>{to_email}</strong>.
  </p>
  <p style="margin:16px 0">
    <a href="{reset_link}" style="display:inline-block;background:#1b6a2f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;font-size:13px">Reset password via verification</a>
  </p>
  <p style="color:#5a6b63;font-size:12px;line-height:1.5">
    Or copy this link:<br/>
    <a href="{reset_link}" style="color:#1b6a2f;word-break:break-all">{reset_link}</a>
  </p>
  <p style="color:#5a6b63;font-size:11px;margin-top:16px;border-top:1px dashed #cde8ce;padding-top:12px">
    This link was sent to your <strong>registered mail</strong> and expires in <strong>{settings.reset_token_expire_minutes} minutes</strong>. If you didn’t request it, you can safely ignore this email.
  </p>
</div>
"""
    return send_email(to_email, subject, html_body, text_body, reset_link=reset_link)
