// THE HERO: the built-in placeholder hero, shared by The Labyrinth and the Hero Workshop (#hero).
// Like all the pixel art, each picture is rows of letters, and each letter is a colour.
import { makeCanvas, paint } from "./kit";

const TILE = 16;

/** What each colour letter is, so the workshop can label them and swap them. */
export const HERO_PARTS: { letter: string; part: string }[] = [
  { letter: "h", part: "Hair" },
  { letter: "s", part: "Skin" },
  { letter: "e", part: "Eyes" },
  { letter: "t", part: "Shirt" },
  { letter: "b", part: "Belt" },
  { letter: "l", part: "Trousers" },
  { letter: "k", part: "Shoes" },
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

// The hero is 16 rows: 12 for the head and body, 4 for the legs. Two leg poses make him walk.
export const HERO_PALETTE: Record<string, string> = {
  o: "#1c1410", h: "#6b3f1d", s: "#f2c9a0", e: "#1c1410", t: "#3fae6a",
  b: "#d9a441", l: "#34437d", k: "#5a3417",
};
const HERO_FRONT = [
  "................",
  "....oooooooo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohssssssho...",
  "...osesssseso...",
  "...osssssssso...",
  ".....osssso.....",
  "....ottttttto...",
  "...osttttttso...",
  "...osbbbbbbso...",
  "....ottttttto...",
];
const HERO_BACK = [
  "................",
  "....oooooooo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  ".....ohhhho.....",
  "....ottttttto...",
  "...osttttttso...",
  "...osbbbbbbso...",
  "....ottttttto...",
];
const HERO_SIDE = [
  "................",
  "....ooooooo.....",
  "...ohhhhhhho....",
  "...ohhhhhhhho...",
  "...ohhhhssssso..",
  "...ohhhhsesssso.",
  "...ohhhhssssso..",
  "....ohhhsssso...",
  "....ottttttto...",
  "....otttttttso..",
  "....obbbbbbbso..",
  "....ottttttto...",
];
const HERO_LEGS_FRONT = [
  ["....ollllllo....", "....olll.llo....", "....okkk..oo....", "....oooo........"],
  ["....ollllllo....", "....ollo.lllo...", ".....oo..okkko..", ".........oooo..."],
];
const HERO_LEGS_SIDE = [
  [".....olllllo....", ".....oll.llo....", ".....okk..kko...", ".....oooo.oooo.."],
  [".....olllllo....", "......ollo......", "......okko......", "......oooo......"],
];

/**
 * The hero's picture sheet: 2 columns (walk frame 1, walk frame 2) by 4 rows (down, left,
 * right, up), each frame 16x16, so the sheet is 32 x 64. YOUR OWN drawing can replace this
 * built-in one: see docs/arcade-art.md.
 */
export function makeHeroSheet(palette: Record<string, string> = HERO_PALETTE) {
  const sheet = makeCanvas(TILE * 2, TILE * 4);
  const g = sheet.getContext("2d")!;
  for (let f = 0; f < 2; f++) {
    const front = paint([...HERO_FRONT, ...HERO_LEGS_FRONT[f]], palette);
    const back = paint([...HERO_BACK, ...HERO_LEGS_FRONT[f]], palette);
    const right = paint([...HERO_SIDE, ...HERO_LEGS_SIDE[f]], palette);
    g.drawImage(front, f * TILE, 0);
    g.drawImage(right, f * TILE, TILE * 2);
    g.drawImage(back, f * TILE, TILE * 3);
    // Facing left is just facing right, flipped like a mirror.
    g.save();
    g.translate(f * TILE + TILE, TILE);
    g.scale(-1, 1);
    g.drawImage(right, 0, 0);
    g.restore();
  }
  return sheet;
}
