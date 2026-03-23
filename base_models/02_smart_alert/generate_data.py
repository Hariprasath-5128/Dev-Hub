"""
Model 2: Smart Alert System — Synthetic Dataset Generation
Generates ~8,000 samples with vitals mapped to early warning scores (stable/warning/critical).
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import pandas as pd
from shared.utils import calculate_ews, ews_to_severity, add_noise

np.random.seed(42)


def generate_alert_dataset(n=8000):
    """Generate vitals dataset with EWS-based severity labels."""
    records = []

    for _ in range(n):
        # Randomly generate vitals across full spectrum
        hr   = np.random.uniform(30, 180)
        spo2 = np.random.uniform(70, 100)
        temp = np.random.uniform(28, 42)
        rr   = np.random.uniform(5, 40)
        sbp  = np.random.uniform(60, 230)
        dbp  = np.random.uniform(35, 130)

        # Calculate EWS score and severity
        ews = calculate_ews(hr, spo2, temp, rr, sbp)
        severity = ews_to_severity(ews)

        records.append({
            "heart_rate": round(hr, 1),
            "spo2": round(spo2, 1),
            "temperature": round(temp, 1),
            "respiratory_rate": round(rr, 1),
            "systolic_bp": round(sbp, 1),
            "diastolic_bp": round(dbp, 1),
            "ews_score": ews,
            "severity": severity,
        })

    df = pd.DataFrame(records)

    # Ensure minimum representation of critical cases
    critical_count = (df["severity"] == "critical").sum()
    if critical_count < n * 0.15:
        extra_critical = generate_critical_samples(int(n * 0.15) - critical_count)
        df = pd.concat([df, extra_critical], ignore_index=True)

    return df.sample(frac=1, random_state=42).reset_index(drop=True)


def generate_critical_samples(n):
    """Generate explicitly critical vital sign combinations."""
    records = []
    for _ in range(n):
        hr   = np.random.choice([np.random.uniform(30, 40), np.random.uniform(140, 180)])
        spo2 = np.random.uniform(70, 88)
        temp = np.random.choice([np.random.uniform(28, 34), np.random.uniform(40, 42)])
        rr   = np.random.choice([np.random.uniform(5, 8), np.random.uniform(30, 40)])
        sbp  = np.random.choice([np.random.uniform(60, 85), np.random.uniform(200, 230)])
        dbp  = np.random.uniform(35, 130)

        ews = calculate_ews(hr, spo2, temp, rr, sbp)
        records.append({
            "heart_rate": round(hr, 1), "spo2": round(spo2, 1),
            "temperature": round(temp, 1), "respiratory_rate": round(rr, 1),
            "systolic_bp": round(sbp, 1), "diastolic_bp": round(dbp, 1),
            "ews_score": ews, "severity": "critical",
        })
    return pd.DataFrame(records)


def main():
    df = generate_alert_dataset(8000)

    os.makedirs("data", exist_ok=True)
    output_path = "02_smart_alert/data/alert_dataset.csv"
    df.to_csv(output_path, index=False)

    print(f"✅ Smart Alert dataset saved: {output_path}")
    print(f"   Total samples: {len(df)}")
    print(f"   Severity distribution:")
    for sev, count in df["severity"].value_counts().items():
        print(f"     {sev}: {count} ({count/len(df):.1%})")


if __name__ == "__main__":
    main()
