// ===================================================================
// NUTRITION TAB — Open Food Facts + Barcode Scanner + Label OCR
// ===================================================================
const MEALS = ['breakfast','lunch','dinner','snacks'];
const MEAL_LABELS = {breakfast:'🌅 Breakfast',lunch:'☀️ Lunch',dinner:'🌙 Dinner',snacks:'🍎 Snacks'};

function nutDate() {
  return document.getElementById('nut-date')?.value || localDateStr(new Date());
}
function nutChangeDay(delta) {
  const d = new Date(nutDate() + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  document.getElementById('nut-date').value = localDateStr(d);
  renderNutrition();
}
function saveNutGoals() {
  if(!D.nutGoals) D.nutGoals = {};
  D.nutGoals.cal     = parseFloat(document.getElementById('nut-goal-cal')?.value)    || null;
  D.nutGoals.protein = parseFloat(document.getElementById('nut-goal-pro')?.value)    || null;
  D.nutGoals.carbs   = parseFloat(document.getElementById('nut-goal-carb')?.value)   || null;
  D.nutGoals.fat     = parseFloat(document.getElementById('nut-goal-fat')?.value)    || null;
  D.nutGoals.burned  = parseFloat(document.getElementById('nut-goal-burned')?.value) || null;
  // Save Claude API key only if user typed one in
  const apiKeyEl = document.getElementById('nut-claude-key');
  if(apiKeyEl && apiKeyEl.value.trim()) {
    D.claudeApiKey = apiKeyEl.value.trim();
    apiKeyEl.value = '';
    apiKeyEl.placeholder = '✅ API key saved';
  }
  save(); renderNutritionTotals(nutDate());
}
function getNutDay(date) {
  if(!D.foodlog[date]) D.foodlog[date] = {meals:{breakfast:[],lunch:[],dinner:[],snacks:[]}};
  MEALS.forEach(m => { if(!D.foodlog[date].meals[m]) D.foodlog[date].meals[m] = []; });
  return D.foodlog[date];
}
function getDayTotals(date) {
  const day = D.foodlog[date];
  if(!day) return {cal:0,protein:0,carbs:0,fat:0};
  const t = {cal:0,protein:0,carbs:0,fat:0};
  MEALS.forEach(m => {
    (day.meals[m]||[]).forEach(e => {
      const base = e.servingQty || 100;
      const scale = (e.qty || base) / base;
      t.cal     += (e.cal||0)     * scale;
      t.protein += (e.protein||0) * scale;
      t.carbs   += (e.carbs||0)   * scale;
      t.fat     += (e.fat||0)     * scale;
    });
  });
  return {cal:Math.round(t.cal),protein:Math.round(t.protein),carbs:Math.round(t.carbs),fat:Math.round(t.fat)};
}

// ── BURNED CALORIES FROM STRAVA ──────────────────────────────────────
function getBurnedCalories(date) {
  const BURN_RATE = {run:10, bike:8, swim:9, other:7};
  let burned = 0;
  try {
    const acts = (typeof STRAVA_ACTS !== 'undefined' && STRAVA_ACTS?.acts) ? STRAVA_ACTS.acts : [];
    acts.filter(a => a.d === date).forEach(a => {
      const sport = (a.s||'').toLowerCase();
      const mins  = a.mm || 0;
      let rate = BURN_RATE.other;
      if(sport.includes('run'))                                                      rate = BURN_RATE.run;
      else if(sport.includes('bike')||sport.includes('ride')||sport.includes('cycl')) rate = BURN_RATE.bike;
      else if(sport.includes('swim'))                                                 rate = BURN_RATE.swim;
      burned += mins * rate;
    });
  } catch(e) {}
  // Fall back to manual override if no Strava data found
  if(burned === 0 && D.nutGoals?.burned) burned = D.nutGoals.burned;
  return Math.round(burned);
}

function renderNutritionTotals(date) {
  const t      = getDayTotals(date);
  const g      = D.nutGoals || {};
  const burned = getBurnedCalories(date);
  const net    = t.cal - burned;

  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('nt-cal',    t.cal);
  set('nt-pro',    t.protein + 'g');
  set('nt-carb',   t.carbs   + 'g');
  set('nt-fat',    t.fat     + 'g');
  set('nt-burned', burned > 0 ? '\u2212' + burned : '\u2014');

  // Net calories — colour by proximity to calorie goal
  const netEl = document.getElementById('nt-net');
  if(netEl) {
    netEl.textContent = burned > 0 ? net : '\u2014';
    if(burned > 0) {
      const calGoal = g.cal || 2500;
      const diff = Math.abs(net - calGoal);
      netEl.style.color = diff <= 200 ? 'var(--green)' : diff <= 500 ? 'var(--orange)' : 'var(--red)';
    } else {
      netEl.style.color = 'var(--text-dim)';
    }
  }

  // Calorie progress bar
  const calGoal = g.cal || 2500;
  const pct = Math.min(Math.round(t.cal / calGoal * 100), 110);
  const bar = document.getElementById('nt-cal-bar');
  if(bar) { bar.style.width = Math.min(pct,100)+'%'; bar.style.background = pct>105?'var(--red)':pct>90?'var(--orange)':'var(--green)'; }
  const pctEl  = document.getElementById('nt-cal-pct');
  if(pctEl)  pctEl.textContent  = t.cal + ' / ' + calGoal + ' kcal (' + pct + '%)';
  const goalEl = document.getElementById('nt-cal-goal');
  if(goalEl) goalEl.textContent = burned > 0 ? 'Goal: '+calGoal+' | Burned: '+burned : 'Goal: '+calGoal+' kcal';

  // Macro progress bars — visible only when goals are set
  const macros = [
    {id:'pro',  val:t.protein, goal:g.protein, color:'#64b5f6', unit:'g'},
    {id:'carb', val:t.carbs,   goal:g.carbs,   color:'#ffb74d', unit:'g'},
    {id:'fat',  val:t.fat,     goal:g.fat,     color:'#f48fb1', unit:'g'},
  ];
  const macroSection = document.getElementById('nt-macro-bars');
  const hasGoals = g.protein || g.carbs || g.fat;
  if(macroSection) macroSection.style.display = hasGoals ? 'block' : 'none';
  macros.forEach(m => {
    if(!m.goal) return;
    const mp    = Math.min(Math.round(m.val / m.goal * 100), 110);
    const barEl = document.getElementById('nt-'+m.id+'-bar');
    const pEl   = document.getElementById('nt-'+m.id+'-pct');
    if(barEl) { barEl.style.width = Math.min(mp,100)+'%'; barEl.style.background = m.color; }
    if(pEl)   pEl.textContent = m.val+m.unit+' / '+m.goal+m.unit+' ('+mp+'%)';
  });

  const syncNote = document.getElementById('nut-sync-note');
  if(syncNote) {
    const today = localDateStr(new Date());
    syncNote.textContent = (date===today) ? '✅ Auto-syncs to Morning Check' : '';
  }
}

function renderNutrition() {
  const date = nutDate();
  const day  = getNutDay(date);
  const g    = D.nutGoals || {};
  const setV = (id,v) => { const el=document.getElementById(id); if(el&&v!=null) el.value=v; };
  setV('nut-goal-cal',g.cal); setV('nut-goal-pro',g.protein);
  setV('nut-goal-carb',g.carbs); setV('nut-goal-fat',g.fat); setV('nut-goal-burned',g.burned);
  // API key: show placeholder if saved, don't re-populate the field for security
  const apiKeyEl = document.getElementById('nut-claude-key');
  if(apiKeyEl) apiKeyEl.placeholder = D.claudeApiKey ? '✅ API key saved (enter new to replace)' : 'sk-ant-api03-...';
  renderNutritionTotals(date);
  renderFoodLibrary();
  renderMealTemplates();
  const mealsEl = document.getElementById('nut-meals');
  if(!mealsEl) return;
  mealsEl.innerHTML = MEALS.map(meal => {
    const entries = day.meals[meal] || [];
    const mTot = {cal:0,protein:0,carbs:0,fat:0};
    entries.forEach(e => {
      const s = (e.qty||e.servingQty||100) / (e.servingQty||100);
      mTot.cal += (e.cal||0)*s; mTot.protein += (e.protein||0)*s;
      mTot.carbs += (e.carbs||0)*s; mTot.fat += (e.fat||0)*s;
    });
    const rows = entries.map((e,i) => {
      const s    = (e.qty||e.servingQty||100) / (e.servingQty||100);
      const cal  = Math.round((e.cal||0)*s);
      const pro  = Math.round((e.protein||0)*s);
      const carb = Math.round((e.carbs||0)*s);
      const fat  = Math.round((e.fat||0)*s);
      return `<tr>
        <td style="font-size:12px;max-width:160px;">${e.name}<br><span style="font-size:9px;color:var(--text-dim);">${e.brand?e.brand+' \xb7 ':''}</span></td>
        <td style="font-size:11px;">
          <input type="number" value="${e.qty||e.servingQty||100}" min="1" step="1"
            onchange="updateEntryQty('${meal}',${i},this.value)"
            style="width:60px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:3px 6px;font-size:11px;">
          <span style="font-size:10px;color:var(--text-dim);">${e.unit||'g'}</span>
        </td>
        <td style="font-size:11px;">${cal}</td>
        <td style="font-size:11px;color:#64b5f6;">${pro}g</td>
        <td style="font-size:11px;color:#ffb74d;">${carb}g</td>
        <td style="font-size:11px;color:#f48fb1;">${fat}g</td>
        <td><button onclick="removeEntry('${meal}',${i})" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:14px;padding:2px 6px;" title="Remove">\u2715</button></td>
      </tr>`;
    }).join('');
    const totRow = entries.length > 1 ? `<tr style="border-top:1px solid var(--border);background:rgba(255,255,255,.02);">
      <td colspan="2" style="font-size:10px;color:var(--text-dim);font-weight:600;padding:6px 8px;">MEAL TOTAL</td>
      <td style="font-size:11px;font-weight:700;">${Math.round(mTot.cal)}</td>
      <td style="font-size:11px;color:#64b5f6;font-weight:600;">${Math.round(mTot.protein)}g</td>
      <td style="font-size:11px;color:#ffb74d;font-weight:600;">${Math.round(mTot.carbs)}g</td>
      <td style="font-size:11px;color:#f48fb1;font-weight:600;">${Math.round(mTot.fat)}g</td><td></td>
    </tr>` : '';
    return `<div class="card" style="margin-bottom:10px;padding:14px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.05em;">${MEAL_LABELS[meal]}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn sec sml" onclick="openFoodSearch('${meal}')">🔍 Search Foods</button>
          <button class="btn sec sml" onclick="openMyFoods('${meal}')">📋 My Foods</button>
          <button class="btn sec sml" onclick="openAddTemplateToMeal('${meal}')">🍽 Template</button>
        </div>
      </div>
      ${entries.length > 0 ? `<div style="overflow-x:auto;"><table class="tbl" style="width:100%;">
        <thead><tr><th style="text-align:left;">Food</th><th>Qty</th><th>kcal</th><th style="color:#64b5f6;">Pro</th><th style="color:#ffb74d;">Carbs</th><th style="color:#f48fb1;">Fat</th><th></th></tr></thead>
        <tbody>${rows}${totRow}</tbody></table></div>`
      : `<div style="font-size:11px;color:var(--text-dim);padding:4px 0;">Nothing logged \u2014 search for foods or pick from your library</div>`}
    </div>`;
  }).join('');
}

function updateEntryQty(meal, idx, newQty) {
  const date = nutDate();
  const entries = getNutDay(date).meals[meal];
  if(entries[idx]) { entries[idx].qty = parseFloat(newQty) || entries[idx].servingQty || 100; }
  save();
  renderNutritionTotals(date);
  syncNutritionToMorning(date);
}
function removeEntry(meal, idx) {
  const date = nutDate();
  getNutDay(date).meals[meal].splice(idx, 1);
  save(); renderNutrition(); syncNutritionToMorning(date);
}

// ── OPEN FOOD FACTS SEARCH — AU-prioritised ──────────────────────────
async function searchOpenFoodFacts(query) {
  const fields = 'product_name,brands,nutriments,serving_size,serving_quantity,countries_tags';
  const base   = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&sort_by=unique_scans_n&fields=${fields}`;
  const auUrl  = base + '&page_size=20&tagtype_0=countries&tag_contains_0=contains&tag_0=australia';
  const glUrl  = base + '&page_size=20';

  function parseProduct(p) {
    const n      = p.nutriments;
    const cal100  = n['energy-kcal_100g'] || n['energy-kcal'] || Math.round((n['energy_100g']||0)/4.184) || 0;
    const pro100  = n['proteins_100g']        || 0;
    const carb100 = n['carbohydrates_100g']   || 0;
    const fat100  = n['fat_100g']             || 0;
    const serving = parseFloat(p.serving_quantity) || 100;
    const isAU    = (p.countries_tags||[]).some(t => t.includes('australia'));
    return {
      name: p.product_name, brand: p.brands || '',
      servingQty: serving, unit: 'g',
      cal: Math.round(cal100),
      protein: Math.round(pro100  * 10) / 10,
      carbs:   Math.round(carb100 * 10) / 10,
      fat:     Math.round(fat100  * 10) / 10,
      _per100g: true, _isAU: isAU
    };
  }

  try {
    // AU-filtered search first (most popular AU products by scan count)
    const r1  = await fetch(auUrl);
    const d1  = await r1.json();
    const auP = (d1.products||[]).filter(p => p.product_name && p.nutriments);
    let merged = auP.map(parseProduct);

    // If fewer than 6 AU results, pad with global results
    if(auP.length < 6) {
      const r2  = await fetch(glUrl);
      const d2  = await r2.json();
      const glP = (d2.products||[]).filter(p => p.product_name && p.nutriments);
      const seen = new Set(merged.map(p => p.name + '|' + p.brand));
      glP.forEach(p => {
        const parsed = parseProduct(p);
        const key    = parsed.name + '|' + parsed.brand;
        if(!seen.has(key)) { merged.push(parsed); seen.add(key); }
      });
    }
    return merged.slice(0, 25);
  } catch(e) {
    console.error('Food search error:', e);
    return [];
  }
}

function openFoodSearch(meal) {
  const html = `<div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(560px,96vw);max-height:88vh;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--green);">🔍 SEARCH FOODS</div>
        <button class="btn sec sml" onclick="closeEditModal()">\u2715</button>
      </div>
      <!-- Scan shortcuts -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;padding:8px 10px;background:var(--bg);border-radius:8px;border:1px solid var(--border);">
        <span style="font-size:10px;color:var(--text-dim);align-self:center;margin-right:2px;">Quick add:</span>
        <button class="btn sec sml" onclick="closeEditModal();openBarcodeScanner('${meal}')">📷 Scan Barcode</button>
        <button class="btn sec sml" onclick="closeEditModal();openLabelScan('${meal}')">🏷 Scan Label (AI)</button>
        <button class="btn sec sml" onclick="closeEditModal();openAddFoodModal('${meal}',null)">\u270f\ufe0f Add Manually</button>
      </div>
      <div style="display:flex;gap:8px;">
        <input type="text" id="fs-query" placeholder="e.g. weetbix, milo, chicken breast\u2026"
          style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:10px 14px;font-size:14px;"
          onkeydown="if(event.key==='Enter')doFoodSearch('${meal}')">
        <button class="btn" style="background:var(--green);color:#000;font-weight:700;padding:10px 18px;" onclick="doFoodSearch('${meal}')">Search</button>
      </div>
      <div style="font-size:10px;color:var(--text-dim);">🇦🇺 Prioritises Australian products \u2014 sorted by most popular scans</div>
      <div id="fs-results" style="overflow-y:auto;flex:1;min-height:200px;">
        <div style="font-size:12px;color:var(--text-dim);text-align:center;padding:30px 0;">Type a food and press Search</div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('fs-query')?.focus();
}

