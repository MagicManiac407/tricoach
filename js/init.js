// ===================================================================
// AUTH + SHARING UI FUNCTIONS
// ===================================================================

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.querySelectorAll('.page, header, .mob-nav, #save-banner').forEach(el => {
    el.style.removeProperty('display');
  });
  if(currentUser && supa) {
    // Show user menu, populate name
    document.getElementById('user-menu-btn').style.display = 'block';
    const profile = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'You';
    document.getElementById('user-name-display').textContent = profile;
    document.getElementById('user-avatar').textContent = profile.charAt(0).toUpperCase();
    document.getElementById('user-email-display').textContent = currentUser.email;
    loadShareStatus();
    // Load Strava status and auto-sync in background
    loadStravaStatus().then(() => {
      renderStravaConnection();
      // Auto-sync Strava to refresh activities on login
      syncStravaActivities(false);
    });
    // Load Garmin status
    loadGarminStatus().then(() => renderGarminConnection());
  }
  updateDashboard();
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('user-menu-btn').style.display = 'none';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-msg');
  if(el) { el.style.color = 'var(--red)'; el.textContent = msg; }
}

function showAuthMsg(msg) {
  const el = document.getElementById('auth-msg');
  if(el) { el.style.color = 'var(--green)'; el.textContent = msg; }
}

function switchAuthTab(tab) {
  document.getElementById('auth-form-in').style.display = tab === 'in' ? 'block' : 'none';
  document.getElementById('auth-form-up').style.display = tab === 'up' ? 'block' : 'none';
  document.getElementById('auth-tab-in').style.borderBottomColor = tab === 'in' ? 'var(--green)' : 'transparent';
  document.getElementById('auth-tab-in').style.color = tab === 'in' ? 'var(--green)' : 'var(--text-dim)';
  document.getElementById('auth-tab-up').style.borderBottomColor = tab === 'up' ? 'var(--green)' : 'transparent';
  document.getElementById('auth-tab-up').style.color = tab === 'up' ? 'var(--green)' : 'var(--text-dim)';
  document.getElementById('auth-msg').textContent = '';
}

