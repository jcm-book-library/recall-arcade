// FILL THE LIST: a shared game type (docs/game-types.md). The whole list is on screen, newest first, with the
// answers blank. Two ways to play, both built here so every list gets them (and any fix lands everywhere):
//
//   "any"    One box. Type a name and EVERY row it belongs to fills in at once ("Hamilton" fills all his years).
//   "order"  The current row is highlighted. Type its answer. Tab skips, Shift+Tab goes back, and the list
//            grows as you go. Skipped rows can be returned to (click one, or wrap round at the end).
//
// The engine knows nothing about sport. Hand it rows and the champions' accepted names:
//
//   runFillList(host, {
//     mode, level, heading, keyHeading, whoWord, nounOne, nounMany, rangePhrase, minutes,
//     rows:  [{ id, key: "2025", sub?, who: ["lewishamilton"], shown: "Lewis Hamilton", detail?, note?, alt?, hint?, off? }],
//     outside?: rows that are on the full list but outside the chosen range (only used for a gentle message),
//     champs: [{ id, name, accept: ["Hamilton", ...], loose?: ["Greene"] }],
//     save(result) -> { best, beaten },   // the caller records the score (so it controls the storage key)
//     onAgain(), onSetup(),
//   })
//
// Levels (engine/levels.ts): Easy shows the first letter of every blank; Medium has a Hint button (free, but the
// results say how many were used); Hard has no hints. Matching is engine/names.ts: case, accents and punctuation
// don't matter and one slip in a long name is forgiven. Names a champion shares with another (`loose`) are
// refused in Any order ("type the full name") and accepted in In order, where the row is already known.
//
// The styles are in fill-list.css (class names start with "fl-").
import type { Level } from "../engine/types";
import { normalize } from "../engine/matcher";
import { namesMatch } from "../engine/names";
import { formatTime, h } from "./dom";
import "./fill-list.css";

export interface FillChamp {
  id: string;
  /** The name shown when a row fills ("Lewis Hamilton"). */
  name: string;
  accept: string[];
  /** Names that count only when the row is known (a surname that two champions share). */
  loose?: string[];
}

export interface FillRow {
  id: string;
  /** The label in the first column: "2025", "2024–25", "16 Aug 2009". */
  key: string;
  /** A small line under the key: "films of 2025", "1 of 2". */
  sub?: string;
  /** Champion ids. Empty for a row with no winner (see `off`). */
  who: string[];
  /** What the row shows once filled ("Sydney Roosters"). */
  shown: string;
  /** Extra names accepted for this row only (the artist, for a song). */
  alt?: string[];
  /** Shown beside the answer once filled: the film, the author, the time and venue. */
  detail?: string;
  /** A smaller line under the detail ("held at Phillip Island"). */
  note?: string;
  /** The letter(s) that Easy and Hint show. Defaults to the first letter of `shown`. */
  hint?: string;
  /** A row with no answer ("Cancelled", "Stripped", "Not held"): shown dimmed, never counted. */
  off?: string;
}

export interface FillResult {
  score: number;
  total: number;
  found: string[];
  missed: string[];
  seconds: number;
  hints: number;
  timeUp: boolean;
}

export interface FillOptions {
  mode: "any" | "order";
  level: Level;
  /** Small title in the top bar: "F1 world champions · Since 2000". */
  heading: string;
  /** First column heading: "Year", "Season", "Date". */
  keyHeading: string;
  /** What a row's answer is called: "driver", "club", "film". */
  whoWord: string;
  /** What is counted, singular and plural: "title" / "titles". */
  nounOne: string;
  nounMany: string;
  /** The range in words for the "not in this range" message: "since 2000". */
  rangePhrase: string;
  /** Minutes allowed; 0 means no limit. */
  minutes: number;
  rows: FillRow[];
  outside?: FillRow[];
  champs: FillChamp[];
  /** Called once when the round ends. Records the score and says how it compares with the best. */
  save: (r: FillResult) => { best: string };
  onAgain: () => void;
  onSetup: () => void;
}

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const firstLetter = (s: string) => (s.match(/[\p{L}\p{N}]/u)?.[0] ?? s[0] ?? "?").toUpperCase();

