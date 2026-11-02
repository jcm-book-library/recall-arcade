// Geography: City Shapes. A city's water and coastline (or its street plan) is shown on its
// own, with no labels. Name the city.
//
// The drawings are built by scripts/build-cities.py from OpenStreetMap data
// (© OpenStreetMap contributors, ODbL, via the Overture Maps release). They're about 1 MB,
// so they load only when this game is opened, not with the home page.
import type { Deck, Item, ProgressGroup } from "../engine/types";
import { createFlagBoard } from "../boards/flagBoard";

interface Shapes {
  /** city id -> filled SVG path of the water, in a 400 × 400 box */
  water: Record<string, string>;
  /** city id -> { stroke width: SVG path of the roads that width } */
  streets: Record<string, Record<string, string>>;
}

// [id, name, region tag, other accepted answers]
const CITIES: [string, string, string, string[]?][] = [
  ["melbourne", "Melbourne", "anz", ["Port Phillip"]],
  ["sydney", "Sydney", "anz"],
  ["hobart", "Hobart", "anz"],
  ["perth", "Perth", "anz", ["Fremantle"]],
  ["brisbane", "Brisbane", "anz"],
  ["auckland", "Auckland", "anz"],
  ["wellington", "Wellington", "anz"],
  ["london", "London", "europe"],
  ["paris", "Paris", "europe"],
  ["prague", "Prague", "europe", ["Praha"]],
  ["budapest", "Budapest", "europe"],
  ["venice", "Venice", "europe", ["Venezia"]],
  ["amsterdam", "Amsterdam", "europe"],
  ["stockholm", "Stockholm", "europe"],
  ["copenhagen", "Copenhagen", "europe", ["København", "Kobenhavn"]],
  ["istanbul", "Istanbul", "europe", ["Constantinople"]],
  ["stpetersburg", "St Petersburg", "europe", ["Saint Petersburg", "Leningrad", "Petersburg"]],
  ["lisbon", "Lisbon", "europe", ["Lisboa"]],
  ["oslo", "Oslo", "europe"],
  ["helsinki", "Helsinki", "europe"],
  ["newyork", "New York", "world", ["New York City", "NYC", "Manhattan"]],
  ["sanfrancisco", "San Francisco", "world", ["SF", "San Fran"]],
  ["seattle", "Seattle", "world"],
  ["vancouver", "Vancouver", "world"],
  ["chicago", "Chicago", "world"],
  ["montreal", "Montreal", "world", ["Montréal"]],
  ["rio", "Rio de Janeiro", "world", ["Rio"]],
  ["capetown", "Cape Town", "world"],
  ["cairo", "Cairo", "world"],
  ["dubai", "Dubai", "world"],
  ["hongkong", "Hong Kong", "world"],
  ["singapore", "Singapore", "world"],
];

// Street plans: [city id, name, other accepted answers]. Item ids are "streets-<city id>".
const STREETS: [string, string, string[]?][] = [
  ["barcelona", "Barcelona", ["Eixample"]],
  ["paris", "Paris"],
  ["canberra", "Canberra"],
  ["newyork", "New York", ["New York City", "NYC", "Manhattan"]],
  ["washington", "Washington, D.C.", ["Washington", "Washington DC", "DC"]],
  ["adelaide", "Adelaide"],
  ["melbourne", "Melbourne"],
  ["amsterdam", "Amsterdam"],
  ["moscow", "Moscow", ["Moskva"]],
  ["kyoto", "Kyoto"],
];

// The ten from the first idea: the most famous water shapes, for the starter round.
const FAMOUS = new Set(["melbourne", "sydney", "london", "prague", "venice", "istanbul", "hongkong", "sanfrancisco", "rio", "stockholm"]);

const items: Item[] = [
  ...CITIES.map(([id, name, region, aliases]) => ({
    id, name, aliases, tags: ["water", region, ...(FAMOUS.has(id) ? ["famous"] : [])], data: { view: "water", city: id },
  })),
  ...STREETS.map(([city, name, aliases]) => ({
    id: `streets-${city}`, name, aliases, tags: ["streets"], data: { view: "streets", city },
  })),
];

