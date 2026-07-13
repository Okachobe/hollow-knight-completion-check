/**
 * screens/spells.js — "Ancient Spells" bespoke renderer.
 *
 * db.sections.spells has 6 entries: 3 base spells and their 3 upgrades.
 * Rendered as 3 dual-tier split cards (base tier <-> upgrade/shadow tier):
 *   Vengeful Spirit -> Shade Soul, Desolate Dive -> Descending Dark,
 *   Howling Wraiths -> Abyss Shriek.
 * Each tier is its own .single-entry element carrying the spoiler/blur contract.
 * Header count via countRuleA(spells) so the on-screen pill matches the sidebar.
 */

import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

/* The three spell lines, in display order, with a Material Symbol per tier. */
const SPELL_PAIRS = [
  { base: "vengefulSpirit", up: "shadeSoul", baseIcon: "auto_fix_high", upIcon: "dark_mode" },
  { base: "desolateDive", up: "descendingDark", baseIcon: "keyboard_double_arrow_down", upIcon: "keyboard_double_arrow_down" },
  { base: "howlingWraiths", up: "abyssShriek", baseIcon: "air", upIcon: "waves" },
];

/**
 * One tier (half) of a dual-tier spell card.
 * @param {object} entry  db entry (may be undefined)
 * @param {string} key    entry key (fallback name)
 * @param {string} icon   Material Symbol ligature
 * @param {"base"|"upgrade"} side
 * @returns {string}
 */
function spellTier(entry, key, icon, side) {
  const complete = isEntryComplete(entry);
  const name = entry && entry.name != null ? String(entry.name) : key;
  const wiki = entry && entry.wiki ? entry.wiki : "";
  const spoiler = entry && entry.spoiler != null ? String(entry.spoiler) : "";

  const stateToken = complete ? "single-entry completed-item" : "single-entry incomplete-item";
  const sideClass =
    side === "base"
      ? "p-lg flex-1 flex flex-col items-center justify-center text-center bg-gradient-to-br from-surface-container to-surface border-b sm:border-b-0 sm:border-r border-border-dim"
      : "p-lg flex-1 flex flex-col items-center justify-center text-center bg-surface-container-lowest relative";

  const orb = complete
    ? `<div class="w-16 h-16 rounded-full border-2 border-secondary-container bg-surface-glow flex items-center justify-center mb-md shadow-glow group-hover:scale-110 transition-transform duration-300">` +
        C.sym(icon, 1, "text-secondary-container text-3xl") +
      `</div>`
    : `<div class="w-16 h-16 rounded-full border border-border-dim bg-surface-container-lowest flex items-center justify-center mb-md opacity-70">` +
        C.sym(icon, 0, "text-outline-variant text-3xl") +
      `</div>`;

  const linkClass = complete ? "wiki" : "wiki spoiler-red blurred";
  const nameHtml = wiki
    ? `<a class="${linkClass}" href="${C.WIKI}${wiki}" target="_blank" rel="noopener">${name}</a>`
    : `<b>${name}</b>`;
  const titleClass = complete
    ? "font-headline-md text-headline-md text-on-surface mb-sm"
    : "font-headline-md text-headline-md text-outline-variant mb-sm";

  const spanClass = complete ? "spoiler-span-green" : "spoiler-span blurred";
  const descClass = complete
    ? "font-body-base text-caption text-lichen-blue mb-md"
    : "font-body-base text-caption text-outline/60 mb-md";
  const descHtml = spoiler
    ? `<p class="${descClass}"><span class="${spanClass}"><span class="spoiler-text">${spoiler}</span></span></p>`
    : "";

  const status = complete
    ? `<div class="mt-auto flex items-center gap-2">` +
        `<div class="w-3 h-3 rounded-full bg-success-green shadow-[0_0_8px_#16c60c]"></div>` +
        `<span class="font-label-sm text-label-sm text-success-green uppercase tracking-wider">Acquired</span>` +
      `</div>`
    : `<div class="mt-auto flex items-center gap-2">` +
        `<div class="w-3 h-3 rounded-sm border border-outline-variant bg-surface-container-lowest"></div>` +
        `<span class="font-label-sm text-label-sm text-outline-variant uppercase tracking-wider">Undiscovered</span>` +
      `</div>`;

  return (
    `<div class="${stateToken} ${sideClass}">` +
      orb +
      `<h3 class="${titleClass}">${nameHtml}</h3>` +
      descHtml +
      status +
    `</div>`
  );
}

/**
 * @param {object} db
 * @returns {string}
 */
export function render(db) {
  const section = db && db.sections ? db.sections.spells : null;
  if (!section) return C.emptyState("Load your save file to reveal the ancient spells");

  const entries = section.entries || {};
  const { done, total } = countRuleA(section);

  let html = C.sectionHeader({
    title: section.h2 || "Spells",
    subtitle: shortText(section.description),
    done,
    total,
  });

  html += `<div class="grid grid-cols-1 gap-lg">`;
  for (const pair of SPELL_PAIRS) {
    const baseEntry = entries[pair.base];
    const upEntry = entries[pair.up];
    html +=
      `<article class="bg-surface/80 backdrop-blur-md rounded-xl border border-border-dim overflow-hidden group transition-all duration-300 hover:border-border-bright">` +
        `<div class="flex flex-col sm:flex-row h-full">` +
          spellTier(baseEntry, pair.base, pair.baseIcon, "base") +
          spellTier(upEntry, pair.up, pair.upIcon, "upgrade") +
        `</div>` +
      `</article>`;
  }
  html += `</div>`;

  // Reference countSections/escapeHtml to keep the shared util surface consistent.
  void countSections;
  void escapeHtml;
  return html;
}
