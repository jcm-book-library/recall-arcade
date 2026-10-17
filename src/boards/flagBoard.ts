import type { Board, Item, ItemState, ProgressGroup } from "../engine/types";

/** A wall of flags grouped by region; names appear as they're found. */
export function createFlagBoard(
  container: HTMLElement,
  items: Item[],
  flagUrl: (item: Item) => string,
  groups: ProgressGroup[],
): Board {
  const wrap = document.createElement("div");
  wrap.className = "flagwall";
  const cells = new Map<string, HTMLElement>();
  const placed = new Set<string>();

  const section = (title: string, list: Item[]) => {
    if (!list.length) return;
    const head = document.createElement("h3");
    head.textContent = title;
    const grid = document.createElement("div");
    grid.className = "flaggrid";
    for (const item of list) {
      placed.add(item.id);
      const cell = document.createElement("figure");
      cell.className = "flag";
      cell.dataset.label = item.name;
      cell.innerHTML = `<img alt="" loading="lazy" src="${flagUrl(item)}"><figcaption></figcaption>`;
      grid.append(cell);
      cells.set(item.id, cell);
    }
    wrap.append(head, grid);
  };
  // Each flag appears once, under its first region.
  for (const g of groups) section(g.label, items.filter((i) => !placed.has(i.id) && i.tags.includes(g.tag)));
  section("Other", items.filter((i) => !placed.has(i.id)));
  container.append(wrap);

  return {
    setState(id: string, state: ItemState) {
      const cell = cells.get(id);
      if (!cell) return;
      cell.classList.remove("found", "missed");
      if (state !== "open") cell.classList.add(state);
      cell.querySelector("figcaption")!.textContent = state === "open" ? "" : cell.dataset.label ?? "";
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
      if (id) cells.get(id)?.classList.add("current");
    },
    setExplore(on: boolean) {
      for (const c of cells.values()) c.title = on ? c.dataset.label ?? "" : "";
    },
    destroy() {
      wrap.remove();
    },
  };
}
