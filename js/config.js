// ===================================================================
// SUPABASE CONFIG — fill in your two values below, then save & reload
// Get these from: Supabase Dashboard → Settings → General (Project URL)
//                                    → Settings → API Keys (Publishable key)
// ===================================================================
const SUPABASE_URL  = 'https://vhdzkmjfivfuverqhxip.supabase.co';
const SUPABASE_ANON = 'sb_publishable_A14st8S-OPSBBOZ8SzQshQ_D56nk0nz';

// ── Supabase client (null if not configured yet) ─────────────────
const supa = (SUPABASE_URL && SUPABASE_ANON)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

let currentUser = null; // set after auth

// ── Auth helpers ─────────────────────────────────────────────────
async function initAuth() {
  if(!supa) {
    // No Supabase configured — run in local-only mode
    showApp();
    return;
  }
  const { data: { session } } = await supa.auth.getSession();
  if(session?.user) {
    currentUser = session.user;
    await loadFromSupabase();
    showApp();
  } else {
    showAuthScreen();
  }
  // Listen for auth changes (e.g. logout from another tab)
  supa.auth.onAuthStateChange(async (event, session) => {
    if(event === 'SIGNED_IN') {
      currentUser = session.user;
      await loadFromSupabase();
      showApp();
    } else if(event === 'SIGNED_OUT') {
      currentUser = null;
      showAuthScreen();
    }
  });
}

async function authSignUp(email, password, displayName) {
  if(!supa) return;
  const { data, error } = await supa.auth.signUp({ email, password });
  if(error) { showAuthError(error.message); return; }
  // Create athlete profile
  if(data.user) {
    await supa.from('athlete_profiles').upsert({
      id: data.user.id,
      display_name: displayName || email.split('@')[0],
      share_enabled: false
    });
  }
  showAuthMsg('Check your email to confirm your account, then sign in.');
}

async function authSignIn(email, password) {
  if(!supa) return;
  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  if(error) { showAuthError(error.message); return; }
}

async function authSignOut() {
  if(!supa) return;
  await save(); // flush before signing out
  await supa.auth.signOut();
  D = JSON.parse(JSON.stringify(DEFAULT_DATA));
}

// ── Cloud sync ────────────────────────────────────────────────────
async function loadFromSupabase() {
  if(!supa || !currentUser) return;
  const { data, error } = await supa.from('user_data').select('data').eq('id', currentUser.id).single();
  if(error && error.code !== 'PGRST116') { // PGRST116 = not found (first login)
    console.warn('[TriCoach] Load error:', error.message);
    return;
  }
  if(data?.data && Object.keys(data.data).length > 0) {
    D = data.data;
    // Run migrations on loaded data
    if(!D.foods) D.foods = [];
    if(!D.foodlog) D.foodlog = {};
    if(!D.mealTemplates) D.mealTemplates = [];
    if(!D.nutGoals) D.nutGoals = {};
    // Restore Strava activities from saved data
    if(D._stravaActs && Array.isArray(D._stravaActs)) {
      STRAVA_ACTS.acts = D._stravaActs;
    }
    if(D._stravaPbs) {
      STRAVA_ACTS.pbs = D._stravaPbs;
    }
    // Also cache locally
    localStorage.setItem('tc26v4', JSON.stringify(D));
  } else {
    // First login — try to migrate any existing local data
    const local = localStorage.getItem('tc26v4');
    if(local) {
      D = JSON.parse(local);
      if(D._stravaActs && Array.isArray(D._stravaActs)) {
        STRAVA_ACTS.acts = D._stravaActs;
      }
      await pushToSupabase(); // upload local data to cloud
      showToast('Local data migrated to your cloud account ✓');
    }
  }
}

async function pushToSupabase() {
  if(!supa || !currentUser) return;
  const { error } = await supa.from('user_data').upsert({
    id: currentUser.id,
    data: D,
    updated_at: new Date().toISOString()
  });
  if(error) console.warn('[TriCoach] Save error:', error.message);
  // Update public summary for athlete sharing
  await updateAthleteSummary();
}

