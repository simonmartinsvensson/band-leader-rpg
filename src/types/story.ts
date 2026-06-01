// Story progression types. Story "flags/variables" are just named booleans in
// the existing save `flags` map (Record<string, boolean>); milestones describe
// the player-facing objective derived from those flags. See src/systems/story.ts.

/**
 * One ordered step of the main story. The "current objective" is the first
 * milestone whose `flag` is not yet set; earlier ones read as completed. Pure
 * data — add entries to src/data/story.ts in order to define the questline.
 */
export interface Milestone {
  id: string;
  /** Chapter/act this milestone belongs to (shown as a heading). */
  chapter: string;
  /** What the player should do now (shown while this milestone is current). */
  objective: string;
  /** Story flag that, once set, marks this milestone complete. */
  flag: string;
}
