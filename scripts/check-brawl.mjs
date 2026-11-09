// Checks The Brawl's levels are sensible and can be finished. Run it with:
//   node scripts/check-brawl.mjs
// It reads the level files and the physics directly (Node 22 can run TypeScript files that have no
// fancy syntax) and prints every problem it finds. Exit code 1 means something needs fixing.
//
// What it checks, for every level:
//   - the letters are known, every row is the same width, and there is one start (P) and one finish (F)
//   - flags (C, c), signs and hurdles stand on something; every sign has words and every line is placed
//   - EVERY GAP AND STEP can be jumped with the hero's real jump (the physics is run, not guessed)
//   - a pretend player (a "bot") runs the level from the start to the finish using the real physics
//   - the stampede cannot catch a bot that runs flat out, and the margin is reported
//   - every hazard has its warning, its timing fits in its cycle, and it lands on solid track
//   - the medal times fit the time the bot needs
import { LEVELS } from "../src/arcade/brawl/levels.ts";
import { makeWorld, SIGN_KEYS, SOLID, ONE_WAY } from "../src/arcade/brawl/world.ts";
import { TUNING as T, TILE, TRACK_RULES } from "../src/arcade/brawl/tuning.ts";
import { jumpStats, newBody, stepBody } from "../src/arcade/brawl/physics.ts";
import { makeHazards, hazardAt, packFront } from "../src/arcade/brawl/hazards.ts";

const problems = [];
let notes = [];
const bad = (lv, msg) => problems.push(`${lv}: ${msg}`);

const KNOWN = new Set(".#TgsBH=PCcKF" + SIGN_KEYS);
const stats = jumpStats();
// A real player is not perfect. Use 85% of what the jump can do.
const SAFETY = 0.85;
const maxGapPx = (stats.reach + T.bodyW) * SAFETY;
const maxRisePx = stats.height * SAFETY;
notes.push(`Hero jump: ${stats.height.toFixed(1)} px high, ${stats.reach.toFixed(1)} px far at top speed, ${stats.airtime.toFixed(2)} s in the air; a tap hops ${stats.tapHeight.toFixed(1)} px.`);
notes.push(`Allowed: gaps up to ${(maxGapPx / TILE).toFixed(1)} tiles, steps up to ${(maxRisePx / TILE).toFixed(1)} tiles.`);
if (stats.height < 48) problems.push("the jump is lower than 3 tiles, so steps of 3 tiles can not be climbed");
if (T.coyoteTime <= 0 || T.jumpBuffer <= 0) problems.push("coyote time and the jump buffer should both be above zero");
if (T.gravityFall <= T.gravityRise) problems.push("fall gravity should be stronger than rise gravity");
if (stats.tapHeight >= stats.height * 0.6) problems.push("a tap should hop much lower than a full jump (variable jump height)");

for (const [name, r] of Object.entries(TRACK_RULES)) if (!(r.hearts >= 1) || !(r.lives >= 1)) problems.push(`track ${name}: needs at least 1 heart and 1 life`);
if (TRACK_RULES.easy.lives !== Infinity) problems.push("Easy should have unlimited lives");

LEVELS.forEach((level, li) => checkLevel(level, `Level ${li + 1} (${level.name})`));

