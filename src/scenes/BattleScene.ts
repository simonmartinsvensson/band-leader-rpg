import Phaser from "phaser";
import { GAME_WIDTH } from "../data/constants";
import { AssetKeys } from "../data/assets";
import { GENRES } from "../data/genres";
import { createText } from "../ui/text";
import {
  createBattleState,
  resolveTurn,
  chooseOpponentAction,
  type BattleState,
  type BattleEvent,
  type Side,
} from "../systems/battle";
import { getTechnique } from "../data/techniques";
import type { MusicianInstance } from "../types/musician";

/** Scene data: a fake party + opponent + the scene to resume on exit. */
export interface BattleData {
  party: MusicianInstance[];
  opponent: MusicianInstance;
  parent: string;
}

type Phase = "intro" | "command" | "technique" | "busy" | "over";

interface Step {
  text?: string;
  apply?: () => void;
  delay?: number;
}

const COMMANDS = ["Perform", "Recruit", "Bag", "Run"] as const;
// 2x2 command layout inside the bottom box.
const COMMAND_POS = [
  { x: 130, y: 124 },
  { x: 188, y: 124 },
  { x: 130, y: 140 },
  { x: 188, y: 140 },
];
// Single-column technique list (left side of the box).
const TECH_POS = [
  { x: 16, y: 120 },
  { x: 16, y: 129 },
  { x: 16, y: 138 },
  { x: 16, y: 147 },
];

/**
 * 1v1 turn-based battle renderer. All combat *logic* lives in
 * src/systems/battle (pure + tested); this scene only collects the player's
 * action, asks the engine to resolve a turn, and plays back the resulting
 * events (messages + HP bar updates).
 */
export class BattleScene extends Phaser.Scene {
  private battle!: BattleState;
  private parent = "OverworldScene";
  private phase: Phase = "intro";

  private message!: Phaser.GameObjects.BitmapText;
  private prompt!: Phaser.GameObjects.BitmapText;
  private commandTexts: Phaser.GameObjects.BitmapText[] = [];
  private techTexts: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private commandIndex = 0;
  private techIndex = 0;
  private techniqueIds: string[] = [];

