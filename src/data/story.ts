import type { Milestone } from "../types/story";

/**
 * The main story, as an ordered list of milestones. The current objective is
 * the first milestone whose `flag` is not yet set (see src/systems/story.ts);
 * milestones before it read as completed in the quest log.
 *
 * No story content yet — this is the engine. Add milestones here in order, e.g.:
 *   { id: "ch1_audition", chapter: "Chapter 1: First Notes",
 *     objective: "Pass your first audition at the busking street.",
 *     flag: "story.first_audition_done" }
 * and set `story.first_audition_done` (via a cutscene `setFlag` step, a dialogue
 * gift `once`, or game logic) when it's achieved.
 */
export const STORY: Milestone[] = [
  {
    id: "meet_rival",
    chapter: "Chapter 1: Static",
    objective: "Head out of town - but a rival's blocking the way.",
    flag: "story.met_rival",
  },
  {
    id: "see_monocorp",
    chapter: "Chapter 1: Static",
    objective: "Find out who's draining the life from the scene.",
    flag: "story.saw_monocorp",
  },
  {
    id: "mentor_warning",
    chapter: "Chapter 1: Static",
    objective: "Hear Vy out before you leave town.",
    flag: "story.mentor_warning",
  },
  {
    id: "jazz_won",
    chapter: "Chapter 2: First Gig",
    objective: "Win your first residency at The Blue Note (jazz).",
    flag: "story.jazz_won",
  },
  // Chapter 3 — the circuit: clear the rest of the city's venues (each boss sets
  // its flag on defeat, see src/data/trainers.ts). Branching order; the current
  // objective points at the first one you haven't cleared.
  {
    id: "electronic_won",
    chapter: "Chapter 3: The Circuit",
    objective: "Headline The Warehouse (electronic), east of town.",
    flag: "story.electronic_won",
  },
  {
    id: "rock_won",
    chapter: "Chapter 3: The Circuit",
    objective: "Tear up The Amp on the Rock Strip.",
    flag: "story.rock_won",
  },
  {
    id: "folk_won",
    chapter: "Chapter 3: The Circuit",
    objective: "Play The Landing on the Folk Riverside.",
    flag: "story.folk_won",
  },
  {
    id: "funk_won",
    chapter: "Chapter 3: The Circuit",
    objective: "Find the groove at The Pocket in the Funk Block.",
    flag: "story.funk_won",
  },
  {
    id: "classical_won",
    chapter: "Chapter 3: The Circuit",
    objective: "Command The Conservatory in the Classical Hall.",
    flag: "story.classical_won",
  },
  {
    id: "game_complete",
    chapter: "Chapter 4: The Tower",
    objective: "Every residency earned. Face Monocorp at the Tower downtown.",
    flag: "story.game_complete",
  },
];
