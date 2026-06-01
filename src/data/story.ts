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
    id: "first_residency",
    chapter: "Chapter 2: First Gig",
    objective: "Win your first residency at The Blue Note.",
    flag: "story.jazz_residency_won",
  },
];
