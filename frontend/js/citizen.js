"use strict";

/* =========================================================
   CYCLONEGUARD AI - CITIZEN DASHBOARD

   LIVE ENVIRONMENT VERSION

   Browser GPS
        ↓
   FastAPI
        ↓
   Open-Meteo
        ↓
   Live environmental data

   ========================================================= */


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const latitudeElement =
    document.getElementById("latitude");

const longitudeElement =
    document.getElementById("longitude");

const detectLocationButton =
    document.getElementById("detectLocation");

const locationStatus =
    document.getElementById("locationStatus");

const sstElement =
    document.getElementById("sst");

const pressureElement =
    document.getElementById("pressure");

const humidityElement =
    document.getElementById("humidity");

const windShearElement =
    document.getElementById("windShear");

const vorticityElement =
    document.getElementById("vorticity");

const oceanDepthElement =
    document.getElementById("oceanDepth");

const coastDistanceElement =
    document.getElementById("coastDistance");

const dataStatusElement =
    document.getElementById("dataStatus");

const riskLevelElement =
    document.getElementById("riskLevel");

const riskProbabilityElement =
    document.getElementById("riskProbability");

const chatMessages =
    document.getElementById("chatMessages");

const chatInput =
    document.getElementById("chatInput");

const sendMessageButton =
    document.getElementById("sendMessage");

const voiceButton =
    document.getElementById("voiceButton");

const voiceStatus =
    document.getElementById("voiceStatus");

const currentYear =
    document.getElementById("currentYear");

const logoutButton =
    document.getElementById("logoutButton");


/* =========================================================
   CONFIGURATION
   ========================================================= */

const BACKEND_URL =
    "https://cycloneguard-aibackend.vercel.app";

const CHAT_ENDPOINT =
    BACKEND_URL + "/api/chat";

const ENVIRONMENT_ENDPOINT =
    BACKEND_URL + "/api/environment";
const PREDICT_ENDPOINT =
    BACKEND_URL + "/api/predict";    


/* =========================================================
   STATE
   ========================================================= */

let voiceRecognition = null;

let voiceListening = false;

let voiceRequestInProgress = false;

let aiSpeaking = false;

let conversationHistory = [];


/* =========================================================
   YEAR
   ========================================================= */

if (currentYear) {

    currentYear.innerText =
        new Date().getFullYear();

}


/* =========================================================
   LIVE ENVIRONMENTAL DATA
   =========================================================

   IMPORTANT:

   These values start as null.

   We do NOT put fake environmental values here.

   ========================================================= */

const environmentalData = {

    sst: null,

    pressure: null,

    humidity: null,

    windShear: null,

    vorticity: null,

    oceanDepth: null,

    coastDistance: null,

    windSpeed10m: null,

    windDirection10m: null,

    windSpeed100m: null,

    windDirection100m: null,

    latitude: null,

    longitude: null,

    timestamp: null,

    prediction: null,

    cycloneProbability: null,

    noCycloneProbability: null,

    riskLevel: null,

    predictionModel: null

};
let riskMap = null;
let riskMapMarker = null;

/* =========================================================
   FORMAT VALUE
   ========================================================= */

function formatValue(
    value,
    unit = "",
    decimals = 2
) {

    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number.isNaN(Number(value))
    ) {

        return "Unavailable";

    }

    const number =
        Number(value);

    let formatted;

    if (Number.isInteger(number)) {

        formatted =
            String(number);

    } else {

        formatted =
            number.toFixed(decimals);

    }

    return unit
        ? formatted + " " + unit
        : formatted;

}


/* =========================================================
   DISPLAY ENVIRONMENTAL DATA
   ========================================================= */

function displayEnvironmentalData() {

    if (sstElement) {

        sstElement.innerText =
            formatValue(
                environmentalData.sst,
                "°C",
                2
            );

    }


    if (pressureElement) {

        pressureElement.innerText =
            formatValue(
                environmentalData.pressure,
                "hPa",
                1
            );

    }


    if (humidityElement) {

        humidityElement.innerText =
            formatValue(
                environmentalData.humidity,
                "%",
                0
            );

    }


    if (windShearElement) {

        windShearElement.innerText =
            formatValue(
                environmentalData.windShear,
                "knots",
                3
            );

    }


    if (vorticityElement) {

        vorticityElement.innerText =
            environmentalData.vorticity !== null
                ? String(environmentalData.vorticity)
                : "Unavailable";

    }


    if (oceanDepthElement) {

        oceanDepthElement.innerText =
            formatValue(
                environmentalData.oceanDepth,
                "m",
                0
            );

    }


    if (coastDistanceElement) {

        coastDistanceElement.innerText =
            formatValue(
                environmentalData.coastDistance,
                "km",
                2
            );

    }

}


/* =========================================================
   LOAD LIVE ENVIRONMENTAL DATA
   ========================================================= */

