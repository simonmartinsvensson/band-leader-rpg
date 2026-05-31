import Phaser from "phaser";
import { AssetKeys } from "../data/assets";
import { registerPixelFont } from "../ui/font";

/**
 * First scene in the flow. Loads only the bitmap font (so even PreloadScene's
 * loading bar can use crisp text), registers it, logs "boot", then hands off to
 * PreloadScene which loads the rest of the assets.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    // Same base-path handling as PreloadScene (dev "/" vs GitHub Pages subpath).
    this.load.setBaseURL(import.meta.env.BASE_URL);
    this.load.image(AssetKeys.FONT, "assets/font.png");
  }

  create(): void {
    registerPixelFont(this);
    console.log("boot");
    this.scene.start("PreloadScene");
  }
}
