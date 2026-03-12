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
  if(a.s==='Run')  return a.iv?'Interval Run':isLongRun(a)?'Long Run':(a.ef==='hard'||a.ef==='max'?'Hard Run':a.ef==='easy'?'Z2 Run':'Run');
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
  if(tab==='trends')    setTimeout(() => nav('trends'), 50);
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
  // Always rebuild predictor models on every sync — new activities update FTP/LT/CSS live
  if(document.getElementById('pv-predictor') &&
     document.getElementById('pv-predictor').style.display !== 'none') {
    renderRacePredictor();
  } else {
    // Pre-build models in background so they're fresh when tab is opened
    window._predState = null; // force full rebuild next time predictor tab is opened
  }
}

function daysAgo(n) { const d=new Date(); d.setDate(d.getDate()-n); return localDateStr(d); }

const LONG_RUN_KM = 14;
function isLongRun(a) {
  if(a.s !== 'Run') return false;
  if(a.lr === false) return false;
  if(a.lr === true)  return true;
  if(a.iv) return false;
  return (a.dk || 0) >= LONG_RUN_KM;
}

function filterActs(sport, opts) {
  opts = opts || {};
  let acts = STRAVA_ACTS.acts.filter(a => a.s === sport);
  if(opts.range && opts.range !== 'all') acts = acts.filter(a => a.d >= daysAgo(parseInt(opts.range)));
  if(opts.effort && opts.effort !== 'all') {
    if(opts.effort === 'longrun') {
      acts = acts.filter(a => isLongRun(a));
    } else {
      acts = acts.filter(a => a.ef === opts.effort);
    }
  }
  if(opts.minDist) acts = acts.filter(a => a.dk && a.dk >= opts.minDist);
  if(opts.minDur) acts = acts.filter(a => a.mm && a.mm >= opts.minDur);
  if(opts.noInterval) acts = acts.filter(a => !a.iv);
  if(opts.longRunOnly) acts = acts.filter(a => isLongRun(a));
  if(opts.noLongRun) acts = acts.filter(a => !isLongRun(a));
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

// ===== LONG RUN CHARTS =====
function renderLongRunCharts() {
  const range = (document.getElementById('lrf-range')||{value:'all'}).value;
  const acts = filterActs('Run', {range, longRunOnly:true}).filter(a => a.p || a.hr || a.dk);

  const fmtP = p => { const m=Math.floor(p),s=Math.round((p-m)*60); return m+':'+(s<10?'0':'')+s; };

  // ── Stats summary ────────────────────────────────────────────────────
  const sDiv = document.getElementById('lr-stats');
  if(sDiv && acts.length) {
    const recent = acts.slice(-6);
    const avgPace = arr => arr.filter(a=>a.p).reduce((s,a)=>s+a.p,0)/(arr.filter(a=>a.p).length||1);
    const avgHR   = arr => arr.filter(a=>a.hr).reduce((s,a)=>s+a.hr,0)/(arr.filter(a=>a.hr).length||1);
    const rP = avgPace(recent), aP = avgPace(acts);
    const rHR = avgHR(recent),  aHR = avgHR(acts);
    const paceImprove = aP > 0 ? ((aP - rP) / aP * 100) : 0;
    const hrImprove   = aHR > 0 ? ((aHR - rHR) / aHR * 100) : 0;
    const longestRun  = acts.reduce((b,a) => (a.dk||0) > (b.dk||0) ? a : b, acts[0]);
    const totalKm     = acts.reduce((s,a) => s + (a.dk||0), 0);
    const avgDist     = totalKm / acts.length;
    sDiv.innerHTML =
      statCard('Long Runs', acts.length + ' sessions', `Avg dist: ${avgDist.toFixed(1)}km · Total: ${totalKm.toFixed(0)}km`, 'var(--green)') +
      statCard('Avg Pace (recent 6)', fmtP(rP) + '/km',
        paceImprove > 0.5 ? `↑ ${paceImprove.toFixed(1)}% faster than avg` : paceImprove < -0.5 ? `↓ ${Math.abs(paceImprove).toFixed(1)}% slower` : 'On average',
        paceImprove > 0 ? 'var(--green)' : 'var(--text)') +
      statCard('Avg HR (recent 6)', acts.filter(a=>a.hr).length ? Math.round(rHR) + 'bpm' : '—',
        hrImprove > 0.5 ? `↓ ${hrImprove.toFixed(1)}% lower bpm` : hrImprove < -0.5 ? `↑ ${Math.abs(hrImprove).toFixed(1)}% higher bpm` : 'On average',
        hrImprove > 0 ? 'var(--green)' : 'var(--text)') +
      statCard('Longest Run', longestRun ? longestRun.dk.toFixed(1) + 'km' : '—',
        longestRun ? longestRun.d + (longestRun.p ? ' · ' + fmtP(longestRun.p) + '/km' : '') : '',
        'var(--orange)');
  } else if(sDiv) {
    sDiv.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:12px;">No long runs found (≥14km, non-interval). Runs will appear here automatically once synced.</div>';
  }

  if(!acts.length) return;

  // ── 1. Distance Progression ───────────────────────────────────────────
  drawTrendChart('c-lr-dist', acts, {
    getValue: a => a.dk || 0,
    color: '#00e676', label: 'km', lowerIsBetter: false,
    effortDots: false, rollingN: 4, H: 220,
    yFmt: v => v.toFixed(1) + 'km',
    zones: [
      {min: 21.1, max: 30, color: 'rgba(255,152,0,0.06)'},  // HIM run territory
    ],
    refs: [
      {value: 21.1, label: 'HIM run dist 21.1km', color: 'rgba(255,152,0,0.45)'},
      {value: 14,   label: 'Long run threshold',   color: 'rgba(0,230,118,0.25)'},
    ],
    tipLines: (a,v) => [
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `Distance: <b style="color:#00e676;">${v.toFixed(1)}km</b>`,
      `Pace: ${a.p ? fmtP(a.p)+'/km' : '—'}  ·  Time: ${a.mm ? a.mm.toFixed(0)+'min' : '—'}`,
      `HR: ${a.hr ? a.hr+'bpm' : '—'}  ·  <span style="font-size:10px;color:var(--text-dim);">${a.ef||''}</span>`
    ]
  });

  // ── 2. Pace Trend ─────────────────────────────────────────────────────
  const paceActs = acts.filter(a => a.p > 0);
  drawTrendChart('c-lr-pace', paceActs, {
    getValue: a => a.p,
    color: '#69f0ae', label: 'min/km', lowerIsBetter: true,
    effortDots: false, rollingN: 4, H: 220,
    yFmt: v => fmtP(Math.max(0, v)),
    refs: [
      {value: 4.43, label: 'HM PB pace 4:43', color: 'rgba(255,215,0,0.45)'},
      {value: 5.5,  label: 'Easy Z2 ceiling',  color: 'rgba(33,150,243,0.3)'},
    ],
    tipLines: (a,v) => [
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `Pace: <b style="color:#69f0ae;">${fmtP(v)}/km</b>  ·  ${a.dk ? a.dk.toFixed(1)+'km' : '—'}`,
      `HR: ${a.hr ? a.hr+'bpm' : '—'}  ·  ${a.mm ? a.mm.toFixed(0)+'min' : '—'}`,
      `AE: ${a.ae ? a.ae.toFixed(2) : '—'}`
    ]
  });

  // ── 3. Avg HR / Aerobic Efficiency ────────────────────────────────────
  const hrActs = acts.filter(a => a.hr && a.ae);
  drawTrendChart('c-lr-hr', hrActs, {
    getValue: a => a.hr,
    color: '#ef5350', label: 'bpm', lowerIsBetter: true,
    effortDots: false, rollingN: 4, H: 220,
    yFmt: v => Math.round(v) + '',
    zones: [
      {min: 144, max: 162, color: 'rgba(33,150,243,0.06)'},
      {min: 162, max: 172, color: 'rgba(255,152,0,0.05)'},
    ],
    refs: [
      {value: 162, label: 'Z2 ceiling 162bpm', color: 'rgba(33,150,243,0.5)'},
      {value: 172, label: 'Z3/Z4 172bpm',      color: 'rgba(255,152,0,0.4)'},
    ],
    tipLines: (a,v) => [
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `HR: <b style="color:#ef5350;">${v.toFixed(0)}bpm</b>  ·  AE: ${a.ae ? a.ae.toFixed(2) : '—'}`,
      `Pace: ${a.p ? fmtP(a.p)+'/km' : '—'}  ·  ${a.dk ? a.dk.toFixed(1)+'km' : '—'}`
    ]
  });

  drawTrendChart('c-lr-ae', hrActs, {
    getValue: a => a.ae,
    color: '#ce93d8', label: 'AE (speed/HR)', lowerIsBetter: false,
    effortDots: false, rollingN: 4, H: 180,
    yFmt: v => v.toFixed(2),
    tipLines: (a,v) => [
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `AE: <b style="color:#ce93d8;">${v.toFixed(3)}</b>`,
      `Pace: ${a.p ? fmtP(a.p)+'/km' : '—'}  ·  HR: ${a.hr ? a.hr+'bpm' : '—'}`
    ]
  });

  // ── 4. Time on feet ───────────────────────────────────────────────────
  const durActs = acts.filter(a => a.mm > 0);
  drawTrendChart('c-lr-tof', durActs, {
    getValue: a => a.mm,
    color: '#4dd0e1', label: 'minutes', lowerIsBetter: false,
    effortDots: false, rollingN: 4, H: 200,
    yFmt: v => Math.round(v) + 'min',
    refs: [
      {value: 90,  label: '90min', color: 'rgba(0,230,118,0.2)'},
      {value: 120, label: '2hr',   color: 'rgba(255,152,0,0.3)'},
    ],
    tipLines: (a,v) => [
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `Time on feet: <b style="color:#4dd0e1;">${v.toFixed(0)}min</b>`,
      `Dist: ${a.dk ? a.dk.toFixed(1)+'km' : '—'}  ·  Pace: ${a.p ? fmtP(a.p)+'/km' : '—'}`
    ]
  });

  // ── Session table ─────────────────────────────────────────────────────
  const tDiv = document.getElementById('lr-table');
  if(tDiv) {
    const rows = [...acts].reverse().slice(0, 30);
    tDiv.innerHTML = '<div style="overflow-x:auto;"><table class="tbl"><thead><tr>' +
      '<th>Date</th><th>Session</th><th>Dist</th><th>Pace</th><th>HR</th><th>Time</th><th>AE</th><th>Label</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.map(a => {
        const lrFlag = a.lr === true ? '🏃 LR' : a.lr === false ? '<s style="color:var(--text-dim)">auto</s>' : '🔄 auto';
        const ac = a.ae > 20 ? 'var(--green)' : a.ae > 17 ? 'var(--orange)' : 'var(--red)';
        return `<tr>
          <td style="white-space:nowrap;">${fmtDate(a.d)}</td>
          <td style="font-size:10px;color:var(--text-dim);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${a.n}">${a.n}</td>
          <td>${a.dk ? a.dk.toFixed(1) : '—'}km</td>
          <td style="font-family:monospace;">${a.p ? fmtP(a.p) : '—'}/km</td>
          <td>${a.hr ? a.hr.toFixed(0) : '—'}bpm</td>
          <td style="color:var(--text-dim);">${a.mm ? a.mm.toFixed(0) : '—'}min</td>
          <td style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:${ac};">${a.ae ? a.ae.toFixed(1) : '—'}</td>
          <td style="font-size:10px;">${lrFlag}</td>
          <td><button class="btn sec sml" style="font-size:9px;padding:2px 6px;" onclick="editWorkout(${a.id})">✏️</button></td>
        </tr>`;
      }).join('') + '</tbody></table></div>';
  }
}