function checkLevel(level, lv) {
  const rows = level.rows;
  const W = rows[0].length;
  rows.forEach((r, y) => {
    if (r.length !== W) bad(lv, `row ${y} is ${r.length} wide, row 0 is ${W}`);
    [...r].forEach((c, x) => { if (!KNOWN.has(c)) bad(lv, `unknown letter "${c}" at column ${x}, row ${y}`); });
  });
  if (rows.some((r) => r.length !== W)) return;
  const world = makeWorld(rows);
  const find = world.find;
  const standsOn = (x, y) => world.solid(x, y + 1) || world.oneWay(x, y + 1);

  // ---- start, finish, flags ----
  const starts = find("P"), finishes = find("F"), lines = find("K");
  if (starts.length !== 1) bad(lv, `expected exactly one start (P), found ${starts.length}`);
  if (finishes.length !== 1) bad(lv, `expected exactly one finish (F), found ${finishes.length}`);
  if (level.stampede) {
    if (lines.length !== 1) bad(lv, `the stampede needs exactly one starter's line (K), found ${lines.length}`);
    else if (lines[0][0] !== level.stampede.line) bad(lv, `the K is in column ${lines[0][0]} but STAMPEDE.line says ${level.stampede.line}`);
  }
  const mainFlags = find("C"), extraFlags = find("c");
  if (!mainFlags.length) bad(lv, "there are no checkpoint flags (C)");
  for (const [x, y] of [...mainFlags, ...extraFlags]) if (!standsOn(x, y)) bad(lv, `the flag at column ${x}, row ${y} has no ground under it`);
  for (const [x, y] of [...starts, ...finishes, ...lines]) if (!standsOn(x, y)) bad(lv, `the marker at column ${x}, row ${y} has no ground under it`);
  // a flag should be early enough that it helps: no stretch longer than 90 tiles without one (counting the start)
  const flagCols = [0, ...mainFlags.map((f) => f[0]), W].sort((a, b) => a - b);
  for (let i = 1; i < flagCols.length; i++) if (flagCols[i] - flagCols[i - 1] > 90) bad(lv, `${flagCols[i] - flagCols[i - 1]} tiles between checkpoints (columns ${flagCols[i - 1]} to ${flagCols[i]}): add a flag`);
  // on Hard the small "c" flags go away; the main flags must still keep it fair
  void extraFlags;

  // ---- signs ----
  const used = new Set();
  for (let y = 0; y < world.h; y++) for (let x = 0; x < W; x++) {
    const i = SIGN_KEYS.indexOf(rows[y][x]);
    if (i < 0) continue;
    used.add(i);
    if (!level.signs[i]) bad(lv, `sign "${rows[y][x]}" at column ${x} has no words (SIGNS line ${i + 1})`);
    if (!standsOn(x, y)) bad(lv, `sign "${rows[y][x]}" at column ${x}, row ${y} floats: it needs ground under it`);
  }
  level.signs.forEach((s, i) => { if (!used.has(i)) bad(lv, `SIGNS line ${i + 1} ("${s.slice(0, 24)}...") is not placed in the level`); });
  level.signs.forEach((s, i) => { if (s.length > 90) bad(lv, `SIGNS line ${i + 1} is ${s.length} letters: keep it short enough to read while running`); });

  // ---- hurdles ----
  for (const [x, y] of find("H")) {
    if (!standsOn(x, y)) bad(lv, `the hurdle at column ${x}, row ${y} has no ground under it`);
    if (world.solid(x, y - 1)) bad(lv, `the hurdle at column ${x} has something solid on top of it`);
  }

  // ---- ceilings: the room to jump ----
  // (where the roof is low, a full jump would bump it; that is allowed but flagged if it is too low to stand)
  for (let x = 0; x < W; x++) for (let y = 0; y < world.h; y++) {
    if (!standsOn(x, y) || world.solid(x, y)) continue;
    const head = Math.ceil(T.bodyH / TILE);
    for (let k = 0; k < head; k++) if (world.solid(x, y - k)) { bad(lv, `column ${x}, row ${y}: the ceiling is too low to stand under`); break; }
  }

  // ---- gaps and steps along the route ----
  gapsAndSteps(level, lv, world);

  // ---- hazards ----
  hazardChecks(level, lv, world);

  // ---- the bot ----
  if (starts.length === 1 && finishes.length === 1) botChecks(level, lv, world, starts[0], finishes[0][0]);
}

/**
 * Walk along the level one column at a time on the floor you would be standing on, and look at every
 * place the floor stops or changes height. The answer to "can this be jumped?" comes from the real
 * physics (the numbers measured at the top of this file), not from a guess.
 */
function gapsAndSteps(level, lv, world) {
  const W = world.w;
  const top = (x, r) => (world.solid(x, r) || world.oneWay(x, r)) && !world.solid(x, r - 1) && !world.solid(x, r - 2);
  const start = world.find("P")[0];
  if (!start) return;
  let floor = start[1] + 1; // the row of the ground tile we stand on
  let x = start[0];
  while (x < W - 1) {
    const nx = x + 1;
    // candidate floors in the next column: any top surface from 3 tiles above to anywhere below
    let found = null;
    for (let r = Math.max(1, floor - 4); r < world.h; r++) if (top(nx, r)) { found = r; break; }
    if (found !== null) {
      const rise = (floor - found) * TILE;
      if (rise > maxRisePx) bad(lv, `the step up at column ${nx} is ${floor - found} tiles: too high (max ${(maxRisePx / TILE).toFixed(1)})`);
      floor = found; x = nx;
      continue;
    }
    // a gap: find the next column that has a floor we can land on
    let k = 1;
    let landing = null;
    while (nx + k - 1 < W - 1) {
      const cx = nx + k;
      for (let r = Math.max(1, floor - 4); r < world.h; r++) if (top(cx, r)) { landing = [cx, r]; break; }
      if (landing) break;
      k++;
    }
    if (!landing) { bad(lv, `the level ends in a gap at column ${nx}`); return; }
    const widthPx = k * TILE;
    const rise = (floor - landing[1]) * TILE;
    if (widthPx > maxGapPx) bad(lv, `the gap at columns ${nx} to ${nx + k - 1} is ${k} tiles wide: too wide to jump (max ${(maxGapPx / TILE).toFixed(1)})`);
    if (rise > maxRisePx * 0.8) bad(lv, `the gap at column ${nx} lands ${floor - landing[1]} tile(s) higher: too much for a jump across`);
    floor = landing[1]; x = landing[0];
  }
}

