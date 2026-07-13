/**
 * ledger-screens.js — Knight's Ledger screen registry + completion counting +
 * per-screen renderers.
 *
 * Consumes the shared component library (ledger-components.js) to build the
 * single `#generated.innerHTML` string, one <section> per sidebar screen.
 *
 * AUTHORING CONTRACT (see DESIGN-MAP §3 / tailwind.config.js):
 *  - Every Tailwind class is a COMPLETE static string literal so the build-time
 *    content scanner (globs ./src/**\/*.{html,js}) keeps it. Ternaries choose
 *    between full class strings — never concatenate/interpolate class fragments.
 *  - The ONLY runtime-computed values (progress width %, gauge rotation) are
 *    emitted as inline `style="width:NN%"` — never as `w-[NN%]`.
 *  - Icons are Material Symbols Outlined via C.sym() (FILL 1 = active/complete).
 *  - Dark theme only; tokens come from tailwind.config.js (no invented colors).
 *  - Spoiler/blur classes (.single-entry/.completed-item/.incomplete-item/
 *    .spoiler-span/.spoiler-span-green/.spoiler-text/.spoiler-red/.blurred/
 *    .wiki/.hint) are emitted verbatim so the existing toggle logic keeps working.
 *
 * COMPLETION RULE A (DESIGN-MAP §1.2 A) drives every badge / card count:
 *   iterate section.entries; skip entry.disabled===true (from numerator AND
 *   denominator); done++ when entry.icon is a "done" icon (see RULE_A_ICONS).
 */

import * as C from "./ledger-components.js";

/* Cartographer's Atlas: pin selection state + the entry -> region resolver. Used
   to render inline "pin to map" toggles on the mappable ledger rows/tiles. */
import { idFor, isSelected, pinButton } from "./map-state.js";
import { regionForEntry } from "./map-data.js";

/* Bespoke per-screen renderers (Phase 2). Each screens/<id>.js exports render(db). */
import { render as renderSpells } from "./screens/spells.js";
import { render as renderAbilities } from "./screens/abilities.js";
import { render as renderNailarts } from "./screens/nailarts.js";
import { render as renderMasks } from "./screens/masks.js";
import { render as renderVessels } from "./screens/vessels.js";
import { render as renderLore } from "./screens/lore.js";
import { render as renderBestiary } from "./screens/bestiary.js";
import { render as renderDream } from "./screens/dream.js";
import { render as renderColosseum } from "./screens/colosseum.js";
import { render as renderPantheons } from "./screens/pantheons.js";
import { render as renderGeo } from "./screens/geo.js";
import { render as renderSecrets } from "./screens/secrets.js";
import { render as renderCollectibles } from "./screens/collectibles.js";
import { render as renderContent } from "./screens/content.js";
import { render as renderEssentials } from "./screens/essentials.js";
import { render as renderStatistics } from "./screens/statistics.js";
import { render as renderMap } from "./screens/map.js";

/* Boss portrait art — bundled locally (was hotlinked from Fandom's CDN). Sourced
   from the Hollow Knight Wiki (© Team Cherry); see the in-app Credits/About. */
import bossImgGruzMother from "../img/bosses/gruz-mother.webp";
import bossImgFalseKnight from "../img/bosses/false-knight.webp";
import bossImgHornet from "../img/bosses/hornet.webp";
import bossImgDungDefender from "../img/bosses/dung-defender.webp";
import bossImgBroodingMawlek from "../img/bosses/brooding-mawlek.webp";
import bossImgSoulMaster from "../img/bosses/soul-master.webp";
import bossImgMantisLords from "../img/bosses/mantis-lords.webp";
import bossImgNosk from "../img/bosses/nosk.webp";
import bossImgBrokenVessel from "../img/bosses/broken-vessel.webp";
import bossImgCollector from "../img/bosses/collector.webp";
import bossImgUumuu from "../img/bosses/uumuu.webp";
import bossImgTraitorLord from "../img/bosses/traitor-lord.webp";
import bossImgWatcherKnights from "../img/bosses/watcher-knights.webp";

