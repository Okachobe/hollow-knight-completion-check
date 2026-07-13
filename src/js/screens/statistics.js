/**
 * statistics.js — Knight's Ledger "Game Statistics" screen.
 *
 * db.sections.statistics — ~18 pure numeric stats with NO completion state.
 * These never contribute to completion, never blur, and never carry
 * completed-item/incomplete-item classes. Rendered as a clean grid of stat
 * tiles (name + value). itemsDiscovered is a three-part value.
 */

import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

/* Format a numeric stat value; null/undefined -> em dash placeholder. */
function fmt(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-US");
}

/* Non-blurred wiki link (or plain bold) for the tile name. */
function nameHtml(entry) {
  const label = escapeHtml(entry.name || "Statistic");
  if (entry.wiki) {
    return `<a class="wiki" href="${C.WIKI}${entry.wiki}" target="_blank" rel="noopener">${label}</a>`;
  }
  return `<b>${label}</b>`;
}

/* The big value block for a tile. itemsDiscovered renders three sub-values. */
function valueHtml(key, entry) {
  if (key === "itemsDiscovered") {
    const parts = [
      { v: entry.notActivated, l: "Not A." },
      { v: entry.activated, l: "Activated" },
      { v: entry.discoveredTotal, l: "Discovered" },
    ];
    return (
      `<div class="flex items-end gap-md">` +
      parts
        .map(
          (p) =>
            `<div class="text-center">` +
            `<span class="font-display-lg text-headline-md text-gradient-pale-ore block leading-none">${fmt(p.v)}</span>` +
            `<span class="font-caption text-caption text-outline">${p.l}</span>` +
            `</div>`
        )
        .join(`<span class="text-outline self-center">/</span>`) +
      `</div>`
    );
  }

  const total = Number.isFinite(entry.amountTotal)
    ? entry.amountTotal
    : Number.isFinite(entry.max)
    ? entry.max
    : null;
  const value = fmt(entry.amount);
  const suffix =
    total != null
      ? ` <span class="font-body-base text-lg text-outline">/ ${fmt(total)}</span>`
      : "";
  return `<span class="font-display-lg text-display-lg text-gradient-pale-ore leading-none">${value}</span>${suffix}`;
}

function tile(key, entry) {
  if (!entry) return "";
  const subtitle = entry.spoiler
    ? `<p class="font-caption text-caption text-lichen-blue mt-xs">${entry.spoiler}</p>`
    : "";
  return (
    `<div class="single-entry bg-surface-container border border-border-dim border-t-2 border-t-secondary-container/30 rounded-lg p-md flex flex-col justify-between gap-md min-h-[7rem]">` +
    `<div class="flex items-center gap-sm">` +
    C.sym("query_stats", 0, "text-primary text-xl shrink-0") +
    `<h4 class="font-body-bold text-on-surface">${nameHtml(entry)}</h4>` +
    `</div>` +
    `<div>${valueHtml(key, entry)}${subtitle}</div>` +
    `</div>`
  );
}

export function render(db) {
  if (!db || !db.sections) {
    return C.emptyState("Load your save file to begin");
  }
  const section = db.sections.statistics;
  if (!section || !section.entries) {
    return C.emptyState("Statistics data unavailable.");
  }

  const header = C.sectionHeader({
    title: section.h2 || "Game Statistics",
    subtitle: shortText(section.description, 140),
  });

  const tiles = [];
  const entries = section.entries;
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const entry = entries[key];
    if (!entry) continue;
    tiles.push(tile(key, entry));
  }

  const body = tiles.length
    ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">${tiles.join("")}</div>`
    : C.emptyState("No statistics recorded.");

  return `<div class="mb-section-gap">${header}${body}</div>`;
}
