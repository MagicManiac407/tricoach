// ===== SUPABASE GARMIN LOADER =====
// Loads today's Garmin data from Supabase so dashboard always shows fresh data
// without needing a git push after every sync.
async function loadGarminFromSupabase() {
  try {
    const SUPA_URL = "https://vhdzkmjfivfuverqhxip.supabase.co";
    const SUPA_KEY = "sb_publishable_A14st8S-OPSBBOZ8SzQshQ_D56nk0nz";
    const r = await fetch(`${SUPA_URL}/rest/v1/garmin_today?id=eq.latest&select=data`, {
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
    });
    if(!r.ok) return;
    const rows = await r.json();
    if(!rows.length || !rows[0].data) return;
    const garmin = rows[0].data;
    const today = localDateStr(new Date());
    if(garmin.date !== today) {
      console.log('[TriCoach] Garmin data in Supabase is from', garmin.date, '— not today, skipping');
      return;
    }
    // Store in GARMIN_TODAY so applySyncData() and populateMorningForm() can use it
    if(typeof GARMIN_TODAY !== 'undefined') {
      Object.assign(GARMIN_TODAY, garmin);
    }
    // Re-run applySyncData now that we have fresh data
    if(typeof applySyncData === 'function') applySyncData();
    // Re-render dashboard
    if(typeof updateDashboard === 'function') updateDashboard();
    console.log('[TriCoach] Garmin data loaded from Supabase:', garmin);
  } catch(e) {
    console.warn('[TriCoach] Supabase Garmin load failed, using static data:', e);
  }
}

// ===== SUPABASE STRAVA LOADER =====
// Loads all activities from Supabase strava_acts table and overrides STRAVA_ACTS in memory.
// This means sync.py just needs to push to Supabase — no git push needed for data updates.
async function loadStravaFromSupabase() {
  try {
    const SUPA_URL = "https://vhdzkmjfivfuverqhxip.supabase.co";
    const SUPA_KEY = "sb_publishable_A14st8S-OPSBBOZ8SzQshQ_D56nk0nz";
    let all = [];
    let from = 0;
    const pageSize = 1000;
    // Paginate through all rows
    while(true) {
      const r = await fetch(`${SUPA_URL}/rest/v1/strava_acts?select=data&order=act_id&offset=${from}&limit=${pageSize}`, {
        headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
      });
      if(!r.ok) break;
      const rows = await r.json();
      if(!rows.length) break;
      all = all.concat(rows.map(row => row.data));
      if(rows.length < pageSize) break;
      from += pageSize;
    }
    if(all.length > 0) {
      all.sort((a,b) => (a.d||'').localeCompare(b.d||''));
      STRAVA_ACTS.acts = all;
      console.log(`[TriCoach] Loaded ${all.length} activities from Supabase`);
      // Re-render whichever page is currently active
      if(typeof updateDashboard === 'function') updateDashboard();
      if(typeof renderPerformance === 'function') renderPerformance();
      if(typeof renderPlanner === 'function') {
        const planPage = document.getElementById('page-planner');
        if(planPage && planPage.classList.contains('active')) renderPlanner();
      }
    }
  } catch(e) {
    console.warn('[TriCoach] Supabase activity load failed, using static data:', e);
  }
}

