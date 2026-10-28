import type { Deck, Item } from "../engine/types";
import { createDiagramBoard, svgEl, type DiagramLabel } from "../boards/diagramBoard";
import { createSkeletonBoard } from "../boards/skeletonBoard";
import { pictureBoard } from "../boards/pictureBoard";

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

// Extra bones, only in the "Spine & Chest Detail" round. Same columns, without the starter flag.
const BONE_DETAIL: [string, string, string[]][] = [
  ["cervical", "Cervical vertebrae", ["Cervical vertebra", "Cervical spine", "Neck vertebrae", "Neck bones", "Cervical"]],
  ["thoracic", "Thoracic vertebrae", ["Thoracic vertebra", "Thoracic spine", "Thoracic", "Chest vertebrae", "Upper back vertebrae"]],
  ["lumbar", "Lumbar vertebrae", ["Lumbar vertebra", "Lumbar spine", "Lumbar", "Lower back vertebrae"]],
  ["coccyx", "Coccyx", ["Tailbone", "Tail bone"]],
  ["manubrium", "Manubrium", ["Manubrium of the sternum", "Top of the breastbone"]],
];

// Which parts of the skeleton picture (ids in src/assets/skeleton-front.svg) each bone lights up.
// Left and right sides are one item.
const BONE_GROUPS: Record<string, string[]> = {
  skull: ["cranium", "face"],
  mandible: ["mandible"],
  vertebrae: ["cervical", "thoracic", "lumbar"],
  clavicle: ["clavicle-l", "clavicle-r"],
  scapula: ["scapula"],
  sternum: ["sternum", "manubrium"],
  ribs: ["ribs"],
  humerus: ["humerus-l", "humerus-r"],
  radius: ["radius-l", "radius-r"],
  ulna: ["ulna-l", "ulna-r"],
  carpals: ["carpals-l", "carpals-r"],
  metacarpals: ["metacarpals-l", "metacarpals-r"],
  phalanges: ["phalanges-l", "phalanges-r", "toes-l", "toes-r"],
  pelvis: ["pelvis"],
  sacrum: ["sacrum"],
  femur: ["femur-l", "femur-r"],
  patella: ["patella-l", "patella-r"],
  tibia: ["tibia-l", "tibia-r"],
  fibula: ["fibula-l", "fibula-r"],
  tarsals: ["tarsals-l", "tarsals-r"],
  metatarsals: ["metatarsals-l", "metatarsals-r"],
  cervical: ["cervical"],
  thoracic: ["thoracic"],
  lumbar: ["lumbar"],
  coccyx: ["coccyx"],
  manubrium: ["manubrium"],
};

// ---------- rounds by body system, each with its own real diagram ----------
// A system's parts are groups in its picture (src/assets/organs/<system>.svg, made by
// scripts/build-organs.mjs). Each group has the same id as the quiz item it lights up.
// Parts that are already organs above (stomach, lungs, ...) are reused: they only gain the system's tag.

