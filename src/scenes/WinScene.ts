import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { getSpecies } from "../data/species";
import { DEFAULT_PLAYER_NAME } from "../systems/save";
import { audio } from "../systems/audio";
import { AudioKeys } from "../data/assets";
import type { MusicianInstance } from "../types/musician";

export interface WinData {
  parent: string;
}

/**
 * Endgame "you win" screen: a short resolution line, a Hall of Fame listing the
 * band that took down Monocorp, and credits. Reached from the finale cutscene's
 * `win` step (which has already set story.game_complete + saved). Confirm
 * returns to the title; the save now reads as story-complete (post-game).
 */
export class WinScene extends Phaser.Scene {
  private keys!: Phaser.Input.Keyboard.Key[];
  private ready = false;

  constructor() {
    super("WinScene");
  }

  create(): void {
    this.cameras.main.fadeIn(600, 0, 0, 0);
    audio.playMusic(AudioKeys.MUSIC_VENUE);
    this.add.graphics().fillStyle(0x0b0b12, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const name = (this.registry.get("playerName") as string) || DEFAULT_PLAYER_NAME;
    createText(this, GAME_WIDTH / 2, 12, "THE SCENE LIVES", { color: 0xffd54f, origin: 0.5 });
    createText(this, GAME_WIDTH / 2, 26, `Monocorp is silenced. ${name}'s noise wins.`, {
      color: 0xffffff,
      origin: 0.5,
      maxWidth: GAME_WIDTH - 12,
    });

    // Hall of Fame — the band that did it.
    createText(this, GAME_WIDTH / 2, 46, "- HALL OF FAME -", { color: 0x4caf50, origin: 0.5 });
    const party = (this.registry.get("party") as MusicianInstance[]) ?? [];
    party.slice(0, 6).forEach((m, i) => {
      const species = getSpecies(m.speciesId)?.name ?? m.speciesId;
      createText(this, GAME_WIDTH / 2, 58 + i * 11, `${m.nickname}  (${species})  Lv${m.level}`, { origin: 0.5 });
    });

    createText(this, GAME_WIDTH / 2, GAME_HEIGHT - 30, "Band Leader RPG", { color: 0x8b8b9b, origin: 0.5 });
    createText(this, GAME_WIDTH / 2, GAME_HEIGHT - 20, "Thanks for playing!", { color: 0x8b8b9b, origin: 0.5 });

    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = [kb.addKey(KC.SPACE), kb.addKey(KC.ENTER), kb.addKey(KC.ESC)];
    // Ignore input until the fade-in settles (so a held key can't skip instantly).
    this.time.delayedCall(900, () => {
      this.ready = true;
      createText(this, GAME_WIDTH / 2, GAME_HEIGHT - 8, "Space: Title", { color: 0x6b6b7b, origin: 0.5 });
    });
  }

  update(): void {
    if (!this.ready) return;
    if (this.keys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      audio.sfx(AudioKeys.SFX_CONFIRM);
      this.scene.stop("OverworldScene");
      this.scene.start("TitleScene");
    }
  }
}
