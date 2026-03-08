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
  readiness:  {label:'Readiness', color:'#00bcd4', unit:'/5'},
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

