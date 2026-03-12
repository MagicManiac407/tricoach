#!/usr/bin/env python3
"""
TriCoach — Garmin Historical Backfill
======================================
Pulls 6 months of Garmin data day by day and upserts into your
Supabase morning log so the History and Dashboard show accurate stats.

USAGE:
  python3 garmin_backfill.py              # backfill last 180 days
  python3 garmin_backfill.py --days 90    # backfill last 90 days
  python3 garmin_backfill.py --dry-run    # preview without saving

REQUIREMENTS:
  pip3 install garminconnect requests
"""

import json, sys, argparse, time
from datetime import datetime, timedelta
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────
SUPABASE_URL = "https://vhdzkmjfivfuverqhxip.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZHprbWpmaXZmdXZlcnFoeGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgxNTI5MSwiZXhwIjoyMDg4MzkxMjkxfQ.rNXHcVoDMuMr_MkdA7jjqKCKS3P16kPEKjBRdQ9kWcM"

# Load Garmin credentials from sync_config.json
CONFIG_FILE = Path(__file__).parent / "sync_config.json"
CONFIG = {}
if CONFIG_FILE.exists():
    CONFIG = json.loads(CONFIG_FILE.read_text())

GARMIN_EMAIL    = CONFIG.get("garmin_email", "")
GARMIN_PASSWORD = CONFIG.get("garmin_password", "")

# ── Supabase helpers ───────────────────────────────────────────────
import requests as req

SUPABASE_EMAIL = CONFIG.get("supabase_email", CONFIG.get("garmin_email", ""))
SUPABASE_PASS  = CONFIG.get("supabase_password", CONFIG.get("garmin_password", ""))
_supa_token = None

def supa_login():
    global _supa_token
    # Try signing in with Supabase auth using app credentials
    app_email = CONFIG.get("supabase_email") or input("Enter your TriCoach app email: ").strip()
    app_pass  = CONFIG.get("supabase_password") or input("Enter your TriCoach app password: ").strip()
    r = req.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": app_email, "password": app_pass}
    )
    data = r.json()
    if "access_token" in data:
        _supa_token = data["access_token"]
        print(f"  ✅ Signed into Supabase as {app_email}")
        return True
    else:
        print(f"  ❌ Supabase login failed: {data.get('error_description', data)}")
        return False

