#!/usr/bin/env python3
"""
Triathlon Tracker — Sync Script
Pulls from Strava + Garmin and writes data DIRECTLY into your HTML file.

DAILY USAGE:
  python3 sync.py                  full sync (Garmin + Strava)

ONE-TIME SETUP:
  python3 sync.py --auth-strava    set up Strava OAuth

BACKGROUND SERVER (lets the HTML buttons trigger syncs):
  python3 sync.py --serve          start local server on port 7432

OPTIONS:
  python3 sync.py --days 30        sync last 30 days of Strava
  python3 sync.py --garmin-only    skip Strava
  python3 sync.py --strava-only    skip Garmin
  python3 sync.py --check          verify setup
"""

import json, os, sys, re, argparse
DEBUG = False
from datetime import datetime, timedelta
from pathlib import Path

# ─────────────────────────────────────────────────────────────────
# CONFIGURATION — fill these in once
# ─────────────────────────────────────────────────────────────────
CONFIG = {
    "strava_client_id":     "",   # from strava.com/settings/api
    "strava_client_secret": "",   # from strava.com/settings/api
    "strava_refresh_token": "",   # filled automatically after --auth-strava

    "garmin_email":    "",        # your Garmin Connect login email
    "garmin_password": "",        # your Garmin Connect password
}

# ─────────────────────────────────────────────────────────────────
# CONFIG FILE — saves tokens so you don't re-enter them
# ─────────────────────────────────────────────────────────────────
CONFIG_FILE = Path(__file__).parent / "sync_config.json"

def load_config():
    """Load saved tokens/credentials from sync_config.json."""
    if CONFIG_FILE.exists():
        saved = json.loads(CONFIG_FILE.read_text())
        CONFIG.update(saved)

def save_config():
    """Save current config (tokens etc) to sync_config.json."""
    CONFIG_FILE.write_text(json.dumps(CONFIG, indent=2))

# ─────────────────────────────────────────────────────────────────
# FIND THE HTML FILE
# ─────────────────────────────────────────────────────────────────
def find_html():
    """Find the tracker HTML file in the same folder as sync.py."""
    folder = Path(__file__).parent
    # Try exact name first, then any html file with 'tracker' in the name
    for name in ["triathlon_tracker_v5.html", "triathlon_tracker.html"]:
        p = folder / name
        if p.exists():
            return p
    htmls = list(folder.glob("*tracker*.html"))
    if htmls:
        return htmls[0]
    htmls = list(folder.glob("*.html"))
    if htmls:
        return htmls[0]
    return None

# ─────────────────────────────────────────────────────────────────
# STRAVA
# ─────────────────────────────────────────────────────────────────
def strava_auth_flow():
    """One-time Strava OAuth setup — run with --auth-strava."""
    import webbrowser, requests

    cid = CONFIG["strava_client_id"]
    secret = CONFIG["strava_client_secret"]

    if not cid:
        cid = input("Enter Strava Client ID: ").strip()
        CONFIG["strava_client_id"] = cid
    if not secret:
        secret = input("Enter Strava Client Secret: ").strip()
        CONFIG["strava_client_secret"] = secret

    print(f"\nUsing Client ID: {cid}")
    print("\nOpening Strava in your browser — click Authorize...")
    print("Then copy the FULL URL from your browser address bar and paste it below.\n")

    url = (f"https://www.strava.com/oauth/authorize"
           f"?client_id={cid}&response_type=code"
           f"&redirect_uri=http://localhost"
           f"&approval_prompt=force&scope=activity:read_all")
    webbrowser.open(url)

    raw = input("Paste the full URL here (http://localhost/?state=...): ").strip()
    code = raw.split("code=")[1].split("&")[0] if "code=" in raw else raw

    print("\nExchanging code for token...")
    resp = requests.post("https://www.strava.com/oauth/token", data={
        "client_id": cid, "client_secret": secret,
        "code": code, "grant_type": "authorization_code"
    })
    data = resp.json()
    if "refresh_token" not in data:
        print(f"\n❌ Error: {data}")
        print("The code may have expired — they only last ~30 seconds.")
        print("Run python3 sync.py --auth-strava and paste the URL quickly.")
        return
    CONFIG["strava_refresh_token"] = data["refresh_token"]
    save_config()
    print("\n✅ Strava auth complete! You never need to do this again.")

def strava_get_token():
    import requests
    r = requests.post("https://www.strava.com/oauth/token", data={
        "client_id":     CONFIG["strava_client_id"],
        "client_secret": CONFIG["strava_client_secret"],
        "refresh_token": CONFIG["strava_refresh_token"],
        "grant_type":    "refresh_token"
    })
    return r.json().get("access_token")

