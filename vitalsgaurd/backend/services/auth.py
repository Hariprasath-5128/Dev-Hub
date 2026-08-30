"""
Session auth + RBAC — VitalsGuard AI
--------------------------------------
Verifies the JWT issued by the Node auth server (vitalsgaurd/server/server.js)
on login, and enforces that a patient can only ever access their own data.
JWT_SECRET must be identical in both backend/.env and server/.env.
"""

from __future__ import annotations
import os
import logging
from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException

logger = logging.getLogger("vitalsguard.auth")

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"


@dataclass
class CurrentUser:
    user_id: str
    role: str
    username: str


def _decode_token(token: str) -> CurrentUser:
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="Server misconfigured: JWT_SECRET not set.")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session token.")

    return CurrentUser(
        user_id=str(payload.get("sub", "")),
        role=str(payload.get("role", "")),
        username=str(payload.get("username", "")),
    )


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    """FastAPI dependency: requires a valid `Authorization: Bearer <token>` header."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")
    token = authorization.split(" ", 1)[1].strip()
    return _decode_token(token)


def get_current_user_optional(authorization: str | None = Header(default=None)) -> CurrentUser | None:
    """Same as get_current_user, but returns None instead of raising when absent."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        return _decode_token(token)
    except HTTPException:
        return None


def enforce_patient_scope(user: CurrentUser, requested_patient_id: str | None) -> str:
    """
    Resolve the patient_id a request is actually allowed to touch.

    - role == 'patient': can only ever access their own data. If they omit
      patient_id, default to themselves; if they pass a different one, deny.
    - role in ('doctor', 'admin'): may access any patient_id they specify.
    """
    if user.role == "patient":
        if requested_patient_id and requested_patient_id != user.user_id:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to access another patient's data.",
            )
        return user.user_id

    if requested_patient_id:
        return requested_patient_id
    raise HTTPException(status_code=400, detail="patient_id is required for this role.")
