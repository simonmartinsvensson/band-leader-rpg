# Band Leader RPG

A browser game: a Pokémon FireRed–style RPG, reskinned as a **band leader** who travels
the world recruiting and training musicians.

## Theme & reskin mapping

The game borrows FireRed's structure but renames every concept to the music-career theme:

| Pokémon concept | Band Leader RPG concept |
| --------------- | ----------------------- |
| Types           | **Genres**              |
| Moves           | **Techniques**          |
| Catching        | **Auditions**           |
| Gyms            | **Venues**              |
| Pokémon         | **Musicians**           |

So: musicians have genres (instead of types), learn techniques (instead of moves), are
recruited via auditions (instead of being caught), and the leader proves themselves at
venues (instead of gyms).

## Stack

- **Vite** — dev server, bundler, static build.
- **Phaser 3** — game engine / rendering / scene management.
- **TypeScript** — all source under `src/`.

## Tile size & resolution

- **Tile size: 16×16 px.** The entire game is built on a 16×16 grid.
- **Logical resolution: 240×160** (GBA-like), scaled up with `Phaser.Scale.FIT` and
  centered (`Scale.CENTER_BOTH`). `pixelArt: true` keeps scaling crisp.
- These values live in `src/data/constants.ts` (`TILE_SIZE`, `GAME_WIDTH`, `GAME_HEIGHT`).

## Folder structure

```
src/
  main.ts        # Phaser game config + bootstrap (single source of game config)
  scenes/        # Phaser.Scene subclasses (BootScene, ...)
  data/          # ALL game content + constants (see "Data-driven content" below)
  systems/       # Game logic / engine systems (movement, battle, audition, save, ...)
  ui/            # Reusable UI components (dialog boxes, menus, HUD)
  types/         # Shared TypeScript types / interfaces
public/
  assets/        # Static assets (sprites, tilesets, audio) served as-is
dist/            # Build output (static, GitHub Pages–ready) — generated, not committed
```

## Data-driven content

All game **content** — musicians, genres, techniques, maps — is data-driven and lives in
`src/data`. Code in `src/systems`, `src/scenes`, and `src/ui` reads from these data
definitions; it never hard-codes content. To add a musician, genre, technique, or map,
add a data entry — do not write bespoke logic per item.

## Scene flow

```
BootScene  ──▶  PreloadScene  ──▶  OverworldScene  ◀──overlay──▶  DialogueScene
                                   (future: ──▶ AuditionScene / VenueScene ...)
```

- **BootScene** — early synchronous setup; logs `"boot"`, then starts PreloadScene. No
  asset loading here.
- **PreloadScene** — loads every asset (keys from `src/data/assets.ts`) while showing a
  loading bar, then starts OverworldScene.
- **OverworldScene** — loads a Tiled map (by key), spawns the player + NPCs, blocks the player
  against collision tiles and NPCs, follows the player with a clamped camera, opens NPC dialogue
  on the interact button, warps between maps on warp tiles, and rolls random encounters in
  encounter zones (see Maps + Map transitions & encounters). A warp re-runs the scene with the
  target map/entry.
- **DialogueScene** — a modal overlay (not a sequential scene). The overworld `pause()`s
  itself and `launch()`es it; on close it `resume()`s the overworld. Listed last in
  `src/main.ts` so it renders on top.

Sequential scenes start the next with `this.scene.start(...)`; the overlay uses
`launch`/`pause`/`resume`/`stop`. All scenes are registered in `src/main.ts` (`scene: [...]`).

## Movement

FireRed-style grid movement is split into two systems:

- **`src/systems/MovementController.ts`** — pure, engine-agnostic input→intent state machine.
  Given the **set of directions held** this frame + a timestamp, it emits a discrete *step
  intent* using keyboard-auto-repeat rules: one step when the active direction changes (edge),
  then nothing until it has been held past `REPEAT_DELAY` (200ms), after which it repeats every
  frame. A quick tap is therefore deterministically **one tile**, regardless of tap length or
  step duration. Conflict resolution is **last-pressed-wins** via a recency stack: the active
  direction is the most-recently-pressed key still held, so holding Up then pressing Right
  switches to Right immediately, and releasing Right falls back to Up with no re-press.
  Auto-repeat state carries across direction changes, so switching while walking never stalls.
