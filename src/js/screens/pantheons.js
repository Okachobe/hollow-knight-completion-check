/**
 * screens/pantheons.js — Godhome / The Pantheons (COMPOSITE screen).
 *
 * Backing db.sections (7): pantheonOfTheMaster, pantheonOfTheArtist,
 * pantheonOfTheSage, pantheonOfTheKnight, pantheonOfHallownest (8 entries each),
 * hallOfGods (176 = 44 bosses x 4 tiers) and godhomeStatistics (8).
 *
 * Layout:
 *   (a) The Pantheons — 5 relic-border cards, each with a 4-binding icon row
 *       (gavel/favorite/trip_origin/water_drop = Nail/Shell/Charms/Soul), a
 *       COMPLETED/UNLOCKED/LOCKED status badge and a per-pantheon Rule-A pill.
 *   (b) Hall of Gods — compact grid of boss cells; each boss shows 4 tier dots
 *       (Unl/Att/Asc/Rad) and a highest-tier badge.
 *   (c) Godhome Statistics — compact value/list rows.
 *
 * Every leaf entry carries the single-entry + completed-item/incomplete-item +
 * spoiler-span + wiki contract so the global Spoilers / Incomplete-Only toggles
 * keep working. All Tailwind classes are complete static string literals.
 */

import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

/* -------------------------------------------------------------------------- */
/* Static metadata                                                            */
/* -------------------------------------------------------------------------- */

const PANTHEON_ORDER = [
  "pantheonOfTheMaster",
  "pantheonOfTheArtist",
  "pantheonOfTheSage",
  "pantheonOfTheKnight",
  "pantheonOfHallownest",
];

/* Decorative watermark glyph + boss flavour caption per pantheon. */
const PANTHEON_META = {
  pantheonOfTheMaster: { glyph: "person", boss: "Oro & Mato" },
  pantheonOfTheArtist: { glyph: "brush", boss: "Paintmaster Sheo" },
  pantheonOfTheSage: { glyph: "swords", boss: "Great Nailsage Sly" },
  pantheonOfTheKnight: { glyph: "shield", boss: "Pure Vessel" },
  pantheonOfHallownest: { glyph: "ac_unit", boss: "Absolute Radiance" },
};

/* The 4 bindings, in db entry order. `icon` is the runtime value the analyzer
   stamps when the binding was completed (see HKCheckCompletion.CheckPantheon). */
const BINDINGS = [
  { key: "boundNail", glyph: "gavel", label: "Nail", icon: "bindingNail" },
  { key: "boundShell", glyph: "favorite", label: "Shell", icon: "bindingShell" },
  { key: "boundCharms", glyph: "trip_origin", label: "Charms", icon: "bindingCharms" },
  { key: "boundSoul", glyph: "water_drop", label: "Soul", icon: "bindingSoul" },
];

/* The 4 non-binding pantheon entries, in db entry order, with a header glyph. */
const EXTRAS = [
  { key: "unlocked", glyph: "lock_open" },
  { key: "completed", glyph: "verified" },
  { key: "allBindings", glyph: "workspace_premium" },
  { key: "noHits", glyph: "shield" },
];

/* Hall of Gods tier resolution (entry.check -> label/code + the runtime icon
   value that marks that tier "achieved"). */
const HOG_TIERS = [
  { check: "isUnlocked", label: "Unlocked", code: "UNL", doneIcon: "green" },
  { check: "completedTier1", label: "Attuned", code: "ATT", doneIcon: "attuned" },
  { check: "completedTier2", label: "Ascended", code: "ASC", doneIcon: "ascended" },
  { check: "completedTier3", label: "Radiant", code: "RAD", doneIcon: "radiant" },
];

/* -------------------------------------------------------------------------- */
/* Contract helpers (replicate listRow's spoiler/blur markup for grid cells)  */
/* -------------------------------------------------------------------------- */

function wikiName(entry, complete, extraCls) {
  const name = entry && entry.name != null ? escapeHtml(String(entry.name)) : "";
  if (entry && entry.wiki) {
    const cls = complete ? `wiki ${extraCls}` : `wiki spoiler-red blurred ${extraCls}`;
    return `<a class="${cls}" href="${C.WIKI}${entry.wiki}" target="_blank" rel="noopener">${name}</a>`;
  }
  return `<b class="${extraCls}">${name}</b>`;
}

