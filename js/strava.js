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

function autoFillCIFromPlanner() { autoFillCI(); }

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
const GARMIN_TODAY = {"hrv": 77, "hrv7": 74, "rhr": 51, "sleepScore": 82, "sleepHrs": 7.8, "yesterdayStress": 28}; // @@GARMIN_INJECT@@ — do not edit this line
const SYNC_META = null;    // @@SYNC_META@@    — do not edit this line

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
  const garmin = getGarminData();
  if(garmin) {
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

  // Check cloud sync status first
  if(GARMIN_CLOUD && GARMIN_CLOUD.synced_at) {
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

  // Check if Garmin is connected but never synced
  if(GARMIN_STATUS && !GARMIN_STATUS.last_sync_at) {
    syncEl.innerHTML = '⚠️ Garmin connected — tap <strong>Sync Now</strong> to pull data';
    syncEl.style.color = 'var(--orange)';
    return;
  }

  // Not connected
  if(!GARMIN_STATUS) {
    syncEl.innerHTML = '⚪ Garmin not connected — go to <strong>Athletes → Connect Garmin</strong>';
    syncEl.style.color = 'var(--text-dim)';
  }
}