/* screen id -> bespoke renderer; overrides the generic renderer in renderAllScreens */
const BESPOKE = {
  map: renderMap,
  spells: renderSpells,
  abilities: renderAbilities,
  nailarts: renderNailarts,
  masks: renderMasks,
  vessels: renderVessels,
  lore: renderLore,
  bestiary: renderBestiary,
  dream: renderDream,
  colosseum: renderColosseum,
  pantheons: renderPantheons,
  geo: renderGeo,
  secrets: renderSecrets,
  collectibles: renderCollectibles,
  content: renderContent,
  essentials: renderEssentials,
  statistics: renderStatistics,
};

/* -------------------------------------------------------------------------- */
/* Completion counting (Rule A)                                               */
/* -------------------------------------------------------------------------- */

/** Icons that count as "done" under Rule A (renderer / badge / section rule). */
const RULE_A_ICONS = new Set([
  "green",
  "bindingNail",
  "bindingShell",
  "bindingCharms",
  "bindingSoul",
  "bindingAll",
  "attuned",
  "ascended",
  "radiant",
  "none",
]);

/**
 * True when an entry should render in its "complete" visual state. Disabled
 * entries are treated as complete for rendering (they are irrelevant to this
 * save) even though Rule A drops them from counts entirely.
 * @param {object} entry
 * @returns {boolean}
 */
function isEntryComplete(entry) {
  if (!entry) return false;
  if (entry.disabled === true) return true;
  return RULE_A_ICONS.has(entry.icon);
}

/**
 * Rule A count over a single section. Disabled entries are excluded from both
 * numerator and denominator.
 * @param {object} section  a db.sections[key] object (or falsy)
 * @returns {{done:number, total:number}}
 */
export function countRuleA(section) {
  let done = 0;
  let total = 0;
  if (!section || !section.entries) return { done, total };
  for (const key in section.entries) {
    if (!Object.prototype.hasOwnProperty.call(section.entries, key)) continue;
    const entry = section.entries[key];
    if (!entry || entry.disabled === true) continue;
    total++;
    if (RULE_A_ICONS.has(entry.icon)) done++;
  }
  return { done, total };
}

/**
 * Sum Rule A over the section keys that actually exist in db.sections.
 * @param {object} db     the HK singleton
 * @param {string[]} keys section keys
 * @returns {{done:number, total:number}}
 */
export function countSections(db, keys) {
  let done = 0;
  let total = 0;
  if (!db || !db.sections || !Array.isArray(keys)) return { done, total };
  for (const key of keys) {
    const section = db.sections[key];
    if (!section) continue;
    const c = countRuleA(section);
    done += c.done;
    total += c.total;
  }
  return { done, total };
}

/* -------------------------------------------------------------------------- */
/* Boss portrait image map (hotlinked Fandom Special:FilePath — best guess)   */
/* -------------------------------------------------------------------------- */

/**
 * Boss portrait art for the 14 main-% bosses, keyed by db.sections.bosses entry
 * key (the same key renderBosses uses for the lookup). Images are BUNDLED
 * locally under src/img/bosses/ (previously hotlinked from Fandom's CDN) and are
 * emitted by webpack as hashed assets; each import resolves to its final URL.
 * bossCard's <img onerror> still falls back to the skull glyph if any image ever
 * fails to load. Only passed to bossCard when the boss is defeated.
 *
 * Source: Hollow Knight Wiki infobox art (© Team Cherry) — attributed in-app in
 * the Credits/About section. Hornet Protector and Hornet Sentinel share a single
 * infobox image, so both map to the same asset.
 */
export const BOSS_IMG = {
  bossGruzMother: bossImgGruzMother,
  falseKnightDefeated: bossImgFalseKnight,
  hornet1Defeated: bossImgHornet,
  defeatedDungDefender: bossImgDungDefender,
  bossBroodingMawlek: bossImgBroodingMawlek,
  mageLordDefeated: bossImgSoulMaster,
  defeatedMantisLords: bossImgMantisLords,
  killedMimicSpider: bossImgNosk,
  killedInfectedKnight: bossImgBrokenVessel,
  collectorDefeated: bossImgCollector,
  defeatedMegaJelly: bossImgUumuu,
  hornetOutskirtsDefeated: bossImgHornet,
  killedTraitorLord: bossImgTraitorLord,
  killedBlackKnight: bossImgWatcherKnights,
};