function spoilerSpan(entry, complete, extraCls) {
  if (!entry || !entry.spoiler) return "";
  const cls = complete ? `spoiler-span-green ${extraCls}` : `spoiler-span blurred ${extraCls}`;
  // Spoiler text is raw HTML (descriptions legitimately contain <b>/<span>).
  return `<span class="${cls}"><span class="spoiler-text">${entry.spoiler}</span></span>`;
}

/* -------------------------------------------------------------------------- */
/* (a) Pantheon cards                                                         */
/* -------------------------------------------------------------------------- */

const BINDING_ACTIVE = "single-entry flex flex-col items-center gap-xs p-xs rounded-lg bg-surface-glow border border-secondary-container/30";
const BINDING_INACTIVE = "single-entry flex flex-col items-center gap-xs p-xs rounded-lg bg-surface-container/40 border border-border-dim";
const MINI_ENTRY = "single-entry flex items-center gap-sm px-sm py-xs rounded-lg bg-surface-container/60 border border-border-dim min-w-0";

function bindingIcon(entry, meta) {
  const active = !!(entry && entry.icon === meta.icon); // precise: ignores disabled/none
  const complete = isEntryComplete(entry); // filter class (disabled counts as complete)
  const filterCls = complete ? "completed-item" : "incomplete-item";
  const visualCls = active ? BINDING_ACTIVE : BINDING_INACTIVE;
  const glyph = active
    ? C.sym(meta.glyph, 1, "text-secondary-container badge-glow text-2xl")
    : C.sym(meta.glyph, 0, "text-outline-variant text-2xl");
  const title = entry && entry.name != null ? escapeHtml(String(entry.name)) : meta.label;
  return (
    `<div class="${filterCls} ${visualCls}" title="${title}">` +
      glyph +
      wikiName(entry, active, "font-label-sm text-label-sm") +
      `<span class="hidden">${spoilerSpan(entry, active, "")}</span>` +
    `</div>`
  );
}

function miniEntry(entry, glyph) {
  const complete = isEntryComplete(entry);
  const filterCls = complete ? "completed-item" : "incomplete-item";
  const glyphHtml = complete
    ? C.sym(glyph, 1, "text-secondary-container text-lg shrink-0")
    : C.sym(glyph, 0, "text-outline-variant text-lg shrink-0");
  return (
    `<div class="${filterCls} ${MINI_ENTRY}">` +
      glyphHtml +
      `<div class="flex-grow min-w-0 leading-tight">` +
        wikiName(entry, complete, "font-body-bold text-sm") +
        spoilerSpan(entry, complete, "font-caption text-caption text-lichen-blue") +
      `</div>` +
    `</div>`
  );
}

function pantheonCard(section, meta) {
  const entries = (section && section.entries) || {};
  const { done, total } = countRuleA(section);
  const cardComplete = total > 0 && done === total;

  const completedDone = isEntryComplete(entries.completed);
  const unlockedDone = entries.unlocked && entries.unlocked.icon === "green";
  let statusLabel;
  let statusKind;
  if (completedDone) {
    statusLabel = "COMPLETED";
    statusKind = "complete";
  } else if (unlockedDone) {
    statusLabel = "UNLOCKED";
    statusKind = "locked";
  } else {
    statusLabel = "LOCKED";
    statusKind = "locked";
  }

  const cardCls = cardComplete
    ? "relic-border card-glow shadow-glow rounded-xl p-md backdrop-blur-md flex flex-col relative overflow-hidden group"
    : "relic-border card-glow rounded-xl p-md backdrop-blur-md flex flex-col relative overflow-hidden group";

  const watermark =
    `<div class="absolute -right-6 -top-6 text-[120px] opacity-5 text-secondary-container group-hover:opacity-10 transition-opacity pointer-events-none z-0">` +
      C.sym(meta.glyph, 1, "") +
    `</div>`;

  const header =
    `<div class="mb-md z-10">` +
      `<h3 class="font-headline-md text-headline-md text-on-surface leading-tight break-words">${escapeHtml(section.h2 || "")}</h3>` +
      `<p class="font-caption text-caption text-lichen-blue mt-xs">${escapeHtml(meta.boss)} — ${escapeHtml(shortText(section.description, 60))}</p>` +
      `<div class="flex items-center flex-wrap gap-xs mt-sm">` +
        C.statusBadge(statusLabel, statusKind) +
        C.pill(done, total) +
      `</div>` +
    `</div>`;

  const bindingRow =
    `<div class="z-10 border-t border-border-dim pt-sm mb-md">` +
      `<p class="font-label-sm text-label-sm text-on-surface-variant mb-sm">Bindings</p>` +
      `<div class="grid grid-cols-4 gap-sm">` +
        BINDINGS.map((b) => bindingIcon(entries[b.key], b)).join("") +
      `</div>` +
    `</div>`;

  const extras =
    `<div class="z-10 grid grid-cols-1 sm:grid-cols-2 gap-sm">` +
      EXTRAS.map((e) => miniEntry(entries[e.key], e.glyph)).join("") +
    `</div>`;

  return `<div class="${cardCls}">${watermark}${header}${bindingRow}${extras}</div>`;
}

