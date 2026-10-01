// ============================================================
// CYCLONEGUARD AI
// OFFICIAL DASHBOARD
// LIVE MAP + ENVIRONMENT + RANDOM FOREST
// ============================================================

"use strict";


// ============================================================
// CONFIGURATION
// ============================================================

const BACKEND_URL =
    "http://127.0.0.1:8000";


// ============================================================
// AUTHENTICATION
// ============================================================

const role =
    sessionStorage.getItem(
        "userRole"
    );


const email =
    sessionStorage.getItem(
        "userEmail"
    );


if (
    role !== "official" ||
    !email
) {

    window.location.href =
        "../index.html";

}


// ============================================================
// HTML ELEMENTS
// ============================================================

const activeCyclones =
    document.getElementById(
        "activeCyclones"
    );


const highRisk =
    document.getElementById(
        "highRisk"
    );


const moderateRisk =
    document.getElementById(
        "moderateRisk"
    );


const lowRisk =
    document.getElementById(
        "lowRisk"
    );


const officialSST =
    document.getElementById(
        "officialSST"
    );


const officialPressure =
    document.getElementById(
        "officialPressure"
    );


const officialHumidity =
    document.getElementById(
        "officialHumidity"
    );


const officialWindShear =
    document.getElementById(
        "officialWindShear"
    );


const officialPrediction =
    document.getElementById(
        "officialPrediction"
    );


const officialProbability =
    document.getElementById(
        "officialProbability"
    );


const officialRisk =
    document.getElementById(
        "officialRisk"
    );


const detectLocationButton =
    document.getElementById(
        "detectLocation"
    );


const mapStatus =
    document.getElementById(
        "mapStatus"
    );


const mapRiskBadge =
    document.getElementById(
        "mapRiskBadge"
    );


const alerts =
    document.getElementById(
        "alerts"
    );


const logoutButton =
    document.getElementById(
        "logout"
    );


// ============================================================
// LIVE DATA
// ============================================================

let currentLatitude =
    null;


let currentLongitude =
    null;


let environmentalData =
    null;


let predictionData =
    null;


// ============================================================
// MAP
// ============================================================

let officialMap =
    null;


let currentMarker =
    null;


let currentRiskCircle =
    null;


// ============================================================
// INITIALIZE MAP
// ============================================================

function initializeMap() {

    const mapElement =
        document.getElementById(
            "officialMap"
        );


    if (!mapElement) {

        console.error(
            "Map element not found."
        );

        return;

    }


    officialMap =
        L.map(
            "officialMap"
        ).setView(
            [20.5937, 78.9629],
            5
        );


    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom: 19,

            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

        }

    ).addTo(
        officialMap
    );


    L.control.scale().addTo(
        officialMap
    );
// ====================================================
// CLICK ANYWHERE ON MAP
// ====================================================

officialMap.on(
    "click",
    function (event) {

        const latitude =
            event.latlng.lat;

        const longitude =
            event.latlng.lng;

        console.log(
            "Map clicked:",
            latitude,
            longitude
        );

        // Show marker immediately
        // with "Analyzing cyclone risk..."
        showSelectedLocation(
            latitude,
            longitude
        );

        // Then load environmental data
        // and run Random Forest prediction
        analyzeMapLocation(
            latitude,
            longitude
        );

    }
);
}

// ============================================================
// RISK COLOR
// ============================================================

function getRiskColor(
    riskLevel
) {

    const risk =
        String(
            riskLevel || ""
        ).toUpperCase();


    if (
        risk === "HIGH"
    ) {

        return "#ff3b3b";

    }


    if (
        risk === "MODERATE"
    ) {

        return "#ff9f1c";

    }


    return "#25d366";

}


// ============================================================
// UPDATE MAP
// ============================================================

