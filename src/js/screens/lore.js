/**
 * screens/lore.js — COMPOSITE "Lore & Relics" screen renderer.
 *
 * Backing sections (each rendered with its OWN C.sectionHeader so the on-screen
 * per-section counts sum to the sidebar badge):
 *   relicsWanderersJournal, relicsHallownestSeal, relicsKingsIdol,
 *   relicsArcaneEgg  → per-entry relic icon-cards (icon tile + name + found/lost
 *                       state + entry.spoiler location).
 *   whisperingRoots  → C.listRow list rows (essence meta when available).
 *
 * AUTHORING CONTRACT: every Tailwind class is a COMPLETE static string literal;
 * the only runtime-computed value would be an inline style width (none here).
 * Every per-entry element carries the .single-entry + completed-item/
 * incomplete-item + spoiler/.wiki blur contract (via C.listRow for rows and a
 * hand-rolled replica for the relic cards).
 */
import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

void countSections;
void escapeHtml;

/* Per relic-type presentation (rarity theme from mk-lore.md). Icon-tile/glyph
   class strings are pre-baked FULL literals per found/lost state so nothing is
   interpolated into a class name. */
const RELIC_TYPES = [
  {
    key: "relicsWanderersJournal",
    icon: "book",
    rarity: "Abundant",
    rarityClass: "font-caption text-caption text-success-green",
    tileFound:
      "w-12 h-12 rounded bg-surface-container-lowest border border-success-green/40 flex items-center justify-center shrink-0 shadow-glow",
    glyphFound: "text-success-green text-2xl",
  },
  {
    key: "relicsHallownestSeal",
    icon: "verified",
    rarity: "Uncommon",
    rarityClass: "font-caption text-caption text-primary",
    tileFound:
      "w-12 h-12 rounded bg-surface-container-lowest border border-border-bright/40 flex items-center justify-center shrink-0 shadow-glow",
    glyphFound: "text-primary text-2xl",
  },
  {
    key: "relicsKingsIdol",
    icon: "account_balance",
    rarity: "Rare",
    rarityClass: "font-caption text-caption text-secondary-container",
    tileFound:
      "w-12 h-12 rounded bg-surface-container-lowest border border-secondary-container/50 flex items-center justify-center shrink-0 shadow-glow",
    glyphFound: "text-secondary-container text-2xl",
  },
  {
    key: "relicsArcaneEgg",
    icon: "egg",
    rarity: "Mythic",
    rarityClass: "font-caption text-caption text-danger-scarlet",
    tileFound:
      "w-12 h-12 rounded bg-surface-container-lowest border border-danger-scarlet/50 flex items-center justify-center shrink-0 shadow-glow",
    glyphFound: "text-danger-scarlet text-2xl",
  },
];

const TILE_MISSING =
  "w-12 h-12 rounded bg-surface-container/40 border border-border-dim flex items-center justify-center shrink-0 opacity-60";
const GLYPH_MISSING = "text-outline text-2xl";

const CARD_FOUND =
  "single-entry completed-item bg-surface-container/85 backdrop-blur-md border border-border-dim border-t-2 border-t-success-green/30 rounded-lg p-md flex flex-col gap-sm hover:bg-surface-container-high transition-colors relative overflow-hidden";
const CARD_MISSING =
  "single-entry incomplete-item bg-surface-container/40 backdrop-blur-md border border-border-dim rounded-lg p-md flex flex-col gap-sm opacity-70 relative overflow-hidden";

/** Name link + spoiler span honoring the blur contract (replica of the shared helper). */
function nameSpoiler(entry, complete) {
  const name = entry && entry.name != null ? String(entry.name) : "";
  let nameHtml;
  if (entry && entry.wiki) {
    const linkClass = complete ? "wiki" : "wiki spoiler-red blurred";
    nameHtml = `<a class="${linkClass}" href="${C.WIKI}${entry.wiki}" target="_blank" rel="noopener">${name}</a>`;
  } else {
    nameHtml = `<b>${name}</b>`;
  }
  let spoilerHtml = "";
  if (entry && entry.spoiler) {
    const spanClass = complete ? "spoiler-span-green" : "spoiler-span blurred";
    spoilerHtml = `<span class="${spanClass}"><span class="spoiler-text">${entry.spoiler}</span></span>`;
  }
  return { nameHtml, spoilerHtml };
}

