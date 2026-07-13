/**
 * geo.js — "Geo Caches" screen (composite: geoChests + geoRocks).
 *
 * Two sub-sections, each with its own C.sectionHeader (Rule A count) so the
 * on-screen counts sum to the sidebar badge. Geo amounts live inside entry.name
 * (there is no entry.amount), so meta stays empty. geoRocks is large (207
 * entries) — render it as a compact 2-col grid of C.listRow on md+ to keep the
 * DOM manageable and the layout scannable.
 */
import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

void countSections;
void escapeHtml;

/**
 * Render one backing section: header + rows. `grid` picks a compact 2-col grid
 * (for the 207 Geo Rocks) instead of the default single-column stack.
 * @param {object} section db.sections[key] (or falsy)
 * @param {boolean} grid
 * @returns {string}
 */
function renderGeoSection(section, grid) {
  if (!section) return "";
  const { done, total } = countRuleA(section);
  let html = C.sectionHeader({
    title: section.h2 || "Geo",
    subtitle: shortText(section.description),
    done,
    total,
  });
  const wrapClass = grid
    ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-sm mb-lg">`
    : `<div class="space-y-sm mb-lg">`;
  html += wrapClass;
  const entries = section.entries || {};
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const entry = entries[key];
    if (!entry) continue;
    html += C.listRow({
      name: entry.name != null ? String(entry.name) : key,
      spoiler: entry.spoiler != null ? String(entry.spoiler) : "",
      wiki: entry.wiki || "",
      complete: isEntryComplete(entry),
      spoilerHtml: true,
      meta: entry.amount != null ? String(entry.amount) : "",
    });
  }
  html += `</div>`;
  return html;
}

export function render(db) {
  const sections = db && db.sections ? db.sections : {};
  let html = "";
  html += renderGeoSection(sections.geoChests, false);
  html += renderGeoSection(sections.geoRocks, true);
  if (!html) return C.emptyState();
  return html;
}
