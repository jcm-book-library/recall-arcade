# The side-on platformer: decisions to make (8 Nov 2026)

## Decided (owner, 8 Nov 2026)
- **Where:** an arcade stop between the Sport stadium and the Entertainment theatre on the island.
- **Three levels, built one at a time** (level 1 first, then the next), going from sport to the movies:
  1. **The stadium:** an athletics meet in full swing. Dodge shot puts, javelins and hammer throws,
     and at the end a stampede of runners coming past.
  2. **The road:** out on the open road, with animals as the enemies. Jump over them, or land on top to stun them.
  3. **The movie studio:** explosions going off on sets, falling ladders, climbing on the sets, and rolling
     bins to jump (a nod to Donkey Kong).
- **The hero:** the same character as on the island, but with better graphics and possibly taller.
  The feel to aim for is the early-90s Aladdin and The Lion King games: smooth movement and flowing
  animation, a step up from early Mario. We get there gradually, not all at once.
- **Abilities grow with the levels.** Level 1: run and jump. More moves (stomp in level 2, climbing in
  level 3...) arrive as each level needs them.
- **Danger:** cartoon only, no gore. Lives as suggested: Easy unlimited, Intermediate 5, Hard 3 with fewer checkpoints.
- **Quiz link:** none to start. It's a break from the quizzes. Ideas can be tried once it's built.
- **Controls:** keys (arrows or WASD, Space or Up to jump), and on-screen left, right and jump buttons on phones.
  The camera scrolls both ways, with a little up and down.
- **Art and levels:** 16 px tiles drawn in code first, your art later. Levels are written as letters, with a checker script.
- **Extras** (sound, best times, secrets): later.
- **Side-on hero sheet:** 32 × 32 frames, facing right. Run and jump first, more poses as levels need them.
  The Hero Workshop gets a side-on template first.

The questions below are kept for the record.

The next arcade game, "The Brawl" in `docs/action-game-ideas.md`: a side-on platformer, Mario-style.
This page lists what needs deciding before building. Each question has a **suggested answer**
to react to. Change anything. Write your answers under each one (or tell Claude) and we build from that.

## 1. The world
- **Setting and name.** The notes say "a street scene". Suggestion: a city at night, rooftops
  to street level, keeping the dry humour. Name: "The Brawl" for now, or something better.
- **Which subject does it belong to?** Every arcade stop sits by a building on the island.
  Suggestion: put it next to Sport (running, jumping) or Entertainment (a film-set level). Or
  shrug: "We looked for a connection. We couldn't find one."
- **One long level or several short ones?** Suggestion: 3 short levels (about 2 minutes each)
  that get harder, like the Labyrinth's worlds, then a boss later as its own game.

## 2. The hero
- **Same character as the island?** Suggestion: yes, the same person, drawn side-on and bigger.
- **What can they do?** Suggestion: run, jump (hold for higher), and stomp enemies. Maybe later:
  double jump, crouch, wall jump. Fewer moves keeps it fair on a phone.
- **How does it feel?** Floaty and forgiving (Mario) or tight and exact (Celeste)? Suggestion:
  forgiving, with a moment after running off a ledge where you can still jump.

## 3. Danger and lives
- **Enemies.** Suggestion: 3 kinds to start (one that walks back and forth, one that hops, one
  that throws something). Cartoon only: they go "poof".
- **Hazards.** Gaps, spikes, moving platforms, falling things. Pick the ones you like.
- **Lives and checkpoints by track.** Suggestion: Easy has unlimited lives and lots of
  checkpoints; Intermediate has 5 lives; Hard has 3 lives and fewer checkpoints.

