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

export type ItemState = "open" | "found" | "missed";

export interface Board {
  setState(id: string, state: ItemState): void;
  /** Briefly highlight a just-found item. */
  flash(id: string): void;
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
  createBoard: (ctx: BoardContext) => Board | Promise<Board>;
}
