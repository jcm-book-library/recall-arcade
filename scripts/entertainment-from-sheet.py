#!/usr/bin/env python3
"""Builds src/decks/entertainment-data.ts from a saved snapshot of the owner's Entertainment sheet tabs.

The game never reads the sheet. A session saves the tabs as one JSON file, then runs:

    python3 scripts/entertainment-from-sheet.py --snapshot sheet-snapshot.json

The snapshot is an object with one list per tab, and row 0 of each list is the header:
    oscars, boxOfficeFilms, boxOfficeFranchises, boxOfficeAsOf (a date such as "7 Nov 2026"),
    goldLogies, hottest100, milesFranklin, movies, whoPlayedWho

Columns are found by their header words, so they can move around and new ones can be added.

HOW THE OWNER ADDS MORE (no code changes needed):
  * Movies tab: add a row (Title, Year, Film or TV, Clue 1 (hard), Clue 2, Clue 3 (easy), Emoji clue).
      - Optional column "Australian?": put Yes to put the title in the Australian round.
      - Optional column "Also accept (;)": other names that count, split with semicolons.
      - A row with no title or no year is skipped. Ids come from the title and year, never the row.
  * Who Played Who tab: add a row. Optional column "Australian?" = Yes puts it in the Australian round.
  * Then run the command above and rebuild.

Ids (stable, never based on row order):
    osc-<ceremony number>-picture|actor|actress|director     bo-<film slug>   bo-fr-<franchise slug>
    logie-<year>   h100-<year>   h100x-<year> (special countdown)   mf-<year>
    mv-<title slug>-<year>       wpw-<actor slug>-<character slug>
Standard library only.
"""
import argparse
import json
import re
import unicodedata


def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"\bsaint\b", "st", s).replace("&", " and ")
    s = re.sub(r"^the\s+", "", s.strip())
    return re.sub(r"[^a-z0-9]", "", s)


