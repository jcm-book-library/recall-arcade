import type { Board, ItemState } from "../engine/types";

const NS = "http://www.w3.org/2000/svg";

export interface DiagramLabel {
  /** Where the text goes. */
  x: number;
  y: number;
  /** The point on the drawing the leader line points to. */
  to: [number, number];
  anchor?: "start" | "middle" | "end";
  text: string;
}

export interface DiagramSpec {
  viewBox: string;
  /** Draws the picture. Parts the quiz asks about carry data-part="<item id>". */
  draw: (svg: SVGSVGElement) => void;
  labels: Record<string, DiagramLabel>;
  ariaLabel: string;
}

/** Make an SVG element. */
export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.append(node);
  return node;
}

/**
 * A labelled diagram (a cell, a skeleton). One part can be highlighted at a time,
 * names appear with a leader line once found, and parts can be clicked.
 */
export function createDiagramBoard(container: HTMLElement, spec: DiagramSpec, inPlay: Set<string>): Board {
  const wrap = document.createElement("div");
  wrap.className = "diagram";
  const svg = svgEl("svg", { viewBox: spec.viewBox, role: "img", "aria-label": spec.ariaLabel });
  wrap.append(svg);
  container.append(wrap);
  spec.draw(svg);

  const parts = new Map<string, Element[]>();
  for (const el of svg.querySelectorAll("[data-part]")) {
    const id = el.getAttribute("data-part")!;
    if (!inPlay.has(id)) {
      el.classList.add("off");
      continue;
    }
    el.classList.add("part");
    if (!parts.has(id)) parts.set(id, []);
    parts.get(id)!.push(el);
  }

  const labelLayer = svgEl("g", { class: "dlabels" }, svg);
  const labels = new Map<string, SVGGElement>();
  for (const [id, l] of Object.entries(spec.labels)) {
    if (!inPlay.has(id)) continue;
    const g = svgEl("g", { class: "dlabel" }, labelLayer);
    const pad = l.anchor === "end" ? 6 : l.anchor === "start" ? -6 : 0;
    svgEl("line", { x1: l.x + pad, y1: l.y - 4, x2: l.to[0], y2: l.to[1] }, g);
    svgEl("circle", { cx: l.to[0], cy: l.to[1], r: 2.5 }, g);
    const t = svgEl("text", { x: l.x, y: l.y, "text-anchor": l.anchor ?? "start" }, g);
    t.textContent = l.text;
    labels.set(id, g);
  }

  let explore = false;
  return {
    setState(id: string, state: ItemState) {
      for (const el of parts.get(id) ?? []) {
        el.classList.remove("found", "missed", "unseen");
        if (state !== "open") el.classList.add(state);
      }
      const label = labels.get(id);
      if (label) {
        label.classList.remove("found", "missed", "unseen");
        if (state !== "open") label.classList.add(state);
      }
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
        const id = (e.target as Element).closest("[data-part]")?.getAttribute("data-part");
        if (id && parts.has(id)) handler(id);
      });
    },
    setExplore(on: boolean) {
      explore = on;
      wrap.classList.toggle("exploring", explore);
    },
    destroy() {
      wrap.remove();
    },
  };
}
