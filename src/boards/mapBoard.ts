import { geoEqualEarth, geoPath, geoGraticule10, type GeoPermissibleObjects } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, zoomTransform, type ZoomTransform } from "d3-zoom";
import type { Board, ItemState } from "../engine/types";

export interface MapShape {
  /** Item id, or null for land that is drawn but never asked. */
  id: string | null;
  label: string;
  feature?: GeoPermissibleObjects;
  point?: [number, number];
  /** How to draw it. Defaults to land. */
  kind?: "land" | "water" | "river";
  /** Seas and oceans are drawn beneath the land so coastlines stay crisp. */
  underLand?: boolean;
  /** Extra CSS class, e.g. "hub" for the country in the middle of a Neighbours round. */
  extraClass?: string;
}

export interface MapView {
  /** Projection rotation in degrees of longitude. */
  rotate: number;
  /** [west, south, east, north] to fit on screen; omit to fit all shapes. */
  bbox?: [number, number, number, number];
}

const W = 960;
const H = 540;
const DOT_PX = 5;

function bboxOutline([w, s, e, n]: [number, number, number, number]): GeoPermissibleObjects {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 20; i++) {
    const lon = w + ((e - w) * i) / 20;
    pts.push([lon, s], [lon, n]);
  }
  for (let i = 0; i <= 10; i++) {
    const lat = s + ((n - s) * i) / 10;
    pts.push([w, lat], [e, lat]);
  }
  return { type: "MultiPoint", coordinates: pts };
}

