import type { Board, Item, ItemState } from "../engine/types";
import { STAGES, SUN_X, orbit, type ZoomItem } from "../decks/zoomout-data";

const NS = "http://www.w3.org/2000/svg";
const W = 1000;
const H = 560;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.append(node);
  return node;
}

/** One arm of a spiral galaxy as a smooth path, plus a point to hang its label on. */
function spiralArm(offset: number, turns = 0.9, inner = 40, growth = 0.33, cx = 500, cy = 280) {
  const pts: [number, number][] = [];
  for (let t = 0; t <= turns * Math.PI * 2; t += 0.08) {
    const r = inner * Math.exp(growth * t);
    if (r > 270) break;
    pts.push([cx + Math.cos(t + offset) * r * 1.35, cy + Math.sin(t + offset) * r * 0.82]);
  }
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return { d, label: pts[Math.floor(pts.length * 0.78)] };
}

const ARMS: Record<string, { d: string; label: [number, number] }> = {
  "0": spiralArm(0),
  "1": spiralArm(Math.PI / 2),
  "2": spiralArm(Math.PI),
  "3": spiralArm((3 * Math.PI) / 2),
  // The Orion Arm is a short spur between two big arms; the Sun sits on it.
  spur: (() => {
    const a = spiralArm(Math.PI * 0.75, 0.3, 120, 0.25);
    return a;
  })(),
};

/** Background drawing for each stage: the parts that aren't questions. */
function drawBackdrop(stage: number, g: SVGGElement) {
  if (stage === 1) {
    el("circle", { cx: SUN_X, cy: 290, r: 150, class: "z-sun" }, g);
    for (const x of [150, 210, 272, 330, 458, 622, 770, 900]) {
      el("circle", { cx: SUN_X, cy: 290, r: orbit(x), class: "z-orbit" }, g);
    }
    el("ellipse", { cx: 622, cy: 290, rx: 62, ry: 12, class: "z-ring" }, g);
  }
  if (stage === 2) {
    // Moons: their planets drawn as plain discs.
    for (const [x, y, r] of [[128, 120, 10], [305, 110, 28], [575, 115, 24], [812, 110, 14]]) {
      el("circle", { cx: x, cy: y, r, class: "z-parent" }, g);
    }
    el("ellipse", { cx: 305, cy: 110, rx: 62, ry: 46, class: "z-orbit" }, g);
    el("text", { x: 500, y: 215, class: "z-caption" }, g).textContent = "Moons";
    el("line", { x1: 0, y1: 240, x2: W, y2: 240, class: "z-divider" }, g);
    // The Sun and planets squashed together at the left.
    el("circle", { cx: 40, cy: 430, r: 14, class: "z-sun" }, g);
    for (const [x, r] of [[70, 2], [82, 3], [96, 3], [112, 2], [200, 7], [260, 6], [320, 4], [370, 4]]) {
      el("circle", { cx: x, cy: 430, r, class: "z-parent" }, g);
    }
    el("text", { x: 500, y: 300, class: "z-caption" }, g).textContent = "Belts and dwarf planets";
  }
  if (stage === 3) {
    for (const ly of [5, 10]) el("circle", { cx: 500, cy: 280, r: ly * 22, class: "z-orbit" }, g);
    el("text", { x: 500 + 5 * 22 + 4, y: 276, class: "z-small" }, g).textContent = "5 ly";
    el("text", { x: 500 + 10 * 22 + 4, y: 276, class: "z-small" }, g).textContent = "10 ly";
    el("circle", { cx: 500, cy: 280, r: 7, class: "z-sun" }, g);
    el("text", { x: 500, y: 300, class: "z-small z-centre" }, g).textContent = "Sun";
  }
  if (stage === 4) {
    el("circle", { cx: 500, cy: 280, r: 225, class: "z-orbit" }, g);
    el("text", { x: 500, y: 40, class: "z-small z-centre" }, g).textContent = "The Sun's path through the year";
    el("circle", { cx: 500, cy: 280, r: 10, class: "z-earth" }, g);
    el("text", { x: 500, y: 302, class: "z-small z-centre" }, g).textContent = "Earth";
  }
  if (stage === 5) {
    el("ellipse", { cx: 500, cy: 280, rx: 360, ry: 230, class: "z-halo" }, g);
    el("ellipse", { cx: 500, cy: 280, rx: 60, ry: 22, class: "z-bar", transform: "rotate(-25 500 280)" }, g);
  }
  if (stage === 6) {
    el("text", { x: 500, y: 30, class: "z-small z-centre" }, g).textContent = "Not to scale";
  }
}

