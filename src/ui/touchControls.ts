// On-screen touch controls for phones. Rather than rewrite every input check,
// the buttons dispatch the *same* KeyboardEvents the game already listens for
// (arrows for the D-pad, Space for A, Escape for B), so movement, dialogue,
// battle menus, and every overlay work via touch unchanged.
//
// Shown only on touch devices (or with ?touch for testing); a "rotate" hint
// covers the screen in portrait since the game prefers landscape.

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
  .tc-btn { pointer-events: auto; position: absolute; display: flex; align-items: center;
    justify-content: center; border: 2px solid rgba(255,255,255,0.5);
    background: rgba(20,20,30,0.45); color: #fff; font-family: monospace; font-weight: bold;
    border-radius: 50%; -webkit-tap-highlight-color: transparent; touch-action: none; padding: 0; }
  .tc-btn.tc-active { background: rgba(255,213,79,0.6); }
  /* D-pad (lower-left) */
  .tc-up    { width: 15vmin; height: 15vmin; left: 19vmin; bottom: 34vmin; border-radius: 18%; }
  .tc-down  { width: 15vmin; height: 15vmin; left: 19vmin; bottom: 4vmin;  border-radius: 18%; }
  .tc-left  { width: 15vmin; height: 15vmin; left: 4vmin;  bottom: 19vmin; border-radius: 18%; }
  .tc-right { width: 15vmin; height: 15vmin; left: 34vmin; bottom: 19vmin; border-radius: 18%; }
  /* A / B (lower-right) */
  .tc-a { width: 17vmin; height: 17vmin; right: 5vmin;  bottom: 8vmin;  font-size: 6vmin; }
  .tc-b { width: 15vmin; height: 15vmin; right: 22vmin; bottom: 20vmin; font-size: 5vmin; }
  .tc-rotate { position: fixed; inset: 0; z-index: 2000; display: none;
    align-items: center; justify-content: center; text-align: center;
    background: #0b0b12; color: #fff; font-family: monospace; font-size: 5vmin; padding: 8vmin; }
  .tc-rotate.show { display: flex; }
`;

/** Build and wire the touch overlay. No-op on non-touch devices. */
export function initTouchControls(): void {
  if (!touchEnabled()) return;

  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "tc-root";
  for (const b of [UP, DOWN, LEFT, RIGHT, B, A]) root.appendChild(makeButton(b));
  document.body.appendChild(root);

  const rotate = document.createElement("div");
  rotate.className = "tc-rotate";
  rotate.textContent = "Rotate your device to landscape to play.";
  document.body.appendChild(rotate);

  const updateOrientation = () => {
    const portrait = window.innerHeight > window.innerWidth;
    rotate.classList.toggle("show", portrait);
    root.style.display = portrait ? "none" : "block"; // hide controls behind the hint
  };
  updateOrientation();
  window.addEventListener("resize", updateOrientation);
  window.addEventListener("orientationchange", updateOrientation);

  // Block native gestures (scroll, double-tap zoom, long-press callout).
  document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("dblclick", (e) => e.preventDefault());
}