// ── Quick LR toggle from run table ───────────────────────────────────────
function lrQuickToggle(actId, markAsLR) {
  const idx = STRAVA_ACTS.acts.findIndex(a => String(a.id) === String(actId));
  if(idx < 0) { showToast('Activity not found', true); return; }
  const a = STRAVA_ACTS.acts[idx];
  if(markAsLR) { a.lr = true; }
  else { a.lr = false; }
  try {
    const edits = JSON.parse(localStorage.getItem('tc26_workout_edits') || '{}');
    edits[actId] = {...a};
    localStorage.setItem('tc26_workout_edits', JSON.stringify(edits));
  } catch(e) {}
  save();
  window._predState = null;
  renderLongRunCharts();
  showToast(markAsLR ? '🏃 Marked as long run ✓' : 'Long run flag removed ✓');
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

// ══════════════════════════════════════════════════════════════════════
// FITNESS MODEL BUILDERS — FTP / Run Threshold / CSS
// Fixes applied (all backed by real data audit):
//   W1: Rouvy power discounted 5% vs outdoor (calibration offset)
//   W2: Interval pace includes rest — corrected via rep-length parsing
//   W3: CSS only from swims ≥1500m, not 1km warm-up sets
//   W4: HR-anchored LT detection from runs near LTHR
//   W5: Long-ride FTP scaling fixed (2hr ride < FTP, not > FTP)
//   W6: Rep length parsed from session name for correct scale factor
//   W7: Recency bias — 90-day best preferred, all-time as fallback
// ══════════════════════════════════════════════════════════════════════

function buildBikeModel_pred() {
  const lthr = _getLTHR();
  const bikes = filterActs('Bike', {range:'all', minDur:10}).filter(a => a.nw || a.w || a.dk);
  const model = buildDualComponentModel(bikes, a => {
    const watts = a.nw || a.w; let eff;
    if(watts && watts > 0) {
      const hrR = a.hr && lthr > 0 ? Math.min(a.hr/lthr, 1.1) : 1.0;
      eff = (watts / (a.hr||150) / hrR) * (a.nw && a.w && a.nw > a.w ? 1+(a.nw-a.w)/a.w*0.3 : 1);
    } else if(a.dk && a.mm) { eff = (a.dk/a.mm*60) / ((a.hr||150)*1.5); }
    else return 0;
    return eff * Math.min(Math.sqrt((a.mm||30)/60/1.5), 1.6) *
           (a.ef==='hard'||a.ef==='max' ? 1.1 : a.ef==='easy' ? 0.85 : 1.0);
  });

  let ftp = null, ftpSource = '';

  // ── P1: Explicit FTP PB (user-verified, highest trust) ───────────────
  const ftpPb = (D.pbs?.phys||[]).concat(D.pbs?.bike||[])
    .find(p => p.n && p.n.toLowerCase().includes('ftp'));
  if(ftpPb && ftpPb.v) {
    const m = String(ftpPb.v).match(/(\d+)/);
    if(m) { ftp = parseInt(m[1]); ftpSource = `✓ PB entry: ${ftpPb.v}W`; }
  }

  // ── P1b: Manual interval entries (from Interval Editor) ─────────────
  // These are user-verified best interval efforts. They compete with
  // Strava activity data in P2 — manual entries override if they produce
  // a higher FTP estimate. This ensures hand-entered interval data is
  // always honoured.
  const _bikeManuals = (D.ivManual||[]).filter(m => m.sport==='bike');
  if(!ftp && _bikeManuals.length) {
    function _dS(d){return d>=150?.91:d>=120?.94:d>=90?.97:d>=60?1:d>=45?.98:d>=30?.97:.95;}
    const candidates = [];
    _bikeManuals.forEach(m => {
      if(m.sets && m.sets.length) {
        // Multi-set: find best FTP-producing Z4/SS block
        const ftpZones = ['Z4','SS','Z3'];
        const eligible = m.sets.filter(s => ftpZones.includes(s.zone));
        const pool     = eligible.length ? eligible : m.sets;
        pool.forEach(s => {
          const totalDur = s.reps * s.durMin;
          const est = Math.round(s.watts * _dS(totalDur) * (m.vr ? 0.98 : 1));
          candidates.push({ est, watts: s.watts, totalDur, zone: s.zone,
            desc: `${s.reps}×${s.durMin}min @${s.watts}W ${s.zone}`, date: m.date, vr: m.vr });
        });
      } else if(m.val && m.dur) {
        const watts = parseFloat(m.val), dur = parseFloat(m.dur);
        const est = Math.round(watts * _dS(dur) * (m.vr ? 0.98 : 1));
        candidates.push({ est, watts, totalDur: dur, zone: 'Z4',
          desc: `${watts}W × ${dur}min`, date: m.date, vr: m.vr });
      }
    });
    if(candidates.length) {
      const best = candidates.reduce((b, a) => a.est > b.est ? a : b);
      ftp = best.est;
      ftpSource = `✓ Manual: ${best.desc}${best.vr?' (Rouvy)':''} → ${ftp}W FTP (${best.date})`;
    }
  }

  // ── P2: Best power effort from Strava, duration-scaled ───────────────
  // FIX W5: Correct duration scaling. FTP = power you can hold for 60min.
  //   20min × 0.95  (standard ramp/test protocol)
  //   30min × 0.97
  //   45min × 0.98
  //   60min × 1.00
  //   90min × 0.97  (sustained endurance — below FTP by definition)
  //  120min × 0.94
  //  150min+× 0.91
  // FIX W1: Rouvy/virtual power discounted 5% (resistance unit runs 5-10% hot vs outdoor PM)
  if(!ftp) {
    const withPower = bikes.filter(a => (a.nw||a.w) && (a.mm||0) >= 18);
    if(withPower.length) {
      function durScale(dur) {
        if(dur >= 150) return 0.91;
        if(dur >= 120) return 0.94;
        if(dur >= 90)  return 0.97;
        if(dur >= 60)  return 1.00;
        if(dur >= 45)  return 0.98;
        if(dur >= 30)  return 0.97;
        return 0.95; // 18-30min
      }
      // FIX W7: prefer 90-day window, fall back to all-time
      const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate()-90);
      const cut90str = cutoff90.toISOString().slice(0,10);
      const recent = withPower.filter(a => a.d >= cut90str);
      const pool = recent.length >= 3 ? recent : withPower;
      const recencyLabel = recent.length >= 3 ? '(last 90d)' : '(all-time)';

      const estimates = pool.map(a => {
        // Prefer pw/pw_min (best work-lap power from detailed fetch) for interval sessions.
        // Session-level NP is diluted by warmup/cooldown — lap data gives actual effort.
        const useLap = a.pw && a.pw_min && a.pw_min >= 3;
        const np = useLap ? a.pw : (a.nw || a.w);
        const dur = useLap ? a.pw_min : (a.mm || 60);
        const rouvy_discount = a.vr ? 0.98 : 1.0; // FIX W1: KICKR accuracy ±2%
        const est = Math.round(np * durScale(dur) * rouvy_discount);
        return { est, np, dur, d: a.d, n: a.n, vr: a.vr, usedLap: useLap };
      });
      const best = estimates.reduce((b,a) => a.est > b.est ? a : b);
      ftp = best.est;
      const rTag = best.vr ? ' (Rouvy ×0.98 KICKR)' : '';
      const lapTag = best.usedLap ? ' [best lap]' : '';
      ftpSource = `→ Strava ${recencyLabel}: ${best.np}W${rTag}${lapTag} ×${durScale(best.dur)} (${Math.round(best.dur)}min, ${best.d})`;
    }
  }

  // ── P3: 20min PB entry → FTP = 20min × 0.95 ─────────────────────────
  if(!ftp) {
    const pb20 = (D.pbs?.bike||[]).find(p => p.n && (p.n.includes('20 min')||p.n.includes('20min')));
    if(pb20 && pb20.v) {
      const m = String(pb20.v).match(/(\d+)/);
      if(m) { ftp = Math.round(parseInt(m[1])*0.95); ftpSource = `→ 20min PB ${pb20.v}W × 0.95`; }
    }
  }

  // ── P4: CTL estimate — last resort ───────────────────────────────────
  if(!ftp) {
    ftp = Math.min(300, Math.max(100, 80 + model.ctl * 400));
    ftpSource = `⚠ CTL estimate — sync rides with a power meter to improve accuracy`;
  }

  ftp = Math.round(Math.max(100, Math.min(500, ftp)));
  return {...model, ftp, ftpSource, bikes};
}

function buildRunModel_pred() {
  const lthr = _getLTHR();
  const runs = filterActs('Run', {range:'all', minDist:2}).filter(a => a.p && a.p > 0);
  const model = buildDualComponentModel(runs, a => {
    const speed = 1000/a.p;
    const hrR = a.hr && lthr > 0 ? Math.min(a.hr/lthr, 1.15) : 1.0;
    const ae = a.hr && lthr > 0 ? speed/(a.hr*hrR) : speed/150;
    const vol = Math.min(Math.sqrt((a.dk||5)/10), 1.5);
    const ef = a.iv ? 1.25 : a.ef==='hard'||a.ef==='max' ? 1.1 : a.ef==='easy' ? 0.9 : 1.0;
    return ae * vol * ef;
  });

  let threshold = null, thresholdSource = '';

  // ── P1: Explicit LT pace PB ──────────────────────────────────────────
  const lthrPb = (D.pbs?.run||[]).find(p => p.n && p.n.toLowerCase().includes('lthr'));
  if(lthrPb && (lthrPb.note || lthrPb.v)) {
    const src = lthrPb.note || lthrPb.v;
    const m = String(src).match(/(\d+)[:\.](\d{2})/);
    if(m) { threshold = parseInt(m[1])+parseInt(m[2])/60; thresholdSource = `✓ LT pace PB: ${lthrPb.v||lthrPb.note}`; }
  }

  // ── P2: HM PB → LT ≈ HM pace × 0.98 ────────────────────────────────
  if(!threshold) {
    const hmPb = (D.pbs?.run||[]).find(p => p.n &&
      (p.n.includes('Half')||p.n.includes('21.1')||p.n.toLowerCase().includes('hm ')));
    if(hmPb && hmPb.v) {
      const s = _parseTime(hmPb.v);
      if(s) { threshold = (s/60/21.1)*0.98; thresholdSource = `→ HM PB ${hmPb.v} → LT = HM pace ×0.98`; }
    }
  }

  // ── P3: HR-anchored LT detection ─────────────────────────────────────
  // Sustained continuous runs (not intervals) where avg HR ≈ LTHR.
  // Running at LTHR HR = running at lactate threshold pace by definition.
  // Guard: exclude anything with interval name patterns (NxMkm, NxMm)
  // since sync.py doesn't always set iv=true. Require ≥10km continuous.
  if(!threshold) {
    const ivPattern = /\d+\s*x\s*\d/i; // matches "10x1km", "3x6km", "15x500m" etc
    const hrRuns = runs.filter(a =>
      a.hr && a.p < 7.0 && (a.dk||0) >= 10 &&
      !a.iv &&
      !ivPattern.test(a.n||'') &&          // name-based interval exclusion
      (a.ef==='hard'||a.ef==='moderate') &&
      Math.abs(a.hr - lthr) <= 8
    );
    if(hrRuns.length >= 2) {
      const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate()-90);
      const cut90str = cutoff90.toISOString().slice(0,10);
      const recentHR = hrRuns.filter(a => a.d >= cut90str);
      const pool = recentHR.length >= 2 ? recentHR : hrRuns;
      const sorted = [...pool].sort((a,b) => a.p - b.p).slice(0, 3);
      // FIX: with ≤2 samples, median picks the SLOWEST value — use fastest instead.
      // With 3+ samples the middle value is a fair robust estimate.
      const medianP = sorted.length <= 2 ? sorted[0].p : sorted[Math.floor(sorted.length/2)].p;
      threshold = medianP;
      thresholdSource = `→ HR-anchored: sustained pace at ~LTHR ${lthr}bpm, ${pool.length} runs (${sorted[0].d})`;
    }
  }

  // ── P3b: Manual run interval entries ─────────────────────────────────
  // User-entered rep paces from the Interval Editor. Parsed as min:ss/km.
  // Compete with Strava interval data. If faster, they set the threshold.
  if(!threshold) {
    const _runManuals = (D.ivManual||[]).filter(m => m.sport==='run' && m.val);
    if(_runManuals.length) {
      function _parseManualPace(v) {
        const mm = String(v).match(/^(\d+):(\d{2})$/);
        return mm ? parseInt(mm[1]) + parseInt(mm[2])/60 : null;
      }
      const valid = _runManuals.map(m => ({ ...m, pace: _parseManualPace(m.val) })).filter(m => m.pace);
      if(valid.length) {
        const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate()-90);
        const cut90 = cutoff90.toISOString().slice(0,10);
        const recent = valid.filter(m => m.date >= cut90);
        const pool = recent.length ? recent : valid;
        const best = pool.reduce((b,a) => a.pace < b.pace ? a : b);
        // Scale: use dk (rep dist in km) if provided, else fallback
        function _repScale(dk) { return (dk||0)>=2?1.02:(dk||0)>=0.8?1.05:1.08; }
        const scale = _repScale(best.dk);
        threshold = best.pace * scale;
        thresholdSource = `✓ Manual entry: ${best.val}/km rep (${best.name||'interval'}) × ${scale} → LT on ${best.date}`;
      }
    }
  }

  // ── P4: Interval sessions with rep-length-aware scaling (FIX W2, W6) ──
  // FIX W2: 'p' field = whole-session avg including jogged rest — this IS the rep pace
  //   because Strava records moving time. Rests at walking pace inflate p slightly.
  //   Net effect: p ≈ rep pace for intervals with short rest (90s walk), reasonable proxy.
  // FIX W6: Parse rep distance from name to set correct threshold scale:
  //   400-500m reps: ~108% of LT (VO2max pace) → LT = p × 1.08
  //   800m-1km reps: ~105% of LT → LT = p × 1.05
  //   2km+ reps:     ~102% of LT → LT = p × 1.02
  if(!threshold) {
    // Include both iv=true activities AND name-pattern detected intervals
    // (sync.py doesn't always set iv=true, but name always has the NxMkm pattern)
    // Respect user exclusions from the Interval Review panel
    const ivPattern4 = /\d+\s*x\s*\d/i;
    const _ivExSet = new Set((D.ivExcluded||[]).map(String));
    const ivRuns = runs.filter(a =>
      (a.iv || ivPattern4.test(a.n||'')) &&
      a.p > 0 && (a.dk||0) >= 4 && a.p < 7.0 &&
      !_ivExSet.has(String(a.id))
    );
    if(ivRuns.length) {
      function getRepScale(name, totalDk) {
        const n = (name||'').toLowerCase();
        const m = n.match(/(\d+)x(\d+\.?\d*)\s*(km|m)/);
        if(m) {
          const repKm = m[3]==='km' ? parseFloat(m[2]) : parseFloat(m[2])/1000;
          if(repKm >= 2.0) return 1.02;
          if(repKm >= 0.8) return 1.05;
          return 1.08; // 400-500m reps
        }
        // Fallback: estimate from total distance
        return (totalDk||0) >= 8 ? 1.05 : 1.08;
      }
      // FIX W7: recency preference
      const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate()-90);
      const cut90str = cutoff90.toISOString().slice(0,10);
      const recent = ivRuns.filter(a => a.d >= cut90str);
      const pool = recent.length >= 2 ? recent : ivRuns;
      // Prefer lp (best-lap pace from detailed fetch) — it strips warmup/cooldown dilution.
      // lp_km gives the rep distance, enabling accurate scale factor.
      const best = pool.reduce((b,a) => {
        const ap = a.lp || a.p;  // use best-lap pace if available
        const bp = b.lp || b.p;
        return ap < bp ? a : b;
      });
      const bestPace = best.lp || best.p;
      const scaleKey = best.lp ? best.lp_km : best.dk;
      const scale = getRepScale(best.lp ? `1x${(best.lp_km||1).toFixed(1)}km` : best.n, scaleKey);
      threshold = bestPace * scale;
      const lapTag = best.lp ? ` [best lap ${(best.lp_km||0).toFixed(2)}km]` : '';
      thresholdSource = `→ Intervals (${recent.length>=2?'last 90d':'all-time'}): ${fmtPace(bestPace)}/km × ${scale}${lapTag} (${best.d})`;
    }
  }

  // ── P5: Best sustained tempo run 20–50min ────────────────────────────
  if(!threshold) {
    const tempoRuns = runs.filter(a =>
      (a.mm||0)>=20 && (a.mm||0)<=50 && (a.ef==='hard'||a.ef==='max') && a.p<7.0 && !a.iv
    );
    if(tempoRuns.length) {
      const best = tempoRuns.reduce((b,a) => a.p < b.p ? a : b);
      threshold = best.p * 1.03;
      thresholdSource = `→ Tempo run: ${fmtPace(best.p)}/km (${best.d}) × 1.03`;
    }
  }

  // ── P6: CTL formula ──────────────────────────────────────────────────
  if(!threshold) {
    threshold = Math.max(3.8, Math.min(6.5, 7.0 - model.ctl*10));
    thresholdSource = `⚠ CTL estimate — add HM PB or interval sessions to improve`;
  }

  // ── P6b: Long run aerobic efficiency cross-check ────────────────────
  // If threshold is CTL-estimated (no real data), long run pace can provide
  // a floor: marathon pace ≈ LT × 1.08 (Friel), so LT floor = LR pace × 0.926
  // Also feeds back to CTL via a higher quality fitness signal than steady runs.
  const lrRuns = runs.filter(a => isLongRun(a) && a.p > 0 && a.p < 7.5);
  if(lrRuns.length) {
    const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate()-90);
    const cut90s = cutoff90.toISOString().slice(0,10);
    const recentLR = lrRuns.filter(a => a.d >= cut90s);
    const pool = recentLR.length >= 2 ? recentLR : lrRuns;
    const bestLR = pool.reduce((b,a) => a.p < b.p ? a : b);
    // Long run pace → threshold floor (marathon pace / 1.08)
    const lrThreshFloor = bestLR.p * 0.926;
    // Also compute aerobic efficiency from long runs
    const lrAE = pool.filter(a=>a.ae).map(a=>a.ae);
    const avgLRAE = lrAE.length ? lrAE.reduce((s,v)=>s+v,0)/lrAE.length : null;
    // Use as cross-check: if current threshold seems too slow vs long run data, note it
    if(!threshold || (thresholdSource.includes('CTL estimate') && lrThreshFloor < threshold)) {
      threshold = lrThreshFloor;
      thresholdSource = `→ Long run floor: ${fmtPace(bestLR.p)}/km (${bestLR.d}) × 0.926 (marathon→LT)`;
    }
    // Store for display
    model._lrBest = bestLR;
    model._lrAE   = avgLRAE;
    model._lrCount = pool.length;
  }

  threshold = Math.max(3.2, Math.min(9.0, threshold));
  const vdot = threshold > 0 ? Math.round(Math.min(70,Math.max(25, 85-(threshold*8)))) : 40;
  return {...model, lthr, threshold, thresholdSource, vdot, runs, lrRuns};
}

