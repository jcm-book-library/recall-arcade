import {
  AIRCRAFT, LEGS, RECIPES, WORLD_H, FIRST_OBSTACLE, GATE_CLEAR_AFTER, GATE_CLEAR_BEFORE, GATE_RETRY, MIN_GROUP_GAP,
  checkpointAt, gateSlots, hitboxOf, legLength, pictureOf, OBSTACLE_INFO,
  type Aircraft, type Leg, type ObstacleSpec, type Rect, type RecipeItem, type Route, type Terrain,
} from "./flyover-data.ts";

// FLYOVER, THE COURSE MAKER. This file turns a leg's hand-written ROUTE into a playable
// COURSE: where the obstacles are, and what the land looks like at every point. It has no
// drawing. The game (flyover.ts) uses it to build each leg, and the check script
// (scripts/check-flyover.mjs) uses it to build thousands of courses and test them.
//
// (The imports end in ".ts" so that the check script can run this file straight from Node.)

// ---------- a seeded random number generator ----------
// Math.random() gives a different answer every time, so a play could never be repeated. A SEEDED
// generator is different: you give it a starting number (the SEED) and it produces a long
// list of random-looking numbers, but the SAME list every time for the same seed. So "seed 7"
// always gives the same route, the same obstacles, the same gate order. That means a bug can
// be reproduced, and the check script can test exactly what a player will meet.
// (This is a well-known tiny generator called mulberry32.)
export type Rng = () => number; // each call gives a number from 0 up to (but not including) 1

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix two numbers into a new seed, so one master seed can give every leg and gate its own. */
export const mixSeed = (a: number, b: number) =>
  (Math.imul(a ^ (a >>> 15) ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(b + 0x7f4a7c15, 0xc2b2ae35)) >>> 0;

const randInt = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);

