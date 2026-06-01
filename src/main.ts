import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, BACKGROUND_COLOR } from "./data/constants";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { TitleScene } from "./scenes/TitleScene";
import { OverworldScene } from "./scenes/OverworldScene";
import { DialogueScene } from "./scenes/DialogueScene";
import { BattleScene } from "./scenes/BattleScene";
import { PartyScene } from "./scenes/PartyScene";
import { BagScene } from "./scenes/BagScene";
import { ShopScene } from "./scenes/ShopScene";
import { CareerScene } from "./scenes/CareerScene";
import { PauseScene } from "./scenes/PauseScene";
import { initTouchControls } from "./ui/touchControls";
import { audio } from "./systems/audio";
import "./ui/buildStamp"; // DEV build-timestamp label — remove this line + the file to drop it

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  // Logical GBA-like resolution, scaled up to fill the viewport.
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  // Crisp scaling for a 16x16-tile pixel-art game. roundPixels keeps glyphs and
  // sprites on whole pixels so the bitmap font stays sharp when upscaled.
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Scene flow: Boot -> Preload -> Overworld. DialogueScene and BattleScene are
  // overlays launched on top of the overworld (listed last so they render above).
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    OverworldScene,
    DialogueScene,
    BattleScene,
    PartyScene,
    BagScene,
    ShopScene,
    CareerScene,
    PauseScene,
  ],
};

const game = new Phaser.Game(config);

// Global audio manager — wraps Phaser's game-scoped sound manager so music
// persists across scenes and one mute/volume setting governs everything.
audio.init(game.sound as unknown as Parameters<typeof audio.init>[0]);

// On-screen controls for touch devices (dispatch the same keys the keyboard uses).
initTouchControls();

// The portrait/landscape layout resizes the #game box via CSS; re-fit the
// canvas to its parent when the viewport flips (orientationchange can fire
// before the new metrics settle, so refresh on the next frame too).
const refit = () => game.scale.refresh();
window.addEventListener("resize", refit);
window.addEventListener("orientationchange", () => {
  refit();
  requestAnimationFrame(refit);
});

// Debug/test hook: lets the headless smoke test (scripts/smoke.mjs) inspect
// scene + player state. Harmless in production.
(globalThis as Record<string, unknown>).__GAME__ = game;
