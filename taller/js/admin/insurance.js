// Aseguradoras (convenios) y siniestros: estado, liquidador, deducible y montos aprobados.
import { escape, money, toast, formModal, modal, date, dateTime } from '../../../assets/core/ui.js';
import { pageHead, smartTable, tabs } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { totals, insurerName, customerById, settings } from '../shared/domain.js';
import { claimBadge, CLAIM_ST, plate } from '../shared/bits.js';

let tab = 'siniestros';
async function editInsurer(i, ctx) {
  const v = await formModal({ title: i ? i.name : 'Nueva aseguradora', fields: [{ name: 'name', label: 'Nombre', required: true, value: i?.name }, { name: 'contact', label: 'Correo siniestros', type: 'email', required: true, value: i?.contact }, { name: 'phone', label: 'Teléfono', value: i?.phone }, { name: 'deductible', label: 'Deducible típico (UF)', type: 'number', value: i?.deductible ?? 5 }, { name: 'laborCap', label: 'Tope tarifa hora convenida', type: 'number', value: i?.laborCap ?? 34000 }, { name: 'payDays', label: 'Días de pago', type: 'number', value: i?.payDays ?? 30 }, { name: 'active', label: 'Convenio activo', type: 'checkbox', value: i ? i.active : true }] });
  if (!v) return;
  i ? db.update('insurers', i.id, v) : db.insert('insurers', v);
  db.log('seguro', `Aseguradora ${i ? 'editada' : 'creada'}: ${v.name}`, ctx.user.id); toast('Guardado', 'success');
}
export async function newClaim(ctx, otId) {
  const o = db.get('ots', otId);
  const v = await formModal({ title: `Denunciar siniestro · ${o.code}`, fields: [{ name: 'insurerId', label: 'Aseguradora', type: 'select', options: db.all('insurers').map(i => [i.id, i.name]) }, { name: 'number', label: 'N° de siniestro', required: true, value: 'SIN-2026-' + Math.floor(10000 + Math.random() * 89999) }, { name: 'policy', label: 'Póliza', value: 'POL-' }, { name: 'event', label: 'Descripción del evento', required: true }, { name: 'deductibleUF', label: 'Deducible (UF)', type: 'number', value: 5 }] });
  if (!v) return;
  const c = db.insert('claims', { ...v, otId, otCode: o.code, plate: o.plate, customerId: o.customerId, deductible: Math.round(v.deductibleUF * settings().uf), amount: totals(o).total, approved: 0, status: 'denunciado', liquidator: 'Por asignar', eventAt: new Date().toISOString().slice(0, 10), notes: [] });
  db.update('ots', otId, { claimId: c.id, type: 'siniestro' });
  db.log('seguro', `${o.code} · siniestro ${v.number} con ${insurerName(v.insurerId)}`, ctx.user.id); toast('Siniestro registrado', 'success');
}

