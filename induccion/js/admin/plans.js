// Planes de inducción: listado y constructor (módulos y orden, plazos, vigencia, áreas/tipos, evaluación práctica).
import { crud, badge, pctBar, html, escape, toast, confirm, pageHead, panel, $$ } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { AREAS } from '../data/seed.js';
import { modulesSorted, getModule, assignPlan, activeAssignment, rate, assignmentStatus } from '../data/model.js';

const stats = p => { const as = db.query('assignments', a => a.planId === p.id && !a.cancelled); return { n: as.length, pct: rate(as.filter(a => a.completedAt).length, as.length) }; };

export function renderPlans(el, _p, ctx) {
  crud(el, ctx, {
    key: 'plans', title: 'Planes de inducción', subtitle: 'Combina módulos en un orden, define plazos, vigencia y a quién aplica.', singular: 'plan', collection: 'plans',
    rows: () => db.all('plans').map(p => ({ ...p, _s: stats(p) })),
    search: p => `${p.name} ${p.code} ${p.description}`,
    filters: [{ key: 'active', label: 'Estado', options: [['1', 'Publicados'], ['0', 'Borradores']], test: (p, v) => (p.active !== false) === (v === '1') }],
    columns: [
      { key: 'name', label: 'Plan', render: p => html`<b>${p.name}</b><br><small class="muted">${p.code} · ${p.moduleIds.length} módulos · ${p.moduleIds.map(id => getModule(id)?.minutes || 0).reduce((a, b) => a + b, 0)} min</small>` },
      { key: 'aplica', label: 'Aplica a', sort: false, render: p => html`${p.types.map(t => t === 'empleado' ? 'Propios' : 'Contratistas').join(', ')}<br><small class="muted">${p.areas.length === AREAS.length ? 'Todas las áreas' : p.areas.join(', ')}</small>` },
      { key: 'deadlineDays', label: 'Plazo', render: p => `${p.deadlineDays} días` },
      { key: 'validityMonths', label: 'Vigencia', render: p => `${p.validityMonths} meses` },
      { key: 'n', label: 'Asignaciones', value: p => p._s.n, render: p => `${p._s.n} ${pctBar(p._s.pct)}` },
      { key: 'active', label: 'Estado', render: p => (p.active === false ? badge('Borrador', 'warning') : badge('Publicado', 'success')) + (p.practical ? ' ' + badge('Práctica', 'info') : '') }
    ],
    canEdit: false,
    fields: () => [
      { name: 'name', label: 'Nombre del plan', required: true },
      { name: 'code', label: 'Código (3 letras)', required: true, half: true, placeholder: 'ABC' },
      { name: 'deadlineDays', label: 'Plazo (días)', type: 'number', value: 14, half: true },
      { name: 'description', label: 'Descripción', type: 'textarea' }
    ],
    validate: v => { const e = {}; v.code = v.code.toUpperCase(); if (!/^[A-Z]{2,4}$/.test(v.code)) e.code = 'Usa 2 a 4 letras'; else if (db.find('plans', p => p.code === v.code)) e.code = 'Código en uso'; return e; },
    toRecord: v => ({ ...v, moduleIds: ['bienvenida', 'epp', 'evaluacion'].filter(getModule), validityMonths: 12, passScore: 80, areas: [...AREAS], types: ['empleado', 'contratista'], practical: false, active: false }),
    afterSave: (p, v, isNew) => { if (isNew) ctx.go(`/planes/${p.id}`); },
    beforeDelete: p => db.count('assignments', a => a.planId === p.id) ? 'El plan tiene asignaciones: márcalo como borrador en lugar de eliminarlo.' : null,
    rowActions: [{ act: 'open', label: 'Abrir constructor', short: '🛠 Constructor', run: p => ctx.go(`/planes/${p.id}`) }],
    onRow: p => ctx.go(`/planes/${p.id}`),
    csv: p => ({ codigo: p.code, plan: p.name, modulos: p.moduleIds.map(id => getModule(id)?.title).join(' > '), plazo_dias: p.deadlineDays, vigencia_meses: p.validityMonths, aprobacion: p.passScore + '%', practica: p.practical ? 'Sí' : 'No', areas: p.areas.join(', '), tipos: p.types.join(', '), asignaciones: p._s.n, finalizacion: p._s.pct + '%', estado: p.active === false ? 'Borrador' : 'Publicado' })
  });
}

