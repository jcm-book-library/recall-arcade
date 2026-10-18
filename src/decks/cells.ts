import type { Deck, Item } from "../engine/types";
import { createDiagramBoard, svgEl, type DiagramLabel } from "../boards/diagramBoard";

// id | name | other accepted answers | label on the diagram | cell
const PARTS: [string, string, string[], string, "animal" | "plant"][] = [
  ["a-membrane", "Cell membrane", ["Membrane", "Plasma membrane", "Cell surface membrane"], "Cell membrane", "animal"],
  ["a-cytoplasm", "Cytoplasm", ["Cytosol"], "Cytoplasm", "animal"],
  ["a-nucleus", "Nucleus", [], "Nucleus", "animal"],
  ["a-nucleolus", "Nucleolus", [], "Nucleolus", "animal"],
  ["a-mito", "Mitochondria", ["Mitochondrion", "Mitochondrias"], "Mitochondria", "animal"],
  ["a-ribo", "Ribosomes", ["Ribosome"], "Ribosomes", "animal"],
  ["a-rer", "Rough endoplasmic reticulum", ["Rough ER", "RER", "Rough endoplasmic"], "Rough ER", "animal"],
  ["a-ser", "Smooth endoplasmic reticulum", ["Smooth ER", "SER", "Smooth endoplasmic"], "Smooth ER", "animal"],
  ["a-golgi", "Golgi apparatus", ["Golgi", "Golgi body", "Golgi complex"], "Golgi apparatus", "animal"],
  ["a-lyso", "Lysosome", ["Lysosomes"], "Lysosome", "animal"],
  ["a-centri", "Centrioles", ["Centriole", "Centrosome"], "Centrioles", "animal"],
  ["p-wall", "Cell wall", ["Wall"], "Cell wall", "plant"],
  ["p-membrane", "Cell membrane", ["Membrane", "Plasma membrane", "Cell surface membrane"], "Cell membrane", "plant"],
  ["p-cytoplasm", "Cytoplasm", ["Cytosol"], "Cytoplasm", "plant"],
  ["p-nucleus", "Nucleus", [], "Nucleus", "plant"],
  ["p-vacuole", "Vacuole", ["Central vacuole", "Large vacuole", "Large central vacuole", "Permanent vacuole"], "Vacuole", "plant"],
  ["p-chloro", "Chloroplast", ["Chloroplasts"], "Chloroplasts", "plant"],
  ["p-mito", "Mitochondria", ["Mitochondrion"], "Mitochondria", "plant"],
];

const items: Item[] = PARTS.map(([id, name, aliases, , cell]) => ({ id, name, aliases, tags: [cell] }));

const LABELS: Record<string, DiagramLabel> = {};
const lab = (id: string, x: number, y: number, to: [number, number], anchor: "start" | "end") => {
  LABELS[id] = { x, y, to, anchor, text: PARTS.find((p) => p[0] === id)![3] };
};
// Animal cell: centre (300, 260). Labels in the margins left and right.
lab("a-membrane", 120, 108, [222, 150], "end");
lab("a-centri", 120, 150, [248, 172], "end");
lab("a-mito", 120, 200, [196, 214], "end");
lab("a-cytoplasm", 120, 265, [182, 268], "end");
lab("a-ser", 120, 330, [212, 326], "end");
lab("a-lyso", 120, 390, [268, 348], "end");
lab("a-ribo", 480, 120, [334, 172], "start");
lab("a-golgi", 480, 175, [404, 192], "start");
lab("a-rer", 480, 240, [368, 240], "start");
lab("a-nucleolus", 480, 300, [304, 252], "start");
lab("a-nucleus", 480, 350, [322, 288], "start");
// Plant cell: centre (900, 260).
lab("p-wall", 725, 120, [766, 132], "end");
lab("p-membrane", 725, 175, [778, 188], "end");
lab("p-nucleus", 725, 300, [808, 306], "end");
lab("p-cytoplasm", 725, 380, [800, 360], "end");
lab("p-chloro", 1080, 150, [1002, 168], "start");
lab("p-vacuole", 1080, 240, [960, 250], "start");
lab("p-mito", 1080, 330, [1010, 290], "start");

