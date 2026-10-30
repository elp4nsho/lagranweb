// Planes prepagados: CRUD de planes (servicios incluidos y precio por segmento) y planes vendidos.
import { escape, money, toast, confirm, formModal, date } from '../../../assets/core/ui.js';
import { pageHead, smartTable, tabs } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { SEGMENTS } from '../data/catalog.js';
import { services, serviceById, segName, priceFor, today } from '../shared/domain.js';

let tab = 'planes';
const REF = { city: { segment: 'city', oil: '10w40', liters: 3.4 }, sedan: { segment: 'sedan', oil: '5w30', liters: 3.8 }, suv: { segment: 'suv', oil: '5w30', liters: 4.6 }, pickup: { segment: 'pickup', oil: '15w40d', liters: 7 }, premium: { segment: 'premium', oil: '5w40e', liters: 5.6 } };

async function editPlan(p, ctx) {
  const svcs = services(true);
  const v = await formModal({ title: p ? p.name : 'Nuevo plan', size: 'lg', fields: [
    { name: 'name', label: 'Nombre', required: true, value: p?.name }, { name: 'icon', label: 'Ícono', value: p?.icon || '🛢️' }, { name: 'tag', label: 'Bajada', value: p?.tag },
    { name: 'months', label: 'Vigencia (meses)', type: 'number', required: true, value: p?.months || 12 },
    ...svcs.map(s => ({ name: 'q_' + s.id, label: `Cantidad · ${s.name}`, type: 'number', value: p?.includes.find(i => i.s === s.id)?.q || 0 })),
    { name: 'discount', label: 'Descuento sobre precio lista (%) para calcular precios', type: 'number', value: p?.savePct ?? 20, help: 'Se recalculan los precios de los 5 segmentos.' },
    { name: 'popular', label: 'Destacar como "Más elegido"', type: 'checkbox', value: p?.popular }, { name: 'active', label: 'A la venta', type: 'checkbox', value: p ? p.active : true }] });
  if (!v) return;
  const includes = svcs.filter(s => v['q_' + s.id] > 0).map(s => ({ s: s.id, q: v['q_' + s.id] }));
  if (!includes.length) { toast('El plan debe incluir al menos un servicio', 'warning'); return; }
  const f = 1 - v.discount / 100;
  const prices = Object.fromEntries(SEGMENTS.map(g => [g.id, Math.round(includes.reduce((s, i) => s + i.q * priceFor(i.s, REF[g.id]), 0) * f / 1000) * 1000 - 10]));
  const data = { name: v.name, icon: v.icon, tag: v.tag, months: v.months, includes, prices, savePct: v.discount, popular: v.popular, active: v.active, desc: `${includes.map(i => `${i.q}× ${serviceById(i.s).name.toLowerCase()}`).join(', ')}. Válido ${v.months} meses.` };
  p ? db.update('plans', p.id, data) : db.insert('plans', { ...data, order: db.count('plans') });
  db.log('planes', `Plan ${p ? 'editado' : 'creado'}: ${v.name}`, ctx.user.id); toast('Plan guardado', 'success');
}

async function editPurchase(pp, ctx) {
  const v = await formModal({ title: `${pp.code} · ${pp.planName}`, fields: [...Object.entries(pp.remaining).map(([s, n]) => ({ name: 'r_' + s, label: `Saldo · ${serviceById(s)?.name || s}`, type: 'number', value: n })), { name: 'expiresAt', label: 'Vence', type: 'date', value: pp.expiresAt }, { name: 'status', label: 'Estado', type: 'select', options: [['activo', 'Activo'], ['agotado', 'Agotado'], ['anulado', 'Anulado']], value: pp.status }] });
  if (!v) return;
  db.update('planPurchases', pp.id, { remaining: Object.fromEntries(Object.keys(pp.remaining).map(s => [s, Math.max(0, v['r_' + s])])), expiresAt: v.expiresAt, status: v.status });
  db.log('planes', `${pp.code} ajustado`, ctx.user.id); toast('Plan actualizado', 'success');
}