function hazardChecks(level, lv, world) {
  const floorRow = level.floorY / TILE;
  const hz = makeHazards(level.hazards, level.timing, level.floorY, TILE);
  hz.forEach((h, i) => {
    const tag = `hazard ${i + 1} (${h.kind} thrower at column ${level.hazards[i].thrower})`;
    if (h.windup < 1.0) bad(lv, `${tag}: the wind up is ${h.windup}s: the warning must last at least 1 second`);
    const total = h.kind === "hammer"
      ? h.windup + h.reach / h.speed + 0.4
      : h.kind === "shot" ? h.windup + h.flight + h.roll + 0.5 : h.windup + h.flight + h.stuck + 0.4;
    if (total > h.period + 1e-6) bad(lv, `${tag}: one throw takes ${total.toFixed(2)}s but the cycle is only ${h.period}s`);
    if (h.kind === "javelin" && h.removal >= h.stuck) bad(lv, `${tag}: the removal warning is longer than the time it is stuck`);
    const col = Math.floor(h.tx / TILE);
    if (h.kind !== "hammer") {
      if (!world.solid(col, floorRow) || world.solid(col, floorRow - 1)) bad(lv, `${tag}: it lands in column ${col}, which is not open track`);
      if (Math.abs(h.tx - h.x0) < 3 * TILE) bad(lv, `${tag}: it lands too close to the thrower`);
      if (h.kind === "shot") {
        const endCol = Math.floor((h.tx + h.dir * h.rollDist) / TILE);
        if (!world.solid(endCol, floorRow)) bad(lv, `${tag}: the roll ends over a pit (column ${endCol})`);
      }
    } else {
      const endCol = Math.floor((h.x0 + h.dir * h.reach) / TILE);
      if (endCol < 0 || endCol >= world.w) bad(lv, `${tag}: the hammer flies off the level`);
      if (h.height < 7 || h.height > 12) bad(lv, `${tag}: the hammer height should be 7 to 12 px so that jumping clears it and nothing else does`);
    }
    // is the thrower's column somewhere an athlete could stand (the infield, behind the track)?
    if (!world.solid(Math.floor(h.x0 / TILE), floorRow)) bad(lv, `${tag}: the thrower stands in front of a pit`);
    // a stuck javelin is a platform: it must not sit inside a wall
    if (h.kind === "javelin") {
      const v = hazardAt(h, h.windup + h.flight + 0.5);
      if (!v.platform) bad(lv, `${tag}: a stuck javelin should make a platform`);
      else if (floorRow * TILE - v.platform.y > maxRisePx) bad(lv, `${tag}: the javelin platform is too high to jump onto`);
    }
    // the warning: in the wind up there must be a marker where it will come down
    const w = hazardAt(h, h.windup * 0.5 - h.offset);
    if (!w.marker) bad(lv, `${tag}: no warning marker during the wind up`);
  });
  // two hazards that land close together must not be in the air together
  for (let a = 0; a < hz.length; a++) for (let b = a + 1; b < hz.length; b++) {
    if (Math.abs(hz[a].tx - hz[b].tx) > 8 * TILE || hz[a].kind === "hammer" || hz[b].kind === "hammer") continue;
    for (let t = 0; t < 120; t += 0.05) {
      const va = hazardAt(hz[a], t), vb = hazardAt(hz[b], t);
      const busy = (v) => v.phase === "flight" || v.phase === "roll";
      if (busy(va) && busy(vb)) { bad(lv, `hazards ${a + 1} and ${b + 1} land close together and are dangerous at the same time (at ${t.toFixed(2)}s): change an offset`); break; }
    }
  }
}

