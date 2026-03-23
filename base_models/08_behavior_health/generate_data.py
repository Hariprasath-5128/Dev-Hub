"""
Model 8: Behavior-Aware Health Prediction — Synthetic Dataset Generation
Generates ~8,000 samples combining vitals with behavioral features (sleep, stress, activity).
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import pandas as pd

np.random.seed(42)

RISK_LEVELS = ["low", "moderate", "high", "critical"]


def generate_samples(n=8000):
    """Generate vitals + behavioral features with adjusted risk levels."""
    records = []

    for _ in range(n):
        # Behavioral features
        sleep_hours   = np.random.uniform(2, 12)     # 2-12 hours
        stress_level  = np.random.uniform(0, 10)     # 0=none, 10=extreme
        activity_level = np.random.uniform(0, 10)    # 0=sedentary, 10=intense

        # Base vitals affected by behavior
        base_hr = 75
        base_spo2 = 97
        base_temp = 36.6
        base_rr = 16
        base_sbp = 120

        # Sleep deprivation effects
        if sleep_hours < 5:
            base_hr += (5 - sleep_hours) * 3
            base_sbp += (5 - sleep_hours) * 4
            base_rr += (5 - sleep_hours) * 0.5

        # Stress effects
        if stress_level > 5:
            base_hr += (stress_level - 5) * 5
            base_sbp += (stress_level - 5) * 6
            base_temp += (stress_level - 5) * 0.1
            base_rr += (stress_level - 5) * 1

        # Activity effects
        if activity_level > 7:
            base_hr += (activity_level - 7) * 8
            base_spo2 -= (activity_level - 7) * 0.5
            base_rr += (activity_level - 7) * 2

        # Add individual variation
        hr   = np.clip(base_hr + np.random.normal(0, 10), 35, 180)
        spo2 = np.clip(base_spo2 + np.random.normal(0, 2), 70, 100)
        temp = np.clip(base_temp + np.random.normal(0, 0.5), 34, 41)
        rr   = np.clip(base_rr + np.random.normal(0, 3), 6, 40)
        sbp  = np.clip(base_sbp + np.random.normal(0, 12), 60, 200)

        # Calculate risk level based on combined features
        risk_score = 0

        # Vital-based risk
        if hr > 100 or hr < 55: risk_score += 2
        if spo2 < 93: risk_score += 3
        if temp > 38 or temp < 35.5: risk_score += 2
        if rr > 22 or rr < 10: risk_score += 1
        if sbp > 150 or sbp < 85: risk_score += 2

        # Behavior-based risk amplification
        if sleep_hours < 4: risk_score += 2
        elif sleep_hours < 6: risk_score += 1

        if stress_level > 7: risk_score += 2
        elif stress_level > 5: risk_score += 1

        if activity_level > 8 and hr > 110: risk_score += 1

        # Combined risk (bad vitals + bad behavior = worse)
        if sleep_hours < 5 and stress_level > 6: risk_score += 1
        if stress_level > 7 and hr > 100: risk_score += 1

        # Map to risk level
        if risk_score <= 2:
            risk_level = "low"
        elif risk_score <= 5:
            risk_level = "moderate"
        elif risk_score <= 8:
            risk_level = "high"
        else:
            risk_level = "critical"

        records.append({
            "heart_rate": round(hr, 1),
            "spo2": round(spo2, 1),
            "temperature": round(temp, 1),
            "respiratory_rate": round(rr, 1),
            "systolic_bp": round(sbp, 1),
            "sleep_hours": round(sleep_hours, 1),
            "stress_level": round(stress_level, 1),
            "activity_level": round(activity_level, 1),
            "risk_level": risk_level,
        })

    return pd.DataFrame(records)


def main():
    df = generate_samples(8000)

    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)
    output_path = os.path.join(data_dir, "behavior_dataset.csv")
    df.to_csv(output_path, index=False)

    print(f"✅ Behavior-Aware dataset saved: {output_path}")
    print(f"   Total samples: {len(df)}")
    print(f"   Features: {[c for c in df.columns if c != 'risk_level']}")
    print(f"   Risk distribution:")
    for level, count in df["risk_level"].value_counts().items():
        print(f"     {level}: {count} ({count/len(df):.1%})")


if __name__ == "__main__":
    main()
