"""
Model 7: What-If Health Simulator — Training Script
Trains per-time-step models: risk score regression + condition classification.
"""

import sys, os
sys.path.insert(0, "..")

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, accuracy_score, classification_report
from xgboost import XGBRegressor, XGBClassifier

TIME_STEPS = ["2h", "6h", "12h", "24h"]


def main():
    data_path = "07_whatif_simulator/data/simulator_dataset.csv"
    if not os.path.exists(data_path):
        print("❌ Dataset not found. Run generate_data.py first.")
        return

    df = pd.read_csv(data_path)
    print(f"Loaded dataset: {df.shape[0]} samples")

    feature_cols = ["heart_rate", "spo2", "temperature", "respiratory_rate", "systolic_bp"]
    X = df[feature_cols].values

    model_dir = "07_whatif_simulator/model"
    os.makedirs(model_dir, exist_ok=True)

    # Train a separate model for each time step
    all_encoders = {}

    for ts in TIME_STEPS:
        print(f"\n{'='*50}")
        print(f"  Training models for time step: {ts}")
        print(f"{'='*50}")

        # ── Risk Score Regression ──
        y_risk = df[f"risk_score_{ts}"].values
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_risk, test_size=0.2, random_state=42
        )

        risk_model = XGBRegressor(
            n_estimators=150, max_depth=5, learning_rate=0.1, random_state=42
        )
        risk_model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=True)

        y_pred_risk = risk_model.predict(X_test)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred_risk))
        print(f"  Risk Score RMSE: {rmse:.4f}")

        # ── Condition Classification ──
        y_cond = df[f"condition_{ts}"].values
        le = LabelEncoder()
        y_cond_enc = le.fit_transform(y_cond)

        X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
            X, y_cond_enc, test_size=0.2, random_state=42, stratify=y_cond_enc
        )

        cond_model = XGBClassifier(
            n_estimators=150, max_depth=5, learning_rate=0.1,
            random_state=42, eval_metric="mlogloss", use_label_encoder=False,
        )
        cond_model.fit(X_train_c, y_train_c, eval_set=[(X_test_c, y_test_c)], verbose=True)

        y_pred_cond = cond_model.predict(X_test_c)
        acc = accuracy_score(y_test_c, y_pred_cond)
        print(f"  Condition Accuracy: {acc:.4f}")

        # Save models for this time step
        joblib.dump(risk_model, os.path.join(model_dir, f"risk_regressor_{ts}.pkl"))
        joblib.dump(cond_model, os.path.join(model_dir, f"condition_classifier_{ts}.pkl"))
        joblib.dump(le, os.path.join(model_dir, f"condition_encoder_{ts}.pkl"))

        all_encoders[ts] = le

    joblib.dump(feature_cols, os.path.join(model_dir, "feature_columns.pkl"))
    print(f"\n✅ All models saved to {model_dir}/")


if __name__ == "__main__":
    main()
