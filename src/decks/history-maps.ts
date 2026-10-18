// History map quizzes: Europe in 1914 and the Ancient World (AD 100).
// Borders come from "historical-basemaps" by André Ourednik (GPL-3.0), loaded from
// its GitHub page while you play rather than copied into this project.
import { geoArea } from "d3-geo";
import type { Deck, Item } from "../engine/types";
import { createMapBoard, type MapShape, type MapView } from "../boards/mapBoard";

const SOURCE = "https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/";

interface Feature {
  type: "Feature";
  properties: { NAME: string | null };
  geometry: { type: string; coordinates: number[][][] | number[][][][] } | null;
}

const cache = new Map<string, Promise<Feature[]>>();
function load(file: string) {
  if (!cache.has(file)) {
    cache.set(
      file,
      fetch(`${SOURCE}${file}.geojson`)
        .then((r) => {
          if (!r.ok) throw new Error(`Couldn't load the ${file} map (HTTP ${r.status}).`);
          return r.json();
        })
        .then((j: { features: Feature[] }) => j.features.filter((f) => f.geometry).map(rewind)),
    );
  }
  return cache.get(file)!;
}

/** Some outlines are stored the other way round, which would colour the whole globe. Flip those. */
function rewind(f: Feature): Feature {
  if (geoArea(f as never) <= 2 * Math.PI) return f;
  const g = f.geometry!;
  const flip = (poly: number[][][]) => poly.map((ring) => [...ring].reverse());
  const coordinates = g.type === "Polygon" ? flip(g.coordinates as number[][][]) : (g.coordinates as number[][][][]).map(flip);
  return { ...f, geometry: { ...g, coordinates } as Feature["geometry"] };
}

/** One snapshot year: which map file, how to frame it, and the states to name. */
interface Snapshot {
  id: string;
  label: string;
  file: string;
  view: MapView;
  minutes: number;
  /** [names in the source map, the answer, other accepted answers, starter?] */
  picks: [string[], string, string[], boolean?][];
}

