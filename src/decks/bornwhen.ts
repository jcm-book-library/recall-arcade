import type { Deck, Item } from "../engine/types";
import { renderBornWhen, type BornRound } from "../ui/bornwhen";
import { BORN_PEOPLE } from "./bornwhen-data";

const items: Item[] = BORN_PEOPLE.map((p) => ({
  id: p.id,
  name: p.name,
  tags: p.tags,
  data: { born: p.born, known: p.known, title: p.title, note: p.note },
}));

const has = (tag: string) => (i: Item) => i.tags.includes(tag);

const ROUNDS: BornRound[] = [
  { id: "aus", label: "Australians", starter: true, filter: has("aus") },
  { id: "techsci", label: "Tech & science", filter: has("techsci") },
  { id: "musicfilm", label: "Music & film", filter: has("musicfilm") },
  { id: "sport", label: "Sport", filter: has("sport") },
  { id: "leaders", label: "Leaders & royals", filter: has("leaders") },
  { id: "all", label: "Everyone", filter: () => true },
];

export const bornWhenDeck: Deck = {
  id: "bornwhen",
  title: "Born When?",
  subject: "History",
  hidden: true,
  blurb: "A living person appears. Guess the year they were born.",
  noun: "people",
  items,
  variants: [],
  options: [],
  createBoard: () => {
    throw new Error("Born When uses its own screen");
  },
  screen: (root, deck) => renderBornWhen(root, deck, ROUNDS),
};
