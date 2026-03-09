# TriCoach 2026 — Project Context Document

> **Purpose**: Upload this file to any new Claude chat so it instantly understands the full project state. No need to read old conversations.
> **Last updated**: 2026-03-07
> **Live URL**: https://MagicManiac407.github.io/tricoach/
> **Repo**: https://github.com/MagicManiac407/tricoach

---

## Architecture Overview

**Hosting**: GitHub Pages (static files, free)
**Backend**: Supabase (auth, database, row-level security)
**Data sync**: Strava OAuth (in-browser), Garmin via `sync.py` (Python script → Supabase)
**Users**: Multi-user — each user has their own Supabase account with isolated data

### File Structure
```
tricoach/
├── index.html          (1,159 lines — HTML shell, all page layouts)
├── css/styles.css      (284 lines — full CSS, dark theme, responsive)
├── js/config.js        (195 lines — Supabase config, auth, state, save)
├── js/core.js          (115 lines — nav, score buttons, backup, week helpers)
├── js/morning.js       (367 lines — morning check, readiness algorithm)
├── js/planner.js       (196 lines — weekly planner)
├── js/trends.js        (604 lines — trends, multi-metric charts, check-in)
├── js/dashboard.js     (411 lines — dashboard, history, PBs, utils, chart tooltip)
├── js/performance.js   (1,018 lines — run/bike/swim/volume charts, auto PBs)
├── js/strava.js        (290 lines — Strava clear/resync, Garmin inject, sync data)
├── js/nutrition.js     (605 lines — food search, logging, library, templates)
├── js/init.js          (375 lines — auth UI, athletes, backup reminder, startup)
├── sync.py             (671 lines — Garmin Connect scraper, pushes to Supabase)
└── PROJECT.md          (this file)
```

### Supabase Config
- **URL**: `https://vhdzkmjfivfuverqhxip.supabase.co`
- **Anon Key**: `sb_publishable_A14st8S-OPSBBOZ8SzQshQ_D56nk0nz`
- **Tables**: `user_data` (id, data JSON, updated_at), `athlete_profiles` (id, display_name, share_enabled, summary)
- **Auth**: Email/password, instant signup (email confirmation disabled)
- **RLS**: Each user can only read/write their own rows

---

## Features — What's BUILT & WORKING

### 1. Authentication & Multi-User
- Email/password signup/signin via Supabase Auth
- Each user's data stored in `user_data` table as JSON blob
- Local-first: localStorage cache + debounced cloud sync (2s delay)
- First login migrates any existing localStorage data to cloud
- Athlete sharing: users can toggle visibility of their summary

### 2. Dashboard
- Readiness arc (circular progress) based on morning check scores
- Today's metrics: HRV, RHR, Sleep Score, Sleep Hours, Garmin Stress
- Quick links to all pages
- Sync status indicator (shows how recently Garmin data was synced)

### 3. Morning Check & Readiness Algorithm
- 100-point scoring system across 8 weighted categories:
  - HRV vs 7-day baseline (30pts)
  - Resting HR vs personal baseline (15pts)
  - Sleep score (20pts)
  - Sleep hours (5pts)
  - Subjective readiness + leg freshness (10pts)
  - Yesterday's training load (10pts)
  - Week accumulated load (5pts)
  - Garmin stress score (5pts)
- Consecutive bad-days cap
- Auto-save with debouncing
- Garmin data auto-fills fields when synced

### 4. Weekly Planner
- 7-day expandable cards with: types, programmed plan, completed, notes, quality/recovery scores
- Strava activities auto-populate "completed" field
- Color-coded effort tags (Z2=cyan, Z3=orange, Z4/Z5=red)
- Week totals bar (swim/bike/run counts, sessions, hard/easy ratio)
- Auto-detect totals from Strava data (km, time, effort breakdown)
- Copy last week's plan
- Back-to-back hard session warnings

### 5. Strava Integration
- OAuth flow built into the app (Connections tab)
- Activities imported into planner automatically
- STRAVA_ACTS data structure with parsed activities
- Clear/resync functionality per-week or all weeks
- Strava → planner import with deduplication

### 6. Garmin Integration
- `sync.py` Python script reads from Garmin Connect API
- Injects data into `GARMIN_TODAY` constant in `js/strava.js`
- Fields: HRV, HRV 7-day avg, RHR, Sleep Score, Sleep Hours, Stress, Body Battery
- For multi-user: each user runs `sync.py --setup-cloud` to push to their own Supabase account
- **LIMITATION**: Garmin has no public OAuth API — requires Python script per user

### 7. Trends & Charts
- Multi-metric overlay chart (canvas-based, custom tooltip engine)
- Metric pills for toggling: HRV, RHR, Sleep, Stress, Legs, Readiness, Calories, etc.
- Presets: Recovery, Performance, Sleep Quality, Body Composition
- Daily/weekly view toggle
- Trend insights: HRV trend, consecutive low readiness, recovery action tracking

### 8. Weekly Check-In
- Training load analysis (this week vs last)
- HRV comparison (this week vs last week averages)
- Z2 pace analysis (easy run pace trends)
- Subjective scores: nutrition, life stress, recovery protocol

### 9. Performance Page
- Run charts: pace progression, HR zones, distance trends
- Bike charts: power progression, cadence, speed
- Swim charts: pace per 100m, distance trends
- Volume charts: weekly hours by sport, cumulative distance
- Auto-detected PBs from Strava data

