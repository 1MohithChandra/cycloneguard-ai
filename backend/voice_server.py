import os
import math
import joblib
import pandas as pd
import numpy as np
import tensorflow as tf
import httpx
import uvicorn
from pathlib import Path

from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# =========================================================
# PATHS / ENVIRONMENT
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

OPENROUTER_API_KEY = os.getenv(
    "OPENROUTER_API_KEY"
)

if not OPENROUTER_API_KEY:
    raise RuntimeError(
        "OPENROUTER_API_KEY is missing from backend/.env"
    )


# =========================================================
# RANDOM FOREST MODEL
# =========================================================

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "random_forest.joblib"
)

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Random Forest model not found: {MODEL_PATH}"
    )

cyclone_model = joblib.load(
    MODEL_PATH
)

print(
    "Random Forest model loaded:",
    MODEL_PATH
)


# =========================================================
# CNN MODEL
# =========================================================

CNN_MODEL_PATH = (
    BASE_DIR
    / "models"
    / "cnn_model.keras"
)

CNN_SCALER_PATH = (
    BASE_DIR
    / "models"
    / "cnn_scaler.joblib"
)

if not CNN_MODEL_PATH.exists():
    raise FileNotFoundError(
        f"CNN model not found: {CNN_MODEL_PATH}"
    )

if not CNN_SCALER_PATH.exists():
    raise FileNotFoundError(
        f"CNN scaler not found: {CNN_SCALER_PATH}"
    )


cnn_model = tf.keras.models.load_model(
    CNN_MODEL_PATH
)

cnn_scaler = joblib.load(
    CNN_SCALER_PATH
)

print(
    "CNN model loaded:",
    CNN_MODEL_PATH
)


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="CycloneGuard AI Voice Server"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://cycloneguard-ai-frontend.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# API URLS
# =========================================================

OPENROUTER_URL = (
    "https://openrouter.ai/api/v1/chat/completions"
)

OPENMETEO_WEATHER_URL = (
    "https://api.open-meteo.com/v1/forecast"
)

OPENMETEO_MARINE_URL = (
    "https://marine-api.open-meteo.com/v1/marine"
)

GEBCO_URL = (
    "https://api.opentopodata.org/v1/gebco2020"
)

MODEL = "openrouter/free"


# =========================================================
# CONSTANTS
# =========================================================

EARTH_RADIUS_METERS = 6_371_000

VORTICITY_OFFSET = 0.1


# =========================================================
# REQUEST MODELS
# =========================================================

class ChatRequest(BaseModel):

    message: str

    dashboard_context: str = ""


class PredictionRequest(BaseModel):

    sea_surface_temperature: float

    atmospheric_pressure: float

    humidity: float

    wind_shear: float

    vorticity: float

    latitude: float

    ocean_depth: float

    proximity_to_coastline: float


# =========================================================
# HOME
# =========================================================

@app.get("/")
async def home():

    return {

        "status": "online",

        "service": "CycloneGuard AI",

        "provider":
            "OpenRouter + Open-Meteo + GEBCO",

        "model": MODEL,

        "environment_endpoint":
            "/api/environment"
    }


# =========================================================
# WIND COMPONENTS
# =========================================================

def wind_components(
    speed_knots,
    direction_degrees
):

    if (
        speed_knots is None
        or direction_degrees is None
    ):
        return None, None


    speed_ms = (
        float(speed_knots)
        * 0.514444
    )


    direction_rad = math.radians(
        float(direction_degrees)
    )


    # Meteorological wind direction:
    # direction FROM which wind comes.

    u = (
        -speed_ms
        * math.sin(direction_rad)
    )

    v = (
        -speed_ms
        * math.cos(direction_rad)
    )

    return u, v


# =========================================================
# HAVERSINE DISTANCE
# =========================================================

def haversine_km(
    lat1,
    lon1,
    lat2,
    lon2
):

    R = 6371.0

    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)

    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        +
        math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return R * c


