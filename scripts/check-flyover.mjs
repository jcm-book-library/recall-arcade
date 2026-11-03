// Checks the Flyover routes and the courses made from them are sensible and fair. Run it with:
//   node scripts/check-flyover.mjs
//   node scripts/check-flyover.mjs 500      (to try 500 seeds per route instead of 100)
// It also checks the LEG TIMES (leg 2 about twice leg 1, leg 3 about twice leg 2), the THUNDERCLOUDS (their
// timer, and that "over" or "under" is always open), the MOVING HAZARDS of leg 3 (the news helicopter over a city and
// the dust devil over a desert: a way through must exist whatever moment the plane arrives, and the heat thermals
// must be gentle and clear of everything), and runs a FUEL SIMULATION (see the end of the file):
// pretend pilots who climb a set share of the time fly every route, and it reports how much fuel is left
// at the end of each stretch.
// It reads src/arcade/flyover-data.ts and flyover-gen.ts directly (Node 22 can run TypeScript files
// that have no fancy syntax). Every route of every leg is built with many different seeds, exactly
// as the game builds it, and each one is checked. It prints every problem it finds. Exit code 1
// means something needs fixing.
import {
  AIRCRAFT, LEGS, RECIPES, TERRAINS, WORLD_H, FIRST_OBSTACLE, GATE_CLEAR_BEFORE, GATE_CLEAR_AFTER, GATE_RETRY,
  checkpointAt, legLength, gateSlots, hitboxOf, pictureOf, OBSTACLE_INFO,
  FULL_TANK, TAKEOFF_LEN, LAND_AFTER_GATE, ROLL_OUT, stopKind,
  THUNDER_WARN, THUNDER_BOLT, THUNDER_PERIOD, THUNDER_Y, THUNDER_TERRAINS, thunderAt, boltRect,
  isMover, isStill, moverBox, moverShifts, heliY, devilHeight, devilX, SPECIAL_TERRAIN, THERMAL_TERRAINS,
  HELI_Y, HELI_AMP, HELI_PERIOD, HELI_HIT_UP, HELI_HIT_H, DEVIL_Y, DEVIL_AMP, DEVIL_PERIOD, DEVIL_DRIFT, DEVIL_SPEED,
  THERMAL_W, THERMAL_TOP, THERMAL_LIFT, THERMAL_CLEAR,
} from "../src/arcade/flyover-data.ts";
import { buildCourse, makeRng, pickDecoys, terrainAt } from "../src/arcade/flyover-gen.ts";
import { AIRPORT_TABLE } from "../src/decks/airports-data.ts";

const SEEDS = Number(process.argv[2]) || 100;
const problems = new Set(); // a Set, so the same complaint found with 200 seeds is only printed once
const bad = (msg) => problems.add(msg);

const rows = AIRPORT_TABLE.trim().split("\n").map((l) => l.split("|"));
const codes = new Set(rows.map((r) => r[0]));
const regions = new Map(rows.map((r) => [r[0], r[4]]));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

if (LEGS.length !== 3) bad(`expected 3 legs, found ${LEGS.length}`);
for (const t of TERRAINS) if (!RECIPES[t]?.length) bad(`terrain ${t} has no obstacle recipe`);

// ---------- the "is there a way through?" walk, written out here on purpose ----------
// (The generator has its own copy in flyover-gen.ts. Writing it again here means a slip in one
// does not hide a slip in the other.) A list of every height the plane could be at; at each 5 pixel
// step it spreads by what the aircraft can really climb or sink (65% of the top rate), and every
// height that would touch something is struck out. Returns the new list, or null if it is empty.
const STEP = 5;
function walker(ac) {
  const lo = ac.ceiling, hi = ac.floor, cells = hi - lo + 1;
  const upRate = (ac.maxUp * 0.65 * STEP) / ac.speed;
  const downRate = (ac.maxDown * 0.65 * STEP) / ac.speed;
  const slots = gateSlots(ac).ys;
  const mid = () => { const a = new Uint8Array(cells); a[Math.round((lo + hi) / 2) - lo] = 1; return a; };
  /** Walk from x0 to x1. `gateAt` is a Set of gate distances. `snaps` (optional) gets the list at every step. `movers` (optional) are moving hazards: { x0, x1, at(planeX) } whose box is worked out at every step. Returns { ok, x } where x is where it failed. */
  function walk(from, x0, x1, hits, gateAt, snaps, movers = []) {
    let ok = from;
    const near = hits.filter((r) => r.x < x1 + 60 && r.x + r.w > x0 - 60);
    const nearMovers = movers.filter((m) => m.x0 < x1 + 60 && m.x1 > x0 - 60);
    for (let x = x0 + STEP; x <= x1; x += STEP) {
      const next = new Uint8Array(cells);
      for (let c = 0; c < cells; c++) {
        if (!ok[c]) continue;
        const a = Math.max(0, Math.floor(c - upRate)), b = Math.min(cells - 1, Math.ceil(c + downRate));
        for (let d = a; d <= b; d++) next[d] = 1;
      }
      // Leave a little room (4 px) round the plane so passing a gap is not a pixel-perfect job.
      // (Only things level with the plane's x can touch it, so look at those first.)
      const level = near.filter((r) => r.x < x + ac.hitW / 2 + 4 && r.x + r.w > x - ac.hitW / 2 - 4);
      for (const m of nearMovers) { const r = m.at(x); if (r.x < x + ac.hitW / 2 + 4 && r.x + r.w > x - ac.hitW / 2 - 4) level.push(r); }
      if (level.length) {
        for (let c = 0; c < cells; c++) {
          if (!next[c]) continue;
          const y = lo + c;
          const roomy = { x: x - ac.hitW / 2 - 4, y: y - ac.hitH / 2 - 4, w: ac.hitW + 8, h: ac.hitH + 8 };
          if (level.some((r) => overlaps(roomy, r))) next[c] = 0;
        }
      }
      ok = next;
      if (snaps) snaps.set(x, ok);
      if (!ok.includes(1)) return { ok: null, x };
      if (gateAt.has(x)) {
        for (const sy of slots) {
          if (!ok.slice(Math.max(0, sy - lo - 2), sy - lo + 3).includes(1)) return { ok: null, x, ring: sy };
        }
      }
    }
    return { ok, x: x1 };
  }
  return { walk, mid };
}