async function doFoodSearch(meal) {
  const q = document.getElementById('fs-query')?.value?.trim();
  if(!q) return;
  const el = document.getElementById('fs-results');
  if(el) el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);">\u23f3 Searching\u2026</div>';
  const results = await searchOpenFoodFacts(q);
  if(!el) return;
  if(!results.length) {
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim);">No results found. <a href="#" onclick="closeEditModal();openAddFoodModal('${meal}',null)" style="color:var(--green);">Add manually?</a></div>`;
    return;
  }
  el.innerHTML = results.map((f,i) => `
    <div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${f.name}
          ${f._isAU ? '<span style="font-size:9px;background:rgba(0,180,0,.18);color:var(--green);border-radius:4px;padding:1px 5px;margin-left:4px;">🇦🇺</span>' : ''}
        </div>
        ${f.brand ? `<div style="font-size:10px;color:var(--text-dim);">${f.brand}</div>` : ''}
        <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">
          Per 100g: <b>${f.cal}</b> kcal \u00b7
          <span style="color:#64b5f6;">${f.protein}g pro</span> \u00b7
          <span style="color:#ffb74d;">${f.carbs}g carbs</span> \u00b7
          <span style="color:#f48fb1;">${f.fat}g fat</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="btn sec sml" style="font-size:10px;" onclick="addSearchResultToLog(${i},'${meal}')">+ Log</button>
        <button class="btn sec sml" style="font-size:10px;" onclick="saveSearchResultToLibrary(${i})" title="Save to library">\ud83d\udcbe</button>
      </div>
    </div>`).join('');
  window._fsResults = results;
  window._fsMeal    = meal;
}

