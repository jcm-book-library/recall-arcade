import type { Board, ItemState } from "../engine/types";
import { svgEl } from "./diagramBoard";

/** One quiz item and the groups (ids inside the picture's SVG) it lights up. */
export interface PictureItem {
  id: string;
  name: string;
  groups: string[];
}

/** What makes one picture different from another. */
export interface PictureSpec {
  /** Loads the SVG text lazily, so the home page stays small: () => import("./x.svg?raw"). */
  load: () => Promise<{ default: string }>;
  /** Read out by screen readers. */
  label: string;
  /** The credit line shown under the picture. */
  credit: string;
  /** Id of a group on the middle line of the body (the skeleton's sternum). Default: the middle of the picture. */
  axis?: string;
  /** Items whose label should always sit on one side of the screen: "L" or "R". */
  sides?: Record<string, "L" | "R">;
  /** Screen pixels a click may miss a part by and still count (for thin parts such as nerves). Default 0. */
  reach?: number;
}

interface Target {
  /** Where the leader line ends, on the left- or right-hand label column. */
  left: [number, number];
  right: [number, number];
}

type Box = { x: number; y: number; w: number; h: number };
/** A cut: only what is inside the box shows, or (out) everything except what is inside it. */
type Clip = Box & { out?: boolean };

/** Makes a board maker for one picture: the skeleton, the digestive system, and so on. */
export function pictureBoard(spec: PictureSpec) {
  return (container: HTMLElement, items: PictureItem[]) => createPicture(container, spec, items);
}

/**
 * A real anatomical illustration with a quiz on top.
 * Parts are groups in the SVG; their state is shown by CSS classes. Labels sit in two
 * columns beside the figure, with leader lines to a point found on each part.
 * The picture is loaded on demand so the home page stays small.
 */
