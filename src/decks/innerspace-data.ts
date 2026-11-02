// The six stages of Inner Space: skin, cells, one cell, the nucleus, molecules, and an atom.
// Each stage is drawn on a 1000 x 560 view. This is the mirror image of Infinity & Beyond: every
// stage zooms IN, and the view gets about ten to a thousand times closer each time.
//
// How the pieces are drawn:
// - Parts that are NOT questions (air above the skin, a few background cells, the inside of the
//   nucleus) are drawn by `drawBackdrop` at the bottom of this file.
// - Each question is a ZoomItem. Simple ones are a filled "path". Most are "custom": they have a
//   `draw` function that builds the little picture out of circles, lines and curves. Parts that
//   change colour once named use class "mark", with `data-color` (the fill) or `data-stroke` (for
//   lines). Plain decoration that never changes uses class "z-deco".
// - x and y are where the label hangs from, so a label can sit away from a big drawing.
// - Everything is drawn in code. Nothing is copied from anywhere.

import { el, type ZoomItem, type ZoomStage } from "../boards/zoomBoard";

export const INNER_STAGES: ZoomStage[] = [
  { n: 1, title: "Skin up close", scale: "Across this view: about 4 mm, a slice of skin.", fact: "Skin is your largest organ: about 2 square metres of it." },
  { n: 2, title: "Cells of the body", scale: "Across this view: about 0.1 mm, the width of a hair.", fact: "A drop of blood the size of a pinhead holds about 5 million red blood cells." },
  { n: 3, title: "The cell", scale: "Across this view: about 0.02 mm, one animal cell.", fact: "You are made of about 30 trillion cells." },
  { n: 4, title: "Inside the nucleus", scale: "Across this view: about 0.006 mm, one nucleus.", fact: "Unwound, the DNA in one cell would stretch about 2 metres." },
  { n: 5, title: "Molecules", scale: "Across this view: about 2 nanometres (millionths of a millimetre).", fact: "One drop of water holds about 1,700 billion billion water molecules." },
  { n: 6, title: "The atom", scale: "Across this view: about 0.3 nanometres, one atom (the middle is drawn far too big).", fact: "If an atom were a footy stadium, its nucleus would be a pea in the middle. The rest is almost all empty space." },
];

/** Stages are played in order, straight down in size. */
export const INNER_ORDER = [1, 2, 3, 4, 5, 6];

// ---------- small drawing helpers ----------
type G = SVGGElement;
type Attrs = Record<string, string | number>;

/** A filled shape that takes its real colour once named. */
const fillMark = (g: G, tag: "circle" | "ellipse" | "path" | "rect", attrs: Attrs, color: string) =>
  el(tag, { ...attrs, class: "mark", "data-color": color }, g);

/** A line-shaped marker (a vessel, a strand). Rounded ends; takes its colour once named. */
const lineMark = (g: G, d: string, width: number, color: string) =>
  el("path", { d, class: "mark line", "data-stroke": color, style: `stroke-width:${width}px` }, g);

/** Decoration that never changes: soft outlines and details. `cls` picks the look. */
const deco = (g: G, tag: "circle" | "ellipse" | "path" | "rect" | "line", attrs: Attrs, cls = "z-deco") => el(tag, { ...attrs, class: cls }, g);

/** An invisible, easy-to-hit area, so thin things (DNA, a vessel) are simple to click. */
const hitRect = (g: G, x: number, y: number, w: number, h: number) => el("rect", { x, y, width: w, height: h, class: "hit-fill" }, g);

const pts = (list: [number, number][]) => list.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

/** A wavy horizontal edge across the whole view, as a list of points. */
function edge(y: number, amp: number, wave: number, phase = 0): [number, number][] {
  const out: [number, number][] = [];
  for (let x = 0; x <= 1000; x += 10) out.push([x, y + amp * Math.sin((x / wave) * Math.PI * 2 + phase)]);
  return out;
}

/** A layer of skin: the space between a top edge and a bottom edge. */
function layer(top: [number, number][], bottom: [number, number][]) {
  return `${pts(top)} ${pts([...bottom].reverse()).replace("M", "L")} Z`;
}

// The skin's three layers share edges, so they fit together with no gaps.
const SURFACE = edge(172, 2, 160);
const EPI_BASE = edge(214, 6, 60); // the bumpy join between epidermis and dermis
const DERMIS_BASE = edge(350, 4, 220, 1);
const FAT_BASE = edge(470, 3, 200, 2);

