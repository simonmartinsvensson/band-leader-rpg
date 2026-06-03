import Phaser from "phaser";
import { GAME_WIDTH } from "../data/constants";
import { AssetKeys, AudioKeys, battlerKey } from "../data/assets";
import { audio } from "../systems/audio";
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
import { awardXp, xpReward } from "../systems/progression";
import { firstAliveIndex, healParty } from "../systems/party";
import { makeBattler } from "../systems/battle";
import { auditionAttempt } from "../systems/recruit";
import { recruit } from "../systems/roster";
import { restoreStamina } from "../systems/inventory";
import { addResidency, markTrainerDefeated } from "../systems/career";
import { getSpecies } from "../data/species";
import { getResidency } from "../data/residencies";
import { ITEMS, getItem } from "../data/items";
import type { MusicianInstance } from "../types/musician";

/** Scene data: the player's party + opponent + the scene to resume on exit. */
/** Trainer descriptor for a trainer battle (omitted for wild battles). */
export interface BattleTrainer {
  id: string;
  name: string;
  reward: number;
  residency?: string;
  /** Story flag set on defeat (advances the main objective). */
  storyFlag?: string;
  defeatLine: string[];
}

export interface BattleData {
  party: MusicianInstance[];
  /** Opponent team — one for a wild battle, several for a trainer. */
  opponents: MusicianInstance[];
  parent: string;
  /** Present for trainer battles (no recruiting/running; reward + residency). */
  trainer?: BattleTrainer;
}

type Phase = "intro" | "command" | "technique" | "switch" | "bag" | "busy" | "over";

interface Step {
  text?: string;
  apply?: () => void;
  delay?: number;
}

