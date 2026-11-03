// FLYOVER: the numbers and lists behind the game. This file has no drawing and no game
// logic, only DATA, so you can change the routes, the aircraft and the obstacle recipes
// without touching flyover.ts. (A small check script, scripts/check-flyover.mjs, builds every
// route many times over and warns you if anything becomes unfair or impossible.)
//
// HOW A LEG IS MADE: each leg has a list of ROUTES you write by hand (the airports, and
// what the land or sea looks like below each hop). Every play, the leg picks one route at
// random. The obstacles are NOT written out any more: flyover-gen.ts makes them each time from
// the RECIPES below ("what lives over a desert?") and the leg's difficulty.
//
// Everything is measured in "game pixels" on the 320 x 180 canvas.
// DISTANCE is how far along the leg you are, counted in pixels from the start of the leg.
// HEIGHT is counted from the top of the screen: 0 is the very top, 180 is the very bottom.

export const WORLD_H = 180;

// ---------- the three aircraft ----------
export type AircraftId = "cessna" | "jet" | "jumbo";

export interface Aircraft {
  name: string; // shown on the HUD
  nick: string; // used in "Leg 2: the little jet"
  speed: number; // top forward speed, pixels per second
  climbAccel: number; // how hard the engines pull you UP while you hold the key (pixels per second, per second)
  fallAccel: number; // how gently you sink when you let go
  drag: number; // air resistance on up/down speed: bigger = settles quicker, smaller = drifts on
  maxUp: number; // fastest climb, pixels per second
  maxDown: number; // fastest descent
  ceiling: number; // highest the plane's middle can go (smaller number = higher up the screen)
  floor: number; // lowest the plane's middle can go
  hitW: number; // the HITBOX: a rectangle a bit smaller than the picture, so near-misses feel fair
  hitH: number;
}

export const AIRCRAFT: Record<AircraftId, Aircraft> = {
  // Small, slow, low ceiling: it can't climb above the high cloud.
  cessna: {
    name: "Cessna", nick: "the Cessna", speed: 70,
    climbAccel: 220, fallAccel: 70, drag: 2, maxUp: 75, maxDown: 42,
    ceiling: 58, floor: 150, hitW: 14, hitH: 5,
  },
  // Quicker and more nimble, and it can fly higher.
  jet: {
    name: "Little jet", nick: "the little jet", speed: 105,
    climbAccel: 300, fallAccel: 80, drag: 2, maxUp: 95, maxDown: 55,
    ceiling: 30, floor: 150, hitW: 20, hitH: 5,
  },
  // Big and slow to turn: low acceleration, and it keeps drifting after you let go.
  jumbo: {
    name: "Jumbo", nick: "the jumbo", speed: 85,
    climbAccel: 170, fallAccel: 55, drag: 1.4, maxUp: 60, maxDown: 36,
    ceiling: 22, floor: 146, hitW: 30, hitH: 8,
  },
};

// ---------- terrain ----------
// What lies below one hop (the flight between two stops). It sets the scenery AND the obstacles.
export type Terrain = "sea" | "coast" | "mountains" | "desert" | "city" | "jungle";
export const TERRAINS: Terrain[] = ["sea", "coast", "mountains", "desert", "city", "jungle"];

// ---------- obstacles ----------
// None of them is dangerous, just bumpy. Some FLOAT (y = the HEIGHT of the middle of the thing),
// some RISE FROM THE GROUND (y = how TALL it is, in pixels above the bottom of the screen).
//   storm      a dark cloud with a little lightning        floats
//   dust       a brown swirling dust storm                 floats
//   gulls      a flock of seagulls                         floats
//   parrots    a flock of coloured parrots                 floats
//   mountain   a peak, snowy if tall                       ground
//   cliff      a low sea cliff, like a small mountain      ground
//   mesa       a flat-topped rock                          ground
//   building   a tall building with lit windows            ground (w = how wide, optional)
//   thunder    a big dark THUNDERCLOUD (leg 3 only) that     floats, in the middle of the sky
//              zaps lightning straight up or straight down
//              on a timer (see "thunderclouds" below)
export type ObstacleType = "storm" | "dust" | "gulls" | "parrots" | "mountain" | "cliff" | "mesa" | "building" | "thunder";
// `phase`, `period` and `seed` are only used by a thundercloud: they set where it is in its zap cycle
// (so no two clouds fire together), how long one cycle is, and which side it warns about each time.
export interface ObstacleSpec { at: number; type: ObstacleType; y: number; w?: number; phase?: number; period?: number; seed?: number }
export interface Rect { x: number; y: number; w: number; h: number }