// ---------- 1. Skin ----------
const skinLabelsAt = { epi: 193, dermis: 285, fat: 415 };

const fatCells: [number, number, number][] = [[110, 390, 30], [215, 440, 28], [330, 392, 32], [415, 448, 26], [620, 445, 30], [715, 395, 30], [805, 445, 28], [910, 398, 32]];

const SKIN: ZoomItem[] = [
  { id: "epidermis", name: "Epidermis", aliases: ["outer skin", "top layer"], stage: 1, shape: "path", d: layer(SURFACE, EPI_BASE), color: "#e9b79c", x: 560, y: skinLabelsAt.epi, label: "below", gap: 0 },
  { id: "dermis", name: "Dermis", stage: 1, shape: "path", d: layer(EPI_BASE, DERMIS_BASE), color: "#d98a86", x: 110, y: skinLabelsAt.dermis, label: "below", gap: 0 },
  {
    id: "fat", name: "Fat layer", aliases: ["subcutaneous fat", "hypodermis", "subcutis"], stage: 1, shape: "custom",
    x: 520, y: skinLabelsAt.fat, label: "below", gap: 0,
    draw: (g) => {
      fillMark(g, "path", { d: layer(DERMIS_BASE, FAT_BASE) }, "#f2d98c");
      // Fat cells: big, round, almost empty.
      for (const [x, y, r] of fatCells) deco(g, "circle", { cx: x, cy: y, r });
    },
  },
  {
    id: "follicle", name: "Hair follicle", aliases: ["follicle"], stage: 1, shape: "custom", x: 276, y: 258, label: "right", gap: 14,
    draw: (g) => {
      // The tube the hair grows from, with the hair inside it and a bulb at the bottom.
      lineMark(g, "M274 176 Q264 240 247 292", 15, "#c9a27a");
      fillMark(g, "circle", { cx: 245, cy: 306, r: 19 }, "#c9a27a");
      deco(g, "path", { d: "M274 170 Q264 240 247 300", "stroke-width": 4 }, "z-hair");
    },
  },
  {
    id: "sweat", name: "Sweat gland", stage: 1, shape: "custom", x: 808, y: 305, label: "right", gap: 14,
    draw: (g) => {
      // A coiled tube in the dermis, and a thin duct up to a pore on the surface.
      const coil: [number, number][] = [];
      for (let t = 0; t <= Math.PI * 6; t += 0.25) coil.push([772 + (5 + t * 1.5) * Math.cos(t), 304 + (5 + t * 1.5) * Math.sin(t)]);
      lineMark(g, pts(coil), 6, "#7fd0e8");
      lineMark(g, "M772 276 C 760 244 785 212 772 172", 6, "#7fd0e8");
      hitRect(g, 740, 270, 66, 66);
    },
  },
  {
    id: "vessel", name: "Blood vessel", aliases: ["capillary", "artery", "vein"], stage: 1, shape: "custom", x: 545, y: 290, label: "below", gap: 0,
    draw: (g) => {
      // One main vessel with two tiny hairpin loops reaching up toward the surface.
      lineMark(g, "M400 330 L690 330", 15, "#e0524f");
      lineMark(g, "M452 330 V 252 a 12 12 0 0 1 24 0 V 330", 6, "#e0524f");
      lineMark(g, "M622 330 V 252 a 12 12 0 0 1 24 0 V 330", 6, "#e0524f");
    },
  },
];

// ---------- 2. Cells of the body ----------
/** A six-sided cell, pointy side up. */
const hex = (cx: number, cy: number, r: number) =>
  pts(Array.from({ length: 6 }, (_, k) => [cx + r * Math.cos(((60 * k - 90) * Math.PI) / 180), cy + r * Math.sin(((60 * k - 90) * Math.PI) / 180)] as [number, number])) + " Z";

