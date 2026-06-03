import { CharacterKeys } from "./assets";

/**
 * Which LimeZu character each overworld actor uses. The free pack ships only
 * four characters (Adam, Alex, Amelia, Bob), so with the player taking one there
 * are at most four distinct NPC looks — far fewer than the cast. We therefore:
 *   - give the player and the recurring named cast fixed, distinct characters
 *     (so e.g. the mentor and the rival are consistent across the whole game), and
 *   - assign every other NPC a stable character by hashing its identity, which
 *     spreads the four sprites deterministically (same NPC always looks the same).
 *
 * Repeats are unavoidable with four sprites — see the asset-swap guide in
 * CLAUDE.md for the list of who reuses whom. A future paid-pack swap (more
 * characters) only needs new keys here; nothing else changes.
 */

/** The player's character. */
export const PLAYER_CHARACTER = CharacterKeys.ADAM;

/** Characters available to NPCs (all four; the player's is reused for crowd NPCs). */
const NPC_POOL: string[] = [CharacterKeys.ALEX, CharacterKeys.AMELIA, CharacterKeys.BOB, CharacterKeys.ADAM];

/**
 * Fixed characters for the recurring named cast, so they stay visually
 * consistent everywhere they appear. Keyed by a normalized actor identity (the
 * map-object name, or a trainer id with any trailing "_2".."_5" stripped).
 */
const NAMED: Record<string, string> = {
  mentor: CharacterKeys.AMELIA, // Vy, the mentor
  vy: CharacterKeys.AMELIA,
  rival_max: CharacterKeys.BOB, // Max, the rival (all five escalating appearances)
  shopkeeper: CharacterKeys.ALEX,
  roadie: CharacterKeys.BOB,
};

/** Normalize an actor identity: lowercase, drop a trailing "_<n>" (rival_max_3 -> rival_max). */
function normalize(identity: string): string {
  return identity.toLowerCase().replace(/_\d+$/, "");
}

/** Small stable string hash (FNV-1a-ish) for spreading crowd NPCs across the pool. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The character texture key for an overworld NPC/trainer, by its identity (the
 * map-object name; falls back to whatever stable string the caller passes).
 * Deterministic: the same identity always yields the same character.
 */
export function characterForNPC(identity: string): string {
  const norm = normalize(identity);
  return NAMED[norm] ?? NPC_POOL[hash(norm) % NPC_POOL.length];
}
