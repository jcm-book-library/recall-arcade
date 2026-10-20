// The Music subject: reading music, step by step, with a piano sound on every note.
import type { Deck, Item } from "../engine/types";
import { createPianoBoard } from "../boards/pianoBoard";
import { createTileBoard } from "../boards/tileBoard";
import { renderStaff } from "../music/staff";
import { playChord, playNote, playSequence } from "../music/audio";
import { fullName, isBlack, noteAliases, noteKey, noteName } from "../music/theory";
import { renderChoice } from "../ui/choice";

const SUBJECT = "Music";

function text(t: string, strong?: string) {
  const p = document.createElement("p");
  p.className = "prompt-text";
  p.append(t);
  if (strong) {
    const s = document.createElement("strong");
    s.textContent = strong;
    p.append(" ", s);
  }
  return p;
}

// ---------------------------------------------------------------- 1. The piano keyboard
const keyItems: Item[] = [];
for (let m = 60; m <= 83; m++) {
  keyItems.push({
    id: `k${m}`,
    name: noteName(m),
    aliases: noteAliases(m),
    tags: [isBlack(m) ? "black" : "white", m <= 71 ? "oct1" : "oct2"],
    data: { midi: m },
  });
}
const midiOf = (i: Item) => i.data!.midi as number;

export const keyboardDeck: Deck = {
  id: "keyboard",
  subject: SUBJECT,
  title: "The Piano Keyboard",
  blurb: "Start here. A key lights up and plays: name it. Then the black keys, the sharps and flats.",
  noun: "keys",
  mode: "prompt",
  clickOption: "click",
  placeholder: "Note name, e.g. C or F#",
  answerKey: noteKey,
  items: keyItems,
  variants: [
    { id: "white", label: "White Keys", minutes: 2, starter: true, filter: (i) => i.tags.includes("oct1") && i.tags.includes("white") },
    { id: "oct1", label: "All 12 Notes", minutes: 3, filter: (i) => i.tags.includes("oct1") },
    { id: "two", label: "Two Octaves", minutes: 5, filter: () => true },
  ],
  options: [{ id: "click", label: "Click the key instead", hint: "See the note name, click it on the keyboard", default: false }],
  tip: "The dot marks middle C. White keys go C D E F G A B, then repeat. Black keys can be called sharp (♯, or #) or flat (♭, or b): C♯ and D♭ are the same key.",
  judgeClick: (clicked, item) => clicked === item.id || noteName(Number(clicked.slice(1))) === item.name,
  describe: (i) => fullName(midiOf(i)).replace(/(\d)$/, " (octave $1)"),
  renderPrompt: (item, how) => (how.click ? text("Click", item.name) : text("Which note is lit up? Listen, then name it.")),
  createBoard: ({ container, items: playing, variant }) =>
    createPianoBoard(container, {
      low: 60,
      high: variant.id === "two" ? 84 : 72,
      keyOf: (id) => Number(id.slice(1)),
      showCurrent: true,
      playCurrent: true,
    }),
};

