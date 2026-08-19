"use strict";

/* ===================== Constantes ===================== */

const STORAGE_KEY = "volley-stats-match-v1";

const STAT_KEYS = ["service", "attaque", "bloc", "fauteAdverse"];
const STAT_LABELS = {
  service: "Service",
  attaque: "Attaque",
  bloc: "Bloc",
  fauteAdverse: "Faute adverse",
};

function emptyTeamStats() {
  return { service: 0, attaque: 0, bloc: 0, fauteAdverse: 0 };
}
function emptySideoutStats() {
  return { sideoutJoue: 0, sideoutGagne: 0, serviceJoue: 0, serviceGagne: 0 };
}
function defaultState() {
  return {
    teamA: "Équipe A",
    teamB: "Équipe B",
    statsA: emptyTeamStats(),
    statsB: emptyTeamStats(),
    sideoutA: emptySideoutStats(),
    scoreA: 0,
    scoreB: 0,
    history: [],
  };
}

/* ===================== Persistance ===================== */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // fusion défensive : si un futur champ manque, on retombe sur les valeurs par défaut
    return { ...defaultState(), ...parsed };
  } catch (e) {
    console.warn("Lecture du match sauvegardé impossible, redémarrage à zéro.", e);
    return defaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Sauvegarde impossible (stockage plein ou indisponible).", e);
  }
}

/* ===================== État + reducer ===================== */

let state = loadState();

function dispatch(action) {
  state = reducer(state, action);
  saveState(state);
  render();
}

function pushHistory(s, entry) {
  return { ...s, history: [...s.history, entry] };
}

function reducer(s, action) {
  switch (action.type) {
    case "setName": {
      const key = action.side === "a" ? "teamA" : "teamB";
      return { ...s, [key]: action.value };
    }
    case "stat": {
      const statsKey = action.side === "a" ? "statsA" : "statsB";
      const next = {
        ...s,
        [statsKey]: { ...s[statsKey], [action.key]: s[statsKey][action.key] + 1 },
      };
      return pushHistory(next, { kind: "stat", side: action.side, key: action.key });
    }
    case "sideout": {
      const nextSideout = { ...s.sideoutA, [action.key]: s.sideoutA[action.key] + 1 };
      const scoreBumped = action.key === "sideoutGagne" || action.key === "serviceGagne";
      const scoreA = scoreBumped ? s.scoreA + 1 : s.scoreA;
      const next = { ...s, sideoutA: nextSideout, scoreA };
      return pushHistory(next, { kind: "sideout", key: action.key, scoreBumped });
    }
    case "pointB": {
      const next = { ...s, scoreB: s.scoreB + 1 };
      return pushHistory(next, { kind: "pointB" });
    }
    case "undo": {
      if (s.history.length === 0) return s;
      const last = s.history[s.history.length - 1];
      const newHistory = s.history.slice(0, -1);
      let next = { ...s, history: newHistory };

      if (last.kind === "stat") {
        const statsKey = last.side === "a" ? "statsA" : "statsB";
        next[statsKey] = {
          ...next[statsKey],
          [last.key]: Math.max(0, next[statsKey][last.key] - 1),
        };
      } else if (last.kind === "sideout") {
        next.sideoutA = {
          ...next.sideoutA,
          [last.key]: Math.max(0, next.sideoutA[last.key] - 1),
        };
        if (last.scoreBumped) next.scoreA = Math.max(0, next.scoreA - 1);
      } else if (last.kind === "pointB") {
        next.scoreB = Math.max(0, next.scoreB - 1);
      }
      return next;
    }
    case "reset":
      return defaultState();
    default:
      return s;
  }
}

/* ===================== Utilitaires d'affichage ===================== */

