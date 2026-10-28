// Picture quizzes: a photo appears and you name it. Photos come from Wikipedia at play time.
import type { Deck, Item } from "../engine/types";
import { createMapBoard, type MapShape } from "../boards/mapBoard";
import { backgroundLand, countryItems } from "./countries";
import { createFlagBoard } from "../boards/flagBoard";
import { loadPictures, type Picture } from "../data/pictures";

/** "id|name|aliases;more|where (optional)|starter" lines. */
function parse(table: string): Item[] {
  return table
    .trim()
    .split("\n")
    .map((line) => {
      const [id, name, aliases, where, starter] = line.split("|");
      return { id, name, aliases: aliases ? aliases.split(";") : [], tags: starter ? ["starter"] : [], data: { where } };
    });
}

type PictureSet = Parameters<typeof loadPictures>[0];
const loaded = new Map<string, Map<string, Picture>>();

/** The photo, question and credit shown for the current item. */
function photoPrompt(pic: Picture | undefined, question: string, strong?: string) {
  const fig = document.createElement("figure");
  fig.className = "prompt-photo";
  const q = document.createElement("figcaption");
  q.className = "prompt-text";
  q.textContent = question;
  if (strong) {
    const s = document.createElement("strong");
    s.textContent = strong;
    q.prepend(s, " ");
  }
  if (pic) {
    const img = document.createElement("img");
    img.src = pic.src;
    img.alt = "Photo";
    const credit = document.createElement("a");
    credit.className = "credit";
    credit.href = pic.page;
    credit.target = "_blank";
    credit.rel = "noopener";
    credit.textContent = `Photo: ${pic.artist} · ${pic.license}`;
    fig.append(img, q, credit);
  } else {
    const missing = document.createElement("p");
    missing.className = "muted";
    missing.textContent = "This photo didn't load. Press Skip to move on.";
    fig.append(q, missing);
  }
  return fig;
}

async function safeLoad(set: PictureSet, container: HTMLElement) {
  try {
    const pics = await loadPictures(set);
    loaded.set(set, pics);
    return pics;
  } catch {
    const warn = document.createElement("p");
    warn.className = "note";
    warn.textContent = "Couldn't reach Wikipedia for the photos. Check your connection and reload.";
    container.append(warn);
    return new Map<string, Picture>();
  }
}

function pictureDeck(cfg: {
  id: string;
  set: PictureSet;
  title: string;
  subject: string;
  blurb: string;
  noun: string;
  question: string;
  items: Item[];
  /** Optional overrides for the tip and the two round names. */
  tip?: string;
  starterLabel?: string;
  allLabel?: string;
}): Deck {
  return {
    id: cfg.id,
    subject: cfg.subject,
    title: cfg.title,
    blurb: cfg.blurb,
    noun: cfg.noun,
    mode: "prompt",
    placeholder: "Name it…",
    items: cfg.items,
    variants: [
      { id: "starter", label: cfg.starterLabel ?? "The Famous Ones", minutes: 2, starter: true, filter: (i) => i.tags.includes("starter") },
      { id: "all", label: cfg.allLabel ?? `All ${cfg.items.length}`, minutes: 6, filter: () => true },
    ],
    options: [],
    tip: cfg.tip ?? "Photos come from Wikipedia and are shown with their photographer and licence.",
    describe: (i) => (i.data!.where ? `${i.name} (${i.data!.where})` : i.name),
    renderPrompt: (item) => {
      const pic = loaded.get(cfg.set)?.get(item.id);
      const fig = document.createElement("figure");
      fig.className = "prompt-photo";
      const q = document.createElement("figcaption");
      q.className = "prompt-text";
      q.textContent = cfg.question;
      if (pic) {
        const img = document.createElement("img");
        img.src = pic.src;
        img.alt = "Photo to identify";
        const credit = document.createElement("a");
        credit.className = "credit";
        credit.href = pic.page;
        credit.target = "_blank";
        credit.rel = "noopener";
        credit.textContent = `Photo: ${pic.artist} · ${pic.license}`;
        fig.append(img, q, credit);
      } else {
        const missing = document.createElement("p");
        missing.className = "muted";
        missing.textContent = "This photo didn't load. Press Skip to move on.";
        fig.append(missing);
      }
      return fig;
    },
    createBoard: async ({ container, items: playing }) => {
      let pics = new Map<string, Picture>();
      try {
        pics = await loadPictures(cfg.set);
      } catch {
        const warn = document.createElement("p");
        warn.className = "note";
        warn.textContent = "Couldn't reach Wikipedia for the photos. Check your connection and reload.";
        container.append(warn);
      }
      loaded.set(cfg.set, pics);
      return createFlagBoard(container, playing, (i) => pics.get(i.id)?.src ?? "", [], "photos", (i) => {
        const p = pics.get(i.id);
        return p ? `Photo: ${p.artist} · ${p.license}` : "";
      });
    },
  };
}

