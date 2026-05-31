// Audition (recruit) mechanic — the catch equivalent. Pure + testable: pass a
// random source for deterministic tests. FireRed-style catch math adapted to
// our stamina (HP) and a species recruit-difficulty.

export interface AuditionInput {
  /** Opponent max stamina (HP). */
  maxStamina: number;
  /** Opponent current stamina (lower = easier to recruit). */
  curStamina: number;
  /** Species recruitDifficulty, 0..1 (higher = harder). */
  difficulty: number;
  /** Item multiplier on the odds (demo tape > 1); defaults to 1. */
  itemModifier?: number;
}

export interface AuditionResult {
  success: boolean;
  /** Number of "shakes" passed (0..4); 4 = success. Drives the suspense UI. */
  shakes: number;
  /** Probability of success for this attempt (for tests / tuning). */
  chance: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Catch-rate (3..255) derived from recruit difficulty. */
export function catchRateFromDifficulty(difficulty: number): number {
  return Math.max(3, Math.min(255, Math.round((1 - clamp01(difficulty)) * 200) + 30));
}

/**
 * Roll an audition attempt. Mirrors the FireRed catch flow: compute `a` from
 * HP + rate + item; if `a >= 255` it's an instant success, otherwise run up to
 * four shake checks (each passes with probability `b/65536`) — all four = joins.
 */
export function auditionAttempt(input: AuditionInput, rng: () => number = Math.random): AuditionResult {
  const max = Math.max(1, input.maxStamina);
  const cur = Math.max(0, Math.min(input.curStamina, max));
  const rate = catchRateFromDifficulty(input.difficulty);
  const item = input.itemModifier ?? 1;

  const a = ((3 * max - 2 * cur) * rate * item) / (3 * max);
  if (a >= 255) return { success: true, shakes: 4, chance: 1 };

  const b = 1048560 / Math.sqrt(Math.sqrt(16711680 / a));
  const perShake = Math.min(1, b / 65536);

  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (rng() < perShake) shakes++;
    else break;
  }
  return { success: shakes === 4, shakes, chance: Math.pow(perShake, 4) };
}