const CELLS: ZoomItem[] = [
  {
    id: "rbc", name: "Red blood cell", aliases: ["red cell", "erythrocyte"], stage: 2, shape: "custom", x: 160, y: 244, label: "below", gap: 4,
    draw: (g) => {
      // Flat discs with a dent in the middle, like a doughnut that has not quite got a hole.
      for (const [x, y, r] of [[126, 150, 33], [188, 172, 30], [140, 206, 27]]) {
        fillMark(g, "circle", { cx: x, cy: y, r }, "#d8454b");
        deco(g, "ellipse", { cx: x, cy: y, rx: r * 0.5, ry: r * 0.5 }, "z-dent");
      }
    },
  },
  {
    id: "wbc", name: "White blood cell", aliases: ["white cell", "leukocyte"], stage: 2, shape: "custom", x: 420, y: 214, label: "below", gap: 4,
    draw: (g) => {
      fillMark(g, "circle", { cx: 420, cy: 150, r: 46 }, "#dfe6ef");
      // A lumpy nucleus, and a sprinkle of granules.
      for (const [x, y, r] of [[404, 140, 15], [432, 148, 14], [412, 166, 12]]) deco(g, "circle", { cx: x, cy: y, r }, "z-lump");
      for (const [x, y] of [[392, 172], [440, 124], [446, 172], [396, 118]]) deco(g, "circle", { cx: x, cy: y, r: 2.5 }, "z-lump");
    },
  },
  {
    id: "platelet", name: "Platelet", aliases: ["platelets"], stage: 2, shape: "custom", x: 640, y: 192, label: "below", gap: 4,
    draw: (g) => {
      // Tiny scraps of cell, much smaller than the others.
      for (const [x, y, rx, ry, rot] of [[626, 140, 11, 6, -20], [654, 150, 10, 6, 25], [638, 166, 9, 5, 5]]) {
        fillMark(g, "ellipse", { cx: x, cy: y, rx, ry, transform: `rotate(${rot} ${x} ${y})` }, "#f2c36b");
      }
    },
  },
  {
    id: "skincell", name: "Skin cell", aliases: ["epithelial cell"], stage: 2, shape: "custom", x: 860, y: 228, label: "below", gap: 4,
    draw: (g) => {
      // Skin cells fit together like tiles.
      for (const [x, y] of [[838, 140], [883, 140], [860.5, 179]]) {
        fillMark(g, "path", { d: hex(x, y, 26) }, "#e8b49b");
        deco(g, "circle", { cx: x, cy: y, r: 7 }, "z-lump");
      }
    },
  },
  {
    id: "nerve", name: "Nerve cell", aliases: ["neuron", "neurone"], stage: 2, shape: "custom", x: 290, y: 470, label: "below", gap: 4,
    draw: (g) => {
      // A body with branching feelers, and one long fibre carrying the message away.
      lineMark(g, "M184 392 Q300 372 420 428", 6, "#b69cf0");
      lineMark(g, "M420 428 L452 410 M420 428 L458 442 M420 428 L450 428", 4, "#b69cf0");
      lineMark(g, "M144 380 L108 350 L92 354 M108 350 L104 330 M142 410 L104 438 L88 436 M104 438 L100 458 M158 366 L150 336 L134 326", 4, "#b69cf0");
      fillMark(g, "circle", { cx: 162, cy: 392, r: 26 }, "#b69cf0");
      deco(g, "circle", { cx: 162, cy: 392, r: 9 }, "z-lump");
    },
  },
  {
    id: "muscle", name: "Muscle cell", aliases: ["muscle fibre", "muscle fiber"], stage: 2, shape: "custom", x: 750, y: 440, label: "below", gap: 4,
    draw: (g) => {
      // A long thread with faint stripes, and several nuclei along its edge.
      fillMark(g, "rect", { x: 590, y: 358, width: 320, height: 54, rx: 27 }, "#c4625c");
      for (let x = 624; x < 880; x += 14) deco(g, "line", { x1: x, y1: 364, x2: x, y2: 406 }, "z-stripe");
      for (const x of [650, 740, 830]) deco(g, "ellipse", { cx: x, cy: x === 740 ? 405 : 364, rx: 11, ry: 5 }, "z-lump");
    },
  },
];

// ---------- 3. The cell ----------
const CELL_RX = 380;
const CELL_RY = 235;
const CELL_C: [number, number] = [500, 285];

