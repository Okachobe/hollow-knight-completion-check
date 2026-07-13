/**
 * map.js — "Cartographer's Atlas" Map screen (Leaflet interactive map).
 *
 * Renders the full Hallownest map image (src/img/hallownest-map-hd.webp) in a
 * Leaflet CRS.Simple viewport with real pan/zoom. The player's per-entry "pin
 * to map" selection (map-state.js, persisted to localStorage) drives which
 * markers appear; each is placed at its REGION's anchor with a deterministic
 * scatter, then clustered so zoomed-out shows per-area counts and zoomed-in
 * spreads the pins — like the reference tool, but with our save-synced filtering.
 *
 * Selection layering (HANDOFF §2.2): the pin Set is the source of truth. The
 * global Incomplete-only filter removes complete markers from the map; the
 * Spoilers filter blurs names/locations in popups (both read live from the
 * sidebar checkboxes). Category chips + global buttons bulk-mutate the Set.
 *
 * DOM / lifecycle contract:
 *  - render(db) returns a stable `#hk-map-root` with a re-rendered `#hk-map-ui`
 *    (header/controls/chips) and a `.hk-leaflet` container.
 *  - ensureLeaflet() (idempotent) is called after every #generated render (rAF,
 *    from page-functions) and on show; it (re)initialises Leaflet on the current
 *    container — the innerHTML replace destroys the old node, so it detects the
 *    fresh node and rebuilds, restoring the saved view — and invalidateSize()s.
 *  - refreshMap() re-renders the UI + rebuilds markers (keeping the view) +
 *    syncs inline ledger pins, after any selection change.
 *  - bindMapInteractions() installs ONE delegated document click listener.
 *
 * The map image is Team Cherry map art (community stitch), used under the same
 * unofficial-fan posture as the boss portraits — see the in-app Credits/About.
 */

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";

import { CATEGORIES } from "../map-data.js";
import HK from "../hk-database.js";
import {
  collectMarkers,
  isSelected,
  toggle,
  bulk,
  selectedCount,
  pinButton,
} from "../map-state.js";
import { sym, WIKI } from "../ledger-components.js";
import { escapeHtml } from "../ledger-util.js";

import mapImg from "../../img/hallownest-map-hd.webp";

/* -------------------------------------------------------------------------- */
/* Base map geometry + per-region anchors (pixel coords on the 4183x2955 image)  */
/* -------------------------------------------------------------------------- */

const IMG_W = 4183;
const IMG_H = 2955;

/** region id -> { x, y, r } anchor (px from top-left) + scatter radius (px). */
const REGION_XY = {
  "Dirtmouth": { x: 1785, y: 700, r: 130 },
  "Howling Cliffs": { x: 470, y: 615, r: 200 },
  "Forgotten Crossroads": { x: 1850, y: 1120, r: 300 },
  "Crystal Peak": { x: 2735, y: 675, r: 260 },
  "Greenpath": { x: 580, y: 1150, r: 300 },
  "Fog Canyon": { x: 1325, y: 1395, r: 170 },
  "Fungal Wastes": { x: 1735, y: 1800, r: 280 },
  "Resting Grounds": { x: 2650, y: 1190, r: 210 },
  "City of Tears": { x: 2660, y: 1690, r: 300 },
  "Royal Waterways": { x: 2390, y: 2050, r: 230 },
  "Queen's Gardens": { x: 560, y: 1760, r: 240 },
  "Kingdom's Edge": { x: 3330, y: 1745, r: 300 },
  "Colosseum of Fools": { x: 3080, y: 900, r: 90 },
  "The Hive": { x: 3145, y: 2170, r: 120 },
  "Deepnest": { x: 900, y: 2120, r: 280 },
  "Ancient Basin": { x: 2100, y: 2255, r: 200 },
  "The Abyss": { x: 2075, y: 2695, r: 110 },
  "White Palace": { x: 215, y: 2120, r: 130 },
  "Godhome": { x: 3780, y: 2600, r: 90 },
};

/** category id -> Material Symbol glyph + label (for popups). */
const CAT_ICON = {};
const CAT_LABEL = {};
for (const c of CATEGORIES) { CAT_ICON[c.id] = c.icon; CAT_LABEL[c.id] = c.label; }

