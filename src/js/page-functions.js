import {
  LoadSaveFile
} from "./LoadSaveFile.js";

/* ------------------------ Knight's Ledger render layer ---------------------------------------------------------- */
/* The engine (HKCheckCompletion) mutates the HK singleton, then calls GenerateInnerHTML(HK).
   We build the sidebar/bottom-nav chrome once, render every screen into #generated, populate the
   [x/y] badges (completion rule A), and route between screens. The decrypt/completion engine is untouched. */

import {
  SCREENS,
  renderAllScreens,
  screenCount
} from "./ledger-screens.js";

import {
  navBadge
} from "./ledger-components.js";

import { bindMapInteractions, ensureLeaflet } from "./screens/map.js";
import { ensureDefault } from "./map-state.js";

/* -------------------------- Constants --------------------------------------------------------------------------- */

const ROOT = document.documentElement;
const SCROLL_BUTTON = document.querySelector(".scroll-up-button");
const SYMBOL_FILE = "<span class='material-symbols-outlined text-sm align-middle'>description</span>";

/* Active sidebar/bottom nav-link styling (literal classes so Tailwind keeps them) */
const NAV_ACTIVE_CLASSES = ["bg-surface-container-high", "text-on-surface"];

/* -------------------------- State --------------------------------------------------------------------------------- */

let chromeBuilt = false;

let benchmarkTimes = {
  LoadSaveFile: {
    name: "LoadSaveFile()",
    timeStart: 0,
    timeEnd: 0
  },
  CheckCompletion: {
    name: "HKCheckCompletion()",
    timeStart: 0,
    timeEnd: 0
  },
  GenerateInnerHTML: {
    name: "GenerateInnerHTML()",
    timeStart: 0,
    timeEnd: 0
  },
  HKReadTextArea: {
    name: "HKReadTextArea()",
    timeStart: 0,
    timeEnd: 0
  },
  Total: {
    name: "Total",
    timeStart: 0,
    timeEnd: 0
  }
};


/* ######################################################################################### */

function Benchmark(bench) {

  let result = 0;

  for (let time in bench) {

    if (bench[time].timeStart !== 0 && bench[time].timeEnd !== 0) {

      result = bench[time].timeEnd - bench[time].timeStart;
      console.info(`${bench[time].name} time (ms) = %c${result.toFixed(2)}`, `color: #008cdc; font-weight: 700;`);
    }
    bench[time].timeStart = 0;
    bench[time].timeEnd = 0;
  }
}