// id | name | other accepted answers | system. New parts only.
const SYSTEM_PARTS: [string, string, string[], string][] = [
  ["duodenum", "Duodenum", [], "digestive"],
  ["parotid", "Parotid gland", ["Parotid", "Parotid glands"], "digestive"],
  ["sublingual", "Sublingual gland", ["Sublingual", "Sublingual glands"], "digestive"],
  ["submandibular", "Submandibular gland", ["Submandibular", "Submandibular glands"], "digestive"],
  ["nasal", "Nasal cavity", ["Nose", "Nasal passage", "Nasal passages", "Nasal"], "breathing"],
  ["larynx", "Larynx", ["Voice box", "Voicebox"], "breathing"],
  ["bronchi", "Bronchi", ["Bronchus", "Bronchial tubes", "Main bronchi", "Primary bronchi"], "breathing"],
  ["diaphragm", "Diaphragm", [], "breathing"],
  ["right-atrium", "Right atrium", ["Right auricle"], "heart"],
  ["left-atrium", "Left atrium", ["Left auricle"], "heart"],
  ["right-ventricle", "Right ventricle", [], "heart"],
  ["left-ventricle", "Left ventricle", [], "heart"],
  ["aorta", "Aorta", [], "heart"],
  ["superior-vena-cava", "Superior vena cava", ["Superior vena cavae", "Upper vena cava", "SVC"], "heart"],
  ["inferior-vena-cava", "Inferior vena cava", ["Inferior vena cavae", "Lower vena cava", "IVC"], "heart"],
  ["pulmonary-artery", "Pulmonary artery", ["Pulmonary arteries"], "heart"],
  ["pulmonary-veins", "Pulmonary veins", ["Pulmonary vein"], "heart"],
  ["tricuspid-valve", "Tricuspid valve", ["Tricuspid", "Right atrioventricular valve"], "heart"],
  ["mitral-valve", "Mitral valve", ["Mitral", "Bicuspid valve", "Left atrioventricular valve"], "heart"],
  ["cerebellum", "Cerebellum", [], "nervous"],
  ["spinal-cord", "Spinal cord", [], "nervous"],
  ["nerves", "Nerves", ["Nerve", "Peripheral nerves", "Peripheral nerve", "Nervous system"], "nervous"],
  ["ureters", "Ureters", ["Ureter"], "urinary"],
  ["urethra", "Urethra", [], "urinary"],
  ["adrenals", "Adrenal glands", ["Adrenal gland", "Adrenals", "Suprarenal glands", "Suprarenal gland"], "urinary"],
  ["ovaries", "Ovaries", ["Ovary"], "female"],
  ["tubes", "Fallopian tubes", ["Fallopian tube", "Uterine tubes", "Uterine tube", "Oviducts", "Oviduct"], "female"],
  ["uterus", "Uterus", ["Womb"], "female"],
  ["cervix", "Cervix", [], "female"],
  ["vagina", "Vagina", [], "female"],
];

// The organs above that also appear in a system's picture, by system.
const REUSED: Record<string, string[]> = {
  digestive: ["oesophagus", "stomach", "liver", "gallbladder", "pancreas", "smallint", "largeint"],
  breathing: ["trachea", "lungs"],
  nervous: ["brain"],
  urinary: ["kidneys", "bladder"],
};

const FINGERTIP = 12; // pixels a click can miss a thin part by (nerves, valves)

// One entry for each round by body system. The picture is only loaded when the round is played.
const SYSTEMS: { id: string; label: string; minutes: number; starter?: boolean; board: ReturnType<typeof pictureBoard> }[] = [
  {
    id: "digestive",
    label: "Digestive System",
    minutes: 4,
    board: pictureBoard({
      load: () => import("../assets/organs/digestive.svg?raw"),
      label: "The digestive system",
      credit: "Digestive system diagram: Mariana Ruiz Villarreal (LadyofHats) and Jmarchn, public domain, via Wikimedia Commons",
      sides: { parotid: "R", sublingual: "L", submandibular: "L" },
    }),
  },
  {
    id: "breathing",
    label: "Breathing",
    minutes: 3,
    starter: true,
    board: pictureBoard({
      load: () => import("../assets/organs/respiratory.svg?raw"),
      label: "The respiratory system",
      credit: "Respiratory system diagram: Mariana Ruiz Villarreal (LadyofHats) and Jmarchn, public domain, via Wikimedia Commons",
    }),
  },
  {
    id: "heart",
    label: "Heart & Blood",
    minutes: 4,
    board: pictureBoard({
      load: () => import("../assets/organs/heart.svg?raw"),
      label: "The human heart, front view",
      reach: FINGERTIP,
      credit: "Heart diagram: Wapcaplet, CC BY-SA 3.0, via Wikimedia Commons; adapted: labels removed and parts separated",
      // The heart is drawn as you would see it facing someone, so the right side is on the left of the page.
      sides: {
        "right-atrium": "L", "right-ventricle": "L", "superior-vena-cava": "L", "inferior-vena-cava": "L", "tricuspid-valve": "L",
        "left-atrium": "R", "left-ventricle": "R", "mitral-valve": "R", aorta: "R", "pulmonary-artery": "R",
      },
    }),
  },
  {
    id: "nervous",
    label: "Brain & Nerves",
    minutes: 3,
    board: pictureBoard({
      load: () => import("../assets/organs/nervous.svg?raw"),
      label: "The nervous system",
      reach: FINGERTIP,
      credit: "Nervous system diagram: The Emirr, CC BY 3.0, via Wikimedia Commons; adapted: labels removed and parts separated",
    }),
  },
  {
    id: "urinary",
    label: "Kidneys & Bladder",
    minutes: 3,
    board: pictureBoard({
      load: () => import("../assets/organs/urinary.svg?raw"),
      label: "The urinary system",
      credit: "Urinary system diagram: Jordi March i Nogué, CC BY-SA 3.0, via Wikimedia Commons; adapted: labels removed and parts separated",
    }),
  },
  {
    id: "female",
    label: "Reproductive System, Female",
    minutes: 3,
    board: pictureBoard({
      load: () => import("../assets/organs/female.svg?raw"),
      label: "The female reproductive system",
      credit: "Female reproductive system diagram: CDC and Mysid, public domain, via Wikimedia Commons",
    }),
  },
];
const systemTag = (id: string) => `sys-${id}`;