/** A moving hazard for the walk, when the plane arrives at the point of its swing given by `shift` (the same idea as the course maker's, written again here on purpose). */
function moverFor(o, shift, ac) {
  const sweep = pictureOf(o);
  return { x0: sweep.x, x1: sweep.x + sweep.w, at: (px) => moverBox(o, px, shift + (px - o.at) / ac.speed) };
}

/** The seconds from take-off to the end of the landing at the end of a leg, for a leg with `hops` hops, flown at normal speed with no go-arounds. Uses the same numbers as the game's take-off and landing. */
function legSeconds(leg, hops) {
  const ac = AIRCRAFT[leg.aircraft], dt = 1 / 120;
  let v = 0, d = 0, t = 0;
  while (d < TAKEOFF_LEN) { v = Math.min(ac.speed, v + 60 * dt); d += v * dt; t += dt; } // take-off: the engines build the speed up at 60 px/s each second
  const last = checkpointAt(leg, hops - 1);
  t += (last - d) / ac.speed; // level flight at top speed to the last gate
  d = last; v = ac.speed;
  const touch = last + LAND_AFTER_GATE;
  while (d < touch) { v += Math.max(-45 * dt, Math.min(45 * dt, ac.speed * 0.85 - v)); d += v * dt; t += dt; } // the approach: slows to 85%
  const v0 = v;
  for (let q = 0; q < 1; q = (d - touch) / ROLL_OUT) { v = Math.max(5, v0 * Math.sqrt(1 - q)); d += v * dt; t += dt; } // the roll-out
  return t + 0.9; // the pause on the runway before "leg complete" (REST_TIME in flyover.ts)
}
const legAverage = (leg) => leg.routes.reduce((a, r) => a + legSeconds(leg, r.hops.length), 0) / leg.routes.length;

let courses = 0, obstacleTotal = 0, fallbackHops = 0;
let groupTotal = 0, hopTotal = 0, cloudTotal = 0, specialTotal = 0, thermalTotal = 0, specialHops = 0, landHops = 0; // reset for each leg below
const busy = []; // per leg: how busy the sky is
const typeCounts = {};

