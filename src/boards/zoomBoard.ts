import type { Board, Item, ItemState } from "../engine/types";
// THE ZOOM BOARD: a quiz that zooms a stage at a time. Infinity & Beyond zooms OUT (night sky to
// galaxies); Inner Space zooms IN (skin to a single atom). The board knows nothing about space or
// cells: each quiz hands it a ZoomSet (its stages, the order to play them, how to draw each
// stage's backdrop, and a theme class for the colours).

const NS = "http://www.w3.org/2000/svg";
const W = 1000;
const H = 560;

export interface ZoomItem {
  id: string;
  name: string;
  aliases?: string[];
  stage: number;
  /**
   * What the marker looks like.
   * "body" = a circle, "band" = a thick curved strip, "ring" = a dashed loop, "arm" = a spiral
   * arm, "stars" = a small star cluster, "path" = a filled shape (d), "custom" = the item
   * draws itself with its own `draw` function.
   */
  shape: "body" | "band" | "ring" | "arm" | "stars" | "path" | "custom";
  /** Where the marker sits (and, for strips and custom drawings, where its label hangs from). */
  x: number;
  y: number;
  r?: number;
  /** Extra drawing data: the path for bands, arms and paths. */
  d?: string;
  /** The real colour a marker takes on once it is named. */
  color?: string;
  /** Where the label goes, relative to the marker. */
  label?: "above" | "below" | "left" | "right";
  /** Space between the marker and its label. Use 0 with "below" to centre a label on a spot. */
  gap?: number;
  /** An extra class on the marker, for styling. */
  cls?: string;
  /** A thin line from the label to this point, shown once the item is named. */
  to?: [number, number];
  /** For "custom": adds the drawing to the item's group. Parts that change colour use class "mark". */
  draw?: (g: SVGGElement) => void;
}

export interface ZoomStage {
  n: number;
  title: string;
  scale: string;
  fact: string;
}

/** Everything that makes one zoom quiz different from another. */
export interface ZoomSet {
  stages: ZoomStage[];
  /** The order stages are played in (stage numbers). */
  order: number[];
  /** A class on the wrapper, for the colours: "zoom-space" or "zoom-micro". */
  theme: string;
  /** Background drawing for a stage: the parts that aren't questions. */
  drawBackdrop(stage: number, g: SVGGElement): void;
  /** Drawn after the items, so nothing covers it (optional). */
  drawOverlay?(stage: number, g: SVGGElement): void;
  /** Gets the drawing details back out of an item. */
  itemOf(item: Item): ZoomItem;
}

export function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.append(node);
  return node;
}

function drawItem(item: Item, z: ZoomItem, g: SVGGElement) {
  const group = el("g", { class: "zitem", "data-id": item.id }, g);
  const lx = z.x;
  const ly = z.y;
  const r = z.r ?? 8;
  if (z.shape === "body") {
    el("circle", { cx: z.x, cy: z.y, r, class: "mark", "data-color": z.color ?? "" }, group);
  } else if (z.shape === "band") {
    el("path", { d: z.d!, class: "mark band" }, group);
  } else if (z.shape === "ring") {
    el("path", { d: z.d!, class: "mark ring" }, group);
  } else if (z.shape === "arm") {
    el("path", { d: z.d!, class: `mark arm ${z.cls ?? ""}` }, group);
  } else if (z.shape === "path") {
    el("path", { d: z.d!, class: `mark ${z.cls ?? ""}`, "data-color": z.color ?? "" }, group);
  } else if (z.shape === "custom") {
    z.draw?.(group);
  } else {
    // A little cluster of stars.
    for (const [dx, dy, rr] of [[0, 0, 3], [-9, 6, 2], [8, 8, 2.2], [3, -9, 1.8], [-6, -6, 1.6]]) {
      el("circle", { cx: z.x + dx, cy: z.y + dy, r: rr, class: "mark star" }, group);
    }
  }
  const pos = z.label ?? "below";
  const off = z.gap ?? (z.shape === "body" ? r + 14 : 18);
  if (z.to) el("line", { x1: z.x, y1: z.y, x2: z.to[0], y2: z.to[1], class: "zlead" }, group);
  const tx = pos === "left" ? lx - off : pos === "right" ? lx + off : lx;
  const ty = pos === "above" ? ly - off + 4 : pos === "below" ? ly + off + 4 : ly + 5;
  const text = el("text", { x: tx, y: ty, class: `zlabel ${pos}` }, group);
  text.textContent = item.name;
  return group;
}

