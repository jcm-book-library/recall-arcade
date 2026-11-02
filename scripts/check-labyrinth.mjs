// Checks the Labyrinth maps are sensible and can be finished. Run it with:
//   node scripts/check-labyrinth.mjs
// It reads src/arcade/labyrinth-maps.ts directly (Node 22 can run TypeScript files that have no
// fancy syntax) and prints every problem it finds. Exit code 1 means something needs fixing.
//
// The game flips each map at random when a level starts (see flipRows in labyrinth-maps.ts), so
// the "can it be finished?" checks below run on ALL FOUR versions of every level.
import { LEVELS, flipRows, FLIP_COUNT } from "../src/arcade/labyrinth-maps.ts";

const problems = new Set(); // a Set, so the same complaint found in four flips is only printed once
const bad = (level, msg) => problems.add(`Level ${level}: ${msg}`);

const KNOWN = new Set("#.PErRbB*vhMT~FxGi");
const WORLDS = new Set(["garden", "dungeon", "lava"]);
const FLIP_NAMES = ["as drawn", "flipped left-right", "flipped top-bottom", "flipped both ways"];
// How many ice crystals each world must hold: the garden none, the dungeon and the Lava Heart one each.
const ICE_PICKUPS = { garden: 0, dungeon: 1, lava: 1 };
// Down, left, right, up: the same order the game uses (and the order a fire jet looks in).
const DX = [0, -1, 1, 0];
const DY = [1, 0, 0, -1];

if (LEVELS.length !== 3) problems.add(`expected 3 levels, found ${LEVELS.length}`);

LEVELS.forEach((level, li) => {
  const L = li + 1;
  if (!level.name) bad(L, "has no name");
  if (!level.tagline) bad(L, "has no tagline");
  if (!WORLDS.has(level.world)) bad(L, `unknown world "${level.world}"`);
  const W = level.rows[0].length;
  level.rows.forEach((r, y) => {
    if (r.length !== W) bad(L, `row ${y} is ${r.length} wide, row 0 is ${W}`);
  });
  if (level.rows.some((r) => r.length !== W)) return; // a ragged map can't be flipped sensibly

  for (let flip = 0; flip < FLIP_COUNT; flip++) {
    const rows = flipRows(level.rows, flip);
    const note = flip === 0 ? "" : ` (${FLIP_NAMES[flip]})`;
    checkOne(L, level, rows, note, flip === 0);
  }
});

