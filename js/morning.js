// ===== MORNING CHECK =====
function updateBaseline(){
  const m=D.mornings.slice(-8,-1).filter(x=>x.hrv);
  const avg=m.length?Math.round(m.reduce((a,x)=>a+x.hrv,0)/m.length):null;
  document.getElementById('m-baseline').textContent=avg?avg+' (7-day calc)':'need 3+ days';
}

// ===== MORNING AUTO-SAVE =====
let _morningSaveTimer = null;
let _morningHasData = false;

function debouncedMorningSave() {
  _morningHasData = true;
  clearTimeout(_morningSaveTimer);
  const indicator = document.getElementById('morning-autosave');
  if(indicator) { indicator.textContent = '...'; indicator.style.color = 'var(--text-dim)'; }
  _morningSaveTimer = setTimeout(() => {
    const hrv        = parseFloat(document.getElementById('m-hrv')?.value) || null;
    const rhr        = parseFloat(document.getElementById('m-rhr')?.value) || null;
    const sleep      = parseFloat(document.getElementById('m-sleep')?.value) || null;
    const sleepScore = parseFloat(document.getElementById('m-sleepscore')?.value) || null;
    const gstress    = parseFloat(document.getElementById('m-gstress')?.value) || null;
    const calIn      = parseFloat(document.getElementById('m-cal-in')?.value) || null;
    // Save if ANY metric has been entered
    if(!hrv && !rhr && !sleep && !sleepScore && !gstress && !calIn) {
      if(indicator) { indicator.textContent = 'Auto-saves as you type'; indicator.style.color = 'var(--text-dim)'; }
      return;
    }
    autoSaveMorning();
  }, 2000);
}

function autoSaveMorning() {
  const indicator = document.getElementById('morning-autosave');
  try {
    const today = localDateStr(new Date());
    const existingIdx = D.mornings.findIndex(m => m.date === today);
    const entry = buildMorningEntry();
    if(existingIdx >= 0) D.mornings[existingIdx] = entry;
    else D.mornings.push(entry);
    save();
    updateDashboard();
    if(indicator) {
      indicator.textContent = '✓ Saved';
      indicator.style.color = 'var(--green)';
      setTimeout(() => { if(indicator) { indicator.textContent = 'Auto-saves as you type'; indicator.style.color = 'var(--text-dim)'; }}, 2500);
    }
  } catch(e) {
    console.error('Auto-save error:', e);
    if(indicator) { indicator.textContent = 'Save failed — tap Save button'; indicator.style.color = 'var(--red)'; }
  }
}

function buildMorningEntry() {
  return {
    date: localDateStr(new Date()),
    hrv:       parseFloat(document.getElementById('m-hrv')?.value) || null,
    hrv7:      parseFloat(document.getElementById('m-hrv7')?.value) || null,
    rhr:       parseFloat(document.getElementById('m-rhr')?.value) || null,
    sleepScore:parseFloat(document.getElementById('m-sleepscore')?.value) || null,
    sleep:     parseFloat(document.getElementById('m-sleep')?.value) || null,
    gstress:   parseFloat(document.getElementById('m-gstress')?.value) || null,
    calIn:     parseFloat(document.getElementById('m-cal-in')?.value) || null,
    calOut:    parseFloat(document.getElementById('m-cal-out')?.value) || null,
    protein:   parseFloat(document.getElementById('m-protein')?.value) || null,
    carbs:     parseFloat(document.getElementById('m-carbs')?.value) || null,
    legs:      scores.legs || null,
    stress:    scores.stress || null,
    readiness: scores.readiness || null,
    fuel:      scores.fuel,
    recovery:  {...recoveryChecks},
    supplements:     supplementTaken,
    supplementNote:  supplementTaken ? (document.getElementById('supp-note')?.value || '') : '',
    status:          window._mStatus?.status || 'green',
    readinessScore:  window._readinessScore || null,
    note: document.getElementById('m-note')?.value || '',
    timestamp: Date.now()
  };
}

function calcStatus(){ calcReadiness(); }

