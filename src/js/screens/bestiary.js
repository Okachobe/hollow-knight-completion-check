/**
 * screens/bestiary.js — Hunter's Journal / Bestiary screen renderer.
 *
 * Backing sections:
 *   huntersJournal (146)          → responsive grid of compact "sketch" cards.
 *   huntersJournalOptional (24)   → its OWN sub-section (own header) below.
 *
 * Journal completion states (from the runtime `entry.icon`):
 *   green / none          → note fully completed  (complete style, rule A done)
 *   partialJournal /      → entry encountered but note not completed
 *     revealed / partial     (amber "encountered" style — NOT counted complete)
 *   red / (unset)         → entry not yet discovered (locked style)
 *
 * huntersJournal header uses the 3-part form "done / encountered of total":
 *   done        = countRuleA(huntersJournal).done   (fully-journaled notes)
 *   encountered = entries whose icon is green | partialJournal | revealed | partial
 *   total       = number of entries (146)
 *
 * Every card carries the .single-entry + completed-item/incomplete-item +
 * spoiler/.wiki blur contract (partial/revealed => incomplete-item).
 */
import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

void countSections;
void escapeHtml;

const ENCOUNTERED_ICONS = new Set(["green", "none", "partialJournal", "revealed", "partial"]);

const CARD_COMPLETE =
  "single-entry completed-item bg-surface-container/85 backdrop-blur-md border border-border-dim border-t-2 border-t-success-green/30 rounded-lg p-md flex flex-col gap-sm hover:bg-surface-container-high transition-colors group";
const CARD_ENCOUNTERED =
  "single-entry incomplete-item bg-surface-container/60 backdrop-blur-md border border-secondary-container/40 border-t-2 border-t-secondary-container/50 rounded-lg p-md flex flex-col gap-sm hover:bg-surface-container-high transition-colors group";
const CARD_UNSEEN =
  "single-entry incomplete-item bg-surface-container-lowest/50 backdrop-blur-md border border-border-dim rounded-lg p-md flex flex-col gap-sm opacity-60";

const TILE_COMPLETE =
  "w-full h-24 rounded bg-surface-container-lowest border border-success-green/30 flex items-center justify-center shadow-glow";
const TILE_ENCOUNTERED =
  "w-full h-24 rounded bg-surface-container-lowest border border-secondary-container/40 flex items-center justify-center";
const TILE_UNSEEN =
  "w-full h-24 rounded bg-surface-container-lowest/30 border border-dashed border-border-dim flex items-center justify-center";

/** Name link + spoiler span honoring the blur contract. */
function nameSpoiler(entry, complete) {
  const name = entry && entry.name != null ? String(entry.name) : "";
  let nameHtml;
  if (entry && entry.wiki) {
    const linkClass = complete ? "wiki" : "wiki spoiler-red blurred";
    nameHtml = `<a class="${linkClass}" href="${C.WIKI}${entry.wiki}" target="_blank" rel="noopener">${name}</a>`;
  } else {
    nameHtml = `<b>${name}</b>`;
  }
  let spoilerHtml = "";
  if (entry && entry.spoiler) {
    const spanClass = complete ? "spoiler-span-green" : "spoiler-span blurred";
    spoilerHtml = `<span class="${spanClass}"><span class="spoiler-text">${entry.spoiler}</span></span>`;
  }
  return { nameHtml, spoilerHtml };
}

/** Classify an entry into one of the three journal states. */
function stateOf(entry) {
  if (isEntryComplete(entry)) return "complete";
  const icon = entry ? entry.icon : "";
  if (icon === "partialJournal" || icon === "revealed" || icon === "partial") return "encountered";
  return "unseen";
}