async function loadEnvironmentalData(
    latitude,
    longitude
) {

    if (
        latitude === null ||
        latitude === undefined ||
        longitude === null ||
        longitude === undefined
    ) {

        return false;

    }


    if (dataStatusElement) {

        dataStatusElement.innerText =
            "Loading live environmental data...";

    }


    try {

        const url =
            ENVIRONMENT_ENDPOINT +
            "?latitude=" +
            encodeURIComponent(latitude) +
            "&longitude=" +
            encodeURIComponent(longitude);


        const response =
            await fetch(url);


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                "Environment API error " +
                response.status +
                ": " +
                errorText
            );

        }


        const result =
            await response.json();


        if (
            !result ||
            result.success !== true
        ) {

            throw new Error(
                "Invalid environment response."
            );

        }


        const data =
            result.data || {};


        /* ---------------------------------------------
           SAVE LIVE VALUES
           --------------------------------------------- */

        environmentalData.latitude =
            latitude;

        environmentalData.longitude =
            longitude;


        environmentalData.sst =
            data.sea_surface_temperature;


        environmentalData.pressure =
            data.atmospheric_pressure;


        environmentalData.humidity =
            data.humidity;


        environmentalData.windShear =
            data.wind_shear;


        environmentalData.vorticity =
            data.vorticity;


        environmentalData.oceanDepth =
            data.ocean_depth;


        environmentalData.coastDistance =
            data.proximity_to_coastline;


        environmentalData.windSpeed10m =
            data.wind_speed_10m;


        environmentalData.windDirection10m =
            data.wind_direction_10m;


        environmentalData.windSpeed100m =
            data.wind_speed_100m;


        environmentalData.windDirection100m =
            data.wind_direction_100m;


        environmentalData.timestamp =
            result.timestamp || null;


        /* ---------------------------------------------
           UPDATE DASHBOARD
           --------------------------------------------- */

        displayEnvironmentalData();


        /* ---------------------------------------------
           DATA STATUS
           --------------------------------------------- */

        const availableCount = [

            environmentalData.sst,

            environmentalData.pressure,

            environmentalData.humidity,

            environmentalData.windShear,

            environmentalData.vorticity,

            environmentalData.oceanDepth,

            environmentalData.coastDistance

        ].filter(function (value) {

            return (
                value !== null &&
                value !== undefined
            );

        }).length;


        if (dataStatusElement) {

            if (availableCount >= 4) {

                dataStatusElement.innerText =
                    "Live environmental data";

            } else {

                dataStatusElement.innerText =
                    "Live data received - some values unavailable";

            }

        }


/* ---------------------------------------------
   RANDOM FOREST PREDICTION
   --------------------------------------------- */

await requestCyclonePrediction();

return true;


    } catch (error) {

        console.error(
            "Environmental data error:",
            error
        );


        if (dataStatusElement) {

            dataStatusElement.innerText =
                "Unable to load live environmental data";

        }


        displayEnvironmentalData();


     


        return false;

    }

}


/* =========================================================
   LOCATION
   ========================================================= */

async function detectLocation() {

    if (!navigator.geolocation) {

        if (locationStatus) {

            locationStatus.innerText =
                "Geolocation is not supported by this browser.";

        }

        return;

    }


    if (locationStatus) {

        locationStatus.innerText =
            "Detecting location...";

    }


    if (detectLocationButton) {

        detectLocationButton.disabled =
            true;

    }


    navigator.geolocation.getCurrentPosition(

        async function (position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            /* -----------------------------------------
               DISPLAY COORDINATES
               ----------------------------------------- */

            if (latitudeElement) {

                latitudeElement.innerText =
                    latitude.toFixed(5);

            }


            if (longitudeElement) {

                longitudeElement.innerText =
                    longitude.toFixed(5);

            }


            environmentalData.latitude =
                latitude;

            environmentalData.longitude =
                longitude;


            if (locationStatus) {

                locationStatus.innerText =
                    "Location detected. Loading live environmental data...";

            }


            /* -----------------------------------------
               GET LIVE ENVIRONMENT DATA
               ----------------------------------------- */

            const success =
                await loadEnvironmentalData(
                    latitude,
                    longitude
                );


            if (success) {

                if (locationStatus) {

                    locationStatus.innerText =
                        "Location and environmental data updated.";

                }

            } else {

                if (locationStatus) {

                    locationStatus.innerText =
                        "Location detected, but environmental data could not be loaded.";

                }

            }


            if (detectLocationButton) {

                detectLocationButton.disabled =
                    false;

            }

        },


        function (error) {

            console.error(
                "Location error:",
                error
            );


            let message =
                "Unable to detect location.";


            if (error.code === 1) {

                message =
                    "Location permission was denied.";

            } else if (error.code === 2) {

                message =
                    "Location information is unavailable.";

            } else if (error.code === 3) {

                message =
                    "Location request timed out.";

            }


            if (locationStatus) {

                locationStatus.innerText =
                    message;

            }


            if (detectLocationButton) {

                detectLocationButton.disabled =
                    false;

            }

        },


        {

            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 300000

        }

    );

}


/* =========================================================
   LOCATION BUTTON
   ========================================================= */

if (detectLocationButton) {

    detectLocationButton.addEventListener(
        "click",
        detectLocation
    );

}


/* =========================================================
   RISK CALCULATION
   =========================================================

   IMPORTANT:

   We do NOT calculate a fake risk if required
   environmental variables are unavailable.

   Vorticity is currently unavailable, so the
   dashboard will show DATA INCOMPLETE until
   that feature is implemented.

   ========================================================= */

// =========================================================
// RANDOM FOREST CYCLONE PREDICTION
// =========================================================

