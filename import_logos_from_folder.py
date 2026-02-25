#!/usr/bin/env python3
"""
Import logos from Desktop/loga folder and add to app.
Maps filenames to university domains automatically.
"""

import json
import shutil
from pathlib import Path

# Mapping: filename (without .png) → domain
FILENAME_TO_DOMAIN = {
    "ANU": "anu.edu.au",
    "UQ": "uq.edu.au",
    "Griffith": "griffith.edu.au",
    "QUT": "qut.edu.au",
    "Murdoch": "murdoch.edu.au",
    "Deakin": "deakin.edu.au",
    "UTAS": "utas.edu.au",
    "Canberra": "canberra.edu.au",
    "ECU": "ecu.edu.au",
    "Torrens": "torrens.edu.au",
    "UNE": "une.edu.au",
    "JCU": "jcu.edu.au",
    "Notre Dame": "nd.edu.au",
    "Southern Cross": "scu.edu.au",
}

def main():
    source_folder = Path("/Users/rudybobek/Downloads")
    logos_dir = Path("public/logos")
    mapping_path = Path("src/assets/logo-mapping.json")

    if not source_folder.exists():
        print(f"❌ Folder not found: {source_folder}")
        return

    # Get all PNG files
    png_files = list(source_folder.glob("*.png"))
    print(f"Found {len(png_files)} PNG files\n")

    if not png_files:
        print("❌ No PNG files found in", source_folder)
        return

    # Load logo mapping
    with open(mapping_path) as f:
        logo_mapping = json.load(f)

    logos_dir.mkdir(parents=True, exist_ok=True)
    imported = 0

    print("Importing logos...\n")

    for png_file in png_files:
        filename = png_file.stem  # e.g., "ANU" from "ANU.png"

        # Find matching domain
        domain = None
        for key, val in FILENAME_TO_DOMAIN.items():
            if key.lower() in filename.lower() or filename.lower() in key.lower():
                domain = val
                break

        if not domain:
            print(f"⚠️  {filename}.png - Could not map to domain (skipped)")
            continue

        if domain in logo_mapping:
            print(f"✓ {filename:20} → {domain:30} (already has logo)")
            continue

        # Copy file
        dest_name = domain.replace(".", "_").replace("/", "_")
        dest_path = logos_dir / f"{dest_name}.png"

        try:
            shutil.copy2(png_file, dest_path)
            logo_mapping[domain] = f"/logos/{dest_name}.png"
            print(f"✓ {filename:20} → {domain:30} ({dest_path.stat().st_size // 1024}KB)")
            imported += 1
        except Exception as e:
            print(f"❌ {filename}.png - Error: {e}")

    # Save updated mapping
    print(f"\nSaving logo mapping...")
    with open(mapping_path, 'w') as f:
        json.dump(logo_mapping, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Successfully imported {imported} logos!")
    print(f"  Total logos in mapping: {len(logo_mapping)}")
    print(f"\nNext steps:")
    print(f"  1. python3 update_logos_in_json.py")
    print(f"  2. Refresh browser: Cmd+Shift+R")

if __name__ == "__main__":
    main()
