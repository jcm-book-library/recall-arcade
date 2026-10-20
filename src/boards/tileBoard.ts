import type { Board, Item, ItemState, ProgressGroup } from "../engine/types";

/**
 * A grid of clue cards that fill in with the answer as you go.
 * Used for text quizzes: the NATO alphabet, prime ministers, units, and so on.
 */
export function createTileBoard(
  container: HTMLElement,
  items: Item[],
  opts: {
    clue: (item: Item) => string;
    /** What fills the card once answered. Defaults to the item's name. */
    answer?: (item: Item) => string;
    groups?: ProgressGroup[];
    /** Wider cards for long clues. */
    wide?: boolean;
    /** Extra class, e.g. "music" to draw clues in the music-symbol font. */
    className?: string;
  },
): Board {
  const wrap = document.createElement("div");
  wrap.className = ["tiles", opts.wide ? "wide" : "", opts.className ?? ""].join(" ").trim();
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
      cell.className = "tile";
      cell.dataset.id = item.id;
      const clue = document.createElement("span");
      clue.className = "tile-clue";
      clue.textContent = opts.clue(item);
      const ans = document.createElement("span");
      ans.className = "tile-answer";
      cell.append(clue, ans);
      grid.append(cell);
      cells.set(item.id, cell);
    }
    wrap.append(grid);
  };
  if (opts.groups?.length) {
    for (const g of opts.groups) section(g.label, items.filter((i) => !placed.has(i.id) && i.tags.includes(g.tag)));
  }
  section(opts.groups?.length ? "Other" : null, items.filter((i) => !placed.has(i.id)));
  container.append(wrap);

  const answerOf = (id: string) => {
    const item = items.find((i) => i.id === id)!;
    return opts.answer ? opts.answer(item) : item.name;
  };

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
      wrap.remove();
    },
  };
}
