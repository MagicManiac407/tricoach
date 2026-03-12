# TriCoach 2026 — Project Context Document

> **Purpose**: Upload this file to any new Claude chat so it instantly understands the full project state. No need to read old conversations.
> **Last updated**: 2026-03-12
> **Live URL**: https://MagicManiac407.github.io/tricoach/
> **Repo**: https://github.com/MagicManiac407/tricoach

---

## Architecture Overview

**Hosting**: GitHub Pages (static files, free)
**Backend**: Supabase (auth, database, row-level security)
**Data sync**: Strava OAuth (in-browser), Garmin via `sync.py` (Python script → Supabase + GitHub auto-push)
**Users**: Multi-user — each user has their own Supabase account with isolated data

### File Structure
```
tricoach/
├── index.html              (HTML shell, all page layouts)
├── js/styles.css           (full CSS, dark theme, responsive)
├── js/config.js            (Supabase config, auth, state, save/load)
├── js/core.js              (nav, score buttons, backup, week helpers)
├── js/morning.js           (morning check, readiness algorithm)
├── js/planner.js           (weekly planner, Strava auto-populate)
├── js/trends.js            (trends, multi-metric charts, check-in)
├── js/dashboard.js         (dashboard, STRAVA_ACTS definition, history, PBs, utils)
├── js/performance.js       (run/bike/swim/volume charts, race predictor, auto PBs)
├── js/strava.js            (Strava clear/resync, GARMIN_TODAY, Supabase loaders)
├── js/nutrition.js         (food search, logging, library, templates)
├── js/init.js              (auth UI, athletes, backup reminder, startup, Supabase loaders)
├── js/problueprintpage.js  (Pro Blueprint athlete profiles)
├── sync.py                 (Garmin Connect scraper → Supabase + auto git push)
├── garmin_backfill.py      (one-time: pulls 180 days of Garmin history → Supabase)
└── PROJECT.md              (this file)
```

