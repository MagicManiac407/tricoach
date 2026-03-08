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
        <div class="fg"><label>Programmed Plan</label><textarea class="plan-txt" id="pl-${di}" placeholder="e.g. Cycle: 2hr @ Z2 (145–162bpm)&#10;Run: 10km @ Z2 — no higher than 162bpm" oninput="liveUpdateTotals()">${dd.plan||''}</textarea></div>
        <div class="fg"><label>Notes</label><textarea id="nt-${di}" placeholder="e.g. Rest day on Thursdays reduces cycle to 3x per week" style="min-height:44px;">${dd.notes||''}</textarea></div>
      </div><div>
        <div class="fg"><label>Training Completed</label><textarea class="plan-txt done" id="cp-${di}" placeholder="e.g. Cycle: 3hr 12min @ 105W | Avg HR 130&#10;Run: 10km @ 6:30 @ 144bpm (stopped twice)" style="min-height:110px;">${dd.completed||''}</textarea></div>
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