function botChecks(level, lv, world, start, finishCol) {
  const run = (hesitate, slack = 0) => {
    const b = newBody(start[0] * TILE + TILE / 2, (start[1] + 1) * TILE);
    b.onGround = true;
    const finishX = finishCol * TILE + TILE / 2;
    const lineX = level.stampede ? level.stampede.line * TILE + TILE / 2 : Infinity;
    const stampede = level.stampede && { ...level.stampede, lead: level.stampede.lead + slack };
    let stampT = null, minGap = Infinity, caught = false;
    const floorUnder = (px, py) => {
      const tx = Math.floor(px / TILE);
      for (let r = Math.floor(py / TILE); r <= Math.floor(py / TILE) + 1; r++) if (world.solid(tx, r) || world.oneWay(tx, r)) return true;
      return false;
    };
    let t = 0, stuckFor = 0, lastX = b.x;
    for (let tick = 0; tick < 60 * 150; tick++) {
      t += 1 / 60;
      let jump = false;
      if (b.onGround) {
        const wall = world.solid(Math.floor((b.x + 13) / TILE), Math.floor((b.y - 4) / TILE));
        const pit = !floorUnder(b.x + 8, b.y + 1);
        if (wall || pit) jump = true;
      }
      const right = !(stampT !== null && stampT < hesitate); // a hesitating runner stands still after the pistol
      stepBody(b, { left: false, right, down: false, jumpHeld: jump || (!b.onGround && b.vy < 0), jumpPressed: jump }, world, [], 1 / 60);
      if (level.stampede) {
        if (stampT === null && b.x >= lineX) stampT = 0;
        if (stampT !== null) {
          stampT += 1 / 60;
          const front = packFront(stampede, lineX, stampT);
          minGap = Math.min(minGap, b.x - front);
          if (b.x - 5 < front) caught = true;
        }
      }
      if (b.y > world.pxH + T.fallDeadZone) return { ok: false, why: `fell into a pit near column ${Math.floor(b.x / TILE)}`, t, minGap, caught };
      if (b.x >= finishX) return { ok: true, t, minGap, caught };
      if (Math.abs(b.x - lastX) < 0.3) { stuckFor += 1 / 60; if (stuckFor > 3) return { ok: false, why: `got stuck at column ${Math.floor(b.x / TILE)}, row ${Math.floor(b.y / TILE)}`, t, minGap, caught }; } else { stuckFor = 0; lastX = b.x; }
    }
    return { ok: false, why: "ran out of time", t, minGap, caught };
  };

  const fast = run(0);
  if (!fast.ok) { bad(lv, `a bot running flat out ${fast.why}`); return; }
  notes.push(`${lv}: a bot running flat out finishes in ${fast.t.toFixed(1)} s.`);
  if (level.stampede) {
    for (const [track, rules] of Object.entries(TRACK_RULES)) {
      const flat = run(0, rules.stampedeSlack);
      const slow = run(1.2, rules.stampedeSlack);
      notes.push(`${lv}, ${track}: the stampede stays ${flat.minGap.toFixed(0)} px behind a flat-out bot; a bot that stands still for 1.2 s after the pistol ${slow.ok ? (slow.caught ? "is CAUGHT" : `stays ${slow.minGap.toFixed(0)} px ahead`) : "did not finish (" + slow.why + ")"}.`);
      const need = track === "hard" ? 30 : track === "intermediate" ? 60 : 100;
      if (flat.caught || flat.minGap < need) bad(lv, `${track}: the stampede gets within ${flat.minGap.toFixed(0)} px of a bot that runs flat out: it should stay at least ${need} px behind`);
      if (track === "easy" && slow.ok && slow.caught) bad(lv, "easy: a bot that hesitates for 1.2 s after the pistol is caught by the stampede: Easy should be kinder");
    }
  }
  const m = level.medals;
  if (!(m.gold < m.silver && m.silver < m.bronze)) bad(lv, "medal times should get slower: gold < silver < bronze");
  if (m.gold < fast.t + 5) bad(lv, `gold (${m.gold}s) is too tight: a perfect run with no hazards takes ${fast.t.toFixed(1)}s`);
  if (m.bronze > 240) bad(lv, "bronze is over 4 minutes: that is not a quick level");
}

console.log(notes.join("\n"));
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(` - ${p}`);
  process.exit(1);
}
console.log(`\nBrawl OK: ${LEVELS.length} level(s) checked.`);
