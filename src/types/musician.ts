import type { GenreId } from "./genre";
import type { Stats } from "./stats";

/** A species template: the shared definition all recruits of a kind share. */
export interface MusicianSpecies {
  id: string;
  name: string;
  /** Base stats used by the stat formula (see src/systems/stats.ts). */
  baseStats: Stats;
  /** One or more genres this species belongs to. */
  genres: GenreId[];
  /** Level -> technique ids learned upon reaching that level. */
  learnset: Record<number, string[]>;
  /** How hard this species is to recruit, 0..1 (higher = harder). */
  recruitDifficulty: number;
}

/** A recruited individual: one concrete musician in the player's band. */
export interface MusicianInstance {
  speciesId: string;
  nickname: string;
  level: number;
  /** Total accumulated XP (see the XP curve in src/systems/stats.ts). */
  xp: number;
  /** Current stamina, 0..stats.stamina. */
  currentStamina: number;
  /** Known technique ids (capped at MAX_TECHNIQUES). */
  techniques: string[];
  /** Stats computed from species base stats + level. */
  stats: Stats;
}
