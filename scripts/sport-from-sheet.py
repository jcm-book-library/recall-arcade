#!/usr/bin/env python3
"""Builds src/decks/sport-data.ts from two saved dumps of the owner's quiz-lists sheet.

The game never reads the sheet. A session reads two ranges (read only) and saves the JSON that
the Sheets tool returns, then runs:

    python3 scripts/sport-from-sheet.py --sports Sports.json --clubs Clubs.json

    Sports.json   the values of tab "Sports", range A1:Z400   ({"values": [[...], ...]})
    Clubs.json    the values of tab "Clubs",  range A1:H500

Sports columns (row 1 is the header, data starts on row 2, newest first):
    A:B  Olympic hosts          C:D  NRL premiers        E:F  AFL (VFL) premiers
    G:H  F1 world champions     I:J  European Cup / Champions League (year = season end)
    K:L  English champions (year = season end)           M:N  FIFA World Cup winners
    O:R  Bathurst 1000: year, then up to three drivers
    T:Z  100 m world record: mark, wind, competitor (SURNAME in capitals), date of birth,
         country, venue, date. (Column R can hold stray names in the record rows; it is only
         read for Bathurst, and only on rows that have a Bathurst year.)

Clubs columns: Sport | Name in the list | Current / best-known name | Link |
    Accept current name? | Also accept (;) | Note shown after answering | Check

Ids stay the same when the sheet grows: "<list>-<year>", "nrl-1997-sl" / "nrl-1997-arl",
"wr-<yyyymmdd>-<surname>". Standard library only.
"""
import argparse
import json
import re
import unicodedata

# Football names and place names that the sheet's Clubs tab doesn't cover. Short forms people really use.
EXTRA = {
    "Bayern Munich": ["Bayern", "FC Bayern", "Bayern München"],
    "Borussia Dortmund": ["Dortmund", "BVB"],
    "Juventus": ["Juve"],
    "Porto": ["FC Porto"],
    "Marseille": ["Olympique de Marseille", "Olympique Marseille"],
    "Barcelona": ["FC Barcelona", "Barca"],
    "Real Madrid": ["Real"],
    "PSV Eindhoven": ["PSV"],
    "Steaua București": ["Steaua Bucharest", "Steaua Bucuresti"],
    "Hamburger SV": ["Hamburg", "HSV"],
    "Aston Villa": ["Villa"],
    "Nottingham Forest": ["Forest", "Notts Forest"],
    "Leeds United": ["Leeds"],
    "Leicester City": ["Leicester"],
    "Blackburn Rovers": ["Blackburn"],
    "Newcastle United": ["Newcastle"],
    "Derby County": ["Derby"],
    "Ipswich Town": ["Ipswich"],
    "Huddersfield Town": ["Huddersfield"],
    "Preston North End": ["Preston"],
    "Sheffield United": ["Sheff Utd", "Sheffield Utd"],
    "Portsmouth": ["Pompey"],
    "Red Star Belgrade": ["Red Star"],
    "Shane van Gisbergen": ["van Gisbergen", "Gisbergen", "SVG"],
    "Juan Manuel Fangio": ["Fangio", "Juan Fangio"],
    "Michael Schumacher": ["Schumi"],
    "Peter Brock": ["Brocky"],
    "Dick Johnson": ["Richard Johnson"],
    "Kimi Antonelli": ["Andrea Kimi Antonelli"],
}

PLACE_EXTRA = {"Rio": ["Rio de Janeiro"], "Los Angeles": ["LA"], "Mexico City": ["Mexico"], "Beijing": ["Peking"],
               "Munich": ["München"], "Antwerp": ["Antwerpen"]}

CITY_FIX = {"Athina": "Athens", "Roma": "Rome", "København": "Copenhagen", "Beograd": "Belgrade",
            "Ciudad de México": "Mexico City"}

