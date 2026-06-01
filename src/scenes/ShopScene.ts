import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../data/constants";
import { createText } from "../ui/text";
import { getItem } from "../data/items";
import { addItem, removeItem, bagEntries, canAfford, type Bag } from "../systems/inventory";

export interface ShopData {
  parent: string;
  /** Item ids for sale. */
  wares: string[];
}

/** Sell-back rate: items resell for half their buy price (rounded down, min 1). */
const SELL_RATE = 0.5;
const sellPrice = (price: number) => Math.max(1, Math.floor(price * SELL_RATE));

type Phase = "menu" | "buy" | "sell";

/**
 * Shop overlay. A Buy / Sell / Leave menu: Buy spends currency on the shop's
 * wares; Sell trades bag items back for half their price. Up/Down to browse,
 * Confirm to act, Esc to go back / leave.
 */
export class ShopScene extends Phaser.Scene {
  private parent = "OverworldScene";
  private wares: string[] = [];
  private phase: Phase = "menu";
  private index = 0;
  private busy = false;

  private rowTexts: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private detail!: Phaser.GameObjects.BitmapText;
  private wallet!: Phaser.GameObjects.BitmapText;
  private footer!: Phaser.GameObjects.BitmapText;

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
    this.phase = "menu";
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

    this.rowTexts = Array.from({ length: 10 }, (_, i) => createText(this, 16, 24 + i * 11, ""));
    this.cursor = createText(this, 8, 24, ">");
    this.detail = createText(this, 142, 22, "", { maxWidth: 92 });
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

    this.enterMenu();
  }

  /** The list of rows for the current phase (label + detail per row). */
  private rows(): Array<{ label: string; detail: string }> {
    if (this.phase === "menu") {
      return [
        { label: "Buy", detail: "Browse the shop's gear." },
        { label: "Sell", detail: "Trade items for cash (half price)." },
        { label: "Leave", detail: "" },
      ];
    }
    if (this.phase === "buy") {
      return this.wares.map((id) => {
        const it = getItem(id)!;
        return { label: `${it.name}  $${it.price}`, detail: `${it.name}\n\n${it.description}\n\n$${it.price}` };
      });
    }
    // sell
    return bagEntries(this.bag).map((e) => {
      const it = getItem(e.id)!;
      return {
        label: `${it.name} x${e.count}  $${sellPrice(it.price)}`,
        detail: `${it.name}\n\n${it.description}\n\nSell: $${sellPrice(it.price)}`,
      };
    });
  }

  update(): void {
    if (this.busy) return;
    const rows = this.rows();

    if (this.pressed("cancel")) {
      if (this.phase === "menu") this.exit();
      else this.enterMenu();
      return;
    }
    if (this.pressed("up") && this.index > 0) this.index--;
    else if (this.pressed("down") && this.index < rows.length - 1) this.index++;
    this.render(rows);

    if (this.pressed("confirm") && rows.length > 0) this.confirm();
  }

  private confirm(): void {
    if (this.phase === "menu") {
      if (this.index === 0) this.enterBuy();
      else if (this.index === 1) this.enterSell();
      else this.exit();
    } else if (this.phase === "buy") {
      this.buy();
    } else {
      this.sell();
    }
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

  private sell(): void {
    const entries = bagEntries(this.bag);
    const entry = entries[this.index];
    if (!entry) return;
    const item = getItem(entry.id)!;
    const got = sellPrice(item.price);
    removeItem(this.bag, entry.id, 1);
    this.registry.set("currency", this.currency + got);
    this.index = Math.min(this.index, Math.max(0, bagEntries(this.bag).length - 1));
    this.flash(`Sold a ${item.name} for $${got}.`);
  }

  private enterMenu(): void {
    this.phase = "menu";
    this.index = 0;
    this.footer.setText("Up/Down  Space:select  Esc:leave");
    this.render(this.rows());
  }

  private enterBuy(): void {
    this.phase = "buy";
    this.index = 0;
    this.footer.setText("Up/Down  Space:buy  Esc:back");
    this.render(this.rows());
  }

  private enterSell(): void {
    if (bagEntries(this.bag).length === 0) {
      this.flash("You have nothing to sell.");
      return;
    }
    this.phase = "sell";
    this.index = 0;
    this.footer.setText("Up/Down  Space:sell  Esc:back");
    this.render(this.rows());
  }

  private render(rows: Array<{ label: string; detail: string }>): void {
    this.wallet.setText(`$${this.currency}`);
    this.rowTexts.forEach((t, i) => {
      const r = rows[i];
      t.setVisible(Boolean(r));
      if (r) t.setText(r.label);
    });
    const hasRows = rows.length > 0;
    this.cursor.setVisible(hasRows).setY(24 + this.index * 11);
    this.detail.setText(hasRows ? (rows[this.index]?.detail ?? "") : "(nothing here)");
  }

  private flash(text: string): void {
    this.busy = true;
    this.detail.setText(text);
    this.wallet.setText(`$${this.currency}`);
    this.time.delayedCall(800, () => {
      this.busy = false;
      // Falling out of sell with an empty bag returns to the menu.
      if (this.phase === "sell" && bagEntries(this.bag).length === 0) this.enterMenu();
      else this.render(this.rows());
    });
  }

  private exit(): void {
    this.scene.resume(this.parent);
    this.scene.stop();
  }

  private pressed(action: keyof ShopScene["keys"]): boolean {
    return this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}
