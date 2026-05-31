import Phaser from "phaser";

/**
 * First scene in the flow. Handles any early, synchronous setup, logs "boot",
 * then hands off to PreloadScene which loads assets. Keep this lightweight —
 * no asset loading happens here.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    console.log("boot");
    this.scene.start("PreloadScene");
  }
}
