// THE ISLAND: the map, drawn as a picture made of letters.
//
// Like the Labyrinth, one letter is one 16x16 tile, so you can redraw the island just by editing
// the letters below. The map is 60 tiles wide and 44 tall. The screen only shows 20 x 12 tiles,
// so the camera scrolls as you walk.
//
// THE ISLAND IS A ROUTE. A gravel path makes one big loop, and you walk it in order:
//   Start > Geography > (Planet Pong) > Science > scenic walk > History > (The Labyrinth) > Travel
//   > scenic walk > Nature > (Flyover) > Music > Sport > (The Brawl) > Entertainment > back to Start.
// Hedges and fences line the path so you can not wander off it. A GATE across the path just past
// each subject building stays shut until you have done enough challenges in that subject. When the
// loop is finished you get FREE ROAM: the side fences open and the arcade hall appears.
//
//   LEGEND
//   GROUND (you can walk on these)
//   .  grass        ,  sand (beach)       =  gravel path (the route)    *  grass with flowers
//   d  bare dirt (inside the fenced plots)                              p  pier planks
//   b  bridge (put it where the path crosses the river)                 P  where the hero starts
//   SOLID SCENERY (you can not walk through these)
//   ~  sea          w  river or pond      T  tree     r  rock     F  fence that never opens
//   f  FREE-ROAM FENCE. Solid until free roam is on, then it vanishes. The path is lined with
//      these, and so are the two plots.
//   SIGNPOSTS: the characters in SIGN_KEYS (below): the digits 1 to 9, then 0 for the tenth, then the
//   capital letters Q and R for the eleventh and twelfth. Walk into one to read it. The first key
//   shows the first line of SIGNS, the second key the second line, and so on. To add more signs, add
//   a spare capital letter to SIGN_KEYS (unused ones: B D I J W V) and a line to SIGNS.
//   GATES AND THE FINISH LINE
//   Z  a gate across the path. The gates are counted in the order you meet them on the route
//      (the first one you reach from the start is Geography's, then Science's, and so on, in the
//      same order as BUILDINGS below; the theatre's is the last, just before the finish line). It is solid until its subject has enough challenges done.
//   E  the finish line, just outside the start area. It only opens once you have walked round
//      the whole loop, which also stops anyone sneaking round the loop the wrong way.
//   THE EIGHT SUBJECT BUILDINGS. Each is a block of its capital letter, as big as the picture is.
//   One tile on the bottom row of the block is the DOOR (the small letter). The door is where
//   the sign panel opens when you walk into it. A building must be a filled rectangle.
//   G g  Geography: the lighthouse and giant globe (5 wide, 7 tall)
//   S s  Science: the observatory (5 x 5)
//   H h  History: the museum (7 x 4)
//   A a  Travel & Transport: the airport terminal (7 x 5)
//   N n  Nature & Animals: the greenhouse and zoo gate (7 x 4)
//   M m  Music: the concert shell (5 x 4)
//   O o  Sport: the stadium (7 x 5), on the south lane just after the corner
//   K k  Entertainment: the movie theatre (7 x 5), on the south lane after the stadium's gate
//   U u  The ARCADE HALL (7 x 5). It only appears in free roam; until then the plot is empty dirt.
//   THE ARCADE STOPS. Each has a SPOT tile that you step onto (it glows), plus scenery beside it.
//   They sit just off the path, so you can walk past them. Stepping on the spot opens a panel.
//   C  and  @  Planet Pong: the arcade cabinet (C, solid, 2 wide and 2 tall) and the spot beside it (@)
//   L  and  %  The Labyrinth: the hedge gate (L, solid) and the spot in the archway (%)
//   _ Y &      Flyover: the airstrip. _ is tarmac (solid), Y is the plane (solid), & is the spot
//   V  and  $  The Brawl: the starting blocks and finish banner (V, solid) and the spot in front of them ($)
//   X  and  ^  Hero Workshop: the mirror stand (X, solid) and the spot in front of it (^)
//
// RULES FOR EDITING
//   - Every row must be exactly the same length. Count carefully!
//   - Keep sea (~) all the way round the edge so nothing can walk off the map.
//   - A door needs a walkable tile directly below it (that is where you stand to go in).
//   - Every path tile that has grass beside it needs a fence (f) or scenery there, or you could
//     step off the route. Run  node scripts/check-island.mjs  after editing: it checks the route.

