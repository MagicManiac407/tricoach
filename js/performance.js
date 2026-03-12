// Shared helpers for Strava import
function stravaDateToDow(dateStr) {
  // Parse as local noon to avoid any UTC timezone shift issues
  const d = new Date(dateStr + 'T12:00:00');
  return (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
}
function stravaDateToWeekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7;
  const mon = new Date(d); mon.setDate(d.getDate() - dow);
  return localDateStr(mon);
}
function stravaFormatLine(a) {
  const fP = p => { const m=Math.floor(p),s=Math.round((p-m)*60); return m+':'+(s<10?'0':'')+s; };

  // Determine effort tag
  let efTag = '';
  if(a.wu) efTag = '[WU]';
  else if(a.cd) efTag = '[CD]';
  else efTag = {easy:'[Z2]',moderate:'[Z3]',hard:'[Z4]',max:'[Z5]'}[a.ef] || '';

  if(a.s==='Run') {
    const parts=['Run:',a.dk?a.dk.toFixed(1)+'km':'',a.mm?a.mm.toFixed(0)+'min':'',a.p?fP(a.p)+'/km':'',a.hr?'@ '+a.hr.toFixed(0)+'bpm':'',efTag,a.iv?'[INTERVAL]':'','—',a.n];
    return parts.filter(Boolean).join(' ').replace(/  +/g,' ').trim();
  } else if(a.s==='Bike') {
    const cadStr=a.cad?a.cad+'rpm':'';
    const parts=[(a.vr?'Rouvy':'Ride')+':',a.dk?a.dk.toFixed(0)+'km':'',a.mm?a.mm.toFixed(0)+'min':'',a.nw?'NP '+a.nw.toFixed(0)+'W':a.w?a.w.toFixed(0)+'W avg':'',a.hr?'@ '+a.hr.toFixed(0)+'bpm':'',cadStr,efTag,'—',a.n];
    return parts.filter(Boolean).join(' ').replace(/  +/g,' ').trim();
  } else if(a.s==='Swim') {
    const swolfStr=a.swolf?'SWOLF '+a.swolf:'';
    const parts=['Swim:',a.dk?Math.round(a.dk*1000)+'m':'',a.mm?a.mm.toFixed(0)+'min':'',a.sp?fP(a.sp)+'/100m':'',a.hr?'@ '+a.hr.toFixed(0)+'bpm':'',a.pl?a.pl+'m pool':'',swolfStr,efTag,'—',a.n];
    return parts.filter(Boolean).join(' ').replace(/  +/g,' ').trim();
  }
  return a.n;
}
function stravaTypeTag(a) {
  if(a.wu || a.cd) return 'Warm-up';
  if(a.s==='Run')  return a.iv?'Interval Run':(a.ef==='hard'||a.ef==='max'?'Hard Run':a.ef==='easy'?'Z2 Run':'Run');
  if(a.s==='Bike') return a.ef==='hard'||a.ef==='max'?'Hard Ride':(a.vr?'Rouvy':'Outdoor Cycle');
  if(a.s==='Swim') return a.ef==='hard'||a.ef==='max'?'Hard Swim':'Swim';
  return a.s;
}

function stravaImportWeek(weekKey) {
  // Week runs Mon–Sun. Dates in STRAVA_ACTS are already AEST-corrected.
  // Compute Sunday of this week safely using string arithmetic (avoid UTC shift)
  const [wY,wM,wD] = weekKey.split('-').map(Number);
  const wEndDate = new Date(wY, wM-1, wD+6); // local date, +6 days = Sunday
  const wEnd = wEndDate.getFullYear()+'-'+String(wEndDate.getMonth()+1).padStart(2,'0')+'-'+String(wEndDate.getDate()).padStart(2,'0');

  const acts = STRAVA_ACTS.acts.filter(a => a.d >= weekKey && a.d <= wEnd && a.mm && a.mm >= 1);
  if(!acts.length) { showToast('No Strava activities found for this week', true); return; }

  if(!D.plans[weekKey]) D.plans[weekKey] = {};

  // Build fresh strava lines per day — don't touch plan/notes fields
  const stravaByDay = {};
  acts.forEach(a => {
    const dow = stravaDateToDow(a.d);
    if(!stravaByDay[dow]) stravaByDay[dow] = [];
    stravaByDay[dow].push(stravaFormatLine(a));
    // Collect type tags
    if(!stravaByDay[dow]._tags) stravaByDay[dow]._tags = new Set();
    stravaByDay[dow]._tags.add(stravaTypeTag(a));
  });

  let days = 0;
  for(let di=0; di<7; di++) {
    if(!stravaByDay[di]) continue;
    if(!D.plans[weekKey][di]) D.plans[weekKey][di] = {types:'',plan:'',completed:'',notes:''};
    const day = D.plans[weekKey][di];

    // Preserve manual completed (anything before "--- Strava ---" separator)
    const existingCompleted = day.completed || '';
    const manualPart = existingCompleted.includes('--- Strava ---')
      ? existingCompleted.split('--- Strava ---')[0].trimEnd()
      : existingCompleted;

    const stravaBlock = stravaByDay[di].filter(l=>typeof l==='string').join('\n');
    day.completed = manualPart
      ? manualPart + '\n--- Strava ---\n' + stravaBlock
      : stravaBlock;

    // Add type tags (don't overwrite existing)
    const existingTypes = day.types || '';
    stravaByDay[di]._tags.forEach(tag => {
      if(!existingTypes.includes(tag)) {
        day.types = day.types ? day.types + ', ' + tag : tag;
      }
    });
    days++;
  }

  save();
  renderPlanner();
  showToast('Imported ' + acts.length + ' activities across ' + days + ' days');
}

// ===== PERFORMANCE =====
function switchPT(tab) {
  ['overview','run','bike','swim','volume','trends','autopb','predictor'].forEach(t => {
    const pv = document.getElementById('pv-'+t);
    if(pv) pv.style.display = t===tab?'block':'none';
    const btn = document.getElementById('pt-'+t);
    if(!btn) return;
    if(t==='predictor') {
      btn.style.background = t===tab ? 'var(--green)' : 'transparent';
      btn.style.color = t===tab ? '#000' : 'var(--green)';
    } else if(t==='overview') {
      btn.className = t===tab?'btn':'btn sec';
    } else {
      btn.className = t===tab?'btn':'btn sec';
    }
  });
  if(tab==='run')       renderRunCharts();
  if(tab==='bike')      renderBikeCharts();
  if(tab==='swim')      renderSwimCharts();
  if(tab==='volume')    renderVolumeCharts();
  if(tab==='autopb')    renderAutoPBs();
  if(tab==='predictor') renderRacePredictor();
  if(tab==='trends') {
    // Navigate to the dedicated Trends tab which has the full chart infrastructure
    setTimeout(() => nav('trends'), 50);
  }
  if(tab==='overview')  renderAIOverview();
}

function renderPerformance() {
  // Update the subtitle with actual data counts
  const acts = STRAVA_ACTS.acts || [];
  if(acts.length) {
    const runs = acts.filter(a=>a.s==='Run').length;
    const bikes = acts.filter(a=>a.s==='Bike').length;
    const swims = acts.filter(a=>a.s==='Swim').length;
    const dates = acts.map(a=>a.d).sort();
    const el = document.getElementById('perf-subtitle');
    if(el) el.textContent = `${acts.length} Strava activities · ${dates[0]||'—'} – ${dates[dates.length-1]||'—'} · ${runs} runs · ${bikes} rides · ${swims} swims`;
  }
  renderRunCharts();
}

function daysAgo(n) { const d=new Date(); d.setDate(d.getDate()-n); return localDateStr(d); }

function filterActs(sport, opts) {
  opts = opts || {};
  let acts = STRAVA_ACTS.acts.filter(a => a.s === sport);
  if(opts.range && opts.range !== 'all') acts = acts.filter(a => a.d >= daysAgo(parseInt(opts.range)));
  if(opts.effort && opts.effort !== 'all') acts = acts.filter(a => a.ef === opts.effort);
  if(opts.minDist) acts = acts.filter(a => a.dk && a.dk >= opts.minDist);
  if(opts.minDur) acts = acts.filter(a => a.mm && a.mm >= opts.minDur);
  if(opts.noInterval) acts = acts.filter(a => !a.iv);
  if(opts.rideType === 'rouvy') acts = acts.filter(a => a.vr);
  if(opts.rideType === 'outdoor') acts = acts.filter(a => !a.vr);
  // Compute derived fields at runtime
  return acts.sort((a,b) => a.d.localeCompare(b.d)).map(a => {
    const out = {...a};
    // be = Watts:HR efficiency (W per bpm) — bike only
    if(!out.be && (out.nw || out.w) && out.hr) out.be = round3((out.nw || out.w) / out.hr);
    // ae = Aerobic Efficiency (speed/HR*1000) — run only, if not already stored
    if(!out.ae && out.p && out.hr) out.ae = round3(1000 / out.p / out.hr);
    return out;
  });
}
function round3(v) { return Math.round(v*1000)/1000; }

function setupCanvas(id) {
  const c = document.getElementById(id); if(!c) return null;
  const w = c.parentElement.clientWidth - 40;
  c.width = w > 100 ? w : 300;
  return c;
}

function drawBase(ctx, W, H, pL, pT, pR, pB, yMin, yMax, labels) {
  const cW=W-pL-pR, cH=H-pT-pB;
  ctx.fillStyle='var(--surface2)'; ctx.fillRect(0,0,W,H);
  for(let i=0;i<=4;i++) {
    const y=pT+cH*(1-i/4);
    ctx.strokeStyle='rgba(30,45,61,0.9)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pL,y); ctx.lineTo(pL+cW,y); ctx.stroke();
    const val=yMin+(yMax-yMin)*i/4;
    ctx.fillStyle='rgba(90,112,128,0.7)'; ctx.font='9px monospace';
    ctx.textAlign='right'; ctx.fillText(val.toFixed(1),pL-3,y+3);
  }
  ctx.textAlign='left';
  const step=Math.max(1,Math.ceil(labels.length/7));
  labels.forEach((l,i) => {
    if(i%step===0) {
      const x=pL+cW*(i/(Math.max(labels.length-1,1)));
      ctx.fillStyle='rgba(90,112,128,0.7)'; ctx.font='9px monospace';
      ctx.fillText(l.slice(5),x-10,H-4);
    }
  });
  return {cW,cH};
}

