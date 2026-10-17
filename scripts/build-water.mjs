// Builds src/data/water.json: the oceans, seas, lakes and rivers used by the
// "Seas, Lakes & Rivers" quiz, cut down from Natural Earth (public domain).
//
// Run with:  node scripts/build-water.mjs [folder with downloaded .geojson files]
// Without a folder it downloads the files from the Natural Earth GitHub mirror.
import fs from "node:fs";
import path from "node:path";

const SRC = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
const localDir = process.argv[2];

async function load(name) {
  if (localDir) return JSON.parse(fs.readFileSync(path.join(localDir, `${name}.geojson`), "utf8"));
  const res = await fetch(`${SRC}${name}.geojson`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

// id: [display name, kind, region tag, [source names...], [other accepted answers]]
const PICKS = {
  // Oceans
  pacific: ["Pacific Ocean", "ocean", "", ["North Pacific Ocean", "South Pacific Ocean"], ["Pacific"]],
  atlantic: ["Atlantic Ocean", "ocean", "", ["North Atlantic Ocean", "South Atlantic Ocean"], ["Atlantic"]],
  indian: ["Indian Ocean", "ocean", "", ["INDIAN OCEAN"], ["Indian"]],
  arctic: ["Arctic Ocean", "ocean", "", ["Arctic Ocean"], ["Arctic"]],
  southern: ["Southern Ocean", "ocean", "", ["SOUTHERN OCEAN"], ["Antarctic Ocean"]],
  // Seas
  mediterranean: ["Mediterranean Sea", "sea", "", ["Mediterranean Sea"], ["Mediterranean"]],
  caribbean: ["Caribbean Sea", "sea", "", ["Caribbean Sea"], ["Caribbean"]],
  southchina: ["South China Sea", "sea", "", ["South China Sea"], []],
  eastchina: ["East China Sea", "sea", "", ["East China Sea"], []],
  yellow: ["Yellow Sea", "sea", "", ["Yellow Sea"], []],
  japan: ["Sea of Japan", "sea", "", ["Sea of Japan"], ["East Sea"]],
  okhotsk: ["Sea of Okhotsk", "sea", "", ["Sea of Okhotsk"], []],
  bering: ["Bering Sea", "sea", "", ["Bering Sea"], []],
  philippine: ["Philippine Sea", "sea", "", ["Philippine Sea"], []],
  coral: ["Coral Sea", "sea", "", ["Coral Sea"], []],
  tasman: ["Tasman Sea", "sea", "", ["Tasman Sea"], ["The Ditch"]],
  arafura: ["Arafura Sea", "sea", "", ["Arafura Sea"], []],
  timor: ["Timor Sea", "sea", "", ["Timor Sea"], []],
  java: ["Java Sea", "sea", "", ["Java Sea"], []],
  celebes: ["Celebes Sea", "sea", "", ["Celebes Sea"], ["Sulawesi Sea"]],
  sulu: ["Sulu Sea", "sea", "", ["Sulu Sea"], []],
  banda: ["Banda Sea", "sea", "", ["Banda Sea"], []],
  andaman: ["Andaman Sea", "sea", "", ["Andaman Sea"], []],
  arabian: ["Arabian Sea", "sea", "", ["Arabian Sea"], []],
  red: ["Red Sea", "sea", "", ["Red Sea"], []],
  black: ["Black Sea", "sea", "", ["Black Sea"], []],
  caspian: ["Caspian Sea", "sea", "", ["Caspian Sea"], ["Caspian"]],
  baltic: ["Baltic Sea", "sea", "", ["Baltic Sea"], ["Baltic"]],
  north: ["North Sea", "sea", "", ["North Sea"], []],
  norwegian: ["Norwegian Sea", "sea", "", ["Norwegian Sea"], []],
  barents: ["Barents Sea", "sea", "", ["Barents Sea"], []],
  greenland: ["Greenland Sea", "sea", "", ["Greenland Sea"], []],
  irish: ["Irish Sea", "sea", "", ["Irish Sea"], []],
  adriatic: ["Adriatic Sea", "sea", "", ["Adriatic Sea"], ["Adriatic"]],
  aegean: ["Aegean Sea", "sea", "", ["Aegean Sea"], ["Aegean"]],
  tyrrhenian: ["Tyrrhenian Sea", "sea", "", ["Tyrrhenian Sea"], []],
  ionian: ["Ionian Sea", "sea", "", ["Ionian Sea"], []],
  white: ["White Sea", "sea", "", ["White Sea"], []],
  kara: ["Kara Sea", "sea", "", ["Kara Sea"], []],
  laptev: ["Laptev Sea", "sea", "", ["Laptev Sea"], []],
  chukchi: ["Chukchi Sea", "sea", "", ["Chukchi Sea"], []],
  beaufort: ["Beaufort Sea", "sea", "", ["Beaufort Sea"], []],
  labrador: ["Labrador Sea", "sea", "", ["Labrador Sea"], []],
  sargasso: ["Sargasso Sea", "sea", "", ["Sargasso Sea"], []],
  weddell: ["Weddell Sea", "sea", "", ["Weddell Sea"], []],
  ross: ["Ross Sea", "sea", "", ["Ross Sea"], []],
  scotia: ["Scotia Sea", "sea", "", ["Scotia Sea"], []],
  // Gulfs, bays, straits and channels
  mexico: ["Gulf of Mexico", "gulf", "", ["Gulf of Mexico"], []],
  persian: ["Persian Gulf", "gulf", "", ["Persian Gulf"], ["Arabian Gulf", "The Gulf"]],
  alaska: ["Gulf of Alaska", "gulf", "", ["Gulf of Alaska"], []],
  bengal: ["Bay of Bengal", "gulf", "", ["Bay of Bengal"], []],
  hudson: ["Hudson Bay", "gulf", "", ["Hudson Bay"], []],
  baffin: ["Baffin Bay", "gulf", "", ["Baffin Bay"], []],
  biscay: ["Bay of Biscay", "gulf", "", ["Bay of Biscay"], []],
  guinea: ["Gulf of Guinea", "gulf", "", ["Gulf of Guinea"], []],
  thailand: ["Gulf of Thailand", "gulf", "", ["Gulf of Thailand"], ["Gulf of Siam"]],
  bight: ["Great Australian Bight", "gulf", "", ["Great Australian Bight"], []],
  aden: ["Gulf of Aden", "gulf", "", ["Gulf of Aden"], []],
  oman: ["Gulf of Oman", "gulf", "", ["Gulf of Oman"], []],
  carpentaria: ["Gulf of Carpentaria", "gulf", "", ["Gulf of Carpentaria"], []],
  california: ["Gulf of California", "gulf", "", ["Golfo de California"], ["Sea of Cortez"]],
  bothnia: ["Gulf of Bothnia", "gulf", "", ["Gulf of Bothnia"], []],
  finland: ["Gulf of Finland", "gulf", "", ["Gulf of Finland"], []],
  stlawrencegulf: ["Gulf of Saint Lawrence", "gulf", "", ["Gulf of Saint Lawrence"], []],
  campeche: ["Bay of Campeche", "gulf", "", ["Bahía de Campeche"], []],
  plata: ["Río de la Plata", "gulf", "", ["Río de la Plata"], ["River Plate"]],
  english: ["English Channel", "gulf", "", ["English Channel"], ["La Manche", "The Channel"]],
  mozambique: ["Mozambique Channel", "gulf", "", ["Mozambique Channel"], []],
  drake: ["Drake Passage", "gulf", "", ["Drake Passage"], []],
  gibraltar: ["Strait of Gibraltar", "gulf", "", ["Strait of Gibraltar"], []],
  malacca: ["Strait of Malacca", "gulf", "", ["Strait of Malacca"], ["Straits of Malacca"]],
  taiwanstrait: ["Taiwan Strait", "gulf", "", ["Taiwan Strait"], ["Formosa Strait"]],
  korea: ["Korea Strait", "gulf", "", ["Korea Strait"], []],
  davis: ["Davis Strait", "gulf", "", ["Davis Strait"], []],
  reef: ["Great Barrier Reef", "gulf", "", ["Great Barrier Reef"], []],
  // Lakes
  superior: ["Lake Superior", "lake", "", ["Lake Superior"], ["Superior"]],
  michigan: ["Lake Michigan", "lake", "", ["Lake Michigan"], ["Michigan"]],
  huron: ["Lake Huron", "lake", "", ["Lake Huron"], ["Huron"]],
  erie: ["Lake Erie", "lake", "", ["Lake Erie"], ["Erie"]],
  ontario: ["Lake Ontario", "lake", "", ["Lake Ontario"], ["Ontario"]],
  greatbear: ["Great Bear Lake", "lake", "", ["Great Bear Lake"], []],
  greatslave: ["Great Slave Lake", "lake", "", ["Great Slave Lake"], []],
  winnipeg: ["Lake Winnipeg", "lake", "", ["Lake Winnipeg"], []],
  athabasca: ["Lake Athabasca", "lake", "", ["Lake Athabasca"], []],
  salt: ["Great Salt Lake", "lake", "", ["Great Salt Lake"], []],
  nicaragua: ["Lake Nicaragua", "lake", "", ["Lago de Nicaragua"], []],
  titicaca: ["Lake Titicaca", "lake", "", ["Lago Titicaca"], ["Titicaca"]],
  victoria: ["Lake Victoria", "lake", "", ["Lake Victoria"], []],
  tanganyika: ["Lake Tanganyika", "lake", "", ["Lake Tanganyika"], ["Tanganyika"]],
  malawi: ["Lake Malawi", "lake", "", ["Lake Malawi"], ["Lake Nyasa"]],
  chad: ["Lake Chad", "lake", "", ["Lake Chad"], []],
  turkana: ["Lake Turkana", "lake", "", ["Lake Turkana"], ["Lake Rudolf"]],
  volta: ["Lake Volta", "lake", "", ["Lake Volta"], []],
  nasser: ["Lake Nasser", "lake", "", ["Lake Nasser"], []],
  kariba: ["Lake Kariba", "lake", "", ["Lake Kariba"], []],
  tana: ["Lake Tana", "lake", "", ["Lake Tana"], []],
  baikal: ["Lake Baikal", "lake", "", ["Lake Baikal"], ["Baikal"]],
  balkhash: ["Lake Balkhash", "lake", "", ["Lake Balkhash"], ["Balkhash"]],
  aral: ["Aral Sea", "lake", "", ["North Aral Sea", "South Aral Sea"], []],
  ladoga: ["Lake Ladoga", "lake", "", ["Lake Ladoga"], ["Ladoga"]],
  onega: ["Lake Onega", "lake", "", ["Lake Onega"], []],
  issykkul: ["Issyk-Kul", "lake", "", ["Issyk-Kul"], ["Lake Issyk-Kul"]],
  dead: ["Dead Sea", "lake", "", ["Dead Sea"], []],
  van: ["Lake Van", "lake", "", ["Lake Van"], []],
  tonlesap: ["Tonlé Sap", "lake", "", ["Tonlé Sap"], ["Tonle Sap"]],
  qinghai: ["Qinghai Lake", "lake", "", ["Qinghai Hu"], ["Qinghai Hu"]],
  geneva: ["Lake Geneva", "lake", "", ["Lake Geneva"], ["Lac Léman", "Lake Leman"]],
  vanern: ["Vänern", "lake", "", ["Vänern"], ["Lake Vänern"]],
  eyre: ["Lake Eyre", "lake", "", ["Lake Eyre North", "Lake Eyre South"], ["Kati Thanda", "Kati Thanda-Lake Eyre"]],
  taupo: ["Lake Taupō", "lake", "", ["Lake Taupo"], ["Lake Taupo", "Taupo"]],
  // Rivers
  nile: ["Nile", "river", "", ["Nile", "Rosetta Branch", "Damietta Branch", "El Bahr el Abyad", "Bahr el Jebel", "Albert Nile", "Victoria Nile"], ["River Nile", "Nile River"]],
  amazon: ["Amazon", "river", "", ["Amazonas"], ["Amazon River", "River Amazon"]],
  yangtze: ["Yangtze", "river", "", ["Yangtze", "Chang Jiang", "Jinsha", "Tongtian", "Tuotuo"], ["Chang Jiang", "Yangtze River"]],
  mississippi: ["Mississippi", "river", "", ["Mississippi"], ["Mississippi River"]],
  missouri: ["Missouri", "river", "", ["Missouri"], ["Missouri River"]],
  yellowriver: ["Yellow River", "river", "", ["Huang"], ["Huang He", "Huang Ho"]],
  mekong: ["Mekong", "river", "", ["Mekong", "Lancang"], ["Mekong River"]],
  congo: ["Congo", "river", "", ["Congo", "Lualaba"], ["Congo River", "Zaire River"]],
  niger: ["Niger", "river", "", ["Niger"], ["Niger River"]],
  zambezi: ["Zambezi", "river", "", ["Zambezi"], ["Zambesi"]],
  orange: ["Orange", "river", "", ["Orange"], ["Orange River"]],
  volga: ["Volga", "river", "", ["Volga"], ["Volga River"]],
  danube: ["Danube", "river", "", ["Danube", "Donau", "Bratul Chillia", "Bratul Sulina", "Bratul Sfintu Gheorghe", "Borcea"], ["Donau", "Danube River"]],
  rhine: ["Rhine", "river", "", ["Rhine", "Rhein", "Rhin", "Nederrijn", "Lek", "Waal"], ["Rhein", "Rhine River"]],
  seine: ["Seine", "river", "", ["Seine"], ["River Seine"]],
  ganges: ["Ganges", "river", "", ["Ganges"], ["Ganga"]],
  indus: ["Indus", "river", "", ["Indus"], ["Indus River"]],
  brahmaputra: ["Brahmaputra", "river", "", ["Brahmaputra", "Yarlung", "Dihang"], []],
  euphrates: ["Euphrates", "river", "", ["Euphrates", "Al Furat", "Firat"], []],
  tigris: ["Tigris", "river", "", ["Tigris", "Dicle"], []],
  irrawaddy: ["Irrawaddy", "river", "", ["Ayeyarwady"], ["Ayeyarwady"]],
  ob: ["Ob", "river", "", ["Ob"], ["Ob River"]],
  yenisey: ["Yenisei", "river", "", ["Yenisey", "Verkhniy Yenisey"], ["Yenisey"]],
  lena: ["Lena", "river", "", ["Lena"], ["Lena River"]],
  amur: ["Amur", "river", "", ["Amur", "Heilong Jiang"], ["Heilong Jiang"]],
  murray: ["Murray", "river", "", ["Murray"], ["Murray River", "River Murray"]],
  darling: ["Darling", "river", "", ["Darling", "Barwon"], ["Darling River", "Barka"]],
  orinoco: ["Orinoco", "river", "", ["Orinoco"], []],
  parana: ["Paraná", "river", "", ["Paraná"], ["Parana"]],
  stlawrence: ["St. Lawrence", "river", "", ["St. Lawrence"], ["Saint Lawrence", "Saint Lawrence River"]],
  mackenzie: ["Mackenzie", "river", "", ["Mackenzie"], ["Mackenzie River"]],
  yukon: ["Yukon", "river", "", ["Yukon"], ["Yukon River"]],
  columbia: ["Columbia", "river", "", ["Columbia"], ["Columbia River"]],
  riogrande: ["Rio Grande", "river", "", ["Rio Grande"], ["Río Bravo"]],
  colorado: ["Colorado", "river", "", ["Colorado"], ["Colorado River"]],
  thames: ["Thames", "river", "", ["Thames"], ["River Thames"]],
};

const round = (n) => Math.round(n * 100) / 100;
const roundCoords = (c) => (typeof c[0] === "number" ? [round(c[0]), round(c[1])] : c.map(roundCoords));

// Drop points closer than ~0.05° to the previous one, to keep the file small.
function thin(ring) {
  if (typeof ring[0][0] !== "number") return ring.map(thin);
  const out = [ring[0]];
  for (const p of ring.slice(1, -1)) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) > 0.05) out.push(p);
  }
  out.push(ring[ring.length - 1]);
  return out;
}