const VIEW_KEY = "hkMapView";

/* CRS.Simple: image pixel (px,py from top-left) -> Leaflet latLng (lat grows up). */
function xy(px, py) {
  return L.latLng(IMG_H - py, px);
}

/** Deterministic golden-angle scatter for marker i of n within a region radius. */
function scatter(anchor, i, n) {
  if (n <= 1) return { x: anchor.x, y: anchor.y };
  const golden = 2.399963229728653;
  const t = i + 0.5;
  const r = anchor.r * Math.sqrt(t / n);
  const a = t * golden;
  return { x: anchor.x + r * Math.cos(a), y: anchor.y + r * Math.sin(a) };
}

/* -------------------------------------------------------------------------- */
/* Live filter state (read from the shared sidebar checkboxes)                 */
/* -------------------------------------------------------------------------- */

function incompleteOnly() {
  const cb = typeof document !== "undefined" && document.getElementById("checkbox-incomplete");
  return !!(cb && cb.checked);
}
function spoilersHidden() {
  // Spoilers checkbox CHECKED == reveal; unchecked == blurred (see page-functions).
  const cb = typeof document !== "undefined" && document.getElementById("checkbox-spoilers");
  return !(cb && cb.checked);
}

/* -------------------------------------------------------------------------- */
/* UI chrome (header / controls / chips) — re-rendered on selection change      */
/* -------------------------------------------------------------------------- */

function renderHeader(selDone, selTotal) {
  const pinned = selectedCount();
  return (
    `<div class="flex flex-col md:flex-row md:justify-between md:items-end gap-md mb-md">` +
      `<div class="hk-map-head-text">` +
        `<h2 class="font-headline-md text-headline-md text-on-surface relic-glow">Cartographer's Atlas</h2>` +
        `<p class="font-label-sm text-lichen-blue">Your personal map of Hallownest — pin what you still want to find, then explore.</p>` +
        `<p class="font-caption text-caption text-outline mt-xs">Scroll or pinch to zoom, drag to pan. Sidebar Spoilers &amp; Incomplete-only filters apply here.</p>` +
      `</div>` +
      `<div class="flex items-center gap-sm shrink-0">` +
        `<span class="hk-summary-pin">${sym("push_pin", 1)}${pinned} pinned</span>` +
        `<span class="font-code-path text-secondary-container bg-surface-glow px-2 py-1 rounded border border-border-dim">[${selDone}/${selTotal}]</span>` +
      `</div>` +
    `</div>`
  );
}

function renderGlobalControls() {
  return (
    `<div class="flex flex-wrap gap-sm mb-md">` +
      `<button type="button" class="hk-map-btn" data-map-action="all">${sym("select_all", 0)}Select all</button>` +
      `<button type="button" class="hk-map-btn" data-map-action="none">${sym("deselect", 0)}Clear all</button>` +
      `<button type="button" class="hk-map-btn" data-map-action="incomplete">${sym("restart_alt", 0)}Reset to incomplete</button>` +
      `<button type="button" class="hk-map-btn" data-map-collapse>${sym(_collapsed ? "expand_more" : "expand_less", 0)}${_collapsed ? "Show categories" : "Hide categories"}</button>` +
      `<button type="button" class="hk-map-btn hk-map-btn-accent" data-map-maximize>${sym(_maximized ? "close_fullscreen" : "open_in_full", 0)}${_maximized ? "Exit full map" : "Maximize"}</button>` +
    `</div>`
  );
}

function renderCategoryChips(markers) {
  let html = `<div id="hk-map-cats" class="flex flex-wrap gap-sm mb-md">`;
  for (const cat of CATEGORIES) {
    const inCat = markers.filter((m) => m.category === cat.id);
    const total = inCat.length;
    const sel = inCat.reduce((n, m) => n + (isSelected(m.id) ? 1 : 0), 0);
    const state = sel === total && total > 0 ? "is-all" : sel > 0 ? "is-some" : "is-none";
    const cls =
      state === "is-all" ? "hk-cat-chip is-all" : state === "is-some" ? "hk-cat-chip is-some" : "hk-cat-chip is-none";
    html +=
      `<button type="button" class="${cls}" data-map-cat="${cat.id}" aria-pressed="${state === "is-all" ? "true" : "false"}">` +
        sym(cat.icon, sel > 0 ? 1 : 0) +
        `<span class="hk-cat-label">${escapeHtml(cat.label)}</span>` +
        `<span class="hk-cat-count">[${sel}/${total}]</span>` +
      `</button>`;
  }
  html += `</div>`;
  return html;
}