# =========================================================
# VORTICITY
# =========================================================

async def calculate_vorticity(
    client,
    latitude,
    longitude
):

    delta = VORTICITY_OFFSET


    locations = {

        "north": (
            latitude + delta,
            longitude
        ),

        "south": (
            latitude - delta,
            longitude
        ),

        "east": (
            latitude,
            longitude + delta
        ),

        "west": (
            latitude,
            longitude - delta
        )
    }


    results = {}


    for name, (
        lat,
        lon
    ) in locations.items():

        params = {

            "latitude": lat,

            "longitude": lon,

            "current": (
                "wind_speed_10m,"
                "wind_direction_10m"
            ),

            "wind_speed_unit": "kn",

            "timezone": "auto"
        }


        try:

            response = await client.get(
                OPENMETEO_WEATHER_URL,
                params=params
            )

            response.raise_for_status()

            data = response.json()

            current = data.get(
                "current",
                {}
            )

            speed = current.get(
                "wind_speed_10m"
            )

            direction = current.get(
                "wind_direction_10m"
            )

            u, v = wind_components(
                speed,
                direction
            )

            results[name] = {
                "u": u,
                "v": v
            }


        except Exception as error:

            print(
                "Vorticity point error:",
                error
            )

            return None


    if any(
        results[name]["u"] is None
        or results[name]["v"] is None
        for name in results
    ):

        return None


    latitude_rad = math.radians(
        latitude
    )


    dy = (
        EARTH_RADIUS_METERS
        *
        math.radians(
            2 * delta
        )
    )


    dx = (
        EARTH_RADIUS_METERS
        *
        math.cos(latitude_rad)
        *
        math.radians(
            2 * delta
        )
    )


    if dx == 0 or dy == 0:

        return None


    dvdx = (
        results["east"]["v"]
        -
        results["west"]["v"]
    ) / dx


    dudy = (
        results["north"]["u"]
        -
        results["south"]["u"]
    ) / dy


    vorticity = dvdx - dudy

    print(
        "Calculated vorticity:",
        vorticity
    )

    return vorticity


# =========================================================
# FIND NEAREST REAL OCEAN POINT
# =========================================================

