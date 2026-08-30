"""
Diagnosis Agent tools — VitalsGuard AI
------------------------------------------
search_medical_knowledge, get_disease_fingerprint, get_patient_history,
compare_symptom_patterns
"""

from __future__ import annotations
import json

from services import data_store
from services.knowledge_base import search_medical_knowledge as _search_kb
from models.health_logic import match_fingerprints


def search_medical_knowledge(query: str) -> str:
    """
    Search the curated medical knowledge base for a disease, symptom, or term.
    Args:
        query: Free-text search term (e.g. 'tachycardia', 'low oxygen').
    """
    return json.dumps(_search_kb(query))


def get_disease_fingerprint(patterns_json: str) -> str:
    """
    Match a list of detected anomaly patterns against known disease fingerprints.
    Args:
        patterns_json: JSON list of pattern strings from anomaly detection
                        (e.g. ["low_spo2", "abnormal_heart_rate"]).
    """
    patterns = json.loads(patterns_json)
    return json.dumps(match_fingerprints(patterns))


def get_patient_history(patient_id: str = data_store.DEFAULT_PATIENT_ID, limit: int = 10) -> str:
    """
    Return the patient's recent vital history and prior AI analyses for
    longitudinal context when forming a diagnosis.
    Args:
        patient_id: The patient identifier.
        limit: Maximum number of past records to include.
    """
    return json.dumps(data_store.get_patient_history(patient_id, limit))


def compare_symptom_patterns(current_patterns_json: str, historical_patterns_json: str) -> str:
    """
    Compare the current anomaly patterns against a set of historical patterns
    to identify what's new, what's recurring, and what has resolved.
    Args:
        current_patterns_json: JSON list of current pattern strings.
        historical_patterns_json: JSON list of pattern strings seen in prior readings.
    """
    current = set(json.loads(current_patterns_json))
    historical = set(json.loads(historical_patterns_json))

    return json.dumps({
        "new_patterns": sorted(current - historical),
        "recurring_patterns": sorted(current & historical),
        "resolved_patterns": sorted(historical - current),
        "is_worsening": len(current - historical) > 0 and len(current) >= len(historical),
    })