function toggleUserMenu() {
  const dd = document.getElementById('user-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}
document.addEventListener('click', e => {
  if(!document.getElementById('user-menu-btn')?.contains(e.target)) {
    const dd = document.getElementById('user-dropdown');
    if(dd) dd.style.display = 'none';
  }
});

// ── Athlete sharing ───────────────────────────────────────────────
async function loadShareStatus() {
  if(!supa || !currentUser) return;
  const { data } = await supa.from('athlete_profiles').select('share_enabled,display_name').eq('id', currentUser.id).single();
  if(!data) return;
  const toggle = document.getElementById('share-toggle');
  const track  = document.getElementById('share-track');
  const thumb  = document.getElementById('share-thumb');
  const label  = document.getElementById('share-label');
  if(toggle) toggle.checked = data.share_enabled;
  if(track)  track.style.background  = data.share_enabled ? 'var(--green)' : 'var(--border)';
  if(thumb)  thumb.style.left        = data.share_enabled ? '22px' : '2px';
  if(label)  label.textContent       = data.share_enabled ? 'Sharing on' : 'Off';
  const status = document.getElementById('share-status');
  if(status) status.textContent = data.share_enabled
    ? '✅ Your training summary is visible to other athletes using this app.'
    : 'Your data is private. Enable sharing to let training partners see your load and readiness.';
}

async function toggleSharing(enabled) {
  if(!supa || !currentUser) { showToast('Sign in to use sharing', true); return; }
  const track = document.getElementById('share-track');
  const thumb = document.getElementById('share-thumb');
  const label = document.getElementById('share-label');
  if(track) track.style.background = enabled ? 'var(--green)' : 'var(--border)';
  if(thumb) thumb.style.left = enabled ? '22px' : '2px';
  if(label) label.textContent = enabled ? 'Sharing on' : 'Off';
  await supa.from('athlete_profiles').upsert({ id: currentUser.id, share_enabled: enabled });
  if(enabled) await updateAthleteSummary();
  const status = document.getElementById('share-status');
  if(status) status.textContent = enabled
    ? '✅ Your training summary is visible to other athletes using this app.'
    : 'Sharing disabled.';
  showToast(enabled ? 'Sharing enabled ✓' : 'Sharing disabled');
}

async function renderAthletes() {
  const el = document.getElementById('athletes-list');
  if(!el) return;

  if(!supa) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim);font-size:13px;">⚙️ Set up Supabase to see athletes sharing their data.<br><br>Add your SUPABASE_URL and SUPABASE_ANON key at the top of the script, then reload.</div>';
    return;
  }
  if(!currentUser) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim);">Sign in to see athletes.</div>';
    return;
  }

  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);">Loading athletes...</div>';

  const { data, error } = await supa.from('athlete_profiles')
    .select('id,display_name,summary,updated_at')
    .eq('share_enabled', true)
    .neq('id', currentUser.id)  // exclude yourself
    .order('updated_at', { ascending: false });

  if(error) { el.innerHTML = '<div style="color:var(--red);padding:16px;">Error loading athletes: ' + error.message + '</div>'; return; }

  if(!data || !data.length) {
    el.innerHTML = `<div style="text-align:center;padding:30px;">
      <div style="font-size:24px;margin-bottom:8px;">👥</div>
      <div style="color:var(--text-dim);font-size:13px;">No athletes sharing yet.</div>
      <div style="color:var(--text-dim);font-size:11px;margin-top:8px;">Share the app URL with training partners — when they enable sharing, they'll appear here.</div>
    </div>`;
    return;
  }

  el.innerHTML = '<div style="display:grid;gap:10px;">' + data.map(a => {
    const s = a.summary || {};
    const recent = (s.recentReadiness || []).slice(-3);
    const avgReadiness = recent.length
      ? Math.round(recent.reduce((sum,r) => sum + (r.readiness||0), 0) / recent.length)
      : null;
    const avgHRV = recent.length
      ? Math.round(recent.reduce((sum,r) => sum + (r.hrv||0), 0) / recent.filter(r=>r.hrv).length)
      : null;
    const lastSeen = a.summary?.lastUpdated
      ? new Date(a.summary.lastUpdated).toLocaleDateString('en-AU', {day:'numeric',month:'short'})
      : 'Unknown';
    const readColor = avgReadiness >= 75 ? 'var(--green)' : avgReadiness >= 50 ? 'var(--orange)' : 'var(--red)';
    const initial = a.display_name.charAt(0).toUpperCase();

    return `<div class="card" style="padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <div style="width:44px;height:44px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:20px;color:#000;flex-shrink:0;">${initial}</div>
      <div style="flex:1;min-width:120px;">
        <div style="font-weight:600;font-size:14px;">${a.display_name}</div>
        <div style="font-size:10px;color:var(--text-dim);">Last synced ${lastSeen}</div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        ${avgReadiness !== null ? `<div style="text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${readColor};">${avgReadiness}</div>
          <div style="font-size:9px;color:var(--text-dim);">AVG READINESS</div>
        </div>` : ''}
        ${avgHRV ? `<div style="text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:#64b5f6;">${avgHRV}</div>
          <div style="font-size:9px;color:var(--text-dim);">AVG HRV</div>
        </div>` : ''}
        ${s.lastCheckin ? `<div style="text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--orange);">${s.lastCheckin.score || '—'}</div>
          <div style="font-size:9px;color:var(--text-dim);">LAST CHECK-IN</div>
        </div>` : ''}
      </div>
    </div>`;
  }).join('') + '</div>';
}

