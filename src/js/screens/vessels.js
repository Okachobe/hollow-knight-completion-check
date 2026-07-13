/**
 * screens/vessels.js — Knight's Ledger "Vessels" screen.
 *
 * Backing section: db.sections.vesselFragments (9 Vessel Fragments; 3 per full
 * Soul Vessel). Mirrors the Masks screen but uses a grid-cols-3 fragment grid,
 * an amber accent dot, and a "= N full Soul Vessels" caption (N = floor(done/3)).
 *
 * The caller wraps this INNER string in
 *   <section class="ledger-screen" data-screen="vessels"><div class="mb-section-gap">…</div></section>
 * so we emit no shell/nav/section wrapper.
 */

import * as C from "../ledger-components.js";
import { countRuleA, isEntryComplete, shortText } from "../ledger-util.js";

const FRAGMENTS_PER_VESSEL = 3;

/**
 * One fragment cell. Carries the full spoiler/filter class contract so the
 * global Spoilers / Incomplete-Only toggles keep working on abstract cells.
 */
function fragmentCell(entry) {
  const complete = isEntryComplete(entry);
  const name = entry && entry.name ? entry.name : "Vessel Fragment";
  const label = extractLabel(name);
  const spoiler = entry && entry.spoiler ? entry.spoiler : "";
  const wiki = entry && entry.wiki ? entry.wiki : "";

  const cellClass = complete
    ? "single-entry completed-item aspect-[4/3] bg-surface-glow border border-tertiary-container rounded flex flex-col items-center justify-center gap-1 p-unit text-center relative shadow-[0_0_10px_rgba(254,187,0,0.25)] transition-colors"
    : "single-entry incomplete-item aspect-[4/3] bg-surface-container border border-border-dim rounded flex flex-col items-center justify-center gap-1 p-unit text-center relative transition-colors";

  const dot = complete
    ? `<span class="w-3 h-1 bg-secondary-container rounded-full blur-[1px]"></span>`
    : `<span class="w-3 h-1 bg-surface-container-highest rounded-full"></span>`;

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

/** "Vessel Fragment #7" -> "#7"; falls back to the whole name. */
function extractLabel(name) {
  const m = String(name).match(/#\s*\d+/);
  return m ? m[0].replace(/\s+/, "") : name;
}

export function render(db) {
  const section = db && db.sections ? db.sections.vesselFragments : null;
  if (!section || !section.entries) {
    return C.emptyState("Vessel Fragment data unavailable");
  }

  const { done, total } = countRuleA(section);
  const pct = total ? (done / total) * 100 : 0;
  const fullVessels = Math.floor(done / FRAGMENTS_PER_VESSEL);

  const header = C.sectionHeader({
    title: section.h2 || "Vessel Fragments",
    subtitle: shortText(section.description),
    done,
    total,
  });

  const cells = Object.keys(section.entries)
    .map((k) => section.entries[k])
    .filter((e) => e && e.disabled !== true)
    .map(fragmentCell)
    .join("");

  const grid = `<div class="grid grid-cols-3 gap-unit mb-md">${cells}</div>`;

  const bar =
    `<div class="mt-md">` +
      C.progressBar(pct, "amber") +
      `<div class="mt-2 flex justify-between items-center">` +
        `<span class="font-caption text-caption text-lichen-blue">${done} of ${total} fragments</span>` +
        `<span class="font-code-path text-code-path text-secondary-container">= ${fullVessels} full Soul Vessels</span>` +
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
