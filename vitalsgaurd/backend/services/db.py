"""
Optional Supabase-backed persistence layer.
------------------------------------------
The agent tools in this backend work fully against simulated in-memory data
out of the box (see services/data_store.py). If SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY are present in the environment (same variable
names used by vitalsgaurd/server/.env), real persistence is used instead —
no other code needs to change.
"""

from __future__ import annotations
import os
import logging
from typing import Any, Optional

logger = logging.getLogger("vitalsguard.db")

_client: Optional[Any] = None
_init_attempted = False


def get_client() -> Optional[Any]:
    """Return a cached Supabase client, or None if not configured/available."""
    global _client, _init_attempted
    if _init_attempted:
        return _client
    _init_attempted = True

    # Read lazily (not at module import time): this module gets imported
    # transitively before main.py's own load_dotenv() call runs, so reading
    # os.environ at import time would always see it empty and silently fall
    # back to simulated data even with real credentials configured.
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not supabase_key:
        logger.info("Supabase not configured — using simulated in-memory data store.")
        return None

    try:
        from supabase import create_client  # type: ignore
        _client = create_client(supabase_url, supabase_key)
        logger.info("Connected to Supabase at %s", supabase_url)
    except Exception as exc:
        logger.warning("Supabase configured but client init failed (%s) — falling back to simulated data.", exc)
        _client = None

    return _client


def is_connected() -> bool:
    return get_client() is not None
