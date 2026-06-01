import type { Genre, GenreId } from "../types/genre";

/**
 * Genre effectiveness chart, as data — the band-leader take on Pokémon "types".
 *
 * Every genre is SUPER effective against two genres, NOT very effective against
 * two, and NEUTRAL with the one remaining ("fusion cousin"). The chart is
 * internally consistent: if A is strong vs B, then B is weak vs A. Because each
 * genre has exactly two strengths and two weaknesses, no genre is strictly
 * dominant — every style has a counter.
 *
 * The matchups are grounded in real musical relationships, not an arbitrary
 * wheel:
 *
 *   NEUTRAL "fusion cousins" (deeply related styles that don't counter each
 *   other — they blend instead):
 *     • jazz ↔ funk        funk grew straight out of jazz & soul (jazz-funk).
 *     • rock ↔ electronic  synth-rock, industrial, electro: constant crossover.
 *     • classical ↔ folk   the two acoustic, song/score traditions.
 *
 *   STRONG / WEAK matchups (attacker → defender, with the reasoning):
 *     • jazz → rock         harmonic sophistication outclasses three-chord rock.
 *     • jazz → classical     improvisation breaks free of the rigid written score.
 *     • rock → classical     raw volume & rebellion overwhelm refined restraint.
 *     • rock → funk          distorted aggression bulldozes funk's slick finesse.
 *     • classical → funk     command of dynamics & arrangement out-disciplines
 *                            the single locked groove.
 *     • classical → electronic  live virtuosity & acoustic depth vs cold programming.
 *     • funk → electronic    a human pocket beats the quantized machine.
 *     • funk → folk          an irresistible danceable groove drowns gentle strumming.
 *     • electronic → folk    studio production & sonic scale bury intimate acoustics.
 *     • electronic → jazz    relentless programmed precision derails loose improv.
 *     • folk → jazz          plain-spoken authenticity cuts through the sophistication.
 *     • folk → rock          acoustic roots & sincerity ground (and predate) rock.
 *
 * Use getEffectiveness(attacker, defender) in src/systems/genres.ts for the
 * attacker-vs-defender multiplier lookup.
 */
export const GENRES: Record<GenreId, Genre> = {
  jazz: {
    id: "jazz",
    name: "Jazz",
    color: 0x9b59b6,
    // Sophistication beats rock & classical; authenticity (folk) and machine
    // precision (electronic) undo it. Neutral with funk, its own offspring.
    strongAgainst: ["rock", "classical"],
    weakAgainst: ["folk", "electronic"],
  },
  rock: {
    id: "rock",
    name: "Rock",
    color: 0xe74c3c,
    // Raw power flattens classical & funk; jazz out-thinks it and folk out-roots
    // it. Neutral with electronic, its frequent studio partner.
    strongAgainst: ["classical", "funk"],
    weakAgainst: ["jazz", "folk"],
  },
  classical: {
    id: "classical",
    name: "Classical",
    color: 0xf1c40f,
    // Discipline & dynamics overwhelm funk & electronic; jazz frees itself and
    // rock shouts it down. Neutral with folk, the other acoustic tradition.
    strongAgainst: ["funk", "electronic"],
    weakAgainst: ["rock", "jazz"],
  },
  funk: {
    id: "funk",
    name: "Funk",
    color: 0xe67e22,
    // The groove buries electronic & folk; rock bulldozes it and classical
    // out-disciplines it. Neutral with jazz, the parent style.
    strongAgainst: ["electronic", "folk"],
    weakAgainst: ["classical", "rock"],
  },
  electronic: {
    id: "electronic",
    name: "Electronic",
    color: 0x1abc9c,
    // Production scale swamps folk & jazz; funk's human pocket and classical's
    // virtuosity expose it. Neutral with rock, its crossover cousin.
    strongAgainst: ["folk", "jazz"],
    weakAgainst: ["funk", "classical"],
  },
  folk: {
    id: "folk",
    name: "Folk",
    color: 0x27ae60,
    // Roots & sincerity ground jazz & rock; funk's groove and electronic's
    // production drown it out. Neutral with classical, the other acoustic art.
    strongAgainst: ["jazz", "rock"],
    weakAgainst: ["electronic", "funk"],
  },
};

export const GENRE_LIST: GenreId[] = Object.keys(GENRES) as GenreId[];

export function getGenre(id: GenreId): Genre {
  return GENRES[id];
}
