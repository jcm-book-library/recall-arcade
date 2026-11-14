// FILL THE LIST on a quiz page (wave 3b): the two rows ("Fill the List: Any Order" and "Fill the List: In Order"),
// the range switch, the level on each row, the ⏱ time limit and the saved score, for any quiz page that is not
// the Sport screen. (The Sport screen does the same thing itself in sport.ts.) The engine is ui/fill-list.ts.
//
// A quiz hands over a FillSource: its rounds, and for each round a build() that returns the rows, the champions
// (the answers), and a few words for the engine. Then the page does three things:
//
//   const fill = createFillSection({ deck, source, setup, game, redraw: renderSetup, header });
//   ... in its setup screen, after its own rows:   quizRows(...own), ...fill.nodes(own.length + 1)
//   ... when one of its own rows is picked:        fill.unpick()
//
// Scores are saved under NEW keys only: "<round>-listany" and "<round>-listorder", with "+easy" / "+hard" on the
// end for those levels (Medium keeps the plain key), exactly as the Sport screen does. Existing keys never change.
import type { Deck, Level } from "../engine/types";
import { LEVELS, levelSuffix } from "../engine/levels";
import { bestFor, recordGame } from "../engine/storage";
import { h } from "./dom";
import { runFillList, type FillResult } from "./fill-list";
import { defaultFillMinutes, FILL_TIME_CHOICES, type FillData } from "./sport-fill";
import { levelStatesFor, lockTime, quizRow, quizRows, sectionLabel, segmented, setHeaderTime } from "./quiz-shell";

export type FillMode = "listany" | "listorder";

/** What one round of a quiz becomes: the rows, the answers, and the words the engine uses. */
export interface FillBuild extends FillData {
  /** First column heading: "Rank", "Years", "Span". */
  keyHeading: string;
  /** What an answer is called: "film", "leader", "period", "event", "person". */
  whoWord: string;
  /** What is counted, singular and plural: "film" / "films". */
  nounOne: string;
  nounMany: string;
  /** For the message "X is on the full list, but not <this>": "in the top 50". */
  rangePhrase: string;
  /** Answers that are long phrases (Big Moments): see FillOptions.matchChamps in fill-list.ts. */
  matchChamps?: (text: string) => { ids: string[]; loose: string[] };
  moreHint?: string;
}

export interface FillRound {
  /** Part of the saved key, so never change one that has been released ("au", "films", "modern"). */
  id: string;
  /** On the range switch and in the heading. */
  label: string;
  build: () => FillBuild;
}

export interface FillSource {
  /** In the heading above the list: "Box Office". */
  name: string;
  /** The rounds to choose from. A function, so a page can show the rounds of the tab it is on. */
  rounds: () => FillRound[];
  /** Screen-reader name for the range switch (only shown when there is more than one round). */
  rangeLabel?: string;
  /** One line on each row, before the clock. */
  anyNote?: string;
  orderNote?: string;
}

export interface FillSection {
  /** Is a Fill the List row the one that is picked right now? */
  picked: () => boolean;
  /** A page picked one of its own rows: Fill the List is no longer the picked one. */
  unpick: () => void;
  /** The section label, range switch and the two rows. `firstBadge` is the number on the first row. */
  nodes: (firstBadge: number) => Node[];
  /** The ⏱ option for a header that is built by the page (null unless a Fill the List row is picked). */
  timeOption: () => { value: number; choices: number[]; onChange: (m: number) => void } | null;
  /** Stops a round in progress (the page's own clean-up). */
  stop: () => void;
}

export interface FillSectionOptions {
  deck: Deck;
  source: FillSource;
  setup: HTMLElement;
  /** Where the round is drawn. */
  game: HTMLElement;
  /** Other panels to hide while it runs (the page's results, a board). */
  hide?: HTMLElement[];
  /** The page re-draws its setup screen (which calls nodes() again). */
  redraw: () => void;
  /** The quiz header, if the page builds it once: this keeps its ⏱ in step with the picked row, and locks it while playing. */
  header?: HTMLElement;
  /** For a page that draws the ⏱ itself (from timeOption()): only lock it while a round runs. */
  lockOnly?: HTMLElement;
}

/** The Rules pop-over lines for Fill the List (one place, so every quiz says the same). */
export function fillRules(): HTMLElement {
  return h(
    "div",
    { class: "qpop-levels" },
    h("p", {}, "Fill the List shows the whole list with the answers blank. Type a name and every row it belongs to fills in (Any Order), or fill it row by row (In Order, where Tab skips)."),
    h("p", {}, "On the Fill the List rows: Easy shows the first letter of each answer. Medium has a Hint button (free, and the results count how many you used). Hard has no hints. The ⏱ time limit is for these rows."),
  );
}

