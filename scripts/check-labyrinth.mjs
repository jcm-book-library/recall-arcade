// Checks the Labyrinth maps are sensible and can be finished. Run it with:
//   node scripts/check-labyrinth.mjs
// It reads src/arcade/labyrinth-maps.ts directly (Node 22 can run TypeScript files that have no
// fancy syntax) and prints every problem it finds. Exit code 1 means something needs fixing.
import { LEVELS } from "../src/arcade/labyrinth-maps.ts";

const problems = [];
const bad = (level, msg) => problems.push(`Level ${level}: ${msg}`);

const KNOWN = new Set("#.PErRbB*vhMT~F");
const WORLDS = new Set(["garden", "dungeon", "lava"]);
// Down, left, right, up: the same order the game uses (and the order a fire jet looks in).
const DX = [0, -1, 1, 0];
const DY = [1, 0, 0, -1];

if (LEVELS.length !== 3) problems.push(`expected 3 levels, found ${LEVELS.length}`);

LEVELS.forEach((level, li) => {
  const L = li + 1;
  const rows = level.rows;
  const H = rows.length;
  const W = rows[0].length;
  if (!level.name) bad(L, "has no name");
  if (!level.tagline) bad(L, "has no tagline");
  if (!WORLDS.has(level.world)) bad(L, `unknown world "${level.world}"`);

  // ---- shape ----
  rows.forEach((r, y) => {
    if (r.length !== W) bad(L, `row ${y} is ${r.length} wide, row 0 is ${W}`);
  });
  const at = (x, y) => rows[y]?.[x] ?? "#";

  // ---- letters, and where things are ----
  const spots = {};
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = at(x, y);
      if (!KNOWN.has(c)) bad(L, `unknown letter "${c}" at column ${x}, row ${y}`);
      (spots[c] ??= []).push([x, y]);
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      if (edge && c !== "#") bad(L, `the edge at column ${x}, row ${y} is "${c}", it must be a wall (#)`);
    }
  }
  const count = (c) => (spots[c] ?? []).length;
  if (count("P") !== 1) bad(L, `needs exactly one P, found ${count("P")}`);
  if (count("E") !== 1) bad(L, `needs exactly one E, found ${count("E")}`);
  if (count("M") > 1) bad(L, `has ${count("M")} Minotaurs, at most one`);
  if (count("*") < 1) bad(L, "has no gems, so no ice charge could be earned");
  if (count("R") > count("r")) bad(L, `${count("R")} red door(s) but only ${count("r")} red key(s)`);
  if (count("B") > count("b")) bad(L, `${count("B")} blue door(s) but only ${count("b")} blue key(s)`);
  if (level.world !== "dungeon" && count("T")) bad(L, "trapdoors (T) belong in the dungeon");
  if (level.world !== "lava" && (count("~") || count("F"))) bad(L, "lava (~) and fire jets (F) belong in the Lava Heart");
  if (count("P") !== 1 || count("E") !== 1) return;

  // ---- fire jets need somewhere to shoot ----
  // Open floor means a plain floor tile: not a wall, lava, another jet, a door or a trapdoor.
  const isFloor = (x, y) => !"#~FRBTE".includes(at(x, y));
  for (const [x, y] of spots.F ?? []) {
    const d = [0, 1, 2, 3].find((k) => isFloor(x + DX[k], y + DY[k]));
    if (d === undefined) bad(L, `the fire jet at column ${x}, row ${y} has no open floor in front of it`);
  }

  // ---- bats and wasps need room to fly ----
  for (const c of ["v", "h"]) {
    for (const [x, y] of spots[c] ?? []) {
      const dirs = c === "v" ? [0, 3] : [1, 2];
      if (!dirs.some((k) => !"#~FRBO".includes(at(x + DX[k], y + DY[k])))) bad(L, `the flyer at column ${x}, row ${y} has no room to fly`);
    }
  }

  // ---- can the level be finished? ----
  // Walk out from P like spilled water. Walls, lava, fire jets and trapdoors are blocked (an
  // open trapdoor is a hole, and a closed one drops you back to the start, so neither may be
  // needed). A door blocks you until you have reached a key of its colour; then it opens, and
  // the key is used up. We repeat until nothing new opens up.
  const blocked = (c) => c === "#" || c === "~" || c === "F" || c === "T";
  const [px, py] = spots.P[0];
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
        if (seen.has(id) || blocked(t)) continue;
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
  for (const c of ["r", "b", "*", "E", "R", "B"]) {
    for (const [x, y] of spots[c] ?? []) {
      if (!seen.has(`${x},${y}`)) {
        const what = { r: "red key", b: "blue key", "*": "gem", E: "exit", R: "red door", B: "blue door" }[c];
        bad(L, `the ${what} at column ${x}, row ${y} cannot be reached (doors need their key first; lava, jets and trapdoors are blocked)`);
      }
    }
  }
  const floorTiles = rows.join("").split("").filter((c) => !blocked(c)).length;
  console.log(`Level ${L} ${level.name} (${level.world}): ${W} x ${H}, ${count("*")} gems, ${count("T")} trapdoors, ${count("F")} jets, reached ${seen.size} of ${floorTiles} open tiles`);
});

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(" - " + p);
  process.exit(1);
}
console.log("Labyrinth maps look good.");