function calcReadiness(){
  const hrv        = parseFloat(document.getElementById('m-hrv')?.value)||null;
  const hrv7       = parseFloat(document.getElementById('m-hrv7')?.value)||null;
  const rhr        = parseFloat(document.getElementById('m-rhr')?.value)||null;
  const sleepScore = parseFloat(document.getElementById('m-sleepscore')?.value)||null;
  const sleepHrs   = parseFloat(document.getElementById('m-sleep')?.value)||null;
  const gstress    = parseFloat(document.getElementById('m-gstress')?.value)||null;
  if(!hrv&&!rhr&&!sleepScore&&!sleepHrs) return;

  let score = 0;
  const good = [], bad = [], breakdown = [];

  // ── 1. HRV vs 7-day baseline (30pts) ──────────────────────────
  const hrvHist = D.mornings.slice(-9,-1).filter(x=>x.hrv);
  const baseline = hrv7 || (hrvHist.length>=3 ? hrvHist.reduce((a,x)=>a+x.hrv,0)/hrvHist.length : null);
  if(hrv && baseline){
    const pct = ((hrv-baseline)/baseline)*100;
    let pts=0;
    if(pct>=2)       {pts=30;good.push('HRV +'+Math.abs(pct).toFixed(0)+'% vs baseline — excellent recovery');}
    else if(pct>=-3) {pts=24;good.push('HRV within baseline ('+Math.round(pct)+'%)');}
    else if(pct>=-8) {pts=14;bad.push('HRV '+Math.round(pct)+'% below baseline — moderate fatigue');}
    else if(pct>=-15){pts=6; bad.push('HRV '+Math.round(pct)+'% below baseline — significant fatigue');}
    else             {pts=0; bad.push('HRV '+Math.round(pct)+'% below baseline — high fatigue warning');}
    score+=pts; breakdown.push({l:'HRV',p:pts,m:30});
  } else if(hrv){
    score+=18; breakdown.push({l:'HRV',p:18,m:30,n:'no baseline yet'});
  }

  // ── 2. Resting HR vs personal baseline (15pts) ────────────────
  const rhrHist = D.mornings.slice(-21).filter(x=>x.rhr);
  const baseRHR = rhrHist.length>=3 ? rhrHist.reduce((a,x)=>a+x.rhr,0)/rhrHist.length : 50;
  if(rhr){
    const d=rhr-baseRHR; let pts=0;
    if(d<=-2)  {pts=15;good.push('RHR '+rhr+'bpm — below baseline (well recovered)');}
    else if(d<=2) {pts=13;good.push('RHR normal ('+rhr+'bpm)');}
    else if(d<=5) {pts=8; bad.push('RHR '+rhr+'bpm (+'+Math.round(d)+'bpm above baseline)');}
    else if(d<=8) {pts=4; bad.push('RHR elevated: '+rhr+'bpm (+'+Math.round(d)+'bpm) — possible fatigue/illness');}
    else          {pts=0; bad.push('RHR very high: '+rhr+'bpm — rest strongly advised');}
    score+=pts; breakdown.push({l:'RHR',p:pts,m:15});
  }

  // ── 3. Sleep score — personal-baseline-relative (20pts) ──────
  if(sleepScore){
    // Compute personal avg sleep score from last 30 logged days
    const sleepHist = D.mornings.filter(x=>x.sleepScore&&x.sleepScore>0).map(x=>x.sleepScore);
    const personalSleepAvg = sleepHist.length >= 7
      ? Math.round(sleepHist.slice(-30).reduce((a,b)=>a+b,0) / Math.min(sleepHist.slice(-30).length, 30))
      : 83; // personal avg fallback (85 over 4 weeks, 87 over year)
    const sleepDelta = sleepScore - personalSleepAvg;
    let pts=0;
    if(sleepDelta >= 3)        {pts=20;good.push('Sleep score '+sleepScore+' — above your avg ('+personalSleepAvg+') — excellent');}
    else if(sleepDelta >= -3)  {pts=15;good.push('Sleep score '+sleepScore+' — within your normal range (avg '+personalSleepAvg+')');}
    else if(sleepDelta >= -8)  {pts=9; bad.push('Sleep score '+sleepScore+' — '+Math.abs(sleepDelta)+' below your avg ('+personalSleepAvg+') — recovery impacted');}
    else if(sleepDelta >= -15) {pts=4; bad.push('Sleep score '+sleepScore+' — well below your avg ('+personalSleepAvg+') — poor sleep');}
    else                       {pts=0; bad.push('Sleep score '+sleepScore+' — very poor for you — prioritise sleep tonight');}
    score+=pts; breakdown.push({l:'Sleep (avg '+personalSleepAvg+')',p:pts,m:20});
  }

  // ── 4. Sleep hours (5pts) ─────────────────────────────────────
  if(sleepHrs){
    let pts=0;
    if(sleepHrs>=8.5)      pts=5;
    else if(sleepHrs>=7.5) pts=4;
    else if(sleepHrs>=6.5) pts=2;
    else                   pts=0;
    score+=pts; breakdown.push({l:'Sleep '+sleepHrs+'h',p:pts,m:5});
    if(sleepHrs<7) bad.push(sleepHrs+'hrs sleep — target is 8.5+');
  }

  // ── 5. Subjective readiness + leg freshness (10pts) ──────────
  const subR=scores.readiness||0, subL=scores.legs||0;
  if(subR||subL){
    const avg=((subR||3)+(subL||3))/2;
    const pts=Math.round((avg/5)*10);
    score+=pts; breakdown.push({l:'Readiness+Legs',p:pts,m:10});
    if(avg<=2)      bad.push('Legs/readiness very low ('+avg.toFixed(1)+'/5) — body signalling rest');
    else if(avg<=3) bad.push('Moderate fatigue ('+avg.toFixed(1)+'/5)');
    else            good.push('Feeling fresh ('+avg.toFixed(1)+'/5)');
  } else {
    score+=6; breakdown.push({l:'Readiness+Legs',p:6,m:10,n:'not entered'});
  }

  // ── 6. Yesterday's training load (10pts) ─────────────────────
  const yest=new Date(); yest.setDate(yest.getDate()-1);
  const yStr=yest.getFullYear()+'-'+String(yest.getMonth()+1).padStart(2,'0')+'-'+String(yest.getDate()).padStart(2,'0');
  const yActs=STRAVA_ACTS.acts.filter(a=>a.d===yStr&&a.mm&&a.mm>5);
  const yHard=yActs.filter(a=>(a.ef==='hard'||a.ef==='max'||a.iv)&&!a.wu&&!a.cd);
  const yMin=yActs.reduce((s,a)=>s+(a.mm||0),0);
  let loadPts=10;
  // Hard sessions hit hardest
  if(yHard.length>=2)     { loadPts-=8; bad.push(yHard.length+' hard sessions yesterday — significant residual fatigue'); }
  else if(yHard.length===1){ loadPts-=5; bad.push('Hard session yesterday — residual fatigue expected'); }
  // Volume penalty (Z2 still creates fatigue at high volumes)
  if(yMin>=240)      { loadPts-=4; bad.push(Math.round(yMin/60)+'h training yesterday — heavy day'); }
  else if(yMin>=180) { loadPts-=3; bad.push(Math.round(yMin/60)+'h training yesterday'); }
  else if(yMin>=120) { loadPts-=1; bad.push(Math.round(yMin/60)+'h training yesterday'); }
  else if(yMin===0)  { good.push('Rest day yesterday — fresh legs'); }
  loadPts=Math.max(0,loadPts);
  score+=loadPts; breakdown.push({l:'Yesterday load',p:loadPts,m:10});

  // ── 7. Week accumulated load (5pts) ──────────────────────────
  const wk=getWeekKey(new Date());
  const t=calcWeekTotalsFromStrava(wk);
  let wkPts=5;
  if(t.totalMin>660)      {wkPts=1;bad.push(Math.round(t.totalMin/60)+'hrs this week — heavy accumulation');}
  else if(t.totalMin>480) {wkPts=2;bad.push(Math.round(t.totalMin/60)+'hrs this week — solid load');}
  else if(t.totalMin>300) wkPts=4;
  score+=wkPts; breakdown.push({l:'Week load '+Math.round(t.totalMin/60)+'h',p:wkPts,m:5});

  // ── 8. Garmin stress score (5pts) ────────────────────────────
  // Personal-baseline-relative: compute avg from logged days, fall back to known avg of 27
  if(gstress){
    const stressHist = D.mornings.filter(x=>x.gstress&&x.gstress>0).map(x=>x.gstress);
    const stressBaseline = stressHist.length >= 5
      ? Math.round(stressHist.reduce((a,b)=>a+b,0) / stressHist.length)
      : 27; // known personal avg from Garmin history
    const stressDelta = gstress - stressBaseline;
    let pts=0;
    // Thresholds are deltas above personal avg (your avg=27, high=46, so range ~19pts)
    if     (stressDelta <= -3)  {pts=5; good.push('Garmin stress '+gstress+' — below your avg ('+stressBaseline+') — very calm');}
    else if(stressDelta <= 3)   {pts=4; good.push('Garmin stress '+gstress+' — within your normal range (avg '+stressBaseline+')');}
    else if(stressDelta <= 8)   {pts=2; bad.push('Garmin stress '+gstress+' — '+stressDelta+' above your avg ('+stressBaseline+') — mildly elevated');}
    else if(stressDelta <= 15)  {pts=1; bad.push('Garmin stress '+gstress+' — '+stressDelta+' above your avg — elevated, lifestyle load is up');}
    else                        {pts=0; bad.push('Garmin stress '+gstress+' — '+stressDelta+' above your avg — high stress, recovery impaired');}
    score+=pts; breakdown.push({l:'Garmin stress '+gstress+' (avg '+stressBaseline+')',p:pts,m:5});
  }

  // ── 9. Nutrition bonus (up to +5pts, never penalises for missing) ─
  // Only applies if calIn or protein was logged — never punishes for not entering
  const calIn   = parseFloat(document.getElementById('m-cal-in')?.value)  || null;
  const calOut  = parseFloat(document.getElementById('m-cal-out')?.value) || null;
  const protein = parseFloat(document.getElementById('m-protein')?.value) || null;
  if(calIn || protein) {
    let nutPts = 0;
    // Calorie intake vs burn — check fuelling
    if(calIn && calOut) {
      const deficit = calOut - calIn;
      if(deficit < 200)       { nutPts += 3; good.push(`Well fuelled — ${calIn} kcal eaten vs ${calOut} kcal burnt`); }
      else if(deficit < 500)  { nutPts += 2; }
      else if(deficit < 800)  { nutPts += 1; bad.push(`Under-fuelled — ${Math.round(deficit)} kcal deficit may slow recovery`); }
      else                    { nutPts += 0; bad.push(`Large deficit (${Math.round(deficit)} kcal) — prioritise recovery nutrition`); }
    } else if(calIn) {
      // No calOut — just check if intake is reasonable for a triathlete (>2000 kcal)
      if(calIn >= 2500)       { nutPts += 2; good.push(`Good calorie intake (${calIn} kcal)`); }
      else if(calIn >= 1800)  { nutPts += 1; }
      else                    { bad.push(`Low calorie intake (${calIn} kcal) — may impact recovery`); }
    }
    // Protein adequacy (triathlete target ~1.6–2.0g/kg, ~130–160g for 79kg)
    if(protein) {
      if(protein >= 130)      { nutPts += 2; good.push(`Strong protein intake (${protein}g)`); }
      else if(protein >= 100) { nutPts += 1; }
      else                    { bad.push(`Low protein (${protein}g) — target 130g+ for recovery`); }
    }
    if(nutPts > 0) {
      score = Math.min(100, score + nutPts);
      breakdown.push({l:'Nutrition',p:nutPts,m:5});
    }
  }

  // ── Consecutive bad days cap (date-based, not array-slice) ──────
  // Only fires if you logged 2+ genuinely consecutive calendar days with score <50
  // Missing a day does NOT count as a bad day — only actual logged bad entries
  let consecutiveBad = 0;
  for(let i = 1; i <= 4; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = localDateStr(d);
    const entry = D.mornings.find(m => m.date === ds);
    if(!entry) break;               // gap in logging — stop counting, don't penalise
    if((entry.readinessScore||0) < 50) consecutiveBad++;
    else break;                     // had a good day — streak broken
  }
  if(consecutiveBad >= 3) {
    score = Math.min(score, 45);
    bad.push('3+ consecutive low-readiness days — full recovery session advised');
  }

  score=Math.max(0,Math.min(100,Math.round(score)));

  // ── Derive label, colour, action ─────────────────────────────
  let label,arcColor,action,status;
  if(score>=85)      {label='OPTIMAL';  arcColor='#00e676';status='green';action='All systems go. Execute today\'s session as planned.';}
  else if(score>=70) {label='GOOD';     arcColor='#69f0ae';status='green';action='Minor adjustments only if needed. Good to train.';}
  else if(score>=55) {label='MODERATE'; arcColor='#ff9800';status='amber';action='Reduce Z2 volume 15–20%. Hard sessions: cut sets, keep intensity.';}
  else if(score>=40) {label='CAUTION';  arcColor='#ff5722';status='amber';action='Easy Z1/Z2 only today. Skip intervals. Prioritise sleep tonight.';}
  else               {label='REST';     arcColor='#f44336';status='red';  action='Full rest day or 30min gentle walk/swim. No structured training.';}

  // Store for saving
  window._readinessScore=score;
  window._mStatus={status,e:score>=70?'🟢':score>=40?'🟡':'🔴',l:label,c:arcColor};

  // ── Update circular arc on dashboard ─────────────────────────
  _updateReadinessArc(score,arcColor,label,bad[0]||good[0]||action);

  // ── Update morning check result panel ────────────────────────
  const resultEl=document.getElementById('status-result');
  if(resultEl){
    resultEl.innerHTML=`<div style="padding:8px 0 4px;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
        <div style="position:relative;width:80px;height:80px;flex-shrink:0;">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="33" fill="none" stroke="var(--surface2)" stroke-width="8"/>
            <circle cx="40" cy="40" r="33" fill="none" stroke="${arcColor}" stroke-width="8"
              stroke-linecap="round" stroke-dasharray="${2*Math.PI*33}"
              stroke-dashoffset="${2*Math.PI*33*(1-score/100)}" transform="rotate(-90 40 40)"/>
          </svg>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;line-height:1;color:${arcColor};">${score}</div>
          </div>
        </div>
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;color:${arcColor};">${label}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px;line-height:1.4;">${action}</div>
        </div>
      </div>
      ${bad.length?'<div style="background:rgba(244,67,54,.08);border-radius:7px;padding:8px 12px;margin-bottom:8px;">'+bad.map(f=>'<div style="font-size:11px;color:#ff7043;padding:2px 0;">⚠ '+f+'</div>').join('')+'</div>':''}
      ${good.length?'<div style="background:rgba(0,230,118,.07);border-radius:7px;padding:8px 12px;margin-bottom:8px;">'+good.map(f=>'<div style="font-size:11px;color:var(--green);padding:2px 0;">✓ '+f+'</div>').join('')+'</div>':''}
      <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
        ${breakdown.map(b=>`<span style="background:var(--surface2);border-radius:4px;padding:3px 7px;font-size:9px;color:${b.p>=b.m*0.6?'var(--green)':b.p>=b.m*0.3?'var(--orange)':'var(--red)'};">${b.l} ${b.p}/${b.m}</span>`).join('')}
      </div>
    </div>`;
  }
}

