import joblib
import pandas as pd


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


MODEL_PATH = (
    "models/random_forest.joblib"
)


def predict_cyclone(
    sea_surface_temperature,
    atmospheric_pressure,
    humidity,
    wind_shear,
    vorticity,
    latitude,
    ocean_depth,
    proximity_to_coastline
):

    model = joblib.load(
        MODEL_PATH
    )

    input_data = pd.DataFrame(
        [[
            sea_surface_temperature,
            atmospheric_pressure,
            humidity,
            wind_shear,
            vorticity,
            latitude,
            ocean_depth,
            proximity_to_coastline
        ]],
        columns=FEATURE_COLUMNS
    )

    prediction = model.predict(
        input_data
    )[0]

    probability = model.predict_proba(
        input_data
    )[0][1]

    return {
        "prediction": int(prediction),
        "probability": round(
            float(probability) * 100,
            2
        )
    }


if __name__ == "__main__":

    result = predict_cyclone(
        28.5,
        995,
        85,
        8,
        0.00015,
        13.0,
        3000,
        25
    )

    print(result)