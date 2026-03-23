"""
Model 4: Silent Risk Detector — Synthetic Dataset Generation
Generates ~6,000 samples where individual vitals appear normal but cross-feature patterns indicate danger.
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import pandas as pd

np.random.seed(42)


def generate_truly_normal(n):
    """Generate genuinely healthy vital patterns."""
    return pd.DataFrame({
        "heart_rate":       np.random.uniform(62, 95, n),
        "spo2":             np.random.uniform(96, 100, n),
        "temperature":      np.random.uniform(36.2, 37.0, n),
        "respiratory_rate": np.random.uniform(13, 19, n),
        "systolic_bp":      np.random.uniform(100, 135, n),
        "diastolic_bp":     np.random.uniform(65, 85, n),
        # Derived features for hidden pattern detection
        "hr_variability":   np.random.uniform(3, 10, n),
        "spo2_variability": np.random.uniform(0.1, 0.5, n),
        "hr_spo2_corr":     np.random.uniform(-0.2, 0.2, n),   # Low correlation = normal
        "temp_trend_slope": np.random.uniform(-0.02, 0.02, n),  # Flat = normal
        "rr_irregularity":  np.random.uniform(0.01, 0.08, n),   # Low = normal
        "bp_pulse_pressure": np.random.uniform(30, 50, n),      # Normal range
        "risk_label": 0,
        "risk_type": "truly_normal",
    })


def generate_hidden_cardiac_risk(n):
    """Vitals look normal individually, but HR variability + rhythm pattern indicates early arrhythmia."""
    return pd.DataFrame({
        "heart_rate":       np.random.uniform(65, 95, n),       # Normal range
        "spo2":             np.random.uniform(95, 99, n),       # Normal range
        "temperature":      np.random.uniform(36.3, 37.1, n),  # Normal range
        "respiratory_rate": np.random.uniform(14, 20, n),      # Normal range
        "systolic_bp":      np.random.uniform(105, 140, n),
        "diastolic_bp":     np.random.uniform(68, 88, n),
        # Hidden danger signals
        "hr_variability":   np.random.uniform(18, 45, n),       # Abnormally HIGH
        "spo2_variability": np.random.uniform(0.8, 2.5, n),     # Micro-drops
        "hr_spo2_corr":     np.random.uniform(0.5, 0.9, n),     # Strong negative correlation
        "temp_trend_slope": np.random.uniform(-0.01, 0.01, n),
        "rr_irregularity":  np.random.uniform(0.15, 0.4, n),    # Irregular rhythm
        "bp_pulse_pressure": np.random.uniform(25, 45, n),
        "risk_label": 1,
        "risk_type": "hidden_cardiac_risk",
    })


def generate_hidden_respiratory_risk(n):
    """SpO2 normal on average but micro-fluctuation pattern indicates early respiratory distress."""
    return pd.DataFrame({
        "heart_rate":       np.random.uniform(70, 98, n),
        "spo2":             np.random.uniform(95, 99, n),       # Looks normal
        "temperature":      np.random.uniform(36.5, 37.3, n),
        "respiratory_rate": np.random.uniform(15, 21, n),       # Upper normal
        "systolic_bp":      np.random.uniform(100, 138, n),
        "diastolic_bp":     np.random.uniform(65, 86, n),
        # Hidden danger signals
        "hr_variability":   np.random.uniform(8, 18, n),
        "spo2_variability": np.random.uniform(1.5, 4.0, n),     # High SpO2 variability
        "hr_spo2_corr":     np.random.uniform(0.4, 0.85, n),    # Correlated drops
        "temp_trend_slope": np.random.uniform(0.02, 0.08, n),   # Slight upward trend
        "rr_irregularity":  np.random.uniform(0.1, 0.3, n),
        "bp_pulse_pressure": np.random.uniform(20, 35, n),      # Narrowing pulse pressure
        "risk_label": 1,
        "risk_type": "hidden_respiratory_risk",
    })


def generate_hidden_stress_risk(n):
    """All vitals individually normal but pattern shows early autonomic stress response."""
    return pd.DataFrame({
        "heart_rate":       np.random.uniform(75, 98, n),       # Upper normal
        "spo2":             np.random.uniform(96, 100, n),
        "temperature":      np.random.uniform(36.0, 36.8, n),   # Lower normal
        "respiratory_rate": np.random.uniform(16, 22, n),       # Upper normal
        "systolic_bp":      np.random.uniform(125, 145, n),     # Upper normal / borderline
        "diastolic_bp":     np.random.uniform(78, 92, n),
        # Hidden danger signals
        "hr_variability":   np.random.uniform(2, 5, n),          # Abnormally LOW (stress indicator!)
        "spo2_variability": np.random.uniform(0.2, 0.6, n),
        "hr_spo2_corr":     np.random.uniform(-0.1, 0.1, n),
        "temp_trend_slope": np.random.uniform(-0.05, -0.01, n), # Slight cooling (stress)
        "rr_irregularity":  np.random.uniform(0.02, 0.06, n),
        "bp_pulse_pressure": np.random.uniform(42, 65, n),      # Widening pulse pressure
        "risk_label": 1,
        "risk_type": "hidden_stress_risk",
    })


def main():
    normal   = generate_truly_normal(3000)
    cardiac  = generate_hidden_cardiac_risk(1000)
    resp     = generate_hidden_respiratory_risk(1000)
    stress   = generate_hidden_stress_risk(1000)

    df = pd.concat([normal, cardiac, resp, stress], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)
    output_path = os.path.join(data_dir, "silent_risk_dataset.csv")
    df.to_csv(output_path, index=False)

    print(f"✅ Silent Risk dataset saved: {output_path}")
    print(f"   Total samples: {len(df)}")
    print(f"   Normal: {(df['risk_label'] == 0).sum()}")
    print(f"   Hidden risk: {(df['risk_label'] == 1).sum()}")
    print(f"   Risk type distribution:")
    for rt, count in df["risk_type"].value_counts().items():
        print(f"     {rt}: {count}")


if __name__ == "__main__":
    main()
