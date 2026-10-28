// Picture quizzes: a photo appears and you name it. Photos come from Wikipedia at play time.
import type { Deck, Item, ProgressGroup, Variant } from "../engine/types";
import { createMapBoard, type MapShape } from "../boards/mapBoard";
import { backgroundLand, countryItems } from "./countries";
import { createFlagBoard } from "../boards/flagBoard";
import { loadPictures, type Picture } from "../data/pictures";

/**
 * "id|name|aliases;more|where (optional)|tags" lines. The tags are separated by spaces;
 * "s" marks a starter and anything else becomes a tag of its own (e.g. "rare mammal").
 */
function parse(table: string): Item[] {
  return table
    .trim()
    .split("\n")
    .map((line) => {
      const [id, name, aliases, where, tagText] = line.split("|");
      const tags = (tagText ?? "").split(" ").filter(Boolean).map((t) => (t === "s" ? "starter" : t));
      return { id, name, aliases: aliases ? aliases.split(";") : [], tags, data: { where } };
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
  /** Replaces the two standard rounds (for a quiz with more rounds). */
  variants?: Variant[];
  /** Progress panel groups, which also split the picture wall into headed sections. */
  progressGroups?: ProgressGroup[];
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
    variants: cfg.variants ?? [
      { id: "starter", label: cfg.starterLabel ?? "The Famous Ones", minutes: 2, starter: true, filter: (i) => i.tags.includes("starter") },
      { id: "all", label: cfg.allLabel ?? `All ${cfg.items.length}`, minutes: 6, filter: () => true },
    ],
    progressGroups: cfg.progressGroups,
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
      // The wall uses the small copy of each photo, so a wall of 200 stays light.
      return createFlagBoard(container, playing, (i) => pics.get(i.id)?.thumb ?? "", cfg.progressGroups ?? [], "photos", (i) => {
        const p = pics.get(i.id);
        return p ? `Photo: ${p.artist} · ${p.license}` : "";
      });
    },
  };
}

// ---------------------------------------------------------------- Animals (from all over the world)
// One entry for each group of look-alikes ("Elephant", "Zebra"), with the specific names as aliases.
// Tags: how well known (s = common, less, rare) and which class (mammal, bird, herp, sea, bug).
const COMMON_ANIMALS = `lion|Lion|Lioness;African lion|Africa|s mammal
tiger|Tiger|Bengal tiger;Siberian tiger;Sumatran tiger|Asia|s mammal
elephant|Elephant|African elephant;Asian elephant;Indian elephant|Africa, Asia|s mammal
giraffe|Giraffe||Africa|s mammal
zebra|Zebra|Plains zebra;Grevy's zebra;Mountain zebra|Africa|s mammal
hippo|Hippopotamus|Hippo|Africa|s mammal
rhino|Rhinoceros|Rhino;White rhino;Black rhino;Indian rhino|Africa, Asia|s mammal
cheetah|Cheetah||Africa|s mammal
gorilla|Gorilla|Western gorilla;Mountain gorilla|Africa|s mammal
chimp|Chimpanzee|Chimp|Africa|s mammal
panda|Giant panda|Panda;Panda bear|China|s mammal
polarbear|Polar bear|Ice bear;White bear|Arctic|s mammal
brownbear|Brown bear|Bear;Grizzly;Grizzly bear;Kodiak bear|Europe, Asia, North America|s mammal
fox|Fox|Red fox|Europe, Asia, North America|s mammal
cow|Cow|Cattle;Bull;Ox;Dairy cow|Farm animal|s mammal
pig|Pig|Hog;Swine;Domestic pig|Farm animal|s mammal
horse|Horse|Stallion;Mare|Farm animal|s mammal
sheep|Sheep|Lamb;Ram|Farm animal|s mammal
goat|Goat|Billy goat|Farm animal|s mammal
rabbit|Rabbit|Bunny;European rabbit|Europe|s mammal
camel|Camel|Dromedary;Bactrian camel|Africa, Asia|s mammal
kangaroo|Kangaroo|Red kangaroo;Roo|Australia|s mammal
koala|Koala||Australia|s mammal
dolphin|Dolphin|Bottlenose dolphin;Porpoise|Oceans|s mammal
whale|Whale|Humpback whale;Blue whale;Sperm whale|Oceans|s mammal
seal|Seal|Sea lion;Harbour seal;Harbor seal;Fur seal|Oceans|s mammal
penguin|Penguin|Emperor penguin;King penguin;Little penguin;Fairy penguin;Little blue penguin|Antarctica, Southern Hemisphere|s bird
owl|Owl|Barn owl;Snowy owl;Great horned owl|Worldwide|s bird
eagle|Eagle|Bald eagle;Golden eagle|Worldwide|s bird
macaw|Macaw|Parrot;Scarlet macaw|South America|s bird
flamingo|Flamingo|Greater flamingo|Africa, Americas|s bird
peacock|Peacock|Peafowl;Peahen;Indian peafowl|Asia|s bird
swan|Swan|Mute swan|Europe|s bird
duck|Duck|Mallard|Worldwide|s bird
chicken|Chicken|Hen;Cockerel|Farm animal|s bird
ostrich|Ostrich|Common ostrich|Africa|s bird
croc|Crocodile|Saltwater crocodile;Saltie;Croc;Nile crocodile;Alligator|Worldwide|s herp
snake|Snake||Worldwide|s herp
turtle|Turtle|Sea turtle;Green turtle;Green sea turtle;Tortoise|Oceans|s herp
frog|Frog|Common frog|Worldwide|s herp
shark|Shark|Great white shark;Great white|Oceans|s sea
jellyfish|Jellyfish|Jelly;Jellies|Oceans|s sea
octopus|Octopus|Common octopus|Oceans|s sea
starfish|Starfish|Sea star|Oceans|s sea
crab|Crab||Worldwide|s sea
clownfish|Clownfish|Clown fish;Anemonefish;Nemo|Indo-Pacific|s sea
seahorse|Seahorse|Sea horse|Oceans|s sea
butterfly|Butterfly|Monarch butterfly;Monarch|Worldwide|s bug
bee|Bee|Honey bee;Honeybee;Bumblebee|Worldwide|s bug
ladybird|Ladybird|Ladybug;Lady beetle;Ladybird beetle|Worldwide|s bug
spider|Spider||Worldwide|s bug
ant|Ant|Ants|Worldwide|s bug`;

