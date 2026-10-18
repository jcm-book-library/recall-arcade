import type { Deck, Item } from "../engine/types";
import { createDiagramBoard, svgEl, type DiagramLabel } from "../boards/diagramBoard";

// id | name | other accepted answers | in the starter round?
const BONES: [string, string, string[], boolean][] = [
  ["skull", "Skull", ["Cranium"], true],
  ["mandible", "Mandible", ["Jaw", "Jawbone", "Jaw bone", "Lower jaw"], false],
  ["vertebrae", "Vertebrae", ["Spine", "Vertebral column", "Backbone", "Spinal column", "Vertebra"], true],
  ["clavicle", "Clavicle", ["Collarbone", "Collar bone"], true],
  ["scapula", "Scapula", ["Shoulder blade", "Shoulderblade"], false],
  ["sternum", "Sternum", ["Breastbone", "Breast bone"], true],
  ["ribs", "Ribs", ["Rib", "Rib cage", "Ribcage"], true],
  ["humerus", "Humerus", [], true],
  ["radius", "Radius", [], false],
  ["ulna", "Ulna", [], false],
  ["carpals", "Carpals", ["Carpal", "Wrist bones", "Wrist"], false],
  ["metacarpals", "Metacarpals", ["Metacarpal"], false],
  ["phalanges", "Phalanges", ["Phalanx", "Finger bones", "Toe bones", "Fingers", "Toes"], false],
  ["pelvis", "Pelvis", ["Hip bone", "Hip bones", "Hips", "Pelvic girdle", "Ilium"], true],
  ["sacrum", "Sacrum", [], false],
  ["femur", "Femur", ["Thigh bone", "Thighbone"], true],
  ["patella", "Patella", ["Kneecap", "Knee cap"], true],
  ["tibia", "Tibia", ["Shin bone", "Shinbone", "Shin"], true],
  ["fibula", "Fibula", [], false],
  ["tarsals", "Tarsals", ["Tarsal", "Ankle bones", "Ankle"], false],
  ["metatarsals", "Metatarsals", ["Metatarsal"], false],
];

const items: Item[] = BONES.map(([id, name, aliases, starter]) => ({
  id,
  name,
  aliases,
  tags: starter ? ["starter"] : [],
}));

const W = 800;
const mirror = (x: number) => W - x;

// Labels down the left and right; leader lines point at the left- or right-hand bone.
const L = (y: number, to: [number, number], text: string): DiagramLabel => ({ x: 215, y, to, anchor: "end", text });
const R = (y: number, to: [number, number], text: string): DiagramLabel => ({ x: 585, y, to, anchor: "start", text });
const LABELS: Record<string, DiagramLabel> = {
  skull: L(62, [362, 58], "Skull"),
  clavicle: L(168, [352, 177], "Clavicle"),
  scapula: L(214, [345, 212], "Scapula"),
  humerus: L(256, [334, 250], "Humerus"),
  radius: L(345, [312, 360], "Radius"),
  ulna: L(385, [327, 380], "Ulna"),
  carpals: L(425, [309, 422], "Carpals"),
  metacarpals: L(455, [303, 450], "Metacarpals"),
  phalanges: L(495, [300, 486], "Phalanges"),
  femur: L(565, [371, 560], "Femur"),
  patella: L(652, [370, 652], "Patella"),
  mandible: R(120, [430, 112], "Mandible"),
  vertebrae: R(158, [406, 158], "Vertebrae"),
  sternum: R(232, [407, 226], "Sternum"),
  ribs: R(282, [452, 280], "Ribs"),
  pelvis: R(440, [452, 450], "Pelvis"),
  sacrum: R(478, [404, 446], "Sacrum"),
  tibia: R(720, [mirror(381), 720], "Tibia"),
  fibula: R(752, [mirror(368), 745], "Fibula"),
  tarsals: R(800, [mirror(378), 803], "Tarsals"),
  metatarsals: R(832, [mirror(375), 826], "Metatarsals"),
};

