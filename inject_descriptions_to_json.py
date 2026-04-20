#!/usr/bin/env python3
"""
Inject descriptions from courses_merged_descriptions.csv directly into courses_data.json.
Bypasses Excel permission issues by matching on courseName.
"""

import json
import csv
from pathlib import Path

CSV_PATH = Path("/Users/rudybobek/edvise-course-finder/courses_merged_descriptions.csv")
JSON_PATH = Path("/Users/rudybobek/edvise-course-finder/public/courses_data.json")

def build_description_map(csv_path):
    desc_map = {}
    skipped = 0
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('Course Name', '').strip()
            desc = row.get('Description', '').strip()
            source = row.get('Source', '').strip()
            if source != 'training.gov.au':
                skipped += 1
                continue
            if name and desc:
                desc_map[name.lower()] = desc
    print(f"  Loaded {len(desc_map):,} real descriptions (training.gov.au)")
    print(f"  Skipped {skipped:,} generated/template descriptions")
    return desc_map

def inject(desc_map, json_path):
    print("  Loading courses_data.json...")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    cleared = 0
    not_found = 0

    for institution in data:
        for course in institution.get('courses', []):
            name_key = course.get('courseName', '').strip().lower()
            # Always clear first, then set real if available
            if course.get('description'):
                course['description'] = ''
                cleared += 1
            desc = desc_map.get(name_key)
            if desc:
                course['description'] = desc
                updated += 1
            else:
                not_found += 1

    print(f"  Real descriptions added: {updated:,} courses")
    print(f"  Cleared generated:       {cleared:,} courses")
    print(f"  No real description:     {not_found:,} courses")

    print("  Saving courses_data.json...")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f"  Saved: {json_path}")

if __name__ == "__main__":
    print("=== Injecting descriptions into courses_data.json ===\n")
    desc_map = build_description_map(CSV_PATH)
    inject(desc_map, JSON_PATH)
    print("\nDone!")
