// Picture quizzes: a photo appears and you name it. Photos come from Wikipedia at play time.
import type { Deck, Item } from "../engine/types";
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

const loaded = new Map<string, Map<string, Picture>>();

function pictureDeck(cfg: {
  id: string;
  set: "animals" | "dogs" | "landmarks";
  title: string;
  subject: string;
  blurb: string;
  noun: string;
  question: string;
  items: Item[];
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
      { id: "starter", label: "The Famous Ones", minutes: 2, starter: true, filter: (i) => i.tags.includes("starter") },
      { id: "all", label: `All ${cfg.items.length}`, minutes: 6, filter: () => true },
    ],
    options: [],
    tip: "Photos come from Wikipedia and are shown with their photographer and licence.",
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
      return createFlagBoard(container, playing, (i) => pics.get(i.id)?.src ?? "", [], "photos");
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

export const dogsDeck = pictureDeck({
  id: "dogs",
  set: "dogs",
  title: "Dog Breeds",
  subject: "Nature & Animals",
  blurb: "Labrador or Golden Retriever? Kelpie or Cattle Dog? A photo appears: name the breed.",
  noun: "breeds",
  question: "What breed is this?",
  items: parse(`labrador|Labrador Retriever|Labrador;Lab||s
gsd|German Shepherd|Alsatian;German Shepherd Dog||s
golden|Golden Retriever|Golden||s
frenchie|French Bulldog|Frenchie||s
bulldog|Bulldog|British Bulldog;English Bulldog||
poodle|Poodle|||s
beagle|Beagle|||s
rottweiler|Rottweiler|Rottie||
dachshund|Dachshund|Sausage dog;Wiener dog||s
corgi|Corgi|Pembroke Welsh Corgi;Welsh Corgi||s
husky|Siberian Husky|Husky||s
bordercollie|Border Collie|||
boxer|Boxer|||
greatdane|Great Dane|||
chihuahua|Chihuahua|||
pug|Pug|||s
shihtzu|Shih Tzu|||
dalmatian|Dalmatian|||
aussieshepherd|Australian Shepherd|Aussie Shepherd;Aussie||
dobermann|Dobermann|Doberman;Doberman Pinscher||
jackrussell|Jack Russell Terrier|Jack Russell||
cavalier|Cavalier King Charles Spaniel|Cavalier;King Charles Spaniel;Cavalier King Charles||
bernese|Bernese Mountain Dog|Bernese||
stbernard|St Bernard|Saint Bernard||
greyhound|Greyhound|||
cattledog|Australian Cattle Dog|Blue Heeler;Heeler;Red Heeler;Cattle dog;Queensland Heeler||
kelpie|Kelpie|Australian Kelpie||
staffy|Staffordshire Bull Terrier|Staffy;Staffie;Staffordshire||
whippet|Whippet|||
afghan|Afghan Hound|Afghan||
shiba|Shiba Inu|Shiba||
samoyed|Samoyed|||`),
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
