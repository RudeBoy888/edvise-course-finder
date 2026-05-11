# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Commands

```bash
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # Production build to dist/
npm run lint         # ESLint

# Data pipeline
python3 convert_excel_to_json.py        # Excel → public/courses_data.json
node scripts/check-provider-levels.js  # Scrape assessment levels (Playwright, ~1-2h)
node scripts/check-provider-levels.js --countries   # Also scrape country levels
node scripts/check-provider-levels.js --limit 20   # Test run (20 providers only)
```

## Architecture

**Fully static app** — React/Vite on Vercel, no backend. All data lives in `public/*.json`.

### Data flow

```
cricos_data_current.xlsx
  → convert_excel_to_json.py
  → public/courses_data.json          (~18 MB, 1536 institutions, 25k courses)

Australian gov Document Checklist Tool (Playwright scraper)
  → public/provider_levels.json       (Assessment Level 1-3 per CRICOS provider)
  → public/country_levels.json        (Assessment Level 1-3 per passport country)
```

### Central state: `useFilters(data, { checkCompatibility })`

All filtering, sorting, pagination, and visa-country state lives here. Returns `paginatedCourses` (flat array of courses each with `.institution` attached). Accepts optional `checkCompatibility` from `useProviderLevels` for the `onlyStreamlined` filter.

### Assessment Levels system

`useProviderLevels()` fetches both JSON files and exposes `checkCompatibility(countryCode, providerCode)` → `'streamlined' | 'regular' | 'unknown'`.

Matrix logic (in `useProviderLevels.js`):
- Country L1 → always `streamlined`
- Country L2 → `streamlined` if provider L1/L2, `regular` if L3
- Country L3 → `streamlined` only if provider L1, else `regular`

`EvidenceLevelBadge` renders the result visually. `CourseCard` shows a colored left border. `CourseModal` shows the full section with explanation.

### Admin Dashboard (`AdminPanel.jsx`)

Password protected via `VITE_ADMIN_PASSWORD` env var. Auth persisted in `localStorage`.

**Update Data tab** (`CricosUpdatePanel.jsx`) — two sub-tabs:
- **CRICOS Data**: Upload `.xlsx` → `excelParser.js` parses in browser (SheetJS) → `cricosComparator.js` diffs → `githubPublisher.js` commits to GitHub → Vercel auto-deploys. Preserves existing `logoUrl`/`domain`/`description` for unchanged providers.
- **Assessment Levels**: Upload `provider_levels.json` and/or `country_levels.json` → diff → commit.

After each deploy, `appendHistory()` in `githubPublisher.js` writes an entry to `public/update_history.json` (max 100 entries, newest first). History tab reads this file.

GitHub token stored in `localStorage` under `edvise_github_token`. Repo hardcoded as `RudeBoy888/edvise-course-finder`.

## Critical Constraints

### City filter postcode ranges MUST NOT overlap

`src/utils/cityMapping.js` maps cities to `[[min, max]]` postcode ranges. Each city must have distinct, non-overlapping ranges — overlap causes Newcastle to show Sydney results etc. Current ranges are carefully separated; always verify after any change.

### Excel column indices (0-based in JS, 1-based in Python)

`excelParser.js` mirrors `convert_excel_to_json.py`. Key columns (0-based):
- Courses sheet: col 0=providerCode, col 2=courseCode, col 3=name, col 7=field, col 12=level, col 13=foundation, col 14=workComponent, col 19=duration, col 20=tuition, col 21=nonTuition, col 22=total, col 23=expired (skip if not "no"), col 24=description
- Data starts at row index 3 (Excel row 4)

### Assessment levels scraper

Uses `channel: 'chrome'` (real Chrome, not Chromium) to bypass Akamai CDN on the Australian government site. Anchor providers: `02672K` = Greenwich English College (L2), `03717E` = UNSW Global (L3). Anchor countries: `IRQ` = Iraq (L3), `ARG` = Argentina (L2). Germany's country code is `"D"` (not `"DEU"`) in the government dropdown.

## Git / Deploy

Always push after commits — Vercel auto-deploys on push to `origin/main` (2-3 min).

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useFilters.js` | All filter/sort/pagination state |
| `src/hooks/useProviderLevels.js` | Assessment levels + `checkCompatibility` |
| `src/utils/search.js` | `filterCourses()` — 9-condition AND filter logic |
| `src/utils/cityMapping.js` | 13 cities → postcode ranges (non-overlapping!) |
| `src/utils/regionalClassification.js` | Home Affairs regional category by postcode |
| `src/utils/excelParser.js` | Browser-side Excel → courses_data.json (SheetJS) |
| `src/utils/cricosComparator.js` | Diff old vs new CRICOS data or levels JSON |
| `src/utils/githubPublisher.js` | GitHub Contents API — commit files + history |
| `scripts/check-provider-levels.js` | Playwright scraper for assessment levels |
| `convert_excel_to_json.py` | Python: Excel → public/courses_data.json |
| `public/courses_data.json` | Main data (~18 MB, gitignored from large-file warnings) |
| `public/provider_levels.json` | School assessment levels (1-3) |
| `public/country_levels.json` | Country assessment levels (1-3) |
| `public/update_history.json` | Deploy history (written by admin dashboard) |
