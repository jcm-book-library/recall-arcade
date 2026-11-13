// THE HERO: BLUEBOTTLE, the built-in starter hero, shared by the island, The Labyrinth and the Hero Workshop (#hero).
// A small cobalt-blue alien with one huge eye, stumpy arms and legs, and two long ears swept back like hair.
// Like all the pixel art, each picture is rows of letters, and each letter is a colour.
import { makeCanvas, paint } from "./kit";

const TILE = 16;

/** What each colour letter is, so the workshop can label them and swap them. */
export const HERO_PARTS: { letter: string; part: string }[] = [
  { letter: "b", part: "Body" },
  { letter: "d", part: "Body shade" },
  { letter: "l", part: "Body highlight" },
  { letter: "p", part: "Belly" },
  { letter: "t", part: "Ear tips" },
  { letter: "u", part: "Ear tip shade" },
  { letter: "w", part: "Eye white" },
  { letter: "e", part: "Pupil" },
  { letter: "s", part: "Eye shine" },
  { letter: "k", part: "Blush" },
  { letter: "o", part: "Outline" },
];

// A hero tried out in the workshop is kept in this browser, as a picture written out as text.
const SAVED_HERO = "learning-arcade:hero";
export function loadSavedHero(): string | null {
  try {
    return localStorage.getItem(SAVED_HERO);
  } catch {
    return null;
  }
}
export function saveHero(dataUrl: string | null): boolean {
  try {
    if (dataUrl) localStorage.setItem(SAVED_HERO, dataUrl);
    else localStorage.removeItem(SAVED_HERO);
    return true;
  } catch {
    return false;
  }
}

// Bluebottle's colours. The side-on hero (hero-side-art.ts) uses the same letters.
export const HERO_PALETTE: Record<string, string> = {
  o: "#0a1f5c", b: "#0047ab", d: "#00337f", l: "#4a8be6", p: "#a9d0ff", t: "#5f9bec", u: "#3d7bd3",
  w: "#ffffff", e: "#0e1238", s: "#ffffff", k: "#ff8fb0",
};

// Each direction is built from layers, back to front, laid over a 16 x 16 grid. A layer is a few
// rows of letters ("." leaves what is underneath alone), so the ears, head, body and feet can be
// drawn one at a time. Facing left is just facing right, flipped like a mirror.
type Rows = Record<number, string>;
const pad = (r: string) => (r + ".".repeat(TILE)).slice(0, TILE);
const flip = (r: string) => [...pad(r)].reverse().join("").replace(/l/g, "d"); // the light stays top left
const shiftDown = (rows: Rows, by: number): Rows => Object.fromEntries(Object.entries(rows).map(([y, r]) => [Number(y) + by, r]));

function compose(...layers: (Rows | null)[]): string[] {
  const g = Array.from({ length: TILE }, () => [...".".repeat(TILE)]);
  for (const rows of layers) {
    if (!rows) continue;
    for (const [y, r] of Object.entries(rows)) [...pad(r)].forEach((ch, x) => { if (ch !== ".") g[Number(y)][x] = ch; });
  }
  return g.map((row) => row.join(""));
}
const mirrorRows = (rows: Rows): Rows => Object.fromEntries(Object.entries(rows).map(([y, r]) => [y, flip(r)]));

// The body, under the head, and the stumps for feet. In step 2 the other foot is the lifted one.
const BODY: Rows = { 10: "....oooooooo....", 11: "....obpppbdo....", 12: "....obbbbbdo...." };
const FEET: Rows[] = [
  { 13: "...obbboobbbo...", 14: "...obbdoooooo...", 15: "....ooo........." },
  { 13: "...obbboobbbo...", 14: "...oooooobbdo...", 15: ".........ooo...." },
];
// The little arms, seen from the front.
const ARMS: Rows = { 11: "..ob........bo..", 12: "..ob........bo.." };

// The face, with the eye round and open at the top and the pupil sitting calmly in the middle.
const DOWN: Rows = {
  1: ".....oooooo.....", 2: "....ollbbbdo....", 3: "...olbwwwwbdo...", 4: "...olwweewwdo...",
  5: "...obweseewdo...", 6: "...okkweewkko...", 7: "...obbwwwwbdo...", 8: "...obbboobbdo...", 9: "...obbbbbbddo...",
};
const UP: Rows = {
  1: ".....oooooo.....", 2: "....ollbbbdo....", 3: "...ollbbbbbdo...", 4: "...olbbbbbbdo...", 5: "...olbbbbbbdo...",
  6: "...obbbbbbbdo...", 7: "...obbbbbbbdo...", 8: "...obbbbbbbdo...", 9: "...obbbbbbbdo...",
};
const RIGHT: Rows = {
  1: "......oooooo....", 2: ".....ollbbbdo...", 3: "....olbbwwwwwo..", 4: "....olbwwweewo..", 5: "....obbwweseeo..",
  6: "....okkbwweewo..", 7: "....obbbbwwwdo..", 8: "....obbbbboodo..", 9: "....obbbbbbddo..",
};
// The ears (swept back, so they hang behind the head). Step 2 drops them 1 pixel: they sway as he walks.
const EAR_DOWN: Rows = { 3: ".oo", 4: "olb", 5: "olb", 6: "olb", 7: "otb", 8: "otb", 9: "ott", 10: "ott", 11: ".oo" };
const EAR_UP: Rows[] = [
  { 3: "....lo", 4: "....lo", 5: "....lo", 6: "....lo", 7: "....lo", 8: "....to", 9: "....to", 10: "....to", 11: "....to", 12: "....oo" },
  { 3: "....lo", 4: "....lo", 5: "....lo", 6: "....lo", 7: "....lo", 8: "....to", 9: "....to", 10: "....to", 11: "....oo" },
];
const EAR_SIDE: Rows = { 3: "...oooo", 4: ".ottbbbo", 5: "ottbbbo", 6: ".ooooo" };

/**
 * The hero's picture sheet: 2 columns (walk frame 1, walk frame 2) by 4 rows (down, left,
 * right, up), each frame 16x16, so the sheet is 32 x 64. YOUR OWN drawing can replace this
 * built-in one: see docs/arcade-art.md.
 */
export function makeHeroSheet(palette: Record<string, string> = HERO_PALETTE) {
  const sheet = makeCanvas(TILE * 2, TILE * 4);
  const g = sheet.getContext("2d")!;
  for (let f = 0; f < 2; f++) {
    const sway = f; // how many pixels the ears have dropped
    const earDown = shiftDown(EAR_DOWN, sway);
    const front = paint(compose(earDown, mirrorRows(earDown), DOWN, BODY, FEET[f], ARMS), palette);
    const back = paint(compose(UP, BODY, FEET[f], EAR_UP[f], mirrorRows(EAR_UP[f])), palette);
    const right = paint(compose(RIGHT, BODY, FEET[f], shiftDown(EAR_SIDE, sway)), palette);
    g.drawImage(front, f * TILE, 0);
    g.drawImage(right, f * TILE, TILE * 2);
    g.drawImage(back, f * TILE, TILE * 3);
    g.save();
    g.translate(f * TILE + TILE, TILE);
    g.scale(-1, 1);
    g.drawImage(right, 0, 0);
    g.restore();
  }
  return sheet;
}