/** One compact sketch card. */
function journalCard(entry, key) {
  const state = stateOf(entry);
  const complete = state === "complete";

  let cardClass, tileClass, glyph, glyphClass, statusHtml;
  if (state === "complete") {
    cardClass = CARD_COMPLETE;
    tileClass = TILE_COMPLETE;
    glyph = "pest_control";
    glyphClass = "text-success-green text-3xl";
    statusHtml = C.statusBadge("Journaled", "complete");
  } else if (state === "encountered") {
    cardClass = CARD_ENCOUNTERED;
    tileClass = TILE_ENCOUNTERED;
    glyph = "pest_control";
    glyphClass = "text-secondary-container text-3xl";
    statusHtml = C.statusBadge("Encountered", "complete");
  } else {
    cardClass = CARD_UNSEEN;
    tileClass = TILE_UNSEEN;
    glyph = "help";
    glyphClass = "text-outline text-3xl opacity-40";
    statusHtml = C.statusBadge("Unseen", "unseen");
  }

  const { nameHtml, spoilerHtml } = nameSpoiler(entry, complete);
  const displayName = state === "unseen"
    ? `<h3 class="font-code-path text-code-path text-outline tracking-widest truncate">${nameHtml}</h3>`
    : `<h3 class="font-body-bold text-body-bold text-on-surface group-hover:text-secondary-container transition-colors truncate">${nameHtml}</h3>`;
  const locationHtml = spoilerHtml
    ? `<p class="font-caption text-caption text-lichen-blue line-clamp-2">${spoilerHtml}</p>`
    : "";

  return (
    `<div class="${cardClass}">` +
      `<div class="${tileClass}">` + C.sym(glyph, complete ? 1 : 0, glyphClass) + `</div>` +
      `<div class="flex justify-start">` + statusHtml + `</div>` +
      `<div class="min-w-0">${displayName}${locationHtml}</div>` +
    `</div>`
  );
}

/** Custom header with the 3-part "done / encountered of total" pill. */
function tripartHeader(title, subtitle, done, encountered, total) {
  const subtitleHtml = subtitle
    ? `<p class="font-label-sm text-lichen-blue">${subtitle}</p>`
    : "";
  const pill =
    `<span class="font-code-path text-secondary-container bg-surface-glow px-2 py-1 rounded border border-border-dim">` +
    `[${done} / ${encountered} of ${total}]</span>`;
  return (
    `<div class="flex justify-between items-end mb-lg gap-md">` +
      `<div><h2 class="font-headline-md text-headline-md text-on-surface relic-glow">${title}</h2>${subtitleHtml}</div>` +
      `<div class="shrink-0">${pill}</div>` +
    `</div>`
  );
}

const GRID = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">`;

/** Render the base 146 Hunter's Journal section. */
function journalSection(section) {
  if (!section) return "";
  const entries = section.entries || {};
  const keys = Object.keys(entries);
  const { done } = countRuleA(section);
  let encountered = 0;
  for (const key of keys) {
    const entry = entries[key];
    if (entry && ENCOUNTERED_ICONS.has(entry.icon)) encountered++;
  }
  const total = keys.length || section.maxPercent || 146;

  let html = `<div class="mb-section-gap">`;
  html += tripartHeader(section.h2 || "Hunter's Journal", shortText(section.description), done, encountered, total);
  if (!keys.length) {
    html += C.emptyState("Load your save file to reveal the Hunter's Journal.");
    html += `</div>`;
    return html;
  }
  html += GRID;
  for (const key of keys) {
    const entry = entries[key];
    if (!entry) continue;
    html += journalCard(entry, key);
  }
  html += `</div></div>`;
  return html;
}

/** Render the optional (Bestiary) section — its own standard 2-part header. */
function optionalSection(section) {
  if (!section) return "";
  const entries = section.entries || {};
  const keys = Object.keys(entries);
  const { done, total } = countRuleA(section);

  let html = `<div class="mb-section-gap">`;
  html += C.sectionHeader({
    title: section.h2 || "Optional Journal Entries",
    subtitle: shortText(section.description),
    done,
    total,
  });
  if (!keys.length) {
    html += C.emptyState("No optional journal entries recorded.");
    html += `</div>`;
    return html;
  }
  html += GRID;
  for (const key of keys) {
    const entry = entries[key];
    if (!entry) continue;
    html += journalCard(entry, key);
  }
  html += `</div></div>`;
  return html;
}

/**
 * @param {object} db the HK singleton
 * @returns {string} inner content HTML (no <section>/shell wrapper)
 */
export function render(db) {
  const sections = db && db.sections ? db.sections : {};
  let html = "";
  html += journalSection(sections.huntersJournal);
  html += optionalSection(sections.huntersJournalOptional);
  if (!html) html = C.emptyState("Load your save file to open the Hunter's Journal.");
  return html;
}