export default {
  id: 'seguros', label: 'Seguros y siniestros', icon: '🛡️', group: 'Comercial', roles: ['admin', 'jefe', 'asesor'], watch: ['claims', 'insurers', 'ots'],
  render(el, ctx) {
    const cs = db.all('claims');
    el.innerHTML = `${pageHead('Seguros y siniestros', `${cs.filter(c => c.status === 'en-evaluacion').length} en evaluación · ${money(cs.filter(c => c.status === 'aprobado').reduce((s, c) => s + c.approved, 0))} aprobado por cobrar`, `${tab === 'aseguradoras' ? '<button class="btn btn-primary btn-sm" data-new>+ Aseguradora</button>' : '<button class="btn btn-primary btn-sm" data-newc>+ Siniestro</button>'}`)}${tabs([['siniestros', 'Siniestros'], ['aseguradoras', 'Aseguradoras en convenio']], tab)}<div data-list></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); });
    el.querySelector('[data-new]')?.addEventListener('click', () => editInsurer(null, ctx));
    el.querySelector('[data-newc]')?.addEventListener('click', async () => { const ots = db.query('ots', o => !o.claimId && !['entregado', 'cancelada'].includes(o.status)); const v = await formModal({ title: '¿Para qué OT?', fields: [{ name: 'ot', label: 'OT abierta', type: 'select', options: ots.map(o => [o.id, `${o.code} · ${o.plate} · ${o.car}`]) }] }); if (v) newClaim(ctx, v.ot); });
    const box = el.querySelector('[data-list]');
    if (tab === 'aseguradoras') { box.innerHTML = `<div class="grid-3">${db.all('insurers').map(i => { const mine = cs.filter(c => c.insurerId === i.id); return `<div class="card stack" style="gap:6px"><div class="row between"><b>🛡️ ${escape(i.name)}</b><span class="badge ${i.active ? 'badge-success' : 'badge-danger'}">${i.active ? 'Convenio activo' : 'Inactivo'}</span></div><small class="muted">${escape(i.contact)} · ${escape(i.phone)}</small><small>Deducible típico ${i.deductible} UF · tarifa hora tope ${money(i.laborCap)} · paga a ${i.payDays} días</small><small>${mine.length} siniestros · ${money(mine.reduce((s, c) => s + c.approved, 0))} aprobados</small><button class="btn btn-sm" data-ei="${i.id}">Editar</button></div>`; }).join('')}</div>`; box.onclick = e => { const b = e.target.closest('[data-ei]'); if (b) editInsurer(db.get('insurers', b.dataset.ei), ctx); }; return {}; }
    return smartTable(box, {
      rows: () => db.all('claims').map(c => ({ ...c, ins: insurerName(c.insurerId), cust: customerById(c.customerId)?.name || '' })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(CLAIM_ST).map(([k, v]) => [k, v.label]) }, { key: 'insurerId', label: 'Aseguradora', options: db.all('insurers').map(i => [i.id, i.name]) }],
      search: r => `${r.number} ${r.plate} ${r.cust} ${r.otCode}`,
      columns: [{ key: 'number', label: 'Siniestro', render: r => `<code>${escape(r.number)}</code><small class="muted d-block">${escape(r.ins)}</small>` }, { key: 'otCode', label: 'OT', render: r => `<a href="#/ots/${r.otId}" class="no-row">${escape(r.otCode)}</a> ${plate(r.plate)}` }, { key: 'cust', label: 'Asegurado' }, { key: 'liquidator', label: 'Liquidador' }, { key: 'amount', label: 'Presupuesto', render: r => money(r.amount) }, { key: 'approved', label: 'Aprobado', render: r => r.approved ? money(r.approved) : '—' }, { key: 'deductible', label: 'Deducible', render: r => `${r.deductibleUF} UF` }, { key: 'status', label: 'Estado', render: r => claimBadge(r.status) }],
      onRow: r => modal({ title: r.number, size: 'lg', body: `<div class="stack"><div class="row between">${claimBadge(r.status)}<small class="muted">${escape(r.ins)} · póliza ${escape(r.policy)}</small></div><p>${escape(r.event)} · ocurrido ${escape(r.eventAt)}</p><div class="grid-3 small detail-grid"><div><span class="label">Presupuesto taller</span><b>${money(r.amount)}</b></div><div><span class="label">Aprobado</span><b>${money(r.approved)}</b></div><div><span class="label">Deducible</span><b>${money(r.deductible)}</b>${r.deductibleUF} UF</div></div>${r.notes.map(n => `<p class="callout small">${escape(n.text)} <small class="muted">· ${escape(n.by)} · ${dateTime(n.at)}</small></p>`).join('')}<a class="btn" href="#/ots/${r.otId}" data-close>Abrir OT</a></div>` }),
      csv: { name: 'siniestros', map: r => ({ siniestro: r.number, aseguradora: r.ins, ot: r.otCode, patente: r.plate, asegurado: r.cust, presupuesto: r.amount, aprobado: r.approved, deducible_uf: r.deductibleUF, estado: CLAIM_ST[r.status]?.label }) }
    });
  }
};
export { date };
