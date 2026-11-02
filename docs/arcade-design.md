# Arcade design note (1 Nov 2026)

What we decided about the three arcade games, the link to the quizzes, and the island. Start here
in the next arcade session. **Status:** steps 1 to 3 of the build order were built on 1 Nov 2026 (see the end). The bigger background is in [action-game-ideas.md](action-game-ideas.md).
Labels: **Decided** (the owner said so), **Proposed** (Claude's recommendation, not yet confirmed),
**Open** (still to settle).

## How the arcade works today (short version)
- Three games, all open from the home page under "The Arcade (preview)": Planet Pong
  (`src/arcade/pong.ts`), The Labyrinth (`labyrinth.ts` + `labyrinth-maps.ts`), Flyover
  (`flyover.ts` + `flyover-data.ts`).
- They all use the same loop: read input, update, draw. Time moves in fixed 1/120-second steps, on a
  320×180 pixel canvas. The art is written as grids of letters, and the sounds come from the music
  piano.
- Each game keeps only its own best time (Pong keeps none). Nothing is linked to the quiz scores yet.
- Only Flyover asks you anything (airport codes at the gates).

## 1. Planet Pong
The owner's favourite: easy to pick up, and it works well on a phone. Difficulty becomes three
tiers. **Decided** unless marked.

| | Easy | Intermediate | Hard |
|---|---|---|---|
| First to | 5 | 7 | 10 |
| Planets served | Mercury, Venus, Earth, Mars | adds Jupiter, Saturn, Uranus, Neptune | adds dwarf planets with powers |
| Asteroids | 1 large | 4 (as now) | 4 that split into 2 small ones when they crack (**Decided**, instead of 8: eight would clog a 320-pixel court) |
| Halley's Comet | no | rare | rare |

- **Paddle edges shaded** so you can see that hitting with the edge sends the ball at an angle.
- **Dwarf planets (Hard).** Drawn bigger than true scale, each with one power. **Decided** set:
  - Ceres (it lives in the asteroid belt): breaks an asteroid in one hit.
  - Haumea (spins fastest): moves at 2× speed.
  - Pluto ("still a planet to us"): a point won with Pluto counts double. Pong has no lives, so this
    replaces the owner's "extra life" idea.
  - Eris: shrinks the computer's paddle. Makemake: curves in flight.
- **Halley's Comet:** a second ball that streaks in mid-rally, at most once a match and not every
  match. Intermediate and Hard only. A small "Halley's Comet!" banner warns you first.

## 2. The Labyrinth
The owner hasn't reached the Minotaur yet, so whether it's too easy stays **Open** until they finish it.

- **A different world on each level (Decided):**
  1. **Garden hedge maze**, outdoors. Its exit is a door down into...
  2. **The dungeon**, much as it looks now.
  3. **The final level is a change of style**, with corridors closer to Pac-Man. **Decided: lava.** It suits the flow (going deeper down) and the Minotaur myth, and it
     stays G/PG as long as touching lava sends you back with a "singed" puff, not a death. The
     neon/Tron look could come back later for a level that leads into the space quizzes.
- **Gems become a one-shot weapon (Decided in spirit).** **Proposed:** collect every gem on a level to
  earn one charge, then throw it in the direction you face. It **freezes** the Minotaur for a few
  seconds; freezing rather than defeating keeps it G and keeps him a threat. A miss wastes the charge.
  A first-time player who skipped the gems finds out on level 3 that they have to run.
- **New hazards (Decided as ideas; Proposed placement):** trapdoors in the dungeon (they drop you
  back to an earlier spot), and darts or lava jets from the walls on level 3, flashing before they
  fire so they're fair.

## 3. Flyover
- **Keep it side-on (Decided).** The owner first pictured top-down, but side-on is fine.
- **Show the next stop on the game screen (Decided, quick fix).** At the moment it's only in the
  strip above, which is hard to read while flying.
- **Take off and land (Decided):** start each leg on a runway and end with a landing, instead of
  appearing and disappearing in mid-air.
- **Fuel (Decided idea).** **Proposed:** climbing burns fuel, levelling off burns a little, gliding
  down burns none, and you refuel at every correct stop. Running dry means "diverted", like losing
  your comfort stars. Start it on Intermediate, so Easy stays simple.
- **Routes (Decided):** about five routes per leg, written by the owner so they make sense, using
  real stopovers and transits for the stops in between. The format is the `stops` list in
  `flyover-data.ts`. **Proposed:** the wrong gates should be nearby airports that are believable
  (needs a short "decoys" list per route).
- **Backgrounds that look like the real place:** later.
- **Top-down for leg 2, snake-style world maze for leg 3 (Decided: separate games, next on the
  arcade roadmap after the build order below, so the owner can compare which flying game they prefer).** Three styles in one game triples the work and the testing. The roadmap already has a
  "snake-style flight game over a map" and a top-down Dogfight, so those ideas become their own
  arcade levels later.

## 4. Progression: how the quizzes open the arcade
- **Decided:** level one of the arcade is always open. After that, what you can play and how hard it
  is depend on the quizzes you've done.
- **Decided:** to move on, complete a **challenge** on any one quiz in each subject. It should be
  easy on Easy. Each quiz needs its own measure, because the games differ. For example, Countries
  starts at about 25 countries, not 50% (which is about 100). Targets get set per quiz once more is
  settled.
- **Decided** shape (built):
  - Pong is open. The Labyrinth opens after challenges in 3 subjects. Flyover opens after 5. Doing
    all 6 subjects (Music included) finishes the Easy track and opens Intermediate everywhere.
  - Difficulty in each game (Pong's tiers, Labyrinth lives, Flyover fuel) follows your track.
  - Locked games show as a silhouette with "Do a challenge in History to open this". Following "never
    locked behind skill alone", a **Preview** button still lets you have a go.
- **The Easy challenge for every quiz** is a table in `src/engine/progress.ts` (`CHALLENGES`). Each
  one is "at least N right in any round" (for example "Name 25 countries") or, for timelines,
  multiple choice, pairs and hangman, "at least this share of the marks". The owner adjusts the numbers
  after playing. Intermediate and Hard targets are still to be set, so nobody reaches the Hard track yet.
- How it works: nothing new is saved per round. The home page works out the ticks from the saved
  scores, keeps ticked challenges in `learning-arcade:challenges` (so they never drop off), and leaves the
  current track in `learning-arcade:track` for the arcade games to read.

## 5. The island (the Overworld)
**Decided vision:** an island. Each subject is a building, linked by a path, with the arcade games as
stops along the way. When the full arcade is unlocked (requirements **Open**), an arcade or shop
building appears on the island, linking to everything. The pixel hero walks the path. Build it after
the progression exists, because the island shows what the progression has unlocked.

## 6. The pixel hero
The owner found the Piskel steps overwhelming. **Proposed:** a ready-made starter `hero.png` (the
placeholder hero with faint guide lines) to open in Piskel and recolour, plus a picture-by-picture
guide page. Recolouring an existing hero is far easier than drawing on a blank 32×64 sheet.

## Build order (agreed)
Steps 1 to 3 were built on 1 Nov 2026. In Pong, every tier can be played; tiers above your track say
"Preview".
1. **Quick wins:** shaded Pong paddle edges; Flyover's next stop shown on the game screen.
2. **Pong's three tiers**, chosen by a button for now, locked to the track later.
3. **Progression, first version:** the challenge table, saving each challenge as done, locks and
   Preview on the home page.
4. **Built 2 Nov 2026:** the toolkit is `src/arcade/kit.ts`, used by the Labyrinth so far; Pong and Flyover move over when next touched. **A shared arcade toolkit:** move the loop, pixel art, saving and sounds into one place, so the
   next steps cost less. Nothing changes on screen.
5. **Built 2 Nov 2026:** the Garden Maze (wasps, cellar door), the Dungeon (6 trapdoors), the Lava Heart (new looping map, lava, 7 fire jets), ice charges, and `node scripts/check-labyrinth.mjs` to prove the maps can be finished. **Labyrinth:** the three worlds, the gem freeze, the traps.
6. **Flyover:** take-off and landing, fuel, the owner's routes.
7. **Hero starter sheet and visual guide.** **Built 2 Nov 2026** as the Hero Workshop (`#hero`): labelled sheet, starter download, colour ideas, a walking preview of your own PNG, and "use this hero in The Labyrinth" on this device.
8. **The island.**
9. **The two new flying games**: a top-down flight, and a snake-style flight that works its way
   around a world map like a maze.

Steps 1, 2 and 5 are well suited to a cheaper helper model working from this note. The lead session
reviews and plays each one before a pull request.