function drawSkeleton(svg: SVGSVGElement) {
  const g = svgEl("g", { class: "skeleton" }, svg);
  const group = (part: string) => svgEl("g", { "data-part": part }, g);

  /** A long bone: a thick rounded line with a darker outline. */
  const bone = (part: SVGGElement, x1: number, y1: number, x2: number, y2: number, w: number) => {
    for (const [x, xx] of [[x1, x2], [mirror(x1), mirror(x2)]]) {
      svgEl("line", { x1: x, y1, x2: xx, y2, "stroke-width": w + 3, class: "bone-edge" }, part);
      svgEl("line", { x1: x, y1, x2: xx, y2, "stroke-width": w, class: "bone" }, part);
    }
  };
  const both = (part: SVGGElement, make: (m: (x: number) => number) => void) => {
    make((x) => x);
    make(mirror);
  };

  // Spine first, so the ribs and pelvis sit on top of it.
  const spine = group("vertebrae");
  for (let y = 126; y < 440; y += 13) svgEl("rect", { x: 394, y, width: 12, height: 10, rx: 2, class: "bone-fill" }, spine);

  const scap = group("scapula");
  both(scap, (m) => svgEl("path", { d: `M${m(336)} 178 L${m(362)} 186 L${m(349)} 244 Z`, class: "bone-fill" }, scap));

  const ribs = group("ribs");
  for (let i = 0; i < 7; i++) {
    const y = 196 + i * 15;
    const out = 346 + i * 1.5;
    both(ribs, (m) =>
      svgEl("path", { d: `M${m(397)} ${y} Q${m(out - 4)} ${y - 2} ${m(out)} ${y + 22}`, class: "bone-line", "stroke-width": 5 }, ribs),
    );
  }

  const sternum = group("sternum");
  svgEl("rect", { x: 393, y: 186, width: 14, height: 80, rx: 5, class: "bone-fill" }, sternum);

  const clav = group("clavicle");
  bone(clav, 394, 182, 344, 174, 7);

  const skull = group("skull");
  svgEl("path", { d: "M356 88 C350 40 375 20 400 20 C425 20 450 40 444 88 C440 104 430 110 400 112 C370 110 360 104 356 88 Z", class: "bone-fill" }, skull);
  for (const x of [384, 416]) svgEl("ellipse", { cx: x, cy: 78, rx: 10, ry: 8, class: "hole" }, skull);
  svgEl("path", { d: "M400 86 L394 100 L406 100 Z", class: "hole" }, skull);

  const jaw = group("mandible");
  svgEl("path", { d: "M368 100 Q372 136 400 140 Q428 136 432 100", class: "bone-line", "stroke-width": 9 }, jaw);

  const hum = group("humerus");
  bone(hum, 342, 190, 327, 300, 13);
  const rad = group("radius");
  bone(rad, 321, 306, 306, 410, 7);
  const uln = group("ulna");
  bone(uln, 333, 306, 322, 412, 7);

  const carp = group("carpals");
  both(carp, (m) => {
    for (const [x, y] of [[308, 420], [318, 418], [313, 428], [323, 427]]) svgEl("circle", { cx: m(x), cy: y, r: 4.5, class: "bone-fill" }, carp);
  });
  const metac = group("metacarpals");
  const phal = group("phalanges");
  const handTop = [300, 307, 314, 321, 328];
  const handMid = [295, 303, 312, 321, 331];
  const handEnd: [number, number][] = [[290, 480], [300, 494], [311, 499], [322, 494], [334, 484]];
  handTop.forEach((x, i) => {
    bone(metac, x, 434, handMid[i], 462, 3.5);
    bone(phal, handMid[i], 466, handEnd[i][0], handEnd[i][1], 3);
  });

  const pelvis = group("pelvis");
  both(pelvis, (m) =>
    svgEl("path", { d: `M${m(396)} 420 C${m(358)} 408 ${m(338)} 424 ${m(344)} 456 C${m(350)} 482 ${m(376)} 492 ${m(397)} 478 Z`, class: "bone-fill" }, pelvis),
  );
  both(pelvis, (m) => svgEl("ellipse", { cx: m(374), cy: 466, rx: 8, ry: 6, class: "hole" }, pelvis));
  const sacrum = group("sacrum");
  svgEl("path", { d: "M386 424 L414 424 L400 472 Z", class: "bone-fill" }, sacrum);

  const femur = group("femur");
  bone(femur, 368, 480, 376, 640, 15);
  const patella = group("patella");
  both(patella, (m) => svgEl("ellipse", { cx: m(377), cy: 652, rx: 8, ry: 9, class: "bone-fill" }, patella));
  const tibia = group("tibia");
  bone(tibia, 380, 664, 382, 790, 11);
  const fibula = group("fibula");
  bone(fibula, 366, 666, 370, 786, 6);

  const tars = group("tarsals");
  both(tars, (m) => {
    for (const [x, y] of [[371, 800], [382, 798], [376, 808], [388, 806]]) svgEl("circle", { cx: m(x), cy: y, r: 5, class: "bone-fill" }, tars);
  });
  const metat = group("metatarsals");
  const footTop = [364, 370, 377, 384, 391];
  const footMid = [358, 365, 373, 382, 391];
  footTop.forEach((x, i) => {
    bone(metat, x, 814, footMid[i], 838, 3.5);
    bone(phal, footMid[i], 842, footMid[i] - 2, 856, 3);
  });
}

export const bonesDeck: Deck = {
  id: "bones",
  title: "Bones of the Body",
  subject: "Science",
  blurb: "A bone lights up on the skeleton. Name it. Or flip it: see the name and click the bone.",
  noun: "bones",
  mode: "prompt",
  clickOption: "click",
  placeholder: "Name this bone…",
  items,
  variants: [
    { id: "starter", label: "The Big Bones", minutes: 3, starter: true, filter: (i) => i.tags.includes("starter") },
    { id: "all", label: "Full Skeleton", minutes: 5, filter: () => true },
  ],
  options: [{ id: "click", label: "Click the bone instead", hint: "See the name, click it on the skeleton", default: false }],
  renderPrompt: (item, how) => {
    const p = document.createElement("p");
    p.className = "prompt-text";
    if (how.click) {
      p.innerHTML = "Click the <strong></strong>";
      p.querySelector("strong")!.textContent = item.name.toLowerCase();
    } else {
      p.textContent = "Which bone is lit up?";
    }
    return p;
  },
  createBoard: ({ container, items: playing }) =>
    createDiagramBoard(
      container,
      { viewBox: "60 0 680 870", draw: drawSkeleton, labels: LABELS, ariaLabel: "Human skeleton, front view" },
      new Set(playing.map((i) => i.id)),
    ),
};
