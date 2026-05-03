"""
Vitals Guard AI — Master Training Script
Run this to generate data, train, and test all 8 models sequentially.
Usage: python train_all.py
"""

import subprocess
import sys
import os
import time

ROOT_DIR = "."

MODELS = [
    ("01_health_predictor",    "Core Health Predictor (XGBoost)"),
    ("02_smart_alert",         "Smart Alert System (Random Forest)"),
    ("03_trend_prediction",    "Trend-Based Prediction (LSTM)"),
    ("04_silent_risk_detector", "Silent Risk Detector (IsoForest + XGBoost)"),
    ("05_anomaly_fingerprint", "Health Anomaly Fingerprint (XGBoost)"),
    ("06_ecg_lstm",            "ECG Pattern Detection (LSTM)"),
    ("07_whatif_simulator",    "What-If Health Simulator (XGBoost)"),
    ("08_behavior_health",     "Behavior-Aware Health Prediction (XGBoost)"),
]

STEPS = ["generate_data.py", "train.py", "predict.py"]


def run_step(model_dir, script, model_name, step_name):
    """Run a single step for a model."""
    script_path = os.path.join(ROOT_DIR, model_dir, script)
    if not os.path.exists(script_path):
        print(f"    ❌ {script} not found!")
        return False

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    print(f"    Running {step_name}...")
    result = subprocess.run(
        [sys.executable, script_path],
        capture_output=True,
        text=True,
        cwd=ROOT_DIR,
        env=env,
        encoding="utf-8",
    )

    if result.returncode != 0:
        print(f"    ❌ FAILED: {step_name}")
        print(f"    Error: {result.stderr[:500]}")
        return False

    # Print last few relevant lines
    output_lines = result.stdout.strip().split("\n")
    for line in output_lines[-5:]:
        print(f"      {line}")

    return True


def main():
    print("=" * 70)
    print("  VITALS GUARD AI — Training All Models")
    print("=" * 70)

    total_start = time.time()
    results = {}

    for model_dir, model_name in MODELS:
        print(f"\n{'─' * 70}")
        print(f"  📦 {model_name}")
        print(f"  Folder: {model_dir}/")
        print(f"{'─' * 70}")

        model_start = time.time()
        model_success = True

        for script in STEPS:
            step_name = script.replace(".py", "").replace("_", " ").title()
            success = run_step(model_dir, script, model_name, step_name)
            if not success:
                model_success = False
                break

        elapsed = time.time() - model_start
        status = "✅ SUCCESS" if model_success else "❌ FAILED"
        results[model_name] = {"success": model_success, "time": elapsed}
        print(f"\n  {status} ({elapsed:.1f}s)")

    # Summary
    total_time = time.time() - total_start
    print(f"\n{'=' * 70}")
    print(f"  SUMMARY")
    print(f"{'=' * 70}")

    for name, r in results.items():
        icon = "✅" if r["success"] else "❌"
        print(f"  {icon} {name} ({r['time']:.1f}s)")

    passed = sum(1 for r in results.values() if r["success"])
    print(f"\n  Total: {passed}/{len(results)} models passed")
    print(f"  Total time: {total_time:.1f}s")


if __name__ == "__main__":
    main()
