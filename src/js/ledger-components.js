/**
 * ledger-components.js — Knight's Ledger shared component library.
 *
 * PURE functions that return HTML strings. NO DOM access, NO side effects.
 * The screen renderers (page-functions.js and per-screen authors) consume
 * these to build the single `#generated.innerHTML` string.
 *
 * AUTHORING CONTRACT (see DESIGN-MAP §3 / tailwind.config.js):
 *  - Every Tailwind class is a COMPLETE static string literal so the build-time
 *    content scanner (globs ./src/**\/*.{html,js}) keeps it. Ternaries choose
 *    between full class strings — never concatenate/interpolate class fragments.
 *  - The ONLY runtime-computed values (progress width %, gauge rotation) are
 *    emitted as inline `style="width:NN%"` — never as `w-[NN%]`.
 *  - Icons are Material Symbols Outlined with an inline FILL variation setting.
 *  - Dark theme only; tokens come from tailwind.config.js (no invented colors).
 *  - Custom classes (.relic-border/.card-glow/.badge-glow/.progress-bar-glow/
 *    .text-gradient-pale-ore/.fleur-divider/.relic-glow/.pulse-ambient and the
 *    spoiler/.wiki contract) live in src/css/tailwind.css and are never purged.
 */

export const WIKI = "https://hollowknight.fandom.com/wiki/";

/**
 * Material Symbols Outlined glyph.
 * @param {string} name     ligature name (e.g. "swords")
 * @param {0|1}    fill     FILL axis (1 = active/complete)
 * @param {string} extraClass additional complete class-string literals
 * @returns {string}
 */
export function sym(name, fill = 0, extraClass = "") {
  const fillVal = fill ? 1 : 0;
  const cls = extraClass ? `material-symbols-outlined ${extraClass}` : "material-symbols-outlined";
  return `<span class="${cls}" style="font-variation-settings:'FILL' ${fillVal};">${name}</span>`;
}

/**
 * Canonical progress bar. Track is fixed; fill width is an inline style.
 * @param {number|null} pct     0-100 (clamped). Returns "" only when null.
 * @param {"amber"|"teal"} variant fill color
 * @returns {string}
 */
export function progressBar(pct, variant = "amber") {
  if (pct === null) return "";
  let n = Number(pct);
  if (!Number.isFinite(n)) n = 0;
  if (n < 0) n = 0;
  if (n > 100) n = 100;
  // Full static class literals per variant (never interpolate the color token).
  const fillClass =
    variant === "teal"
      ? "h-full bg-tertiary-container progress-bar-glow"
      : "h-full bg-secondary-container progress-bar-glow";
  return (
    `<div class="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">` +
    `<div class="${fillClass}" style="width:${n}%"></div>` +
    `</div>`
  );
}

/**
 * Sidebar count badge. Empty string when total is falsy (e.g. Statistics).
 * @returns {string}
 */
export function navBadge(done, total) {
  if (!total) return "";
  return `<span class="ml-auto font-code-path text-xs text-secondary-container badge-glow">[${done}/${total}]</span>`;
}

/**
 * Card / section-header count pill. Single value when total is falsy.
 * @returns {string}
 */
export function pill(done, total) {
  const label = total ? `[${done}/${total}]` : `${done}`;
  return `<span class="font-code-path text-secondary-container bg-surface-glow px-2 py-1 rounded border border-border-dim">${label}</span>`;
}

/**
 * Standard section header: title (+ optional subtitle) left, count pill right.
 * @param {{title:string, subtitle?:string, done?:number|null, total?:number|null}} opts
 * @returns {string}
 */
export function sectionHeader({ title, subtitle = "", done = null, total = null }) {
  const subtitleHtml = subtitle
    ? `<p class="font-label-sm text-lichen-blue">${subtitle}</p>`
    : "";
  const right = total != null ? pill(done, total) : "";
  return (
    `<div class="flex justify-between items-end mb-lg">` +
    `<div><h2 class="font-headline-md text-headline-md text-on-surface relic-glow">${title}</h2>${subtitleHtml}</div>` +
    `<div>${right}</div>` +
    `</div>`
  );
}

/**
 * Centered fleur divider (hive glyph flanked by rules). Optional heading after.
 * @param {string} title
 * @returns {string}
 */