def strava_fetch(days=14):
    """Fetch recent Strava activities and return as list of dicts."""
    if not CONFIG.get("strava_client_id") or not CONFIG.get("strava_refresh_token"):
        print("  ⚠  Strava not set up. Run: python3 sync.py --auth-strava")
        return []

    import requests
    print(f"  Fetching Strava activities (last {days} days)...")
    token = strava_get_token()
    if not token:
        print("  ❌ Strava token refresh failed.")
        return []

    after = int((datetime.now() - timedelta(days=days)).timestamp())
    acts, page = [], 1
    while True:
        r = requests.get("https://www.strava.com/api/v3/athlete/activities",
            headers={"Authorization": f"Bearer {token}"},
            params={"after": after, "per_page": 50, "page": page})
        batch = r.json()
        if not batch or not isinstance(batch, list):
            break
        acts.extend(batch)
        if len(batch) < 50:
            break
        page += 1

    parsed = []
    for a in acts:
        atype = a.get("sport_type", a.get("type", ""))
        sport = ("Run"  if "Run"  in atype else
                 "Bike" if "Ride" in atype else
                 "Swim" if "Swim" in atype else None)
        if not sport:
            continue

        dist_km  = (a.get("distance", 0) or 0) / 1000
        move_min = (a.get("moving_time", 0) or 0) / 60
        avg_hr   = a.get("average_heartrate")
        avg_spd  = a.get("average_speed")     # m/s
        avg_w    = a.get("average_watts")
        nrm_w    = a.get("weighted_average_watts")
        avg_cad  = a.get("average_cadence")

        elap_min = (a.get("elapsed_time", 0) or 0) / 60
        desc     = (a.get("description") or "").strip()
        laps_n   = a.get("lap_count") or 0

        entry = {
            "id": a["id"],
            "d":  a["start_date_local"][:10],
            "n":  a.get("name", ""),
            "s":  sport,
            "dk": round(dist_km, 3),
            "mm": round(move_min, 1),
        }
        if elap_min > 0: entry["elap"] = round(elap_min, 1)
        if desc:         entry["desc"] = desc[:300]   # cap at 300 chars
        if laps_n > 1:   entry["laps"] = laps_n
        if avg_hr:  entry["hr"] = round(avg_hr)
        if a.get("suffer_score"): entry["tl"] = a["suffer_score"]

        if sport == "Run" and avg_spd:
            entry["p"] = round(1000 / avg_spd / 60, 3)  # min/km
            if avg_cad: entry["rc"] = round(avg_cad)
        elif sport == "Bike":
            entry["vr"] = bool(a.get("trainer") or "Virtual" in atype)
            if avg_w:   entry["w"]   = round(avg_w)
            if nrm_w:   entry["nw"]  = round(nrm_w)
            if avg_cad: entry["cad"] = round(avg_cad)
        elif sport == "Swim" and dist_km > 0 and move_min > 0:
            entry["sp"] = round(move_min / (dist_km * 10), 3)  # min/100m
            if avg_cad: entry["sc"] = round(avg_cad)

        # Effort classification
        name_lower = entry["n"].lower()
        desc_lower = desc.lower()
        hr = entry.get("hr", 0) or 0

        # Interval detection: multiple signals
        iv_keywords = ["interval","vo2","threshold","z4","z5","tempo","fartlek",
                       "track","reps","repeats","efforts","hard effort","structured",
                       "workout","w/u","c/d","warmup","cooldown"]
        # NxM pattern in name OR description e.g. "2x6km", "5 x 400m", "10x1min"
        import re as _re
        nx_pat = _re.compile(r'\d+\s*[x×]\s*\d', _re.IGNORECASE)
        # elapsed >> moving means lots of rest time (ratio > 1.25 strongly suggests intervals)
        elap_ratio = (elap_min / move_min) if move_min > 0 else 1.0
        # Rouvy/virtual bike interval signals: Rouvy workout types are often structured
        # High NP relative to duration is also a strong signal for intervals
        nrm_w_val = a.get("weighted_average_watts") or 0
        avg_w_val  = a.get("average_watts") or 0
        is_virtual = bool(a.get("trainer") or "Virtual" in a.get("sport_type", a.get("type", "")))
        # Rouvy often sets workout_type=12 for structured workouts; also detect by lap structure
        is_rouvy_structured = is_virtual and (
            a.get("workout_type") in [3, 12]
            or laps_n >= 3
        )
        has_interval = bool(
            a.get("workout_type") in [3, 12]                              # Strava workout type
            or any(w in name_lower for w in iv_keywords)                  # name keywords
            or any(w in desc_lower for w in iv_keywords)                  # description keywords
            or nx_pat.search(name_lower)                                  # "5x1km" in name
            or nx_pat.search(desc_lower)                                  # "5x1km" in description
            or (laps_n >= 4 and elap_ratio >= 1.20)                       # many laps + rest time
            or (elap_ratio >= 1.35 and move_min >= 20)                    # heavy rest in any session ≥20min
            or is_rouvy_structured                                         # Rouvy structured workout
        )
        if has_interval:
            entry["ef"] = "hard"
            entry["iv"] = True
        elif hr > 170:
            entry["ef"] = "hard"
        elif hr > 155:
            entry["ef"] = "moderate"
        elif hr > 0:
            entry["ef"] = "easy"
        else:
            entry["ef"] = "moderate"

        # ── Fetch per-lap detail for structured workouts (bike+run) ──────
        # The activity list endpoint only gives session-level avg/NP.
        # For interval sessions, the warmup/cooldown drags those numbers down,
        # hiding the actual work interval power. We fetch laps for:
        #   - Any activity flagged iv=True
        #   - Any bike activity with workout_type in [3,12]
        # We store pw (best work-lap NP) and pw_min (that lap's duration).
        # FTP algorithm can then use pw/pw_min to estimate FTP from the interval
        # segment alone, without warmup/cooldown contamination.
        if entry.get("iv") and sport in ("Bike", "Run", "Swim") and token:
            try:
                det = requests.get(
                    f"https://www.strava.com/api/v3/activities/{a['id']}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                ).json()
                laps = det.get("laps") or []
                if laps:
                    if sport == "Bike":
                        # Find the best (highest NP or avg watts) work lap ≥3min
                        work_laps = [
                            l for l in laps
                            if (l.get("weighted_average_watts") or l.get("average_watts") or 0) > 0
                            and (l.get("moving_time") or 0) >= 180  # ≥3min
                        ]
                        if work_laps:
                            best_lap = max(work_laps,
                                key=lambda l: l.get("weighted_average_watts") or l.get("average_watts") or 0)
                            pw = best_lap.get("weighted_average_watts") or best_lap.get("average_watts")
                            pw_min = round((best_lap.get("moving_time") or 0) / 60, 1)
                            if pw and pw_min >= 3:
                                entry["pw"]     = round(pw)      # best lap normalised power
                                entry["pw_min"] = pw_min          # that lap duration (min)
                            # ── Avg work lap stats ─────────────────────────────────
                            # Exclude first/last lap (typically warmup/cooldown)
                            inner_laps = work_laps[1:-1] if len(work_laps) > 2 else work_laps
                            if inner_laps:
                                avg_lap_w = round(sum(
                                    l.get("weighted_average_watts") or l.get("average_watts") or 0
                                    for l in inner_laps) / len(inner_laps))
                                avg_lap_hr_vals = [l.get("average_heartrate") for l in inner_laps if l.get("average_heartrate")]
                                avg_lap_km = round(sum((l.get("distance") or 0) for l in inner_laps) / len(inner_laps) / 1000, 3)
                                avg_lap_min = round(sum((l.get("moving_time") or 0) for l in inner_laps) / len(inner_laps) / 60, 1)
                                if avg_lap_w > 0: entry["alp_w"]  = avg_lap_w
                                if avg_lap_km > 0: entry["alp_km"] = avg_lap_km
                                if avg_lap_min > 0: entry["alp_min"] = avg_lap_min
                                if avg_lap_hr_vals: entry["alp_hr"] = round(sum(avg_lap_hr_vals)/len(avg_lap_hr_vals))
                                entry["alp_n"] = len(inner_laps)  # how many work laps averaged
                    elif sport == "Run":
                        # Find best work lap ≥400m by pace
                        work_laps = [
                            l for l in laps
                            if (l.get("distance") or 0) >= 400
                            and (l.get("moving_time") or 0) > 0
                            and (l.get("average_speed") or 0) > 0
                        ]
                        if work_laps:
                            best_lap = min(work_laps, key=lambda l: l["moving_time"] / l["distance"])
                            lp_ms = best_lap["distance"] / best_lap["moving_time"]  # m/s
                            lp_pace = round(1000 / lp_ms / 60, 3)  # min/km
                            lp_km = round((best_lap.get("distance") or 0) / 1000, 3)
                            lp_hr  = best_lap.get("average_heartrate")
                            if lp_pace > 0 and lp_km >= 0.4:
                                entry["lp"]     = lp_pace  # best lap pace (min/km)
                                entry["lp_km"]  = lp_km    # best lap distance
                                if lp_hr: entry["lp_hr"] = round(lp_hr)
                            # ── Avg work lap stats ─────────────────────────────────
                            # Use all work laps (≥400m) to compute averages
                            if len(work_laps) >= 2:
                                inner = work_laps[1:-1] if len(work_laps) > 2 else work_laps
                                avg_spd = sum(l["distance"]/l["moving_time"] for l in inner) / len(inner)
                                avg_lp_pace = round(1000 / avg_spd / 60, 3)
                                avg_lp_km   = round(sum(l.get("distance",0) for l in inner) / len(inner) / 1000, 3)
                                avg_lp_hr_v = [l.get("average_heartrate") for l in inner if l.get("average_heartrate")]
                                if avg_lp_pace > 0: entry["alp_p"]  = avg_lp_pace
                                if avg_lp_km > 0:   entry["alp_km"] = avg_lp_km
                                if avg_lp_hr_v:     entry["alp_hr"] = round(sum(avg_lp_hr_v)/len(avg_lp_hr_v))
                                entry["alp_n"] = len(inner)
                    elif sport == "Swim":
                        # Find best (fastest) work lap ≥50m for CSS estimate
                        swim_laps = [
                            l for l in laps
                            if (l.get("distance") or 0) >= 50
                            and (l.get("moving_time") or 0) > 0
                        ]
                        if swim_laps:
                            best_lap = min(swim_laps, key=lambda l: l["moving_time"] / max(l["distance"], 1))
                            slp_ms  = best_lap["distance"] / best_lap["moving_time"]  # m/s
                            slp_pace = round(100 / slp_ms / 60, 3)  # min/100m
                            slp_m   = round(best_lap.get("distance") or 0)
                            if slp_pace > 0 and slp_m >= 50:
                                entry["lsp"]    = slp_pace  # best swim lap pace (min/100m)
                                entry["lsp_m"]  = slp_m     # that lap's distance (m)
                            # ── Avg work lap stats ─────────────────────────────────
                            if len(swim_laps) >= 2:
                                inner = swim_laps[1:-1] if len(swim_laps) > 2 else swim_laps
                                avg_spd_s = sum(l["distance"]/l["moving_time"] for l in inner) / len(inner)
                                avg_slp_pace = round(100 / avg_spd_s / 60, 3)
                                avg_slp_m    = round(sum(l.get("distance",0) for l in inner) / len(inner))
                                avg_slp_hr_v = [l.get("average_heartrate") for l in inner if l.get("average_heartrate")]
                                if avg_slp_pace > 0: entry["alp_p"]  = avg_slp_pace
                                if avg_slp_m > 0:    entry["alp_km"] = round(avg_slp_m / 1000, 3)
                                if avg_slp_hr_v:     entry["alp_hr"] = round(sum(avg_slp_hr_v)/len(avg_slp_hr_v))
                                entry["alp_n"] = len(inner)
            except Exception as e:
                pass  # Lap fetch failed — session-level data still used

        parsed.append(entry)

    print(f"  ✅ Got {len(parsed)} Strava activities")
    return parsed

# ─────────────────────────────────────────────────────────────────
# GARMIN
# ─────────────────────────────────────────────────────────────────
def garmin_fetch():
    """
    Fetch today's Garmin data for morning check auto-fill.
    
    HRV, sleep, RHR  = today's date (last night's readings)
    Stress score      = YESTERDAY (today's stress isn't done yet)
    """
    if not CONFIG.get("garmin_email") or not CONFIG.get("garmin_password"):
        print("  ⚠  Garmin not configured. Add garmin_email + garmin_password to sync_config.json")
        return None

    try:
        from garminconnect import Garmin
    except ImportError:
        print("  ⚠  garminconnect not installed. Run: pip3 install garminconnect")
        return None

    print("  Connecting to Garmin Connect...")
    try:
        client = Garmin(CONFIG["garmin_email"], CONFIG["garmin_password"])
        client.login()
    except Exception as e:
        print(f"  ❌ Garmin login failed: {e}")
        return None

    today     = datetime.now().date()
    yesterday = today - timedelta(days=1)
    today_s   = today.isoformat()
    yest_s    = yesterday.isoformat()

    result = {}

    # ── HRV (try today, yesterday, and 2 days ago — Garmin syncs vary) ─
    def fetch_hrv(date_str, debug=False):
        try:
            hrv = client.get_hrv_data(date_str)
            if debug: print(f"  [debug] HRV raw for {date_str}: {hrv}")
            if hrv:
                h = hrv.get("hrvSummary") or hrv
                # lastNight = overnight average HRV (the correct metric)
                # weeklyAvg = 7-day rolling average
                # Do NOT use lastNight5MinHigh — that's the peak spike, not the avg
                v   = h.get("lastNight") or h.get("lastNightAvg")
                avg = h.get("weeklyAvg")
                if v and int(v) > 0: return int(v), int(avg) if avg else None
        except Exception as e:
            if debug: print(f"  [debug] HRV error: {e}")
        return None, None

    hrv_val = hrv_avg = None
    for d in [today_s, yest_s, (today - timedelta(days=2)).isoformat()]:
        hrv_val, hrv_avg = fetch_hrv(d, debug=DEBUG)
        if hrv_val: break
    if hrv_val:
        result["hrv"] = hrv_val
        if hrv_avg: result["hrv7"] = hrv_avg
        print(f"  ✅ HRV: {hrv_val} (7d avg: {hrv_avg})")
    else:
        print(f"  ⚠  HRV: no data found (run with --debug to see raw API response)")

    # ── Sleep (Garmin stores under start-of-sleep date, try both) ──
    def fetch_sleep(date_str):
        try:
            sleep = client.get_sleep_data(date_str)
            if sleep and sleep.get("dailySleepDTO"):
                s = sleep["dailySleepDTO"]
                score = (s.get("sleepScores", {}).get("overall", {}).get("value") or
                         s.get("sleepScores", {}).get("totalScore") or
                         s.get("sleepScore"))
                secs = s.get("sleepTimeSeconds") or 0
                hrs  = round(secs / 3600, 1) if secs else None
                if score and score > 0: return score, hrs
        except: pass
        return None, None

    sleep_score, sleep_hrs = fetch_sleep(today_s)
    if not sleep_score:
        sleep_score, sleep_hrs = fetch_sleep(yest_s)
    if sleep_score:
        result["sleepScore"] = sleep_score
        if sleep_hrs: result["sleepHrs"] = sleep_hrs
        print(f"  ✅ Sleep: score={sleep_score}, hrs={sleep_hrs}")
    else:
        print(f"  ⚠  Sleep: no data found for {today_s} or {yest_s}")

    # ── Resting HR — try multiple API methods and date fallbacks ────
    def fetch_rhr(date_str, debug=False):
        # Method 1: get_rhr_day
        try:
            rhr_data = client.get_rhr_day(date_str)
            if debug: print(f"  [debug] RHR get_rhr_day {date_str}: {rhr_data}")
            if rhr_data:
                # Response can be a list or dict
                if isinstance(rhr_data, list):
                    for item in rhr_data:
                        v = item.get("restingHeartRate") or item.get("value")
                        if v and v > 0: return int(v)
                else:
                    v = (rhr_data.get("restingHeartRate") or
                         rhr_data.get("allDayHR", {}).get("restingHeartRate") or
                         rhr_data.get("statisticsDTO", {}).get("restingHR"))
                    if v and v > 0: return int(v)
        except Exception as e:
            if debug: print(f"  [debug] RHR get_rhr_day error: {e}")

        # Method 2: get_stats (daily summary includes RHR)
        try:
            stats = client.get_stats(date_str)
            if debug: print(f"  [debug] RHR get_stats {date_str} restingHeartRate: {stats.get('restingHeartRate') if stats else None}")
            if stats:
                v = stats.get("restingHeartRate") or stats.get("minHeartRate")
                if v and v > 0: return int(v)
        except Exception as e:
            if debug: print(f"  [debug] RHR get_stats error: {e}")

        return None

    rhr = None
    for d in [today_s, yest_s]:
        rhr = fetch_rhr(d, debug=DEBUG)
        if rhr: break
    if rhr:
        result["rhr"] = rhr
        print(f"  ✅ RHR: {rhr}bpm")
    else:
        print(f"  ⚠  RHR: no data found (run with --debug to see raw API response)")

    # ── Stress = YESTERDAY (today's stress isn't complete yet) ─────
    try:
        stress = client.get_stress_data(yest_s)
        if stress:
            s = (stress.get("overallStressLevel") or
                 stress.get("avgStressLevel"))
            if s and s > 0:
                result["yesterdayStress"] = s
                print(f"  ✅ Stress (yesterday {yest_s}): {s}")
    except Exception as e:
        print(f"  ⚠  Stress fetch failed: {e}")

    # ── Body Battery (optional, for reference) ─────────────────────
    try:
        bb = client.get_body_battery(today_s)
        if bb and isinstance(bb, list):
            charged = bb[-1].get("charged") if bb else None
            if charged: result["bodyBattery"] = charged
    except:
        pass

    # ── Calories Burnt (active + total from daily stats) ───────────
    try:
        stats = client.get_stats(today_s)
        if stats:
            active_cal = stats.get("activeKilocalories") or stats.get("activeCalories")
            total_cal  = stats.get("totalKilocalories") or stats.get("burnedKilocalories")
            if active_cal and active_cal > 0:
                result["calOut"] = int(active_cal)
                print(f"  ✅ Calories burnt (active): {active_cal} kcal")
            elif total_cal and total_cal > 0:
                result["calOut"] = int(total_cal)
                print(f"  ✅ Calories burnt (total): {total_cal} kcal")
    except Exception as e:
        print(f"  ⚠  Calories fetch failed: {e}")

    print(f"  ✅ Garmin sync complete")
    return result if result else None

# ─────────────────────────────────────────────────────────────────
# AUTO PB DETECTION — compute best performances from all stored acts
# ─────────────────────────────────────────────────────────────────
def compute_pbs_from_acts(all_acts):
    """
    Scan ALL stored Strava activities and compute best performances per category.
    Returns a dict that gets stored in STRAVA_ACTS.pbs and used by the JS app
    to auto-update D.pbs when better values are found.
    """
    pbs = {}

    def fmt_time(total_min):
        h = int(total_min // 60)
        m = int(total_min % 60)
        s = int(round((total_min % 1) * 60))
        if h > 0:
            return f"{h}:{m:02d}:{s:02d}"
        return f"{m}:{s:02d}"

    def fmt_pace(min_per_km):
        m = int(min_per_km)
        s = int(round((min_per_km % 1) * 60))
        return f"{m}:{s:02d}"

    def better(a, b, invert=False):
        """True if a is better than b (lower is better by default = faster pace/time)"""
        if a is None: return False
        if b is None: return True
        return a < b if not invert else a > b

    # ── RUN DISTANCE PBs (continuous efforts only — no interval sessions) ───
    run_acts = [a for a in all_acts if a.get('s') == 'Run' and a.get('p') and a.get('dk')]
    # Interval detection: iv flag OR name contains NxM pattern OR interval keywords
    _iv_name_pat = re.compile(r'\d+\s*[x×]\s*\d|\binterval\b|\bfartlek\b|\brepeat\b|\breps\b|\bworkout\b', re.IGNORECASE)
    continuous_runs = [a for a in run_acts if not a.get('iv') and not _iv_name_pat.search(a.get('n',''))]

    dist_buckets = [
        ('Run 5km',           4.8,  5.5,   5.0,  'run'),
        ('Run 10km',          9.5,  10.5,  10.0, 'run'),
        ('Run 15km',         14.0,  16.0,  15.0, 'run'),
        ('Run Half Marathon', 20.0, 22.5,  21.1, 'run'),
        ('Run Marathon',      38.0, 45.0,  42.2, 'run'),
    ]
    for key, lo, hi, std_km, _ in dist_buckets:
        candidates = [a for a in continuous_runs if lo <= a['dk'] <= hi and a['p'] > 2.0]
        if candidates:
            best = min(candidates, key=lambda a: a['p'])
            total_min = best['p'] * std_km
            pbs[key] = {
                'v': fmt_time(total_min),
                'pace': round(best['p'], 3),
                'date': best['d'],
                'hr': best.get('hr'),
                'dk': round(best['dk'], 2),
                'note': f"Auto-detected from Strava · {best['d']} · {fmt_pace(best['p'])}/km"
            }

    # ── RUN BEST INTERVAL PACE ──────────────────────────────────────────────
    iv_runs = [a for a in run_acts if a.get('iv')]
    # Use best lap pace (lp) if available, else session avg pace
    if iv_runs:
        # Best session that has lap pace data
        with_lp = [a for a in iv_runs if a.get('lp')]
        if with_lp:
            best_iv = min(with_lp, key=lambda a: a['lp'])
            pbs['Run Best Interval'] = {
                'v': fmt_pace(best_iv['lp']) + '/km',
                'pace': best_iv['lp'],
                'date': best_iv['d'],
                'lap_km': best_iv.get('lp_km'),
                'hr': best_iv.get('lp_hr') or best_iv.get('hr'),
                'note': f"Best lap pace · {best_iv['d']} · {best_iv.get('n','')}"
            }
        # Also best avg-of-work-laps pace (alp_p) — best threshold estimate
        with_alp = [a for a in iv_runs if a.get('alp_p')]
        if with_alp:
            best_alp = min(with_alp, key=lambda a: a['alp_p'])
            pbs['Run Best Threshold'] = {
                'v': fmt_pace(best_alp['alp_p']) + '/km',
                'pace': best_alp['alp_p'],
                'date': best_alp['d'],
                'lap_km': best_alp.get('alp_km'),
                'hr': best_alp.get('alp_hr') or best_alp.get('hr'),
                'note': f"Best avg work-lap pace · {best_alp['d']} · {best_alp.get('n','')}"
            }

    # ── BIKE POWER DURATION PBs ─────────────────────────────────────────────
    bike_acts = [a for a in all_acts if a.get('s') == 'Bike' and (a.get('nw') or a.get('w'))]

    def best_power_for_duration(acts, min_dur, max_dur, label):
        """Find best NP/power output for activities within the duration window."""
        candidates = [a for a in acts if min_dur <= (a.get('mm') or 0) <= max_dur]
        if not candidates:
            return None
        # Also include pw (best lap power) from longer activities where pw_min falls in range
        lap_candidates = [
            a for a in acts
            if a.get('pw') and a.get('pw_min')
            and min_dur <= a['pw_min'] <= max_dur
        ]
        best_from_session = max(candidates, key=lambda a: a.get('nw') or a.get('w') or 0)
        best_session_power = best_from_session.get('nw') or best_from_session.get('w') or 0
        best_lap = max(lap_candidates, key=lambda a: a.get('pw', 0)) if lap_candidates else None
        best_lap_power = best_lap.get('pw', 0) if best_lap else 0

        if best_lap_power > best_session_power:
            a = best_lap
            power = best_lap_power
            tag = f"best lap · {round(a['pw_min'])}min"
        else:
            a = best_from_session
            power = best_session_power
            tag = f"{round(a.get('mm',0))}min session"

        rouvy_flag = ' (Rouvy)' if a.get('vr') else ''
        return {
            'v': f"{power}W",
            'watts': power,
            'date': a['d'],
            'hr': a.get('hr'),
            'vr': bool(a.get('vr')),
            'note': f"Auto · {a['d']} · {tag}{rouvy_flag}"
        }

    for label, lo, hi in [
        ('Bike 20min Power', 18, 28),
        ('Bike 45min Power', 40, 55),
        ('Bike 60min Power', 55, 75),
        ('Bike 90min Power', 80, 105),
    ]:
        result = best_power_for_duration(bike_acts, lo, hi, label)
        if result:
            pbs[label] = result

    # Best Rouvy NP (any duration ≥ 30min)
    rouvy_acts = [a for a in bike_acts if a.get('vr') and (a.get('mm') or 0) >= 30]
    if rouvy_acts:
        best_rouvy = max(rouvy_acts, key=lambda a: a.get('nw') or a.get('w') or 0)
        power = best_rouvy.get('nw') or best_rouvy.get('w') or 0
        pbs['Bike Best NP (Rouvy)'] = {
            'v': f"{power}W",
            'watts': power,
            'date': best_rouvy['d'],
            'hr': best_rouvy.get('hr'),
            'mm': round(best_rouvy.get('mm', 0)),
            'note': f"Auto · {best_rouvy['d']} · {round(best_rouvy.get('mm',0))}min"
        }

    # ── FTP ESTIMATE from best duration-scaled power ────────────────────────
    def dur_scale(dur):
        if dur >= 150: return 0.91
        if dur >= 120: return 0.94
        if dur >= 90:  return 0.97
        if dur >= 60:  return 1.00
        if dur >= 45:  return 0.98
        if dur >= 30:  return 0.97
        return 0.95

    ftp_candidates = []
    for a in bike_acts:
        if a.get('pw') and a.get('pw_min') and a['pw_min'] >= 18:
            est = round(a['pw'] * dur_scale(a['pw_min']) * (0.98 if a.get('vr') else 1.0))
            ftp_candidates.append({'est': est, 'a': a, 'power': a['pw'], 'dur': a['pw_min'], 'source': 'lap'})
        elif (a.get('nw') or a.get('w')) and (a.get('mm') or 0) >= 18:
            power = a.get('nw') or a.get('w')
            dur = a.get('mm')
            est = round(power * dur_scale(dur) * (0.98 if a.get('vr') else 1.0))
            ftp_candidates.append({'est': est, 'a': a, 'power': power, 'dur': dur, 'source': 'session'})

    if ftp_candidates:
        best_ftp = max(ftp_candidates, key=lambda x: x['est'])
        a = best_ftp['a']
        rouvy_tag = ' (Rouvy ×0.98)' if a.get('vr') else ''
        pbs['Bike FTP Estimate'] = {
            'v': f"{best_ftp['est']}W",
            'watts': best_ftp['est'],
            'raw_power': best_ftp['power'],
            'dur': round(best_ftp['dur']),
            'date': a['d'],
            'hr': a.get('hr'),
            'vr': bool(a.get('vr')),
            'note': f"Auto FTP: {best_ftp['power']}W × {dur_scale(best_ftp['dur'])}{rouvy_tag} · {a['d']}"
        }

    # ── SWIM PBs ──────────────────────────────────────────────────────────────
    swim_acts = [a for a in all_acts if a.get('s') == 'Swim' and a.get('sp') and a.get('dk')]

    swim_buckets = [
        ('Swim 1000m',  0.85,  1.15,  1.0),
        ('Swim 1500m',  1.35,  1.65,  1.5),
        ('Swim 2000m',  1.85,  2.15,  2.0),
        ('Swim 2500m',  2.25,  2.75,  2.5),
        ('Swim 3000m+', 2.80, 99.0,   3.0),
    ]
    for key, lo, hi, _ in swim_buckets:
        candidates = [a for a in swim_acts if lo <= a['dk'] <= hi and a['sp'] < 4.0]
        if candidates:
            best = min(candidates, key=lambda a: a['sp'])
            m = int(best['sp'])
            s = int(round((best['sp'] % 1) * 60))
            pbs[key] = {
                'v': f"{m}:{s:02d}/100m",
                'pace': best['sp'],
                'date': best['d'],
                'hr': best.get('hr'),
                'dk_m': round(best['dk'] * 1000),
                'note': f"Auto · {best['d']} · {round(best['dk']*1000)}m"
            }

    # Best overall session pace
    if swim_acts:
        best_all = min(swim_acts, key=lambda a: a['sp'])
        m = int(best_all['sp']); s = int(round((best_all['sp'] % 1) * 60))
        pbs['Swim Best Session Pace'] = {
            'v': f"{m}:{s:02d}/100m",
            'pace': best_all['sp'],
            'date': best_all['d'],
            'note': f"Auto · {best_all['d']} · {round(best_all['dk']*1000)}m"
        }

    # CSS estimate from best lap split (lsp) — most accurate CSS proxy
    swim_with_lsp = [a for a in swim_acts if a.get('lsp') and a['lsp'] < 3.0]
    if swim_with_lsp:
        best_lsp = min(swim_with_lsp, key=lambda a: a['lsp'])
        m = int(best_lsp['lsp']); s = int(round((best_lsp['lsp'] % 1) * 60))
        pbs['Swim CSS'] = {
            'v': f"~{m}:{s:02d}/100m",
            'pace': best_lsp['lsp'],
            'date': best_lsp['d'],
            'lap_m': best_lsp.get('lsp_m'),
            'note': f"Auto CSS from best {best_lsp.get('lsp_m',100)}m lap · {best_lsp['d']}"
        }

    return pbs


# ─────────────────────────────────────────────────────────────────
# INJECT INTO HTML
# ─────────────────────────────────────────────────────────────────
def inject_into_html(garmin_data, strava_acts):
    """Write Garmin + Strava data directly into the HTML file."""
    html_path = find_html()
    if not html_path:
        print("\n❌ Could not find tracker HTML file in this folder.")
        print("   Make sure sync.py is in the same folder as triathlon_tracker_v5.html")
        return False

    print(f"\n  Updating {html_path.name}...")
    html = html_path.read_text(encoding="utf-8")

    # Garmin health data goes to js/strava.js, Strava activities go to js/dashboard.js
    garmin_js_path = html_path.parent / "js" / "strava.js"
    dash_js_path = html_path.parent / "js" / "dashboard.js"

    # ── 1. Inject Garmin data into js/strava.js ───────────────────
    # Always include today's date so the dashboard can detect stale data
    if garmin_data:
        garmin_data['date'] = datetime.now().strftime('%Y-%m-%d')
    garmin_json = json.dumps(garmin_data) if garmin_data else "null"
    if garmin_js_path.exists():
        garmin_html = garmin_js_path.read_text(encoding="utf-8")
        garmin_html = re.sub(
            r'const GARMIN_TODAY = [^;]*;[^\n]*@@GARMIN_INJECT@@[^\n]*',
            f'const GARMIN_TODAY = {garmin_json}; // @@GARMIN_INJECT@@ — do not edit this line',
            garmin_html
        )
        meta = {"synced_at": datetime.now().isoformat(), "strava_count": len(strava_acts)}
        meta_json = json.dumps(meta)
        garmin_html = re.sub(
            r'const SYNC_META = [^;]*;[^\n]*@@SYNC_META@@[^\n]*',
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
        dash_html = dash_js_path.read_text(encoding="utf-8") if dash_js_path.exists() else ""
        m = re.search(r'const STRAVA_ACTS = (\{.*?\});', dash_html, re.DOTALL)
        if m:
            try:
                raw_json = m.group(1)

                # Robust JSON parse — handle corrupted \u escapes from previous syncs
                def safe_json_loads(s):
                    try:
                        return json.loads(s)
                    except json.JSONDecodeError:
                        pass
                    # Fix invalid \u escapes (not followed by 4 hex digits)
                    fixed = re.sub(r'\\u(?![0-9a-fA-F]{4})', r'u', s)
                    try:
                        return json.loads(fixed)
                    except json.JSONDecodeError:
                        pass
                    # Last resort: strip non-ASCII chars that may have caused the issue
                    ascii_only = s.encode('ascii', errors='replace').decode('ascii')
                    return json.loads(ascii_only)

                existing = safe_json_loads(raw_json)
                existing_ids = {a.get("id") for a in existing.get("acts", []) if a.get("id")}

                # Add new activities not already present
                new_count = 0
                for act in strava_acts:
                    act_id = act.get("id")
                    act_date = act.get("d")
                    act_name = act.get("n", "")
                    if act_id and act_id in existing_ids:
                        continue
                    duplicate = any(
                        a.get("d") == act_date and a.get("n") == act_name
                        for a in existing.get("acts", [])
                    )
                    if duplicate:
                        continue
                    existing["acts"].append(act)
                    if act_id:
                        existing_ids.add(act_id)
                    new_count += 1

                # Sort by date
                existing["acts"].sort(key=lambda a: a.get("d", ""))

                # ── Compute auto PBs from ALL stored activities ──────────────
                try:
                    auto_pbs = compute_pbs_from_acts(existing["acts"])
                    existing["pbs"] = auto_pbs
                    pb_count = len(auto_pbs)
                    print(f"  ✅ Auto-detected {pb_count} PBs from {len(existing['acts'])} activities")
                    # Print key PBs
                    for key in ['Run 10km','Run Half Marathon','Bike FTP Estimate','Bike Best NP (Rouvy)','Swim CSS']:
                        if key in auto_pbs:
                            print(f"     {key}: {auto_pbs[key]['v']}")
                except Exception as e:
                    print(f"  ⚠  PB computation failed: {e}")
                    import traceback; traceback.print_exc()

                # Write back — use ensure_ascii=False so emoji stored as UTF-8, not \uXXXX
                new_acts_json = json.dumps(existing, ensure_ascii=False)
                html = re.sub(
                    r'const STRAVA_ACTS = \{.*?\};',
                    f'const STRAVA_ACTS = {new_acts_json};',
                    html,
                    flags=re.DOTALL
                )
                print(f"  ✅ Added {new_count} new Strava activities to tracker")
                if new_count == 0:
                    print(f"     (all {len(strava_acts)} fetched activities already present)")
            except Exception as e:
                print(f"  ⚠  Could not merge Strava activities: {e}")

    # ── 4. Save Strava activities to js/dashboard.js ─────────────
    dash_js_path.write_text(html, encoding="utf-8")
    print(f"  ✅ js/dashboard.js updated with Strava activities")
    return True

# ─────────────────────────────────────────────────────────────────
# SUPABASE PUSH — push Strava activities to Supabase
# ─────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://vhdzkmjfivfuverqhxip.supabase.co"
SUPABASE_KEY = "sb_publishable_A14st8S-OPSBBOZ8SzQshQ_D56nk0nz"

def push_to_supabase(strava_acts):
    """Upsert all Strava activities to Supabase strava_acts table."""
    if not strava_acts:
        return
    try:
        import requests as req
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        # Upsert in batches of 100
        batch_size = 100
        total = 0
        for i in range(0, len(strava_acts), batch_size):
            batch = strava_acts[i:i+batch_size]
            # Wrap each act with an id field for upsert key
            rows = [{"act_id": str(a["id"]), "data": a} for a in batch if a.get("id")]
            r = req.post(
                f"{SUPABASE_URL}/rest/v1/strava_acts",
                headers=headers,
                json=rows
            )
            if r.status_code in (200, 201):
                total += len(rows)
            else:
                print(f"  ⚠  Supabase push error: {r.status_code} {r.text[:200]}")
                return
        print(f"  ✅ Pushed {total} activities to Supabase")
    except Exception as e:
        print(f"  ⚠  Supabase push failed: {e}")

def ensure_supabase_table():
    """Create strava_acts table if it doesn't exist via RPC (best-effort)."""
    pass  # Table must be created manually in Supabase dashboard — see setup instructions

def push_garmin_to_supabase(garmin_data):
    """Push today's Garmin data to Supabase garmin_today table (single row, always upserted)."""
    if not garmin_data:
        return
    try:
        import requests as req
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        row = {"id": "latest", "data": garmin_data}
        r = req.post(
            f"{SUPABASE_URL}/rest/v1/garmin_today",
            headers=headers,
            json=row
        )
        if r.status_code in (200, 201):
            print(f"  ✅ Garmin data pushed to Supabase")
        else:
            print(f"  ⚠  Supabase Garmin push error: {r.status_code} {r.text[:200]}")
    except Exception as e:
        print(f"  ⚠  Supabase Garmin push failed: {e}")

# ─────────────────────────────────────────────────────────────────
# STRUCTURED SYNC — returns result dict for server mode
# ─────────────────────────────────────────────────────────────────
def run_sync(do_garmin=True, do_strava=True, days=14):
    """Run sync and return a result dict."""
    messages = []
    garmin_data = None
    strava_acts = []

    if do_garmin:
        messages.append("[Garmin]")
        garmin_data = garmin_fetch()
        if garmin_data:
            cal_str = f" CalOut={garmin_data.get('calOut','—')}" if garmin_data.get('calOut') else ""
            messages.append(f"  ✅ HRV={garmin_data.get('hrv','—')} RHR={garmin_data.get('rhr','—')} Sleep={garmin_data.get('sleepScore','—')}{cal_str}")
        else:
            messages.append("  ⚠  No Garmin data returned")

    if do_strava:
        messages.append("[Strava]")
        strava_acts = strava_fetch(days)
        messages.append(f"  ✅ {len(strava_acts)} activities fetched")

    messages.append("[Writing to HTML]")
    ok = inject_into_html(garmin_data, strava_acts)
    messages.append("  ✅ HTML updated" if ok else "  ❌ HTML update failed")

    messages.append("[Supabase]")
    if do_garmin and garmin_data:
        try:
            push_garmin_to_supabase(garmin_data)
            messages.append(f"  ✅ Garmin data pushed to Supabase")
        except Exception as e:
            messages.append(f"  ⚠  Supabase Garmin push failed: {e}")
    if do_strava and strava_acts:
        try:
            push_to_supabase(strava_acts)
            messages.append(f"  ✅ {len(strava_acts)} activities pushed to Supabase")
        except Exception as e:
            messages.append(f"  ⚠  Supabase Strava push failed: {e}")

    # Auto git push — keeps live site Garmin data fresh without manual push
    messages.append("[GitHub]")
    try:
        import subprocess
        repo = Path(__file__).parent
        subprocess.run(["git", "add", "js/strava.js", "js/dashboard.js"], cwd=repo, check=True, capture_output=True)
        diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=repo, capture_output=True)
        if diff.returncode != 0:
            subprocess.run(["git", "commit", "-m", f"Sync {datetime.now().strftime('%Y-%m-%d %H:%M')} — Garmin + {len(strava_acts)} activities"], cwd=repo, check=True, capture_output=True)
            subprocess.run(["git", "push", "origin", "main"], cwd=repo, check=True, capture_output=True)
            messages.append("  ✅ Pushed to GitHub — live site updated")
        else:
            messages.append("  ✅ No changes to push")
    except Exception as e:
        messages.append(f"  ⚠  Git push failed: {e}")

    return {"ok": ok, "messages": messages, "garmin": garmin_data, "strava_count": len(strava_acts)}


# ─────────────────────────────────────────────────────────────────
# LOCAL HTTP SERVER — python3 sync.py --serve
# ─────────────────────────────────────────────────────────────────
def run_server(port=7432):
    """
    Start a local HTTP server so the tracker HTML can trigger syncs
    by clicking buttons instead of running terminal commands.

    Endpoints:
      GET  /status         → {"ok": true}
      POST /sync           → full sync (Garmin + Strava)
      POST /sync/strava    → Strava only
      POST /sync/garmin    → Garmin only
    """
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class SyncHandler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            pass  # suppress default log spam

        def send_json(self, code, data):
            body = json.dumps(data).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", len(body))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def do_GET(self):
            if self.path == "/status":
                self.send_json(200, {"ok": True, "message": "Sync server running ✅"})
            else:
                self.send_json(404, {"ok": False, "message": "Not found"})

        def do_POST(self):
            path = self.path.rstrip("/")
            print(f"\n→ {datetime.now().strftime('%H:%M:%S')}  POST {path}")
            try:
                if path == "/sync":
                    result = run_sync(do_garmin=True, do_strava=True)
                elif path == "/sync/strava":
                    result = run_sync(do_garmin=False, do_strava=True)
                elif path == "/sync/garmin":
                    result = run_sync(do_garmin=True, do_strava=False)
                else:
                    self.send_json(404, {"ok": False, "message": "Unknown endpoint"})
                    return

                for msg in result["messages"]:
                    print(msg)

                self.send_json(200, {
                    "ok": result["ok"],
                    "message": "Sync complete ✅" if result["ok"] else "Sync failed ❌",
                    "details": result["messages"],
                    "strava_count": result["strava_count"],
                    "garmin": bool(result["garmin"]),
                })
            except Exception as e:
                print(f"  ❌ Error: {e}")
                self.send_json(500, {"ok": False, "message": str(e)})

    html_path = find_html()
    print("=" * 56)
    print("  Triathlon Tracker — Sync Server")
    print(f"  {datetime.now().strftime('%A %d %B %Y, %H:%M')}")
    print("=" * 56)
    print(f"\n  Listening on  http://localhost:{port}")
    print(f"  HTML file:    {html_path.name if html_path else '⚠  NOT FOUND'}")
    print("\n  The tracker buttons will now trigger syncs automatically.")
    print("  Leave this terminal open while using the tracker.")
    print("  Press Ctrl+C to stop.\n")
    server = HTTPServer(("localhost", port), SyncHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Sync server stopped.")


# ─────────────────────────────────────────────────────────────────
# DIAGNOSTIC CHECK
# ─────────────────────────────────────────────────────────────────
def run_check():
    print("=" * 56)
    print("  Triathlon Tracker — Setup Check")
    print("=" * 56)
    html_path = find_html()
    print(f"\n  HTML:          {'✅ ' + html_path.name if html_path else '❌  Not found in ' + str(Path(__file__).parent)}")
    print(f"  Config file:   {'✅ found' if CONFIG_FILE.exists() else '⚠  Not yet created'}")
    print(f"  Strava:        {'✅ configured' if CONFIG.get('strava_client_id') and CONFIG.get('strava_refresh_token') else '❌  Run: python3 sync.py --auth-strava'}")
    print(f"  Garmin:        {'✅ configured' if CONFIG.get('garmin_email') else '❌  Add garmin_email + garmin_password to sync_config.json'}")
    try:
        import requests; print("  requests:      ✅")
    except ImportError:
        print("  requests:      ❌  pip3 install requests")
    try:
        from garminconnect import Garmin; print("  garminconnect: ✅")
    except ImportError:
        print("  garminconnect: ❌  pip3 install garminconnect")
    print(f"\n  Sync server:   python3 sync.py --serve")
    print(f"  One-off sync:  python3 sync.py\n")


# ─────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Triathlon Tracker Sync")
    parser.add_argument("--days",        type=int, default=14,
                        help="Days of Strava history to sync (default 14)")
    parser.add_argument("--auth-strava", action="store_true",
                        help="Run one-time Strava OAuth setup")
    parser.add_argument("--garmin-only", action="store_true",
                        help="Only sync Garmin, skip Strava")
    parser.add_argument("--strava-only", action="store_true",
                        help="Only sync Strava, skip Garmin")
    parser.add_argument("--serve",       action="store_true",
                        help="Start local sync server on port 7432")
    parser.add_argument("--port",        type=int, default=7432,
                        help="Port for --serve mode (default 7432)")
    parser.add_argument("--check",       action="store_true",
                        help="Check setup and credentials")
    parser.add_argument("--debug",       action="store_true",
                        help="Print raw Garmin API responses for diagnosis")
    args = parser.parse_args()

    load_config()

    global DEBUG; DEBUG = args.debug
    if args.check:        run_check();           return
    if args.auth_strava:  strava_auth_flow();    return
    if args.serve:        run_server(args.port); return

    # One-off sync
    print("=" * 52)
    print("  Triathlon Tracker — Sync")
    print(f"  {datetime.now().strftime('%A %d %B %Y, %H:%M')}")
    print("=" * 52)

    result = run_sync(
        do_garmin = not args.strava_only,
        do_strava = not args.garmin_only,
        days      = args.days,
    )
    for msg in result["messages"]:
        print(msg)

    if result["ok"]:
        print("\n" + "=" * 52)
        print("  ✅ Sync complete!")
        print(f"  Garmin:  {'filled' if result['garmin'] else 'skipped/failed'}")
        print(f"  Strava:  {result['strava_count']} activities")
        print("\n  Reload your tracker HTML in the browser.")
        print("=" * 52)
    else:
        print("\n❌ Sync failed — see errors above.")

if __name__ == "__main__":
    main()
