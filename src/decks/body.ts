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

// id | name | other accepted answers | in the starter round?
const ORGANS: [string, string, string[], boolean][] = [
  ["brain", "Brain", [], true],
  ["trachea", "Trachea", ["Windpipe", "Wind pipe"], false],
  ["oesophagus", "Oesophagus", ["Esophagus", "Gullet", "Food pipe"], false],
  ["lungs", "Lungs", ["Lung"], true],
  ["heart", "Heart", [], true],
  ["liver", "Liver", [], true],
  ["gallbladder", "Gallbladder", ["Gall bladder"], false],
  ["stomach", "Stomach", [], true],
  ["spleen", "Spleen", [], false],
  ["pancreas", "Pancreas", [], false],
  ["kidneys", "Kidneys", ["Kidney"], true],
  ["smallint", "Small intestine", ["Small intestines", "Small bowel", "Intestines", "Gut"], true],
  ["largeint", "Large intestine", ["Large intestines", "Colon", "Large bowel", "Bowel"], false],
  ["appendix", "Appendix", [], false],
  ["bladder", "Bladder", ["Urinary bladder"], true],
];

const items: Item[] = [
  ...BONES.map(([id, name, aliases, starter]) => ({ id, name, aliases, tags: ["bones", ...(starter ? ["starter"] : [])] })),
  ...ORGANS.map(([id, name, aliases, starter]) => ({ id, name, aliases, tags: ["organs", ...(starter ? ["starter"] : [])] })),
];

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

const ORGAN_LABELS: Record<string, DiagramLabel> = {
  brain: L(62, [372, 60], "Brain"),
  trachea: L(170, [396, 172], "Trachea"),
  lungs: L(250, [352, 250], "Lungs"),
  liver: L(318, [362, 318], "Liver"),
  gallbladder: L(352, [378, 350], "Gallbladder"),
  kidneys: L(400, [344, 398], "Kidneys"),
  appendix: L(462, [368, 462], "Appendix"),
  oesophagus: R(150, [409, 150], "Oesophagus"),
  heart: R(262, [418, 270], "Heart"),
  stomach: R(318, [446, 322], "Stomach"),
  spleen: R(290, [470, 306], "Spleen"),
  pancreas: R(352, [430, 356], "Pancreas"),
  largeint: R(392, [440, 400], "Large intestine"),
  smallint: R(428, [408, 425], "Small intestine"),
  bladder: R(478, [400, 476], "Bladder"),
};

