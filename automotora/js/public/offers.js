// Ofertas y bonos vigentes (campañas del panel).
import { db } from '../data/db.js';
import { campaignLive, CAMPAIGN_TYPES } from '../shared/domain.js';
import { offerCard } from './home.js';
import { pageHero } from './cards.js';
import { icon } from '../shared/icons.js';

export function renderOffers(el) {
  const live = db.query('campaigns', c => campaignLive(c)).sort((a, b) => b.amount - a.amount);
  const types = [...new Set(live.map(c => c.type))];
  el.innerHTML = `${pageHero('Ofertas', 'Bonos y campañas del mes', `${live.length} campañas vigentes. Los bonos de financiamiento aplican al financiar con Autoplaza; el bono retoma, al dejar tu usado en parte de pago.`, 'tag')}
  <section class="section tight"><div class="container stack">
    <div class="chips">${['', ...types].map(t => `<button class="chip ${t ? '' : 'active'}" data-t="${t}">${t ? CAMPAIGN_TYPES[t] : 'Todas'}</button>`).join('')}</div>
    <div class="grid-3 offer-grid" data-list></div>
    <div class="card legal small muted">${icon('alert', 16)} Bonos no acumulables con otras promociones salvo indicación. Vigencia según fecha indicada o hasta agotar stock. Imágenes referenciales.</div>
  </div></section>`;
  const list = el.querySelector('[data-list]');
  const draw = t => { const l = live.filter(c => !t || c.type === t); list.innerHTML = l.map(offerCard).join('') || '<div class="card empty">No hay campañas vigentes.</div>'; };
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { el.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('active', x === b)); draw(b.dataset.t); });
  draw('');
}
