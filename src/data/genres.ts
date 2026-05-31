import type { Genre, GenreId } from "../types/genre";

/**
 * Genre effectiveness chart, as data. Arranged as a hexagonal wheel: each genre
 * is SUPER effective against the next two and NOT very effective against the
 * previous two (and neutral against its opposite). This is internally
 * consistent — if A is strong vs B, then B is weak vs A.
 *
 *   jazz → rock → classical → funk → electronic → folk → (jazz)
 *
 * Use getEffectiveness(attacker, defender) in src/systems/genres.ts for the
 * attacker-vs-defender multiplier lookup.
 */
export const GENRES: Record<GenreId, Genre> = {
  jazz: {
    id: "jazz",
    name: "Jazz",
    color: 0x9b59b6,
    strongAgainst: ["rock", "classical"],
    weakAgainst: ["folk", "electronic"],
  },
  rock: {
    id: "rock",
    name: "Rock",
    color: 0xe74c3c,
    strongAgainst: ["classical", "funk"],
    weakAgainst: ["jazz", "folk"],
  },
  classical: {
    id: "classical",
    name: "Classical",
    color: 0xf1c40f,
    strongAgainst: ["funk", "electronic"],
    weakAgainst: ["rock", "jazz"],
  },
  funk: {
    id: "funk",
    name: "Funk",
    color: 0xe67e22,
    strongAgainst: ["electronic", "folk"],
    weakAgainst: ["classical", "rock"],
  },
  electronic: {
    id: "electronic",
    name: "Electronic",
    color: 0x1abc9c,
    strongAgainst: ["folk", "jazz"],
    weakAgainst: ["funk", "classical"],
  },
  folk: {
    id: "folk",
    name: "Folk",
    color: 0x27ae60,
    strongAgainst: ["jazz", "rock"],
    weakAgainst: ["electronic", "funk"],
  },
};

export const GENRE_LIST: GenreId[] = Object.keys(GENRES) as GenreId[];

export function getGenre(id: GenreId): Genre {
  return GENRES[id];
}
