# Band Leader RPG — Expansion Roadmap (toward Fire Red scale)

The engine is done. This roadmap is about turning a working demo into a *full game*: a world worth exploring, a story with an arc, and characters you care about. Everything below is built on the systems you already have (data-driven musicians/genres/maps/venues, save + flags, dialogue, battle).

A note on scale, honestly: Fire Red is enormous (a huge interconnected world, 8 gyms + Elite Four, ~150 creatures, a full antagonist plot). Matching it 1:1 solo is a very long road. The realistic target here is a game that *feels* that complete: ~6–8 venues across distinct districts, a 20–30 map world, ~40–60 musicians, a rival who grows across the game, an antagonist, a mentor with a past, a finale, and post-game. The systems are built to scale further whenever you want.

---

## The three pillars you asked for

1. **A story with a clean arc** — setup → rising stakes → climax → resolution. The player should always know their next goal and feel the stakes rising toward a real ending, not just "win another venue."
2. **Curiosity throughout** — a world that feels bigger than what you've seen: foreshadowing, locked doors you can't open yet, a central mystery that unspools, NPCs who hint at things off-screen.
3. **Character building** — the protagonist gets a motivation and growth; the rival, mentor, and antagonist each have their own arc; recurring NPCs have personality and memory of you.

---

## A proposed story spine (yours to reshape)

You're the musician here, so treat this as a draft to react to, not a script. But a spine helps the prompts have something concrete to build toward:

**Premise.** The city's live-music scene is dying. A faceless label — call it **Monocorp** — is buying up venues and flattening every genre into the same algorithm-friendly sameness. You arrive as an unknown band leader and set out to revive the scene one district at a time, recruiting musicians and winning over each genre's venue, until you can challenge Monocorp itself.

**The hook (curiosity engine).** Your mentor (the producer, Vy) once played in a legendary band whose leader **vanished** at the height of the scene — right when Monocorp arrived. Nobody knows what happened. Threads of that mystery surface in each district, and resolving it is tied to the finale.

**Why it works mechanically.** "Genre diversity vs. homogenization" *is* your effectiveness chart. The whole theme — that different genres counter each other and a healthy scene needs all of them — is already encoded in your game. The story just gives it meaning.

**The arc.**
- *Act 1* — busking nobody → first residencies; meet the rival and the mentor; first hints of Monocorp and the vanished legend.
- *Act 2* — the scene fights back; districts fall and are reclaimed; the rival's philosophy diverges from yours (sell out vs. stay true); the mystery deepens.
- *Act 3* — Monocorp's headliner gauntlet (the Elite Four equivalent), the truth about the vanished leader, and a final stage.
- *Post-game* — the scene reborn: new venues, rare musicians, optional challenges.