function updateRiskMap(
    latitude,
    longitude,
    riskLevel,
    probability
) {

    if (!officialMap) {

        return;

    }


    const color =
        getRiskColor(
            riskLevel
        );


    // --------------------------------------------
    // Move map
    // --------------------------------------------

    officialMap.setView(
        [
            latitude,
            longitude
        ],
        9,
        {
            animate: true
        }
    );


    // --------------------------------------------
    // Remove old marker
    // --------------------------------------------

    if (currentMarker) {

        officialMap.removeLayer(
            currentMarker
        );

    }


    // --------------------------------------------
    // Remove old circle
    // --------------------------------------------

    if (currentRiskCircle) {

        officialMap.removeLayer(
            currentRiskCircle
        );

    }


    // --------------------------------------------
    // Create marker
    // --------------------------------------------

    const markerIcon =
        L.divIcon({

            className:
                "cyclone-risk-marker",

            html:
                `
                <div
                    style="
                        width:20px;
                        height:20px;
                        border-radius:50%;
                        background:${color};
                        border:3px solid white;
                        box-shadow:
                            0 0 12px ${color};
                    "
                ></div>
                `,

            iconSize:
                [20, 20],

            iconAnchor:
                [10, 10]

        });


    currentMarker =
        L.marker(
            [
                latitude,
                longitude
            ],
            {
                icon:
                    markerIcon
            }
        ).addTo(
            officialMap
        );


    // --------------------------------------------
    // Popup
    // --------------------------------------------

    currentMarker.bindPopup(

        `
        <div
            style="
                min-width:190px;
                font-family:Arial,sans-serif;
            "
        >

            <strong>
                CycloneGuard AI
            </strong>

            <br><br>

            <b>Location</b><br>

            ${latitude.toFixed(5)}° N<br>

            ${longitude.toFixed(5)}° E

            <br><br>

            <b>Risk Level:</b>
            ${riskLevel}

            <br>

            <b>Cyclone Probability:</b>
            ${probability}%

            <br><br>

            <small>
                Preliminary AI assessment.
                Not an official cyclone warning.
            </small>

        </div>
        `

    );


    // --------------------------------------------
    // Risk radius
    // --------------------------------------------

    currentRiskCircle =
        L.circle(

            [
                latitude,
                longitude
            ],

            {

                radius:
                    30000,

                color:
                    color,

                fillColor:
                    color,

                fillOpacity:
                    0.12,

                weight:
                    2

            }

        ).addTo(
            officialMap
        );


    // --------------------------------------------
    // Open popup
    // --------------------------------------------

    currentMarker.openPopup();

}


// ============================================================
// UPDATE RISK CARDS
// ============================================================

function updateRiskCards(
    prediction
) {

    const probability =
        Number(
            prediction.cyclone_probability
        );


    const riskLevel =
        String(
            prediction.risk_level || "UNKNOWN"
        ).toUpperCase();


    // --------------------------------------------
    // Prediction
    // --------------------------------------------

    if (
        Number(
            prediction.prediction
        ) === 1
    ) {

        officialPrediction.innerText =
            "CYCLONE";

    } else {

        officialPrediction.innerText =
            "NO CYCLONE";

    }


    // --------------------------------------------
    // Probability
    // --------------------------------------------

    officialProbability.innerText =
        probability +
        "%";


    // --------------------------------------------
    // Risk
    // --------------------------------------------

    officialRisk.innerText =
        riskLevel;


    // --------------------------------------------
    // Statistics
    // --------------------------------------------

    activeCyclones.innerText =
        Number(
            prediction.prediction
        ) === 1
            ? "1"
            : "0";


    highRisk.innerText =
        riskLevel === "HIGH"
            ? "1"
            : "0";


    moderateRisk.innerText =
        riskLevel === "MODERATE"
            ? "1"
            : "0";


    lowRisk.innerText =
        riskLevel === "LOW"
            ? "1"
            : "0";


    // --------------------------------------------
    // Map badge
    // --------------------------------------------

    mapRiskBadge.style.display =
        "inline-block";


    mapRiskBadge.className =
        "risk-badge";


    if (
        riskLevel === "HIGH"
    ) {

        mapRiskBadge.classList.add(
            "risk-high"
        );

    }

    else if (
        riskLevel === "MODERATE"
    ) {

        mapRiskBadge.classList.add(
            "risk-moderate"
        );

    }

    else {

        mapRiskBadge.classList.add(
            "risk-low"
        );

    }


    mapRiskBadge.innerText =
        riskLevel +
        " • " +
        probability +
        "% cyclone probability";


    // --------------------------------------------
    // Update map
    // --------------------------------------------

    updateRiskMap(

        currentLatitude,

        currentLongitude,

        riskLevel,

        probability

    );


    // --------------------------------------------
    // Update alert
    // --------------------------------------------

    updateAlerts(
        riskLevel,
        probability
    );

}


// ============================================================
// UPDATE ALERTS
// ============================================================

