// App del mecánico (móvil): trabajos asignados, checklist con cronómetro por tarea (iniciar/pausar),
// pedir repuestos a bodega, registrar hallazgos con foto y enviar a control de calidad.
import { escape, money, toast, modal, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { ST_OF, startTask, pauseTask, finishTask, addFinding, requestPart, setStatus, taskMin, mechanics, userName, fmtKm, laborPrice } from '../shared/domain.js';
import { plate, stBadge, fuelGauge } from '../shared/bits.js';

let user;
try { user = auth.require(['admin', 'jefe', 'mecanico']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
let who = user?.role === 'mecanico' ? user.id : 'u-mec';
let tab = 'trabajos';
const hm = m => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}:${String(Math.floor((m * 60) % 60)).padStart(2, '0')}`;

function myOTs() {
  return db.query('ots', o => ['aprobado', 'reparacion', 'control'].includes(o.status) && (o.mechanicId === who || o.tasks.some(t => t.mech === who)))
    .sort((a, b) => (b.tasks.some(t => t.run) - a.tasks.some(t => t.run)) || a.promisedAt.localeCompare(b.promisedAt));
}
function otCard(o) {
  const mine = o.tasks.filter(t => t.mech === who || (!t.mech && o.mechanicId === who));
  const reqs = db.query('partRequests', r => r.otId === o.id && r.mechanicId === who);
  const done = mine.filter(t => t.done).length;
  return `<article class="card ot-card st-${o.status}">
    <div class="row between nowrap"><span>${plate(o.plate)} <b>${escape(o.code)}</b></span>${stBadge(o.status)}</div>
    <b>${escape(o.car)}</b><small class="muted">${escape(db.get('bays', o.bayId)?.name || 'Sin bahía')} · ${fmtKm(o.km)} · ${fuelGauge(o.fuel)} · entrega ${new Date(o.promisedAt).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })}</small>
    <details><summary class="small">Diagnóstico y notas</summary><p class="small" style="margin:6px 0 0">${escape(o.diagnosis || o.symptom)}</p>${o.intake.notes ? `<p class="small muted">${escape(o.intake.notes)}</p>` : ''}</details>
    <div class="row between small"><span>Mis tareas ${done}/${mine.length}</span><span>${mine.reduce((s, t) => s + t.std, 0).toFixed(1).replace('.', ',')} h estándar</span></div>
    <div class="progress"><i style="--v:${mine.length ? done / mine.length * 100 : 0}%"></i></div>
    <div>${mine.map(t => { const m = taskMin(t), over = m / 60 > t.std; return `<div class="task-row ${t.done ? 'done' : ''} ${t.run ? 'running' : ''}"><div><span class="t-desc"><b>${escape(t.desc)}</b></span><small class="muted d-block">Estándar ${String(t.std).replace('.', ',')} h ${over && !t.done ? '· <span class="text-warning">sobre el estándar</span>' : ''}</small></div><span class="t-time" ${t.run ? `data-run="${o.id}|${t.id}"` : ''}>${hm(m)}</span>
      ${t.done ? '<div class="t-actions"><span class="badge badge-success">✓ Terminada</span></div>' : `<div class="t-actions">${t.run ? `<button class="btn" data-pause="${o.id}|${t.id}">⏸ Pausar</button>` : `<button class="btn btn-primary" data-start="${o.id}|${t.id}">▶ ${m ? 'Reanudar' : 'Iniciar'}</button>`}<button class="btn" data-finish="${o.id}|${t.id}">✓ Terminar</button></div>`}</div>`; }).join('') || '<p class="muted small">Sin tareas asignadas en esta OT.</p>'}</div>
    ${reqs.length ? `<div class="stack" style="gap:4px">${reqs.map(r => `<small>📦 ${r.qty}× ${escape(db.get('parts', r.partId)?.name || '')} · <span class="badge ${r.status === 'entregado' ? 'badge-success' : 'badge-warning'} plain">${escape(r.status)}</span></small>`).join('')}</div>` : ''}
    ${(o.findings || []).filter(f => f.by === who).map(f => `<small class="text-warning">🔎 ${escape(f.text)}</small>`).join('')}
    <div class="grid-2"><button class="btn" data-part="${o.id}">📦 Pedir repuesto</button><button class="btn" data-find="${o.id}">🔎 Hallazgo</button></div>
    ${o.status === 'control' ? '<p class="callout small" style="margin:0">En control de calidad: el jefe de taller revisa y prueba el vehículo.</p>' : `<button class="btn btn-primary btn-lg" data-qc="${o.id}" ${mine.length && mine.every(t => t.done) ? '' : 'disabled'}>✅ Listo para control de calidad</button>`}
  </article>`;
}

function render() {
  if (!user) return;
  const ots = myOTs(), me = db.get('users', who);
  const running = ots.flatMap(o => o.tasks.filter(t => t.run && t.mech === who).map(t => ({ o, t })))[0];
  const today = db.query('ots', o => o.tasks.some(t => t.mech === who && t.done));
  const hoursToday = db.all('ots').flatMap(o => o.tasks.filter(t => t.mech === who)).reduce((s, t) => s + taskMin(t), 0) / 60;
  app.innerHTML = `<header class="mech-top"><span class="avatar" style="--av:${escape(me?.color || 'var(--primary)')}">${escape(initials(me?.name || ''))}</span><div class="grow"><b>${escape(me?.name || '')}</b><small class="muted d-block">${escape(me?.specialty || 'Mecánico')} · ${ots.length} OT asignadas</small></div>
      ${user.role !== 'mecanico' ? `<select class="select sm" data-who aria-label="Mecánico">${mechanics().map(m => `<option value="${m.id}" ${m.id === who ? 'selected' : ''}>${escape(m.name)}</option>`).join('')}</select><a class="btn btn-sm btn-ghost" href="admin.html#/tablero">Panel</a>` : ''}<button class="btn btn-sm btn-ghost" data-out>Salir</button></header>
    <div class="container mech-main stack">
      ${running ? `<div class="callout ok row between"><span>▶ Trabajando en <b>${escape(running.o.code)}</b>: ${escape(running.t.desc)}</span><b class="t-time" data-run="${running.o.id}|${running.t.id}">${hm(taskMin(running.t))}</b></div>` : '<p class="callout warn small" style="margin:0">⏸ Sin tarea en curso. Inicia una para registrar tus horas.</p>'}
      <div class="tabs"><button class="tab ${tab === 'trabajos' ? 'active' : ''}" data-tab="trabajos">Mis trabajos (${ots.length})</button><button class="tab ${tab === 'hechos' ? 'active' : ''}" data-tab="hechos">Terminados</button></div>
      ${tab === 'trabajos' ? (ots.map(otCard).join('') || '<div class="card empty"><span class="icon">🧰</span>No tienes trabajos asignados. Avisa al jefe de taller.</div>')
        : `<div class="card stack"><div class="row between"><b>Horas registradas</b><b>${hoursToday.toFixed(1).replace('.', ',')} h</b></div>${today.map(o => `<div class="row between small"><span>${plate(o.plate)} ${escape(o.code)}</span><span>${o.tasks.filter(t => t.mech === who && t.done).length} tareas · ${stBadge(o.status)}</span></div>`).join('') || '<p class="muted small">Aún nada terminado.</p>'}</div>`}
    </div>`;
}

app.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (b.hasAttribute('data-out')) { auth.logout(); location.href = 'login.html'; return; }
  if (d.tab) { tab = d.tab; render(); return; }
  if (d.start) { const [o, t] = d.start.split('|'); startTask(o, t, who); toast('Cronómetro iniciado', 'success'); return; }
  if (d.pause) { const [o, t] = d.pause.split('|'); pauseTask(o, t); toast('Tarea en pausa', 'info'); return; }
  if (d.finish) { const [o, t] = d.finish.split('|'); finishTask(o, t, who); toast('Tarea terminada', 'success'); return; }
  if (d.qc) { const o = db.get('ots', d.qc); if (await confirm(`¿Enviar ${o.code} a control de calidad?`, { ok: 'Enviar' })) { setStatus(o.id, 'control', who); toast('Enviada a control de calidad', 'success'); } return; }
  if (d.part) {
    const o = db.get('ots', d.part), parts = db.query('parts', p => p.active !== false);
    const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
    f.innerHTML = `<div class="field"><label for="rp-p">Repuesto</label><select class="select" id="rp-p" name="part">${parts.map(p => `<option value="${p.id}" ${o.budget.some(i => i.partId === p.id) ? 'selected' : ''}>${escape(p.name)} · stock ${p.stock}</option>`).join('')}</select></div><div class="grid-2"><div class="field"><label for="rp-q">Cantidad</label><input class="input" id="rp-q" name="qty" type="number" min="1" value="1"></div><div class="field"><label for="rp-n">Nota</label><input class="input" id="rp-n" name="note" placeholder="Ej.: urgente, auto en elevador"></div></div>`;
    const m = modal({ title: `Pedir repuesto · ${o.code}`, body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Pedir a bodega</button>' });
    m.el.querySelector('[data-ok]').onclick = () => { requestPart(o.id, f.elements.part.value, Math.max(1, +f.elements.qty.value || 1), who, f.elements.note.value.trim()); toast('Solicitud enviada a bodega', 'success'); m.close(); };
    return;
  }
  if (d.find) {
    const o = db.get('ots', d.find), labor = db.query('labor', l => l.active !== false), parts = db.query('parts', p => p.active !== false);
    let photo = false;
    const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
    f.innerHTML = `<div class="field"><label for="fd-t">¿Qué encontraste? *</label><textarea class="textarea" id="fd-t" name="text" placeholder="Ej.: correa de accesorios agrietada"></textarea></div>
      <button type="button" class="photo" data-ph style="max-width:160px">＋<small>Agregar foto</small></button>
      <label class="check"><input type="checkbox" name="sug"> Proponer al cliente como ítem del presupuesto</label>
      <div class="grid-2" data-sugbox hidden><div class="field"><label for="fd-l">Mano de obra</label><select class="select" id="fd-l" name="labor"><option value="">—</option>${labor.map(l => `<option value="${l.id}">${escape(l.name)} (${l.hours} h)</option>`).join('')}</select></div><div class="field"><label for="fd-p">Repuesto</label><select class="select" id="fd-p" name="part"><option value="">—</option>${parts.map(p => `<option value="${p.id}">${escape(p.name)} · ${money(p.price)}</option>`).join('')}</select></div></div>
      <small class="muted">El asesor lo verá en la OT y el cliente podrá aprobarlo en línea.</small>`;
    f.querySelector('[data-ph]').onclick = ev => { photo = !photo; ev.currentTarget.classList.toggle('on', photo); ev.currentTarget.innerHTML = `${photo ? '📷' : '＋'}<small>${photo ? 'Foto adjunta' : 'Agregar foto'}</small>`; };
    f.elements.sug.onchange = () => { f.querySelector('[data-sugbox]').hidden = !f.elements.sug.checked; };
    const m = modal({ title: `Hallazgo · ${o.code}`, body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Registrar</button>' });
    m.el.querySelector('[data-ok]').onclick = () => {
      const text = f.elements.text.value.trim();
      if (text.length < 5) { f.elements.text.classList.add('invalid'); toast('Describe el hallazgo', 'warning'); return; }
      addFinding(o.id, { text, photo }, who);
      if (f.elements.sug.checked) {
        const l = db.get('labor', f.elements.labor.value), p = db.get('parts', f.elements.part.value);
        if (l) addFinding.call(null, o.id, { text: `Propuesta: ${l.name}`, photo: false, suggest: { kind: 'mano', laborId: l.id, desc: l.name, hours: l.hours, qty: 1, price: laborPrice(l.hours, l.cat), prio: 'recomendado' } }, who);
        if (p) addFinding.call(null, o.id, { text: `Propuesta: ${p.name}`, photo, suggest: { kind: 'repuesto', partId: p.id, desc: p.name, qty: 1, price: p.price, prio: 'recomendado' } }, who);
        if (l || p) db.update('ots', o.id, x => ({ budgetSentAt: x.budgetSentAt || new Date().toISOString(), findings: x.findings.filter(fd => !fd.text.startsWith('Propuesta: ')) }));
      }
      toast('Hallazgo registrado', 'success'); m.close();
    };
  }
});
app.addEventListener('change', e => { if (e.target.matches('[data-who]')) { who = e.target.value; render(); } });
render();
db.subscribe(() => { if (!document.querySelector('.modal-backdrop')) render(); });
setInterval(() => app.querySelectorAll('[data-run]').forEach(el => { const [o, t] = el.dataset.run.split('|'); const task = db.get('ots', o)?.tasks.find(x => x.id === t); if (task) el.textContent = hm(taskMin(task)); }), 1000);
export { ST_OF, userName };
