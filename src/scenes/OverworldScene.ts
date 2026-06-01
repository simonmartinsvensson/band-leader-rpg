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
import { createInstance } from "../systems/stats";
import { SPECIES, getSpecies } from "../data/species";
import { createStarterParty, healParty } from "../systems/party";
import { addItem, type Bag } from "../systems/inventory";
import { buildTrainerTeam, isTrainerDefeated, hasResidency, lineOfSight } from "../systems/career";
import { getTrainer } from "../data/trainers";
import { getResidency } from "../data/residencies";
import type { DialogueGift } from "../data/dialogues";
import type { BattleData } from "./BattleScene";
import type { PartyData } from "./PartyScene";
import type { BagData } from "./BagScene";
import type { ShopData } from "./ShopScene";
import type { CareerData } from "./CareerScene";
import type { PauseData } from "./PauseScene";
import type { MusicianInstance } from "../types/musician";

/** A warp target: which map to load and which entry point to place the player at. */
interface Warp {
  target: string;
  entry: string;
}

/** A residency-gated warp (a bouncer). */
interface Gate extends Warp {
  requires: string;
}

/** A placed trainer: its NPC sprite + battle data. */
interface PlacedTrainer {
  npc: NPC;
  trainerId: string;
  facing: Direction;
  sightRange: number;
}

