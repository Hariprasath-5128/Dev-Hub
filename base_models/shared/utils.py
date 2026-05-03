"""
Vitals Guard AI — Shared Utilities
Common constants, vital ranges, and helper functions used across all models.
"""

import numpy as np
import pandas as pd

# ──────────────────────────────────────────────
#  Normal Vital Ranges
# ──────────────────────────────────────────────
VITAL_RANGES = {
    "heart_rate":       {"min": 60,   "max": 100,  "unit": "bpm"},
    "spo2":             {"min": 95,   "max": 100,  "unit": "%"},
    "temperature":      {"min": 36.1, "max": 37.2, "unit": "°C"},
    "respiratory_rate": {"min": 12,   "max": 20,   "unit": "breaths/min"},
    "systolic_bp":      {"min": 90,   "max": 140,  "unit": "mmHg"},
    "diastolic_bp":     {"min": 60,   "max": 90,   "unit": "mmHg"},
    "rr_interval":      {"min": 0.6,  "max": 1.0,  "unit": "seconds"},
}

# ──────────────────────────────────────────────
#  Condition Labels
# ──────────────────────────────────────────────
HEALTH_CONDITIONS = [
    "Normal",
    "Hypertension",
    "Hypotension",
    "Tachycardia",
    "Bradycardia",
    "Hypoxia",
    "Fever",
    "Hypothermia",
    "Cardiac_Arrhythmia",
    "Respiratory_Distress",
]

SEVERITY_LEVELS = ["stable", "warning", "critical"]

DISEASE_FINGERPRINTS = {
    "COVID_like":           {"spo2": "low",  "temp": "high", "rr": "high", "hr": "high"},
    "Cardiac":              {"hr": "irregular", "rr_interval": "irregular", "bp": "high"},
    "Sepsis_like":          {"temp": "high", "hr": "high", "bp": "low", "rr": "high"},
    "Respiratory_Distress": {"spo2": "low",  "rr": "high",  "hr": "high"},
    "Heat_Stroke":          {"temp": "very_high", "hr": "high", "bp": "low", "spo2": "low"},
}

BEHAVIORAL_FEATURES = ["sleep_hours", "stress_level", "activity_level"]

# ──────────────────────────────────────────────
#  Helper Functions
# ──────────────────────────────────────────────

def add_noise(values, noise_level=0.02):
    """Add Gaussian noise to an array of values."""
    noise = np.random.normal(0, noise_level * np.std(values), size=len(values))
    return values + noise


def normalize_vitals(df, columns=None):
    """Min-max normalize specified columns in a DataFrame."""
    if columns is None:
        columns = df.select_dtypes(include=[np.number]).columns.tolist()
    df_normalized = df.copy()
    for col in columns:
        col_min = df[col].min()
        col_max = df[col].max()
        if col_max - col_min > 0:
            df_normalized[col] = (df[col] - col_min) / (col_max - col_min)
        else:
            df_normalized[col] = 0.0
    return df_normalized


def generate_normal_vitals(n=1):
    """Generate n samples of normal vital signs."""
    return {
        "heart_rate":       np.random.uniform(60, 100, n),
        "spo2":             np.random.uniform(95, 100, n),
        "temperature":      np.random.uniform(36.1, 37.2, n),
        "respiratory_rate": np.random.uniform(12, 20, n),
        "systolic_bp":      np.random.uniform(90, 140, n),
        "diastolic_bp":     np.random.uniform(60, 90, n),
    }


def generate_ecg_wave(duration_sec=2.0, sampling_rate=250, heart_rate=72, noise_level=0.05):
    """
    Generate a synthetic ECG-like signal using a simplified PQRST model.
    Returns (time_array, ecg_signal).
    """
    t = np.linspace(0, duration_sec, int(duration_sec * sampling_rate), endpoint=False)
    ecg = np.zeros_like(t)
    beat_interval = 60.0 / heart_rate
    num_beats = int(duration_sec / beat_interval) + 1

    for i in range(num_beats):
        beat_start = i * beat_interval
        # P wave
        p_center = beat_start + 0.1
        ecg += 0.15 * np.exp(-((t - p_center) ** 2) / (2 * 0.01 ** 2))
        # QRS complex
        q_center = beat_start + 0.2
        ecg -= 0.1 * np.exp(-((t - q_center) ** 2) / (2 * 0.005 ** 2))
        r_center = beat_start + 0.22
        ecg += 1.0 * np.exp(-((t - r_center) ** 2) / (2 * 0.005 ** 2))
        s_center = beat_start + 0.24
        ecg -= 0.15 * np.exp(-((t - s_center) ** 2) / (2 * 0.005 ** 2))
        # T wave
        t_center = beat_start + 0.4
        ecg += 0.3 * np.exp(-((t - t_center) ** 2) / (2 * 0.02 ** 2))

    ecg += np.random.normal(0, noise_level, len(ecg))
    return t, ecg


def calculate_ews(hr, spo2, temp, rr, systolic_bp):
    """
    Calculate a simplified Early Warning Score (inspired by NEWS2).
    Returns integer score (0 = best, higher = worse).
    """
    score = 0

    # Heart Rate scoring
    if hr <= 40 or hr >= 131:
        score += 3
    elif hr <= 50 or (hr >= 111 and hr <= 130):
        score += 2
    elif (hr >= 91 and hr <= 110):
        score += 1

    # SpO2 scoring
    if spo2 <= 91:
        score += 3
    elif spo2 <= 93:
        score += 2
    elif spo2 <= 95:
        score += 1

    # Temperature scoring
    if temp <= 35.0:
        score += 3
    elif temp <= 36.0 or temp >= 39.1:
        score += 2
    elif (temp >= 38.1 and temp <= 39.0):
        score += 1

    # Respiratory Rate scoring
    if rr <= 8 or rr >= 25:
        score += 3
    elif rr >= 21 and rr <= 24:
        score += 2
    elif rr >= 9 and rr <= 11:
        score += 1

    # Systolic BP scoring
    if systolic_bp <= 90 or systolic_bp >= 220:
        score += 3
    elif systolic_bp <= 100 or (systolic_bp >= 180 and systolic_bp <= 219):
        score += 2
    elif systolic_bp <= 110:
        score += 1

    return score


def ews_to_severity(ews_score):
    """Convert EWS score to severity level."""
    if ews_score <= 4:
        return "stable"
    elif ews_score <= 8:
        return "warning"
    else:
        return "critical"


def get_project_root():
    """Get the project root directory."""
    return "."
