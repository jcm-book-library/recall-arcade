# The island (the Overworld): design (3 Nov 2026)

**Decided 3 Nov:** the owner said yes to the proposals, with one change: you get around with the keys only (the on-screen arrow pad on phones), so people try the engine before the arcade games. No tap-to-walk. Hidden easter-egg items come later, not in v1.

The place that ties Recall Arcade together. Your pixel hero walks around an island. Each subject is
a building, and the arcade games are stops along the path. It grows as you clear challenges. Labels:
**Decided** (already agreed in arcade-design.md), **Proposed** (waiting for the owner), **Open**.

## What it is
- **Decided:** an island. Each subject is a building, joined by a path, with the arcade games as
  stops along the way. When the whole arcade is unlocked, an arcade hall appears with links to
  everything. The hero walks the path.
- **Proposed:** a top-down tile map like The Labyrinth's garden. It reuses the same engine (grid
  walking, camera, the hero sheet, your `hero.png`), so it's quick to build and walks like a game
  you already know. About 48 × 32 tiles, so the camera scrolls a little but you can't get lost.

## Getting around
- **Decided:** walk with the arrow keys or WASD, or the on-screen arrow pad on a phone. No tap-to-walk:
  the island is where people get the feel of the game engine before the arcade games.
- Walk into a door, and a **sign** pops up listing that subject's quizzes, each with its challenge and a
  tick if it's done. Pick one to play. "◂ Island" on the quiz screen brings you back to the same spot.
