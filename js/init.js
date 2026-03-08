// ===================================================================
// AUTH + SHARING UI FUNCTIONS
// ===================================================================

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.querySelectorAll('.page, header, .mob-nav, #save-banner').forEach(el => {
    el.style.removeProperty('display');
  });
  if(currentUser && supa) {
    // Show user menu, populate name
    document.getElementById('user-menu-btn').style.display = 'block';
    const profile = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'You';
    document.getElementById('user-name-display').textContent = profile;
    document.getElementById('user-avatar').textContent = profile.charAt(0).toUpperCase();
    document.getElementById('user-email-display').textContent = currentUser.email;
    loadShareStatus();
  }
  updateDashboard();
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('user-menu-btn').style.display = 'none';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-msg');
  if(el) { el.style.color = 'var(--red)'; el.textContent = msg; }
}

function showAuthMsg(msg) {
  const el = document.getElementById('auth-msg');
  if(el) { el.style.color = 'var(--green)'; el.textContent = msg; }
}

function switchAuthTab(tab) {
  document.getElementById('auth-form-in').style.display = tab === 'in' ? 'block' : 'none';
  document.getElementById('auth-form-up').style.display = tab === 'up' ? 'block' : 'none';
  document.getElementById('auth-tab-in').style.borderBottomColor = tab === 'in' ? 'var(--green)' : 'transparent';
  document.getElementById('auth-tab-in').style.color = tab === 'in' ? 'var(--green)' : 'var(--text-dim)';
  document.getElementById('auth-tab-up').style.borderBottomColor = tab === 'up' ? 'var(--green)' : 'transparent';
  document.getElementById('auth-tab-up').style.color = tab === 'up' ? 'var(--green)' : 'var(--text-dim)';
  document.getElementById('auth-msg').textContent = '';
}