const GROUPS: ProgressGroup[] = [
  { tag: "anz", label: "Australia & New Zealand" },
  { tag: "europe", label: "Europe" },
  { tag: "world", label: "Americas, Africa & Asia" },
  { tag: "streets", label: "Street plans" },
];

// Fixed colours, because the drawings are images (CSS variables don't reach inside them).
const LAND = "#f3f1ea";
const WATER = "#1d3a52";
const ROAD = "#15212a";

let shapes: Shapes | null = null;
let loading: Promise<Shapes> | null = null;
function loadShapes(): Promise<Shapes> {
  loading ??= import("../data/city-shapes.json").then((m) => (shapes = m.default as Shapes));
  return loading;
}

function svgFor(item: Item, s: Shapes): string {
  const city = item.data!.city as string;
  const inner = item.data!.view === "streets"
    ? Object.entries(s.streets[city] ?? {})
        .map(([w, d]) => `<path d="${d}" fill="none" stroke="${ROAD}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`)
        .join("")
    : `<path d="${s.water[city] ?? ""}" fill="${WATER}" fill-rule="evenodd"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${LAND}"/>${inner}</svg>`;
}

const urls = new Map<string, string>();
function urlFor(item: Item): string {
  if (!shapes) return "";
  let u = urls.get(item.id);
  if (!u) {
    u = URL.createObjectURL(new Blob([svgFor(item, shapes)], { type: "image/svg+xml" }));
    urls.set(item.id, u);
  }
  return u;
}

function learnCard(): Node {
  const box = document.createElement("div");
  box.innerHTML = `
    <p><strong>How to read these.</strong> Dark is water, light is land. North is up. Each square is a few kilometres to a few dozen across, so a river can look thin and a bay can fill the frame.</p>
    <p>Look for one big clue: a bay almost closed off (Melbourne), a harbour with fingers (Sydney), a river snaking through (London, Brisbane), a strait splitting two continents (Istanbul), a city built on islands (Venice, Stockholm).</p>
    <p>Street plans: a perfect grid with cut-off corners (Barcelona), roads radiating from roundabouts (Paris, Canberra), long avenues across a grid (Manhattan, Washington), rings around a centre (Moscow, Amsterdam's canals).</p>`;
  return box;
}

export const cityShapesDeck: Deck = {
  id: "cityshapes",
  subject: "Geography",
  title: "City Shapes",
  blurb: "A city's coastline and rivers, with no names on. Or just its streets. Which city is it?",
  noun: "cities",
  mode: "prompt",
  placeholder: "Which city is this?",
  items,
  variants: [
    { id: "famous", label: "Famous ten", minutes: 2, starter: true, filter: (i) => i.tags.includes("famous") },
    { id: "anz", label: "Australia & New Zealand", minutes: 2, heading: "Coasts & rivers", filter: (i) => i.tags.includes("anz") },
    { id: "europe", label: "Europe", minutes: 4, filter: (i) => i.tags.includes("europe") },
    { id: "world", label: "Americas, Africa & Asia", minutes: 4, filter: (i) => i.tags.includes("world") },
    { id: "allwater", label: "All coasts & rivers", minutes: 10, filter: (i) => i.tags.includes("water") },
    { id: "streets", label: "Street plans", minutes: 4, heading: "Streets", filter: (i) => i.tags.includes("streets") },
  ],
  options: [],
  progressGroups: GROUPS,
  learn: learnCard,
  tip: "Dark is water, light is land, north is up. Map data © OpenStreetMap contributors (ODbL), via Overture Maps.",
  describe: (i) => (i.data!.view === "streets" ? `${i.name} (streets)` : i.name),
  renderPrompt: (item) => {
    const img = document.createElement("img");
    img.className = "prompt-city";
    img.alt = item.data!.view === "streets" ? "A city's street plan" : "A city's water and coastline";
    const src = urlFor(item);
    if (src) img.src = src;
    else void loadShapes().then(() => (img.src = urlFor(item)));
    return img;
  },
  createBoard: async ({ container, items: playing, variant }) => {
    await loadShapes();
    const groups = GROUPS.filter((g) => variant.id === "famous" || variant.id === "allwater" || g.tag === variant.id);
    return createFlagBoard(container, playing, urlFor, variant.id === "famous" ? [] : groups, "cities");
  },
};
