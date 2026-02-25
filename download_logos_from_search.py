#!/usr/bin/env python3
"""
Download logos for top universities using image search.
Uses bing-image-downloader (more reliable than Google Images scraping).
"""

import json
import requests
import time
from pathlib import Path
import io
from PIL import Image
import subprocess
import sys

# Top universities to get logos for
UNIVERSITIES = {
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
}

def install_bing_downloader():
    """Install bing-image-downloader if not available."""
    try:
        import bing_image_downloader
        return True
    except ImportError:
        print("Installing bing-image-downloader...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "bing-image-downloader", "-q"])
        return True

def download_logo_bing(uni_name, domain):
    """Download logo using Bing Image Search."""
    try:
        from bing_image_downloader import downloader

        search_query = f"{uni_name} logo official"

        downloader.download(
            search_query,
            limit=1,
            output_dir="dataset",
            adult_filter_off=True,
            force_replace=True,
            timeout=10,
            verbose=False
        )

        # Get downloaded file
        dataset_path = Path("dataset") / search_query
        if dataset_path.exists():
            files = list(dataset_path.glob("*"))
            if files:
                return files[0].read_bytes(), "Bing Images"
    except Exception as e:
        pass

    return None, "Failed"

def download_logo_direct(uni_name, domain):
    """Try direct download from university website."""
    search_urls = [
        f"https://{domain}/favicon.ico",
        f"https://{domain}/images/logo.png",
        f"https://{domain}/assets/logo.png",
        f"https://{domain}/media/logo.png",
    ]

    for url in search_urls:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200 and len(response.content) > 1000:
                return response.content, "Direct download"
        except:
            pass

    return None, "Not found"

def convert_to_png(image_data, domain):
    """Convert image to PNG."""
    try:
        img = Image.open(io.BytesIO(image_data))
        if img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = rgb_img

        png_data = io.BytesIO()
        img.save(png_data, format='PNG')
        return png_data.getvalue()
    except:
        return None

def main():
    print("Installing dependencies...")
    if not install_bing_downloader():
        print("❌ Failed to install bing-image-downloader")
        return

    print("\nDownloading logos for universities...\n")

    mapping_path = Path("src/assets/logo-mapping.json")
    with open(mapping_path) as f:
        logo_mapping = json.load(f)

    logos_dir = Path("public/logos")
    logos_dir.mkdir(parents=True, exist_ok=True)

    successful = 0
    failed = 0

    for idx, (domain, uni_name) in enumerate(UNIVERSITIES.items(), 1):
        print(f"[{idx}/14] {uni_name[:40]:40} | ", end="", flush=True)

        if domain in logo_mapping:
            print("✓ Already has logo")
            continue

        # Try Bing Images first
        logo_data, source = download_logo_bing(uni_name, domain)

        # Fallback to direct download
        if not logo_data:
            logo_data, source = download_logo_direct(uni_name, domain)

        if logo_data:
            png_data = convert_to_png(logo_data, domain)
            if png_data:
                safe_domain = domain.replace('.', '_').replace('/', '_')
                file_path = logos_dir / f"{safe_domain}.png"

                with open(file_path, 'wb') as f:
                    f.write(png_data)

                logo_mapping[domain] = f"/logos/{safe_domain}.png"
                print(f"✓ {source} ({len(png_data)//1024}KB)")
                successful += 1
            else:
                print(f"❌ PNG conversion failed")
                failed += 1
        else:
            print(f"❌ {source}")
            failed += 1

        time.sleep(1)

    # Save mapping
    print(f"\nSaving {successful} new logos...")
    with open(mapping_path, 'w') as f:
        json.dump(logo_mapping, f, indent=2, ensure_ascii=False)

    # Cleanup
    import shutil
    if Path("dataset").exists():
        shutil.rmtree("dataset")

    print(f"\n✓ Done!")
    print(f"  Downloaded: {successful}")
    print(f"  Failed: {failed}")
    print(f"  Total logos: {len(logo_mapping)}")
    print(f"\nNext steps:")
    print(f"  1. python3 update_logos_in_json.py")
    print(f"  2. Refresh: Cmd+Shift+R")

if __name__ == "__main__":
    main()
