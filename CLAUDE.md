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
BootScene  ──▶  PreloadScene  ──▶  TitleScene  ──▶  OverworldScene  ◀──overlay──▶  DialogueScene
                                                                    ◀──overlay──▶  BattleScene
                                                                    ◀──overlay──▶  PartyScene
                                                                    ◀──overlay──▶  BagScene / ShopScene
                                                                    ◀──overlay──▶  CareerScene
                                                                    ◀──overlay──▶  PauseScene (Esc)
```

- **BootScene** — early synchronous setup; logs `"boot"`, then starts PreloadScene. No
  asset loading here.
- **PreloadScene** — loads every asset (keys from `src/data/assets.ts`) while showing a
  loading bar, then starts TitleScene.
- **TitleScene** — the start menu: **Continue** (only if a save exists) resumes from localStorage;
  **New Game** (after a confirm if a save exists) wipes the save + registry and starts the intro.
- **OverworldScene** — loads a Tiled map (by key), spawns the player + NPCs, blocks the player
  against collision tiles and NPCs, follows the player with a clamped camera, opens NPC dialogue
  on the interact button, warps between maps on warp tiles, and rolls random encounters in
  encounter zones (see Maps + Map transitions & encounters). A warp re-runs the scene with the
  target map/entry.
- **DialogueScene** — a modal overlay (not a sequential scene). The overworld `pause()`s
  itself and `launch()`es it; on close it `resume()`s the overworld. Listed last in
  `src/main.ts` so it renders on top.
- **BattleScene** — a modal overlay (same pause/launch/resume pattern) for 1v1 turn-based
  battles (see Battle system + Progression & party). Launchable from the overworld debug key `B`.
- **PartyScene** — a modal overlay for party management (see Progression & party). Opened from
  the overworld with key `P`.
- **BagScene / ShopScene** — modal overlays for inventory and buying (see Inventory, items &
  currency). Bag opens from the overworld with key `I`; the shop opens by talking to a shop NPC.
- **CareerScene** — a modal overlay showing residencies + rivals beaten (see Venues, trainers &
  residencies). Opened from the overworld with key `C`.

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
the JSON, then register it. The maps are generated by `scripts/gen-map.mjs` (`npm run gen:map`) —
`town`, `street`, `studio`, `jazz_club`, `vip_lounge`, `park`, `warehouse`, `backstage`, plus the
genre-district maps (`<genre>_route` + `<genre>_hub` for rock/folk/funk/classical — see World map).

**Format & conventions** (orthogonal, 16×16; everything keys off names):

- **Tileset** — a map embeds one tileset, linked at load to a loaded texture **by name** via
  `TILESET_TEXTURES` (`src/data/assets.ts`); `GameMap` binds whatever the map declares. **Outdoor**
  maps use **`placeholder`** → the `tiles` texture: GIDs (firstgid = 1, in `tileset.png` order)
  `1` grass, `2` path, `3` wall, `4` water. **Interior** maps (see "Interior maps" below) use
  **`interior`** → the real-art `tiles_interior` texture: GIDs follow `InteriorTile` (`assets.ts`),
  e.g. `1` wood floor … `7` wood wall … `12` rug … `18` fireplace. (GID `0` = empty in both.)
- **`ground`** (tile layer) — visual base; never blocks.
- **`decor`** (tile layer, **optional**) — extra visual tiles (rugs, stage spotlights) drawn over
  the ground; **never blocks**. Used by interior maps; absent on most maps (`createLayer` returns
  null, ignored).
- **`collision`** (tile layer) — rendered *and* logical: **any non-empty cell blocks movement**.
  Put walls/water here so they're both visible and solid. (Empty cells = passable.) Interiors put
  wall-mounted furniture (shelves/plants/art) here too — it's a non-empty tile, so it still blocks.
- **`objects`** (object layer) — spawns, actors, warps, zones. `GameMap.getSpawn(name)` returns
  the tile coords of a named object; `GameMap.getObjects()` returns all objects with tile coords,
  tile size (`tileW`/`tileH`, for region rectangles), and flattened custom `properties`. The
  object `type` selects behaviour in `OverworldScene`:
  - **`player_start`** (a `spawn`) — required object; the initial player spawn.
  - **`entry`** — a named landing point a warp can target.
  - **`npc`** — an NPC (see below). Props: `dialogue` (id into `src/data/dialogues.ts`),
    `facing` (`up`/`down`/`left`/`right`), `wander` (bool). Its character sprite is chosen by
    `characterForNPC(name)` (see Asset keys); the legacy `tint` prop is no longer used.
  - **`warp`** — stepping onto this tile loads another map. Props: `target` (map key),
    `entry` (entry-object name in the target map). Drawn as a yellow marker.
  - **`encounter`** — a region rectangle; every tile it covers is an encounter zone. Prop:
    `zone` (id into `src/data/encounters.ts`). Drawn as a translucent overlay.
  - **`heal`** — a rehearsal-studio heal point. Blocks movement (face it to use); interacting
    restores the whole party's stamina. Drawn with a "+" marker.
  - **`lore`** — a collectible note/record/poster (prop `lore` = an id in `src/data/lore.ts`).
    Face + interact to read it; the first read sets its `lore.*` flag and adds it to the Lore log
    (see Side content). Blocks its tile like `heal`.

Maps: `town`, `street` (busking encounters), `studio` (heal point), `park` (a higher-level
`park_path` encounter zone, east of town, leading to the second venue). The studio is also where
the player lands after losing a battle. (Venue maps — `jazz_club`/`vip_lounge` and
`warehouse`/`backstage` — are covered under Venues, trainers & residencies; the genre districts
under World map below.)

Layer names, the tileset names (`placeholder` / `interior`), `player_start`, and the object types
above are the contract — keep them consistent across maps. New tile *types* are added by extending
the relevant tileset image + GID map, not by special-casing logic.

**Interior maps** — the indoor maps render with the **real LimeZu interior tileset** (`interior` →
`tiles_interior`) instead of the placeholder one, so rooms read as real venues/rooms (themed
floors + walls, plus rugs/shelves/plants/spotlights as decor). They are: `studio`, `jazz_club`,
`vip_lounge`, `warehouse`, `backstage`, `the_cellar`, `the_loft`, and `monocorp_hq`. All other maps
(`town`, `street`, `park`, and every district `<genre>_route`/`<genre>_hub`) stay **outdoor** on the
placeholder tileset. The interior tileset PNG is sliced from the LimeZu pack by
`scripts/gen-tiles-interior.py` (`npm run gen:tiles-interior`); `gen-map.mjs` authors interiors with
`makeInteriorMap` + the `IT` GID constants (mirroring `InteriorTile`). Retexturing only changed
which tiles render — collision footprints, layouts, warps, and object positions are unchanged.

## World map (districts)

`town` is downtown — the central hub and starting district. The wider world is a set of
**genre districts**, each a *scene* themed on one genre. Every district is shaped the same way
(generated by the shared `buildDistrict()` helper in `scripts/gen-map.mjs`):

```
town --[gate: requires <residency>]--> <genre>_route --> <genre>_hub --> (venue, Phase 5)
```

- **route** (`<genre>_route`) — a path with that district's **encounter zone** (`<genre>_route`,
  see Map transitions & encounters), connecting town to the hub.
- **hub** (`<genre>_hub`) — a plaza with a shared **gear stall** shop (`gear_stall`), a genre
  **local**, a **rehearsal** heal point, and a **sign** marking where the district's venue opens in
  **Phase 5** (no venue map yet — the sign is the placeholder).

| District | Genre | Route pool (levels) | Opens after |
| -------- | ----- | ------------------- | ----------- |
| Downtown (`town` + `street`/`park`) | mixed | `busking_street` (5–8), `park_path` (9–12) | start |
| The Blue Note (`jazz_club`) | jazz | — (venue, exists) | start |
| The Warehouse (`warehouse`) | electronic | — (venue, exists) | start |
| Rock Strip (`rock_route`/`rock_hub`) | rock | rifflet/amplifret/voltaxe (9–13) | **jazz** residency |
| Folk Riverside (`folk_route`/`folk_hub`) | folk | balladeer/wanderlay (9–13) | **jazz** residency |
| Funk Block (`funk_route`/`funk_hub`) | funk | grooveling/funkadel/fusionaut (13–17) | **electronic** residency |
| Classical Hall (`classical_route`/`classical_hub`) | classical | maestrel/sonatina/orchestron (13–17) | **electronic** residency |

**Gating / "visible-but-locked"** — district entrances are residency **`gate`** objects in `town`
(`to_rock`/`to_folk` require `jazz`; `to_funk`/`to_classical` require `electronic`). A gate blocks
movement and shows the path; interacting warps you through only once you hold the residency, so the
world opens up as you win venues. (Caution: a gate's `requires` prop is a **residency id**, handled
by the gate logic — it is NOT a story-flag list. Story-flag gating via `requires`/`forbids` props
applies to non-gate objects only; see Flag-gated map content.) To add a district: append a config
to `DISTRICTS` in `gen-map.mjs`, add a town gate + return `entry`, register the two maps, and add
the route's encounter zone + the hub/sign dialogues.

## Map transitions & encounters

- **Warps** — `OverworldScene` maps warp tiles to `{ target, entry }`. On the player finishing a
  step (`Player.onStepComplete`) onto a warp tile, the scene `restart()`s itself with that map +
  entry (re-running `create()` cleanly rebuilds map/player/NPCs). The restart is deferred to the
  next `update()` so it never happens mid-tween. Initial launch uses no data → `town` /
  `player_start`.
- **Encounter zones** — data-driven in `src/data/encounters.ts`: `ENCOUNTER_ZONES[id] = { rate
  (0..1 per step), minLevel, maxLevel, musicians: string[] (the common pool), rare?: string[],
  rareChance?: number (default `RARE_CHANCE` 0.15) }`. When a step finishes on an encounter tile,
  `rollEncounter(zone)` (`src/systems/encounters.ts`, pure + unit-tested) rolls rate → (rare-vs-
  common, only when a `rare` pool exists) → pick; on a hit the overworld starts a real battle (see
  Recruiting & encounters). **Signature** musicians live in `rare` pools — including two signature
  zones in the residency-gated reward areas (`blue_note_backstage` in the VIP lounge → Cassette,
  `warehouse_afterhours` in the backstage → Aurora). Add zones to the data table; reference them
  from an `encounter` map object's `zone` prop.

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
(30 techniques, 5 per genre — a core trio + an expanded pair), `species.ts` (~50 species across
all genres incl. ~10 dual-genre and a handful of high-difficulty **signatures**, e.g. Cassette,
the echo of Cass's old sound). Each exposes a `*_LIST` and a `get*(id)` lookup. `tests/
datamodel.test.ts` guards roster volume + that every species/technique/encounter reference resolves.

**Systems** (`src/systems`):

- `genres.ts` — `getEffectiveness(attacker, defender)` returns the multiplier
  (`SUPER_EFFECTIVE` 2 / `NOT_VERY_EFFECTIVE` 0.5 / `NEUTRAL` 1); `getEffectivenessAgainst`
  multiplies across a multi-genre defender.
- `stats.ts` — `computeStats(species, level)` (classic 2·base·level/100 growth; stamina gets a
  flat + level bonus), `xpForLevel(level)` (medium-fast cubic, level 1 = 0) + `xpToNextLevel`,
  `knownTechniquesAt(species, level)` (most recent, capped at `MAX_TECHNIQUES` = 4), and
  `createInstance(species, level, nickname?)` which assembles a `MusicianInstance`.

Add musicians/genres/techniques by editing the data tables — no per-item logic.

## Battle system

1v1 turn-based performance battles. All combat **logic is pure and Phaser-free** in
`src/systems/battle` (unit-tested in `tests/battle.test.ts`); `BattleScene` only renders it.

- **Logic** (`src/systems/battle/`):
  - `damage.ts` — `computeDamage(input)` (FireRed-style formula adapted to skill vs composure;
    the random spread is passed in for determinism), `stageMultiplier`, `STAB`.
  - `engine.ts` — `createBattleState`, `resolveTurn(state, playerAction, opponentAction, rng)`
    which **mutates** state and returns ordered `BattleEvent[]`, plus `chooseOpponentAction`
    (simple AI), `effectiveStat`, `isFainted`, `makeBattler`.
  - `types.ts` — `Battler`, `BattleState`, `BattleAction` (`perform`/`run`/`recruit`/`bag`),
    `BattleEvent` (action / miss / damage / effectiveness / statChange / faint / run / outcome).
- **Turn resolution**: running pre-empts the turn; otherwise order by technique `priority`,
  then effective `tempo`, then a coin flip. Each technique: accuracy roll → damage (reads
  `power`, genre effectiveness via `getEffectivenessAgainst`, STAB, stat stages) → optional
  buff/debuff effect → faint check. A KO ends the turn. Outcome: `player_won` / `player_lost`
  / `fled`. **Stamina is the HP pool** here (damage depletes it; faint at ≤ 0); technique
  `staminaCost` is reserved for a future energy system (not consumed yet).
- **`BattleScene`** — layout: opponent top-right (+ info top-left), player bottom-left (+ info
  bottom-right), an HP bar each, a command menu (Perform / **Switch** / Recruit / Bag / Run) and a
  technique submenu. **Switch** swaps in a reserve mid-battle and spends the turn (the opponent
  then acts), like the forced switch after a faint but voluntary. It collects the player's action, calls `resolveTurn` (opponent action from the AI),
  then plays the events back as paced messages + HP-bar updates. Effectiveness feedback:
  "It's a showstopper!" (super) / "It falls flat..." (not very). Recruit/Bag run auditions
  (see Recruiting & encounters); progression/party handling on win/faint is below.
- **Driving it**: `BattleScene` takes scene data `{ party: MusicianInstance[], opponent:
  MusicianInstance, parent }` — no musician data is hardcoded in the scene. The overworld
  launches it with a fake party on the **debug key `B`** (pauses the overworld, resumes on exit).

## Progression & party

- **Persistent party** — the player's band (up to `MAX_PARTY` = 6 `MusicianInstance`s) is
  game-global state stored in the Phaser **registry** under `"party"` (so it survives scene
  restarts / warps). `OverworldScene` seeds it once via `createStarterParty()`
  (`src/systems/party.ts`). Battles receive the *same* instances as scene data and mutate them
  in place, so XP/level/stamina changes persist.
- **XP & level-ups** (`src/systems/progression.ts`, pure + tested) — on victory, `BattleScene`
  awards `xpReward(opponent)` to each surviving participant via `awardXp(instance, amount)`,
  which applies multi-level jumps: recompute stats, carry the max-stamina gain into current
  stamina, and learn the species' learnset techniques for each new level (dropping the oldest
  if already at `MAX_TECHNIQUES`). Level-ups are announced in the battle message box.
- **Faint & switch** — `BattleScene` owns the party + active index. When the active musician
  faints (engine outcome `player_lost`), if a reserve is alive it prompts an in-battle switch
  menu; only if **all** have fainted is the battle truly lost → the party is healed and the
  player is sent to the **studio** (`scene.start("OverworldScene", { map: "studio", ... })`).
- **Party + roster menu** (`PartyScene`, overlay, key **`P`**) — lists the active party *and* the
  roster (recruits beyond the 6-slot party), shows the highlighted member's stats + techniques
  live, and reorders via Confirm (grab) → Confirm (drop/swap). The swap works **across** party and
  roster (`swapSlots` in `party.ts`), so you can bench a member or call one up; Esc exits.
- **Rehearsal studio heal** — the `studio` map has a `heal`-type object (a blocking "stage" the
  player faces). Interacting calls `healParty` (restores all stamina to full) and shows a
  dialogue. `party.ts` provides `healParty`, `firstAliveIndex`, `isPartyDefeated`, `swapMembers`.

## Recruiting (auditions) & encounters

- **Audition math** (`src/systems/recruit.ts`, pure + tested) — `auditionAttempt({ maxStamina,
  curStamina, difficulty, itemModifier })` is a FireRed-style catch roll adapted to stamina:
  odds rise as the opponent's stamina drops, fall with species `recruitDifficulty`, and rise
  with an item multiplier. Returns `{ success, shakes, chance }`; `shakes` (0..4) drives the
  suspense animation.
- **Roster overflow** (`src/systems/roster.ts`) — `recruit(party, roster, instance)` adds the
  recruit to the party if there's room (< `MAX_PARTY`), else to the **roster** (overflow store).
  Both are game-global in the registry (`"party"`, `"roster"`).
- **Items** (`src/data/items.ts`) — the **Demo Tape** (`recruitModifier` 2) boosts odds. The bag
  is registry state (`"bag"`, e.g. `{ demo_tape: 3 }`).
- **In battle** — `Recruit` runs a plain audition; `Bag` → an item runs a boosted audition and
  consumes it. Either way `BattleScene` plays the suspense (opponent sprite wobbles per shake),
  then **success** ("They want to join your band!" → added to party/roster, battle ends) or
  **failure** ("They walked off...") which **costs the player's turn** — the opponent still acts
  (`resolveTurn` with a non-`perform` player action lets only the opponent move).
- **Real encounters** — stepping in an encounter zone rolls `rollEncounter(zone)`; on a hit the
  overworld picks a species from the zone pool, builds an opponent at a random level in the
  zone's `minLevel..maxLevel`, and starts a real battle. (`busking_street`: grooveling / crooner
  / balladeer, Lv 5–8. `park_path`: amplifret / funkadel / sonatina / wanderlay, Lv 9–12 — the
  step-up zone east of town, home to the warehouse counters. The genre-district routes
  `rock_route`/`folk_route` (Lv 9–13) and `funk_route`/`classical_route` (Lv 13–17) each have a
  genre-matched pool — see World map.)

## Inventory, items & currency

- **Items** (`src/data/items.ts`) — each `Item` has a discriminated `effect`
  (`recruit` | `restoreStamina` | `boostStat`), `price`, and `usableInBattle` / `usableInField`
  flags. Current items: Demo Tape (recruit, battle-only), Snack / Energy Drink (restore stamina,
  both contexts), Hype Track (raise Skill, battle-only). Extend by adding to `ITEMS`.
- **Bag & currency** are game-global registry state: `"bag"` (`Record<itemId, count>`),
  `"currency"` (number, starts 300), and `"flags"` (one-time event tracking).
- **Logic** (`src/systems/inventory.ts`, pure + tested) — `addItem`/`removeItem`/`itemCount`/
  `hasItem`/`bagEntries`, `restoreStamina(instance, amount)` (caps at max, returns amount
  healed), `canAfford`.
- **Using items** — items work **in battle and in the field**:
  - In battle, the **Bag** command lists `usableInBattle` items and `useBattleItem` dispatches by
    effect (recruit → audition, restoreStamina → heal active, boostStat → raise a stage); using an
    item costs the player's turn (opponent still acts).
  - **`BagScene`** (overlay, overworld key **`I`**) views all items and uses `usableInField` ones
    on a chosen party member (restore stamina).
- **Acquiring items** — dialogue NPCs can grant items/currency: a `Dialogue` may carry a `gift`
  (`{ items?, currency?, once }`, applied via `applyGift`, `once` flagged so it's one-time) or a
  `shop` (item ids). A shop NPC opens **`ShopScene`** (overlay): a Buy / Sell / Leave menu — **Buy**
  spends currency on the shop's wares, **Sell** trades bag items back at half price (`SELL_RATE`).
  Town has a **roadie** (gift, just left of spawn) and a **shopkeeper** (shop, a few tiles right).

## Venues, trainers & residencies

The "gym/badge" progression, reskinned as winning over music venues.

- **Trainers** (`src/data/trainers.ts`) — rival band leaders + venue headliners. A `Trainer` has a
  fixed `team` (species + level), `reward` (currency), intro/defeat/post lines, a `sightRange`
  (line-of-sight tiles; 0 = interaction only), an optional `residency` (venue bosses grant it), and
  an optional **`storyFlag`** (set on defeat — advances the main objective; see Story). Placed via
  map objects of type **`trainer`** (prop `trainer` = id). Authored: `rival_max` (town), the six
  venue headliners — `jazz_headliner`, `warehouse_headliner`, `rock_headliner`, `folk_headliner`,
  `funk_headliner`, `classical_headliner` — the warehouse guard `rival_dex`, and the finale bosses
  `monocorp_enforcer`/`monocorp_curator`/`monocorp_exec`/`monocorp_ceo`.
- **Triggering** — `OverworldScene` records placed trainers (NPC sprite + data). On the player
  finishing a step, `trainerSeeing` checks each undefeated trainer's line of sight; on interaction,
  facing a trainer starts it. Either way the intro dialogue plays, then the battle. Beaten trainers
  are recorded in the registry (`"trainersDefeated"`) and don't retrigger (they show their post-line).
- **Trainer battles** (`BattleScene`) — `BattleData` carries `opponents: MusicianInstance[]` (one for
  wild, several for a trainer) and an optional `trainer` descriptor. Each fainted opponent awards XP;
  the trainer sends out the next until the team is cleared. Recruit/Run are disabled vs trainers. On
  victory the reward is paid, the trainer is marked defeated, any `residency` is granted, and any
  `storyFlag` is set (this is how clearing a venue advances the main story).
- **The venue gauntlet** — six venues, each a genre-themed headliner that grants a residency + sets
  a `story.<genre>_won` flag, with a story beat before (intro) and after (defeat lines): The Blue
  Note (jazz, Lv8-9), The Warehouse (electronic, Lv13-15, behind guard `rival_dex`), and the four
  district-hub venues The Amp (rock), The Landing (folk), The Pocket (funk), The Conservatory
  (classical). Genre logic shapes each: jazz/electronic/folk need a *recruited counter*; rock/funk/
  classical (countered by the starters) are *level checks*. `tests/balance.test.ts` guards every
  venue's beatable-but-not-trivial curve (tuned by simulation).
- **The finale** — once all six `story.*_won` flags are set, facing **The Chairman** atop
  `monocorp_hq` (the Tower, warped to from town) fires `finale_gauntlet` (`src/data/events.ts`): an
  Elite-Four run of four boss battles **back-to-back with no healing** (cutscene `battle` steps),
  the reveal that the Chairman is Vy's vanished legend, then a `win` step → `WinScene` (credits +
  Hall of Fame), which saves and sets `story.game_complete`. The gauntlet's endgame curve is tested
  too (under-leveled wipes; a leveled six-piece clears it).
- **Residencies** (`src/data/residencies.ts`) — the badge equivalent, tracked in the registry
  (`"residencies"`): `jazz`, `electronic`, `rock`, `folk`, `funk`, `classical`, each granted by its
  venue headliner.
- **Unlock (gated)** — a map object of type **`gate`** (`target`, `entry` + one of: `requires` =
  residency id, `requiresFlag` = story flag, or `requiresItem` = bag item) is a bouncer that blocks
  movement; interacting warps you through only if the condition is met, otherwise it turns you away.
  The jazz residency unlocks the VIP lounge; the electronic residency unlocks the backstage; see
  Side content for the optional areas (a residency gate and an item gate) in the busking street.
- **Career menu** (`CareerScene`, overlay, key **`C`**) — shows residencies earned and rivals beaten.
- **Logic** (`src/systems/career.ts`, pure + tested) — `isTrainerDefeated`/`markTrainerDefeated`,
  `hasResidency`/`addResidency`, `buildTrainerTeam`, and `lineOfSight`.
- **Maps** — standalone venues: `jazz_club` (+ `vip_lounge`) reached from town directly, `warehouse`
  (+ `backstage`) via the `park`. The other four venue bosses live on their district hub's stage
  (`rock_hub`/`folk_hub`/`funk_hub`/`classical_hub` — see World map). The finale is `monocorp_hq`
  (the Tower), warped to from town.

## Balance & difficulty

All difficulty tuning lives in one place: **`src/data/balance.ts`** (`BALANCE`). To make the
whole game easier/harder, edit these knobs — don't scatter constants through formulas:

- `staminaMultiplier` — global HP-pool scale (bigger = longer, less swingy fights). Applied in
  `computeStats`.
- `playerDamageMultiplier` / `enemyDamageMultiplier` — scale damage the player's party deals /
  takes. Applied per-side in the battle engine via `computeDamage`'s `outputMultiplier`.
- `xpRewardMultiplier` — battle XP scale (bigger = level faster). Applied in `xpReward`.

`tests/balance.test.ts` is a regression guard: it simulates the rival and both venue fights
(greedy AI both sides, many RNG seeds) and asserts each stage is **beatable but not trivial** —
the starter beats the rival; a normally-played party (leveled + a busking recruit) beats the first
venue and the bare starter does not; and the second venue needs a genre counter, not just levels.
Re-run after any balance/level/data change.

Early-game targets (current values): starter Rifflet L5 + Crooner L8; rival Lv5–6; first venue
boss Lv8–9. The jazz venue is hard-countered by recruiting a **Balladeer** (folk → 2× vs jazz)
from the busking zone — the intended "build a team" answer rather than grinding.

Second-venue targets: the warehouse guard (`rival_dex`) is Lv11–12 and the electronic boss
(`warehouse_headliner`) is Lv13–15 — a clear tier above the jazz club. It is hard-countered by a
**Sonatina** (classical → 2× vs electronic) recruited from the `park_path` zone; **Funkadel**
(funk) is a softer counter (the boss's Orchestron resists funk). Leveling a folk/jazz party
without a counter is *not* enough — the beatability test enforces this.

## Story, flags & scripted events

A data-driven story/quest engine built on the existing `flags` registry state (so progress
persists with the save for free — see Saving). The **opening arc is implemented** as content in
`src/data` (see "The opening" below); extend the story by editing those same data tables.

- **Story flags/variables** — named booleans in the registry `"flags"` map (convention: prefix
  story flags `story.`). `src/systems/story.ts` (pure, tested) reads/sets them and derives the
  current objective: `setStoryFlag`/`isFlagSet`, `flagsAllow(flags, requires?, forbids?)` (the gate
  shared by events + map objects), `currentMilestone`/`currentObjective`/`currentChapter`/
  `completedMilestones`/`storyComplete`, and `interpolate(text, vars)` (substitutes `{name}` etc.).
- **Milestones** (`src/data/story.ts`, `STORY: Milestone[]`) — an ordered list `{ id, chapter,
  objective, flag }`. The **current objective** is the first milestone whose `flag` isn't set;
  earlier ones read as completed. Add milestones in order; set their `flag` when achieved.
- **Scripted events / cutscenes** (`src/data/events.ts`, `EVENTS: StoryEvent[]`) — each event has a
  `trigger` (`enterMap` | `enterTile {x,y}` | `interact {object}`), optional `requires`/`forbids`
  flag gates and a `once` flag (set on completion; blocks replay), and ordered `steps`. Step kinds:
  `dialogue`, `nameEntry` (prompts via `NameEntryScene`, persists the player's name), `wait`,
  `turn`/`walk` (actor = `"player"` or a map object's `name`), `setFlag`, `giveItem`,
  `giveCurrency`, `battle` (`trainer` or `species`+`level`), and `win` (save + roll the WinScene —
  used by the finale). The engine `src/systems/cutscene.ts`
  (pure, tested) is `findEvent`/`eventEligible`/`triggerMatches` + `runCutscene(steps, handlers)` —
  it sequences steps and delegates effects to injected handlers.
- **Playback** — `OverworldScene` checks for an eligible event on map-enter (`create`), step
  (`handleStepComplete`, takes precedence over warps/encounters), and NPC interaction (pre-empts
  dialogue). It plays via `cutsceneActive` (input is frozen; cutscene-driven steps don't
  re-trigger warps/encounters), supplying handlers that move actors (`Player.walk/turn`,
  `NPC.walk/faceTo`), show dialogue (awaiting `DialogueScene`'s `onClose`), run battles (awaiting
  the scene `resume`), and mutate flags/bag/currency. The `once` flag is set when the run finishes.
- **Flag-gated map content** — any **non-`gate`** map object may carry `requires`/`forbids` props
  (comma-separated flag lists); `buildObjects` skips it unless `flagsAllow` passes, so
  NPCs/warps/etc. appear, disappear, or swap as the story advances. `gate` objects are exempt: a
  gate's `requires` is a **residency id** (handled by the gate logic), not a story flag — don't
  conflate the two.
- **Current-objective HUD** — `OverworldScene` shows a persistent, screen-fixed objective line
  (top-left) from `currentObjective(STORY, flags)`, refreshed each frame (cached) and hidden during
  cutscenes; it advances automatically as story flags are set.
- **Quest log** — `QuestScene` (overlay) shows the current chapter + objective and recent completed
  milestones, derived from `STORY` + flags. Open it from the pause menu's **Quests** entry or the
  overworld key **`Q`**.
- **Player name** — chosen via the `nameEntry` step (`NameEntryScene`, a grid usable by D-pad/A/B
  *and* hardware typing), stored in the registry `"playerName"` and persisted in the save
  (`DEFAULT_PLAYER_NAME` fallback). It surfaces anywhere text contains `{name}`: dialogue (cutscene
  + NPC, via `OverworldScene.withName`), the objective HUD, and the quest log.

**The opening** (content in `src/data/story.ts` + `src/data/events.ts`, town objects in
`scripts/gen-map.mjs`): premise — the live scene is dying under the homogenizing label **Monocorp**;
the player is an unknown leader out to revive it; mentor **Vy** once played with a legendary leader
who vanished. The new-game flow is the town `enterMap` event `intro` (`once: story.intro_done`):
name entry → motivation → Vy hands the starter band → first hint of Monocorp + the vanished legend.
Then three flag-gated `interact` beats guide the early arc: `beat_rival` (meet the rival; runs the
real `rival_max` battle → `story.met_rival`), `beat_monocorp` (a Monocorp rep appears only after
`met_rival` and makes the homogenizing pitch → `story.saw_monocorp`), and `beat_mentor_warning`
(Vy's warning ties Monocorp to the vanished legend and points you at The Blue Note →
`story.mentor_warning`). The objective HUD advances through each, ending on "Win your first
residency at The Blue Note."

**Recurring cast & arcs** (all data — `src/data/events.ts` beats + `src/data/trainers.ts` teams,
with NPCs placed flag-gated via `scripts/gen-map.mjs`; the relationship state IS the set of story
flags). Each beat chains on the previous one's flag, so the arcs stay ordered no matter the route:

- **The rival (Max)** — five beats across the circuit with escalating teams (`rival_max`,
  `rival_max_2..5`): cocky (town) → tempted by Monocorp (Rock Strip) → takes the offer (Funk Block)
  → signed, "Max [Monocorp]" (Classical Hall) → quits and is redeemed in town before the finale
  (`story.rival2_done`…`rival5_done`, plus `rival_signed`/`rival_redeemed`). His NPC appears in each
  hub only inside its `requires`/`forbids` flag window.
- **The mentor (Vy)** — recurring town scenes (`vy_arc_2..4`) that name the vanished legend
  (**Cass**) and reveal Vy's guilt, gated on circuit milestones, paying off the finale (the Chairman
  is Cass).
- **The antagonist** — recurring lower-tier **Monocorp A&R reps** (`ar_rep_strip`/`block`/`hall`,
  escalating) ambush the district routes as you progress, plus the four finale bosses.
- **Reactive flavour** — repeatable, flag-gated beats (no `once`/`setFlag`) that swap an NPC's lines
  with progress (district locals after their venue falls; the busker tracking Max's arc + a post-game
  line). They pre-empt the NPC's base dialogue and are mutually exclusive so order is irrelevant.

`tests/story-arc.test.ts` guards all of this: full map-reference integrity (every
warp/gate/dialogue/trainer/zone/lore resolves), event well-formedness, the rival + Vy arc gating
sequences, sidequest + reactive-line resolution, and trainer escalation invariants.

**Side content & curiosity hooks** (all data-driven on the same systems):

- **Collectible lore** (`src/data/lore.ts`, pure `src/systems/lore.ts`) — notes/records/posters
  about Cass and the old scene, placed as `lore` map objects in out-of-the-way corners across the
  world. Reading one sets a `lore.*` flag; the **Lore log** (`LoreScene`, pause menu "Lore" or
  overworld key `L`) tracks found-vs-`???` with an X/N count.
- **Sidequests** — small NPC stories via chained interact events (give → condition → reward), e.g.
  "The Lost Record" (completion gates on a lore collectible), "Prove It" (a one-shot battle), and
  "Mixtape Delivery" (downtown → the folk hub). Rewards via `giveItem`/`giveCurrency`.
- **Optional areas** — visible-but-locked from the start in the busking street: **The Cellar**
  (folk-residency gate) and **The Loft** (item gate — a Backstage Pass from the Fixer NPC). Each is
  a small bonus map with a hidden encounter zone (rare: Undertone / Skyline) + a lore scrap.

Pure logic is unit-tested in `tests/story.test.ts` (flags/gating/progression, `interpolate`, + a
full cutscene run through `runCutscene` with mock handlers); the save round-trip incl. `playerName`
is in `tests/save.test.ts`.

## Saving & loading

State persists to **localStorage** across browser refreshes.

- **`src/systems/save.ts`** — `SaveData` captures everything: current `map` + player `x`/`y`,
  `playerName`, `party`, `roster`, `bag`, `currency`, `flags`, `trainersDefeated`, `residencies`,
  plus a `version` for future migrations. The serialize/`deserialize`/`snapshot`/`applyToStore` logic is
  pure (no DOM) and unit-tested (`tests/save.test.ts`); `saveGame`/`loadSave`/`hasSave`/`clearSave`
  are thin localStorage wrappers. `deserialize` guards against missing/corrupt/wrong-version data
  (returns null). The store is the Phaser **registry** (which already holds the live state); the
  overworld writes its current `loc` (`{ map, x, y }`) to the registry on each step.
- **Pause menu** (`PauseScene`, overworld key **Esc**) — its first option is **Save Game**
  (writes localStorage). It also opens Party/Bag/Career, the **Quests** log (also overworld key
  `Q` — see Story, flags & scripted events), an **Audio** control (mute/volume — see Audio), and
  Resume.
- **Boot flow** — `PreloadScene` → `TitleScene`. **Continue** loads the save, applies it to the
  registry, and starts the overworld at the saved map/tile. **New Game** clears the save + registry
  and starts `{ newGame: true }`, where the overworld auto-plays the mentor **intro** (the `intro`
  dialogue — gives the starter band + explains the goal). The intro never replays on a loaded game.
- **Interaction hint** — `OverworldScene` shows a "!" over the player when it's idle and facing an
  interactable (NPC, trainer, heal point, or gate), via `updateHint` / `isInteractableAt`.

## Touch / mobile controls

On-screen controls for phones live in **`src/ui/touchControls.ts`** (`initTouchControls`, called
from `main.ts`). Key idea: the buttons **dispatch the same `KeyboardEvent`s** the game already
listens for, so movement, dialogue, battle menus, and every overlay work via touch with no
input rewrites:

- **D-pad** (lower-left) → Arrow keys; **A** (lower-right) → Space (confirm/interact/advance);
  **B** → Escape (cancel/back; opens the pause menu on the field). Party/Bag/Career are reached
  through the pause menu, so the four buttons cover everything.
- Synthetic events override the deprecated `keyCode`/`which` getters (what Phaser matches on)
  before dispatch. Hold a D-pad button to walk (it's `isDown`-based, like the keyboard).
- Shown only on touch devices (`maxTouchPoints`/`ontouchstart`/`pointer: coarse`) — or force with
  `?touch` for testing on desktop. The overlay is plain DOM over the canvas (`z-index` above it).
  The buttons live in two cluster boxes (`.tc-dpad`, `.tc-actions`); the buttons are positioned
  relative to their cluster, so only the clusters move between orientations.
- **Orientation** (CSS `@media` only — both are fully supported, neither is forced):
  - **Portrait** (handheld-emulator style, the default-friendly layout): the `#game` box is pinned
    to the top in a 3:2 frame fitted to the screen width (`height: min(66.67vw, 64vh)`), and
    `.tc-root` becomes a control **panel** filling the space below it. The two clusters are
    vertically centered in the panel and capped to its height (`--panel-h`) so they can **never**
    overlap the game screen (D-pad lower-left, A/B lower-right).
  - **Landscape** (fallback): the game fills the screen and the clusters overlay the lower corners.
  - Phaser's `Scale.FIT` + `CENTER_BOTH` fits the canvas into whatever size `#game` is, keeping
    pixel art crisp (canvas `image-rendering: pixelated`); `main.ts` calls `scale.refresh()` on
    resize/orientationchange so the canvas re-fits when the layout flips.