LEGS.forEach((leg, li) => {
  const L = `Leg ${li + 1}`;
  const ac = AIRCRAFT[leg.aircraft];
  if (!ac) return bad(`${L}: unknown aircraft "${leg.aircraft}"`);
  if (leg.routes.length < 3) bad(`${L}: only ${leg.routes.length} routes`);

  // ---- the routes themselves ----
  leg.routes.forEach((r, ri) => {
    const R = `${L} route ${ri + 1} (${r.codes.join(" ")})`;
    if (r.hops.length !== r.codes.length - 1) bad(`${R}: has ${r.codes.length} airports but ${r.hops.length} terrains (needs one terrain per hop)`);
    if (new Set(r.codes).size !== r.codes.length) bad(`${R}: an airport is listed twice`);
    for (const c of r.codes) if (!codes.has(c)) bad(`${R}: airport code ${c} is not in airports-data`);
    for (const hop of r.hops) for (const t of [hop.start, hop.end]) if (!TERRAINS.includes(t)) bad(`${R}: unknown terrain "${t}"`);
    // Stopovers: only on the legs with fuel (2 and 3), only middle stops, never the first or last airport.
    // Every other middle stop is a transit. Leg 1 has no stopovers (its stops are just stops).
    for (const so of r.stopovers) {
      if (!leg.fuel) bad(`${R}: stopovers only make sense on a leg with fuel`);
      const k = r.codes.indexOf(so);
      if (k < 1 || k > r.codes.length - 2) bad(`${R}: stopover ${so} must be a middle stop`);
    }
    if (leg.fuel && r.stopovers.length < 1) bad(`${R}: a leg with fuel needs at least one stopover`);
    // The owner's list of stopovers (3 Nov 2026). Leg 3 keeps AUH+DFW, YYZ+DOH, JNB+GRU.
    const OWNER = {
      "MEL CNS MNL HND PEK UBN": "MNL PEK", "PER MRU CPT WDH LOS": "CPT", "SYD BWN DXB LHR BTS": "DXB", "BNE AKL SCL GIG SJO": "SCL",
      "MEL HKT AUH FCO DFW AKL BNE": "AUH DFW", "SYD LAX YYZ HEL DOH CAN ADL": "YYZ DOH", "PER JNB CAI CDG GRU SCL MEL": "JNB GRU",
    };
    const wantList = OWNER[r.codes.join(" ")];
    if (li > 0 && wantList !== r.stopovers.join(" ")) bad(`${R}: stopovers are [${r.stopovers.join(" ")}] but the owner's list says [${wantList}]`);
    // Every airport used on this leg should not be reused from another leg's start... (no rule), but decoys must exist for every stop.
    for (let stop = 0; stop < r.hops.length; stop++) {
      for (let s = 1; s <= 20; s++) {
        const [d1, d2] = pickDecoys(leg, r, stop, makeRng(s * 977 + stop), (c) => regions.get(c));
        const right = r.codes[stop + 1];
        const flown = r.codes.slice(0, stop + 1);
        if (!d1 || !d2) { bad(`${R}: stop ${stop + 1} could not find two wrong gate codes`); break; }
        if (d1 === d2) bad(`${R}: stop ${stop + 1}: both wrong gates are ${d1}`);
        for (const d of [d1, d2]) {
          if (!codes.has(d)) bad(`${R}: stop ${stop + 1}: wrong gate ${d} is not in airports-data`);
          if (d === right) bad(`${R}: stop ${stop + 1}: a wrong gate is the right answer`);
          if (flown.includes(d)) bad(`${R}: stop ${stop + 1}: wrong gate ${d} was already flown through`);
        }
      }
    }
  });

  // ---- many courses ----
  groupTotal = hopTotal = cloudTotal = specialTotal = thermalTotal = specialHops = landHops = 0;
  for (let ri = 0; ri < leg.routes.length; ri++) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const course = buildCourse(li, seed, ri);
      courses++;
      checkCourse(li, leg, ac, course, `${L} route ${ri + 1} seed ${seed}`);
    }
  }
  // How busy is the sky? Groups of obstacles per hop and per second of flying at normal speed, and thunderclouds per hop.
  const hopSeconds = leg.spacing / ac.speed;
  const perHopAvg = groupTotal / hopTotal;
  busy[li] = { groups: perHopAvg, perSecond: perHopAvg / hopSeconds, clouds: cloudTotal / hopTotal, specials: specialTotal / hopTotal, thermals: thermalTotal / hopTotal, hopSeconds, specialHops, landHops };
  const wantedAvg = ((leg.perHop[0] + leg.perHop[1]) / 2) * (1 + leg.pairChance); // (a pair is two obstacles)
  if (perHopAvg < wantedAvg * 0.9) bad(`${L}: only ${perHopAvg.toFixed(1)} obstacles per hop were made (wanted about ${wantedAvg.toFixed(1)}): the sky came out emptier than planned`);
  if (leg.thunder[1] > 0) {
    const wantedClouds = (leg.thunder[0] + leg.thunder[1]) / 2;
    if (cloudTotal / hopTotal < wantedClouds * 0.8) bad(`${L}: only ${(cloudTotal / hopTotal).toFixed(1)} thunderclouds per hop (wanted about ${wantedClouds})`);
  }
  if (leg.special[1] > 0) {
    // Every hop that has a city or a desert should usually get its moving hazards ("a couple per hop").
    if (landHops === 0) bad(`${L}: no hop has a city or a desert, so the moving hazards would never appear`);
    else if (specialHops / landHops < 0.9) bad(`${L}: only ${specialHops} of ${landHops} city or desert hops got a moving hazard`);
  }
  // And the free choice of route, as the game really does it, must reach every route.
  const picked = new Set();
  for (let seed = 1; seed <= 60; seed++) picked.add(buildCourse(li, seed).routeIndex);
  if (picked.size !== leg.routes.length) bad(`${L}: the random route choice only reached ${picked.size} of ${leg.routes.length} routes in 60 tries`);
  // The same seed must give the same course.
  const a = JSON.stringify(buildCourse(li, 12345).obstacles), b = JSON.stringify(buildCourse(li, 12345).obstacles);
  if (a !== b) bad(`${L}: the same seed gave two different courses`);
});