// ---------------------------------------------------------------- 2 & 3. Treble and bass clef
function staffDeck(cfg: {
  id: string;
  clef: "treble" | "bass";
  title: string;
  blurb: string;
  lines: number[];
  spaces: number[];
  ledger: number[];
  low: number;
  high: number;
  tip: string;
}): Deck {
  const all = [...cfg.lines, ...cfg.spaces, ...cfg.ledger].sort((a, b) => a - b);
  const items: Item[] = all.map((m) => ({
    id: `${cfg.id}-${m}`,
    name: noteName(m),
    aliases: noteAliases(m),
    tags: [cfg.lines.includes(m) ? "line" : cfg.spaces.includes(m) ? "space" : "ledger"],
    data: { midi: m },
  }));
  return {
    id: cfg.id,
    subject: SUBJECT,
    title: cfg.title,
    blurb: cfg.blurb,
    noun: "notes",
    mode: "prompt",
    clickOption: "click",
    placeholder: "Note name, e.g. G",
    answerKey: noteKey,
    items,
    variants: [
      { id: "lines", label: "The Lines", minutes: 2, starter: true, filter: (i) => i.tags.includes("line") },
      { id: "spaces", label: "The Spaces", minutes: 2, filter: (i) => i.tags.includes("space") },
      { id: "stave", label: "Lines and Spaces", minutes: 3, filter: (i) => !i.tags.includes("ledger") },
      { id: "all", label: "Plus Ledger Lines", minutes: 4, filter: () => true },
    ],
    options: [{ id: "click", label: "Answer on the piano", hint: "Click the matching key instead of typing the name", default: false }],
    tip: cfg.tip,
    judgeClick: (clicked, item) => Number(clicked.slice(1)) === midiOf(item),
    describe: (i) => `${fullName(midiOf(i))} (${i.tags[0] === "ledger" ? "ledger line" : `on a ${i.tags[0]}`})`,
    renderPrompt: (item, how) => {
      const wrap = document.createElement("div");
      wrap.className = "prompt-staff";
      wrap.append(renderStaff({ clef: cfg.clef, notes: [{ midi: midiOf(item) }] }), text(how.click ? "Click this note on the piano" : "Name this note"));
      return wrap;
    },
    createBoard: ({ container }) =>
      createPianoBoard(container, {
        low: cfg.low,
        high: cfg.high,
        keyOf: (id) => Number(id.split("-")[1]),
        showCurrent: false,
        playCurrent: false,
      }),
  };
}

export const trebleDeck = staffDeck({
  id: "treble",
  clef: "treble",
  title: "Treble Clef",
  blurb: "The clef for the right hand. A note appears on the stave: name it, or find it on the piano.",
  lines: [64, 67, 71, 74, 77],
  spaces: [65, 69, 72, 76],
  ledger: [60, 62, 79, 81],
  low: 60,
  high: 84,
  tip: "Lines, bottom to top: E G B D F (Every Good Boy Deserves Fruit). Spaces spell FACE. Middle C sits on a little line just below the stave.",
});

export const bassDeck = staffDeck({
  id: "bass",
  clef: "bass",
  title: "Bass Clef",
  blurb: "The clef for the left hand. Same game, lower notes.",
  lines: [43, 47, 50, 53, 57],
  spaces: [45, 48, 52, 55],
  ledger: [40, 41, 59, 60],
  low: 36,
  high: 60,
  tip: "Lines, bottom to top: G B D F A (Good Boys Deserve Fruit Always). Spaces: A C E G (All Cows Eat Grass). Middle C sits on a little line just above the stave.",
});

// ---------------------------------------------------------------- 4. Rhythm & note lengths
/** "glyph|British name|American name (accepted)|beats|tags" */
const RHYTHM = `𝅝|Semibreve|Whole note|4|note,starter
𝅗𝅥|Minim|Half note|2|note,starter
𝅘𝅥|Crotchet|Quarter note|1|note,starter
𝅘𝅥𝅮|Quaver|Eighth note|0.5|note,starter
𝅘𝅥𝅯|Semiquaver|Sixteenth note|0.25|note
𝅗𝅥.|Dotted minim|Dotted half note|3|note
𝅘𝅥.|Dotted crotchet|Dotted quarter note|1.5|note
𝄻|Semibreve rest|Whole rest|4|rest
𝄼|Minim rest|Half rest|2|rest
𝄽|Crotchet rest|Quarter rest|1|rest
𝄾|Quaver rest|Eighth rest|0.5|rest
𝄿|Semiquaver rest|Sixteenth rest|0.25|rest`;

const rhythmRows = RHYTHM.split("\n").map((l) => l.split("|"));
const rhythmItems: Item[] = [
  ...rhythmRows.map(([glyph, uk, us, beats, tags], i) => ({
    id: `r${i}`,
    name: uk,
    aliases: [us, `${us}s`, `${uk}s`],
    tags: ["name", ...tags.split(",")],
    data: { glyph, beats: Number(beats), clue: glyph },
  })),
  ...rhythmRows
    .filter(([, , , , tags]) => tags.startsWith("note"))
    .map(([glyph, uk, , beats], i) => ({
      id: `rb${i}`,
      name: beats,
      aliases: { "0.5": ["1/2", "½", "half", "a half"], "0.25": ["1/4", "¼", "quarter", "a quarter"], "1.5": ["1 1/2", "1½", "one and a half"], "4": ["four"], "3": ["three"], "2": ["two"], "1": ["one"] }[beats] ?? [],
      tags: ["beats"],
      data: { glyph, beats: Number(beats), clue: `${glyph}  ${uk}` },
    })),
];

