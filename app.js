// ═══════════════════════════════════════════
//   GYMPRO — LÓGICA PRINCIPAL
// ═══════════════════════════════════════════

// ── STATE ──────────────────────────────────
let DB = {
  profile: {},
  routines: [],
  history: [],   // { id, routineId, name, date(ISO), durationSec, exercises:[{name,muscle,sets:[{kg,reps}]}] }
  records: {},   // { exerciseName: { kg, reps, date } }
};

let tempRoutine = { name:"", days:[], exercises:[] };
let activeFilter = "Todos";
let selectedGender = "H";
let calendarDate = new Date();
let workoutState = null; // { routineId, startTime, exercises, timerInterval, restInterval, restTotal }
let editingRoutineId = null;

// ── INIT ────────────────────────────────────
function init() {
  loadDB();
  renderAll();
  renderExercisePicker();
  renderMuscleFilter();
  renderBodySVGs();
  setupDayBtns();
  updateHeaderAvatar();
}

// ── STORAGE ─────────────────────────────────
function loadDB() {
  try {
    const saved = localStorage.getItem("gympro_db");
    if (saved) DB = { ...DB, ...JSON.parse(saved) };
  } catch(e) {}
}
function saveDB() {
  try { localStorage.setItem("gympro_db", JSON.stringify(DB)); } catch(e) {}
}

// ── TAB NAVIGATION ──────────────────────────
function switchTab(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelector(`.nav-btn[data-screen="${name}"]`).classList.add('active');
  if (name === 'inicio') renderInicio();
  if (name === 'perfil') renderPerfil();
}

// ── VIEWS (dentro de Entrenamiento) ─────────
function showView(viewId) {
  ['view-routines','view-create-routine','view-exercise-picker','view-active-workout'].forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(viewId);
  if (target) target.style.display = 'flex';
  target.style.flexDirection = 'column';

  if (viewId === 'view-routines') renderRoutinesList();
  if (viewId === 'view-exercise-picker') renderExercisePicker();
  if (viewId === 'view-create-routine') renderAddedExercises();
}

// ── RENDER ALL ───────────────────────────────
function renderAll() {
  renderInicio();
  renderRoutinesList();
}

// ══════════════════════════════════════════════
//   INICIO
// ══════════════════════════════════════════════
function renderInicio() {
  const name = DB.profile.name || 'GymPro';
  const firstName = name.split(' ')[0];
  const titleEl = document.getElementById('inicioTitle');
  if (titleEl) titleEl.textContent = firstName;

  renderReminderCard();
  renderWeekStats();
  renderLastWorkouts();
  renderRecords();
}

function renderWeekStats() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0,0,0,0);

  const weekWorkouts = DB.history.filter(h => new Date(h.date) >= weekStart);
  const totalVol = weekWorkouts.reduce((s,h) =>
    s + h.exercises.reduce((a,e) =>
      a + e.sets.reduce((b,st) => b + (parseFloat(st.kg)||0) * (parseInt(st.reps)||0), 0), 0), 0);
  const totalSeries = weekWorkouts.reduce((s,h) =>
    s + h.exercises.reduce((a,e) => a + e.sets.length, 0), 0);
  const streak = calcStreak();

  document.getElementById('wsc-entrenos').textContent = weekWorkouts.length;
  document.getElementById('wsc-vol').textContent = Math.round(totalVol).toLocaleString();
  document.getElementById('wsc-series').textContent = totalSeries;
  document.getElementById('wsc-racha').textContent = '🔥' + streak.current;
}