const CELL: ZoomItem[] = [
  { id: "cytoplasm", name: "Cytoplasm", stage: 3, shape: "custom", x: 255, y: 420, label: "below", gap: 0, draw: (g) => fillMark(g, "ellipse", { cx: CELL_C[0], cy: CELL_C[1], rx: CELL_RX - 4, ry: CELL_RY - 4 }, "#4f9fa6") },
  {
    id: "membrane", name: "Cell membrane", aliases: ["membrane", "plasma membrane"], stage: 3, shape: "custom", x: 500, y: 50, label: "above", gap: 12,
    draw: (g) => {
      const outline = el("ellipse", { cx: CELL_C[0], cy: CELL_C[1], rx: CELL_RX, ry: CELL_RY, class: "mark line", "data-stroke": "#f2b266", style: "stroke-width:9px" }, g);
      outline.setAttribute("fill", "none");
    },
  },
  {
    id: "nucleus", name: "Nucleus", stage: 3, shape: "custom", x: 470, y: 272, label: "below", gap: 0,
    draw: (g) => {
      fillMark(g, "circle", { cx: 470, cy: 272, r: 92 }, "#8a74d1");
      for (const [x, y] of [[420, 230], [520, 235], [430, 315], [515, 320], [475, 218], [395, 275], [545, 280]]) deco(g, "circle", { cx: x, cy: y, r: 3 }, "z-lump");
    },
  },
  {
    id: "mito", name: "Mitochondrion", aliases: ["mitochondria"], stage: 3, shape: "custom", x: 730, y: 262, label: "below", gap: 6,
    draw: (g) => {
      // A bean with a folded inner wall.
      const t = "rotate(-20 730 215)";
      fillMark(g, "ellipse", { cx: 730, cy: 215, rx: 64, ry: 30, transform: t }, "#f08a5d");
      deco(g, "path", { d: "M690 215 Q700 190 710 215 T730 215 T750 215 T770 215", transform: t });
    },
  },
  {
    id: "ribosome", name: "Ribosome", aliases: ["ribosomes"], stage: 3, shape: "custom", x: 625, y: 432, label: "below", gap: 6,
    draw: (g) => {
      // Lots of tiny dots, scattered about.
      for (const [dx, dy] of [[-48, -10], [-14, 10], [22, -20], [52, 8], [-4, -34], [-30, 24], [32, 30], [-62, 20], [70, -22]]) {
        fillMark(g, "circle", { cx: 625 + dx, cy: 385 + dy, r: 6 }, "#f0c75e");
      }
    },
  },
  { id: "vacuole", name: "Vacuole", stage: 3, shape: "custom", x: 300, y: 206, label: "below", gap: 6, draw: (g) => fillMark(g, "circle", { cx: 300, cy: 160, r: 36 }, "#9fd0f0") },
];

// ---------- 4. Inside the nucleus ----------
const NUC_C: [number, number] = [500, 280];
const NUC_R = 235;

/** A chromosome: two stubby arms crossing in an X. */
function chromosome(g: G, cx: number, cy: number, s: number, rot: number) {
  const t = `rotate(${rot} ${cx} ${cy})`;
  for (const d of [`M${cx - s} ${cy - s} L${cx + s} ${cy + s}`, `M${cx + s} ${cy - s} L${cx - s} ${cy + s}`]) {
    const p = lineMark(g, d, 15, "#e86aa6");
    p.setAttribute("transform", t);
  }
}

/** Two twisting strands joined by rungs. */
const helix = (y: number, x0: number, x1: number, amp: number, wave: number, phase: number) => {
  const out: [number, number][] = [];
  for (let x = x0; x <= x1; x += 4) out.push([x, y + amp * Math.sin(((x - x0) / wave) * Math.PI * 2 + phase)]);
  return out;
};

const HELIX_Y = 420;

