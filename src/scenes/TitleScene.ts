import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { hasSave, loadSave, clearSave, applyToStore, type SaveStore } from "../systems/save";

const SAVE_KEYS = ["party", "roster", "bag", "currency", "flags", "trainersDefeated", "residencies", "loc"];

/**
 * Title screen shown on boot. "Continue" (only if a save exists) resumes from
 * localStorage; "New Game" wipes the save (after a confirm) and runs the intro.
 */
export class TitleScene extends Phaser.Scene {
  private options: string[] = [];
  private index = 0;
  private confirming = false; // New Game over an existing save -> Yes/No
  private confirmYes = false;

  private optionTexts: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private prompt!: Phaser.GameObjects.BitmapText;
  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    confirm: Phaser.Input.Keyboard.Key[];
    cancel: Phaser.Input.Keyboard.Key[];
  };

  constructor() {
    super("TitleScene");
  }

  create(): void {
    this.add.graphics().fillStyle(0x0b0b12, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    createText(this, GAME_WIDTH / 2, 34, "BAND LEADER", { color: 0xffd54f, origin: 0.5 });
    createText(this, GAME_WIDTH / 2, 48, "a band-leader RPG", { color: 0x8b8b9b, origin: 0.5 });

    this.options = hasSave() ? ["Continue", "New Game"] : ["New Game"];
    this.index = 0;
    this.optionTexts = this.options.map((label, i) =>
      createText(this, GAME_WIDTH / 2, 84 + i * 14, label, { origin: 0.5 }),
    );
    this.cursor = createText(this, 0, 0, ">");
    this.prompt = createText(this, GAME_WIDTH / 2, GAME_HEIGHT - 14, "", { color: 0x8b8b9b, origin: 0.5 });

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
    if (this.confirming) {
      this.updateConfirm();
      return;
    }
    if (this.pressed("up") && this.index > 0) this.index--;
    else if (this.pressed("down") && this.index < this.options.length - 1) this.index++;
    this.refresh();

    if (this.pressed("confirm")) this.select(this.options[this.index]);
  }

  private select(option: string): void {
    if (option === "Continue") this.continueGame();
    else if (hasSave()) this.enterConfirm();
    else this.startNewGame();
  }

  // --- New Game confirmation -------------------------------------------------

  private enterConfirm(): void {
    this.confirming = true;
    this.confirmYes = false;
    this.refresh();
  }

  private updateConfirm(): void {
    if (this.pressed("up") || this.pressed("down")) this.confirmYes = !this.confirmYes;
    if (this.pressed("cancel")) {
      this.confirming = false;
      this.refresh();
      return;
    }
    if (this.pressed("confirm")) {
      if (this.confirmYes) this.startNewGame();
      else {
        this.confirming = false;
        this.refresh();
      }
    } else {
      this.refresh();
    }
  }

  // --- Outcomes --------------------------------------------------------------

  private continueGame(): void {
    const save = loadSave();
    if (!save) {
      this.startNewGame();
      return;
    }
    applyToStore(this.registry as unknown as SaveStore, save);
    this.scene.start("OverworldScene", { map: save.map, x: save.x, y: save.y });
  }

  private startNewGame(): void {
    clearSave();
    for (const key of SAVE_KEYS) this.registry.remove(key); // ensure a clean slate
    this.scene.start("OverworldScene", { newGame: true });
  }

  private refresh(): void {
    if (this.confirming) {
      this.optionTexts.forEach((t) => t.setVisible(false));
      this.cursor.setVisible(false);
      this.prompt.setText(`Erase your saved game?   ${this.confirmYes ? "[Yes]  No" : " Yes  [No]"}`);
      return;
    }
    this.optionTexts.forEach((t, i) => {
      t.setVisible(true);
      t.setTint(i === this.index ? 0xffd54f : 0xffffff);
    });
    const sel = this.optionTexts[this.index];
    this.cursor.setVisible(true).setPosition(sel.x - sel.width / 2 - 8, sel.y - 4);
    this.prompt.setText("Up/Down  Space: select");
  }

  private pressed(action: keyof TitleScene["keys"]): boolean {
    return this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}
