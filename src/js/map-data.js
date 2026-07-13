/**
 * map-data.js — Cartographer's Atlas data model (region taxonomy, category
 * grouping, and the deterministic entry -> region resolver).
 *
 * DESIGN: The app knows WHAT the player has (from the save) but not WHERE.
 * Rather than ship scraped coordinates or a copyrighted base image, we derive
 * each mappable item's REGION entirely from data the DB already carries:
 *   1. entry.spoiler "Area:" prefix   (authoritative, human-authored labels)
 *   2. a curated by-key table         (items whose location is an NPC/shop or
 *                                       otherwise not encoded as an "Area:")
 *   3. entry.sceneName prefix          (fallback for scened entries w/o a label)
 * The map places each marker into its region ZONE on an original stylized
 * schematic of Hallownest — no third-party map art, no per-point coordinates.
 *
 * This module is PURE data + pure functions (no DOM, no imports). Completion
 * state is read elsewhere via ledger-util.isEntryComplete(entry).
 *
 * To regenerate/verify the marker manifest from the live DB:
 *   node tools/gen-map-data.cjs   (see that script; it re-runs regionForEntry
 *   over HK and reports counts, unresolved entries, and intra-scene conflicts).
 */

/* -------------------------------------------------------------------------- */
/* Canonical regions + their anchor position on the schematic (x,y in %).      */
/* Positions follow Hallownest's in-game geography (surface at top, Abyss at    */
/* the bottom, Greenpath/Queen's Gardens west, Kingdom's Edge/Hive east).       */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{id:string, label:string, x:number, y:number, short:string}} Region
 */

/** @type {Region[]} */
export const REGIONS = [
  { id: "Dirtmouth",            label: "Dirtmouth",            x: 47, y: 5,  short: "Surface & King's Pass" },
  { id: "Howling Cliffs",       label: "Howling Cliffs",       x: 16, y: 15, short: "Windswept western cliffs" },
  { id: "Forgotten Crossroads", label: "Forgotten Crossroads", x: 46, y: 25, short: "The infected hub" },
  { id: "Crystal Peak",         label: "Crystal Peak",         x: 73, y: 18, short: "Glittering mines" },
  { id: "Greenpath",            label: "Greenpath",            x: 17, y: 40, short: "Verdant overgrowth" },
  { id: "Fog Canyon",           label: "Fog Canyon",           x: 35, y: 45, short: "Acid & archives" },
  { id: "Fungal Wastes",        label: "Fungal Wastes",        x: 50, y: 46, short: "Mushroom expanse" },
  { id: "Resting Grounds",      label: "Resting Grounds",      x: 66, y: 37, short: "The dreamers' tomb" },
  { id: "City of Tears",        label: "City of Tears",        x: 62, y: 57, short: "The rain-soaked capital" },
  { id: "Royal Waterways",      label: "Royal Waterways",      x: 55, y: 73, short: "Sewers beneath the city" },
  { id: "Queen's Gardens",      label: "Queen's Gardens",      x: 14, y: 66, short: "Thorned royal groves" },
  { id: "Kingdom's Edge",       label: "Kingdom's Edge",       x: 88, y: 45, short: "The stormy frontier" },
  { id: "Colosseum of Fools",   label: "Colosseum of Fools",   x: 86, y: 26, short: "Trial of warriors" },
  { id: "The Hive",             label: "The Hive",             x: 90, y: 66, short: "Buzzing golden combs" },
  { id: "Deepnest",             label: "Deepnest",             x: 35, y: 74, short: "Lightless spider warren" },
  { id: "Ancient Basin",        label: "Ancient Basin",        x: 60, y: 86, short: "The pale king's ruin" },
  { id: "The Abyss",            label: "The Abyss",            x: 60, y: 96, short: "The birthplace of shades" },
  { id: "White Palace",         label: "White Palace",         x: 15, y: 89, short: "Dream of the pale king" },
  { id: "Godhome",              label: "Godhome",              x: 87, y: 89, short: "The gods' arena (dream)" },
];

/** Set of valid region ids (for validation). */
export const REGION_IDS = new Set(REGIONS.map((r) => r.id));

/* -------------------------------------------------------------------------- */
/* Map categories: user-facing marker groups -> backing db.sections keys.      */
/* Icons reuse the Material Symbols names from the ledger SCREENS registry.     */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{id:string, label:string, icon:string, sections:string[]}} MapCategory
 */

