#!/usr/bin/env python3
"""
Generate 50-100 word course descriptions using Claude Haiku.
Batches 20 courses per API call for efficiency.
Only processes courses without existing real descriptions.
"""

import json
import os
import time
from pathlib import Path
from openai import OpenAI

JSON_PATH = Path("public/courses_data.json")
CACHE_PATH = Path("ai_descriptions_cache.json")
BATCH_SIZE = 20

# Load API key from visa-bot-mvp .env if not in environment
if not os.environ.get("OPENAI_API_KEY"):
    env_path = Path("/Users/rudybobek/visa-bot-mvp/.env")
    for line in env_path.read_text().splitlines():
        if line.startswith("OPENAI_API_KEY="):
            os.environ["OPENAI_API_KEY"] = line.split("=", 1)[1].strip()

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def load_cache():
    if CACHE_PATH.exists():
        with open(CACHE_PATH) as f:
            return json.load(f)
    return {}


def save_cache(cache):
    with open(CACHE_PATH, 'w') as f:
        json.dump(cache, f, ensure_ascii=False)


def make_cache_key(name, level, field):
    return f"{name.lower()}||{level.lower()}||{field.lower()}"


def generate_batch(courses_batch):
    """courses_batch: list of (name, level, field) tuples"""
    lines = []
    for i, (name, level, field) in enumerate(courses_batch, 1):
        lines.append(f"{i}. Course: \"{name}\" | Level: {level} | Field: {field}")

    prompt = f"""Write a 50-80 word course description for each of the following Australian CRICOS courses.
Each description should be professional, informative, and specific to that course name and field.
Vary the style and opening sentence for each one.
Do NOT use generic phrases like "Develop foundational competency" or "Learn essential skills".
Focus on what students actually study and what career outcomes they can expect.

Courses:
{chr(10).join(lines)}

Reply ONLY with a JSON array of strings, one description per course, in the same order.
Example format: ["Description 1...", "Description 2...", ...]"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.choices[0].message.content.strip()
    # Extract JSON array from response
    start = text.find('[')
    end = text.rfind(']') + 1
    if start == -1 or end == 0:
        return None
    return json.loads(text[start:end])


def main():
    print("=== AI Description Generator ===\n")

    with open(JSON_PATH) as f:
        data = json.load(f)

    cache = load_cache()
    print(f"  Cache: {len(cache):,} descriptions already generated\n")

    # Collect unique courses without descriptions
    unique_courses = {}
    for inst in data:
        for course in inst['courses']:
            if not course.get('description'):
                name = course.get('courseName', '')
                level = course.get('courseLevel', '') or 'N/A'
                field = course.get('fieldOfEducation', '') or 'N/A'
                key = make_cache_key(name, level, field)
                if key not in cache:
                    unique_courses[key] = (name, level, field)

    total_needed = len(unique_courses)
    print(f"  Unique courses needing descriptions: {total_needed:,}")
    print(f"  Batches of {BATCH_SIZE}: ~{(total_needed + BATCH_SIZE - 1) // BATCH_SIZE} API calls\n")

    items = list(unique_courses.items())
    batches_done = 0
    errors = 0

    for i in range(0, len(items), BATCH_SIZE):
        batch_items = items[i:i + BATCH_SIZE]
        batch_courses = [(v[0], v[1], v[2]) for _, v in batch_items]
        batch_keys = [k for k, _ in batch_items]

        try:
            descriptions = generate_batch(batch_courses)
            if descriptions and len(descriptions) == len(batch_courses):
                for key, desc in zip(batch_keys, descriptions):
                    cache[key] = desc.strip()
                batches_done += 1
            else:
                print(f"  ⚠ Batch {i//BATCH_SIZE + 1}: unexpected response length, skipping")
                errors += 1
        except Exception as e:
            print(f"  ✗ Batch {i//BATCH_SIZE + 1} error: {e}")
            errors += 1
            time.sleep(2)
            continue

        if batches_done % 10 == 0:
            save_cache(cache)
            done_courses = min(i + BATCH_SIZE, total_needed)
            print(f"  [{done_courses:,}/{total_needed:,}] batches done: {batches_done}, errors: {errors}")

        time.sleep(0.5)

    save_cache(cache)

    # Inject all cached descriptions into JSON
    print("\n  Injecting descriptions into courses_data.json...")
    injected = 0
    for inst in data:
        for course in inst['courses']:
            if not course.get('description'):
                name = course.get('courseName', '')
                level = course.get('courseLevel', '') or 'N/A'
                field = course.get('fieldOfEducation', '') or 'N/A'
                key = make_cache_key(name, level, field)
                desc = cache.get(key)
                if desc:
                    course['description'] = desc
                    injected += 1

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    print(f"  Injected: {injected:,} AI descriptions")
    print(f"  Errors: {errors}")
    print(f"\nDone! Cache saved to {CACHE_PATH}")


if __name__ == "__main__":
    main()
