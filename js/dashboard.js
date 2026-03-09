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
  // Checkins
  const cc=document.getElementById('hc-checkins');
  if(!D.checkins.length){cc.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:16px 0;text-align:center;">No check-ins yet</div>';} else {
    cc.innerHTML=`<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Date</th><th>Block</th><th>Hrs</th><th>Score</th><th>Nutrition</th><th>Life Stress</th><th>Decision</th><th></th></tr></thead><tbody>${[...D.checkins].map((c,i)=>{const idx=D.checkins.indexOf(c);const sc=c.score>=8?'var(--green)':c.score>=5?'var(--orange)':'var(--red)';const action=c.score>=8?'🟢 Increase':c.score>=5?'🟡 Hold':'🔴 Reduce';return`<tr><td style="white-space:nowrap;">${c.date}</td><td>${c.block||'—'}</td><td>${c.hours||'—'}</td><td style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:${sc};">${c.score}/10</td><td>${c.nutrition?c.nutrition+'/5':'—'}</td><td>${c.lifestress?c.lifestress+'/5':'—'}</td><td style="font-size:11px;">${action}</td><td><button class="btn sec sml" style="font-size:10px;padding:2px 8px;" onclick="editCheckin(${idx})">✏️ Edit</button></td></tr>`;}).join('')}</tbody></table></div>`;
  }
  // Morning
  const mc=document.getElementById('hc-morning');
  if(!D.mornings.length){mc.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:16px 0;text-align:center;">No morning checks yet</div>';}else{
    mc.innerHTML=`<div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>HRV</th><th>RHR</th><th>Sleep</th><th>Sleep h</th><th>Stress</th><th>Legs</th><th>Cal In</th><th>Status</th><th></th></tr></thead><tbody>${[...D.mornings].reverse().map(m=>{const idx=D.mornings.indexOf(m);const se=m.status==='green'?'🟢':m.status==='amber'?'🟡':'🔴';return`<tr><td style="white-space:nowrap;font-size:10px;">${m.date}</td><td>${m.hrv||'—'}</td><td>${m.rhr||'—'}</td><td>${m.sleepScore||'—'}</td><td>${m.sleep||'—'}</td><td>${m.gstress||'—'}</td><td>${m.legs||'—'}</td><td>${m.calIn||'—'}</td><td>${se}</td><td><button class="btn sec sml" style="font-size:10px;padding:2px 8px;" onclick="editMorning(${idx})">✏️ Edit</button></td></tr>`;}).join('')}</tbody></table></div>`;
  }
}

