/**
 * map-state.js — Cartographer's Atlas selection state.
 *
 * Owns the user's per-entry "show on map" selection (a Set of "section/key"
 * ids), persisted to localStorage (key `hkMapSelected`), plus the shared
 * DB->marker join used by both the Map screen and the inline ledger pins.
 *
 * Leaf module: imports only the pure map-data resolver and the shared
 * completion helper. No DOM access except a guarded localStorage.
 *
 * Selection semantics (see HANDOFF §2.2): a marker is "on the map" iff its id
 * is in the selected Set. Category chips and the global buttons are bulk
 * mutations of that Set; the Spoilers / Incomplete-only view filters are
 * applied on top by CSS (they do not change the Set).
 */

import { SECTION_CATEGORY, regionForEntry } from "./map-data.js";
import { isEntryComplete } from "./ledger-util.js";

const KEY = "hkMapSelected";
const VIEW_KEY = "hkMapRegion";

/* -------------------------------------------------------------------------- */
/* localStorage guard (self-contained so this stays a leaf module)             */
/* -------------------------------------------------------------------------- */

function storageOK() {
  try {
    const x = "__hkmap_test__";
    window.localStorage.setItem(x, x);
    window.localStorage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* The DB -> marker join                                                       */
/* -------------------------------------------------------------------------- */

/** Stable marker id for an entry. */
export function idFor(sectionKey, entryKey) {
  return `${sectionKey}/${entryKey}`;
}

/**
 * @typedef {{id:string, section:string, key:string, entry:object, region:string,
 *            category:string, complete:boolean, name:string, spoiler:string,
 *            wiki:string}} Marker
 */

/**
 * Walk every mappable section and return one Marker per placeable entry
 * (entries with no resolvable region are skipped — see regionForEntry).
 * @param {object} db the HK singleton
 * @returns {Marker[]}
 */
export function collectMarkers(db) {
  const out = [];
  if (!db || !db.sections) return out;
  for (const section of Object.keys(SECTION_CATEGORY)) {
    const sec = db.sections[section];
    if (!sec || !sec.entries) continue;
    for (const key of Object.keys(sec.entries)) {
      if (!Object.prototype.hasOwnProperty.call(sec.entries, key)) continue;
      const entry = sec.entries[key];
      if (!entry || typeof entry !== "object") continue;
      const region = regionForEntry(section, key, entry);
      if (!region) continue;
      out.push({
        id: idFor(section, key),
        section,
        key,
        entry,
        region,
        category: SECTION_CATEGORY[section],
        complete: isEntryComplete(entry),
        name: entry.name != null ? String(entry.name) : key,
        spoiler: entry.spoiler != null ? String(entry.spoiler) : "",
        wiki: entry.wiki || "",
      });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Selection Set (cached, mirrored to localStorage)                            */
/* -------------------------------------------------------------------------- */

let _set = null;          // Set<string>
let _initialized = false; // true once a stored value exists or a default is written

function load() {
  if (_set) return _set;
  _set = new Set();
  if (storageOK()) {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) arr.forEach((id) => _set.add(id));
        _initialized = true; // a stored value exists (even "[]")
      }
    } catch (e) {
      /* ignore corrupt value; start empty */
    }
  }
  return _set;
}

function persist() {
  if (!storageOK()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([..._set]));
  } catch (e) {
    /* quota / disabled — non-fatal */
  }
}

/**
 * First-visit default: if nothing has ever been stored, pre-select every
 * currently-incomplete marker ("what I still need to find"). Idempotent.
 * @param {object} db the HK singleton
 */
export function ensureDefault(db) {
  load();
  if (_initialized) return;
  for (const m of collectMarkers(db)) {
    if (!m.complete) _set.add(m.id);
  }
  _initialized = true;
  persist();
}

/** @param {string} id @returns {boolean} */
export function isSelected(id) {
  return load().has(id);
}

/** @param {string} id @param {boolean} on */
export function setSelected(id, on) {
  const s = load();
  if (on) s.add(id);
  else s.delete(id);
  _initialized = true;
  persist();
}

/** Flip one id; returns the new state. @param {string} id @returns {boolean} */
export function toggle(id) {
  const s = load();
  let now;
  if (s.has(id)) {
    s.delete(id);
    now = false;
  } else {
    s.add(id);
    now = true;
  }
  _initialized = true;
  persist();
  return now;
}

/**
 * Bulk mutate the selection, optionally scoped to one category id.
 * @param {object} db the HK singleton
 * @param {"all"|"none"|"incomplete"} action
 * @param {string} [categoryId] restrict to this map category (see CATEGORIES)
 */
export function bulk(db, action, categoryId) {
  const s = load();
  for (const m of collectMarkers(db)) {
    if (categoryId && m.category !== categoryId) continue;
    if (action === "all") {
      s.add(m.id);
    } else if (action === "none") {
      s.delete(m.id);
    } else if (action === "incomplete") {
      if (m.complete) s.delete(m.id);
      else s.add(m.id);
    }
  }
  _initialized = true;
  persist();
}

/** @returns {number} number of selected ids */
export function selectedCount() {
  return load().size;
}

/* -------------------------------------------------------------------------- */
/* Expanded-region view (which region's detail panel is open; "" = overview)   */
/* -------------------------------------------------------------------------- */

export function getRegionView() {
  if (!storageOK()) return "";
  try {
    return window.localStorage.getItem(VIEW_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function setRegionView(region) {
  if (!storageOK()) return;
  try {
    if (region) window.localStorage.setItem(VIEW_KEY, region);
    else window.localStorage.removeItem(VIEW_KEY);
  } catch (e) {
    /* non-fatal */
  }
}

/* -------------------------------------------------------------------------- */
/* Shared markup: the "pin to map" toggle button                               */
/* -------------------------------------------------------------------------- */

/**
 * The pin toggle used both inline on ledger rows and in the Map detail panel.
 * Purge-safe: complete static class-string literals; the only runtime value is
 * the FILL variation setting (inline style), matching the ledger authoring
 * contract. Click handling is delegated (see screens/map.js bindMapInteractions,
 * which listens for [data-map-pin]).
 * @param {string} id       marker id ("section/key")
 * @param {boolean} selected current selection state
 * @returns {string} HTML
 */
export function pinButton(id, selected) {
  const cls = selected
    ? "hk-map-pin is-pinned shrink-0"
    : "hk-map-pin shrink-0";
  const fill = selected ? 1 : 0;
  const label = selected ? "On your map — click to remove" : "Add to your map";
  return (
    `<button type="button" class="${cls}" data-map-pin="${id}" aria-pressed="${selected ? "true" : "false"}" title="${label}" aria-label="${label}">` +
      `<span class="material-symbols-outlined" style="font-variation-settings:'FILL' ${fill};">push_pin</span>` +
    `</button>`
  );
}