async function requestCyclonePrediction() {

    try {

        // Check that all 8 Random Forest features are available
        const requiredValues = [

            environmentalData.sst,

            environmentalData.pressure,

            environmentalData.humidity,

            environmentalData.windShear,

            environmentalData.vorticity,

            environmentalData.latitude,

            environmentalData.oceanDepth,

            environmentalData.coastDistance

        ];


        const hasMissingValue =
            requiredValues.some(function (value) {

                return (
                    value === null ||
                    value === undefined ||
                    Number.isNaN(Number(value))
                );

            });


        if (hasMissingValue) {

            console.log(
                "Random Forest prediction waiting for all environmental features."
            );


            if (riskLevelElement) {

                riskLevelElement.innerText =
                    "DATA INCOMPLETE";

            }


            if (riskProbabilityElement) {

                riskProbabilityElement.innerText =
                    "--";

            }


            environmentalData.riskLevel = null;

            environmentalData.cycloneProbability = null;

            environmentalData.noCycloneProbability = null;

            environmentalData.prediction = null;

            environmentalData.predictionModel = null;


            return false;

        }


        // =====================================================
        // PREPARE DATA FOR RANDOM FOREST
        // =====================================================

        const predictionData = {

            sea_surface_temperature:
                Number(environmentalData.sst),

            atmospheric_pressure:
                Number(environmentalData.pressure),

            humidity:
                Number(environmentalData.humidity),

            wind_shear:
                Number(environmentalData.windShear),

            vorticity:
                Number(environmentalData.vorticity),

            latitude:
                Number(environmentalData.latitude),

            ocean_depth:
                Number(environmentalData.oceanDepth),

            proximity_to_coastline:
                Number(environmentalData.coastDistance)

        };


        console.log(
            "Sending environmental data to Random Forest:",
            predictionData
        );


        // =====================================================
        // CALL FASTAPI /api/predict
        // =====================================================

        const response = await fetch(

            PREDICT_ENDPOINT,

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(predictionData)

            }

        );


        if (!response.ok) {

            throw new Error(
                "Prediction server returned HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(

                result.detail ||
                "Random Forest prediction failed."

            );

        }


        // =====================================================
        // SAVE RANDOM FOREST RESULT
        // =====================================================

        environmentalData.prediction =
            result.prediction;


        environmentalData.cycloneProbability =
            result.cyclone_probability;


        environmentalData.noCycloneProbability =
            result.no_cyclone_probability;


        environmentalData.riskLevel =
            result.risk_level;


        environmentalData.predictionModel =
            result.model;


        console.log(
            "Random Forest prediction:",
            result
        );


        // =====================================================
        // UPDATE DASHBOARD
        // =====================================================

        if (riskLevelElement) {

            riskLevelElement.innerText =
                result.risk_level;

        }


        if (riskProbabilityElement) {

            riskProbabilityElement.innerText =
                result.cyclone_probability + "%";

        }


        if (dataStatusElement) {

            dataStatusElement.innerText =
                "Live data + Random Forest prediction";

        }


        return true;


    } catch (error) {

        console.error(
            "Random Forest prediction error:",
            error
        );


        environmentalData.prediction =
            null;


        environmentalData.cycloneProbability =
            null;


        environmentalData.noCycloneProbability =
            null;


        environmentalData.riskLevel =
            null;


        environmentalData.predictionModel =
            null;


        if (riskLevelElement) {

            riskLevelElement.innerText =
                "PREDICTION UNAVAILABLE";

        }


        if (riskProbabilityElement) {

            riskProbabilityElement.innerText =
                "--";

        }


        return false;

    }

}


// =========================================================
// DISPLAY CURRENT RANDOM FOREST RISK
// =========================================================

function calculateRisk() {

    if (

        environmentalData.riskLevel &&

        environmentalData.cycloneProbability !== null &&

        environmentalData.cycloneProbability !== undefined

    ) {


        if (riskLevelElement) {

            riskLevelElement.innerText =
                environmentalData.riskLevel;

        }


        if (riskProbabilityElement) {

            riskProbabilityElement.innerText =
                environmentalData.cycloneProbability + "%";

        }


        return {

            risk:
                environmentalData.riskLevel,

            probability:
                environmentalData.cycloneProbability,

            prediction:
                environmentalData.prediction,

            model:
                environmentalData.predictionModel

        };

    }


    if (riskLevelElement) {

        riskLevelElement.innerText =
            "DATA INCOMPLETE";

    }


    if (riskProbabilityElement) {

        riskProbabilityElement.innerText =
            "--";

    }


      return {
        risk: "DATA INCOMPLETE",
        probability: null,
        prediction: null,
        model: null
    };

}


/* ============================================================
   RISK MAP INITIALIZATION
   ============================================================ */

