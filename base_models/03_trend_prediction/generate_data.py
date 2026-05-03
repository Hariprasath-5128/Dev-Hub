"""
Model 3: Trend-Based Prediction — Synthetic Dataset Generation
Generates ~5,000 time-series sequences of vitals with trend labels.
Each sequence has 24 time steps (simulating 24 readings).
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import pandas as pd
import json

np.random.seed(42)

FEATURES = ["heart_rate", "spo2", "temperature", "respiratory_rate"]
TRENDS = ["improving", "stable", "deteriorating"]


def generate_sequence(trend, seq_len=24):
    """Generate a single time-series sequence with a given trend."""
    seq = np.zeros((seq_len, len(FEATURES)))

    # Base values
    base_hr   = np.random.uniform(60, 100)
    base_spo2 = np.random.uniform(94, 100)
    base_temp = np.random.uniform(36.0, 37.5)
    base_rr   = np.random.uniform(12, 22)

    for t in range(seq_len):
        progress = t / seq_len

        if trend == "deteriorating":
            hr_shift   = progress * np.random.uniform(15, 50)
            spo2_shift = -progress * np.random.uniform(3, 15)
            temp_shift = progress * np.random.uniform(0.5, 3.0)
            rr_shift   = progress * np.random.uniform(3, 12)
        elif trend == "improving":
            hr_shift   = -progress * np.random.uniform(5, 20)
            spo2_shift = progress * np.random.uniform(1, 5)
            temp_shift = -progress * np.random.uniform(0.3, 1.5)
            rr_shift   = -progress * np.random.uniform(2, 6)
        else:  # stable
            hr_shift   = np.random.uniform(-3, 3)
            spo2_shift = np.random.uniform(-0.5, 0.5)
            temp_shift = np.random.uniform(-0.2, 0.2)
            rr_shift   = np.random.uniform(-1, 1)

        noise = np.random.normal(0, 1, 4) * [2, 0.3, 0.1, 0.5]

        seq[t, 0] = np.clip(base_hr + hr_shift + noise[0], 30, 200)
        seq[t, 1] = np.clip(base_spo2 + spo2_shift + noise[1], 60, 100)
        seq[t, 2] = np.clip(base_temp + temp_shift + noise[2], 28, 42)
        seq[t, 3] = np.clip(base_rr + rr_shift + noise[3], 5, 45)

    return seq


def main():
    n_sequences = 5000
    sequences = []
    labels = []
    next_values = []

    for i in range(n_sequences):
        trend = np.random.choice(TRENDS, p=[0.3, 0.4, 0.3])
        seq = generate_sequence(trend, seq_len=24)

        # Generate the "next" value as the prediction target
        next_seq = generate_sequence(trend, seq_len=25)
        next_val = next_seq[-1]

        sequences.append(seq)
        labels.append(trend)
        next_values.append(next_val)

        if (i + 1) % 1000 == 0:
            print(f"  Generated {i + 1}/{n_sequences} sequences")

    sequences = np.array(sequences)
    next_values = np.array(next_values)

    # Save as numpy arrays
    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)

    np.save(os.path.join(data_dir, "sequences.npy"), sequences)
    np.save(os.path.join(data_dir, "next_values.npy"), next_values)

    # Save labels as JSON
    with open(os.path.join(data_dir, "trend_labels.json"), "w") as f:
        json.dump(labels, f)

    print(f"\n✅ Trend dataset saved to {data_dir}/")
    print(f"   Sequences shape: {sequences.shape}")
    print(f"   Features: {FEATURES}")
    print(f"   Trend distribution:")
    for trend in TRENDS:
        count = labels.count(trend)
        print(f"     {trend}: {count} ({count/len(labels):.1%})")


if __name__ == "__main__":
    main()
