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
        trainingLoad:manHrs,
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

  // ── HRV trend ────────────────────────────────────────────────
  const hrvData=M.slice(-7).filter(m=>m.hrv).map(m=>m.hrv);
  if(hrvData.length>=4){
    const recent=avg(hrvData.slice(-3)), earlier=avg(hrvData.slice(0,-3));
    if(recent<earlier-3) insights.push({type:'warn',text:`HRV dropped ~${Math.round(earlier-recent)} pts over 3 days — load may be exceeding recovery. Consider an easy day.`});
    else if(recent>earlier+3) insights.push({type:'good',text:`HRV trending up ${Math.round(recent-earlier)} pts — training is being absorbed well. Good adaptation signal.`});
    else insights.push({type:'info',text:`HRV stable around ${Math.round(avg(hrvData))} — consistent recovery. Keep monitoring.`});
  }

  // ── Readiness score trend ────────────────────────────────────
  const rdScores=M.slice(-7).filter(m=>m.readinessScore).map(m=>m.readinessScore);
  if(rdScores.length>=4){
    const recentR=avg(rdScores.slice(-3)), earlierR=avg(rdScores.slice(0,-3));
    if(recentR<earlierR-10) insights.push({type:'warn',text:`Readiness score has dropped from ${Math.round(earlierR)} → ${Math.round(recentR)} over the last 3 days. Accumulated fatigue building.`});
    else if(recentR>earlierR+10) insights.push({type:'good',text:`Readiness score improving: ${Math.round(earlierR)} → ${Math.round(recentR)}. Recovery is working.`});
  }

  // ── Sleep score (corrected thresholds) vs readiness ──────────
  const sleepRd=M.filter(m=>m.sleepScore&&m.readiness);
  if(sleepRd.length>=5){
    const poor=sleepRd.filter(m=>m.sleepScore<80), good=sleepRd.filter(m=>m.sleepScore>=88);
    if(poor.length>=2&&good.length>=2){
      const poorR=avg(poor.map(m=>m.readiness)), goodR=avg(good.map(m=>m.readiness));
      if(goodR-poorR>0.6) insights.push({type:'info',text:`Sleep quality strongly predicts your readiness. Sleep 88+ scores readiness ${goodR.toFixed(1)}/5 vs ${poorR.toFixed(1)}/5 on <80 nights.`});
    }
  }

  // ── Sleep hours trend ────────────────────────────────────────
  const sleepHrs=M.slice(-7).filter(m=>m.sleep).map(m=>m.sleep);
  if(sleepHrs.length>=4){
    const avgSleep=avg(sleepHrs);
    if(avgSleep<7.5) insights.push({type:'warn',text:`Averaging only ${avgSleep.toFixed(1)}hrs sleep this week — target is 8.5+. This is likely the biggest drag on your readiness score.`});
    else if(avgSleep>=8.5) insights.push({type:'good',text:`Great sleep average this week: ${avgSleep.toFixed(1)}hrs. Consistent sleep is your biggest recovery lever.`});
  }

  // ── Recovery actions: None tracking ─────────────────────────
  const hasRecovery=M.filter(m=>m.recovery);
  if(hasRecovery.length>=5){
    const noneDays=hasRecovery.filter(m=>m.recovery.none===true);
    const noneRate=Math.round(noneDays.length/hasRecovery.length*100);
    if(noneRate>=50) insights.push({type:'warn',text:`No recovery work on ${noneRate}% of logged days. Skipping recovery is compounding fatigue — even 10min foam rolling helps.`});
    else if(noneRate<=20&&hasRecovery.length>=7) insights.push({type:'good',text:`Good recovery compliance — only ${noneRate}% of days with zero recovery work logged.`});

    // Any recovery vs none: next-day HRV impact
    const recovDays=hasRecovery.filter(m=>!m.recovery.none&&Object.values(m.recovery).some(v=>v));
    if(recovDays.length>=3&&noneDays.length>=3){
      // Get HRV the day after recovery vs day after nothing
      const nextDayHRV=(days)=>days.map(m=>{
        const next=M.find(n=>n.date>m.date&&n.hrv);
        return next?next.hrv:null;
      }).filter(Boolean);
      const recovNextHRV=avg(nextDayHRV(recovDays));
      const noneNextHRV=avg(nextDayHRV(noneDays));
      if(recovNextHRV&&noneNextHRV&&recovNextHRV-noneNextHRV>2)
        insights.push({type:'good',text:`Recovery work pays off: next-day HRV averages ${recovNextHRV.toFixed(0)} after recovery sessions vs ${noneNextHRV.toFixed(0)} after none.`});
    }
  }

  // ── Individual recovery modalities ──────────────────────────
  const checkRecovMod=(key,label)=>{
    const withIt=M.filter(m=>m.recovery?.[key]&&m.legs);
    const withoutIt=M.filter(m=>m.recovery&&!m.recovery[key]&&!m.recovery.none&&m.legs);
    if(withIt.length>=3&&withoutIt.length>=3){
      const wL=avg(withIt.map(m=>m.legs)), woL=avg(withoutIt.map(m=>m.legs));
      if(wL-woL>0.5) insights.push({type:'good',text:`${label} days show leg freshness ${wL.toFixed(1)}/5 vs ${woL.toFixed(1)}/5 — it's making a measurable difference.`});
    }
  };
  checkRecovMod('massage','Massage gun');
  checkRecovMod('foam','Foam rolling');
  checkRecovMod('stretch','Stretching');
  checkRecovMod('ice','Ice bath');
  checkRecovMod('compression','Compression');
  checkRecovMod('nap','Napping');

  // ── Supplements compliance ───────────────────────────────────
  const suppLogged=M.filter(m=>m.supplements!==null&&m.supplements!==undefined);
  if(suppLogged.length>=5){
    const skipped=suppLogged.filter(m=>m.supplements===false);
    const skipRate=Math.round(skipped.length/suppLogged.length*100);
    if(skipRate>=30) insights.push({type:'warn',text:`Supplements skipped on ${skipRate}% of logged days. Consistency matters — set a morning reminder.`});
    // Supplement vs HRV
    const suppHRV=M.filter(m=>m.supplements===true&&m.hrv);
    const noSuppHRV=M.filter(m=>m.supplements===false&&m.hrv);
    if(suppHRV.length>=3&&noSuppHRV.length>=3){
      const sH=avg(suppHRV.map(m=>m.hrv)), nH=avg(noSuppHRV.map(m=>m.hrv));
      if(sH-nH>2) insights.push({type:'info',text:`Days after taking supplements average HRV ${sH.toFixed(0)} vs ${nH.toFixed(0)} on skipped days — positive signal.`});
    }
  }

  // ── Calories vs HRV ──────────────────────────────────────────
  const calHRV=M.filter(m=>m.calIn&&m.hrv);
  if(calHRV.length>=5){
    const low=calHRV.filter(m=>m.calIn<3200), high=calHRV.filter(m=>m.calIn>=3200);
    if(low.length>=2&&high.length>=2){
      const lowH=avg(low.map(m=>m.hrv)), highH=avg(high.map(m=>m.hrv));
      if(highH-lowH>3) insights.push({type:'info',text:`Better-fuelled days (3200+ kcal) average HRV ${highH.toFixed(0)} vs ${lowH.toFixed(0)} on lower days. Underfuelling appears to impact recovery.`});
      else if(lowH-highH>3) insights.push({type:'info',text:`Interestingly, lower calorie days average HRV ${lowH.toFixed(0)} vs ${highH.toFixed(0)} on high days. May reflect overeating on heavy training days.`});
    }
  }

  // ── Stress vs performance ────────────────────────────────────
  const stressData=M.filter(m=>m.gstress&&m.readiness);
  if(stressData.length>=5){
    const stressHist2 = M.filter(m=>m.gstress&&m.gstress>0).map(m=>m.gstress);
    const stressAvg2 = stressHist2.length>=5 ? Math.round(stressHist2.reduce((a,b)=>a+b,0)/stressHist2.length) : 27;
    const lowS=stressData.filter(m=>m.gstress<=stressAvg2+3), highS=stressData.filter(m=>m.gstress>=stressAvg2+10);
    if(lowS.length>=2&&highS.length>=2){
      const lowR=avg(lowS.map(m=>m.readiness)), highR=avg(highS.map(m=>m.readiness));
      if(lowR-highR>0.7) insights.push({type:'info',text:`High Garmin stress days (55+) average readiness ${highR.toFixed(1)}/5 vs ${lowR.toFixed(1)}/5 on low-stress days. Life load is affecting training capacity.`});
    }
  }

  // ── Consecutive low readiness ─────────────────────────────────
  const last5rd=M.slice(-5).filter(m=>m.readinessScore);
  if(last5rd.length>=3&&last5rd.every(m=>m.readinessScore<55))
    insights.push({type:'warn',text:`Readiness below 55 for ${last5rd.length} consecutive days. This is a meaningful overreach signal — consider a rest day or reduced week.`});

  if(!insights.length) insights.push({type:'info',text:'Keep logging daily — trends and correlations will surface here once you have more data variation.'});

  div.innerHTML=insights.map(i=>`<div style="display:flex;gap:10px;padding:10px 14px;background:${i.type==='good'?'var(--green-dim)':i.type==='warn'?'var(--red-dim)':'var(--surface2)'};border:1px solid ${i.type==='good'?'rgba(0,230,118,.2)':i.type==='warn'?'rgba(244,67,54,.2)':'var(--border)'};border-radius:8px;margin-bottom:8px;"><span style="font-size:16px;">${i.type==='good'?'✅':i.type==='warn'?'⚠️':'💡'}</span><span style="font-size:12px;color:var(--text-mid);line-height:1.6;">${i.text}</span></div>`).join('');
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

  // Sleep display
  const sleepEl = document.getElementById('ci-sleep-display');
  const sleepTrend = document.getElementById('ci-sleep-trend');
  const sleepAuto = document.getElementById('ci-sleep-autotext');
  if(thisSleep) {
    sleepEl.textContent = thisSleep+'h';
    const goodSleep = thisSleep >= 8.5 && (thisSleepScore||0) >= 78;
    sleepEl.style.color = goodSleep?'var(--green)':thisSleep<7.5?'var(--red)':'var(--orange)';
    if(prevSleep) {
      const diff = Math.round((thisSleep-prevSleep)*10)/10;
      sleepTrend.innerHTML = diff>0.2?'<span style="color:var(--green)">📈 +'+diff+'h vs last week</span>':diff<-0.2?'<span style="color:var(--orange)">📉 '+diff+'h vs last week</span>':'<span style="color:var(--text-dim)">➡️ Similar to last week</span>';
    } else {
      sleepTrend.textContent = thisSleepScore?'Score: '+thisSleepScore:'';
    }
    const q7val = goodSleep?'good':thisSleep<7?'bad':'ok';
    document.getElementById('q7').value = q7val;
    const q7labels = {good:'✅ Consistent — auto-set',ok:'⚠️ Hit and miss — auto-set',bad:'❌ Poor — auto-set'};
    if(sleepAuto) sleepAuto.innerHTML = '<span style="color:var(--text-dim)">'+q7labels[q7val]+'</span>';
  } else {
    sleepEl.textContent='—'; sleepEl.style.color='var(--text-dim)';
    sleepTrend.textContent='No morning data';
  }

  // ── Z2 pace: avg pace of easy runs this week vs last ─────────────
  const fmtPace = p => { const m=Math.floor(p),s=Math.round((p-m)*60); return m+':'+(s<10?'0':'')+s; };
  const easyRuns = wkKey => {
    const [s,e]=weekDateRange(wkKey);
    const acts=STRAVA_ACTS.acts.filter(a=>a.s==='Run'&&a.ef==='easy'&&a.p&&a.p>0&&a.dk>=5&&a.d>=s&&a.d<=e);
    if(!acts.length) return null;
    return acts.reduce((s,a)=>s+a.p,0)/acts.length;
  };
  const thisZ2  = easyRuns(wk);
  const prevZ2  = easyRuns(prevWk);
  const z2El    = document.getElementById('ci-z2pace-display');
  const z2Trend = document.getElementById('ci-z2pace-trend');
  const z2Auto  = document.getElementById('ci-z2-autotext');
  if(thisZ2) {
    z2El.textContent = fmtPace(thisZ2)+'/km';
    z2El.style.color = 'var(--text)';
    if(prevZ2) {
      const diff = thisZ2 - prevZ2; // negative = faster = better
      const improved = diff < -0.05;
      const declined = diff > 0.05;
      z2Trend.innerHTML = improved
        ? '<span style="color:var(--green)">📈 '+Math.abs(diff*60).toFixed(0)+'s faster vs last week</span>'
        : declined
        ? '<span style="color:var(--red)">📉 '+Math.abs(diff*60).toFixed(0)+'s slower vs last week</span>'
        : '<span style="color:var(--text-dim)">➡️ Held steady</span>';
      document.getElementById('q3').value = improved?'improving':declined?'declining':'holding';
      if(z2Auto) z2Auto.innerHTML = '<span style="color:var(--text-dim)">Auto: '+(improved?'improving':declined?'declining':'holding')+'</span>';
    } else {
      z2Trend.textContent = 'No previous week Z2 data';
    }
  } else {
    z2El.textContent='—'; z2El.style.color='var(--text-dim)';
    z2Trend.textContent='No Z2 runs ≥5km this week';
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

function saveCI(){
  if(window._ciScore===undefined)calcCI();
  D.checkins.push({
    date:document.getElementById('ci-date').value,
    block:document.getElementById('ci-block').value,
    hours:parseFloat(document.getElementById('ci-hours').value)||null,
    hrvAvg:parseFloat(document.getElementById('ci-hrv').value)||null,
    score:window._ciScore||0,
    q3trend:document.getElementById('q3').value,
    failedNote:document.getElementById('ci-failed')?.value||'',
    nutrition:ciScores.nutrition||null,
    recovery_protocol:ciScores.recovery_protocol||null,
    lifestress:ciScores.lifestress||null,
    intention:document.getElementById('ci-intention').value,
    recap:document.getElementById('ci-recap')?.value||'',
    timestamp:Date.now()
  });
  save();showToast('Check-in saved ✓');updateDashboard();
}