function checkOne(L, level, rows, note, first) {
  const H = rows.length;
  const W = rows[0].length;
  const fail = (msg) => bad(L, msg + note);
  const at = (x, y) => rows[y]?.[x] ?? "#";

  // ---- letters, and where things are ----
  const spots = {};
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = at(x, y);
      if (!KNOWN.has(c)) fail(`unknown letter "${c}" at column ${x}, row ${y}`);
      (spots[c] ??= []).push([x, y]);
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      if (edge && c !== "#") fail(`the edge at column ${x}, row ${y} is "${c}", it must be a wall (#)`);
    }
  }
  const count = (c) => (spots[c] ?? []).length;
  if (count("P") !== 1) fail(`needs exactly one P, found ${count("P")}`);
  if (count("E") !== 1) fail(`needs exactly one E, found ${count("E")}`);
  if (count("x") !== 1) fail(`needs exactly one exit key spot (x), found ${count("x")}`);
  if (count("M") > 1) fail(`has ${count("M")} Minotaurs, at most one`);
  if (count("*") < 1) fail("has no gems, so nothing would ever open the way out");
  if (count("R") > count("r")) fail(`${count("R")} red door(s) but only ${count("r")} red key(s)`);
  if (count("B") > count("b")) fail(`${count("B")} blue door(s) but only ${count("b")} blue key(s)`);
  if (level.world === "garden" && count("T")) fail("trapdoors (T) belong in the dungeon and the Lava Heart");
  if (level.world !== "lava" && (count("~") || count("F"))) fail("lava (~) and fire jets (F) belong in the Lava Heart");
  // The Lava Heart seals its exit key behind a gem door; the other worlds make the key appear.
  if (level.world === "lava" && count("G") < 1) fail("the Lava Heart needs a gem door (G) sealing the exit key");
  if (level.world !== "lava" && count("G")) fail("gem doors (G) belong in the Lava Heart; the other levels make the exit key appear");
  if (WORLDS.has(level.world) && count("i") !== ICE_PICKUPS[level.world]) {
    fail(`needs ${ICE_PICKUPS[level.world]} ice pickup(s) (i) in the ${level.world}, found ${count("i")}`);
  }
  if (count("P") !== 1 || count("E") !== 1 || count("x") !== 1) return;

  // ---- fire jets need somewhere to shoot ----
  // Open floor means a plain floor tile: not a wall, lava, another jet, a door, a gem door or a trapdoor.
  const isFloor = (x, y) => !"#~FRBTEG".includes(at(x, y));
  for (const [x, y] of spots.F ?? []) {
    const d = [0, 1, 2, 3].find((k) => isFloor(x + DX[k], y + DY[k]));
    if (d === undefined) fail(`the fire jet at column ${x}, row ${y} has no open floor in front of it`);
  }

  // ---- bats and wasps need room to fly ----
  for (const c of ["v", "h"]) {
    for (const [x, y] of spots[c] ?? []) {
      const dirs = c === "v" ? [0, 3] : [1, 2];
      if (!dirs.some((k) => !"#~FRBOG".includes(at(x + DX[k], y + DY[k])))) fail(`the flyer at column ${x}, row ${y} has no room to fly`);
    }
  }

  // ---- can the level be finished? ----
  // Walk out from P like spilled water. Walls, lava, fire jets and trapdoors are blocked (an
  // open trapdoor is a hole, and a closed one drops you away from where you were going, so
  // neither may be needed). A door blocks you until you have reached a key of its colour; then it
  // opens, and the key is used up. We repeat until nothing new opens up.
  //
  // The gem door (G) is the extra rule. It stays SHUT until every gem has been picked up. So we
  // walk out twice:
  //   walk 1: gem door shut. Every gem (and key) must be reachable in this walk. In the garden and
  //           dungeon the exit key appears on its spot after the last gem, so that spot must be here too.
  //   walk 2: gem door open (it opened because walk 1 found every gem). The exit key behind it, the
  //           ice, the doors and the exit must all be reachable now.
  const blocked = (c, gemDoorOpen) => c === "#" || c === "~" || c === "F" || c === "T" || (c === "G" && !gemDoorOpen);
  const [px, py] = spots.P[0];
  function walk(gemDoorOpen) {
    const seen = new Set([`${px},${py}`]);
    const queue = [[px, py]];
    const waiting = { R: [], B: [] }; // doors we bumped into
    const keys = { r: 0, b: 0 };
    const opened = { R: 0, B: 0 };
    const step = () => {
      for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i];
        const c = at(x, y);
        if (c === "r" || c === "b") keys[c]++;
        for (let k = 0; k < 4; k++) {
          const nx = x + DX[k];
          const ny = y + DY[k];
          const id = `${nx},${ny}`;
          const t = at(nx, ny);
          if (seen.has(id) || blocked(t, gemDoorOpen)) continue;
          if (t === "R" || t === "B") {
            if (!waiting[t].some((w) => w[2] === id)) waiting[t].push([nx, ny, id]);
            continue;
          }
          seen.add(id);
          queue.push([nx, ny]);
        }
      }
      queue.length = 0;
    };
    step();
    for (let progress = true; progress; ) {
      progress = false;
      for (const [door, key] of [["R", "r"], ["B", "b"]]) {
        while (waiting[door].length && keys[key] - opened[door] > 0) {
          const [dx, dy, id] = waiting[door].shift();
          opened[door]++;
          seen.add(id);
          queue.push([dx, dy]);
          progress = true;
        }
      }
      step();
    }
    return seen;
  }
  const before = walk(false); // gem door shut
  const after = walk(true); // gem door open
  const NAMES = { r: "red key", b: "blue key", "*": "gem", E: "exit", R: "red door", B: "blue door", x: "exit key", i: "ice crystal", G: "gem door" };
  const needs = (c, seen, when) => {
    for (const [x, y] of spots[c] ?? []) {
      if (!seen.has(`${x},${y}`)) fail(`the ${NAMES[c]} at column ${x}, row ${y} cannot be reached ${when} (doors need their key first; lava, jets and trapdoors are blocked)`);
    }
  };
  const hasGemDoor = count("G") > 0;
  for (const c of ["r", "b", "*"]) needs(c, before, "before the gem door opens");
  if (hasGemDoor) {
    // Gems open the gem door, so the room it seals must really be sealed, and then reachable.
    for (const [x, y] of spots.x) if (before.has(`${x},${y}`)) fail(`the exit key at column ${x}, row ${y} can be reached without opening the gem door`);
    for (const [x, y] of spots.G) if (!after.has(`${x},${y}`) && !before.has(`${x},${y}`)) {
      // the door tile itself is "blocked" in walk 1; it counts as reached when a neighbour is
      const near = [0, 1, 2, 3].some((k) => before.has(`${x + DX[k]},${y + DY[k]}`));
      if (!near) fail(`the gem door at column ${x}, row ${y} cannot be reached`);
    }
  } else {
    needs("x", before, "once the last gem is collected");
  }
  for (const c of ["x", "i", "E", "R", "B"]) needs(c, after, "even with the gem door open");

  if (first) {
    const floorTiles = rows.join("").split("").filter((c) => !blocked(c, true)).length;
    console.log(`Level ${L} ${level.name} (${level.world}): ${W} x ${H}, ${count("*")} gems, ${count("T")} trapdoors, ${count("F")} jets, ${count("i")} ice, ${hasGemDoor ? "gem door, " : ""}reached ${after.size} of ${floorTiles} open tiles`);
  }
}

if (problems.size) {
  console.log(`\n${problems.size} problem(s):`);
  for (const p of problems) console.log(" - " + p);
  process.exit(1);
}
console.log(`Labyrinth maps look good (all ${FLIP_COUNT} flips of every level checked).`);
