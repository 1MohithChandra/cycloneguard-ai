import os
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

from preprocessing import prepare_data


MODEL_PATH = "models/cnn_model.keras"
SCALER_PATH = "models/cnn_scaler.joblib"


def evaluate_cnn():

    print("Loading test data...")

    X_train, X_test, y_train, y_test = prepare_data()

    # Convert to NumPy
    X_test = X_test.values
    y_test = y_test.values

    # Load scaler
    scaler = joblib.load(SCALER_PATH)

    # Scale test data using the SAME scaler
    X_test = scaler.transform(X_test)

    # Reshape for CNN
    X_test = X_test.reshape(
        X_test.shape[0],
        X_test.shape[1],
        1
    )

    # Load CNN
    print("Loading CNN model...")

    model = tf.keras.models.load_model(MODEL_PATH)

    # Predictions
    probabilities = model.predict(
        X_test,
        verbose=0
    ).flatten()

    predictions = (
        probabilities >= 0.5
    ).astype(int)

    # Metrics
    accuracy = accuracy_score(
        y_test,
        predictions
    )

    precision = precision_score(
        y_test,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        y_test,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        y_test,
        predictions,
        zero_division=0
    )

    roc_auc = roc_auc_score(
        y_test,
        probabilities
    )

    matrix = confusion_matrix(
        y_test,
        predictions
    )

    # Print results
    print("\n================================")
    print("CNN MODEL EVALUATION")
    print("================================")

    print(f"Accuracy : {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print(f"F1 Score : {f1:.4f}")
    print(f"ROC-AUC  : {roc_auc:.4f}")

    print("\nConfusion Matrix:")
    print(matrix)

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            predictions,
            zero_division=0
        )
    )

    # Save results
    os.makedirs(
        "results/reports",
        exist_ok=True
    )

    results = pd.DataFrame([{
        "Model": "CNN",
        "Accuracy": round(accuracy, 4),
        "Precision": round(precision, 4),
        "Recall": round(recall, 4),
        "F1_Score": round(f1, 4),
        "ROC_AUC": round(roc_auc, 4)
    }])

    output_file = "results/reports/cnn_results.csv"

    results.to_csv(
        output_file,
        index=False
    )

    print("\nResults saved to:")
    print(output_file)


if __name__ == "__main__":
    evaluate_cnn()