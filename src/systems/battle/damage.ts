/** Same-genre bonus (Same Type Attack Bonus equivalent). */
export const STAB = 1.5;

export interface DamageInput {
  /** Attacker level. */
  level: number;
  /** Technique base power (>0 for damaging techniques). */
  power: number;
  /** Attacker effective skill (attack). */
  attack: number;
  /** Defender effective composure (defense). */
  defense: number;
  /** STAB multiplier (1 or STAB). */
  stab: number;
  /** Genre effectiveness multiplier (e.g. 2 / 1 / 0.5). */
  effectiveness: number;
  /** Damage spread factor, 0.85..1.0. */
  randomFactor: number;
}

/**
 * FireRed-style damage formula, adapted to our stats (skill vs composure).
 * Pure: the random spread is passed in as `randomFactor` so callers control RNG.
 */
export function computeDamage(input: DamageInput): number {
  if (input.power <= 0 || input.effectiveness <= 0) return 0;
  const levelTerm = Math.floor((2 * input.level) / 5) + 2;
  const base = Math.floor(Math.floor((levelTerm * input.power * input.attack) / input.defense) / 50) + 2;
  const modified = Math.floor(base * input.stab * input.effectiveness * input.randomFactor);
  return Math.max(1, modified);
}

/** Stat-stage multiplier for stages in [-6, +6] (FireRed style). */
export function stageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}