/** One relic icon-card carrying the full single-entry/spoiler contract. */
function relicCard(entry, type) {
  const complete = isEntryComplete(entry);
  const { nameHtml, spoilerHtml } = nameSpoiler(entry, complete);
  const cardClass = complete ? CARD_FOUND : CARD_MISSING;
  const tileClass = complete ? type.tileFound : TILE_MISSING;
  const glyphClass = complete ? type.glyphFound : GLYPH_MISSING;
  const tile =
    `<div class="${tileClass}">` + C.sym(type.icon, complete ? 1 : 0, glyphClass) + `</div>`;
  const status = complete
    ? C.statusBadge("Recovered", "complete")
    : C.statusBadge("Lost", "locked");
  const rarity = `<span class="${type.rarityClass}">${type.rarity}</span>`;
  const locationHtml = spoilerHtml
    ? `<p class="font-caption text-caption text-lichen-blue">${spoilerHtml}</p>`
    : "";
  return (
    `<div class="${cardClass}">` +
      `<div class="flex items-start gap-md">` +
        tile +
        `<div class="flex-grow min-w-0">` +
          `<h4 class="font-body-bold text-on-surface">${nameHtml}</h4>` +
          rarity +
        `</div>` +
        `<div class="shrink-0">${status}</div>` +
      `</div>` +
      locationHtml +
    `</div>`
  );
}

/** Render one relic sub-section: its own header + a 2-col grid of relic cards. */
function relicSection(section, type) {
  if (!section) return "";
  const { done, total } = countRuleA(section);
  let html = `<div class="mb-section-gap">`;
  html += C.sectionHeader({
    title: section.h2 || "Relics",
    subtitle: shortText(section.description),
    done,
    total,
  });
  const entries = section.entries || {};
  const keys = Object.keys(entries);
  if (!keys.length) {
    html += C.emptyState("No relics of this kind recorded.");
    html += `</div>`;
    return html;
  }
  html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-md">`;
  for (const key of keys) {
    const entry = entries[key];
    if (!entry) continue;
    html += relicCard(entry, type);
  }
  html += `</div></div>`;
  return html;
}

/** Whispering Roots sub-section: header + list rows with essence meta. */
function rootsSection(section) {
  if (!section) return "";
  const { done, total } = countRuleA(section);
  let html = `<div class="mb-section-gap">`;
  html += C.sectionHeader({
    title: section.h2 || "Whispering Roots",
    subtitle: shortText(section.description),
    done,
    total,
  });
  const entries = section.entries || {};
  const keys = Object.keys(entries);
  if (!keys.length) {
    html += C.emptyState("No Whispering Roots recorded.");
    html += `</div>`;
    return html;
  }
  html += `<div class="space-y-sm">`;
  for (const key of keys) {
    const entry = entries[key];
    if (!entry) continue;
    const complete = isEntryComplete(entry);
    // Essence meta: prefer an explicit amount, else pull ": NN Orbs" from the name.
    let meta = "";
    if (entry.amount != null) {
      meta = `${entry.amount} Essence`;
    } else if (typeof entry.name === "string") {
      const m = entry.name.match(/(\d+)\s*Orbs/i);
      if (m) meta = `${m[1]} Essence`;
    }
    html += C.listRow({
      icon: "park",
      name: entry.name != null ? String(entry.name) : key,
      meta,
      statusLabel: complete ? "Attuned" : "Dormant",
      complete,
      spoiler: entry.spoiler != null ? String(entry.spoiler) : "",
      wiki: entry.wiki || "",
      spoilerHtml: true,
    });
  }
  html += `</div></div>`;
  return html;
}

/**
 * @param {object} db the HK singleton
 * @returns {string} inner content HTML (no <section>/shell wrapper)
 */
export function render(db) {
  const sections = db && db.sections ? db.sections : {};
  let html = "";
  for (const type of RELIC_TYPES) {
    html += relicSection(sections[type.key], type);
  }
  html += rootsSection(sections.whisperingRoots);
  if (!html) html = C.emptyState("Load your save file to reveal the relics of Hallownest.");
  return html;
}