export const ausAnimalsDeck = pictureDeck({
  id: "ausanimals",
  set: "animals",
  title: "Australian Animals",
  subject: "Nature & Animals",
  blurb: "From quokkas to cassowaries. A photo appears: name the animal.",
  noun: "animals",
  question: "What's this animal?",
  items: parse(`koala|Koala|||s
kangaroo|Kangaroo|Red kangaroo;Roo||s
wombat|Wombat|Common wombat||s
platypus|Platypus|||s
echidna|Echidna|Short-beaked echidna;Spiny anteater||s
emu|Emu|||s
kookaburra|Kookaburra|Laughing kookaburra||s
devil|Tasmanian devil|Devil||s
quokka|Quokka|||s
dingo|Dingo|||s
cassowary|Cassowary|Southern cassowary||
glider|Sugar glider|Glider||
wallaby|Wallaby|Red-necked wallaby||
numbat|Numbat|||
bilby|Bilby|Greater bilby||
frillneck|Frill-necked lizard|Frilled lizard;Frillneck;Frilled-neck lizard;Frill neck lizard||
croc|Saltwater crocodile|Crocodile;Saltie;Croc;Estuarine crocodile||
cockatoo|Sulphur-crested cockatoo|Cockatoo||
lyrebird|Lyrebird|Superb lyrebird||
penguin|Little penguin|Fairy penguin;Penguin;Little blue penguin||
thornydevil|Thorny devil|Thorny dragon||
galah|Galah|||
quoll|Quoll|Spotted-tailed quoll;Tiger quoll||
possum|Brushtail possum|Possum;Common brushtail possum||
bluetongue|Blue-tongued lizard|Blue-tongue;Blue tongue;Blue-tongued skink;Bluey||
dugong|Dugong|Sea cow||`),
});

