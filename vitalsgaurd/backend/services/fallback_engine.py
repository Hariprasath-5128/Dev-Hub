"""
Rule-based fallback engine — VitalsGuard AI
--------------------------------------------
Deterministic, non-LLM answers for the chatbot and the full analysis
pipeline, built entirely from the same tool functions the AI agents use
(EWS calculator, disease-fingerprint matcher, curated knowledge base,
patient data store). Used automatically when Mistral is unreachable/errors,
or explicitly when a caller sets use_ai=False (e.g. to avoid API cost, or
when no MISTRAL_API_KEY is configured at all).

Every function here returns "mode": "rule_based" so the frontend can show
the user their answer wasn't AI-generated.
"""

from __future__ import annotations
import json
import re

from models.health_logic import compute_ews, match_fingerprints
from services import data_store
from services.knowledge_base import (
    search_medical_knowledge,
    retrieve_medical_definition,
    simplify_medical_term,
    retrieve_clinical_guideline,
)
from tools import action_tools, emergency_tools, monitoring_tools

VITAL_LABELS = {
    "heart_rate": "heart rate",
    "spo2": "SpO2 (blood oxygen)",
    "temperature": "temperature",
    "systolic_bp": "systolic blood pressure",
    "diastolic_bp": "diastolic blood pressure",
    "respiratory_rate": "respiratory rate",
}

_VITAL_KEYWORDS = [
    (r"\b(heart rate|pulse|bpm|hr)\b", "heart_rate"),
    (r"\b(spo2|oxygen|o2 sat)\b", "spo2"),
    (r"\b(temperature|fever|temp)\b", "temperature"),
    (r"\b(blood pressure|\bbp\b)\b", "blood_pressure"),
    (r"\b(respirat|breath)", "respiratory_rate"),
]


def _format_vital(key: str, value) -> str:
    units = {
        "heart_rate": "bpm", "spo2": "%", "temperature": "°C",
        "systolic_bp": "mmHg", "diastolic_bp": "mmHg", "respiratory_rate": "breaths/min",
    }
    return f"{value} {units.get(key, '')}".strip()


def rule_based_chat_answer(patient_id: str, message: str) -> dict:
    """
    Pattern-match a natural-language question against the patient's real
    data and the curated knowledge base, with no LLM call involved.
    """
    q = message.lower()
    latest = data_store.get_latest_vitals(patient_id)
    profile = data_store.get_patient_profile(patient_id)
    sources = []

    # 1. Specific vital lookups
    for pattern, key in _VITAL_KEYWORDS:
        if re.search(pattern, q):
            sources.append("latest vitals")
            if key == "blood_pressure":
                sys_bp, dia_bp = latest.get("systolic_bp"), latest.get("diastolic_bp")
                return {
                    "answer": f"Your latest blood pressure reading was {sys_bp}/{dia_bp} mmHg.",
                    "sources": sources, "mode": "rule_based",
                }
            value = latest.get(key)
            if value is None:
                return {
                    "answer": f"I don't have a recorded {VITAL_LABELS.get(key, key)} for you yet.",
                    "sources": sources, "mode": "rule_based",
                }
            return {
                "answer": f"Your latest {VITAL_LABELS.get(key, key)} was {_format_vital(key, value)}.",
                "sources": sources, "mode": "rule_based",
            }

    # 2. Medication / allergy / condition lookups
    if re.search(r"\bmedicat|drug|prescri", q):
        meds = profile.get("medications", [])
        sources.append("patient profile")
        return {
            "answer": f"You're currently listed as taking: {', '.join(meds)}." if meds else "No medications are on file for you.",
            "sources": sources, "mode": "rule_based",
        }
    if re.search(r"\ballerg", q):
        allergies = profile.get("allergies", [])
        sources.append("patient profile")
        return {
            "answer": f"You have the following allergies on file: {', '.join(allergies)}." if allergies else "No allergies are on file for you.",
            "sources": sources, "mode": "rule_based",
        }
    if re.search(r"\bcondition|diagnos", q):
        conditions = profile.get("known_conditions", [])
        sources.append("patient profile")
        return {
            "answer": f"Your known conditions on file: {', '.join(conditions)}." if conditions else "No known conditions are on file for you.",
            "sources": sources, "mode": "rule_based",
        }

    # 3. History / trend
    if re.search(r"\bhistory|trend|past reading|previous reading", q):
        history = data_store.get_vital_history(patient_id, limit=5)
        sources.append("vital history")
        if not history:
            return {"answer": "I don't have any prior readings on file for you yet.", "sources": sources, "mode": "rule_based"}
        summary = "; ".join(
            f"HR {h.get('heart_rate')}, SpO2 {h.get('spo2')}%" for h in history
        )
        return {"answer": f"Your last {len(history)} readings: {summary}.", "sources": sources, "mode": "rule_based"}

    # 4. Previous analyses
    if re.search(r"\b(previous|last|prior) analysis|last diagnosis", q):
        analyses = data_store.get_previous_analysis(patient_id, limit=1)
        sources.append("previous analysis")
        if not analyses:
            return {"answer": "You don't have any previous analyses on file yet.", "sources": sources, "mode": "rule_based"}
        a = analyses[0]
        return {
            "answer": f"Your last analysis found: {a.get('consensus', 'no summary available')} (EWS: {a.get('ews_level', 'unknown')}).",
            "sources": sources, "mode": "rule_based",
        }

    # 5. "What is X" / definition lookups against the knowledge base
    kb_results = search_medical_knowledge(q)
    if kb_results:
        top = kb_results[0]
        sources.append("medical knowledge base")
        definition = top.get("definition") or top.get("plain_language", "")
        return {"answer": definition, "sources": sources, "mode": "rule_based"}

    # 6. Appointments — listing is easy to pattern-match; booking needs the
    # LLM to parse natural-language dates/times, so it's AI-mode only.
    if re.search(r"\bappointment|booking|book.*(doctor|slot)|schedule", q):
        from services import appointments_client
        sources.append("appointments")
        if re.search(r"\bbook\b", q):
            return {
                "answer": (
                    "I can't book an appointment in this mode (it needs the AI assistant to "
                    "understand the date/time you want) — switch back to AI mode and ask again, "
                    "e.g. 'book me with Dr. Sarah Chen tomorrow at 2pm'."
                ),
                "sources": sources, "mode": "rule_based",
            }
        try:
            result = appointments_client.get_my_appointments(patient_id)
            appts = result.get("appointments", [])
        except Exception:
            appts = None
        if appts is None:
            return {"answer": "I couldn't reach the appointments service just now.", "sources": sources, "mode": "rule_based"}
        if not appts:
            return {"answer": "You don't have any upcoming appointments booked.", "sources": sources, "mode": "rule_based"}
        summary = "; ".join(f"{a['doctorName']} at {a['start']}" for a in appts)
        return {"answer": f"Your upcoming appointments: {summary}.", "sources": sources, "mode": "rule_based"}

    # 7. Fallback — no pattern matched
    return {
        "answer": (
            "I can answer questions about your latest vitals, medications, allergies, "
            "known conditions, reading history, previous analyses, medical terms, or your "
            "upcoming appointments. Could you rephrase your question along those lines?"
        ),
        "sources": [], "mode": "rule_based",
    }


