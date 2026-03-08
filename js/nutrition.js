// ===================================================================
// NUTRITION TAB — with Open Food Facts search + Meal Templates
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
  D.nutGoals.cal     = parseFloat(document.getElementById('nut-goal-cal')?.value) || null;
  D.nutGoals.protein = parseFloat(document.getElementById('nut-goal-pro')?.value) || null;
  D.nutGoals.carbs   = parseFloat(document.getElementById('nut-goal-carb')?.value) || null;
  D.nutGoals.fat     = parseFloat(document.getElementById('nut-goal-fat')?.value) || null;
  D.nutGoals.burned  = parseFloat(document.getElementById('nut-goal-burned')?.value) || null;
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
      // Scale: logged qty / food's per-serving qty
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
function renderNutritionTotals(date) {
  const t = getDayTotals(date);
  const g = D.nutGoals || {};
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('nt-cal',  t.cal);
  set('nt-pro',  t.protein+'g');
  set('nt-carb', t.carbs+'g');
  set('nt-fat',  t.fat+'g');
  const calGoal = g.cal || 2500;
  const pct = Math.min(Math.round(t.cal / calGoal * 100), 110);
  const bar = document.getElementById('nt-cal-bar');
  if(bar) { bar.style.width = Math.min(pct,100)+'%'; bar.style.background = pct>105?'var(--red)':pct>90?'var(--orange)':'var(--green)'; }
  const pctEl = document.getElementById('nt-cal-pct');
  if(pctEl) pctEl.textContent = t.cal + ' / ' + calGoal + ' kcal (' + pct + '%)';
  const goalEl = document.getElementById('nt-cal-goal');
  if(goalEl) goalEl.textContent = 'Goal: ' + calGoal + ' kcal';
  const syncNote = document.getElementById('nut-sync-note');
  if(syncNote) {
    const today = localDateStr(new Date());
    syncNote.textContent = (date===today) ? '✅ Auto-syncs to Morning Check' : '';
  }
}
function renderNutrition() {
  const date = nutDate();
  const day = getNutDay(date);
  const g = D.nutGoals || {};
  const setV = (id,v) => { const el=document.getElementById(id); if(el&&v!=null) el.value=v; };
  setV('nut-goal-cal',g.cal); setV('nut-goal-pro',g.protein);
  setV('nut-goal-carb',g.carbs); setV('nut-goal-fat',g.fat); setV('nut-goal-burned',g.burned);
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
      const s = (e.qty||e.servingQty||100) / (e.servingQty||100);
      const cal = Math.round((e.cal||0)*s);
      const pro = Math.round((e.protein||0)*s);
      const carb = Math.round((e.carbs||0)*s);
      const fat = Math.round((e.fat||0)*s);
      return `<tr>
        <td style="font-size:12px;max-width:160px;">${e.name}<br><span style="font-size:9px;color:var(--text-dim);">${e.brand?e.brand+' · ':''}</span></td>
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
        <td><button onclick="removeEntry('${meal}',${i})" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:14px;padding:2px 6px;" title="Remove">✕</button></td>
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
      : `<div style="font-size:11px;color:var(--text-dim);padding:4px 0;">Nothing logged — search for foods or pick from your library</div>`}
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

// ── OPEN FOOD FACTS SEARCH ─────────────────────────────────────────
async function searchOpenFoodFacts(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,brands,nutriments,serving_size,serving_quantity`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    return (data.products || []).filter(p => p.product_name && p.nutriments).map(p => {
      const n = p.nutriments;
      // All values are per 100g in Open Food Facts
      const cal100   = n['energy-kcal_100g'] || n['energy-kcal'] || Math.round((n['energy_100g']||0)/4.184) || 0;
      const pro100   = n['proteins_100g'] || 0;
      const carb100  = n['carbohydrates_100g'] || 0;
      const fat100   = n['fat_100g'] || 0;
      const serving  = parseFloat(p.serving_quantity) || 100;
      return {
        name: p.product_name,
        brand: p.brands || '',
        servingQty: serving,
        unit: 'g',
        // Store macros per 100g so scaling by any quantity is accurate
        cal:     Math.round(cal100),
        protein: Math.round(pro100 * 10) / 10,
        carbs:   Math.round(carb100 * 10) / 10,
        fat:     Math.round(fat100 * 10) / 10,
        _per100g: true  // flag that values are per 100g
      };
    });
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
        <button class="btn sec sml" onclick="closeEditModal()">✕</button>
      </div>
      <div style="display:flex;gap:8px;">
        <input type="text" id="fs-query" placeholder="e.g. chicken breast, oats, banana..." 
          style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:10px 14px;font-size:14px;"
          onkeydown="if(event.key==='Enter')doFoodSearch('${meal}')">
        <button class="btn" style="background:var(--green);color:#000;font-weight:700;padding:10px 18px;" onclick="doFoodSearch('${meal}')">Search</button>
      </div>
      <div style="font-size:10px;color:var(--text-dim);">Searches Open Food Facts — 3 million+ verified products with accurate macros per 100g</div>
      <div id="fs-results" style="overflow-y:auto;flex:1;min-height:200px;">
        <div style="font-size:12px;color:var(--text-dim);text-align:center;padding:30px 0;">Type a food and press Search</div>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:10px;">
        <button class="btn sec sml" onclick="closeEditModal();openAddFoodModal('${meal}',null)">+ Add Custom Food Manually</button>
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
  if(el) el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);">⏳ Searching Open Food Facts...</div>';
  const results = await searchOpenFoodFacts(q);
  if(!el) return;
  if(!results.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);">No results found. Try different search terms or add manually.</div>';
    return;
  }
  el.innerHTML = results.map((f,i) => `
    <div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.name}</div>
        ${f.brand ? `<div style="font-size:10px;color:var(--text-dim);">${f.brand}</div>` : ''}
        <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">
          Per 100g: <b>${f.cal}</b> kcal · 
          <span style="color:#64b5f6;">${f.protein}g pro</span> · 
          <span style="color:#ffb74d;">${f.carbs}g carbs</span> · 
          <span style="color:#f48fb1;">${f.fat}g fat</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="btn sec sml" style="font-size:10px;" onclick="addSearchResultToLog(${i},'${meal}')">+ Log</button>
        <button class="btn sec sml" style="font-size:10px;" onclick="saveSearchResultToLibrary(${i})">💾 Save</button>
      </div>
    </div>`).join('');
  // Store results temporarily
  window._fsResults = results;
  window._fsMeal = meal;
}

