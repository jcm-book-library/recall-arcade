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
Bluebottle hero with faint guide lines) to open in Piskel and recolour, plus a picture-by-picture
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

## Play-test round 2 (3 Nov 2026): the Labyrinth and Flyover
Owner's notes and Claude's proposals. The owner said yes to all of them on 3 Nov. Build order: the Labyrinth first, then Flyover in two pull requests (1: routes, terrain and landings; 2: fuel, transits and stopovers).

### The Labyrinth
- **Gems open the way out (Decided).** Levels 1 and 2: collecting every gem makes the exit key
  appear. Level 3: every gem opens a door to the exit key, and that key finishes the game.
  **Decided (owner: "all yes"):** a "gem door" tile, shown with a counter ("4 of 9"), so it's clear what the gems are for.
- **Ice is found, not earned (Decided: an ice pickup in level 2).** Because gems are now needed to
  leave, "all the gems = ice" would give everyone ice. **Decided (owner: "all yes"):** one hidden ice pickup in level
  2, and one in level 3 somewhere risky (near the lair or behind fire jets).
- **Getting hurt doesn't send you back (Decided).** Bats, wasps and fire jets cost a heart, push
  you back a step, and you blink safe for a moment.
  **Decided (owner: "all yes"):**
  - At 0 hearts you restart the **current level**, not the whole game.
  - Hearts refill to 3 at the start of each level.
  - The Minotaur also costs a heart, then stamps and waits 2 seconds, so you can get away.
- **Trapdoors (Decided):** they drop you at the start **or** a random spot, which may help or
  hurt. Level 3 gets some too, easy to miss in a panic. **Decided (owner: "all yes"):** the random spot is any floor
  tile you could already walk to with the keys you hold (never sealed behind a locked door), at
  least 4 tiles from any enemy. Half the time it's the start, half the time a random spot.
- **Fresher levels (Decided, in two steps):**
  1. Each play flips each map at random (left to right, top to bottom, or both). That gives 4
     versions of every level straight away, all the same length, so best times stay fair.
  2. Later, a second hand-made map for each world. The checker proves every version can be finished.
  A maze generated by the computer is possible too, but it loses the hand-made character, so keep
  that for a bonus mode.

### Flyover
- **Routes picked at random (Decided).** The owner wrote the routes below. Each leg picks one per
  play. Six codes need adding to the airport list (which also adds them to the Airport Codes
  quiz): LEA Learmonth, UBN Ulaanbaatar, WDH Windhoek, BWN Brunei, BTS Bratislava, SJO San José
  (Costa Rica).
- **Terrain per hop (Decided idea; the owner wrote the first two legs, Claude drafted the rest for
  review).** Each hop between two stops has a terrain, which sets the scenery and its obstacles:
  - **sea:** storms and seagulls
  - **coast:** birds and cliffs
  - **mountains:** peaks
  - **desert:** dust storms and mesas
  - **city:** tall buildings
  - **jungle:** storms and parrots

  Obstacles are made from the terrain each time, and the checker tests every route many times.

| Leg | Route | Terrain for each hop |
|---|---|---|
| 1 Australia | HBA MEL SYD BNE CNS | sea, mountains, coast, coast |
| 1 | SYD MEL ADL PER LEA | mountains, coast, desert, coast |
| 1 | CNS DRW ADL MEL HBA | sea, desert, coast, sea |
| 1 | PER AYQ ADL MEL AKL | desert, desert, coast, sea |
| 2 Asia | MEL CNS MNL HND PEK UBN | coast + mountains, sea, sea, city, desert |
| 2 Africa | PER MRU CPT WDH LOS | sea, coast, desert, sea |
| 2 Europe | SYD BWN DXB LHR BTS | desert + sea, mountains, city, sea + city |
| 2 Americas | BNE AKL SCL GIG SJO | sea, sea, mountains, jungle |
| 3 World | MEL HKT AUH FCO DFW AKL BNE | desert, sea, desert, sea, sea, sea (draft) |
| 3 World | SYD LAX YYZ HEL DOH CAN ADL | sea, mountains, sea, mountains, mountains, desert (draft) |
| 3 World | PER JNB CAI CDG GRU SCL MEL | sea, jungle + desert, mountains, sea, mountains, sea (draft) |