export default {
  id: 'planes', label: 'Planes prepagados', icon: '🎟️', group: 'Comercial', roles: ['admin', 'jefe'], watch: ['plans', 'planPurchases'],
  render(el, ctx) {
    const edit = ctx.user.role === 'admin';
    const pps = db.all('planPurchases');
    el.innerHTML = `${pageHead('Planes prepagados', `${pps.filter(p => p.status === 'activo').length} planes activos · ${money(pps.reduce((s, p) => s + p.paid, 0))} vendidos`, edit && tab === 'planes' ? '<button class="btn btn-primary btn-sm" data-new>+ Plan</button>' : '')}${tabs([['planes', 'Planes'], ['ventas', 'Planes vendidos']], tab)}<div data-list></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); });
    el.querySelector('[data-new]')?.addEventListener('click', () => editPlan(null, ctx));
    const box = el.querySelector('[data-list]');
    if (tab === 'planes') {
      box.innerHTML = `<div class="grid-2">${db.all('plans').sort((a, b) => a.order - b.order).map(p => `<div class="card stack" style="gap:8px"><div class="row between"><b>${escape(p.icon)} ${escape(p.name)}</b><span class="row nowrap" style="gap:6px">${p.popular ? '<span class="badge badge-primary">Destacado</span>' : ''}<span class="badge ${p.active ? 'badge-success' : 'badge-danger'}">${p.active ? 'A la venta' : 'Pausado'}</span></span></div>
        <small class="muted">${escape(p.desc)}</small>
        <div class="table-wrap"><table class="table"><tbody><tr>${SEGMENTS.map(g => `<td><small class="muted d-block">${escape(g.name)}</small><b>${money(p.prices[g.id])}</b></td>`).join('')}</tr></tbody></table></div>
        <div class="row between small"><span>${pps.filter(x => x.planId === p.id).length} vendidos · ahorro ${p.savePct}%</span>${edit ? `<span class="row nowrap" style="gap:6px"><button class="btn btn-sm" data-edit="${p.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${p.id}" aria-label="Eliminar">🗑</button></span>` : ''}</div></div>`).join('')}</div>`;
      box.onclick = async e => {
        const ed = e.target.closest('[data-edit]'); if (ed) editPlan(db.get('plans', ed.dataset.edit), ctx);
        const dl = e.target.closest('[data-del]'); if (dl) { const p = db.get('plans', dl.dataset.del); if (await confirm(`¿Eliminar ${p.name}? Los planes ya vendidos se mantienen.`, { danger: true, ok: 'Eliminar' })) { db.remove('plans', p.id); db.log('planes', `Plan eliminado: ${p.name}`, ctx.user.id); } }
      };
      return {};
    }
    const T = today();
    return smartTable(box, {
      rows: () => db.all('planPurchases').map(p => ({ ...p, cust: db.get('customers', p.customerId)?.name || '—', left: Object.values(p.remaining).reduce((a, b) => a + b, 0), st: p.status === 'activo' && p.expiresAt < T ? 'vencido' : p.status })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      filters: [{ key: 'planId', label: 'Plan', options: db.all('plans').map(p => [p.id, p.name]) }, { key: 'st', label: 'Estado', options: [['activo', 'Activo'], ['agotado', 'Agotado'], ['vencido', 'Vencido'], ['anulado', 'Anulado']] }, { key: 'segment', label: 'Segmento', options: SEGMENTS.map(s => [s.id, s.name]) }],
      search: r => `${r.code} ${r.cust} ${r.plate}`,
      columns: [{ key: 'code', label: 'Código', render: r => `<code>${escape(r.code)}</code>` }, { key: 'createdAt', label: 'Compra', render: r => date(r.createdAt) }, { key: 'cust', label: 'Cliente', render: r => `<b>${escape(r.cust)}</b><small class="muted d-block">${escape(r.plate)} · ${escape(segName(r.segment))}</small>` }, { key: 'planName', label: 'Plan' }, { key: 'paid', label: 'Pagado', render: r => money(r.paid) }, { key: 'left', label: 'Saldo', render: r => `${r.left} servicios` }, { key: 'expiresAt', label: 'Vence' }, { key: 'st', label: 'Estado', render: r => `<span class="badge ${r.st === 'activo' ? 'badge-success' : r.st === 'vencido' || r.st === 'anulado' ? 'badge-danger' : ''}">${escape(r.st)}</span>` }],
      onRow: r => editPurchase(db.get('planPurchases', r.id), ctx),
      csv: { name: 'planes-vendidos', map: r => ({ codigo: r.code, cliente: r.cust, patente: r.plate, plan: r.planName, pagado: r.paid, saldo: r.left, vence: r.expiresAt, estado: r.st }) }
    });
  }
};