async function updateAthleteSummary() {
  if(!supa || !currentUser) return;
  try {
    // Build a lightweight public summary (no PII, just training data)
    const recentMornings = (D.mornings || []).slice(-7);
    const lastCheckin = (D.checkins || []).slice(-1)[0] || null;
    const summary = {
      lastUpdated: new Date().toISOString(),
      recentReadiness: recentMornings.map(m => ({date: m.date, readiness: m.readiness, hrv: m.hrv})),
      lastCheckin: lastCheckin ? {date: lastCheckin.date, score: lastCheckin.score} : null,
    };
    await supa.from('athlete_profiles').update({ summary }).eq('id', currentUser.id);
  } catch(e) {}
}

// ── Modified save() — writes localStorage + Supabase ─────────────
let _saveDebounce = null;
// ===== CONSTANTS =====
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const METRIC_CONFIG = {
  hrv:        {label:'HRV Overnight', color:'#2196f3', unit:''},
  hrv7:       {label:'HRV 7-Day Avg', color:'#64b5f6', unit:''},
  rhr:        {label:'Resting HR', color:'#f44336', unit:'bpm', invert:true},
  sleepScore: {label:'Sleep Score', color:'#ce93d8', unit:'/100'},
  sleepHrs:   {label:'Sleep Hours', color:'#9575cd', unit:'h'},
  gstress:    {label:'Garmin Stress', color:'#ff9800', unit:'', invert:true},
  stress:     {label:'Subj. Stress', color:'#ffb74d', unit:'/5', invert:true},
  legs:       {label:'Leg Freshness', color:'#00e676', unit:'/5'},
  readiness:      {label:'Readiness', color:'#00bcd4', unit:'/5'},
  readinessScore: {label:'Readiness Score', color:'#00e5ff', unit:'/100'},
  calIn:      {label:'Calories Eaten', color:'#ffd54f', unit:'kcal'},
  calOut:     {label:'Calories Burnt', color:'#ff8a65', unit:'kcal'},
  protein:    {label:'Protein', color:'#a5d6a7', unit:'g'},
  sessionQuality:{label:'Session Quality', color:'#69f0ae', unit:'/5'},
  trainingLoad:{label:'Training Load', color:'#80cbc4', unit:'hrs'},
  massage:    {label:'Massage Gun', color:'#f48fb1', unit:'', binary:true},
  foam:       {label:'Foam Roll', color:'#ef9a9a', unit:'', binary:true},
  stretch:    {label:'Stretched', color:'#ffe082', unit:'', binary:true},
  ice:        {label:'Ice Bath', color:'#80deea', unit:'', binary:true},
  compression:{label:'Compression', color:'#b39ddb', unit:'', binary:true},
  nap:        {label:'Nap', color:'#a5d6a7', unit:'', binary:true},
  noRecovery: {label:'No Recovery ❌', color:'#f44336', unit:'', binary:true, invert:true},
  supplements:{label:'Supplements 💊', color:'#00e676', unit:'', binary:true},
};

