import type { Board, Item, ItemState, ProgressGroup } from "../engine/types";
import { loadPicturesFor, type Picture } from "../data/pictures";
import TITLES from "../data/leader-titles.json";
import "../ui/leaders.css";

/**
 * Cards for Leaders & Changemakers: a small portrait on the left, then the clue, then the answer
 * once you have typed it. It is the tile board plus pictures. Other text quizzes keep the plain
 * tile board, so they look just the same as before.
 *
 * Portraits are fetched after the board is drawn, so the round can start straight away. Each card
 * reserves a grey square while the picture loads; if Wikipedia has no free portrait for someone
 * (or can't be reached), that square goes away and the card is just the clue.
 */
export function createLeaderBoard(
  container: HTMLElement,
  items: Item[],
  opts: { clue: (item: Item) => string; groups: ProgressGroup[]; portraits: boolean },
): Board {
  const wrap = document.createElement("div");
  wrap.className = "tiles wide leaders";
  const cells = new Map<string, HTMLElement>();
  const placed = new Set<string>();

  const section = (title: string | null, list: Item[]) => {
    if (!list.length) return;
    if (title) {
      const h = document.createElement("h3");
      h.textContent = title;
      wrap.append(h);
    }
    const grid = document.createElement("div");
    grid.className = "tilegrid";
    for (const item of list) {
      placed.add(item.id);
      const cell = document.createElement("div");
      cell.className = "tile leader-tile";
      cell.dataset.id = item.id;
      const text = document.createElement("div");
      text.className = "leader-text";
      const clue = document.createElement("span");
      clue.className = "tile-clue";
      clue.textContent = opts.clue(item);
      const ans = document.createElement("span");
      ans.className = "tile-answer";
      text.append(clue, ans);
      if (opts.portraits) {
        const pic = document.createElement("span");
        pic.className = "leader-pic pending";
        cell.append(pic);
      } else cell.classList.add("no-pic");
      cell.append(text);
      grid.append(cell);
      cells.set(item.id, cell);
    }
    wrap.append(grid);
  };
  for (const g of opts.groups) section(g.label, items.filter((i) => !placed.has(i.id) && i.tags.includes(g.tag)));
  section(opts.groups.length ? "Other" : null, items.filter((i) => !placed.has(i.id)));
  container.append(wrap);

  /** Drop the grey square (and any credit) from a card that has no portrait. */
  const noPortrait = (cell: HTMLElement) => {
    cell.classList.add("no-pic");
    cell.querySelector(".leader-pic")?.remove();
    cell.querySelector(".leader-credit")?.remove();
  };

  const showPortrait = (cell: HTMLElement, pic: Picture) => {
    const slot = cell.querySelector<HTMLElement>(".leader-pic");
    if (!slot) return;
    slot.classList.remove("pending");
    const img = document.createElement("img");
    img.src = pic.thumb;
    img.alt = "Portrait";
    img.loading = "lazy";
    img.title = `Photo: ${pic.artist} · ${pic.license}`;
    img.onerror = () => noPortrait(cell);
    slot.append(img);
    const credit = document.createElement("a");
    credit.className = "credit leader-credit";
    credit.href = pic.page;
    credit.target = "_blank";
    credit.rel = "noopener";
    credit.textContent = `Photo: ${pic.artist} · ${pic.license}`;
    // Following the credit link must not count as picking the card.
    credit.addEventListener("click", (e) => e.stopPropagation());
    cell.querySelector(".leader-text")!.append(credit);
  };

  let alive = true;
  if (opts.portraits) {
    // Each person's Wikipedia article: our map first, otherwise the name itself.
    const names = TITLES as Record<string, string>;
    const titles: Record<string, string> = {};
    for (const it of items) titles[it.id] = names[it.name] ?? it.name;
    loadPicturesFor(`leaders:${items.map((i) => i.id).join(",")}`, titles)
      .then((pics) => {
        if (!alive) return;
        for (const [id, cell] of cells) {
          const pic = pics.get(id);
          if (pic) showPortrait(cell, pic);
          else noPortrait(cell);
        }
      })
      .catch(() => {
        if (!alive) return;
        for (const cell of cells.values()) noPortrait(cell);
        const warn = document.createElement("p");
        warn.className = "note";
        warn.textContent = "Couldn't reach Wikipedia for the portraits. Check your connection and reload.";
        wrap.before(warn);
      });
  }

  const answerOf = (id: string) => items.find((i) => i.id === id)!.name;

  return {
    setState(id: string, state: ItemState) {
      const cell = cells.get(id);
      if (!cell) return;
      cell.classList.remove("found", "missed", "unseen");
      if (state !== "open") cell.classList.add(state);
      cell.querySelector(".tile-answer")!.textContent = state === "open" ? "" : answerOf(id);
    },
    flash(id: string) {
      const cell = cells.get(id);
      if (!cell) return;
      cell.classList.remove("flash");
      void cell.offsetWidth;
      cell.classList.add("flash");
    },
    setCurrent(id: string | null) {
      for (const c of cells.values()) c.classList.remove("current");
      const cell = id ? cells.get(id) : null;
      if (cell) {
        cell.classList.add("current");
        cell.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    },
    onPick(handler: (id: string) => void) {
      wrap.classList.add("pickable");
      wrap.addEventListener("click", (e) => {
        const id = (e.target as Element).closest<HTMLElement>(".tile")?.dataset.id;
        if (id) handler(id);
      });
    },
    setExplore() {
      /* answers are written on the cards once the round ends */
    },
    destroy() {
      alive = false;
      wrap.previousElementSibling?.classList.contains("note") && wrap.previousElementSibling.remove();
      wrap.remove();
    },
  };
}