async def find_nearest_ocean_point(
    client,
    latitude,
    longitude
):

    """
    Find the nearest location that is confirmed to be
    over the ocean.

    GEBCO is used to verify that the elevation is negative.
    Open-Meteo Marine is then used to obtain SST.
    """

    search_radii = [
        25,
        50,
        75,
        100,
        150,
        200,
        250,
        300,
        350,
        400
    ]

    bearings = [
        0,
        45,
        90,
        135,
        180,
        225,
        270,
        315
    ]


    for radius_km in search_radii:

        for bearing in bearings:

            try:

                # -------------------------------------------------
                # CALCULATE CANDIDATE COORDINATE
                # -------------------------------------------------

                bearing_rad = math.radians(
                    bearing
                )

                lat1 = math.radians(
                    latitude
                )

                lon1 = math.radians(
                    longitude
                )

                angular_distance = (
                    radius_km / 6371.0
                )


                lat2 = math.asin(

                    math.sin(lat1)
                    * math.cos(
                        angular_distance
                    )

                    +

                    math.cos(lat1)
                    * math.sin(
                        angular_distance
                    )
                    * math.cos(
                        bearing_rad
                    )
                )


                lon2 = (

                    lon1

                    +

                    math.atan2(

                        math.sin(
                            bearing_rad
                        )
                        * math.sin(
                            angular_distance
                        )
                        * math.cos(lat1),

                        math.cos(
                            angular_distance
                        )
                        -

                        math.sin(lat1)
                        * math.sin(lat2)
                    )
                )


                candidate_lat = math.degrees(
                    lat2
                )

                candidate_lon = math.degrees(
                    lon2
                )


                # -------------------------------------------------
                # FIRST: CHECK GEBCO
                # -------------------------------------------------

                gebco_response = await client.get(

                    GEBCO_URL,

                    params={
                        "locations":
                            f"{candidate_lat},{candidate_lon}"
                    }

                )


                if gebco_response.status_code != 200:

                    continue


                gebco_data = (
                    gebco_response.json()
                )


                gebco_results = (
                    gebco_data.get(
                        "results",
                        []
                    )
                )


                if not gebco_results:

                    continue


                elevation = (
                    gebco_results[0].get(
                        "elevation"
                    )
                )


                if elevation is None:

                    continue


                elevation = float(
                    elevation
                )


                print(
                    f"GEBCO candidate: "
                    f"{candidate_lat:.5f}, "
                    f"{candidate_lon:.5f} "
                    f"= {elevation} m"
                )


                # Positive elevation = land
                # Zero/positive = not usable ocean point

                if elevation >= 0:

                    continue


                # -------------------------------------------------
                # REAL OCEAN POINT FOUND
                # -------------------------------------------------

                depth = abs(
                    elevation
                )


                # -------------------------------------------------
                # NOW GET SST
                # -------------------------------------------------

                marine_response = await client.get(

                    OPENMETEO_MARINE_URL,

                    params={
                        "latitude":
                            candidate_lat,

                        "longitude":
                            candidate_lon,

                        "current":
                            "sea_surface_temperature",

                        "timezone":
                            "auto"
                    }

                )


                if marine_response.status_code != 200:

                    continue


                marine_data = (
                    marine_response.json()
                )


                current = marine_data.get(
                    "current",
                    {}
                )


                sst = current.get(
                    "sea_surface_temperature"
                )


                if sst is None:

                    continue


                actual_distance = (
                    haversine_km(
                        latitude,
                        longitude,
                        candidate_lat,
                        candidate_lon
                    )
                )


                result = {

                    "latitude":
                        candidate_lat,

                    "longitude":
                        candidate_lon,

                    "distance_km":
                        round(
                            actual_distance,
                            2
                        ),

                    "bearing":
                        bearing,

                    "sea_surface_temperature":
                        float(sst),

                    "depth":
                        round(
                            depth,
                            2
                        )
                }


                print(
                    "REAL OCEAN POINT FOUND:",
                    result
                )


                return result


            except Exception as error:

                print(
                    "Ocean search error:",
                    error
                )

                continue


    print(
        "No confirmed ocean point found "
        "within 400 km."
    )


    return None

# =========================================================
# GEBCO DEPTH
# =========================================================

async def get_ocean_depth(
    client,
    latitude,
    longitude
):

    # Search around the supplied ocean reference point
    # until GEBCO returns an actual ocean elevation.

    search_points = [

        (latitude, longitude),

        (latitude + 0.02, longitude),
        (latitude - 0.02, longitude),
        (latitude, longitude + 0.02),
        (latitude, longitude - 0.02),

        (latitude + 0.05, longitude),
        (latitude - 0.05, longitude),
        (latitude, longitude + 0.05),
        (latitude, longitude - 0.05),

        (latitude + 0.10, longitude),
        (latitude - 0.10, longitude),
        (latitude, longitude + 0.10),
        (latitude, longitude - 0.10),

        (latitude + 0.20, longitude),
        (latitude - 0.20, longitude),
        (latitude, longitude + 0.20),
        (latitude, longitude - 0.20)
    ]


    for point_latitude, point_longitude in search_points:

        try:

            response = await client.get(

                GEBCO_URL,

                params={
                    "locations":
                        f"{point_latitude},{point_longitude}"
                }

            )


            if response.status_code != 200:

                print(
                    "GEBCO HTTP status:",
                    response.status_code
                )

                continue


            data = response.json()


            results = data.get(
                "results",
                []
            )


            if not results:

                continue


            elevation = results[0].get(
                "elevation"
            )


            if elevation is None:

                continue


            elevation = float(
                elevation
            )


            print(
                f"GEBCO elevation at "
                f"{point_latitude}, "
                f"{point_longitude}: "
                f"{elevation} m"
            )


            # Negative elevation means ocean

            if elevation < 0:

                depth = abs(
                    elevation
                )


                print(
                    f"Ocean depth: "
                    f"{depth:.2f} m"
                )


                return round(
                    depth,
                    2
                )


        except Exception as error:

            print(
                "Ocean depth error:",
                error
            )

            continue


    print(
        "Could not find a valid ocean depth."
    )


    return None


