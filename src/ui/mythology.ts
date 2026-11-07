// MYTHOLOGY HUB: the screen for the `myths` card on the home page.
// Four culture tabs (Greek, Roman, Egyptian, Norse). Each has a ladder, easiest first:
//   1 Meet the gods (study cards, here)   2 Who's who (#mythwho)   3 Symbols and sacred animals (#mythsymbols)
//   4 Type the name (the typed game, #myths/type/<round>)
// then a row of special challenges, and a small strip for the other typed rounds (Celtic, Inca, Dreaming).
// Addresses: "#myths" is the hub; "#myths/type/greek" plays the typed game at that round;
// "#mythwho/greek" opens a choice game at a round (see ui/choice.ts).
import type { Deck } from "../engine/types";
import { bestFor, gamesFor, savePrefs } from "../engine/storage";
import { loadPicturesFor, type Picture } from "../data/pictures";
import { mythDeck } from "../decks/text-decks";
import { CULTURES, type Culture } from "../decks/myth-data";
import { GODS, GOD_BY_ID, type God } from "../decks/mythology";
import { renderPlay } from "./play";
import { h } from "./dom";
import "./mythology.css";

const TAB_KEY = "myth-hub:tab";
const MET_KEY = "myth-hub:met";

/** The typed round to open for each culture (Roman asks for the Roman names). */
const TYPED: Record<Culture, string> = { greek: "greek", roman: "pairs", egypt: "egypt", norse: "norse" };

interface Step {
  title: string;
  text: string;
  href?: string;
  done: boolean;
  /** For "Meet the gods", which opens the cards here instead of going to a game. */
  cards?: boolean;
}

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

function specials(c: Culture): Step[] {
  const heads: Step = { title: "Animal heads", text: "Which Egyptian god has the head of a jackal, an ibis or a ram?", href: "#mythsymbols/heads", done: roundDone("mythsymbols", "heads") };
  const days: Step = { title: "Days of the week", text: "Tuesday to Friday are named after Norse gods. Saturday is Roman.", href: "#mythsymbols/days", done: roundDone("mythsymbols", "days") };
  if (c === "greek" || c === "roman")
    return [
      { title: "Same job, two names", text: "See the Greek god, then type the Roman one.", href: "#myths/type/pairstarter", done: roundDone("myths", "pairstarter") },
      { title: "Greek & Roman Pairs", text: "A memory game. Flip cards to match each Greek god with the Roman god.", href: "#mythpairs", done: anyGame("mythpairs") },
    ];
  if (c === "egypt")
    return [heads, { title: "The journey to the afterlife", text: "Put the steps in order, from mummification to the Field of Reeds.", href: "#afterlife", done: anyGame("afterlife") }];
  return [{ title: "The Nine Realms", text: "Label Yggdrasil, the world tree, with its nine realms.", href: "#realms", done: anyGame("realms") }, days];
}

function steps(c: Culture): Step[] {
  const label = CULTURES.find((x) => x.id === c)!.label;
  return [
    { title: "Meet the gods", text: `Study the ${label} gods: their pictures, jobs, symbols and animals.`, cards: true, done: metSet().includes(c) },
    { title: "Who's who", text: "Read what a god rules, then pick their name from four.", href: `#mythwho/${c}`, done: roundDone("mythwho", c) },
    { title: "Symbols and sacred animals", text: "An owl, a thunderbolt, a raven. Which god does it belong to?", href: `#mythsymbols/${c}`, done: roundDone("mythsymbols", c) },
    { title: "Type the name", text: c === "roman" ? "See the Greek god and type the Roman name." : "Read a clue and type the name. No choices this time.", href: `#myths/type/${TYPED[c]}`, done: roundDone("myths", TYPED[c]) },
  ];
}

const MORE: { round: string; label: string }[] = [
  { round: "celtic", label: "Celtic" },
  { round: "inca", label: "Inca" },
  { round: "dreaming", label: "Aboriginal Dreaming" },
];

