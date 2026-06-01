import { defineConfig } from "vite";

/** Build-time stamp "HH:MM YYYY-MM-DD" injected as __BUILD_TIME__ (see src/ui/buildStamp.ts). */
function buildTimestamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())} ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// GitHub Pages serves project sites from a subpath (https://user.github.io/<reponame>/),
// so assets must be referenced relative to that subpath. Set VITE_BASE to "/<reponame>/"
// in the deploy environment (or hard-code it below) to match your repository name.
// During `npm run dev`/`preview` we keep the base at "/" for convenience.
export default defineConfig(({ command }) => ({
  base: command === "build" ? process.env.VITE_BASE ?? "/band-leader-rpg/" : "/",
  // Frozen at build time (or dev-server start), so the on-screen "patched" label
  // reflects exactly when the running build was produced.
  define: {
    __BUILD_TIME__: JSON.stringify(buildTimestamp()),
  },
  build: {
    outDir: "dist",
  },
}));
