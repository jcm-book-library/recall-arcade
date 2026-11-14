// THE SHARED QUIZ PAGE (docs/quiz-standard.md; the look is docs/quiz-standard-mockup.html).
//
// Small building blocks, so every quiz page has the same header, the same rows, the same colours.
// Each function returns a plain element; build a page by putting them inside `quizPage(...)`:
//
//   quizPage(deck, quizHeader({ deck, howItWorks: "..." }), topicTabs({...}), quizRows(quizRow({...}), ...), chips([...]))
//
// The styles are in quiz-shell.css. Class names all start with "q" so they can't clash with the rest of the site.

import type { Deck, Level } from "../engine/types";
import { LEVELS, LEVEL_LABEL, doneLevels } from "../engine/levels";
import { h } from "./dom";
import "./quiz-shell.css";

// ---------- subject colour (rule 2) ----------

const SUBJECT_CLASS: Record<string, string> = {
  Geography: "subj-geo",
  Science: "subj-sci",
  History: "subj-his",
  "Travel & Transport": "subj-tra",
  "Nature & Animals": "subj-nat",
  Music: "subj-mus",
  Sport: "subj-spo",
  Entertainment: "subj-ent",
  "The Arcade": "subj-arc",
};

/**
 * The class that gives an element the subject's colour tokens (--s-bg, --s-ink, --s-strong, --s-on-strong).
 * Light mode: a pale tint with deep text. Dark mode: the reverse. Put it on the element that holds the page
 * (quizPage does), and use the tokens inside. Don't define the tokens on :root: they must sit on the same
 * element as the subject class, or the colours don't resolve.
 */
export function subjectClass(subject?: string): string {
  return `subj ${SUBJECT_CLASS[subject ?? ""] ?? "subj-arc"}`;
}

/** The pixel font's "&" looks like a "$", so the small subject label spells it out. */
export const subjectLabel = (subject?: string) => (subject ?? "The Arcade").replace(" & ", " and ");

// ---------- Title Case (rule 3) ----------

const SMALL_WORDS = new Set(["a", "an", "the", "and", "but", "or", "of", "in", "on", "at", "to", "by", "for", "with", "from"]);
/** Titles that need a hand (the whole title, as written in the data, mapped to how it should read). */
const TITLE_EXCEPTIONS: Record<string, string> = {};

/**
 * Title Case: every word starts with a capital, except small words (a, an, the, and, but, or, of, in, on, at,
 * to, by, for, with, from) which stay lower case unless they come first, last or follow a colon.
 * Words that already have a capital inside them (BC, NATO, AFL, iPhone), numbers like "1st", and symbols
 * like "&" are left alone, and so are words already capitalised ("Who's Who"). Possessives are fine: "Who's".
 */
export function titleCase(text: string): string {
  if (TITLE_EXCEPTIONS[text]) return TITLE_EXCEPTIONS[text];
  let atStart = true; // first word, or the first after a colon
  const parts = text.split(/(\s+)/);
  // The last real word (a number counts, but not a "(33)" count) also keeps its capital: "Famous For", "All the Way In (33)".
  const lastWord = parts.map((t) => /[A-Za-z0-9]/.test(t) && !/^\(\d+\)$/.test(t)).lastIndexOf(true);
  return parts
    .map((tok, idx) => {
      if (!tok || /^\s+$/.test(tok)) return tok;
      const first = atStart || idx === lastWord;
      atStart = /:$/.test(tok);
      const m = tok.match(/[A-Za-z]/);
      if (!m || /^[^A-Za-z]*\d/.test(tok)) return tok; // symbols and numbers
      const at = m.index!;
      const word = tok.slice(at);
      if (/[A-Z]/.test(word.slice(1))) return tok; // BC, NATO, iPhone
      const bare = word.toLowerCase().replace(/[^a-z]/g, "");
      if (!first && SMALL_WORDS.has(bare) && word !== word.toUpperCase()) return tok.slice(0, at) + word.toLowerCase();
      return tok.slice(0, at) + word[0].toUpperCase() + word.slice(1);
    })
    .join("");
}

