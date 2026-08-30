"""
NLP / Chatbot Agent tools — VitalsGuard AI
------------------------------------------
get_patient_profile, get_vitals, get_reports, search_medical_knowledge,
get_previous_analysis
"""

from __future__ import annotations
import json

from services import data_store
from services.knowledge_base import search_medical_knowledge as _search_kb


def get_patient_profile(patient_id: str = data_store.DEFAULT_PATIENT_ID) -> str:
    """
    Return the patient's profile (age, sex, known conditions, allergies,
    medications, baseline vitals).
    Args:
        patient_id: The patient identifier.
    """
    return json.dumps(data_store.get_patient_profile(patient_id))


def get_vitals(patient_id: str = data_store.DEFAULT_PATIENT_ID) -> str:
    """
    Return the patient's most recent vitals reading.
    Args:
        patient_id: The patient identifier.
    """
    return json.dumps(data_store.get_latest_vitals(patient_id))


def get_reports(patient_id: str = data_store.DEFAULT_PATIENT_ID, limit: int = 10) -> str:
    """
    Return the patient's uploaded/analyzed medical reports.
    Args:
        patient_id: The patient identifier.
        limit: Maximum number of reports to return.
    """
    return json.dumps(data_store.get_reports(patient_id, limit))


def search_medical_knowledge(query: str) -> str:
    """
    Search the curated medical knowledge base for a disease, symptom, or term
    to ground an answer in factual, non-hallucinated information.
    Args:
        query: Free-text search term.
    """
    return json.dumps(_search_kb(query))


def get_previous_analysis(patient_id: str = data_store.DEFAULT_PATIENT_ID, limit: int = 5) -> str:
    """
    Return the patient's previous AI pipeline analyses (diagnosis consensus,
    EWS, actions taken) for context when answering follow-up questions.
    Args:
        patient_id: The patient identifier.
        limit: Maximum number of past analyses to return.
    """
    return json.dumps(data_store.get_previous_analysis(patient_id, limit))
