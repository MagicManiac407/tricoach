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
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (!code) return; // No callback params — normal page load

  // Show connecting state
  showToast('Connecting Strava...', false);

  try {
    // Exchange code for tokens via Supabase Edge Function
    const result = await stravaEdgeCall('exchange_token', { code });

    if (result.ok) {
      showToast('✅ Strava connected!');
      await loadStravaStatus();
      renderStravaConnection();
      // Trigger initial activity sync
      await syncStravaActivities();
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
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Syncing...'; }
  }

  const result = await stravaEdgeCall('sync_activities');

  if (result.ok) {
    // Merge new activities into STRAVA_ACTS
    if (result.activities && result.activities.length > 0) {
      mergeStravaActivities(result.activities);
    }
    // Update last sync time in status
    await loadStravaStatus();
    renderStravaConnection();
    refreshPlannerFromStrava();
    updateDashboard();
    if (showFeedback) showToast('✅ Strava synced — ' + (result.count || 0) + ' activities');
  } else {
    if (showFeedback) showToast('Strava sync failed: ' + (result.error || 'Unknown'), true);
  }

  if (showFeedback) {
    const btn = document.getElementById('strava-sync-btn');
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Sync Now'; }
  }
}

// ── Merge fetched activities into STRAVA_ACTS ────────────────────
function mergeStravaActivities(newActs) {
  if (!newActs || !newActs.length) return;
  const existing = STRAVA_ACTS.acts || [];
  const existingIds = new Set(existing.map(a => a.id).filter(Boolean));
  const existingKeys = new Set(existing.map(a => a.d + '|' + a.n));

  let added = 0;
  newActs.forEach(act => {
    if (act.id && existingIds.has(act.id)) return;
    if (existingKeys.has(act.d + '|' + act.n)) return;
    existing.push(act);
    added++;
  });

  // Sort by date
  existing.sort((a, b) => a.d.localeCompare(b.d));
  STRAVA_ACTS.acts = existing;
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

// ── Render Strava connection card ────────────────────────────────
function renderStravaConnection() {
  const el = document.getElementById('strava-connection-card');
  if (!el) return;

  if (!supa || !currentUser) {
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">Sign in to connect Strava.</div>`;
    return;
  }

  const connected = STRAVA_STATUS?.strava_connected;

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
      : `<div style="width:40px;height:40px;background:#fc4c02;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">🏃</div>`;

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
          <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--green);">✅ OK</div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:2px;">STATUS</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">Auto-syncs when you open the app. Fetches last 30 days of activities.</div>
      <div style="display:flex;gap:8px;">
        <button class="btn" id="strava-sync-btn" onclick="syncStravaActivities()" style="flex:1;background:#fc4c02;color:#fff;font-weight:700;">🔄 Sync Now</button>
        <button class="btn sec" onclick="disconnectStrava()" style="color:var(--red);border-color:rgba(244,67,54,.3);">Disconnect</button>
      </div>`;
  } else {
    el.innerHTML = `
      <div style="text-align:center;padding:16px 0;">
        <div style="font-size:32px;margin-bottom:8px;">🏃</div>
        <div style="font-size:13px;color:var(--text);margin-bottom:4px;">Connect your Strava account</div>
        <div style="font-size:11px;color:var(--text-dim);line-height:1.5;margin-bottom:16px;max-width:280px;margin-left:auto;margin-right:auto;">
          Auto-import your runs, rides and swims. Activities appear in your planner automatically.
        </div>
        <button class="btn" onclick="connectStrava()" style="background:#fc4c02;color:#fff;font-weight:700;padding:10px 24px;">
          🏃 Connect Strava
        </button>
      </div>`;
  }
}
