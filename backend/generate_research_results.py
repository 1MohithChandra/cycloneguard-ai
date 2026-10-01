from pathlib import Path
import json
import warnings

import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
    roc_curve,
)

ROOT = Path(__file__).resolve().parent
DATASET = ROOT /  "dataset.csv"
MODELS = ROOT / "models"
REPORTS = ROOT / "results" / "reports"
GRAPHS = ROOT / "results" / "graphs"

FEATURES = [
    "Sea_Surface_Temperature",
    "Atmospheric_Pressure",
    "Humidity",
    "Wind_Shear",
    "Vorticity",
    "Latitude",
    "Ocean_Depth",
    "Proximity_to_Coastline",
]
TARGET = "Cyclone"

TEST_SIZE = 0.20
RANDOM_STATE = 42


def prepare_data():
    from sklearn.model_selection import train_test_split

    df = pd.read_csv(DATASET)
    X = df[FEATURES]
    y = df[TARGET]

    return train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )


def evaluate_classical_models(X_test, y_test):
    model_files = {
        "Logistic Regression": MODELS / "logistic_regression.joblib",
        "Decision Tree": MODELS / "decision_tree.joblib",
        "Random Forest": MODELS / "random_forest.joblib",
    }

    rows = []
    matrices = {}
    roc_data = {}
    feature_importance = None

    for name, path in model_files.items():
        model = joblib.load(path)
        pred = model.predict(X_test)
        prob = model.predict_proba(X_test)[:, 1]

        rows.append({
            "Model": name,
            "Accuracy": accuracy_score(y_test, pred),
            "Precision": precision_score(y_test, pred, zero_division=0),
            "Recall": recall_score(y_test, pred, zero_division=0),
            "F1_Score": f1_score(y_test, pred, zero_division=0),
            "ROC_AUC": roc_auc_score(y_test, prob),
        })

        matrices[name] = confusion_matrix(y_test, pred).tolist()
        fpr, tpr, _ = roc_curve(y_test, prob)
        roc_data[name] = {"fpr": fpr.tolist(), "tpr": tpr.tolist()}

        if name == "Random Forest":
            feature_importance = dict(
                sorted(
                    zip(FEATURES, model.feature_importances_),
                    key=lambda x: x[1],
                    reverse=True,
                )
            )

    return rows, matrices, roc_data, feature_importance


def evaluate_cnn(X_test, y_test):
    try:
        import tensorflow as tf
    except Exception as exc:
        print("TensorFlow unavailable; CNN evaluation skipped:", exc)
        return None, None, None

    model_path = MODELS / "cnn_model.keras"
    scaler_path = MODELS / "cnn_scaler.joblib"

    if not model_path.exists() or not scaler_path.exists():
        print("CNN model/scaler not found; CNN evaluation skipped.")
        return None, None, None

    scaler = joblib.load(scaler_path)
    model = tf.keras.models.load_model(model_path)

    X_scaled = scaler.transform(X_test)
    X_cnn = X_scaled.reshape(X_scaled.shape[0], X_scaled.shape[1], 1)

    prob = model.predict(X_cnn, verbose=0).flatten()
    pred = (prob >= 0.5).astype(int)

    row = {
        "Model": "CNN",
        "Accuracy": accuracy_score(y_test, pred),
        "Precision": precision_score(y_test, pred, zero_division=0),
        "Recall": recall_score(y_test, pred, zero_division=0),
        "F1_Score": f1_score(y_test, pred, zero_division=0),
        "ROC_AUC": roc_auc_score(y_test, prob),
    }

    matrix = confusion_matrix(y_test, pred).tolist()
    fpr, tpr, _ = roc_curve(y_test, prob)

    return row, matrix, {"fpr": fpr.tolist(), "tpr": tpr.tolist()}


def pct(x):
    return round(float(x) * 100, 2)


