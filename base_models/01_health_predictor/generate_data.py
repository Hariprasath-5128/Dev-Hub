"""
Model 1: Core Health Predictor — Synthetic Dataset Generation
Generates ~10,000 samples of vital signs mapped to health conditions.
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import pandas as pd
from shared.utils import add_noise

np.random.seed(42)

def generate_condition_samples(condition, n):
    """Generate vital sign samples for a specific health condition."""
    data = {}

    if condition == "Normal":
        data["heart_rate"]       = np.random.uniform(60, 100, n)
        data["spo2"]             = np.random.uniform(95, 100, n)
        data["temperature"]      = np.random.uniform(36.1, 37.2, n)
        data["respiratory_rate"] = np.random.uniform(12, 20, n)
        data["systolic_bp"]      = np.random.uniform(90, 140, n)
        data["diastolic_bp"]     = np.random.uniform(60, 90, n)

    elif condition == "Hypertension":
        data["heart_rate"]       = np.random.uniform(70, 110, n)
        data["spo2"]             = np.random.uniform(94, 100, n)
        data["temperature"]      = np.random.uniform(36.0, 37.5, n)
        data["respiratory_rate"] = np.random.uniform(14, 22, n)
        data["systolic_bp"]      = np.random.uniform(150, 200, n)
        data["diastolic_bp"]     = np.random.uniform(95, 130, n)

    elif condition == "Hypotension":
        data["heart_rate"]       = np.random.uniform(50, 90, n)
        data["spo2"]             = np.random.uniform(93, 99, n)
        data["temperature"]      = np.random.uniform(35.5, 37.0, n)
        data["respiratory_rate"] = np.random.uniform(10, 18, n)
        data["systolic_bp"]      = np.random.uniform(60, 88, n)
        data["diastolic_bp"]     = np.random.uniform(40, 58, n)

    elif condition == "Tachycardia":
        data["heart_rate"]       = np.random.uniform(120, 180, n)
        data["spo2"]             = np.random.uniform(93, 99, n)
        data["temperature"]      = np.random.uniform(36.0, 37.8, n)
        data["respiratory_rate"] = np.random.uniform(16, 28, n)
        data["systolic_bp"]      = np.random.uniform(100, 160, n)
        data["diastolic_bp"]     = np.random.uniform(65, 95, n)

    elif condition == "Bradycardia":
        data["heart_rate"]       = np.random.uniform(30, 55, n)
        data["spo2"]             = np.random.uniform(92, 99, n)
        data["temperature"]      = np.random.uniform(35.5, 37.0, n)
        data["respiratory_rate"] = np.random.uniform(10, 16, n)
        data["systolic_bp"]      = np.random.uniform(85, 130, n)
        data["diastolic_bp"]     = np.random.uniform(55, 85, n)

    elif condition == "Hypoxia":
        data["heart_rate"]       = np.random.uniform(80, 130, n)
        data["spo2"]             = np.random.uniform(70, 92, n)
        data["temperature"]      = np.random.uniform(36.0, 37.5, n)
        data["respiratory_rate"] = np.random.uniform(22, 35, n)
        data["systolic_bp"]      = np.random.uniform(95, 150, n)
        data["diastolic_bp"]     = np.random.uniform(60, 95, n)

    elif condition == "Fever":
        data["heart_rate"]       = np.random.uniform(80, 120, n)
        data["spo2"]             = np.random.uniform(94, 99, n)
        data["temperature"]      = np.random.uniform(38.5, 41.0, n)
        data["respiratory_rate"] = np.random.uniform(16, 26, n)
        data["systolic_bp"]      = np.random.uniform(90, 140, n)
        data["diastolic_bp"]     = np.random.uniform(60, 90, n)

    elif condition == "Hypothermia":
        data["heart_rate"]       = np.random.uniform(40, 70, n)
        data["spo2"]             = np.random.uniform(90, 97, n)
        data["temperature"]      = np.random.uniform(28.0, 35.0, n)
        data["respiratory_rate"] = np.random.uniform(8, 14, n)
        data["systolic_bp"]      = np.random.uniform(80, 120, n)
        data["diastolic_bp"]     = np.random.uniform(50, 80, n)

    elif condition == "Cardiac_Arrhythmia":
        data["heart_rate"]       = np.random.uniform(40, 160, n)
        data["spo2"]             = np.random.uniform(88, 98, n)
        data["temperature"]      = np.random.uniform(36.0, 37.5, n)
        data["respiratory_rate"] = np.random.uniform(14, 28, n)
        data["systolic_bp"]      = np.random.uniform(85, 170, n)
        data["diastolic_bp"]     = np.random.uniform(55, 100, n)
        # Add HR variability feature (high for arrhythmia)
        data["hr_variability"]   = np.random.uniform(20, 60, n)

    elif condition == "Respiratory_Distress":
        data["heart_rate"]       = np.random.uniform(90, 140, n)
        data["spo2"]             = np.random.uniform(75, 92, n)
        data["temperature"]      = np.random.uniform(36.5, 38.5, n)
        data["respiratory_rate"] = np.random.uniform(25, 40, n)
        data["systolic_bp"]      = np.random.uniform(95, 155, n)
        data["diastolic_bp"]     = np.random.uniform(60, 95, n)

    # Add HR variability if not already set
    if "hr_variability" not in data:
        data["hr_variability"] = np.random.uniform(2, 15, n)

    # Add noise for realism
    for key in data:
        data[key] = add_noise(data[key], noise_level=0.03)

    data["condition"] = [condition] * n
    return pd.DataFrame(data)


def main():
    conditions = [
        "Normal", "Hypertension", "Hypotension", "Tachycardia",
        "Bradycardia", "Hypoxia", "Fever", "Hypothermia",
        "Cardiac_Arrhythmia", "Respiratory_Distress"
    ]
    samples_per_condition = 1000
    all_data = []

    for condition in conditions:
        df = generate_condition_samples(condition, samples_per_condition)
        all_data.append(df)
        print(f"  Generated {samples_per_condition} samples for: {condition}")

    dataset = pd.concat(all_data, ignore_index=True)
    dataset = dataset.sample(frac=1, random_state=42).reset_index(drop=True)

    os.makedirs("data", exist_ok=True)
    output_path = "01_health_predictor/data/vitals_dataset.csv"
    dataset.to_csv(output_path, index=False)
    print(f"\n✅ Dataset saved: {output_path}")
    print(f"   Total samples: {len(dataset)}")
    print(f"   Features: {[c for c in dataset.columns if c != 'condition']}")
    print(f"   Conditions: {dataset['condition'].nunique()}")


if __name__ == "__main__":
    main()