import { GAME_ROUTE } from "./brawl/names.ts";

export const ROWS: string[] = [
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~~~~~~~",
  "~~~~~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,fffffffff,,,,,,,~~~~~~~",
  "~~~~~,,rT.T..T.T.TT..T*.....T.*TT*.T.fUUUUUUUf...TTT,,~~~~~~",
  "~~~~,,...NNNNNNN............MMMMM*..*fUUUUUUUf.T.....,,~~~~~",
  "~~~,,....NNNNNNN....T.......MMMMMT.**fUUUUUUUfT.*...T.,,~~~~",
  "~~~,,....NNNNNNN...______..*MMMMM*...fUUUUUUUf..T.....,,~~~~",
  "~~~,,.ffTNNNNNnNfff_YY_&_fffMMmMMffTT3UUUuUUUfrffTTfff,,~~~~",
  "~~~,,T==========Z=================Z===================f,~~~~",
  "~~~,,f=ffffff9ffffTfffffTffffTfffffffffffffffffffffTT=f,~~~~",
  "~~~,,8=f..........*r......T.....*........***..*ffffff=f,~~~~",
  "~~~,,f=f...*T.......r......*..........T.*T.*...fddddf=f,~~~~",
  "~~~,,r=f..*........AAAAAAA................**.T.fddddf=f,~~~~",
  "~~~,,7=T...*..*....AAAAAAA....*...HHHHHHH*..T..fdddd2=f,~~~~",
  "~~~,,T=f..T...*.T..AAAAAAA*....*..HHHHHHH.TT..Tfddddf=f,~~~~",
  "~~~,,f=f.T........*AAAAAAA..LLL**THHHHHHHr.....ffffff=f,~~~~",
  "~~~,,T=fTfTffffffffAAAaAAAffL%LfffHHHhHHHffff...T*T.f=f,~~~~",
  "~~~,,T============Z==============Z===========T......f=f,~~~~",
  "~~~,,TfffffffffTfffrfTfTfTTfffffffffrfTfwwwf=T.....Tf=f,~~~~",
  "~~~,,.........T*.*......T.....T..T..T...wwwf=6.....TT=f,~~~~",
  "~~~,,*...TT.GGGGG.......*.*..T.....T...Twwwf=fT....*f=f,~~~~",
  "~~~,,.TT...*GGGGG...T..*...........TT.fffwff=T......f=f,~~~~",
  "~~~,,..T....GGGGG.T.*.......SSSSS...TT===b===T..*...T=f,~~~~",
  "~~~,,TT.T...GGGGG.......T..*SSSSS...Tf=f4wfff..TT...f=f,~~~~",
  "~~~,,Tfff1..GGGGG.**........SSSSST.*.f=fTw*..TT...*.T=f,~~~~",
  "~~~,XXX===f.GGGGG.........T.SSSSS..*.f=5*wT...T...T.f=f,~~~~",
  "~~~fXXX===ffGGgGGfffffffffffSSsSSfrfTT=T.w.....rT..Tf=f,~~~~",
  "~~~f=^============Z===============Z====f,w,..rTT*..Tf=f,~~~~",
  "~~~f====P=rffffTff~~~@CC~~~~~~~~~~~~~~~~~~,..T..T...T=f,~~~~",
  "~~~f======TT.....,~~~pCC~~~~~~~~~~~~~~~~~~,*..*.**T.f=f,~~~~",
  "~~~f======f.T....,~~~~~~~~,,KKKKKKK,,~~~~~,.OOOOOOO.f=f,~~~~",
  "~~~,fffEff.T*..TT,~~~~~~~~,,KKKKKKK,,~~~~~,.OOOOOOO.f=f,~~~~",
  "~~~,,.f=f.....*..,,,,,,,,,,,KKKKKKK,,,,,,,,.OOOOOOO.r=f,~~~~",
  "~~~,,.f=R....*....T.**......KKKKKKK.TTVVVTTrOOOOOOOTf=f,~~~~",
  "~~~~,,f=fTfffffffffffffffrTfKKKkKKKffQV$VfTfOOOoOOOT0=f~~~~~",
  "~~~~~,f=================Z===============Z=============~~~~~~",
  "~~~~~~,ffffffffffffffffffffffffffffffffffffffffffffff~~~~~~~",
  "~~~~~~~,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
];