// ===== STRAVA CLEAR / RESYNC =====
function confirmClearAllStrava() {
  // Show a modal-style confirm rather than browser confirm()
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:400;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--surface);border-radius:14px;padding:28px 24px;max-width:340px;width:90%;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">🗑</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:var(--red);margin-bottom:10px;">CLEAR ALL STRAVA DATA</div>
      <div style="font-size:12px;color:var(--text-mid);line-height:1.6;margin-bottom:20px;">This removes all Strava-imported activity lines from every week in the planner.<br><br><strong style="color:var(--text);">Your written plans, notes and session ratings are preserved.</strong><br><br>After clearing, use 🔄 Re-sync ALL weeks to reimport cleanly.</div>
      <div style="display:flex;gap:10px;">
        <button class="btn sec" style="flex:1;" onclick="this.closest('div[style*=fixed]').remove()">Cancel</button>
        <button class="btn" style="flex:1;background:var(--red);" onclick="doFullClearStrava(this)">Yes, Clear All</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function doFullClearStrava(btn) {
  const overlay = btn.closest('div[style*=fixed]');
  // Clear all strava-imported completed text
  clearAllStravaImports();
  // Wipe ALL plan data that came from Strava (but keep written plans/notes)
  Object.keys(D.plans).forEach(wk => {
    for(let di=0; di<7; di++) {
      const day = D.plans[wk]?.[di];
      if(!day) continue;
      day.completed = '';
      day.types = '';
    }
    // Reset all week total overrides
    if(D.plans[wk]) {
      ['_manrunkm','_manrunKm','_manswimm','_manswimM',
       '_manbikehrs','_manbikeKm','_mantotalhrs'].forEach(k => delete D.plans[wk][k]);
    }
  });
  // Clear manual input fields on screen
  ['man-run-km','man-swim-m','man-bike-hrs','man-total-hrs'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  // Reset week total tiles to zero immediately
  ['tot-swim','tot-bike','tot-run'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = '0';
  });
  ['tot-swim-km','tot-bike-km','tot-run-km','tot-hrs','tot-sessions'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = '0';
  });
  save();
  renderPlanner();
  updateDashboard();
  if(overlay) overlay.remove();
  showToast('Cleared all Strava data + week totals reset ✓');
}
function clearStravaImports(weekKey) {
  if(!D.plans[weekKey]) { showToast('No data for this week'); return; }
  let cleared = 0;
  for(let di=0; di<7; di++) {
    const day = D.plans[weekKey][di];
    if(!day) continue;
    if(day.completed && day.completed.includes('--- Strava ---')) {
      day.completed = day.completed.split('--- Strava ---')[0].trimEnd();
      cleared++;
    } else if(day.completed) {
      // Completed was pure strava (no separator) — check if it has strava markers
      if(/^(Run:|Rouvy:|Ride:|Swim:)/m.test(day.completed) && !day._hasManualEntry) {
        day.completed = '';
        day.types = '';
        cleared++;
      }
    }
  }
  save(); renderPlanner();
  showToast('Cleared Strava data from ' + cleared + ' days');
}

function clearAllStravaImports() {
  let cleared = 0;
  Object.keys(D.plans).forEach(wk => {
    for(let di=0; di<7; di++) {
      const day = D.plans[wk]?.[di];
      if(!day) continue;
      if(day.completed && day.completed.includes('--- Strava ---')) {
        day.completed = day.completed.split('--- Strava ---')[0].trimEnd();
        cleared++;
      } else if(day.completed && /^(Run:|Rouvy:|Ride:|Swim:)/m.test(day.completed) && !day._hasManualEntry) {
        day.completed = '';
        day.types = '';
        cleared++;
      }
    }
  });
  return cleared;
}

function resyncAllStrava() {
  if(!confirm('This will clear all Strava-imported data and re-import cleanly from scratch. Your written plans and notes will be preserved. Continue?')) return;
  // Step 1: Wipe all completed/types that came from Strava
  clearAllStravaImports();
  // Step 2: Wipe the whole plans object and re-populate from scratch
  D.plans = {};
  // Step 3: Re-run full import
  autoPopulatePlannerFromStrava();
  renderPlanner();
  showToast('Re-synced all weeks from Strava ✓');
}

// ===== AUTO-DETECT WEEK TOTALS FROM STRAVA =====
function calcWeekTotalsFromStrava(weekKey) {
  const [wY,wM,wD] = weekKey.split('-').map(Number);
  const wEnd = new Date(wY,wM-1,wD+6);
  const wEndStr = wEnd.getFullYear()+'-'+String(wEnd.getMonth()+1).padStart(2,'0')+'-'+String(wEnd.getDate()).padStart(2,'0');

  const acts = STRAVA_ACTS.acts.filter(a => a.d >= weekKey && a.d <= wEndStr && a.mm && a.mm >= 1);

  let runKm=0, runMin=0, runSessions=0;
  let swimKm=0, swimMin=0, swimSessions=0;
  let bikeKm=0, bikeMin=0, bikeSessions=0;
  let totalMin=0;
  let hardCount=0, hardMin=0;
  let z2Count=0, z2Min=0;
  let z3Count=0, z3Min=0;
  let wuCount=0;

  acts.forEach(a => {
    totalMin += a.mm || 0;
    if(a.s==='Run')  { runKm  += a.dk||0; runMin  += a.mm||0; runSessions++;  }
    if(a.s==='Swim') { swimKm += a.dk||0; swimMin += a.mm||0; swimSessions++; }
    if(a.s==='Bike') { bikeKm += a.dk||0; bikeMin += a.mm||0; bikeSessions++; }
    if(a.wu||a.cd) { wuCount++; }
    else if(a.ef==='hard'||a.ef==='max'||a.iv) { hardCount++; hardMin+=a.mm||0; }
    else if(a.ef==='easy') { z2Count++; z2Min+=a.mm||0; }
    else if(a.ef==='moderate') { z3Count++; z3Min+=a.mm||0; }
  });

  return { runKm, runMin, runSessions, swimKm, swimMin, swimSessions, bikeKm, bikeMin, bikeSessions,
           totalMin, totalSessions: acts.length,
           hardCount, hardMin, z2Count, z2Min, z3Count, z3Min, wuCount };
}

