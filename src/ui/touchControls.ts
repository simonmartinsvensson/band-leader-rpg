// On-screen touch controls for phones. Rather than rewrite every input check,
// the buttons dispatch the *same* KeyboardEvents the game already listens for
// (arrows for the D-pad, Space for A, Escape for B), so movement, dialogue,
// battle menus, and every overlay work via touch unchanged.
//
// Layout (toggled purely by CSS @media orientation):
//   • Portrait  — handheld-emulator style: the game canvas sits in a 3:2 box
//     pinned to the top of the screen (fit to width), and the controls live in
//     a dedicated panel filling the space below it (D-pad lower-left, A/B
//     lower-right). The clusters are sized against the panel height so they can
//     never overlap the game.
//   • Landscape — the game fills the screen and the controls overlay the lower
//     corners (the original look). This is a fallback; portrait is fully
//     supported and never blocked.
//
// Shown only on touch devices (or with ?touch for testing).

interface Btn {
  label: string;
  keyCode: number;
  key: string;
  code: string;
  cls: string;
}

const UP: Btn = { label: "▲", keyCode: 38, key: "ArrowUp", code: "ArrowUp", cls: "tc-up" };
const DOWN: Btn = { label: "▼", keyCode: 40, key: "ArrowDown", code: "ArrowDown", cls: "tc-down" };
const LEFT: Btn = { label: "◀", keyCode: 37, key: "ArrowLeft", code: "ArrowLeft", cls: "tc-left" };
const RIGHT: Btn = { label: "▶", keyCode: 39, key: "ArrowRight", code: "ArrowRight", cls: "tc-right" };
const A: Btn = { label: "A", keyCode: 32, key: " ", code: "Space", cls: "tc-a" };
const B: Btn = { label: "B", keyCode: 27, key: "Escape", code: "Escape", cls: "tc-b" };

/** Feed Phaser's keyboard manager a synthetic key event (keyCode is what it matches on). */
function dispatchKey(type: "keydown" | "keyup", b: Btn): void {
  const event = new KeyboardEvent(type, { key: b.key, code: b.code, bubbles: true, cancelable: true });
  // keyCode/which are deprecated and not settable via the constructor, but Phaser
  // matches keys by keyCode — so override the getters before dispatch.
  Object.defineProperty(event, "keyCode", { get: () => b.keyCode });
  Object.defineProperty(event, "which", { get: () => b.keyCode });
  window.dispatchEvent(event);
}

function makeButton(b: Btn): HTMLButtonElement {
  const el = document.createElement("button");
  el.className = `tc-btn ${b.cls}`;
  el.textContent = b.label;
  el.setAttribute("aria-label", b.label);
  let held = false;

  const press = (e: PointerEvent) => {
    e.preventDefault();
    if (held) return;
    held = true;
    el.classList.add("tc-active");
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dispatchKey("keydown", b);
  };
  const release = () => {
    if (!held) return;
    held = false;
    el.classList.remove("tc-active");
    dispatchKey("keyup", b);
  };

  el.addEventListener("pointerdown", press);
  el.addEventListener("pointerup", (e) => {
    e.preventDefault();
    release();
  });
  el.addEventListener("pointercancel", release);
  el.addEventListener("lostpointercapture", release);
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  return el;
}

function touchEnabled(): boolean {
  if (new URLSearchParams(location.search).has("touch")) return true;
  return (
    (navigator.maxTouchPoints ?? 0) > 0 ||
    "ontouchstart" in window ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

const STYLE = `
  .tc-root { position: fixed; inset: 0; z-index: 1000; pointer-events: none;
    -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }

  /* Cluster boxes: D-pad lower-left, A/B lower-right. Buttons are positioned
     relative to their cluster, so we only move the clusters per orientation. */
  .tc-cluster { position: absolute; pointer-events: none; }
  .tc-dpad    { width: 44vmin; height: 44vmin; left: 4vmin; bottom: 4vmin; }
  .tc-actions { width: 40vmin; height: 34vmin; right: 4vmin; bottom: 7vmin; }

  .tc-btn { pointer-events: auto; position: absolute; display: flex; align-items: center;
    justify-content: center; border: 2px solid rgba(255,255,255,0.5);
    background: rgba(20,20,30,0.45); color: #fff; font-family: monospace; font-weight: bold;
    -webkit-tap-highlight-color: transparent; touch-action: none; padding: 0; }
  .tc-btn.tc-active { background: rgba(255,213,79,0.6); }

  /* D-pad cross (sizes/positions are % of .tc-dpad). */
  .tc-up, .tc-down, .tc-left, .tc-right { width: 34%; height: 34%; border-radius: 18%; font-size: 4.5vmin; }
  .tc-up    { top: 0;    left: 33%; }
  .tc-down  { bottom: 0; left: 33%; }
  .tc-left  { left: 0;   top: 33%; }
  .tc-right { right: 0;  top: 33%; }

  /* A / B (sizes/positions are % of .tc-actions): A lower-right, B upper-left. */
  .tc-a { right: 0; bottom: 0; width: 45%; height: 53%; border-radius: 50%; font-size: 6vmin; }
  .tc-b { left: 0;  top: 0;    width: 39%; height: 46%; border-radius: 50%; font-size: 5vmin; }

  /* Portrait: game in a 3:2 box at the top (fit to width), controls in the
     panel below. The clusters are vertically centered in the panel and capped
     to its height so they can never reach up into the game screen. */
  @media (orientation: portrait) {
    :root { --game-h: min(66.67vw, 64vh); --panel-h: calc(100vh - var(--game-h)); }
    #game { position: fixed; top: 0; left: 0; width: 100vw; height: var(--game-h); }
    .tc-root { top: var(--game-h); background: linear-gradient(#15151f, #0b0b12);
      border-top: 2px solid rgba(255,255,255,0.12); }
    .tc-cluster { bottom: auto; top: calc(var(--panel-h) / 2); transform: translateY(-50%); }
    .tc-dpad    { --c: min(44vmin, calc(var(--panel-h) * 0.72)); width: var(--c); height: var(--c); left: 6vmin; }
    .tc-actions { width: min(40vmin, calc(var(--panel-h) * 0.66)); height: min(34vmin, calc(var(--panel-h) * 0.56));
      right: 6vmin; }
  }
`;

/** Build and wire the touch overlay. No-op on non-touch devices. */
export function initTouchControls(): void {
  if (!touchEnabled()) return;

  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "tc-root";

  const dpad = document.createElement("div");
  dpad.className = "tc-cluster tc-dpad";
  for (const b of [UP, DOWN, LEFT, RIGHT]) dpad.appendChild(makeButton(b));

  const actions = document.createElement("div");
  actions.className = "tc-cluster tc-actions";
  for (const b of [B, A]) actions.appendChild(makeButton(b));

  root.append(dpad, actions);
  document.body.appendChild(root);

  // Block native gestures (scroll, double-tap zoom, long-press callout).
  document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("dblclick", (e) => e.preventDefault());
}
