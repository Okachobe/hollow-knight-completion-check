/**
 * screens/nailarts.js — "Nail Arts & Upgrades" COMPOSITE bespoke renderer.
 *
 * Backs TWO sections so the on-screen counts sum to the sidebar badge:
 *   - db.sections.nailUpgrades (5): Old -> Sharpened -> Channeled -> Coiled ->
 *     Pure Nail, rendered as a progressive tier ladder (owned tiers filled,
 *     MAX highlight on Pure Nail).
 *   - db.sections.nailArts (3): Great Slash / Dash Slash / Cyclone Slash,
 *     rendered as a bento card grid (Cyclone Slash the wide feature card).
 * Each section gets its own C.sectionHeader({... done, total}) via countRuleA.
 * Every tier row / art card carries the .single-entry spoiler/blur contract.
 */

import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

/* -------------------------------------------------------------------------- */
/* Nail Refinement — upgrade ladder                                           */
/* -------------------------------------------------------------------------- */

/**
 * One nail-upgrade tier row. Visual intensity climbs base -> owned -> MAX.
 * @param {object} entry   db entry (may be undefined)
 * @param {string} key     entry key (fallback name)
 * @param {number} index   0-based tier position
 * @param {number} count   total tiers (for the progress-fill width)
 * @param {boolean} isLast Pure Nail (MAX) tier
 * @returns {string}
 */
function upgradeRow(entry, key, index, count, isLast) {
  const complete = isEntryComplete(entry);
  const isMax = complete && isLast;
  const name = entry && entry.name != null ? String(entry.name) : key;
  const wiki = entry && entry.wiki ? entry.wiki : "";
  const spoiler = entry && entry.spoiler != null ? String(entry.spoiler) : "";

  const width = count > 0 ? Math.round(((index + 1) / count) * 100) : 0;

  const stateToken = complete ? "single-entry completed-item" : "single-entry incomplete-item";
  const rowShell = isMax
    ? "flex items-center p-sm rounded-lg bg-surface-container-high border border-secondary-container shadow-glow-active group transition-colors"
    : "flex items-center p-sm rounded-lg hover:bg-surface-container-high group transition-colors";

  let tile;
  if (isMax) {
    tile =
      `<div class="w-12 h-12 rounded-lg bg-secondary-container/10 border border-secondary-container flex items-center justify-center mr-md relative overflow-hidden shrink-0">` +
        C.sym("swords", 1, "text-secondary-container relative z-10") +
        `<div class="absolute inset-0 bg-gradient-to-tr from-secondary-container/20 to-transparent"></div>` +
      `</div>`;
  } else if (complete) {
    tile =
      `<div class="w-12 h-12 rounded-lg bg-surface-glow border border-secondary-container/30 flex items-center justify-center mr-md shadow-glow shrink-0">` +
        C.sym("swords", 1, "text-primary") +
      `</div>`;
  } else {
    tile =
      `<div class="w-12 h-12 rounded-lg bg-surface border border-border-dim flex items-center justify-center mr-md shrink-0">` +
        C.sym("swords", 0, "text-outline") +
      `</div>`;
  }

  const linkClass = complete ? "wiki" : "wiki spoiler-red blurred";
  const nameHtml = wiki
    ? `<a class="${linkClass}" href="${C.WIKI}${wiki}" target="_blank" rel="noopener">${name}</a>`
    : `<b>${name}</b>`;
  const titleClass = isMax
    ? "font-body-bold text-body-bold text-secondary-container"
    : complete
    ? "font-body-bold text-body-bold text-primary"
    : "font-body-bold text-body-bold text-on-surface-variant";

  let tierLabel;
  if (!complete) tierLabel = "[LOCKED]";
  else if (isLast) tierLabel = "[MAX]";
  else if (index === 0) tierLabel = "[BASE]";
  else tierLabel = "[OWNED]";
  const tierLabelClass = isMax
    ? "font-code-path text-code-path text-secondary-container badge-glow"
    : complete
    ? "font-code-path text-code-path text-lichen-blue"
    : "font-code-path text-code-path text-outline";

  const fillClass = isMax
    ? "h-full bg-gradient-to-r from-secondary-container to-secondary progress-bar-glow"
    : complete
    ? "h-full bg-primary shadow-glow"
    : "h-full bg-outline";

  const spoilerSpan = complete ? "spoiler-span-green" : "spoiler-span blurred";
  const spoilerHtml = spoiler
    ? `<p class="font-caption text-caption text-lichen-blue mt-xs"><span class="${spoilerSpan}"><span class="spoiler-text">${spoiler}</span></span></p>`
    : "";

  return (
    `<div class="${stateToken} ${rowShell}">` +
      tile +
      `<div class="flex-1 min-w-0">` +
        `<div class="flex justify-between items-baseline mb-xs gap-md">` +
          `<h4 class="${titleClass}">${nameHtml}</h4>` +
          `<span class="${tierLabelClass} shrink-0">${tierLabel}</span>` +
        `</div>` +
        `<div class="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">` +
          `<div class="${fillClass}" style="width:${width}%"></div>` +
        `</div>` +
        spoilerHtml +
      `</div>` +
    `</div>`
  );
}

