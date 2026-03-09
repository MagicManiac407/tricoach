import re

content = open('sync.py').read()

old = """    # ── 1. Inject Garmin data ──────────────────────────────────────
    garmin_json = json.dumps(garmin_data) if garmin_data else "null"
    html = re.sub(
        r'const GARMIN_TODAY = [^;]*;[^\\n]*@@GARMIN_INJECT@@[^\\n]*',
        f'const GARMIN_TODAY = {garmin_json}; // @@GARMIN_INJECT@@ — do not edit this line',
        html
    )

    # ── 2. Inject sync metadata ────────────────────────────────────
    meta = {"synced_at": datetime.now().isoformat(), "strava_count": len(strava_acts)}
    meta_json = json.dumps(meta)
    html = re.sub(
        r'const SYNC_META = [^;]*;[^\\n]*@@SYNC_META@@[^\\n]*',
        f'const SYNC_META = {meta_json};    // @@SYNC_META@@    — do not edit this line',
        html
    )

    # ── 3. Merge new Strava activities into STRAVA_ACTS ────────────
    if strava_acts:
        # Extract existing acts from HTML
        m = re.search(r'const STRAVA_ACTS = (\\{.*?\\});', html, re.DOTALL)"""

new = """    # ── 1. Inject Garmin data into js/strava.js ───────────────────
    garmin_json = json.dumps(garmin_data) if garmin_data else "null"
    if garmin_js_path.exists():
        garmin_html = garmin_js_path.read_text(encoding="utf-8")
        garmin_html = re.sub(
            r'const GARMIN_TODAY = [^;]*;[^\\n]*@@GARMIN_INJECT@@[^\\n]*',
            f'const GARMIN_TODAY = {garmin_json}; // @@GARMIN_INJECT@@ — do not edit this line',
            garmin_html
        )
        meta = {"synced_at": datetime.now().isoformat(), "strava_count": len(strava_acts)}
        meta_json = json.dumps(meta)
        garmin_html = re.sub(
            r'const SYNC_META = [^;]*;[^\\n]*@@SYNC_META@@[^\\n]*',
            f'const SYNC_META = {meta_json};    // @@SYNC_META@@    — do not edit this line',
            garmin_html
        )
        garmin_js_path.write_text(garmin_html, encoding="utf-8")
        print(f'  ✅ js/strava.js updated with Garmin data')

    # ── 2. Merge new Strava activities into js/dashboard.js ────────
    if dash_js_path.exists():
        html = dash_js_path.read_text(encoding="utf-8")
    if strava_acts:
        # Extract existing acts from dashboard.js
        m = re.search(r'const STRAVA_ACTS = (\\{.*?\\});', html, re.DOTALL)"""

if old in content:
    content = content.replace(old, new)
    open('sync.py', 'w').write(content)
    print('✅ Part 2 patched')
else:
    print('❌ Could not find block - no changes made')
    # Debug: show what we're looking for vs what's there
    idx = content.find('# ── 1. Inject Garmin data')
    if idx >= 0:
        print('Found Garmin inject section at char', idx)
        print(repr(content[idx:idx+200]))
    else:
        print('Could not find Garmin inject section at all')
