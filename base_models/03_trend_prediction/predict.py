"""
Model 3: Trend-Based Prediction — Prediction / Inference
Loads trained LSTM and predicts trend + next vitals from a sequence of readings.
"""

import sys, os
sys.path.insert(0, "..")

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import numpy as np
import joblib
import tensorflow as tf

FEATURES = ["heart_rate", "spo2", "temperature", "respiratory_rate"]


def load_model():
    model_dir = "03_trend_prediction/model"
    model = tf.keras.models.load_model(os.path.join(model_dir, "trend_lstm.keras"))
    le = joblib.load(os.path.join(model_dir, "trend_encoder.pkl"))
    norm_params = joblib.load(os.path.join(model_dir, "normalization_params.pkl"))
    return model, le, norm_params


def predict_trend(sequence):
    """
    Predict trend and next vitals from a sequence of readings.

    Args:
        sequence: list of dicts or numpy array (shape: [seq_len, 4])
                  Each reading has: heart_rate, spo2, temperature, respiratory_rate

    Returns:
        dict with 'trend', 'confidence', 'predicted_next_vitals', 'trend_probabilities'
    """
    model, le, norm_params = load_model()

    if isinstance(sequence, list):
        arr = np.array([[r.get(f, 0) for f in FEATURES] for r in sequence])
    else:
        arr = np.array(sequence)

    # Pad or truncate to 24 time steps
    if len(arr) < 24:
        pad = np.tile(arr[-1], (24 - len(arr), 1))
        arr = np.vstack([arr, pad])
    elif len(arr) > 24:
        arr = arr[-24:]

    # Normalize
    arr_norm = (arr - norm_params["min"]) / norm_params["range"]
    X = arr_norm.reshape(1, 24, len(FEATURES))

    # Predict
    trend_probs, next_val_norm = model.predict(X, verbose=1)

    # Decode trend
    trend_idx = np.argmax(trend_probs[0])
    trend = le.inverse_transform([trend_idx])[0]

    # Denormalize next values
    next_vitals = next_val_norm[0] * norm_params["range"] + norm_params["min"]

    trend_prob_dict = {
        le.inverse_transform([i])[0]: round(float(p), 4)
        for i, p in enumerate(trend_probs[0])
    }

    return {
        "trend": trend,
        "confidence": round(float(trend_probs[0][trend_idx]), 4),
        "predicted_next_vitals": {
            FEATURES[i]: round(float(next_vitals[i]), 1)
            for i in range(len(FEATURES))
        },
        "trend_probabilities": trend_prob_dict,
    }


if __name__ == "__main__":
    # Simulate a deteriorating patient (24 readings)
    np.random.seed(0)
    deteriorating_seq = []
    for t in range(24):
        progress = t / 24
        deteriorating_seq.append({
            "heart_rate": 75 + progress * 40 + np.random.normal(0, 2),
            "spo2": 98 - progress * 10 + np.random.normal(0, 0.5),
            "temperature": 36.8 + progress * 2 + np.random.normal(0, 0.1),
            "respiratory_rate": 16 + progress * 8 + np.random.normal(0, 0.5),
        })

    stable_seq = []
    for t in range(24):
        stable_seq.append({
            "heart_rate": 75 + np.random.normal(0, 2),
            "spo2": 97 + np.random.normal(0, 0.3),
            "temperature": 36.6 + np.random.normal(0, 0.1),
            "respiratory_rate": 16 + np.random.normal(0, 0.5),
        })

    print("=" * 60)
    print("  TREND-BASED PREDICTION — Sample Predictions")
    print("=" * 60)

    for name, seq in [("Deteriorating Patient", deteriorating_seq), ("Stable Patient", stable_seq)]:
        result = predict_trend(seq)
        print(f"\n🔹 {name}:")
        print(f"   Last reading: HR={seq[-1]['heart_rate']:.0f}, SpO2={seq[-1]['spo2']:.0f}, "
              f"Temp={seq[-1]['temperature']:.1f}")
        print(f"   ➜ Trend: {result['trend']} (confidence: {result['confidence']:.2%})")
        print(f"   ➜ Predicted next:")
        for feat, val in result['predicted_next_vitals'].items():
            print(f"       {feat}: {val}")
