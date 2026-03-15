// ===== BACKUP / RESTORE =====
// exportBackup and saveAndDownload defined below near the backup reminder system.

function importBackup(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target.result);
        const imported = raw.data || raw;
        if(!imported.mornings && !imported.pbs && !imported.checkins){
          showToast('❌ Invalid backup file — unrecognised format', true);
          return;
        }
        if(!confirm('Import backup from ' + (raw.exported ? raw.exported.slice(0,10) : 'unknown date') + '?\nThis will REPLACE all current data. Are you sure?')) return;
        D = imported;
        if(!D.foods) D.foods = [];
        if(!D.foodlog) D.foodlog = {};
        if(!D.mealTemplates) D.mealTemplates = [];
        if(!D.nutGoals) D.nutGoals = {};
        save();
        showToast('✅ Backup imported successfully — reloading…');
        setTimeout(()=>location.reload(), 1200);
      } catch(err){
        showToast('❌ Failed to read backup file: ' + err.message, true);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ===== WEEK HELPERS =====
function localDateStr(d){
  // Format a Date as YYYY-MM-DD using LOCAL date (not UTC via toISOString)
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function getWeekKey(date){
  const d=new Date(date),day=d.getDay(),diff=d.getDate()-day+(day===0?-6:1);
  return localDateStr(new Date(d.setDate(diff)));
}
function weekLabel(key){
  const s=new Date(key),e=new Date(key);e.setDate(e.getDate()+6);
  const o={month:'short',day:'numeric'};
  return `${s.toLocaleDateString('en-AU',o)} — ${e.toLocaleDateString('en-AU',o)}`;
}
function prevWeek(){const d=new Date(currentWeekKey);d.setDate(d.getDate()-7);currentWeekKey=getWeekKey(d);renderPlanner();}
function nextWeek(){const d=new Date(currentWeekKey);d.setDate(d.getDate()+7);currentWeekKey=getWeekKey(d);renderPlanner();}
function thisWeek(){currentWeekKey=getWeekKey(new Date());renderPlanner();}

// ===== NAV =====
function nav(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.mob-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  const map={dashboard:0,planner:1,morning:2,trends:3,checkin:4,history:5,pbs:6,performance:7,nutrition:8,athletes:9,rules:10,problueprintpage:11};
  const idx=map[page];
  document.querySelectorAll('nav button')[idx]?.classList.add('active');
  document.querySelectorAll('.mob-btn')[idx]?.classList.add('active');
  window.scrollTo(0,0);
  if(page==='planner')renderPlanner();
  if(page==='history')renderHistory();
  if(page==='morning'){updateBaseline();populateMorningForm();}
  if(page==='dashboard')updateDashboard();
  if(page==='trends')renderTrendPage();
  if(page==='pbs')renderPBs();
  if(page==='performance')renderPerformance();
  if(page==='nutrition')renderNutrition();
  if(page==='athletes')renderAthletes();
  if(page==='checkin'){
    // Default to this week's Sunday (week-ending) if not already set
    if(typeof initCIWeek === 'function') initCIWeek();
    // Auto-fill training load, HRV, sleep from this week's data
    if(typeof autoFillCI === 'function') setTimeout(autoFillCI, 100);
  }
  if(page==='problueprintpage')renderProBlueprint();
}

// ===== SCORE BUTTONS =====
function setScore(type,val,btn){
  scores[type]=val;
  btn.parentElement.querySelectorAll('.sb').forEach((b,i)=>{b.className='sb'+(i+1===val||val===2&&i===1||val===0&&i===2?'':' s'+val);});
  // For 3-button fuel
  const parent=btn.parentElement;
  parent.querySelectorAll('.sb').forEach(b=>b.className='sb');
  btn.className='sb s'+Math.max(1,val===2?5:val===1?3:1);
  calcStatus();
}
function setCIScore(type,val,btn){
  ciScores[type]=val;
  btn.parentElement.querySelectorAll('.sb').forEach((b,i)=>{b.className='sb'+(i+1===val?' s'+val:'');});
}
function toggleCheck(key){
  if(key==='none') {
    const wasNone = recoveryChecks.none;
    Object.keys(recoveryChecks).forEach(k => recoveryChecks[k]=false);
    recoveryChecks.none = !wasNone;
    Object.keys(recoveryChecks).forEach(k => {
      const el = document.getElementById('cb-'+k);
      if(el) el.className = 'check-box' + (recoveryChecks[k]?' checked':'');
    });
    return;
  }
  recoveryChecks.none = false;
  const noneEl = document.getElementById('cb-none');
  if(noneEl) noneEl.className = 'check-box';
  recoveryChecks[key]=!recoveryChecks[key];
  const el=document.getElementById('cb-'+key);
  el.className='check-box'+(recoveryChecks[key]?' checked':'');
}
function toggleFailedNote(){
  const v=document.getElementById('q1').value;
  document.getElementById('failed-wrap').style.display=v==='0'?'block':'none';
}

