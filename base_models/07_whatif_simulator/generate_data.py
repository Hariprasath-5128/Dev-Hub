"""
Model 7: What-If Health Simulator — Synthetic Dataset Generation
Generates ~5,000 scenarios: initial vitals → time-stepped risk predictions at 2h, 6h, 12h, 24h.
"""

import sys, os
sys.path.insert(0, "..")

import numpy as np
import pandas as pd

np.random.seed(42)

TIME_STEPS = ["2h", "6h", "12h", "24h"]
RISK_LABELS = [
    "No significant risk",
    "Risk of hypotension",
    "Risk of hypertension",
    "Possible fever development",
    "Risk of hypoxia",
    "Risk of tachycardia",
    "Risk of bradycardia",
    "Risk of respiratory distress",
    "Risk of hypothermia",
]


def calculate_risk_progression(hr, spo2, temp, rr, sbp, time_hours):
    """Calculate health risk at a given time horizon based on current vitals."""
    risk_score = 0
    conditions = []

    # Heart Rate risks
    if hr > 100:
        future_hr = hr + (hr - 100) * 0.1 * time_hours
        risk_score += (future_hr - 100) / 50
        if future_hr > 130:
            conditions.append("Risk of tachycardia")
    elif hr < 60:
        future_hr = hr - (60 - hr) * 0.08 * time_hours
        risk_score += (60 - future_hr) / 30
        if future_hr < 50:
            conditions.append("Risk of bradycardia")

    # SpO2 risks
    if spo2 < 95:
        future_spo2 = spo2 - (95 - spo2) * 0.05 * time_hours
        risk_score += (95 - future_spo2) / 20
        if future_spo2 < 90:
            conditions.append("Risk of hypoxia")
        if future_spo2 < 85:
            conditions.append("Risk of respiratory distress")

    # Temperature risks
    if temp > 37.5:
        future_temp = temp + (temp - 37.5) * 0.03 * time_hours
        risk_score += (future_temp - 37.5) / 3
        if future_temp > 38.5:
            conditions.append("Possible fever development")
    elif temp < 36.0:
        future_temp = temp - (36.0 - temp) * 0.02 * time_hours
        risk_score += (36.0 - future_temp) / 4
        if future_temp < 35:
            conditions.append("Risk of hypothermia")

    # BP risks
    if sbp > 140:
        risk_score += (sbp - 140) / 40
        conditions.append("Risk of hypertension")
    elif sbp < 90:
        risk_score += (90 - sbp) / 30
        conditions.append("Risk of hypotension")

    risk_score = np.clip(risk_score, 0, 10) / 10.0  # Normalize to 0-1

    if not conditions:
        conditions.append("No significant risk")

    return risk_score, conditions[0]  # Return primary condition


def main():
    n_scenarios = 5000
    records = []

    for i in range(n_scenarios):
        # Generate initial vitals (some normal, some borderline, some abnormal)
        category = np.random.choice(["normal", "borderline", "abnormal"], p=[0.3, 0.4, 0.3])

        if category == "normal":
            hr   = np.random.uniform(60, 100)
            spo2 = np.random.uniform(95, 100)
            temp = np.random.uniform(36.1, 37.2)
            rr   = np.random.uniform(12, 20)
            sbp  = np.random.uniform(90, 140)
        elif category == "borderline":
            hr   = np.random.uniform(50, 115)
            spo2 = np.random.uniform(92, 98)
            temp = np.random.uniform(35.5, 38.0)
            rr   = np.random.uniform(10, 24)
            sbp  = np.random.uniform(85, 150)
        else:
            hr   = np.random.uniform(35, 160)
            spo2 = np.random.uniform(75, 96)
            temp = np.random.uniform(33, 40)
            rr   = np.random.uniform(6, 35)
            sbp  = np.random.uniform(65, 200)

        record = {
            "heart_rate": round(hr, 1),
            "spo2": round(spo2, 1),
            "temperature": round(temp, 1),
            "respiratory_rate": round(rr, 1),
            "systolic_bp": round(sbp, 1),
        }

        for time_label in TIME_STEPS:
            hours = int(time_label.replace("h", ""))
            risk_score, condition = calculate_risk_progression(hr, spo2, temp, rr, sbp, hours)
            record[f"risk_score_{time_label}"] = round(risk_score, 4)
            record[f"condition_{time_label}"] = condition

        records.append(record)

        if (i + 1) % 1000 == 0:
            print(f"  Generated {i + 1}/{n_scenarios} scenarios")

    df = pd.DataFrame(records)

    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)
    output_path = os.path.join(data_dir, "simulator_dataset.csv")
    df.to_csv(output_path, index=False)

    print(f"\n✅ Simulator dataset saved: {output_path}")
    print(f"   Total scenarios: {len(df)}")
    print(f"   Columns: {list(df.columns)}")

    # Show condition distribution at 24h
    print(f"\n   Condition distribution at 24h:")
    for cond, count in df["condition_24h"].value_counts().items():
        print(f"     {cond}: {count}")


if __name__ == "__main__":
    main()