function initializeRiskMap() {

    const mapElement = document.getElementById("riskMap");

    if (!mapElement) {
        console.warn("Risk map element not found.");
        return;
    }

    if (typeof L === "undefined") {
        console.error("Leaflet is not loaded.");
        return;
    }

    riskMap = L.map("riskMap").setView([20.5937, 78.9629], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(riskMap);

    riskMap.on("click", handleRiskMapClick);

    console.log("Risk map initialized.");
}
/* ============================================================
   MAP CLICK HANDLER
   ============================================================ */

async function handleRiskMapClick(event) {

    const latitude = event.latlng.lat;
    const longitude = event.latlng.lng;

    console.log(
        "Map location selected:",
        latitude,
        longitude
    );

    /* --------------------------------------------------------
       REMOVE PREVIOUS MARKER
       -------------------------------------------------------- */

    if (riskMapMarker) {
        riskMap.removeLayer(riskMapMarker);
    }

    /* --------------------------------------------------------
       CREATE NEW MARKER
       -------------------------------------------------------- */

    riskMapMarker = L.marker([
        latitude,
        longitude
    ]).addTo(riskMap);

    /* --------------------------------------------------------
       SHOW LOADING POPUP
       -------------------------------------------------------- */

    riskMapMarker
        .bindPopup(`
            <div class="map-popup">

                <div class="map-popup-title">
                    📍 Location Selected
                </div>

                <div class="map-popup-loading">

                    <div class="map-popup-loading-icon">
                        🌪️
                    </div>

                    <strong>
                        Loading location data...
                    </strong>

                    <p>
                        CycloneGuard AI is retrieving
                        environmental conditions.
                    </p>

                </div>

                <div class="map-popup-row">
                    Latitude:
                    ${latitude.toFixed(5)}
                </div>

                <div class="map-popup-row">
                    Longitude:
                    ${longitude.toFixed(5)}
                </div>

            </div>
        `)
        .openPopup();

    /* --------------------------------------------------------
       UPDATE DASHBOARD LOCATION
       -------------------------------------------------------- */

    environmentalData.latitude = latitude;
    environmentalData.longitude = longitude;

    if (latitudeElement) {
        latitudeElement.innerText =
            latitude.toFixed(5);
    }

    if (longitudeElement) {
        longitudeElement.innerText =
            longitude.toFixed(5);
    }

    if (locationStatus) {
        locationStatus.innerText =
            "Map location selected. Loading environmental data...";
    }

    /* --------------------------------------------------------
       CLEAR PREVIOUS PREDICTION
       -------------------------------------------------------- */

    environmentalData.prediction = null;
    environmentalData.cycloneProbability = null;
    environmentalData.noCycloneProbability = null;
    environmentalData.riskLevel = null;
    environmentalData.predictionModel = null;

    if (riskLevelElement) {
        riskLevelElement.innerText = "ANALYZING";
    }

    if (riskProbabilityElement) {
        riskProbabilityElement.innerText = "--";
    }

    /* --------------------------------------------------------
       LOAD ENVIRONMENTAL DATA
       -------------------------------------------------------- */

    const environmentLoaded =
        await loadEnvironmentalData(
            latitude,
            longitude
        );

    if (!environmentLoaded) {

        riskMapMarker
            .setPopupContent(`
                <div class="map-popup">

                    <div class="map-popup-title">
                        ⚠️ Data Loading Failed
                    </div>

                    <div class="map-popup-row">
                        Latitude:
                        ${latitude.toFixed(5)}
                    </div>

                    <div class="map-popup-row">
                        Longitude:
                        ${longitude.toFixed(5)}
                    </div>

                    <p>
                        Unable to load environmental
                        data for this location.
                    </p>

                </div>
            `)
            .openPopup();

        if (locationStatus) {
            locationStatus.innerText =
                "Environmental data could not be loaded for the selected location.";
        }

        return;
    }

    /* --------------------------------------------------------
       RUN RANDOM FOREST PREDICTION
       -------------------------------------------------------- */

    if (locationStatus) {
        locationStatus.innerText =
            "Environmental data loaded. Running Random Forest prediction...";
    }

    const predictionLoaded =
        await requestCyclonePrediction();

    if (!predictionLoaded) {

        riskMapMarker
            .setPopupContent(`
                <div class="map-popup">

                    <div class="map-popup-title">
                        ⚠️ Prediction Unavailable
                    </div>

                    <div class="map-popup-row">
                        Latitude:
                        ${latitude.toFixed(5)}
                    </div>

                    <div class="map-popup-row">
                        Longitude:
                        ${longitude.toFixed(5)}
                    </div>

                    <p>
                        Environmental data loaded,
                        but the Random Forest prediction
                        could not be completed.
                    </p>

                </div>
            `)
            .openPopup();

        return;
    }

    /* --------------------------------------------------------
       SHOW FINAL RESULT
       -------------------------------------------------------- */

    riskMapMarker
        .setPopupContent(`
            <div class="map-popup">

                <div class="map-popup-title">
                    🌪️ CycloneGuard AI Analysis
                </div>

                <div class="map-popup-row">
                    <strong>Latitude:</strong>
                    ${latitude.toFixed(5)}
                </div>

                <div class="map-popup-row">
                    <strong>Longitude:</strong>
                    ${longitude.toFixed(5)}
                </div>

                <div class="map-popup-risk">

                    <div class="map-popup-row">
                        <strong>Risk Level:</strong>
                        ${environmentalData.riskLevel}
                    </div>

                    <div class="map-popup-row">
                        <strong>Cyclone Probability:</strong>
                        ${environmentalData.cycloneProbability}%
                    </div>

                    <div class="map-popup-row">
                        <strong>Model:</strong>
                        ${environmentalData.predictionModel}
                    </div>

                </div>

                <div class="map-popup-footer">
                    Preliminary AI assessment.
                    Follow official cyclone warnings.
                </div>

            </div>
        `)
        .openPopup();

    if (locationStatus) {
        locationStatus.innerText =
            "Map location analyzed successfully.";
    }

    console.log(
        "Map prediction completed:",
        environmentalData
    );
}



/* =========================================================
   QUESTION NORMALIZATION
   ========================================================= */

function normalizeQuestion(question) {

    let text =
        String(question || "")
            .toLowerCase()
            .trim();


    text =
        text.replace(
            /\bcylone\b/g,
            "cyclone"
        );


    text =
        text.replace(
            /\bcyclon\b/g,
            "cyclone"
        );


    text =
        text.replace(
            /\bcyclones\b/g,
            "cyclone"
        );


    text =
        text.replace(
            /\bcycloneee\b/g,
            "cyclone"
        );


    text =
        text.replace(
            /\bahh\b/g,
            ""
        );


    text =
        text.replace(
            /\byah\b/g,
            ""
        );


    text =
        text.replace(
            /["']/g,
            ""
        );


    return text.trim();

}


/* =========================================================
   LOCAL FALLBACK AI
   ========================================================= */

function getAIResponse(question) {

    const text =
        normalizeQuestion(question);


    const risk =
        calculateRisk();


    /* ---------------------------------------------
       CURRENT RISK
       --------------------------------------------- */

    if (

        text.includes("cyclone today") ||

        text.includes("cyclone now") ||

        text.includes("cyclone currently") ||

        text.includes("cyclone chance today") ||

        text.includes("chance of a cyclone") ||

        text.includes("chance of cyclone") ||

        text.includes("possibility of cyclone") ||

        text.includes("is there a cyclone")

    ) {

        if (risk.probability === null) {

            return (

                "The current cyclone-risk calculation is " +

                "not available yet because some environmental " +

                "variables are still unavailable. Please wait " +

                "for complete environmental data. This dashboard " +

                "is not an official cyclone warning."

            );

        }


        return (

            "Based on the available environmental analysis, " +

            "the preliminary cyclone risk is " +

            risk.risk +

            ", with a model-estimated probability of approximately " +

            risk.probability +

            " percent. This is a preliminary AI risk assessment " +

            "and is not an official cyclone warning. Follow official " +

            "weather and disaster-management authorities for alerts."

        );

    }


    /* ---------------------------------------------
       LOCATION RISK
       --------------------------------------------- */

    if (

        text.includes("my area") ||

        text.includes("my location") ||

        text.includes("near me") ||

        text.includes("around me") ||

        text.includes("in my area") ||

        text.includes("risk here") ||

        text.includes("risk in my")

    ) {

        if (risk.probability === null) {

            return (

                "Your location has been detected, but the " +

                "cyclone-risk calculation is currently incomplete " +

                "because some environmental variables are unavailable."

            );

        }


        return (

            "Your current preliminary cyclone-risk assessment is " +

            risk.risk +

            ". The estimated model probability is approximately " +

            risk.probability +

            " percent. This is not an official warning."

        );

    }


    /* ---------------------------------------------
       ENVIRONMENT
       --------------------------------------------- */

    if (

        text.includes("environment") ||

        text.includes("environmental") ||

        text.includes("conditions") ||

        text.includes("weather data") ||

        text.includes("temperature") ||

        text.includes("pressure") ||

        text.includes("humidity") ||

        text.includes("wind shear") ||

        text.includes("vorticity")

    ) {

        return (

            "The current dashboard environmental data is: " +

            "Sea Surface Temperature " +

            formatValue(
                environmentalData.sst,
                "degrees Celsius",
                2
            ) +

            ". Atmospheric Pressure " +

            formatValue(
                environmentalData.pressure,
                "hectopascals",
                1
            ) +

            ". Humidity " +

            formatValue(
                environmentalData.humidity,
                "percent",
                0
            ) +

            ". Wind Shear " +

            formatValue(
                environmentalData.windShear,
                "knots",
                3
            ) +

            ". Vorticity " +

            formatValue(
                environmentalData.vorticity,
                "",
                6
            ) +

            "."

        );

    }


    /* ---------------------------------------------
       CYCLONE APPROACHING
       --------------------------------------------- */

    if (

        text.includes("cyclone coming") ||

        text.includes("cyclone hit") ||

        text.includes("cyclone arrives") ||

        text.includes("cyclone approaching") ||

        text.includes("what should i do") ||

        text.includes("what do i do") ||

        text.includes("cyclone is coming")

    ) {

        return (

            "If cyclone risk becomes high, stay indoors and " +

            "away from windows. Follow official evacuation " +

            "instructions. Keep drinking water, essential food, " +

            "medicines and important documents ready. Charge your " +

            "phone and power banks. Avoid flooded roads and " +

            "coastal areas."

        );

    }


    /* ---------------------------------------------
       EMERGENCY KIT
       --------------------------------------------- */

    if (

        text.includes("emergency kit") ||

        text.includes("emergency items") ||

        text.includes("what should i keep") ||

        text.includes("prepare") ||

        text.includes("preparation")

    ) {

        return (

            "An emergency kit should include drinking water, " +

            "non-perishable food, first-aid supplies, required " +

            "medicines, a flashlight, extra batteries, a power " +

            "bank, important documents and basic clothing."

        );

    }


    /* ---------------------------------------------
       SAFETY
       --------------------------------------------- */

    if (

        text.includes("stay safe") ||

        text.includes("safety") ||

        text.includes("safe") ||

        text.includes("protect")

    ) {

        return (

            "To stay safe during severe weather, stay indoors, " +

            "stay away from windows, avoid flooded and coastal " +

            "areas, keep your emergency kit ready and follow " +

            "official emergency instructions. Do not rely only " +

            "on an AI prediction."

        );

    }


    /* ---------------------------------------------
       LOCATION
       --------------------------------------------- */

    if (

        text.includes("what is my location") ||

        text.includes("where am i") ||

        text.includes("my coordinates") ||

        text.includes("my latitude") ||

        text.includes("my longitude")

    ) {

        if (

            latitudeElement &&

            longitudeElement &&

            latitudeElement.innerText !== "--"

        ) {

            return (

                "Your detected coordinates are latitude " +

                latitudeElement.innerText +

                " and longitude " +

                longitudeElement.innerText +

                "."

            );

        }


        return (

            "Your browser has not provided your location yet. " +

            "Please click the Detect Location button and allow " +

            "location access."

        );

    }


    /* ---------------------------------------------
       WHAT IS CYCLONE
       --------------------------------------------- */

    if (

        text.includes("what is cyclone") ||

        text.includes("define cyclone") ||

        text.includes("cyclone meaning")

    ) {

        return (

            "A cyclone is a large rotating weather system that " +

            "forms around a region of low atmospheric pressure. " +

            "Cyclones can produce strong winds, heavy rainfall, " +

            "storm surges and flooding."

        );

    }


    /* ---------------------------------------------
       PROBABILITY
       --------------------------------------------- */

    if (

        text.includes("probability") ||

        text.includes("percentage") ||

        text.includes("percent chance") ||

        text.includes("chance")

    ) {

        if (risk.probability === null) {

            return (

                "The cyclone probability cannot be calculated " +

                "yet because some required environmental data " +

                "is unavailable."

            );

        }


        return (

            "The current preliminary model-estimated cyclone " +

            "probability is approximately " +

            risk.probability +

            " percent, with a " +

            risk.risk +

            " risk classification."

        );

    }


    /* ---------------------------------------------
       HELP
       --------------------------------------------- */

    if (

        text === "help" ||

        text.includes("what can you do") ||

        text.includes("how can you help")

    ) {

        return (

            "I can help you with cyclone-risk analysis, " +

            "environmental conditions, emergency preparation, " +

            "cyclone safety and your detected location. " +

            "You can type your question or use the microphone button."

        );

    }


    return (

        "I can help you with cyclone-risk analysis, " +

        "environmental conditions, safety and emergency " +

        "preparation. Try asking about cyclone risk, " +

        "environmental conditions, safety or emergency preparation."

    );

}


/* =========================================================
   CHAT MESSAGE
   ========================================================= */

function addMessage(
    message,
    sender
) {

    if (!chatMessages) {

        return;

    }


    const messageElement =
        document.createElement("div");


    messageElement.classList.add(
        "chat-message",
        sender
    );


    messageElement.innerText =
        message;


    chatMessages.appendChild(
        messageElement
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


/* =========================================================
   VOICE STATUS
   ========================================================= */

function setVoiceStatus(message) {

    if (voiceStatus) {

        voiceStatus.innerText =
            message;

    }

}


/* =========================================================
   VOICE BUTTON STATE
   ========================================================= */

function setVoiceButtonState(active) {

    if (!voiceButton) {

        return;

    }


    if (active) {

        voiceButton.classList.add(
            "listening"
        );

        voiceButton.innerText =
            "🔴";

    } else {

        voiceButton.classList.remove(
            "listening"
        );

        voiceButton.innerText =
            "🎤";

    }

}


/* =========================================================
   DASHBOARD CONTEXT
   ========================================================= */

function getDashboardContext() {

    const risk =
        calculateRisk();


    const latitude =
        latitudeElement
            ? latitudeElement.innerText
            : "unknown";


    const longitude =
        longitudeElement
            ? longitudeElement.innerText
            : "unknown";


    return `

Current CycloneGuard dashboard context:

Sea Surface Temperature:
${formatValue(environmentalData.sst, "°C", 2)}

Atmospheric Pressure:
${formatValue(environmentalData.pressure, "hPa", 1)}

Humidity:
${formatValue(environmentalData.humidity, "%", 0)}

Wind Shear:
${formatValue(environmentalData.windShear, "knots", 3)}

Vorticity:
${formatValue(environmentalData.vorticity, "", 6)}

Ocean Depth:
${formatValue(environmentalData.oceanDepth, "m", 0)}

Distance from Coastline:
${formatValue(environmentalData.coastDistance, "km", 2)}

Wind Speed at 10m:
${formatValue(environmentalData.windSpeed10m, "knots", 2)}

Wind Direction at 10m:
${formatValue(environmentalData.windDirection10m, "degrees", 0)}

Wind Speed at 100m:
${formatValue(environmentalData.windSpeed100m, "knots", 2)}

Wind Direction at 100m:
${formatValue(environmentalData.windDirection100m, "degrees", 0)}

Detected Latitude:
${latitude}

Detected Longitude:
${longitude}

Current preliminary risk:
${risk.risk}

Current preliminary probability:
${risk.probability !== null
        ? risk.probability + "%"
        : "Unavailable"}

Data source:
Open-Meteo through CycloneGuard backend.

Important:
These environmental values are externally sourced data.
CycloneGuard predictions are not official government warnings.
`;


}


/* =========================================================
   CONVERSATION CONTEXT
   ========================================================= */

function getConversationContext() {

    if (
        conversationHistory.length === 0
    ) {

        return "";

    }


    const recent =
        conversationHistory.slice(-8);


    return recent.map(
        function (item) {

            return (

                item.role.toUpperCase() +

                ": " +

                item.content

            );

        }

    ).join("\n");

}


/* =========================================================
   OPENROUTER REQUEST
   ========================================================= */

async function askOpenRouter(message) {

    const dashboardContext =
        getDashboardContext();


    const previousConversation =
        getConversationContext();


    let context =
        dashboardContext;


    if (previousConversation) {

        context +=
            "\n\nRECENT CONVERSATION:\n" +
            previousConversation;

    }


    const response =
        await fetch(

            CHAT_ENDPOINT,

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    message:
                        message,

                    dashboard_context:
                        context

                })

            }

        );


    if (!response.ok) {

        const errorText =
            await response.text();


        throw new Error(

            "Backend error " +

            response.status +

            ": " +

            errorText

        );

    }


    const data =
        await response.json();


    if (
        !data ||
        !data.answer
    ) {

        throw new Error(
            "No AI answer received from backend."
        );

    }


    return String(
        data.answer
    ).trim();

}


/* =========================================================
   STOP SPEAKING
   ========================================================= */

function stopSpeaking() {

    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis.cancel();

    }


    aiSpeaking =
        false;

}


