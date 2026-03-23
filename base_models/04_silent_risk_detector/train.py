"""
Model 4: Silent Risk Detector — Training Script
Trains Isolation Forest (anomaly detection) + XGBoost (risk type classification).
"""

import sys, os
sys.path.insert(0, "..")

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
from xgboost import XGBClassifier


def main():
    data_path = "04_silent_risk_detector/data/silent_risk_dataset.csv"
    if not os.path.exists(data_path):
        print("❌ Dataset not found. Run generate_data.py first.")
        return

    df = pd.read_csv(data_path)
    print(f"Loaded dataset: {df.shape[0]} samples")

    feature_cols = [c for c in df.columns if c not in ["risk_label", "risk_type"]]
    X = df[feature_cols].values
    y_binary = df["risk_label"].values
    y_type = df["risk_type"].values

    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ──── Part A: Isolation Forest (unsupervised anomaly detection) ────
    print("\n--- Training Isolation Forest (Anomaly Detection) ---")
    iso_forest = IsolationForest(
        n_estimators=200,
        contamination=0.5,  # ~50% are hidden risks in our dataset
        random_state=42,
        n_jobs=-1,
    )
    iso_forest.fit(X_scaled)

    # Anomaly scores (-1 = anomaly, 1 = normal)
    iso_predictions = iso_forest.predict(X_scaled)
    iso_scores = iso_forest.decision_function(X_scaled)

    # Map: -1 → 1 (risk), 1 → 0 (normal) for comparison
    iso_binary = (iso_predictions == -1).astype(int)
    iso_acc = accuracy_score(y_binary, iso_binary)
    print(f"✅ Isolation Forest Accuracy: {iso_acc:.4f}")

    # ──── Part B: XGBoost (supervised risk type classification) ────
    print("\n--- Training XGBoost (Risk Type Classifier) ---")
    le_type = LabelEncoder()
    y_type_encoded = le_type.fit_transform(y_type)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_type_encoded, test_size=0.2, random_state=42, stratify=y_type_encoded
    )

    xgb_model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        eval_metric="mlogloss",
        use_label_encoder=False,
    )
    xgb_model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=True)

    y_pred = xgb_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"✅ Risk Type Classification Accuracy: {accuracy:.4f}\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le_type.classes_))

    # Binary risk detection accuracy
    y_binary_test = (y_test > 0).astype(int)  # 0 = truly_normal, rest = risk
    y_binary_pred = (y_pred > 0).astype(int)
    binary_acc = accuracy_score(y_binary_test, y_binary_pred)
    print(f"✅ Binary Risk Detection Accuracy: {binary_acc:.4f}")

    # ──── Save models ────
    model_dir = "04_silent_risk_detector/model"
    os.makedirs(model_dir, exist_ok=True)

    joblib.dump(iso_forest, os.path.join(model_dir, "isolation_forest.pkl"))
    joblib.dump(xgb_model, os.path.join(model_dir, "risk_classifier_xgb.pkl"))
    joblib.dump(le_type, os.path.join(model_dir, "risk_type_encoder.pkl"))
    joblib.dump(scaler, os.path.join(model_dir, "feature_scaler.pkl"))
    joblib.dump(feature_cols, os.path.join(model_dir, "feature_columns.pkl"))

    print(f"\n✅ All models saved to {model_dir}/")


if __name__ == "__main__":
    main()
