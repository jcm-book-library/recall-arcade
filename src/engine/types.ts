// The core building blocks every game shares.
// A "deck" is a set of things to learn; a "board" is how they are drawn.

export interface Item {
  id: string;
  /** The name shown when revealed. */
  name: string;
  /** Other spellings that count as correct. */
  aliases?: string[];
  /** Labels used for filtering and progress, e.g. "AF" or "territory". */
  tags: string[];
  /** Anything deck-specific (map name, atomic number, ...). */
  data?: Record<string, unknown>;
}

export interface Variant {
  id: string;
  label: string;
  /** Suggested time limit in minutes. */
  minutes: number;
  /** Which items this variant covers. */
  filter: (item: Item) => boolean;
  /** If set, each round uses this many items picked at random from the filter. */
  sample?: number;
  /** Marks the small starter round for the Easy track. */
  starter?: boolean;
}

export interface DeckOption {
  id: string;
  label: string;
  hint: string;
  default: boolean;
}

export interface ProgressGroup {
  tag: string;
  label: string;
}

/** "unseen": a one-at-a-time round ended before this item came up. */
export type ItemState = "open" | "found" | "missed" | "unseen";

export interface Board {
  setState(id: string, state: ItemState): void;
  /** Briefly highlight a just-found item. */
  flash(id: string): void;
  /** Highlight the item being asked about (one-at-a-time games). */
  setCurrent?(id: string | null): void;
  /** Called when the player clicks an item on the board, to jump to it. */
  onPick?(handler: (id: string) => void): void;
  /** After the game, let the player hover/tap to learn names. */
  setExplore(on: boolean): void;
  destroy(): void;
}

export interface BoardContext {
  container: HTMLElement;
  deck: Deck;
  /** Items in play this round. */
  items: Item[];
  variant: Variant;
  options: Record<string, boolean>;
}

export interface Deck {
  id: string;
  title: string;
  blurb: string;
  /** Short word used in "42 / 197 countries". */
  noun: string;
  items: Item[];
  variants: Variant[];
  options: DeckOption[];
  /** Applies option toggles on top of the variant filter. */
  applyOptions?: (items: Item[], options: Record<string, boolean>) => Item[];
  progressGroups?: ProgressGroup[];
  /** Message when the player names something real that isn't in this round. */
  outsideHint?: (item: Item, options: Record<string, boolean>) => string | null;
  createBoard: (ctx: BoardContext) => Board | Promise<Board>;
  /**
   * "any": type answers in any order (Countries of the World).
   * "prompt": one item at a time is shown, and you name it (Flags, Capitals).
   * "click": one name at a time is shown, and you click it on the board (Seas & Lakes).
   */
  mode?: "any" | "prompt" | "click";
  /** What to show for the current item in "prompt" mode. */
  renderPrompt?: (item: Item) => Node;
  /** Longer label for result lists, e.g. "France: Paris". */
  describe?: (item: Item) => string;
  placeholder?: string;
}
