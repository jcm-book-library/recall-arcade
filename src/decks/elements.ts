import type { Board, Deck, Item, ItemState } from "../engine/types";

// Symbol:Name in atomic-number order.
const RAW =
  "H:Hydrogen He:Helium Li:Lithium Be:Beryllium B:Boron C:Carbon N:Nitrogen O:Oxygen F:Fluorine Ne:Neon " +
  "Na:Sodium Mg:Magnesium Al:Aluminium Si:Silicon P:Phosphorus S:Sulfur Cl:Chlorine Ar:Argon K:Potassium Ca:Calcium " +
  "Sc:Scandium Ti:Titanium V:Vanadium Cr:Chromium Mn:Manganese Fe:Iron Co:Cobalt Ni:Nickel Cu:Copper Zn:Zinc " +
  "Ga:Gallium Ge:Germanium As:Arsenic Se:Selenium Br:Bromine Kr:Krypton Rb:Rubidium Sr:Strontium Y:Yttrium Zr:Zirconium " +
  "Nb:Niobium Mo:Molybdenum Tc:Technetium Ru:Ruthenium Rh:Rhodium Pd:Palladium Ag:Silver Cd:Cadmium In:Indium Sn:Tin " +
  "Sb:Antimony Te:Tellurium I:Iodine Xe:Xenon Cs:Caesium Ba:Barium La:Lanthanum Ce:Cerium Pr:Praseodymium Nd:Neodymium " +
  "Pm:Promethium Sm:Samarium Eu:Europium Gd:Gadolinium Tb:Terbium Dy:Dysprosium Ho:Holmium Er:Erbium Tm:Thulium Yb:Ytterbium " +
  "Lu:Lutetium Hf:Hafnium Ta:Tantalum W:Tungsten Re:Rhenium Os:Osmium Ir:Iridium Pt:Platinum Au:Gold Hg:Mercury " +
  "Tl:Thallium Pb:Lead Bi:Bismuth Po:Polonium At:Astatine Rn:Radon Fr:Francium Ra:Radium Ac:Actinium Th:Thorium " +
  "Pa:Protactinium U:Uranium Np:Neptunium Pu:Plutonium Am:Americium Cm:Curium Bk:Berkelium Cf:Californium Es:Einsteinium Fm:Fermium " +
  "Md:Mendelevium No:Nobelium Lr:Lawrencium Rf:Rutherfordium Db:Dubnium Sg:Seaborgium Bh:Bohrium Hs:Hassium Mt:Meitnerium Ds:Darmstadtium " +
  "Rg:Roentgenium Cn:Copernicium Nh:Nihonium Fl:Flerovium Mc:Moscovium Lv:Livermorium Ts:Tennessine Og:Oganesson";

const ALIASES: Record<string, string[]> = {
  Al: ["Aluminum"],
  S: ["Sulphur"],
  Cs: ["Cesium"],
};

/** Where an element sits on the standard 18-column table (row 9-10 = f-block strip). */
function position(z: number): { row: number; col: number } {
  const starts = [1, 3, 11, 19, 37, 55, 87];
  let period = 1;
  for (let p = 0; p < starts.length; p++) if (z >= starts[p]) period = p + 1;
  const i = z - starts[period - 1];
  if (period === 1) return { row: 1, col: z === 1 ? 1 : 18 };
  if (period <= 3) return { row: period, col: i < 2 ? i + 1 : i + 11 };
  if (period <= 5) return { row: period, col: i + 1 };
  if (i < 2) return { row: period, col: i + 1 };
  if (i < 17) return { row: period + 3, col: i + 1 }; // La-Lu, Ac-Lr
  return { row: period, col: i - 13 };
}

const items: Item[] = RAW.split(" ").map((pair, idx) => {
  const [symbol, name] = pair.split(":");
  const z = idx + 1;
  return { id: symbol, name, aliases: ALIASES[symbol] ?? [], tags: [], data: { z, symbol, ...position(z) } };
});

const z = (i: Item) => i.data!.z as number;

function createTableBoard(container: HTMLElement, inPlay: Set<string>, showSymbols: boolean): Board {
  const scroller = document.createElement("div");
  scroller.className = "ptable-scroll";
  const grid = document.createElement("div");
  grid.className = "ptable";
  scroller.append(grid);
  const cells = new Map<string, HTMLElement>();

  for (const item of items) {
    const { row, col, symbol } = item.data as { row: number; col: number; symbol: string };
    const cell = document.createElement("div");
    cell.className = inPlay.has(item.id) ? "pcell" : "pcell off";
    cell.style.gridRow = String(row + (row >= 8 ? 1 : 0));
    cell.style.gridColumn = String(col);
    cell.dataset.label = `${item.name} (${symbol})`;
    cell.innerHTML = `<span class="pz">${z(item)}</span><span class="ps">${showSymbols ? symbol : ""}</span><span class="pn"></span>`;
    grid.append(cell);
    cells.set(item.id, cell);
  }
  for (const [row, label] of [[6, "57–71"], [7, "89–103"]] as const) {
    const ph = document.createElement("div");
    ph.className = "pcell gap";
    ph.style.gridRow = String(row);
    ph.style.gridColumn = "3";
    ph.textContent = label;
    grid.append(ph);
  }
  container.append(scroller);

  return {
    setState(id: string, state: ItemState) {
      const cell = cells.get(id);
      if (!cell) return;
      cell.classList.remove("found", "missed");
      if (state !== "open") cell.classList.add(state);
      const item = items.find((i) => i.id === id)!;
      cell.querySelector(".ps")!.textContent = state === "open" && !showSymbols ? "" : (item.data!.symbol as string);
      cell.querySelector(".pn")!.textContent = state === "open" ? "" : item.name;
    },
    flash(id: string) {
      const cell = cells.get(id);
      if (!cell) return;
      cell.classList.remove("flash");
      void cell.offsetWidth;
      cell.classList.add("flash");
    },
    setExplore(on: boolean) {
      for (const cell of cells.values()) cell.title = on ? cell.dataset.label ?? "" : "";
    },
    destroy() {
      scroller.remove();
    },
  };
}

export const elementsDeck: Deck = {
  id: "elements",
  title: "Periodic Table",
  blurb: "Name the chemical elements. Each square shows its atomic number as a clue.",
  noun: "elements",
  items,
  variants: [
    { id: "20", label: "First 20", minutes: 3, filter: (i) => z(i) <= 20 },
    { id: "36", label: "First 36", minutes: 5, filter: (i) => z(i) <= 36 },
    { id: "54", label: "First 54", minutes: 7, filter: (i) => z(i) <= 54 },
    { id: "all", label: "All 118", minutes: 12, filter: () => true },
  ],
  options: [
    { id: "symbols", label: "Show symbols", hint: "Easier: each square shows its symbol (Fe, Na...)", default: false },
  ],
  createBoard: ({ container, items: playing, options }) =>
    createTableBoard(container, new Set(playing.map((i) => i.id)), options.symbols),
};
