// ===== HISTORY =====
function switchHist(tab){
  ['sessions','checkins','morning'].forEach(t=>{document.getElementById('hv-'+t).style.display=t===tab?'block':'none';document.getElementById('ht-'+t).className=t===tab?'btn':'btn sec';});
}

// ===== SERVER SYNC =====
const SYNC_SERVER = 'http://localhost:7432';

async function checkSyncServer() {
  try {
    const r = await fetch(SYNC_SERVER + '/status', {signal: AbortSignal.timeout(1500)});
    if(r.ok) {
      const el = document.getElementById('srv-status');
      if(el) { el.textContent = '✅ Sync server connected'; el.style.color = 'var(--green)'; }
    }
  } catch(e) {
    // Server not running — status stays at default
  }
}

async function serverSync(type) {
  const endpoint = type === 'both' ? '/sync' : '/sync/' + type;
  const btnId = type === 'both' ? 'srv-both-btn' : type === 'garmin' ? (document.getElementById('mrn-garmin-btn') ? 'mrn-garmin-btn' : 'srv-garmin-btn') : 'srv-' + type + '-btn';
  const btn = document.getElementById(btnId);
  const status = document.getElementById(type === 'garmin' && document.getElementById('mrn-garmin-status') ? 'mrn-garmin-status' : 'srv-status');

  if(btn) { btn.disabled = true; btn.textContent = '⏳ Syncing…'; }
  if(status) { status.textContent = 'Syncing…'; status.style.color = 'var(--text-dim)'; }

  try {
    const r = await fetch(SYNC_SERVER + endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(60000) // 60s timeout for slow Garmin/Strava
    });
    const data = await r.json();

    if(data.ok) {
      if(status) { status.textContent = '✅ ' + data.message + ' — reloading…'; status.style.color = 'var(--green)'; }
      showToast('✅ ' + data.message + ' — reloading page with fresh data…');
      // Short delay so toast is visible, then reload to pick up new HTML data
      setTimeout(() => window.location.reload(), 2000);
    } else {
      if(status) { status.textContent = '❌ ' + (data.message || 'Sync failed'); status.style.color = 'var(--red)'; }
      showToast('❌ Sync failed — check terminal for errors');
      if(btn) { btn.disabled = false; btn.textContent = btn.textContent.replace('⏳ Syncing…', type === 'both' ? '🔄 Sync Both' : '🔄 Sync ' + type.charAt(0).toUpperCase() + type.slice(1) + ' now'); }
    }
  } catch(e) {
    const msg = e.name === 'AbortError' ? 'Timed out — sync still running in terminal' :
                e.message.includes('Failed to fetch') || e.message.includes('NetworkError') ?
                'Server not running — start it with: python3 sync.py --serve' : e.message;
    if(status) { status.textContent = '❌ ' + msg; status.style.color = 'var(--red)'; }
    showToast('⚠ ' + msg);
    if(btn) { btn.disabled = false; }
  }
}

function histResync(){
  // Wipe all Strava-populated completed fields across ALL weeks, then do a clean resync
  Object.keys(D.plans).forEach(wk=>{
    for(let di=0;di<7;di++){
      if(D.plans[wk][di]) D.plans[wk][di].completed = '';
    }
  });
  // Full re-import from scratch for all activities
  autoPopulatePlannerFromStrava();
  // Then refresh recent 8 weeks with the cleaner refresh logic
  refreshPlannerFromStrava();
  renderHistory();
  showToast('History re-synced cleanly ✓');
}

function renderHistory(){
  // Sessions
  const allS=[];
  Object.keys(D.plans).sort().reverse().forEach(wk=>{
    DAYS.forEach((day,di)=>{
      const d=D.plans[wk]?.[di];
      if(d&&(d.completed||d.plan)){
        // Calculate actual date for this day (week key is Monday, di=0 is Monday)
        const [wY,wM,wD]=wk.split('-').map(Number);
        const actualDate=new Date(wY,wM-1,wD+di);
        const dateStr=actualDate.getFullYear()+'-'+String(actualDate.getMonth()+1).padStart(2,'0')+'-'+String(actualDate.getDate()).padStart(2,'0');
        allS.push({wk,day,di,d,dateStr});
      }
    });
  });
  // Sort by actual date descending
  allS.sort((a,b)=>b.dateStr.localeCompare(a.dateStr));
  const sc=document.getElementById('hc-sessions');
  sc.innerHTML=allS.length===0?'<div style="color:var(--text-dim);font-size:12px;padding:16px 0;text-align:center;">No sessions yet — import from Strava or log in planner</div>':`<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Date</th><th>Day</th><th>Sports</th><th>Load Tags</th><th>Session Detail</th></tr></thead><tbody>${allS.slice(0,200).map(s=>{
  const comp = s.d.completed || s.d.plan || '';
  // Parse actual activities from completed text
  const hasRun = /^Run:/im.test(comp);
  const hasInterval = /\[INTERVAL\]/i.test(comp);
  const hasRouvy = /^Rouvy:/im.test(comp);
  const hasOutdoorBike = /^Ride:/im.test(comp);
  const hasSwim = /^Swim:/im.test(comp);
  const hasWU = /\[WU\]|\[CD\]/i.test(comp);
  const hasZ2 = /\[Z2\]/i.test(comp);
  const hasZ3 = /\[Z3\]/i.test(comp);
  const hasZ4 = /\[Z4\]/i.test(comp);
  const hasZ5 = /\[Z5\]/i.test(comp);
  // Sport icons
  const sports = [
    hasInterval?'<span title="Interval Run" style="font-size:14px;">🏃‍♂️💥</span>':hasRun?'<span title="Run" style="font-size:14px;">🏃</span>':'',
    hasRouvy?'<span title="Rouvy" style="font-size:14px;">🚴</span>':'',
    hasOutdoorBike?'<span title="Outdoor Ride" style="font-size:14px;">🚵</span>':'',
    hasSwim?'<span title="Swim" style="font-size:14px;">🏊</span>':''
  ].filter(Boolean).join(' ');
  // All load tags — show every zone present on the day, not just the hardest
  const loadTags = [
    (hasZ5||hasInterval)?'<span style="background:rgba(244,67,54,.2);color:#f44336;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;">'+(hasInterval?'INTV':'Z5')+'</span>':'',
    hasZ4?'<span style="background:rgba(255,112,67,.18);color:#ff7043;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;">HARD</span>':'',
    hasZ3?'<span style="background:rgba(255,152,0,.18);color:#ff9800;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;">Z3</span>':'',
    hasZ2?'<span style="background:rgba(0,230,118,.12);color:#00e676;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;">Z2</span>':'',
    hasWU?'<span style="background:rgba(90,112,128,.15);color:var(--text-dim);font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;">WU</span>':''
  ].filter(Boolean).join(' ');
  // Build per-session summary lines from all completed lines
  const allLines = comp.split('\n').filter(l=>l.trim() && !l.startsWith('---') && /^(Run:|Rouvy:|Ride:|Swim:)/i.test(l.trim()));
  const statLines = allLines.map(line => {
    const kmM = line.match(/(\d+\.?\d*)km/);
    const mM  = line.match(/(\d+)m(?!in)/);  // metres for swim
    const paceM = line.match(/(\d:\d{2})\/km/);
    const swimPaceM = line.match(/(\d:\d{2})\/100m/);
    const wattM = line.match(/NP (\d+)W/);
    const avgWM = line.match(/(\d+)W avg/);
    const hrM = line.match(/@ (\d+)bpm/);
    const minM = line.match(/(\d+\.?\d*)min/);
    const efM = line.match(/\[(Z[2-5]|INTERVAL|WU|CD)\]/);
    const sport = line.match(/^(\w+):/)?.[1] || '';
    const sportColor = /Swim/i.test(sport)?'#2196f3':/Rouvy|Ride/i.test(sport)?'#ff9800':'#00e676';
    const efColor = efM?{Z2:'#00e676',Z3:'#ff9800',Z4:'#ff7043',Z5:'#f44336',INTERVAL:'#f44336',WU:'var(--text-dim)',CD:'var(--text-dim)'}[efM[1]]||'var(--text-dim)':'';

    let parts = [];
    if(/Swim/i.test(sport)) {
      // Swim: distance, time, pace per 100m
      if(mM && parseInt(mM[1]) > 100) parts.push(mM[1]+'m');
      else if(kmM) parts.push((parseFloat(kmM[1])*1000).toFixed(0)+'m');
      if(minM) parts.push(parseFloat(minM[1]).toFixed(0)+'min');
      if(swimPaceM) parts.push('<span style="font-family:monospace;">'+swimPaceM[1]+'/100m</span>');
      if(hrM) parts.push(hrM[1]+'bpm');
    } else if(/Rouvy|Ride/i.test(sport)) {
      // Bike: distance, time, power (NP preferred), HR
      if(kmM) parts.push(parseFloat(kmM[1]).toFixed(0)+'km');
      if(minM) parts.push(parseFloat(minM[1]).toFixed(0)+'min');
      if(wattM) parts.push('<span style="color:#ff9800;font-weight:600;">'+wattM[1]+'W NP</span>');
      else if(avgWM) parts.push('<span style="color:#ff9800;">'+avgWM[1]+'W avg</span>');
      if(hrM) parts.push(hrM[1]+'bpm');
    } else {
      // Run: distance, pace, HR
      if(kmM) parts.push(kmM[1]+'km');
      if(paceM) parts.push('<span style="font-family:monospace;">'+paceM[1]+'/km</span>');
      if(hrM) parts.push(hrM[1]+'bpm');
    }
    if(efM) parts.push('<span style="font-size:9px;font-weight:700;color:'+efColor+';">'+efM[1]+'</span>');

    return parts.length
      ? '<span style="color:'+sportColor+';font-size:9px;font-weight:700;">'+sport.toUpperCase()+'</span> <span style="font-size:10px;color:var(--text-mid);">'+parts.join(' · ')+'</span>'
      : '';
  }).filter(Boolean);
  const stats = statLines.join('<br>') || comp.split('\n').find(l=>l.trim()&&!l.startsWith('---'))?.slice(0,60) || '—';
  return`<tr>
    <td style="color:var(--text-dim);font-size:10px;white-space:nowrap;">${s.dateStr}</td>
    <td style="font-size:11px;font-weight:600;white-space:nowrap;">${s.day.slice(0,3)}</td>
    <td style="white-space:nowrap;">${sports||'<span style="color:var(--text-dim);">—</span>'}</td>
    <td style="white-space:nowrap;min-width:80px;"><div style="display:flex;flex-wrap:wrap;gap:3px;">${loadTags||'<span style="color:var(--text-dim);font-size:10px;">—</span>'}</div></td>
    <td style="max-width:240px;font-size:10px;line-height:1.8;">${stats}</td>
  </tr>`;}).join('')}</tbody></table></div>`;
  // Checkins — full detail table
  const cc=document.getElementById('hc-checkins');
  if(!D.checkins.length){cc.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:16px 0;text-align:center;">No check-ins yet</div>';} else {
    const qLabel = (key, val) => {
      const maps = {
        q1: {3:'✅ All 3 sessions',2:'⚠️ 2 of 3',0:'❌ 1 or fewer'},
        q2: {2:'✅ Stayed in Z2','1':'⚠️ Mostly Z2',0:'❌ Drifting'},
        q4: {2:'💪 Fresh',1:'😐 Tired but ok',0:'😓 Fatigued'},
        q7: {good:'✅ Good sleep',ok:'⚠️ Hit and miss',bad:'❌ Poor sleep'},
        q8: {1:'🔥 Keen',0:'😐 Neutral','-1':'😩 Dreading'}
      };
      if(maps[key] && val!==undefined && val!=='') return maps[key][val] || val;
      return val||'—';
    };
    cc.innerHTML=`<div class="tbl-scroll"><table class="tbl">
      <thead><tr><th>Week Ending</th><th>Block</th><th>Score</th><th>Hrs</th><th>HRV Avg</th><th>Sessions</th><th>Z2 Discipline</th><th>Training Load</th><th>Freshness</th><th>Sleep</th><th>Motivation</th><th>Nutrition</th><th>Life Stress</th><th>Decision</th><th>Notes</th><th></th></tr></thead>
      <tbody>${[...D.checkins].reverse().map((c)=>{
        const idx=D.checkins.indexOf(c);
        const sc=c.score>=8?'var(--green)':c.score>=5?'var(--orange)':'var(--red)';
        const action=c.score>=8?'🟢 Increase':c.score>=5?'🟡 Hold':'🔴 Reduce';
        // Format week-end date nicely
        const fmtWeekEnd = c.date ? (() => {
          const d = new Date(c.date + 'T12:00:00');
          const wkStart = getWeekKey(d);
          const startFmt = new Date(wkStart+'T12:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short'});
          const endFmt   = d.toLocaleDateString('en-AU',{day:'numeric',month:'short'});
          return `<div style="font-size:10px;font-weight:600;">${endFmt}</div><div style="font-size:9px;color:var(--text-dim);">${startFmt} – ${endFmt}</div>`;
        })() : '—';
        return`<tr>
          <td style="white-space:nowrap;">${fmtWeekEnd}</td>
          <td style="font-size:11px;">${c.block||'—'}</td>
          <td style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:${sc};">${c.score}/10</td>
          <td>${c.hours||'—'}</td>
          <td style="color:var(--blue);">${c.hrvAvg||'—'}</td>
          <td style="font-size:10px;">${qLabel('q1',c.q1)}</td>
          <td style="font-size:10px;">${qLabel('q2',c.q2)}</td>
          <td style="font-size:10px;">${c.q3trend||'—'}</td>
          <td style="font-size:10px;">${qLabel('q4',c.q4)}</td>
          <td style="font-size:10px;">${c.sleepScore?c.sleepScore+' score':qLabel('q7',c.q7)}</td>
          <td style="font-size:10px;">${qLabel('q8',c.q8)}</td>
          <td>${c.nutrition?c.nutrition+'/5':'—'}</td>
          <td>${c.lifestress?c.lifestress+'/5':'—'}</td>
          <td style="font-size:11px;white-space:nowrap;">${action}</td>
          <td style="font-size:10px;max-width:160px;color:var(--text-dim);">${(c.recap||c.intention||'').substring(0,60)||'—'}</td>
          <td><button class="btn sec sml" style="font-size:10px;padding:2px 8px;white-space:nowrap;" onclick="editCheckin(${idx})">✏️ Edit</button></td>
        </tr>`;}).join('')}
      </tbody></table></div>`;
  }
  // Morning log — full detail with edit
  const mc=document.getElementById('hc-morning');
  if(!D.mornings.length){mc.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:16px 0;text-align:center;">No morning checks yet</div>';}else{
    mc.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
      <div style="font-size:11px;color:var(--text-dim);">${D.mornings.length} entries · click ✏️ to edit · edits recalculate readiness score everywhere</div>
      <button class="btn sml" style="font-size:11px;" onclick="logPastDayPrompt()">+ Log Past Day</button>
    </div>
    <div style="overflow-x:auto;"><table class="tbl">
      <thead><tr><th>Date</th><th>HRV</th><th>RHR</th><th>Sleep Score</th><th>Sleep h</th><th>Stress</th><th>Readiness</th><th>Legs</th><th>Cal In</th><th>Protein</th><th>Readiness Score</th><th>Status</th><th>Note</th><th></th></tr></thead>
      <tbody>${[...D.mornings].reverse().map(m=>{
        const idx=D.mornings.indexOf(m);
        const se=m.status==='green'?'🟢':m.status==='amber'?'🟡':'🔴';
        const rScore=m.readinessScore;
        const rColor=rScore>=70?'var(--green)':rScore>=40?'var(--orange)':'var(--red)';
        return`<tr>
          <td style="white-space:nowrap;font-size:10px;">${m.date}</td>
          <td style="color:var(--blue);font-weight:600;">${m.hrv||'—'}</td>
          <td>${m.rhr?m.rhr+'bpm':'—'}</td>
          <td style="color:${m.sleepScore>=80?'var(--green)':m.sleepScore>=70?'var(--orange)':'var(--text-dim)'};">${m.sleepScore||'—'}</td>
          <td>${m.sleep?m.sleep+'h':'—'}</td>
          <td>${m.gstress||'—'}</td>
          <td>${m.readiness?m.readiness+'/5':'—'}</td>
          <td>${m.legs?m.legs+'/5':'—'}</td>
          <td>${m.calIn?m.calIn+'kcal':'—'}</td>
          <td>${m.protein?m.protein+'g':'—'}</td>
          <td style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:${rColor};">${rScore||'—'}</td>
          <td>${se}</td>
          <td style="font-size:10px;color:var(--text-dim);max-width:120px;">${(m.note||'').substring(0,50)||'—'}</td>
          <td><button class="btn sec sml" style="font-size:10px;padding:2px 8px;white-space:nowrap;" onclick="editMorning(${idx})">✏️ Edit</button></td>
        </tr>`;}).join('')}
      </tbody></table></div>`;
  }
}

// ===== DASHBOARD =====
function updateDashboard(){
  const m=D.mornings;
  const today=localDateStr(new Date());
  if(m.length){
    const l=m[m.length-1];
    const isToday = l.date===today;
    const isYesterday = !isToday && l.date === (() => { const d=new Date(); d.setDate(d.getDate()-1); return localDateStr(d); })();
    // Show a staleness badge on the dashboard health metrics if data is not today's
    const staleEl = document.getElementById('d-health-date');
    if(staleEl) {
      if(isToday) {
        staleEl.textContent = 'Today · ' + l.date;
        staleEl.style.color = 'var(--green)';
      } else {
        staleEl.textContent = (isYesterday ? 'Yesterday' : l.date) + ' · Log today\'s check →';
        staleEl.style.color = 'var(--orange)';
      }
    }
    if(l.hrv){
      document.getElementById('d-hrv-v').textContent=l.hrv;
      const prev=m.slice(-8,-1).filter(x=>x.hrv);
      if(prev.length){const avg=prev.reduce((a,x)=>a+x.hrv,0)/prev.length;const diff=l.hrv-avg;document.getElementById('d-hrv-s').textContent=(diff>=0?'+':'')+Math.round(diff)+' vs avg ('+Math.round(avg)+')';document.getElementById('d-hrv').className='metric'+(diff>=-4?'':diff>=-9?' o':' r');}
    }
    if(l.rhr){document.getElementById('d-rhr-v').textContent=l.rhr+'bpm';const rhrH=m.slice(-14).filter(x=>x.rhr);const baseR=rhrH.length>=3?rhrH.reduce((a,x)=>a+x.rhr,0)/rhrH.length:50;const rDiff=l.rhr-baseR;document.getElementById('d-rhr-s').textContent=(rDiff<=0?'Below':'+')+Math.abs(Math.round(rDiff))+'bpm vs baseline';}
    if(l.sleepScore){
      document.getElementById('d-sleep-v').textContent=l.sleepScore;
      const sc=l.sleepScore;
      // Use personal avg from recent mornings (fallback 83 = Travis's known avg)
      const sleepH=m.filter(x=>x.sleepScore&&x.sleepScore>0).map(x=>x.sleepScore).slice(-30);
      const personalAvg = sleepH.length>=7 ? Math.round(sleepH.reduce((a,b)=>a+b,0)/sleepH.length) : 83;
      const delta = sc - personalAvg;
      document.getElementById('d-sleep-s').textContent=
        delta>=3  ? 'Excellent (avg '+personalAvg+')' :
        delta>=-3 ? 'Good (avg '+personalAvg+')' :
        delta>=-8 ? 'Below avg ('+personalAvg+') — monitor' : 'Poor — recovery impacted';
      document.getElementById('d-sleep-v').parentElement.className='metric'+(delta>=-3?' g':delta>=-8?' o':' r');
    }
    if(l.gstress)document.getElementById('d-stress-v').textContent=l.gstress;
    // Restore readiness arc if today's check already saved
    if(isToday && l.readinessScore) {
      const arcColor=l.readinessScore>=70?'#00e676':l.readinessScore>=40?'#ff9800':'#f44336';
      const arc=document.getElementById('readiness-arc');
      const scoreEl=document.getElementById('readiness-score');
      const labelEl=document.getElementById('readiness-label');
      const detailEl=document.getElementById('readiness-detail');
      if(arc){arc.style.strokeDashoffset=364.4*(1-l.readinessScore/100);arc.style.stroke=arcColor;}
      if(scoreEl){scoreEl.textContent=l.readinessScore;scoreEl.style.color=arcColor;}
      const lbl=l.readinessScore>=85?'OPTIMAL':l.readinessScore>=70?'GOOD':l.readinessScore>=55?'MODERATE':l.readinessScore>=40?'CAUTION':'REST';
      if(labelEl){labelEl.textContent=lbl;labelEl.style.color=arcColor;}
      if(detailEl){detailEl.textContent='Logged today · tap to update';detailEl.style.color='var(--text-dim)';}
    }
  }
  // Strava week totals on dashboard
  const wk=getWeekKey(new Date());
  const t=calcWeekTotalsFromStrava(wk);
  const setEl=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setEl('d-run-km',   t.runKm>0?t.runKm.toFixed(1):'—');
  setEl('d-run-time', t.runMin>0?fmtMins(t.runMin):'');
  setEl('d-swim-km',  t.swimKm>0?(t.swimKm*1000).toFixed(0)+'m':'—');
  setEl('d-swim-time',t.swimMin>0?fmtMins(t.swimMin):'');
  setEl('d-bike-km',  t.bikeKm>0?t.bikeKm.toFixed(0):'—');
  setEl('d-bike-time',t.bikeMin>0?fmtMins(t.bikeMin):'');
  setEl('d-total-hrs',t.totalMin>0?(t.totalMin/60).toFixed(1):'—');
  setEl('d-sessions-count',t.totalSessions>0?t.totalSessions+' sessions':'');
  // Planner snap
  const plan=D.plans[wk]||{};
  let sw=0,bk=0,rn=0,hd=0;
  DAYS.forEach((_,di)=>{const d=plan[di]||{};const tp=(d.types||'').toLowerCase();const p=(d.plan||'').toLowerCase();if(/swim/.test(tp))sw++;if(/bike|cycle|rouvy/.test(tp))bk++;if(/run/.test(tp))rn++;if(/interval|effort|threshold|max|hard|vo2/i.test(p))hd++;});
  setEl('dt-swim',sw);setEl('dt-bike',bk);setEl('dt-run',rn);setEl('dt-hard',hd);
  setEl('dt-runkm',t.runKm>0?t.runKm.toFixed(1)+'km':plan._manrunkm||'—');
  setEl('dt-swimm',t.swimKm>0?(t.swimKm*1000).toFixed(0)+'m':plan._manswimm||'—');
  setEl('dt-bikeh',t.bikeMin>0?fmtMins(t.bikeMin):plan._manbikehrs||'—');
  setEl('dt-total',t.totalMin>0?(t.totalMin/60).toFixed(1)+'h':plan._mantotalhrs||'—');
  // Week snap
  const snap=document.getElementById('d-week-snap');
  const days=DAYS.map((_,di)=>plan[di]).filter(d=>d&&d.types);
  if(!days.length){snap.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">No sessions planned — <span style="color:var(--blue);cursor:pointer;" onclick="nav(\'planner\')">open planner →</span></div>';}
  else {snap.innerHTML=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:10px;">${DAYS.map((_,di)=>{const d=plan[di];if(!d||!d.types)return`<div style="background:var(--surface2);border-radius:7px;padding:8px 6px;text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1px;color:var(--text-dim);">${DAYS[di].slice(0,3).toUpperCase()}</div><div style="font-size:9px;color:var(--text-dim);margin-top:2px;">Rest</div></div>`;const isHard=/interval|effort|threshold|max|285|260|245|hard|vo2/i.test(d.plan||'');const qc=d.quality>=4?'var(--green)':d.quality>=3?'var(--orange)':d.quality?'var(--red)':'';return`<div style="background:var(--surface2);border:1px solid ${isHard?'rgba(244,67,54,.3)':'var(--border)'};border-radius:7px;padding:8px 6px;"><div style="font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1px;${isHard?'color:var(--red)':''};">${DAYS[di].slice(0,3).toUpperCase()}</div><div style="font-size:9px;color:var(--text-mid);margin-top:2px;line-height:1.3;">${d.types}</div>${d.quality?`<div style="font-family:'Bebas Neue',sans-serif;font-size:12px;color:${qc};margin-top:3px;">Q${d.quality} R${d.recovery||'?'}</div>`:''}</div>`;}).join('')}</div>`;}
  // Render race predictor mini widget
  if(typeof renderDashboardRacePredictor === 'function') setTimeout(renderDashboardRacePredictor, 50);
  // Render readiness history chart
  setTimeout(renderReadinessChart, 80);
}

