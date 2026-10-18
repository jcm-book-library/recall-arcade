import type { Board, Item, ItemState, ProgressGroup } from "../engine/types";

/** A wall of flags grouped by region; names appear as they're found. */
export function createFlagBoard(
  container: HTMLElement,
  items: Item[],
  flagUrl: (item: Item) => string,
  groups: ProgressGroup[],
  extraClass = "",
  /** Photo credit, shown when hovering a picture. */
  creditFor?: (item: Item) => string,
): Board {
  const wrap = document.createElement("div");
  wrap.className = `flagwall ${extraClass}`.trim();
  const cells = new Map<string, HTMLElement>();
  const placed = new Set<string>();

  const section = (title: string, list: Item[]) => {
    if (!list.length) return;
    const head = document.createElement("h3");
    head.textContent = title;
    head.hidden = !title;
    const grid = document.createElement("div");
    grid.className = "flaggrid";
    for (const item of list) {
      placed.add(item.id);
      const cell = document.createElement("figure");
      cell.className = "flag";
      cell.dataset.label = item.name;
      cell.dataset.id = item.id;
      const src = flagUrl(item);
      // No picture available: show an empty frame rather than a broken-image icon.
      cell.innerHTML = src ? `<img alt="" loading="lazy" src="${src}"><figcaption></figcaption>` : `<span class="noimg">?</span><figcaption></figcaption>`;
      const credit = creditFor?.(item);
      if (credit) cell.querySelector("img")?.setAttribute("title", credit);
      grid.append(cell);
      cells.set(item.id, cell);
    }
    wrap.append(head, grid);
  };
  // Each flag appears once, under its first region.
  for (const g of groups) section(g.label, items.filter((i) => !placed.has(i.id) && i.tags.includes(g.tag)));
  section(groups.length ? "Other" : "", items.filter((i) => !placed.has(i.id)));
  container.append(wrap);

  return {
    setState(id: string, state: ItemState) {
      const cell = cells.get(id);
      if (!cell) return;
      cell.classList.remove("found", "missed", "unseen");
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
    onPick(handler: (id: string) => void) {
      wrap.addEventListener("click", (e) => {
        const id = (e.target as Element).closest<HTMLElement>(".flag")?.dataset.id;
        if (id) handler(id);
      });
    },
    setExplore(on: boolean) {
      for (const c of cells.values()) c.title = on ? c.dataset.label ?? "" : "";
    },
    destroy() {
      wrap.remove();
    },
  };
}
