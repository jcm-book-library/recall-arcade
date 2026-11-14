// MYTHOLOGY HUB: the screen for the `myths` card on the home page.
// Four culture tabs (Greek, Roman, Egyptian, Norse). Each has a ladder, easiest first:
//   1 Meet the gods (study cards, here)   2 Who's who (#mythwho)   3 Symbols and sacred animals (#mythsymbols)
//   4 Type the name (the typed game, #myths/type/<round>)
// then a row of special challenges, and a small strip for the other typed rounds (Celtic, Inca, Dreaming).
// Addresses: "#myths" is the hub; "#myths/type/greek" plays the typed game at that round;
// "#mythwho/greek" opens a choice game at a round (see ui/choice.ts).
import type { Deck } from "../engine/types";
import { bestFor, gamesFor, loadPrefs, savePrefs } from "../engine/storage";
import { resolveLevels, LEVELS } from "../engine/levels";
import type { Level } from "../engine/types";
import { loadPicturesFor, type Picture } from "../data/pictures";
import { mythDeck } from "../decks/text-decks";
import { CULTURES, type Culture } from "../decks/myth-data";
import { GODS, GOD_BY_ID, type God } from "../decks/mythology";
import { renderPlay } from "./play";
import { h } from "./dom";
import { quizHeader, topicTabs, quizRow, quizRows, sectionLabel, challengeCards, chips, levelStatesFor, subjectClass, type LevelStates } from "./quiz-shell";
import "./mythology.css";

const TAB_KEY = "myth-hub:tab";
const MET_KEY = "myth-hub:met";

/** The typed round to open for each culture (Roman asks for the Roman names). */
const TYPED: Record<Culture, string> = { greek: "greek", roman: "pairs", egypt: "egypt", norse: "norse" };

const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  },
};