- **`src/systems/Player.ts`** — owns grid position, facing, and the step machine. `update(intent)`
  executes at most one step per non-null intent while idle; movement is **locked** during a
  step tween (`STEP_DURATION` 150ms) so the grid can never desync. Faces the requested
  direction (directional frames when present), and only steps onto tiles the world allows —
  it consults a `WorldGrid` (`src/types/grid.ts`, implemented by `GameMap`) for bounds +
  collision, turning in place against blocked tiles. Phaser is a **type-only** import here, so
  the class is runtime-pure and unit-testable without a browser.

The scene owns input only: `OverworldScene` reports the set of held arrow/WASD directions each
frame to `MovementController` (no priority — the controller resolves recency) and passes the
intent to `Player`. Touch controls come later.

Regression test: `tests/movement.test.ts` (run with `npm test`) simulates key-down/key-up and
asserts a tap moves exactly one tile, hold-past-delay auto-repeats, every direction behaves the
same, and last-pressed-wins switching (hold Up + press Right, release back to Up, rapid changes
while moving) works without stalling. Game-logic systems like these belong in `src/systems`.

## Maps

Maps are **Tiled** JSON files in `src/data/maps`, imported as data (data-driven) and parsed
by Phaser via `src/systems/GameMap.ts`. `GameMap` renders the layers, builds a collision
lookup, exposes map size, reads spawns + objects, and implements `WorldGrid` for the Player.

Maps are referenced by key through the **registry** `src/data/maps/index.ts` (`MAPS`, `MapKeys`):
warps target maps by these keys, and the overworld starts on `town`. To add a map: generate/author
the JSON, then register it. The sample maps are generated by `scripts/gen-map.mjs`
(`npm run gen:map`) — currently `town` (`sample-map.json`) and `street` (`street-map.json`).

**Format & conventions** (orthogonal, 16×16; everything keys off names):

- **Tileset** — one embedded tileset named **`placeholder`**, linked at load to the loaded
  `tiles` texture. GIDs (firstgid = 1, in `tileset.png` order): `1` grass, `2` path, `3` wall,
  `4` water. (GID `0` = empty.)
- **`ground`** (tile layer) — visual base; never blocks.
- **`collision`** (tile layer) — rendered *and* logical: **any non-empty cell blocks movement**.
  Put walls/water here so they're both visible and solid. (Empty cells = passable.)
- **`objects`** (object layer) — spawns, actors, warps, zones. `GameMap.getSpawn(name)` returns
  the tile coords of a named object; `GameMap.getObjects()` returns all objects with tile coords,
  tile size (`tileW`/`tileH`, for region rectangles), and flattened custom `properties`. The
  object `type` selects behaviour in `OverworldScene`:
  - **`player_start`** (a `spawn`) — required object; the initial player spawn.
  - **`entry`** — a named landing point a warp can target.
  - **`npc`** — an NPC (see below). Props: `dialogue` (id into `src/data/dialogues.ts`),
    `facing` (`up`/`down`/`left`/`right`), `wander` (bool), `tint` (optional `#rrggbb`).
  - **`warp`** — stepping onto this tile loads another map. Props: `target` (map key),
    `entry` (entry-object name in the target map). Drawn as a yellow marker.
  - **`encounter`** — a region rectangle; every tile it covers is an encounter zone. Prop:
    `zone` (id into `src/data/encounters.ts`). Drawn as a translucent overlay.

Layer names, the tileset name (`placeholder`), `player_start`, and the object types above are the
contract — keep them consistent across maps. New tile *types* are added by extending the tileset
image + GID map, not by special-casing logic.

## Map transitions & encounters

- **Warps** — `OverworldScene` maps warp tiles to `{ target, entry }`. On the player finishing a
  step (`Player.onStepComplete`) onto a warp tile, the scene `restart()`s itself with that map +
  entry (re-running `create()` cleanly rebuilds map/player/NPCs). The restart is deferred to the
  next `update()` so it never happens mid-tween. Initial launch uses no data → `town` /
  `player_start`.
