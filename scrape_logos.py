#!/usr/bin/env python3
"""
Scrape logos for all institutions using Clearbit API (primary) + Favicon (fallback).
Downloads logos and creates/updates logo-mapping.json.
"""

import json
import requests
import time
from pathlib import Path
from urllib.parse import urlparse
import io
from PIL import Image

# Clearbit logo API endpoint (free tier, no key needed for basic use)
CLEARBIT_LOGO_URL = "https://logo.clearbit.com"

def get_domain(website_url):
    """Extract domain from URL."""
    if not website_url:
        return None
    try:
        parsed = urlparse(str(website_url).strip())
        domain = parsed.netloc or parsed.path
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain if domain else None
    except:
        return None

def get_clearbit_logo(domain):
    """Try to get logo from Clearbit API."""
    if not domain:
        return None
    try:
        url = f"{CLEARBIT_LOGO_URL}/{domain}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return response.content
        return None
    except Exception as e:
        print(f"    Clearbit error for {domain}: {e}")
        return None

def get_favicon(domain):
    """Try to get favicon from domain."""
    if not domain:
        return None
    try:
        # Try favicon.ico
        url = f"https://{domain}/favicon.ico"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return response.content
        return None
    except Exception as e:
        print(f"    Favicon error for {domain}: {e}")
        return None

def convert_to_png(image_data, domain):
    """Convert image data to PNG format."""
    try:
        img = Image.open(io.BytesIO(image_data))
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = rgb_img

        png_data = io.BytesIO()
        img.save(png_data, format='PNG')
        return png_data.getvalue()
    except Exception as e:
        print(f"    PNG conversion error for {domain}: {e}")
        return None

def main():
    # Load institutions from JSON
    json_path = Path("public/courses_data.json")
    if not json_path.exists():
        print(f"Error: {json_path} not found")
        return

    print("Loading institutions...")
    with open(json_path, 'r', encoding='utf-8') as f:
        institutions = json.load(f)

    # Load existing mapping
    mapping_path = Path("src/assets/logo-mapping.json")
    if mapping_path.exists():
        with open(mapping_path, 'r', encoding='utf-8') as f:
            logo_mapping = json.load(f)
        print(f"Found {len(logo_mapping)} existing logos")
    else:
        logo_mapping = {}
        print("Starting fresh logo mapping")

    # Create logos directory
    logos_dir = Path("public/logos")
    logos_dir.mkdir(parents=True, exist_ok=True)

    total = len(institutions)
    successful = 0
    failed = 0
    already_have = 0

    print(f"\nProcessing {total} institutions...")
    print("=" * 60)

    for idx, institution in enumerate(institutions, 1):
        name = institution.get("name", "Unknown")
        domain = institution.get("domain", "")
        website = institution.get("website", "")

        if not domain:
            domain = get_domain(website)

        if not domain:
            print(f"[{idx}/{total}] {name[:40]:40} | ❌ No domain")
            failed += 1
            continue

        # Check if already mapped
        if domain in logo_mapping:
            print(f"[{idx}/{total}] {name[:40]:40} | ✓ Already mapped")
            already_have += 1
            continue

        print(f"[{idx}/{total}] {name[:40]:40} | ", end="", flush=True)

        # Try Clearbit first
        logo_data = get_clearbit_logo(domain)
        source = "Clearbit"

        # Fallback to favicon
        if not logo_data:
            logo_data = get_favicon(domain)
            source = "Favicon"

        if logo_data:
            # Convert to PNG
            png_data = convert_to_png(logo_data, domain)
            if png_data:
                # Save to file - sanitize domain for filename
                safe_domain = domain.replace('.', '_').replace('/', '_')
                filename = f"logos/{safe_domain}.png"
                file_path = Path("public") / filename
                file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(file_path, 'wb') as f:
                    f.write(png_data)

                # Add to mapping
                logo_mapping[domain] = f"/{filename}"
                print(f"✓ {source} ({len(png_data) // 1024}KB)")
                successful += 1
            else:
                print(f"❌ PNG conversion failed")
                failed += 1
        else:
            print(f"❌ No logo found")
            failed += 1

        # Rate limiting
        if idx % 10 == 0:
            time.sleep(1)

    print("=" * 60)
    print(f"\nResults:")
    print(f"  ✓ Successfully downloaded: {successful}")
    print(f"  ✓ Already had: {already_have}")
    print(f"  ❌ Failed: {failed}")
    print(f"  Total mapped: {len(logo_mapping)}")

    # Save updated mapping
    print(f"\nSaving logo mapping to {mapping_path}...")
    with open(mapping_path, 'w', encoding='utf-8') as f:
        json.dump(logo_mapping, f, indent=2, ensure_ascii=False)

    print(f"✓ Logo scraping complete!")
    print(f"\nNext steps:")
    print(f"  1. Run: python3 convert_excel_to_json.py")
    print(f"  2. Refresh: npm run dev")

if __name__ == "__main__":
    main()
