#!/usr/bin/env python3
"""Builds src/decks/bornwhen-data.ts from a saved read-only dump of the owner's "Born When" tab.

The game never reads the sheet. A session reads the tab (read only), saves the JSON, then runs:

    python3 scripts/bornwhen-from-sheet.py --sheet BornWhen.json

BornWhen.json is the values the Sheets tool returns ({"values": [[...], ...]}), or just the list
of rows. Row 1 is the header. Columns:
    Name | Born (YYYY-MM-DD) | Known for | Field | Australian? | Wikipedia title | Note | Check

Field is one of tech, science, music, film, sport, politics, royal, writer, media.
Ids are "bw-<slug of the name>", so they stay the same if rows move. Standard library only.
"""
import argparse
import json
import re
import unicodedata

# Which round a field belongs to. Writers and media people appear in "Everyone" (and "Australians").
GROUPS = {
    "tech": "techsci", "science": "techsci",
    "music": "musicfilm", "film": "musicfilm",
    "sport": "sport",
    "politics": "leaders", "royal": "leaders",
}


def slug(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheet", required=True)
    ap.add_argument("--out", default="src/decks/bornwhen-data.ts")
    args = ap.parse_args()
    raw = json.load(open(args.sheet, encoding="utf-8"))
    rows = raw["values"] if isinstance(raw, dict) else raw
    people, seen = [], set()
    for r in rows[1:]:
        r = list(r) + [""] * 8
        name, born, known, field, aus, title, note = [c.strip() for c in r[:7]]
        if not name or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", born):
            continue
        pid = "bw-" + slug(name)
        if pid in seen:
            raise SystemExit(f"duplicate id {pid}")
        seen.add(pid)
        tags = [field] if field else []
        if field in GROUPS:
            tags.append(GROUPS[field])
        if aus.lower() in ("yes", "y", "true"):
            tags.append("aus")
        people.append({"id": pid, "name": name, "born": born, "known": known, "tags": tags, "title": title or name, "note": note})
    lines = [
        "// GENERATED FILE. Do not edit by hand.",
        '// Made by scripts/bornwhen-from-sheet.py from a saved read-only dump of the owner\'s "Born When" tab.',
        "// To change it, fix the sheet, save the tab as JSON, then run:",
        "//   python3 scripts/bornwhen-from-sheet.py --sheet BornWhen.json",
        "",
        "export interface BornPerson { id: string; name: string; born: string; known: string; tags: string[]; title: string; note: string }",
        "",
        "export const BORN_PEOPLE: BornPerson[] = [",
    ]
    for p in people:
        lines.append("  " + json.dumps(p, ensure_ascii=False) + ",")
    lines.append("];")
    open(args.out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"{len(people)} people -> {args.out}")


main()
