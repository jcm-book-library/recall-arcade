// LEVEL 1: THE STADIUM. An athletics meet in full swing.
//
// The level is a picture made of letters, one letter per 16 px tile, 264 tiles wide and 16 tall (so
// about 4,200 pixels of running). Edit the letters and the level changes. After editing, run
//   node scripts/check-brawl.mjs
// It checks every gap and step can be jumped with the hero's real jump, that there is a way from the
// start to the finish, and that every flag, sign and hazard stands on something. Row 0 is the top.
//
//   LEGEND
//   .  open air
//   #  solid ground: pavement, concrete, the tunnel roof
//   T  solid running track (red, with lane lines)
//   s  sand: solid but slow, and a soft landing (the long-jump pit)
//   B  the high-jump mat: land on it from the air and it throws you up
//   H  a hurdle: one tile high and solid, so you have to jump it
//   =  a one-way platform: jump up through it, stand on it. Press Down to drop through
//   P  where the hero starts (stands on the tile below)
//   C  a checkpoint flag (every track)        c  an extra flag (Easy and Intermediate only)
//   K  the starter's line: crossing it fires the pistol and starts the stampede
//   F  the finish tape
//   1 2 3 4 5 6 7 8 9 0 a b ...  signs. The first letter shows the first line of SIGNS below, the next
//      letter the second line, and so on (see SIGN_KEYS in world.ts for the letters in order)
//
// RULES: every row must be exactly the same width. Gaps in the ground are pits (falling in costs a
// heart). A gap wider than 4 tiles can not be jumped. A step higher than 3 tiles can not be climbed.
//
// THE HAZARDS are not in the picture: they are in HAZARDS below, with their timing, because they
// repeat on a clock. Every one of them shows a warning before it comes (see hazards.ts).
import type { HazardSpec, StampedeSpec, Timing } from "./hazards.ts";
import type { LevelData } from "./world.ts";

//   0         10        20        30        40        50        60        70        80        90        100       110       120       130       140       150       160       170       180       190       200       210       220       230       240       250       260
//   012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123
export const ROWS: string[] = [
  "....................................................#####################...............................................................................................................................................................................................", //  0
  "....................................................#####################...............................................................................................................................................................................................", //  1
  "....................................................#####################...............................................................................................................................................................................................", //  2
  "....................................................#####################...............................................................................................................................................................................................", //  3
  "........................................................................................................................................................................................................................................................................", //  4
  "........................................................................................................................................................................................................................................................................", //  5
  "....................................................................===.....=====.............................................................................a.....................b...................................................................................", //  6
  "............................................................................................................................................................====..................=====.................................................................................", //  7
  "......................................................4..H........H...5.....C.....6.....................................................................................................................................................................................", //  8
  ".................................................###########...######################...................................................................................................................................................................................", //  9
  "................................................############...#######################..................................................................................................................................................................................", // 10
  "...P..1............2...H....H.........3.c..H...#############...########################...7....H...Hc..H..........................8.C...........9.......................c..................0..C..K..........H...H...........H...TTTTTTTTT...H.....H...............F.....", // 11
  "##############...###############....########################...########################TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTBBBBTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTTTTTTTT", // 12
  "##############...###############....########################...########################TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTssssssssTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTTTTTTTT", // 13
  "##############...###############....########################...########################TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTssssssssTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTTTTTTTT", // 14
  "##############...###############....########################...########################TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTssssssssTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTTTTTTTT", // 15
];

export const SIGNS: string[] = [
  "Athletes only. You are not an athlete. Carry on.",
  "Ticket office. Closed since the invention of tickets.",
  "Turnstile out of order. Please vault. Nobody is looking.",
  "Tunnel. Dark. Slightly damp. Keep running.",
  "Warm-up area ahead. Please warm up. You will need it.",
  "Concourse. Pies are available. The pies are not available.",
  "Track events this way. Track events also that way. It is a track.",
  "Long jump. Distance measured in vibes.",
  "Javelin zone. Look up. Then look down. Then maybe sideways.",
  "Stampede ahead. Check your shoelaces. Now, not later.",
  "You climbed a javelin. Nobody planned for that.",
  "High jump. Optional. Like most things.",
];

// Columns are tile columns (1 tile = 16 px). `thrower` is where the athlete stands (in the infield,
// behind the track), `land` is where the shot or javelin comes down on the track. `offset` shifts the
// cycle (in seconds) so neighbours do not throw at the same moment. The timing of each kind is in TIMING.
export const HAZARDS: HazardSpec[] = [
  // Two shot putters. Their landing spots are close, but their throws are half a cycle apart.
  { kind: "shot", thrower: 108, land: 114, offset: 0 },
  { kind: "shot", thrower: 127, land: 121, offset: 2.3 },
  // Two javelins. They stick in the ground and make little platforms (the two together make a stair
  // up to the high ledge, which has a secret sign on it).
  { kind: "javelin", thrower: 146, land: 155, offset: 0 },
  { kind: "javelin", thrower: 166, land: 158, offset: 4.2 },
  // The hammer thrower spins, then the hammer flies low and fast to the left across the high-jump mat.
  { kind: "hammer", thrower: 186, dir: -1, reach: 14, offset: 1 },
];

// How long each part takes (seconds). Longer wind up = fairer. Shorter period = busier.
export const TIMING: Timing = {
  shot: { period: 4.6, windup: 1.4, flight: 0.95, roll: 1.0, rollDist: 44, arc: 70 },
  javelin: { period: 9, windup: 1.5, flight: 1.15, stuck: 5, removal: 1.4, arc: 80 },
  hammer: { period: 6, windup: 1.9, speed: 240, height: 9 },
};

// The stampede. The pack's front starts `lead` pixels behind the line, waits `delay` seconds after the
// pistol, then runs at `speed` and gets `ramp` faster every second. The hero's top speed is 118.
export const STAMPEDE: StampedeSpec = { line: 193, lead: 170, speed: 112, ramp: 4, delay: 1.2 };

// Finish times (seconds) for the medals. Slower than bronze is a participation ribbon.
export const MEDALS = { gold: 80, silver: 105, bronze: 140 };

export const LEVEL_1: LevelData = {
  id: "stadium",
  name: "The Stadium",
  tagline: "An athletics meet is in full swing. You are in it. Nobody asked.",
  rows: ROWS,
  signs: SIGNS,
  hazards: HAZARDS,
  timing: TIMING,
  floorY: 192, // the top of the running track, in pixels (row 12)
  stampede: STAMPEDE,
  medals: MEDALS,
  // The scenery changes along the level (columns, from and to). The art reads this.
  scenes: [
    { kind: "outside", from: 0, to: 51 },
    { kind: "tunnel", from: 52, to: 72 },
    { kind: "concourse", from: 73, to: 86 },
    { kind: "field", from: 87, to: 189 },
    { kind: "finale", from: 190, to: 263 },
  ],
  // The named parts, for the progress line.
  sections: [
    { name: "Outside", from: 0 },
    { name: "The tunnel", from: 52 },
    { name: "The field events", from: 87 },
    { name: "The stampede", from: 193 },
  ],
};