const SNAPSHOTS: Snapshot[] = [
  {
    id: "bc323",
    label: "323 BC",
    file: "world_bc323",
    view: { rotate: -40, bbox: [-15, 5, 125, 52] },
    minutes: 4,
    picks: [
      [["Empire of Alexander"], "Alexander's Empire", ["Empire of Alexander", "Macedonian Empire", "Macedonia", "Alexander the Great"], true],
      [["Rome"], "Rome", ["Roman Republic", "Romans"], true],
      [["Carthaginian Empire"], "Carthage", ["Carthaginian Empire", "Carthaginians"], true],
      [["Qin"], "Qin", ["State of Qin", "Chin"], true],
      [["Zhou states"], "Zhou states", ["Zhou", "Chinese states"]],
      [["Magadha"], "Magadha", ["Nanda Empire", "Nanda"]],
      [["Greek city-states"], "Greek city-states", ["Greeks", "Greece", "Greek cities"]],
      [["Celts"], "Celts", ["Celtic peoples", "Gauls"]],
      [["Meroe"], "Kingdom of Kush", ["Kush", "Meroe", "Meroë"]],
      [["Saba"], "Saba", ["Sheba", "Sabaeans"]],
      [["Armenia"], "Armenia", []],
    ],
  },
  {
    id: "ad100",
    label: "AD 100",
    file: "world_100",
    view: { rotate: -30, bbox: [-115, -30, 150, 58] },
    minutes: 5,
    picks: [
      [["Roman Empire"], "Roman Empire", ["Rome", "Romans"], true],
      [["Parthian Empire"], "Parthian Empire", ["Parthia", "Parthians"], true],
      [["Han"], "Han Empire", ["Han", "Han China", "Han dynasty", "China"], true],
      [["Kushan Empire"], "Kushan Empire", ["Kushan", "Kushans"], true],
      [["Axum"], "Kingdom of Aksum", ["Aksum", "Axum"], true],
      [["Meroe"], "Kingdom of Kush", ["Kush", "Meroe", "Meroë"]],
      [["Dacia"], "Dacia", ["Dacians"]],
      [["Armenia"], "Armenia", ["Kingdom of Armenia"]],
      [["Satavahanihara"], "Satavahana Empire", ["Satavahana", "Satavahanas"]],
      [["Southern Xiongnu"], "Xiongnu", ["Southern Xiongnu", "Huns"]],
      [["Nabatean Kingdom"], "Nabataean Kingdom", ["Nabataeans", "Nabatean Kingdom", "Nabateans", "Petra"]],
      [["Teotihuacan"], "Teotihuacan", ["Teotihuacán"]],
      [["Maya chiefdoms and states"], "Maya", ["Mayans", "Maya civilisation", "Maya civilization"], true],
      [["Moche"], "Moche", ["Mochica"]],
      [["Nazca"], "Nazca", ["Nasca"]],
      [["Koguryo"], "Goguryeo", ["Koguryo"]],
      [["Yayoi"], "Yayoi Japan", ["Yayoi", "Japan"]],
    ],
  },
  {
    id: "1279",
    label: "1279",
    file: "world_1279",
    view: { rotate: -60, bbox: [-20, -5, 145, 62] },
    minutes: 5,
    picks: [
      [["Great Khanate"], "Yuan Empire (Mongols)", ["Great Khanate", "Yuan", "Yuan dynasty", "Mongol Empire", "Mongols", "Kublai Khan"], true],
      [["Khanate of the Golden Horde"], "Golden Horde", ["Khanate of the Golden Horde"], true],
      [["Ilkhanate"], "Ilkhanate", ["Il-Khanate"]],
      [["Chagatai Khanate"], "Chagatai Khanate", ["Chagatai"]],
      [["Byzantine Empire"], "Byzantine Empire", ["Byzantium", "Byzantines", "Eastern Roman Empire"], true],
      [["Holy Roman Empire"], "Holy Roman Empire", ["HRE"], true],
      [["Mamluke Sultanate"], "Mamluk Sultanate", ["Mamluks", "Mamluke Sultanate", "Mamelukes"]],
      [["Sultanate of Delhi"], "Delhi Sultanate", ["Sultanate of Delhi", "Delhi"]],
      [["Mali"], "Mali Empire", ["Mali"], true],
      [["Khmer Empire"], "Khmer Empire", ["Khmer", "Angkor"], true],
      [["Srivijaya Empire"], "Srivijaya", ["Srivijaya Empire"]],
      [["France"], "France", ["Kingdom of France"]],
      [["Castile"], "Castile", ["Kingdom of Castile"]],
      [["English territory"], "England", ["Kingdom of England"]],
      [["Venice"], "Venice", ["Republic of Venice"]],
      [["Shogun Japan (Kamakura)"], "Kamakura Japan", ["Japan", "Kamakura shogunate", "Kamakura"]],
      [["Great Zimbabwe"], "Great Zimbabwe", ["Kingdom of Zimbabwe", "Zimbabwe"]],
      [["Chola Empire"], "Chola Empire", ["Chola", "Cholas"]],
      [["Đại Việt"], "Đại Việt", ["Dai Viet", "Vietnam"]],
    ],
  },
  {
    id: "1530",
    label: "1530",
    file: "world_1530",
    view: { rotate: -10 },
    minutes: 5,
    picks: [
      [["Ottoman Empire"], "Ottoman Empire", ["Ottomans", "Turkey"], true],
      [["Safavid Empire"], "Safavid Empire", ["Safavids", "Persia"], true],
      [["Mughal Empire"], "Mughal Empire", ["Mughals", "Moghul Empire"], true],
      [["Ming Chinese Empire"], "Ming China", ["Ming", "Ming dynasty", "Ming Empire", "China"], true],
      [["Inca Empire"], "Inca Empire", ["Inca", "Incas", "Tawantinsuyu"], true],
      [["Viceroyalty of New Spain"], "New Spain", ["Viceroyalty of New Spain", "Spanish Mexico"], true],
      [["Holy Roman Empire"], "Holy Roman Empire", ["HRE"]],
      [["England and Ireland"], "England", ["England and Ireland", "Kingdom of England"]],
      [["Spain"], "Spain", []],
      [["Portugal"], "Portugal", []],
      [["France"], "France", []],
      [["Poland-Lithuania"], "Poland-Lithuania", ["Poland", "Lithuania", "Polish-Lithuanian"]],
      [["Songhai"], "Songhai Empire", ["Songhai"]],
      [["Vijayanagara"], "Vijayanagara Empire", ["Vijayanagara", "Vijayanagar"]],
      [["Ethiopia"], "Ethiopia", ["Abyssinia"]],
      [["Japan (Warring States)"], "Japan", ["Warring States Japan", "Sengoku Japan"]],
    ],
  },
  {
    id: "1815",
    label: "1815",
    file: "world_1815",
    view: { rotate: -10 },
    minutes: 5,
    picks: [
      [["United Kingdom of Great Britain and Ireland"], "United Kingdom", ["UK", "Britain", "Great Britain"], true],
      [["British East India Company"], "British East India Company", ["East India Company", "British India", "EIC"], true],
      [["Russian Empire"], "Russian Empire", ["Russia"], true],
      [["Ottoman Empire"], "Ottoman Empire", ["Ottomans", "Turkey"], true],
      [["Austrian Empire"], "Austrian Empire", ["Austria"]],
      [["Prussia"], "Prussia", ["Kingdom of Prussia"]],
      [["France"], "France", []],
      [["Spain"], "Spain", []],
      [["Manchu Empire"], "Qing China", ["Qing", "Manchu Empire", "China", "Qing dynasty"], true],
      [["Persia"], "Persia", ["Iran", "Qajar Persia"]],
      [["United States"], "United States", ["USA", "US", "America"], true],
      [["Viceroyalty of New Spain"], "New Spain", ["Viceroyalty of New Spain", "Mexico"]],
      [["Viceroyalty of Brazil"], "Brazil", ["Viceroyalty of Brazil", "Portuguese Brazil"]],
      [["Maratha Confederacy"], "Maratha Confederacy", ["Marathas", "Maratha Empire"]],
      [["Zulu"], "Zulu Kingdom", ["Zulu", "Zululand"]],
      [["New South Wales"], "New South Wales", ["NSW"], true],
      [["Kingdom of Hawaii"], "Kingdom of Hawaii", ["Hawaii"]],
      [["Japan"], "Japan", ["Tokugawa Japan"]],
      [["Sweden–Norway"], "Sweden–Norway", ["Sweden", "Sweden-Norway"]],
    ],
  },
  {
    id: "1914",
    label: "1914 (Europe)",
    file: "world_1914",
    view: { rotate: -15, bbox: [-11, 35, 42, 66] },
    minutes: 5,
    picks: [
      [["German Empire"], "German Empire", ["Germany", "Imperial Germany"], true],
      [["Austro-Hungarian Empire"], "Austria-Hungary", ["Austro-Hungarian Empire", "Austria Hungary", "Austro-Hungary"], true],
      [["Russian Empire"], "Russian Empire", ["Russia", "Imperial Russia"], true],
      [["Ottoman Empire"], "Ottoman Empire", ["Ottomans", "Turkey"], true],
      [["United Kingdom of Great Britain and Ireland"], "United Kingdom", ["UK", "Britain", "Great Britain"], true],
      [["France"], "France", [], true],
      [["Kingdom of Italy"], "Italy", ["Kingdom of Italy"], true],
      [["Spain"], "Spain", []],
      [["Portugal"], "Portugal", []],
      [["Switzerland"], "Switzerland", []],
      [["Belgium"], "Belgium", []],
      [["Netherlands"], "Netherlands", ["Holland"]],
      [["Luxembourg"], "Luxembourg", []],
      [["Denmark"], "Denmark", []],
      [["Norway"], "Norway", []],
      [["Sweden"], "Sweden", []],
      [["Serbia"], "Serbia", [], true],
      [["Montenegro"], "Montenegro", []],
      [["Albania"], "Albania", []],
      [["Greece"], "Greece", []],
      [["Bulgaria"], "Bulgaria", []],
      [["Romania"], "Romania", []],
    ],
  },
];

