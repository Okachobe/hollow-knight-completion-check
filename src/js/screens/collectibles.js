/**
 * collectibles.js — "Collectibles" screen (composite: rancidEggs + items).
 *
 * Two sub-sections of C.listRow, each with its own C.sectionHeader (Rule A
 * count) so the on-screen counts sum to the sidebar badge. Some rancid-egg
 * names carry a "(missable)" suffix — kept verbatim.
 */
import * as C from "../ledger-components.js";
import { countRuleA, countSections, isEntryComplete, shortText, escapeHtml } from "../ledger-util.js";

void countSections;
void escapeHtml;

/**
 * Render one backing section: header + a single-column stack of list rows.
 * @param {object} section db.sections[key] (or falsy)
 * @param {string} fallbackTitle
 * @returns {string}
 */
function renderCollectibleSection(section, fallbackTitle) {
  if (!section) return "";
  const { done, total } = countRuleA(section);
  let html = C.sectionHeader({
    title: section.h2 || fallbackTitle,
    subtitle: shortText(section.description),
    done,
    total,
  });
  html += `<div class="space-y-sm mb-lg">`;
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
  html += renderCollectibleSection(sections.rancidEggs, "Rancid Eggs");
  html += renderCollectibleSection(sections.items, "Items");
  if (!html) return C.emptyState();
  return html;
}
