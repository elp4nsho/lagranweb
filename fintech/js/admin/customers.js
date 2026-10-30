// Clientes y cuentas: listado con filtros y ficha 360° del cliente.
import { db } from '../data/db.js';
import { money, date, ago, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { accountsOf, badge, postTx, notify, ACCOUNT_LABEL, CAT_ICON } from '../shared/bank.js';
import { pageHead, table, csv, selectFilter } from './kit.js';

const st = { segment: '', kyc: '', risk: '', status: '' };

export function render(el, ctx) {
  if (ctx.params.id) return detail(el, ctx);
  const q = ctx.query.q || '';
  const customers = db.query('users', u => u.role === 'cliente');
  const rows = customers.filter(u => (!st.segment || u.segment === st.segment) && (!st.kyc || u.kyc === st.kyc) && (!st.risk || u.risk === st.risk) && (!st.status || (st.status === 'activo') === (u.active !== false)))
    .map(u => { const accs = accountsOf(u.id); return { ...u, total: accs.filter(a => a.type !== 'credito').reduce((s, a) => s + a.balance, 0), debt: accs.filter(a => a.type === 'credito').reduce((s, a) => s + a.balance, 0), nAcc: accs.length }; })
    .sort((a, b) => b.total - a.total);
  el.innerHTML = pageHead('Clientes y cuentas', `${customers.length} clientes registrados`, '<button class="btn btn-sm" data-csv>⬇ CSV</button>', !ctx.canWrite) +
    `<div class="card filters">${selectFilter('fs', 'Segmento', ['Esencial', 'Plus', 'Black'], st.segment)}${selectFilter('fk', 'KYC', [['aprobado', 'Aprobado'], ['pendiente', 'Pendiente'], ['rechazado', 'Rechazado']], st.kyc)}${selectFilter('fr', 'Riesgo', ['bajo', 'medio', 'alto'], st.risk)}${selectFilter('fa', 'Estado', [['activo', 'Activo'], ['inactivo', 'Desactivado']], st.status)}</div><div data-t></div>`;
  const t = table(el.querySelector('[data-t]'), {
    rows,
    search: u => `${u.name} ${u.rut} ${u.email} ${u.comuna}`,
    columns: [
      { key: 'name', label: 'Cliente', render: u => h`<span class="row" style="gap:10px"><span class="avatar" style="--av:${u.color}">${u.name.split(' ').slice(0, 2).map(w => w[0]).join('')}</span><span><b>${u.name}</b><br><span class="small muted">${u.rut}</span></span></span>` },
      { key: 'segment', label: 'Segmento' },
      { key: 'total', label: 'Saldos', render: u => h`<span class="amt">${money(u.total)}</span>` },
      { key: 'debt', label: 'Deuda TC', render: u => h`<span class="amt">${money(u.debt)}</span>` },
      { key: 'risk', label: 'Riesgo', render: u => raw(`<span class="badge badge-${u.risk === 'alto' ? 'danger' : u.risk === 'medio' ? 'warning' : 'success'}">${u.risk}</span>`) },
      { key: 'kyc', label: 'KYC', render: u => raw(badge(u.kyc)) },
      { key: 'active', label: 'Estado', render: u => raw(u.active === false ? '<span class="badge badge-danger">Desactivado</span>' : '<span class="badge badge-success">Activo</span>') },
    ],
    onRow: u => ctx.go('/cuentas/' + u.id),
  });
  if (q) { const inp = el.querySelector('[data-q]'); inp.value = q; inp.dispatchEvent(new Event('input')); }
  void t;
  [['#fs', 'segment'], ['#fk', 'kyc'], ['#fr', 'risk'], ['#fa', 'status']].forEach(([s, k]) => el.querySelector(s).onchange = e => { st[k] = e.target.value; render(el, ctx); });
  el.querySelector('[data-csv]').onclick = () => csv('clientes-condor.csv', rows.map(u => ({ nombre: u.name, rut: u.rut, correo: u.email, telefono: u.phone, comuna: u.comuna, segmento: u.segment, riesgo: u.risk, kyc: u.kyc, saldos: u.total, deuda_tc: u.debt, alta: date(u.createdAt) })));
}

function detail(el, { params, user: staff, canWrite, go }) {
  const u = db.get('users', params.id);
  if (!u) { el.innerHTML = '<div class="empty">Cliente no encontrado. <a href="#/cuentas">Volver</a></div>'; return; }
  const accs = accountsOf(u.id);
  const cards = db.query('cards', c => c.userId === u.id);
  const loans = db.query('loans', l => l.userId === u.id);
  const txs = db.query('transactions', t => t.userId === u.id).sort((a, b) => b.date.localeCompare(a.date));
  const alerts = db.query('alerts', a => a.userId === u.id);
  const tickets = db.query('tickets', t => t.userId === u.id);
  el.innerHTML = h`<div class="page-head"><div><a href="#/cuentas" class="small">← Clientes</a><h1>${u.name}</h1><p class="muted" style="margin:4px 0 0">${u.rut} · ${u.email} · ${u.phone}</p></div>
    <div class="row">${!canWrite ? raw('<span class="badge badge-warning">Solo lectura</span>') : raw(`<button class="btn btn-sm" data-edit>Editar perfil</button><button class="btn btn-sm" data-adjust>Ajuste manual</button><button class="btn btn-sm ${u.active === false ? 'btn-primary' : 'btn-danger'}" data-toggle>${u.active === false ? 'Reactivar cliente' : 'Desactivar cliente'}</button>`)}</div></div>
  <div class="kpis">
    ${accs.map(a => h`<div class="card"><div class="stat"><span class="label">${ACCOUNT_LABEL[a.type]} · ${a.number}</span><span class="value">${money(a.type === 'credito' ? a.limit - a.balance : a.balance)}</span><span class="small muted">${a.type === 'credito' ? `disponible de ${money(a.limit)}` : 'saldo'} · ${raw(badge(a.status))}</span></div>
      ${canWrite && a.status !== 'en revisión' ? raw(`<button class="btn btn-sm btn-ghost mt" data-acc="${a.id}">${a.status === 'congelada' ? 'Descongelar cuenta' : 'Congelar cuenta'}</button>`) : ''}</div>`)}
  </div>
  <div class="grid-2" style="align-items:start">
    <section class="card"><h3>Perfil</h3><dl class="kv"><dt>Segmento</dt><dd>${u.segment}</dd><dt>Riesgo</dt><dd>${u.risk}</dd><dt>KYC</dt><dd>${raw(badge(u.kyc))}</dd><dt>Renta</dt><dd>${money(u.income)}</dd><dt>Ocupación</dt><dd>${u.job}</dd><dt>Comuna</dt><dd>${u.comuna}</dd><dt>Cliente desde</dt><dd>${date(u.createdAt)}</dd></dl></section>
    <section class="card"><h3>Productos</h3>
      <ul class="tx-list">${cards.map(c => h`<li><span class="tx-ic">💳</span><span class="tx-main"><b>${c.brand} ·${c.last4}</b><small>${c.kind} · vence ${c.exp}</small></span>${raw(badge(c.status))}</li>`)}
      ${loans.map(l => h`<li class="clickable" data-loan="${l.id}"><span class="tx-ic">🏦</span><span class="tx-main"><b>Crédito ${money(l.amount)}</b><small>${l.term} meses · ${l.purpose}</small></span>${raw(badge(l.status))}</li>`)}</ul>
      <p class="small muted">${alerts.length} alerta(s) de fraude · ${tickets.length} caso(s) de soporte</p></section>
  </div>
  <section class="card"><div class="row between"><h3 style="margin:0">Movimientos</h3><button class="btn btn-sm" data-csv>⬇ CSV</button></div><div data-tx class="mt"></div></section>`;

  table(el.querySelector('[data-tx]'), {
    rows: txs, pageSize: 8, search: t => `${t.desc} ${t.category} ${t.type} ${t.status}`,
    columns: [
      { key: 'date', label: 'Fecha', render: t => date(t.date) },
      { key: 'desc', label: 'Detalle', render: t => h`${CAT_ICON[t.category] || ''} ${t.desc}` },
      { key: 'type', label: 'Tipo' },
      { key: 'amount', label: 'Monto', render: t => h`<span class="amt ${t.amount > 0 ? 'pos' : ''}">${money(t.amount)}</span>` },
      { key: 'status', label: 'Estado', render: t => raw(badge(t.status)) },
    ],
  });
  el.querySelectorAll('[data-loan]').forEach(li => li.onclick = () => go('/creditos/' + li.dataset.loan));
  el.querySelector('[data-csv]').onclick = () => csv(`movimientos-${u.rut}.csv`, txs.map(t => ({ fecha: date(t.date), detalle: t.desc, categoria: t.category, tipo: t.type, monto: t.amount, estado: t.status })));
  if (!canWrite) return;
  el.querySelector('[data-edit]').onclick = async () => {
    const v = await formModal({ title: 'Editar perfil del cliente', fields: [{ name: 'name', label: 'Nombre', required: true, value: u.name }, { name: 'email', label: 'Correo', type: 'email', required: true, value: u.email }, { name: 'phone', label: 'Celular', value: u.phone }, { name: 'segment', label: 'Segmento', type: 'select', options: ['Esencial', 'Plus', 'Black'], value: u.segment }, { name: 'risk', label: 'Nivel de riesgo', type: 'select', options: ['bajo', 'medio', 'alto'], value: u.risk }, { name: 'income', label: 'Renta (CLP)', type: 'number', value: u.income }] });
    if (!v) return;
    db.update('users', u.id, v); db.log('cliente', `${staff.name} editó el perfil de ${u.name}`, staff.id); toast('Perfil actualizado', 'success');
  };
  el.querySelector('[data-adjust]').onclick = async () => {
    const v = await formModal({ title: 'Ajuste manual de saldo', fields: [{ name: 'acc', label: 'Cuenta', type: 'select', options: accs.filter(a => a.type !== 'credito').map(a => [a.id, `${ACCOUNT_LABEL[a.type]} ${a.number}`]) }, { name: 'kind', label: 'Tipo', type: 'select', options: [['1', 'Abono (devolución, bonificación)'], ['-1', 'Cargo (corrección)']] }, { name: 'amount', label: 'Monto (CLP)', type: 'number', required: true }, { name: 'reason', label: 'Motivo', required: true }] });
    if (!v) return;
    if (!(v.amount > 0)) return toast('Monto inválido', 'warning');
    const amount = +v.kind * Math.round(v.amount);
    postTx(db.get('accounts', v.acc), { amount, desc: `Ajuste: ${v.reason}`, category: amount > 0 ? 'Ingresos' : 'Servicios', type: 'ajuste', channel: 'back-office' });
    notify(u.id, amount > 0 ? 'Recibiste un abono' : 'Se aplicó un cargo', `${v.reason}: ${money(Math.abs(amount))}`, 'abono');
    db.log('ajuste', `${staff.name} aplicó ${amount > 0 ? 'abono' : 'cargo'} de ${money(Math.abs(amount))} a ${u.name}: ${v.reason}`, staff.id);
    toast('Ajuste aplicado', 'success');
  };
  el.querySelector('[data-toggle]').onclick = async () => {
    const off = u.active !== false;
    if (off && !(await confirm(`${u.name} no podrá ingresar a la app.`, { title: 'Desactivar cliente', ok: 'Desactivar', danger: true }))) return;
    db.update('users', u.id, { active: !off }); db.log('cliente', `${staff.name} ${off ? 'desactivó' : 'reactivó'} a ${u.name}`, staff.id); toast(off ? 'Cliente desactivado' : 'Cliente reactivado', 'info');
  };
  el.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => {
    const a = db.get('accounts', b.dataset.acc); const fr = a.status === 'congelada';
    db.update('accounts', a.id, { status: fr ? 'activa' : 'congelada' });
    notify(u.id, fr ? 'Cuenta reactivada' : 'Cuenta congelada', fr ? `Tu ${ACCOUNT_LABEL[a.type]} vuelve a estar activa.` : `Congelamos tu ${ACCOUNT_LABEL[a.type]} de forma preventiva. Contáctanos.`, 'seguridad');
    db.log('cuenta', `${staff.name} ${fr ? 'descongeló' : 'congeló'} ${ACCOUNT_LABEL[a.type]} ${a.number} de ${u.name}`, staff.id);
    toast(fr ? 'Cuenta descongelada' : 'Cuenta congelada', 'info');
  });
  void ago;
}
