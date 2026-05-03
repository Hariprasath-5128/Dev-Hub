"""
Model 6: ECG Pattern Detection — Prediction / Inference
Detects and highlights abnormal segments in ECG signals.
"""

import sys, os
sys.path.insert(0, "..")

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import numpy as np
import joblib
import tensorflow as tf

ECG_LENGTH = 500


def load_model():
    model_dir = "06_ecg_lstm/model"
    model = tf.keras.models.load_model(os.path.join(model_dir, "ecg_lstm.keras"))
    norm_params = joblib.load(os.path.join(model_dir, "ecg_normalization.pkl"))
    label_names = joblib.load(os.path.join(model_dir, "label_names.pkl"))
    return model, norm_params, label_names


def detect_ecg_anomalies(ecg_signal):
    """
    Detect anomalies in an ECG signal.

    Args:
        ecg_signal: 1D numpy array of ECG values (length ~500)

    Returns:
        dict with:
        - 'per_timestep_labels': array of label indices
        - 'abnormal_segments': list of {start, end, type, confidence}
        - 'summary': overall summary text
        - 'has_anomaly': bool
    """
    model, norm_params, label_names = load_model()

    # Pad/truncate to ECG_LENGTH
    signal = np.array(ecg_signal, dtype=float)
    if len(signal) > ECG_LENGTH:
        signal = signal[:ECG_LENGTH]
    elif len(signal) < ECG_LENGTH:
        signal = np.pad(signal, (0, ECG_LENGTH - len(signal)))

    # Normalize
    signal_norm = (signal - norm_params["min"]) / (norm_params["max"] - norm_params["min"] + 1e-8)
    X = signal_norm.reshape(1, ECG_LENGTH, 1)

    # Predict
    pred_probs = model.predict(X, verbose=1)[0]  # (500, 5)
    pred_labels = np.argmax(pred_probs, axis=-1)  # (500,)

    # Extract abnormal segments
    segments = []
    current_anomaly = None

    for i, label in enumerate(pred_labels):
        if label > 0:  # Not normal
            if current_anomaly is None or current_anomaly["type_id"] != label:
                if current_anomaly is not None:
                    segments.append(current_anomaly)
                current_anomaly = {
                    "start": i,
                    "end": i,
                    "type_id": int(label),
                    "type": label_names[label],
                    "confidences": [float(pred_probs[i, label])],
                }
            else:
                current_anomaly["end"] = i
                current_anomaly["confidences"].append(float(pred_probs[i, label]))
        else:
            if current_anomaly is not None:
                segments.append(current_anomaly)
                current_anomaly = None

    if current_anomaly is not None:
        segments.append(current_anomaly)

    # Calculate average confidence per segment
    for seg in segments:
        seg["confidence"] = round(np.mean(seg["confidences"]), 4)
        del seg["confidences"]

    has_anomaly = len(segments) > 0

    # Summary
    if has_anomaly:
        anomaly_types = set(s["type"] for s in segments)
        summary = f"⚠️ Detected {len(segments)} abnormal segment(s): {', '.join(anomaly_types)}"
    else:
        summary = "✅ ECG signal appears normal. No anomalies detected."

    return {
        "per_timestep_labels": pred_labels.tolist(),
        "abnormal_segments": segments,
        "has_anomaly": has_anomaly,
        "summary": summary,
    }


if __name__ == "__main__":
    from shared.utils import generate_ecg_wave

    print("=" * 60)
    print("  ECG PATTERN DETECTION — Sample Analysis")
    print("=" * 60)

    # Generate a normal ECG
    _, normal_ecg = generate_ecg_wave(duration_sec=2.0, sampling_rate=250, heart_rate=72)
    result = detect_ecg_anomalies(normal_ecg[:ECG_LENGTH])
    print(f"\n🔹 Normal ECG:")
    print(f"   ➜ {result['summary']}")
    print(f"   Abnormal segments: {len(result['abnormal_segments'])}")

    # Generate an ECG with injected anomaly
    _, anomaly_ecg = generate_ecg_wave(duration_sec=2.0, sampling_rate=250, heart_rate=72)
    anomaly_ecg = anomaly_ecg[:ECG_LENGTH]
    # Manually inject spike anomalies
    for i in range(200, 250):
        anomaly_ecg[i] += np.random.uniform(0.5, 1.5) * np.sin(i * 0.5)

    result = detect_ecg_anomalies(anomaly_ecg)
    print(f"\n🔹 ECG with injected anomaly:")
    print(f"   ➜ {result['summary']}")
    for seg in result["abnormal_segments"]:
        print(f"   Segment [{seg['start']}-{seg['end']}]: {seg['type']} "
              f"(confidence: {seg['confidence']:.2%})")