export function renderPlanEditor(el, { id }, ctx) {
  const p = db.get('plans', id);
  if (!p) { el.innerHTML = '<div class="card empty"><h2>Plan no encontrado</h2><a class="btn btn-primary" href="#/planes">Volver</a></div>'; return; }
  let order = [...p.moduleIds];
  const all = modulesSorted();
  const st = stats(p);
  el.innerHTML = `<a class="ak-back" href="#/planes">← Planes</a>` + pageHead(`Constructor: ${p.name}`, `${p.code} · ${st.n} asignaciones · ${st.pct}% finalizadas`, `<button class="btn" data-bulk>📌 Asignar a quienes aplica</button><button class="btn btn-primary" data-save>💾 Guardar plan</button>`) +
    `<div class="ak-grid">
      <section class="card ak-panel"><h3>Datos generales</h3><form class="ak-form" data-form>
        <div class="field ak-full"><label for="pn">Nombre</label><input class="input" id="pn" name="name" value="${escape(p.name)}"></div>
        <div class="field"><label for="pc">Código</label><input class="input" id="pc" name="code" value="${escape(p.code)}"></div>
        <div class="field"><label for="pd">Plazo para completar (días)</label><input class="input" id="pd" name="deadlineDays" type="number" min="1" value="${p.deadlineDays}"></div>
        <div class="field"><label for="pv">Vigencia del certificado (meses)</label><input class="input" id="pv" name="validityMonths" type="number" min="1" value="${p.validityMonths}"></div>
        <div class="field"><label for="ps">Puntaje de aprobación (%)</label><input class="input" id="ps" name="passScore" type="number" min="50" max="100" value="${p.passScore}"></div>
        <div class="field ak-full"><label for="pdesc">Descripción</label><textarea class="textarea" id="pdesc" name="description">${escape(p.description)}</textarea></div>
        <div class="field ak-full"><span class="label">Áreas donde aplica</span><div class="ak-multi">${AREAS.map(a => `<label class="check"><input type="checkbox" name="areas" value="${a}" ${p.areas.includes(a) ? 'checked' : ''}> ${a}</label>`).join('')}</div></div>
        <div class="field ak-full"><span class="label">Tipo de trabajador</span><div class="ak-multi"><label class="check"><input type="checkbox" name="types" value="empleado" ${p.types.includes('empleado') ? 'checked' : ''}> Personal propio</label><label class="check"><input type="checkbox" name="types" value="contratista" ${p.types.includes('contratista') ? 'checked' : ''}> Contratistas</label></div></div>
        <label class="check ak-full"><input type="checkbox" name="practical" ${p.practical ? 'checked' : ''}> Requiere evaluación práctica en terreno (aprobada por supervisor)</label>
        <label class="check ak-full"><input type="checkbox" name="active" ${p.active !== false ? 'checked' : ''}> Publicado (disponible para asignar y visible en el sitio)</label>
      </form></section>
      <section class="card ak-panel"><h3>Módulos y orden</h3><p class="small muted">El trabajador verá los módulos en este orden. La evaluación se habilita al completar el contenido.</p>
        <ol class="ak-order" data-order></ol>
        <h4 style="margin:16px 0 8px">Agregar módulo</h4><div class="row" data-avail style="gap:8px"></div>
        <p class="small muted" data-total style="margin-top:12px"></p>
      </section>
    </div>`;
  const ordEl = el.querySelector('[data-order]'), avEl = el.querySelector('[data-avail]');
  const paint = () => {
    ordEl.innerHTML = order.map((mid, i) => { const m = getModule(mid); return `<li><span class="num">${i + 1}</span><div class="grow"><b>${escape(m?.title || mid)}</b><br><small class="muted">${m ? `${m.minutes} min · ${m.mode === 'quiz' ? 'Evaluación' : m.mode === 'epp' ? 'Interactivo EPP' : 'Escena 3D'}` : 'Módulo eliminado'}${m && m.active === false ? ' · inactivo' : ''}</small></div>
      <button class="btn btn-sm btn-ghost" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button class="btn btn-sm btn-ghost" data-down="${i}" ${i === order.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button><button class="btn btn-sm btn-ghost ak-danger" data-rm="${i}" aria-label="Quitar">✕</button></li>`; }).join('') || '<li class="muted">Sin módulos.</li>';
    const rest = all.filter(m => !order.includes(m.id));
    avEl.innerHTML = rest.length ? rest.map(m => `<button class="btn btn-sm" data-add="${m.id}">＋ ${escape(m.title)}</button>`).join('') : '<span class="small muted">Todos los módulos están en el plan.</span>';
    el.querySelector('[data-total]').textContent = `Duración estimada: ${order.reduce((t, mid) => t + (getModule(mid)?.minutes || 0), 0)} minutos.`;
  };
  paint();
  ordEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.up) { const i = +b.dataset.up; [order[i - 1], order[i]] = [order[i], order[i - 1]]; }
    if (b.dataset.down) { const i = +b.dataset.down; [order[i + 1], order[i]] = [order[i], order[i + 1]]; }
    if (b.dataset.rm) order.splice(+b.dataset.rm, 1);
    paint();
  });
  avEl.addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (!b) return; const quizIdx = order.findIndex(id => getModule(id)?.mode === 'quiz'); const m = getModule(b.dataset.add); if (m.mode !== 'quiz' && quizIdx >= 0) order.splice(quizIdx, 0, m.id); else order.push(m.id); paint(); });
  el.querySelector('[data-save]').onclick = () => {
    const f = el.querySelector('[data-form]');
    const v = { name: f.name.value.trim(), code: f.code.value.trim().toUpperCase(), description: f.description.value.trim(), deadlineDays: +f.deadlineDays.value, validityMonths: +f.validityMonths.value, passScore: +f.passScore.value, areas: $$('input[name=areas]:checked', f).map(i => i.value), types: $$('input[name=types]:checked', f).map(i => i.value), practical: f.practical.checked, active: f.active.checked, moduleIds: order };
    if (!v.name || !/^[A-Z]{2,4}$/.test(v.code)) return toast('Nombre y código (2–4 letras) son obligatorios', 'warning');
    if (db.find('plans', x => x.code === v.code && x.id !== p.id)) return toast('Ese código ya está en uso', 'warning');
    if (!v.moduleIds.length) return toast('Agrega al menos un módulo', 'warning');
    if (!v.moduleIds.some(mid => getModule(mid)?.mode === 'quiz')) return toast('El plan debe incluir la evaluación final', 'warning');
    if (!v.areas.length || !v.types.length) return toast('Elige al menos un área y un tipo de trabajador', 'warning');
    if (v.passScore < 50 || v.passScore > 100 || v.deadlineDays < 1 || v.validityMonths < 1) return toast('Revisa plazos y puntaje', 'warning');
    db.update('plans', p.id, v); db.log('plan editado', v.name, ctx.user.id); toast('Plan guardado', 'success');
  };
  el.querySelector('[data-bulk]').onclick = async () => {
    const plan = db.get('plans', p.id);
    if (plan.active === false) return toast('Publica el plan antes de asignarlo', 'warning');
    const targets = db.query('users', u => u.role === 'trabajador' && u.active !== false && plan.areas.includes(u.area) && plan.types.includes(u.type) && !activeAssignment(u.id, plan.id) && !db.find('certificates', c => c.userId === u.id && c.planId === plan.id && new Date(c.expiresAt) > Date.now() && c.status !== 'revocado'));
    if (!targets.length) return toast('Todos los trabajadores que aplican ya lo tienen asignado o vigente', 'info');
    if (!(await confirm(`Se asignará «${plan.name}» a ${targets.length} trabajadores que aplican y no lo tienen vigente ni en curso.`, { title: 'Asignación masiva', ok: 'Asignar' }))) return;
    targets.forEach(u => assignPlan(u.id, plan.id, ctx.user.id));
    db.log('asignación masiva', `${plan.name} → ${targets.length} trabajadores`, ctx.user.id); toast(`Asignado a ${targets.length} trabajadores`, 'success');
  };
}
