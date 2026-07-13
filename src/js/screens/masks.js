/**
 * screens/masks.js — Knight's Ledger "Masks" screen.
 *
 * Backing section: db.sections.maskShards (16 Mask Shards; 4 per full Mask).
 * Renders the abstract fragment-cell grid (grid-cols-4) from the
 * masks_soul_vessels standardized layout: collected cells glow with an accent
 * dot; empty cells are dim. Header counts via countRuleA; a progress bar and a
 * "= N full Masks" caption summarize the health payoff.
 *
 * The caller wraps this INNER string in
 *   <section class="ledger-screen" data-screen="masks"><div class="mb-section-gap">…</div></section>
 * so we emit no shell/nav/section wrapper.
 */

import * as C from "../ledger-components.js";
import { countRuleA, isEntryComplete, shortText } from "../ledger-util.js";

const SHARDS_PER_MASK = 4;

/**
 * One fragment cell. Carries the full spoiler/filter class contract so the
 * global Spoilers / Incomplete-Only toggles keep working on abstract cells.
 */
function shardCell(entry) {
  const complete = isEntryComplete(entry);
  const name = entry && entry.name ? entry.name : "Mask Shard";
  const label = extractLabel(name);
  const spoiler = entry && entry.spoiler ? entry.spoiler : "";
  const wiki = entry && entry.wiki ? entry.wiki : "";

  const cellClass = complete
    ? "single-entry completed-item aspect-square bg-surface-glow border border-tertiary-container rounded flex flex-col items-center justify-center gap-1 p-unit text-center relative shadow-[0_0_10px_rgba(0,83,71,0.5)] transition-colors"
    : "single-entry incomplete-item aspect-square bg-surface-container border border-border-dim rounded flex flex-col items-center justify-center gap-1 p-unit text-center relative transition-colors";

  const dot = complete
    ? `<span class="w-2 h-2 bg-tertiary-container rounded-full blur-[1px]"></span>`
    : `<span class="w-2 h-2 bg-surface-container-highest rounded-full"></span>`;

  const nameHtml = wiki
    ? `<a class="wiki${complete ? "" : " spoiler-red blurred"} font-code-path text-caption leading-none" href="${C.WIKI}${wiki}" target="_blank" rel="noopener">${label}</a>`
    : `<b class="font-code-path text-caption leading-none">${label}</b>`;

  const spoilerHtml = spoiler
    ? ` <span class="${complete ? "spoiler-span-green" : "spoiler-span blurred"} block font-caption text-[11px] leading-tight text-lichen-blue"><span class="spoiler-text">${spoiler}</span></span>`
    : "";

  return (
    `<div class="${cellClass}">` +
      dot +
      nameHtml +
      spoilerHtml +
    `</div>`
  );
}

/** "Mask Shard #7" -> "#7"; falls back to the whole name. */
function extractLabel(name) {
  const m = String(name).match(/#\s*\d+/);
  return m ? m[0].replace(/\s+/, "") : name;
}

export function render(db) {
  const section = db && db.sections ? db.sections.maskShards : null;
  if (!section || !section.entries) {
    return C.emptyState("Mask Shard data unavailable");
  }

  const { done, total } = countRuleA(section);
  const pct = total ? (done / total) * 100 : 0;
  const fullMasks = Math.floor(done / SHARDS_PER_MASK);

  const header = C.sectionHeader({
    title: section.h2 || "Mask Shards",
    subtitle: shortText(section.description),
    done,
    total,
  });

  const cells = Object.keys(section.entries)
    .map((k) => section.entries[k])
    .filter((e) => e && e.disabled !== true)
    .map(shardCell)
    .join("");

  const grid = `<div class="grid grid-cols-4 gap-unit mb-md">${cells}</div>`;

  const bar =
    `<div class="mt-md">` +
      C.progressBar(pct, "teal") +
      `<div class="mt-2 flex justify-between items-center">` +
        `<span class="font-caption text-caption text-lichen-blue">${done} of ${total} shards</span>` +
        `<span class="font-code-path text-code-path text-tertiary-container">= ${fullMasks} full Masks</span>` +
      `</div>` +
    `</div>`;

  return (
    `<div class="bg-surface/85 backdrop-blur-sm border border-border-dim p-md rounded relative overflow-hidden">` +
      header +
      grid +
      bar +
    `</div>`
  );
}