function addSearchResultToLog(idx, meal) {
  const f = window._fsResults?.[idx];
  if(!f) return;
  const html = `<div id="fs-qty-bg" onclick="document.getElementById('fs-qty-bg').remove()" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:22px;width:min(360px,95vw);">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;margin-bottom:10px;">${f.name}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">Per 100g: ${f.cal} kcal \u00b7 ${f.protein}g protein \u00b7 ${f.carbs}g carbs \u00b7 ${f.fat}g fat</div>
      <label style="font-size:10px;color:var(--text-dim);">How many grams?</label>
      <input type="number" id="fs-qty-val" value="100" min="1" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;margin-bottom:12px;box-sizing:border-box;">
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn sec sml" onclick="document.getElementById('fs-qty-bg').remove()">Cancel</button>
        <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="confirmAddSearchResult(${idx},'${meal}')">Add to ${meal}</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('fs-qty-val')?.focus();
  document.getElementById('fs-qty-val')?.select();
}

function confirmAddSearchResult(idx, meal) {
  const f = window._fsResults?.[idx];
  if(!f) return;
  const qty   = parseFloat(document.getElementById('fs-qty-val')?.value) || 100;
  const entry = {...f, qty, servingQty: 100};
  const date  = nutDate();
  getNutDay(date).meals[meal].push(entry);
  save();
  document.getElementById('fs-qty-bg')?.remove();
  renderNutrition();
  syncNutritionToMorning(date);
  showToast(f.name + ' added to ' + meal + ' \u2713');
}

function saveSearchResultToLibrary(idx) {
  const f = window._fsResults?.[idx];
  if(!f) return;
  if(D.foods.find(x=>x.name===f.name&&x.brand===f.brand)) { showToast('Already in your library', true); return; }
  D.foods.push({...f, id: Date.now()});
  save();
  renderFoodLibrary();
  showToast(f.name + ' saved to library \u2713');
}

// ── MY FOODS QUICK-ADD ─────────────────────────────────────────────
function openMyFoods(meal) {
  const foods = D.foods || [];
  const html = `<div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(520px,96vw);max-height:85vh;display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--green);">MY FOODS</div>
        <button class="btn sec sml" onclick="closeEditModal()">\u2715</button>
      </div>
      <input type="text" id="mf-search" placeholder="Search your library\u2026" oninput="renderMyFoodsSearch('${meal}')"
        style="background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-size:13px;">
      <div id="mf-list" style="overflow-y:auto;flex:1;">
        ${foods.length === 0 ? '<div style="font-size:12px;color:var(--text-dim);text-align:center;padding:20px;">No saved foods yet \u2014 search above to find and save foods.</div>' :
          foods.map((f,i) => `<div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;">${f.name}</div>
              <div style="font-size:10px;color:var(--text-dim);">Per ${f.servingQty||100}${f.unit||'g'}: ${f.cal} kcal \u00b7 ${f.protein}g pro \u00b7 ${f.carbs}g carbs</div>
            </div>
            <button class="btn sec sml" style="font-size:10px;flex-shrink:0;" onclick="addMyFoodToMeal(${i},'${meal}')">+ Add</button>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function renderMyFoodsSearch(meal) {
  const q     = document.getElementById('mf-search')?.value.toLowerCase()||'';
  const foods = (D.foods||[]).filter(f=>f.name.toLowerCase().includes(q)||(f.brand||'').toLowerCase().includes(q));
  const el    = document.getElementById('mf-list');
  if(!el) return;
  if(!foods.length) { el.innerHTML='<div style="font-size:12px;color:var(--text-dim);text-align:center;padding:20px;">No matches</div>'; return; }
  el.innerHTML = foods.map((f,i) => `<div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:600;">${f.name}</div>
      <div style="font-size:10px;color:var(--text-dim);">Per ${f.servingQty||100}${f.unit||'g'}: ${f.cal} kcal \u00b7 ${f.protein}g pro \u00b7 ${f.carbs}g carbs</div>
    </div>
    <button class="btn sec sml" style="font-size:10px;flex-shrink:0;" onclick="addMyFoodToMeal(${D.foods.indexOf(f)},'${meal}')">+ Add</button>
  </div>`).join('');
}

function addMyFoodToMeal(foodIdx, meal) {
  const f    = D.foods[foodIdx];
  if(!f) return;
  const date = nutDate();
  const qty  = f.servingQty || 100;
  getNutDay(date).meals[meal].push({...f, qty, servingQty: f.servingQty||100});
  save(); closeEditModal(); renderNutrition(); syncNutritionToMorning(date);
  showToast(f.name + ' added \u2713');
}

// ── BARCODE SCANNER (QuaggaJS) ────────────────────────────────────────
function openBarcodeScanner(meal) {
  const html = `<div id="bc-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--green);">📷 SCAN BARCODE</div>
    <div id="bc-viewport" style="width:min(340px,90vw);height:220px;background:#111;border-radius:10px;overflow:hidden;position:relative;border:2px solid var(--border);">
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:12px;text-align:center;padding:10px;" id="bc-loading">Starting camera\u2026</div>
      <div style="position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;">
        <div style="width:80%;height:38%;border:2px solid var(--green);border-radius:4px;box-shadow:0 0 0 1000px rgba(0,0,0,.4);"></div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text-dim);text-align:center;max-width:300px;">Hold barcode inside the green box \u2014 auto-detects</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
      <button class="btn sec sml" onclick="showManualBarcodeEntry('${meal}')">⌨️ Enter Manually</button>
      <button class="btn sec sml" onclick="closeBarcodeScanner()">\u2715 Cancel</button>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  if(typeof Quagga === 'undefined') {
    const loadEl = document.getElementById('bc-loading');
    if(loadEl) loadEl.innerHTML = 'Scanner library not loaded.<br>Use manual entry below.';
    return;
  }

  Quagga.init({
    inputStream: {
      type: 'LiveStream',
      target: document.getElementById('bc-viewport'),
      constraints: { width:{ideal:640}, height:{ideal:480}, facingMode:'environment' }
    },
    decoder: {
      readers: ['ean_reader','ean_8_reader','upc_reader','upc_e_reader','code_128_reader','code_39_reader']
    },
    locate: true
  }, function(err) {
    const loadEl = document.getElementById('bc-loading');
    if(err) {
      if(loadEl) loadEl.innerHTML = '\u26a0\ufe0f Camera unavailable.<br>Use manual entry below.';
      return;
    }
    if(loadEl) loadEl.style.display = 'none';
    Quagga.start();
  });

  // Debounce to avoid duplicate lookups
  let lastCode = '', lastTime = 0;
  Quagga.onDetected(function(result) {
    const code = result.codeResult.code;
    const now  = Date.now();
    if(code && code !== lastCode && now - lastTime > 1500) {
      lastCode = code; lastTime = now;
      Quagga.stop();
      closeBarcodeScanner();
      lookupBarcode(code, meal);
    }
  });
}