function _updateReadinessArc(score,arcColor,label,detail){
  const arc=document.getElementById('readiness-arc');
  const scoreEl=document.getElementById('readiness-score');
  const labelEl=document.getElementById('readiness-label');
  const detailEl=document.getElementById('readiness-detail');
  const circumference=364.4;
  if(arc){arc.style.strokeDashoffset=circumference*(1-score/100);arc.style.stroke=arcColor;}
  if(scoreEl){scoreEl.textContent=score;scoreEl.style.color=arcColor;}
  if(labelEl){labelEl.textContent=label;labelEl.style.color=arcColor;}
  if(detailEl){detailEl.textContent=detail||'';detailEl.style.color=detail&&(detail.includes('⚠')||detail.includes('below')||detail.includes('high')||detail.includes('elevated'))?'var(--orange)':'var(--text-dim)';}
}

function saveMorning(){
  const hrv=parseFloat(document.getElementById('m-hrv').value);
  const rhr=parseFloat(document.getElementById('m-rhr').value);
  const sleep=parseFloat(document.getElementById('m-sleep').value);
  if(!hrv&&!rhr&&!sleep){showToast('Enter at least one metric',true);return;}
  const today=localDateStr(new Date());
  const entry={
    date:today,
    hrv:hrv||null, hrv7:parseFloat(document.getElementById('m-hrv7').value)||null,
    rhr:rhr||null, sleepScore:parseFloat(document.getElementById('m-sleepscore').value)||null,
    sleep:sleep||null, gstress:parseFloat(document.getElementById('m-gstress').value)||null,
    calIn:parseFloat(document.getElementById('m-cal-in').value)||null,
    calOut:parseFloat(document.getElementById('m-cal-out').value)||null,
    protein:parseFloat(document.getElementById('m-protein').value)||null,
    carbs:parseFloat(document.getElementById('m-carbs').value)||null,
    legs:scores.legs||null, stress:scores.stress||null,
    readiness:scores.readiness||null, fuel:scores.fuel,
    recovery:{...recoveryChecks},
    status:window._mStatus?.status||'green',
    readinessScore:window._readinessScore||null,
    supplements:supplementTaken,
    supplementNote:supplementTaken?document.getElementById('supp-note')?.value:'',
    note:document.getElementById('m-note').value,
    timestamp:Date.now()
  };
  const existingIdx=D.mornings.findIndex(m=>m.date===today);
  const isUpdate = existingIdx>=0;
  if(isUpdate){D.mornings[existingIdx]=entry;} else {D.mornings.push(entry);}

  // Immediate persist — localStorage first, then Supabase right away (not debounced)
  // so a page refresh doesn't lose today's entry
  localStorage.setItem('tc26v4', JSON.stringify(D));
  if(supa && currentUser){
    clearTimeout(_saveDebounce);
    showToast('💾 Saving...');
    pushToSupabase().then(()=>{
      showToast(isUpdate ? 'Morning check updated ✓ (synced)' : 'Morning check saved ✓ (synced)');
    });
  } else {
    showToast(isUpdate ? 'Morning check updated ✓' : 'Morning check saved ✓');
  }
  updateDashboard();
}