function drawLine(ctx, pts, color, W, H, pL, pT, cW, cH, yMin, yMax) {
  if(!pts.length) return [];
  ctx.strokeStyle=color; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.setLineDash([]);
  ctx.beginPath();
  pts.forEach((p,i) => {
    const x=pL+cW*(p.i/(Math.max(p.n-1,1)));
    const y=pT+cH*(1-(p.v-yMin)/(yMax-yMin||1));
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.stroke();
  const coords = [];
  pts.forEach(p => {
    const x=pL+cW*(p.i/(Math.max(p.n-1,1)));
    const y=pT+cH*(1-(p.v-yMin)/(yMax-yMin||1));
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    coords.push({cx:x, cy:y, lines: p.lines||[p.date||'', (p.v||0).toFixed(2)]});
  });
  return coords;
}

function drawEmpty(ctx, W, H, msg) {
  ctx.fillStyle='rgba(90,112,128,0.5)'; ctx.font='12px sans-serif';
  ctx.textAlign='center'; ctx.fillText(msg||'Not enough data', W/2, H/2);
  ctx.textAlign='left';
}

function fmtPace(p) { const m=Math.floor(p); return m+':'+(Math.round((p-m)*60)).toString().padStart(2,'0'); }
function fmtDate(d) { return new Date(d+'T00:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short'}); }

// ===== TREND CHART HELPER =====
// World-class interactive chart: gradient fill, rolling avg, effort dots, month labels, tooltips
function drawTrendChart(id, pts, opts) {
  const c = setupCanvas(id); if(!c) return;
  const H = opts.H || 240;
  c.height = H;
  const ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,H);

  const filtered = pts.filter(a => { const v=opts.getValue(a); return v!=null&&!isNaN(v)&&v>0; });
  if(filtered.length < 2) { drawEmpty(ctx,c.width,H,opts.emptyMsg||'Need 2+ sessions with data'); return; }

  const vals = filtered.map(a => opts.getValue(a));
  let yMin=Math.min(...vals), yMax=Math.max(...vals);
  const pad=(yMax-yMin)*0.15||yMax*0.06||1;
  yMin-=pad; yMax+=pad;

  const pL=58, pT=22, pR=20, pB=38;
  const W=c.width, cW=W-pL-pR, cH=H-pT-pB;

  // Background with subtle gradient
  const bgGrad = ctx.createLinearGradient(0,0,0,H);
  bgGrad.addColorStop(0,'rgba(20,29,42,1)'); bgGrad.addColorStop(1,'rgba(15,21,32,1)');
  ctx.fillStyle=bgGrad; ctx.fillRect(0,0,W,H);

  // Zone bands (if provided)
  (opts.zones||[]).forEach(z => {
    const y1=Math.max(pT, pT+cH*(1-(z.max-yMin)/(yMax-yMin||1)));
    const y2=Math.min(pT+cH, pT+cH*(1-(z.min-yMin)/(yMax-yMin||1)));
    if(y1<pT+cH && y2>pT) {
      ctx.fillStyle=z.color||'rgba(255,255,255,0.03)';
      ctx.fillRect(pL, y1, cW, y2-y1);
    }
  });

  // Y grid + labels
  for(let i=0;i<=5;i++) {
    const v=yMin+(yMax-yMin)*i/5;
    const y=pT+cH*(1-i/5);
    ctx.strokeStyle='rgba(255,255,255,0.035)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pL,y); ctx.lineTo(pL+cW,y); ctx.stroke();
    ctx.fillStyle='rgba(90,112,128,0.8)'; ctx.font='9px DM Mono,monospace';
    ctx.textAlign='right';
    ctx.fillText(opts.yFmt?opts.yFmt(v):v.toFixed(1), pL-5, y+3);
  }
  ctx.textAlign='left';

  const xOf=i=>pL+cW*(i/Math.max(filtered.length-1,1));
  const yOf=v=>pT+cH*(1-(v-yMin)/(yMax-yMin||1));

  // Month markers on X axis
  let lastMo='';
  filtered.forEach((a,i)=>{
    const mo=a.d.slice(0,7);
    if(mo!==lastMo){
      lastMo=mo;
      const x=xOf(i);
      ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1; ctx.setLineDash([2,5]);
      ctx.beginPath(); ctx.moveTo(x,pT); ctx.lineTo(x,pT+cH); ctx.stroke(); ctx.setLineDash([]);
      const d=new Date(a.d+'T12:00:00');
      const lbl=d.toLocaleDateString('en-AU',{month:'short',year:'2-digit'});
      ctx.fillStyle='rgba(90,112,128,0.45)'; ctx.font='9px DM Mono,monospace';
      ctx.textAlign='center'; ctx.fillText(lbl,x,H-5); ctx.textAlign='left';
    }
  });

  // Reference lines
  (opts.refs||[]).forEach(ref=>{
    const y=yOf(ref.value);
    if(y<pT-2||y>pT+cH+2) return;
    ctx.strokeStyle=ref.color||'rgba(255,255,255,0.25)'; ctx.lineWidth=1; ctx.setLineDash([5,3]);
    ctx.beginPath(); ctx.moveTo(pL,y); ctx.lineTo(pL+cW,y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=ref.color||'rgba(255,255,255,0.4)'; ctx.font='bold 9px DM Mono,monospace';
    ctx.fillText(ref.label,pL+6,y-4);
  });

  // Rolling average
  const N=opts.rollingN||6;
  const rolling=filtered.map((_,i)=>{
    const s=Math.max(0,i-Math.floor(N/2)), e=Math.min(filtered.length-1,i+Math.floor(N/2));
    const sl=vals.slice(s,e+1); return sl.reduce((a,b)=>a+b,0)/sl.length;
  });

  // Gradient fill under rolling line — the signature element
  const col = opts.color;
  let r=100,g=200,b=150;
  if(col.startsWith('#')&&col.length===7){r=parseInt(col.slice(1,3),16);g=parseInt(col.slice(3,5),16);b=parseInt(col.slice(5,7),16);}
  const fillGrad = ctx.createLinearGradient(0,pT,0,pT+cH);
  fillGrad.addColorStop(0,`rgba(${r},${g},${b},0.18)`);
  fillGrad.addColorStop(0.6,`rgba(${r},${g},${b},0.06)`);
  fillGrad.addColorStop(1,`rgba(${r},${g},${b},0)`);
  ctx.fillStyle=fillGrad;
  ctx.beginPath();
  rolling.forEach((v,i)=>{ i===0?ctx.moveTo(xOf(i),yOf(v)):ctx.lineTo(xOf(i),yOf(v)); });
  ctx.lineTo(xOf(filtered.length-1),pT+cH); ctx.lineTo(pL,pT+cH); ctx.closePath(); ctx.fill();

  // Rolling average line — the hero element
  ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.setLineDash([]);
  ctx.shadowColor=`rgba(${r},${g},${b},0.4)`; ctx.shadowBlur=6;
  ctx.beginPath();
  rolling.forEach((v,i)=>{ i===0?ctx.moveTo(xOf(i),yOf(v)):ctx.lineTo(xOf(i),yOf(v)); });
  ctx.stroke();
  ctx.shadowBlur=0;

  // Trend regression overlay
  if(filtered.length>=5){
    const n=filtered.length;
    const sx=filtered.reduce((_,__,i)=>_+i,0), sy=vals.reduce((a,b)=>a+b,0);
    const sxy=vals.reduce((s,v,i)=>s+i*v,0), sx2=filtered.reduce((s,_,i)=>s+i*i,0);
    const slope=(n*sxy-sx*sy)/(n*sx2-sx*sx||1), intc=(sy-slope*sx)/n;
    const improving=opts.lowerIsBetter?(slope<0):(slope>0);
    ctx.strokeStyle=improving?'rgba(0,230,118,0.25)':'rgba(244,67,54,0.25)';
    ctx.lineWidth=1.5; ctx.setLineDash([8,5]);
    ctx.beginPath(); ctx.moveTo(xOf(0),yOf(intc)); ctx.lineTo(xOf(n-1),yOf(intc+slope*(n-1))); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=improving?'#00e676':'#f44336'; ctx.font='bold 10px DM Sans,sans-serif';
    ctx.fillText(improving?'↑ Improving':'↓ Declining',pL+8,pT+14);
  }

  // Individual session dots — effort-coded colors
  const ECOL={easy:'#2196f3',moderate:'#ff9800',hard:'#f44336',max:'#e040fb'};
  const ttPts=[];
  filtered.forEach((a,i)=>{
    const v=vals[i], x=xOf(i), y=yOf(v);
    const base=opts.effortDots?(ECOL[a.ef]||col):col;
    const isLatest=i===filtered.length-1;
    let dr=r,dg=g,db=b;
    if(base.startsWith('#')&&base.length===7){dr=parseInt(base.slice(1,3),16);dg=parseInt(base.slice(3,5),16);db=parseInt(base.slice(5,7),16);}
    const alpha=isLatest?1:0.5;
    ctx.fillStyle=`rgba(${dr},${dg},${db},${alpha})`;
    ctx.beginPath(); ctx.arc(x,y,isLatest?5:2.5,0,Math.PI*2); ctx.fill();
    if(isLatest){
      ctx.shadowColor=`rgba(${dr},${dg},${db},0.6)`; ctx.shadowBlur=8;
      ctx.strokeStyle=`rgba(${dr},${dg},${db},0.7)`; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(x,y,9,0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur=0;
    }
    ttPts.push({cx:x,cy:y,lines:opts.tipLines?opts.tipLines(a,v):[
      `<span style="font-size:10px;color:#aabbcc;">${fmtDate(a.d)}</span>`,
      `<b style="color:${col};">${opts.yFmt?opts.yFmt(v):v.toFixed(2)}</b>`
    ]});
  });
  TT.register(c, ttPts);

  // Y axis label
  ctx.save(); ctx.translate(11,pT+cH/2); ctx.rotate(-Math.PI/2);
  ctx.fillStyle='rgba(90,112,128,0.5)'; ctx.font='9px DM Mono,monospace'; ctx.textAlign='center';
  ctx.fillText(opts.label||'',0,0); ctx.restore();
}

// Stat card helper for summary rows
function statCard(label,value,sub,color){
  return `<div style="background:var(--surface2);border-radius:8px;padding:10px 14px;">
    <div style="font-size:10px;color:var(--text-dim);margin-bottom:4px;">${label}</div>
    <div style="font-size:20px;font-family:'Bebas Neue',sans-serif;color:${color||'var(--text)'};">${value}</div>
    ${sub?`<div style="font-size:10px;color:var(--text-dim);">${sub}</div>`:''}
  </div>`;
}

// ===== RUN CHARTS =====
function renderRunCharts() {
  const effort=(document.getElementById('rf-effort')||{value:'easy'}).value;
  const minDist=parseFloat((document.getElementById('rf-dist')||{value:5}).value||5);
  const range=(document.getElementById('rf-range')||{value:'all'}).value;
  const noIv=(document.getElementById('rf-noiv')||{checked:false}).checked;

  const acts=filterActs('Run',{effort,minDist,range,noInterval:noIv}).filter(a=>a.p||a.hr||a.dk);
  const allActs=filterActs('Run',{minDist:5,range}).filter(a=>a.p);
  const ivActs=filterActs('Run',{range}).filter(a=>a.iv);

  // Stats summary
  const sDiv=document.getElementById('run-stats');
  if(sDiv&&acts.length){
    const recent=acts.slice(-8), all=acts;
    const avgPace=a=>a.filter(x=>x.p).reduce((s,x)=>s+x.p,0)/(a.filter(x=>x.p).length||1);
    const avgHR=a=>a.filter(x=>x.hr).reduce((s,x)=>s+x.hr,0)/(a.filter(x=>x.hr).length||1);
    const rPace=avgPace(recent), aPace=avgPace(all);
    const rHR=avgHR(recent), aHR=avgHR(all);
    const paceImprove=aPace>0?((aPace-rPace)/aPace*100):0;
    const hrImprove=aHR>0?((aHR-rHR)/aHR*100):0;
    sDiv.innerHTML=
      statCard('Avg Pace (recent 8)',acts.filter(a=>a.p).length?fmtPace(rPace)+'/km':'—',paceImprove>0.5?`↑ ${paceImprove.toFixed(1)}% faster than avg`:paceImprove<-0.5?`↓ ${Math.abs(paceImprove).toFixed(1)}% slower`:'On average',paceImprove>0?'var(--green)':'var(--text)')+
      statCard('Avg HR (recent 8)',acts.filter(a=>a.hr).length?Math.round(rHR)+'bpm':'—',hrImprove>0.5?`↓ ${hrImprove.toFixed(1)}% lower than avg`:hrImprove<-0.5?`↑ ${Math.abs(hrImprove).toFixed(1)}% higher`:'On average',hrImprove>0?'var(--green)':'var(--text)')+
      statCard('Sessions (filtered)',acts.length,'in selected range','var(--text-mid)')+
      statCard('Latest',acts.length?fmtDate(acts[acts.length-1].d):'—',acts.length&&acts[acts.length-1].p?fmtPace(acts[acts.length-1].p)+'/km @'+(acts[acts.length-1].hr||'—')+'bpm':'','var(--text-mid)');
  }

  // Pace trend — with effort colour coding and HR zones
  drawTrendChart('c-run-pace', acts, {
    getValue:a=>a.p, color:'#00e676', label:'min/km', lowerIsBetter:true,
    effortDots:true, rollingN:6, H:240,
    yFmt:v=>fmtPace(Math.max(0,v)),
    emptyMsg:'No matching runs — try changing filters',
    zones:[
      {min:0, max:4.0, color:'rgba(244,67,54,0.04)'},   // fast zone
      {min:5.5, max:7.0, color:'rgba(33,150,243,0.04)'} // easy zone
    ],
    refs:[
      {value:4.43, label:'HM PB pace 4:43', color:'rgba(255,215,0,0.45)'},
      {value:5.5,  label:'Easy Z2 ceiling', color:'rgba(33,150,243,0.3)'}
    ],
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `Pace: <b style="color:#00e676;">${fmtPace(v)}/km</b>  ·  ${a.dk?a.dk.toFixed(1)+'km':'—'}`,
      `HR: ${a.hr?a.hr.toFixed(0)+'bpm':'—'}  ·  ${a.mm?a.mm.toFixed(0)+'min':'—'}`,
      `AE: ${a.ae?a.ae.toFixed(2):'—'}  ·  <span style="color:${a.ef==='easy'?'#2196f3':a.ef==='hard'||a.ef==='max'?'#f44336':'#ff9800'};font-size:10px;">${a.ef||''} ${a.iv?'[INTERVAL]':''}</span>`
    ]
  });

  // HR trend — with HR zone bands
  drawTrendChart('c-run-hr', acts.filter(a=>a.hr), {
    getValue:a=>a.hr, color:'#ef5350', label:'bpm', lowerIsBetter:true,
    effortDots:true, rollingN:6, H:240,
    yFmt:v=>Math.round(v)+'',
    zones:[
      {min:144, max:162, color:'rgba(33,150,243,0.06)'},   // Z2
      {min:162, max:172, color:'rgba(255,152,0,0.05)'},    // Z3
      {min:172, max:200, color:'rgba(244,67,54,0.05)'}     // Z4+
    ],
    refs:[
      {value:162,label:'Z2 ceiling 162bpm',color:'rgba(33,150,243,0.5)'},
      {value:172,label:'Z3/Z4 172bpm',color:'rgba(255,152,0,0.4)'},
      {value:181,label:'LTHR 181bpm',color:'rgba(244,67,54,0.35)'}
    ],
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `HR: <b style="color:#ef5350;">${v.toFixed(0)}bpm</b>`,
      `Pace: ${a.p?fmtPace(a.p)+'/km':'—'}  ·  ${a.dk?a.dk.toFixed(1)+'km':'—'}`,
      `<span style="color:${a.ef==='easy'?'#2196f3':a.ef==='hard'?'#f44336':'#ff9800'};font-size:10px;">${a.ef}</span>`
    ]
  });

  // AE Trend (existing logic, kept)
  const c1=setupCanvas('c-ae-trend');
  if(c1){
    const ctx=c1.getContext('2d'); ctx.clearRect(0,0,c1.width,200);
    const data=acts.filter(a=>a.ae);
    if(data.length<2){drawEmpty(ctx,c1.width,200,'Need 2+ sessions');}
    else{
      const vals=data.map(a=>a.ae),mn=Math.min(...vals)*0.95,mx=Math.max(...vals)*1.05;
      const {cW,cH}=drawBase(ctx,c1.width,200,44,12,16,24,mn,mx,data.map(a=>a.d));
      const aePts=drawLine(ctx,data.map((a,i)=>({i,v:a.ae,n:data.length,date:a.d,lines:[
        '<b>'+fmtDate(a.d)+'</b>','AE: '+a.ae.toFixed(2),
        'Pace: '+(a.p?fmtPace(a.p)+'/km':'—'),'HR: '+(a.hr?a.hr+'bpm':'—')
      ]})),'#00e676',c1.width,200,44,12,cW,cH,mn,mx);
      TT.register(c1,aePts);
      if(data.length>=4){
        const n=data.length,sx=data.reduce((s,_,i)=>s+i,0),sy=data.reduce((s,a)=>s+a.ae,0);
        const sxy=data.reduce((s,a,i)=>s+i*a.ae,0),sx2=data.reduce((s,_,i)=>s+i*i,0);
        const slope=(n*sxy-sx*sy)/(n*sx2-sx*sx||1),intercept=(sy-slope*sx)/n;
        ctx.strokeStyle='rgba(0,230,118,0.3)';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
        ctx.beginPath();ctx.moveTo(44,12+cH*(1-(intercept-mn)/(mx-mn||1)));
        ctx.lineTo(44+cW,12+cH*(1-(intercept+slope*(n-1)-mn)/(mx-mn||1)));
        ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle=slope>0?'#00e676':'#f44336';ctx.font='bold 10px sans-serif';
        ctx.fillText(slope>0?'↑ Improving':'↓ Declining',46,24);
      }
    }
  }

  // Scatter (existing logic, kept)
  const c2=setupCanvas('c-ae-scatter');
  if(c2){
    const ctx=c2.getContext('2d');ctx.clearRect(0,0,c2.width,c2.height);
    const data=allActs.filter(a=>a.p&&a.hr);
    if(data.length<3){drawEmpty(ctx,c2.width,220,'Need 3+ sessions with HR');}
    else{
      const paces=data.map(a=>a.p),hrs=data.map(a=>a.hr);
      const pMn=Math.min(...paces)*0.97,pMx=Math.max(...paces)*1.03;
      const hMn=Math.min(...hrs)*0.97,hMx=Math.max(...hrs)*1.03;
      const W=c2.width,H=220,pL=54,pT=18,pR=16,pB=34,cW=W-pL-pR,cH=H-pT-pB;
      ctx.fillStyle='var(--surface2)';ctx.fillRect(0,0,W,H);
      for(let i=0;i<=4;i++){
        const y=pT+cH*i/4;
        ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(pL,y);ctx.lineTo(pL+cW,y);ctx.stroke();
        ctx.fillStyle='rgba(90,112,128,0.7)';ctx.font='9px monospace';
        ctx.textAlign='right';ctx.fillText(Math.round(hMx-(hMx-hMn)*i/4)+'bpm',pL-3,y+3);
      }
      for(let i=0;i<=4;i++){
        const x=pL+cW*i/4,pVal=pMx-(i/4)*(pMx-pMn);
        ctx.fillStyle='rgba(90,112,128,0.7)';ctx.font='9px monospace';
        ctx.textAlign='center';ctx.fillText(fmtPace(pVal),x,H-20);
      }
      ctx.textAlign='left';
      ctx.fillStyle='rgba(90,112,128,0.5)';ctx.font='9px monospace';ctx.textAlign='center';
      ctx.fillText('pace /km  (→ faster)',pL+cW/2,H-6);
      ctx.save();ctx.translate(10,pT+cH/2);ctx.rotate(-Math.PI/2);ctx.fillText('HR (bpm)',0,0);ctx.restore();
      ctx.textAlign='left';
      ctx.fillStyle='rgba(0,230,118,0.4)';ctx.font='9px monospace';ctx.fillText('↘ better',pL+cW-42,pT+cH-4);
      const coords=data.map(a=>({x:pL+cW*(1-(a.p-pMn)/(pMx-pMn||1)),y:pT+cH*(a.hr-hMn)/(hMx-hMn||1),a}));
      const n=coords.length;
      ctx.strokeStyle='rgba(90,112,128,0.2)';ctx.lineWidth=1;ctx.setLineDash([2,3]);
      ctx.beginPath();coords.forEach((c,i)=>{i===0?ctx.moveTo(c.x,c.y):ctx.lineTo(c.x,c.y);});
      ctx.stroke();ctx.setLineDash([]);
      if(n>=4){
        const xs=coords.map((_,i)=>i),ys=coords.map(c=>c.a.hr);
        const sx=xs.reduce((a,b)=>a+b,0),sy=ys.reduce((a,b)=>a+b,0);
        const sxy=xs.reduce((s,x,i)=>s+x*ys[i],0),sx2=xs.reduce((s,x)=>s+x*x,0);
        const slope=(n*sxy-sx*sy)/(n*sx2-sx*sx||1),intc=(sy-slope*sx)/n;
        const y0=pT+cH*((intc-hMn)/(hMx-hMn||1)),y1=pT+cH*((intc+slope*(n-1)-hMn)/(hMx-hMn||1));
        ctx.strokeStyle=slope<0?'rgba(0,230,118,0.4)':'rgba(244,67,54,0.4)';
        ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
        ctx.beginPath();ctx.moveTo(coords[0].x,y0);ctx.lineTo(coords[n-1].x,y1);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle=slope<0?'#00e676':'#f44336';ctx.font='bold 9px sans-serif';
        ctx.fillText(slope<0?'↓ HR trending down':'↑ HR trending up',pL+4,pT+12);
      }
      const scatterPts=[];
      coords.forEach((c,i)=>{
        const age=n>1?i/(n-1):1;
        const r=Math.round(90+(0-90)*age),g=Math.round(112+(230-112)*age),b=Math.round(128+(212-128)*age);
        const alpha=0.35+age*0.65,dotR=3+age*2;
        ctx.fillStyle=`rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();ctx.arc(c.x,c.y,dotR,0,Math.PI*2);ctx.fill();
        if(i===n-1){ctx.strokeStyle='rgba(0,230,118,0.8)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(c.x,c.y,dotR+3,0,Math.PI*2);ctx.stroke();}
        scatterPts.push({cx:c.x,cy:c.y,lines:[
          `<span style="color:${i===n-1?'#00e676':'#aabbcc'};font-size:10px;">${fmtDate(c.a.d)}${i===n-1?' (latest)':''}</span>`,
          `Pace: <b>${fmtPace(c.a.p)}/km</b>`,`HR: <b>${c.a.hr}bpm</b>`,
          c.a.dk?c.a.dk.toFixed(1)+'km':''
        ]});
      });
      ctx.font='9px monospace';ctx.textAlign='right';
      ctx.fillStyle='rgba(90,112,128,0.6)';ctx.fillText('● oldest',W-4,pT+10);
      ctx.fillStyle='rgba(0,230,118,0.9)';ctx.fillText('● newest',W-4,pT+22);
      ctx.textAlign='left';
      TT.register(c2,scatterPts);
    }
  }

  // Run table
  const tDiv=document.getElementById('run-table');
  if(tDiv){
    const recent=acts.filter(a=>a.hr).slice(-20).reverse();
    if(!recent.length){tDiv.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:12px 0;">No matching sessions</div>';}
    else{
      tDiv.innerHTML='<div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>Session</th><th>Dist</th><th>Pace</th><th>HR</th><th>Duration</th><th>AE</th><th>Effort</th><th></th></tr></thead><tbody>'+
        recent.map(a=>{
          const ec=a.ef==='easy'?'var(--blue)':a.ef==='moderate'?'var(--orange)':'var(--red)';
          const ac=a.ae>20?'var(--green)':a.ae>17?'var(--orange)':'var(--red)';
          return `<tr><td style="white-space:nowrap;">${fmtDate(a.d)}</td><td style="font-size:10px;color:var(--text-dim);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${a.n}">${a.n}</td><td>${a.dk?a.dk.toFixed(1):'—'}km</td><td style="font-family:monospace;">${a.p?fmtPace(a.p):'—'}/km</td><td>${a.hr?a.hr.toFixed(0):'—'}bpm</td><td style="color:var(--text-dim);">${a.mm?a.mm.toFixed(0):'—'}min</td><td style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:${ac};">${a.ae?a.ae.toFixed(1):'—'}</td><td><span style="font-size:10px;font-weight:600;color:${ec};">${a.ef}</span></td><td><button class="btn sec sml" style="font-size:9px;padding:2px 6px;" onclick="editWorkout(${a.id})">✏️</button></td></tr>`;
        }).join('')+'</tbody></table></div>';
    }
  }
  // Interval table
  const iDiv=document.getElementById('interval-table');
  if(iDiv){
    const recent=ivActs.slice(-15).reverse();
    if(!recent.length){iDiv.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">No interval sessions in range</div>';return;}
    iDiv.innerHTML='<div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>Session</th><th>Dist</th><th>Avg Pace</th><th>HR</th><th></th></tr></thead><tbody>'+
      recent.map(a=>`<tr><td style="white-space:nowrap;">${fmtDate(a.d)}</td><td style="font-size:10px;color:var(--text-dim);">${a.n}</td><td>${a.dk?a.dk.toFixed(1):'—'}km</td><td style="font-family:monospace;color:var(--red);">${a.p?fmtPace(a.p):'—'}/km</td><td>${a.hr?a.hr.toFixed(0):'—'}bpm</td><td><button class="btn sec sml" style="font-size:9px;padding:2px 6px;" onclick="editWorkout(${a.id})">✏️</button></td></tr>`).join('')+'</tbody></table></div>';
  }
}

// ===== BIKE CHARTS =====
function renderBikeCharts() {
  const rideType=(document.getElementById('bf-type')||{value:'rouvy'}).value;
  const minDur=parseFloat((document.getElementById('bf-dur')||{value:40}).value||40);
  const range=(document.getElementById('bf-range')||{value:'all'}).value;
  const acts=filterActs('Bike',{rideType,minDur,range}).filter(a=>a.nw||a.w||a.hr||a.dk);

  // Stats summary
  const sDiv=document.getElementById('bike-stats');
  if(sDiv&&acts.length){
    const recent=acts.slice(-8);
    const avgNP=a=>a.filter(x=>x.nw||x.w).reduce((s,x)=>s+(x.nw||x.w),0)/(a.filter(x=>x.nw||x.w).length||1);
    const avgHR=a=>a.filter(x=>x.hr).reduce((s,x)=>s+x.hr,0)/(a.filter(x=>x.hr).length||1);
    const rNP=avgNP(recent),aNP=avgNP(acts),rHR=avgHR(recent),aHR=avgHR(acts);
    const npImprove=aNP>0?((rNP-aNP)/aNP*100):0;
    const hrImprove=aHR>0?((aHR-rHR)/aHR*100):0;
    sDiv.innerHTML=
      statCard('Avg NP (recent 8)',acts.filter(a=>a.nw||a.w).length?Math.round(rNP)+'W':'—',npImprove>0.5?`↑ ${npImprove.toFixed(1)}% vs avg`:npImprove<-0.5?`↓ ${Math.abs(npImprove).toFixed(1)}% vs avg`:'On average',npImprove>0?'var(--green)':'var(--text)')+
      statCard('Avg HR (recent 8)',acts.filter(a=>a.hr).length?Math.round(rHR)+'bpm':'—',hrImprove>0.5?`↓ ${hrImprove.toFixed(1)}% lower`:'','var(--text-mid)')+
      statCard('W:HR (recent avg)',recent.filter(a=>a.be).length?(recent.filter(a=>a.be).reduce((s,a)=>s+a.be,0)/recent.filter(a=>a.be).length).toFixed(2):'—','Watts per bpm','var(--text-mid)')+
      statCard('Sessions',acts.length,'in selected range','var(--text-mid)');
  }

  // Power trend — FTP zone band
  drawTrendChart('c-bike-np', acts.filter(a=>a.nw||a.w), {
    getValue:a=>a.nw||a.w, color:'#ff9800', label:'Watts', lowerIsBetter:false,
    effortDots:false, rollingN:6, H:240,
    yFmt:v=>Math.round(v)+'W',
    zones:[
      {min:207, max:230, color:'rgba(244,67,54,0.05)'},  // threshold zone (90-100% FTP)
      {min:184, max:207, color:'rgba(255,152,0,0.04)'}   // sweetspot (80-90% FTP)
    ],
    refs:[
      {value:230,label:'FTP ~230W',color:'rgba(244,67,54,0.55)'},
      {value:207,label:'Sweetspot floor 207W',color:'rgba(255,152,0,0.35)'}
    ],
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `NP: <b style="color:#ff9800;">${a.nw?a.nw+'W NP':'—'}</b>  Avg: ${a.w?a.w+'W':'—'}`,
      `HR: ${a.hr?a.hr+'bpm':'—'}  ·  ${a.mm?a.mm.toFixed(0)+'min':'—'}  ·  ${a.dk?a.dk.toFixed(0)+'km':'—'}`,
      `W:HR: ${a.be?a.be.toFixed(2):'—'}  ·  <span style="font-size:10px;color:var(--text-dim);">${a.vr?'🖥 Rouvy':'🌿 Outdoor'}</span>`
    ]
  });

  // HR trend
  drawTrendChart('c-bike-hr', acts.filter(a=>a.hr), {
    getValue:a=>a.hr, color:'#ef5350', label:'bpm', lowerIsBetter:true,
    effortDots:false, rollingN:6, H:240,
    yFmt:v=>Math.round(v)+'',
    refs:[{value:163,label:'Z3 threshold 163bpm',color:'rgba(255,152,0,0.4)'}],
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `HR: <b style="color:#ef5350;">${v.toFixed(0)}bpm</b>`,
      `Power: ${a.nw?a.nw+'W NP':a.w?a.w+'W avg':'—'}  ·  ${a.mm?a.mm.toFixed(0)+'min':'—'}`,
      `<span style="font-size:10px;color:var(--text-dim);">${a.vr?'Rouvy':'Outdoor'}</span>`
    ]
  });

  // W:HR efficiency
  const effActs=acts.filter(a=>a.be);
  drawTrendChart('c-bike-eff', effActs, {
    getValue:a=>a.be, color:'#ce93d8', label:'W/bpm', lowerIsBetter:false,
    effortDots:false, rollingN:5, H:200,
    yFmt:v=>v.toFixed(2),
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `W:HR: <b style="color:#ce93d8;">${v.toFixed(3)}</b>`,
      `NP: ${a.nw?a.nw+'W':'—'}  HR: ${a.hr?a.hr+'bpm':'—'}`
    ]
  });

  // Duration trend
  drawTrendChart('c-bike-dur', acts, {
    getValue:a=>a.mm, color:'#4dd0e1', label:'minutes', lowerIsBetter:false,
    effortDots:false, rollingN:5, H:200,
    yFmt:v=>Math.round(v)+'m',
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `Duration: <b style="color:#4dd0e1;">${v.toFixed(0)}min</b>`,
      `${a.dk?a.dk.toFixed(0)+'km  ':''}${a.nw?a.nw+'W NP':''}`,
      `<span style="font-size:10px;color:var(--text-dim);">${a.vr?'Rouvy':'Outdoor'}</span>`
    ]
  });

  // Bike table
  const tDiv=document.getElementById('bike-table');
  if(tDiv){
    const recent=acts.slice(-20).reverse();
    if(!recent.length){tDiv.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:12px 0;">No rides matching filters</div>';return;}
    tDiv.innerHTML='<div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>Session</th><th>Dist</th><th>Duration</th><th>Avg W</th><th>NP</th><th>HR</th><th>W:HR</th><th>Type</th><th></th></tr></thead><tbody>'+
      recent.map(a=>{
        const ec=a.be>1.4?'var(--green)':a.be>1.1?'var(--orange)':'var(--text-dim)';
        return `<tr><td style="white-space:nowrap;">${fmtDate(a.d)}</td><td style="font-size:10px;color:var(--text-dim);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${a.n}">${a.n}</td><td>${a.dk?a.dk.toFixed(0):'—'}km</td><td>${a.mm?a.mm.toFixed(0):'—'}min</td><td style="font-family:monospace;">${a.w?a.w.toFixed(0):'—'}W</td><td style="font-family:monospace;font-weight:600;">${a.nw?a.nw.toFixed(0):'—'}W</td><td>${a.hr?a.hr.toFixed(0):'—'}bpm</td><td style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:${ec};">${a.be?a.be.toFixed(2):'—'}</td><td style="font-size:10px;color:var(--text-dim);">${a.vr?'Rouvy':'Outdoor'}</td><td><button class="btn sec sml" style="font-size:9px;padding:2px 6px;" onclick="editWorkout(${a.id})">✏️</button></td></tr>`;
      }).join('')+'</tbody></table></div>';
  }
}

