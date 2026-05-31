import type { GenreId } from "../types/genre";
import { GENRES } from "../data/genres";

export const SUPER_EFFECTIVE = 2;
export const NOT_VERY_EFFECTIVE = 0.5;
export const NEUTRAL = 1;

/**
 * Damage multiplier for an attacking genre's technique against a defending
 * genre, read from the effectiveness chart (src/data/genres.ts).
 */
export function getEffectiveness(attacker: GenreId, defender: GenreId): number {
  const genre = GENRES[attacker];
  if (genre.strongAgainst.includes(defender)) return SUPER_EFFECTIVE;
  if (genre.weakAgainst.includes(defender)) return NOT_VERY_EFFECTIVE;
  return NEUTRAL;
}

/**
 * Combined multiplier against a defender that may have multiple genres
 * (multiplies the per-genre effectiveness, as in the mainline games).
 */
export function getEffectivenessAgainst(attacker: GenreId, defenderGenres: GenreId[]): number {
  return defenderGenres.reduce((mult, g) => mult * getEffectiveness(attacker, g), 1);
}
