import type Phaser from "phaser";
import { TILE_SIZE } from "../data/constants";
import { AssetKeys, PlayerFrame } from "../data/assets";
import { DIRECTION_VECTORS, type Direction } from "../types/direction";
import type { WorldGrid } from "../types/grid";

/** Time to tween one tile, in ms. Short, FireRed-ish walking pace. */
const STEP_DURATION = 150;

/** Which spritesheet frame faces which direction. */
const FRAME_FOR: Record<Direction, number> = {
  down: PlayerFrame.DOWN,
  up: PlayerFrame.UP,
  left: PlayerFrame.LEFT,
  right: PlayerFrame.RIGHT,
};

/**
 * Owns the player's grid position, facing, and the tile-by-tile movement state
 * machine. The player lives on a 16px grid: each step tweens exactly one tile
 * and movement is locked until the tween finishes, so the grid can never desync.
 *
 * `update(intent)` is called once per frame with the step intent for this frame
 * (a direction to step, or null). Edge-detection / auto-repeat is the input
 * layer's job (see MovementController); the Player just executes one step per
 * non-null intent it receives while idle — so a single intent is always exactly
 * one tile, independent of STEP_DURATION.
 *
 * Engine-agnostic at runtime: Phaser is imported as a type only, so this class
 * (and its tests) need no browser/Phaser runtime.
 */
export class Player {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly world: WorldGrid;

  private gridX: number;
  private gridY: number;
  private facing: Direction = "down";
  private moving = false;

  /** Called with the new tile each time a step finishes (warp/encounter hooks). */
  onStepComplete?: (tileX: number, tileY: number) => void;

  constructor(scene: Phaser.Scene, gridX: number, gridY: number, world: WorldGrid) {
    this.scene = scene;
    this.gridX = gridX;
    this.gridY = gridY;
    this.world = world;

    this.sprite = scene.add
      .sprite(this.pixelAt(gridX), this.pixelAt(gridY), AssetKeys.PLAYER, FRAME_FOR.down)
      .setOrigin(0.5)
      .setDepth(10);
  }

  get isMoving(): boolean {
    return this.moving;
  }

  /** The underlying sprite, e.g. for the camera to follow. */
  get gameObject(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  /** The direction the player is currently facing. */
  get direction(): Direction {
    return this.facing;
  }

  get tileX(): number {
    return this.gridX;
  }

  get tileY(): number {
    return this.gridY;
  }

  /**
   * Execute at most one step for this frame's intent.
   * @param intent The direction to step this frame, or null for none.
   */
  update(intent: Direction | null): void {
    // Locked while a step tween runs — intents during a step are simply ignored,
    // which is what keeps a single tap to exactly one tile.
    if (this.moving || !intent) return;

    // Always face the requested direction, even if the step is blocked
    // (FireRed turns in place against a wall). Today only the grid edge blocks.
    this.face(intent);

    const { x: dx, y: dy } = DIRECTION_VECTORS[intent];
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;
    if (this.canEnter(targetX, targetY)) {
      this.step(targetX, targetY);
    }
  }

  /** Turn to face a direction without moving (used by scripted cutscenes). */
  turn(direction: Direction): void {
    this.face(direction);
  }

  /**
   * Take one scripted step in a direction (face, then move if the tile is free),
   * returning whether it actually moved. Like update() but callable directly by
   * the cutscene runner; the per-frame input path still goes through update().
   */
  walk(direction: Direction): boolean {
    if (this.moving) return false;
    this.face(direction);
    const { x: dx, y: dy } = DIRECTION_VECTORS[direction];
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;
    if (!this.canEnter(targetX, targetY)) return false;
    this.step(targetX, targetY);
    return true;
  }

  private face(direction: Direction): void {
    this.facing = direction;
    // Use directional frames only if the sheet actually has them.
    if (this.sprite.texture.frameTotal > 1) {
      this.sprite.setFrame(FRAME_FOR[direction]);
    }
  }

  private step(targetX: number, targetY: number): void {
    this.moving = true;
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.pixelAt(targetX),
      y: this.pixelAt(targetY),
      duration: STEP_DURATION,
      onComplete: () => {
        this.gridX = targetX;
        this.gridY = targetY;
        this.moving = false;
        this.onStepComplete?.(targetX, targetY);
      },
    });
  }

  private canEnter(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.world.cols && y < this.world.rows && !this.world.isBlocked(x, y);
  }

  /** Center pixel of a tile index, for either axis (tiles are square). */
  private pixelAt(tile: number): number {
    return tile * TILE_SIZE + TILE_SIZE / 2;
  }
}
