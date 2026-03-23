"""
Model 5: Health Anomaly Fingerprint — Prediction / Inference
Matches vital sign patterns against known disease fingerprints.
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import joblib


def load_model():
    model_dir = "05_anomaly_fingerprint/model"
    model = joblib.load(os.path.join(model_dir, "fingerprint_xgb.pkl"))
    le = joblib.load(os.path.join(model_dir, "disease_encoder.pkl"))
    feature_cols = joblib.load(os.path.join(model_dir, "feature_columns.pkl"))
    return model, le, feature_cols


DISEASE_INFO = {
    "Normal":               {"emoji": "✅", "desc": "No disease pattern matched."},
    "COVID_like":           {"emoji": "🦠", "desc": "Low SpO₂ + elevated temperature + high respiratory rate pattern."},
    "Cardiac":              {"emoji": "❤️",  "desc": "Irregular HR + high BP + elevated HRV pattern."},
    "Sepsis_like":          {"emoji": "🔥", "desc": "High fever + tachycardia + hypotension pattern."},
    "Respiratory_Distress": {"emoji": "🫁", "desc": "Very low SpO₂ + rapid breathing + declining trend."},
    "Heat_Stroke":          {"emoji": "🌡️",  "desc": "Extremely high temperature + tachycardia + low BP."},
}


def match_fingerprint(vitals_dict):
    """
    Match vital signs against disease fingerprints.

    Returns:
        dict with 'matched_disease', 'confidence', 'similarity_scores', 'description'
    """
    model, le, feature_cols = load_model()

    defaults = {
        "heart_rate": 75, "spo2": 97, "temperature": 36.6,
        "respiratory_rate": 16, "systolic_bp": 120, "diastolic_bp": 75,
        "hr_variability": 8, "spo2_trend": 0.0, "temp_trend": 0.0, "rr_trend": 0.0,
    }

    features = [vitals_dict.get(col, defaults.get(col, 0)) for col in feature_cols]
    X = np.array([features])

    probabilities = model.predict_proba(X)[0]
    predicted_idx = np.argmax(probabilities)
    matched_disease = le.inverse_transform([predicted_idx])[0]

    similarity_scores = {
        le.inverse_transform([i])[0]: round(float(p), 4)
        for i, p in enumerate(probabilities)
    }

    # Sort by similarity
    sorted_matches = sorted(similarity_scores.items(), key=lambda x: x[1], reverse=True)

    info = DISEASE_INFO.get(matched_disease, {"emoji": "❓", "desc": "Unknown pattern."})

    return {
        "matched_disease": matched_disease,
        "confidence": round(float(probabilities[predicted_idx]), 4),
        "description": f"{info['emoji']} {info['desc']}",
        "similarity_scores": dict(sorted_matches),
        "top_3_matches": [
            {"disease": d, "similarity": s} for d, s in sorted_matches[:3]
        ],
    }


if __name__ == "__main__":
    test_cases = [
        {"name": "Normal Patient", "vitals": {
            "heart_rate": 72, "spo2": 98, "temperature": 36.6,
            "respiratory_rate": 16, "systolic_bp": 120, "diastolic_bp": 78,
            "hr_variability": 6, "spo2_trend": 0.0, "temp_trend": 0.0, "rr_trend": 0.0,
        }},
        {"name": "COVID-like Pattern", "vitals": {
            "heart_rate": 102, "spo2": 86, "temperature": 39.2,
            "respiratory_rate": 28, "systolic_bp": 118, "diastolic_bp": 75,
            "hr_variability": 10, "spo2_trend": -1.2, "temp_trend": 0.3, "rr_trend": 1.5,
        }},
        {"name": "Cardiac Pattern", "vitals": {
            "heart_rate": 135, "spo2": 94, "temperature": 36.8,
            "respiratory_rate": 22, "systolic_bp": 175, "diastolic_bp": 105,
            "hr_variability": 38, "spo2_trend": -0.2, "temp_trend": 0.0, "rr_trend": 0.5,
        }},
        {"name": "Sepsis-like Pattern", "vitals": {
            "heart_rate": 125, "spo2": 91, "temperature": 40.2,
            "respiratory_rate": 30, "systolic_bp": 78, "diastolic_bp": 45,
            "hr_variability": 25, "spo2_trend": -0.8, "temp_trend": 0.5, "rr_trend": 1.8,
        }},
    ]

    print("=" * 65)
    print("  HEALTH ANOMALY FINGERPRINT — Disease Pattern Matching")
    print("=" * 65)

    for case in test_cases:
        result = match_fingerprint(case["vitals"])
        print(f"\n🔹 {case['name']}:")
        v = case["vitals"]
        print(f"   HR={v['heart_rate']}, SpO2={v['spo2']}, Temp={v['temperature']}, RR={v['respiratory_rate']}")
        print(f"   ➜ Matched: {result['matched_disease']} (confidence: {result['confidence']:.2%})")
        print(f"   ➜ {result['description']}")
        print(f"   Top matches:")
        for m in result["top_3_matches"]:
            print(f"     {m['disease']}: {m['similarity']:.2%}")
