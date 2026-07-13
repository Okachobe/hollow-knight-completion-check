/* Shared, presentation-free helpers for the Knight's Ledger screen renderers.
   This is a LEAF module (imports nothing from ledger-screens.js) so per-screen
   render modules under ./screens/ can import it without a circular dependency. */

/* Completion RULE A — an entry is "done" if its icon is one of these.
   (True Completion and the 112% game total are DIFFERENT rules — do not use this for them.) */
export const DONE_SET = new Set([
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
 * Is a single entry complete for badge/hiding purposes (rule A)?
 * `disabled` entries are treated as complete (they never appear as outstanding work).
 * @param {object} entry
 * @returns {boolean}
 */
export function isEntryComplete(entry) {
  if (!entry) return false;
  if (entry.disabled === true) return true;
  return DONE_SET.has(entry.icon);
}

/**
 * Count a section's entries under rule A. `disabled` entries are skipped entirely
 * (excluded from BOTH numerator and denominator).
 * @param {object} section a db.sections[key] object
 * @returns {{done:number, total:number}}
 */
export function countRuleA(section) {
  let done = 0;
  let total = 0;
  if (!section || !section.entries) return { done, total };
  const entries = section.entries;
  for (const key in entries) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
    const entry = entries[key];
    if (!entry || entry.disabled === true) continue;
    total++;
    if (DONE_SET.has(entry.icon)) done++;
  }
  return { done, total };
}

/**
 * Sum rule A over several section keys (skipping any that don't exist on the db).
 * @param {object} db the HK singleton
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

/**
 * Strip HTML tags + collapse whitespace from a section description, truncated for a subtitle.
 * @param {string} desc
 * @param {number} max
 * @returns {string}
 */
export function shortText(desc, max = 100) {
  if (!desc) return "";
  const plain = String(desc).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max).trim() + "…";
}

/**
 * Escape a string for safe HTML text interpolation.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