- Native gestures are blocked: `index.html` sets `touch-action: none`, `user-select: none`,
  `overflow: hidden`, a no-zoom viewport meta, and the module `preventDefault`s touchmove /
  gesturestart / dblclick.

## Asset keys

Assets live in `public/assets`. Overworld characters are **real art** (LimeZu, repacked into
`char_*.png`); interior maps use **real LimeZu tiles** (`tileset_interior.png`); battle musician
sprites are **procedurally generated per species** (`battler_*.png`); the outdoor `tiles`, the
`player`/`npc` placeholders (now unused at runtime), and the bitmap font are still generated
placeholders. Loader keys and frame indices are defined once in `src/data/assets.ts` — always
reference assets by these keys, never by raw path.

| Key          | File                   | Type        | Notes                                                   |
| ------------ | ---------------------- | ----------- | ------------------------------------------------------- |
| `char_adam`  | `assets/char_adam.png` | spritesheet | **Overworld player** — LimeZu character, 16×32 frames (see Characters below) |
| `char_alex`  | `assets/char_alex.png` | spritesheet | Overworld NPC character (LimeZu), 16×32 frames          |
| `char_amelia`| `assets/char_amelia.png`| spritesheet| Overworld NPC character (LimeZu), 16×32 frames          |
| `char_bob`   | `assets/char_bob.png`  | spritesheet | Overworld NPC character (LimeZu), 16×32 frames          |
| `battler_<id>`| `assets/battler_<id>.png`| image    | **Battle sprite per musician species** — one 32×32 frame each (`battlerKey(id)`, `BATTLERS`); see Battler sprites below |
| `player`     | `assets/player.png`    | spritesheet | Legacy placeholder (kept as the battler fallback), 16×16 |
| `npc`        | `assets/npc.png`       | image       | Legacy placeholder (kept as the battler fallback), 16×16 |
| `tiles`      | `assets/tileset.png`   | spritesheet | Outdoor tiles: `0` grass, `1` path, `2` wall, `3` water (`TileFrame`) |
| `tiles_interior`| `assets/tileset_interior.png`| spritesheet | **Interior tiles** — real LimeZu floors/walls/decor, 16×16 frames (`InteriorTile`); linked to interior maps via `TILESET_TEXTURES`. See Interior tileset below |
| `font`       | `assets/font.png`      | image       | bitmap-font atlas; loaded in BootScene, see Text below  |