export const OBSTACLE_INFO: Record<ObstacleType, { ground: boolean; what: string; w?: number; h?: number }> = {
  storm: { ground: false, what: "A storm cloud", w: 36, h: 22 },
  dust: { ground: false, what: "A dust storm", w: 40, h: 24 },
  gulls: { ground: false, what: "A flock of seagulls", w: 34, h: 20 },
  parrots: { ground: false, what: "A flock of parrots", w: 34, h: 20 },
  mountain: { ground: true, what: "A mountain" },
  cliff: { ground: true, what: "A cliff" },
  mesa: { ground: true, what: "A mesa" },
  building: { ground: true, what: "A tall building" },
  thunder: { ground: false, what: "A thundercloud", w: 60, h: 30 },
};

/** How wide a ground obstacle's picture is, from how tall it is. */
export function groundWidth(o: ObstacleSpec): number {
  if (o.type === "building") return o.w ?? 24;
  if (o.type === "cliff") return Math.round(30 + o.y * 0.9);
  if (o.type === "mesa") return Math.round(40 + o.y * 0.5);
  return Math.round(36 + o.y * 0.55); // mountain
}

/** The rectangle the PICTURE covers (x counted from the start of the leg). */
export function pictureOf(o: ObstacleSpec): Rect {
  const info = OBSTACLE_INFO[o.type];
  if (info.ground) {
    const w = groundWidth(o);
    return { x: o.at - w / 2, y: WORLD_H - o.y, w, h: o.y };
  }
  return { x: o.at - info.w! / 2, y: o.y - info.h! / 2, w: info.w!, h: info.h! };
}

/**
 * The HITBOX: a rectangle smaller than the picture. Clouds and birds have soft, empty edges,
 * a mountain is narrow at the top, so a full-size box would feel unfair. Only the hitbox
 * decides if you bump something. (A building really is a box, so its hitbox is nearly all of it.)
 */
export function hitboxOf(o: ObstacleSpec): Rect {
  const p = pictureOf(o);
  switch (o.type) {
    case "mountain": return { x: o.at - p.w * 0.2, y: p.y + 6, w: p.w * 0.4, h: p.h - 6 };
    case "cliff": return { x: o.at - p.w * 0.3, y: p.y + 4, w: p.w * 0.6, h: p.h - 4 };
    case "mesa": return { x: o.at - p.w * 0.38, y: p.y + 2, w: p.w * 0.76, h: p.h - 2 };
    case "building": return { x: p.x + 2, y: p.y + 1, w: p.w - 4, h: p.h - 1 };
    default: return { x: p.x + 5, y: p.y + 5, w: p.w - 10, h: p.h - 10 };
  }
}

// ---------- thunderclouds (leg 3) ----------
// A thundercloud sits in the middle of the sky and is an obstacle all the time. On top of that it
// runs a repeating timer, its CYCLE:
//     quiet ...... then WARNING (a light flashes at the top or the bottom of the cloud for 0.9 s)
//                 ...... then the BOLT (lightning straight up or down from the cloud for 0.4 s).
// The light shows the side the bolt will take, so you make a call: go over the cloud or under it.
// Every cloud has its own cycle length and starting point (set when the course is made), so they
// do not all fire together, and the side is picked fresh, at random, every cycle.
export const THUNDER_WARN = 0.9; // seconds of flashing light before the bolt
export const THUNDER_BOLT = 0.4; // seconds the bolt lasts
export const THUNDER_BOLT_W = 10; // how wide the bolt's hit area is, in pixels
export const THUNDER_PERIOD: [number, number] = [3.2, 4.0]; // the shortest and longest cycle, in seconds
/** The cloud's middle is kept inside this band of heights, so there is always room to pass over AND under it. */
export const THUNDER_Y: [number, number] = [64, 104];
/** Which kinds of terrain a thundercloud may appear over (leg 3 mixes them in with the usual recipes). */
export const THUNDER_TERRAINS: Terrain[] = ["sea", "coast", "mountains", "desert", "jungle"];

