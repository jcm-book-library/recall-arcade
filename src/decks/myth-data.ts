// MYTHOLOGY DATA for the rebuild (see docs/mythology-design.md).
// Four cultures: Greek, Roman, Egyptian, Norse. One line per god:
//   id|name|aliases (;)|what they rule|symbol|sacred animal|counterpart|Wikipedia title
// - ids are explicit and must never change (saved scores depend on them).
// - "counterpart" is the same god in the other culture (Greek <-> Roman), blank if none.
// - A blank symbol or animal means the god is left out of that kind of question.
// - The Wikipedia title is for the "Meet the gods" picture; blank means use the name.
// Sources differ on some symbols; these are the most commonly taught ones.

export type Culture = "greek" | "roman" | "egypt" | "norse";

export const CULTURES: { id: Culture; label: string; blurb: string }[] = [
  { id: "greek", label: "Greek", blurb: "The gods of Mount Olympus, and the stories of ancient Greece." },
  { id: "roman", label: "Roman", blurb: "Rome took over most of the Greek gods and gave them new names." },
  { id: "egypt", label: "Egyptian", blurb: "Gods with animal heads, and the long journey to the afterlife." },
  { id: "norse", label: "Norse", blurb: "The Viking gods of Asgard, the world tree and the days of the week." },
];

export const GOD_TABLE: Record<Culture, string> = {
  greek: `
gr-zeus|Zeus||king of the gods, the sky and thunder|thunderbolt|eagle|ro-jupiter|
gr-hera|Hera||queen of the gods, marriage and family|crown|peacock|ro-juno|
gr-poseidon|Poseidon||the sea, earthquakes and horses|trident|horse|ro-neptune|
gr-hades|Hades||the underworld and the dead|helmet of invisibility|Cerberus, the three-headed dog|ro-pluto|
gr-athena|Athena|Athene|wisdom, crafts and battle strategy|olive tree|owl|ro-minerva|
gr-apollo|Apollo||music, poetry, light and healing|lyre|raven|ro-apollo|
gr-artemis|Artemis||hunting, the wild and the moon|bow and arrows|deer|ro-diana|
gr-ares|Ares||war and violence|spear and helmet|vulture|ro-mars|
gr-aphrodite|Aphrodite||love and beauty|scallop shell|dove|ro-venus|
gr-hermes|Hermes||messages, travellers and thieves|winged sandals|tortoise|ro-mercury|
gr-hephaestus|Hephaestus|Hephaistos|fire, blacksmiths and forges|hammer and anvil|donkey|ro-vulcan|
gr-demeter|Demeter||the harvest and grain|sheaf of wheat|pig|ro-ceres|
gr-dionysus|Dionysus||wine, parties and theatre|grapevine|leopard|ro-bacchus|
gr-hestia|Hestia||the hearth and home|hearth fire||ro-vesta|
gr-persephone|Persephone||spring, and queen of the underworld|pomegranate||ro-proserpina|
gr-eros|Eros||love and desire|bow and arrows of love||ro-cupid|
gr-cronus|Cronus|Kronos|the Titans, and time before the gods|sickle||ro-saturn|`,
  roman: `
ro-jupiter|Jupiter|Jove|king of the gods, the sky and thunder|thunderbolt|eagle|gr-zeus|Jupiter (god)
ro-juno|Juno||queen of the gods, marriage and women|crown|peacock|gr-hera|Juno (mythology)
ro-neptune|Neptune||the sea|trident|horse|gr-poseidon|Neptune (mythology)
ro-pluto|Pluto|Dis|the underworld and the dead|||gr-hades|Pluto (mythology)
ro-minerva|Minerva||wisdom, crafts and strategy|olive tree|owl|gr-athena|
ro-apollo|Apollo||music, poetry, light and healing|lyre|raven|gr-apollo|
ro-diana|Diana||hunting, the wild and the moon|bow and arrows|deer|gr-artemis|Diana (mythology)
ro-mars|Mars||war, and father of Rome's founders|spear and shield|wolf|gr-ares|Mars (mythology)
ro-venus|Venus||love and beauty|scallop shell|dove|gr-aphrodite|Venus (mythology)
ro-mercury|Mercury||messages, trade and travellers|winged helmet|rooster|gr-hermes|Mercury (mythology)
ro-vulcan|Vulcan||fire, volcanoes and blacksmiths|hammer and anvil||gr-hephaestus|Vulcan (mythology)
ro-ceres|Ceres||the harvest and grain|sheaf of wheat||gr-demeter|Ceres (mythology)
ro-bacchus|Bacchus|Liber|wine and parties|grapevine|leopard|gr-dionysus|
ro-vesta|Vesta||the hearth, guarded by the Vestal Virgins|sacred flame||gr-hestia|Vesta (mythology)
ro-proserpina|Proserpina|Proserpine|spring, and queen of the underworld|pomegranate||gr-persephone|
ro-cupid|Cupid|Amor|love and desire|bow and arrows of love||gr-eros|
ro-saturn|Saturn||farming and time, remembered every Saturday|sickle||gr-cronus|Saturn (mythology)
ro-janus|Janus||doors, gates and beginnings (January is his month)|two faces looking both ways|||`,
  egypt: `
eg-ra|Ra|Re|the sun, and king of the gods|sun disc|falcon||
eg-osiris|Osiris||the afterlife and the dead|crook and flail|||
eg-isis|Isis||magic and healing, wife of Osiris|throne headdress|kite (a bird)||
eg-horus|Horus||the sky and kingship|Eye of Horus|falcon||
eg-anubis|Anubis||mummies and the dead|scales of judgement|jackal||
eg-thoth|Thoth||writing, wisdom and the moon|scribe's palette|ibis||
eg-set|Set|Seth|storms, deserts and chaos|was sceptre|Set animal (a mystery beast)||Set (deity)
eg-bastet|Bastet|Bast|home, cats and protection|sistrum (a rattle)|cat||
eg-sobek|Sobek||the Nile and its crocodiles||crocodile||
eg-hathor|Hathor||music, joy and motherhood|cow horns with a sun disc|cow||
eg-maat|Ma'at|Maat|truth, justice and balance|ostrich feather|||Maat
eg-sekhmet|Sekhmet||war and healing|sun disc on a lion's head|lioness||
eg-khnum|Khnum||the source of the Nile, shaping people on a potter's wheel|potter's wheel|ram||
eg-khepri|Khepri||the rising sun|scarab|scarab beetle||
eg-ammit|Ammit|Ammut|eating the hearts of the wicked||part crocodile, lion and hippo||`,
  norse: `
no-odin|Odin|Woden;Wotan|the chief god, wisdom and war|the spear Gungnir|ravens Huginn and Muninn||
no-thor|Thor||thunder and protecting people|the hammer Mjölnir|goats||
no-loki|Loki||tricks and mischief, a shape-shifter||||
no-freya|Freya|Freyja|love, beauty and war|the necklace Brísingamen|cats||Freyja
no-frigg|Frigg|Frigga|marriage and the home, queen of Asgard|spinning distaff|||
no-tyr|Tyr|Týr;Tiw|law and bravery in war, who lost a hand to the wolf Fenrir||||Týr
no-baldr|Baldr|Balder;Baldur|light and goodness, killed by a mistletoe dart|mistletoe|||
no-heimdall|Heimdall|Heimdallr|watching over the rainbow bridge Bifröst|the horn Gjallarhorn|ram||
no-freyr|Freyr|Frey|sunshine, rain and good harvests|the ship Skíðblaðnir|boar||
no-hel|Hel||Helheim, the realm of the dead||||Hel (mythological being)
no-njord|Njord|Njörðr|the sea, wind and fishing|ships|||Njörðr
no-idun|Idun|Iðunn;Idunn|youth, with her golden apples|golden apples|||Iðunn
no-bragi|Bragi||poetry and storytelling|harp|||`,
};

