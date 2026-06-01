# Band Leader RPG

A browser game built with **Vite + Phaser 3 + TypeScript** — a Pokémon FireRed–style RPG
reskinned as a band leader who recruits and trains musicians. Genres replace types, techniques
replace moves, auditions replace catching, and venues replace gyms.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture and conventions.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173/
npm run dev:host     # also expose on your LAN (open the printed Network URL on a phone)
npm test             # Vitest unit tests
npm run build        # type-check + production build into dist/
npm run preview      # serve the production build locally
```

**Controls** — Arrow keys / WASD to move, Space/Enter to interact & confirm, Esc to open the
pause menu (and to cancel/back in menus). `P` party, `I` bag, `C` career. On touch devices an
on-screen D-pad + A/B appear (landscape; rotate from portrait).

## Deploy to GitHub Pages

Deployment is automated by [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml):
every push to `main` builds the project and publishes `dist/` to GitHub Pages. The Vite base
path is set from the repo name so assets load from the Pages subpath.

**One-time setup in the GitHub repo:**

1. Create a repository named **`band-leader-rpg`** (the name sets the URL subpath) and push `main`.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Push to `main` (or re-run the workflow from the **Actions** tab). When the "Deploy to GitHub
   Pages" workflow finishes green, the game is live.

**Live URL** (replace `YOUR-USERNAME` with your GitHub username):

```
https://YOUR-USERNAME.github.io/band-leader-rpg/
```

> If you name the repo something other than `band-leader-rpg`, the workflow still works — it sets
> the base path from the repo name automatically — and the URL becomes
> `https://YOUR-USERNAME.github.io/<repo-name>/`.