// ── Init on page load ─────────────────────────────────────────────
// Replace the DOMContentLoaded block to call initAuth
// ===== WEEKLY BACKUP REMINDER =====
function checkBackupReminder() {
  const lastBackup = localStorage.getItem('tc26_last_backup');
  const today = localDateStr(new Date());
  const dismissed = localStorage.getItem('tc26_backup_dismissed');

  // Don't show if dismissed today
  if(dismissed === today) return;

  let daysSince = 999;
  if(lastBackup) {
    const diff = new Date(today) - new Date(lastBackup);
    daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // Show reminder if never backed up or 7+ days since last backup
  if(daysSince >= 7) {
    showBackupReminder(lastBackup, daysSince);
  }
}

function showBackupReminder(lastBackup, daysSince) {
  const msg = lastBackup
    ? `It's been <b>${daysSince} days</b> since your last backup (${lastBackup}).`
    : `You haven't exported a backup yet.`;

  const el = document.createElement('div');
  el.id = 'backup-reminder';
  el.innerHTML = `
    <div style="position:fixed;bottom:20px;right:20px;z-index:8888;background:var(--card);border:1px solid var(--orange);border-radius:12px;padding:16px 20px;width:min(340px,90vw);box-shadow:0 4px 24px rgba(0,0,0,.5);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="font-size:22px;">🔔</span>
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:var(--orange);">WEEKLY BACKUP DUE</div>
          <div style="font-size:11px;color:var(--text-dim);">${msg} Export a backup to keep your data safe.</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn" style="flex:1;background:var(--green);color:#000;font-weight:700;font-size:12px;" onclick="exportBackupFromReminder()">⬇️ Export Now</button>
        <button class="btn sec sml" style="font-size:11px;" onclick="dismissBackupReminder()">Later</button>
      </div>
    </div>`;
  document.body.appendChild(el);
}

function exportBackupFromReminder() {
  exportBackup();
  localStorage.setItem('tc26_last_backup', localDateStr(new Date()));
  document.getElementById('backup-reminder')?.remove();
}

function dismissBackupReminder() {
  localStorage.setItem('tc26_backup_dismissed', localDateStr(new Date()));
  document.getElementById('backup-reminder')?.remove();
}

// exportBackup — tracks last backup date in localStorage
function exportBackup(){
  save();
  const payload = {
    version: 6,
    exported: new Date().toISOString(),
    data: D
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = localDateStr(new Date());
  a.download = 'tricoach_backup_' + today + '.json';
  a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem('tc26_last_backup', today);
  document.getElementById('backup-reminder')?.remove();
  showToast('✅ Backup exported! File saved to Downloads.');
}
function saveAndDownload(){ exportBackup(); }
// ===== HISTORY EDIT FUNCTIONS =====
function logPastDayPrompt() {
  // Ask for a date, then open a blank editMorning-style modal to create a new entry
  const existing = document.getElementById('edit-modal-bg');
  if(existing) existing.remove();

  const html = `
    <div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;">
      <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(420px,98vw);">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--green);margin-bottom:16px;">LOG PAST DAY</div>
        <div style="margin-bottom:14px;">
          <label style="font-size:10px;color:var(--text-dim);">Date</label>
          <input type="date" id="lpd-date" max="${localDateStr(new Date())}"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;font-size:13px;margin-top:4px;">
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:16px;">
          After selecting the date, you'll be able to fill in HRV, sleep, RHR and other details. Readiness score will be automatically calculated.
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn sec sml" onclick="closeEditModal()">Cancel</button>
          <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="logPastDayOpen()">Continue →</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  // Default to yesterday if nothing selected
  const dateEl = document.getElementById('lpd-date');
  if(dateEl) {
    const yest = new Date(); yest.setDate(yest.getDate()-1);
    dateEl.value = yest.getFullYear()+'-'+String(yest.getMonth()+1).padStart(2,'0')+'-'+String(yest.getDate()).padStart(2,'0');
  }
}

function logPastDayOpen() {
  const dateEl = document.getElementById('lpd-date');
  if(!dateEl || !dateEl.value) { showToast('Please select a date', true); return; }
  const date = dateEl.value;

  // Check if entry already exists — if so just edit it
  const existingIdx = D.mornings.findIndex(m => m.date === date);
  closeEditModal();
  if(existingIdx >= 0) {
    editMorning(existingIdx);
    return;
  }

  // Create a blank entry for this date and open the edit modal
  const blank = {
    date, hrv:null, hrv7:null, rhr:null, sleepScore:null, sleep:null,
    gstress:null, calIn:null, calOut:null, protein:null, carbs:null,
    legs:null, stress:null, readiness:null, fuel:null, note:'',
    recovery:{}, supplements:null, supplementNote:'',
    status:'green', readinessScore:null, timestamp:Date.now()
  };
  D.mornings.push(blank);
  // Sort mornings by date so it sits in the right place
  D.mornings.sort((a,b) => a.date.localeCompare(b.date));
  const newIdx = D.mornings.findIndex(m => m.date === date);
  editMorning(newIdx);
}

function editMorning(idx) {
  const m = D.mornings[idx];
  if(!m) return;
  const inp = (id, type, val, extra='') => `<input type="${type}" id="${id}" value="${val||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;font-size:12px;" ${extra}>`;
  const scoreRow = (label, field, val) => `<div><label style="font-size:10px;color:var(--text-dim);">${label} (1–5)</label><div style="display:flex;gap:4px;margin-top:4px;">${[1,2,3,4,5].map(n=>`<button type="button" onclick="this.parentElement.querySelectorAll('button').forEach(b=>b.style.background='var(--surface2)');this.style.background='var(--green)';document.getElementById('em-${field}').value=${n}" style="flex:1;padding:4px 0;border:1px solid var(--border);border-radius:5px;background:${val===n?'var(--green)':'var(--surface2)'};color:var(--text);cursor:pointer;font-size:12px;font-weight:600;">${n}</button>`).join('')}</div><input type="hidden" id="em-${field}" value="${val||''}"></div>`;
  const html = `
    <div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;">
      <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(580px,98vw);max-height:92vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--green);">EDIT MORNING CHECK — ${m.date}</div>
          <button class="btn sec sml" onclick="closeEditModal()">✕</button>
        </div>
        <div style="font-size:10px;color:var(--text-dim);font-weight:600;letter-spacing:1px;margin-bottom:8px;">GARMIN METRICS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <div><label style="font-size:10px;color:var(--text-dim);">HRV</label>${inp('em-hrv','number',m.hrv)}</div>
          <div><label style="font-size:10px;color:var(--text-dim);">HRV 7-day avg</label>${inp('em-hrv7','number',m.hrv7)}</div>
          <div><label style="font-size:10px;color:var(--text-dim);">Resting HR (bpm)</label>${inp('em-rhr','number',m.rhr)}</div>
          <div><label style="font-size:10px;color:var(--text-dim);">Sleep Score</label>${inp('em-sleepscore','number',m.sleepScore,'min="0" max="100"')}</div>
          <div><label style="font-size:10px;color:var(--text-dim);">Sleep Hours</label>${inp('em-sleep','number',m.sleep,'step="0.1"')}</div>
          <div><label style="font-size:10px;color:var(--text-dim);">Garmin Stress</label>${inp('em-gstress','number',m.gstress)}</div>
        </div>
        <div style="font-size:10px;color:var(--text-dim);font-weight:600;letter-spacing:1px;margin-bottom:8px;">SUBJECTIVE SCORES</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
          ${scoreRow('Legs Freshness','legs',m.legs)}
          ${scoreRow('Life Stress','stress',m.stress)}
          ${scoreRow('Readiness','readiness',m.readiness)}
        </div>
        <div style="font-size:10px;color:var(--text-dim);font-weight:600;letter-spacing:1px;margin-bottom:8px;">NUTRITION</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <div><label style="font-size:10px;color:var(--text-dim);">Calories In</label>${inp('em-calin','number',m.calIn)}</div>
          <div><label style="font-size:10px;color:var(--text-dim);">Calories Out</label>${inp('em-calout','number',m.calOut)}</div>
          <div><label style="font-size:10px;color:var(--text-dim);">Protein (g)</label>${inp('em-protein','number',m.protein)}</div>
          <div><label style="font-size:10px;color:var(--text-dim);">Carbs (g)</label>${inp('em-carbs','number',m.carbs)}</div>
        </div>
        <div style="margin-bottom:14px;"><label style="font-size:10px;color:var(--text-dim);">Notes / Observations</label><textarea id="em-note" rows="3" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;resize:vertical;font-size:12px;">${m.note||''}</textarea></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn" style="background:var(--red);color:#fff;" onclick="deleteMorning(${idx})">🗑 Delete</button>
          <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="saveMorningEdit(${idx})">💾 Save Changes</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveMorningEdit(idx) {
  const m = D.mornings[idx];
  if(!m) return;
  const getNum = id => parseFloat(document.getElementById(id)?.value) || null;
  m.hrv        = getNum('em-hrv');
  m.hrv7       = getNum('em-hrv7');
  m.rhr        = getNum('em-rhr');
  m.sleepScore = getNum('em-sleepscore');
  m.sleep      = getNum('em-sleep');
  m.gstress    = getNum('em-gstress');
  m.legs       = getNum('em-legs') || m.legs;
  m.stress     = getNum('em-stress') || m.stress;
  m.readiness  = getNum('em-readiness') || m.readiness;
  m.calIn      = getNum('em-calin');
  m.calOut     = getNum('em-calout');
  m.protein    = getNum('em-protein');
  m.carbs      = getNum('em-carbs');
  m.note       = document.getElementById('em-note').value;

  // Recalculate readiness score from the updated values
  if(typeof recalcMorningReadiness === 'function') {
    const recalc = recalcMorningReadiness(m);
    if(recalc) {
      m.readinessScore = recalc.readinessScore;
      m.status = recalc.status;
    }
  }

  // Always close modal and re-render first — never block UI on Supabase
  closeEditModal();
  renderHistory();
  updateDashboard();
  if(typeof renderReadinessChart === 'function') renderReadinessChart();
  showToast('Morning check updated ✓');

  // Then persist — localStorage immediately, Supabase async in background
  localStorage.setItem('tc26v4', JSON.stringify(D));
  if(supa && currentUser){
    clearTimeout(_saveDebounce);
    pushToSupabase().catch(e => console.warn('[TriCoach] Supabase sync error:', e));
  }
}

function deleteMorning(idx) {
  if(!confirm('Delete this morning check entry?')) return;
  D.mornings.splice(idx, 1);
  save();
  closeEditModal();
  renderHistory();
  showToast('Entry deleted');
}

function editCheckin(idx) {
  const c = D.checkins[idx];
  if(!c) return;

  // ── Compute week range (c.date is the "week ending" Sunday) ────
  const weekEnd = c.date;
  const wkStart = getWeekKey(new Date(c.date + 'T12:00:00')); // Monday
  const prevWk  = (()=>{ const d=new Date(wkStart+'T12:00:00'); d.setDate(d.getDate()-7); return getWeekKey(d); })();

  // ── Auto-fill from Garmin morning logs for that week ────────────
  const wkMornings = D.mornings.filter(m => m.date >= wkStart && m.date <= weekEnd);
  const avgF = (arr, key) => {
    const v = arr.filter(m=>m[key]!=null && m[key]>0).map(m=>m[key]);
    return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/v.length * 10)/10 : null;
  };
  const autoHRV        = avgF(wkMornings, 'hrv');
  const autoSleepScore = avgF(wkMornings, 'sleepScore');
  const autoSleepHrs   = avgF(wkMornings, 'sleep');
  const autoGStress    = avgF(wkMornings, 'gstress');

  // ── Auto-fill from Strava for that week ─────────────────────────
  const stravaT = (typeof calcWeekTotalsFromStrava === 'function') ? calcWeekTotalsFromStrava(wkStart) : null;
  const tl      = (typeof calcWeekTrainingLoad   === 'function') ? calcWeekTrainingLoad(wkStart)   : null;
  const autoHours = stravaT && stravaT.totalMin > 0 ? (stravaT.totalMin/60).toFixed(1) : null;

  // ── Week label ───────────────────────────────────────────────────
  const fmtDate = d => new Date(d+'T12:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short'});
  const weekLabel = `${fmtDate(wkStart)} – ${fmtDate(weekEnd)} ${new Date(weekEnd+'T12:00:00').getFullYear()}`;

  // ── UI helpers — NOTE: all IDs prefixed "ecm-" to avoid conflicts ─
  const inpS = (id, type, val, extra='') =>
    `<input type="${type}" id="${id}" value="${val!=null?val:''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;font-size:12px;" ${extra}>`;

  const selS = (id, val, opts) =>
    `<select id="${id}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;font-size:12px;">
      <option value="">Select...</option>
      ${opts.map(o=>`<option value="${o.v}" ${String(val||'')==String(o.v)?'selected':''}>${o.l}</option>`).join('')}
    </select>`;

  const scoreBtns = (id, val) =>
    `<div style="display:flex;gap:4px;margin-top:4px;">
      ${[1,2,3,4,5].map(n=>
        `<button type="button"
          onclick="this.parentElement.querySelectorAll('button').forEach(b=>b.style.background='var(--surface2)');this.style.background='var(--green)';document.getElementById('${id}').value=${n}"
          style="flex:1;padding:4px 0;border:1px solid var(--border);border-radius:5px;background:${(parseInt(val)||0)===n?'var(--green)':'var(--surface2)'};color:var(--text);cursor:pointer;font-size:12px;font-weight:600;">${n}</button>`
      ).join('')}
    </div>
    <input type="hidden" id="${id}" value="${val||''}">`;

  const statPill = (label, val, color) => val != null
    ? `<div style="background:var(--surface2);border-radius:8px;padding:8px 10px;text-align:center;">
        <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;">${label}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${color||'var(--text)'};">${val}</div>
       </div>` : '';

  const html = `
    <div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;">
      <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:14px;padding:24px;width:min(700px,98vw);max-height:94vh;overflow-y:auto;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
          <div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--blue);">EDIT CHECK-IN</div>
            <div style="font-size:13px;color:var(--text-dim);margin-top:2px;">📅 ${weekLabel}</div>
          </div>
          <button class="btn sec sml" onclick="closeEditModal()">✕</button>
        </div>

        <!-- Auto-filled data banner -->
        ${(autoHRV||autoSleepScore||autoHours||tl) ? `
        <div style="background:rgba(33,150,243,.07);border:1px solid rgba(33,150,243,.2);border-radius:10px;padding:14px;margin-bottom:16px;">
          <div style="font-size:9px;color:var(--blue);letter-spacing:1px;font-weight:700;margin-bottom:10px;">⚡ AUTO-FILLED FROM GARMIN + STRAVA (${wkMornings.length} morning logs)</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;">
            ${statPill('HRV Avg', autoHRV, '#2196f3')}
            ${statPill('Sleep Score', autoSleepScore!=null?Math.round(autoSleepScore):null, autoSleepScore>=80?'var(--green)':autoSleepScore>=70?'var(--orange)':'var(--red)')}
            ${statPill('Sleep Hrs', autoSleepHrs!=null?autoSleepHrs+'h':null, '#9575cd')}
            ${statPill('Garmin Stress', autoGStress!=null?Math.round(autoGStress):null, 'var(--orange)')}
            ${statPill('Train Hrs', autoHours?autoHours+'h':null, 'var(--text)')}
            ${tl ? statPill('Load Score', tl.score, tl.color) : ''}
          </div>
          ${stravaT&&stravaT.totalSessions>0?`<div style="margin-top:8px;font-size:10px;color:var(--text-dim);text-align:center;">
            ${stravaT.runSessions?'🏃 '+stravaT.runKm.toFixed(1)+'km':''} ${stravaT.swimSessions?'🏊 '+(stravaT.swimKm*1000).toFixed(0)+'m':''} ${stravaT.bikeSessions?'🚴 '+stravaT.bikeKm.toFixed(0)+'km':''} · ${stravaT.totalSessions} sessions
          </div>`:''}
        </div>` : `<div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:16px;font-size:11px;color:var(--text-dim);text-align:center;">No Garmin/Strava data found for this week (${wkStart} – ${weekEnd})</div>`}

        <!-- Week info row -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div>
            <label style="font-size:10px;color:var(--text-dim);">Week Ending (Sunday)</label>
            <div style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-size:13px;font-weight:600;">${fmtDate(weekEnd)} ${new Date(weekEnd+'T12:00:00').getFullYear()}</div>
            <input type="hidden" id="ecm-date" value="${weekEnd}">
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);">Block / Week</label>
            ${inpS('ecm-block','text',c.block)}
          </div>
        </div>

        <div style="border-top:1px solid var(--border);margin:4px 0 14px;"></div>
        <div style="font-size:10px;color:var(--text-dim);font-weight:700;letter-spacing:1px;margin-bottom:12px;">✏️ YOUR ANSWERS — edit as needed</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div>
            <label style="font-size:10px;color:var(--text-dim);">1. Hard sessions completed at quality?</label>
            ${selS('ecm-q1', c.q1, [{v:'3',l:'✅ All 3 (3pts)'},{v:'2',l:'⚠️ 2 of 3 (2pts)'},{v:'0',l:'❌ 1 or fewer (0pts)'}])}
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);">2. Z2 sessions stayed in zone?</label>
            ${selS('ecm-q2', c.q2, [{v:'2',l:'✅ Stayed in Z2 (2pts)'},{v:'1',l:'⚠️ Mostly (1pt)'},{v:'0',l:'❌ Drifting (0pts)'}])}
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);">3. Training load vs last week?</label>
            ${selS('ecm-q3', c.q3trend, [{v:'improving',l:'📈 Higher / Improved'},{v:'holding',l:'➡️ Held steady'},{v:'declining',l:'📉 Reduced / Lower'}])}
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);">4. Feel going into hard sessions?</label>
            ${selS('ecm-q4', c.q4, [{v:'2',l:'💪 Fresh (2pts)'},{v:'1',l:'😐 Tired but ok (1pt)'},{v:'0',l:'😓 Fatigued (0pts)'}])}
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);">5. Pushed when should have backed off?</label>
            ${selS('ecm-q5', c.q5, [{v:'no',l:'No — listened to body'},{v:'yes',l:'Yes — should have backed off'}])}
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);">6. HRV trend this week?</label>
            ${selS('ecm-q6', c.q6, [{v:'2',l:'📈 Trending up (2pts)'},{v:'1',l:'➡️ Stable (1pt)'},{v:'0',l:'📉 Trending down (0pts)'}])}
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);">7. Sleep quality this week?</label>
            ${selS('ecm-q7', c.q7, [{v:'good',l:'✅ Good 8.5h+ / score 80+ (2pts)'},{v:'ok',l:'⚠️ Hit and miss (1pt)'},{v:'bad',l:'❌ Consistently poor (0pts)'}])}
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);">8. Motivation for next week?</label>
            ${selS('ecm-q8', c.q8, [{v:'1',l:'🔥 Keen (1pt)'},{v:'0',l:'😐 Neutral (0pts)'},{v:'-1',l:'😩 Dreading (-1pt)'}])}
          </div>
        </div>

        <!-- Score buttons for nutrition/recovery/stress -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
          <div>
            <label style="font-size:10px;color:var(--text-dim);">9. Nutrition this week (1–5)</label>
            ${scoreBtns('ecm-nutrition', c.nutrition)}
            <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-top:2px;"><span>Poor</span><span>Nailed it</span></div>
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);">10. Recovery protocol (1–5)</label>
            ${scoreBtns('ecm-recovery', c.recovery_protocol)}
            <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-top:2px;"><span>None</span><span>Perfect</span></div>
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-dim);">11. Life stress (1–5)</label>
            ${scoreBtns('ecm-lifestress', c.lifestress)}
            <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-top:2px;"><span>Very high</span><span>Low/calm</span></div>
          </div>
        </div>

        <div style="margin-bottom:10px;">
          <label style="font-size:10px;color:var(--text-dim);">Next Week Intention</label>
          ${inpS('ecm-intention','text', (c.intention||'').replace(/"/g,'&quot;'))}
        </div>
        <div style="margin-bottom:16px;">
          <label style="font-size:10px;color:var(--text-dim);">Weekly Recap Notes</label>
          <textarea id="ecm-recap" rows="3" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;resize:vertical;font-size:12px;">${c.recap||c.notes||''}</textarea>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn" style="background:var(--red);color:#fff;" onclick="deleteCheckin(${idx})">🗑 Delete</button>
          <button class="btn" style="background:var(--blue);color:#fff;font-weight:700;" onclick="saveCheckinEdit(${idx})">💾 Save Changes</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveCheckinEdit(idx) {
  const c = D.checkins[idx];
  if(!c) return;
  const getV = id => { const el=document.getElementById(id); return el?el.value:''; };
  const getN = id => { const v=parseFloat(getV(id)); return isNaN(v)?null:v; };

  c.block             = getV('ecm-block');
  c.q1                = getV('ecm-q1');
  c.q2                = getV('ecm-q2');
  c.q3trend           = getV('ecm-q3');
  c.q4                = getV('ecm-q4');
  c.q5                = getV('ecm-q5');
  c.q6                = getV('ecm-q6');
  c.q7                = getV('ecm-q7');
  c.q8                = getV('ecm-q8');
  c.nutrition         = getN('ecm-nutrition');
  c.recovery_protocol = getN('ecm-recovery');
  c.lifestress        = getN('ecm-lifestress');
  c.intention         = getV('ecm-intention');
  c.recap             = getV('ecm-recap');

  // Recalculate the scored questions (q1+q2+q4+q6+q8, max 10)
  const q1=parseInt(c.q1)||0, q2=parseInt(c.q2)||0,
        q4=parseInt(c.q4)||0, q6=parseInt(c.q6)||0, q8=parseInt(c.q8)||0;
  c.score = q1+q2+q4+q6+q8;

  // Always close and re-render first
  closeEditModal();
  renderHistory();
  showToast('Check-in updated ✓');

  // Then persist in background
  localStorage.setItem('tc26v4', JSON.stringify(D));
  if(supa && currentUser){
    clearTimeout(_saveDebounce);
    pushToSupabase().catch(e => console.warn('[TriCoach] Supabase sync error:', e));
  }
}

function deleteCheckin(idx) {
  if(!confirm('Delete this weekly check-in?')) return;
  D.checkins.splice(idx, 1);
  save();
  closeEditModal();
  renderHistory();
  showToast('Check-in deleted');
}

function closeEditModal() {
  const el = document.getElementById('edit-modal-bg');
  if(el) el.remove();
}

document.addEventListener('DOMContentLoaded',()=>{
  // Restore persisted Strava activities before auth/render (STRAVA_ACTS is now available)
  try {
    const local = JSON.parse(localStorage.getItem('tc26v4') || 'null');
    if(local && local._stravaActs && Array.isArray(local._stravaActs) && local._stravaActs.length > 0) {
      STRAVA_ACTS.acts = local._stravaActs;
      if(local._stravaPbs) STRAVA_ACTS.pbs = local._stravaPbs;
    }
  } catch(e) {}

  document.getElementById('ci-date').value=localDateStr(new Date());
  checkBackupReminder();
  initAuth();
  updateDashboard();
  applySyncData();
  refreshPlannerFromStrava();
  // Auto-update D.pbs from Strava-detected PBs (runs silently, only updates if better)
  setTimeout(autoUpdatePBsFromStrava, 1200);
  checkSyncServer(); // ping local server — updates button status if running
  // Load fresh Garmin + Strava data from Supabase (overrides static injected data)
  loadGarminFromSupabase();
  loadStravaFromSupabase();
  window.addEventListener('resize',()=>{if(document.getElementById('page-trends').classList.contains('active'))renderChart();});
});