function populateMorningForm(){
  const today=localDateStr(new Date());
  const m=D.mornings.find(x=>x.date===today);
  if(!m)return;

  // ── Numeric inputs ───────────────────────────────────────────
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null&&v!==undefined)el.value=v;};
  // For Garmin device fields: only prefer live GARMIN_TODAY data if it's from today
  // A stale GARMIN_TODAY (from a previous day's sync) must NOT overwrite today's manually entered data
  const G = (GARMIN_TODAY && GARMIN_TODAY.date === today) ? GARMIN_TODAY : {};
  set('m-hrv',        G.hrv        ?? m.hrv);
  set('m-hrv7',       G.hrv7       ?? m.hrv7);
  set('m-rhr',        G.rhr        ?? m.rhr);
  set('m-sleepscore', G.sleepScore ?? m.sleepScore);
  set('m-sleep',      G.sleepHrs   ?? m.sleep);
  set('m-gstress',    G.yesterdayStress ?? m.gstress);
  // Cal In: prefer nutrition log total if available, else saved value
  const nutTotals = getDayTotals(today);
  set('m-cal-in',     nutTotals.cal     || G.calIn     || m.calIn);
  set('m-protein',    nutTotals.protein || G.protein   || m.protein);
  set('m-carbs',      nutTotals.carbs   || G.carbs     || m.carbs);
  set('m-cal-out',    G.calOut || m.calOut);

  set('m-note',m.note);

  // ── 1-5 button scores (legs, stress, readiness) ──────────────
  // Each group: buttons are rendered in order 1-5 with onclick="setScore(type,N,this)"
  const restoreScore = (type, val) => {
    if(!val) return;
    scores[type] = val;
    document.querySelectorAll('.score-row .sb[onclick*="setScore(\''+type+'\'"]').forEach((b,i)=>{
      b.classList.toggle('on', i+1 === val);
    });
  };
  restoreScore('legs',      m.legs);
  restoreScore('stress',    m.stress);
  restoreScore('readiness', m.readiness);

  // ── Fuel buttons (Yes / Partial / No) ───────────────────────
  if(m.fuel != null){
    scores.fuel = m.fuel;
    document.querySelectorAll('.sb[onclick*="setScore(\'fuel\'"]').forEach(b=>{
      const match = b.getAttribute('onclick').match(/setScore\('fuel',(\d)/);
      if(match) b.classList.toggle('on', parseInt(match[1]) === m.fuel);
    });
  }

  // ── Recovery checkboxes ──────────────────────────────────────
  if(m.recovery){
    Object.entries(m.recovery).forEach(([k,v])=>{
      recoveryChecks[k] = v;
      const el = document.getElementById('cb-'+k);
      if(el) el.className = 'check-box' + (v ? ' checked' : '') + (k==='none'?' '+(el.getAttribute('style')||''):'');
    });
  }

  // ── Supplements ──────────────────────────────────────────────
  if(m.supplements != null){
    setSupplement(m.supplements);
    if(m.supplementNote){ const el=document.getElementById('supp-note'); if(el) el.value=m.supplementNote; }
  }

  calcStatus();
  showToast('Today\'s data loaded ✓');
}

