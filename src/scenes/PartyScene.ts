import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { getSpecies } from "../data/species";
import { getTechnique } from "../data/techniques";
import { GENRES } from "../data/genres";
import { swapSlots, type Slot } from "../systems/party";
import type { MusicianInstance } from "../types/musician";

export interface PartyData {
  parent: string;
}

const ROW_H = 11;
const TOP = 22;

/**
 * Party + roster management overlay. Lists the active party and the roster
 * (musicians recruited beyond the 6-slot party). Confirm grabs a member, Confirm
 * again swaps it with another slot — including swapping a roster member into the
 * party and back. Shows the highlighted member's stats/techniques live. Reads
 * party + roster from the registry so changes persist. Esc exits.
 */
export class PartyScene extends Phaser.Scene {
  private parent = "OverworldScene";
  private party: MusicianInstance[] = [];
  private roster: MusicianInstance[] = [];
  private index = 0;
  private heldIndex = -1;

  /** Combined party-then-roster slots; the rendered list maps 1:1 to these. */
  private slots: Slot[] = [];

  private rowTexts: Phaser.GameObjects.BitmapText[] = [];
  private divider!: Phaser.GameObjects.BitmapText;
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
    this.roster = this.registry.get("roster") ?? [];
    this.index = 0;
    this.heldIndex = -1;
  }

  create(): void {
    this.add.graphics().fillStyle(0x0b0b12, 0.96).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    createText(this, 8, 6, "PARTY & ROSTER", { color: 0xffd54f });
    this.add.graphics().lineStyle(1, 0xffffff, 0.5).strokeRect(4, 18, 118, 116).strokeRect(126, 18, 110, 116);

    this.slots = [
      ...this.party.map((_, i): Slot => ({ fromRoster: false, index: i })),
      ...this.roster.map((_, i): Slot => ({ fromRoster: true, index: i })),
    ];

    this.rowTexts = this.slots.map(() => createText(this, 16, 0, ""));
    this.divider = createText(this, 10, 0, "- roster -", { color: 0x8b8b9b }).setVisible(this.roster.length > 0);
    this.cursor = createText(this, 8, 0, ">");
    this.detail = createText(this, 130, TOP, "", { maxWidth: 104 });
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
    else if (this.pressed("down") && this.index < this.slots.length - 1) this.index++;

    if (this.pressed("confirm")) {
      if (this.heldIndex < 0) this.heldIndex = this.index;
      else {
        swapSlots(this.party, this.roster, this.slots[this.heldIndex], this.slots[this.index]);
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

  /** Member currently shown in slot `i` (which array it lives in is positional). */
  private memberAt(i: number): MusicianInstance | undefined {
    const slot = this.slots[i];
    return slot.fromRoster ? this.roster[slot.index] : this.party[slot.index];
  }

  /** Y of a slot row, accounting for the roster divider line. */
  private rowY(i: number): number {
    const beforeDivider = i < this.party.length ? 0 : ROW_H; // gap for the divider
    return TOP + i * ROW_H + beforeDivider;
  }

  private refresh(): void {
    this.slots.forEach((_, i) => {
      const m = this.memberAt(i);
      if (!m) return;
      const t = this.rowTexts[i];
      t.setPosition(16, this.rowY(i));
      t.setText(`${m.nickname} L${m.level} ${m.currentStamina}/${m.stats.stamina}`);
      const benched = this.slots[i].fromRoster;
      t.setTint(i === this.heldIndex ? 0xffd54f : benched ? 0x9aa0b5 : 0xffffff);
    });
    if (this.roster.length > 0) this.divider.setY(TOP + this.party.length * ROW_H + 1);
    this.cursor.setY(this.rowY(this.index));

    const m = this.memberAt(this.index);
    if (!m) return;
    const species = getSpecies(m.speciesId);
    const genres = species ? species.genres.map((g) => GENRES[g].name).join(" / ") : "";
    const techs = m.techniques.map((id) => getTechnique(id)?.name ?? id).join("\n  ");
    const where = this.slots[this.index].fromRoster ? "(roster)" : this.slots[this.index].index === 0 ? "(active lead)" : "(party)";
    this.detail.setText(
      [
        `${m.nickname} ${where}`,
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
