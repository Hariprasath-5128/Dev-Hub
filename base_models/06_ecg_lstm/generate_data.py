"""
Model 6: ECG Pattern Detection (LSTM) — Synthetic Dataset Generation
Generates ~3,000 synthetic ECG signals with labeled abnormal segments.
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
from shared.utils import generate_ecg_wave

np.random.seed(42)

ECG_LENGTH = 500       # samples per signal
SAMPLING_RATE = 250    # Hz
ANOMALY_TYPES = ["normal", "tachycardia", "bradycardia", "arrhythmia", "st_elevation"]


def inject_anomaly(ecg, labels, anomaly_type, start, end):
    """Inject an anomaly into a segment of the ECG signal."""
    segment = ecg[start:end].copy()

    if anomaly_type == "tachycardia":
        # Compress beats (faster rate) by playing them at 2x speed
        # Tile segment so we don't run out of data
        tachy_segment = np.tile(segment, 2)
        compressed = np.interp(
            np.linspace(0, len(tachy_segment), len(segment)),
            np.arange(len(tachy_segment)),
            tachy_segment
        )
        ecg[start:end] = compressed + np.random.normal(0, 0.05, len(segment))
        labels[start:end] = 1

    elif anomaly_type == "bradycardia":
        # Stretch beats (slower rate) by playing them at 0.5x speed
        stretched = np.interp(
            np.linspace(0, len(segment) / 2, len(segment)),
            np.arange(len(segment)),
            segment
        )
        ecg[start:end] = stretched
        labels[start:end] = 2

    elif anomaly_type == "arrhythmia":
        # Add irregular spikes and timing
        n_spikes = np.random.randint(3, 8)
        spike_positions = np.random.randint(0, len(segment), n_spikes)
        for pos in spike_positions:
            spike_width = np.random.randint(3, 8)
            spike_amp = np.random.uniform(0.5, 1.5) * np.random.choice([-1, 1])
            for j in range(max(0, pos - spike_width), min(len(segment), pos + spike_width)):
                ecg[start + j] += spike_amp * np.exp(-0.5 * ((j - pos) / 2) ** 2)
        labels[start:end] = 3

    elif anomaly_type == "st_elevation":
        # Elevate the ST segment (between S and T waves)
        elevation = np.random.uniform(0.3, 0.8)
        t = np.linspace(0, 1, len(segment))
        st_mask = np.where((t > 0.3) & (t < 0.7), 1, 0)
        ecg[start:end] += elevation * st_mask * np.exp(-((t - 0.5) ** 2) / 0.1)
        labels[start:end] = 4

    return ecg, labels


def generate_ecg_sample():
    """Generate one ECG signal with possible anomalies and per-timestep labels."""
    hr = np.random.uniform(60, 100)
    _, ecg = generate_ecg_wave(
        duration_sec=ECG_LENGTH / SAMPLING_RATE,
        sampling_rate=SAMPLING_RATE,
        heart_rate=hr,
        noise_level=0.03,
    )

    # Ensure correct length
    if len(ecg) > ECG_LENGTH:
        ecg = ecg[:ECG_LENGTH]
    elif len(ecg) < ECG_LENGTH:
        ecg = np.pad(ecg, (0, ECG_LENGTH - len(ecg)))

    labels = np.zeros(ECG_LENGTH, dtype=int)  # 0 = normal

    # 60% chance of having an anomaly
    if np.random.random() < 0.6:
        anomaly_type = np.random.choice(["tachycardia", "bradycardia", "arrhythmia", "st_elevation"])
        seg_len = np.random.randint(50, 150)
        start = np.random.randint(50, ECG_LENGTH - seg_len - 50)
        end = start + seg_len
        ecg, labels = inject_anomaly(ecg, labels, anomaly_type, start, end)

    return ecg, labels


def main():
    n_samples = 3000
    all_ecg = []
    all_labels = []

    for i in range(n_samples):
        ecg, labels = generate_ecg_sample()
        all_ecg.append(ecg)
        all_labels.append(labels)
        if (i + 1) % 500 == 0:
            print(f"  Generated {i + 1}/{n_samples} ECG signals")

    ecg_array = np.array(all_ecg)
    labels_array = np.array(all_labels)

    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)

    np.save(os.path.join(data_dir, "ecg_signals.npy"), ecg_array)
    np.save(os.path.join(data_dir, "ecg_labels.npy"), labels_array)

    # Statistics
    total_anomalous = np.sum(labels_array > 0, axis=1)
    signals_with_anomaly = np.sum(total_anomalous > 0)

    print(f"\n✅ ECG dataset saved to {data_dir}/")
    print(f"   Total signals: {n_samples}")
    print(f"   Signal length: {ECG_LENGTH} samples")
    print(f"   Signals with anomalies: {signals_with_anomaly} ({signals_with_anomaly/n_samples:.1%})")
    print(f"   Label classes: 0=normal, 1=tachycardia, 2=bradycardia, 3=arrhythmia, 4=st_elevation")


if __name__ == "__main__":
    main()