function buildSwimModel_pred() {
  const swims = filterActs('Swim', {range:'all'}).filter(a => a.sp && a.sp > 0 && (a.dk||0)*1000 >= 300);
  const model = buildDualComponentModel(swims, a => {
    const q = 2.167/a.sp, dist = Math.min(Math.sqrt((a.dk||0)*1000/1500), 1.5);
    return q * dist * (a.ef==='hard'||a.ef==='max' ? 1.15 : a.ef==='easy' ? 0.9 : 1.0);
  });

  let css = null, cssSource = '';

  // ── P1: Explicit CSS PB ──────────────────────────────────────────────
  const cssPb = (D.pbs?.swim||[]).concat(D.pbs?.phys||[])
    .find(p => p.n && p.n.toLowerCase().includes('css'));
  if(cssPb && cssPb.v) {
    const m = String(cssPb.v).replace('~','').trim().match(/(\d+):(\d{2})/);
    if(m) { css = parseInt(m[1])+parseInt(m[2])/60; cssSource = `✓ CSS PB: ${cssPb.v}/100m`; }
  }

  // ── P1b: Manual swim interval entries ────────────────────────────────
  // Supports multi-set entries (sets[]) and legacy single-value entries.
  // CSS sourced from CSS-effort sets only. Speed/Sprint/Drill ignored for CSS.
  if(!css) {
    const _swimManuals = (D.ivManual||[]).filter(m => m.sport==='swim');
    if(_swimManuals.length) {
      const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate()-90);
      const cut90 = cutoff90.toISOString().slice(0,10);
      const candidates = [];
      _swimManuals.forEach(m => {
        if(m.sets && m.sets.length) {
          // Multi-set: only CSS and Aerobic sets count for CSS estimation
          const eligible = m.sets.filter(s => s.effort==='CSS' || s.effort==='Aerobic');
          const pool = eligible.length ? eligible : m.sets.filter(s => s.effort!=='Sprint' && s.effort!=='Drill');
          pool.forEach(s => {
            if(!s.pace || s.pace >= 3) return;
            // Pace → CSS scale: longer rep = closer to CSS pace
            const scale = s.distM >= 400 ? 1.01 : s.distM >= 200 ? 1.04 : s.distM >= 100 ? 1.07 : 1.10;
            candidates.push({ cssEst: s.pace * scale, pace: s.pace, distM: s.distM,
              label: `${s.reps}×${s.distM}m @${_ivFmtPace(s.pace)}/100m (${s.effort})`,
              date: m.date, recent: m.date >= cut90 });
          });
        } else if(m.val) {
          const pace = _ivParsePace(m.val);
          if(pace && pace < 3) {
            const repM = parseFloat(m.dk) * 1000 || 400;
            const scale = repM >= 400 ? 1.01 : 1.04;
            candidates.push({ cssEst: pace * scale, pace, distM: repM,
              label: `${m.val}/100m rep`, date: m.date, recent: m.date >= cut90 });
          }
        }
      });
      if(candidates.length) {
        const recent = candidates.filter(x => x.recent);
        const pool = recent.length ? recent : candidates;
        const best = pool.reduce((b, a) => a.cssEst < b.cssEst ? a : b);
        css = best.cssEst;
        cssSource = `✓ Manual: ${best.label} (${best.date})`;
      }
    }
  }

  // ── P2: Best scaled CSS from all sessions ≥1500m ────────────────────
  // Scale by effort tag, then take the FASTEST (lowest) CSS estimate.
  // This avoids wrong priority ordering — a fast easy session correctly
  // beats a slower moderate session. ≥1500m gate excludes warm-up sets.
  // Scales: hard=×1.01 (CSS≈hard pace), moderate=×0.97, easy=×0.95
  // (Easy sessions are ~5% slower than CSS pace by training zone definition)
  if(!css) {
    const longSwims = swims.filter(a => (a.dk||0)*1000 >= 1500);
    if(longSwims.length) {
      const candidates = longSwims.map(a => {
        const ef = a.ef || 'easy';
        const scale = ef==='hard'||ef==='max' ? 1.01 : ef==='moderate' ? 0.97 : 0.95;
        return { cssEst: a.sp * scale, sp: a.sp, d: a.d, ef, dk: a.dk, scale };
      });
      // Take the fastest (lowest pace) CSS estimate
      const best = candidates.reduce((b,a) => a.cssEst < b.cssEst ? a : b);
      css = best.cssEst;
      const distM = Math.round((best.dk||0)*1000);
      cssSource = `→ Strava swim ${distM}m (${best.ef}): ${fmtPace(best.sp)}/100m × ${best.scale} (${best.d})`;
    }
  }

  // ── P3: Any swim ≥800m if nothing ≥1500m ──────────────────────────────
  if(!css) {
    const anySwims = swims.filter(a => (a.dk||0)*1000 >= 800);
    if(anySwims.length) {
      const ef = anySwims[0].ef || 'easy';
      const scale = ef==='hard' ? 1.01 : ef==='moderate' ? 0.97 : 0.95;
      const best = anySwims.reduce((b,a) => a.sp < b.sp ? a : b);
      css = best.sp * scale;
      cssSource = `→ Short swim ${Math.round((best.dk||0)*1000)}m: ${fmtPace(best.sp)}/100m × ${scale} (${best.d})`;
    }
  }

  // ── P6: CTL formula ──────────────────────────────────────────────────
  if(!css) {
    css = Math.max(1.5, Math.min(2.5, 2.4 - model.ctl*1.5));
    cssSource = `⚠ CTL estimate — add timed pool sessions to improve accuracy`;
  }

  css = Math.max(1.3, Math.min(3.0, css));
  return {...model, css, cssSource, swims};
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
  if(speedModel && speedModel.type==='rouvy') return speedModel.a*Math.pow(power,speedModel.b);
  // Default: Martin et al. 1998 outdoor road physics (same as _powerToSpeedKph)
  return _powerToSpeedKph(power);
}

// ── Default effort % settings per distance (user-editable, stored in D.predSettings) ──
// Bike: % of FTP. Swim/Run: % of threshold pace — below 100% = faster than threshold.
// swimPct: 97% means race swim is 3% faster than CSS (shorter sprint effort)
// runPct: 103% means race run is 3% slower than LT (fatigue from bike)
// ── Research-backed effort % defaults ────────────────────────────────────────
// BIKE % FTP sources:
//   Sprint  95-100%: D3 Multisport coaching guidelines (Coggan zones, ~30-45min effort)
//   Olympic 88-95%:  D3 Multisport + TrainerRoad community data (~60min bike effort)
//   70.3    82-88%:  Lionel Sanders race files: 88% IF at Mt Tremblant, 91% at Worlds
//                    D3 Multisport: 82-88%. Using 85% as solid age-group middle ground.
//   Ironman 72-80%:  Sanders IM Arizona 79% IF, IM Kona 81% IF first half/79% avg
//                    TrainingPeaks Kona podium analysis: ~80% IF for pro men
// SWIM % CSS: shorter race = harder relative to CSS, longer = conservation
// RUN % LT:  lower = faster than threshold (shorter race), higher = fatigue off bike
const PRED_DEFAULTS = {
  sprint:  { bikePct:95, swimPct:97,  runPct:103 },
  olympic: { bikePct:90, swimPct:100, runPct:106 },
  '70.3':  { bikePct:85, swimPct:103, runPct:112 },
  ironman: { bikePct:75, swimPct:108, runPct:126 },
};

function _getPredSettings() {
  if(!D.predSettings) D.predSettings = {};
  const s = {};
  for(const [k,def] of Object.entries(PRED_DEFAULTS)) {
    s[k] = { ...def, ...(D.predSettings[k]||{}) };
  }
  return s;
}

function _savePredSettings(distKey, field, val) {
  if(!D.predSettings) D.predSettings = {};
  if(!D.predSettings[distKey]) D.predSettings[distKey] = {};
  D.predSettings[distKey][field] = parseFloat(val);
  save();
  // Re-render the predictor with new settings
  if(window._predState) {
    const {R,B,S} = window._predState;
    const settings = _getPredSettings();
    const preds = {};
    Object.entries(RACE_DISTANCES).forEach(([k,d]) => { preds[k] = _calcPrediction(d,R,B,S,settings); });
    window._predState.preds = preds;
    // Update tab totals
    Object.keys(RACE_DISTANCES).forEach(k => {
      const btn = document.getElementById('ptab-'+k);
      if(btn) { const tEl = btn.querySelector('.pred-tab-time'); if(tEl) tEl.textContent = _fmtHMS(preds[k].total); }
    });
    // Re-render current detail panel
    const panel = document.getElementById('pred-detail');
    if(panel) panel.innerHTML = _renderDetail(distKey, preds[distKey], RACE_DISTANCES[distKey], R, B, S);
  }
}

// Outdoor cycling physics — Martin et al. 1998
// CdA=0.32 (aero/TT position), rho=1.2kg/m3, Crr=0.004, 82kg system, 2.5% drivetrain loss
function _powerToSpeedKph(watts) {
  const CdA=0.32, rho=1.2, Crr=0.004, mass=82, g=9.81, loss=0.975;
  let v=10;
  for(let i=0;i<50;i++){
    const f=CdA*0.5*rho*v*v*v+Crr*mass*g*v-watts*loss;
    const df=1.5*CdA*rho*v*v+Crr*mass*g;
    v-=f/df; if(v<1)v=1;
  }
  return v*3.6;
}

function _calcPrediction(dk, R, B, S, settings) {
  const distKey = Object.keys(RACE_DISTANCES).find(k=>RACE_DISTANCES[k]===dk)||'70.3';
  const cfg = (settings||_getPredSettings())[distKey];

  // ── SWIM ─────────────────────────────────────────────────────────────────
  // swimPct as % of CSS pace. 97% = 3% faster than CSS (shorter sprint effort).
  const swimP   = S.css * (cfg.swimPct/100);
  const swimMins= (dk.swim*1000/100)*swimP;

  // ── BIKE ─────────────────────────────────────────────────────────────────
  // bikePct as % of FTP. Physics: Martin et al. 1998 outdoor road model.
  const raceW   = Math.round(B.ftp * (cfg.bikePct/100));
  const spd     = Math.max(20, Math.min(52, _powerToSpeedKph(raceW)));
  const bikeMins= (dk.bike/spd)*60;

  // ── RUN ──────────────────────────────────────────────────────────────────
  // runPct as % of LT pace. 103% = 3% slower than threshold (bike fatigue factor).
  let runP = R.threshold * (cfg.runPct/100);
  runP = Math.max(3.2, Math.min(9.0, runP));
  const runMins = dk.run * runP;

  const total = swimMins + bikeMins + runMins + dk.t1 + dk.t2;
  // Confidence: recency-weighted — only activities in last 90 days count
  const cut90 = new Date(); cut90.setDate(cut90.getDate()-90);
  const c90str = cut90.toISOString().slice(0,10);
  const recentR = R.runs.filter(a=>a.d>=c90str).length;
  const recentB = B.bikes.filter(a=>a.d>=c90str).length;
  const recentS = S.swims.filter(a=>a.d>=c90str).length;
  const conf = Math.min(recentR/15,1)*0.35 + Math.min(recentB/10,1)*0.40 + Math.min(recentS/6,1)*0.25;

  // ── ESTIMATED HEART RATES (% of LTHR, Friel Triathlete's Training Bible) ─
  const lthr = R.lthr || 181;
  const swimHRpct  = {sprint:0.87, olympic:0.85, '70.3':0.83, ironman:0.80}[distKey]||0.83;
  // Bike & run HR scale with effort % — harder effort = higher % LTHR
  const bikeHRpct  = Math.min(0.96, 0.62 + (cfg.bikePct/100)*0.38);
  const runHRpct   = Math.min(0.99, 0.70 + (cfg.runPct < 105 ? 0.27 : cfg.runPct < 115 ? 0.22 : 0.17));
  const swimHR = Math.round(lthr * swimHRpct);
  const bikeHR = Math.round(lthr * bikeHRpct);
  const runHR  = Math.round(lthr * runHRpct);

  return {swimMins,bikeMins,runMins,t1:dk.t1,t2:dk.t2,total,swimP,bikeSpd:spd,runP,
          raceW,conf,distKey,swimHR,bikeHR,runHR,lthr,cfg};
}