export const landmarksDeck = pictureDeck({
  id: "landmarks",
  set: "landmarks",
  title: "Landmarks & Wonders",
  subject: "Travel & Transport",
  blurb: "The places on every travel poster. A photo appears: name the landmark.",
  noun: "landmarks",
  question: "What's this landmark?",
  items: parse(`eiffel|Eiffel Tower|Tour Eiffel|Paris, France|s
taj|Taj Mahal||Agra, India|s
greatwall|Great Wall of China|Great Wall|China|s
colosseum|Colosseum|Coliseum;Colosseo|Rome, Italy|s
liberty|Statue of Liberty|Lady Liberty|New York, USA|s
opera|Sydney Opera House|Opera House|Sydney, Australia|s
machupicchu|Machu Picchu||Peru|
redeemer|Christ the Redeemer|Cristo Redentor|Rio de Janeiro, Brazil|
petra|Petra|Al-Khazneh;The Treasury|Jordan|
chichen|Chichen Itza|Chichén Itzá;El Castillo|Mexico|
stonehenge|Stonehenge||England|
bigben|Big Ben|Elizabeth Tower|London, England|s
goldengate|Golden Gate Bridge|Golden Gate|San Francisco, USA|s
pisa|Leaning Tower of Pisa|Tower of Pisa;Pisa|Pisa, Italy|
sagrada|Sagrada Família|Sagrada Familia|Barcelona, Spain|
parthenon|Parthenon|Acropolis|Athens, Greece|
pyramid|Great Pyramid of Giza|Pyramids of Giza;Great Pyramid;Pyramids;Giza|Egypt|s
angkor|Angkor Wat|Angkor|Cambodia|
burj|Burj Khalifa||Dubai, UAE|
rushmore|Mount Rushmore|Rushmore|South Dakota, USA|
uluru|Uluru|Ayers Rock|Northern Territory, Australia|s
neuschwanstein|Neuschwanstein Castle|Neuschwanstein|Bavaria, Germany|
towerbridge|Tower Bridge||London, England|
hagiasophia|Hagia Sophia|Aya Sofya;Ayasofya|Istanbul, Türkiye|
moai|Moai|Easter Island statues;Easter Island heads;Easter Island|Rapa Nui, Chile|
forbidden|Forbidden City||Beijing, China|
fuji|Mount Fuji|Fuji;Fujisan;Mt Fuji|Japan|
stbasil|St Basil's Cathedral|Saint Basil's Cathedral;Saint Basil's;St Basils|Moscow, Russia|
brandenburg|Brandenburg Gate|Brandenburger Tor|Berlin, Germany|
harbourbridge|Sydney Harbour Bridge|Harbour Bridge;The Coathanger;Harbor Bridge|Sydney, Australia|
apostles|Twelve Apostles|The Twelve Apostles;12 Apostles|Great Ocean Road, Victoria|
alhambra|Alhambra|The Alhambra|Granada, Spain|`),
});



// ---------------------------------------------------------------- Pet breeds (click the photo)
const dogItems = parse(`labrador|Labrador Retriever|Labrador;Lab||s
gsd|German Shepherd|Alsatian||s
golden|Golden Retriever|||s
frenchie|French Bulldog|||s
bulldog|Bulldog|British Bulldog||
poodle|Poodle|||s
beagle|Beagle|||s
rottweiler|Rottweiler|||
dachshund|Dachshund|Sausage dog||s
corgi|Corgi|Pembroke Welsh Corgi||s
husky|Siberian Husky|Husky||s
bordercollie|Border Collie|||
boxer|Boxer|||
greatdane|Great Dane|||
chihuahua|Chihuahua|||
pug|Pug|||s
shihtzu|Shih Tzu|||
dalmatian|Dalmatian|||
aussieshepherd|Australian Shepherd|||
dobermann|Dobermann|||
jackrussell|Jack Russell Terrier|||
cavalier|Cavalier King Charles Spaniel|||
bernese|Bernese Mountain Dog|||
stbernard|St Bernard|||
greyhound|Greyhound|||
cattledog|Australian Cattle Dog|Blue Heeler||
kelpie|Kelpie|||
staffy|Staffordshire Bull Terrier|Staffy||
whippet|Whippet|||
afghan|Afghan Hound|||
shiba|Shiba Inu|||
samoyed|Samoyed|||`).map((i) => ({ ...i, tags: ["dog", ...i.tags.map((t) => (t === "starter" ? "dogstarter" : t))] }));
const catItems = parse(`persian|Persian|||s
siamese|Siamese|||s
mainecoon|Maine Coon|||s
ragdoll|Ragdoll|||s
bengal|Bengal|||s
sphynx|Sphynx|||s
british|British Shorthair|||
scottishfold|Scottish Fold|||
abyssinian|Abyssinian|||
russianblue|Russian Blue|||
birman|Birman|||
burmese|Burmese|||
norwegian|Norwegian Forest Cat|||
devonrex|Devon Rex|||
siberian|Siberian|||
exotic|Exotic Shorthair|||`).map((i) => ({ ...i, id: `cat-${i.id}`, tags: ["cat", ...i.tags.map((t) => (t === "starter" ? "catstarter" : t))] }));