**Overworld characters are real art** (LimeZu Modern Interiors, free): the player and every NPC
render from a `char_*` spritesheet (`CharacterKeys` in `assets.ts`), repacked by
`scripts/repack-characters.py` (`npm run gen:characters`). The tileset (`gen:assets`) and font
(`gen:font`) are still generated placeholders; the `player`/`npc` PNGs are no longer drawn at
runtime (`BattleScene` uses per-species battlers — see below) but are kept as a safety fallback.
Asset URLs are resolved against Vite's `BASE_URL` (`this.load.setBaseURL(import.meta.env.BASE_URL)`)
so loading works both in dev and from the GitHub Pages subpath.

**Interior tiles are real LimeZu art** (`tileset_interior.png`): a curated 8-column atlas of 16×16
tiles sliced from LimeZu "Modern Interiors (free)" by `scripts/gen-tiles-interior.py` (`npm run
gen:tiles-interior`) from the gitignored raw pack under `assets-src/limezu/Interiors_free/` (same
**non-commercial** license + don't-commit-the-raw-pack rule as the characters). The slice order IS
the GID contract (GID = atlas index + 1), mirrored in `InteriorTile` (`assets.ts`) and the `IT`
constants in `gen-map.mjs`: floors (wood/brick/concrete/cream/teal/marble), walls
(wood/blue/tan/peach/mint), and decor (rug/spotlight/plant/shelf/sofa/art/fire). Only the **interior
maps** load it (via `TILESET_TEXTURES`); outdoor maps keep the placeholder `tiles`. Swap in different
art by keeping the same atlas slots (same index → same meaning) and re-running the script.

**Battler sprites are procedural per-species art** (`battler_<speciesId>.png`, one 32×32 image
each): generated by `scripts/gen-battlers.mjs` (`npm run gen:battlers`) straight from the real
`SPECIES_LIST` + `GENRES` data, so the roster can never drift. Each is a humanoid musician figure
whose **palette comes from its genre(s)** (dual-genre blends the two colors), whose **instrument is
derived from its primary genre** (rock→electric guitar, folk→acoustic guitar, jazz→saxophone,
funk→bass, classical→violin, electronic→keytar), and whose **silhouette/hair/build/pose vary by a
hash of the species id** so every species is distinct. The signature species get a glow halo +
sparkle. The key is `battlerKey(speciesId)` and the loader list is `BATTLERS` (both in `assets.ts`,
derived from `SPECIES_LIST`); `BattleScene.battlerTexture(speciesId)` looks one up (falling back to
the `npc` placeholder if missing). Battlers render at **2× (→64px)**, full-color (no genre tint).

**Audio assets** live under `public/assets/audio` and are keyed by `AudioKeys` in
`src/data/assets.ts` (loaded in PreloadScene). They're placeholder chiptune WAVs generated by
`scripts/gen-audio.mjs` (`npm run gen:audio`): three looping music tracks (`music_overworld`,
`music_battle`, `music_venue`) and seven SFX (`sfx_move`, `sfx_confirm`, `sfx_cancel`, `sfx_hit`,
`sfx_faint`, `sfx_levelup`, `sfx_recruit`). To use real audio, drop files with these same keys
into `public/assets/audio/` (any browser-playable format) — the game references sounds only by key.

## Asset-swap guide (real art & audio)

Every asset is a placeholder, but the game is built so real art/audio is a **drop-in
replacement**: keep the same file name (or key), dimensions, and frame layout, and **no code
changes are needed**. This is enforced by the asset-key contract — every loader key + path lives
once in `src/data/assets.ts`, and nothing in `src/` ever hardcodes an asset path:

- Images/spritesheets are loaded from `SPRITESHEETS`, `IMAGES`, and `FONT_IMAGE` (the font is
  loaded first, in `BootScene`, via `FONT_IMAGE.key`/`.path`); audio from `AUDIO`. All four live
  in `assets.ts`.
- Everything else references assets only by the `AssetKeys` / `AudioKeys` constants and the frame
  enums (`PlayerFrame`, `TileFrame`, `InteriorTile`). (Audit: the only literal asset path anywhere
  is in the four arrays in `assets.ts` and the `assets/...` strings inside the `scripts/gen-*`
  generators, which write the placeholders/derived art — not runtime code.)
- Paths are resolved against Vite's `BASE_URL`, so swaps work in dev and on the Pages subpath.

To swap an asset you can either **(a)** overwrite the file in `public/assets/` keeping its exact
name + dimensions (simplest — nothing else to touch), or **(b)** point the path in `assets.ts` at
a new file. Prefer (a). After swapping art, run `npm run smoke` to confirm textures still load.

### Visual assets

| Key        | File                  | Loaded as   | Exact size | Format          | Layout / semantics that MUST be preserved |
| ---------- | --------------------- | ----------- | ---------- | --------------- | ----------------------------------------- |
| `font`     | `assets/font.png`     | image       | **96×48**  | PNG RGBA, white glyphs on transparent | RetroFont atlas: 6×8 px cells, ASCII 32–126 row-major, 16 cells/row (6 rows). Glyphs drawn white so they can be tinted. Metrics are mirrored in `src/ui/font.ts` — change one, change both. |
| `tiles`    | `assets/tileset.png`  | spritesheet | **64×16**  | PNG RGBA        | 4 frames of 16×16 in one strip, **in order**: `0` grass, `1` path, `2` wall, `3` water (`TileFrame`). Maps reference these by GID (firstgid 1 → grass). Add tile *types* by widening the strip + extending `TileFrame` and the GID map in `scripts/gen-map.mjs`, not by reordering. |
| `tiles_interior` | `assets/tileset_interior.png` | spritesheet | **128×48** | PNG RGBA, transparent | **Interior tiles.** 18 tiles of 16×16 in an 8-col grid (rows of 8,8,2), **in `InteriorTile` order**: floors 0–5, walls 6–10, decor 11–17 (GID = index+1). Only interior maps load it. Sliced from the LimeZu pack by `scripts/gen-tiles-interior.py`; the order is the contract (mirrored in `InteriorTile` + the `IT` constants in `gen-map.mjs`). Swap by keeping the same slots + re-running the script. |
| `char_*`   | `assets/char_<name>.png` | spritesheet | **112×128** | PNG RGBA, transparent | Overworld character. **16×32 frames** (1 tile wide, 2 tall — stands on its bottom 16×16 tile, head overhangs the tile above), laid out **7 cols × 4 rows**: row = direction (down, up, left, right); column 0 = idle frame, columns 1–6 = the 6-frame walk cycle. Phaser frame = `row*7 + col`. Layout mirrored in `src/ui/characterAnims.ts` + `scripts/repack-characters.py`. |
| `battler_<id>` | `assets/battler_<id>.png` | image | **32×32** | PNG RGBA, transparent | **Battle sprite, one per species.** Single 32×32 frame; the musician figure stands on the bottom edge (drawn at origin 0.5,1 so its feet sit on the platform). Full-color (drawn at 2× = 64px, **not** tinted). Procedural — `scripts/gen-battlers.mjs`. To swap in real art, keep this exact size + the `battler_<speciesId>` name. |
| `player`   | `assets/player.png`   | spritesheet | **64×16**  | PNG RGBA        | Legacy placeholder; no longer drawn at runtime (battler fallback only). 4 frames of 16×16: `0` down, `1` up, `2` left, `3` right (`PlayerFrame`). |
| `npc`      | `assets/npc.png`      | image       | **16×16**  | PNG RGBA        | Legacy placeholder; the `BattleScene` battler fallback when a `battler_<id>` texture is missing. |

Notes on visual swaps:

- **Overworld characters (`char_*`) are real LimeZu art**, repacked from the pack's per-character
  `*_idle_16x16.png` (4 standing frames) + `*_run_16x16.png` (4 dirs × 6 walk frames) by
  `scripts/repack-characters.py` (`npm run gen:characters`). The raw pack lives under
  `assets-src/limezu/` (**gitignored — never committed**, see license below); only the repacked
  `public/assets/char_*.png` are committed. To swap in different LimeZu characters, drop them in the
  source folder and re-run the repack; to use a *different* pack, adjust the script's source layout
  (frame size / direction order / walk length) — the in-game 7×4 / 16×32 output format is the
  contract (`characterAnims.ts`), so nothing else changes.
- **Player/NPC mapping** — the player is `char_adam`; NPCs/trainers get a character via
  `characterForNPC(name)` in `src/data/characters.ts` (fixed picks for the recurring cast — the
  mentor Vy = `char_amelia`, rival Max = `char_bob`, shopkeeper = `char_alex`, roadie = `char_bob`;
  everyone else a stable hash over the four). With only four free characters, crowd NPCs **reuse**
  the four sprites — add more by registering new `char_*` keys + assigning them. The old per-NPC
  `tint` trick is gone.
- **Interior tiles (`tiles_interior`) are real LimeZu art**, sliced from the pack's
  `Interiors_free/16x16/` sheets (Room Builder = floors + wall panels, Interiors = furniture) by
  `scripts/gen-tiles-interior.py` (`npm run gen:tiles-interior`). The raw pack lives under
  `assets-src/limezu/Interiors_free/` (**gitignored — never committed**); only the derived
  `public/assets/tileset_interior.png` is committed. The 8-col / `InteriorTile`-ordered output is the
  contract — to retheme, change which source cells the script's `TILES` list points at (keeping slot
  meanings) and re-run; the maps + `IT` GID constants need no change.
