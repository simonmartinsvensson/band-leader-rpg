import type { StoryEvent } from "../types/event";

/**
 * Scripted events ("cutscenes"), keyed by trigger + gated by story flags. The
 * engine (src/systems/cutscene.ts + the overworld) fires the first eligible
 * event whose trigger matches. No story content yet — add events here, e.g.:
 *
 *   {
 *     id: "intro_meet_rival",
 *     trigger: { type: "enterTile", map: "town", x: 5, y: 8 },
 *     once: "story.met_rival",            // set when done; never replays
 *     steps: [
 *       { kind: "turn", actor: "player", facing: "left" },
 *       { kind: "dialogue", speaker: "Rival Max", pages: ["We meet at last."] },
 *       { kind: "walk", actor: "rival_max", path: ["down", "down"] },
 *       { kind: "setFlag", flag: "story.tutorial_done" },
 *       { kind: "giveItem", item: "demo_tape", qty: 1 },
 *     ],
 *   }
 *
 * See CLAUDE.md "Story, flags & scripted events" for the full step/trigger set.
 */
export const EVENTS: StoryEvent[] = [];
