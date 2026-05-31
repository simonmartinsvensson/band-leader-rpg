// Headless smoke test for the overworld map: boots the built game, verifies it
// reaches OverworldScene with no console errors, then drives the keyboard to
// confirm the player walks the map AND is stopped by collision tiles.
// Usage: start a server first (`npm run dev`), then `npm run smoke`.
// Override the target with SMOKE_URL=... (the dev server is the default).
import { chromium } from "playwright";

const URL = process.env.SMOKE_URL ?? "http://localhost:5173/";
const STEP_SETTLE = 220; // > STEP_DURATION (150ms) so each tap fully resolves

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 480, height: 320 } });
// Route interception bypasses the HTTP disk cache, so a 404 cached from a
// not-yet-ready preview server can't poison later runs.
await context.route("**/*", (route) => route.continue());
const page = await context.newPage();

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const tile = () =>
  page.evaluate(() => {
    const s = globalThis.__GAME__.scene.getScene("OverworldScene");
    return { x: s.player.tileX, y: s.player.tileY, scrollX: s.cameras.main.scrollX };
  });

async function tap(key, times) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.down(key);
    await page.waitForTimeout(60); // a quick tap (< repeat delay)
    await page.keyboard.up(key);
    await page.waitForTimeout(STEP_SETTLE);
  }
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
};

try {
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__GAME__?.scene.isActive("OverworldScene"), {
    timeout: 10000,
  });

  const start = await tile();
  assert(start.x === 3 && start.y === 3, `spawn from objects layer is (3,3), got (${start.x},${start.y})`);
  await page.screenshot({ path: "/tmp/smoke-start.png" });

  // Walk up into the top border wall: from y=3 the player should stop at y=1
  // (row 0 is wall) — proves collision blocks the step.
  await tap("ArrowUp", 5);
  const top = await tile();
  assert(top.x === 3 && top.y === 1, `top border should stop player at (3,1), got (${top.x},${top.y})`);

  // Walk right along an open row; camera should scroll with the player.
  await tap("ArrowRight", 5);
  const right = await tile();
  assert(right.x === 8 && right.y === 1, `expected (8,1) after walking right, got (${right.x},${right.y})`);
  assert(right.scrollX > start.scrollX, `camera should have scrolled right (${start.scrollX} -> ${right.scrollX})`);
  await page.screenshot({ path: "/tmp/smoke-walk.png" });

  assert(errors.length === 0, `console/page errors: ${errors.join(" | ")}`);

  console.log("SMOKE OK", JSON.stringify({ start, top, right }));
} catch (err) {
  console.error(err.message || err);
  if (errors.length) console.error("Captured errors:", errors.join(" | "));
  process.exitCode = 1;
} finally {
  await browser.close();
}