function updateAlerts(
    riskLevel,
    probability
) {

    if (!alerts) {

        return;

    }


    if (
        riskLevel === "HIGH"
    ) {

        alerts.innerHTML =

            `
            <div class="alert-item">

                <span>
                    🔴
                </span>

                <div>

                    <strong>
                        High AI Risk Signal
                    </strong>

                    <p>
                        The Random Forest model estimates
                        a cyclone probability of
                        ${probability}% at the detected location.
                        Follow official authorities for warnings.
                    </p>

                </div>

            </div>
            `;

        return;

    }


    if (
        riskLevel === "MODERATE"
    ) {

        alerts.innerHTML =

            `
            <div class="alert-item">

                <span>
                    🟠
                </span>

                <div>

                    <strong>
                        Moderate AI Risk Signal
                    </strong>

                    <p>
                        The Random Forest model estimates
                        a cyclone probability of
                        ${probability}% at the detected location.
                    </p>

                </div>

            </div>
            `;

        return;

    }


    alerts.innerHTML =

        `
        <div class="alert-item">

            <span>
                🟢
            </span>

            <div>

                <strong>
                    No Significant AI Risk Signal
                </strong>

                <p>
                    The current model assessment does not
                    indicate a high cyclone-risk signal at
                    the detected location.
                </p>

            </div>

        </div>
        `;

}


// ============================================================
// UPDATE ENVIRONMENT
// ============================================================

function updateEnvironment(
    data
) {

    environmentalData =
        data;


    if (
        data.sea_surface_temperature !== null &&
        data.sea_surface_temperature !== undefined
    ) {

        officialSST.innerText =
            Number(
                data.sea_surface_temperature
            ).toFixed(1) +
            " °C";

    }


    if (
        data.atmospheric_pressure !== null &&
        data.atmospheric_pressure !== undefined
    ) {

        officialPressure.innerText =
            Number(
                data.atmospheric_pressure
            ).toFixed(1) +
            " hPa";

    }


    if (
        data.humidity !== null &&
        data.humidity !== undefined
    ) {

        officialHumidity.innerText =
            Number(
                data.humidity
            ).toFixed(0) +
            " %";

    }


    if (
        data.wind_shear !== null &&
        data.wind_shear !== undefined
    ) {

        officialWindShear.innerText =
            Number(
                data.wind_shear
            ).toFixed(2) +
            " knots";

    }


    const statusElements = [

        "sstStatus",

        "pressureStatus",

        "humidityStatus",

        "windShearStatus"

    ];


    statusElements.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );

            if (element) {

                element.innerText =
                    "Live";

            }

        }
    );

}


// ============================================================
// GET ENVIRONMENT
// ============================================================

async function getEnvironment(
    latitude,
    longitude
) {

    mapStatus.innerText =
        "Loading live environmental data...";


    const url =
        `${BACKEND_URL}/api/environment` +
        `?latitude=${encodeURIComponent(latitude)}` +
        `&longitude=${encodeURIComponent(longitude)}`;


    const response =
        await fetch(url);


    if (!response.ok) {

        const errorText =
            await response.text();

        throw new Error(
            "Environment request failed: HTTP " +
            response.status +
            " " +
            errorText
        );

    }


    const result =
        await response.json();


    console.log(
        "Environment response:",
        result
    );


    if (!result.success) {

        throw new Error(
            result.detail ||
            "Backend did not return environmental data."
        );

    }


    // ========================================================
    // BACKEND ENVIRONMENT DATA
    // ========================================================

    const environment =
        result.data;


    if (!environment) {

        throw new Error(
            "Environmental data is missing from backend response."
        );

    }


    console.log(
        "Environment data received:",
        environment
    );


    // ========================================================
    // CHECK REQUIRED VALUES
    // ========================================================

    const requiredValues = {

        sea_surface_temperature:
            environment.sea_surface_temperature,

        atmospheric_pressure:
            environment.atmospheric_pressure,

        humidity:
            environment.humidity,

        wind_shear:
            environment.wind_shear,

        vorticity:
            environment.vorticity,

        ocean_depth:
            environment.ocean_depth,

        proximity_to_coastline:
            environment.proximity_to_coastline

    };


    console.log(
        "Required prediction values:",
        requiredValues
    );


    // ========================================================
    // UPDATE ENVIRONMENTAL DASHBOARD
    // ========================================================

    updateEnvironment(
        environment
    );


    // ========================================================
    // RETURN ENVIRONMENT
    // ========================================================

    return {

        sea_surface_temperature:
            environment.sea_surface_temperature,

        atmospheric_pressure:
            environment.atmospheric_pressure,

        humidity:
            environment.humidity,

        wind_shear:
            environment.wind_shear,

        vorticity:
            environment.vorticity,

        latitude:
            Number(latitude),

        ocean_depth:
            environment.ocean_depth,

        proximity_to_coastline:
            environment.proximity_to_coastline,

        wind_speed_10m:
            environment.wind_speed_10m,

        wind_direction_10m:
            environment.wind_direction_10m,

        wind_speed_100m:
            environment.wind_speed_100m,

        wind_direction_100m:
            environment.wind_direction_100m

    };

}