export function createZoomBoard(container: HTMLElement, all: Item[], playing: Item[], maxStage: number, set: ZoomSet): Board {
  const zOf = set.itemOf;
  const rankOf = (stage: number) => set.order.indexOf(stage) + 1;
  const inPlay = new Set(playing.map((i) => i.id));
  // maxStage is how many stages deep this round goes, in play order.
  const stages = set.order.filter((n) => rankOf(n) <= maxStage).map((n) => set.stages.find((s) => s.n === n)!);
  const groups = new Map<string, SVGGElement>();
  const state = new Map<string, ItemState>();
  let currentStage = stages[0].n;

  const wrap = document.createElement("div");
  wrap.className = `zoom ${set.theme}`;
  const tabs = document.createElement("div");
  tabs.className = "ztabs";
  tabs.setAttribute("role", "tablist");
  const viewport = document.createElement("div");
  viewport.className = "zviewport";
  const caption = document.createElement("div");
  caption.className = "zcaption";
  // Word bank for the second level of help.
  const bank = document.createElement("div");
  bank.className = "zbank";
  bank.hidden = true;
  wrap.append(tabs, viewport, bank, caption);
  container.append(wrap);

  const panes = new Map<number, SVGSVGElement>();
  for (const s of stages) {
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "zstage", role: "img", "aria-label": s.title });
    const g = el("g", {}, svg);
    set.drawBackdrop(s.n, g);
    for (const item of all) {
      const z = zOf(item);
      if (z.stage !== s.n || !inPlay.has(item.id)) continue;
      const grp = drawItem(item, z, g);
      groups.set(item.id, grp);
      state.set(item.id, "open");
    }
    set.drawOverlay?.(s.n, g);
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
        b.innerHTML = `<span class="zn">${rankOf(s.n)}</span> <span class="zt"></span> <span class="zc">${got}/${ids.length}</span>`;
        b.querySelector(".zt")!.textContent = s.title;
        b.addEventListener("click", () => go(s.n));
        return b;
      }),
    );
  }

  // ---------- help ----------
  let hintLevel = 0;
  let picked: string | null = null;
  let onHintPick: ((id: string) => void) | null = null;
  let bankOrder: string[] = [];
  let bankMsg = "Pick a name, then click where it goes.";

  function labelText(id: string) {
    const grp = groups.get(id);
    const t = grp?.querySelector(".zlabel");
    if (!grp || !t) return;
    const name = playing.find((i) => i.id === id)!.name;
    const open = state.get(id) === "open";
    const hinted = open && hintLevel >= 1;
    t.textContent = hinted ? `${name[0]}…` : name;
    grp.classList.toggle("hinted", hinted);
  }

  function renderBank() {
    bank.hidden = hintLevel < 2;
    if (bank.hidden) return;
    const ids = bankOrder.filter((id) => state.get(id) === "open" && zOf(playing.find((i) => i.id === id)!).stage === currentStage);
    if (picked && !ids.includes(picked)) picked = null;
    const chips = ids.map((id) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = id === picked ? "chip on" : "chip";
      b.textContent = playing.find((i) => i.id === id)!.name;
      b.addEventListener("click", () => {
        picked = picked === id ? null : id;
        renderBank();
      });
      return b;
    });
    const msg = document.createElement("p");
    msg.className = "zbank-note";
    msg.textContent = ids.length ? bankMsg : "Everything on this stage is named.";
    bank.replaceChildren(msg, ...chips);
    wrap.classList.toggle("placing", !!picked);
  }

  viewport.addEventListener("click", (e) => {
    if (hintLevel < 2 || !picked) return;
    const id = (e.target as Element).closest(".zitem")?.getAttribute("data-id");
    if (!id) return;
    if (id === picked) {
      picked = null;
      bankMsg = "Pick a name, then click where it goes.";
      onHintPick?.(id);
    } else {
      bankMsg = "Not that one. Try another spot.";
      renderBank();
    }
  });

  function go(n: number) {
    currentStage = n;
    for (const [k, svg] of panes) {
      svg.classList.toggle("z-now", k === n);
      svg.classList.toggle("z-past", rankOf(k) < rankOf(n));
      svg.classList.toggle("z-future", rankOf(k) > rankOf(n));
    }
    const s = set.stages.find((x) => x.n === n)!;
    caption.innerHTML = `<strong></strong><span></span>`;
    caption.querySelector("strong")!.textContent = s.scale;
    caption.querySelector("span")!.textContent = ` ${s.fact}`;
    renderTabs();
    renderBank();
  }

  /** After a stage is complete, zoom out to the next one. */
  function maybeAdvance() {
    const ids = playing.filter((i) => zOf(i).stage === currentStage).map((i) => i.id);
    const next = stages[stages.findIndex((s) => s.n === currentStage) + 1];
    if (ids.length && ids.every((id) => state.get(id) === "found") && next) {
      const from = currentStage;
      window.setTimeout(() => currentStage === from && go(next.n), 900);
    }
  }

  go(stages[0].n);
  let exploring = false;

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
      // Line-shaped markers (a vessel, a DNA strand) change their stroke instead.
      for (const m of grp.querySelectorAll<SVGElement>(".mark[data-stroke]")) {
        m.style.stroke = s === "found" && m.dataset.stroke ? m.dataset.stroke : "";
      }
      labelText(id);
      renderTabs();
      renderBank();
      if (s === "found" && !exploring) maybeAdvance(); // studying shouldn't zoom off by itself
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
    setExplore(on: boolean) {
      exploring = on;
      // Every label is shown once the round ends, so the help can go.
      if (on) {
        bank.hidden = true;
        wrap.classList.remove("placing");
      }
    },
    hint(level: number, pick: (id: string) => void) {
      hintLevel = level;
      onHintPick = pick;
      picked = null;
      bankMsg = "Pick a name, then click where it goes.";
      bankOrder = [...groups.keys()].sort(() => Math.random() - 0.5);
      for (const id of groups.keys()) labelText(id);
      renderBank();
    },
    destroy() {
      wrap.remove();
    },
  };
}
