import pandas as pd
from sklearn.model_selection import train_test_split


FEATURE_COLUMNS = [
    "Sea_Surface_Temperature",
    "Atmospheric_Pressure",
    "Humidity",
    "Wind_Shear",
    "Vorticity",
    "Latitude",
    "Ocean_Depth",
    "Proximity_to_Coastline"
]

TARGET_COLUMN = "Cyclone"

TEST_SIZE = 0.20
RANDOM_STATE = 42


def load_dataset():

    dataset = pd.read_csv(
        "backend/dataset.csv"
    )

    return dataset


def prepare_data():

    dataset = load_dataset()

    X = dataset[FEATURE_COLUMNS]

    y = dataset[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )

    return X_train, X_test, y_train, y_test


if __name__ == "__main__":

    X_train, X_test, y_train, y_test = prepare_data()

    print("Training rows:", len(X_train))
    print("Testing rows:", len(X_test))

    print("\nFeatures used:")

    for feature in FEATURE_COLUMNS:
        print("-", feature)

    print("\nTarget:", TARGET_COLUMN)