// ===== SWIM CHARTS =====
function renderSwimCharts() {
  const range=(document.getElementById('swf-range')||{value:'all'}).value;
  const minDistM=parseFloat((document.getElementById('swf-dist')||{value:500}).value||500);
  const acts=filterActs('Swim',{range}).filter(a=>a.sp&&(a.dk||0)*1000>=minDistM);

  // Stats summary
  const sDiv=document.getElementById('swim-stats');
  if(sDiv&&acts.length){
    const recent=acts.slice(-6);
    const avgP=a=>a.reduce((s,x)=>s+x.sp,0)/a.length;
    const rP=avgP(recent),aP=avgP(acts);
    const best=Math.min(...acts.map(a=>a.sp));
    const totalM=acts.reduce((s,a)=>s+(a.dk||0)*1000,0);
    const improve=aP>0?((aP-rP)/aP*100):0;
    sDiv.innerHTML=
      statCard('Avg Pace (recent 6)',fmtPace(rP)+'/100m',improve>0.5?`↑ ${improve.toFixed(1)}% faster than avg`:'',improve>0?'var(--green)':'var(--text)')+
      statCard('Best Session Pace',fmtPace(best)+'/100m',fmtDate(acts.find(a=>a.sp===best)?.d||''),'var(--green)')+
      statCard('Total Volume',totalM>1000?(totalM/1000).toFixed(1)+'km':Math.round(totalM)+'m',acts.length+' sessions','var(--text-mid)')+
      statCard('Latest',acts.length?fmtDate(acts[acts.length-1].d):'—',acts.length?Math.round((acts[acts.length-1].dk||0)*1000)+'m @ '+fmtPace(acts[acts.length-1].sp)+'/100m':'','var(--text-mid)');
  }

  // Pace trend
  drawTrendChart('c-swim-pace', acts, {
    getValue:a=>a.sp, color:'#2196f3', label:'min/100m', lowerIsBetter:true,
    effortDots:false, rollingN:5, H:240,
    yFmt:v=>fmtPace(Math.max(0,v)),
    refs:[{value:1.733,label:'CSS ~1:44',color:'rgba(0,230,118,0.5)'}],
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `Pace: <b style="color:#2196f3;">${fmtPace(v)}/100m</b>`,
      `Distance: ${Math.round((a.dk||0)*1000)}m  ·  ${a.mm?a.mm.toFixed(0)+'min':'—'}`,
      `HR: ${a.hr?a.hr+'bpm':'—'}  ·  <span style="font-size:10px;color:var(--text-dim);">${a.n.length>28?a.n.slice(0,28)+'…':a.n}</span>`
    ]
  });

  // HR trend
  drawTrendChart('c-swim-hr', acts.filter(a=>a.hr), {
    getValue:a=>a.hr, color:'#ef5350', label:'bpm', lowerIsBetter:true,
    effortDots:false, rollingN:5, H:240,
    yFmt:v=>Math.round(v)+'',
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `HR: <b style="color:#ef5350;">${v.toFixed(0)}bpm</b>`,
      `Pace: ${a.sp?fmtPace(a.sp)+'/100m':'—'}  ·  ${Math.round((a.dk||0)*1000)}m`
    ]
  });

  // Distance per session
  drawTrendChart('c-swim-dist', acts, {
    getValue:a=>(a.dk||0)*1000, color:'#26c6da', label:'metres', lowerIsBetter:false,
    effortDots:false, rollingN:5, H:200,
    yFmt:v=>Math.round(v/100)*100+'m',
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `Distance: <b style="color:#26c6da;">${Math.round(v)}m</b>`,
      `Pace: ${a.sp?fmtPace(a.sp)+'/100m':'—'}  ·  ${a.mm?a.mm.toFixed(0)+'min':'—'}`
    ]
  });

  // Weekly volume bars (existing logic, kept)
  const c2=setupCanvas('c-swim-vol');
  if(c2){
    const ctx=c2.getContext('2d');ctx.clearRect(0,0,c2.width,200);
    const weekMap={};
    acts.forEach(a=>{
      const d=new Date(a.d+'T12:00:00'),dow=(d.getDay()+6)%7;
      const mon=new Date(d);mon.setDate(d.getDate()-dow);
      const wk=localDateStr(mon);
      weekMap[wk]=(weekMap[wk]||0)+(a.dk||0)*1000;
    });
    const weeks=Object.keys(weekMap).sort().slice(-16);
    const vals=weeks.map(w=>weekMap[w]||0);
    if(vals.length<2){drawEmpty(ctx,c2.width,200,'Need more data');return;}
    const mx=Math.max(...vals)*1.1||1000;
    const W=c2.width,H=200,pL=50,pT=12,pR=12,pB=24,cW=W-pL-pR,cH=H-pT-pB;
    ctx.fillStyle='var(--surface2)';ctx.fillRect(0,0,W,H);
    for(let i=0;i<=4;i++){
      const y=pT+cH*(1-i/4);
      ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(pL,y);ctx.lineTo(pL+cW,y);ctx.stroke();
      ctx.fillStyle='rgba(90,112,128,0.7)';ctx.font='9px monospace';
      ctx.textAlign='right';ctx.fillText(Math.round(mx*i/4/100)*100+'m',pL-2,y+3);
    }
    ctx.textAlign='left';
    const bW=cW/weeks.length*0.65;
    const barTT=[];
    weeks.forEach((w,i)=>{
      const x=pL+cW*(i/(Math.max(weeks.length-1,1)))-bW/2;
      const h=cH*(vals[i]/mx);
      ctx.fillStyle='rgba(33,150,243,0.6)';ctx.fillRect(x,pT+cH-h,bW,h);
      ctx.strokeStyle='rgba(33,150,243,1)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x,pT+cH-h);ctx.lineTo(x+bW,pT+cH-h);ctx.stroke();
      if(i%Math.ceil(weeks.length/6)===0){
        ctx.fillStyle='rgba(90,112,128,0.6)';ctx.font='9px monospace';
        ctx.textAlign='center';ctx.fillText(w.slice(5),x+bW/2,H-4);ctx.textAlign='left';
      }
      barTT.push({cx:x+bW/2,cy:pT+cH-h/2,lines:[`wk of ${w}`,`${Math.round(vals[i])}m`]});
    });
    TT.register(c2,barTT);
  }

  // Swim table
  const tDiv=document.getElementById('swim-table');
  if(tDiv){
    const recent=acts.slice(-20).reverse();
    tDiv.innerHTML='<div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>Session</th><th>Distance</th><th>Duration</th><th>Pace</th><th>HR</th><th></th></tr></thead><tbody>'+
      recent.map(a=>{
        const pc=a.sp<1.8?'var(--green)':a.sp<2.1?'var(--orange)':'var(--text-dim)';
        return `<tr><td style="white-space:nowrap;">${fmtDate(a.d)}</td><td style="font-size:10px;color:var(--text-dim);">${a.n}</td><td>${Math.round((a.dk||0)*1000)}m</td><td>${a.mm?a.mm.toFixed(0):'—'}min</td><td style="font-family:monospace;color:${pc};">${a.sp?fmtPace(a.sp):'—'}/100m</td><td>${a.hr?a.hr.toFixed(0):'—'}bpm</td><td><button class="btn sec sml" style="font-size:9px;padding:2px 6px;" onclick="editWorkout(${a.id})">✏️</button></td></tr>`;
      }).join('')+'</tbody></table></div>';
  }
}
// ===== VOLUME CHARTS =====
function renderVolumeCharts() {
  const nWeeks=parseInt((document.getElementById('vf-weeks')||{value:12}).value||12);
  const metric=(document.getElementById('vf-metric')||{value:'hours'}).value;
  const cutoff=daysAgo(nWeeks*7);
  const acts=STRAVA_ACTS.acts.filter(a=>a.d>=cutoff);

  const getWk=d=>{
    const dt=new Date(d+'T00:00:00'), dow=dt.getDay();
    const diff=dt.getDate()-dow+(dow===0?-6:1);
    return localDateStr(new Date(new Date(d+'T12:00:00').setDate(new Date(d+'T12:00:00').getDate()-((new Date(d+'T12:00:00').getDay()+6)%7))));
  };
  const getVal=a=>{
    if(metric==='hours') return (a.mm||0)/60;
    if(metric==='sessions') return 1;
    return 0;
  };
  const fmtVal=v=>metric==='hours'?(v<10?v.toFixed(1):Math.round(v))+'h':Math.round(v)+'';
  const unit=metric==='hours'?'h':'sessions';

  const sports=['Run','Bike','Swim'];
  const colors={Run:'#00e676',Bike:'#ff9800',Swim:'#2196f3'};
  const colorsDim={Run:'rgba(0,230,118,0.6)',Bike:'rgba(255,152,0,0.6)',Swim:'rgba(33,150,243,0.6)'};

  const wkSet=new Set(acts.map(a=>getWk(a.d)));
  const weeks=[...wkSet].sort().slice(-nWeeks);
  const weekData={};
  weeks.forEach(w=>{weekData[w]={Run:0,Bike:0,Swim:0};});
  acts.forEach(a=>{
    if(!sports.includes(a.s)) return;
    const wk=getWk(a.d);
    if(weekData[wk]) weekData[wk][a.s]+=getVal(a);
  });

  const c=setupCanvas('c-volume');
  if(!c) return;
  c.height=300;
  const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,300);
  const W=c.width, H=300;
  const pL=52, pT=20, pR=16, pB=46; // more bottom space for labels
  const cW=W-pL-pR, cH=H-pT-pB;

  const totals=weeks.map(w=>sports.reduce((s,sp)=>s+weekData[w][sp],0));
  const mx=Math.max(...totals)*1.12||1;

  ctx.fillStyle='var(--surface2)'; ctx.fillRect(0,0,W,H);

  // Y axis grid + labels
  const yTicks=5;
  for(let i=0;i<=yTicks;i++){
    const frac=i/yTicks;
    const y=pT+cH*(1-frac);
    const val=mx*frac;
    ctx.strokeStyle='rgba(30,45,61,0.85)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pL,y); ctx.lineTo(pL+cW,y); ctx.stroke();
    ctx.fillStyle='rgba(90,112,128,0.75)'; ctx.font='9px monospace';
    ctx.textAlign='right';
    ctx.fillText(fmtVal(val), pL-4, y+3);
  }

  // Y axis unit label
  ctx.save(); ctx.translate(13, pT+cH/2); ctx.rotate(-Math.PI/2);
  ctx.fillStyle='rgba(90,112,128,0.6)'; ctx.font='9px monospace'; ctx.textAlign='center';
  ctx.fillText(metric==='hours'?'hours':' sessions', 0, 0);
  ctx.restore();

  // Draw bars + collect tooltip points
  const bGap=0.18; // gap fraction of slot width
  const slotW=cW/Math.max(weeks.length,1);
  const bW=slotW*(1-bGap);
  const tooltipPts=[];

  // X axis: decide label frequency based on count
  const labelEvery=weeks.length<=16?1:weeks.length<=32?2:4;

  weeks.forEach((w,i)=>{
    const slotX=pL+slotW*i;
    const barX=slotX+slotW*bGap/2;
    let base=0;

    sports.forEach(sp=>{
      const v=weekData[w][sp]; if(!v) return;
      const h=cH*(v/mx);
      const barY=pT+cH-base-h;

      // Draw segment
      ctx.fillStyle=colorsDim[sp];
      ctx.fillRect(barX, barY, bW, h);

      // Top border highlight
      ctx.fillStyle=colors[sp];
      ctx.fillRect(barX, barY, bW, Math.min(2,h));

      // Tooltip hit point at center of this segment
      const total=weekData[w].Run+weekData[w].Bike+weekData[w].Swim;
      tooltipPts.push({
        cx: barX+bW/2,
        cy: barY+h/2,
        // wider hit box — use bar x range
        barX, barW: bW, barY, barH: h,
        dotColor: colors[sp],
        lines:[
          '<span style="color:'+colors[sp]+';font-weight:700;">'+sp+'</span>',
          '<span style="font-family:monospace;font-size:13px;">'+fmtVal(v)+'</span>',
          '<span style="color:var(--text-dim);font-size:10px;">wk of '+
            new Date(w+'T00:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short'})+'</span>',
          '<span style="color:var(--text-dim);font-size:10px;">Total: '+fmtVal(total)+'</span>'
        ]
      });

      base+=h;
    });

    // X axis labels
    if(i%labelEvery===0){
      const d=new Date(w+'T00:00:00');
      const dayLabel=d.toLocaleDateString('en-AU',{day:'numeric',month:'short'});
      ctx.fillStyle='rgba(90,112,128,0.75)'; ctx.font='9px monospace';
      ctx.textAlign='center';
      ctx.fillText(dayLabel, barX+bW/2, H-28);
      // Month label on new month
      if(d.getDate()<=7){
        ctx.fillStyle='rgba(90,112,128,0.45)'; ctx.font='8px monospace';
        ctx.fillText(d.toLocaleDateString('en-AU',{month:'short',year:'2-digit'}), barX+bW/2, H-16);
      }
    }
  });

  // Average line
  const avgTotal=totals.reduce((a,b)=>a+b,0)/Math.max(totals.length,1);
  const avgY=pT+cH*(1-avgTotal/mx);
  ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(pL,avgY); ctx.lineTo(pL+cW,avgY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='8px monospace'; ctx.textAlign='left';
  ctx.fillText('avg '+fmtVal(avgTotal), pL+4, avgY-3);

  // Register bar-aware tooltip (snap to bar not just dot)
  const barTT = {
    register(canvas, pts) {
      if(!canvas||!pts.length) return;
      canvas.style.cursor='crosshair';
      if(TT._overlays.has(canvas)){
        const old=TT._overlays.get(canvas);
        if(old.parentElement) old.parentElement.removeChild(old);
        TT._overlays.delete(canvas);
      }
      const show=(clientX,clientY)=>{
        const el=TT._getEl(); if(!el) return;
        const rect=canvas.getBoundingClientRect();
        const scaleX=canvas.width/rect.width;
        const scaleY=canvas.height/rect.height;
        const mx=(clientX-rect.left)*scaleX;
        const my=(clientY-rect.top)*scaleY;
        // Find which bar segment the mouse is inside
        let hit=null;
        for(let p of pts){
          if(mx>=p.barX&&mx<=p.barX+p.barW&&my>=p.barY&&my<=p.barY+p.barH){hit=p;break;}
        }
        // If not inside a bar, find closest bar column
        if(!hit){
          let minDx=999;
          pts.forEach(p=>{const dx=Math.abs(mx-(p.barX+p.barW/2));if(dx<minDx&&dx<slotW*0.6){minDx=dx;hit=p;}});
        }
        const ov=TT._getOverlay(canvas);
        ov.width=canvas.width;
        if(hit){
          const ovCtx=ov.getContext('2d');
          // Highlight column
          ovCtx.fillStyle='rgba(255,255,255,0.06)';
          ovCtx.fillRect(hit.barX,pT,hit.barW,cH);
          // Highlight segment
          ovCtx.strokeStyle=hit.dotColor;
          ovCtx.lineWidth=1.5;
          ovCtx.strokeRect(hit.barX,hit.barY,hit.barW,hit.barH);

          el.innerHTML=hit.lines.join('<br>');
          el.style.display='block';
          let tx=clientX+16, ty=clientY-12;
          const tw=el.offsetWidth||160, th=el.offsetHeight||80;
          if(tx+tw>window.innerWidth-8) tx=clientX-tw-16;
          if(ty<8) ty=clientY+16;
          if(ty+th>window.innerHeight-8) ty=window.innerHeight-th-8;
          el.style.left=tx+'px'; el.style.top=ty+'px';
        } else {
          el.style.display='none';
        }
      };
      canvas.onmousemove=(e)=>show(e.clientX,e.clientY);
      canvas.onmouseleave=()=>{const el=TT._getEl();if(el)el.style.display='none';const ov=TT._overlays.get(canvas);if(ov)ov.width=canvas.width;};
      canvas.ontouchmove=(e)=>{e.preventDefault();show(e.touches[0].clientX,e.touches[0].clientY);};
      canvas.ontouchend=()=>{const el=TT._getEl();if(el)el.style.display='none';};
    }
  };
  barTT.register(c, tooltipPts);

  // Legend with totals
  const leg=document.getElementById('vol-legend');
  if(leg){
    const spTotals={};
    sports.forEach(sp=>{ spTotals[sp]=acts.filter(a=>a.s===sp).reduce((s,a)=>s+getVal(a),0); });
    leg.innerHTML=sports.map(sp=>`
      <div style="display:flex;align-items:center;gap:6px;background:var(--surface2);border-radius:6px;padding:5px 10px;">
        <span style="width:10px;height:10px;background:${colors[sp]};border-radius:2px;display:inline-block;"></span>
        <span style="font-size:11px;">${sp}</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:${colors[sp]};">${fmtVal(spTotals[sp])}</span>
        <span style="font-size:10px;color:var(--text-dim);">total</span>
      </div>`).join('');
  }

  const sumDiv=document.getElementById('vol-summary');
  if(sumDiv){
    const totalRunKm=acts.filter(a=>a.s==='Run').reduce((s,a)=>s+(a.dk||0),0);
    const totalBikeH=acts.filter(a=>a.s==='Bike').reduce((s,a)=>s+(a.mm||0)/60,0);
    const totalSwimM=acts.filter(a=>a.s==='Swim').reduce((s,a)=>s+(a.dk||0)*1000,0);
    const totalH=acts.reduce((s,a)=>s+(a.mm||0)/60,0);
    sumDiv.innerHTML=`<div class="g4" style="gap:10px;">
      <div class="csm" style="text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--green);">${totalRunKm.toFixed(0)}</div><div style="font-size:10px;color:var(--text-dim);">Run km</div></div>
      <div class="csm" style="text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--orange);">${totalBikeH.toFixed(0)}</div><div style="font-size:10px;color:var(--text-dim);">Bike hrs</div></div>
      <div class="csm" style="text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--blue);">${(totalSwimM/1000).toFixed(1)}</div><div style="font-size:10px;color:var(--text-dim);">Swim km</div></div>
      <div class="csm" style="text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:28px;">${totalH.toFixed(0)}</div><div style="font-size:10px;color:var(--text-dim);">Total hrs</div></div>
    </div>`;
  }
}

