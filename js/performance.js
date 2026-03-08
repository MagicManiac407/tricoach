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
  ['run','bike','swim','volume','autopb'].forEach(t => {
    document.getElementById('pv-'+t).style.display = t===tab?'block':'none';
    const btn = document.getElementById('pt-'+t);
    if(btn) btn.className = t===tab?'btn':'btn sec';
  });
  if(tab==='run') renderRunCharts();
  if(tab==='bike') renderBikeCharts();
  if(tab==='swim') renderSwimCharts();
  if(tab==='volume') renderVolumeCharts();
  if(tab==='autopb') renderAutoPBs();
}

function renderPerformance() { renderRunCharts(); }

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
// The core insight: rolling average line over noisy dots = visible trend
function drawTrendChart(id, pts, opts) {
  // opts: {getValue, color, label, unit, yFmt, tipLines, refs, effortDots, rollingN, lowerIsBetter, H, emptyMsg}
  const c = setupCanvas(id); if(!c) return;
  const H = opts.H || 240;
  c.height = H;
  const ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,H);

  const filtered = pts.filter(a => { const v=opts.getValue(a); return v!=null&&!isNaN(v)&&v>0; });
  if(filtered.length < 2) { drawEmpty(ctx,c.width,H,opts.emptyMsg||'Need 2+ sessions with data'); return; }

  const vals = filtered.map(a => opts.getValue(a));
  let yMin=Math.min(...vals), yMax=Math.max(...vals);
  const pad=(yMax-yMin)*0.12||yMax*0.05||1;
  yMin-=pad; yMax+=pad;

  const pL=58, pT=22, pR=20, pB=38;
  const W=c.width, cW=W-pL-pR, cH=H-pT-pB;

  // Background
  ctx.fillStyle='var(--surface2)'; ctx.fillRect(0,0,W,H);

  // Y grid + labels
  for(let i=0;i<=5;i++) {
    const v=yMin+(yMax-yMin)*i/5;
    const y=pT+cH*(1-i/5);
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pL,y); ctx.lineTo(pL+cW,y); ctx.stroke();
    ctx.fillStyle='rgba(90,112,128,0.75)'; ctx.font='9px DM Mono,monospace';
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
      ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1; ctx.setLineDash([2,4]);
      ctx.beginPath(); ctx.moveTo(x,pT); ctx.lineTo(x,pT+cH); ctx.stroke(); ctx.setLineDash([]);
      const d=new Date(a.d+'T12:00:00');
      const lbl=d.toLocaleDateString('en-AU',{month:'short',year:'2-digit'});
      ctx.fillStyle='rgba(90,112,128,0.5)'; ctx.font='9px DM Mono,monospace';
      ctx.textAlign='center'; ctx.fillText(lbl,x,H-6); ctx.textAlign='left';
    }
  });

  // Reference lines
  (opts.refs||[]).forEach(ref=>{
    const y=yOf(ref.value);
    if(y<pT||y>pT+cH) return;
    ctx.strokeStyle=ref.color||'rgba(255,255,255,0.25)'; ctx.lineWidth=1; ctx.setLineDash([5,3]);
    ctx.beginPath(); ctx.moveTo(pL,y); ctx.lineTo(pL+cW,y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=ref.color||'rgba(255,255,255,0.4)'; ctx.font='bold 9px DM Mono,monospace';
    ctx.fillText(ref.label,pL+6,y-4);
  });

  // Area under rolling average (subtle fill)
  const N=opts.rollingN||6;
  const rolling=filtered.map((_,i)=>{
    const s=Math.max(0,i-Math.floor(N/2)), e=Math.min(filtered.length-1,i+Math.floor(N/2));
    const sl=vals.slice(s,e+1); return sl.reduce((a,b)=>a+b,0)/sl.length;
  });

  // Fill area under rolling line
  const parseColor=c=>{const m=c.match(/\d+/g);return m?`rgba(${m[0]},${m[1]},${m[2]},0.08)`:'rgba(255,255,255,0.05)';};
  ctx.fillStyle=parseColor(opts.color);
  ctx.beginPath();
  rolling.forEach((v,i)=>{ i===0?ctx.moveTo(xOf(i),yOf(v)):ctx.lineTo(xOf(i),yOf(v)); });
  ctx.lineTo(xOf(filtered.length-1),pT+cH); ctx.lineTo(pL,pT+cH); ctx.closePath(); ctx.fill();

  // Rolling average line — the hero element
  ctx.strokeStyle=opts.color; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.setLineDash([]);
  ctx.beginPath();
  rolling.forEach((v,i)=>{ i===0?ctx.moveTo(xOf(i),yOf(v)):ctx.lineTo(xOf(i),yOf(v)); });
  ctx.stroke();

  // Regression trend line
  if(filtered.length>=5){
    const n=filtered.length;
    const sx=filtered.reduce((_,__,i)=>_+i,0), sy=vals.reduce((a,b)=>a+b,0);
    const sxy=vals.reduce((s,v,i)=>s+i*v,0), sx2=filtered.reduce((s,_,i)=>s+i*i,0);
    const slope=(n*sxy-sx*sy)/(n*sx2-sx*sx||1), intc=(sy-slope*sx)/n;
    const improving=opts.lowerIsBetter?(slope<0):(slope>0);
    ctx.strokeStyle=improving?'rgba(0,230,118,0.3)':'rgba(244,67,54,0.3)';
    ctx.lineWidth=1.5; ctx.setLineDash([8,5]);
    ctx.beginPath(); ctx.moveTo(xOf(0),yOf(intc)); ctx.lineTo(xOf(n-1),yOf(intc+slope*(n-1))); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=improving?'#00e676':'#f44336'; ctx.font='bold 10px sans-serif';
    const arrow=improving?'↑ Improving':'↓ Declining';
    ctx.fillText(arrow,pL+8,pT+14);
  }

  // Individual session dots (behind rolling line visually but drawn last for tooltips)
  const ECOL={easy:'#2196f3',moderate:'#ff9800',hard:'#f44336',max:'#e040fb'};
  const ttPts=[];
  filtered.forEach((a,i)=>{
    const v=vals[i], x=xOf(i), y=yOf(v);
    const base=opts.effortDots?(ECOL[a.ef]||opts.color):opts.color;
    const isNew=i===filtered.length-1;
    // Parse hex to rgba
    let r=150,g=180,b=200;
    if(base.startsWith('#')&&base.length===7){r=parseInt(base.slice(1,3),16);g=parseInt(base.slice(3,5),16);b=parseInt(base.slice(5,7),16);}
    ctx.fillStyle=isNew?`rgba(${r},${g},${b},1)`:`rgba(${r},${g},${b},0.55)`;
    ctx.beginPath(); ctx.arc(x,y,isNew?5:2.5,0,Math.PI*2); ctx.fill();
    if(isNew){
      ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.stroke();
    }
    ttPts.push({cx:x,cy:y,lines:opts.tipLines?opts.tipLines(a,v):[fmtDate(a.d),(v).toFixed(2)]});
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
  const range=(document.getElementById('rf-range')||{value:'90'}).value;
  const noIv=(document.getElementById('rf-noiv')||{checked:true}).checked;

  const acts=filterActs('Run',{effort,minDist,range,noInterval:noIv}).filter(a=>a.ae||a.p||a.hr);
  const allActs=filterActs('Run',{minDist:5,range}).filter(a=>a.p&&a.hr);
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

  // Pace trend
  drawTrendChart('c-run-pace', acts, {
    getValue:a=>a.p, color:'#00e676', label:'min/km', lowerIsBetter:true,
    effortDots:true, rollingN:6, H:240,
    yFmt:v=>fmtPace(Math.max(0,v)),
    emptyMsg:'No matching runs — try changing filters',
    refs:[],
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `Pace: <b style="color:#00e676;">${fmtPace(v)}/km</b>`,
      `HR: ${a.hr?a.hr.toFixed(0)+'bpm':'—'}  ·  ${a.dk?a.dk.toFixed(1)+'km':'—'}`,
      `<span style="color:${a.ef==='easy'?'#2196f3':a.ef==='hard'?'#f44336':'#ff9800'};font-size:10px;">${a.ef} · ${a.n.length>30?a.n.slice(0,30)+'…':a.n}</span>`
    ]
  });

  // HR trend
  drawTrendChart('c-run-hr', acts.filter(a=>a.hr), {
    getValue:a=>a.hr, color:'#ef5350', label:'bpm', lowerIsBetter:true,
    effortDots:true, rollingN:6, H:240,
    yFmt:v=>Math.round(v)+'',
    refs:[
      {value:162,label:'Z2 ceiling 162bpm',color:'rgba(33,150,243,0.4)'},
      {value:172,label:'Z3/Z4 172bpm',color:'rgba(255,152,0,0.4)'}
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
      tDiv.innerHTML='<div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>Session</th><th>Dist</th><th>Pace</th><th>HR</th><th>Duration</th><th>AE</th><th>Effort</th></tr></thead><tbody>'+
        recent.map(a=>{
          const ec=a.ef==='easy'?'var(--blue)':a.ef==='moderate'?'var(--orange)':'var(--red)';
          const ac=a.ae>20?'var(--green)':a.ae>17?'var(--orange)':'var(--red)';
          return `<tr><td style="white-space:nowrap;">${fmtDate(a.d)}</td><td style="font-size:10px;color:var(--text-dim);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${a.n}">${a.n}</td><td>${a.dk?a.dk.toFixed(1):'—'}km</td><td style="font-family:monospace;">${a.p?fmtPace(a.p):'—'}/km</td><td>${a.hr?a.hr.toFixed(0):'—'}bpm</td><td style="color:var(--text-dim);">${a.mm?a.mm.toFixed(0):'—'}min</td><td style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:${ac};">${a.ae?a.ae.toFixed(1):'—'}</td><td><span style="font-size:10px;font-weight:600;color:${ec};">${a.ef}</span></td></tr>`;
        }).join('')+'</tbody></table></div>';
    }
  }
  // Interval table
  const iDiv=document.getElementById('interval-table');
  if(iDiv){
    const recent=ivActs.slice(-15).reverse();
    if(!recent.length){iDiv.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">No interval sessions in range</div>';return;}
    iDiv.innerHTML='<div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>Session</th><th>Dist</th><th>Avg Pace</th><th>HR</th></tr></thead><tbody>'+
      recent.map(a=>`<tr><td style="white-space:nowrap;">${fmtDate(a.d)}</td><td style="font-size:10px;color:var(--text-dim);">${a.n}</td><td>${a.dk?a.dk.toFixed(1):'—'}km</td><td style="font-family:monospace;color:var(--red);">${a.p?fmtPace(a.p):'—'}/km</td><td>${a.hr?a.hr.toFixed(0):'—'}bpm</td></tr>`).join('')+'</tbody></table></div>';
  }
}

// ===== BIKE CHARTS =====
function renderBikeCharts() {
  const rideType=(document.getElementById('bf-type')||{value:'rouvy'}).value;
  const minDur=parseFloat((document.getElementById('bf-dur')||{value:40}).value||40);
  const range=(document.getElementById('bf-range')||{value:'90'}).value;
  const acts=filterActs('Bike',{rideType,minDur,range}).filter(a=>a.nw||a.w||a.hr);

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

  // Power trend
  drawTrendChart('c-bike-np', acts.filter(a=>a.nw||a.w), {
    getValue:a=>a.nw||a.w, color:'#ff9800', label:'Watts', lowerIsBetter:false,
    effortDots:false, rollingN:6, H:240,
    yFmt:v=>Math.round(v)+'W',
    refs:[{value:230,label:'FTP ~230W',color:'rgba(244,67,54,0.5)'}],
    tipLines:(a,v)=>[
      `<span style="color:#aabbcc;font-size:10px;">${fmtDate(a.d)}</span>`,
      `NP: <b style="color:#ff9800;">${a.nw?a.nw+'W NP':'—'}</b>  Avg: ${a.w?a.w+'W':'—'}`,
      `HR: ${a.hr?a.hr+'bpm':'—'}  ·  ${a.mm?a.mm.toFixed(0)+'min':'—'}`,
      `<span style="font-size:10px;color:var(--text-dim);">${a.vr?'Rouvy':'Outdoor'} · ${a.n.length>28?a.n.slice(0,28)+'…':a.n}</span>`
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
    tDiv.innerHTML='<div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>Session</th><th>Dist</th><th>Duration</th><th>Avg W</th><th>NP</th><th>HR</th><th>W:HR</th><th>Type</th></tr></thead><tbody>'+
      recent.map(a=>{
        const ec=a.be>1.4?'var(--green)':a.be>1.1?'var(--orange)':'var(--text-dim)';
        return `<tr><td style="white-space:nowrap;">${fmtDate(a.d)}</td><td style="font-size:10px;color:var(--text-dim);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${a.n}">${a.n}</td><td>${a.dk?a.dk.toFixed(0):'—'}km</td><td>${a.mm?a.mm.toFixed(0):'—'}min</td><td style="font-family:monospace;">${a.w?a.w.toFixed(0):'—'}W</td><td style="font-family:monospace;font-weight:600;">${a.nw?a.nw.toFixed(0):'—'}W</td><td>${a.hr?a.hr.toFixed(0):'—'}bpm</td><td style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:${ec};">${a.be?a.be.toFixed(2):'—'}</td><td style="font-size:10px;color:var(--text-dim);">${a.vr?'Rouvy':'Outdoor'}</td></tr>`;
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
    tDiv.innerHTML='<div style="overflow-x:auto;"><table class="tbl"><thead><tr><th>Date</th><th>Session</th><th>Distance</th><th>Duration</th><th>Pace</th><th>HR</th></tr></thead><tbody>'+
      recent.map(a=>{
        const pc=a.sp<1.8?'var(--green)':a.sp<2.1?'var(--orange)':'var(--text-dim)';
        return `<tr><td style="white-space:nowrap;">${fmtDate(a.d)}</td><td style="font-size:10px;color:var(--text-dim);">${a.n}</td><td>${Math.round((a.dk||0)*1000)}m</td><td>${a.mm?a.mm.toFixed(0):'—'}min</td><td style="font-family:monospace;color:${pc};">${a.sp?fmtPace(a.sp):'—'}/100m</td><td>${a.hr?a.hr.toFixed(0):'—'}bpm</td></tr>`;
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


