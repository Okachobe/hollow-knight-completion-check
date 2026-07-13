/**
 * screens/abilities.js — "Special Abilities" bespoke renderer.
 *
 * db.sections.equipment holds the 7 traversal relics (Mantis Claw, Mothwing
 * Cloak, Shade Cloak, Monarch Wings, Crystal Heart, Isma's Tear, King's Brand).
 * Rendered as a bento grid of "relic" cards. A collected relic shows an amber
 * MASTERED status badge + filled (FILL 1) glyph + watermark; an uncollected one
 * is a dim, locked card. entry key != display name, so entry.name drives titles.
 * Header count via countRuleA(equipment) matches the sidebar badge.
 */

import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

/**
 * Per-relic presentation data keyed by db.sections.equipment entry key.
 * icon = Material Symbol; color = COMPLETE class literal for the filled glyph;
 * wide = spans both grid columns (the feature card).
 */
const RELIC_META = {
  hasWalljump: { icon: "front_hand", color: "text-secondary-container" },
  hasDash: { icon: "air", color: "text-secondary-container" },
  hasShadowDash: { icon: "dark_mode", color: "text-primary" },
  hasDoubleJump: { icon: "flight", color: "text-secondary-container", wide: true },
  hasSuperDash: { icon: "diamond", color: "text-tertiary-container" },
  hasAcidArmour: { icon: "water_drop", color: "text-success-green" },
  hasKingsBrand: { icon: "workspace_premium", color: "text-secondary-container" },
};

const FALLBACK_META = { icon: "bolt", color: "text-secondary-container" };

/**
 * MASTERED (complete) or LOCKED (incomplete) status pill.
 * @param {boolean} complete
 * @returns {string}
 */
function statusPill(complete) {
  return complete
    ? `<div class="px-sm py-xs rounded bg-surface-glow border border-secondary-container/30 flex items-center gap-xs shrink-0">` +
        `<div class="w-2 h-2 rounded-full bg-success-green shadow-[0_0_8px_#16c60c]"></div>` +
        `<span class="font-code-path text-caption text-secondary-container">MASTERED</span>` +
      `</div>`
    : `<div class="px-sm py-xs rounded bg-surface-glow border border-border-dim flex items-center gap-xs shrink-0">` +
        C.sym("lock", 0, "text-outline text-[14px]") +
        `<span class="font-code-path text-caption text-lichen-blue">LOCKED</span>` +
      `</div>`;
}

/**
 * One relic bento card.
 * @param {object} entry  db entry (may be undefined)
 * @param {string} key    entry key
 * @returns {string}
 */
function relicCard(entry, key) {
  const complete = isEntryComplete(entry);
  const meta = RELIC_META[key] || FALLBACK_META;
  const wide = meta.wide === true;
  const spanClass = wide ? "md:col-span-2" : "";

  const name = entry && entry.name != null ? String(entry.name) : key;
  const wiki = entry && entry.wiki ? entry.wiki : "";
  const spoiler = entry && entry.spoiler != null ? String(entry.spoiler) : "";

  const cardBase = complete
    ? "single-entry completed-item bg-surface-container/85 backdrop-blur-md border border-border-dim border-t-2 border-t-secondary-container/30 rounded-xl p-lg relative overflow-hidden group flex flex-col card-glow"
    : "single-entry incomplete-item bg-surface-container/40 backdrop-blur-md border border-border-dim rounded-xl p-lg relative overflow-hidden group flex flex-col opacity-80";
  const cardClass = `${cardBase} ${spanClass}`;

  // Oversized watermark glyph (collected relics only).
  const watermark = complete
    ? `<div class="absolute -right-10 -top-10 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10">` +
        C.sym(meta.icon, 1, "text-primary text-[150px]") +
      `</div>`
    : "";

  // Icon tile.
  const tile = complete
    ? `<div class="w-12 h-12 rounded-lg bg-surface-container-high border border-secondary-container/40 flex items-center justify-center shadow-inner shrink-0">` +
        C.sym(meta.icon, 1, `${meta.color} text-[28px]`) +
      `</div>`
    : `<div class="w-12 h-12 rounded-lg bg-surface-container/40 border border-border-dim flex items-center justify-center shrink-0">` +
        C.sym(meta.icon, 0, "text-outline text-[28px]") +
      `</div>`;

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
  const descClass = complete
    ? "font-body-base text-lichen-blue mb-md relative z-10 line-clamp-2"
    : "font-body-base text-outline-variant mb-md relative z-10 line-clamp-2";
  const descHtml = spoiler
    ? `<p class="${descClass}"><span class="${spoilerSpan}"><span class="spoiler-text">${spoiler}</span></span></p>`
    : "";

  return (
    `<div class="${cardClass}">` +
      watermark +
      `<div class="flex justify-between items-start mb-md relative z-10">${tile}${statusPill(complete)}</div>` +
      `<h3 class="${titleClass}">${nameHtml}</h3>` +
      descHtml +
    `</div>`
  );
}

/**
 * @param {object} db
 * @returns {string}
 */
export function render(db) {
  const section = db && db.sections ? db.sections.equipment : null;
  if (!section) return C.emptyState("Load your save file to survey your relics");

  const entries = section.entries || {};
  const { done, total } = countRuleA(section);

  let html = C.sectionHeader({
    title: section.h2 || "Abilities",
    subtitle: shortText(section.description),
    done,
    total,
  });

  html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-md">`;
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const entry = entries[key];
    if (!entry) continue;
    html += relicCard(entry, key);
  }
  html += `</div>`;

  void countSections;
  void escapeHtml;
  return html;
}