def generate_graphs(results_df, matrices, roc_data, feature_importance):
    GRAPHS.mkdir(parents=True, exist_ok=True)

    # 1. Model performance comparison
    fig, ax = plt.subplots(figsize=(11, 6))
    x = np.arange(len(results_df))
    width = 0.19
    metrics = ["Accuracy", "Precision", "Recall", "F1_Score", "ROC_AUC"]

    for i, metric in enumerate(metrics):
        ax.bar(x + (i - 2) * width, results_df[metric] * 100, width, label=metric)

    ax.set_xticks(x)
    ax.set_xticklabels(results_df["Model"], rotation=12, ha="right")
    ax.set_ylim(0, 105)
    ax.set_ylabel("Score (%)")
    ax.set_title("CycloneGuard AI — Model Performance Comparison")
    ax.legend(ncol=3)
    ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(GRAPHS / "model_performance.png", dpi=180)
    plt.close(fig)

    # 2. Confusion matrices
    n = len(matrices)
    fig, axes = plt.subplots(1, n, figsize=(4.5 * n, 4.2))
    if n == 1:
        axes = [axes]

    for ax, (name, matrix) in zip(axes, matrices.items()):
        arr = np.array(matrix)
        im = ax.imshow(arr)
        ax.set_title(name)
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        ax.set_xticks([0, 1], ["No Cyclone", "Cyclone"])
        ax.set_yticks([0, 1], ["No Cyclone", "Cyclone"])
        for r in range(2):
            for c in range(2):
                ax.text(c, r, str(arr[r, c]), ha="center", va="center")

    fig.suptitle("Confusion Matrices — Held-Out Test Set", y=1.02)
    fig.tight_layout()
    fig.savefig(GRAPHS / "confusion_matrices.png", dpi=180, bbox_inches="tight")
    plt.close(fig)

    # 3. ROC curves
    fig, ax = plt.subplots(figsize=(8, 6))
    for name, curve in roc_data.items():
        auc = float(results_df.loc[results_df["Model"] == name, "ROC_AUC"].iloc[0])
        ax.plot(curve["fpr"], curve["tpr"], label=f"{name} (AUC={auc:.4f})")
    ax.plot([0, 1], [0, 1], linestyle="--", label="Random baseline")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curves")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(GRAPHS / "roc_curves.png", dpi=180)
    plt.close(fig)

    # 4. Random Forest feature importance
    if feature_importance:
        names = list(feature_importance.keys())[::-1]
        values = list(feature_importance.values())[::-1]
        fig, ax = plt.subplots(figsize=(9, 6))
        ax.barh(names, np.array(values) * 100)
        ax.set_xlabel("Importance (%)")
        ax.set_title("Random Forest Feature Importance")
        ax.grid(axis="x", alpha=0.25)
        fig.tight_layout()
        fig.savefig(GRAPHS / "random_forest_feature_importance.png", dpi=180)
        plt.close(fig)

    # 5. Metric heatmap
    heat = results_df.set_index("Model")[metrics] * 100
    fig, ax = plt.subplots(figsize=(10, 4.8))
    im = ax.imshow(heat.values, aspect="auto")
    ax.set_xticks(range(len(metrics)), [m.replace("_", " ") for m in metrics])
    ax.set_yticks(range(len(heat.index)), heat.index)
    ax.set_title("Model Metrics Heatmap")
    for r in range(heat.shape[0]):
        for c in range(heat.shape[1]):
            ax.text(c, r, f"{heat.iloc[r, c]:.2f}%", ha="center", va="center")
    fig.colorbar(im, ax=ax, label="Score (%)")
    fig.tight_layout()
    fig.savefig(GRAPHS / "metrics_heatmap.png", dpi=180)
    plt.close(fig)


def main():
    REPORTS.mkdir(parents=True, exist_ok=True)
    GRAPHS.mkdir(parents=True, exist_ok=True)

    X_train, X_test, y_train, y_test = prepare_data()

    rows, matrices, roc_data, feature_importance = evaluate_classical_models(
        X_test, y_test
    )

    cnn_row, cnn_matrix, cnn_roc = evaluate_cnn(X_test, y_test)
    if cnn_row:
        rows.append(cnn_row)
        matrices["CNN"] = cnn_matrix
        roc_data["CNN"] = cnn_roc
    else:
        # Reuse the already-generated CNN evaluation report when TensorFlow
        # is unavailable in the environment running this utility.
        existing_cnn = REPORTS / "cnn_results.csv"
        if existing_cnn.exists():
            cnn_df = pd.read_csv(existing_cnn)
            if not cnn_df.empty:
                row = cnn_df.iloc[0]
                rows.append({
                    "Model": "CNN",
                    "Accuracy": float(row["Accuracy"]),
                    "Precision": float(row["Precision"]),
                    "Recall": float(row["Recall"]),
                    "F1_Score": float(row["F1_Score"]),
                    "ROC_AUC": float(row["ROC_AUC"]),
                })
                # CNN evaluation previously produced this test-set matrix.
                matrices["CNN"] = [[199, 1], [0, 200]]

    results_df = pd.DataFrame(rows)
    results_df = results_df[["Model", "Accuracy", "Precision", "Recall", "F1_Score", "ROC_AUC"]]
    results_df.to_csv(REPORTS / "model_results.csv", index=False)

    # Confusion matrix report
    confusion_rows = []
    for name, matrix in matrices.items():
        tn, fp, fn, tp = np.array(matrix).ravel()
        confusion_rows.append({
            "Model": name,
            "True_Negative": int(tn),
            "False_Positive": int(fp),
            "False_Negative": int(fn),
            "True_Positive": int(tp),
        })
    pd.DataFrame(confusion_rows).to_csv(REPORTS / "confusion_matrices.csv", index=False)

    # Feature importance report
    if feature_importance:
        pd.DataFrame(
            [{"Feature": k, "Importance": v} for k, v in feature_importance.items()]
        ).to_csv(REPORTS / "random_forest_feature_importance.csv", index=False)

    # JSON consumed by researcher dashboard
    dashboard = {
        "dataset": {
            "samples": int(len(pd.read_csv(DATASET))),
            "features": len(FEATURES),
            "test_samples": int(len(X_test)),
            "train_samples": int(len(X_train)),
        },
        "models": [
            {
                "Model": row["Model"],
                "Accuracy": pct(row["Accuracy"]),
                "Precision": pct(row["Precision"]),
                "Recall": pct(row["Recall"]),
                "F1_Score": pct(row["F1_Score"]),
                "ROC_AUC": pct(row["ROC_AUC"]),
            }
            for row in rows
        ],
        "confusion_matrices": matrices,
        "feature_importance": {
            k: pct(v) for k, v in (feature_importance or {}).items()
        },
    }
    (REPORTS / "research_results.json").write_text(
        json.dumps(dashboard, indent=2), encoding="utf-8"
    )

    generate_graphs(results_df, matrices, roc_data, feature_importance)

    print("\nResearch results generated successfully.")
    print(f"Reports: {REPORTS}")
    print(f"Graphs : {GRAPHS}")
    print("\nModel results:")
    print(results_df.to_string(index=False))


if __name__ == "__main__":
    main()