// ===== READINESS HISTORY CHART =====
let _readinessChartDays = 28;

function setReadinessChartRange(days) {
  _readinessChartDays = days;
  document.getElementById('d-rc-7').className  = days===7  ? 'btn sml' : 'btn sec sml';
  document.getElementById('d-rc-28').className = days===28 ? 'btn sml' : 'btn sec sml';
  renderReadinessChart();
}

function renderReadinessChart() {
  const canvas = document.getElementById('readiness-history-canvas');
  if (!canvas) return;

  const days = _readinessChartDays;
  // Build date array
  const dateArr = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dateArr.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'));
  }

  // Collect readiness scores per date
  const scores = dateArr.map(date => {
    const m = D.mornings.find(x => x.date === date);
    return m?.readinessScore || null;
  });

  // Compute 7-day rolling average
  const rollingAvg = scores.map((_, i) => {
    const window = scores.slice(Math.max(0, i-6), i+1).filter(v => v !== null);
    return window.length >= 3 ? Math.round(window.reduce((a,b)=>a+b,0)/window.length) : null;
  });

  // Personal baseline (avg of all scores)
  const allScores = D.mornings.filter(m=>m.readinessScore).map(m=>m.readinessScore);
  const personalAvg = allScores.length >= 5
    ? Math.round(allScores.slice(-60).reduce((a,b)=>a+b,0) / Math.min(allScores.slice(-60).length, 60))
    : 65;

  // Stats for the row below chart
  const validScores = scores.filter(v=>v!==null);
  const avgScore = validScores.length ? Math.round(validScores.reduce((a,b)=>a+b,0)/validScores.length) : null;
  const highScore = validScores.length ? Math.max(...validScores) : null;
  const lowScore  = validScores.length ? Math.min(...validScores) : null;
  const greenDays = validScores.filter(v=>v>=70).length;

  // Update stats row
  const statsEl = document.getElementById('d-readiness-stats');
  if (statsEl) {
    const statPill = (label, value, color) => `
      <div style="background:var(--surface2);border-radius:8px;padding:8px 10px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${color||'var(--text)'};">${value??'—'}</div>
        <div style="font-size:9px;color:var(--text-dim);letter-spacing:.5px;text-transform:uppercase;">${label}</div>
      </div>`;
    statsEl.innerHTML =
      statPill(`${days}d Avg`, avgScore, avgScore>=70?'#00e676':avgScore>=40?'#ff9800':'#f44336') +
      statPill('Peak', highScore, '#00e676') +
      statPill('Low', lowScore, '#f44336') +
      statPill('Green Days', greenDays + '/' + validScores.length, '#00e676');
  }

  // Update subtitle
  const sub = document.getElementById('d-readiness-chart-sub');
  if (sub && personalAvg) sub.textContent = `Your ${days}-day avg: ${avgScore??'—'}/100 · Personal baseline: ${personalAvg}/100`;

  // Canvas dimensions
  const wrap = canvas.parentElement;
  const W = wrap.clientWidth;
  const H = days <= 7 ? 160 : 200;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const padL = 36, padR = 12, padT = 16, padB = 28;
  const cW = W - padL - padR;
  const cH = H - padT - padB;
  const n = dateArr.length;

  // Grid lines at 0, 40, 70, 100
  [0, 40, 70, 100].forEach(val => {
    const y = padT + cH * (1 - val/100);
    ctx.strokeStyle = val === 70 ? 'rgba(0,230,118,0.2)' : val === 40 ? 'rgba(255,152,0,0.2)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = val === 70 || val === 40 ? 1.5 : 1;
    ctx.setLineDash(val === 70 || val === 40 ? [4,4] : []);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(90,112,128,0.7)';
    ctx.font = '9px DM Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val, padL - 4, y + 3);
  });
  ctx.textAlign = 'left';

  // Bar width
  const barW = Math.max(4, Math.floor(cW / n) - 2);
  const barGap = cW / n;

  // Draw bars
  scores.forEach((score, i) => {
    const x = padL + i * barGap + (barGap - barW) / 2;
    const isToday = i === n - 1;
    // Past days with no log: show a subtle grey placeholder so gaps are visible
    const isPast = i < n - 1;
    if (score === null) {
      if (isPast) {
        // Faint grey "missed" bar — short stub at bottom
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ffffff';
        const stubH = 6;
        ctx.fillRect(x, padT + cH - stubH, barW, stubH);
        ctx.globalAlpha = 1.0;
        // Small "?" label for very recent missed days (last 7)
        if (i >= n - 7 && barW > 10) {
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.font = '8px DM Sans, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('?', x + barW/2, padT + cH - 10);
          ctx.textAlign = 'left';
        }
      }
      return;
    }
    const barH = Math.max(2, cH * (score / 100));
    const y = padT + cH - barH;
    const color = score >= 70 ? '#00e676' : score >= 40 ? '#ff9800' : '#f44336';
    ctx.globalAlpha = isToday ? 1.0 : 0.75;
    ctx.fillStyle = color;
    // Rounded top corners
    const r = Math.min(3, barW/2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, y + barH);
    ctx.lineTo(x, y + barH);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
    // Score label on bar if tall enough
    if (barH > 18 && barW > 12) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.font = 'bold 9px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(score, x + barW/2, y + 11);
    }
  });
  ctx.textAlign = 'left';

  // Personal avg line (dashed white)
  const avgY = padT + cH * (1 - personalAvg/100);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(padL, avgY); ctx.lineTo(padL + cW, avgY); ctx.stroke();
  ctx.setLineDash([]);

  // Rolling 7-day avg line (cyan)
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.8;
  let lineStarted = false;
  rollingAvg.forEach((val, i) => {
    if (val === null) { lineStarted = false; return; }
    const x = padL + i * barGap + barGap / 2;
    const y = padT + cH * (1 - val/100);
    if (!lineStarted) { ctx.beginPath(); ctx.moveTo(x, y); lineStarted = true; }
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // X-axis date labels — show every Nth
  const labelStep = days <= 7 ? 1 : days <= 14 ? 2 : 4;
  ctx.fillStyle = 'rgba(90,112,128,0.8)';
  ctx.font = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  dateArr.forEach((date, i) => {
    if (i % labelStep !== 0 && i !== n - 1) return;
    const x = padL + i * barGap + barGap / 2;
    const label = date.slice(5); // MM-DD
    ctx.fillText(label, x, H - 6);
  });

  // ── Click handler — show day detail popup ──────────────────────
  canvas.style.cursor = 'pointer';
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    // Find nearest bar index
    let closest = -1, minDx = 9999;
    dateArr.forEach((_, i) => {
      const cx = padL + i * barGap + barGap / 2;
      const dx = Math.abs(mx - cx);
      if (dx < minDx) { minDx = dx; closest = i; }
    });
    if (closest >= 0 && minDx < barGap) {
      showReadinessDayPopup(dateArr[closest], scores[closest]);
    }
  };
}

