# The island (the Overworld): design proposal (3 Nov 2026)

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
- **Proposed:** **tap or click a building** and the hero walks there by himself along the path (the
  computer finds the route). Arrow keys or WASD, or the on-screen pad, still work for walking freely.
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
1. **The island v1:** the map, walking (tap-to-walk and keys), all six buildings opening their quiz
   signs, the arcade stops with locks and previews, "◂ Island" back from quizzes, and the home banner.
2. **Progress on the island:** flags, opening fences, fireworks, the arcade hall, funny signs.
3. **Your art:** swappable building and tile pictures, and an Island Workshop page.

## Open questions for the owner
1. Are the buildings right (see the table)?
2. Should the island be the front door, or a banner on the home page (my pick)?
3. Tap-to-walk (my pick) and keys, or keys and pad only?
4. Anything to find while walking? For example a hidden gem per subject, as a light collectable
   (step 2 or later).