const metSet = (): string[] => {
  try {
    return JSON.parse(store.get(MET_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
};

const roundDone = (deck: string, round: string) => !!bestFor(deck, round);
const anyGame = (deck: string) => gamesFor(deck).length > 0;

/** A row or card on the hub: where it goes, and (for the typed game) which levels it has. */
interface Thing {
  key: string;
  name: string;
  desc: string;
  href: string;
  /** For rounds of the typed game: the round id, so Easy and Medium can be picked and ticks shown. */
  typed?: string;
  /** Other games: the deck and round whose saved score gives the tick. */
  score?: { deck: string; round: string };
  /** Any game saved under this deck gives the tick. */
  anyGame?: string;
}

function specials(c: Culture): Thing[] {
  const heads: Thing = { key: "heads", name: "Animal Heads", desc: "Which Egyptian god has the head of a jackal, an ibis or a ram?", href: "#mythsymbols/heads", score: { deck: "mythsymbols", round: "heads" } };
  const days: Thing = { key: "days", name: "Days of the Week", desc: "Tuesday to Friday are named after Norse gods. Saturday is Roman.", href: "#mythsymbols/days", score: { deck: "mythsymbols", round: "days" } };
  if (c === "greek" || c === "roman")
    return [
      { key: "pairstarter", name: "Same Job, Two Names", desc: "See the Greek god, then type the Roman one.", href: "#myths/type/pairstarter", typed: "pairstarter" },
      { key: "mythpairs", name: "Greek & Roman Pairs", desc: "A memory game. Flip cards to match each Greek god with the Roman god.", href: "#mythpairs", anyGame: "mythpairs" },
    ];
  if (c === "egypt")
    return [heads, { key: "afterlife", name: "The Journey to the Afterlife", desc: "Put the steps in order, from mummification to the Field of Reeds.", href: "#afterlife", anyGame: "afterlife" }];
  return [{ key: "realms", name: "The Nine Realms", desc: "Label Yggdrasil, the world tree, with its nine realms.", href: "#realms", anyGame: "realms" }, days];
}

function steps(c: Culture): Thing[] {
  return [
    { key: "who", name: "Who's Who", desc: "Read what a god rules, then pick their name from four.", href: `#mythwho/${c}`, score: { deck: "mythwho", round: c } },
    { key: "symbols", name: "Symbols and Sacred Animals", desc: "An owl, a thunderbolt, a raven. Which god does it belong to?", href: `#mythsymbols/${c}`, score: { deck: "mythsymbols", round: c } },
    { key: "type", name: "Type the Name", desc: c === "roman" ? "See the Greek god and type the Roman name." : "Read a clue and type the name. No choices this time.", href: `#myths/type/${TYPED[c]}`, typed: TYPED[c] },
  ];
}

const MORE: { round: string; label: string }[] = [
  { round: "celtic", label: "Celtic" },
  { round: "inca", label: "Inca" },
  { round: "dreaming", label: "Aboriginal Dreaming" },
];

/** The levels the typed game offers (Easy studies first; Hard only if it has something to take away). */
const typedLevels = (): Level[] => {
  const r = resolveLevels(mythDeck, false);
  return LEVELS.filter((l) => r[l]);
};

export function renderMythology(root: HTMLElement, deck: Deck): () => void {
  const parts = location.hash.replace(/^#/, "").split("/");
  if (parts[1] === "type") return renderTyped(root, parts[2]);

  let culture: Culture = CULTURES.some((c) => c.id === store.get(TAB_KEY)) ? (store.get(TAB_KEY) as Culture) : "greek";
  let showCards = false;
  let alive = true;
  /** The level picked on each row of the typed game (kept in the same preference the typed screen reads). */
  const picked: Record<string, Level> = {};
  for (const [id, l] of Object.entries(loadPrefs(mythDeck.id).levels ?? {})) if (LEVELS.includes(l as Level)) picked[id] = l as Level;

  const page = h("div", { class: "mh-page" });

  /** The saved-score ticks for a thing, and the levels it offers (Medium alone, except the typed game). */
  function statesOf(t: Thing): LevelStates {
    if (t.typed) return levelStatesFor(mythDeck.id, t.typed, typedLevels());
    const done = t.score ? roundDone(t.score.deck, t.score.round) : anyGame(t.anyGame!);
    return { easy: "none", medium: done ? "done" : "available", hard: "none" };
  }
  const levelOf = (t: Thing): Level => (t.typed && picked[t.typed] && typedLevels().includes(picked[t.typed]) ? picked[t.typed] : "medium");

  function go(t: Thing) {
    if (t.typed) {
      // The typed game remembers the level picked on a round's row; set it, then open the round.
      const prefs = loadPrefs(mythDeck.id);
      savePrefs(mythDeck.id, { ...prefs, variant: t.typed, options: {}, levels: { ...(prefs.levels ?? {}), [t.typed]: levelOf(t) } });
    }
    location.hash = t.href;
  }

  const rowOf = (t: Thing, n: number) => {
    const states = statesOf(t);
    return quizRow({
      badge: states.medium === "done" || states.easy === "done" ? "done" : n === 1 ? "star" : n,
      name: t.name,
      desc: t.desc,
      levels: states,
      selected: levelOf(t),
      onLevel: t.typed
        ? (l) => {
            picked[t.typed!] = l;
            draw();
          }
        : undefined,
      onStart: () => go(t),
    });
  };

  function draw() {
    const info = CULTURES.find((c) => c.id === culture)!;
    const met = metSet().includes(culture);
    const cardsHost = h("div", { class: "mh-cards-host" });
    const learn = quizRow({
      badge: "learn",
      name: "Meet the Gods",
      desc: `Learn it first: study the ${info.label} gods, with their pictures, jobs, symbols and animals.`,
      levels: { easy: met ? "done" : "available", medium: "none", hard: "none" },
      selected: "easy",
      onStart: () => {
        showCards = !showCards;
        if (showCards && !metSet().includes(culture)) store.set(MET_KEY, JSON.stringify([...metSet(), culture]));
        draw();
      },
      startLabel: showCards ? "Hide" : "Look ▸",
    });
    const cards = challengeCards(
      specials(culture).map((t) => {
        const states = statesOf(t);
        return {
          name: t.name,
          done: states.medium === "done" || states.easy === "done",
          levels: states,
          selected: levelOf(t),
          onLevel: t.typed
            ? (l: Level) => {
                picked[t.typed!] = l;
                draw();
              }
            : undefined,
          desc: t.desc,
          onStart: () => go(t),
        };
      }),
    );
    page.replaceChildren(
      topicTabs({
        tabs: CULTURES.map((c) => ({ id: c.id, label: c.label })),
        active: culture,
        note: info.blurb,
        onPick: (id) => {
          culture = id as Culture;
          showCards = false;
          store.set(TAB_KEY, culture);
          draw();
        },
      }),
      quizRows(learn, ...steps(culture).map((t, i) => rowOf(t, i + 1))),
      ...(showCards ? [cardsHost] : []),
      sectionLabel("Special Challenges"),
      cards,
      chips(
        MORE.map((m) => ({ label: `${roundDone("myths", m.round) ? "✓ " : ""}${m.label}`, href: `#myths/type/${m.round}` })),
        "More Cultures",
      )!,
    );
    if (showCards) drawCards(cardsHost, culture);
  }

function drawCards(host: HTMLElement, c: Culture) {
    const gods = GODS[c];
    const grid = h("div", { class: "mh-cards" });
    const slots = new Map<string, HTMLElement>();
    for (const g of gods) {
      const pic = h("span", { class: "mh-pic pending" });
      slots.set(g.id, pic);
      grid.append(card(g, pic));
    }
    host.replaceChildren(h("h2", { class: "mh-sub" }, `Meet the ${CULTURES.find((x) => x.id === c)!.label} gods`), grid);
    const titles: Record<string, string> = {};
    for (const g of gods) titles[g.id] = g.wiki || g.name;
    loadPicturesFor(`myth:${c}`, titles)
      .then((pics) => {
        if (!alive || !host.isConnected) return;
        for (const g of gods) {
          const pic = pics.get(g.id);
          const slot = slots.get(g.id)!;
          if (pic) showPicture(slot, pic, g);
          else dropPicture(slot);
        }
      })
      .catch(() => {
        if (!alive || !host.isConnected) return;
        for (const slot of slots.values()) dropPicture(slot);
        host.append(h("p", { class: "note" }, "Couldn't reach Wikipedia for the pictures. The cards still work."));
      });
  }

  root.replaceChildren(
    h(
      "main",
      { class: `play mh quiz ${subjectClass(deck.subject)}` },
      quizHeader({
        deck,
        howItWorks: "Pick a culture. Climb the steps from looking, to choosing, to typing.",
        rules: deck.tip ? [deck.tip] : [],
      }),
      page,
      h("p", { class: "muted mh-credit" }, "Pictures come from Wikipedia and are freely licensed. The photographer is credited under each one."),
    ),
  );
  draw();
  return () => {
    alive = false;
  };
}

function card(g: God, pic: HTMLElement): HTMLElement {
  const other = g.counterpart ? GOD_BY_ID.get(g.counterpart) : undefined;
  const fact = (k: string, v: string) => (v ? h("div", { class: "mh-fact" }, h("dt", {}, k), h("dd", {}, v)) : null);
  return h(
    "article",
    { class: "mh-card" },
    h("div", { class: "mh-pic-wrap" }, pic),
    h(
      "div",
      { class: "mh-card-text" },
      h("h3", {}, g.name),
      h("p", { class: "mh-rules" }, cap(g.rules)),
      h(
        "dl",
        { class: "mh-facts" },
        fact("Symbol", g.symbol),
        fact("Sacred animal", g.animal),
        other ? fact(other.culture === "roman" ? "Roman name" : "Greek name", other.name) : null,
      ),
    ),
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function dropPicture(slot: HTMLElement) {
  slot.closest(".mh-card")?.classList.add("no-pic");
  slot.closest(".mh-pic-wrap")?.remove();
}

function showPicture(slot: HTMLElement, pic: Picture, g: God) {
  slot.classList.remove("pending");
  const img = h("img", { src: pic.thumb, alt: g.name, loading: "lazy" }) as HTMLImageElement;
  img.onerror = () => dropPicture(slot);
  const credit = h("a", { class: "credit mh-pic-credit", href: pic.page, target: "_blank", rel: "noopener", title: `Photo: ${pic.artist} · ${pic.license}` }, `Photo: ${pic.artist} · ${pic.license}`);
  slot.append(img);
  slot.closest(".mh-pic-wrap")?.append(credit);
}

/** The typed game, opened at the round chosen on the hub. Its back link returns to the hub. */
function renderTyped(root: HTMLElement, round: string | undefined): () => void {
  if (round && mythDeck.variants.some((v) => v.id === round)) savePrefs(mythDeck.id, { ...loadPrefs(mythDeck.id), variant: round, options: {} });
  const typed: Deck = { ...mythDeck, screen: undefined, back: { href: "#myths", label: "◂ Mythology" } };
  const stop = renderPlay(root, typed);
  return () => stop?.();
}

/** The Mythology card on the home page: the same game and saved scores, but it opens the hub. */
export const mythHubDeck: Deck = { ...mythDeck, screen: renderMythology };