function renderUI(markers) {
  const selected = markers.filter((m) => isSelected(m.id));
  const selDone = selected.reduce((n, m) => n + (m.complete ? 1 : 0), 0);
  return (
    `<div id="hk-map-ui">` +
      renderHeader(selDone, selected.length) +
      renderGlobalControls() +
      renderCategoryChips(markers) +
    `</div>`
  );
}

/** Screen renderer: re-renderable UI + the Leaflet container (owned by ensureLeaflet). */
export function render(db) {
  const markers = collectMarkers(db);
  const rootCls = [_maximized ? "hk-map-max" : "", _collapsed ? "hk-cats-collapsed" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    `<div id="hk-map-root" class="${rootCls}">` +
      renderUI(markers) +
      `<div id="hk-leaflet" class="hk-leaflet" role="application" aria-label="Interactive Hallownest map"></div>` +
    `</div>`
  );
}

/* -------------------------------------------------------------------------- */
/* Leaflet map + marker layer                                                  */
/* -------------------------------------------------------------------------- */

let _map = null;      // L.Map
let _mapEl = null;    // DOM node _map is bound to (detects innerHTML replacement)
let _cluster = null;  // L.markerClusterGroup
let _labelLayer = null; // L.layerGroup of crisp region-name labels
let _bounds = null;   // full-image LatLngBounds (for re-fitting on resize)
let _maximized = false; // map fills the content area (fixed, right of the sidebar)
let _collapsed = false; // category chips hidden to give the map more room

function clusterIconCreate(cluster) {
  return L.divIcon({
    html: `<div class="hk-cluster-inner">${cluster.getChildCount()}</div>`,
    className: "hk-cluster",
    iconSize: [40, 40],
  });
}