def supa_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {_supa_token or SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

def supa_get_user_data(user_id):
    r = req.get(
        f"{SUPABASE_URL}/rest/v1/user_data?id=eq.{user_id}&select=data",
        headers=supa_headers()
    )
    rows = r.json()
    if isinstance(rows, list) and rows:
        return rows[0]["data"]
    return None

def supa_save_user_data(user_id, data):
    r = req.post(
        f"{SUPABASE_URL}/rest/v1/user_data",
        headers={**supa_headers(), "Prefer": "resolution=merge-duplicates"},
        json={"id": user_id, "data": data}
    )
    return r.status_code in (200, 201)

def supa_get_user_id():
    """Return hardcoded user ID."""
    return "a4dd3dc4-19a4-4740-90f8-cef054cfab99"

# ── Garmin helpers ─────────────────────────────────────────────────
def garmin_login():
    from garminconnect import Garmin
    print(f"  Connecting to Garmin as {GARMIN_EMAIL}...")
    client = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
    client.login()
    print("  ✅ Connected")
    return client

def fetch_day(client, date_str):
    """Fetch HRV, sleep, RHR, stress for a given date. Returns dict or None."""
    result = {"date": date_str}
    today = datetime.now().date().isoformat()
    prev = (datetime.strptime(date_str, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")

    # HRV
    for d in [date_str, prev]:
        try:
            hrv = client.get_hrv_data(d)
            if hrv:
                h = hrv.get("hrvSummary") or hrv
                v   = h.get("lastNight") or h.get("lastNightAvg")
                avg = h.get("weeklyAvg")
                if v and int(v) > 0:
                    result["hrv"] = int(v)
                    if avg: result["hrv7"] = int(avg)
                    break
        except: pass

    # Sleep
    for d in [date_str, prev]:
        try:
            sleep = client.get_sleep_data(d)
            if sleep and sleep.get("dailySleepDTO"):
                s = sleep["dailySleepDTO"]
                score = (s.get("sleepScores", {}).get("overall", {}).get("value") or
                         s.get("sleepScores", {}).get("totalScore") or
                         s.get("sleepScore"))
                secs = s.get("sleepTimeSeconds") or 0
                hrs  = round(secs / 3600, 1) if secs else None
                if score and score > 0:
                    result["sleepScore"] = score
                    if hrs: result["sleep"] = hrs
                    break
        except: pass

    # RHR
    for d in [date_str, prev]:
        try:
            stats = client.get_stats(d)
            if stats:
                v = stats.get("restingHeartRate") or stats.get("minHeartRate")
                if v and v > 0:
                    result["rhr"] = int(v)
                    break
        except: pass

    # Stress (use previous day's stress)
    try:
        stress = client.get_stress_data(prev)
        if stress:
            s = stress.get("overallStressLevel") or stress.get("avgStressLevel")
            if s and s > 0:
                result["gstress"] = s
    except: pass

    # Only return if we got at least HRV or sleep
    if result.get("hrv") or result.get("sleepScore") or result.get("rhr"):
        return result
    return None

# ── Readiness score calculator ─────────────────────────────────────
def calc_readiness(entry, history):
    """Simple readiness score matching the app's algorithm."""
    hrv        = entry.get("hrv")
    hrv7       = entry.get("hrv7")
    rhr        = entry.get("rhr")
    sleep_sc   = entry.get("sleepScore")
    sleep_hrs  = entry.get("sleep")
    gstress    = entry.get("gstress")

    if not hrv and not rhr and not sleep_sc:
        return None

    score = 0

    # HRV vs baseline (30pts)
    hist_hrv = [h["hrv"] for h in history[-9:-1] if h.get("hrv")]
    baseline = hrv7 or (sum(hist_hrv)/len(hist_hrv) if len(hist_hrv) >= 3 else None)
    if hrv and baseline:
        pct = ((hrv - baseline) / baseline) * 100
        if pct >= 5:   score += 30
        elif pct >= 2: score += 25
        elif pct >= 0: score += 20
        elif pct >= -5: score += 15
        elif pct >= -10: score += 8
        else: score += 2

    # RHR (15pts)
    hist_rhr = [h["rhr"] for h in history[-14:] if h.get("rhr")]
    base_rhr = sum(hist_rhr)/len(hist_rhr) if len(hist_rhr) >= 3 else 50
    if rhr:
        diff = rhr - base_rhr
        if diff <= -2: score += 15
        elif diff <= 0: score += 12
        elif diff <= 2: score += 9
        elif diff <= 4: score += 5
        else: score += 1

    # Sleep score (20pts)
    if sleep_sc:
        if sleep_sc >= 85: score += 20
        elif sleep_sc >= 75: score += 15
        elif sleep_sc >= 65: score += 10
        elif sleep_sc >= 55: score += 5
        else: score += 1

    # Sleep hours (5pts)
    if sleep_hrs:
        if sleep_hrs >= 8: score += 5
        elif sleep_hrs >= 7: score += 4
        elif sleep_hrs >= 6: score += 2
        else: score += 0

    # Stress (5pts)
    if gstress:
        if gstress <= 25: score += 5
        elif gstress <= 40: score += 3
        elif gstress <= 60: score += 1

    return min(100, max(0, score))

# ── Main ───────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=180)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print("=" * 56)
    print("  TriCoach — Garmin Historical Backfill")
    print(f"  Backfilling last {args.days} days")
    print("=" * 56)

    if not GARMIN_EMAIL or not GARMIN_PASSWORD:
        print("❌ Garmin credentials not found in sync_config.json")
        sys.exit(1)

    # Get user data from Supabase
    print("\n  Loading your data from Supabase...")
    user_id = supa_get_user_id()
    if not user_id:
        print("❌ No user found in Supabase. Make sure you're logged into the app.")
        sys.exit(1)

    user_data = supa_get_user_data(user_id)
    if not user_data:
        print("❌ No user data found.")
        sys.exit(1)

    mornings = user_data.get("mornings", [])
    existing_dates = {m["date"] for m in mornings if m.get("date")}
    print(f"  Found {len(mornings)} existing morning log entries")

    # Login to Garmin
    try:
        client = garmin_login()
    except Exception as e:
        print(f"❌ Garmin login failed: {e}")
        sys.exit(1)

    # Loop through each day
    today = datetime.now().date()
    added = 0
    updated = 0
    skipped = 0
    errors = 0

    print(f"\n  Fetching {args.days} days of Garmin data...\n")

    for i in range(args.days, -1, -1):
        date = today - timedelta(days=i)
        date_str = date.isoformat()

        # Skip future dates
        if date > today:
            continue

        sys.stdout.write(f"  {date_str}... ")
        sys.stdout.flush()

        try:
            data = fetch_day(client, date_str)
            time.sleep(0.5)  # be nice to Garmin API
        except Exception as e:
            print(f"error: {e}")
            errors += 1
            continue

        if not data:
            print("no data")
            skipped += 1
            continue

        # Calculate readiness score
        history_so_far = [m for m in mornings if m.get("date", "") < date_str]
        rs = calc_readiness(data, history_so_far)
        if rs: data["readinessScore"] = rs

        # Determine status
        if rs:
            data["status"] = "green" if rs >= 70 else "orange" if rs >= 50 else "red"

        data["timestamp"] = int(date.strftime("%s")) * 1000

        # Check if entry exists for this date
        existing_idx = next((i for i, m in enumerate(mornings) if m.get("date") == date_str), None)

        if existing_idx is not None:
            # Update existing — only overwrite Garmin fields, keep manual fields
            existing = mornings[existing_idx]
            for field in ["hrv", "hrv7", "rhr", "sleepScore", "sleep", "gstress", "readinessScore", "status"]:
                if data.get(field) is not None:
                    existing[field] = data[field]
            print(f"updated (HRV:{data.get('hrv','—')} Sleep:{data.get('sleepScore','—')} RHR:{data.get('rhr','—')})")
            updated += 1
        else:
            # Add new entry
            mornings.append(data)
            print(f"added (HRV:{data.get('hrv','—')} Sleep:{data.get('sleepScore','—')} RHR:{data.get('rhr','—')})")
            added += 1

    # Sort by date
    mornings.sort(key=lambda m: m.get("date", ""))
    user_data["mornings"] = mornings

    print(f"\n  ─────────────────────────────────────────")
    print(f"  Added:   {added} new entries")
    print(f"  Updated: {updated} existing entries")
    print(f"  Skipped: {skipped} (no data)")
    print(f"  Errors:  {errors}")

    if args.dry_run:
        print("\n  DRY RUN — nothing saved. Run without --dry-run to save.")
        return

    # Save back to Supabase
    print("\n  Saving to Supabase...")
    ok = supa_save_user_data(user_id, user_data)
    if ok:
        print("  ✅ Saved! Reload the app to see updated morning log.")
    else:
        print("  ❌ Save failed — check Supabase permissions.")

    print("=" * 56)

if __name__ == "__main__":
    main()
