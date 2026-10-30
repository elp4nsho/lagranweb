// Carta con categorías (scroll-spy), búsqueda y filtros dietarios.
import { money, escape, norm, debounce } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { TAGS, settings } from '../shared/logic.js';
import { t, tr } from './i18n.js';
import { cart } from './cart.js';
import { openDish, dishArt, tagList } from './dish-modal.js';

const state = { q: '', tags: new Set() };
let spy;

export function renderMenu(el, { canOrder }) {
  const cfg = settings();
  el.innerHTML = `
    ${cfg.announcement && tr(cfg.announcement) ? `<div class="container"><p class="announce" data-anim>${escape(tr(cfg.announcement))}</p></div>` : ''}
    <div class="cat-bar" id="catBar"><div class="container cat-track" role="tablist"></div></div>
    <div class="container stack menu-wrap">
      ${!canOrder ? `<p class="callout small">${escape(t('viewOnly'))}</p>` : ''}
      ${canOrder && cfg.orderingEnabled === false ? `<p class="callout small">${escape(t('orderingOff'))}</p>` : ''}
      <div class="row filters">
        <input class="input" type="search" id="q" placeholder="${escape(t('search'))}" value="${escape(state.q)}" aria-label="${escape(t('search'))}">
        <div class="row chips" role="group" aria-label="${escape(t('filters'))}">
          ${Object.entries(TAGS).map(([k, g]) => `<button class="chip ${state.tags.has(k) ? 'active' : ''}" data-tag="${k}" aria-pressed="${state.tags.has(k)}">${g.icon} ${escape(tr(g))}</button>`).join('')}
          <button class="btn btn-ghost btn-sm" id="clearF" ${state.q || state.tags.size ? '' : 'hidden'}>${escape(t('clear'))}</button>
        </div>
      </div>
      <div id="sections"></div>
    </div>`;
  const sections = el.querySelector('#sections');
  const track = el.querySelector('.cat-track');

  const paint = () => {
    const cats = db.query('categories', c => c.active !== false).sort((a, b) => a.order - b.order);
    const dishes = db.all('dishes').filter(d => {
      if (d.hidden) return false;
      if (state.tags.size && ![...state.tags].every(k => (d.tags || []).includes(k))) return false;
      if (state.q && !norm(tr(d.name) + ' ' + tr(d.desc)).includes(norm(state.q))) return false;
      return true;
    });
    const visible = cats.filter(c => dishes.some(d => d.cat === c.id));
    track.innerHTML = visible.map(c => `<a class="cat-tab" href="#cat-${c.id}" data-cat="${c.id}">${c.icon} ${escape(tr(c.name))}</a>`).join('');
    sections.innerHTML = visible.length ? visible.map(c => `
      <section class="menu-sec" id="cat-${c.id}" data-cat="${c.id}">
        <h2>${c.icon} ${escape(tr(c.name))}</h2>
        <div class="dish-grid">
          ${dishes.filter(d => d.cat === c.id).map(d => {
            const q = cart.qtyOf(d.id), out = d.available === false;
            return `<article class="card dish ${out ? 'is-out' : ''}" data-dish="${d.id}" tabindex="0" role="button" aria-label="${escape(tr(d.name))}">
              ${dishArt(d)}
              <div class="dish-body">
                <h3>${escape(tr(d.name))}</h3>
                <p class="muted small clamp2">${escape(tr(d.desc))}</p>
                <div class="row dish-tags">${d.popular ? `<span class="badge badge-primary plain">★ ${escape(t('popular'))}</span>` : ''}${tagList(d)}</div>
                <div class="row between dish-foot"><b>${money(d.price)}</b>${out ? `<span class="badge badge-danger">${escape(t('soldOut'))}</span>` : canOrder ? `<span class="add-dot" aria-hidden="true">${q ? q : '+'}</span>` : ''}</div>
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>`).join('') : `<div class="empty"><span class="icon">🍽️</span>${escape(t('noResults'))}</div>`;
    setupSpy(el);
  };

  el.addEventListener('click', e => {
    const chip = e.target.closest('[data-tag]');
    if (chip) { const k = chip.dataset.tag; state.tags.has(k) ? state.tags.delete(k) : state.tags.add(k); chip.classList.toggle('active'); chip.setAttribute('aria-pressed', state.tags.has(k)); el.querySelector('#clearF').hidden = !(state.q || state.tags.size); paint(); return; }
    if (e.target.closest('#clearF')) {
      state.q = ''; state.tags.clear(); el.querySelector('#q').value = '';
      el.querySelectorAll('[data-tag]').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
      el.querySelector('#clearF').hidden = true; paint(); return;
    }
    const tab = e.target.closest('.cat-tab');
    if (tab) { e.preventDefault(); document.getElementById('cat-' + tab.dataset.cat)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const card = e.target.closest('[data-dish]');
    if (card) { const d = db.get('dishes', card.dataset.dish); if (d && d.available !== false) openDish(d, { canOrder: canOrder && settings().orderingEnabled !== false }); }
  });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-dish]')) e.target.click(); });
  el.querySelector('#q').addEventListener('input', debounce(e => { state.q = e.target.value; el.querySelector('#clearF').hidden = !(state.q || state.tags.size); paint(); }, 160));
  paint();
  return { refresh: paint };
}

function setupSpy(el) {
  spy && spy.disconnect();
  const tabs = [...el.querySelectorAll('.cat-tab')];
  if (!tabs.length) return;
  const mark = id => tabs.forEach(a => {
    const on = a.dataset.cat === id;
    a.classList.toggle('active', on);
    if (on) { const tr = a.parentElement; tr.scrollTo({ left: a.offsetLeft - tr.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' }); }
  });
  mark(tabs[0].dataset.cat);
  spy = new IntersectionObserver(entries => {
    const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (vis[0]) mark(vis[0].target.dataset.cat);
  }, { rootMargin: '-130px 0px -60% 0px' });
  el.querySelectorAll('.menu-sec').forEach(s => spy.observe(s));
}
