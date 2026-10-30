// Mapa de cobertura por zonas (lee comunaZone de las tarifas).
import { html, raw, money, escape } from '../../../assets/core/ui.js';
import { COMUNAS, COM } from '../data/geo.js';
import { ZONE_KEYS } from '../shared/pricing.js';
import { createMap } from '../shared/map.js';
import * as ops from '../shared/ops.js';

export function mountCoverage(el) {
  el.innerHTML = `<div class="grid-2 cov-grid"><div class="card map-card" data-anim><div class="cov-map"></div></div><div class="stack cov-side"></div></div>`;
  const map = createMap(el.querySelector('.cov-map'), { prefer: 'svg', zones: ops.pricing().comunaZone, hq: true, label: 'Mapa de cobertura por zonas' });
  map.fitAll();
  const side = el.querySelector('.cov-side');
  const draw = () => {
    const P = ops.pricing();
    map.zones(P.comunaZone);
    const n = COMUNAS.filter(c => P.comunaZone[c.n]).length;
    side.innerHTML = html`<div><span class="eyebrow">Cobertura</span><h2>${n} comunas, 3 zonas</h2><p class="muted">Operamos desde nuestra base en Providencia. Mientras más cerca del centro, más rápido llegamos.</p></div>
      <div class="field"><label for="cov-sel">¿Llegamos a tu comuna?</label><select class="select" id="cov-sel"><option value="">Elige tu comuna</option>${raw(COMUNAS.slice().sort((a, b) => a.n.localeCompare(b.n, 'es')).map(c => `<option>${escape(c.n)}</option>`).join(''))}</select></div>
      <div class="cov-res" aria-live="polite"></div>
      <div class="zones">${raw(ZONE_KEYS.map(z => html`<div class="zone-card zone-${z}"><b>${P.zones[z].name}</b><small class="muted">Retiro ~${P.zones[z].pickup} min · ${P.zones[z].extra ? 'recargo ' + money(P.zones[z].extra) : 'sin recargo'}</small><p class="small">${COMUNAS.filter(c => P.comunaZone[c.n] === z).map(c => c.n).join(', ') || '—'}</p></div>`).join(''))}</div>`;
    side.querySelector('#cov-sel').addEventListener('change', e => {
      const c = COM[e.target.value], z = c && P.comunaZone[c.n];
      map.highlight(c ? c.n : null);
      if (c) map.fit([[c.lat - .03, c.lng - .03], [c.lat + .03, c.lng + .03]]); else map.fitAll();
      side.querySelector('.cov-res').innerHTML = !c ? '' : z
        ? html`<div class="notice ok">✓ <span><b>Sí llegamos a ${c.n}.</b> ${P.zones[z].name} · retiro en ~${P.zones[z].pickup} min.</span></div>`
        : html`<div class="notice warn">! <span><b>${c.n}</b> aún no tiene cobertura. Déjanos tu correo y te avisamos.</span></div>`;
    });
  };
  draw();
  let sig = JSON.stringify(ops.pricing().comunaZone) + JSON.stringify(ops.pricing().zones);
  return { refresh() { const P = ops.pricing(); const n = JSON.stringify(P.comunaZone) + JSON.stringify(P.zones); if (n !== sig) { sig = n; draw(); } }, destroy() { map.destroy(); } };
}
