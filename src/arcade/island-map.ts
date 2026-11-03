// THE ISLAND: the map, drawn as a picture made of letters.
//
// Like the Labyrinth, one letter is one 16x16 tile, so you can redraw the island just by editing
// the letters below. The map is 48 tiles wide and 32 tall. The screen only shows 20 x 12 tiles,
// so the camera scrolls as you walk.
//
//   LEGEND
//   GROUND (you can walk on these)
//   .  grass        ,  sand (beach)       =  gravel path       *  grass with flowers
//   d  bare dirt (inside the fenced plots)                      p  pier planks
//   b  bridge (put it where a path crosses the river)           P  where the hero starts
//   SOLID SCENERY (you can not walk through these)
//   ~  sea          w  river              T  tree     r  rock     F  fence
//   SIGNPOSTS: the digits 1 to 9. Walk into one to read it. Digit 1 shows the first line of SIGNS
//   (below), digit 2 the second, and so on.
//   THE SIX SUBJECT BUILDINGS. Each is a block of its capital letter, as big as the picture is.
//   One tile on the bottom row of the block is the DOOR (the small letter). The door is where
//   the sign panel opens when you walk into it. A building must be a filled rectangle.
//   G g  Geography: the lighthouse and giant globe (5 wide, 7 tall)
//   S s  Science: the observatory (5 x 5)
//   H h  History: the museum (7 x 4)
//   A a  Travel & Transport: the airport terminal (7 x 5)
//   N n  Nature & Animals: the greenhouse and zoo gate (7 x 4)
//   M m  Music: the concert shell (5 x 4)
//   THE ARCADE STOPS. Each has a SPOT tile that you walk onto, plus some scenery around it.
//   C  and  @  Planet Pong: the arcade cabinet (C, solid, 2 wide and 2 tall) and the spot in front of it (@)
//   L  and  %  The Labyrinth: the hedge gate (L, solid) and the spot in the archway (%)
//   _ Y &      Flyover: the airstrip. _ is tarmac you can walk on, Y is the plane (solid), & is the spot
//   X  and  ^  Hero Workshop: the mirror stand (X, solid) and the spot in front of it (^)
//
// RULES FOR EDITING
//   - Every row must be exactly the same length. Count carefully!
//   - Keep sea (~) all the way round the edge so nothing can walk off the map.
//   - A door needs a walkable tile directly below it (that is where you stand to go in).
//   - Every door, spot and signpost must be reachable on foot from the start (P).
//   - Run  node scripts/check-island.mjs  after editing. It checks all of the above.

export const ROWS: string[] = [
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~,,~~,,,,~~~,,,,,,,~~~~~~~~~~~~~~",
  "~~~~~~~~~,,,,,,...ww....,........,,,,,~~~~~~~~~~",
  "~~~~~~~,,GGGGG...*ww.*....FFFFFFF....,,,,,~~~~~~",
  "~~~~~~,,,GGGGG....ww..LLL.FdddddF.SSSSS.T,~~~~~~",
  "~~~~~,...GGGGG....ww..L%L.Fdd3ddF.SSSSS..,,~~~~~",
  "~~~~,....GGGGG....ww...=..FdddddF*SSSSS...,,~~~~",
  "~~~,...T.GGGGG...*ww.*.=..FFF=FFF.SSSSS..7.,~~~~",
  "~~~......GGGGG....ww...=======*...SSsSS....,~~~~",
  "~~,......GGgGG....ww...=...*...======......,,~~~",
  "~~,,.*Tr...=======bb====..T....=............,,~~",
  "~~,,..............ww.5.=......*=.............,~~",
  "~~,.wwwwwwwwwwwwwwww...=...T.T.=.T..HHHHHHH..,~~",
  "~,,.wwwwwwwwwwwwwwww...=.....T.=....HHHHHHH..,~~",
  "~,,..MMMMM...........=====.T.T.=.*T.HHHHHHH.,,~~",
  "~~,..MMMMM...........==P1=.....=....HHHhHHH.,,~~",
  "~~,..MMMMM.....==========================....,~~",
  "~~,,.MMmMM.....=....======..*..=....*.........~~",
  "~~,,...=========....=..=.......=.T...T*T..T...~~",
  "~~~,..*..........*T.=..=.......=.......*....T,~~",
  "~~~,.....**.........=..=*.*....=...AAAAAAA.T.,~~",
  "~~~,T...NNNNNNN...^==..=.______=...AAAAAAA..,~~~",
  "~~~,.T..NNNNNNN..XXX=..=._YY_&_=...AAAAAAA..,~~~",
  "~~~,rT..NNNNNNN..XXX=..=......*=...AAAAAAA.,,~~~",
  "~~~~,.*.NNNNNnN..6..=..=.FFFFFF=...AAAaAAA.,~~~~",
  "~~~~,.....*.=========..=.FddddF=*..........,~~~~",
  "~~~~~,T................=.Fd4dd=========...,,~~~~",
  "~~~~~~,,,.......T...,,pppFddddF.*.....*.,,~~~~~~",
  "~~~~~~~~,,,,....,,,,,~p@pFFFFFF.*TT.T..,~~~~~~~~",
  "~~~~~~~~~~~~,.,,,~~~~~2CC~~~,....,,,,,~~~~~~~~~~",
  "~~~~~~~~~~~~~~~,,~~~~~~CC~~~,,,,,~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
];

// The words on the signposts, in order: digit 1 shows the first, digit 2 the second, and so on.
// Keep them short (they sit in a small panel) and dry.
export const SIGNS: string[] = [
  "Welcome to Recall Arcade Island. Walk with the arrow keys. Walk into a door to go in.",
  "Arcade cabinet. We looked for a connection to the pier. We couldn\u2019t find one.",
  "Coming soon: new flying games. The runway is being thought about.",
  "Reserved for the arcade hall. It will appear when you have earned it, and not before. The fence is very firm about this.",
  "Bridge. It goes over the river. That is the whole feature.",
  "Zoo. Please do not feed the quiz questions to the animals. They have opinions.",
  "Beach. Sand, sea, and a great deal of both.",
];

// What each building is. `body` is its capital letter in the map and `door` its small letter.
// `subject` is the subject name used by the quizzes (the decks), so the panel can list them.
export interface BuildingInfo { id: string; subject: string; title: string; body: string; door: string }
export const BUILDINGS: BuildingInfo[] = [
  { id: "lighthouse", subject: "Geography", title: "Geography", body: "G", door: "g" },
  { id: "observatory", subject: "Science", title: "Science", body: "S", door: "s" },
  { id: "museum", subject: "History", title: "History", body: "H", door: "h" },
  { id: "terminal", subject: "Travel & Transport", title: "Travel and Transport", body: "A", door: "a" },
  { id: "zoo", subject: "Nature & Animals", title: "Nature and Animals", body: "N", door: "n" },
  { id: "bandstand", subject: "Music", title: "Music", body: "M", door: "m" },
];

// The arcade stops. `game` is the route (and the id in ARCADE_GAMES on the home page). `spot` is
// the tile you walk onto, and `scenery` are the letters that make up the drawing around it.
export interface StopInfo { game: string; spot: string; scenery: string; sprite: string }
export const STOPS: StopInfo[] = [
  { game: "pong", spot: "@", scenery: "C", sprite: "cabinet" },
  { game: "labyrinth", spot: "%", scenery: "L", sprite: "gate" },
  { game: "flyover", spot: "&", scenery: "_Y", sprite: "airstrip" },
  { game: "hero", spot: "^", scenery: "X", sprite: "mirror" },
];
