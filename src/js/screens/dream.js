/**
 * dream.js — "Dream Realm" COMPOSITE screen.
 *
 * Backing sections (rendered in order, each with its own C.sectionHeader so the
 * on-screen counts sum to the sidebar badge):
 *   1. dreamNail     — Dream Nail & Essence (essence tracker card + acquisition rows)
 *   2. warriorDreams — the 7 Dream Warriors (list rows)
 *   3. dreamers      — the 3 Dreamers (SEALED / BROKEN status rows)
 *
 * Returns the INNER content only; the caller wraps this in
 * <section class="ledger-screen" data-screen="dream"><div class="mb-section-gap">…</div></section>.
 */

import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

/* Essence display constants (Seer 1800 → Ascension 2400). */
const ESSENCE_MAX = 2400;

/* Find a live essence amount, if the analyzer attached one to a dreamNail entry. */
function findEssence(section) {
  const entries = section && section.entries;
  if (!entries) return null;
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const e = entries[key];
    if (!e) continue;
    const n = Number(e.amount);
    if (Number.isFinite(n)) {
      const max = Number.isFinite(Number(e.amountTotal)) ? Number(e.amountTotal) : ESSENCE_MAX;
      return { amount: n, max: max > 0 ? max : ESSENCE_MAX };
    }
  }
  return null;
}

/* Unique essence-tracker card (aggregate, not a per-entry element — no spoiler contract). */
function essenceCard(amount, max) {
  const clamped = amount < 0 ? 0 : amount;
  const pct = max ? Math.min(100, (clamped / max) * 100) : 0;
  return (
    `<section class="bg-surface-container/85 backdrop-blur-xl border border-border-dim rounded-xl p-lg flex flex-col gap-md relative overflow-hidden shadow-glow">` +
      `<div class="absolute top-0 left-0 w-full h-[2px] bg-secondary-container/40"></div>` +
      `<div class="flex justify-between items-end">` +
        `<h3 class="font-headline-md text-headline-md text-primary flex items-center gap-sm">` +
          C.sym("flare", 1, "text-secondary-container") +
          `Dream Essence` +
        `</h3>` +
        `<div class="font-code-path text-caption text-lichen-blue uppercase tracking-wider">Awoken Tier</div>` +
      `</div>` +
      `<div class="flex items-center justify-center py-xl">` +
        `<span class="font-display-lg text-[64px] leading-none text-secondary-container tracking-widest">${clamped}<span class="text-surface-variant text-[40px]">/${max}</span></span>` +
      `</div>` +
      C.progressBar(pct, "amber") +
      `<div class="flex justify-between mt-sm font-label-sm text-lichen-blue">` +
        `<span>Seer</span><span>Ascension</span>` +
      `</div>` +
    `</section>`
  );
}

/* ---- Section 1: Dream Nail & Essence ------------------------------------- */
function renderDreamNail(section, analyzed) {
  if (!section) return "";
  const { done, total } = countRuleA(section);
  const header = C.sectionHeader({
    title: section.h2 || "Dream Nail and Essence",
    subtitle: shortText(section.description),
    done,
    total,
  });

  const essence = findEssence(section);
  const card = essence ? essenceCard(essence.amount, essence.max) : "";

  const entries = section.entries || {};
  const rows = [];
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const e = entries[key];
    if (!e || e.disabled === true) continue;
    const complete = isEntryComplete(e);
    rows.push(
      C.listRow({
        icon: "auto_awesome",
        name: e.name || key,
        complete,
        spoiler: e.spoiler || "",
        wiki: e.wiki || "",
        statusLabel: complete ? "AWOKEN" : "DORMANT",
      })
    );
  }

  const list = rows.length
    ? `<div class="flex flex-col gap-sm">${rows.join("")}</div>`
    : (analyzed ? "" : C.emptyState("Load your save file to reveal the Dream Nail's essence"));

  return (
    `<section class="flex flex-col gap-md">` +
      header +
      card +
      list +
    `</section>`
  );
}

/* ---- Section 2: Warrior Dreams (Dream Warriors) -------------------------- */
function renderWarriorDreams(section) {
  if (!section) return "";
  const { done, total } = countRuleA(section);
  const header = C.sectionHeader({
    title: section.h2 || "Warrior Dreams",
    subtitle: shortText(section.description),
    done,
    total,
  });

  const entries = section.entries || {};
  const rows = [];
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const e = entries[key];
    if (!e || e.disabled === true) continue;
    const complete = isEntryComplete(e);
    rows.push(
      C.listRow({
        icon: "local_fire_department",
        name: e.name || key,
        complete,
        spoiler: e.spoiler || "",
        wiki: e.wiki || "",
        statusLabel: complete ? "SLAIN" : "DREAMING",
      })
    );
  }

  const list = rows.length
    ? `<div class="flex flex-col gap-sm">${rows.join("")}</div>`
    : C.emptyState("No Dream Warriors recorded");

  return `<section class="flex flex-col gap-md">${header}${list}</section>`;
}

