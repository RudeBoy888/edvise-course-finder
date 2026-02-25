#!/usr/bin/env python3
"""
Update courses_data.json with new logo mappings from logo-mapping.json
without needing the Excel file.
"""

import json
from pathlib import Path

def main():
    json_path = Path("public/courses_data.json")
    mapping_path = Path("src/assets/logo-mapping.json")

    print("Loading logo mapping...")
    with open(mapping_path, 'r', encoding='utf-8') as f:
        logo_mapping = json.load(f)
    print(f"  Found {len(logo_mapping)} logos")

    print("Loading courses data...")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"  Found {len(data)} institutions")

    print("Updating logo URLs...")
    updated = 0
    for institution in data:
        domain = institution.get("domain", "")
        if domain in logo_mapping:
            old_url = institution.get("logoUrl", "")
            new_url = logo_mapping[domain]
            if old_url != new_url:
                institution["logoUrl"] = new_url
                updated += 1

    print(f"  Updated {updated} institutions with new logos")

    print(f"Saving updated data to {json_path}...")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✓ Successfully updated {json_path}")
    print(f"\nNext step:")
    print(f"  Refresh browser: Cmd+Shift+R (or Ctrl+Shift+R)")

if __name__ == "__main__":
    main()
