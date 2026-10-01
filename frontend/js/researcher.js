// ==========================================
// CYCLONEGUARD AI — RESEARCHER DASHBOARD
// Live predictions + evaluation results + graphs
// ==========================================

const BACKEND_URL = "https://cycloneguard-aibackend.vercel.app";
const RESULTS_URL = "../results/reports/research_results.json";

// ==========================================
// AUTHENTICATION
// ==========================================

const role = sessionStorage.getItem("userRole");
const email = sessionStorage.getItem("userEmail");

if (role !== "researcher" || !email) {
    window.location.href = "index.html?role=researcher";
}

const researcherEmail = document.getElementById("researcherEmail");
if (researcherEmail) {
    researcherEmail.innerText = email;
}

// ==========================================
// HELPERS
// ==========================================

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return "--";
    }
    return `${Number(value).toFixed(2)}%`;
}

// ==========================================
// MODEL PERFORMANCE TABLE
// ==========================================

function updateModelTable(models) {
    const table = document.getElementById("modelResults");
    if (!table) return;

    const rows = table.querySelectorAll("tr");

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 6) return;

        const modelName = cells[0].innerText.trim();
        const result = models.find(item => item.Model === modelName);

        if (!result) return;

        cells[1].innerText = formatPercent(result.Accuracy);
        cells[2].innerText = formatPercent(result.Precision);
        cells[3].innerText = formatPercent(result.Recall);
        cells[4].innerText = formatPercent(result.F1_Score);
        cells[5].innerText = formatPercent(result.ROC_AUC);
    });
}

// ==========================================
// ANALYTICS STYLES
// ==========================================

function addAnalyticsStyles() {
    if (document.getElementById("researchAnalyticsStyles")) return;

    const style = document.createElement("style");
    style.id = "researchAnalyticsStyles";

    style.textContent = `
        .research-analytics-panel {
            margin-top: 18px;
        }

        .analytics-grid {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 16px;
            margin-top: 18px;
        }

        .analytics-card {
            background: #061522;
            border: 1px solid #18344c;
            border-radius: 14px;
            padding: 18px;
            overflow: hidden;
        }

        .analytics-card h3 {
            margin: 0 0 6px;
            font-size: 16px;
        }

        .analytics-card p {
            margin: 0 0 12px;
            opacity: .72;
            font-size: 12px;
        }

        .analytics-canvas {
            width: 100%;
            height: 300px;
            display: block;
        }

        .confusion-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
        }

        .confusion-box {
            border: 1px solid #18344c;
            border-radius: 12px;
            padding: 12px;
            background: #071925;
        }

        .confusion-box h4 {
            margin: 0 0 10px;
            font-size: 12px;
        }

        .cm-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            text-align: center;
        }

        .cm-table th,
        .cm-table td {
            border: 1px solid #18344c;
            padding: 8px 4px;
        }

        .cm-table td {
            font-size: 15px;
            font-weight: 700;
        }

        .research-files {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 16px;
        }

        .research-files a {
            display: inline-block;
            padding: 8px 12px;
            border: 1px solid #18344c;
            border-radius: 9px;
            color: #55c7ff;
            text-decoration: none;
            font-size: 11px;
            background: #071925;
        }

        .research-files a:hover {
            border-color: #55c7ff;
        }

        .research-note {
            margin-top: 14px;
            padding: 12px 14px;
            border-left: 3px solid #55c7ff;
            background: #071925;
            border-radius: 8px;
            font-size: 11px;
            opacity: .85;
        }

        @media (max-width: 850px) {
            .analytics-grid {
                grid-template-columns: 1fr;
            }

            .confusion-grid {
                grid-template-columns: 1fr;
            }
        }
    `;

    document.head.appendChild(style);
}

// ==========================================
// ANALYTICS PANEL
// ==========================================

