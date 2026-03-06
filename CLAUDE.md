# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL REMINDERS (READ FIRST!)

### Git Workflow - MUST DO!
- **ALWAYS push to GitHub after commits**: `git push origin main`
- **Vercel auto-deploys on push** (takes 2-3 minutes)
- **DO NOT leave commits locally** - deployment will fail!
- Check status before committing: `git status` (if "ahead of origin/main" → must push!)

### City Filter Architecture (March 6, 2026)
**IMPORTANT**: Each city has a specific postcode range. **Do NOT overlap ranges!**

| City | State | Postcode Ranges | Notes |
|------|-------|-----------------|-------|
| Sydney | NSW | 2000-2299 | Greater Sydney metro only |
| Newcastle | NSW | 2287-2328, 2338-2380 | Hunter Valley, Lake Macquarie |
| Wollongong | NSW | 2500-2530 | Illawarra region |
| Byron Bay | NSW | 2480-2495 | Northern Rivers |
| Melbourne | VIC | 3000-3999 | All VIC suburbs |
| Brisbane | QLD | 4000-4199 | Excludes Gold Coast (4200+) |
| Gold Coast | QLD | 4200-4230 | Surfers Paradise area |
| Cairns | QLD | 4800-4899 | Tropical north |
| Perth | WA | 6000-6299 | Metropolitan area |
| Adelaide | SA | 5000-5199 | Metropolitan area |
| Hobart | TAS | 7000-7299 | Tasmania region |
| Canberra | ACT | 2600-2618, 2900-2920 | ACT region |
| Darwin | NT | 800-900 | Greater Darwin area |

**Coverage**: 95.2% of 44,589 course locations covered. See "Data Coverage" section for ~4.8% regional areas.

### City Filter Common Pitfalls
❌ **DON'T** make all NSW cities (Sydney, Newcastle, Wollongong, Byron Bay) have same range [2000-2799]
- This causes Newcastle to show Sydney results (Manly, Haymarket, Parramatta, etc.) ← MAJOR BUG!

✅ **DO** assign specific, non-overlapping postcode ranges
- Sydney: 2000-2299 (major metro only)
- Newcastle: 2287-2328, 2338-2380 (Hunter region only)
- Each city gets its distinct geographic area

✅ **DO** test city separation:
```bash
node -e "
const CITY_MAPPING = { Sydney: [[2000, 2299]], Newcastle: [[2287, 2328], [2338, 2380]] };
console.log('Postcode 2000 in Sydney:', CITY_MAPPING.Sydney.some(([min, max]) => 2000 >= min && 2000 <= max)); // true
console.log('Postcode 2000 in Newcastle:', CITY_MAPPING.Newcastle.some(([min, max]) => 2000 >= min && 2000 <= max)); // false
"
```

---

## Overview

EDVISE Course Finder is a React + Vite application that allows users to search Australian CRICOS (Commonwealth Register of Institutions and Courses for Overseas Students) courses by institution, course name, and state location.

The app provides a search interface for 1,536 Australian educational institutions offering 25,841 courses across 8 states, sourced from the official CRICOS register.