- **Three levels of difficulty, one per leg (Decided):**
  - **Leg 1, Easy (Cessna):** 3 strikes and you're diverted, as now, with help.
    **Decided help:** on a go-around, the right gate glows.
  - **Leg 2, Intermediate (jet):** more weather, and **fuel becomes your life bar**. Climbing burns
    fuel, levelling off burns a little, and gliding down burns none. A strike (a bump or a wrong
    gate) costs a chunk of fuel. **Decided (owner: "all yes"):** each correct stop tops the tank up by a third, so
    you only run dry if you hold ↑ the whole time.
  - **Leg 3, Hard (jumbo):** tighter fuel, plus two kinds of stop. A **transit** is a quick stop,
    a 3-second countdown and no fuel. A **stopover** is a rest with a full refuel and a 5-second
    countdown. Both use a real landing and take-off. **Decided (owner: "all yes"):** the big hubs on each route are
    stopovers (for example AUH, DFW, YYZ, DOH, JNB, GRU) and the rest are transits.
- **Decided (a lesson from the Labyrinth):** running out of fuel diverts you back to your **last
  stop**, not the start of the leg.

**Flyover step 1 built (3 Nov 2026):** random routes from the owner's list, terrain scenery and
obstacles generated per hop (`src/arcade/flyover-gen.ts`, seeded; `node scripts/check-flyover.mjs`
tests 200 seeds per route), take-off and landing, the glowing right gate on Easy, and diverting
to the last stop. Flyover now uses `kit.ts`. Step 2 (fuel, transits, stopovers) is next: the
take-off and landing functions are ready to call at mid-leg stops.

**Flyover step 2 built (3 Nov 2026):**
- **Fuel on legs 2 and 3.** The numbers are in `flyover-data.ts`.
  - Leg 2 burns 8% a second climbing and 1.5% level, a strike costs 12%, and each correct gate adds a third.
  - Leg 3 burns 6.5% and 1%, a strike costs 10%, gates add nothing, and stopovers refill the tank.
- **Leg 3 stops.** You land at every middle stop: a transit is a 3 s countdown, a stopover is 5 s with a full refuel.
  - Mid-leg landings play at double speed, so a stop takes about 13 s.
  - Leg 3 hops were made longer (1,300 px) to fit the landings.
- **Running out of fuel** diverts you to your last correct stop with a full tank.
- **Fuel check.** `scripts/check-flyover.mjs` simulates pilots: a sensible pilot makes it, and a pilot who climbs all the time runs dry on leg 3.

**Flyover play-test round 3 (3 Nov 2026), built:**
- **No stopping at middle stops.** A transit gives no fuel and a stopover refills the tank while you keep flying. Leg 2 stopovers: MNL and PEK, CPT, DXB, SCL. Leg 3 stopovers: AUH and DFW, YYZ and DOH, JNB and GRU.
- **Longer legs.** Leg 2 is about 2× leg 1 (about 92 s) and leg 3 is about 2× leg 2 (about 185 s). There are more obstacles per hop, so the sky is as busy per second as before. Fuel was retuned for the longer hops.
- **Leg 3 thunderclouds.** A light at the top or bottom warns 0.9 s before a 0.4 s bolt goes that way. The checker makes sure both over and under are passable.

**Flyover play-test round 4 (3 Nov 2026), built:**
- **City name beside the gates:** on leg 1 only.
- **New leg 3 hazards:** news helicopters patrolling up and down in city skies, dust devils that pulse tall and short in the desert, and gentle heat thermals that lift you.
  - The checker flies past each moving hazard at 24 different moments to prove there's always a way through.
  - City was added to some leg 3 hops so the helicopters have somewhere to fly: LAX, DOH to CAN, CAI to CDG, CDG, DFW, BNE.
- **Tighter fuel** (`climbBurn` only):
  - Leg 2 goes from 2.6 to 3.25. It lasts at 65% climbing and runs dry at 90%.
  - Leg 3 goes from 1.8 to 2.05. It lasts at 45% climbing and runs dry at 65%.
