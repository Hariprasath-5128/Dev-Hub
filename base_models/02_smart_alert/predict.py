"""
Model 2: Smart Alert System — Prediction / Inference
Predicts severity level and recommends alert actions.
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import joblib


def load_model():
    model_dir = "02_smart_alert/model"
    model = joblib.load(os.path.join(model_dir, "smart_alert_rf.pkl"))
    le = joblib.load(os.path.join(model_dir, "severity_encoder.pkl"))
    feature_cols = joblib.load(os.path.join(model_dir, "feature_columns.pkl"))
    return model, le, feature_cols


ALERT_ACTIONS = {
    "stable":   "✅ No action needed. Continue routine monitoring.",
    "warning":  "⚠️ Increase monitoring frequency. Notify on-call physician.",
    "critical": "🚨 CRITICAL: Auto-send alert to emergency contact. Prepare intervention protocol.",
}


def predict_alert(vitals_dict):
    """
    Predict alert severity from vital signs.

    Returns:
        dict with 'severity', 'confidence', 'action', 'all_probabilities'
    """
    model, le, feature_cols = load_model()

    features = []
    defaults = {
        "heart_rate": 75, "spo2": 97, "temperature": 36.6,
        "respiratory_rate": 16, "systolic_bp": 120, "diastolic_bp": 75,
    }
    for col in feature_cols:
        features.append(vitals_dict.get(col, defaults.get(col, 0)))

    X = np.array([features])
    probabilities = model.predict_proba(X)[0]
    predicted_idx = np.argmax(probabilities)
    severity = le.inverse_transform([predicted_idx])[0]

    all_probs = {
        le.inverse_transform([i])[0]: round(float(p), 4)
        for i, p in enumerate(probabilities)
    }

    return {
        "severity": severity,
        "confidence": round(float(probabilities[predicted_idx]), 4),
        "action": ALERT_ACTIONS[severity],
        "all_probabilities": all_probs,
    }


if __name__ == "__main__":
    test_cases = [
        {"name": "Stable Patient", "vitals": {
            "heart_rate": 72, "spo2": 98, "temperature": 36.6,
            "respiratory_rate": 16, "systolic_bp": 120, "diastolic_bp": 78,
        }},
        {"name": "Warning Patient", "vitals": {
            "heart_rate": 115, "spo2": 93, "temperature": 38.5,
            "respiratory_rate": 23, "systolic_bp": 105, "diastolic_bp": 65,
        }},
        {"name": "Critical Patient", "vitals": {
            "heart_rate": 155, "spo2": 82, "temperature": 40.5,
            "respiratory_rate": 32, "systolic_bp": 75, "diastolic_bp": 45,
        }},
    ]

    print("=" * 60)
    print("  SMART ALERT SYSTEM — Sample Predictions")
    print("=" * 60)

    for case in test_cases:
        result = predict_alert(case["vitals"])
        print(f"\n🔹 {case['name']}:")
        print(f"   HR={case['vitals']['heart_rate']}, SpO2={case['vitals']['spo2']}, "
              f"Temp={case['vitals']['temperature']}")
        print(f"   ➜ Severity: {result['severity'].upper()} "
              f"(confidence: {result['confidence']:.2%})")
        print(f"   ➜ Action: {result['action']}")