// The words on the signposts, in order: digit 1 shows the first, digit 2 the second, and so on.
// Keep them short (they sit in a small panel) and dry.
export const SIGNS: string[] = [
  "Welcome to Recall Arcade Island. Follow the path round. Each gate opens when you have done enough challenges at the building before it. Walk into a door to go in.",
  "Coming soon: new flying games. The runway is being thought about.",
  "Reserved for the arcade hall. It will appear when you have been all the way round, and not before. The fence is very firm about this.",
  "Bridge. It goes over the river. That is the whole feature.",
  "Scenic route. The scenery has been told you are coming.",
  "Pond. Ducks are not included. Management regrets the ducks.",
  "Beach. Sand, sea, and a great deal of both.",
  "You are on a path. Paths are very good at this.",
  "Zoo. Please do not feed the quiz questions to the animals. They have opinions.",
  "Stadium. The crowd is very keen. The crowd is also painted on. Please clap anyway.",
  "Cinema ahead. Every film showing is a masterpiece. We have not been told which films. The popcorn is rumoured.",
  "Nearly home. The finish line has been waiting for you. It had nothing else on.",
];

/** The characters that make a signpost, in the order of SIGNS: key number n shows SIGNS[n - 1]. */
export const SIGN_KEYS = "1234567890QR";
export const isSignKey = (c: string) => c !== "" && SIGN_KEYS.includes(c);
/** Which line of SIGNS (counting from 1) a signpost character shows. */
export const signNumber = (c: string) => SIGN_KEYS.indexOf(c) + 1;

// What each building is. `body` is its capital letter in the map and `door` its small letter.
// `subject` is the subject name used by the quizzes (the decks), so the panel can list them.
// `place` is how the gate sign names it. THE ORDER HERE IS THE ORDER OF THE ROUTE: the first
// gate you meet belongs to the first building, and so on.
export interface BuildingInfo { id: string; subject: string; title: string; place: string; body: string; door: string }
export const BUILDINGS: BuildingInfo[] = [
  { id: "lighthouse", subject: "Geography", title: "Geography", place: "Geography lighthouse", body: "G", door: "g" },
  { id: "observatory", subject: "Science", title: "Science", place: "Science observatory", body: "S", door: "s" },
  { id: "museum", subject: "History", title: "History", place: "History museum", body: "H", door: "h" },
  { id: "terminal", subject: "Travel & Transport", title: "Travel and Transport", place: "Travel terminal", body: "A", door: "a" },
  { id: "zoo", subject: "Nature & Animals", title: "Nature and Animals", place: "Nature zoo", body: "N", door: "n" },
  { id: "bandstand", subject: "Music", title: "Music", place: "Music bandstand", body: "M", door: "m" },
  { id: "stadium", subject: "Sport", title: "Sport", place: "Sport stadium", body: "O", door: "o" },
  { id: "theatre", subject: "Entertainment", title: "Entertainment", place: "Entertainment theatre", body: "K", door: "k" },
];

// The arcade hall, which only exists in free roam.
export const HALL = { id: "hall", title: "The Arcade Hall", body: "U", door: "u" };

