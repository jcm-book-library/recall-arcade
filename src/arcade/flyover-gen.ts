import {
  AIRCRAFT, LEGS, RECIPES, WORLD_H, FIRST_OBSTACLE, GATE_CLEAR_AFTER, GATE_CLEAR_BEFORE, GATE_RETRY, MIN_GROUP_GAP, TAKEOFF_LEN,
  THUNDER_PERIOD, THUNDER_TERRAINS, THUNDER_Y, boltRect,
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
  const slots = gateSlots(ac).ys;
  // Only the obstacles that could matter between x0 and x1 (and, for each, its blocked range of cells, worked out once).
  const near = hits
    .filter((r) => r.x < x1 + 40 && r.x + r.w > x0 - 40)
    .map((r) => ({
      x0: r.x, x1: r.x + r.w,
      c0: Math.max(0, Math.floor(r.y - ac.hitH / 2 - ROOM - lo) + 1),
      c1: Math.min(cells, Math.ceil(r.y + r.h + ac.hitH / 2 + ROOM - lo)), // blocked cells are c0 up to (not including) c1
    }));
  // Two lists swapped each step, and one scratch list, so a long walk makes no garbage.
  let ok: Uint8Array<ArrayBuffer> = from as Uint8Array<ArrayBuffer>;
  let next = new Uint8Array(cells);
  const diff = new Int32Array(cells + 1);
  for (let x = x0 + STEP_X; x <= x1; x += STEP_X) {
    // Spread: from every reachable height, the plane could now be anywhere in a range.
    diff.fill(0);
    for (let c = 0; c < cells; c++) {
      if (!ok[c]) continue;
      diff[Math.max(0, Math.floor(c - upRate))]++;
      diff[Math.min(cells - 1, Math.ceil(c + downRate)) + 1]--;
    }
    let run = 0, any = false;
    for (let c = 0; c < cells; c++) { run += diff[c]; next[c] = run > 0 ? 1 : 0; }
    // Strike out the heights that would touch something.
    const px0 = x - ac.hitW / 2 - ROOM, px1 = px0 + ac.hitW + ROOM * 2;
    for (const r of near) {
      if (!(r.x0 < px1 && r.x1 > px0)) continue;
      for (let c = r.c0; c < r.c1; c++) next[c] = 0;
    }
    for (let c = 0; c < cells; c++) if (next[c]) { any = true; break; }
    if (!any) return null;
    const t = ok === from ? new Uint8Array(cells) : ok; // (never write into the list we were given)
    ok = next;
    next = t;
    if (gates.includes(x)) {
      for (const sy of slots) {
        const c = sy - lo;
        let seen = false;
        for (let k = Math.max(0, c - 2); k < Math.min(cells, c + 3); k++) if (ok[k]) { seen = true; break; }
        if (!seen) return null;
      }
    }
  }
  return ok === from ? from : ok.slice(); // hand back a list of its own
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
 *   1. Decide how many GROUPS to put in it (the leg's `perHop`) and how many THUNDERCLOUDS (leg 3),
 *      and spread those "slots" evenly along the hop with a little jiggle.
 *   2. Fill the slots one at a time, left to right. For a group, look up the terrain at that spot
 *      and pick an obstacle from that terrain's recipe (a weighted pick: weight 4 is twice as
 *      likely as weight 2). Sometimes (the leg's `pairChance`) add a second obstacle right beside
 *      it: a PAIR. A thundercloud is always on its own.
 *   3. TEST each new slot straight away with the "is there a way through?" walk above. If it
 *      fails, roll that slot again (up to 24 times, then leave it empty). Testing one slot at a
 *      time, not the whole hop at once, is what lets a long, busy hop be built at all.
 *   4. A thundercloud has an EXTRA test: the walk is done twice more, once as if its bolt were
 *      striking UP and once as if it were striking DOWN. There must be a way through both times, so
 *      one of "over" and "under" is always open (see the thunderclouds section in flyover-data.ts).
 *   5. At the end of the hop, test the run-in to the gates; if that fails, take the last slot away and test again.
 * The walk is also done for a plane that restarts at the middle height after the previous checkpoint
 * (that is where a diversion puts you), so a diversion never drops you into something unfair.
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
    at = Math.round(at); // (round FIRST: the terrain must be looked up at the very spot the obstacle will stand)
    const item = pick(terrainAt(segments, at), want);
    const spec: ObstacleSpec = { at, type: item.type, y: 0 };
    if (OBSTACLE_INFO[item.type].ground) {
      spec.y = Math.round(between(rng, item.lo, Math.max(item.lo, Math.min(item.hi, groundMax(ac)))));
      if (item.type === "building") spec.w = 2 * Math.round(between(rng, item.wLo ?? 18, item.wHi ?? 30) / 2);
    } else {
      spec.y = Math.round(between(rng, Math.max(item.lo, ac.ceiling + 16), Math.min(item.hi, ac.floor - 4)));
    }
    return spec;
  };

  /** A thundercloud: always in the middle band of the sky, with its own cycle length and starting point. */
  const makeThunder = (at: number): ObstacleSpec => {
    const period = Math.round(between(rng, THUNDER_PERIOD[0], THUNDER_PERIOD[1]) * 10) / 10;
    return {
      at: Math.round(at), type: "thunder", y: Math.round(between(rng, THUNDER_Y[0], THUNDER_Y[1])),
      period, phase: Math.floor(rng() * period * 10) / 10, seed: Math.floor(rng() * 2 ** 31),
    };
  };

  /** Where a walk has got to: the heights the plane could be at, at distance `cx`; and the same for a plane that restarted at the middle height. */
  interface Walk { cx: number; reach: Uint8Array; restart: Uint8Array | null }
  const onGrid = (v: number) => Math.floor(v / STEP_X) * STEP_X;
  /** Carry both walks on to `to`. Null if either has no way through. */
  const carry = (w: Walk, to: number, hits: Rect[], gates: number[]): Walk | null => {
    const r = advanceReach(ac, w.reach, w.cx, to, hits, gates);
    if (!r) return null;
    let re: Uint8Array | null = null;
    if (w.restart) { re = advanceReach(ac, w.restart, w.cx, to, hits, gates); if (!re) return null; }
    return { cx: to, reach: r, restart: re };
  };

  for (let hop = 0; hop < stops; hop++) {
    const cp = checkpointAt(leg, hop);
    // Where obstacle pictures may sit: after the clear space round the last gate, before the clear space round this one.
    const zs = hop === 0 ? FIRST_OBSTACLE : checkpointAt(leg, hop - 1) + GATE_CLEAR_AFTER;
    const ze = cp - GATE_CLEAR_BEFORE;
    const evalEnd = cp + GATE_RETRY; // we test as far as the go-around gates
    const gates = [cp, cp + GATE_RETRY];

    // The walk for this hop starts where the plane is back in control after the last checkpoint:
    // either carried on from the last hop, or (the restart) sitting at the middle height after a take-off.
    let start: Walk;
    if (hop === 0) start = { cx: 0, reach, restart: null };
    else {
      const from = checkpointAt(leg, hop - 1) + TAKEOFF_LEN;
      const carried = advanceReach(ac, reach, prevEnd, from, [], []) ?? reach;
      start = { cx: from, reach: carried, restart: startReach(ac) };
    }

    // The slots: evenly spread, at least MIN_GROUP_GAP apart, with a little jiggle.
    const wantedThunder = leg.thunder[1] > 0 ? randInt(rng, leg.thunder[0], leg.thunder[1]) : 0;
    let slotCount = randInt(rng, leg.perHop[0], leg.perHop[1]) + wantedThunder;
    const a = zs + 50, span = ze - 50 - a;
    while (slotCount > 0 && span - (slotCount - 1) * MIN_GROUP_GAP < 0) slotCount--;
    const slack = span - (slotCount - 1) * MIN_GROUP_GAP;
    const xs: number[] = [];
    for (let k = 0; k < slotCount; k++) xs.push(a + k * MIN_GROUP_GAP + (slack * (k + 0.5)) / slotCount + between(rng, -1, 1) * (slack / slotCount) * 0.45);
    // Which slots are thunderclouds? Picked at random, but not two in a row if it can be helped.
    const isThunder: boolean[] = xs.map(() => false);
    let placedClouds = 0;
    for (const k of shuffled(rng, xs.map((_, i) => i))) {
      if (placedClouds >= Math.min(wantedThunder, slotCount)) break;
      if (isThunder[k - 1] || isThunder[k + 1]) continue;
      isThunder[k] = true; placedClouds++;
    }

    // ---- fill the slots, one at a time ----
    let w = start;
    const placed: ObstacleSpec[] = []; // everything chosen so far in this hop
    // Each step remembers where the walk was before it, so the last one can be taken back.
    const undo: { w: Walk; count: number; clouds: number }[] = [];
    const clouds: { spec: ObstacleSpec; before: Walk }[] = []; // thunderclouds placed in this hop, with the walk just before each

    for (let k = 0; k < xs.length; k++) {
      let done = false;
      for (let tries = 0; tries < 24 && !done; tries++) {
        let cand: ObstacleSpec[];
        if (isThunder[k] && THUNDER_TERRAINS.includes(terrainAt(segments, Math.round(xs[k])))) {
          cand = [makeThunder(xs[k])];
        } else {
          cand = [make(xs[k], "any")];
          if (rng() < leg.pairChance) {
            // A pair: the second one is a different kind of thing (ground with floating, or two floating ones at different heights).
            const want = OBSTACLE_INFO[cand[0].type].ground ? "floating" : rng() < 0.6 ? "ground" : "floating";
            cand.push(make(xs[k] + (rng() < 0.5 ? -1 : 1) * between(rng, 15, 40), want));
          }
        }
        if (!cand.every((o) => inside(o, zs, ze))) continue;
        const left = Math.min(...cand.map((o) => pictureOf(o).x)), right = Math.max(...cand.map((o) => { const p = pictureOf(o); return p.x + p.w; }));
        if (left - 25 < w.cx) continue; // it would reach back into ground the walk has already covered
        const hits = placed.map(hitboxOf).concat(cand.map(hitboxOf));
        const look = Math.min(onGrid(right + 100), evalEnd);
        if (!carry(w, look, hits, [])) continue;
        // The lightning test: for this cloud, and any cloud just before it, the way must stay open with the bolt up AND with it down.
        const newCloud = cand[0].type === "thunder" ? cand[0] : null;
        const watch = clouds.filter((c) => c.spec.at > left - 320).map((c) => ({ spec: c.spec, from: c.before }));
        if (newCloud) watch.push({ spec: newCloud, from: w });
        let ok = true;
        for (const c of watch) for (const side of ["up", "down"] as const) {
          if (ok && !carry(c.from, look, hits.concat(boltRect(c.spec, side)), [])) ok = false;
        }
        if (!ok) continue;
        // Accepted. Carry the walk up to just before the new slot, and remember the step.
        const next = carry(w, Math.max(w.cx, onGrid(left - 25)), hits, []);
        if (!next) continue;
        undo.push({ w, count: placed.length, clouds: clouds.length });
        if (newCloud) clouds.push({ spec: newCloud, before: next });
        placed.push(...cand);
        w = next;
        done = true;
      }
      if (!done) fallbacks++;
    }

    // ---- the run-in to the gates ----
    // Everything placed must still leave all three rings of both gates reachable. If not, take the last slot back.
    const finish = (): Walk | null => {
      const hits = placed.map(hitboxOf);
      const end = carry(w, evalEnd, hits, gates);
      if (!end) return null;
      for (const c of clouds) {
        if (c.spec.at < cp - 700) continue; // too far from the gates to matter (the slot tests already covered it)
        for (const side of ["up", "down"] as const) if (!carry(c.before, evalEnd, hits.concat(boltRect(c.spec, side)), gates)) return null;
      }
      return end;
    };
    let end = finish();
    while (!end && undo.length) {
      const last = undo.pop()!;
      placed.length = last.count;
      clouds.length = last.clouds;
      w = last.w;
      fallbacks++;
      end = finish();
    }
    if (!end) end = carry(start, evalEnd, [], gates) ?? { cx: evalEnd, reach, restart: null }; // cannot happen: an empty hop is always flyable
    reach = end.reach;
    prevEnd = evalEnd;
    obstacles.push(...placed);
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