function addSearchResultToLog(idx, meal) {
  const f = window._fsResults?.[idx];
  if(!f) return;
  // Ask for quantity
  const html = `<div id="fs-qty-bg" onclick="document.getElementById('fs-qty-bg').remove()" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:22px;width:min(360px,95vw);">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;margin-bottom:10px;">${f.name}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">Per 100g: ${f.cal} kcal · ${f.protein}g protein · ${f.carbs}g carbs · ${f.fat}g fat</div>
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
  const qty = parseFloat(document.getElementById('fs-qty-val')?.value) || 100;
  const entry = {...f, qty, servingQty: 100}; // always per 100g base
  const date = nutDate();
  getNutDay(date).meals[meal].push(entry);
  save();
  document.getElementById('fs-qty-bg')?.remove();
  renderNutrition();
  syncNutritionToMorning(date);
  showToast(f.name + ' added to ' + meal + ' ✓');
}

function saveSearchResultToLibrary(idx) {
  const f = window._fsResults?.[idx];
  if(!f) return;
  if(D.foods.find(x=>x.name===f.name&&x.brand===f.brand)) { showToast('Already in your library', true); return; }
  D.foods.push({...f, id: Date.now()});
  save();
  renderFoodLibrary();
  showToast(f.name + ' saved to library ✓');
}

// ── MY FOODS QUICK-ADD ─────────────────────────────────────────────
function openMyFoods(meal) {
  const foods = D.foods || [];
  const html = `<div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(520px,96vw);max-height:85vh;display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--green);">MY FOODS</div>
        <button class="btn sec sml" onclick="closeEditModal()">✕</button>
      </div>
      <input type="text" id="mf-search" placeholder="Search your library..." oninput="renderMyFoodsSearch('${meal}')"
        style="background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-size:13px;">
      <div id="mf-list" style="overflow-y:auto;flex:1;">
        ${foods.length === 0 ? '<div style="font-size:12px;color:var(--text-dim);text-align:center;padding:20px;">No saved foods yet — search above to find and save foods.</div>' :
          foods.map((f,i) => `<div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;">${f.name}</div>
              <div style="font-size:10px;color:var(--text-dim);">Per ${f.servingQty||100}${f.unit||'g'}: ${f.cal} kcal · ${f.protein}g pro · ${f.carbs}g carbs</div>
            </div>
            <button class="btn sec sml" style="font-size:10px;flex-shrink:0;" onclick="addMyFoodToMeal(${i},'${meal}')">+ Add</button>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function renderMyFoodsSearch(meal) {
  const q = document.getElementById('mf-search')?.value.toLowerCase()||'';
  const foods = (D.foods||[]).filter(f=>f.name.toLowerCase().includes(q)||(f.brand||'').toLowerCase().includes(q));
  const el = document.getElementById('mf-list');
  if(!el) return;
  if(!foods.length) { el.innerHTML='<div style="font-size:12px;color:var(--text-dim);text-align:center;padding:20px;">No matches</div>'; return; }
  el.innerHTML = foods.map((f,i) => `<div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:600;">${f.name}</div>
      <div style="font-size:10px;color:var(--text-dim);">Per ${f.servingQty||100}${f.unit||'g'}: ${f.cal} kcal · ${f.protein}g pro · ${f.carbs}g carbs</div>
    </div>
    <button class="btn sec sml" style="font-size:10px;flex-shrink:0;" onclick="addMyFoodToMeal(${D.foods.indexOf(f)},'${meal}')">+ Add</button>
  </div>`).join('');
}

function addMyFoodToMeal(foodIdx, meal) {
  const f = D.foods[foodIdx];
  if(!f) return;
  const date = nutDate();
  const qty = f.servingQty || 100;
  getNutDay(date).meals[meal].push({...f, qty, servingQty: f.servingQty||100});
  save(); closeEditModal(); renderNutrition(); syncNutritionToMorning(date);
  showToast(f.name + ' added ✓');
}

// ── MEAL TEMPLATES ─────────────────────────────────────────────────
function renderMealTemplates() {
  const el = document.getElementById('nut-templates');
  if(!el) return;
  const templates = D.mealTemplates || [];
  if(!templates.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-dim);">No templates yet — log a full day then click "Save Current Day as Template".</div>';
    return;
  }
  el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;">
    ${templates.map((t,i) => `<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px;">
      <div>
        <div style="font-size:13px;font-weight:600;">${t.name}</div>
        <div style="font-size:10px;color:var(--text-dim);">${t.totalCal} kcal · ${t.totalPro}g protein</div>
      </div>
      <button class="btn sec sml" style="font-size:10px;" onclick="applyTemplate(${i})">Apply to Today</button>
      <button style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:12px;" onclick="deleteTemplate(${i})" title="Delete">✕</button>
    </div>`).join('')}
  </div>`;
}

function openSaveTemplateModal() {
  const date = nutDate();
  const t = getDayTotals(date);
  if(!t.cal) { showToast('No food logged today to save as template', true); return; }
  const html = `<div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(400px,95vw);">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--green);margin-bottom:14px;">SAVE AS TEMPLATE</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Saving ${date}: ${t.cal} kcal · ${t.protein}g protein · ${t.carbs}g carbs · ${t.fat}g fat</div>
      <label style="font-size:10px;color:var(--text-dim);">Template Name</label>
      <input type="text" id="tmpl-name" placeholder="e.g. Race Day Breakfast, Rest Day, Hard Training Day"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;margin-bottom:14px;box-sizing:border-box;">
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn sec sml" onclick="closeEditModal()">Cancel</button>
        <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="saveTemplate('${date}')">💾 Save Template</button>
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
  showToast('Template "' + name + '" saved ✓');
}

function applyTemplate(idx) {
  const tmpl = (D.mealTemplates||[])[idx];
  if(!tmpl) return;
  const date = nutDate();
  if(!confirm('Apply template "' + tmpl.name + '" to ' + date + '? This will REPLACE what is currently logged.')) return;
  getNutDay(date).meals = JSON.parse(JSON.stringify(tmpl.meals));
  save(); renderNutrition(); syncNutritionToMorning(date);
  showToast('Template applied to ' + date + ' ✓');
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
          <div style="font-size:10px;color:var(--text-dim);">${t.totalCal} kcal · ${t.totalPro}g protein</div>
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
  const day = getNutDay(date);
  // Merge all template foods into the selected meal
  MEALS.forEach(m => {
    (tmpl.meals[m]||[]).forEach(e => day.meals[meal].push({...e}));
  });
  save(); closeEditModal(); renderNutrition(); syncNutritionToMorning(date);
  showToast('Template added to ' + meal + ' ✓');
}

// ── CUSTOM FOOD MANUAL ENTRY ───────────────────────────────────────
function openAddFoodModal(meal, editIdx) {
  const f = (editIdx !== null && editIdx !== undefined) ? D.foods[editIdx] : null;
  const html = `<div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;">
    <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(480px,96vw);max-height:90vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--green);">${f ? 'EDIT' : 'ADD CUSTOM'} FOOD</div>
        <button class="btn sec sml" onclick="closeEditModal()">✕</button>
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
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button class="btn sec sml" onclick="closeEditModal()">Cancel</button>
        <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="saveFoodEntry(${(editIdx!==null&&editIdx!==undefined)?editIdx:'null'},'${meal||''}')">💾 Save to Library</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('nf-name')?.focus();
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
  showToast(name + ' saved ✓');
}

