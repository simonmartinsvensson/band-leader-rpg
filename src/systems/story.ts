import type { Milestone } from "../types/story";

// Story-progress logic. Story flags/variables are named booleans living in the
// existing save `flags` map (so they persist for free, see src/systems/save.ts).
// Everything here is pure — no Phaser, no DOM — and unit-tested.

/** Read-only flag bag (the registry's "flags" entry satisfies this). */
export type Flags = Record<string, boolean>;

export function isFlagSet(flags: Flags, name: string): boolean {
  return flags[name] === true;
}

/** Set (or clear) a story flag in place. */
export function setStoryFlag(flags: Flags, name: string, value = true): void {
  flags[name] = value;
}

/**
 * Flag gate shared by events and map objects: true when every `requires` flag
 * is set and no `forbids` flag is set. Empty/omitted lists always pass.
 */
export function flagsAllow(flags: Flags, requires?: string[], forbids?: string[]): boolean {
  if (requires && !requires.every((f) => isFlagSet(flags, f))) return false;
  if (forbids && forbids.some((f) => isFlagSet(flags, f))) return false;
  return true;
}

/** The first not-yet-completed milestone (the active objective), or undefined. */
export function currentMilestone(story: Milestone[], flags: Flags): Milestone | undefined {
  return story.find((m) => !isFlagSet(flags, m.flag));
}

/** Milestones already completed (their flag is set), in order. */
export function completedMilestones(story: Milestone[], flags: Flags): Milestone[] {
  return story.filter((m) => isFlagSet(flags, m.flag));
}

/** The current objective text, or a friendly fallback when there's none. */
export function currentObjective(story: Milestone[], flags: Flags): string {
  return currentMilestone(story, flags)?.objective ?? "";
}

/** The current chapter heading (the last chapter once everything is done). */
export function currentChapter(story: Milestone[], flags: Flags): string {
  const active = currentMilestone(story, flags);
  if (active) return active.chapter;
  return story.length > 0 ? story[story.length - 1].chapter : "";
}

/** True once every milestone is complete (the questline is finished). */
export function storyComplete(story: Milestone[], flags: Flags): boolean {
  return story.length > 0 && currentMilestone(story, flags) === undefined;
}

/**
 * Substitute `{token}` placeholders in story/dialogue text from a variables map,
 * e.g. interpolate("Hi {name}!", { name: "Riff" }) -> "Hi Riff!". Unknown tokens
 * are left as-is. Used to surface the player's chosen name in dialogue.
 */
export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? vars[key] : whole));
}