**The cast.**
- **You** — give the player a name, a reason they came to the city, and visible growth.
- **The rival** — another rising leader, recurring ~5 times, with a real arc (tempted by Monocorp's money).
- **Vy (mentor)** — the producer, carrying guilt about the vanished leader.
- **The antagonist** — a Monocorp exec, plus mid-tier "A&R reps" as recurring trainers.
- **District headliners** — each venue boss is a memorable character embodying their genre.

---

## The build plan

Eight phases. Do them in order, one prompt at a time, the same rhythm as before: paste, verify, then it commits **and pushes** so the deploy is automatic. Big phases (world, roster) will likely split into several prompts — that's expected.

### Phase 1 — Story engine (the enabling tech)

Everything narrative needs a way to track progress and script events. You already have a `flags` map in the save; this turns it into a real story system.

```
Build a story/quest system on top of the existing flags state. No story content yet — just the engine.

- A central story-progress system in src/systems: named story flags/variables (persisted in the existing save flags), plus a "current chapter/objective" the game can read and display.
- A scripted-event ("cutscene") system: a data-driven way to play a sequence of steps — show dialogue, move/turn an NPC or the player, wait, set a flag, give an item, start a battle — triggered on entering a tile/map or interacting, and gated by story flags. It should pause player input during a cutscene and resume after.
- Flag-gated content: NPCs, warps, and map objects that appear/disappear/change behaviour based on story flags (e.g. a door locked until a flag is set; an NPC whose dialogue changes after an event).
- A simple quest-log / objective overlay (a key in the pause menu) showing the current objective and completed milestones.
- Keep it data-driven (events live in src/data), pure logic unit-tested where reasonable, and document the system in CLAUDE.md.

Verify with a throwaway test event, keep tests green, then commit and push to main.
```

### Phase 2 — Narrative spine + main character

Now lay in the actual story opening using the engine.

```
Implement the opening of the story using the story/cutscene system. (Premise: the live-music scene is dying under a homogenizing label, "Monocorp"; the player is an unknown band leader setting out to revive it; mentor Vy once played with a legendary band leader who mysteriously vanished.)

- New-game intro cutscene: name the player, establish their motivation for coming to the city, and have Vy hand the starter band and the first objective. Plant the first hint of Monocorp and the vanished legend.
- A persistent "current objective" shown to the player, advancing as story flags are set.
- Rework the existing town so reaching the first venue is a guided early arc with 2-3 story beats (meet the rival, a Monocorp sighting, the mentor's warning), each a flag-gated cutscene.
- Give the protagonist a name-entry step and surface the name in dialogue.

Keep it data-driven and tested, then commit and push to main.
```

### Phase 3 — World expansion

Build the world out to scale: distinct districts, each a genre "scene," connected by routes.

```
Expand the overworld toward a full game world (no new engines — use the existing map/warp/encounter systems).

- Design and build a connected world of distinct districts, each themed around a genre scene (e.g. a jazz quarter, a rock dive-bar strip, a classical concert hall district, a funk/soul block, an electronic warehouse zone, a folk riverside). Connect them with route maps that have their own encounter zones.
- Each district gets: a town hub with NPCs and a shop, a route/encounter area with a genre-appropriate musician pool, and a venue (built later in Phase 5).
- Gate later districts behind story flags / earned residencies so the world opens up as the player progresses (curiosity: visible-but-locked paths).
- Keep the map registry, warps, and encounter data clean and documented.

Build it in pieces if needed; after each working piece, commit and push to main.
```

### Phase 4 — The cast & character arcs

Make the world feel populated and the key characters grow.

```
Build out the recurring cast and their arcs using the story/cutscene system.

- The rival: a recurring band leader who appears ~5 times across the game with escalating teams and dialogue that develops a real arc (tempted by Monocorp). Each encounter is a flag-gated story beat; track the relationship state.
- The mentor (Vy): recurring scenes that gradually reveal the vanished-legend backstory and Vy's guilt.
- The antagonist: introduce Monocorp through a memorable exec plus recurring lower-tier "A&R rep" trainers who appear in districts.
- Flavour NPCs per district with personality and dialogue that changes as the story (and the scene's health) progresses, so the world reacts to the player.

Keep dialogue data-driven, tested, then commit and push to main.
```

### Phase 5 — The venue gauntlet + endgame

Scale the venue progression into a real gym-to-finale structure.

```
Expand the venue progression into a full gauntlet with an endgame.

- Build one venue per district (6-8 total), each a themed boss embodying its genre, with escalating difficulty and a story beat before/after.
- Each cleared venue grants a residency that gates story/world progress.
- Build the finale: a Monocorp "headliner gauntlet" (an Elite-Four-style run of several tough back-to-back boss battles) culminating in the antagonist, which also resolves the vanished-legend mystery.
- A "you win" state / credits / Hall-of-Fame equivalent, with a save flag marking the main story complete.
- Keep the balance simulation honest across the new difficulty curve (extend the beatability tests).

Build venue-by-venue; after each, commit and push to main.
```

### Phase 6 — Roster expansion

Grow the collectible roster so the world feels full.

```
Expand the musician roster toward ~40-60 species using the existing data systems.

- Add many new species across all genres, with stats/learnsets/recruit-difficulty consistent with existing balance, distributed across the new districts' encounter pools.
- Add rarity tiers (common vs rare encounters) and a few "signature" musicians tied to story moments or specific locations.
- Add new techniques where genres need more depth, keeping each genre's feel.
- Keep the data sanity checks and balance tests green.

Add in batches; after each batch, commit and push to main.
```

### Phase 7 — Curiosity & side content

Reward exploration and deepen the world.

```
Add side content and curiosity hooks (use existing systems).

- Optional areas gated behind residencies or items (visible-but-locked earlier, for curiosity).
- Hidden/rare musicians in out-of-the-way spots.
- A handful of self-contained sidequests (an NPC with a small story, a reward on completion) driven by the story/cutscene system.
- Collectible lore (notes/records about the vanished legend and the old scene) that reward exploration and feed the central mystery.

Keep it data-driven and tested, then commit and push to main.
```

### Phase 8 — Art & audio scale-up

Replace placeholders so it looks and sounds like a real game.

```
Plan and begin replacing placeholder art and audio.

- Audit every placeholder asset (tiles, character sprites, musician sprites, UI) and produce a clear asset list with required dimensions and the keys to swap in, so I can drop in real art (free packs, generated, or commissioned) without code changes.
- Wire in any free/openly-licensed tilesets and character sprites you can source, keeping the existing asset-key contract.
- Confirm the audio swap points are ready for me to drop in my own composed tracks per area.

Document the asset list in CLAUDE.md, then commit and push to main.
```

---

## How to work through this

- **One prompt at a time**, verify on desktop (and the phone for anything visual), and let each one commit + push so the deploy stays current. The build-timestamp stamp will tell you the phone has the latest.
- **Split big phases.** "Build the world" or "add 50 musicians" won't land in one clean pass — break them into a district at a time, a batch at a time.
- **Clear Claude Code's context between phases** (`/clear`) so it stays sharp; CLAUDE.md keeps it oriented.
- **Expect more iteration than before.** Story pacing and character writing need your eye far more than a bug fix does.

## Where your input matters most

The systems I can scaffold. The *soul* is yours:

- The **story** — the premise above is a starting point. The actual plot beats, the tone, what Monocorp really is, what happened to the vanished legend — make those yours before Phase 2.
- The **characters** — the rival's voice, the mentor's regret, the headliners' personalities. This is writing, and it's the difference between a game with a point of view and a generic one.
- The **music** — eventually, your own tracks.

Lock the story spine first (even a page of notes), then the prompts have something real to build toward.