export function renderMythology(root: HTMLElement, deck: Deck): () => void {
  const parts = location.hash.replace(/^#/, "").split("/");
  if (parts[1] === "type") return renderTyped(root, parts[2]);

  let culture: Culture = CULTURES.some((c) => c.id === store.get(TAB_KEY)) ? (store.get(TAB_KEY) as Culture) : "greek";
  let showCards = false;
  let alive = true;

  const tabs = h("div", { class: "mh-tabs", role: "tablist", "aria-label": "Culture" });
  const panel = h("div", { class: "mh-panel", role: "tabpanel" });
  const tabButtons = new Map<Culture, HTMLButtonElement>();

  for (const c of CULTURES) {
    const b = h(
      "button",
      {
        type: "button",
        class: "mh-tab",
        role: "tab",
        id: `mh-tab-${c.id}`,
        "aria-controls": "mh-panel",
        onclick: () => select(c.id),
        onkeydown: (e: Event) => {
          const k = (e as KeyboardEvent).key;
          const at = CULTURES.findIndex((x) => x.id === culture);
          const to = k === "ArrowRight" ? at + 1 : k === "ArrowLeft" ? at - 1 : k === "Home" ? 0 : k === "End" ? CULTURES.length - 1 : -1;
          if (to < 0) return;
          e.preventDefault();
          const next = CULTURES[(to + CULTURES.length) % CULTURES.length].id;
          select(next);
          tabButtons.get(next)!.focus();
        },
      },
      c.label,
    );
    tabButtons.set(c.id, b);
    tabs.append(b);
  }
  panel.id = "mh-panel";

  function select(c: Culture) {
    culture = c;
    showCards = false;
    store.set(TAB_KEY, c);
    draw();
  }

  function draw() {
    for (const [c, b] of tabButtons) {
      b.setAttribute("aria-selected", String(c === culture));
      b.tabIndex = c === culture ? 0 : -1;
    }
    panel.setAttribute("aria-labelledby", `mh-tab-${culture}`);
    const info = CULTURES.find((c) => c.id === culture)!;
    const cardsHost = h("div", { class: "mh-cards-host" });
    const ladder = h(
      "ol",
      { class: "mh-ladder" },
      ...steps(culture).map((s, n) => {
        const mark = h("span", { class: s.done ? "mh-num done" : "mh-num", "aria-hidden": "true" }, s.done ? "✓" : String(n + 1));
        const body = h("span", { class: "mh-step-body" }, h("strong", {}, s.title), h("span", { class: "mh-text" }, s.text), s.done ? h("span", { class: "mh-done" }, s.cards ? "Done" : "Played") : null);
        const go = s.cards
          ? h("button", { type: "button", class: "btn primary mh-go", "aria-expanded": String(showCards), onclick: () => {
              showCards = !showCards;
              if (showCards && !metSet().includes(culture)) store.set(MET_KEY, JSON.stringify([...metSet(), culture]));
              draw();
            } }, showCards ? "Hide" : "Look ▸")
          : h("a", { class: "btn primary mh-go", href: s.href! }, "Play ▸");
        return h("li", { class: s.done ? "mh-step done" : "mh-step" }, mark, body, go);
      }),
    );
    panel.replaceChildren(
      h("p", { class: "muted mh-blurb" }, info.blurb),
      ladder,
      ...(showCards ? [cardsHost] : []),
      h("h2", { class: "mh-sub" }, "Special challenges"),
      h(
        "ul",
        { class: "mh-specials" },
        ...specials(culture).map((s) =>
          h("li", {}, h("a", { class: s.done ? "mh-special done" : "mh-special", href: s.href! }, h("strong", {}, s.done ? `✓ ${s.title}` : s.title), h("span", { class: "mh-text" }, s.text))),
        ),
      ),
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
      { class: "play mh" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), h("h1", { class: "play-title" }, "Mythology")),
      h("p", { class: "muted mh-intro" }, "Pick a culture. Climb the steps from looking, to choosing, to typing."),
      tabs,
      panel,
      h(
        "section",
        { class: "mh-more", "aria-label": "More cultures" },
        h("h2", { class: "mh-sub" }, "More cultures"),
        h("div", { class: "mh-more-row" }, ...MORE.map((m) => h("a", { class: roundDone("myths", m.round) ? "chip mh-chip done" : "chip mh-chip", href: `#myths/type/${m.round}` }, `${roundDone("myths", m.round) ? "✓ " : ""}${m.label}`))),
        h("p", { class: "muted mh-tip" }, deck.tip ?? ""),
      ),
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
  if (round && mythDeck.variants.some((v) => v.id === round)) savePrefs(mythDeck.id, { variant: round, options: {} });
  const typed: Deck = { ...mythDeck, screen: undefined, back: { href: "#myths", label: "◂ Mythology" } };
  const stop = renderPlay(root, typed);
  return () => stop?.();
}

/** The Mythology card on the home page: the same game and saved scores, but it opens the hub. */
export const mythHubDeck: Deck = { ...mythDeck, screen: renderMythology };