/** A soft body outline with the organs drawn inside it. */
function drawOrgans(svg: SVGSVGElement) {
  const g = svgEl("g", { class: "organs" }, svg);
  const part = (id: string) => svgEl("g", { "data-part": id }, g);
  svgEl("path", {
    d: "M400 14 C440 14 452 50 448 86 C444 112 430 122 424 132 L428 150 C470 158 498 170 500 200 L506 330 C508 380 496 430 480 500 L468 860 L420 860 L404 520 L396 520 L380 860 L332 860 L320 500 C304 430 292 380 294 330 L300 200 C302 170 330 158 372 150 L376 132 C370 122 356 112 352 86 C348 50 360 14 400 14 Z",
    class: "body-outline",
  }, g);
  const brain = part("brain");
  svgEl("path", { d: "M366 66 C362 40 384 28 400 30 C420 28 440 40 436 66 C434 80 420 84 400 84 C380 84 368 80 366 66 Z", class: "o-brain" }, brain);
  svgEl("path", { d: "M400 32 L400 82 M380 44 q8 10 0 20 M420 44 q-8 10 0 20", class: "o-fold" }, brain);
  const kid = part("kidneys");
  for (const x of [344, 456]) svgEl("ellipse", { cx: x, cy: 398, rx: 12, ry: 20, class: "o-kidney" }, kid);
  const tr = part("trachea");
  svgEl("line", { x1: 396, y1: 140, x2: 396, y2: 210, class: "o-trachea" }, tr);
  const lungs = part("lungs");
  svgEl("path", { d: "M390 200 C360 196 340 214 336 250 C332 286 344 300 368 298 C386 296 392 280 392 250 Z", class: "o-lung" }, lungs);
  svgEl("path", { d: "M410 200 C440 196 462 214 466 250 C470 286 458 300 434 298 C428 296 426 290 426 284 L414 270 Z", class: "o-lung" }, lungs);
  const oes = part("oesophagus");
  svgEl("path", { d: "M409 140 L409 230 Q412 290 428 312", class: "o-oes" }, oes);
  const heart = part("heart");
  svgEl("path", { d: "M400 254 C392 240 404 232 414 242 C424 232 440 240 432 258 C426 272 414 282 410 290 C404 280 396 268 400 254 Z", class: "o-heart" }, heart);
  const liver = part("liver");
  svgEl("path", { d: "M330 306 C348 296 400 296 420 304 C418 318 404 328 386 336 C364 346 340 344 330 332 Z", class: "o-liver" }, liver);
  const gall = part("gallbladder");
  svgEl("ellipse", { cx: 380, cy: 350, rx: 6, ry: 9, class: "o-gall" }, gall);
  const spleen = part("spleen");
  svgEl("ellipse", { cx: 470, cy: 308, rx: 8, ry: 15, class: "o-spleen", transform: "rotate(20 470 308)" }, spleen);
  const stomach = part("stomach");
  svgEl("path", { d: "M428 306 C450 300 466 312 462 330 C458 350 434 356 416 350 C426 340 440 336 436 322 C432 316 426 314 428 306 Z", class: "o-stomach" }, stomach);
  const panc = part("pancreas");
  svgEl("path", { d: "M396 358 C410 348 436 350 452 356 C440 364 418 366 396 362 Z", class: "o-pancreas" }, panc);
  const large = part("largeint");
  svgEl("path", { d: "M366 460 L362 386 Q362 376 372 376 L428 376 Q438 376 438 386 L436 452 Q434 470 412 474 L404 492", class: "o-large" }, large);
  const app = part("appendix");
  svgEl("path", { d: "M366 460 q-2 12 4 18", class: "o-appendix" }, app);
  const small = part("smallint");
  svgEl("path", { d: "M378 396 q8 -8 16 0 t16 0 t16 0 M376 412 q8 8 16 0 t16 0 t16 0 M378 428 q8 -8 16 0 t16 0 t16 0 M380 444 q8 8 16 0 t16 0 t14 0", class: "o-small" }, small);
  const bladder = part("bladder");
  svgEl("path", { d: "M388 470 C386 486 392 496 400 496 C408 496 414 486 412 470 C406 466 394 466 388 470 Z", class: "o-bladder" }, bladder);
}

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

export const bodyDeck: Deck = {
  id: "body",
  title: "The Human Body",
  subject: "Science",
  blurb: "Bones and organs, one at a time. A part lights up: name it. Or flip it: see the name and click the part.",
  noun: "body parts",
  mode: "prompt",
  clickOption: "click",
  placeholder: "Name this part…",
  items,
  variants: [
    { id: "bigbones", label: "The Big Bones", minutes: 3, starter: true, filter: (i) => i.tags.includes("bones") && i.tags.includes("starter") },
    { id: "bones", label: "Full Skeleton", minutes: 5, filter: (i) => i.tags.includes("bones") },
    { id: "bigorgans", label: "Major Organs", minutes: 3, starter: true, filter: (i) => i.tags.includes("organs") && i.tags.includes("starter") },
    { id: "organs", label: "All Organs", minutes: 5, filter: (i) => i.tags.includes("organs") },
  ],
  options: [{ id: "click", label: "Click the part instead", hint: "See the name, click it on the body", default: false }],
  renderPrompt: (item, how) => {
    const p = document.createElement("p");
    p.className = "prompt-text";
    if (how.click) {
      p.innerHTML = "Click the <strong></strong>";
      p.querySelector("strong")!.textContent = item.name.toLowerCase();
    } else {
      p.textContent = item.tags.includes("bones") ? "Which bone is lit up?" : "Which organ is lit up?";
    }
    return p;
  },
  createBoard: ({ container, items: playing, variant }) => {
    const organs = variant.id.includes("organs");
    return createDiagramBoard(
      container,
      organs
        ? { viewBox: "60 0 680 520", draw: drawOrgans, labels: ORGAN_LABELS, ariaLabel: "Human body showing the organs" }
        : { viewBox: "60 0 680 870", draw: drawSkeleton, labels: LABELS, ariaLabel: "Human skeleton, front view" },
      new Set(playing.map((i) => i.id)),
    );
  },
};