// The days of the week named after gods (English names).
// Tuesday to Friday are Norse; Saturday is Roman; Sunday and Monday are the Sun and Moon.
// Friday: most sources say Frigg, some say Freya, so the game accepts either explanation.
export const DAY_TABLE = `
day-sun|Sunday|the Sun|
day-mon|Monday|the Moon|
day-tue|Tuesday|Tyr (Tiw)|no-tyr
day-wed|Wednesday|Odin (Woden)|no-odin
day-thu|Thursday|Thor|no-thor
day-fri|Friday|Frigg|no-frigg
day-sat|Saturday|Saturn|ro-saturn`;

// The Egyptian journey to the afterlife, in order. id|step|detail
export const AFTERLIFE_TABLE = `
af-embalm|Mummification|Priests, led by Anubis, preserve the body over 70 days.
af-mouth|Opening of the Mouth|A ceremony so the dead can eat, speak and breathe again.
af-tomb|Into the tomb|Buried with food, treasures and the Book of the Dead, a guide of spells.
af-duat|Through the Duat|A dangerous journey through the underworld, past gates and monsters.
af-weigh|Weighing of the heart|In the Hall of Two Truths, Anubis weighs the heart against Ma'at's feather. Thoth writes down the result, and Ammit waits to eat a heavy heart.
af-osiris|Before Osiris|A light heart is led to Osiris, who welcomes the dead into the afterlife.
af-reeds|The Field of Reeds|Paradise: a perfect Egypt, with good harvests forever.`;

// The Nine Realms on Yggdrasil, the world tree. id|realm|who lives there|level
// The tree's layout varies between sources; this is the version most often drawn.
export const REALM_TABLE = `
re-asgard|Asgard|the Aesir gods, such as Odin and Thor|top
re-vanaheim|Vanaheim|the Vanir gods, such as Freyr and Njord|top
re-alfheim|Alfheim|the light elves|top
re-midgard|Midgard|humans (our world)|middle
re-jotunheim|Jotunheim|the giants|middle
re-svartalfheim|Svartalfheim|the dwarves|middle
re-niflheim|Niflheim|ice and mist|bottom
re-muspelheim|Muspelheim|fire, and the fire giant Surtr|bottom
re-helheim|Helheim|the dead, ruled by Hel|bottom`;