function shuffled<T>(rng: Rng, list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- the terrain along a leg ----------
// Each hop is split in two halves: the first half has the hop's START terrain, the second
// half its END terrain (they are the same for most hops). Put all the halves end to end and
// you get a list of SEGMENTS, one stretch of land or sea after another.
export interface Segment { x0: number; x1: number; terrain: Terrain }

export function terrainSegments(leg: Leg, route: Route): Segment[] {
  const segs: Segment[] = [];
  route.hops.forEach((hop, i) => {
    const a = leg.spacing * i, m = a + leg.spacing / 2, b = a + leg.spacing;
    segs.push({ x0: a, x1: m, terrain: hop.start }, { x0: m, x1: b, terrain: hop.end });
  });
  // The first stretch reaches back past the start (the runway) and the last one on past the landing.
  segs[0].x0 = -Infinity;
  segs[segs.length - 1].x1 = Infinity;
  return segs;
}

/** The terrain right at distance `x`. */
export function terrainAt(segs: Segment[], x: number): Terrain {
  for (const s of segs) if (x < s.x1) return s.terrain;
  return segs[segs.length - 1].terrain;
}

/** How wide the BLEND between two kinds of terrain is, in pixels. Inside it the scenery changes over gradually. */
export const BLEND_WIDTH = 120;

/**
 * BLENDING SCENERY. Where one terrain gives way to another the picture should not jump. At
 * distance `d` this says: "you are mostly `a`, with `m` (0 to 1) of `b` mixed in." Far from any
 * change, a and b are the same and m is 0. The game paints `a`, then paints `b` over it
 * a little more solid as `m` grows, so the picture fades from one to the other instead of cutting.
 */
export function terrainBlend(segs: Segment[], d: number): { a: Terrain; b: Terrain; m: number } {
  for (let i = 1; i < segs.length; i++) {
    const edge = segs[i].x0;
    if (segs[i].terrain === segs[i - 1].terrain) continue;
    if (Math.abs(d - edge) < BLEND_WIDTH / 2) {
      const u = (d - (edge - BLEND_WIDTH / 2)) / BLEND_WIDTH;
      return { a: segs[i - 1].terrain, b: segs[i].terrain, m: u * u * (3 - 2 * u) };
    }
  }
  const t = terrainAt(segs, d);
  return { a: t, b: t, m: 0 };
}

// ---------- "is there a way through?" ----------
// To make sure a course can always be flown, we keep a list of every height the plane COULD be
// at, and walk along the leg in small steps. From one step to the next the plane can only move up or down as
// fast as the aircraft really climbs or sinks (we use 65% of the top rate, because the real
// plane needs time to build up speed). Any height that would touch an obstacle is struck out.
// If the list ever becomes empty, there is no way through.
export const STEP_X = 5;
const UP_FACTOR = 0.65;
const ROOM = 4; // leave this much room round the plane, so passing a gap is not a pixel-perfect job

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Before take-off: the plane could only be at its starting (middle) height. */
export function startReach(ac: Aircraft): Uint8Array {
  const state = new Uint8Array(ac.floor - ac.ceiling + 1);
  state[Math.round((ac.ceiling + ac.floor) / 2) - ac.ceiling] = 1;
  return state;
}

/**
 * Walk from `x0` to `x1`. `hits` are the obstacle hitboxes, `gates` the distances of gate groups
 * (at each one, all three rings must be reachable). Returns the new list of reachable heights,
 * or null if there is no way through.
 */
export function advanceReach(ac: Aircraft, from: Uint8Array, x0: number, x1: number, hits: Rect[], gates: number[]): Uint8Array | null {
  const lo = ac.ceiling;
  const cells = from.length;
  const upRate = (ac.maxUp * UP_FACTOR * STEP_X) / ac.speed;
  const downRate = (ac.maxDown * UP_FACTOR * STEP_X) / ac.speed;
  const near = hits.filter((r) => r.x < x1 + 40 && r.x + r.w > x0 - 40);
  const slots = gateSlots(ac).ys;
  let ok = from;
  for (let x = x0 + STEP_X; x <= x1; x += STEP_X) {
    // Spread: from every reachable height, the plane could now be anywhere in a range.
    const diff = new Int32Array(cells + 1);
    for (let c = 0; c < cells; c++) {
      if (!ok[c]) continue;
      diff[Math.max(0, Math.floor(c - upRate))]++;
      diff[Math.min(cells - 1, Math.ceil(c + downRate)) + 1]--;
    }
    const next = new Uint8Array(cells);
    let run = 0;
    for (let c = 0; c < cells; c++) { run += diff[c]; next[c] = run > 0 ? 1 : 0; }
    // Strike out the heights that would touch something.
    const px0 = x - ac.hitW / 2 - ROOM, pw = ac.hitW + ROOM * 2;
    for (const r of near) {
      if (!(r.x < px0 + pw && r.x + r.w > px0)) continue;
      const blockFrom = r.y - ac.hitH / 2 - ROOM, blockTo = r.y + r.h + ac.hitH / 2 + ROOM;
      for (let c = Math.max(0, Math.floor(blockFrom - lo) + 1); c < cells && lo + c < blockTo; c++) next[c] = 0;
    }
    ok = next;
    if (!ok.includes(1)) return null;
    if (gates.includes(x)) {
      for (const sy of slots) {
        const c = sy - lo;
        if (!ok.slice(Math.max(0, c - 2), c + 3).includes(1)) return null;
      }
    }
  }
  return ok;
}

// ---------- making a course ----------
export interface Course {
  legIndex: number;
  routeIndex: number;
  seed: number;
  route: Route;
  obstacles: ObstacleSpec[]; // sorted by `at`
  segments: Segment[];
  length: number;
  fallbacks: number; // how many hops had to be made emptier than wanted (should be 0 or very few)
}

/** The tallest ground obstacle an aircraft can still fly well over (leaving 30+ pixels of sky). */
const groundMax = (ac: Aircraft) => WORLD_H - (ac.ceiling + 36);

/**
 * GENERATING OBSTACLES FROM A RECIPE. For each hop, in order:
 *   1. Decide how many GROUPS to put in it (the leg's `perHop`), spread evenly with a little jiggle.
 *   2. For each group, look up the terrain at that spot, and pick an obstacle from that
 *      terrain's recipe (a weighted pick: weight 4 is twice as likely as weight 2).
 *   3. Sometimes (the leg's `pairChance`) add a second obstacle right beside it: a PAIR.
 *   4. TEST the hop with the "is there a way through?" walk above. If it fails, throw the
 *      hop away and roll again (up to 60 times; then fall back to fewer groups).
 * All the dice come from the seeded generator, so the same seed always gives the same course.
 */
export function buildCourse(legIndex: number, seed: number, routeIndex?: number): Course {
  const leg = LEGS[legIndex];
  const ac = AIRCRAFT[leg.aircraft];
  const rng = makeRng(mixSeed(seed, legIndex + 1));
  const ri = routeIndex ?? Math.floor(rng() * leg.routes.length);
  const route = leg.routes[ri];
  const segments = terrainSegments(leg, route);
  const stops = route.hops.length;

  const obstacles: ObstacleSpec[] = [];
  let reach = startReach(ac);
  let prevEnd = 0;
  let fallbacks = 0;

  const pick = (terrain: Terrain, want: "any" | "ground" | "floating"): RecipeItem => {
    let list = RECIPES[terrain];
    const filtered = list.filter((r) => want === "any" || OBSTACLE_INFO[r.type].ground === (want === "ground"));
    if (filtered.length) list = filtered;
    let roll = rng() * list.reduce((a, r) => a + r.weight, 0);
    for (const r of list) { roll -= r.weight; if (roll < 0) return r; }
    return list[list.length - 1];
  };

  const make = (at: number, want: "any" | "ground" | "floating"): ObstacleSpec => {
    const item = pick(terrainAt(segments, at), want);
    const spec: ObstacleSpec = { at: Math.round(at), type: item.type, y: 0 };
    if (OBSTACLE_INFO[item.type].ground) {
      spec.y = Math.round(between(rng, item.lo, Math.max(item.lo, Math.min(item.hi, groundMax(ac)))));
      if (item.type === "building") spec.w = 2 * Math.round(between(rng, item.wLo ?? 18, item.wHi ?? 30) / 2);
    } else {
      spec.y = Math.round(between(rng, Math.max(item.lo, ac.ceiling + 16), Math.min(item.hi, ac.floor - 4)));
    }
    return spec;
  };

  for (let hop = 0; hop < stops; hop++) {
    const cp = checkpointAt(leg, hop);
    // Where obstacle pictures may sit: after the clear space round the last gate, before the clear space round this one.
    const zs = hop === 0 ? FIRST_OBSTACLE : checkpointAt(leg, hop - 1) + GATE_CLEAR_AFTER;
    const ze = cp - GATE_CLEAR_BEFORE;
    const wanted = randInt(rng, leg.perHop[0], leg.perHop[1]);
    const evalEnd = cp + GATE_RETRY; // we test as far as the go-around gates
    const gates = [cp, cp + GATE_RETRY];

    const proposeHop = (n: number): ObstacleSpec[] | null => {
      const out: ObstacleSpec[] = [];
      if (n <= 0) return out;
      // Spread the groups along the zone, at least MIN_GROUP_GAP apart, with a little jiggle.
      const a = zs + 50, span = ze - 50 - a;
      const slack = span - (n - 1) * MIN_GROUP_GAP; // spare room once the minimum gaps are taken out
      if (slack < 0) return null;
      const xs: number[] = [];
      for (let k = 0; k < n; k++) xs.push(a + k * MIN_GROUP_GAP + (slack * (k + 0.5)) / n + between(rng, -1, 1) * (slack / n) * 0.45);
      for (const x of xs) {
        const first = make(x, "any");
        out.push(first);
        if (rng() < leg.pairChance) {
          // A pair: the second one is a different kind of thing (ground with floating, or two floating ones at different heights).
          const want = OBSTACLE_INFO[first.type].ground ? "floating" : rng() < 0.6 ? "ground" : "floating";
          const second = make(x + (rng() < 0.5 ? -1 : 1) * between(rng, 15, 40), want);
          out.push(second);
        }
      }
      return out;
    };

    let chosen: ObstacleSpec[] | null = null;
    let tries = 0;
    for (; tries < 90 && !chosen; tries++) {
      const n = tries < 60 ? wanted : Math.max(0, wanted - (tries < 75 ? 1 : 2));
      const cand = proposeHop(n);
      if (!cand) continue;
      const hits = cand.map(hitboxOf);
      const next = advanceReach(ac, reach, prevEnd, evalEnd, hits, gates);
      if (next && cand.every((o) => inside(o, zs, ze))) { chosen = cand; reach = next; }
    }
    if (!chosen) {
      // Cannot happen with sensible data, but never get stuck: an empty hop is always flyable.
      chosen = [];
      reach = advanceReach(ac, reach, prevEnd, evalEnd, [], gates) ?? reach;
    }
    if (tries > 60) fallbacks++;
    obstacles.push(...chosen);
    prevEnd = evalEnd;
  }

  obstacles.sort((p, q) => p.at - q.at);
  return { legIndex, routeIndex: ri, seed, route, obstacles, segments, length: legLength(leg, stops), fallbacks };
}

/** Does the obstacle's whole picture sit between `zs` and `ze` (and not at an impossible spot)? */
function inside(o: ObstacleSpec, zs: number, ze: number) {
  const p = pictureOf(o);
  return p.x >= zs && p.x + p.w <= ze;
}

// ---------- the wrong gates ----------
/**
 * The two WRONG codes for a gate. They come from the other routes of the same leg, so they are
 * airports the player has met on this leg. Rules:
 *   - never the right answer, and never an airport already flown through on this route;
 *   - the ones in the same REGION as the right answer come first (so the choice is believable:
 *     two European airports next to a European right answer);
 *   - airports that are on this route at all come last (they are only used if nothing else is left).
 * `stop` is the number of the stop (0 for the first one after take-off).
 */
export function pickDecoys(leg: Leg, route: Route, stop: number, rng: Rng, regionOf: (code: string) => string | undefined): [string, string] {
  const right = route.codes[stop + 1];
  const flown = new Set(route.codes.slice(0, stop + 1));
  const onRoute = new Set(route.codes);
  const pool = [...new Set(leg.routes.flatMap((r) => r.codes))].filter((c) => c !== right && !flown.has(c));
  const sameRegion = (c: string) => regionOf(c) === regionOf(right);
  const tier1 = shuffled(rng, pool.filter((c) => !onRoute.has(c) && sameRegion(c)));
  const tier2 = shuffled(rng, pool.filter((c) => !onRoute.has(c) && !sameRegion(c)));
  const tier3 = shuffled(rng, pool.filter((c) => onRoute.has(c)));
  const all = [...tier1, ...tier2, ...tier3];
  return [all[0], all[1]];
}
