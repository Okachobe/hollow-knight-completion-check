/**
 * gen-map-data.cjs — verify/regenerate the Cartographer's Atlas marker manifest.
 *
 * Loads the live HK database and src/js/map-data.js (both ES modules, loaded via
 * a tiny CJS shim), runs regionForEntry() over every entry in every mappable
 * section, and reports:
 *   - the marker manifest (section/key -> region), written to OUT/manifest.json
 *   - per-category coverage (mappable vs. total)
 *   - region distribution
 *   - any entry assigned an unknown region (should be 0)
 *   - intra-scene region conflicts (should be 0)
 *   - unmapped entries in mappable sections (expected: quest triggers / NPC
 *     items with no clear location — listed so they can be eyeballed)
 *
 * Usage: node tools/gen-map-data.cjs [outDir]
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const OUT = process.argv[2] || path.join(os.tmpdir(), "hk-map-gen");
fs.mkdirSync(OUT, { recursive: true });

function loadEsm(relPath, exportNames) {
  let text = fs.readFileSync(path.join(ROOT, relPath), "utf8");
  text = text.replace(/export\s+default\s+(\w+)\s*;?/, "module.exports.default = $1;");
  text = text.replace(/export\s+(const|function|let|var|class)\s+/g, "$1 ");
  if (exportNames && exportNames.length) {
    text += `\nmodule.exports = Object.assign(module.exports, { ${exportNames.join(", ")} });`;
  }
  const tmp = path.join(OUT, "_" + path.basename(relPath).replace(/\W/g, "_") + ".cjs");
  fs.writeFileSync(tmp, text);
  return require(tmp);
}

const HKmod = loadEsm("src/js/hk-database.js");
const HK = HKmod.default;
const MD = loadEsm("src/js/map-data.js", [
  "REGIONS", "REGION_IDS", "CATEGORIES", "SECTION_CATEGORY", "MAPPABLE_SECTIONS", "regionForEntry",
]);

const manifest = [];
const regionCounts = {};
const catCoverage = {};   // catId -> {mappable, total}
const sectionCoverage = {};
const unknownRegion = [];
const unmapped = [];      // entries in mappable sections with no region
const sceneRegion = {};

for (const c of MD.CATEGORIES) catCoverage[c.id] = { label: c.label, mappable: 0, total: 0 };

for (const secKey of MD.MAPPABLE_SECTIONS) {
  const sec = HK.sections[secKey];
  if (!sec || !sec.entries) { console.warn("!! mappable section missing in DB:", secKey); continue; }
  const catId = MD.SECTION_CATEGORY[secKey];
  sectionCoverage[secKey] = { mappable: 0, total: 0 };
  for (const key of Object.keys(sec.entries)) {
    const e = sec.entries[key];
    if (!e || typeof e !== "object") continue;
    catCoverage[catId].total++;
    sectionCoverage[secKey].total++;
    const region = MD.regionForEntry(secKey, key, e);
    if (!region) {
      unmapped.push({ section: secKey, key, name: e.name, sceneName: e.sceneName || null, spoiler: e.spoiler || null });
      continue;
    }
    if (!MD.REGION_IDS.has(region)) unknownRegion.push({ section: secKey, key, region });
    catCoverage[catId].mappable++;
    sectionCoverage[secKey].mappable++;
    regionCounts[region] = (regionCounts[region] || 0) + 1;
    manifest.push({ section: secKey, key, region });
    if (e.sceneName) (sceneRegion[e.sceneName] = sceneRegion[e.sceneName] || new Set()).add(region);
  }
}

const conflicts = Object.entries(sceneRegion).filter(([, set]) => set.size > 1)
  .map(([scene, set]) => ({ scene, regions: [...set] }));

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(OUT, "coverage.json"), JSON.stringify({ catCoverage, sectionCoverage, regionCounts, unmapped }, null, 2));

console.log("== TOTAL MARKERS:", manifest.length, "==");
console.log("\n== per-category coverage (mappable / total) ==");
for (const c of MD.CATEGORIES) {
  const cc = catCoverage[c.id];
  console.log(`${c.label.padEnd(20)} ${String(cc.mappable).padStart(3)} / ${String(cc.total).padStart(3)}`);
}
console.log("\n== region distribution ==");
for (const [r, n] of Object.entries(regionCounts).sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(4), r);
console.log("\n== unknown regions (MUST be 0):", unknownRegion.length, "==");
unknownRegion.forEach((u) => console.log("  ", u));
console.log("\n== intra-scene conflicts (MUST be 0):", conflicts.length, "==");
conflicts.forEach((c) => console.log("  ", c.scene, "->", c.regions.join(" | ")));
console.log(`\n== UNMAPPED entries in mappable sections: ${unmapped.length} (quest/NPC/no-location — review) ==`);
for (const u of unmapped) console.log(`  ${u.section}/${u.key}  scene=${u.sceneName || "-"}  ${JSON.stringify(u.spoiler)}`);
