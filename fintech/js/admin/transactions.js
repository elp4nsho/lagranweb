// Explorador de transacciones con filtros avanzados, detalle, liberación y reversa.
import { db, userName } from '../data/db.js';
import { money, date, time, toast, modal, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { badge, notify, ACCOUNT_LABEL } from '../shared/bank.js';
import { pageHead, table, csv, selectFilter } from './kit.js';

const st = { type: '', status: '', channel: '', from: '', to: '', min: '' };

export function render(el, { user, canWrite, go }) {
  const all = db.all('transactions');
  const rows = all.filter(t => (!st.type || t.type === st.type) && (!st.status || t.status === st.status) && (!st.channel || t.channel === st.channel) &&
    (!st.from || t.date.slice(0, 10) >= st.from) && (!st.to || t.date.slice(0, 10) <= st.to) && (!st.min || Math.abs(t.amount) >= +st.min))
    .sort((a, b) => b.date.localeCompare(a.date)).map(t => ({ ...t, abs: Math.abs(t.amount), customer: userName(t.userId) }));
  const vol = rows.reduce((s, t) => s + t.abs, 0);
  const types = [...new Set(all.map(t => t.type))], channels = [...new Set(all.map(t => t.channel))];
  el.innerHTML = pageHead('Transacciones', `${rows.length} operaciones · volumen ${money(vol)}`, '<button class="btn btn-sm" data-csv>⬇ CSV</button>', !canWrite) +
    `<div class="card filters">${selectFilter('tt', 'Tipo', types, st.type)}${selectFilter('ts', 'Estado', [['ok', 'Aprobada'], ['retenida', 'Retenida'], ['rechazada', 'Rechazada'], ['revertida', 'Revertida']], st.status)}${selectFilter('tc', 'Canal', channels, st.channel)}
      <div class="field"><label for="tf">Desde</label><input class="input" type="date" id="tf" value="${st.from}"></div><div class="field"><label for="tto">Hasta</label><input class="input" type="date" id="tto" value="${st.to}"></div>
      <div class="field"><label for="tm">Monto mínimo</label><input class="input" type="number" id="tm" value="${st.min}" placeholder="0"></div>
      <button class="btn btn-ghost btn-sm" data-clear>Limpiar</button></div><div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    rows, pageSize: 12,
    search: t => `${t.desc} ${t.customer} ${t.id} ${t.counterpart || ''}`,
    columns: [
      { key: 'date', label: 'Fecha', render: t => h`${date(t.date, { day: '2-digit', month: 'short' })} <span class="muted small">${time(t.date)}</span>` },
      { key: 'customer', label: 'Cliente' },
      { key: 'desc', label: 'Detalle', render: t => h`<span style="display:inline-block;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom">${t.desc}</span>` },
      { key: 'type', label: 'Tipo' },
      { key: 'abs', label: 'Monto', render: t => h`<span class="amt ${t.amount > 0 ? 'pos' : ''}">${money(t.amount)}</span>` },
      { key: 'status', label: 'Estado', render: t => raw(badge(t.status)) },
    ],
    onRow: t => detail(t.id, user, canWrite, go),
  });
  [['#tt', 'type'], ['#ts', 'status'], ['#tc', 'channel'], ['#tf', 'from'], ['#tto', 'to'], ['#tm', 'min']].forEach(([s, k]) => el.querySelector(s).onchange = e => { st[k] = e.target.value; render(el, { user, canWrite, go }); });
  el.querySelector('[data-clear]').onclick = () => { Object.keys(st).forEach(k => st[k] = ''); render(el, { user, canWrite, go }); };
  el.querySelector('[data-csv]').onclick = () => csv('transacciones-condor.csv', rows.map(t => ({ id: t.id, fecha: t.date, cliente: t.customer, detalle: t.desc, categoria: t.category, tipo: t.type, canal: t.channel, monto: t.amount, estado: t.status })));
}

export function detail(id, staff, canWrite, go) {
  const t = db.get('transactions', id);
  const acc = db.get('accounts', t.accountId), u = db.get('users', t.userId);
  const alerts = db.query('alerts', a => a.txId === id);
  const m = modal({
    title: 'Detalle de transacción', size: 'lg',
    body: h`<div class="stack"><div class="row between"><span class="amt ${t.amount > 0 ? 'pos' : ''}" style="font-size:28px">${money(t.amount)}</span>${raw(badge(t.status))}</div>
      <dl class="kv"><dt>ID</dt><dd class="mono">${t.id}</dd><dt>Fecha</dt><dd>${date(t.date)} ${time(t.date)}</dd><dt>Cliente</dt><dd><a href="#/cuentas/${u?.id}" data-close>${u?.name || '—'}</a> · ${u?.rut || ''}</dd><dt>Cuenta</dt><dd>${acc ? ACCOUNT_LABEL[acc.type] + ' ' + acc.number : '—'}</dd><dt>Detalle</dt><dd>${t.desc}</dd><dt>Categoría</dt><dd>${t.category}</dd><dt>Tipo / canal</dt><dd>${t.type} · ${t.channel}</dd><dt>Contraparte</dt><dd>${t.counterpart || '—'}</dd></dl>
      ${alerts.length ? raw(h`<div class="notice warn">Alertas asociadas: ${alerts.map(a => h`<a href="#/fraude/${a.id}" data-close>${a.ruleName} (${a.status})</a> `)}</div>`) : ''}</div>`,
    foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${canWrite && t.status === 'retenida' ? '<button class="btn btn-danger" data-reject>Rechazar y devolver</button><button class="btn btn-primary" data-release>Liberar operación</button>' : ''}${canWrite && t.status === 'ok' && t.amount < 0 ? '<button class="btn btn-danger" data-reverse>Revertir</button>' : ''}`,
  });
  const refund = (newStatus, verb) => {
    m.close();
    db.update('transactions', id, { status: newStatus });
    if (acc) db.update('accounts', acc.id, a => ({ balance: a.type === 'credito' ? a.balance + t.amount : a.balance - t.amount }));
    notify(t.userId, `Operación ${verb}`, `Tu operación "${t.desc}" por ${money(Math.abs(t.amount))} fue ${verb} y el monto se devolvió a tu cuenta.`, 'seguridad');
    db.log('transaccion', `${staff.name} ${verb === 'revertida' ? 'revirtió' : 'rechazó'} la operación ${id} por ${money(Math.abs(t.amount))}`, staff.id);
    toast(`Operación ${verb}`, 'info');
  };
  m.el.querySelector('[data-release]')?.addEventListener('click', () => {
    m.close();
    db.update('transactions', id, { status: 'ok' });
    notify(t.userId, 'Operación liberada', `Validamos tu operación por ${money(Math.abs(t.amount))}. ¡Gracias por tu paciencia!`, 'seguridad');
    db.log('transaccion', `${staff.name} liberó la operación retenida ${id}`, staff.id);
    toast('Operación liberada', 'success');
  });
  m.el.querySelector('[data-reject]')?.addEventListener('click', () => refund('rechazada', 'rechazada'));
  m.el.querySelector('[data-reverse]')?.addEventListener('click', async () => { if (await confirm('Se devolverá el monto al cliente.', { title: 'Revertir transacción', ok: 'Revertir', danger: true })) refund('revertida', 'revertida'); });
  void go;
}
