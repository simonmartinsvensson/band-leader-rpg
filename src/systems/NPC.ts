import type Phaser from "phaser";
import { TILE_SIZE } from "../data/constants";
import { AssetKeys } from "../data/assets";
import { idleFrameIndex, walkAnimKey } from "../ui/characterAnims";
import { DIRECTION_VECTORS, ALL_DIRECTIONS, type Direction } from "../types/direction";

/** Tile-step duration for a wandering NPC (a touch slower than the player). */
const NPC_STEP_DURATION = 180;
/** Range (ms) between wander attempts. */
const WANDER_MIN = 1500;
const WANDER_SPREAD = 2000;

export interface NPCConfig {
  /** Dialogue id (key into src/data/dialogues.ts). */
  id: string;
  /** Map object name — stable handle a cutscene uses to move/turn this NPC. */
  name?: string;
  tileX: number;
  tileY: number;
  facing: Direction;
  /** If true, the NPC randomly steps to free neighbouring tiles. */
  wander: boolean;
  /**
   * Character spritesheet key (a LimeZu `char_*` texture; see
   * src/data/characters.ts). Distinct characters replace the old per-NPC tint.
   * Falls back to the placeholder NPC image when omitted (e.g. in unit tests).
   */
  character?: string;
}

/** Returns true if the given tile may be entered (free of walls/other actors). */
export type WalkableQuery = (tileX: number, tileY: number) => boolean;

/**
 * A grid-bound non-player character. Placed from the map objects layer, it
 * occupies (and therefore blocks) its current tile, can face a direction, and
 * optionally wanders to free neighbouring tiles. Like Player, Phaser is a
 * type-only import so this stays runtime-pure and unit-testable.
 */
export class NPC {
  readonly id: string;
  /** Map object name (cutscene handle); falls back to the dialogue id. */
  readonly name: string;

  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly wander: boolean;
  private readonly isWalkable: WalkableQuery;
  private readonly textureKey: string;

  private gridX: number;
  private gridY: number;
  private facing: Direction;
  private moving = false;
  private nextWanderAt: number;

  constructor(scene: Phaser.Scene, config: NPCConfig, isWalkable: WalkableQuery) {
    this.scene = scene;
    this.id = config.id;
    this.name = config.name ?? config.id;
    this.gridX = config.tileX;
    this.gridY = config.tileY;
    this.facing = config.facing;
    this.wander = config.wander;
    this.isWalkable = isWalkable;
    this.textureKey = config.character ?? AssetKeys.NPC;
    this.nextWanderAt = WANDER_MIN + Math.random() * WANDER_SPREAD;

    // 16x32 LimeZu character, anchored by its feet at the bottom of its tile
    // (the body overhangs the tile above), like the player.
    this.sprite = scene.add
      .sprite(centerX(this.gridX), footY(this.gridY), this.textureKey, idleFrameIndex(this.facing))
      .setOrigin(0.5, 1)
      .setDepth(5);
    this.showIdle();
  }

  get tileX(): number {
    return this.gridX;
  }

  get tileY(): number {
    return this.gridY;
  }

  get facingDirection(): Direction {
    return this.facing;
  }

  /** The underlying sprite (e.g. for depth/visibility tweaks). */
  get gameObject(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  /** True if this NPC stands on (or is moving into) the given tile. */
  occupies(tileX: number, tileY: number): boolean {
    return this.gridX === tileX && this.gridY === tileY;
  }

  get isMoving(): boolean {
    return this.moving;
  }

  /** Turn to face a direction without moving (e.g. toward the player). */
  faceTo(direction: Direction): void {
    this.facing = direction;
    this.showIdle();
  }

  /**
   * Take one scripted step in a direction (face, then move if the target tile
   * is walkable), returning whether it moved. Used by the cutscene runner.
   */
  walk(direction: Direction): boolean {
    if (this.moving) return false;
    this.facing = direction;
    const { x: dx, y: dy } = DIRECTION_VECTORS[direction];
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;
    if (!this.isWalkable(targetX, targetY)) return false;
    this.step(targetX, targetY);
    return true;
  }

  /** Per-frame wander logic. No-op for stationary NPCs or while mid-step. */
  update(time: number): void {
    if (!this.wander || this.moving || time < this.nextWanderAt) return;
    this.nextWanderAt = time + WANDER_MIN + Math.random() * WANDER_SPREAD;

    const direction = ALL_DIRECTIONS[Math.floor(Math.random() * ALL_DIRECTIONS.length)];
    this.facing = direction;
    const { x: dx, y: dy } = DIRECTION_VECTORS[direction];
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;
    if (this.isWalkable(targetX, targetY)) {
      this.step(targetX, targetY);
    }
  }

  private step(targetX: number, targetY: number): void {
    // Reserve the target tile immediately so others won't path into it.
    this.gridX = targetX;
    this.gridY = targetY;
    this.moving = true;
    this.playWalk();
    this.scene.tweens.add({
      targets: this.sprite,
      x: centerX(targetX),
      y: footY(targetY),
      duration: NPC_STEP_DURATION,
      onComplete: () => {
        this.moving = false;
        this.showIdle();
      },
    });
  }

  /** Play the facing direction's walk cycle (no-op if already playing it). */
  private playWalk(): void {
    const s = this.sprite as unknown as { play?: (key: string, ignoreIfPlaying?: boolean) => unknown };
    s.play?.(walkAnimKey(this.textureKey, this.facing), true);
  }

  /** Stop any walk anim and show the facing direction's idle frame. Defensive so
   *  a minimal stub sprite (unit tests) works without a texture/anim system. */
  private showIdle(): void {
    const s = this.sprite as unknown as {
      anims?: { stop?: () => void };
      setFrame?: (frame: number) => unknown;
      texture?: { frameTotal: number };
    };
    s.anims?.stop?.();
    if (s.setFrame && (s.texture?.frameTotal ?? 0) > 1) s.setFrame(idleFrameIndex(this.facing));
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