function renderLastWorkouts() {
  const el = document.getElementById('lastWorkoutsList');
  const recent = DB.history.slice(0, 5);
  if (!recent.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💪</div><div class="empty-title">Sin entrenos aún</div><div class="empty-sub">Ve a Entrenamiento para crear tu primera rutina</div></div>`;
    return;
  }
  el.innerHTML = recent.map(h => {
    const d = new Date(h.date);
    const dateStr = d.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' });
    const dur = formatDuration(h.durationSec||0);
    const vol = h.exercises.reduce((a,e) => a + e.sets.reduce((b,s) => b + (parseFloat(s.kg)||0)*(parseInt(s.reps)||0), 0), 0);
    const muscles = [...new Set(h.exercises.map(e => e.muscle))];
    return `<div class="workout-history-card">
      <div class="whc-name">${h.name}</div>
      <div class="whc-meta">
        <div class="whc-tag"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${dateStr}</div>
        <div class="whc-tag">⏱ ${dur}</div>
        <div class="whc-tag">📦 ${Math.round(vol).toLocaleString()} kg</div>
        <div class="whc-tag">💪 ${h.exercises.length} ejercicios</div>
      </div>
      <div class="whc-muscles">${muscles.map(m => `<span class="muscle-pill">${m}</span>`).join('')}</div>
    </div>`;
  }).join('');
}

function renderRecords() {
  const el = document.getElementById('recordsList');
  const recs = Object.entries(DB.records);
  if (!recs.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">Sin récords aún</div><div class="empty-sub">Tus mejores marcas aparecerán aquí</div></div>`;
    return;
  }
  el.innerHTML = recs.slice(0,8).map(([name, rec]) =>
    `<div class="record-card">
      <div><div class="record-name">${name}</div><div style="font-size:11px;color:var(--text3)">${new Date(rec.date).toLocaleDateString('es-ES')}</div></div>
      <div style="text-align:right"><div class="record-val">${rec.kg}</div><div class="record-unit">kg × ${rec.reps} reps</div></div>
    </div>`
  ).join('');
}

// ══════════════════════════════════════════════
//   RUTINAS
// ══════════════════════════════════════════════
function setupDayBtns() {
  //dias de la semana eliminados
}

