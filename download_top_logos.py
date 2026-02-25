#!/usr/bin/env python3
"""
Download logos for top 20 universities without logos.
Uses multiple sources: Clearbit, Wikimedia, and direct website searches.
"""

import json
import requests
import time
from pathlib import Path
import io
from PIL import Image

# Top 20 universities without logos
TOP_20_UNIS = {
    "anu.edu.au": "Australian National University",
    "uq.edu.au": "University of Queensland",
    "griffith.edu.au": "Griffith University",
    "qut.edu.au": "Queensland University of Technology",
    "murdoch.edu.au": "Murdoch University",
    "deakin.edu.au": "Deakin University",
    "utas.edu.au": "University of Tasmania",
    "canberra.edu.au": "University of Canberra",
    "ecu.edu.au": "Edith Cowan University",
    "torrens.edu.au": "Torrens University",
    "une.edu.au": "University of New England",
    "jcu.edu.au": "James Cook University",
    "nd.edu.au": "Notre Dame University",
    "scu.edu.au": "Southern Cross University",
    "usq.edu.au": "University of Southern Queensland",
    "tafesa.edu.au": "TAFE South Australia",
    "icms.edu.au": "International College of Management Sydney",
    "apc.edu.au": "Australian Pacific College",
    "sae.edu.au": "SAE University College",
    "rmit.edu.au": "RMIT University",  # Extra: should have logo
}

def get_logo_from_sources(domain, uni_name):
    """Try multiple sources to get logo for a university."""

    # Try 1: Clearbit
    try:
        url = f"https://logo.clearbit.com/{domain}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return response.content, "Clearbit"
    except:
        pass

    # Try 2: Favicon from domain
    try:
        url = f"https://{domain}/favicon.ico"
        response = requests.get(url, timeout=5)
        if response.status_code == 200 and len(response.content) > 1000:  # Must be decent size
            return response.content, "Favicon"
    except:
        pass

    # Try 3: Wikimedia Commons (for major universities)
    try:
        # Search for logo on Wikimedia
        search_term = uni_name.replace(" University", "").split("(")[0].strip()
        url = f"https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={search_term}+logo&format=json"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            # If found, try to get the file
            if data['query']['search']:
                # Return indicator that manual search might help
                return None, "Wikimedia (needs manual)"
    except:
        pass

    # Try 4: Alternative domains
    alternatives = [
        f"https://www.{domain}/favicon.ico",
        f"https://{domain}/images/logo.png",
        f"https://{domain}/assets/logo.png",
    ]

    for alt_url in alternatives:
        try:
            response = requests.get(alt_url, timeout=5)
            if response.status_code == 200 and len(response.content) > 500:
                return response.content, f"Alternative ({alt_url.split('/')[2]})"
        except:
            pass

    return None, "Not found"

def convert_to_png(image_data, domain):
    """Convert image data to PNG."""
    try:
        img = Image.open(io.BytesIO(image_data))
        if img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = rgb_img

        png_data = io.BytesIO()
        img.save(png_data, format='PNG')
        return png_data.getvalue()
    except Exception as e:
        print(f"    PNG conversion error: {e}")
        return None

def main():
    print("Downloading logos for top 20 universities...\n")

    # Load existing mapping
    mapping_path = Path("src/assets/logo-mapping.json")
    with open(mapping_path) as f:
        logo_mapping = json.load(f)

    logos_dir = Path("public/logos")
    logos_dir.mkdir(parents=True, exist_ok=True)

    successful = 0
    failed = 0

    for idx, (domain, uni_name) in enumerate(TOP_20_UNIS.items(), 1):
        print(f"[{idx}/20] {uni_name[:50]:50} | ", end="", flush=True)

        if domain in logo_mapping:
            print("✓ Already has logo")
            continue

        logo_data, source = get_logo_from_sources(domain, uni_name)

        if logo_data:
            # Convert to PNG
            png_data = convert_to_png(logo_data, domain)
            if png_data:
                # Save file
                safe_domain = domain.replace('.', '_').replace('/', '_')
                filename = f"logos/{safe_domain}.png"
                file_path = logos_dir / f"{safe_domain}.png"

                with open(file_path, 'wb') as f:
                    f.write(png_data)

                logo_mapping[domain] = f"/{filename}"
                print(f"✓ {source} ({len(png_data)//1024}KB)")
                successful += 1
            else:
                print(f"❌ PNG conversion failed")
                failed += 1
        else:
            print(f"❌ {source}")
            failed += 1

        time.sleep(0.5)  # Rate limiting

    # Save updated mapping
    print(f"\nSaving {successful} new logos to logo-mapping.json...")
    with open(mapping_path, 'w') as f:
        json.dump(logo_mapping, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Complete!")
    print(f"  Successfully downloaded: {successful}")
    print(f"  Failed: {failed}")
    print(f"  Total logos in mapping: {len(logo_mapping)}")
    print(f"\nNext steps:")
    print(f"  1. python3 update_logos_in_json.py")
    print(f"  2. Refresh browser: Cmd+Shift+R")

if __name__ == "__main__":
    main()
