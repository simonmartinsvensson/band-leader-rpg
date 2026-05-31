/** The six musical genres (the band-leader take on Pokémon "types"). */
export type GenreId = "jazz" | "rock" | "classical" | "funk" | "electronic" | "folk";

export interface Genre {
  id: GenreId;
  name: string;
  /** Display color (Phaser numeric hex), e.g. for UI chips / tints. */
  color: number;
  /** Genres this genre's techniques are SUPER effective against (deal more). */
  strongAgainst: GenreId[];
  /** Genres this genre's techniques are NOT very effective against (deal less). */
  weakAgainst: GenreId[];
}