function renderRoutinesList() {
  const el = document.getElementById('routinesList');
  if (!DB.routines.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Sin rutinas</div><div class="empty-sub">Crea tu primera rutina pulsando el botón</div></div>`;
    return;
  }
  el.innerHTML = DB.routines.map(r =>
    `<div class="routine-card" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="rc-left">
          <div class="rc-name">${r.name}</div>
          <div class="rc-meta">${r.exercises.length} ejercicios · ${r.days.join(', ')}</div>
        </div>
        <div class="rc-day">${r.days[0]||'—'}</div>
      </div>
      <div class="routine-card-actions">
        <button class="rc-action-btn rc-action-start" onclick="startWorkout('${r.id}')">▶ Iniciar</button>
        <button class="rc-action-btn rc-action-edit" onclick="editRoutine('${r.id}')">Editar</button>
        <button class="rc-action-btn rc-action-delete" onclick="deleteRoutine('${r.id}')">Borrar</button>
      </div>
    </div>`
  ).join('');
}

function saveRoutine() {
  const name = document.getElementById('routineName').value.trim();
  if (!name) { showToast('Ponle un nombre a la rutina'); return; }
  if (!tempRoutine.exercises.length) { showToast('Añade al menos un ejercicio'); return; }

  if (editingRoutineId) {
    const idx = DB.routines.findIndex(r => r.id === editingRoutineId);
    if (idx >= 0) {
      DB.routines[idx] = { ...DB.routines[idx], name, days: tempRoutine.days, exercises: tempRoutine.exercises };
    }
    editingRoutineId = null;
  } else {
    DB.routines.push({
      id: 'r' + Date.now(),
      name,
      days: [],
      exercises: tempRoutine.exercises,
    });
  }
  saveDB();
  resetCreateForm();
  showToast('Rutina guardada ✓');
  showView('view-routines');
}

function editRoutine(id) {
  const r = DB.routines.find(r => r.id === id);
  if (!r) return;
  editingRoutineId = id;
  document.getElementById('routineName').value = r.name;
  tempRoutine = { name: r.name, days: [...r.days], exercises: JSON.parse(JSON.stringify(r.exercises)) };
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.classList.toggle('selected', r.days.includes(btn.dataset.day));
  });
  renderAddedExercises();
  showView('view-create-routine');
}

function deleteRoutine(id) {
  if (!confirm('¿Borrar esta rutina?')) return;
  DB.routines = DB.routines.filter(r => r.id !== id);
  saveDB();
  renderRoutinesList();
  showToast('Rutina borrada');
}

function resetCreateForm() {
  document.getElementById('routineName').value = '';
  tempRoutine = { name:"", days:[], exercises:[] };
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
  renderAddedExercises();
}

// ── EJERCICIOS ───────────────────────────────
function renderMuscleFilter() {
  const el = document.getElementById('muscleFilter');
  el.innerHTML = MUSCLE_GROUPS.map(g =>
    `<button class="mf-btn ${g === 'Todos' ? 'active' : ''}" onclick="setMuscleFilter('${g}', this)">${g}</button>`
  ).join('');
}

function setMuscleFilter(g, btn) {
  activeFilter = g;
  document.querySelectorAll('.mf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterExercises(document.getElementById('exerciseSearch').value);
}

function filterExercises(query) {
  const q = query.toLowerCase();
  const filtered = EXERCISES_DB.filter(ex => {
    const matchMuscle = activeFilter === 'Todos' || ex.muscle === activeFilter;
    const matchQuery = !q || ex.name.toLowerCase().includes(q) || ex.muscle.toLowerCase().includes(q);
    return matchMuscle && matchQuery;
  });
  renderExercisePicker(filtered);
}

function renderExercisePicker(list = EXERCISES_DB) {
  const el = document.getElementById('exercisePickerList');
  if (!el) return;
  const selectedIds = tempRoutine.exercises.map(e => e.id);
  el.innerHTML = list.map(ex =>
    `<div class="exercise-pick-item ${selectedIds.includes(ex.id) ? 'selected' : ''}" onclick="toggleExercise('${ex.id}')">
    
    <div class="epi-icon">
        <img src="${ex.icon}" alt="${ex.name}" class="img-ejercicio-lista">
    </div>
    
    <div class="epi-info">
        <div class="epi-name">${ex.name}</div>
        <div class="epi-muscle">${ex.muscle}${ex.secondary.length ? ' · ' + ex.secondary.join(', ') : ''}</div>
    </div>
    <div class="epi-check"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
</div>`
  ).join('');
}

function toggleExercise(id) {
  const ex = EXERCISES_DB.find(e => e.id === id);
  if (!ex) return;
  const idx = tempRoutine.exercises.findIndex(e => e.id === id);
  if (idx >= 0) {
    tempRoutine.exercises.splice(idx, 1);
  } else {
    // IMPORTANTE: Asegúrate de incluir ex.icon aquí
    tempRoutine.exercises.push({ 
      id: ex.id, 
      name: ex.name, 
      muscle: ex.muscle, 
      icon: ex.icon, // <--- Esto es clave
      sets: 3, 
      restSec: 90 
    });
  }
  renderExercisePicker();
  renderAddedExercises();
}

function renderAddedExercises() {
  const el = document.getElementById('addedExercises');
  if (!el) return;
  if (!tempRoutine.exercises.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:13px;text-align:center;padding:16px 0">Ningún ejercicio añadido</div>';
    return;
  }
  el.innerHTML = tempRoutine.exercises.map((ex, i) =>
    `<div class="added-ex-card" style="flex-direction:column;align-items:stretch;gap:12px;padding:14px">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="aec-icon">
            <img src="${ex.icon}" class="img-ejercicio-lista">
        </div>
        <div style="flex:1">
          <div class="aec-name">${ex.name}</div>
          <div class="aec-sets">${ex.muscle}</div>
        </div>
        <button class="aec-del" onclick="removeEx(${i})">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;border-top:0.5px solid var(--border);padding-top:12px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
          <div style="font-size:10px;color:var(--text3);font-weight:600;letter-spacing:.8px">SERIES</div>
          <div style="display:flex;align-items:center;gap:4px;width:100%">
            <button class="aec-sets-btn" onclick="changeExField(${i},'sets',-1)" style="flex-shrink:0">−</button>
            <div style="flex:1;text-align:center;font-family:var(--font-display);font-size:22px;color:var(--red)">${ex.sets || 3}</div>
            <button class="aec-sets-btn" onclick="changeExField(${i},'sets',1)" style="flex-shrink:0">+</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;border-left:0.5px solid var(--border);border-right:0.5px solid var(--border)">
          <div style="font-size:10px;color:var(--text3);font-weight:600;letter-spacing:.8px">REPS</div>
          <div style="display:flex;align-items:center;gap:4px;width:100%">
            <button class="aec-sets-btn" onclick="changeExField(${i},'reps',-1)" style="flex-shrink:0">−</button>
            <div style="flex:1;text-align:center;font-family:var(--font-display);font-size:22px;color:var(--red)">${ex.reps || 10}</div>
            <button class="aec-sets-btn" onclick="changeExField(${i},'reps',1)" style="flex-shrink:0">+</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
          <div style="font-size:10px;color:var(--text3);font-weight:600;letter-spacing:.8px">KG</div>
          <div style="display:flex;align-items:center;gap:4px;width:100%">
            <button class="aec-sets-btn" onclick="changeExField(${i},'kg',-2.5)" style="flex-shrink:0">−</button>
            <div style="flex:1;text-align:center;font-family:var(--font-display);font-size:22px;color:var(--red)">${ex.kg || 0}</div>
            <button class="aec-sets-btn" onclick="changeExField(${i},'kg',2.5)" style="flex-shrink:0">+</button>
          </div>
        </div>
      </div>
    </div>`
  ).join('');
}

function changeExField(idx, field, delta) {
  const ex = tempRoutine.exercises[idx];
  if (field === 'sets') ex.sets = Math.max(1, Math.min(10, (ex.sets || 3) + delta));
  if (field === 'reps') ex.reps = Math.max(1, Math.min(100, (ex.reps || 10) + delta));
  if (field === 'kg')   ex.kg   = Math.max(0, Math.round(((ex.kg || 0) + delta) * 10) / 10);
  renderAddedExercises();
}

function removeEx(idx) {
  tempRoutine.exercises.splice(idx, 1);
  renderAddedExercises();
  renderExercisePicker();
}

// ══════════════════════════════════════════════
//   ENTRENO ACTIVO
// ══════════════════════════════════════════════
function startWorkout(routineId) {
  const routine = DB.routines.find(r => r.id === routineId);
  if (!routine) return;

  workoutState = {
    routineId,
    routineName: routine.name,
    startTime: Date.now(),
    timerInterval: null,
    restInterval: null,
    restTotal: 90,
    exercises: routine.exercises.map(ex => ({
      ...ex,
      sets: Array.from({ length: ex.sets || 3 }, () => ({ kg: String(ex.kg || ''), reps: String(ex.reps || ''), done: false }))
    }))
  };

  document.getElementById('activeWorkoutName').textContent = routine.name;
  renderActiveWorkout();
  showView('view-active-workout');
  startWorkoutTimer();
}

function renderActiveWorkout() {
  const el = document.getElementById('activeWorkoutExercises');
  el.innerHTML = `<div style="padding:12px 16px 4px">` +
    workoutState.exercises.map((ex, ei) =>
      `<div class="workout-ex-card" id="wec-${ei}">
        <div class="wec-header">
          <div class="wec-icon">
            <img src="${ex.icon}" class="img-ejercicio-lista">
          </div>
          <div>
            <div class="wec-name">${ex.name}</div>
            <div class="wec-muscle">${ex.muscle}</div>
          </div>
        </div>
        <table class="sets-table">
           <thead><tr>
            <th>SET</th><th>KG</th><th>REPS</th><th>RPE</th><th>✓</th><th></th>
          </tr></thead>
          <tbody id="sets-body-${ei}">
            ${ex.sets.map((s, si) => renderSetRow(ei, si, s)).join('')}
          </tbody>
        </table>
        <button class="add-set-btn-inline" onclick="addSetToExercise(${ei})">+ Añadir serie</button>
      </div>`
    ).join('') + `</div><div style="height:100px"></div>`;
}

function renderSetRow(ei, si, set) {
  const rpe = set.rpe || 0;
  return `<tr class="set-row ${set.done ? 'done-row' : ''}" id="sr-${ei}-${si}">
    <td><div class="set-num">${si + 1}</div></td>
    <td><input class="set-input" type="number" inputmode="decimal" placeholder="0" value="${set.kg}" onchange="updateSet(${ei},${si},'kg',this.value)"></td>
    <td><input class="set-input" type="number" inputmode="numeric" placeholder="0" value="${set.reps}" onchange="updateSet(${ei},${si},'reps',this.value)"></td>
    <td>
      <button class="rpe-btn ${rpe > 0 ? 'rpe-'+rpe : ''}" id="rpe-${ei}-${si}" onclick="cycleRpe(${ei},${si})"></button>
    </td>
    <td>
      <button class="set-done-btn ${set.done ? 'done' : ''}" onclick="toggleSetDone(${ei},${si})">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    </td>
    <td>
      <button onclick="deleteSet(${ei},${si})" style="background:none;border:none;color:#555;font-size:16px;cursor:pointer;padding:4px 6px;line-height:1;">✕</button>
    </td>
  </tr>`;
}

function updateSet(ei, si, field, value) {
  workoutState.exercises[ei].sets[si][field] = value;
}

function toggleSetDone(ei, si) {
  const set = workoutState.exercises[ei].sets[si];
  set.done = !set.done;
  const row = document.getElementById(`sr-${ei}-${si}`);
  if (row) {
    row.classList.toggle('done-row', set.done);
    const btn = row.querySelector('.set-done-btn');
    if (btn) btn.classList.toggle('done', set.done);
    row.querySelectorAll('.set-input').forEach(inp => inp.style.opacity = set.done ? '0.45' : '1');
  }
  if (set.done) startRestTimer(workoutState.exercises[ei].restSec || 90);
}

function addSetToExercise(ei) {
  const last = workoutState.exercises[ei].sets.slice(-1)[0] || { kg:'', reps:'' };
  workoutState.exercises[ei].sets.push({ kg: last.kg, reps: last.reps, done: false });
  const tbody = document.getElementById(`sets-body-${ei}`);
  const si = workoutState.exercises[ei].sets.length - 1;
  if (tbody) tbody.insertAdjacentHTML('beforeend', renderSetRow(ei, si, workoutState.exercises[ei].sets[si]));
}
function cycleRpe(ei, si) {
  const set = workoutState.exercises[ei].sets[si];
  set.rpe = ((set.rpe || 0) + 1) % 4;
  const btn = document.getElementById(`rpe-${ei}-${si}`);
  if (btn) {
    btn.className = 'rpe-btn' + (set.rpe > 0 ? ' rpe-' + set.rpe : '');
  }
}
function deleteSet(ei, si) {
  if (workoutState.exercises[ei].sets.length <= 1) {
    showToast('Debe haber al menos una serie');
    return;
  }
  workoutState.exercises[ei].sets.splice(si, 1);
  const tbody = document.getElementById(`sets-body-${ei}`);
  if (tbody) tbody.innerHTML = workoutState.exercises[ei].sets.map((s, i) => renderSetRow(ei, i, s)).join('');
}

function startWorkoutTimer() {
  workoutState.timerInterval = setInterval(() => {
    const el = document.getElementById('workoutTimerLabel');
    if (!el) { clearInterval(workoutState.timerInterval); return; }
    el.textContent = formatDuration(Math.floor((Date.now() - workoutState.startTime) / 1000));
  }, 1000);
}

function startRestTimer(seconds) {
  if (workoutState.restInterval) clearInterval(workoutState.restInterval);
  workoutState.restTotal = seconds;
  let remaining = seconds;
  const bar = document.getElementById('restTimerBar');
  const count = document.getElementById('restCount');
  const fill = document.getElementById('restFill');
  if (bar) bar.style.display = 'block';
  const tick = () => {
    if (!count) { clearInterval(workoutState.restInterval); return; }
    count.textContent = remaining;
    const pct = ((seconds - remaining) / seconds * 100);
    if (fill) fill.style.width = pct + '%';
    if (remaining <= 0) {
      skipRest();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
    remaining--;
  };
  tick();
  workoutState.restInterval = setInterval(tick, 1000);
}

function skipRest() {
  if (workoutState && workoutState.restInterval) clearInterval(workoutState.restInterval);
  const bar = document.getElementById('restTimerBar');
  if (bar) bar.style.display = 'none';
}

function cancelWorkout() {
  if (!confirm('¿Cancelar el entreno? Se perderán los datos.')) return;
  endWorkoutCleanup();
  showView('view-routines');
}

function finishWorkout() {
  if (!workoutState) return;
  const durationSec = Math.floor((Date.now() - workoutState.startTime) / 1000);
  const exercises = workoutState.exercises.map(ex => ({
    name: ex.name,
    muscle: ex.muscle,
    sets: ex.sets.filter(s => s.done || (s.kg && s.reps)).map(s => ({ kg: s.kg, reps: s.reps }))
  })).filter(ex => ex.sets.length > 0);

  if (!exercises.length) { showToast('Completa al menos una serie'); return; }

  const record = {
    id: 'h' + Date.now(),
    routineId: workoutState.routineId,
    name: workoutState.routineName,
    date: new Date().toISOString(),
    durationSec,
    exercises,
  };
  DB.history.unshift(record);
  updateRecords(exercises);
  saveDB();
  endWorkoutCleanup();
  showToast('¡Entreno completado! 🔥');
  showView('view-routines');
  switchTab('inicio');
}

function updateRecords(exercises) {
  exercises.forEach(ex => {
    ex.sets.forEach(s => {
      const kg = parseFloat(s.kg) || 0;
      const reps = parseInt(s.reps) || 0;
      if (!kg) return;
      const cur = DB.records[ex.name];
      if (!cur || kg > parseFloat(cur.kg) || (kg === parseFloat(cur.kg) && reps > parseInt(cur.reps))) {
        DB.records[ex.name] = { kg, reps, date: new Date().toISOString() };
      }
    });
  });
}

function endWorkoutCleanup() {
  if (workoutState) {
    clearInterval(workoutState.timerInterval);
    clearInterval(workoutState.restInterval);
    workoutState = null;
  }
}

// ══════════════════════════════════════════════
//   PERFIL
// ══════════════════════════════════════════════
function renderPerfil() {
  const p = DB.profile;
  const name = p.name || 'Tu nombre';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  renderAvatars();
  document.getElementById('profileNameBig').textContent = name;
  document.getElementById('profileSubBig').textContent = p.weight ? `${p.weight}kg · ${p.height}cm · ${p.age} años` : 'Configura tu perfil';
  updateHeaderAvatar();

  if (p.name) {
    document.getElementById('pName').value = p.name;
    document.getElementById('pWeight').value = p.weight || '';
    document.getElementById('pHeight').value = p.height || '';
    document.getElementById('pAge').value = p.age || '';
    document.getElementById('pGoal').value = p.goal || 'maintain';
    document.getElementById('pActivity').value = p.activity || '1.55';
    selectedGender = p.gender || 'H';
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.toggle('selected', b.dataset.g === selectedGender));
    renderCalorieCard();
  }

  renderCalendar();
  renderStreakCard();
  renderBodyMuscleMap();
}

function updateHeaderAvatar() {
  renderAvatars();
}
function loadAvatarPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    DB.profile.avatar = e.target.result;
    saveDB();
    renderAvatars();
    showToast('Foto actualizada ✓');
  };
  reader.readAsDataURL(file);
}

function renderAvatars() {
  const p = DB.profile;
  const bigEl = document.getElementById('profileAvatarBig');
  const smallEl = document.getElementById('headerAvatar');
  const initials = (p.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';

  if (p.avatar) {
    if (bigEl) bigEl.innerHTML = `<img src="${p.avatar}" alt="foto">`;
    if (smallEl) { smallEl.innerHTML = `<img src="${p.avatar}" alt="foto" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">`; }
  } else {
    if (bigEl) bigEl.textContent = initials;
    if (smallEl) smallEl.textContent = initials;
  }
}