function toggleUserMenu() {
  const dd = document.getElementById('user-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}
document.addEventListener('click', e => {
  if(!document.getElementById('user-menu-btn')?.contains(e.target)) {
    const dd = document.getElementById('user-dropdown');
    if(dd) dd.style.display = 'none';
  }
});

// ── Athlete sharing ───────────────────────────────────────────────
async function loadShareStatus() {
  if(!supa || !currentUser) return;
  const { data } = await supa.from('athlete_profiles').select('share_enabled,display_name').eq('id', currentUser.id).single();
  if(!data) return;
  const toggle = document.getElementById('share-toggle');
  const track  = document.getElementById('share-track');
  const thumb  = document.getElementById('share-thumb');
  const label  = document.getElementById('share-label');
  if(toggle) toggle.checked = data.share_enabled;
  if(track)  track.style.background  = data.share_enabled ? 'var(--green)' : 'var(--border)';
  if(thumb)  thumb.style.left        = data.share_enabled ? '22px' : '2px';
  if(label)  label.textContent       = data.share_enabled ? 'Sharing on' : 'Off';
  const status = document.getElementById('share-status');
  if(status) status.textContent = data.share_enabled
    ? '✅ Your training summary is visible to other athletes using this app.'
    : 'Your data is private. Enable sharing to let training partners see your load and readiness.';
}

async function toggleSharing(enabled) {
  if(!supa || !currentUser) { showToast('Sign in to use sharing', true); return; }
  const track = document.getElementById('share-track');
  const thumb = document.getElementById('share-thumb');
  const label = document.getElementById('share-label');
  if(track) track.style.background = enabled ? 'var(--green)' : 'var(--border)';
  if(thumb) thumb.style.left = enabled ? '22px' : '2px';
  if(label) label.textContent = enabled ? 'Sharing on' : 'Off';
  await supa.from('athlete_profiles').upsert({ id: currentUser.id, share_enabled: enabled });
  if(enabled) await updateAthleteSummary();
  const status = document.getElementById('share-status');
  if(status) status.textContent = enabled
    ? '✅ Your training summary is visible to other athletes using this app.'
    : 'Sharing disabled.';
  showToast(enabled ? 'Sharing enabled ✓' : 'Sharing disabled');
}

async function renderAthletes() {
  const el = document.getElementById('athletes-list');
  if(!el) return;

  if(!supa) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim);font-size:13px;">⚙️ Set up Supabase to see athletes sharing their data.<br><br>Add your SUPABASE_URL and SUPABASE_ANON key at the top of the script, then reload.</div>';
    return;
  }
  if(!currentUser) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim);">Sign in to see athletes.</div>';
    return;
  }

  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);">Loading athletes...</div>';

  const { data, error } = await supa.from('athlete_profiles')
    .select('id,display_name,summary,updated_at')
    .eq('share_enabled', true)
    .neq('id', currentUser.id)  // exclude yourself
    .order('updated_at', { ascending: false });

  if(error) { el.innerHTML = '<div style="color:var(--red);padding:16px;">Error loading athletes: ' + error.message + '</div>'; return; }

  if(!data || !data.length) {
    el.innerHTML = `<div style="text-align:center;padding:30px;">
      <div style="font-size:24px;margin-bottom:8px;">👥</div>
      <div style="color:var(--text-dim);font-size:13px;">No athletes sharing yet.</div>
      <div style="color:var(--text-dim);font-size:11px;margin-top:8px;">Share the app URL with training partners — when they enable sharing, they'll appear here.</div>
    </div>`;
    return;
  }

  el.innerHTML = '<div style="display:grid;gap:10px;">' + data.map(a => {
    const s = a.summary || {};
    const recent = (s.recentReadiness || []).slice(-3);
    const avgReadiness = recent.length
      ? Math.round(recent.reduce((sum,r) => sum + (r.readiness||0), 0) / recent.length)
      : null;
    const avgHRV = recent.length
      ? Math.round(recent.reduce((sum,r) => sum + (r.hrv||0), 0) / recent.filter(r=>r.hrv).length)
      : null;
    const lastSeen = a.summary?.lastUpdated
      ? new Date(a.summary.lastUpdated).toLocaleDateString('en-AU', {day:'numeric',month:'short'})
      : 'Unknown';
    const readColor = avgReadiness >= 75 ? 'var(--green)' : avgReadiness >= 50 ? 'var(--orange)' : 'var(--red)';
    const initial = a.display_name.charAt(0).toUpperCase();

    return `<div class="card" style="padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <div style="width:44px;height:44px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:20px;color:#000;flex-shrink:0;">${initial}</div>
      <div style="flex:1;min-width:120px;">
        <div style="font-weight:600;font-size:14px;">${a.display_name}</div>
        <div style="font-size:10px;color:var(--text-dim);">Last synced ${lastSeen}</div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        ${avgReadiness !== null ? `<div style="text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${readColor};">${avgReadiness}</div>
          <div style="font-size:9px;color:var(--text-dim);">AVG READINESS</div>
        </div>` : ''}
        ${avgHRV ? `<div style="text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:#64b5f6;">${avgHRV}</div>
          <div style="font-size:9px;color:var(--text-dim);">AVG HRV</div>
        </div>` : ''}
        ${s.lastCheckin ? `<div style="text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--orange);">${s.lastCheckin.score || '—'}</div>
          <div style="font-size:9px;color:var(--text-dim);">LAST CHECK-IN</div>
        </div>` : ''}
      </div>
    </div>`;
  }).join('') + '</div>';
}