export function fleurDivider(title = "") {
  const divider =
    `<div class="fleur-divider my-lg">` +
    sym("hive", 1, "text-secondary-container pulse-ambient") +
    `</div>`;
  const heading = title
    ? `<h3 class="font-headline-md text-headline-md text-center text-primary-container mb-xl drop-shadow-md">${title}</h3>`
    : "";
  return divider + heading;
}

/**
 * Dashboard overall-progress hero (rule C game-% + rule B true-completion).
 * @param {{percent?:number, maxPercent?:number, trueDone?:number, trueTotal?:number, analyzed?:boolean}} opts
 * @returns {string}
 */
export function hero({ percent = 0, maxPercent = 112, trueDone = 0, trueTotal = 0, analyzed = false }) {
  void analyzed;
  const truePct = trueTotal ? ((trueDone / trueTotal) * 100).toFixed(2) : "0.00";
  return (
    `<section class="mb-section-gap">` +
      `<div class="bg-surface/85 backdrop-blur-xl border-2 border-border-dim rounded-xl p-lg relative overflow-hidden group hover:border-secondary-container/50 transition-colors duration-500 relic-border">` +
        `<div class="absolute inset-0 bg-surface-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"></div>` +
        `<div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-lg">` +
          `<div class="text-center md:text-left">` +
            `<h3 class="font-headline-md text-headline-md text-primary mb-xs">Total Completion</h3>` +
            `<p class="font-body-base text-lichen-blue">Your journey through Hallownest.</p>` +
          `</div>` +
          `<div class="flex items-center gap-md">` +
            `<div class="text-right">` +
              `<span class="font-display-lg text-display-lg text-gradient-pale-ore block leading-none">${percent}%</span>` +
              `<span class="font-caption text-caption text-outline">${maxPercent}% Maximum</span>` +
            `</div>` +
            `<div class="w-16 h-16 rounded-full border-4 border-surface-container-high flex items-center justify-center relative">` +
              `<div class="absolute inset-0 rounded-full border-4 border-secondary-container border-t-transparent border-r-transparent progress-bar-glow" style="transform:rotate(-45deg)"></div>` +
              sym("incomplete_circle", 1, "text-secondary-container") +
            `</div>` +
          `</div>` +
        `</div>` +
        `<div class="relative z-10 flex justify-between items-center mt-lg pt-md border-t border-border-dim">` +
          `<span class="font-label-sm text-lichen-blue">True Completion</span>` +
          `<span class="font-code-path text-secondary-container">[${trueDone}/${trueTotal}] ${truePct}%</span>` +
        `</div>` +
      `</div>` +
      fleurDivider() +
    `</section>`
  );
}

/**
 * Bento category summary card (Dashboard). Whole card carries data-screen-link
 * so the router makes it clickable.
 * @param {{icon:string, label:string, screen:string, done?:number, total?:number, analyzed?:boolean}} opts
 * @returns {string}
 */
export function categoryCard({ icon, label, screen, done = 0, total = 0, analyzed = false }) {
  void analyzed;
  const isComplete = done === total && total > 0;
  const iconSpan = sym(
    icon,
    isComplete ? 1 : 0,
    "text-primary text-3xl group-hover:text-secondary-container transition-colors"
  );
  const remaining = total - done;
  const countBlock =
    isComplete || remaining <= 0
      ? `<span class="font-body-bold text-lg text-on-surface">${done}/${total}</span>`
      : `<div class="text-right">` +
        `<span class="font-body-bold text-lg text-on-surface block leading-none">${done}/${total}</span>` +
        `<span class="text-sm text-outline-variant font-caption mt-1 block">${remaining} Remaining</span>` +
        `</div>`;
  const barPct = total ? (done / total) * 100 : 0;
  return (
    `<div class="bg-surface/85 backdrop-blur-xl border border-border-dim rounded-lg p-md card-glow transition-all duration-300 relative overflow-hidden group cursor-pointer border-t-2 border-t-secondary-container/30" data-screen-link="${screen}">` +
      `<div class="flex justify-between items-start mb-md">${iconSpan}${countBlock}</div>` +
      `<h4 class="font-headline-md text-lg text-primary mb-sm">${label}</h4>` +
      progressBar(barPct) +
    `</div>`
  );
}

