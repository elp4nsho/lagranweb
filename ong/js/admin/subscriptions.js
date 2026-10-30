// Suscripciones mensuales: estado, ingresos recurrentes, fallos de cobro y ejecución simulada de cargos.
import { db, SUB_ST, campaignName, nextChargeDate, nextReceipt } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { escape, money, num, date, toast, confirm, formModal, barChart } from '../../../assets/core/ui.js';

export default {
  id: 'suscripciones', label: 'Suscripciones', ico: '🔁', group: 'Recaudación', roles: ['admin', 'contador'],
  render(view, ctx) {
    const donors = Object.fromEntries(db.all('donors').map(d => [d.id, d]));
    const rows = db.all('subscriptions').map(s => ({ ...s, donor: donors[s.donorId]?.name || '—', email: donors[s.donorId]?.email || '' }));
    const active = rows.filter(s => s.status === 'activa');
    const mrr = active.reduce((s, x) => s + x.amount, 0);
    const months = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); const k = d.toISOString().slice(0, 7); months.push({ label: d.toLocaleDateString('es-CL', { month: 'short' }), value: db.query('donations', x => x.type === 'mensual' && x.status === 'aprobada' && x.createdAt.startsWith(k)).reduce((s, x) => s + x.amount, 0) }); }
    const churn = rows.filter(s => s.status === 'cancelada' && Date.now() - new Date(s.endedAt) < 90 * 864e5).length;
    const due = active.filter(s => s.nextCharge && s.nextCharge <= new Date().toISOString().slice(0, 10));
    view.innerHTML = `${pageHead('Suscripciones mensuales', 'Socios que donan cada mes con tarjeta.', `<button class="btn btn-primary" data-run>▶ Ejecutar cobros del día (${due.length})</button>`)}
      <div class="kpis">
        ${kpi('Ingreso mensual recurrente', money(mrr), { ico: '🔁' })}
        ${kpi('Socios activos', num(active.length), { ico: '💚', sub: `${rows.filter(s => s.status === 'pausada').length} pausados` })}
        ${kpi('Aporte promedio', money(active.length ? mrr / active.length : 0), { ico: '🧮' })}
        ${kpi('Bajas (90 días)', num(churn), { ico: '📉', sub: `${rows.reduce((s, x) => s + (x.failed || 0), 0)} cobros fallidos históricos` })}
      </div>
      <div class="card"><div class="card-title"><h3>Recaudación mensual recurrente</h3></div>${barChart(months, { format: money })}</div>
      <div class="card" id="tbl"></div>`;
    table(view.querySelector('#tbl'), {
      id: 'subs', rows, sort: { key: 'amount', dir: -1 },
      search: s => `${s.donor} ${s.email} ${campaignName(s.campaignId)}`,
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(SUB_ST).map(([k, v]) => [k, v[0]]) }, { key: 'campaignId', label: 'Destino', options: [['__g', 'Fondo general'], ...db.all('campaigns').map(c => [c.id, c.title])], test: (s, v) => v === '__g' ? !s.campaignId : s.campaignId === v }],
      columns: [
        { key: 'donor', label: 'Socio', render: s => `<a href="#/donantes/${s.donorId}">${escape(s.donor)}</a><br><small class="muted">${escape(s.email)}</small>` },
        { key: 'amount', label: 'Monto', render: s => `<b>${money(s.amount)}</b>/mes` },
        { key: 'campaignId', label: 'Destino', value: s => campaignName(s.campaignId), render: s => escape(campaignName(s.campaignId)) },
        { key: 'startedAt', label: 'Desde', render: s => escape(date(s.startedAt)) },
        { key: 'nextCharge', label: 'Próximo cargo', render: s => s.nextCharge ? `${escape(date(s.nextCharge + 'T12:00'))}<br><small class="muted">día ${s.chargeDay} · •••• ${escape(s.card)}</small>` : '—' },
        { key: 'status', label: 'Estado', render: s => badge(...SUB_ST[s.status]) + (s.failed ? ` <span class="badge badge-danger plain" title="Cobros fallidos">${s.failed}✕</span>` : '') },
        { key: 'act', label: '', sort: false, render: s => s.status === 'cancelada' ? '' : `<div class="t-actions"><button class="btn btn-sm" data-amt="${s.id}">Monto</button>${s.status === 'activa' ? `<button class="btn btn-sm btn-ghost" data-pause="${s.id}">Pausar</button>` : `<button class="btn btn-sm btn-ghost" data-resume="${s.id}">Reanudar</button>`}<button class="btn btn-sm btn-ghost" data-cancel="${s.id}">Cancelar</button></div>` }
      ],
      csv: { name: 'suscripciones.csv', map: s => ({ socio: s.donor, correo: s.email, monto: s.amount, destino: campaignName(s.campaignId), desde: s.startedAt.slice(0, 10), proximo: s.nextCharge, estado: s.status, fallidos: s.failed }) }
    });
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      const s = db.get('subscriptions', t.dataset.amt || t.dataset.pause || t.dataset.resume || t.dataset.cancel || '');
      if (t.dataset.amt) { const v = await formModal({ title: 'Cambiar monto', fields: [{ name: 'amount', label: 'Monto mensual', type: 'number', value: s.amount, required: true }] }); if (v && v.amount >= 1000) { db.update('subscriptions', s.id, { amount: v.amount }); db.log('Suscripción modificada', `${money(s.amount)} → ${money(v.amount)}`, ctx.user.id); toast('Monto actualizado', 'success'); } }
      if (t.dataset.pause) { db.update('subscriptions', s.id, { status: 'pausada', nextCharge: '' }); db.log('Suscripción pausada', donorsName(s), ctx.user.id); toast('Suscripción pausada', 'warning'); }
      if (t.dataset.resume) { db.update('subscriptions', s.id, { status: 'activa', nextCharge: nextChargeDate(s.chargeDay) }); db.log('Suscripción reanudada', donorsName(s), ctx.user.id); toast('Suscripción reanudada', 'success'); }
      if (t.dataset.cancel && await confirm('¿Cancelar esta suscripción?', { danger: true, ok: 'Cancelar suscripción' })) { db.update('subscriptions', s.id, { status: 'cancelada', endedAt: new Date().toISOString(), nextCharge: '' }); db.log('Suscripción cancelada', donorsName(s), ctx.user.id); toast('Suscripción cancelada', 'info'); }
      if (t.matches('[data-run]')) {
        if (!due.length) return toast('No hay cobros pendientes para hoy', 'info');
        let okN = 0, bad = 0;
        due.forEach(x => {
          const d = db.get('donors', x.donorId), fail = Math.random() < .08;
          db.insert('donations', { donorId: x.donorId, donorName: d?.name || '—', email: d?.email || '', amount: x.amount, campaignId: x.campaignId, type: 'mensual', subscriptionId: x.id, method: 'tarjeta', status: fail ? 'rechazada' : 'aprobada', anonymous: false, message: '', receiptNo: fail ? '' : nextReceipt() });
          db.update('subscriptions', x.id, { nextCharge: nextChargeDate(x.chargeDay), failed: (x.failed || 0) + (fail ? 1 : 0) });
          fail ? bad++ : okN++;
        });
        db.log('Cobros mensuales', `${okN} aprobados, ${bad} rechazados`, ctx.user.id);
        toast(`Cobros ejecutados: ${okN} aprobados, ${bad} rechazados`, bad ? 'warning' : 'success');
      }
    };
    function donorsName(s) { return donors[s.donorId]?.name || ''; }
  }
};