function fmtMins(min) {
  if(!min) return '';
  const h = Math.floor(min/60), m = Math.round(min%60);
  return h>0 ? h+'h '+(m>0?m+'m':'') : m+'m';
}

function updateAutoTotals() {
  const t = calcWeekTotalsFromStrava(currentWeekKey);

  const rKm = document.getElementById('auto-run-km');
  const rT  = document.getElementById('auto-run-time');
  const sKm = document.getElementById('auto-swim-km');
  const sT  = document.getElementById('auto-swim-time');
  const bKm = document.getElementById('auto-bike-km');
  const bT  = document.getElementById('auto-bike-time');
  const tot = document.getElementById('auto-total-time');
  const cnt = document.getElementById('auto-sessions-count');

  if(rKm) rKm.textContent = t.runKm>0 ? t.runKm.toFixed(1) : '—';
  if(rT)  rT.textContent  = t.runMin>0 ? fmtMins(t.runMin) : '';
  if(sKm) sKm.textContent = t.swimKm>0 ? (t.swimKm*1000).toFixed(0)+'m' : '—';
  if(sT)  sT.textContent  = t.swimMin>0 ? fmtMins(t.swimMin) : '';
  if(bKm) bKm.textContent = t.bikeKm>0 ? t.bikeKm.toFixed(0) : '—';
  if(bT)  bT.textContent  = t.bikeMin>0 ? fmtMins(t.bikeMin) : '';
  if(tot) tot.textContent = t.totalMin>0 ? (t.totalMin/60).toFixed(1) : '—';
  if(cnt) cnt.textContent = t.totalSessions>0 ? t.totalSessions+' sessions' : '';

  // Effort breakdown
  const hc = document.getElementById('auto-hard-count');
  const ht = document.getElementById('auto-hard-time');
  const z2c = document.getElementById('auto-z2-count');
  const z2t = document.getElementById('auto-z2-time');
  const z3c = document.getElementById('auto-z3-count');
  const z3t = document.getElementById('auto-z3-time');
  const wuc = document.getElementById('auto-wu-count');
  if(hc) hc.textContent = t.hardCount > 0 ? t.hardCount+' sessions' : '0';
  if(ht) ht.textContent = t.hardMin > 0 ? fmtMins(t.hardMin) : '';
  if(z2c) z2c.textContent = t.z2Count > 0 ? t.z2Count+' sessions' : '0';
  if(z2t) z2t.textContent = t.z2Min > 0 ? fmtMins(t.z2Min) : '';
  if(z3c) z3c.textContent = t.z3Count > 0 ? t.z3Count+' sessions' : '0';
  if(z3t) z3t.textContent = t.z3Min > 0 ? fmtMins(t.z3Min) : '';
  if(wuc) wuc.textContent = t.wuCount > 0 ? t.wuCount : '0';
}

