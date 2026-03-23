"""
Model 1: Core Health Predictor — Training Script
Trains an XGBoost multi-class classifier on vitals → health conditions.
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
    # Load dataset
    data_path = "01_health_predictor/data/vitals_dataset.csv"
    if not os.path.exists(data_path):
        print("❌ Dataset not found. Run generate_data.py first.")
        return

    df = pd.read_csv(data_path)
    print(f"Loaded dataset: {df.shape[0]} samples, {df.shape[1]} columns")

    # Prepare features and labels
    feature_cols = [c for c in df.columns if c != "condition"]
    X = df[feature_cols].values
    y = df["condition"].values

    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    print(f"Training set: {len(X_train)} | Test set: {len(X_test)}")
    print(f"Classes: {list(le.classes_)}\n")

    # Train XGBoost
    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        objective="multi:softprob",
        num_class=len(le.classes_),
        random_state=42,
        eval_metric="mlogloss",
        use_label_encoder=False,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=True,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"✅ Accuracy: {accuracy:.4f}\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Feature importance
    importance = dict(zip(feature_cols, model.feature_importances_))
    print("Feature Importance:")
    for feat, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True):
        print(f"  {feat}: {imp:.4f}")

    # Save model and label encoder
    model_dir = "01_health_predictor/model"
    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(model_dir, "health_predictor_xgb.pkl")
    encoder_path = os.path.join(model_dir, "label_encoder.pkl")

    joblib.dump(model, model_path)
    joblib.dump(le, encoder_path)
    joblib.dump(feature_cols, os.path.join(model_dir, "feature_columns.pkl"))

    print(f"\n✅ Model saved: {model_path}")
    print(f"✅ Label encoder saved: {encoder_path}")


if __name__ == "__main__":
    main()
