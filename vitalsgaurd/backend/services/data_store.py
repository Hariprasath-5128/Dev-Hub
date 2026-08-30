"""
Simulated patient data store — VitalsGuard AI
-----------------------------------------------
Backs every "get_*" agent tool with data. Mirrors the app's current
demo/simulated data behaviour. When services/db.py finds real Supabase
credentials configured, reads/writes transparently upgrade to the real
tables (see server/supabase_schema_agents.sql for the matching DDL);
otherwise everything lives in-process for the life of the server.
"""

from __future__ import annotations
import time
import uuid
import random
from typing import Any

from services import db

DEFAULT_PATIENT_ID = "demo-patient"

# ── Simulated patient profiles ──────────────────────────────────────────────
_PATIENT_PROFILES: dict[str, dict] = {
    DEFAULT_PATIENT_ID: {
        "patient_id": DEFAULT_PATIENT_ID,
        "name": "Demo Patient",
        "age": 42,
        "sex": "unspecified",
        "known_conditions": ["hypertension"],
        "allergies": ["penicillin"],
        "medications": ["lisinopril 10mg"],
        "mobility_limited": False,
        "baseline_vitals": {
            "heart_rate": 72,
            "spo2": 98,
            "temperature": 36.7,
            "systolic_bp": 122,
            "diastolic_bp": 80,
            "respiratory_rate": 16,
        },
    }
}

# ── Simulated doctor directory ──────────────────────────────────────────────
_DOCTOR_CONTACTS: list[dict] = [
    {"id": "d1", "name": "Dr. Sarah Chen", "specialty": "Cardiologist", "phone": "+1-555-0101", "email": "s.chen@vitalsguard.demo"},
    {"id": "d2", "name": "Dr. Rajesh Kumar", "specialty": "Neurologist", "phone": "+1-555-0102", "email": "r.kumar@vitalsguard.demo"},
    {"id": "d3", "name": "Dr. Lisa Wong", "specialty": "Pulmonologist", "phone": "+1-555-0103", "email": "l.wong@vitalsguard.demo"},
]

# ── In-memory rolling state (per patient) ───────────────────────────────────
_vital_history: dict[str, list[dict]] = {}
_analyses_history: dict[str, list[dict]] = {}
_reports: dict[str, list[dict]] = {}
_emergency_events: list[dict] = []

MAX_HISTORY = 200


def _ensure_patient(patient_id: str) -> None:
    _vital_history.setdefault(patient_id, [])
    _analyses_history.setdefault(patient_id, [])
    _reports.setdefault(patient_id, [])
    if patient_id not in _PATIENT_PROFILES:
        _PATIENT_PROFILES[patient_id] = {
            **_PATIENT_PROFILES[DEFAULT_PATIENT_ID],
            "patient_id": patient_id,
            "name": f"Patient {patient_id}",
        }


# ── Patient profile ──────────────────────────────────────────────────────────

def get_patient_profile(patient_id: str = DEFAULT_PATIENT_ID) -> dict:
    client = db.get_client()
    if client:
        try:
            resp = client.table("patient_profiles").select("*").eq("patient_id", patient_id).limit(1).execute()
            if resp.data:
                return resp.data[0]
        except Exception:
            pass  # fall through to simulated data
    _ensure_patient(patient_id)
    return _PATIENT_PROFILES[patient_id]


# ── Vitals ────────────────────────────────────────────────────────────────────

def record_vitals(patient_id: str, vitals: dict) -> dict:
    """Append a reading to the rolling vital history (simulated or Supabase)."""
    entry = {**vitals, "patient_id": patient_id, "timestamp": time.time()}
    client = db.get_client()
    if client:
        try:
            client.table("vitals_history").insert(entry).execute()
        except Exception:
            pass
    _ensure_patient(patient_id)
    _vital_history[patient_id].append(entry)
    _vital_history[patient_id] = _vital_history[patient_id][-MAX_HISTORY:]
    return entry


def get_latest_vitals(patient_id: str = DEFAULT_PATIENT_ID) -> dict:
    client = db.get_client()
    if client:
        try:
            resp = (
                client.table("vitals_history")
                .select("*")
                .eq("patient_id", patient_id)
                .order("timestamp", desc=True)
                .limit(1)
                .execute()
            )
            if resp.data:
                return resp.data[0]
        except Exception:
            pass
    _ensure_patient(patient_id)
    history = _vital_history[patient_id]
    if history:
        return history[-1]
    profile = get_patient_profile(patient_id)
    return {**profile["baseline_vitals"], "patient_id": patient_id, "timestamp": time.time(), "simulated_default": True}


