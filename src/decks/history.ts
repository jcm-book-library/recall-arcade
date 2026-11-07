import type { Deck } from "../engine/types";
import { renderTimeline, type Era } from "../ui/timeline";
import { EVENT_ITEMS, PERIODS, type Period } from "./periods";

const BASE_ERAS: Era[] = [
  {
    id: "modern",
    label: "1900 to Today",
    starter: true,
    breaks: [1900, 2025],
    ticks: [1900, 1920, 1940, 1960, 1980, 2000, 2020],
  },
  {
    id: "early",
    label: "1500 to 1900",
    breaks: [1500, 1900],
    ticks: [1500, 1600, 1700, 1800, 1900],
  },
  {
    id: "ancient",
    label: "Ancient & Medieval",
    breaks: [-3000, 1500],
    ticks: [-3000, -2000, -1000, 1, 1000, 1500],
  },
  // Recent centuries are crowded with events, so the axis gives them more room.
  {
    id: "all",
    label: "All of History",
    breaks: [-3000, -1000, 1, 1000, 1500, 1800, 1900, 2025],
    ticks: [-3000, -1000, 1, 1000, 1500, 1800, 1900, 2025],
  },
];

/** Round year marks for an axis, about six of them, never the (non-existent) year 0. */
function niceTicks(from: number, to: number): number[] {
  const span = to - from;
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const step = steps.find((s) => span / s <= 7) ?? 1000;
  const out: number[] = [];
  for (let t = Math.ceil(from / step) * step; t <= to; t += step)
    out.push(t === 0 ? 1 : t);
  return out;
}

// "Inside a period": one extra round for every period with at least three linked events.
// The axis spans the period (and any event outside it), padded a little so the ends aren't on the edge.
const INSIDE_ERAS: Era[] = PERIODS.flatMap((p: Period): Era[] => {
  const events = EVENT_ITEMS.filter(
    (e) => (e.data!.period as Period | undefined)?.id === p.id,
  );
  if (events.length < 3) return [];
  const years = events.map((e) => e.data!.year as number);
  const lo = Math.min(p.start, ...years);
  const hi = Math.max(p.end, ...years);
  const pad = Math.max(2, Math.round((hi - lo) * 0.06));
  return [
    {
      id: `in-${p.id}`,
      label: `Inside ${p.name.replace(/^The /, "")}`,
      heading: "Inside a period",
      breaks: [lo - pad, hi + pad],
      ticks: niceTicks(lo - pad, hi + pad),
      filter: (i) => (i.data!.period as Period | undefined)?.id === p.id,
      inside: p,
    },
  ];
});

const ERAS: Era[] = [...BASE_ERAS, ...INSIDE_ERAS];

export const historyDeck: Deck = {
  id: "history",
  title: "Big Moments",
  subject: "History",
  blurb:
    "An event appears. Drag it to the year you think it happened. The closer you are, the more points, and landing inside the right period earns good marks too.",
  noun: "events",
  items: EVENT_ITEMS,
  variants: [],
  options: [],
  createBoard: () => {
    throw new Error("Big Moments uses its own screen");
  },
  screen: (root, deck) =>
    renderTimeline(root, deck, ERAS, {
      ask: "When did this happen?",
      how: "Drag the marker to the year you think each event happened.",
    }),
};
