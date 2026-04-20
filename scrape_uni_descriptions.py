#!/usr/bin/env python3
"""
Scrape real course descriptions from accessible Australian university websites.
Tries UNSW → Flinders → UOW for each unique course name.
One real description per unique course name, applied to all institutions.
"""

import json
import re
import time
import requests
from pathlib import Path
from bs4 import BeautifulSoup

JSON_PATH = Path("public/courses_data.json")
CACHE_PATH = Path("uni_descriptions_cache.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
}
TIMEOUT = 10

LEVEL_TO_URL_SEGMENT = {
    "Bachelor Degree": "undergraduate",
    "Bachelor Honours Degree": "undergraduate",
    "Associate Degree": "undergraduate",
    "Masters Degree (Coursework)": "postgraduate",
    "Masters Degree (Research)": "postgraduate",
    "Doctoral Degree": "postgraduate",
    "Graduate Certificate": "postgraduate",
    "Graduate Diploma": "postgraduate",
    "Diploma": "postgraduate",
    "Advanced Diploma": "postgraduate",
}

def to_slug(name):
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    name = re.sub(r"\s+", "-", name)
    name = re.sub(r"-+", "-", name)
    return name.strip("-")

SKIP_PHRASES = [
    "bidjigal", "gadigal", "ngunnawal", "wiradjuri", "acknowledges",
    "traditional custodians", "aboriginal", "torres strait",
    "cookie", "javascript", "browser", "login", "sign in",
]

def is_bad_text(txt):
    tl = txt.lower()
    return any(p in tl for p in SKIP_PHRASES)

def extract_text_from_html(html, max_chars=500):
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()

    # og:description is usually a clean course summary
    for attr in [{"property": "og:description"}, {"name": "description"}]:
        meta = soup.find("meta", attr)
        if meta:
            txt = meta.get("content", "").strip()
            if len(txt) > 80 and not is_bad_text(txt):
                return txt[:max_chars]

    # Look for course overview sections by class/id keywords
    for sel in [
        "[class*='course-overview']", "[class*='course-description']",
        "[class*='program-overview']", "[class*='intro-text']",
        "[class*='lead']", "[class*='summary']",
        "main p", "article p", ".content p", "p",
    ]:
        for el in soup.select(sel):
            txt = el.get_text(separator=" ", strip=True)
            if len(txt) > 100 and not is_bad_text(txt):
                return txt[:max_chars]
    return None

def try_unsw(course_name, level):
    segment = LEVEL_TO_URL_SEGMENT.get(level, "undergraduate")
    slug = to_slug(course_name)
    url = f"https://www.unsw.edu.au/study/{segment}/{slug}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200 and len(r.content) > 1000:
            desc = extract_text_from_html(r.text)
            if desc and len(desc) > 80:
                return desc, url
    except Exception:
        pass
    return None, None

def try_flinders(course_name):
    slug = to_slug(course_name)
    url = f"https://www.flinders.edu.au/study/courses/{slug}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200 and len(r.content) > 1000:
            desc = extract_text_from_html(r.text)
            if desc and len(desc) > 80:
                return desc, url
    except Exception:
        pass
    return None, None

def try_uow(course_name):
    slug = to_slug(course_name)
    url = f"https://www.uow.edu.au/study/courses/{slug}/"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200 and len(r.content) > 1000:
            desc = extract_text_from_html(r.text)
            if desc and len(desc) > 80:
                return desc, url
    except Exception:
        pass
    return None, None

def load_cache():
    if CACHE_PATH.exists():
        with open(CACHE_PATH) as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def main():
    print("=== Scraping real course descriptions from university websites ===\n")

    with open(JSON_PATH) as f:
        data = json.load(f)

    cache = load_cache()
    print(f"  Cache: {len(cache)} descriptions already found\n")

    # Collect unique course names without descriptions, sorted by frequency (most common first)
    from collections import Counter
    freq = Counter()
    unique = {}
    for inst in data:
        for course in inst["courses"]:
            if not course.get("description"):
                name = course.get("courseName", "")
                level = course.get("courseLevel", "") or "Bachelor Degree"
                key = name.lower()
                freq[key] += 1
                if key not in unique:
                    unique[key] = (name, level)

    # Sort by frequency descending — tackle most impactful courses first
    items = sorted(unique.items(), key=lambda x: freq[x[0]], reverse=True)
    # Skip non-university courses (school, English prep) — only try university-level
    UNI_LEVELS = {
        "Bachelor Degree", "Bachelor Honours Degree", "Masters Degree (Coursework)",
        "Masters Degree (Research)", "Doctoral Degree", "Graduate Certificate",
        "Graduate Diploma", "Associate Degree", "Diploma", "Advanced Diploma",
    }
    items = [(k, v) for k, v in items if v[1] in UNI_LEVELS]
    # Skip already cached
    items = [(k, v) for k, v in items if k not in cache]

    print(f"  University-level courses to try: {len(items):,}")
    print(f"  Top 10: {[v[0] for _, v in items[:10]]}\n")

    found = 0
    not_found = 0
    for idx, (key, (name, level)) in enumerate(items, 1):
        # Try sources in order
        desc, src = try_unsw(name, level)
        if not desc:
            desc, src = try_flinders(name)
        if not desc:
            desc, src = try_uow(name)

        if desc:
            cache[key] = desc
            found += 1
            print(f"  [{idx:>5}/{len(items)}] ✓ {name[:60]}")
        else:
            cache[key] = ""  # Mark as tried (empty = not found)
            not_found += 1

        if idx % 20 == 0:
            save_cache(cache)
            print(f"  --- Progress: {found} found / {not_found} not found ---")

        time.sleep(0.5)

    save_cache(cache)

    # Inject real descriptions into JSON
    print(f"\n  Injecting {found} real descriptions into JSON...")
    injected = 0
    for inst in data:
        for course in inst["courses"]:
            if not course.get("description"):
                key = course.get("courseName", "").lower()
                desc = cache.get(key, "")
                if desc:
                    course["description"] = desc
                    injected += 1

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"  Injected: {injected:,} real descriptions")
    print(f"  Not found: {not_found:,} courses")
    print(f"\nDone! Real descriptions from UNSW / Flinders / UOW.")

if __name__ == "__main__":
    main()
