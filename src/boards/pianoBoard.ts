import type { Board, ItemState } from "../engine/types";
import { isBlack, noteName, octaveOf } from "../music/theory";
import { playNote } from "../music/audio";

const NS = "http://www.w3.org/2000/svg";
const WHITE_W = 40;
const WHITE_H = 170;
const BLACK_W = 24;
const BLACK_H = 106;

export interface PianoOptions {
  low: number;
  high: number;
  /** Which key (MIDI number) an item belongs to. */
  keyOf: (itemId: string) => number | undefined;
  /** Light up the key being asked about (the Keyboard quiz), or keep it hidden (the stave quizzes). */
  showCurrent: boolean;
  /** Play the current item's note when it comes up. */
  playCurrent: boolean;
}

/** A clickable piano keyboard. Keys are named "k60" (middle C) and so on. */
export function createPianoBoard(container: HTMLElement, opts: PianoOptions): Board {
  const wrap = document.createElement("div");
  wrap.className = "piano";
  const whites: number[] = [];
  for (let m = opts.low; m <= opts.high; m++) if (!isBlack(m)) whites.push(m);
  const width = whites.length * WHITE_W;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${WHITE_H + 2}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Piano keyboard");
  wrap.append(svg);
  container.append(wrap);

  const keys = new Map<number, SVGGElement>();
  const make = (m: number, x: number, black: boolean) => {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", black ? "key black" : "key white");
    g.setAttribute("data-id", `k${m}`);
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", String(x));
    r.setAttribute("y", "0");
    r.setAttribute("width", String(black ? BLACK_W : WHITE_W));
    r.setAttribute("height", String(black ? BLACK_H : WHITE_H));
    r.setAttribute("rx", "4");
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", String(x + (black ? BLACK_W : WHITE_W) / 2));
    t.setAttribute("y", String(black ? BLACK_H - 10 : WHITE_H - 14));
    t.setAttribute("class", "key-label");
    g.append(r, t);
    keys.set(m, g);
    return g;
  };
  whites.forEach((m, i) => {
    const g = make(m, i * WHITE_W, false);
    svg.append(g);
    // Mark middle C so it can always be found.
    if (m === 60) {
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", String(i * WHITE_W + WHITE_W / 2));
      dot.setAttribute("cy", String(WHITE_H - 36));
      dot.setAttribute("r", "3");
      dot.setAttribute("class", "middle-c");
      g.append(dot);
    }
  });
  // Black keys sit over the gap between two white keys.
  whites.forEach((m, i) => {
    if (m + 1 <= opts.high && isBlack(m + 1)) svg.append(make(m + 1, (i + 1) * WHITE_W - BLACK_W / 2, true));
  });

  const label = (m: number, show: boolean) => {
    const t = keys.get(m)?.querySelector("text");
    if (t) t.textContent = show ? noteName(m) : "";
  };

  // Any key can be pressed to hear it, during a round or not.
  let lastPressed = { midi: -1, at: 0 };
  svg.addEventListener("pointerdown", (e) => {
    const id = (e.target as Element).closest("[data-id]")?.getAttribute("data-id");
    if (!id) return;
    lastPressed = { midi: Number(id.slice(1)), at: performance.now() };
    playNote(lastPressed.midi, 1.2);
  });

  let pick: ((id: string) => void) | null = null;
  svg.addEventListener("click", (e) => {
    const id = (e.target as Element).closest("[data-id]")?.getAttribute("data-id");
    if (id && pick) pick(id);
  });

  return {
    setState(id: string, state: ItemState) {
      const m = opts.keyOf(id);
      if (m === undefined) return;
      const g = keys.get(m);
      if (!g) return;
      g.classList.remove("found", "missed", "unseen");
      if (state !== "open") g.classList.add(state);
      label(m, state !== "open" && state !== "unseen");
    },
    flash(id: string) {
      const m = opts.keyOf(id);
      if (m === undefined) return;
      // Don't play it twice if the player has just pressed that key.
      if (!(lastPressed.midi === m && performance.now() - lastPressed.at < 500)) playNote(m, 1.2);
      const g = keys.get(m);
      if (!g) return;
      g.classList.remove("flash");
      void g.getBoundingClientRect();
      g.classList.add("flash");
    },
    setCurrent(id: string | null) {
      for (const g of keys.values()) g.classList.remove("current");
      if (!id) return;
      const m = opts.keyOf(id);
      if (m === undefined) return;
      if (opts.showCurrent) keys.get(m)?.classList.add("current");
      if (opts.playCurrent) playNote(m, 1.4);
    },
    onPick(handler) {
      wrap.classList.add("pickable");
      pick = handler;
    },
    setExplore(on: boolean) {
      for (const [m, g] of keys) {
        if (on) g.setAttribute("title", `${noteName(m)}${octaveOf(m)}${m === 60 ? " (middle C)" : ""}`);
        else g.removeAttribute("title");
      }
    },
    destroy() {
      wrap.remove();
    },
  };
}
