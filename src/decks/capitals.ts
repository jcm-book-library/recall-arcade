import type { Deck, Item } from "../engine/types";
import { countriesDeck, countryItems, createCountryMap, REGIONS } from "./countries";
import { CAPITAL_TABLE } from "./capitals-data";

const capitals = new Map(
  CAPITAL_TABLE.trim()
    .split("\n")
    .map((line) => {
      const [mapName, capital, aliases] = line.split("|");
      return [mapName, { capital, aliases: aliases ? aliases.split(";") : [] }] as const;
    }),
);

// Same ids as the countries deck, so the map lights up the right shape.
const items: Item[] = countryItems
  .filter((i) => capitals.has(i.id))
  .map((i) => {
    const c = capitals.get(i.id)!;
    return { id: i.id, name: c.capital, aliases: c.aliases, tags: i.tags, data: { country: i.name } };
  });

const countryOf = (i: Item) => i.data!.country as string;

export const capitalsDeck: Deck = {
  id: "capitals",
  title: "Capital Cities",
  blurb: "A country lights up on the map. Name its capital. Skip and come back to the tricky ones.",
  noun: "capitals",
  mode: "prompt",
  placeholder: "Capital city…",
  items,
  variants: countriesDeck.variants,
  options: [],
  progressGroups: REGIONS,
  describe: (i) => `${countryOf(i)}: ${i.name}`,
  renderPrompt: (item) => {
    const p = document.createElement("p");
    p.className = "prompt-text";
    p.innerHTML = `Capital of <strong></strong>?`;
    p.querySelector("strong")!.textContent = countryOf(item);
    return p;
  },
  createBoard: ({ container, items: playing, variant }) => {
    const byCountry = new Map(items.map((i) => [countryOf(i), i.name]));
    return createCountryMap(container, playing, variant.id, (country) =>
      byCountry.has(country) ? `${country}: ${byCountry.get(country)}` : country,
    );
  },
};
