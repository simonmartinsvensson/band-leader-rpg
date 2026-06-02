import type { MusicianSpecies } from "../types/musician";

/**
 * Starter musician species, one per genre plus two dual-genre rarities. Base
 * stats follow the band-leader block: stamina / skill / composure / tempo.
 * Learnset technique ids must exist in src/data/techniques.ts.
 */
export const SPECIES: Record<string, MusicianSpecies> = {
  rifflet: {
    id: "rifflet",
    name: "Rifflet",
    genres: ["rock"],
    baseStats: { stamina: 45, skill: 60, composure: 40, tempo: 55 },
    learnset: { 1: ["power_chord"], 5: ["stage_dive"] },
    recruitDifficulty: 0.2,
  },
  crooner: {
    id: "crooner",
    name: "Crooner",
    genres: ["jazz"],
    baseStats: { stamina: 50, skill: 55, composure: 50, tempo: 45 },
    learnset: { 1: ["blue_note"], 6: ["improv_solo"] },
    recruitDifficulty: 0.3,
  },
  maestrel: {
    id: "maestrel",
    name: "Maestrel",
    genres: ["classical"],
    baseStats: { stamina: 55, skill: 50, composure: 65, tempo: 35 },
    learnset: { 1: ["sonata"], 4: ["crescendo"] },
    recruitDifficulty: 0.4,
  },
  grooveling: {
    id: "grooveling",
    name: "Grooveling",
    genres: ["funk"],
    baseStats: { stamina: 50, skill: 55, composure: 45, tempo: 60 },
    learnset: { 1: ["groove_lock"], 5: ["slap_bass"] },
    recruitDifficulty: 0.3,
  },
  synthling: {
    id: "synthling",
    name: "Synthling",
    genres: ["electronic"],
    baseStats: { stamina: 40, skill: 65, composure: 35, tempo: 70 },
    learnset: { 1: ["sync_pulse"], 7: ["drop"] },
    recruitDifficulty: 0.5,
  },
  balladeer: {
    id: "balladeer",
    name: "Balladeer",
    genres: ["folk"],
    baseStats: { stamina: 60, skill: 45, composure: 55, tempo: 40 },
    learnset: { 1: ["fingerpick"], 4: ["campfire_song"] },
    recruitDifficulty: 0.2,
  },
  fusionaut: {
    id: "fusionaut",
    name: "Fusionaut",
    genres: ["jazz", "funk"],
    baseStats: { stamina: 55, skill: 60, composure: 50, tempo: 55 },
    learnset: { 1: ["blue_note"], 5: ["groove_lock"], 9: ["improv_solo"] },
    recruitDifficulty: 0.6,
  },
  orchestron: {
    id: "orchestron",
    name: "Orchestron",
    genres: ["classical", "electronic"],
    baseStats: { stamina: 60, skill: 70, composure: 60, tempo: 50 },
    learnset: { 1: ["sonata"], 6: ["sync_pulse"], 10: ["drop"] },
    recruitDifficulty: 0.8,
  },
  // --- Second-wave species (busking park pool + the warehouse venue) ---------
  amplifret: {
    id: "amplifret",
    name: "Amplifret",
    genres: ["rock"],
    baseStats: { stamina: 50, skill: 62, composure: 44, tempo: 50 },
    learnset: { 1: ["power_chord"], 5: ["feedback_wail"], 9: ["stage_dive"] },
    recruitDifficulty: 0.25,
  },
  funkadel: {
    id: "funkadel",
    name: "Funkadel",
    genres: ["funk"],
    baseStats: { stamina: 54, skill: 58, composure: 50, tempo: 56 },
    learnset: { 1: ["groove_lock"], 5: ["slap_bass"], 9: ["drop_the_one"] },
    recruitDifficulty: 0.35,
  },
  sonatina: {
    id: "sonatina",
    name: "Sonatina",
    genres: ["classical"],
    baseStats: { stamina: 56, skill: 54, composure: 64, tempo: 40 },
    learnset: { 1: ["sonata"], 4: ["crescendo"], 8: ["fugue"] },
    recruitDifficulty: 0.4,
  },
  wanderlay: {
    id: "wanderlay",
    name: "Wanderlay",
    genres: ["folk"],
    baseStats: { stamina: 62, skill: 50, composure: 56, tempo: 40 },
    learnset: { 1: ["fingerpick"], 4: ["campfire_song"], 8: ["hoedown"] },
    recruitDifficulty: 0.25,
  },
  voltaxe: {
    id: "voltaxe",
    name: "Voltaxe",
    genres: ["electronic", "rock"],
    baseStats: { stamina: 54, skill: 66, composure: 46, tempo: 62 },
    learnset: { 1: ["sync_pulse"], 5: ["power_chord"], 9: ["drop"], 12: ["feedback_wail"] },
    recruitDifficulty: 0.7,
  },
  synthrax: {
    id: "synthrax",
    name: "Synthrax",
    genres: ["electronic"],
    baseStats: { stamina: 52, skill: 70, composure: 50, tempo: 64 },
    learnset: { 1: ["sync_pulse"], 6: ["sidechain"], 10: ["drop"] },
    recruitDifficulty: 0.75,
  },

  // === Roster expansion, batch 1: commons + uncommons across every genre, for
  // the early districts' encounter pools (see src/data/encounters.ts). ===
  // Rock
  garageling: { id: "garageling", name: "Garageling", genres: ["rock"], baseStats: { stamina: 48, skill: 58, composure: 42, tempo: 48 }, learnset: { 1: ["garage_riff"], 4: ["power_chord"], 8: ["feedback_wail"] }, recruitDifficulty: 0.2 },
  moshling: { id: "moshling", name: "Moshling", genres: ["rock"], baseStats: { stamina: 52, skill: 58, composure: 40, tempo: 52 }, learnset: { 1: ["garage_riff"], 5: ["power_chord"], 9: ["stage_dive"] }, recruitDifficulty: 0.25 },
  distortia: { id: "distortia", name: "Distortia", genres: ["rock"], baseStats: { stamina: 52, skill: 64, composure: 46, tempo: 54 }, learnset: { 1: ["power_chord"], 6: ["feedback_wail"], 11: ["wall_of_sound"] }, recruitDifficulty: 0.4 },
  // Folk
  hummer: { id: "hummer", name: "Hummer", genres: ["folk"], baseStats: { stamina: 58, skill: 44, composure: 54, tempo: 38 }, learnset: { 1: ["strum"], 4: ["fingerpick"], 7: ["campfire_song"] }, recruitDifficulty: 0.2 },
  troubadyl: { id: "troubadyl", name: "Troubadyl", genres: ["folk"], baseStats: { stamina: 60, skill: 48, composure: 54, tempo: 40 }, learnset: { 1: ["fingerpick"], 4: ["strum"], 8: ["hoedown"] }, recruitDifficulty: 0.25 },
  hymnal: { id: "hymnal", name: "Hymnal", genres: ["folk", "classical"], baseStats: { stamina: 58, skill: 48, composure: 62, tempo: 38 }, learnset: { 1: ["strum"], 5: ["fingerpick"], 9: ["arpeggio"] }, recruitDifficulty: 0.45 },
  // Funk
  bopling: { id: "bopling", name: "Bopling", genres: ["funk"], baseStats: { stamina: 50, skill: 54, composure: 44, tempo: 58 }, learnset: { 1: ["clavinet"], 5: ["groove_lock"] }, recruitDifficulty: 0.25 },
  slapdash: { id: "slapdash", name: "Slapdash", genres: ["funk"], baseStats: { stamina: 52, skill: 56, composure: 46, tempo: 56 }, learnset: { 1: ["clavinet"], 5: ["slap_bass"] }, recruitDifficulty: 0.3 },
  groovile: { id: "groovile", name: "Groovile", genres: ["funk"], baseStats: { stamina: 54, skill: 58, composure: 48, tempo: 58 }, learnset: { 1: ["groove_lock"], 6: ["slap_bass"], 11: ["p_funk"] }, recruitDifficulty: 0.4 },
  // Jazz
  scatling: { id: "scatling", name: "Scatling", genres: ["jazz"], baseStats: { stamina: 50, skill: 54, composure: 50, tempo: 46 }, learnset: { 1: ["comping"], 5: ["blue_note"] }, recruitDifficulty: 0.3 },
  bebopper: { id: "bebopper", name: "Bebopper", genres: ["jazz"], baseStats: { stamina: 48, skill: 58, composure: 48, tempo: 50 }, learnset: { 1: ["comping"], 5: ["syncopation"], 9: ["improv_solo"] }, recruitDifficulty: 0.35 },
  nocturne: { id: "nocturne", name: "Nocturne", genres: ["jazz"], baseStats: { stamina: 52, skill: 58, composure: 54, tempo: 46 }, learnset: { 1: ["blue_note"], 6: ["syncopation"], 11: ["trading_fours"] }, recruitDifficulty: 0.45 },
  // Classical
  etudel: { id: "etudel", name: "Etudel", genres: ["classical"], baseStats: { stamina: 54, skill: 48, composure: 62, tempo: 36 }, learnset: { 1: ["arpeggio"], 5: ["sonata"] }, recruitDifficulty: 0.3 },
  cadenza: { id: "cadenza", name: "Cadenza", genres: ["classical"], baseStats: { stamina: 56, skill: 54, composure: 64, tempo: 40 }, learnset: { 1: ["arpeggio"], 6: ["fugue"], 11: ["grand_finale"] }, recruitDifficulty: 0.45 },
  // Electronic
  bitling: { id: "bitling", name: "Bitling", genres: ["electronic"], baseStats: { stamina: 42, skill: 62, composure: 38, tempo: 66 }, learnset: { 1: ["bitcrush"], 6: ["sync_pulse"] }, recruitDifficulty: 0.4 },
  dubwave: { id: "dubwave", name: "Dubwave", genres: ["electronic"], baseStats: { stamina: 46, skill: 66, composure: 42, tempo: 64 }, learnset: { 1: ["bitcrush"], 6: ["sync_pulse"], 11: ["wobble_bass"] }, recruitDifficulty: 0.55 },

  // === Roster expansion, batch 2: late-tier + dual-genre depth (rares in the
  // higher zones; see src/data/encounters.ts). ===
  // Rock
  rifflord: { id: "rifflord", name: "Rifflord", genres: ["rock"], baseStats: { stamina: 54, skill: 66, composure: 46, tempo: 56 }, learnset: { 1: ["power_chord"], 6: ["feedback_wail"], 11: ["wall_of_sound"] }, recruitDifficulty: 0.5 },
  crowdsurf: { id: "crowdsurf", name: "Crowdsurf", genres: ["rock", "funk"], baseStats: { stamina: 52, skill: 60, composure: 46, tempo: 58 }, learnset: { 1: ["garage_riff"], 5: ["slap_bass"], 9: ["stage_dive"] }, recruitDifficulty: 0.55 },
  // Jazz
  vibraphan: { id: "vibraphan", name: "Vibraphan", genres: ["jazz"], baseStats: { stamina: 52, skill: 56, composure: 52, tempo: 48 }, learnset: { 1: ["comping"], 5: ["blue_note"], 9: ["trading_fours"] }, recruitDifficulty: 0.4 },
  saxophar: { id: "saxophar", name: "Saxophar", genres: ["jazz"], baseStats: { stamina: 54, skill: 62, composure: 50, tempo: 52 }, learnset: { 1: ["blue_note"], 6: ["improv_solo"], 11: ["trading_fours"] }, recruitDifficulty: 0.55 },
  driftwood: { id: "driftwood", name: "Driftwood", genres: ["folk", "jazz"], baseStats: { stamina: 56, skill: 52, composure: 54, tempo: 46 }, learnset: { 1: ["fingerpick"], 5: ["comping"], 9: ["blue_note"] }, recruitDifficulty: 0.5 },
  // Classical
  concerta: { id: "concerta", name: "Concerta", genres: ["classical"], baseStats: { stamina: 58, skill: 56, composure: 66, tempo: 40 }, learnset: { 1: ["sonata"], 6: ["fugue"], 11: ["grand_finale"] }, recruitDifficulty: 0.55 },
  choralis: { id: "choralis", name: "Choralis", genres: ["classical", "folk"], baseStats: { stamina: 58, skill: 50, composure: 64, tempo: 40 }, learnset: { 1: ["arpeggio"], 6: ["fugue"], 11: ["barn_burner"] }, recruitDifficulty: 0.5 },
  maestoso: { id: "maestoso", name: "Maestoso", genres: ["classical"], baseStats: { stamina: 60, skill: 56, composure: 68, tempo: 38 }, learnset: { 1: ["sonata"], 6: ["fugue"], 11: ["grand_finale"] }, recruitDifficulty: 0.6 },
  // Funk
  bassquatch: { id: "bassquatch", name: "Bassquatch", genres: ["funk"], baseStats: { stamina: 56, skill: 60, composure: 48, tempo: 58 }, learnset: { 1: ["slap_bass"], 6: ["drop_the_one"], 11: ["p_funk"] }, recruitDifficulty: 0.5 },
  discola: { id: "discola", name: "Discola", genres: ["funk", "electronic"], baseStats: { stamina: 50, skill: 60, composure: 44, tempo: 62 }, learnset: { 1: ["clavinet"], 5: ["sync_pulse"], 9: ["drop_the_one"] }, recruitDifficulty: 0.55 },
  // Folk
  mandolyn: { id: "mandolyn", name: "Mandolyn", genres: ["folk"], baseStats: { stamina: 60, skill: 48, composure: 56, tempo: 40 }, learnset: { 1: ["strum"], 5: ["fingerpick"], 9: ["barn_burner"] }, recruitDifficulty: 0.3 },
  balladine: { id: "balladine", name: "Balladine", genres: ["folk"], baseStats: { stamina: 62, skill: 50, composure: 58, tempo: 42 }, learnset: { 1: ["fingerpick"], 6: ["hoedown"], 11: ["barn_burner"] }, recruitDifficulty: 0.45 },
  // Electronic
  synthwave: { id: "synthwave", name: "Synthwave", genres: ["electronic"], baseStats: { stamina: 46, skill: 64, composure: 42, tempo: 62 }, learnset: { 1: ["bitcrush"], 6: ["sync_pulse"], 11: ["drop"] }, recruitDifficulty: 0.5 },
  glitchard: { id: "glitchard", name: "Glitchard", genres: ["electronic"], baseStats: { stamina: 44, skill: 66, composure: 40, tempo: 66 }, learnset: { 1: ["sync_pulse"], 6: ["bitcrush"], 11: ["wobble_bass"] }, recruitDifficulty: 0.55 },
  modulord: { id: "modulord", name: "Modulord", genres: ["electronic"], baseStats: { stamina: 50, skill: 68, composure: 46, tempo: 64 }, learnset: { 1: ["sync_pulse"], 6: ["sidechain"], 11: ["drop"] }, recruitDifficulty: 0.7 },
  technotron: { id: "technotron", name: "Technotron", genres: ["electronic", "classical"], baseStats: { stamina: 52, skill: 66, composure: 50, tempo: 58 }, learnset: { 1: ["sync_pulse"], 6: ["arpeggio"], 11: ["drop"] }, recruitDifficulty: 0.65 },

  // === SIGNATURE musicians: very hard to recruit, tied to specific (often
  // story-gated) locations - see the signature zones in src/data/encounters.ts. ===
  // Cassette — an echo of Cass / the old scene's warmest, most human sound (folk
  // + jazz, the antithesis of Monocorp's machine). Lingers backstage at The Blue
  // Note (the jazz-residency reward area).
  cassette: { id: "cassette", name: "Cassette", genres: ["folk", "jazz"], baseStats: { stamina: 64, skill: 58, composure: 60, tempo: 48 }, learnset: { 1: ["blue_note", "fingerpick"], 8: ["trading_fours"], 16: ["barn_burner"] }, recruitDifficulty: 0.85 },
  // Genre aces — legendary locals, rare in their home district.
  riffraffe: { id: "riffraffe", name: "Riffraffe", genres: ["rock"], baseStats: { stamina: 56, skill: 72, composure: 48, tempo: 58 }, learnset: { 1: ["power_chord"], 8: ["feedback_wail"], 14: ["wall_of_sound"], 20: ["stage_dive"] }, recruitDifficulty: 0.8 },
  bassolossus: { id: "bassolossus", name: "Bassolossus", genres: ["funk"], baseStats: { stamina: 60, skill: 64, composure: 52, tempo: 60 }, learnset: { 1: ["slap_bass"], 8: ["drop_the_one"], 16: ["p_funk"] }, recruitDifficulty: 0.8 },
  maestrissimo: { id: "maestrissimo", name: "Maestrissimo", genres: ["classical"], baseStats: { stamina: 64, skill: 60, composure: 72, tempo: 40 }, learnset: { 1: ["sonata"], 8: ["fugue"], 16: ["grand_finale"] }, recruitDifficulty: 0.85 },
  // Aurora — Monocorp's pristine machine sound, beautiful in spite of itself.
  // Found after hours in the warehouse backstage (electronic-residency reward).
  aurora: { id: "aurora", name: "Aurora", genres: ["electronic"], baseStats: { stamina: 54, skill: 74, composure: 50, tempo: 66 }, learnset: { 1: ["sync_pulse"], 8: ["wobble_bass"], 16: ["drop"] }, recruitDifficulty: 0.85 },
};

export const SPECIES_LIST = Object.values(SPECIES);

export function getSpecies(id: string): MusicianSpecies | undefined {
  return SPECIES[id];
}
