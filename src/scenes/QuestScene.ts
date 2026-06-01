import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { STORY } from "../data/story";
import {
  currentChapter,
  currentObjective,
  completedMilestones,
  storyComplete,
  interpolate,
  type Flags,
} from "../systems/story";
import { DEFAULT_PLAYER_NAME } from "../systems/save";
import { audio } from "../systems/audio";
import { AudioKeys } from "../data/assets";

export interface QuestData {
  parent: string;
}

/**
 * Quest-log overlay (pause menu "Quests", or overworld key Q). Read-only: shows
 * the current chapter + objective and the milestones completed so far, derived
 * from the story definition (src/data/story.ts) against the saved flags.
 */
export class QuestScene extends Phaser.Scene {
  private parent = "OverworldScene";
  private keys!: Phaser.Input.Keyboard.Key[];

  constructor() {
    super("QuestScene");
  }

  init(data: QuestData): void {
    this.parent = data?.parent ?? "OverworldScene";
  }

  create(): void {
    this.add.graphics().fillStyle(0x0b0b12, 0.96).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    createText(this, 8, 6, "QUESTS", { color: 0xffd54f });

    const flags = (this.registry.get("flags") ?? {}) as Flags;
    const name = (this.registry.get("playerName") as string) || DEFAULT_PLAYER_NAME;
    const sub = (t: string) => interpolate(t, { name });
    const done = completedMilestones(STORY, flags);

    // Current chapter + objective.
    if (STORY.length === 0) {
      createText(this, 8, 26, "No quests yet.", { color: 0x8b8b9b, maxWidth: GAME_WIDTH - 16 });
    } else if (storyComplete(STORY, flags)) {
      createText(this, 8, 24, currentChapter(STORY, flags), { color: 0x4caf50 });
      createText(this, 8, 38, "Story complete!", { color: 0xffffff, maxWidth: GAME_WIDTH - 16 });
    } else {
      createText(this, 8, 24, currentChapter(STORY, flags), { color: 0x4caf50 });
      createText(this, 8, 38, "Objective:", { color: 0x8b8b9b });
      createText(this, 14, 50, sub(currentObjective(STORY, flags)), { color: 0xffffff, maxWidth: GAME_WIDTH - 22 });
    }

    // Completed milestones.
    const doneY = 74;
    createText(this, 8, doneY, "Completed", { color: 0x4caf50 });
    if (done.length === 0) {
      createText(this, 14, doneY + 12, "(nothing yet)", { color: 0x6b6b7b });
    } else {
      done.slice(-6).forEach((m, i) => {
        createText(this, 14, doneY + 12 + i * 11, `[*] ${sub(m.objective)}`, { color: 0xffffff, maxWidth: GAME_WIDTH - 22 });
      });
    }

    createText(this, 8, GAME_HEIGHT - 10, "Esc: close", { color: 0x8b8b9b });

    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = [kb.addKey(KC.ESC), kb.addKey(KC.BACKSPACE), kb.addKey(KC.SPACE), kb.addKey(KC.ENTER), kb.addKey(KC.Q)];
  }

  update(): void {
    if (this.keys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      audio.sfx(AudioKeys.SFX_CANCEL);
      this.scene.resume(this.parent);
      this.scene.stop();
    }
  }
}