function closeBarcodeScanner() {
  try { if(typeof Quagga !== 'undefined') Quagga.stop(); } catch(e) {}
  document.getElementById('bc-modal-bg')?.remove();
}

function showManualBarcodeEntry(meal) {
  try { if(typeof Quagga !== 'undefined') Quagga.stop(); } catch(e) {}
  const modal = document.getElementById('bc-modal-bg');
  if(!modal) return;
  modal.innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--green);">\u2328\ufe0f ENTER BARCODE</div>
    <div style="width:min(340px,90vw);">
      <input type="text" id="bc-manual-input" placeholder="e.g. 9310072055756" inputmode="numeric" autocomplete="off"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:12px 14px;font-size:18px;box-sizing:border-box;text-align:center;letter-spacing:2px;"
        onkeydown="if(event.key==='Enter')submitManualBarcode('${meal}')">
    </div>
    <div style="font-size:11px;color:var(--text-dim);">Enter the barcode number from the product packaging</div>
    <div style="display:flex;gap:10px;">
      <button class="btn sec sml" onclick="document.getElementById('bc-modal-bg').remove()">Cancel</button>
      <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="submitManualBarcode('${meal}')">🔍 Look Up</button>
    </div>`;
  document.getElementById('bc-manual-input')?.focus();
}

function submitManualBarcode(meal) {
  const code = document.getElementById('bc-manual-input')?.value?.trim();
  if(!code) { showToast('Enter a barcode number', true); return; }
  document.getElementById('bc-modal-bg')?.remove();
  lookupBarcode(code, meal);
}

async function lookupBarcode(barcode, meal) {
  showToast('🔍 Looking up ' + barcode + '\u2026');
  try {
    const r    = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await r.json();
    if(data.status !== 1 || !data.product) {
      if(confirm('Product not found in Open Food Facts.\n\nWould you like to add it manually?')) {
        openAddFoodModal(meal, null);
      }
      return;
    }
    const p     = data.product;
    const n     = p.nutriments || {};
    const cal100  = n['energy-kcal_100g'] || n['energy-kcal'] || Math.round((n['energy_100g']||0)/4.184) || 0;
    const pro100  = n['proteins_100g']      || 0;
    const carb100 = n['carbohydrates_100g'] || 0;
    const fat100  = n['fat_100g']           || 0;
    const serving = parseFloat(p.serving_quantity) || 100;
    const food = {
      name:       p.product_name || p.product_name_en || 'Unknown Product',
      brand:      p.brands || '',
      servingQty: serving,
      unit:       'g',
      cal:        Math.round(cal100),
      protein:    Math.round(pro100  * 10) / 10,
      carbs:      Math.round(carb100 * 10) / 10,
      fat:        Math.round(fat100  * 10) / 10,
      _per100g:   true,
      barcode
    };
    showBarcodeResult(food, meal);
  } catch(e) {
    showToast('Lookup failed \u2014 check your connection', true);
  }
}

function showBarcodeResult(food, meal) {
  const html = `<div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(380px,95vw);">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--green);margin-bottom:6px;">\u2705 PRODUCT FOUND</div>
      <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${food.name}</div>
      ${food.brand ? `<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">${food.brand}</div>` : ''}
      <div style="font-size:11px;color:var(--text-dim);background:var(--bg);border-radius:6px;padding:10px;margin-bottom:14px;">
        Per 100g: <b>${food.cal}</b> kcal \u00b7
        <span style="color:#64b5f6;">${food.protein}g pro</span> \u00b7
        <span style="color:#ffb74d;">${food.carbs}g carbs</span> \u00b7
        <span style="color:#f48fb1;">${food.fat}g fat</span>
      </div>
      <div style="margin-bottom:10px;"><label style="font-size:10px;color:var(--text-dim);">Meal</label>
        <select id="br-meal" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;">
          ${MEALS.map(m=>`<option value="${m}" ${m===meal?'selected':''}>${MEAL_LABELS[m]}</option>`).join('')}
        </select></div>
      <div style="margin-bottom:14px;"><label style="font-size:10px;color:var(--text-dim);">Quantity (g)</label>
        <input type="number" id="br-qty" value="${food.servingQty}" min="1"
          style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;box-sizing:border-box;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
        <button class="btn sec sml" onclick="closeEditModal()">Cancel</button>
        <button class="btn sec sml" onclick="saveBarcodeToLibrary()">\ud83d\udcbe Save to Library</button>
        <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="addBarcodeToLog()">+ Add to Log</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  window._barcodeFood = food;
}

