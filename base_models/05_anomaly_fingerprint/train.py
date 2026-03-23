"""
Model 5: Health Anomaly Fingerprint — Training Script
Trains XGBoost multi-class classifier for disease fingerprint matching.
"""

import sys, os
sys.path.insert(0, "..")

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
from xgboost import XGBClassifier


def main():
    data_path = "05_anomaly_fingerprint/data/fingerprint_dataset.csv"
    if not os.path.exists(data_path):
        print("❌ Dataset not found. Run generate_data.py first.")
        return

    df = pd.read_csv(data_path)
    print(f"Loaded dataset: {df.shape[0]} samples")

    feature_cols = [c for c in df.columns if c != "disease"]
    X = df[feature_cols].values
    y = df["disease"].values

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    print(f"Training: {len(X_train)} | Test: {len(X_test)}")
    print(f"Diseases: {list(le.classes_)}\n")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=7,
        learning_rate=0.1,
        objective="multi:softprob",
        random_state=42,
        eval_metric="mlogloss",
        use_label_encoder=False,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=True)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"✅ Accuracy: {accuracy:.4f}\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Feature importance
    importance = dict(zip(feature_cols, model.feature_importances_))
    print("\nTop Feature Importances:")
    for feat, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {feat}: {imp:.4f}")

    # Save
    model_dir = "05_anomaly_fingerprint/model"
    os.makedirs(model_dir, exist_ok=True)

    joblib.dump(model, os.path.join(model_dir, "fingerprint_xgb.pkl"))
    joblib.dump(le, os.path.join(model_dir, "disease_encoder.pkl"))
    joblib.dump(feature_cols, os.path.join(model_dir, "feature_columns.pkl"))

    print(f"\n✅ Model saved to {model_dir}/")


if __name__ == "__main__":
    main()