### Critical Architecture Notes
- **`STRAVA_ACTS` is defined in `dashboard.js`** (not strava.js) — sync.py writes there
- **`GARMIN_TODAY` is defined in `strava.js`** — sync.py injects today's data there
- **Dashboard health cards** read from `D.mornings` (user's logged morning checks), not directly from Garmin
- **Garmin data auto-fills morning check FORM only** — user must save to see on dashboard cards
- **Script load order matters**: dashboard.js must load before strava.js (STRAVA_ACTS dependency)

### Supabase Config
- **URL**: `https://vhdzkmjfivfuverqhxip.supabase.co`
- **Anon Key**: `sb_publishable_A14st8S-OPSBBOZ8SzQshQ_D56nk0nz`
- **Service Role Key**: stored in sync.py / garmin_backfill.py (bypasses RLS)
- **User ID**: `a4dd3dc4-19a4-4740-90f8-cef054cfab99`
- **Tables**:
  - `user_data` — (id, data JSON, updated_at) — all user app data
  - `strava_acts` — (act_id PK, data jsonb) — Strava activities mirror
  - `garmin_today` — (id PK, data jsonb) — latest Garmin sync (id="latest")
  - `athlete_profiles` — (id, display_name, share_enabled, summary)
- **Auth**: GitHub OAuth (Travis's account is GitHub-linked, no email/password)
- **RLS**: Each user can only read/write their own rows; service role key bypasses RLS

### Sync Architecture
```
python3 sync.py
  → Garmin Connect API → GARMIN_TODAY injected into js/strava.js
  → Strava API → STRAVA_ACTS injected into js/dashboard.js
  → Push both to Supabase (strava_acts + garmin_today tables)
  → Auto git add + commit + push to GitHub (live site updates automatically)

On page load (init.js):
  → loadGarminFromSupabase() — fetches garmin_today, calls applySyncData()
  → loadStravaFromSupabase() — fetches all strava_acts, overrides STRAVA_ACTS.acts
```

---

## Features — What's BUILT & WORKING

### 1. Authentication & Multi-User
- GitHub OAuth signup/signin via Supabase Auth
- Each user's data stored in `user_data` table as JSON blob
- Local-first: localStorage cache + debounced cloud sync (2s delay)
- First login migrates any existing localStorage data to cloud
- Athlete sharing: users can toggle visibility of their summary

### 2. Dashboard
- Readiness arc (circular progress) based on morning check scores
- Today's metrics: HRV, RHR, Sleep Score, Sleep Hours, Garmin Stress
- Race predictor summary card (Sprint / Olympic / 70.3 predicted times)
- Quick links to all pages
- Sync status indicator (shows how recently Garmin data was synced)
- Weekly training totals from Strava

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
- Consecutive bad-days cap, auto-save with debouncing
- Garmin data auto-fills fields when synced today
- **180 days of historical Garmin data backfilled** via garmin_backfill.py

### 4. Weekly Planner
- 7-day expandable cards with: types, programmed plan, completed, notes, quality/recovery scores
- Strava activities auto-populate "completed" field
- Color-coded effort tags (Z2=cyan, Z3=orange, Z4/Z5=red)
- Week totals bar (swim/bike/run counts, sessions, hard/easy ratio)
- Auto-detect totals from Strava data (km, time, effort breakdown)
- Copy last week's plan, back-to-back hard session warnings

### 5. Strava Integration
- OAuth flow built into the app (Connections tab)
- Activities imported into planner automatically
- STRAVA_ACTS: 379 activities from 2024-02-07 onward
- Supabase mirror of all activities (strava_acts table)
- Clear/resync functionality per-week or all weeks

### 6. Garmin Integration
- `sync.py` pulls HRV, HRV 7-day avg, RHR, Sleep Score, Sleep Hours, Stress, Body Battery
- Pushes to Supabase `garmin_today` (id="latest") + auto-pushes to GitHub
- App loads fresh Garmin data from Supabase on every page load
- `garmin_backfill.py` — backfills 180 days of history into morning log in Supabase
- **LIMITATION**: Garmin has no public OAuth API — requires Python script per user

### 7. Trends & Charts
- Multi-metric overlay chart (canvas-based, custom tooltip engine)
- Metric pills: HRV, RHR, Sleep, Stress, Legs, Readiness, Calories, etc.
- Presets: Recovery, Performance, Sleep Quality, Body Composition
- Daily/weekly view toggle, trend insights

### 8. Weekly Check-In
- Training load analysis (this week vs last)
- HRV comparison, Z2 pace analysis
- Subjective scores: nutrition, life stress, recovery protocol

### 9. Performance Page
- Run/Bike/Swim charts: progression, HR zones, distance trends
- Volume charts: weekly hours by sport, cumulative distance
- Auto-detected PBs from Strava data
- Race Predictor (see below)

### 10. Race Predictor
- Located in: Performance tab + Dashboard home card
- Predicts Sprint / Olympic / 70.3 / Ironman finish times
- **Anchored to real PBs** (fixed 2026-03-12):
  - Swim: uses CSS PB (1:44/100m) directly → race pace ~1:50/100m
  - Bike: derives from stored FTP PBs (~230W), hard cap 300W → race effort 173-196W
  - Run: derives threshold from HM PB (1:39:46) or LTHR pace → 4:41-4:54/km race pace
- Current realistic predictions: Sprint ~1:09, Olympic ~2:17, 70.3 ~4:37
- Previous bug: CTL over-extrapolation produced fantasy numbers (swim 1:23, bike 355W, run 5:22)

### 11. PBs (Personal Bests)
- Categories: Swim, Bike, Run, Triathlon, Physiological
- Key values: CSS ~1:44/100m | FTP ~230W | HM 1:39:46 | 5km 22:09 | LTHR 181bpm
- Editable inline, auto-PB detection from Strava activities

### 12. Nutrition (PARTIALLY BUILT)
- **Working**: Day-by-day food log, Open Food Facts search (AU filter), food library, meal templates, manual entry, daily totals
- **NEEDS**: Barcode scanner, nutritional label OCR, burned/net calories, nutrition goals

### 13. History
- Morning check history with edit/delete (180 days of backfilled data)
- Check-in history with edit/delete, search and filter

### 14. Pro Blueprint Page
- Athlete profiles (e.g. Gustav Iden) with training philosophy, race analysis, recovery protocols

---

## Known Bugs Fixed (2026-03-12)

| Bug | Root cause | Fix |
|-----|-----------|-----|
| All JS broken — history/dashboard/performance undefined | `problueprintpage.js:184` unescaped `I've` in single-quoted JS string | Escaped to `I\'ve` |
| STRAVA_ACTS undefined everywhere | `dashboard.js` had literal newline inside activity name JSON string | Replaced `\n` with `\\n` in JSON |
| Race predictor wildly inaccurate | CTL formula uncapped, ignoring PB data | Rewritten to anchor to CSS/FTP/HM PBs with hard caps |
| Morning log missing 180 days | sync.py only saved "today" | Created garmin_backfill.py — 177 days added |
| Performance tab only showed Feb 2026 | Output dashboard.js only had 20 activities | Ran sync.py --days 1825 to regenerate full 379-activity history |
| Dashboard shows "Never synced" | Date guard in applySyncData() blocking static fallback | Removed date guard, SYNC_META updated |

---

## Deployment Workflow

```bash
# Standard deploy:
cd ~/Downloads/tricoach_deploy_v3
git add <files> && git commit -m "message" && git push origin main
# GitHub Pages auto-deploys in ~2 minutes. Hard refresh with Cmd+Shift+R.

# Daily Garmin sync (run from tricoach_deploy_v3/):
python3 sync.py
# → Updates Garmin + Strava, pushes to Supabase, auto-pushes to GitHub

# One-time or re-run historical backfill:
python3 garmin_backfill.py --days 180
# → Pulls 180 days of Garmin history into Supabase morning log
```

---

## Tech Stack

- **Frontend**: Vanilla JS, no framework, no build step
- **Fonts**: Bebas Neue (headings), DM Sans (body), DM Mono (labels)
- **Charts**: Custom canvas-based (no library)
- **External deps**: Supabase JS SDK (CDN)

### Data Model — `user_data.data` JSON blob
```json
{
  "mornings": [...],
  "checkins": [...],
  "pbs": { "swim": [...], "bike": [...], "run": [...], "tri": [...], "phys": [...] },
  "plans": { "2026-03-09": { "0": { "types": "", "plan": "", "completed": "", "notes": "", "quality": 4, "recovery": 3 } } },
  "foods": [],
  "foodlog": { "2026-03-07": { "breakfast": [], "lunch": [], "dinner": [], "snacks": [] } },
  "mealTemplates": [],
  "nutGoals": {}
}
```

### Morning Log Entry
```json
{
  "date": "2026-03-12",
  "hrv": 87, "hrv7": 81, "rhr": 48,
  "sleepScore": 89, "sleep": 10.1, "gstress": 39,
  "readinessScore": 86, "status": "green",
  "timestamp": 1741737600000,
  "legs": null, "stress": null, "readiness": null, "note": ""
}
```

### Strava Activity
```json
{
  "id": 14086505118, "d": "2025-04-05", "s": "Run", "n": "Night Run",
  "mm": 25.6, "dk": 4.574, "hr": 185, "tl": 103.0,
  "p": 5.604, "rc": 81, "ef": "hard", "iv": false
}
```

---

## User Info
- **GitHub**: MagicManiac407
- **Supabase User ID**: `a4dd3dc4-19a4-4740-90f8-cef054cfab99`
- **App URL**: https://MagicManiac407.github.io/tricoach/
- **Location**: Brisbane, Queensland, Australia
- **Sport**: Triathlon (Half Ironman focus — Port Macquarie HIM completed)
- **Garmin**: Yes | **Strava**: Yes (OAuth connected)
- **Key PBs**: CSS ~1:44/100m | FTP ~230W | HM 1:39:46 | 5km 22:09 | LTHR 181bpm

---

## Planned Features

### Priority 1: Garmin No-Terminal Solution
- Supabase Edge Function authenticates with Garmin server-side
- User enters credentials once → stored encrypted → auto-syncs daily
- Eliminates need for terminal/Python script

### Priority 2: Nutrition Completion
- Barcode scanner (HTML5 camera API), Claude API OCR for nutritional labels
- Net calorie tracking (eaten - burned from Strava), nutrition goals

### Priority 3: Multi-User Polish
- Better athlete sharing/viewing, coach view, invite links

---

## Session Log — 2026-03-12 (Session 2)

### Files Changed This Session
| File | Change |
|------|--------|
| `index.html` | Predictor card moved inside `page-dashboard` div; interval log panel added to planner page |
| `js/trends.js` | `renderInsights()` completely rewritten with world-class coaching recommendations |
| `js/planner.js` | `initPlannerIntervalLog()` wired into `renderPlanner()` via setTimeout |
| `js/performance.js` | `editWorkout()` modal upgraded with interval toggle + sport-specific interval fields |
| `sync.py` | Now captures `desc`, `elap`, `laps` fields; interval auto-detection massively improved |

### Feature 1: Race Predictor Card Scoping ✅ DEPLOYED
**Problem**: `d-race-pred-card` div was sitting *outside* all `.page` divs in HTML, so CSS rule `.page{display:none}` never hid it — visible on every page.  
**Fix**: Moved the card inside `page-dashboard`. CSS now hides it correctly on all other pages.  
**Note**: The mini widget (Sprint/Olympic/70.3/IM times) remains on the dashboard. The full predictor is in the Performance tab under Race Predictor sub-tab. `updateDashboard()` being called from morning saves / trends saves is fine — it just updates values in hidden elements.

### Feature 2: World-Class Trend Insights ✅ DEPLOYED
**Old**: Single-sentence text bullets with basic threshold comparisons.  
**New**: 11 insight categories, each with bold title + specific **Action:** coaching step. Sorted by priority (1–5). Categories:
- HRV 7-day trend (recovery trajectory)
- RHR trend (cardiac fatigue)
- Sleep score vs readiness correlation
- Sleep hours compliance
- Recovery compliance + modality effectiveness scoring
- Garmin stress vs readiness mismatch
- Supplement compliance + HRV correlation
- Calorie intake vs HRV
- Consecutive fatigue / overreach warning (multi-marker)
- Training load periodisation (3-week build detection)
- Day-of-week readiness pattern for schedule optimisation

### Feature 3: Planner Interval Log ✅ DEPLOYED
**Added to Planner page**: Sport selector (Run/Bike/Swim), "+ Add Entry" form, per-sport fields (run: rep pace/dist/HR; bike: NP/duration/virtual toggle; swim: rep pace/dist/HR), table display with ★ badge and predictor impact column.  
**Data model**: Uses `D.ivManual[]` — same array as performance.js interval editor, so entries automatically feed `buildRunModel_pred()`, `buildBikeModel_pred()`, `buildSwimModel_pred()`.  
**Wiring**: `renderPlanner()` now calls `setTimeout(initPlannerIntervalLog, 0)` at the end.

### Feature 4: Interval Detection Overhaul ✅ DEPLOYED

#### Root causes identified
1. `sync.py` never stored `description` — only `name` was checked for keywords
2. `sync.py` never stored `elapsed_time` — so elapsed vs moving ratio (strong interval signal) was unavailable
3. `sync.py` never stored `lap_count`
4. Auto-detection only checked: `workout_type in [3,12]` OR name containing "interval/vo2/threshold/z4/z5/tempo"

#### sync.py changes
Now stores per activity:
- `desc` — Strava description (up to 300 chars)
- `elap` — elapsed time in minutes (includes rest periods)
- `laps` — lap count (if > 1)

Auto-detection now fires on ANY of:
- `workout_type in [3, 12]` (Strava workout type)
- Keywords in **name** OR **description**: interval, vo2, threshold, z4, z5, tempo, fartlek, track, reps, repeats, efforts, hard effort
- `NxM` pattern in name or description (e.g. "2x6km", "5 × 400m", "10x1min")
- `laps ≥ 4` AND `elapsed/moving ≥ 1.20`
- `elapsed/moving ≥ 1.35` AND session ≥ 20min

**Practical impact**: A session with "2x6km @ 4:39" in the description now auto-detects. Run `python3 sync.py` to re-process recent activities.

#### Edit Workout modal changes (performance.js)
The edit modal now includes:
- **Strava description panel** — shows the raw description in an orange-bordered box at the top
- **Detection signals** — shows lap count and elapsed/moving ratio so you can see why it was/wasn't detected
- **⚡ Interval toggle** — checkbox to manually mark/unmark any session as an interval
  - When ticked, sport-specific fields expand:
    - **Run**: Best Rep Pace (min/km), Rep Distance (km), Rep HR
    - **Bike**: Best Interval NP (watts), Interval Duration (min)
    - **Swim**: Best Rep Pace (min/100m), Rep Distance (m)
  - These write directly to `lp/lp_km/lp_hr` (run), `pw/pw_min` (bike), `lsp/lsp_m` (swim)
  - These fields are what the race predictor models actually use
- When unticked, all interval fields are cleared from the activity
- Saves force predictor rebuild (`window._predState = null`)

### Strava Activity Data Model — Updated
```json
{
  "id": 14086505118, "d": "2026-03-11", "s": "Run", "n": "Morning Run",
  "mm": 62.1, "dk": 12.0, "hr": 158, "tl": 86,
  "p": 5.175, "rc": 81, "ef": "hard",
  "iv": true,
  "desc": "2x6km @ 4:39 w/ 5min rest",
  "elap": 78.4,
  "laps": 4,
  "lp": 4.65, "lp_km": 6.0, "lp_hr": 172
}
```

### Known Issues / Pending
- `sync.py` changes only affect *future syncs* — existing activities in Supabase won't have `desc`/`elap`/`laps` until re-synced. Run `python3 sync.py --days 90` to backfill recent activities.
- Edit Workout modal edits are stored in `localStorage` under `tc26_workout_edits` and survive page reloads, but a full Strava re-sync will overwrite them.
- Interval chart markers in performance tab charts (dot highlighting) not yet implemented.

### Auth Correction (previous sessions noted this as pending)
- **Actual auth**: Email/password via Supabase (NOT GitHub OAuth as stated earlier in this doc)

