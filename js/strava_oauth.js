// ===================================================================
// STRAVA OAUTH — Multi-user integration
// ===================================================================

const STRAVA_CLIENT_ID = '208609';
const STRAVA_REDIRECT_URI = 'https://magicmaniac407.github.io/tricoach';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_URL = 'https://www.strava.com/api/v3';

// ── Initiate OAuth flow ──────────────────────────────────────────
function connectStrava() {
  if (!supa || !currentUser) { showToast('Sign in first', true); return; }
  // Save current user ID in sessionStorage so we can match it on callback
  sessionStorage.setItem('strava_oauth_user', currentUser.id);
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });
  window.location.href = STRAVA_AUTH_URL + '?' + params.toString();
}

// ── Handle OAuth callback (code in URL params) ───────────────────
async function handleStravaCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (error) {
    showToast('Strava connection cancelled', true);
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (!code) return; // No callback params — normal page load

  showToast('Connecting Strava...', false);

  // Wait for Supabase auth session to be ready (up to 5 seconds)
  let waited = 0;
  while ((!supa || !currentUser) && waited < 5000) {
    await new Promise(r => setTimeout(r, 200));
    waited += 200;
    if (supa && !currentUser) {
      const { data: { session } } = await supa.auth.getSession();
      if (session && session.user) currentUser = session.user;
    }
  }

  if (!currentUser) {
    showToast('Strava connection failed: Not signed in', true);
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  try {
    const result = await stravaEdgeCall('exchange_token', { code });
    if (result.ok) {
      // Merge activities returned directly from exchange_token (no second call needed)
      if (result.activities && result.activities.length > 0) {
        mergeStravaActivities(result.activities);
        refreshPlannerFromStrava();
        updateDashboard();
      }
      await loadStravaStatus();
      renderStravaConnection();
      showToast('Strava connected! ' + (result.count || 0) + ' activities imported.');
    } else {
      showToast('Strava connection failed: ' + (result.error || 'Unknown error'), true);
    }
  } catch (e) {
    showToast('Strava error: ' + e.message, true);
  }

  // Clean up URL params
  window.history.replaceState({}, document.title, window.location.pathname);
}

// ── Call Strava Edge Function ────────────────────────────────────
async function stravaEdgeCall(action, extra = {}) {
  if (!supa || !currentUser) return { ok: false, error: 'Not signed in' };
  const session = (await supa.auth.getSession()).data.session;
  if (!session) return { ok: false, error: 'No session' };

  try {
    const resp = await fetch(SUPABASE_URL + '/functions/v1/strava-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ action, ...extra }),
    });
    return await resp.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Load Strava connection status from Supabase ──────────────────
let STRAVA_STATUS = null;

async function loadStravaStatus() {
  if (!supa || !currentUser) return;
  try {
    const { data } = await supa
      .from('athlete_profiles')
      .select('strava_connected, strava_athlete_name, strava_athlete_pic, strava_last_sync')
      .eq('id', currentUser.id)
      .single();
    STRAVA_STATUS = data || null;
  } catch (e) {
    STRAVA_STATUS = null;
  }
}

// ── Sync Strava activities for current user ──────────────────────
async function syncStravaActivities(showFeedback = true) {
  if (!supa || !currentUser) return;
  if (showFeedback) {
    const btn = document.getElementById('strava-sync-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
  }

  const result = await stravaEdgeCall('sync_activities');

  if (result.ok) {
    if (result.activities && result.activities.length > 0) {
      mergeStravaActivities(result.activities);
    }
    await loadStravaStatus();
    renderStravaConnection();
    refreshPlannerFromStrava();
    updateDashboard();
    if (showFeedback) showToast('Strava synced — ' + (result.count || 0) + ' activities');
  } else {
    if (showFeedback) showToast('Strava sync failed: ' + (result.error || 'Unknown'), true);
  }

  if (showFeedback) {
    const btn = document.getElementById('strava-sync-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Sync Now'; }
  }
}

// ── Merge fetched activities into STRAVA_ACTS ────────────────────
function mergeStravaActivities(newActs) {
  if (!newActs || !newActs.length) return;
  const existing = STRAVA_ACTS.acts || [];
  const existingIds = new Set(existing.map(a => a.id).filter(Boolean));
  const existingKeys = new Set(existing.map(a => a.d + '|' + a.n));

  let added = 0;
  const genuinelyNew = [];
  newActs.forEach(act => {
    if (act.id && existingIds.has(act.id)) return;
    if (existingKeys.has(act.d + '|' + act.n)) return;
    existing.push(act);
    genuinelyNew.push(act);
    added++;
  });

  existing.sort((a, b) => a.d.localeCompare(b.d));
  STRAVA_ACTS.acts = existing;

  // Auto-update PBs from genuinely new activities
  if (genuinelyNew.length) {
    autoUpdatePBsFromStrava(genuinelyNew);
    // FIX #2: Auto-update race predictor after every sync
    if(typeof renderRacePredictor === 'function') {
      const predPanel = document.getElementById('pv-predictor');
      if(predPanel && predPanel.style.display !== 'none') renderRacePredictor();
    }
  }
}

// Auto-detect and update PBs from new Strava activities
function autoUpdatePBsFromStrava(acts) {
  if (!acts || !acts.length) return;
  let updated = false;

  acts.forEach(a => {
    // Run distance PBs
    if (a.s === 'Run' && a.dk && a.p) {
      const fmtP = p => { const m=Math.floor(p),s=Math.round((p-m)*60); return m+':'+(s<10?'0':'')+s; };
      const fmtT = mins => { const h=Math.floor(mins/60),m=Math.round(mins%60); return h>0?h+'h'+m+'min':m+'min'; };
      const dist = a.dk;
      const checkDistPB = (minKm, maxKm, label) => {
        if (dist >= minKm && dist <= maxKm) {
          const timeStr = a.mm ? fmtT(a.mm) : fmtP(a.p)+'/km';
          const existing = (D.pbs.run||[]).find(p=>p.n===label);
          // Only flag as candidate — don't auto-overwrite, show toast
          if (!existing || existing.v === '—') {
            if (!D.pbs.run) D.pbs.run = [];
            const idx = D.pbs.run.findIndex(p=>p.n===label);
            if (idx < 0) { D.pbs.run.push({n:label, v:timeStr, note:'Auto-detected '+a.d}); updated = true; }
          }
        }
      };
      checkDistPB(0.35, 0.45, 'Run 400m');
      checkDistPB(0.95, 1.05, 'Run 1km');
      checkDistPB(4.8, 5.3, 'Run 5km');
      checkDistPB(9.8, 10.3, 'Run 10km');
      checkDistPB(21.0, 21.5, 'Run Half Marathon');
      checkDistPB(42.0, 42.5, 'Run Marathon');
    }

    // Bike power PBs (NP or avg watts)
    if ((a.s === 'Bike') && (a.nw || a.w)) {
      const watts = a.nw || a.w;
      if (watts > 0) {
        const durationMin = a.mm || 0;
        const checkBikePB = (minMin, maxMin, label) => {
          if (durationMin >= minMin && durationMin <= maxMin) {
            const existing = (D.pbs.bike||[]).find(p=>p.n===label);
            const newVal = Math.round(watts)+'W';
            if (!existing) {
              if (!D.pbs.bike) D.pbs.bike = [];
              D.pbs.bike.push({n:label, v:newVal, note:'Auto '+a.d}); updated = true;
            }
          }
        };
        checkBikePB(55, 70, '1 hr power');
        checkBikePB(28, 35, '30 min power');
        checkBikePB(18, 25, '20 min power');
        checkBikePB(9, 12, '10 min power');
      }
    }

    // Swim PBs
    if (a.s === 'Swim' && a.dk && a.sp) {
      const fmtP = p => { const m=Math.floor(p),s=Math.round((p-m)*60); return m+':'+(s<10?'0':'')+s; };
      const metres = a.dk * 1000;
      const checkSwimPB = (minM, maxM, label) => {
        if (metres >= minM && metres <= maxM) {
          const existing = (D.pbs.swim||[]).find(p=>p.n===label);
          if (!existing) {
            if (!D.pbs.swim) D.pbs.swim = [];
            D.pbs.swim.push({n:label, v:fmtP(a.sp)+'/100m', note:'Auto '+a.d}); updated = true;
          }
        }
      };
      checkSwimPB(480, 520, 'Swim 500m');
      checkSwimPB(980, 1020, 'Swim 1000m');
      checkSwimPB(1480, 1520, 'Swim 1500m');
    }
  });

  if (updated) {
    save();
    showToast('🏅 New PB candidates detected — check PBs tab to review!');
  }
}

// ── Disconnect Strava ────────────────────────────────────────────
async function disconnectStrava() {
  if (!confirm('Disconnect Strava? Your imported activities will be kept but auto-sync will stop.')) return;
  const result = await stravaEdgeCall('disconnect');
  if (result.ok) {
    STRAVA_STATUS = null;
    renderStravaConnection();
    showToast('Strava disconnected');
  } else {
    showToast('Failed to disconnect: ' + (result.error || 'Unknown'), true);
  }
}

// ── Garmin Connection Status & Render ────────────────────────────
let GARMIN_STATUS = null;
let GARMIN_CLOUD = null;

async function loadGarminStatus() {
  if (!supa || !currentUser) return;
  try {
    const { data } = await supa
      .from('garmin_credentials')
      .select('id, connected_at, last_sync_at')
      .eq('user_id', currentUser.id)
      .single();
    GARMIN_STATUS = data || null;

    // Also load latest garmin data for the cloud sync timestamp
    const { data: gd } = await supa
      .from('garmin_data')
      .select('synced_at, hrv, hrv7, sleep_score, sleep_hrs, rhr, stress, body_battery')
      .eq('user_id', currentUser.id)
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();
    if (gd) {
      GARMIN_CLOUD = {
        synced_at: gd.synced_at,
        hrv: gd.hrv, hrv7: gd.hrv7,
        sleepScore: gd.sleep_score, sleepHrs: gd.sleep_hrs,
        rhr: gd.rhr, yesterdayStress: gd.stress, bodyBattery: gd.body_battery
      };
    }
  } catch(e) {
    GARMIN_STATUS = null;
    GARMIN_CLOUD = null;
  }
}

function getGarminData() {
  // Priority: cloud data (from Supabase garmin_data), then hardcoded GARMIN_TODAY
  if (GARMIN_CLOUD && GARMIN_CLOUD.hrv) return GARMIN_CLOUD;
  return (typeof GARMIN_TODAY !== 'undefined') ? GARMIN_TODAY : null;
}

function renderGarminConnection() {
  const el = document.getElementById('garmin-connection-card');
  if (!el) return;

  if (!supa || !currentUser) {
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">Sign in to connect Garmin.</div>`;
    return;
  }

  const connected = GARMIN_STATUS && GARMIN_STATUS.id;
  const lastSync = GARMIN_STATUS?.last_sync_at
    ? (() => {
        const d = new Date(GARMIN_STATUS.last_sync_at);
        const minsAgo = Math.round((Date.now() - d) / 60000);
        return minsAgo < 60 ? minsAgo + 'min ago' : Math.round(minsAgo/60) + 'hrs ago';
      })()
    : null;

  if (connected) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:40px;height:40px;background:#1565c0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">⌚</div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:14px;color:#64b5f6;">Garmin Connected</div>
          <div style="font-size:11px;color:var(--text-dim);">${lastSync ? 'Last synced ' + lastSync : 'Never synced — run python3 sync.py'}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;padding:10px;background:var(--surface2);border-radius:8px;">
        ⚠️ <b>Garmin Developer API pending approval</b> (applied 8 Mar 2026). Until approved, use the manual sync script:<br>
        <code style="font-size:10px;color:var(--green);">python3 sync.py</code> from your project folder.
      </div>
      <button class="btn sec sml" style="color:var(--red);border-color:rgba(244,67,54,.3);" onclick="disconnectGarmin()">Disconnect Garmin</button>`;
  } else {
    el.innerHTML = `
      <div style="text-align:center;padding:16px 0;">
        <div style="font-size:32px;margin-bottom:8px;">⌚</div>
        <div style="font-size:13px;color:var(--text);margin-bottom:4px;">Connect your Garmin account</div>
        <div style="font-size:11px;color:var(--text-dim);line-height:1.5;margin-bottom:16px;max-width:300px;margin-left:auto;margin-right:auto;">
          Auto-pulls HRV, sleep, stress and body battery daily.<br>
          <b style="color:var(--orange);">⚠️ Garmin API approval pending</b> — enter credentials below to save them for when it's approved.
        </div>
        <div style="text-align:left;max-width:320px;margin:0 auto;">
          <div style="margin-bottom:8px;"><label style="font-size:10px;color:var(--text-dim);">Garmin Email</label>
            <input type="email" id="garmin-email" placeholder="your@email.com" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;box-sizing:border-box;">
          </div>
          <div style="margin-bottom:14px;"><label style="font-size:10px;color:var(--text-dim);">Garmin Password</label>
            <input type="password" id="garmin-pass" placeholder="••••••••" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;box-sizing:border-box;">
          </div>
          <button class="btn" onclick="saveGarminCredentials()" style="width:100%;background:#1565c0;color:#fff;font-weight:700;">⌚ Save Garmin Credentials</button>
        </div>
      </div>`;
  }
}

async function saveGarminCredentials() {
  if (!supa || !currentUser) { showToast('Sign in first', true); return; }
  const email = document.getElementById('garmin-email')?.value?.trim();
  const pass  = document.getElementById('garmin-pass')?.value;
  if (!email || !pass) { showToast('Enter both email and password', true); return; }

  try {
    const session = (await supa.auth.getSession()).data.session;
    const resp = await fetch(SUPABASE_URL + '/functions/v1/garmin-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ action: 'save_credentials', email, password: pass }),
    });
    const result = await resp.json();
    if (result.ok) {
      showToast('✅ Garmin credentials saved — will auto-sync when API is approved');
      await loadGarminStatus();
      renderGarminConnection();
    } else {
      showToast('Failed: ' + (result.error || 'Unknown error'), true);
    }
  } catch(e) {
    showToast('Error: ' + e.message, true);
  }
}

async function disconnectGarmin() {
  if (!confirm('Disconnect Garmin? Credentials will be removed.')) return;
  try {
    const session = (await supa.auth.getSession()).data.session;
    await fetch(SUPABASE_URL + '/functions/v1/garmin-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token, 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ action: 'disconnect' }),
    });
    GARMIN_STATUS = null;
    renderGarminConnection();
    showToast('Garmin disconnected');
  } catch(e) {
    showToast('Error: ' + e.message, true);
  }
}

// ── Render Strava connection card ────────────────────────────────
function renderStravaConnection() {
  const el = document.getElementById('strava-connection-card');
  if (!el) return;

  if (!supa || !currentUser) {
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">Sign in to connect Strava.</div>`;
    return;
  }

  const connected = STRAVA_STATUS && STRAVA_STATUS.strava_connected;

  if (connected) {
    const lastSync = STRAVA_STATUS.strava_last_sync
      ? (() => {
          const d = new Date(STRAVA_STATUS.strava_last_sync);
          const minsAgo = Math.round((Date.now() - d) / 60000);
          return minsAgo < 60 ? minsAgo + 'min ago' : Math.round(minsAgo / 60) + 'hrs ago';
        })()
      : 'Never';

    const name = STRAVA_STATUS.strava_athlete_name || 'Connected';
    const pic = STRAVA_STATUS.strava_athlete_pic;
    const avatar = pic
      ? `<img src="${pic}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">`
      : `<div style="width:40px;height:40px;background:#fc4c02;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">&#x1F3C3;</div>`;

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        ${avatar}
        <div style="flex:1;">
          <div style="font-weight:600;font-size:14px;color:#fc4c02;">Strava Connected</div>
          <div style="font-size:11px;color:var(--text-dim);">${name}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;">
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text);">Last synced ${lastSync}</div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:2px;">LAST SYNC</div>
        </div>
        <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;">
          <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--green);">OK</div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:2px;">STATUS</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">Auto-syncs when you open the app. Fetches last 30 days of activities.</div>
      <div style="display:flex;gap:8px;">
        <button class="btn" id="strava-sync-btn" onclick="syncStravaActivities()" style="flex:1;background:#fc4c02;color:#fff;font-weight:700;">&#x1F504; Sync Now</button>
        <button class="btn sec" onclick="disconnectStrava()" style="color:var(--red);border-color:rgba(244,67,54,.3);">Disconnect</button>
      </div>`;
  } else {
    el.innerHTML = `
      <div style="text-align:center;padding:16px 0;">
        <div style="font-size:32px;margin-bottom:8px;">&#x1F3C3;</div>
        <div style="font-size:13px;color:var(--text);margin-bottom:4px;">Connect your Strava account</div>
        <div style="font-size:11px;color:var(--text-dim);line-height:1.5;margin-bottom:16px;max-width:280px;margin-left:auto;margin-right:auto;">
          Auto-import your runs, rides and swims. Activities appear in your planner automatically.
        </div>
        <button class="btn" onclick="connectStrava()" style="background:#fc4c02;color:#fff;font-weight:700;padding:10px 24px;">
          &#x1F3C3; Connect Strava
        </button>
      </div>`;
  }
}
