"""
Model 5: Health Anomaly Fingerprint — Synthetic Dataset Generation
Generates ~8,000 samples with disease-specific vital sign patterns (fingerprints).
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import pandas as pd

np.random.seed(42)

FEATURES = [
    "heart_rate", "spo2", "temperature", "respiratory_rate",
    "systolic_bp", "diastolic_bp", "hr_variability",
    "spo2_trend", "temp_trend", "rr_trend",
]


def generate_normal(n):
    return pd.DataFrame({
        "heart_rate": np.random.uniform(60, 100, n),
        "spo2": np.random.uniform(95, 100, n),
        "temperature": np.random.uniform(36.1, 37.2, n),
        "respiratory_rate": np.random.uniform(12, 20, n),
        "systolic_bp": np.random.uniform(90, 140, n),
        "diastolic_bp": np.random.uniform(60, 90, n),
        "hr_variability": np.random.uniform(3, 12, n),
        "spo2_trend": np.random.uniform(-0.1, 0.1, n),
        "temp_trend": np.random.uniform(-0.05, 0.05, n),
        "rr_trend": np.random.uniform(-0.5, 0.5, n),
        "disease": "Normal",
    })


def generate_covid_like(n):
    return pd.DataFrame({
        "heart_rate": np.random.uniform(85, 120, n),
        "spo2": np.random.uniform(80, 93, n),         # Key: Low SpO2
        "temperature": np.random.uniform(38.0, 40.0, n),  # Key: High temp
        "respiratory_rate": np.random.uniform(22, 35, n),   # Key: High RR
        "systolic_bp": np.random.uniform(95, 140, n),
        "diastolic_bp": np.random.uniform(60, 90, n),
        "hr_variability": np.random.uniform(5, 15, n),
        "spo2_trend": np.random.uniform(-2.0, -0.3, n),    # Declining SpO2
        "temp_trend": np.random.uniform(0.1, 0.5, n),      # Rising temp
        "rr_trend": np.random.uniform(0.5, 2.0, n),        # Rising RR
        "disease": "COVID_like",
    })


def generate_cardiac(n):
    return pd.DataFrame({
        "heart_rate": np.random.uniform(40, 160, n),        # Key: Irregular HR
        "spo2": np.random.uniform(90, 98, n),
        "temperature": np.random.uniform(36.0, 37.5, n),
        "respiratory_rate": np.random.uniform(16, 28, n),
        "systolic_bp": np.random.uniform(140, 200, n),       # Key: High BP
        "diastolic_bp": np.random.uniform(85, 120, n),
        "hr_variability": np.random.uniform(20, 55, n),      # Key: High HRV
        "spo2_trend": np.random.uniform(-0.5, 0.0, n),
        "temp_trend": np.random.uniform(-0.05, 0.05, n),
        "rr_trend": np.random.uniform(0.0, 1.0, n),
        "disease": "Cardiac",
    })


def generate_sepsis_like(n):
    return pd.DataFrame({
        "heart_rate": np.random.uniform(100, 140, n),        # Key: Tachycardia
        "spo2": np.random.uniform(88, 96, n),
        "temperature": np.random.uniform(38.5, 41.0, n),     # Key: High fever
        "respiratory_rate": np.random.uniform(22, 38, n),     # Key: Tachypnea
        "systolic_bp": np.random.uniform(60, 95, n),          # Key: Hypotension
        "diastolic_bp": np.random.uniform(35, 60, n),
        "hr_variability": np.random.uniform(15, 35, n),
        "spo2_trend": np.random.uniform(-1.5, -0.2, n),
        "temp_trend": np.random.uniform(0.2, 0.8, n),        # Rising temp
        "rr_trend": np.random.uniform(0.5, 2.5, n),          # Rising RR
        "disease": "Sepsis_like",
    })


def generate_respiratory_distress(n):
    return pd.DataFrame({
        "heart_rate": np.random.uniform(90, 130, n),
        "spo2": np.random.uniform(75, 91, n),               # Key: Very low SpO2
        "temperature": np.random.uniform(36.5, 38.0, n),
        "respiratory_rate": np.random.uniform(28, 45, n),    # Key: Very high RR
        "systolic_bp": np.random.uniform(100, 150, n),
        "diastolic_bp": np.random.uniform(65, 95, n),
        "hr_variability": np.random.uniform(8, 20, n),
        "spo2_trend": np.random.uniform(-3.0, -0.5, n),     # Rapidly declining SpO2
        "temp_trend": np.random.uniform(-0.1, 0.1, n),
        "rr_trend": np.random.uniform(1.0, 3.0, n),         # Rapidly rising RR
        "disease": "Respiratory_Distress",
    })


def generate_heat_stroke(n):
    return pd.DataFrame({
        "heart_rate": np.random.uniform(110, 160, n),        # Key: Very high HR
        "spo2": np.random.uniform(88, 96, n),
        "temperature": np.random.uniform(40.0, 42.5, n),     # Key: Very high temp
        "respiratory_rate": np.random.uniform(25, 40, n),
        "systolic_bp": np.random.uniform(70, 100, n),        # Key: Low BP
        "diastolic_bp": np.random.uniform(40, 65, n),
        "hr_variability": np.random.uniform(10, 25, n),
        "spo2_trend": np.random.uniform(-1.0, -0.1, n),
        "temp_trend": np.random.uniform(0.3, 1.0, n),       # Rapidly rising temp
        "rr_trend": np.random.uniform(0.5, 2.0, n),
        "disease": "Heat_Stroke",
    })


def main():
    generators = [
        (generate_normal, 2000),
        (generate_covid_like, 1200),
        (generate_cardiac, 1200),
        (generate_sepsis_like, 1200),
        (generate_respiratory_distress, 1200),
        (generate_heat_stroke, 1200),
    ]

    all_data = []
    for gen_fn, n in generators:
        df = gen_fn(n)
        all_data.append(df)
        print(f"  Generated {n} samples for: {df['disease'].iloc[0]}")

    dataset = pd.concat(all_data, ignore_index=True)
    dataset = dataset.sample(frac=1, random_state=42).reset_index(drop=True)

    # Add noise for realism
    for col in FEATURES:
        noise = np.random.normal(0, 0.02 * dataset[col].std(), len(dataset))
        dataset[col] = dataset[col] + noise

    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)
    output_path = os.path.join(data_dir, "fingerprint_dataset.csv")
    dataset.to_csv(output_path, index=False)

    print(f"\n✅ Fingerprint dataset saved: {output_path}")
    print(f"   Total samples: {len(dataset)}")
    print(f"   Disease distribution:")
    for disease, count in dataset["disease"].value_counts().items():
        print(f"     {disease}: {count}")


if __name__ == "__main__":
    main()
