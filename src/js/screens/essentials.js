/**
 * essentials.js — Knight's Ledger COMPOSITE screen.
 *
 * Backs 8 sections (in sidebar-badge order) so the on-screen sub-header counts
 * sum to the sidebar badge:
 *   essentialsCollectibles, essentialsStagStations, essentialsWorldInteractions,
 *   essentialsBosses, achievementsCollectibles, achievementsMaps,
 *   achievementsWorldInteractions, achievementsBosses.
 *
 * Each backing section renders its own C.sectionHeader (title = section.h2,
 * subtitle = shortText(description), count = countRuleA) followed by a
 * two-column grid of C.listRow entries. Counter entries (amount + max/amountTotal)
 * show "amount / total" as row meta and are complete when amount >= total.
 */

import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

/* Sub-section render order + the glyph used for its rows. */
const SECTIONS = [
  { key: "essentialsCollectibles", icon: "diamond" },
  { key: "essentialsStagStations", icon: "train" },
  { key: "essentialsWorldInteractions", icon: "touch_app" },
  { key: "essentialsBosses", icon: "swords" },
  { key: "achievementsCollectibles", icon: "military_tech" },
  { key: "achievementsMaps", icon: "map" },
  { key: "achievementsWorldInteractions", icon: "handshake" },
  { key: "achievementsBosses", icon: "skull" },
];

/* A counter entry carries a numeric target via max or amountTotal. */
function counterTotal(entry) {
  if (entry == null) return null;
  if (Number.isFinite(entry.amountTotal)) return entry.amountTotal;
  if (Number.isFinite(entry.max)) return entry.max;
  return null;
}

/* Complete flag for a row: counters compare amount>=total, else rule A. */
function rowComplete(entry, total) {
  if (total != null) {
    const amount = Number.isFinite(entry.amount) ? entry.amount : 0;
    return amount >= total;
  }
  return isEntryComplete(entry);
}

function renderEntry(entry, sectionIcon) {
  if (!entry) return "";
  const total = counterTotal(entry);
  const complete = rowComplete(entry, total);
  let meta = "";
  if (total != null) {
    const amount = Number.isFinite(entry.amount) ? entry.amount : 0;
    meta = `${amount} / ${total}`;
  }
  const statusLabel = total != null ? "" : complete ? "Done" : "Missing";
  return C.listRow({
    icon: sectionIcon,
    name: escapeHtml(entry.name || "Unknown"),
    meta,
    statusLabel,
    complete,
    spoiler: entry.spoiler || "",
    wiki: entry.wiki || "",
    spoilerHtml: true,
  });
}

function renderSection(section, sectionIcon) {
  if (!section || !section.entries) return "";
  const { done, total } = countRuleA(section);
  const header = C.sectionHeader({
    title: section.h2 || "Essentials",
    subtitle: shortText(section.description, 110),
    done,
    total,
  });

  const rows = [];
  const entries = section.entries;
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const entry = entries[key];
    if (!entry || entry.disabled === true) continue;
    rows.push(renderEntry(entry, sectionIcon));
  }

  const body = rows.length
    ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-md">${rows.join("")}</div>`
    : C.emptyState("No entries in this section.");

  return `<div class="mb-section-gap">${header}${body}</div>`;
}

export function render(db) {
  if (!db || !db.sections) {
    return C.emptyState("Load your save file to begin");
  }

  const present = SECTIONS.filter((s) => db.sections[s.key]);
  if (present.length === 0) {
    return C.emptyState("Essentials data unavailable.");
  }

  const overall = countSections(db, present.map((s) => s.key));
  const intro =
    `<div class="mb-section-gap">` +
    C.sectionHeader({
      title: "Essentials & Achievements",
      subtitle: "Collectibles, stations, interactions and bosses required for full 112% and every achievement.",
      done: overall.done,
      total: overall.total,
    }) +
    C.progressBar(overall.total ? (overall.done / overall.total) * 100 : 0, "amber") +
    `</div>`;

  const blocks = present.map((s) => renderSection(db.sections[s.key], s.icon)).join(C.fleurDivider());

  return intro + blocks;
}