LISTS = [  # id, title, sheet year column, sheet name column
    ("olympics", "Olympic host cities", 0, 1),
    ("nrl", "NRL premiers", 2, 3),
    ("afl", "AFL premiers", 4, 5),
    ("f1", "F1 world champions", 6, 7),
    ("cl", "Champions League and European Cup", 8, 9),
    ("epl", "English champions", 10, 11),
    ("wc", "World Cup winners", 12, 13),
]
SEASON_LISTS = {"cl", "epl"}
PEOPLE = {"f1", "bathurst", "sprint"}

def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"\bsaint\b", "st", s).replace("&", " and ")
    s = re.sub(r"^the\s+", "", s.strip())
    return re.sub(r"[^a-z0-9]", "", s)

def cell(row, i):
    return row[i].strip() if i < len(row) and isinstance(row[i], str) else ""

def season_label(y):
    a = y - 1
    return f"{a}–{y}" if y % 100 == 0 else f"{a}–{str(y)[-2:]}"

def person_aliases(name):
    parts = name.split()
    out = {name}
    if len(parts) > 1:
        out.add(parts[-1])
        if len(parts) > 2:
            out.add(parts[0] + " " + parts[-1])
    return out

def sentence_case_name(caps):
    """'Usain BOLT' -> 'Usain Bolt'. Only the all-capital words change."""
    words = []
    for w in caps.split():
        letters = [c for c in w if c.isalpha()]
        if len(letters) > 1 and all(c.isupper() for c in letters):
            w = w[0] + w[1:].lower() if "-" not in w else "-".join(p.capitalize() for p in w.split("-"))
        words.append(w)
    return " ".join(words)

def load_values(path):
    with open(path, encoding="utf8") as f:
        data = json.load(f)
    return data["values"] if isinstance(data, dict) else data

def read_clubs(rows):
    clubs = {}  # (sport, listed name) -> dict
    for r in rows[1:]:
        if len(r) < 2 or not cell(r, 1):
            continue
        also = [a.strip() for a in cell(r, 5).split(";") if a.strip()]
        clubs[(cell(r, 0).lower(), cell(r, 1))] = {
            "current": cell(r, 2), "yes": cell(r, 4).lower() == "yes", "also": also, "note": cell(r, 6),
        }
    return clubs

def build_list(lid, title, entries, clubs, sport_key):
    """entries: list of dicts {id, year, label, shown, names:[listed names], note, stripped, cancelled, rec}."""
    champs = {}  # key -> {"name", "accept": set}
    for e in entries:
        e["who"] = []
        if e.get("stripped") or e.get("cancelled"):
            continue
        for listed in e["names"]:
            info = clubs.get((sport_key, listed)) if sport_key else None
            if info and info["yes"] and info["current"]:
                key = norm(info["current"])
            else:
                key = norm(listed)
            c = champs.setdefault(key, {"name": listed, "accept": set(), "first": True})
            acc = {listed}
            if info:
                acc.update(info["also"])
                if info["yes"] and info["current"]:
                    acc.add(info["current"])
                if info["note"] and not e.get("note"):
                    e["note"] = info["note"]
            if lid != "olympics":
                acc.update(EXTRA.get(listed, []))
            if lid == "olympics":
                acc.update(PLACE_EXTRA.get(listed, []))
            if lid in PEOPLE:
                acc.update(person_aliases(listed))
            c["accept"].update(acc)
            if c["first"]:  # entries are newest first, so the first name seen is the newest
                c["name"] = listed
                c["first"] = False
            e["who"].append(key)
    if lid == "nrl":  # both 1997 rows share the note about the two competitions
        both = [e for e in entries if e["year"] == 1997]
        note = next((e.get("note") for e in both if e.get("note")), None)
        for e in both:
            if note:
                e["note"] = note
    # A short name shared by two champions is "loose": fine when the year is known, not for
    # decade blocks, where typing it would fill in both.
    owners = {}
    for key, c in champs.items():
        for a in c["accept"]:
            owners.setdefault(norm(a), set()).add(key)
    out_champs = {}
    for key, c in champs.items():
        safe = sorted(a for a in c["accept"] if len(owners[norm(a)]) == 1 or norm(a) == norm(c["name"]))
        loose = sorted(a for a in c["accept"] if a not in safe)
        out_champs[key] = {"name": c["name"], "accept": safe, **({"loose": loose} if loose else {})}
    wins = []
    for e in entries:
        w = {"id": e["id"], "year": e["year"], "label": e["label"], "shown": e["shown"], "who": e["who"]}
        for k in ("note", "stripped", "cancelled", "rec"):
            if e.get(k):
                w[k] = e[k]
        wins.append(w)
    return {"id": lid, "title": title, "wins": wins, "champs": out_champs}

