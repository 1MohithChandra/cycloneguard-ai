import os
import joblib
import pandas as pd

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


MODELS = {
    "Logistic Regression":
        "models/logistic_regression.joblib",

    "Decision Tree":
        "models/decision_tree.joblib",

    "Random Forest":
        "models/random_forest.joblib"
}


def evaluate_models():

    X_train, X_test, y_train, y_test = prepare_data()

    os.makedirs(
        "results/reports",
        exist_ok=True
    )

    results = []

    for name, filepath in MODELS.items():

        print(
            f"\nEvaluating {name}..."
        )

        model = joblib.load(filepath)

        predictions = model.predict(X_test)

        probabilities = model.predict_proba(
            X_test
        )[:, 1]

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

        print(
            f"Accuracy: {accuracy:.4f}"
        )

        print(
            f"Precision: {precision:.4f}"
        )

        print(
            f"Recall: {recall:.4f}"
        )

        print(
            f"F1 Score: {f1:.4f}"
        )

        print(
            f"ROC-AUC: {roc_auc:.4f}"
        )

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

        results.append({

            "Model": name,

            "Accuracy":
                round(accuracy, 4),

            "Precision":
                round(precision, 4),

            "Recall":
                round(recall, 4),

            "F1_Score":
                round(f1, 4),

            "ROC_AUC":
                round(roc_auc, 4)

        })

    results_df = pd.DataFrame(
        results
    )

    output_file = (
        "results/reports/"
        "model_results.csv"
    )

    results_df.to_csv(
        output_file,
        index=False
    )

    print(
        f"\nResults saved to: {output_file}"
    )


if __name__ == "__main__":

    evaluate_models()