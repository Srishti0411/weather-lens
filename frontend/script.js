/* =========================================================
   PS 078 — Extreme Weather Dashboard
   Multi-run / multi-variable, driven by mock_data.json (v2)
   ========================================================= */
/* =========================================================
   FAVICON — orange rain cloud (browser tab icon)
   ========================================================= */
(function () {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#14272f" stroke="#3d6b80" stroke-width="3"/>
  <path d="M22 40a8 8 0 0 1-1-15.9A12 12 0 0 1 44 26a7 7 0 0 1 1 14z"
        fill="none" stroke="#ff7430" stroke-width="4" stroke-linejoin="round"/>
  <path d="M26 46l-3 6M35 46l-3 6M44 46l-3 6"
        stroke="#ff7430" stroke-width="4" stroke-linecap="round"/>
</svg>`;

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }
    link.type = "image/svg+xml";
    link.href = "data:image/svg+xml," + encodeURIComponent(svg);
})();
let forecastMap = null;
let forecastMarkers = [];
let selectedForecastIndex = 0;
let eventLayer = null;

let RAW = null;                                   // the whole JSON file
const state = { runIndex: 0, variable: "precipitation" };

const EVENT_NAMES = {
    precipitation: "Extreme Rainfall",
    temperature: "Extreme Temperature Anomaly",
    wind_speed: "Extreme Wind",
    pressure: "Deep Low-Pressure System"
};

/* colour ramps per weather variable (value 0-1) */
const RAMPS = {
    precipitation: [[0, [38, 84, 110]], [0.4, [40, 168, 180]], [0.7, [240, 192, 0]], [1, [255, 90, 77]]],
    temperature:   [[0, [240, 160, 60]], [0.5, [150, 190, 210]], [1, [30, 90, 200]]],
    wind_speed:    [[0, [38, 84, 110]], [0.4, [60, 190, 120]], [0.7, [240, 192, 0]], [1, [255, 90, 77]]],
    pressure:      [[0, [38, 84, 110]], [0.5, [120, 100, 190]], [1, [210, 60, 160]]]
};

function leadHours(data, t) {
    const p = s => Date.parse(s.replace(" UTC", "").replace(" ", "T") + ":00Z");
    return Math.round((p(t) - p(data.forecast_run)) / 3600000);
}

/* =========================================================
   VIEW ADAPTER — old flat shape, for the chosen run + variable
   ========================================================= */

function getView(variable) {
    variable = variable || state.variable;
    const run = RAW.runs[state.runIndex];
    const v = run.variables[variable];
    return {
        ...run,
        event: EVENT_NAMES[variable] || run.event,
        severity: v.severity,
        peak_amplitude_score: v.peak_amplitude_score,
        detection: v.detection,
        trajectory: run.trajectory.map((p, k) => ({
            ...p,
            peak: v.peaks[k],
            display_value: p[v.value_key]
        })),
        downscaling: { ...run.downscaling, field: v.field },
        activeVariable: v,
        variableId: variable
    };
}

/* Decision Intelligence tabs always use rainfall */
function getRainView() { return getView("precipitation"); }
function getPreCyclone() { return RAW.runs[state.runIndex].pre_cyclone; }

function refresh(opts) {
    opts = opts || {};
    if (opts.resetStep) selectedForecastIndex = 0;
    const view = getView();
    updateDashboard(view);
    initializeMap(view, !!opts.refit);
}

/* =========================================================
   LOAD MOCK WEATHER DATA
   ========================================================= */

fetch("mock_data.json")
    .then(response => {
        if (!response.ok) throw new Error("Could not load mock_data.json");
        return response.json();
    })
    .then(json => {
        console.log("Weather data loaded:", json);
        RAW = json;
        state.variable = json.default_variable || "precipitation";
        const i = json.runs.findIndex(r => r.forecast_run === json.forecast_run);
        state.runIndex = i < 0 ? 0 : i;
        refresh({ refit: true });
    })
    .catch(error => {
        console.error("Error loading weather data:", error);
        document.getElementById("event-name").textContent = "Data failed to load";
        document.getElementById("severity").textContent = "Open via a local server, not file://";
    });

/* =========================================================
   UPDATE DASHBOARD
   ========================================================= */

function updateDashboard(data) {

    const exceeded = data.detection ? data.detection.exceeded !== false && data.detection.score >= data.detection.threshold : true;
    const av = data.activeVariable;

    /* ----- RIGHT PANEL ----- */
    document.getElementById("event-name").textContent = data.event;
    document.getElementById("severity").textContent = data.severity;
    document.getElementById("timestamp").textContent = data.timestamp;
    document.getElementById("peak-amplitude").textContent = data.peak_amplitude_score;
    document.getElementById("trajectory-points").textContent = data.trajectory.length;

    /* ----- ALERT BOX ----- */
    const rightPanel = document.querySelector(".right-panel");
    const oldAlert = document.querySelector(".weather-alert");
    if (oldAlert) oldAlert.remove();

    const alertBox = document.createElement("div");
    alertBox.className = "weather-alert";

    let alertIcon = "⚠";
    if (!exceeded) alertIcon = "○";
    else if (data.severity === "Low") alertIcon = "●";
    else if (data.severity === "Moderate") alertIcon = "▲";

    alertBox.innerHTML = `
        <div class="alert-header">
            <span>${alertIcon}</span>
            ${exceeded ? "EXTREME WEATHER ALERT" : "WEATHER WATCH · BELOW THRESHOLD"}
        </div>
        <div class="alert-event">${data.event}</div>
        <div class="alert-details">
            <div><span>Severity</span><strong>${data.severity}</strong></div>
            <div><span>Peak Score</span><strong>${data.peak_amplitude_score}</strong></div>
        </div>
        <div class="alert-time">Forecast: ${data.timestamp}</div>
    `;
    rightPanel.prepend(alertBox);

    /* ----- ANOMALY DETECTION CARD ----- */
    const oldDetect = document.querySelector(".detect-card");
    if (oldDetect) oldDetect.remove();
    if (data.detection) {
        const d = data.detection;
        alertBox.insertAdjacentHTML("afterend", `
            <div class="detect-card">
                <div class="detect-top">
                    <span>Anomaly detection (${d.index})</span>
                    <strong>${d.score.toFixed(2)}</strong>
                </div>
                <div class="detect-bar">
                    <i class="${exceeded ? "" : "below"}" style="width:${d.score * 100}%"></i>
                    <b style="left:${d.threshold * 100}%"></b>
                </div>
                <small>Alert threshold ${d.threshold.toFixed(2)} · ${exceeded ? "exceeded" : "below threshold"}</small>
            </div>`);
    }

    /* ----- STAGE 2 — DOWNSCALING INFORMATION ----- */
    const inputResolution = document.querySelector(".resolution-card span");
    const inputValue = document.querySelector(".resolution-card strong");
    const inputDescription = document.querySelector(".resolution-card small");
    const selectedCard = document.querySelector(".resolution-card.selected");
    const outputValue = selectedCard.querySelector("strong");
    const outputDescription = selectedCard.querySelector("small");

    inputResolution.textContent = "INPUT FORECAST";
    inputValue.textContent = data.downscaling.input_resolution;
    inputDescription.textContent = "Medium-resolution field";
    outputValue.textContent = data.downscaling.output_resolution;
    outputDescription.textContent = "High-resolution field";

    /* ----- 5 KM FIELD ----- */
    const fieldPlaceholder = document.querySelector(".field-placeholder");
    const status = data.downscaling.status;
    const varLabel = av ? av.label : "Weather";

    if (status === "READY" && data.downscaling.field) {

        const fine = data.downscaling.field;
        const cols = fine[0].length;
        const scale = av ? av.field_scale : null;
        const dec = av && (av.unit === "°C" || av.unit === "hPa") ? 1 : 0;

        fieldPlaceholder.innerHTML = `
            <strong>5 km Downscaled ${varLabel} Field</strong>
            <div class="weather-grid" id="weather-grid"></div>
            <span>${exceeded ? "AI downscaled high-resolution field" : "Preview only · detection below alert threshold"}${av ? " · " + av.legend : ""}</span>
        `;

        const grid = document.getElementById("weather-grid");
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        grid.style.gridAutoRows = "18px";

        fine.forEach(row => {
            row.forEach(value => {
                const cell = document.createElement("div");
                cell.className = "weather-cell";
                cell.style.background = rainColor(value);
                cell.style.display = "flex";
                cell.style.alignItems = "center";
                cell.style.justifyContent = "center";
                cell.style.fontSize = cols > 16 ? "8px" : "10px";
                cell.style.fontWeight = "600";
                cell.style.color = "#0d1b23";
                cell.textContent = cols > 16 ? "" : value.toFixed(2);
                cell.title = scale
                    ? `${varLabel}: ${toPhysical(value, scale).toFixed(dec)} ${scale.unit} (index ${value.toFixed(2)})`
                    : "Intensity: " + value.toFixed(2);
                grid.appendChild(cell);
            });
        });

        /* 12 km vs 5 km comparison */
        const coarse = blockAverage(fine);
        const fmax = Math.max(...fine.flat());
        const cmax = Math.max(...coarse.flat());
        const cmp = document.createElement("div");
        cmp.className = "ds-compare";
        cmp.innerHTML = `
            <div class="ds-coarse-wrap">
                <span>12 km view (simulated by averaging)</span>
                <div class="ds-coarse" style="grid-template-columns: repeat(${coarse[0].length}, 1fr); grid-auto-rows: 26px">
                    ${coarse.flat().map(v => `<div style="background:${rainColor(v)}">${v.toFixed(2)}</div>`).join("")}
                </div>
            </div>
            <div class="ds-gain">
                <span>Peak kept by 5 km field</span>
                <strong>${cmax.toFixed(2)} → ${fmax.toFixed(2)}</strong>
                <small>+${Math.round((fmax - cmax) / cmax * 100)}% vs coarse</small>
            </div>`;
        grid.parentNode.insertBefore(cmp, grid);

    } else {
        fieldPlaceholder.innerHTML = `
            <strong>5 km Downscaled ${varLabel} Field</strong>
            <span>${status === "PROCESSING" ? "Downscaling model is processing..." : "Stage 2 model output is pending"}</span>
        `;
    }

    createForecastTimeline(data);
    setupControls(data);

    /* keep the right panel in sync when a later step is selected */
    if (selectedForecastIndex > 0 && data.trajectory[selectedForecastIndex]) {
        const sp = data.trajectory[selectedForecastIndex];
        document.getElementById("timestamp").textContent = sp.t;
        document.getElementById("peak-amplitude").textContent = sp.peak;
    }
}

/* =========================================================
   CREATE FORECAST TIMELINE
   ========================================================= */

function createForecastTimeline(data) {

    const center = document.querySelector(".center");
    const oldTimeline = document.querySelector(".forecast-timeline");
    if (oldTimeline) oldTimeline.remove();

    if (selectedForecastIndex >= data.trajectory.length) selectedForecastIndex = 0;
    const unit = data.activeVariable ? data.activeVariable.unit : "";

    const timeline = document.createElement("div");
    timeline.className = "forecast-timeline";
    timeline.innerHTML = `
        <div class="timeline-header">
            <div>
                <h2>Forecast Timeline</h2>
                <p>Select a forecast step to inspect event movement</p>
            </div>
            <div class="timeline-selected">${data.trajectory[selectedForecastIndex].t}</div>
        </div>
        <div class="timeline-track"></div>
    `;

    center.insertBefore(timeline, document.querySelector(".downscale"));

    const track = timeline.querySelector(".timeline-track");

    data.trajectory.forEach((point, index) => {

        const step = document.createElement("button");
        step.className = "timeline-step";
        if (index === selectedForecastIndex) step.classList.add("selected");

        const lh = leadHours(data, point.t);

        step.innerHTML = `
            <span class="timeline-dot"></span>
            <strong>${point.t.slice(5, 16)}</strong>
            <small>${lh === 0 ? "Initial" : "+" + lh + "h"}</small>
            ${point.display_value !== undefined ? `<small class="tl-val">${point.display_value} ${unit}</small>` : ""}
        `;

        step.addEventListener("click", () => selectForecastStep(data, index, timeline));
        track.appendChild(step);
    });
}

/* =========================================================
   SELECT FORECAST STEP
   ========================================================= */

function selectForecastStep(data, index, timeline) {

    selectedForecastIndex = index;
    const point = data.trajectory[index];

    document.getElementById("timestamp").textContent = point.t;
    document.getElementById("peak-amplitude").textContent = point.peak;

    const stepSelect = document.getElementById("step-select");
    if (stepSelect) stepSelect.value = index;

    timeline.querySelectorAll(".timeline-step").forEach((step, i) =>
        step.classList.toggle("selected", i === index));

    timeline.querySelector(".timeline-selected").textContent = point.t;

    if (forecastMap) {
        forecastMap.flyTo([point.lat, point.lon], 8, { duration: 0.8 });
    }

    forecastMarkers.forEach((marker, i) => {
        if (i === index) {
            marker.setRadius(10);
            marker.setStyle({ weight: 4, fillOpacity: 1 });
            marker.openPopup();
        } else {
            marker.setRadius(5);
            marker.setStyle({ weight: 2, fillOpacity: 0.8 });
        }
    });
}

/* =========================================================
   INITIALIZE / REDRAW MAP
   ========================================================= */

function initializeMap(data, refit) {

    if (!forecastMap) {
        forecastMap = L.map("map").setView([28.6, 77.2], 8);
        L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
            { attribution: "Tiles © Esri" }
        ).addTo(forecastMap);
        eventLayer = L.layerGroup().addTo(forecastMap);
        refit = true;
    }

    eventLayer.clearLayers();

    let eventColor, fillOpacity;
    if (data.severity === "Low") { eventColor = "#2878d4"; fillOpacity = 0.08; }
    else if (data.severity === "Moderate") { eventColor = "#f0a500"; fillOpacity = 0.12; }
    else { eventColor = "#ff7430"; fillOpacity = 0.18; }

    const unit = data.activeVariable ? data.activeVariable.unit : "";
    const vlabel = data.activeVariable ? data.activeVariable.label : "Value";

    /* trajectory */
    L.polyline(data.trajectory.map(p => [p.lat, p.lon]),
        { color: eventColor, weight: 5, opacity: 0.9 }).addTo(eventLayer);

    /* forecast positions */
    forecastMarkers = [];
    data.trajectory.forEach((point, index) => {

        const isSel = index === selectedForecastIndex;
        const marker = L.circleMarker([point.lat, point.lon], {
            radius: isSel ? 10 : 5,
            color: eventColor,
            fillColor: eventColor,
            fillOpacity: isSel ? 1 : 0.8,
            weight: isSel ? 4 : 2
        }).addTo(eventLayer);

        marker.bindPopup(`
            <strong>${"Forecast Position " + (index + 1) + " (+" + leadHours(data, point.t) + "h)"}</strong>
            <br><br>
            Time: ${point.t}<br>
            Latitude: ${point.lat}<br>
            Longitude: ${point.lon}<br>
            ${vlabel}: ${point.display_value !== undefined ? point.display_value + " " + unit : "—"}<br>
            Uncertainty: ±${point.spread_km} km<br>
            Severity: ${data.severity}
        `);

        forecastMarkers.push(marker);
    });

    /* impact region */
    const b = data.bbox;
    const bounds = [[b[0], b[1]], [b[2], b[3]]];

    L.rectangle(bounds, {
        color: eventColor, weight: 2, fillColor: eventColor, fillOpacity: fillOpacity
    }).addTo(eventLayer);

    if (refit) forecastMap.fitBounds(bounds, { padding: [30, 30] });
}

/* =========================================================
   CONTROLS (run / variable / step) — safe to call repeatedly
   ========================================================= */

function setupControls(data) {

    const run = document.getElementById("run-select");
    run.innerHTML = RAW.runs.map((r, i) =>
        `<option value="${i}">${r.forecast_run}</option>`).join("");
    run.value = state.runIndex;
    run.onchange = () => {
        state.runIndex = Number(run.value);
        refresh({ resetStep: true, refit: true });
    };

    const variable = document.getElementById("variable-select");
    variable.innerHTML = RAW.variables_catalog.map(v =>
        `<option value="${v.id}"${v.enabled ? "" : " disabled"}>${v.label}</option>`).join("");
    variable.value = state.variable;
    variable.onchange = () => {
        state.variable = variable.value;
        refresh({});
    };

    const step = document.getElementById("step-select");
    step.innerHTML = data.trajectory.map((p, i) =>
        `<option value="${i}">+${leadHours(data, p.t)} hours</option>`).join("");
    step.value = selectedForecastIndex;
    step.onchange = () =>
        selectForecastStep(data, Number(step.value), document.querySelector(".forecast-timeline"));
}

/* =========================================================
   HELPERS
   ========================================================= */

function rampColor(stops, v) {
    v = Math.max(0, Math.min(1, v));
    for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0]) {
            const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (v - a) / (b - a);
            return "rgb(" + ca.map((c, k) => Math.round(c + (cb[k] - c) * t)).join(",") + ")";
        }
    }
    return "rgb(" + stops[stops.length - 1][1].join(",") + ")";
}

function rainColor(v) {                     // name kept so old calls still work
    return rampColor(RAMPS[state.variable] || RAMPS.precipitation, v);
}

function toPhysical(f, scale) {
    return scale.value_at_0 + (scale.value_at_1 - scale.value_at_0) * Math.pow(f, scale.exponent);
}

function blockAverage(grid) {
    const out = [];
    for (let r = 0; r < grid.length; r += 2) {
        const row = [];
        for (let c = 0; c < grid[0].length; c += 2) {
            let sum = 0, n = 0;
            for (let dr = 0; dr < 2; dr++) {
                for (let dc = 0; dc < 2; dc++) {
                    const v = grid[r + dr] && grid[r + dr][c + dc];
                    if (v !== undefined) { sum += v; n++; }
                }
            }
            row.push(sum / n);
        }
        out.push(row);
    }
    return out;
}


/* Decision Intelligence add-ons. Loads AFTER the main script.
   Uses getRainView() and getPreCyclone() from the main script,
   so all numbers below come from real mock_data.json fields. */
(function () {
  "use strict";
  let D = null, PC = null, layer = null, onHotspot = false;
  const S = {
    tab: "twin", intensity: 0, shift: 0, role: "farmer",
    stage: { Rice: "Flowering", Cotton: "Boll opening", Sugarcane: "Grand growth", Maize: "Grain filling" }
  };

  const TABS = [["twin", "Forecast Stress Testing"], ["role", "Role Alerts"],
                ["crop", "Crop Impact"], ["marine", "Pre-Cyclone"]];

  const CROPS = {
    Rice:      { impact: "Waterlogging", st: { Nursery: 0.4, Tillering: 0.6, Flowering: 1, "Grain filling": 0.7 },
                 act: "Open field drains, hold fertiliser, protect flowering panicles." },
    Cotton:    { impact: "Boll rot, lint damage", st: { Flowering: 0.6, "Boll formation": 0.8, "Boll opening": 1 },
                 act: "Delay picking until dry, drain fields, protect opened bolls." },
    Sugarcane: { impact: "Lodging, waterlogging", st: { Germination: 0.5, "Grand growth": 0.7, Maturity: 0.4 },
                 act: "Earth-up stalks and clear field drains to limit lodging." },
    Maize:     { impact: "Root-zone waterlogging", st: { Vegetative: 0.6, Tasseling: 0.9, "Grain filling": 0.6 },
                 act: "Drain waterlogged plots and stake plants against lodging." }
  };

  const $ = id => document.getElementById(id);
  const cur = () => D.trajectory[Math.min(selectedForecastIndex, D.trajectory.length - 1)];
  const lead = p => leadHours(D, p.t);
  const baseRain = p => p.rainfall_mm_24h;
  const rain = p => Math.round(baseRain(p) * (1 + S.intensity / 100));
  const wind = p => Math.round(p.wind_kmh * (1 + S.intensity / 200));
  const radius = p => Math.round((p.spread_km || 20) + Math.abs(S.shift) * 0.2);
  const cells = p => Math.round(Math.PI * radius(p) ** 2 / 25);
  const level = mm => mm >= 140 ? { n: "Severe", c: "#ff7430" } : mm >= 90 ? { n: "Moderate", c: "#f0a500" }
                    : { n: "Low", c: "#2878d4" };
  const risk = s => s >= 0.75 ? { n: "High", c: "#ff5a4d" } : s >= 0.45 ? { n: "Moderate", c: "#f0c000" }
                  : { n: "Low", c: "#3ccf7a" };
  const chip = r => `<span class="dx-chip" style="background:${r.c}">${r.n}</span>`;

  /* ---------- map overlay (twin + marine) ---------- */
  function drawLayer() {
    if (!forecastMap || !D) return;
    if (layer) { layer.remove(); layer = null; }

    if (S.tab === "marine") {
      const b = PC.hotspot.bbox, c = PC.hotspot.center;
      const hb = [[b[0], b[1]], [b[2], b[3]]];
      layer = L.layerGroup().addTo(forecastMap);
      L.rectangle(hb, { color: "#ff7430", weight: 2, dashArray: "6 4",
        fillColor: "#ff7430", fillOpacity: 0.25, interactive: false }).addTo(layer);
      L.circleMarker(c, { radius: 4, color: "#ff7430" })
        .bindTooltip(PC.hotspot.label, { permanent: true, direction: "top" })
        .addTo(layer);
      if (!onHotspot) {
        forecastMap.flyToBounds(hb, { padding: [40, 40], duration: 1 });
        onHotspot = true;
      }
      return;
    }

    if (onHotspot) {
      onHotspot = false;
      const b = D.bbox;
      forecastMap.flyToBounds([[b[0], b[1]], [b[2], b[3]]], { padding: [30, 30], duration: 1 });
    }
    if (S.tab !== "twin") return;

    layer = L.layerGroup().addTo(forecastMap);
    const pts = D.trajectory.map(p =>
      [p.lat, p.lon + S.shift / (111 * Math.cos(p.lat * Math.PI / 180))]);
    D.trajectory.forEach((p, i) => L.circle(pts[i], {
      radius: radius(p) * 1000, color: "#4fc3f7", weight: 1, dashArray: "4 4",
      fillColor: "#4fc3f7", fillOpacity: i === selectedForecastIndex ? 0.2 : 0.06, interactive: false
    }).addTo(layer));
    L.polyline(pts, { color: "#4fc3f7", weight: 3, dashArray: "8 6", interactive: false }).addTo(layer);
  }

  /* ---------- tabs ---------- */
  function twin() {
    return `<p class="dx-note">Adjust cyclone intensity and track to explore how uncertainty zones evolve. The metrics below update dynamically with each forecast step.
</p>
      <div class="dx-sliders">
        <label>Rainfall shift <b id="dx-iv"></b><input type="range" id="dx-int" min="-30" max="30" step="5" value="${S.intensity}"></label>
        <label>Track shift, east + / west − <b id="dx-sv"></b><input type="range" id="dx-shift" min="-100" max="100" step="10" value="${S.shift}"></label>
        <button class="dx-btn" id="dx-reset">Reset</button>
      </div><div class="dx-stats" id="dx-out"></div>`;
  }
  function twinOut() {
    const p = cur(), mm = rain(p), l = level(mm);
    $("dx-iv").textContent = (S.intensity > 0 ? "+" : "") + S.intensity + "%";
    $("dx-sv").textContent = (S.shift > 0 ? "+" : "") + S.shift + " km";
    $("dx-out").innerHTML = [
      ["Rainfall (illustrative)", mm + " mm", "baseline " + baseRain(p) + " mm"],
      ["Peak wind", wind(p) + " km/h", "scenario"],
      ["Uncertainty radius", radius(p) + " km", "+" + lead(p) + " h lead"],
      ["5 km impact cells", cells(p), l.n + " alert level"]
    ].map(([a, b, c]) => `<div class="dx-stat"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join("");
  }
  function bindTwin() {
    twinOut();
    $("dx-int").oninput = e => { S.intensity = +e.target.value; twinOut(); drawLayer(); };
    $("dx-shift").oninput = e => { S.shift = +e.target.value; twinOut(); drawLayer(); };
    $("dx-reset").onclick = () => { S.intensity = 0; S.shift = 0; renderBody(); drawLayer(); };
  }

  function marine() {
    return `<div class="dx-risk"><strong>${PC.level}</strong><span>Pre-cyclone environment score ${PC.score} · expected window ~${PC.expected_window_days} days</span></div>
      <p class="dx-note">Hotspot: ${PC.hotspot.display}</p>
      <div class="dx-bars">${PC.indicators.map(i => `<div><div class="dx-bar-top"><span>${i.label}</span><span>${i.display}</span></div>
        <div class="dx-bar"><i style="width:${i.bar * 100}%"></i></div></div>`).join("")}</div>
      <h3>Historical Analogue Analysis</h3>
      <ul class="dx-list">${PC.analogues.map(a => `<li>${a.name} — ${a.period}, ${a.category}, landfall: ${a.landfall}</li>`).join("")}</ul>
      <div class="dx-warn"> This provides an early indication of environmental conditions that may support cyclone development, rather than predicting that a cyclone will form.${PC.disclaimer}</div>`;
  }

  function cropRows() {
    const mm = rain(cur());
    return Object.keys(CROPS).map(name => {
      const c = CROPS[name], stage = S.stage[name], r = risk((mm / 200) * c.st[stage]);
      const action = r.n === "High" ? c.act : r.n === "Moderate" ? "Check drainage channels and inspect fields after rain."
                   : "No action needed. Continue routine monitoring.";
      return { name, c, stage, r, action, mm };
    });
  }
    function crop() {
    return cropRows().map(x => `<div class="dx-crop">
        <div><strong>${x.name}</strong></div>
        <div><select data-crop="${x.name}" aria-label="${x.name} growth stage">${Object.keys(x.c.st).map(s =>
          `<option${s === x.stage ? " selected" : ""}>${s}</option>`).join("")}</select></div>
        <div>${chip(x.r)} ${x.c.impact} risk<br>${x.action}</div></div>`).join("");
  }

  function roleCard() {
    const p = cur(), mm = rain(p), l = level(mm), area = Math.round(Math.PI * radius(p) ** 2);
    const top = cropRows().sort((a, b) => b.mm * b.c.st[b.stage] - a.mm * a.c.st[a.stage])[0];
    const teams = { Severe: 6, Moderate: 3, Low: 0 }[l.n];
    const R = {
      farmer: ["Farmer", `${top.name} (${top.stage}): ${top.r.n} ${top.c.impact.toLowerCase()} risk`,
        [top.action, `Illustrative ${mm} mm in 24 h. Act before ${p.t}.`]],
      district: ["District officer", `Prepare vulnerable areas (about ${area} km² in the impact zone)`,
        [l.n !== "Low" ? "Pre-alert low-lying blocks and open relief shelters." : "Keep control room on watch.",
         "Position pumps at known waterlogging points and clear major drains."]],
      sdrf: ["SDRF", `Position ${teams || "standby"} ${teams ? "response teams" : "team"} near ${p.lat}°N, ${p.lon}°E`,
        [teams ? "Stage boats and pumps at the edge of the impact zone." : "No deployment yet; keep teams on standby.",
         `Review road access before ${p.t}.`]],
      hospital: ["Hospital", l.n !== "Low" ? "Activate emergency preparedness" : "Routine readiness",
        [l.n !== "Low" ? "Reserve surge beds and check backup power and fuel." : "Confirm backup power is working.",
         "Stock supplies for waterborne illness and plan staff access."]]
    };
    const [who, title, acts] = R[S.role];
    return `<div class="dx-alert" style="border-left-color:${l.c}">${chip(l)} <span>${who} alert · ${p.t}</span>
      <h3>${title}</h3><ul class="dx-list">${acts.map(a => `<li>${a}</li>`).join("")}</ul></div>`;
  }
  function role() {
    const names = { farmer: "Farmer", district: "District officer", sdrf: "SDRF / NDRF", hospital: "Hospital" };
    return `<p class="dx-note">Choose a stakeholder to view the appropriate response and advisory for the same weather event.</p>
      <div class="dx-roles">${Object.keys(names).map(k =>
        `<button class="dx-role${k === S.role ? " on" : ""}" data-role="${k}">${names[k]}</button>`).join("")}</div>${roleCard()}`;
  }

  /* ---------- render ---------- */
  function renderBody() {
    const body = $("dx-body");
    if (!body) return;
    body.innerHTML = { twin, marine, crop, role }[S.tab]();
    if (S.tab === "twin") bindTwin();
    body.querySelectorAll("[data-crop]").forEach(s => s.onchange = () => { S.stage[s.dataset.crop] = s.value; renderBody(); });
    body.querySelectorAll("[data-role]").forEach(b => b.onclick = () => { S.role = b.dataset.role; renderBody(); });
  }

  function build() {
    const old = document.querySelector(".dx");
    if (old) old.remove();
    const box = document.createElement("section");
    box.className = "dx";
    box.id = "dx-anchor";
    box.innerHTML = `<div class="dx-head"><h2>Decision Intelligence</h2>
      </div>
      <div class="dx-tabs">${TABS.map(([k, t]) =>
        `<button class="dx-tab${k === S.tab ? " on" : ""}" data-tab="${k}">${t}</button>`).join("")}</div>
      <div id="dx-body"></div>`;
    document.querySelector(".center").appendChild(box);
    box.querySelector(".dx-tabs").onclick = e => {
      const b = e.target.closest("[data-tab]");
      if (!b) return;
      S.tab = b.dataset.tab;
      box.querySelectorAll(".dx-tab").forEach(x => x.classList.toggle("on", x === b));
      renderBody(); drawLayer();
    };
    renderBody();
  }

  /* ---------- hook into script.js without editing it ---------- */
  const _update = window.updateDashboard, _select = window.selectForecastStep, _init = window.initializeMap;
  window.updateDashboard = function (d) { _update(d); D = getRainView(); PC = getPreCyclone(); build(); };
  window.initializeMap = function (d, refit) { _init(d, refit); drawLayer(); };
  window.selectForecastStep = function () { _select.apply(this, arguments); if (D) { if (S.tab === "marine") onHotspot = false; renderBody(); drawLayer(); } };
})();