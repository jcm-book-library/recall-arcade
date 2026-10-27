// FLYOVER: the numbers and lists behind the game. This file has no drawing and no game
// logic, only DATA, so you can change the routes, the aircraft and the obstacles without
// touching flyover.ts. (A small check script, scripts/check-flyover.mjs, reads this file
// too, and warns you if a list becomes unfair or impossible.)
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

// ---------- obstacles ----------
// Three kinds, none of them dangerous, just bumpy:
//   storm    a dark cloud with a little lightning.   y = the HEIGHT of its middle
//   birds    a flock of small V shapes.              y = the HEIGHT of the middle of the flock
//   mountain rises up from the ground.               y = how TALL it is (pixels above the bottom)
export type ObstacleType = "storm" | "birds" | "mountain";
export interface ObstacleSpec { at: number; type: ObstacleType; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export const STORM_SIZE = { w: 36, h: 22 }; // the picture
export const BIRDS_SIZE = { w: 34, h: 20 };
export const mountainWidth = (height: number) => Math.round(36 + height * 0.55);

/** The rectangle the PICTURE covers (x counted from the start of the leg). */
export function pictureOf(o: ObstacleSpec): Rect {
  if (o.type === "mountain") {
    const w = mountainWidth(o.y);
    return { x: o.at - w / 2, y: WORLD_H - o.y, w, h: o.y };
  }
  const s = o.type === "storm" ? STORM_SIZE : BIRDS_SIZE;
  return { x: o.at - s.w / 2, y: o.y - s.h / 2, w: s.w, h: s.h };
}

/**
 * The HITBOX: a rectangle smaller than the picture. Clouds and birds have soft, empty
 * edges, and a mountain is narrow at the top, so a full-size box would feel unfair.
 * Only the hitbox decides if you bump something.
 */
export function hitboxOf(o: ObstacleSpec): Rect {
  const p = pictureOf(o);
  if (o.type === "mountain") return { x: o.at - p.w * 0.2, y: p.y + 6, w: p.w * 0.4, h: p.h - 6 };
  return { x: p.x + 5, y: p.y + 5, w: p.w - 10, h: p.h - 10 };
}

// ---------- the legs ----------
export interface Leg {
  aircraft: AircraftId;
  from: string; // airport code you take off from
  spacing: number; // distance between one checkpoint and the next
  stops: string[]; // the 8 checkpoints, in order (airport codes from decks/airports-data.ts)
  obstacles: ObstacleSpec[]; // keep this list sorted by `at`
}

// Rules about where gates are, shared by the game and the check script.
export const GATE_CLEAR_BEFORE = 70; // nothing in the way this close BEFORE a gate...
export const GATE_RETRY = 150; // a go-around puts the gates this much further on...
export const GATE_CLEAR_AFTER = 200; // ...so keep the sky tidy until here AFTER the checkpoint
export const LEG_RUNOUT = 120; // flying on after the last checkpoint before the leg is done
export const FIRST_OBSTACLE = 120; // nothing in the first stretch, while you take off

/** Where the gate group for stop number `i` (0 to 7) sits, from the start of the leg. */
export const checkpointAt = (leg: Leg, i: number) => leg.spacing * (i + 1);
export const legLength = (leg: Leg) => leg.spacing * leg.stops.length + LEG_RUNOUT;

/** The three heights the gate rings sit at, and how tall each ring opening is. */
export function gateSlots(ac: Aircraft) {
  const range = ac.floor - ac.ceiling;
  return {
    ys: [0.15, 0.5, 0.85].map((f) => Math.round(ac.ceiling + range * f)),
    half: Math.floor(range * 0.35) / 2 - 1, // half the height of one ring opening
  };
}

export const LEGS: Leg[] = [
  // LEG 1: the Cessna, around Australia. Gentle: one thing at a time, nothing tricky.
  {
    aircraft: "cessna", from: "SYD", spacing: 600,
    stops: ["CBR", "MEL", "HBA", "ADL", "PER", "DRW", "CNS", "BNE"],
    obstacles: [
      { at: 300, type: "storm", y: 100 },
      { at: 440, type: "mountain", y: 38 },
      { at: 880, type: "birds", y: 110 },
      { at: 1030, type: "mountain", y: 50 },
      { at: 1470, type: "storm", y: 85 },
      { at: 1620, type: "birds", y: 120 },
      { at: 2060, type: "mountain", y: 60 },
      { at: 2200, type: "storm", y: 115 },
      { at: 2660, type: "storm", y: 80 },
      { at: 2780, type: "birds", y: 100 },
      { at: 2880, type: "mountain", y: 45 },
      { at: 3250, type: "mountain", y: 70 },
      { at: 3400, type: "storm", y: 90 },
      { at: 3860, type: "birds", y: 95 },
      { at: 3990, type: "storm", y: 120 },
      { at: 4450, type: "storm", y: 75 },
      { at: 4580, type: "mountain", y: 55 },
    ],
  },
  // LEG 2: the little jet, from Australia up through Asia. A bit busier, some in pairs.
  {
    aircraft: "jet", from: "BNE", spacing: 700,
    stops: ["AKL", "NAN", "NOU", "DPS", "SIN", "BKK", "HKG", "HND"],
    obstacles: [
      { at: 300, type: "storm", y: 60 },
      { at: 420, type: "birds", y: 110 },
      { at: 560, type: "mountain", y: 55 },
      { at: 960, type: "mountain", y: 70 },
      { at: 1010, type: "storm", y: 45 },
      { at: 1180, type: "birds", y: 90 },
      { at: 1300, type: "storm", y: 120 },
      { at: 1650, type: "birds", y: 70 },
      { at: 1780, type: "mountain", y: 80 },
      { at: 1900, type: "storm", y: 100 },
      { at: 2350, type: "storm", y: 55 },
      { at: 2400, type: "mountain", y: 75 },
      { at: 2560, type: "birds", y: 95 },
      { at: 2700, type: "storm", y: 125 },
      { at: 3050, type: "mountain", y: 60 },
      { at: 3200, type: "birds", y: 80 },
      { at: 3300, type: "storm", y: 105 },
      { at: 3750, type: "storm", y: 70 },
      { at: 3880, type: "birds", y: 120 },
      { at: 4000, type: "mountain", y: 90 },
      { at: 4450, type: "birds", y: 100 },
      { at: 4560, type: "storm", y: 130 },
      { at: 4700, type: "mountain", y: 65 },
      { at: 5150, type: "mountain", y: 75 },
      { at: 5270, type: "birds", y: 85 },
      { at: 5400, type: "storm", y: 110 },
    ],
  },
  // LEG 3: the jumbo, around the world. Biggest mountains and more storms, but wide gaps,
  // because the jumbo is slow to turn.
  {
    aircraft: "jumbo", from: "HND", spacing: 700,
    stops: ["LAX", "JFK", "LHR", "DXB", "JNB", "GRU", "SCL", "SYD"],
    obstacles: [
      { at: 300, type: "storm", y: 70 },
      { at: 440, type: "mountain", y: 70 },
      { at: 560, type: "birds", y: 100 },
      { at: 960, type: "storm", y: 100 },
      { at: 1080, type: "mountain", y: 90 },
      { at: 1200, type: "birds", y: 50 },
      { at: 1650, type: "mountain", y: 80 },
      { at: 1760, type: "storm", y: 45 },
      { at: 1880, type: "birds", y: 110 },
      { at: 2350, type: "storm", y: 110 },
      { at: 2450, type: "birds", y: 70 },
      { at: 2580, type: "mountain", y: 85 },
      { at: 3050, type: "birds", y: 90 },
      { at: 3160, type: "mountain", y: 95 },
      { at: 3260, type: "storm", y: 55 },
      { at: 3750, type: "mountain", y: 100 },
      { at: 3850, type: "storm", y: 50 },
      { at: 3980, type: "birds", y: 100 },
      { at: 4450, type: "storm", y: 80 },
      { at: 4560, type: "mountain", y: 90 },
      { at: 4680, type: "birds", y: 60 },
      { at: 5150, type: "mountain", y: 100 },
      { at: 5250, type: "storm", y: 45 },
      { at: 5380, type: "birds", y: 105 },
    ],
  },
];
