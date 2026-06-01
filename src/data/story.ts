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
export const STORY: Milestone[] = [];