const NUCLEUS: ZoomItem[] = [
  {
    id: "envelope", name: "Nuclear envelope", aliases: ["nuclear membrane"], stage: 4, shape: "custom", x: 330, y: 112, label: "left", gap: 14, to: [NUC_C[0] - NUC_R * 0.72, NUC_C[1] - NUC_R * 0.69],
    draw: (g) => {
      // Two membranes, one inside the other.
      el("circle", { cx: NUC_C[0], cy: NUC_C[1], r: NUC_R, class: "mark line", "data-stroke": "#f2b266", style: "stroke-width:7px", fill: "none" }, g);
      deco(g, "circle", { cx: NUC_C[0], cy: NUC_C[1], r: NUC_R - 11 });
    },
  },
  {
    id: "nucleolus", name: "Nucleolus", stage: 4, shape: "custom", x: 385, y: 215, label: "below", gap: 0,
    draw: (g) => {
      fillMark(g, "circle", { cx: 385, cy: 215, r: 54 }, "#7a4fa0");
      for (const [x, y] of [[360, 200], [405, 190], [395, 240], [364, 232]]) deco(g, "circle", { cx: x, cy: y, r: 4 }, "z-lump");
    },
  },
  {
    id: "chromosome", name: "Chromosome", aliases: ["chromosomes"], stage: 4, shape: "custom", x: 640, y: 338, label: "below", gap: 8,
    draw: (g) => {
      chromosome(g, 590, 160, 30, 12);
      chromosome(g, 662, 244, 29, -18);
      chromosome(g, 580, 292, 27, 25);
    },
  },
  {
    id: "dna", name: "DNA", aliases: ["deoxyribonucleic acid", "double helix"], stage: 4, shape: "custom", x: 372, y: 392, label: "above", gap: 6,
    draw: (g) => {
      const a = helix(HELIX_Y, 350, 650, 22, 100, 0);
      const b = helix(HELIX_Y, 350, 650, 22, 100, Math.PI);
      for (let i = 0; i < a.length; i += 3) lineMark(g, `M${a[i][0]} ${a[i][1].toFixed(1)} L${b[i][0]} ${b[i][1].toFixed(1)}`, 2.5, "#dff1ff");
      lineMark(g, pts(a), 6, "#4fc3f7");
      lineMark(g, pts(b), 6, "#f78fb3");
      hitRect(g, 350, HELIX_Y - 28, 300, 56);
    },
  },
  {
    id: "gene", name: "Gene", aliases: ["genes"], stage: 4, shape: "custom", x: 510, y: 478, label: "below", gap: 6,
    draw: (g) => {
      // One stretch of the DNA, highlighted.
      fillMark(g, "rect", { x: 468, y: HELIX_Y - 34, width: 84, height: 68, rx: 16 }, "rgba(255, 210, 77, 0.55)");
    },
  },
];

// ---------- 5. Molecules ----------
// Ball-and-stick models in the usual colours: oxygen red, hydrogen white, carbon dark grey.
const ATOM = { O: { color: "#e8453c", r: 26 }, H: { color: "#f4f4f4", r: 16 }, C: { color: "#5b6068", r: 24 } };

const ball = (g: G, x: number, y: number, kind: keyof typeof ATOM, r = ATOM[kind].r) =>
  fillMark(g, "circle", { cx: x, cy: y, r }, ATOM[kind].color);
const stick = (g: G, x1: number, y1: number, x2: number, y2: number, w = 6) => lineMark(g, `M${x1} ${y1} L${x2} ${y2}`, w, "#b8c4cc");
/** A double bond: two sticks side by side. */
const doubleStick = (g: G, x1: number, y1: number, x2: number, y2: number) => {
  const dy = 7;
  stick(g, x1, y1 - dy, x2, y2 - dy, 5);
  stick(g, x1, y1 + dy, x2, y2 + dy, 5);
};