// ===== STATE =====
// ── V6: Code in file. Data in localStorage. Updates never touch your data. ──
// (EMBEDDED_DATA removed — no longer used)
const DEFAULT_DATA = {"mornings":[],"checkins":[],"pbs":{"swim":[{"n":"Swim 500m","v":"1:43/100m","note":"8:35 for 500m"},{"n":"Swim 1000m","v":"1:56/100m","note":"19:20 for 1000m"},{"n":"Swim 1500m","v":"1:58/100m","note":"29:29 for 1500m"},{"n":"Swim 2000m","v":"1:59/100m","note":"~39:40 for 2000m"},{"n":"Swim 3000m+","v":"2:01/100m","note":"~60:30 for 3000m+"},{"n":"CSS (threshold)","v":"~1:44/100m","note":"4x500m Feb 2026 rep pace est."}],"bike":[{"n":"5 sec power","v":"790W","note":"Strava all-time best effort"},{"n":"15 sec power","v":"732W","note":"Strava all-time best effort"},{"n":"30 sec power","v":"622W","note":"Strava all-time best effort"},{"n":"1 min power","v":"395W","note":"Strava all-time best effort"},{"n":"2 min power","v":"321W","note":"Strava all-time best effort"},{"n":"5 min power","v":"288W","note":"Strava all-time best effort"},{"n":"10 min power","v":"283W","note":"Strava all-time best effort"},{"n":"20 min power","v":"248W","note":"Strava all-time best effort"},{"n":"30 min power","v":"246W","note":"Strava all-time best effort"},{"n":"45 min power","v":"244W","note":"Strava all-time best effort"},{"n":"1 hr power","v":"232W","note":"Strava all-time best effort"},{"n":"FTP (estimated)","v":"~230W","note":"Est. from 1hr power 232W \u00b7 use 95% of 20min"},{"n":"Best HIM Bike Split","v":"2:28","note":"Port Macquarie"}],"run":[{"n":"Run 400m","v":"1:23","note":"3:27/km \u00b7 from Strava all-time PRs"},{"n":"Run 1km","v":"3:44","note":"3:44/km \u00b7 from Strava all-time PRs"},{"n":"Run 1 mile","v":"6:24","note":"3:58/km \u00b7 from Strava all-time PRs"},{"n":"Run 5km","v":"22:09","note":"4:25/km \u00b7 from Strava all-time PRs"},{"n":"Run 10km","v":"46:00","note":"4:36/km \u00b7 from Strava all-time PRs"},{"n":"Run 15km","v":"1:10:11","note":"4:40/km \u00b7 from Strava all-time PRs"},{"n":"Run Half Marathon","v":"1:39:46","note":"4:43/km \u00b7 from Strava all-time PRs"},{"n":"Run Marathon","v":"5:14:16","note":"7:26/km \u00b7 from Strava all-time PRs"},{"n":"LTHR","v":"181bpm @ 4:31/km","note":"Garmin estimate"}],"tri":[{"n":"HIM Best Bike Split","v":"2:28","note":"Port Macquarie"},{"n":"HIM Best Run Split","v":"\u2014","note":"Enter manually"},{"n":"HIM Best Swim Split","v":"\u2014","note":"Enter manually"},{"n":"HIM Overall","v":"\u2014","note":"Enter manually"}],"phys":[{"n":"LTHR","v":"181bpm","note":"Garmin estimate @ 4:31/km"},{"n":"FTP","v":"~230W","note":"Est. from 1hr power (232W)"},{"n":"CSS","v":"~1:44/100m","note":"4x500m rep pace Feb 2026"},{"n":"Weight","v":"79kg","note":"Current"}]},"plans":{},"foods":[],"foodlog":{}};
let D = JSON.parse(localStorage.getItem('tc26v4') || 'null') || JSON.parse(JSON.stringify(DEFAULT_DATA));

