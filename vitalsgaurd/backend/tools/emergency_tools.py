"""
Emergency Agent tools — VitalsGuard AI
------------------------------------------
calculate_EWS, check_emergency_thresholds, get_doctor_contacts, send_alert,
create_emergency_event
"""

from __future__ import annotations
import json

from models.health_logic import compute_ews
from services import data_store
from services.alert_service import dispatch_emergency_alert

# Hard vital thresholds that independently justify emergency escalation,
# even if the composite EWS/anomaly score hasn't crossed 'critical'.
HARD_THRESHOLDS = {
    "spo2": {"min": 90},
    "heart_rate": {"min": 40, "max": 140},
    "temperature": {"min": 35.0, "max": 39.5},
    "systolic_bp": {"min": 80, "max": 200},
}


def calculate_EWS(anomaly_score: float) -> str:
    """
    Compute the Early Warning Score from an anomaly score.
    Args:
        anomaly_score: Float 0-1 anomaly score from the LSTM detector.
    """
    return json.dumps(compute_ews(anomaly_score))


def check_emergency_thresholds(vitals_json: str) -> str:
    """
    Check raw vitals against hard clinical emergency thresholds, independent
    of the composite EWS score (e.g. SpO2 < 90% is always an emergency flag).
    Args:
        vitals_json: JSON string of the current vitals reading.
    """
    vitals = json.loads(vitals_json)
    breaches = []

    for vital, bounds in HARD_THRESHOLDS.items():
        if vital not in vitals:
            continue
        value = vitals[vital]
        if "min" in bounds and value < bounds["min"]:
            breaches.append(f"{vital}={value} is below the safe minimum ({bounds['min']}).")
        if "max" in bounds and value > bounds["max"]:
            breaches.append(f"{vital}={value} is above the safe maximum ({bounds['max']}).")

    return json.dumps({"breaches": breaches, "hard_emergency": len(breaches) > 0})


def get_doctor_contacts(specialty: str | None = None) -> str:
    """
    Retrieve the on-call/assigned doctor contact list, optionally filtered
    by specialty.
    Args:
        specialty: Optional specialty filter (e.g. 'Cardiologist').
    """
    return json.dumps(data_store.get_doctor_contacts(specialty))


def send_alert(vitals_json: str, consensus: str, ews_level: str) -> str:
    """
    Dispatch an emergency alert (email/SMS) to configured recipients.
    Args:
        vitals_json: JSON string of the vitals at time of alert.
        consensus: The diagnostic consensus text driving the alert.
        ews_level: 'stable', 'warning', or 'critical'.
    """
    vitals = json.loads(vitals_json)
    result = dispatch_emergency_alert(vitals, consensus, ews_level)
    return json.dumps(result)


def create_emergency_event(patient_id: str, ews_level: str, consensus: str, vitals_json: str, dispatched: bool) -> str:
    """
    Persist an emergency event record for audit/history purposes.
    Args:
        patient_id: The patient identifier.
        ews_level: 'stable', 'warning', or 'critical'.
        consensus: The diagnostic consensus text.
        vitals_json: JSON string of the vitals at time of the event.
        dispatched: Whether an alert was actually sent out.
    """
    vitals = json.loads(vitals_json)
    event = data_store.create_emergency_event(patient_id, ews_level, consensus, vitals, dispatched)
    return json.dumps(event)
