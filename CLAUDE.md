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
                                                   ◀──overlay──▶  BattleScene
                                                   ◀──overlay──▶  PartyScene
                                                   ◀──overlay──▶  BagScene / ShopScene
                                                   ◀──overlay──▶  CareerScene
                                                   ◀──overlay──▶  PauseScene (Esc; save/menu)
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
  - **`heal`** — a rehearsal-studio heal point. Blocks movement (face it to use); interacting
    restores the whole party's stamina. Drawn with a "+" marker.

Maps: `town`, `street` (busking encounters), `studio` (heal point). The studio is also where
the player lands after losing a battle.

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
  (0..1 per step), minLevel, maxLevel, musicians: string[] (species ids) }`. When a step finishes
  on an encounter tile, `rollEncounter(zone)` (`src/systems/encounters.ts`, pure + unit-tested)
  rolls; on a hit the overworld starts a real battle (see Recruiting & encounters). Add zones to
  the data table; reference them from an `encounter` map object's `zone` prop.

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
  bottom-right), an HP bar each, a command menu (Perform / Recruit / Bag / Run) and a technique
  submenu. It collects the player's action, calls `resolveTurn` (opponent action from the AI),
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
- **Party menu** (`PartyScene`, overlay, key **`P`**) — lists members with level + stamina,
  shows the highlighted member's stats + techniques live, and reorders via Confirm (grab) →
  Confirm (drop/swap); Esc exits. Reads/mutates the registry party.
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
  / balladeer, Lv 5–8.)

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
  `shop` (item ids). A shop NPC opens **`ShopScene`** (overlay) to buy items with currency.
  Town has a **roadie** (gift, just left of spawn) and a **shopkeeper** (shop, a few tiles right).

## Venues, trainers & residencies

The "gym/badge" progression, reskinned as winning over music venues.

- **Trainers** (`src/data/trainers.ts`) — rival band leaders + venue headliners. A `Trainer` has a
  fixed `team` (species + level), `reward` (currency), intro/defeat/post lines, a `sightRange`
  (line-of-sight tiles; 0 = interaction only), and an optional `residency` (venue bosses grant it).
  Placed via map objects of type **`trainer`** (prop `trainer` = id). Authored: `rival_max` (town)
  and `jazz_headliner` (the venue).
- **Triggering** — `OverworldScene` records placed trainers (NPC sprite + data). On the player
  finishing a step, `trainerSeeing` checks each undefeated trainer's line of sight; on interaction,
  facing a trainer starts it. Either way the intro dialogue plays, then the battle. Beaten trainers
  are recorded in the registry (`"trainersDefeated"`) and don't retrigger (they show their post-line).
- **Trainer battles** (`BattleScene`) — `BattleData` carries `opponents: MusicianInstance[]` (one for
  wild, several for a trainer) and an optional `trainer` descriptor. Each fainted opponent awards XP;
  the trainer sends out the next until the team is cleared. Recruit/Run are disabled vs trainers. On
  victory the reward is paid, the trainer is marked defeated, and any `residency` is granted.
- **Residencies** (`src/data/residencies.ts`) — the badge equivalent, tracked in the registry
  (`"residencies"`). `jazz` ("The Blue Note") is granted by `jazz_headliner`.
- **Unlock (gated)** — a map object of type **`gate`** (props `requires`, `target`, `entry`) is a
  bouncer that blocks movement; interacting warps you through only if you hold the required
  residency, otherwise it turns you away. The jazz residency unlocks the VIP lounge behind the venue.
- **Career menu** (`CareerScene`, overlay, key **`C`**) — shows residencies earned and rivals beaten.
- **Logic** (`src/systems/career.ts`, pure + tested) — `isTrainerDefeated`/`markTrainerDefeated`,
  `hasResidency`/`addResidency`, `buildTrainerTeam`, and `lineOfSight`.
- **Maps** — `jazz_club` (venue: boss + VIP gate) and `vip_lounge` (the unlocked reward area),
  reached from town via warps.

## Balance & difficulty

All difficulty tuning lives in one place: **`src/data/balance.ts`** (`BALANCE`). To make the
whole game easier/harder, edit these knobs — don't scatter constants through formulas:

- `staminaMultiplier` — global HP-pool scale (bigger = longer, less swingy fights). Applied in
  `computeStats`.
- `playerDamageMultiplier` / `enemyDamageMultiplier` — scale damage the player's party deals /
  takes. Applied per-side in the battle engine via `computeDamage`'s `outputMultiplier`.
- `xpRewardMultiplier` — battle XP scale (bigger = level faster). Applied in `xpReward`.

`tests/balance.test.ts` is a regression guard: it simulates the rival and first-venue fights
(greedy AI both sides, many RNG seeds) and asserts the early game is **beatable but not trivial**
— the starter beats the rival, a normally-played party (leveled + a busking recruit) beats the
first venue, and the bare starter does not. Re-run after any balance/level/data change.

Early-game targets (current values): starter Rifflet L5 + Crooner L8; rival Lv5–6; first venue
boss Lv8–9. The jazz venue is hard-countered by recruiting a **Balladeer** (folk → 2× vs jazz)
from the busking zone — the intended "build a team" answer rather than grinding.

## Saving & loading

State persists to **localStorage** across browser refreshes.

- **`src/systems/save.ts`** — `SaveData` captures everything: current `map` + player `x`/`y`,
  `party`, `roster`, `bag`, `currency`, `flags`, `trainersDefeated`, `residencies`, plus a
  `version` for future migrations. The serialize/`deserialize`/`snapshot`/`applyToStore` logic is
  pure (no DOM) and unit-tested (`tests/save.test.ts`); `saveGame`/`loadSave`/`hasSave`/`clearSave`
  are thin localStorage wrappers. `deserialize` guards against missing/corrupt/wrong-version data
  (returns null). The store is the Phaser **registry** (which already holds the live state); the
  overworld writes its current `loc` (`{ map, x, y }`) to the registry on each step.
- **Pause menu** (`PauseScene`, overworld key **Esc**) — its first option is **Save Game**
  (writes localStorage). It also opens Party/Bag/Career and Resume.
- **Boot flow** — `PreloadScene` auto-loads on start: if a save exists it applies it to the
  registry and starts the overworld at the saved map/tile; otherwise it starts a **new game**
  (`{ newGame: true }`), where the overworld auto-plays the mentor **intro** (the `intro`
  dialogue — gives the starter band + explains the goal). The intro never replays on a loaded game.

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
- **Orientation**: the game prefers landscape; in portrait a "rotate your device" hint covers the
  screen and the controls hide. Phaser's `Scale.FIT` + `CENTER_BOTH` fills the viewport in either
  orientation while keeping pixel art crisp (canvas `image-rendering: pixelated`).
- Native gestures are blocked: `index.html` sets `touch-action: none`, `user-select: none`,
  `overflow: hidden`, a no-zoom viewport meta, and the module `preventDefault`s touchmove /
  gesturestart / dblclick.

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
- `npm run gen:map` — regenerate the sample Tiled maps (`town`, `street`, `studio`, `jazz_club`,
  `vip_lounge`) in `src/data/maps`.
- `npm run gen:font` — regenerate the bitmap-font atlas `public/assets/font.png`.
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
