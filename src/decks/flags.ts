import type { Deck, Item } from "../engine/types";
import { createFlagBoard } from "../boards/flagBoard";
import { countriesDeck, countryItems, REGIONS } from "./countries";
import { FLAG_CODES } from "./flag-codes";

// Flag artwork from the flag-icons package (MIT licence). Vite turns each file
// into its own URL, so a flag only downloads when it's shown.
const FILES = import.meta.glob("../../node_modules/flag-icons/flags/4x3/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;
const urlFor = (code: string) => FILES[`../../node_modules/flag-icons/flags/4x3/${code}.svg`];

// These territories fly the French, British or Australian flag, so asking about them is unfair.
const SHARED_FLAG = new Set(["St-Martin", "St-Barthélemy", "Wallis and Futuna Is.", "St. Pierre and Miquelon", "Heard I. and McDonald Is.", "Saint Helena"]);

const items: Item[] = countryItems
  .filter((i) => FLAG_CODES[i.id] && !SHARED_FLAG.has(i.id))
  .map((i) => ({ ...i, data: { flag: urlFor(FLAG_CODES[i.id]) } }));

const flagOf = (i: Item) => i.data!.flag as string;

export const flagsDeck: Deck = {
  id: "flags",
  subject: "Geography",
  title: "Flags of the World",
  blurb: "A flag appears. Name the country. Skip the ones you don't know and come back to them.",
  noun: "flags",
  mode: "prompt",
  placeholder: "Which country is this?",
  items,
  variants: countriesDeck.variants.map((v) => ({ ...v, minutes: v.id === "world" ? 15 : v.minutes })),
  options: [{ ...countriesDeck.options[0], hint: "Adds flags of territories such as Greenland, Puerto Rico and Hong Kong" }],
  applyOptions: countriesDeck.applyOptions,
  progressGroups: REGIONS,
  renderPrompt: (item) => {
    const img = document.createElement("img");
    img.className = "prompt-flag";
    img.src = flagOf(item);
    img.alt = "Flag to identify";
    return img;
  },
  createBoard: ({ container, items: playing, variant }) =>
    // A one-region round shows one section, even for countries listed in two regions.
    createFlagBoard(container, playing, flagOf, REGIONS.filter((r) => variant.id === "world" || r.tag === variant.id)),
};
