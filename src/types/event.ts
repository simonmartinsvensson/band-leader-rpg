import type { Direction } from "./direction";

// Scripted-event ("cutscene") types. An event is a data-driven sequence of
// steps, fired by a trigger and gated by story flags. The pure engine lives in
// src/systems/cutscene.ts; the overworld supplies the runtime handlers.

/**
 * One step of a cutscene. Visual steps (dialogue/walk/turn/wait/battle) are
 * played by the scene's handlers; the rest mutate game state.
 *
 * `actor` is "player" or a map object's `name` (NPCs are placed with their
 * object name, so a cutscene can move/turn a specific NPC).
 */
export type EventStep =
  | { kind: "dialogue"; speaker?: string; pages: string[] }
  | { kind: "nameEntry"; prompt?: string; default?: string }
  | { kind: "wait"; ms: number }
  | { kind: "setFlag"; flag: string; value?: boolean }
  | { kind: "giveItem"; item: string; qty?: number }
  | { kind: "giveCurrency"; amount: number }
  | { kind: "turn"; actor: string; facing: Direction }
  | { kind: "walk"; actor: string; path: Direction[] }
  | { kind: "battle"; trainer?: string; species?: string; level?: number }
  // End the game: save, then roll credits / Hall of Fame (the WinScene).
  | { kind: "win" };

/** What makes an event fire. */
export type EventTrigger =
  | { type: "enterMap"; map: string }
  | { type: "enterTile"; map: string; x: number; y: number }
  | { type: "interact"; object: string };

export interface StoryEvent {
  id: string;
  trigger: EventTrigger;
  /** Story flags that must ALL be set for the event to fire. */
  requires?: string[];
  /** Story flags that must ALL be unset for the event to fire. */
  forbids?: string[];
  /** Convenience: a flag set when the event finishes; also blocks any replay. */
  once?: string;
  steps: EventStep[];
}

/** The situation being tested against an event's trigger (built by the scene). */
export interface TriggerContext {
  type: EventTrigger["type"];
  map: string;
  x?: number;
  y?: number;
  object?: string;
}
