"""
Vitals Guard AI — Comprehensive Dashboard Predictor
Evaluates a patient's vitals across all 8 AI models to generate a unified health report.
This acts as the backend controller for the "Digital Twin" dashboard.
"""

import sys
import os
import json
import numpy as np

# Import predict functions from all 8 models
try:
    
    # 01 Health Predictor
    from importlib import import_module
    m_01 = import_module("01_health_predictor.predict")
    
    # 02 Smart Alert
    m_02 = import_module("02_smart_alert.predict")
    
    # 03 Trend Predictor
    m_03 = import_module("03_trend_prediction.predict")
    
    # 04 Silent Risk Detector
    m_04 = import_module("04_silent_risk_detector.predict")
    
    # 05 Anomaly Fingerprint
    m_05 = import_module("05_anomaly_fingerprint.predict")
    
    # 06 ECG Pattern Detection
    m_06 = import_module("06_ecg_lstm.predict")
    
    # 07 What-If Simulator
    m_07 = import_module("07_whatif_simulator.predict")
    
    # 08 Behavior-Aware Prediction
    m_08 = import_module("08_behavior_health.predict")

except ImportError as e:
    print(f"Error loading models. Are they trained? Details: {e}")
    sys.exit(1)

from shared.utils import generate_ecg_wave

def evaluate_patient(patient_data):
    """
    Run the patient data through all 8 models and compile a multi-agent consensus report.
    """
    print("\n" + "="*80)
    print(f"  🩺 ANALYZING PATIENT: {patient_data.get('name', 'Unknown')}")
    print("="*80)
    
    vitals = patient_data["vitals"]
    vitals_sequence = patient_data.get("vitals_sequence", [vitals]*24) # Fallback if seq is missing
    ecg_signal = patient_data.get("ecg_signal", np.zeros(500))         # Fallback

    print(f"[CURRENT VITALS] HR: {vitals['heart_rate']} | SpO2: {vitals['spo2']}% | Temp: {vitals['temperature']}°C | RR: {vitals['respiratory_rate']} | BP: {vitals['systolic_bp']}/{vitals['diastolic_bp']}\n")

    # 1. Core Health Prediction
    print("▶ MODEL 1: Core Health Condition")
    res_1 = m_01.predict_condition(vitals)
    print(f"  Predicted Condition: {res_1['predicted_condition']} (Confidence: {res_1['confidence']:.1%})")

    # 2. Smart Alert System
    print("\n▶ MODEL 2: Smart Alert & Emergency Triage")
    res_2 = m_02.predict_alert(vitals)
    severity = res_2['severity'].upper()
    color = "🔴" if severity == "CRITICAL" else "🟡" if severity == "WARNING" else "🟢"
    print(f"  Severity Level: {color} {severity}")
    print(f"  Action Required: {res_2['action']}")

    # 3. Trend Prediction
    print("\n▶ MODEL 3: Trend-Based Forecasting")
    res_3 = m_03.predict_trend(vitals_sequence)
    trend_arrow = "📈" if res_3['trend'] == "deteriorating" else "📉" if res_3['trend'] == "improving" else "➡️"
    print(f"  Predicted Trend: {trend_arrow} {res_3['trend'].capitalize()} ({res_3['confidence']:.1%})")

    # 4. Silent Risk Detector
    print("\n▶ MODEL 4: Silent Risk Detector (Hidden Pattern Finder)")
    res_4 = m_04.detect_silent_risk(vitals)
    print(f"  Risk Score: {res_4['risk_score']:.2f}/1.00")
    print(f"  Insight: {res_4['description']}")

    # 5. Health Anomaly Fingerprint
    print("\n▶ MODEL 5: Disease Signature Fingerprint")
    res_5 = m_05.match_fingerprint(vitals)
    print(f"  {res_5['description']}")
    matches_str = ', '.join([f"{m['disease']} ({m['similarity']:.0%})" for m in res_5['top_3_matches']])
    print(f"  Matches: {matches_str}")

    # 6. ECG LSTM
    print("\n▶ MODEL 6: Real-time ECG Pattern Analysis")
    res_6 = m_06.detect_ecg_anomalies(ecg_signal)
    print(f"  Result: {res_6['summary']}")

    # 7. What-If Health Simulator
    print("\n▶ MODEL 7: 24-Hour Risk Progression Simulator")
    res_7 = m_07.simulate_whatif(vitals)
    print("  Progression Timeline:")
    for ts in ["2h", "6h", "12h", "24h"]:
        print(f"    - {ts:3} > Risk [{res_7[ts]['risk_level']}] : {res_7[ts]['condition']}")

    # 8. Behavior-Aware Health Prediction
    print("\n▶ MODEL 8: Behavior-Aware Health Prediction")
    res_8 = m_08.predict_behavior_risk(vitals)
    print(f"  Behavior Risk: {res_8['risk_level'].upper()}")
    for rec in res_8['behavioral_insights']:
        print(f"  - {rec}")

    print("\n" + "="*80)

if __name__ == "__main__":
    # Generate some ECG signals for the tests
    _, normal_ecg = generate_ecg_wave(duration_sec=2.0, sampling_rate=250, heart_rate=72)
    _, abnormal_ecg = generate_ecg_wave(duration_sec=2.0, sampling_rate=250, heart_rate=135)
    # Inject anomaly for testing
    for i in range(200, 250): abnormal_ecg[i] += np.random.uniform(0.5, 1.5) * np.sin(i * 0.5)

    test_cases = [
        {
            "name": "Patient A (The 'Silent Risk' Case - Vitals Normal, but Pattern Dangerous)",
            "vitals": {
                "heart_rate": 78, "spo2": 97, "temperature": 36.8, "respiratory_rate": 17, 
                "systolic_bp": 128, "diastolic_bp": 80, "hr_variability": 35, 
                "spo2_variability": 1.5, "hr_spo2_corr": 0.7, "rr_irregularity": 0.25, 
                "bp_pulse_pressure": 48, "sleep_hours": 6, "stress_level": 8, "activity_level": 3
            },
            # Generate stable past sequence
            "vitals_sequence": [{"heart_rate": 75, "spo2": 97, "temperature": 36.8, "respiratory_rate": 17} for _ in range(24)],
            "ecg_signal": normal_ecg
        },
        {
            "name": "Patient B (Critical COVID/Respiratory Distress)",
            "vitals": {
                "heart_rate": 120, "spo2": 85, "temperature": 39.5, "respiratory_rate": 32, 
                "systolic_bp": 95, "diastolic_bp": 60, "hr_variability": 15, 
                "spo2_variability": 2.5, "hr_spo2_corr": 0.3, "rr_irregularity": 0.15, 
                "bp_pulse_pressure": 35, "sleep_hours": 3, "stress_level": 9, "activity_level": 0,
                "spo2_trend": -1.5, "temp_trend": 0.5, "rr_trend": 1.5
            },
            # Generate deteriorating sequence
            "vitals_sequence": [{"heart_rate": 90+i, "spo2": 95-(i*0.4), "temperature": 37.5+(i*0.1), "respiratory_rate": 20+(i*0.5)} for i in range(24)],
            "ecg_signal": abnormal_ecg
        }
    ]

    for patient in test_cases:
        evaluate_patient(patient)
