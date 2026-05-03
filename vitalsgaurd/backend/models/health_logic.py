"""Early Warning Score (EWS) + Health Anomaly Fingerprint logic."""

from __future__ import annotations

# ── Early Warning Score ─────────────────────────────────────────────────────

EWS_THRESHOLDS = {
    "stable":   (0.0,  0.30),
    "warning":  (0.30, 0.60),
    "critical": (0.60, 1.01),
}


def compute_ews(anomaly_score: float) -> dict:
    """Return level, score, and colour for the Digital Twin UI."""
    for level, (lo, hi) in EWS_THRESHOLDS.items():
        if lo <= anomaly_score < hi:
            colours = {"stable": "green", "warning": "orange", "critical": "red"}
            return {
                "level": level,
                "score": anomaly_score,
                "colour": colours[level],
            }
    return {"level": "critical", "score": anomaly_score, "colour": "red"}


# ── Health Anomaly Fingerprint ──────────────────────────────────────────────

DISEASE_FINGERPRINTS = {
    "cardiac_arrhythmia": {
        "required_patterns": ["ecg_irregularity"],
        "optional_patterns": ["abnormal_heart_rate", "micro_fluctuation_silent_risk"],
        "description": "Irregular electrical activity in the heart.",
        "affected_region": "heart",
    },
    "hypoxia": {
        "required_patterns": ["low_spo2"],
        "optional_patterns": [],
        "description": "Insufficient oxygen reaching body tissues.",
        "affected_region": "lungs",
    },
    "tachycardia": {
        "required_patterns": ["abnormal_heart_rate"],
        "optional_patterns": ["micro_fluctuation_silent_risk"],
        "description": "Resting heart rate above 100 BPM.",
        "affected_region": "heart",
    },
    "early_covid_like": {
        "required_patterns": ["low_spo2"],
        "optional_patterns": ["abnormal_temperature"],
        "description": "SpO₂ drop paired with fever — COVID-like respiratory pattern.",
        "affected_region": "lungs",
    },
    "silent_cardiac_stress": {
        "required_patterns": ["micro_fluctuation_silent_risk"],
        "optional_patterns": [],
        "description": "Vitals appear normal but micro-fluctuations indicate hidden cardiac stress.",
        "affected_region": "heart",
    },
}


def match_fingerprints(patterns: list[str]) -> list[dict]:
    """Return a list of matched disease fingerprints sorted by confidence."""
    pattern_set = set(patterns)
    matches = []

    for disease, fp in DISEASE_FINGERPRINTS.items():
        required = set(fp["required_patterns"])
        optional = set(fp["optional_patterns"])

        if not required.issubset(pattern_set):
            continue  # required patterns missing

        matched_optional = optional & pattern_set
        confidence = round(
            0.6 + 0.4 * (len(matched_optional) / max(len(optional), 1)), 2
        )
        matches.append({
            "disease": disease,
            "confidence": confidence,
            "description": fp["description"],
            "affected_region": fp["affected_region"],
        })

    matches.sort(key=lambda x: x["confidence"], reverse=True)
    return matches