function renderFoodLibrary() {
  const el = document.getElementById('nut-library');
  if(!el) return;
  const q = (document.getElementById('nut-lib-search')?.value||'').toLowerCase();
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
        <button class="btn sec sml" style="font-size:10px;padding:2px 6px;margin-right:3px;" onclick="openAddFoodModal(null,${D.foods.indexOf(f)})">✏️</button>
        <button style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:12px;" onclick="deleteFood(${D.foods.indexOf(f)})">✕</button>
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
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">Per ${f.servingQty||100}${f.unit||'g'}: ${f.cal} kcal · ${f.protein}g pro · ${f.carbs}g carbs</div>
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
  const f = D.foods[foodIdx];
  const meal = document.getElementById('qaf-meal').value;
  const qty  = parseFloat(document.getElementById('qaf-qty').value) || f.servingQty || 100;
  const date = nutDate();
  getNutDay(date).meals[meal].push({...f, qty, servingQty: f.servingQty||100});
  save(); closeEditModal(); renderNutrition(); syncNutritionToMorning(date);
  showToast(f.name + ' added to ' + meal + ' ✓');
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
    if(t.protein) D.mornings[existingIdx].protein  = t.protein;
    if(t.carbs)   D.mornings[existingIdx].carbs    = t.carbs;
  }
  // Update live form fields if on morning page
  const setV = (id,v) => { const el=document.getElementById(id); if(el&&v) el.value=v; };
  setV('m-cal-in', t.cal); setV('m-protein', t.protein); setV('m-carbs', t.carbs);
  save();
}

// Init nut-date on load
document.addEventListener('DOMContentLoaded', () => {
  const nd = document.getElementById('nut-date');
  if(nd) nd.value = localDateStr(new Date());
  if(!D.mealTemplates) D.mealTemplates = [];
  checkBackupReminder();
  initAuth();
});