function toggleEditProfile() {
  const form = document.getElementById('profileEditForm');
  const visible = form.style.display !== 'none';
  form.style.display = visible ? 'none' : 'block';
}

function selectGender(g) {
  selectedGender = g;
  document.querySelectorAll('.gender-btn').forEach(b => b.classList.toggle('selected', b.dataset.g === g));
}

function saveProfile() {
  const name = document.getElementById('pName').value.trim();
  const weight = parseFloat(document.getElementById('pWeight').value) || 0;
  const height = parseFloat(document.getElementById('pHeight').value) || 0;
  const age = parseInt(document.getElementById('pAge').value) || 0;
  const goal = document.getElementById('pGoal').value;
  const activity = parseFloat(document.getElementById('pActivity').value);

  if (!name) { showToast('Introduce tu nombre'); return; }
  DB.profile = { name, weight, height, age, gender: selectedGender, goal, activity };
  saveDB();
  toggleEditProfile();
  renderPerfil();
  showToast('Perfil guardado ✓');
}

// ── CALORÍAS ────────────────────────────────
function renderCalorieCard() {
  const p = DB.profile;
  if (!p.weight || !p.height || !p.age) return;

  const bmr = p.gender === 'H'
    ? 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
    : 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
  const tdee = Math.round(bmr * (p.activity || 1.55));

  const goalDelta = { cut: -400, maintain: 0, bulk: 300 };
  const target = tdee + (goalDelta[p.goal] || 0);
  const prot = Math.round(p.weight * 2);
  const fat = Math.round(target * 0.25 / 9);
  const carbs = Math.round((target - prot * 4 - fat * 9) / 4);
  const goalLabel = { cut:'Definición (déficit)', maintain:'Mantenimiento', bulk:'Volumen (superávit)' };

  const card = document.getElementById('calorieCard');
  card.style.display = 'block';
  document.getElementById('calNumber').innerHTML = `${target.toLocaleString()}<span> kcal/día</span>`;
  document.getElementById('calGoalBadge').textContent = goalLabel[p.goal] || 'Mantenimiento';
  document.getElementById('calMacros').innerHTML = `
    <div class="cal-macro"><div class="cal-macro-val" style="color:#E8532A">${prot}g</div><div class="cal-macro-lbl">Proteína</div></div>
    <div class="cal-macro"><div class="cal-macro-val" style="color:#4a9eff">${carbs}g</div><div class="cal-macro-lbl">Carbohidratos</div></div>
    <div class="cal-macro"><div class="cal-macro-val" style="color:#f0c040">${fat}g</div><div class="cal-macro-lbl">Grasas</div></div>
  `;
  document.getElementById('calDesc').textContent =
    `TMB: ${Math.round(bmr)} kcal · TDEE: ${tdee} kcal · Objetivo: ${target} kcal`;
}
// ── CALENDARIO ───────────────────────────────
function renderCalendar() {
  const el = document.getElementById('calendarCard');
  const y = calendarDate.getFullYear();
  const m = calendarDate.getMonth();
  const monthName = new Date(y, m, 1).toLocaleDateString('es-ES', { month:'long', year:'numeric' });
  const firstDay = new Date(y, m, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const today = new Date();

  const workoutDays = new Set(
    DB.history
      .filter(h => { const d = new Date(h.date); return d.getFullYear()===y && d.getMonth()===m; })
      .map(h => new Date(h.date).getDate())
  );

  const dowLabels = ['L','M','X','J','V','S','D'];

  let cells = '';
  for (let i = 0; i < offset; i++) cells += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
    const hasW = workoutDays.has(d);
    cells += `<div class="cal-day ${hasW?'has-workout':''} ${isToday&&!hasW?'today':''}">${d}</div>`;
  }

  el.innerHTML = `
    <div class="cal-month-nav">
      <button class="cal-nav-btn" onclick="changeCalMonth(-1)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="cal-month-title">${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
      <button class="cal-nav-btn" onclick="changeCalMonth(1)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="cal-grid">
      ${dowLabels.map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${cells}
    </div>`;
}