# =========================================================
# OCEAN INFORMATION
# =========================================================

async def get_ocean_information(
    client,
    latitude,
    longitude
):

    ocean_point = await find_nearest_ocean_point(
        client,
        latitude,
        longitude
    )


    if ocean_point is None:

        return {

            "sea_surface_temperature":
                None,

            "ocean_depth":
                None,

            "proximity_to_coastline":
                None,

            "ocean_latitude":
                None,

            "ocean_longitude":
                None
        }


    return {

        "sea_surface_temperature":
            ocean_point[
                "sea_surface_temperature"
            ],

        "ocean_depth":
            ocean_point[
                "depth"
            ],

        "proximity_to_coastline":
            ocean_point[
                "distance_km"
            ],

        "ocean_latitude":
            ocean_point[
                "latitude"
            ],

        "ocean_longitude":
            ocean_point[
                "longitude"
            ]
    }

# =========================================================
# ENVIRONMENT ENDPOINT
# =========================================================

@app.get("/api/environment")
async def get_environment(

    latitude: float = Query(...),

    longitude: float = Query(...)

):

    if not (
        -90 <= latitude <= 90
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Latitude must be "
                "between -90 and 90."
            )
        )


    if not (
        -180 <= longitude <= 180
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Longitude must be "
                "between -180 and 180."
            )
        )


    weather_params = {

        "latitude":
            latitude,

        "longitude":
            longitude,

        "current": (
            "relative_humidity_2m,"
            "pressure_msl,"
            "wind_speed_10m,"
            "wind_direction_10m,"
            "wind_speed_100m,"
            "wind_direction_100m"
        ),

        "wind_speed_unit":
            "kn",

        "timezone":
            "auto"
    }


    try:

        async with httpx.AsyncClient(
            timeout=45.0
        ) as client:

            # -----------------------------------------
            # WEATHER
            # -----------------------------------------

            weather_response = await client.get(

                OPENMETEO_WEATHER_URL,

                params=weather_params
            )


            weather_response.raise_for_status()


            weather_data = (
                weather_response.json()
            )


            current = weather_data.get(
                "current",
                {}
            )


            # -----------------------------------------
            # BASIC WEATHER
            # -----------------------------------------

            humidity = current.get(
                "relative_humidity_2m"
            )

            pressure = current.get(
                "pressure_msl"
            )

            wind_speed_10m = current.get(
                "wind_speed_10m"
            )

            wind_direction_10m = current.get(
                "wind_direction_10m"
            )

            wind_speed_100m = current.get(
                "wind_speed_100m"
            )

            wind_direction_100m = current.get(
                "wind_direction_100m"
            )


            # -----------------------------------------
            # WIND SHEAR
            # -----------------------------------------

            u10, v10 = wind_components(
                wind_speed_10m,
                wind_direction_10m
            )


            u100, v100 = wind_components(
                wind_speed_100m,
                wind_direction_100m
            )


            wind_shear = None


            if all(
                value is not None
                for value in [
                    u10,
                    v10,
                    u100,
                    v100
                ]
            ):

                wind_shear_ms = math.sqrt(

                    (u100 - u10) ** 2

                    +

                    (v100 - v10) ** 2
                )


                wind_shear = (
                    wind_shear_ms
                    / 0.514444
                )


            # -----------------------------------------
            # VORTICITY
            # -----------------------------------------

            vorticity = (
                await calculate_vorticity(
                    client,
                    latitude,
                    longitude
                )
            )


            # -----------------------------------------
            # OCEAN DATA
            # -----------------------------------------

            ocean = (
                await get_ocean_information(
                    client,
                    latitude,
                    longitude
                )
            )


            sea_surface_temperature = (
                ocean[
                    "sea_surface_temperature"
                ]
            )


            ocean_depth = (
                ocean[
                    "ocean_depth"
                ]
            )


            proximity_to_coastline = (
                ocean[
                    "proximity_to_coastline"
                ]
            )


            # -----------------------------------------
            # TIMESTAMP
            # -----------------------------------------

            timestamp = current.get(
                "time"
            )


            # -----------------------------------------
            # RESPONSE
            # -----------------------------------------

            return {

                "success": True,

                "source":
                    "Open-Meteo + Marine + GEBCO",

                "latitude":
                    latitude,

                "longitude":
                    longitude,

                "timestamp":
                    timestamp,

                "ocean_reference": {

                    "latitude":
                        ocean[
                            "ocean_latitude"
                        ],

                    "longitude":
                        ocean[
                            "ocean_longitude"
                        ]

                },


                "data": {

                    "sea_surface_temperature":
                        sea_surface_temperature,

                    "atmospheric_pressure":
                        pressure,

                    "humidity":
                        humidity,

                    "wind_speed_10m":
                        wind_speed_10m,

                    "wind_direction_10m":
                        wind_direction_10m,

                    "wind_speed_100m":
                        wind_speed_100m,

                    "wind_direction_100m":
                        wind_direction_100m,

                    "wind_shear":
                        wind_shear,

                    "vorticity":
                        vorticity,

                    "ocean_depth":
                        ocean_depth,

                    "proximity_to_coastline":
                        proximity_to_coastline
                },


                "availability": {

                    "sea_surface_temperature":
                        sea_surface_temperature
                        is not None,

                    "atmospheric_pressure":
                        pressure
                        is not None,

                    "humidity":
                        humidity
                        is not None,

                    "wind_shear":
                        wind_shear
                        is not None,

                    "vorticity":
                        vorticity
                        is not None,

                    "ocean_depth":
                        ocean_depth
                        is not None,

                    "proximity_to_coastline":
                        proximity_to_coastline
                        is not None
                }
            }


    except httpx.RequestError as error:

        print(
            "Open-Meteo connection error:",
            error
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Could not connect "
                "to Open-Meteo."
            )
        )


    except httpx.HTTPStatusError as error:

        print(
            "Open-Meteo HTTP error:",
            error
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Open-Meteo returned "
                "an HTTP error."
            )
        )


    except Exception as error:

        print(
            "Environment API error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to retrieve "
                "environmental data."
            )
        )


