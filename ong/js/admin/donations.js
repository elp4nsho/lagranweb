// Libro de donaciones: filtros, totales, registro manual (transferencias), reembolsos, comprobantes y CSV.
import { db, DONATION_ST, campaignName, upsertDonor, nextReceipt } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { openReceipt } from '../shared/receipt.js';
import { escape, money, num, dateTime, toast, confirm, formModal } from '../../../assets/core/ui.js';

export default {
  id: 'donaciones', label: 'Donaciones', ico: '🧾', group: 'Recaudación', roles: ['admin', 'contador'],
  render(view, ctx) {
    const rows = db.all('donations');
    const ok = rows.filter(d => d.status === 'aprobada');
    const m = new Date().toISOString().slice(0, 7);
    view.innerHTML = `${pageHead('Libro de donaciones', `${num(rows.length)} movimientos registrados`, '<button class="btn btn-primary" data-new>＋ Registrar donación</button>')}
      <div class="kpis">
        ${kpi('Total aprobado', money(ok.reduce((s, d) => s + d.amount, 0)), { ico: '💚' })}
        ${kpi('Este mes', money(ok.filter(d => d.createdAt.startsWith(m)).reduce((s, d) => s + d.amount, 0)), { ico: '📅' })}
        ${kpi('Donación promedio', money(ok.length ? ok.reduce((s, d) => s + d.amount, 0) / ok.length : 0), { ico: '🧮' })}
        ${kpi('Rechazadas / reembolsadas', num(rows.length - ok.length), { ico: '⚠️' })}
      </div>
      <div class="card"><div id="tbl"></div><p class="small muted" id="sumF" style="margin:10px 0 0"></p></div>`;
    let tbl = null;
    tbl = table(view.querySelector('#tbl'), {
      id: 'donations', rows, pageSize: 12, sort: { key: 'createdAt', dir: -1 },
      search: d => `${d.donorName} ${d.email} ${d.receiptNo} ${campaignName(d.campaignId)}`,
      filters: [
        { key: 'status', label: 'Estado', options: Object.entries(DONATION_ST).map(([k, v]) => [k, v[0]]) },
        { key: 'type', label: 'Tipo', options: [['unica', 'Única'], ['mensual', 'Mensual']] },
        { key: 'campaignId', label: 'Destino', options: [['', 'Fondo general'], ...db.all('campaigns').map(c => [c.id, c.title])].filter(x => x[0]).concat([['__general', 'Fondo general']]), test: (d, v) => v === '__general' ? !d.campaignId : d.campaignId === v },
        { key: 'method', label: 'Medio', options: [['tarjeta', 'Tarjeta'], ['PagoSur', 'PagoSur'], ['transferencia', 'Transferencia'], ['efectivo', 'Efectivo']] },
        { key: 'period', label: 'Periodo', options: [['7', '7 días'], ['30', '30 días'], ['90', '90 días'], ['365', '12 meses']], test: (d, v) => Date.now() - new Date(d.createdAt) < +v * 864e5 }
      ],
      columns: [
        { key: 'createdAt', label: 'Fecha', render: d => `<span class="small">${escape(dateTime(d.createdAt))}</span>` },
        { key: 'donorName', label: 'Donante', render: d => `${d.donorId ? `<a href="#/donantes/${d.donorId}">${escape(d.donorName)}</a>` : escape(d.donorName)}${d.anonymous ? ' <span class="badge plain">anónimo</span>' : ''}<br><small class="muted">${escape(d.email)}</small>` },
        { key: 'campaignId', label: 'Destino', value: d => campaignName(d.campaignId), render: d => escape(campaignName(d.campaignId)) },
        { key: 'amount', label: 'Monto', render: d => `<b>${money(d.amount)}</b>` },
        { key: 'type', label: 'Tipo', render: d => d.type === 'mensual' ? badge('Mensual', 'primary') : badge('Única', '') },
        { key: 'method', label: 'Medio' },
        { key: 'status', label: 'Estado', render: d => badge(...DONATION_ST[d.status]) },
        { key: 'act', label: '', sort: false, render: d => `<div class="t-actions">${d.receiptNo ? `<button class="btn btn-sm" data-rc="${d.id}" title="${escape(d.receiptNo)}">Recibo</button>` : ''}${d.status === 'aprobada' ? `<button class="btn btn-sm btn-ghost" data-refund="${d.id}">Reembolsar</button>` : ''}</div>` }
      ],
      afterRender: () => { const l = tbl ? tbl.list() : rows; const okk = l.filter(d => d.status === 'aprobada'); const el = view.querySelector('#sumF'); if (el) el.textContent = `Filtro actual: ${num(l.length)} movimientos · ${money(okk.reduce((s, d) => s + d.amount, 0))} aprobados`; },
      csv: { name: 'libro-donaciones.csv', map: d => ({ fecha: d.createdAt.slice(0, 10), recibo: d.receiptNo, donante: d.donorName, correo: d.email, destino: campaignName(d.campaignId), monto: d.amount, tipo: d.type, medio: d.method, estado: d.status, anonimo: d.anonymous ? 'sí' : 'no', mensaje: d.message }) }
    });
    tbl.update(rows);
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.rc) openReceipt(t.dataset.rc);
      if (t.dataset.refund) {
        const d = db.get('donations', t.dataset.refund);
        if (!(await confirm(`¿Reembolsar ${money(d.amount)} a ${d.donorName}? El monto se descuenta de la campaña.`, { danger: true, ok: 'Reembolsar' }))) return;
        db.update('donations', d.id, { status: 'reembolsada' }); db.log('Donación reembolsada', `${d.receiptNo} · ${d.donorName} · ${money(d.amount)}`, ctx.user.id); toast('Reembolso registrado', 'warning');
      }
      if (t.matches('[data-new]')) {
        const v = await formModal({ title: 'Registrar donación manual', fields: [
          { name: 'name', label: 'Nombre del donante', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true },
          { name: 'amount', label: 'Monto (CLP)', type: 'number', required: true },
          { name: 'campaignId', label: 'Destino', type: 'select', options: [['', 'Fondo general'], ...db.query('campaigns', c => c.status !== 'borrador').map(c => [c.id, c.title])] },
          { name: 'method', label: 'Medio', type: 'select', options: [['transferencia', 'Transferencia'], ['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta (POS)']] },
          { name: 'message', label: 'Nota / mensaje' }, { name: 'anonymous', label: 'Anónimo en el muro', type: 'checkbox' }
        ] });
        if (!v) return;
        if (!(v.amount >= 1000) || !/^\S+@\S+\.\S+$/.test(v.email)) return toast('Revisa monto (mín. $1.000) y correo', 'warning');
        const donor = upsertDonor({ name: v.name, email: v.email });
        const d = db.insert('donations', { donorId: donor.id, donorName: v.name, email: v.email, amount: v.amount, campaignId: v.campaignId, type: 'unica', subscriptionId: '', method: v.method, status: 'aprobada', anonymous: v.anonymous, message: v.message, receiptNo: nextReceipt() });
        db.log('Donación registrada', `${d.receiptNo} · ${v.name} · ${money(v.amount)} (${v.method})`, ctx.user.id); toast(`Donación registrada (${d.receiptNo})`, 'success');
      }
    };
  }
};