/**
 * Bracketed monospace status token (DESIGN-MAP §3.12).
 * @param {string} label
 * @param {"complete"|"locked"|"unseen"|"sealed"|"broken"} kind
 * @returns {string}
 */
export function statusBadge(label, kind = "complete") {
  let cls;
  switch (kind) {
    case "locked":
      cls = "font-code-path text-caption text-lichen-blue px-sm py-xs rounded bg-surface-glow border border-border-dim";
      break;
    case "unseen":
      cls = "font-code-path text-caption text-surface-variant line-through px-sm py-xs rounded bg-surface-glow border border-border-dim";
      break;
    case "sealed":
      cls = "font-code-path text-caption text-danger-scarlet px-sm py-xs rounded bg-danger-scarlet/10 border border-danger-scarlet/30";
      break;
    case "broken":
      cls = "font-code-path text-caption text-success-green px-sm py-xs rounded bg-success-green/10 border border-success-green/30";
      break;
    case "complete":
    default:
      cls = "font-code-path text-caption text-secondary-container px-sm py-xs rounded bg-surface-glow border border-secondary-container/30";
      break;
  }
  return `<span class="${cls}">[${label}]</span>`;
}

/**
 * Generic entry row + the spoiler/blur contract carrier.
 * Emits the .single-entry/.completed-item/.incomplete-item/.spoiler-span/
 * .spoiler-span-green/.spoiler-text/.spoiler-red/.blurred/.wiki classes that
 * the existing toggle logic (page-functions.js) requires verbatim.
 * @param {{icon?:string, img?:string, name:string, meta?:string, statusLabel?:string,
 *          complete?:boolean, spoiler?:string, wiki?:string, spoilerHtml?:boolean}} opts
 * @returns {string}
 */
export function listRow({
  icon = "",
  img = "",
  name,
  meta = "",
  statusLabel = "",
  complete = false,
  spoiler = "",
  wiki = "",
  spoilerHtml = true,
}) {
  const rowClass = complete
    ? "single-entry completed-item bg-surface-container/85 backdrop-blur-md border border-border-dim border-t-2 border-t-success-green/30 rounded-lg p-sm flex items-center gap-md hover:bg-surface-container-high transition-colors"
    : "single-entry incomplete-item bg-surface-container/85 backdrop-blur-md border border-border-dim border-t-2 border-t-danger-scarlet/30 rounded-lg p-sm flex items-center gap-md hover:bg-surface-container-high transition-colors";

  // Optional left thumbnail: image (with glyph fallback) or a plain glyph.
  let thumb = "";
  if (img) {
    const fallbackGlyph = sym(icon || "help_center", 0, "text-outline text-2xl");
    thumb =
      `<div class="w-12 h-12 rounded border border-border-dim overflow-hidden relative flex items-center justify-center shrink-0">` +
      `<img src="${img}" class="w-12 h-12 rounded object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>` +
      `<span class="w-12 h-12 items-center justify-center absolute inset-0" style="display:none">${fallbackGlyph}</span>` +
      `</div>`;
  } else if (icon) {
    thumb = sym(icon, complete ? 1 : 0, "text-primary text-2xl shrink-0");
  }

  // Name: wiki link (blurred + spoiler-red when not complete) or plain bold.
  let nameHtml;
  if (wiki) {
    const linkClass = complete ? "wiki" : "wiki spoiler-red blurred";
    nameHtml = `<a class="${linkClass}" href="${WIKI}${wiki}" target="_blank" rel="noopener">${name}</a>`;
  } else {
    nameHtml = `<b>${name}</b>`;
  }

  const metaHtml = meta
    ? `<p class="font-caption text-caption text-lichen-blue">${meta}</p>`
    : "";

  // Spoiler suffix — raw HTML injection when spoilerHtml (descriptions contain markup).
  let spoilerHtmlStr = "";
  if (spoiler) {
    const spanClass = complete ? "spoiler-span-green" : "spoiler-span blurred";
    const spoilerContent = spoilerHtml ? spoiler : escapeHtml(spoiler);
    spoilerHtmlStr =
      ` <span class="${spanClass}"><span class="spoiler-text">— ${spoilerContent}</span></span>`;
  }

  const statusHtml = statusLabel
    ? `<div class="ml-auto shrink-0">${statusBadge(statusLabel, complete ? "complete" : "locked")}</div>`
    : "";

  return (
    `<div class="${rowClass}">` +
      thumb +
      `<div class="flex-grow min-w-0">` +
        `<h4 class="font-body-bold text-on-surface">${nameHtml}${spoilerHtmlStr}</h4>` +
        metaHtml +
      `</div>` +
      statusHtml +
    `</div>`
  );
}

