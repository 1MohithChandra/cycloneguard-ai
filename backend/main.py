import pandas as pd

from train_model import train_models
from evaluate_model import evaluate_models


def main():

    print("=" * 60)
    print("        CYCLONE PREDICTION ML PROJECT")
    print("=" * 60)

    # Load dataset
    dataset = pd.read_csv(
        "backend/dataset.csv"
    )

    # Dataset information
    print("\nDataset shape:")
    print(dataset.shape)

    print("\nColumn names:")
    print(dataset.columns.tolist())

    print("\nFirst 5 rows:")
    print(dataset.head())

    print("\nMissing values:")
    print(dataset.isnull().sum())

    print("\nDuplicate rows:")
    print(dataset.duplicated().sum())

    print("\nCyclone distribution:")
    print(dataset["Cyclone"].value_counts())

    # Features
    X = dataset[
        [
            "Sea_Surface_Temperature",
            "Atmospheric_Pressure",
            "Humidity",
            "Wind_Shear",
            "Vorticity",
            "Latitude",
            "Ocean_Depth",
            "Proximity_to_Coastline"
        ]
    ]

    # Target
    y = dataset["Cyclone"]

    print("\nFeatures shape:")
    print(X.shape)

    print("\nTarget shape:")
    print(y.shape)

    print("\nFeatures being used:")
    print(X.columns.tolist())

    print("\nTarget:")
    print("Cyclone")

    # Train models
    print("\n" + "=" * 60)
    print("TRAINING MODELS")
    print("=" * 60)

    train_models()

    # Evaluate models
    print("\n" + "=" * 60)
    print("EVALUATING MODELS")
    print("=" * 60)

    evaluate_models()

    print("\n" + "=" * 60)
    print("PROJECT EXECUTION COMPLETED")
    print("=" * 60)


if __name__ == "__main__":
    main()