// ===== TRAINING LOAD SCORE (replaces Z2 Pace in check-in) =====
// Score based on: total volume (hrs), session count, effort distribution, avg HR
// Returns {score, label, color, detail} — score is 0-100 arbitrary load index
function calcWeekTrainingLoad(weekKey) {
  const t = calcWeekTotalsFromStrava(weekKey);
  if(!t.totalSessions && !t.totalMin) return null;

  const totalHrs = t.totalMin / 60;

  // Volume score (0-35 pts): 10hrs = ~25pts, 15hrs = 35pts, scale linearly
  const volumeScore = Math.min(35, totalHrs * 2.3);

  // Session count score (0-20 pts): 7 sessions = 20pts
  const sessionScore = Math.min(20, t.totalSessions * 2.9);

  // Effort distribution score (0-25 pts): balanced mix = high score
  // Ideal: ~20% hard, ~60% z2, ~20% moderate
  const totalEff = t.hardCount + t.z2Count + t.z3Count;
  let effortScore = 0;
  if(totalEff > 0) {
    const hardRatio = t.hardCount / totalEff;
    const z2Ratio = t.z2Count / totalEff;
    // Sweet spot: 15-30% hard, 50-70% z2
    const hardOk = hardRatio >= 0.1 && hardRatio <= 0.35;
    const z2Ok = z2Ratio >= 0.4;
    effortScore = (hardOk ? 12 : hardRatio > 0.35 ? 6 : 8) + (z2Ok ? 13 : 7);
  } else {
    effortScore = 10; // no effort data — neutral
  }

  // Sport variety score (0-20 pts): doing all 3 disciplines = 20pts
  const sports = (t.runSessions > 0 ? 1 : 0) + (t.swimSessions > 0 ? 1 : 0) + (t.bikeSessions > 0 ? 1 : 0);
  const varietyScore = sports * 7; // max 21, cap at 20

  const rawScore = Math.round(volumeScore + sessionScore + effortScore + Math.min(20, varietyScore));
  const score = Math.min(100, rawScore);

  // Build breakdown detail text
  const parts = [];
  if(totalHrs > 0) parts.push(totalHrs.toFixed(1) + 'h total');
  if(t.totalSessions > 0) parts.push(t.totalSessions + ' sessions');
  if(t.hardCount > 0) parts.push(t.hardCount + ' hard');
  if(t.z2Count > 0) parts.push(t.z2Count + ' Z2');
  const sportLabels = [t.runSessions?t.runSessions+' runs':'', t.swimSessions?t.swimSessions+' swims':'', t.bikeSessions?t.bikeSessions+' bikes':''].filter(Boolean);
  if(sportLabels.length) parts.push(sportLabels.join(', '));

  const label = score >= 75 ? 'HIGH' : score >= 50 ? 'MODERATE' : score >= 25 ? 'LOW' : 'MINIMAL';
  const color = score >= 75 ? 'var(--red)' : score >= 50 ? 'var(--orange)' : score >= 25 ? 'var(--green)' : 'var(--text-dim)';

  return { score, label, color, detail: parts.join(' · ') || 'No Strava data' };
}

// ===== AUTO-POPULATE PLANNER FROM STRAVA =====
function autoPopulatePlannerFromStrava() {
  STRAVA_ACTS.acts.forEach(a => {
    if(!a.mm || a.mm < 3) return;
    const wk = stravaDateToWeekKey(a.d);
    const dow = stravaDateToDow(a.d);
    if(!D.plans[wk]) D.plans[wk] = {};
    if(!D.plans[wk][dow]) D.plans[wk][dow] = {types:'',plan:'',completed:'',notes:''};
    const line = stravaFormatLine(a);
    if(!line) return;
    const cur = D.plans[wk][dow].completed || '';
    // Dedup: check first 25 chars of line to avoid double-appending on re-run
    const fingerprint = line.substring(0, 25);
    if(cur.includes(fingerprint)) return;
    D.plans[wk][dow].completed = cur ? cur + '\n' + line : line;
    const tag = stravaTypeTag(a);
    const curT = D.plans[wk][dow].types || '';
    if(!curT.includes(tag)) D.plans[wk][dow].types = curT ? curT+', '+tag : tag;
  });
  save();
}


// ===== SYNC DATA — fallback constants (overridden by Supabase garmin_data if available) =====
const GARMIN_TODAY = {"hrv": 87, "hrv7": 81, "sleepScore": 89, "sleepHrs": 10.1, "rhr": 48, "yesterdayStress": 39, "bodyBattery": 72, "date": "2026-03-12"}; // @@GARMIN_INJECT@@ — do not edit this line
const SYNC_META = {"synced_at": "2026-03-12T17:58:36.412274", "strava_count": 26};    // @@SYNC_META@@    — do not edit this line