/** A slightly wobbly loop, so the animal cell looks organic rather than a perfect oval. */
function blob(cx: number, cy: number, rx: number, ry: number) {
  const pts: string[] = [];
  for (let i = 0; i < 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    const wobble = 1 + 0.035 * Math.sin(t * 5) + 0.02 * Math.cos(t * 3);
    pts.push(`${(cx + Math.cos(t) * rx * wobble).toFixed(1)} ${(cy + Math.sin(t) * ry * wobble).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}

function mitochondrion(parent: Element, cx: number, cy: number, angle: number) {
  const g = svgEl("g", { transform: `rotate(${angle} ${cx} ${cy})` }, parent);
  svgEl("ellipse", { cx, cy, rx: 26, ry: 12, class: "c-mito" }, g);
  svgEl("path", { d: `M${cx - 18} ${cy} l6 -7 l6 14 l6 -14 l6 14 l6 -14 l6 7`, class: "c-line" }, g);
}

function drawCells(svg: SVGSVGElement) {
  // ----- Animal cell -----
  const a = svgEl("g", {}, svg);
  const shape = blob(300, 260, 155, 122);
  svgEl("path", { d: shape, class: "c-cyto", "data-part": "a-cytoplasm" }, a);
  svgEl("path", { d: shape, class: "c-membrane", "data-part": "a-membrane" }, a);

  const nuc = svgEl("g", { "data-part": "a-nucleus" }, a);
  svgEl("circle", { cx: 300, cy: 258, r: 46, class: "c-nucleus" }, nuc);
  svgEl("circle", { cx: 300, cy: 258, r: 40, class: "c-envelope" }, nuc);
  const nucleolus = svgEl("g", { "data-part": "a-nucleolus" }, a);
  svgEl("circle", { cx: 304, cy: 252, r: 13, class: "c-nucleolus" }, nucleolus);

  const rer = svgEl("g", { "data-part": "a-rer" }, a);
  for (const x of [358, 370, 382]) {
    svgEl("path", { d: `M${x} 212 q8 12 0 24 q-8 12 0 24 q8 12 0 24`, class: "c-er" }, rer);
    for (const y of [218, 236, 254, 272, 290]) svgEl("circle", { cx: x + (y % 36 === 2 ? 4 : -3), cy: y, r: 1.8, class: "c-ribo" }, rer);
  }
  const ser = svgEl("g", { "data-part": "a-ser" }, a);
  for (const y of [318, 330]) svgEl("path", { d: `M190 ${y} q10 -8 20 0 t20 0 t20 0`, class: "c-er" }, ser);

  const golgi = svgEl("g", { "data-part": "a-golgi" }, a);
  for (let i = 0; i < 4; i++) svgEl("path", { d: `M${382 + i * 2} ${178 + i * 8} q22 -10 44 0`, class: "c-golgi" }, golgi);

  const mito = svgEl("g", { "data-part": "a-mito" }, a);
  mitochondrion(mito, 205, 212, -20);
  mitochondrion(mito, 386, 332, 15);

  const lyso = svgEl("g", { "data-part": "a-lyso" }, a);
  svgEl("circle", { cx: 268, cy: 346, r: 11, class: "c-lyso" }, lyso);

  const ribo = svgEl("g", { "data-part": "a-ribo" }, a);
  for (const [x, y] of [[322, 168], [334, 174], [344, 166], [328, 180], [440, 270], [432, 282], [222, 290], [236, 296]]) {
    svgEl("circle", { cx: x, cy: y, r: 3, class: "c-ribo-free" }, ribo);
  }
  const cen = svgEl("g", { "data-part": "a-centri" }, a);
  svgEl("rect", { x: 240, y: 164, width: 18, height: 7, rx: 2, class: "c-centri" }, cen);
  svgEl("rect", { x: 252, y: 168, width: 7, height: 18, rx: 2, class: "c-centri" }, cen);

  // ----- Plant cell -----
  const p = svgEl("g", {}, svg);
  svgEl("rect", { x: 760, y: 124, width: 280, height: 272, rx: 16, class: "c-wall", "data-part": "p-wall" }, p);
  svgEl("rect", { x: 772, y: 136, width: 256, height: 248, rx: 10, class: "c-cyto", "data-part": "p-cytoplasm" }, p);
  svgEl("rect", { x: 772, y: 136, width: 256, height: 248, rx: 10, class: "c-membrane", "data-part": "p-membrane" }, p);
  svgEl("path", { d: "M840 180 C880 160 960 165 985 200 C1000 240 995 310 965 335 C930 355 860 350 842 320 C830 280 828 210 840 180 Z", class: "c-vacuole", "data-part": "p-vacuole" }, p);
  const pn = svgEl("g", { "data-part": "p-nucleus" }, p);
  svgEl("circle", { cx: 806, cy: 306, r: 26, class: "c-nucleus" }, pn);
  svgEl("circle", { cx: 809, cy: 302, r: 8, class: "c-nucleolus" }, pn);
  const chloro = svgEl("g", { "data-part": "p-chloro" }, p);
  for (const [x, y, ang] of [[806, 160, 0], [1002, 168, 70], [1000, 356, -20], [892, 368, 0], [910, 150, 0]]) {
    const g = svgEl("g", { transform: `rotate(${ang} ${x} ${y})` }, chloro);
    svgEl("ellipse", { cx: x, cy: y, rx: 22, ry: 11, class: "c-chloro" }, g);
    for (const dx of [-10, 0, 10]) svgEl("rect", { x: x + dx - 3, y: y - 6, width: 6, height: 12, rx: 1, class: "c-grana" }, g);
  }
  const pm = svgEl("g", { "data-part": "p-mito" }, p);
  mitochondrion(pm, 1008, 268, 90);
}

const VIEW: Record<string, string> = { plant: "620 60 580 400", animal: "0 60 600 400", both: "0 60 1200 400" };

export const cellsDeck: Deck = {
  id: "cells",
  title: "Cells & Life",
  subject: "Science",
  blurb: "Every living thing is made of cells. A part lights up: name it. Or flip it and click the part.",
  noun: "cell parts",
  mode: "prompt",
  clickOption: "click",
  placeholder: "Name this part…",
  items,
  variants: [
    { id: "plant", label: "Plant Cell", minutes: 2, starter: true, filter: (i) => i.tags.includes("plant") },
    { id: "animal", label: "Animal Cell", minutes: 3, filter: (i) => i.tags.includes("animal") },
    { id: "both", label: "Both Cells", minutes: 5, filter: () => true },
  ],
  options: [{ id: "click", label: "Click the part instead", hint: "See the name, click it on the cell", default: false }],
  progressGroups: [
    { tag: "plant", label: "Plant cell" },
    { tag: "animal", label: "Animal cell" },
  ],
  describe: (i) => `${i.name} (${i.tags[0]} cell)`,
  renderPrompt: (item, how) => {
    const p = document.createElement("p");
    p.className = "prompt-text";
    if (how.click) {
      p.innerHTML = "Click the <strong></strong> in the <span></span> cell";
      p.querySelector("strong")!.textContent = item.name.toLowerCase();
      p.querySelector("span")!.textContent = item.tags[0];
    } else {
      p.innerHTML = "Which part of the <span></span> cell is lit up?";
      p.querySelector("span")!.textContent = item.tags[0];
    }
    return p;
  },
  createBoard: ({ container, items: playing, variant }) =>
    createDiagramBoard(
      container,
      { viewBox: VIEW[variant.id] ?? VIEW.both, draw: drawCells, labels: LABELS, ariaLabel: "Diagram of a plant cell and an animal cell" },
      new Set(playing.map((i) => i.id)),
    ),
};