// Called on every Strava sync via mergeStravaActivities + when tab selected
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
  const settings = _getPredSettings();
  const preds={};
  Object.entries(RACE_DISTANCES).forEach(([k,d])=>{ preds[k]=_calcPrediction(d,R,B,S,settings); });

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
        <div style="font-size:11px;color:var(--text-dim);">${acts.length} activities · ${nR} runs · ${nB} bikes · ${nS} swims · auto-updates on sync</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn sec sml" onclick="showPredHistory()">📈 History</button>
        <button class="btn sec sml" onclick="showIntervalReview()">⚡ Intervals</button>
        <button class="btn sec sml" onclick="showPredSignals()">🔬 Debug</button>
      </div>
    </div>

    <!-- ── FITNESS BENCHMARKS — auto-computed from Strava + PBs ── -->
    <div class="card" style="margin-bottom:14px;border:1px solid rgba(0,230,118,0.2);">
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:var(--text-dim);margin-bottom:12px;">YOUR FITNESS BENCHMARKS <span style="color:var(--green);font-size:9px;font-weight:400;">AUTO-COMPUTED FROM STRAVA + PBs</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
        <!-- FTP -->
        <div style="background:var(--surface2);border-radius:10px;padding:14px;border-top:3px solid #ff9800;">
          <div style="font-size:10px;color:var(--text-dim);margin-bottom:4px;">🚴 FTP (Functional Threshold Power)</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:#ff9800;line-height:1;">${Math.round(B.ftp)}<span style="font-size:16px;">W</span></div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:4px;line-height:1.5;">
            <span style="color:${B.ftpSource&&B.ftpSource.includes('PB entry')?'var(--green)':B.ftpSource&&B.ftpSource.includes('CTL')?'var(--orange)':'var(--text-mid)'};">
              ${B.ftpSource||'→ Estimated'}
            </span>
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:9px;color:var(--text-dim);">
            Z2 (base): ${Math.round(B.ftp*0.56)}–${Math.round(B.ftp*0.75)}W · Sweet spot: ${Math.round(B.ftp*0.88)}–${Math.round(B.ftp*0.94)}W · Threshold: ${Math.round(B.ftp*0.95)}–${Math.round(B.ftp*1.05)}W
          </div>
        </div>
        <!-- LT Run Pace -->
        <div style="background:var(--surface2);border-radius:10px;padding:14px;border-top:3px solid #00e676;">
          <div style="font-size:10px;color:var(--text-dim);margin-bottom:4px;">🏃 Lactate Threshold Pace</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:#00e676;line-height:1;">${_fmtRunP(R.threshold)}<span style="font-size:14px;">/km</span></div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:4px;line-height:1.5;">
            <span style="color:${R.thresholdSource&&R.thresholdSource.includes('LT pace PB')?'var(--green)':R.thresholdSource&&R.thresholdSource.includes('CTL')?'var(--orange)':'var(--text-mid)'};">
              ${R.thresholdSource||'→ Estimated'}
            </span>
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:9px;color:var(--text-dim);">
            VDOT ~${Math.round(R.vdot)} · LTHR ${R.lthr}bpm · Easy Z2: ${_fmtRunP(R.threshold*1.25)}–${_fmtRunP(R.threshold*1.35)}/km
          </div>
        </div>
        <!-- CSS -->
        <div style="background:var(--surface2);border-radius:10px;padding:14px;border-top:3px solid #2196f3;">
          <div style="font-size:10px;color:var(--text-dim);margin-bottom:4px;">🏊 CSS (Critical Swim Speed)</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:#2196f3;line-height:1;">${_fmtSwimP(S.css)}</div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:4px;line-height:1.5;">
            <span style="color:${S.cssSource&&S.cssSource.includes('CSS PB')?'var(--green)':S.cssSource&&S.cssSource.includes('CTL')?'var(--orange)':'var(--text-mid)'};">
              ${S.cssSource||'→ Estimated'}
            </span>
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:9px;color:var(--text-dim);">
            T-pace: ${_fmtSwimP(S.css)} · Easy: ${_fmtSwimP(S.css*1.08)}–${_fmtSwimP(S.css*1.15)} · Race sprint: ${_fmtSwimP(S.css*0.97)}
          </div>
        </div>
      </div>
      <div style="font-size:9px;color:var(--text-dim);margin-top:8px;">💡 To improve accuracy: update FTP, LT pace & CSS in the <button onclick="nav('pbs')" style="background:none;border:none;color:var(--green);font-size:9px;cursor:pointer;text-decoration:underline;padding:0;">PBs tab</button> · These benchmarks auto-update after every Strava sync</div>
    </div>

    <!-- ── FITNESS FORM CARDS ── -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
      ${[['🏃','Run',R,nR,`Threshold ${_fmtRunP(R.threshold)} · VDOT ~${Math.round(R.vdot)}`],
         ['🚴','Bike',B,nB,`FTP ${Math.round(B.ftp)}W`],
         ['🏊','Swim',S,nS,`CSS ${_fmtSwimP(S.css)}`]].map(([em,sp,m,n,det])=>{
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
            <div class="pred-tab-time" style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--green);margin-top:3px;">${_fmtHMS(preds[k].total)}</div>
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
           ['🚴','FTP +10W','~'+Math.round(preds['70.3'].bikeMins*0.04)+'min bike gain','2× threshold intervals/week','#ff9800'],
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

  window._predState={preds,R,B,S,settings};
  setTimeout(()=>_renderCTLChart(R,B,S),80);
}

function _renderDetail(distKey,pred,dist,R,B,S) {
  if(!pred) return '';
  const conf=Math.round(pred.conf*100);
  const rng=Math.max(3,Math.round((1-pred.conf)*12));
  const lthr = pred.lthr || R.lthr || 181;
  const cfg = pred.cfg || _getPredSettings()[distKey];

  const splits=[
    ['🏊','Swim',pred.swimMins,
      `${dist.swim*1000}m @ ${_fmtSwimP(pred.swimP)} · ~${pred.swimHR}bpm (${Math.round(pred.swimHR/lthr*100)}% LTHR)`,
      '#2196f3'],
    ['⟳','T1',pred.t1,'Transition','rgba(255,255,255,0.3)'],
    ['🚴','Bike',pred.bikeMins,
      `${dist.bike}km @ ${pred.bikeSpd.toFixed(1)}km/h · ${pred.raceW}W (${cfg.bikePct}% FTP) · ~${pred.bikeHR}bpm`,
      '#ff9800'],
    ['⟳','T2',pred.t2,'Transition','rgba(255,255,255,0.3)'],
    ['🏃','Run',pred.runMins,
      `${dist.run}km @ ${_fmtRunP(pred.runP)} (${cfg.runPct}% LT) · ~${pred.runHR}bpm (${Math.round(pred.runHR/lthr*100)}% LTHR)`,
      '#00e676']
  ];

  const total=pred.swimMins+pred.bikeMins+pred.runMins;
  const [sp,bp,rp2]=[Math.round(pred.swimMins/total*100),Math.round(pred.bikeMins/total*100),0].map((v,i,a)=>i===2?100-a[0]-a[1]:v);

  // Slider helper — inline number input styled as a number field
  const pctSlider = (field, val, min, max, label, color, hint) =>
    `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:10px;color:var(--text-dim);">${label}</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="range" min="${min}" max="${max}" value="${val}" step="1"
            style="width:100px;accent-color:${color};"
            oninput="this.nextElementSibling.textContent=this.value+'%';_savePredSettings('${distKey}','${field}',this.value)">
          <span style="font-size:12px;font-weight:700;color:${color};min-width:38px;">${val}%</span>
        </div>
      </div>
      <div style="font-size:9px;color:var(--text-dim);">${hint}</div>
    </div>`;

  const def = PRED_DEFAULTS[distKey] || {};
  const isModified = cfg.bikePct !== def.bikePct || cfg.swimPct !== def.swimPct || cfg.runPct !== def.runPct;

  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">
    <!-- Left: splits + total -->
    <div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--green);line-height:1;letter-spacing:2px;">${_fmtHMS(pred.total)}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:14px;">${dist.label} · ±${rng}% range: ${_fmtHMS(pred.total*(1-rng/100))} – ${_fmtHMS(pred.total*(1+rng/100))}</div>
      ${splits.map(([em,lbl,t,sub,col])=>`
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:15px;width:22px;text-align:center;">${em}</span>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:600;">${lbl}</div>
            <div style="font-size:10px;color:var(--text-dim);">${sub}</div>
          </div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${col};">${_fmtHMS(t)}</div>
        </div>`).join('')}

      <!-- Time distribution bar -->
      <div style="margin-top:14px;">
        <div style="display:flex;height:16px;border-radius:4px;overflow:hidden;gap:1px;">
          <div style="flex:${sp};background:#2196f3;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:700;">${sp}%</div>
          <div style="flex:${bp};background:#ff9800;display:flex;align-items:center;justify-content:center;font-size:8px;color:#000;font-weight:700;">${bp}%</div>
          <div style="flex:${rp2};background:#00e676;display:flex;align-items:center;justify-content:center;font-size:8px;color:#000;font-weight:700;">${rp2}%</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:4px;font-size:9px;color:var(--text-dim);">
          <span style="color:#2196f3;">■ Swim</span><span style="color:#ff9800;">■ Bike</span><span style="color:#00e676;">■ Run</span>
        </div>
      </div>
    </div>

    <!-- Right: effort % controls + confidence -->
    <div>
      <!-- Effort % sliders -->
      <div style="background:var(--surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text-dim);">EFFORT SETTINGS</div>
          ${isModified ? `<button onclick="_resetPredSettings('${distKey}')" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text-dim);font-size:9px;padding:2px 8px;cursor:pointer;">↺ Reset defaults</button>` : ''}
        </div>

        ${pctSlider('bikePct', cfg.bikePct, 60, 100, '🚴 Bike effort (% of FTP)', '#ff9800',
          `${cfg.bikePct}% of ${Math.round(B.ftp)}W FTP = ${pred.raceW}W · ${pred.bikeSpd.toFixed(1)}km/h avg`)}

        ${pctSlider('swimPct', cfg.swimPct, 90, 115, '🏊 Swim pace (% of CSS — lower = faster)', '#2196f3',
          `${cfg.swimPct}% of CSS ${_fmtSwimP(S.css)} = ${_fmtSwimP(pred.swimP)}/100m`)}

        ${pctSlider('runPct', cfg.runPct, 95, 135, '🏃 Run pace (% of LT — lower = faster)', '#00e676',
          `${cfg.runPct}% of LT ${_fmtRunP(R.threshold)} = ${_fmtRunP(pred.runP)}/km off the bike`)}

        <div style="font-size:9px;color:var(--text-dim);border-top:1px solid var(--border);padding-top:8px;margin-top:4px;">
          Drag sliders to model different scenarios — saves automatically per distance.<br>
          Bike: 92% Sprint · 87% Olympic · 80% 70.3 · 70% IM (evidence-based defaults)
        </div>
      </div>

      <!-- HR estimates -->
      <div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:12px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text-dim);margin-bottom:10px;">ESTIMATED HEART RATES</div>
        ${[['🏊','Swim',pred.swimHR,'#2196f3'],['🚴','Bike',pred.bikeHR,'#ff9800'],['🏃','Run',pred.runHR,'#00e676']].map(([em,lbl,hr,col])=>`
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:11px;">${em} ${lbl}</span>
            <span style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:${col};">${hr}<span style="font-size:11px;">bpm</span>
              <span style="font-size:9px;color:var(--text-dim);"> ${Math.round(hr/lthr*100)}% LTHR</span>
            </span>
          </div>`).join('')}
        <div style="font-size:9px;color:var(--text-dim);margin-top:4px;">Based on LTHR ${lthr}bpm · Friel HR zone model</div>
      </div>

      <!-- Confidence -->
      <div style="background:var(--surface2);border-radius:10px;padding:12px;">
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:6px;">Prediction confidence</div>
        <div style="height:5px;background:var(--border);border-radius:3px;margin-bottom:6px;">
          <div style="height:100%;width:${conf}%;background:${conf>70?'var(--green)':conf>40?'var(--orange)':'var(--red)'};border-radius:3px;"></div>
        </div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:${conf>70?'var(--green)':conf>40?'var(--orange)':'var(--red)'};">${conf}%</div>
        <div style="font-size:10px;color:var(--text-dim);">${conf>70?'High — solid data coverage':conf>40?'Medium — more sessions improve accuracy':'Low — needs more training history'}</div>
      </div>
    </div>
  </div>`;
}

function _resetPredSettings(distKey) {
  if(!D.predSettings) D.predSettings = {};
  delete D.predSettings[distKey];
  save();
  if(window._predState) {
    const {R,B,S} = window._predState;
    const settings = _getPredSettings();
    const preds = {};
    Object.entries(RACE_DISTANCES).forEach(([k,d]) => { preds[k] = _calcPrediction(d,R,B,S,settings); });
    window._predState.preds = preds;
    window._predState.settings = settings;
    Object.keys(RACE_DISTANCES).forEach(k => {
      const btn = document.getElementById('ptab-'+k);
      if(btn) { const tEl = btn.querySelector('.pred-tab-time'); if(tEl) tEl.textContent = _fmtHMS(preds[k].total); }
    });
    const panel = document.getElementById('pred-detail');
    if(panel) panel.innerHTML = _renderDetail(distKey, preds[distKey], RACE_DISTANCES[distKey], R, B, S);
  }
  showToast('Effort settings reset to defaults ✓');
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
  if(nS<5) warns.push({lv:'warn',msg:`⚠ Only ${nS} swim sessions — swim prediction is estimated. Add pool sessions with lap auto-splits for better CSS accuracy.`});
  if(!B.bikes.some(a=>a.nw||a.w)) warns.push({lv:'info',msg:'ℹ No power data in bike activities — FTP estimated from W:HR. Rouvy sessions with power data improve accuracy significantly.'});
  if(R.lthr===181) warns.push({lv:'info',msg:'ℹ LTHR using default 181bpm. Update in PBs → Physiology for better HR zone calibration.'});
  if(!R.runs.filter(a=>a.d>=daysAgo(21)).length) warns.push({lv:'warn',msg:'⚠ No runs in last 21 days — run fitness decay applied to prediction.'});
  // Warn if swim prediction is pool-based (no open-water penalty)
  warns.push({lv:'info',msg:'ℹ Swim prediction based on pool CSS — open water is typically 3–8% slower (sighting, waves, no walls). Wetsuit may offset this.'});
  // Warn if FTP manual entry is lower than activity-derived estimate
  const ftpPbEntry = (D.pbs?.phys||[]).concat(D.pbs?.bike||[]).find(p=>p.n&&p.n.toLowerCase().includes('ftp'));
  if(ftpPbEntry && ftpPbEntry.v) {
    const manFtp = parseInt(String(ftpPbEntry.v).match(/(\d+)/)?.[1]||0);
    // Check if activity data suggests higher FTP
    const pb45 = (D.pbs?.bike||[]).find(p=>p.n&&p.n.includes('45 min'));
    if(pb45 && pb45.v) {
      const p45w = parseInt(String(pb45.v).match(/(\d+)/)?.[1]||0);
      const actFtp = Math.round(p45w * 0.98 * 0.98); // 45min scale × Rouvy
      if(actFtp > manFtp + 5) warns.push({lv:'info',msg:`ℹ Your 45min power PB (${p45w}W) implies FTP ~${actFtp}W — currently using manual entry of ${manFtp}W. Update FTP in PBs if this reflects a recent test.`});
    }
  }
  // TSB warning
  const tsb = R.tsb * 100;
  if(tsb < -20) warns.push({lv:'warn',msg:`⚠ Run TSB is ${tsb.toFixed(0)} (fatigued) — race prediction assumes peak form. Current form may result in slower splits.`});
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

function showIntervalReview(sport) {
  const extra = document.getElementById('pred-extra');
  if(!extra || !window._predState) return;
  const {R, B, S} = window._predState;
  sport = sport || 'run';

  if(!D.ivExcluded) D.ivExcluded = [];
  if(!D.ivManual)   D.ivManual   = [];
  const excluded = new Set(D.ivExcluded);

  function fmtP(p) { const m=Math.floor(p),s=Math.round((p-m)*60); return `${m}:${String(s).padStart(2,'0')}`; }

  const allActs = STRAVA_ACTS.acts||[];

  // ── Build per-sport candidate lists ──────────────────────────────────
  // Show ALL sessions that could be intervals (hard/iv), not just auto-detected
  // This lets the user mark or unmark any session
  const sportCfg = {
    run: {
      label:'🏃 Run', color:'var(--green)', unit:'min/km',
      // All runs ≥3km that are hard, max, iv-flagged, or have interval patterns
      acts: allActs.filter(a => a.s==='Run' && a.p>0 && (a.dk||0)>=3 &&
              (a.iv || a.ef==='hard' || a.ef==='max' ||
               /\d+\s*x\s*\d/i.test(a.n||'') || /\d+\s*x\s*\d/i.test(a.desc||''))),
      currentStat: R.threshold ? `${fmtP(R.threshold)}/km` : '—',
      currentSrc: R.thresholdSource||'CTL estimate',
      statLabel: 'Lactate Threshold',
      cols: ['Date','Session','km','Avg Pace','Avg Lap','Avg Lap HR','→ LT est',''],
      rowFn(a, isEx, isBest, isIv) {
        const pace = a.lp || a.p;
        // Scale for LT estimate
        const repKm = a.alp_km || a.lp_km || (a.dk||0);
        const scale = repKm>=2?1.02:repKm>=0.8?1.05:1.08;
        const ltEst = fmtP(pace * scale);
        // Avg lap display (from sync or manual edit)
        const avgLapPace = a.alp_p ? `<span style="color:var(--green);font-weight:600;">${fmtP(a.alp_p)}/km</span>` : (a.lp ? `<span style="color:var(--green);">${fmtP(a.lp)}/km</span><span style="font-size:9px;color:var(--text-dim)"> best</span>` : `<span style="color:var(--text-dim)">—</span>`);
        const avgLapKmStr = a.alp_km ? `<span style="font-size:9px;color:var(--text-dim)"> · ${a.alp_km.toFixed(2)}km × ${a.alp_n||'?'}</span>` : (a.lp_km ? `<span style="font-size:9px;color:var(--text-dim)"> · ${a.lp_km.toFixed(2)}km</span>` : '');
        const hrDisp = a.alp_hr || a.lp_hr || a.hr || '—';
        const ivBadge = isIv
          ? `<span style="background:rgba(0,230,118,.15);color:var(--green);padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;">⚡ IV</span>`
          : `<span style="background:rgba(255,152,0,.1);color:var(--orange);padding:1px 6px;border-radius:3px;font-size:9px;">HARD</span>`;
        const bestBadge = isBest ? ` <span style="color:var(--orange);font-size:10px">★</span>` : '';
        return `<td style="white-space:nowrap;font-size:11px">${a.d}</td>
          <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px" title="${(a.n||'').replace(/"/g,"'")}">${a.n||'Run'}${bestBadge} ${ivBadge}</td>
          <td style="font-size:11px">${(a.dk||0).toFixed(1)}</td>
          <td style="font-size:11px">${fmtP(a.p)}/km</td>
          <td style="font-size:11px">${avgLapPace}${avgLapKmStr}</td>
          <td style="font-size:11px;color:var(--text-dim)">${hrDisp}</td>
          <td style="color:var(--orange);font-weight:700;font-size:11px">${isEx?`<s>${ltEst}</s>`:ltEst}/km</td>`;
      },
      addFields: `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
          <div><label>Date</label><input type="date" id="iv-add-date" value="${new Date().toISOString().slice(0,10)}"></div>
          <div><label>Session name</label><input type="text" id="iv-add-name" placeholder="e.g. 8x400m track"></div>
          <div><label>Rep pace (min:ss/km)</label><input type="text" id="iv-add-val" placeholder="4:05"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div><label>Rep distance (km)</label><input type="number" id="iv-add-dk" step="0.01" placeholder="e.g. 0.4 for 400m"></div>
          <div><label>Avg HR (optional)</label><input type="number" id="iv-add-hr" placeholder="175"></div>
        </div>`
    },
    bike: {
      label:'🚴 Bike', color:'var(--orange)', unit:'W NP',
      // All rides ≥15min with power that are hard/iv/structured — broad net to catch Rouvy
      acts: allActs.filter(a => a.s==='Bike' && (a.mm||0)>=15 &&
              (a.nw||a.w||a.pw||a.alp_w) &&
              (a.iv || a.ef==='hard' || a.ef==='max' ||
               /\d+\s*x\s*\d/i.test(a.n||'') || /\d+\s*x\s*\d/i.test(a.desc||''))),
      currentStat: B.ftp ? `${B.ftp}W` : '—',
      currentSrc: B.ftpSource||'CTL estimate',
      statLabel: 'FTP',
      cols: ['Date','Session','min','Session NP','Avg Lap','Avg Lap HR','→ FTP est',''],
      rowFn(a, isEx, isBest, isIv) {
        function dS(d){return d>=150?.91:d>=120?.94:d>=90?.97:d>=60?1:d>=45?.98:d>=30?.97:.95;}
        // Prefer best-lap power (from sync.py) over session NP (diluted by warmup)
        const useLap = a.pw && a.pw_min && a.pw_min >= 3;
        const np  = useLap ? a.pw : (a.nw || a.w || 0);
        const dur = useLap ? a.pw_min : (a.mm || 60);
        const ftpEst = np ? Math.round(np * dS(dur) * (a.vr ? 0.98 : 1)) : null;

        // Interval set display: show alp fields if present, otherwise nudge user to edit
        let setDisp;
        if(a.alp_w) {
          const nLaps = a.alp_n ? ` × ${a.alp_n}` : '';
          const lapDur = a.alp_min ? ` · ${a.alp_min}min each` : '';
          setDisp = `<span style="color:var(--orange);font-weight:600;">${a.alp_w}W NP${nLaps}</span><span style="font-size:9px;color:var(--text-dim);">${lapDur}</span>`;
        } else if(useLap) {
          setDisp = `<span style="color:var(--orange);">${a.pw}W · ${a.pw_min}min</span><span style="font-size:9px;color:var(--text-dim);"> best lap</span>`;
        } else {
          setDisp = `<span style="color:var(--text-dim);font-size:10px;">✏️ Edit to add sets</span>`;
        }
        const hrDisp = a.alp_hr || a.hr || '—';
        const ivBadge = isIv
          ? `<span style="background:rgba(255,152,0,.2);color:var(--orange);padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;">⚡ IV</span>`
          : `<span style="background:rgba(255,152,0,.1);color:var(--orange);padding:1px 6px;border-radius:3px;font-size:9px;">HARD</span>`;
        const bestBadge = isBest ? ` <span style="color:var(--orange);font-size:10px">★</span>` : '';
        const ftpCell = ftpEst ? (isEx ? `<s>${ftpEst}W</s>` : `${ftpEst}W`) : `<span style="color:var(--text-dim);font-size:10px;">—</span>`;
        return `<td style="white-space:nowrap;font-size:11px">${a.d}</td>
          <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px" title="${(a.n||'').replace(/"/g,"'")}">${a.n||'Ride'}${bestBadge} ${ivBadge}</td>
          <td style="font-size:11px">${Math.round(a.mm||0)}</td>
          <td style="font-size:11px">${a.nw||a.w||'—'}W avg</td>
          <td style="font-size:11px">${setDisp}</td>
          <td style="font-size:11px;color:var(--text-dim)">${hrDisp}</td>
          <td style="color:var(--orange);font-weight:700;font-size:11px">${ftpCell}</td>`;
      },
      addFields: `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
          <div><label>Date</label><input type="date" id="iv-add-date" value="${new Date().toISOString().slice(0,10)}"></div>
          <div><label>Session name</label><input type="text" id="iv-add-name" placeholder="e.g. 4x8min FTP intervals"></div>
          <div><label>Avg lap power (W NP)</label><input type="number" id="iv-add-val" placeholder="280"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
          <div><label>Reps</label><input type="number" id="iv-add-reps" placeholder="4"></div>
          <div><label>Lap duration (min)</label><input type="number" id="iv-add-lapmin" placeholder="8"></div>
          <div><label>Avg HR (optional)</label><input type="number" id="iv-add-hr" placeholder="160"></div>
        </div>`
    },
    swim: {
      label:'🏊 Swim', color:'#2196f3', unit:'min/100m',
      // All swims ≥400m that are hard or any effort with meaningful distance
      acts: allActs.filter(a => a.s==='Swim' && a.sp>0 && (a.dk||0)*1000>=400 &&
              (a.iv || a.ef==='hard' || a.ef==='max' || a.ef==='moderate' ||
               /\d+\s*x\s*\d/i.test(a.n||''))),
      currentStat: S.css ? `${fmtP(S.css)}/100m` : '—',
      currentSrc: S.cssSource||'CTL estimate',
      statLabel: 'CSS',
      cols: ['Date','Session','m','Avg Pace','Avg Lap','Avg Lap HR','→ CSS est',''],
      rowFn(a, isEx, isBest, isIv) {
        // Session avg pace and best lap pace for CSS estimation
        const sp = a.lsp || a.sp;
        const ef = a.ef || 'easy';
        const scale = ef==='hard'||ef==='max' ? 1.01 : ef==='moderate' ? 0.97 : 0.95;
        const cssEst = sp ? sp * scale : null;
        function fP(p){const m=Math.floor(p),s=Math.round((p-m)*60);return m+':'+(s<10?'0':'')+s;}

        // Set/lap detail display
        let setDisp;
        if(a.alp_p) {
          const nReps = a.alp_n ? ` × ${a.alp_n}` : '';
          const repDist = a.alp_km ? ` · ${Math.round(a.alp_km*1000)}m each` : '';
          setDisp = `<span style="color:#2196f3;font-weight:600;">${fP(a.alp_p)}/100m${nReps}</span><span style="font-size:9px;color:var(--text-dim);">${repDist}</span>`;
        } else if(a.lsp) {
          setDisp = `<span style="color:#2196f3;">${fP(a.lsp)}/100m</span><span style="font-size:9px;color:var(--text-dim);"> best lap</span>`;
        } else {
          setDisp = `<span style="color:var(--text-dim);font-size:10px;">✏️ Edit to add sets</span>`;
        }
        const hrDisp = a.alp_hr || a.hr || '—';
        const ivBadge = isIv
          ? `<span style="background:rgba(33,150,243,.2);color:#2196f3;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;">⚡ IV</span>`
          : `<span style="background:rgba(33,150,243,.1);color:#64b5f6;padding:1px 6px;border-radius:3px;font-size:9px;">SWIM</span>`;
        const bestBadge = isBest ? ` <span style="color:var(--orange);font-size:10px">★</span>` : '';
        const cssCell = cssEst ? (isEx ? `<s>${fP(cssEst)}</s>/100m` : `${fP(cssEst)}/100m`) : `<span style="color:var(--text-dim);font-size:10px;">—</span>`;
        return `<td style="white-space:nowrap;font-size:11px">${a.d}</td>
          <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px" title="${(a.n||'').replace(/"/g,"'")}">${a.n||'Swim'}${bestBadge} ${ivBadge}</td>
          <td style="font-size:11px">${Math.round((a.dk||0)*1000)}</td>
          <td style="font-size:11px">${a.sp ? fP(a.sp)+'/100m' : '—'} avg</td>
          <td style="font-size:11px">${setDisp}</td>
          <td style="font-size:11px;color:var(--text-dim)">${hrDisp}</td>
          <td style="color:#2196f3;font-weight:700;font-size:11px">${cssCell}</td>`;
      },
      addFields: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div><label>Date</label><input type="date" id="iv-add-date" value="${new Date().toISOString().slice(0,10)}"></div>
          <div><label>Session name</label><input type="text" id="iv-add-name" placeholder="e.g. 4x500m CSS + 6x50m sprint"></div>
        </div>
        <div style="background:rgba(33,150,243,.05);border:1px solid rgba(33,150,243,.2);border-radius:8px;padding:12px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#2196f3;">INTERVAL SETS</span>
            <span style="font-size:9px;color:var(--text-dim);">Add each set separately — e.g. 4×500m CSS, then 6×50m sprint</span>
          </div>
          <div style="display:grid;grid-template-columns:44px 64px 88px 100px 60px 28px;gap:5px;margin-bottom:4px;">
            <span style="font-size:9px;color:var(--text-dim);">Reps</span>
            <span style="font-size:9px;color:var(--text-dim);">Dist (m)</span>
            <span style="font-size:9px;color:var(--text-dim);">Pace /100m</span>
            <span style="font-size:9px;color:var(--text-dim);">Effort</span>
            <span style="font-size:9px;color:var(--text-dim);">Rest (sec)</span>
            <span></span>
          </div>
          <div id="iv-swim-sets">
            <div class="iv-swim-set-row" style="display:grid;grid-template-columns:44px 64px 88px 100px 60px 28px;gap:5px;margin-bottom:5px;align-items:center;">
              <input class="iv-set-reps" type="number" min="1" placeholder="4" style="width:100%;">
              <input class="iv-set-dist" type="number" placeholder="500" style="width:100%;">
              <input class="iv-set-pace" type="text" placeholder="1:46" style="width:100%;">
              <select class="iv-set-effort" style="width:100%;">
                <option value="CSS" selected>CSS threshold</option>
                <option value="Speed">Speed / VO2</option>
                <option value="Sprint">Sprint / max</option>
                <option value="Drill">Drill / technique</option>
                <option value="Aerobic">Aerobic / easy</option>
              </select>
              <input class="iv-set-rest" type="number" placeholder="30" style="width:100%;">
              <button type="button" onclick="ivRemoveSwimSet(this)" style="background:rgba(244,67,54,.15);color:var(--red);border:none;border-radius:4px;padding:5px 0;cursor:pointer;font-size:13px;width:100%;line-height:1;">×</button>
            </div>
          </div>
          <button type="button" onclick="ivAddSwimSet()" style="background:rgba(33,150,243,.1);color:#2196f3;border:1px solid rgba(33,150,243,.3);border-radius:5px;padding:4px 12px;cursor:pointer;font-size:10px;margin-top:2px;">+ Add set</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div><label>Avg HR for session (optional)</label><input type="number" id="iv-add-hr" placeholder="—"></div>
          <div style="font-size:10px;color:var(--text-dim);padding-top:20px;">CSS estimated from CSS-effort sets · Speed/Sprint sets stored but not used for CSS</div>
        </div>`
    }
  };

  const cfg = sportCfg[sport];
  const manuals = (D.ivManual||[]).filter(m => m.sport===sport);

  // Sort: date descending (most recent first), excluded pushed to bottom
  const sorted = [...cfg.acts].sort((a,b) => {
    const aEx=excluded.has(String(a.id)), bEx=excluded.has(String(b.id));
    if(aEx!==bEx) return aEx?1:-1;
    return b.d.localeCompare(a.d); // most recent first
  });

  // Best active session for ★ badge (for predictor)
  const active = sorted.filter(a => !excluded.has(String(a.id)) && a.iv);
  let bestAct = null;
  if(active.length) {
    if(sport==='run')  bestAct = active.reduce((b,a)=>(a.lp||a.p)<(b.lp||b.p)?a:b);
    if(sport==='bike') bestAct = active.reduce((b,a)=>{
      const aW=a.pw||(a.nw||a.w||0), bW=b.pw||(b.nw||b.w||0); return aW>bW?a:b; });
    if(sport==='swim') bestAct = active.reduce((b,a)=>(a.lsp||a.sp)<(b.lsp||b.sp)?a:b);
  }

  const tabs = ['run','bike','swim'].map(s =>
    `<button onclick="showIntervalReview('${s}')" style="padding:5px 14px;border-radius:6px;border:1px solid ${s===sport?sportCfg[s].color:'var(--border)'};background:${s===sport?`rgba(${s==='run'?'0,230,118':s==='bike'?'255,152,0':'33,150,243'},.12)`:'transparent'};color:${s===sport?sportCfg[s].color:'var(--text-dim)'};cursor:pointer;font-size:11px;font-weight:600;font-family:'DM Sans',sans-serif;">${sportCfg[s].label}</button>`
  ).join('');

  const stravaRows = sorted.map(a => {
    const isEx  = excluded.has(String(a.id));
    const isIv  = !!a.iv;
  const isLr   = a.lr === true ? true : a.lr === false ? false : isLongRun(a);
    const isBest= bestAct && a.id===bestAct.id && !isEx;
    const rowBg = isEx?'opacity:0.4;':isBest?`background:rgba(${sport==='run'?'0,230,118':sport==='bike'?'255,152,0':'33,150,243'},.04);`:'';

    // Action buttons: toggle IV + edit details + exclude
    const ivToggleBtn = isIv
      ? `<button class="btn sec sml" style="font-size:9px;padding:2px 8px;background:rgba(244,67,54,.1);color:var(--red);border-color:var(--red)" onclick="ivQuickToggle('${a.id}',false,'${sport}')">Remove IV</button>`
      : `<button class="btn sml" style="font-size:9px;padding:2px 8px;background:rgba(0,230,118,.15);color:var(--green);border:1px solid var(--green)" onclick="ivQuickToggle('${a.id}',true,'${sport}')">⚡ Mark IV</button>`;
    const editBtn = `<button class="btn sec sml" style="font-size:9px;padding:2px 8px" onclick="openIvEditModal('${a.id}','${sport}')">✏️ Edit</button>`;
    const exBtn = isEx
      ? `<button class="btn sec sml" style="font-size:9px;padding:2px 8px" onclick="ivToggleExclude('${a.id}',false)">Restore</button>`
      : `<button class="btn sec sml" style="font-size:9px;padding:2px 8px;color:var(--text-dim)" onclick="ivToggleExclude('${a.id}',true)">Excl</button>`;

    return `<tr style="${rowBg}">
      ${cfg.rowFn(a, isEx, isBest, isIv)}
      <td><div style="display:flex;gap:4px;flex-wrap:nowrap">${ivToggleBtn}${editBtn}${exBtn}</div></td>
    </tr>`;
  }).join('');

  const manualRows = manuals.map((m,i) => {
    const delBtn = `<button class="btn sec sml" style="font-size:9px;padding:2px 8px;background:rgba(244,67,54,.1);color:var(--red)" onclick="ivDeleteManual(${i},'${sport}')">Remove</button>`;
    let valDisp='', ltDisp='';
    function _dSr(d){return d>=150?.91:d>=120?.94:d>=90?.97:d>=60?1:d>=45?.98:d>=30?.97:.95;}
    function _fP(p){const mn=Math.floor(p),sc=Math.round((p-mn)*60);return mn+':'+(sc<10?'0':'')+sc;}
    if(sport==='run'){
      valDisp=`<b>${m.val}/km</b>${m.dk?` · ${m.dk}km`:''}`;
      ltDisp=`${m.val}/km`;
    } else if(sport==='bike'){
      if(m.sets && m.sets.length) {
        // Show each zone block as a badge
        const badges = m.sets.map(s => {
          const zCol = s.zone==='Z5'?'#e040fb':s.zone==='Z4'?'var(--orange)':s.zone==='SS'?'#ffd54f':'var(--text-mid)';
          return `<span style="font-size:9px;background:rgba(255,152,0,.1);color:${zCol};padding:1px 6px;border-radius:3px;white-space:nowrap;">${s.reps}×${s.durMin}′ @${s.watts}W ${s.zone}</span>`;
        }).join(' ');
        const ftpE=Math.round(parseFloat(m.val)*_dSr(parseFloat(m.dur||60))*(m.vr?0.98:1));
        valDisp=`<div style="display:flex;flex-wrap:wrap;gap:3px;">${badges}</div>`;
        ltDisp=`${ftpE}W`;
      } else {
        const ftpE=Math.round(parseFloat(m.val)*_dSr(parseFloat(m.dur||60))*(m.vr?0.98:1));
        valDisp=`<b>${m.val}W · ${m.dur}min</b>`;
        ltDisp=`${ftpE}W`;
      }
    } else {
      if(m.sets && m.sets.length) {
        const badges = m.sets.map(s => {
          const eCol = s.effort==='CSS'?'#2196f3':s.effort==='Speed'?'#00e676':s.effort==='Sprint'?'var(--red)':'var(--text-dim)';
          return `<span style="font-size:9px;background:rgba(33,150,243,.1);color:${eCol};padding:1px 6px;border-radius:3px;white-space:nowrap;">${s.reps}×${s.distM}m @${_fP(s.pace)} ${s.effort}</span>`;
        }).join(' ');
        valDisp=`<div style="display:flex;flex-wrap:wrap;gap:3px;">${badges}</div>`;
        ltDisp=`${m.val}/100m`;
      } else {
        valDisp=`<b>${m.val}/100m</b>${m.dk?` · ${Math.round(m.dk*1000)}m`:''}`;
        ltDisp=`${m.val}/100m`;
      }
    }
    return `<tr style="background:rgba(206,147,216,.04)">
      <td style="white-space:nowrap;font-size:11px">${m.date}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px">${m.name||'Manual entry'} <span style="color:var(--orange);font-size:9px">★</span> <span style="background:rgba(206,147,216,.12);color:var(--purple);padding:1px 5px;border-radius:3px;font-size:9px">MANUAL</span></td>
      <td style="font-size:11px">—</td>
      <td style="font-size:11px">${valDisp}</td>
      <td style="font-size:11px">—</td>
      <td style="font-size:11px;color:var(--text-dim)">${m.hr||'—'}</td>
      <td style="color:var(--purple);font-weight:700;font-size:11px">${ltDisp}</td>
      <td>${delBtn}</td>
    </tr>`;
  }).join('');

  const ivCount = sorted.filter(a=>a.iv&&!excluded.has(String(a.id))).length;
  const hardCount = sorted.filter(a=>!a.iv&&!excluded.has(String(a.id))).length;

  extra.innerHTML = `<div class="card" style="margin-top:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <div class="sl" style="margin:0">⚡ INTERVAL SESSION EDITOR</div>
      <div style="display:flex;gap:6px">${tabs}</div>
    </div>

    <div style="background:var(--surface2);border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:11px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
      <div>
        <b style="color:${cfg.color}">${cfg.statLabel}:</b>
        <span style="color:${cfg.color};font-weight:700;margin:0 6px">${cfg.currentStat}</span>
        <span style="color:var(--text-dim);font-size:10px">from ${cfg.currentSrc}</span>
      </div>
      <div style="font-size:10px;color:var(--text-dim);">
        <span style="color:var(--green);">⚡ ${ivCount} marked as intervals</span>
        · ${hardCount} hard/candidate sessions
        · ${manuals.length} manual entries
      </div>
    </div>

    <div style="font-size:10px;color:var(--text-dim);background:rgba(255,152,0,.06);border-radius:6px;padding:8px 12px;margin-bottom:10px;border-left:3px solid var(--orange);">
      <b style="color:var(--orange);">How this works:</b>
      Showing all hard sessions as candidates.
      <b>⚡ Mark IV</b> = tells the race predictor this session's data should feed your ${cfg.statLabel}.
      <b>✏️ Edit</b> = correct the session's name, distances, lap pace, and HR.
      Only <span style="color:var(--green);">⚡ IV</span>-marked sessions affect the predictor.
      ★ = session currently setting your ${cfg.statLabel}.
    </div>

    <div style="overflow-x:auto;margin-bottom:14px;">
      <table class="tbl" style="font-size:11px;min-width:680px;">
        <thead><tr>${cfg.cols.map(c=>`<th style="font-size:10px;white-space:nowrap">${c}</th>`).join('')}</tr></thead>
        <tbody>
          ${manualRows}
          ${stravaRows || `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:16px">No sessions found. Try syncing Strava or adding a manual entry below.</td></tr>`}
        </tbody>
      </table>
    </div>

    <div style="background:var(--surface2);border:1px solid rgba(206,147,216,.2);border-radius:8px;padding:14px;margin-bottom:10px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--purple);margin-bottom:10px">+ ADD MANUAL INTERVAL</div>
      ${cfg.addFields}
      <button class="btn" style="background:var(--purple);color:#000;font-size:11px;padding:7px 18px" onclick="ivAddManual('${sport}')">Add Entry</button>
      <span id="iv-add-msg" style="font-size:10px;color:var(--green);margin-left:10px;"></span>
    </div>

    <div style="font-size:10px;color:var(--text-dim);line-height:1.8;">
      ${sport==='run'?'Rep scale for LT est: 2km+ × 1.02 · 800m-2km × 1.05 · 400-500m × 1.08':
        sport==='bike'?'FTP scale: 60min×1.0 · 45min×0.98 · 90min×0.97 · 120min×0.94 · Rouvy ×0.98':
        'CSS scale: hard×1.01 · moderate×0.97 · easy×0.95'}<br>
      ★ = session currently setting your ${cfg.statLabel} · Avg lap data auto-filled by sync.py on next sync
    </div>
  </div>`;
}

// ── Quick toggle IV flag directly from the interval review table ──────────
function ivQuickToggle(actId, markAsIv, sport) {
  const idx = STRAVA_ACTS.acts.findIndex(a => String(a.id) === String(actId));
  if(idx < 0) { showToast('Activity not found', true); return; }
  const a = STRAVA_ACTS.acts[idx];
  if(markAsIv) {
    a.iv = true;
    if(a.ef === 'easy') a.ef = 'hard'; // upgrade effort if needed
  } else {
    delete a.iv;
    // Also clear any interval detail fields
    delete a.lp; delete a.lp_km; delete a.lp_hr;
    delete a.pw; delete a.pw_min;
    delete a.lsp; delete a.lsp_m;
    delete a.alp_p; delete a.alp_km; delete a.alp_hr; delete a.alp_n; delete a.alp_w; delete a.alp_min;
  }
  // Persist
  try {
    const edits = JSON.parse(localStorage.getItem('tc26_workout_edits') || '{}');
    edits[actId] = {...a};
    localStorage.setItem('tc26_workout_edits', JSON.stringify(edits));
  } catch(e) {}
  save();
  window._predState = null;
  renderRacePredictor();
  setTimeout(() => showIntervalReview(sport), 100);
  showToast(markAsIv ? '⚡ Marked as interval — predictor updated ✓' : 'Interval flag removed ✓');
}

// ── Inline edit modal for interval session details ────────────────────────
function openIvEditModal(actId, sport) {
  const act = STRAVA_ACTS.acts.find(a => String(a.id) === String(actId));
  if(!act) { showToast('Activity not found', true); return; }

  const fP = p => { if(!p) return ''; const m=Math.floor(p),s=Math.round((p-m)*60); return m+':'+(s<10?'0':'')+s; };
  const IS = 'background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;font-size:12px;width:100%;box-sizing:border-box;';
  const LBL = 'font-size:10px;color:var(--text-dim);display:block;margin-bottom:4px;font-weight:600;letter-spacing:.5px;';

  // Sport-specific lap fields
  let lapFields = '';
  if(act.s === 'Run') {
    lapFields = `
      <div style="background:rgba(0,230,118,.05);border:1px solid rgba(0,230,118,.2);border-radius:8px;padding:14px;margin-top:8px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--green);margin-bottom:10px">🏃 RUN INTERVAL DETAILS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div>
            <label style="${LBL}">AVG LAP PACE (min:ss/km)</label>
            <input type="text" id="ive-alp-p" value="${fP(act.alp_p||act.lp)}" placeholder="4:39" style="${IS}">
            <div style="font-size:9px;color:var(--text-dim);margin-top:2px;">Avg across all work reps (not best)</div>
          </div>
          <div>
            <label style="${LBL}">AVG LAP DISTANCE (km)</label>
            <input type="number" id="ive-alp-km" step="0.01" value="${act.alp_km||act.lp_km||''}" placeholder="e.g. 1.0 for 1km reps" style="${IS}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="${LBL}">AVG LAP HR (bpm)</label>
            <input type="number" id="ive-alp-hr" value="${act.alp_hr||act.lp_hr||''}" placeholder="172" style="${IS}">
          </div>
          <div>
            <label style="${LBL}">NUMBER OF REPS</label>
            <input type="number" id="ive-alp-n" value="${act.alp_n||''}" placeholder="e.g. 5" style="${IS}">
            <div style="font-size:9px;color:var(--text-dim);margin-top:2px;">How many work reps</div>
          </div>
        </div>
      </div>`;
  } else if(act.s === 'Bike') {
    lapFields = `
      <div style="background:rgba(255,152,0,.05);border:1px solid rgba(255,152,0,.2);border-radius:8px;padding:14px;margin-top:8px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--orange);margin-bottom:10px">🚴 BIKE INTERVAL DETAILS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div>
            <label style="${LBL}">AVG LAP WATTS (NP)</label>
            <input type="number" id="ive-alp-w" value="${act.alp_w||act.pw||''}" placeholder="e.g. 265" style="${IS}">
            <div style="font-size:9px;color:var(--text-dim);margin-top:2px;">Avg NP across all work intervals</div>
          </div>
          <div>
            <label style="${LBL}">AVG LAP DURATION (min)</label>
            <input type="number" id="ive-alp-min" step="0.5" value="${act.alp_min||act.pw_min||''}" placeholder="e.g. 10" style="${IS}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="${LBL}">AVG LAP HR (bpm)</label>
            <input type="number" id="ive-alp-hr" value="${act.alp_hr||act.hr||''}" placeholder="165" style="${IS}">
          </div>
          <div>
            <label style="${LBL}">NUMBER OF INTERVALS</label>
            <input type="number" id="ive-alp-n" value="${act.alp_n||''}" placeholder="e.g. 3" style="${IS}">
          </div>
        </div>
      </div>`;
  } else if(act.s === 'Swim') {
    lapFields = `
      <div style="background:rgba(33,150,243,.05);border:1px solid rgba(33,150,243,.2);border-radius:8px;padding:14px;margin-top:8px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#2196f3;margin-bottom:10px">🏊 SWIM INTERVAL DETAILS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div>
            <label style="${LBL}">AVG LAP PACE (min:ss/100m)</label>
            <input type="text" id="ive-alp-p" value="${fP(act.alp_p||act.lsp)}" placeholder="1:46" style="${IS}">
            <div style="font-size:9px;color:var(--text-dim);margin-top:2px;">Avg across all reps (not best)</div>
          </div>
          <div>
            <label style="${LBL}">AVG REP DISTANCE (m)</label>
            <input type="number" id="ive-alp-km" step="1" value="${act.alp_km ? Math.round(act.alp_km*1000) : (act.lsp_m||'')}" placeholder="e.g. 100" style="${IS}">
            <div style="font-size:9px;color:var(--text-dim);margin-top:2px;">Enter in metres</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="${LBL}">AVG LAP HR (bpm)</label>
            <input type="number" id="ive-alp-hr" value="${act.alp_hr||act.hr||''}" placeholder="—" style="${IS}">
          </div>
          <div>
            <label style="${LBL}">NUMBER OF REPS</label>
            <input type="number" id="ive-alp-n" value="${act.alp_n||''}" placeholder="e.g. 8" style="${IS}">
          </div>
        </div>
      </div>`;
  }

  const descHint = act.desc
    ? `<div style="background:var(--surface2);border-radius:6px;padding:8px 10px;margin-bottom:12px;font-size:11px;color:var(--text-mid);border-left:3px solid var(--orange);">
        <span style="font-size:9px;color:var(--text-dim);display:block;margin-bottom:2px;">📋 STRAVA DESCRIPTION</span>
        ${act.desc.replace(/</g,'&lt;')}
       </div>` : '';

  const html = `
    <div id="iv-edit-modal-bg" onclick="closeIvEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:12px;">
      <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:14px;padding:24px;width:min(540px,98vw);max-height:94vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:${act.s==='Run'?'var(--green)':act.s==='Bike'?'var(--orange)':'#2196f3'};">EDIT INTERVAL — ${act.d}</div>
          <button class="btn sec" style="padding:4px 10px;font-size:12px;" onclick="closeIvEditModal()">✕</button>
        </div>

        ${descHint}

        <!-- 1. Session Name -->
        <div style="margin-bottom:12px;">
          <label style="${LBL}">1. SESSION NAME</label>
          <input type="text" id="ive-name" value="${(act.n||'').replace(/"/g,'&quot;')}" style="${IS}">
        </div>

        <!-- 2. Total KMs -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div>
            <label style="${LBL}">2. TOTAL KM${act.s==='Swim'?' (km)':''}</label>
            <input type="number" id="ive-dk" step="0.01" value="${act.dk||''}" style="${IS}">
          </div>
          <div>
            <label style="${LBL}">DURATION (min)</label>
            <input type="number" id="ive-mm" step="0.1" value="${act.mm||''}" style="${IS}">
          </div>
        </div>

        <!-- IV checkbox -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;background:${act.iv?'rgba(0,230,118,.06)':'var(--surface2)'};border:1px solid ${act.iv?'var(--green)':'var(--border)'};border-radius:8px;padding:10px 14px;">
          <input type="checkbox" id="ive-iv" ${act.iv?'checked':''} style="width:16px;height:16px;accent-color:var(--green);cursor:pointer;">
          <label for="ive-iv" style="font-size:12px;font-weight:700;cursor:pointer;">⚡ Mark as Interval Session (feeds Race Predictor)</label>
        </div>

        <!-- 3-5. Lap details (sport-specific) -->
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text-dim);margin-bottom:6px;">3–5. LAP DETAILS <span style="font-weight:400;color:var(--text-dim);font-size:9px">— edit if Strava auto-detection was wrong or missing</span></div>
        ${lapFields}

        <div style="font-size:10px;color:var(--text-dim);margin-top:12px;margin-bottom:14px;">
          ⚠️ These edits are stored locally and will survive page reloads, but a full Strava re-sync may overwrite them. Re-run sync.py to pull latest lap data from Strava.
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn sec" onclick="closeIvEditModal()">Cancel</button>
          <button class="btn" style="background:${act.s==='Run'?'var(--green)':act.s==='Bike'?'var(--orange)':'#2196f3'};color:#000;font-weight:700;" onclick="saveIvEdit('${actId}','${sport}')">💾 Save Interval Data</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeIvEditModal() {
  const el = document.getElementById('iv-edit-modal-bg');
  if(el) el.remove();
}

function saveIvEdit(actId, sport) {
  const idx = STRAVA_ACTS.acts.findIndex(a => String(a.id) === String(actId));
  if(idx < 0) { showToast('Activity not found', true); return; }
  const a = STRAVA_ACTS.acts[idx];

  const getNum = id => { const el=document.getElementById(id); return el&&el.value?parseFloat(el.value)||null:null; };
  const getStr = id => { const el=document.getElementById(id); return el?el.value.trim():null; };
  const parsePace = str => {
    if(!str) return null;
    const m = str.match(/(\d+):(\d+)/);
    return m ? parseInt(m[1]) + parseInt(m[2])/60 : null;
  };

  // 1. Name
  const name = getStr('ive-name');
  if(name) a.n = name;

  // 2. Total KM + duration
  const dk = getNum('ive-dk');
  const mm = getNum('ive-mm');
  if(dk) a.dk = dk;
  if(mm) a.mm = mm;

  // IV flag
  const ivCb = document.getElementById('ive-iv');
  if(ivCb) {
    if(ivCb.checked) {
      a.iv = true;
      if(a.ef==='easy') a.ef = 'hard';
    } else {
      delete a.iv;
    }
  }

  // 3-5. Sport-specific lap details
  if(a.s === 'Run') {
    const alpP  = parsePace(getStr('ive-alp-p'));
    const alpKm = getNum('ive-alp-km');
    const alpHr = getNum('ive-alp-hr');
    const alpN  = getNum('ive-alp-n');
    if(alpP)  { a.alp_p = alpP;  if(!a.lp) a.lp = alpP; }  // also set lp if not set
    if(alpKm) { a.alp_km = alpKm; if(!a.lp_km) a.lp_km = alpKm; }
    if(alpHr) { a.alp_hr = alpHr; if(!a.lp_hr) a.lp_hr = alpHr; }
    if(alpN)  a.alp_n = alpN;
  } else if(a.s === 'Bike') {
    const alpW   = getNum('ive-alp-w');
    const alpMin = getNum('ive-alp-min');
    const alpHr  = getNum('ive-alp-hr');
    const alpN   = getNum('ive-alp-n');
    if(alpW)   { a.alp_w = alpW;   if(!a.pw) a.pw = alpW; }
    if(alpMin) { a.alp_min = alpMin; if(!a.pw_min) a.pw_min = alpMin; }
    if(alpHr)  a.alp_hr = alpHr;
    if(alpN)   a.alp_n = alpN;
  } else if(a.s === 'Swim') {
    const alpP  = parsePace(getStr('ive-alp-p'));
    const alpM  = getNum('ive-alp-km');  // entered as metres in the form
    const alpHr = getNum('ive-alp-hr');
    const alpN  = getNum('ive-alp-n');
    if(alpP)  { a.alp_p = alpP;  if(!a.lsp) a.lsp = alpP; }
    if(alpM)  { a.alp_km = alpM/1000; if(!a.lsp_m) a.lsp_m = alpM; }  // store in km, convert
    if(alpHr) a.alp_hr = alpHr;
    if(alpN)  a.alp_n = alpN;
  }

  // Persist edits
  try {
    const edits = JSON.parse(localStorage.getItem('tc26_workout_edits') || '{}');
    edits[actId] = {...a};
    localStorage.setItem('tc26_workout_edits', JSON.stringify(edits));
  } catch(e) {}

  save();
  window._predState = null;
  closeIvEditModal();
  renderRacePredictor();
  setTimeout(() => showIntervalReview(sport), 100);
  showToast('Interval data saved ✓ — predictor updated');
}




// ── Pace store format helper (p in min/unit → "M:SS") ─────────────────
function _ivFmtPace(p) {
  if(!p || isNaN(p)) return '0:00';
  const m = Math.floor(p), s = Math.round((p - m) * 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}
function _ivParsePace(str) {
  const m = String(str||'').match(/(\d+):(\d{2})/);
  return m ? parseInt(m[1]) + parseInt(m[2]) / 60 : null;
}

// ── Collect bike sets from the dynamic form ────────────────────────────
function ivCollectBikeSets() {
  return Array.from(document.querySelectorAll('.iv-bike-set-row')).map(row => {
    const reps   = parseInt(row.querySelector('.iv-set-reps')?.value || 0);
    const watts  = parseInt(row.querySelector('.iv-set-watts')?.value || 0);
    const durMin = parseFloat(row.querySelector('.iv-set-dur')?.value || 0);
    const zone   = row.querySelector('.iv-set-zone')?.value || 'Z4';
    const rest   = parseFloat(row.querySelector('.iv-set-rest')?.value || 0) || null;
    return (reps > 0 && watts > 0 && durMin > 0) ? { reps, watts, durMin, zone, rest } : null;
  }).filter(Boolean);
}

// ── Collect swim sets from the dynamic form ────────────────────────────
function ivCollectSwimSets() {
  return Array.from(document.querySelectorAll('.iv-swim-set-row')).map(row => {
    const reps   = parseInt(row.querySelector('.iv-set-reps')?.value || 0);
    const distM  = parseInt(row.querySelector('.iv-set-dist')?.value || 0);
    const pace   = _ivParsePace(row.querySelector('.iv-set-pace')?.value || '');
    const effort = row.querySelector('.iv-set-effort')?.value || 'CSS';
    const rest   = parseInt(row.querySelector('.iv-set-rest')?.value || 0) || null;
    return (reps > 0 && distM > 0 && pace) ? { reps, distM, pace, effort, rest } : null;
  }).filter(Boolean);
}

// ── Dynamic row add/remove helpers ────────────────────────────────────
function ivAddBikeSet() {
  const box = document.getElementById('iv-bike-sets');
  if(!box) return;
  const row = document.createElement('div');
  row.className = 'iv-bike-set-row';
  row.style.cssText = 'display:grid;grid-template-columns:44px 72px 64px 100px 60px 28px;gap:5px;margin-bottom:5px;align-items:center;';
  row.innerHTML = `
    <input class="iv-set-reps" type="number" min="1" placeholder="3" style="width:100%;">
    <input class="iv-set-watts" type="number" placeholder="270" style="width:100%;">
    <input class="iv-set-dur" type="number" step="0.5" placeholder="25" style="width:100%;">
    <select class="iv-set-zone" style="width:100%;">
      <option value="Z5">Z5 VO2max</option>
      <option value="Z4" selected>Z4 Threshold</option>
      <option value="SS">Sweet Spot</option>
      <option value="Z3">Z3 Tempo</option>
      <option value="Z2">Z2 Endurance</option>
    </select>
    <input class="iv-set-rest" type="number" step="0.5" placeholder="5" style="width:100%;">
    <button type="button" onclick="ivRemoveBikeSet(this)" style="background:rgba(244,67,54,.15);color:var(--red);border:none;border-radius:4px;padding:5px 0;cursor:pointer;font-size:13px;width:100%;line-height:1;">×</button>`;
  box.appendChild(row);
}
function ivRemoveBikeSet(btn) {
  const row = btn.closest('.iv-bike-set-row');
  if(row && row.parentElement.querySelectorAll('.iv-bike-set-row').length > 1) row.remove();
}

function ivAddSwimSet() {
  const box = document.getElementById('iv-swim-sets');
  if(!box) return;
  const row = document.createElement('div');
  row.className = 'iv-swim-set-row';
  row.style.cssText = 'display:grid;grid-template-columns:44px 64px 88px 100px 60px 28px;gap:5px;margin-bottom:5px;align-items:center;';
  row.innerHTML = `
    <input class="iv-set-reps" type="number" min="1" placeholder="4" style="width:100%;">
    <input class="iv-set-dist" type="number" placeholder="200" style="width:100%;">
    <input class="iv-set-pace" type="text" placeholder="1:40" style="width:100%;">
    <select class="iv-set-effort" style="width:100%;">
      <option value="CSS" selected>CSS threshold</option>
      <option value="Speed">Speed / VO2</option>
      <option value="Sprint">Sprint / max</option>
      <option value="Drill">Drill / technique</option>
      <option value="Aerobic">Aerobic / easy</option>
    </select>
    <input class="iv-set-rest" type="number" placeholder="30" style="width:100%;">
    <button type="button" onclick="ivRemoveSwimSet(this)" style="background:rgba(244,67,54,.15);color:var(--red);border:none;border-radius:4px;padding:5px 0;cursor:pointer;font-size:13px;width:100%;line-height:1;">×</button>`;
  box.appendChild(row);
}
function ivRemoveSwimSet(btn) {
  const row = btn.closest('.iv-swim-set-row');
  if(row && row.parentElement.querySelectorAll('.iv-swim-set-row').length > 1) row.remove();
}

function ivAddManual(sport) {
  if(!D.ivManual) D.ivManual = [];
  const date = document.getElementById('iv-add-date')?.value || '';
  const name = document.getElementById('iv-add-name')?.value?.trim() || '';
  const msg  = document.getElementById('iv-add-msg');
  if(!date) { if(msg) { msg.style.color='var(--red)'; msg.textContent='Date required'; } return; }

  // ── BIKE: collect structured sets ───────────────────────────────────
  if(sport === 'bike') {
    const sets = ivCollectBikeSets();
    if(!sets.length) { if(msg) { msg.style.color='var(--red)'; msg.textContent='Add at least one set with reps, watts and duration'; } return; }
    const vr = document.getElementById('iv-add-vr')?.value === '1';
    const hr = parseInt(document.getElementById('iv-add-hr')?.value || 0) || null;
    // For FTP: extract best Z4/SS block (total duration of that zone)
    const ftpZones = ['Z4','SS','Z3'];
    const ftpSets  = sets.filter(s => ftpZones.includes(s.zone));
    const base     = ftpSets.length ? ftpSets : sets;
    function dSc(d){return d>=150?.91:d>=120?.94:d>=90?.97:d>=60?1:d>=45?.98:d>=30?.97:.95;}
    const best = base.reduce((b, s) => {
      const aTot = s.reps * s.durMin;
      const bTot = b.reps * b.durMin;
      const aEst = s.watts * dSc(aTot) * (vr ? 0.98 : 1);
      const bEst = b.watts * dSc(bTot) * (vr ? 0.98 : 1);
      return aEst > bEst ? s : b;
    });
    const totalDur = best.reps * best.durMin;
    D.ivManual.push({ sport, date, name, vr, hr, sets,
      val: String(best.watts),
      dur: totalDur });

  // ── SWIM: collect structured sets ───────────────────────────────────
  } else if(sport === 'swim') {
    const sets = ivCollectSwimSets();
    if(!sets.length) { if(msg) { msg.style.color='var(--red)'; msg.textContent='Add at least one set with reps, distance and pace'; } return; }
    const hr = parseInt(document.getElementById('iv-add-hr')?.value || 0) || null;
    // Find best CSS-effort set for predictor (CSS > Aerobic > Speed, bigger volume wins ties)
    const order = ['CSS','Aerobic','Speed','Sprint','Drill'];
    const sorted = [...sets].sort((a,b) => {
      const ao = order.indexOf(a.effort), bo = order.indexOf(b.effort);
      if(ao !== bo) return ao - bo;
      return (b.reps * b.distM) - (a.reps * a.distM);
    });
    const cssSet = sorted[0];
    const dk = sets.reduce((s, x) => s + x.reps * x.distM / 1000, 0);
    D.ivManual.push({ sport, date, name, hr, sets,
      val: _ivFmtPace(cssSet.pace),
      dk:  Math.round(dk * 1000) / 1000 });

  // ── RUN: unchanged simple format ────────────────────────────────────
  } else {
    const val = document.getElementById('iv-add-val')?.value?.trim() || '';
    if(!val || !/^\d+:\d{2}$/.test(val)) { if(msg) { msg.style.color='var(--red)'; msg.textContent='Pace must be M:SS (e.g. 4:05)'; } return; }
    const dk = parseFloat(document.getElementById('iv-add-dk')?.value || 0) || null;
    const hr = parseInt(document.getElementById('iv-add-hr')?.value || 0) || null;
    D.ivManual.push({ sport, date, name, val, dk, hr });
  }

  save();
  window._predState = null;
  renderRacePredictor();
  if(msg) { msg.style.color='var(--green)'; msg.textContent='✓ Saved'; setTimeout(()=>{ msg.textContent=''; }, 2500); }
  setTimeout(() => showIntervalReview(sport), 120);
}

function ivDeleteManual(idx, sport) {
  if(!D.ivManual) return;
  // idx is position within this sport's entries
  let count = 0;
  D.ivManual = D.ivManual.filter(m => {
    if(m.sport !== sport) return true;
    return count++ !== idx;
  });
  save();
  window._predState = null;
  renderRacePredictor();
  setTimeout(() => showIntervalReview(sport), 120);
}


function ivToggleExclude(id, exclude) {
  if(!D.ivExcluded) D.ivExcluded = [];
  if(exclude) {
    if(!D.ivExcluded.includes(String(id))) D.ivExcluded.push(String(id));
  } else {
    D.ivExcluded = D.ivExcluded.filter(x => x !== String(id));
  }
  save();
  // Force predictor rebuild and re-render interval panel
  window._predState = null;
  renderRacePredictor();
  setTimeout(showIntervalReview, 100);
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
      <b style="color:var(--text);">🏃 Run race paces:</b> Sprint fatigue ×1.03 · Olympic ×1.06 · 70.3 ×1.12 · Ironman ×1.26 (Friel triathlete model)<br>
      <b style="color:var(--green);">🏃 Threshold source:</b> ${R.thresholdSource||'CTL estimate'}<br>
      <b style="color:var(--text);">🚴 Bike signal:</b> W:HR efficiency (Allen & Coggan) × duration × effort.
      CTL <b style="color:var(--orange);">${(B.ctl*100).toFixed(2)}</b> → FTP ~${Math.round(B.ftp)}W<br>
      <b style="color:var(--text);">🚴 Bike race efforts:</b> Sprint ${PRED_DEFAULTS.sprint.bikePct}% FTP · Olympic ${PRED_DEFAULTS.olympic.bikePct}% · 70.3 ${PRED_DEFAULTS['70.3'].bikePct}% · IM ${PRED_DEFAULTS.ironman.bikePct}% — physics: Martin 1998 (CdA=0.32, 82kg)<br>
      <b style="color:var(--orange);">🚴 FTP source:</b> ${B.ftpSource||'CTL estimate'}<br>
      <b style="color:var(--text);">🏊 Swim signal:</b> Pace quality (Wakayoshi CSS proxy) × session length.
      CTL <b style="color:#2196f3;">${(S.ctl*100).toFixed(2)}</b> → CSS ~${_fmtSwimP(S.css)}<br>
      <b style="color:var(--text);">🏊 Swim race paces:</b> Sprint ${PRED_DEFAULTS.sprint.swimPct}% CSS · Olympic ${PRED_DEFAULTS.olympic.swimPct}% · 70.3 ${PRED_DEFAULTS['70.3'].swimPct}% · IM ${PRED_DEFAULTS.ironman.swimPct}% (shorter = faster than CSS)<br>
      <b style="color:#2196f3;">🏊 CSS source:</b> ${S.cssSource||'CTL estimate'}<br>
      <b style="color:var(--text);">❤️ HR estimates:</b> %LTHR per sport · Swim ~80-87% · Bike ~77-90% · Run ~85-95% (Friel HR zones)<br>
      <b style="color:var(--text);">Form (TSB):</b> Run ${(R.tsb*100).toFixed(1)} · Bike ${(B.tsb*100).toFixed(1)} · Swim ${(S.tsb*100).toFixed(1)}<br>
      <span style="color:var(--text-dim);font-size:10px;">References: Banister 1991, Martin et al. 1998, Allen & Coggan, Wakayoshi 1992, Friel Triathlete's Training Bible</span>
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
  const IS = 'background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;font-size:12px;width:100%;box-sizing:border-box;';
  const isIv = !!act.iv;

  // Strava description hint
  const descHint = act.desc
    ? `<div style="background:var(--surface2);border-radius:6px;padding:8px 10px;margin-bottom:12px;font-size:11px;color:var(--text-mid);border-left:3px solid var(--orange);">
        <span style="font-size:10px;color:var(--text-dim);display:block;margin-bottom:2px;">📋 Strava Description</span>
        ${act.desc.replace(/</g,'&lt;')}
       </div>` : '';

  // Signals banner — show why it was/wasn't auto-detected
  const signals = [];
  if(act.iv) signals.push('<span style="color:var(--green)">✓ auto-detected</span>');
  if(act.laps) signals.push(`${act.laps} laps`);
  if(act.elap && act.mm) {
    const ratio = act.elap / act.mm;
    if(ratio >= 1.2) signals.push(`<span style="color:var(--orange)">${ratio.toFixed(2)}× elapsed/moving (rest time)</span>`);
  }
  const signalsBanner = signals.length
    ? `<div style="font-size:10px;color:var(--text-dim);margin-bottom:10px;">Signals: ${signals.join(' · ')}</div>`
    : '';

  // Sport fields
  const sportFields = act.s === 'Run' ? `
    <div><label style="font-size:10px;color:var(--text-dim);">Dist (km)</label><input type="number" id="ew-dk" step="0.01" value="${act.dk||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Duration (min)</label><input type="number" id="ew-mm" step="0.1" value="${act.mm||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Avg HR (bpm)</label><input type="number" id="ew-hr" value="${act.hr||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Avg Pace (min/km)</label><input type="text" id="ew-p" value="${act.p?fP(act.p):''}" placeholder="5:30" style="${IS}"></div>
  ` : act.s === 'Bike' ? `
    <div><label style="font-size:10px;color:var(--text-dim);">Dist (km)</label><input type="number" id="ew-dk" step="0.1" value="${act.dk||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Duration (min)</label><input type="number" id="ew-mm" step="1" value="${act.mm||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Avg HR (bpm)</label><input type="number" id="ew-hr" value="${act.hr||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">NP Watts</label><input type="number" id="ew-nw" value="${act.nw||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Avg Watts</label><input type="number" id="ew-w" value="${act.w||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Cadence (rpm)</label><input type="number" id="ew-cad" value="${act.cad||''}" style="${IS}"></div>
  ` : `
    <div><label style="font-size:10px;color:var(--text-dim);">Dist (km)</label><input type="number" id="ew-dk" step="0.01" value="${act.dk||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Duration (min)</label><input type="number" id="ew-mm" step="0.1" value="${act.mm||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Avg HR (bpm)</label><input type="number" id="ew-hr" value="${act.hr||''}" style="${IS}"></div>
    <div><label style="font-size:10px;color:var(--text-dim);">Pace /100m</label><input type="text" id="ew-sp" value="${act.sp?fP(act.sp):''}" placeholder="1:45" style="${IS}"></div>
  `;

  // Interval detail section — sport-specific
  const ivRunFields = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px;">
      <div><label style="font-size:10px;color:var(--text-dim);">Best Rep Pace (min/km)</label><input type="text" id="ew-lp" value="${act.lp?fP(act.lp):''}" placeholder="4:39" style="${IS}"></div>
      <div><label style="font-size:10px;color:var(--text-dim);">Rep Dist (km)</label><input type="number" id="ew-lp-km" step="0.1" value="${act.lp_km||''}" placeholder="6.0" style="${IS}"></div>
      <div><label style="font-size:10px;color:var(--text-dim);">Rep HR (bpm)</label><input type="number" id="ew-lp-hr" value="${act.lp_hr||''}" style="${IS}"></div>
    </div>`;
  const ivBikeFields = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
      <div><label style="font-size:10px;color:var(--text-dim);">Best Interval NP (watts)</label><input type="number" id="ew-pw" value="${act.pw||''}" placeholder="e.g. 285" style="${IS}"></div>
      <div><label style="font-size:10px;color:var(--text-dim);">Interval Duration (min)</label><input type="number" id="ew-pw-min" step="0.5" value="${act.pw_min||''}" placeholder="e.g. 20" style="${IS}"></div>
    </div>`;
  const ivSwimFields = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
      <div><label style="font-size:10px;color:var(--text-dim);">Best Rep Pace (min/100m)</label><input type="text" id="ew-lsp" value="${act.lsp?fP(act.lsp):''}" placeholder="1:35" style="${IS}"></div>
      <div><label style="font-size:10px;color:var(--text-dim);">Rep Dist (m)</label><input type="number" id="ew-lsp-m" value="${act.lsp_m||''}" placeholder="100" style="${IS}"></div>
    </div>`;
  const ivFields = act.s==='Run' ? ivRunFields : act.s==='Bike' ? ivBikeFields : ivSwimFields;

  const efOpts = ['easy','moderate','hard','max'].map(v=>`<option value="${v}" ${act.ef===v?'selected':''}>${v}</option>`).join('');

  const html = `
    <div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;">
      <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(560px,98vw);max-height:92vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--orange);">EDIT WORKOUT — ${act.d}</div>
          <button class="btn sec sml" onclick="closeEditModal()">✕</button>
        </div>

        ${descHint}

        <div style="margin-bottom:12px;">
          <label style="font-size:10px;color:var(--text-dim);">Activity Name</label>
          <input type="text" id="ew-name" value="${(act.n||'').replace(/"/g,'&quot;')}" style="${IS}">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          ${sportFields}
          <div><label style="font-size:10px;color:var(--text-dim);">Effort Level</label><select id="ew-ef" style="${IS}"><option value="">—</option>${efOpts}</select></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Training Load</label><input type="number" id="ew-tl" value="${act.tl||''}" style="${IS}"></div>
        </div>

        <!-- INTERVAL TOGGLE -->
        <div style="border:1px solid ${isIv?'var(--green)':'var(--border)'};border-radius:8px;padding:12px;margin-bottom:14px;transition:border .2s;" id="ew-iv-box">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:4px;">
            <input type="checkbox" id="ew-iv" ${isIv?'checked':''} onchange="ewToggleIv()"
              style="width:16px;height:16px;accent-color:var(--green);cursor:pointer;">
            <span style="font-weight:700;font-size:13px;">⚡ Interval / Structured Session</span>
          </label>
          <div style="font-size:10px;color:var(--text-dim);margin-left:26px;margin-bottom:8px;">
            Mark this session as an interval workout — it will appear in the Race Predictor interval table and feed the performance models.
          </div>
          ${signalsBanner}
          <div id="ew-iv-fields" style="display:${isIv?'block':'none'};">
            <div style="font-size:10px;color:var(--text-dim);margin-bottom:6px;font-weight:600;">INTERVAL DETAILS — used directly by Race Predictor</div>
            ${ivFields}
          </div>
        </div>

        ${a.s==='Run' ? `
        <!-- LONG RUN TOGGLE -->
        <div style="border:1px solid ${isLr?'rgba(0,230,118,.4)':'var(--border)'};border-radius:8px;padding:12px;margin-bottom:14px;background:${isLr?'rgba(0,230,118,.04)':'transparent'};">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:4px;">
            <input type="checkbox" id="ew-lr" ${isLr?'checked':''}
              style="width:16px;height:16px;accent-color:var(--green);cursor:pointer;">
            <span style="font-weight:700;font-size:13px;">🏃 Long Run</span>
          </label>
          <div style="font-size:10px;color:var(--text-dim);margin-left:26px;">
            Auto-detected if ≥14km and not an interval. Tick to force-include, untick to exclude from the Long Run tab. Feeds aerobic efficiency into the race predictor.
          </div>
        </div>` : ''}

        <div style="font-size:10px;color:var(--text-dim);margin-bottom:12px;">⚠️ Changes apply to local data only. Re-syncing from Strava will overwrite manual edits.</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn sec" onclick="closeEditModal()">Cancel</button>
          <button class="btn" style="background:var(--orange);color:#000;font-weight:700;" onclick="saveWorkoutEdit(${actId})">💾 Save Changes</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function ewToggleIv() {
  const cb = document.getElementById('ew-iv');
  const fields = document.getElementById('ew-iv-fields');
  const box = document.getElementById('ew-iv-box');
  if(!cb || !fields || !box) return;
  fields.style.display = cb.checked ? 'block' : 'none';
  box.style.borderColor = cb.checked ? 'var(--green)' : 'var(--border)';
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

  // Long run flag — three-state: true (manually on), false (manually off), undefined (auto)
  if(a.s === 'Run') {
    const lrCb = document.getElementById('ew-lr');
    if(lrCb) {
      const autoWouldBe = !a.iv && (a.dk||0) >= LONG_RUN_KM;
      if(lrCb.checked && !autoWouldBe) a.lr = true;       // force ON
      else if(!lrCb.checked && autoWouldBe) a.lr = false;  // force OFF
      else delete a.lr;                                     // let auto decide
    }
  }
  if(a.s === 'Run')  a.p  = parsePace(getStr('ew-p'))  || a.p;
  if(a.s === 'Bike') { a.nw=getNum('ew-nw')||a.nw; a.w=getNum('ew-w')||a.w; a.cad=getNum('ew-cad')||a.cad; }
  if(a.s === 'Swim') a.sp = parsePace(getStr('ew-sp')) || a.sp;

  // Interval toggle + detail fields
  const ivCb = document.getElementById('ew-iv');
  if(ivCb) {
    if(ivCb.checked) {
      a.iv = true;
      if(a.ef === 'easy' || a.ef === 'moderate') a.ef = 'hard'; // auto-upgrade effort
      // Run interval details
      const lp = parsePace(getStr('ew-lp'));
      const lpKm = getNum('ew-lp-km');
      const lpHr = getNum('ew-lp-hr');
      if(lp)   a.lp    = lp;
      if(lpKm) a.lp_km = lpKm;
      if(lpHr) a.lp_hr = lpHr;
      // Bike interval details
      const pw    = getNum('ew-pw');
      const pwMin = getNum('ew-pw-min');
      if(pw)    a.pw     = pw;
      if(pwMin) a.pw_min = pwMin;
      // Swim interval details
      const lsp  = parsePace(getStr('ew-lsp'));
      const lspM = getNum('ew-lsp-m');
      if(lsp)  a.lsp   = lsp;
      if(lspM) a.lsp_m = lspM;
    } else {
      // Explicitly un-marking as interval
      delete a.iv;
      delete a.lp; delete a.lp_km; delete a.lp_hr;
      delete a.pw; delete a.pw_min;
      delete a.lsp; delete a.lsp_m;
    }
  }

  // Persist edits in localStorage under a separate key so they survive page reloads
  try {
    const edits = JSON.parse(localStorage.getItem('tc26_workout_edits') || '{}');
    edits[actId] = {...a};
    localStorage.setItem('tc26_workout_edits', JSON.stringify(edits));
  } catch(e) {}

  window._predState = null; // force predictor rebuild
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
