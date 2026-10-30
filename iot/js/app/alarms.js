// Centro de alarmas: reconocer, asignar, comentar, resolver y generar órdenes de trabajo.
import { db, userName } from '../data/db.js';
import { ago, dateTime, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { TYPES, history, fmt, value } from '../shared/sim.js';
import { lineSvg } from '../shared/viz.js';
import { pageHead, table, csv, selectFilter, sevBadge, alarmBadge, woBadge, siteName, zoneName } from '../shared/common.js';

const st = { tab: 'abiertas', severity: '', site: '' };
const now = () => new Date().toISOString();

export function render(el, ctx) {
  if (ctx.params.id) return detail(el, ctx);
  const write = ctx.can('app.alarmas');
  const all = db.all('alarms');
  const rows = all.filter(a => (st.tab === 'abiertas' ? a.status !== 'resuelta' : st.tab === 'todas' || a.status === st.tab) && (!st.severity || a.severity === st.severity) && (!st.site || a.siteId === st.site))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(a => ({ ...a, dev: db.get('devices', a.deviceId)?.name || '—', owner: a.assignee ? userName(a.assignee) : '—' }));
  const n = s => all.filter(a => a.status === s).length;
  el.innerHTML = pageHead('Centro de alarmas', 'Se generan solas cuando una lectura cruza un umbral durante el tiempo configurado.', `<button class="btn btn-sm" data-csv>⬇ CSV</button>${write && n('activa') ? `<button class="btn btn-sm btn-primary" data-ackall>Reconocer activas (${n('activa')})</button>` : ''}`, !write) + h`
  <div class="tabs">${[['abiertas', `Abiertas (${n('activa') + n('reconocida')})`], ['activa', `Activas (${n('activa')})`], ['reconocida', `Reconocidas (${n('reconocida')})`], ['resuelta', `Resueltas (${n('resuelta')})`], ['todas', 'Todas']].map(([k, l]) => h`<button class="tab ${st.tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`)}</div>
  <div class="card filters">${raw(selectFilter('fv', 'Severidad', [['critica', 'Crítica'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']], st.severity, 'Todas'))}${raw(selectFilter('fs', 'Sitio', db.all('sites').map(s => [s.id, s.name]), st.site))}</div><div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    rows, search: a => `${a.code} ${a.ruleName} ${a.dev} ${a.owner}`,
    columns: [
      { key: 'code', label: 'Alarma', render: a => h`<b class="mono">${a.code}</b><br><span class="small muted">${ago(a.createdAt)}</span>` },
      { key: 'ruleName', label: 'Regla / dispositivo', render: a => h`<b>${a.ruleName}</b><br><span class="small muted">${a.dev} · ${siteName(a.siteId)}</span>` },
      { key: 'value', label: 'Valor', render: a => h`<span class="mono">${a.value} (${a.op} ${a.threshold})</span>${a.status !== 'resuelta' && a.cleared ? raw('<br><span class="small" style="color:var(--success)">volvió a rango</span>') : ''}` },
      { key: 'severity', label: 'Severidad', render: a => raw(sevBadge(a.severity)) },
      { key: 'status', label: 'Estado', render: a => raw(alarmBadge(a.status)) },
      { key: 'owner', label: 'Asignada a' },
    ],
    onRow: a => ctx.go('/alarmas/' + a.id),
  });
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; ctx.refresh(); });
  [['#fv', 'severity'], ['#fs', 'site']].forEach(([s, k]) => el.querySelector(s).onchange = e => { st[k] = e.target.value; ctx.refresh(); });
  el.querySelector('[data-csv]').onclick = () => csv('alarmas-sentinela.csv', rows.map(a => ({ codigo: a.code, fecha: a.createdAt, regla: a.ruleName, dispositivo: a.dev, sitio: siteName(a.siteId), valor: a.value, umbral: `${a.op} ${a.threshold}`, severidad: a.severity, estado: a.status, asignada: a.owner, resuelta: a.resolvedAt || '' })));
  el.querySelector('[data-ackall]')?.addEventListener('click', async () => {
    if (!(await confirm(`Se reconocerán ${n('activa')} alarmas activas a tu nombre.`, { title: 'Reconocer alarmas', ok: 'Reconocer' }))) return;
    all.filter(a => a.status === 'activa').forEach(a => db.update('alarms', a.id, { status: 'reconocida', ackAt: now(), ackBy: ctx.user.id, assignee: a.assignee || ctx.user.id }));
    db.log('alarma', `${ctx.user.name} reconoció ${n('activa')} alarmas`, ctx.user.id);
    toast('Alarmas reconocidas', 'success');
  });
}

function detail(el, ctx) {
  const a = db.get('alarms', ctx.params.id);
  if (!a) { el.innerHTML = '<div class="empty">Alarma no encontrada. <a href="#/alarmas">Volver</a></div>'; return; }
  const write = ctx.can('app.alarmas');
  const d = db.get('devices', a.deviceId);
  const wo = a.workOrderId ? db.get('orders', a.workOrderId) : null;
  const users = db.query('users', u => u.active !== false && u.role !== 'lectura');
  const t0 = new Date(a.createdAt).getTime();
  el.innerHTML = h`<div class="page-head"><div><a href="#/alarmas" class="small">← Alarmas</a><h1>${a.code} · ${a.ruleName}</h1><p class="muted" style="margin:4px 0 0">${d?.name || '—'} · ${zoneName(d?.zoneId)} · ${siteName(a.siteId)}</p></div><div class="row">${raw(sevBadge(a.severity))}${raw(alarmBadge(a.status))}${!write ? raw('<span class="badge badge-warning readonly-flag">Solo lectura</span>') : ''}</div></div>
  <div class="grid-2" style="align-items:start;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">
    <div class="stack">
      <section class="card"><div class="chart-head"><h3 style="margin:0">Lectura en torno a la alarma</h3>${d ? raw(`<span class="small muted">ahora: <b>${fmt(d, value(d))}</b></span>`) : ''}</div>
        ${d ? raw(lineSvg(history(d, t0 - 30 * 6e4, Math.min(Date.now(), t0 + 30 * 6e4), 120), { height: 200, thresholds: [{ value: a.threshold, label: `${a.op} ${a.threshold}` }], dec: TYPES[d.type].dec ? 1 : 0, timeFmt: x => new Date(x).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) })) : ''}</section>
      <section class="card stack"><h3 style="margin:0">Comentarios</h3>
        <div class="thread">${(a.comments || []).map(c => h`<div class="msg">${c.text}<small>${userName(c.by)} · ${dateTime(c.at)}</small></div>`)}${!(a.comments || []).length ? raw('<p class="muted small">Sin comentarios.</p>') : ''}</div>
        ${write ? raw('<div class="field"><label for="cm">Agregar comentario</label><textarea class="textarea" id="cm" style="min-height:70px"></textarea></div><button class="btn btn-sm" data-comment>Comentar</button>') : ''}</section>
    </div>
    <div class="stack">
      <section class="card stack"><h3 style="margin:0">Detalle</h3>
        <dl class="kv"><dt>Disparo</dt><dd>${dateTime(a.createdAt)}</dd><dt>Valor</dt><dd class="mono">${a.value} (umbral ${a.op} ${a.threshold})</dd><dt>Notificó a</dt><dd>${a.notify || db.get('rules', a.ruleId)?.notify || '—'}</dd><dt>Reconocida</dt><dd>${a.ackAt ? dateTime(a.ackAt) : '—'}</dd><dt>Resuelta</dt><dd>${a.resolvedAt ? dateTime(a.resolvedAt) : '—'}</dd><dt>Lectura actual</dt><dd>${a.cleared ? 'Volvió a rango normal' : 'Fuera de rango'}</dd></dl>
        <div class="field"><label for="asg">Asignada a</label><select class="select" id="asg" ${write && a.status !== 'resuelta' ? '' : 'disabled'}><option value="">Sin asignar</option>${users.map(u => h`<option value="${u.id}" ${a.assignee === u.id ? 'selected' : ''}>${u.name}</option>`)}</select></div>
        ${write ? raw(`<div class="row">${a.status === 'activa' ? '<button class="btn btn-primary" data-ack>Reconocer</button>' : ''}${a.status !== 'resuelta' ? '<button class="btn" data-resolve>Resolver</button>' : '<button class="btn btn-ghost" data-reopen>Reabrir</button>'}</div>`) : ''}
      </section>
      <section class="card stack"><h3 style="margin:0">Orden de trabajo</h3>
        ${wo ? raw(h`<div class="row between"><b>${wo.code} · ${wo.title}</b>${raw(woBadge(wo.status))}</div><span class="small muted">${userName(wo.assignee)} · vence ${wo.due}</span><a class="small" href="#/ordenes">Ver órdenes →</a>`) : write && ctx.can('app.ordenes') ? raw('<p class="small muted" style="margin:0">Genera una OT de mantención vinculada a esta alarma.</p><button class="btn btn-sm" data-wo>+ Crear orden de trabajo</button>') : raw('<p class="small muted">Sin orden asociada.</p>')}
      </section>
    </div>
  </div>`;
  if (!write) return;
  const upd = (patch, msg, logMsg) => { db.update('alarms', a.id, patch); db.log('alarma', logMsg, ctx.user.id); toast(msg, 'success'); };
  el.querySelector('#asg').onchange = e => upd({ assignee: e.target.value || null }, 'Asignación actualizada', `${ctx.user.name} asignó ${a.code} a ${e.target.value ? userName(e.target.value) : 'nadie'}`);
  el.querySelector('[data-ack]')?.addEventListener('click', () => upd({ status: 'reconocida', ackAt: now(), ackBy: ctx.user.id, assignee: a.assignee || ctx.user.id }, 'Alarma reconocida', `${ctx.user.name} reconoció ${a.code}`));
  el.querySelector('[data-reopen]')?.addEventListener('click', () => upd({ status: 'reconocida', resolvedAt: null }, 'Alarma reabierta', `${ctx.user.name} reabrió ${a.code}`));
  el.querySelector('[data-comment]')?.addEventListener('click', () => {
    const text = el.querySelector('#cm').value.trim(); if (!text) return toast('Escribe un comentario', 'warning');
    upd({ comments: [...(a.comments || []), { by: ctx.user.id, at: now(), text }] }, 'Comentario agregado', `${ctx.user.name} comentó ${a.code}`);
  });
  el.querySelector('[data-resolve]')?.addEventListener('click', async () => {
    const v = await formModal({ title: `Resolver ${a.code}`, fields: [{ name: 'cause', label: 'Causa', type: 'select', options: ['Condición real corregida', 'Falla de sensor / calibración', 'Mantención programada', 'Falsa alarma', 'Otra'] }, { name: 'text', label: 'Acciones realizadas', type: 'textarea', required: true }] });
    if (!v) return;
    upd({ status: 'resuelta', resolvedAt: now(), resolvedBy: ctx.user.id, cause: v.cause, ackAt: a.ackAt || now(), comments: [...(a.comments || []), { by: ctx.user.id, at: now(), text: `Resuelta (${v.cause}): ${v.text}` }] }, 'Alarma resuelta', `${ctx.user.name} resolvió ${a.code}: ${v.cause}`);
  });
  el.querySelector('[data-wo]')?.addEventListener('click', async () => {
    const v = await formModal({ title: 'Orden de trabajo desde alarma', fields: [{ name: 'title', label: 'Trabajo', required: true, value: `Revisar ${d?.name}: ${a.ruleName}` }, { name: 'priority', label: 'Prioridad', type: 'select', options: ['alta', 'media', 'baja'], value: a.severity === 'critica' || a.severity === 'alta' ? 'alta' : 'media' }, { name: 'assignee', label: 'Responsable', type: 'select', options: users.map(u => [u.id, u.name]) }, { name: 'due', label: 'Fecha límite', type: 'date', value: new Date(Date.now() + 864e5).toISOString().slice(0, 10) }] });
    if (!v) return;
    const o = db.insert('orders', { code: `OT-${1500 + db.count('orders')}`, ...v, deviceId: a.deviceId, alarmId: a.id, status: 'abierta', checklist: [{ text: 'Bloqueo y etiquetado (LOTO)', done: false }, { text: 'Diagnóstico en terreno', done: false }, { text: 'Corrección y prueba', done: false }], notes: '' });
    upd({ workOrderId: o.id }, `${o.code} creada`, `${ctx.user.name} creó ${o.code} desde ${a.code}`);
  });
}
