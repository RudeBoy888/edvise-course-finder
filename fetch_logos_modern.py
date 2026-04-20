#!/usr/bin/env python3
"""
Fetch logos for all institutions without logos.
Sources (in priority order):
  1. logo.dev API (free, high quality)
  2. Google Favicon Service at 128px (reliable fallback)
  3. DuckDuckGo favicon (last resort)
"""

import json
import requests
import time
from pathlib import Path
from io import BytesIO

try:
    from PIL import Image
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'Pillow', '-q'])
    from PIL import Image

JSON_PATH   = Path("public/courses_data.json")
MAPPING_PATH = Path("src/assets/logo-mapping.json")
LOGOS_DIR   = Path("public/logos")
LOGOS_DIR.mkdir(exist_ok=True)

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; EduFinder/1.0)"}
TIMEOUT = 8

def load_mapping():
    if MAPPING_PATH.exists():
        with open(MAPPING_PATH) as f:
            return json.load(f)
    return {}

def save_mapping(mapping):
    with open(MAPPING_PATH, 'w') as f:
        json.dump(mapping, f, indent=2, sort_keys=True)

def sanitize_filename(domain):
    return domain.replace('.', '_').replace('-', '_')

def save_image(data: bytes, dest: Path) -> bool:
    try:
        img = Image.open(BytesIO(data))
        if img.width < 8 or img.height < 8:
            return False
        if img.mode in ('RGBA', 'LA', 'P'):
            bg = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            if img.mode in ('RGBA', 'LA'):
                bg.paste(img, mask=img.split()[-1])
            else:
                bg.paste(img)
            img = bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        img.save(dest, 'PNG', optimize=True)
        return True
    except Exception:
        return False

def try_google_favicon(domain):
    """Google favicon service — 404 status = generic icon, skip it"""
    url = f"https://www.google.com/s2/favicons?domain={domain}&sz=128"
    try:
        r = requests.get(url, timeout=TIMEOUT, headers=HEADERS)
        if r.status_code == 200 and len(r.content) > 500:
            return r.content
    except Exception:
        pass
    return None

def try_direct_favicon(domain):
    """Fetch favicon.ico directly from institution website"""
    for scheme in ['https', 'http']:
        url = f"{scheme}://{domain}/favicon.ico"
        try:
            r = requests.get(url, timeout=TIMEOUT, headers=HEADERS, allow_redirects=True)
            if r.status_code == 200 and len(r.content) > 500:
                return r.content
        except Exception:
            pass
    return None

def try_common_logo_paths(domain):
    """Try common logo paths on institution websites"""
    paths = ['/images/logo.png', '/assets/logo.png', '/img/logo.png',
             '/wp-content/themes/main/images/logo.png', '/images/logo.svg']
    for scheme in ['https', 'http']:
        for path in paths:
            url = f"{scheme}://{domain}{path}"
            try:
                r = requests.get(url, timeout=TIMEOUT, headers=HEADERS, allow_redirects=True)
                if r.status_code == 200 and len(r.content) > 500:
                    ctype = r.headers.get('content-type', '')
                    if 'image' in ctype or path.endswith('.png'):
                        return r.content
            except Exception:
                pass
    return None

def fetch_logo(domain):
    for fn in [try_google_favicon, try_direct_favicon, try_common_logo_paths]:
        data = fn(domain)
        if data:
            return data
    return None

def main():
    print("=== Fetching logos for all institutions ===\n")

    with open(JSON_PATH) as f:
        data = json.load(f)

    mapping = load_mapping()
    total = len(data)
    downloaded = 0
    already = 0
    failed = 0

    for idx, inst in enumerate(data, 1):
        domain = inst.get('domain', '').strip()
        name = inst.get('name', '')[:45]

        prefix = f"[{idx}/{total}] {name:<45}"

        if not domain:
            print(f"{prefix} | ⚠ No domain")
            failed += 1
            continue

        if domain in mapping:
            print(f"{prefix} | ✓ Already mapped")
            already += 1
            continue

        img_data = fetch_logo(domain)
        if not img_data:
            print(f"{prefix} | ✗ Not found")
            failed += 1
        else:
            filename = f"{sanitize_filename(domain)}.png"
            dest = LOGOS_DIR / filename
            if save_image(img_data, dest):
                mapping[domain] = f"/logos/{filename}"
                print(f"{prefix} | ✓ Saved {filename}")
                downloaded += 1
            else:
                print(f"{prefix} | ✗ Bad image")
                failed += 1

        # Save mapping every 50 institutions
        if idx % 50 == 0:
            save_mapping(mapping)

        # Polite rate limiting: 0.3s between requests
        time.sleep(0.3)

    save_mapping(mapping)

    print(f"\n{'='*60}")
    print(f"Downloaded: {downloaded:,} new logos")
    print(f"Already had: {already:,}")
    print(f"Failed/missing: {failed:,}")
    print(f"\nNext: python3 update_logos_in_json.py")

if __name__ == "__main__":
    main()
