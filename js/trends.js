// ===== TRENDS & CHARTS =====
function renderTrendPage(){
  // Build metric pills
  const pillsDiv=document.getElementById('metric-pills');
  pillsDiv.innerHTML='';
  Object.entries(METRIC_CONFIG).forEach(([key,cfg])=>{
    const active=selectedMetrics.includes(key);
    const pill=document.createElement('span');
    pill.className='metric-pill'+(active?' active':'');
    pill.style.borderColor=cfg.color;
    if(active)pill.style.background=cfg.color;
    pill.innerHTML=`<span style="width:8px;height:8px;border-radius:50%;background:${cfg.color};display:inline-block;"></span>${cfg.label}`;
    pill.onclick=()=>toggleMetric(key);
    pillsDiv.appendChild(pill);
  });
  renderChart();
}

function toggleMetric(key){
  const idx=selectedMetrics.indexOf(key);
  if(idx>-1)selectedMetrics.splice(idx,1);else selectedMetrics.push(key);
  renderTrendPage();
}

function clearMetrics(){selectedMetrics=[];renderTrendPage();}

function applyPreset(keys){
  selectedMetrics=[...keys];
  nav('trends');
}

function setChartMode(mode){
  chartMode=mode;
  document.getElementById('toggle-daily').className=mode==='daily'?'btn sml':'btn sec sml';
  document.getElementById('toggle-weekly').className=mode==='weekly'?'btn sml':'btn sec sml';
  renderChart();
}

function getChartData(){
  if(chartMode==='daily'){
    // Last 30 days
    const days=[];
    for(let i=29;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(localDateStr(d));}
    return days.map(date=>{
      const m=D.mornings.find(x=>x.date===date)||{};
      // Get session quality from planner
      const wk=getWeekKey(new Date(date));
      const plan=D.plans[wk];
      const dow=new Date(date).getDay();
      const dayIdx=dow===0?6:dow-1;
      const dayPlan=plan?.[dayIdx]||{};
      return {
        label:date.slice(5),
        hrv:m.hrv,hrv7:m.hrv7,rhr:m.rhr,sleepScore:m.sleepScore,sleepHrs:m.sleep,
        gstress:m.gstress,stress:m.stress?m.stress:null,legs:m.legs,readiness:m.readiness,
        calIn:m.calIn,calOut:m.calOut,protein:m.protein,
        sessionQuality:dayPlan.quality||null,
        trainingLoad:null,
        massage:m.recovery?.massage?1:0,foam:m.recovery?.foam?1:0,stretch:m.recovery?.stretch?1:0,
        ice:m.recovery?.ice?1:0,compression:m.recovery?.compression?1:0,nap:m.recovery?.nap?1:0,
        noRecovery:m.recovery?.none?1:0,
        supplements:m.supplements===true?1:m.supplements===false?0:null
      };
    });
  } else {
    // Last 12 weeks
    const weeks=[];
    for(let i=11;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i*7);weeks.push(getWeekKey(d));}
    return weeks.map(wk=>{
      const weekMornings=D.mornings.filter(m=>m.date>=wk&&m.date<addDays(wk,7));
      const avg=(arr,key)=>{const v=arr.filter(x=>x[key]!=null).map(x=>x[key]);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
      const plan=D.plans[wk]||{};
      let totalQ=0,qCount=0;
      DAYS.forEach((_,di)=>{if(plan[di]?.quality){totalQ+=plan[di].quality;qCount++;}});
      const manHrs=parseFloat(plan._mantotalhrs)||null;
      return {
        label:wk.slice(5),
        hrv:avg(weekMornings,'hrv'),hrv7:avg(weekMornings,'hrv7'),rhr:avg(weekMornings,'rhr'),
        sleepScore:avg(weekMornings,'sleepScore'),sleepHrs:avg(weekMornings,'sleep'),
        gstress:avg(weekMornings,'gstress'),stress:avg(weekMornings,'stress'),
        legs:avg(weekMornings,'legs'),readiness:avg(weekMornings,'readiness'),
        calIn:avg(weekMornings,'calIn'),calOut:avg(weekMornings,'calOut'),
        protein:avg(weekMornings,'protein'),
        sessionQuality:qCount?totalQ/qCount:null,
        trainingLoad: (()=>{ const tl=calcWeekTrainingLoad(wk); return tl?tl.score:null; })(),
        massage:null,foam:null,stretch:null,ice:null,compression:null,nap:null,
        noRecovery: weekMornings.length ? weekMornings.filter(m=>m.recovery?.none).length/weekMornings.length : null,
        supplements: weekMornings.length ? weekMornings.filter(m=>m.supplements===true).length/weekMornings.length : null
      };
    });
  }
}

function addDays(dateStr,n){const d=new Date(dateStr);d.setDate(d.getDate()+n);return localDateStr(d);}

function normalise(values){
  const valid=values.filter(v=>v!=null);
  if(valid.length<2)return values.map(v=>v!=null?50:null);
  const mn=Math.min(...valid),mx=Math.max(...valid);
  if(mx===mn)return values.map(v=>v!=null?50:null);
  return values.map(v=>v!=null?Math.round(((v-mn)/(mx-mn))*100):null);
}

