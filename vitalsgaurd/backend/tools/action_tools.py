"""
Action Agent tools — VitalsGuard AI
------------------------------------------
calculate_EWS, retrieve_clinical_guideline, check_patient_constraints,
generate_action_plan
"""

from __future__ import annotations
import json

from models.health_logic import compute_ews
from services.knowledge_base import retrieve_clinical_guideline as _retrieve_guideline
from services import data_store


def calculate_EWS(anomaly_score: float) -> str:
    """
    Compute the Early Warning Score (level, numeric score, UI colour) from an
    anomaly score.
    Args:
        anomaly_score: Float 0-1 anomaly score from the LSTM detector.
    """
    return json.dumps(compute_ews(anomaly_score))


def retrieve_clinical_guideline(condition: str) -> str:
    """
    Return prioritised clinical guideline steps for a matched condition.
    Args:
        condition: The matched condition/disease name (e.g. 'tachycardia').
    """
    return json.dumps(_retrieve_guideline(condition))


def check_patient_constraints(patient_id: str, proposed_actions_json: str) -> str:
    """
    Filter/annotate proposed actions against the patient's known constraints
    (allergies, medications, mobility limitations).
    Args:
        patient_id: The patient identifier.
        proposed_actions_json: JSON list of proposed action strings.
    """
    profile = data_store.get_patient_profile(patient_id)
    proposed = json.loads(proposed_actions_json)

    warnings = []
    if profile.get("mobility_limited") and any("walk" in a.lower() or "exercise" in a.lower() for a in proposed):
        warnings.append("Patient has limited mobility — avoid recommending walking/exercise; suggest seated rest instead.")
    for med in profile.get("medications", []):
        if med.split()[0].lower() in " ".join(proposed).lower():
            warnings.append(f"Patient is already taking {med} — avoid duplicate medication advice.")

    return json.dumps({
        "constraints_checked": True,
        "known_conditions": profile.get("known_conditions", []),
        "allergies": profile.get("allergies", []),
        "warnings": warnings,
    })


def generate_action_plan(guideline_json: str, constraints_json: str, ews_level: str) -> str:
    """
    Merge a clinical guideline with patient constraints and EWS urgency into
    a prioritised, constraint-aware action plan scaffold.
    Args:
        guideline_json: JSON list of guideline steps.
        constraints_json: JSON object from check_patient_constraints.
        ews_level: 'stable', 'warning', or 'critical'.
    """
    guideline = json.loads(guideline_json) if guideline_json else []
    constraints = json.loads(constraints_json) if constraints_json else {}

    plan = list(guideline)
    if ews_level == "critical" and not any("emergency" in step.lower() or "call" in step.lower() for step in plan):
        plan.insert(0, "Call emergency services or your local emergency number immediately.")

    for warning in constraints.get("warnings", []):
        plan.append(f"Note: {warning}")

    return json.dumps({"action_plan": plan[:6], "ews_level": ews_level})
