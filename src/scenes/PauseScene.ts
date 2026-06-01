import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { saveGame, type SaveStore } from "../systems/save";
import type { PartyData } from "./PartyScene";
import type { BagData } from "./BagScene";
import type { CareerData } from "./CareerScene";

export interface PauseData {
  parent: string;
}

const OPTIONS = ["Save Game", "Party", "Bag", "Career", "Resume"] as const;

/**
 * Main pause menu (overworld key Esc). Saves the game to localStorage, opens
 * the party/bag/career overlays, or resumes. The overworld stays paused
 * underneath; sub-menus resume it directly on close.
 */
export class PauseScene extends Phaser.Scene {
  private parent = "OverworldScene";
  private index = 0;
  private busy = false;

  private cursor!: Phaser.GameObjects.BitmapText;
  private status!: Phaser.GameObjects.BitmapText;
  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    confirm: Phaser.Input.Keyboard.Key[];
    cancel: Phaser.Input.Keyboard.Key[];
  };

  constructor() {
    super("PauseScene");
  }

  init(data: PauseData): void {
    this.parent = data?.parent ?? "OverworldScene";
    this.index = 0;
    this.busy = false;
  }

  create(): void {
    this.add.graphics().fillStyle(0x0b0b12, 0.92).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.graphics().lineStyle(1, 0xffffff, 0.6).strokeRect(70, 30, 100, 96);
    createText(this, 78, 36, "PAUSE", { color: 0xffd54f });

    OPTIONS.forEach((label, i) => createText(this, 86, 52 + i * 12, label));
    this.cursor = createText(this, 76, 52, ">");
    this.status = createText(this, 8, GAME_HEIGHT - 10, "Up/Down  Space:select  Esc:resume", { color: 0x8b8b9b });

    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    const k = (c: number) => kb.addKey(c);
    this.keys = {
      up: [k(KC.UP), k(KC.W)],
      down: [k(KC.DOWN), k(KC.S)],
      confirm: [k(KC.SPACE), k(KC.ENTER)],
      cancel: [k(KC.ESC), k(KC.BACKSPACE)],
    };
    this.refresh();
  }

  update(): void {
    if (this.busy) return;
    if (this.pressed("cancel")) {
      this.resume();
      return;
    }
    if (this.pressed("up") && this.index > 0) this.index--;
    else if (this.pressed("down") && this.index < OPTIONS.length - 1) this.index++;
    this.refresh();

    if (this.pressed("confirm")) this.select(OPTIONS[this.index]);
  }

  private refresh(): void {
    this.cursor.setY(52 + this.index * 12);
  }

  private select(option: (typeof OPTIONS)[number]): void {
    switch (option) {
      case "Save Game": {
        const ok = saveGame(this.registry as unknown as SaveStore);
        console.log(`game ${ok ? "saved" : "save FAILED"}`);
        this.flash(ok ? "Game saved!" : "Save failed.");
        break;
      }
      case "Party":
        this.openSub("PartyScene", { parent: this.parent } satisfies PartyData);
        break;
      case "Bag":
        this.openSub("BagScene", { parent: this.parent } satisfies BagData);
        break;
      case "Career":
        this.openSub("CareerScene", { parent: this.parent } satisfies CareerData);
        break;
      case "Resume":
        this.resume();
        break;
    }
  }

  /** Hand off to a sub-overlay; it resumes the (still-paused) overworld on close. */
  private openSub(scene: string, data: object): void {
    this.scene.launch(scene, data);
    this.scene.stop();
  }

  private resume(): void {
    this.scene.resume(this.parent);
    this.scene.stop();
  }

  private flash(text: string): void {
    this.busy = true;
    this.status.setText(text).setTint(0x4caf50);
    this.time.delayedCall(700, () => {
      this.busy = false;
      this.status.setText("Up/Down  Space:select  Esc:resume").setTint(0x8b8b9b);
    });
  }

  private pressed(action: keyof PauseScene["keys"]): boolean {
    return this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}
