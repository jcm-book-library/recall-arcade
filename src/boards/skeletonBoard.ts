import type { Board, ItemState } from "../engine/types";
import { svgEl } from "./diagramBoard";

/** One quiz item and the bone groups (ids inside skeleton-front.svg) it lights up. */
export interface SkeletonItem {
  id: string;
  name: string;
  groups: string[];
}

interface Target {
  /** Where the leader line ends, on the left- or right-hand label column. */
  left: [number, number];
  right: [number, number];
}

const CREDIT = "Skeleton illustration: LadyofHats, public domain, via Wikimedia Commons";

/**
 * The skeleton picture (a real anatomical illustration) with a quiz on top.
 * Bones are groups in the SVG; their state is shown by CSS classes. Labels sit in two
 * columns beside the figure, with leader lines to a point found on each bone.
 * The picture is loaded on demand so the home page stays small.
 */
export async function createSkeletonBoard(container: HTMLElement, items: SkeletonItem[]): Promise<Board> {
  const raw = (await import("../assets/skeleton-front.svg?raw")).default;
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml").documentElement;

  const wrap = document.createElement("div");
  wrap.className = "diagram skeleton";
  const svg = svgEl("svg", { viewBox: doc.getAttribute("viewBox")!, role: "img", "aria-label": "Human skeleton, front view" });
  const art = svgEl("g", { class: "skel-art" }, svg);
  for (const child of [...doc.childNodes]) art.append(document.importNode(child, true));
  wrap.append(svg);
  const credit = document.createElement("p");
  credit.className = "tip credit";
  credit.textContent = CREDIT;
  container.append(wrap, credit);

  // Bones in this round get the "part" class; the rest are dimmed by CSS.
  const parts = new Map<string, Element[]>();
  const itemOf = new Map<Element, string>();
  for (const item of items) {
    const els = item.groups.map((g) => art.querySelector(`[id="${g}"]`)).filter((e): e is Element => !!e);
    if (els.length !== item.groups.length) console.error(`Skeleton: missing a bone group for ${item.id}`);
    parts.set(item.id, els);
    for (const el of els) {
      el.classList.add("part");
      itemOf.set(el, item.id);
    }
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

  // ---- where each leader line points (from each bone's own shape; same at any size) ----
  let targets: Map<string, Target> | null = null;
  let axis = 0;

  function measureTargets(): Map<string, Target> | null {
    const sternum = art.querySelector('[id="sternum"]') as SVGGraphicsElement | null;
    const sb = sternum?.getBBox();
    if (!sb || sb.width === 0) return null; // not on screen yet
    axis = sb.x + sb.width / 2;
    const out = new Map<string, Target>();
    for (const item of items) {
      const els = (parts.get(item.id) ?? []) as SVGGraphicsElement[];
      if (!els.length) continue;
      const boxes = els.map((e) => e.getBBox());
      const cx = boxes.map((b) => b.x + b.width / 2);
      const paired = els.length >= 2 && Math.min(...cx) < axis - 25 && Math.max(...cx) > axis + 25;
      const side = (isLeft: boolean) => (paired ? els.filter((_, i) => (cx[i] < axis) === isLeft) : els);
      out.set(item.id, { left: pointOn(side(true), paired, true), right: pointOn(side(false), paired, false) });
    }
    return out;
  }

  /** A point that really lies on the bone, near the edge facing the label column. */
  function pointOn(els: SVGGraphicsElement[], paired: boolean, leftColumn: boolean): [number, number] {
    const boxes = els.map((e) => e.getBBox());
    const x0 = Math.min(...boxes.map((b) => b.x));
    const y0 = Math.min(...boxes.map((b) => b.y));
    const x1 = Math.max(...boxes.map((b) => b.x + b.width));
    const y1 = Math.max(...boxes.map((b) => b.y + b.height));
    const w = x1 - x0;
    // One wide bone group (ribs, pelvis, shoulder blades): aim at the side that faces the label.
    const wide = !paired && w > 60;
    const want: [number, number] = [wide ? x0 + w * (leftColumn ? 0.2 : 0.8) : (x0 + x1) / 2, (y0 + y1) / 2];
    const paths = els.flatMap((e) => (e instanceof SVGPathElement ? [e] : [...e.querySelectorAll("path")]));
    let best = want;
    let bestD = Infinity;
    const N = 12;
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const p: [number, number] = [x0 + (w * i) / N, y0 + ((y1 - y0) * j) / N];
        const d = (p[0] - want[0]) ** 2 + (p[1] - want[1]) ** 2;
        if (d >= bestD) continue;
        const pt = new DOMPoint(p[0], p[1]);
        if (paths.some((path) => path.isPointInFill(pt))) {
          best = p;
          bestD = d;
        }
      }
    }
    return best;
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
  svg.addEventListener("pointerover", (e) => explore && hover(partAt(e.target)));
  svg.addEventListener("pointerleave", () => hover(null));
  svg.addEventListener("click", (e) => {
    if (explore) hover(partAt(e.target)); // a tap names it, on phones too
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
        const id = partAt(e.target);
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