// ---------- where "◂ Back" goes (rule 1) ----------
// Remembered until the tab closes: did the player arrive from the island or from the list?
// main.ts calls noteArrival() on every address change; quizBack() reads it.

const ORIGIN_KEY = "learning-arcade:quiz-origin";

/** Called by main.ts with the page we left and the page we're on (both are the first part of the address). */
export function noteArrival(from: string | null, _to: string) {
  const origin = from === "" || from === "island" ? "island" : from === "list" ? "list" : null;
  if (!origin) return; // came from another quiz (a Mythology page, a "related" link): keep what we had
  try {
    sessionStorage.setItem(ORIGIN_KEY, origin);
  } catch {
    /* storage unavailable: Back goes to the list */
  }
}

export function quizOrigin(): "island" | "list" {
  try {
    return sessionStorage.getItem(ORIGIN_KEY) === "island" ? "island" : "list";
  } catch {
    return "list";
  }
}

/** Where ◂ Back goes: a quiz that is opened from another quiz page (deck.back) goes there, else to where the player came from. */
export function quizBack(deck: Deck, override?: { href: string; label?: string }): { href: string; title: string } {
  const b = override ?? deck.back;
  if (b) return { href: b.href, title: ("label" in b && b.label) || "Back" };
  return quizOrigin() === "island"
    ? { href: "#island", title: "Back to the island" }
    : { href: "#list", title: "Back to the list of quizzes" };
}

// ---------- the page ----------

/** The container for a whole quiz page. It carries the subject colour for everything inside it. */
export function quizPage(deck: Deck, ...children: (Node | null | false | undefined)[]): HTMLElement {
  return h("div", { class: `quiz ${subjectClass(deck.subject)}` }, ...children);
}

export interface QuizHeaderOptions {
  deck: Deck;
  /** The one line under the title: how the quiz works. */
  howItWorks: string;
  /** Extra paragraphs for the ⓘ Rules pop-over. The deck's tip and the level notes are what most pages pass. */
  rules?: (string | Node)[];
  /** The ⏱ time limit. Leave out for quizzes with no clock. */
  time?: { value: number; choices: number[]; onChange: (minutes: number) => void };
  /** Where ◂ Back goes, if it isn't "wherever you came from". */
  back?: { href: string; label?: string };
  /** The title if it shouldn't be the deck's. */
  title?: string;
}

const timeText = (m: number) => (m ? `${m} min` : "No limit");

/** The ⏱ time limit: a small select inside a label. */
function timeControl(time: NonNullable<QuizHeaderOptions["time"]>): HTMLElement {
  const choices = [...new Set([...time.choices, time.value])].sort((a, b) => (a || 1e9) - (b || 1e9));
  const select = h(
    "select",
    {
      "aria-label": "Time limit",
      onchange: (e) => time.onChange(Number((e.target as HTMLSelectElement).value)),
    },
    ...choices.map((m) => {
      const opt = h("option", { value: String(m) }, timeText(m));
      opt.selected = m === time.value;
      return opt;
    }),
  );
  return h("label", { class: "qtool qtime" }, h("span", { "aria-hidden": "true" }, "⏱ "), select);
}

/** Shows, changes or removes the ⏱ time limit on a header that is already on the page (null removes it). */
export function setHeaderTime(header: HTMLElement, time: QuizHeaderOptions["time"] | null) {
  const tools = header.querySelector(".qtools");
  if (!tools) return;
  tools.querySelector(".qtime")?.remove();
  if (time) tools.append(timeControl(time));
}