def simple_entries(rows, lid, ycol, ncol):
    entries, seen = [], {}
    for r in rows[1:]:
        y, name = cell(r, ycol), cell(r, ncol)
        if not y.isdigit() or not name:
            continue
        year = int(y)
        e = {"year": year, "label": season_label(year) if lid in SEASON_LISTS else str(year)}
        if name.upper() == "CANCELLED":
            e.update(cancelled=True, shown="Cancelled", names=[], id=f"{lid}-{year}",
                     note="No Games were held, because of the war.")
        elif name.endswith("(stripped)"):
            e.update(stripped=True, shown=name, names=[], id=f"{lid}-{year}")
        else:
            names = [n.strip() for n in name.split(" / ")]
            e.update(shown=" and ".join(names), names=names, id=f"{lid}-{year}")
        # a second row for the same year: NRL 1997 (two competitions)
        if year in seen:
            first = seen[year]
            if lid == "nrl" and year == 1997:
                # The row that names "Super League" is Brisbane's; the other is the ARL premier.
                sl, arl = (first, e) if "Super League" in first["shown"] else (e, first)
                sl["id"], arl["id"] = "nrl-1997-sl", "nrl-1997-arl"
            else:
                raise SystemExit(f"{lid}: {year} appears twice and has no rule for it")
        seen[year] = e
        entries.append(e)
    return entries

def bathurst_entries(rows):
    entries = []
    for r in rows[1:]:
        y = cell(r, 14)
        if not y.isdigit():
            continue
        drivers = [cell(r, i) for i in (15, 16, 17) if cell(r, i)]
        if not drivers:
            continue
        year = int(y)
        e = {"id": f"bathurst-{year}", "year": year, "label": str(year), "names": drivers,
             "shown": ", ".join(drivers[:-1]) + " and " + drivers[-1] if len(drivers) > 1 else drivers[0]}
        if 1960 <= year <= 1962:
            e["note"] = "This race was held at Phillip Island. Bathurst started in 1963."
        if year in (1997, 1998):
            e["note"] = "That year had two races. This is the V8 race."
        entries.append(e)
    return entries