// ===== DASHBOARD =====
function updateDashboard(){
  const m=D.mornings;
  const today=localDateStr(new Date());
  if(m.length){
    const l=m[m.length-1];
    const isToday = l.date===today;
    if(l.hrv){
      document.getElementById('d-hrv-v').textContent=l.hrv;
      const prev=m.slice(-8,-1).filter(x=>x.hrv);
      if(prev.length){const avg=prev.reduce((a,x)=>a+x.hrv,0)/prev.length;const diff=l.hrv-avg;document.getElementById('d-hrv-s').textContent=(diff>=0?'+':'')+Math.round(diff)+' vs avg ('+Math.round(avg)+')';document.getElementById('d-hrv').className='metric'+(diff>=-4?'':diff>=-9?' o':' r');}
    }
    if(l.rhr){document.getElementById('d-rhr-v').textContent=l.rhr+'bpm';const rhrH=m.slice(-14).filter(x=>x.rhr);const baseR=rhrH.length>=3?rhrH.reduce((a,x)=>a+x.rhr,0)/rhrH.length:50;const rDiff=l.rhr-baseR;document.getElementById('d-rhr-s').textContent=(rDiff<=0?'Below':'+')+Math.abs(Math.round(rDiff))+'bpm vs baseline';}
    if(l.sleepScore){
      document.getElementById('d-sleep-v').textContent=l.sleepScore;
      const sc=l.sleepScore;
      document.getElementById('d-sleep-s').textContent=sc>=88?'Excellent':sc>=80?'Good':sc>=70?'Average — monitor':'Poor — recovery impacted';
      document.getElementById('d-sleep-v').parentElement.className='metric'+(sc>=80?' g':sc>=70?' o':' r');
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
  document.getElementById('d-week-lbl').textContent=weekLabel(wk);
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
  if(!days.length){snap.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">No sessions planned — <span style="color:var(--blue);cursor:pointer;" onclick="nav(\'planner\')">open planner →</span></div>';return;}
  snap.innerHTML=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:10px;">${DAYS.map((_,di)=>{const d=plan[di];if(!d||!d.types)return`<div style="background:var(--surface2);border-radius:7px;padding:8px 6px;text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1px;color:var(--text-dim);">${DAYS[di].slice(0,3).toUpperCase()}</div><div style="font-size:9px;color:var(--text-dim);margin-top:2px;">Rest</div></div>`;const isHard=/interval|effort|threshold|max|285|260|245|hard|vo2/i.test(d.plan||'');const qc=d.quality>=4?'var(--green)':d.quality>=3?'var(--orange)':d.quality?'var(--red)':'';return`<div style="background:var(--surface2);border:1px solid ${isHard?'rgba(244,67,54,.3)':'var(--border)'};border-radius:7px;padding:8px 6px;"><div style="font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1px;${isHard?'color:var(--red)':''};">${DAYS[di].slice(0,3).toUpperCase()}</div><div style="font-size:9px;color:var(--text-mid);margin-top:2px;line-height:1.3;">${d.types}</div>${d.quality?`<div style="font-family:'Bebas Neue',sans-serif;font-size:12px;color:${qc};margin-top:3px;">Q${d.quality} R${d.recovery||'?'}</div>`:''}</div>`;}).join('')}</div>`;
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

function openPBModal(){
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

function closePBModal(){document.getElementById('pb-modal').classList.remove('open');}

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
  save();renderPBs();closePBModal();showToast('PBs updated ✓');
}

// ===== UTILS =====
function confirmClear(){if(confirm('Clear all data? Cannot be undone.')){D={mornings:[],checkins:[],pbs:D.pbs,plans:{}};save();updateDashboard();renderHistory();showToast('Data cleared');}}

function showToast(msg,err=false){
  const t=document.getElementById('toast');t.textContent=msg;t.className='toast'+(err?' err':'');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);
}

// ===== STRAVA DATA =====
const STRAVA_ACTS = {"acts": [{"id": 17491836005, "d": "2026-02-23", "n": "Evening Run", "s": "Run", "dk": 10.004, "mm": 65.1, "hr": 144, "tl": 30.0, "p": 6.508, "rc": 81, "ef": "easy"}, {"id": 17501357937, "d": "2026-02-24", "n": "Lunch Swim", "s": "Swim", "dk": 3.1, "mm": 68.6, "hr": 140, "tl": 85.0, "sp": 2.212, "ef": "easy"}, {"id": 17501872954, "d": "2026-02-24", "n": "Afternoon Run", "s": "Run", "dk": 1.956, "mm": 10.3, "hr": 162, "tl": 17.0, "p": 5.291, "rc": 83, "ef": "moderate"}, {"id": 17502121505, "d": "2026-02-24", "n": "3x3km  w/ 90sec rest", "s": "Run", "dk": 9.271, "mm": 40.4, "hr": 182, "tl": 134.0, "p": 4.361, "rc": 88, "ef": "hard"}, {"id": 17513622375, "d": "2026-02-25", "n": "Morning Ride", "s": "Bike", "dk": 74.672, "mm": 204.0, "hr": 120, "tl": 44.0, "vr": false, "w": 95, "ef": "easy"}, {"id": 17513981267, "d": "2026-02-25", "n": "Afternoon Run", "s": "Run", "dk": 10.001, "mm": 53.4, "hr": 170, "tl": 117.0, "p": 5.344, "rc": 83, "ef": "moderate"}, {"id": 17536867716, "d": "2026-02-27", "n": "4x500m", "s": "Swim", "dk": 2.225, "mm": 40.6, "hr": 136, "tl": 85.0, "sp": 1.823, "ef": "easy"}, {"id": 17537921212, "d": "2026-02-27", "n": "Afternoon Run", "s": "Run", "dk": 2.036, "mm": 12.7, "hr": 145, "tl": 9.0, "p": 6.214, "rc": 78, "ef": "easy"}, {"id": 17547859082, "d": "2026-02-28", "n": "ROUVY - Over & Unders Z4 and Z5", "s": "Bike", "dk": 55.165, "mm": 91.8, "hr": 160, "tl": 133.0, "vr": true, "w": 204, "nw": 224, "cad": 77, "ef": "hard", "iv": true}, {"id": 17548358817, "d": "2026-02-28", "n": "Afternoon Swim", "s": "Swim", "dk": 1.75, "mm": 36.8, "hr": 132, "tl": 33.0, "sp": 2.1, "ef": "easy"}, {"id": 17559638479, "d": "2026-03-01", "n": "Lunch Run", "s": "Run", "dk": 1.946, "mm": 10.7, "hr": 158, "tl": 14.0, "p": 5.481, "rc": 80, "ef": "moderate"}, {"id": 17559858464, "d": "2026-03-01", "n": "Afternoon Run", "s": "Run", "dk": 14.232, "mm": 66.5, "hr": 178, "tl": 198.0, "p": 4.671, "rc": 85, "ef": "hard"}, {"id": 17572081161, "d": "2026-03-02", "n": "Morning Ride", "s": "Bike", "dk": 73.026, "mm": 200.4, "hr": 116, "tl": 38.0, "vr": false, "w": 96, "ef": "easy"}, {"id": 17573228771, "d": "2026-03-02", "n": "Afternoon Run", "s": "Run", "dk": 10.008, "mm": 65.8, "hr": 145, "tl": 30.0, "p": 6.572, "rc": 80, "ef": "easy"}, {"id": 17583326902, "d": "2026-03-03", "n": "Lunch Swim", "s": "Swim", "dk": 3.0, "mm": 60.4, "hr": 161, "tl": 138.0, "sp": 2.013, "ef": "moderate"}, {"id": 17596097272, "d": "2026-03-04", "n": "Lunch Run", "s": "Run", "dk": 2.023, "mm": 10.7, "hr": 147, "tl": 8.0, "p": 5.271, "rc": 82, "ef": "easy"}, {"id": 17596235656, "d": "2026-03-04", "n": "Afternoon Run", "s": "Run", "dk": 4.615, "mm": 20.3, "hr": 178, "tl": 59.0, "p": 4.402, "rc": 86, "ef": "hard"}, {"id": 17608448968, "d": "2026-03-05", "n": "Morning Ride", "s": "Bike", "dk": 60.437, "mm": 158.1, "hr": 119, "tl": 39.0, "vr": false, "w": 102, "ef": "easy"}, {"id": 17610336373, "d": "2026-03-05", "n": "Afternoon Run", "s": "Run", "dk": 10.002, "mm": 68.6, "hr": 142, "tl": 23.0, "p": 6.862, "rc": 79, "ef": "easy"}, {"id": 17642601364, "d": "2026-03-08", "n": "Morning Swim", "s": "Swim", "dk": 2.175, "mm": 42.2, "hr": 143, "tl": 86.0, "sp": 1.943, "ef": "easy"}], "pbs": {}}; // populated from Supabase per user on login

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