  private hpBars!: Record<Side, Phaser.GameObjects.Graphics>;
  private hpText!: Phaser.GameObjects.BitmapText;
  private sprites!: Record<Side, Phaser.GameObjects.Sprite>;

  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    confirm: Phaser.Input.Keyboard.Key[];
    cancel: Phaser.Input.Keyboard.Key[];
  };

  constructor() {
    super("BattleScene");
  }

  init(data: BattleData): void {
    this.battle = createBattleState(data.party[0], data.opponent);
    this.parent = data.parent ?? "OverworldScene";
    this.phase = "intro";
    this.commandIndex = 0;
    this.techIndex = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#283044");
    this.buildArena();
    this.buildBoxAndMenus();
    this.bindKeys();

    this.refreshHp("player");
    this.refreshHp("opponent");

    const opp = this.battle.opponent.instance;
    const me = this.battle.player.instance;
    this.phase = "busy";
    this.playSteps(
      [
        { text: `A wild ${opp.nickname} (Lv ${opp.level}) appeared!` },
        { text: `Go, ${me.nickname}!` },
      ],
      () => this.enterCommand(),
    );
  }

  update(): void {
    if (this.phase === "command") this.handleCommandInput();
    else if (this.phase === "technique") this.handleTechniqueInput();
  }

  // --- Layout ----------------------------------------------------------------

  private buildArena(): void {
    const platforms = this.add.graphics();
    platforms.fillStyle(0x3a4a63, 1);
    platforms.fillEllipse(186, 70, 64, 18);
    platforms.fillEllipse(58, 116, 70, 20);

    const opp = this.battle.opponent;
    const me = this.battle.player;
    const oppSprite = this.add
      .sprite(186, 56, AssetKeys.NPC)
      .setOrigin(0.5, 1)
      .setScale(3)
      .setTint(genreColor(opp.genres[0]));
    const playerSprite = this.add
      .sprite(58, 104, AssetKeys.PLAYER, 0)
      .setOrigin(0.5, 1)
      .setScale(3)
      .setTint(genreColor(me.genres[0]));
    this.sprites = { opponent: oppSprite, player: playerSprite };

    // Info boxes (name + Lv) — opponent top-left, player bottom-right.
    this.add.graphics().fillStyle(0x10101c, 0.85).fillRect(6, 8, 96, 22).lineStyle(1, 0xffffff, 0.8).strokeRect(6, 8, 96, 22);
    createText(this, 10, 11, `${opp.instance.nickname}  Lv${opp.instance.level}`);

    this.add
      .graphics()
      .fillStyle(0x10101c, 0.85)
      .fillRect(136, 74, 98, 30)
      .lineStyle(1, 0xffffff, 0.8)
      .strokeRect(136, 74, 98, 30);
    createText(this, 140, 77, `${me.instance.nickname}  Lv${me.instance.level}`);
    this.hpText = createText(this, 140, 96, "");

    this.hpBars = { player: this.add.graphics(), opponent: this.add.graphics() };
  }

  private buildBoxAndMenus(): void {
    this.add
      .graphics()
      .fillStyle(0x10101c, 0.95)
      .fillRect(4, 116, GAME_WIDTH - 8, 40)
      .lineStyle(1, 0xffffff, 1)
      .strokeRect(4, 116, GAME_WIDTH - 8, 40);

    // Full-width line used for intro / turn-resolution messages.
    this.message = createText(this, 12, 122, "", { maxWidth: GAME_WIDTH - 24 }).setVisible(false);
    // Left-half prompt shown alongside the menus (wraps so it can't overrun them).
    this.prompt = createText(this, 12, 122, "", { maxWidth: 110 }).setVisible(false);

    this.commandTexts = COMMANDS.map((label, i) => createText(this, COMMAND_POS[i].x, COMMAND_POS[i].y, label));
    this.techTexts = TECH_POS.map((p) => createText(this, p.x, p.y, ""));
    this.cursor = createText(this, 0, 0, ">").setVisible(false);
    this.hideMenus();
  }

  private bindKeys(): void {
    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    const k = (code: number) => kb.addKey(code);
    this.keys = {
      up: [k(KC.UP), k(KC.W)],
      down: [k(KC.DOWN), k(KC.S)],
      left: [k(KC.LEFT), k(KC.A)],
      right: [k(KC.RIGHT), k(KC.D)],
      confirm: [k(KC.SPACE), k(KC.ENTER)],
      cancel: [k(KC.ESC), k(KC.BACKSPACE)],
    };
  }

  // --- HP bars ---------------------------------------------------------------

  private refreshHp(side: Side): void {
    const inst = this.battle[side].instance;
    this.setHp(side, inst.currentStamina, inst.stats.stamina);
  }

  private setHp(side: Side, value: number, max: number): void {
    const ratio = max > 0 ? Math.max(0, value / max) : 0;
    const x = side === "opponent" ? 10 : 140;
    const y = side === "opponent" ? 24 : 90;
    const w = 88;
    const color = ratio > 0.5 ? 0x4caf50 : ratio > 0.2 ? 0xf1c40f : 0xe74c3c;

    const g = this.hpBars[side];
    g.clear();
    g.fillStyle(0x000000, 1).fillRect(x, y, w, 4);
    g.fillStyle(color, 1).fillRect(x, y, Math.round(w * ratio), 4);

    if (side === "player") this.hpText.setText(`${value}/${max}`);
  }

  // --- Menus -----------------------------------------------------------------

  private hideMenus(): void {
    this.commandTexts.forEach((t) => t.setVisible(false));
    this.techTexts.forEach((t) => t.setVisible(false));
    this.cursor.setVisible(false);
  }

  private enterCommand(): void {
    this.phase = "command";
    this.message.setVisible(false);
    this.techTexts.forEach((t) => t.setVisible(false));
    this.commandTexts.forEach((t) => t.setVisible(true));
    this.prompt.setPosition(12, 122).setText(`What will ${this.battle.player.instance.nickname} do?`).setVisible(true);
    this.moveCommandCursor();
    this.cursor.setVisible(true);
  }

  private moveCommandCursor(): void {
    const p = COMMAND_POS[this.commandIndex];
    this.cursor.setPosition(p.x - 10, p.y);
  }

  private handleCommandInput(): void {
    if (this.pressed("left") && this.commandIndex % 2 === 1) this.commandIndex--;
    else if (this.pressed("right") && this.commandIndex % 2 === 0) this.commandIndex++;
    else if (this.pressed("up") && this.commandIndex >= 2) this.commandIndex -= 2;
    else if (this.pressed("down") && this.commandIndex < 2) this.commandIndex += 2;
    this.moveCommandCursor();

    if (!this.pressed("confirm")) return;
    switch (COMMANDS[this.commandIndex]) {
      case "Perform":
        this.enterTechnique();
        break;
      case "Recruit":
        this.runMessages(["You can't recruit yet!"], () => this.enterCommand());
        break;
      case "Bag":
        this.runMessages(["Your bag is empty!"], () => this.enterCommand());
        break;
      case "Run":
        this.doRun();
        break;
    }
  }

  private enterTechnique(): void {
    this.phase = "technique";
    this.techIndex = 0;
    this.techniqueIds = this.battle.player.instance.techniques.slice(0, 4);
    this.message.setVisible(false);
    this.commandTexts.forEach((t) => t.setVisible(false));
    this.techTexts.forEach((t, i) => {
      const tech = getTechnique(this.techniqueIds[i]);
      t.setText(tech ? tech.name : "");
      t.setVisible(Boolean(tech));
    });
    this.prompt.setPosition(150, 122).setText("Esc: Back").setVisible(true);
    this.moveTechCursor();
    this.cursor.setVisible(true);
  }

  private moveTechCursor(): void {
    const p = TECH_POS[this.techIndex];
    this.cursor.setPosition(p.x - 10, p.y);
  }

  private handleTechniqueInput(): void {
    if (this.pressed("cancel")) {
      this.enterCommand();
      return;
    }
    const count = this.techniqueIds.length;
    if (this.pressed("up") && this.techIndex > 0) this.techIndex--;
    else if (this.pressed("down") && this.techIndex + 1 < count) this.techIndex++;
    this.moveTechCursor();

    if (this.pressed("confirm")) this.performTechnique(this.techniqueIds[this.techIndex]);
  }

  // --- Turn resolution -------------------------------------------------------

  private performTechnique(techniqueId: string): void {
    this.hideMenus();
    const events = resolveTurn(
      this.battle,
      { kind: "perform", techniqueId },
      chooseOpponentAction(this.battle.opponent),
    );
    this.playEvents(events);
  }

  private doRun(): void {
    this.hideMenus();
    const events = resolveTurn(this.battle, { kind: "run" }, { kind: "run" });
    this.playEvents(events);
  }

  private playEvents(events: BattleEvent[]): void {
    this.phase = "busy";
    this.playSteps(this.eventsToSteps(events), () => {
      if (this.battle.outcome === "ongoing") this.enterCommand();
      else this.endBattle();
    });
  }

  private eventsToSteps(events: BattleEvent[]): Step[] {
    const steps: Step[] = [];
    for (const ev of events) {
      switch (ev.type) {
        case "action":
          steps.push({ text: `${this.label(ev.side)} uses ${ev.technique}!` });
          break;
        case "miss":
          steps.push({ text: `${this.label(ev.side)}'s technique missed!` });
          break;
        case "damage":
          steps.push({ apply: () => this.setHp(ev.target, ev.remaining, ev.max), delay: 350 });
          break;
        case "effectiveness":
          steps.push({ text: ev.multiplier > 1 ? "It's a showstopper!" : "It falls flat..." });
          break;
        case "statChange":
          steps.push({ text: `${this.label(ev.target)}'s ${ev.stat} ${ev.delta > 0 ? "rose" : "fell"}!` });
          break;
        case "faint":
          steps.push({ text: `${this.label(ev.side)} fainted!`, apply: () => this.dim(ev.side) });
          break;
        case "run":
          steps.push({ text: ev.success ? "Got away safely!" : "Couldn't get away!" });
          break;
        case "outcome": {
          const text =
            ev.outcome === "player_won"
              ? "You won the gig!"
              : ev.outcome === "player_lost"
                ? "Your musician fainted!"
                : "";
          if (text) steps.push({ text });
          break;
        }
        case "message":
          steps.push({ text: ev.text });
          break;
      }
    }
    return steps;
  }

  private playSteps(steps: Step[], onDone: () => void): void {
    this.hideMenus();
    this.prompt.setVisible(false);
    this.message.setVisible(true);
    let i = 0;
    const next = () => {
      if (i >= steps.length) {
        onDone();
        return;
      }
      const step = steps[i++];
      step.apply?.();
      if (step.text) this.message.setText(step.text);
      this.time.delayedCall(step.delay ?? (step.text ? 900 : 300), next);
    };
    next();
  }

  private runMessages(texts: string[], onDone: () => void): void {
    this.phase = "busy";
    this.hideMenus();
    this.playSteps(
      texts.map((text) => ({ text })),
      onDone,
    );
  }

  private endBattle(): void {
    this.phase = "over";
    console.log(`battle outcome: ${this.battle.outcome}`);
    this.scene.resume(this.parent);
    this.scene.stop();
  }

  // --- Helpers ---------------------------------------------------------------

  private label(side: Side): string {
    const name = this.battle[side].instance.nickname;
    return side === "opponent" ? `Wild ${name}` : name;
  }

  private dim(side: Side): void {
    this.sprites[side].setAlpha(0.3); // fade the fainted battler
  }

  /** True once this frame if any bound key for the action was just pressed. */
  private pressed(action: keyof BattleScene["keys"]): boolean {
    return this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}

function genreColor(genre: string | undefined): number {
  return genre && genre in GENRES ? GENRES[genre as keyof typeof GENRES].color : 0xffffff;
}