const COMMANDS = ["Perform", "Switch", "Recruit", "Bag", "Run"] as const;
// 2-column layout inside the bottom box (rows of 2).
const COMMAND_POS = [
  { x: 130, y: 122 },
  { x: 188, y: 122 },
  { x: 130, y: 134 },
  { x: 188, y: 134 },
  { x: 130, y: 146 },
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

  private party: MusicianInstance[] = [];
  private activeIndex = 0;
  private participants = new Set<MusicianInstance>();

  private opponents: MusicianInstance[] = [];
  private opponentIndex = 0;
  private trainer?: BattleTrainer;

  private message!: Phaser.GameObjects.BitmapText;
  private prompt!: Phaser.GameObjects.BitmapText;
  private commandTexts: Phaser.GameObjects.BitmapText[] = [];
  private techTexts: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private commandIndex = 0;
  private techIndex = 0;
  private techniqueIds: string[] = [];
  private switchOptions: number[] = []; // party indices selectable when switching
  private switchVoluntary = false; // true = chosen from the menu (uses the turn)
  private bagItems: string[] = []; // item ids selectable in the bag

  private hpBars!: Record<Side, Phaser.GameObjects.Graphics>;
  private lastHp: Record<Side, number> = { player: 0, opponent: 0 }; // for damage numbers
  private hpText!: Phaser.GameObjects.BitmapText;
  private playerName!: Phaser.GameObjects.BitmapText;
  private opponentName!: Phaser.GameObjects.BitmapText;
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
    this.party = data.party;
    this.opponents = data.opponents;
    this.opponentIndex = 0;
    this.trainer = data.trainer;
    this.activeIndex = Math.max(0, firstAliveIndex(data.party));
    this.battle = createBattleState(this.party[this.activeIndex], this.opponents[0]);
    this.participants = new Set([this.party[this.activeIndex]]);
    this.parent = data.parent ?? "OverworldScene";
    this.phase = "intro";
    this.commandIndex = 0;
    this.techIndex = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#283044");
    this.cameras.main.fadeIn(260, 0, 0, 0); // fade in from the overworld
    audio.playMusic(AudioKeys.MUSIC_BATTLE);
    this.buildArena();
    this.buildBoxAndMenus();
    this.bindKeys();

    this.refreshHp("player");
    this.refreshHp("opponent");
    this.lastHp = {
      player: this.battle.player.instance.currentStamina,
      opponent: this.battle.opponent.instance.currentStamina,
    };

    this.introAnimate();

    const opp = this.battle.opponent.instance;
    const me = this.battle.player.instance;
    this.phase = "busy";
    const intro: Step[] = this.trainer
      ? [{ text: `${this.trainer.name} wants to battle!` }, { text: `${this.trainer.name} sent out ${opp.nickname}!` }]
      : [{ text: `A wild ${opp.nickname} (Lv ${opp.level}) appeared!` }];
    intro.push({ text: `Go, ${me.nickname}!` });
    this.playSteps(intro, () => this.enterCommand());
  }

  /** Brief entrance: the battlers slide in from off-stage and fade up. */
  private introAnimate(): void {
    const slide = (sprite: Phaser.GameObjects.Sprite, fromDx: number) => {
      const targetX = sprite.x;
      sprite.setX(targetX + fromDx).setAlpha(0);
      this.tweens.add({ targets: sprite, x: targetX, alpha: 1, duration: 300, ease: "Quad.easeOut" });
    };
    slide(this.sprites.opponent, 90); // in from the right
    slide(this.sprites.player, -90); // in from the left
  }

  update(): void {
    if (this.phase === "command") this.handleCommandInput();
    else if (this.phase === "technique") this.handleTechniqueInput();
    else if (this.phase === "switch") this.handleSwitchInput();
    else if (this.phase === "bag") this.handleBagInput();
  }

  // --- Layout ----------------------------------------------------------------

  /** The battle sprite key for a species, falling back to the NPC placeholder. */
  private battlerTexture(speciesId: string): string {
    const key = battlerKey(speciesId);
    return this.textures.exists(key) ? key : AssetKeys.NPC;
  }

  private buildArena(): void {
    const platforms = this.add.graphics();
    platforms.fillStyle(0x3a4a63, 1);
    platforms.fillEllipse(186, 72, 64, 18);
    platforms.fillEllipse(58, 112, 70, 20);

    const opp = this.battle.opponent;
    const me = this.battle.player;
    // Per-species battle sprites (full-color art — no genre tint). Drawn at 2x
    // (32x32 source -> 64px tall) and standing on their platforms (origin 0.5,1).
    const oppSprite = this.add
      .sprite(186, 70, this.battlerTexture(opp.instance.speciesId))
      .setOrigin(0.5, 1)
      .setScale(2);
    const playerSprite = this.add
      .sprite(58, 108, this.battlerTexture(me.instance.speciesId))
      .setOrigin(0.5, 1)
      .setScale(2);
    this.sprites = { opponent: oppSprite, player: playerSprite };

    // Info boxes (name + Lv) — opponent top-left, player bottom-right.
    this.add.graphics().fillStyle(0x10101c, 0.85).fillRect(6, 8, 96, 22).lineStyle(1, 0xffffff, 0.8).strokeRect(6, 8, 96, 22);
    this.opponentName = createText(this, 10, 11, `${opp.instance.nickname}  Lv${opp.instance.level}`);

    this.add
      .graphics()
      .fillStyle(0x10101c, 0.85)
      .fillRect(136, 74, 98, 30)
      .lineStyle(1, 0xffffff, 0.8)
      .strokeRect(136, 74, 98, 30);
    this.playerName = createText(this, 140, 77, `${me.instance.nickname}  Lv${me.instance.level}`);
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
    const last = COMMANDS.length - 1;
    const before = this.commandIndex;
    if (this.pressed("left") && this.commandIndex % 2 === 1) this.commandIndex--;
    else if (this.pressed("right") && this.commandIndex % 2 === 0 && this.commandIndex < last) this.commandIndex++;
    else if (this.pressed("up") && this.commandIndex >= 2) this.commandIndex -= 2;
    else if (this.pressed("down") && this.commandIndex + 2 <= last) this.commandIndex += 2;
    if (this.commandIndex !== before) audio.sfx(AudioKeys.SFX_MOVE);
    this.moveCommandCursor();

    if (!this.pressed("confirm")) return;
    audio.sfx(AudioKeys.SFX_CONFIRM);
    switch (COMMANDS[this.commandIndex]) {
      case "Perform":
        this.enterTechnique();
        break;
      case "Switch":
        this.tryVoluntarySwitch();
        break;
      case "Recruit":
        if (this.trainer) this.runMessages(["You can't recruit a rival's musician!"], () => this.enterCommand());
        else this.tryRecruit(1); // plain audition
        break;
      case "Bag":
        this.enterBag();
        break;
      case "Run":
        if (this.trainer) this.runMessages(["There's no bailing on a showcase!"], () => this.enterCommand());
        else this.doRun();
        break;
    }
  }

  /** Voluntary mid-battle switch (uses the turn). No reserve -> a message. */
  private tryVoluntarySwitch(): void {
    this.switchOptions = this.party
      .map((_, i) => i)
      .filter((i) => i !== this.activeIndex && this.party[i].currentStamina > 0);
    if (this.switchOptions.length === 0) {
      this.runMessages(["No one else can take the stage!"], () => this.enterCommand());
      return;
    }
    this.enterSwitch(true);
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
      audio.sfx(AudioKeys.SFX_CANCEL);
      this.enterCommand();
      return;
    }
    const count = this.techniqueIds.length;
    const before = this.techIndex;
    if (this.pressed("up") && this.techIndex > 0) this.techIndex--;
    else if (this.pressed("down") && this.techIndex + 1 < count) this.techIndex++;
    if (this.techIndex !== before) audio.sfx(AudioKeys.SFX_MOVE);
    this.moveTechCursor();

    if (this.pressed("confirm")) {
      audio.sfx(AudioKeys.SFX_CONFIRM);
      this.performTechnique(this.techniqueIds[this.techIndex]);
    }
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

  // --- Forced switch (active musician fainted) -------------------------------

  private enterSwitch(voluntary = false): void {
    this.phase = "switch";
    this.switchVoluntary = voluntary;
    this.techIndex = 0;
    this.message.setVisible(false);
    this.commandTexts.forEach((t) => t.setVisible(false));
    const shown = this.switchOptions.slice(0, TECH_POS.length);
    this.techTexts.forEach((t, i) => {
      const pi = shown[i];
      if (pi === undefined) {
        t.setVisible(false);
        return;
      }
      const m = this.party[pi];
      t.setText(`${m.nickname} Lv${m.level} (${m.currentStamina}/${m.stats.stamina})`);
      t.setVisible(true);
    });
    this.prompt.setPosition(150, 122).setText(voluntary ? "Esc: Back" : "Choose!").setVisible(true);
    this.moveTechCursor();
    this.cursor.setVisible(true);
  }

  private handleSwitchInput(): void {
    if (this.switchVoluntary && this.pressed("cancel")) {
      audio.sfx(AudioKeys.SFX_CANCEL);
      this.enterCommand();
      return;
    }
    const count = Math.min(this.switchOptions.length, TECH_POS.length);
    const before = this.techIndex;
    if (this.pressed("up") && this.techIndex > 0) this.techIndex--;
    else if (this.pressed("down") && this.techIndex + 1 < count) this.techIndex++;
    if (this.techIndex !== before) audio.sfx(AudioKeys.SFX_MOVE);
    this.moveTechCursor();
    if (this.pressed("confirm")) {
      audio.sfx(AudioKeys.SFX_CONFIRM);
      this.doSwitch(this.switchOptions[this.techIndex]);
    }
  }

  private doSwitch(partyIndex: number): void {
    const voluntary = this.switchVoluntary;
    this.activeIndex = partyIndex;
    const inst = this.party[partyIndex];
    this.battle.player = makeBattler(inst);
    this.battle.outcome = "ongoing";
    this.participants.add(inst);
    this.sprites.player.setAlpha(1).setY(108).setTexture(this.battlerTexture(inst.speciesId)).clearTint();
    this.playerName.setText(`${inst.nickname}  Lv${inst.level}`);
    this.refreshHp("player");
    this.lastHp.player = inst.currentStamina;
    // A voluntary switch spends the turn — the opponent gets to act. A forced
    // switch (after a faint) resumes the player's command on the new turn.
    this.runMessages([`Go, ${inst.nickname}!`], () => (voluntary ? this.opponentCounter() : this.enterCommand()));
  }

  // --- Bag / recruiting ------------------------------------------------------

  private bag(): Record<string, number> {
    return this.registry.get("bag") ?? {};
  }

  private enterBag(): void {
    const bag = this.bag();
    this.bagItems = Object.keys(bag).filter((id) => bag[id] > 0 && getItem(id)?.usableInBattle);
    if (this.bagItems.length === 0) {
      this.runMessages(["Your bag is empty!"], () => this.enterCommand());
      return;
    }
    this.phase = "bag";
    this.techIndex = 0;
    this.message.setVisible(false);
    this.commandTexts.forEach((t) => t.setVisible(false));
    const shown = this.bagItems.slice(0, TECH_POS.length);
    this.techTexts.forEach((t, i) => {
      const id = shown[i];
      if (id === undefined) {
        t.setVisible(false);
        return;
      }
      t.setText(`${ITEMS[id].name} x${bag[id]}`);
      t.setVisible(true);
    });
    this.prompt.setPosition(150, 122).setText("Esc: Back").setVisible(true);
    this.moveTechCursor();
    this.cursor.setVisible(true);
  }

  private handleBagInput(): void {
    if (this.pressed("cancel")) {
      audio.sfx(AudioKeys.SFX_CANCEL);
      this.enterCommand();
      return;
    }
    const count = Math.min(this.bagItems.length, TECH_POS.length);
    const before = this.techIndex;
    if (this.pressed("up") && this.techIndex > 0) this.techIndex--;
    else if (this.pressed("down") && this.techIndex + 1 < count) this.techIndex++;
    if (this.techIndex !== before) audio.sfx(AudioKeys.SFX_MOVE);
    this.moveTechCursor();
    if (this.pressed("confirm")) {
      audio.sfx(AudioKeys.SFX_CONFIRM);
      this.useBattleItem(this.bagItems[this.techIndex]);
    }
  }

  /** Apply an item in battle by its effect; all uses cost the player's turn. */
  private useBattleItem(id: string): void {
    const item = getItem(id);
    if (!item) return;
    switch (item.effect.kind) {
      case "recruit":
        this.tryRecruit(item.effect.modifier, id);
        return;
      case "restoreStamina": {
        this.hideMenus();
        this.phase = "busy";
        this.consumeItem(id);
        const inst = this.battle.player.instance;
        const healed = restoreStamina(inst, item.effect.amount);
        this.setHp("player", inst.currentStamina, inst.stats.stamina);
        this.playSteps(
          [{ text: `You use the ${item.name}!` }, { text: `${inst.nickname} recovered ${healed} stamina!` }],
          () => this.opponentCounter(),
        );
        return;
      }
      case "boostStat": {
        this.hideMenus();
        this.phase = "busy";
        this.consumeItem(id);
        const b = this.battle.player;
        const stat = item.effect.stat;
        b.stages[stat] = Math.max(-6, Math.min(6, b.stages[stat] + item.effect.stages));
        this.playSteps(
          [{ text: `You use the ${item.name}!` }, { text: `${b.instance.nickname}'s ${stat} rose!` }],
          () => this.opponentCounter(),
        );
        return;
      }
    }
  }

  /** Attempt an audition; success recruits, failure costs the player's turn. */
  private tryRecruit(itemModifier: number, itemId?: string): void {
    this.hideMenus();
    this.phase = "busy";
    const opp = this.battle.opponent.instance;
    const difficulty = getSpecies(opp.speciesId)?.recruitDifficulty ?? 0.3;
    const result = auditionAttempt(
      { maxStamina: opp.stats.stamina, curStamina: opp.currentStamina, difficulty, itemModifier },
    );
    if (itemId) this.consumeItem(itemId);

    const steps: Step[] = [];
    if (itemId) steps.push({ text: `You play a ${ITEMS[itemId]?.name ?? "tape"}!` });
    steps.push({ text: `${this.label("opponent")} sizes up your band...` });
    const wobbles = result.success ? 3 : Math.min(result.shakes, 3);
    for (let i = 0; i < wobbles; i++) {
      steps.push({ apply: () => this.wobble(), text: ".".repeat(i + 1), delay: 500 });
    }

    if (result.success) {
      const dest = recruit(this.party, this.registry.get("roster") ?? [], opp);
      steps.push({ text: "They want to join your band!", apply: () => audio.sfx(AudioKeys.SFX_RECRUIT) });
      steps.push({
        text: dest === "party" ? `${opp.nickname} joined the band!` : `${opp.nickname} was sent to the roster.`,
      });
      this.playSteps(steps, () => {
        console.log(`battle outcome: recruited (${dest})`);
        this.exitTo();
      });
    } else {
      steps.push({ text: "They walked off...", apply: () => this.sprites.opponent.setAlpha(1) });
      this.playSteps(steps, () => this.opponentCounter());
    }
  }

  private opponentCounter(): void {
    // The audition used the player's turn; the opponent still acts.
    const events = resolveTurn(this.battle, { kind: "recruit" }, chooseOpponentAction(this.battle.opponent));
    this.playEvents(events);
  }

  private consumeItem(id: string): void {
    const bag = this.bag();
    if (bag[id]) bag[id] -= 1;
  }

  private wobble(): void {
    const s = this.sprites.opponent;
    this.tweens.add({ targets: s, x: s.x - 4, duration: 80, yoyo: true, repeat: 1 });
  }

  private playEvents(events: BattleEvent[]): void {
    this.phase = "busy";
    this.playSteps(this.eventsToSteps(events), () => {
      switch (this.battle.outcome) {
        case "ongoing":
          this.enterCommand();
          break;
        case "player_won":
          this.handleOpponentDefeated();
          break;
        case "player_lost":
          this.handleActiveFaint();
          break;
        default:
          this.endBattle();
      }
    });
  }

  /** Current opponent fainted: award XP, then send the next one or finish. */
  private handleOpponentDefeated(): void {
    const reward = xpReward(this.battle.opponent.instance);
    const steps: Step[] = [];
    for (const inst of this.participants) {
      if (inst.currentStamina <= 0) continue;
      steps.push({ text: `${inst.nickname} gained ${reward} XP!` });
      for (const up of awardXp(inst, reward)) {
        steps.push({ text: `${inst.nickname} grew to Lv ${up.level}!`, apply: () => audio.sfx(AudioKeys.SFX_LEVELUP) });
        for (const id of up.forgot) steps.push({ text: `${inst.nickname} forgot ${techName(id)}.` });
        for (const id of up.learned) steps.push({ text: `${inst.nickname} learned ${techName(id)}!` });
      }
    }
    this.refreshHp("player"); // max stamina may have grown
    this.lastHp.player = this.battle.player.instance.currentStamina;
    this.playerName.setText(`${this.battle.player.instance.nickname}  Lv${this.battle.player.instance.level}`);

    this.phase = "busy";
    if (this.opponentIndex + 1 < this.opponents.length) {
      this.playSteps(steps, () => this.sendNextOpponent());
    } else if (this.trainer) {
      this.playSteps(steps, () => this.finishTrainerVictory());
    } else {
      console.log(`battle outcome: player_won (xp ${reward})`);
      this.playSteps(steps, () => this.endBattle());
    }
  }

  /** Trainer sends out their next musician. */
  private sendNextOpponent(): void {
    this.opponentIndex++;
    const next = this.opponents[this.opponentIndex];
    this.battle.opponent = makeBattler(next);
    this.battle.outcome = "ongoing";
    this.sprites.opponent.setAlpha(1).setY(70).setTexture(this.battlerTexture(next.speciesId)).clearTint();
    this.opponentName.setText(`${next.nickname}  Lv${next.level}`);
    this.refreshHp("opponent");
    this.lastHp.opponent = next.currentStamina;
    this.runMessages([`${this.trainer?.name ?? "Wild"} sent out ${next.nickname}!`], () => this.enterCommand());
  }

  /** Whole trainer team defeated: pay out, record, grant residency, exit. */
  private finishTrainerVictory(): void {
    const trainer = this.trainer!;
    const messages = [`You defeated ${trainer.name}!`, ...trainer.defeatLine];

    this.registry.set("currency", (this.registry.get("currency") ?? 0) + trainer.reward);
    messages.push(`You got $${trainer.reward}!`);
    markTrainerDefeated(this.registry.get("trainersDefeated") ?? {}, trainer.id);

    if (trainer.residency) {
      addResidency(this.registry.get("residencies") ?? [], trainer.residency);
      const name = getResidency(trainer.residency)?.name ?? "residency";
      messages.push(`You earned the ${name}!`);
    }

    // Advance the main story: defeating a venue boss (or the finale) sets a flag.
    if (trainer.storyFlag) {
      const flags = (this.registry.get("flags") ?? {}) as Record<string, boolean>;
      flags[trainer.storyFlag] = true;
      this.registry.set("flags", flags);
    }

    console.log(`battle outcome: trainer_defeated ${trainer.id}${trainer.residency ? ` residency:${trainer.residency}` : ""}`);
    this.runMessages(messages, () => this.endBattle());
  }

  /** Active musician fainted: switch to a reserve, or lose if none remain. */
  private handleActiveFaint(): void {
    this.switchOptions = this.party
      .map((_, i) => i)
      .filter((i) => i !== this.activeIndex && this.party[i].currentStamina > 0);
    if (this.switchOptions.length === 0) {
      this.handleDefeat();
      return;
    }
    this.enterSwitch();
  }

  private handleDefeat(): void {
    healParty(this.party); // patched up on the way back
    console.log("battle outcome: player_lost");
    this.runMessages(["All your musicians fainted!", "You head back to the studio..."], () => {
      const cam = this.cameras.main;
      cam.fadeOut(300, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start("OverworldScene", { map: "studio", entry: "studio_entry" });
        this.scene.stop();
      });
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
          steps.push({ apply: () => this.onDamage(ev.target, ev.amount, ev.remaining, ev.max), delay: 400 });
          break;
        case "effectiveness":
          steps.push({ text: ev.multiplier > 1 ? "It's a showstopper!" : "It falls flat..." });
          break;
        case "statChange":
          steps.push({ text: `${this.label(ev.target)}'s ${ev.stat} ${ev.delta > 0 ? "rose" : "fell"}!` });
          break;
        case "faint":
          steps.push({
            text: `${this.label(ev.side)} fainted!`,
            apply: () => {
              audio.sfx(AudioKeys.SFX_FAINT);
              this.faintDrop(ev.side);
            },
          });
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
      this.time.delayedCall(step.delay ?? (step.text ? 800 : 280), next);
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
    console.log(`battle outcome: ${this.battle.outcome}`);
    this.exitTo();
  }

  /** Fade out, then resume the parent (overworld) and close the battle. */
  private exitTo(): void {
    this.phase = "over";
    const cam = this.cameras.main;
    cam.fadeOut(220, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.resume(this.parent); // overworld's "resume" handler restores its music
      this.scene.stop();
    });
  }

  // --- Helpers ---------------------------------------------------------------

  private label(side: Side): string {
    const name = this.battle[side].instance.nickname;
    return side === "opponent" ? `Wild ${name}` : name;
  }

  /** Damage landed: update the bar, flash + shake the target, float a number. */
  private onDamage(side: Side, amount: number, remaining: number, max: number): void {
    this.setHp(side, remaining, max);
    if (amount <= 0) {
      this.lastHp[side] = remaining;
      return;
    }
    audio.sfx(AudioKeys.SFX_HIT);
    this.hitFlash(side);
    this.floatDamage(side, amount);
    this.lastHp[side] = remaining;
  }

  /** A quick white flash + side-to-side shake on the struck battler. */
  private hitFlash(side: Side): void {
    const s = this.sprites[side];
    s.setTintFill(0xffffff);
    this.time.delayedCall(70, () => s.clearTint());
    this.tweens.add({ targets: s, x: s.x - 4, duration: 45, yoyo: true, repeat: 2 });
  }

  /** A rising, fading "-N" damage number over the struck battler. */
  private floatDamage(side: Side, amount: number): void {
    const s = this.sprites[side];
    const label = createText(this, Math.round(s.x), Math.round(s.y - 28), `-${amount}`, {
      color: 0xff5555,
      origin: 0.5,
    }).setDepth(30);
    this.tweens.add({
      targets: label,
      y: label.y - 14,
      alpha: { from: 1, to: 0 },
      duration: 520,
      ease: "Quad.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private faintDrop(side: Side): void {
    const s = this.sprites[side];
    this.tweens.add({ targets: s, y: s.y + 8, alpha: 0.25, duration: 280, ease: "Quad.easeIn" });
  }

  /** True once this frame if any bound key for the action was just pressed. */
  private pressed(action: keyof BattleScene["keys"]): boolean {
    return this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}

function techName(id: string): string {
  return getTechnique(id)?.name ?? id;
}
