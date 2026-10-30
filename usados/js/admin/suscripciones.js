// Suscripciones a planes de mantención (MRR, altas y bajas) y CRUD de planes publicados en el sitio.
import { money, escape, date, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { SUB_STATES } from '../data/catalog.js';
import { statusBadge } from '../shared/domain.js';
import { fmtDay, DAY } from '../shared/util.js';
import { mm } from './dashboard.js';

async function editPlan(p, ctx) {
  const v = await formModal({ title: p ? `Editar ${p.name}` : 'Nuevo plan', fields: [{ name: 'name', label: 'Nombre', required: true, value: p?.name }, { name: 'price', label: 'Precio mensual (CLP)', type: 'number', required: true, value: p?.price },
    { name: 'maint', label: 'Mantenciones al año (99 = ilimitadas)', type: 'number', value: p?.maint ?? 1 }, { name: 'includes', label: 'Incluye (una línea por beneficio)', type: 'textarea', value: (p?.includes || []).join('\n') },
    { name: 'tone', label: 'Color', type: 'select', options: ['primary', 'accent', 'info', 'success', 'warning'], value: p?.tone || 'primary' }, { name: 'featured', label: 'Marcar como más elegido', type: 'checkbox', value: p?.featured }, { name: 'active', label: 'Visible en el sitio', type: 'checkbox', value: p ? p.active : true }] });
  if (!v) return;
  if (!(v.price > 0)) { toast('Precio inválido', 'warning'); return; }
  const data = { ...v, includes: v.includes.split('\n').map(x => x.trim()).filter(Boolean), roadside: true };
  p ? db.update('plans', p.id, data) : db.insert('plans', { ...data, order: db.count('plans') + 1 });
  db.log('suscripciones', `Plan ${p ? 'editado' : 'creado'}: ${v.name} (${money(v.price)}/mes)`, ctx.user.id); toast('Plan guardado en el sitio', 'success');
}
async function editSub(s, ctx) {
  const v = await formModal({ title: `${s.name} · ${s.car}`, fields: [{ name: 'planId', label: 'Plan', type: 'select', options: db.all('plans').map(p => [p.id, `${p.name} (${money(p.price)})`]), value: s.planId }, { name: 'status', label: 'Estado', type: 'select', options: Object.entries(SUB_STATES).map(([k, x]) => [k, x.label]), value: s.status }] });
  if (!v) return;
  const p = db.get('plans', v.planId);
  db.update('subscriptions', s.id, { ...v, price: p.price, ...(v.status === 'cancelada' && s.status !== 'cancelada' ? { canceledAt: new Date().toISOString() } : {}) });
  db.log('suscripciones', `${s.name}: ${p.name} · ${SUB_STATES[v.status].label}`, ctx.user.id); toast('Suscripción actualizada', 'success');
}
export default {
  id: 'suscripciones', label: 'Planes y suscripciones', icon: '🛡️', group: 'Posventa', roles: ['admin', 'gerente', 'taller'],
  watch: ['subscriptions', 'plans'],
  render(el, ctx) {
    const view = ctx.params.sub || 'subs', subs = db.all('subscriptions'), act = subs.filter(s => s.status === 'activa');
    const churn = subs.filter(s => s.canceledAt && Date.now() - new Date(s.canceledAt) < 30 * DAY).length;
    el.innerHTML = `${pageHead('Planes y suscripciones', 'Planes de mantención mensual para cualquier auto')}
      <div class="kpi-grid">${kpi('MRR', mm(act.reduce((a, s) => a + s.price, 0)))}${kpi('Suscripciones activas', String(act.length))}${kpi('Altas 30 días', String(subs.filter(s => Date.now() - new Date(s.startedAt) < 30 * DAY).length))}${kpi('Bajas 30 días', String(churn), '', !churn)}</div>
      <div class="tabs"><a class="tab ${view === 'subs' ? 'active' : ''}" href="#/suscripciones/subs">Suscripciones</a><a class="tab ${view === 'planes' ? 'active' : ''}" href="#/suscripciones/planes">Planes</a></div><div data-t></div>`;
    const t = el.querySelector('[data-t]');
    if (view === 'planes') {
      t.innerHTML = `<div class="row" style="margin-bottom:12px"><button class="btn btn-sm btn-primary" data-new>+ Nuevo plan</button></div><div class="grid-3">${db.all('plans').sort((a, b) => a.order - b.order).map(p => `<div class="card plan-card tone-${p.tone}"><div class="row between"><h3 style="margin:0">${escape(p.name)}</h3>${p.active ? '<span class="badge badge-success">Visible</span>' : '<span class="badge">Oculto</span>'}</div><b class="price">${money(p.price)}/mes</b><ul class="small">${p.includes.map(i => `<li>${escape(i)}</li>`).join('')}</ul><small class="muted">${act.filter(s => s.planId === p.id).length} suscriptores activos</small><div class="row"><button class="btn btn-sm" data-edit="${p.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${p.id}">Eliminar</button></div></div>`).join('')}</div>`;
      t.addEventListener('click', async e => {
        if (e.target.closest('[data-new]')) editPlan(null, ctx);
        const ed = e.target.closest('[data-edit]'); if (ed) editPlan(db.get('plans', ed.dataset.edit), ctx);
        const d = e.target.closest('[data-del]'); if (d) { if (act.some(s => s.planId === d.dataset.del)) { toast('El plan tiene suscriptores activos: ocúltalo en vez de eliminarlo', 'warning'); return; } if (await confirm('¿Eliminar plan?', { danger: true, ok: 'Eliminar' })) db.remove('plans', d.dataset.del); }
      });
      return;
    }
    return smartTable(t, {
      rows: () => db.all('subscriptions').map(s => ({ ...s, plan: db.get('plans', s.planId)?.name || '' })).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(SUB_STATES).map(([k, x]) => [k, x.label]) }, { key: 'planId', label: 'Plan', options: db.all('plans').map(p => [p.id, p.name]) }],
      search: r => `${r.name} ${r.email} ${r.car} ${r.plate}`,
      columns: [{ key: 'name', label: 'Cliente', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.email)}</small>` }, { key: 'car', label: 'Auto', render: r => `${escape(r.car)}<small class="muted d-block mono">${escape(r.plate)}</small>` }, { key: 'plan', label: 'Plan' },
        { key: 'price', label: 'Mensual', render: r => money(r.price) }, { key: 'startedAt', label: 'Desde', render: r => date(r.startedAt) }, { key: 'nextBilling', label: 'Próximo cobro', render: r => r.status === 'activa' ? fmtDay(r.nextBilling) : '—' }, { key: 'status', label: 'Estado', render: r => statusBadge(SUB_STATES, r.status) }],
      onRow: r => editSub(db.get('subscriptions', r.id), ctx),
      csv: { name: 'suscripciones', map: r => ({ cliente: r.name, correo: r.email, auto: r.car, patente: r.plate, plan: r.plan, mensual: r.price, desde: r.startedAt.slice(0, 10), estado: SUB_STATES[r.status].label }) }
    });
  }
};