/** @type {MapCategory[]} */
export const CATEGORIES = [
  { id: "grubs",       label: "Grubs",             icon: "bug_report",   sections: ["grubs"] },
  { id: "charms",      label: "Charms",            icon: "auto_awesome", sections: ["charms"] },
  { id: "bosses",      label: "Bosses",            icon: "swords",       sections: ["bosses"] },
  { id: "abilities",   label: "Abilities",         icon: "bolt",         sections: ["equipment"] },
  { id: "spells",      label: "Spells",            icon: "auto_fix_high", sections: ["spells"] },
  { id: "masks",       label: "Mask Shards",       icon: "vibration",    sections: ["maskShards"] },
  { id: "vessels",     label: "Vessel Fragments",  icon: "opacity",      sections: ["vesselFragments"] },
  { id: "roots",       label: "Whispering Roots",  icon: "nature",       sections: ["whisperingRoots"] },
  { id: "relics",      label: "Relics",            icon: "menu_book",    sections: ["relicsWanderersJournal", "relicsHallownestSeal", "relicsKingsIdol", "relicsArcaneEgg"] },
  { id: "geo",         label: "Geo Caches",        icon: "paid",         sections: ["geoChests", "geoRocks"] },
  { id: "eggs",        label: "Rancid Eggs",       icon: "egg",          sections: ["rancidEggs"] },
  { id: "cornifer",    label: "Cornifer's Notes",  icon: "map",          sections: ["corniferNotes"] },
  { id: "secrets",     label: "Secret Rooms",      icon: "lock",         sections: ["secretRooms"] },
  { id: "essentials",  label: "Essentials",        icon: "verified",     sections: ["essentialsCollectibles", "essentialsWorldInteractions", "essentialsBosses"] },
  { id: "world",       label: "World Events",      icon: "toggle_on",    sections: ["worldInteractions"] },
];

/** section key -> category id (built from CATEGORIES). */
export const SECTION_CATEGORY = (() => {
  const m = {};
  for (const c of CATEGORIES) for (const s of c.sections) m[s] = c.id;
  return m;
})();

/** Every section that participates in the map (has at least one mappable entry). */
export const MAPPABLE_SECTIONS = new Set(Object.keys(SECTION_CATEGORY));

/* -------------------------------------------------------------------------- */
/* Resolver tables                                                            */
/* -------------------------------------------------------------------------- */

/** spoiler "Area:" label (text before the first colon) -> canonical region. */
const AREA_NORM = {
  "Forgotten Crossroads": "Forgotten Crossroads",
  "Grubfather": "Forgotten Crossroads",
  "Howling Cliffs": "Howling Cliffs",
  "Greenpath": "Greenpath",
  "Fog Canyon": "Fog Canyon",
  "Fungal Wastes": "Fungal Wastes",
  "Queen's Station": "Fungal Wastes",
  "Queen's Gardens": "Queen's Gardens",
  "Crystal Peak": "Crystal Peak",
  "Resting Grounds": "Resting Grounds",
  "City of Tears": "City of Tears",
  "Royal Waterways": "Royal Waterways",
  "The Hive": "The Hive",
  "Kingdom's Edge": "Kingdom's Edge",
  "Deepnest": "Deepnest",
  "Ancient Basin": "Ancient Basin",
  "Ancient Basin Fountain": "Ancient Basin",
  "The Abyss": "The Abyss",
  "Dirtmouth": "Dirtmouth",
  "Colosseum of Fools": "Colosseum of Fools",
  /* Landmark / alias labels that appear in spoilers but aren't the region name. */
  "King's Pass": "Dirtmouth",
  "Mantis Village": "Fungal Wastes",
  "White Palace": "White Palace",
  "Godhome": "Godhome",
  "Temple of the Black Egg": "Dirtmouth",
};

/**
 * NPC / vendor -> region (the fixed place you travel to for that purchase or
 * reward). Used when a spoiler names a vendor instead of an area, e.g.
 * "Sly: 300 Geo" or "Seer: 500 Essence".
 */
const NPC_NORM = {
  "Sly": "Dirtmouth",
  "Iselda": "Dirtmouth",
  "Iselda's Shop": "Dirtmouth",
  "Divine": "Dirtmouth",
  "Seer": "Resting Grounds",
  "Salubra": "Forgotten Crossroads",
  "Grubfather": "Forgotten Crossroads",
  "Leg Eater": "Fungal Wastes",
  "Nailsmith": "City of Tears",
};

/** Exact sceneName -> region, for scened entries whose spoiler has no "Area:". */
const SCENE_OVERRIDE = {
  Crossroads_04: "Forgotten Crossroads",
  Crossroads_09: "Forgotten Crossroads",
  Crossroads_33: "Forgotten Crossroads",
  Abyss_04: "Ancient Basin",
  Abyss_17: "Ancient Basin",
  Abyss_20: "Ancient Basin",
  Mines_18: "Crystal Peak",
  Mines_30: "Crystal Peak",
  Mines_32: "Crystal Peak",
  Mines_34: "Crystal Peak",
  Deepnest_32: "Deepnest",
  Fungus2_14: "Fungal Wastes",
};