function checkCourse(li, leg, ac, course, name) {
  const stops = course.route.hops.length;
  const end = legLength(leg, stops);
  obstacleTotal += course.obstacles.length;
  fallbackHops += course.fallbacks;
  if (course.length !== end) bad(`${name}: course length is wrong`);
  // Gate keep-clear zones.
  const zones = course.route.hops.map((_, i) => {
    const cp = checkpointAt(leg, i);
    return { x: cp - GATE_CLEAR_BEFORE, w: GATE_CLEAR_BEFORE + GATE_CLEAR_AFTER, y: -1000, h: 3000 };
  });
  const hits = course.obstacles.filter(isStill).map(hitboxOf); // (the still boxes only: moving hazards and thermals are tested separately below)
  let lastAt = -Infinity;
  const perHop = new Array(stops).fill(0);
  const cloudsPerHop = new Array(stops).fill(0);
  const specialsPerHop = new Array(stops).fill(0);
  const thermalsPerHop = new Array(stops).fill(0);
  course.obstacles.forEach((o, i) => {
    const what = `${name}: ${o.type} at ${o.at}`;
    typeCounts[o.type] = (typeCounts[o.type] ?? 0) + 1;
    if (o.at < lastAt) bad(`${what}: list is not sorted by distance`);
    lastAt = o.at;
    if (!OBSTACLE_INFO[o.type]) return bad(`${what}: unknown type`);
    if (o.at < FIRST_OBSTACLE) bad(`${what}: in the take-off stretch`);
    if (o.at > checkpointAt(leg, stops - 1) - GATE_CLEAR_BEFORE) bad(`${what}: sits where the landing begins`);
    const pic = pictureOf(o);
    if (pic.x < FIRST_OBSTACLE) bad(`${what}: picture reaches into the take-off stretch`);
    if (zones.some((z) => overlaps(pic, z))) bad(`${what}: sits in the clear space around a checkpoint gate`);
    // It must belong to the terrain below it.
    const terrain = terrainAt(course.segments, o.at);
    if (o.type === "thunder") {
      if (!leg.thunder[1]) bad(`${what}: thunderclouds only belong on a leg that asks for them`);
      if (!THUNDER_TERRAINS.includes(terrain)) bad(`${what}: a thundercloud does not belong over ${terrain}`);
    } else if (o.type === "heli" || o.type === "devil") {
      if (!leg.special[1]) bad(`${what}: moving hazards only belong on a leg that asks for them`);
      if (SPECIAL_TERRAIN[terrain] !== o.type) bad(`${what}: a ${o.type} does not belong over ${terrain}`);
    } else if (o.type === "thermal") {
      if (!leg.thermal[1]) bad(`${what}: thermals only belong on a leg that asks for them`);
      if (!THERMAL_TERRAINS.includes(terrain)) bad(`${what}: a thermal does not belong over ${terrain}`);
    } else if (!RECIPES[terrain].some((r) => r.type === o.type)) bad(`${what}: a ${o.type} does not belong over ${terrain}`);
    if (OBSTACLE_INFO[o.type].ground) {
      if (o.y < 10 || o.y > WORLD_H - ac.ceiling - 30) bad(`${what}: height ${o.y} is out of range for ${leg.aircraft}`);
    } else if (o.y < ac.ceiling + 10 || o.y > ac.floor) bad(`${what}: height ${o.y} is off the flying space`);
    // No single obstacle may block the whole flying space. (Moving hazards are judged by their own walks below.)
    if (isStill(o)) {
      const hb = hitboxOf(o);
      const free = (ac.floor - ac.ceiling) - (Math.min(ac.floor, hb.y + hb.h + ac.hitH / 2) - Math.max(ac.ceiling, hb.y - ac.hitH / 2));
      if (free < 30) bad(`${what}: leaves only ${Math.round(free)} px to fly through`);
    }
    const hop = Math.min(stops - 1, Math.floor(o.at / leg.spacing));
    if (o.type === "thunder") cloudsPerHop[hop]++;
    else if (isMover(o)) specialsPerHop[hop]++;
    else if (o.type === "thermal") thermalsPerHop[hop]++;
    else perHop[hop]++;
  });
  perHop.forEach((n, i) => { if (n === 0 && leg.perHop[0] > 0 && course.fallbacks === 0) bad(`${name}: hop ${i + 1} has no obstacles`); });
  groupTotal += perHop.reduce((a, b) => a + b, 0) + specialsPerHop.reduce((a, b) => a + b, 0); // (a moving hazard counts as a group)
  hopTotal += stops;
  cloudTotal += cloudsPerHop.reduce((a, b) => a + b, 0);
  specialTotal += specialsPerHop.reduce((a, b) => a + b, 0);
  thermalTotal += thermalsPerHop.reduce((a, b) => a + b, 0);
  if (leg.thunder[1] === 0 && cloudsPerHop.some((n) => n)) bad(`${name}: thunderclouds on a leg without them`);
  if (leg.special[1] === 0 && specialsPerHop.some((n) => n)) bad(`${name}: moving hazards on a leg without them`);
  if (leg.thermal[1] === 0 && thermalsPerHop.some((n) => n)) bad(`${name}: thermals on a leg without them`);
  // Which hops had city or desert land (so they should have a moving hazard)?
  course.route.hops.forEach((hp, i) => {
    if ([hp.start, hp.end].some((t) => SPECIAL_TERRAIN[t])) { landHops++; if (specialsPerHop[i] > 0) specialHops++; }
  });

  // ---- is there always a way through? ----
  // Walk the whole leg from the take-off. Gates: at every checkpoint, and again 150 px on for the go-around.
  const W = walker(ac);
  const gateAt = new Set();
  for (let i = 0; i < stops; i++) { gateAt.add(checkpointAt(leg, i)); gateAt.add(checkpointAt(leg, i) + GATE_RETRY); }
  const snaps = new Map();
  const base = W.walk(W.mid(), 0, end, hits, gateAt, snaps);
  if (!base.ok) return bad(`${name}: ${base.ring ? `gate ring at height ${base.ring} is out of reach` : "no way through"} at distance ${base.x}`);

  // ---- a diversion puts the plane on the runway at the last checkpoint and it takes off again ----
  // From the middle height at the end of that take-off there must be a way through to the next gates.
  for (let i = 1; i < stops; i++) {
    const from = checkpointAt(leg, i - 1) + TAKEOFF_LEN;
    const r = W.walk(W.mid(), from, checkpointAt(leg, i) + GATE_RETRY, hits, gateAt);
    if (!r.ok) bad(`${name}: after a diversion to stop ${i}, ${r.ring ? `gate ring ${r.ring} is out of reach` : "no way through"} at distance ${r.x}`);
  }

  // ---- thunderclouds: "over" or "under" is ALWAYS open ----
  // The bolt only goes one way at a time, so for each cloud we walk twice more: once with the bolt
  // striking UP (so you must go under) and once DOWN (so you must go over). Both must have a way through.
  // First the lanes themselves: there must be room for the plane above AND below the cloud.
  for (const o of course.obstacles) {
    if (o.type !== "thunder") continue;
    const what = `${name}: thundercloud at ${o.at}`;
    const body = hitboxOf(o);
    const overRoom = body.y - ac.hitH / 2 - 4 - ac.ceiling; // how far the plane's middle can move in the space above
    const underRoom = ac.floor - (body.y + body.h + ac.hitH / 2 + 4);
    if (overRoom < 6) bad(`${what}: only ${overRoom.toFixed(0)} px of room to pass OVER it`);
    if (underRoom < 6) bad(`${what}: only ${underRoom.toFixed(0)} px of room to pass UNDER it`);
    if (o.y < THUNDER_Y[0] || o.y > THUNDER_Y[1]) bad(`${what}: height ${o.y} is outside the middle band`);
    if (!(o.period >= THUNDER_PERIOD[0] && o.period <= THUNDER_PERIOD[1])) bad(`${what}: cycle ${o.period} s is out of range`);
    if (!(o.phase >= 0 && o.phase < o.period) || !Number.isInteger(o.seed)) bad(`${what}: bad phase or seed`);
    const x0 = Math.max(0, Math.floor((pictureOf(o).x - 80) / STEP) * STEP);
    const x1 = Math.min(end, Math.ceil((o.at + 300) / STEP) * STEP);
    const start = snaps.get(x0) ?? W.mid();
    for (const side of ["up", "down"]) {
      const r = W.walk(start, x0, x1, hits.concat(boltRect(o, side)), gateAt);
      if (!r.ok) bad(`${what}: no way through when the bolt strikes ${side} (distance ${r.x})`);
    }
  }

  // ---- moving hazards: a way through at EVERY moment the plane might arrive ----
  // The helicopter and the dust devil move with the game clock, so we cannot know when the plane will reach them. So we
  // fly the plane past each one 24 times, each time arriving at a different point of its swing (the highest, the lowest and
  // all the points between, as in the thundercloud test), and every one of those flights must have a way through.
  // First the plain room: a lane over it when it is at its lowest/tallest, and one under it when it is at its highest.
  const thermals = course.obstacles.filter((o) => o.type === "thermal");
  for (const o of course.obstacles) {
    if (!isMover(o)) continue;
    const what = `${name}: ${o.type} at ${o.at}`;
    const x0 = Math.max(0, Math.floor((pictureOf(o).x - 80) / STEP) * STEP);
    const x1 = Math.min(end, Math.ceil((pictureOf(o).x + pictureOf(o).w + 300) / STEP) * STEP);
    const start = snaps.get(x0) ?? W.mid();
    const shifts = moverShifts(o, 24);
    let lowest = Infinity, highest = -Infinity; // the box edges over a whole swing
    for (const shift of shifts) {
      const box = moverBox(o, o.at, shift + 0);
      lowest = Math.min(lowest, box.y); highest = Math.max(highest, box.y + box.h);
      const r = W.walk(start, x0, x1, hits, gateAt, null, [moverFor(o, shift, ac)]);
      if (!r.ok) { bad(`${what}: no way through when the plane arrives at swing time ${shift.toFixed(2)} s (distance ${r.x})`); break; }
    }
    if (o.type === "heli") {
      // It must never reach the very top or the very bottom of the sky, so there is always some room to slip past it.
      if (lowest < ac.ceiling + 6 || highest > ac.floor - 6) bad(`${what}: swings from ${lowest.toFixed(0)} to ${highest.toFixed(0)}, too close to the edge of the sky to be fair`);
    } else {
      const top = o.y + o.amp; // its tallest
      if (WORLD_H - top - ac.hitH / 2 - 4 - ac.ceiling < 20) bad(`${what}: at its tallest (${top} px) there is no lane over it`);
      if (o.y - o.amp < 20) bad(`${what}: gets shorter than 20 px, so it hardly rises from the ground`);
      if (o.y + o.amp > 105) bad(`${what}: gets taller than 105 px`);
    }
    // A mover must also leave a way through when a thundercloud close to it fires (up or down), at every point of its swing.
    for (const c of course.obstacles) {
      if (c.type !== "thunder" || Math.abs(c.at - o.at) > 330) continue;
      for (const side of ["up", "down"]) {
        for (const shift of moverShifts(o, 12)) {
          const r = W.walk(start, x0, x1, hits.concat(boltRect(c, side)), gateAt, null, [moverFor(o, shift, ac)]);
          if (!r.ok) { bad(`${what}: no way through together with the thundercloud at ${c.at} (bolt ${side}, swing time ${shift.toFixed(2)} s, distance ${r.x})`); break; }
        }
      }
    }
  }
  // Thermals: gentle, and clear of every other hazard so the push can never shove the plane into something.
  for (const t of thermals) {
    const what = `${name}: thermal at ${t.at}`;
    for (const o of course.obstacles) {
      if (o === t || o.type === "thermal") continue;
      const p = pictureOf(o);
      if (p.x < t.at + THERMAL_W / 2 + THERMAL_CLEAR && p.x + p.w > t.at - THERMAL_W / 2 - THERMAL_CLEAR) { bad(`${what}: ${o.type} at ${o.at} is within ${THERMAL_CLEAR} px of the column`); break; }
    }
  }
}

