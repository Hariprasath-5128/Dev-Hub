"""
One-off helper: fetch your Telegram chat_id for TELEGRAM_CHAT_ID.

Usage:
  1. Create a bot via @BotFather on Telegram, copy its token.
  2. Send that bot any message (e.g. "hi") from the account/group you want alerts in.
  3. Run: python get_telegram_chat_id.py <bot_token>
     (or set TELEGRAM_BOT_TOKEN in backend/.env and run with no args)
"""

from __future__ import annotations
import os
import sys
import json
import httpx
from dotenv import load_dotenv

load_dotenv()


def main() -> None:
    token = sys.argv[1] if len(sys.argv) > 1 else os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Provide a bot token as an argument or set TELEGRAM_BOT_TOKEN in backend/.env")
        sys.exit(1)

    resp = httpx.get(f"https://api.telegram.org/bot{token}/getUpdates", timeout=10)
    resp.raise_for_status()
    data = resp.json()

    if not data.get("ok"):
        print("Telegram API error:", data)
        sys.exit(1)

    results = data.get("result", [])
    if not results:
        print("No messages found yet. Send your bot a message first, then re-run this script.")
        sys.exit(1)

    seen = {}
    for update in results:
        msg = update.get("message") or update.get("channel_post")
        if not msg:
            continue
        chat = msg["chat"]
        seen[chat["id"]] = chat

    print("Chats found:")
    for chat_id, chat in seen.items():
        label = chat.get("title") or chat.get("username") or chat.get("first_name") or "unknown"
        print(f"  chat_id={chat_id}  type={chat.get('type')}  name={label}")

    print("\nSet TELEGRAM_CHAT_ID in backend/.env to the chat_id you want alerts sent to.")


if __name__ == "__main__":
    main()
