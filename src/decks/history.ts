import type { Deck, Item } from "../engine/types";
import { renderTimeline, type Era } from "../ui/timeline";
import { EVENT_TABLE } from "./history-data";

const ERAS: Era[] = [
  { id: "modern", label: "1900 to Today", starter: true, breaks: [1900, 2025], ticks: [1900, 1920, 1940, 1960, 1980, 2000, 2020] },
  { id: "early", label: "1500 to 1900", breaks: [1500, 1900], ticks: [1500, 1600, 1700, 1800, 1900] },
  { id: "ancient", label: "Ancient & Medieval", breaks: [-3000, 1500], ticks: [-3000, -2000, -1000, 1, 1000, 1500] },
  // Recent centuries are crowded with events, so the axis gives them more room.
  { id: "all", label: "All of History", breaks: [-3000, -1000, 1, 1000, 1500, 1800, 1900, 2025], ticks: [-3000, -1000, 1, 1000, 1500, 1800, 1900, 2025] },
];

const eraOf = (year: number) => (year >= 1900 ? "modern" : year >= 1500 ? "early" : "ancient");

const items: Item[] = EVENT_TABLE.trim()
  .split("\n")
  .map((line, i) => {
    const [year, name, approx] = line.split("|");
    const y = Number(year);
    return { id: `e${i}`, name, tags: [eraOf(y)], data: { year: y, approx: approx === "c" } };
  });

export const historyDeck: Deck = {
  id: "history",
  title: "Big Moments",
  subject: "History",
  blurb: "An event appears. Drag it to the year you think it happened. The closer you are, the more points.",
  noun: "events",
  items,
  variants: [],
  options: [],
  createBoard: () => {
    throw new Error("Big Moments uses its own screen");
  },
  screen: (root, deck) => renderTimeline(root, deck, ERAS),
};