/**
 * The Nail Refinement panel: section header + a glass panel of tier rows.
 * @param {object} section db.sections.nailUpgrades
 * @returns {string}
 */
function renderUpgrades(section) {
  const entries = section.entries || {};
  const keys = Object.keys(entries).filter((k) => entries[k]);
  const { done, total } = countRuleA(section);

  let html = C.sectionHeader({
    title: section.h2 || "Nail Upgrades",
    subtitle: shortText(section.description),
    done,
    total,
  });

  html +=
    `<div class="bg-surface-container-low/85 backdrop-blur-xl border border-border-dim rounded-lg p-lg shadow-glow relative overflow-hidden mb-lg">` +
      `<div class="space-y-md relative z-10">`;
  keys.forEach((key, i) => {
    html += upgradeRow(entries[key], key, i, keys.length, i === keys.length - 1);
  });
  html += `</div></div>`;
  return html;
}

/* -------------------------------------------------------------------------- */
/* The Nailmasters' Arts — bento cards                                        */
/* -------------------------------------------------------------------------- */

/** Icon + wide flag per db.sections.nailArts entry key. */
const ART_META = {
  hasDashSlash: { icon: "water_drop" },
  hasUpwardSlash: { icon: "fast_forward" },
  hasCyclone: { icon: "palette", wide: true },
};

/**
 * One nail-art bento card. Wide (feature) cards use the amber accent; standard
 * cards the teal accent. Dim + locked when not yet learned.
 * @param {object} entry
 * @param {string} key
 * @returns {string}
 */
