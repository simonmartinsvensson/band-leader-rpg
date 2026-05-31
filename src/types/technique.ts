import type { GenreId } from "./genre";
import type { StatKey } from "./stats";

/** An optional secondary effect a technique can apply (the buff/debuff hook). */
export interface TechniqueEffect {
  kind: "buff" | "debuff";
  /** Which stat is shifted. */
  stat: StatKey;
  /** Magnitude of the shift, in stages (positive number; kind sets direction). */
  stages: number;
  /** Who the effect applies to. */
  target: "self" | "opponent";
  /** Probability (0..1) the effect applies when the technique lands. */
  chance: number;
}

/** A technique (the band-leader equivalent of a Pokémon move). */
export interface Technique {
  id: string;
  name: string;
  genre: GenreId;
  /** Base power; 0 for pure status techniques. */
  power: number;
  /** Hit chance, 0..1. */
  accuracy: number;
  /** Stamina/energy spent to use the technique. */
  staminaCost: number;
  /** Turn-order priority; higher acts first within a turn (default 0). */
  priority: number;
  /** Optional secondary effect (buff/debuff). */
  effect?: TechniqueEffect;
}