async function createPicture(container: HTMLElement, spec: PictureSpec, items: PictureItem[]): Promise<Board> {
  const raw = (await spec.load()).default;
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml").documentElement;

  const wrap = document.createElement("div");
  wrap.className = "diagram picture";
  const svg = svgEl("svg", { viewBox: doc.getAttribute("viewBox")!, role: "img", "aria-label": spec.label });
  const art = svgEl("g", { class: "pic-art" }, svg);
  for (const child of [...doc.childNodes]) art.append(document.importNode(child, true));
  wrap.append(svg);
  const credit = document.createElement("p");
  credit.className = "tip credit";
  credit.textContent = spec.credit;
  container.append(wrap, credit);

  // Parts in this round get the "part" class; the rest are dimmed by CSS.
  // A part is one group, or several (data-of="<id>" marks the extra pieces of a part drawn in bits).
  const parts = new Map<string, Element[]>();
  const itemOf = new Map<Element, string>();
  for (const item of items) {
    const els = item.groups.flatMap((g) => [...art.querySelectorAll(`[id="${g}"], [data-of="${g}"]`)]);
    if (!els.length) console.error(`Picture: missing a group for ${item.id}`);
    parts.set(item.id, els);
    for (const el of els) {
      el.classList.add("part");
      itemOf.set(el, item.id);
    }
  }

  // Some pieces are cut to a band of a larger shape (a clip-path made of one box).
  // The boxes and hit tests below follow the cut, so a leader line never points at a hidden bit.
  const clipOf = new Map<Element, Clip>();
  for (const path of art.querySelectorAll("path[clip-path]")) {
    const id = /#([^)]+)/.exec(path.getAttribute("clip-path")!)?.[1];
    const rect = art.querySelector(`clipPath[id="${id}"] rect`);
    if (rect) {
      clipOf.set(path, { x: +rect.getAttribute("x")!, y: +rect.getAttribute("y")!, w: +rect.getAttribute("width")!, h: +rect.getAttribute("height")! });
      continue;
    }
    // "Everything except a box" is written as a big square with the box cut out of it.
    const hole = /Z\s*M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)/.exec(art.querySelector(`clipPath[id="${id}"] path`)?.getAttribute("d") ?? "");
    if (hole) clipOf.set(path, { x: +hole[1], y: +hole[2], w: +hole[3], h: +hole[4], out: true });
  }
  /** Is this spot on the shape's visible part, as far as its cut goes? */
  const shows = (path: Element, x: number, y: number) => {
    const c = clipOf.get(path);
    if (!c) return true;
    const inside = x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
    return c.out ? !inside : inside;
  };
  const pathsOf = (els: Element[]) => els.flatMap((e) => (e instanceof SVGPathElement ? [e] : [...e.querySelectorAll("path")]));
  /** The box round some parts, as drawn (a cut piece counts only its visible band). */
  function boxOf(els: Element[]): Box | null {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const path of pathsOf(els)) {
      const b = path.getBBox();
      const c = clipOf.get(path);
      const bx0 = c && !c.out ? Math.max(b.x, c.x) : b.x;
      const by0 = c && !c.out ? Math.max(b.y, c.y) : b.y;
      const bx1 = c && !c.out ? Math.min(b.x + b.width, c.x + c.w) : b.x + b.width;
      const by1 = c && !c.out ? Math.min(b.y + b.height, c.y + c.h) : b.y + b.height;
      if (bx1 <= bx0 || by1 <= by0) continue;
      x0 = Math.min(x0, bx0);
      y0 = Math.min(y0, by0);
      x1 = Math.max(x1, bx1);
      y1 = Math.max(y1, by1);
    }
    return x1 > x0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  }

  // ---- labels ----
  const labelLayer = svgEl("g", { class: "dlabels" }, svg);
  const labels = new Map<string, { g: SVGGElement; text: SVGTextElement; line: SVGLineElement; dot: SVGCircleElement; lines: string[] }>();
  for (const item of items) {
    const g = svgEl("g", { class: "dlabel" }, labelLayer);
    const line = svgEl("line", {}, g);
    const dot = svgEl("circle", { r: 2.5 }, g);
    const text = svgEl("text", {}, g);
    labels.set(item.id, { g, text, line, dot, lines: splitName(item.name) });
  }

  /** Long names go on two lines. */
  function splitName(name: string): string[] {
    const words = name.split(" ");
    if (name.length <= 11 || words.length < 2) return [name];
    const cut = Math.round(words.length / 2);
    return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
  }

  // ---- where each leader line points (from each part's own shape; same at any size) ----
  let targets: Map<string, Target> | null = null;
  let axis = 0;
  let unit = 1; // a part of the picture's width, so the size rules below suit any picture
  let edge = 0.5; // keep the leader dots about 2 screen pixels clear of where another part begins

  function measureTargets(): Map<string, Target> | null {
    const ab = art.getBBox();
    if (ab.width === 0) return null; // not on screen yet
    unit = ab.width / 400;
    edge = Math.max(0.5, (2 * 1.7 * ab.width) / svg.getBoundingClientRect().width);
    const mid = spec.axis ? boxOf([...art.querySelectorAll(`[id="${spec.axis}"]`)]) : null;
    axis = mid ? mid.x + mid.w / 2 : ab.x + ab.width / 2;
    const out = new Map<string, Target>();
    for (const item of items) {
      const els = parts.get(item.id) ?? [];
      const boxes = els.map((e) => boxOf([e]));
      const seen = els.filter((_, i) => boxes[i]);
      if (!seen.length) continue;
      const cx = boxes.filter((b): b is Box => !!b).map((b) => b.x + b.w / 2);
      const paired = seen.length >= 2 && Math.min(...cx) < axis - 25 * unit && Math.max(...cx) > axis + 25 * unit;
      const side = (isLeft: boolean) => (paired ? seen.filter((_, i) => (cx[i] < axis) === isLeft) : seen);
      out.set(item.id, { left: pointOn(item.id, side(true), paired, true), right: pointOn(item.id, side(false), paired, false) });
    }
    return out;
  }

  /** Every shape that belongs to a part, bottom to top, so we can tell which part is on top at a point. */
  let layers: { path: SVGPathElement; item: string; box: DOMRect; reach: number }[] | null = null;
  function topItemAt(x: number, y: number): string | null {
    layers ??= [...art.querySelectorAll("path")].flatMap((path) => {
      const item = itemOf.get(path.closest(".part") as Element);
      // Lit shapes get a thin outline (see the CSS), so count a little way past each edge too.
      const reach = Math.max(edge, parseFloat(path.getAttribute("stroke-width") ?? "0") / 2);
      return item ? [{ path, item, box: path.getBBox(), reach }] : [];
    });
    const pt = new DOMPoint(x, y);
    for (let i = layers.length - 1; i >= 0; i--) {
      const { path, item, box, reach } = layers[i];
      if (x < box.x - reach || x > box.x + box.width + reach || y < box.y - reach || y > box.y + box.height + reach) continue;
      if (!shows(path, x, y)) continue;
      if ((path.getAttribute("fill") !== "none" && path.isPointInFill(pt)) || path.isPointInStroke(pt)) return item;
    }
    return null;
  }

  /** A point that really lies on the part (and is not covered by another part), near the edge facing the label column. */
  function pointOn(id: string, els: Element[], paired: boolean, leftColumn: boolean): [number, number] {
    const b = boxOf(els)!;
    const x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
    const w = b.w;
    // One wide part (ribs, pelvis, shoulder blades, lungs): aim at the side that faces the label.
    const wide = !paired && w > 60 * unit;
    const want: [number, number] = [wide ? x0 + w * (leftColumn ? 0.2 : 0.8) : (x0 + x1) / 2, (y0 + y1) / 2];
    const paths = pathsOf(els);
    const onPart = (p: [number, number]) =>
      paths.some((path) => shows(path, p[0], p[1]) && path.isPointInFill(new DOMPoint(p[0], p[1])));
    // First choice: a point well inside where this part is the one you would hit. Then: any point where it is on top. Last: any point on it.
    const top = (p: [number, number], strict: boolean) =>
      topItemAt(p[0], p[1]) === id &&
      (!strict || [[edge, 0], [-edge, 0], [0, edge], [0, -edge]].every(([dx, dy]) => topItemAt(p[0] + dx, p[1] + dy) === id));
    for (const level of [2, 1, 0]) {
      let best: [number, number] | null = null;
      let bestD = Infinity;
      const N = 12;
      for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= N; j++) {
          const p: [number, number] = [x0 + (w * i) / N, y0 + ((y1 - y0) * j) / N];
          const d = (p[0] - want[0]) ** 2 + (p[1] - want[1]) ** 2;
          if (d >= bestD) continue;
          if (onPart(p) && (level === 0 || top(p, level === 2))) {
            best = p;
            bestD = d;
          }
        }
      }
      if (best) return best;
    }
    return want;
  }

  // ---- laying the labels out (redone when the width changes) ----
  let lastWidth = 0;
  function layout() {
    const W = svg.getBoundingClientRect().width;
    if (W < 10) return;
    targets ??= measureTargets();
    if (!targets) return;
    lastWidth = W;
    const ab = art.getBBox();
    const px = W < 520 ? 11 : 13;
    const maxH = window.innerHeight * 0.78;

    // Pick a text size that comes out at about `px` on screen, and room for the longest name.
    let margin = 90;
    let fs = 16;
    for (let k = 0; k < 3; k++) {
      const vbW = ab.width + 2 * (margin + 10);
      const scale = Math.min(W / vbW, maxH / (ab.height + 12));
      fs = px / scale;
      let widest = 0;
      for (const l of labels.values()) {
        l.text.style.fontSize = `${fs}px`;
        l.text.replaceChildren(...l.lines.map((s) => tspan(s)));
        for (const t of l.text.children) widest = Math.max(widest, (t as SVGTSpanElement).getComputedTextLength());
      }
      margin = widest + 14;
    }
    const top = ab.y - 4;
    const bottom = ab.y + ab.height + 4;
    svg.setAttribute("viewBox", `${ab.x - margin - 10} ${top} ${ab.width + 2 * (margin + 10)} ${bottom - top}`);
    const leftX = ab.x - 6;
    const rightX = ab.x + ab.width + 6;
    const lineH = fs * 1.15;
    const gap = fs * 0.35;

    // Top to bottom, put each label on whichever side it fits closest to its bone.
    const order = items.filter((i) => targets!.has(i.id)).sort((a, b) => avgY(a.id) - avgY(b.id));
    const col: Record<"L" | "R", { id: string; y: number; h: number }[]> = { L: [], R: [] };
    const free = { L: top, R: top };
    for (const item of order) {
      const t = targets.get(item.id)!;
      const h = labels.get(item.id)!.lines.length * lineH;
      const cost = (s: "L" | "R") => {
        if (spec.sides?.[item.id] && spec.sides[item.id] !== s) return Infinity;
        const target = s === "L" ? t.left : t.right;
        const y = Math.max(target[1], free[s] + h / 2);
        // Distance moved + length of the line + a nudge to keep the two columns even.
        return Math.abs(y - target[1]) + 0.12 * Math.abs((s === "L" ? leftX : rightX) - target[0]) + 5 * col[s].length;
      };
      const s = cost("L") <= cost("R") ? "L" : "R";
      const target = s === "L" ? t.left : t.right;
      const y = Math.max(target[1], free[s] + h / 2);
      col[s].push({ id: item.id, y, h });
      free[s] = y + h / 2 + gap;
    }
    // If the bottom label ran off the end, push the column back up.
    for (const s of ["L", "R"] as const) {
      let limit = bottom;
      for (let i = col[s].length - 1; i >= 0; i--) {
        const c = col[s][i];
        c.y = Math.min(c.y, limit - c.h / 2);
        limit = c.y - c.h / 2 - gap;
      }
      for (const c of col[s]) place(c.id, s === "L", s === "L" ? leftX : rightX, c.y, lineH, fs, targets.get(c.id)!);
    }
  }

  function avgY(id: string) {
    const t = targets!.get(id)!;
    return (t.left[1] + t.right[1]) / 2;
  }

  function tspan(s: string) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    t.textContent = s;
    return t;
  }

  function place(id: string, left: boolean, x: number, y: number, lineH: number, fs: number, t: Target) {
    const l = labels.get(id)!;
    const target = left ? t.left : t.right;
    l.text.setAttribute("text-anchor", left ? "end" : "start");
    const first = y - ((l.lines.length - 1) * lineH) / 2 + fs * 0.35;
    [...l.text.children].forEach((ts, i) => {
      ts.setAttribute("x", String(x));
      ts.setAttribute("y", String(first + i * lineH));
    });
    // The line leaves from beside the middle of the label, on the side facing the figure.
    l.line.setAttribute("x1", String(x + (left ? 4 : -4)));
    l.line.setAttribute("y1", String(y));
    l.line.setAttribute("x2", String(target[0]));
    l.line.setAttribute("y2", String(target[1]));
    l.dot.setAttribute("cx", String(target[0]));
    l.dot.setAttribute("cy", String(target[1]));
  }

  // Lay out once the picture has a size, and again if the width changes (rotating a phone).
  let frame = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!lastWidth || Math.abs(svg.getBoundingClientRect().width - lastWidth) > 1) layout();
    });
  });
  ro.observe(wrap);
  layout();

  // ---- the Board interface ----
  let hovered: string | null = null;
  function hover(id: string | null) {
    if (hovered === id) return;
    if (hovered) {
      for (const el of parts.get(hovered) ?? []) el.classList.remove("hover");
      labels.get(hovered)?.g.classList.remove("hover");
    }
    hovered = id;
    if (id) {
      for (const el of parts.get(id) ?? []) el.classList.add("hover");
      labels.get(id)?.g.classList.add("hover");
    }
  }
  const partAt = (target: EventTarget | null) => {
    const el = (target as Element | null)?.closest(".part");
    return el ? itemOf.get(el) ?? null : null;
  };
  let explore = false;
  /** The part under a click, or, for a click that just misses a thin part (nerves, valves), the nearest one within a fingertip. */
  const partNear = (e: MouseEvent) => {
    const direct = partAt(e.target);
    if (direct || !spec.reach) return direct;
    for (const r of [spec.reach / 2, spec.reach])
      for (let a = 0; a < 8; a++) {
        const hit = document.elementFromPoint(e.clientX + r * Math.cos((a * Math.PI) / 4), e.clientY + r * Math.sin((a * Math.PI) / 4));
        const id = hit && svg.contains(hit) ? partAt(hit) : null;
        if (id) return id;
      }
    return null;
  };
  svg.addEventListener("pointerover", (e) => explore && hover(partAt(e.target)));
  svg.addEventListener("pointerleave", () => hover(null));
  svg.addEventListener("click", (e) => {
    if (explore) hover(partNear(e)); // a tap names it, on phones too
  });

  return {
    setState(id: string, state: ItemState) {
      const apply = (el: Element) => {
        el.classList.remove("found", "missed", "unseen");
        if (state !== "open") el.classList.add(state);
      };
      parts.get(id)?.forEach(apply);
      const l = labels.get(id);
      if (l) apply(l.g);
    },
    flash(id: string) {
      for (const el of parts.get(id) ?? []) {
        el.classList.remove("flash");
        void (el as SVGElement).getBoundingClientRect();
        el.classList.add("flash");
      }
    },
    setCurrent(id: string | null) {
      wrap.classList.toggle("has-current", !!id);
      for (const els of parts.values()) for (const el of els) el.classList.remove("current");
      for (const el of id ? parts.get(id) ?? [] : []) el.classList.add("current");
    },
    onPick(handler: (id: string) => void) {
      wrap.classList.add("pickable");
      svg.addEventListener("click", (e) => {
        const id = partNear(e);
        if (id) handler(id);
      });
    },
    setExplore(on: boolean) {
      explore = on;
      wrap.classList.toggle("exploring", on);
      if (!on) hover(null);
    },
    destroy() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      wrap.remove();
      credit.remove();
    },
  };
}
