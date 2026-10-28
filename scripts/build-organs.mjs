// Builds the organ diagrams in src/assets/organs/ for "The Human Body" (rounds by body system).
//
// Run with:  node scripts/build-organs.mjs <folder with the downloaded SVGs> [system ...]
// Example:   node scripts/build-organs.mjs ~/anatomy digestive heart
// The source files stay out of the repo; their authors and licences are in README.md.
//
// What it does for each system (the systems and their parts are listed in scripts/organ-systems.mjs):
//  1. refuses unsafe content (script, foreignObject, on* attributes, external links, pictures);
//  2. reads the drawing, applies every transform, and throws away text, label lines, arrows,
//     backgrounds, translations and anything listed under `drop`;
//  3. wraps each organ in a group with a clean id (the pieces of one organ that are drawn
//     together share one group; pieces drawn apart carry data-of="<id>", so the drawing
//     order, and so the look, never changes);
//  4. writes compact paths with numbers rounded to 1 decimal place.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { SYSTEMS } from "./organ-systems.mjs";

// ---------------------------------------------------------------- 1. safety
const UNSAFE = [
  [/<\s*script/i, "a script"],
  [/<\s*foreignObject/i, "a foreignObject"],
  [/<\s*(image|iframe|embed|object|audio|video|a)[\s>/]/i, "an image, embed or link element"],
  [/\son[a-z]+\s*=/i, "an on* event attribute"],
  [/javascript:/i, "a javascript: link"],
  [/data:image|data:text|base64,/i, "embedded data"],
  [/@import/i, "a CSS import"],
  [/url\(\s*['"]?(?!#)/i, "a url() that points outside the file"],
];
function checkSafe(text, label) {
  for (const [re, what] of UNSAFE) if (re.test(text)) throw new Error(`Refusing ${label}: it contains ${what}.`);
  for (const m of text.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
    if (!m[1].startsWith("#")) throw new Error(`Refusing ${label}: external link ${m[1]}`);
  }
}

// ---------------------------------------------------------------- 2. reading the XML
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
const walkAll = (node, fn) => {
  fn(node);
  node.kids.forEach((k) => walkAll(k, fn));
};

// ---------------------------------------------------------------- 3. numbers and matrices
const num = (v, d = 1) => {
  const f = 10 ** d;
  let s = (Math.round(parseFloat(v) * f) / f).toString();
  if (s === "-0") s = "0";
  return s.replace(/^(-?)0\./, "$1.");
};
function joinNums(tokens) {
  let s = "";
  tokens.forEach((t, i) => {
    if (i && !t.startsWith("-") && !(t.startsWith(".") && /\./.test(tokens[i - 1]))) s += " ";
    s += t;
  });
  return s;
}
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const IDENTITY = [1, 0, 0, 1, 0, 0];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const scaleOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
function parseTransform(s) {
  let m = IDENTITY;
  for (const t of (s ?? "").matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const a = (t[2].match(/-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
    let n = IDENTITY;
    if (t[1] === "matrix") n = a;
    else if (t[1] === "translate") n = [1, 0, 0, 1, a[0], a[1] ?? 0];
    else if (t[1] === "scale") n = [a[0], 0, 0, a[1] ?? a[0], 0, 0];
    else if (t[1] === "rotate") {
      const r = (a[0] * Math.PI) / 180;
      n = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
      if (a.length === 3) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
    } else if (t[1] === "skewX") n = [1, 0, Math.tan((a[0] * Math.PI) / 180), 1, 0, 0];
    else if (t[1] === "skewY") n = [1, Math.tan((a[0] * Math.PI) / 180), 0, 1, 0, 0];
    else throw new Error(`Transform ${t[1]} is not handled.`);
    m = mul(m, n);
  }
  return m;
}

// ---------------------------------------------------------------- 4. paths: everything becomes absolute M, L, C, Z
function arcToCurves(x1, y1, rx, ry, phi, large, sweep, x2, y2) {
  if (rx === 0 || ry === 0) return [["L", x2, y2]];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const p = (phi * Math.PI) / 180, cp = Math.cos(p), sp = Math.sin(p);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num2 / den));
  const cxp = (k * rx * y1p) / ry, cyp = (-k * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
  const out = [];
  const step = dt / n, a = (4 / 3) * Math.tan(step / 4);
  for (let i = 0; i < n; i++) {
    const s = t1 + i * step, e = s + step;
    const pt = (t, ox, oy) => [cp * rx * Math.cos(t) - sp * ry * Math.sin(t) + cx + ox, sp * rx * Math.cos(t) + cp * ry * Math.sin(t) + cy + oy];
    const d1 = (t) => [-cp * rx * Math.sin(t) - sp * ry * Math.cos(t), -sp * rx * Math.sin(t) + cp * ry * Math.cos(t)];
    const P0 = pt(s, 0, 0), P3 = pt(e, 0, 0), D0 = d1(s), D3 = d1(e);
    out.push(["C", P0[0] + a * D0[0], P0[1] + a * D0[1], P3[0] - a * D3[0], P3[1] - a * D3[1], P3[0], P3[1]]);
  }
  out[out.length - 1].splice(5, 2, x2, y2);
  return out;
}

/** Turns a path "d" into absolute segments: ["M",x,y] ["L",x,y] ["C",x1,y1,x2,y2,x,y] ["Z"]. */
function parsePath(d) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  let i = 0;
  const segs = [];
  let cmd = "", cx = 0, cy = 0, sx = 0, sy = 0, last = null, lastCtl = null;
  const isNum = () => i < toks.length && !/^[a-zA-Z]$/.test(toks[i]);
  const n = () => parseFloat(toks[i++]);
  const flag = () => {
    // Arc flags can be glued to the next number ("01.5"): take one digit at a time.
    const t = toks[i];
    if (t.length > 1 && /^[01]/.test(t)) {
      toks[i] = t.slice(1);
      return Number(t[0]);
    }
    i++;
    return Number(t);
  };
  while (i < toks.length) {
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
    else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "Z") {
      segs.push(["Z"]);
      cx = sx;
      cy = sy;
      last = "Z";
      continue;
    }
    if (!isNum()) continue;
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    if (C === "M") {
      cx = n() + ox; cy = n() + oy; sx = cx; sy = cy;
      segs.push(["M", cx, cy]);
    } else if (C === "L") {
      cx = n() + ox; cy = n() + oy;
      segs.push(["L", cx, cy]);
    } else if (C === "H") {
      cx = n() + ox;
      segs.push(["L", cx, cy]);
    } else if (C === "V") {
      cy = n() + oy;
      segs.push(["L", cx, cy]);
    } else if (C === "C") {
      const v = [n() + ox, n() + oy, n() + ox, n() + oy, n() + ox, n() + oy];
      segs.push(["C", ...v]);
      lastCtl = [v[2], v[3]];
      cx = v[4]; cy = v[5];
    } else if (C === "S") {
      const r = last === "C" ? [2 * cx - lastCtl[0], 2 * cy - lastCtl[1]] : [cx, cy];
      const v = [r[0], r[1], n() + ox, n() + oy, n() + ox, n() + oy];
      segs.push(["C", ...v]);
      lastCtl = [v[2], v[3]];
      cx = v[4]; cy = v[5];
    } else if (C === "Q" || C === "T") {
      let q;
      if (C === "Q") q = [n() + ox, n() + oy];
      else q = last === "Q" ? [2 * cx - lastCtl[0], 2 * cy - lastCtl[1]] : [cx, cy];
      const x = n() + ox, y = n() + oy;
      segs.push(["C", cx + (2 / 3) * (q[0] - cx), cy + (2 / 3) * (q[1] - cy), x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y), x, y]);
      lastCtl = q;
      cx = x; cy = y;
      last = "Q";
      continue;
    } else if (C === "A") {
      const rx = n(), ry = n(), phi = n(), la = flag(), sw = flag();
      const x = n() + ox, y = n() + oy;
      for (const s of arcToCurves(cx, cy, rx, ry, phi, la, sw, x, y)) segs.push(s);
      cx = x; cy = y;
    } else throw new Error(`Path command ${cmd} is not handled.`);
    last = C === "S" ? "C" : C;
  }
  return segs;
}

/** A shape element as a path "d" in its own coordinates. */
function shapeToD(node) {
  const a = node.attrs;
  const f = (k, def = 0) => (a[k] === undefined ? def : parseFloat(a[k]));
  switch (node.tag) {
    case "path": return a.d ?? "";
    case "rect": {
      const x = f("x"), y = f("y"), w = f("width"), h = f("height");
      let rx = f("rx", NaN), ry = f("ry", NaN);
      if (isNaN(rx)) rx = isNaN(ry) ? 0 : ry;
      if (isNaN(ry)) ry = rx;
      if (!rx) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
    }
    case "circle":
    case "ellipse": {
      const cx = f("cx"), cy = f("cy");
      const rx = node.tag === "circle" ? f("r") : f("rx"), ry = node.tag === "circle" ? f("r") : f("ry");
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}Z`;
    }
    case "line": return `M${f("x1")} ${f("y1")}L${f("x2")} ${f("y2")}`;
    case "polyline":
    case "polygon": {
      const p = (a.points ?? "").match(/-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
      let d = "";
      for (let i = 0; i + 1 < p.length; i += 2) d += `${i ? "L" : "M"}${p[i]} ${p[i + 1]}`;
      return d + (node.tag === "polygon" ? "Z" : "");
    }
  }
  return "";
}
const SHAPES = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);

/** Applies the matrix, rounds each point to 1 decimal, and writes steps from the last rounded point. */
function writePath(segs, m) {
  const r = (v) => Math.round(v * 10) / 10;
  const P = (x, y) => apply(m, x, y).map(r);
  let out = "", last = "", run = [];
  let cur = [0, 0], start = [0, 0];
  const flush = () => {
    out += joinNums(run.map((v) => num(v)));
    run = [];
  };
  const emit = (letter, ns) => {
    if (letter === last && letter !== "m" && letter !== "z") {
      run.push(...ns);
      return;
    }
    flush();
    out += letter;
    last = letter;
    run.push(...ns);
  };
  let first = true;
  for (const s of segs) {
    if (s[0] === "M") {
      const p = P(s[1], s[2]);
      if (first) emit("M", p);
      else emit("m", [r(p[0] - cur[0]), r(p[1] - cur[1])]);
      first = false;
      cur = start = p;
    } else if (s[0] === "L") {
      const p = P(s[1], s[2]);
      emit("l", [r(p[0] - cur[0]), r(p[1] - cur[1])]);
      cur = p;
    } else if (s[0] === "C") {
      const a = P(s[1], s[2]), b = P(s[3], s[4]), p = P(s[5], s[6]);
      emit("c", [a[0] - cur[0], a[1] - cur[1], b[0] - cur[0], b[1] - cur[1], p[0] - cur[0], p[1] - cur[1]].map(r));
      cur = p;
    } else if (s[0] === "Z") {
      emit("z", []);
      cur = start;
    }
  }
  flush();
  return out;
}

// ---------------------------------------------------------------- 5. styles and gradients
const INHERIT = ["fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray"];
function styleOf(node) {
  const st = {};
  for (const decl of (node.attrs.style ?? "").split(";")) {
    const i = decl.indexOf(":");
    if (i > 0) st[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  const out = {};
  for (const k of [...INHERIT, "opacity", "display", "visibility"]) {
    const v = st[k] ?? node.attrs[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function collectGradients(svg) {
  const all = new Map();
  walkAll(svg, (n) => {
    if (/Gradient$/.test(n.tag) && n.attrs.id) all.set(n.attrs.id, n);
  });
  return all;
}
/** A gradient with its colour stops and settings filled in from any gradient it points to. */
function resolveGradient(all, id) {
  const chain = [];
  for (let g = all.get(id); g && chain.length < 8; g = all.get((g.attrs["xlink:href"] ?? g.attrs.href ?? "").slice(1))) chain.push(g);
  if (!chain.length) return null;
  const attrs = {};
  for (const g of [...chain].reverse()) Object.assign(attrs, g.attrs);
  const withStops = chain.find((g) => g.kids.some((k) => k.tag === "stop"));
  const stops = (withStops?.kids ?? []).filter((k) => k.tag === "stop").map((s) => {
    const st = {};
    for (const decl of (s.attrs.style ?? "").split(";")) {
      const i = decl.indexOf(":");
      if (i > 0) st[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
    }
    return { offset: s.attrs.offset ?? "0", color: st["stop-color"] ?? s.attrs["stop-color"] ?? "#000", opacity: st["stop-opacity"] ?? s.attrs["stop-opacity"] };
  });
  return { tag: chain[0].tag, attrs, stops };
}

// ---------------------------------------------------------------- 6. build one system
function buildSystem(name, cfg, sourcePath) {
  const source = fs.readFileSync(sourcePath, "utf8");
  checkSafe(source, path.basename(sourcePath));
  const svg = parse(source);
  if (!svg) throw new Error("No <svg> found.");
  const gradients = collectGradients(svg);

  // Number every drawn shape in order (n0, n1, ...), so shapes without an id can be named too.
  const isHiddenTag = /^(defs|metadata|title|desc|style|namedview|text|tspan|switch|marker|clipPath|mask|pattern|symbol|foreignObject|use|\w*Gradient)$/i;
  let shapeNo = 0;
  (function number(node) {
    const tag = node.tag.replace(/^svg:/, "");
    if (isHiddenTag.test(tag) || /namedview/i.test(tag)) return;
    if (SHAPES.has(tag)) node.attrs["data-n"] = `n${shapeNo++}`;
    node.kids.forEach(number);
  })(svg);

  // Which source ids belong to which organ (an id can name a group: then everything inside).
  // An entry is an id, or [id, [x, y, width, height]] to use only that part of the shape
  // (or [x, y, width, height, "out"] for everything except it).
  const partOf = new Map();
  for (const [part, entries] of Object.entries(cfg.parts)) {
    for (const e of entries) {
      const [id, clip] = Array.isArray(e) ? e : [e, null];
      if (!partOf.has(id)) partOf.set(id, []);
      partOf.get(id).push({ part, clip });
    }
  }
  const dropIds = new Set(cfg.drop ?? []);
  const keepOnly = cfg.keep ? new Set(cfg.keep) : null;
  const seenIds = new Set();
  walkAll(svg, (n) => {
    if (n.attrs.id) seenIds.add(n.attrs.id);
    if (n.attrs["data-n"]) seenIds.add(n.attrs["data-n"]);
  });
  for (const id of [...partOf.keys(), ...dropIds, ...(cfg.keep ?? [])]) if (!seenIds.has(id)) throw new Error(`${name}: the source has no element with id "${id}".`);

  // Walk the tree in drawing order and collect flat pieces.
  const pieces = []; // { part, node, matrix, style }
  function walk(node, matrix, style, part, keep) {
    for (const id of [node.attrs.id, node.attrs["data-n"]]) {
      if (!id) continue;
      if (dropIds.has(id)) return;
      if (partOf.has(id)) part = partOf.get(id);
      if (keepOnly?.has(id)) keep = true;
    }
    const tag = node.tag.replace(/^svg:/, "");
    if (isHiddenTag.test(tag) || /namedview/i.test(tag)) return;
    const own = styleOf(node);
    if (own.display === "none" || own.visibility === "hidden") return;
    const st = { ...style };
    for (const k of INHERIT) if (own[k] !== undefined && own[k] !== "inherit") st[k] = own[k];
    st.opacity = (style.opacity ?? 1) * (own.opacity !== undefined ? parseFloat(own.opacity) : 1);
    const m = node.attrs.transform ? mul(matrix, parseTransform(node.attrs.transform)) : matrix;
    if (tag === "g" || tag === "svg" || tag === "a") {
      for (const k of node.kids) walk(k, m, st, part, keep);
      return;
    }
    if (!SHAPES.has(tag)) return;
    if (keepOnly && !keep && !part) return;
    pieces.push({ part, node: { ...node, tag }, matrix: m, style: st, keys: [node.attrs.id, node.attrs["data-n"]] });
  }
  const baseStyle = { fill: "#000", stroke: "none", "stroke-width": "1", opacity: 1 };
  walk(svg, IDENTITY, baseStyle, null, !keepOnly);

  // `move`: { <id>: [ids...] } draws those pieces right after <id>. The lung shading in the
  // breathing picture is drawn over the airways in the source; this puts it underneath them.
  for (const [after, ids] of Object.entries(cfg.move ?? {})) {
    const moving = pieces.filter((p) => p.keys.some((k) => ids.includes(k)));
    for (const p of moving) pieces.splice(pieces.indexOf(p), 1);
    const at = pieces.findIndex((p) => p.keys.includes(after));
    if (at < 0) throw new Error(`${name}: cannot move pieces after "${after}", it is not drawn.`);
    pieces.splice(at + 1, 0, ...moving);
  }

  // Write the pieces, grouping runs of the same organ.
  const defs = [];
  const gradKey = new Map();
  function gradientRef(url, matrix) {
    const id = url.match(/url\(#([^)]+)\)/)?.[1];
    const g = id && resolveGradient(gradients, id);
    if (!g || !g.stops.length) return null;
    const userSpace = g.attrs.gradientUnits === "userSpaceOnUse";
    const gt = g.attrs.gradientTransform ? parseTransform(g.attrs.gradientTransform) : IDENTITY;
    const total = userSpace ? mul(matrix, gt) : gt;
    const key = id + "|" + (userSpace ? total.map((v) => v.toFixed(4)).join(",") : "");
    if (gradKey.has(key)) return gradKey.get(key);
    const newId = `g${gradKey.size + 1}`;
    gradKey.set(key, newId);
    const at = { id: newId };
    for (const k of ["x1", "y1", "x2", "y2", "cx", "cy", "fx", "fy", "r"]) {
      if (g.attrs[k] !== undefined) at[k] = userSpace ? num(g.attrs[k], 2) : g.attrs[k];
    }
    if (userSpace) at.gradientUnits = "userSpaceOnUse";
    if (total.some((v, i) => Math.abs(v - IDENTITY[i]) > 1e-9)) at.gradientTransform = `matrix(${total.map((v) => num(v, 4)).join(" ")})`;
    if (g.attrs.spreadMethod) at.spreadMethod = g.attrs.spreadMethod;
    const stops = g.stops.map((s) => `<stop offset="${num(parseFloat(s.offset) * (String(s.offset).includes("%") ? 0.01 : 1), 3)}" stop-color="${s.color}"${s.opacity !== undefined && s.opacity !== "1" ? ` stop-opacity="${num(s.opacity, 2)}"` : ""}/>`).join("");
    defs.push(`<${g.tag}${Object.entries(at).map(([k, v]) => ` ${k}="${v}"`).join("")}>${stops}</${g.tag}>`);
    return newId;
  }

  const clips = new Map();
  function clipRef(box) {
    const key = box.join(",");
    if (!clips.has(key)) {
      clips.set(key, `c${clips.size + 1}`);
      const [x, y, w, h, how] = box;
      // "out" keeps everything except the box, so the rest of a cut shape can be drawn under its cut piece.
      defs.push(
        how === "out"
          ? `<clipPath id="c${clips.size}"><path clip-rule="evenodd" d="M-9999-9999H9999V9999H-9999ZM${x} ${y}h${w}v${h}h${-w}Z"/></clipPath>`
          : `<clipPath id="c${clips.size}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`,
      );
    }
    return clips.get(key);
  }

  const out = []; // items: string (loose piece) or { part, id?, parts: string[] }
  const firstSeen = new Set();
  let current = null;
  let kept = 0;
  for (const p of pieces) {
    const st = p.style;
    const sc = scaleOf(p.matrix);
    const attrs = {};
    let fill = st.fill, stroke = st.stroke;
    for (const which of ["fill", "stroke"]) {
      const v = which === "fill" ? fill : stroke;
      if (v && v.startsWith("url(")) {
        const ref = gradientRef(v, p.matrix);
        if (ref) {
          if (which === "fill") fill = `url(#${ref})`;
          else stroke = `url(#${ref})`;
        } else if (which === "fill") fill = "none";
        else stroke = "none";
      }
    }
    const fo = parseFloat(st["fill-opacity"] ?? 1), so = parseFloat(st["stroke-opacity"] ?? 1);
    const noFill = fill === "none" || fo === 0;
    const noStroke = stroke === "none" || so === 0 || parseFloat(st["stroke-width"] ?? 1) === 0;
    if (noFill && noStroke) continue;
    if (st.opacity === 0) continue;
    attrs.fill = noFill ? "none" : fill;
    if (!noStroke) {
      attrs.stroke = stroke;
      attrs["stroke-width"] = num(parseFloat(st["stroke-width"] ?? 1) * sc, 2);
      for (const k of ["stroke-linecap", "stroke-linejoin"]) if (st[k] && st[k] !== "butt" && st[k] !== "miter") attrs[k] = st[k];
      if (st["stroke-dasharray"] && st["stroke-dasharray"] !== "none") attrs["stroke-dasharray"] = (st["stroke-dasharray"].match(/[\d.]+/g) ?? []).map((v) => num(v * sc, 1)).join(" ");
      if (so < 1) attrs["stroke-opacity"] = num(so, 2);
    }
    if (!noFill && fo < 1) attrs["fill-opacity"] = num(fo, 2);
    if (st["fill-rule"] === "evenodd") attrs["fill-rule"] = "evenodd";
    if (st.opacity < 1) attrs.opacity = num(st.opacity, 2);
    const d = writePath(parsePath(shapeToD(p.node)), p.matrix);
    if (!d || d === "M0 0") continue;
    attrs.d = d;
    const el = `<path${Object.entries(attrs).map(([k, v]) => ` ${k}="${String(v).replace(/"/g, "&quot;")}"`).join("")}/>`;
    kept++;
    if (p.part) {
      for (const { part, clip } of p.part) {
        const piece = clip ? el.replace("<path", `<path clip-path="url(#${clipRef(clip)})"`) : el;
        if (part === "_context") {
          // Drawn as plain background: used under a shape that is also cut into named parts.
          current = null;
          out.push(piece);
        } else if (current && current.part === part) current.kids.push(piece);
        else {
          current = { part, kids: [piece], first: !firstSeen.has(part) };
          firstSeen.add(part);
          out.push(current);
        }
      }
    } else {
      current = null;
      out.push(el);
    }
  }

  const missing = Object.keys(cfg.parts).filter((k) => k !== "_context" && !firstSeen.has(k));
  if (missing.length) throw new Error(`${name}: nothing was drawn for ${missing.join(", ")}.`);
  const body = out.map((o) => (typeof o === "string" ? o : `<g ${o.first ? `id="${o.part}"` : `data-of="${o.part}"`}>${o.kids.join("")}</g>`)).join("");

  // The picture's size: the box round everything drawn, plus a small margin.
  const vb = cfg.viewBox ?? svg.attrs.viewBox?.split(/[\s,]+/).map(Number) ?? [0, 0, parseFloat(svg.attrs.width), parseFloat(svg.attrs.height)];
  const text = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map((v) => num(v)).join(" ")}">${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${body}</svg>\n`;
  for (const [re, what] of UNSAFE) if (re.test(text)) throw new Error(`Output check failed: ${what}.`);
  return { text, kept, groups: [...firstSeen] };
}

// ---------------------------------------------------------------- 7. run
const [dir, ...wanted] = process.argv.slice(2);
if (!dir) {
  console.error("Usage: node scripts/build-organs.mjs <folder with the downloaded SVGs> [system ...]");
  process.exit(1);
}
const outDir = new URL("../src/assets/organs/", import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
for (const [name, cfg] of Object.entries(SYSTEMS)) {
  if (wanted.length && !wanted.includes(name)) continue;
  const { text, kept, groups } = buildSystem(name, cfg, path.join(dir, cfg.file));
  fs.writeFileSync(new URL(`${name}.svg`, outDir), text);
  console.log(`${name}: ${(text.length / 1024).toFixed(0)} KB, ${(zlib.gzipSync(text).length / 1024).toFixed(0)} KB gzipped, ${kept} shapes, groups: ${groups.join(", ")}`);
}
