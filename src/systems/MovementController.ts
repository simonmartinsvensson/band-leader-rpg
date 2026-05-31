import type { Direction } from "../types/direction";

/** Delay (ms) a key must be held before auto-repeat stepping kicks in. */
export const REPEAT_DELAY = 200;

/**
 * Turns the raw "direction currently held this frame" into a discrete step
 * intent, FireRed / keyboard-auto-repeat style:
 *
 *  - One step fires on the initial key-down (edge), so a quick tap is always
 *    exactly one tile, regardless of how long the tap physically lasts or how
 *    long a step tween takes.
 *  - While the same direction stays held, nothing more fires until it has been
 *    held continuously past REPEAT_DELAY; after that it fires every frame
 *    (the movement lock throttles those to one step per tile).
 *  - Switching to a different held direction counts as a fresh edge (instant
 *    turn + step), and releasing resets the state.
 *
 * Pure and engine-agnostic: feed it the held direction + a timestamp each frame.
 */
export class MovementController {
  private active: Direction | null = null;
  private heldSince = 0;
  private repeating = false;
  private readonly repeatDelay: number;

  constructor(repeatDelay: number = REPEAT_DELAY) {
    this.repeatDelay = repeatDelay;
  }

  /**
   * @param held The direction currently held this frame (null if none).
   * @param time Monotonic timestamp in ms (e.g. Phaser's scene time).
   * @returns The direction to step this frame, or null for no step.
   */
  update(held: Direction | null, time: number): Direction | null {
    if (held === null) {
      this.active = null;
      this.repeating = false;
      return null;
    }

    // New key-down (or switched direction): one step immediately.
    if (held !== this.active) {
      this.active = held;
      this.heldSince = time;
      this.repeating = false;
      return held;
    }

    // Same direction still held: wait out the repeat delay, then step per frame.
    if (this.repeating) {
      return held;
    }
    if (time - this.heldSince >= this.repeatDelay) {
      this.repeating = true;
      return held;
    }
    return null;
  }
}
