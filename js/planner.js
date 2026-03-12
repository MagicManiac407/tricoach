// ===== PLANNER =====
function renderPlanner(){
  document.getElementById('week-label').childNodes[0].nodeValue='Week of ';
  document.getElementById('week-label-sub').textContent=weekLabel(currentWeekKey);
  const plan=D.plans[currentWeekKey]||{};
  document.getElementById('week-focus').value=plan._focus||'';
  ['man-run-km','man-swim-m','man-bike-hrs','man-total-hrs'].forEach(id=>{
    const k='_'+id.replace(/-/g,'');
    const el=document.getElementById(id);if(el)el.value=plan[k]||'';
  });
  const c=document.getElementById('planner-days');c.innerHTML='';
  DAYS.forEach((day,di)=>{
    const dd=plan[di]||{};
    const isHard=/interval|effort|threshold|max|285|260|245|hard|vo2/i.test(dd.plan||'');
    const isRest=!dd.types&&!dd.plan;
    const card=document.createElement('div');card.className='day-card';card.id='dc-'+di;
    card.innerHTML=`<div class="day-header" id="dh-${di}" onclick="toggleDay(${di})">
      <div class="day-cell"><div class="day-name${isRest?' rest':''}" style="${isHard?'color:var(--red)':''}">${day.slice(0,3).toUpperCase()}</div></div>
      <div class="day-cell dcol-types"><div class="dcl">Types</div><div id="dtags-${di}">${renderTags(dd.types||'')}</div></div>
      <div class="day-cell dcol-plan"><div class="dcl">Programmed Plan</div><div style="font-size:11px;color:var(--text-mid);line-height:1.5;max-height:44px;overflow:hidden;">${(dd.plan||'').substring(0,120)||'<span style="color:var(--text-dim);font-size:10px;">No plan set</span>'}</div></div>
      <div class="day-cell dcol-done"><div class="dcl">Completed</div><div style="font-size:11px;line-height:1.5;max-height:52px;overflow:hidden;">${renderCompletedPreview(dd.completed||'')}</div></div>
      <div class="day-cell"><div class="dcl">Q / R</div>${renderMiniScores(dd.quality,dd.recovery)}</div>
    </div>
    <div class="day-body" id="db-${di}" style="display:none;">
      <div class="g2"><div>
        <div class="fg"><label>Session Types</label><input type="text" id="tp-${di}" value="${dd.types||''}" placeholder="e.g. Easy Cycle, Interval Run" onchange="updateTags(${di})" oninput="liveUpdateTotals()"></div>
        <div class="fg"><label>Programmed Plan</label><textarea class="plan-txt" id="pl-${di}" placeholder="e.g. Cycle: 2hr @ Z2 (145–162bpm)&#10;Run: 10km @ Z2 — no higher than 162bpm" oninput="liveUpdateTotals()" onblur="autoSavePlanDay(${di})">${dd.plan||''}</textarea></div>
        <div class="fg"><label>Notes</label><textarea id="nt-${di}" placeholder="e.g. Rest day on Thursdays reduces cycle to 3x per week" style="min-height:44px;" onblur="autoSavePlanDay(${di})">${dd.notes||''}</textarea></div>
      </div><div>
        <div class="fg"><label>Training Completed</label><textarea class="plan-txt done" id="cp-${di}" placeholder="e.g. Cycle: 3hr 12min @ 105W | Avg HR 130&#10;Run: 10km @ 6:30 @ 144bpm (stopped twice)" style="min-height:110px;" onblur="autoSavePlanDay(${di})">${dd.completed||''}</textarea></div>
        <label style="margin-bottom:8px;">Quality / Recovery</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:11px;color:var(--text-dim);white-space:nowrap;">Quality</span>
          <div style="display:flex;gap:3px;" id="msq-${di}">${[1,2,3,4,5].map(n=>`<button class="msb ${dd.quality===n?'s'+n:''}" onclick="setDayScore(${di},'quality',${n},this)">${n}</button>`).join('')}</div>
          <span style="font-size:11px;color:var(--text-dim);white-space:nowrap;margin-left:8px;">Recovery</span>
          <div style="display:flex;gap:3px;" id="msr-${di}">${[1,2,3,4,5].map(n=>`<button class="msb ${dd.recovery===n?'s'+n:''}" onclick="setDayScore(${di},'recovery',${n},this)">${n}</button>`).join('')}</div>
        </div>
      </div></div>
    </div>`;
    c.appendChild(card);
  });
  liveUpdateTotals();updateAutoTotals();checkStack();
  // Render interval log panel below planner
  if(typeof initPlannerIntervalLog === 'function') setTimeout(initPlannerIntervalLog, 0);
}

