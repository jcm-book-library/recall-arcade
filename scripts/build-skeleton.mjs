// Builds src/assets/skeleton-front.svg for "The Human Body" from the public-domain
// "Human skeleton front en.svg" by LadyofHats (Mariana Ruiz Villarreal), Wikimedia Commons.
//
// Run with:  node scripts/build-skeleton.mjs path/to/skel-front.svg
//
// What it does: refuses unsafe content, throws away the labels, blue bars, backgrounds and
// editor leftovers, gives each bone group a clean id, finds the ribs, and shrinks the numbers.
import fs from "node:fs";
import zlib from "node:zlib";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/build-skeleton.mjs <skel-front.svg>");
  process.exit(1);
}
const out = new URL("../src/assets/skeleton-front.svg", import.meta.url);
const source = fs.readFileSync(input, "utf8");

// ---- 1. Refuse anything unsafe, anywhere in the file (even in parts we later drop) ----
const UNSAFE = [
  [/<\s*script/i, "a script"],
  [/<\s*foreignObject/i, "a foreignObject"],
  [/<\s*(image|iframe|embed|object|audio|video|use|a)[\s>/]/i, "an image, embed, link or use element"],
  [/\son[a-z]+\s*=/i, "an on* event attribute"],
  [/javascript:/i, "a javascript: link"],
  [/data:image|data:text|base64,/i, "embedded data"],
  [/@import/i, "a CSS import"],
  [/url\(\s*['"]?(?!#)/i, "a url() that points outside the file"],
];
for (const [re, what] of UNSAFE) if (re.test(source)) throw new Error(`Refusing the SVG: it contains ${what}.`);
for (const m of source.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
  if (!m[1].startsWith("#")) throw new Error(`Refusing the SVG: external link ${m[1]}`);
}

// ---- 2. A tiny XML reader: tags, attributes, nesting (text is not needed) ----
const TAG = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([\w:.-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
function parse(text) {
  const root = { tag: "#root", attrs: {}, kids: [] };
  const stack = [root];
  for (const m of text.matchAll(TAG)) {
    if (m[2] === undefined) continue;
    const [, close, tag, rawAttrs, selfClose] = m;
    if (close) {
      stack.pop();
      continue;
    }
    const attrs = {};
    for (const a of rawAttrs.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = a[2] ?? a[3];
    const node = { tag, attrs, kids: [] };
    stack.at(-1).kids.push(node);
    if (!selfClose) stack.push(node);
  }
  return root.kids.find((n) => n.tag === "svg");
}
const svg = parse(source);
if (!svg) throw new Error("No <svg> found.");

const find = (node, test) => {
  if (test(node)) return node;
  for (const k of node.kids) {
    const r = find(k, test);
    if (r) return r;
  }
  return null;
};

// ---- 3. Pick what to keep: the "Skeleton" layer only ----
const skeleton = find(svg, (n) => n.attrs.id === "layer3");
if (!skeleton) throw new Error("Could not find the skeleton layer (layer3).");

// Clean ids for the bone groups. Anything not listed here loses its id.
const IDS = {
  Cranium: "cranium", Mandible: "mandible",
  CervicalVertebrae: "cervical", ThoracicVertebrae: "thoracic", LumbarVertebrae: "lumbar",
  Sacrum: "sacrum", Coccyx: "coccyx", PelvicGirdle: "pelvis",
  Sternum: "sternum", Manubrium: "manubrium", Scapula: "scapula",
  ClavicleLeft: "clavicle-l", ClavicleRight: "clavicle-r",
  HumerusLeft: "humerus-l", HumerusRight: "humerus-r",
  RadiusLeft: "radius-l", RadiusRight: "radius-r",
  UlnaLeft: "ulna-l", UlnaRight: "ulna-r",
  CarpalsLeft: "carpals-l", CarpalsRight: "carpals-r",
  MetacarpalsLeft: "metacarpals-l", MetacarpalsRight: "metacarpals-r",
  PhalangesLeft: "phalanges-l", PhalangesRight: "phalanges-r",
  FemurLeft: "femur-l", FemurRight: "femur-r",
  PatellaLeft: "patella-l", PatellaRight: "patella-r",
  TibiaLeft: "tibia-l", TibiaRight: "tibia-r",
  FibulaLeft: "fibula-l", FibulaRight: "fibula-r",
  TarsalsLeft: "tarsals-l", TarsalsRight: "tarsals-r",
  MetatarsalsLeft: "metatarsals-l", MetatarsalsRight: "metatarsals-r",
  PhalangesFootLeft: "toes-l", PhalangesFootRight: "toes-r",
};
// Groups with no name in the original file, found by looking at where they are drawn.
// Filled in from the drawing: original id -> clean id.
const UNNAMED = {
  g3760: "femur-r", // the right thigh bone (the file only names the left one)
};
// The ribs have no group of their own: these unnamed groups (side by side in the file)
// are wrapped together in one group called "ribs".
const RIB_GROUPS = ["g845", "g1609"]; // the rib cage, and the first ribs by the collarbones
// The one bone that is a bare path, not a group.
const WRAP_PATHS = { Sternum: "sternum" };

// ---- 4. Shrink numbers ----
const num = (v) => {
  let s = (Math.round(parseFloat(v) * 10) / 10).toString();
  if (s === "-0") s = "0";
  return s.replace(/^(-?)0\./, "$1.");
};
// Join number tokens with the shortest separator that still reads correctly.
function joinNums(tokens) {
  let s = "";
  tokens.forEach((t, i) => {
    if (i && !t.startsWith("-") && !(t.startsWith(".") && /\./.test(tokens[i - 1]))) s += " ";
    s += t;
  });
  return s;
}
// The drawing only uses M (move), C (curve) and Z (close), all absolute. Each point is
// rounded first, then written as a step from the previous rounded point, so the small
// numbers save space and the rounding errors never add up.
function shrinkPath(d) {
  const parts = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const r = (v) => Math.round(parseFloat(v) * 10) / 10;
  const ops = []; // [letter, numbers]
  let cmd = "";
  let nums = [];
  let cur = [0, 0];
  let start = [0, 0];
  for (const p of parts) {
    if (/[a-zA-Z]/.test(p)) {
      if (!/^[MCZz]$/.test(p)) throw new Error(`Path command ${p} is not handled by this script.`);
      cmd = p;
      nums = [];
      if (p !== "M" && p !== "C") {
        ops.push(["z", []]);
        cur = start;
      }
      continue;
    }
    nums.push(r(p));
    if (cmd === "M" && nums.length === 2) {
      const [x, y] = nums;
      ops.push(ops.length ? ["m", [r(x - cur[0]), r(y - cur[1])]] : ["M", [x, y]]);
      cur = start = [x, y];
      nums = [];
    } else if (cmd === "C" && nums.length === 6) {
      const [x1, y1, x2, y2, x, y] = nums;
      ops.push(["c", [r(x1 - cur[0]), r(y1 - cur[1]), r(x2 - cur[0]), r(y2 - cur[1]), r(x - cur[0]), r(y - cur[1])]]);
      cur = [x, y];
      nums = [];
    }
  }
  // Write it out: repeat a letter only when it changes, join numbers tightly.
  let out = "";
  let last = "";
  let run = [];
  const flush = () => {
    out += joinNums(run.map(num));
    run = [];
  };
  for (const [letter, ns] of ops) {
    if (letter === last && letter === "c") {
      run.push(...ns);
      continue;
    }
    flush();
    out += letter;
    last = letter;
    run.push(...ns);
  }
  flush();
  return out;
}

// ---- 5. Rebuild the tree, clean ----
const SHAPES = new Set(["path", "circle", "ellipse", "line", "polyline", "polygon", "rect"]);
const STYLE_KEEP = new Set(["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "opacity", "stop-color", "stop-opacity"]);
const NUMERIC = new Set(["x", "y", "cx", "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2", "width", "height", "stroke-width", "offset"]);

const usedGradients = new Set();

function cleanNode(node, ids) {
  const isGroup = node.tag === "g";
  if (!isGroup && !SHAPES.has(node.tag)) return null;
  const a = node.attrs;
  const style = {};
  for (const decl of (a.style ?? "").split(";")) {
    const i = decl.indexOf(":");
    if (i > 0) style[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  if (style.display === "none" || a.display === "none") return null;
  const id = a.id;
  if (id && (id.startsWith("l_") || /BlueBar$/.test(id))) return null; // label and bar groups
  const attrs = {};
  // Styles become plain attributes, so the page's CSS can override them without !important.
  for (const k of STYLE_KEEP) {
    const v = style[k] ?? a[k];
    if (v !== undefined) attrs[k] = k === "stroke-width" ? num(v) : v;
  }
  for (const k of ["d", "points", "transform"]) {
    if (a[k] === undefined) continue;
    attrs[k] = k === "d" ? shrinkPath(a[k]) : k === "points" ? joinNums((a[k].match(/-?[\d.]+/g) ?? []).map(num)) : a[k];
  }
  for (const k of NUMERIC) if (a[k] !== undefined && attrs[k] === undefined) attrs[k] = num(a[k]);
  for (const v of Object.values(attrs)) for (const m of String(v).matchAll(/url\(#([^)]+)\)/g)) usedGradients.add(m[1]);

  const kids = node.kids.map((k) => cleanNode(k, ids)).filter(Boolean);
  if (isGroup && kids.length === 0) return null;
  if (!isGroup && node.tag === "path" && !attrs.d) return null;

  const clean = { tag: node.tag, attrs, kids };
  const newId = IDS[id] ?? UNNAMED[id];
  if (newId) clean.attrs = { id: newId, ...attrs };
  return clean;
}

const parts = [];
for (const child of skeleton.kids) {
  if (child.tag === "path" && WRAP_PATHS[child.attrs.id]) {
    // A bare path: put it in a group of its own, so every bone is a group.
    const p = cleanNode({ ...child, attrs: { ...child.attrs, id: undefined } }, IDS);
    if (p) parts.push({ tag: "g", attrs: { id: WRAP_PATHS[child.attrs.id] }, kids: [p], orig: child.attrs.id });
    continue;
  }
  const c = cleanNode(child, IDS);
  if (c) parts.push({ ...c, orig: child.attrs.id });
}

// The "Skull" group holds the jaw, the cranium and one unnamed group of face bones. Open it up
// so each is a bone of its own (same drawing order), and name the face bones "face".
const skullAt = parts.findIndex((p) => p.orig === "Skull");
if (skullAt >= 0) {
  const pieces = parts[skullAt].kids.map((k) => (k.attrs.id ? k : { ...k, attrs: { id: "face", ...k.attrs } }));
  parts.splice(skullAt, 1, ...pieces);
}

// The hands and feet are wrapped in groups with no name; open those too, so every bone
// group sits directly in the drawing.
for (let i = 0; i < parts.length; i++) {
  const p = parts[i];
  if (p.tag === "g" && !p.attrs.id && p.kids.length && p.kids.every((k) => k.attrs.id)) parts.splice(i, 1, ...p.kids);
}

// Wrap the rib groups, in place.
const ribKids = parts.filter((p) => RIB_GROUPS.includes(p.orig));
if (RIB_GROUPS.length && ribKids.length !== RIB_GROUPS.length) throw new Error("Some rib groups were not found.");
let body = parts;
if (ribKids.length) {
  const first = parts.indexOf(ribKids[0]);
  body = parts.filter((p) => !ribKids.includes(p));
  body.splice(first, 0, { tag: "g", attrs: { id: "ribs" }, kids: ribKids });
}

// Gradients that the kept shapes use.
const defs = [];
const grads = [];
find(svg, (n) => {
  if (/Gradient$/.test(n.tag) && usedGradients.has(n.attrs.id)) grads.push(n);
  return false;
});
for (const g of grads) {
  const attrs = {};
  for (const [k, v] of Object.entries(g.attrs)) if (!/^(inkscape|sodipodi|xlink)|^xml/.test(k)) attrs[k] = NUMERIC.has(k) ? num(v) : /^[xy][12]$|^[cf][xy]$|^r$/.test(k) ? num(v) : v;
  const stops = g.kids.filter((k) => k.tag === "stop").map((s) => {
    const st = {};
    for (const decl of (s.attrs.style ?? "").split(";")) {
      const i = decl.indexOf(":");
      if (i > 0) st[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
    }
    const sa = { offset: s.attrs.offset };
    for (const k of ["stop-color", "stop-opacity"]) if (st[k] ?? s.attrs[k]) sa[k] = st[k] ?? s.attrs[k];
    return { tag: "stop", attrs: sa, kids: [] };
  });
  if (g.attrs["xlink:href"]) throw new Error("Chained gradients are not handled by this script.");
  defs.push({ tag: g.tag, attrs, kids: stops });
}

// ---- 6. Write ----
const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
function write(node) {
  const at = Object.entries(node.attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
  return node.kids.length ? `<${node.tag}${at}>${node.kids.map(write).join("")}</${node.tag}>` : `<${node.tag}${at}/>`;
}
const vb = svg.attrs.viewBox.split(/[\s,]+/).map(num).join(" ");
const text =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">` +
  (defs.length ? `<defs>${defs.map(write).join("")}</defs>` : "") +
  body.map(write).join("") +
  `</svg>\n`;

// Final safety check on what we are about to write.
for (const [re, what] of UNSAFE) if (re.test(text)) throw new Error(`Output check failed: ${what}.`);

fs.mkdirSync(new URL("../src/assets/", import.meta.url), { recursive: true });
fs.writeFileSync(out, text);
const ids = [...text.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1]);
console.log(`Wrote ${out.pathname}: ${(text.length / 1024).toFixed(0)} KB, ${(zlib.gzipSync(text).length / 1024).toFixed(0)} KB gzipped.`);
console.log(`Groups: ${ids.join(", ")}`);
const unnamedLeft = body.filter((p) => !p.attrs.id);
if (unnamedLeft.length) console.log(`${unnamedLeft.length} small joint and cartilage pieces have no bone group (kept, always shown dimmed).`);