// Migrate PBs if old schema detected (missing swim distances)
if(!D.pbs.bike || !D.pbs.bike.some(p=>p.n&&p.n.includes('5 sec'))) {
  D.pbs = JSON.parse(JSON.stringify(DEFAULT_DATA.pbs));
  save();
}
if(!D.foods) D.foods = [];
if(!D.foodlog) D.foodlog = {};
if(!D.mealTemplates) D.mealTemplates = [];
if(!D.nutGoals) D.nutGoals = {};
// Deduplicate mornings on load — keep latest entry per date
(function dedupeHistory(){
  const sorted=[...(D.mornings||[])].sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
  const seen={};
  sorted.forEach(m=>{if(m.date)seen[m.date]=m;});
  const deduped=Object.values(seen).sort((a,b)=>a.date.localeCompare(b.date));
  if(deduped.length!==sorted.length){D.mornings=deduped;save();}
})();
let scores = {legs:0,stress:0,readiness:0,fuel:null};
let ciScores = {nutrition:0,lifestress:0,recovery_protocol:0};
let recoveryChecks = {massage:false,foam:false,stretch:false,ice:false,compression:false,nap:false,none:false};
let selectedMetrics = [];
let chartMode = 'daily';
// ===== WEEK HELPERS (needed for state init) =====
function localDateStr(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function getWeekKey(date){
  const d=new Date(date),day=d.getDay(),diff=d.getDate()-day+(day===0?-6:1);
  return localDateStr(new Date(d.setDate(diff)));
}
let currentWeekKey = getWeekKey(new Date());
let chartInstance = null;

function save(){
  // Persist Strava activities in D so they survive page reloads
  if(typeof STRAVA_ACTS !== 'undefined' && STRAVA_ACTS.acts && STRAVA_ACTS.acts.length > 0) {
    D._stravaActs = STRAVA_ACTS.acts;
  }
  if(typeof STRAVA_ACTS !== 'undefined' && STRAVA_ACTS.pbs && Object.keys(STRAVA_ACTS.pbs).length > 0) {
    D._stravaPbs = STRAVA_ACTS.pbs;
  }
  localStorage.setItem('tc26v4', JSON.stringify(D));
  // Debounce cloud sync — waits 2s after last save to avoid hammering API
  if(supa && currentUser) {
    clearTimeout(_saveDebounce);
    _saveDebounce = setTimeout(pushToSupabase, 2000);
  }
}

// ===== AUTO-UPDATE D.pbs FROM STRAVA_ACTS.pbs =====
// Runs on every page load. Compares Strava-detected PBs against manually
// stored PBs and updates D.pbs wherever Strava found a better value.
// NEVER downgrades a PB — only updates if Strava detects something better.
function autoUpdatePBsFromStrava() {
  const sp = STRAVA_ACTS?.pbs;
  if(!sp || !Object.keys(sp).length) return;

  const updates = [];

  // ── Helper: parse watts from string like "234W" or "~230W" ──
  const parseW = (v) => { if(!v) return null; const m = String(v).match(/(\d+)/); return m ? parseInt(m[1]) : null; };
  // ── Helper: parse pace min/km from string like "4:20" ──
  const parsePace = (v) => { if(!v) return null; const m = String(v).match(/(\d+):(\d{2})/); return m ? parseInt(m[1]) + parseInt(m[2])/60 : null; };
  // ── Helper: parse total time in minutes from "46:00" or "1:39:46" ──
  const parseTime = (v) => {
    if(!v) return null;
    const parts = String(v).split(':').map(Number);
    if(parts.length === 3) return parts[0]*60 + parts[1] + parts[2]/60;
    if(parts.length === 2) return parts[0] + parts[1]/60;
    return null;
  };

  // ── 1. RUN DISTANCE PBs ────────────────────────────────────────
  const runPbMap = {
    'Run 5km':           'Run 5km',
    'Run 10km':          'Run 10km',
    'Run 15km':          'Run 15km',
    'Run Half Marathon': 'Run Half Marathon',
    'Run Marathon':      'Run Marathon',
  };
  Object.entries(runPbMap).forEach(([stravaKey, pbName]) => {
    const detected = sp[stravaKey];
    if(!detected?.v || !detected?.date) return;
    const stored = D.pbs?.run?.find(p => p.n === pbName);
    const detectedTime = parseTime(detected.v);
    const storedTime = stored ? parseTime(stored.v) : null;
    // Only update if Strava found a faster time than what's stored
    if(detectedTime && (!storedTime || detectedTime < storedTime)) {
      if(stored) {
        stored.v = detected.v;
        stored.note = detected.note;
      } else if(D.pbs?.run) {
        D.pbs.run.push({ n: pbName, v: detected.v, note: detected.note });
      }
      updates.push(`🏃 ${pbName}: ${detected.v}`);
    }
  });

  // ── 2. BIKE POWER PBs ──────────────────────────────────────────
  const bikePbMap = {
    'Bike 20min Power': '20 min power',
    'Bike 45min Power': '45 min power',
    'Bike 60min Power': '1 hr power',
    'Bike 90min Power': '90 min power',
  };
  Object.entries(bikePbMap).forEach(([stravaKey, pbName]) => {
    const detected = sp[stravaKey];
    if(!detected?.watts) return;
    const stored = D.pbs?.bike?.find(p => p.n?.toLowerCase().includes(pbName.split(' ')[0].toLowerCase()) && p.n?.toLowerCase().includes(pbName.split(' ')[1]?.toLowerCase()));
    const storedW = stored ? parseW(stored.v) : null;
    if(!storedW || detected.watts > storedW) {
      if(stored) {
        stored.v = detected.v;
        stored.note = detected.note;
      }
      updates.push(`🚴 ${pbName}: ${detected.v}`);
    }
  });

  // ── 3. FTP — update both phys FTP and bike FTP entry ──────────
  // Check 1hr power PB and FTP estimate, use whichever is higher
  const hr1 = D.pbs?.bike?.find(p => p.n?.toLowerCase().includes('1 hr'));
  const hr1W = hr1 ? parseW(hr1.v) : null;
  const detected60 = sp['Bike 60min Power'];
  const detectedFTP = sp['Bike FTP Estimate'];

  // Best FTP from all sources
  const candidates = [
    hr1W,
    detected60?.watts,
    detectedFTP?.watts,
  ].filter(Boolean);
  const bestFTP = candidates.length ? Math.max(...candidates) : null;

  if(bestFTP) {
    // Update phys FTP entry
    const physFtp = D.pbs?.phys?.find(p => p.n?.toLowerCase() === 'ftp');
    const physFtpW = physFtp ? parseW(physFtp.v) : null;
    if(physFtp && (!physFtpW || bestFTP > physFtpW)) {
      physFtp.v = `${bestFTP}W`;
      physFtp.note = detectedFTP?.note || `Auto from Strava activities`;
      updates.push(`💪 FTP: ${bestFTP}W`);
    }
    // Update bike FTP entry
    const bikeFtp = D.pbs?.bike?.find(p => p.n?.toLowerCase().includes('ftp'));
    const bikeFtpW = bikeFtp ? parseW(bikeFtp.v) : null;
    if(bikeFtp && (!bikeFtpW || bestFTP > bikeFtpW)) {
      bikeFtp.v = `${bestFTP}W`;
      bikeFtp.note = detectedFTP?.note || `Auto from Strava activities`;
    }
  }

  // ── 4. SWIM CSS ────────────────────────────────────────────────
  const detectedCSS = sp['Swim CSS'];
  if(detectedCSS?.pace) {
    const physCSS = D.pbs?.phys?.find(p => p.n?.toLowerCase() === 'css');
    const storedCSSpace = physCSS ? parsePace((physCSS.v||'').replace('~','').replace('/100m','')) : null;
    if(!storedCSSpace || detectedCSS.pace < storedCSSpace) {
      if(physCSS) {
        physCSS.v = detectedCSS.v;
        physCSS.note = detectedCSS.note;
        updates.push(`🏊 CSS: ${detectedCSS.v}`);
      }
      // Also update swim CSS PB
      const swimCSS = D.pbs?.swim?.find(p => p.n?.toLowerCase().includes('css'));
      if(swimCSS) { swimCSS.v = detectedCSS.v; swimCSS.note = detectedCSS.note; }
    }
  }

  if(updates.length > 0) {
    save();
    setTimeout(() => {
      showToast(`🏆 ${updates.length} new auto PB${updates.length>1?'s':''} detected from Strava! ${updates[0]}`, false, 5000);
      if(typeof renderPBs === 'function') renderPBs();
    }, 1500);
    console.log('[TriCoach] Auto PBs updated:', updates);
  }
}
