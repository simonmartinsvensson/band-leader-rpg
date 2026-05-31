import Phaser from "phaser";
import { TILE_SIZE, GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { Player } from "../systems/Player";
import { MovementController } from "../systems/MovementController";
import type { Direction } from "../types/direction";

/**
 * Overworld stub: a blank 16px grid you can walk around with arrow keys / WASD.
 * Map data, collision, and NPCs come later (all data-driven from src/data).
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
    this.drawGrid();

    // Start roughly centered on the 15x10 tile grid.
    this.player = new Player(this, 7, 5);

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

  private drawGrid(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1e1e2a, 1);
    for (let x = 0; x <= GAME_WIDTH; x += TILE_SIZE) {
      grid.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y <= GAME_HEIGHT; y += TILE_SIZE) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }
  }
}
