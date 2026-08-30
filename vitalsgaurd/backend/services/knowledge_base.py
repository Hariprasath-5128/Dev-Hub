"""
Local curated medical knowledge base — VitalsGuard AI
--------------------------------------------------------
Backs search_medical_knowledge(), retrieve_medical_definition(),
simplify_medical_term(), and retrieve_clinical_guideline().
Deterministic and dependency-free; extend this dict as coverage grows.
"""

from __future__ import annotations

MEDICAL_KNOWLEDGE_BASE: dict[str, dict] = {
    "cardiac_arrhythmia": {
        "definition": "An irregularity in the heart's electrical activity, causing it to beat too fast, too slow, or unevenly.",
        "plain_language": "Your heart's rhythm isn't beating in its normal steady pattern.",
        "symptoms": ["palpitations", "irregular pulse", "dizziness", "fatigue"],
        "guideline": [
            "Stay seated or lying down and remain calm.",
            "Avoid caffeine, alcohol, and strenuous activity.",
            "Contact a cardiologist if irregularity persists beyond a few minutes.",
            "Seek emergency care if accompanied by chest pain, fainting, or severe breathlessness.",
        ],
    },
    "hypoxia": {
        "definition": "A condition in which the body or a region of the body is deprived of adequate oxygen supply.",
        "plain_language": "Your blood oxygen level is lower than it should be.",
        "symptoms": ["shortness of breath", "bluish lips or fingertips", "confusion", "rapid heartbeat"],
        "guideline": [
            "Sit upright to ease breathing.",
            "Use supplemental oxygen if prescribed and available.",
            "Recheck SpO2 within 10-15 minutes.",
            "Seek urgent care if SpO2 stays below 92% or symptoms worsen.",
        ],
    },
    "tachycardia": {
        "definition": "A resting heart rate above 100 beats per minute in adults.",
        "plain_language": "Your heart is beating faster than normal, even at rest.",
        "symptoms": ["rapid pulse", "lightheadedness", "chest discomfort", "shortness of breath"],
        "guideline": [
            "Rest and avoid stimulants (caffeine, nicotine).",
            "Practice slow, deep breathing to help lower heart rate.",
            "Monitor for 15 minutes; recheck heart rate.",
            "Seek care if heart rate remains above 120 bpm or chest pain develops.",
        ],
    },
    "early_covid_like": {
        "definition": "A pattern combining reduced blood oxygen with fever, consistent with early respiratory infection.",
        "plain_language": "Your oxygen is a bit low and you have a fever — this combination can point to a respiratory infection.",
        "symptoms": ["low SpO2", "fever", "cough", "fatigue"],
        "guideline": [
            "Isolate from others until evaluated.",
            "Stay hydrated and rest.",
            "Monitor SpO2 and temperature every few hours.",
            "Seek testing and medical evaluation, especially if SpO2 trends downward.",
        ],
    },
    "silent_cardiac_stress": {
        "definition": "Subtle micro-fluctuations in cardiac signals that appear beneath the threshold of overt symptoms but indicate hidden strain on the heart.",
        "plain_language": "Your vitals look mostly normal, but a subtle pattern suggests your heart may be under quiet stress.",
        "symptoms": ["none obvious", "mild fatigue", "occasional palpitation"],
        "guideline": [
            "Avoid strenuous exertion until reviewed by a doctor.",
            "Keep a symptom diary noting any chest discomfort or breathlessness.",
            "Schedule a cardiology follow-up for closer evaluation (e.g., ECG, stress test).",
        ],
    },
    "hypertension": {
        "definition": "Chronically elevated blood pressure, typically above 130/80 mmHg.",
        "plain_language": "Your blood pressure is running higher than the healthy range.",
        "symptoms": ["often none", "headache", "blurred vision"],
        "guideline": [
            "Recheck blood pressure after 5 minutes of rest.",
            "Reduce sodium intake and avoid stress.",
            "Take prescribed antihypertensive medication as directed.",
            "Contact a doctor if systolic > 180 or diastolic > 120 (hypertensive crisis).",
        ],
    },
    "fever": {
        "definition": "Elevated body temperature above 38.0°C (100.4°F), usually indicating infection or inflammation.",
        "plain_language": "Your body temperature is higher than normal.",
        "symptoms": ["chills", "sweating", "headache", "muscle aches"],
        "guideline": [
            "Stay hydrated and rest.",
            "Use antipyretics (e.g., paracetamol) if appropriate.",
            "Monitor temperature every few hours.",
            "Seek care if fever exceeds 39.5°C or persists beyond 3 days.",
        ],
    },
}

