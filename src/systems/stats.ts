import type { MusicianInstance, MusicianSpecies } from "../types/musician";
import type { Stats } from "../types/stats";

/** Maximum techniques a musician can know at once. */
export const MAX_TECHNIQUES = 4;

/**
 * Compute a musician's stats from its species base stats at a given level.
 * Mirrors the classic formula: stamina (HP) gets a flat + level bonus; the
 * other stats share a common growth term. No IV/EV layer (yet).
 */
export function computeStats(species: MusicianSpecies, level: number): Stats {
  const base = species.baseStats;
  const grow = (b: number) => Math.floor((2 * b * level) / 100) + 5;
  return {
    stamina: Math.floor((2 * base.stamina * level) / 100) + level + 10,
    skill: grow(base.skill),
    composure: grow(base.composure),
    tempo: grow(base.tempo),
  };
}

/**
 * XP curve: total XP required to *be* at `level` (medium-fast cubic). Level 1
 * is 0. Use xpToNextLevel for the per-level delta.
 */
export function xpForLevel(level: number): number {
  return Math.max(0, Math.floor((level - 1) ** 3));
}

/** XP needed to advance from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return xpForLevel(level + 1) - xpForLevel(level);
}

/**
 * Technique ids a species knows at `level`: everything learned at or below the
 * level, keeping the most recent up to MAX_TECHNIQUES.
 */
export function knownTechniquesAt(species: MusicianSpecies, level: number): string[] {
  const learned: string[] = [];
  const levels = Object.keys(species.learnset)
    .map(Number)
    .sort((a, b) => a - b);
  for (const lvl of levels) {
    if (lvl <= level) learned.push(...species.learnset[lvl]);
  }
  return learned.slice(-MAX_TECHNIQUES);
}

/** Build a recruited individual from a species at a level (full stamina). */
export function createInstance(
  species: MusicianSpecies,
  level: number,
  nickname?: string,
): MusicianInstance {
  const stats = computeStats(species, level);
  return {
    speciesId: species.id,
    nickname: nickname ?? species.name,
    level,
    xp: xpForLevel(level),
    currentStamina: stats.stamina,
    techniques: knownTechniquesAt(species, level),
    stats,
  };
}
