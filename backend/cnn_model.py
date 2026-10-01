import os
import numpy as np
import joblib
import tensorflow as tf

from sklearn.preprocessing import StandardScaler
from preprocessing import prepare_data


RANDOM_STATE = 42

MODEL_PATH = "models/cnn_model.keras"
SCALER_PATH = "models/cnn_scaler.joblib"


def train_cnn():

    print("Loading dataset...")

    X_train, X_test, y_train, y_test = prepare_data()

    # Convert pandas data to NumPy
    X_train = X_train.values
    X_test = X_test.values

    y_train = y_train.values
    y_test = y_test.values

    print("Training shape:", X_train.shape)
    print("Testing shape:", X_test.shape)

    # --------------------------------------------------
    # FEATURE SCALING
    # --------------------------------------------------

    scaler = StandardScaler()

    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    # Save scaler
    os.makedirs("models", exist_ok=True)
    joblib.dump(scaler, SCALER_PATH)

    # --------------------------------------------------
    # RESHAPE FOR 1D CNN
    # --------------------------------------------------

    # Shape:
    # (samples, features, channels)

    X_train = X_train.reshape(
        X_train.shape[0],
        X_train.shape[1],
        1
    )

    X_test = X_test.reshape(
        X_test.shape[0],
        X_test.shape[1],
        1
    )

    print("CNN training shape:", X_train.shape)

    # --------------------------------------------------
    # CNN MODEL
    # --------------------------------------------------

    model = tf.keras.Sequential([

        tf.keras.layers.Input(
            shape=(X_train.shape[1], 1)
        ),

        tf.keras.layers.Conv1D(
            filters=32,
            kernel_size=3,
            activation="relu",
            padding="same"
        ),

        tf.keras.layers.MaxPooling1D(
            pool_size=2
        ),

        tf.keras.layers.Conv1D(
            filters=64,
            kernel_size=3,
            activation="relu",
            padding="same"
        ),

        tf.keras.layers.Flatten(),

        tf.keras.layers.Dense(
            64,
            activation="relu"
        ),

        tf.keras.layers.Dropout(
            0.3
        ),

        tf.keras.layers.Dense(
            1,
            activation="sigmoid"
        )
    ])

    # --------------------------------------------------
    # COMPILE
    # --------------------------------------------------

    model.compile(
        optimizer="adam",
        loss="binary_crossentropy",
        metrics=[
            "accuracy"
        ]
    )

    print("\nCNN Architecture:\n")

    model.summary()

    # --------------------------------------------------
    # TRAIN
    # --------------------------------------------------

    print("\nTraining CNN...")

    history = model.fit(
        X_train,
        y_train,
        validation_split=0.2,
        epochs=30,
        batch_size=32,
        verbose=1
    )

    # --------------------------------------------------
    # TEST
    # --------------------------------------------------

    test_loss, test_accuracy = model.evaluate(
        X_test,
        y_test,
        verbose=0
    )

    print("\nCNN Test Results")
    print("-------------------------")
    print(f"Test Loss: {test_loss:.4f}")
    print(f"Test Accuracy: {test_accuracy:.4f}")

    # --------------------------------------------------
    # SAVE MODEL
    # --------------------------------------------------

    model.save(MODEL_PATH)

    print("\nCNN model saved to:")
    print(MODEL_PATH)

    print("\nScaler saved to:")
    print(SCALER_PATH)


if __name__ == "__main__":
    train_cnn()