/* -------------------------------------------------------------------------- */
/* Small local helpers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Strip HTML tags + collapse whitespace from a section description so it can be
 * used as a plain, short subtitle (avoids leaking spoiler-span content).
 * @param {string} [desc]
 * @returns {string}
 */
function shortText(desc) {
  if (!desc) return "";
  const stripped = String(desc)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 120 ? stripped.slice(0, 117) + "…" : stripped;
}

/**
 * Build the name (wiki link or bold) + spoiler-suffix HTML that carries the
 * blur/spoiler class contract. Mirrors listRow()'s treatment for the bespoke
 * charm/grub tiles. Spoiler text is injected as raw HTML (descriptions may
 * contain markup).
 * @param {object} entry
 * @param {boolean} complete
 * @returns {{nameHtml:string, spoilerHtml:string}}
 */
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
    spoilerHtml = `<span class="${spanClass}"><span class="spoiler-text">— ${entry.spoiler}</span></span>`;
  }
  return { nameHtml, spoilerHtml };
}

/**
 * Statistics value row: label + wiki link + a mono value pill (no completion
 * state). Uses entry.amount over entry.amountTotal / entry.max when present.
 * @param {object} entry
 * @returns {string}
 */
function valueRow(entry) {
  const name = entry && entry.name != null ? String(entry.name) : "";
  const nameHtml = entry && entry.wiki
    ? `<a class="wiki" href="${C.WIKI}${entry.wiki}" target="_blank" rel="noopener">${name}</a>`
    : `<b>${name}</b>`;
  const spoilerHtml = entry && entry.spoiler
    ? ` <span class="spoiler-span-green"><span class="spoiler-text">— ${entry.spoiler}</span></span>`
    : "";
  const value = entry && entry.amount != null ? entry.amount : "";
  const totalVal = entry && entry.amountTotal != null
    ? entry.amountTotal
    : (entry && entry.max != null ? entry.max : null);
  const valueText = totalVal != null ? `${value}/${totalVal}` : `${value}`;
  return (
    `<div class="single-entry bg-surface-container/85 backdrop-blur-md border border-border-dim rounded-lg p-sm flex items-center gap-md">` +
      `<div class="flex-grow min-w-0"><h4 class="font-body-bold text-on-surface">${nameHtml}${spoilerHtml}</h4></div>` +
      `<span class="font-code-path text-secondary-container bg-surface-glow px-2 py-1 rounded border border-border-dim shrink-0">${valueText}</span>` +
    `</div>`
  );
}

/* -------------------------------------------------------------------------- */
/* Generic renderer                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Default per-screen renderer: for each backing section that exists, a section
 * header (Rule A count) + its entries as list rows. The Statistics screen
 * renders value rows with no completion state and no count pill.
 * @param {{id:string, sections:string[]}} screen
 * @param {object} db
 * @returns {string}
 */
export function renderGenericScreen(screen, db) {
  if (!screen || !db || !db.sections) return "";
  const isStats = screen.id === "statistics";
  let html = "";
  for (const key of screen.sections) {
    const section = db.sections[key];
    if (!section) continue;
    const { done, total } = countRuleA(section);
    html += C.sectionHeader({
      title: section.h2 || key,
      subtitle: shortText(section.description),
      done: isStats ? null : done,
      total: isStats ? null : total,
    });
    html += `<div class="space-y-sm mb-lg">`;
    const entries = section.entries || {};
    for (const ekey in entries) {
      if (!Object.prototype.hasOwnProperty.call(entries, ekey)) continue;
      const entry = entries[ekey];
      if (!entry) continue;
      if (isStats) {
        html += valueRow(entry);
      } else {
        const rowOpts = {
          name: entry.name != null ? String(entry.name) : ekey,
          meta: "",
          spoiler: entry.spoiler != null ? String(entry.spoiler) : "",
          wiki: entry.wiki || "",
          complete: isEntryComplete(entry),
          spoilerHtml: true,
        };
        // Mappable entries get an inline "pin to map" toggle (Statistics never do).
        const region = regionForEntry(key, ekey, entry);
        if (region) {
          const mid = idFor(key, ekey);
          rowOpts.mapId = mid;
          rowOpts.selected = isSelected(mid);
        }
        html += C.listRow(rowOpts);
      }
    }
    html += `</div>`;
  }
  return html;
}

