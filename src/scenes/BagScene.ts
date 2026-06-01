import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { getItem } from "../data/items";
import { AudioKeys } from "../data/assets";
import { bagEntries, removeItem, restoreStamina, type Bag } from "../systems/inventory";
import { audio } from "../systems/audio";
import type { MusicianInstance } from "../types/musician";

export interface BagData {
  parent: string;
}

type Phase = "list" | "target" | "message";

/**
 * Overworld bag overlay: view items and use field-usable ones (e.g. restore a
 * party member's stamina). Battle-only items are shown but can't be used here.
 * Reads bag + party from the registry. Esc exits.
 */
export class BagScene extends Phaser.Scene {
  private parent = "OverworldScene";
  private phase: Phase = "list";

  private entries: Array<{ id: string; count: number }> = [];
  private index = 0;
  private targetIndex = 0;

  private rowTexts: Phaser.GameObjects.BitmapText[] = [];
  private memberTexts: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private detail!: Phaser.GameObjects.BitmapText;
  private footer!: Phaser.GameObjects.BitmapText;

  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    confirm: Phaser.Input.Keyboard.Key[];
    cancel: Phaser.Input.Keyboard.Key[];
  };

  constructor() {
    super("BagScene");
  }

  init(data: BagData): void {
    this.parent = data?.parent ?? "OverworldScene";
    this.phase = "list";
    this.index = 0;
    this.targetIndex = 0;
  }

  private get bag(): Bag {
    return this.registry.get("bag") ?? {};
  }

  private get party(): MusicianInstance[] {
    return this.registry.get("party") ?? [];
  }

  create(): void {
    this.add.graphics().fillStyle(0x0b0b12, 0.96).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    createText(this, 8, 6, "BAG", { color: 0xffd54f });
    this.add.graphics().lineStyle(1, 0xffffff, 0.5).strokeRect(4, 18, 118, 116).strokeRect(126, 18, 110, 116);

    this.rowTexts = Array.from({ length: 8 }, (_, i) => createText(this, 16, 24 + i * 12, ""));
    this.memberTexts = Array.from({ length: 6 }, (_, i) => createText(this, 16, 24 + i * 12, "").setVisible(false));
    this.cursor = createText(this, 8, 24, ">");
    this.detail = createText(this, 130, 22, "", { maxWidth: 104 });
    this.footer = createText(this, 8, GAME_HEIGHT - 10, "", { color: 0x8b8b9b });

    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    const k = (c: number) => kb.addKey(c);
    this.keys = {
      up: [k(KC.UP), k(KC.W)],
      down: [k(KC.DOWN), k(KC.S)],
      confirm: [k(KC.SPACE), k(KC.ENTER)],
      cancel: [k(KC.ESC), k(KC.BACKSPACE)],
    };

    this.enterList();
  }

  update(): void {
    if (this.phase === "list") this.handleList();
    else if (this.phase === "target") this.handleTarget();
  }

  // --- Item list -------------------------------------------------------------

  private enterList(): void {
    this.phase = "list";
    this.entries = bagEntries(this.bag);
    this.index = Math.min(this.index, Math.max(0, this.entries.length - 1));
    this.memberTexts.forEach((t) => t.setVisible(false));
    this.footer.setText("Up/Down  Space:use  Esc:exit");
    this.refreshList();
  }

  private refreshList(): void {
    this.rowTexts.forEach((t, i) => {
      const e = this.entries[i];
      t.setVisible(Boolean(e));
      if (e) t.setText(`${getItem(e.id)?.name ?? e.id} x${e.count}`);
    });
    if (this.entries.length === 0) {
      this.rowTexts[0].setText("(empty)").setVisible(true);
      this.cursor.setVisible(false);
      this.detail.setText("");
      return;
    }
    this.cursor.setVisible(true).setY(24 + this.index * 12);
    const item = getItem(this.entries[this.index].id);
    if (item) {
      const where = item.usableInField ? "Usable here." : "Battle only.";
      this.detail.setText(`${item.name}\n\n${item.description}\n\n${where}`);
    }
  }

  private handleList(): void {
    if (this.pressed("cancel")) {
      audio.sfx(AudioKeys.SFX_CANCEL);
      this.scene.resume(this.parent);
      this.scene.stop();
      return;
    }
    if (this.entries.length === 0) return;
    const before = this.index;
    if (this.pressed("up") && this.index > 0) this.index--;
    else if (this.pressed("down") && this.index < this.entries.length - 1) this.index++;
    if (this.index !== before) audio.sfx(AudioKeys.SFX_MOVE);
    this.refreshList();

    if (this.pressed("confirm")) {
      const item = getItem(this.entries[this.index].id);
      if (!item) return;
      audio.sfx(AudioKeys.SFX_CONFIRM);
      if (!item.usableInField) {
        this.flash("You can't use that out here.");
        return;
      }
      this.enterTarget();
    }
  }

  // --- Choose a party member -------------------------------------------------

  private enterTarget(): void {
    this.phase = "target";
    this.targetIndex = 0;
    this.rowTexts.forEach((t) => t.setVisible(false));
    this.cursor.setVisible(true);
    this.footer.setText("Choose a musician  Esc:back");
    this.refreshTarget();
  }

  private refreshTarget(): void {
    this.party.forEach((m, i) => {
      this.memberTexts[i].setVisible(true).setText(`${m.nickname}  ${m.currentStamina}/${m.stats.stamina}`);
    });
    this.cursor.setY(24 + this.targetIndex * 12);
    const item = getItem(this.entries[this.index].id);
    if (item) this.detail.setText(`Use ${item.name} on...`);
  }

  private handleTarget(): void {
    if (this.pressed("cancel")) {
      audio.sfx(AudioKeys.SFX_CANCEL);
      this.memberTexts.forEach((t) => t.setVisible(false));
      this.enterList();
      return;
    }
    const before = this.targetIndex;
    if (this.pressed("up") && this.targetIndex > 0) this.targetIndex--;
    else if (this.pressed("down") && this.targetIndex < this.party.length - 1) this.targetIndex++;
    if (this.targetIndex !== before) audio.sfx(AudioKeys.SFX_MOVE);
    this.refreshTarget();

    if (this.pressed("confirm")) {
      audio.sfx(AudioKeys.SFX_CONFIRM);
      this.useOn(this.party[this.targetIndex]);
    }
  }

  private useOn(member: MusicianInstance): void {
    const id = this.entries[this.index].id;
    const item = getItem(id);
    if (!item || item.effect.kind !== "restoreStamina") return;

    const healed = restoreStamina(member, item.effect.amount);
    if (healed === 0) {
      this.flash(`${member.nickname} is already at full stamina.`);
      return;
    }
    removeItem(this.bag, id, 1);
    this.memberTexts.forEach((t) => t.setVisible(false));
    this.flash(`${member.nickname} recovered ${healed} stamina!`);
  }

  // --- Transient message (returns to the list) -------------------------------

  private flash(text: string): void {
    this.phase = "message";
    this.cursor.setVisible(false);
    this.detail.setText(text);
    this.time.delayedCall(900, () => this.enterList());
  }

  private pressed(action: keyof BagScene["keys"]): boolean {
    return this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}
