// Checks the Flyover routes and the courses made from them are sensible and fair. Run it with:
//   node scripts/check-flyover.mjs
//   node scripts/check-flyover.mjs 500      (to try 500 seeds per route instead of 200)
// It reads src/arcade/flyover-data.ts and flyover-gen.ts directly (Node 22 can run TypeScript files
// that have no fancy syntax). Every route of every leg is built with many different seeds, exactly
// as the game builds it, and each one is checked. It prints every problem it finds. Exit code 1
// means something needs fixing.
import {
  AIRCRAFT, LEGS, RECIPES, TERRAINS, WORLD_H, FIRST_OBSTACLE, GATE_CLEAR_BEFORE, GATE_CLEAR_AFTER, GATE_RETRY,
  checkpointAt, legLength, gateSlots, hitboxOf, pictureOf, OBSTACLE_INFO,
} from "../src/arcade/flyover-data.ts";
import { buildCourse, makeRng, pickDecoys, terrainAt } from "../src/arcade/flyover-gen.ts";
import { AIRPORT_TABLE } from "../src/decks/airports-data.ts";

const SEEDS = Number(process.argv[2]) || 200;
const problems = new Set(); // a Set, so the same complaint found with 200 seeds is only printed once
const bad = (msg) => problems.add(msg);

const rows = AIRPORT_TABLE.trim().split("\n").map((l) => l.split("|"));
const codes = new Set(rows.map((r) => r[0]));
const regions = new Map(rows.map((r) => [r[0], r[4]]));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

if (LEGS.length !== 3) bad(`expected 3 legs, found ${LEGS.length}`);
for (const t of TERRAINS) if (!RECIPES[t]?.length) bad(`terrain ${t} has no obstacle recipe`);

let courses = 0, obstacleTotal = 0, fallbackHops = 0;
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
  for (let ri = 0; ri < leg.routes.length; ri++) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const course = buildCourse(li, seed, ri);
      courses++;
      checkCourse(li, leg, ac, course, `${L} route ${ri + 1} seed ${seed}`);
    }
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
  const hits = course.obstacles.map(hitboxOf);
  let lastAt = -Infinity;
  const perHop = new Array(stops).fill(0);
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
    if (!RECIPES[terrain].some((r) => r.type === o.type)) bad(`${what}: a ${o.type} does not belong over ${terrain}`);
    if (OBSTACLE_INFO[o.type].ground) {
      if (o.y < 10 || o.y > WORLD_H - ac.ceiling - 30) bad(`${what}: height ${o.y} is out of range for ${leg.aircraft}`);
    } else if (o.y < ac.ceiling + 10 || o.y > ac.floor) bad(`${what}: height ${o.y} is off the flying space`);
    // No single obstacle may block the whole flying space.
    const hb = hits[i];
    const free = (ac.floor - ac.ceiling) - (Math.min(ac.floor, hb.y + hb.h + ac.hitH / 2) - Math.max(ac.ceiling, hb.y - ac.hitH / 2));
    if (free < 30) bad(`${what}: leaves only ${Math.round(free)} px to fly through`);
    const hop = Math.min(stops - 1, Math.floor(o.at / leg.spacing));
    perHop[hop]++;
  });
  perHop.forEach((n, i) => { if (n === 0 && leg.perHop[0] > 0 && course.fallbacks === 0) bad(`${name}: hop ${i + 1} has no obstacles`); });

  // ---- is there always a way through? ----
  // Walk along the leg in 5 pixel steps, keeping a list of every height the plane could be at.
  // From one step to the next it can only change height as fast as the aircraft really climbs
  // or sinks (we use 65% of the top rate, because the real plane needs time to build up speed).
  // This is written out again here, on purpose, rather than reusing the generator's own walk.
  const STEP = 5;
  const lo = ac.ceiling, hi = ac.floor;
  const cells = hi - lo + 1;
  let ok = new Uint8Array(cells);
  ok[Math.round((lo + hi) / 2) - lo] = 1;
  const upRate = (ac.maxUp * 0.65 * STEP) / ac.speed;
  const downRate = (ac.maxDown * 0.65 * STEP) / ac.speed;
  const slots = gateSlots(ac).ys;
  const gateAt = new Set();
  for (let i = 0; i < stops; i++) { gateAt.add(checkpointAt(leg, i)); gateAt.add(checkpointAt(leg, i) + GATE_RETRY); }
  for (let x = 0; x <= end; x += STEP) {
    const next = new Uint8Array(cells);
    for (let c = 0; c < cells; c++) {
      if (!ok[c]) continue;
      const from = Math.max(0, Math.floor(c - upRate)), to = Math.min(cells - 1, Math.ceil(c + downRate));
      for (let d = from; d <= to; d++) next[d] = 1;
    }
    for (let c = 0; c < cells; c++) {
      if (!next[c]) continue;
      const y = lo + c;
      // Leave a little room (4 px) round the plane so passing a gap is not a pixel-perfect job.
      const roomy = { x: x - ac.hitW / 2 - 4, y: y - ac.hitH / 2 - 4, w: ac.hitW + 8, h: ac.hitH + 8 };
      if (hits.some((r) => overlaps(roomy, r))) next[c] = 0;
    }
    ok = next;
    if (!ok.includes(1)) { bad(`${name}: no way through at distance ${x}`); return; }
    if (gateAt.has(x)) {
      for (const sy of slots) {
        const c = sy - lo;
        if (!ok.slice(Math.max(0, c - 2), c + 3).includes(1)) bad(`${name}: gate ring at height ${sy} is out of reach at distance ${x}`);
      }
    }
  }
}

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
