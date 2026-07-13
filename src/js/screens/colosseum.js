/**
 * colosseum.js — "Colosseum of Fools" screen.
 *
 * Single backing section: db.sections.colosseum (3 trials — Warrior, Conqueror, Fool).
 * Bento grid of trial cards; state is derived from completion + sequential unlock:
 *   complete            → [COMPLETED] (amber badge, teal accent + full teal bar, full width)
 *   incomplete, prev ok → [LOCKED]    (amber accent, empty amber bar)
 *   incomplete, prev no → [UNSEEN]    (scarlet accent, struck-through badge, dim empty track)
 * No numeric per-card counts; the aggregate count lives in the section header.
 *
 * Returns INNER content only; the caller wraps it in the outer <section>.
 */

import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

/* One trial card. state ∈ "complete" | "locked" | "unseen". */
function trialCard(entry, key, state) {
  const complete = state === "complete";
  const name = entry.name || key;

  const stateIcon =
    state === "complete" ? "stars" : state === "locked" ? "shield" : "skull";
  const iconCls =
    state === "complete"
      ? "text-tertiary-container text-2xl shrink-0"
      : state === "locked"
      ? "text-secondary-container text-2xl shrink-0"
      : "text-danger-scarlet text-2xl shrink-0";

  const wrap =
    state === "complete"
      ? "single-entry completed-item md:col-span-2 relative bg-surface-container/85 backdrop-blur-xl border border-border-dim rounded-lg p-lg border-t-2 border-t-secondary-container/30 hover:border-secondary-container/50 transition-all duration-300 group overflow-hidden"
      : state === "locked"
      ? "single-entry incomplete-item relative bg-surface-container/85 backdrop-blur-xl border border-border-dim rounded-lg p-lg hover:border-secondary-container/50 transition-all duration-300 group"
      : "single-entry incomplete-item relative bg-surface-container/85 backdrop-blur-xl border border-border-dim rounded-lg p-lg border-t-2 border-t-danger-scarlet/30 hover:border-danger-scarlet/50 transition-all duration-300 group opacity-90";

  // Name — wiki link carrying the spoiler contract (blurred + spoiler-red when not complete).
  const nameCls = complete ? "wiki" : "wiki spoiler-red blurred";
  const nameHtml = entry.wiki
    ? `<a class="${nameCls}" href="${C.WIKI}${entry.wiki}" target="_blank" rel="noopener">${name}</a>`
    : `<b>${name}</b>`;

  // Spoiler / unlock requirement — blurred until complete.
  const spoilerHtml = entry.spoiler
    ? `<p class="font-body-base text-lichen-blue text-sm mb-md"><span class="${complete ? "spoiler-span-green" : "spoiler-span blurred"}"><span class="spoiler-text">${entry.spoiler}</span></span></p>`
    : `<p class="font-body-base text-lichen-blue text-sm mb-md">&nbsp;</p>`;

  // Status badge.
  const badge =
    state === "complete"
      ? C.statusBadge("COMPLETED", "complete")
      : state === "locked"
      ? C.statusBadge("LOCKED", "locked")
      : C.statusBadge("UNSEEN", "unseen");

  // Progress bar — teal-full / amber-empty / dim empty track.
  const bar =
    state === "complete"
      ? C.progressBar(100, "teal")
      : state === "locked"
      ? C.progressBar(0, "amber")
      : `<div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden opacity-50"></div>`;

  return (
    `<div class="${wrap}">` +
      `<div class="flex flex-col h-full justify-between">` +
        `<div>` +
          `<div class="flex items-center gap-sm mb-xs">` +
            C.sym(stateIcon, complete ? 1 : 0, iconCls) +
            `<h3 class="font-headline-md text-headline-md text-on-surface">${nameHtml}</h3>` +
          `</div>` +
          spoilerHtml +
        `</div>` +
        `<div class="flex flex-col gap-sm mt-md">` +
          `<div class="flex justify-end">${badge}</div>` +
          bar +
        `</div>` +
      `</div>` +
    `</div>`
  );
}

export function render(db) {
  if (!db || !db.sections) return C.emptyState();

  const section = db.sections.colosseum;
  if (!section) return C.emptyState("The Colosseum trials are not recorded");

  void countSections(db, ["colosseum"]);
  void escapeHtml;

  const { done, total } = countRuleA(section);
  const header = C.sectionHeader({
    title: section.h2 || "Colosseum of Fools",
    subtitle: shortText(section.description),
    done,
    total,
  });

  const entries = section.entries || {};
  const cards = [];
  let prevComplete = true; // the first trial is always available.
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const e = entries[key];
    if (!e || e.disabled === true) continue;
    const complete = isEntryComplete(e);
    const state = complete ? "complete" : prevComplete ? "locked" : "unseen";
    cards.push(trialCard(e, key, state));
    prevComplete = complete;
  }

  const grid = cards.length
    ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-lg">${cards.join("")}</div>`
    : C.emptyState("No trials recorded");

  return (
    `<div class="flex flex-col gap-lg">` +
      header +
      grid +
      C.fleurDivider() +
    `</div>`
  );
}
