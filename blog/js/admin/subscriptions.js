// Suscripciones e ingresos: MRR, altas/bajas, planes editables y listado de suscriptores.
import { escape, toast, confirm, money, date, num, pct, barChart, lineChart, donutChart } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f, badge, kpi } from '../shared/admin-kit.js';

const SUB = { active: ['Activa', 'success'], past_due: ['Pago pendiente', 'warning'], cancelled: ['Cancelada', 'danger'] };
let tab = 'subs';

function editPlan(ctx, p = {}) {
  formDialog({
    title: p.id ? `Editar plan ${p.name}` : 'Nuevo plan',
    body: `<div class="grid-2">${f.text('name', 'Nombre', p.name, { required: true })}${f.text('price', 'Precio (CLP)', p.price || 4990, { type: 'number', required: true })}</div>
      <div class="grid-2">${f.select('period', 'Período', [['mes', 'Mensual'], ['año', 'Anual']], p.period || 'mes')}${f.text('order', 'Orden', p.order || db.count('plans') + 1, { type: 'number' })}</div>
      ${f.area('features', 'Beneficios (uno por línea)', (p.features || []).join('\n'), { rows: 4 })}${f.sw('highlight', 'Destacar como “Más elegido”', p.highlight)}${f.sw('active', 'Disponible para nuevas suscripciones', p.id ? p.active : true)}`,
    onSubmit: v => {
      const data = { ...v, features: v.features.split('\n').map(s => s.trim()).filter(Boolean) };
      if (data.highlight) db.query('plans', x => x.highlight && x.id !== p.id).forEach(x => db.update('plans', x.id, { highlight: false }));
      if (p.id) db.update('plans', p.id, data); else db.insert('plans', data);
      db.log('planes', `${p.id ? 'Editó' : 'Creó'} el plan ${v.name}`, ctx.user.id); toast('Plan guardado · visible en /planes', 'success');
    }
  });
}

