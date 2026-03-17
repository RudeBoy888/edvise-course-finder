"""
generate_postcode_coords.py
One-time script to generate src/data/au_postcodes.json
Contains lat/lng for all 794 unique postcodes found in courses_data.json

Usage: python3 generate_postcode_coords.py
Output: src/data/au_postcodes.json
"""

import json
import csv
import urllib.request
import os

# ── 1. Collect unique postcodes from courses_data.json ─────────────────────
COURSES_JSON = "public/courses_data.json"
OUTPUT_FILE  = "src/data/au_postcodes.json"

print("Loading courses_data.json …")
with open(COURSES_JSON, encoding="utf-8") as f:
    data = json.load(f)

needed = set()
for inst in data:
    for course in inst["courses"]:
        for locs in course["locations"].values():
            for loc in locs:
                pc = str(loc.get("postcode", "")).strip()
                if pc:
                    needed.add(pc)

print(f"Found {len(needed)} unique postcodes in courses_data.json")

# ── 2. Download the Australian postcodes CSV dataset ───────────────────────
CSV_URL = (
    "https://raw.githubusercontent.com/matthewproctor/"
    "australianpostcodes/master/australian_postcodes.csv"
)
print(f"Downloading dataset from GitHub …")
req = urllib.request.Request(CSV_URL, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=60) as resp:
    raw = resp.read().decode("utf-8")

print("Parsing CSV …")
rows = list(csv.DictReader(raw.splitlines()))
print(f"  CSV rows: {len(rows)}")

# ── 3. Build lookup: postcode → best entry (prefer type=="Delivery Area") ──
# The CSV may contain multiple rows per postcode (different localities).
# We aggregate: pick one representative lat/lng per postcode.

lookup = {}   # postcode_str -> {"lat":…, "lng":…, "locality":…, "state":…}

for row in rows:
    pc   = str(row.get("postcode", "")).strip().zfill(4)
    lat  = row.get("lat", "").strip()
    lng  = row.get("long", "").strip() or row.get("lon", "").strip()
    loc  = (row.get("locality", "") or row.get("place_name", "")).strip().upper()
    st   = (row.get("state", "")).strip().upper()

    if pc not in needed:
        continue
    if not lat or not lng:
        continue

    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except ValueError:
        continue

    # Keep first match per postcode (or overwrite if locality is a better name)
    if pc not in lookup:
        lookup[pc] = {"lat": lat_f, "lng": lng_f, "locality": loc, "state": st}

# ── 4. Report coverage ──────────────────────────────────────────────────────
found     = set(lookup.keys())
missing   = needed - found
coverage  = len(found) / len(needed) * 100
print(f"\nCoverage: {len(found)}/{len(needed)} postcodes ({coverage:.1f}%)")
if missing:
    print(f"  Missing ({len(missing)}): {sorted(missing)[:20]}{'…' if len(missing) > 20 else ''}")

# ── 5. Write output JSON ────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(lookup, f, separators=(",", ":"))

size_kb = os.path.getsize(OUTPUT_FILE) / 1024
print(f"\nWrote {OUTPUT_FILE}  ({size_kb:.1f} KB, {len(lookup)} entries)")