/** sceneName prefix -> DEFAULT region (dominant area; ambiguous scenes resolve
 *  earlier via AREA_NORM/SCENE_OVERRIDE). Longest matching prefix wins. */
const PREFIX_DEFAULT = {
  Tutorial: "Dirtmouth",
  Cliffs: "Howling Cliffs",
  Crossroads: "Forgotten Crossroads",
  Crossroads_ShamanTemple: "Forgotten Crossroads",
  Fungus1: "Greenpath",
  Fungus2: "Fungal Wastes",
  Fungus3: "Queen's Gardens",
  Mines: "Crystal Peak",
  RestingGrounds: "Resting Grounds",
  Ruins1: "City of Tears",
  Ruins2: "City of Tears",
  Ruins_Elevator: "City of Tears",
  Ruins_House: "City of Tears",
  Waterways: "Royal Waterways",
  Hive: "The Hive",
  Deepnest: "Deepnest",
  Deepnest_East: "Kingdom's Edge",
  Deepnest_Spider_Town: "Deepnest",
  Deepnest_45_v02: "Deepnest",
  Abyss: "Ancient Basin",
  Abyss_06_Core: "The Abyss",
  White_Palace: "White Palace",
  Room_Bretta: "Dirtmouth",
  Room_Mansion: "Resting Grounds",
  Room_Fungus_Shaman: "Fog Canyon",
  Room_Colosseum: "Colosseum of Fools",
  Room_Colosseum_Silver: "Colosseum of Fools",
  Room_Colosseum_Spectate: "Colosseum of Fools",
  GG_Waterways: "Royal Waterways",
  GG_Pipeway: "Royal Waterways",
  GG_Lurker: "Kingdom's Edge",
  Room_GG_Shortcut: "Royal Waterways",
  Grimm_Main_Tent: "Dirtmouth",
};

/**
 * Curated region for entries whose location is NOT encoded as a sceneName or an
 * "Area:" spoiler — charms (often bought from an NPC), bosses, abilities and
 * spells. Keyed by "sectionKey/entryKey". Regions read from each entry's own
 * spoiler location text (so the map agrees with what the ledger row says).
 */
const CURATED = {
  /* Charms — region = where the charm is found / which NPC sells it. */
  "charms/gotCharm_1": "Dirtmouth",            // Sly
  "charms/gotCharm_2": "Dirtmouth",            // Iselda
  "charms/gotCharm_3": "Forgotten Crossroads", // Grubfather
  "charms/gotCharm_4": "Dirtmouth",            // Sly
  "charms/gotCharm_5": "Howling Cliffs",
  "charms/gotCharm_6": "Dirtmouth",            // King's Pass
  "charms/gotCharm_7": "Forgotten Crossroads", // Salubra
  "charms/gotCharm_8": "Forgotten Crossroads", // Salubra
  "charms/gotCharm_9": "The Abyss",
  "charms/gotCharm_10": "Royal Waterways",
  "charms/gotCharm_11": "Royal Waterways",
  "charms/gotCharm_12": "Greenpath",
  "charms/gotCharm_13": "Fungal Wastes",       // Mantis Village
  "charms/gotCharm_14": "Forgotten Crossroads", // Salubra
  "charms/gotCharm_15": "Dirtmouth",           // Sly
  "charms/gotCharm_16": "Deepnest",
  "charms/gotCharm_17": "Fungal Wastes",
  "charms/gotCharm_18": "Forgotten Crossroads", // Salubra
  "charms/gotCharm_19": "Forgotten Crossroads", // Salubra
  "charms/gotCharm_20": "Forgotten Crossroads",
  "charms/gotCharm_21": "Resting Grounds",
  "charms/gotCharm_22": "Forgotten Crossroads",
  "charms/gotCharm_23": "Fungal Wastes",       // Leg Eater
  "charms/gotCharm_24": "Fungal Wastes",       // Leg Eater
  "charms/gotCharm_25": "Fungal Wastes",       // Leg Eater
  "charms/gotCharm_26": "Dirtmouth",           // Sly
  "charms/gotCharm_27": "Howling Cliffs",
  "charms/gotCharm_28": "Greenpath",
  "charms/gotCharm_29": "The Hive",
  "charms/gotCharm_30": "Resting Grounds",     // Seer
  "charms/gotCharm_31": "Fungal Wastes",
  "charms/gotCharm_32": "Kingdom's Edge",
  "charms/gotCharm_33": "City of Tears",
  "charms/gotCharm_34": "Crystal Peak",
  "charms/gotCharm_35": "Forgotten Crossroads", // Grubfather
  "charms/gotCharm_36": "Queen's Gardens",     // Kingsoul (also White Palace)

  /* Bosses — region where the boss is fought. */
  "bosses/bossGruzMother": "Forgotten Crossroads",
  "bosses/falseKnightDefeated": "Forgotten Crossroads",
  "bosses/hornet1Defeated": "Greenpath",
  "bosses/defeatedDungDefender": "Royal Waterways",
  "bosses/bossBroodingMawlek": "Forgotten Crossroads",
  "bosses/mageLordDefeated": "City of Tears",
  "bosses/defeatedMantisLords": "Fungal Wastes",
  "bosses/killedMimicSpider": "Deepnest",
  "bosses/killedInfectedKnight": "Ancient Basin",
  "bosses/collectorDefeated": "City of Tears",
  "bosses/defeatedMegaJelly": "Fog Canyon",
  "bosses/hornetOutskirtsDefeated": "Kingdom's Edge",
  "bosses/killedTraitorLord": "Queen's Gardens",
  "bosses/killedBlackKnight": "City of Tears",

  /* Abilities (equipment). */
  "equipment/hasDash": "Greenpath",
  "equipment/hasWalljump": "Fungal Wastes",    // Mantis Village
  "equipment/hasSuperDash": "Crystal Peak",
  "equipment/hasDoubleJump": "Ancient Basin",
  "equipment/hasAcidArmour": "Royal Waterways",
  "equipment/hasKingsBrand": "Kingdom's Edge",
  "equipment/hasShadowDash": "The Abyss",

  /* Spells. */
  "spells/vengefulSpirit": "Forgotten Crossroads",
  "spells/shadeSoul": "City of Tears",
  "spells/desolateDive": "City of Tears",
  "spells/descendingDark": "Crystal Peak",
  "spells/howlingWraiths": "Fog Canyon",
  "spells/abyssShriek": "The Abyss",

  /* Secret rooms whose spoiler names a landmark rather than an area. */
  "secretRooms/killsBindingSeal": "White Palace",
  "secretRooms/whitePalaceSecretRoomVisited": "White Palace",
};