function changeCalMonth(delta) {
  calendarDate.setMonth(calendarDate.getMonth() + delta);
  renderCalendar();
}

// ── RACHA ────────────────────────────────────
function calcStreak() {
  const dates = [...new Set(DB.history.map(h => new Date(h.date).toDateString()))].map(d => new Date(d)).sort((a,b) => b-a);
  if (!dates.length) return { current: 0, best: 0 };

  let current = 0, best = 0, weekStreak = 0;
  const seenWeeks = new Set();
  dates.forEach(d => {
    const wk = getWeekKey(d);
    if (!seenWeeks.has(wk)) { seenWeeks.add(wk); weekStreak++; }
  });

  // Contar semanas consecutivas desde ahora
  const now = new Date();
  let wk = getWeekKey(now);
  while (seenWeeks.has(wk)) {
    current++;
    const prev = new Date(now);
    prev.setDate(now.getDate() - current * 7);
    wk = getWeekKey(prev);
  }
  best = Math.max(current, weekStreak);
  return { current, best };
}

function getWeekKey(d) {
  const tmp = new Date(d);
  tmp.setHours(0,0,0,0);
  tmp.setDate(tmp.getDate() - tmp.getDay() + (tmp.getDay()===0?-6:1));
  return tmp.toISOString().split('T')[0];
}

