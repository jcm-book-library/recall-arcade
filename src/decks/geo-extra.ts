// Geography: Neighbours.
import type { Deck, Item, Variant } from "../engine/types";
import { countryItems, createCountryMap } from "./countries";

// ---------------------------------------------------------------- Neighbours
// hub -> countries sharing a land border (map names). Overseas land counts where the map
// draws it as part of the country (French Guiana makes France a neighbour of Brazil).
const HUBS: [string, string[], boolean?][] = [
  ["Austria", ["Germany", "Czechia", "Slovakia", "Hungary", "Slovenia", "Italy", "Switzerland", "Liechtenstein"]],
  ["Serbia", ["Hungary", "Romania", "Bulgaria", "Macedonia", "Kosovo", "Montenegro", "Bosnia and Herz.", "Croatia"]],
  ["Turkey", ["Greece", "Bulgaria", "Georgia", "Armenia", "Azerbaijan", "Iran", "Iraq", "Syria"]],
  ["Russia", ["Norway", "Finland", "Estonia", "Latvia", "Lithuania", "Poland", "Belarus", "Ukraine", "Georgia", "Azerbaijan", "Kazakhstan", "China", "Mongolia", "North Korea"]],
  ["China", ["Afghanistan", "Bhutan", "India", "Kazakhstan", "North Korea", "Kyrgyzstan", "Laos", "Mongolia", "Myanmar", "Nepal", "Pakistan", "Russia", "Tajikistan", "Vietnam"]],
  ["India", ["Pakistan", "China", "Nepal", "Bhutan", "Bangladesh", "Myanmar"], true],
  ["Saudi Arabia", ["Jordan", "Iraq", "Kuwait", "Qatar", "United Arab Emirates", "Oman", "Yemen"]],
  ["Sudan", ["Egypt", "Libya", "Chad", "Central African Rep.", "S. Sudan", "Ethiopia", "Eritrea"]],
  ["Dem. Rep. Congo", ["Congo", "Central African Rep.", "S. Sudan", "Uganda", "Rwanda", "Burundi", "Tanzania", "Zambia", "Angola"]],
  ["Tanzania", ["Kenya", "Uganda", "Rwanda", "Burundi", "Dem. Rep. Congo", "Zambia", "Malawi", "Mozambique"]],
  ["Brazil", ["Uruguay", "Argentina", "Paraguay", "Bolivia", "Peru", "Colombia", "Venezuela", "Guyana", "Suriname", "France"]],
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