// ---------- leg times ----------
// Leg 2 should take about TWICE as long as leg 1, and leg 3 about twice as long as leg 2 (four times leg 1).
// Time is counted from the start of the take-off to the end of the final landing, flying at normal speed
// with no go-arounds, averaged over the leg's routes. (Leg 2 routes have 4 or 5 hops, so they differ a little.)
const secs = LEGS.map(legAverage);
console.log("Leg times (take-off to touchdown, normal speed, average over the routes):");
LEGS.forEach((leg, li) => {
  console.log(`  Leg ${li + 1}: ${secs[li].toFixed(1)} s   (${leg.routes.map((r) => legSeconds(leg, r.hops.length).toFixed(0)).join(" / ")} s per route)` +
    (li ? `   x${(secs[li] / secs[li - 1]).toFixed(2)} the leg before, x${(secs[li] / secs[0]).toFixed(2)} leg 1` : ""));
});
if (Math.abs(secs[0] - 46.2) > 1.5) bad(`Leg 1 now takes ${secs[0].toFixed(1)} s but it should be unchanged at about 46 s`);
if (!(secs[1] / secs[0] > 1.9 && secs[1] / secs[0] < 2.1)) bad(`Leg 2 should take about 2x leg 1 but takes x${(secs[1] / secs[0]).toFixed(2)}`);
if (!(secs[2] / secs[1] > 1.9 && secs[2] / secs[1] < 2.1)) bad(`Leg 3 should take about 2x leg 2 but takes x${(secs[2] / secs[1]).toFixed(2)}`);
// Leg 1 itself must be exactly as it was.
{
  const l1 = LEGS[0];
  if (l1.spacing !== 600 || l1.aircraft !== "cessna" || l1.perHop.join() !== "2,2" || l1.pairChance !== 0 || l1.fuel !== null || !l1.glowRight || l1.thunder[1] !== 0 || l1.special[1] !== 0 || l1.thermal[1] !== 0 || l1.routes.some((r) => r.stopovers.length)) bad("Leg 1 has changed: it should be 600 px spacing, 2 obstacles a hop, no fuel, no stopovers, no thunderclouds, and the glowing gate");
}
console.log("How busy the sky is (obstacles per hop; obstacles per second of flying, with the thunderclouds, moving hazards and thermals counted separately):");
busy.forEach((b, li) => console.log(`  Leg ${li + 1}: ${b.groups.toFixed(1)} per hop of ${b.hopSeconds.toFixed(1)} s flying = ${b.perSecond.toFixed(2)} a second` +
  (b.specials ? ` (that counts ${b.specials.toFixed(1)} helicopters or dust devils a hop: ${b.specialHops} of ${b.landHops} city or desert hops had one)` : "") +
  (b.clouds ? `, plus ${b.clouds.toFixed(1)} thunderclouds a hop` : "") + (b.thermals ? `, plus ${b.thermals.toFixed(2)} harmless thermals a hop` : "")));
