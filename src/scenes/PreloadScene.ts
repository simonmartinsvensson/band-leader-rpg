import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { SPRITESHEETS, IMAGES, FRAME_CONFIG } from "../data/assets";
import { createText } from "../ui/text";

/**
 * Loads every game asset (by key, from src/data/assets.ts) while showing a
 * simple loading bar, then starts the OverworldScene. Runs after BootScene.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    this.createLoadingBar();

    // Resolve asset URLs against Vite's configured base path so loading works
    // both in dev ("/") and from a GitHub Pages subpath ("/reponame/").
    this.load.setBaseURL(import.meta.env.BASE_URL);

    for (const sheet of SPRITESHEETS) {
      this.load.spritesheet(sheet.key, sheet.path, FRAME_CONFIG);
    }
    for (const img of IMAGES) {
      this.load.image(img.key, img.path);
    }
  }

  create(): void {
    this.scene.start("TitleScene");
  }

  private createLoadingBar(): void {
    const barWidth = 160;
    const barHeight = 12;
    const x = (GAME_WIDTH - barWidth) / 2;
    const y = GAME_HEIGHT / 2 - barHeight / 2;

    const label = createText(this, GAME_WIDTH / 2, y - 12, "Loading...", { origin: 0.5 });

    const border = this.add.graphics();
    border.lineStyle(1, 0xffffff, 1).strokeRect(x, y, barWidth, barHeight);

    const fill = this.add.graphics();

    this.load.on("progress", (value: number) => {
      fill.clear();
      fill.fillStyle(0x4caf50, 1).fillRect(x + 1, y + 1, (barWidth - 2) * value, barHeight - 2);
    });

    this.load.on("complete", () => {
      fill.destroy();
      border.destroy();
      label.destroy();
    });
  }
}
