// obsidian.js — integración GymPro ↔ Obsidian

let vaultHandle = null;

// ── Conectar vault (llamar desde botón en UI) ─────────────────────────────────
async function obsidianConectar() {
  async function obsidianConectar() {
  try {
    vaultHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    localStorage.setItem('gympro_vault_connected', '1');
    _actualizarEstadoUI(true, vaultHandle.name);
    showToast('Vault conectado ✓');
  } catch (e) {
    if (e.name !== 'AbortError') showToast('No se pudo conectar el vault');
  }
}

function _actualizarEstadoUI(conectado, nombre = '') {
  const dot  = document.getElementById('obsidianDot');
  const text = document.getElementById('obsidianStatusText');
  if (!dot || !text) return;
  if (conectado) {
    dot.classList.add('connected');
    text.innerHTML = `Conectado <span>${nombre}</span>`;
  } else {
    dot.classList.remove('connected');
    text.innerHTML = 'Sin conectar';
  }
}
}
function obsidianConectado() {
  return vaultHandle !== null;
}

// ── Helpers internos ──────────────────────────────────────────────────────────
async function _getFolder(nombre) {
  return await vaultHandle.getDirectoryHandle(nombre, { create: true });
}

async function _escribir(folder, archivo, contenido) {
  const fh = await folder.getFileHandle(archivo, { create: true });
  const w  = await fh.createWritable();
  await w.write(contenido);
  await w.close();
}

async function _leer(folder, archivo) {
  try {
    const fh   = await folder.getFileHandle(archivo);
    const file = await fh.getFile();
    return await file.text();
  } catch { return null; }
}

function _fechaHoy() {
  return new Date().toISOString().split('T')[0]; // "2025-04-27"
}

function _slug(nombre) {
  return nombre.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── 1. Guardar sesión completada ──────────────────────────────────────────────
// Se llama automáticamente desde finishWorkout()
async function obsidianGuardarSesion(record) {
  if (!obsidianConectado()) return;
  try {
    const folder = await _getFolder('Diario');
    const fecha  = _fechaHoy();

    const lineas = record.exercises.map(ex => {
      const series = ex.sets.map((s, i) =>
        `  - Serie ${i+1}: ${s.kg}kg × ${s.reps} reps`
      ).join('\n');
      return `- [[Ejercicios/${_slug(ex.name)}|${ex.name}]] (${ex.muscle})\n${series}`;
    }).join('\n');

    const vol = record.exercises.reduce((a, ex) =>
      a + ex.sets.reduce((b, s) =>
        b + (parseFloat(s.kg)||0) * (parseInt(s.reps)||0), 0), 0);

    const contenido =
`---
fecha: ${fecha}
duracion: ${formatDuration(record.durationSec)}
volumen: ${Math.round(vol)}
tags: [entrenamiento]
---

# ${record.name} — ${fecha}

**Duración:** ${formatDuration(record.durationSec)}  
**Volumen total:** ${Math.round(vol).toLocaleString()} kg  
**Ejercicios:** ${record.exercises.length}

## Series

${lineas}
`;

    await _escribir(folder, `${fecha}.md`, contenido);
  } catch(e) {
    console.warn('obsidian sesion:', e);
  }
}

// ── 2. Actualizar ficha de ejercicio con PR ───────────────────────────────────
// Se llama automáticamente desde updateRecords() cuando hay nuevo récord
async function obsidianRegistrarPR(nombre, kg, reps) {
  if (!obsidianConectado()) return;
  try {
    const folder   = await _getFolder('Ejercicios');
    const archivo  = `${_slug(nombre)}.md`;
    const fecha    = _fechaHoy();
    const lineaPR  = `- ${fecha}: **${kg}kg × ${reps} reps** — [[Diario/${fecha}]]`;

    let contenido = await _leer(folder, archivo);

    if (!contenido) {
      // Buscar datos del ejercicio en EXERCISES_DB
      const exData = EXERCISES_DB.find(e => e.name === nombre);
      const musculo = exData ? exData.muscle : 'Sin clasificar';
      const secundarios = exData && exData.secondary.length
        ? '\n**Músculos secundarios:** ' + exData.secondary.join(', ')
        : '';
      contenido =
`---
nombre: ${nombre}
musculo: ${musculo}
tags: [ejercicio, ${_slug(musculo)}]
---

# ${nombre}

**Grupo muscular:** ${musculo}${secundarios}

## Historial de récords

${lineaPR}
`;
    } else if (contenido.includes('## Historial de récords')) {
      // Insertar nueva línea justo después del encabezado
      contenido = contenido.replace(
        '## Historial de récords\n',
        `## Historial de récords\n${lineaPR}\n`
      );
    } else {
      contenido += `\n## Historial de récords\n${lineaPR}\n`;
    }

    await _escribir(folder, archivo, contenido);
  } catch(e) {
    console.warn('obsidian PR:', e);
  }
}

// ── 3. Guardar plantilla de rutina ────────────────────────────────────────────
// Se llama automáticamente desde saveRoutine()
async function obsidianGuardarRutina(rutina) {
  if (!obsidianConectado()) return;
  try {
    const folder   = await _getFolder('Rutinas');
    const archivo  = `${_slug(rutina.name)}.md`;

    const lineas = rutina.exercises.map(ex =>
      `- [ ] [[Ejercicios/${_slug(ex.name)}|${ex.name}]] — ${ex.sets} series × ${ex.reps||10} reps @ ${ex.kg||0}kg`
    ).join('\n');

    const contenido =
`---
nombre: ${rutina.name}
ejercicios: ${rutina.exercises.length}
tags: [rutina]
---

# ${rutina.name}

## Ejercicios

${lineas}

## Notas
`;

    await _escribir(folder, archivo, contenido);
  } catch(e) {
    console.warn('obsidian rutina:', e);
  }
}

// ── 4. Crear fichas de conocimiento para todos los ejercicios ─────────────────
// Se llama manualmente desde el botón "Sincronizar base de conocimiento"
async function obsidianSincronizarEjercicios() {
  if (!obsidianConectado()) return;
  showToast('Sincronizando ejercicios...');
  try {
    const folder = await _getFolder('Ejercicios');
    for (const ex of EXERCISES_DB) {
      const archivo   = `${_slug(ex.name)}.md`;
      const existente = await _leer(folder, archivo);
      if (existente) continue; // no sobreescribir si ya existe

      const secundarios = ex.secondary.length
        ? '\n**Músculos secundarios:** ' + ex.secondary.join(', ')
        : '';
      const contenido =
`---
nombre: ${ex.name}
musculo: ${ex.muscle}
tags: [ejercicio, ${_slug(ex.muscle)}]
---

# ${ex.name}

**Grupo muscular:** ${ex.muscle}${secundarios}

## Técnica
_Añade tus notas aquí_

## Historial de récords
_Los récords aparecerán aquí automáticamente_
`;
      await _escribir(folder, archivo, contenido);
    }
    showToast(`${EXERCISES_DB.length} fichas sincronizadas ✓`);
  } catch(e) {
    console.warn('obsidian sync:', e);
    showToast('Error al sincronizar');
  }
}
function abrirEnObsidian() {
  if (!obsidianConectado()) {
    showToast('Primero conecta el vault');
    return;
  }
  const fecha  = _fechaHoy();
  const vault  = encodeURIComponent(vaultHandle.name);
  const file   = encodeURIComponent(`Diario/${fecha}`);
  window.location.href = `obsidian://open?vault=${vault}&file=${file}`;
}