function pinIcon(marker) {
  const state = marker.complete ? "hk-pin-done" : "hk-pin-miss";
  const glyph = CAT_ICON[marker.category] || "location_on";
  // Category glyph inside the teardrop (counter-rotated upright in CSS); the
  // body colour still encodes found/missing so both read at a glance.
  return L.divIcon({
    className: "hk-pin-wrap",
    html:
      `<div class="hk-pin ${state}">` +
        `<span class="hk-pin-glyph material-symbols-outlined" translate="no">${glyph}</span>` +
      `</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

function popupHtml(m) {
  const blur = !m.complete && spoilersHidden();
  const catLabel = CAT_LABEL[m.category] || m.category;
  const stateCls = m.complete ? "hk-pop-state is-done" : "hk-pop-state is-miss";
  const stateTxt = m.complete ? "Found" : "Missing";
  const nameInner = escapeHtml(m.name);
  const nameHtml = blur ? `<span class="spoiler-red blurred">${nameInner}</span>` : nameInner;
  const loc = m.spoiler
    ? `<div class="hk-pop-loc"><span class="${blur ? "spoiler-span blurred" : "spoiler-span-green"}"><span class="spoiler-text">${m.spoiler}</span></span></div>`
    : "";
  const wiki = m.wiki
    ? `<a class="hk-pop-wiki" href="${WIKI}${m.wiki}" target="_blank" rel="noopener">View on Wiki ↗</a>`
    : "";
  return (
    `<div class="hk-pop">` +
      `<div class="hk-pop-top">${sym(CAT_ICON[m.category] || "location_on", 1)}` +
        `<span class="hk-pop-cat">${escapeHtml(catLabel)}</span>` +
        `<span class="${stateCls}">${stateTxt}</span>` +
      `</div>` +
      `<div class="hk-pop-name">${nameHtml}</div>` +
      loc +
      `<div class="hk-pop-foot flex items-center gap-sm mt-xs">${pinButton(m.id, true)}${wiki}</div>` +
    `</div>`
  );
}

/** Draw one always-sharp DOM label per region (rebuilt on each map init). */
function addRegionLabels() {
  if (!_map) return;
  if (_labelLayer) { _map.removeLayer(_labelLayer); _labelLayer = null; }
  _labelLayer = L.layerGroup([], { pane: "hkLabels" });
  for (const region of Object.keys(REGION_XY)) {
    const a = REGION_XY[region];
    const icon = L.divIcon({
      className: "hk-region-label-wrap",
      html: `<span class="hk-region-label">${escapeHtml(region)}</span>`,
      iconSize: [0, 0],
    });
    L.marker(xy(a.x, a.y), { icon, interactive: false, keyboard: false, pane: "hkLabels" }).addTo(_labelLayer);
  }
  _labelLayer.addTo(_map);
}

/** Rebuild the marker cluster layer from current selection + Incomplete-only filter. */
function rebuildMarkers() {
  if (!_map || !_cluster) return;
  _cluster.clearLayers();
  let markers = collectMarkers(HK).filter((m) => isSelected(m.id));
  if (incompleteOnly()) markers = markers.filter((m) => !m.complete);

  const byRegion = {};
  for (const m of markers) (byRegion[m.region] || (byRegion[m.region] = [])).push(m);

  const layers = [];
  for (const region of Object.keys(byRegion)) {
    const anchor = REGION_XY[region];
    if (!anchor) continue;
    const list = byRegion[region];
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const p = scatter(anchor, i, list.length);
      const mk = L.marker(xy(p.x, p.y), { icon: pinIcon(m), keyboard: false });
      mk.bindPopup(() => popupHtml(m), { className: "hk-popup", autoPan: true });
      layers.push(mk);
    }
  }
  _cluster.addLayers(layers);
}

function saveView() {
  if (!_map) return;
  try {
    const c = _map.getCenter();
    window.localStorage.setItem(VIEW_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, z: _map.getZoom() }));
  } catch (e) { /* non-fatal */ }
}
function loadView() {
  try {
    const raw = window.localStorage.getItem(VIEW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/**
 * Initialise (or re-initialise) Leaflet on #hk-leaflet, then invalidateSize.
 * Idempotent: same live container -> just resize + rebuild; fresh container
 * (first show, or after a full #generated re-render) -> tear down + rebuild.
 */
export function ensureLeaflet() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("hk-leaflet");
  if (!el) return;

  if (_map && _mapEl === el) {
    _map.invalidateSize(false);
    rebuildMarkers();
    return;
  }

  // Do NOT initialise while the container is hidden (display:none -> 0x0): Leaflet
  // would clamp fitBounds to minZoom and render a tiny map. Wait until the router
  // has shown the screen (ensureLeaflet is called again on show, with real size).
  if (el.clientWidth === 0 || el.clientHeight === 0) return;

  if (_map) {
    try { _map.remove(); } catch (e) { /* ignore */ }
    _map = null;
  }

  const bounds = L.latLngBounds(xy(0, IMG_H), xy(IMG_W, 0));
  _bounds = bounds;
  _map = L.map(el, {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 1,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    attributionControl: false,
    maxBounds: bounds.pad(0.2),
    maxBoundsViscosity: 0.7,
  });
  _mapEl = el;

  L.imageOverlay(mapImg, bounds).addTo(_map);

  // Crisp DOM region labels. The old base was a screenshot with area names baked
  // into the raster (blurry when upscaled); this painterly base is UNLABELED, so
  // we draw region names as always-sharp DOM text in their own click-through pane
  // above the image (the technique MapGenie uses for its labels).
  _map.createPane("hkLabels");
  _map.getPane("hkLabels").style.zIndex = "650";
  _map.getPane("hkLabels").style.pointerEvents = "none";
  addRegionLabels();

  const saved = loadView();
  if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) {
    _map.setView([saved.lat, saved.lng], saved.z);
  } else {
    _map.fitBounds(bounds);
  }
  _map.on("moveend zoomend", saveView);

  _cluster = L.markerClusterGroup({
    maxClusterRadius: 44,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: clusterIconCreate,
  });
  _map.addLayer(_cluster);

  rebuildMarkers();
  // Catch the case where the container was still animating from display:none.
  setTimeout(() => {
    if (_map && _mapEl === document.getElementById("hk-leaflet")) _map.invalidateSize(false);
  }, 60);
}

/* -------------------------------------------------------------------------- */
/* Refresh after a selection change                                            */
/* -------------------------------------------------------------------------- */

/** Re-render the UI chrome, rebuild markers (keeping the view), sync ledger pins. */
export function refreshMap() {
  if (typeof document === "undefined") return;
  const ui = document.getElementById("hk-map-ui");
  if (ui) ui.outerHTML = renderUI(collectMarkers(HK));
  applyLayout();
  rebuildMarkers();
  syncAllPins();
}

/** Reflect the maximize/collapse state onto #hk-map-root (classes only — no
 *  view change, so selection refreshes never disturb the user's zoom/pan). */
function applyLayout() {
  if (typeof document === "undefined") return;
  const root = document.getElementById("hk-map-root");
  if (!root) return;
  root.classList.toggle("hk-map-max", _maximized);
  root.classList.toggle("hk-cats-collapsed", _collapsed);
}

/** After a container-size change (maximize/collapse toggle), resize Leaflet and
 *  re-fit the whole map so it fills the new area instead of floating small. */
function refitAfterResize() {
  if (!_map) return;
  setTimeout(() => {
    if (!_map) return;
    _map.invalidateSize(false);
    if (_bounds) _map.fitBounds(_bounds);
  }, 240);
}

/** Re-sync every [data-map-pin] button in the document to the current selection. */
function syncAllPins() {
  if (typeof document === "undefined") return;
  const pins = document.querySelectorAll("[data-map-pin]");
  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i];
    const on = isSelected(pin.getAttribute("data-map-pin"));
    pin.classList.toggle("is-pinned", on);
    pin.setAttribute("aria-pressed", on ? "true" : "false");
    const icon = pin.querySelector(".material-symbols-outlined");
    if (icon) icon.style.fontVariationSettings = `'FILL' ${on ? 1 : 0}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Delegated interactions                                                      */
/* -------------------------------------------------------------------------- */

let _bound = false;

export function bindMapInteractions() {
  if (_bound || typeof document === "undefined") return;
  _bound = true;
  document.addEventListener("click", onMapClick, false);
  // Rebuild markers when the shared Incomplete-only filter flips (changes which
  // markers belong on the map). Spoilers only affects popup text (built on open).
  const inc = document.getElementById("checkbox-incomplete");
  if (inc) inc.addEventListener("change", () => rebuildMarkers(), false);
}

function onMapClick(e) {
  const target = e.target;
  if (!target || typeof target.closest !== "function") return;

  const pin = target.closest("[data-map-pin]");
  if (pin) {
    e.preventDefault();
    const id = pin.getAttribute("data-map-pin");
    const now = toggle(id);
    pin.classList.toggle("is-pinned", now);
    pin.setAttribute("aria-pressed", now ? "true" : "false");
    const icon = pin.querySelector(".material-symbols-outlined");
    if (icon) icon.style.fontVariationSettings = `'FILL' ${now ? 1 : 0}`;
    refreshMap();
    return;
  }

  const cat = target.closest("[data-map-cat]");
  if (cat) {
    const catId = cat.getAttribute("data-map-cat");
    const inCat = collectMarkers(HK).filter((m) => m.category === catId);
    const allSelected = inCat.length > 0 && inCat.every((m) => isSelected(m.id));
    bulk(HK, allSelected ? "none" : "all", catId);
    refreshMap();
    return;
  }

  const action = target.closest("[data-map-action]");
  if (action) {
    bulk(HK, action.getAttribute("data-map-action"));
    refreshMap();
    return;
  }

  const maximize = target.closest("[data-map-maximize]");
  if (maximize) {
    e.preventDefault();
    _maximized = !_maximized;
    refreshMap();          // re-renders the button label + re-applies layout
    refitAfterResize();    // container size changed -> resize + re-fit
    return;
  }

  const collapse = target.closest("[data-map-collapse]");
  if (collapse) {
    e.preventDefault();
    _collapsed = !_collapsed;
    refreshMap();
    refitAfterResize();
    return;
  }
}
