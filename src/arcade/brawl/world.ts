// THE WORLD: turns the level's rows of letters into something the game can ask questions of
// ("is there a wall at this pixel?"). No drawing here and no imports from the page, so the
// checker script can use it too. The letters are explained at the top of level1.ts.
import { TILE } from "./tuning.ts";
import type { HazardSpec, StampedeSpec, Timing } from "./hazards.ts";

/** Letters you can not walk through. */
export const SOLID = new Set("#TgsHB");
/** Letters you can jump up through and then stand on. */
export const ONE_WAY = new Set("=");
/** Letters for signposts (the first letter shows the first line of the level's SIGNS, and so on). */
export const SIGN_KEYS = "1234567890abdefhijklmnoqruvwxyz";

export interface Rect { x: number; y: number; w: number; h: number }

export interface World {
  /** Width and height in tiles. */
  w: number;
  h: number;
  rows: string[];
  /** The letter at a tile. Off the sides is a wall, above the top is open sky, below the bottom is a pit. */
  tile: (tx: number, ty: number) => string;
  solid: (tx: number, ty: number) => boolean;
  oneWay: (tx: number, ty: number) => boolean;
  /** Pixel size of the whole level. */
  pxW: number;
  pxH: number;
  /** Every tile with this letter, as [column, row]. */
  find: (letter: string) => [number, number][];
}

export function makeWorld(rows: string[]): World {
  const w = rows[0].length;
  const h = rows.length;
  const tile = (tx: number, ty: number) => {
    if (tx < 0 || tx >= w) return "#";
    if (ty < 0 || ty >= h) return ".";
    return rows[ty][tx];
  };
  return {
    w, h, rows, tile,
    solid: (tx, ty) => SOLID.has(tile(tx, ty)),
    oneWay: (tx, ty) => ONE_WAY.has(tile(tx, ty)),
    pxW: w * TILE,
    pxH: h * TILE,
    find: (letter) => {
      const out: [number, number][] = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rows[y][x] === letter) out.push([x, y]);
      return out;
    },
  };
}

/** The pixel y of the top of the ground at this column (the first solid or one-way tile from the top), or null for a pit. */
export function groundTop(world: World, tx: number, fromRow = 0): number | null {
  for (let y = fromRow; y < world.h; y++) if (world.solid(tx, y) || world.oneWay(tx, y)) return y * TILE;
  return null;
}

/** Everything one level is made of. Level 1 is in level1.ts; later levels are new files like it. */
export interface LevelData {
  id: string;
  name: string;
  tagline: string;
  rows: string[];
  signs: string[];
  hazards: HazardSpec[];
  timing: Timing;
  /** The pixel y of the ground the throwers aim at. */
  floorY: number;
  stampede?: StampedeSpec;
  medals: { gold: number; silver: number; bronze: number };
  scenes: { kind: "outside" | "tunnel" | "concourse" | "field" | "finale"; from: number; to: number }[];
  sections: { name: string; from: number }[];
}
