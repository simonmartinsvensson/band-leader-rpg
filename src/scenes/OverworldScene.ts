import Phaser from "phaser";
import { Player } from "../systems/Player";
import { GameMap } from "../systems/GameMap";
import { MovementController } from "../systems/MovementController";
import type { Direction } from "../types/direction";
import sampleMap from "../data/maps/sample-map.json";

/**
 * Walkable overworld: loads a Tiled map, blocks the player against collision
 * tiles, and follows the player with a camera clamped to the map bounds.
 */
export class OverworldScene extends Phaser.Scene {
  private player!: Player;
  private moveInput = new MovementController();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<Direction, Phaser.Input.Keyboard.Key>;

  constructor() {
    super("OverworldScene");
  }

  create(): void {
    const map = new GameMap(this, "sample-map", sampleMap);
    const spawn = map.getSpawn("player_start");
    this.player = new Player(this, spawn.x, spawn.y, map);

    // Camera follows the player but never shows past the map edges.
    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.player.gameObject, true);

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.wasd = keyboard.addKeys({
      up: KC.W,
      down: KC.S,
      left: KC.A,
      right: KC.D,
    }) as Record<Direction, Phaser.Input.Keyboard.Key>;
  }

  update(time: number): void {
    const intent = this.moveInput.update(this.getInputDirection(), time);
    this.player.update(intent);
  }

  /** Resolve held keys to a single direction (fixed priority on conflict). */
  private getInputDirection(): Direction | null {
    if (this.cursors.down.isDown || this.wasd.down.isDown) return "down";
    if (this.cursors.up.isDown || this.wasd.up.isDown) return "up";
    if (this.cursors.left.isDown || this.wasd.left.isDown) return "left";
    if (this.cursors.right.isDown || this.wasd.right.isDown) return "right";
    return null;
  }
}
