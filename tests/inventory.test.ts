import { describe, it, expect } from "vitest";
import {
  addItem,
  removeItem,
  itemCount,
  hasItem,
  bagEntries,
  restoreStamina,
  canAfford,
  type Bag,
} from "../src/systems/inventory";
import { ITEMS, getItem } from "../src/data/items";
import { createInstance } from "../src/systems/stats";
import { SPECIES } from "../src/data/species";

describe("bag", () => {
  it("adds, counts, and removes items", () => {
    const bag: Bag = {};
    addItem(bag, "snack", 2);
    expect(itemCount(bag, "snack")).toBe(2);
    expect(hasItem(bag, "snack")).toBe(true);

    expect(removeItem(bag, "snack", 1)).toBe(true);
    expect(itemCount(bag, "snack")).toBe(1);

    expect(removeItem(bag, "snack", 5)).toBe(false); // not enough -> unchanged
    expect(itemCount(bag, "snack")).toBe(1);

    removeItem(bag, "snack", 1);
    expect(hasItem(bag, "snack")).toBe(false); // dropped to 0 -> deleted
    expect(bagEntries(bag)).toEqual([]);
  });

  it("lists non-empty entries", () => {
    const bag: Bag = { snack: 2, demo_tape: 0, energy_drink: 1 };
    expect(bagEntries(bag).map((e) => e.id).sort()).toEqual(["energy_drink", "snack"]);
  });
});

describe("restoreStamina", () => {
  it("heals up to max and reports the amount restored", () => {
    const m = createInstance(SPECIES.rifflet, 20);
    m.currentStamina = 5;
    const max = m.stats.stamina;
    const healed = restoreStamina(m, 10);
    expect(healed).toBe(10);
    expect(m.currentStamina).toBe(15 <= max ? 15 : max);

    m.currentStamina = max - 3;
    expect(restoreStamina(m, 50)).toBe(3); // capped at max
    expect(m.currentStamina).toBe(max);

    expect(restoreStamina(m, 50)).toBe(0); // already full
  });
});

describe("currency", () => {
  it("checks affordability", () => {
    expect(canAfford(100, 40)).toBe(true);
    expect(canAfford(40, 40)).toBe(true);
    expect(canAfford(39, 40)).toBe(false);
  });
});

describe("items data", () => {
  it("the demo tape still boosts recruiting; new items exist with sane flags", () => {
    expect(ITEMS.demo_tape.effect).toEqual({ kind: "recruit", modifier: 2 });
    expect(getItem("energy_drink")?.effect).toMatchObject({ kind: "restoreStamina" });
    expect(getItem("snack")?.usableInField).toBe(true);
    expect(getItem("hype_track")?.usableInField).toBe(false); // battle only
    // Buyable consumables cost something; key items (not usable anywhere) may be
    // free (you're given them, not sold them).
    for (const item of Object.values(ITEMS)) {
      expect(item.price).toBeGreaterThanOrEqual(0);
      if (item.usableInBattle || item.usableInField) expect(item.price, item.id).toBeGreaterThan(0);
    }
  });
});
