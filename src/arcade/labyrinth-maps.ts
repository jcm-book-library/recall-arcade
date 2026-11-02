// THE LABYRINTH: the three levels, drawn as pictures made of letters.
//
// Each level is a list of text rows. One letter is one 16x16 tile on screen, so you can
// redraw a level just by editing the letters. This is called a TILE MAP.
//
//   LEGEND
//   #  wall (a hedge in the Garden Maze, stone in the Dungeon, black rock in the Lava Heart)
//   .  floor                     P  where the hero starts       E  the exit (steps down, or out)
//   r  red key     R  red door   (a red key opens a red door, once)
//   b  blue key    B  blue door  (a blue key opens a blue door, once)
//   *  gem
//   x  the EXIT KEY spot. The exit (E) is locked until you hold the exit key.
//        Gardens and dungeon: the key is not there at first. It appears on this spot the moment
//        you pick up the last gem. Put it well away from the exit so you have to fetch it.
//        Lava Heart: the key lies here from the start, in a small room sealed by a gem door (G).
//   G  gem door (level 3). It seals a small room. It opens by itself when you hold every gem.
//        The room must have the exit key (x) inside and no other way in.
//   i  ice pickup: a glowing ice crystal. Walk onto it to get one ice charge.
//   v  bat (wasp in the garden) that flies up and down      h  the same, but side to side
//   M  the Minotaur (level 3 only)
//   T  trapdoor. Looks like a wooden hatch with a crack. Step on it and you drop: half the time
//      to the start (P), half the time to a random safe spot. No heart is lost. Afterwards it stays
//      open as a hole, which acts like a wall.
//   ~  lava. Nothing can cross it. It is the walls and pools that shape the Lava Heart.
//   F  fire jet: a wall tile that shoots flame down the corridor in front of it, 3 tiles long.
//      The flame goes the way there is open floor. If two ways are open it picks the first of
//      down, left, right, up. Each jet has a timer: 2 s off, 0.6 s warning, 1 s fire.
//
// FLIPS. Each time a level starts, the game picks one of four versions at random: as drawn,
// flipped left-to-right, flipped top-to-bottom, or both (see flipRows at the bottom of this
// file). So write every level so that it works any way round. The checker tests all four.
//
// RULES FOR EDITING
//   - Every row in a level must be exactly the same length. Count carefully!
//   - Keep walls (#) all the way round the edge so nothing can walk off the map.
//   - Each level needs exactly one P, one E and one exit key spot (x).
//   - A door should sit in a one-tile-wide corridor, and its key must be reachable BEFORE
//     the door. Otherwise the level can't be finished.
//   - Trapdoors (T) and lava (~) must never be the ONLY way to somewhere. Count an open trapdoor
//     as a wall: every key, gem, ice crystal and the exit must still be reachable. A fire jet (F)
//     needs at least one open floor tile in front of it.
//   - Every gem must be reachable BEFORE the gem door opens (the door stays shut until the last gem).
//   - Give a bat a few free tiles to fly along (a room is best). It turns round at walls.
//   - Each level is bigger than the screen (the screen shows 20 x 12 tiles), so the
//     camera scrolls as you walk.
//   - Run  node scripts/check-labyrinth.mjs  after editing. It checks all of the above.

export interface LevelMap {
  name: string; // the name of the world, shown on the cards
  world: "garden" | "dungeon" | "lava"; // which look to draw (see labyrinth.ts)
  tagline: string; // one line under the name when the level begins
  rows: string[];
}

