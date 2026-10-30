// Módulos 3D: listado y editor (datos, puntos de interés de la escena, EPP y configuración de la evaluación).
import { crud, badge, html, escape, toast, pageHead, $$ } from '../shared/admin-kit.js';
import { uid } from '../../../assets/core/db.js';
import { db } from '../data/db.js';
import { modulesSorted } from '../data/model.js';
import { ANCHORS, anchorOptions } from '../shared/anchors.js';

const MODE = { plant: ['Escena 3D', 'primary'], epp: ['Maniquí EPP', 'info'], quiz: ['Evaluación', 'warning'] };
const PARTS = [['head', 'Cabeza'], ['eyes', 'Ojos'], ['hands', 'Manos'], ['feet', 'Pies'], ['torso', 'Torso']];

export function renderModules(el, _p, ctx) {
  crud(el, ctx, {
    key: 'modules', title: 'Módulos 3D', subtitle: 'Contenido de cada módulo. Los puntos de interés editados aparecen en la escena 3D y en la vista 2D.', singular: 'módulo', collection: 'modules',
    rows: () => modulesSorted().map(m => ({ ...m, _used: db.count('plans', p => p.moduleIds.includes(m.id)) })),
    search: m => `${m.title} ${m.desc}`,
    filters: [{ key: 'mode', label: 'Tipo', options: Object.entries(MODE).map(([k, v]) => [k, v[0]]) }],
    columns: [
      { key: 'order', label: '#', align: 'center' },
      { key: 'title', label: 'Módulo', render: m => html`<b>${m.title}</b><br><small class="muted">${m.desc}</small>` },
      { key: 'mode', label: 'Tipo', render: m => badge(MODE[m.mode][0], MODE[m.mode][1]) },
      { key: 'points', label: 'Contenido', value: m => m.points?.length || 0, render: m => m.mode === 'quiz' ? `${db.count('questions', q => q.active !== false)} preguntas en banco` : `${m.points.length} ${m.mode === 'epp' ? 'elementos' : 'puntos'}` },
      { key: 'minutes', label: 'Duración', render: m => `${m.minutes} min` },
      { key: '_used', label: 'En planes', align: 'center' },
      { key: 'active', label: 'Estado', render: m => m.active === false ? badge('Inactivo', 'danger') : badge('Activo', 'success') }
    ],
    canEdit: false,
    fields: () => [
      { name: 'title', label: 'Título', required: true },
      { name: 'minutes', label: 'Duración (min)', type: 'number', value: 6, half: true },
      { name: 'desc', label: 'Descripción corta', required: true, type: 'textarea' }
    ],
    toRecord: v => ({ ...v, mode: 'plant', order: db.count('modules') + 1, active: false, tags: ['3D'], kicker: 'Punto', intro: 'Visita cada punto de interés de la planta.', view: { cam: [-12, 20, 30], target: [0, 0, 0] }, points: [{ id: uid('h'), anchor: 'planta', title: 'Vista general', text: 'Describe aquí lo que debe aprender el trabajador.', pos: ANCHORS.planta.pos, cam: ANCHORS.planta.cam }] }),
    afterSave: (m, v, isNew) => { if (isNew) ctx.go(`/modulos/${m.id}`); },
    canDelete: m => !['epp', 'evaluacion'].includes(m.id),
    beforeDelete: m => m._used ? 'El módulo se usa en planes: quítalo de los planes primero.' : null,
    rowActions: [{ act: 'edit2', label: 'Editar contenido', short: '✎ Editar', run: m => ctx.go(`/modulos/${m.id}`) }, { act: 'prev', label: 'Vista previa', short: '👁', show: m => m.mode !== 'quiz', run: m => window.open(`app.html#/preview/${m.id}`, '_blank') }],
    onRow: m => ctx.go(`/modulos/${m.id}`),
    csv: m => ({ orden: m.order, modulo: m.title, tipo: MODE[m.mode][0], puntos: m.points?.length || 0, minutos: m.minutes, planes: m._used, estado: m.active === false ? 'Inactivo' : 'Activo' })
  });
}