const marine = await load("ne_50m_geography_marine_polys");
const lakes = await load("ne_10m_lakes").catch(() => load("ne_50m_lakes"));
const rivers = await load("ne_50m_rivers_lake_centerlines");

const out = [];
const missing = [];
for (const [id, [name, kind, , sources, aliases]] of Object.entries(PICKS)) {
  const pool = kind === "lake" ? lakes.features : kind === "river" ? rivers.features : marine.features;
  const feats = pool.filter((f) => sources.includes(f.properties.name));
  if (!feats.length) {
    missing.push(name);
    continue;
  }
  // Merge every matching piece into one geometry.
  const isLine = kind === "river";
  const parts = [];
  for (const f of feats) {
    const g = f.geometry;
    if (g.type === "Polygon" || g.type === "LineString") parts.push(g.coordinates);
    else parts.push(...g.coordinates);
  }
  const coords = parts.map((p) => roundCoords(thin(p)));
  out.push({
    id,
    name,
    kind,
    aliases,
    geometry: { type: isLine ? "MultiLineString" : "MultiPolygon", coordinates: coords },
  });
}

fs.writeFileSync(new URL("../src/data/water.json", import.meta.url), JSON.stringify(out));
// A names-only copy, so the home page can count places without loading outlines.
const names = out.map(({ id, name, kind, aliases }) => ({ id, name, kind, aliases }));
fs.writeFileSync(new URL("../src/data/water-names.json", import.meta.url), JSON.stringify(names));
console.log(`Wrote ${out.length} places.`, missing.length ? `Not found: ${missing.join(", ")}` : "");