export type ThunderPhase = "quiet" | "warn" | "bolt";
export type ThunderSide = "up" | "down";
/**
 * What a thundercloud is doing at game time `time` (seconds). It is a pure sum of the cloud's own
 * numbers and the time, so the game and the check script always agree.
 */
export function thunderAt(o: ObstacleSpec, time: number): { phase: ThunderPhase; side: ThunderSide; cycle: number; left: number } {
  const period = o.period ?? 3.6;
  const u = time + (o.phase ?? 0);
  const cycle = Math.floor(u / period);
  const into = u - cycle * period; // seconds since this cycle began
  const fire = period - THUNDER_BOLT; // when the bolt starts
  const warn = fire - THUNDER_WARN; // when the light starts
  // The side comes from mixing the cloud's seed with the cycle number: random-looking, but the same every time.
  const h = Math.imul((o.seed ?? 1) ^ Math.imul(cycle + 7, 0x9e3779b1), 0x85ebca6b);
  const side: ThunderSide = (h >>> 13) & 1 ? "up" : "down";
  if (into >= fire) return { phase: "bolt", side, cycle, left: period - into };
  if (into >= warn) return { phase: "warn", side, cycle, left: fire - into };
  return { phase: "quiet", side, cycle, left: warn - into };
}

/** The area a bolt strikes: from the cloud to the very top (or bottom) edge of the sky. */
export function boltRect(o: ObstacleSpec, side: ThunderSide): Rect {
  const body = hitboxOf(o);
  const x = o.at - THUNDER_BOLT_W / 2;
  if (side === "up") return { x, y: -20, w: THUNDER_BOLT_W, h: body.y + 3 + 20 };
  return { x, y: body.y + body.h - 3, w: THUNDER_BOLT_W, h: WORLD_H + 20 - (body.y + body.h - 3) };
}

// ---------- the recipes: what lives over each terrain ----------
// For every kind of terrain: which obstacles can appear, how often (`weight`: a bigger number
// means more often), and how big. For a floating thing `lo`/`hi` are the HEIGHT of its middle;
// for a ground thing they are how TALL it is. (The generator also trims these to what the
// leg's aircraft can fly over, so a Cessna never meets a mountain it cannot climb.)
export interface RecipeItem { type: ObstacleType; weight: number; lo: number; hi: number; wLo?: number; wHi?: number }
export const RECIPES: Record<Terrain, RecipeItem[]> = {
  sea: [
    { type: "storm", weight: 3, lo: 40, hi: 130 },
    { type: "gulls", weight: 4, lo: 40, hi: 135 },
  ],
  coast: [
    { type: "gulls", weight: 3, lo: 40, hi: 135 },
    { type: "cliff", weight: 4, lo: 22, hi: 55 },
  ],
  mountains: [
    { type: "mountain", weight: 6, lo: 35, hi: 105 },
    { type: "storm", weight: 1, lo: 40, hi: 120 },
  ],
  desert: [
    { type: "dust", weight: 4, lo: 45, hi: 135 },
    { type: "mesa", weight: 3, lo: 30, hi: 75 },
  ],
  city: [
    { type: "building", weight: 1, lo: 35, hi: 110, wLo: 18, wHi: 30 },
  ],
  jungle: [
    { type: "storm", weight: 3, lo: 40, hi: 130 },
    { type: "parrots", weight: 3, lo: 40, hi: 135 },
  ],
};

// ---------- routes ----------
// One hop = the flight to the next stop. Its terrain is written as one word ("sea"), or two
// joined by a plus ("coast+mountains"), which means it STARTS as the first and CHANGES to the
// second halfway.
export interface Hop { start: Terrain; end: Terrain }
export interface Route {
  codes: string[]; // airport codes. The first is where you take off; each one after is a stop (a checkpoint)
  hops: Hop[]; // one for every stop, so there is always ONE MORE code than hops
  stopovers: string[]; // (legs 2 and 3) the middle stops that are STOPOVERS: they refuel you to FULL. Every other middle stop is a TRANSIT (no fuel)
}