const LESS_COMMON_ANIMALS = `wombat|Wombat|Common wombat|Australia|less mammal
platypus|Platypus||Australia|less mammal
echidna|Echidna|Short-beaked echidna;Spiny anteater|Australia|less mammal
quokka|Quokka||Australia|less mammal
dingo|Dingo||Australia|less mammal
wallaby|Wallaby|Red-necked wallaby|Australia|less mammal
glider|Sugar glider|Glider|Australia|less mammal
possum|Brushtail possum|Possum;Common brushtail possum|Australia|less mammal
devil|Tasmanian devil|Devil|Australia|less mammal
numbat|Numbat||Australia|less mammal
bilby|Bilby|Greater bilby|Australia|less mammal
meerkat|Meerkat||Africa|less mammal
lemur|Lemur|Ring-tailed lemur;Ringtail lemur|Madagascar|less mammal
okapi|Okapi||Africa|less mammal
tapir|Tapir|Malayan tapir;Brazilian tapir|South America, Asia|less mammal
pangolin|Pangolin|Scaly anteater|Africa, Asia|less mammal
sloth|Sloth|Three-toed sloth;Two-toed sloth|Central & South America|less mammal
redpanda|Red panda|Lesser panda|Asia|less mammal
bison|Bison|American bison;Buffalo;Wisent|North America|less mammal
moose|Moose||North America, Europe|less mammal
llama|Llama|Alpaca|South America|less mammal
capybara|Capybara||South America|less mammal
otter|Otter|Sea otter;River otter|Worldwide|less mammal
beaver|Beaver|North American beaver;Eurasian beaver|North America, Europe|less mammal
porcupine|Porcupine|Crested porcupine|Africa, Asia, Americas|less mammal
hedgehog|Hedgehog|European hedgehog|Europe|less mammal
armadillo|Armadillo|Nine-banded armadillo|Americas|less mammal
anteater|Giant anteater||South America|less mammal
raccoon|Raccoon|Racoon|North America|less mammal
warthog|Warthog|Common warthog|Africa|less mammal
wildebeest|Wildebeest|Gnu;Blue wildebeest|Africa|less mammal
mandrill|Mandrill||Africa|less mammal
gibbon|Gibbon|Lar gibbon;White-handed gibbon|Asia|less mammal
orangutan|Orangutan|Orang-utan;Orangutang;Orang utan|Borneo, Sumatra|less mammal
walrus|Walrus||Arctic|less mammal
beluga|Beluga|Beluga whale;White whale|Arctic|less mammal
narwhal|Narwhal||Arctic|less mammal
orca|Orca|Killer whale|Oceans|less mammal
bat|Bat|Fruit bat;Flying fox|Worldwide|less mammal
hyena|Hyena|Spotted hyena;Hyaena|Africa|less mammal
fennec|Fennec fox|Fennec|Africa|less mammal
emu|Emu||Australia|less bird
kookaburra|Kookaburra|Laughing kookaburra|Australia|less bird
cassowary|Cassowary|Southern cassowary|Australia, New Guinea|less bird
cockatoo|Sulphur-crested cockatoo|Cockatoo|Australia|less bird
galah|Galah|Rose-breasted cockatoo|Australia|less bird
lyrebird|Lyrebird|Superb lyrebird|Australia|less bird
puffin|Puffin|Atlantic puffin|North Atlantic|less bird
kiwi|Kiwi|Kiwi bird|New Zealand|less bird
toucan|Toucan|Toco toucan|South America|less bird
hummingbird|Hummingbird||Americas|less bird
pelican|Pelican||Worldwide|less bird
seagull|Seagull|Gull|Worldwide|less bird
crow|Crow|Raven|Worldwide|less bird
woodpecker|Woodpecker||Worldwide|less bird
hornbill|Hornbill|Great hornbill|Asia, Africa|less bird
birdofparadise|Bird-of-paradise|Bird of paradise|New Guinea|less bird
booby|Blue-footed booby|Booby|Galápagos|less bird
heron|Heron|Grey heron;Great blue heron|Worldwide|less bird
turkey|Turkey|Wild turkey|North America|less bird
budgie|Budgerigar|Budgie|Australia|less bird
frillneck|Frill-necked lizard|Frilled lizard;Frillneck;Frilled-neck lizard;Frill neck lizard|Australia|less herp
bluetongue|Blue-tongued lizard|Blue-tongue;Blue tongue;Blue-tongued skink;Bluey|Australia|less herp
chameleon|Chameleon|Veiled chameleon;Panther chameleon|Africa, Madagascar|less herp
iguana|Iguana|Green iguana|Americas|less herp
komodo|Komodo dragon|Komodo;Komodo monitor|Indonesia|less herp
gecko|Gecko|House gecko|Worldwide|less herp
beardie|Bearded dragon|Beardie;Central bearded dragon|Australia|less herp
cobra|Cobra|King cobra;Indian cobra|Asia, Africa|less herp
dartfrog|Poison dart frog|Dart frog;Poison arrow frog|Central & South America|less herp
treefrog|Red-eyed tree frog|Red eyed tree frog;Tree frog|Central America|less herp
axolotl|Axolotl||Mexico|less herp
salamander|Fire salamander|Salamander|Europe|less herp
goldfish|Goldfish||Pet|less sea
puffer|Pufferfish|Puffer fish;Blowfish;Puffer|Oceans|less sea
swordfish|Swordfish||Oceans|less sea
moray|Moray eel|Moray|Oceans|less sea
hammerhead|Hammerhead shark|Hammerhead|Oceans|less sea
whaleshark|Whale shark||Oceans|less sea
manta|Manta ray|Manta|Oceans|less sea
lobster|Lobster|American lobster|Oceans|less sea
urchin|Sea urchin|Urchin|Oceans|less sea
anemone|Sea anemone||Oceans|less sea
cuttlefish|Cuttlefish|Common cuttlefish|Oceans|less sea
piranha|Piranha|Red-bellied piranha|South America|less sea
salmon|Salmon|Atlantic salmon|Rivers & seas|less sea
nautilus|Nautilus|Chambered nautilus|Indo-Pacific|less sea
dragonfly|Dragonfly||Worldwide|less bug
grasshopper|Grasshopper|Locust|Worldwide|less bug
mantis|Praying mantis|Mantis|Worldwide|less bug
stickinsect|Stick insect|Walking stick;Phasmid|Worldwide|less bug
scorpion|Scorpion||Worldwide|less bug
snail|Snail|Garden snail|Worldwide|less bug
stagbeetle|Stag beetle|Stag-beetle|Europe|less bug
firefly|Firefly|Lightning bug|Worldwide|less bug
cicada|Cicada||Worldwide|less bug
centipede|Centipede||Worldwide|less bug
earthworm|Earthworm|Worm|Worldwide|less bug
tarantula|Tarantula||Americas|less bug
mosquito|Mosquito|Mozzie|Worldwide|less bug`;

