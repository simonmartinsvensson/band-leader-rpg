import type { MusicianInstance } from "../types/musician";
import { getSpecies } from "../data/species";
import { computeStats, xpForLevel, MAX_TECHNIQUES } from "./stats";
import { BALANCE } from "../data/balance";

export const MAX_LEVEL = 100;
/** XP yielded per level of the defeated opponent. */
const XP_PER_OPPONENT_LEVEL = 13;

export interface LevelUp {
  level: number;
  /** Technique ids learned at this level. */
  learned: string[];
  /** Technique ids dropped to make room (when already at MAX_TECHNIQUES). */
  forgot: string[];
}

/** XP awarded for defeating an opponent. */
export function xpReward(opponent: MusicianInstance): number {
  return Math.max(1, Math.round(opponent.level * XP_PER_OPPONENT_LEVEL * BALANCE.xpRewardMultiplier));
}

/**
 * Add XP to a musician, applying any resulting level-ups: recompute stats,
 * carry the max-stamina gain into current stamina, and learn the species'
 * learnset techniques for each new level. Mutates `instance`; returns the
 * level-ups (for messaging).
 */
export function awardXp(instance: MusicianInstance, amount: number): LevelUp[] {
  const species = getSpecies(instance.speciesId);
  if (!species) return [];

  instance.xp += Math.max(0, amount);
  const ups: LevelUp[] = [];

  while (instance.level < MAX_LEVEL && instance.xp >= xpForLevel(instance.level + 1)) {
    const prevMaxStamina = instance.stats.stamina;
    instance.level += 1;
    instance.stats = computeStats(species, instance.level);
    instance.currentStamina = Math.min(
      instance.stats.stamina,
      instance.currentStamina + (instance.stats.stamina - prevMaxStamina),
    );

    const learned: string[] = [];
    const forgot: string[] = [];
    for (const id of species.learnset[instance.level] ?? []) {
      if (instance.techniques.includes(id)) continue;
      if (instance.techniques.length >= MAX_TECHNIQUES) {
        const dropped = instance.techniques.shift();
        if (dropped) forgot.push(dropped);
      }
      instance.techniques.push(id);
      learned.push(id);
    }
    ups.push({ level: instance.level, learned, forgot });
  }

  return ups;
}
