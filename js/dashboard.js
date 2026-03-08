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
      if(d&&(d.completed||d.plan))allS.push({wk,day,di,d});
    });
  });
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
    const paceM = line.match(/(\d:\d{2})\/km/);
    const wattM = line.match(/NP (\d+)W/);
    const hrM = line.match(/@ (\d+)bpm/);
    const efM = line.match(/\[(Z[2-5]|INTERVAL|WU|CD)\]/);
    const sport = line.match(/^(\w+):/)?.[1] || '';
    const sportColor = /Swim/i.test(sport)?'#2196f3':/Rouvy|Ride/i.test(sport)?'#ff9800':'#00e676';
    const efColor = efM?{Z2:'#00e676',Z3:'#ff9800',Z4:'#ff7043',Z5:'#f44336',INTERVAL:'#f44336',WU:'var(--text-dim)',CD:'var(--text-dim)'}[efM[1]]||'var(--text-dim)':'';
    const parts = [
      kmM ? kmM[1]+'km' : '',
      paceM ? '<span style="font-family:monospace;">'+paceM[1]+'/km</span>' : '',
      wattM ? wattM[1]+'W NP' : '',
      hrM ? hrM[1]+'bpm' : '',
      efM ? '<span style="font-size:9px;font-weight:700;color:'+efColor+';">'+efM[1]+'</span>' : ''
    ].filter(Boolean).join(' ');
    return parts ? '<span style="color:'+sportColor+';font-size:9px;font-weight:700;">'+sport.toUpperCase()+'</span> <span style="font-size:10px;color:var(--text-mid);">'+parts+'</span>' : '';
  }).filter(Boolean);
  const stats = statLines.join('<br>') || comp.split('\n').find(l=>l.trim()&&!l.startsWith('---'))?.slice(0,60) || '—';
  return`<tr>
    <td style="color:var(--text-dim);font-size:10px;white-space:nowrap;">${s.wk}</td>
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
const STRAVA_ACTS = {"acts": [{"d": "2021-02-17", "n": "Afternoon Run", "s": "Run", "dk": 5.421, "mm": 46.5, "ef": "moderate", "p": 8.569}, {"d": "2024-02-07", "n": "Evening Run", "s": "Run", "dk": 5.196, "mm": 37.7, "ef": "moderate", "p": 7.25}, {"d": "2024-02-11", "n": "Evening Run", "s": "Run", "dk": 4.898, "mm": 35.0, "ef": "moderate", "p": 7.15}, {"d": "2024-02-11", "n": "Evening Run", "s": "Run", "dk": 1.225, "mm": 6.0, "ef": "easy", "p": 4.87, "wu": true}, {"d": "2024-12-09", "n": "Evening Run", "s": "Run", "dk": 8.447, "mm": 66.1, "ef": "moderate", "p": 7.821}, {"d": "2024-12-26", "n": "Night Run", "s": "Run", "dk": 10.7, "mm": 82.7, "ef": "moderate", "p": 7.723}, {"d": "2025-01-04", "n": "Night Run", "s": "Run", "dk": 16.621, "mm": 132.4, "ef": "moderate", "p": 7.967}, {"d": "2025-01-05", "n": "Evening Run", "s": "Run", "dk": 5.073, "mm": 33.5, "ef": "moderate", "p": 6.601}, {"d": "2025-01-05", "n": "Evening Run", "s": "Run", "dk": 1.126, "mm": 5.9, "ef": "easy", "p": 5.225, "wu": true}, {"d": "2025-01-12", "n": "Evening Run", "s": "Run", "dk": 10.294, "mm": 72.7, "ef": "moderate", "p": 7.065}, {"d": "2025-01-12", "n": "Evening Run", "s": "Run", "dk": 0.985, "mm": 4.3, "ef": "easy", "p": 4.416, "wu": true}, {"d": "2025-01-15", "n": "Evening Run", "s": "Run", "dk": 5.103, "mm": 33.1, "ef": "moderate", "p": 6.48}, {"d": "2025-01-19", "n": "Evening Run", "s": "Run", "dk": 15.411, "mm": 113.8, "ef": "moderate", "p": 7.384}, {"d": "2025-01-24", "n": "Evening Run", "s": "Run", "dk": 9.29, "mm": 63.6, "ef": "moderate", "p": 6.845}, {"d": "2025-01-26", "n": "Evening Run", "s": "Run", "dk": 10.212, "mm": 71.6, "ef": "moderate", "p": 7.015}, {"d": "2025-01-29", "n": "Evening Run", "s": "Run", "dk": 5.798, "mm": 43.2, "ef": "moderate", "p": 7.457}, {"d": "2025-01-29", "n": "Lunch Run", "s": "Run", "dk": 1.87, "mm": 9.7, "ef": "easy", "p": 5.187, "wu": true}, {"d": "2025-02-02", "n": "Afternoon Run", "s": "Run", "dk": 22.084, "mm": 173.9, "ef": "moderate", "p": 7.876}, {"d": "2025-02-09", "n": "Afternoon Run", "s": "Run", "dk": 6.326, "mm": 44.6, "ef": "moderate", "p": 7.056}, {"d": "2025-02-09", "n": "Evening Run", "s": "Run", "dk": 1.453, "mm": 6.8, "ef": "easy", "p": 4.679, "wu": true}, {"d": "2025-02-10", "n": "Evening Run", "s": "Run", "dk": 6.092, "mm": 30.0, "ef": "moderate", "p": 4.93}, {"d": "2025-02-16", "n": "Evening Run", "s": "Run", "dk": 6.651, "mm": 40.0, "ef": "moderate", "p": 6.021}, {"d": "2025-02-16", "n": "Evening Run", "s": "Run", "dk": 3.523, "mm": 20.4, "ef": "moderate", "p": 5.795}, {"d": "2025-02-19", "n": "Night Run", "s": "Run", "dk": 11.531, "mm": 84.1, "ef": "moderate", "p": 7.294}, {"d": "2025-02-23", "n": "Night Run", "s": "Run", "dk": 10.005, "mm": 57.8, "ef": "moderate", "p": 5.779}, {"d": "2025-03-01", "n": "Night Run", "s": "Run", "dk": 10.145, "mm": 73.6, "ef": "moderate", "p": 7.256}, {"d": "2025-03-01", "n": "Night Run", "s": "Run", "dk": 5.004, "mm": 31.1, "ef": "moderate", "p": 6.212}, {"d": "2025-03-02", "n": "Night Run", "s": "Run", "dk": 10.206, "mm": 69.3, "ef": "moderate", "p": 6.794}, {"d": "2025-03-12", "n": "Night Run", "s": "Run", "dk": 13.379, "mm": 80.8, "ef": "moderate", "p": 6.036}, {"d": "2025-03-15", "n": "Night Run", "s": "Run", "dk": 15.003, "mm": 89.7, "ef": "moderate", "p": 5.98}, {"d": "2025-03-16", "n": "Almost drowned", "s": "Swim", "dk": 1.15, "mm": 45.0, "ef": "moderate", "sp": 3.913}, {"d": "2025-03-22", "n": "Night Run", "s": "Run", "dk": 10.992, "mm": 68.9, "ef": "moderate", "p": 6.266}, {"d": "2025-03-24", "n": "Night Run", "s": "Run", "dk": 10.25, "mm": 72.8, "ef": "moderate", "p": 7.101}, {"d": "2025-03-26", "n": "10x1km interval (90s rest)", "s": "Run", "dk": 10.004, "mm": 51.4, "ef": "hard", "p": 5.141, "iv": true}, {"d": "2025-03-29", "n": "5x1km (3min rest)", "s": "Run", "dk": 5.0, "mm": 22.9, "ef": "hard", "p": 4.586, "iv": true}, {"d": "2025-03-30", "n": "Week 1 done 📈", "s": "Run", "dk": 15.001, "mm": 115.6, "ef": "moderate", "p": 7.705}, {"d": "2025-03-31", "n": "12.5km accidentally paused it - easy run", "s": "Run", "dk": 10.332, "mm": 78.7, "ef": "moderate", "p": 7.621}, {"d": "2025-04-02", "n": "15x500m intervals (90s rest) (7.5km total)", "s": "Run", "dk": 7.504, "mm": 31.4, "ef": "hard", "p": 4.189, "iv": true}, {"d": "2025-04-05", "n": "Night Run", "s": "Run", "dk": 4.574, "mm": 25.6, "hr": 185, "ef": "hard", "p": 5.604, "rc": 81}, {"d": "2025-04-05", "n": "Night Run", "s": "Run", "dk": 4.633, "mm": 26.7, "hr": 164, "ef": "moderate", "p": 5.759, "rc": 82}, {"d": "2025-04-06", "n": "Week 2 done 📈", "s": "Run", "dk": 17.091, "mm": 128.0, "hr": 154, "ef": "easy", "p": 7.491, "rc": 80}, {"d": "2025-04-07", "n": "Supposed to be an easy run (felt pretty easy though so a bit quicker)", "s": "Run", "dk": 10.01, "mm": 63.1, "hr": 165, "ef": "moderate", "p": 6.301, "rc": 81}, {"d": "2025-04-10", "n": "7x1km @ 5.07 w/ 90s rest + 3km @ 6.35 pace on treadmill", "s": "Run", "dk": 10.0, "mm": 60.0, "ef": "hard", "p": 6.0, "iv": true}, {"d": "2025-04-12", "n": "Week 3 done 📈", "s": "Run", "dk": 21.139, "mm": 161.1, "hr": 157, "ef": "moderate", "p": 7.621, "rc": 80}, {"d": "2025-04-14", "n": "Easy Run", "s": "Run", "dk": 10.141, "mm": 82.8, "hr": 146, "ef": "easy", "p": 8.17, "rc": 79}, {"d": "2025-04-16", "n": "Treadmill (stats are wrong)

12x500m Intervals (90s rest) @ 4.15", "s": "Run", "dk": 6.11, "mm": 41.3, "hr": 176, "ef": "hard", "p": 6.759, "iv": true, "rc": 81}, {"d": "2025-04-18", "n": "Treadmill: 
1x1km @ 5.21
1x0.5km @ 7.07
X7", "s": "Run", "dk": 11.563, "mm": 63.0, "hr": 180, "ef": "hard", "p": 5.454, "iv": true, "rc": 80}, {"d": "2025-04-20", "n": "Morning Run", "s": "Run", "dk": 4.858, "mm": 39.8, "hr": 152, "ef": "easy", "p": 8.19, "rc": 80}, {"d": "2025-04-21", "n": "Treadmill (stats wrong)

15km @ 6.31 pace", "s": "Run", "dk": 17.262, "mm": 97.7, "hr": 173, "ef": "hard", "p": 5.661, "iv": true, "rc": 80}, {"d": "2025-04-22", "n": "21km Part 1", "s": "Run", "dk": 10.005, "mm": 57.2, "hr": 174, "ef": "hard", "p": 5.721, "rc": 82}, {"d": "2025-04-22", "n": "21km Part 2", "s": "Run", "dk": 11.261, "mm": 71.1, "hr": 166, "ef": "moderate", "p": 6.313, "rc": 81}, {"d": "2025-04-27", "n": "Treadmill run - 11km (1hr 9 mins) w/ 2km warm up included", "s": "Run", "dk": 12.215, "mm": 75.9, "hr": 171, "ef": "moderate", "p": 6.21, "rc": 79}, {"d": "2025-04-28", "n": "12km (including 2km warm up)", "s": "Run", "dk": 12.67, "mm": 73.5, "hr": 177, "ef": "hard", "p": 5.803, "rc": 79}, {"d": "2025-04-30", "n": "Phuket running - 33 degrees / 9 UV", "s": "Run", "dk": 9.036, "mm": 65.7, "hr": 164, "ef": "moderate", "p": 7.268, "rc": 80}, {"d": "2025-05-01", "n": "6.40 pace for 1hr 30min (was 13.5km)", "s": "Run", "dk": 15.674, "mm": 89.8, "hr": 168, "ef": "moderate", "p": 5.733, "rc": 79}, {"d": "2025-05-05", "n": "Treadmill Run in Patong - 17km @6.31 ish", "s": "Run", "dk": 19.64, "mm": 113.0, "hr": 160, "ef": "moderate", "p": 5.757, "iv": true, "rc": 79}, {"d": "2025-05-12", "n": "Long Run!", "s": "Run", "dk": 25.468, "mm": 191.4, "hr": 161, "ef": "moderate", "p": 7.518, "rc": 80}, {"d": "2025-05-14", "n": "Intervals (Started to quickly)", "s": "Run", "dk": 8.328, "mm": 62.1, "hr": 179, "ef": "hard", "p": 7.457, "iv": true, "rc": 78}, {"d": "2025-05-16", "n": "Speedy 15km with new equipment!", "s": "Run", "dk": 15.009, "mm": 103.2, "hr": 165, "ef": "hard", "p": 6.873, "rc": 79, "iv": true}, {"d": "2025-05-19", "n": "Sheri Half Marathon PB + Race Pace trial!", "s": "Run", "dk": 21.125, "mm": 148.9, "hr": 161, "ef": "moderate", "p": 7.05, "rc": 79}, {"d": "2025-05-22", "n": "Night Run", "s": "Run", "dk": 7.224, "mm": 52.9, "hr": 148, "ef": "easy", "p": 7.316, "rc": 78}, {"d": "2025-05-24", "n": "Morning Run", "s": "Run", "dk": 35.072, "mm": 255.7, "hr": 166, "ef": "moderate", "p": 7.291, "rc": 80}, {"d": "2025-05-29", "n": "Evening Run", "s": "Run", "dk": 1.531, "mm": 11.4, "hr": 158, "ef": "easy", "p": 7.46, "rc": 77, "wu": true}, {"d": "2025-05-31", "n": "Morning Run", "s": "Run", "dk": 42.261, "mm": 308.5, "hr": 168, "ef": "moderate", "p": 7.3, "rc": 77}, {"d": "2025-06-23", "n": "Afternoon Run", "s": "Run", "dk": 3.008, "mm": 21.4, "hr": 154, "ef": "easy", "p": 7.11, "rc": 77}, {"d": "2025-06-26", "n": "Afternoon Run", "s": "Run", "dk": 5.492, "mm": 35.5, "hr": 179, "ef": "hard", "p": 6.457, "rc": 80}, {"d": "2025-06-29", "n": "Lunch Run", "s": "Run", "dk": 6.703, "mm": 49.8, "hr": 164, "ef": "moderate", "p": 7.431, "rc": 79}, {"d": "2025-06-29", "n": "Afternoon Swim", "s": "Swim", "dk": 1.0, "mm": 17.2, "hr": 146, "ef": "hard", "sp": 1.717, "pl": 50, "sc": 23}, {"d": "2025-07-01", "n": "Afternoon Run", "s": "Run", "dk": 3.546, "mm": 20.9, "hr": 171, "ef": "moderate", "p": 5.896, "rc": 78}, {"d": "2025-07-03", "n": "Intervals", "s": "Run", "dk": 8.53, "mm": 58.8, "hr": 181, "ef": "hard", "p": 6.893, "iv": true, "rc": 80}, {"d": "2025-07-05", "n": "10x1km @5.07 w/ 3min rest", "s": "Run", "dk": 10.734, "mm": 93.2, "hr": 175, "ef": "hard", "p": 8.685, "iv": true, "rc": 79}, {"d": "2025-07-08", "n": "Warm up", "s": "Run", "dk": 0.986, "mm": 5.7, "hr": 170, "ef": "easy", "p": 5.813, "rc": 79, "wu": true}, {"d": "2025-07-08", "n": "Intervals", "s": "Run", "dk": 5.387, "mm": 23.3, "hr": 184, "ef": "hard", "p": 4.319, "iv": true, "rc": 85}, {"d": "2025-07-10", "n": "Afternoon Run", "s": "Run", "dk": 0.883, "mm": 5.4, "hr": 157, "ef": "easy", "p": 6.096, "rc": 79, "wu": true}, {"d": "2025-07-10", "n": "Interval - 10x1km (3min rest)", "s": "Run", "dk": 10.011, "mm": 46.9, "hr": 184, "ef": "hard", "p": 4.688, "iv": true, "rc": 83}, {"d": "2025-07-13", "n": "Afternoon Run", "s": "Run", "dk": 12.146, "mm": 70.9, "hr": 182, "ef": "hard", "p": 5.834, "rc": 81}, {"d": "2025-07-15", "n": "15x500m w/ 90s rest (goal was sub 4.00)", "s": "Run", "dk": 7.499, "mm": 29.8, "hr": 182, "ef": "hard", "p": 3.967, "iv": true, "rc": 87}, {"d": "2025-07-17", "n": "Failed", "s": "Run", "dk": 7.423, "mm": 33.8, "hr": 184, "ef": "hard", "p": 4.551, "rc": 85}, {"d": "2025-07-19", "n": "5x Loop Practice", "s": "Run", "dk": 30.398, "mm": 287.3, "hr": 142, "ef": "easy", "p": 9.448, "rc": 71}, {"d": "2025-07-22", "n": "Afternoon Run", "s": "Run", "dk": 5.009, "mm": 23.4, "hr": 186, "ef": "hard", "p": 4.669, "rc": 83}, {"d": "2025-07-24", "n": "Afternoon Run", "s": "Run", "dk": 2.071, "mm": 11.7, "hr": 179, "ef": "easy", "p": 5.65, "rc": 80, "wu": true}, {"d": "2025-07-24", "n": "Failed", "s": "Run", "dk": 6.207, "mm": 29.9, "hr": 187, "ef": "hard", "p": 4.82, "rc": 82}, {"d": "2025-07-26", "n": "Afternoon Ride", "s": "Bike", "dk": 19.925, "mm": 95.2, "hr": 108, "ef": "easy"}, {"d": "2025-07-27", "n": "7x Loop Practice", "s": "Run", "dk": 42.498, "mm": 338.0, "hr": 132, "ef": "easy", "p": 7.952, "rc": 59}, {"d": "2025-07-28", "n": "Afternoon Ride", "s": "Bike", "dk": 14.349, "mm": 53.9, "hr": 121, "ef": "easy"}, {"d": "2025-07-29", "n": "Afternoon Run", "s": "Run", "dk": 7.012, "mm": 38.5, "hr": 173, "ef": "hard", "p": 5.493, "rc": 82}, {"d": "2025-07-31", "n": "7x1km w/ 3min rest", "s": "Run", "dk": 7.012, "mm": 29.0, "hr": 177, "ef": "hard", "p": 4.136, "iv": true, "rc": 85}, {"d": "2025-08-01", "n": "Afternoon Ride", "s": "Bike", "dk": 30.027, "mm": 117.6, "hr": 111, "ef": "easy"}, {"d": "2025-08-03", "n": "Lunch Run", "s": "Run", "dk": 5.914, "mm": 31.0, "hr": 178, "ef": "hard", "p": 5.248, "rc": 83}, {"d": "2025-08-06", "n": "Afternoon Run", "s": "Run", "dk": 5.004, "mm": 32.7, "hr": 156, "ef": "moderate", "p": 6.539, "rc": 79}, {"d": "2025-08-07", "n": "Morning Run", "s": "Run", "dk": 90.779, "mm": 683.7, "hr": 148, "ef": "easy", "p": 7.531, "rc": 77}, {"d": "2025-08-11", "n": "Afternoon Ride", "s": "Bike", "dk": 57.275, "mm": 200.4, "hr": 115, "ef": "easy"}, {"d": "2025-08-12", "n": "Afternoon Run", "s": "Run", "dk": 4.006, "mm": 26.2, "hr": 152, "ef": "easy", "p": 6.533, "rc": 79}, {"d": "2025-08-15", "n": "Afternoon Ride", "s": "Bike", "dk": 19.989, "mm": 62.9, "hr": 144, "ef": "easy"}, {"d": "2025-08-15", "n": "Afternoon Ride", "s": "Bike", "dk": 20.276, "mm": 72.5, "hr": 142, "ef": "easy"}, {"d": "2025-08-18", "n": "Afternoon Run", "s": "Run", "dk": 5.086, "mm": 28.1, "hr": 153, "ef": "moderate", "p": 5.515, "rc": 81}, {"d": "2025-08-20", "n": "Evening Run", "s": "Run", "dk": 10.016, "mm": 59.0, "hr": 156, "ef": "moderate", "p": 5.893, "rc": 81}, {"d": "2025-08-22", "n": "Lunch Run", "s": "Run", "dk": 15.007, "mm": 81.8, "hr": 182, "ef": "hard", "p": 5.45, "rc": 84}, {"d": "2025-08-22", "n": "Afternoon Ride", "s": "Bike", "dk": 18.304, "mm": 78.5, "hr": 129, "ef": "easy"}, {"d": "2025-08-22", "n": "Afternoon Ride", "s": "Bike", "dk": 18.381, "mm": 68.8, "hr": 140, "ef": "easy"}, {"d": "2025-08-24", "n": "Afternoon Run", "s": "Run", "dk": 10.095, "mm": 58.1, "hr": 170, "ef": "moderate", "p": 5.759, "rc": 82}, {"d": "2025-08-24", "n": "Afternoon Ride", "s": "Bike", "dk": 20.237, "mm": 68.2, "hr": 137, "ef": "easy"}, {"d": "2025-08-27", "n": "Morning Run", "s": "Run", "dk": 15.901, "mm": 89.7, "hr": 182, "ef": "hard", "p": 5.638, "rc": 82}, {"d": "2025-08-28", "n": "Lunch Ride", "s": "Bike", "dk": 6.915, "mm": 20.4, "hr": 132, "ef": "easy"}, {"d": "2025-08-28", "n": "Lunch Ride", "s": "Bike", "dk": 30.186, "mm": 80.2, "hr": 153, "ef": "moderate"}, {"d": "2025-08-28", "n": "Afternoon Ride", "s": "Bike", "dk": 7.217, "mm": 27.2, "hr": 145, "ef": "easy"}, {"d": "2025-08-29", "n": "Lunch Run", "s": "Run", "dk": 2.651, "mm": 18.7, "hr": 152, "ef": "easy", "p": 7.047, "rc": 81}, {"d": "2025-08-29", "n": "Lunch Run", "s": "Run", "dk": 2.533, "mm": 13.4, "hr": 180, "ef": "hard", "p": 5.291, "rc": 84}, {"d": "2025-08-29", "n": "Lunch Run", "s": "Run", "dk": 2.563, "mm": 18.4, "hr": 163, "ef": "moderate", "p": 7.165, "rc": 78}, {"d": "2025-08-30", "n": "Morning Ride", "s": "Bike", "dk": 24.079, "mm": 73.0, "hr": 138, "ef": "easy"}, {"d": "2025-08-31", "n": "Lunch Run", "s": "Run", "dk": 15.336, "mm": 83.8, "hr": 179, "ef": "hard", "p": 5.468, "rc": 83}, {"d": "2025-08-31", "n": "Afternoon Run", "s": "Run", "dk": 1.235, "mm": 7.3, "hr": 166, "ef": "easy", "p": 5.883, "rc": 82, "wu": true}, {"d": "2025-10-01", "n": "Afternoon Run", "s": "Run", "dk": 10.035, "mm": 58.0, "hr": 176, "ef": "hard", "p": 5.779, "rc": 82}, {"d": "2025-10-02", "n": "Morning Ride", "s": "Bike", "dk": 5.694, "mm": 17.0, "hr": 122, "ef": "easy"}, {"d": "2025-10-02", "n": "Lunch Ride", "s": "Bike", "dk": 33.247, "mm": 102.3, "hr": 123, "ef": "easy"}, {"d": "2025-10-03", "n": "Afternoon Run", "s": "Run", "dk": 2.504, "mm": 18.6, "hr": 151, "ef": "easy", "p": 7.427, "rc": 79}, {"d": "2025-10-03", "n": "Afternoon Run", "s": "Run", "dk": 2.358, "mm": 11.8, "hr": 179, "ef": "easy", "p": 5.004, "rc": 84, "wu": true}, {"d": "2025-10-03", "n": "Afternoon Run", "s": "Run", "dk": 10.301, "mm": 63.7, "hr": 169, "ef": "moderate", "p": 6.187, "rc": 82}, {"d": "2025-10-05", "n": "Lunch Run", "s": "Run", "dk": 25.061, "mm": 163.3, "hr": 167, "ef": "moderate", "p": 6.518, "rc": 81}, {"d": "2025-10-07", "n": "Mt Cootha Again 😅", "s": "Run", "dk": 12.706, "mm": 105.1, "hr": 169, "ef": "moderate", "p": 8.275, "rc": 79}, {"d": "2025-10-08", "n": "Afternoon Run", "s": "Run", "dk": 15.067, "mm": 100.4, "hr": 150, "ef": "easy", "p": 6.664, "rc": 81}, {"d": "2025-10-10", "n": "Afternoon Run", "s": "Run", "dk": 10.006, "mm": 62.0, "hr": 172, "ef": "moderate", "p": 6.193, "rc": 82}, {"d": "2025-10-12", "n": "Fail", "s": "Run", "dk": 26.018, "mm": 148.8, "hr": 166, "ef": "moderate", "p": 5.72, "rc": 82}, {"d": "2025-10-14", "n": "Lunch Swim", "s": "Swim", "dk": 0.525, "mm": 12.5, "hr": 123, "ef": "easy", "sp": 2.384, "pl": 25}, {"d": "2025-10-14", "n": "Afternoon Run", "s": "Run", "dk": 0.536, "mm": 3.1, "hr": 133, "ef": "easy", "p": 5.84, "rc": 81, "wu": true}, {"d": "2025-10-14", "n": "Mt Cootha 3x Laps", "s": "Run", "dk": 9.518, "mm": 72.3, "hr": 171, "ef": "moderate", "p": 7.596, "rc": 81}, {"d": "2025-10-16", "n": "Afternoon Run", "s": "Run", "dk": 15.004, "mm": 76.6, "hr": 176, "ef": "hard", "p": 5.103, "rc": 84}, {"d": "2025-10-17", "n": "Afternoon Run", "s": "Run", "dk": 12.007, "mm": 118.6, "hr": 153, "ef": "easy", "p": 9.874, "rc": 79}, {"d": "2025-10-19", "n": "Afternoon Run", "s": "Run", "dk": 30.01, "mm": 179.0, "hr": 163, "ef": "moderate", "p": 5.963, "rc": 81}, {"d": "2025-10-21", "n": "Afternoon Ride", "s": "Bike", "dk": 60.421, "mm": 150.4, "hr": 126, "ef": "easy"}, {"d": "2025-10-21", "n": "Evening Run", "s": "Run", "dk": 10.01, "mm": 70.9, "hr": 145, "ef": "easy", "p": 7.08, "rc": 81}, {"d": "2025-10-22", "n": "Afternoon Run", "s": "Run", "dk": 15.002, "mm": 93.5, "hr": 156, "ef": "moderate", "p": 6.235, "rc": 82}, {"d": "2025-10-24", "n": "Afternoon Ride", "s": "Bike", "dk": 20.527, "mm": 53.6, "hr": 120, "ef": "easy"}, {"d": "2025-10-29", "n": "Afternoon Run", "s": "Run", "dk": 5.002, "mm": 29.7, "hr": 166, "ef": "moderate", "p": 5.938, "rc": 81}, {"d": "2025-11-04", "n": "Afternoon Run", "s": "Run", "dk": 5.013, "mm": 27.1, "hr": 171, "ef": "moderate", "p": 5.409, "rc": 82}, {"d": "2025-11-05", "n": "Afternoon Ride", "s": "Bike", "dk": 50.577, "mm": 121.8, "hr": 149, "ef": "moderate"}, {"d": "2025-11-05", "n": "Evening Run", "s": "Run", "dk": 5.026, "mm": 33.0, "hr": 136, "ef": "easy", "tl": 161, "p": 6.557, "rc": 80}, {"d": "2025-11-07", "n": "Morning Ride", "s": "Bike", "dk": 50.877, "mm": 141.4, "hr": 138, "ef": "easy", "w": 102}, {"d": "2025-11-07", "n": "Morning Run", "s": "Run", "dk": 10.003, "mm": 52.9, "hr": 180, "ef": "hard", "tl": 385, "p": 5.284, "rc": 82}, {"d": "2025-11-09", "n": "Morning Run", "s": "Run", "dk": 5.004, "mm": 33.1, "hr": 149, "ef": "easy", "tl": 100, "p": 6.622, "rc": 81}, {"d": "2025-11-11", "n": "Zwift - Volcano Circuit in Watopia", "s": "Bike", "dk": 5.805, "mm": 11.9, "hr": 140, "ef": "easy", "tl": 16, "vr": true, "w": 142, "nw": 156, "cad": 71, "mcad": 84}, {"d": "2025-11-11", "n": "Zwift - Mountain Route in Watopia", "s": "Bike", "dk": 30.376, "mm": 80.5, "hr": 160, "ef": "moderate", "tl": 158, "vr": true, "w": 177, "nw": 188, "cad": 71, "mcad": 127}, {"d": "2025-11-11", "n": "Lunch Ride", "s": "Bike", "dk": 10.033, "mm": 30.5, "hr": 121, "ef": "easy", "w": 81}, {"d": "2025-11-12", "n": "Afternoon Run", "s": "Run", "dk": 10.088, "mm": 55.8, "hr": 171, "ef": "moderate", "tl": 265, "p": 5.528, "rc": 82}, {"d": "2025-11-12", "n": "Zwift - Flat Out Fast in Watopia", "s": "Bike", "dk": 22.019, "mm": 48.8, "hr": 136, "ef": "easy", "tl": 25, "vr": true, "w": 115, "nw": 119, "cad": 70, "mcad": 86}, {"d": "2025-11-13", "n": "Afternoon Ride", "s": "Bike", "dk": 50.075, "mm": 135.8, "hr": 134, "ef": "easy", "w": 105}, {"d": "2025-11-13", "n": "Afternoon Run", "s": "Run", "dk": 10.503, "mm": 55.3, "hr": 174, "ef": "hard", "tl": 389, "p": 5.263, "rc": 82}, {"d": "2025-11-15", "n": "Zwift - Triple Flat Loops in Watopia", "s": "Bike", "dk": 34.131, "mm": 75.5, "hr": 128, "ef": "easy", "tl": 45, "vr": true, "w": 123, "nw": 126, "cad": 65, "mcad": 83}, {"d": "2025-11-15", "n": "Zwift - Road to Sky in Watopia", "s": "Bike", "dk": 18.632, "mm": 115.9, "hr": 143, "ef": "easy", "tl": 99, "vr": true, "w": 144, "nw": 151, "cad": 68, "mcad": 98}, {"d": "2025-11-15", "n": "Afternoon Run", "s": "Run", "dk": 7.387, "mm": 42.6, "hr": 167, "ef": "moderate", "tl": 241, "p": 5.765, "rc": 80}, {"d": "2025-11-17", "n": "ROUVY - IRONMAN 70.3 Nice", "s": "Bike", "dk": 67.139, "mm": 160.5, "hr": 158, "ef": "moderate", "tl": 206, "vr": true, "w": 170, "nw": 184, "cad": 70, "mcad": 128}, {"d": "2025-11-18", "n": "Afternoon Run", "s": "Run", "dk": 21.243, "mm": 113.7, "hr": 174, "ef": "hard", "tl": 699, "p": 5.35, "rc": 83}, {"d": "2025-11-19", "n": "ROUVY - IRONMAN 70.3 Arizona 90km 2020", "s": "Bike", "dk": 45.03, "mm": 89.1, "hr": 152, "ef": "moderate", "tl": 92, "vr": true, "w": 156, "nw": 164, "cad": 65, "mcad": 134}, {"d": "2025-11-19", "n": "Afternoon Run", "s": "Run", "dk": 10.011, "mm": 64.7, "hr": 154, "ef": "easy", "tl": 270, "p": 6.46, "rc": 81}, {"d": "2025-11-21", "n": "ROUVY - Ramp Test", "s": "Bike", "dk": 4.433, "mm": 11.8, "hr": 146, "ef": "moderate", "tl": 13, "vr": true, "w": 157, "nw": 176, "cad": 83, "mcad": 97}, {"d": "2025-11-24", "n": "Afternoon Swim", "s": "Swim", "dk": 1.025, "mm": 25.3, "hr": 136, "ef": "easy", "sp": 2.47, "pl": 25}, {"d": "2025-11-24", "n": "Afternoon Run", "s": "Run", "dk": 20.207, "mm": 131.2, "hr": 166, "ef": "moderate", "tl": 554, "p": 6.49, "rc": 81}, {"d": "2025-11-26", "n": "ROUVY - IRONMAN 70.3 Port Macquarie 2019", "s": "Bike", "dk": 89.999, "mm": 183.1, "hr": 148, "ef": "moderate", "tl": 189, "vr": true, "w": 151, "nw": 166, "cad": 70, "mcad": 129}, {"d": "2025-11-26", "n": "Afternoon Run", "s": "Run", "dk": 10.062, "mm": 59.2, "hr": 175, "ef": "hard", "tl": 290, "p": 5.883, "rc": 81}, {"d": "2025-11-28", "n": "Lunch Swim", "s": "Swim", "dk": 1.0, "mm": 26.7, "hr": 141, "ef": "moderate", "sp": 2.67, "pl": 25}, {"d": "2025-11-28", "n": "ROUVY - Group Ride: ROUVY - Group RIde: WST END - 008", "s": "Bike", "dk": 32.024, "mm": 64.2, "hr": 169, "ef": "hard", "tl": 115, "vr": true, "w": 210, "nw": 219, "cad": 67, "mcad": 125}, {"d": "2025-11-29", "n": "Afternoon Ride", "s": "Bike", "dk": 37.231, "mm": 115.3, "hr": 122, "ef": "easy", "w": 77}, {"d": "2025-11-30", "n": "Afternoon Run", "s": "Run", "dk": 21.801, "mm": 143.6, "hr": 160, "ef": "moderate", "tl": 620, "p": 6.585, "rc": 80}, {"d": "2025-11-30", "n": "Afternoon Swim", "s": "Swim", "dk": 1.15, "mm": 27.0, "hr": 138, "ef": "easy", "sp": 2.345, "pl": 50}, {"d": "2025-12-01", "n": "ROUVY - IRONMAN 70.3 Valencia", "s": "Bike", "dk": 89.571, "mm": 189.9, "hr": 133, "ef": "easy", "tl": 159, "vr": true, "w": 138, "nw": 147, "cad": 68, "mcad": 126}, {"d": "2025-12-01", "n": "Afternoon Run", "s": "Run", "dk": 5.037, "mm": 32.8, "hr": 152, "ef": "easy", "tl": 247, "p": 6.503, "rc": 81}, {"d": "2025-12-02", "n": "Lunch Swim", "s": "Swim", "dk": 1.65, "mm": 41.7, "hr": 135, "ef": "easy", "sp": 2.529, "pl": 50}, {"d": "2025-12-02", "n": "Afternoon Run", "s": "Run", "dk": 10.988, "mm": 71.6, "hr": 146, "ef": "easy", "tl": 324, "p": 6.518, "rc": 80}, {"d": "2025-12-03", "n": "ROUVY - Compiegne to Roupy | France", "s": "Bike", "dk": 33.596, "mm": 69.7, "hr": 131, "ef": "easy", "tl": 70, "vr": true, "w": 142, "nw": 161, "cad": 64, "mcad": 123}, {"d": "2025-12-04", "n": "Afternoon Run", "s": "Run", "dk": 10.357, "mm": 58.2, "hr": 161, "ef": "moderate", "tl": 348, "p": 5.615, "rc": 83}, {"d": "2025-12-05", "n": "Lunch Swim", "s": "Swim", "dk": 1.5, "mm": 38.2, "hr": 135, "ef": "easy", "sp": 2.55, "pl": 50}, {"d": "2025-12-05", "n": "Afternoon Run", "s": "Run", "dk": 10.037, "mm": 63.2, "hr": 159, "ef": "moderate", "tl": 291, "p": 6.301, "rc": 80}, {"d": "2025-12-07", "n": "ROUVY - Crusher in the Tushar | Circleville | Utah", "s": "Bike", "dk": 28.499, "mm": 67.8, "hr": 143, "ef": "easy", "tl": 70, "vr": true, "w": 144, "nw": 164, "cad": 68, "mcad": 125}, {"d": "2025-12-07", "n": "ROUVY - Sossusvlei desert | Namibia", "s": "Bike", "dk": 34.412, "mm": 63.3, "hr": 150, "ef": "moderate", "tl": 59, "vr": true, "w": 147, "nw": 156, "cad": 74, "mcad": 120}, {"d": "2025-12-07", "n": "Afternoon Swim", "s": "Swim", "dk": 1.5, "mm": 40.7, "hr": 133, "ef": "easy", "sp": 2.716, "pl": 50}, {"d": "2025-12-08", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 53.778, "mm": 120.6, "hr": 118, "ef": "easy", "tl": 54, "vr": true, "w": 105, "nw": 105, "cad": 66, "mcad": 85}, {"d": "2025-12-08", "n": "Afternoon Run", "s": "Run", "dk": 8.188, "mm": 52.5, "hr": 152, "ef": "easy", "tl": 232, "p": 6.418, "rc": 79}, {"d": "2025-12-09", "n": "Lunch Swim", "s": "Swim", "dk": 1.55, "mm": 40.0, "hr": 143, "ef": "moderate", "sp": 2.581, "pl": 50}, {"d": "2025-12-09", "n": "Afternoon Run", "s": "Run", "dk": 10.008, "mm": 52.3, "hr": 174, "ef": "hard", "tl": 289, "p": 5.23, "rc": 81}, {"d": "2025-12-10", "n": "ROUVY - GF Florida | USA", "s": "Bike", "dk": 62.499, "mm": 113.5, "hr": 163, "ef": "hard", "tl": 181, "vr": true, "w": 197, "nw": 202, "cad": 75, "mcad": 124}, {"d": "2025-12-10", "n": "Morning Ride", "s": "Bike", "dk": 34.508, "mm": 95.5, "hr": 140, "ef": "easy", "w": 114}, {"d": "2025-12-11", "n": "Afternoon Run", "s": "Run", "dk": 10.022, "mm": 51.8, "hr": 171, "ef": "moderate", "tl": 350, "p": 5.171, "rc": 82}, {"d": "2025-12-12", "n": "Lunch Swim", "s": "Swim", "dk": 1.5, "mm": 37.7, "hr": 142, "ef": "moderate", "sp": 2.512, "pl": 50}, {"d": "2025-12-12", "n": "Afternoon Run", "s": "Run", "dk": 15.002, "mm": 82.2, "hr": 166, "ef": "moderate", "tl": 455, "p": 5.482, "rc": 82}, {"d": "2025-12-13", "n": "ROUVY - Rund um Köln 60 km | Germany", "s": "Bike", "dk": 57.484, "mm": 115.2, "hr": 165, "ef": "hard", "tl": 211, "vr": true, "w": 207, "nw": 217, "cad": 76, "mcad": 124}, {"d": "2025-12-15", "n": "Afternoon Run", "s": "Run", "dk": 10.068, "mm": 56.2, "hr": 163, "ef": "moderate", "tl": 295, "p": 5.58, "rc": 82}, {"d": "2025-12-16", "n": "Lunch Swim", "s": "Swim", "dk": 2.05, "mm": 55.0, "hr": 135, "ef": "easy", "sp": 2.681, "pl": 50}, {"d": "2025-12-16", "n": "Afternoon Run", "s": "Run", "dk": 11.039, "mm": 54.7, "hr": 172, "ef": "hard", "tl": 347, "p": 4.959, "rc": 84}, {"d": "2025-12-17", "n": "Morning Ride", "s": "Bike", "dk": 11.562, "mm": 35.3, "hr": 118, "ef": "easy", "w": 87}, {"d": "2025-12-17", "n": "Lunch Ride", "s": "Bike", "dk": 27.417, "mm": 50.2, "hr": 168, "ef": "hard", "w": 214}, {"d": "2025-12-17", "n": "Lunch Ride", "s": "Bike", "dk": 14.631, "mm": 46.7, "hr": 130, "ef": "easy", "w": 96}, {"d": "2025-12-17", "n": "Afternoon Run", "s": "Run", "dk": 10.068, "mm": 68.8, "hr": 140, "ef": "easy", "tl": 228, "p": 6.828, "rc": 82}, {"d": "2025-12-18", "n": "ROUVY - PASSO FEDAIA from CANAZEI | ITALY", "s": "Bike", "dk": 13.203, "mm": 51.9, "hr": 159, "ef": "moderate", "tl": 76, "vr": true, "w": 199, "nw": 204, "cad": 68, "mcad": 97}, {"d": "2025-12-18", "n": "ROUVY - Passo Pordoi from Canazei | Italy", "s": "Bike", "dk": 15.215, "mm": 66.0, "hr": 155, "ef": "moderate", "tl": 87, "vr": true, "w": 190, "nw": 194, "cad": 70, "mcad": 125}, {"d": "2025-12-18", "n": "ROUVY - Passo Gardena from Corvara | Italy", "s": "Bike", "dk": 12.161, "mm": 56.0, "hr": 149, "ef": "moderate", "tl": 58, "vr": true, "w": 162, "nw": 172, "cad": 60, "mcad": 109}, {"d": "2025-12-18", "n": "Morning Swim", "s": "Swim", "dk": 2.15, "mm": 55.8, "hr": 143, "ef": "moderate", "sp": 2.595, "pl": 50}, {"d": "2025-12-19", "n": "Afternoon Run", "s": "Run", "dk": 6.011, "mm": 30.9, "hr": 166, "ef": "moderate", "tl": 175, "p": 5.149, "rc": 83}, {"d": "2025-12-19", "n": "Treadmill run", "s": "Run", "dk": 9.2, "mm": 52.0, "ef": "moderate", "p": 5.652}, {"d": "2025-12-20", "n": "ROUVY - Passo Giau | Italy", "s": "Bike", "dk": 12.703, "mm": 72.2, "hr": 167, "ef": "hard", "tl": 132, "vr": true, "w": 225, "nw": 227, "cad": 66, "mcad": 108}, {"d": "2025-12-20", "n": "ROUVY - Passo Sella from Canazei | Italy", "s": "Bike", "dk": 13.261, "mm": 63.4, "hr": 158, "ef": "moderate", "tl": 77, "vr": true, "w": 194, "nw": 198, "cad": 67, "mcad": 122}, {"d": "2025-12-20", "n": "ROUVY - Winter Alt St. Johan | Switzerland", "s": "Bike", "dk": 21.699, "mm": 44.3, "hr": 137, "ef": "easy", "tl": 29, "vr": true, "w": 121, "nw": 146, "cad": 72, "mcad": 144}, {"d": "2025-12-21", "n": "Lunch Run", "s": "Run", "dk": 24.078, "mm": 141.1, "hr": 163, "ef": "moderate", "tl": 535, "p": 5.86, "rc": 82}, {"d": "2025-12-21", "n": "Afternoon Swim", "s": "Swim", "dk": 2.15, "mm": 53.4, "hr": 126, "ef": "easy", "sp": 2.484, "pl": 50}, {"d": "2025-12-23", "n": "Morning Swim", "s": "Swim", "dk": 1.9, "mm": 49.7, "hr": 137, "ef": "easy", "sp": 2.616, "pl": 50}, {"d": "2025-12-23", "n": "Afternoon Run", "s": "Run", "dk": 0.988, "mm": 4.8, "hr": 165, "ef": "easy", "tl": 25, "p": 4.842, "rc": 84, "wu": true}, {"d": "2025-12-23", "n": "10x1km interval w/ 3min rest in between", "s": "Run", "dk": 10.041, "mm": 43.1, "hr": 176, "ef": "hard", "tl": 365, "p": 4.294, "iv": true, "rc": 88}, {"d": "2025-12-23", "n": "Afternoon Run", "s": "Run", "dk": 0.748, "mm": 4.4, "hr": 150, "ef": "easy", "tl": 15, "p": 5.881, "rc": 83, "wu": true}, {"d": "2025-12-26", "n": "Morning Swim", "s": "Swim", "dk": 2.25, "mm": 47.6, "hr": 137, "ef": "easy", "sp": 2.115, "pl": 50}, {"d": "2025-12-26", "n": "Afternoon Run", "s": "Run", "dk": 15.009, "mm": 78.9, "hr": 173, "ef": "hard", "tl": 379, "p": 5.254, "rc": 84}, {"d": "2025-12-27", "n": "ROUVY - IRONMAN 70.3 Port Macquarie 2019", "s": "Bike", "dk": 52.171, "mm": 93.0, "hr": 151, "ef": "moderate", "tl": 106, "vr": true, "w": 187, "nw": 190, "cad": 76, "mcad": 120}, {"d": "2025-12-27", "n": "Morning Swim", "s": "Swim", "dk": 1.95, "mm": 40.9, "hr": 143, "ef": "moderate", "sp": 2.099, "pl": 25}, {"d": "2025-12-28", "n": "ROUVY - To Adams Peak / Srí Pada | Sri Lanka", "s": "Bike", "dk": 16.249, "mm": 48.3, "hr": 121, "ef": "easy", "tl": 25, "vr": true, "w": 117, "nw": 127, "cad": 62, "mcad": 126}, {"d": "2025-12-28", "n": "ROUVY - Kinsale | Courtmacsherry | Ireland", "s": "Bike", "dk": 29.718, "mm": 73.6, "hr": 118, "ef": "easy", "tl": 35, "vr": true, "w": 102, "nw": 123, "cad": 63, "mcad": 128}, {"d": "2025-12-29", "n": "ROUVY - IRONMAN 70.3 Sunshine Coast (1st loop)", "s": "Bike", "dk": 48.797, "mm": 80.8, "hr": 170, "ef": "hard", "tl": 124, "vr": true, "w": 220, "nw": 222, "cad": 76, "mcad": 117}, {"d": "2025-12-29", "n": "ROUVY - 15 Minute Cool-down", "s": "Bike", "dk": 4.64, "mm": 15.0, "hr": 133, "ef": "easy", "tl": 5, "vr": true, "w": 108, "nw": 108, "cad": 69, "mcad": 80}, {"d": "2025-12-29", "n": "Evening Run", "s": "Run", "dk": 9.444, "mm": 60.8, "hr": 154, "ef": "easy", "tl": 213, "p": 6.435, "rc": 82}, {"d": "2025-12-30", "n": "Lunch Swim", "s": "Swim", "dk": 2.45, "mm": 52.2, "hr": 128, "ef": "easy", "sp": 2.131, "pl": 50}, {"d": "2025-12-30", "n": "Afternoon Run", "s": "Run", "dk": 1.025, "mm": 6.0, "hr": 153, "ef": "easy", "tl": 24, "p": 5.871, "rc": 82, "wu": true}, {"d": "2025-12-30", "n": "10x1km w/ 3min rest", "s": "Run", "dk": 10.011, "mm": 39.5, "hr": 176, "ef": "hard", "tl": 371, "p": 3.948, "iv": true, "rc": 88}, {"d": "2025-12-30", "n": "Afternoon Run", "s": "Run", "dk": 0.814, "mm": 4.5, "hr": 157, "ef": "easy", "tl": 17, "p": 5.572, "rc": 82, "wu": true}, {"d": "2025-12-30", "n": "ROUVY - Aragapathana to Nuwara Eliya | Sri Lanka", "s": "Bike", "dk": 13.049, "mm": 32.8, "hr": 155, "ef": "hard", "tl": 50, "vr": true, "w": 199, "nw": 222, "cad": 73, "mcad": 128}, {"d": "2026-01-02", "n": "Lunch Swim", "s": "Swim", "dk": 3.0, "mm": 67.5, "hr": 141, "ef": "moderate", "sp": 2.252, "pl": 25}, {"d": "2026-01-02", "n": "Afternoon Run", "s": "Run", "dk": 2.793, "mm": 15.7, "hr": 163, "ef": "moderate", "tl": 64, "p": 5.621, "rc": 83}, {"d": "2026-01-02", "n": "Afternoon Run", "s": "Run", "dk": 6.789, "mm": 34.6, "hr": 172, "ef": "moderate", "tl": 196, "p": 5.094, "rc": 84}, {"d": "2026-01-03", "n": "ROUVY - IRONMAN 70.3 Port Macquarie 2019", "s": "Bike", "dk": 89.998, "mm": 148.3, "hr": 163, "ef": "hard", "tl": 232, "vr": true, "w": 220, "nw": 222, "cad": 76, "mcad": 122}, {"d": "2026-01-04", "n": "Afternoon Run", "s": "Run", "dk": 41.141, "mm": 311.5, "hr": 151, "ef": "easy", "tl": 920, "p": 7.572, "rc": 71}, {"d": "2026-01-06", "n": "Lunch Swim", "s": "Swim", "dk": 1.5, "mm": 31.9, "hr": 136, "ef": "easy", "sp": 2.128, "pl": 25}, {"d": "2026-01-07", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 17.154, "mm": 30.4, "hr": 130, "ef": "easy", "tl": 25, "vr": true, "w": 158, "nw": 162, "cad": 73, "mcad": 84}, {"d": "2026-01-08", "n": "ROUVY - Power Building (HARD)", "s": "Bike", "dk": 40.593, "mm": 73.4, "hr": 156, "ef": "hard", "tl": 112, "vr": true, "w": 196, "nw": 211, "cad": 72, "mcad": 88}, {"d": "2026-01-09", "n": "Morning Swim", "s": "Swim", "dk": 3.075, "mm": 75.0, "hr": 138, "ef": "easy", "sp": 2.441, "pl": 25}, {"d": "2026-01-09", "n": "Afternoon Run", "s": "Run", "dk": 1.003, "mm": 5.5, "hr": 153, "ef": "easy", "tl": 23, "p": 5.466, "rc": 81, "wu": true}, {"d": "2026-01-09", "n": "2km Intervals @ 4.20 w/ 3min rest", "s": "Run", "dk": 10.005, "mm": 43.4, "hr": 178, "ef": "hard", "tl": 345, "p": 4.339, "iv": true, "rc": 87}, {"d": "2026-01-09", "n": "Afternoon Run", "s": "Run", "dk": 0.974, "mm": 5.3, "hr": 141, "ef": "easy", "tl": 22, "p": 5.493, "rc": 82, "wu": true}, {"d": "2026-01-10", "n": "ROUVY - Group Ride: Frenchy French Fridays", "s": "Bike", "dk": 19.083, "mm": 44.8, "hr": 130, "ef": "easy", "tl": 36, "vr": true, "w": 140, "nw": 156, "cad": 65, "mcad": 129}, {"d": "2026-01-10", "n": "ROUVY - Puerto de Bèrnia | Spain", "s": "Bike", "dk": 13.199, "mm": 53.4, "hr": 135, "ef": "easy", "tl": 45, "vr": true, "w": 156, "nw": 162, "cad": 62, "mcad": 87}, {"d": "2026-01-10", "n": "ROUVY - Castell de Castells | Spain", "s": "Bike", "dk": 6.024, "mm": 15.6, "hr": 129, "ef": "easy", "tl": 11, "vr": true, "w": 147, "nw": 151, "cad": 65, "mcad": 83}, {"d": "2026-01-11", "n": "Morning Run", "s": "Run", "dk": 22.437, "mm": 148.3, "hr": 159, "ef": "moderate", "tl": 521, "p": 6.609, "rc": 79}, {"d": "2026-01-12", "n": "ROUVY - Puerto de Bèrnia | Spain", "s": "Bike", "dk": 10.209, "mm": 16.5, "hr": 118, "ef": "easy", "tl": 8, "vr": true, "w": 104, "nw": 122, "cad": 71, "mcad": 131}, {"d": "2026-01-12", "n": "ROUVY - Rund um Köln 70 km | Germany", "s": "Bike", "dk": 42.888, "mm": 92.8, "hr": 129, "ef": "easy", "tl": 73, "vr": true, "w": 148, "nw": 156, "cad": 66, "mcad": 129}, {"d": "2026-01-12", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 6.603, "mm": 12.9, "hr": 124, "ef": "easy", "tl": 7, "vr": true, "w": 125, "nw": 130, "cad": 69, "mcad": 79}, {"d": "2026-01-12", "n": "Evening Run", "s": "Run", "dk": 9.321, "mm": 69.4, "hr": 140, "ef": "easy", "tl": 169, "p": 7.447, "rc": 80}, {"d": "2026-01-13", "n": "Morning Swim", "s": "Swim", "dk": 2.175, "mm": 46.7, "hr": 134, "ef": "easy", "sp": 2.147, "pl": 25}, {"d": "2026-01-13", "n": "Afternoon Run", "s": "Run", "dk": 0.995, "mm": 5.1, "hr": 154, "ef": "easy", "tl": 23, "p": 5.142, "rc": 82, "wu": true}, {"d": "2026-01-13", "n": "Afternoon Run", "s": "Run", "dk": 0.986, "mm": 5.5, "hr": 155, "ef": "easy", "tl": 22, "p": 5.614, "rc": 81, "wu": true}, {"d": "2026-01-13", "n": "8x1km w/ 3min rest", "s": "Run", "dk": 8.46, "mm": 33.4, "hr": 178, "ef": "hard", "tl": 336, "p": 3.942, "iv": true, "rc": 88}, {"d": "2026-01-14", "n": "Lunch Run", "s": "Run", "dk": 10.435, "mm": 64.5, "hr": 154, "ef": "easy", "tl": 263, "p": 6.184, "rc": 81}, {"d": "2026-01-14", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 32.898, "mm": 61.1, "hr": 126, "ef": "easy", "tl": 40, "vr": true, "w": 138, "nw": 142, "cad": 73, "mcad": 88}, {"d": "2026-01-15", "n": "ROUVY - Power Building (HARD)", "s": "Bike", "dk": 62.933, "mm": 120.6, "hr": 151, "ef": "hard", "tl": 176, "vr": true, "w": 179, "nw": 212, "cad": 70, "mcad": 119}, {"d": "2026-01-16", "n": "Afternoon Swim", "s": "Swim", "dk": 2.15, "mm": 49.4, "hr": 124, "ef": "easy", "sp": 2.297, "pl": 25}, {"d": "2026-01-16", "n": "Afternoon Run", "s": "Run", "dk": 0.95, "mm": 5.2, "hr": 162, "ef": "easy", "tl": 19, "p": 5.422, "rc": 81, "wu": true}, {"d": "2026-01-16", "n": "4x4km @ 4.44 w/ 90sec rest", "s": "Run", "dk": 16.003, "mm": 75.6, "hr": 178, "ef": "hard", "tl": 373, "p": 4.725, "iv": true, "rc": 85}, {"d": "2026-01-19", "n": "ROUVY - IRONMAN 70.3 Aracaju-Sergipe", "s": "Bike", "dk": 88.243, "mm": 142.3, "hr": 166, "ef": "hard", "tl": 158, "vr": true, "w": 207, "nw": 208, "cad": 72, "mcad": 126}, {"d": "2026-01-19", "n": "Afternoon Run", "s": "Run", "dk": 8.029, "mm": 59.5, "hr": 140, "ef": "easy", "tl": 123, "p": 7.407, "rc": 80}, {"d": "2026-01-20", "n": "Lunch Swim", "s": "Swim", "dk": 2.35, "mm": 51.2, "hr": 130, "ef": "easy", "sp": 2.181, "pl": 25}, {"d": "2026-01-20", "n": "Afternoon Run", "s": "Run", "dk": 1.034, "mm": 5.5, "hr": 159, "ef": "easy", "tl": 21, "p": 5.288, "rc": 82, "wu": true}, {"d": "2026-01-20", "n": "5x4km @ 4.39 w/ 90sec rest", "s": "Run", "dk": 20.009, "mm": 93.1, "hr": 175, "ef": "hard", "tl": 488, "p": 4.653, "iv": true, "rc": 86}, {"d": "2026-01-21", "n": "Afternoon Run", "s": "Run", "dk": 8.007, "mm": 51.2, "hr": 144, "ef": "easy", "tl": 145, "p": 6.391, "rc": 81}, {"d": "2026-01-21", "n": "ROUVY - Tour de TOHOKU 2021 Ishinomaki to Minamisanriku", "s": "Bike", "dk": 39.847, "mm": 95.3, "hr": 130, "ef": "easy", "tl": 47, "vr": true, "w": 125, "nw": 140, "cad": 66, "mcad": 128}, {"d": "2026-01-22", "n": "ROUVY - Power Building (HARD)", "s": "Bike", "dk": 62.702, "mm": 122.0, "hr": 154, "ef": "hard", "tl": 151, "vr": true, "w": 179, "nw": 219, "cad": 71, "mcad": 122}, {"d": "2026-01-23", "n": "Lunch Swim", "s": "Swim", "dk": 2.275, "mm": 49.4, "hr": 135, "ef": "easy", "sp": 2.171, "pl": 25}, {"d": "2026-01-23", "n": "Afternoon Run", "s": "Run", "dk": 0.584, "mm": 3.5, "hr": 156, "ef": "easy", "tl": 9, "p": 5.961, "rc": 80, "wu": true}, {"d": "2026-01-23", "n": "Afternoon Run", "s": "Run", "dk": 1.991, "mm": 11.0, "hr": 157, "ef": "easy", "tl": 36, "p": 5.508, "rc": 82, "wu": true}, {"d": "2026-01-23", "n": "5x2km @ 4.08 w/ 2min rest", "s": "Run", "dk": 10.007, "mm": 41.4, "hr": 177, "ef": "hard", "tl": 241, "p": 4.141, "iv": true, "rc": 87}, {"d": "2026-01-24", "n": "Morning Swim", "s": "Swim", "dk": 2.4, "mm": 46.6, "hr": 135, "ef": "moderate", "sp": 1.942, "pl": 25}, {"d": "2026-01-25", "n": "Afternoon Run", "s": "Run", "dk": 1.376, "mm": 9.0, "hr": 140, "ef": "easy", "tl": 24, "p": 6.554, "rc": 81, "wu": true}, {"d": "2026-01-25", "n": "Afternoon Run", "s": "Run", "dk": 4.283, "mm": 22.6, "hr": 167, "ef": "moderate", "tl": 80, "p": 5.273, "rc": 83}, {"d": "2026-01-26", "n": "ROUVY - IRONMAN Copenhagen (1st loop)", "s": "Bike", "dk": 51.866, "mm": 86.5, "hr": 158, "ef": "hard", "tl": 88, "vr": true, "w": 204, "nw": 209, "cad": 72, "mcad": 121}, {"d": "2026-01-26", "n": "Evening Run", "s": "Run", "dk": 12.049, "mm": 89.3, "hr": 139, "ef": "easy", "tl": 157, "p": 7.411, "rc": 81}, {"d": "2026-01-27", "n": "Morning Swim", "s": "Swim", "dk": 2.275, "mm": 47.9, "hr": 133, "ef": "easy", "sp": 2.107, "pl": 25}, {"d": "2026-01-27", "n": "Afternoon Run", "s": "Run", "dk": 1.116, "mm": 6.0, "hr": 156, "ef": "easy", "tl": 19, "p": 5.361, "rc": 84, "wu": true}, {"d": "2026-01-27", "n": "What the … 3x6km @ 4.34 w/ 90sec rest", "s": "Run", "dk": 18.004, "mm": 82.2, "hr": 177, "ef": "hard", "tl": 400, "p": 4.566, "iv": true, "rc": 87}, {"d": "2026-01-28", "n": "Lunch Run", "s": "Run", "dk": 10.039, "mm": 71.8, "hr": 140, "ef": "easy", "tl": 137, "p": 7.156, "rc": 81}, {"d": "2026-01-28", "n": "ROUVY - IRONMAN Maryland (1st loop)", "s": "Bike", "dk": 59.145, "mm": 120.1, "hr": 122, "ef": "easy", "tl": 35, "vr": true, "w": 111, "nw": 112, "cad": 73, "mcad": 120}, {"d": "2026-01-29", "n": "ROUVY - Building Strength & Endurance", "s": "Bike", "dk": 59.91, "mm": 98.3, "hr": 156, "ef": "hard", "tl": 115, "vr": true, "w": 207, "nw": 221, "cad": 75, "mcad": 89}, {"d": "2026-01-30", "n": "Morning Swim", "s": "Swim", "dk": 2.75, "mm": 55.2, "hr": 141, "ef": "moderate", "sp": 2.008, "pl": 25}, {"d": "2026-01-30", "n": "Afternoon Run", "s": "Run", "dk": 1.006, "mm": 5.9, "hr": 153, "ef": "easy", "tl": 19, "p": 5.898, "rc": 84, "wu": true}, {"d": "2026-01-30", "n": "Afternoon Run", "s": "Run", "dk": 1.509, "mm": 8.6, "hr": 152, "ef": "easy", "tl": 33, "p": 5.677, "rc": 80, "wu": true}, {"d": "2026-01-30", "n": "6x2km @4.02 w/ 2min rest", "s": "Run", "dk": 12.0, "mm": 48.3, "hr": 178, "ef": "hard", "tl": 405, "p": 4.027, "iv": true, "rc": 87}, {"d": "2026-01-31", "n": "Lunch Swim", "s": "Swim", "dk": 3.125, "mm": 59.1, "hr": 135, "ef": "moderate", "sp": 1.89, "pl": 25}, {"d": "2026-01-31", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 34.391, "mm": 72.1, "hr": 118, "ef": "easy", "tl": 23, "vr": true, "w": 101, "nw": 102, "cad": 73, "mcad": 80}, {"d": "2026-02-01", "n": "Afternoon Run", "s": "Run", "dk": 0.928, "mm": 5.8, "hr": 134, "ef": "easy", "tl": 17, "p": 6.249, "rc": 80, "wu": true}, {"d": "2026-02-01", "n": "Afternoon Run", "s": "Run", "dk": 10.171, "mm": 52.7, "hr": 168, "ef": "moderate", "tl": 255, "p": 5.178, "rc": 83}, {"d": "2026-02-01", "n": "Afternoon Run", "s": "Run", "dk": 4.466, "mm": 29.1, "hr": 152, "ef": "easy", "tl": 81, "p": 6.528, "rc": 82}, {"d": "2026-02-03", "n": "Morning Swim", "s": "Swim", "dk": 1.625, "mm": 35.8, "hr": 107, "ef": "easy", "sp": 2.2, "pl": 25}, {"d": "2026-02-03", "n": "Afternoon Run", "s": "Run", "dk": 1.673, "mm": 9.2, "hr": 150, "ef": "easy", "tl": 39, "p": 5.517, "rc": 82, "wu": true}, {"d": "2026-02-03", "n": "3x8km w/ 90s rest @ 4.35", "s": "Run", "dk": 24.004, "mm": 110.0, "hr": 173, "ef": "hard", "tl": 687, "p": 4.585, "iv": true, "rc": 86}, {"d": "2026-02-04", "n": "Lunch Run", "s": "Run", "dk": 10.001, "mm": 62.3, "hr": 148, "ef": "easy", "tl": 209, "p": 6.226, "rc": 82}, {"d": "2026-02-04", "n": "ROUVY - IRONMAN 70.3 Texas", "s": "Bike", "dk": 34.093, "mm": 76.9, "hr": 106, "ef": "easy", "tl": 18, "vr": true, "w": 85, "nw": 86, "cad": 70, "mcad": 123}, {"d": "2026-02-05", "n": "ROUVY - Building Strength & Endurance", "s": "Bike", "dk": 72.426, "mm": 124.9, "hr": 157, "ef": "hard", "tl": 193, "vr": true, "w": 205, "nw": 224, "cad": 74, "mcad": 118}, {"d": "2026-02-06", "n": "Lunch Swim", "s": "Swim", "dk": 2.6, "mm": 52.4, "hr": 134, "ef": "easy", "sp": 2.014, "pl": 25}, {"d": "2026-02-06", "n": "WU", "s": "Run", "dk": 1.522, "mm": 8.4, "hr": 155, "ef": "easy", "tl": 34, "p": 5.53, "rc": 81, "wu": true}, {"d": "2026-02-06", "n": "WD", "s": "Run", "dk": 0.923, "mm": 5.2, "hr": 153, "ef": "easy", "tl": 18, "p": 5.595, "rc": 81, "cd": true}, {"d": "2026-02-06", "n": "3x2km w/ 2min rest", "s": "Run", "dk": 6.544, "mm": 26.9, "hr": 178, "ef": "hard", "tl": 203, "p": 4.113, "iv": true, "rc": 87}, {"d": "2026-02-06", "n": "Evening Run", "s": "Run", "dk": 12.084, "mm": 85.5, "hr": 137, "ef": "easy", "tl": 215, "p": 7.077, "rc": 80}, {"d": "2026-02-07", "n": "Lunch Ride", "s": "Bike", "dk": 72.824, "mm": 231.6, "hr": 110, "ef": "easy", "w": 81}, {"d": "2026-02-08", "n": "Lunch Swim", "s": "Swim", "dk": 2.275, "mm": 42.4, "hr": 149, "ef": "moderate", "sp": 1.862, "pl": 25}, {"d": "2026-02-08", "n": "Afternoon Run", "s": "Run", "dk": 20.065, "mm": 117.6, "hr": 158, "ef": "moderate", "tl": 450, "p": 5.86, "rc": 81}, {"d": "2026-02-09", "n": "ROUVY - IRONMAN Copenhagen (1st loop)", "s": "Bike", "dk": 89.999, "mm": 156.0, "hr": 139, "ef": "moderate", "tl": 161, "vr": true, "w": 181, "nw": 184, "cad": 75, "mcad": 125}, {"d": "2026-02-09", "n": "Evening Run", "s": "Run", "dk": 10.081, "mm": 64.5, "hr": 148, "ef": "easy", "tl": 196, "p": 6.403, "rc": 81}, {"d": "2026-02-10", "n": "Lunch Swim", "s": "Swim", "dk": 2.0, "mm": 44.6, "hr": 116, "ef": "easy", "sp": 2.229, "pl": 25}, {"d": "2026-02-10", "n": "Afternoon Run", "s": "Run", "dk": 1.709, "mm": 8.9, "hr": 157, "ef": "easy", "tl": 39, "p": 5.236, "rc": 83, "wu": true}, {"d": "2026-02-10", "n": "2x5km @ 4.27 w/ 90sec rest", "s": "Run", "dk": 10.382, "mm": 46.2, "hr": 176, "ef": "hard", "tl": 286, "p": 4.454, "iv": true, "rc": 87}, {"d": "2026-02-11", "n": "Lunch Run", "s": "Run", "dk": 1.851, "mm": 11.0, "hr": 147, "ef": "easy", "tl": 42, "p": 5.963, "rc": 81, "wu": true}, {"d": "2026-02-11", "n": "Lunch Run", "s": "Run", "dk": 10.024, "mm": 60.6, "hr": 153, "ef": "easy", "tl": 212, "p": 6.045, "rc": 81}, {"d": "2026-02-11", "n": "ROUVY - GFNY Republica Dominicana (153km)", "s": "Bike", "dk": 58.756, "mm": 133.4, "hr": 111, "ef": "easy", "tl": 45, "vr": true, "w": 91, "nw": 102, "cad": 69, "mcad": 129}, {"d": "2026-02-12", "n": "ROUVY - Building Strength & Endurance", "s": "Bike", "dk": 41.313, "mm": 76.8, "hr": 155, "ef": "hard", "tl": 118, "vr": true, "w": 202, "nw": 220, "cad": 76, "mcad": 87}, {"d": "2026-02-13", "n": "Lunch Swim", "s": "Swim", "dk": 2.45, "mm": 48.9, "hr": 119, "ef": "moderate", "sp": 1.995, "pl": 50}, {"d": "2026-02-13", "n": "WU", "s": "Run", "dk": 1.688, "mm": 10.1, "hr": 160, "ef": "easy", "tl": 34, "p": 5.974, "rc": 79, "wu": true}, {"d": "2026-02-13", "n": "7x2km @ 4.11 w/ 2min rest", "s": "Run", "dk": 12.83, "mm": 75.2, "hr": 174, "ef": "hard", "tl": 352, "p": 5.862, "iv": true, "rc": 84}, {"d": "2026-02-14", "n": "ROUVY - Big Sugar Classic West | Arkansas", "s": "Bike", "dk": 50.732, "mm": 118.9, "hr": 123, "ef": "easy", "tl": 64, "vr": true, "w": 109, "nw": 133, "cad": 65, "mcad": 128}, {"d": "2026-02-14", "n": "ROUVY - Tour Down Under 2024 | Stage 2 - Lobethal", "s": "Bike", "dk": 12.69, "mm": 29.7, "hr": 123, "ef": "easy", "tl": 20, "vr": true, "w": 118, "nw": 146, "cad": 59, "mcad": 117}, {"d": "2026-02-16", "n": "Afternoon Run", "s": "Run", "dk": 1.276, "mm": 9.2, "hr": 151, "ef": "easy", "tl": 23, "p": 7.212, "rc": 80, "wu": true}, {"d": "2026-02-16", "n": "Afternoon Run", "s": "Run", "dk": 13.505, "mm": 89.4, "hr": 168, "ef": "moderate", "tl": 260, "p": 6.622, "rc": 83}, {"d": "2026-02-17", "n": "Morning Swim", "s": "Swim", "dk": 2.125, "mm": 45.3, "hr": 128, "ef": "easy", "sp": 2.133, "pl": 25}, {"d": "2026-02-17", "n": "ROUVY - Tour Down Under 2024 | Stage 1 - Bethany", "s": "Bike", "dk": 22.133, "mm": 62.1, "hr": 122, "ef": "easy", "tl": 33, "vr": true, "w": 120, "nw": 134, "cad": 65, "mcad": 126}, {"d": "2026-02-18", "n": "Lunch Ride", "s": "Bike", "dk": 76.577, "mm": 193.8, "hr": 132, "ef": "easy", "w": 118}, {"d": "2026-02-18", "n": "Evening Run", "s": "Run", "dk": 10.091, "mm": 61.5, "hr": 153, "ef": "easy", "tl": 223, "p": 6.101, "rc": 81}, {"d": "2026-02-20", "n": "Lunch Swim", "s": "Swim", "dk": 2.05, "mm": 44.4, "hr": 113, "ef": "easy", "sp": 2.165, "pl": 25}, {"d": "2026-02-20", "n": "Afternoon Run", "s": "Run", "dk": 3.081, "mm": 19.9, "hr": 144, "ef": "easy", "tl": 60, "p": 6.455, "rc": 81}, {"d": "2026-02-20", "n": "Afternoon Run", "s": "Run", "dk": 3.45, "mm": 24.2, "hr": 137, "ef": "easy", "tl": 57, "p": 7.006, "rc": 79}, {"d": "2026-02-20", "n": "Morning Ride", "s": "Bike", "dk": 93.936, "mm": 235.8, "hr": 134, "ef": "easy", "w": 115}, {"d": "2026-02-23", "n": "Morning Ride", "s": "Bike", "dk": 72.452, "mm": 192.4, "hr": 130, "ef": "easy", "w": 105}, {"d": "2026-02-23", "n": "Evening Run", "s": "Run", "dk": 10.004, "mm": 65.1, "hr": 144, "ef": "easy", "tl": 194, "p": 6.508, "rc": 81}, {"d": "2026-02-24", "n": "Lunch Swim", "s": "Swim", "dk": 3.1, "mm": 68.6, "hr": 140, "ef": "moderate", "sp": 2.212, "pl": 50}, {"d": "2026-02-24", "n": "Afternoon Run", "s": "Run", "dk": 1.956, "mm": 10.3, "hr": 162, "ef": "easy", "tl": 46, "p": 5.291, "rc": 83, "wu": true}, {"d": "2026-02-24", "n": "3x3km  w/ 90sec rest", "s": "Run", "dk": 9.271, "mm": 40.4, "hr": 181, "ef": "hard", "tl": 273, "p": 4.361, "iv": true, "rc": 88}, {"d": "2026-02-24", "n": "Afternoon Run", "s": "Run", "dk": 5.038, "mm": 35.4, "hr": 146, "ef": "easy", "tl": 85, "p": 7.02, "rc": 82}, {"d": "2026-02-24", "n": "Morning Ride", "s": "Bike", "dk": 74.672, "mm": 204.0, "hr": 120, "ef": "easy", "w": 95}, {"d": "2026-02-25", "n": "Afternoon Run", "s": "Run", "dk": 10.001, "mm": 53.4, "hr": 170, "ef": "moderate", "tl": 242, "p": 5.344, "rc": 83}, {"id": 17513622375, "d": "2026-02-25", "n": "Morning Ride", "s": "Bike", "dk": 74.672, "mm": 204.0, "hr": 120, "tl": 44.0, "vr": false, "w": 95, "ef": "easy"}, {"d": "2026-02-27", "n": "4x500m", "s": "Swim", "dk": 2.225, "mm": 40.6, "hr": 136, "ef": "hard", "sp": 1.823, "pl": 25, "iv": true}, {"d": "2026-02-27", "n": "Afternoon Run", "s": "Run", "dk": 2.036, "mm": 12.7, "hr": 145, "ef": "easy", "tl": 49, "p": 6.214, "rc": 78, "wu": true}, {"d": "2026-02-27", "n": "Afternoon Run", "s": "Run", "dk": 1.048, "mm": 5.0, "hr": 167, "ef": "easy", "tl": 27, "p": 4.754, "rc": 85, "wu": true}, {"d": "2026-02-27", "n": "Afternoon Run", "s": "Run", "dk": 3.413, "mm": 12.4, "hr": 169, "ef": "hard", "tl": 111, "p": 3.638, "rc": 91}, {"d": "2026-02-28", "n": "ROUVY - Over & Unders Z4 and Z5", "s": "Bike", "dk": 55.165, "mm": 91.8, "hr": 160, "ef": "hard", "tl": 147, "vr": true, "w": 204, "nw": 224, "cad": 77, "mcad": 117, "iv": true}, {"d": "2026-02-28", "n": "Afternoon Swim", "s": "Swim", "dk": 1.75, "mm": 36.8, "hr": 132, "ef": "easy", "sp": 2.1, "pl": 25}, {"d": "2026-03-01", "n": "Lunch Run", "s": "Run", "dk": 1.946, "mm": 10.7, "hr": 158, "ef": "easy", "tl": 43, "p": 5.481, "rc": 80, "wu": true}, {"d": "2026-03-01", "n": "Afternoon Run", "s": "Run", "dk": 14.232, "mm": 66.5, "hr": 178, "ef": "hard", "tl": 379, "p": 4.671, "rc": 85}, {"d": "2026-03-02", "n": "Morning Ride", "s": "Bike", "dk": 73.026, "mm": 200.4, "hr": 116, "ef": "easy", "w": 96}, {"d": "2026-03-02", "n": "Afternoon Run", "s": "Run", "dk": 10.008, "mm": 65.8, "hr": 145, "ef": "easy", "tl": 200, "p": 6.572, "rc": 80}, {"d": "2026-03-03", "n": "Lunch Swim", "s": "Swim", "dk": 3.0, "mm": 60.4, "hr": 161, "ef": "hard", "sp": 2.013, "pl": 50}, {"d": "2026-03-04", "n": "Lunch Run", "s": "Run", "dk": 2.023, "mm": 10.7, "hr": 147, "ef": "easy", "tl": 45, "p": 5.271, "rc": 82, "wu": true}, {"d": "2026-03-04", "n": "Afternoon Run", "s": "Run", "dk": 4.615, "mm": 20.3, "hr": 178, "ef": "hard", "tl": 141, "p": 4.402, "rc": 86}, {"d": "2026-03-04", "n": "Morning Ride", "s": "Bike", "dk": 60.437, "mm": 158.1, "hr": 119, "ef": "easy", "w": 102}, {"d": "2026-03-05", "n": "Afternoon Run", "s": "Run", "dk": 10.002, "mm": 68.6, "hr": 142, "ef": "easy", "tl": 188, "p": 6.862, "rc": 79}, {"id": 17608448968, "d": "2026-03-05", "n": "Morning Ride", "s": "Bike", "dk": 60.437, "mm": 158.1, "hr": 119, "tl": 39.0, "vr": false, "w": 102, "ef": "easy"}, {"id": 17642601364, "d": "2026-03-08", "n": "Morning Swim", "s": "Swim", "dk": 2.175, "mm": 42.2, "hr": 143, "tl": 86.0, "sp": 1.943, "ef": "easy"}], "pbs": {"Run 5km": {"v": "4:40/km", "date": "2025-07-22", "hr": 186.0, "dist": 5.01, "note": "hard continuous effort"}, "Run 10km": {"v": "5:10/km", "date": "2025-12-11", "hr": 171.0, "dist": 10.022, "note": "continuous"}, "Run 15km": {"v": "5:28/km", "date": "2025-12-12", "hr": 166.0, "dist": 15.0, "note": "continuous effort"}, "Run Half Marathon": {"v": "5:21/km", "date": "2025-11-18", "hr": 174.0, "dist": 21.243, "note": "continuous"}, "Run Marathon": {"v": "7:18/km", "date": "2025-06-01", "hr": 168.0, "dist": 42.261, "note": "continuous"}, "Run 5km (interval)": {"v": "4:19/km", "date": "2025-07-08", "hr": 184.0, "note": "Intervals"}, "Run 10km (interval)": {"v": "3:57/km", "date": "2025-12-30", "hr": 176.0, "note": "10x1km w/ 3min rest"}, "Run Best Z2": {"v": "5:31/km @ 153bpm", "date": "2025-08-18", "ae": 19.752}, "Run Longest": {"v": "90.8km", "date": "2025-08-08", "hr": 148.0}, "Bike 45min Power": {"v": "214W NP", "date": "2025-12-17", "hr": 168.0, "type": "Outdoor"}, "Bike 60min Power": {"v": "219W NP", "date": "2025-11-28", "hr": 169.0, "type": "Rouvy"}, "Bike 90min Power": {"v": "224W NP", "date": "2026-02-28", "hr": 160.0, "type": "Rouvy"}, "Bike Best NP (Rouvy)": {"v": "227W", "date": "2025-12-20", "dur": 72.15, "hr": 167.0}, "Bike Longest Outdoor": {"v": "94km in 236min", "date": "2026-02-21"}, "Swim 1000m": {"v": "1:43/100m", "date": "2025-06-29", "dist": 1000, "note": "session avg"}, "Swim 1500m": {"v": "2:08/100m", "date": "2026-01-06", "dist": 1500, "note": "session avg"}, "Swim 2000m": {"v": "2:06/100m", "date": "2025-12-28", "dist": 1950, "note": "session avg"}, "Swim 2500m": {"v": "1:57/100m", "date": "2026-01-24", "dist": 2400, "note": "session avg"}, "Swim 3000m+": {"v": "1:53/100m", "date": "2026-01-31", "dist": 3125, "note": "session avg"}, "Swim Best Pace": {"v": "1:43/100m", "date": "2025-06-29", "note": "session avg"}}};

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