def rule_based_analysis(vitals: dict, patient_id: str, lstm_raw: dict, ews: dict, fingerprints: list[dict]) -> dict:
    """
    Deterministic equivalent of the multi-agent debate/explanation/action/
    emergency/comparison stages, built entirely from rule-based tool
    functions. Same output shape as run_full_pipeline's LLM path, so the
    frontend needs no special-casing beyond an optional "mode" badge.
    """
    patterns = lstm_raw.get("patterns", [])
    top_condition = fingerprints[0]["disease"] if fingerprints else None

    # Monitoring view
    deviation = json.loads(
        monitoring_tools.calculate_vital_deviation(json.dumps({**vitals, "patient_id": patient_id}))
    )
    outliers = [f"{k} {d['pct_change']:+.1f}% vs baseline" for k, d in deviation.items() if abs(d["pct_change"]) >= 15]
    if lstm_raw.get("anomaly_detected"):
        monitoring_view = (
            f"Anomaly score {lstm_raw['anomaly_score']} (confidence {lstm_raw.get('confidence', 0)}). "
            f"Detected patterns: {', '.join(patterns) if patterns else 'none'}."
            + (f" Notable deviations from baseline: {', '.join(outliers)}." if outliers else "")
        )
    else:
        monitoring_view = "Vitals appear within normal range. No anomaly patterns detected."

    # Diagnosis view
    if fingerprints:
        diagnosis_view = "; ".join(
            f"{fp['disease'].replace('_', ' ')} (confidence {fp['confidence']}): {fp['description']}"
            for fp in fingerprints[:3]
        )
    else:
        diagnosis_view = "No matching disease fingerprint for the current patterns — insufficient data for a specific differential."

    consensus = f"{monitoring_view} {diagnosis_view}".strip()

    # Explanation
    ui_label = f"{ews['level'].capitalize()}: {top_condition.replace('_', ' ') if top_condition else 'vitals reviewed'}"
    voice_summary = (
        simplify_medical_term(top_condition) if top_condition
        else "Your vitals look stable right now."
    )

    # Action plan
    guideline = retrieve_clinical_guideline(top_condition or "general")
    constraints = action_tools.check_patient_constraints(patient_id, json.dumps(guideline))
    action_plan = json.loads(
        action_tools.generate_action_plan(json.dumps(guideline), constraints, ews["level"])
    )["action_plan"]

    # Emergency
    threshold_check = emergency_tools.check_emergency_thresholds(json.dumps(vitals))
    hard_emergency = json.loads(threshold_check)["hard_emergency"]
    dispatch_alert = ews["level"] == "critical" or hard_emergency
    urgency_note = (
        "Hard vital threshold breached — immediate escalation." if hard_emergency
        else f"EWS level is {ews['level']}."
    )

    # Comparison (no vision/report analysis without the LLM — report_analyzed stays False)
    comparison = {
        "summary": diagnosis_view[:200] if fingerprints else "No anomaly region identified.",
        "insights": ["Recheck vitals and compare against any recent lab work for the matched condition(s)."],
        "correlation_score": 50,
    }

    return {
        "ews": ews,
        "lstm_result": lstm_raw,
        "fingerprints": fingerprints,
        "debate": {
            "consensus": consensus,
            "disagreement_score": 0,
            "monitoring_view": monitoring_view,
            "diagnosis_view": diagnosis_view,
        },
        "explanation": {"ui_label": ui_label, "voice_summary": voice_summary},
        "actions": action_plan,
        "emergency": {"dispatch_alert": dispatch_alert, "urgency_note": urgency_note},
        "comparison": comparison,
        "affected_regions": lstm_raw.get("affected_regions", ["none"]),
        "heatmap_colour": ews["colour"],
        "ui_label": ui_label,
        "voice_summary": voice_summary,
        "consensus": consensus,
        "disagreement_score": 0,
        "report_analyzed": False,
        "lab_correlation": None,
        "mode": "rule_based",
    }
