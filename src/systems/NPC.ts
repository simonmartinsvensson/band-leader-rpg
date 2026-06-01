import type Phaser from "phaser";
import { TILE_SIZE } from "../data/constants";
import { AssetKeys } from "../data/assets";
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
  /** Optional sprite tint, to tell NPCs apart while art is placeholder. */
  tint?: number;
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
    this.nextWanderAt = WANDER_MIN + Math.random() * WANDER_SPREAD;

    this.sprite = scene.add
      .sprite(this.pixelAt(this.gridX), this.pixelAt(this.gridY), AssetKeys.NPC)
      .setOrigin(0.5)
      .setDepth(5);
    if (config.tint !== undefined) this.sprite.setTint(config.tint);
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
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.pixelAt(targetX),
      y: this.pixelAt(targetY),
      duration: NPC_STEP_DURATION,
      onComplete: () => {
        this.moving = false;
      },
    });
  }

  private pixelAt(tile: number): number {
    return tile * TILE_SIZE + TILE_SIZE / 2;
  }
}