/* =========================================================
   SPEAK AI RESPONSE
   ========================================================= */

function speakResponse(text) {

    return new Promise(
        function (resolve) {

            if (
                !("speechSynthesis" in window)
            ) {

                setVoiceStatus(
                    "Voice output is not supported."
                );

                resolve();

                return;

            }


            stopSpeaking();


            const utterance =
                new SpeechSynthesisUtterance(
                    text
                );


            utterance.lang =
                "en-IN";


            utterance.rate =
                0.95;


            utterance.pitch =
                1.0;


            utterance.volume =
                1.0;


            const voices =
                window.speechSynthesis.getVoices();


            const preferredVoice =
                voices.find(
                    function (voice) {

                        return (

                            voice.lang === "en-IN" ||

                            voice.lang === "en-GB" ||

                            voice.lang === "en-US"

                        );

                    }
                );


            if (preferredVoice) {

                utterance.voice =
                    preferredVoice;

            }


            aiSpeaking =
                true;


            setVoiceStatus(
                "Speaking..."
            );


            utterance.onend =
                function () {

                    aiSpeaking =
                        false;


                    setVoiceStatus(
                        "Voice assistant ready"
                    );


                    resolve();

                };


            utterance.onerror =
                function (error) {

                    console.error(
                        "Speech synthesis error:",
                        error
                    );


                    aiSpeaking =
                        false;


                    setVoiceStatus(
                        "Voice assistant ready"
                    );


                    resolve();

                };


            window.speechSynthesis.speak(
                utterance
            );

        }
    );

}