function addBarcodeToLog() {
  const food = window._barcodeFood;
  if(!food) return;
  const meal = document.getElementById('br-meal').value;
  const qty  = parseFloat(document.getElementById('br-qty').value) || 100;
  const date = nutDate();
  getNutDay(date).meals[meal].push({...food, qty, servingQty: 100});
  save(); closeEditModal(); renderNutrition(); syncNutritionToMorning(date);
  showToast(food.name + ' added to ' + meal + ' \u2713');
}

function saveBarcodeToLibrary() {
  const food = window._barcodeFood;
  if(!food) return;
  if(D.foods.find(x => x.name===food.name && x.brand===food.brand)) {
    showToast('Already in your library', true); return;
  }
  D.foods.push({...food, id: Date.now()});
  save(); renderFoodLibrary();
  showToast(food.name + ' saved to library \u2713');
}

// ── NUTRITIONAL LABEL OCR (Claude API) ───────────────────────────────
function openLabelScan(meal) {
  if(!D.claudeApiKey) {
    showToast('Set your Claude API key in \u2699\ufe0f Daily Targets first', true);
    const details = document.querySelector('#page-nutrition details');
    if(details) details.open = true;
    setTimeout(() => document.getElementById('nut-claude-key')?.focus(), 300);
    return;
  }

  const existing = document.getElementById('label-scan-input');
  if(existing) existing.remove();

  const input = document.createElement('input');
  input.type    = 'file';
  input.id      = 'label-scan-input';
  input.accept  = 'image/*';
  input.capture = 'environment';
  input.style.display = 'none';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if(file) processLabelOCR(file, meal);
    input.remove();
  };
  document.body.appendChild(input);
  input.click();
}

