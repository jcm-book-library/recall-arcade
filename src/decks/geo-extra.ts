// Geography: Territories and Neighbours.
import type { Deck, Item, Variant } from "../engine/types";
import { countryItems, createCountryMap, REGIONS } from "./countries";

// ---------------------------------------------------------------- Territories
// territory map name -> the country that governs it
const GOVERNED_BY: Record<string, string> = {
  "American Samoa": "US", "Guam": "US", "N. Mariana Is.": "US", "Puerto Rico": "US", "U.S. Virgin Is.": "US",
  "Anguilla": "UK", "Bermuda": "UK", "Br. Indian Ocean Ter.": "UK", "British Virgin Is.": "UK", "Cayman Is.": "UK",
  "Falkland Is.": "UK", "Guernsey": "UK", "Isle of Man": "UK", "Jersey": "UK", "Montserrat": "UK", "Pitcairn Is.": "UK",
  "S. Geo. and the Is.": "UK", "Saint Helena": "UK", "Turks and Caicos Is.": "UK",
  "Aruba": "NL", "Curaçao": "NL", "Sint Maarten": "NL",
  "Faeroe Is.": "DK", "Greenland": "DK",
  "Fr. Polynesia": "FR", "Fr. S. Antarctic Lands": "FR", "New Caledonia": "FR", "St-Barthélemy": "FR", "St-Martin": "FR",
  "St. Pierre and Miquelon": "FR", "Wallis and Futuna Is.": "FR",
  "Cook Is.": "NZ", "Niue": "NZ",
  "Heard I. and McDonald Is.": "AU", "Norfolk Island": "AU",
  "Hong Kong": "CN", "Macao": "CN",
  "Åland": "FI",
};
const SOVEREIGN: Record<string, [string, string[]]> = {
  US: ["United States", ["USA", "US", "America", "United States of America"]],
  UK: ["United Kingdom", ["UK", "Britain", "Great Britain", "England"]],
  NL: ["Netherlands", ["Holland", "The Netherlands", "Kingdom of the Netherlands"]],
  DK: ["Denmark", ["Kingdom of Denmark"]],
  FR: ["France", []],
  NZ: ["New Zealand", ["NZ"]],
  AU: ["Australia", []],
  CN: ["China", ["PRC"]],
  FI: ["Finland", []],
};
const TERRITORY_STARTER = ["Greenland", "Puerto Rico", "Hong Kong", "New Caledonia", "Guam", "Bermuda", "Falkland Is.", "Fr. Polynesia", "Faeroe Is.", "Isle of Man"];

const territoryItems: Item[] = countryItems
  .filter((c) => GOVERNED_BY[c.id])
  .map((c) => {
    const [name, aliases] = SOVEREIGN[GOVERNED_BY[c.id]];
    return {
      id: c.id,
      name,
      aliases,
      tags: [...c.tags.filter((t) => t !== "territory"), ...(TERRITORY_STARTER.includes(c.id) ? ["starter"] : [])],
      data: { territory: c.name },
    };
  });

export const territoriesDeck: Deck = {
  id: "territories",
  subject: "Geography",
  title: "Territories",
  blurb: "Greenland, Guam, New Caledonia… A territory lights up. Which country governs it?",
  noun: "territories",
  mode: "prompt",
  placeholder: "Which country?",
  items: territoryItems,
  variants: [
    { id: "starter", label: "The Well-Known Ones", minutes: 2, starter: true, filter: (i) => i.tags.includes("starter") },
    { id: "world", label: `All ${territoryItems.length}`, minutes: 5, filter: () => true },
  ],
  options: [],
  progressGroups: REGIONS,
  tip: "Cook Islands and Niue are self-governing in free association with New Zealand. Guernsey, Jersey and the Isle of Man are Crown Dependencies.",
  describe: (i) => `${i.data!.territory}: ${i.name}`,
  renderPrompt: (i) => {
    const p = document.createElement("p");
    p.className = "prompt-text";
    p.append("Who governs ");
    const s = document.createElement("strong");
    s.textContent = i.data!.territory as string;
    p.append(s, "?");
    return p;
  },
  createBoard: ({ container, items: playing }) => {
    const byName = new Map(territoryItems.map((i) => [i.data!.territory as string, i.name]));
    return createCountryMap(container, playing, "world", (c) => (byName.has(c) ? `${c}: ${byName.get(c)}` : c));
  },
};

