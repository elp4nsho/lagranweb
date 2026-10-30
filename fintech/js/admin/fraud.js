// Monitoreo de fraude: alertas con gestión de casos y editor de reglas (monto, velocidad, etc.).
import { db, userName } from '../data/db.js';
import { money, date, dateTime, ago, toast, formModal, confirm, donutChart } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { badge, notify, postTx, evaluateFraud, account } from '../shared/bank.js';
import { pageHead, table, csv, selectFilter } from './kit.js';
import { detail as txDetail } from './transactions.js';

const st = { tab: 'alertas', status: 'activas', severity: '', rule: '' };
const TYPE_LABEL = { monto: 'Monto sobre umbral', velocidad: 'Velocidad (N operaciones en X min)', nuevo_destinatario: 'Destinatario nuevo + monto', horario: 'Horario nocturno (00–06 h) + monto' };

export function render(el, ctx) {
  if (ctx.params.id) return caseView(el, ctx);
  const alerts = db.all('alerts');
  const rules = db.all('fraudRules');
  const head = pageHead('Monitoreo de fraude', 'Alertas generadas por el motor de reglas en tiempo real.', ctx.canWrite ? '<button class="btn btn-sm" data-sim>⚡ Simular operación</button>' : '', !ctx.canWrite);
  const tabs = h`<div class="tabs">${[['alertas', `Alertas (${alerts.filter(a => a.status !== 'cerrada').length} activas)`], ['reglas', `Reglas (${rules.filter(r => r.active).length}/${rules.length})`]].map(([k, l]) => h`<button class="tab ${st.tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`)}</div>`;
  if (st.tab === 'alertas') {
    const rows = alerts.filter(a => (st.status === 'activas' ? a.status !== 'cerrada' : !st.status || a.status === st.status) && (!st.severity || a.severity === st.severity) && (!st.rule || a.ruleId === st.rule))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(a => ({ ...a, customer: userName(a.userId), owner: a.assignee ? userName(a.assignee) : '—' }));
    const byRule = {}; alerts.forEach(a => byRule[a.ruleName] = (byRule[a.ruleName] || 0) + 1);
    const closed = alerts.filter(a => a.status === 'cerrada');
    el.innerHTML = head + tabs + h`<div class="grid-2" style="align-items:start">
      <div class="kpis">
        <div class="card"><div class="stat"><span class="label">Abiertas sin asignar</span><span class="value">${alerts.filter(a => a.status === 'abierta').length}</span></div></div>
        <div class="card"><div class="stat"><span class="label">En investigación</span><span class="value">${alerts.filter(a => a.status === 'en investigación').length}</span></div></div>
        <div class="card"><div class="stat"><span class="label">Tasa de falsos positivos</span><span class="value">${closed.length ? Math.round(closed.filter(a => a.resolution === 'Falso positivo').length / closed.length * 100) : 0}%</span></div></div>
        <div class="card"><div class="stat"><span class="label">Monto en riesgo (activas)</span><span class="value">${money(alerts.filter(a => a.status !== 'cerrada').reduce((s, a) => s + a.amount, 0))}</span></div></div>
      </div>
      <section class="card"><h3>Alertas por regla</h3>${raw(donutChart(Object.entries(byRule).map(([label, value]) => ({ label, value })), { size: 140, label: String(alerts.length) }))}</section></div>
      <div class="card filters">${raw(`<div class="field"><label for="fs">Estado</label><select class="select" id="fs">${[['activas', 'Activas'], ['', 'Todas'], ['abierta', 'Abierta'], ['en investigación', 'En investigación'], ['cerrada', 'Cerrada']].map(([v, l]) => `<option value="${v}" ${st.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`)}${raw(selectFilter('fv', 'Severidad', [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']], st.severity))}${raw(selectFilter('fru', 'Regla', rules.map(r => [r.id, r.name]), st.rule))}<button class="btn btn-sm" data-csv>⬇ CSV</button></div>
      <div data-t></div>`;
    table(el.querySelector('[data-t]'), {
      rows, search: a => `${a.customer} ${a.ruleName} ${a.owner}`,
      columns: [
        { key: 'createdAt', label: 'Fecha', render: a => ago(a.createdAt) },
        { key: 'customer', label: 'Cliente' },
        { key: 'ruleName', label: 'Regla' },
        { key: 'amount', label: 'Monto', render: a => h`<span class="amt">${money(a.amount)}</span>` },
        { key: 'score', label: 'Score', render: a => raw(`<span class="badge badge-${a.score >= 75 ? 'danger' : a.score >= 50 ? 'warning' : 'info'}">${a.score}</span>`) },
        { key: 'severity', label: 'Severidad', render: a => raw(badge(a.severity)) },
        { key: 'status', label: 'Estado', render: a => raw(badge(a.status) + (a.resolution ? ` <span class="small muted">${a.resolution}</span>` : '')) },
        { key: 'owner', label: 'Analista' },
      ],
      onRow: a => ctx.go('/fraude/' + a.id),
    });
    [['#fs', 'status'], ['#fv', 'severity'], ['#fru', 'rule']].forEach(([s, k]) => el.querySelector(s).onchange = e => { st[k] = e.target.value; render(el, ctx); });
    el.querySelector('[data-csv]').onclick = () => csv('alertas-fraude.csv', rows.map(a => ({ fecha: a.createdAt, cliente: a.customer, regla: a.ruleName, monto: a.amount, score: a.score, severidad: a.severity, estado: a.status, resolucion: a.resolution, analista: a.owner })));
  } else {
    el.innerHTML = head + tabs + h`<div class="row between"><p class="muted small" style="margin:0">Las reglas se evalúan en cada transferencia, pago QR o pago de cuentas que hacen los clientes en la app.</p>${ctx.canWrite ? raw('<button class="btn btn-primary btn-sm" data-new>+ Nueva regla</button>') : ''}</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Activa</th><th>Regla</th><th>Condición</th><th>Canal</th><th>Severidad</th><th>Acción</th><th>Alertas</th><th></th></tr></thead><tbody>
      ${rules.map(r => h`<tr><td><label class="switch"><input type="checkbox" data-toggle="${r.id}" ${r.active ? 'checked' : ''} ${ctx.canWrite ? '' : 'disabled'} aria-label="Activar regla"><span></span></label></td><td><b>${r.name}</b></td><td class="small">${cond(r)}</td><td>${r.channel}</td><td>${raw(badge(r.severity))}</td><td>${raw(r.action === 'retener' ? '<span class="badge badge-danger">Retener</span>' : '<span class="badge badge-info">Alertar</span>')}</td><td>${alerts.filter(a => a.ruleId === r.id).length}</td>
        <td class="right nowrap">${ctx.canWrite ? raw(`<button class="btn btn-sm btn-ghost" data-edit="${r.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button>`) : ''}</td></tr>`)}
      </tbody></table></div>`;
    el.querySelectorAll('[data-toggle]').forEach(i => i.onchange = () => { const r = db.update('fraudRules', i.dataset.toggle, { active: i.checked }); db.log('regla', `${ctx.user.name} ${i.checked ? 'activó' : 'desactivó'} la regla "${r.name}"`, ctx.user.id); toast('Regla actualizada', 'success'); });
    el.querySelector('[data-new]')?.addEventListener('click', () => editRule(null, ctx.user));
    el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editRule(db.get('fraudRules', b.dataset.edit), ctx.user));
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const r = db.get('fraudRules', b.dataset.del); if (await confirm(`¿Eliminar la regla "${r.name}"?`, { title: 'Eliminar regla', ok: 'Eliminar', danger: true })) { db.remove('fraudRules', r.id); db.log('regla', `${ctx.user.name} eliminó la regla "${r.name}"`, ctx.user.id); toast('Regla eliminada', 'info'); } });
  }
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; render(el, ctx); });
  el.querySelector('[data-sim]')?.addEventListener('click', () => simulate(ctx));
}

const cond = r => r.type === 'velocidad' ? `≥ ${r.count} operaciones en ${r.windowMin} min` : `${TYPE_LABEL[r.type]}: ≥ ${money(r.threshold)}`;

async function editRule(r, staff) {
  const v = await formModal({
    title: r ? 'Editar regla' : 'Nueva regla',
    fields: [
      { name: 'name', label: 'Nombre', required: true, value: r?.name },
      { name: 'type', label: 'Tipo de regla', type: 'select', options: Object.entries(TYPE_LABEL), value: r?.type || 'monto' },
      { name: 'threshold', label: 'Umbral de monto (CLP)', type: 'number', value: r?.threshold ?? 1000000, help: 'Se usa en reglas de monto, destinatario nuevo y horario.' },
      { name: 'count', label: 'N° de operaciones (velocidad)', type: 'number', value: r?.count ?? 3 },
      { name: 'windowMin', label: 'Ventana en minutos (velocidad)', type: 'number', value: r?.windowMin ?? 10 },
      { name: 'channel', label: 'Canal', type: 'select', options: [['todos', 'Todos'], ['transferencia', 'Transferencias'], ['qr', 'Pagos QR'], ['pago', 'Pago de cuentas']], value: r?.channel || 'todos' },
      { name: 'severity', label: 'Severidad', type: 'select', options: [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']], value: r?.severity || 'media' },
      { name: 'action', label: 'Acción', type: 'select', options: [['alertar', 'Solo alertar'], ['retener', 'Retener la operación y alertar']], value: r?.action || 'alertar' },
      { name: 'active', label: 'Regla activa', type: 'checkbox', value: r ? r.active : true },
    ],
  });
  if (!v) return;
  if (r) db.update('fraudRules', r.id, v); else db.insert('fraudRules', v);
  db.log('regla', `${staff.name} ${r ? 'editó' : 'creó'} la regla "${v.name}" (${cond(v)})`, staff.id);
  toast('Regla guardada', 'success');
}

async function simulate(ctx) {
  const customers = db.query('users', u => u.role === 'cliente' && u.kyc === 'aprobado');
  const v = await formModal({ title: 'Simular operación de cliente', fields: [
    { name: 'userId', label: 'Cliente', type: 'select', options: customers.slice(0, 40).map(u => [u.id, u.name]) },
    { name: 'type', label: 'Tipo', type: 'select', options: [['transferencia', 'Transferencia'], ['qr', 'Pago QR'], ['pago', 'Pago de cuentas']] },
    { name: 'amount', label: 'Monto (CLP)', type: 'number', required: true, value: 1200000 },
    { name: 'newRecipient', label: 'A un destinatario nuevo', type: 'checkbox', value: true },
  ], submit: 'Ejecutar' });
  if (!v) return;
  const acc = account(v.userId, 'vista');
  const tx = postTx(acc, { amount: -Math.abs(v.amount), desc: v.type === 'transferencia' ? 'Transferencia a destinatario de prueba' : v.type === 'qr' ? 'Pago QR comercio de prueba' : 'Pago de cuenta de prueba', category: v.type === 'transferencia' ? 'Transferencias' : 'Servicios', type: v.type, channel: 'simulación' });
  const res = evaluateFraud(tx, { newRecipient: v.newRecipient });
  toast(res.alerts.length ? `${res.alerts.length} alerta(s) generada(s)${res.held ? ' · operación retenida' : ''}` : 'La operación no gatilló reglas', res.alerts.length ? 'warning' : 'success');
  st.tab = 'alertas';
  ctx.refresh();
}

function caseView(el, { params, user: staff, canWrite, go }) {
  const a = db.get('alerts', params.id);
  if (!a) { el.innerHTML = '<div class="empty">Alerta no encontrada. <a href="#/fraude">Volver</a></div>'; return; }
  const t = db.get('transactions', a.txId), u = db.get('users', a.userId);
  const history = db.query('alerts', x => x.userId === a.userId && x.id !== a.id);
  const recent = db.query('transactions', x => x.userId === a.userId).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 6);
  const cards = db.query('cards', c => c.userId === a.userId && ['activa', 'congelada'].includes(c.status));
  const open = a.status !== 'cerrada';
  el.innerHTML = h`<div class="page-head"><div><a href="#/fraude" class="small">← Alertas</a><h1>Caso ${a.id.toUpperCase()}</h1><p class="muted" style="margin:4px 0 0">${a.ruleName} · ${dateTime(a.createdAt)}</p></div>
    <div class="row">${raw(badge(a.severity))}${raw(badge(a.status))}${!canWrite ? raw('<span class="badge badge-warning">Solo lectura</span>') : ''}</div></div>
  <div class="grid-2" style="align-items:start">
    <div class="stack">
      <section class="card"><h3>Operación</h3>${t ? raw(h`<dl class="kv"><dt>Monto</dt><dd class="amt">${money(t.amount)}</dd><dt>Detalle</dt><dd>${t.desc}</dd><dt>Tipo / canal</dt><dd>${t.type} · ${t.channel}</dd><dt>Contraparte</dt><dd>${t.counterpart || '—'}</dd><dt>Estado</dt><dd>${raw(badge(t.status))}</dd></dl><button class="btn btn-sm mt" data-tx>Ver transacción</button>`) : raw('<p class="muted">Transacción no disponible.</p>')}</section>
      <section class="card"><h3>Cliente</h3><dl class="kv"><dt>Nombre</dt><dd><a href="#/cuentas/${u?.id}">${u?.name}</a></dd><dt>RUT</dt><dd>${u?.rut}</dd><dt>Riesgo</dt><dd>${u?.risk}</dd><dt>Segmento</dt><dd>${u?.segment}</dd><dt>Alertas previas</dt><dd>${history.length} (${history.filter(x => x.resolution === 'Fraude confirmado').length} fraudes confirmados)</dd></dl>
        <h3 class="mt" style="font-size:16px">Últimos movimientos</h3><ul class="tx-list">${recent.map(x => h`<li><span class="tx-main"><b>${x.desc}</b><small>${date(x.date)} · ${x.type}</small></span><span class="amt ${x.amount > 0 ? 'pos' : ''}">${money(x.amount)}</span></li>`)}</ul></section>
    </div>
    <div class="stack">
      <section class="card stack"><h3 style="margin:0">Gestión del caso</h3>
        <dl class="kv"><dt>Score de riesgo</dt><dd><span class="badge badge-${a.score >= 75 ? 'danger' : a.score >= 50 ? 'warning' : 'info'}">${a.score}/100</span></dd><dt>Analista</dt><dd>${a.assignee ? userName(a.assignee) : 'Sin asignar'}</dd><dt>Resolución</dt><dd>${a.resolution || '—'}</dd></dl>
        ${canWrite && open ? raw(`<div class="row">${a.assignee !== staff.id ? '<button class="btn btn-sm" data-assign>Asignarme el caso</button>' : ''}${a.status === 'abierta' ? '<button class="btn btn-sm" data-investigate>Pasar a investigación</button>' : ''}</div>
          <div class="row"><button class="btn btn-primary btn-sm" data-fp>Cerrar: falso positivo</button><button class="btn btn-danger btn-sm" data-fraud>Confirmar fraude</button></div>`) : ''}
        ${canWrite && !open ? raw('<button class="btn btn-sm" data-reopen>Reabrir caso</button>') : ''}
      </section>
      <section class="card stack"><h3 style="margin:0">Bitácora del caso</h3>
        <div class="thread">${(a.notes || []).map(n => h`<div class="msg">${n.text}<small>${userName(n.by)} · ${dateTime(n.at)}</small></div>`)}${!(a.notes || []).length ? raw('<p class="muted small">Sin notas todavía.</p>') : ''}</div>
        ${canWrite ? raw('<div class="field"><label for="nn">Agregar nota</label><textarea class="textarea" id="nn" style="min-height:70px" placeholder="Ej: cliente confirma la operación por teléfono"></textarea></div><button class="btn btn-sm" data-note>Guardar nota</button>') : ''}
      </section>
    </div>
  </div>`;
  const note = text => ({ by: staff.id, at: new Date().toISOString(), text });
  const upd = (patch, msg, logMsg) => { db.update('alerts', a.id, x => ({ ...patch, notes: [...(x.notes || []), ...(patch.notes || [])] })); db.log('fraude', logMsg, staff.id); toast(msg, 'success'); };
  el.querySelector('[data-tx]')?.addEventListener('click', () => txDetail(t.id, staff, canWrite, go));
  if (!canWrite) return;
  el.querySelector('[data-assign]')?.addEventListener('click', () => upd({ assignee: staff.id, status: a.status === 'abierta' ? 'en investigación' : a.status, notes: [note('Caso asignado.')] }, 'Caso asignado', `${staff.name} tomó el caso ${a.id}`));
  el.querySelector('[data-investigate]')?.addEventListener('click', () => upd({ status: 'en investigación', assignee: a.assignee || staff.id, notes: [note('Caso pasa a investigación.')] }, 'Caso en investigación', `${staff.name} pasó a investigación el caso ${a.id}`));
  el.querySelector('[data-note]')?.addEventListener('click', () => { const text = el.querySelector('#nn').value.trim(); if (!text) return toast('Escribe una nota', 'warning'); upd({ notes: [note(text)] }, 'Nota guardada', `${staff.name} agregó una nota al caso ${a.id}`); });
  el.querySelector('[data-reopen]')?.addEventListener('click', () => upd({ status: 'en investigación', resolution: '', notes: [note('Caso reabierto.')] }, 'Caso reabierto', `${staff.name} reabrió el caso ${a.id}`));
  el.querySelector('[data-fp]')?.addEventListener('click', () => {
    if (t?.status === 'retenida') { db.update('transactions', t.id, { status: 'ok' }); notify(a.userId, 'Operación liberada', `Validamos tu operación por ${money(a.amount)}.`, 'seguridad'); }
    upd({ status: 'cerrada', resolution: 'Falso positivo', assignee: a.assignee || staff.id, notes: [note('Cerrado como falso positivo' + (t?.status === 'retenida' ? ' · operación liberada.' : '.'))] }, 'Caso cerrado', `${staff.name} cerró el caso ${a.id} como falso positivo`);
  });
  el.querySelector('[data-fraud]')?.addEventListener('click', async () => {
    const v = await formModal({ title: 'Confirmar fraude', fields: [{ name: 'reverse', label: 'Rechazar la operación y devolver el monto', type: 'checkbox', value: true }, { name: 'block', label: `Bloquear tarjetas activas del cliente (${cards.length})`, type: 'checkbox', value: true }, { name: 'riskUp', label: 'Subir nivel de riesgo del cliente a "alto"', type: 'checkbox', value: true }, { name: 'text', label: 'Conclusión', type: 'textarea', required: true }], submit: 'Confirmar fraude' });
    if (!v) return;
    if (v.reverse && t && !['rechazada', 'revertida'].includes(t.status)) {
      db.update('transactions', t.id, { status: 'rechazada' });
      db.update('accounts', t.accountId, x => ({ balance: x.type === 'credito' ? x.balance + t.amount : x.balance - t.amount }));
    }
    if (v.block) cards.forEach(c => db.update('cards', c.id, { status: 'bloqueada', blockReason: 'Fraude confirmado' }));
    if (v.riskUp) db.update('users', a.userId, { risk: 'alto' });
    notify(a.userId, 'Detectamos actividad sospechosa', `Por tu seguridad ${v.block ? 'bloqueamos tus tarjetas' : 'tomamos medidas'}${v.reverse ? ' y anulamos una operación' : ''}. Contáctanos desde Ayuda.`, 'seguridad');
    upd({ status: 'cerrada', resolution: 'Fraude confirmado', assignee: a.assignee || staff.id, notes: [note(`Fraude confirmado: ${v.text}`)] }, 'Fraude confirmado', `${staff.name} confirmó fraude en el caso ${a.id}${v.block ? ' · tarjetas bloqueadas' : ''}`);
  });
}