function ratio(num, den) {
  if (den <= 0) return null;
  return num / den;
}
function formatPct(r) {
  return r === null ? "—" : `${Math.round(r * 100)}%`;
}
function esc(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ===================== Rendu : écran Saisie ===================== */

function renderActionButton(label, sub, side, key, extraClass, attrName) {
  return `
    <button class="action-btn ${extraClass}" data-${attrName}="${key}" data-side="${side}">
      <span class="action-label">${esc(label)} +1</span>
      <span class="action-sub">Total : ${sub}</span>
    </button>
  `;
}

function renderSetupScreen() {
  document.getElementById("input-team-a").value = state.teamA;
  document.getElementById("input-team-b").value = state.teamB;
  document.getElementById("score-a").textContent = state.scoreA;
  document.getElementById("score-b").textContent = state.scoreB;

  const nameA = state.teamA || "Équipe A";
  const nameB = state.teamB || "Équipe B";

  document.getElementById("stats-a").innerHTML = STAT_KEYS.map((k) =>
    renderActionButton(STAT_LABELS[k], state.statsA[k], "a", k, "team-a", "action")
  ).join("");

  document.getElementById("stats-b").innerHTML = STAT_KEYS.map((k) =>
    renderActionButton(STAT_LABELS[k], state.statsB[k], "b", k, "team-b", "action")
  ).join("");

  document.getElementById("point-b-label").textContent = nameB;
  document.getElementById("point-b-hint").textContent =
    `Utilisez ce bouton quand ${nameB} marque un point (le score de ${nameA} avance automatiquement via service/sideout gagné ci-dessous).`;

  document.getElementById("sideout-team-label").textContent = `— ${nameA} uniquement`;

  document.getElementById("sideout-buttons").innerHTML = [
    renderActionButton("Sideout joué", state.sideoutA.sideoutJoue, "a", "sideoutJoue", "ball", "sideout"),
    renderActionButton("Sideout gagné", state.sideoutA.sideoutGagne, "a", "sideoutGagne", "ball", "sideout"),
    renderActionButton("Service joué", state.sideoutA.serviceJoue, "a", "serviceJoue", "ball", "sideout"),
    renderActionButton("Service gagné", state.sideoutA.serviceGagne, "a", "serviceGagne", "ball", "sideout"),
  ].join("");

  const undoBtn = document.getElementById("btn-undo");
  undoBtn.disabled = state.history.length === 0;

  bindSetupEvents();
}

function bindSetupEvents() {
  document.querySelectorAll('#stats-a .action-btn, #stats-b .action-btn').forEach((btn) => {
    btn.onclick = () => dispatch({ type: "stat", side: btn.dataset.side, key: btn.dataset.action });
  });

  document.querySelectorAll('#sideout-buttons .action-btn').forEach((btn) => {
    btn.onclick = () => dispatch({ type: "sideout", key: btn.dataset.sideout });
  });
}

/* ===================== Rendu : écran Dashboard ===================== */

function renderStackedRow(label, a, b) {
  const total = a + b;
  const pctA = total > 0 ? (a / total) * 100 : 50;
  const pctB = total > 0 ? (b / total) * 100 : 50;
  const fill = total === 0
    ? `<div style="width:100%;background:var(--line);"></div>`
    : `<div class="stacked-fill-a" style="width:${pctA}%"></div><div class="stacked-fill-b" style="width:${pctB}%"></div>`;

  return `
    <div class="stacked-row">
      <div class="stacked-head">
        <span class="stacked-label">${esc(label)}</span>
        <span class="stacked-values">${a} – ${b}</span>
      </div>
      <div class="stacked-track" role="img" aria-label="${esc(label)} : ${a} contre ${b}">
        ${fill}
      </div>
    </div>
  `;
}

function renderRatioCard(title, num, den) {
  const r = ratio(num, den);
  const widthPct = r === null ? 0 : Math.round(r * 100);
  return `
    <div class="ratio-card">
      <span class="ratio-title">${esc(title)}</span>
      <div class="ratio-value-row">
        <span class="ratio-value">${formatPct(r)}</span>
        <span class="ratio-detail">${num} gagnés / ${den} joués</span>
      </div>
      <div class="ratio-track"><div class="ratio-fill" style="width:${widthPct}%"></div></div>
    </div>
  `;
}

function renderDashboardScreen() {
  const nameA = state.teamA || "Équipe A";
  const nameB = state.teamB || "Équipe B";

  document.getElementById("dash-name-a").textContent = nameA;
  document.getElementById("dash-name-b").textContent = nameB;
  document.getElementById("dash-score-a").textContent = state.scoreA;
  document.getElementById("dash-score-b").textContent = state.scoreB;
  document.getElementById("legend-a").textContent = nameA;
  document.getElementById("legend-b").textContent = nameB;
  document.getElementById("ratio-title").textContent = `Ratios — ${nameA}`;

  const totalA = STAT_KEYS.reduce((sum, k) => sum + state.statsA[k], 0);
  const totalB = STAT_KEYS.reduce((sum, k) => sum + state.statsB[k], 0);

  const rows = STAT_KEYS.map((k) =>
    renderStackedRow(STAT_LABELS[k], state.statsA[k], state.statsB[k])
  ).join("");

  document.getElementById("stacked-bars").innerHTML =
    rows + `<div class="stacked-divider">${renderStackedRow("Total actions", totalA, totalB)}</div>`;

  document.getElementById("ratio-cards").innerHTML =
    renderRatioCard("Efficacité sideout", state.sideoutA.sideoutGagne, state.sideoutA.sideoutJoue) +
    renderRatioCard("Efficacité service", state.sideoutA.serviceGagne, state.sideoutA.serviceJoue);
}

/* ===================== Rendu global + navigation ===================== */

function render() {
  renderSetupScreen();
  renderDashboardScreen();
}

function goToScreen(screenId) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("is-active"));
  document.getElementById(`screen-${screenId}`).classList.add("is-active");

  document.querySelectorAll(".tab").forEach((el) => {
    const isActive = el.dataset.screen === screenId;
    el.classList.toggle("is-active", isActive);
    el.setAttribute("aria-selected", String(isActive));
  });
}

/* ===================== Liaison des événements statiques ===================== */

function bindStaticEvents() {
  document.getElementById("input-team-a").addEventListener("input", (e) => {
    dispatch({ type: "setName", side: "a", value: e.target.value });
  });
  document.getElementById("input-team-b").addEventListener("input", (e) => {
    dispatch({ type: "setName", side: "b", value: e.target.value });
  });

  document.getElementById("btn-point-b").onclick = () => dispatch({ type: "pointB" });
  document.getElementById("btn-undo").onclick = () => dispatch({ type: "undo" });

  document.getElementById("btn-reset").onclick = () => {
    if (confirm("Réinitialiser le match en cours ? Cette action est définitive.")) {
      dispatch({ type: "reset" });
    }
  };

  document.getElementById("btn-goto-dashboard").onclick = () => goToScreen("dashboard");
  document.getElementById("btn-back-setup").onclick = () => goToScreen("setup");

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.onclick = () => goToScreen(tab.dataset.screen);
  });
}

/* ===================== Démarrage ===================== */

document.addEventListener("DOMContentLoaded", () => {
  bindStaticEvents();
  render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) => {
      console.warn("Service worker non enregistré :", e);
    });
  }
});
