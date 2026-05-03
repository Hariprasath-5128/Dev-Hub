"""
Model 7: What-If Health Simulator — Prediction / Inference
Simulates health risk progression: user sets vitals → see predicted risks at 2h, 6h, 12h, 24h.
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import joblib

TIME_STEPS = ["2h", "6h", "12h", "24h"]


def load_models():
    model_dir = "07_whatif_simulator/model"
    feature_cols = joblib.load(os.path.join(model_dir, "feature_columns.pkl"))

    models = {}
    for ts in TIME_STEPS:
        models[ts] = {
            "risk_model": joblib.load(os.path.join(model_dir, f"risk_regressor_{ts}.pkl")),
            "cond_model": joblib.load(os.path.join(model_dir, f"condition_classifier_{ts}.pkl")),
            "encoder": joblib.load(os.path.join(model_dir, f"condition_encoder_{ts}.pkl")),
        }

    return models, feature_cols


def simulate_whatif(vitals_dict):
    """
    Simulate health risk progression from current vitals.

    Args:
        vitals_dict: dict with 'heart_rate', 'spo2', 'temperature', 'respiratory_rate', 'systolic_bp'

    Returns:
        dict with per-time-step predictions:
        {
            "2h":  {"risk_score": 0.15, "condition": "No significant risk", "risk_level": "low"},
            "6h":  {...},
            "12h": {...},
            "24h": {...},
            "overall_trajectory": "deteriorating" | "stable" | "improving"
        }
    """
    models, feature_cols = load_models()

    defaults = {
        "heart_rate": 75, "spo2": 97, "temperature": 36.6,
        "respiratory_rate": 16, "systolic_bp": 120,
    }

    features = [vitals_dict.get(col, defaults.get(col, 0)) for col in feature_cols]
    X = np.array([features])

    predictions = {}
    risk_scores = []

    for ts in TIME_STEPS:
        m = models[ts]

        risk_score = float(np.clip(m["risk_model"].predict(X)[0], 0, 1))
        cond_probs = m["cond_model"].predict_proba(X)[0]
        cond_idx = np.argmax(cond_probs)
        condition = m["encoder"].inverse_transform([cond_idx])[0]

        # Risk level
        if risk_score < 0.3:
            risk_level = "low"
        elif risk_score < 0.6:
            risk_level = "moderate"
        else:
            risk_level = "high"

        predictions[ts] = {
            "risk_score": round(risk_score, 4),
            "condition": condition,
            "risk_level": risk_level,
            "confidence": round(float(cond_probs[cond_idx]), 4),
        }
        risk_scores.append(risk_score)

    # Determine overall trajectory
    if len(risk_scores) >= 2:
        trend = risk_scores[-1] - risk_scores[0]
        if trend > 0.1:
            trajectory = "deteriorating"
        elif trend < -0.1:
            trajectory = "improving"
        else:
            trajectory = "stable"
    else:
        trajectory = "stable"

    predictions["overall_trajectory"] = trajectory

    return predictions


if __name__ == "__main__":
    test_cases = [
        {"name": "Normal Vitals", "vitals": {
            "heart_rate": 72, "spo2": 98, "temperature": 36.6,
            "respiratory_rate": 16, "systolic_bp": 120,
        }},
        {"name": "Borderline SpO2 + Elevated HR", "vitals": {
            "heart_rate": 110, "spo2": 93, "temperature": 37.8,
            "respiratory_rate": 22, "systolic_bp": 135,
        }},
        {"name": "Critical Vitals", "vitals": {
            "heart_rate": 145, "spo2": 82, "temperature": 39.5,
            "respiratory_rate": 32, "systolic_bp": 75,
        }},
    ]

    print("=" * 70)
    print("  WHAT-IF HEALTH SIMULATOR — Risk Progression")
    print("=" * 70)

    for case in test_cases:
        result = simulate_whatif(case["vitals"])
        v = case["vitals"]
        print(f"\n🔹 {case['name']}:")
        print(f"   Current: HR={v['heart_rate']}, SpO2={v['spo2']}, "
              f"Temp={v['temperature']}, BP={v['systolic_bp']}")
        print(f"   Trajectory: {result['overall_trajectory'].upper()}")
        print(f"   ┌────────┬────────────┬──────────┬────────────────────────────────┐")
        print(f"   │ Time   │ Risk Score │ Level    │ Predicted Condition            │")
        print(f"   ├────────┼────────────┼──────────┼────────────────────────────────┤")
        for ts in TIME_STEPS:
            p = result[ts]
            print(f"   │ {ts:>6} │ {p['risk_score']:>10.4f} │ {p['risk_level']:>8} │ {p['condition']:<30} │")
        print(f"   └────────┴────────────┴──────────┴────────────────────────────────┘")