/**
 * Bound generic renderer used as `render` for non-bespoke screens.
 * `this` is the screen object (set by renderAllScreens calling screen.render).
 * @this {{id:string, sections:string[]}}
 * @param {object} db
 * @returns {string}
 */
function renderGeneric(db) {
  return renderGenericScreen(this, db);
}

/* -------------------------------------------------------------------------- */
/* Flagship (bespoke) renderers                                               */
/* -------------------------------------------------------------------------- */

/** Dashboard screens shown as bento cards (every counted category). */
const BENTO_SCREENS = [
  "charms",
  "bosses",
  "grubs",
  "spells",
  "abilities",
  "masks",
  "vessels",
  "lore",
  "bestiary",
  "nailarts",
  "dream",
  "colosseum",
  "pantheons",
  "geo",
  "secrets",
  "collectibles",
  "content",
  "essentials",
];

/**
 * Dashboard: hero (game % + True Completion) + a 2-col bento of category cards
 * + the current Elderbug hint (kept in #hk-hints so the Hints toggle works).
 * @param {object} db
 * @returns {string}
 */
function renderDashboard(db) {
  const sections = db && db.sections ? db.sections : {};
  const intro = sections.intro || {};
  const analyzed = !!(db && db.saveAnalyzed);

  let html = C.hero({
    percent: intro.percent || 0,
    maxPercent: intro.maxPercent || 112,
    trueDone: intro.extendedCompletionDone || 0,
    trueTotal: intro.extendedCompletionTotal || 0,
    analyzed,
  });

  html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-md mb-section-gap">`;
  for (const id of BENTO_SCREENS) {
    const screen = SCREENS.find((s) => s.id === id);
    if (!screen) continue;
    const { done, total } = countSections(db, screen.sections);
    html += C.categoryCard({
      icon: screen.icon,
      label: screen.label,
      screen: screen.id,
      done,
      total,
      analyzed,
    });
  }
  html += `</div>`;

  const hints = sections.hints;
  if (hints && hints.entries) {
    const cur = hints.current ? hints.entries[hints.current] : null;
    const hintText = cur && cur.spoiler ? cur.spoiler : "";
    html +=
      `<div id="hk-hints" class="bg-surface-container/40 backdrop-blur-md border border-border-dim rounded-lg p-md text-center">` +
        `<p class="hint font-body-base text-lichen-blue italic">${hintText}</p>` +
      `</div>`;
  }

  return html;
}

/**
 * Bosses: section header + a grid-cols-2 grid of boss portrait cards. Defeated
 * (icon "green") shows portrait art + skull badge; otherwise a locked card.
 * @param {object} db
 * @returns {string}
 */
function renderBosses(db) {
  const section = db && db.sections ? db.sections.bosses : null;
  if (!section) return "";
  const { done, total } = countRuleA(section);
  let html = C.sectionHeader({
    title: section.h2 || "Bosses",
    subtitle: shortText(section.description),
    done,
    total,
  });
  html += `<div class="grid grid-cols-2 gap-md">`;
  const entries = section.entries || {};
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const entry = entries[key];
    if (!entry) continue;
    const defeated = entry.icon === "green";
    const img = defeated ? (BOSS_IMG[key] || "") : "";
    const card = C.bossCard({
      name: entry.name != null ? String(entry.name) : key,
      desc: entry.spoiler != null ? String(entry.spoiler) : "",
      img,
      wiki: entry.wiki || "",
      defeated,
    });
    // Mappable bosses get a "pin to map" toggle at the card's top-left (the skull
    // badge already occupies top-right on defeated cards).
    const region = regionForEntry("bosses", key, entry);
    if (region) {
      const mid = idFor("bosses", key);
      html +=
        `<div class="relative">` +
          card +
          `<div class="absolute top-2 left-2 z-20">${pinButton(mid, isSelected(mid))}</div>` +
        `</div>`;
    } else {
      html += card;
    }
  }
  html += `</div>`;
  return html;
}

