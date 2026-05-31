import { defineConfig } from "vite";

// GitHub Pages serves project sites from a subpath (https://user.github.io/<reponame>/),
// so assets must be referenced relative to that subpath. Set VITE_BASE to "/<reponame>/"
// in the deploy environment (or hard-code it below) to match your repository name.
// During `npm run dev`/`preview` we keep the base at "/" for convenience.
export default defineConfig(({ command }) => ({
  base: command === "build" ? process.env.VITE_BASE ?? "/band-leader-rpg/" : "/",
  build: {
    outDir: "dist",
  },
}));
