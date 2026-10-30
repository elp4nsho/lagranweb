// Afiliados: códigos ?ref=, clics, ventas, comisiones, pagos y aprobación de postulaciones.
import { db, affiliateStats } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { escape, money, num, toast, confirm, formModal, date } from '../../../assets/core/ui.js';

const ST = { activo: ['Activo', 'success'], pausado: ['Pausado', 'warning'], pendiente: ['Pendiente', 'info'], rechazado: ['Rechazado', 'danger'] };
const link = a => `${location.origin}${location.pathname.replace(/admin\.html$/, '')}index.html?ref=${a.code}`;

async function edit(a, ctx) {
  const v = await formModal({ title: a ? `Editar ${a.name}` : 'Nuevo afiliado', fields: [
    { name: 'name', label: 'Nombre', value: a?.name || '', required: true },
    { name: 'email', label: 'Correo', type: 'email', value: a?.email || '', required: true },
    { name: 'channel', label: 'Canal', value: a?.channel || '' },
    { name: 'code', label: 'Código (?ref=)', value: a?.code || '', required: true },
    { name: 'commission', label: 'Comisión %', type: 'number', value: a?.commission ?? 10, required: true },
    { name: 'status', label: 'Estado', type: 'select', value: a?.status || 'activo', options: Object.entries(ST).map(([k, s]) => [k, s[0]]) }
  ] });
  if (!v) return;
  v.code = v.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (db.find('affiliates', x => x.code === v.code && x.id !== a?.id)) return toast('Código en uso', 'error');
  if (a) db.update('affiliates', a.id, v); else db.insert('affiliates', { ...v, clicks: 0 });
  db.log(a ? 'Afiliado editado' : 'Afiliado creado', `${v.name} (${v.code})`, ctx.user.id);
  toast('Afiliado guardado', 'success');
}