/* =========================================================
   PROCESS AI MESSAGE
   ========================================================= */

async function processAIMessage(
    message,
    speak = false
) {

    const cleanMessage =
        String(message || "").trim();


    if (!cleanMessage) {

        return;

    }


    conversationHistory.push({

        role: "user",

        content:
            cleanMessage

    });


    setVoiceStatus(
        "Thinking..."
    );


    try {

        const answer =
            await askOpenRouter(
                cleanMessage
            );


        conversationHistory.push({

            role: "assistant",

            content:
                answer

        });


        addMessage(
            answer,
            "assistant"
        );


        if (speak) {

            await speakResponse(
                answer
            );

        } else {

            setVoiceStatus(
                "Voice assistant ready"
            );

        }


        return answer;


    } catch (error) {

        console.error(
            "OpenRouter request failed:",
            error
        );


        const fallback =
            getAIResponse(
                cleanMessage
            );


        conversationHistory.push({

            role: "assistant",

            content:
                fallback

        });


        addMessage(
            fallback,
            "assistant"
        );


        if (speak) {

            await speakResponse(
                fallback
            );

        } else {

            setVoiceStatus(
                "AI server unavailable - local response used"
            );

        }


        return fallback;

    }

}


/* =========================================================
   CREATE SPEECH RECOGNITION
   ========================================================= */