/** Rule 1: ◂ Back and ⌂ Island on the left, subject and title in the middle, ⓘ Rules and ⏱ time on the right. */
export function quizHeader(o: QuizHeaderOptions): HTMLElement {
  const back = quizBack(o.deck, o.back);
  const head = h("header", { class: "qhead" });

  // ⓘ Rules: a small pop-over that closes with Esc, a click outside, or its Close button.
  const pop = h("div", { class: "qpop", role: "dialog", "aria-label": "Rules", id: "qpop" });
  pop.hidden = true;
  const rulesBtn = h("button", { type: "button", class: "qtool", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-controls": "qpop" }, "ⓘ Rules");
  const closePop = (refocus = false) => {
    pop.hidden = true;
    rulesBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("pointerdown", onOutside, true);
    if (refocus) rulesBtn.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closePop(true);
    }
  };
  const onOutside = (e: Event) => {
    const t = e.target as Node;
    if (!pop.contains(t) && !rulesBtn.contains(t)) closePop();
  };
  const paragraphs = [o.howItWorks, ...(o.rules ?? [])];
  pop.append(
    h("p", { class: "qpop-title" }, "How it works"),
    ...paragraphs.map((p) => (typeof p === "string" ? h("p", {}, p) : p)),
    h("button", { type: "button", class: "qtool qpop-close", onclick: () => closePop(true) }, "Close"),
  );
  rulesBtn.addEventListener("click", () => {
    if (!pop.hidden) return closePop();
    pop.hidden = false;
    rulesBtn.setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside, true);
    pop.querySelector<HTMLElement>(".qpop-close")?.focus({ preventScroll: true });
  });

  const tools = h("div", { class: "qtools" }, rulesBtn);
  if (o.time) tools.append(timeControl(o.time));

  head.append(
    // The two side columns are equal widths (see the CSS), which keeps the title and the line under it exactly centred.
    h(
      "nav",
      { class: "qnav", "aria-label": "Quiz navigation" },
      h("a", { class: "qnavbtn", href: back.href, title: back.title }, "◂ Back"),
      h("a", { class: "qnavbtn", href: "#island", title: "Back to the island" }, "⌂ Island"),
    ),
    h("h1", { class: "qtitle" }, h("small", {}, subjectLabel(o.deck.subject)), o.title ?? titleCase(o.deck.title)),
    tools,
    h("p", { class: "qhow" }, o.howItWorks),
    pop,
  );
  return head;
}

/** Turns the time limit off while a round is running (it can only be changed on the setup screen). */
export function lockTime(header: HTMLElement, locked: boolean) {
  const select = header.querySelector("select");
  if (select) select.disabled = locked;
}

// ---------- topics (rule 4) ----------

/** A row of equal-width tabs with one line about the chosen topic underneath. */
export function topicTabs(o: { tabs: { id: string; label: string }[]; active: string; onPick: (id: string) => void; note?: string }): HTMLElement {
  return h(
    "div",
    { class: "qtopics" },
    h(
      "div",
      { class: "qtabs", role: "group", "aria-label": "Topics", style: `--n:${o.tabs.length}` },
      ...o.tabs.map((t) =>
        h(
          "button",
          { type: "button", class: t.id === o.active ? "qtab on" : "qtab", "aria-pressed": String(t.id === o.active), onclick: () => o.onPick(t.id) },
          titleCase(t.label),
        ),
      ),
    ),
    o.note ? h("p", { class: "qtabnote" }, o.note) : null,
  );
}

// ---------- type or click (rule 8) ----------

/** A clear two-way switch, only for quizzes that can be played both ways. */
export function typeClickSwitch(o: {
  value: "type" | "click";
  onChange: (v: "type" | "click") => void;
  typeLabel?: string;
  clickLabel?: string;
}): HTMLElement {
  const choice = (v: "type" | "click", label: string) =>
    h("button", { type: "button", role: "radio", class: o.value === v ? "on" : "", "aria-checked": String(o.value === v), onclick: () => o.value !== v && o.onChange(v) }, label);
  return h(
    "div",
    { class: "qswitchrow" },
    h("div", { class: "qseg", role: "radiogroup", "aria-label": "How to play" }, choice("type", o.typeLabel ?? "⌨ Type the name"), choice("click", o.clickLabel ?? "🖱 Click the answer")),
  );
}

/**
 * A centred segmented control for choosing one of a few things on the setup page (a range of years: Since 2000,
 * All years). Equal in look to the type/click switch; wraps onto two lines on a phone. `label` is for screen readers.
 */
export function segmented(o: { label: string; items: { id: string; text: string }[]; value: string; onPick: (id: string) => void }): HTMLElement {
  return h(
    "div",
    { class: "qswitchrow" },
    h(
      "div",
      { class: "qseg wrap", role: "radiogroup", "aria-label": o.label },
      ...o.items.map((it) =>
        h("button", { type: "button", role: "radio", class: it.id === o.value ? "on" : "", "aria-checked": String(it.id === o.value), onclick: () => it.id !== o.value && o.onPick(it.id) }, it.text),
      ),
    ),
  );
}