function renderStreakCard() {
  const s = calcStreak();
  document.getElementById('streakNum').textContent = s.current + (s.current === 1 ? ' semana' : ' semanas');
  document.getElementById('streakBest').textContent = s.best;
}

// ── UTILS ────────────────────────────────────
function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m < 60
    ? `${m}:${String(s).padStart(2,'0')}`
    : `${Math.floor(m/60)}h ${m%60}m`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
function renderReminderCard() {
  const r = DB.reminder;
  const card = document.getElementById('reminderCard');
  const title = document.getElementById('reminderTitle');
  const sub = document.getElementById('reminderSub');
  if (!card) return;
  if (r && r.days && r.days.length && r.time) {
    card.classList.add('active-reminder');
    title.textContent = r.msg || '¡Hora de entrenar!';
    sub.textContent = r.days.join(', ') + ' · ' + r.time;
  } else {
    card.classList.remove('active-reminder');
    title.textContent = 'Configura tu recordatorio';
    sub.textContent = 'Toca para establecer cuándo entrenar';
  }
}

function openReminderConfig() {
  document.getElementById('reminderModal').style.display = 'block';
  const r = DB.reminder || {};
  document.querySelectorAll('#reminderDays .day-btn').forEach(btn => {
    btn.classList.toggle('selected', (r.days||[]).includes(btn.dataset.day));
    btn.onclick = () => btn.classList.toggle('selected');
  });
  if (r.time) document.getElementById('reminderTime').value = r.time;
  if (r.msg) document.getElementById('reminderMsg').value = r.msg;
}

function closeReminderConfig() {
  document.getElementById('reminderModal').style.display = 'none';
}

function saveReminder() {
  const days = [...document.querySelectorAll('#reminderDays .day-btn.selected')].map(b => b.dataset.day);
  const time = document.getElementById('reminderTime').value;
  const msg = document.getElementById('reminderMsg').value.trim() || '¡Hora de entrenar!';
  if (!days.length) { showToast('Elige al menos un día'); return; }
  if (!time) { showToast('Selecciona la hora'); return; }
  DB.reminder = { days, time, msg };
  saveDB();
  closeReminderConfig();
  renderReminderCard();
  if ('Notification' in window) {
    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') return;
      const now = new Date();
      const dayMap = {0:'D',1:'L',2:'M',3:'X',4:'J',5:'V',6:'S'};
      const todayKey = dayMap[now.getDay()];
      const [h, m] = time.split(':').map(Number);
      const diff = (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
      if (days.includes(todayKey) && diff > 0) {
        setTimeout(() => new Notification('GymPro 💪', { body: msg, icon: 'icons/icon-192.png' }), diff * 60000);
      }
    });
  }
  showToast('Recordatorio guardado ✓');
}

// ── START ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  showView('view-routines');
});
