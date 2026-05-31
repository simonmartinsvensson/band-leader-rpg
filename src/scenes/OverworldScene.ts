import Phaser from "phaser";
import { TILE_SIZE } from "../data/constants";
import { Player } from "../systems/Player";
import { GameMap } from "../systems/GameMap";
import { NPC } from "../systems/NPC";
import { MovementController } from "../systems/MovementController";
import { rollEncounter } from "../systems/encounters";
import { DIRECTION_VECTORS, OPPOSITE, type Direction } from "../types/direction";
import type { WorldGrid } from "../types/grid";
import type { DialogueData } from "./DialogueScene";
import { getDialogue } from "../data/dialogues";
import { getEncounterZone } from "../data/encounters";
import { MAPS, MapKeys } from "../data/maps";

/** A warp target: which map to load and which entry point to place the player at. */
interface Warp {
  target: string;
  entry: string;
}

/** Scene data passed when (re)starting the overworld, e.g. after a warp. */
interface OverworldData {
  map?: string;
  entry?: string;
}

/** How long player movement pauses after an encounter triggers (ms). */
const ENCOUNTER_PAUSE = 300;

/**
 * Walkable overworld: loads a Tiled map (by key from the map registry), spawns
 * the player + NPCs, blocks movement against collision tiles and NPCs, follows
 * the player with a clamped camera, opens NPC dialogue on the interact button,
 * warps between maps on warp tiles, and rolls random encounters in encounter
 * zones. Warping re-runs the scene with the target map + entry point.
 */
export class OverworldScene extends Phaser.Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private moveInput!: MovementController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<Direction, Phaser.Input.Keyboard.Key>;
  private interactKeys!: Phaser.Input.Keyboard.Key[];
  private interactWasDown = false;

  /** Current map key + the entry to spawn at (set by init from scene data). */
  private mapKey: string = MapKeys.TOWN;
  private entryName = "player_start";

  private readonly warps = new Map<string, Warp>(); // "x,y" -> warp
  private readonly encounterTiles = new Map<string, string>(); // "x,y" -> zone id
  private pendingWarp: Warp | null = null;
  private encounterLock = false;

  constructor() {
    super("OverworldScene");
  }

  init(data: OverworldData): void {
    this.mapKey = data?.map ?? MapKeys.TOWN;
    this.entryName = data?.entry ?? "player_start";
  }

  create(): void {
    this.npcs = [];
    this.warps.clear();
    this.encounterTiles.clear();
    this.pendingWarp = null;
    this.encounterLock = false;
    this.interactWasDown = false;
    this.moveInput = new MovementController();

    const map = new GameMap(this, this.mapKey, MAPS[this.mapKey]);

    // A tile is walkable if the map allows it and no actor stands there.
    const playerAt = (x: number, y: number) =>
      this.player !== undefined && this.player.tileX === x && this.player.tileY === y;
    const npcAt = (x: number, y: number) => this.npcs.some((n) => n.occupies(x, y));
    const isWalkable = (x: number, y: number) =>
      !map.isBlocked(x, y) && !playerAt(x, y) && !npcAt(x, y);

    this.buildObjects(map, isWalkable);

    // The player's world: map collision plus any tile an NPC occupies.
    const world: WorldGrid = {
      cols: map.cols,
      rows: map.rows,
      isBlocked: (x, y) => map.isBlocked(x, y) || npcAt(x, y),
    };

    const spawn = map.getSpawn(this.entryName);
    this.player = new Player(this, spawn.x, spawn.y, world);
    this.player.onStepComplete = (x, y) => this.handleStepComplete(x, y);

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
    // A warp queued by the previous step: re-run the scene with the new map.
    if (this.pendingWarp) {
      const warp = this.pendingWarp;
      this.pendingWarp = null;
      this.scene.restart({ map: warp.target, entry: warp.entry });
      return;
    }

    // Track the interact edge every frame (even while paused for dialogue) so a
    // held button can't re-trigger an interaction when the overworld resumes.
    const interactDown = this.interactKeys.some((k) => k.isDown);
    const interactPressed = interactDown && !this.interactWasDown;
    this.interactWasDown = interactDown;

    // Movement is suppressed during the brief post-encounter pause.
    const held = this.encounterLock ? [] : this.getHeldDirections();
    const intent = this.moveInput.update(held, time);
    this.player.update(intent);
    for (const npc of this.npcs) npc.update(time);

    if (interactPressed && !this.player.isMoving && !this.encounterLock) this.tryInteract();
  }

  /** React to the player finishing a step: warp, then encounter checks. */
  private handleStepComplete(x: number, y: number): void {
    const warp = this.warps.get(key(x, y));
    if (warp) {
      this.pendingWarp = warp; // applied in update() to avoid restarting mid-tween
      return;
    }
    const zoneId = this.encounterTiles.get(key(x, y));
    if (zoneId) this.tryEncounter(zoneId);
  }

  private tryEncounter(zoneId: string): void {
    const zone = getEncounterZone(zoneId);
    if (!zone) return;
    const musician = rollEncounter(zone);
    if (!musician) return;

    // TODO: launch the real battle/audition scene here.
    console.log(`encounter triggered! zone=${zoneId} musician=${musician}`);
    this.encounterLock = true;
    this.time.delayedCall(ENCOUNTER_PAUSE, () => {
      this.encounterLock = false;
    });
  }

  /** Build NPCs, warps, and encounter zones from the map's objects layer. */
  private buildObjects(map: GameMap, isWalkable: (x: number, y: number) => boolean): void {
    const overlay = this.add.graphics().setDepth(1);

    for (const obj of map.getObjects()) {
      if (obj.type === "npc") {
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
      } else if (obj.type === "warp") {
        this.warps.set(key(obj.tileX, obj.tileY), {
          target: String(obj.props.target ?? ""),
          entry: String(obj.props.entry ?? ""),
        });
        // Visible exit marker.
        overlay.fillStyle(0xffd54f, 0.3).fillRect(obj.tileX * TILE_SIZE, obj.tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        overlay
          .lineStyle(1, 0xffd54f, 0.9)
          .strokeRect(obj.tileX * TILE_SIZE + 0.5, obj.tileY * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      } else if (obj.type === "encounter") {
        const zoneId = String(obj.props.zone ?? "");
        for (let dy = 0; dy < obj.tileH; dy++) {
          for (let dx = 0; dx < obj.tileW; dx++) {
            this.encounterTiles.set(key(obj.tileX + dx, obj.tileY + dy), zoneId);
          }
        }
        // Visible "busking" overlay so the zone reads like tall grass.
        overlay
          .fillStyle(0xcc66ff, 0.22)
          .fillRect(obj.tileX * TILE_SIZE, obj.tileY * TILE_SIZE, obj.tileW * TILE_SIZE, obj.tileH * TILE_SIZE);
      }
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

/** Map-tile key for the warp/encounter lookups. */
function key(x: number, y: number): string {
  return `${x},${y}`;
}

/** Tiled stores tints as "#rrggbb"; convert to a Phaser numeric color. */
function parseTint(value: string | number | boolean | undefined): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.startsWith("#")) return parseInt(value.slice(1), 16);
  return undefined;
}