const items: Item[] = SNAPSHOTS.flatMap((snap) =>
  snap.picks.map(([sources, name, aliases, starter], i) => ({
    id: `${snap.id}-${i}`,
    name,
    aliases,
    tags: [snap.id, ...(starter ? ["starter"] : [])],
    data: { sources },
  })),
);

export const empiresDeck: Deck = {
  id: "empires",
  subject: "History",
  title: "Empires Through Time",
  blurb: "The world map at six moments, from Alexander the Great to 1914. Name the empires and kingdoms of the day.",
  noun: "states",
  items,
  variants: SNAPSHOTS.map((s) => ({ id: s.id, label: s.label, minutes: s.minutes, starter: s.id === "ad100", filter: (i: Item) => i.tags.includes(s.id) })),
  options: [{ id: "big", label: "The big ones only", hint: "Just the largest empires of each year", default: false }],
  applyOptions: (list, o) => (o.big ? list.filter((i) => i.tags.includes("starter")) : list),
  tip: "Historical borders: historical-basemaps by André Ourednik (GPL-3.0), loaded from GitHub. Hover any area after the round to see what it was called.",
  createBoard: async ({ container, items: playing, variant }) => {
    const snap = SNAPSHOTS.find((s) => s.id === variant.id)!;
    const features = await load(snap.file);
    const bySource = new Map<string, Item>();
    for (const it of items.filter((i) => i.tags.includes(snap.id))) for (const src of it.data!.sources as string[]) bySource.set(src, it);
    const shapes: MapShape[] = features.map((f) => {
      const item = f.properties.NAME ? bySource.get(f.properties.NAME) : undefined;
      return { id: item?.id ?? null, label: item?.name ?? f.properties.NAME ?? "", feature: f as never };
    });
    return createMapBoard(container, shapes, new Set(playing.map((i) => i.id)), snap.view);
  },
};