if (LEGS[2]) {
  const b = busy[2], all = (b.groups + b.clouds) / b.hopSeconds;
  console.log(`  Leg 3 counting everything that can hurt you: ${all.toFixed(2)} a second (before the new hazards it was ${(0.55 + 2.3 / 29.1).toFixed(2)})`);
  if (all < 0.55 + 2.3 / 29.1 - 0.005) bad(`Leg 3 is emptier per second than before the moving hazards were added`);
}
// Before this change, leg 2 had about 3.2 obstacles per 6.7 s hop (0.49 a second), and leg 3 about 4.2 in the 6.7 s it
// had left for flying between landings (0.63 a second). The longer legs must not be emptier per second than that.
if (busy[1].perSecond < 0.49 * 0.9) bad(`Leg 2's sky is emptier per second (${busy[1].perSecond.toFixed(2)}) than it was (0.49)`);
if (busy[2].perSecond < 0.5) bad(`Leg 3's sky is emptier per second (${busy[2].perSecond.toFixed(2)}) than it was`);

// ---------- thunderclouds: the timer ----------
// Sample the cycle of many clouds finely and check: the light flashes for ~0.9 s, the bolt lasts ~0.4 s, the bolt
// goes the SAME way the light showed, both sides get used, and the clouds do not all fire together.
{
  let warnRuns = [], boltRuns = [], upCycles = 0, downCycles = 0, mismatches = 0;
  const phasesSeen = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const course = buildCourse(2, seed);
    const clouds = course.obstacles.filter((o) => o.type === "thunder");
    clouds.slice(0, 4).forEach((o) => phasesSeen.add(Math.round((o.phase / o.period) * 20)));
    for (const o of clouds.slice(0, 3)) {
      let run = null, sideOfWarn = null, warnCycle = -1;
      for (let t = 0; t < 60; t += 0.005) {
        const z = thunderAt(o, t);
        const key = z.phase === "quiet" ? null : z.phase + z.cycle;
        if (run && (!key || key !== run.key)) { (run.phase === "warn" ? warnRuns : boltRuns).push(run.len); run = null; }
        if (key && !run) {
          run = { key, phase: z.phase, len: 0, side: z.side };
          if (z.phase === "warn") { sideOfWarn = z.side; warnCycle = z.cycle; if (z.side === "up") upCycles++; else downCycles++; }
          else if (z.cycle === warnCycle && z.side !== sideOfWarn) mismatches++; // the bolt must go the way the light showed
        }
        if (run) run.len += 0.005;
      }
    }
  }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const full = (a) => a.slice(1, -1); // (the first and last runs can be cut off by the sampling window)
  console.log(`Thunder timer: light ${avg(full(warnRuns)).toFixed(2)} s, bolt ${avg(full(boltRuns)).toFixed(2)} s, ${upCycles} warnings up / ${downCycles} down, ${phasesSeen.size} different starting points among the first clouds`);
  if (Math.abs(avg(full(warnRuns)) - THUNDER_WARN) > 0.02) bad(`thunder: the warning light lasts ${avg(full(warnRuns)).toFixed(2)} s, not ${THUNDER_WARN}`);
  if (Math.abs(avg(full(boltRuns)) - THUNDER_BOLT) > 0.02) bad(`thunder: the bolt lasts ${avg(full(boltRuns)).toFixed(2)} s, not ${THUNDER_BOLT}`);
  if (mismatches) bad(`thunder: ${mismatches} bolt(s) went the opposite way to the light`);
  if (upCycles < 20 || downCycles < 20 || Math.min(upCycles, downCycles) / (upCycles + downCycles) < 0.35) bad(`thunder: the warning side is not random enough (${upCycles} up, ${downCycles} down)`);
  if (phasesSeen.size < 6) bad("thunder: the clouds are not staggered (too many start at the same point in the cycle)");
}