# =========================================================
# RANDOM FOREST PREDICTION
# =========================================================

@app.post("/api/predict")
async def predict_cyclone(
    request: PredictionRequest
):

    try:

        input_data = pd.DataFrame(

            [[

                request.sea_surface_temperature,

                request.atmospheric_pressure,

                request.humidity,

                request.wind_shear,

                request.vorticity,

                request.latitude,

                request.ocean_depth,

                request.proximity_to_coastline

            ]],

            columns=[

                "Sea_Surface_Temperature",

                "Atmospheric_Pressure",

                "Humidity",

                "Wind_Shear",

                "Vorticity",

                "Latitude",

                "Ocean_Depth",

                "Proximity_to_Coastline"
            ]
        )


        prediction = cyclone_model.predict(
            input_data
        )[0]


        probabilities = (
            cyclone_model.predict_proba(
                input_data
            )[0]
        )


        no_cyclone_probability = (
            probabilities[0] * 100
        )


        cyclone_probability = (
            probabilities[1] * 100
        )


        if cyclone_probability < 33:

            risk_level = "LOW"

        elif cyclone_probability < 66:

            risk_level = "MODERATE"

        else:

            risk_level = "HIGH"


        return {

            "success": True,

            "prediction":
                int(prediction),

            "cyclone_probability":
                round(
                    cyclone_probability,
                    2
                ),

            "no_cyclone_probability":
                round(
                    no_cyclone_probability,
                    2
                ),

            "risk_level":
                risk_level,

            "model":
                "Random Forest"
        }


    except Exception as error:

        print(
            "Prediction error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Prediction failed."
        )


