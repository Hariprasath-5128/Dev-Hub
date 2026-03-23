"""
Model 3: Trend-Based Prediction — Training Script
Trains an LSTM model on sequential vitals for trend classification + next-value prediction.
"""

import sys, os
sys.path.insert(0, "..")

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import numpy as np
import json
import joblib
from sklearn.preprocessing import LabelEncoder

import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.utils import to_categorical


def main():
    data_dir = "data"

    if not os.path.exists(os.path.join(data_dir, "sequences.npy")):
        print("❌ Dataset not found. Run generate_data.py first.")
        return

    # Load data
    sequences = np.load(os.path.join(data_dir, "sequences.npy"))
    next_values = np.load(os.path.join(data_dir, "next_values.npy"))
    with open(os.path.join(data_dir, "trend_labels.json")) as f:
        labels = json.load(f)

    print(f"Loaded: {sequences.shape[0]} sequences, shape per seq: {sequences.shape[1:]}")

    # Normalize sequences
    n_samples, seq_len, n_features = sequences.shape
    flat = sequences.reshape(-1, n_features)
    feat_min = flat.min(axis=0)
    feat_max = flat.max(axis=0)
    feat_range = feat_max - feat_min
    feat_range[feat_range == 0] = 1

    sequences_norm = (sequences - feat_min) / feat_range
    next_values_norm = (next_values - feat_min) / feat_range

    # Encode labels
    le = LabelEncoder()
    y_trend = le.fit_transform(labels)
    y_trend_cat = to_categorical(y_trend)

    # Train/test split
    split = int(0.8 * n_samples)
    X_train, X_test = sequences_norm[:split], sequences_norm[split:]
    y_trend_train, y_trend_test = y_trend_cat[:split], y_trend_cat[split:]
    y_next_train, y_next_test = next_values_norm[:split], next_values_norm[split:]

    print(f"Training: {len(X_train)} | Test: {len(X_test)}")
    print(f"Trend classes: {list(le.classes_)}\n")

    # Build multi-output LSTM model
    input_layer = Input(shape=(seq_len, n_features))
    x = LSTM(64, return_sequences=True)(input_layer)
    x = Dropout(0.3)(x)
    x = LSTM(32)(x)
    x = BatchNormalization()(x)
    x = Dropout(0.2)(x)

    # Output 1: Trend classification
    trend_output = Dense(16, activation="relu")(x)
    trend_output = Dense(len(le.classes_), activation="softmax", name="trend")(trend_output)

    # Output 2: Next value regression
    next_output = Dense(16, activation="relu")(x)
    next_output = Dense(n_features, activation="linear", name="next_value")(next_output)

    model = Model(inputs=input_layer, outputs=[trend_output, next_output])
    model.compile(
        optimizer="adam",
        loss={"trend": "categorical_crossentropy", "next_value": "mse"},
        loss_weights={"trend": 1.0, "next_value": 0.5},
        metrics={"trend": "accuracy"},
    )

    model.summary()

    # Train
    early_stop = EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True)

    history = model.fit(
        X_train,
        {"trend": y_trend_train, "next_value": y_next_train},
        validation_data=(X_test, {"trend": y_trend_test, "next_value": y_next_test}),
        epochs=50,
        batch_size=64,
        callbacks=[early_stop],
        verbose=1,
    )

    # Evaluate
    results = model.evaluate(X_test, {"trend": y_trend_test, "next_value": y_next_test}, verbose=1)
    print(f"\n✅ Test Loss: {results[0]:.4f}")
    print(f"✅ Trend Accuracy: {results[3]:.4f}")
    print(f"✅ Next-Value MSE: {results[2]:.4f}")

    # Save
    model_dir = "03_trend_prediction/model"
    os.makedirs(model_dir, exist_ok=True)

    model.save(os.path.join(model_dir, "trend_lstm.keras"))
    joblib.dump(le, os.path.join(model_dir, "trend_encoder.pkl"))
    joblib.dump({"min": feat_min, "max": feat_max, "range": feat_range},
                os.path.join(model_dir, "normalization_params.pkl"))

    print(f"\n✅ Model saved to {model_dir}/")


if __name__ == "__main__":
    main()