function createAnalyticsPanel() {
    if (document.getElementById("researchAnalyticsPanel")) {
        return document.getElementById("researchAnalyticsPanel");
    }

    const panel = document.createElement("section");
    panel.className = "panel research-analytics-panel";
    panel.id = "researchAnalyticsPanel";

    panel.innerHTML = `
        <p class="section-label">RESEARCH ANALYTICS</p>
        <h2>📊 Model Evaluation & Graphs</h2>
        <p class="panel-description">
            Evaluation results from the held-out test set used by the project.
        </p>

        <div class="analytics-grid">
            <div class="analytics-card">
                <h3>Model Performance</h3>
                <p>Accuracy, precision, recall, F1 score and ROC-AUC.</p>
                <canvas id="modelPerformanceCanvas" class="analytics-canvas"></canvas>
            </div>

            <div class="analytics-card">
                <h3>Random Forest Feature Importance</h3>
                <p>Relative importance reported by the trained Random Forest model.</p>
                <canvas id="featureImportanceCanvas" class="analytics-canvas"></canvas>
            </div>
        </div>

        <div class="analytics-card" style="margin-top:16px;">
            <h3>Confusion Matrices</h3>
            <p>Actual versus predicted classes on the held-out test set.</p>
            <div id="confusionGrid" class="confusion-grid"></div>
        </div>

        <div class="research-files">
            <a href="../results/graphs/model_performance.png" target="_blank">📈 Performance Graph</a>
            <a href="../results/graphs/confusion_matrices.png" target="_blank">🔲 Confusion Matrices</a>
            <a href="../results/graphs/roc_curves.png" target="_blank">📉 ROC Curves</a>
            <a href="../results/graphs/random_forest_feature_importance.png" target="_blank">🌳 Feature Importance</a>
            <a href="../results/graphs/metrics_heatmap.png" target="_blank">🔥 Metrics Heatmap</a>
            <a href="../results/reports/model_results.csv" target="_blank">📄 Model Results CSV</a>
            <a href="../results/reports/confusion_matrices.csv" target="_blank">📄 Confusion Matrix CSV</a>
        </div>

        <div class="research-note">
            <strong>Research note:</strong>
            These metrics describe performance on the project's held-out test set.
            They should not be presented as 100% real-world cyclone prediction accuracy.
        </div>
    `;

    const panels = [...document.querySelectorAll(".panel")];
    const modelPanel = panels.find(panel =>
        panel.innerText.includes("Model Performance")
    );

    if (modelPanel) {
        modelPanel.insertAdjacentElement("afterend", panel);
    } else {
        const main = document.querySelector("main") || document.body;
        main.appendChild(panel);
    }

    return panel;
}

// ==========================================
// PERFORMANCE BAR GRAPH
// ==========================================

function drawPerformanceChart(models) {
    const canvas = document.getElementById("modelPerformanceCanvas");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(500, rect.width || 600);
    const height = 300;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const left = 45;
    const right = 15;
    const top = 25;
    const bottom = 55;
    const chartW = width - left - right;
    const chartH = height - top - bottom;

    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.font = "10px Arial";
    ctx.textAlign = "right";
    ctx.fillStyle = "#7f9bb0";

    for (let i = 0; i <= 5; i++) {
        const value = i * 20;
        const y = top + chartH - (value / 100) * chartH;

        ctx.strokeStyle = "#18344c";
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(width - right, y);
        ctx.stroke();

        ctx.fillText(`${value}%`, left - 7, y + 3);
    }

    const metrics = [
        ["Accuracy", "Accuracy"],
        ["Precision", "Precision"],
        ["Recall", "Recall"],
        ["F1", "F1_Score"],
        ["ROC", "ROC_AUC"]
    ];

    const groupW = chartW / models.length;
    const barW = Math.min(13, groupW / 6);

    models.forEach((model, modelIndex) => {
        const center = left + groupW * modelIndex + groupW / 2;

        metrics.forEach((metric, metricIndex) => {
            const value = Number(model[metric[1]]) || 0;
            const barH = (value / 100) * chartH;
            const x = center + (metricIndex - 2) * (barW + 2) - barW / 2;
            const y = top + chartH - barH;

            ctx.fillStyle = [
                "#26b5ff",
                "#45d483",
                "#f5c451",
                "#b77cff",
                "#ff7c9c"
            ][metricIndex];

            ctx.fillRect(x, y, barW, barH);
        });

        ctx.save();
        ctx.translate(center, height - 22);
        ctx.rotate(-0.18);
        ctx.textAlign = "center";
        ctx.fillStyle = "#d7e8f4";
        ctx.font = "10px Arial";
        ctx.fillText(model.Model, 0, 0);
        ctx.restore();
    });

    // Legend
    ctx.textAlign = "left";
    ctx.font = "9px Arial";

    metrics.forEach((metric, index) => {
        const x = left + index * 78;
        ctx.fillStyle = [
            "#26b5ff",
            "#45d483",
            "#f5c451",
            "#b77cff",
            "#ff7c9c"
        ][index];
        ctx.fillRect(x, 5, 8, 8);
        ctx.fillStyle = "#9bb4c5";
        ctx.fillText(metric[0], x + 12, 13);
    });
}