async function processLabelOCR(file, meal) {
  // Show loading overlay
  const overlay = document.createElement('div');
  overlay.id = 'ocr-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10001;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;';
  overlay.innerHTML = `
    <div style="font-size:42px;">🏷\ufe0f</div>
    <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--green);">READING LABEL\u2026</div>
    <div style="font-size:12px;color:var(--text-dim);">AI is extracting nutritional information</div>
    <div style="width:200px;height:4px;background:var(--bg);border-radius:4px;overflow:hidden;">
      <div style="height:100%;background:var(--green);border-radius:4px;animation:pulse 1.5s ease-in-out infinite;width:60%;"></div>
    </div>`;
  document.body.appendChild(overlay);

  try {
    // Convert to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': D.claudeApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-calls': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } },
            { type: 'text', text: 'Extract nutritional info from this food label. Return ONLY valid JSON with no markdown fences or extra text: {"name":"product name","brand":"brand name","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"sugar_g":0,"sodium_mg":0,"serving_size":100,"serving_unit":"g"}. Calories and macros should be per the serving_size shown on label. Use 0 for any field not visible.' }
          ]
        }]
      })
    });

    overlay.remove();

    if(!response.ok) {
      const errData = await response.json().catch(()=>({}));
      throw new Error(errData.error?.message || 'API error ' + response.status);
    }

    const apiData = await response.json();
    const rawText = (apiData.content||[]).map(c => c.text||'').join('').trim();

    let parsed;
    try {
      const cleaned = rawText.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
      parsed = JSON.parse(cleaned);
    } catch(e) {
      throw new Error('Could not parse AI response. Try a clearer, well-lit photo of the nutrition panel.');
    }

    // Open the manual entry form and pre-fill it
    closeEditModal();
    openAddFoodModal(meal, null);

    setTimeout(() => {
      const sv = (id, v) => { const el = document.getElementById(id); if(el && v != null && v !== '') el.value = v; };
      sv('nf-name',    parsed.name    || '');
      sv('nf-brand',   parsed.brand   || '');
      sv('nf-serving', parsed.serving_size || 100);
      sv('nf-cal',     parsed.calories);
      sv('nf-protein', parsed.protein_g);
      sv('nf-carbs',   parsed.carbs_g);
      sv('nf-fat',     parsed.fat_g);
      // Unit dropdown
      const unitEl = document.getElementById('nf-unit');
      if(unitEl && parsed.serving_unit) {
        const target = (parsed.serving_unit||'g').toLowerCase();
        const opt    = [...unitEl.options].find(o => o.value === target);
        if(opt) unitEl.value = opt.value;
      }
      showToast('\u2705 Label read \u2014 review details then save');
    }, 150);

  } catch(e) {
    if(document.getElementById('ocr-overlay')) document.getElementById('ocr-overlay').remove();
    console.error('Label OCR error:', e);
    showToast('OCR failed: ' + e.message, true);
  }
}

// ── MEAL TEMPLATES ─────────────────────────────────────────────────
function renderMealTemplates() {
  const el = document.getElementById('nut-templates');
  if(!el) return;
  const templates = D.mealTemplates || [];
  if(!templates.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-dim);">No templates yet \u2014 log a full day then click "Save Current Day as Template".</div>';
    return;
  }
  el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;">
    ${templates.map((t,i) => `<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px;">
      <div>
        <div style="font-size:13px;font-weight:600;">${t.name}</div>
        <div style="font-size:10px;color:var(--text-dim);">${t.totalCal} kcal \u00b7 ${t.totalPro}g protein</div>
      </div>
      <button class="btn sec sml" style="font-size:10px;" onclick="applyTemplate(${i})">Apply to Today</button>
      <button style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:12px;" onclick="deleteTemplate(${i})" title="Delete">\u2715</button>
    </div>`).join('')}
  </div>`;
}

function openSaveTemplateModal() {
  const date = nutDate();
  const t    = getDayTotals(date);
  if(!t.cal) { showToast('No food logged today to save as template', true); return; }
  const html = `<div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(400px,95vw);">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--green);margin-bottom:14px;">SAVE AS TEMPLATE</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Saving ${date}: ${t.cal} kcal \u00b7 ${t.protein}g protein \u00b7 ${t.carbs}g carbs \u00b7 ${t.fat}g fat</div>
      <label style="font-size:10px;color:var(--text-dim);">Template Name</label>
      <input type="text" id="tmpl-name" placeholder="e.g. Race Day, Hard Training, Rest Day"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;margin-bottom:14px;box-sizing:border-box;">
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn sec sml" onclick="closeEditModal()">Cancel</button>
        <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="saveTemplate('${date}')">\ud83d\udcbe Save Template</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('tmpl-name')?.focus();
}

function saveTemplate(date) {
  const name = document.getElementById('tmpl-name')?.value?.trim();
  if(!name) { showToast('Give the template a name', true); return; }
  const day = D.foodlog[date];
  if(!D.mealTemplates) D.mealTemplates = [];
  const t = getDayTotals(date);
  D.mealTemplates.push({
    name, date, totalCal: t.cal, totalPro: t.protein,
    meals: JSON.parse(JSON.stringify(day.meals))
  });
  save(); closeEditModal(); renderMealTemplates();
  showToast('Template "' + name + '" saved \u2713');
}

function applyTemplate(idx) {
  const tmpl = (D.mealTemplates||[])[idx];
  if(!tmpl) return;
  const date = nutDate();
  if(!confirm('Apply template "' + tmpl.name + '" to ' + date + '? This will REPLACE what is currently logged.')) return;
  getNutDay(date).meals = JSON.parse(JSON.stringify(tmpl.meals));
  save(); renderNutrition(); syncNutritionToMorning(date);
  showToast('Template applied to ' + date + ' \u2713');
}

