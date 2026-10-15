# Action game ideas (parked)

Ideas for the character-driven side of Recall Arcade. Nothing here is scheduled yet.
Written down so they don't get lost.

## The big picture
- A set of short levels, each in a different classic style, built in order of difficulty.
  Each one teaches the next layer of how games are made.
- Once finished, the levels connect: the character moves between them (and between the
  learning games), with character design getting more detailed as the project goes on.
- Long-term influence: the side-scrolling platformers of the early 90s (Jurassic Park,
  Aladdin, The Lion King) and a Star Wars-style space adventure, under our own name.

## Tone
- Simple visuals that match the learning games.
- Dry, dark humour. It takes itself completely seriously while being quite stupid.
- Pays homage to different eras and styles of gaming.

## How the whole thing fits together (progression)
One "playthrough" opens everything up. Quizzes unlock the arcade levels; the player picks
how hard they want that to be.

| Track | To progress | Who it's for |
|---|---|---|
| Easy | One quiz in each subject at 50%+ | Lunch-break trivia and some old-school arcade fun |
| Intermediate | Three quizzes per subject at 70-75%+ | Getting properly good |
| Hard | Every quiz at 80-90%+ | Actually training yourself |

- Finishing a full playthrough unlocks free play: any quiz or arcade level, any time.
- **Expert** (unlocked after a playthrough): every quiz at 100% and the arcade levels
  without dying once. Optional bragging rights.
- **Badges for everything.** Every quiz tier earns a badge; the arcade side earns trophies;
  together they complete a set. Achievements are never locked behind skill alone.
- **Rating:** G/PG. Kids find it ridiculous but fun; adults get the references and the
  nostalgia. Cartoon violence only (robots go "poof", asteroids explode).

### Notes to work out
- Percentages aren't equal across quizzes: 50% of the world (99 countries) is far harder
  than 50% of South America (6). Each subject needs at least one small "starter" quiz so
  Easy stays easy.
- Idea: each arcade level is themed around a subject and unlocked by that subject's
  quizzes (e.g. the Dogfight flies over the geography map).
- Can you switch tracks mid-playthrough without losing progress? (Probably yes.)
- Should the arcade levels get easier/harder with the track too (lives, checkpoints)?
- A playthrough could take weeks, so progress needs to survive beyond one browser:
  a backup/export at minimum, accounts maybe later.

## Levels

### 1. The Labyrinth (top-down, Pokémon / Zelda view)
A maze the character has to get through, with a few things to get past along the way.
- **What it teaches:** the game loop, keyboard input, tile maps, walls/collision,
  a camera that follows the player, simple enemies or locked doors and keys.

### 2. The Dogfight (top-down scrolling shooter)
A spacecraft or plane moves side to side, shooting what's ahead and dodging,
while the ground scrolls past underneath.
- **What it teaches:** smooth movement (speed and momentum rather than grid steps),
  projectiles, spawning enemies in waves, hit detection, scrolling and parallax backgrounds.

### 3. The Brawl (side-on platformer)
A street scene to get from start to finish, Mario-style: jumping over gaps, obstacles
and enemies.
- **What it teaches:** gravity and jumping, running acceleration and friction,
  landing on platforms, a side-scrolling camera, enemies that patrol.

### 4. The Boss (side-on boss fight)
One big boss fight like the old games, using the platformer from level 3.
- **What it teaches:** attack patterns, the boss "telegraphing" a move before it happens,
  health bars, phases where the fight changes as the boss weakens.

### 5. The Chase (the finale, running toward the screen)
The first idea of the lot. After the boss is beaten, the final escape: the character runs
toward the camera while something huge chases from behind, like the boulder in the old
Indiana Jones games or the boulder levels in Crash Bandicoot. You can't see far ahead,
so it's all about reacting to what comes up: dodging left or right, jumping, ducking.
Could also be a car chase.
- **Where it fits:** last, both in the story and in the build order. It's the only level
  that fakes 3D (things get bigger as they come closer), which makes it a good final step.
- **What it teaches:** fake 3D perspective (scaling by distance, as in OutRun or
  Space Harrier), lanes, timing windows, and fair warning for hazards you can't see yet
  (shadows, sounds, signs).
- **Cheaper fallback:** a top-down version that reuses the Dogfight's scrolling, with the
  chaser visible at the bottom of the screen.

## Open questions for later
- How the learning games and the action levels connect (unlocks? the action levels as
  rewards? a hub world?).
- Whether this stays in this repo or becomes its own project once it grows.
- Chase: on foot, in a vehicle, or both in stages?
- Art: hand-drawn pixel sprites, generated placeholders first, or a mix.