// ============================================================
// GET RANDOM FOREST PREDICTION
// ============================================================

async function getPrediction(environment) {

    // --------------------------------------------------------
    // CHECK REQUIRED MODEL FEATURES
    // --------------------------------------------------------

    const requiredValues = [
        environment.sea_surface_temperature,
        environment.atmospheric_pressure,
        environment.humidity,
        environment.wind_shear,
        environment.vorticity,
        environment.latitude,
        environment.ocean_depth,
        environment.proximity_to_coastline
    ];

    const hasMissingValue = requiredValues.some(function (value) {

        return (
            value === null ||
            value === undefined ||
            value === "" ||
            Number.isNaN(Number(value))
        );

    });


    // --------------------------------------------------------
    // STOP IF ENVIRONMENTAL DATA IS INCOMPLETE
    // --------------------------------------------------------

    if (hasMissingValue) {

        console.warn(
            "Prediction skipped because environmental data is incomplete:",
            environment
        );

        mapStatus.innerText =
            "Environmental data incomplete. Prediction unavailable.";

        return {
            success: false,
            prediction: null,
            cyclone_probability: null,
            no_cyclone_probability: null,
            risk_level: "DATA INCOMPLETE",
            model: "Random Forest"
        };

    }


    // --------------------------------------------------------
    // RUN RANDOM FOREST
    // --------------------------------------------------------

    mapStatus.innerText =
        "Running Random Forest cyclone-risk analysis...";


    const payload = {

        sea_surface_temperature:
            Number(environment.sea_surface_temperature),

        atmospheric_pressure:
            Number(environment.atmospheric_pressure),

        humidity:
            Number(environment.humidity),

        wind_shear:
            Number(environment.wind_shear),

        vorticity:
            Number(environment.vorticity),

        latitude:
            Number(environment.latitude),

        ocean_depth:
            Number(environment.ocean_depth),

        proximity_to_coastline:
            Number(environment.proximity_to_coastline)

    };


    console.log(
        "Prediction payload:",
        payload
    );


    const response = await fetch(
        `${BACKEND_URL}/api/predict`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(payload)
        }
    );


    if (!response.ok) {

        const errorText =
            await response.text();

        throw new Error(
            "Prediction request failed: HTTP " +
            response.status +
            " " +
            errorText
        );

    }


    const data =
        await response.json();


    console.log(
        "Prediction response:",
        data
    );


    if (!data.success) {

        throw new Error(
            data.detail ||
            "Prediction was unsuccessful."
        );

    }


    predictionData =
        data;

    return data;

}
// ============================================================
// ANALYZE ANY MAP LOCATION
// ============================================================

async function analyzeMapLocation(
    latitude,
    longitude
) {

    try {

        // Save selected coordinates

        currentLatitude =
            latitude;

        currentLongitude =
            longitude;


        // Show status

        mapStatus.innerText =
            "📍 Location selected. Loading environmental data...";


        // Disable button while analysing

        detectLocationButton.disabled =
            true;


        // ----------------------------------------------------
        // GET ENVIRONMENTAL DATA
        // ----------------------------------------------------

        const environment =
            await getEnvironment(
                latitude,
                longitude
            );


        // ----------------------------------------------------
        // RUN RANDOM FOREST
        // ----------------------------------------------------

        mapStatus.innerText =
            "🤖 Running AI cyclone-risk analysis...";


        const prediction =
            await getPrediction(
                environment
            );


        // ----------------------------------------------------
        // UPDATE DASHBOARD
        // ----------------------------------------------------

        updateRiskCards(
            prediction
        );


        // ----------------------------------------------------
        // FINAL STATUS
        // ----------------------------------------------------

        mapStatus.innerText =

            "Live analysis complete • " +

            latitude.toFixed(5) +

            "° N, " +

            longitude.toFixed(5) +

            "° E";


    }

    catch (error) {

        console.error(
            "Map location analysis error:",
            error
        );


        mapStatus.innerText =
            "Unable to analyze selected location: " +
            error.message;

    }

    finally {

        detectLocationButton.disabled =
            false;

    }

}
// ============================================================
// SHOW CLICKED LOCATION IMMEDIATELY
// ============================================================