/**
 * Boss portrait card (DESIGN-MAP §3.8). Defeated => image + skull badge;
 * not defeated => locked "Unknown Entity" card. Carries .single-entry +
 * completed-item/incomplete-item so filters/spoiler toggles still apply.
 * @param {{name:string, desc?:string, img?:string, wiki?:string, defeated?:boolean}} opts
 * @returns {string}
 */
export function bossCard({ name, desc = "", img = "", wiki = "", defeated = false }) {
  if (defeated) {
    const skullFallback = sym("skull", 1, "text-outline text-[48px] opacity-40");
    const media = img
      ? `<div class="h-32 bg-surface-container-lowest relative">` +
          `<img src="${img}" class="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity grayscale-[50%]" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>` +
          `<div class="w-full h-full items-center justify-center" style="display:none">${skullFallback}</div>` +
          `<div class="absolute inset-0 bg-gradient-to-t from-surface-container/90 to-transparent"></div>` +
        `</div>`
      : `<div class="h-32 bg-surface-container-lowest relative flex items-center justify-center">` +
          skullFallback +
          `<div class="absolute inset-0 bg-gradient-to-t from-surface-container/90 to-transparent"></div>` +
        `</div>`;
    const nameHtml = wiki
      ? `<a class="wiki" href="${WIKI}${wiki}" target="_blank" rel="noopener">${name}</a>`
      : `<b>${name}</b>`;
    const descHtml = desc
      ? `<p class="font-caption text-caption text-lichen-blue line-clamp-2"><span class="spoiler-span-green"><span class="spoiler-text">${desc}</span></span></p>`
      : "";
    return (
      `<div class="single-entry completed-item bg-surface-container/85 backdrop-blur-md border-t-2 border-t-secondary-container/30 border-x border-b border-border-dim rounded-lg overflow-hidden flex flex-col group hover:bg-surface-container-high transition-colors relative">` +
        media +
        `<div class="absolute top-2 right-2 bg-surface-glow border border-secondary-container/50 text-secondary-container px-2 py-1 rounded-full flex items-center gap-1 shadow-glow backdrop-blur-md">` +
          sym("skull", 1, "text-[14px]") +
        `</div>` +
        `<div class="p-md"><h4 class="font-body-bold text-on-surface">${nameHtml}</h4>${descHtml}</div>` +
      `</div>`
    );
  }

  // Locked / undiscovered.
  const lockedDesc = desc
    ? `<p class="text-outline-variant"><span class="spoiler-span blurred"><span class="spoiler-text">${desc}</span></span></p>`
    : `<p class="text-outline-variant">Lurking in the deepnest shadows...</p>`;
  return (
    `<div class="single-entry incomplete-item bg-surface-container/40 backdrop-blur-md border border-border-dim rounded-lg overflow-hidden flex flex-col relative opacity-70 grayscale">` +
      `<div class="h-32 flex items-center justify-center">` +
        sym("help_center", 0, "text-outline text-[48px] opacity-20") +
      `</div>` +
      `<div class="p-md bg-surface-container/50">` +
        `<h4 class="font-body-bold text-outline mb-xs italic">Unknown Entity</h4>` +
        lockedDesc +
      `</div>` +
    `</div>`
  );
}

/**
 * Centered empty-state prompt (locked-card idiom).
 * @param {string} msg
 * @returns {string}
 */
export function emptyState(msg = "Load your save file to begin") {
  return (
    `<div class="bg-surface-container/40 backdrop-blur-md border border-border-dim rounded-xl p-xl flex flex-col items-center justify-center text-center gap-md opacity-80">` +
      sym("help_center", 0, "text-outline text-[48px] opacity-30") +
      `<p class="font-headline-md text-headline-md text-outline italic">${msg}</p>` +
    `</div>`
  );
}

/* -------------------------------------------------------------------------- */
/* internal helper (not exported)                                             */
/* -------------------------------------------------------------------------- */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