/* -------------------------------------------------------------------------- */
/* (b) Hall of Gods                                                           */
/* -------------------------------------------------------------------------- */

const DOT_DONE = "bg-surface-glow border border-secondary-container/40 text-secondary-container";
const DOT_SEEN = "bg-surface-container border border-border-dim text-lichen-blue";
const DOT_LOCKED = "bg-surface-container/40 border border-border-dim text-outline-variant";
const DOT_DISABLED = "bg-surface-container/20 border border-border-dim text-outline-variant opacity-40";

function tierDot(entry, tier) {
  const complete = isEntryComplete(entry);
  const filterCls = complete ? "completed-item" : "incomplete-item";
  let stateCls;
  if (!entry || entry.disabled === true) stateCls = DOT_DISABLED;
  else if (entry.icon === tier.doneIcon) stateCls = DOT_DONE;
  else if (entry.icon === "partial") stateCls = DOT_SEEN;
  else stateCls = DOT_LOCKED;
  const title = entry && entry.name != null ? escapeHtml(String(entry.name)) : tier.label;
  return (
    `<div class="single-entry ${filterCls} flex flex-col items-center justify-center py-xs rounded ${stateCls}" title="${title}">` +
      `<span class="font-code-path text-[10px] leading-none">${tier.code}</span>` +
      `<span class="hidden">${wikiName(entry, complete, "")}${spoilerSpan(entry, complete, "")}</span>` +
    `</div>`
  );
}

function bossCell(boss) {
  // Highest achieved tier -> header badge (precise icon match, ignores disabled).
  let badgeLabel = "LOCKED";
  let badgeKind = "locked";
  for (let i = HOG_TIERS.length - 1; i >= 0; i--) {
    const t = HOG_TIERS[i];
    const e = boss.tiers[t.check];
    if (e && e.icon === t.doneIcon) {
      badgeLabel = t.label.toUpperCase();
      badgeKind = "complete";
      break;
    }
  }
  const unlockedEntry = boss.tiers.isUnlocked;
  const seen = !!(unlockedEntry && unlockedEntry.icon === "green");
  const nameCls = seen ? "wiki font-body-bold text-sm truncate" : "wiki spoiler-red blurred font-body-bold text-sm truncate";
  const nameHtml = boss.wiki
    ? `<a class="${nameCls}" href="${C.WIKI}${boss.wiki}" target="_blank" rel="noopener">${escapeHtml(boss.name)}</a>`
    : `<b class="font-body-bold text-sm truncate">${escapeHtml(boss.name)}</b>`;

  const dots = HOG_TIERS.map((t) => tierDot(boss.tiers[t.check], t)).join("");

  return (
    `<div class="rounded-lg border border-border-dim bg-surface-container/60 backdrop-blur-md p-sm flex flex-col gap-sm">` +
      `<div class="flex items-center justify-between gap-sm">` +
        `<div class="min-w-0">${nameHtml}</div>` +
        `<div class="shrink-0">${C.statusBadge(badgeLabel, badgeKind)}</div>` +
      `</div>` +
      `<div class="grid grid-cols-4 gap-xs">${dots}</div>` +
    `</div>`
  );
}