export const petsDeck: Deck = {
  id: "pets",
  subject: "Nature & Animals",
  title: "Pet Breeds",
  blurb: "A breed is named. Click its photo. Dogs and cats, from Kelpies to Maine Coons.",
  noun: "breeds",
  mode: "click",
  items: [...dogItems, ...catItems],
  variants: [
    { id: "dogstarter", label: "Famous Dogs", minutes: 2, starter: true, filter: (i) => i.tags.includes("dogstarter") },
    { id: "catstarter", label: "Famous Cats", minutes: 2, starter: true, filter: (i) => i.tags.includes("catstarter") },
    { id: "dog", label: "All Dogs", minutes: 5, filter: (i) => i.tags.includes("dog") },
    { id: "cat", label: "All Cats", minutes: 4, filter: (i) => i.tags.includes("cat") },
    { id: "all", label: "Everything", minutes: 8, filter: () => true },
  ],
  options: [],
  progressGroups: [
    { tag: "dog", label: "Dogs" },
    { tag: "cat", label: "Cats" },
  ],
  tip: "Photos come from Wikipedia. Hover over a photo to see who took it and its licence.",
  renderPrompt: (item) => {
    const p = document.createElement("p");
    p.className = "prompt-text";
    p.append("Click the ");
    const s = document.createElement("strong");
    s.textContent = item.name;
    p.append(s);
    return p;
  },
  createBoard: async ({ container, items: playing }) => {
    const [dogs, cats] = await Promise.all([safeLoad("dogs", container), safeLoad("cats", container)]);
    const src = (i: Item) => (i.tags.includes("cat") ? cats.get(i.id.replace(/^cat-/, "")) : dogs.get(i.id))?.src ?? "";
    const groups = [
      { tag: "dog", label: "Dogs" },
      { tag: "cat", label: "Cats" },
    ].filter((g) => playing.some((i) => i.tags.includes(g.tag)));
    const pic = (i: Item) => (i.tags.includes("cat") ? cats.get(i.id.replace(/^cat-/, "")) : dogs.get(i.id));
    const credit = (i: Item) => {
      const p = pic(i);
      return p ? `Photo: ${p.artist} · ${p.license}` : "";
    };
    return createFlagBoard(container, playing, src, groups.length > 1 ? groups : [], "photos pick", credit);
  },
};

