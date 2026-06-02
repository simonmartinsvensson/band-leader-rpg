import type Phaser from "phaser";
import { TILE_SIZE } from "../data/constants";
import { PLAYER_CHARACTER } from "../data/characters";
import { idleFrameIndex, walkAnimKey } from "../ui/characterAnims";
import { DIRECTION_VECTORS, type Direction } from "../types/direction";
import type { WorldGrid } from "../types/grid";

/** Time to tween one tile, in ms. Short, FireRed-ish walking pace. */
const STEP_DURATION = 150;

/** Depth band for the player sprite (above NPCs, below UI/hints). */
const PLAYER_DEPTH = 10;

/**
 * Owns the player's grid position, facing, and the tile-by-tile movement state
 * machine. The player lives on a 16px grid: each step tweens exactly one tile
 * and movement is locked until the tween finishes, so the grid can never desync.
 *
 * The sprite is a 16x32 LimeZu character: one tile wide, two tall. It's anchored
 * by its feet (origin 0.5, 1) at the bottom of its tile, so the body overhangs
 * the tile above while the *logical* position stays one tile. Movement plays the
 * facing direction's walk cycle; standing shows that direction's idle frame.
 *
 * `update(intent)` is called once per frame with the step intent for this frame
 * (a direction to step, or null). Edge-detection / auto-repeat is the input
 * layer's job (see MovementController); the Player just executes one step per
 * non-null intent it receives while idle — so a single intent is always exactly
 * one tile, independent of STEP_DURATION.
 *
 * Engine-agnostic at runtime: Phaser is imported as a type only, so this class
 * (and its tests) need no browser/Phaser runtime. Animation calls are guarded so
 * a minimal stub sprite (as in the unit tests) works without an anim system.
 */
export class Player {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly world: WorldGrid;
  private readonly textureKey = PLAYER_CHARACTER;

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
      .sprite(centerX(gridX), footY(gridY), this.textureKey, idleFrameIndex("down"))
      .setOrigin(0.5, 1)
      .setDepth(PLAYER_DEPTH);
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
    if (this.moving) return;
    if (!intent) {
      this.showIdle(); // standing still: snap to the idle frame
      return;
    }

    // Always face the requested direction, even if the step is blocked
    // (FireRed turns in place against a wall). Today only the grid edge blocks.
    this.facing = intent;

    const { x: dx, y: dy } = DIRECTION_VECTORS[intent];
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;
    if (this.canEnter(targetX, targetY)) {
      this.step(targetX, targetY); // keeps the walk cycle running between steps
    } else {
      this.showIdle(); // turned in place against a wall
    }
  }

  /** Turn to face a direction without moving (used by scripted cutscenes). */
  turn(direction: Direction): void {
    this.facing = direction;
    this.showIdle();
  }

  /**
   * Take one scripted step in a direction (face, then move if the tile is free),
   * returning whether it actually moved. Like update() but callable directly by
   * the cutscene runner; the per-frame input path still goes through update().
   */
  walk(direction: Direction): boolean {
    if (this.moving) return false;
    this.facing = direction;
    const { x: dx, y: dy } = DIRECTION_VECTORS[direction];
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;
    if (!this.canEnter(targetX, targetY)) {
      this.showIdle();
      return false;
    }
    this.step(targetX, targetY, true); // discrete scripted step: stand when it lands
    return true;
  }

  private step(targetX: number, targetY: number, idleOnComplete = false): void {
    this.moving = true;
    this.playWalk();
    this.scene.tweens.add({
      targets: this.sprite,
      x: centerX(targetX),
      y: footY(targetY),
      duration: STEP_DURATION,
      onComplete: () => {
        this.gridX = targetX;
        this.gridY = targetY;
        this.moving = false;
        if (idleOnComplete) this.showIdle();
        this.onStepComplete?.(targetX, targetY);
      },
    });
  }

  /** Play the facing direction's walk cycle (no-op if already playing it). */
  private playWalk(): void {
    const s = this.sprite as unknown as { play?: (key: string, ignoreIfPlaying?: boolean) => unknown };
    s.play?.(walkAnimKey(this.textureKey, this.facing), true);
  }

  /** Stop any walk anim and show the facing direction's idle frame. */
  private showIdle(): void {
    const s = this.sprite as unknown as { anims?: { stop?: () => void } };
    s.anims?.stop?.();
    if (this.sprite.texture.frameTotal > 1) this.sprite.setFrame(idleFrameIndex(this.facing));
  }

  private canEnter(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.world.cols && y < this.world.rows && !this.world.isBlocked(x, y);
  }
}

/** Center pixel (x) of a tile column. */
function centerX(tile: number): number {
  return tile * TILE_SIZE + TILE_SIZE / 2;
}

/** Bottom pixel (y) of a tile row — the foot anchor for a 16x32 character. */
function footY(tile: number): number {
  return tile * TILE_SIZE + TILE_SIZE;
}