function deleteTemplate(idx) {
  if(!confirm('Delete this template?')) return;
  D.mealTemplates.splice(idx, 1);
  save(); renderMealTemplates();
}

function openAddTemplateToMeal(meal) {
  const templates = D.mealTemplates || [];
  if(!templates.length) { showToast('No templates saved yet', true); return; }
  const html = `<div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(420px,95vw);">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--green);margin-bottom:14px;">ADD TEMPLATE TO ${meal.toUpperCase()}</div>
      ${templates.map((t,i) => `<div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:13px;font-weight:600;">${t.name}</div>
          <div style="font-size:10px;color:var(--text-dim);">${t.totalCal} kcal \u00b7 ${t.totalPro}g protein</div>
        </div>
        <button class="btn sec sml" style="font-size:10px;" onclick="addTemplateToMeal(${i},'${meal}')">Add</button>
      </div>`).join('')}
      <div style="margin-top:12px;text-align:right;"><button class="btn sec sml" onclick="closeEditModal()">Close</button></div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function addTemplateToMeal(tmplIdx, meal) {
  const tmpl = D.mealTemplates[tmplIdx];
  const date = nutDate();
  const day  = getNutDay(date);
  MEALS.forEach(m => { (tmpl.meals[m]||[]).forEach(e => day.meals[meal].push({...e})); });
  save(); closeEditModal(); renderNutrition(); syncNutritionToMorning(date);
  showToast('Template added to ' + meal + ' \u2713');
}

// ── CUSTOM FOOD MANUAL ENTRY ───────────────────────────────────────
function openAddFoodModal(meal, editIdx) {
  const f = (editIdx !== null && editIdx !== undefined) ? D.foods[editIdx] : null;
  const html = `<div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(480px,96vw);max-height:90vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--green);">${f ? 'EDIT' : 'ADD CUSTOM'} FOOD</div>
        <button class="btn sec sml" onclick="closeEditModal()">\u2715</button>
      </div>
      <div style="font-size:10px;color:var(--text-dim);margin-bottom:12px;">Enter values per serving size (e.g. per 100g, per 1 cup, per 1 slice)</div>
      <div style="margin-bottom:10px;"><label style="font-size:10px;color:var(--text-dim);">Food Name *</label>
        <input type="text" id="nf-name" value="${f?.name||''}" placeholder="e.g. Chicken Breast"
          style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;box-sizing:border-box;"></div>
      <div style="margin-bottom:10px;"><label style="font-size:10px;color:var(--text-dim);">Brand (optional)</label>
        <input type="text" id="nf-brand" value="${f?.brand||''}" placeholder="e.g. Woolworths"
          style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;box-sizing:border-box;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        <div><label style="font-size:10px;color:var(--text-dim);">Serving Size</label>
          <input type="number" id="nf-serving" value="${f?.servingQty||100}" min="1"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;"></div>
        <div><label style="font-size:10px;color:var(--text-dim);">Unit</label>
          <select id="nf-unit" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;">
            ${['g','ml','oz','cup','tbsp','tsp','piece','slice','scoop','serve'].map(u=>`<option value="${u}" ${(f?.unit||'g')===u?'selected':''}>${u}</option>`).join('')}
          </select></div>
        <div><label style="font-size:10px;color:var(--text-dim);">Calories (kcal) *</label>
          <input type="number" id="nf-cal" value="${f?.cal||''}" placeholder="e.g. 165"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;"></div>
        <div><label style="font-size:10px;color:var(--text-dim);">Protein (g)</label>
          <input type="number" id="nf-protein" value="${f?.protein||''}" placeholder="e.g. 31" step="0.1"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;"></div>
        <div><label style="font-size:10px;color:var(--text-dim);">Carbs (g)</label>
          <input type="number" id="nf-carbs" value="${f?.carbs||''}" placeholder="e.g. 0" step="0.1"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;"></div>
        <div><label style="font-size:10px;color:var(--text-dim);">Fat (g)</label>
          <input type="number" id="nf-fat" value="${f?.fat||''}" placeholder="e.g. 3.6" step="0.1"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;"></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
        <button class="btn sec sml" onclick="closeEditModal()">Cancel</button>
        ${meal ? `<button class="btn sec sml" onclick="addCustomFoodToLog('${meal}')">+ Add to ${meal}</button>` : ''}
        <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="saveFoodEntry(${(editIdx!==null&&editIdx!==undefined)?editIdx:'null'},'${meal||''}')">\ud83d\udcbe Save to Library</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('nf-name')?.focus();
}

function addCustomFoodToLog(meal) {
  const name = document.getElementById('nf-name')?.value?.trim();
  const cal  = parseFloat(document.getElementById('nf-cal')?.value);
  if(!name || !cal) { showToast('Name and calories are required', true); return; }
  const entry = {
    id: Date.now(),
    name, brand: document.getElementById('nf-brand')?.value?.trim() || '',
    servingQty: parseFloat(document.getElementById('nf-serving')?.value) || 100,
    unit: document.getElementById('nf-unit')?.value || 'g',
    cal, protein: parseFloat(document.getElementById('nf-protein')?.value) || 0,
    carbs: parseFloat(document.getElementById('nf-carbs')?.value) || 0,
    fat: parseFloat(document.getElementById('nf-fat')?.value) || 0,
  };
  const date = nutDate();
  getNutDay(date).meals[meal].push({...entry, qty: entry.servingQty});
  save(); closeEditModal(); renderNutrition(); syncNutritionToMorning(date);
  showToast(name + ' added to ' + meal + ' \u2713');
}