function createVoiceRecognition() {

    const Recognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!Recognition) {

        return null;

    }


    const recognition =
        new Recognition();


    recognition.lang =
        "en-IN";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.maxAlternatives =
        1;


    recognition.onstart =
        function () {

            voiceListening =
                true;


            setVoiceButtonState(
                true
            );


            setVoiceStatus(
                "Listening..."
            );

        };


    recognition.onresult =
        async function (event) {

            const result =
                event.results[0];


            if (
                !result ||
                !result[0]
            ) {

                return;

            }


            const transcript =
                result[0]
                    .transcript
                    .trim();


            if (!transcript) {

                return;

            }


            console.log(
                "Voice input:",
                transcript
            );


            addMessage(
                transcript,
                "user"
            );


            voiceRequestInProgress =
                true;


            try {

                await processAIMessage(
                    transcript,
                    true
                );

            } finally {

                voiceRequestInProgress =
                    false;

            }

        };


    recognition.onerror =
        function (event) {

            console.error(
                "Speech recognition error:",
                event.error
            );


            if (
                event.error ===
                "not-allowed"
            ) {

                setVoiceStatus(
                    "Microphone permission was denied."
                );

            } else if (
                event.error ===
                "no-speech"
            ) {

                setVoiceStatus(
                    "No speech detected. Try again."
                );

            } else {

                setVoiceStatus(
                    "Voice input error: " +
                    event.error
                );

            }

        };


    recognition.onend =
        function () {

            voiceListening =
                false;


            setVoiceButtonState(
                false
            );


            if (
                !voiceRequestInProgress &&
                !aiSpeaking
            ) {

                setVoiceStatus(
                    "Voice assistant ready"
                );

            }

        };


    return recognition;

}


