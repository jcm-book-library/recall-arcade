// Infinity & Beyond's look: the backdrop for each of its six stages (suns, orbits, moons' parents,
// star rings, the galaxy's glow). The zoom board calls drawBackdrop once per stage; the questions
// themselves are drawn on top by the board.
import { el, type ZoomItem, type ZoomSet } from "./zoomBoard";
import type { Item } from "../engine/types";
import { ARMS, SKY_RING, SKY_Y, STAGES, STAGE_ORDER, SUN_X, orbit } from "../decks/zoomout-data";

const W = 1000;

function drawBackdrop(stage: number, g: SVGGElement) {
  if (stage === 1) {
    el("circle", { cx: SUN_X, cy: 290, r: 150, class: "z-sun" }, g);
    for (const x of [150, 210, 272, 330, 458, 622, 770, 900]) {
      el("circle", { cx: SUN_X, cy: 290, r: orbit(x), class: "z-orbit" }, g);
    }
    el("ellipse", { cx: 622, cy: 290, rx: 62, ry: 12, class: "z-ring" }, g);
  }
  if (stage === 2) {
    // Moons: their planets, already named in the last stage, in their real colours.
    for (const [x, y, r, color, name, ty] of [
      [128, 120, 10, "#4f8fd6", "Earth", 146],
      [305, 110, 28, "#d4a77a", "Jupiter", 154],
      [575, 115, 24, "#e6cf96", "Saturn", 155],
      [812, 110, 14, "#4a6fd1", "Neptune", 88],
    ] as const) {
      el("circle", { cx: x, cy: y, r, class: "z-parent", style: `fill:${color}` }, g);
      el("text", { x, y: ty, class: "z-small z-centre z-known" }, g).textContent = name;
    }
    el("ellipse", { cx: 305, cy: 110, rx: 62, ry: 46, class: "z-orbit" }, g);
    el("text", { x: 500, y: 215, class: "z-caption" }, g).textContent = "Moons";
    el("line", { x1: 0, y1: 240, x2: W, y2: 240, class: "z-divider" }, g);
    // The Sun and planets squashed together at the left.
    el("circle", { cx: 40, cy: 430, r: 14, class: "z-sun" }, g);
    for (const [x, r, color] of [
      [70, 2, "#a7a29a"], [82, 3, "#e3c27d"], [96, 3, "#4f8fd6"], [112, 2, "#c9573a"],
      [200, 7, "#d4a77a"], [260, 6, "#e6cf96"], [320, 4, "#9fd8df"], [370, 4, "#4a6fd1"],
    ] as const) {
      el("circle", { cx: x, cy: 430, r, class: "z-parent", style: `fill:${color}` }, g);
    }
    el("text", { x: 500, y: 300, class: "z-caption" }, g).textContent = "Belts and dwarf planets";
  }
  if (stage === 3) {
    for (const ly of [5, 10]) el("circle", { cx: 500, cy: 280, r: ly * 22, class: "z-orbit" }, g);
    el("text", { x: 500 + 5 * 22 + 4, y: 276, class: "z-small" }, g).textContent = "5 ly";
    el("text", { x: 500 + 10 * 22 + 4, y: 276, class: "z-small" }, g).textContent = "10 ly";
    el("circle", { cx: 500, cy: 280, r: 7, class: "z-sun" }, g);
    el("text", { x: 500, y: 300, class: "z-small z-centre" }, g).textContent = "Sun";
  }
  if (stage === 4) {
    el("circle", { cx: 500, cy: SKY_Y, r: SKY_RING, class: "z-orbit" }, g);
    el("text", { x: 20, y: 30, class: "z-small" }, g).textContent = "The ring: the Sun's path through the year";
    el("text", { x: 20, y: 48, class: "z-small" }, g).textContent = "Real star patterns, north up, as seen looking up";
    el("circle", { cx: 500, cy: SKY_Y, r: 10, class: "z-earth" }, g);
    el("text", { x: 500, y: SKY_Y + 26, class: "z-small z-centre" }, g).textContent = "Earth";
  }
  if (stage === 5) {
    el("ellipse", { cx: 500, cy: 280, rx: 360, ry: 230, class: "z-halo" }, g);
    el("ellipse", { cx: 500, cy: 280, rx: 60, ry: 22, class: "z-bar", transform: "rotate(-25 500 280)" }, g);
  }
  if (stage === 6) {
    el("text", { x: 500, y: 30, class: "z-small z-centre" }, g).textContent = "Not to scale";
  }
}

/** Drawn last so the spiral arms don't cover it: where the Sun sits in the Milky Way. */
function drawOverlay(stage: number, g: SVGGElement) {
  if (stage !== 5) return;
  const [sx, sy] = ARMS.spur.label;
  el("circle", { cx: sx, cy: sy, r: 5, class: "z-you" }, g);
  el("text", { x: sx + 10, y: sy - 10, class: "z-you-label" }, g).textContent = "You are here";
}

export const SPACE_SET: ZoomSet = {
  stages: STAGES,
  order: STAGE_ORDER,
  theme: "zoom-space",
  drawBackdrop,
  drawOverlay,
  itemOf: (i: Item) => i.data as unknown as ZoomItem,
};
