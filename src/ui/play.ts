import type { Board, Deck, Item, Level, Variant } from "../engine/types";
import { Matcher } from "../engine/matcher";
import { bestFor, gamesFor, loadPrefs, recordGame, savePrefs, weakSpots } from "../engine/storage";
import { currentTrack } from "../engine/progress";
import { LEVELS, doneLevels, levelNotes, levelSuffix, resolveLevels, type ResolvedLevel } from "../engine/levels";
import { formatTime, h } from "./dom";
import { createFillSection, fillRules } from "./fill-quiz";
import { chips, lockTime, subjectClass, optionToggles, quizHeader, quizRow, quizRows, sectionLabel, titleCase, typeClickSwitch, type LevelStates } from "./quiz-shell";

type Phase = "setup" | "study" | "playing" | "over";

// STUDY THE BOARD: before a round, the board can be shown with every name on it, to look over
// at your own pace. On the Easy track it opens by itself the first time you start a quiz you've
// never played (unless you've said "don't show this again"). It's always on the setup screen too.
const STUDY_OFF = "learning-arcade:study-off";
function studyDismissed(deckId: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(STUDY_OFF) ?? "[]") as string[]).includes(deckId);
  } catch {
    return false;
  }
}
function dismissStudy(deckId: string) {
  try {
    const list = JSON.parse(localStorage.getItem(STUDY_OFF) ?? "[]") as string[];
    if (!list.includes(deckId)) list.push(deckId);
    localStorage.setItem(STUDY_OFF, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

const TIME_CHOICES = [2, 4, 6, 10, 15, 20, 0];

export function renderPlay(root: HTMLElement, deck: Deck) {
  const prefs = loadPrefs(deck.id);
  let variant: Variant = deck.variants.find((v) => v.id === prefs.variant) ?? deck.variants[0];
  let minutes = prefs.minutes ?? variant.minutes;
  // What the player ticked, and the options a round really uses: the level can switch some on (Countries Hard
  // adds the territories). `options` is what the board and the best-score key see; `chosen` is what is saved.
  const chosen: Record<string, boolean> = Object.fromEntries(deck.options.map((o) => [o.id, prefs.options?.[o.id] ?? o.default]));
  const options: Record<string, boolean> = { ...chosen };
  // The level picked on each round's row. Medium (today's way of playing) unless the player says otherwise.
  const rowLevel: Record<string, Level> = {};
  for (const [id, l] of Object.entries(prefs.levels ?? {})) if (LEVELS.includes(l as Level)) rowLevel[id] = l as Level;
  const remember = () => savePrefs(deck.id, { variant: variant.id, minutes, options: chosen, levels: rowLevel });
  let level: Level = "medium"; // the level of the round on screen
  let phase: Phase = "setup";
  let board: Board | null = null;
  let playing: Item[] = [];
  let found = new Set<string>();
  let matcher = new Matcher([]);
  let startedAt = 0;
  let ticker = 0;
  let pending = 0;
  let buildToken = 0;
  let closeTimer = 0;
  let noteTimer = 0;
  let clickMode = false;
  let promptMode = false;
  let levels = resolveLevels(deck, false);
  let rules: ResolvedLevel = levels.medium!; // what the level on screen means
  // Items no longer asked: named, or (click games) revealed after three wrong clicks.
  let revealed = new Set<string>();
  let wrongClicks = 0;
  const closed = (id: string) => found.has(id) || revealed.has(id);
  // One-at-a-time rounds: a single pass through `order`; `pos` is the item on screen.
  let order: string[] = [];
  let pos = 0;
  let seen = new Set<string>();
  let current: Item | null = null;
  const label = (i: Item) => deck.describe?.(i) ?? i.name;

  function showNote(text: string, kind: "info" | "close" = "info") {
    clearTimeout(noteTimer);
    note.textContent = text;
    note.dataset.kind = kind;
    noteTimer = window.setTimeout(() => (note.textContent = ""), 4000);
  }

  // ---------- layout ----------
  const headerHost = h("div", { class: "quiz-head-host" });
  const setup = h("div", { class: "setup" });
  const timer = h("div", { class: "timer", "aria-live": "off" }, "--:--");
  const score = h("div", { class: "score" });
  const input = h("input", {
    id: "answer",
    class: "answer",
    type: "text",
    autocomplete: "off",
    autocapitalize: "off",
    spellcheck: "false",
    placeholder: "Type a name…",
    "aria-label": "Your answer",
  });
  const giveUp = h("button", { class: "btn ghost", type: "button" }, "Give up");
  const backBtn = h("button", { class: "btn ghost", type: "button", title: "Back to the last one you skipped (Shift+Tab)" }, "◂ Previous");
  const skipBtn = h("button", { class: "btn ghost", type: "button", title: "Skip for now (Tab key)" }, "Skip ▸");
  const hintBtn = h("button", { class: "btn ghost", type: "button", title: "First letters, then a list of names to place" }, "Hint");
  let hintLevel = 0;

  const note = h("p", { class: "note", "aria-live": "polite" });

  const promptBox = h("div", { class: "prompt", "aria-live": "polite" });

  const hud = h(
    "div",
    { class: "hud" },
    promptBox,
    h("div", { class: "hud-stats" }, timer, score),
    input,
    h("div", { class: "hud-actions" }, hintBtn, backBtn, skipBtn, giveUp),
    note,
  );
  hud.hidden = true;
  const results = h("div", { class: "results" });
  results.hidden = true;
  const studyBar = h("div", { class: "study-bar" });
  studyBar.hidden = true;
  const boardHost = h("div", { class: "board" });
  const loading = h("div", { class: "board-loading" }, "Loading map…");
  const groups = h("div", { class: "groups" });
  const recent = h("ol", { class: "recent", "aria-label": "Recently named" });
  const side = h("aside", { class: "side" }, h("h3", {}, "Progress"), groups, h("h3", {}, "Just named"), recent);

  const playBody = h(
    "div",
    { class: "play-body" },
    h("div", { class: "board-wrap" }, boardHost, deck.tip ? h("p", { class: "tip" }, deck.tip) : null),
    side,
  );
  // Fill the List (ui/fill-quiz.ts), for the quizzes that have it: two more rows on the setup page, played in place of the board.
  const fillGame = h("div", { class: "fl-host" });
  fillGame.hidden = true;
  const fill = deck.fillList
    ? createFillSection({ deck, source: deck.fillList, setup, game: fillGame, hide: [playBody, results], redraw: () => renderSetup(), lockOnly: headerHost })
    : null;

  root.replaceChildren(
    h("main", { class: `play quiz ${subjectClass(deck.subject)}` }, headerHost, setup, studyBar, hud, results, fillGame, playBody),
  );

  /** Some games can be played by typing or by clicking, set by an option. */
  function syncMode() {
    // Levels first: a level can switch options on, and the type/click choice decides which levels exist.
    const wantsClick = deck.mode === "click" || (!!deck.clickOption && chosen[deck.clickOption]);
    levels = resolveLevels(deck, wantsClick);
    if (!levels[level]) level = "medium";
    rules = levels[level]!;
    for (const o of deck.options) options[o.id] = o.id in rules.options ? rules.options[o.id] : chosen[o.id];
    clickMode = deck.mode === "click" || (!!deck.clickOption && options[deck.clickOption]);
    promptMode = deck.mode === "prompt" || clickMode;
    input.hidden = clickMode;
    backBtn.hidden = skipBtn.hidden = promptBox.hidden = !promptMode;
  }

  // ---------- setup: the shared quiz page (header, rows, levels) ----------
  /** The options a round at this level would use (the level can switch some on). */
  const optionsFor = (lv: Level): Record<string, boolean> => ({ ...chosen, ...(levels[lv]?.options ?? {}) });
  /**
   * The saved-score key. Medium keeps the key quizzes always had ("world", "world+territories");
   * Easy and Hard add "+easy" / "+hard", so nothing earned earlier is lost or mixed up.
   */
  const keyFor = (v: Variant, lv: Level, opts: Record<string, boolean>) =>
    [v.id, ...deck.options.filter((o) => opts[o.id] && !o.display).map((o) => o.id)].join("+") + levelSuffix(lv);
  const bestKey = () => keyFor(variant, level, options);

  function countFor(v: Variant, lv: Level): number {
    let list = deck.items.filter(v.filter);
    if (deck.applyOptions) list = deck.applyOptions(list, optionsFor(lv));
    return list.length;
  }

  /** One line under the title. */
  function howText(): string {
    if (deck.how) return deck.how;
    if (clickMode) {
      const g = rules.guesses;
      return `You're shown a name: click it on the board. After ${g} wrong ${g === 1 ? "click" : "clicks"} the answer is shown and you move on.`;
    }
    if (promptMode) return "You're shown one at a time. Type the answer and press Enter. Tab skips, and you can come back to it.";
    return `Type ${deck.noun} in any order. Each one you name shows up on the board.`;
  }

  function renderHeader() {
    const levelLines = h("div", { class: "qpop-levels" }, ...levelNotes(deck, clickMode).map((t) => h("p", {}, t)));
    headerHost.replaceChildren(
      quizHeader({
        deck,
        howItWorks: howText(),
        rules: [...(deck.tip ? [deck.tip] : []), levelLines, ...(fill ? [fillRules()] : [])],
        time: (fill?.picked() ? fill.timeOption() : null) ?? {
          value: minutes,
          choices: TIME_CHOICES,
          onChange: (m) => {
            minutes = m;
            remember();
          },
        },
      }),
    );
  }

  /** Picks a row (and a level on it). The board below shows the row you last picked. */
  function selectRow(v: Variant, lv: Level) {
    if (v.id !== variant.id) minutes = v.minutes;
    variant = v;
    level = lv;
    syncMode(); // checks the level exists here, and sets the options it forces
    rowLevel[v.id] = level;
    remember();
  }

  /** The board on screen is for this round and these options; if so, there's nothing to rebuild. */
  let builtFor = "";
  const wantBoard = () => `${variant.id}|${JSON.stringify(options)}|${clickMode}`;
  async function ensureBoard() {
    if (board && builtFor === wantBoard() && !variant.sample) return;
    await buildBoard();
  }

  function statesFor(v: Variant): LevelStates {
    const done = doneLevels(deck.id, v.id);
    return Object.fromEntries(LEVELS.map((l) => [l, !levels[l] ? "none" : done.has(l) ? "done" : "available"])) as LevelStates;
  }

  function renderSetup() {
    syncMode();
    renderHeader();
    const rows: (HTMLElement | null)[] = [];

    // "Study the board" / "Learn it first": always the first row, dashed, Easy only.
    if (levels.easy) {
      rows.push(
        quizRow({
          badge: "learn",
          name: deck.learn ? "Learn It First" : "Study the Board",
          desc: deck.learn
            ? `Read the guide and look over ${titleCase(variant.label)} with every name shown. No clock until you play.`
            : `Every name in ${titleCase(variant.label)}, shown on the board. No clock until you play.`,
          levels: { easy: "available", medium: "none", hard: "none" },
          selected: "easy",
          startLabel: "Look ▸",
          onStart: async () => {
            fill?.unpick();
            await ensureBoard();
            study(false);
          },
        }),
      );
    }

    let lastHeading = "";
    deck.variants.forEach((v, i) => {
      if (v.heading && v.heading !== lastHeading) rows.push(sectionLabel(v.heading));
      lastHeading = v.heading ?? lastHeading;
      const states = statesFor(v);
      const picked = v.id === variant.id ? level : rowLevel[v.id] ?? "medium";
      const lv: Level = levels[picked] ? picked : "medium";
      const n = countFor(v, lv);
      const best = bestFor(deck.id, keyFor(v, lv, optionsFor(lv)));
      const count = v.note ?? (v.sample && n > v.sample ? `${v.sample} ${deck.noun}, picked at random from ${n}.` : `${n} ${deck.noun}.`);
      const finished = LEVELS.filter((l) => levels[l]).every((l) => states[l] === "done");
      rows.push(
        quizRow({
          badge: finished ? "done" : v.starter ? "star" : i + 1,
          name: v.label,
          desc: best ? `${count} Best: ${best.score}/${best.total} in ${formatTime(best.seconds)}.` : count,
          levels: states,
          selected: lv,
          current: v.id === variant.id && !fill?.picked(),
          onPick: () => {
            fill?.unpick();
            selectRow(v, lv);
            renderSetup();
            buildBoard();
          },
          onLevel: (l) => {
            fill?.unpick();
            selectRow(v, l);
            renderSetup();
            ensureBoard();
          },
          onStart: async () => {
            fill?.unpick();
            selectRow(v, lv);
            renderHeader();
            await ensureBoard();
            if (rules.study) study(false);
            else if (level === "medium") startOrStudy();
            else start();
          },
        }),
      );
    });

    const toggles = optionToggles(
      deck.options
        .filter((o) => o.id !== deck.clickOption)
        .map((o) => ({
          id: o.id,
          label: o.label,
          hint: o.hint,
          checked: options[o.id],
          locked: o.id in rules.options,
          onChange: (on: boolean) => {
            chosen[o.id] = on;
            remember();
            renderSetup();
            buildBoard();
          },
        })),
    );
    const clickOpt = deck.clickOption ? deck.options.find((o) => o.id === deck.clickOption) : undefined;
    setup.replaceChildren(
      ...(clickOpt
        ? [
            typeClickSwitch({
              value: chosen[clickOpt.id] ? "click" : "type",
              clickLabel: `🖱 ${clickOpt.label.replace(/ instead$/i, "")}`,
              onChange: (v) => {
                chosen[clickOpt.id] = v === "click";
                remember();
                renderSetup();
                buildBoard();
              },
            }),
          ]
        : []),
      ...(toggles ? [toggles] : []),
      quizRows(...rows),
      ...(fill ? fill.nodes(deck.variants.length + 1) : []),
      ...(deck.related ? [chips([{ label: deck.related.label, href: deck.related.href }])!] : []),
    );
  }

  function selectItems(): Item[] {
    let list = deck.items.filter(variant.filter);
    if (deck.applyOptions) list = deck.applyOptions(list, options);
    if (variant.sample && list.length > variant.sample) list = shuffle(list).slice(0, variant.sample);
    return list;
  }

  async function buildBoard() {
    const token = ++buildToken;
    board?.destroy();
    board = null;
    builtFor = wantBoard();
    playing = selectItems();
    boardHost.replaceChildren(loading);
    const b = await deck.createBoard({ container: boardHost, deck, items: playing, variant, options });
    if (token !== buildToken) {
      b.destroy();
      return;
    }
    loading.remove();
    board = b;
    if (promptMode) b.onPick?.((id) => {
      if (clickMode) return clicked(id);
      if (phase !== "playing" || found.has(id)) return;
      const i = order.indexOf(id);
      if (i >= 0) show(i);
      input.focus();
    });
    renderGroups();
  }

  // ---------- side panel ----------
  function renderGroups() {
    // A round that is already one group (e.g. Europe) doesn't need a breakdown.
    const all = deck.progressGroups ?? [];
    const list = all.some((g) => g.tag === variant.id) ? [] : all;
    const rows = list
      .map((g) => {
        const inGroup = playing.filter((i) => i.tags.includes(g.tag));
        if (!inGroup.length) return null;
        const got = inGroup.filter((i) => found.has(i.id)).length;
        const pct = (got / inGroup.length) * 100;
        return h(
          "div",
          { class: got === inGroup.length ? "group done" : "group" },
          h("span", { class: "group-name" }, g.label),
          h("span", { class: "group-num" }, `${got}/${inGroup.length}`),
          h("span", { class: "group-bar" }, h("span", { style: `width:${pct}%` })),
        );
      })
      .filter(Boolean) as HTMLElement[];
    groups.replaceChildren(...(rows.length ? rows : [h("p", { class: "muted" }, `${playing.length} ${deck.noun} in this round`)]));
    score.textContent = `${found.size}/${playing.length}`;
  }

  // ---------- study the board ----------
  /** The first Start on the Easy track opens the study view instead, once per quiz. */
  function startOrStudy() {
    if (currentTrack() === "easy" && !gamesFor(deck.id).length && !studyDismissed(deck.id)) study(true);
    else start();
  }

  async function study(firstTime: boolean) {
    if (variant.sample) await buildBoard(); // a sampled round shows the set you're about to play
    if (!board) return;
    phase = "study";
    // Every name on show. "found" is the state that labels an item on every board.
    board.setExplore(true);
    for (const i of playing) board.setState(i.id, "found");
    setup.hidden = true;
    const leave = () => {
      studyBar.hidden = true;
      for (const i of playing) board?.setState(i.id, "open");
      board?.setExplore(false);
      phase = "setup";
      setup.hidden = false;
    };
    studyBar.replaceChildren(
      ...(deck.learn ? [h("div", { class: "learn-card" }, deck.learn())] : []),
      h(
        "div",
        { class: "study-row" },
        h(
          "p",
          {},
          h("strong", {}, firstTime ? "New to this one? Have a look first. " : "Study time. "),
          "Everything in this round is labelled. Hover or tap to see names, and take as long as you like. The clock starts when you do.",
        ),
        h("div", { class: "study-actions" },
          h("button", { type: "button", class: "btn primary", onclick: () => { studyBar.hidden = true; start(); } }, "Got it, let's play ▸"),
          firstTime
            ? h("button", { type: "button", class: "btn ghost", onclick: () => { dismissStudy(deck.id); studyBar.hidden = true; start(); } }, "Don't show this again")
            : h("button", { type: "button", class: "btn ghost", onclick: leave }, "◂ Choose a round"),
        ),
      ),
    );
    studyBar.hidden = false;
  }

  // ---------- the round ----------
  async function start() {
    studyBar.hidden = true;
    const ph = deck.placeholder;
    input.placeholder = (typeof ph === "function" ? ph(options) : ph) ?? "Type a name…";
    // Sampled rounds draw a fresh set of items every time.
    if (variant.sample) await buildBoard();
    if (!board) return;
    revealed = new Set();
    found = new Set();
    matcher = new Matcher(playing, deck.items, deck.answerKey);
    note.textContent = "";
    if (promptMode) {
      order = shuffle(playing.map((i) => i.id));
      seen = new Set();
    }
    for (const i of playing) board.setState(i.id, "open");
    board.setExplore(false);
    setHint(rules.hints === "on" ? 1 : 0);
    lockTime(headerHost, true);
    recent.replaceChildren();
    phase = "playing";
    setup.hidden = true;
    results.hidden = true;
    hud.hidden = false;
    input.value = "";
    input.disabled = false;
    renderGroups();
    if (promptMode) show(0);
    if (clickMode) document.addEventListener("keydown", clickKeys);
    startedAt = performance.now();
    tick();
    ticker = window.setInterval(tick, 250);
    if (!clickMode) input.focus();
  }

  // ---------- help (any-order games whose board offers it) ----------
  function setHint(level: number) {
    hintLevel = level;
    hintBtn.hidden = promptMode || !board?.hint || rules.hints === "off";
    hintBtn.disabled = level >= 2;
    hintBtn.textContent = level === 0 ? "Hint" : level === 1 ? "More help" : "Hints on";
    board?.hint?.(level, (id) => {
      const item = playing.find((i) => i.id === id);
      if (item && phase === "playing") accept(item);
    });
  }
  hintBtn.addEventListener("click", () => {
    setHint(hintLevel + 1);
    if (!clickMode) input.focus();
  });

  // ---------- one-at-a-time rounds ----------
  function shuffle<T>(list: T[]): T[] {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function show(index: number) {
    pos = index;
    current = playing.find((i) => i.id === order[index]) ?? null;
    if (current) seen.add(current.id);
    wrongClicks = 0;
    // In click games, highlighting the answer would give it away.
    board?.setCurrent?.(clickMode ? null : current?.id ?? null);
    if (clickMode) board?.showChoices?.(current?.id ?? null);
    promptBox.replaceChildren(current && deck.renderPrompt ? deck.renderPrompt(current, { click: clickMode }) : "");
    // Only the item on screen counts, so answers can't be given out of turn.
    matcher = new Matcher(current ? [current] : [], [], deck.answerKey);
    input.value = "";
    note.textContent = "";
    backBtn.disabled = previousOpen() < 0;
  }

  function previousOpen() {
    for (let i = pos - 1; i >= 0; i--) if (!closed(order[i])) return i;
    return -1;
  }

  /**
   * Move to the next unanswered item. After the last one, pick up anything the
   * player jumped over without seeing; once everything has been seen, the round ends.
   */
  function advance() {
    for (let i = pos + 1; i < order.length; i++) {
      if (!closed(order[i])) return show(i);
    }
    const missedOut = order.findIndex((id) => !closed(id) && !seen.has(id));
    if (missedOut >= 0) return show(missedOut);
    end();
  }

  function skip() {
    if (!current || phase !== "playing") return;
    advance();
    if (!clickMode) input.focus();
  }
  function back() {
    if (phase !== "playing") return;
    const i = previousOpen();
    if (i >= 0) show(i);
    if (!clickMode) input.focus();
  }

  /** Click games: the player clicked something on the board. */
  function clicked(id: string) {
    if (phase !== "playing" || !current || closed(id)) return;
    if (deck.judgeClick ? deck.judgeClick(id, current) : id === current.id) return accept(current);
    wrongClicks++;
    const left = rules.guesses - wrongClicks;
    if (left > 0) {
      // Don't name what they clicked: that would give away a later answer.
      showNote(`Not that one. ${left} ${left === 1 ? "try" : "tries"} left.`);
      return;
    }
    // Out of guesses: show where it was and move on.
    const answer = current;
    revealed.add(answer.id);
    board?.setState(answer.id, "missed");
    board?.flash(answer.id);
    renderGroups();
    if (playing.every((i) => closed(i.id))) return end();
    advance();
    showNote(`Missed that one: ${answer.name} is now shown in red.`);
  }

  function clickKeys(e: KeyboardEvent) {
    if (e.key !== "Tab" || phase !== "playing") return;
    e.preventDefault();
    if (e.shiftKey) back();
    else skip();
  }
  skipBtn.addEventListener("click", skip);
  backBtn.addEventListener("click", back);

  function elapsed() {
    return (performance.now() - startedAt) / 1000;
  }

  function tick() {
    const t = elapsed();
    if (minutes) {
      const left = minutes * 60 - t;
      timer.textContent = formatTime(left);
      timer.classList.toggle("low", left < 30);
      if (left <= 0) end();
    } else {
      timer.textContent = formatTime(t);
    }
  }

  function accept(item: Item) {
    if (!board || found.has(item.id)) return;
    clearTimeout(pending);
    found.add(item.id);
    matcher.markFound(item.id);
    board.setState(item.id, "found");
    board.flash(item.id);
    input.value = "";
    clearTimeout(closeTimer);
    if (note.dataset.kind === "close") note.textContent = "";
    input.classList.remove("hit");
    void input.offsetWidth;
    input.classList.add("hit");
    recent.prepend(h("li", {}, label(item)));
    while (recent.children.length > 8) recent.lastChild!.remove();
    renderGroups();
    if (playing.every((i) => closed(i.id))) end();
    else if (promptMode) advance();
  }

  function outside(item: Item) {
    input.value = "";
    showNote(deck.outsideHint?.(item, options) ?? `${item.name} isn't part of this round.`);
  }

  input.addEventListener("input", () => {
    clearTimeout(pending);
    clearTimeout(closeTimer);
    const text = input.value;
    const r = matcher.check(text);
    if (r.kind === "match") accept(r.item);
    else if (r.kind === "outside") {
      // Don't wipe "UK" while they're still typing "Ukraine".
      if (matcher.couldContinue(text)) pending = window.setTimeout(() => input.value === text && outside(r.item), 1200);
      else outside(r.item);
    } else if (r.kind === "wait") {
      pending = window.setTimeout(() => input.value === text && accept(r.item), 900);
    } else if (matcher.isClose(text)) {
      // Only nudge once they've paused, so it doesn't flicker while typing.
      closeTimer = window.setTimeout(
        () => input.value === text && showNote("So close. Check the spelling.", "close"),
        1200,
      );
    }
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && promptMode) {
      e.preventDefault();
      if (e.shiftKey) back();
      else skip();
      return;
    }
    if (e.key !== "Enter") return;
    const r = matcher.check(input.value);
    if (r.kind === "outside") outside(r.item);
    else if (r.kind !== "none") accept(r.item);
    else if (input.value.trim()) {
      if (matcher.isClose(input.value)) showNote("So close. Check the spelling.", "close");
      input.classList.remove("nope");
      void input.offsetWidth;
      input.classList.add("nope");
    }
  });
  giveUp.addEventListener("click", () => end());

  function end() {
    if (phase !== "playing" || !board) return;
    phase = "over";
    document.removeEventListener("keydown", clickKeys);
    clearInterval(ticker);
    clearTimeout(pending);
    clearTimeout(closeTimer);
    note.textContent = "";
    const seconds = Math.min(elapsed(), minutes ? minutes * 60 : Infinity);
    // In one-at-a-time rounds, separate "saw it and skipped" from "never got to it".
    const unanswered = playing.filter((i) => !found.has(i.id));
    const missed = promptMode ? unanswered.filter((i) => seen.has(i.id) || revealed.has(i.id)) : unanswered;
    const unseen = promptMode ? unanswered.filter((i) => !seen.has(i.id)) : [];
    for (const i of missed) board.setState(i.id, "missed");
    for (const i of unseen) board.setState(i.id, "unseen");
    board.setCurrent?.(null);
    board.showChoices?.(null);
    current = null;
    promptBox.replaceChildren();
    board.setExplore(true);
    input.disabled = true;
    hud.hidden = true;

    const key = bestKey();
    const prevBest = bestFor(deck.id, key);
    recordGame(
      { deck: deck.id, variant: key, score: found.size, total: playing.length, seconds, date: Date.now() },
      [...found],
      missed.map((i) => i.id),
    );
    const isBest = !prevBest || found.size > prevBest.score || (found.size === prevBest.score && seconds < prevBest.seconds);
    const weak = weakSpots(deck.id)
      .filter((w) => w.stats.found + w.stats.missed >= 2)
      .map((w) => ({ ...w, item: deck.items.find((i) => i.id === w.id) }))
      .filter((w) => w.item);

    const parts: (HTMLElement | null)[] = [
      h(
        "div",
        { class: "results-head" },
        h("div", { class: "big" }, `${found.size}`, h("small", {}, `/${playing.length}`)),
        h(
          "div",
          {},
          h(
            "p",
            { class: "verdict" },
            found.size === playing.length
              ? `Clean sweep in ${formatTime(seconds)}.`
              : `You named ${found.size} of ${playing.length} ${deck.noun} in ${formatTime(seconds)}.`,
          ),
          h(
            "p",
            { class: "muted" },
            isBest ? "That's your best for this round." : `Your best is ${prevBest!.score}/${prevBest!.total}.`,
            hintLevel ? (hintLevel > 1 ? " You used the name list." : " You used first-letter hints.") : "",
            " Hover or tap the board to see any name.",
          ),
          promptMode
            ? h(
                "p",
                { class: "legend" },
                h("span", { class: "key found" }, "Named"),
                h("span", { class: "key missed" }, "Skipped"),
                h("span", { class: "key unseen" }, "Not reached"),
              )
            : null,
        ),
        h(
          "div",
          { class: "results-actions" },
          h("button", { type: "button", class: "btn primary", onclick: start }, "Play again"),
          h(
            "button",
            {
              type: "button",
              class: "btn ghost",
              onclick: () => {
                phase = "setup";
                results.hidden = true;
                setup.hidden = false;
                renderSetup();
                buildBoard();
              },
            },
            "Change round",
          ),
        ),
      ),
      missed.length
        ? h(
            "details",
            { class: "missed", open: missed.length <= 40 },
            h("summary", {}, promptMode ? `Skipped (${missed.length})` : `Missed (${missed.length})`),
            h("ul", {}, ...missed.map(label).sort((a, b) => a.localeCompare(b)).map((t) => h("li", {}, t))),
          )
        : null,
      unseen.length
        ? h(
            "details",
            { class: "missed unseen", open: unseen.length <= 40 },
            h("summary", {}, `Not reached (${unseen.length})`),
            h("ul", {}, ...unseen.map(label).sort((a, b) => a.localeCompare(b)).map((t) => h("li", {}, t))),
          )
        : null,
      weak.length
        ? h(
            "div",
            { class: "weak" },
            h("h3", {}, "Your weak spots so far"),
            h(
              "ul",
              {},
              ...weak.map((w) =>
                h(
                  "li",
                  {},
                  label(w.item!),
                  h("span", {}, ` missed ${w.stats.missed} of ${w.stats.missed + w.stats.found}`),
                ),
              ),
            ),
          )
        : null,
    ];
    results.replaceChildren(...(parts.filter(Boolean) as HTMLElement[]));
    results.hidden = false;
  }

  renderSetup();
  buildBoard();

  return () => {
    fill?.stop();
    document.removeEventListener("keydown", clickKeys);
    clearInterval(ticker);
    clearTimeout(pending);
    buildToken++;
    board?.destroy();
  };
}