# General term glossary (used by Explanation and Chatbot agents for
# definitions that aren't tied to a specific disease fingerprint).
TERM_GLOSSARY: dict[str, str] = {
    "spo2": "Blood oxygen saturation — the percentage of oxygen your red blood cells are carrying.",
    "ews": "Early Warning Score — a single score combining vitals to flag how urgently a patient needs attention.",
    "ecg": "Electrocardiogram — a recording of the heart's electrical activity.",
    "bpm": "Beats per minute — how fast the heart is beating.",
    "anomaly_score": "A 0-1 score describing how far current vitals deviate from a healthy baseline.",
    "systolic_bp": "The pressure in your arteries when your heart beats (the top blood pressure number).",
    "diastolic_bp": "The pressure in your arteries when your heart rests between beats (the bottom blood pressure number).",
    "respiratory_rate": "The number of breaths taken per minute.",
}


def search_medical_knowledge(query: str) -> list[dict]:
    """
    Search the curated knowledge base for entries matching a free-text query
    (disease name, symptom, or general term). Returns ranked matches.
    """
    q = query.lower().strip()
    results: list[dict] = []

    for disease, entry in MEDICAL_KNOWLEDGE_BASE.items():
        disease_name = disease.replace("_", " ")
        haystack = " ".join([disease, entry["definition"], " ".join(entry["symptoms"])]).lower()
        # Bidirectional: handles both "tachycardia" (short query -> long haystack)
        # and "what is tachycardia?" (long query containing the short term).
        if q in haystack or disease_name in q or any(q in s.lower() or s.lower() in q for s in entry["symptoms"]):
            results.append({"topic": disease, **entry})

    for term, definition in TERM_GLOSSARY.items():
        if q in term or term in q:
            results.append({"topic": term, "definition": definition, "plain_language": definition})

    return results


def retrieve_medical_definition(term: str) -> str:
    """Return the clinical definition for a disease or medical term, if known."""
    key = term.lower().strip().replace(" ", "_")
    if key in MEDICAL_KNOWLEDGE_BASE:
        return MEDICAL_KNOWLEDGE_BASE[key]["definition"]
    if term.lower().strip() in TERM_GLOSSARY:
        return TERM_GLOSSARY[term.lower().strip()]
    return f"No curated definition found for '{term}'."


def simplify_medical_term(term: str) -> str:
    """Return a plain-language, patient-friendly explanation of a medical term."""
    key = term.lower().strip().replace(" ", "_")
    if key in MEDICAL_KNOWLEDGE_BASE:
        return MEDICAL_KNOWLEDGE_BASE[key]["plain_language"]
    if term.lower().strip() in TERM_GLOSSARY:
        return TERM_GLOSSARY[term.lower().strip()]
    return term


def retrieve_clinical_guideline(condition: str) -> list[str]:
    """Return prioritised clinical guideline steps for a matched condition."""
    key = condition.lower().strip().replace(" ", "_")
    if key in MEDICAL_KNOWLEDGE_BASE:
        return MEDICAL_KNOWLEDGE_BASE[key]["guideline"]
    return [
        "Recheck vitals in 10-15 minutes.",
        "Contact a healthcare provider if symptoms persist or worsen.",
    ]