export default {
  id: 'subscriptions', path: '/suscripciones', label: 'Suscripciones e ingresos', icon: '＄', group: 'Negocio', perm: 'subscriptions',
  render(el, ctx) {
    const subs = db.all('subscriptions'), pays = db.all('payments'), plans = db.all('plans');
    const userOf = id => db.get('users', id);
    const active = subs.filter(s => s.status !== 'cancelled');
    const mrr = active.reduce((s, x) => s + (db.get('plans', x.planId)?.period === 'año' ? x.amount / 12 : x.amount), 0);
    const months = [...Array(10)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 9 + i); return d; });
    const inMonth = (iso, d) => { if (!iso) return false; const x = new Date(iso); return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear(); };
    const revenue = months.map(d => ({ label: d.toLocaleDateString('es-CL', { month: 'short' }), value: pays.filter(p => inMonth(p.createdAt, d)).reduce((s, p) => s + p.amount, 0) }));
    const growth = months.map(d => ({ label: d.toLocaleDateString('es-CL', { month: 'short' }), value: subs.filter(s => new Date(s.startedAt) <= new Date(d.getFullYear(), d.getMonth() + 1, 0) && (!s.cancelledAt || new Date(s.cancelledAt) > new Date(d.getFullYear(), d.getMonth() + 1, 0))).length }));
    const cur = revenue.at(-1).value, prev = revenue.at(-2).value;
    const churn = subs.filter(s => inMonth(s.cancelledAt, months.at(-2))).length / Math.max(1, growth.at(-3).value) * 100;
    el.innerHTML = `${pageHead('Suscripciones e ingresos', 'Muro de pago y planes digitales.', '<a class="btn" href="index.html#/planes" target="_blank" rel="noopener">↗ Ver página de planes</a>')}
      <div class="kpis">${kpi('MRR', money(mrr), null, `ARR ${money(mrr * 12)}`)}${kpi('Suscripciones activas', num(active.length), null, `${subs.filter(s => s.status === 'past_due').length} con pago pendiente`)}${kpi('Ingresos del mes', money(cur), prev ? (cur - prev) / prev * 100 : 0)}${kpi('Churn mensual', pct(churn, 1), null, `ARPU ${money(mrr / Math.max(1, active.length))}`)}</div>
      <div class="dash-grid"><div class="card"><h3>Ingresos por mes</h3>${barChart(revenue, { format: money })}</div><div class="card"><h3>Mix de planes</h3>${donutChart(plans.map(p => ({ label: p.name, value: active.filter(s => s.planId === p.id).length })), { label: String(active.length) })}</div></div>
      <div class="card"><h3>Suscriptores activos en el tiempo</h3>${lineChart(growth, { format: num })}</div>
      <div class="tabs"><button class="tab ${tab === 'subs' ? 'active' : ''}" data-tab="subs">Suscriptores</button><button class="tab ${tab === 'plans' ? 'active' : ''}" data-tab="plans">Planes</button><button class="tab ${tab === 'pays' ? 'active' : ''}" data-tab="pays">Pagos</button></div><div data-t></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; this.render(el, ctx); });
    const t = el.querySelector('[data-t]');
    if (tab === 'subs') table(t, {
      id: 'subs', rows: subs.map(s => ({ ...s, _name: userOf(s.userId)?.name || '—', _email: userOf(s.userId)?.email || '', _plan: db.get('plans', s.planId)?.name || '' })), sort: 'startedAt', dir: -1, pageSize: 12,
      search: s => `${s._name} ${s._email}`,
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(SUB).map(([k, [l]]) => [k, l]) }, { key: 'planId', label: 'Plan', options: plans.map(p => [p.id, p.name]) }],
      columns: [
        { key: '_name', label: 'Suscriptor', render: s => `<b>${escape(s._name)}</b><br><small class="muted">${escape(s._email)}</small>` },
        { key: '_plan', label: 'Plan' }, { key: 'amount', label: 'Monto', render: s => money(s.amount) },
        { key: 'startedAt', label: 'Desde', render: s => `<span class="small">${date(s.startedAt)}</span>` },
        { key: 'renewsAt', label: 'Renueva', render: s => `<span class="small">${s.status === 'cancelled' ? '—' : date(s.renewsAt)}</span>` },
        { key: 'status', label: 'Estado', render: s => badge(s.status, SUB) }
      ],
      actions: s => (s.status !== 'cancelled' ? actBtn('cancel', 'Cancelar', '⏹') : actBtn('reactivate', 'Reactivar', '▶')) + (s.status === 'past_due' ? actBtn('retry', 'Reintentar cobro', '↻') : ''),
      onAction: async (a, s) => {
        if (a === 'cancel' && await confirm(`¿Cancelar la suscripción de ${s._name}?`, { danger: true, ok: 'Cancelar suscripción' })) { db.update('subscriptions', s.id, { status: 'cancelled', cancelledAt: new Date().toISOString() }); db.log('suscripción', `Canceló la suscripción de ${s._name}`, ctx.user.id); toast('Suscripción cancelada', 'success'); }
        if (a === 'reactivate') { db.update('subscriptions', s.id, { status: 'active', cancelledAt: null, renewsAt: new Date(Date.now() + 30 * 864e5).toISOString() }); toast('Suscripción reactivada', 'success'); }
        if (a === 'retry') { db.update('subscriptions', s.id, { status: 'active' }); db.insert('payments', { subscriptionId: s.id, userId: s.userId, planId: s.planId, amount: s.amount, status: 'paid' }); toast('Cobro aprobado (simulado)', 'success'); }
      },
      csv: { name: 'suscripciones', map: s => ({ nombre: s._name, correo: s._email, plan: s._plan, monto: s.amount, desde: date(s.startedAt), estado: SUB[s.status][0] }) }
    });
    if (tab === 'plans') {
      t.innerHTML = `<div class="row" style="justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-newplan>＋ Nuevo plan</button></div><div class="grid-3">${plans.sort((a, b) => a.order - b.order).map(p => `<div class="card stack" style="gap:8px"><div class="row between"><h3 style="margin:0">${escape(p.name)}</h3>${p.highlight ? '<span class="badge badge-primary">Destacado</span>' : ''}</div><div class="stat"><span class="value">${money(p.price)}</span><span class="small muted">por ${escape(p.period)} · ${active.filter(s => s.planId === p.id).length} activos</span></div><ul class="small" style="margin:0;padding-left:18px">${p.features.map(x => `<li>${escape(x)}</li>`).join('')}</ul><div class="row between">${badge(p.active ? 'on' : 'off', { on: ['Disponible', 'success'], off: ['Oculto', ''] })}<button class="btn btn-sm" data-plan="${p.id}">✎ Editar</button></div></div>`).join('')}</div>`;
      t.querySelector('[data-newplan]').onclick = () => editPlan(ctx);
      t.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => editPlan(ctx, db.get('plans', b.dataset.plan)));
    }
    if (tab === 'pays') table(t, {
      id: 'pays', rows: pays.map(p => ({ ...p, _name: userOf(p.userId)?.name || '—', _plan: db.get('plans', p.planId)?.name || '' })), sort: 'createdAt', dir: -1, pageSize: 15, search: p => p._name,
      filters: [{ key: 'planId', label: 'Plan', options: plans.map(p => [p.id, p.name]) }],
      columns: [{ key: 'createdAt', label: 'Fecha', render: p => date(p.createdAt) }, { key: '_name', label: 'Suscriptor' }, { key: '_plan', label: 'Plan' }, { key: 'amount', label: 'Monto', render: p => money(p.amount) }, { key: 'status', label: 'Estado', render: () => badge('paid', { paid: ['Pagado', 'success'] }) }],
      csv: { name: 'pagos', map: p => ({ fecha: date(p.createdAt), suscriptor: p._name, plan: p._plan, monto: p.amount }) }
    });
  }
};