const RARE_ANIMALS = `ayeaye|Aye-aye|Aye aye|Madagascar|rare mammal
saola|Saola||Vietnam, Laos|rare mammal
fossa|Fossa||Madagascar|rare mammal
takin|Takin||Bhutan, China, Himalayas|rare mammal
quoll|Quoll|Spotted-tailed quoll|Australia|rare mammal
dugong|Dugong|Sea cow;Manatee|Australia, Indo-Pacific|rare mammal
tarsier|Tarsier|Philippine tarsier|Southeast Asia|rare mammal
proboscis|Proboscis monkey||Borneo|rare mammal
aardvark|Aardvark||Africa|rare mammal
binturong|Binturong||Southeast Asia|rare mammal
starnose|Star-nosed mole|Star nosed mole|North America|rare mammal
molerat|Naked mole-rat|Naked mole rat;Mole-rat;Mole rat|Africa|rare mammal
saiga|Saiga|Saiga antelope|Central Asia|rare mammal
markhor|Markhor||Central Asia|rare mammal
manedwolf|Maned wolf||South America|rare mammal
tamarin|Golden lion tamarin||Brazil|rare mammal
kinkajou|Kinkajou||Central & South America|rare mammal
babirusa|Babirusa||Indonesia|rare mammal
kakapo|Kakapo||New Zealand|rare bird
shoebill|Shoebill||Africa|rare bird
hoatzin|Hoatzin||South America|rare bird
secretary|Secretarybird|Secretary bird|Africa|rare bird
quetzal|Resplendent quetzal|Quetzal|Central America|rare bird
roller|Lilac-breasted roller||Africa|rare bird
takahe|Takahe||New Zealand|rare bird
rooster|Andean cock-of-the-rock|Cock-of-the-rock;Cock of the rock|South America|rare bird
hamerkop|Hamerkop||Africa|rare bird
kea|Kea||New Zealand|rare bird
condor|Andean condor|Condor|South America|rare bird
gharial|Gharial|Gavial|India|rare herp
giantsal|Chinese giant salamander|Giant salamander|China|rare herp
gila|Gila monster||North America|rare herp
tuatara|Tuatara||New Zealand|rare herp
thornydevil|Thorny devil|Thorny dragon|Australia|rare herp
matamata|Matamata|Mata mata|South America|rare herp
glassfrog|Glass frog|Glassfrog|Central & South America|rare herp
basilisk|Basilisk|Jesus Christ lizard;Jesus lizard|Central America|rare herp
sunfish|Ocean sunfish|Mola;Sunfish;Mola mola|Oceans|rare sea
wrasse|Humphead wrasse|Napoleon wrasse;Napoleon fish;Maori wrasse|Indo-Pacific|rare sea
coelacanth|Coelacanth||Indian Ocean|rare sea
seadragon|Leafy sea dragon|Seadragon;Leafy seadragon;Sea dragon|Australia|rare sea
nudibranch|Nudibranch|Sea slug|Oceans|rare sea
manowar|Portuguese man o' war|Man o' war;Man of war;Portuguese man of war|Oceans|rare sea
sawfish|Sawfish||Oceans|rare sea
giantclam|Giant clam||Indo-Pacific|rare sea
hercules|Hercules beetle||Central & South America|rare bug
weta|Giant weta|Weta|New Zealand|rare bug
luna|Luna moth|Moth|North America|rare bug
dungbeetle|Dung beetle|Scarab|Worldwide|rare bug`;

