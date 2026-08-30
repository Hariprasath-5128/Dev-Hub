"""
Comparison / Vision Agent tools — VitalsGuard AI
------------------------------------------
extract_report_image, extract_lab_values, normalize_lab_units,
compare_with_vitals, calculate_correlation_score
"""

from __future__ import annotations
import json
import re

# Recognised lab markers -> the vitals field they should be compared against,
# plus the regex used to pull a numeric value with its unit out of free text.
_LAB_PATTERNS: dict[str, dict] = {
    "heart_rate":  {"regex": r"(?:heart rate|hr|pulse)\D{0,10}(\d{2,3})\s*(bpm)?", "vital_key": "heart_rate", "unit": "bpm"},
    "spo2":        {"regex": r"(?:spo2|spo₂|oxygen saturation|o2 sat)\D{0,10}(\d{2,3})\s*(%)?", "vital_key": "spo2", "unit": "%"},
    "temperature": {"regex": r"(?:temp(?:erature)?)\D{0,10}(\d{2,3}(?:\.\d+)?)\s*(°?c|°?f|celsius|fahrenheit)?", "vital_key": "temperature", "unit": "c"},
    "systolic_bp": {"regex": r"(?:bp|blood pressure)\D{0,10}(\d{2,3})\s*/\s*(\d{2,3})", "vital_key": "systolic_bp", "unit": "mmhg"},
    "respiratory_rate": {"regex": r"(?:resp(?:iratory)? rate|rr)\D{0,10}(\d{1,2})\s*(breaths/min)?", "vital_key": "respiratory_rate", "unit": "breaths/min"},
}


def extract_report_image(base64_image: str) -> str:
    """
    Extract raw text/findings from a medical report image using the
    Mistral Pixtral vision model.
    Args:
        base64_image: Base64-encoded JPEG/PNG of the report.
    """
    # Delegates to the existing Mistral vision call defined in vitals_agents.py
    # to avoid duplicating SDK setup; imported lazily to dodge circular imports.
    from agents.vitals_agents import extract_report_data_with_mistral
    return extract_report_data_with_mistral(base64_image)


def extract_lab_values(report_text: str) -> str:
    """
    Parse structured lab values (heart rate, SpO2, temperature, blood
    pressure, respiratory rate) out of free-text report content.
    Args:
        report_text: Raw text extracted from a medical report (e.g. via extract_report_image).
    """
    text = report_text.lower()
    extracted = {}

    for marker, cfg in _LAB_PATTERNS.items():
        match = re.search(cfg["regex"], text, re.IGNORECASE)
        if not match:
            continue
        if marker == "systolic_bp":
            extracted["systolic_bp"] = {"value": float(match.group(1)), "unit": "mmHg"}
            extracted["diastolic_bp"] = {"value": float(match.group(2)), "unit": "mmHg"}
        else:
            unit = (match.group(2) or cfg["unit"]).strip() if match.lastindex and match.lastindex >= 2 else cfg["unit"]
            extracted[marker] = {"value": float(match.group(1)), "unit": unit}

    return json.dumps(extracted)


def normalize_lab_units(lab_values_json: str) -> str:
    """
    Normalize extracted lab values to the units used by the vitals pipeline
    (Celsius, bpm, %, mmHg, breaths/min).
    Args:
        lab_values_json: JSON object as returned by extract_lab_values.
    """
    lab_values = json.loads(lab_values_json)
    normalized = {}

    for key, entry in lab_values.items():
        value = entry["value"]
        unit = str(entry.get("unit", "")).lower().strip()
        if key == "temperature" and ("f" in unit and "c" not in unit):
            value = round((value - 32) * 5 / 9, 1)
        normalized[key] = {"value": value, "unit": "c" if key == "temperature" else entry.get("unit")}

    return json.dumps(normalized)


def compare_with_vitals(normalized_lab_values_json: str, vitals_json: str) -> str:
    """
    Compare normalized lab-report values against the sensor-derived vitals
    to see how closely they agree.
    Args:
        normalized_lab_values_json: JSON object as returned by normalize_lab_units.
        vitals_json: JSON string of the sensor vitals reading.
    """
    labs = json.loads(normalized_lab_values_json)
    vitals = json.loads(vitals_json)

    comparisons = []
    for key, entry in labs.items():
        if key not in vitals:
            continue
        lab_val = entry["value"]
        sensor_val = vitals[key]
        delta = round(lab_val - sensor_val, 2)
        pct = round(abs(delta) / sensor_val * 100, 1) if sensor_val else None
        comparisons.append({
            "marker": key,
            "report_value": lab_val,
            "sensor_value": sensor_val,
            "delta": delta,
            "pct_difference": pct,
            "agrees": pct is not None and pct <= 10,
        })

    return json.dumps(comparisons)


def calculate_correlation_score(comparisons_json: str) -> str:
    """
    Compute a 0-100 correlation score describing how well the physical
    report agrees with the sensor/AI findings.
    Args:
        comparisons_json: JSON list as returned by compare_with_vitals.
    """
    comparisons = json.loads(comparisons_json)
    if not comparisons:
        return json.dumps({"correlation_score": 0, "basis": "no comparable markers found in report"})

    agree_count = sum(1 for c in comparisons if c.get("agrees"))
    score = round(40 + 60 * (agree_count / len(comparisons)))
    return json.dumps({
        "correlation_score": score,
        "markers_compared": len(comparisons),
        "markers_agreeing": agree_count,
    })
