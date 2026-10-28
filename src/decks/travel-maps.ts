// Travel quizzes that use the world map: Currencies.
import type { Deck, Item } from "../engine/types";
import { createMapBoard } from "../boards/mapBoard";
import { backgroundLand, countryItems, createCountryMap, REGIONS } from "./countries";

function promptText(text: string, strong: string) {
  const p = document.createElement("p");
  p.className = "prompt-text";
  p.append(text, " ");
  const s = document.createElement("strong");
  s.textContent = strong;
  p.append(s);
  return p;
}

// ---------------------------------------------------------------- Currencies
// country map name | currency | other accepted answers (codes count too) | starter?
const CURRENCY_TABLE = `
Australia|Australian dollar|AUD;Dollar|s
New Zealand|New Zealand dollar|NZD;Dollar|s
United States of America|US dollar|USD;Dollar;United States dollar;American dollar|s
Canada|Canadian dollar|CAD;Dollar|s
United Kingdom|Pound sterling|GBP;Pound;British pound;Sterling|s
Japan|Yen|JPY;Japanese yen|s
China|Renminbi|CNY;Yuan;Chinese yuan;RMB|s
India|Indian rupee|INR;Rupee|s
Singapore|Singapore dollar|SGD;Dollar|s
Thailand|Baht|THB;Thai baht|s
Indonesia|Rupiah|IDR;Indonesian rupiah|s
Fiji|Fijian dollar|FJD;Dollar|s
France|Euro|EUR|s
Germany|Euro|EUR|s
Italy|Euro|EUR|
Spain|Euro|EUR|
Ireland|Euro|EUR|
Netherlands|Euro|EUR|
Greece|Euro|EUR|
Switzerland|Swiss franc|CHF;Franc|s
Mexico|Mexican peso|MXN;Peso|s
United Arab Emirates|Dirham|AED;UAE dirham|s
South Africa|Rand|ZAR;South African rand|s
South Korea|Won|KRW;South Korean won|
Vietnam|Dong|VND;Vietnamese dong|
Malaysia|Ringgit|MYR;Malaysian ringgit|
Philippines|Philippine peso|PHP;Peso|
Hong Kong|Hong Kong dollar|HKD;Dollar|
Taiwan|New Taiwan dollar|TWD;Dollar;Taiwan dollar|
Sri Lanka|Sri Lankan rupee|LKR;Rupee|
Nepal|Nepalese rupee|NPR;Rupee|
Pakistan|Pakistani rupee|PKR;Rupee|
Russia|Rouble|RUB;Ruble;Russian rouble|
Turkey|Lira|TRY;Turkish lira|
Israel|Shekel|ILS;New shekel;Israeli shekel|
Saudi Arabia|Riyal|SAR;Saudi riyal|
Qatar|Riyal|QAR;Qatari riyal|
Egypt|Egyptian pound|EGP;Pound|
Morocco|Dirham|MAD;Moroccan dirham|
Kenya|Kenyan shilling|KES;Shilling|
Nigeria|Naira|NGN|
Norway|Krone|NOK;Norwegian krone;Kroner|
Sweden|Krona|SEK;Swedish krona;Kronor|
Denmark|Krone|DKK;Danish krone;Kroner|
Iceland|Króna|ISK;Icelandic krona;Krona|
Poland|Złoty|PLN;Zloty|
Czechia|Koruna|CZK;Czech koruna;Crown|
Hungary|Forint|HUF|
Brazil|Real|BRL;Brazilian real;Reais|
Argentina|Argentine peso|ARS;Peso|
Chile|Chilean peso|CLP;Peso|
Peru|Sol|PEN;Peruvian sol;Nuevo sol|
Colombia|Colombian peso|COP;Peso|
Papua New Guinea|Kina|PGK|
Samoa|Tala|WST|
Tonga|Paʻanga|TOP;Paanga;Pa'anga|
Cambodia|Riel|KHR|
Laos|Kip|LAK|
Mongolia|Tögrög|MNT;Tugrik;Togrog|
Bangladesh|Taka|BDT|
`;

const known = new Set(countryItems.map((i) => i.id));
const currencyItems: Item[] = CURRENCY_TABLE.trim()
  .split("\n")
  .map((line) => {
    const [id, name, aliases, starter] = line.split("|");
    if (!known.has(id)) throw new Error(`Unknown country in currency table: ${id}`);
    const country = countryItems.find((c) => c.id === id)!;
    return { id, name, aliases: aliases ? aliases.split(";") : [], tags: [...country.tags, ...(starter ? ["starter"] : [])], data: { country: country.name } };
  });

export const currenciesDeck: Deck = {
  id: "currencies",
  subject: "Travel & Transport",
  title: "Currencies",
  blurb: "A country lights up. What money do they use? The three-letter code counts too (AUD, JPY…).",
  noun: "currencies",
  mode: "prompt",
  placeholder: "Currency or code…",
  items: currencyItems,
  variants: [
    { id: "starter", label: "Travel Favourites", minutes: 3, starter: true, filter: (i) => i.tags.includes("starter") },
    ...REGIONS.map((r) => ({ id: r.tag, label: r.label, minutes: 3, filter: (i: Item) => i.tags.includes(r.tag) })),
    { id: "world", label: "All 60", minutes: 8, filter: () => true },
  ],
  options: [],
  progressGroups: REGIONS,
  describe: (i) => `${i.data!.country}: ${i.name}`,
  renderPrompt: (i) => promptText("What's the currency of", `${i.data!.country}?`),
  createBoard: ({ container, items: playing, variant }) => {
    const byId = new Map(currencyItems.map((i) => [i.data!.country as string, i.name]));
    return createCountryMap(container, playing, variant.id === "starter" ? "world" : variant.id, (country) =>
      byId.has(country) ? `${country}: ${byId.get(country)}` : country,
    );
  },
};