/** Scene data passed when (re)starting the overworld (warp, load, or new game). */
interface OverworldData {
  map?: string;
  /** Named spawn point (used by warps). */
  entry?: string;
  /** Explicit spawn tile (used when loading a save). Overrides `entry`. */
  x?: number;
  y?: number;
  /** Fresh game — play the intro and the party is the freshly-seeded starter. */
  newGame?: boolean;
}

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
  private debugBattleKey!: Phaser.Input.Keyboard.Key;
  private partyKey!: Phaser.Input.Keyboard.Key;
  private bagKey!: Phaser.Input.Keyboard.Key;
  private careerKey!: Phaser.Input.Keyboard.Key;

  /** Current map key + the entry to spawn at (set by init from scene data). */
  private mapKey: string = MapKeys.TOWN;
  private entryName = "player_start";
  private spawnTile: { x: number; y: number } | null = null;
  private newGame = false;
  private pauseKey!: Phaser.Input.Keyboard.Key;

  private readonly warps = new Map<string, Warp>(); // "x,y" -> warp
  private readonly encounterTiles = new Map<string, string>(); // "x,y" -> zone id
  private readonly healTiles = new Set<string>(); // "x,y" -> studio heal point
  private readonly gateTiles = new Map<string, Gate>(); // "x,y" -> residency gate
  private trainers: PlacedTrainer[] = [];
  private mapBlocked: (x: number, y: number) => boolean = () => false;
  private pendingWarp: Warp | null = null;
  private pendingBattle: BattleData | null = null;
  private pendingTrainer: string | null = null;

  constructor() {
    super("OverworldScene");
  }

  init(data: OverworldData): void {
    this.mapKey = data?.map ?? MapKeys.TOWN;
    this.entryName = data?.entry ?? "player_start";
    this.spawnTile = data?.x !== undefined && data?.y !== undefined ? { x: data.x, y: data.y } : null;
    this.newGame = data?.newGame === true;
  }

  create(): void {
    this.npcs = [];
    this.trainers = [];
    this.warps.clear();
    this.encounterTiles.clear();
    this.healTiles.clear();
    this.gateTiles.clear();
    this.pendingWarp = null;
    this.pendingBattle = null;
    this.pendingTrainer = null;
    this.interactWasDown = false;
    this.moveInput = new MovementController();

    // Game-global state (survives scene restarts / warps).
    if (!this.registry.has("party")) this.registry.set("party", createStarterParty());
    if (!this.registry.has("roster")) this.registry.set("roster", []);
    if (!this.registry.has("bag")) this.registry.set("bag", { demo_tape: 3 });
    if (!this.registry.has("currency")) this.registry.set("currency", 300);
    if (!this.registry.has("flags")) this.registry.set("flags", {});
    if (!this.registry.has("trainersDefeated")) this.registry.set("trainersDefeated", {});
    if (!this.registry.has("residencies")) this.registry.set("residencies", []);

    const map = new GameMap(this, this.mapKey, MAPS[this.mapKey]);
    this.mapBlocked = (x, y) => map.isBlocked(x, y);

    // A tile is walkable if the map allows it and no actor stands there.
    const playerAt = (x: number, y: number) =>
      this.player !== undefined && this.player.tileX === x && this.player.tileY === y;
    const actorAt = (x: number, y: number) =>
      this.npcs.some((n) => n.occupies(x, y)) || this.trainers.some((t) => t.npc.occupies(x, y));
    const isWalkable = (x: number, y: number) => !map.isBlocked(x, y) && !playerAt(x, y) && !actorAt(x, y);

    this.buildObjects(map, isWalkable);

    // The player's world: map collision, actors, heal points, and gates (face to
    // interact rather than walking onto them).
    const world: WorldGrid = {
      cols: map.cols,
      rows: map.rows,
      isBlocked: (x, y) =>
        map.isBlocked(x, y) || actorAt(x, y) || this.healTiles.has(key(x, y)) || this.gateTiles.has(key(x, y)),
    };

    const spawn = this.spawnTile ?? map.getSpawn(this.entryName);
    this.player = new Player(this, spawn.x, spawn.y, world);
    this.player.onStepComplete = (x, y) => this.handleStepComplete(x, y);
    this.registry.set("loc", { map: this.mapKey, x: spawn.x, y: spawn.y });

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
    this.debugBattleKey = keyboard.addKey(KC.B); // debug: launch a test battle
    this.partyKey = keyboard.addKey(KC.P); // open the party menu
    this.bagKey = keyboard.addKey(KC.I); // open the bag (inventory)
    this.careerKey = keyboard.addKey(KC.C); // open the career menu
    this.pauseKey = keyboard.addKey(KC.ESC); // open the pause menu

    // New game: the mentor hands you your band and explains the goal.
    if (this.newGame) {
      this.newGame = false;
      const intro = getDialogue("intro");
      if (intro) this.openDialogue(intro.pages, intro.speaker);
    }
  }

  update(time: number): void {
    // A warp queued by the previous step: re-run the scene with the new map.
    if (this.pendingWarp) {
      const warp = this.pendingWarp;
      this.pendingWarp = null;
      this.scene.restart({ map: warp.target, entry: warp.entry });
      return;
    }
    // A battle queued by the previous step (wild encounter, or trainer after
    // its intro dialogue): start it.
    if (this.pendingBattle) {
      const data = this.pendingBattle;
      this.pendingBattle = null;
      this.startBattle(data);
      return;
    }
    // A trainer triggered (sight or interaction): show intro, then battle.
    if (this.pendingTrainer) {
      const id = this.pendingTrainer;
      this.pendingTrainer = null;
      this.startTrainerEncounter(id);
      return;
    }

    // Track the interact edge every frame (even while paused for dialogue) so a
    // held button can't re-trigger an interaction when the overworld resumes.
    const interactDown = this.interactKeys.some((k) => k.isDown);
    const interactPressed = interactDown && !this.interactWasDown;
    this.interactWasDown = interactDown;

    const intent = this.moveInput.update(this.getHeldDirections(), time);
    this.player.update(intent);
    for (const npc of this.npcs) npc.update(time);

    if (interactPressed && !this.player.isMoving) this.tryInteract();

    if (this.player.isMoving) return;

    // Debug: launch a test battle directly (no encounter needed).
    if (Phaser.Input.Keyboard.JustDown(this.debugBattleKey)) this.launchDebugBattle();
    // Open the party menu.
    if (Phaser.Input.Keyboard.JustDown(this.partyKey)) {
      this.scene.pause();
      this.scene.launch("PartyScene", { parent: this.scene.key } satisfies PartyData);
    }
    // Open the bag.
    if (Phaser.Input.Keyboard.JustDown(this.bagKey)) {
      this.scene.pause();
      this.scene.launch("BagScene", { parent: this.scene.key } satisfies BagData);
    }
    // Open the career menu.
    if (Phaser.Input.Keyboard.JustDown(this.careerKey)) {
      this.scene.pause();
      this.scene.launch("CareerScene", { parent: this.scene.key } satisfies CareerData);
    }
    // Open the pause menu (save / sub-menus / resume).
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.scene.pause();
      this.scene.launch("PauseScene", { parent: this.scene.key } satisfies PauseData);
    }
  }

  private party(): MusicianInstance[] {
    return this.registry.get("party") as MusicianInstance[];
  }

  /** Pause the overworld and launch a battle with the given data. */
  private startBattle(data: BattleData): void {
    this.scene.pause();
    this.scene.launch("BattleScene", data);
  }

  /** Show a trainer's intro dialogue, then start the trainer battle. */
  private startTrainerEncounter(trainerId: string): void {
    const trainer = getTrainer(trainerId);
    if (!trainer) return;
    this.pendingBattle = {
      party: this.party(),
      opponents: buildTrainerTeam(trainer),
      parent: this.scene.key,
      trainer: {
        id: trainer.id,
        name: trainer.name,
        reward: trainer.reward,
        residency: trainer.residency,
        defeatLine: trainer.defeatLine,
      },
    };
    this.openDialogue(trainer.intro, trainer.name); // on close -> update() starts pendingBattle
  }

  /** Debug: battle a weak wild opponent directly (debug key 'B'). */
  private launchDebugBattle(): void {
    this.startBattle({
      party: this.party(),
      opponents: [createInstance(SPECIES.grooveling, 3)],
      parent: this.scene.key,
    });
  }

  /** React to the player finishing a step: warp, trainer sight, then encounter. */
  private handleStepComplete(x: number, y: number): void {
    this.registry.set("loc", { map: this.mapKey, x, y }); // for saving
    const warp = this.warps.get(key(x, y));
    if (warp) {
      this.pendingWarp = warp; // applied in update() to avoid restarting mid-tween
      return;
    }
    const seenBy = this.trainerSeeing(x, y);
    if (seenBy) {
      this.pendingTrainer = seenBy;
      return;
    }
    const zoneId = this.encounterTiles.get(key(x, y));
    if (zoneId) {
      const opponent = this.rollEncounterOpponent(zoneId);
      if (opponent) {
        this.pendingBattle = { party: this.party(), opponents: [opponent], parent: this.scene.key };
      }
    }
  }

  /** Id of an undefeated trainer whose line of sight contains (px,py), or null. */
  private trainerSeeing(px: number, py: number): string | null {
    const defeated = this.registry.get("trainersDefeated") as Record<string, boolean>;
    for (const t of this.trainers) {
      if (isTrainerDefeated(defeated, t.trainerId)) continue;
      if (lineOfSight(t.npc.tileX, t.npc.tileY, t.facing, t.sightRange, px, py, this.mapBlocked)) {
        return t.trainerId;
      }
    }
    return null;
  }

  /** Roll a zone encounter and, on a hit, build a wild opponent instance. */
  private rollEncounterOpponent(zoneId: string): MusicianInstance | null {
    const zone = getEncounterZone(zoneId);
    if (!zone) return null;
    const speciesId = rollEncounter(zone); // null when no encounter this step
    if (!speciesId) return null;
    const species = getSpecies(speciesId);
    if (!species) return null;
    const span = Math.max(1, zone.maxLevel - zone.minLevel + 1);
    const level = zone.minLevel + Math.floor(Math.random() * span);
    return createInstance(species, level);
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
      } else if (obj.type === "heal") {
        this.healTiles.add(key(obj.tileX, obj.tileY));
        // A "+" marker so the rehearsal-studio heal point reads clearly.
        const px = obj.tileX * TILE_SIZE;
        const py = obj.tileY * TILE_SIZE;
        overlay.fillStyle(0x4caf50, 0.4).fillRect(px, py, TILE_SIZE, TILE_SIZE);
        overlay.fillStyle(0xffffff, 0.95).fillRect(px + 7, py + 3, 2, 10).fillRect(px + 3, py + 7, 10, 2);
      } else if (obj.type === "trainer") {
        const trainerId = String(obj.props.trainer ?? "");
        const facing = (obj.props.facing as Direction) ?? "down";
        this.trainers.push({
          npc: new NPC(
            this,
            { id: trainerId, tileX: obj.tileX, tileY: obj.tileY, facing, wander: false, tint: parseTint(obj.props.tint) },
            isWalkable,
          ),
          trainerId,
          facing,
          sightRange: getTrainer(trainerId)?.sightRange ?? 0,
        });
      } else if (obj.type === "gate") {
        this.gateTiles.set(key(obj.tileX, obj.tileY), {
          requires: String(obj.props.requires ?? ""),
          target: String(obj.props.target ?? ""),
          entry: String(obj.props.entry ?? ""),
        });
        // Purple "velvet rope" marker.
        overlay
          .fillStyle(0x8e44ad, 0.5)
          .fillRect(obj.tileX * TILE_SIZE, obj.tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  /** Open dialogue with an NPC the player is facing, if any. */
  private tryInteract(): void {
    const facing = this.player.direction;
    const { x: dx, y: dy } = DIRECTION_VECTORS[facing];
    const targetX = this.player.tileX + dx;
    const targetY = this.player.tileY + dy;

    // Rehearsal studio heal point.
    if (this.healTiles.has(key(targetX, targetY))) {
      healParty(this.party());
      console.log("party healed");
      this.openDialogue(
        ["The band takes five and tunes up.", "Everyone's stamina is fully restored!"],
        "Rehearsal Studio",
      );
      return;
    }

    // Residency-gated warp (a bouncer).
    const gate = this.gateTiles.get(key(targetX, targetY));
    if (gate) {
      if (hasResidency(this.registry.get("residencies"), gate.requires)) {
        this.pendingWarp = { target: gate.target, entry: gate.entry };
      } else {
        const name = getResidency(gate.requires)?.name ?? "right residency";
        this.openDialogue(["A bouncer blocks the way.", `"${name} holders only."`], "Bouncer");
      }
      return;
    }

    // Trainer (rival / venue boss): battle if not yet beaten.
    const placed = this.trainers.find((t) => t.npc.occupies(targetX, targetY));
    if (placed) {
      placed.npc.faceTo(OPPOSITE[facing]);
      const trainer = getTrainer(placed.trainerId);
      if (isTrainerDefeated(this.registry.get("trainersDefeated"), placed.trainerId)) {
        if (trainer) this.openDialogue(trainer.postLine, trainer.name);
      } else {
        this.pendingTrainer = placed.trainerId;
      }
      return;
    }

    const npc = this.npcs.find((n) => n.occupies(targetX, targetY));
    if (!npc) return;

    const dialogue = getDialogue(npc.id);
    if (!dialogue) {
      console.warn(`No dialogue found for NPC id '${npc.id}'`);
      return;
    }

    npc.faceTo(OPPOSITE[facing]); // turn to face the player

    // Shop NPC: open the shop instead of plain dialogue.
    if (dialogue.shop) {
      this.scene.pause();
      this.scene.launch("ShopScene", {
        parent: this.scene.key,
        wares: dialogue.shop,
      } satisfies ShopData);
      return;
    }

    // Gift NPC: grant items/currency (once, if flagged) before the dialogue.
    if (dialogue.gift) this.applyGift(dialogue.gift);
    this.openDialogue(dialogue.pages, dialogue.speaker);
  }

  /** Grant a dialogue's gift into the registry bag/currency (respecting `once`). */
  private applyGift(gift: DialogueGift): void {
    const flags = this.registry.get("flags") as Record<string, boolean>;
    if (gift.once && flags[gift.once]) return;
    const bag = this.registry.get("bag") as Bag;
    for (const { id, qty } of gift.items ?? []) addItem(bag, id, qty);
    if (gift.currency) this.registry.set("currency", (this.registry.get("currency") ?? 0) + gift.currency);
    if (gift.once) flags[gift.once] = true;
    console.log("granted gift");
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