export default {
  id: 'afiliados', label: 'Afiliados', ico: '🤝', group: 'Marketing', roles: ['admin', 'marketing'],
  count: () => db.count('affiliates', a => a.status === 'pendiente'),
  render(view, ctx) {
    const rows = db.all('affiliates').map(a => ({ ...a, ...affiliateStats(a) }));
    const payouts = db.all('payouts').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    view.innerHTML = `${pageHead('Afiliados', 'Cada afiliado tiene un enlace <span class="mono">?ref=CÓDIGO</span>. Las compras que llegan por ese enlace (30 días) generan comisión.', '<button class="btn btn-primary" data-new>＋ Nuevo afiliado</button>')}
      <div class="kpis">
        ${kpi('Ventas por afiliados', money(rows.reduce((s, a) => s + a.revenue, 0)), { ico: '💰' })}
        ${kpi('Comisiones generadas', money(rows.reduce((s, a) => s + a.earned, 0)), { ico: '📈' })}
        ${kpi('Saldo por pagar', money(rows.reduce((s, a) => s + Math.max(0, a.balance), 0)), { ico: '⏳' })}
        ${kpi('Clics totales', num(rows.reduce((s, a) => s + a.clicks, 0)), { ico: '🔗' })}
      </div>
      <div class="card" id="tbl"></div>
      <div class="card"><div class="card-title"><h3>Pagos registrados</h3></div><div id="pay"></div></div>`;
    table(view.querySelector('#tbl'), {
      id: 'affiliates', rows, sort: { key: 'revenue', dir: -1 },
      search: a => `${a.name} ${a.code} ${a.email} ${a.channel}`,
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(ST).map(([k, s]) => [k, s[0]]) }],
      columns: [
        { key: 'name', label: 'Afiliado', render: a => `<b>${escape(a.name)}</b><br><small class="muted">${escape(a.channel || a.email)}</small>` },
        { key: 'code', label: 'Código', render: a => `<button class="btn btn-sm btn-ghost mono" data-copy="${a.id}" title="Copiar enlace">${escape(a.code)} ⧉</button>` },
        { key: 'commission', label: 'Comisión', render: a => `${a.commission}%` },
        { key: 'clicks', label: 'Clics', render: a => num(a.clicks) },
        { key: 'orders', label: 'Ventas', render: a => `${a.orders} <small class="muted">(${a.conv.toFixed(1).replace('.', ',')}%)</small>` },
        { key: 'revenue', label: 'Facturado', render: a => money(a.revenue) },
        { key: 'balance', label: 'Saldo', render: a => `<b>${money(a.balance)}</b>` },
        { key: 'status', label: 'Estado', render: a => badge(...ST[a.status]) },
        { key: 'act', label: '', sort: false, render: a => `<div class="t-actions">${a.status === 'pendiente' ? `<button class="btn btn-sm btn-primary" data-approve="${a.id}">Aprobar</button>` : ''}${a.balance > 0 ? `<button class="btn btn-sm" data-pay="${a.id}">Pagar</button>` : ''}<button class="btn btn-sm btn-ghost" data-edit="${a.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${a.id}" aria-label="Eliminar">✕</button></div>` }
      ],
      csv: { name: 'afiliados-aquilo.csv', map: a => ({ nombre: a.name, codigo: a.code, correo: a.email, comision: a.commission, clics: a.clicks, ventas: a.orders, facturado: a.revenue, comision_total: a.earned, pagado: a.paid, saldo: a.balance, estado: a.status, enlace: link(a) }) }
    });
    table(view.querySelector('#pay'), {
      id: 'payouts', rows: payouts, pageSize: 6,
      columns: [
        { key: 'createdAt', label: 'Fecha', render: p => escape(date(p.createdAt)) },
        { key: 'aff', label: 'Afiliado', value: p => db.get('affiliates', p.affiliateId)?.name || '', render: p => escape(db.get('affiliates', p.affiliateId)?.name || '—') },
        { key: 'period', label: 'Periodo' }, { key: 'amount', label: 'Monto', render: p => money(p.amount) }, { key: 'method', label: 'Método' },
        { key: 'status', label: 'Estado', render: p => badge(p.status === 'pagado' ? 'Pagado' : 'Pendiente', p.status === 'pagado' ? 'success' : 'warning') }
      ],
      csv: { name: 'pagos-afiliados.csv', map: p => ({ fecha: p.createdAt.slice(0, 10), afiliado: db.get('affiliates', p.affiliateId)?.name, periodo: p.period, monto: p.amount, metodo: p.method }) }
    });
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-new]')) edit(null, ctx);
      if (t.dataset.edit) edit(db.get('affiliates', t.dataset.edit), ctx);
      if (t.dataset.copy) { const a = db.get('affiliates', t.dataset.copy); try { await navigator.clipboard.writeText(link(a)); } catch (err) { /* sin permiso */ } toast(`Enlace copiado: ${link(a)}`, 'info', 4500); }
      if (t.dataset.approve) { const a = db.update('affiliates', t.dataset.approve, { status: 'activo' }); db.log('Afiliado aprobado', `${a.name} (${a.code})`, ctx.user.id); toast(`${a.name} aprobado`, 'success'); }
      if (t.dataset.pay) {
        const a = db.get('affiliates', t.dataset.pay), st = affiliateStats(a);
        const v = await formModal({ title: `Pagar a ${a.name}`, submit: 'Registrar pago', fields: [{ name: 'amount', label: `Monto (saldo ${money(st.balance)})`, type: 'number', value: st.balance, required: true }, { name: 'method', label: 'Método', type: 'select', options: ['Transferencia', 'PayPal', 'Gift card'] }] });
        if (!v || !(v.amount > 0)) return;
        db.insert('payouts', { affiliateId: a.id, amount: v.amount, method: v.method, period: new Date().toISOString().slice(0, 7), status: 'pagado' });
        db.log('Pago a afiliado', `${a.name}: ${money(v.amount)}`, ctx.user.id); toast('Pago registrado', 'success');
      }
      if (t.dataset.del) { const a = db.get('affiliates', t.dataset.del); if (await confirm(`¿Eliminar a ${a.name}? Sus ventas históricas se conservan.`, { danger: true, ok: 'Eliminar' })) { db.remove('affiliates', a.id); db.log('Afiliado eliminado', a.name, ctx.user.id); toast('Afiliado eliminado', 'success'); } }
    };
  }
};
