"""Builds src/data/city-water.json and src/data/city-streets.json for the "City Shapes" quiz.

Each city gets a small square SVG drawing:
  * "water": the sea, harbours, lakes and wide rivers around the city (a filled path);
  * "streets": the road layout of the centre (stroked paths by width), plus any water in that
    frame, for cities in STREETS.

The shapes are OpenStreetMap data (© OpenStreetMap contributors, ODbL), read from the free
Overture Maps release on Amazon S3. OpenStreetMap's own servers are blocked from the cloud
machine, but this bucket isn't. Only the parts of each file near a city are downloaded.

Run with:
    pip install pyarrow shapely
    python3 scripts/build-cities.py            # every city
    python3 scripts/build-cities.py sydney     # just one (the others are kept)

Names, other accepted answers and rounds live in src/decks/city-shapes.ts; the ids here
must match it.
"""
import json
import math
import os
import sys

import pyarrow.dataset as ds
import pyarrow.fs as pafs
import shapely
from shapely.geometry import box as make_box
from shapely.ops import unary_union

RELEASE = "2026-10-21.0"
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data")
# Two files, so a round only downloads the drawings it shows.
OUT = {"water": os.path.join(DATA, "city-water.json"), "streets": os.path.join(DATA, "city-streets.json")}
SIZE = 400  # every drawing is SIZE x SIZE
KM_PER_DEG = 111.32

# id: (lat, lon, half-width of the water view in km)
CITIES = {
    "melbourne": (-38.05, 144.85, 42),
    "sydney": (-33.845, 151.24, 9),
    "hobart": (-42.9, 147.36, 13),
    "perth": (-32.0, 115.84, 15),
    "brisbane": (-27.47, 153.03, 7),
    "auckland": (-36.86, 174.78, 14),
    "wellington": (-41.28, 174.82, 9),
    "london": (51.5, -0.06, 8),
    "paris": (48.855, 2.33, 6),
    "prague": (50.07, 14.42, 5),
    "budapest": (47.5, 19.05, 5),
    "venice": (45.435, 12.33, 4),
    "amsterdam": (52.37, 4.9, 3),
    "stockholm": (59.325, 18.07, 5),
    "copenhagen": (55.68, 12.59, 7),
    "istanbul": (41.04, 29.0, 10),
    "stpetersburg": (59.94, 30.28, 9),
    "lisbon": (38.69, -9.15, 13),
    "oslo": (59.88, 10.7, 10),
    "helsinki": (60.165, 24.95, 6),
    "newyork": (40.72, -73.98, 12),
    "sanfrancisco": (37.75, -122.3, 25),
    "seattle": (47.6, -122.36, 12),
    "vancouver": (49.28, -123.12, 9),
    "chicago": (41.88, -87.65, 14),
    "rio": (-22.93, -43.2, 13),
    "capetown": (-34.0, 18.48, 30),
    "hongkong": (22.3, 114.17, 12),
    "singapore": (1.35, 103.82, 24),
    "dubai": (25.15, 55.17, 16),
    "cairo": (30.05, 31.23, 8),
    "montreal": (45.52, -73.65, 20),
}

# id: (lat, lon, half-width of the street view in km). Can include cities not in CITIES.
STREETS = {
    "barcelona": (41.395, 2.165, 1.8),
    "paris": (48.866, 2.30, 1.3),
    "canberra": (-35.300, 149.125, 2.2),
    "newyork": (40.770, -73.975, 2.2),
    "washington": (38.900, -77.030, 1.8),
    "adelaide": (-34.925, 138.600, 2.0),
    "melbourne": (-37.813, 144.960, 1.2),
    "amsterdam": (52.372, 4.893, 1.2),
    "moscow": (55.752, 37.617, 3.0),
    "kyoto": (35.005, 135.765, 1.8),
    # Added Nov 26: streets and water together (harbours, rivers, lakes, moats).
    "sydney": (-33.862, 151.211, 1.3),
    "brisbane": (-27.472, 153.025, 1.6),
    "christchurch": (-43.530, 172.628, 1.5),
    "chicago": (41.885, -87.630, 1.6),
    "sanfrancisco": (37.795, -122.405, 2.0),
    "venice": (45.437, 12.333, 1.0),
    "vienna": (48.208, 16.370, 1.2),
    "london": (51.507, -0.100, 1.8),
    "berlin": (52.515, 13.370, 1.8),
    "stockholm": (59.326, 18.072, 1.3),
    "copenhagen": (55.680, 12.575, 1.5),
    "budapest": (47.505, 19.050, 1.8),
    "istanbul": (41.020, 28.978, 1.8),
    "buenosaires": (-34.605, -58.385, 1.6),
    "tokyo": (35.684, 139.755, 1.6),
    "hongkong": (22.290, 114.168, 1.8),
    "brasilia": (-15.790, -47.880, 6.5),
    "beijing": (39.915, 116.397, 2.4),
}

s3 = pafs.S3FileSystem(anonymous=True, region="us-west-2")


