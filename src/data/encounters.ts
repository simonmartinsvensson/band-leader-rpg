// Data-driven random-encounter zones (the band-leader take on "tall grass").
// A map's encounter region object references a zone by id (its `zone` property).

export interface EncounterZone {
  /** Per-step chance (0..1) to trigger an encounter while standing in the zone. */
  rate: number;
  /** Inclusive level range for encountered musicians. */
  minLevel: number;
  maxLevel: number;
  /** Common pool of species ids (from src/data/species.ts) that appear here. */
  musicians: string[];
  /** Optional rarer pool, rolled with `rareChance` instead of the common pool. */
  rare?: string[];
  /** Chance (0..1) a triggered encounter draws from `rare` (default RARE_CHANCE). */
  rareChance?: number;
}

/** Default odds that a triggered encounter comes from a zone's `rare` pool. */
export const RARE_CHANCE = 0.15;

export const ENCOUNTER_ZONES: Record<string, EncounterZone> = {
  // Downtown busking — the first, low-tier mix of jazz/folk/funk newcomers.
  busking_street: {
    rate: 0.5,
    minLevel: 5,
    maxLevel: 8,
    musicians: ["grooveling", "crooner", "balladeer", "scatling", "hummer", "bopling"],
    rare: ["bebopper", "troubadyl", "vibraphan"],
  },
  // The riverside park, between town and the warehouse venue. A step up in level
  // from the busking street, and home to the counters for the electronic venue:
  // Funkadel (funk) and Sonatina (classical) both hit electronic for 2x. The
  // rare pool surfaces the electronic sound creeping over from the warehouse.
  park_path: {
    rate: 0.45,
    minLevel: 9,
    maxLevel: 12,
    musicians: ["amplifret", "funkadel", "sonatina", "wanderlay"],
    rare: ["bitling", "groovile", "synthwave", "glitchard", "modulord", "technotron"],
  },
  // --- Genre-district routes (opened by residency gates from town) ---
  // Rock Strip + Folk Riverside open after the Jazz Residency (player ~Lv9-12).
  rock_route: {
    rate: 0.4,
    minLevel: 9,
    maxLevel: 13,
    musicians: ["rifflet", "amplifret", "garageling", "moshling"],
    rare: ["voltaxe", "distortia", "rifflord", "crowdsurf"],
  },
  folk_route: {
    rate: 0.4,
    minLevel: 9,
    maxLevel: 13,
    musicians: ["balladeer", "wanderlay", "hummer", "troubadyl", "mandolyn", "balladine"],
    rare: ["hymnal", "nocturne", "saxophar", "driftwood"],
  },
  // Funk Block + Classical Hall open after the Warehouse (electronic) Residency
  // (player ~Lv13+), so their pools run a tier higher.
  funk_route: {
    rate: 0.4,
    minLevel: 13,
    maxLevel: 17,
    musicians: ["grooveling", "funkadel", "fusionaut", "slapdash", "groovile"],
    rare: ["distortia", "dubwave", "bassquatch", "discola", "crowdsurf"],
  },
  classical_route: {
    rate: 0.4,
    minLevel: 13,
    maxLevel: 17,
    musicians: ["maestrel", "sonatina", "orchestron", "etudel"],
    rare: ["cadenza", "nocturne", "concerta", "choralis", "maestoso"],
  },
};

export function getEncounterZone(id: string): EncounterZone | undefined {
  return ENCOUNTER_ZONES[id];
}
