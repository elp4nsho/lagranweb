// Membresías: niveles Silver/Gold/Black (precio, descuento, beneficios) y socios.
import { escape, money, toast, formModal } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { donutChart } from '../../../assets/core/ui.js';

async function editTier(t, ctx) {
  const v = await formModal({ title: `Editar membresía ${t.name}`, fields: [
    { name: 'name', label: 'Nombre', required: true, value: t.name }, { name: 'price', label: 'Precio anual (CLP)', type: 'number', required: true, value: t.price },
    { name: 'discount', label: 'Descuento (%)', type: 'number', value: t.discount }, { name: 'conciergeFree', label: 'Retiros concierge gratis al año (99 = ilimitado)', type: 'number', value: t.conciergeFree },
    { name: 'tone', label: 'Color', type: 'select', options: ['primary', 'accent', 'info', 'success', 'warning'], value: t.tone }, { name: 'perks', label: 'Beneficios (uno por línea)', type: 'textarea', value: t.perks.join('\n') }, { name: 'active', label: 'Disponible en el sitio', type: 'checkbox', value: t.active !== false }] });
  if (!v) return;
  if (v.discount < 0 || v.discount > 50) { toast('Descuento entre 0 y 50%', 'warning'); return; }
  db.update('tiers', t.id, { ...v, perks: v.perks.split('\n').map(x => x.trim()).filter(Boolean) });
  db.log('membresias', `Membresía ${v.name} actualizada (${money(v.price)}, ${v.discount}%)`, ctx.user.id); toast('Membresía actualizada en el sitio', 'success');
}
async function changeTier(c, ctx) {
  const v = await formModal({ title: `Membresía de ${c.name}`, fields: [{ name: 'tier', label: 'Nivel', type: 'select', options: [['', 'Sin membresía'], ...db.all('tiers').map(t => [t.id, t.name])], value: c.tier || '' }] });
  if (!v) return;
  db.update('customers', c.id, { tier: v.tier || null, tierSince: v.tier ? new Date().toISOString().slice(0, 10) : null });
  db.log('membresias', `${c.name}: ${v.tier ? 'membresía ' + v.tier : 'membresía cancelada'}`, ctx.user.id); toast('Socio actualizado', 'success');
}
export default {
  id: 'membresias', label: 'Membresías', icon: '💳', group: 'Clientes', roles: ['admin', 'gerente'],
  watch: ['tiers', 'customers'],
  render(el, ctx) {
    const ts = db.all('tiers').sort((a, b) => a.order - b.order), cs = db.all('customers');
    const members = cs.filter(c => c.tier), arr = members.reduce((a, c) => a + (db.get('tiers', c.tier)?.price || 0), 0);
    el.innerHTML = `${pageHead('Membresías', 'Niveles, beneficios y socios')}
      <div class="kpi-grid">${kpi('Socios activos', String(members.length), `${Math.round(members.length / cs.length * 100)}% de los clientes`)}${kpi('Ingreso anual recurrente', money(arr))}${kpi('MRR equivalente', money(arr / 12))}</div>
      <div class="grid-2"><div class="grid-3">${ts.map(t => `<div class="card tier-card tone-${t.tone}"><div class="row between"><h3 style="margin:0">${escape(t.name)}</h3>${t.active === false ? '<span class="badge">Oculta</span>' : ''}</div><b class="price">${money(t.price)}<small class="muted"> /año</small></b><small>${t.discount}% dcto · ${t.conciergeFree >= 99 ? 'concierge ilimitado' : t.conciergeFree + ' retiros'}</small><small class="muted">${members.filter(c => c.tier === t.id).length} socios</small><button class="btn btn-sm" data-tier="${t.id}">Editar</button></div>`).join('')}</div>
        <div class="card">${donutChart(ts.map(t => ({ label: t.name, value: members.filter(c => c.tier === t.id).length })), { size: 150, label: String(members.length) })}</div></div>
      <h3 style="margin:0">Socios</h3><div data-t></div>`;
    el.addEventListener('click', e => { const b = e.target.closest('[data-tier]'); if (b) editTier(db.get('tiers', b.dataset.tier), ctx); });
    return smartTable(el.querySelector('[data-t]'), {
      rows: () => db.query('customers', c => c.tier).map(c => ({ ...c, tierName: db.get('tiers', c.tier)?.name || c.tier })),
      filters: [{ key: 'tier', label: 'Nivel', options: ts.map(t => [t.id, t.name]) }],
      search: r => `${r.name} ${r.email}`,
      columns: [{ key: 'name', label: 'Socio', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.email)}</small>` }, { key: 'tierName', label: 'Nivel', render: r => `<span class="badge badge-primary">${escape(r.tierName)}</span>` }, { key: 'tierSince', label: 'Desde' }, { key: 'comuna', label: 'Comuna' }],
      onRow: r => changeTier(db.get('customers', r.id), ctx),
      csv: { name: 'socios', map: r => ({ nombre: r.name, correo: r.email, nivel: r.tierName, desde: r.tierSince }) }
    });
  }
};
