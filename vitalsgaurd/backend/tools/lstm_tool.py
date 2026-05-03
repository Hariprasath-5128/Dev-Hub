"""
LSTM Prediction Tool — VitalsGuard AI
--------------------------------------
This module exposes a Phidata-compatible tool function that runs vital signs
through a time-series anomaly detection model.

Currently uses a rule-based stub that mirrors real LSTM output so the full
agent pipeline can run right now.  When your trained LSTM is ready:
  1. Save it as  backend/models/lstm_vitals.pt  (PyTorch) or .h5 (Keras)
  2. Replace the `_run_model()` function below with your inference code.
"""

from __future__ import annotations
import json
import random
from typing import Any

# ── Optional: uncomment when you plug in a real model ──────────────────────
# import torch
# import numpy as np
# _MODEL = torch.load("models/lstm_vitals.pt", map_location="cpu")
# _MODEL.eval()


def _run_model(vitals: dict) -> dict:
    """
    Stub that mimics LSTM output.
    Replace this body with real model inference when ready.
    """
    hr = vitals.get("heart_rate", 75)
    spo2 = vitals.get("spo2", 98)
    temp = vitals.get("temperature", 36.6)
    ecg_irregularity = vitals.get("ecg_irregularity", 0.0)  # 0.0–1.0 score

    # Simple rule-based anomaly scoring (replaces LSTM until model is trained)
    anomaly_score = 0.0
    patterns = []

    if hr > 100 or hr < 50:
        anomaly_score += 0.35
        patterns.append("abnormal_heart_rate")
    if spo2 < 94:
        anomaly_score += 0.35
        patterns.append("low_spo2")
    if temp > 38.0 or temp < 35.5:
        anomaly_score += 0.2
        patterns.append("abnormal_temperature")
    if ecg_irregularity > 0.5:
        anomaly_score += 0.3
        patterns.append("ecg_irregularity")

    # Micro-fluctuation simulation (silent risk detector)
    micro_risk = (
        ecg_irregularity > 0.3
        and 60 <= hr <= 100
        and spo2 >= 95
    )
    if micro_risk:
        patterns.append("micro_fluctuation_silent_risk")
        anomaly_score = max(anomaly_score, 0.45)

    anomaly_score = min(anomaly_score, 1.0)

    # Map score to affected body region for Digital Twin
    region_map = {
        "abnormal_heart_rate": "heart",
        "low_spo2": "lungs",
        "abnormal_temperature": "body",
        "ecg_irregularity": "heart",
        "micro_fluctuation_silent_risk": "heart",
    }
    affected_regions = list({region_map[p] for p in patterns})

    return {
        "anomaly_score": round(anomaly_score, 3),
        "anomaly_detected": anomaly_score > 0.3,
        "patterns": patterns,
        "affected_regions": affected_regions if affected_regions else ["none"],
        "confidence": round(random.uniform(0.78, 0.97), 2),  # stub confidence
    }


def lstm_predict(vitals_json: str) -> str:
    """
    Phidata tool function.
    Accepts a JSON string of vitals and returns a JSON string with the
    anomaly assessment.

    Args:
        vitals_json: JSON string with keys:
            heart_rate (int), spo2 (float), temperature (float),
            ecg_irregularity (float 0-1)
    """
    try:
        vitals: dict[str, Any] = json.loads(vitals_json)
    except Exception as exc:
        return json.dumps({"error": f"Invalid JSON: {exc}"})

    result = _run_model(vitals)
    return json.dumps(result)