// ---------- the FUEL SIMULATION ----------
// A pretend pilot flies a route, climbing a given SHARE of the time (0.5 = half the time). The rest of
// the time is counted as LEVEL flight, which burns a little: that is on purpose pessimistic, because
// a real pilot who is not climbing is mostly gliding down, which burns nothing. The pilot never
// strikes anything. Each seed gives the pilot a slightly different share (2 points either way), so
// the answer is not one lucky number. A STRETCH runs from one refuel (the start, or a stopover) to the next
// (or the end), over one or more hops, and we note the fuel left at the end of each stretch: transits give
// nothing, and a stopover refuels to FULL. "Left" below 0 means the tank ran dry in that stretch.
function flyFuel(leg, route, share) {
  const ac = AIRCRAFT[leg.aircraft];
  const rules = leg.fuel;
  const stops = route.hops.length;
  const rate = share * rules.climbBurn + (1 - share) * rules.levelBurn; // percent per second
  let fuel = FULL_TANK;
  let from = TAKEOFF_LEN; // flying starts when the first take-off ends
  const stretches = []; // { label, left }
  let startLabel = route.codes[0];
  for (let i = 0; i < stops; i++) {
    fuel -= ((checkpointAt(leg, i) - from) / ac.speed) * rate;
    const kind = stopKind(route, i);
    if (kind !== "transit") stretches.push({ label: `${startLabel}-${route.codes[i + 1]}`, left: fuel });
    if (kind === "stopover") { fuel = FULL_TANK; startLabel = route.codes[i + 1]; }
    from = checkpointAt(leg, i); // no landing: you fly straight on
  }
  return stretches;
}