/** Glucose: a ring of five carbons and one oxygen, with OH groups sticking out. */
function glucose(g: G, cx: number, cy: number) {
  const R = 50;
  const verts = Array.from({ length: 6 }, (_, k) => {
    const a = ((60 * k - 90) * Math.PI) / 180;
    return { a, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
  verts.forEach((v, k) => stick(g, v.x, v.y, verts[(k + 1) % 6].x, verts[(k + 1) % 6].y));
  verts.forEach((v, k) => {
    if (k === 1) return; // this corner of the ring is the oxygen
    const ox = v.x + 34 * Math.cos(v.a);
    const oy = v.y + 34 * Math.sin(v.a);
    stick(g, v.x, v.y, ox, oy);
    const hx = ox + 22 * Math.cos(v.a + 0.9);
    const hy = oy + 22 * Math.sin(v.a + 0.9);
    stick(g, ox, oy, hx, hy, 4);
    ball(g, ox, oy, "O", 12);
    ball(g, hx, hy, "H", 8);
  });
  verts.forEach((v, k) => ball(g, v.x, v.y, k === 1 ? "O" : "C", 15));
}

/** Protein: a long chain of beads that has folded up on itself. */
function protein(g: G, cx: number, cy: number) {
  // Hand-placed points that make an S-shaped fold, with a loop in the middle.
  const shape: [number, number][] = [
    [0, 0], [24, -8], [46, -22], [68, -38], [92, -46], [116, -38], [130, -18], [122, 4], [100, 14], [76, 10],
    [54, 20], [42, 42], [50, 64], [72, 74], [96, 70], [116, 56], [140, 54], [162, 64],
  ];
  const beads = shape.map(([x, y]) => [x * 1.25, y * 1.25] as [number, number]);
  const xs = beads.map((b) => b[0]);
  const ys = beads.map((b) => b[1]);
  const ox = cx - (Math.min(...xs) + Math.max(...xs)) / 2;
  const oy = cy - (Math.min(...ys) + Math.max(...ys)) / 2;
  const at = beads.map(([x, y]) => [x + ox, y + oy] as [number, number]);
  at.forEach((b, i) => i && stick(g, at[i - 1][0], at[i - 1][1], b[0], b[1], 5));
  at.forEach(([x, y], i) => fillMark(g, "circle", { cx: x, cy: y, r: 11 }, `hsl(${190 + i * 10} 70% 62%)`));
}

const MOLECULES: ZoomItem[] = [
  {
    id: "water", name: "Water", aliases: ["H2O"], stage: 5, shape: "custom", x: 170, y: 222, label: "below", gap: 4,
    draw: (g) => {
      stick(g, 170, 150, 121, 188);
      stick(g, 170, 150, 219, 188);
      ball(g, 170, 150, "O");
      ball(g, 121, 188, "H");
      ball(g, 219, 188, "H");
    },
  },
  {
    id: "oxygen", name: "Oxygen", aliases: ["O2", "oxygen molecule"], stage: 5, shape: "custom", x: 500, y: 192, label: "below", gap: 4,
    draw: (g) => {
      doubleStick(g, 455, 150, 545, 150);
      ball(g, 455, 150, "O", 28);
      ball(g, 545, 150, "O", 28);
    },
  },
  {
    id: "co2", name: "Carbon dioxide", aliases: ["CO2"], stage: 5, shape: "custom", x: 820, y: 192, label: "below", gap: 4,
    draw: (g) => {
      doubleStick(g, 740, 150, 820, 150);
      doubleStick(g, 820, 150, 900, 150);
      ball(g, 820, 150, "C");
      ball(g, 740, 150, "O", 28);
      ball(g, 900, 150, "O", 28);
    },
  },
  { id: "glucose", name: "Glucose", aliases: ["sugar", "C6H12O6"], stage: 5, shape: "custom", x: 240, y: 505, label: "below", gap: 4, draw: (g) => glucose(g, 240, 385) },
  { id: "protein", name: "Protein", aliases: ["proteins"], stage: 5, shape: "custom", x: 700, y: 490, label: "below", gap: 4, draw: (g) => protein(g, 700, 390) },
];

// ---------- 6. The atom ----------
// A Bohr-style carbon atom: 6 protons and 6 neutrons in the middle, 2 + 4 electrons on two rings.
const A: [number, number] = [500, 280];
const RING_1 = 130;
const RING_2 = 225;
const polar = (r: number, deg: number): [number, number] => [A[0] + r * Math.cos((deg * Math.PI) / 180), A[1] + r * Math.sin((deg * Math.PI) / 180)];

/** The 12 particles in the middle, packed in rings: one in the centre, six, then five. */
const PARTICLES: { x: number; y: number; kind: "p" | "n" }[] = (() => {
  const kinds = "pnpnpn" + "pnpnn";
  const list: { x: number; y: number; kind: "p" | "n" }[] = [{ x: A[0], y: A[1], kind: "p" }];
  for (let k = 0; k < 6; k++) list.push({ x: polar(32, 60 * k)[0], y: polar(32, 60 * k)[1], kind: kinds[k] as "p" | "n" });
  for (let k = 0; k < 5; k++) list.push({ x: polar(60, 18 + 72 * k)[0], y: polar(60, 18 + 72 * k)[1], kind: kinds[6 + k] as "p" | "n" });
  return list;
})();
const particleTo = (kind: "p" | "n", pick: (a: { x: number; y: number }, b: { x: number; y: number }) => boolean): [number, number] => {
  const best = PARTICLES.filter((p) => p.kind === kind).reduce((a, b) => (pick(a, b) ? a : b));
  return [best.x, best.y];
};

const ELECTRONS: [number, number][] = [polar(RING_1, 200), polar(RING_1, 20), polar(RING_2, 55), polar(RING_2, 145), polar(RING_2, 235), polar(RING_2, 325)];

const ATOM_ITEMS: ZoomItem[] = [
  {
    id: "shell", name: "Electron shell", aliases: ["shell", "orbit", "energy level", "electron orbit"], stage: 6, shape: "custom", x: 205, y: 110, label: "left", gap: 10, to: polar(RING_2, 217),
    draw: (g) => {
      for (const r of [RING_1, RING_2]) {
        el("circle", { cx: A[0], cy: A[1], r, class: "mark line", "data-stroke": "#7fe0ff", style: "stroke-width:4px", fill: "none" }, g);
        el("circle", { cx: A[0], cy: A[1], r, class: "hit", style: "stroke-width:18px" }, g);
      }
    },
  },
  {
    id: "atomnucleus", name: "Atomic nucleus", aliases: ["nucleus of the atom", "atom nucleus"], stage: 6, shape: "custom", x: 795, y: 130, label: "right", gap: 10, to: polar(82, -40),
    draw: (g) => fillMark(g, "circle", { cx: A[0], cy: A[1], r: 82 }, "rgba(255, 210, 122, 0.4)"),
  },
  {
    id: "neutron", name: "Neutron", aliases: ["neutrons"], stage: 6, shape: "custom", x: 795, y: 440, label: "right", gap: 10, to: particleTo("n", (a, b) => a.y > b.y),
    draw: (g) => { for (const p of PARTICLES) if (p.kind === "n") fillMark(g, "circle", { cx: p.x, cy: p.y, r: 15 }, "#9aa7b8"); },
  },
  {
    id: "proton", name: "Proton", aliases: ["protons"], stage: 6, shape: "custom", x: 795, y: 290, label: "right", gap: 10, to: particleTo("p", (a, b) => a.x > b.x),
    draw: (g) => { for (const p of PARTICLES) if (p.kind === "p") fillMark(g, "circle", { cx: p.x, cy: p.y, r: 15 }, "#ff6b6b"); },
  },
  {
    id: "electron", name: "Electron", aliases: ["electrons"], stage: 6, shape: "custom", x: 205, y: 470, label: "left", gap: 10, to: ELECTRONS[3],
    draw: (g) => { for (const [x, y] of ELECTRONS) fillMark(g, "circle", { cx: x, cy: y, r: 10 }, "#5ec8ff"); },
  },
];

// Which stage each item belongs to is set above; here they are in play order.
export const INNER_ITEMS: ZoomItem[] = [...SKIN, ...CELLS, ...CELL, ...NUCLEUS, ...MOLECULES, ...ATOM_ITEMS];

// ---------- backdrops: the parts that are not questions ----------
export function drawInnerBackdrop(stage: number, g: SVGGElement) {
  if (stage === 1) {
    // One hair poking out above the skin, and a band of muscle underneath.
    el("path", { d: "M274 176 Q282 112 332 64", class: "z-hair", "stroke-width": 5 }, g);
    el("path", { d: `M0 466 ${pts(edge(466, 3, 200, 2)).replace("M", "L")} L1000 560 L0 560 Z`, class: "z-muscle" }, g);
    el("text", { x: 500, y: 520, class: "z-small z-centre" }, g).textContent = "muscle underneath";
  }
  if (stage === 2) {
    // A few soft, out-of-focus cells in the background.
    for (const [x, y, r] of [[70, 290, 62], [300, 300, 48], [520, 290, 72], [770, 270, 52], [940, 320, 50], [500, 60, 40], [930, 60, 38], [60, 60, 34]]) {
      el("circle", { cx: x, cy: y, r, class: "z-bgcell" }, g);
    }
  }
  if (stage === 4) {
    // The jelly inside the nucleus, around the named parts.
    el("circle", { cx: NUC_C[0], cy: NUC_C[1], r: NUC_R, class: "z-jelly" }, g);
  }
  if (stage === 5) {
    el("text", { x: 500, y: 546, class: "z-small z-centre" }, g).textContent = "Red: oxygen atom · White: hydrogen atom · Dark grey: carbon atom";
  }
  if (stage === 6) {
    // A soft glow where the middle is, and a note.
    el("circle", { cx: A[0], cy: A[1], r: 100, class: "z-jelly" }, g);
    el("text", { x: 500, y: 548, class: "z-small z-centre" }, g).textContent = "A carbon atom";
  }
}
