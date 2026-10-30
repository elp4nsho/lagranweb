// Membresías Silver / Gold / Black: beneficios desde el panel y activación para clientes.
import { money, escape, confirm, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { tiers, customerById, tierById } from '../shared/domain.js';

export function renderTiers(el) {
  const u = auth.current(), cust = u?.role === 'cliente' ? customerById(u.customerId) : null, mine = cust && tierById(cust.tier);
  const ts = tiers();
  const perks = [...new Set(ts.flatMap(t => t.perks))];
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="sec-head"><div><span class="eyebrow">Membresías Atelier</span><h1>Un taller que te conoce</h1><p class="lead">Membresía anual por cliente (cubre todos tus autos). Concierge, autos de cortesía y descuentos en mano de obra y repuestos.</p></div></div>
    ${mine ? `<div class="callout ok">Tu membresía actual: <b>${escape(mine.name)}</b> desde ${escape(cust.tierSince || '')}. <a href="#/garage">Ver mi garage</a></div>` : ''}
    <div class="grid-3">${ts.map(t => `<article class="card tier-card tone-${t.tone}" data-anim>
      <div class="row between"><h2 style="margin:0">${escape(t.name)}</h2>${t.id === 'gold' ? '<span class="badge badge-primary">Más elegida</span>' : ''}</div>
      <div><b class="price-xl">${money(t.price)}</b> <span class="muted">/ año</span><small class="muted d-block">${money(Math.round(t.price / 12))} al mes · ${t.discount}% de descuento</small></div>
      <ul>${t.perks.map(p => `<li>${escape(p)}</li>`).join('')}</ul>
      <div class="foot">${mine?.id === t.id ? '<span class="badge badge-success">Tu plan actual</span>' : cust ? `<button class="btn btn-primary btn-block" data-tier="${t.id}">${mine && mine.order > t.order ? 'Cambiar' : 'Activar'} ${escape(t.name)}</button>` : `<a class="btn btn-primary btn-block" href="login.html?next=${encodeURIComponent('index.html#/membresias')}">Ingresar para activar</a>`}</div></article>`).join('')}</div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Beneficio</th>${ts.map(t => `<th>${escape(t.name)}</th>`).join('')}</tr></thead><tbody>
      ${perks.map(p => `<tr><td>${escape(p)}</td>${ts.map(t => `<td>${t.perks.includes(p) ? '<span class="badge badge-success">✓</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}
      <tr><td>Retiros concierge sin costo</td>${ts.map(t => `<td><b>${t.conciergeFree >= 99 ? 'Ilimitados' : t.conciergeFree + ' al año'}</b></td>`).join('')}</tr></tbody></table></div>
  </div></section>`;
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-tier]'); if (!b) return;
    const t = tierById(b.dataset.tier);
    if (!(await confirm(`Se activará la membresía ${t.name} por ${money(t.price)} al año (cobro simulado a tu tarjeta registrada).`, { title: `Activar ${t.name}`, ok: 'Activar' }))) return;
    db.update('customers', cust.id, { tier: t.id, tierSince: new Date().toISOString().slice(0, 10) });
    db.log('membresias', `${cust.name} activó la membresía ${t.name}`, u.id);
    toast(`¡Bienvenida/o a ${t.name}!`, 'success');
  });
}
