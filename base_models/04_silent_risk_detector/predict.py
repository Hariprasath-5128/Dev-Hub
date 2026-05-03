"""
Model 4: Silent Risk Detector — Prediction / Inference
Detects hidden health risks even when individual vitals appear normal.
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import joblib


def load_models():
    model_dir = "04_silent_risk_detector/model"
    iso_forest = joblib.load(os.path.join(model_dir, "isolation_forest.pkl"))
    xgb_model = joblib.load(os.path.join(model_dir, "risk_classifier_xgb.pkl"))
    le = joblib.load(os.path.join(model_dir, "risk_type_encoder.pkl"))
    scaler = joblib.load(os.path.join(model_dir, "feature_scaler.pkl"))
    feature_cols = joblib.load(os.path.join(model_dir, "feature_columns.pkl"))
    return iso_forest, xgb_model, le, scaler, feature_cols


RISK_DESCRIPTIONS = {
    "truly_normal":             "No hidden risk patterns detected.",
    "hidden_cardiac_risk":      "⚠️ Hidden cardiac risk: High HR variability + irregular rhythm pattern detected despite normal vitals.",
    "hidden_respiratory_risk":  "⚠️ Hidden respiratory risk: SpO₂ micro-fluctuations + correlated HR changes suggest early respiratory compromise.",
    "hidden_stress_risk":       "⚠️ Hidden stress risk: Abnormally low HRV + widening pulse pressure indicates autonomic stress response.",
}


def detect_silent_risk(vitals_dict):
    """
    Detect hidden health risks from vital signs + derived features.

    Args:
        vitals_dict: dict with vitals + derived features

    Returns:
        dict with 'is_anomaly', 'anomaly_score', 'risk_type', 'confidence', 'description'
    """
    iso_forest, xgb_model, le, scaler, feature_cols = load_models()

    defaults = {
        "heart_rate": 75, "spo2": 97, "temperature": 36.6,
        "respiratory_rate": 16, "systolic_bp": 120, "diastolic_bp": 75,
        "hr_variability": 8, "spo2_variability": 0.3, "hr_spo2_corr": 0.0,
        "temp_trend_slope": 0.0, "rr_irregularity": 0.05, "bp_pulse_pressure": 40,
    }

    features = [vitals_dict.get(col, defaults.get(col, 0)) for col in feature_cols]
    X = np.array([features])
    X_scaled = scaler.transform(X)

    # Isolation Forest: anomaly detection
    anomaly_score = float(iso_forest.decision_function(X_scaled)[0])
    is_anomaly = bool(iso_forest.predict(X_scaled)[0] == -1)

    # XGBoost: risk type classification
    risk_probs = xgb_model.predict_proba(X_scaled)[0]
    risk_idx = np.argmax(risk_probs)
    risk_type = le.inverse_transform([risk_idx])[0]

    risk_score = 1.0 - (anomaly_score + 0.5)  # Normalize to 0-1 (higher = more risky)
    risk_score = np.clip(risk_score, 0, 1)

    return {
        "is_anomaly": is_anomaly,
        "anomaly_score": round(anomaly_score, 4),
        "risk_score": round(float(risk_score), 4),
        "risk_type": risk_type,
        "confidence": round(float(risk_probs[risk_idx]), 4),
        "description": RISK_DESCRIPTIONS.get(risk_type, "Unknown risk pattern."),
        "all_risk_probabilities": {
            le.inverse_transform([i])[0]: round(float(p), 4)
            for i, p in enumerate(risk_probs)
        },
    }


if __name__ == "__main__":
    test_cases = [
        {"name": "Truly Normal", "vitals": {
            "heart_rate": 72, "spo2": 98, "temperature": 36.6,
            "respiratory_rate": 16, "systolic_bp": 120, "diastolic_bp": 78,
            "hr_variability": 6, "spo2_variability": 0.3, "hr_spo2_corr": 0.05,
            "temp_trend_slope": 0.0, "rr_irregularity": 0.04, "bp_pulse_pressure": 42,
        }},
        {"name": "Hidden Cardiac Risk (looks normal!)", "vitals": {
            "heart_rate": 78, "spo2": 97, "temperature": 36.8,
            "respiratory_rate": 17, "systolic_bp": 128, "diastolic_bp": 80,
            "hr_variability": 32, "spo2_variability": 1.5, "hr_spo2_corr": 0.7,
            "temp_trend_slope": 0.0, "rr_irregularity": 0.25, "bp_pulse_pressure": 48,
        }},
        {"name": "Hidden Stress (looks normal!)", "vitals": {
            "heart_rate": 88, "spo2": 98, "temperature": 36.3,
            "respiratory_rate": 19, "systolic_bp": 138, "diastolic_bp": 82,
            "hr_variability": 3, "spo2_variability": 0.4, "hr_spo2_corr": 0.0,
            "temp_trend_slope": -0.03, "rr_irregularity": 0.03, "bp_pulse_pressure": 56,
        }},
    ]

    print("=" * 65)
    print("  SILENT RISK DETECTOR — Hidden Pattern Analysis")
    print("=" * 65)

    for case in test_cases:
        result = detect_silent_risk(case["vitals"])
        v = case["vitals"]
        print(f"\n🔹 {case['name']}:")
        print(f"   Vitals: HR={v['heart_rate']}, SpO2={v['spo2']}, Temp={v['temperature']}")
        print(f"   HRV={v['hr_variability']}, SpO2-var={v['spo2_variability']}, "
              f"RR-irreg={v['rr_irregularity']}")
        print(f"   ➜ Risk Score: {result['risk_score']:.2f}/1.00")
        print(f"   ➜ {result['description']}")
