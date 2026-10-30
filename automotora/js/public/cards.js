// Tarjetas y piezas reutilizables del sitio público.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { brand, fromPrice, SEGMENTS, FUELS, maxBonus, stockFor, stockBadge, isGreen, compareList, campaignsFor } from '../shared/domain.js';
import { carOf } from '../shared/car.js';
import { uiSet } from '../shared/util.js';
import { icon } from '../shared/icons.js';

export function modelCard(m, { compare = true } = {}) {
  const b = brand(m.brandId), bonus = maxBonus(m), st = stockFor(m.id), cmp = compareList().includes(m.id);
  const gift = campaignsFor(m).find(c => c.type === 'regalo');
  return `<article class="card hover model-card" data-model="${m.id}">
    <a class="mc-art" href="#/modelo/${m.id}" aria-label="Configurar ${escape(m.name)}">${carOf(m, m.colors[Math.min(1, m.colors.length - 1)].hex)}
      ${bonus ? `<span class="badge badge-danger mc-flag">Bono ${money(bonus)}</span>` : gift ? `<span class="badge badge-success mc-flag">${escape(gift.name)}</span>` : ''}</a>
    <div class="mc-body">
      <div class="mc-head"><span class="eyebrow">${escape(b?.name)}</span>${isGreen(m) ? `<span class="badge badge-success plain">${icon(m.fuel === 'electrico' ? 'bolt' : 'leaf', 13)} ${FUELS[m.fuel]}</span>` : ''}</div>
      <h3><a href="#/modelo/${m.id}">${escape(m.name)}</a></h3>
      <p class="muted small mc-tag">${escape(m.tagline)}</p>
      <div class="mc-meta"><span class="chip-mini">${SEGMENTS[m.segment]}</span><span class="chip-mini">${m.versions.length} versiones</span><span class="chip-mini">${m.colors.length} colores</span></div>
      <div class="mc-price"><small class="muted">Desde</small><b>${money(fromPrice(m))}</b>${bonus ? `<small class="muted">con bonos ${money(fromPrice(m) - bonus)}</small>` : ''}</div>
      <div class="mc-stock">${stockBadge(st)}</div>
      <div class="mc-actions"><a class="btn btn-primary btn-sm" href="#/modelo/${m.id}">${icon('palette', 15)} Configurar</a>
        ${compare ? `<label class="check small cmp-check"><input type="checkbox" data-compare="${m.id}" ${cmp ? 'checked' : ''}> Comparar</label>` : ''}</div>
    </div>
  </article>`;
}

// Bandeja flotante del comparador (abajo a la derecha, nunca a la izquierda)
export function wireCompare(root, onChange) {
  root.addEventListener('change', e => {
    const c = e.target.closest('[data-compare]'); if (!c) return;
    let list = compareList();
    if (c.checked) {
      if (list.length >= 3) { c.checked = false; return toast('Puedes comparar hasta 3 modelos', 'warning'); }
      list = [...list, c.dataset.compare];
    } else list = list.filter(x => x !== c.dataset.compare);
    uiSet('compare', list); renderTray(); onChange && onChange();
  });
  renderTray();
}
export function renderTray() {
  let tray = document.getElementById('cmp-tray');
  const list = compareList();
  if (!list.length || !location.hash.startsWith('#/modelos')) { tray?.remove(); return; }
  if (!tray) { tray = document.createElement('div'); tray.id = 'cmp-tray'; tray.className = 'cmp-tray card'; document.body.appendChild(tray); }
  tray.innerHTML = `<b>${icon('scale', 18)} ${list.length}/3 para comparar</b><a class="btn btn-primary btn-sm" href="#/comparar">Comparar</a><button class="btn btn-ghost btn-sm" data-clear>Limpiar</button>`;
  tray.querySelector('[data-clear]').onclick = () => { uiSet('compare', []); document.querySelectorAll('[data-compare]').forEach(c => (c.checked = false)); renderTray(); };
}
addEventListener('hashchange', () => setTimeout(renderTray, 0));

export const sectionHead = (eyebrow, title, link = '', sub = '') => `<div class="section-head"><div><span class="eyebrow">${escape(eyebrow)}</span><h2>${escape(title)}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${link}</div>`;
export const pageHero = (eyebrow, title, sub, ico = 'car') => `<section class="page-hero"><div class="container"><span class="eyebrow">${icon(ico, 14)} ${escape(eyebrow)}</span><h1>${escape(title)}</h1><p class="lead muted">${sub}</p></div></section>`;
export const countdown = to => { const d = Math.ceil((new Date(to + 'T23:59') - Date.now()) / 864e5); return d <= 0 ? 'Último día' : d === 1 ? 'Termina mañana' : `Quedan ${d} días`; };
