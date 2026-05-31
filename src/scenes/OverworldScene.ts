import Phaser from "phaser";
import { Player } from "../systems/Player";
import { GameMap } from "../systems/GameMap";
import { NPC } from "../systems/NPC";
import { MovementController } from "../systems/MovementController";
import { DIRECTION_VECTORS, OPPOSITE, type Direction } from "../types/direction";
import type { WorldGrid } from "../types/grid";
import type { DialogueData } from "./DialogueScene";
import { getDialogue } from "../data/dialogues";
import sampleMap from "../data/maps/sample-map.json";

/**
 * Walkable overworld: loads a Tiled map, spawns the player + NPCs, blocks the
 * player against collision tiles and NPCs, follows the player with a clamped
 * camera, and opens NPC dialogue on the interact button.
 */
export class OverworldScene extends Phaser.Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private moveInput = new MovementController();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<Direction, Phaser.Input.Keyboard.Key>;
  private interactKeys!: Phaser.Input.Keyboard.Key[];
  private interactWasDown = false;

  constructor() {
    super("OverworldScene");
  }

  create(): void {
    this.npcs = [];
    this.interactWasDown = false;

    const map = new GameMap(this, "sample-map", sampleMap);

    // A tile is walkable if the map allows it and no actor stands there.
    const playerAt = (x: number, y: number) =>
      this.player !== undefined && this.player.tileX === x && this.player.tileY === y;
    const npcAt = (x: number, y: number) => this.npcs.some((n) => n.occupies(x, y));
    const isWalkable = (x: number, y: number) =>
      !map.isBlocked(x, y) && !playerAt(x, y) && !npcAt(x, y);

    this.spawnNPCs(map, isWalkable);

    // The player's world: map collision plus any tile an NPC occupies.
    const world: WorldGrid = {
      cols: map.cols,
      rows: map.rows,
      isBlocked: (x, y) => map.isBlocked(x, y) || npcAt(x, y),
    };

    const spawn = map.getSpawn("player_start");
    this.player = new Player(this, spawn.x, spawn.y, world);

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
    this.interactKeys = [keyboard.addKey(KC.SPACE), keyboard.addKey(KC.ENTER)];
  }

  update(time: number): void {
    // Track the interact edge every frame (even while paused for dialogue) so a
    // held button can't re-trigger an interaction when the overworld resumes.
    const interactDown = this.interactKeys.some((k) => k.isDown);
    const interactPressed = interactDown && !this.interactWasDown;
    this.interactWasDown = interactDown;

    const intent = this.moveInput.update(this.getHeldDirections(), time);
    this.player.update(intent);
    for (const npc of this.npcs) npc.update(time);

    if (interactPressed && !this.player.isMoving) this.tryInteract();
  }

  private spawnNPCs(map: GameMap, isWalkable: (x: number, y: number) => boolean): void {
    for (const obj of map.getObjects()) {
      if (obj.type !== "npc") continue;
      this.npcs.push(
        new NPC(
          this,
          {
            id: String(obj.props.dialogue ?? ""),
            tileX: obj.tileX,
            tileY: obj.tileY,
            facing: (obj.props.facing as Direction) ?? "down",
            wander: obj.props.wander === true,
            tint: parseTint(obj.props.tint),
          },
          isWalkable,
        ),
      );
    }
  }

  /** Open dialogue with an NPC the player is facing, if any. */
  private tryInteract(): void {
    const facing = this.player.direction;
    const { x: dx, y: dy } = DIRECTION_VECTORS[facing];
    const targetX = this.player.tileX + dx;
    const targetY = this.player.tileY + dy;

    const npc = this.npcs.find((n) => n.occupies(targetX, targetY));
    if (!npc) return;

    const dialogue = getDialogue(npc.id);
    if (!dialogue) {
      console.warn(`No dialogue found for NPC id '${npc.id}'`);
      return;
    }

    npc.faceTo(OPPOSITE[facing]); // turn to face the player
    this.openDialogue(dialogue.pages, dialogue.speaker);
  }

  private openDialogue(pages: string[], speaker?: string): void {
    this.scene.pause();
    const data: DialogueData = { pages, speaker, parent: this.scene.key };
    this.scene.launch("DialogueScene", data);
  }

  /**
   * All direction keys currently held (arrows + WASD). Order is irrelevant —
   * MovementController tracks press recency and resolves last-pressed-wins.
   */
  private getHeldDirections(): Direction[] {
    const held: Direction[] = [];
    if (this.cursors.up.isDown || this.wasd.up.isDown) held.push("up");
    if (this.cursors.down.isDown || this.wasd.down.isDown) held.push("down");
    if (this.cursors.left.isDown || this.wasd.left.isDown) held.push("left");
    if (this.cursors.right.isDown || this.wasd.right.isDown) held.push("right");
    return held;
  }
}

/** Tiled stores tints as "#rrggbb"; convert to a Phaser numeric color. */
function parseTint(value: string | number | boolean | undefined): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.startsWith("#")) return parseInt(value.slice(1), 16);
  return undefined;
}