// ---------- options (tidy toggles) ----------

export interface QuizToggle {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  /** Switched on or off by the level, so it can't be changed here. */
  locked?: boolean;
  onChange: (on: boolean) => void;
}

/** A centred row of pill toggles, in the subject colour when on. */
export function optionToggles(toggles: QuizToggle[]): HTMLElement | null {
  if (!toggles.length) return null;
  return h(
    "div",
    { class: "qopts", role: "group", "aria-label": "Options" },
    ...toggles.map((t) => {
      const box = h("input", { type: "checkbox", id: `qopt-${t.id}`, onchange: (e) => t.onChange((e.target as HTMLInputElement).checked) });
      box.checked = t.checked;
      box.disabled = !!t.locked;
      return h("label", { class: t.locked ? "qopt locked" : "qopt", for: `qopt-${t.id}`, title: t.locked ? `${t.hint ?? t.label} (set by the level)` : t.hint ?? "" }, box, h("span", {}, t.label));
    }),
  );
}

// ---------- rows (rule 5) and levels (rule 6) ----------

/** "available" can be picked, "none" isn't built (dashed, can't be picked), "done" can be picked and has a ✓. */
export type LevelState = "available" | "none" | "done";
export type LevelStates = Record<Level, LevelState>;

/** Easy / Medium / Hard: three equal buttons. */
export function levelPicker(states: LevelStates, selected: Level | null, onLevel?: (l: Level) => void): HTMLElement {
  return h(
    "div",
    { class: "qdiff", role: "group", "aria-label": "Level" },
    ...LEVELS.map((l) => {
      const s = states[l];
      const cls = ["qd", l === selected ? "sel" : "", s === "done" ? "got" : "", s === "none" ? "none" : ""].filter(Boolean).join(" ");
      const b = h(
        "button",
        {
          type: "button",
          class: cls,
          "aria-pressed": String(l === selected),
          title: s === "none" ? "Not built yet" : s === "done" ? `${LEVEL_LABEL[l]}: done` : LEVEL_LABEL[l],
          onclick: () => onLevel?.(l),
        },
        LEVEL_LABEL[l],
      );
      if (s === "none") b.disabled = true;
      return b;
    }),
  );
}

export interface QuizRowOptions {
  /** A number, ★ (the recommended start), ✓ (all done) or 📖 (learn it first: also makes the row dashed). */
  badge: number | "star" | "done" | "learn";
  name: string;
  desc?: string | Node;
  levels: LevelStates;
  /** The level that is picked on this row, if any. */
  selected: Level | null;
  onLevel?: (l: Level) => void;
  onStart: () => void;
  startLabel?: string;
  /** The row whose board is showing (gets a coloured outline). */
  current?: boolean;
  /** Clicking the name or description picks this row. */
  onPick?: () => void;
}

const BADGE_TEXT = { star: "★", done: "✓", learn: "📖" } as const;

/** One playable thing: badge, name and description, the three levels, then Start. */
export function quizRow(o: QuizRowOptions): HTMLElement {
  const badge = typeof o.badge === "number" ? String(o.badge) : BADGE_TEXT[o.badge];
  const text = h("div", { class: "qtext" }, h("p", { class: "qname" }, titleCase(o.name)), o.desc ? h("p", { class: "qdesc" }, o.desc) : null);
  if (o.onPick) text.addEventListener("click", o.onPick);
  return h(
    "div",
    { class: ["qrow", o.badge === "learn" ? "learn" : "", o.current ? "current" : ""].filter(Boolean).join(" ") },
    h("div", { class: `qbadge ${typeof o.badge === "string" ? o.badge : ""}`, "aria-hidden": "true" }, badge),
    text,
    levelPicker(o.levels, o.selected, o.onLevel),
    h("button", { type: "button", class: "qgo", onclick: o.onStart }, o.startLabel ?? "Start ▸"),
  );
}

/** The stack of rows. Pass rows and sectionLabel()s. */
export function quizRows(...children: (Node | null | false | undefined)[]): HTMLElement {
  return h("div", { class: "qrows" }, ...children);
}