// The arcade stops. `game` is the route (and the id in ARCADE_GAMES on the home page). `spot` is
// the tile you walk onto, and `scenery` are the letters that make up the drawing around it.
// `stamp` says whether playing it earns a stamp (the Hero Workshop is a tool, not a game).
// `after` is the building whose gate you must pass to reach the stop (null = right from the start).
// `earnedBy: "finish"` means the stamp is not given for pressing Play: the game itself awards it when you
// finish (see stamps.ts). Without it, pressing Play on the island earns the stamp.
export interface StopInfo { game: string; spot: string; scenery: string; sprite: string; stamp: boolean; after: string | null; earnedBy?: "finish" }
export const STOPS: StopInfo[] = [
  { game: "pong", spot: "@", scenery: "C", sprite: "cabinet", stamp: true, after: "lighthouse" },
  { game: "labyrinth", spot: "%", scenery: "L", sprite: "gate", stamp: true, after: "museum" },
  { game: "flyover", spot: "&", scenery: "_Y", sprite: "airstrip", stamp: true, after: "zoo" },
  { game: GAME_ROUTE, spot: "$", scenery: "V", sprite: "track", stamp: true, after: "stadium", earnedBy: "finish" },
  { game: "hero", spot: "^", scenery: "X", sprite: "mirror", stamp: false, after: null },
];

// ---------------------------------------------------------------------------------------------
// WHAT CAN BE WALKED ON. The game and the checker script share these rules, so they agree.
// ---------------------------------------------------------------------------------------------
export const MAP_W = ROWS[0].length;
export const MAP_H = ROWS.length;
export const tileAt = (x: number, y: number) => ROWS[y]?.[x] ?? "~";

/** Always solid: sea, river, trees, rocks, the buildings (and their doors), scenery, signposts. */
const HARD_SOLID = new Set("~wTrFGgSsHhAaNnMmOoKkUuCLYXV_" + SIGN_KEYS);

/** What can change while you play. */
export interface WalkState {
  freeRoam: boolean; // the side fences are open and every gate is open
  openGates: Set<string>; // "x,y" of each gate that is open
  finishOpen: boolean; // the finish line lets you through
}
/** Is this tile in your way? */
export function blocked(x: number, y: number, st: WalkState): boolean {
  const c = tileAt(x, y);
  if (HARD_SOLID.has(c)) return true;
  if (c === "f") return !st.freeRoam;
  if (c === "Z") return !(st.freeRoam || st.openGates.has(`${x},${y}`));
  if (c === "E") return !(st.freeRoam || st.finishOpen);
  return false;
}

/** Every tile you can reach on foot from (sx, sy), as a set of y * MAP_W + x. */
export function reach(sx: number, sy: number, st: WalkState): Set<number> {
  const seen = new Set<number>([sy * MAP_W + sx]);
  const queue: [number, number][] = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (seen.has(ny * MAP_W + nx) || blocked(nx, ny, st)) continue;
      seen.add(ny * MAP_W + nx);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

export function findTiles(letter: string): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (tileAt(x, y) === letter) out.push([x, y]);
  return out;
}

/**
 * The gates in the order you meet them. We find them by walking: from the start, with every gate
 * shut and the finish line shut, you can only reach the first gate. Open it, and the next one is
 * the only new gate you can touch, and so on. So the order never has to be written down.
 */
export function gateOrder(): [number, number][] {
  const start = findTiles("P")[0];
  const gates = findTiles("Z");
  const open = new Set<string>();
  const order: [number, number][] = [];
  if (!start) return order;
  for (;;) {
    const seen = reach(start[0], start[1], { freeRoam: false, openGates: open, finishOpen: false });
    const next = gates.find(([x, y]) => !open.has(`${x},${y}`) && [[0, 1], [-1, 0], [1, 0], [0, -1]].some(([dx, dy]) => seen.has((y + dy) * MAP_W + x + dx)));
    if (!next) break;
    open.add(`${next[0]},${next[1]}`);
    order.push(next);
  }
  return order;
}
