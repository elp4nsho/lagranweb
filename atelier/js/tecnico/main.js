// App del técnico: tarjetas de trabajo, cronómetro, inspección multipunto con semáforo, multimedia y batería EV.
import { escape, money, toast, dateTime, time, formModal, barChart, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { LIGHT, REC_LIBRARY, inspectionTemplate, WO_STATES } from '../data/catalog.js';
import { vehicleById, customerById, vehicleName, kmFmt, woState, lineOf, setWoStatus, nextServices, inspectionStats, isEv, userById } from '../shared/domain.js';
import { carArt } from '../shared/car-art.js';
import { batteryBlock } from '../public/inspeccion.js';

let user;
try { user = auth.require(['admin', 'gerente', 'tecnico']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
let scope = user?.role === 'tecnico' ? 'mine' : 'all';
let draft = null; // estado del formulario de inspección en edición
const TONES = { recepcion: 'info', inspeccion: 'warning', aprobacion: 'warning', 'en-proceso': 'primary', control: 'accent', lista: 'success', agendada: 'info' };
const fmtMins = m => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min`;

function top() {
  const run = db.find('workOrders', w => w.timer?.techId === user.id);
  return `<header class="role-top"><span class="brand-mark" aria-hidden="true">AT</span><div class="grow"><b>Taller</b><small class="muted d-block">${escape(user.name)} · ${escape(user.specialty || auth.roleName(user.role))}</small></div>
    ${run ? `<a class="btn btn-sm btn-danger" href="#/ot/${run.id}">⏱ ${escape(run.code)}</a>` : ''}<a class="btn btn-sm btn-ghost" href="#/">Trabajos</a><a class="btn btn-sm btn-ghost hide-sm" href="#/tiempos">Tiempos</a>
    ${user.role !== 'tecnico' ? '<a class="btn btn-sm btn-ghost hide-sm" href="admin.html">Panel</a>' : ''}<span class="avatar" style="--av:${escape(user.color)}">${escape(initials(user.name))}</span><button class="btn btn-sm btn-ghost" data-out>Salir</button></header>`;
}
const jobsOf = () => db.query('workOrders', w => !['entregada', 'cancelada'].includes(w.status) && (scope === 'all' || w.techId === user.id || (scope === 'pool' && !w.techId)))
  .filter(w => scope !== 'pool' || !w.techId).sort((a, b) => (WO_STATES[b.status].step - WO_STATES[a.status].step) || (a.scheduledAt || a.createdAt).localeCompare(b.scheduledAt || b.createdAt));

function list() {
  const jobs = jobsOf(), pool = db.count('workOrders', w => !w.techId && !['entregada', 'cancelada'].includes(w.status));
  const mine = db.query('workOrders', w => w.techId === user.id && !['entregada', 'cancelada', 'agendada'].includes(w.status));
  app.innerHTML = `${top()}<main class="role-wrap">
    <div class="row between"><div><h1 style="margin:0">Tarjetas de trabajo</h1><p class="muted" style="margin:0">${mine.length} en curso asignadas a ti · ${pool} sin asignar</p></div></div>
    <div class="tabs"><button class="tab ${scope === 'mine' ? 'active' : ''}" data-scope="mine">Mis trabajos</button><button class="tab ${scope === 'pool' ? 'active' : ''}" data-scope="pool">Sin asignar (${pool})</button><button class="tab ${scope === 'all' ? 'active' : ''}" data-scope="all">Todo el taller</button></div>
    <div class="job-grid">${jobs.map(w => { const v = vehicleById(w.vehicleId); return `<button class="card job tone-${TONES[w.status] || 'primary'}" data-go="#/ot/${w.id}">
      <div class="row between" style="width:100%"><b class="mono">${w.code}</b><span class="badge badge-${woState(w.status).badge}">${escape(woState(w.status).label)}</span></div>
      ${carArt({ body: v?.body, color: v?.color, ev: v?.fuel === 'electrico' })}
      <span><b>${escape(vehicleName(v))}</b><small class="muted d-block">${escape(v?.plate || '')} · ${kmFmt(w.km)}</small></span>
      <span class="small">${lineOf(w.line).icon} ${escape(w.title)}</span>
      <small class="muted">${w.timer ? '⏱ cronómetro en marcha · ' : ''}${escape(userById(w.techId)?.name || 'Sin asignar')} · ${w.laborHours} h</small></button>`; }).join('') || '<div class="card empty">No hay trabajos en esta vista.</div>'}</div></main>`;
}

function tasksOf(w) {
  const v = vehicleById(w.vehicleId);
  if (w.line === 'mantencion') { const [s] = nextServices({ ...v, km: w.km - 1 }, 1); return s ? s.tasks : []; }
  return w.serviceIds.flatMap(id => db.get('services', id)?.includes || []);
}
function job(id) {
  const w = db.get('workOrders', id);
  if (!w) { app.innerHTML = `${top()}<main class="role-wrap"><div class="card empty">OT no encontrada.</div></main>`; return; }
  const v = vehicleById(w.vehicleId), c = customerById(w.customerId), tasks = tasksOf(w), checks = w.checks || [];
  const ins = w.inspectionId && db.get('inspections', w.inspectionId), st = ins && !ins.draft ? inspectionStats(ins) : null;
  const running = w.timer, logged = (w.loggedMins || 0) + (running ? (Date.now() - new Date(running.start)) / 60000 : 0);
  const act = { agendada: ['recepcion', 'Recibir vehículo'], recepcion: ['inspeccion', 'Iniciar inspección'], 'en-proceso': ['control', 'Enviar a control de calidad'], control: ['lista', 'Aprobar control y marcar lista'] }[w.status];
  app.innerHTML = `${top()}<main class="role-wrap">
    <a href="#/" class="small">← Trabajos</a>
    <div class="row between"><div><span class="eyebrow mono">${w.code}</span><h1 style="margin:0">${escape(vehicleName(v))}</h1><p class="muted" style="margin:0">${escape(v?.plate || '')} · ${kmFmt(w.km)} · ${escape(c?.name || '')}</p></div><span class="badge badge-${woState(w.status).badge}">${escape(woState(w.status).label)}</span></div>
    <div class="grid-2" style="align-items:start">
      <div class="stack">
        <div class="card car-frame">${carArt({ body: v?.body, color: v?.color, ev: isEv(v) })}</div>
        <div class="card stack"><h3 style="margin:0">${lineOf(w.line).icon} ${escape(w.title)}</h3>
          ${tasks.length ? tasks.map((t, i) => `<label class="check"><input type="checkbox" data-check="${i}" ${checks[i] ? 'checked' : ''}> ${escape(t)}</label>`).join('') : '<p class="muted">Sin lista de tareas.</p>'}
          ${w.items.filter(i => i.kind === 'rec').length ? `<span class="label">Adicionales aprobados por el cliente</span>${w.items.filter(i => i.kind === 'rec').map(i => `<span class="small">✅ ${escape(i.desc)}</span>`).join('')}` : ''}
          ${w.notes ? `<p class="callout small">📝 ${escape(w.notes)}</p>` : ''}</div>
      </div>
      <div class="stack">
        <div class="card stack" style="text-align:center;align-items:center"><span class="label">Tiempo registrado</span><span class="timer ${running ? 'on' : ''}" data-timer>${fmtMins(logged)}</span><small class="muted">${w.laborHours} h estándar · eficiencia ${logged ? Math.round(w.laborHours * 60 / logged * 100) : 0}%</small>
          <div class="row" style="justify-content:center">${running ? '<button class="btn btn-danger btn-lg" data-stop>■ Detener</button>' : '<button class="btn btn-primary btn-lg" data-start>▶ Iniciar cronómetro</button>'}<button class="btn" data-manual>+ Manual</button></div></div>
        <div class="card stack"><h3 style="margin:0">Inspección digital</h3>
          ${st ? `<div class="row" style="gap:6px"><span class="badge badge-success">${st.ok} bien</span><span class="badge badge-warning">${st.atencion} atención</span><span class="badge badge-danger">${st.urgente} acción</span></div><a class="btn btn-sm" href="index.html#/inspeccion/${ins.id}" target="_blank" rel="noopener">Ver informe del cliente ↗</a>`
            : ['inspeccion', 'recepcion'].includes(w.status) || ins?.draft ? `<a class="btn btn-primary" href="#/ot/${w.id}/inspeccion">${ins?.draft ? 'Continuar inspección' : 'Abrir formulario de inspección'}</a>` : '<p class="muted small" style="margin:0">Sin inspección para esta OT.</p>'}
          ${w.status === 'aprobacion' ? '<p class="callout warn small">Esperando que el cliente apruebe los trabajos recomendados.</p>' : ''}</div>
        ${act ? `<button class="btn btn-primary btn-lg btn-block" data-adv="${act[0]}">${escape(act[1])} →</button>` : ''}
        ${!w.techId ? '<button class="btn btn-block" data-take>Tomar este trabajo</button>' : ''}
        <div class="card stack"><h3 style="margin:0">Registro de tiempos</h3>${(w.timeLogs || []).map(t => `<div class="row between small"><span>${dateTime(t.at)} · ${escape(t.note || '')}<small class="muted d-block">${escape(userById(t.techId)?.name || '')}</small></span><b>${t.mins} min</b></div>`).join('') || '<small class="muted">Sin registros.</small>'}</div>
      </div></div></main>`;
}

// ---------- Formulario de inspección ----------
function startDraft(w) {
  const v = vehicleById(w.vehicleId), ins = w.inspectionId && db.get('inspections', w.inspectionId);
  const base = ins?.items || inspectionTemplate(isEv(v)).map(({ cat, name }) => ({ cat, name, s: null }));
  draft = { woId: w.id, items: JSON.parse(JSON.stringify(base)), summary: ins?.summary || '', battery: ins?.battery ? { ...ins.battery } : (isEv(v) || v?.fuel === 'hibrido' ? { soh: '', tempC: '', cycles: '', rangeKm: '', cells: [] } : null) };
}
function inspForm(id) {
  const w = db.get('workOrders', id);
  if (!w) return;
  if (!draft || draft.woId !== id) startDraft(w);
  const v = vehicleById(w.vehicleId), cats = [...new Set(draft.items.map(i => i.cat))];
  const done = draft.items.filter(i => i.s).length, b = draft.battery;
  app.innerHTML = `${top()}<main class="role-wrap">
    <a href="#/ot/${id}" class="small">← ${w.code}</a>
    <div class="row between"><div><span class="eyebrow">Inspección multipunto</span><h1 style="margin:0">${escape(vehicleName(v))}</h1></div><span class="badge">${done} / ${draft.items.length}</span></div>
    <div class="progress"><i style="--v:${Math.round(done / draft.items.length * 100)}%"></i></div>
    <div class="row"><button class="btn btn-sm" data-allok>✓ Marcar pendientes como “Bien”</button></div>
    ${cats.map(cat => `<div class="card stack"><h3 style="margin:0">${escape(cat)}</h3>${draft.items.map((it, k) => it.cat !== cat ? '' : `<div class="insp-item ${it.s || ''}" style="grid-template-columns:minmax(0,1fr) auto">
      <div class="stack" style="gap:6px"><b>${escape(it.name)}</b>
        ${it.s && it.s !== 'ok' ? `<textarea class="textarea" data-k="${k}" data-f="c" placeholder="Comentario para el cliente" style="min-height:60px">${escape(it.c || '')}</textarea>
          <div class="grid-2"><input class="input" data-k="${k}" data-f="recDesc" placeholder="Trabajo recomendado" value="${escape(it.rec?.desc || '')}"><input class="input" type="number" data-k="${k}" data-f="recPrice" placeholder="Precio recomendado" value="${it.rec?.price || ''}"></div>` : ''}
        ${/Neum|Pastillas/.test(it.name) ? `<input class="input sm" data-k="${k}" data-f="val" placeholder="Medición (mm)" value="${escape(it.val || '')}" style="max-width:160px">` : ''}
        <div class="row" style="gap:6px"><button class="btn btn-sm" data-media="${k}|m">📷 Foto${it.m ? ` (${it.m})` : ''}</button><button class="btn btn-sm" data-media="${k}|v">🎥 Video${it.v ? ` (${it.v})` : ''}</button></div></div>
      <div class="tri" role="group" aria-label="Estado de ${escape(it.name)}">${Object.entries(LIGHT).map(([s, l]) => `<button type="button" class="${it.s === s ? 'on' : ''}" data-light="${k}|${s}" title="${l.label}" aria-label="${l.label}" aria-pressed="${it.s === s}"><span class="light ${s}"></span></button>`).join('')}</div></div>`).join('')}</div>`).join('')}
    ${b ? `<div class="card stack"><h3 style="margin:0">🔋 Lecturas de batería HV</h3><div class="grid-4">
      <div class="field"><label for="bt-soh">SOH (%)</label><input class="input" id="bt-soh" type="number" step="0.1" data-b="soh" value="${b.soh}"></div><div class="field"><label for="bt-t">Temperatura (°C)</label><input class="input" id="bt-t" type="number" data-b="tempC" value="${b.tempC}"></div>
      <div class="field"><label for="bt-c">Ciclos</label><input class="input" id="bt-c" type="number" data-b="cycles" value="${b.cycles}"></div><div class="field"><label for="bt-r">Autonomía (km)</label><input class="input" id="bt-r" type="number" data-b="rangeKm" value="${b.rangeKm}"></div></div>
      <button class="btn btn-sm" style="align-self:flex-start" data-scan>📡 Leer celdas desde el escáner</button>
      ${b.cells.length ? '<div class="cell-chart">' + barChart(b.cells.map((x, i) => ({ label: 'M' + (i + 1), value: Math.round((x - 3.8) * 1000), color: Math.abs(x - b.cells.reduce((a, y) => a + y, 0) / b.cells.length) > .012 ? 'var(--danger)' : 'var(--success)' })), { height: 110, format: v => (3.8 + v / 1000).toFixed(3) + ' V' }) + '</div>' : '<small class="muted">Conecta el escáner para leer el voltaje de los 24 módulos.</small>'}</div>` : ''}
    <div class="card stack"><div class="field"><label for="in-sum">Resumen para el cliente</label><textarea class="textarea" id="in-sum" data-sum>${escape(draft.summary)}</textarea></div>
      <div class="row between"><button class="btn" data-savedraft>Guardar borrador</button><button class="btn btn-primary btn-lg" data-send>Enviar informe al cliente</button></div></div></main>`;
}
function saveInspection(send) {
  const w = db.get('workOrders', draft.woId);
  const items = draft.items.map(it => { const o = { ...it }; if (o.s === 'ok') { delete o.rec; delete o.c; } else if (o.rec && !(o.rec.price > 0 && o.rec.desc)) delete o.rec; if (o.rec) o.ap = null; return o; });
  const b = draft.battery && draft.battery.soh !== '' ? { soh: +draft.battery.soh, tempC: +draft.battery.tempC || 25, cycles: +draft.battery.cycles || 0, rangeKm: +draft.battery.rangeKm || 0, cells: draft.battery.cells.length ? draft.battery.cells : Array.from({ length: 24 }, () => 3.9) } : null;
  const data = { woId: w.id, vehicleId: w.vehicleId, techId: user.id, at: new Date().toISOString(), km: w.km, items, summary: draft.summary, battery: b, draft: !send };
  let ins = w.inspectionId && db.get('inspections', w.inspectionId);
  if (ins) db.update('inspections', ins.id, data); else { ins = db.insert('inspections', data); db.update('workOrders', w.id, { inspectionId: ins.id }); }
  if (send) {
    const recs = items.filter(i => i.rec).length;
    if (w.status === 'recepcion') setWoStatus(w.id, 'inspeccion', user.id);
    setWoStatus(w.id, recs ? 'aprobacion' : 'en-proceso', user.id, recs ? `Inspección enviada: ${recs} recomendación(es) al cliente` : 'Inspección sin hallazgos');
    db.log('inspeccion', `${w.code}: informe digital enviado (${items.filter(i => i.s === 'urgente').length} rojos, ${items.filter(i => i.s === 'atencion').length} ámbar)`, user.id);
    draft = null;
    toast(recs ? 'Informe enviado: el cliente recibirá el enlace para aprobar' : 'Informe enviado', 'success');
    location.hash = '#/ot/' + w.id;
  } else toast('Borrador guardado', 'success');
}

function times() {
  const logs = db.all('workOrders').flatMap(w => (w.timeLogs || []).filter(t => t.techId === user.id).map(t => ({ ...t, w })));
  const today = new Date().toDateString(), week = Date.now() - 7 * 864e5;
  const sum = l => l.reduce((a, t) => a + t.mins, 0);
  app.innerHTML = `${top()}<main class="role-wrap"><h1 style="margin:0">Mis tiempos</h1>
    <div class="kpi-grid"><div class="card stat"><span class="label">Hoy</span><span class="value">${fmtMins(sum(logs.filter(t => new Date(t.at).toDateString() === today)))}</span></div><div class="card stat"><span class="label">Últimos 7 días</span><span class="value">${fmtMins(sum(logs.filter(t => new Date(t.at) > week)))}</span></div><div class="card stat"><span class="label">Registros</span><span class="value">${logs.length}</span></div></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>OT</th><th>Actividad</th><th>Minutos</th></tr></thead><tbody>${logs.sort((a, b) => b.at.localeCompare(a.at)).map(t => `<tr><td>${dateTime(t.at)}</td><td><a href="#/ot/${t.w.id}" class="mono">${t.w.code}</a></td><td>${escape(t.note || '')}</td><td>${t.mins}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sin registros.</td></tr>'}</tbody></table></div></main>`;
}

let tick;
const router = user && createRouter({ '/': () => list(), '/ot/:id': ({ id }) => job(id), '/ot/:id/inspeccion': ({ id }) => inspForm(id), '/tiempos': () => times() }, { notFound: () => router.go('/') });
app.addEventListener('click', async e => {
  const b = e.target.closest('button, [data-go]'); if (!b) return;
  const id = router.current?.params?.id;
  if (b.dataset.go) { location.hash = b.dataset.go; return; }
  if (b.hasAttribute('data-out')) { auth.logout(); location.href = 'login.html'; return; }
  if (b.dataset.scope) { scope = b.dataset.scope; list(); return; }
  const w = id && db.get('workOrders', id);
  if (b.hasAttribute('data-start')) { const other = db.find('workOrders', x => x.timer?.techId === user.id); if (other) stopTimer(other, 'Cambio de tarea'); db.update('workOrders', id, { timer: { techId: user.id, start: new Date().toISOString() } }); toast('Cronómetro iniciado', 'success'); }
  if (b.hasAttribute('data-stop')) { const v = await formModal({ title: 'Detener cronómetro', fields: [{ name: 'note', label: 'Actividad realizada', type: 'select', options: ['Recepción e inspección', 'Diagnóstico con escáner', 'Desmontaje', 'Trabajo principal', 'Prueba en ruta', 'Control de calidad'] }] }); stopTimer(db.get('workOrders', id), v?.note || 'Trabajo'); }
  if (b.hasAttribute('data-manual')) { const v = await formModal({ title: 'Registrar tiempo manual', fields: [{ name: 'mins', label: 'Minutos', type: 'number', value: 30, required: true }, { name: 'note', label: 'Actividad', required: true, value: 'Trabajo principal' }] }); if (v && v.mins > 0) { db.update('workOrders', id, { timeLogs: [...(w.timeLogs || []), { techId: user.id, at: new Date().toISOString(), mins: v.mins, note: v.note }], loggedMins: (w.loggedMins || 0) + v.mins }); toast('Tiempo registrado', 'success'); } }
  if (b.dataset.adv) { setWoStatus(id, b.dataset.adv, user.id); toast(`${w.code} → ${WO_STATES[b.dataset.adv].label}`, 'success'); if (b.dataset.adv === 'inspeccion') location.hash = `#/ot/${id}/inspeccion`; }
  if (b.hasAttribute('data-take')) { db.update('workOrders', id, { techId: user.id }); db.log('ordenes', `${w.code}: tomada por ${user.name}`, user.id); toast('Trabajo asignado a ti', 'success'); }
  // formulario de inspección
  if (b.dataset.light) { const [k, s] = b.dataset.light.split('|'); const it = draft.items[+k]; it.s = s; if (s !== 'ok' && !it.rec && REC_LIBRARY[it.name]) it.rec = { desc: REC_LIBRARY[it.name][0], price: REC_LIBRARY[it.name][1] }; keep(() => inspForm(id)); }
  if (b.dataset.media) { const [k, f] = b.dataset.media.split('|'); draft.items[+k][f] = (draft.items[+k][f] || 0) + 1; toast(f === 'm' ? 'Foto adjuntada (simulada)' : 'Video adjuntado (simulado)', 'success', 1500); keep(() => inspForm(id)); }
  if (b.hasAttribute('data-allok')) { draft.items.forEach(it => { if (!it.s) it.s = 'ok'; }); keep(() => inspForm(id)); }
  if (b.hasAttribute('data-scan')) { const base = 3.86 + Math.random() * .08; draft.battery.cells = Array.from({ length: 24 }, () => Math.round((base + (Math.random() - .5) * .02) * 1000) / 1000); if (draft.battery.soh === '') Object.assign(draft.battery, { soh: (88 + Math.random() * 10).toFixed(1), tempC: 26, cycles: 210, rangeKm: 410 }); toast('24 módulos leídos', 'success'); keep(() => inspForm(id)); }
  if (b.hasAttribute('data-savedraft')) saveInspection(false);
  if (b.hasAttribute('data-send')) {
    const miss = draft.items.filter(i => !i.s).length;
    if (miss) { toast(`Faltan ${miss} puntos por evaluar`, 'warning'); return; }
    if (draft.battery && draft.battery.soh === '') { toast('Ingresa las lecturas de la batería HV', 'warning'); return; }
    if (await confirm('Se enviará el informe con semáforo, fotos y recomendaciones al cliente para su aprobación.', { title: 'Enviar informe', ok: 'Enviar' })) saveInspection(true);
  }
});
app.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.k != null) { const it = draft.items[+t.dataset.k]; if (t.dataset.f === 'c') it.c = t.value; else if (t.dataset.f === 'val') it.val = t.value; else { it.rec = it.rec || { desc: '', price: 0 }; if (t.dataset.f === 'recDesc') it.rec.desc = t.value; else it.rec.price = +t.value || 0; } }
  if (t.dataset.b) draft.battery[t.dataset.b] = t.value;
  if (t.hasAttribute('data-sum')) draft.summary = t.value;
});
app.addEventListener('change', e => { const c = e.target.closest('[data-check]'); if (c) { const w = db.get('workOrders', router.current.params.id); const checks = [...(w.checks || [])]; checks[+c.dataset.check] = c.checked; db.update('workOrders', w.id, { checks }); } });
function keep(fn) { const y = scrollY; fn(); scrollTo(0, y); }
function stopTimer(w, note) {
  if (!w?.timer) return;
  const mins = Math.max(1, Math.round((Date.now() - new Date(w.timer.start)) / 60000));
  db.update('workOrders', w.id, { timer: null, timeLogs: [...(w.timeLogs || []), { techId: user.id, at: w.timer.start, mins, note }], loggedMins: (w.loggedMins || 0) + mins });
  db.log('tiempos', `${w.code}: ${mins} min · ${note}`, user.id); toast(`Registrados ${mins} min`, 'success');
}
if (user) {
  db.subscribe(() => { if (document.querySelector('.modal-backdrop')) return; const p = router.current?.pattern; if (p === '/ot/:id/inspeccion') return; const ae = document.activeElement; if (ae && app.contains(ae) && ae.matches('input:not([type=checkbox]), textarea')) return; keep(() => router.refresh()); });
  tick = setInterval(() => { const el = app.querySelector('[data-timer].on'); if (el) { const w = db.get('workOrders', router.current.params.id); if (w?.timer) el.textContent = fmtMins((w.loggedMins || 0) + (Date.now() - new Date(w.timer.start)) / 60000); } }, 1000);
  router.start();
}
export { money, time };