function drawItem(item: Item, z: ZoomItem, g: SVGGElement) {
  const group = el("g", { class: "zitem", "data-id": item.id }, g);
  let lx = z.x;
  let ly = z.y;
  const r = z.r ?? 8;
  if (z.shape === "body") {
    el("circle", { cx: z.x, cy: z.y, r, class: "mark", "data-color": z.color ?? "" }, group);
  } else if (z.shape === "band") {
    el("path", { d: z.d!, class: "mark band" }, group);
  } else if (z.shape === "ring") {
    el("path", { d: z.d!, class: "mark ring" }, group);
  } else if (z.shape === "arm") {
    const arm = ARMS[z.d!];
    el("path", { d: arm.d, class: z.d === "spur" ? "mark arm spur" : "mark arm" }, group);
    [lx, ly] = arm.label;
  } else {
    // A little cluster of stars.
    for (const [dx, dy, rr] of [[0, 0, 3], [-9, 6, 2], [8, 8, 2.2], [3, -9, 1.8], [-6, -6, 1.6]]) {
      el("circle", { cx: z.x + dx, cy: z.y + dy, r: rr, class: "mark star" }, group);
    }
  }
  const pos = z.label ?? "below";
  const off = z.shape === "body" ? r + 14 : 18;
  const tx = pos === "left" ? lx - off : pos === "right" ? lx + off : lx;
  const ty = pos === "above" ? ly - off + 4 : pos === "below" ? ly + off + 4 : ly + 5;
  const text = el("text", { x: tx, y: ty, class: `zlabel ${pos}` }, group);
  text.textContent = item.name;
  return group;
}

export function createZoomBoard(container: HTMLElement, all: Item[], playing: Item[], maxStage: number): Board {
  const zOf = (i: Item) => i.data as unknown as ZoomItem;
  const inPlay = new Set(playing.map((i) => i.id));
  const stages = STAGES.filter((s) => s.n <= maxStage);
  const groups = new Map<string, SVGGElement>();
  const state = new Map<string, ItemState>();
  let currentStage = 1;

  const wrap = document.createElement("div");
  wrap.className = "zoom";
  const tabs = document.createElement("div");
  tabs.className = "ztabs";
  tabs.setAttribute("role", "tablist");
  const viewport = document.createElement("div");
  viewport.className = "zviewport";
  const caption = document.createElement("div");
  caption.className = "zcaption";
  wrap.append(tabs, viewport, caption);
  container.append(wrap);

  const panes = new Map<number, SVGSVGElement>();
  for (const s of stages) {
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "zstage", role: "img", "aria-label": s.title });
    const g = el("g", {}, svg);
    drawBackdrop(s.n, g);
    for (const item of all) {
      const z = zOf(item);
      if (z.stage !== s.n || !inPlay.has(item.id)) continue;
      const grp = drawItem(item, z, g);
      groups.set(item.id, grp);
      state.set(item.id, "open");
    }
    if (s.n === 5) {
      // Drawn last so the arms don't cover it.
      const [sx, sy] = ARMS.spur.label;
      el("circle", { cx: sx, cy: sy, r: 5, class: "z-you" }, g);
      el("text", { x: sx + 10, y: sy - 10, class: "z-you-label" }, g).textContent = "You are here";
    }
    viewport.append(svg);
    panes.set(s.n, svg);
  }

  function renderTabs() {
    tabs.replaceChildren(
      ...stages.map((s) => {
        const ids = playing.filter((i) => zOf(i).stage === s.n).map((i) => i.id);
        const got = ids.filter((id) => state.get(id) === "found").length;
        const b = document.createElement("button");
        b.type = "button";
        b.className = s.n === currentStage ? "ztab on" : got === ids.length ? "ztab done" : "ztab";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", String(s.n === currentStage));
        b.innerHTML = `<span class="zn">${s.n}</span> <span class="zt"></span> <span class="zc">${got}/${ids.length}</span>`;
        b.querySelector(".zt")!.textContent = s.title;
        b.addEventListener("click", () => go(s.n));
        return b;
      }),
    );
  }

  function go(n: number) {
    currentStage = n;
    for (const [k, svg] of panes) {
      svg.classList.toggle("z-now", k === n);
      svg.classList.toggle("z-past", k < n);
      svg.classList.toggle("z-future", k > n);
    }
    const s = STAGES.find((x) => x.n === n)!;
    caption.innerHTML = `<strong></strong><span></span>`;
    caption.querySelector("strong")!.textContent = s.scale;
    caption.querySelector("span")!.textContent = ` ${s.fact}`;
    renderTabs();
  }

  /** After a stage is complete, zoom out to the next one. */
  function maybeAdvance() {
    const ids = playing.filter((i) => zOf(i).stage === currentStage).map((i) => i.id);
    if (ids.length && ids.every((id) => state.get(id) === "found") && currentStage < maxStage) {
      const from = currentStage;
      window.setTimeout(() => currentStage === from && go(from + 1), 900);
    }
  }

  go(1);

  return {
    setState(id: string, s: ItemState) {
      const grp = groups.get(id);
      if (!grp) return;
      state.set(id, s);
      grp.classList.remove("found", "missed", "unseen");
      if (s !== "open") grp.classList.add(s);
      // Planets and stars show their real colour once named.
      for (const m of grp.querySelectorAll<SVGElement>(".mark[data-color]")) {
        m.style.fill = s === "found" && m.dataset.color ? m.dataset.color : "";
      }
      renderTabs();
      if (s === "found") maybeAdvance();
    },
    flash(id: string) {
      const grp = groups.get(id);
      if (!grp) return;
      const item = playing.find((i) => i.id === id)!;
      if (zOf(item).stage !== currentStage) go(zOf(item).stage);
      grp.classList.remove("flash");
      void grp.getBoundingClientRect();
      grp.classList.add("flash");
    },
    setExplore() {
      /* every label is shown once the round ends */
    },
    destroy() {
      wrap.remove();
    },
  };
}