/** Numbers compare as numbers ("0.5" = ".5" = "1/2"); words compare as words. */
function beatsKey(t: string): string {
  const s = t.trim().toLowerCase().replace(/\s*beats?$/, "");
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return `n${Number(frac[1]) / Number(frac[2])}`;
  if (/^\d*\.?\d+$/.test(s)) return `n${Number(s)}`;
  return s.replace(/[^a-z0-9½¼]/g, "");
}

export const rhythmDeck: Deck = {
  id: "rhythm",
  subject: SUBJECT,
  title: "Rhythm & Note Lengths",
  blurb: "How long is each note held? Name the notes and rests (crotchet, quaver…), then count their beats.",
  noun: "symbols",
  mode: "prompt",
  placeholder: "Your answer…",
  answerKey: beatsKey,
  items: rhythmItems,
  variants: [
    { id: "starter", label: "The Main Notes", minutes: 2, starter: true, filter: (i) => i.tags.includes("starter") },
    { id: "notes", label: "All Notes", minutes: 2, filter: (i) => i.tags.includes("name") && i.tags.includes("note") },
    { id: "rests", label: "Rests", minutes: 2, filter: (i) => i.tags.includes("rest") },
    { id: "beats", label: "How Many Beats?", minutes: 2, filter: (i) => i.tags.includes("beats") },
    { id: "all", label: "Everything", minutes: 4, filter: () => true },
  ],
  options: [],
  tip: "British names come first (crotchet, quaver), but American names work too (quarter note, eighth note). A dot after a note makes it half as long again. Beats are counted in 4/4 time, where a crotchet is one beat.",
  describe: (i) => (i.tags.includes("beats") ? `${i.data!.clue}: ${i.name} beats` : `${i.data!.glyph} ${i.name} (${i.aliases![0]}), ${i.data!.beats} beats`),
  renderPrompt: (item) => {
    const wrap = document.createElement("div");
    wrap.className = "prompt-staff";
    wrap.append(renderStaff({ clef: "treble", glyph: item.data!.glyph as string, width: 200 }));
    wrap.append(text(item.tags.includes("beats") ? `How many beats does a ${(item.data!.clue as string).split("  ")[1].toLowerCase()} last?` : item.tags.includes("rest") ? "What's this rest called?" : "What's this note called?"));
    // Hear how long it lasts: one beat = 0.6 seconds. Rests are silent.
    if (!item.tags.includes("rest")) playNote(72, (item.data!.beats as number) * 0.6);
    return wrap;
  },
  createBoard: ({ container, items: playing }) =>
    createTileBoard(container, playing, {
      clue: (i) => i.data!.glyph as string,
      className: "music",
      groups: [
        { tag: "note", label: "Notes" },
        { tag: "rest", label: "Rests" },
        { tag: "beats", label: "Beats" },
      ],
    }),
};