def get_vital_history(patient_id: str = DEFAULT_PATIENT_ID, limit: int = 20) -> list[dict]:
    client = db.get_client()
    if client:
        try:
            resp = (
                client.table("vitals_history")
                .select("*")
                .eq("patient_id", patient_id)
                .order("timestamp", desc=True)
                .limit(limit)
                .execute()
            )
            if resp.data:
                return list(reversed(resp.data))
        except Exception:
            pass
    _ensure_patient(patient_id)
    return _vital_history[patient_id][-limit:]


# ── Analyses / reports ────────────────────────────────────────────────────────

def record_analysis(patient_id: str, analysis_summary: dict) -> dict:
    entry = {**analysis_summary, "patient_id": patient_id, "timestamp": time.time(), "id": str(uuid.uuid4())}
    client = db.get_client()
    if client:
        try:
            client.table("analyses_history").insert(entry).execute()
        except Exception:
            pass
    _ensure_patient(patient_id)
    _analyses_history[patient_id].append(entry)
    _analyses_history[patient_id] = _analyses_history[patient_id][-MAX_HISTORY:]
    return entry


def get_previous_analysis(patient_id: str = DEFAULT_PATIENT_ID, limit: int = 5) -> list[dict]:
    client = db.get_client()
    if client:
        try:
            resp = (
                client.table("analyses_history")
                .select("*")
                .eq("patient_id", patient_id)
                .order("timestamp", desc=True)
                .limit(limit)
                .execute()
            )
            if resp.data:
                return resp.data
        except Exception:
            pass
    _ensure_patient(patient_id)
    return list(reversed(_analyses_history[patient_id][-limit:]))


def get_patient_history(patient_id: str = DEFAULT_PATIENT_ID, limit: int = 10) -> dict:
    """Combined vitals + analyses history, used by the Diagnosis agent."""
    return {
        "vital_history": get_vital_history(patient_id, limit=limit),
        "previous_analyses": get_previous_analysis(patient_id, limit=limit),
    }


def record_report(patient_id: str, report: dict) -> dict:
    entry = {**report, "patient_id": patient_id, "timestamp": time.time(), "id": str(uuid.uuid4())}
    client = db.get_client()
    if client:
        try:
            client.table("medical_reports_agent").insert(entry).execute()
        except Exception:
            pass
    _ensure_patient(patient_id)
    _reports[patient_id].append(entry)
    return entry


def get_reports(patient_id: str = DEFAULT_PATIENT_ID, limit: int = 10) -> list[dict]:
    client = db.get_client()
    if client:
        try:
            resp = (
                client.table("medical_reports_agent")
                .select("*")
                .eq("patient_id", patient_id)
                .order("timestamp", desc=True)
                .limit(limit)
                .execute()
            )
            if resp.data:
                return resp.data
        except Exception:
            pass
    _ensure_patient(patient_id)
    return list(reversed(_reports[patient_id][-limit:]))


# ── Doctors ───────────────────────────────────────────────────────────────────

def get_doctor_contacts(specialty: str | None = None) -> list[dict]:
    client = db.get_client()
    if client:
        try:
            q = client.table("doctor_contacts").select("*")
            if specialty:
                q = q.ilike("specialty", f"%{specialty}%")
            resp = q.execute()
            if resp.data:
                return resp.data
        except Exception:
            pass
    if specialty:
        matches = [d for d in _DOCTOR_CONTACTS if specialty.lower() in d["specialty"].lower()]
        return matches or _DOCTOR_CONTACTS
    return _DOCTOR_CONTACTS


# ── Emergency events ──────────────────────────────────────────────────────────

def create_emergency_event(patient_id: str, ews_level: str, consensus: str, vitals: dict, dispatched: bool) -> dict:
    event = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "ews_level": ews_level,
        "consensus": consensus,
        "vitals": vitals,
        "dispatched": dispatched,
        "created_at": time.time(),
    }
    client = db.get_client()
    if client:
        try:
            client.table("emergency_events").insert(event).execute()
        except Exception:
            pass
    _emergency_events.append(event)
    return event


def get_emergency_events(patient_id: str = DEFAULT_PATIENT_ID, limit: int = 10) -> list[dict]:
    client = db.get_client()
    if client:
        try:
            resp = (
                client.table("emergency_events")
                .select("*")
                .eq("patient_id", patient_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            if resp.data:
                return resp.data
        except Exception:
            pass
    return [e for e in reversed(_emergency_events) if e["patient_id"] == patient_id][:limit]
