import type { Board, Deck, Item, Variant } from "../engine/types";
import { Matcher } from "../engine/matcher";
import { bestFor, loadPrefs, recordGame, savePrefs, weakSpots } from "../engine/storage";
import { formatTime, h } from "./dom";

type Phase = "setup" | "playing" | "over";

const TIME_CHOICES = [2, 4, 6, 10, 15, 20, 0];

export function renderPlay(root: HTMLElement, deck: Deck) {
  const prefs = loadPrefs(deck.id);
  let variant: Variant = deck.variants.find((v) => v.id === prefs.variant) ?? deck.variants[0];
  let minutes = prefs.minutes ?? variant.minutes;
  const options: Record<string, boolean> = Object.fromEntries(
    deck.options.map((o) => [o.id, prefs.options?.[o.id] ?? o.default]),
  );
  const remember = () => savePrefs(deck.id, { variant: variant.id, minutes, options });
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
  const promptMode = deck.mode === "prompt";
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
  const title = h("h1", { class: "play-title" }, deck.title);
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
    placeholder: deck.placeholder ?? "Type a name…",
    "aria-label": "Your answer",
  });
  const giveUp = h("button", { class: "btn ghost", type: "button" }, "Give up");
  const backBtn = h("button", { class: "btn ghost", type: "button", title: "Back to the last one you skipped (Shift+Tab)" }, "◂ Back");
  const skipBtn = h("button", { class: "btn ghost", type: "button", title: "Skip for now (Tab key)" }, "Skip ▸");
  backBtn.hidden = skipBtn.hidden = !promptMode;
  const note = h("p", { class: "note", "aria-live": "polite" });
  const promptBox = h("div", { class: "prompt", "aria-live": "polite" });
  promptBox.hidden = !promptMode;
  const hud = h(
    "div",
    { class: "hud" },
    promptBox,
    h("div", { class: "hud-stats" }, timer, score),
    input,
    h("div", { class: "hud-actions" }, backBtn, skipBtn, giveUp),
    note,
  );
  hud.hidden = true;
  const results = h("div", { class: "results" });
  results.hidden = true;
  const boardHost = h("div", { class: "board" });
  const loading = h("div", { class: "board-loading" }, "Loading map…");
  const groups = h("div", { class: "groups" });
  const recent = h("ol", { class: "recent", "aria-label": "Recently named" });
  const side = h("aside", { class: "side" }, h("h3", {}, "Progress"), groups, h("h3", {}, "Just named"), recent);

  root.replaceChildren(
    h(
      "main",
      { class: "play" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), title),
      setup,
      hud,
      results,
      h("div", { class: "play-body" }, h("div", { class: "board-wrap" }, boardHost), side),
    ),
  );

  // ---------- setup controls ----------
  function renderSetup() {
    const variantChips = deck.variants.map((v) =>
      h(
        "button",
        {
          type: "button",
          class: v.id === variant.id ? "chip on" : "chip",
          "aria-pressed": String(v.id === variant.id),
          onclick: () => {
            variant = v;
            minutes = v.minutes;
            remember();
            renderSetup();
            buildBoard();
          },
        },
        v.label,
      ),
    );
    const timeSelect = h(
      "select",
      {
        id: "minutes",
        "aria-label": "Time limit",
        onchange: (e) => {
          minutes = Number((e.target as HTMLSelectElement).value);
          remember();
        },
      },
      ...TIME_CHOICES.map((m) => {
        const o = h("option", { value: String(m) }, m ? `${m} min` : "No limit");
        o.selected = m === minutes;
        return o;
      }),
    );
    if (!TIME_CHOICES.includes(minutes)) minutes = variant.minutes;
    const toggles = deck.options.map((o) => {
      const box = h("input", {
        type: "checkbox",
        id: `opt-${o.id}`,
        onchange: (e) => {
          options[o.id] = (e.target as HTMLInputElement).checked;
          remember();
          renderSetup();
          buildBoard();
        },
      });
      box.checked = options[o.id];
      return h("label", { class: "toggle", for: `opt-${o.id}`, title: o.hint }, box, h("span", {}, o.label));
    });
    const best = bestFor(deck.id, bestKey());
    setup.replaceChildren(
      h("div", { class: "chips", role: "group", "aria-label": "Choose a round" }, ...variantChips),
      h(
        "div",
        { class: "setup-row" },
        ...toggles,
        h("label", { class: "time-pick" }, "Time ", timeSelect),
        h(
          "span",
          { class: "best" },
          best ? `Best: ${best.score}/${best.total} in ${formatTime(best.seconds)}` : `${selectItems().length} to find`,
        ),
        h("button", { type: "button", class: "btn primary", onclick: start }, "Start ▸"),
      ),
    );
  }

  const bestKey = () =>
    [variant.id, ...deck.options.filter((o) => options[o.id]).map((o) => o.id)].join("+");

  function selectItems(): Item[] {
    let list = deck.items.filter(variant.filter);
    if (deck.applyOptions) list = deck.applyOptions(list, options);
    return list;
  }

  async function buildBoard() {
    const token = ++buildToken;
    board?.destroy();
    board = null;
    playing = selectItems();
    boardHost.replaceChildren(loading);
    const b = await deck.createBoard({ container: boardHost, deck, items: playing, variant, options });
    if (token !== buildToken) {
      b.destroy();
      return;
    }
    loading.remove();
    board = b;
    b.onPick?.((id) => {
      if (phase !== "playing" || !promptMode || found.has(id)) return;
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

  // ---------- the round ----------
  function start() {
    if (!board) return;
    found = new Set();
    matcher = new Matcher(playing, deck.items);
    note.textContent = "";
    if (promptMode) {
      order = shuffle(playing.map((i) => i.id));
      seen = new Set();
    }
    for (const i of playing) board.setState(i.id, "open");
    board.setExplore(false);
    recent.replaceChildren();
    phase = "playing";
    setup.hidden = true;
    results.hidden = true;
    hud.hidden = false;
    input.value = "";
    input.disabled = false;
    renderGroups();
    if (promptMode) show(0);
    startedAt = performance.now();
    tick();
    ticker = window.setInterval(tick, 250);
    input.focus();
  }

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
    board?.setCurrent?.(current?.id ?? null);
    promptBox.replaceChildren(current && deck.renderPrompt ? deck.renderPrompt(current) : "");
    // Only the item on screen counts, so answers can't be given out of turn.
    matcher = new Matcher(current ? [current] : []);
    input.value = "";
    note.textContent = "";
    backBtn.disabled = previousOpen() < 0;
  }

  function previousOpen() {
    for (let i = pos - 1; i >= 0; i--) if (!found.has(order[i])) return i;
    return -1;
  }

  /**
   * Move to the next unanswered item. After the last one, pick up anything the
   * player jumped over without seeing; once everything has been seen, the round ends.
   */
  function advance() {
    for (let i = pos + 1; i < order.length; i++) {
      if (!found.has(order[i])) return show(i);
    }
    const missedOut = order.findIndex((id) => !found.has(id) && !seen.has(id));
    if (missedOut >= 0) return show(missedOut);
    end();
  }

  function skip() {
    if (!current || phase !== "playing") return;
    advance();
    input.focus();
  }
  function back() {
    if (phase !== "playing") return;
    const i = previousOpen();
    if (i >= 0) show(i);
    input.focus();
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
    if (found.size === playing.length) end();
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
    else if (r.kind === "outside") outside(r.item);
    else if (r.kind === "wait") {
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
    clearInterval(ticker);
    clearTimeout(pending);
    clearTimeout(closeTimer);
    note.textContent = "";
    const seconds = Math.min(elapsed(), minutes ? minutes * 60 : Infinity);
    // In one-at-a-time rounds, separate "saw it and skipped" from "never got to it".
    const unanswered = playing.filter((i) => !found.has(i.id));
    const missed = promptMode ? unanswered.filter((i) => seen.has(i.id)) : unanswered;
    const unseen = promptMode ? unanswered.filter((i) => !seen.has(i.id)) : [];
    for (const i of missed) board.setState(i.id, "missed");
    for (const i of unseen) board.setState(i.id, "unseen");
    board.setCurrent?.(null);
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
    clearInterval(ticker);
    clearTimeout(pending);
    buildToken++;
    board?.destroy();
  };
}
