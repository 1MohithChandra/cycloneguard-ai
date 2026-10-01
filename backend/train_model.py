import os
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

from preprocessing import prepare_data


RANDOM_STATE = 42


def train_models():

    X_train, X_test, y_train, y_test = prepare_data()

    models = {

        "Logistic Regression":
            LogisticRegression(
                max_iter=1000,
                random_state=RANDOM_STATE
            ),

        "Decision Tree":
            DecisionTreeClassifier(
                random_state=RANDOM_STATE
            ),

        "Random Forest":
            RandomForestClassifier(
                n_estimators=100,
                random_state=RANDOM_STATE
            )
    }

    os.makedirs(
        "models",
        exist_ok=True
    )

    for name, model in models.items():

        print(
            f"\nTraining {name}..."
        )

        model.fit(
            X_train,
            y_train
        )

        filename = (
            name.lower()
            .replace(" ", "_")
            + ".joblib"
        )

        filepath = os.path.join(
            "models",
            filename
        )

        joblib.dump(
            model,
            filepath
        )

        print(
            f"{name} trained successfully."
        )

        print(
            f"Saved to: {filepath}"
        )


if __name__ == "__main__":

    train_models()