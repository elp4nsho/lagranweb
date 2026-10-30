// Tarjeta de auto reutilizable (búsqueda, portada, cuenta).
import { money, escape } from '../../../assets/core/ui.js';
import { carArt } from '../shared/car-art.js';
import { kmFmt, branchById, compareGet } from '../shared/domain.js';

export function carCard(c, { compare = true } = {}) {
  const b = branchById(c.branchId), cmp = compareGet().includes(c.id);
  const below = c.marketPrice && c.price < c.marketPrice * .98;
  return `<article class="card hover car-card ${c.status === 'vendido' ? 'sold' : ''}">
    <a class="cc-art" href="#/auto/${c.id}" aria-label="${escape(c.brand + ' ' + c.model)}">${carArt({ body: c.body, color: c.color, ev: c.fuel === 'Eléctrico', label: `${c.brand} ${c.model} ${c.colorName}` })}</a>
    <span class="cc-tags">${c.status === 'reservado' ? '<span class="badge badge-warning">Reservado</span>' : '<span class="badge badge-success">✓ Certificado</span>'}${below ? '<span class="badge badge-info">Bajo mercado</span>' : ''}</span>
    ${compare && c.status !== 'vendido' ? `<label class="check cc-cmp"><input type="checkbox" data-cmp="${c.id}" ${cmp ? 'checked' : ''}> Comparar</label>` : ''}
    <div class="cc-body">
      <a class="cc-title" href="#/auto/${c.id}">${escape(c.brand)} ${escape(c.model)} <small class="muted">${escape(c.version || '')}</small></a>
      <div class="cc-specs"><span>📅 ${c.year}</span><span>🛣️ ${kmFmt(c.km)}</span><span>⚙️ ${escape(c.transmission)}</span><span>⛽ ${escape(c.fuel)}</span><span>📍 ${escape(b?.name || '')}</span></div>
      <div class="cc-foot"><span><b class="price">${money(c.price)}</b>${below ? `<small class="muted d-block">Mercado ~${money(c.marketPrice)}</small>` : ''}</span><a class="btn btn-sm btn-primary" href="#/auto/${c.id}">Ver auto</a></div>
    </div></article>`;
}