/** Runs a round of Fill the List inside `host`. Returns a function that stops it (timers, listeners). */
export function runFillList(host: HTMLElement, o: FillOptions): () => void {
  const order = o.mode === "order";
  const champs = new Map(o.champs.map((c) => [c.id, c]));
  const rows = o.rows;
  const isAsk = (r: FillRow) => !r.off && r.who.length > 0;
  const askIdx = rows.map((_, i) => i).filter((i) => isAsk(rows[i]));
  const total = askIdx.length;
  const timers: number[] = [];
  const startedAt = performance.now();

  // ---------- state ----------
  const filled = new Set<string>();
  const hinted = new Set<string>();
  let hintsUsed = 0;
  let over = false;
  let cur = -1; // In order: the index of the current row
  let reached = -1; // In order: the furthest row shown so far
  const skipped = new Set<string>();

  // ---------- the pieces on screen ----------
  const countEl = h("span", { class: "fl-count" });
  const clockEl = h("span", { class: "fl-clock", title: o.minutes ? "Time left" : "Time so far" });
  const bar = h("span", { class: "fl-barfill" });
  const input = h("input", {
    class: "fl-input",
    type: "text",
    autocomplete: "off",
    autocapitalize: "off",
    autocorrect: "off",
    spellcheck: "false",
    enterkeyhint: order ? "go" : "done",
    "aria-label": order ? `Type the ${o.whoWord} for the highlighted row` : `Type a ${o.whoWord} name`,
    placeholder: order ? "" : "Type a name, then press Enter",
  });
  const fb = h("p", { class: "fl-fb", "aria-live": "polite" });
  const fillBtn = h("button", { type: "button", class: "btn primary fl-go", onclick: () => submit() }, "Fill in");
  const backBtn = h("button", { type: "button", class: "btn ghost fl-act", title: "Shift+Tab", onclick: () => move(-1) }, "◂ Previous");
  const skipBtn = h("button", { type: "button", class: "btn ghost fl-act", title: "Tab", onclick: () => move(1) }, "Skip ▸");
  const hintBtn = h("button", { type: "button", class: "btn ghost fl-act", onclick: () => hint() }, "Hint");
  const giveBtn = h("button", { type: "button", class: "btn ghost fl-act", onclick: () => end(false) }, "Give up");
  const prompt = h("p", { class: "fl-prompt" });

  const li = new Map<string, { row: HTMLElement; ans: HTMLElement; det: HTMLElement }>();
  const list = h("ul", { class: "fl-list" });
  const more = h("li", { class: "fl-more" });
  for (const r of rows) {
    const ans = h("span", { class: "fl-ans" });
    const det = h("span", { class: "fl-det" });
    const off = !isAsk(r);
    const row = h(
      "li",
      { class: `fl-row${off ? " off" : ""}`, "data-id": r.id },
      h("span", { class: "fl-key" }, h("b", {}, r.key), r.sub ? h("i", {}, r.sub) : null),
      ans,
      det,
    );
    if (off) {
      ans.append(h("span", { class: "fl-offtext" }, r.off ?? "No winner"));
      if (r.note) det.append(h("span", { class: "fl-d2" }, r.note));
    } else {
      paintBlank(r, ans);
      row.addEventListener("click", () => {
        if (order && !over && !filled.has(r.id) && rows.indexOf(r) <= reached) setCurrent(rows.indexOf(r));
      });
    }
    li.set(r.id, { row, ans, det });
    list.append(row);
  }
  list.append(more);

  const colHead = h(
    "div",
    { class: "fl-head", "aria-hidden": "true" },
    h("span", {}, o.keyHeading),
    h("span", {}, titleWord(o.whoWord)),
    h("span", {}, "Details"),
  );
  const box = h("div", { class: "fl-box", tabindex: "-1" }, colHead, list);

  const controls = h("div", { class: "fl-controls" });
  const inputRow = h("div", { class: "fl-inputrow" }, input, fillBtn);
  const actions = h("div", { class: "fl-actions" });
  if (order) actions.append(backBtn, skipBtn);
  if (o.level === "medium") actions.append(hintBtn);
  actions.append(giveBtn);
  controls.append(...(order ? [prompt] : []), inputRow, fb, actions);

  const foot = h(
    "p",
    { class: "fl-foot" },
    order
      ? "Tab skips a row. Shift+Tab goes back. Click a skipped row to return to it."
      : "Type any name from the list. Every row it belongs to fills in at once.",
  );

  const card = h(
    "div",
    { class: `fl-card${order ? " is-order" : " is-any"} lv-${o.level}` },
    h(
      "div",
      { class: "fl-top" },
      countEl,
      h("p", { class: "fl-heading" }, o.heading),
      clockEl,
    ),
    h("div", { class: "fl-bar", "aria-hidden": "true" }, bar),
    controls,
    box,
    foot,
  );
  // The first column is as wide as its longest label ("2025–26", "16 Aug 2009", or the small line under the year).
  card.style.setProperty("--kkey", String(Math.max(4, ...rows.map((r) => r.key.length))));
  card.style.setProperty("--ksub", String(Math.max(0, ...rows.map((r) => r.sub?.length ?? 0))));
  host.replaceChildren(card);

  // Keep the box a sensible height above the on-screen keyboard (a phone's visual viewport shrinks with it).
  const vv = window.visualViewport;
  const syncViewport = () => {
    if (vv) card.style.setProperty("--fl-vh", `${Math.round(vv.height)}px`);
  };
  syncViewport();
  vv?.addEventListener("resize", syncViewport);

  // ---------- drawing a row ----------
  function paintBlank(r: FillRow, ans: HTMLElement) {
    const letter = r.hint ?? firstLetter(r.shown);
    const show = o.level === "easy" || hinted.has(r.id);
    ans.replaceChildren(
      h("span", { class: `fl-blank${show ? " has-letter" : ""}${hinted.has(r.id) ? " hinted" : ""}` }, show ? h("span", { class: "fl-first" }, letter) : null),
    );
  }

  function fillRow(r: FillRow, style: "hit" | "miss", delayMs = 0) {
    const e = li.get(r.id)!;
    e.row.classList.remove("current", "skipped", "pop", "pop-miss");
    e.row.classList.add(style === "hit" ? "filled" : "missed");
    e.ans.replaceChildren(h("span", { class: "fl-name" }, r.shown));
    e.det.replaceChildren(...(r.detail ? [h("span", { class: "fl-d1" }, r.detail)] : []), ...(r.note ? [h("span", { class: "fl-d2" }, r.note)] : []));
    e.row.style.setProperty("--d", `${delayMs}ms`);
    void e.row.offsetWidth;
    e.row.classList.add(style === "hit" ? "pop" : "pop-miss");
    if (style === "hit") filled.add(r.id);
    e.row.removeAttribute("aria-current");
  }

  function updateCount() {
    countEl.replaceChildren(h("b", {}, String(filled.size)), ` / ${total}`);
    bar.style.width = `${total ? (filled.size / total) * 100 : 0}%`;
  }

  // ---------- scrolling the list box ----------
  function visibleIn(e: HTMLElement) {
    const top = box.scrollTop + colHead.offsetHeight;
    return e.offsetTop >= top && e.offsetTop + e.offsetHeight <= box.scrollTop + box.clientHeight;
  }
  function scrollToRow(e: HTMLElement, instant = false) {
    const target = e.offsetTop - colHead.offsetHeight - (box.clientHeight - colHead.offsetHeight - e.offsetHeight) / 2;
    box.scrollTo({ top: Math.max(0, target), behavior: instant || reduceMotion() ? "auto" : "smooth" });
  }
  function clearTimers() {
    timers.splice(0).forEach((t) => clearTimeout(t));
  }
  /** After a fill: if the new rows are out of sight, take a brief tour of them, newest first. */
  function tour(newRows: FillRow[]) {
    clearTimers();
    const els = newRows.map((r) => li.get(r.id)!.row);
    if (els.every(visibleIn)) return;
    els.slice(0, 6).forEach((e, i) => {
      timers.push(window.setTimeout(() => scrollToRow(e), i * 520));
    });
  }
  // A person scrolling by hand cancels any tour in progress.
  box.addEventListener("wheel", clearTimers, { passive: true });
  box.addEventListener("touchstart", clearTimers, { passive: true });

  // ---------- messages ----------
  function say(text: string, kind: "good" | "ok" | "bad" | "" = "") {
    fb.className = `fl-fb ${kind}`;
    fb.textContent = text;
    fb.classList.remove("flash");
    void fb.offsetWidth;
    fb.classList.add("flash");
  }
  function nope() {
    input.classList.remove("nope");
    void input.offsetWidth;
    input.classList.add("nope");
  }
  const countText = (n: number) => `${n} ${n === 1 ? o.nounOne : o.nounMany}`;

  // ---------- matching ----------
  /** The name that `text` matches for this row, or null. `loose` also allows shared surnames. */
  function nameFor(r: FillRow, text: string, loose: boolean): string | null {
    for (const id of r.who) {
      const c = champs.get(id);
      if (c && namesMatch(loose ? [...c.accept, ...(c.loose ?? [])] : c.accept, text)) return c.name;
    }
    const a = r.alt?.find((n) => namesMatch([n], text));
    return a ?? null;
  }

  // ---------- Any order ----------
  function submitAny() {
    const text = input.value.trim();
    if (!normalize(text)) return;
    clearTimers();
    const hits: { r: FillRow; name: string }[] = [];
    for (const i of askIdx) {
      const n = nameFor(rows[i], text, false);
      if (n) hits.push({ r: rows[i], name: n });
    }
    if (hits.length) {
      const tally = new Map<string, number>();
      hits.forEach((x) => tally.set(x.name, (tally.get(x.name) ?? 0) + 1));
      const name = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const fresh = hits.filter((x) => !filled.has(x.r.id)).map((x) => x.r);
      input.value = "";
      if (!fresh.length) {
        say(`Already filled: ${name}, ${countText(hits.length)}.`, "ok");
      } else {
        fresh.forEach((r, k) => fillRow(r, "hit", Math.min(k, 12) * 70));
        updateCount();
        const extra = fresh.length < hits.length ? ` (${fresh.length} new)` : "";
        say(`${name}: ${countText(hits.length)}${extra}`, "good");
        tour(fresh);
        if (filled.size === total) {
          timers.push(window.setTimeout(() => end(false), 900 + Math.min(fresh.length, 12) * 70));
        }
      }
    } else {
      const looseOnly = askIdx.some((i) => nameFor(rows[i], text, true));
      const outside = (o.outside ?? []).map((r) => nameFor(r, text, false)).find(Boolean);
      if (looseOnly) say(`More than one ${o.whoWord} fits that. Type the full name.`, "ok");
      else if (outside) say(`${outside} is on the full list, but not ${o.rangePhrase}.`, "ok");
      else say(`“${text}” isn't in this list.`, "bad");
      nope();
    }
    input.focus({ preventScroll: true });
  }

  // ---------- In order ----------
  /** The rows you can go to: skipped ones you've passed, and the next fresh row at the frontier. */
  function candidates(): number[] {
    const fresh = askIdx.find((i) => i > reached);
    return askIdx.filter((i) => !filled.has(rows[i].id) && (i <= reached || i === fresh));
  }
  function showUpTo(i: number) {
    for (let k = Math.max(0, reached + 1); k <= i; k++) {
      const e = li.get(rows[k].id)!.row;
      e.classList.add("seen", "grow");
    }
    reached = Math.max(reached, i);
    const left = askIdx.filter((k) => k > reached).length;
    more.textContent = left ? `${left} more ${left === 1 ? "row" : "rows"} to come` : "";
    more.hidden = left === 0;
  }
  function setCurrent(i: number, instant = false) {
    if (over) return;
    if (cur >= 0 && cur !== i) {
      const prev = rows[cur];
      const pe = li.get(prev.id)!.row;
      pe.classList.remove("current");
      pe.removeAttribute("aria-current");
      if (!filled.has(prev.id) && cur !== i) {
        skipped.add(prev.id);
        pe.classList.add("skipped");
      }
    }
    cur = i;
    // Rows between the old frontier and this one (like a cancelled year) come into view with it.
    showUpTo(Math.max(i, reached));
    const r = rows[i];
    const e = li.get(r.id)!.row;
    e.classList.add("current");
    e.classList.remove("skipped");
    e.setAttribute("aria-current", "true");
    prompt.replaceChildren("Now: ", h("b", {}, r.key));
    if (r.sub) prompt.append(h("span", { class: "fl-psub" }, ` · ${r.sub}`));
    input.placeholder = `${r.key}: type the ${o.whoWord}`;
    hintBtn.disabled = hinted.has(r.id) || o.level !== "medium";
    scrollToRow(e, instant);
    input.focus({ preventScroll: true });
  }
  /** Tab and Shift+Tab. */
  function move(dir: 1 | -1) {
    if (!order || over) return;
    const c = candidates();
    if (!c.length) return;
    let to: number;
    if (dir === 1) to = c.find((i) => i > cur) ?? c[0];
    else to = [...c].reverse().find((i) => i < cur) ?? c[c.length - 1];
    if (to === cur) {
      say(c.length === 1 ? "That's the only row left." : "", "ok");
      return;
    }
    clearTimers();
    input.value = "";
    setCurrent(to);
    say(dir === 1 ? "Skipped. You can come back to it." : "", dir === 1 ? "ok" : "");
  }
  function submitOrder() {
    const text = input.value.trim();
    if (!normalize(text) || cur < 0) return;
    const r = rows[cur];
    const n = nameFor(r, text, true);
    if (n) {
      input.value = "";
      skipped.delete(r.id);
      fillRow(r, "hit");
      updateCount();
      say(`${r.key}: ${r.shown}`, "good");
      if (filled.size === total) {
        timers.push(window.setTimeout(() => end(false), 900));
        return;
      }
      const fresh = askIdx.find((i) => i > reached);
      const c = candidates();
      setCurrent(fresh ?? c.find((i) => i > cur) ?? c[0]);
    } else {
      say(`Not ${r.key}. Try again, or Tab to skip.`, "bad");
      nope();
      input.focus({ preventScroll: true });
    }
  }

  function submit() {
    if (over) return;
    if (order) submitOrder();
    else submitAny();
  }

  // ---------- hints (Medium) ----------
  function hint() {
    if (over || o.level !== "medium") return;
    let r: FillRow | undefined;
    if (order) r = cur >= 0 ? rows[cur] : undefined;
    else r = askIdx.map((i) => rows[i]).find((x) => !filled.has(x.id) && !hinted.has(x.id));
    if (!r) {
      say("Every blank already has its first letter.", "ok");
      return;
    }
    if (hinted.has(r.id)) return;
    hinted.add(r.id);
    hintsUsed++;
    paintBlank(r, li.get(r.id)!.ans);
    const e = li.get(r.id)!.row;
    e.classList.remove("peek");
    void e.offsetWidth;
    e.classList.add("peek");
    say(`${r.key} starts with ${r.hint ?? firstLetter(r.shown)}.`, "ok");
    if (order) hintBtn.disabled = true;
    else scrollToRow(e);
    input.focus({ preventScroll: true });
  }

  // ---------- the clock ----------
  function elapsed() {
    return (performance.now() - startedAt) / 1000;
  }
  function tick() {
    if (over) return;
    const t = elapsed();
    if (o.minutes) {
      const left = o.minutes * 60 - t;
      clockEl.textContent = `⏱ ${formatTime(left)}`;
      clockEl.classList.toggle("low", left < 30);
      if (left <= 0) end(true);
    } else clockEl.textContent = `⏱ ${formatTime(t)}`;
  }
  const clock = window.setInterval(tick, 250);

  // ---------- the end ----------
  function end(timeUp: boolean) {
    if (over) return;
    over = true;
    clearTimers();
    clearInterval(clock);
    const seconds = Math.round(o.minutes ? Math.min(elapsed(), o.minutes * 60) : elapsed());
    const missed: string[] = [];
    let firstMiss: HTMLElement | null = null;
    // In order, every row comes into view so the missed ones can be seen.
    if (order) showUpTo(rows.length - 1);
    for (const i of askIdx) {
      const r = rows[i];
      if (filled.has(r.id)) continue;
      missed.push(r.id);
      fillRow(r, "miss", 0);
      li.get(r.id)!.row.classList.remove("current", "skipped");
      firstMiss ??= li.get(r.id)!.row;
    }
    const found = [...filled];
    const res: FillResult = { score: found.length, total, found, missed, seconds, hints: hintsUsed, timeUp };
    const { best } = o.save(res);
    card.classList.add("is-over");
    clockEl.textContent = `⏱ ${formatTime(seconds)}`;
    clockEl.classList.remove("low");
    const share = total ? found.length / total : 0;
    const verdict = timeUp && missed.length
      ? "Time's up."
      : share === 1
        ? "The whole list. Superb!"
        : share >= 0.8
          ? "Top effort. You know your stuff."
          : share >= 0.5
            ? "Not bad at all."
            : "Have another go. It sinks in.";
    const bits = [`Time ${formatTime(seconds)}`];
    if (o.level === "medium") bits.push(`${hintsUsed} ${hintsUsed === 1 ? "hint" : "hints"} used`);
    controls.replaceChildren(
      h(
        "div",
        { class: "fl-result" },
        h("div", { class: "fl-big" }, `${found.length}`, h("small", {}, `/${total}`)),
        h("div", { class: "fl-rtext" }, h("p", { class: "fl-verdict" }, verdict), h("p", { class: "muted" }, bits.join(" · ")), h("p", { class: "muted" }, best)),
        h(
          "div",
          { class: "fl-ractions" },
          h("button", { type: "button", class: "btn primary", onclick: o.onAgain }, "Play again"),
          h("button", { type: "button", class: "btn ghost", onclick: o.onSetup }, "Change setup"),
        ),
      ),
    );
    if (missed.length) controls.append(h("p", { class: "fl-legend" }, h("span", { class: "sw hit" }), "Filled", h("span", { class: "sw miss" }), `Missed (${missed.length})`));
    foot.hidden = true;
    controls.querySelector<HTMLElement>(".btn.primary")?.focus({ preventScroll: true });
    if (firstMiss) {
      const e = firstMiss;
      timers.push(window.setTimeout(() => scrollToRow(e), 120));
    } else box.scrollTo({ top: 0 });
  }

  // ---------- keys ----------
  input.addEventListener("keydown", (e) => {
    if (over) return;
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Tab" && order) {
      e.preventDefault();
      move(e.shiftKey ? -1 : 1);
    } else if (e.key === "Escape") {
      input.value = "";
    }
  });

  // ---------- go ----------
  updateCount();
  tick();
  if (order) {
    const first = askIdx[0];
    showUpTo(first);
    // Rows are hidden until the list reaches them.
    setCurrent(first, true);
    box.scrollTop = 0;
  } else {
    for (const r of rows) li.get(r.id)!.row.classList.add("seen");
    more.hidden = true;
  }
  card.scrollIntoView({ block: "start", behavior: "auto" });
  input.focus({ preventScroll: true });

  return () => {
    over = true;
    clearTimers();
    clearInterval(clock);
    vv?.removeEventListener("resize", syncViewport);
  };
}

function titleWord(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