function ScrollToElement(element) {

  /* Scroll to the element top */
  element.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function ShowElement(element) {

  element.classList.add("visible-block");
  element.classList.add("opacity-full");
  element.classList.remove("hidden");
}

function HideElement(element) {

  element.classList.remove("visible-block");
  element.classList.remove("opacity-full");
  element.classList.add("hidden");
}

function TogglePageScrollElement(root, element, ratio) {

  if (!element) return;

  /* Maximum number of pixels that can be scrolled by the user */
  let scrollTotal = root.scrollHeight - root.clientHeight;

  if ((root.scrollTop / scrollTotal) > ratio) {
    /* Show button */
    ShowElement(element);
  } else {
    /* Hide button */
    HideElement(element);
  }
}


/* ################################### Chrome + Router ########################################################## */

/**
 * Builds the sidebar nav list and mobile bottom nav from the SCREENS registry. Runs once.
 */
function BuildChrome() {

  const navList = document.getElementById("ledger-nav-list");
  const bottomNav = document.getElementById("ledger-bottom-nav");
  if (!navList || !bottomNav) return;

  let side = "";
  let bottom = "";

  for (let screen of SCREENS) {

    side += [
      `<li><a href="#" data-screen="${screen.id}" class="ledger-nav-link flex items-center gap-md px-md py-sm rounded-lg text-lichen-blue hover:bg-surface-container-high hover:text-on-surface transition-colors group">`,
      `<span class="material-symbols-outlined group-hover:text-secondary-container transition-colors" style="font-variation-settings:'FILL' 0;">${screen.icon}</span>`,
      `<span class="font-body-bold">${screen.label}</span>`,
      `<span class="ml-auto" data-badge="${screen.id}"></span>`,
      `</a></li>`
    ].join("");

    bottom += [
      `<a href="#" data-screen="${screen.id}" class="ledger-nav-link flex flex-col items-center justify-center gap-1 px-sm py-xs rounded-xl text-lichen-blue transition-colors shrink-0 min-w-[64px]">`,
      `<span class="material-symbols-outlined text-xl" style="font-variation-settings:'FILL' 0;">${screen.icon}</span>`,
      `<span class="font-label-sm text-label-sm-mobile whitespace-nowrap">${screen.label}</span>`,
      `</a>`
    ].join("");
  }

  navList.innerHTML = side;
  bottomNav.innerHTML = bottom;

  navList.addEventListener("click", NavClickHandler);
  bottomNav.addEventListener("click", NavClickHandler);

  chromeBuilt = true;
}

function NavClickHandler(e) {
  let link = e.target.closest(".ledger-nav-link");
  if (!link) return;
  e.preventDefault();
  ShowScreen(link.getAttribute("data-screen"));
}

/**
 * Highlights the active nav-link (both sidebar and bottom nav share the .ledger-nav-link class).
 */
function SetActiveNav(id) {
  document.querySelectorAll(".ledger-nav-link").forEach((link) => {
    let isActive = link.getAttribute("data-screen") === id;
    for (let cls of NAV_ACTIVE_CLASSES) {
      link.classList.toggle(cls, isActive);
    }
    link.classList.toggle("text-lichen-blue", !isActive);
  });
}

/**
 * Shows a single screen, hides the rest, updates the active nav-link, remembers the choice.
 * @param {string} id screen id (data-screen)
 */
function ShowScreen(id) {

  let screens = document.querySelectorAll(".ledger-screen");
  let matched = false;

  screens.forEach((s) => {
    let isActive = s.getAttribute("data-screen") === id;
    s.classList.toggle("hidden", !isActive);
    if (isActive) matched = true;
  });

  /* Fall back to dashboard if the requested screen doesn't exist */
  if (!matched && id !== "dashboard") {
    ShowScreen("dashboard");
    return;
  }

  SetActiveNav(id);

  /* Leaflet computes 0x0 in a display:none container; when the Map screen is
     revealed, (re)size + refresh it now that it has real dimensions. */
  if (id === "map") {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      window.requestAnimationFrame(ensureLeaflet);
    } else {
      ensureLeaflet();
    }
  }

  if (StorageAvailable("localStorage")) {
    localStorage.setItem("hkLedgerScreen", id);
  }

  if (ROOT && ROOT.scrollTo) {
    ROOT.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/**
 * Fills every sidebar [data-badge] slot with a completion badge computed from the DB (rule A).
 */
function UpdateBadges(db) {
  for (let screen of SCREENS) {
    let slot = document.querySelector(`[data-badge="${screen.id}"]`);
    if (!slot) continue;

    /* Dashboard + Statistics carry no count badge */
    if (screen.id === "dashboard" || screen.id === "statistics") {
      slot.innerHTML = "";
      continue;
    }

    let counts = screenCount(screen, db);
    slot.innerHTML = navBadge(counts.done, counts.total);
  }
}


/* ################################### Main render entry point ########################################################## */

/**
 * Builds the chrome (once), renders all screens into #generated, updates badges, and routes
 * to the remembered (or default) screen. Called by the engine after every save analysis and at load.
 * @param {object} db the HK singleton
 */
function GenerateInnerHTML(db) {

  benchmarkTimes.GenerateInnerHTML.timeStart = performance.now();

  /* Seed the map's first-visit default selection before any screen renders */
  ensureDefault(db);

  if (!chromeBuilt) BuildChrome();

  let target = document.getElementById("generated");
  if (target) {
    target.innerHTML = renderAllScreens(db);
  }

  UpdateBadges(db);

  /* Make category cards (Dashboard bento) clickable to their screen. Bind once. */
  if (target && !target.dataset.navBound) {
    target.addEventListener("click", (e) => {
      let card = e.target.closest("[data-screen-link]");
      if (card) ShowScreen(card.getAttribute("data-screen-link"));
    });
    target.dataset.navBound = "1";
  }

  /* Bind the delegated map controls + [data-map-pin] toggles (idempotent) */
  bindMapInteractions();

  /* (Re)mount the Leaflet map after each render — the innerHTML replace above
     recreates #hk-leaflet-map, so this re-attaches it (no-op if hidden or
     already mounted). Deferred so layout/visibility settle first. */
  if (typeof window !== "undefined" && window.requestAnimationFrame) {
    window.requestAnimationFrame(ensureLeaflet);
  } else {
    setTimeout(ensureLeaflet, 0);
  }

  /* Restore the last viewed screen (default: dashboard) */
  let active = "dashboard";
  if (StorageAvailable("localStorage") && localStorage.getItem("hkLedgerScreen")) {
    active = localStorage.getItem("hkLedgerScreen");
  }
  ShowScreen(active);

  benchmarkTimes.GenerateInnerHTML.timeEnd = performance.now();
}

/**
 * Legacy helper kept for API compatibility (imported by HKCheckCompletion.js). Appends HTML to an element.
 */
function AppendHTML(divId, content) {
  let el = document.getElementById(divId.id);
  if (el) el.innerHTML += "\n" + content;
}


/* ################################### Controls (save mode, copy, filename) ########################################### */

function ToggleSaveModeSwitch() {

  let mode = this.value;

  let chooseFileButtonLabel = document.getElementById("file-input-label");
  let analyzeTextButton = document.getElementById("save-area-read");
  let saveTextArea = document.getElementById("save-area");

  if (mode === "modeText") {
    this.value = "modeFile";

    if (chooseFileButtonLabel) chooseFileButtonLabel.classList.remove("hidden");
    if (analyzeTextButton) analyzeTextButton.classList.add("hidden");
    if (saveTextArea) saveTextArea.classList.add("hidden");
  } else {
    this.value = "modeText";

    if (chooseFileButtonLabel) chooseFileButtonLabel.classList.add("hidden");
    if (analyzeTextButton) analyzeTextButton.classList.remove("hidden");
    if (saveTextArea) saveTextArea.classList.remove("hidden");
  }
}

/**
 * Toggles display of "#hk-hints". Guarded so it no-ops if the current screen has no hints element.
 * @param {string} param "hide", "show" or none (optional)
 */
function CheckboxHintsToggle(param = "none") {
  let checkboxId = document.getElementById("checkbox-hints");
  if (!checkboxId) return;
  let hints = document.getElementById("hk-hints");

  switch (param) {
    case "hide":
      if (hints) hints.classList.add("hidden");
      checkboxId.value = "hints-off";
      checkboxId.checked = false;
      if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxHints", "unchecked");
      break;
    case "show":
      if (hints) hints.classList.remove("hidden");
      checkboxId.value = "hints-on";
      checkboxId.checked = true;
      if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxHints", "checked");
      break;
    default:
      if (checkboxId.checked === false) {
        if (hints) hints.classList.add("hidden");
        checkboxId.value = "hints-off";
        if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxHints", "unchecked");
      } else {
        if (hints) hints.classList.remove("hidden");
        checkboxId.value = "hints-on";
        if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxHints", "checked");
      }
  }
}

/**
 * Toggles the ".blurred" class on spoiler elements (names + suffixes) for the Spoilers checkbox.
 * @param {string} param "hide", "show" or none (optional)
 */
function CheckboxSpoilersToggle(param = "none") {

  let checkboxId = document.getElementById("checkbox-spoilers");
  if (!checkboxId) return;
  let allClassElements = document.querySelectorAll(".spoiler-span");
  let allClassElementsRed = document.querySelectorAll(".spoiler-red");
  let length = allClassElements.length;
  let lengthRed = allClassElementsRed.length;

  function blurAll() {
    for (let i = 0; i < length; i++) allClassElements[i].classList.add("blurred");
    for (let i = 0; i < lengthRed; i++) allClassElementsRed[i].classList.add("blurred");
  }
  function revealAll() {
    for (let i = 0; i < length; i++) allClassElements[i].classList.remove("blurred");
    for (let i = 0; i < lengthRed; i++) allClassElementsRed[i].classList.remove("blurred");
  }

  switch (param) {
    case "hide":
      blurAll();
      checkboxId.value = "spoilers-off";
      checkboxId.checked = false;
      if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxSpoilers", "unchecked");
      break;

    case "show":
      revealAll();
      checkboxId.value = "spoilers-on";
      checkboxId.checked = true;
      if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxSpoilers", "checked");
      break;

    default:
      if (checkboxId.checked === false) {
        blurAll();
        checkboxId.value = "spoilers-off";
        if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxSpoilers", "unchecked");
      } else {
        revealAll();
        checkboxId.value = "spoilers-on";
        if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxSpoilers", "checked");
      }
  }
}

/**
 * Toggles the "show-incomplete-only" body class to hide completed entries.
 * @param {string} param "hide", "show" or none (optional)
 */
function CheckboxIncompleteToggle(param = "none") {
  let checkboxId = document.getElementById("checkbox-incomplete");
  if (!checkboxId) return;

  switch (param) {
    case "hide":
      document.body.classList.remove("show-incomplete-only");
      checkboxId.value = "incomplete-off";
      checkboxId.checked = false;
      if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxIncomplete", "unchecked");
      break;

    case "show":
      document.body.classList.add("show-incomplete-only");
      checkboxId.value = "incomplete-on";
      checkboxId.checked = true;
      if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxIncomplete", "checked");
      break;

    default:
      if (checkboxId.checked === false) {
        document.body.classList.remove("show-incomplete-only");
        checkboxId.value = "incomplete-off";
        if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxIncomplete", "unchecked");
      } else {
        document.body.classList.add("show-incomplete-only");
        checkboxId.value = "incomplete-on";
        if (StorageAvailable('localStorage')) localStorage.setItem("hkCheckboxIncomplete", "checked");
      }
  }
}

/**
 * Detects whether Storage is both supported and available.
 * @param {string} type "localStorage" or "sessionStorage"
 * @returns {Boolean}
 */
function StorageAvailable(type) {
  var storage;
  try {
    storage = window[type];
    var x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return e instanceof DOMException && (
        e.code === 22 ||
        e.code === 1014 ||
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
      (storage && storage.length !== 0);
  }
}

/**
 * Fills the innerHTML of a given HTML Element with provided contents.
 */
function FillInnerHTML(elementId, textFill) {
  const element = document.getElementById(elementId);
  if (element) element.innerHTML = textFill;
}

/**
 * Focuses, selects and copies the clicked input's contents to the clipboard, with an optional tooltip update.
 */
function SelectCopyInputText(mouseEvent, tooltipId = "", tooltipFill = "") {

  const element = document.getElementById(mouseEvent.target.id);
  if (!element) return;

  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }

  element.focus();
  element.select();
  element.setSelectionRange(0, 99999);

  document.execCommand("copy");

  if (tooltipFill.length && tooltipId.length) FillInnerHTML(tooltipId, tooltipFill);
}

function FileNameFormat(file, nameLength, beginLength, endLength) {

  var fileName = file.name;

  if (fileName.length > nameLength) {
    let begin = fileName.slice(0, beginLength);
    let end = fileName.slice(-endLength);
    fileName = `${begin}..${end}`;
  }

  return fileName;
}

function FileDateFormat(file) {

  var fileDate = new Date(file.lastModified);

  var year = fileDate.getFullYear();
  var month = fileDate.getMonth() + 1;
  var day = fileDate.getDate();
  var hour = fileDate.getHours();
  var minutes = fileDate.getMinutes();

  if (month < 10) month = "0" + month;
  if (day < 10) day = "0" + day;
  if (hour < 10) hour = "0" + hour;
  if (minutes < 10) minutes = "0" + minutes;

  return `${year}.${month}.${day} ${hour}:${minutes}`;
}

/**
 * Reflects each filter checkbox's checked state onto ALL of its labels (sidebar + mobile
 * chips) via an .is-active class. Needed because the mobile chips share the checkbox by
 * `for=` but are not peer-siblings, so CSS peer-checked can't style them.
 */
function SyncFilterChips() {
  ["checkbox-spoilers", "checkbox-incomplete"].forEach((id) => {
    let cb = document.getElementById(id);
    if (!cb) return;
    document.querySelectorAll(`label[for="${id}"]`).forEach((lbl) => {
      lbl.classList.toggle("is-active", cb.checked);
    });
  });
}

/* ========================== Event Listeners ========================== */

/* --------------- Toggle visibility of scroll arrow ------------------ */

document.addEventListener("scroll", () => {
  TogglePageScrollElement(ROOT, SCROLL_BUTTON, 0.1);
});

/* ---------------- Scroll to top when clicked ------------------- */

if (SCROLL_BUTTON) {
  SCROLL_BUTTON.addEventListener("click", () => {
    ScrollToElement(ROOT);
  });
}

/* ------------- Auto select & copy the save-file location on click ------------- */

(function () {
  let saveLocation = document.getElementById("save-location-input");
  if (!saveLocation) return;

  saveLocation.addEventListener("click", (e) => {
    let tooltip = document.getElementById("save-location-input-tooltip");
    SelectCopyInputText(e, "save-location-input-tooltip", "Copied save files location to clipboard");
    if (tooltip) tooltip.style.marginLeft = `-${tooltip.offsetWidth / 2}px`;
  }, false);

  saveLocation.addEventListener("mouseout", () => {
    let tooltip = document.getElementById("save-location-input-tooltip");
    if (tooltip && tooltip.innerHTML !== "Click once to copy to clipboard") {
      FillInnerHTML("save-location-input-tooltip", "Click once to copy to clipboard");
      tooltip.style.marginLeft = `-${tooltip.offsetWidth / 2}px`;
    }
  }, false);
})();

/* ------------ Toggle Save Mode Switch: Text Mode or File Mode -------------- */

(function () {
  let toggleMode = document.getElementById("toggle-mode");
  if (toggleMode) toggleMode.addEventListener("click", ToggleSaveModeSwitch, false);
})();

/* ------------- Checkbox functions ---------------------- */

(function () {
  let hints = document.getElementById("checkbox-hints");
  let spoilers = document.getElementById("checkbox-spoilers");
  let incomplete = document.getElementById("checkbox-incomplete");
  if (hints) hints.addEventListener("click", CheckboxHintsToggle, false);
  if (spoilers) spoilers.addEventListener("click", CheckboxSpoilersToggle, false);
  if (incomplete) incomplete.addEventListener("click", CheckboxIncompleteToggle, false);
  if (spoilers) spoilers.addEventListener("click", SyncFilterChips, false);
  if (incomplete) incomplete.addEventListener("click", SyncFilterChips, false);
})();

/* ------------ Drag & drop file to the window -------------- */

window.addEventListener('dragover', (event) => {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('drop', (event) => {

  event.stopPropagation();
  event.preventDefault();

  const dt = event.dataTransfer;

  /* Launch save file analyzing */
  LoadSaveFile(dt, performance.now());

  let fileInput = document.getElementById("save-area-file");
  if (!fileInput || !dt.files || !dt.files[0]) return;

  var label = fileInput.nextElementSibling;
  if (!label) return;
  var labelInitialText = label.innerHTML;

  var fileName = FileNameFormat(dt.files[0], 16, 10, 4);
  var fileDate = FileDateFormat(dt.files[0]);

  if (fileName) {
    label.innerHTML = `${SYMBOL_FILE}<span class="align-middle">${fileName}</span><div class="code-little">${fileDate}</div>`;
  } else {
    label.innerHTML = labelInitialText;
  }
});

/* ---------- Show the file name on the Load button when a file is chosen ----------- */

(function () {
  let fileInput = document.getElementById("save-area-file");
  if (!fileInput) return;

  fileInput.addEventListener("change", (event) => {
    var label = fileInput.nextElementSibling;
    if (!label || !event.target.files || !event.target.files[0]) return;
    var labelInitialText = label.innerHTML;

    var fileName = FileNameFormat(event.target.files[0], 16, 10, 4);
    var fileDate = FileDateFormat(event.target.files[0]);

    if (fileName) {
      label.innerHTML = `${SYMBOL_FILE}<span class="align-middle">${fileName}</span><div class="code-little">${fileDate}</div>`;
    } else {
      label.innerHTML = labelInitialText;
    }
  });
})();

/* ------------- Persist the collapsible sidebar "View" section state ------------- */

(function () {
  let details = document.getElementById("view-filters");
  if (!details) return;
  if (StorageAvailable("localStorage")) {
    let saved = localStorage.getItem("hkViewOpen");
    if (saved === "closed") details.open = false;
    else if (saved === "open") details.open = true;
  }
  details.addEventListener("toggle", () => {
    if (StorageAvailable("localStorage")) {
      localStorage.setItem("hkViewOpen", details.open ? "open" : "closed");
    }
  });
})();

/* -------- Clean the text area and file input from leftover save file (Firefox especially) -------- */

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    let sa = document.getElementById("save-area");
    let saf = document.getElementById("save-area-file");
    if (sa) sa.value = "";
    if (saf) saf.value = "";
  })();
  SyncFilterChips();
});

/* ------------------------- Exports ------------------------------- */

export {
  GenerateInnerHTML,
  AppendHTML,
  CheckboxHintsToggle,
  CheckboxSpoilersToggle,
  CheckboxIncompleteToggle,
  StorageAvailable,
  Benchmark,
  benchmarkTimes
};
