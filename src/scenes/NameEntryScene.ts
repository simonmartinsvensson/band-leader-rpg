import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { audio } from "../systems/audio";
import { AudioKeys } from "../data/assets";

export interface NameEntryData {
  parent: string;
  prompt?: string;
  default?: string;
  /** Called with the chosen (non-empty) name when the player confirms. */
  onDone: (name: string) => void;
}

const MAX_LEN = 10;

// Character grid. Letter rows append; the last row is commands. Works with the
// touch controls (D-pad = move, A = activate cell, B = delete) and a hardware
// keyboard (type letters/digits, Enter = confirm, Backspace = delete).
const ROWS: string[][] = [
  ["A", "B", "C", "D", "E", "F", "G"],
  ["H", "I", "J", "K", "L", "M", "N"],
  ["O", "P", "Q", "R", "S", "T", "U"],
  ["V", "W", "X", "Y", "Z", "-", "."],
  ["SPC", "DEL", "OK"],
];

interface Cell {
  label: string;
  x: number;
  y: number;
  text: Phaser.GameObjects.BitmapText;
}

/**
 * Modal name-entry overlay (used by the intro cutscene's `nameEntry` step).
 * Resolves via `onDone` with the chosen name, then resumes the parent scene.
 */
export class NameEntryScene extends Phaser.Scene {
  private parent = "OverworldScene";
  private fallback = "Newcomer";
  private value = "";

  private valueText!: Phaser.GameObjects.BitmapText;
  private cells: Cell[][] = [];
  private row = 0;
  private col = 0;
  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    activate: Phaser.Input.Keyboard.Key[];
    confirm: Phaser.Input.Keyboard.Key[];
    back: Phaser.Input.Keyboard.Key[];
  };
  private onDone: (name: string) => void = () => {};

  constructor() {
    super("NameEntryScene");
  }

  init(data: NameEntryData): void {
    this.parent = data?.parent ?? "OverworldScene";
    this.fallback = data?.default || "Newcomer";
    this.onDone = data?.onDone ?? (() => {});
    this.value = "";
    this.row = 0;
    this.col = 0;
    this.cells = [];
  }

  create(): void {
    this.add.graphics().fillStyle(0x0b0b12, 0.97).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    createText(this, GAME_WIDTH / 2, 10, "YOUR NAME?", { color: 0xffd54f, origin: 0.5 });

    // Entry field.
    this.add.graphics().lineStyle(1, 0xffffff, 0.6).strokeRect(40, 26, GAME_WIDTH - 80, 14);
    this.valueText = createText(this, 46, 30, "");

    // Character grid.
    const top = 52;
    const rowH = 14;
    ROWS.forEach((labels, r) => {
      const isCmd = r === ROWS.length - 1;
      const colW = isCmd ? 64 : 26;
      const startX = isCmd ? 44 : 48;
      const rowCells: Cell[] = [];
      labels.forEach((label, c) => {
        const x = startX + c * colW;
        const y = top + r * rowH;
        rowCells.push({ label, x, y, text: createText(this, x, y, label) });
      });
      this.cells.push(rowCells);
    });

    createText(this, 8, GAME_HEIGHT - 10, "Move  A:pick  B:del  Enter:OK", { color: 0x8b8b9b });

    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    const k = (c: number) => kb.addKey(c);
    this.keys = {
      up: [k(KC.UP), k(KC.W)],
      down: [k(KC.DOWN), k(KC.S)],
      left: [k(KC.LEFT)],
      right: [k(KC.RIGHT)],
      activate: [k(KC.SPACE)],
      confirm: [k(KC.ENTER)],
      back: [k(KC.ESC), k(KC.BACKSPACE)],
    };
    // Hardware typing: printable letters/digits append directly.
    kb.on("keydown", this.onKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off("keydown", this.onKeyDown, this));

    this.refresh();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) this.append(e.key.toUpperCase());
  }

  update(): void {
    let moved = false;
    if (this.pressed("up")) {
      this.row = (this.row + ROWS.length - 1) % ROWS.length;
      moved = true;
    } else if (this.pressed("down")) {
      this.row = (this.row + 1) % ROWS.length;
      moved = true;
    } else if (this.pressed("left")) {
      this.col = (this.col + this.cells[this.row].length - 1) % this.cells[this.row].length;
      moved = true;
    } else if (this.pressed("right")) {
      this.col = (this.col + 1) % this.cells[this.row].length;
      moved = true;
    }
    if (moved) {
      this.col = Math.min(this.col, this.cells[this.row].length - 1);
      audio.sfx(AudioKeys.SFX_MOVE);
      this.refresh();
    }

    if (this.pressed("confirm")) {
      this.finish();
    } else if (this.pressed("activate")) {
      this.activate();
    } else if (this.pressed("back")) {
      audio.sfx(AudioKeys.SFX_CANCEL);
      this.backspace();
    }
  }

  private activate(): void {
    const label = this.cells[this.row][this.col].label;
    if (label === "OK") {
      this.finish();
    } else if (label === "DEL") {
      audio.sfx(AudioKeys.SFX_CANCEL);
      this.backspace();
    } else if (label === "SPC") {
      this.append(" ");
    } else {
      this.append(label);
    }
  }

  private append(ch: string): void {
    if (this.value.length >= MAX_LEN) return;
    this.value += ch;
    audio.sfx(AudioKeys.SFX_CONFIRM);
    this.refresh();
  }

  private backspace(): void {
    this.value = this.value.slice(0, -1);
    this.refresh();
  }

  private refresh(): void {
    this.valueText.setText(this.value + "_");
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < this.cells[r].length; c++) {
        this.cells[r][c].text.setTint(r === this.row && c === this.col ? 0xffd54f : 0xffffff);
      }
    }
  }

  private finish(): void {
    const name = this.value.trim() || this.fallback;
    audio.sfx(AudioKeys.SFX_CONFIRM);
    this.scene.resume(this.parent);
    this.scene.stop();
    this.onDone(name);
  }

  private pressed(action: keyof NameEntryScene["keys"]): boolean {
    return this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}