/** A small heading between groups of rows (from a variant's `heading`) or over the challenge cards. */
export function sectionLabel(text: string): HTMLElement {
  // (The pixel font's "&" looks like a "$", so spell it out.)
  return h("p", { class: "qsection" }, titleCase(text).replace(" & ", " and "));
}

// ---------- special challenges (rule 7) ----------

export interface ChallengeCard {
  name: string;
  desc?: string;
  /** Shows a ✓ before the name. */
  done?: boolean;
  levels: LevelStates;
  selected: Level | null;
  onLevel?: (l: Level) => void;
  onStart: () => void;
  startLabel?: string;
}

/** Two cards side by side (one column on a phone). */
export function challengeCards(cards: ChallengeCard[]): HTMLElement {
  return h(
    "div",
    { class: "qcards" },
    ...cards.map((c) =>
      h(
        "div",
        { class: "qcard" },
        h("p", { class: "qname" }, `${c.done ? "✓ " : ""}${titleCase(c.name)}`),
        c.desc ? h("p", { class: "qdesc" }, c.desc) : null,
        h("div", { class: "qbottom" }, levelPicker(c.levels, c.selected, c.onLevel), h("button", { type: "button", class: "qgo", onclick: c.onStart }, c.startLabel ?? "Start ▸")),
      ),
    ),
  );
}

// ---------- extras (rule 7) ----------

/** Centred pill links at the bottom: "More cultures", related quizzes. Give each an href or an onClick. */
export function chips(items: { label: string; href?: string; onClick?: () => void }[], heading?: string): HTMLElement | null {
  if (!items.length) return null;
  return h(
    "div",
    { class: "qextras" },
    heading ? sectionLabel(heading) : null,
    h(
      "div",
      { class: "qchips" },
      ...items.map((c) =>
        c.href ? h("a", { class: "qchip", href: c.href }, c.label) : h("button", { type: "button", class: "qchip", onclick: () => c.onClick?.() }, c.label),
      ),
    ),
  );
}

// ---------- a list of rounds, for the simple quiz types ----------

/** Which levels show as pickable for a round, with a ✓ on the ones already done. Medium alone unless told otherwise. */
export function levelStatesFor(deckId: string, roundId: string, available: Level[] = ["medium"]): LevelStates {
  const done = doneLevels(deckId, roundId);
  return Object.fromEntries(LEVELS.map((l) => [l, !available.includes(l) ? "none" : done.has(l) ? "done" : "available"])) as LevelStates;
}

export interface RoundRowsOptions {
  deckId: string;
  rounds: { id: string; label: string; starter?: boolean; desc: string }[];
  /** The round that is picked (gets the coloured outline). */
  current: string;
  /** Levels this quiz offers. Multiple choice and pairs only have Medium; hangman adds Hard. */
  available?: Level[];
  levelOf: (roundId: string) => Level;
  onLevel: (roundId: string, level: Level) => void;
  onPick: (roundId: string) => void;
  onStart: (roundId: string, level: Level) => void;
}

/** The rows for a quiz whose rounds are a plain list (multiple choice, pairs, hangman). ★ marks the starter. */
export function roundRows(o: RoundRowsOptions): HTMLElement {
  const avail = o.available ?? ["medium"];
  return quizRows(
    ...o.rounds.map((r, i) => {
      const states = levelStatesFor(o.deckId, r.id, avail);
      const lv = avail.includes(o.levelOf(r.id)) ? o.levelOf(r.id) : "medium";
      const finished = LEVELS.filter((l) => states[l] !== "none").every((l) => states[l] === "done");
      return quizRow({
        badge: finished ? "done" : r.starter ? "star" : i + 1,
        // Some rounds are written "1 · Kingdoms": the badge already numbers the rows.
        name: r.label.replace(/^\d+\s*·\s*/, ""),
        desc: r.desc,
        levels: states,
        selected: lv,
        current: r.id === o.current,
        onPick: () => o.onPick(r.id),
        onLevel: (l) => o.onLevel(r.id, l),
        onStart: () => o.onStart(r.id, lv),
      });
    }),
  );
}
