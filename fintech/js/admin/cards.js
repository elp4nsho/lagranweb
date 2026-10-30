// Gestión de tarjetas: bloquear, desbloquear, reemplazar y ajustar límites.
import { db, userName } from '../data/db.js';
import { money, date, toast, modal, formModal, donutChart } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { badge, maskCard, notify } from '../shared/bank.js';
import { pageHead, table, csv, selectFilter } from './kit.js';

const st = { status: '', kind: '', brand: '' };

export function render(el, ctx) {
  const all = db.all('cards').map(c => ({ ...c, customer: userName(c.userId) }));
  const rows = all.filter(c => (!st.status || c.status === st.status) && (!st.kind || c.kind === st.kind) && (!st.brand || c.brand === st.brand));
  const byStatus = {}; all.forEach(c => byStatus[c.status] = (byStatus[c.status] || 0) + 1);
  el.innerHTML = pageHead('Tarjetas', `${all.length} tarjetas emitidas`, '<button class="btn btn-sm" data-csv>⬇ CSV</button>', !ctx.canWrite) + h`
  <div class="grid-2" style="align-items:start">
    <div class="kpis">${['activa', 'congelada', 'bloqueada', 'inactiva'].map(s => h`<div class="card"><div class="stat"><span class="label">${s[0].toUpperCase() + s.slice(1)}s</span><span class="value">${byStatus[s] || 0}</span></div></div>`)}</div>
    <section class="card"><h3>Por estado</h3>${raw(donutChart(Object.entries(byStatus).map(([label, value]) => ({ label, value })), { size: 130, label: String(all.length) }))}</section>
  </div>
  <div class="card filters">${raw(selectFilter('cs', 'Estado', ['activa', 'congelada', 'bloqueada', 'inactiva', 'reemplazada'], st.status))}${raw(selectFilter('ck', 'Tipo', ['virtual', 'física'], st.kind))}${raw(selectFilter('cb', 'Producto', [...new Set(all.map(c => c.brand))], st.brand))}</div>
  <div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    rows, search: c => `${c.customer} ${c.last4} ${c.brand}`,
    columns: [
      { key: 'last4', label: 'Tarjeta', render: c => h`<b class="mono">${maskCard(c.number)}</b><br><span class="small muted">${c.brand} · ${c.kind}</span>` },
      { key: 'customer', label: 'Titular' },
      { key: 'exp', label: 'Vence' },
      { key: 'limitDaily', label: 'Límite diario', render: c => money(c.limitDaily) },
      { key: 'online', label: 'Online', render: c => c.online ? 'Sí' : 'No' },
      { key: 'status', label: 'Estado', render: c => raw(badge(c.status)) },
    ],
    onRow: c => manage(c.id, ctx),
  });
  [['#cs', 'status'], ['#ck', 'kind'], ['#cb', 'brand']].forEach(([s, k]) => el.querySelector(s).onchange = e => { st[k] = e.target.value; render(el, ctx); });
  el.querySelector('[data-csv]').onclick = () => csv('tarjetas-condor.csv', rows.map(c => ({ tarjeta: '****' + c.last4, titular: c.customer, producto: c.brand, tipo: c.kind, vence: c.exp, estado: c.status, limite_diario: c.limitDaily, online: c.online ? 'sí' : 'no' })));
}

function manage(id, { user: staff, canWrite }) {
  const c = db.get('cards', id);
  const canAct = canWrite && c.status !== 'reemplazada';
  const m = modal({
    title: `${c.brand} ·${c.last4}`,
    body: h`<div class="stack"><div class="bank-card mini-card ${c.status === 'congelada' ? 'frozen' : ''}"><div class="row between"><span class="chip-ic"></span><b>${c.kind}</b></div><span class="num">${maskCard(c.number)}</span><div class="meta"><span>${userName(c.userId)}</span><span>${c.exp}</span></div></div>
      <dl class="kv"><dt>Estado</dt><dd>${raw(badge(c.status))}</dd><dt>Emitida</dt><dd>${date(c.createdAt)}</dd><dt>Compras online</dt><dd>${c.online ? 'Habilitadas' : 'Deshabilitadas'}</dd><dt>Internacional</dt><dd>${c.international ? 'Sí' : 'No'}</dd><dt>Límite diario / online</dt><dd>${money(c.limitDaily)} / ${money(c.limitOnline)}</dd>${c.blockReason ? raw(`<dt>Motivo bloqueo</dt><dd>${c.blockReason}</dd>`) : ''}</dl></div>`,
    foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${canAct ? `<button class="btn" data-limits>Límites</button>${c.status === 'bloqueada' ? '<button class="btn btn-primary" data-unblock>Desbloquear</button>' : '<button class="btn btn-danger" data-block>Bloquear</button>'}<button class="btn" data-replace>Reemplazar</button>` : ''}`,
  });
  m.el.querySelector('[data-block]')?.addEventListener('click', async () => {
    m.close();
    const v = await formModal({ title: 'Bloquear tarjeta', fields: [{ name: 'reason', label: 'Motivo', type: 'select', options: ['Solicitud del cliente', 'Sospecha de fraude', 'Robo o extravío', 'Mora'] }] });
    if (!v) return;
    db.update('cards', id, { status: 'bloqueada', blockReason: v.reason });
    notify(c.userId, 'Tarjeta bloqueada', `Bloqueamos tu tarjeta ·${c.last4} (${v.reason}).`, 'seguridad');
    db.log('tarjeta', `${staff.name} bloqueó la tarjeta ·${c.last4} de ${userName(c.userId)}: ${v.reason}`, staff.id);
    toast('Tarjeta bloqueada', 'info');
  });
  m.el.querySelector('[data-unblock]')?.addEventListener('click', () => {
    m.close();
    db.update('cards', id, { status: 'activa', blockReason: '' });
    notify(c.userId, 'Tarjeta desbloqueada', `Tu tarjeta ·${c.last4} vuelve a estar activa.`, 'seguridad');
    db.log('tarjeta', `${staff.name} desbloqueó la tarjeta ·${c.last4}`, staff.id);
    toast('Tarjeta desbloqueada', 'success');
  });
  m.el.querySelector('[data-replace]')?.addEventListener('click', () => {
    m.close();
    const n = `4${Math.floor(100 + Math.random() * 899)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)}`;
    const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = c;
    db.update('cards', id, { status: 'reemplazada' });
    db.insert('cards', { ...rest, number: n, last4: n.slice(-4), cvv: String(Math.floor(100 + Math.random() * 899)), status: 'activa', blockReason: '', replacedFrom: id, replaceRequested: c.kind !== 'virtual' });
    notify(c.userId, 'Emitimos una nueva tarjeta', `Reemplazamos tu tarjeta ·${c.last4}. La nueva termina en ${n.slice(-4)}.`, 'seguridad');
    db.log('tarjeta', `${staff.name} reemplazó la tarjeta ·${c.last4} → ·${n.slice(-4)}`, staff.id);
    toast('Tarjeta reemplazada', 'success');
  });
  m.el.querySelector('[data-limits]')?.addEventListener('click', async () => {
    m.close();
    const v = await formModal({ title: 'Límites de la tarjeta', fields: [{ name: 'limitDaily', label: 'Límite diario (CLP)', type: 'number', value: c.limitDaily }, { name: 'limitOnline', label: 'Límite online (CLP)', type: 'number', value: c.limitOnline }, { name: 'online', label: 'Compras online habilitadas', type: 'checkbox', value: c.online }, { name: 'international', label: 'Uso internacional', type: 'checkbox', value: c.international }] });
    if (!v) return;
    db.update('cards', id, v); db.log('tarjeta', `${staff.name} cambió límites de la tarjeta ·${c.last4}`, staff.id); toast('Límites actualizados', 'success');
  });
}