/* ---- Section 3: The Dreamers -------------------------------------------- */
function dreamerIcon(entry) {
  const w = (entry && (entry.wiki || entry.name) || "").toLowerCase();
  if (w.indexOf("lurien") !== -1) return "visibility";
  if (w.indexOf("monomon") !== -1) return "water_drop";
  if (w.indexOf("herrah") !== -1) return "pets";
  return "bedtime";
}

/* Custom dreamer row — replicates the .single-entry / spoiler / wiki contract by hand,
   with the mockup's SEALED (scarlet) vs BROKEN (green + strikethrough) states. */
function dreamerRow(entry, key) {
  const complete = isEntryComplete(entry);
  const icon = dreamerIcon(entry);
  const name = entry.name || key;

  const wrap = complete
    ? "single-entry completed-item relative overflow-hidden bg-surface-container/60 border border-border-dim rounded-lg p-md flex items-center justify-between gap-md opacity-80 hover:opacity-100 transition-opacity group"
    : "single-entry incomplete-item relative overflow-hidden bg-surface-container-lowest/80 border border-border-dim rounded-lg p-md flex items-center justify-between gap-md hover:bg-surface-container-high transition-colors group";

  const accent = complete
    ? `<div class="absolute left-0 top-0 bottom-0 w-1 bg-success-green/50"></div>`
    : `<div class="absolute left-0 top-0 bottom-0 w-1 bg-surface-variant group-hover:bg-primary/50 transition-colors"></div>`;

  const iconCls = complete
    ? "text-surface-variant text-2xl shrink-0"
    : "text-lichen-blue text-2xl shrink-0";

  const nameCls = complete
    ? "wiki font-body-bold text-on-surface-variant line-through decoration-border-bright tracking-wide"
    : "wiki spoiler-red blurred font-body-bold text-on-surface tracking-wide";
  const nameHtml = entry.wiki
    ? `<a class="${nameCls}" href="${C.WIKI}${entry.wiki}" target="_blank" rel="noopener">${name}</a>`
    : `<b>${name}</b>`;

  const spoiler = entry.spoiler
    ? ` <span class="${complete ? "spoiler-span-green" : "spoiler-span blurred"}"><span class="spoiler-text">— ${entry.spoiler}</span></span>`
    : "";

  const badge = C.statusBadge(complete ? "BROKEN" : "SEALED", complete ? "broken" : "sealed");

  return (
    `<div class="${wrap}">` +
      accent +
      `<div class="flex items-center gap-md pl-sm min-w-0">` +
        C.sym(icon, complete ? 1 : 0, iconCls) +
        `<div class="min-w-0"><h4 class="font-body-bold text-on-surface">${nameHtml}${spoiler}</h4></div>` +
      `</div>` +
      `<div class="ml-auto shrink-0 pl-sm">${badge}</div>` +
    `</div>`
  );
}

function renderDreamers(section) {
  if (!section) return "";
  const { done, total } = countRuleA(section);
  const header = C.sectionHeader({
    title: section.h2 || "Dreamers",
    subtitle: shortText(section.description),
    done,
    total,
  });

  const entries = section.entries || {};
  const rows = [];
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const e = entries[key];
    if (!e || e.disabled === true) continue;
    rows.push(dreamerRow(e, key));
  }

  const list = rows.length
    ? `<div class="grid grid-cols-1 gap-sm">${rows.join("")}</div>`
    : C.emptyState("No Dreamers recorded");

  return `<section class="flex flex-col gap-md">${header}${list}</section>`;
}

/* ---- Entry point --------------------------------------------------------- */
export function render(db) {
  if (!db || !db.sections) return C.emptyState();

  const s = db.sections;
  const analyzed = !!db.saveAnalyzed;

  // Header count parity check (sums to the sidebar badge for these three keys).
  void countSections(db, ["dreamNail", "warriorDreams", "dreamers"]);
  void escapeHtml;

  const parts = [
    renderDreamNail(s.dreamNail, analyzed),
    C.fleurDivider(),
    renderWarriorDreams(s.warriorDreams),
    C.fleurDivider(),
    renderDreamers(s.dreamers),
  ].filter(Boolean);

  if (!parts.length) return C.emptyState();

  return `<div class="flex flex-col gap-section-gap">${parts.join("")}</div>`;
}
