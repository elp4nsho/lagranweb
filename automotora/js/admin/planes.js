// Pautas de mantención por marca y kilometraje (lista de precios del taller).
import { escape, money, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { plansFor, brand } from '../shared/domain.js';
import { log } from './kit.js';
import { nf } from '../shared/util.js';
import { icon } from '../shared/icons.js';

export function renderPlans(v, _p, query) {
  const brands = db.all('brands'), b = brand(query.marca) || brands[0], list = plansFor(b.id);
  v.innerHTML = `${pageHead('Pautas y precios', 'Precio fijo por pauta: el sitio lo muestra al agendar y la recepción lo carga en la OT.', `<button class="btn" data-pct>${icon('percent', 16)} Ajustar ${escape(b.name)} %</button><button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva pauta</button>`)}
  <nav class="tabs">${brands.map(x => `<a class="tab ${x.id === b.id ? 'active' : ''}" href="#/pautas?marca=${x.id}">${escape(x.name)}</a>`).join('')}</nav>
  <div class="card"><div class="card-title"><h3>${escape(b.name)} · cada ${b.plan[0]}.000 km o ${b.plan[1]} meses</h3><span class="muted small">Garantía ${b.warrantyYears} años / ${nf(b.warrantyKm)} km</span></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Pauta</th><th>Meses</th><th>Horas</th><th>Precio</th><th>Trabajos incluidos</th><th></th></tr></thead><tbody>
  ${list.map(p => `<tr><td><b>${nf(p.km)} km</b></td><td><input class="input inline-edit" type="number" data-k="months" data-id="${p.id}" value="${p.months}" aria-label="Meses"></td><td><input class="input inline-edit" type="number" step="0.1" data-k="hours" data-id="${p.id}" value="${p.hours}" aria-label="Horas"></td><td><input class="input inline-edit" type="number" step="1000" data-k="price" data-id="${p.id}" value="${p.price}" aria-label="Precio"></td><td class="small">${p.items.map(escape).join(' · ')}</td><td><div class="acts-cell"><button class="btn btn-sm btn-ghost btn-icon" data-items="${p.id}" aria-label="Editar trabajos">${icon('edit', 15)}</button><button class="btn btn-sm btn-ghost btn-icon" data-del="${p.id}" aria-label="Eliminar">${icon('trash', 15)}</button></div></td></tr>`).join('')}
  </tbody></table></div></div>`;
  v.addEventListener('change', e => { const t = e.target.closest('[data-k]'); if (!t) return; const val = Number(t.value); if (!(val >= 0)) return toast('Valor inválido', 'warning'); db.update('servicePlans', t.dataset.id, { [t.dataset.k]: val }); log('pautas', `${b.name} ${t.dataset.id}: ${t.dataset.k}=${val}`); toast('Pauta actualizada', 'success', 1400); });
  v.addEventListener('click', async e => {
    const it = e.target.closest('[data-items]'); if (it) { const p = db.get('servicePlans', it.dataset.items); const r = await formModal({ title: `Trabajos pauta ${nf(p.km)} km`, fields: [{ name: 'items', label: 'Un trabajo por línea', type: 'textarea', value: p.items.join('\n') }] }); if (r) { db.update('servicePlans', p.id, { items: r.items.split('\n').map(s => s.trim()).filter(Boolean) }); log('pautas', `Trabajos ${b.name} ${nf(p.km)} km`); } }
    const d = e.target.closest('[data-del]'); if (d && await confirm('¿Eliminar esta pauta?', { danger: true })) { db.remove('servicePlans', d.dataset.del); log('pautas', 'Pauta eliminada'); }
  });
  v.querySelector('[data-new]').onclick = async () => { const r = await formModal({ title: `Nueva pauta ${b.name}`, fields: [{ name: 'km', label: 'Kilometraje', type: 'number', required: true, value: (list.at(-1)?.km || 0) + b.plan[0] * 1000 }, { name: 'months', label: 'Meses', type: 'number', value: (list.at(-1)?.months || 0) + b.plan[1] }, { name: 'price', label: 'Precio', type: 'number', required: true, value: list[0]?.price || 120000 }, { name: 'hours', label: 'Horas', type: 'number', step: '0.1', value: 1.5 }, { name: 'items', label: 'Trabajos (uno por línea)', type: 'textarea', value: list[0]?.items.join('\n') || '' }] }); if (!r) return; if (list.some(p => p.km === r.km)) return toast('Ya existe una pauta con ese kilometraje', 'warning'); db.insert('servicePlans', { id: `sp-${b.id}-${r.km / 1000}`, brandId: b.id, ...r, items: r.items.split('\n').map(s => s.trim()).filter(Boolean) }); log('pautas', `Nueva pauta ${b.name} ${nf(r.km)} km`); toast('Pauta creada', 'success'); };
  v.querySelector('[data-pct]').onclick = async () => { const r = await formModal({ title: `Ajustar precios ${b.name}`, fields: [{ name: 'pct', label: 'Variación %', type: 'number', step: '0.1', value: 3, required: true }] }); if (!r) return; list.forEach(p => db.update('servicePlans', p.id, { price: Math.round(p.price * (1 + r.pct / 100) / 1000) * 1000 - 10 })); log('pautas', `${b.name} ${r.pct}%`); toast('Precios ajustados', 'success'); };
}
export { money };