## Table of Contents
- [Quick Commands](#quick-commands)
- [Architecture](#architecture)
- [City Filter System](#city-filter-system) ← **Read if modifying city filtering**
- [Data Coverage & Regional Areas](#data-coverage--regional-areas)
- [Styling & Brand](#styling--brand)
- [Admin Authentication System](#admin-authentication-system)
- [Build & Deployment](#build--deployment)
- [Recent Updates](#recent-updates--march-6-2026)

## Quick Commands

**Development:**
```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Build production bundle to dist/
npm run lint         # Run ESLint on all JS/JSX files
npm run preview      # Preview production build locally
```

**Data Management:**
```bash
python3 convert_excel_to_json.py                    # Regenerate courses_data.json from Excel source
python3 scrape_nrt_full.py                          # Scrape real descriptions from training.gov.au (Selenium, ~3.5h)
python3 import_merged_descriptions.py               # Import merged descriptions (real + generated) to Excel
python3 add_descriptions_helper.py                  # Generate CSV template for manual descriptions
python3 import_descriptions.py                      # Import manual descriptions from CSV to Excel
```

**Git & Deployment Workflow (CRITICAL!):**
```bash
# 1. Make changes and commit
git add .
git commit -m "Commit message here"

# 2. ALWAYS push to GitHub (required for Vercel!)
git push origin main                                # Push to GitHub
# Vercel auto-deploys on push (takes 2-3 minutes)

# 3. Verify deployment
git status                                          # Check if "Your branch is up to date with 'origin/main'"
vercel --prod                                       # (Optional) Force immediate production deploy
```

**⚠️ IMPORTANT**: Never leave commits locally. If `git status` shows "ahead of origin/main", you MUST push! Otherwise Vercel deployment will fail.

## Architecture

### Data Flow

1. **Source**: CRICOS Excel file (`.xlsx`) with 5 sheets: Purpose Statement, Institutions, Courses, Locations, Course Locations
2. **Conversion**: `convert_excel_to_json.py` reads Excel → outputs `public/courses_data.json`
3. **App Data**: `useCourseData` hook fetches `courses_data.json` at app startup
4. **Filter State Management**: `useFilters` hook manages all filter state, debouncing, pagination, and sorting
5. **Filtering**: `filterCourses()` utility applies multi-dimensional filters (search, location, course level, field, duration, fees, work component, foundation studies)
6. **Pagination**: Results grouped by institution (preserves existing CourseCard design)
7. **Display**: Components render paginated and filtered institutions with their courses

### Data Flow Diagram

```
useCourseData (fetch JSON)
        ↓
    App.jsx
        ↓
useFilters hook
  ├─ searchTerm (debounced 300ms)
  ├─ selectedStates, selectedLevels, selectedFields
  ├─ durationFilter, feeMin, feeMax, feePeriod
  ├─ workComponent, foundationStudies
  ├─ sortBy, currentPage, itemsPerPage
  └─ calls filterCourses() with all filters
        ↓
  Filtered + Sorted + Paginated Results
        ↓
  Components render:
  ├─ FilterPanel (left sidebar)
  ├─ SearchBar (text input only)
  ├─ ResultBar (counter + sort + items/page dropdowns)
  ├─ CourseCard[] (paginated institutions)
  └─ Pagination (page navigation)
```

### Component Architecture

**App.jsx** (orchestrator):
- Manages layout: header → search bar → (filter sidebar/modal + content area) → footer
- Uses `useCourseData()` to load all institutions
- Uses `useFilters(data)` hook for all filter/sort/pagination state
- Renders conditional loading/error/empty states with animations
- Manages modal state: `isFilterOpen` boolean (v2.7)
- Desktop (≥768px): 2-column layout with FilterPanel (sticky sidebar) + ContentArea (results)
- Mobile (<768px): Single column with FilterModal bottom sheet + ContentArea
  - "≡ Filters" button with active filter count badge (v2.7)
  - Results visible first, filters accessible via modal
- Loading state: Animated spinner + message (v2.7)
- No results state: Emoji icon + helpful messaging + action button (v2.7)
- Iterates over `paginatedCourses` (courses with institution context)
- Course modal state: `selectedCourse` + `selectedInstitution` for CourseModal overlay

**useFilters hook** (state management):
- All filter values and setters: searchTerm, selectedStates, selectedCities, selectedLevels, selectedFields, durationFilter, feeMin/Max, feePeriod, includeFeeNotSpecified, workComponent, foundationStudies
- Debounces search term (300ms) to avoid excessive filtering
- Manages pagination state: currentPage, itemsPerPage, totalPages
- Manages sorting state: sortBy ('name' or 'price')
- Returns derived data: paginatedCourses (flattened courses with institution context), totalInstitutions, totalCourses, activeFilterCount
- Pagination by individual courses (not institutions)
- Resets currentPage to 1 when any filter/sort changes
- Provides clearAllFilters() utility function
- Counts selectedCities in activeFilterCount

**SearchBar.jsx**:
- Simple text input (no dropdown selector; state filter moved to FilterPanel)
- Controlled component: receives searchTerm and onSearchChange from useFilters
- No internal state or debouncing (debounce is in useFilters hook)

**FilterPanel.jsx** (left sidebar):
- Extracts unique course levels and fields from data (computed on render)
- 10 filter sections: Location, Major Cities, Course Level, Course Area, Duration, Fee, Work Component, Foundation Studies, Regional Areas
- Checkboxes for multi-select filters (States, Cities, Levels, Fields, Regional Categories)
- Major Cities section: **Expandable city groups** (v2.5.1)
  - 9 cities: Sydney, Melbourne, Gold Coast, Brisbane, Perth, Adelaide, Hobart, Canberra, Darwin
  - Each city has collapsible arrow + checkbox for entire city
  - Expanded view shows 15-25 suburbs/areas with individual checkboxes
  - Suburbs indented with left border for visual hierarchy
  - Uses `expandedCities` state to track which cities are expanded
  - User can select entire city OR just specific suburbs
- Regional Areas section: **Category 2 & 3 filters** (v2.6)
  - ★ Cities and major regional centres (gold star)
  - ★ Regional centres and other areas (orange star)
  - Link to Home Affairs designated areas page
- Dropdown for Duration (All / <26 weeks / 26-52 weeks / 52+ weeks)
- Fee inputs (Min/Max) with Fee Period dropdown (All/Tuition/Total) + checkbox for "Include fee not specified"
- Single checkboxes for Work Component and Foundation Studies
- "Clear All Filters" button (visible when activeFilterCount > 0)
- Sticky positioning (top: 20px) on desktop; hidden on mobile
- **Mobile adaptive**: `isMobileModal` prop controls rendering wrapper (v2.7)
  - Desktop: Wrapped in `<aside className="filter-sidebar">`
  - Mobile modal: Returns raw content (unwrapped) for FilterModal container

**FilterModal.jsx** (mobile bottom sheet):
- Bottom sheet modal that slides up from screen bottom on mobile
- Header: Drag handle + "Filters" title + close button (✕)
- Content: Scrollable FilterPanel content
- Backdrop: Semi-transparent overlay, clickable to close
- Animations: Smooth slide-up (cubic-bezier easing), fade-in backdrop
- Max height: 85vh (85% of viewport height)
- Desktop: Hidden (display: none via media query)

**ResultBar.jsx**:
- Displays: "Showing X–Y of Z courses (W institutions)"
- Pagination by courses (not institutions)
- Dropdown to sort by: Name (A-Z) or Price (Low-High)
- Dropdown to set items per page: 10, 25, or 50
- Updates currentPage to 1 when items/page changes

**Pagination.jsx**:
- Page number buttons: Prev / 1 2 … N / Next
- Ellipsis logic: shows first page + middle range (currentPage ±2) + last page
- Current page styled with gradient background (orange to dark orange)
- Disabled prev/next buttons at boundaries
- Max 7 pages shown; if ≤7 total pages, show all

**CourseCard.jsx** (Feb 2026 redesign):
- EduConnect-style layout: Logo (left) | Course Info (center) | Price (right top)
- Top section: Logo | Info | Price
- Bottom section: Compare checkbox (left) | Action buttons (right): Heart, Enquire, Apply
- Props: `course` (individual course with institution context), `institution` (parent institution object), `onCardClick` (opens modal)
- Logo system: Displays `institution.logoUrl` if available; falls back to auto-generated colored placeholder with initials
- Placeholder: Deterministic hash-based colors (same institution always gets same color)
- Logo error handling: `onError` handler gracefully falls back if image fails to load
- Course title in orange (#C7613C), course level, duration (days-week format), delivery method (On Campus/Work Component/etc)
- Institution name and first location (city, state)
- Price display: AUD + amount + "Per Course" (or "TBA" if price not specified)
- Action buttons: Compare (checkbox), Heart (wishlist), Enquire (gray), Apply (orange #C7613C)
- Clickable: Entire card is clickable to open CourseModal
- Responsive: Horizontal on desktop, stacks on mobile

**search.js** (filter utility):
- `filterCourses(institutions, filters)` — single options object replaces positional args
- Applies 9 filter conditions (all must pass / AND logic):
  1. Search term (case-insensitive partial match on courseName)
  2. Course Level (if selected, course.courseLevel must be in array)
  3. Field of Education (if selected, course.fieldOfEducation must be in array)
  4. Duration (bucket check: <26, 26-52, 52+ weeks; null duration excluded unless 'all')
  5. Fee range (compare tuitionFee or totalCost depending on feePeriod; null fees pass only if includeFeeNotSpecified)
  6. Work Component (if true, hasWorkComponent must be true)
  7. Foundation Studies (if true, isFoundationStudies must be true)
  8. States (filter locations to selected states; trim location objects to match)
  9. Cities (uses postcode ranges from CITY_MAPPING; location's postcode must fall in selected city's range)
- Returns institutions with 0 matching courses excluded
- City/postcode mapping: Built from CITY_MAPPING in cityMapping.js (each city has one or more [[min, max]] postcode ranges)

**useCourseData.js**:
- Calls `fetch('/courses_data.json')` on mount
- Returns `{ data, loading, error }`
- Single fetch per app lifetime

**HubSpot CRM Integration (Planned v2.8+)**:
- Currently NOT implemented; user confirmed using existing HubSpot CRM (Edvisor system) for application handling
- Architecture will follow separation of concerns:
  - **Frontend (React)**: Apply button opens form, collects user data, submits to backend endpoint
  - **Backend (Node.js/Python)**: Handles HubSpot API authentication, creates Contacts, processes file uploads
  - **HubSpot**: Stores applications as Custom Objects linked to Contacts, manages pipeline/workflow
- Benefits of this approach:
  - HubSpot handles all compliance/security (Privacy Act, encryption, audit logging)
  - Frontend doesn't need sensitive data validation (server handles it)
  - File uploads scanned server-side before HubSpot transmission
  - Existing CRM infrastructure reused (no duplicate systems)

**CourseModal.jsx** (Feb 2026 new):
- Full-screen modal overlay with course details
- Opens when CourseCard is clicked
- Displays: Tytuł | Institution + Website | Price (with breakdown) | Course Details grid | All Locations | Footer actions
- Course details include: Level, Duration, Field of Study, Work Component checkbox, Foundation Studies checkbox
- Locations card: Shows all available locations with address, city, state, postcode
- Actions: Close (left), Heart, Enquire, Apply (right)
- Responsive: Scales down on mobile with scrollable content
- Animation: Fade-in overlay + slide-up content

## City Filter System

### How City Filtering Works (March 6, 2026)

**Key Change**: City filtering uses **postcode ranges** (not suburb names) for precise geographic accuracy.

Each city in `src/utils/cityMapping.js` is defined by one or more postcode ranges:

```javascript
export const CITY_MAPPING = {
  Sydney: {
    state: 'NSW',
    name: 'Sydney',
    postcodeRanges: [
      [2000, 2299]   // Greater Sydney metropolitan area
    ]
  },
  Newcastle: {
    state: 'NSW',
    name: 'Newcastle',
    postcodeRanges: [
      [2287, 2328],  // Newcastle, Lake Macquarie, Hunter
      [2338, 2380]   // Maitland, Singleton, Raymond Terrace
    ]
  },
  // ... more cities
};
```

**How filtering works** (in `search.js`):
1. User selects city (e.g., "Newcastle")
2. Filter gets postcode ranges for that city: `[[2287, 2328], [2338, 2380]]`
3. For each course location, checks if location's postcode falls in any of those ranges
4. If match → course included; if no match → course excluded

**Filter Logic** (`isPostcodeInAnyCities()`):
```javascript
function isPostcodeInAnyCities(postcode, cities) {
  const postcodeNum = parseInt(postcode);
  return cities.some(city => {
    const ranges = CITY_MAPPING[city]?.postcodeRanges || [];
    return ranges.some(([min, max]) => postcodeNum >= min && postcodeNum <= max);
  });
}
```

### City Filter + State Filter (How They Work Together)

| Scenario | Result |
|----------|--------|
| No filters selected | Show ALL courses from all states & cities |
| State selected only (NSW) | Show all NSW courses (Sydney + Newcastle + Wollongong + Byron Bay + regional) |
| City selected only (Newcastle) | Show only Newcastle courses (regardless of state) |
| Both State + City (NSW + Newcastle) | Show only Newcastle courses in NSW |
| Multiple Cities (Sydney + Melbourne) | Show Sydney + Melbourne courses (combined) |

**Important**: City filter takes precedence over state filter if both are selected.

### Why Postcode Ranges?

✅ **Pros**:
- Geographic accuracy - no ambiguity about which suburb belongs to which city
- Prevents overlaps - postcode 2300 can only be Newcastle, not Sydney
- Scalable - easy to expand/update ranges

❌ **Cons**:
- ~4.8% of courses in regional areas not covered (see "Data Coverage")
- Requires careful range management to avoid overlap

### City Filter Testing

When modifying city postcode ranges, always verify:

```bash
# Test if ranges are separated correctly
node -e "
const fs = require('fs');
eval(fs.readFileSync('src/utils/cityMapping.js', 'utf8'));

// Check specific postcode
function testPostcode(pc, expectCities) {
  const cities = Object.keys(CITY_MAPPING).filter(city => {
    const ranges = CITY_MAPPING[city].postcodeRanges;
    return ranges.some(([min, max]) => pc >= min && pc <= max);
  });
  console.log(\`Postcode \${pc}: \${cities.join(', ') || 'NO MATCH'}\`);
}

testPostcode(2000, ['Sydney']);  // Should match Sydney only
testPostcode(2300, ['Newcastle']); // Should match Newcastle only
testPostcode(3000, ['Melbourne']); // Should match Melbourne only
"
```

### Directory Structure

```
src/
├── App.jsx                 # Main orchestrator (layout, loading states, modal state)
├── App.css                 # App layout (.content-layout, .filter-sidebar, .content-area)
├── index.css              # Global styles
├── main.jsx               # React entry point
├── components/
│   ├── SearchBar.jsx      # Text input only (no dropdowns)
│   ├── FilterPanel.jsx    # Left sidebar with 8 filter sections
│   ├── ResultBar.jsx      # Counter + sort + items/page controls
│   ├── Pagination.jsx     # Page navigation
│   ├── CourseCard.jsx     # Course card (clickable to open modal)
│   ├── CourseModal.jsx    # Expanded course details modal
│   └── StateBadge.jsx     # State abbreviation badge
├── hooks/
│   ├── useFilters.js      # All filter/sort/pagination state management
│   └── useCourseData.js   # Data fetching
├── utils/
│   ├── search.js          # filterCourses(institutions, filters) multi-dimensional filter logic
│   └── cityMapping.js     # Major Australian cities to suburbs/areas mapping
├── styles/
│   ├── SearchBar.css      # Text input styling
│   ├── FilterPanel.css    # Sidebar, checkboxes, selects, fee inputs
│   ├── ResultBar.css      # Counter and control styles
│   ├── Pagination.css     # Pagination button styles
│   ├── CourseCard.css     # Course card styles
│   ├── CourseModal.css    # Modal styles (overlay, animations, responsive)
│   └── StateBadge.css     # State badge styles
└── assets/
    ├── edvise-logo.png           # Main app logo
    ├── logos/                     # Source logos (for reference, served from public/logos/)
    │   ├── sydney.png
    │   ├── unsw.png
    │   ├── monash.png
    │   └── ... (8 top universities)
    └── logo-mapping.json         # Domain → logo URL mapping
public/
├── courses_data.json             # Generated data (1536 institutions, 25,841 courses)
├── logos/                        # Served logos (copied from src/assets/logos/)
│   ├── sydney.png
│   ├── unsw.png
│   └── ... (8 top universities)
└── ...
convert_excel_to_json.py          # Data conversion script
```

### JSON Data Structure

The `courses_data.json` file contains an array of institutions:

```json
[
  {
    "providerCode": "00001K",
    "name": "Institution Name",
    "registeredName": "Official Registered Name",
    "website": "https://example.com",
    "domain": "example.edu.au",
    "logoUrl": "/logos/example.png",
    "allStates": ["NSW", "VIC"],
    "courses": [
      {
        "courseCode": "078241E",
        "courseName": "Bachelor of Science",
        "durationWeeks": 104,
        "tuitionFee": 25000,
        "nonTuitionFee": 500,
        "totalCost": 25500,
        "courseLevel": "Graduate Diploma",
        "fieldOfEducation": "Natural and Physical Sciences",
        "isFoundationStudies": false,
        "hasWorkComponent": true,
        "description": "Master advanced science principles...",
        "locations": {
          "NSW": [
            {
              "locationName": "Campus Name",
              "address": "123 Main St",
              "city": "Sydney",
              "state": "NSW",
              "postcode": "2000"
            }
          ],
          "VIC": [...]
        }
      }
    ]
  }
]
```

**All Fields:**
- `courseCode`: CRICOS course code (string)
- `courseName`: Full course name (string)
- `durationWeeks`: Course duration in weeks (integer or null)
- `tuitionFee`: Tuition component of fees (integer or null)
- `nonTuitionFee`: Non-tuition fees (integer or null)
- `totalCost`: Total cost (integer or null)
- `courseLevel`: Course qualification level (string, e.g., "Bachelor Degree", "Graduate Diploma", "Non AQF Award")
- `fieldOfEducation`: Broad field of education (string, e.g., "Natural and Physical Sciences", "Society and Culture") — numeric prefix stripped
- `isFoundationStudies`: Boolean; true if course includes foundation studies component
- `hasWorkComponent`: Boolean; true if course includes work placement or work-integrated learning
- `description`: Course overview/description (string, optional, populated in Column 25 of Excel)

### Data Conversion Script (convert_excel_to_json.py)

Reads from: `/Users/rudybobek/Downloads/cricos-providers-courses-and-locations-as-at-2026-1-2-9-26-52.xlsx`

Outputs to: `public/courses_data.json`

**Process:**
1. Load Institutions sheet (row 3 = headers, row 4+ = data) → dict by providerCode
   - Columns: Provider Code (1), Trading Name (2), Institution Name (3), Website (6)
2. Load Locations sheet → dict by (providerCode, locationName) key
   - Columns: Provider Code (1), Location Name (3), Address Lines (5-7), City (9), State (10), Postcode (11)
3. Load Courses sheet → filter where Expired ≠ "No" → list of course objects
   - Columns: Provider Code (1), Course Code (3), Course Name (4), Duration Weeks (20), Tuition Fee (21), Non-Tuition Fee (22), Total Cost (23), Field of Education (7), Course Level (13), Foundation Studies (14), Work Component (15), **Description (25)**
4. Load Course Locations sheet → group by (providerCode, courseCode) → locations list
   - Columns: Provider Code (1), Course Code (3), Location Name (4), City (5), State (6)
5. Join data: for each institution, get all its courses and their locations grouped by state
6. Write JSON to public/courses_data.json

**Field Extraction:**
- **Field of Education (Col 7)**: Extract broad field name; strip "NN - " numeric prefix
  - Example: "01 - Natural and Physical Sciences" → "Natural and Physical Sciences"
- **Course Level (Col 13)**: Extract as string (e.g., "Bachelor Degree", "Graduate Diploma")
- **Foundation Studies (Col 14)**: Convert to boolean (yes/1/true → true; otherwise false)
- **Work Component (Col 15)**: Convert to boolean (yes/1/true → true; otherwise false)
- **Description (Col 25)**: Plain text course overview/summary (populated via CSV import workflow)

## Data Coverage & Regional Areas

### Coverage Statistics (March 6, 2026)

**Total coverage**: 95.2% of 44,589 course locations

**By State**:
| State | Coverage | Notes |
|-------|----------|-------|
| VIC | 100% ✅ | Melbourne covers all Victoria |
| ACT | 100% ✅ | Canberra covers all ACT |
| NT | 100% ✅ | Darwin covers all NT |
| WA | 97% ✅ | Perth + most regional areas |
| TAS | 95% ✅ | Hobart covers most Tasmania |
| SA | 94% ✅ | Adelaide covers most South Australia |
| NSW | 94% ⚠️ | Missing: Central Coast, inland regional (Albury, Orange, Dubbo, Wagga Wagga, Port Macquarie, Bathurst, etc.) |
| QLD | 88% ⚠️ | Missing: Some regional areas (Toowoomba, Mackay, Townsville, etc.) |

### Missing 4.8% - Regional Areas

**Institutions affected**:
- Charles Sturt University (multiple campuses: Albury, Bathurst, Dubbo, Orange, Port Macquarie, Wagga Wagga)
- Some smaller regional universities and training providers

**Postcodes NOT covered**:
- NSW: 2317-2478, 2536-2799, 2830-2914 (Central Coast, inland regional, extended ACT)
- QLD: 4280-4799 (Ipswich, Toowoomba, etc.), 4868-4899 (regional)
- SA: 5200+ (regional South Australia)
- Others: Various regional postcodes

### Why These Areas Are Not Covered

**Current approach**: Uses major metropolitan cities only (Sydney, Melbourne, Brisbane, etc.)

**Reason for ~5% gap**:
- Regional cities would require separate city entries (Albury, Orange, Dubbo, Wagga Wagga, Port Macquarie, Coffs Harbour, etc.)
- Would make filter list very long (50+ cities instead of 13)
- User research needed: Do users want regional city filtering?

### Solutions for 100% Coverage

**Option A: Expand city ranges** (Simple)
- Make each city cover its entire state region
- Pro: 100% coverage with no new cities
- Con: Brings back overlap risk (Newcastle might show Sydney)

**Option B: Add regional cities** (Complex)
- Add 20-30 regional city entries to CITY_MAPPING
- Pro: Users can filter by specific regional city
- Con: Long filter list, more maintenance

**Option C: State + Optional Sub-filter** (Best UX)
- User selects State → sees ALL courses in state
- Then optionally filters by City (major or regional)
- Pro: 100% coverage + clear hierarchy
- Con: Requires UI changes

**Current status**: Using Option A (partial - covers 95.2%). See "City Filter Architecture" at top for current ranges.

---

## Styling & Brand

**Color Palette (EDVISE Brand):**
- Primary Orange: `#C7613C` (main brand color)
- Primary Orange Dark: `#A84B2A` (hover/dark states)
- Primary Orange Light: `#D97552` (light variant)
- Cream Background: `#faf6f1` (app background)
- Header Text: `#FCF9E2` (cream/light color for text on dark backgrounds)
- Text Dark: `#2c2c2c` (primary text)
- Text Secondary: `#666666` (secondary text)
- Card Background: `#ffffff` (white cards)
- Card Shadow: `0 4px 20px rgba(199, 97, 60, 0.1)` (orange-tinted shadows)
- Border Light: `#e8ddd4` (light border)

**Typography:**
- Font: `'Helvetica', 'Helvetica Neue', Arial, sans-serif`
- Bold (700) weight for: headings (h1-h6), institution names, course names, buttons, labels
- Base line-height: 1.6
- Letter-spacing adjustments for headings

**Header Design:**
- White box (`#FCF9E2`) on pomarańczowy gradient background
- Logo: max-width 140px (scales responsively)
- "EDVISE Course Finder" title in orange (`#C7613C`) inside white box, centered
- Subtitle below in cream color
- Fully responsive: stacks on mobile

**Layout:**
- Max content width: 1100px
- Mobile breakpoint: 768px
- Responsive grid: 1 column (mobile) → 2 columns (desktop)

**Accessibility:**
- All inputs have visible focus states (2px outline)
- ARIA labels on SearchBar inputs
- Semantic HTML (h1-h4 headings, lists, buttons)
- Color contrast ratios meet WCAG AA

## Key Implementation Details

### Multi-Dimensional Filter Logic

All filter conditions use AND logic (must all pass):

1. **Search Term**: Case-insensitive partial match on courseName
   - Debounced 300ms in useFilters hook to prevent excessive filtering
   - Empty search matches all courses

2. **Location (States)**: Multiple states selected as array
   - Filters courses to only those with locations in selected states
   - Locations object trimmed to match selected states
   - Empty array matches all locations
   - Can be combined with city filter (both conditions applied)

9. **Location (Cities/Suburbs)**: Multiple cities/suburbs selected as array
   - Each city expands to include all its suburbs/areas (from CITY_MAPPING)
   - Example: Selecting "Sydney" includes Redfern, Haymarket, Parramatta, Manly, Bondi, etc.
   - User can select entire city OR just specific suburbs from expanded list
   - Location's city must match one of the selected cities/suburbs in the combined list
   - Empty array matches all cities/suburbs
   - Operates independently OR combined with state filter (takes precedence for location matching)
   - Solves problem where "Sydney" courses in Redfern, Haymarket, Parramatta wouldn't show before
   - UI: Hierarchical expandable city groups with visual distinction (cities in orange, suburbs in gray)

3. **Course Level**: Multiple levels selected as array
   - `course.courseLevel` must be in selectedLevels array
   - Empty array matches all levels

4. **Field of Education**: Multiple fields selected as array
   - `course.fieldOfEducation` must be in selectedFields array
   - Empty array matches all fields

5. **Duration**: Single dropdown selection
   - "all" matches all courses
   - "<26": `durationWeeks < 26`
   - "26-52": `26 <= durationWeeks < 52`
   - "52+": `durationWeeks >= 52`
   - Courses with `durationWeeks === null` excluded unless "all" selected

6. **Fee Range**: Min/Max inputs with Fee Period dropdown
   - feePeriod "tuition" → compare tuitionFee
   - feePeriod "total" → compare totalCost
   - feePeriod "all" → use totalCost if available, else tuitionFee
   - Courses with null fees pass only if includeFeeNotSpecified is true
   - Empty min/max (null) ignores that bound

7. **Work Component**: Boolean checkbox
   - If true, `course.hasWorkComponent` must be true
   - If false, all courses pass

8. **Foundation Studies**: Boolean checkbox
   - If true, `course.isFoundationStudies` must be true
   - If false, all courses pass

9. **Regional Category** (Home Affairs Designated Regional Areas): Multiple categories selected as array
   - Uses `getRegionalCategory(postcode, state)` to classify each location's postcode
   - 3-tier system:
     - Category 1: Major Cities (Sydney, Melbourne, Brisbane) — not shown in filter, no badge on cards
     - Category 2: Cities and major regional centres — ⭐ badge
     - Category 3: Regional centres and other regional areas — ✦ badge
   - Each location filtered to match selected categories (2, 3, or both)
   - Empty array matches all locations (all categories included)
   - Regional badges displayed on CourseCard showing location's category
   - Use case: Users filtering for regional areas qualifying for visa benefits

### Pagination by Course

- Pagination unit is **individual courses**, not institutions
- Each course is displayed as a separate card with its institution context
- Each page displays X courses (10, 25, or 50 selectable)
- Total institution count reflects unique institutions in filtered results
- currentPage resets to 1 when any filter changes

### Sorting

- Sort by: Course Name (A-Z) or Price (Low-High)
- Both sorts are applied after filtering to flattened course list
- Sort does not reset currentPage (but filters do)
- Price sorting uses `tuitionFee` if available, otherwise `totalCost`

### Fee Display Logic

In CourseCard.jsx:
```javascript
if (nonTuitionFee > 0) {
  // Show: "Tuition $X + Additional $Y = Total $Z"
} else {
  // Show: "$X"
}
```

## Common Development Tasks

**Add course descriptions from training.gov.au (real descriptions):**
1. Run `python3 scrape_nrt_full.py` → searches training.gov.au for all unique course names (takes ~3.5 hours)
2. Creates `nrt_full_results.json` with found/not-found courses and `courses_merged_descriptions.csv` with merged descriptions
3. Run `python3 import_merged_descriptions.py` → imports real descriptions (30%) + generated fallback (70%) to Excel
4. Run `python3 convert_excel_to_json.py` → regenerates JSON with all descriptions
5. Refresh app to see descriptions (real + generated) in CourseModal

**Add course descriptions manually:**
1. Run `python3 add_descriptions_helper.py` → generates `courses_to_add_descriptions.csv`
2. Open CSV and populate Description column (copy-paste from provider websites)
3. Run `python3 import_descriptions.py` → adds descriptions back to Excel
4. Run `python3 convert_excel_to_json.py` → regenerates JSON with descriptions
5. Refresh app to see descriptions in CourseModal

**Add a new course field to display:**
1. Add new column to Excel (note column number)
2. Update `convert_excel_to_json.py` to extract field from that column
3. Regenerate `public/courses_data.json`
4. Update `CourseModal.jsx` to display field in appropriate section (or CourseCard.jsx for card-level display)
5. Add CSS in `src/styles/CourseModal.css` or `src/styles/CourseCard.css` if needed

**Add a new filter (e.g., course level):**
1. Update conversion script to extract/group the data
2. Regenerate JSON
3. Add new state in `useFilters` hook
4. Update `search.js` to filter by new criteria
5. Add UI component in `FilterPanel.jsx` for selection

**Update branding colors:**
- Primary colors defined in `src/App.css` (`:root` CSS variables)
- CSS variables: `--primary-orange`, `--primary-orange-dark`, `--primary-orange-light`, etc.
- Update color values in `src/App.css` and propagate to components
- Individual component colors in `src/index.css` and `src/styles/*.css`
- All orange colors currently use `#C7613C` and `#A84B2A` variants

**Update logo:**
- Replace `src/assets/edvise-logo.png` with new logo file
- Logo is displayed in `.header-content` with max-width 140px
- Adjust width in `src/App.css` if needed

**Add institution logos:**
1. Obtain logo file (PNG or PNG preferred)
2. Place in `src/assets/logos/{name}.png` (e.g., `src/assets/logos/sydney.png`)
3. Copy to public: `cp src/assets/logos/{name}.png public/logos/`
4. Add mapping in `src/assets/logo-mapping.json`: `"domain.edu.au": "/logos/name.png"`
5. Regenerate data: `python3 convert_excel_to_json.py`
6. Dev server will pick up changes automatically (with HMR)

**Regenerate data from updated Excel:**
```bash
# If the source Excel file has been updated:
python3 convert_excel_to_json.py
npm run build
npm run preview  # to verify the new data loads correctly
```

## ESLint Configuration

ESLint is configured in `eslint.config.js`:
- Extends: `@eslint/js`, `react-hooks`, `react-refresh`
- Ignores: `dist/` directory
- Custom rule: uppercase variables (const X, const X_Y) ignore unused var warnings
- Run: `npm run lint`

## Admin Authentication System

**Location:** `src/components/AdminPanel.jsx` + `src/App.jsx`

**Current Status:** ✅ COMPLETE - Login persists across page refresh (Feb 26, 2026)

**How it Works:**
- Password stored in environment variable: `VITE_ADMIN_PASSWORD` (default: `admin2026`)
- State managed in App.jsx: `isAdminAuthenticated` (boolean)
- **localStorage Persistence**: Auth state automatically saved to `edvise_admin_authenticated` key
- On page load: useEffect hook restores auth state from localStorage
- On auth change: useEffect hook updates localStorage immediately
- AdminPanel component receives `isAuthenticated` prop from parent
- When authenticated, shows dashboard with tabs: Offers, Summary, History, Email

**Authentication Flow:**
1. User enters password in AdminPanel login form
2. Password checked against `import.meta.env.VITE_ADMIN_PASSWORD`
3. On successful login: `setIsAdminAuthenticated(true)` called
4. useEffect in App.jsx automatically saves to localStorage
5. On page refresh: useEffect loads from localStorage and restores state
6. User remains logged in across page refreshes ✅

**Configuration:**
- `.env` file stores `VITE_ADMIN_PASSWORD=admin2026`
- `.env.example` provides template for developers
- `.gitignore` prevents .env from being committed (security)

**Components in Admin Dashboard:**
1. **Offers Tab** - Prepare and manage client offers
2. **Summary Tab** - Latest CRICOS update statistics
3. **History Tab** - Past updates with timestamps
4. **Email Tab** - Send update reports to clients

**Props:**
- `isOpen`: Boolean controlling panel visibility
- `setIsOpen`: Callback to toggle visibility
- `isAuthenticated`: Current auth state (from App.jsx)
- `onAuthChange`: Callback when auth status changes
- `selectedCourses`: Array of courses selected via "Add to Offer"
- `onClearSelection`: Callback to clear selected courses

**Implementation Details (Feb 26, 2026):**
- `src/App.jsx` lines 34-44: Two useEffect hooks
  - Hook 1: Load from localStorage on mount
  - Hook 2: Save to localStorage on isAdminAuthenticated change
- `src/components/AdminPanel.jsx` line 71: Uses `import.meta.env.VITE_ADMIN_PASSWORD`
- Storage key: `edvise_admin_authenticated` (string "true"/"false")
- Build verified: Production build succeeds with env variable integration

## Data Reports System

**Location:** `data_reports/` folder (source) + `public/data_reports/` (served)

**Key Scripts:**
- `generate_change_report_html.py` - Generates HTML reports from JSON
- `auto_update_data.py` - Monitors Excel, converts data, generates reports, logs everything

**Report Structure:**
- Main index: `/data_reports/html/index.html` - Lists all update reports
- Individual reports: `/data_reports/html/update_report_*.html` - Full report with pagination

**Pagination System (Feb 25, 2026):**
- Each report shows 771 courses total
- First 51 courses hardcoded as static HTML (always visible on page 1)
- Remaining 720 courses loaded dynamically via JavaScript from JSON
- **Page 1:** Shows static #1-51 + pagination #52-101 (50 courses)
- **Pages 2+:** Shows ONLY pagination courses (no repetition), e.g., page 2 = #102-151
- 50 courses per page with smart pagination buttons
- Course numbering: #1-#771 for easy tracking
- Smooth scroll to top when changing pages

**Implementation Details:**
- Load courses from `/data_reports/update_report_*.json` via fetch
- JavaScript functions: `initPagination()`, `renderPagination()`, `displayPageCourses()`, `goToPage()`
- Hide static courses on page 2+ using `display: none` on `.change-item:not(.pagination-course)`
- Console logging with emoji indicators for debugging

**Directory Structure:**
```
data_reports/
├── html/
│   ├── index.html                          # Reports listing
│   └── update_report_YYYYMMDD_HHMMSS.html # Individual report with pagination
├── logs/
│   └── update_YYYYMMDD_HHMMSS.log         # Update logs
├── update_report_*.json                    # Raw data for reports (used by pagination)
├── update_status.json                      # Sync status tracker
└── latest_notification.json                # Last update result

public/data_reports/                        # Mirror of data_reports (served by Vite)
```

**Files Always in Sync:**
- Both `/data_reports/` and `/public/data_reports/` must be identical
- `auto_update_data.py` copies reports to `public/` automatically after generation
- Update both locations if modifying report HTML manually

## Automatic Data Update System

**Location:** `auto_update_data.py` + `SETUP_AUTO_UPDATE.md`

**Features:**
1. **File Change Detection** - SHA256 hash comparison of Excel file
2. **Data Conversion** - Runs `convert_excel_to_json.py` subprocess
3. **Report Generation** - Runs `generate_change_report_html.py` subprocess
4. **Auto-Copy** - Copies reports to `public/` for Vite serving
5. **Logging** - Detailed logs in `data_reports/logs/`
6. **Status Tracking** - JSON files for frontend integration

**Manual Trigger:**
```bash
python3 auto_update_data.py
```

**Cron Setup (see SETUP_AUTO_UPDATE.md):**
```bash
# Example: Daily at 2:00 AM
0 2 * * * cd /Users/rudybobek/edvise-course-finder && python3 auto_update_data.py >> data_reports/cron.log 2>&1
```

**Output Files Generated:**
- `data_reports/logs/update_YYYYMMDD_HHMMSS.log` - Detailed run log
- `data_reports/update_status.json` - Last 50 updates history
- `data_reports/latest_notification.json` - Success/failure status
- `data_reports/html/update_report_*.html` - HTML report with pagination
- `public/data_reports/` - Copies of all above for web serving

**Status File Format (update_status.json):**
```json
{
  "last_update": "2026-02-25T11:00:16Z",
  "update_count": 5,
  "history": [
    {"timestamp": "...", "success": true, "changes": 782, "log": "..."},
    ...
  ]
}
```

## Build & Deployment

**Development Build:**
```bash
npm run dev
```
- Hot module reload (HMR) enabled
- Source maps available
- No optimization
- Serves from http://localhost:5173

**Production Build:**
```bash
npm run build
```
- Output: `dist/` folder
- Minified JS (~62 KB gzipped)
- Optimized CSS (~1.6 KB gzipped)
- Static assets included
- courses_data.json copied to dist/
- `public/data_reports/` copied to dist/ for reports access

**Deployment:**
- Upload `dist/` folder to Netlify or any static host
- Set public directory to `dist/`
- No server-side logic required
- courses_data.json is served as a static asset
- Data reports accessible at `/data_reports/html/`

## Performance Considerations

- **Data file size**: ~31 MB uncompressed (courses_data.json with 25,867 course descriptions). Consider GZIP compression on hosting.
- **Single data fetch**: Data is fetched once on app load via `useCourseData` hook.
- **Filter performance**: Filtering 1536 institutions with 25,841 courses is synchronous and happens on every filter change. Search term is debounced 300ms to reduce frequency. Current implementation is fast enough for this dataset.
- **Pagination**: Results now paginated by individual courses (10/25/50 per page). Pagination is client-side (no server request); all data loaded once at startup.
- **useMemo optimization**: `useFilters` hook uses useMemo for filteredInstitutions, flattenedCourses, sortedCourses, and paginatedCourses to prevent unnecessary recalculations.

## useFilters Hook Usage Pattern

The `useFilters` hook centralizes all filter, sort, and pagination logic. To use it in App.jsx:

```javascript
import { useFilters } from './hooks/useFilters';

function App() {
  const { data, loading, error } = useCourseData();
  const filters = useFilters(data);

  // Access filter state:
  filters.searchTerm               // Current search term (debounced)
  filters.selectedStates           // Array of selected states
  filters.selectedCities           // Array of selected major cities
  filters.selectedLevels           // Array of selected course levels
  filters.selectedFields           // Array of selected field of education
  filters.durationFilter           // Duration bucket ('all', 'under26', '26to52', '52plus')
  filters.feeMin / filters.feeMax  // Fee range bounds
  filters.feePeriod                // Fee comparison type ('all', 'tuition', 'total')
  filters.includeFeeNotSpecified   // Boolean: include courses with no fee data
  filters.workComponent            // Boolean: filter to work-included courses
  filters.foundationStudies        // Boolean: filter to foundation studies courses
  filters.selectedCategories       // Array of selected regional categories (2 and/or 3)

  // Access pagination/sort state:
  filters.currentPage              // Current page (1-based)
  filters.itemsPerPage             // Items per page (10, 25, or 50)
  filters.sortBy                   // Sort method ('name' or 'price')
  filters.totalPages               // Calculated total pages

  // Access derived data:
  filters.paginatedCourses         // Sliced array of individual courses with institution context
  filters.totalInstitutions        // Count of unique institutions in filtered results
  filters.totalCourses             // Total count of filtered courses
  filters.activeFilterCount        // Number of active filters (for badge/button)

  // Use setters:
  filters.setSearchTerm(term)            // Update search (triggers debounce)
  filters.setSelectedStates(arr)         // Update state filter
  filters.setSelectedCities(arr)         // Update major cities filter
  filters.setSelectedCategories(arr)     // Update regional categories filter
  filters.setCurrentPage(num)            // Go to page
  filters.clearAllFilters()              // Reset all filters to default
}
```

All filter setters automatically reset currentPage to 1. The hook internally manages debouncing of the search term and memoization of derived results. Each course in `paginatedCourses` includes its parent institution via `course.institution` property.

## Testing the App

**Basic flow:**
1. Start: `npm run dev`
2. Search: Type "marketing" → should see institutions with "marketing" courses
3. Filter: Select "NSW" → should only see NSW locations
4. Visit: Click "Visit Website" → should open institution website in new tab

**Data verification:**
```python
# Verify JSON structure
import json
with open('public/courses_data.json') as f:
    data = json.load(f)
    print(f"Institutions: {len(data)}")
    print(f"Total courses: {sum(len(i['courses']) for i in data)}")
```

## Notes for Future Developers

- The data conversion process is one-way (Excel → JSON). There's no sync mechanism back to Excel.
- Course data is static and loaded once at app startup. Real-time updates would require different architecture (API endpoint instead of static JSON).
- The Excel file path is hardcoded in `convert_excel_to_json.py`. Update before re-running if file location changes.
- Institution names use "Trading Name" if available, otherwise "Institution Name" from Excel.
- Expired courses (Expired = "Yes") are filtered out during conversion.

## Future Feature: HubSpot CRM Integration (In Planning)

**Planned: Apply Form + HubSpot Submission (v2.8+)**

The app will eventually include an "Apply" workflow that submits user applications to HubSpot CRM (Edvisor system). Architecture:

1. **Apply Form Component** (new): React form with fields for applicant details, document uploads
2. **HubSpot API Integration**: POST to HubSpot REST API to create new Contact + Application object
3. **Security**: Data transmission via HTTPS only; validation on both client and server
4. **Data Flow**: Apply button → Form modal → HubSpot API → Creates Contact + linked Application record
5. **Server-side**: Separate backend service (Node.js/Flask) handles HubSpot authentication (API key never exposed to frontend)
6. **File handling**: Document uploads temporarily stored, scanned for malware, then transferred to HubSpot storage

Current status: Planning phase. UI/UX already designed; awaiting backend infrastructure setup.

## localStorage Persistence System

**Components Using localStorage:**
1. **Compare/Wishlist** - `useCompareNotes()` and `useWishlist()` hooks
2. **Offers** - `useFilters()` hook stores selected courses
3. **Admin Auth** - ⚠️ NOT YET IMPLEMENTED (in progress)

**Current Persistence:**
- Wishlist items stored under key: `edvise_wishlist`
- Compare notes stored under key: `edvise_compare_notes`
- Selected offers stored under key: `edvise_offers`
- All persist across page refresh ✅

**Admin Auth Persistence (TODO):**
- Need to store `isAdminAuthenticated` flag in localStorage
- Load from localStorage on App.jsx mount via useEffect
- Consider session timeout (e.g., auto-logout after 8 hours)

## Additional Hooks

**useWishlist()** (`src/hooks/useWishlist.js`):
- `wishlist` - Array of course IDs
- `toggleWishlist(courseId)` - Add/remove from wishlist
- `isInWishlist(courseId)` - Boolean check
- `clearWishlist()` - Reset all

**useCompareNotes()** (`src/hooks/useCompareNotes.js`):
- `notes` - Object of {courseId: note}
- `getNote(courseId)` - Get note for course
- `setNote(courseId, text)` - Save note
- `clearNote(courseId)` - Delete note
- Persists to localStorage automatically

## Recent Updates (March 6, 2026)

### City Filter Postcode Range Fix - Proper Separation

**Issue (March 5):** Newcastle filter was showing Sydney suburbs (Manly, Haymarket, Parramatta, etc.)
- Root cause: All NSW cities had same broad range [2000-2799], causing overlap

**Solution (March 6):** Assigned specific, non-overlapping postcode ranges to each city:

```javascript
// ❌ WRONG - Don't do this!
Newcastle: [[2000, 2799]]  // Covers entire NSW = includes Sydney!

// ✅ CORRECT - Do this!
Sydney: [[2000, 2299]]                      // Sydney metro only
Newcastle: [[2287, 2328], [2338, 2380]]     // Hunter Valley only
Wollongong: [[2500, 2530]]                  // Illawarra only
Byron Bay: [[2480, 2495]]                   // Northern Rivers only
```

**Verification**: All 44,589 course locations tested
- 95.2% coverage with new ranges
- Each city shows ONLY its geographic area
- Hunter Education (postcode 2300) now shows ONLY in Newcastle (not Sydney)

**Files Updated**:
- `src/utils/cityMapping.js` - All city ranges updated to specific, non-overlapping ranges
- Commit: "Fix cityMapping ranges - proper city separation (no overlaps)"

**Testing**: Always verify city separation when modifying ranges (see "City Filter Testing" above)

---

## Recent Updates (Feb 2026)

**Data Reports Pagination System (Feb 25-26, 2026):**
- Implemented smart pagination for 771 course changes in update reports
- 50 courses per page with sequential numbering (#1-#771)
- **Page 1:** Static courses #1-51 always visible + pagination #52-101
- **Pages 2-15:** Dynamic pagination only (#102-151, #152-201, etc.) - no static course repetition
- Hide/show static courses based on page number
- Dynamic course loading via JavaScript from JSON file
- Previous/Next buttons with smart page ellipsis (Prev / 1 2 3 ... N / Next)
- Smooth scroll to top when changing pages
- Course numbering makes it clear which courses are displayed
- Browser console debugging with emoji status indicators
- Files updated: `/data_reports/html/update_report_*.html` and `/public/data_reports/html/update_report_*.html` (kept in sync)

**Automatic CRICOS Data Update System (Feb 25, 2026):**
- New `auto_update_data.py` - Comprehensive automation script (470+ lines)
- SHA256 file hashing to detect Excel changes
- Orchestrates: `convert_excel_to_json.py` → `generate_change_report_html.py`
- Automatic copying of reports to `public/` for Vite serving
- Detailed logging in `data_reports/logs/` with timestamps
- JSON status tracking: `update_status.json` (last 50 updates), `latest_notification.json` (current status)
- Cron job setup documentation: `SETUP_AUTO_UPDATE.md`
- Recommended schedules: Daily (critical), Weekly (production), 6 hours (development)

**Offer Preparation System - Create & Save Client Offers (Feb 25, 2026):**
- New OfferModal component for preparing client offers:
  - Client information form (Name, Email, Phone)
  - Display of selected courses with pricing
  - Editable email template (customizable per client)
  - Save offer to localStorage
  - Copy email to clipboard
- New OfferModal.css with professional styling
- Updated useFilters hook:
  - Added `selectedCourses` state (array of {course, institution})
  - Added `toggleCourseSelection()` - add/remove course from offer
  - Added `isCourseSelected()` - check if course is in offer
  - Added `clearSelectedCourses()` - reset offer selection
- Updated CourseCard component:
  - Changed "Compare" checkbox → "Add to Offer"
  - `isSelected` prop shows selection state
  - `onToggleSelect` callback handles selection
- Updated App.jsx:
  - Import OfferModal
  - Add "Prepare Offer" button (shows only when courses selected)
  - Button displays count of selected courses: "📋 Prepare Offer (3)"
  - Passes selectedCourses to OfferModal
- localStorage integration:
  - Offers stored as JSON under key: `edvise_offers`
  - Each offer contains: ID, client info, courses, email template, timestamp
  - Offers can be loaded/deleted from saved list (future enhancement)
- Email template auto-generates:
  - Client name personalization
  - Course list with prices
  - Total estimated cost calculation
  - Professional closing with agency details
- User workflow:
  1. Search & filter courses
  2. Click "Add to Offer" on desired courses
  3. "Prepare Offer" button appears with count
  4. Click button → OfferModal opens
  5. Fill in client info (Name, Email, Phone)
  6. Edit email template as needed
  7. Save Offer (stored in localStorage)
  8. Copy email to clipboard & send to client
- Next phase (FAZA 6): Backend integration
  - Move offers to database (MongoDB/PostgreSQL)
  - API endpoints for CRUD operations
  - Email sending functionality

**Major Cities - Postcode-Based Filtering (Feb 25, 2026):**
- Migrated from suburb names to postcode ranges for accurate city filtering
- Updated `cityMapping.js`:
  - Replaced suburb arrays with postcode ranges: `[[min, max]]` format
  - Added 4 new major cities: Newcastle, Wollongong, Byron Bay, Cairns
  - 13 total major cities now supported with precise postcode coverage
- Postcode ranges ensure all schools/locations within city region are included:
  - **Sydney**: 2000-2299 (all NSW metro + suburbs)
  - **Newcastle**: 2287-2298 (precise Newcastle area only)
  - **Wollongong**: 2500-2527 (Illawarra region)
  - **Byron Bay**: 2480-2489 (Northern Rivers area)
  - **Cairns**: 4870-4879 (Tropical north area)
  - Plus existing: Melbourne, Brisbane, Gold Coast, Perth, Adelaide, Hobart, Canberra, Darwin
- Updated `search.js`:
  - Uses `isPostcodeInAnyCities()` helper to filter by postcode ranges
  - Accurate location filtering based on postcode lookup (not suburb name matching)
- Simplified `FilterPanel.jsx`:
  - Removed expandable suburb groups (no longer needed with postcode ranges)
  - Major Cities now displays as simple checkbox list
  - Cleaner UI, better UX
- Benefits:
  - ✅ No more incorrect suburb/city inclusions
  - ✅ All schools in geographic area are included
  - ✅ Newcastle, Wollongong etc. no longer incorrectly merged with Sydney
  - ✅ New cities (Cairns, Byron Bay) properly supported
  - ✅ Smaller bundle size (68.84KB vs 70.5KB)

**CRICOS Codes Display - Provider & Course (Feb 25, 2026):**
- Added both CRICOS codes visible in CourseModal:
  - **Provider Code**: Institution/provider CRICOS code
  - **Course Code**: Individual course CRICOS code
- Displayed under institution name in elegant monospace font:
  - Format: `Provider: 00001K • Course: 078241E`
  - Small gray text with subtle background highlight on codes
  - Uses monospace font (Monaco, Courier) for code readability
- Styling: Compact, professional, non-intrusive
- Updated `CourseModal.jsx` and `CourseModal.css`

**Dual Institution Names - Trading + Registered (Feb 25, 2026):**
- Updated `convert_excel_to_json.py` to preserve both names:
  - `"name"`: Trading Name (main display name)
  - `"registeredName"`: Institution Name (shown in parenthesis if different from trading name)
- Updated `CourseModal.jsx` to display:
  - **Main name** (Trading Name): Bold, prominent
  - **(Registered Name)**: In parenthesis, light gray (font-weight: 400, color: #999)
- Added CSS styling in `CourseModal.css`:
  - `.modal-registered-name`: Light gray, smaller font (12px), normal weight
- Use case: Some institutions have different official names on CRICOS register; now users can see both for clarity
- Example: "Griffith College (Griffith University Limited)"

**Premium Mobile UX v2.7 — Bottom Sheet Modal & Smooth Animations (Feb 5, 2026):**
- New `src/components/FilterModal.jsx` component - bottom sheet modal for mobile filters
- New `src/styles/FilterModal.css` - smooth animations, slide-up/down transitions
- Desktop: FilterPanel remains sticky sidebar on left (unchanged)
- Mobile (<768px):
  - Filters hidden by default, user sees results immediately
  - "≡ Filters" button at top shows active filter count badge
  - Clicking button slides up bottom sheet modal from screen bottom
  - Modal has header with "Filters" title, close button (✕), drag handle
  - Content is scrollable, smooth fade-in backdrop
  - FilterPanel conditional rendering: wraps in `<aside>` for desktop, renders raw for mobile modal
- Loading state: Animated spinner (rotate animation) + "Loading course data..." message
- No results state: Emoji icon (😔) + helpful messaging + "Clear all filters" button
- Micro-interactions:
  - Smooth modal animations: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` easing
  - Filter badge (orange background) shows count of active filters
  - Button active states with background color transitions
  - Scrollbar styling (custom colors, thin width)
- Touch-friendly: Min 44px button heights, proper padding, easy tap targets
- Responsive:
  - Desktop: All UI unchanged, filters visible in sidebar
  - Mobile: Filters in modal, results visible first, compact header
  - Smooth transition between layouts at 768px breakpoint
- Updated App.jsx: Added `isFilterOpen` state, mobile header with filter button
- FilterPanel.jsx: Added `isMobileModal` prop to conditionally render wrapper

**Regional Classification System based on Home Affairs (v2.6 — Feb 5, 2026):**
- New `src/utils/regionalClassification.js` utility with Australian Department of Home Affairs designated regional area classifications
- 3-tier regional category system:
  - **Category 1**: Major Cities (Sydney, Melbourne, Brisbane) — No badge displayed
  - **Category 2**: Cities and major regional centres — ★ badge (gold/yellow #FFB84D)
  - **Category 3**: Regional centres and other regional areas — ★ badge (orange #C7613C)
- Postcode-based classification for all 8 states/territories using official Home Affairs data:
  - NSW: 9 Category 2 ranges + 9 Category 3 ranges
  - VIC: 7 Category 2 ranges + 13 Category 3 ranges
  - QLD: 17 Category 2 ranges + 10 Category 3 ranges
  - WA: 6 Category 2 ranges + all other postcodes = Category 3
  - SA: 6 Category 2 ranges + all other postcodes = Category 3
  - TAS: 5 Category 2 ranges + all other postcodes = Category 3
  - ACT: All postcodes = Category 2
  - NT: All postcodes = Category 3
- `getRegionalCategory(postcode, state)` function returns 1/2/3 based on postcode lookup
- `getRegionalCategoryBadge(category)` function returns badge config { icon, label, color, tooltip }
- New "Regional Areas" filter section in FilterPanel.jsx with 2 checkboxes:
  - ★ Cities and major regional centres (Category 2, gold star)
  - ★ Regional centres and other areas (Category 3, orange star)
  - Users can select one, both, or neither to filter results
  - Includes informational note: "Australian Home Affairs designated areas for visa purposes (learn more)" with link to Home Affairs postcodes page
- Regional category badges displayed on CourseCard:
  - Appears next to location info (city, state, Australia)
  - Shows ★ star icon + "Category 2" or "Category 3" label
  - Color-coded: Gold/yellow for Category 2, Orange for Category 3
  - Includes tooltip on hover: "Category 2: Located in Cities and Major Regional Centres Area." or "Category 3: Located in Regional Centres and other Regional Area"
  - Only displayed for locations with postcodes in Category 2 or 3 (no badge for Category 1)
- Integrated regional classification into filter logic (search.js):
  - New filter #9: Regional Category (applied after Foundation Studies, before clearing)
  - Checks each course location's postcode against selected categories
  - Filters out locations not matching selected regional categories
  - Empty selection (no categories selected) includes all locations (Category 1/2/3)
- Updated `useFilters` hook:
  - New state: `selectedCategories` (array of 2, 3, or both)
  - New handler: `handleSelectedCategoriesChange(categories)`
  - Integrated into filteredInstitutions useMemo dependency
  - Integrated into activeFilterCount calculation
  - Reset in clearAllFilters utility
- Source: https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list/regional-postcodes
- Use case: Users applying for skilled migration visas can filter to regional areas that qualify for visa benefits

**City/Agglomeration Search with Expandable Groups (v2.5.1 — Feb 5, 2026):**
- New `src/utils/cityMapping.js` file with mapping of 9 major Australian cities to their suburbs/areas
- Major cities included: Sydney, Melbourne, Gold Coast, Brisbane, Perth, Adelaide, Hobart, Canberra, Darwin
- Each city maps to 15-25 surrounding suburbs/areas (e.g., Sydney → Redfern, Haymarket, Parramatta, Manly, Bondi, etc.)
- Enhanced "Major Cities" filter section in FilterPanel.jsx with **expandable city groups**:
  - Each city shows collapsible/expandable arrow (▶ → ▼)
  - Default: collapsed - shows only city name with checkbox
  - Click arrow to expand → reveals 15-25 suburbs/areas with individual checkboxes
  - Click city checkbox → selects entire city + all its suburbs
  - Can select individual suburbs without selecting parent city
- When user selects a city (e.g., "Sydney"), search results include ALL locations within that city's suburb list
- Updated `useFilters` hook to manage `selectedCities` state alongside existing `selectedStates`
- Modified `filterCourses()` in search.js to filter locations by city/suburb in addition to state
- Filter logic: If city/suburb selected, location's city must match one of the cities/suburbs in the selected city's mapping
- Works independently OR combined with state filter (city filter takes precedence for location matching)
- "Clear All Filters" button now resets city selections as well
- CSS styling: Expandable arrow rotates 90°, suburbs indented with left border, hierarchical color scheme (cities in orange, suburbs in gray)

**Course Descriptions from training.gov.au (v2.4 — Feb 5, 2026):**
- Selenium-based scraper `scrape_nrt_full.py` searches training.gov.au for all 10,505 unique course names
- Finds courses with >85% name similarity confidence (extracted real "Qualification descriptions")
- Results: **328 matches (3.1%)** — vocational/technical courses on training.gov.au
- Created `import_merged_descriptions.py` to merge real + generated descriptions:
  - **Real descriptions**: 7,662 from training.gov.au (30%)
  - **Generated descriptions**: 18,205 as fallback (70%)
- All 25,867 courses now have descriptions in Excel Column 25
- Workflow: `scrape_nrt_full.py` → `import_merged_descriptions.py` → `convert_excel_to_json.py` → refresh app
- Descriptions display in CourseModal "Course Overview" section
- Data files: `nrt_full_results.json` (scraping results), `courses_merged_descriptions.csv` (merged descriptions)

**CourseModal & Descriptions System (v2.3):**
- New `CourseModal.jsx` component displays expanded course details on click
- Modal shows: Title, Institution + Website, Price breakdown, Detailed course info, All locations, Action buttons
- Course descriptions populated via Column 25 in Excel
- Helper workflow: `add_descriptions_helper.py` → CSV editing → `import_descriptions.py` → JSON regeneration
- Descriptions appear in "Course Overview" section of modal
- CourseCard is now clickable (cursor: pointer, hover effects)
- All 30 sample courses from Canberra Institute of Technology have descriptions populated

**Logo System Integration (v2.2):**
- Institution logo support: `institution.logoUrl` property points to actual logos
- 8 top universities have real logos: Sydney, UNSW, Monash, UTS, RMIT, Macquarie, Newcastle, Melbourne
- Logo mapping: `src/assets/logo-mapping.json` maps domains to local logo files
- Logo source: `public/logos/` contains actual institution logos (fetched from official sources)
- Fallback system: If logo fails to load or not available, displays auto-generated colored placeholder with institution initials
- CourseCard.jsx uses `<img>` tag with `onError` handler to gracefully fallback to placeholder
- Easy expansion: Add new logos by:
  1. Place logo file in `public/logos/{name}.png`
  2. Add domain mapping in `src/assets/logo-mapping.json` (e.g., `"domain.edu.au": "/logos/name.png"`)
  3. Run `python3 convert_excel_to_json.py` to regenerate JSON with new logo URLs

**CourseCard Redesign (v2.1) — EduConnect-Style Layout:**
- Pagination now by individual courses (not institutions)
- CourseCard redesigned: Logo (left, real or placeholder) | Course Info (center) | Price + Actions (right)
- Course display: Title (green), Level, Duration, Delivery badges (Work Component, Foundation Studies)
- Institution info: Name + First location (City, State, Australia)
- Price display: Large AUD amount + "Per Course" label on right side
- Action buttons: Compare (checkbox), Enquire, Apply (green button)
- Fully responsive: Horizontal layout on desktop, stacks on mobile
- Sort options updated: Name (A-Z) or Price (Low-High) instead of Course Count
- ResultBar now shows: "Showing X–Y of Z courses (W institutions)"

**Advanced Filter Sidebar + Pagination + Sorting (v2.0):**
- New `useFilters` hook manages all filter, sort, and pagination state
- New `FilterPanel` component: Left sidebar with 8 filter sections (Location, Course Level, Course Area, Duration, Fee, Work Component, Foundation Studies)
- New `ResultBar` component: Displays result count and controls for sort + items per page
- New `Pagination` component: Page navigation with ellipsis logic (Prev / 1 2 … N / Next)
- 2-column layout on desktop: Sticky FilterPanel (left) + Content Area (right)
- SearchBar simplified to text input only (state filter moved to FilterPanel checkbox)
- Multi-dimensional filter logic: search + location + course level + field + duration + fee + work component + foundation studies (all AND)
- Default view shows ALL results when no filters active (changed from "empty until search")

**Data Enhancement (v2.0):**
- Added 4 new course fields: `courseLevel`, `fieldOfEducation`, `isFoundationStudies`, `hasWorkComponent`
- Updated `convert_excel_to_json.py` to extract these fields from Excel columns 7, 13, 14, 15
- Regenerated `courses_data.json` with new fields (~23 MB, 1536 institutions, 25,841 courses)

**Previous Updates (Branding & Design):**
- Color scheme matches edviseagency.com.au (primary orange `#C7613C`)
- Typography: Helvetica Bold (weight 700) for headings and important elements
- Header redesigned with white box containing logo + centered "EDVISE Course Finder" title
- All shadows and hover states use orange-tinted rgba values
