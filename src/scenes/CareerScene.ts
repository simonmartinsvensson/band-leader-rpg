import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { RESIDENCIES } from "../data/residencies";
import { TRAINERS } from "../data/trainers";

export interface CareerData {
  parent: string;
}

/**
 * Career overlay: shows residencies earned (the badge case) and rivals beaten.
 * Read-only; reads progress from the registry. Esc / Space exits.
 */
export class CareerScene extends Phaser.Scene {
  private parent = "OverworldScene";
  private keys!: Phaser.Input.Keyboard.Key[];

  constructor() {
    super("CareerScene");
  }

  init(data: CareerData): void {
    this.parent = data?.parent ?? "OverworldScene";
  }

  create(): void {
    this.add.graphics().fillStyle(0x0b0b12, 0.96).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    createText(this, 8, 6, "CAREER", { color: 0xffd54f });

    const earned: string[] = this.registry.get("residencies") ?? [];
    const defeated: Record<string, boolean> = this.registry.get("trainersDefeated") ?? {};

    createText(this, 8, 24, "Residencies", { color: 0x4caf50 });
    const allRes = Object.values(RESIDENCIES);
    allRes.forEach((res, i) => {
      const has = earned.includes(res.id);
      createText(this, 14, 36 + i * 11, `${has ? "[*]" : "[ ]"} ${res.name}`, {
        color: has ? 0xffffff : 0x6b6b7b,
      });
    });
    createText(this, 8, 40 + allRes.length * 11, `Residencies earned: ${earned.length}/${allRes.length}`, {
      color: 0x8b8b9b,
    });

    const beaten = Object.values(TRAINERS).filter((t) => defeated[t.id]);
    const rivalY = 64 + allRes.length * 11;
    createText(this, 8, rivalY, "Rivals beaten", { color: 0x4caf50 });
    if (beaten.length === 0) {
      createText(this, 14, rivalY + 12, "(none yet)", { color: 0x6b6b7b });
    } else {
      beaten.forEach((t, i) => createText(this, 14, rivalY + 12 + i * 11, `- ${t.name}`));
    }

    createText(this, 8, GAME_HEIGHT - 10, "Esc: close", { color: 0x8b8b9b });

    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = [kb.addKey(KC.ESC), kb.addKey(KC.BACKSPACE), kb.addKey(KC.SPACE), kb.addKey(KC.ENTER), kb.addKey(KC.C)];
  }

  update(): void {
    if (this.keys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      this.scene.resume(this.parent);
      this.scene.stop();
    }
  }
}