### 10. PBs (Personal Bests)
- Categories: Swim, Bike, Run, Triathlon, Physiological
- Pre-populated with user's known PBs
- Editable inline
- Auto-PB detection from Strava activities

### 11. Nutrition (PARTIALLY BUILT — needs completion)
- **Working**: Day-by-day food log, meal categories (Breakfast/Lunch/Dinner/Snacks)
- **Working**: Open Food Facts search with Australian filter (`countries_tags=en:australia`)
- **Working**: Food library (save custom foods), meal templates
- **Working**: Manual food entry with full macros
- **Working**: Daily totals display (calories, protein, carbs, fat)
- **Working**: MFP-style log popup with serving size dropdown
- **NEEDS**: Barcode scanner (camera-based, using phone camera via HTTPS)
- **NEEDS**: Nutritional label OCR via Claude API (scan label → auto-extract macros)
- **NEEDS**: Better Australian food database coverage (Woolworths, Coles, Aldi products)
- **NEEDS**: Burned/net calorie rows (calories eaten minus calories burned from Strava)
- **NEEDS**: Nutrition goals setting and tracking against goals

### 12. Decision Rules
- Table of training rules (e.g., "If readiness < 60, reduce intensity")
- Configurable thresholds

### 13. History
- Morning check history with edit/delete
- Check-in history with edit/delete
- Search and filter

### 14. Backup System
- JSON export/import
- Weekly backup reminder (checks last backup date)

---

## Features — PLANNED / NOT YET BUILT

### Priority 1: Garmin No-Terminal Solution
- **Goal**: Supabase Edge Function that authenticates with Garmin on the server
- **Flow**: User enters Garmin email/password once → stored encrypted in Supabase → Edge Function runs daily, pulls data, stores in user's row
- **Benefit**: No Python script, no terminal, works from phone
- **Status**: Planned but not started

### Priority 2: Nutrition Completion
- Barcode scanner (HTML5 camera API, needs HTTPS — use GitHub Pages URL)
- Claude API OCR for nutritional labels
- Better food search with Australian supermarket products
- Net calorie tracking (eaten - burned)

### Priority 3: Multi-User Polish
- Better athlete sharing/viewing
- Coach view (see multiple athletes)
- Invite links

---

## Tech Stack Details

### Frontend
- **Vanilla JS** — no framework, no build step
- **Custom CSS** with CSS variables for theming
- **Fonts**: Bebas Neue (headings), DM Sans (body), DM Mono (labels)
- **Charts**: Custom canvas-based (no library)
- **External deps**: Supabase JS SDK (CDN)

### Data Model
All user data stored as a single JSON blob in `user_data.data`:
```json
{
  "mornings": [...],      // Morning check entries
  "checkins": [...],      // Weekly check-in entries
  "pbs": {                // Personal bests by category
    "swim": [...], "bike": [...], "run": [...], "tri": [...], "phys": [...]
  },
  "plans": {              // Weekly plans keyed by Monday date
    "2026-03-03": {
      "0": { "types": "...", "plan": "...", "completed": "...", "notes": "...", "quality": 4, "recovery": 3 },
      ...
    }
  },
  "foods": [...],         // Saved food library
  "foodlog": {            // Daily food log keyed by date
    "2026-03-07": {
      "breakfast": [...], "lunch": [...], "dinner": [...], "snacks": [...]
    }
  },
  "mealTemplates": [...], // Saved meal templates
  "nutGoals": {}          // Nutrition goals (calories, protein, etc.)
}
```

### Strava Data Structure
Activities stored in `STRAVA_ACTS.acts[]`:
```json
{
  "d": "2026-03-07",     // Date
  "s": "Run",            // Sport: Run, Bike, Swim
  "n": "Morning Run",    // Activity name
  "mm": 45,              // Duration in minutes
  "dk": 8.5,             // Distance in km
  "ef": "easy",          // Effort: easy, moderate, hard, max
  "hr": 142,             // Avg heart rate
  "iv": false,           // Intervals detected
  "wu": false,           // Warm-up
  "cd": false            // Cool-down
}
```

---

## Key Design Decisions

1. **Single-page app, no router** — all pages are `<div class="page">` toggled by `nav()` function
2. **Data in localStorage + Supabase** — local-first for speed, cloud for sync
3. **No build step** — edit files directly, push to GitHub, done
4. **Readiness algorithm is custom** — 100-point weighted system, not a copy of any existing system
5. **Australian-focused** — food search filters to AU products, locale set to en-AU

---

## How to Deploy Updates

1. Edit the relevant file(s) in the repo
2. Push to `main` branch
3. GitHub Pages auto-deploys in ~2 minutes
4. Users get the update on next page refresh

## How to Add New Features

When starting a new Claude chat for a feature:
1. Upload this `PROJECT.md` file
2. Upload the specific file(s) you want to modify (e.g., `js/nutrition.js` for nutrition work)
3. Describe what you want to build
4. Claude will return the updated file(s) — upload them to GitHub

---

## User Info
- **GitHub**: MagicManiac407
- **App URL**: https://MagicManiac407.github.io/tricoach/
- **Location**: Brisbane, Queensland, Australia
- **Sport**: Triathlon (Half Ironman focus)
- **Garmin user**: Yes
- **Strava user**: Yes