function showSelectedLocation(
    latitude,
    longitude
) {

    if (!officialMap) {
        return;
    }


    // Remove previous marker

    if (currentMarker) {

        officialMap.removeLayer(
            currentMarker
        );

    }


    // Remove previous risk circle

    if (currentRiskCircle) {

        officialMap.removeLayer(
            currentRiskCircle
        );

    }


    // Create marker immediately

    currentMarker =
        L.marker(
            [
                latitude,
                longitude
            ]
        )
        .addTo(
            officialMap
        );


    // Show temporary popup

    currentMarker.bindPopup(
        `
        <div style="min-width:180px">

            <strong>
                📍 Selected Location
            </strong>

            <hr>

            <div>
                <b>Latitude:</b>
                ${latitude.toFixed(5)}° N
            </div>

            <div>
                <b>Longitude:</b>
                ${longitude.toFixed(5)}° E
            </div>

            <br>

            <span>
                ⏳ Analyzing cyclone risk...
            </span>

        </div>
        `
    ).openPopup();


    // Center map on selected point

    officialMap.setView(
        [
            latitude,
            longitude
        ],
        9,
        {
            animate: true
        }
    );

}



// ============================================================
// DETECT LOCATION
// ============================================================

function detectLocation() {

    if (
        !navigator.geolocation
    ) {

        mapStatus.innerText =
            "Geolocation is not supported by this browser.";

        return;

    }


    detectLocationButton.disabled =
        true;


    detectLocationButton.innerText =
        "📍 Detecting...";


    mapStatus.innerText =
        "Requesting browser location permission...";


    navigator.geolocation.getCurrentPosition(

        async function (
            position
        ) {

            try {

                currentLatitude =
                    position.coords.latitude;


                currentLongitude =
                    position.coords.longitude;


                mapStatus.innerText =
                    "Location detected. Loading live data...";


                const environment =
                    await getEnvironment(

                        currentLatitude,

                        currentLongitude

                    );


                const prediction =
                    await getPrediction(
                        environment
                    );


                updateRiskCards(
                    prediction
                );


                mapStatus.innerText =

                    "Live analysis complete • " +

                    currentLatitude.toFixed(5) +

                    "° N, " +

                    currentLongitude.toFixed(5) +

                    "° E";


            }

            catch (
                error
            ) {

                console.error(
                    "Official dashboard error:",
                    error
                );


                mapStatus.innerText =
                    "Unable to load live analysis: " +
                    error.message;


            }

            finally {

                detectLocationButton.disabled =
                    false;


                detectLocationButton.innerText =
                    "📍 Detect Location & Analyze";

            }

        },


        function (
            error
        ) {

            console.error(
                "Geolocation error:",
                error
            );


            let message =
                "Unable to detect location.";


            if (
                error.code ===
                error.PERMISSION_DENIED
            ) {

                message =
                    "Location permission was denied. Allow location access for this site.";

            }

            else if (
                error.code ===
                error.POSITION_UNAVAILABLE
            ) {

                message =
                    "Location information is unavailable.";

            }

            else if (
                error.code ===
                error.TIMEOUT
            ) {

                message =
                    "Location request timed out.";

            }


            mapStatus.innerText =
                message;


            detectLocationButton.disabled =
                false;


            detectLocationButton.innerText =
                "📍 Detect Location & Analyze";

        },

        {

            enableHighAccuracy:
                true,

            timeout:
                15000,

            maximumAge:
                60000

        }

    );

}


// ============================================================
// LOGOUT
// ============================================================

if (
    logoutButton
) {

    logoutButton.addEventListener(

        "click",

        function () {

            sessionStorage.clear();

            window.location.href =
                "index.html";

        }

    );

}


// ============================================================
// BUTTON
// ============================================================

if (
    detectLocationButton
) {

    detectLocationButton.addEventListener(

        "click",

        detectLocation

    );

}


// ============================================================
// START DASHBOARD
// ============================================================

initializeMap();


// ============================================================
// AUTOMATIC LOCATION DETECTION
// ============================================================

setTimeout(

    function () {

        detectLocation();

    },

    500

);