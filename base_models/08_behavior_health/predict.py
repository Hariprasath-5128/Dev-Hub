"""
Model 8: Behavior-Aware Health Prediction — Prediction / Inference
Predicts health risk accounting for behavioral context (sleep, stress, activity).
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import joblib


def load_model():
    model_dir = "08_behavior_health/model"
    model = joblib.load(os.path.join(model_dir, "behavior_health_xgb.pkl"))
    le = joblib.load(os.path.join(model_dir, "risk_level_encoder.pkl"))
    feature_cols = joblib.load(os.path.join(model_dir, "feature_columns.pkl"))
    return model, le, feature_cols


RISK_RECOMMENDATIONS = {
    "low":      "✅ Low risk. Maintain healthy habits.",
    "moderate": "⚠️ Moderate risk. Consider improving sleep/reducing stress. Monitor vitals.",
    "high":     "🔶 High risk. Immediate lifestyle adjustments recommended. Consult a physician.",
    "critical": "🚨 Critical risk. Seek immediate medical attention. Alert emergency contacts.",
}

BEHAVIOR_INSIGHTS = {
    "sleep_low":     "💤 Sleep deprivation detected. Poor sleep amplifies cardiovascular risk.",
    "stress_high":   "😰 High stress levels. Chronic stress elevates HR, BP, and inflammation markers.",
    "activity_high": "🏃 Intense activity. Combined with other risk factors, recovery monitoring advised.",
    "combined_risk": "⚡ Multiple behavioral risk factors compound your health risk significantly.",
}


def predict_behavior_risk(vitals_dict):
    """
    Predict health risk adjusted for behavioral context.

    Args:
        vitals_dict: dict with vitals + 'sleep_hours', 'stress_level', 'activity_level'

    Returns:
        dict with 'risk_level', 'confidence', 'recommendations', 'behavioral_insights'
    """
    model, le, feature_cols = load_model()

    defaults = {
        "heart_rate": 75, "spo2": 97, "temperature": 36.6,
        "respiratory_rate": 16, "systolic_bp": 120,
        "sleep_hours": 7, "stress_level": 3, "activity_level": 5,
    }

    features = [vitals_dict.get(col, defaults.get(col, 0)) for col in feature_cols]
    X = np.array([features])

    probabilities = model.predict_proba(X)[0]
    predicted_idx = np.argmax(probabilities)
    risk_level = le.inverse_transform([predicted_idx])[0]

    all_probs = {
        le.inverse_transform([i])[0]: round(float(p), 4)
        for i, p in enumerate(probabilities)
    }

    # Generate behavioral insights
    insights = []
    sleep = vitals_dict.get("sleep_hours", 7)
    stress = vitals_dict.get("stress_level", 3)
    activity = vitals_dict.get("activity_level", 5)

    if sleep < 5:
        insights.append(BEHAVIOR_INSIGHTS["sleep_low"])
    if stress > 7:
        insights.append(BEHAVIOR_INSIGHTS["stress_high"])
    if activity > 8:
        insights.append(BEHAVIOR_INSIGHTS["activity_high"])
    if sleep < 5 and stress > 6:
        insights.append(BEHAVIOR_INSIGHTS["combined_risk"])

    return {
        "risk_level": risk_level,
        "confidence": round(float(probabilities[predicted_idx]), 4),
        "recommendation": RISK_RECOMMENDATIONS[risk_level],
        "behavioral_insights": insights,
        "all_probabilities": all_probs,
    }


if __name__ == "__main__":
    test_cases = [
        {"name": "Healthy + Good Behavior", "vitals": {
            "heart_rate": 72, "spo2": 98, "temperature": 36.6,
            "respiratory_rate": 16, "systolic_bp": 118,
            "sleep_hours": 8, "stress_level": 2, "activity_level": 5,
        }},
        {"name": "Normal Vitals + Bad Sleep + High Stress", "vitals": {
            "heart_rate": 85, "spo2": 96, "temperature": 36.8,
            "respiratory_rate": 18, "systolic_bp": 130,
            "sleep_hours": 3, "stress_level": 9, "activity_level": 2,
        }},
        {"name": "Borderline Vitals + Sleep Deprived", "vitals": {
            "heart_rate": 105, "spo2": 93, "temperature": 37.5,
            "respiratory_rate": 22, "systolic_bp": 145,
            "sleep_hours": 3, "stress_level": 8, "activity_level": 1,
        }},
        {"name": "Good Vitals + Active Lifestyle", "vitals": {
            "heart_rate": 68, "spo2": 99, "temperature": 36.5,
            "respiratory_rate": 14, "systolic_bp": 115,
            "sleep_hours": 8, "stress_level": 2, "activity_level": 9,
        }},
    ]

    print("=" * 70)
    print("  BEHAVIOR-AWARE HEALTH PREDICTION — Lifestyle Impact Analysis")
    print("=" * 70)

    for case in test_cases:
        result = predict_behavior_risk(case["vitals"])
        v = case["vitals"]
        print(f"\n🔹 {case['name']}:")
        print(f"   Vitals: HR={v['heart_rate']}, SpO2={v['spo2']}, Temp={v['temperature']}")
        print(f"   Behavior: Sleep={v['sleep_hours']}h, Stress={v['stress_level']}/10, "
              f"Activity={v['activity_level']}/10")
        print(f"   ➜ Risk: {result['risk_level'].upper()} (confidence: {result['confidence']:.2%})")
        print(f"   ➜ {result['recommendation']}")
        for insight in result["behavioral_insights"]:
            print(f"   ➜ {insight}")