- **Encounter zones** — data-driven in `src/data/encounters.ts`: `ENCOUNTER_ZONES[id] = { rate
  (0..1 per step), musicians: string[] }`. When a step finishes on an encounter tile,
  `rollEncounter(zone)` (`src/systems/encounters.ts`, pure + unit-tested) rolls; on success the
  scene logs `encounter triggered!` and briefly suppresses movement (`ENCOUNTER_PAUSE`). The real
  battle/audition hook is a TODO there. Add zones to the data table; reference them from an
  `encounter` map object's `zone` prop.

## NPCs & dialogue

- **`src/systems/NPC.ts`** — a grid-bound character spawned from `npc` map objects. It
  occupies (and therefore blocks) its tile, has a facing direction, and optionally wanders to
  free neighbouring tiles (reserving the target tile on step-start so nothing paths into it).
  Phaser is a type-only import, so it's runtime-pure and unit-tested (`tests/npc.test.ts`).
- **Collision** — `OverworldScene` builds the Player's `WorldGrid` as *map collision OR any
  NPC tile*, and gives NPCs an `isWalkable` query that also excludes the player and other NPCs.
- **Interaction** — pressing interact (**Space/Enter**) while idle and facing an NPC turns the
  NPC to face the player and opens its dialogue. The interact edge is tracked every frame so a
  held button can't re-fire when the overworld resumes.
- **`src/scenes/DialogueScene.ts`** — the modal overlay: bottom text box, optional speaker
  header, typewriter reveal. Space/Enter completes the current page if still typing, else
  advances; past the last page it resumes the overworld and stops itself.
- **Dialogue data** — `src/data/dialogues.ts`: `DIALOGUES[id] = { speaker?, pages: string[] }`,
  one entry per page. An NPC's `dialogue` property is the id. Add/edit dialogue here, not in code.

## Game data model (musicians, genres, techniques)

Content-only so far — no battle logic. Types live in `src/types`, content in `src/data`,
formulas/lookups in `src/systems`. Run `npm run check:data` for a sanity readout + checks.

**Types** (`src/types`):

- **`Genre`** (`genre.ts`) — `id` (one of `jazz`/`rock`/`classical`/`funk`/`electronic`/`folk`),
  `name`, `color`, and the relationship lists `strongAgainst` / `weakAgainst`.
- **`Stats`** (`stats.ts`) — the four-stat block: `stamina` (HP), `skill` (attack),
  `composure` (defense), `tempo` (speed). `StatKey = keyof Stats`.
- **`Technique`** (`technique.ts`) — `id`, `name`, `genre`, `power` (0 = status), `accuracy`
  (0..1), `staminaCost`, `priority`, optional `effect` (`{ kind: buff|debuff, stat, stages,
  target: self|opponent, chance }`).
- **`MusicianSpecies`** (`musician.ts`) — `id`, `name`, `baseStats`, `genres[]`,
  `learnset` (`{ level: techniqueId[] }`), `recruitDifficulty` (0..1).
- **`MusicianInstance`** (`musician.ts`) — a recruited individual: `speciesId`, `nickname`,
  `level`, `xp`, `currentStamina`, `techniques[]`, computed `stats`.

**Content** (`src/data`): `genres.ts` (the `GENRES` effectiveness chart — a consistent
hexagonal wheel, each genre strong vs the next two / weak vs the previous two), `techniques.ts`
(12 techniques, 2 per genre), `species.ts` (8 starter species across all genres, two
dual-genre). Each exposes a `*_LIST` and a `get*(id)` lookup.

**Systems** (`src/systems`):

- `genres.ts` — `getEffectiveness(attacker, defender)` returns the multiplier
  (`SUPER_EFFECTIVE` 2 / `NOT_VERY_EFFECTIVE` 0.5 / `NEUTRAL` 1); `getEffectivenessAgainst`
  multiplies across a multi-genre defender.