function renderChart(){
  const canvas=document.getElementById('trend-canvas');
  const wrap=canvas.parentElement;
  canvas.width=wrap.clientWidth-32;
  canvas.height=288;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(selectedMetrics.length===0){
    document.getElementById('chart-legend').innerHTML='';
    renderInsights([]);
    return;
  }

  const data=getChartData();
  const labels=data.map(d=>d.label);
  const W=canvas.width,H=canvas.height;
  const padL=48,padR=20,padT=20,padB=36;
  const cW=W-padL-padR,cH=H-padT-padB;

  // Build series raw data first so we can compute real scale
  const seriesData=[];
  selectedMetrics.forEach(key=>{
    const cfg=METRIC_CONFIG[key];if(!cfg)return;
    const raw=data.map(d=>d[key]);
    seriesData.push({key,cfg,raw});
  });

  // Compute unified min/max across all series for Y axis
  const allVals = seriesData.flatMap(s=>s.raw).filter(v=>v!=null);
  if(!allVals.length){ renderInsights([]); return; }

  // Use per-series scale when single metric, unified when multiple
  let yMin, yMax;
  if(seriesData.length===1){
    const vals = seriesData[0].raw.filter(v=>v!=null);
    const mn=Math.min(...vals), mx=Math.max(...vals);
    const pad=(mx-mn)*0.15||mn*0.1||1;
    yMin=Math.floor(mn-pad);
    yMax=Math.ceil(mx+pad);
  } else {
    // Each series normalised 0-100 for multi-metric display
    yMin=0; yMax=100;
  }
  const yRange=yMax-yMin||1;

  // Assign normalised y positions
  seriesData.forEach(s=>{
    if(seriesData.length===1){
      s.norm=s.raw.map(v=>v!=null?((v-yMin)/yRange):null);
      if(s.cfg.invert) s.norm=s.norm.map(v=>v!=null?1-v:null);
    } else {
      s.norm=(s.cfg.invert?normalise(s.raw).map(v=>v!=null?100-v:null):normalise(s.raw)).map(v=>v!=null?v/100:null);
    }
  });

  // Y axis grid + labels
  const gridLines=5;
  ctx.lineWidth=1;
  for(let i=0;i<=gridLines;i++){
    const frac=i/gridLines;
    const y=padT+cH*(1-frac);
    ctx.strokeStyle='rgba(30,45,61,0.8)';
    ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(padL+cW,y);ctx.stroke();
    // Real value label for single metric, % for multi
    let labelVal;
    if(seriesData.length===1){
      labelVal=(yMin+yRange*frac).toFixed(seriesData[0].cfg.unit===''&&yRange>10?0:1)+(seriesData[0].cfg.unit||'');
    } else {
      labelVal=Math.round(frac*100)+'%';
    }
    ctx.fillStyle='rgba(90,112,128,0.7)';ctx.font='10px DM Mono,monospace';
    ctx.textAlign='right';
    ctx.fillText(labelVal,padL-4,y+4);
  }
  ctx.textAlign='left';

  // X axis labels
  const step=Math.ceil(labels.length/10);
  ctx.fillStyle='rgba(90,112,128,0.8)';ctx.font='9px DM Mono,monospace';
  labels.forEach((l,i)=>{
    if(i%step===0){
      const x=padL+cW*(i/Math.max(labels.length-1,1));
      ctx.fillText(l,x-12,H-4);
    }
  });

  // Draw lines + collect tooltip points — grouped by date index so multi-metric shows all series
  const tooltipByIndex = {}; // index → {x, date, entries:[{label,color,val}]}
  seriesData.forEach(({key,cfg,raw,norm})=>{
    ctx.strokeStyle=cfg.color;ctx.lineWidth=2;ctx.lineJoin='round';
    ctx.setLineDash([]);
    const points=norm.map((v,i)=>{
      if(v==null)return null;
      return{x:padL+cW*(i/Math.max(labels.length-1,1)),y:padT+cH*(1-v)};
    });
    // Line
    ctx.beginPath();let started=false;
    points.forEach(p=>{
      if(!p){started=false;return;}
      if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);
    });
    ctx.stroke();
    // Dots
    ctx.fillStyle=cfg.color;
    points.forEach((p,i)=>{
      if(!p)return;
      ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();
      const rawVal=raw[i];
      if(rawVal!=null){
        const displayVal=cfg.unit==='min/km'
          ? (()=>{const m=Math.floor(rawVal),s=Math.round((rawVal-m)*60);return m+':'+(s<10?'0':'')+s+'/km';})()
          : (Number.isInteger(rawVal)?rawVal:rawVal.toFixed(1))+(cfg.unit||'');
        if(!tooltipByIndex[i]) tooltipByIndex[i]={x:p.x, ys:[], date:data[i].date||labels[i], entries:[]};
        tooltipByIndex[i].entries.push({label:cfg.label, color:cfg.color, val:displayVal, cy:p.y});
      }
    });
  });

  // Build flat tooltip points — one per date index, show all series for that date
  const allTooltipPoints = Object.values(tooltipByIndex).map(grp => {
    // Use the topmost dot's y as the hit target, prefer the first series
    const cy = grp.entries[0]?.cy ?? 0;
    const lines = [
      `<span style="color:var(--text-dim);font-size:10px;">${grp.date}</span>`,
      ...grp.entries.map(e =>
        `<span style="color:${e.color};font-weight:600;">${e.label}:</span> <span style="font-family:'DM Mono',monospace;">${e.val}</span>`
      )
    ];
    return { cx: grp.x, cy, dotColor: grp.entries[0]?.color||'#fff', lines,
      // Store all dot cy positions for multi-highlight
      allDots: grp.entries.map(e=>({cy:e.cy, color:e.color}))
    };
  });

  // Custom register that snaps by X proximity (not euclidean distance) for multi-line charts
  (() => {
    const canvas2 = canvas;
    if(!canvas2) return;
    canvas2.style.cursor = 'crosshair';
    if(TT._overlays.has(canvas2)){
      const old=TT._overlays.get(canvas2);
      if(old.parentElement) old.parentElement.removeChild(old);
      TT._overlays.delete(canvas2);
    }
    const show = (clientX, clientY) => {
      const el = TT._getEl(); if(!el) return;
      const rect = canvas2.getBoundingClientRect();
      const scaleX = canvas2.width / rect.width;
      const mx = (clientX - rect.left) * scaleX;
      // Snap to nearest x
      let closest = null, minDx = 9999;
      allTooltipPoints.forEach(p => {
        const dx = Math.abs(mx - p.cx);
        if(dx < minDx){ minDx = dx; closest = p; }
      });
      const ov = TT._getOverlay(canvas2);
      ov.width = canvas2.width;
      if(closest && minDx < cW / Math.max(labels.length,1) * 1.5) {
        const ovCtx = ov.getContext('2d');
        // Vertical guide line
        ovCtx.strokeStyle = 'rgba(255,255,255,0.15)';
        ovCtx.lineWidth = 1; ovCtx.setLineDash([3,3]);
        ovCtx.beginPath(); ovCtx.moveTo(closest.cx, padT); ovCtx.lineTo(closest.cx, padT+cH); ovCtx.stroke();
        ovCtx.setLineDash([]);
        // Highlight all dots for this date
        (closest.allDots||[{cy:closest.cy,color:closest.dotColor}]).forEach(d=>{
          ovCtx.strokeStyle = d.color;
          ovCtx.lineWidth = 2;
          ovCtx.beginPath(); ovCtx.arc(closest.cx, d.cy, 6, 0, Math.PI*2); ovCtx.stroke();
        });
        el.innerHTML = closest.lines.join('<br>');
        el.style.display = 'block';
        let tx = clientX+16, ty = clientY-12;
        const tw = el.offsetWidth||160, th = el.offsetHeight||80;
        if(tx+tw > window.innerWidth-8) tx = clientX-tw-16;
        if(ty < 8) ty = clientY+16;
        if(ty+th > window.innerHeight-8) ty = window.innerHeight-th-8;
        el.style.left = tx+'px'; el.style.top = ty+'px';
      } else {
        el.style.display = 'none';
      }
    };
    canvas2.onmousemove  = e => show(e.clientX, e.clientY);
    canvas2.onmouseleave = () => { const el=TT._getEl();if(el)el.style.display='none'; const ov=TT._overlays.get(canvas2);if(ov)ov.width=canvas2.width; };
    canvas2.ontouchmove  = e => { e.preventDefault(); show(e.touches[0].clientX, e.touches[0].clientY); };
    canvas2.ontouchend   = () => { const el=TT._getEl();if(el)el.style.display='none'; };
  })();

  // Legend
  const legend=document.getElementById('chart-legend');
  legend.innerHTML=seriesData.map(({key,cfg,raw})=>{
    const valid=raw.filter(v=>v!=null);
    const latest=valid[valid.length-1];
    const avg=valid.length?Math.round(valid.reduce((a,b)=>a+b,0)/valid.length*10)/10:null;
    const fmt=v=>cfg.unit==='min/km'?(()=>{const m=Math.floor(v),s=Math.round((v-m)*60);return m+':'+(s<10?'0':'')+s;})():Math.round(v*10)/10;
    return`<div style="display:flex;align-items:center;gap:6px;background:var(--surface2);border-radius:6px;padding:5px 10px;"><span style="width:10px;height:3px;background:${cfg.color};display:inline-block;border-radius:2px;"></span><span style="font-size:11px;">${cfg.label}</span>${latest!=null?`<span style="font-family:'DM Mono',monospace;font-size:10px;color:${cfg.color};">${fmt(latest)}${cfg.unit}</span>`:''}${avg!=null?`<span style="font-size:10px;color:var(--text-dim);">avg ${fmt(avg)}${cfg.unit}</span>`:''}</div>`;
  }).join('');

  renderInsights(seriesData.map(s=>({...s,data})));
}

