import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { LORE } from "../data/lore";
import { foundLore, loreProgress } from "../systems/lore";
import type { Flags } from "../systems/story";
import { audio } from "../systems/audio";
import { AudioKeys } from "../data/assets";

export interface LoreData {
  parent: string;
}

/**
 * Lore log (pause menu "Lore"). Read-only: lists the notes/records/posters about
 * Cass and the old scene you've found, "???" for the rest, with a found count.
 * Reward for exploration; the entries themselves live in src/data/lore.ts.
 */
export class LoreScene extends Phaser.Scene {
  private parent = "OverworldScene";
  private keys!: Phaser.Input.Keyboard.Key[];

  constructor() {
    super("LoreScene");
  }

  init(data: LoreData): void {
    this.parent = data?.parent ?? "OverworldScene";
  }

  create(): void {
    this.add.graphics().fillStyle(0x0b0b12, 0.96).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const flags = (this.registry.get("flags") ?? {}) as Flags;
    const { found, total } = loreProgress(LORE, flags);

    createText(this, 8, 6, "LORE", { color: 0xffd54f });
    createText(this, GAME_WIDTH - 8, 6, `${found}/${total}`, { color: 0x66d9e8, origin: { x: 1, y: 0 } });
    createText(this, 8, 18, "The old scene & Cass", { color: 0x8b8b9b });

    const foundSet = new Set(foundLore(LORE, flags).map((e) => e.id));
    LORE.forEach((e, i) => {
      const got = foundSet.has(e.id);
      const label = got ? `[${e.kind[0].toUpperCase()}] ${e.title}` : "[ ] ???";
      createText(this, 12, 32 + i * 12, label, { color: got ? 0xffffff : 0x6b6b7b, maxWidth: GAME_WIDTH - 20 });
    });

    if (found === total) createText(this, 8, GAME_HEIGHT - 20, "Every fragment found. The whole story.", { color: 0x4caf50 });
    createText(this, 8, GAME_HEIGHT - 10, "Esc: close", { color: 0x8b8b9b });

    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = [kb.addKey(KC.ESC), kb.addKey(KC.BACKSPACE), kb.addKey(KC.SPACE), kb.addKey(KC.ENTER), kb.addKey(KC.L)];
  }

  update(): void {
    if (this.keys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      audio.sfx(AudioKeys.SFX_CANCEL);
      this.scene.resume(this.parent);
      this.scene.stop();
    }
  }
}