export function createMapBoard(
  container: HTMLElement,
  shapes: MapShape[],
  inPlay: Set<string>,
  view: MapView,
  opts: { currentLabel?: (id: string) => string } = {},
): Board {
  const projection = geoEqualEarth().rotate([view.rotate, 0]);
  const fitTarget: GeoPermissibleObjects = view.bbox
    ? bboxOutline(view.bbox)
    : { type: "FeatureCollection", features: shapes.filter((s) => s.feature).map((s) => s.feature) } as GeoPermissibleObjects;
  projection.fitExtent([[10, 10], [W - 10, H - 10]], fitTarget);
  const path = geoPath(projection);

  const wrap = document.createElement("div");
  wrap.className = "map";
  container.append(wrap);

  const svg = select(wrap)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("role", "img")
    .attr("aria-label", "World map");
  const root = svg.append("g");
  root.append("path").attr("class", "map-ocean").attr("d", path({ type: "Sphere" }) ?? "");
  root.append("path").attr("class", "map-grid").attr("d", path(geoGraticule10()) ?? "");

  const els = new Map<string, Element[]>();
  const track = (id: string | null, el: Element) => {
    if (!id) return;
    if (!els.has(id)) els.set(id, []);
    els.get(id)!.push(el);
  };

  const seaLayer = root.append("g");
  const landLayer = root.append("g");
  // Rivers sit under lakes, so a river running through a lake never blocks clicks on it.
  const riverLayer = root.append("g");
  const waterLayer = root.append("g");
  const dotLayer = root.append("g");
  // Pulsing ring that marks the place being asked about.
  const locator = root.append("circle").attr("class", "locator").attr("visibility", "hidden").node()!;
  const dots: SVGCircleElement[] = [];

  for (const shape of shapes) {
    const playing = shape.id !== null && inPlay.has(shape.id);
    let small = false;
    let centre: [number, number] | null = null;
    if (shape.feature) {
      const d = path(shape.feature);
      if (!d) continue;
      const kind = shape.kind ?? "land";
      const layer = kind === "land" ? landLayer : kind === "river" ? riverLayer : shape.underLand ? seaLayer : waterLayer;
      const p = layer
        .append("path")
        .attr("d", d)
        .attr("class", `${playing ? kind : `${kind} off`}${shape.extraClass ? ` ${shape.extraClass}` : ""}`)
        .attr("data-label", shape.label)
        .node()!;
      track(playing ? shape.id : null, p);
      if (playing) p.setAttribute("data-id", shape.id!);
      if (kind === "river" && playing) {
        // Rivers are thin, so give them a wider invisible strip to click on.
        riverLayer.append("path").attr("d", d).attr("class", "river-hit")
          .attr("data-id", shape.id!).attr("data-label", shape.label);
      }
      // Island nations can be spread wide but have almost no land, so judge by area.
      // Long thin lakes and straits are hard to click too, so water gets a dot more readily.
      small = kind === "land" ? path.area(shape.feature) < 30 : kind === "water" && path.area(shape.feature) < 150;
      centre = path.centroid(shape.feature) as [number, number];
    } else if (shape.point) {
      small = true;
      centre = projection(shape.point) as [number, number] | null;
    }
    if (playing && small && centre && Number.isFinite(centre[0])) {
      const c = dotLayer
        .append("circle")
        .attr("cx", centre[0])
        .attr("cy", centre[1])
        .attr("r", DOT_PX)
        .attr("class", "dot")
        .attr("data-label", shape.label)
        .attr("data-id", shape.id)
        .node()!;
      dots.push(c);
      track(shape.id, c);
    }
  }

  // Name tag over the place being asked about. It sits outside the zoomed group so the
  // text stays the same size, and is moved to follow the place when the map zooms.
  const tag = svg.append("g").attr("class", "map-tag").attr("visibility", "hidden");
  const tagBg = tag.append("rect").attr("rx", 6).node()!;
  const tagText = tag.append("text").node()!;
  let tagAt: { x: number; y: number; r: number } | null = null;
  const placeTag = (t: ZoomTransform) => {
    if (!tagAt) return;
    const [x, y] = t.apply([tagAt.x, tagAt.y]);
    const box = tagText.getBBox();
    const w = box.width + 16;
    const hgt = 26;
    // Above the ring, or below it when there's no room at the top.
    let top = y - tagAt.r * t.k - hgt - 6;
    if (top < 4) top = y + tagAt.r * t.k + 6;
    const left = Math.min(Math.max(4, x - w / 2), W - w - 4);
    tagBg.setAttribute("x", String(left));
    tagBg.setAttribute("y", String(top));
    tagBg.setAttribute("width", String(w));
    tagBg.setAttribute("height", String(hgt));
    tagText.setAttribute("x", String(left + w / 2));
    tagText.setAttribute("y", String(top + 18));
  };

  const applyTransform = (t: ZoomTransform) => {
    root.attr("transform", t.toString());
    for (const d of dots) d.setAttribute("r", String(DOT_PX / Math.sqrt(t.k)));
    placeTag(t);
  };
  const zoomer = zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 40])
    .translateExtent([[0, 0], [W, H]])
    .on("zoom", (e) => applyTransform(e.transform));
  svg.call(zoomer).on("dblclick.zoom", null);

  // Zoom buttons
  const controls = document.createElement("div");
  controls.className = "map-controls";
  const btn = (label: string, title: string, fn: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    b.addEventListener("click", fn);
    // Keep the cursor in the answer box when using the map buttons.
    b.addEventListener("mousedown", (e) => e.preventDefault());
    controls.append(b);
  };
  btn("+", "Zoom in", () => svg.call(zoomer.scaleBy, 1.8));
  btn("−", "Zoom out", () => svg.call(zoomer.scaleBy, 1 / 1.8));
  btn("⟲", "Reset view", () => glideTo(zoomIdentity));
  btn("◎", "Zoom to the current one", () => current && centreOn(current, Math.max(zoomTransform(svg.node()!).k, 4)));
  const focusBtn = controls.lastElementChild as HTMLButtonElement;
  focusBtn.hidden = true;
  wrap.append(controls);

  // ---------- moving the camera ----------
  let current: SVGGraphicsElement | null = null;
  let glide = 0;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  /** Smoothly pan/zoom to a new view. */
  function glideTo(target: ZoomTransform) {
    cancelAnimationFrame(glide);
    const from = zoomTransform(svg.node()!);
    if (reduceMotion) return svg.call(zoomer.transform, target);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const k = from.k + (target.k - from.k) * e;
      const x = from.x + (target.x - from.x) * e;
      const y = from.y + (target.y - from.y) * e;
      svg.call(zoomer.transform, zoomIdentity.translate(x, y).scale(k));
      if (t < 1) glide = requestAnimationFrame(step);
    };
    glide = requestAnimationFrame(step);
  }

  /** Put an element in the middle of the map at zoom level k. */
  function centreOn(el: SVGGraphicsElement, k: number) {
    const b = el.getBBox();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    glideTo(zoomIdentity.translate(W / 2 - k * cx, H / 2 - k * cy).scale(k));
  }

  /** When zoomed in, follow the current item if it's off screen or near the edge. */
  function follow(el: SVGGraphicsElement) {
    const t = zoomTransform(svg.node()!);
    if (t.k < 1.05) return;
    const b = el.getBBox();
    const [sx, sy] = t.apply([b.x + b.width / 2, b.y + b.height / 2]);
    const margin = 0.15;
    const inView = sx > W * margin && sx < W * (1 - margin) && sy > H * margin && sy < H * (1 - margin);
    if (!inView) centreOn(el, t.k);
  }

  // Name tooltip, only active after a round ends
  const tip = document.createElement("div");
  tip.className = "map-tip";
  tip.hidden = true;
  wrap.append(tip);
  let explore = false;
  const showTip = (e: PointerEvent) => {
    const t = e.target as Element;
    const label = explore ? t.getAttribute?.("data-label") : null;
    if (!label) {
      tip.hidden = true;
      return;
    }
    const r = wrap.getBoundingClientRect();
    tip.textContent = label;
    tip.hidden = false;
    const x = Math.min(e.clientX - r.left + 12, r.width - tip.offsetWidth - 4);
    tip.style.left = `${Math.max(4, x)}px`;
    tip.style.top = `${Math.max(4, e.clientY - r.top - 34)}px`;
  };
  wrap.addEventListener("pointermove", showTip);
  wrap.addEventListener("pointerdown", showTip);
  wrap.addEventListener("pointerleave", () => (tip.hidden = true));

  return {
    setState(id: string, state: ItemState) {
      for (const el of els.get(id) ?? []) {
        el.classList.remove("found", "missed", "unseen");
        if (state !== "open") el.classList.add(state);
      }
    },
    flash(id: string) {
      for (const el of els.get(id) ?? []) {
        el.classList.remove("flash");
        void (el as SVGElement).getBoundingClientRect();
        el.classList.add("flash");
      }
    },
    setCurrent(id: string | null) {
      for (const el of wrap.querySelectorAll(".current")) el.classList.remove("current");
      const targets = id ? els.get(id) ?? [] : [];
      for (const el of targets) {
        el.classList.add("current");
        // Keep the highlighted dot on top of its neighbours.
        if (el.tagName === "circle") el.parentNode?.append(el);
      }
      current = (targets.find((t) => t.tagName === "circle") ?? targets[0] ?? null) as SVGGraphicsElement | null;
      focusBtn.hidden = !current;
      if (!targets.length) {
        locator.setAttribute("visibility", "hidden");
        tag.attr("visibility", "hidden");
        tagAt = null;
        return;
      }
      follow(current!);
      const box = (targets[0] as SVGGraphicsElement).getBBox();
      locator.setAttribute("cx", String(box.x + box.width / 2));
      locator.setAttribute("cy", String(box.y + box.height / 2));
      locator.setAttribute("r", String(Math.max(16, Math.max(box.width, box.height) / 2 + 8)));
      locator.setAttribute("visibility", "visible");
      if (opts.currentLabel && id) {
        tagAt = { x: box.x + box.width / 2, y: box.y + box.height / 2, r: Math.max(16, Math.max(box.width, box.height) / 2 + 8) };
        tagText.textContent = opts.currentLabel(id);
        tag.attr("visibility", "visible");
        placeTag(zoomTransform(svg.node()!));
      }
    },
    onPick(handler: (id: string) => void) {
      wrap.classList.add("pickable");
      svg.on("click.pick", (e: MouseEvent) => {
        const id = (e.target as Element).getAttribute?.("data-id");
        if (id) handler(id);
      });
    },
    setExplore(on: boolean) {
      explore = on;
      wrap.classList.toggle("exploring", on);
      if (!on) tip.hidden = true;
    },
    destroy() {
      cancelAnimationFrame(glide);
      wrap.remove();
    },
  };
}