// ---------------------------------------------------------------- Dinosaurs (photo + where found)
/** "id|name|aliases|period|where found|lat|lon|starter|aussie" */
const dinoItems: Item[] = `trex|Tyrannosaurus rex|T. rex;T rex;Trex;Tyrannosaurus|Late Cretaceous|Montana, USA|47.6|-106.7|s|
triceratops|Triceratops||Late Cretaceous|Wyoming, USA|43.0|-104.5|s|
velociraptor|Velociraptor|Raptor|Late Cretaceous|Gobi Desert, Mongolia|44.13|103.72|s|
spinosaurus|Spinosaurus||Cretaceous|Egypt|28.3|28.9|s|
ankylosaurus|Ankylosaurus||Late Cretaceous|Montana, USA|47.0|-107.5|s|
parasaurolophus|Parasaurolophus||Late Cretaceous|Alberta, Canada|50.76|-111.5||
pachy|Pachycephalosaurus||Late Cretaceous|South Dakota, USA|45.5|-102.5||
iguanodon|Iguanodon||Early Cretaceous|Sussex, England|51.0|-0.2||
muttaburra|Muttaburrasaurus||Early Cretaceous|Muttaburra, Queensland|-22.6|144.55||a
australovenator|Australovenator|Banjo|Early Cretaceous|Winton, Queensland|-22.4|143.0||a
leaellyn|Leaellynasaura||Early Cretaceous|Dinosaur Cove, Victoria|-38.82|143.42||a
minmi|Minmi||Early Cretaceous|Roma, Queensland|-26.6|148.8||a
stegosaurus|Stegosaurus||Late Jurassic|Colorado, USA|39.65|-105.2|s|
brachiosaurus|Brachiosaurus||Late Jurassic|Colorado, USA|39.1|-108.5|s|
diplodocus|Diplodocus||Late Jurassic|Colorado, USA|38.4|-105.2|s|
allosaurus|Allosaurus||Late Jurassic|Utah, USA|39.3|-110.7||
archaeopteryx|Archaeopteryx||Late Jurassic|Solnhofen, Germany|48.9|11.0||
brontosaurus|Brontosaurus|Apatosaurus|Late Jurassic|Wyoming, USA|41.9|-106.0||
dilophosaurus|Dilophosaurus||Early Jurassic|Arizona, USA|36.0|-111.0||
megalosaurus|Megalosaurus||Middle Jurassic|Oxfordshire, England|51.8|-1.3||
coelophysis|Coelophysis||Late Triassic|New Mexico, USA|36.3|-106.5||
plateosaurus|Plateosaurus||Late Triassic|Trossingen, Germany|48.07|8.63||
herrerasaurus|Herrerasaurus||Late Triassic|San Juan, Argentina|-30.0|-67.9||
eoraptor|Eoraptor||Late Triassic|San Juan, Argentina|-30.1|-67.6||
argentinosaurus|Argentinosaurus||Late Cretaceous|Neuquén, Argentina|-38.9|-68.6||
giganotosaurus|Giganotosaurus||Late Cretaceous|Neuquén, Argentina|-39.5|-69.2||
oviraptor|Oviraptor||Late Cretaceous|Gobi Desert, Mongolia|44.0|103.3||
protoceratops|Protoceratops||Late Cretaceous|Gobi Desert, Mongolia|44.3|104.1||`
  .split("\n")
  .map((line) => {
    const [id, name, aliases, period, where, lat, lon, starter, aussie] = line.split("|");
    return {
      id,
      name,
      aliases: aliases ? aliases.split(";") : [],
      tags: [...(starter ? ["starter"] : []), ...(aussie ? ["aussie"] : [])],
      data: { period, where, point: [Number(lon), Number(lat)] },
    };
  });

export const dinosaursDeck: Deck = {
  id: "dinosaurs",
  subject: "Nature & Animals",
  title: "Dinosaurs",
  blurb: "A fossil or reconstruction appears, with the spot where it was dug up. Name the dinosaur.",
  noun: "dinosaurs",
  mode: "prompt",
  placeholder: "Which dinosaur?",
  items: dinoItems,
  variants: [
    { id: "starter", label: "The Famous Ones", minutes: 3, starter: true, filter: (i) => i.tags.includes("starter") },
    { id: "aussie", label: "Australian Dinosaurs", minutes: 2, filter: (i) => i.tags.includes("aussie") },
    { id: "all", label: `All ${dinoItems.length}`, minutes: 6, filter: () => true },
  ],
  options: [],
  tip: "The ring shows where the first or most famous fossils were found. Photos come from Wikipedia.",
  describe: (i) => `${i.name}: ${i.data!.where} (${i.data!.period})`,
  renderPrompt: (item) => photoPrompt(loaded.get("dinos")?.get(item.id), `Which dinosaur is this? Found in ${item.data!.where}.`),
  createBoard: async ({ container, items: playing }) => {
    const [land] = await Promise.all([backgroundLand(), safeLoad("dinos", container)]);
    return createMapBoard(
      container,
      [...land, ...playing.map((i) => ({ id: i.id, label: `${i.name}: ${i.data!.where}`, point: i.data!.point as [number, number] }))],
      new Set(playing.map((i) => i.id)),
      { rotate: -10 },
    );
  },
};
