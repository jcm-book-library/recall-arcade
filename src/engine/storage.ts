// Remembers progress in this browser. Every access is guarded because
// storage can be unavailable (private windows, blocked site data).

const KEY = "learning-arcade:v1";

export interface ItemStats {
  found: number;
  missed: number;
  last: number;
}

export interface GameRecord {
  deck: string;
  variant: string;
  score: number;
  total: number;
  seconds: number;
  date: number;
}

interface SaveData {
  items: Record<string, ItemStats>;
  games: GameRecord[];
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as SaveData;
  } catch {
    /* storage unavailable */
  }
  return { items: {}, games: [] };
}

function save(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}

export function recordGame(
  record: GameRecord,
  foundIds: string[],
  missedIds: string[],
) {
  const data = load();
  const now = Date.now();
  const bump = (id: string, field: "found" | "missed") => {
    const key = `${record.deck}:${id}`;
    const s = (data.items[key] ??= { found: 0, missed: 0, last: 0 });
    s[field] += 1;
    s.last = now;
  };
  foundIds.forEach((id) => bump(id, "found"));
  missedIds.forEach((id) => bump(id, "missed"));
  data.games.push(record);
  data.games = data.games.slice(-200);
  save(data);
}

export function bestFor(deck: string, variant: string): GameRecord | undefined {
  return load()
    .games.filter((g) => g.deck === deck && g.variant === variant)
    .sort((a, b) => b.score / b.total - a.score / a.total || a.seconds - b.seconds)[0];
}

export function gamesFor(deck: string): GameRecord[] {
  return load().games.filter((g) => g.deck === deck);
}

/** Items missed most often, as a fraction of times seen. */
export function weakSpots(deck: string, limit = 8): { id: string; stats: ItemStats }[] {
  const prefix = `${deck}:`;
  return Object.entries(load().items)
    .filter(([k, s]) => k.startsWith(prefix) && s.missed > 0)
    .map(([k, stats]) => ({ id: k.slice(prefix.length), stats }))
    .sort(
      (a, b) =>
        b.stats.missed / (b.stats.found + b.stats.missed) -
          a.stats.missed / (a.stats.found + a.stats.missed) ||
        b.stats.missed - a.stats.missed,
    )
    .slice(0, limit);
}

// Remembers the last round settings per deck, e.g. Europe + territories.
const PREFS = "learning-arcade:prefs";

export interface DeckPrefs {
  variant?: string;
  minutes?: number;
  options?: Record<string, boolean>;
}

export function loadPrefs(deck: string): DeckPrefs {
  try {
    return (JSON.parse(localStorage.getItem(PREFS) ?? "{}") as Record<string, DeckPrefs>)[deck] ?? {};
  } catch {
    return {};
  }
}

export function savePrefs(deck: string, prefs: DeckPrefs) {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS) ?? "{}") as Record<string, DeckPrefs>;
    all[deck] = prefs;
    localStorage.setItem(PREFS, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}