# =========================================================
# CNN PREDICTION
# =========================================================

@app.post("/api/cnn-predict")
async def predict_cnn(
    request: PredictionRequest
):

    try:

        input_data = np.array(

            [[

                request.sea_surface_temperature,

                request.atmospheric_pressure,

                request.humidity,

                request.wind_shear,

                request.vorticity,

                request.latitude,

                request.ocean_depth,

                request.proximity_to_coastline

            ]],

            dtype=float
        )


        scaled_data = (
            cnn_scaler.transform(
                input_data
            )
        )


        cnn_input = (
            scaled_data.reshape(
                scaled_data.shape[0],
                scaled_data.shape[1],
                1
            )
        )


        probability = float(

            cnn_model.predict(
                cnn_input,
                verbose=0
            )[0][0]

        )


        cyclone_probability = (
            probability * 100
        )


        no_cyclone_probability = (
            (1 - probability) * 100
        )


        if cyclone_probability < 33:

            risk_level = "LOW"

        elif cyclone_probability < 66:

            risk_level = "MODERATE"

        else:

            risk_level = "HIGH"


        prediction = (
            1
            if probability >= 0.5
            else 0
        )


        return {

            "success": True,

            "prediction":
                prediction,

            "cyclone_probability":
                round(
                    cyclone_probability,
                    2
                ),

            "no_cyclone_probability":
                round(
                    no_cyclone_probability,
                    2
                ),

            "risk_level":
                risk_level,

            "model":
                "CNN"
        }


    except Exception as error:

        print(
            "CNN prediction error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="CNN prediction failed."
        )


# =========================================================
# CHAT
# =========================================================

@app.post("/api/chat")
async def chat(
    request: ChatRequest
):

    if not OPENROUTER_API_KEY:

        raise HTTPException(
            status_code=500,
            detail="OpenRouter API key missing."
        )


    system_prompt = """
You are CycloneGuard AI.

You are an AI assistant for cyclone awareness
and environmental information.

Provide clear, concise and responsible answers.

Never claim that an AI prediction is an official
cyclone warning.

Users should follow official government emergency
authorities for real-world warnings.
"""


    user_message = request.message


    if request.dashboard_context:

        user_message = (
            f"Dashboard context:\n"
            f"{request.dashboard_context}\n\n"
            f"User question:\n"
            f"{request.message}"
        )


    headers = {

        "Authorization":
            f"Bearer {OPENROUTER_API_KEY}",

        "Content-Type":
            "application/json",

        "HTTP-Referer":
            "http://localhost:5500",

        "X-Title":
            "CycloneGuard AI"
    }


    payload = {

        "model":
            MODEL,

        "messages": [

            {
                "role":
                    "system",

                "content":
                    system_prompt
            },

            {
                "role":
                    "user",

                "content":
                    user_message
            }

        ]
    }


    try:

        async with httpx.AsyncClient(
            timeout=60.0
        ) as client:

            response = await client.post(

                OPENROUTER_URL,

                headers=headers,

                json=payload
            )


            response.raise_for_status()


            data = response.json()


        choices = data.get(
            "choices",
            []
        )


        if not choices:

            return {

                "success": False,

                "reply":
                    "No response was generated."
            }


        reply = (
            choices[0]
            .get("message", {})
            .get("content", "")
        )


        return {

            "success": True,

            "reply": reply
        }


    except Exception as error:

        print(
            "Chat error:",
            error
        )

        raise HTTPException(

            status_code=500,

            detail=(
                "Unable to contact "
                "AI assistant."
            )
        )
if __name__ == "__main__":
   

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000
    )  
    