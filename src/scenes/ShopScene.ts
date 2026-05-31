import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { getItem } from "../data/items";
import { addItem, canAfford, type Bag } from "../systems/inventory";

export interface ShopData {
  parent: string;
  /** Item ids for sale. */
  wares: string[];
}

/**
 * Shop overlay: buy items with the player's currency (registry "currency").
 * Up/Down to browse, Confirm to buy one, Esc to leave.
 */
export class ShopScene extends Phaser.Scene {
  private parent = "OverworldScene";
  private wares: string[] = [];
  private index = 0;
  private busy = false;

  private rowTexts: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private detail!: Phaser.GameObjects.BitmapText;
  private wallet!: Phaser.GameObjects.BitmapText;

  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    confirm: Phaser.Input.Keyboard.Key[];
    cancel: Phaser.Input.Keyboard.Key[];
  };

  constructor() {
    super("ShopScene");
  }

  init(data: ShopData): void {
    this.parent = data?.parent ?? "OverworldScene";
    this.wares = (data?.wares ?? []).filter((id) => getItem(id));
    this.index = 0;
    this.busy = false;
  }

  private get currency(): number {
    return this.registry.get("currency") ?? 0;
  }

  private get bag(): Bag {
    return this.registry.get("bag") ?? {};
  }

  create(): void {
    this.add.graphics().fillStyle(0x0b0b12, 0.96).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    createText(this, 8, 6, "GEAR SHOP", { color: 0xffd54f });
    this.wallet = createText(this, GAME_WIDTH - 8, 6, "", { origin: { x: 1, y: 0 } });
    this.add.graphics().lineStyle(1, 0xffffff, 0.5).strokeRect(4, 18, 130, 116).strokeRect(138, 18, 98, 116);

    this.rowTexts = this.wares.map((_, i) => createText(this, 16, 24 + i * 12, ""));
    this.cursor = createText(this, 8, 24, ">");
    this.detail = createText(this, 142, 22, "", { maxWidth: 92 });
    createText(this, 8, GAME_HEIGHT - 10, "Up/Down  Space:buy  Esc:leave", { color: 0x8b8b9b });

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
    if (this.busy) return;
    if (this.pressed("cancel")) {
      this.scene.resume(this.parent);
      this.scene.stop();
      return;
    }
    if (this.wares.length === 0) return;
    if (this.pressed("up") && this.index > 0) this.index--;
    else if (this.pressed("down") && this.index < this.wares.length - 1) this.index++;
    this.refresh();

    if (this.pressed("confirm")) this.buy();
  }

  private refresh(): void {
    this.wallet.setText(`$${this.currency}`);
    this.wares.forEach((id, i) => {
      const item = getItem(id)!;
      this.rowTexts[i].setText(`${item.name}  $${item.price}`);
    });
    this.cursor.setY(24 + this.index * 12);
    const item = getItem(this.wares[this.index]);
    if (item) this.detail.setText(`${item.name}\n\n${item.description}\n\n$${item.price}`);
  }

  private buy(): void {
    const item = getItem(this.wares[this.index])!;
    if (!canAfford(this.currency, item.price)) {
      this.flash("You can't afford that.");
      return;
    }
    this.registry.set("currency", this.currency - item.price);
    addItem(this.bag, item.id, 1);
    this.flash(`Bought a ${item.name}!`);
  }

  private flash(text: string): void {
    this.busy = true;
    this.detail.setText(text);
    this.wallet.setText(`$${this.currency}`);
    this.time.delayedCall(800, () => {
      this.busy = false;
      this.refresh();
    });
  }

  private pressed(action: keyof ShopScene["keys"]): boolean {
    return this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}
