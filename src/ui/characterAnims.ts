import type Phaser from "phaser";
import type { Direction } from "../types/direction";

/**
 * Frame layout of the repacked LimeZu overworld character sheets (16x32 frames,
 * 7 columns x 4 rows). MUST match `scripts/repack-characters.py`:
 *   - Row = facing direction, in this order: down, up, left, right.
 *   - Column 0 = idle/standing frame; columns 1..6 = the 6-frame walk cycle.
 *   - Phaser frame index = row*COLS + col.
 *
 * The pure helpers (idle frame index, walk anim key) carry no Phaser runtime, so
 * Player/NPC stay engine-agnostic + unit-testable; `registerCharacterAnims` is
 * the one runtime call (creates the four walk anims for a texture) and is invoked
 * by the scene after the sheets load.
 */
const COLS = 7;
const WALK_LEN = 6;

/** Row index per direction (matches the repack script's output order). */
const DIR_ROW: Record<Direction, number> = { down: 0, up: 1, left: 2, right: 3 };

/** The standing-frame index for a facing direction. */
export function idleFrameIndex(direction: Direction): number {
  return DIR_ROW[direction] * COLS; // column 0 of the direction's row
}

/** The walk-cycle frame indices (columns 1..6) for a facing direction. */
export function walkFrameIndices(direction: Direction): number[] {
  const base = DIR_ROW[direction] * COLS;
  return Array.from({ length: WALK_LEN }, (_, i) => base + 1 + i);
}

/** Animation key for a character texture's walk cycle in a direction. */
export function walkAnimKey(textureKey: string, direction: Direction): string {
  return `${textureKey}-walk-${direction}`;
}

/**
 * Create the four directional walk animations for a character texture, once.
 * Idempotent (skips anims that already exist), so it's safe to call on every
 * scene create for every loaded character.
 */
export function registerCharacterAnims(scene: Phaser.Scene, textureKey: string): void {
  (["down", "up", "left", "right"] as Direction[]).forEach((dir) => {
    const key = walkAnimKey(textureKey, dir);
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: walkFrameIndices(dir).map((frame) => ({ key: textureKey, frame })),
      frameRate: 10,
      repeat: -1,
    });
  });
}
