import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, BACKGROUND_COLOR } from "./data/constants";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { OverworldScene } from "./scenes/OverworldScene";
import { DialogueScene } from "./scenes/DialogueScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  // Logical GBA-like resolution, scaled up to fill the viewport.
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  // Crisp scaling for a 16x16-tile pixel-art game.
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Scene flow: Boot -> Preload -> Overworld. DialogueScene is an overlay
  // launched on top of the overworld (listed last so it renders above it).
  scene: [BootScene, PreloadScene, OverworldScene, DialogueScene],
};

const game = new Phaser.Game(config);

// Debug/test hook: lets the headless smoke test (scripts/smoke.mjs) inspect
// scene + player state. Harmless in production.
(globalThis as Record<string, unknown>).__GAME__ = game;
