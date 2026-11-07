// MYTHOLOGY: the god list (parsed from myth-data.ts) and the two multiple-choice games the
// Mythology hub opens: Who's who (`mythwho`) and Symbols & sacred animals (`mythsymbols`).
// The hub screen itself is in ui/mythology.ts.
import type { Deck, Item } from "../engine/types";
import { renderChoice, type ChoiceRound, type ChoiceSpec } from "../ui/choice";
import { CULTURES, DAY_TABLE, GOD_TABLE, type Culture } from "./myth-data";

export interface God {
  id: string;
  name: string;
  aliases: string[];
  rules: string;
  symbol: string;
  animal: string;
  counterpart: string;
  wiki: string;
  culture: Culture;
}

function parseGods(culture: Culture): God[] {
  return GOD_TABLE[culture]
    .trim()
    .split("\n")
    .map((line) => {
      const [id, name, aliases, rules, symbol, animal, counterpart, wiki] = line.split("|");
      return { id, name, aliases: aliases ? aliases.split(";") : [], rules, symbol, animal, counterpart, wiki, culture };
    });
}

export const GODS: Record<Culture, God[]> = {
  greek: parseGods("greek"),
  roman: parseGods("roman"),
  egypt: parseGods("egypt"),
  norse: parseGods("norse"),
};
export const GOD_BY_ID = new Map<string, God>(Object.values(GODS).flat().map((g) => [g.id, g]));

const BACK = { href: "#myths", label: "◂ Mythology" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const an = (s: string) => (/^[aeiou]/i.test(s) ? "an" : "a");

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Every item carries its own wrong answers (`pool`); the right answer is item.name. */
const poolOf = (i: Item) => i.data!.pool as string[];
const optionsOf = (i: Item) => [i.name, ...shuffle(poolOf(i)).slice(0, 3)];

function choiceDeck(d: Pick<Deck, "id" | "title" | "blurb" | "noun" | "items">, spec: ChoiceSpec): Deck {
  return {
    ...d,
    subject: "History",
    hidden: true,
    variants: [],
    options: [],
    createBoard: () => {
      throw new Error(`${d.title} uses its own screen`);
    },
    screen: (root, deck) => renderChoice(root, deck, spec),
  };
}

const cultureRounds = (what: string): ChoiceRound[] =>
  CULTURES.map((c) => ({ id: c.id, label: c.label, filter: (i) => i.tags.includes(c.id), count: 10, note: `${c.label} ${what}.` }));

// ---------------------------------------------------------------- Who's who
const whoItems: Item[] = Object.values(GODS).flatMap((list) =>
  list.map((g) => ({
    id: g.id,
    name: g.name,
    tags: [g.culture],
    data: {
      q: `Who is this? ${cap(g.rules)}.`,
      pool: list.filter((o) => o.id !== g.id).map((o) => o.name),
    },
  })),
);

export const mythWhoDeck = choiceDeck(
  {
    id: "mythwho",
    title: "Mythology: Who's who",
    blurb: "Read what a god rules, then pick their name from four.",
    noun: "gods",
    items: whoItems,
  },
  { rounds: cultureRounds("gods"), question: (i) => i.data!.q as string, options: optionsOf, back: BACK },
);

// ---------------------------------------------------------------- Symbols and sacred animals
// A clue (symbol or animal) is only asked if exactly one god in the culture has it.
const symbolItems: Item[] = [];
for (const list of Object.values(GODS)) {
  const holders = new Map<string, number>();
  for (const g of list) for (const clue of [g.symbol, g.animal]) if (clue) holders.set(clue, (holders.get(clue) ?? 0) + 1);
  for (const g of list) {
    for (const [kind, clue] of [["symbol", g.symbol], ["animal", g.animal]] as const) {
      if (!clue || holders.get(clue) !== 1) continue;
      symbolItems.push({
        id: `${g.id}:${kind}`,
        name: g.name,
        tags: [g.culture],
        data: {
          q: `${kind === "symbol" ? "Symbol" : "Sacred animal"}: ${clue}. Which god?`,
          pool: list.filter((o) => o.id !== g.id && o.symbol !== clue && o.animal !== clue).map((o) => o.name),
          explain: `${g.name}: ${g.rules}.`,
        },
      });
    }
  }
}

// Egyptian animal heads. `not` lists gods who share the head, so they are never offered as wrong answers.
const HEADS: { id: string; animal: string; q?: string; not?: string[] }[] = [
  { id: "eg-anubis", animal: "jackal" },
  { id: "eg-thoth", animal: "ibis" },
  { id: "eg-sobek", animal: "crocodile", not: ["eg-ammit"] },
  { id: "eg-bastet", animal: "cat" },
  { id: "eg-sekhmet", animal: "lioness" },
  { id: "eg-khnum", animal: "ram" },
  { id: "eg-horus", animal: "falcon", q: "Which sky god has the head of a falcon?", not: ["eg-ra"] },
];
for (const hd of HEADS) {
  const g = GOD_BY_ID.get(hd.id)!;
  const banned = new Set([hd.id, ...(hd.not ?? [])]);
  symbolItems.push({
    id: `${hd.id}:head`,
    name: g.name,
    tags: ["heads"],
    data: {
      q: hd.q ?? `Which god has the head of ${an(hd.animal)} ${hd.animal}?`,
      pool: GODS.egypt.filter((o) => !banned.has(o.id)).map((o) => o.name),
      explain: `${g.name}: ${g.rules}.`,
    },
  });
}

// Days of the week.
const DAY_EXPLAIN: Record<string, string> = {
  "day-sun": "Sunday means the Sun's day.",
  "day-mon": "Monday means the Moon's day.",
  "day-tue": "Tiw is the old English name for Tyr, the Norse god of law and bravery.",
  "day-wed": "Woden is the old English name for Odin. Wednesday means Woden's day.",
  "day-thu": "Thursday means Thor's day.",
  "day-fri": "Most people say Frigg, Odin's wife. Some say Freya.",
  "day-sat": "Saturn was the Roman god of farming. Saturday is the one day named after a Roman god.",
};
const days = DAY_TABLE.trim().split("\n").map((l) => l.split("|"));
for (const [id, day, after] of days) {
  symbolItems.push({
    id,
    name: after,
    tags: ["days"],
    data: {
      q: `${day} is named after…?`,
      pool: days.filter((d) => d[2] !== after).map((d) => d[2]),
      explain: DAY_EXPLAIN[id],
    },
  });
}

export const mythSymbolsDeck = choiceDeck(
  {
    id: "mythsymbols",
    title: "Mythology: Symbols and sacred animals",
    blurb: "Match symbols, sacred animals, animal heads and the days of the week to their gods.",
    noun: "clues",
    items: symbolItems,
  },
  {
    rounds: [
      ...cultureRounds("symbols and sacred animals"),
      { id: "heads", label: "Egyptian animal heads", filter: (i) => i.tags.includes("heads"), note: "Which Egyptian god has which animal head?" },
      { id: "days", label: "Days of the week", filter: (i) => i.tags.includes("days"), note: "Who or what is each day named after?" },
    ],
    question: (i) => i.data!.q as string,
    options: optionsOf,
    explain: (i) => i.data!.explain as string | undefined,
    back: BACK,
  },
);
