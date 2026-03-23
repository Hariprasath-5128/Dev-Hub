"""
Model 1: Core Health Predictor — Prediction / Inference
Loads trained model and predicts health condition from vital signs.
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import joblib


def load_model():
    """Load the trained model, label encoder, and feature columns."""
    model_dir = "01_health_predictor/model"
    model = joblib.load(os.path.join(model_dir, "health_predictor_xgb.pkl"))
    le = joblib.load(os.path.join(model_dir, "label_encoder.pkl"))
    feature_cols = joblib.load(os.path.join(model_dir, "feature_columns.pkl"))
    return model, le, feature_cols


def predict_condition(vitals_dict):
    """
    Predict health condition from a dictionary of vital signs.

    Args:
        vitals_dict: dict with keys like 'heart_rate', 'spo2', 'temperature', etc.

    Returns:
        dict with 'predicted_condition', 'confidence', and 'all_probabilities'
    """
    model, le, feature_cols = load_model()

    # Build feature array in correct order
    features = []
    for col in feature_cols:
        if col in vitals_dict:
            features.append(vitals_dict[col])
        else:
            # Default to mid-range if missing
            defaults = {
                "heart_rate": 75, "spo2": 97, "temperature": 36.6,
                "respiratory_rate": 16, "systolic_bp": 120,
                "diastolic_bp": 75, "hr_variability": 8,
            }
            features.append(defaults.get(col, 0))

    X = np.array([features])
    probabilities = model.predict_proba(X)[0]
    predicted_idx = np.argmax(probabilities)
    predicted_condition = le.inverse_transform([predicted_idx])[0]

    all_probs = {
        le.inverse_transform([i])[0]: round(float(p), 4)
        for i, p in enumerate(probabilities)
    }

    return {
        "predicted_condition": predicted_condition,
        "confidence": round(float(probabilities[predicted_idx]), 4),
        "all_probabilities": all_probs,
    }


# ── Demo ──
if __name__ == "__main__":
    test_cases = [
        {"name": "Normal Patient", "vitals": {
            "heart_rate": 72, "spo2": 98, "temperature": 36.6,
            "respiratory_rate": 16, "systolic_bp": 120, "diastolic_bp": 78, "hr_variability": 6
        }},
        {"name": "Fever Patient", "vitals": {
            "heart_rate": 105, "spo2": 96, "temperature": 39.5,
            "respiratory_rate": 22, "systolic_bp": 125, "diastolic_bp": 82, "hr_variability": 10
        }},
        {"name": "Hypoxia Patient", "vitals": {
            "heart_rate": 110, "spo2": 82, "temperature": 37.0,
            "respiratory_rate": 30, "systolic_bp": 130, "diastolic_bp": 85, "hr_variability": 12
        }},
        {"name": "Bradycardia Patient", "vitals": {
            "heart_rate": 42, "spo2": 95, "temperature": 36.2,
            "respiratory_rate": 12, "systolic_bp": 100, "diastolic_bp": 65, "hr_variability": 5
        }},
    ]

    print("=" * 60)
    print("  HEALTH CONDITION PREDICTOR — Sample Predictions")
    print("=" * 60)

    for case in test_cases:
        result = predict_condition(case["vitals"])
        print(f"\n🔹 {case['name']}:")
        print(f"   Vitals: HR={case['vitals']['heart_rate']}, SpO2={case['vitals']['spo2']}, "
              f"Temp={case['vitals']['temperature']}, RR={case['vitals']['respiratory_rate']}")
        print(f"   ➜ Predicted: {result['predicted_condition']} "
              f"(confidence: {result['confidence']:.2%})")
        # Top 3 probabilities
        sorted_probs = sorted(result['all_probabilities'].items(), key=lambda x: x[1], reverse=True)[:3]
        for cond, prob in sorted_probs:
            print(f"     {cond}: {prob:.2%}")