// ---------------------------------------------------------------- 5. Keys & symbols
/** Key signatures: answer | sharps | flats | starter */
const KEYS: [string, number, number, boolean][] = [
  ["C major", 0, 0, true],
  ["G major", 1, 0, true],
  ["D major", 2, 0, false],
  ["A major", 3, 0, false],
  ["E major", 4, 0, false],
  ["F major", 0, 1, true],
  ["B♭ major", 0, 2, false],
  ["E♭ major", 0, 3, false],
  ["A♭ major", 0, 4, false],
];
/** "answer|shown|aliases|tags": dynamics show the marking, tempo and others show the meaning. */
const TERMS = `Piano|p|Soft|dynamics,starter
Pianissimo|pp|Very soft|dynamics,starter
Forte|f|Loud|dynamics,starter
Fortissimo|ff|Very loud|dynamics,starter
Mezzo-piano|mp|Mezzo piano;Moderately soft|dynamics
Mezzo-forte|mf|Mezzo forte;Moderately loud|dynamics
Crescendo|cresc. ⟨|Cresc;Getting louder|dynamics
Diminuendo|dim. ⟩|Decrescendo;Dim;Getting softer|dynamics
Allegro|Fast and lively||tempo,starter
Andante|At a walking pace||tempo,starter
Adagio|Slow||tempo,starter
Largo|Very slow and broad|Lento|tempo
Presto|Very fast||tempo
Moderato|At a moderate speed||tempo
Accelerando|Gradually getting faster|Accel|tempo
Ritardando|Gradually slowing down|Rallentando;Rit;Rall|tempo
Staccato|Short and detached (a dot above the note)||signs
Legato|Smooth and connected||signs
Fermata|Hold the note longer than written (𝄐)|Pause|signs
Da capo|Go back to the beginning (D.C.)|DC;D.C.|signs
Fine|The end (where to stop after D.C.)||signs`;

const symbolItems: Item[] = [
  ...KEYS.map(([name, sharps, flats, starter], i) => ({
    id: `ks${i}`,
    name,
    aliases: [name.replace(" major", ""), name.replace("♭", "b"), name.replace("♭", "b").replace(" major", ""), name.replace("♭", " flat")],
    tags: ["keys", ...(starter ? ["keystarter"] : [])],
    data: { sharps, flats, clue: sharps ? `${sharps} ♯` : flats ? `${flats} ♭` : "no ♯ or ♭" },
  })),
  ...TERMS.split("\n").map((l, i) => {
    const [name, shown, aliases, tags] = l.split("|");
    return { id: `tm${i}`, name, aliases: aliases ? aliases.split(";") : [], tags: tags.split(","), data: { clue: shown } };
  }),
];

export const symbolsDeck: Deck = {
  id: "symbols",
  subject: SUBJECT,
  title: "Keys & Symbols",
  blurb: "Everything on the page besides the notes: how loud (forte, piano), how fast (allegro, adagio), and key signatures.",
  noun: "symbols",
  mode: "prompt",
  placeholder: "Your answer…",
  answerKey: noteKey,
  items: symbolItems,
  variants: [
    { id: "dyn", label: "How Loud", minutes: 2, starter: true, filter: (i) => i.tags.includes("dynamics") },
    { id: "tempo", label: "How Fast", minutes: 2, filter: (i) => i.tags.includes("tempo") },
    { id: "signs", label: "Other Signs", minutes: 2, filter: (i) => i.tags.includes("signs") },
    { id: "keystarter", label: "First Key Signatures", minutes: 2, filter: (i) => i.tags.includes("keystarter") },
    { id: "keys", label: "All Key Signatures", minutes: 3, filter: (i) => i.tags.includes("keys") },
    { id: "all", label: "Everything", minutes: 6, filter: () => true },
  ],
  options: [],
  tip: "Music markings are Italian. Piano means soft (the instrument's full name, pianoforte, means soft-loud). Key signatures: each sharp or flat at the start applies to every note on that line or space.",
  describe: (i) => (i.tags.includes("keys") ? `${i.data!.clue}: ${i.name}` : `${i.data!.clue}: ${i.name}`),
  renderPrompt: (item) => {
    const wrap = document.createElement("div");
    wrap.className = "prompt-staff";
    if (item.tags.includes("keys")) {
      wrap.append(renderStaff({ clef: "treble", sharps: (item.data!.sharps as number) || undefined, flats: (item.data!.flats as number) || undefined, width: 200 }));
      wrap.append(text("Which major key has this key signature?"));
    } else if (item.tags.includes("dynamics")) {
      const mark = document.createElement("p");
      mark.className = "dynamic";
      mark.textContent = item.data!.clue as string;
      wrap.append(mark, text("What's this marking called?"));
    } else {
      wrap.append(text("Which Italian term means:", `${item.data!.clue}?`));
    }
    return wrap;
  },
  createBoard: ({ container, items: playing }) =>
    createTileBoard(container, playing, {
      clue: (i) => i.data!.clue as string,
      className: "music",
      groups: [
        { tag: "dynamics", label: "How loud" },
        { tag: "tempo", label: "How fast" },
        { tag: "signs", label: "Other signs" },
        { tag: "keys", label: "Key signatures" },
      ],
    }),
};

