import type { MusicianInstance } from "../../types/musician";
import type { GenreId } from "../../types/genre";
import type { StatKey } from "../../types/stats";

export type Side = "player" | "opponent";

/** A combatant: a musician instance plus battle-only state (stat stages). */
export interface Battler {
  instance: MusicianInstance;
  genres: GenreId[];
  /** Stat-stage modifiers, -6..+6 (stamina unused). */
  stages: Record<StatKey, number>;
}

export type BattleOutcome = "ongoing" | "player_won" | "player_lost" | "fled";

export interface BattleState {
  player: Battler;
  opponent: Battler;
  outcome: BattleOutcome;
}

/** A chosen action for a turn. Recruit/Bag are scene stubs for now. */
export type BattleAction =
  | { kind: "perform"; techniqueId: string }
  | { kind: "run" }
  | { kind: "recruit" }
  | { kind: "bag" };

/**
 * A resolved-turn event. The scene renders these sequentially (messages + bar
 * updates); the logic layer emits them. `damage` carries the post-hit snapshot
 * so the bar animates to the right value regardless of later mutations.
 */
export type BattleEvent =
  | { type: "message"; text: string }
  | { type: "action"; side: Side; technique: string }
  | { type: "miss"; side: Side }
  | { type: "damage"; target: Side; amount: number; remaining: number; max: number }
  | { type: "effectiveness"; multiplier: number }
  | { type: "statChange"; target: Side; stat: StatKey; delta: number }
  | { type: "faint"; side: Side }
  | { type: "run"; success: boolean }
  | { type: "outcome"; outcome: BattleOutcome };
