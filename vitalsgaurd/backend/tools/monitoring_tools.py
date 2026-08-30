"""
Monitoring Agent tools — VitalsGuard AI
------------------------------------------
get_latest_vitals, get_vital_history, run_lstm_anomaly_detection,
run_trend_prediction, calculate_vital_deviation
"""

from __future__ import annotations
import os
import sys
import json
import importlib.util

from services import data_store
from tools.lstm_tool import lstm_predict

_MODEL_03_CACHE = None


def _load_model_03():
    global _MODEL_03_CACHE
    if _MODEL_03_CACHE is None:
        path = os.path.join(os.path.dirname(__file__), "../../base_models/03_trend_prediction/predict.py")
        spec = importlib.util.spec_from_file_location("predict_module_03_tool", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _MODEL_03_CACHE = mod.predict_trend
    return _MODEL_03_CACHE


def get_latest_vitals(patient_id: str = data_store.DEFAULT_PATIENT_ID) -> str:
    """
    Return the most recent recorded vitals reading for a patient as JSON.
    Args:
        patient_id: The patient identifier. Defaults to the demo patient.
    """
    return json.dumps(data_store.get_latest_vitals(patient_id))


def get_vital_history(patient_id: str = data_store.DEFAULT_PATIENT_ID, limit: int = 20) -> str:
    """
    Return the recent vital-sign history for a patient as a JSON list, oldest first.
    Args:
        patient_id: The patient identifier.
        limit: Maximum number of past readings to return.
    """
    return json.dumps(data_store.get_vital_history(patient_id, limit))


def run_lstm_anomaly_detection(vitals_json: str) -> str:
    """
    Run the LSTM-based anomaly detector on a vitals reading.
    Args:
        vitals_json: JSON string with heart_rate, spo2, temperature, ecg_irregularity.
    Returns:
        JSON string with anomaly_score, anomaly_detected, patterns, affected_regions, confidence.
    """
    return lstm_predict(vitals_json)


def run_trend_prediction(sequence_json: str) -> str:
    """
    Predict the short-term vitals trend (improving/stable/deteriorating) from a
    sequence of past readings using the LSTM trend model.
    Args:
        sequence_json: JSON list of past vitals dicts (heart_rate, spo2, temperature, respiratory_rate).
    """
    try:
        sequence = json.loads(sequence_json)
        if not sequence:
            return json.dumps({"error": "empty sequence"})
        predict_trend = _load_model_03()
        result = predict_trend(sequence)
        return json.dumps(result)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


def calculate_vital_deviation(current_vitals_json: str, baseline_vitals_json: str | None = None) -> str:
    """
    Compute per-vital absolute and percentage deviation from a baseline
    (patient's own baseline if no baseline is supplied).
    Args:
        current_vitals_json: JSON string of the current vitals reading.
        baseline_vitals_json: Optional JSON string of baseline vitals to compare against.
    """
    current = json.loads(current_vitals_json)
    if baseline_vitals_json:
        baseline = json.loads(baseline_vitals_json)
    else:
        baseline = data_store.get_patient_profile(current.get("patient_id", data_store.DEFAULT_PATIENT_ID))["baseline_vitals"]

    deviations = {}
    for key, baseline_val in baseline.items():
        if key not in current or not isinstance(baseline_val, (int, float)):
            continue
        current_val = current[key]
        if not isinstance(current_val, (int, float)):
            continue
        delta = current_val - baseline_val
        pct = (delta / baseline_val * 100) if baseline_val else 0.0
        deviations[key] = {
            "current": current_val,
            "baseline": baseline_val,
            "delta": round(delta, 2),
            "pct_change": round(pct, 1),
        }
    return json.dumps(deviations)