- **Tiles/font frame size is 16×16** (`FRAME_CONFIG` = `TILE_SIZE`); **characters are 16×32**
  (`CHARACTER_FRAME`). Keep `pixelArt`/nearest-neighbour art (no anti-aliasing) so it stays crisp.
- **Musicians (battle) have per-species procedural sprites.** `BattleScene` renders each battler
  from its `battler_<speciesId>` texture (via `battlerTexture(speciesId)`), full-color and untinted.
  The art is generated by `scripts/gen-battlers.mjs` (`npm run gen:battlers`) from the genre palette
  + a derived instrument + a hash of the species id (see "Battler sprites" under Asset keys). To
  hand-author or swap in real art for any species, drop a 32×32 `battler_<speciesId>.png` into
  `public/assets` — it's keyed, so nothing else changes. (`player.png`/`npc.png` remain only as the
  fallback when a battler texture is missing.)
- **UI chrome** (dialogue/menu boxes, HP bars, the "more" arrow, loading bar) is drawn with Phaser
  Graphics/Shapes, not textures — there are no UI image assets to swap.

### Sourcing real third-party art

Overworld characters **and the interior tiles** now use **LimeZu — Modern Interiors (free version)**
(<https://limezu.itch.io/moderninteriors>). **License: non-commercial only** — the free pack may be
used *and edited* in non-commercial projects but **not** in commercial ones, and the raw sprites may
not be redistributed/resold. So the raw pack is gitignored and only the repacked/derived PNGs the
game loads are committed; **keep this project non-commercial** while it ships LimeZu art (credited on
the WinScene + in `CREDITS.md`). For other art, the outdoor `tiles`/font placeholders still need
bespoke layouts: recomposite a CC0 pack (**Kenney.nl**, **OpenGameArt** CC0/CC-BY, **itch.io** free
packs — check each license) to the exact strips/order above. The project font is **original CC0 art**
authored here (see header of `scripts/gen-font.mjs`).

### Audio assets

All audio is **mono, 11025 Hz, 16-bit PCM WAV** placeholder chiptune (`scripts/gen-audio.mjs`),
under `public/assets/audio/<key>.<ext>`. Real audio is a **drop-in**: the loader accepts any
browser-playable format (WAV/MP3/OGG), files can be any sample rate / stereo / length, and the
`AUDIO` array derives paths from `AudioKeys` — so dropping in `music_overworld.wav` (or changing
the `.wav` extension in that one array) is all it takes. The per-area slots are wired and ready:

| Key (`AudioKeys`)  | Kind        | Played by / area | Loop? |
| ------------------ | ----------- | ---------------- | ----- |
| `music_overworld`  | music       | `TitleScene` + the overworld (town, streets, parks, hubs, districts) | yes |
| `music_battle`     | music       | `BattleScene` (all battles) | yes |
| `music_venue`      | music       | venue maps: `jazz_club`, `vip_lounge`, `warehouse`, `backstage` | yes |
| `sfx_move`         | SFX one-shot| each overworld step | — |
| `sfx_confirm`      | SFX one-shot| menu confirm/select (all menus) | — |
| `sfx_cancel`       | SFX one-shot| menu back/cancel | — |
| `sfx_hit`          | SFX one-shot| a technique landing in battle | — |
| `sfx_faint`        | SFX one-shot| a musician fainting | — |
| `sfx_levelup`      | SFX one-shot| a level-up | — |
| `sfx_recruit`      | SFX one-shot| a successful audition | — |

Drop your own composed tracks in as `music_overworld` / `music_battle` / `music_venue` (looping
files — keep loop points seamless) and they play in their areas immediately. The single mute/volume
setting governs everything; music is mixed under SFX (see Audio). To add a *new* area track or SFX,
add a key to `AudioKeys` and call `audio.playMusic(key)` / `audio.sfx(key)` where it should fire.

## Audio

A small audio layer; the game references sounds only by key (`AudioKeys`), never by path.

- **`src/systems/audioSettings.ts`** — pure mute/volume state (volume steps 25/50/75/100%),
  `serialize`/`parse`, and the step/label/effective-volume helpers. Persisted to its **own**
  localStorage key (`band-leader-rpg/audio`), separate from the save game, since it's an app
  preference. Pure + unit-tested (`tests/audio.test.ts`); only the thin load/save wrappers touch
  localStorage (mirrors `save.ts`).
- **`src/systems/audio.ts`** — the `audio` singleton, a thin wrapper over Phaser's **game-scoped**
  sound manager (so music persists across scene transitions). `playMusic(key)` (looping;
  no-op if already current), `stopMusic()`, and `sfx(key)` (one-shot). One mute/volume setting
  governs everything; music is mixed under SFX. Initialised once in `main.ts`.
- **Music per area** — `TitleScene` and the overworld play `music_overworld`; venue maps
  (`jazz_club`/`vip_lounge`/`warehouse`/`backstage`) play `music_venue`; `BattleScene` plays
  `music_battle`. The overworld re-asserts its area track on every scene `resume` (so returning
  from a battle/menu restores it; a no-op if unchanged).
- **SFX** — menu moves + confirm/cancel across the menus (Title/Pause/Battle/Party/Bag/Shop/
  Career), plus technique hits, faint, level-up, and recruit-success in battle.
- **Mute/volume** — the **Audio** row in the pause menu: Confirm toggles mute, Left/Right step the
  volume; both persist immediately. A global **`M`** hotkey (registered in `main.ts`, so it works in
  *every* scene including the title — before any game is started) toggles mute too; it's skipped
  while `NameEntryScene` is active (that screen types letters into the player's name). The title
  screen shows the `M: mute`/`M: unmute` hint reflecting the current state. (WebAudio only starts
  after the first input gesture, per browser autoplay policy, so the title may be briefly silent
  until a key is pressed.)
- **Polish** — camera **fades** on warps (fade out → restart → fade in) and battle start/end; a
  brief **battle intro** (the battlers slide in); and on each hit a **white flash + shake +
  floating damage number** with the hit SFX. Faints drop + fade the sprite.

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

## Build-timestamp label (dev only)

A tiny `patched HH:MM YYYY-MM-DD` label sits in the bottom-left corner (above everything, on
desktop and mobile) so you can confirm on a device whether you're looking at the latest deploy.
The timestamp is frozen **at build time** (or dev-server start) via the Vite `define` for
`__BUILD_TIME__` in `vite.config.ts`, and rendered by the self-contained module
**`src/ui/buildStamp.ts`** (a plain DOM overlay; `pointer-events: none`).

**To remove it:** delete `src/ui/buildStamp.ts` and the one `import "./ui/buildStamp";` line in
`src/main.ts`. (The `__BUILD_TIME__` define in `vite.config.ts` is then unused — harmless if left,
or drop it too.)

## Commands

- `npm run dev` — start the Vite dev server with hot reload.
- `npm run build` — type-check (`tsc`) and produce a static build in `dist/`.
- `npm run preview` — serve the built `dist/` locally to verify the production build.
- `npm test` — run the Vitest suite (`tests/`).
- `npm run check:data` — run the data-model sanity checks + print a stats/effectiveness readout.
- `npm run gen:assets` — regenerate the placeholder PNGs in `public/assets`.
- `npm run gen:map` — regenerate the Tiled maps in `src/data/maps` (`town`, `street`, `studio`,
  `jazz_club`, `vip_lounge`, `park`, `warehouse`, `backstage`, and the genre districts
  `<genre>_route`/`<genre>_hub` for rock/folk/funk/classical via the `DISTRICTS` config).
- `npm run gen:font` — regenerate the bitmap-font atlas `public/assets/font.png`.
- `npm run gen:audio` — regenerate the placeholder music + SFX WAVs in `public/assets/audio`.
- `npm run gen:battlers` — regenerate the per-species battle sprites `public/assets/battler_*.png`
  (procedural, from `SPECIES_LIST` + `GENRES`; see Asset keys → Battler sprites).
- `npm run gen:characters` — repack the LimeZu overworld character sheets (`assets-src/limezu/`,
  gitignored) into `public/assets/char_*.png` (Python + Pillow; see `scripts/repack-characters.py`).
- `npm run gen:tiles-interior` — slice the LimeZu interior tiles (`assets-src/limezu/Interiors_free/`,
  gitignored) into `public/assets/tileset_interior.png` (Python + Pillow; see
  `scripts/gen-tiles-interior.py`). Used by the interior maps.
- `npm run smoke` — headless Playwright check (boot, walk, collision, camera, NPC dialogue).
  Needs a server running first; defaults to the dev server (`npm run dev`), override `SMOKE_URL`.

## Deploying to GitHub Pages

GitHub Pages serves project sites from a subpath (`https://<user>.github.io/<reponame>/`), so the
production build needs a matching base path. `vite.config.ts` sets `base` to `/band-leader-rpg/`
for builds, overridable via the `VITE_BASE` env var; dev/preview use `/`.

Deployment is **automated** by `.github/workflows/deploy.yml`: every push to `main` runs
`npm ci && npm run build` (with `VITE_BASE=/<repo-name>/`, so the base auto-matches the repo
name) and publishes `dist/` via the official Pages actions (`configure-pages` →
`upload-pages-artifact` → `deploy-pages`).

**One-time GitHub setup:** create a repo named `band-leader-rpg`, push `main`, then in
**Settings → Pages → Build and deployment**, set **Source = GitHub Actions**. After the workflow
goes green the game is live at `https://<your-username>.github.io/band-leader-rpg/`.

**Verifying the build locally** (production often breaks on asset paths even when dev works): the
game loads assets via `this.load.setBaseURL(import.meta.env.BASE_URL)`, so a wrong base shows up
as 404s / missing textures. After `npm run build`, serve `dist/` *under the subpath* (not just
`vite preview`, which can flake on the module-script request) and confirm textures load with no
404s. See README for the run/deploy quick reference.