- Walk onto an arcade stop to play that game. A locked stop has a fence and a sign ("Clear a
  challenge in 3 subjects"), but the gate still opens for a Preview. Nothing is locked behind skill.

## The buildings (Proposed: change any of these)
| Subject | Building | Why |
|---|---|---|
| Geography | a lighthouse with a giant globe | looks out over the world |
| Science | an observatory with a dome and telescope | space, Inner Space, Earth & Sky |
| History | a museum with columns (a little Greek temple) | myths, empires, timelines |
| Travel & Transport | a small airport terminal with a windsock | airports, airlines, tail fins |
| Nature & Animals | a zoo gate and a greenhouse | animals, pets, dinosaurs |
| Music | a bandstand / concert shell | the piano games |
| Sport | a stadium: oval stands, a green field, light towers | the Sport quizzes |
| Entertainment | a movie theatre: lit marquee, posters, red carpet, ticket booth | films and shows |

Arcade stops along the path:
- **Planet Pong:** an old arcade cabinet on the pier.
- **The Labyrinth:** a hedge-maze gate (it starts as a garden maze, after all).
- **Flyover:** an airstrip with a little plane.
- **Hero Workshop:** a tailor's or a mirror.
- **Later:** an empty plot with a "Coming soon" sign for the new flying games.

## Growing with your progress (Proposed)
- A building with a challenge done flies a **flag**. All six subjects done means fireworks and a
  sign: "Intermediate track unlocked".
- Arcade stops **open their fences** as you clear subjects (3 for the Labyrinth, 5 for Flyover, as now).
- When the whole arcade is unlocked, an **arcade hall** appears in an empty plot (owner idea), with
  links to everything.
- **Signs with the house humour**, for example "Arcade cabinet. We looked for a connection to the
  pier. We couldn't find one."

## The home page (Proposed)
Keep the card home page. It's quick, it works for everyone, and it works with screen readers. Add a big
**"Explore the island"** banner at the top. The island has a **"List view"** button back. If the island
becomes the favourite, it can become the front door later.

## Art (owner wants to draw it)
Everything is drawn in code first (grass, sand, water, paths, trees, the buildings), in the same
style as the Labyrinth garden. As with the hero, each building or tile set can later be replaced by
the owner's own picture in `public/arcade/island/`, and the Hero Workshop idea can grow into an
"Island Workshop".

## Build steps (Proposed)
1. **The island v1:** the map, walking (tap-to-walk and keys), all eight buildings opening their quiz
   signs, the arcade stops with locks and previews, "◂ Island" back from quizzes, and the home banner.
2. **Progress on the island:** flags, opening fences, fireworks, the arcade hall, funny signs.
3. **Your art:** swappable building and tile pictures, and an Island Workshop page.

## Open questions for the owner
1. Are the buildings right (see the table)?
2. Should the island be the front door, or a banner on the home page (my pick)?
3. Tap-to-walk (my pick) and keys, or keys and pad only?
4. Anything to find while walking? **Decided: later.** Easter-egg hidden items are on the cards,
   but not in v1.

## Built: island v1 (3 Nov 2026)
`#island`.
- **Files:**
  - `src/arcade/island.ts`: the engine and panels.
  - `src/arcade/island-map.ts`: the map as letters. Edit it, then run `node scripts/check-island.mjs`.
  - `src/arcade/island-art.ts`: the tiles and buildings, drawn in code.
  - `src/island.css`.
- **Home page:** the "Explore the island" banner.
- **Coming back:** quizzes and games opened from the island come back to it at the same door, through a sessionStorage key handled in `main.ts`.
- **Next is step 2:** flags, opening fences, fireworks, the arcade hall.

## The island becomes a route (decided 3 Nov 2026)
The owner's original vision: a route you walk, not a park to wander. This replaces step 2 above.
- **A loop you stick to.** Fences or hedges line the path:

  > Start → **Geography** → *Planet Pong* → **Science** → (scenic walk) → **History** → *The Labyrinth* → **Travel** → (scenic walk) → **Nature** → *Flyover* → **Music** → back to Start: **free roam**

  The order is fine for now. The owner will likely re-order it once all the arcade levels exist, so each game relates to the stop next to it (for example, Flyover beside Travel).
- **A gate across the path at each building.** It opens when that stop's quizzes are done: on Easy, 1 challenge; on Intermediate, 3; on Hard, all of them (targets to be set later). This replaces the old "Labyrinth after 3 subjects, Flyover after 5" rule.
- **Arcade stops are skippable.** They're a break from the quizzes if you want one, not needed to finish the loop. Playing one earns a badge or stamp.
- **Empty gaps** are scenic walks with funny signs until more games exist.
- **Finishing the loop** brings fireworks, the arcade hall, and **free roam**: walk anywhere, everything is open. Easter eggs and the new flying games will live there (rather than as separate games).
- **The island is the home page.** The list is one button away.
- **Progress is worked out from the challenges already saved**, so nothing earned is lost.

## Built: the island as a route (3 Nov 2026)
- **The map:** a 60 × 44 loop in `src/arcade/island-map.ts`, as letters. Edit it, then run `node scripts/check-island.mjs`.
- **Gates:** each gate belongs to the building before it. They block the path, but walking back is always allowed.
- **The finish line** at Start lets you through only after all eight gates. Stepping on it with every gate open starts free roam: fireworks, the fences vanish, and the arcade hall appears.
- **The first lap is always Easy** (1 challenge per stop), even for a player with lots of quizzes done already.
- **Arcade stops** are 1-tile spurs, so they're skippable. Play earns a stamp, saved in `learning-arcade:stamps`.
- **Saved progress:** `learning-arcade:island` holds `{freeRoam, track}`. The hero's spot is kept in sessionStorage.
- **Routes:** `#` and `#island` show the island, and `#list` shows the cards.
- **Testing:** `scripts/sweep-games.mjs` now reads the cards from `#list` and also opens the island, the list and the Hero Workshop.

## Built: the stadium (7 Nov 2026)
Sport is the seventh building, so the route is now: Start → … → **Music** → **Sport** → back to Start.
- **Where:** on the south lane, just after the corner. It is a 7 × 5 block (`O`, door `o`) with its door on the path. Its gate sits 7 tiles further west, the last one before the finish line. The map size did not change.
- **Gates and finish:** the gate list comes from `BUILDINGS`, so the finish line now needs all eight gates. A saved `freeRoam` is kept. The first lap is still Easy.
- **Sign:** a tenth signpost, written `0` on the map (the digits 1 to 9 were all used). It is the stadium joke by the corner. The checker accepts up to ten signs.
- **Quizzes:** the sign lists every deck with `subject: "Sport"`, in `DECKS` order. With none yet it says "Coming soon", and the gate is open (no challenges to do).
- **Art:** `stadium()` in `island-art.ts`.

## Built: the theatre, flags and stamp book (7 Nov 2026)
Entertainment is the eighth building, so the route is now: Start → … → Music → Sport → **Entertainment** → back to Start. The finish line needs all eight gates.
- **The theatre:** a 7 × 5 block (`K`, door `k`) on the south lane, west of the Sport gate. Its gate (the last one, just before the finish line) is 7 tiles further west, and the sign is "Cinema ahead" (`Q`). Two sea rows were turned into sand so it sits on dry land. The art is `theatre()` in `island-art.ts`: a lit "MOVIES" marquee, four posters, red carpet and rope posts, a ticket booth and a popcorn stand.
- **No quizzes yet:** with no decks for the subject the sign says "Coming soon", and its gate is open (no challenges to do). The first deck with `subject: "Entertainment"` fills the sign and sets the gate by itself.
- **More signs:** the digits 1 to 9 and 0 were all used, so signs now come from `SIGN_KEYS` in `island-map.ts` (`1234567890QR`). Key number n shows line n of `SIGNS`. To add one, put a spare capital letter on the end of `SIGN_KEYS` (B, D, I, J, V and W are free) and a line on the end of `SIGNS`. The second new sign ("Nearly home", `R`) is beside the last stretch to the finish line.
- **Flags:** a building flies a flag on its roof once any challenge in its subject is done (`gateInfos[i].done >= 1`). Each building has its own colour (`FLAG_COLOURS`) and its pole sits at a spot in `FLAG_AT` in `island.ts`; the flag ripples between two frames. It reads the saved challenges, so earlier progress shows up straight away.
- **Stamp book:** a "Stamp book" button in the island status line opens a panel (Esc closes it) with each arcade stamp, collected or not, and each building's flag with its state ("Flag flying", "No flag yet", "Coming soon"). It uses the same saved data as before (`learning-arcade:stamps`, the saved challenges), so nothing was migrated.
- **Already there from the route work:** gates, the finish fireworks, free roam, the arcade hall and stamps. Flags and the stamp book were the missing parts of step 2.
- **Checker:** `scripts/check-island.mjs` now reads `SIGN_KEYS` and accepts the theatre. The tiny pixel font's `V` was redrawn so "MOVIES" reads properly.
- **Dev helper:** `__island.book()` opens the stamp book in the dev copy.

## Later: the island opens up in stages (owner, 8 Nov 2026)
Logged to revisit. Free roam as it is now (every fence gone, only the coast as a border) feels too loose,
so the plan is three stages instead of "fenced, then wide open":
1. **First lap (Easy):** as now. Fences close to the path, one route all the way round.
2. **After the first lap:** the fences drop away, but a **softer border** stays along the road
   (bushes, hedges, low walls, rocks). The edges open up just enough to reach some **easter eggs**
   (to be worked out later), but it still feels like a path, not an empty field.
3. **A later step:** the player earns a **tool**, such as a key, or an axe to chop certain bushes or a
   tree. It opens a **wharf or bridge** to extra areas, or a future **expansion area**.

Questions for when we come back to this:
- What earns each tool (a lap on a harder track, a set of stamps, a hidden item)?
- Which bushes or trees can be chopped, and how does the player tell them apart?
- What is across the bridge: easter eggs, the new flying games, or a whole new region?
- Should the arcade hall stay where it is, or move to the new area?