export const LEVELS: LevelMap[] = [
  {
    name: "The Garden Maze",
    world: "garden",
    tagline: "A sunny hedge maze. Find the cellar door.",
    rows: [
      "#########################################",
      "#P..............#.....#.....#...........#",
      "###############.#####.#.###.#.#.#######.#",
      "#...#.........#.#...#....*#.#.#.#....x#.#",
      "#.#.#.###.#####.#.#.#######.#.#.#.#####.#",
      "#.#.#..*#.....#.....h.......#.#.#.......#",
      "#.#.#########.#.....#########.#.#######.#",
      "#.#...........#.............#.#.#.....#.#",
      "#.#############.#.#########.#.#.#.###.#.#",
      "#.............#.#.#*......#.#.#...#*#.#.#",
      "#.###########.#.#.#####.###.#.#####.#.#.#",
      "#.#*....#...#.#.......#...#.#.#.....#.#.#",
      "#.###.#.#.#.#.#.#####.###.#.#.#.###.#.#.#",
      "#.....#...#.#.#.#...#.#...#.#.#.#.#.#.#.#",
      "########.##.#.#.#.###.#.#...#.#.#.#.#.#.#",
      "#...h.....#.#.#.#.......#.#.#...#...#.#.#",
      "#...#####.#.#.#.#.#########.#####.###.#.#",
      "#.........#.....#.#...#.........#.#.#.#.#",
      "#.##.######..v..#.#.#.#.#######.#.#.#.#.#",
      "#...............#.#.#.#.#*......#.#.#.#.#",
      "#.###########.#.#.#.#.#.#########.#.#.#.#",
      "#.#...#.......#.#...#.#.............#.#.#",
      "#.#.#.#.#######.###.#################.#.#",
      "#.#.#.#.#.....#.#.....................#.#",
      "#.#.#.#.#.###.#.#.#####################.#",
      "#.#.#.#.#...#.#.#.....#.....#...........#",
      "#.#.#.#.###.#.#.#####.#.#.###.###########",
      "#...#*#.....#.........#E#..............*#",
      "#########################################",
    ],
  },
  {
    name: "The Dungeon",
    world: "dungeon",
    tagline: "Mind the trapdoors. Look for the cracks.",
    rows: [
      "#############################################",
      "#P..............#.................#.........#",
      "###############.#.###.###########.#.#######.#",
      "#.............#.#.#...#.#...........#.....#.#",
      "#.#####.#####.#.###.###.#.###########.###.#.#",
      "#.#i..#.#*....#.#...#.....#E..#.......#.#.#.#",
      "#.###.#.#######.#.###.#######.#.#######.#.#.#",
      "#.....#.#.......#.#*..........#...........#.#",
      "#####.#.#.#######.#####################...#.#",
      "#.....#.#.#...............................#*#",
      "#.#####.#.#.###################.....#####.###",
      "#.#...#.#.#.....#.......T...............#...#",
      "#.###.#.#.#####.#.#####################.#.#.#",
      "#.....#.#.#*..#.#.........#*..........#.#.#.#",
      "#####.#.#.###.#.#.......#.#####.#####.#T#.#.#",
      "#.....#.h.#...#.#.h.....#.......#.....#.#.#.#",
      "#.#####...#.###.#.......#.#############.#.#.#",
      "#.#..r#...#.....#.........#...........#.#*#.#",
      "#.#.#############.#.#######.###...###.#.###.#",
      "#.#.#...........#.#.......#.#....v..#.#.....#",
      "#.#.#.###.#####.#.#.#####.#.#.#####.#.#####.#",
      "#.#.#.#*#.#.....#.#.#..*#.#.#...#...#.......#",
      "#.#.#.#.#.#.#####.#.#.###.#.###.#.#########T#",
      "#.#.#.#.#T#.#.....#.#...#.#T#...#...........#",
      "#.#.#.#.#.#.#####.#.###.#.#.#.###...#######.#",
      "#.#.....#.#.#...R.#.....#.#.#.#x#...#*....#.#",
      "#.#######.#.#.###########.#.#.#.#.#.#####.#.#",
      "#..v......#.#...#.........#...#.#.#.......#.#",
      "###.....###.###.#.#############.#.#########.#",
      "#*..............#...................T.......#",
      "#############################################",
    ],
  },
  {
    name: "The Lava Heart",
    world: "lava",
    tagline: "Run the loops. Watch the fire jets.",
    rows: [
      "#################################################",
      "#P............#.............................R*..#",
      "#.#####.###.#.#.#####.#####.#.#.###.###.#####...#",
      "#.........#.......#...........#.....#...#...#..b#",
      "#####.#.#.#.#.###.#.~~~~#.###.#.#.###.#.#.#.#####",
      "#.....#.....#.....#.......#...............#.....#",
      "#.###.#.~~~.#.#.###.###.###.###.#.~~~.~~~.#.#.#.#",
      "#.#...#.~~~.........#...........#.....~~~.#.#...#",
      "#.#.#.#.~~~.#.~~~##.#.#####.#.###.###.~~~.#.#F#.#",
      "#..*F.......#.....#...F.....#...#...........#...#",
      "#.###.#####.#####.###.#.#.#####.##~~~####.###.###",
      "#...#.........#.......#...T.....#.......#...#.Gx#",
      "###.######~~~.#.#.#########.###.#.#.#.~.#.#.#.###",
      "#...#.........#.T.#*..........#...#...~.........#",
      "#.###.#######.###.#...........#.#.###.~.#~~~###.#",
      "#.....#r#.........#..#.....#....T.....~.#.....#.#",
      "#.#.###.#.###.#F#.#.....M.....###.###.~.#.###.#.#",
      "#...#.....#...#......#.....#..#.......~.#...#...#",
      "#####.#####.###.#.#...........#.#.#####.#.#.###.#",
      "#...........#*..#.#..........i#.#.#*....#.#.....#",
      "#.##~~~~~.###.###.###.#########.#.#.#####.#.#####",
      "#.#*......#...#...#.T...........#...F.....#.....#",
      "#.#.#######.#.#.#.#.###.#####.#########.#######.#",
      "#...........#.......#.....#...................#.#",
      "#####.~~~~~.#######.#.###.#.~~~~###.#.~~~~~.#.#.#",
      "#.....~~~~~.#.......#...#.......#...#.~~~~~...#.#",
      "#.###.~~~~~.#.#######.#.#~~~#.#.#.###.~~~~~.#.#.#",
      "#...#......*F.....#...#.......#.#...............#",
      "#.#.#.#.#########.#.######~~~~#.#.###.#####.#####",
      "#.#...#.#.........#...#.........#...#...#...#*..#",
      "#.###.#.#.###.###.###.#.#.#########.#.#.#.#.#...#",
      "#.....................F.............#*......B..E#",
      "#################################################",
    ],
  },
];

// ---------- flipping a map ----------
// A map is just a grid of letters, so flipping it is easy:
//   - to flip LEFT-TO-RIGHT, reverse the letters in every row ("#P..E#" becomes "#E..P#");
//   - to flip TOP-TO-BOTTOM, reverse the order of the rows (the last row comes first).
// Do both and you have turned the map upside down. The maze is still the same maze, with all the
// same corridors and the same length, so a best time stays fair. Only the way round changes.
// Bats keep working (a bat that flies up and down still flies up and down), and a fire jet looks
// at what is around it when the level loads, so it simply picks whatever is now open floor.
export const FLIP_COUNT = 4;

/** `flip` is 0 as drawn, 1 left-to-right, 2 top-to-bottom, 3 both. */
export function flipRows(rows: string[], flip: number): string[] {
  let out = rows;
  if (flip & 1) out = out.map((row) => [...row].reverse().join(""));
  if (flip & 2) out = [...out].reverse();
  return out;
}