function saveFoodEntry(editIdx, meal) {
  const name = document.getElementById('nf-name')?.value?.trim();
  const cal  = parseFloat(document.getElementById('nf-cal')?.value);
  if(!name || !cal) { showToast('Name and calories are required', true); return; }
  const entry = {
    id: (editIdx !== null && editIdx !== undefined) ? (D.foods[editIdx]?.id || Date.now()) : Date.now(),
    name, brand: document.getElementById('nf-brand')?.value?.trim() || '',
    servingQty: parseFloat(document.getElementById('nf-serving')?.value) || 100,
    unit: document.getElementById('nf-unit')?.value || 'g',
    cal, protein: parseFloat(document.getElementById('nf-protein')?.value) || 0,
    carbs: parseFloat(document.getElementById('nf-carbs')?.value) || 0,
    fat: parseFloat(document.getElementById('nf-fat')?.value) || 0,
  };
  if(editIdx !== null && editIdx !== undefined && D.foods[editIdx]) {
    D.foods[editIdx] = entry;
  } else {
    D.foods.push(entry);
  }
  if(meal) {
    const date = nutDate();
    getNutDay(date).meals[meal].push({...entry, qty: entry.servingQty});
    syncNutritionToMorning(date);
  }
  save(); closeEditModal(); renderNutrition();
  showToast(name + ' saved \u2713');
}

function renderFoodLibrary() {
  const el    = document.getElementById('nut-library');
  if(!el) return;
  const q     = (document.getElementById('nut-lib-search')?.value||'').toLowerCase();
  const foods = (D.foods||[]).filter(f => !q || f.name.toLowerCase().includes(q) || (f.brand||'').toLowerCase().includes(q));
  if(!foods.length) {
    el.innerHTML = q ? '<div style="font-size:11px;color:var(--text-dim);">No matches in your library.</div>' :
      '<div style="font-size:11px;color:var(--text-dim);">Your food library is empty. Search for foods above or add custom foods.</div>';
    return;
  }
  el.innerHTML = `<div style="overflow-x:auto;"><table class="tbl" style="width:100%;">
    <thead><tr><th style="text-align:left;">Food</th><th>Serving</th><th>kcal</th><th style="color:#64b5f6;">Pro</th><th style="color:#ffb74d;">Carbs</th><th style="color:#f48fb1;">Fat</th><th></th></tr></thead>
    <tbody>${foods.map(f => `<tr>
      <td style="font-size:12px;"><div>${f.name}</div>${f.brand?`<div style="font-size:9px;color:var(--text-dim);">${f.brand}</div>`:''}</td>
      <td style="font-size:11px;color:var(--text-dim);white-space:nowrap;">${f.servingQty||100}${f.unit||'g'}</td>
      <td style="font-size:11px;">${f.cal}</td>
      <td style="font-size:11px;color:#64b5f6;">${f.protein}g</td>
      <td style="font-size:11px;color:#ffb74d;">${f.carbs}g</td>
      <td style="font-size:11px;color:#f48fb1;">${f.fat}g</td>
      <td style="white-space:nowrap;">
        <button class="btn sec sml" style="font-size:10px;padding:2px 6px;margin-right:3px;" onclick="openQuickAddFood(${D.foods.indexOf(f)})">+ Add</button>
        <button class="btn sec sml" style="font-size:10px;padding:2px 6px;margin-right:3px;" onclick="openAddFoodModal(null,${D.foods.indexOf(f)})">\u270f\ufe0f</button>
        <button style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:12px;" onclick="deleteFood(${D.foods.indexOf(f)})">\u2715</button>
      </td>
    </tr>`).join('')}</tbody></table></div>`;
}

function openQuickAddFood(foodIdx) {
  const f = D.foods[foodIdx];
  if(!f) return;
  const html = `<div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:22px;width:min(360px,95vw);">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;margin-bottom:6px;">${f.name}</div>
      ${f.brand ? `<div style="font-size:10px;color:var(--text-dim);margin-bottom:10px;">${f.brand}</div>` : ''}
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">Per ${f.servingQty||100}${f.unit||'g'}: ${f.cal} kcal \u00b7 ${f.protein}g pro \u00b7 ${f.carbs}g carbs</div>
      <div style="margin-bottom:10px;"><label style="font-size:10px;color:var(--text-dim);">Meal</label>
        <select id="qaf-meal" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;">
          ${MEALS.map(m=>`<option value="${m}">${MEAL_LABELS[m]}</option>`).join('')}
        </select></div>
      <div style="margin-bottom:14px;"><label style="font-size:10px;color:var(--text-dim);">Quantity (${f.unit||'g'})</label>
        <input type="number" id="qaf-qty" value="${f.servingQty||100}" min="1"
          style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;box-sizing:border-box;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn sec sml" onclick="closeEditModal()">Cancel</button>
        <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="confirmQuickAddFood(${foodIdx})">Add to Log</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function confirmQuickAddFood(foodIdx) {
  const f    = D.foods[foodIdx];
  const meal = document.getElementById('qaf-meal').value;
  const qty  = parseFloat(document.getElementById('qaf-qty').value) || f.servingQty || 100;
  const date = nutDate();
  getNutDay(date).meals[meal].push({...f, qty, servingQty: f.servingQty||100});
  save(); closeEditModal(); renderNutrition(); syncNutritionToMorning(date);
  showToast(f.name + ' added to ' + meal + ' \u2713');
}

function deleteFood(foodIdx) {
  if(!confirm('Remove ' + D.foods[foodIdx]?.name + ' from library?')) return;
  D.foods.splice(foodIdx, 1);
  save(); renderFoodLibrary();
  showToast('Removed from library');
}

function syncNutritionToMorning(date) {
  const t = getDayTotals(date);
  if(!t.cal && !t.protein) return;
  const existingIdx = D.mornings.findIndex(m => m.date === date);
  if(existingIdx >= 0) {
    if(t.cal)     D.mornings[existingIdx].calIn   = t.cal;
    if(t.protein) D.mornings[existingIdx].protein = t.protein;
    if(t.carbs)   D.mornings[existingIdx].carbs   = t.carbs;
  }
  const setV = (id,v) => { const el=document.getElementById(id); if(el&&v) el.value=v; };
  setV('m-cal-in', t.cal); setV('m-protein', t.protein); setV('m-carbs', t.carbs);
  save();
}

// Init nut-date on load
document.addEventListener('DOMContentLoaded', () => {
  const nd = document.getElementById('nut-date');
  if(nd) nd.value = localDateStr(new Date());
  if(!D.mealTemplates) D.mealTemplates = [];
});