// ==========================================
// FEATURE IMPORTANCE GRAPH
// ==========================================

function drawFeatureImportance(featureImportance) {
    const canvas = document.getElementById("featureImportanceCanvas");
    if (!canvas) return;

    const entries = Object.entries(featureImportance || {});
    if (!entries.length) return;

    const width = Math.max(500, canvas.getBoundingClientRect().width || 600);
    const height = 300;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const left = 145;
    const right = 35;
    const top = 20;
    const bottom = 15;
    const chartW = width - left - right;
    const rowH = (height - top - bottom) / entries.length;

    entries.forEach(([feature, importance], index) => {
        const y = top + index * rowH + 5;
        const barH = Math.max(12, rowH - 8);
        const barW = (Number(importance) / 100) * chartW;

        ctx.fillStyle = "#26b5ff";
        ctx.fillRect(left, y, barW, barH);

        ctx.fillStyle = "#d7e8f4";
        ctx.font = "10px Arial";
        ctx.textAlign = "right";
        ctx.fillText(
            feature.replaceAll("_", " "),
            left - 8,
            y + barH / 2 + 3
        );

        ctx.textAlign = "left";
        ctx.fillStyle = "#9bb4c5";
        ctx.fillText(
            `${Number(importance).toFixed(2)}%`,
            left + barW + 6,
            y + barH / 2 + 3
        );
    });
}

// ==========================================
// CONFUSION MATRICES
// ==========================================

function renderConfusionMatrices(matrices) {
    const container = document.getElementById("confusionGrid");
    if (!container) return;

    container.innerHTML = "";

    Object.entries(matrices || {}).forEach(([model, matrix]) => {
        const box = document.createElement("div");
        box.className = "confusion-box";

        const values = matrix;

        box.innerHTML = `
            <h4>${model}</h4>
            <table class="cm-table">
                <tr>
                    <th></th>
                    <th>Pred 0</th>
                    <th>Pred 1</th>
                </tr>
                <tr>
                    <th>Actual 0</th>
                    <td>${values[0][0]}</td>
                    <td>${values[0][1]}</td>
                </tr>
                <tr>
                    <th>Actual 1</th>
                    <td>${values[1][0]}</td>
                    <td>${values[1][1]}</td>
                </tr>
            </table>
        `;

        container.appendChild(box);
    });
}

// ==========================================
// LOAD EVALUATION RESULTS
// ==========================================

async function loadEvaluationResults() {
    try {
        const response = await fetch(`${RESULTS_URL}?t=${Date.now()}`);

        if (!response.ok) {
            throw new Error(`Research results HTTP ${response.status}`);
        }

        const data = await response.json();

        updateModelTable(data.models || []);

        addAnalyticsStyles();
        createAnalyticsPanel();

        // Canvas sizes need the panel to be visible first.
        requestAnimationFrame(() => {
            drawPerformanceChart(data.models || []);
            drawFeatureImportance(data.feature_importance || {});
            renderConfusionMatrices(data.confusion_matrices || {});
        });

        console.log("Research evaluation results loaded:", data);

    } catch (error) {
        console.error("Research results error:", error);

        // Keep the dashboard usable even if the report files are missing.
        const modelPanel = [...document.querySelectorAll(".panel")]
            .find(panel => panel.innerText.includes("Model Performance"));

        if (modelPanel && !document.getElementById("researchResultsWarning")) {
            const warning = document.createElement("div");
            warning.id = "researchResultsWarning";
            warning.className = "research-note";
            warning.innerHTML =
                "Evaluation reports are not available yet. Run " +
                "<strong>python generate_research_results.py</strong> " +
                "from the project root.";
            modelPanel.appendChild(warning);
        }
    }
}

// ==========================================
// ENVIRONMENT API
// ==========================================

async function getEnvironmentData(latitude, longitude) {
    try {
        const response = await fetch(
            `${BACKEND_URL}/api/environment?latitude=${latitude}&longitude=${longitude}`
        );

        if (!response.ok) {
            throw new Error("Environment API failed");
        }

        const result = await response.json();

        if (!result.success || !result.data) {
            throw new Error("Invalid environment data");
        }

        return result.data;
    } catch (error) {
        console.error("Environment error:", error);
        return null;
    }
}