const animalRound = (id: string, label: string, minutes: number, tag: string, starter = false): Variant => ({
  id,
  label,
  minutes,
  starter,
  filter: (i) => i.tags.includes(tag),
});

export const animalsDeck = pictureDeck({
  id: "ausanimals", // kept from when this was Australian Animals, so saved best scores survive
  set: "animals",
  title: "Animals",
  subject: "Nature & Animals",
  blurb: "Animals from all over the world, from lions to aye-ayes. A photo appears: name the animal.",
  noun: "animals",
  question: "What's this animal?",
  items: parse([COMMON_ANIMALS, LESS_COMMON_ANIMALS, RARE_ANIMALS].join("\n")),
  variants: [
    animalRound("starter", "Common Animals", 4, "starter", true),
    animalRound("less", "Less Common", 10, "less"),
    animalRound("rare", "Rare & Unusual", 6, "rare"),
    animalRound("mammal", "Mammals", 10, "mammal"),
    animalRound("bird", "Birds", 6, "bird"),
    animalRound("herp", "Reptiles & Amphibians", 4, "herp"),
    animalRound("sea", "Fish & Sea Life", 4, "sea"),
    animalRound("bug", "Insects & Bugs", 4, "bug"),
    { id: "all", label: "Everything", minutes: 20, filter: () => true },
  ],
  progressGroups: [
    { tag: "mammal", label: "Mammals" },
    { tag: "bird", label: "Birds" },
    { tag: "herp", label: "Reptiles & Amphibians" },
    { tag: "sea", label: "Fish & Sea Life" },
    { tag: "bug", label: "Insects & Bugs" },
  ],
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

// ---------------------------------------------------------------- Spot the Airline
// Photos are aircraft (or public-domain logos) from each airline's Wikipedia article.
export const spotterDeck = pictureDeck({
  id: "spotter",
  set: "airlines",
  title: "Spot the Airline",
  subject: "Travel & Transport",
  blurb: "A plane in airline colours appears. Type the airline's name.",
  noun: "airlines",
  question: "Which airline is this?",
  tip: "Look at the colours on the tail and the body, and any words on the plane.",
  starterLabel: "Big Names",
  allLabel: "Around the World",
  items: parse(`qantas|Qantas|Qantas Airways|Australia|s
lufthansa|Lufthansa|Deutsche Lufthansa|Germany|s
emirates|Emirates|Emirates Airline|Dubai, UAE|s
singapore|Singapore Airlines|SIA;Singapore|Singapore|s
airnz|Air New Zealand|Air NZ|New Zealand|s
ba|British Airways|BA|United Kingdom|s
klm|KLM|KLM Royal Dutch Airlines;Royal Dutch Airlines|Netherlands|s
virginaus|Virgin Australia|Virgin Blue|Australia|s
qatar|Qatar Airways|Qatar|Doha, Qatar|s
cathay|Cathay Pacific|Cathay|Hong Kong|s
delta|Delta Air Lines|Delta;Delta Airlines|Atlanta, USA|s
airfrance|Air France||France|s
etihad|Etihad Airways|Etihad|Abu Dhabi, UAE|s
jal|Japan Airlines|JAL|Japan|s
turkish|Turkish Airlines|Turkish;THY|Türkiye|s
ryanair|Ryanair||Ireland|s
southwest|Southwest Airlines|Southwest|USA|s
jetstar|Jetstar|Jetstar Airways|Australia|s
alaska|Alaska Airlines|Alaska|Seattle, USA|s
finnair|Finnair||Finland|s
iberia|Iberia|Iberia Airlines|Spain|
united|United Airlines|United|Chicago, USA|
american|American Airlines|American|Fort Worth, USA|
aircanada|Air Canada||Canada|
virginatl|Virgin Atlantic|Virgin Atlantic Airways|United Kingdom|
easyjet|easyJet|Easy Jet|United Kingdom|
aerlingus|Aer Lingus||Ireland|
swiss|Swiss|Swiss International Air Lines;Swiss Air|Switzerland|
austrian|Austrian Airlines|Austrian|Austria|
sas|SAS|Scandinavian Airlines|Scandinavia|
korean|Korean Air||South Korea|
ana|All Nippon Airways|ANA|Japan|
eva|EVA Air|EVA|Taiwan|
thai|Thai Airways|Thai;Thai Airways International|Thailand|
malaysia|Malaysia Airlines|Malaysia;MAS|Malaysia|
garuda|Garuda Indonesia|Garuda|Indonesia|
airindia|Air India||India|
ethiopian|Ethiopian Airlines|Ethiopian|Ethiopia|
saa|South African Airways|SAA|South Africa|
hawaiian|Hawaiian Airlines|Hawaiian|Hawaii, USA|
jetblue|JetBlue|Jet Blue;JetBlue Airways|New York, USA|
latam|LATAM|LATAM Airlines|South America|
fiji|Fiji Airways|Air Pacific|Fiji|
scoot|Scoot||Singapore|
tap|TAP Air Portugal|TAP;TAP Portugal|Portugal|
norwegian|Norwegian|Norwegian Air Shuttle;Norwegian Air|Norway|
icelandair|Icelandair||Iceland|
elal|El Al|El Al Israel Airlines|Israel|
wizz|Wizz Air|Wizzair|Hungary|
rex|Rex|Regional Express;Regional Express Airlines;Rex Airlines|Australia|`),
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
