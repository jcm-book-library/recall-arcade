// FLYOVER: the numbers and lists behind the game. This file has no drawing and no game
// logic, only DATA, so you can change the routes, the aircraft and the obstacle recipes
// without touching flyover.ts. (A small check script, scripts/check-flyover.mjs, builds every
// route many times over and warns you if anything becomes unfair or impossible.)
//
// HOW A LEG IS MADE NOW: each leg has a list of ROUTES you write by hand (the airports, and
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
export type ObstacleType = "storm" | "dust" | "gulls" | "parrots" | "mountain" | "cliff" | "mesa" | "building";
export interface ObstacleSpec { at: number; type: ObstacleType; y: number; w?: number }
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
  stopovers: string[]; // (leg 3 only) the stops that are STOPOVERS: a rest and a full refuel. Every other middle stop is a quick TRANSIT
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
// RATES, in percent of a full tank per SECOND), and now and then something puts some back.
// Reach 0 and the engines stop. Change these numbers to make a leg easier or harder, then run
// `node scripts/check-flyover.mjs`: it flies pretend pilots over every route and tells you if
// the leg has become impossible (or too easy to matter).
export const FULL_TANK = 100;
export interface FuelRules {
  climbBurn: number; // holding climb burns fuel fastest
  levelBurn: number; // flying level (or still drifting up after you let go) burns a little
  // (gliding down, not holding climb, burns NOTHING: that is the lesson of the briefing card)
  strikeCost: number; // a strike (a bump, or a wrong gate) costs this much, instead of a comfort star
  gateTopUp: number; // a correct gate adds this much, up to a full tank (0 = no top-up)
}
/** The sinking speed (pixels per second) above which the plane counts as "gliding down". */
export const GLIDE_SPEED = 4;
/** The gauge turns amber below AMBER_BELOW percent and flashes red below RED_BELOW. */
export const AMBER_BELOW = 30;
export const RED_BELOW = 15;
/** A beep sounds as the tank drops below each of these percentages. */
export const LOW_FUEL_BEEPS = [25, 10];
/** Leg 3 stops: how long the countdown lasts, in seconds. */
export const TRANSIT_SECONDS = 3;
export const STOPOVER_SECONDS = 5;

// ---------- the legs ----------
export interface Leg {
  aircraft: AircraftId;
  level: string; // shown on the leg card
  spacing: number; // distance between one checkpoint and the next
  routes: Route[]; // the leg picks one of these at random each play
  perHop: [number, number]; // how many obstacle groups to make in each hop (fewest, most)
  pairChance: number; // chance (0 to 1) that a group is a PAIR: two obstacles close together
  glowRight: boolean; // after a go-around, does the right gate glow? (Easy help)
  fuel: FuelRules | null; // null = no fuel on this leg: the three comfort stars are the life bar instead
  landAtStops: boolean; // true = after each right gate the plane really lands, waits, and takes off again (leg 3)
}

export const LEGS: Leg[] = [
  // LEG 1: the Cessna, around Australia. EASY: one thing at a time, nothing tricky, and the
  // right gate glows after a go-around.
  {
    aircraft: "cessna", level: "Easy", spacing: 600, perHop: [2, 2], pairChance: 0, glowRight: true, fuel: null, landAtStops: false,
    routes: [
      route("HBA MEL SYD BNE CNS", "sea, mountains, coast, coast"),
      route("SYD MEL ADL PER LEA", "mountains, coast, desert, coast"),
      route("CNS DRW ADL MEL HBA", "sea, desert, coast, sea"),
      route("PER AYQ ADL MEL AKL", "desert, desert, coast, sea"),
    ],
  },
  // LEG 2: the little jet, from Australia out into the world. INTERMEDIATE: busier, some pairs.
  {
    aircraft: "jet", level: "Intermediate", spacing: 700, perHop: [2, 3], pairChance: 0.3, glowRight: false, landAtStops: false,
    // Generous: holding climb ALL the time just about empties the tank; climbing half the time never does.
    fuel: { climbBurn: 8, levelBurn: 1.5, strikeCost: 12, gateTopUp: FULL_TANK / 3 },
    routes: [
      route("MEL CNS MNL HND PEK UBN", "coast+mountains, sea, sea, city, desert"),
      route("PER MRU CPT WDH LOS", "sea, coast, desert, sea"),
      route("SYD BWN DXB LHR BTS", "desert+sea, mountains, city, sea+city"),
      route("BNE AKL SCL GIG SJO", "sea, sea, mountains, jungle"),
    ],
  },
  // LEG 3: the jumbo, around the world. HARD: more of everything, including pairs, with wide
  // gaps because the jumbo is slow to turn. Tighter fuel, with NO top-up at the gates: only a
  // STOPOVER fills the tank. The spacing is wide because between two checkpoints the plane has
  // to land, wait and take off again (see STOP_RUN below) and still have room to fly.
  {
    aircraft: "jumbo", level: "Hard", spacing: 1300, perHop: [3, 3], pairChance: 0.4, glowRight: false, landAtStops: true,
    fuel: { climbBurn: 6.5, levelBurn: 1.0, strikeCost: 10, gateTopUp: 0 },
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
 * THE GROUND RUN OF A STOP (leg 3). After the right gate the plane glides down, touches down at
 * LAND_AFTER_GATE, rolls out, and later takes off again over TAKEOFF_LEN. Obstacles keep clear of
 * the whole stretch, so it adds up to this many pixels past the checkpoint.
 */
export const STOP_RUN = LAND_AFTER_GATE + ROLL_OUT + TAKEOFF_LEN;
/** What kind of stop is stop number `i` (0 for the first)? The last one is where the leg ends. */
export function stopKind(route: Route, i: number): "transit" | "stopover" | "last" {
  if (i >= route.hops.length - 1) return "last";
  return route.stopovers.includes(route.codes[i + 1]) ? "stopover" : "transit";
}
/** Where the plane touches down at stop `i`, and where it sits (stopped) before taking off again. */
export const stopTouchX = (leg: Leg, i: number) => checkpointAt(leg, i) + LAND_AFTER_GATE;
export const stopParkX = (leg: Leg, i: number) => stopTouchX(leg, i) + ROLL_OUT;
/** Where you start flying again after stop `i`. On the legs that really land at each stop it is the end of the take-off; otherwise the checkpoint itself. */
export const flyingFromX = (leg: Leg, i: number) => (leg.landAtStops ? stopParkX(leg, i) + TAKEOFF_LEN : checkpointAt(leg, i));

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