function renderInsights(series){
  const div=document.getElementById('trend-insights');
  if(!series.length||D.mornings.length<3){
    div.innerHTML='<div style="color:var(--text-dim);font-size:12px;">Build up 3+ days of morning check data to see auto-generated insights.</div>';
    return;
  }
  const M=D.mornings;
  const insights=[];
  const avg=(arr)=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
  const trend7=(key)=>{
    const d=M.slice(-7).filter(m=>m[key]!=null).map(m=>m[key]);
    if(d.length<4)return null;
    const first=avg(d.slice(0,Math.ceil(d.length/2))), last=avg(d.slice(Math.floor(d.length/2)));
    return{val:avg(d),delta:last-first,pct:first>0?(last-first)/first*100:0,n:d.length,first,last};
  };
  const trend14=(key)=>{
    const d=M.slice(-14).filter(m=>m[key]!=null).map(m=>m[key]);
    if(d.length<6)return null;
    const first=avg(d.slice(0,Math.ceil(d.length/2))), last=avg(d.slice(Math.floor(d.length/2)));
    return{val:avg(d),delta:last-first,pct:first>0?(last-first)/first*100:0,n:d.length};
  };

  // ── 1. HRV: Primary fitness/fatigue signal ─────────────────────────────
  const hrv7=trend7('hrv');
  const hrv14=trend14('hrv');
  if(hrv7){
    const base=hrv14?hrv14.val:hrv7.val;
    const current=hrv7.last;
    const drop=base-current;
    if(drop>=5&&hrv7.delta<-3){
      insights.push({type:'warn',pri:1,
        title:'⚠️ HRV Declining — Fatigue Signal',
        text:`Your HRV has dropped <b>${drop.toFixed(0)} points</b> over the past week (now ~${current.toFixed(0)}, baseline ~${base.toFixed(0)}). This is a clear fatigue accumulation signal. <b>Action:</b> Reduce total training volume by 20–30% this week, swap any hard sessions for Z2 aerobic work, and prioritise 8.5h+ sleep. Check back in 3–4 days — HRV recovery to baseline confirms adaptation is occurring.`});
    } else if(hrv7.delta>4&&hrv7.last>hrv7.first){
      insights.push({type:'good',pri:1,
        title:'✅ HRV Rising — Strong Adaptation',
        text:`HRV has climbed <b>+${hrv7.delta.toFixed(0)} points</b> this week to ~${hrv7.last.toFixed(0)}. Your body is adapting well to current training load. <b>Action:</b> This is a green light to introduce one additional quality session or extend your long workout by 10–15% this week. Don't exceed a 10% volume increase week-on-week.`});
    } else if(hrv7&&Math.abs(hrv7.delta)<2&&hrv7.n>=5){
      insights.push({type:'info',pri:3,
        title:'💡 HRV Stable',
        text:`HRV averaging ${hrv7.val.toFixed(0)} — consistent for 7 days. Stable HRV means your recovery is matching your training load. <b>Action:</b> Continue current training structure. If you've been building volume, this stability confirms it's sustainable — consider a progression week.`});
    }
  }

  // ── 2. RHR: cardiovascular stress indicator ────────────────────────────
  const rhr7=trend7('rhr');
  if(rhr7&&rhr7.val>0){
    if(rhr7.delta>=3&&rhr7.last>rhr7.first){
      insights.push({type:'warn',pri:2,
        title:'⚠️ Resting HR Elevated',
        text:`Resting HR has risen <b>+${rhr7.delta.toFixed(0)}bpm</b> this week (now ~${rhr7.last.toFixed(0)}bpm). Combined with any HRV dip, this is a reliable indicator of accumulated fatigue or early illness. <b>Action:</b> Skip or significantly reduce today's hard session. If it persists 3+ days, schedule a full rest day and evaluate training load for the block.`});
    } else if(rhr7.delta<=-3){
      insights.push({type:'good',pri:3,
        title:'✅ Resting HR Trending Down',
        text:`RHR dropped <b>${Math.abs(rhr7.delta).toFixed(0)}bpm</b> over the last week — a hallmark of aerobic fitness improving. Long Z2 sessions are doing their job. <b>Action:</b> Your aerobic base is responding. If you're mid-block, this is a good time to test your Z2 pace — you may find your threshold has shifted.`});
    }
  }

  // ── 3. Sleep Score vs Readiness correlation ────────────────────────────
  const sleepVsReady=M.filter(m=>m.sleepScore&&m.readiness&&m.sleepScore>0&&m.readiness>0);
  if(sleepVsReady.length>=7){
    const poor=sleepVsReady.filter(m=>m.sleepScore<80);
    const good=sleepVsReady.filter(m=>m.sleepScore>=85);
    if(poor.length>=3&&good.length>=3){
      const poorR=avg(poor.map(m=>m.readiness)), goodR=avg(good.map(m=>m.readiness));
      const diff=goodR-poorR;
      if(diff>=0.5){
        insights.push({type:'info',pri:2,
          title:'💡 Sleep is Your Biggest Recovery Lever',
          text:`When your sleep score is 85+, your readiness averages <b>${goodR.toFixed(1)}/5</b>. On nights under 80, it drops to <b>${poorR.toFixed(1)}/5</b> — a ${diff.toFixed(1)}-point gap. <b>Action:</b> Protect sleep above all other recovery. Set a phone-down time 30min before bed. In triathlon, no supplement or recovery tool matches consistent 8.5h quality sleep for adaptation.`});
      }
    }
  }

  // ── 4. Sleep hours recent average ─────────────────────────────────────
  const sleep7=trend7('sleep');
  if(sleep7&&sleep7.val>0){
    if(sleep7.val<7.5){
      insights.push({type:'warn',pri:2,
        title:'⚠️ Chronic Sleep Deficit',
        text:`You're averaging only <b>${sleep7.val.toFixed(1)} hours</b> of sleep over the last 7 days. For a triathlete with 3-discipline training load, the minimum for full adaptation is 8h, with 8.5–9h optimal. <b>Action:</b> A 1-hour sleep deficit compounds across a training week — prioritise an early bedtime tonight. Even 2 extra hours this week meaningfully impacts HRV recovery and performance.`});
    } else if(sleep7.val>=8.5){
      insights.push({type:'good',pri:4,
        title:'✅ Sleep Volume Excellent',
        text:`Averaging <b>${sleep7.val.toFixed(1)} hours</b> — you're in the optimal range for triathlon adaptation. <b>Action:</b> Consistency matters more than any single night. Keep protecting this habit through race week — sleep debt in the final 3 days before a race cannot be paid back.`});
    }
  }

  // ── 5. Recovery compliance and effectiveness ───────────────────────────
  const withRecovery=M.filter(m=>m.recovery&&Object.keys(m.recovery).length>0);
  if(withRecovery.length>=7){
    const noDays=withRecovery.filter(m=>m.recovery.none===true);
    const noneRate=noDays.length/withRecovery.length;
    if(noneRate>=0.5){
      insights.push({type:'warn',pri:3,
        title:'⚠️ Recovery Work Missing Most Days',
        text:`No recovery work logged on <b>${Math.round(noneRate*100)}%</b> of days. In triathlon, training stress without recovery produces breakdown, not adaptation. <b>Action:</b> Start with the minimum viable routine: 10 min foam rolling + 5 min hip flexor stretch daily. These two alone reduce DOMS by ~40% and protect injury risk on back-to-back days.`});
    }
    // Test which modalities actually correlate with next-day HRV
    const modalities=[['massage','Massage gun'],['foam','Foam rolling'],['stretch','Stretching'],['ice','Ice bath/contrast'],['compression','Compression'],['nap','Napping']];
    const bestMod=[];
    modalities.forEach(([key,label])=>{
      const withIt=withRecovery.filter(m=>m.recovery[key]&&m.hrv);
      const withoutIt=withRecovery.filter(m=>!m.recovery[key]&&!m.recovery.none&&m.hrv);
      if(withIt.length>=3&&withoutIt.length>=3){
        const wH=avg(withIt.map(m=>m.hrv)), woH=avg(withoutIt.map(m=>m.hrv));
        if(wH-woH>=2.5) bestMod.push({label,delta:wH-woH});
      }
    });
    if(bestMod.length>0){
      bestMod.sort((a,b)=>b.delta-a.delta);
      const top=bestMod[0];
      insights.push({type:'good',pri:3,
        title:`✅ ${top.label} — Measurable HRV Boost`,
        text:`Days with <b>${top.label.toLowerCase()}</b> show HRV averaging <b>+${top.delta.toFixed(1)} points</b> higher than days without it. That's not noise — it's your nervous system responding. <b>Action:</b> Make ${top.label.toLowerCase()} a non-negotiable post-session habit, especially after hard intervals or long sessions.`});
    }
  }

  // ── 6. Garmin stress vs readiness ─────────────────────────────────────
  const stressData=M.filter(m=>m.gstress>0&&m.readiness>0);
  if(stressData.length>=8){
    const stressVals=stressData.map(m=>m.gstress);
    const medStress=stressVals.sort((a,b)=>a-b)[Math.floor(stressVals.length/2)];
    const highStress=stressData.filter(m=>m.gstress>medStress+12);
    const lowStress=stressData.filter(m=>m.gstress<=medStress);
    if(highStress.length>=3&&lowStress.length>=3){
      const highR=avg(highStress.map(m=>m.readiness)), lowR=avg(lowStress.map(m=>m.readiness));
      if(lowR-highR>=0.6){
        insights.push({type:'info',pri:3,
          title:'💡 Life Stress Is Costing You Readiness',
          text:`High Garmin stress days (>${(medStress+12).toFixed(0)}) average readiness <b>${highR.toFixed(1)}/5</b> vs <b>${lowR.toFixed(1)}/5</b> on calmer days. Life stressors and training stress share the same recovery pool. <b>Action:</b> On days with high life stress, switch hard sessions to easy Z2 — same training time, far less systemic demand. A backed-off session beats a missed session.`});
      }
    }
  }

  // ── 7. Supplements compliance ──────────────────────────────────────────
  const suppLogged=M.filter(m=>m.supplements!==null&&m.supplements!==undefined);
  if(suppLogged.length>=8){
    const skipped=suppLogged.filter(m=>m.supplements===false);
    const skipRate=skipped.length/suppLogged.length;
    if(skipRate>=0.35){
      insights.push({type:'warn',pri:4,
        title:'⚠️ Supplement Compliance Low',
        text:`Supplements skipped <b>${Math.round(skipRate*100)}%</b> of days. Inconsistent intake eliminates any benefit from cycling or timing protocols. <b>Action:</b> Leave supplements next to your morning alarm — habit stacking with an existing routine is the most reliable compliance fix.`});
    }
    const suppHRV=M.filter(m=>m.supplements===true&&m.hrv);
    const noSuppHRV=M.filter(m=>m.supplements===false&&m.hrv);
    if(suppHRV.length>=4&&noSuppHRV.length>=4){
      const sH=avg(suppHRV.map(m=>m.hrv)), nH=avg(noSuppHRV.map(m=>m.hrv));
      if(sH-nH>=3){
        insights.push({type:'info',pri:4,
          title:'💡 Supplements Correlate With Higher HRV',
          text:`Days with supplements average HRV <b>${sH.toFixed(0)}</b> vs <b>${nH.toFixed(0)}</b> on skipped days (+${(sH-nH).toFixed(0)} pts). That's a meaningful signal — likely magnesium and omega-3 driving parasympathetic recovery. <b>Action:</b> Keep consistent for 4 more weeks to confirm the pattern.`});
      }
    }
  }

  // ── 8. Nutrition: fuelling for training load ───────────────────────────
  const calData=M.filter(m=>m.calIn>0&&m.hrv>0);
  if(calData.length>=7){
    const calVals=calData.map(m=>m.calIn).sort((a,b)=>a-b);
    const medCal=calVals[Math.floor(calVals.length/2)];
    const underFuelled=calData.filter(m=>m.calIn<medCal*0.85);
    const wellFuelled=calData.filter(m=>m.calIn>=medCal);
    if(underFuelled.length>=3&&wellFuelled.length>=3){
      const uH=avg(underFuelled.map(m=>m.hrv)), wH=avg(wellFuelled.map(m=>m.hrv));
      if(wH-uH>=3){
        insights.push({type:'info',pri:3,
          title:'💡 Under-Fuelling is Suppressing Your HRV',
          text:`Days with lower calorie intake (under ${Math.round(medCal*0.85)} kcal) average HRV <b>${uH.toFixed(0)}</b> vs <b>${wH.toFixed(0)}</b> on better-fuelled days. In triathlon, chronic undereating is the #1 hidden performance limiter. <b>Action:</b> On days after long sessions (90min+), actively target 300–500 kcal above your normal intake within 2 hours post-session.`});
      }
    }
  }

  // ── 9. Consecutive fatigue detection ──────────────────────────────────
  const last5=M.slice(-5);
  const last5hrv=last5.filter(m=>m.hrv>0);
  const last5ready=last5.filter(m=>m.readiness>0);
  const last5legs=last5.filter(m=>m.legs>0);
  if(last5hrv.length>=4&&last5ready.length>=4){
    const avgHRV5=avg(last5hrv.map(m=>m.hrv));
    const avgReady5=avg(last5ready.map(m=>m.readiness));
    const avgLegs5=last5legs.length>=3?avg(last5legs.map(m=>m.legs)):null;
    const allPoor=avgReady5<2.5&&(avgHRV5<(hrv14?hrv14.val*0.92:0));
    const legsDown=avgLegs5!==null&&avgLegs5<=2;
    if(allPoor||(legsDown&&avgReady5<2.8)){
      insights.push({type:'warn',pri:1,
        title:'🚨 Overreach Warning — Mandatory Easy Week',
        text:`Multiple markers are flagging: ${allPoor?`HRV ~${avgHRV5.toFixed(0)} (below baseline), readiness ${avgReady5.toFixed(1)}/5`:''}${legsDown?`, leg freshness only ${avgLegs5.toFixed(1)}/5`:''}. This pattern over 5 consecutive days is a textbook overreach signal. <b>Action:</b> Mandatory easy week — cut total volume 30–40%, zero hard sessions, prioritise sleep and nutrition. Train through this and injury probability rises sharply.`});
    }
  }

  // ── 10. Training Load vs Recovery balance (weekly pattern) ────────────
  if(STRAVA_ACTS&&typeof calcWeekTrainingLoad==='function'){
    const today=new Date();
    const weeks=[];
    for(let i=3;i>=0;i--){
      const d=new Date(today);d.setDate(d.getDate()-i*7);
      const wk=getWeekKey(d);
      const tl=calcWeekTrainingLoad(wk);
      weeks.push({wk,score:tl?tl.score:null,label:tl?tl.label:null});
    }
    const scored=weeks.filter(w=>w.score!==null);
    if(scored.length>=3){
      const recent=scored[scored.length-1];
      const prev=scored[scored.length-2];
      const prevPrev=scored[scored.length-3];
      if(recent.score>75&&prev.score>70&&prevPrev.score>65){
        insights.push({type:'warn',pri:2,
          title:'⚠️ Three Consecutive High-Load Weeks',
          text:`Training load scores: ${prevPrev.score}→${prev.score}→${recent.score}. Three hard weeks without a down week violates the basic periodisation rule. <b>Action:</b> Next week must be a recovery week (target load score under 50). Skip this and you risk a forced rest from overuse injury. The rule: 3 weeks build, 1 week recover.`});
      } else if(recent.score<30&&prev.score<35&&scored.length>=3){
        insights.push({type:'warn',pri:3,
          title:'💡 Training Load Has Been Very Low',
          text:`Load scores over recent weeks: ${prevPrev.score}→${prev.score}→${recent.score}. Low consistent load means fitness is slowly declining. <b>Action:</b> Plan a structured progression — add one session type per week (e.g. second run, or longer swim). Small consistent increases beat irregular big weeks every time.`});
      }
    }
  }

  // ── 11. Pattern: what day of week is hardest ──────────────────────────
  if(M.length>=14){
    const byDow={};
    M.filter(m=>m.readiness>0).forEach(m=>{
      const dow=new Date(m.date+'T12:00:00').getDay();
      if(!byDow[dow])byDow[dow]=[]; byDow[dow].push(m.readiness);
    });
    const dowAvg=Object.entries(byDow).filter(([,v])=>v.length>=3).map(([d,v])=>({d:parseInt(d),avg:avg(v),n:v.length}));
    if(dowAvg.length>=4){
      const worst=dowAvg.sort((a,b)=>a.avg-b.avg)[0];
      const best=dowAvg.sort((a,b)=>b.avg-a.avg)[0];
      const dowNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      if(best.avg-worst.avg>=0.8){
        insights.push({type:'info',pri:4,
          title:`💡 Schedule Insight: ${dowNames[worst.d]} is Your Hardest Recovery Day`,
          text:`${dowNames[worst.d]} readiness averages <b>${worst.avg.toFixed(1)}/5</b> — your lowest. ${dowNames[best.d]} averages <b>${best.avg.toFixed(1)}/5</b> — your best. <b>Action:</b> Place your key hard sessions on ${dowNames[best.d]} when you're freshest, and make ${dowNames[worst.d]} a recovery or easy Z2 day. Aligning intensity with your natural rhythm compounds over a season.`});
      }
    }
  }

  // ── Sort by priority and render ───────────────────────────────────────
  insights.sort((a,b)=>(a.pri||5)-(b.pri||5));

  if(!insights.length){
    insights.push({type:'info',pri:5,
      title:'💡 Keep Logging — Patterns Are Building',
      text:'Keep logging daily morning checks — meaningful correlations surface after 7–14 days of consistent data. The more metrics you fill in (HRV, sleep, legs, calories), the richer and more specific these insights become.'});
  }

  div.innerHTML=`
    <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px;font-weight:600;margin-bottom:10px;">
      ${insights.length} INSIGHT${insights.length!==1?'S':''} · Based on your last ${M.length} logged days
    </div>
    ${insights.map(i=>`
    <div style="display:flex;gap:12px;padding:12px 16px;background:${i.type==='good'?'rgba(0,230,118,.06)':i.type==='warn'?'rgba(244,67,54,.06)':'var(--surface2)'};border:1px solid ${i.type==='good'?'rgba(0,230,118,.25)':i.type==='warn'?'rgba(244,67,54,.25)':'var(--border)'};border-radius:10px;margin-bottom:10px;">
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:700;color:${i.type==='good'?'var(--green)':i.type==='warn'?'var(--red)':'var(--text)'};margin-bottom:5px;line-height:1.3;">${i.title}</div>
        <div style="font-size:12px;color:var(--text-mid);line-height:1.65;">${i.text}</div>
      </div>
    </div>`).join('')}`;
}

