"""
Appointment-booking tools — NLP/Chatbot Agent
------------------------------------------------
Lets a patient book/browse real appointments through natural language.
Calls vitalsgaurd/server's /appointments/* API (services/appointments_client.py)
using a trusted internal service key — patient_id here is always the value
the chatbot pipeline already resolved via RBAC (services/auth.py), never a
value the LLM is free to invent on its own for another patient.
"""

from __future__ import annotations
import json
import re

from services import appointments_client

_TIME_RE = re.compile(r"^\d{2}:\d{2}$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def get_available_slots(patient_id: str, date: str, doctor_name: str = "") -> str:
    """
    List available appointment slots for a given date, optionally filtered to
    one doctor by name or specialty (case-insensitive partial match).
    Args:
        patient_id: The patient identifier.
        date: Date to check, formatted YYYY-MM-DD.
        doctor_name: Optional doctor name or specialty filter (e.g. "Chen" or "Cardiologist").
    """
    if not _DATE_RE.match(date):
        return json.dumps({"error": "date must be formatted YYYY-MM-DD"})

    try:
        result = appointments_client.get_doctor_slots(date, patient_id)
    except Exception as exc:
        return json.dumps({"error": f"Could not reach the appointments service: {exc}"})

    doctors = result.get("doctors", [])
    needle = doctor_name.lower().strip()
    if needle:
        doctors = [d for d in doctors if needle in d["name"].lower() or needle in d["specialty"].lower()]

    summary = []
    for doctor in doctors:
        available = [s["start"] for s in doctor.get("slots", []) if s.get("available")]
        summary.append({
            "doctor_id": doctor["id"],
            "name": doctor["name"],
            "specialty": doctor["specialty"],
            "available_slots": available[:12],  # cap so the prompt doesn't blow up on a full day
        })

    return json.dumps({"date": date, "doctors": summary})


def list_my_appointments(patient_id: str) -> str:
    """
    List the patient's existing booked appointments.
    Args:
        patient_id: The patient identifier.
    """
    try:
        result = appointments_client.get_my_appointments(patient_id)
    except Exception as exc:
        return json.dumps({"error": f"Could not reach the appointments service: {exc}"})
    return json.dumps(result.get("appointments", []))


def book_doctor_appointment(patient_id: str, username: str, doctor_name: str, date: str, time: str) -> str:
    """
    Book an appointment with a doctor at a specific date and time. Always
    call get_available_slots first to find a real doctor_name/date/time
    combination that's actually free — this will fail if the slot is taken,
    outside working hours (09:00-17:00), or not on a 20-minute boundary.
    Args:
        patient_id: The patient identifier.
        username: The patient's username (for the booking record).
        doctor_name: The doctor's name or specialty to match (e.g. "Dr. Sarah Chen" or "Cardiologist").
        date: Appointment date, formatted YYYY-MM-DD.
        time: Appointment start time, formatted HH:MM in 24-hour time (e.g. "14:00").
    """
    if not _DATE_RE.match(date):
        return json.dumps({"success": False, "message": "date must be formatted YYYY-MM-DD"})
    if not _TIME_RE.match(time):
        return json.dumps({"success": False, "message": "time must be formatted HH:MM (24-hour)"})

    try:
        slots_result = appointments_client.get_doctor_slots(date, patient_id)
    except Exception as exc:
        return json.dumps({"success": False, "message": f"Could not reach the appointments service: {exc}"})

    needle = doctor_name.lower().strip()
    matches = [
        d for d in slots_result.get("doctors", [])
        if needle in d["name"].lower() or needle in d["specialty"].lower()
    ]
    if not matches:
        available_names = [d["name"] for d in slots_result.get("doctors", [])]
        return json.dumps({
            "success": False,
            "message": f"No doctor matching '{doctor_name}' found. Available doctors: {available_names}",
        })
    if len(matches) > 1:
        return json.dumps({
            "success": False,
            "message": f"'{doctor_name}' matched multiple doctors: {[d['name'] for d in matches]}. Ask the patient to be more specific.",
        })

    doctor = matches[0]
    start_iso = f"{date}T{time}:00"

    try:
        result = appointments_client.book_appointment(patient_id, username, doctor["id"], start_iso)
    except Exception as exc:
        return json.dumps({"success": False, "message": f"Could not reach the appointments service: {exc}"})

    return json.dumps(result)