/** The first letter that Easy and Hint show: the first letter of the name, ignoring a leading "The". */
export function leadLetter(name: string): string {
  const s = name.replace(/^the\s+/i, "");
  return (s.match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
}

const MODE_NAME: Record<FillMode, string> = { listany: "Fill the List: Any Order", listorder: "Fill the List: In Order" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function createFillSection(o: FillSectionOptions): FillSection {
  let roundId = "";
  let pickedMode: FillMode | null = null;
  const level: Partial<Record<FillMode, Level>> = {};
  let pickedMinutes: number | null = null;
  let stopRound: (() => void) | null = null;
  /** The other panels that were showing when a round started (they come back when it ends). */
  let covered: HTMLElement[] = [];
  const cache = new Map<string, FillBuild>();

  const rounds = () => o.source.rounds();
  const roundNow = (): FillRound => {
    const list = rounds();
    return list.find((r) => r.id === roundId) ?? list[0];
  };
  const buildNow = (): FillBuild => {
    const r = roundNow();
    let b = cache.get(r.id);
    if (!b) cache.set(r.id, (b = r.build()));
    return b;
  };
  const keyOf = (m: FillMode) => `${roundNow().id}-${m}`;
  const minutes = () => pickedMinutes ?? defaultFillMinutes(buildNow(), pickedMode === "listorder");

  const timeOption = () =>
    pickedMode
      ? {
          value: minutes(),
          choices: FILL_TIME_CHOICES,
          onChange: (m: number) => {
            pickedMinutes = m;
          },
        }
      : null;

  function pick(m: FillMode) {
    if (m !== pickedMode) pickedMinutes = null;
    pickedMode = m;
    o.redraw();
  }

  function leave() {
    stopRound?.();
    stopRound = null;
    o.game.hidden = true;
    covered.forEach((e) => (e.hidden = false));
    covered = [];
    o.setup.hidden = false;
    const lockEl = o.header ?? o.lockOnly;
    if (lockEl) lockTime(lockEl, false);
    o.redraw();
    o.setup.querySelector<HTMLElement>(".qrow.current .qgo")?.focus();
  }

  function start() {
    stopRound?.();
    const m = pickedMode ?? "listany";
    const order = m === "listorder";
    const r = roundNow();
    const b = buildNow();
    const lv: Level = level[m] ?? "medium";
    const variant = `${keyOf(m)}${levelSuffix(lv)}`;
    o.setup.hidden = true;
    if (!covered.length) covered = (o.hide ?? []).filter((e) => !e.hidden);
    covered.forEach((e) => (e.hidden = true));
    o.game.hidden = false;
    const lockEl = o.header ?? o.lockOnly;
    if (lockEl) lockTime(lockEl, true);
    stopRound = runFillList(o.game, {
      mode: order ? "order" : "any",
      level: lv,
      heading: `${o.source.name} · ${r.label} · ${cap(lv)}`,
      keyHeading: b.keyHeading,
      whoWord: b.whoWord,
      nounOne: b.nounOne,
      nounMany: b.nounMany,
      rangePhrase: b.rangePhrase,
      minutes: minutes(),
      rows: b.rows,
      outside: b.outside,
      champs: b.champs,
      matchChamps: b.matchChamps,
      moreHint: b.moreHint,
      save: (res: FillResult) => {
        const prev = bestFor(o.deck.id, variant);
        // Row ids like "pm12#2" (a second term) count once, against the person.
        const base = (ids: string[]) => [...new Set(ids.map((id) => id.split("#")[0]))];
        recordGame({ deck: o.deck.id, variant, score: res.score, total: res.total, seconds: res.seconds, date: Date.now() }, base(res.found), base(res.missed));
        const share = res.total ? res.score / res.total : 0;
        const beaten = !prev || share > prev.score / prev.total || (share === prev.score / prev.total && res.seconds < prev.seconds);
        return { best: beaten ? "That's your best for this round." : `Your best is ${prev!.score}/${prev!.total}.` };
      },
      onAgain: start,
      onSetup: leave,
    });
  }

  function nodes(firstBadge: number): Node[] {
    const list = rounds();
    if (!list.some((r) => r.id === roundId)) roundId = list[0].id;
    const b = buildNow();
    const askable = b.rows.filter((r) => !r.off && r.who.length).length;
    const out: Node[] = [sectionLabel("Fill the List")];
    if (list.length > 1) {
      out.push(
        segmented({
          label: o.source.rangeLabel ?? "Range",
          items: list.map((r) => ({ id: r.id, text: r.label })),
          value: roundId,
          onPick: (id) => {
            roundId = id;
            pickedMinutes = null;
            o.redraw();
          },
        }),
      );
    }
    const rows = (["listany", "listorder"] as FillMode[]).map((m, i) => {
      const lv: Level = level[m] ?? "medium";
      const best = bestFor(o.deck.id, keyOf(m) + levelSuffix(lv));
      const mins = m === pickedMode && pickedMinutes !== null ? pickedMinutes : defaultFillMinutes(b, m === "listorder");
      const own = m === "listany" ? o.source.anyNote : o.source.orderNote;
      const text = `${own ?? (m === "listany" ? "Type a name and every row it belongs to fills in." : "Fill each row in turn. Tab skips.")} ${askable} ${askable === 1 ? b.nounOne : b.nounMany}. Clock: ${mins ? `${mins} min` : "no limit"}.`;
      return quizRow({
        badge: firstBadge + i,
        name: MODE_NAME[m],
        desc: best ? `${text} Best: ${best.score}/${best.total}.` : text,
        levels: levelStatesFor(o.deck.id, keyOf(m), LEVELS),
        selected: lv,
        current: m === pickedMode,
        onPick: () => pick(m),
        onLevel: (l) => {
          level[m] = l;
          pick(m);
        },
        onStart: () => {
          if (pickedMode !== m) pickedMinutes = null;
          pickedMode = m;
          start();
        },
      });
    });
    out.push(quizRows(...rows));
    if (o.header) setHeaderTime(o.header, timeOption());
    return out;
  }

  return {
    picked: () => pickedMode !== null,
    unpick: () => {
      pickedMode = null;
      pickedMinutes = null;
    },
    nodes,
    timeOption,
    stop: () => stopRound?.(),
  };
}
