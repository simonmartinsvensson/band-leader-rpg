import type Phaser from "phaser";
import { TILE_SIZE, GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { AssetKeys, PlayerFrame } from "../data/assets";
import { DIRECTION_VECTORS, type Direction } from "../types/direction";

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
  private readonly cols: number;
  private readonly rows: number;

  private gridX: number;
  private gridY: number;
  private facing: Direction = "down";
  private moving = false;

  constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
    this.scene = scene;
    this.gridX = gridX;
    this.gridY = gridY;
    this.cols = Math.floor(GAME_WIDTH / TILE_SIZE);
    this.rows = Math.floor(GAME_HEIGHT / TILE_SIZE);

    this.sprite = scene.add
      .sprite(this.pixelAt(gridX), this.pixelAt(gridY), AssetKeys.PLAYER, FRAME_FOR.down)
      .setOrigin(0.5);
  }

  get isMoving(): boolean {
    return this.moving;
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
    if (this.inBounds(targetX, targetY)) {
      this.step(targetX, targetY);
    }
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
      },
    });
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  /** Center pixel of a tile index, for either axis (tiles are square). */
  private pixelAt(tile: number): number {
    return tile * TILE_SIZE + TILE_SIZE / 2;
  }
}