// ===== CHECK-IN WEEK NAVIGATOR =====
// Tracks which week the check-in form is currently showing
let _ciWeekKey = null; // Monday of the displayed week

function _sundayOfWeek(weekKey) {
  // weekKey = Monday YYYY-MM-DD. Return Sunday date string.
  const d = new Date(weekKey + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  return localDateStr(d);
}

function _formatCILabel(weekKey) {
  const sun = _sundayOfWeek(weekKey);
  const d = new Date(sun + 'T12:00:00');
  return 'Week ending ' + d.toLocaleDateString('en-AU', {day:'numeric', month:'short', year:'numeric'});
}

function initCIWeek() {
  // Only set to current week if not already initialised
  if (!_ciWeekKey) _ciWeekKey = getWeekKey(new Date());
  _applyCIWeek();
}

function _applyCIWeek() {
  const sun = _sundayOfWeek(_ciWeekKey);
  document.getElementById('ci-date').value = sun;
  const lbl = document.getElementById('ci-week-label');
  if (lbl) lbl.textContent = _formatCILabel(_ciWeekKey);
  // Disable → if already on current week
  const nextBtn = document.getElementById('ci-next-btn');
  if (nextBtn) nextBtn.disabled = (_ciWeekKey >= getWeekKey(new Date()));
  // Load saved check-in for this week (or clear the form if none exists)
  _loadCIFormData(sun);
}

function _loadCIFormData(sundayDate) {
  // Find a saved check-in for this week's Sunday
  const saved = (D.checkins || []).find(c => c.date === sundayDate);

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  const setSelect = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

  if (saved) {
    // Pre-populate all form fields from the saved check-in
    setVal('ci-block',     saved.block || '');
    setVal('ci-hours',     saved.hours || '');
    setVal('ci-hrv',       saved.hrvAvg || '');
    setSelect('q1', saved.q1 || '');
    setSelect('q2', saved.q2 || '');
    setSelect('q3', saved.q3trend || '');
    setSelect('q4', saved.q4 || '');
    setSelect('q5', saved.q5 || '');
    setSelect('q6', saved.q6 || '');
    setSelect('q7', saved.q7 || '');
    setSelect('q8', saved.q8 || '');
    setVal('ci-failed',    saved.failedNote || '');
    setVal('ci-intention', saved.intention || '');
    setVal('ci-recap',     saved.recap || '');
    // Restore score button states for nutrition / lifestress / recovery
    const scoreMap = {
      nutrition:         'ci-nut-btns',
      recovery_protocol: 'ci-rec-btns',
      lifestress:        'ci-stress-btns'
    };
    Object.entries(scoreMap).forEach(([key, rowId]) => {
      const val = saved[key];
      ciScores[key] = val || null;
      const row = document.getElementById(rowId);
      if (row && val) {
        row.querySelectorAll('button').forEach((btn, i) => {
          btn.className = 'sb' + (i + 1 === parseInt(val) ? ' s' + val : '');
        });
      } else if (row) {
        row.querySelectorAll('button').forEach(btn => btn.className = 'sb');
      }
    });
    // Restore the score display
    window._ciScore = saved.score;
    const scoreBig = document.getElementById('ci-score-big');
    if (scoreBig && saved.score) {
      scoreBig.textContent = saved.score + '/10';
      scoreBig.style.color = saved.score >= 8 ? 'var(--green)' : saved.score >= 5 ? 'var(--orange)' : 'var(--red)';
      document.getElementById('ci-result').style.display = 'block';
    }
    showToast('📋 Loaded saved check-in for this week');
  } else {
    // No saved check-in — clear all subjective fields so previous week doesn't bleed through
    setVal('ci-block', ''); setVal('ci-hours', ''); setVal('ci-hrv', '');
    setVal('ci-failed', ''); setVal('ci-intention', ''); setVal('ci-recap', '');
    ['q1','q2','q3','q4','q5','q6','q7','q8'].forEach(id => setSelect(id, ''));
    window._ciScore = undefined;
    const scoreBig = document.getElementById('ci-score-big');
    if (scoreBig) { scoreBig.textContent = '—/10'; scoreBig.style.color = 'var(--text-dim)'; }
    const result = document.getElementById('ci-result');
    if (result) result.style.display = 'none';
  }
}

function ciPrevWeek() {
  const d = new Date(_ciWeekKey + 'T12:00:00');
  d.setDate(d.getDate() - 7);
  _ciWeekKey = getWeekKey(d);
  _applyCIWeek();
  if (typeof autoFillCI === 'function') autoFillCI();
}

function ciNextWeek() {
  const cur = getWeekKey(new Date());
  if (_ciWeekKey >= cur) return; // Can't go past current week
  const d = new Date(_ciWeekKey + 'T12:00:00');
  d.setDate(d.getDate() + 7);
  _ciWeekKey = getWeekKey(d);
  _applyCIWeek();
  if (typeof autoFillCI === 'function') autoFillCI();
}

// ===== CHECK-IN =====

function autoFillCI() {
  const ciDate = document.getElementById('ci-date')?.value;
  const wk = ciDate ? getWeekKey(new Date(ciDate+'T12:00:00')) : currentWeekKey;
  const prevWk = (()=>{ const d=new Date(wk+'T12:00:00'); d.setDate(d.getDate()-7); return getWeekKey(d); })();

  // ── Training load ────────────────────────────────────────────────
  const t = calcWeekTotalsFromStrava(wk);
  document.getElementById('ci-run-km').textContent   = t.runKm>0   ? t.runKm.toFixed(1)          : '—';
  document.getElementById('ci-swim-m').textContent   = t.swimKm>0  ? (t.swimKm*1000).toFixed(0)+'m' : '—';
  document.getElementById('ci-bike-km').textContent  = t.bikeKm>0  ? t.bikeKm.toFixed(0)         : '—';
  document.getElementById('ci-total-hrs').textContent= t.totalMin>0? (t.totalMin/60).toFixed(1)+'h': '—';
  document.getElementById('ci-sessions-detail').textContent = t.totalSessions>0
    ? t.totalSessions+' sessions · '+[t.runSessions?t.runSessions+' runs':'',t.swimSessions?t.swimSessions+' swims':'',t.bikeSessions?t.bikeSessions+' bikes':''].filter(Boolean).join(', ')
    : 'No Strava data found — run python3 sync.py first';

  // Save for saveCI
  document.getElementById('ci-hours').value = t.totalMin>0 ? (t.totalMin/60).toFixed(1) : '';

  // ── HRV this week vs last ────────────────────────────────────────
  const [wkStart, wkEnd] = weekDateRange(wk);
  const [prevStart, prevEnd] = weekDateRange(prevWk);
  const thisWeekMornings = D.mornings.filter(m => m.date >= wkStart && m.date <= wkEnd);
  const prevWeekMornings = D.mornings.filter(m => m.date >= prevStart && m.date <= prevEnd);

  const avgHRV = arr => { const v=arr.filter(m=>m.hrv>0).map(m=>m.hrv); return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null; };
  const avgSleep = arr => { const v=arr.filter(m=>m.sleep>0).map(m=>m.sleep); return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10:null; };
  const avgSleepScore = arr => { const v=arr.filter(m=>m.sleepScore>0).map(m=>m.sleepScore); return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null; };

  const thisHRV  = avgHRV(thisWeekMornings);
  const prevHRV  = avgHRV(prevWeekMornings);
  const thisSleep= avgSleep(thisWeekMornings);
  const prevSleep= avgSleep(prevWeekMornings);
  const thisSleepScore= avgSleepScore(thisWeekMornings);

  // HRV display
  const hrvEl = document.getElementById('ci-hrv-display');
  const hrvTrend = document.getElementById('ci-hrv-trend');
  const hrvAuto = document.getElementById('ci-hrv-autotext');
  if(thisHRV) {
    hrvEl.textContent = thisHRV;
    document.getElementById('ci-hrv').value = thisHRV;
    if(prevHRV) {
      const diff = thisHRV - prevHRV;
      const up = diff >= 2;
      const down = diff <= -2;
      hrvEl.style.color = up?'var(--green)':down?'var(--red)':'var(--text)';
      hrvTrend.innerHTML = (up?'<span style="color:var(--green)">📈 +'+diff+' vs last week</span>':down?'<span style="color:var(--red)">📉 '+diff+' vs last week</span>':'<span style="color:var(--text-dim)">➡️ Stable ('+prevHRV+'→'+thisHRV+')</span>');
      hrvAuto.innerHTML = up?'<span style="color:var(--green)">Auto: trending up ↑</span>':down?'<span style="color:var(--red)">Auto: trending down ↓</span>':'<span style="color:var(--text-dim)">Auto: stable</span>';
      document.getElementById('q6').value = up?'2':down?'0':'1';
    } else {
      hrvEl.style.color = 'var(--text)';
      hrvTrend.textContent = thisWeekMornings.length+' readings this week';
    }
  } else {
    hrvEl.textContent = '—'; hrvEl.style.color='var(--text-dim)';
    hrvTrend.textContent = 'No morning data';
  }

  // Sleep display — primary metric is Sleep Score (not hours)
  const sleepEl = document.getElementById('ci-sleep-display');
  const sleepTrend = document.getElementById('ci-sleep-trend');
  const sleepAuto = document.getElementById('ci-sleep-autotext');
  if(thisSleepScore) {
    sleepEl.textContent = thisSleepScore;
    const goodSleep = thisSleepScore >= 80 && (thisSleep||0) >= 7.5;
    sleepEl.style.color = thisSleepScore>=80?'var(--green)':thisSleepScore>=70?'var(--orange)':'var(--red)';
    const prevSleepScore = avgSleepScore(prevWeekMornings);
    if(prevSleepScore) {
      const diff = thisSleepScore - prevSleepScore;
      sleepTrend.innerHTML = diff>=3?'<span style="color:var(--green)">📈 +'+diff+' pts vs last week</span>':diff<=-3?'<span style="color:var(--orange)">📉 '+diff+' pts vs last week</span>':'<span style="color:var(--text-dim)">➡️ Similar to last week ('+(thisSleep||'?')+'h avg)</span>';
    } else {
      sleepTrend.textContent = thisSleep ? thisSleep+'h avg sleep' : 'Score avg this week';
    }
    const q7val = thisSleepScore>=80&&(thisSleep||0)>=7.5?'good':thisSleepScore<70||(thisSleep||9)<7?'bad':'ok';
    document.getElementById('q7').value = q7val;
    const q7labels = {good:'✅ Consistent — auto-set',ok:'⚠️ Hit and miss — auto-set',bad:'❌ Poor — auto-set'};
    if(sleepAuto) sleepAuto.innerHTML = '<span style="color:var(--text-dim)">'+q7labels[q7val]+'</span>';
  } else if(thisSleep) {
    sleepEl.textContent = thisSleep+'h';
    const goodSleep = thisSleep >= 8.5;
    sleepEl.style.color = goodSleep?'var(--green)':thisSleep<7.5?'var(--red)':'var(--orange)';
    sleepTrend.textContent = 'No sleep score data — using hours';
    const q7val = goodSleep?'good':thisSleep<7?'bad':'ok';
    document.getElementById('q7').value = q7val;
  } else {
    sleepEl.textContent='—'; sleepEl.style.color='var(--text-dim)';
    sleepTrend.textContent='No morning data this week';
  }

  // ── Training Load Score (replaces Z2 pace) ────────────────────────
  const tl = calcWeekTrainingLoad(wk);
  const tlEl    = document.getElementById('ci-z2pace-display');
  const tlTrend = document.getElementById('ci-z2pace-trend');
  const tlAuto  = document.getElementById('ci-z2-autotext');
  const tlLabel = document.querySelector('[data-ci-label="z2pace"]'); // label element if any

  if(tl) {
    if(tlEl) { tlEl.textContent = tl.score; tlEl.style.color = tl.color; tlEl.style.fontSize = '28px'; }
    if(tlTrend) tlTrend.innerHTML = '<span style="color:var(--text-dim);">' + tl.label + ' · ' + tl.detail + '</span>';

    // Compare to last week's load
    const prevTl = calcWeekTrainingLoad(prevWk);
    if(prevTl && tlAuto) {
      const diff = tl.score - prevTl.score;
      const up = diff >= 5, down = diff <= -5;
      tlAuto.innerHTML = up
        ? '<span style="color:var(--green)">Auto: ↑ +' + diff + ' pts vs last week</span>'
        : down
        ? '<span style="color:var(--orange)">Auto: ↓ ' + diff + ' pts vs last week</span>'
        : '<span style="color:var(--text-dim)">Auto: similar to last week</span>';
    }
    // Auto-set Q3 based on load vs last week
    if(prevTl) {
      const diff = tl.score - prevTl.score;
      document.getElementById('q3').value = diff >= 5 ? 'improving' : diff <= -5 ? 'declining' : 'holding';
    }
  } else {
    if(tlEl) { tlEl.textContent = '—'; tlEl.style.color = 'var(--text-dim)'; }
    if(tlTrend) tlTrend.textContent = 'No Strava data — run sync first';
    if(tlAuto) tlAuto.textContent = '';
  }

  showToast('✅ Auto-filled from your week data');
}

function weekDateRange(wk) {
  const [y,m,d]=wk.split('-').map(Number);
  const end=new Date(y,m-1,d+6);
  const endStr=end.getFullYear()+'-'+String(end.getMonth()+1).padStart(2,'0')+'-'+String(end.getDate()).padStart(2,'0');
  return [wk, endStr];
}

function calcCI(){
  const q1=parseInt(document.getElementById('q1').value)||0;
  const q2=parseInt(document.getElementById('q2').value)||0;
  const q4=parseInt(document.getElementById('q4').value)||0;
  const q6=parseInt(document.getElementById('q6').value)||0;
  const q8=parseInt(document.getElementById('q8').value)||0;
  const total=q1+q2+q4+q6+q8;
  window._ciScore=total;
  const el=document.getElementById('ci-score-big');
  el.textContent=total+'/10';
  el.style.color=total>=8?'var(--green)':total>=5?'var(--orange)':'var(--red)';
  let rec;
  if(total>=8)rec=`<div class="dbox g"><div class="dbox-t">🟢 INCREASE LOAD</div><ul><li>Add 10–15min to one Z2 session next week</li><li>Keep hard session targets identical</li><li>If Z2 pace improved, tighten one target by 5sec/km or 5W next block</li></ul></div>`;
  else if(total>=5)rec=`<div class="dbox a"><div class="dbox-t">🟡 HOLD LOAD</div><ul><li>Keep volume identical</li><li>Investigate which session caused the drop</li><li>Fix zone discipline before adding volume</li></ul></div>`;
  else rec=`<div class="dbox r"><div class="dbox-t">🔴 REDUCE LOAD</div><ul><li>Cut all Z2 sessions by 30%</li><li>Drop to 2 hard sessions — remove lowest quality</li><li>Add one full rest day</li><li>Two consecutive weeks below 5 = mandatory full deload</li></ul></div>`;
  document.getElementById('ci-rec').innerHTML=rec;
  document.getElementById('ci-result').style.display='block';
}

async function saveCI(){
  if(window._ciScore===undefined)calcCI();
  const ciDate = document.getElementById('ci-date').value;
  if(!ciDate){ showToast('Please set a check-in date', true); return; }

  // Collect all dropdown answers
  const getVal = id => { const el=document.getElementById(id); return el ? el.value : ''; };
  const entry = {
    date:     ciDate,
    block:    getVal('ci-block'),
    hours:    parseFloat(getVal('ci-hours'))||null,
    hrvAvg:   parseFloat(getVal('ci-hrv'))||null,
    sleepScore: parseFloat(document.getElementById('ci-sleep-display')?.textContent)||null,
    score:    window._ciScore||0,
    // All question answers
    q1:       getVal('q1'),
    q2:       getVal('q2'),
    q3trend:  getVal('q3'),
    q4:       getVal('q4'),
    q5:       getVal('q5'),
    q6:       getVal('q6'),
    q7:       getVal('q7'),
    q8:       getVal('q8'),
    failedNote: getVal('ci-failed'),
    nutrition:  ciScores.nutrition||null,
    recovery_protocol: ciScores.recovery_protocol||null,
    lifestress: ciScores.lifestress||null,
    intention:  getVal('ci-intention'),
    recap:      getVal('ci-recap'),
    timestamp:  Date.now()
  };

  // Update existing entry for same date, or push new one
  const existingIdx = D.checkins.findIndex(c => c.date === ciDate);
  const isUpdate = existingIdx >= 0;
  if(isUpdate){ D.checkins[existingIdx] = entry; } else { D.checkins.push(entry); }

  // ── Persist: localStorage first, then immediate Supabase push ──
  // IMPORTANT: We push to Supabase immediately (not debounced) so that if the
  // user refreshes the page, loadFromSupabase() gets the updated data.
  // A debounced save would lose the entry if the page is refreshed within 2s.
  localStorage.setItem('tc26v4', JSON.stringify(D));
  if(supa && currentUser){
    clearTimeout(_saveDebounce);
    showToast('💾 Saving...');
    await pushToSupabase();
    showToast(isUpdate ? 'Check-in updated ✓ (synced)' : 'Check-in saved ✓ (synced)');
  } else {
    showToast(isUpdate ? 'Check-in updated ✓' : 'Check-in saved ✓');
  }
  updateDashboard();
}