/** Write a route the easy way:  route("HBA MEL SYD", "sea, mountains")  or, with stopovers, route("MEL HKT AUH", "sea, desert", "AUH")  */
function route(codes: string, terrain: string, stopovers = ""): Route {
  return {
    codes: codes.trim().split(/\s+/),
    stopovers: stopovers.trim() ? stopovers.trim().split(/\s+/) : [],
    hops: terrain.split(",").map((t) => {
      const [start, end] = t.trim().split("+");
      return { start: start as Terrain, end: (end ?? start) as Terrain };
    }),
  };
}

// ---------- fuel ----------
// FUEL IS A RESOURCE THAT DRAINS AND REFILLS. It is a number from 0 to 100 (a percentage of a full
// tank). Every moment the game takes a little off, depending on what you are doing (the BURN
// RATES, in percent of a full tank per SECOND). The only way to put fuel back is a STOPOVER: flying
// through its gate refuels you to FULL while you keep flying (the bar fills over about a second).
// A TRANSIT gives nothing. Reach 0 and the engines stop. Change these numbers to make a leg
// easier or harder, then run `node scripts/check-flyover.mjs`: it flies pretend pilots over every
// route and tells you if the leg has become impossible (or too easy to matter).
export const FULL_TANK = 100;
export interface FuelRules {
  climbBurn: number; // holding climb burns fuel fastest
  levelBurn: number; // flying level (or still drifting up after you let go) burns a little
  // (gliding down, not holding climb, burns NOTHING: that is the lesson of the briefing card)
  strikeCost: number; // a strike (a bump, a wrong gate, a lightning bolt) costs this much, instead of a comfort star
}
/** The sinking speed (pixels per second) above which the plane counts as "gliding down". */
export const GLIDE_SPEED = 4;
/** The gauge turns amber below AMBER_BELOW percent and flashes red below RED_BELOW. */
export const AMBER_BELOW = 30;
export const RED_BELOW = 15;
/** A beep sounds as the tank drops below each of these percentages. */
export const LOW_FUEL_BEEPS = [25, 10];
/** How long the tank takes to fill, in seconds, after you fly through a stopover's gate. The plane keeps flying meanwhile. */
export const REFUEL_SECONDS = 1;

// ---------- the legs ----------
// LONGER EACH LEG. Leg 1 takes about 45 seconds from take-off to touchdown. Leg 2 is meant to take
// about TWICE that and leg 3 about twice leg 2 (four times leg 1). The only dial is `spacing`, the
// distance between one checkpoint and the next, because every route keeps its stops. (Leg 2's
// routes have 4 or 5 hops, so a long route takes a little more.) The obstacles per hop grow with the hop,
// so the sky is just as busy per second. scripts/check-flyover.mjs prints the times it works out.
export interface Leg {
  aircraft: AircraftId;
  level: string; // shown on the leg card
  spacing: number; // distance between one checkpoint and the next
  routes: Route[]; // the leg picks one of these at random each play
  perHop: [number, number]; // how many obstacle groups to make in each hop (fewest, most)
  pairChance: number; // chance (0 to 1) that a group is a PAIR: two obstacles close together
  thunder: [number, number]; // how many thunderclouds to add to each hop (fewest, most). 0 on legs 1 and 2
  glowRight: boolean; // after a go-around, does the right gate glow? (Easy help)
  fuel: FuelRules | null; // null = no fuel on this leg: the three comfort stars are the life bar instead
}

