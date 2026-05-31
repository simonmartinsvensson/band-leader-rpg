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
};

export const SPECIES_LIST = Object.values(SPECIES);

export function getSpecies(id: string): MusicianSpecies | undefined {
  return SPECIES[id];
}