// Refresh planner for recent weeks from STRAVA_ACTS (handles duplication safely)
function refreshPlannerFromStrava() {
  const today = new Date();
  let imported = 0;
  for(let w=0; w<8; w++){
    const d = new Date(today);
    d.setDate(d.getDate() - (w*7));
    const wk = getWeekKey(d);
    const [wY,wM,wD2] = wk.split('-').map(Number);
    const wEndDate = new Date(wY,wM-1,wD2+6);
    const wEnd = wEndDate.getFullYear()+'-'+String(wEndDate.getMonth()+1).padStart(2,'0')+'-'+String(wEndDate.getDate()).padStart(2,'0');
    const acts = STRAVA_ACTS.acts.filter(a => a.d >= wk && a.d <= wEnd && a.mm && a.mm >= 1);
    if(!acts.length) continue;
    if(!D.plans[wk]) D.plans[wk] = {};
    const stravaByDay = {};
    acts.forEach(a => {
      const dow = stravaDateToDow(a.d);
      if(!stravaByDay[dow]) stravaByDay[dow] = [];
      stravaByDay[dow].push(stravaFormatLine(a));
      if(!stravaByDay[dow]._tags) stravaByDay[dow]._tags = new Set();
      stravaByDay[dow]._tags.add(stravaTypeTag(a));
    });
    for(let di=0;di<7;di++){
      if(!stravaByDay[di]) continue;
      if(!D.plans[wk][di]) D.plans[wk][di]={types:'',plan:'',completed:'',notes:''};
      const day = D.plans[wk][di];
      // Always fully replace completed with fresh Strava data — no separator logic
      // Manual session notes belong in day.plan, not day.completed
      day.completed = stravaByDay[di].filter(l=>typeof l==='string').join('\n');
      // Reset and rebuild types from scratch for this day
      day.types = '';
      stravaByDay[di]._tags.forEach(tag=>{
        day.types = day.types ? day.types+', '+tag : tag;
      });
      imported++;
    }
  }
  save();
  renderPlanner();
  updateAutoTotals();
  showToast(imported ? '✅ Planner refreshed from Strava ('+imported+' days updated)' : 'No Strava activities found for recent weeks');
}

function applySyncData() {
  const today = localDateStr(new Date());

  // ── Garmin: auto-fill morning check fields ──────────────────────
  // Priority: 1) Cloud data from Supabase, 2) Hardcoded GARMIN_TODAY fallback
  let garmin = null;
  let garminIsToday = false;
  // getGarminData is defined in strava_oauth.js (loaded after strava.js)
  if(typeof getGarminData === 'function') {
    garmin = getGarminData();
    // Cloud garmin data: check date if present
    if(garmin && garmin.date) garminIsToday = (garmin.date === today);
    else if(garmin) garminIsToday = true; // cloud data assumed current
  } else if(typeof GARMIN_TODAY !== 'undefined') {
    garmin = GARMIN_TODAY;
    // Static injected data: only use if date matches today
    garminIsToday = garmin.date ? (garmin.date === today) : false;
  }

  if(garmin && garminIsToday) {
    const fill = (id, val) => {
      const el = document.getElementById(id);
      if(el && val != null) el.value = val;
    };
    fill('m-hrv',        garmin.hrv);
    fill('m-hrv7',       garmin.hrv7);
    fill('m-rhr',        garmin.rhr);
    fill('m-sleepscore', garmin.sleepScore);
    fill('m-sleep',      garmin.sleepHrs);
    fill('m-gstress',    garmin.yesterdayStress);
    calcReadiness();
    setTimeout(() => {
      autoSaveMorning();
      updateGarminSyncStatus();
    }, 500);
  }
}

function updateGarminSyncStatus() {
  const syncEl = document.getElementById('d-sync-status');
  if(!syncEl) return;

  // Check cloud sync status first (GARMIN_CLOUD is defined in strava_oauth.js)
  if(typeof GARMIN_CLOUD !== 'undefined' && GARMIN_CLOUD && GARMIN_CLOUD.synced_at) {
    const syncedAt = new Date(GARMIN_CLOUD.synced_at);
    const minsAgo = Math.round((Date.now() - syncedAt) / 60000);
    const label = minsAgo < 60 ? minsAgo + 'min ago' : Math.round(minsAgo/60) + 'hrs ago';
    syncEl.innerHTML = '🔄 Garmin synced: <strong>' + label + '</strong>';
    syncEl.style.color = minsAgo < 180 ? 'var(--green)' : 'var(--text-dim)';
    return;
  }

  // Fall back to SYNC_META (from sync.py)
  if(SYNC_META) {
    const syncedAt = new Date(SYNC_META.synced_at);
    const minsAgo = Math.round((Date.now() - syncedAt) / 60000);
    const label = minsAgo < 60 ? minsAgo + 'min ago' : Math.round(minsAgo/60) + 'hrs ago';
    syncEl.innerHTML = '🔄 Synced (script): ' + label;
    syncEl.style.color = minsAgo < 180 ? 'var(--green)' : 'var(--text-dim)';
    return;
  }

  syncEl.innerHTML = '⚪ Garmin not connected — go to <strong>Athletes → Connect Garmin</strong>';
  syncEl.style.color = 'var(--text-dim)';
}