export const LEGS: Leg[] = [
  // LEG 1: the Cessna, around Australia. EASY: one thing at a time, nothing tricky, and the
  // right gate glows after a go-around.
  {
    aircraft: "cessna", level: "Easy", spacing: 600, perHop: [2, 2], pairChance: 0, thunder: [0, 0], glowRight: true, fuel: null,
    routes: [
      route("HBA MEL SYD BNE CNS", "sea, mountains, coast, coast"),
      route("SYD MEL ADL PER LEA", "mountains, coast, desert, coast"),
      route("CNS DRW ADL MEL HBA", "sea, desert, coast, sea"),
      route("PER AYQ ADL MEL AKL", "desert, desert, coast, sea"),
    ],
  },
  // LEG 2: the little jet, from Australia out into the world. INTERMEDIATE: about twice as long as
  // leg 1, busier, some pairs. Each route has named STOPOVERS (a full tank when you fly through the gate);
  // the other middle stops are transits. Fuel is GENEROUS: holding climb for a whole stretch between
  // stopovers just about empties the tank, climbing 85% of the time never does.
  {
    aircraft: "jet", level: "Intermediate", spacing: 2070, perHop: [7, 8], pairChance: 0.3, thunder: [0, 0], glowRight: false,
    fuel: { climbBurn: 2.6, levelBurn: 0.45, strikeCost: 8 },
    routes: [
      route("MEL CNS MNL HND PEK UBN", "coast+mountains, sea, sea, city, desert", "MNL PEK"),
      route("PER MRU CPT WDH LOS", "sea, coast, desert, sea", "CPT"),
      route("SYD BWN DXB LHR BTS", "desert+sea, mountains, city, sea+city", "DXB"),
      route("BNE AKL SCL GIG SJO", "sea, sea, mountains, jungle", "SCL"),
    ],
  },
  // LEG 3: the jumbo, around the world. HARD: about twice as long as leg 2, more of everything,
  // including pairs, with wide gaps because the jumbo is slow to turn, plus THUNDERCLOUDS. Tighter
  // fuel: climbing half the time is fine, but holding climb all the time runs dry between stopovers.
  {
    aircraft: "jumbo", level: "Hard", spacing: 2475, perHop: [11, 12], pairChance: 0.4, thunder: [2, 3], glowRight: false,
    fuel: { climbBurn: 1.8, levelBurn: 0.15, strikeCost: 10 },
    routes: [
      route("MEL HKT AUH FCO DFW AKL BNE", "desert, sea, desert, sea, sea, sea", "AUH DFW"),
      route("SYD LAX YYZ HEL DOH CAN ADL", "sea, mountains, sea, mountains, mountains, desert", "YYZ DOH"),
      route("PER JNB CAI CDG GRU SCL MEL", "sea, jungle+desert, mountains, sea, mountains, sea", "JNB GRU"),
    ],
  },
];

// ---------- rules about where things are, shared by the game, the generator and the checker ----------
export const GATE_CLEAR_BEFORE = 70; // nothing in the way this close BEFORE a gate...
export const GATE_RETRY = 150; // a go-around puts the gates this much further on...
export const GATE_CLEAR_AFTER = 200; // ...so keep the sky tidy until here AFTER the checkpoint
export const TAKEOFF_LEN = 170; // distance the plane rolls and climbs before you are in control
export const FIRST_OBSTACLE = 260; // nothing in the first stretch, while you take off
export const MIN_GROUP_GAP = 100; // obstacle groups are at least this far apart
export const LAND_AFTER_GATE = GATE_RETRY + 260; // the landing runway starts this far past the last checkpoint
export const ROLL_OUT = 110; // how far the plane rolls along the runway after touching down
export const RUNWAY_END_PAD = 40; // bare runway beyond where the roll ends

/**
 * What kind of stop is stop number `i` (0 for the first)? The last one is where the leg ends.
 * A stop is a TRANSIT (no fuel) unless the route names it as a STOPOVER (refuel to full). You never
 * land at either: you just fly through the gate. (Leg 1 has no fuel, so its stops are just stops.)
 */
export function stopKind(route: Route, i: number): "transit" | "stopover" | "last" {
  if (i >= route.hops.length - 1) return "last";
  return route.stopovers.includes(route.codes[i + 1]) ? "stopover" : "transit";
}

/** Where the gate group for stop number `i` (0 for the first stop) sits, from the start of the leg. */
export const checkpointAt = (leg: Leg, i: number) => leg.spacing * (i + 1);
/** How far the leg reaches, to the end of the landing runway. */
export const legLength = (leg: Leg, stops: number) => checkpointAt(leg, stops - 1) + LAND_AFTER_GATE + ROLL_OUT + RUNWAY_END_PAD;

/** The three heights the gate rings sit at, and how tall each ring opening is. */
export function gateSlots(ac: Aircraft) {
  const range = ac.floor - ac.ceiling;
  return {
    ys: [0.15, 0.5, 0.85].map((f) => Math.round(ac.ceiling + range * f)),
    half: Math.floor(range * 0.35) / 2 - 1, // half the height of one ring opening
  };
}