// ---------------------------------------------------------------- 6. Ear training
const INTERVALS: [string, number, string][] = [
  ["Second", 2, "The first two notes of \"Happy Birthday\" … \"Happy Birth-\"."],
  ["Major third", 4, "The start of \"Oh When the Saints\"."],
  ["Perfect fourth", 5, "The start of \"Here Comes the Bride\"."],
  ["Perfect fifth", 7, "The opening leap of the Star Wars theme."],
  ["Octave", 12, "The start of \"Somewhere Over the Rainbow\"."],
];
const ROOTS = [60, 62, 65, 67];
const earItems: Item[] = [];
// Higher or lower: big jumps first, then smaller ones.
[12, -12, 7, -7, 5, -5, 4, -4, 3, -3, 2, -2, 1, -1].forEach((d, i) => {
  const a = 62 + ((i * 5) % 9);
  earItems.push({ id: `hl${i}`, name: d > 0 ? "Higher" : "Lower", tags: ["hl"], data: { notes: [a, a + d], small: Math.abs(d) <= 3 } });
});
// Major or minor chords on every white key.
[60, 62, 64, 65, 67, 69, 71].forEach((root) => {
  earItems.push({ id: `maj${root}`, name: "Major", tags: ["chord"], data: { chord: [root, root + 4, root + 7] } });
  earItems.push({ id: `min${root}`, name: "Minor", tags: ["chord"], data: { chord: [root, root + 3, root + 7] } });
});
for (const [name, gap, tip] of INTERVALS) {
  for (const r of ROOTS) earItems.push({ id: `iv${gap}-${r}`, name, tags: ["interval"], data: { notes: [r, r + gap], tip } });
}

const earDeck: Deck = {
  id: "ear",
  subject: SUBJECT,
  title: "Ear Training",
  blurb: "Listen, then answer. Is the second note higher or lower? Is the chord major or minor? How big is the jump?",
  noun: "sounds",
  items: earItems,
  variants: [],
  options: [],
  createBoard: () => {
    throw new Error("Ear Training uses its own screen");
  },
  screen: (root, deck) =>
    renderChoice(root, deck, {
      rounds: [
        { id: "hl", label: "Higher or Lower?", starter: true, filter: (i) => i.tags.includes("hl"), count: 10, note: "Two notes play. Is the second one higher or lower?" },
        { id: "chord", label: "Major or Minor?", filter: (i) => i.tags.includes("chord"), count: 10, note: "A chord plays. Major usually sounds bright and happy, minor darker or sadder." },
        { id: "interval", label: "Intervals", filter: (i) => i.tags.includes("interval"), count: 10, note: "Two notes play, one after the other, then together. How far apart are they?" },
      ],
      question: (i) =>
        i.tags.includes("hl") ? "Is the second note higher or lower?" : i.tags.includes("chord") ? "Is this chord major or minor?" : "How far apart are these two notes?",
      options: (i) => (i.tags.includes("hl") ? ["Higher", "Lower"] : i.tags.includes("chord") ? ["Major", "Minor"] : INTERVALS.map(([n]) => n)),
      shuffleOptions: false,
      explain: (i) => i.data!.tip as string | undefined,
      play: (i) => {
        if (i.data!.chord) {
          const c = i.data!.chord as number[];
          playSequence(c, 0.35, 0.6);
          playChord(c, 1.8, 1.2);
        } else {
          const [a, b] = i.data!.notes as number[];
          playSequence([a, b], 0.7, 0.8);
          if (i.tags.includes("interval")) playChord([a, b], 1.4, 1.6);
        }
      },
    }),
};
export { earDeck };