- `stats.ts` — `computeStats(species, level)` (classic 2·base·level/100 growth; stamina gets a
  flat + level bonus), `xpForLevel(level)` (medium-fast cubic, level 1 = 0) + `xpToNextLevel`,
  `knownTechniquesAt(species, level)` (most recent, capped at `MAX_TECHNIQUES` = 4), and
  `createInstance(species, level, nickname?)` which assembles a `MusicianInstance`.

Add musicians/genres/techniques by editing the data tables — no per-item logic.

## Asset keys

All assets are placeholder PNGs in `public/assets`, generated by
`scripts/gen-placeholders.mjs` (`npm run gen:assets`). Everything is built on the 16×16
grid. Loader keys and frame indices are defined once in `src/data/assets.ts` — always
reference assets by these keys, never by raw path.

| Key      | File                  | Type        | Notes                                                   |
| -------- | --------------------- | ----------- | ------------------------------------------------------- |
| `player` | `assets/player.png`   | spritesheet | `0` down, `1` up, `2` left, `3` right (`PlayerFrame`)   |
| `npc`    | `assets/npc.png`      | image       | single frame (generic NPC)                              |
| `tiles`  | `assets/tileset.png`  | spritesheet | `0` grass, `1` path, `2` wall, `3` water (`TileFrame`)  |
| `font`   | `assets/font.png`     | image       | bitmap-font atlas; loaded in BootScene, see Text below  |

The placeholder PNGs (`gen:assets`) and the font (`gen:font`) are generated; replace them with
real art later, keeping the same dimensions and keys. Asset URLs are resolved against Vite's
`BASE_URL` (`this.load.setBaseURL(import.meta.env.BASE_URL)`) so loading works both in dev and
from the GitHub Pages subpath.

## Text (bitmap pixel font)

All in-game text uses a **bitmap pixel font**, not Phaser `Text`. Phaser `Text` rasterizes at
the 240×160 base resolution and blurs when upscaled; a texture-based bitmap font scales with
nearest-neighbour, staying crisp like the tiles.

- The atlas `public/assets/font.png` is generated by `scripts/gen-font.mjs` (`npm run gen:font`)
  — a hand-authored 5×7 glyph set (ASCII 32..126) in 6×8 cells, drawn white so it can be tinted.
- `src/ui/font.ts` registers it as a Phaser **RetroFont** (cache key `pixel`); metrics there must
  match the generator. It's loaded + registered early in **BootScene** so even the loading bar
  uses it.
- **Always create UI text via `createText(scene, x, y, text, opts)` in `src/ui/text.ts`** (opts:
  `color` tint, `maxWidth` wrap, `origin`). It snaps to integer coordinates; combined with
  `roundPixels: true` in the game config, glyphs land on whole pixels. Do not use `this.add.text`.
- Non-text UI chrome (boxes, the dialogue "more" arrow) is drawn with Graphics/Shapes, which are
  already crisp.

## Commands

- `npm run dev` — start the Vite dev server with hot reload.
- `npm run build` — type-check (`tsc`) and produce a static build in `dist/`.
- `npm run preview` — serve the built `dist/` locally to verify the production build.
- `npm test` — run the Vitest suite (`tests/`).
- `npm run check:data` — run the data-model sanity checks + print a stats/effectiveness readout.
- `npm run gen:assets` — regenerate the placeholder PNGs in `public/assets`.
- `npm run gen:map` — regenerate the sample Tiled maps (`town`, `street`) in `src/data/maps`.
- `npm run gen:font` — regenerate the bitmap-font atlas `public/assets/font.png`.
- `npm run smoke` — headless Playwright check (boot, walk, collision, camera, NPC dialogue).
  Needs a server running first; defaults to the dev server (`npm run dev`), override `SMOKE_URL`.

## Deploying to GitHub Pages

GitHub Pages serves project sites from a subpath (`https://<user>.github.io/<reponame>/`),
so the production build needs a matching base path. `vite.config.ts` sets `base` to
`/band-leader-rpg/` for builds (override with the `VITE_BASE` env var if the repo name
differs). Dev/preview use `/`.