const CHARM_TILE_ACTIVE =
  "single-entry completed-item bg-surface-container/85 backdrop-blur-md border border-border-dim border-t-2 border-t-success-green/30 rounded-lg p-sm flex items-center gap-md hover:bg-surface-container-high transition-colors";
const CHARM_TILE_DIM =
  "single-entry incomplete-item bg-surface-container/40 backdrop-blur-md border border-border-dim rounded-lg p-sm flex items-center gap-md opacity-80";

/**
 * Charms: section header + a grid of charm tiles. Complete charms get an amber
 * ring + filled glyph; incomplete are dim. Name + spoiler use the blur contract.
 * @param {object} db
 * @returns {string}
 */
function renderCharms(db) {
  const section = db && db.sections ? db.sections.charms : null;
  if (!section) return "";
  const { done, total } = countRuleA(section);
  let html = C.sectionHeader({
    title: section.h2 || "Charms",
    subtitle: shortText(section.description),
    done,
    total,
  });
  html += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">`;
  const entries = section.entries || {};
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const entry = entries[key];
    if (!entry) continue;
    const complete = isEntryComplete(entry);
    const { nameHtml, spoilerHtml } = nameSpoiler(entry, complete);
    const tile = complete
      ? `<div class="aspect-square w-14 h-14 rounded-full border-2 border-secondary-container bg-surface-glow flex items-center justify-center shadow-glow shrink-0">` +
          C.sym("auto_awesome", 1, "text-secondary-container text-2xl") +
        `</div>`
      : `<div class="aspect-square w-14 h-14 rounded-full border border-border-dim bg-surface-container/40 flex items-center justify-center opacity-60 shrink-0">` +
          C.sym("auto_awesome", 0, "text-outline text-2xl") +
        `</div>`;
    const cardClass = complete ? CHARM_TILE_ACTIVE : CHARM_TILE_DIM;
    // Mappable charms get a "pin to map" toggle at the tile's right edge.
    let pinHtml = "";
    const region = regionForEntry("charms", key, entry);
    if (region) {
      const mid = idFor("charms", key);
      pinHtml = `<div class="ml-auto shrink-0">${pinButton(mid, isSelected(mid))}</div>`;
    }
    html +=
      `<div class="${cardClass}">` +
        tile +
        `<div class="flex-grow min-w-0"><h4 class="font-body-bold text-on-surface">${nameHtml} ${spoilerHtml}</h4></div>` +
        pinHtml +
      `</div>`;
  }
  html += `</div>`;

  // Charm Notches sub-section — rendered here so the on-screen count matches the
  // sidebar badge [x/y], which sums charms + charmNotches.
  const notches = db && db.sections ? db.sections.charmNotches : null;
  if (notches && notches.entries) {
    const nc = countRuleA(notches);
    html += C.fleurDivider();
    html += C.sectionHeader({
      title: notches.h2 || "Charm Notches",
      subtitle: shortText(notches.description),
      done: nc.done,
      total: nc.total,
    });
    html += `<div class="space-y-sm">`;
    for (const key in notches.entries) {
      if (!Object.prototype.hasOwnProperty.call(notches.entries, key)) continue;
      const entry = notches.entries[key];
      if (!entry) continue;
      const rowOpts = {
        name: entry.name != null ? String(entry.name) : key,
        spoiler: entry.spoiler != null ? String(entry.spoiler) : "",
        wiki: entry.wiki || "",
        complete: isEntryComplete(entry),
        spoilerHtml: true,
      };
      // Charm notches rarely resolve to a region; pin only when they do.
      const region = regionForEntry("charmNotches", key, entry);
      if (region) {
        const mid = idFor("charmNotches", key);
        rowOpts.mapId = mid;
        rowOpts.selected = isSelected(mid);
      }
      html += C.listRow(rowOpts);
    }
    html += `</div>`;
  }

  return html;
}

