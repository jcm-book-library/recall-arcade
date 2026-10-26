// Pairs games: things that belong together, played as memory cards or as a matching game.
import type { Deck, Item } from "../engine/types";
import { renderPairs, type PairsSpec } from "../ui/pairs";
import { mythDeck, scientistsDeck } from "./text-decks";
import { PEOPLE_TABLE } from "./people-data";

function pairsDeck(d: Omit<Deck, "variants" | "options" | "createBoard" | "screen">, spec: PairsSpec): Deck {
  return {
    ...d,
    variants: [],
    options: [],
    createBoard: () => {
      throw new Error(`${d.title} uses its own screen`);
    },
    screen: renderPairs(spec),
  };
}

// ---------------------------------------------------------------- Greek & Roman Pairs (memory)
// Built from Mythology's "Zeus is Greek. What's his Roman name?" lines, so the two stay in step.
const mythItems: Item[] = [];
for (const m of mythDeck.items.filter((i) => i.tags.includes("pairs"))) {
  const greek = /^(.+?) is Greek/.exec(m.data!.clue as string)?.[1];
  if (!greek) {
    console.error(`Greek & Roman Pairs: can't find the Greek name in "${m.data!.clue}"`);
    continue;
  }
  mythItems.push({
    id: m.name.toLowerCase(),
    name: m.name,
    tags: m.tags.includes("pairstarter") ? ["starter"] : [],
    data: { greek, roman: m.name },
  });
}
const greekOf = (i: Item) => i.data!.greek as string;

// Picture keys are the lower-case god names, as in picture-titles.json.
export const mythPairsDeck = pairsDeck(
  {
    id: "mythpairs",
    title: "Greek & Roman Pairs",
    subject: "History",
    hidden: true,
    blurb: "Flip cards to match each Greek god with the Roman god who took over their story.",
    noun: "gods",
    items: mythItems,
  },
  {
    style: "memory",
    pictureSet: "myths",
    how: "Flip two cards at a time to match each Greek god with their Roman partner.",
    left: (i) => ({ text: greekOf(i), tag: "Greek", picture: greekOf(i).toLowerCase() }),
    right: (i) => ({ text: i.name, tag: "Roman", picture: i.name.toLowerCase() }),
    rounds: [
      { id: "big", label: "The Big Seven", starter: true, filter: (i) => i.tags.includes("starter") },
      {
        id: "all",
        label: `All ${mythItems.length}`,
        filter: () => true,
        pairs: mythItems.length,
        note: "Apollo kept his name in Rome, so he is on both a Greek and a Roman card.",
      },
    ],
  },
);

// ---------------------------------------------------------------- Famous For (matching)
// The pool: scientists (name and discovery) plus people from Who Lived When? (name and who they were).
const famousItems: Item[] = [];
const byName = new Map<string, Item>();
function addPerson(name: string, clue: string, tags: string[]) {
  const key = name.toLowerCase();
  const seen = byName.get(key);
  if (seen) {
    // Same person twice: keep the first clue, and join their tags.
    for (const t of tags) if (!seen.tags.includes(t)) seen.tags.push(t);
    return;
  }
  const item: Item = { id: key.replace(/[^a-z0-9]+/g, "-"), name, tags: [...tags], data: { clue } };
  byName.set(key, item);
  famousItems.push(item);
}
for (const s of scientistsDeck.items) {
  addPerson(s.name, s.data!.clue as string, ["scientist", ...(s.tags.includes("starter") ? ["famous"] : [])]);
}
for (const line of PEOPLE_TABLE.trim().split("\n")) {
  const [, , name, who, , famous] = line.split("|");
  addPerson(name, who, ["person", ...(famous === "f" ? ["famous"] : [])]);
}
const famousFor = (i: Item) => i.data!.clue as string;

export const famousForDeck = pairsDeck(
  {
    id: "famousfor",
    title: "Famous For",
    subject: "History",
    blurb: "Match famous people to what they're famous for: scientists, rulers, artists and thinkers.",
    noun: "people",
    items: famousItems,
  },
  {
    style: "match",
    how: "Click a person, then what they're famous for.",
    heads: ["Who", "Famous for"],
    left: (i) => ({ text: i.name }),
    right: (i) => ({ text: famousFor(i) }),
    pairs: 6,
    boards: 4,
    rounds: [
      { id: "faces", label: "Famous Faces", starter: true, filter: (i) => i.tags.includes("famous") },
      { id: "scientists", label: "Scientists", filter: (i) => i.tags.includes("scientist") },
      { id: "people", label: "History's People", filter: (i) => i.tags.includes("person") },
      { id: "everyone", label: "Everyone", filter: () => true },
    ],
  },
);
