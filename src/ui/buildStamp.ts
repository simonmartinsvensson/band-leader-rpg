// DEV-ONLY: a tiny "patched HH:MM YYYY-MM-DD" label in the bottom-left corner,
// showing when THIS build was produced (so you can confirm on a phone whether
// you're looking at the latest deploy). The timestamp is frozen at build time
// via the Vite `define` for __BUILD_TIME__ (see vite.config.ts).
//
// TO REMOVE: delete this file and the one `import "./ui/buildStamp";` line in
// src/main.ts. (The __BUILD_TIME__ define in vite.config.ts is then unused and
// can optionally be dropped too — harmless if left.)

declare const __BUILD_TIME__: string;

(function showBuildStamp(): void {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = `patched ${__BUILD_TIME__}`;
  el.style.cssText = [
    "position:fixed",
    "left:4px",
    "bottom:3px",
    "z-index:3000", // above the touch overlay (z-index 1000) and everything else
    "pointer-events:none",
    "font:9px/1 monospace",
    "color:rgba(255,255,255,0.5)",
    "text-shadow:0 1px 1px rgba(0,0,0,0.9)",
    "-webkit-user-select:none",
    "user-select:none",
  ].join(";");
  document.body.appendChild(el);
})();

export {};