def dataset(theme, kind):
    return ds.dataset(f"overturemaps-us-west-2/release/{RELEASE}/theme={theme}/type={kind}/", filesystem=s3, format="parquet")


def window(lat, lon, km):
    d_lat = km / KM_PER_DEG
    d_lon = km / (KM_PER_DEG * math.cos(math.radians(lat)))
    return (lon - d_lon, lat - d_lat, lon + d_lon, lat + d_lat)


def fetch(data, bounds, columns):
    x0, y0, x1, y1 = bounds
    f = (ds.field("bbox", "xmin") < x1) & (ds.field("bbox", "xmax") > x0) & (ds.field("bbox", "ymin") < y1) & (ds.field("bbox", "ymax") > y0)
    return data.to_table(filter=f, columns=columns).to_pylist()


def to_pixels(geom, bounds):
    x0, y0, x1, y1 = bounds
    sx, sy = SIZE / (x1 - x0), SIZE / (y1 - y0)
    return shapely.transform(geom, lambda c: (c - [x0, y1]) * [sx, -sy])


def fmt(v):
    return f"{round(v, 1):g}"


def ring_path(coords):
    pts = list(coords)[:-1]
    return "M" + "L".join(f"{fmt(x)},{fmt(y)}" for x, y in pts) + "Z"


def line_path(coords):
    return "M" + "L".join(f"{fmt(x)},{fmt(y)}" for x, y in coords)


# Water kinds kept; pools, fountains, ponds and drains are left out.
WATER_SUBTYPES = {"ocean", "lake", "river", "reservoir", "water", "canal", "lagoon"}


def water_path(lat, lon, km):
    bounds = window(lat, lon, km)
    frame = make_box(*bounds)
    rows = fetch(dataset("base", "water"), bounds, ["subtype", "class", "geometry"])
    polys = []
    for r in rows:
        if r["subtype"] not in WATER_SUBTYPES or r["class"] in ("swimming_pool", "fountain", "wastewater", "drain", "ditch"):
            continue
        g = shapely.from_wkb(r["geometry"])
        if g.geom_type in ("Polygon", "MultiPolygon"):
            polys.append(g.intersection(frame))
    water = to_pixels(unary_union([p for p in polys if not p.is_empty]), bounds)
    # Smooth to about a pixel, and drop specks smaller than a few pixels.
    water = water.simplify(0.6, preserve_topology=True)
    parts = []
    for p in getattr(water, "geoms", [water]):
        if p.geom_type != "Polygon" or p.area < 6:
            continue
        parts.append(ring_path(p.exterior.coords) + "".join(ring_path(h.coords) for h in p.interiors if shapely.Polygon(h).area >= 6))
    return "".join(parts)


# Road classes drawn, from widest to thinnest. Lanes, paths and driveways are left out.
ROADS = {"motorway": 3, "trunk": 3, "primary": 2.4, "secondary": 2, "tertiary": 1.6, "residential": 1.1, "unclassified": 1.1, "living_street": 1.1, "pedestrian": 1.1}


def street_paths(lat, lon, km):
    """Roads by width, plus "water": any water in the same frame (a harbour, river or moat)."""
    bounds = window(lat, lon, km)
    frame = make_box(*bounds)
    rows = fetch(dataset("transportation", "segment"), bounds, ["subtype", "class", "geometry"])
    by_width = {}
    for r in rows:
        w = ROADS.get(r["class"])
        # A wide view only needs the main roads; the side streets would turn to mush.
        if r["subtype"] != "road" or not w or (km > 2.5 and w < 1.6) or (km > 4 and w < 2):
            continue
        g = shapely.from_wkb(r["geometry"]).intersection(frame)
        if g.is_empty:
            continue
        g = to_pixels(g, bounds).simplify(0.5)
        for line in getattr(g, "geoms", [g]):
            if line.geom_type == "LineString" and len(line.coords) > 1:
                by_width.setdefault(w, []).append(line_path(line.coords))
    out = {str(w): "".join(v) for w, v in sorted(by_width.items(), reverse=True)}
    water = water_path(lat, lon, km)
    if water:
        out["water"] = water
    return out


def main():
    only = set(sys.argv[1:])
    out = {k: json.load(open(f)) if os.path.exists(f) else {} for k, f in OUT.items()}
    for cid, spec in CITIES.items():
        if only and cid not in only:
            continue
        out["water"][cid] = water_path(*spec)
        print(f"water   {cid}: {len(out['water'][cid]) / 1024:.1f} KB", flush=True)
    for cid, spec in STREETS.items():
        if only and cid not in only:
            continue
        out["streets"][cid] = street_paths(*spec)
        print(f"streets {cid}: {sum(map(len, out['streets'][cid].values())) / 1024:.1f} KB", flush=True)
    for k, f in OUT.items():
        with open(f, "w") as fh:
            json.dump(out[k], fh, separators=(",", ":"))
        print(f"Wrote {f} ({os.path.getsize(f) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