/* -------------------------------------------------------------------------- */
/* Resolution                                                                 */
/* -------------------------------------------------------------------------- */

function scenePrefixRegion(scene) {
  if (!scene) return null;
  const s = String(scene);
  // exact prefix (drop a single trailing _<num>[letter])
  const trimmed = s.replace(/_\d+[a-z]?$/, "");
  if (PREFIX_DEFAULT[trimmed]) return PREFIX_DEFAULT[trimmed];
  // progressively shorter underscore-delimited prefixes (e.g. Abyss_06_Core -> Abyss)
  const parts = s.split("_");
  while (parts.length) {
    const key = parts.join("_");
    if (PREFIX_DEFAULT[key]) return PREFIX_DEFAULT[key];
    parts.pop();
  }
  return null;
}

/** Split a spoiler into candidate location tokens (on ':' and ',') and trim. */
function spoilerTokens(spoiler) {
  if (!spoiler || typeof spoiler !== "string") return [];
  return spoiler.split(/[:,]/).map((t) => t.trim()).filter(Boolean);
}

/** First token that exactly matches a known AREA_NORM label -> its region. */
function areaFromSpoiler(spoiler) {
  for (const tok of spoilerTokens(spoiler)) {
    if (AREA_NORM[tok]) return AREA_NORM[tok];
  }
  return null;
}

/** First token that exactly matches a known vendor -> its region. */
function npcFromSpoiler(spoiler) {
  for (const tok of spoilerTokens(spoiler)) {
    if (NPC_NORM[tok]) return NPC_NORM[tok];
  }
  return null;
}

/**
 * Resolve the map region for an entry, or null if it is not mappable (e.g. a
 * meta count like "46 Grubs total" or a quest trigger with no clear place).
 * Priority: curated by-key -> "Area:" label (colon/comma token) -> vendor/NPC
 * -> exact sceneName override -> sceneName prefix default.
 * @param {string} sectionKey  db.sections key (e.g. "grubs")
 * @param {string} entryKey    entry key within the section (e.g. "grub1")
 * @param {object} entry       the db entry ({sceneName?, spoiler?, ...})
 * @returns {string|null}      a region id from REGION_IDS, or null
 */
export function regionForEntry(sectionKey, entryKey, entry) {
  if (!entry) return null;
  const curated = CURATED[`${sectionKey}/${entryKey}`];
  if (curated) return curated;
  const fromArea = areaFromSpoiler(entry.spoiler);
  if (fromArea) return fromArea;
  const fromNpc = npcFromSpoiler(entry.spoiler);
  if (fromNpc) return fromNpc;
  if (entry.sceneName) {
    if (SCENE_OVERRIDE[entry.sceneName]) return SCENE_OVERRIDE[entry.sceneName];
    const fromPrefix = scenePrefixRegion(entry.sceneName);
    if (fromPrefix) return fromPrefix;
  }
  return null;
}