function artCard(entry, key) {
  const complete = isEntryComplete(entry);
  const meta = ART_META[key] || { icon: "cyclone" };
  const wide = meta.wide === true;
  const spanClass = wide ? "md:col-span-2" : "";

  const name = entry && entry.name != null ? String(entry.name) : key;
  const wiki = entry && entry.wiki ? entry.wiki : "";
  const spoiler = entry && entry.spoiler != null ? String(entry.spoiler) : "";

  const cardBase = complete
    ? wide
      ? "single-entry completed-item bg-surface-container-low/85 backdrop-blur-xl border border-border-dim border-t-2 border-t-secondary-container/40 p-md rounded-lg relative overflow-hidden group flex flex-col hover:shadow-glow-active transition-all duration-300"
      : "single-entry completed-item bg-surface-container-low/85 backdrop-blur-xl border border-border-dim border-t-2 border-t-tertiary-container/40 p-md rounded-lg relative overflow-hidden group flex flex-col hover:shadow-glow-active transition-all duration-300"
    : "single-entry incomplete-item bg-surface-container/40 backdrop-blur-xl border border-border-dim p-md rounded-lg relative overflow-hidden group flex flex-col opacity-80";
  const cardClass = `${cardBase} ${spanClass}`;

  // Amber watermark on the wide feature card when learned.
  const watermark = complete && wide
    ? `<span class="material-symbols-outlined absolute -right-4 -top-4 text-8xl text-secondary-container/5 rotate-45 pointer-events-none" style="font-variation-settings:'FILL' 1;">cyclone</span>`
    : "";

  // Icon circle.
  let iconCircle;
  if (!complete) {
    iconCircle =
      `<div class="w-10 h-10 rounded-full bg-surface-dim border border-border-dim flex items-center justify-center shrink-0">` +
        C.sym(meta.icon, 0, "text-outline") +
      `</div>`;
  } else if (wide) {
    iconCircle =
      `<div class="w-10 h-10 rounded-full bg-surface-dim border border-secondary-container/40 flex items-center justify-center shrink-0">` +
        C.sym(meta.icon, 1, "text-secondary-container") +
      `</div>`;
  } else {
    iconCircle =
      `<div class="w-10 h-10 rounded-full bg-surface-dim border border-tertiary-container/40 flex items-center justify-center shrink-0">` +
        C.sym(meta.icon, 1, "text-tertiary-container") +
      `</div>`;
  }

  // Status badge (learned / locked).
  const badge = complete
    ? wide
      ? `<span class="font-code-path text-code-path text-secondary-container bg-surface-glow px-xs py-xs rounded border border-secondary-container/30 shrink-0">LEARNED</span>`
      : `<span class="font-code-path text-code-path text-tertiary-container bg-surface-glow px-xs py-xs rounded border border-tertiary-container/30 shrink-0">LEARNED</span>`
    : `<span class="font-code-path text-code-path text-lichen-blue bg-surface-glow px-xs py-xs rounded border border-border-dim shrink-0">LOCKED</span>`;

  // Title (wiki link + blur contract).
  const linkClass = complete ? "wiki" : "wiki spoiler-red blurred";
  const nameHtml = wiki
    ? `<a class="${linkClass}" href="${C.WIKI}${wiki}" target="_blank" rel="noopener">${name}</a>`
    : `<b>${name}</b>`;
  const titleClass = complete
    ? "font-headline-md text-headline-md text-on-surface mb-xs relative z-10"
    : "font-headline-md text-headline-md text-outline mb-xs relative z-10 italic";

  // Description (spoiler contract).
  const spoilerSpan = complete ? "spoiler-span-green" : "spoiler-span blurred";
  const descHtml = spoiler
    ? `<p class="font-caption text-caption text-lichen-blue flex-1 relative z-10"><span class="${spoilerSpan}"><span class="spoiler-text">${spoiler}</span></span></p>`
    : "";

  return (
    `<div class="${cardClass}">` +
      watermark +
      `<div class="flex justify-between items-start mb-md relative z-10">${iconCircle}${badge}</div>` +
      `<h4 class="${titleClass}">${nameHtml}</h4>` +
      descHtml +
    `</div>`
  );
}

/**
 * The Nailmasters' Arts bento grid: section header + card grid.
 * @param {object} section db.sections.nailArts
 * @returns {string}
 */
function renderArts(section) {
  const entries = section.entries || {};
  const { done, total } = countRuleA(section);

  let html = C.sectionHeader({
    title: section.h2 || "Nail Arts",
    subtitle: shortText(section.description),
    done,
    total,
  });

  html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-lg">`;
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    if (!entries[key]) continue;
    html += artCard(entries[key], key);
  }
  html += `</div>`;
  return html;
}

/* -------------------------------------------------------------------------- */
/* Composite entry point                                                      */
/* -------------------------------------------------------------------------- */

/**
 * @param {object} db
 * @returns {string}
 */
export function render(db) {
  const sections = db && db.sections ? db.sections : null;
  if (!sections) return C.emptyState("Load your save file to master the blade");

  const upgrades = sections.nailUpgrades;
  const arts = sections.nailArts;
  if (!upgrades && !arts) return C.emptyState("Load your save file to master the blade");

  let html = "";
  if (upgrades) html += renderUpgrades(upgrades);
  if (upgrades && arts) html += C.fleurDivider();
  if (arts) html += renderArts(arts);

  void countSections;
  void escapeHtml;
  return html;
}