// ===== RECALC READINESS FROM STORED DATA (used by edit modal) =====
// Recomputes readinessScore for a morning entry object without touching the DOM
function recalcMorningReadiness(m) {
  if(!m) return null;
  const {hrv, hrv7, rhr, sleepScore, sleep: sleepHrs, gstress} = m;
  if(!hrv && !rhr && !sleepScore && !sleepHrs) return null;

  let score = 0;

  // 1. HRV vs baseline (30pts)
  const hrvHist = D.mornings.filter(x => x.date < m.date && x.hrv).slice(-9);
  const baseline = hrv7 || (hrvHist.length >= 3 ? hrvHist.reduce((a,x)=>a+x.hrv,0)/hrvHist.length : null);
  if(hrv && baseline) {
    const pct = ((hrv - baseline) / baseline) * 100;
    score += pct >= 2 ? 30 : pct >= -3 ? 24 : pct >= -8 ? 14 : pct >= -15 ? 6 : 0;
  } else if(hrv) { score += 18; }

  // 2. RHR vs baseline (15pts)
  const rhrHist = D.mornings.filter(x => x.date < m.date && x.rhr).slice(-21);
  const baseRHR = rhrHist.length >= 3 ? rhrHist.reduce((a,x)=>a+x.rhr,0)/rhrHist.length : 50;
  if(rhr) {
    const d = rhr - baseRHR;
    score += d <= -2 ? 15 : d <= 2 ? 13 : d <= 5 ? 8 : d <= 8 ? 4 : 0;
  }

  // 3. Sleep score — personal baseline (20pts)
  if(sleepScore) {
    const sleepHist = D.mornings.filter(x => x.date < m.date && x.sleepScore).map(x=>x.sleepScore).slice(-30);
    const personalSleepAvg = sleepHist.length >= 7 ? Math.round(sleepHist.reduce((a,b)=>a+b,0)/sleepHist.length) : 83;
    const delta = sleepScore - personalSleepAvg;
    score += delta >= 3 ? 20 : delta >= -3 ? 15 : delta >= -8 ? 9 : delta >= -15 ? 4 : 0;
  }

  // 4. Sleep hours (5pts)
  if(sleepHrs) score += sleepHrs >= 8.5 ? 5 : sleepHrs >= 7.5 ? 4 : sleepHrs >= 6.5 ? 2 : 0;

  // 5. Subjective readiness + legs (10pts)
  const subR = m.readiness || 0, subL = m.legs || 0;
  if(subR || subL) { score += Math.round(((subR||3)+(subL||3))/2/5*10); }
  else { score += 6; }

  // 6. Yesterday's training load (10pts)
  const yDate = new Date(m.date + 'T12:00:00'); yDate.setDate(yDate.getDate()-1);
  const yStr = yDate.getFullYear()+'-'+String(yDate.getMonth()+1).padStart(2,'0')+'-'+String(yDate.getDate()).padStart(2,'0');
  const yActs = (typeof STRAVA_ACTS !== 'undefined' ? STRAVA_ACTS.acts : []).filter(a=>a.d===yStr&&a.mm&&a.mm>5);
  const yHard = yActs.filter(a=>(a.ef==='hard'||a.ef==='max'||a.iv));
  const yMin  = yActs.reduce((s,a)=>s+(a.mm||0),0);
  let loadPts = 10;
  if(yHard.length >= 2) loadPts -= 8;
  else if(yHard.length === 1) loadPts -= 5;
  if(yMin >= 240) loadPts -= 4; else if(yMin >= 180) loadPts -= 3; else if(yMin >= 120) loadPts -= 1;
  score += Math.max(0, loadPts);

  // 7. Week accumulated load (5pts)
  const wk = (typeof getWeekKey === 'function') ? getWeekKey(new Date(m.date+'T12:00:00')) : null;
  if(wk && typeof calcWeekTotalsFromStrava === 'function') {
    const t = calcWeekTotalsFromStrava(wk);
    score += t.totalMin > 660 ? 1 : t.totalMin > 480 ? 2 : t.totalMin > 300 ? 4 : 5;
  } else { score += 3; }

  // 8. Garmin stress (5pts)
  if(gstress) {
    const stressHist = D.mornings.filter(x=>x.date<m.date&&x.gstress>0).map(x=>x.gstress);
    const stressBase = stressHist.length >= 5 ? Math.round(stressHist.reduce((a,b)=>a+b,0)/stressHist.length) : 27;
    const sd = gstress - stressBase;
    score += sd <= -3 ? 5 : sd <= 3 ? 4 : sd <= 8 ? 2 : sd <= 15 ? 1 : 0;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const status = score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red';
  return { readinessScore: score, status };
}