// ===== AUTO PBs =====
function renderAutoPBs() {
  const pbs=STRAVA_ACTS.pbs;
  const fmtPB=(items,elId)=>{
    const div=document.getElementById(elId); if(!div) return;
    const rows=items.filter(([k])=>pbs[k]);
    if(!rows.length){div.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">No data</div>';return;}
    div.innerHTML=rows.map(([k,desc])=>{
      const pb=pbs[k];
      return `<div class="pb-row">
        <div><div style="font-size:12px;font-weight:600;">${k}</div><div style="font-size:10px;color:var(--text-dim);">${desc}</div></div>
        <div style="text-align:right;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--blue);">${pb.v}</div>
          <div style="font-size:10px;color:var(--text-dim);">${fmtDate(pb.date)}${pb.hr?' · '+pb.hr.toFixed(0)+'bpm':''}</div>
        </div>
      </div>`;
    }).join('');
  };
  fmtPB([
    ['Run 5km','Best continuous 5km'],
    ['Run 10km','Best continuous 10km'],
    ['Run 15km','Best continuous 15km'],
    ['Run Half Marathon','Best half marathon effort'],
    ['Run Marathon','Best marathon effort'],
    ['Run Best Z2','Most efficient Z2 session'],
    ['Run Longest','Longest run ever']
  ],'apb-run');
  fmtPB([
    ['Bike 45min Power','Best 45min NP'],
    ['Bike 60min Power','Best 60min NP'],
    ['Bike 90min Power','Best 90min NP'],
    ['Bike Best NP (Rouvy)','All-time best NP (Rouvy)'],
    ['Bike Longest Outdoor','Longest outdoor ride']
  ],'apb-bike');
  fmtPB([
    ['Swim 1000m','Best 1000m session pace'],
    ['Swim 1500m','Best 1500m session pace'],
    ['Swim 2000m','Best 2000m session pace'],
    ['Swim 2500m','Best 2500m session pace'],
    ['Swim 3000m+','Best 3000m+ session pace'],
    ['Swim Best Session Pace','Overall best session pace']
  ],'apb-swim');
  const iDiv=document.getElementById('apb-intervals');
  if(iDiv) {
    // Show Run interval avg PBs from strava pbs + live data
  const ivs=filterActs('Run',{range:'all'}).filter(a=>a.iv&&a.p).sort((a,b)=>a.p-b.p).slice(0,10);
  // Also show the detected interval PBs at top
  const ivPBKeys = Object.keys(STRAVA_ACTS.pbs).filter(k=>k.includes('interval avg'));
    if(!ivs.length){iDiv.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">No data</div>';return;}
    iDiv.innerHTML='<div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>Session</th><th>Avg Pace</th><th>HR</th><th>Dist</th></tr></thead><tbody>'+
      ivs.map(a=>`<tr>
        <td style="white-space:nowrap;">${fmtDate(a.d)}</td>
        <td style="font-size:10px;color:var(--text-dim);">${a.n}</td>
        <td style="font-family:monospace;color:var(--red);">${fmtPace(a.p)}/km</td>
        <td>${a.hr?a.hr.toFixed(0):'—'}bpm</td>
        <td>${a.dk?a.dk.toFixed(1):'—'}km</td>
      </tr>`).join('')+'</tbody></table></div>';
  }
}



// ===== SUPPLEMENTS =====
let supplementTaken = null; // true=yes, false=no, null=not set

function setSupplement(val) {
  supplementTaken = val;
  const yes = document.getElementById('cb-supp-yes');
  const no  = document.getElementById('cb-supp-no');
  const wrap = document.getElementById('supp-note-wrap');
  if(yes) yes.className = 'check-box' + (val===true  ? ' checked' : '');
  if(no)  no.className  = 'check-box' + (val===false ? ' checked' : '');
  if(no && val===false) no.style.borderColor = 'var(--red)';
  else if(no) no.style.borderColor = 'rgba(244,67,54,.25)';
  if(wrap) wrap.style.display = val===true ? 'block' : 'none';
}



// ===================================================================
// RACE PREDICTOR ENGINE — integrated into Performance tab
// Updates automatically after every Strava sync
// ===================================================================

const RACE_DISTANCES = {
  sprint:  {swim:0.75,  bike:20,   run:5,    t1:2.5, t2:1.5, label:'Sprint',         emoji:'⚡'},
  olympic: {swim:1.5,   bike:40,   run:10,   t1:3,   t2:2,   label:'Olympic',        emoji:'🥇'},
  '70.3':  {swim:1.9,   bike:90,   run:21.1, t1:4,   t2:2.5, label:'Half Iron 70.3', emoji:'🏅'},
  ironman: {swim:3.8,   bike:180,  run:42.2, t1:6,   t2:4,   label:'Full Ironman',   emoji:'🔱'}
};

// Dual-component model (Banister 1991): CTL + ATL → TSB
function buildDualComponentModel(acts, signalFn) {
  if(!acts||!acts.length) return {ctl:0,atl:0,tsb:0,history:[]};
  const CTL_K=1-Math.exp(-1/42), ATL_K=1-Math.exp(-1/7);
  const sigMap={};
  acts.forEach(a=>{ const s=signalFn(a); if(s>0){ sigMap[a.d]=(sigMap[a.d]||0)+s; } });
  const today=new Date(); today.setHours(0,0,0,0);
  const allDates=Object.keys(sigMap).sort();
  if(!allDates.length) return {ctl:0,atl:0,tsb:0,history:[]};
  let ctl=0, atl=0;
  const history=[];
  const d=new Date(allDates[0]+'T00:00:00');
  while(d<=today){
    const key=localDateStr(d), sig=sigMap[key]||0;
    ctl=ctl+CTL_K*(sig-ctl); atl=atl+ATL_K*(sig-atl);
    history.push({date:key,ctl,atl,tsb:ctl-atl,sig});
    d.setDate(d.getDate()+1);
  }
  return {ctl,atl,tsb:ctl-atl,history};
}

function _getLTHR() {
  const items=(D.pbs?.phys||[]).concat(D.pbs?.run||[]);
  for(const i of items){ if(i.n&&i.n.toLowerCase().includes('lthr')){ const m=String(i.v||'').match(/(\d+)/); if(m)return parseInt(m[1]); } }
  return 181;
}

function buildRunModel_pred() {
  const lthr=_getLTHR();
  const runs=filterActs('Run',{range:'all',minDist:2}).filter(a=>a.p&&a.p>0);
  const model=buildDualComponentModel(runs,a=>{
    const speed=1000/a.p;
    const hrR=a.hr&&lthr>0?Math.min(a.hr/lthr,1.15):1.0;
    const ae=a.hr&&lthr>0?speed/(a.hr*hrR):speed/150;
    const vol=Math.min(Math.sqrt((a.dk||5)/10),1.5);
    let ef=a.iv?1.25:a.ef==='hard'||a.ef==='max'?1.1:a.ef==='easy'?0.9:1.0;
    return ae*vol*ef;
  });

  // Anchor threshold to real PBs — priority order:
  // 1) LTHR run pace (most accurate aerobic threshold)
  // 2) Half marathon PB (race-proven)
  // 3) Best recent interval pace + fatigue factor
  // 4) CTL formula as last resort (capped to realistic range)
  let threshold = null;

  // 1) LTHR pace from PBs
  const lthrPb = (D.pbs?.run||[]).find(p=>p.n&&p.n.toLowerCase().includes('lthr'));
  if(lthrPb&&lthrPb.note){ const m=lthrPb.note.match(/(\d+\.\d+|\d+):(\d{2})\/km/); if(m) threshold=parseFloat(m[1])+parseFloat(m[2])/60; }
  if(!threshold&&lthrPb&&lthrPb.v){ const m=String(lthrPb.v).match(/(\d+\.\d+|\d+):(\d{2})\/km/); if(m) threshold=parseFloat(m[1])+parseFloat(m[2])/60; }

  // 2) Half marathon PB → threshold is ~HM pace * 0.98 (HM is ~lactate threshold effort)
  if(!threshold){
    const hmPb=(D.pbs?.run||[]).find(p=>p.n&&p.n.includes('Half'));
    if(hmPb&&hmPb.v){ const s=_parseTime(hmPb.v); if(s){ threshold=(s/60/21.1)*0.98; } }
  }

  // 3) Best interval pace from Strava (intervals flagged as iv:true) + 8% fatigue buffer
  if(!threshold){
    const ivRuns=runs.filter(a=>a.iv&&a.p>0&&a.dk>=3);
    if(ivRuns.length){ const bestIv=Math.min(...ivRuns.map(a=>a.p)); threshold=bestIv*1.08; }
  }

  // 4) CTL formula capped to [3.8, 6.5] min/km (realistic triathlete range)
  if(!threshold){ threshold=Math.max(3.8,Math.min(6.5,7.0-model.ctl*10)); }

  // VDOT from threshold (Jack Daniels approximation)
  const vdot = threshold>0 ? Math.round(Math.min(70,Math.max(25, 85-(threshold*8)))) : 40;

  return {...model,lthr,threshold,vdot,runs};
}

function buildBikeModel_pred() {
  const lthr=_getLTHR();
  const bikes=filterActs('Bike',{range:'all',minDur:15}).filter(a=>(a.nw||a.w||a.dk));
  const model=buildDualComponentModel(bikes,a=>{
    const watts=a.nw||a.w; let eff;
    if(watts&&watts>0){
      const hrR=a.hr&&lthr>0?Math.min(a.hr/lthr,1.1):1.0;
      eff=(watts/(a.hr||150)/hrR)*(a.nw&&a.w&&a.nw>a.w?1+(a.nw-a.w)/a.w*0.3:1);
    } else if(a.dk&&a.mm){ eff=(a.dk/a.mm*60)/((a.hr||150)*1.5); }
    else return 0;
    return eff*Math.min(Math.sqrt((a.mm||30)/60/1.5),1.6)*(a.ef==='hard'||a.ef==='max'?1.1:a.ef==='easy'?0.85:1.0);
  });

  // Anchor FTP to real PBs — NEVER let CTL formula exceed what power data shows
  // Your power curve: 10min=283W, 20min=248W, 1hr=232W → FTP ~230W
  let ftpFromPbs = null;

  // 1) Explicit FTP PB
  const ftpPb=(D.pbs?.phys||[]).concat(D.pbs?.bike||[]).find(p=>p.n&&p.n.toLowerCase().includes('ftp'));
  if(ftpPb&&ftpPb.v){ const m=String(ftpPb.v).match(/(\d+)/); if(m) ftpFromPbs=parseInt(m[1]); }

  // 2) Derive from 20min power PB (FTP = 20min * 0.95)
  if(!ftpFromPbs){
    const pb20=(D.pbs?.bike||[]).find(p=>p.n&&p.n.includes('20 min'));
    if(pb20&&pb20.v){ const m=String(pb20.v).match(/(\d+)/); if(m) ftpFromPbs=Math.round(parseInt(m[1])*0.95); }
  }

  // 3) Derive from 60min power PB (FTP ≈ 60min power)
  if(!ftpFromPbs){
    const pb60=(D.pbs?.bike||[]).find(p=>p.n&&(p.n.includes('1 hr')||p.n.includes('60')));
    if(pb60&&pb60.v){ const m=String(pb60.v).match(/(\d+)/); if(m) ftpFromPbs=parseInt(m[1]); }
  }

  // 4) CTL formula — HARD CAP at 300W (no fantasy numbers)
  const ftpFromCtl = Math.min(300, Math.max(100, 80+model.ctl*400));

  // Use PB-derived FTP if available, else CTL estimate. Never exceed 110% of PB.
  let ftp = ftpFromPbs ? ftpFromPbs : ftpFromCtl;
  if(ftpFromPbs) ftp = Math.min(ftp, ftpFromPbs * 1.05); // allow tiny 5% CTL boost max

  // Rouvy power-speed model (log regression)
  const rouvy=bikes.filter(a=>a.vr&&(a.nw||a.w)&&a.dk&&a.mm);
  let speedModel={type:'default'};
  if(rouvy.length>=3){
    const pts=rouvy.map(a=>({pw:a.nw||a.w,spd:(a.dk/a.mm)*60})).filter(p=>p.pw>0&&p.spd>5);
    if(pts.length>=3){
      const lnX=pts.map(p=>Math.log(p.pw)),lnY=pts.map(p=>Math.log(p.spd)),n=pts.length;
      const sx=lnX.reduce((a,b)=>a+b,0),sy=lnY.reduce((a,b)=>a+b,0);
      const sxy=lnX.reduce((s,x,i)=>s+x*lnY[i],0),sx2=lnX.reduce((s,x)=>s+x*x,0);
      const bv=(n*sxy-sx*sy)/(n*sx2-sx*sx),av=Math.exp((sy-bv*sx)/n);
      speedModel={type:'rouvy',a:av,b:bv,sessions:pts.length};
    }
  }
  return {...model,ftp,speedModel,bikes};
}

function buildSwimModel_pred() {
  const swims=filterActs('Swim',{range:'all'}).filter(a=>a.sp&&a.sp>0&&(a.dk||0)*1000>=300);
  const model=buildDualComponentModel(swims,a=>{
    const q=2.167/a.sp, dist=Math.min(Math.sqrt((a.dk||0)*1000/1500),1.5);
    return q*dist*(a.ef==='hard'||a.ef==='max'?1.15:a.ef==='easy'?0.9:1.0);
  });

  // Anchor CSS to real PBs — priority order:
  // 1) Explicit CSS PB (most accurate)
  // 2) Best 500m PB + CSS estimation (CSS ≈ 500m pace + ~4s/100m)
  // 3) Best long swim pace * 1.02
  // 4) CTL formula capped to realistic range [1:30-2:30/100m]
  let css = null;

  // 1) Explicit CSS PB
  const cssPb=(D.pbs?.swim||[]).concat(D.pbs?.phys||[]).find(p=>p.n&&p.n.toLowerCase().includes('css'));
  if(cssPb&&cssPb.v){
    const raw=String(cssPb.v).replace('~','').trim();
    const m=raw.match(/(\d+):(\d+)/); if(m) css=parseInt(m[1])+parseInt(m[2])/60;
  }

  // 2) 500m PB → CSS = 500m pace + ~4s/100m (CSS is slightly slower than 500m best)
  if(!css){
    const pb500=(D.pbs?.swim||[]).find(p=>p.n&&p.n.includes('500'));
    if(pb500&&pb500.v){ const m=String(pb500.v).match(/(\d+):(\d+)/); if(m){ const pace500=parseInt(m[1])+parseInt(m[2])/60; css=pace500+(4/60); } }
  }

  // 3) Best long swim pace (1000m+) * 1.02 buffer
  if(!css){
    const longSwims=swims.filter(a=>(a.dk||0)*1000>=1000&&a.sp);
    if(longSwims.length){ css=Math.min(...longSwims.map(a=>a.sp))*1.02; }
  }

  // 4) CTL formula — capped to [1:30, 2:30] per 100m (realistic range)
  if(!css){ css=Math.max(1.5,Math.min(2.5,2.4-model.ctl*1.5)); }

  // Hard sanity cap: CSS cannot be faster than best 500m pace
  const pb500=(D.pbs?.swim||[]).find(p=>p.n&&p.n.includes('500'));
  if(pb500&&pb500.v){ const m=String(pb500.v).match(/(\d+):(\d+)/); if(m){ const pace500=parseInt(m[1])+parseInt(m[2])/60; css=Math.max(css,pace500); } }

  return {...model,css,swims};
}

function _parseTime(s) {
  s=String(s||'').trim();
  let m=s.match(/^(\d+):(\d{2}):(\d{2})$/); if(m) return parseInt(m[1])*3600+parseInt(m[2])*60+parseInt(m[3]);
  m=s.match(/^(\d+):(\d{2})$/); if(m) return parseInt(m[1])*60+parseInt(m[2]);
  return null;
}
function _fmtHMS(mins) {
  if(!mins||isNaN(mins)||mins<=0) return '—';
  const h=Math.floor(mins/60),m=Math.floor(mins%60),s=Math.round((mins-Math.floor(mins))*60);
  if(h>0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}
function _fmtSwimP(v) { if(!v||isNaN(v))return '—'; return fmtPace(v)+'/100m'; }
function _fmtRunP(v)  { if(!v||isNaN(v))return '—'; return fmtPace(v)+'/km'; }
function _bikeSpd(power, speedModel) {
  if(speedModel.type==='rouvy') return speedModel.a*Math.pow(power,speedModel.b);
  return Math.pow(power/0.00257,1/3);
}

function _calcPrediction(dk, R, B, S) {
  const distKey = Object.keys(RACE_DISTANCES).find(k=>RACE_DISTANCES[k]===dk)||'70.3';
  const intPct  = {sprint:0.85,olympic:0.82,'70.3':0.75,ironman:0.70}[distKey]||0.75;
  const fatMult = {sprint:1.08,olympic:1.10,'70.3':1.13,ironman:1.18}[distKey]||1.13;
  const swimP   = S.css*1.06;
  const swimMins= (dk.swim*1000/100)*swimP;
  const raceW   = B.ftp*intPct;
  const spd     = Math.max(22,Math.min(50,_bikeSpd(raceW,B.speedModel)));
  const bikeMins= (dk.bike/spd)*60;
  let runP = R.threshold*fatMult;
  if(distKey==='ironman') runP*=Math.pow(42.2/21.1,0.06);
  runP=Math.max(3.2,Math.min(9.0,runP));
  const runMins = dk.run*runP;
  const total   = swimMins+bikeMins+runMins+dk.t1+dk.t2;
  const conf    = Math.min(R.runs.length/30,1)*0.35+Math.min(B.bikes.length/20,1)*0.40+Math.min(S.swims.length/10,1)*0.25;
  return {swimMins,bikeMins,runMins,t1:dk.t1,t2:dk.t2,total,swimP,bikeSpd:spd,runP,raceW:Math.round(raceW),conf,distKey};
}

// FIX #2: Called on every Strava sync via mergeStravaActivities + when tab selected
function renderRacePredictor() {
  const container=document.getElementById('pv-predictor');
  if(!container) return;
  const acts=STRAVA_ACTS.acts||[];
  if(acts.length<5){
    container.innerHTML=`<div class="card" style="text-align:center;padding:48px 24px;">
      <div style="font-size:48px;margin-bottom:16px;">📡</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;margin-bottom:8px;">NO TRAINING DATA YET</div>
      <div style="font-size:12px;color:var(--text-dim);line-height:1.8;">Sync your Strava activities first.<br>The predictor needs at least 5 sessions.</div>
    </div>`;
    return;
  }

  const R=buildRunModel_pred(), B=buildBikeModel_pred(), S=buildSwimModel_pred();
  const preds={};
  Object.entries(RACE_DISTANCES).forEach(([k,d])=>{ preds[k]=_calcPrediction(d,R,B,S); });

  // Save monthly snapshot for history
  if(!D.racePredHistory) D.racePredHistory=[];
  const today=localDateStr(new Date()),thisMonth=today.slice(0,7);
  const snap={month:thisMonth,date:today,'70.3':preds['70.3']?{total:preds['70.3'].total,swim:preds['70.3'].swimMins,bike:preds['70.3'].bikeMins,run:preds['70.3'].runMins}:null};
  const ei=D.racePredHistory.findIndex(h=>h.month===thisMonth);
  if(ei>=0) D.racePredHistory[ei]=snap; else D.racePredHistory.push(snap);
  D.racePredHistory.sort((a,b)=>a.month.localeCompare(b.month));
  if(D.racePredHistory.length>24) D.racePredHistory=D.racePredHistory.slice(-24);
  save();

  const nR=R.runs.length, nB=B.bikes.length, nS=S.swims.length;

  container.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px;color:var(--green);">🎯 RACE TIME PREDICTOR</div>
        <div style="font-size:11px;color:var(--text-dim);">${acts.length} total activities · ${nR} runs · ${nB} bikes · ${nS} swims · auto-updates on every sync</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn sec sml" onclick="showPredHistory()">📈 Monthly History</button>
        <button class="btn sec sml" onclick="showPredSignals()">🔬 Signal Debug</button>
      </div>
    </div>

    <!-- Signal health cards -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
      ${[['🏃','Run',R,nR,`VDOT ~${Math.round(R.vdot)} · Threshold ${_fmtRunP(R.threshold)}`],
         ['🚴','Bike',B,nB,`FTP ~${Math.round(B.ftp)}W`],
         ['🏊','Swim',S,nS,`CSS ~${_fmtSwimP(S.css)}`]].map(([em,sp,m,n,det])=>{
        const tsb=m.tsb, hl=tsb>10?{c:'#26c6da',l:'Fresh'}:tsb>-5?{c:'var(--green)',l:'Training'}:tsb>-20?{c:'var(--orange)',l:'Tired'}:{c:'var(--red)',l:'Fatigued'};
        const pct=Math.min(Math.round(m.ctl*200),100);
        return `<div style="background:var(--surface2);border-radius:8px;padding:12px;position:relative;overflow:hidden;border:1px solid var(--border);">
          <div style="position:absolute;bottom:0;left:0;height:3px;width:${pct}%;background:${hl.c};border-radius:0 0 0 8px;transition:width .6s;"></div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <span style="font-size:22px;">${em}</span>
            <span style="font-size:9px;padding:2px 8px;border-radius:10px;background:${hl.c}22;color:${hl.c};font-weight:700;letter-spacing:1px;">${hl.l}</span>
          </div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:2px;">${sp.toUpperCase()}</div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:2px;">${n} sessions · CTL ${(m.ctl*100).toFixed(1)}</div>
          <div style="font-size:9px;color:var(--text-mid);margin-top:3px;">${det}</div>
        </div>`;
      }).join('')}
    </div>

    <!-- Distance selector tabs -->
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:12px;">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);" id="pred-tab-row">
        ${Object.entries(RACE_DISTANCES).map(([k,d],i)=>`
          <button id="ptab-${k}" onclick="selectPredTab('${k}')"
            style="padding:10px 6px;background:${i===2?'var(--surface2)':'none'};border:none;border-right:1px solid var(--border);
            color:${i===2?'var(--green)':'var(--text-dim)'};cursor:pointer;font-family:'DM Sans',sans-serif;
            font-size:11px;font-weight:${i===2?'700':'400'};transition:all .15s;">
            <div style="font-size:18px;margin-bottom:2px;">${d.emoji}</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:1px;">${d.label.toUpperCase()}</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--green);margin-top:3px;">${_fmtHMS(preds[k].total)}</div>
          </button>`).join('')}
      </div>
      <div id="pred-detail" style="padding:20px;">
        ${_renderDetail('70.3',preds['70.3'],RACE_DISTANCES['70.3'],R,B,S)}
      </div>
    </div>

    <!-- CTL Trend -->
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="sl" style="margin:0;">FITNESS TREND — 26 WEEKS (CTL per sport)</div>
        <div style="display:flex;gap:12px;font-size:10px;">
          <span style="color:#00e676;">● Run</span><span style="color:#ff9800;">● Bike</span><span style="color:#2196f3;">● Swim</span>
        </div>
      </div>
      <canvas id="c-pred-ctl" height="180" style="width:100%;display:block;"></canvas>
    </div>

    <!-- Improvement levers -->
    <div class="card" style="margin-bottom:12px;">
      <div class="sl">WHAT MOVES YOUR 70.3 TIME MOST</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
        ${[['🏊','CSS –3s/100m','~'+Math.round(preds['70.3'].swimMins*0.03)+'min swim gain','Add weekly 1500m+ CSS pool sets','#2196f3'],
           ['🚴','FTP +10W','~'+Math.round(preds['70.3'].bikeMins*0.04)+'min bike gain','2× threshold intervals/week (Norwegian method)','#ff9800'],
           ['🏃','Threshold –5s/km','~'+Math.round(preds['70.3'].runMins*0.04)+'min run gain','Weekly tempo run at threshold pace','#00e676'],
           ['😴','Race Taper (TSB+15)','2–4% total time','Reduce volume 10–14 days out from race','#ce93d8']].map(([em,title,gain,tip,col])=>`
          <div style="background:var(--surface2);border-radius:8px;padding:10px 14px;border-left:3px solid ${col};">
            <div style="font-size:12px;font-weight:600;margin-bottom:3px;">${em} ${title}</div>
            <div style="font-size:13px;font-weight:700;color:${col};margin-bottom:4px;">${gain}</div>
            <div style="font-size:10px;color:var(--text-dim);line-height:1.4;">${tip}</div>
          </div>`).join('')}
      </div>
    </div>

    <div id="pred-warnings">${_renderPredWarnings(nR,nB,nS,R,B,S)}</div>
    <div id="pred-extra"></div>
  `;

  window._predState={preds,R,B,S};
  setTimeout(()=>_renderCTLChart(R,B,S),80);
}

function _renderDetail(distKey,pred,dist,R,B,S) {
  if(!pred) return '';
  const conf=Math.round(pred.conf*100);
  const rng=Math.max(3,Math.round((1-pred.conf)*12));
  const splits=[
    ['🏊','Swim',pred.swimMins,`${dist.swim*1000}m @ ${_fmtSwimP(pred.swimP)}`,'#2196f3'],
    ['⟳','T1',pred.t1,'Transition','rgba(255,255,255,0.3)'],
    ['🚴','Bike',pred.bikeMins,`${dist.bike}km @ ${pred.bikeSpd.toFixed(1)}km/h (${pred.raceW}W)`,'#ff9800'],
    ['⟳','T2',pred.t2,'Transition','rgba(255,255,255,0.3)'],
    ['🏃','Run',pred.runMins,`${dist.run}km @ ${_fmtRunP(pred.runP)}`,'#00e676']
  ];
  const total=pred.swimMins+pred.bikeMins+pred.runMins;
  const [sp,bp,rp2]=[Math.round(pred.swimMins/total*100),Math.round(pred.bikeMins/total*100),0].map((v,i,a)=>i===2?100-a[0]-a[1]:v);
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">
    <div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--green);line-height:1;letter-spacing:2px;">${_fmtHMS(pred.total)}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:14px;">${dist.label} · ±${rng}% range: ${_fmtHMS(pred.total*(1-rng/100))} – ${_fmtHMS(pred.total*(1+rng/100))}</div>
      ${splits.map(([em,lbl,t,sub,col])=>`
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:15px;width:22px;text-align:center;">${em}</span>
          <div style="flex:1;"><div style="font-size:12px;font-weight:600;">${lbl}</div><div style="font-size:10px;color:var(--text-dim);">${sub}</div></div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${col};">${_fmtHMS(t)}</div>
        </div>`).join('')}
    </div>
    <div>
      <div style="margin-bottom:14px;">
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:5px;">Time distribution</div>
        <div style="display:flex;height:20px;border-radius:4px;overflow:hidden;gap:1px;">
          <div style="flex:${sp};background:#2196f3;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;">${sp}%</div>
          <div style="flex:${bp};background:#ff9800;display:flex;align-items:center;justify-content:center;font-size:9px;color:#000;font-weight:700;">${bp}%</div>
          <div style="flex:${rp2};background:#00e676;display:flex;align-items:center;justify-content:center;font-size:9px;color:#000;font-weight:700;">${rp2}%</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:4px;font-size:9px;color:var(--text-dim);"><span style="color:#2196f3;">■ Swim</span><span style="color:#ff9800;">■ Bike</span><span style="color:#00e676;">■ Run</span></div>
      </div>
      <div style="background:var(--surface2);border-radius:8px;padding:12px;margin-bottom:10px;">
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:6px;">Prediction confidence</div>
        <div style="height:5px;background:var(--border);border-radius:3px;margin-bottom:6px;"><div style="height:100%;width:${conf}%;background:${conf>70?'var(--green)':conf>40?'var(--orange)':'var(--red)'};border-radius:3px;"></div></div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:${conf>70?'var(--green)':conf>40?'var(--orange)':'var(--red)'};">${conf}%</div>
        <div style="font-size:10px;color:var(--text-dim);">${conf>70?'High — solid data coverage':conf>40?'Medium — more sessions improve accuracy':'Low — needs more training history'}</div>
      </div>
      <div style="background:var(--surface2);border-radius:8px;padding:12px;font-size:11px;line-height:2;">
        <div>FTP est: <b style="color:var(--orange);">${Math.round(B.ftp)}W</b></div>
        <div>CSS est: <b style="color:#2196f3;">${_fmtSwimP(S.css)}</b></div>
        <div>Run thr: <b style="color:var(--green);">${_fmtRunP(R.threshold)}</b></div>
        <div>LTHR: <b>${R.lthr}bpm</b> · Form (TSB): <b style="color:${R.tsb>0?'var(--green)':'var(--orange)'}">${(R.tsb*100).toFixed(0)}</b></div>
      </div>
    </div>
  </div>`;
}

function selectPredTab(distKey) {
  if(!window._predState) return;
  const {preds,R,B,S}=window._predState;
  Object.keys(RACE_DISTANCES).forEach(k=>{
    const btn=document.getElementById('ptab-'+k); if(!btn) return;
    btn.style.background=k===distKey?'var(--surface2)':'none';
    btn.style.color=k===distKey?'var(--green)':'var(--text-dim)';
    btn.style.fontWeight=k===distKey?'700':'400';
  });
  const panel=document.getElementById('pred-detail');
  if(panel) panel.innerHTML=_renderDetail(distKey,preds[distKey],RACE_DISTANCES[distKey],R,B,S);
}

function _renderPredWarnings(nR,nB,nS,R,B,S) {
  const warns=[];
  if(nS<5) warns.push({lv:'warn',msg:`⚠ Only ${nS} swim sessions — swim prediction is estimated. Add pool sessions with auto-lap.`});
  if(!B.bikes.some(a=>a.nw||a.w)) warns.push({lv:'info',msg:'ℹ No power data in bike activities — FTP estimated from W:HR. Rouvy sessions with power data improve this significantly.'});
  if(R.lthr===181) warns.push({lv:'info',msg:'ℹ LTHR using default 181bpm. Update in PBs → Physiology for better HR zone calibration.'});
  if(!R.runs.filter(a=>a.d>=daysAgo(21)).length) warns.push({lv:'warn',msg:'⚠ No runs in last 21 days — run fitness decay is factored in.'});
  if(!warns.length) return '';
  return '<div style="margin-top:8px;">'+warns.map(w=>`<div style="background:${w.lv==='warn'?'var(--orange-dim)':'var(--blue-glow)'};border:1px solid ${w.lv==='warn'?'rgba(255,152,0,.3)':'rgba(33,150,243,.2)'};border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:11px;color:${w.lv==='warn'?'var(--orange)':'var(--text-mid)'};">${w.msg}</div>`).join('')+'</div>';
}

function _renderCTLChart(R,B,S) {
  const c=document.getElementById('c-pred-ctl'); if(!c) return;
  const W=c.parentElement.clientWidth-32; c.width=W>100?W:300; c.height=180;
  const H=180, ctx=c.getContext('2d'); ctx.clearRect(0,0,W,H);
  const weeks=26, today=new Date(), labels=[], rCTL=[], bCTL=[], sCTL=[];
  for(let i=weeks-1;i>=0;i--){
    const d=new Date(today); d.setDate(d.getDate()-i*7);
    const key=localDateStr(d); labels.push(key);
    const rE=R.history.slice().reverse().find(h=>h.date<=key)||{ctl:0};
    const bE=B.history.slice().reverse().find(h=>h.date<=key)||{ctl:0};
    const sE=S.history.slice().reverse().find(h=>h.date<=key)||{ctl:0};
    rCTL.push(rE.ctl*100); bCTL.push(bE.ctl*100); sCTL.push(sE.ctl*100);
  }
  const all=[...rCTL,...bCTL,...sCTL].filter(v=>v>0);
  if(!all.length){const ctx2=c.getContext('2d');ctx2.fillStyle='var(--surface2)';ctx2.fillRect(0,0,W,H);return;}
  const yMax=Math.max(...all)*1.2||1, pL=44, pT=16, pR=16, pB=24;
  const cW=W-pL-pR, cH=H-pT-pB;
  ctx.fillStyle='var(--surface2)'; ctx.fillRect(0,0,W,H);
  for(let i=0;i<=3;i++){const y=pT+cH*(1-i/3);ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pL,y);ctx.lineTo(pL+cW,y);ctx.stroke();ctx.fillStyle='rgba(90,112,128,0.7)';ctx.font='9px DM Mono,monospace';ctx.textAlign='right';ctx.fillText((yMax*i/3).toFixed(0),pL-3,y+3);}
  ctx.textAlign='left';
  const xOf=i=>pL+cW*(i/Math.max(labels.length-1,1));
  const yOf=v=>pT+cH*(1-v/yMax);
  [{d:rCTL,c:'#00e676',l:'Run'},{d:bCTL,c:'#ff9800',l:'Bike'},{d:sCTL,c:'#2196f3',l:'Swim'}].forEach(sp=>{
    if(!sp.d.some(v=>v>0)) return;
    // Gradient fill
    const [sr,sg,sb]=sp.c.startsWith('#')?[parseInt(sp.c.slice(1,3),16),parseInt(sp.c.slice(3,5),16),parseInt(sp.c.slice(5,7),16)]:[100,200,100];
    const grad=ctx.createLinearGradient(0,pT,0,pT+cH);
    grad.addColorStop(0,`rgba(${sr},${sg},${sb},0.1)`); grad.addColorStop(1,`rgba(${sr},${sg},${sb},0)`);
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.moveTo(xOf(0),yOf(sp.d[0]));
    sp.d.forEach((v,i)=>ctx.lineTo(xOf(i),yOf(v)));
    ctx.lineTo(xOf(sp.d.length-1),pT+cH); ctx.lineTo(pL,pT+cH); ctx.closePath(); ctx.fill();
    // Line
    ctx.strokeStyle=sp.c; ctx.lineWidth=2; ctx.setLineDash([]);
    ctx.beginPath(); sp.d.forEach((v,i)=>i===0?ctx.moveTo(xOf(i),yOf(v)):ctx.lineTo(xOf(i),yOf(v))); ctx.stroke();
    // Latest dot
    const lv=sp.d[sp.d.length-1];
    ctx.fillStyle=sp.c; ctx.beginPath(); ctx.arc(xOf(sp.d.length-1),yOf(lv),4,0,Math.PI*2); ctx.fill();
  });
  labels.forEach((l,i)=>{
    if(i%4===0){const d2=new Date(l+'T00:00:00');ctx.fillStyle='rgba(90,112,128,0.5)';ctx.font='9px DM Mono,monospace';ctx.textAlign='center';ctx.fillText(d2.toLocaleDateString('en-AU',{day:'numeric',month:'short'}),xOf(i),H-4);}
  });
}

function showPredHistory() {
  const extra=document.getElementById('pred-extra'); if(!extra) return;
  const hist=(D.racePredHistory||[]).filter(h=>h['70.3']);
  if(hist.length<2){
    extra.innerHTML='<div class="card" style="margin-top:10px;"><div style="font-size:12px;color:var(--text-dim);padding:20px;text-align:center;">History builds month by month. Check back after your next training month.</div></div>';
    return;
  }
  extra.innerHTML=`<div class="card" style="margin-top:10px;">
    <div class="sl">70.3 PREDICTED TIME — MONTHLY HISTORY</div>
    <canvas id="c-pred-hist" height="160" style="width:100%;display:block;margin:10px 0;"></canvas>
    <div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Month</th><th>Predicted Total</th><th>Swim</th><th>Bike</th><th>Run</th><th>Change</th></tr></thead><tbody>
      ${hist.slice().reverse().map((h,i,a)=>{
        const p=a[i+1], diff=p?h['70.3'].total-p['70.3'].total:null;
        return `<tr><td>${h.month}</td><td style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--green);">${_fmtHMS(h['70.3'].total)}</td><td>${_fmtHMS(h['70.3'].swim)}</td><td>${_fmtHMS(h['70.3'].bike)}</td><td>${_fmtHMS(h['70.3'].run)}</td><td>${diff!==null?`<span style="color:${diff<0?'var(--green)':'var(--red)'};">${diff<0?'↑':'↓'} ${_fmtHMS(Math.abs(diff))}</span>`:'—'}</td></tr>`;
      }).join('')}
    </tbody></table></div>
  </div>`;
  setTimeout(()=>{
    const c=document.getElementById('c-pred-hist'); if(!c) return;
    const W=c.parentElement.clientWidth-32; c.width=W>100?W:300; c.height=160;
    const H=160, ctx=c.getContext('2d'); ctx.clearRect(0,0,W,H);
    const vals=hist.map(h=>h['70.3'].total);
    const yMin=Math.min(...vals)*0.97, yMax=Math.max(...vals)*1.03;
    const pL=52, pT=12, pR=12, pB=24, cW=W-pL-pR, cH=H-pT-pB;
    ctx.fillStyle='var(--surface2)'; ctx.fillRect(0,0,W,H);
    for(let i=0;i<=3;i++){const v=yMin+(yMax-yMin)*i/3,y=pT+cH*(1-i/3);ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pL,y);ctx.lineTo(pL+cW,y);ctx.stroke();ctx.fillStyle='rgba(90,112,128,0.7)';ctx.font='9px monospace';ctx.textAlign='right';ctx.fillText(_fmtHMS(v),pL-3,y+3);}
    ctx.textAlign='left';
    const xOf=i=>pL+cW*(i/Math.max(vals.length-1,1));
    const yOf=v=>pT+cH*(1-(v-yMin)/(yMax-yMin||1));
    const grad=ctx.createLinearGradient(0,pT,0,pT+cH);
    grad.addColorStop(0,'rgba(0,230,118,0.15)'); grad.addColorStop(1,'rgba(0,230,118,0)');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.moveTo(xOf(0),yOf(vals[0])); vals.forEach((v,i)=>ctx.lineTo(xOf(i),yOf(v)));
    ctx.lineTo(xOf(vals.length-1),pT+cH); ctx.lineTo(pL,pT+cH); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#00e676'; ctx.lineWidth=2.5; ctx.setLineDash([]);
    ctx.beginPath(); vals.forEach((v,i)=>i===0?ctx.moveTo(xOf(i),yOf(v)):ctx.lineTo(xOf(i),yOf(v))); ctx.stroke();
    const ttPts=[];
    vals.forEach((v,i)=>{ctx.fillStyle='#00e676';ctx.beginPath();ctx.arc(xOf(i),yOf(v),4,0,Math.PI*2);ctx.fill();ttPts.push({cx:xOf(i),cy:yOf(v),lines:[hist[i].month,`70.3: ${_fmtHMS(v)}`]});});
    TT.register(c,ttPts);
    hist.forEach((h,i)=>{ctx.fillStyle='rgba(90,112,128,0.6)';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(h.month.slice(5),xOf(i),H-4);});
  },60);
}

function showPredSignals() {
  const extra=document.getElementById('pred-extra'); if(!extra||!window._predState) return;
  const {R,B,S}=window._predState;
  extra.innerHTML=`<div class="card" style="margin-top:10px;">
    <div class="sl">FITNESS SIGNAL METHODOLOGY</div>
    <div style="font-size:11px;line-height:2;color:var(--text-dim);">
      <b style="color:var(--text);">🏃 Run signal:</b> Aerobic Efficiency (speed÷HR÷LTHR) × volume weight × effort multiplier.
      CTL <b style="color:var(--green);">${(R.ctl*100).toFixed(2)}</b> → VDOT ~${Math.round(R.vdot)} → Threshold pace ${_fmtRunP(R.threshold)}<br>
      <b style="color:var(--text);">🚴 Bike signal:</b> W:HR efficiency (Allen & Coggan) × duration × effort.
      CTL <b style="color:var(--orange);">${(B.ctl*100).toFixed(2)}</b> → FTP ~${Math.round(B.ftp)}W · Speed model: ${B.speedModel.type==='rouvy'?`✅ Rouvy calibrated (${B.speedModel.sessions} sessions)`:'⚠ Physics default (add Rouvy power data)'}<br>
      <b style="color:var(--text);">🏊 Swim signal:</b> Pace quality (Wakayoshi CSS proxy) × session length.
      CTL <b style="color:#2196f3;">${(S.ctl*100).toFixed(2)}</b> → CSS ~${_fmtSwimP(S.css)}<br>
      <b style="color:var(--text);">Form (TSB):</b> Run ${(R.tsb*100).toFixed(1)} · Bike ${(B.tsb*100).toFixed(1)} · Swim ${(S.tsb*100).toFixed(1)}<br>
      <span style="color:var(--text-dim);font-size:10px;">References: Banister 1991, Allen & Coggan, Wakayoshi 1992, Riegel 1981, Friel Triathlete's Training Bible</span>
    </div>
  </div>`;
}

// ===== DASHBOARD RACE PREDICTOR MINI =====
function renderDashboardRacePredictor() {
  const acts = STRAVA_ACTS.acts || [];
  if(acts.length < 5) {
    const conf = document.getElementById('d-pred-confidence');
    if(conf) conf.textContent = 'Sync Strava to get race predictions (need 5+ sessions)';
    return;
  }
  try {
    const R = buildRunModel_pred(), B = buildBikeModel_pred(), S = buildSwimModel_pred();
    const setEl = (id, v) => { const e=document.getElementById(id); if(e) e.textContent = v; };
    Object.entries(RACE_DISTANCES).forEach(([k, d]) => {
      const p = _calcPrediction(d, R, B, S);
      const elId = 'd-pred-' + (k==='70.3'?'703':k==='ironman'?'ironman':k==='sprint'?'sprint':'olympic');
      setEl(elId, _fmtHMS(p.total));
    });
    const confPct = Math.round(Math.min(R.runs.length/30,1)*35 + Math.min(B.bikes.length/20,1)*40 + Math.min(S.swims.length/10,1)*25);
    const conf = document.getElementById('d-pred-confidence');
    if(conf) conf.textContent = `Confidence: ${confPct}% · ${R.runs.length} runs · ${B.bikes.length} bikes · ${S.swims.length} swims · Click Full View for detailed breakdown`;
  } catch(e) {
    console.warn('Race predictor error:', e);
  }
}

// ===== WORKOUT EDIT =====
function editWorkout(actId) {
  const act = STRAVA_ACTS.acts.find(a => a.id === actId);
  if(!act) { showToast('Activity not found', true); return; }

  const fP = p => { const m=Math.floor(p),s=Math.round((p-m)*60); return m+':'+(s<10?'0':'')+s; };
  const inpStyle = 'background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;font-size:12px;';
  const sportFields = act.s === 'Run' ? `
    <div><label style="font-size:10px;color:var(--text-dim);">Distance (km)</label><input type="number" id="ew-dk" step="0.01" value="${act.dk||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Duration (min)</label><input type="number" id="ew-mm" step="0.1" value="${act.mm||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Avg HR (bpm)</label><input type="number" id="ew-hr" value="${act.hr||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Avg Pace (min/km)</label><input type="text" id="ew-p" value="${act.p?fP(act.p):''}" placeholder="e.g. 5:30" style="width:100%;${inpStyle}"></div>
  ` : act.s === 'Bike' ? `
    <div><label style="font-size:10px;color:var(--text-dim);">Distance (km)</label><input type="number" id="ew-dk" step="0.1" value="${act.dk||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Duration (min)</label><input type="number" id="ew-mm" step="1" value="${act.mm||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Avg HR (bpm)</label><input type="number" id="ew-hr" value="${act.hr||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">NP Watts</label><input type="number" id="ew-nw" value="${act.nw||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Avg Watts</label><input type="number" id="ew-w" value="${act.w||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Cadence (rpm)</label><input type="number" id="ew-cad" value="${act.cad||''}" style="width:100%;${inpStyle}"></div>
  ` : `
    <div><label style="font-size:10px;color:var(--text-dim);">Distance (km)</label><input type="number" id="ew-dk" step="0.01" value="${act.dk||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Duration (min)</label><input type="number" id="ew-mm" step="0.1" value="${act.mm||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Avg HR (bpm)</label><input type="number" id="ew-hr" value="${act.hr||''}" style="width:100%;${inpStyle}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Pace /100m (min)</label><input type="text" id="ew-sp" value="${act.sp?fP(act.sp):''}" placeholder="e.g. 1:45" style="width:100%;${inpStyle}"></div>
  `;

  const efOpts = ['easy','moderate','hard','max'].map(v=>`<option value="${v}" ${act.ef===v?'selected':''}>${v}</option>`).join('');
  const html = `
    <div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;">
      <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(520px,98vw);max-height:92vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--orange);">EDIT WORKOUT — ${act.d}</div>
          <button class="btn sec sml" onclick="closeEditModal()">✕</button>
        </div>
        <div style="margin-bottom:12px;"><label style="font-size:10px;color:var(--text-dim);">Activity Name</label><input type="text" id="ew-name" value="${act.n||''}" style="width:100%;${inpStyle}"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          ${sportFields}
          <div><label style="font-size:10px;color:var(--text-dim);">Effort Level</label><select id="ew-ef" style="width:100%;${inpStyle}"><option value="">—</option>${efOpts}</select></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Training Load</label><input type="number" id="ew-tl" value="${act.tl||''}" style="width:100%;${inpStyle}"></div>
        </div>
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:12px;">⚠️ Changes apply to local data only. Re-syncing from Strava will overwrite edits.</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn sec" onclick="closeEditModal()">Cancel</button>
          <button class="btn" style="background:var(--orange);color:#000;font-weight:700;" onclick="saveWorkoutEdit(${actId})">💾 Save Changes</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveWorkoutEdit(actId) {
  const idx = STRAVA_ACTS.acts.findIndex(a => a.id === actId);
  if(idx < 0) { showToast('Activity not found', true); return; }
  const a = STRAVA_ACTS.acts[idx];
  const getNum = id => { const el=document.getElementById(id); return el&&el.value?parseFloat(el.value)||null:null; };
  const getStr = id => { const el=document.getElementById(id); return el?el.value.trim():null; };
  const parsePace = str => {
    if(!str) return null;
    const m = str.match(/(\d+):(\d+)/);
    return m ? parseInt(m[1]) + parseInt(m[2])/60 : null;
  };

  a.n  = getStr('ew-name') || a.n;
  a.dk = getNum('ew-dk') || a.dk;
  a.mm = getNum('ew-mm') || a.mm;
  a.hr = getNum('ew-hr') || a.hr;
  a.tl = getNum('ew-tl') || a.tl;
  a.ef = getStr('ew-ef') || a.ef;
  if(a.s === 'Run')  a.p  = parsePace(getStr('ew-p'))  || a.p;
  if(a.s === 'Bike') { a.nw=getNum('ew-nw')||a.nw; a.w=getNum('ew-w')||a.w; a.cad=getNum('ew-cad')||a.cad; }
  if(a.s === 'Swim') a.sp = parsePace(getStr('ew-sp')) || a.sp;

  // Persist edits in localStorage under a separate key so they survive page reloads
  try {
    const edits = JSON.parse(localStorage.getItem('tc26_workout_edits') || '{}');
    edits[actId] = {...a};
    localStorage.setItem('tc26_workout_edits', JSON.stringify(edits));
  } catch(e) {}

  closeEditModal();
  renderPerformance(); // refresh current tab
  showToast('Workout updated ✓');
}

// ===== AI PERFORMANCE OVERVIEW (#8) =====
function renderAIOverview() {
  const container = document.getElementById('pv-overview-content');
  if(!container) return;

  // Gather all data for AI analysis
  const acts = STRAVA_ACTS.acts || [];
  const wk = getWeekKey(new Date());
  const prevWk = (() => { const d=new Date(wk); d.setDate(d.getDate()-7); return getWeekKey(d); })();
  const t = calcWeekTotalsFromStrava(wk);
  const prevT = calcWeekTotalsFromStrava(prevWk);

  // Last 7 morning checks
  const last7Days = [];
  for(let i=6; i>=0; i--) { const d=new Date(); d.setDate(d.getDate()-i); last7Days.push(localDateStr(d)); }
  const recentMornings = D.mornings.filter(m => last7Days.includes(m.date));
  const lastMorning = D.mornings.length ? D.mornings[D.mornings.length-1] : null;

  // Recent week's activities
  const [wStart, wEnd] = [wk, (() => { const [y,m,d]=wk.split('-').map(Number); const e=new Date(y,m-1,d+6); return e.getFullYear()+'-'+String(e.getMonth()+1).padStart(2,'0')+'-'+String(e.getDate()).padStart(2,'0'); })()];
  const weekActs = acts.filter(a => a.d >= wStart && a.d <= wEnd);

  // Last checkin
  const lastCI = D.checkins.length ? D.checkins[D.checkins.length-1] : null;

  // Performance models
  let R = null, B = null, S = null, pred703 = null;
  try {
    R = buildRunModel_pred(); B = buildBikeModel_pred(); S = buildSwimModel_pred();
    pred703 = _calcPrediction(RACE_DISTANCES['70.3'], R, B, S);
  } catch(e) {}

  // Build context for AI
  const avgHRV = recentMornings.filter(m=>m.hrv).length ? Math.round(recentMornings.filter(m=>m.hrv).reduce((a,m)=>a+m.hrv,0)/recentMornings.filter(m=>m.hrv).length) : null;
  const avgSleep = recentMornings.filter(m=>m.sleepScore).length ? Math.round(recentMornings.filter(m=>m.sleepScore).reduce((a,m)=>a+m.sleepScore,0)/recentMornings.filter(m=>m.sleepScore).length) : null;

  const dataContext = {
    athlete: 'Triathlete training for Half Ironman',
    currentWeek: {
      totalHrs: t.totalMin ? (t.totalMin/60).toFixed(1) : 0,
      runKm: t.runKm?.toFixed(1),
      bikeKm: t.bikeKm?.toFixed(0),
      swimM: t.swimKm ? (t.swimKm*1000).toFixed(0) : 0,
      sessions: t.totalSessions,
      hardSessions: weekActs.filter(a=>a.ef==='hard'||a.ef==='max'||a.iv).length
    },
    previousWeek: {
      totalHrs: prevT.totalMin ? (prevT.totalMin/60).toFixed(1) : 0
    },
    healthMetrics7Days: {
      avgHRV,
      latestHRV: lastMorning?.hrv,
      avgSleepScore: avgSleep,
      latestRHR: lastMorning?.rhr,
      latestGarminStress: lastMorning?.gstress,
      latestReadinessScore: lastMorning?.readinessScore,
      latestLegs: lastMorning?.legs,
      checkCount: recentMornings.length
    },
    weekActivities: weekActs.map(a => ({
      date: a.d, sport: a.s, distKm: a.dk?.toFixed(1), mins: a.mm?.toFixed(0),
      hr: a.hr, effort: a.ef, interval: a.iv, watts: a.nw||a.w, pace: a.p
    })),
    lastCheckin: lastCI ? {
      date: lastCI.date, score: lastCI.score, hours: lastCI.hours,
      freshness: lastCI.q4, sleep: lastCI.q7, motivation: lastCI.q8,
      trainingLoadTrend: lastCI.q3trend, recap: lastCI.recap
    } : null,
    fitness: R && B && S ? {
      runVDOT: Math.round(R.vdot),
      runThresholdPace: R.threshold ? (m=>m.toFixed(0)+':'+(Math.round((R.threshold-Math.floor(R.threshold))*60)+'').padStart(2,'0'))(Math.floor(R.threshold)) : null,
      bikeFTP: Math.round(B.ftp),
      swimCSS: S.css,
      pred703: pred703 ? _fmtHMS(pred703.total) : null,
      runTSB: R.tsb?.toFixed(2),
      bikeTSB: B.tsb?.toFixed(2)
    } : null,
    nutrition: lastMorning ? {
      calIn: lastMorning.calIn, protein: lastMorning.protein, fuel: lastMorning.fuel
    } : null
  };

  // Show loading state
  container.innerHTML = `
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:var(--green);">🧠 AI PERFORMANCE ANALYSIS</div>
          <div style="font-size:10px;color:var(--text-dim);">Comprehensive assessment based on all your training, health and recovery data</div>
        </div>
        <button class="btn sec sml" onclick="renderAIOverview()">🔄 Refresh</button>
      </div>
      <div id="ai-overview-loading" style="text-align:center;padding:32px;">
        <div style="font-size:32px;margin-bottom:12px;animation:pulse 1.5s infinite;">🧠</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--text-dim);">Analysing your training data…</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:8px;">Reviewing ${acts.length} activities, ${D.mornings.length} morning checks, ${D.checkins.length} weekly check-ins</div>
      </div>
      <div id="ai-overview-result" style="display:none;"></div>
    </div>
    <div id="ai-overview-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">
      ${[
        ['Week Volume', t.totalMin ? (t.totalMin/60).toFixed(1)+'h' : '—', t.totalMin>=10*60?'var(--green)':t.totalMin>=6*60?'var(--orange)':'var(--text-dim)'],
        ['Avg HRV 7d', avgHRV||'—', avgHRV>=70?'var(--green)':avgHRV>=55?'var(--orange)':'var(--red)'],
        ['Sleep Score', avgSleep||'—', avgSleep>=80?'var(--green)':avgSleep>=70?'var(--orange)':'var(--red)'],
        ['Readiness', lastMorning?.readinessScore||'—', (lastMorning?.readinessScore||0)>=70?'var(--green)':(lastMorning?.readinessScore||0)>=40?'var(--orange)':'var(--red)']
      ].map(([l,v,c])=>`<div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:9px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;">${l}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:${c};">${v}</div>
      </div>`).join('')}
    </div>`;

  // Call Claude API
  const prompt = `You are an expert triathlon coach analysing an athlete's training data. Provide a comprehensive performance overview in 4 sections:

1. **PERFORMANCE INDICATOR** (give a score out of 100 and label: OPTIMAL/BUILDING/MANAGING/FATIGUED/REST NEEDED, with a 1-sentence headline)
2. **TRAINING ASSESSMENT** (2-3 sentences on this week's training load, quality, and progression vs last week)
3. **RECOVERY & READINESS** (2-3 sentences on HRV trends, sleep quality, stress, and overall recovery status)  
4. **KEY RECOMMENDATIONS** (3 specific, actionable bullet points for the coming week based on the data)

Be direct, data-specific, and coach-like. Reference actual numbers from the data. If data is missing, note it briefly.

ATHLETE DATA:
${JSON.stringify(dataContext, null, 2)}

Format your response exactly like this (use these exact section headers):
## PERFORMANCE INDICATOR
[Score/100] [LABEL] — [headline]

## TRAINING ASSESSMENT
[assessment]

## RECOVERY & READINESS
[assessment]

## KEY RECOMMENDATIONS
• [recommendation 1]
• [recommendation 2]
• [recommendation 3]`;

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  .then(r => r.json())
  .then(data => {
    const text = data.content?.map(c=>c.text||'').join('') || '';
    if(!text) { throw new Error('No response from AI'); }

    // Parse the score/label from the first section
    const scoreMatch = text.match(/(\d+)\/100.*?(OPTIMAL|BUILDING|MANAGING|FATIGUED|REST NEEDED)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;
    const label = scoreMatch ? scoreMatch[2].toUpperCase() : 'BUILDING';
    const scoreColor = score>=80?'var(--green)':score>=60?'var(--orange)':score>=40?'#ff5722':'var(--red)';

    // Render the formatted result
    const sections = text.split('##').filter(s=>s.trim()).map(s => {
      const lines = s.trim().split('\n').filter(l=>l.trim());
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      return { title, body };
    });

    const loadingEl = document.getElementById('ai-overview-loading');
    const resultEl = document.getElementById('ai-overview-result');
    if(loadingEl) loadingEl.style.display = 'none';
    if(resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:20px;padding:16px;background:var(--surface2);border-radius:10px;margin-bottom:16px;">
          <div style="position:relative;width:80px;height:80px;flex-shrink:0;">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="33" fill="none" stroke="var(--border2)" stroke-width="8"/>
              <circle cx="40" cy="40" r="33" fill="none" stroke="${scoreColor}" stroke-width="8" stroke-linecap="round"
                stroke-dasharray="${2*Math.PI*33}" stroke-dashoffset="${2*Math.PI*33*(1-score/100)}" transform="rotate(-90 40 40)"/>
            </svg>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
              <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${scoreColor};line-height:1;">${score}</div>
            </div>
          </div>
          <div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;color:${scoreColor};">${label}</div>
            ${sections[0]?.body ? `<div style="font-size:12px;color:var(--text-mid);margin-top:4px;line-height:1.5;">${sections[0].body.replace(/\[Score.*?\]/,'').replace(/OPTIMAL|BUILDING|MANAGING|FATIGUED|REST NEEDED/,'').trim()}</div>` : ''}
          </div>
        </div>
        ${sections.slice(1).map(s => `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">${s.title}</div>
            <div style="font-size:12px;color:var(--text-mid);line-height:1.7;">
              ${s.body.replace(/^•\s*/gm, '<div style="display:flex;gap:8px;margin-bottom:6px;"><span style="color:var(--green);flex-shrink:0;">▸</span><span>').replace(/\n(?=▸|<div)/g, '</span></div>').replace(/\n/g,'<br>')}
            </div>
          </div>`).join('')}
        <div style="font-size:9px;color:var(--text-dim);text-align:right;margin-top:8px;">AI Analysis · ${new Date().toLocaleDateString('en-AU')} · Click Refresh to re-analyse</div>`;
    }
  })
  .catch(err => {
    const loadingEl = document.getElementById('ai-overview-loading');
    const resultEl = document.getElementById('ai-overview-result');
    if(loadingEl) loadingEl.style.display = 'none';
    if(resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `<div style="background:rgba(244,67,54,.08);border-radius:8px;padding:16px;color:var(--orange);">
        <div style="font-weight:700;margin-bottom:8px;">⚠️ AI Analysis Unavailable</div>
        <div style="font-size:11px;">Could not connect to AI: ${err.message}</div>
        <div style="font-size:11px;margin-top:8px;">Your manual data summary: HRV ${avgHRV||'—'} · Sleep score ${avgSleep||'—'} · Week volume ${t.totalMin?(t.totalMin/60).toFixed(1)+'h':'—'} · Readiness ${lastMorning?.readinessScore||'—'}/100</div>
      </div>`;
    }
  });
}