def sprint_entries(rows):
    entries, ids = [], set()
    months = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
    for r in rows[1:]:
        mark = cell(r, 19)
        if not re.match(r"^\d+\.\d+h?$", mark):
            continue
        hand = mark.endswith("h")
        competitor = sentence_case_name(cell(r, 21))
        d, mon, yr = cell(r, 25).split()
        iso = f"{yr}-{months[mon]:02d}-{int(d):02d}"
        surname = re.sub(r"[^a-z]", "", norm(cell(r, 21).split()[-1]))
        wid = f"wr-{iso.replace('-', '')}-{surname}"
        while wid in ids:
            wid += "-2"
        ids.add(wid)
        venue = cell(r, 24)
        cc = re.search(r"\(([A-Z]{3})\)\s*$", venue)
        place_parts = [p for p in re.sub(r"\s*\([A-Z]{3}\)\s*$", "", venue).split(", ") if not re.fullmatch(r"[A-Z]{2}", p)]
        place = CITY_FIX.get(place_parts[-1], place_parts[-1])
        value = float(mark.rstrip("h"))
        rec = {"mark": value, "hand": hand, "wind": cell(r, 20), "venue": venue, "place": place,
               "country": cc.group(1) if cc else "", "date": iso, "dob": cell(r, 22), "cc": cell(r, 23)}
        entries.append({"id": wid, "year": int(yr), "label": mark.rstrip("h") + (" (hand-timed)" if hand else ""),
                        "shown": competitor, "names": [competitor], "rec": rec})
    return entries

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sports", required=True)
    ap.add_argument("--clubs", required=True)
    ap.add_argument("--out", default="src/decks/sport-data.ts")
    a = ap.parse_args()
    rows, club_rows = load_values(a.sports), load_values(a.clubs)
    clubs = read_clubs(club_rows)
    sport_key = {"nrl": "nrl", "afl": "afl", "epl": "football", "cl": "football", "wc": "football"}
    lists = []
    for lid, title, yc, nc in LISTS:
        lists.append(build_list(lid, title, simple_entries(rows, lid, yc, nc), clubs, sport_key.get(lid)))
    lists.append(build_list("bathurst", "Bathurst 1000 winners", bathurst_entries(rows), clubs, None))
    lists.append(build_list("sprint", "The fastest man alive", sprint_entries(rows), clubs, None))

    ts = ['// GENERATED FILE. Do not edit by hand.',
          '// Made by scripts/sport-from-sheet.py from two saved read-only dumps of the owner\'s quiz-lists sheet',
          '// (tabs "Sports" and "Clubs"). To change it, fix the sheet, save the two ranges as JSON, then run:',
          '//   python3 scripts/sport-from-sheet.py --sports Sports.json --clubs Clubs.json',
          '',
          '/** A champion: a club, country, city or person. `accept` names are safe to type for any year;',
          ' *  `loose` names (a surname shared with another champion) count only when the year is shown. */',
          'export interface SportChamp { name: string; accept: string[]; loose?: string[] }',
          'export interface SportRecord {',
          '  mark: number; hand: boolean; wind: string; venue: string; place: string; country: string; date: string; dob: string; cc: string;',
          '}',
          'export interface SportWin {',
          '  id: string; year: number; label: string;',
          '  /** The name as the list gives it ("Easts", "Brisbane Broncos (Super League)"). */',
          '  shown: string;',
          '  /** Champion keys (see SportList.champs). Empty for cancelled and stripped years. */',
          '  who: string[];',
          '  note?: string; stripped?: boolean; cancelled?: boolean; rec?: SportRecord;',
          '  /** Optional extras used by the Entertainment lists: a line under the year, a line on the reveal, a key that keeps',
          '   *  two results in one year apart, and the word shown in place of a name when there was no award. */',
          '  sub?: string; extra?: string; gid?: string; off?: string;',
          '}',
          'export interface SportList { id: string; title: string; wins: SportWin[]; champs: Record<string, SportChamp> }',
          '',
          'export const SPORT_LISTS: Record<string, SportList> = {']
    for L in lists:
        ts.append(f'  {L["id"]}: {{')
        ts.append(f'    id: {json.dumps(L["id"])}, title: {json.dumps(L["title"], ensure_ascii=False)},')
        ts.append('    champs: {')
        for k, c in L["champs"].items():
            ts.append(f'      {json.dumps(k, ensure_ascii=False)}: {json.dumps(c, ensure_ascii=False)},')
        ts.append('    },')
        ts.append('    wins: [')
        for w in L["wins"]:
            ts.append('      ' + json.dumps(w, ensure_ascii=False, separators=(", ", ": ")) + ',')
        ts.append('    ],')
        ts.append('  },')
    ts.append('};')
    with open(a.out, "w", encoding="utf8") as f:
        f.write("\n".join(ts) + "\n")
    for L in lists:
        asked = [w for w in L["wins"] if not w.get("stripped") and not w.get("cancelled")]
        print(f'{L["id"]:9} rows {len(L["wins"]):4}  asked {len(asked):4}  champions {len(L["champs"]):3}')

if __name__ == "__main__":
    main()