const GRUB_CARD_RESCUED =
  "single-entry completed-item bg-surface-container/85 backdrop-blur-md border border-border-dim border-t-2 border-t-secondary-container/30 rounded-lg p-md flex flex-col hover:bg-surface-container-high transition-colors";
const GRUB_CARD_TRAPPED =
  "single-entry incomplete-item bg-surface-container/40 backdrop-blur-md border border-border-dim rounded-lg p-md flex flex-col opacity-70";

/**
 * Grubs: section header + a grid of grub glyph cards (bug_report + #N index).
 * Rescued grubs glow amber; trapped grubs are dim. Name/location use the blur
 * contract.
 * @param {object} db
 * @returns {string}
 */
function renderGrubs(db) {
  const section = db && db.sections ? db.sections.grubs : null;
  if (!section) return "";
  const { done, total } = countRuleA(section);
  let html = C.sectionHeader({
    title: section.h2 || "Grubs",
    subtitle: shortText(section.description),
    done,
    total,
  });
  html += `<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-md">`;
  const entries = section.entries || {};
  let idx = 0;
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const entry = entries[key];
    if (!entry) continue;
    idx++;
    const rescued = isEntryComplete(entry);
    const { nameHtml, spoilerHtml } = nameSpoiler(entry, rescued);
    // Mappable grubs get a "pin to map" toggle beside the #N index (top-right).
    let pinHtml = "";
    const region = regionForEntry("grubs", key, entry);
    if (region) {
      const mid = idFor("grubs", key);
      pinHtml = pinButton(mid, isSelected(mid));
    }
    const glyphRow = rescued
      ? `<div class="flex items-center justify-between mb-sm">` +
          C.sym("bug_report", 1, "text-secondary-container text-2xl") +
          `<div class="flex items-center gap-xs shrink-0">` +
            `<span class="font-code-path text-secondary-container">#${idx}</span>` +
            pinHtml +
          `</div>` +
        `</div>`
      : `<div class="flex items-center justify-between mb-sm">` +
          C.sym("bug_report", 0, "text-outline text-2xl") +
          `<div class="flex items-center gap-xs shrink-0">` +
            `<span class="font-code-path text-outline">#${idx}</span>` +
            pinHtml +
          `</div>` +
        `</div>`;
    const cardClass = rescued ? GRUB_CARD_RESCUED : GRUB_CARD_TRAPPED;
    html +=
      `<div class="${cardClass}">` +
        glyphRow +
        `<h4 class="font-body-bold text-on-surface">${nameHtml}</h4>` +
        `<p class="font-caption text-caption text-lichen-blue mt-xs">${spoilerHtml}</p>` +
      `</div>`;
  }
  html += `</div>`;
  return html;
}

/* -------------------------------------------------------------------------- */
/* Screen registry                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The sidebar screen registry. Each screen maps to one or more db.sections keys
 * and knows how to render itself. `render(db) -> htmlString`.
 * @type {Array<{id:string, label:string, icon:string, sections:string[], render:(db:object)=>string}>}
 */
