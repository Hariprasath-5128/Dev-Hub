"""
Appointments client — VitalsGuard AI
--------------------------------------
Thin HTTP client for vitalsgaurd/server's /appointments/* routes, used by
the Chatbot Agent's booking tools. Authenticates with a trusted internal
service key (not the end-user's JWT) — RBAC for the patient_id involved was
already enforced by services/auth.py before any of these functions run.
"""

from __future__ import annotations
import os
import httpx

NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL", "http://localhost:5003")
INTERNAL_SERVICE_KEY = os.getenv("INTERNAL_SERVICE_KEY", "")

_HEADERS = {"X-Internal-Key": INTERNAL_SERVICE_KEY}


def get_doctor_slots(date: str, patient_id: str) -> dict:
    """GET /appointments/doctors — each doctor's slot availability for a given date."""
    resp = httpx.get(
        f"{NODE_BACKEND_URL}/appointments/doctors",
        params={"date": date, "patientId": patient_id},
        headers=_HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def get_my_appointments(patient_id: str) -> dict:
    """GET /appointments/my — a patient's existing bookings."""
    resp = httpx.get(
        f"{NODE_BACKEND_URL}/appointments/my",
        params={"patientId": patient_id},
        headers=_HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def check_eligibility(patient_id: str, username: str) -> dict:
    """GET /appointments/eligibility/:userId — whether booking is unlocked for this patient."""
    resp = httpx.get(
        f"{NODE_BACKEND_URL}/appointments/eligibility/{patient_id}",
        params={"username": username},
        headers=_HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def book_appointment(patient_id: str, username: str, doctor_id: str, start_iso: str) -> dict:
    """POST /appointments/book — create a booking. Raises for non-2xx so callers can surface the real reason."""
    resp = httpx.post(
        f"{NODE_BACKEND_URL}/appointments/book",
        json={"patientId": patient_id, "username": username, "doctorId": doctor_id, "start": start_iso},
        headers=_HEADERS,
        timeout=15,
    )
    return resp.json()  # Node returns success:false + a real message on 4xx; let the tool layer decide what to do with it
