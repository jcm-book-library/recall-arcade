import type { Deck, Item } from "../engine/types";
import { renderTimeline, type Era } from "../ui/timeline";
import { PEOPLE_TABLE } from "./people-data";

const ERAS: Era[] = [
  { id: "famous", label: "Famous Faces", starter: true, breaks: [-500, 1, 1000, 1500, 1800, 2025], ticks: [-500, 1, 1000, 1500, 1800, 2025] },
  { id: "ancient", label: "Ancient World", breaks: [-2000, 500], ticks: [-2000, -1500, -1000, -500, 1, 500] },
  { id: "medieval", label: "Medieval & Renaissance", breaks: [500, 1650], ticks: [500, 700, 900, 1100, 1300, 1500, 1650] },
  { id: "early", label: "1600 to 1900", breaks: [1600, 1925], ticks: [1600, 1650, 1700, 1750, 1800, 1850, 1900] },
  { id: "modern", label: "Since 1850", breaks: [1850, 2025], ticks: [1850, 1875, 1900, 1925, 1950, 1975, 2000, 2025] },
  { id: "all", label: "All of History", breaks: [-2000, -500, 1, 500, 1000, 1500, 1700, 1800, 1900, 2025], ticks: [-2000, -500, 1, 500, 1000, 1500, 1700, 1800, 1900, 2025] },
];

const eraOf = (mid: number) => (mid < 500 ? "ancient" : mid < 1600 ? "medieval" : mid < 1890 ? "early" : "modern");

const items: Item[] = PEOPLE_TABLE.trim()
  .split("\n")
  .map((line, i) => {
    const [born, died, name, note, approx, famous] = line.split("|");
    const from = Number(born);
    const to = Number(died);
    return {
      id: `p${i}`,
      name,
      tags: [eraOf((from + to) / 2), ...(famous === "f" ? ["famous"] : [])],
      data: { from, to, note, approx: approx === "c" },
    };
  });

export const peopleDeck: Deck = {
  id: "people",
  title: "Who Lived When?",
  subject: "History",
  blurb: "A famous person appears. Place them in time: anywhere in their lifetime scores full marks.",
  noun: "people",
  items,
  variants: [],
  options: [],
  createBoard: () => {
    throw new Error("Who Lived When uses its own screen");
  },
  screen: (root, deck) =>
    renderTimeline(root, deck, ERAS, {
      ask: "When did they live?",
      how: "Drag the marker to any year in their lifetime. Close still scores.",
    }),
};
