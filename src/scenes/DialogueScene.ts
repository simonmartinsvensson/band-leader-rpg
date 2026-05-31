import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";

/** Data passed when launching the dialogue overlay. */
export interface DialogueData {
  pages: string[];
  speaker?: string;
  /** Scene key to resume when the dialogue closes. */
  parent: string;
}

const MARGIN = 8;
const BOX_HEIGHT = 48;
const PADDING = 6;
const TYPE_DELAY = 30; // ms per character

/**
 * Modal dialogue overlay. Launched on top of (and pausing) the overworld:
 * shows a bottom text box that reveals the current page with a typewriter
 * effect. A button press completes the current page if still typing, otherwise
 * advances to the next page; advancing past the last page resumes the parent
 * scene and closes this one.
 */
export class DialogueScene extends Phaser.Scene {
  private pages: string[] = [];
  private speaker?: string;
  private parent = "OverworldScene";

  private pageIndex = 0;
  private typing = false;
  private bodyText!: Phaser.GameObjects.BitmapText;
  private indicator!: Phaser.GameObjects.Triangle;
  private typeTimer?: Phaser.Time.TimerEvent;
  private advanceKeys!: Phaser.Input.Keyboard.Key[];

  constructor() {
    super("DialogueScene");
  }

  init(data: DialogueData): void {
    this.pages = data.pages ?? [];
    this.speaker = data.speaker;
    this.parent = data.parent ?? "OverworldScene";
    this.pageIndex = 0;
    this.typing = false;
  }

  create(): void {
    const boxX = MARGIN;
    const boxY = GAME_HEIGHT - BOX_HEIGHT - MARGIN;
    const boxW = GAME_WIDTH - MARGIN * 2;

    const box = this.add.graphics();
    box.fillStyle(0x10101c, 0.95).fillRect(boxX, boxY, boxW, BOX_HEIGHT);
    box.lineStyle(1, 0xffffff, 1).strokeRect(boxX, boxY, boxW, BOX_HEIGHT);

    let textTop = boxY + PADDING;
    if (this.speaker) {
      createText(this, boxX + PADDING, textTop, this.speaker, { color: 0xffd54f });
      textTop += 10;
    }

    this.bodyText = createText(this, boxX + PADDING, textTop, "", {
      maxWidth: boxW - PADDING * 2,
    });

    // Crisp "more" arrow as a shape (a glyph would smooth-scale like Text did).
    const ix = boxX + boxW - PADDING - 3;
    const iy = boxY + BOX_HEIGHT - PADDING - 3;
    this.indicator = this.add
      .triangle(ix, iy, 0, 0, 5, 0, 2, 3, 0xffffff)
      .setVisible(false);
    this.tweens.add({
      targets: this.indicator,
      alpha: { from: 1, to: 0.2 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    const keyboard = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.advanceKeys = [keyboard.addKey(KC.SPACE), keyboard.addKey(KC.ENTER)];

    this.startTyping();
  }

  update(): void {
    if (this.advanceKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.advance();
    }
  }

  private get currentPage(): string {
    return this.pages[this.pageIndex] ?? "";
  }

  private startTyping(): void {
    this.typing = true;
    this.indicator.setVisible(false);
    this.bodyText.setText("");
    const full = this.currentPage;
    let shown = 0;
    this.typeTimer = this.time.addEvent({
      delay: TYPE_DELAY,
      loop: true,
      callback: () => {
        shown++;
        this.bodyText.setText(full.slice(0, shown));
        if (shown >= full.length) this.finishTyping();
      },
    });
  }

  private finishTyping(): void {
    this.typeTimer?.remove();
    this.typeTimer = undefined;
    this.bodyText.setText(this.currentPage);
    this.typing = false;
    this.indicator.setVisible(true);
  }

  private advance(): void {
    if (this.typing) {
      this.finishTyping(); // reveal the rest of the page instantly
      return;
    }
    this.pageIndex++;
    if (this.pageIndex >= this.pages.length) {
      this.close();
      return;
    }
    this.startTyping();
  }

  private close(): void {
    this.typeTimer?.remove();
    this.scene.resume(this.parent);
    this.scene.stop();
  }
}
