import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { getSpecies } from "../data/species";
import { getTechnique } from "../data/techniques";
import { GENRES } from "../data/genres";
import { swapMembers } from "../systems/party";
import type { MusicianInstance } from "../types/musician";

export interface PartyData {
  parent: string;
}

/**
 * Party management overlay: lists members with level + stamina, shows the
 * highlighted member's stats and techniques live, and supports reordering
 * (Confirm to grab, Confirm again to drop/swap). Reads the party from the
 * game registry so changes persist. Esc exits back to the parent scene.
 */
export class PartyScene extends Phaser.Scene {
  private parent = "OverworldScene";
  private party: MusicianInstance[] = [];
  private index = 0;
  private heldIndex = -1;

  private rowTexts: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private detail!: Phaser.GameObjects.BitmapText;

  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    confirm: Phaser.Input.Keyboard.Key[];
    cancel: Phaser.Input.Keyboard.Key[];
  };

  constructor() {
    super("PartyScene");
  }

  init(data: PartyData): void {
    this.parent = data?.parent ?? "OverworldScene";
    this.party = this.registry.get("party") ?? [];
    this.index = 0;
    this.heldIndex = -1;
  }

  create(): void {
    this.add.graphics().fillStyle(0x0b0b12, 0.96).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    createText(this, 8, 6, "PARTY", { color: 0xffd54f });
    this.add.graphics().lineStyle(1, 0xffffff, 0.5).strokeRect(4, 18, 118, 116).strokeRect(126, 18, 110, 116);

    this.rowTexts = this.party.map((_, i) => createText(this, 16, 24 + i * 14, ""));
    this.cursor = createText(this, 8, 24, ">");
    this.detail = createText(this, 130, 22, "", { maxWidth: 104 });

    createText(this, 8, GAME_HEIGHT - 10, "Up/Down  Space:grab/swap  Esc:exit", { color: 0x8b8b9b });

    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    const k = (c: number) => kb.addKey(c);
    this.keys = {
      up: [k(KC.UP), k(KC.W)],
      down: [k(KC.DOWN), k(KC.S)],
      confirm: [k(KC.SPACE), k(KC.ENTER)],
      cancel: [k(KC.ESC), k(KC.BACKSPACE)],
    };

    this.refresh();
  }

  update(): void {
    if (this.pressed("up") && this.index > 0) this.index--;
    else if (this.pressed("down") && this.index < this.party.length - 1) this.index++;

    if (this.pressed("confirm")) {
      if (this.heldIndex < 0) this.heldIndex = this.index;
      else {
        swapMembers(this.party, this.heldIndex, this.index);
        this.heldIndex = -1;
      }
    } else if (this.pressed("cancel")) {
      if (this.heldIndex >= 0) this.heldIndex = -1;
      else {
        this.scene.resume(this.parent);
        this.scene.stop();
        return;
      }
    }

    this.refresh();
  }

  private refresh(): void {
    this.party.forEach((m, i) => {
      this.rowTexts[i].setText(`${m.nickname} L${m.level} ${m.currentStamina}/${m.stats.stamina}`);
      this.rowTexts[i].setTint(i === this.heldIndex ? 0xffd54f : 0xffffff); // grabbed = yellow
    });
    this.cursor.setY(24 + this.index * 14);

    const m = this.party[this.index];
    if (!m) return;
    const species = getSpecies(m.speciesId);
    const genres = species ? species.genres.map((g) => GENRES[g].name).join(" / ") : "";
    const techs = m.techniques.map((id) => getTechnique(id)?.name ?? id).join("\n  ");
    this.detail.setText(
      [
        `${m.nickname}`,
        `Lv ${m.level}  (${genres})`,
        "",
        `STA ${m.currentStamina}/${m.stats.stamina}`,
        `SKL ${m.stats.skill}`,
        `COM ${m.stats.composure}`,
        `TMP ${m.stats.tempo}`,
        "",
        "Techniques:",
        `  ${techs}`,
      ].join("\n"),
    );
  }

  private pressed(action: keyof PartyScene["keys"]): boolean {
    return this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}