// ==========================================
// RANDOM FOREST
// ==========================================

async function getRandomForestPrediction(data) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sea_surface_temperature: data.sea_surface_temperature,
                atmospheric_pressure: data.atmospheric_pressure,
                humidity: data.humidity,
                wind_shear: data.wind_shear,
                vorticity: data.vorticity,
                latitude: data.latitude,
                ocean_depth: data.ocean_depth,
                proximity_to_coastline: data.proximity_to_coastline
            })
        });

        if (!response.ok) {
            throw new Error("Random Forest API failed");
        }

        return await response.json();
    } catch (error) {
        console.error("Random Forest error:", error);
        return null;
    }
}

// ==========================================
// CNN
// ==========================================

async function getCNNPrediction(data) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/cnn-predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sea_surface_temperature: data.sea_surface_temperature,
                atmospheric_pressure: data.atmospheric_pressure,
                humidity: data.humidity,
                wind_shear: data.wind_shear,
                vorticity: data.vorticity,
                latitude: data.latitude,
                ocean_depth: data.ocean_depth,
                proximity_to_coastline: data.proximity_to_coastline
            })
        });

        if (!response.ok) {
            throw new Error("CNN API failed");
        }

        return await response.json();
    } catch (error) {
        console.error("CNN error:", error);
        return null;
    }
}

// ==========================================
// DISPLAY LIVE PREDICTIONS
// ==========================================

function displayRandomForest(result) {
    if (!result) return;

    setText("rfProbability", `${result.cyclone_probability}%`);
    setText("rfNoCycloneProbability", `${result.no_cyclone_probability}%`);
    setText("rfRiskLevel", result.risk_level);
    setText(
        "rfPrediction",
        result.prediction === 1
            ? "Cyclone Detected"
            : "No Cyclone Detected"
    );
}

function displayCNN(result) {
    if (!result) return;

    const prediction =
        result.prediction === 1
            ? "Cyclone Detected"
            : "No Cyclone Detected";

    setText("cnnProbability", `${result.cyclone_probability}%`);
    setText("cnnNoCycloneProbability", `${result.no_cyclone_probability}%`);
    setText("cnnRiskLevel", result.risk_level);
    setText("cnnPrediction", prediction);

    setText("cnnProbabilityBottom", `${result.cyclone_probability}%`);
    setText("cnnNoCycloneProbabilityBottom", `${result.no_cyclone_probability}%`);
    setText("cnnRiskLevelBottom", result.risk_level);
    setText("cnnPredictionBottom", prediction);

    setText("cnnStatus", "Live");
    setText("cnnStatusBottom", "Live");
}

// ==========================================
// LIVE RESEARCH LOCATION
// ==========================================

function displayResearchLocation(latitude, longitude) {
    setText(
        "researchLocation",
        `${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E`
    );
}

// ==========================================
// LOAD LIVE MODEL DATA
// ==========================================

async function loadResearchData() {
    if (!navigator.geolocation) {
        console.error("Geolocation is not supported.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async position => {
            try {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                displayResearchLocation(latitude, longitude);

                const environment = await getEnvironmentData(
                    latitude,
                    longitude
                );

                if (!environment) return;

                environment.latitude = latitude;
                environment.longitude = longitude;

                const [rfResult, cnnResult] = await Promise.all([
                    getRandomForestPrediction(environment),
                    getCNNPrediction(environment)
                ]);

                window.researcherPredictions = {
                    randomForest: rfResult,
                    cnn: cnnResult,
                    environment
                };

                displayRandomForest(rfResult);
                displayCNN(cnnResult);

                console.log("Research environment:", environment);
                console.log("Random Forest:", rfResult);
                console.log("CNN:", cnnResult);
            } catch (error) {
                console.error("Research dashboard error:", error);
            }
        },
        error => {
            console.error("Location error:", error);
            setText("researchLocation", "Location unavailable");
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

// ==========================================
// LOGOUT
// ==========================================

const logoutButton = document.getElementById("logout");

if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        sessionStorage.clear();
        window.location.href = "index.html";
    });
}

// ==========================================
// START
// ==========================================

loadEvaluationResults();
loadResearchData();