function showReadinessDayPopup(date, score) {
  // Remove any existing popup
  document.getElementById('rdp-overlay')?.remove();

  const m = D.mornings.find(x => x.date === date);
  const fmtDate = new Date(date + 'T12:00:00').toLocaleDateString('en-AU', {weekday:'long', day:'numeric', month:'long'});

  // Strava activities for this day
  const acts = (typeof STRAVA_ACTS !== 'undefined' ? STRAVA_ACTS.acts : [])
    .filter(a => a.d === date && a.mm && a.mm >= 5)
    .map(a => {
      const hrs = a.mm >= 60 ? Math.floor(a.mm/60)+'h '+(Math.round(a.mm%60)>0?Math.round(a.mm%60)+'min':'') : Math.round(a.mm)+'min';
      const ef = a.ef ? ` · <span style="color:${a.ef==='hard'||a.ef==='max'?'var(--red)':a.ef==='moderate'?'var(--orange)':'var(--cyan)'}">${a.ef}</span>` : '';
      const dist = a.dk > 0 ? ` · ${a.dk.toFixed(1)}km` : '';
      return `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border);">${a.s} · ${hrs}${dist}${ef}</div>`;
    }).join('') || '<div style="font-size:11px;color:var(--text-dim);padding:4px 0;">No Strava activities logged</div>';

  // Planner link date
  const wkKey = typeof getWeekKey === 'function' ? getWeekKey(new Date(date + 'T12:00:00')) : '';

  // Score colour
  const scoreColor = !score ? 'var(--text-dim)' : score >= 70 ? '#00e676' : score >= 40 ? '#ff9800' : '#f44336';
  const scoreLabel = !score ? 'No Log' : score >= 85 ? 'OPTIMAL' : score >= 70 ? 'GOOD' : score >= 55 ? 'MODERATE' : score >= 40 ? 'CAUTION' : 'REST';

  // Personal baselines
  const allHRV = D.mornings.filter(x=>x.hrv).map(x=>x.hrv);
  const baseHRV = allHRV.length >= 5 ? Math.round(allHRV.slice(-30).reduce((a,b)=>a+b,0)/Math.min(allHRV.slice(-30).length,30)) : 83;
  const allSleep = D.mornings.filter(x=>x.sleepScore).map(x=>x.sleepScore);
  const baseSleep = allSleep.length >= 5 ? Math.round(allSleep.slice(-30).reduce((a,b)=>a+b,0)/Math.min(allSleep.slice(-30).length,30)) : 85;

  const pill = (label, val, color, baseline) => {
    if (val == null) return `<div style="background:var(--surface2);border-radius:8px;padding:8px;text-align:center;opacity:0.4;"><div style="font-size:9px;color:var(--text-dim);">${label}</div><div style="font-size:18px;color:var(--text-dim);">—</div></div>`;
    const delta = baseline ? val - baseline : null;
    const deltaStr = delta != null ? `<div style="font-size:9px;color:${Math.abs(delta)<3?'var(--text-dim)':delta>0?'#00e676':'#f44336'};">${delta>0?'+':''}${Math.round(delta)} vs avg</div>` : '';
    return `<div style="background:var(--surface2);border-radius:8px;padding:8px;text-align:center;">
      <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;">${label}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${color};">${val}</div>
      ${deltaStr}
    </div>`;
  };

  const html = `
  <div id="rdp-overlay" onclick="if(event.target===this)document.getElementById('rdp-overlay').remove()"
    style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:14px;padding:24px;width:min(520px,98vw);max-height:90vh;overflow-y:auto;">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${scoreColor};">${scoreLabel}</div>
          <div style="font-size:13px;color:var(--text-dim);">${fmtDate}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${score ? `<div style="font-family:'Bebas Neue',sans-serif;font-size:42px;color:${scoreColor};line-height:1;">${score}<span style="font-size:16px;color:var(--text-dim);">/100</span></div>` : '<div style="font-size:13px;color:var(--text-dim);">No morning log</div>'}
          <button onclick="document.getElementById('rdp-overlay').remove()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--text);cursor:pointer;font-size:13px;">✕</button>
        </div>
      </div>

      ${m ? `
      <!-- Garmin metrics grid -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px;">
        ${pill('HRV', m.hrv, m.hrv >= baseHRV ? '#2196f3' : m.hrv >= baseHRV*0.93 ? '#64b5f6' : '#f44336', baseHRV)}
        ${pill('Resting HR', m.rhr ? m.rhr+'bpm' : null, m.rhr <= 48 ? '#00e676' : m.rhr <= 52 ? '#ff9800' : '#f44336')}
        ${pill('Sleep', m.sleepScore, m.sleepScore >= baseSleep ? '#ce93d8' : m.sleepScore >= baseSleep-8 ? '#ff9800' : '#f44336', baseSleep)}
        ${pill('Stress', m.gstress, m.gstress <= 30 ? '#00e676' : m.gstress <= 40 ? '#ff9800' : '#f44336')}
      </div>
      ${(m.sleep||m.note) ? `
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        ${m.sleep ? `<span style="background:var(--surface2);border-radius:6px;padding:4px 10px;font-size:11px;">😴 ${m.sleep}h sleep</span>` : ''}
        ${m.legs ? `<span style="background:var(--surface2);border-radius:6px;padding:4px 10px;font-size:11px;">🦵 Legs: ${m.legs}/5</span>` : ''}
        ${m.readiness ? `<span style="background:var(--surface2);border-radius:6px;padding:4px 10px;font-size:11px;">⚡ Readiness: ${m.readiness}/5</span>` : ''}
        ${m.note ? `<span style="background:var(--surface2);border-radius:6px;padding:4px 10px;font-size:11px;color:var(--text-dim);">📝 ${m.note}</span>` : ''}
      </div>` : ''}
      ` : `<div style="background:var(--surface2);border-radius:8px;padding:12px;margin-bottom:14px;text-align:center;font-size:12px;color:var(--text-dim);">No morning check logged this day</div>`}

      <!-- Training that day -->
      <div style="margin-bottom:14px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text-dim);margin-bottom:8px;">TRAINING THIS DAY</div>
        ${acts}
      </div>

      <!-- Action buttons -->
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button onclick="document.getElementById('rdp-overlay').remove();nav('morning')" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px;color:var(--text);cursor:pointer;">📋 Morning Check</button>
        <button onclick="document.getElementById('rdp-overlay').remove();currentWeekKey='${wkKey}';nav('planner')" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px;color:var(--text);cursor:pointer;">📅 Open in Planner</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

// ===== PBs =====
function renderPBs(){
  const cats={swim:'pb-swim-list',bike:'pb-bike-list',run:'pb-run-list',tri:'pb-tri-list',phys:'pb-phys-list'};
  Object.entries(cats).forEach(([cat,elId])=>{
    const el=document.getElementById(elId);if(!el)return;
    const items=D.pbs[cat]||[];
    const color = cat==='swim'?'var(--blue)':cat==='bike'?'var(--orange)':cat==='run'?'var(--green)':cat==='tri'?'var(--purple)':'var(--text)';
    const isWarn = v => v && v.includes('⚠');
    const isDash = v => !v || v === '—';
    if(cat === 'bike') {
      // Bike: 2-column grid for power curve
      el.innerHTML = items.length ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        items.map(pb => {
          const vc = isDash(pb.v)?'var(--text-dim)':isWarn(pb.v)?'var(--orange)':'var(--orange)';
          return `<div style="background:var(--surface2);border-radius:6px;padding:8px 10px;">
            <div style="font-size:10px;color:var(--text-dim);margin-bottom:2px;">${pb.n}</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:${vc};">${pb.v||'—'}</div>
            ${pb.note?`<div style="font-size:9px;color:var(--text-dim);line-height:1.3;">${pb.note}</div>`:''}
          </div>`;
        }).join('') + '</div>'
        : '<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">No entries yet</div>';
    } else {
      el.innerHTML = items.length ? items.map(pb => {
        const vc = isDash(pb.v)?'var(--text-dim)':isWarn(pb.v)?'var(--orange)':color;
        return `<div class="pb-row">
          <span style="font-size:12px;color:var(--text-mid);">${pb.n}</span>
          <div style="text-align:right;">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:${vc};">${pb.v||'—'}</div>
            ${pb.note?`<div style="font-size:10px;color:var(--text-dim);">${pb.note}</div>`:''}
          </div>
        </div>`;
      }).join('') : '<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">No entries yet — click Edit All PBs to add</div>';
    }
  });
}

function openMyPBModal(){
  const cats=['swim','bike','run','tri','phys'];
  cats.forEach(cat=>{
    const div=document.getElementById('pb-edit-'+cat);
    const items=D.pbs[cat]||[];
    // Keep header, rebuild rows
    const header=div.querySelector('.sl')?div.querySelector('.sl').outerHTML:'';
    div.innerHTML=header;
    items.forEach((pb,i)=>{
      const row=document.createElement('div');
      row.style.cssText='display:flex;gap:6px;margin-bottom:6px;align-items:center;';
      row.innerHTML=`<input type="text" value="${pb.n}" placeholder="Name" id="pb-n-${cat}-${i}" style="flex:1.2;"><input type="text" value="${pb.v}" placeholder="Value" id="pb-v-${cat}-${i}" style="flex:1;"><input type="text" value="${pb.note||''}" placeholder="Note" id="pb-note-${cat}-${i}" style="flex:1;"><button onclick="this.parentElement.remove()" style="background:var(--red-dim);border:none;border-radius:5px;color:var(--red);cursor:pointer;padding:6px 8px;font-size:12px;">✕</button>`;
      div.appendChild(row);
    });
    const addBtn=document.createElement('button');
    addBtn.className='btn sec sml';addBtn.textContent='+ Add Entry';addBtn.style.marginBottom='12px';
    addBtn.onclick=()=>{
      const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;margin-bottom:6px;align-items:center;';
      const idx=div.querySelectorAll('[id^="pb-n-'+cat+'"]').length;
      row.innerHTML=`<input type="text" placeholder="Name" id="pb-n-${cat}-${idx}" style="flex:1.2;"><input type="text" placeholder="Value" id="pb-v-${cat}-${idx}" style="flex:1;"><input type="text" placeholder="Note" id="pb-note-${cat}-${idx}" style="flex:1;"><button onclick="this.parentElement.remove()" style="background:var(--red-dim);border:none;border-radius:5px;color:var(--red);cursor:pointer;padding:6px 8px;font-size:12px;">✕</button>`;
      div.insertBefore(row,addBtn);
    };
    div.appendChild(addBtn);
  });
  document.getElementById('pb-modal').classList.add('open');
}

function closeMyPBModal(){document.getElementById('pb-modal').classList.remove('open');}

function savePBs(){
  const cats=['swim','bike','run','tri','phys'];
  cats.forEach(cat=>{
    const items=[];
    document.querySelectorAll(`[id^="pb-n-${cat}-"]`).forEach(el=>{
      const idx=el.id.split('-').pop();
      const n=el.value.trim(),v=document.getElementById(`pb-v-${cat}-${idx}`)?.value.trim(),note=document.getElementById(`pb-note-${cat}-${idx}`)?.value.trim();
      if(n&&v)items.push({n,v,note:note||''});
    });
    D.pbs[cat]=items;
  });
  save();
  renderPBs();
  closeMyPBModal();
  // Bust predictor cache — PB changes affect FTP, threshold, CSS, race predictions
  window._predState = null;
  // Re-render race predictor if it's visible
  if(typeof renderRacePredictor==='function' && document.getElementById('page-performance')?.classList.contains('active')){
    setTimeout(renderRacePredictor, 50);
  }
  // Always re-render dashboard race predictor mini widget
  if(typeof renderDashboardRacePredictor==='function') setTimeout(renderDashboardRacePredictor, 80);
  // Update goal progress bars that reference FTP/CSS
  updateDashboard();
  showToast('PBs updated ✓ — predictor recalculated');
}

// ===== UTILS =====
function confirmClear(){if(confirm('Clear all data? Cannot be undone.')){D={mornings:[],checkins:[],pbs:D.pbs,plans:{}};save();updateDashboard();renderHistory();showToast('Data cleared');}}

function showToast(msg,err=false,duration=2500){
  const t=document.getElementById('toast');t.textContent=msg;t.className='toast'+(err?' err':'');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),duration);
}

// ===== STRAVA DATA =====
const STRAVA_ACTS = {"acts": [{"id": 10713297231, "d": "2024-02-07", "n": "Evening Run", "s": "Run", "dk": 5.196, "mm": 37.7, "p": 7.25, "ef": "moderate"}, {"id": 10738278780, "d": "2024-02-11", "n": "Evening Run", "s": "Run", "dk": 4.898, "mm": 35.0, "p": 7.15, "ef": "moderate"}, {"id": 13077644021, "d": "2024-12-09", "n": "Evening Run", "s": "Run", "dk": 8.447, "mm": 66.1, "p": 7.821, "ef": "moderate"}, {"id": 13192959319, "d": "2024-12-26", "n": "Night Run", "s": "Run", "dk": 10.7, "mm": 82.7, "p": 7.723, "ef": "moderate"}, {"id": 13262947980, "d": "2025-01-04", "n": "Night Run", "s": "Run", "dk": 16.621, "mm": 132.4, "p": 7.967, "ef": "moderate"}, {"id": 13270690796, "d": "2025-01-05", "n": "Evening Run", "s": "Run", "dk": 5.073, "mm": 33.5, "p": 6.601, "ef": "moderate"}, {"id": 13331012968, "d": "2025-01-12", "n": "Evening Run", "s": "Run", "dk": 10.294, "mm": 72.7, "p": 7.065, "ef": "moderate"}, {"id": 13359856823, "d": "2025-01-15", "n": "Evening Run", "s": "Run", "dk": 5.103, "mm": 33.1, "p": 6.48, "ef": "moderate"}, {"id": 13394604691, "d": "2025-01-19", "n": "Evening Run", "s": "Run", "dk": 15.411, "mm": 113.8, "p": 7.384, "ef": "moderate"}, {"id": 13438281859, "d": "2025-01-24", "n": "Evening Run", "s": "Run", "dk": 9.29, "mm": 63.6, "p": 6.845, "ef": "moderate"}, {"id": 13455457271, "d": "2025-01-26", "n": "Evening Run", "s": "Run", "dk": 10.212, "mm": 71.6, "p": 7.015, "ef": "moderate"}, {"id": 13482145421, "d": "2025-01-29", "n": "Evening Run", "s": "Run", "dk": 5.798, "mm": 43.2, "p": 7.457, "ef": "moderate"}, {"id": 13515146902, "d": "2025-01-29", "n": "Lunch Run", "s": "Run", "dk": 1.87, "mm": 9.7, "p": 5.187, "ef": "moderate"}, {"id": 13515555205, "d": "2025-02-02", "n": "Afternoon Run", "s": "Run", "dk": 22.084, "mm": 173.9, "p": 7.876, "ef": "moderate"}, {"id": 13578696827, "d": "2025-02-09", "n": "Afternoon Run", "s": "Run", "dk": 6.326, "mm": 44.6, "p": 7.056, "ef": "moderate"}, {"id": 13578768605, "d": "2025-02-09", "n": "Evening Run", "s": "Run", "dk": 1.453, "mm": 6.8, "p": 4.679, "ef": "moderate"}, {"id": 13639735015, "d": "2025-02-10", "n": "Evening Run", "s": "Run", "dk": 6.092, "mm": 30.0, "p": 4.93, "ef": "moderate"}, {"id": 13640125303, "d": "2025-02-16", "n": "Evening Run", "s": "Run", "dk": 6.651, "mm": 40.0, "p": 6.021, "ef": "moderate"}, {"id": 13668592738, "d": "2025-02-19", "n": "Night Run", "s": "Run", "dk": 11.531, "mm": 84.1, "p": 7.294, "ef": "moderate"}, {"id": 13703320697, "d": "2025-02-23", "n": "Night Run", "s": "Run", "dk": 10.005, "mm": 57.8, "p": 5.779, "ef": "moderate"}, {"id": 13758129303, "d": "2025-03-01", "n": "Night Run", "s": "Run", "dk": 10.145, "mm": 73.6, "p": 7.256, "ef": "moderate"}, {"id": 13766979086, "d": "2025-03-02", "n": "Night Run", "s": "Run", "dk": 10.206, "mm": 69.3, "p": 6.794, "ef": "moderate"}, {"id": 13860682362, "d": "2025-03-12", "n": "Night Run", "s": "Run", "dk": 13.379, "mm": 80.8, "p": 6.036, "ef": "moderate"}, {"id": 13888982661, "d": "2025-03-15", "n": "Night Run", "s": "Run", "dk": 15.003, "mm": 89.7, "p": 5.98, "ef": "moderate"}, {"id": 13894896217, "d": "2025-03-16", "n": "Almost drowned", "s": "Swim", "dk": 1.15, "mm": 45.0, "sp": 3.913, "ef": "moderate"}, {"id": 13953600078, "d": "2025-03-22", "n": "Night Run", "s": "Run", "dk": 10.992, "mm": 68.9, "p": 6.266, "ef": "moderate"}, {"id": 13971773388, "d": "2025-03-24", "n": "Night Run", "s": "Run", "dk": 10.25, "mm": 72.8, "p": 7.101, "ef": "moderate"}, {"id": 13990819743, "d": "2025-03-26", "n": "10x1km interval (90s rest)", "s": "Run", "dk": 10.004, "mm": 51.4, "p": 5.141, "ef": "hard", "iv": true}, {"id": 14019483090, "d": "2025-03-29", "n": "5x1km (3min rest)", "s": "Run", "dk": 5.0, "mm": 22.9, "p": 4.586, "ef": "moderate"}, {"id": 14029798652, "d": "2025-03-30", "n": "Week 1 done 📈", "s": "Run", "dk": 15.001, "mm": 115.6, "p": 7.705, "ef": "moderate"}, {"id": 14036614795, "d": "2025-03-31", "n": "12.5km accidentally paused it - easy run", "s": "Run", "dk": 10.332, "mm": 78.7, "p": 7.621, "ef": "moderate"}, {"id": 14057000296, "d": "2025-04-02", "n": "15x500m intervals (90s rest) (7.5km total)", "s": "Run", "dk": 7.504, "mm": 31.4, "p": 4.189, "ef": "hard", "iv": true}, {"id": 14086505118, "d": "2025-04-05", "n": "Night Run", "s": "Run", "dk": 4.574, "mm": 25.6, "hr": 185, "tl": 103.0, "p": 5.604, "rc": 81, "ef": "hard"}, {"id": 14093392969, "d": "2025-04-06", "n": "Week 2 done 📈", "s": "Run", "dk": 17.091, "mm": 128.0, "hr": 154, "tl": 200.0, "p": 7.491, "rc": 80, "ef": "easy"}, {"id": 14103907535, "d": "2025-04-07", "n": "Supposed to be an easy run (felt pretty easy though so a bit quicker)", "s": "Run", "dk": 10.01, "mm": 63.1, "hr": 165, "tl": 158.0, "p": 6.301, "rc": 81, "ef": "moderate"}, {"id": 14137789500, "d": "2025-04-11", "n": "7x1km @ 5.07 w/ 90s rest + 3km @ 6.35 pace on treadmill", "s": "Run", "dk": 10.0, "mm": 60.0, "p": 6.0, "ef": "moderate"}, {"id": 14160809708, "d": "2025-04-13", "n": "Week 3 done 📈", "s": "Run", "dk": 21.139, "mm": 161.1, "hr": 156, "tl": 294.0, "p": 7.621, "rc": 80, "ef": "moderate"}, {"id": 14172613387, "d": "2025-04-14", "n": "Easy Run", "s": "Run", "dk": 10.141, "mm": 82.8, "hr": 146, "tl": 86.0, "p": 8.17, "rc": 79, "ef": "easy"}, {"id": 14193749106, "d": "2025-04-16", "n": "Treadmill (stats are wrong)\n\n12x500m Intervals (90s rest) @ 4.15", "s": "Run", "dk": 6.11, "mm": 41.3, "hr": 176, "tl": 138.0, "p": 6.759, "rc": 81, "ef": "hard", "iv": true}, {"id": 14211046030, "d": "2025-04-18", "n": "Treadmill: \n1x1km @ 5.21\n1x0.5km @ 7.07\nX7", "s": "Run", "dk": 11.563, "mm": 63.0, "hr": 180, "tl": 245.0, "p": 5.454, "rc": 80, "ef": "hard"}, {"id": 14228146643, "d": "2025-04-20", "n": "Morning Run", "s": "Run", "dk": 4.858, "mm": 39.8, "hr": 152, "tl": 58.0, "p": 8.19, "rc": 80, "ef": "easy"}, {"id": 14241858999, "d": "2025-04-21", "n": "Treadmill (stats wrong)\n\n15km @ 6.31 pace", "s": "Run", "dk": 17.262, "mm": 97.7, "hr": 173, "tl": 327.0, "p": 5.661, "rc": 80, "ef": "hard"}, {"id": 14248054110, "d": "2025-04-22", "n": "21km Part 1", "s": "Run", "dk": 10.005, "mm": 57.2, "hr": 174, "tl": 186.0, "p": 5.721, "rc": 82, "ef": "hard"}, {"id": 14248315255, "d": "2025-04-22", "n": "21km Part 2", "s": "Run", "dk": 11.261, "mm": 71.1, "hr": 166, "tl": 177.0, "p": 6.313, "rc": 81, "ef": "moderate"}, {"id": 14298864170, "d": "2025-04-27", "n": "Treadmill run - 11km (1hr 9 mins) w/ 2km warm up included", "s": "Run", "dk": 12.215, "mm": 75.9, "hr": 171, "tl": 225.0, "p": 6.21, "rc": 79, "ef": "hard"}, {"id": 14313200364, "d": "2025-04-28", "n": "12km (including 2km warm up)", "s": "Run", "dk": 12.67, "mm": 73.5, "hr": 177, "tl": 260.0, "p": 5.803, "rc": 79, "ef": "hard"}, {"id": 14329423208, "d": "2025-04-30", "n": "Phuket running - 33 degrees / 9 UV", "s": "Run", "dk": 9.036, "mm": 65.7, "hr": 164, "tl": 148.0, "p": 7.268, "rc": 80, "ef": "moderate"}, {"id": 14344389171, "d": "2025-05-01", "n": "6.40 pace for 1hr 30min (was 13.5km)", "s": "Run", "dk": 15.674, "mm": 89.8, "hr": 168, "tl": 240.0, "p": 5.733, "rc": 79, "ef": "moderate"}, {"id": 14384896473, "d": "2025-05-05", "n": "Treadmill Run in Patong - 17km @6.31 ish", "s": "Run", "dk": 19.64, "mm": 113.0, "hr": 160, "tl": 222.0, "p": 5.757, "rc": 79, "ef": "moderate"}, {"id": 14452840829, "d": "2025-05-12", "n": "Long Run!", "s": "Run", "dk": 25.468, "mm": 191.4, "hr": 161, "tl": 402.0, "p": 7.518, "rc": 80, "ef": "moderate"}, {"id": 14477600700, "d": "2025-05-14", "n": "Intervals (Started to quickly)", "s": "Run", "dk": 8.328, "mm": 62.1, "hr": 180, "tl": 214.0, "p": 7.457, "rc": 78, "ef": "hard", "iv": true}, {"id": 14498367867, "d": "2025-05-16", "n": "Speedy 15km with new equipment!", "s": "Run", "dk": 15.009, "mm": 103.2, "hr": 165, "tl": 250.0, "p": 6.873, "rc": 79, "ef": "moderate"}, {"id": 14527956397, "d": "2025-05-19", "n": "Sheri Half Marathon PB + Race Pace trial!", "s": "Run", "dk": 21.125, "mm": 148.9, "hr": 161, "tl": 305.0, "p": 7.05, "rc": 79, "ef": "moderate"}, {"id": 14560251330, "d": "2025-05-22", "n": "Night Run", "s": "Run", "dk": 7.224, "mm": 52.9, "hr": 148, "tl": 64.0, "p": 7.316, "rc": 78, "ef": "easy"}, {"id": 14585697464, "d": "2025-05-25", "n": "Morning Run", "s": "Run", "dk": 35.072, "mm": 255.7, "hr": 166, "tl": 656.0, "p": 7.291, "rc": 80, "ef": "moderate"}, {"id": 14629158954, "d": "2025-05-29", "n": "Evening Run", "s": "Run", "dk": 1.531, "mm": 11.4, "hr": 158, "tl": 21.0, "p": 7.46, "rc": 77, "ef": "moderate"}, {"id": 14657340947, "d": "2025-06-01", "n": "Morning Run", "s": "Run", "dk": 42.261, "mm": 308.5, "hr": 168, "tl": 862.0, "p": 7.3, "rc": 77, "ef": "moderate"}, {"id": 14887529683, "d": "2025-06-23", "n": "Afternoon Run", "s": "Run", "dk": 3.008, "mm": 21.4, "hr": 154, "tl": 17.0, "p": 7.11, "rc": 77, "ef": "easy"}, {"id": 14918371863, "d": "2025-06-26", "n": "Afternoon Run", "s": "Run", "dk": 5.492, "mm": 35.5, "hr": 179, "tl": 97.0, "p": 6.457, "rc": 80, "ef": "hard"}, {"id": 14948072938, "d": "2025-06-29", "n": "Lunch Run", "s": "Run", "dk": 6.703, "mm": 49.8, "hr": 164, "tl": 79.0, "p": 7.431, "rc": 79, "ef": "moderate"}, {"id": 14949140796, "d": "2025-06-29", "n": "Afternoon Swim", "s": "Swim", "dk": 1.0, "mm": 17.2, "hr": 146, "tl": 34.0, "sp": 1.717, "ef": "easy"}, {"id": 14968850567, "d": "2025-07-01", "n": "Afternoon Run", "s": "Run", "dk": 3.546, "mm": 20.9, "hr": 171, "tl": 39.0, "p": 5.896, "rc": 78, "ef": "hard"}, {"id": 14990582419, "d": "2025-07-03", "n": "Intervals", "s": "Run", "dk": 8.53, "mm": 58.8, "hr": 181, "tl": 166.0, "p": 6.893, "rc": 80, "ef": "hard", "iv": true}, {"id": 15015282265, "d": "2025-07-05", "n": "10x1km @5.07 w/ 3min rest", "s": "Run", "dk": 10.734, "mm": 93.2, "hr": 175, "tl": 210.0, "p": 8.685, "rc": 79, "ef": "hard"}, {"id": 15041890462, "d": "2025-07-08", "n": "Warm up", "s": "Run", "dk": 0.986, "mm": 5.7, "hr": 170, "tl": 10.0, "p": 5.813, "rc": 79, "ef": "moderate"}, {"id": 15041890478, "d": "2025-07-08", "n": "Intervals", "s": "Run", "dk": 5.387, "mm": 23.3, "hr": 184, "tl": 71.0, "p": 4.319, "rc": 85, "ef": "hard", "iv": true}, {"id": 15064708156, "d": "2025-07-10", "n": "Afternoon Run", "s": "Run", "dk": 0.883, "mm": 5.4, "hr": 158, "tl": 6.0, "p": 6.096, "rc": 78, "ef": "moderate"}, {"id": 15065161592, "d": "2025-07-10", "n": "Interval - 10x1km (3min rest)", "s": "Run", "dk": 10.011, "mm": 46.9, "hr": 184, "tl": 147.0, "p": 4.688, "rc": 82, "ef": "hard", "iv": true}, {"id": 15096061322, "d": "2025-07-13", "n": "Afternoon Run", "s": "Run", "dk": 12.146, "mm": 70.9, "hr": 182, "tl": 204.0, "p": 5.834, "rc": 81, "ef": "hard"}, {"id": 15117743004, "d": "2025-07-15", "n": "15x500m w/ 90s rest (goal was sub 4.00)", "s": "Run", "dk": 7.499, "mm": 29.8, "hr": 182, "tl": 87.0, "p": 3.967, "rc": 87, "ef": "hard"}, {"id": 15140494899, "d": "2025-07-17", "n": "Failed", "s": "Run", "dk": 7.423, "mm": 33.8, "hr": 184, "tl": 105.0, "p": 4.551, "rc": 85, "ef": "hard"}, {"id": 15172106408, "d": "2025-07-20", "n": "5x Loop Practice", "s": "Run", "dk": 30.398, "mm": 287.3, "hr": 142, "tl": 214.0, "p": 9.448, "rc": 71, "ef": "easy"}, {"id": 15193599628, "d": "2025-07-22", "n": "Afternoon Run", "s": "Run", "dk": 5.009, "mm": 23.4, "hr": 186, "tl": 87.0, "p": 4.669, "rc": 84, "ef": "hard"}, {"id": 15216934879, "d": "2025-07-24", "n": "Failed", "s": "Run", "dk": 6.207, "mm": 29.9, "hr": 187, "tl": 113.0, "p": 4.82, "rc": 82, "ef": "hard"}, {"id": 15216934868, "d": "2025-07-24", "n": "Afternoon Run", "s": "Run", "dk": 2.071, "mm": 11.7, "hr": 179, "tl": 36.0, "p": 5.65, "rc": 81, "ef": "hard"}, {"id": 15237898221, "d": "2025-07-26", "n": "Afternoon Ride", "s": "Bike", "dk": 19.925, "mm": 95.2, "hr": 109, "tl": 16.0, "vr": false, "ef": "easy"}, {"id": 15249842043, "d": "2025-07-27", "n": "7x Loop Practice", "s": "Run", "dk": 42.498, "mm": 338.0, "hr": 138, "tl": 269.0, "p": 7.952, "rc": 72, "ef": "easy"}, {"id": 15260471435, "d": "2025-07-28", "n": "Afternoon Ride", "s": "Bike", "dk": 14.349, "mm": 53.9, "hr": 121, "tl": 15.0, "vr": false, "ef": "easy"}, {"id": 15270348351, "d": "2025-07-29", "n": "Afternoon Run", "s": "Run", "dk": 7.012, "mm": 38.5, "hr": 173, "tl": 101.0, "p": 5.493, "rc": 82, "ef": "hard"}, {"id": 15294113160, "d": "2025-07-31", "n": "7x1km w/ 3min rest", "s": "Run", "dk": 7.012, "mm": 29.0, "hr": 177, "tl": 84.0, "p": 4.136, "rc": 87, "ef": "hard"}, {"id": 15305577699, "d": "2025-08-01", "n": "Afternoon Ride", "s": "Bike", "dk": 30.027, "mm": 117.6, "hr": 111, "tl": 22.0, "vr": false, "ef": "easy"}, {"id": 15325507772, "d": "2025-08-03", "n": "Lunch Run", "s": "Run", "dk": 5.914, "mm": 31.0, "hr": 178, "tl": 99.0, "p": 5.248, "rc": 84, "ef": "hard"}, {"id": 15361370226, "d": "2025-08-06", "n": "Afternoon Run", "s": "Run", "dk": 5.004, "mm": 32.7, "hr": 156, "tl": 43.0, "p": 6.539, "rc": 79, "ef": "moderate"}, {"id": 15387578851, "d": "2025-08-08", "n": "Morning Run", "s": "Run", "dk": 90.779, "mm": 683.7, "hr": 148, "tl": 658.0, "p": 7.531, "rc": 77, "ef": "easy"}, {"id": 15418508559, "d": "2025-08-11", "n": "Afternoon Ride", "s": "Bike", "dk": 57.275, "mm": 200.4, "hr": 115, "tl": 41.0, "vr": false, "ef": "easy"}, {"id": 15463193165, "d": "2025-08-12", "n": "Afternoon Run", "s": "Run", "dk": 4.006, "mm": 26.2, "hr": 152, "tl": 26.0, "p": 6.533, "rc": 80, "ef": "easy"}, {"id": 15463193244, "d": "2025-08-15", "n": "Afternoon Ride", "s": "Bike", "dk": 19.989, "mm": 62.9, "hr": 144, "tl": 51.0, "vr": false, "ef": "easy"}, {"id": 15521896918, "d": "2025-08-18", "n": "Afternoon Run", "s": "Run", "dk": 5.086, "mm": 28.1, "hr": 153, "tl": 30.0, "p": 5.515, "rc": 82, "ef": "easy"}, {"id": 15521901279, "d": "2025-08-20", "n": "Evening Run", "s": "Run", "dk": 10.016, "mm": 59.0, "hr": 156, "tl": 69.0, "p": 5.893, "rc": 81, "ef": "moderate"}, {"id": 15542784397, "d": "2025-08-22", "n": "Lunch Run", "s": "Run", "dk": 15.007, "mm": 81.8, "hr": 182, "tl": 284.0, "p": 5.45, "rc": 84, "ef": "hard"}, {"id": 15544675168, "d": "2025-08-22", "n": "Afternoon Ride", "s": "Bike", "dk": 18.381, "mm": 68.8, "hr": 140, "tl": 45.0, "vr": false, "ef": "easy"}, {"id": 15564843623, "d": "2025-08-24", "n": "Afternoon Run", "s": "Run", "dk": 10.095, "mm": 58.1, "hr": 170, "tl": 131.0, "p": 5.759, "rc": 82, "ef": "moderate"}, {"id": 15565517147, "d": "2025-08-24", "n": "Afternoon Ride", "s": "Bike", "dk": 20.237, "mm": 68.2, "hr": 137, "tl": 34.0, "vr": false, "ef": "easy"}, {"id": 15599935255, "d": "2025-08-27", "n": "Morning Run", "s": "Run", "dk": 15.901, "mm": 89.7, "hr": 182, "tl": 315.0, "p": 5.638, "rc": 82, "ef": "hard"}, {"id": 15611865112, "d": "2025-08-28", "n": "Lunch Ride", "s": "Bike", "dk": 6.915, "mm": 20.4, "hr": 132, "tl": 9.0, "vr": false, "ef": "easy"}, {"id": 15612124813, "d": "2025-08-28", "n": "Afternoon Ride", "s": "Bike", "dk": 7.217, "mm": 27.2, "hr": 145, "tl": 20.0, "vr": false, "ef": "easy"}, {"id": 15622268135, "d": "2025-08-29", "n": "Lunch Run", "s": "Run", "dk": 2.651, "mm": 18.7, "hr": 152, "tl": 20.0, "p": 7.047, "rc": 80, "ef": "easy"}, {"id": 15642909794, "d": "2025-08-31", "n": "Morning Ride", "s": "Bike", "dk": 24.079, "mm": 73.0, "hr": 138, "tl": 43.0, "vr": false, "ef": "easy"}, {"id": 15643784076, "d": "2025-08-31", "n": "Lunch Run", "s": "Run", "dk": 15.336, "mm": 83.8, "hr": 179, "tl": 268.0, "p": 5.468, "rc": 83, "ef": "hard"}, {"id": 15643816367, "d": "2025-08-31", "n": "Afternoon Run", "s": "Run", "dk": 1.235, "mm": 7.3, "hr": 166, "tl": 13.0, "p": 5.883, "rc": 82, "ef": "moderate"}, {"id": 15702120144, "d": "2025-09-05", "n": "Slow and fat", "s": "Run", "dk": 21.217, "mm": 122.5, "hr": 177, "tl": 370.0, "p": 5.771, "rc": 83, "ef": "hard"}, {"id": 15712069759, "d": "2025-09-06", "n": "Lunch Ride", "s": "Bike", "dk": 6.919, "mm": 19.7, "hr": 127, "tl": 6.0, "vr": false, "ef": "easy"}, {"id": 15712275437, "d": "2025-09-06", "n": "Afternoon Ride", "s": "Bike", "dk": 6.973, "mm": 25.9, "hr": 138, "tl": 16.0, "vr": false, "ef": "easy"}, {"id": 15713494594, "d": "2025-09-06", "n": "Afternoon Run", "s": "Run", "dk": 10.042, "mm": 65.9, "hr": 158, "tl": 101.0, "p": 6.562, "rc": 82, "ef": "moderate"}, {"id": 15726850554, "d": "2025-09-07", "n": "Afternoon Run", "s": "Run", "dk": 9.005, "mm": 59.7, "hr": 156, "tl": 79.0, "p": 6.635, "rc": 82, "ef": "moderate"}, {"id": 15747238854, "d": "2025-09-09", "n": "Warm up", "s": "Run", "dk": 1.016, "mm": 5.7, "hr": 148, "tl": 5.0, "p": 5.64, "rc": 82, "ef": "easy"}, {"id": 15747238871, "d": "2025-09-09", "n": "Biggest fail of all time", "s": "Run", "dk": 4.923, "mm": 22.5, "hr": 171, "tl": 54.0, "p": 4.57, "rc": 87, "ef": "hard"}, {"id": 15748539687, "d": "2025-09-09", "n": "Afternoon Run", "s": "Run", "dk": 10.014, "mm": 50.1, "hr": 178, "tl": 146.0, "p": 5.005, "rc": 86, "ef": "hard"}, {"id": 15760109935, "d": "2025-09-10", "n": "Afternoon Run", "s": "Run", "dk": 10.06, "mm": 65.7, "hr": 161, "tl": 107.0, "p": 6.531, "rc": 82, "ef": "moderate"}, {"id": 15771734298, "d": "2025-09-11", "n": "Afternoon Ride", "s": "Bike", "dk": 37.683, "mm": 118.7, "hr": 125, "tl": 33.0, "vr": false, "ef": "easy"}, {"id": 15782336030, "d": "2025-09-12", "n": "Lunch Run", "s": "Run", "dk": 15.996, "mm": 102.6, "hr": 175, "tl": 285.0, "p": 6.413, "rc": 80, "ef": "hard"}, {"id": 15804180227, "d": "2025-09-14", "n": "Afternoon Run", "s": "Run", "dk": 2.473, "mm": 14.3, "hr": 158, "tl": 19.0, "p": 5.783, "rc": 82, "ef": "moderate"}, {"id": 15804180448, "d": "2025-09-14", "n": "55km + 1000m elevation this week", "s": "Run", "dk": 9.445, "mm": 55.0, "hr": 182, "tl": 189.0, "p": 5.825, "rc": 82, "ef": "hard"}, {"id": 15815434593, "d": "2025-09-15", "n": "Morning Ride", "s": "Bike", "dk": 42.357, "mm": 128.5, "hr": 130, "tl": 45.0, "vr": false, "ef": "easy"}, {"id": 15830753581, "d": "2025-09-16", "n": "Lunch Run", "s": "Run", "dk": 15.002, "mm": 107.2, "hr": 154, "tl": 144.0, "p": 7.147, "rc": 82, "ef": "easy"}, {"id": 15850930172, "d": "2025-09-18", "n": "Mt Cootha Training ☠️", "s": "Run", "dk": 12.038, "mm": 105.9, "hr": 170, "tl": 245.0, "p": 8.795, "rc": 73, "ef": "moderate"}, {"id": 15858773011, "d": "2025-09-19", "n": "Morning Run", "s": "Run", "dk": 9.625, "mm": 57.1, "hr": 165, "tl": 111.0, "p": 5.935, "rc": 82, "ef": "moderate"}, {"id": 15883237519, "d": "2025-09-21", "n": "Lunch Run", "s": "Run", "dk": 19.026, "mm": 131.3, "hr": 168, "tl": 284.0, "p": 6.904, "rc": 79, "ef": "moderate"}, {"id": 15894512559, "d": "2025-09-22", "n": "Lunch Swim", "s": "Swim", "dk": 1.025, "mm": 24.5, "hr": 119, "tl": 15.0, "sp": 2.387, "ef": "easy"}, {"id": 15905321279, "d": "2025-09-23", "n": "Lunch Ride", "s": "Bike", "dk": 23.294, "mm": 72.9, "hr": 128, "tl": 25.0, "vr": false, "ef": "easy"}, {"id": 15905333289, "d": "2025-09-23", "n": "Afternoon Ride", "s": "Bike", "dk": 0.473, "mm": 2.1, "hr": 121, "vr": false, "ef": "easy"}, {"id": 15906315506, "d": "2025-09-23", "n": "Afternoon Run", "s": "Run", "dk": 10.542, "mm": 66.3, "hr": 154, "tl": 86.0, "p": 6.292, "rc": 82, "ef": "easy"}, {"id": 15916789584, "d": "2025-09-24", "n": "Lunch Swim", "s": "Swim", "dk": 1.05, "mm": 25.8, "hr": 132, "tl": 23.0, "sp": 2.457, "ef": "easy"}, {"id": 15918161830, "d": "2025-09-24", "n": "Afternoon Run", "s": "Run", "dk": 11.624, "mm": 78.6, "hr": 143, "tl": 37.0, "p": 6.764, "rc": 81, "ef": "easy"}, {"id": 15928299025, "d": "2025-09-25", "n": "Lunch Ride", "s": "Bike", "dk": 50.694, "mm": 124.8, "hr": 138, "tl": 64.0, "vr": false, "ef": "easy"}, {"id": 15939351211, "d": "2025-09-26", "n": "Afternoon Run", "s": "Run", "dk": 8.159, "mm": 59.3, "hr": 152, "tl": 64.0, "p": 7.265, "rc": 81, "ef": "easy"}, {"id": 15960011901, "d": "2025-09-28", "n": "Lunch Run", "s": "Run", "dk": 22.003, "mm": 146.7, "hr": 160, "tl": 219.0, "p": 6.667, "rc": 81, "ef": "moderate"}, {"id": 15983185532, "d": "2025-09-30", "n": "Painful", "s": "Run", "dk": 12.725, "mm": 113.3, "hr": 167, "tl": 203.0, "p": 8.903, "rc": 78, "ef": "moderate"}, {"id": 15995074108, "d": "2025-10-01", "n": "Afternoon Run", "s": "Run", "dk": 10.035, "mm": 58.0, "hr": 176, "tl": 168.0, "p": 5.779, "rc": 82, "ef": "hard"}, {"id": 16004983576, "d": "2025-10-02", "n": "Morning Ride", "s": "Bike", "dk": 5.694, "mm": 17.0, "hr": 122, "tl": 4.0, "vr": false, "ef": "easy"}, {"id": 16005629613, "d": "2025-10-02", "n": "Lunch Ride", "s": "Bike", "dk": 33.247, "mm": 102.3, "hr": 124, "tl": 28.0, "vr": false, "ef": "easy"}, {"id": 16016922772, "d": "2025-10-03", "n": "Afternoon Run", "s": "Run", "dk": 2.504, "mm": 18.6, "hr": 151, "tl": 18.0, "p": 7.427, "rc": 79, "ef": "easy"}, {"id": 16037016010, "d": "2025-10-05", "n": "Lunch Run", "s": "Run", "dk": 25.061, "mm": 163.3, "hr": 167, "tl": 335.0, "p": 6.518, "rc": 81, "ef": "moderate"}, {"id": 16059553058, "d": "2025-10-07", "n": "Mt Cootha Again 😅", "s": "Run", "dk": 12.706, "mm": 105.1, "hr": 169, "tl": 191.0, "p": 8.275, "rc": 79, "ef": "moderate"}, {"id": 16071216907, "d": "2025-10-08", "n": "Afternoon Run", "s": "Run", "dk": 15.067, "mm": 100.4, "hr": 150, "tl": 97.0, "p": 6.664, "rc": 81, "ef": "easy"}, {"id": 16092109488, "d": "2025-10-10", "n": "Afternoon Run", "s": "Run", "dk": 10.006, "mm": 62.0, "hr": 172, "tl": 150.0, "p": 6.193, "rc": 82, "ef": "hard"}, {"id": 16112724440, "d": "2025-10-12", "n": "Fail", "s": "Run", "dk": 26.018, "mm": 148.8, "hr": 166, "tl": 281.0, "p": 5.72, "rc": 82, "ef": "moderate"}, {"id": 16133288844, "d": "2025-10-14", "n": "Lunch Swim", "s": "Swim", "dk": 0.525, "mm": 12.5, "hr": 123, "tl": 7.0, "sp": 2.384, "ef": "easy"}, {"id": 16134367301, "d": "2025-10-14", "n": "Afternoon Run", "s": "Run", "dk": 0.536, "mm": 3.1, "hr": 133, "tl": 1.0, "p": 5.84, "rc": 81, "ef": "easy"}, {"id": 16134370346, "d": "2025-10-14", "n": "Mt Cootha 3x Laps", "s": "Run", "dk": 9.518, "mm": 72.3, "hr": 170, "tl": 149.0, "p": 7.596, "rc": 81, "ef": "moderate"}, {"id": 16155971804, "d": "2025-10-16", "n": "Afternoon Run", "s": "Run", "dk": 15.004, "mm": 76.6, "hr": 176, "tl": 222.0, "p": 5.103, "rc": 84, "ef": "hard"}, {"id": 16167416938, "d": "2025-10-17", "n": "Afternoon Run", "s": "Run", "dk": 12.007, "mm": 118.6, "hr": 153, "tl": 108.0, "p": 9.874, "rc": 79, "ef": "easy"}, {"id": 16187437782, "d": "2025-10-19", "n": "Afternoon Run", "s": "Run", "dk": 30.01, "mm": 179.0, "hr": 164, "tl": 319.0, "p": 5.963, "rc": 81, "ef": "moderate"}, {"id": 16208129279, "d": "2025-10-21", "n": "Afternoon Ride", "s": "Bike", "dk": 60.421, "mm": 150.4, "hr": 126, "tl": 42.0, "vr": false, "ef": "easy"}, {"id": 16209554949, "d": "2025-10-21", "n": "Evening Run", "s": "Run", "dk": 10.01, "mm": 70.9, "hr": 145, "tl": 41.0, "p": 7.08, "rc": 81, "ef": "easy"}, {"id": 16219488831, "d": "2025-10-22", "n": "Afternoon Run", "s": "Run", "dk": 15.002, "mm": 93.5, "hr": 156, "tl": 128.0, "p": 6.235, "rc": 82, "ef": "moderate"}, {"id": 16238371583, "d": "2025-10-24", "n": "Afternoon Ride", "s": "Bike", "dk": 20.527, "mm": 53.6, "hr": 120, "tl": 15.0, "vr": false, "ef": "easy"}, {"id": 16288870389, "d": "2025-10-29", "n": "Afternoon Run", "s": "Run", "dk": 5.002, "mm": 29.7, "hr": 166, "tl": 60.0, "p": 5.938, "rc": 81, "ef": "moderate"}, {"id": 16348644819, "d": "2025-11-04", "n": "Afternoon Run", "s": "Run", "dk": 5.013, "mm": 27.1, "hr": 171, "tl": 68.0, "p": 5.409, "rc": 82, "ef": "hard"}, {"id": 16359996777, "d": "2025-11-05", "n": "Afternoon Ride", "s": "Bike", "dk": 50.577, "mm": 121.8, "hr": 149, "tl": 122.0, "vr": false, "ef": "easy"}, {"id": 16360785811, "d": "2025-11-05", "n": "Evening Run", "s": "Run", "dk": 5.026, "mm": 33.0, "hr": 136, "tl": 18.0, "p": 6.557, "rc": 80, "ef": "easy"}, {"id": 16380342783, "d": "2025-11-07", "n": "Morning Ride", "s": "Bike", "dk": 50.877, "mm": 141.4, "hr": 138, "tl": 80.0, "vr": false, "w": 102, "ef": "easy"}, {"id": 16388072455, "d": "2025-11-08", "n": "Morning Run", "s": "Run", "dk": 10.003, "mm": 52.9, "hr": 180, "tl": 170.0, "p": 5.284, "rc": 82, "ef": "hard"}, {"id": 16431963750, "d": "2025-11-10", "n": "Morning Run", "s": "Run", "dk": 5.004, "mm": 33.1, "hr": 149, "tl": 27.0, "p": 6.622, "rc": 81, "ef": "easy"}, {"id": 16431965721, "d": "2025-11-11", "n": "Lunch Ride", "s": "Bike", "dk": 10.033, "mm": 30.5, "hr": 122, "tl": 6.0, "vr": false, "w": 81, "ef": "easy"}, {"id": 16421764422, "d": "2025-11-11", "n": "Zwift - Volcano Circuit in Watopia", "s": "Bike", "dk": 5.805, "mm": 11.9, "hr": 140, "tl": 8.0, "vr": true, "w": 142, "nw": 156, "cad": 71, "ef": "easy"}, {"id": 16422565746, "d": "2025-11-11", "n": "Zwift - Mountain Route in Watopia", "s": "Bike", "dk": 30.376, "mm": 80.5, "hr": 160, "tl": 127.0, "vr": true, "w": 177, "nw": 188, "cad": 71, "ef": "moderate"}, {"id": 16431965820, "d": "2025-11-12", "n": "Afternoon Run", "s": "Run", "dk": 10.088, "mm": 55.8, "hr": 172, "tl": 138.0, "p": 5.528, "rc": 82, "ef": "hard"}, {"id": 16433034126, "d": "2025-11-12", "n": "Zwift - Flat Out Fast in Watopia", "s": "Bike", "dk": 22.019, "mm": 48.8, "hr": 136, "tl": 22.0, "vr": true, "w": 115, "nw": 119, "cad": 70, "ef": "easy"}, {"id": 16442470404, "d": "2025-11-13", "n": "Afternoon Ride", "s": "Bike", "dk": 50.075, "mm": 135.8, "hr": 134, "tl": 57.0, "vr": false, "w": 105, "ef": "easy"}, {"id": 16443126480, "d": "2025-11-13", "n": "Afternoon Run", "s": "Run", "dk": 10.503, "mm": 55.3, "hr": 174, "tl": 154.0, "p": 5.263, "rc": 82, "ef": "hard"}, {"id": 16460934635, "d": "2025-11-15", "n": "Zwift - Triple Flat Loops in Watopia", "s": "Bike", "dk": 34.131, "mm": 75.5, "hr": 128, "tl": 18.0, "vr": true, "w": 123, "nw": 126, "cad": 65, "ef": "easy"}, {"id": 16461289384, "d": "2025-11-15", "n": "Zwift - Road to Sky in Watopia", "s": "Bike", "dk": 18.632, "mm": 115.9, "hr": 143, "tl": 80.0, "vr": true, "w": 144, "nw": 151, "cad": 68, "ef": "easy"}, {"id": 16461769813, "d": "2025-11-15", "n": "Afternoon Run", "s": "Run", "dk": 7.387, "mm": 42.6, "hr": 167, "tl": 88.0, "p": 5.765, "rc": 80, "ef": "moderate"}, {"id": 16481488872, "d": "2025-11-17", "n": "ROUVY - IRONMAN 70.3 Nice", "s": "Bike", "dk": 67.139, "mm": 160.5, "hr": 158, "tl": 224.0, "vr": true, "w": 170, "nw": 184, "cad": 70, "ef": "moderate"}, {"id": 16491616720, "d": "2025-11-18", "n": "Afternoon Run", "s": "Run", "dk": 21.243, "mm": 113.7, "hr": 174, "tl": 295.0, "p": 5.35, "rc": 83, "ef": "hard"}, {"id": 16501365944, "d": "2025-11-19", "n": "ROUVY - IRONMAN 70.3 Arizona 90km 2020", "s": "Bike", "dk": 45.03, "mm": 89.1, "hr": 152, "tl": 97.0, "vr": true, "w": 156, "nw": 164, "cad": 65, "ef": "easy"}, {"id": 16502107920, "d": "2025-11-19", "n": "Afternoon Run", "s": "Run", "dk": 10.011, "mm": 64.7, "hr": 154, "tl": 79.0, "p": 6.46, "rc": 81, "ef": "easy"}, {"id": 16521294309, "d": "2025-11-21", "n": "ROUVY - Ramp Test", "s": "Bike", "dk": 4.433, "mm": 11.8, "hr": 146, "tl": 10.0, "vr": true, "w": 157, "nw": 176, "cad": 83, "ef": "easy"}, {"id": 16549172598, "d": "2025-11-24", "n": "Afternoon Swim", "s": "Swim", "dk": 1.025, "mm": 25.3, "hr": 136, "tl": 33.0, "sp": 2.47, "ef": "easy"}, {"id": 16550106019, "d": "2025-11-24", "n": "Afternoon Run", "s": "Run", "dk": 20.207, "mm": 131.2, "hr": 166, "tl": 248.0, "p": 6.49, "rc": 81, "ef": "moderate"}, {"id": 16568847288, "d": "2025-11-26", "n": "ROUVY - IRONMAN 70.3 Port Macquarie 2019", "s": "Bike", "dk": 89.999, "mm": 183.1, "hr": 148, "tl": 166.0, "vr": true, "w": 151, "nw": 166, "cad": 70, "ef": "easy"}, {"id": 16569848638, "d": "2025-11-26", "n": "Afternoon Run", "s": "Run", "dk": 10.062, "mm": 59.2, "hr": 175, "tl": 164.0, "p": 5.883, "rc": 81, "ef": "hard"}, {"id": 16588067140, "d": "2025-11-28", "n": "Lunch Swim", "s": "Swim", "dk": 1.0, "mm": 26.7, "hr": 141, "tl": 41.0, "sp": 2.67, "ef": "easy"}, {"id": 16590428786, "d": "2025-11-28", "n": "ROUVY - Group Ride: ROUVY - Group RIde: WST END - 008", "s": "Bike", "dk": 32.024, "mm": 64.2, "hr": 169, "tl": 139.0, "vr": true, "w": 210, "nw": 219, "cad": 67, "ef": "moderate"}, {"id": 16597342886, "d": "2025-11-29", "n": "Afternoon Ride", "s": "Bike", "dk": 37.231, "mm": 115.3, "hr": 122, "tl": 28.0, "vr": false, "w": 77, "ef": "easy"}, {"id": 16606213474, "d": "2025-11-30", "n": "Afternoon Run", "s": "Run", "dk": 21.801, "mm": 143.6, "hr": 160, "tl": 226.0, "p": 6.585, "rc": 80, "ef": "moderate"}, {"id": 16606525715, "d": "2025-11-30", "n": "Afternoon Swim", "s": "Swim", "dk": 1.15, "mm": 27.0, "hr": 138, "tl": 35.0, "sp": 2.345, "ef": "easy"}, {"id": 16615742575, "d": "2025-12-01", "n": "ROUVY - IRONMAN 70.3 Valencia", "s": "Bike", "dk": 89.571, "mm": 189.9, "hr": 133, "tl": 66.0, "vr": true, "w": 138, "nw": 147, "cad": 68, "ef": "easy"}, {"id": 16616485896, "d": "2025-12-01", "n": "Afternoon Run", "s": "Run", "dk": 5.037, "mm": 32.8, "hr": 152, "tl": 37.0, "p": 6.503, "rc": 81, "ef": "easy"}, {"id": 16624584184, "d": "2025-12-02", "n": "Lunch Swim", "s": "Swim", "dk": 1.65, "mm": 41.7, "hr": 135, "tl": 40.0, "sp": 2.529, "ef": "easy"}, {"id": 16626126960, "d": "2025-12-02", "n": "Afternoon Run", "s": "Run", "dk": 10.988, "mm": 71.6, "hr": 146, "tl": 48.0, "p": 6.518, "rc": 80, "ef": "easy"}, {"id": 16637168300, "d": "2025-12-03", "n": "ROUVY - Compiegne to Roupy | France", "s": "Bike", "dk": 33.596, "mm": 69.7, "hr": 130, "tl": 24.0, "vr": true, "w": 142, "nw": 161, "cad": 64, "ef": "easy"}, {"id": 16645118493, "d": "2025-12-04", "n": "Afternoon Run", "s": "Run", "dk": 10.357, "mm": 58.2, "hr": 161, "tl": 92.0, "p": 5.615, "rc": 83, "ef": "moderate"}, {"id": 16653772996, "d": "2025-12-05", "n": "Lunch Swim", "s": "Swim", "dk": 1.5, "mm": 38.2, "hr": 135, "tl": 37.0, "sp": 2.55, "ef": "easy"}, {"id": 16654202851, "d": "2025-12-05", "n": "Afternoon Run", "s": "Run", "dk": 10.037, "mm": 63.2, "hr": 159, "tl": 100.0, "p": 6.301, "rc": 80, "ef": "moderate"}, {"id": 16671490201, "d": "2025-12-07", "n": "ROUVY - Crusher in the Tushar | Circleville | Utah", "s": "Bike", "dk": 28.499, "mm": 67.8, "hr": 143, "tl": 49.0, "vr": true, "w": 144, "nw": 164, "cad": 68, "ef": "easy"}, {"id": 16671677734, "d": "2025-12-07", "n": "ROUVY - Sossusvlei desert | Namibia", "s": "Bike", "dk": 34.412, "mm": 63.3, "hr": 150, "tl": 66.0, "vr": true, "w": 147, "nw": 156, "cad": 74, "ef": "easy"}, {"id": 16672169842, "d": "2025-12-07", "n": "Afternoon Swim", "s": "Swim", "dk": 1.5, "mm": 40.7, "hr": 133, "tl": 34.0, "sp": 2.716, "ef": "easy"}, {"id": 16681383128, "d": "2025-12-08", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 53.778, "mm": 120.6, "hr": 118, "tl": 23.0, "vr": true, "w": 105, "nw": 105, "cad": 66, "ef": "easy"}, {"id": 16681846428, "d": "2025-12-08", "n": "Afternoon Run", "s": "Run", "dk": 8.188, "mm": 52.5, "hr": 152, "tl": 56.0, "p": 6.418, "rc": 79, "ef": "easy"}, {"id": 16690132207, "d": "2025-12-09", "n": "Lunch Swim", "s": "Swim", "dk": 1.55, "mm": 40.0, "hr": 143, "tl": 54.0, "sp": 2.581, "ef": "easy"}, {"id": 16690950250, "d": "2025-12-09", "n": "Afternoon Run", "s": "Run", "dk": 10.008, "mm": 52.3, "hr": 174, "tl": 144.0, "p": 5.23, "rc": 81, "ef": "hard"}, {"id": 16700472376, "d": "2025-12-10", "n": "ROUVY - GF Florida | USA", "s": "Bike", "dk": 62.499, "mm": 113.5, "hr": 163, "tl": 205.0, "vr": true, "w": 197, "nw": 202, "cad": 75, "ef": "moderate"}, {"id": 16709341757, "d": "2025-12-11", "n": "Morning Ride", "s": "Bike", "dk": 34.508, "mm": 95.5, "hr": 140, "tl": 70.0, "vr": false, "w": 114, "ef": "easy"}, {"id": 16710442264, "d": "2025-12-11", "n": "Afternoon Run", "s": "Run", "dk": 10.022, "mm": 51.8, "hr": 171, "tl": 116.0, "p": 5.171, "rc": 82, "ef": "hard"}, {"id": 16718623591, "d": "2025-12-12", "n": "Lunch Swim", "s": "Swim", "dk": 1.5, "mm": 37.7, "hr": 142, "tl": 49.0, "sp": 2.512, "ef": "easy"}, {"id": 16719431663, "d": "2025-12-12", "n": "Afternoon Run", "s": "Run", "dk": 15.002, "mm": 82.2, "hr": 166, "tl": 158.0, "p": 5.482, "rc": 82, "ef": "moderate"}, {"id": 16727186051, "d": "2025-12-13", "n": "ROUVY - Rund um Köln 60 km | Germany", "s": "Bike", "dk": 57.484, "mm": 115.2, "hr": 165, "tl": 218.0, "vr": true, "w": 207, "nw": 217, "cad": 76, "ef": "moderate"}, {"id": 16745941643, "d": "2025-12-15", "n": "Afternoon Run", "s": "Run", "dk": 10.068, "mm": 56.2, "hr": 163, "tl": 99.0, "p": 5.58, "rc": 82, "ef": "moderate"}, {"id": 16754193273, "d": "2025-12-16", "n": "Lunch Swim", "s": "Swim", "dk": 2.05, "mm": 55.0, "hr": 135, "tl": 44.0, "sp": 2.681, "ef": "easy"}, {"id": 16755451770, "d": "2025-12-16", "n": "Afternoon Run", "s": "Run", "dk": 11.039, "mm": 54.7, "hr": 172, "tl": 134.0, "p": 4.959, "rc": 84, "ef": "hard"}, {"id": 16763501070, "d": "2025-12-17", "n": "Morning Ride", "s": "Bike", "dk": 11.562, "mm": 35.3, "hr": 118, "tl": 7.0, "vr": false, "w": 87, "ef": "easy"}, {"id": 16763744425, "d": "2025-12-17", "n": "Lunch Ride", "s": "Bike", "dk": 27.417, "mm": 50.2, "hr": 168, "tl": 103.0, "vr": false, "w": 214, "ef": "moderate"}, {"id": 16764688859, "d": "2025-12-17", "n": "Afternoon Run", "s": "Run", "dk": 10.068, "mm": 68.8, "hr": 140, "tl": 25.0, "p": 6.828, "rc": 82, "ef": "easy"}, {"id": 16772984656, "d": "2025-12-18", "n": "ROUVY - PASSO FEDAIA from CANAZEI | ITALY", "s": "Bike", "dk": 13.203, "mm": 51.9, "hr": 159, "tl": 80.0, "vr": true, "w": 199, "nw": 204, "cad": 68, "ef": "moderate"}, {"id": 16773206480, "d": "2025-12-18", "n": "ROUVY - Passo Pordoi from Canazei | Italy", "s": "Bike", "dk": 15.215, "mm": 66.0, "hr": 155, "tl": 89.0, "vr": true, "w": 190, "nw": 194, "cad": 70, "ef": "easy"}, {"id": 16773459783, "d": "2025-12-18", "n": "ROUVY - Passo Gardena from Corvara | Italy", "s": "Bike", "dk": 12.161, "mm": 56.0, "hr": 149, "tl": 57.0, "vr": true, "w": 162, "nw": 172, "cad": 60, "ef": "easy"}, {"id": 16780999982, "d": "2025-12-19", "n": "Morning Swim", "s": "Swim", "dk": 2.15, "mm": 55.8, "hr": 143, "tl": 68.0, "sp": 2.595, "ef": "easy"}, {"id": 16781932282, "d": "2025-12-19", "n": "Treadmill run", "s": "Run", "dk": 9.2, "mm": 52.0, "p": 5.652, "ef": "moderate"}, {"id": 16781913000, "d": "2025-12-19", "n": "Afternoon Run", "s": "Run", "dk": 6.011, "mm": 30.9, "hr": 166, "tl": 61.0, "p": 5.149, "rc": 83, "ef": "moderate"}, {"id": 16789606332, "d": "2025-12-20", "n": "ROUVY - Passo Giau | Italy", "s": "Bike", "dk": 12.703, "mm": 72.2, "hr": 167, "tl": 143.0, "vr": true, "w": 225, "nw": 227, "cad": 66, "ef": "moderate"}, {"id": 16789801346, "d": "2025-12-20", "n": "ROUVY - Passo Sella from Canazei | Italy", "s": "Bike", "dk": 13.261, "mm": 63.4, "hr": 158, "tl": 96.0, "vr": true, "w": 194, "nw": 198, "cad": 67, "ef": "moderate"}, {"id": 16789900535, "d": "2025-12-20", "n": "ROUVY - Winter Alt St. Johan | Switzerland", "s": "Bike", "dk": 21.699, "mm": 44.3, "hr": 137, "tl": 20.0, "vr": true, "w": 121, "nw": 146, "cad": 72, "ef": "easy"}, {"id": 16798749915, "d": "2025-12-21", "n": "Lunch Run", "s": "Run", "dk": 24.078, "mm": 141.1, "hr": 163, "tl": 245.0, "p": 5.86, "rc": 82, "ef": "moderate"}, {"id": 16799214117, "d": "2025-12-21", "n": "Afternoon Swim", "s": "Swim", "dk": 2.15, "mm": 53.4, "hr": 126, "tl": 26.0, "sp": 2.484, "ef": "easy"}, {"id": 16816121638, "d": "2025-12-23", "n": "Morning Swim", "s": "Swim", "dk": 1.9, "mm": 49.7, "hr": 137, "tl": 53.0, "sp": 2.616, "ef": "easy"}, {"id": 16816660788, "d": "2025-12-23", "n": "Afternoon Run", "s": "Run", "dk": 0.988, "mm": 4.8, "hr": 165, "tl": 9.0, "p": 4.842, "rc": 84, "ef": "moderate"}, {"id": 16816853737, "d": "2025-12-23", "n": "10x1km interval w/ 3min rest in between", "s": "Run", "dk": 10.041, "mm": 43.1, "hr": 176, "tl": 126.0, "p": 4.294, "rc": 88, "ef": "hard", "iv": true}, {"id": 16840827211, "d": "2025-12-26", "n": "Morning Swim", "s": "Swim", "dk": 2.25, "mm": 47.6, "hr": 137, "tl": 50.0, "sp": 2.115, "ef": "easy"}, {"id": 16841492565, "d": "2025-12-26", "n": "Afternoon Run", "s": "Run", "dk": 15.009, "mm": 78.9, "hr": 173, "tl": 194.0, "p": 5.254, "rc": 84, "ef": "hard"}, {"id": 16850408015, "d": "2025-12-27", "n": "ROUVY - IRONMAN 70.3 Port Macquarie 2019", "s": "Bike", "dk": 52.171, "mm": 93.0, "hr": 152, "tl": 103.0, "vr": true, "w": 187, "nw": 190, "cad": 76, "ef": "easy"}, {"id": 16859391936, "d": "2025-12-28", "n": "Morning Swim", "s": "Swim", "dk": 1.95, "mm": 40.9, "hr": 143, "tl": 70.0, "sp": 2.099, "ef": "easy"}, {"id": 16860742579, "d": "2025-12-28", "n": "ROUVY - To Adams Peak / Srí Pada | Sri Lanka", "s": "Bike", "dk": 16.249, "mm": 48.3, "hr": 121, "tl": 11.0, "vr": true, "w": 117, "nw": 127, "cad": 62, "ef": "easy"}, {"id": 16861043259, "d": "2025-12-28", "n": "ROUVY - Kinsale | Courtmacsherry | Ireland", "s": "Bike", "dk": 29.718, "mm": 73.6, "hr": 118, "tl": 16.0, "vr": true, "w": 102, "nw": 123, "cad": 63, "ef": "easy"}, {"id": 16870632954, "d": "2025-12-29", "n": "ROUVY - IRONMAN 70.3 Sunshine Coast (1st loop)", "s": "Bike", "dk": 48.797, "mm": 80.8, "hr": 170, "tl": 176.0, "vr": true, "w": 220, "nw": 222, "cad": 76, "ef": "moderate"}, {"id": 16870673602, "d": "2025-12-29", "n": "ROUVY - 15 Minute Cool-down", "s": "Bike", "dk": 4.64, "mm": 15.0, "hr": 133, "tl": 4.0, "vr": true, "w": 108, "nw": 108, "cad": 69, "ef": "easy"}, {"id": 16871470221, "d": "2025-12-29", "n": "Evening Run", "s": "Run", "dk": 9.444, "mm": 60.8, "hr": 154, "tl": 75.0, "p": 6.435, "rc": 82, "ef": "easy"}, {"id": 16879926225, "d": "2025-12-30", "n": "Lunch Swim", "s": "Swim", "dk": 2.45, "mm": 52.2, "hr": 128, "tl": 29.0, "sp": 2.131, "ef": "easy"}, {"id": 16880365433, "d": "2025-12-30", "n": "Afternoon Run", "s": "Run", "dk": 1.025, "mm": 6.0, "hr": 153, "tl": 6.0, "p": 5.871, "rc": 82, "ef": "easy"}, {"id": 16880589173, "d": "2025-12-30", "n": "10x1km w/ 3min rest", "s": "Run", "dk": 10.011, "mm": 39.5, "hr": 176, "tl": 115.0, "p": 3.948, "rc": 88, "ef": "hard"}, {"id": 16888603571, "d": "2025-12-31", "n": "ROUVY - Aragapathana to Nuwara Eliya | Sri Lanka", "s": "Bike", "dk": 13.049, "mm": 32.8, "hr": 155, "tl": 45.0, "vr": true, "w": 199, "nw": 222, "cad": 73, "ef": "easy"}, {"id": 16908559925, "d": "2026-01-02", "n": "Lunch Swim", "s": "Swim", "dk": 3.0, "mm": 67.5, "hr": 141, "tl": 78.0, "sp": 2.252, "ef": "easy"}, {"id": 16909056916, "d": "2026-01-02", "n": "Afternoon Run", "s": "Run", "dk": 2.793, "mm": 15.7, "hr": 163, "tl": 27.0, "p": 5.621, "rc": 83, "ef": "moderate"}, {"id": 16919218018, "d": "2026-01-03", "n": "ROUVY - IRONMAN 70.3 Port Macquarie 2019", "s": "Bike", "dk": 89.998, "mm": 148.3, "hr": 163, "tl": 275.0, "vr": true, "w": 220, "nw": 222, "cad": 76, "ef": "moderate"}, {"id": 16932609130, "d": "2026-01-04", "n": "Afternoon Run", "s": "Run", "dk": 41.141, "mm": 311.5, "hr": 151, "tl": 331.0, "p": 7.572, "rc": 71, "ef": "easy"}, {"id": 16952178584, "d": "2026-01-06", "n": "Lunch Swim", "s": "Swim", "dk": 1.5, "mm": 31.9, "hr": 136, "tl": 44.0, "sp": 2.128, "ef": "easy"}, {"id": 16965238376, "d": "2026-01-07", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 17.154, "mm": 30.4, "hr": 130, "tl": 9.0, "vr": true, "w": 158, "nw": 162, "cad": 74, "ef": "easy"}, {"id": 16975318687, "d": "2026-01-08", "n": "ROUVY - Power Building (HARD)", "s": "Bike", "dk": 40.593, "mm": 73.4, "hr": 156, "tl": 105.0, "vr": true, "w": 196, "nw": 211, "cad": 72, "ef": "moderate"}, {"id": 16985647414, "d": "2026-01-09", "n": "Morning Swim", "s": "Swim", "dk": 3.075, "mm": 75.0, "hr": 138, "tl": 79.0, "sp": 2.441, "ef": "easy"}, {"id": 16986657078, "d": "2026-01-09", "n": "Afternoon Run", "s": "Run", "dk": 1.003, "mm": 5.5, "hr": 153, "tl": 6.0, "p": 5.466, "rc": 81, "ef": "easy"}, {"id": 16986660727, "d": "2026-01-09", "n": "2km Intervals @ 4.20 w/ 3min rest", "s": "Run", "dk": 10.005, "mm": 43.4, "hr": 178, "tl": 134.0, "p": 4.339, "rc": 87, "ef": "hard", "iv": true}, {"id": 16995899997, "d": "2026-01-10", "n": "ROUVY - Group Ride: Frenchy French Fridays", "s": "Bike", "dk": 19.083, "mm": 44.8, "hr": 130, "tl": 14.0, "vr": true, "w": 140, "nw": 156, "cad": 65, "ef": "easy"}, {"id": 16996097361, "d": "2026-01-10", "n": "ROUVY - Puerto de Bèrnia | Spain", "s": "Bike", "dk": 13.199, "mm": 53.4, "hr": 135, "tl": 20.0, "vr": true, "w": 156, "nw": 162, "cad": 62, "ef": "easy"}, {"id": 16996152494, "d": "2026-01-10", "n": "ROUVY - Castell de Castells | Spain", "s": "Bike", "dk": 6.024, "mm": 15.6, "hr": 129, "tl": 4.0, "vr": true, "w": 147, "nw": 151, "cad": 65, "ef": "easy"}, {"id": 17007458076, "d": "2026-01-11", "n": "Morning Run", "s": "Run", "dk": 22.437, "mm": 148.3, "hr": 159, "tl": 217.0, "p": 6.609, "rc": 79, "ef": "moderate"}, {"id": 17019194312, "d": "2026-01-12", "n": "ROUVY - Puerto de Bèrnia | Spain", "s": "Bike", "dk": 10.209, "mm": 16.5, "hr": 118, "tl": 3.0, "vr": true, "w": 104, "nw": 122, "cad": 71, "ef": "easy"}, {"id": 17019579207, "d": "2026-01-12", "n": "ROUVY - Rund um Köln 70 km | Germany", "s": "Bike", "dk": 42.888, "mm": 92.8, "hr": 129, "tl": 27.0, "vr": true, "w": 148, "nw": 156, "cad": 66, "ef": "easy"}, {"id": 17019650443, "d": "2026-01-12", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 6.603, "mm": 12.9, "hr": 124, "tl": 2.0, "vr": true, "w": 125, "nw": 130, "cad": 69, "ef": "easy"}, {"id": 17020890400, "d": "2026-01-12", "n": "Evening Run", "s": "Run", "dk": 9.321, "mm": 69.4, "hr": 140, "tl": 20.0, "p": 7.447, "rc": 80, "ef": "easy"}, {"id": 17029635367, "d": "2026-01-13", "n": "Morning Swim", "s": "Swim", "dk": 2.175, "mm": 46.7, "hr": 134, "tl": 43.0, "sp": 2.147, "ef": "easy"}, {"id": 17030910651, "d": "2026-01-13", "n": "Afternoon Run", "s": "Run", "dk": 0.995, "mm": 5.1, "hr": 154, "tl": 5.0, "p": 5.142, "rc": 82, "ef": "easy"}, {"id": 17030913378, "d": "2026-01-13", "n": "8x1km w/ 3min rest", "s": "Run", "dk": 8.46, "mm": 33.4, "hr": 178, "tl": 95.0, "p": 3.942, "rc": 88, "ef": "hard"}, {"id": 17042214105, "d": "2026-01-14", "n": "Lunch Run", "s": "Run", "dk": 10.435, "mm": 64.5, "hr": 154, "tl": 65.0, "p": 6.184, "rc": 81, "ef": "easy"}, {"id": 17043326003, "d": "2026-01-14", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 32.898, "mm": 61.1, "hr": 126, "tl": 13.0, "vr": true, "w": 138, "nw": 142, "cad": 73, "ef": "easy"}, {"id": 17054462151, "d": "2026-01-15", "n": "ROUVY - Power Building (HARD)", "s": "Bike", "dk": 62.933, "mm": 120.6, "hr": 151, "tl": 121.0, "vr": true, "w": 179, "nw": 212, "cad": 70, "ef": "easy"}, {"id": 17065933838, "d": "2026-01-16", "n": "Afternoon Swim", "s": "Swim", "dk": 2.15, "mm": 49.4, "hr": 124, "tl": 23.0, "sp": 2.297, "ef": "easy"}, {"id": 17066986788, "d": "2026-01-16", "n": "Afternoon Run", "s": "Run", "dk": 0.95, "mm": 5.2, "hr": 162, "tl": 8.0, "p": 5.422, "rc": 81, "ef": "moderate"}, {"id": 17066990069, "d": "2026-01-16", "n": "4x4km @ 4.44 w/ 90sec rest", "s": "Run", "dk": 16.003, "mm": 75.6, "hr": 178, "tl": 209.0, "p": 4.725, "rc": 85, "ef": "hard"}, {"id": 17066989901, "d": "2026-01-16", "n": "Evening Run", "s": "Run", "dk": 0.292, "mm": 1.9, "hr": 144, "tl": 1.0, "p": 6.391, "rc": 79, "ef": "easy"}, {"id": 17099874885, "d": "2026-01-19", "n": "ROUVY - IRONMAN 70.3 Aracaju-Sergipe", "s": "Bike", "dk": 88.243, "mm": 142.3, "hr": 166, "tl": 263.0, "vr": true, "w": 207, "nw": 208, "cad": 72, "ef": "moderate"}, {"id": 17100929165, "d": "2026-01-19", "n": "Afternoon Run", "s": "Run", "dk": 8.029, "mm": 59.5, "hr": 140, "tl": 19.0, "p": 7.407, "rc": 80, "ef": "easy"}, {"id": 17110849605, "d": "2026-01-20", "n": "Lunch Swim", "s": "Swim", "dk": 2.35, "mm": 51.2, "hr": 130, "tl": 35.0, "sp": 2.181, "ef": "easy"}, {"id": 17111481191, "d": "2026-01-20", "n": "Afternoon Run", "s": "Run", "dk": 1.034, "mm": 5.5, "hr": 159, "tl": 8.0, "p": 5.288, "rc": 82, "ef": "moderate"}, {"id": 17111964344, "d": "2026-01-20", "n": "5x4km @ 4.39 w/ 90sec rest", "s": "Run", "dk": 20.009, "mm": 93.1, "hr": 175, "tl": 238.0, "p": 4.653, "rc": 86, "ef": "hard"}, {"id": 17124532265, "d": "2026-01-21", "n": "Afternoon Run", "s": "Run", "dk": 8.007, "mm": 51.2, "hr": 144, "tl": 24.0, "p": 6.391, "rc": 81, "ef": "easy"}, {"id": 17126359310, "d": "2026-01-21", "n": "ROUVY - Tour de TOHOKU 2021 Ishinomaki to Minamisanriku", "s": "Bike", "dk": 39.847, "mm": 95.3, "hr": 130, "tl": 28.0, "vr": true, "w": 125, "nw": 140, "cad": 66, "ef": "easy"}, {"id": 17134863636, "d": "2026-01-22", "n": "ROUVY - Power Building (HARD)", "s": "Bike", "dk": 62.702, "mm": 122.0, "hr": 154, "tl": 143.0, "vr": true, "w": 179, "nw": 219, "cad": 71, "ef": "easy"}, {"id": 17145737316, "d": "2026-01-23", "n": "Lunch Swim", "s": "Swim", "dk": 2.275, "mm": 49.4, "hr": 135, "tl": 41.0, "sp": 2.171, "ef": "easy"}, {"id": 17146517893, "d": "2026-01-23", "n": "Afternoon Run", "s": "Run", "dk": 1.991, "mm": 11.0, "hr": 157, "tl": 14.0, "p": 5.508, "rc": 82, "ef": "moderate"}, {"id": 17146517918, "d": "2026-01-23", "n": "5x2km @ 4.08 w/ 2min rest", "s": "Run", "dk": 10.007, "mm": 41.4, "hr": 177, "tl": 116.0, "p": 4.141, "rc": 87, "ef": "hard"}, {"id": 17155594240, "d": "2026-01-24", "n": "Morning Swim", "s": "Swim", "dk": 2.4, "mm": 46.6, "hr": 136, "tl": 61.0, "sp": 1.942, "ef": "easy"}, {"id": 17167553543, "d": "2026-01-25", "n": "Afternoon Run", "s": "Run", "dk": 1.376, "mm": 9.0, "hr": 140, "tl": 4.0, "p": 6.554, "rc": 81, "ef": "easy"}, {"id": 17178776994, "d": "2026-01-26", "n": "ROUVY - IRONMAN Copenhagen (1st loop)", "s": "Bike", "dk": 51.866, "mm": 86.5, "hr": 158, "tl": 126.0, "vr": true, "w": 204, "nw": 209, "cad": 72, "ef": "moderate"}, {"id": 17180719960, "d": "2026-01-26", "n": "Evening Run", "s": "Run", "dk": 12.049, "mm": 89.3, "hr": 139, "tl": 24.0, "p": 7.411, "rc": 81, "ef": "easy"}, {"id": 17189204184, "d": "2026-01-27", "n": "Morning Swim", "s": "Swim", "dk": 2.275, "mm": 47.9, "hr": 133, "tl": 34.0, "sp": 2.107, "ef": "easy"}, {"id": 17189987190, "d": "2026-01-27", "n": "Afternoon Run", "s": "Run", "dk": 1.116, "mm": 6.0, "hr": 156, "tl": 7.0, "p": 5.361, "rc": 84, "ef": "moderate"}, {"id": 17190352332, "d": "2026-01-27", "n": "What the … 3x6km @ 4.34 w/ 90sec rest", "s": "Run", "dk": 18.004, "mm": 82.2, "hr": 177, "tl": 220.0, "p": 4.566, "rc": 87, "ef": "hard"}, {"id": 17201095263, "d": "2026-01-28", "n": "Lunch Run", "s": "Run", "dk": 10.039, "mm": 71.8, "hr": 140, "tl": 21.0, "p": 7.156, "rc": 81, "ef": "easy"}, {"id": 17202597571, "d": "2026-01-28", "n": "ROUVY - IRONMAN Maryland (1st loop)", "s": "Bike", "dk": 59.145, "mm": 120.1, "hr": 122, "tl": 24.0, "vr": true, "w": 111, "nw": 112, "cad": 73, "ef": "easy"}, {"id": 17212791457, "d": "2026-01-29", "n": "ROUVY - Building Strength & Endurance", "s": "Bike", "dk": 59.91, "mm": 98.3, "hr": 156, "tl": 124.0, "vr": true, "w": 207, "nw": 221, "cad": 75, "ef": "moderate"}, {"id": 17223327356, "d": "2026-01-30", "n": "Morning Swim", "s": "Swim", "dk": 2.75, "mm": 55.2, "hr": 141, "tl": 87.0, "sp": 2.008, "ef": "easy"}, {"id": 17224419896, "d": "2026-01-30", "n": "Afternoon Run", "s": "Run", "dk": 1.509, "mm": 8.6, "hr": 152, "tl": 10.0, "p": 5.677, "rc": 80, "ef": "easy"}, {"id": 17224420002, "d": "2026-01-30", "n": "6x2km @4.02 w/ 2min rest", "s": "Run", "dk": 12.0, "mm": 48.3, "hr": 178, "tl": 142.0, "p": 4.027, "rc": 87, "ef": "hard"}, {"id": 17233475304, "d": "2026-01-31", "n": "Lunch Swim", "s": "Swim", "dk": 3.125, "mm": 59.1, "hr": 136, "tl": 90.0, "sp": 1.89, "ef": "easy"}, {"id": 17234125799, "d": "2026-01-31", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 34.391, "mm": 72.1, "hr": 118, "tl": 13.0, "vr": true, "w": 101, "nw": 102, "cad": 73, "ef": "easy"}, {"id": 17245314408, "d": "2026-02-01", "n": "Afternoon Run", "s": "Run", "dk": 0.928, "mm": 5.8, "hr": 134, "tl": 2.0, "p": 6.249, "rc": 80, "ef": "easy"}, {"id": 17267204962, "d": "2026-02-03", "n": "Morning Swim", "s": "Swim", "dk": 1.625, "mm": 35.8, "hr": 107, "tl": 15.0, "sp": 2.2, "ef": "easy"}, {"id": 17268145012, "d": "2026-02-03", "n": "Afternoon Run", "s": "Run", "dk": 1.673, "mm": 9.2, "hr": 150, "tl": 7.0, "p": 5.517, "rc": 82, "ef": "easy"}, {"id": 17268899824, "d": "2026-02-03", "n": "3x8km w/ 90s rest @ 4.35", "s": "Run", "dk": 24.004, "mm": 110.0, "hr": 172, "tl": 252.0, "p": 4.585, "rc": 86, "ef": "hard"}, {"id": 17279317424, "d": "2026-02-04", "n": "Lunch Run", "s": "Run", "dk": 10.001, "mm": 62.3, "hr": 148, "tl": 41.0, "p": 6.226, "rc": 82, "ef": "easy"}, {"id": 17281007708, "d": "2026-02-04", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 34.093, "mm": 76.9, "hr": 106, "tl": 11.0, "vr": true, "w": 85, "nw": 86, "cad": 70, "ef": "easy"}, {"id": 17291713056, "d": "2026-02-05", "n": "ROUVY - Building Strength & Endurance", "s": "Bike", "dk": 72.426, "mm": 124.9, "hr": 157, "tl": 169.0, "vr": true, "w": 206, "nw": 224, "cad": 74, "ef": "moderate"}, {"id": 17302181990, "d": "2026-02-06", "n": "Lunch Swim", "s": "Swim", "dk": 2.6, "mm": 52.4, "hr": 134, "tl": 61.0, "sp": 2.014, "ef": "easy"}, {"id": 17302962019, "d": "2026-02-06", "n": "WU", "s": "Run", "dk": 1.522, "mm": 8.4, "hr": 155, "tl": 9.0, "p": 5.53, "rc": 80, "ef": "easy"}, {"id": 17302962274, "d": "2026-02-06", "n": "3x2km w/ 2min rest", "s": "Run", "dk": 6.544, "mm": 26.9, "hr": 178, "tl": 81.0, "p": 4.113, "rc": 87, "ef": "hard"}, {"id": 17302962041, "d": "2026-02-06", "n": "WD", "s": "Run", "dk": 0.923, "mm": 5.2, "hr": 153, "tl": 5.0, "p": 5.595, "rc": 81, "ef": "easy"}, {"id": 17304766944, "d": "2026-02-06", "n": "Evening Run", "s": "Run", "dk": 12.084, "mm": 85.5, "hr": 137, "tl": 24.0, "p": 7.077, "rc": 80, "ef": "easy"}, {"id": 17313039616, "d": "2026-02-07", "n": "Lunch Ride", "s": "Bike", "dk": 72.824, "mm": 231.6, "hr": 110, "tl": 40.0, "vr": false, "w": 81, "ef": "easy"}, {"id": 17323742531, "d": "2026-02-08", "n": "Lunch Swim", "s": "Swim", "dk": 2.275, "mm": 42.4, "hr": 149, "tl": 93.0, "sp": 1.862, "ef": "easy"}, {"id": 17324603364, "d": "2026-02-08", "n": "Afternoon Run", "s": "Run", "dk": 20.065, "mm": 117.6, "hr": 158, "tl": 158.0, "p": 5.86, "rc": 81, "ef": "moderate"}, {"id": 17336024851, "d": "2026-02-09", "n": "ROUVY - IRONMAN Copenhagen (1st loop)", "s": "Bike", "dk": 89.999, "mm": 156.0, "hr": 139, "tl": 68.0, "vr": true, "w": 182, "nw": 184, "cad": 75, "ef": "easy"}, {"id": 17337440103, "d": "2026-02-09", "n": "Evening Run", "s": "Run", "dk": 10.081, "mm": 64.5, "hr": 148, "tl": 37.0, "p": 6.403, "rc": 81, "ef": "easy"}, {"id": 17346281161, "d": "2026-02-10", "n": "Lunch Swim", "s": "Swim", "dk": 2.0, "mm": 44.6, "hr": 116, "tl": 16.0, "sp": 2.229, "ef": "easy"}, {"id": 17347052244, "d": "2026-02-10", "n": "Afternoon Run", "s": "Run", "dk": 1.709, "mm": 8.9, "hr": 157, "tl": 13.0, "p": 5.236, "rc": 83, "ef": "moderate"}, {"id": 17347381080, "d": "2026-02-10", "n": "2x5km @ 4.27 w/ 90sec rest", "s": "Run", "dk": 10.382, "mm": 46.2, "hr": 176, "tl": 124.0, "p": 4.454, "rc": 87, "ef": "hard"}, {"id": 17357967628, "d": "2026-02-11", "n": "Lunch Run", "s": "Run", "dk": 1.851, "mm": 11.0, "hr": 147, "tl": 9.0, "p": 5.963, "rc": 81, "ef": "easy"}, {"id": 17359964468, "d": "2026-02-11", "n": "ROUVY - GFNY Republica Dominicana (153km)", "s": "Bike", "dk": 58.756, "mm": 133.4, "hr": 111, "tl": 23.0, "vr": true, "w": 91, "nw": 102, "cad": 69, "ef": "easy"}, {"id": 17369938360, "d": "2026-02-12", "n": "ROUVY - Building Strength & Endurance", "s": "Bike", "dk": 41.313, "mm": 76.8, "hr": 155, "tl": 93.0, "vr": true, "w": 202, "nw": 220, "cad": 76, "ef": "easy"}, {"id": 17380328730, "d": "2026-02-13", "n": "Lunch Swim", "s": "Swim", "dk": 2.45, "mm": 48.9, "hr": 118, "tl": 24.0, "sp": 1.995, "ef": "easy"}, {"id": 17381556880, "d": "2026-02-13", "n": "WU", "s": "Run", "dk": 1.688, "mm": 10.1, "hr": 160, "tl": 14.0, "p": 5.974, "rc": 79, "ef": "moderate"}, {"id": 17382032455, "d": "2026-02-13", "n": "7x2km @ 4.11 w/ 2min rest", "s": "Run", "dk": 12.83, "mm": 75.2, "hr": 174, "tl": 194.0, "p": 5.862, "rc": 84, "ef": "hard"}, {"id": 17390882820, "d": "2026-02-14", "n": "ROUVY - Big Sugar Classic West | Arkansas", "s": "Bike", "dk": 50.732, "mm": 118.9, "hr": 123, "tl": 29.0, "vr": true, "w": 109, "nw": 133, "cad": 65, "ef": "easy"}, {"id": 17391064496, "d": "2026-02-14", "n": "ROUVY - Tour Down Under 2024 | Stage 2 - Lobethal", "s": "Bike", "dk": 12.69, "mm": 29.7, "hr": 123, "tl": 7.0, "vr": true, "w": 118, "nw": 146, "cad": 59, "ef": "easy"}, {"id": 17412285514, "d": "2026-02-16", "n": "Afternoon Run", "s": "Run", "dk": 1.276, "mm": 9.2, "hr": 151, "tl": 8.0, "p": 7.212, "rc": 80, "ef": "easy"}, {"id": 17422936444, "d": "2026-02-17", "n": "Morning Swim", "s": "Swim", "dk": 2.125, "mm": 45.3, "hr": 128, "tl": 26.0, "sp": 2.133, "ef": "easy"}, {"id": 17424173959, "d": "2026-02-17", "n": "ROUVY - Tour Down Under 2024 | Stage 1 - Bethany", "s": "Bike", "dk": 22.133, "mm": 62.1, "hr": 122, "tl": 13.0, "vr": true, "w": 120, "nw": 134, "cad": 65, "ef": "easy"}, {"id": 17435632944, "d": "2026-02-18", "n": "Lunch Ride", "s": "Bike", "dk": 76.577, "mm": 193.8, "hr": 132, "tl": 71.0, "vr": false, "w": 118, "ef": "easy"}, {"id": 17436718094, "d": "2026-02-18", "n": "Evening Run", "s": "Run", "dk": 10.091, "mm": 61.5, "hr": 153, "tl": 62.0, "p": 6.101, "rc": 81, "ef": "easy"}, {"id": 17457102891, "d": "2026-02-20", "n": "Lunch Swim", "s": "Swim", "dk": 2.05, "mm": 44.4, "hr": 113, "tl": 18.0, "sp": 2.165, "ef": "easy"}, {"id": 17458058984, "d": "2026-02-20", "n": "Afternoon Run", "s": "Run", "dk": 3.081, "mm": 19.9, "hr": 144, "tl": 10.0, "p": 6.455, "rc": 81, "ef": "easy"}, {"id": 17467524988, "d": "2026-02-21", "n": "Morning Ride", "s": "Bike", "dk": 93.936, "mm": 235.8, "hr": 134, "tl": 99.0, "vr": false, "w": 115, "ef": "easy"}, {"id": 17491836005, "d": "2026-02-23", "n": "Evening Run", "s": "Run", "dk": 10.004, "mm": 65.1, "hr": 144, "tl": 30.0, "p": 6.508, "rc": 81, "ef": "easy"}, {"id": 17490408896, "d": "2026-02-23", "n": "Morning Ride", "s": "Bike", "dk": 72.452, "mm": 192.4, "hr": 130, "tl": 59.0, "vr": false, "w": 106, "ef": "easy"}, {"id": 17501357937, "d": "2026-02-24", "n": "Lunch Swim", "s": "Swim", "dk": 3.1, "mm": 68.6, "hr": 140, "tl": 85.0, "sp": 2.212, "ef": "easy"}, {"id": 17501872954, "d": "2026-02-24", "n": "Afternoon Run", "s": "Run", "dk": 1.956, "mm": 10.3, "hr": 162, "tl": 17.0, "p": 5.291, "rc": 83, "ef": "moderate"}, {"id": 17502121505, "d": "2026-02-24", "n": "3x3km  w/ 90sec rest", "s": "Run", "dk": 9.271, "mm": 40.4, "hr": 182, "tl": 134.0, "p": 4.361, "rc": 88, "ef": "hard"}, {"id": 17513622375, "d": "2026-02-25", "n": "Morning Ride", "s": "Bike", "dk": 74.672, "mm": 204.0, "hr": 120, "tl": 44.0, "vr": false, "w": 95, "ef": "easy"}, {"id": 17513981267, "d": "2026-02-25", "n": "Afternoon Run", "s": "Run", "dk": 10.001, "mm": 53.4, "hr": 170, "tl": 117.0, "p": 5.344, "rc": 83, "ef": "moderate"}, {"id": 17536867716, "d": "2026-02-27", "n": "4x500m", "s": "Swim", "dk": 2.225, "mm": 40.6, "hr": 136, "tl": 85.0, "sp": 1.823, "ef": "easy"}, {"id": 17537921212, "d": "2026-02-27", "n": "Afternoon Run", "s": "Run", "dk": 2.036, "mm": 12.7, "hr": 145, "tl": 9.0, "p": 6.214, "rc": 78, "ef": "easy"}, {"id": 17547859082, "d": "2026-02-28", "n": "ROUVY - Over & Unders Z4 and Z5", "s": "Bike", "dk": 55.165, "mm": 91.8, "hr": 160, "tl": 133.0, "vr": true, "w": 204, "nw": 224, "cad": 77, "ef": "hard", "iv": true}, {"id": 17548358817, "d": "2026-02-28", "n": "Afternoon Swim", "s": "Swim", "dk": 1.75, "mm": 36.8, "hr": 132, "tl": 33.0, "sp": 2.1, "ef": "easy"}, {"id": 17559638479, "d": "2026-03-01", "n": "Lunch Run", "s": "Run", "dk": 1.946, "mm": 10.7, "hr": 158, "tl": 14.0, "p": 5.481, "rc": 80, "ef": "moderate"}, {"id": 17559858464, "d": "2026-03-01", "n": "Afternoon Run", "s": "Run", "dk": 14.232, "mm": 66.5, "hr": 178, "tl": 198.0, "p": 4.671, "rc": 85, "ef": "hard"}, {"id": 17572081161, "d": "2026-03-02", "n": "Morning Ride", "s": "Bike", "dk": 73.026, "mm": 200.4, "hr": 116, "tl": 38.0, "vr": false, "w": 96, "ef": "easy"}, {"id": 17573228771, "d": "2026-03-02", "n": "Afternoon Run", "s": "Run", "dk": 10.008, "mm": 65.8, "hr": 145, "tl": 30.0, "p": 6.572, "rc": 80, "ef": "easy"}, {"id": 17583326902, "d": "2026-03-03", "n": "Lunch Swim", "s": "Swim", "dk": 3.0, "mm": 60.4, "hr": 161, "tl": 138.0, "sp": 2.013, "ef": "moderate"}, {"id": 17596097272, "d": "2026-03-04", "n": "Lunch Run", "s": "Run", "dk": 2.023, "mm": 10.7, "hr": 147, "tl": 8.0, "p": 5.271, "rc": 82, "ef": "easy"}, {"id": 17596235656, "d": "2026-03-04", "n": "Afternoon Run", "s": "Run", "dk": 4.615, "mm": 20.3, "hr": 178, "tl": 59.0, "p": 4.402, "rc": 86, "ef": "hard"}, {"id": 17608448968, "d": "2026-03-05", "n": "Morning Ride", "s": "Bike", "dk": 60.437, "mm": 158.1, "hr": 119, "tl": 39.0, "vr": false, "w": 102, "ef": "easy"}, {"id": 17610336373, "d": "2026-03-05", "n": "Afternoon Run", "s": "Run", "dk": 10.002, "mm": 68.6, "hr": 142, "tl": 23.0, "p": 6.862, "rc": 79, "ef": "easy"}, {"id": 17642601364, "d": "2026-03-08", "n": "Morning Swim", "s": "Swim", "dk": 2.175, "mm": 42.2, "hr": 143, "tl": 86.0, "sp": 1.943, "ef": "easy"}, {"id": 17655500874, "d": "2026-03-09", "n": "ROUVY - Pico del Teide | Tenerife", "s": "Bike", "dk": 8.039, "mm": 14.3, "hr": 115, "tl": 2.0, "vr": true, "w": 93, "nw": 99, "cad": 77, "ef": "easy"}, {"id": 17655853377, "d": "2026-03-09", "n": "ROUVY - Race: BonksDay", "s": "Bike", "dk": 52.299, "mm": 114.6, "hr": 132, "tl": 38.0, "vr": true, "w": 110, "nw": 128, "cad": 69, "ef": "easy"}, {"id": 17656721228, "d": "2026-03-09", "n": "Afternoon Run", "s": "Run", "dk": 8.558, "mm": 63.6, "hr": 144, "tl": 22.0, "p": 7.434, "rc": 78, "ef": "easy"}, {"id": 17667680946, "d": "2026-03-10", "n": "Lunch Run", "s": "Run", "dk": 1.327, "mm": 7.2, "elap": 7.2, "hr": 163, "tl": 11.0, "p": 5.387, "rc": 81, "ef": "moderate"}, {"id": 17668544873, "d": "2026-03-10", "n": "Afternoon Swim", "s": "Swim", "dk": 3.0, "mm": 64.7, "elap": 65.5, "hr": 145, "tl": 79.0, "sp": 2.156, "ef": "easy"}, {"id": 17680827314, "d": "2026-03-11", "n": "Lunch Run", "s": "Run", "dk": 10.004, "mm": 68.3, "elap": 68.3, "hr": 141, "tl": 23.0, "p": 6.825, "rc": 80, "ef": "easy"}, {"id": 17681403274, "d": "2026-03-11", "n": "ROUVY - Antelope Island | Salt Lake City | UTAH | USA", "s": "Bike", "dk": 4.201, "mm": 7.6, "elap": 8.3, "hr": 132, "tl": 2.0, "vr": true, "w": 149, "nw": 147, "cad": 77, "ef": "easy"}, {"id": 17682035539, "d": "2026-03-11", "n": "ROUVY - IRONMAN 70.3 Eagleman", "s": "Bike", "dk": 56.436, "mm": 92.3, "elap": 100.2, "hr": 142, "tl": 52.0, "vr": true, "w": 161, "nw": 160, "cad": 79, "ef": "easy"}], "pbs": {}}; // populated from Supabase per user on login

// ===== CHART TOOLTIP ENGINE =====
const TT = {
  el: null,
  _overlays: new WeakMap(), // per-canvas overlay canvas for crosshair
  init() {
    this.el = document.getElementById('chart-tooltip');
  },
  _getEl() {
    if(!this.el) this.init();
    return this.el;
  },
  _getOverlay(canvas) {
    if(this._overlays.has(canvas)) return this._overlays.get(canvas);
    // Create a transparent overlay canvas on top for crosshair drawing
    const ov = document.createElement('canvas');
    ov.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    ov.width = canvas.width; ov.height = canvas.height;
    const parent = canvas.parentElement;
    if(parent.style.position !== 'relative' && parent.style.position !== 'absolute') {
      parent.style.position = 'relative';
    }
    parent.appendChild(ov);
    this._overlays.set(canvas, ov);
    return ov;
  },
  _showTooltip(e, canvas, points, isTouch) {
    const el = this._getEl(); if(!el) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top)  * scaleY;

    // Find closest point (by x proximity first, then distance)
    let closest = null, minD = 999;
    points.forEach(p => {
      const d = Math.hypot(mx - p.cx, my - p.cy);
      if(d < minD) { minD = d; closest = p; }
    });

    // Draw crosshair on overlay
    const ov = this._getOverlay(canvas);
    ov.width = canvas.width; // clears overlay
    if(closest && minD < 50) {
      const ovCtx = ov.getContext('2d');
      // Vertical line at closest x
      ovCtx.strokeStyle = 'rgba(255,255,255,0.15)';
      ovCtx.lineWidth = 1;
      ovCtx.setLineDash([3,3]);
      ovCtx.beginPath();
      ovCtx.moveTo(closest.cx, 0);
      ovCtx.lineTo(closest.cx, canvas.height);
      ovCtx.stroke();
      ovCtx.setLineDash([]);
      // Highlight dot (larger ring)
      ovCtx.strokeStyle = closest.dotColor || 'rgba(255,255,255,0.9)';
      ovCtx.lineWidth = 2;
      ovCtx.beginPath();
      ovCtx.arc(closest.cx, closest.cy, 6, 0, Math.PI*2);
      ovCtx.stroke();

      // Show tooltip
      el.innerHTML = closest.lines.join('<br>');
      el.style.display = 'block';
      let tx = clientX + 16, ty = clientY - 12;
      const tw = el.offsetWidth || 160;
      const th = el.offsetHeight || 80;
      if(tx + tw > window.innerWidth - 8) tx = clientX - tw - 16;
      if(ty < 8) ty = clientY + 16;
      if(ty + th > window.innerHeight - 8) ty = window.innerHeight - th - 8;
      el.style.left = tx + 'px';
      el.style.top  = ty + 'px';
      canvas.style.cursor = 'crosshair';
    } else {
      el.style.display = 'none';
      canvas.style.cursor = 'crosshair';
    }
  },
  _hideTooltip(canvas) {
    const el = this._getEl(); if(el) el.style.display = 'none';
    const ov = this._overlays.get(canvas);
    if(ov) ov.width = canvas.width; // clear overlay
  },
  register(canvas, points) {
    if(!canvas || !points || !points.length) return;
    canvas.style.cursor = 'crosshair';
    // Remove any stale overlay from previous render
    if(this._overlays.has(canvas)) {
      const old = this._overlays.get(canvas);
      if(old.parentElement) old.parentElement.removeChild(old);
      this._overlays.delete(canvas);
    }
    // Tag each point with its line color for highlight ring
    points.forEach(p => {
      if(!p.dotColor && p.lines && p.lines[0]) {
        const m = p.lines[0].match(/color:([^;>"]+)/);
        p.dotColor = m ? m[1].trim() : 'rgba(255,255,255,0.9)';
      }
    });
    canvas.onmousemove  = (e) => this._showTooltip(e, canvas, points, false);
    canvas.onmouseleave = ()  => this._hideTooltip(canvas);
    canvas.ontouchmove  = (e) => { e.preventDefault(); this._showTooltip(e, canvas, points, true); };
    canvas.ontouchend   = ()  => this._hideTooltip(canvas);
    canvas.style.touchAction = 'none';
  }
};

// ===== STRAVA → PLANNER IMPORT =====
