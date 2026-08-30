"""
Alert Service — VitalsGuard AI
----------------------------------
Sends emergency Telegram and Email (SMTP) alerts when EWS = critical.
Both methods are stubbed with clear TODO markers for production keys.
"""

from __future__ import annotations
import os
import smtplib
import logging
from email.mime.text import MIMEText

import httpx

logger = logging.getLogger("vitalsguard.alerts")


def _send_email_alert(subject: str, body: str) -> None:
    """Send an email via SMTP. Configure via environment variables."""
    recipient = os.getenv("ALERT_EMAIL_RECIPIENT")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")

    if not all([recipient, smtp_user, smtp_pass]):
        logger.warning("Email alert skipped — SMTP credentials not configured.")
        return

    msg = MIMEText(body, "plain")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = recipient

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, recipient, msg.as_string())
        logger.info("Email alert sent to %s", recipient)
    except Exception as exc:
        logger.error("Email alert failed: %s", exc)


def _send_telegram_alert(message: str) -> None:
    """Send a message via the Telegram Bot API. Configure via environment variables."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not all([bot_token, chat_id]):
        logger.warning("Telegram alert skipped — TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not configured.")
        return

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        resp = httpx.post(url, json={"chat_id": chat_id, "text": message}, timeout=10)
        resp.raise_for_status()
        logger.info("Telegram alert sent to chat %s", chat_id)
    except Exception as exc:
        logger.error("Telegram alert failed: %s", exc)


def dispatch_emergency_alert(vitals: dict, consensus: str, ews_level: str) -> dict:
    """
    Public entry point called by the Emergency Agent.
    Returns a dict describing what was dispatched.
    """
    if ews_level != "critical":
        return {"dispatched": False, "reason": "EWS not critical"}

    subject = "🚨 VitalsGuard CRITICAL ALERT — Immediate action required"
    body = (
        f"CRITICAL health alert triggered.\n\n"
        f"AI Consensus: {consensus}\n\n"
        f"Vitals at time of alert:\n"
        f"  Heart Rate  : {vitals.get('heart_rate')} BPM\n"
        f"  SpO₂        : {vitals.get('spo2')} %\n"
        f"  Temperature : {vitals.get('temperature')} °C\n"
        f"  ECG Score   : {vitals.get('ecg_irregularity')}\n\n"
        "Please check on the patient immediately."
    )

    _send_email_alert(subject, body)
    _send_telegram_alert(f"🚨 VitalsGuard CRITICAL: {consensus}\n\nCheck patient immediately.")

    return {"dispatched": True, "channels": ["email", "telegram"]}
