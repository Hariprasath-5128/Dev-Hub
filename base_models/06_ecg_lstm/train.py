"""
Model 6: ECG Pattern Detection — Training Script
Trains a sequence-labeling LSTM to detect per-timestep anomalies in ECG signals.
"""

import sys, os
sys.path.insert(0, "..")

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import numpy as np
import joblib

import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import (
    Input, LSTM, Dense, Dropout, TimeDistributed,
    Bidirectional, BatchNormalization, Conv1D, MaxPooling1D, UpSampling1D
)
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.utils import to_categorical

NUM_CLASSES = 5  # 0=normal, 1=tachycardia, 2=bradycardia, 3=arrhythmia, 4=st_elevation
ECG_LENGTH = 500

LABEL_NAMES = ["normal", "tachycardia", "bradycardia", "arrhythmia", "st_elevation"]


def main():
    data_dir = "data"

    if not os.path.exists(os.path.join(data_dir, "ecg_signals.npy")):
        print("❌ Dataset not found. Run generate_data.py first.")
        return

    ecg_signals = np.load(os.path.join(data_dir, "ecg_signals.npy"))
    ecg_labels = np.load(os.path.join(data_dir, "ecg_labels.npy"))

    print(f"Loaded: {ecg_signals.shape[0]} ECG signals, length {ecg_signals.shape[1]}")

    # Normalize signals
    ecg_min = ecg_signals.min()
    ecg_max = ecg_signals.max()
    ecg_norm = (ecg_signals - ecg_min) / (ecg_max - ecg_min + 1e-8)

    # Reshape for LSTM: (samples, timesteps, features=1)
    X = ecg_norm.reshape(-1, ECG_LENGTH, 1)

    # One-hot encode labels per timestep
    y = np.zeros((len(ecg_labels), ECG_LENGTH, NUM_CLASSES))
    for i in range(len(ecg_labels)):
        y[i] = to_categorical(ecg_labels[i], num_classes=NUM_CLASSES)

    # Split
    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    print(f"Training: {len(X_train)} | Test: {len(X_test)}")

    # Build model: Conv1D + Bidirectional LSTM for sequence labeling
    input_layer = Input(shape=(ECG_LENGTH, 1))

    # Conv feature extraction
    x = Conv1D(32, kernel_size=5, activation="relu", padding="same")(input_layer)
    x = BatchNormalization()(x)
    x = Conv1D(64, kernel_size=5, activation="relu", padding="same")(x)
    x = BatchNormalization()(x)
    x = Dropout(0.2)(x)

    # Bidirectional LSTM
    x = Bidirectional(LSTM(64, return_sequences=True))(x)
    x = Dropout(0.3)(x)
    x = Bidirectional(LSTM(32, return_sequences=True))(x)
    x = Dropout(0.2)(x)

    # Per-timestep classification
    output = TimeDistributed(Dense(NUM_CLASSES, activation="softmax"))(x)

    model = Model(inputs=input_layer, outputs=output)
    model.compile(
        optimizer="adam",
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    model.summary()

    early_stop = EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True)

    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=3,
        batch_size=32,
        callbacks=[early_stop],
        verbose=1,
    )

    # Evaluate
    results = model.evaluate(X_test, y_test, verbose=1)
    print(f"\n✅ Test Loss: {results[0]:.4f}")
    print(f"✅ Test Accuracy: {results[1]:.4f}")

    # Per-class accuracy on test set
    y_pred = model.predict(X_test, verbose=1)
    y_pred_classes = np.argmax(y_pred, axis=-1).flatten()
    y_true_classes = np.argmax(y_test, axis=-1).flatten()

    print("\nPer-class accuracy:")
    for cls_id, cls_name in enumerate(LABEL_NAMES):
        mask = y_true_classes == cls_id
        if mask.sum() > 0:
            cls_acc = (y_pred_classes[mask] == cls_id).mean()
            print(f"  {cls_name}: {cls_acc:.4f} ({mask.sum()} samples)")

    # Save
    model_dir = "06_ecg_lstm/model"
    os.makedirs(model_dir, exist_ok=True)

    model.save(os.path.join(model_dir, "ecg_lstm.keras"))
    joblib.dump({"min": ecg_min, "max": ecg_max}, os.path.join(model_dir, "ecg_normalization.pkl"))
    joblib.dump(LABEL_NAMES, os.path.join(model_dir, "label_names.pkl"))

    print(f"\n✅ Model saved to {model_dir}/")


if __name__ == "__main__":
    main()