// Color-code completed session lines based on effort tags
function colorCompletedLine(line) {
  if(!line || line.startsWith('---')) return `<span style="color:var(--border2);font-size:9px;">──────</span>`;
  const isHard = /\[Z4\]|\[Z5\]|\[INTERVAL\]|\[HARD\]/i.test(line);
  const isEasy = /\[Z2\]|\[WU\]|\[CD\]/i.test(line);
  const isWU   = /\[WU\]/.test(line);
  const isCD   = /\[CD\]/.test(line);
  const isMod  = /\[Z3\]/.test(line);

  let color = 'var(--text-mid)';
  if(isHard) color = 'var(--red)';
  else if(isWU || isCD) color = 'var(--text-dim)';
  else if(isEasy) color = 'var(--cyan)';
  else if(isMod)  color = 'var(--orange)';

  // Bold the key stat (first number+unit after sport prefix)
  const escaped = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<div style="color:${color};line-height:1.4;">${escaped}</div>`;
}

function renderCompletedPreview(completed) {
  if(!completed) return '<span style="color:var(--text-dim);font-size:10px;">Not logged</span>';
  const lines = completed.split('\n').filter(l => l.trim()).slice(0, 4);
  return lines.map(l => colorCompletedLine(l)).join('');
}

function renderTags(types){
  if(!types)return'<span style="color:var(--text-dim);font-size:10px;">—</span>';
  return types.split(',').map(t=>{
    t=t.trim();
    const cls=/swim/i.test(t)?'swim'
      :/hard ride|hard run|hard swim|interval/i.test(t)?'hard'
      :/bike|cycle|rouvy/i.test(t)?'bike'
      :/run/i.test(t)?'run'
      :/brick/i.test(t)?'brick'
      :/warm.up|wu|cd/i.test(t)?'wu'
      :'';
    return`<span class="stag ${cls}">${t}</span>`;
  }).join('');
}
function renderMiniScores(q,r){
  if(!q&&!r)return'<span style="color:var(--text-dim);font-size:10px;">—</span>';
  const qc=q>=4?'var(--green)':q>=3?'var(--orange)':'var(--red)';
  const rc=r>=4?'var(--green)':r>=3?'var(--orange)':'var(--red)';
  return`<div style="display:flex;gap:6px;">${q?`<span style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:${qc};">Q:${q}</span>`:''} ${r?`<span style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:${rc};">R:${r}</span>`:''}</div>`;
}

function toggleDay(di){
  const b=document.getElementById('db-'+di),h=document.getElementById('dh-'+di);
  const open=b.style.display!=='none';
  b.style.display=open?'none':'block';
  h.className='day-header'+(open?'':' exp');
}

function updateTags(di){document.getElementById('dtags-'+di).innerHTML=renderTags(document.getElementById('tp-'+di).value);}

function setDayScore(di,field,val,btn){
  if(!D.plans[currentWeekKey])D.plans[currentWeekKey]={};
  if(!D.plans[currentWeekKey][di])D.plans[currentWeekKey][di]={};
  D.plans[currentWeekKey][di][field]=val;
  const c=document.getElementById('ms'+(field==='quality'?'q':'r')+'-'+di);
  c.querySelectorAll('.msb').forEach((b,i)=>{b.className='msb'+(i+1===val?' s'+val:'');});
  save();
}

function liveUpdateTotals(){
  updateAutoTotals();
  let swim=0,bike=0,run=0,hard=0,sessions=0,z2=0,rest=0;
  DAYS.forEach((_,di)=>{
    const t=(document.getElementById('tp-'+di)?.value||'').toLowerCase();
    const p=(document.getElementById('pl-'+di)?.value||'').toLowerCase();
    const c=(document.getElementById('cp-'+di)?.value||'').toLowerCase();
    const anyContent=t.trim()||p.trim()||c.trim();
    if(/swim/.test(t)||/swim/.test(c)){swim++;sessions++;}
    else if(/bike|cycle|rouvy|ride/.test(t)||/bike|cycle|rouvy|ride/.test(c)){bike++;sessions++;}
    else if(/run/.test(t)||/run/.test(c)){run++;sessions++;}
    else if(anyContent&&!/rest/.test(t)){sessions++;}
    if(!anyContent||/rest/.test(t))rest++;
    if(/interval|effort|threshold|max|285|260|245|hard|vo2/i.test(p)||/interval|effort|threshold|max|hard|vo2/i.test(c))hard++;
    if(/z2|zone 2|145|150|155|160/i.test(p)||/\[z2\]/i.test(c))z2++;
  });
  const easy=Math.max(0,sessions-hard);
  const ratio=hard>0?Math.round((easy/hard)*10)/10+'x':hard===0&&sessions>0?'∞':'—';
  const setEl=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setEl('tot-swim',swim);
  setEl('tot-bike',bike);
  setEl('tot-run',run);
  setEl('tot-hard',hard);
  setEl('tot-sessions',sessions);
  setEl('tot-z2',z2);
  setEl('tot-rest',rest);
  setEl('tot-ratio',ratio);
}

function checkStack(){
  const plan=D.plans[currentWeekKey]||{};
  let warns=[],prev=false;
  DAYS.forEach((day,di)=>{
    const p=(plan[di]?.plan||document.getElementById('pl-'+di)?.value||'').toLowerCase();
    const h=/interval|effort|threshold|max|285|260|245|hard|vo2/i.test(p);
    if(h&&prev)warns.push(`${DAYS[di-1].slice(0,3)} + ${day.slice(0,3)} back-to-back hard`);
    prev=h;
  });
  const w=document.getElementById('stack-warn');
  if(warns.length){w.className='stack-warn on';document.getElementById('stack-warn-txt').textContent='⚠ '+warns.join(' | ');}
  else w.className='stack-warn';
}

function autoSaveFocus(){
  if(!D.plans[currentWeekKey])D.plans[currentWeekKey]={};
  D.plans[currentWeekKey]._focus=document.getElementById('week-focus').value;
  save();
}

function autoSavePlanDay(di){
  // Auto-save a single day's fields when user clicks away (blur event)
  if(!D.plans[currentWeekKey])D.plans[currentWeekKey]={};
  const p=D.plans[currentWeekKey];
  const existing=p[di]||{};
  p[di]={...existing,
    types:document.getElementById('tp-'+di)?.value||existing.types||'',
    plan:document.getElementById('pl-'+di)?.value||existing.plan||'',
    completed:document.getElementById('cp-'+di)?.value||existing.completed||'',
    notes:document.getElementById('nt-'+di)?.value||existing.notes||''
  };
  save();
}

function savePlanManuals(){
  if(!D.plans[currentWeekKey])D.plans[currentWeekKey]={};
  const p=D.plans[currentWeekKey];
  p._manrunkm=document.getElementById('man-run-km').value;
  p._manswimm=document.getElementById('man-swim-m').value;
  p._manbikehrs=document.getElementById('man-bike-hrs').value;
  p._mantotalhrs=document.getElementById('man-total-hrs').value;
  save();
}

function savePlan(){
  if(!D.plans[currentWeekKey])D.plans[currentWeekKey]={};
  const p=D.plans[currentWeekKey];
  p._focus=document.getElementById('week-focus').value;
  p._manrunkm=document.getElementById('man-run-km').value;
  p._manswimm=document.getElementById('man-swim-m').value;
  p._manbikehrs=document.getElementById('man-bike-hrs').value;
  p._mantotalhrs=document.getElementById('man-total-hrs').value;
  DAYS.forEach((_,di)=>{
    const existing=p[di]||{};
    p[di]={...existing,
      types:document.getElementById('tp-'+di)?.value||'',
      plan:document.getElementById('pl-'+di)?.value||'',
      completed:document.getElementById('cp-'+di)?.value||'',
      notes:document.getElementById('nt-'+di)?.value||''
    };
  });
  save();renderPlanner();updateDashboard();showToast('Plan saved ✓');
}

function copyLastWeek(){
  const d=new Date(currentWeekKey);d.setDate(d.getDate()-7);
  const lk=getWeekKey(d),lp=D.plans[lk];
  if(!lp){showToast('No plan found for last week',true);return;}
  if(!D.plans[currentWeekKey])D.plans[currentWeekKey]={};
  DAYS.forEach((_,di)=>{
    const ld=lp[di]||{};
    D.plans[currentWeekKey][di]={types:ld.types||'',plan:ld.plan||'',completed:'',notes:ld.notes||''};
  });
  save();renderPlanner();showToast('Last week copied ✓');
}

// ===== PLANNER INTERVAL SESSION LOG =====
let _pliv_sport = 'run';

function plannerShowIvSport(sport) {
  _pliv_sport = sport;
  ['run','bike','swim'].forEach(s => {
    const formEl = document.getElementById('pliv-form-'+s);
    const btn    = document.getElementById('pliv-btn-'+s);
    if(formEl) formEl.style.display = s===sport ? 'block' : 'none';
    if(btn) {
      const colors = {run:'var(--green)',bike:'var(--orange)',swim:'#2196f3'};
      btn.style.borderColor = s===sport ? colors[s] : 'var(--border)';
      btn.style.color       = s===sport ? colors[s] : 'var(--text-dim)';
      btn.style.background  = s===sport ? `rgba(${s==='run'?'0,230,118':s==='bike'?'255,152,0':'33,150,243'},.1)` : 'transparent';
    }
  });
  // Pre-fill today's date
  const today = new Date().toISOString().slice(0,10);
  const dateEl = document.getElementById('pliv-'+sport+'-date');
  if(dateEl && !dateEl.value) dateEl.value = today;
  // Show form if not already visible
  const form = document.getElementById('pliv-form');
  if(form) form.style.display = 'block';
  plannerRenderIvTable();
}

function plannerToggleIvForm() {
  const form = document.getElementById('pliv-form');
  if(!form) return;
  const isHidden = form.style.display === 'none' || !form.style.display;
  form.style.display = isHidden ? 'block' : 'none';
  if(isHidden) plannerShowIvSport(_pliv_sport);
  const btn = document.getElementById('pliv-toggle-btn');
  if(btn) btn.style.color = isHidden ? 'var(--red)' : 'var(--orange)';
}

function plannerAddInterval() {
  const sport = _pliv_sport;
  if(!D.ivManual) D.ivManual = [];
  const msg = document.getElementById('pliv-msg');

  const date = document.getElementById('pliv-'+sport+'-date')?.value || '';
  const name = document.getElementById('pliv-'+sport+'-name')?.value?.trim() || '';
  const val  = document.getElementById('pliv-'+sport+'-val')?.value?.trim() || '';
  const hr   = document.getElementById('pliv-'+sport+'-hr')?.value;

  if(!date || !val) {
    if(msg) { msg.style.color='var(--red)'; msg.textContent='Date and value required'; }
    return;
  }

  // Validate pace format for run/swim
  if((sport==='run'||sport==='swim') && !/^\d+:\d{2}$/.test(val)) {
    if(msg) { msg.style.color='var(--red)'; msg.textContent='Pace must be M:SS format (e.g. 4:05)'; }
    return;
  }
  if(sport==='bike' && !/^\d+$/.test(val)) {
    if(msg) { msg.style.color='var(--red)'; msg.textContent='Enter watts as a whole number (e.g. 245)'; }
    return;
  }

  const entry = { sport, date, name, val };
  if(hr) entry.hr = parseInt(hr);

  if(sport==='bike') {
    const dur = document.getElementById('pliv-bike-dur')?.value;
    const vr  = document.getElementById('pliv-bike-vr')?.value;
    if(!dur) { if(msg) { msg.style.color='var(--red)'; msg.textContent='Duration required for bike'; } return; }
    entry.dur = parseFloat(dur);
    entry.vr  = vr === '1';
  }
  if(sport==='run' || sport==='swim') {
    const dk = document.getElementById('pliv-'+sport+'-dk')?.value;
    if(dk) entry.dk = parseFloat(dk);
  }

  D.ivManual.push(entry);
  save();

  // Reset form fields
  ['name','val','hr','dk','dur'].forEach(f => {
    const el = document.getElementById('pliv-'+sport+'-'+f);
    if(el) el.value = '';
  });

  // Force predictor rebuild on next open
  window._predState = null;

  if(msg) { msg.style.color='var(--green)'; msg.textContent='✓ Saved — will update Race Predictor'; setTimeout(()=>{ if(msg) msg.textContent=''; },3000); }
  plannerRenderIvTable();
  showToast('Interval session saved ✓');
}

function plannerDeleteInterval(idx, sport) {
  if(!D.ivManual) return;
  if(!confirm('Remove this interval entry?')) return;
  let count = 0;
  D.ivManual = D.ivManual.filter(m => {
    if(m.sport !== sport) return true;
    return count++ !== idx;
  });
  save();
  window._predState = null;
  plannerRenderIvTable();
  showToast('Entry removed');
}

function plannerRenderIvTable() {
  const div = document.getElementById('pliv-table');
  if(!div) return;
  if(!D.ivManual || !D.ivManual.length) {
    div.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">No manual interval entries yet — add sessions above to improve Race Predictor accuracy.</div>';
    return;
  }

  const fmtDate = d => { try { return new Date(d+'T00:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'2-digit'}); } catch(e){return d;} };
  const colors  = {run:'var(--green)',bike:'var(--orange)',swim:'#2196f3'};
  const icons   = {run:'🏃',bike:'🚴',swim:'🏊'};
  function dS(d){return d>=150?.91:d>=120?.94:d>=90?.97:d>=60?1:d>=45?.98:d>=30?.97:.95;}

  // Group by sport
  const bySport = {};
  D.ivManual.forEach((m,globalIdx) => {
    if(!bySport[m.sport]) bySport[m.sport] = [];
    bySport[m.sport].push({...m, _globalIdx: globalIdx});
  });

  let html = '';
  ['run','bike','swim'].forEach(sport => {
    const entries = bySport[sport];
    if(!entries || !entries.length) return;
    const color = colors[sport];
    html += `<div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:${color};margin-bottom:6px;">${icons[sport]} ${sport.toUpperCase()} INTERVALS</div>
      <div style="overflow-x:auto;"><table class="tbl" style="font-size:11px;">
        <thead><tr><th>Date</th><th>Session</th><th>Value</th><th>→ Predictor</th><th>HR</th><th></th></tr></thead>
        <tbody>`;
    let sportIdx = 0;
    entries.forEach(m => {
      let valDisp = m.val, predDisp = m.val;
      if(sport==='run') { valDisp=m.val+'/km'; predDisp=m.val+'/km LT est'; }
      else if(sport==='bike') {
        const ftpE = Math.round(parseFloat(m.val)*dS(parseFloat(m.dur||60))*(m.vr?0.98:1));
        valDisp=m.val+'W · '+m.dur+'min'; predDisp=`→ ~${ftpE}W FTP`;
      } else { valDisp=m.val+'/100m'; predDisp=m.val+'/100m CSS'; }
      const si = sportIdx;
      html += `<tr>
        <td style="white-space:nowrap;">${fmtDate(m.date)}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.name||'Interval'} <span style="color:var(--orange);font-size:9px;">★</span></td>
        <td style="font-family:monospace;color:${color};">${valDisp}</td>
        <td style="font-size:10px;color:var(--text-dim);">${predDisp}</td>
        <td style="color:var(--text-dim);">${m.hr||'—'}</td>
        <td><button class="btn sec sml" style="font-size:9px;padding:2px 8px;background:rgba(244,67,54,.1);color:var(--red);" onclick="plannerDeleteInterval(${si},'${sport}')">Remove</button></td>
      </tr>`;
      sportIdx++;
    });
    html += '</tbody></table></div></div>';
  });

  div.innerHTML = html || '<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">No entries yet.</div>';
}

// Call on planner page load
function initPlannerIntervalLog() {
  plannerShowIvSport('run');
  plannerRenderIvTable();
  // Pre-fill dates
  const today = new Date().toISOString().slice(0,10);
  ['run','bike','swim'].forEach(s => {
    const el = document.getElementById('pliv-'+s+'-date');
    if(el && !el.value) el.value = today;
  });
}