const items: Item[] = [
  ...BONES.map(([id, name, aliases, starter]) => ({ id, name, aliases, tags: ["bones", ...(starter ? ["starter"] : [])] })),
  ...BONE_DETAIL.map(([id, name, aliases]) => ({ id, name, aliases, tags: ["bone-detail"] })),
  ...ORGANS.map(([id, name, aliases, starter]) => ({
    id,
    name,
    aliases,
    tags: [
      "organs",
      ...(starter ? ["starter"] : []),
      ...Object.keys(REUSED).filter((sys) => REUSED[sys].includes(id)).map(systemTag),
    ],
  })),
  ...SYSTEM_PARTS.map(([id, name, aliases, system]) => ({ id, name, aliases, tags: [systemTag(system)] })),
];

// Organ labels down the left and right of the body outline.
const L = (y: number, to: [number, number], text: string): DiagramLabel => ({ x: 215, y, to, anchor: "end", text });
const R = (y: number, to: [number, number], text: string): DiagramLabel => ({ x: 585, y, to, anchor: "start", text });
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
    { id: "spine", label: "Spine & Chest Detail", minutes: 3, filter: (i) => i.tags.includes("bone-detail") },
    { id: "bigorgans", label: "Major Organs", minutes: 3, starter: true, filter: (i) => i.tags.includes("organs") && i.tags.includes("starter") },
    { id: "organs", label: "All Organs", minutes: 5, filter: (i) => i.tags.includes("organs") },
    ...SYSTEMS.map((sys, n) => ({
      id: systemTag(sys.id),
      label: sys.label,
      minutes: sys.minutes,
      starter: sys.starter,
      heading: n === 0 ? "By body system" : undefined,
      filter: (i: Item) => i.tags.includes(systemTag(sys.id)),
    })),
  ],
  options: [{ id: "click", label: "Click the part instead", hint: "See the name, click it on the body", default: false }],
  renderPrompt: (item, how) => {
    const p = document.createElement("p");
    p.className = "prompt-text";
    if (how.click) {
      p.innerHTML = "Click the <strong></strong>";
      p.querySelector("strong")!.textContent = item.name.toLowerCase();
    } else {
      const organ = item.tags.includes("organs") || item.tags.some((t) => t.startsWith("sys-"));
      p.textContent = item.tags.includes("organs") ? "Which organ is lit up?" : organ ? "Which part is lit up?" : "Which bone is lit up?";
    }
    return p;
  },
  createBoard: ({ container, items: playing, variant }) => {
    const system = SYSTEMS.find((sys) => systemTag(sys.id) === variant.id);
    if (system) return system.board(container, playing.map((i) => ({ id: i.id, name: i.name, groups: [i.id] })));
    if (variant.id.includes("organs")) {
      return createDiagramBoard(
        container,
        { viewBox: "60 0 680 520", draw: drawOrgans, labels: ORGAN_LABELS, ariaLabel: "Human body showing the organs" },
        new Set(playing.map((i) => i.id)),
      );
    }
    return createSkeletonBoard(container, playing.map((i) => ({ id: i.id, name: i.name, groups: BONE_GROUPS[i.id] })));
  },
};