export const SCREENS = [
  { id: "dashboard", label: "Dashboard", icon: "home", sections: [], render: renderDashboard },
  { id: "map", label: "Map", icon: "map", sections: [], render: renderMap },
  { id: "charms", label: "Charms", icon: "auto_awesome", sections: ["charms", "charmNotches"], render: renderCharms },
  { id: "bosses", label: "Bosses", icon: "swords", sections: ["bosses"], render: renderBosses },
  { id: "grubs", label: "Grubs", icon: "bug_report", sections: ["grubs"], render: renderGrubs },
  { id: "spells", label: "Spells", icon: "auto_fix_high", sections: ["spells"], render: renderGeneric },
  { id: "abilities", label: "Abilities", icon: "bolt", sections: ["equipment"], render: renderGeneric },
  { id: "masks", label: "Masks", icon: "vibration", sections: ["maskShards"], render: renderGeneric },
  { id: "vessels", label: "Vessels", icon: "opacity", sections: ["vesselFragments"], render: renderGeneric },
  {
    id: "lore",
    label: "Lore",
    icon: "menu_book",
    sections: [
      "relicsWanderersJournal",
      "relicsHallownestSeal",
      "relicsKingsIdol",
      "relicsArcaneEgg",
      "whisperingRoots",
    ],
    render: renderGeneric,
  },
  { id: "bestiary", label: "Bestiary", icon: "pest_control", sections: ["huntersJournal", "huntersJournalOptional"], render: renderGeneric },
  { id: "nailarts", label: "Nail Arts", icon: "cyclone", sections: ["nailArts", "nailUpgrades"], render: renderGeneric },
  { id: "dream", label: "Dream Realm", icon: "visibility", sections: ["dreamNail", "warriorDreams", "dreamers"], render: renderGeneric },
  { id: "colosseum", label: "Colosseum", icon: "emoji_events", sections: ["colosseum"], render: renderGeneric },
  {
    id: "pantheons",
    label: "Pantheons",
    icon: "account_balance",
    sections: [
      "pantheonOfTheMaster",
      "pantheonOfTheArtist",
      "pantheonOfTheSage",
      "pantheonOfTheKnight",
      "pantheonOfHallownest",
      "hallOfGods",
      "godhomeStatistics",
    ],
    render: renderGeneric,
  },
  { id: "geo", label: "Geo Caches", icon: "paid", sections: ["geoChests", "geoRocks"], render: renderGeneric },
  { id: "secrets", label: "Secrets", icon: "lock", sections: ["worldInteractions", "secretRooms", "corniferNotes"], render: renderGeneric },
  { id: "collectibles", label: "Collectibles", icon: "inventory_2", sections: ["rancidEggs", "items"], render: renderGeneric },
  { id: "content", label: "Content Packs", icon: "extension", sections: ["grimmTroupe", "lifeblood", "godmaster"], render: renderGeneric },
  {
    id: "essentials",
    label: "Essentials",
    icon: "verified",
    sections: [
      "essentialsCollectibles",
      "essentialsStagStations",
      "essentialsWorldInteractions",
      "essentialsBosses",
      "achievementsCollectibles",
      "achievementsMaps",
      "achievementsWorldInteractions",
      "achievementsBosses",
    ],
    render: renderGeneric,
  },
  { id: "statistics", label: "Statistics", icon: "query_stats", sections: ["statistics"], render: renderGeneric },
];

/* -------------------------------------------------------------------------- */
/* Orchestration exports (called by the integrator)                           */
/* -------------------------------------------------------------------------- */

/**
 * Badge count for a screen. Dashboard uses game-% (rule C: rounded
 * intro.percent / intro.maxPercent); Statistics is badge-less ({0,0}); every
 * other screen sums Rule A over its backing sections.
 * @param {{id:string, sections:string[]}} screen
 * @param {object} db
 * @returns {{done:number, total:number}}
 */
export function screenCount(screen, db) {
  if (!screen) return { done: 0, total: 0 };
  if (screen.id === "statistics") return { done: 0, total: 0 };
  if (screen.id === "dashboard") {
    const intro = db && db.sections ? db.sections.intro : null;
    if (intro && intro.maxPercent) {
      return { done: Math.round(intro.percent || 0), total: intro.maxPercent };
    }
    return { done: 0, total: 0 };
  }
  return countSections(db, screen.sections);
}

/**
 * Render every screen into one string. Each screen's inner content is wrapped
 * in <section class="ledger-screen" data-screen="ID"> (visibility is the
 * router's job — no `hidden` attribute here) with an mb-section-gap container.
 * @param {object} db
 * @returns {string}
 */
export function renderAllScreens(db) {
  let html = "";
  for (const screen of SCREENS) {
    const renderFn = BESPOKE[screen.id] || screen.render;
    let inner;
    try {
      inner = renderFn(db);
    } catch (err) {
      if (typeof console !== "undefined") console.error("Screen render failed:", screen.id, err);
      inner = C.emptyState("This screen could not be rendered.");
    }
    html +=
      `<section class="ledger-screen" data-screen="${screen.id}">` +
        `<div class="mb-section-gap">${inner}</div>` +
      `</section>`;
  }
  return html;
}