/** Run many pilots; give back the lowest "fuel left" seen for each stretch. */
function worstOver(leg, route, share, seeds, strikes = 0) {
  const worst = new Map();
  for (let seed = 1; seed <= seeds; seed++) {
    const rng = makeRng(seed * 7919 + 13);
    const sh = share >= 1 ? 1 : Math.max(0, Math.min(1, share + (rng() - 0.5) * 0.04));
    for (const st of flyFuel(leg, route, sh)) {
      const left = st.left - strikes * leg.fuel.strikeCost;
      if (!worst.has(st.label) || left < worst.get(st.label)) worst.set(st.label, left);
    }
  }
  return worst;
}

const lines = [];
const minAt = {}; // minAt[leg][share]: the lowest fuel left over all routes and stretches
// THE OWNER'S FUEL TARGETS (3 Nov 2026, after playing):
//   Leg 2: never dry at 65% climbing (and at least 5% left), but DOES run dry at 90% climbing on at least one stretch of some route.
//   Leg 3: never dry at 45% climbing (and at least 5% left), dry at 65% on some stretch, and dry at 100% on every route.
LEGS.forEach((leg, li) => {
  if (!leg.fuel) return;
  const L = `Leg ${li + 1}`;
  const shares = li === 1 ? [0.5, 0.65, 0.9, 1] : [0.45, 0.65, 1];
  minAt[li] = {};
  let dryAtHigh = false; // leg 2: did some stretch of some route run dry at 90%?  leg 3: did some stretch run dry at 65%?
  leg.routes.forEach((route, ri) => {
    const cell = (share, strikes = 0) => {
      const w = worstOver(leg, route, share, Math.min(SEEDS, 60), strikes);
      const min = Math.min(...w.values());
      return { w, min, text: [...w].map(([k, v]) => `${k} ${v.toFixed(0)}`).join(", ") };
    };
    for (const share of shares) {
      const c = cell(share);
      minAt[li][share] = Math.min(minAt[li][share] ?? Infinity, c.min);
      lines.push(`${L} route ${ri + 1} ${route.codes.join(" ")} | climbing ${Math.round(share * 100)}%: min left ${c.min.toFixed(1)}%  [${c.text}]`);
    }
    lines.push(`${L} route ${ri + 1} | climbing 50% and 1 strike in every stretch: min left ${cell(0.5, 1).min.toFixed(1)}%`);
    // ---- the rules the owner asked for ----
    if (li === 1) {
      const sixtyFive = cell(0.65).min;
      if (sixtyFive <= 0) bad(`${L} route ${ri + 1}: the tank runs dry at 65% climbing`);
      else if (sixtyFive < 5) bad(`${L} route ${ri + 1}: only ${sixtyFive.toFixed(1)}% left at 65% climbing (wanted at least 5%)`);
      if (cell(0.9).min < 0) dryAtHigh = true;
    }
    if (li === 2) {
      const fortyFive = cell(0.45).min;
      if (fortyFive <= 0) bad(`${L} route ${ri + 1}: the tank runs dry at 45% climbing`);
      else if (fortyFive < 5) bad(`${L} route ${ri + 1}: only ${fortyFive.toFixed(1)}% left at 45% climbing (wanted at least 5%)`);
      if (cell(0.65).min < 0) dryAtHigh = true;
      if (!(cell(1).min < 0)) bad(`${L} route ${ri + 1}: the tank does not run dry at 100% climbing`);
    }
  });
  if (li === 1 && !dryAtHigh) bad(`${L}: no stretch of any route runs dry at 90% climbing`);
  if (li === 2 && !dryAtHigh) bad(`${L}: no stretch of any route runs dry at 65% climbing`);
});
// Leg 3 must be tighter than leg 2 at the same share of climbing.
if (minAt[1] && minAt[2] && !(minAt[2][0.65] < minAt[1][0.65] && minAt[2][1] < minAt[1][1])) bad("Leg 3's fuel is not tighter than leg 2's");
console.log("Fuel simulation (percent of a full tank left at the end of each stretch; below 0 = ran dry):");
for (const l of lines) console.log("  " + l);

if (problems.size) {
  console.error(`Flyover: ${problems.size} problem(s)`);
  for (const p of [...problems].slice(0, 60)) console.error(" - " + p);
  if (problems.size > 60) console.error(` ... and ${problems.size - 60} more`);
  process.exit(1);
}
console.log(
  `Flyover OK: ${LEGS.length} legs, ${LEGS.map((l) => l.routes.length).join("/")} routes, ${courses} courses built (${SEEDS} seeds per route), ` +
  `${obstacleTotal} obstacles checked, ${fallbackHops} hop(s) had to be made emptier.`,
);
console.log("Obstacles made: " + Object.entries(typeCounts).map(([k, v]) => `${k} ${v}`).join(", "));