// ── Init on page load ─────────────────────────────────────────────
// Replace the DOMContentLoaded block to call initAuth
// ===== WEEKLY BACKUP REMINDER =====
function checkBackupReminder() {
  const lastBackup = localStorage.getItem('tc26_last_backup');
  const today = localDateStr(new Date());
  const dismissed = localStorage.getItem('tc26_backup_dismissed');

  // Don't show if dismissed today
  if(dismissed === today) return;

  let daysSince = 999;
  if(lastBackup) {
    const diff = new Date(today) - new Date(lastBackup);
    daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // Show reminder if never backed up or 7+ days since last backup
  if(daysSince >= 7) {
    showBackupReminder(lastBackup, daysSince);
  }
}

function showBackupReminder(lastBackup, daysSince) {
  const msg = lastBackup
    ? `It's been <b>${daysSince} days</b> since your last backup (${lastBackup}).`
    : `You haven't exported a backup yet.`;

  const el = document.createElement('div');
  el.id = 'backup-reminder';
  el.innerHTML = `
    <div style="position:fixed;bottom:20px;right:20px;z-index:8888;background:var(--card);border:1px solid var(--orange);border-radius:12px;padding:16px 20px;width:min(340px,90vw);box-shadow:0 4px 24px rgba(0,0,0,.5);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="font-size:22px;">🔔</span>
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:var(--orange);">WEEKLY BACKUP DUE</div>
          <div style="font-size:11px;color:var(--text-dim);">${msg} Export a backup to keep your data safe.</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn" style="flex:1;background:var(--green);color:#000;font-weight:700;font-size:12px;" onclick="exportBackupFromReminder()">⬇️ Export Now</button>
        <button class="btn sec sml" style="font-size:11px;" onclick="dismissBackupReminder()">Later</button>
      </div>
    </div>`;
  document.body.appendChild(el);
}

function exportBackupFromReminder() {
  exportBackup();
  localStorage.setItem('tc26_last_backup', localDateStr(new Date()));
  document.getElementById('backup-reminder')?.remove();
}

function dismissBackupReminder() {
  localStorage.setItem('tc26_backup_dismissed', localDateStr(new Date()));
  document.getElementById('backup-reminder')?.remove();
}

// Override exportBackup to track last backup date
const _origExportBackup = exportBackup;
// Track backup date whenever exportBackup is called
function exportBackup(){
  save();
  const payload = {
    version: 6,
    exported: new Date().toISOString(),
    data: D
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = localDateStr(new Date());
  a.download = 'tricoach_backup_' + today + '.json';
  a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem('tc26_last_backup', today);
  document.getElementById('backup-reminder')?.remove();
  showToast('✅ Backup exported! File saved to Downloads.');
}
function saveAndDownload(){ exportBackup(); }
// ===== HISTORY EDIT FUNCTIONS =====
function editMorning(idx) {
  const m = D.mornings[idx];
  if(!m) return;
  const html = `
    <div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;">
      <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(520px,95vw);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--green);">EDIT MORNING — ${m.date}</div>
          <button class="btn sec sml" onclick="closeEditModal()">✕ Close</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div><label style="font-size:10px;color:var(--text-dim);">HRV</label><input type="number" id="em-hrv" value="${m.hrv||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">HRV 7-day avg</label><input type="number" id="em-hrv7" value="${m.hrv7||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Resting HR</label><input type="number" id="em-rhr" value="${m.rhr||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Sleep Score</label><input type="number" id="em-sleepscore" value="${m.sleepScore||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Sleep Hours</label><input type="number" id="em-sleep" step="0.1" value="${m.sleep||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Garmin Stress</label><input type="number" id="em-gstress" value="${m.gstress||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Cal In</label><input type="number" id="em-calin" value="${m.calIn||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Cal Out</label><input type="number" id="em-calout" value="${m.calOut||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Protein (g)</label><input type="number" id="em-protein" value="${m.protein||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Carbs (g)</label><input type="number" id="em-carbs" value="${m.carbs||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
        </div>
        <div style="margin-bottom:14px;"><label style="font-size:10px;color:var(--text-dim);">Note</label><textarea id="em-note" rows="2" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;resize:vertical;">${m.note||''}</textarea></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn" style="background:var(--red);color:#fff;" onclick="deleteMorning(${idx})">🗑 Delete</button>
          <button class="btn" style="background:var(--green);color:#000;font-weight:700;" onclick="saveMorningEdit(${idx})">💾 Save Changes</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveMorningEdit(idx) {
  const m = D.mornings[idx];
  if(!m) return;
  m.hrv        = parseFloat(document.getElementById('em-hrv').value) || null;
  m.hrv7       = parseFloat(document.getElementById('em-hrv7').value) || null;
  m.rhr        = parseFloat(document.getElementById('em-rhr').value) || null;
  m.sleepScore = parseFloat(document.getElementById('em-sleepscore').value) || null;
  m.sleep      = parseFloat(document.getElementById('em-sleep').value) || null;
  m.gstress    = parseFloat(document.getElementById('em-gstress').value) || null;
  m.calIn      = parseFloat(document.getElementById('em-calin').value) || null;
  m.calOut     = parseFloat(document.getElementById('em-calout').value) || null;
  m.protein    = parseFloat(document.getElementById('em-protein').value) || null;
  m.carbs      = parseFloat(document.getElementById('em-carbs').value) || null;
  m.note       = document.getElementById('em-note').value;
  save();
  closeEditModal();
  renderHistory();
  showToast('Morning check updated ✓');
}

function deleteMorning(idx) {
  if(!confirm('Delete this morning check entry?')) return;
  D.mornings.splice(idx, 1);
  save();
  closeEditModal();
  renderHistory();
  showToast('Entry deleted');
}

function editCheckin(idx) {
  const c = D.checkins[idx];
  if(!c) return;
  const trendOpts = ['improving','holding','declining'].map(v=>`<option value="${v}" ${c.q3trend===v?'selected':''}>${v}</option>`).join('');
  const html = `
    <div id="edit-modal-bg" onclick="closeEditModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;">
      <div onclick="event.stopPropagation()" style="background:var(--card);border-radius:12px;padding:24px;width:min(480px,95vw);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--blue);">EDIT CHECK-IN — ${c.date}</div>
          <button class="btn sec sml" onclick="closeEditModal()">✕ Close</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div><label style="font-size:10px;color:var(--text-dim);">Training Block</label><input type="text" id="ec-block" value="${c.block||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Hours This Week</label><input type="number" id="ec-hours" step="0.5" value="${c.hours||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Overall Score (1–10)</label><input type="number" id="ec-score" min="1" max="10" value="${c.score||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Z2 Trend</label><select id="ec-trend" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"><option value="">—</option>${trendOpts}</select></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Nutrition (1–5)</label><input type="number" id="ec-nutrition" min="1" max="5" value="${c.nutrition||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
          <div><label style="font-size:10px;color:var(--text-dim);">Life Stress (1–5)</label><input type="number" id="ec-lifestress" min="1" max="5" value="${c.lifestress||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;"></div>
        </div>
        <div style="margin-bottom:14px;"><label style="font-size:10px;color:var(--text-dim);">Notes</label><textarea id="ec-notes" rows="3" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;resize:vertical;">${c.notes||''}</textarea></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn" style="background:var(--red);color:#fff;" onclick="deleteCheckin(${idx})">🗑 Delete</button>
          <button class="btn" style="background:var(--blue);color:#fff;font-weight:700;" onclick="saveCheckinEdit(${idx})">💾 Save Changes</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveCheckinEdit(idx) {
  const c = D.checkins[idx];
  if(!c) return;
  c.block      = document.getElementById('ec-block').value;
  c.hours      = parseFloat(document.getElementById('ec-hours').value) || null;
  c.score      = parseFloat(document.getElementById('ec-score').value) || null;
  c.q3trend    = document.getElementById('ec-trend').value || null;
  c.nutrition  = parseFloat(document.getElementById('ec-nutrition').value) || null;
  c.lifestress = parseFloat(document.getElementById('ec-lifestress').value) || null;
  c.notes      = document.getElementById('ec-notes').value;
  save();
  closeEditModal();
  renderHistory();
  showToast('Check-in updated ✓');
}

function deleteCheckin(idx) {
  if(!confirm('Delete this weekly check-in?')) return;
  D.checkins.splice(idx, 1);
  save();
  closeEditModal();
  renderHistory();
  showToast('Check-in deleted');
}

function closeEditModal() {
  const el = document.getElementById('edit-modal-bg');
  if(el) el.remove();
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('ci-date').value=localDateStr(new Date());
  checkBackupReminder();
  initAuth();
  updateDashboard();
  applySyncData();
  refreshPlannerFromStrava();
  checkSyncServer(); // ping local server — updates button status if running
  window.addEventListener('resize',()=>{if(document.getElementById('page-trends').classList.contains('active'))renderChart();});
});
