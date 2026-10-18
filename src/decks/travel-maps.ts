// Travel quizzes that use the world map: Time Zones and Currencies.
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

// ---------------------------------------------------------------- Time zones
// city | standard-time offset in hours | lat | lon | region
const TZ_TABLE = `
Sydney|10|-33.87|151.21|AP
Melbourne|10|-37.81|144.96|AP
Brisbane|10|-27.47|153.03|AP
Adelaide|9.5|-34.93|138.6|AP
Darwin|9.5|-12.46|130.84|AP
Perth|8|-31.95|115.86|AP
Auckland|12|-36.85|174.76|AP
Honolulu|-10|21.31|-157.86|AM
Tokyo|9|35.68|139.69|AS
Seoul|9|37.57|126.98|AS
Beijing|8|39.9|116.4|AS
Hong Kong|8|22.32|114.17|AS
Singapore|8|1.35|103.82|AS
Bangkok|7|13.76|100.5|AS
Jakarta|7|-6.2|106.85|AS
Delhi|5.5|28.61|77.21|AS
Kathmandu|5.75|27.72|85.32|AS
Dubai|4|25.2|55.27|EU
Tehran|3.5|35.69|51.39|EU
Moscow|3|55.76|37.62|EU
Istanbul|3|41.01|28.98|EU
Cairo|2|30.04|31.24|EU
Johannesburg|2|-26.2|28.05|EU
Paris|1|48.86|2.35|EU
Berlin|1|52.52|13.4|EU
London|0|51.51|-0.13|EU
Reykjavík|0|64.15|-21.94|EU
New York|-5|40.71|-74.01|AM
Chicago|-6|41.88|-87.63|AM
Mexico City|-6|19.43|-99.13|AM
Denver|-7|39.74|-104.99|AM
Los Angeles|-8|34.05|-118.24|AM
Anchorage|-9|61.22|-149.9|AM
São Paulo|-3|-23.55|-46.63|AM
Buenos Aires|-3|-34.6|-58.38|AM
Lima|-5|-12.05|-77.04|AM
`;

const TZ_REGIONS = [
  { tag: "AP", label: "Australia & Pacific" },
  { tag: "AS", label: "Asia" },
  { tag: "EU", label: "Europe, Middle East & Africa" },
  { tag: "AM", label: "Americas" },
];

/** "+5:30" -> "UTC+5:30", "-10" -> "UTC-10", "0" -> "UTC". */
function offsetText(hours: number) {
  if (hours === 0) return "UTC±0";
  const sign = hours > 0 ? "+" : "−";
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/**
 * Reads what the player typed as an offset in minutes: "+10", "UTC+10", "+5:30",
 * "+0530", "5.5", "-3", "GMT 0". A missing sign counts as "+" (except for zero).
 */
export function offsetKey(text: string): string {
  const t = text.toLowerCase().replace(/utc|gmt|±/g, "").replace(/\s+/g, "").replace(/[−–]/g, "-");
  const m = t.match(/^([+-])?(\d{1,2})(?:(?:[:.,])?(\d{1,2}))?$/);
  if (!m) return `?${t}`;
  const sign = m[1] === "-" ? -1 : 1;
  const hours = Number(m[2]);
  let minutes = 0;
  if (m[3] !== undefined) {
    // "5.5" means five and a half hours; "5:30" and "0530" mean thirty minutes.
    const isDecimal = /[.,]/.test(t);
    minutes = isDecimal ? Math.round(Number(`0.${m[3]}`) * 60) : m[3].length === 1 ? Number(m[3]) * 10 : Number(m[3]);
  }
  const total = sign * (hours * 60 + minutes);
  return `o${total}`;
}

const tzItems: Item[] = TZ_TABLE.trim()
  .split("\n")
  .map((line, i) => {
    const [city, hours, lat, lon, region] = line.split("|");
    const h = Number(hours);
    return {
      id: `tz${i}`,
      name: offsetText(h),
      aliases: [],
      tags: [region, ...(i < 8 || ["Tokyo", "Singapore", "London", "Los Angeles", "Dubai", "New York"].includes(city) ? ["starter"] : [])],
      data: { city, point: [Number(lon), Number(lat)] },
    };
  });

export const timezonesDeck: Deck = {
  id: "timezones",
  subject: "Travel & Transport",
  title: "Time Zones",
  blurb: "A city lights up. What's its offset from UTC in standard time? Type +10, −5, +5:30…",
  noun: "cities",
  mode: "prompt",
  placeholder: "Offset, e.g. +10 or −5",
  answerKey: offsetKey,
  tip: "Standard time, ignoring daylight saving. Type the sign: + for east of London, − for west.",
  items: tzItems,
  variants: [
    { id: "starter", label: "Home and Away", minutes: 3, starter: true, filter: (i) => i.tags.includes("starter") },
    ...TZ_REGIONS.map((r) => ({ id: r.tag, label: r.label, minutes: 3, filter: (i: Item) => i.tags.includes(r.tag) })),
    { id: "all", label: "All 36 Cities", minutes: 6, filter: () => true },
  ],
  options: [],
  progressGroups: TZ_REGIONS,
  describe: (i) => `${i.data!.city}: ${i.name}`,
  renderPrompt: (i) => promptText("What's the UTC offset in", `${i.data!.city}?`),
  createBoard: async ({ container, items: playing }) => {
    const land = await backgroundLand();
    return createMapBoard(
      container,
      [...land, ...playing.map((i) => ({ id: i.id, label: `${i.data!.city}: ${i.name}`, point: i.data!.point as [number, number] }))],
      new Set(playing.map((i) => i.id)),
      { rotate: -10 },
    );
  },
};

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
