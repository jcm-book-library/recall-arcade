// NAMES OF PEOPLE for Fill the List (Leaders & Changemakers, Who Lived When?): what a person can be typed as.
//
// Every person is accepted under their full name and their listed aliases (the deck's own, "FDR", "Menzies"), and
// under their SHORT NAME: the surname ("Mozart" for Wolfgang Amadeus Mozart), or for a name with an epithet or a
// place the first name ("Alexander" for Alexander the Great, "Eleanor" for Eleanor of Aquitaine). Titles up front
// (Queen, King, Tsar, Emperor, Lord, Sir) are optional, and a trailing Jr, II or III is ignored when finding the surname.
//
// A short name only counts when it is UNIQUE among the people compared (the round on screen). When two people share
// it ("Wright" for Wilbur and Orville) it is `loose` for both: accepted In Order, where the row is known, and refused
// in Any Order with "type the full name". The comparison is made within a round, so "Johnson" is fine in a round with
// one Johnson, and loose in one with two.
export interface Person {
  id: string;
  name: string;
  aliases?: string[];
}

export interface NameForms {
  accept: string[];
  loose: string[];
}

const TITLES = new Set(["queen", "king", "tsar", "emperor", "lord", "sir", "saint", "st", "mahatma", "empress", "pope", "president"]);
const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v", "vi", "vii", "viii", "i"]);
/** Words that are never a short name on their own. */
const NOT_A_NAME = new Set(["the", "of", "de", "da", "van", "von", "der", "la", "le", "great", "conqueror", "magnificent", "impaler", "hun", "scots", "wales", "jr", "sr", "ii", "iii"]);

const key = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** The short names a person can go by (before checking whether another person has the same). */
export function shortNames(name: string): string[] {
  const clean = name.replace(/\./g, " ").replace(/\s+/g, " ").trim();
  const words = clean.split(/[\s]+/);
  const stripped = words.filter((w, i) => !(i < words.length - 1 && TITLES.has(w.toLowerCase().replace(/,/g, ""))));
  const base = stripped.join(" ");
  const out: string[] = [];
  const cut = base.match(/^(.+?)(?:,|\s+the\s|\s+of\s)/i);
  if (cut) {
    // "Alexander the Great", "Eleanor of Aquitaine", "Mary, Queen of Scots": the first part is the name.
    out.push(cut[1].trim());
  } else {
    const ws = base.split(" ").filter((w) => !SUFFIXES.has(w.toLowerCase().replace(/,/g, "")));
    const last = ws[ws.length - 1];
    if (last && !NOT_A_NAME.has(last.toLowerCase())) out.push(last);
  }
  // A title-less version of the whole name ("Queen Victoria" -> "Victoria", "Tsar Nicholas II" -> "Nicholas II").
  if (base !== clean) out.push(base);
  return out.filter((s) => key(s).length >= 3);
}

/** Accepted and loose names for each person in a group (one round). */
export function nameFormsFor(people: Person[]): Map<string, NameForms> {
  const shorts = new Map<string, Set<string>>();
  const exactKeys = new Map<string, Set<string>>();
  const own = new Map<string, { exact: string[]; short: string[] }>();
  for (const p of people) {
    const exact = [p.name, ...(p.aliases ?? [])];
    const short = shortNames(p.name);
    own.set(p.id, { exact, short });
    for (const e of exact) {
      const k = key(e);
      if (!exactKeys.has(k)) exactKeys.set(k, new Set());
      exactKeys.get(k)!.add(p.id);
    }
    for (const s of short) {
      const k = key(s);
      if (!shorts.has(k)) shorts.set(k, new Set());
      shorts.get(k)!.add(p.id);
    }
  }
  const out = new Map<string, NameForms>();
  for (const p of people) {
    const { exact, short } = own.get(p.id)!;
    const accept = [...exact];
    const loose: string[] = [];
    for (const s of short) {
      const k = key(s);
      const sharers = new Set([...(shorts.get(k) ?? []), ...(exactKeys.get(k) ?? [])]);
      sharers.delete(p.id);
      // Another person's own full name or alias is theirs, not a short name for this one.
      const theirs = [...(exactKeys.get(k) ?? [])].some((id) => id !== p.id);
      if (theirs && !exactKeys.get(k)!.has(p.id)) continue;
      (sharers.size ? loose : accept).push(s);
    }
    out.set(p.id, { accept, loose });
  }
  return out;
}