export function renderModuleEditor(el, { id }, ctx) {
  const m0 = db.get('modules', id);
  if (!m0) { el.innerHTML = '<div class="card empty"><h2>Módulo no encontrado</h2><a class="btn btn-primary" href="#/modulos">Volver</a></div>'; return; }
  const m = JSON.parse(JSON.stringify(m0));
  el.innerHTML = `<a class="ak-back" href="#/modulos">← Módulos</a>` + pageHead(`Editar: ${m.title}`, `${MODE[m.mode][0]} · los cambios se ven al abrir el módulo en la app y en la vista previa`,
    `${m.mode !== 'quiz' ? `<a class="btn" href="app.html#/preview/${m.id}" target="_blank" rel="noopener">👁 Vista previa</a>` : '<a class="btn" href="#/preguntas">❓ Banco de preguntas</a>'}<button class="btn btn-primary" data-save>💾 Guardar</button>`) +
    `<div class="ak-grid">
      <section class="card ak-panel"><h3>Datos del módulo</h3><form class="ak-form" data-form>
        <div class="field ak-full"><label for="mt">Título</label><input class="input" id="mt" name="title" value="${escape(m.title)}"></div>
        <div class="field"><label for="mm">Duración (min)</label><input class="input" id="mm" name="minutes" type="number" min="1" value="${m.minutes}"></div>
        <div class="field"><label for="mo">Orden en el catálogo</label><input class="input" id="mo" name="order" type="number" min="1" value="${m.order}"></div>
        <div class="field ak-full"><label for="md">Descripción (catálogo y sitio público)</label><textarea class="textarea" id="md" name="desc">${escape(m.desc)}</textarea></div>
        ${m.mode !== 'quiz' ? `<div class="field ak-full"><label for="mi">Instrucciones (panel lateral del reproductor)</label><textarea class="textarea" id="mi" name="intro">${escape(m.intro || '')}</textarea></div>` : `<div class="field"><label for="mq">Preguntas por intento</label><input class="input" id="mq" name="quizCount" type="number" min="3" max="30" value="${m.quizCount || 10}"></div>`}
        ${m.mode === 'plant' ? `<div class="field"><label for="mk">Etiqueta de cada punto</label><input class="input" id="mk" name="kicker" value="${escape(m.kicker || 'Punto')}"></div><label class="check ak-full"><input type="checkbox" name="route" ${m.route ? 'checked' : ''}> Incluir ruta y simulacro de evacuación (checkpoint adicional)</label>` : ''}
        <div class="field ak-full"><label for="mtags">Etiquetas (separadas por coma)</label><input class="input" id="mtags" name="tags" value="${escape((m.tags || []).join(', '))}"></div>
        <label class="check ak-full"><input type="checkbox" name="active" ${m.active !== false ? 'checked' : ''}> Activo</label>
      </form></section>
      <section class="card ak-panel hotspot-editor" data-content></section>
    </div>`;
  const box = el.querySelector('[data-content]');
  const paint = () => {
    if (m.mode === 'plant') {
      box.innerHTML = `<div class="row between"><h3 style="margin:0">Puntos de interés (${m.points.length})</h3><button class="btn btn-sm" data-add>＋ Agregar punto</button></div>
        <p class="small muted">Cada punto aparece como marcador numerado en la escena 3D. Elige su ubicación entre las zonas predefinidas de la planta.</p>
        <ol class="ak-order">${m.points.map((p, i) => `<li data-i="${i}"><span class="num">${i + 1}</span><div class="fields">
          <select class="select" data-k="anchor" aria-label="Ubicación">${anchorOptions().map(([k, n]) => `<option value="${k}" ${p.anchor === k ? 'selected' : ''}>📍 ${escape(n)}</option>`).join('')}</select>
          <input class="input" data-k="title" value="${escape(p.title)}" aria-label="Título del punto ${i + 1}">
          <textarea class="textarea" data-k="text" rows="3" aria-label="Texto del punto ${i + 1}">${escape(p.text)}</textarea></div>
          <div class="row" style="gap:4px"><button class="btn btn-sm btn-ghost" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button class="btn btn-sm btn-ghost" data-down="${i}" ${i === m.points.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button><button class="btn btn-sm btn-ghost ak-danger" data-rm="${i}" aria-label="Eliminar">✕</button></div></li>`).join('')}</ol>`;
    } else if (m.mode === 'epp') {
      const list = (key, title, isGood) => `<h3 style="margin:${isGood ? 0 : '18px'} 0 8px">${title}</h3><ol class="ak-order">${(m[key] || []).map((p, i) => `<li data-list="${key}" data-i="${i}"><input class="input" data-k="e" value="${escape(p.e || '')}" style="width:56px;flex:none" aria-label="Ícono">
        <div class="fields"><input class="input" data-k="title" value="${escape(p.title)}" aria-label="Nombre"><textarea class="textarea" data-k="text" rows="2" aria-label="Explicación">${escape(p.text)}</textarea>
        ${isGood ? `<select class="select" data-k="part" aria-label="Parte del cuerpo">${PARTS.map(([k, n]) => `<option value="${k}" ${p.part === k ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}</div>
        <button class="btn btn-sm btn-ghost ak-danger" data-rm-list="${key}:${i}" aria-label="Eliminar">✕</button></li>`).join('')}</ol><button class="btn btn-sm" data-add-list="${key}" style="margin-top:8px">＋ Agregar</button>`;
      box.innerHTML = list('points', 'Elementos correctos (checkpoints)', true) + list('distractors', 'Distractores (opciones incorrectas)', false) + '<p class="small muted">El maniquí 3D muestra los 5 EPP base (casco, lentes, guantes, zapatos, chaleco). Elementos nuevos cuentan como checkpoint y aparecen en el panel.</p>';
    } else {
      const counts = Object.fromEntries(modulesSorted().map(x => [x.id, db.count('questions', q => q.moduleId === x.id && q.active !== false)]));
      box.innerHTML = `<h3>Banco de preguntas</h3><p class="muted">Cada intento toma preguntas al azar de los módulos incluidos en el plan.</p><ul class="ak-list">${modulesSorted().filter(x => x.mode !== 'quiz').map(x => `<li><div class="grow"><b>${escape(x.title)}</b></div>${badge(`${counts[x.id]} activas`, counts[x.id] ? 'success' : 'warning')}</li>`).join('')}</ul><a class="btn" href="#/preguntas" style="margin-top:12px">Administrar preguntas →</a>`;
    }
  };
  const sync = () => {
    box.querySelectorAll('li[data-i]').forEach(li => {
      const arr = li.dataset.list ? m[li.dataset.list] : m.points;
      const p = arr[+li.dataset.i];
      li.querySelectorAll('[data-k]').forEach(inp => { p[inp.dataset.k] = inp.value; });
      if (p.anchor && ANCHORS[p.anchor]) { p.pos = ANCHORS[p.anchor].pos; p.cam = ANCHORS[p.anchor].cam; }
    });
  };
  paint();
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    sync();
    if (b.dataset.add !== undefined) { const used = new Set(m.points.map(p => p.anchor)); const a = Object.keys(ANCHORS).find(k => !used.has(k)) || 'planta'; m.points.push({ id: uid('h'), anchor: a, title: 'Nuevo punto de interés', text: 'Escribe aquí el contenido que verá el trabajador.', pos: ANCHORS[a].pos, cam: ANCHORS[a].cam }); }
    if (b.dataset.up) { const i = +b.dataset.up; [m.points[i - 1], m.points[i]] = [m.points[i], m.points[i - 1]]; }
    if (b.dataset.down) { const i = +b.dataset.down; [m.points[i + 1], m.points[i]] = [m.points[i], m.points[i + 1]]; }
    if (b.dataset.rm) { if (m.points.length <= 1) return toast('El módulo necesita al menos un punto', 'warning'); m.points.splice(+b.dataset.rm, 1); }
    if (b.dataset.addList) { (m[b.dataset.addList] ||= []).push({ id: uid('e'), title: 'Nuevo elemento', text: 'Explicación.', e: '🦺', part: 'torso' }); }
    if (b.dataset.rmList) { const [k, i] = b.dataset.rmList.split(':'); if (k === 'points' && m.points.length <= 1) return toast('Debe haber al menos un elemento correcto', 'warning'); m[k].splice(+i, 1); }
    paint();
  });
  el.querySelector('[data-save]').onclick = () => {
    sync();
    const f = el.querySelector('[data-form]');
    const patch = { title: f.title.value.trim(), minutes: +f.minutes.value || 1, order: +f.order.value || 1, desc: f.desc.value.trim(), tags: f.tags.value.split(',').map(s => s.trim()).filter(Boolean), active: f.active.checked };
    if (f.intro) patch.intro = f.intro.value.trim();
    if (f.quizCount) patch.quizCount = Math.min(30, Math.max(3, +f.quizCount.value || 10));
    if (f.kicker) { patch.kicker = f.kicker.value.trim() || 'Punto'; patch.route = f.route.checked; patch.extra = f.route.checked ? ['simulacro'] : []; }
    if (!patch.title) return toast('El título es obligatorio', 'warning');
    if (m.points && m.points.some(p => !p.title.trim() || !p.text.trim())) return toast('Todos los puntos necesitan título y texto', 'warning');
    if (m.points) patch.points = m.points;
    if (m.distractors) patch.distractors = m.distractors;
    db.update('modules', m.id, patch); db.log('módulo editado', patch.title, ctx.user.id); toast('Módulo guardado. Los cambios ya se ven en la app.', 'success');
  };
}
