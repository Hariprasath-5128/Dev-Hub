"""
Model 2: Smart Alert System — Training Script
Trains a Random Forest classifier for severity prediction (stable/warning/critical).
"""

import sys, os
sys.path.insert(0, "..")

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score


def main():
    data_path = "02_smart_alert/data/alert_dataset.csv"
    if not os.path.exists(data_path):
        print("❌ Dataset not found. Run generate_data.py first.")
        return

    df = pd.read_csv(data_path)
    print(f"Loaded dataset: {df.shape[0]} samples")

    feature_cols = ["heart_rate", "spo2", "temperature", "respiratory_rate", "systolic_bp", "diastolic_bp"]
    X = df[feature_cols].values
    y = df["severity"].values

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    print(f"Training: {len(X_train)} | Test: {len(X_test)}")
    print(f"Classes: {list(le.classes_)}\n")

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"✅ Accuracy: {accuracy:.4f}\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Save
    model_dir = "02_smart_alert/model"
    os.makedirs(model_dir, exist_ok=True)

    joblib.dump(model, os.path.join(model_dir, "smart_alert_rf.pkl"))
    joblib.dump(le, os.path.join(model_dir, "severity_encoder.pkl"))
    joblib.dump(feature_cols, os.path.join(model_dir, "feature_columns.pkl"))

    print(f"\n✅ Model saved to {model_dir}/")


if __name__ == "__main__":
    main()