def slug(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def cell(row, col):
    v = row.get(col) if isinstance(row, dict) else None
    if v is None:
        return ""
    return str(v).strip()


def table(rows):
    """Turns [header, row, row...] into a list of dicts keyed by header (lower case)."""
    if not rows:
        return []
    head = [str(h).strip().lower() for h in rows[0]]
    out = []
    for r in rows[1:]:
        if not isinstance(r, list):
            continue
        out.append({head[i]: (r[i] if i < len(r) else "") for i in range(len(head))})
    return out


def find(row, *words):
    """The value of the first column whose header contains all the words."""
    for k, v in row.items():
        if all(w in k for w in words):
            return "" if v is None else str(v).strip()
    return ""


# ---------- names and answers ----------

HONOURS = ("captain ", "dr ", "dr. ", "mr ", "mrs ", "queen ", "agent ", "lieutenant ", "coach ", "don ")


def uniq(items):
    seen, out = set(), []
    for a in items:
        a = a.strip()
        if a and norm(a) and norm(a) not in seen:
            seen.add(norm(a))
            out.append(a)
    return out


def title_aliases(title):
    """Short forms of a film or show title that should count. The matcher already ignores case,
    accents, punctuation and a leading "The"."""
    out = [title]
    t = re.sub(r"\s+or\s*\(.*$", "", title)  # "Birdman or (The Unexpected Virtue of Ignorance)"
    t = re.sub(r"\s*\(.*?\)", "", t).strip()
    out.append(t)
    if ":" in t:
        a, b = [p.strip() for p in t.split(":", 1)]
        out += [a, b]
    if ", " in t:
        out.append(t.split(", ", 1)[1])
    m = re.match(r"^(.+?) and the (.+)$", t)
    if m and len(m.group(1).split()) >= 2 and len(m.group(1)) >= 7:
        out += [m.group(1), "the " + m.group(2)]
    if " – " in t:  # "Part 2" subtitles with a dash
        out.append(t.split(" – ")[0])
    return uniq(out)


# Short forms a rule can't guess. Add to this list freely; it only widens what counts.
TITLE_EXTRA = {
    "E.T. the Extra-Terrestrial": ["E.T.", "ET", "Extra-Terrestrial", "Extra Terrestrial"],
    "The Adventures of Priscilla, Queen of the Desert": ["Priscilla", "Priscilla Queen of the Desert"],
    "Skippy the Bush Kangaroo": ["Skippy"],
    "MasterChef Australia": ["MasterChef", "Master Chef"],
    "Star Wars": ["Star Wars: A New Hope", "A New Hope", "Star Wars Episode IV"],
    "Harry Potter and the Philosopher's Stone": ["Harry Potter", "Sorcerer's Stone", "Harry Potter and the Sorcerer's Stone"],
    "The Lord of the Rings: The Fellowship of the Ring": ["Fellowship of the Ring", "Fellowship", "Lord of the Rings"],
    "Raiders of the Lost Ark": ["Indiana Jones and the Raiders of the Lost Ark"],
    "Home and Away": ["Home & Away"],
    "The Lord of the Rings: The Return of the King": ["Return of the King", "Lord of the Rings"],
    "The Avengers": ["Marvel's The Avengers", "Marvels Avengers"],
    "Dr. No": ["Doctor No"],
    # The owner's 200 (added 8 Nov 2026)
    "Amalie": ["Amélie", "Amelie"],
    "Leon: The Professional": ["Léon", "Leon", "The Professional", "Léon: The Professional"],
    "Se7en": ["Seven"],
    "BlacKkKlansman": ["Black Klansman"],
    "12 Angry Men": ["Twelve Angry Men"],
    "Star Wars: Episode V - The Empire Strikes Back": ["The Empire Strikes Back", "Empire Strikes Back", "Star Wars Episode V"],
    "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb": ["Dr Strangelove", "Doctor Strangelove"],
    "The Lord of the Rings: The Two Towers": ["The Two Towers", "Two Towers", "Lord of the Rings"],
    "Dune: Part One": ["Dune"],
    "Dune: Part Two": ["Dune 2"],
    "Terminator 2: Judgment Day": ["Terminator 2", "T2"],
    "Once Upon a Time... in Hollywood": ["Once Upon a Time in Hollywood"],
    "Planes, Trains & Automobiles": ["Planes, Trains and Automobiles"],
    "Spider-Man: Into the Spider-Verse": ["Into the Spider-Verse", "Spiderverse"],
    "Spider-Man: Across the Spider-Verse": ["Across the Spider-Verse"],
    "Indiana Jones and the Last Crusade": ["The Last Crusade", "Last Crusade"],
    "The Godfather Part II": ["Godfather 2", "The Godfather 2", "Godfather Part 2"],
    "Paddington 2": ["Paddington Two"],
    "Nosferatu: A Symphony of Horror": ["Nosferatu"],
    "Furiosa: A Mad Max Saga": ["Furiosa"],
    "The Hitchhiker's Guide to the Galaxy": ["Hitchhikers Guide", "Hitchhiker's Guide"],
    "2001: A Space Odyssey": ["A Space Odyssey"],
}

# Oscar and box office titles that need an extra short form.
PERSON_EXTRA = {"Robert Downey Jr.": ["Robert Downey", "Downey"]}

# Which films or shows are Australian, for the Australian round. The owner can also add an
# "Australian?" column to the Movies tab and put Yes. Both count.
AUS_TITLES = {
    "Crocodile Dundee", "Muriel's Wedding", "The Castle", "Mad Max", "The Adventures of Priscilla, Queen of the Desert",
    "Strictly Ballroom", "Red Dog", "Neighbours", "Home and Away", "Kath & Kim", "Bluey", "Underbelly",
    "MasterChef Australia", "Skippy the Bush Kangaroo", "Blue Heelers", "Round the Twist",
}
# Actors for the Australian starter round of Who Played Who (plus any Australian title above).
AUS_ACTORS = {
    "Paul Hogan", "Toni Collette", "Mel Gibson", "Hugo Weaving", "Nicole Kidman", "Eric Bana", "Geoffrey Rush",
    "Kylie Minogue", "Ray Meagher", "Jane Turner", "Michael Caton", "Lisa McCune", "Rebel Wilson", "Hugh Jackman",
    "Chris Hemsworth", "Cate Blanchett", "Russell Crowe", "Margot Robbie", "Heath Ledger",
}

# Number ones that are not shown to players (the title is not suitable for all ages). They stay
# in the list as a note, so the years line up.
HIDE_H100 = {"Asshole"}

SURNAME_SUFFIX = {"jr", "jr.", "sr", "sr.", "ii", "iii"}


def person_aliases(name):
    parts = name.split()
    out = [name]
    core = [p for p in parts if p.lower() not in SURNAME_SUFFIX]
    if len(core) > 1:
        out.append(" ".join(core))
        out.append(core[-1])
        if len(core) > 2:
            out.append(core[0] + " " + core[-1])
    out += PERSON_EXTRA.get(name, [])
    return uniq(out)


def character_aliases(name, also):
    out = [name] + also
    low = name.lower()
    for h in HONOURS:
        if low.startswith(h):
            out.append(name[len(h):])
    out += title_aliases(name)
    return uniq(out)


# ---------- Sport-style lists (Oscars and the Aussie Awards) ----------

def build_list(lid, title, entries, accept_for):
    """entries: dicts with id, year, label, shown, names, and optional sub, extra, note, gid, off, cancelled.
    accept_for(name) gives the typed forms for one champion name."""
    champs = {}
    for e in entries:
        e["who"] = []
        if e.get("cancelled"):
            continue
        for nm in e["names"]:
            key = norm(nm)
            c = champs.setdefault(key, {"name": nm, "accept": set()})
            c["accept"].update(accept_for(nm))
            e["who"].append(key)
    owners = {}
    for key, c in champs.items():
        for a in c["accept"]:
            owners.setdefault(norm(a), set()).add(key)
    out = {}
    for key, c in champs.items():
        safe = sorted(a for a in c["accept"] if len(owners[norm(a)]) == 1 or norm(a) == norm(c["name"]))
        loose = sorted(a for a in c["accept"] if a not in safe)
        out[key] = {"name": c["name"], "accept": safe, **({"loose": loose} if loose else {})}
    wins = []
    for e in entries:
        w = {"id": e["id"], "year": e["year"], "label": e["label"], "shown": e["shown"], "who": e["who"]}
        for k in ("sub", "extra", "note", "gid", "off", "cancelled"):
            if e.get(k):
                w[k] = e[k]
        wins.append(w)
    return {"id": lid, "title": title, "wins": wins, "champs": out}


def sentence(names):
    return names[0] if len(names) < 2 else ", ".join(names[:-1]) + " and " + names[-1]


def split_people(cellv):
    return [p.strip() for p in re.split(r"\s+(?:&|and)\s+", cellv) if p.strip()]


def check_unique(entries, lid):
    seen = set()
    for e in entries:
        if e["id"] in seen:
            raise SystemExit(f"{lid}: id {e['id']} appears twice")
        seen.add(e["id"])


def oscar_lists(rows):
    kinds = [("picture", "Best Picture", "best picture", None),
             ("actor", "Best Actor", "best actor", "actor's film"),
             ("actress", "Best Actress", "best actress", "actress's film"),
             ("director", "Best Director", "best director", "director's film")]
    lists = {k: [] for k, *_ in kinds}
    for r in rows:
        try:
            num = int(float(r.get("ceremony", "")))
            cy = int(float(find(r, "ceremony", "year")))
            fy = int(float(find(r, "film", "year")))
        except ValueError:
            continue
        film_label = f"{fy}–{str(fy + 1)[-2:]}" if num <= 6 else str(fy)
        note = str(r.get("note", ""))
        for key, header, col, filmcol in kinds:
            val = cell(r, col)
            if not val:
                continue  # no award that year: skipped
            film = cell(r, filmcol) if filmcol else ""
            names = [val] if key in ("picture", "actor", "actress") else split_people(val)
            shown_extra = ""
            e_note = ""
            films = [film] if film else []
            if key in ("actor", "actress"):
                m = re.search(rf"Best {header.split()[1]} tied: (.+?) \((.+?)\) and (.+?) \((.+?)\) shared", note)
                if m:
                    names = [m.group(1).strip(), m.group(3).strip()]
                    films = [m.group(2).strip(), m.group(4).strip()]
                    e_note = "This award was a tie. Either name counts."
            if key == "director" and len(names) > 1:
                e_note = "This award was shared. Either name counts."
            if films:
                shown_extra = "Film: " + sentence(films) if key != "picture" else ""
            lists[key].append({
                "id": f"osc-{num}-{key}", "year": cy, "label": str(cy), "gid": str(num),
                "sub": f"{cy} ceremony (films of {film_label})",
                "shown": val if key == "picture" else sentence(names),
                "names": names if key != "picture" else [val],
                "extra": shown_extra, "note": e_note,
            })
    out = []
    for key, header, *_ in kinds:
        ents = sorted(lists[key], key=lambda e: -int(e["gid"]))
        check_unique(ents, key)
        acc = title_aliases if key == "picture" else person_aliases
        out.append(build_list(f"oscar_{key}", f"Oscars: {header}", ents, lambda n, acc=acc: acc(n)))
    return out


def logie_list(rows):
    ents = []
    for r in rows:
        y = find(r, "year")
        if not y.isdigit():
            continue
        who = find(r, "gold logie winner")
        year = int(y)
        base = {"id": f"logie-{year}", "year": year, "label": str(year)}
        if not who:
            ents.append({**base, "shown": "No award", "names": [], "cancelled": True, "off": "No award",
                         "note": "No Gold Logie was awarded this year."})
            continue
        extra = find(r, "show")
        note = ""
        m = re.search(r"more than one winner this year: (.+)$", find(r, "note"))
        if m:
            others = []
            for part in re.split(r";\s*", m.group(1).rstrip(".")):
                nm = re.sub(r"\s*\(.*\)\s*$", "", part).strip()
                pair = re.match(r"^(\w+) and (\w+ \w+)$", nm)  # "Bob and Dolly Dyer"
                if pair:
                    nm = f"{pair.group(1)} {pair.group(2).split()[1]}, {pair.group(2)}"
                elif " and " in nm:  # "Neil Armstrong and Buzz Aldrin"
                    nm = nm.replace(" and ", ", ")
                others += [n for n in nm.split(", ") if n]
            if others:
                note = "Also honoured that year: " + sentence(others) + "."
        ents.append({**base, "shown": who, "names": [who], "extra": ("Show: " + extra.split(" / ")[0]) if extra else "", "note": note})
    ents.sort(key=lambda e: -e["year"])
    check_unique(ents, "logie")
    return build_list("logie", "Gold Logie winners", ents, person_aliases)


def song_aliases(name):
    return title_aliases(name)


def hottest_lists(rows):
    normal, special = [], []
    for r in rows:
        y = find(r, "year")
        if not y.isdigit():
            continue
        year = int(y)
        song, artist = find(r, "number one"), find(r, "artist")
        is_special = find(r, "special").lower() == "yes"
        base = {"year": year, "label": str(year)}
        pre = "h100x" if is_special else "h100"
        if not song:
            ent = {**base, "id": f"{pre}-{year}", "shown": "Not held", "names": [], "cancelled": True, "off": "Not held",
                   "note": "There was no Hottest 100 this year."}
        elif song in HIDE_H100:
            ent = {**base, "id": f"{pre}-{year}", "shown": "Left out", "names": [], "cancelled": True, "off": "Left out",
                   "note": "The number one this year is left out of the quiz."}
        else:
            ent = {**base, "id": f"{pre}-{year}", "shown": song, "names": [song], "extra": f"Artist: {artist}" if artist else ""}
            if is_special:
                n = find(r, "note")
                ent["sub"] = "Special countdown"
                if n.lower().startswith("albums countdown"):
                    ent["sub"] = "Albums countdown"
                    ent["note"] = n
                elif "all time" in n.lower() or "all-time" in n.lower():
                    ent["sub"] = "All-time countdown"
        (special if is_special else normal).append(ent)
    for lst in (normal, special):
        lst.sort(key=lambda e: -e["year"])
    check_unique(normal, "h100")
    check_unique(special, "h100x")
    return [build_list("h100", "Hottest 100 number ones", normal, song_aliases),
            build_list("h100x", "All-time and special countdowns", special, song_aliases)]


def miles_list(rows):
    ents = []
    for r in rows:
        y = find(r, "year")
        if not y.isdigit():
            continue
        year = int(y)
        book, author, note = find(r, "winner"), find(r, "author"), find(r, "note")
        base = {"id": f"mf-{year}", "year": year, "label": str(year)}
        if not book:
            ents.append({**base, "shown": "No award", "names": [], "cancelled": True, "off": "No award",
                         "note": "No award this year. The judges held it back."})
            continue
        books, authors = [book], [author]
        m = re.match(r"Joint winners: (.+) by (.+?) and (.+) by (.+?)\.$", note)
        if m:
            books, authors = [m.group(1), m.group(3)], [m.group(2), m.group(4)]
        ents.append({**base, "shown": sentence(books), "names": books,
                     "extra": ("Author: " if len(authors) == 1 else "Authors: ") + sentence(authors),
                     "note": "Joint winners. Either book counts." if len(books) > 1 else ""})
    ents.sort(key=lambda e: -e["year"])
    check_unique(ents, "mf")
    return build_list("mf", "Miles Franklin winners", ents, title_aliases)


# ---------- Box office ----------

def box_data(films_rows, fr_rows):
    films = []
    for r in films_rows:
        name = find(r, "film")
        gross = find(r, "gross")
        if not name or not gross:
            continue
        films.append({"name": name, "year": int(float(find(r, "year") or 0)), "gross": int(float(gross))})
    titles = [f["name"] for f in films]
    # A short form counts only if it points at exactly one film in the list.
    claims = {}
    for f in films:
        for a in set(title_aliases(f["name"]) + TITLE_EXTRA.get(f["name"], [])):
            claims.setdefault(norm(a), set()).add(f["name"])
    for f in films:
        f["accept"] = uniq([f["name"]] + [a for a in title_aliases(f["name"]) + TITLE_EXTRA.get(f["name"], [])
                                           if claims[norm(a)] == {f["name"]}])
        f["id"] = "bo-" + slug(f["name"])
    ids = [f["id"] for f in films]
    for f in films:
        if ids.count(f["id"]) > 1:
            f["id"] += f"-{f['year']}"
    frs = []
    for r in fr_rows:
        name = find(r, "franchise")
        gross = find(r, "gross")
        if not name or not gross:
            continue
        frs.append({"id": "bo-fr-" + slug(name), "name": name, "gross": int(float(gross)),
                    "films": int(float(find(r, "films") or 0)),
                    "accept": uniq([name] + TITLE_EXTRA.get(name, []))})
    films.sort(key=lambda f: -f["gross"])
    frs.sort(key=lambda f: -f["gross"])
    check_unique(films, "boxoffice films")
    check_unique(frs, "boxoffice franchises")
    return films, frs


# ---------- Movies and Who Played Who ----------

def movie_data(rows):
    out = []
    for r in rows:
        title = find(r, "title")
        y = find(r, "year")
        if not title or not re.fullmatch(r"\d{4}", y.split(".")[0] if y else ""):
            continue
        year = int(y.split(".")[0])
        kind = find(r, "film or tv").lower()
        kind = "tv" if kind.startswith("tv") else "film"
        clues = [find(r, "clue 1"), find(r, "clue 2"), find(r, "clue 3")]
        if not all(clues):
            print(f"  skipped (needs all three clues): {title}")
            continue
        also = [a for a in re.split(r";", find(r, "also accept")) if a.strip()]
        aus = find(r, "australian").lower() == "yes" or title in AUS_TITLES
        out.append({
            "id": f"mv-{slug(title)}-{year}", "title": title, "year": year, "kind": kind,
            "clues": clues, "emoji": find(r, "emoji"), "aus": aus,
            "accept": uniq(title_aliases(title) + TITLE_EXTRA.get(title, []) + also),
        })
    check_unique(out, "movies")
    out.sort(key=lambda m: (m["year"], m["title"]))
    return out


def who_played(rows, aus_titles):
    out = []
    for r in rows:
        actor, char = find(r, "actor"), find(r, "character")
        if not actor or not char:
            continue
        if "wikipedia" in actor:  # never happens, header guard
            continue
        title = find(r, "film or show")
        also = [a for a in find(r, "also accept").split(";") if a.strip()]
        y = find(r, "year")
        wiki = ""
        for k, v in r.items():
            if "wikipedia" in k:
                wiki = str(v).strip()
        out.append({
            "id": f"wpw-{slug(actor)}-{slug(char)}", "actor": actor, "character": char, "title": title,
            "year": int(float(y)) if y else 0, "wiki": wiki or actor,
            "charAccept": character_aliases(char, also), "actorAccept": person_aliases(actor),
            "aus": actor in AUS_ACTORS or title in aus_titles or find(r, "australian").lower() == "yes",
            "note": find(r, "note"),
        })
    check_unique(out, "whoPlayedWho")
    return out


# ---------- writing the file ----------

def js(v):
    return json.dumps(v, ensure_ascii=False, separators=(", ", ": "))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--snapshot", required=True)
    ap.add_argument("--out", default="src/decks/entertainment-data.ts")
    a = ap.parse_args()
    with open(a.snapshot, encoding="utf8") as f:
        snap = json.load(f)
    t = lambda name: table(snap.get(name, []))

    lists = oscar_lists(t("oscars")) + [logie_list(t("goldLogies"))] + hottest_lists(t("hottest100")) + [miles_list(t("milesFranklin"))]
    films, frs = box_data(t("boxOfficeFilms"), t("boxOfficeFranchises"))
    asof = snap.get("boxOfficeAsOf", "")
    asof = asof if isinstance(asof, str) and len(asof) > 5 else "7 Nov 2026"
    movies = movie_data(t("movies"))
    aus_titles = {m["title"] for m in movies if m["aus"]}
    wpw = who_played(t("whoPlayedWho"), aus_titles)

    ts = [
        "// GENERATED FILE. Do not edit by hand.",
        "// Made by scripts/entertainment-from-sheet.py from a saved snapshot of the owner's Entertainment sheet tabs.",
        "// To change it, fix the sheet, save the tabs as JSON, then run:",
        "//   python3 scripts/entertainment-from-sheet.py --snapshot sheet-snapshot.json",
        "// The script's top note says how to add movies and what the optional columns are.",
        "",
        'import type { SportList } from "./sport-data";',
        "",
        "/** A film or show for Three Clues and When Did It Come Out? `clues` run hard to easy. `accept` is every typed form that counts. */",
        "export interface EntMovie { id: string; title: string; year: number; kind: \"film\" | \"tv\"; clues: [string, string, string]; emoji: string; aus: boolean; accept: string[] }",
        "export interface BoxFilm { id: string; name: string; year: number; gross: number; accept: string[] }",
        "export interface BoxFranchise { id: string; name: string; gross: number; films: number; accept: string[] }",
        "export interface WhoPlayed { id: string; actor: string; character: string; title: string; year: number; wiki: string; charAccept: string[]; actorAccept: string[]; aus: boolean; note: string }",
        "",
        f"export const BOX_AS_OF = {js(asof)};",
        "",
        "export const ENT_LISTS: Record<string, SportList> = {",
    ]
    for L in lists:
        ts.append(f'  {L["id"]}: {{')
        ts.append(f'    id: {js(L["id"])}, title: {js(L["title"])},')
        ts.append("    champs: {")
        for k, c in L["champs"].items():
            ts.append(f"      {js(k)}: {js(c)},")
        ts.append("    },")
        ts.append("    wins: [")
        for w in L["wins"]:
            ts.append("      " + js(w) + ",")
        ts.append("    ],")
        ts.append("  },")
    ts.append("};")
    ts.append("")
    for name, typ, data in (("MOVIES", "EntMovie", movies), ("BOX_FILMS", "BoxFilm", films),
                            ("BOX_FRANCHISES", "BoxFranchise", frs), ("WHO_PLAYED", "WhoPlayed", wpw)):
        ts.append(f"export const {name}: {typ}[] = [")
        for d in data:
            ts.append("  " + js(d) + ",")
        ts.append("];")
        ts.append("")
    with open(a.out, "w", encoding="utf8") as f:
        f.write("\n".join(ts))
    for L in lists:
        asked = [w for w in L["wins"] if not w.get("cancelled")]
        print(f'{L["id"]:16} rows {len(L["wins"]):4}  asked {len(asked):4}  champions {len(L["champs"]):4}')
    print(f"movies {len(movies)} (films {sum(m['kind'] == 'film' for m in movies)}, tv {sum(m['kind'] == 'tv' for m in movies)}, "
          f"australian {sum(m['aus'] for m in movies)}), box films {len(films)}, franchises {len(frs)}, "
          f"who played who {len(wpw)} (australian {sum(w['aus'] for w in wpw)})")


if __name__ == "__main__":
    main()
