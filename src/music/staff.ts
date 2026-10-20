// Draws a music stave (five lines) with a clef, an optional key signature and notes.
import { diatonicIndex } from "./theory";

const NS = "http://www.w3.org/2000/svg";
const el = (tag: string, attrs: Record<string, string | number>, parent: Element, text?: string) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text) n.textContent = text;
  parent.append(n);
  return n;
};

const GAP = 12; // distance between stave lines
const TOP = 40; // y of the top line
const BOTTOM = TOP + 4 * GAP;

// The note on the bottom line: E4 in treble clef, G2 in bass clef.
const BOTTOM_LINE = { treble: diatonicIndex(64), bass: diatonicIndex(43) };

/** y for a note: each step up the stave (line to space) is half a gap. */
const yOf = (clef: "treble" | "bass", midi: number) => BOTTOM - (diatonicIndex(midi) - BOTTOM_LINE[clef]) * (GAP / 2);

// Where sharps and flats sit in a key signature (treble positions, as MIDI notes on those lines).
const SHARP_POS = { treble: [77, 72, 79, 74, 69, 76, 71], bass: [53, 48, 55, 50, 45, 52, 47] };
const FLAT_POS = { treble: [71, 76, 69, 74, 67, 72, 65], bass: [47, 52, 45, 50, 43, 48, 41] };

export interface StaffOptions {
  clef: "treble" | "bass";
  notes?: { midi: number; accidental?: "♯" | "♭" }[];
  sharps?: number;
  flats?: number;
  /** A music symbol to show in the middle instead of notes (a rest, a note length). */
  glyph?: string;
  width?: number;
}

export function renderStaff(opts: StaffOptions): SVGSVGElement {
  const width = opts.width ?? 260;
  const svg = document.createElementNS(NS, "svg") as SVGSVGElement;
  svg.setAttribute("viewBox", `0 0 ${width} 136`);
  svg.setAttribute("class", "staff");
  svg.setAttribute("role", "img");
  for (let i = 0; i < 5; i++) el("line", { x1: 6, x2: width - 6, y1: TOP + i * GAP, y2: TOP + i * GAP, class: "staff-line" }, svg);
  // Clefs drawn with the Noto Music font. The treble clef curls round the G line; the bass clef's dots sit either side of the F line.
  if (opts.clef === "treble") el("text", { x: 10, y: TOP + 3.6 * GAP, class: "clef treble" }, svg, "𝄞");
  else el("text", { x: 10, y: TOP + 2.95 * GAP, class: "clef bass" }, svg, "𝄢");

  let x = 58;
  const pos = (opts.sharps ? SHARP_POS : FLAT_POS)[opts.clef];
  const count = opts.sharps ?? opts.flats ?? 0;
  for (let i = 0; i < count; i++) {
    el("text", { x, y: yOf(opts.clef, pos[i]) + (opts.sharps ? 5 : 2), class: "accidental" }, svg, opts.sharps ? "♯" : "♭");
    x += 11;
  }

  if (opts.glyph) {
    el("text", { x: width / 2, y: TOP + 2.6 * GAP, class: "glyph" }, svg, opts.glyph);
    return svg;
  }

  const notes = opts.notes ?? [];
  const startX = Math.max(x + 30, width / 2 - ((notes.length - 1) * 34) / 2);
  notes.forEach((n, i) => {
    const nx = startX + i * 34;
    const y = yOf(opts.clef, n.midi);
    // Ledger lines for notes above or below the stave.
    for (let ly = BOTTOM + GAP; ly <= y + 0.1; ly += GAP) el("line", { x1: nx - 13, x2: nx + 13, y1: ly, y2: ly, class: "staff-line" }, svg);
    for (let ly = TOP - GAP; ly >= y - 0.1; ly -= GAP) el("line", { x1: nx - 13, x2: nx + 13, y1: ly, y2: ly, class: "staff-line" }, svg);
    if (n.accidental) el("text", { x: nx - 22, y: y + 5, class: "accidental" }, svg, n.accidental);
    el("ellipse", { cx: nx, cy: y, rx: 7.5, ry: 5.5, transform: `rotate(-20 ${nx} ${y})`, class: "notehead" }, svg);
    // Stems go up for notes below the middle line, down for the rest.
    const up = y > TOP + 2 * GAP;
    el("line", { x1: up ? nx + 7 : nx - 7, x2: up ? nx + 7 : nx - 7, y1: y, y2: up ? y - 36 : y + 36, class: "stem" }, svg);
  });
  return svg;
}