/* =========================================================
   START VOICE ASSISTANT
   ========================================================= */

async function connectRealtimeVoice() {

    if (voiceListening) {

        return;

    }


    if (voiceRequestInProgress) {

        setVoiceStatus(
            "Please wait for the current answer."
        );

        return;

    }


    const Recognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!Recognition) {

        setVoiceStatus(
            "Speech recognition is not supported. Use Google Chrome."
        );

        return;

    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        setVoiceStatus(
            "Microphone access is not available."
        );

        return;

    }


    try {

        const stream =
            await navigator.mediaDevices
                .getUserMedia({
                    audio: true
                });


        stream.getTracks()
            .forEach(
                function (track) {

                    track.stop();

                }
            );


    } catch (error) {

        console.error(
            "Microphone permission error:",
            error
        );


        setVoiceStatus(
            "Microphone permission is required."
        );

        return;

    }


    stopSpeaking();


    voiceRecognition =
        createVoiceRecognition();


    if (!voiceRecognition) {

        setVoiceStatus(
            "Speech recognition is not supported."
        );

        return;

    }


    try {

        voiceRecognition.start();

    } catch (error) {

        console.error(
            "Could not start speech recognition:",
            error
        );


        setVoiceStatus(
            "Could not start the microphone."
        );

    }

}


/* =========================================================
   STOP VOICE ASSISTANT
   ========================================================= */

function disconnectRealtimeVoice() {

    console.log(
        "Stopping CycloneGuard voice assistant..."
    );


    if (voiceRecognition) {

        try {

            voiceRecognition.stop();

        } catch (error) {

            console.warn(error);

        }


        voiceRecognition =
            null;

    }


    voiceListening =
        false;


    voiceRequestInProgress =
        false;


    stopSpeaking();


    setVoiceButtonState(
        false
    );


    setVoiceStatus(
        "Voice assistant ready"
    );

}


/* =========================================================
   MICROPHONE BUTTON
   ========================================================= */

if (voiceButton) {

    voiceButton.addEventListener(

        "click",

        async function () {

            if (voiceListening) {

                disconnectRealtimeVoice();

                return;

            }


            if (aiSpeaking) {

                stopSpeaking();

            }


            await connectRealtimeVoice();

        }

    );

}


/* =========================================================
   TEXT CHAT
   ========================================================= */

async function sendTextMessage() {

    if (!chatInput) {

        return;

    }


    const message =
        chatInput.value.trim();


    if (!message) {

        return;

    }


    addMessage(
        message,
        "user"
    );


    chatInput.value =
        "";


    await processAIMessage(
        message,
        false
    );

}


/* =========================================================
   SEND BUTTON
   ========================================================= */

if (sendMessageButton) {

    sendMessageButton.addEventListener(
        "click",
        sendTextMessage
    );

}


/* =========================================================
   ENTER KEY
   ========================================================= */

if (chatInput) {

    chatInput.addEventListener(

        "keydown",

        function (event) {

            if (

                event.key === "Enter" &&

                !event.shiftKey

            ) {

                event.preventDefault();

                sendTextMessage();

            }

        }

    );

}


/* =========================================================
   QUICK QUESTIONS
   ========================================================= */

document
    .querySelectorAll(".quick-question")
    .forEach(

        function (button) {

            button.addEventListener(

                "click",

                function () {

                    const question =
                        button.innerText.trim();


                    if (chatInput) {

                        chatInput.value =
                            question;


                        sendTextMessage();

                    } else {

                        addMessage(
                            question,
                            "user"
                        );


                        processAIMessage(
                            question,
                            false
                        );

                    }

                }

            );

        }

    );


/* =========================================================
   LOGOUT
   ========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(

        "click",

        function () {

            disconnectRealtimeVoice();


            conversationHistory =
                [];


            sessionStorage.clear();


            window.location.href =
                "index.html";

        }

    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

displayEnvironmentalData();

calculateRisk();

initializeRiskMap();

setVoiceStatus(
    "Voice assistant ready"
);

/* =========================================================
   BROWSER VOICE INITIALIZATION
   ========================================================= */

if (
    "speechSynthesis" in window
) {

    window.speechSynthesis.getVoices();

}


/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(

    "beforeunload",

    function () {

        disconnectRealtimeVoice();

    }

);