## 4. The quiz link
How do the quizzes come into it? Options:
- **A. Answer doors:** a few doors show answers, and you go through the right one (like Flyover's gates).
- **B. Collect letters** that spell an answer, for a bonus.
- **C. None:** a pure break from the quizzes.
Suggestion: A, with questions from the subject it sits beside, and it's skippable like the other stops.

## 5. Controls and screens
- **Keys:** arrows or WASD to move, Space or Up to jump. **Phone:** on-screen left, right and jump buttons.
- **Camera:** scrolls left to right only, or back and forth? Suggestion: both ways, with a little
  up and down for tall bits.

## 6. Art and level design
- **Tiles:** 16 px squares, drawn in code first (like the island). Your own art can replace them later.
- **Hero sheet:** see "The pixel character" below.
- **Levels as letters:** the levels written as rows of letters you can edit (like the island map),
  with a checker script that makes sure every jump is possible. Suggestion: yes.
- **Background:** 2–3 layers moving at different speeds (parallax), like Flyover.

## 7. Extras (later or never)
Sound effects, a timer and best times, hidden secrets, a stamp in the stamp book for finishing.

## The pixel character (the job before the platformer)
The island and Labyrinth hero is a **top-down** sheet: 32 × 64 pixels, 4 directions × 2 walking
frames, each 16 × 16 (see `docs/arcade-art.md` and the Hero Workshop, `#hero`).
The platformer needs the same person **side-on**, bigger and with more poses. Suggested sheet:
- **Frame size 32 × 32**, facing right only (the game flips it for left).
- **Poses:** stand (1–2 frames), run (4 frames), jump up (1), fall (1), land (1), hurt (1).
  That's 9–10 frames, in one row or a 4 × 3 grid.
- Claude can add a labelled side-on template and a code-drawn placeholder to the Hero Workshop,
  so you can recolour and redraw instead of starting from a blank canvas, plus a live preview
  of your character running and jumping.

Decisions for the character:
1. Is the same 32 × 32 side-on hero fine, or do you want a different size?
2. Which poses do you want to draw first (run and jump are the minimum)?
3. Do you want the Workshop template before you start drawing? (Suggested: yes.)

## Built: level 1, the stadium (9 Nov 2026)
Working title "The Brawl", at `#brawl`. The name lives in one place, `GAME_NAME` in `src/arcade/brawl/names.ts`.
Level 1 is playable end to end (about 2 minutes for a first go). Levels 2 and 3 are not built; they drop in as
new files next to `level1.ts` and one line in `levels.ts`.

### The files (all in `src/arcade/brawl/`)
| File | What it does |
|---|---|
| `tuning.ts` | **Every number that decides how the hero feels**, with the physics ideas explained at the top (velocity, friction, gravity, variable jump, coyote time, jump buffer). Also the camera numbers, lives and hearts by track, and the screen size (384 × 216). |
| `physics.ts` | The hero's body: running, jumping, falling, axis-separated AABB collision with 16 px tiles, one-way platforms, sand, the bounce mat, bonks. `jumpStats()` measures the real jump for the checker. |
| `world.ts` | The level as a grid, and the `LevelData` shape every level fills in. |
| `level1.ts` | **The level, as rows of letters** (legend at the top), the signs, the hazards with their timing, the stampede, the medal times. |
| `hazards.ts` | The shot put, javelin, hammer and the stampede, all worked out from the game clock (no stored state). |
| `levels.ts` | The list of levels. |
| `game.ts` | The conductor: page, state, one update tick (60 per second), drawing, start / pause / results cards, lives and checkpoints, the dev hook `__brawl` (development copy only). |
| `input.ts` | Keys and the on-screen buttons (multi-touch). |
| `art-scenery.ts`, `art-chars.ts` | All the pictures, drawn in code: tiles, sky, city, stands and crowd, scenery for each part, athletes, officials, thrown things. |
| `names.ts` | The game's name, route and blurb. |
Also: `src/arcade/stamps.ts` (the stamp book, shared with the island), `scripts/check-brawl.mjs`, and a `step` option on the loop in `kit.ts`.

### Controls
Arrows or A and D run. Space, Up or W jump: hold for a high jump, tap for a hop. Down drops through a one-way ledge.
P or Esc pauses (and the game pauses by itself when the tab is hidden). On touch screens there are big Left, Right
and Jump buttons, and you can run and jump at once.

### The feel (edit `tuning.ts`)
Top speed 118 px/s, reached in about 0.2 s. A full jump is about 61 px (nearly 4 tiles) and about 88 px long at top
speed. A tap hops about 25 px. Gravity is stronger on the way down, with a little float at the top. A jump still works for
0.1 s after leaving a ledge, and a jump pressed 0.1 s early is remembered. The hitbox is 10 × 22 inside a 32 × 32
picture. The hero is drawn from `loadSideHero()`, so a hero drawn in the Hero Workshop shows up in the game.

### Lives by track
Easy: unlimited tries, 5 hearts, a bigger head start on the stampede. Intermediate: 5 tries, 3 hearts. Hard: 3 tries,
2 hearts, only the main flags (the small `c` flags are skipped), a smaller head start. A bonk or a fall into a pit costs a
heart (a pit also puts you back at the last flag). Out of hearts costs a try. Being caught by the stampede costs a try.
No tries left shows "Out of tries" with Try again. On Easy that never happens.

### How each hazard is warned about
Every throw starts with a **wind up of at least a second**, and the thrower's animation builds up.
- **Shot put:** a flashing red ring on the track where it will land, a red beam of light and a bobbing arrow over it, and
  arrows showing which way it will roll after it lands. The ring flashes faster as the throw gets close.
- **Javelin:** the same ring, beam and arrow in orange. It flies in a long arc and **sticks in the track**. A stuck javelin
  is a one-way platform (a ribbon plate at its tail; run and jump from about 3 tiles back). After 5 seconds it flashes and
  an official walks over and pulls it out. Two javelins together make a stair up to a high ledge with a secret sign.
- **Hammer:** the thrower spins with the hammer swinging round him, a warning triangle appears over him and a red lane of
  marching arrows lights up along the track where the hammer will fly. Then it flies low and fast. Jump it.
- **Stampede:** a sign ("Stampede ahead"), the starter standing by the line with a pistol, a flag just before it (so you come
  back to the line if caught), then BANG, a "get ready" beat, and the pack starts. An arrow shows at the screen edge when
  the pack is just behind you.
Hurdles are plain solid one-tile obstacles. The sandpit is a safe, slow, soft one-tile dip. The high-jump mat throws you up
if you land on it from the air (it reaches a high ledge with a secret sign).

### Editing the level
1. Open `src/arcade/brawl/level1.ts`. The rows of letters are the level; the legend is above them. Keep every row the same width.
2. Hazards are in `HAZARDS` (columns, and an `offset` in seconds so neighbours do not throw together). Their standard timing is
   in `TIMING`. The stampede is `STAMPEDE`, the medal times are `MEDALS`.
3. Run `node scripts/check-brawl.mjs`.

### The checker (`node scripts/check-brawl.mjs`)
It runs the real physics to measure the jump, then checks: the letters and row widths, one start and one finish, flags, signs
and hurdles stand on ground, every gap and step can be jumped (with a 15% safety margin), a pretend runner (a "bot") runs
the level from start to finish using the real physics, the stampede stays behind a flat-out bot on every track (and does not
catch an Easy runner who hesitates for 1.2 s), every hazard lands on open track with a wind up of at least 1 s and a cycle
that fits, and the medal times are sensible.

### Finishing
Break the tape: confetti, then a results panel (time, best, hits, tumbles, Gold / Silver / Bronze by time, otherwise a
participation ribbon). The best time is kept in the browser (`learning-arcade:brawl:stadium`). Finishing earns the island
stamp (unlike the other stops, which give theirs when you press Play): the island stop has `earnedBy: "finish"`.

### On the island
A stop between the Sport stadium and the Entertainment theatre: starting blocks and a finish banner (`V`), with the glowing
spot (`$`) in front. It opens after the stadium's gate.

### Left for later
Sound is a few simple blips. Levels 2 and 3. Enemies you can stomp. A proper boss. Art from the owner (the side-on hero sheet
already works). Secrets and collectables.
