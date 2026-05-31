import type { Direction } from "../types/direction";

/** Delay (ms) a key must be held before auto-repeat stepping kicks in. */
export const REPEAT_DELAY = 200;

/**
 * Turns the set of direction keys held this frame into a discrete step intent,
 * FireRed / keyboard-auto-repeat style.
 *
 * Conflict resolution is **last-pressed-wins**: the active direction is always
 * the most-recently-pressed key that is still held, tracked with a recency
 * stack (not a fixed priority). So holding Up and then pressing Right switches
 * to Right immediately; releasing Right falls back to Up with no need to
 * re-press it.
 *
 * Stepping:
 *  - The active direction changing (a new press, or a fall-back after a
 *    release) is an edge → one step immediately. A quick tap is therefore
 *    always exactly one tile, regardless of tap length or step duration.
 *  - While the active direction is unchanged, nothing more fires until it has
 *    been held past REPEAT_DELAY; after that it fires every frame (the Player's
 *    per-tile movement lock throttles those to one step per tile).
 *  - Auto-repeat ("walking") state is carried across direction changes, so
 *    switching direction while already walking stays seamless — no re-delay,
 *    no coming to a stop.
 *
 * The Player finishes any in-progress tile step before applying a new intent
 * (it ignores intents while moving), so direction changes never abort mid-tile.
 *
 * Pure and engine-agnostic: feed it the held directions + a timestamp each frame.
 */
export class MovementController {
  private readonly repeatDelay: number;
  /** Held directions, oldest first; the last element is the most recent. */
  private stack: Direction[] = [];
  /** The active direction emitted last frame (top of the stack). */
  private active: Direction | null = null;
  private heldSince = 0;
  private repeating = false;

  constructor(repeatDelay: number = REPEAT_DELAY) {
    this.repeatDelay = repeatDelay;
  }

  /**
   * @param held The direction keys currently held this frame (order ignored;
   *   recency is tracked internally). Empty array if none.
   * @param time Monotonic timestamp in ms (e.g. Phaser's scene time).
   * @returns The direction to step this frame, or null for no step.
   */
  update(held: Direction[], time: number): Direction | null {
    this.syncStack(held);
    const active = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;

    if (active === null) {
      this.active = null;
      this.repeating = false;
      return null;
    }

    // Active direction changed (newest held key, or a fall-back after release):
    // step immediately. `repeating` is intentionally preserved so that changing
    // direction mid-walk keeps walking without re-incurring the initial delay.
    if (active !== this.active) {
      this.active = active;
      this.heldSince = time;
      return active;
    }

    // Same active direction: tap stays one tile until held past the delay.
    if (this.repeating) {
      return active;
    }
    if (time - this.heldSince >= this.repeatDelay) {
      this.repeating = true;
      return active;
    }
    return null;
  }

  /** Reconcile the recency stack with the currently-held set. */
  private syncStack(held: Direction[]): void {
    // Drop released keys, preserving the order of those still held.
    if (this.stack.length > 0) {
      this.stack = this.stack.filter((d) => held.includes(d));
    }
    // Push newly-pressed keys onto the top (most recent).
    for (const d of held) {
      if (!this.stack.includes(d)) this.stack.push(d);
    }
  }
}