// ---------------------------------------------------------------- Neighbours
// hub -> countries sharing a land border (map names). Overseas land counts where the map
// draws it as part of the country (French Guiana makes France a neighbour of Brazil).
const HUBS: [string, string[], boolean?][] = [
  ["Germany", ["Denmark", "Poland", "Czechia", "Austria", "Switzerland", "France", "Luxembourg", "Belgium", "Netherlands"], true],
  ["Austria", ["Germany", "Czechia", "Slovakia", "Hungary", "Slovenia", "Italy", "Switzerland", "Liechtenstein"]],
  ["Serbia", ["Hungary", "Romania", "Bulgaria", "Macedonia", "Kosovo", "Montenegro", "Bosnia and Herz.", "Croatia"]],
  ["Turkey", ["Greece", "Bulgaria", "Georgia", "Armenia", "Azerbaijan", "Iran", "Iraq", "Syria"]],
  ["Russia", ["Norway", "Finland", "Estonia", "Latvia", "Lithuania", "Poland", "Belarus", "Ukraine", "Georgia", "Azerbaijan", "Kazakhstan", "China", "Mongolia", "North Korea"]],
  ["China", ["Afghanistan", "Bhutan", "India", "Kazakhstan", "North Korea", "Kyrgyzstan", "Laos", "Mongolia", "Myanmar", "Nepal", "Pakistan", "Russia", "Tajikistan", "Vietnam"]],
  ["India", ["Pakistan", "China", "Nepal", "Bhutan", "Bangladesh", "Myanmar"]],
  ["Saudi Arabia", ["Jordan", "Iraq", "Kuwait", "Qatar", "United Arab Emirates", "Oman", "Yemen"]],
  ["Sudan", ["Egypt", "Libya", "Chad", "Central African Rep.", "S. Sudan", "Ethiopia", "Eritrea"]],
  ["Dem. Rep. Congo", ["Congo", "Central African Rep.", "S. Sudan", "Uganda", "Rwanda", "Burundi", "Tanzania", "Zambia", "Angola"]],
  ["Tanzania", ["Kenya", "Uganda", "Rwanda", "Burundi", "Dem. Rep. Congo", "Zambia", "Malawi", "Mozambique"]],
  ["Brazil", ["Uruguay", "Argentina", "Paraguay", "Bolivia", "Peru", "Colombia", "Venezuela", "Guyana", "Suriname", "France"]],
  ["United States of America", ["Canada", "Mexico"]],
];
// Countries whose outlines include faraway land; leaving them out keeps the zoom tight.
const SPRAWLING = ["France", "Russia", "China", "United States of America", "Canada"];

const nameOf = (id: string) => countryItems.find((c) => c.id === id)?.name ?? id;
for (const [hub, list] of HUBS) {
  for (const id of [hub, ...list]) if (!countryItems.some((c) => c.id === id)) throw new Error(`Unknown country: ${id}`);
}

const neighbourVariants: Variant[] = HUBS.map(([hub, list, starter]) => ({
  id: hub,
  label: `${nameOf(hub)} (${list.length})`,
  minutes: 2,
  starter,
  filter: (i: Item) => list.includes(i.id),
}));

export const neighboursDeck: Deck = {
  id: "neighbours",
  subject: "Geography",
  title: "Neighbours",
  blurb: "One country is highlighted. Name every country it shares a land border with. (Australia isn't here. No neighbours. Very restful.)",
  noun: "borders",
  mode: "any",
  items: countryItems,
  variants: neighbourVariants,
  options: [],
  outsideHint: (item) => `${item.name} doesn't share a border with this one.`,
  tip: "Land borders only. France counts as Brazil's neighbour because of French Guiana.",
  createBoard: ({ container, items: playing, variant }) => {
    const list = HUBS.find(([h]) => h === variant.id)![1];
    const fit = [variant.id, ...list.filter((n) => n === variant.id || !SPRAWLING.includes(n))];
    return createCountryMap(container, playing, "world", undefined, { hub: variant.id, fitTo: fit });
  },
};
