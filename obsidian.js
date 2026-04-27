// obsidian.js — integración GymPro ↔ Obsidian (iOS/móvil)

function _fechaHoy() {
  return new Date().toISOString().split('T')[0];
}

function _slug(nombre) {
  return nombre.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── Descargar cualquier .md ───────────────────────────────────────────────────
function _descargarMd(nombreArchivo, contenido) {
  const blob = new Blob([contenido], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 1. Guardar sesión completada ──────────────────────────────────────────────
function obsidianGuardarSesion(record) {
  const fecha = _fechaHoy();

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

  _descargarMd(`${fecha}.md`, contenido);
  showToast('Guarda el archivo en CEREBRITO/Diario/ 📂');
}

// ── 2. Registrar PR ───────────────────────────────────────────────────────────
function obsidianRegistrarPR(nombre, kg, reps) {
  const fecha   = _fechaHoy();
  const slug    = _slug(nombre);
  const exData  = EXERCISES_DB.find(e => e.name === nombre);
  const musculo = exData ? exData.muscle : 'Sin clasificar';
  const secundarios = exData && exData.secondary.length
    ? '\n**Músculos secundarios:** ' + exData.secondary.join(', ')
    : '';

  const contenido =
`---
nombre: ${nombre}
musculo: ${musculo}
tags: [ejercicio, ${_slug(musculo)}]
---

# ${nombre}

**Grupo muscular:** ${musculo}${secundarios}

## Historial de récords

- ${fecha}: **${kg}kg × ${reps} reps** — [[Diario/${fecha}]]
`;

  _descargarMd(`${slug}.md`, contenido);
  showToast('Guarda el archivo en CEREBRITO/Ejercicios/ 📂');
}

// ── 3. Guardar rutina ─────────────────────────────────────────────────────────
function obsidianGuardarRutina(rutina) {
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

  _descargarMd(`${_slug(rutina.name)}.md`, contenido);
  showToast('Guarda el archivo en CEREBRITO/Rutinas/ 📂');
}

// ── 4. Sincronizar todas las fichas de ejercicios ─────────────────────────────
function obsidianSincronizarEjercicios() {
  showToast('Descargando fichas...');
  EXERCISES_DB.forEach((ex, i) => {
    setTimeout(() => {
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
      _descargarMd(`${_slug(ex.name)}.md`, contenido);
    }, i * 300); // pequeño delay entre descargas
  });
  setTimeout(() => showToast('Guarda los archivos en CEREBRITO/Ejercicios/ 📂'), EXERCISES_DB.length * 300 + 500);
}

// ── 5. Abrir Obsidian en la nota de hoy ──────────────────────────────────────
function abrirEnObsidian() {
  const fecha = _fechaHoy();
  const vault = encodeURIComponent('CEREBRITO');
  const file  = encodeURIComponent(`Diario/${fecha}`);
  window.location.href = `obsidian://open?vault=${vault}&file=${file}`;
}

// ── Estas funciones ya no son necesarias pero las dejamos vacías
// ── para que app.js no rompa si las llama
function obsidianConectar() {
  showToast('En móvil los archivos se descargan automáticamente ✓');
}
function obsidianConectado() { return true; }
function _actualizarEstadoUI() {}