function renderHallOfGods(section) {
  const entries = (section && section.entries) || {};
  // Group the 176 entries into 44 bosses by entry.id, preserving first-seen order.
  const order = [];
  const byId = {};
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const entry = entries[key];
    if (!entry) continue;
    const id = entry.id || key;
    if (!byId[id]) {
      byId[id] = {
        id,
        name: String(entry.name != null ? entry.name : id).split(":")[0].trim(),
        wiki: entry.wiki || "",
        tiers: {},
      };
      order.push(id);
    }
    const check = entry.check || "isUnlocked";
    byId[id].tiers[check] = entry;
    // Prefer the "Unlocked" entry for the boss display name (cleanest label).
    if (check === "isUnlocked" && entry.name != null) {
      byId[id].name = String(entry.name).split(":")[0].trim();
    }
  }

  const { done, total } = countRuleA(section);
  let html = C.sectionHeader({
    title: section.h2 || "Hall of Gods",
    subtitle: shortText(section.description),
    done,
    total,
  });
  if (!order.length) {
    return html + C.emptyState("No statues recorded yet");
  }
  html += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">`;
  html += order.map((id) => bossCell(byId[id])).join("");
  html += `</div>`;
  return html;
}

/* -------------------------------------------------------------------------- */
/* (c) Godhome Statistics                                                     */
/* -------------------------------------------------------------------------- */

function statRow(entry, key) {
  const complete = isEntryComplete(entry);
  return C.listRow({
    name: entry && entry.name != null ? String(entry.name) : key,
    spoiler: entry && entry.spoiler != null ? String(entry.spoiler) : "",
    wiki: (entry && entry.wiki) || "",
    complete,
    statusLabel: complete ? "DONE" : "PENDING",
    spoilerHtml: true,
  });
}

function renderGodhomeStats(section) {
  const entries = (section && section.entries) || {};
  const { done, total } = countRuleA(section);
  let html = C.sectionHeader({
    title: section.h2 || "Godhome Statistics",
    subtitle: shortText(section.description),
    done,
    total,
  });
  html += `<div class="space-y-sm">`;
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const entry = entries[key];
    if (!entry) continue;
    html += statRow(entry, key);
  }
  html += `</div>`;
  return html;
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export function render(db) {
  const sections = db && db.sections ? db.sections : {};

  // Intro hero header (mockup eyebrow + display title + subtitle).
  let html =
    `<header class="text-center mb-xl">` +
      `<p class="font-code-path text-code-path text-tertiary mb-sm tracking-widest uppercase opacity-80">Godhome Resonance</p>` +
      `<h2 class="font-display-lg text-display-lg text-secondary-container mb-sm relic-glow">The Pantheons</h2>` +
      `<p class="font-body-base text-body-base text-lichen-blue max-w-container-max mx-auto">Ascend through the memories of gods. Prove your mastery by embracing the bindings of the void.</p>` +
    `</header>`;

  /* (a) The Pantheons — 5 relic cards. Sub-total shown in the divider heading;
     each card carries its own Rule-A pill so the on-screen counts sum. */
  const pantheonSub = countSections(db, PANTHEON_ORDER);
  html += C.fleurDivider(`The Pantheons  [${pantheonSub.done}/${pantheonSub.total}]`);
  const cards = PANTHEON_ORDER.filter((k) => sections[k]).map((k) =>
    pantheonCard(sections[k], PANTHEON_META[k] || { glyph: "account_balance", boss: "" })
  );
  if (cards.length) {
    html += `<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-section-gap">${cards.join("")}</div>`;
  } else {
    html += `<div class="mb-section-gap">${C.emptyState("No Pantheon data")}</div>`;
  }

  /* (b) Hall of Gods. */
  if (sections.hallOfGods) {
    html += `<div class="mb-section-gap">${renderHallOfGods(sections.hallOfGods)}</div>`;
  }

  /* (c) Godhome Statistics. */
  if (sections.godhomeStatistics) {
    html += renderGodhomeStats(sections.godhomeStatistics);
  }

  return html;
}
