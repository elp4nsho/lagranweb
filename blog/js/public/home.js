// Portada: destacados, lo último, bloques por sección, premium y más leídos.
import { escape } from '../../../assets/core/ui.js';
import { db, liveArticles } from '../data/db.js';
import { story, mostRead, adSlot, newsletterBox, when } from './cards.js';

export function renderHome(el) {
  const all = liveArticles();
  const featured = all.filter(a => a.featured);
  const lead = featured[0] || all[0];
  const second = (featured.length > 1 ? featured.slice(1, 3) : all.slice(1, 3)).filter(a => a !== lead);
  const used = new Set([lead, ...second].map(a => a?.id));
  const latest = all.filter(a => !used.has(a.id)).slice(0, 7);
  const cats = db.all('categories').sort((a, b) => a.order - b.order);
  const premium = all.filter(a => a.premium).slice(0, 4);

  el.innerHTML = `<div class="container">
    ${adSlot('home-top')}
    <section class="front" aria-label="Portada">
      <div class="front-lead" data-anim>${lead ? story(lead, 'lead') : '<p class="empty">Aún no hay noticias publicadas.</p>'}</div>
      <div class="front-second">${second.map(a => story(a, 'card')).join('')}</div>
      <aside class="front-latest widget"><h2 class="widget-title">Lo último</h2>${latest.map(a => `<div class="latest-item"><time class="small muted">${new Date(when(a)).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}</time>${story(a, 'text')}</div>`).join('')}</aside>
    </section>
    <div class="with-sidebar">
      <div class="main-col">
        ${cats.map(c => {
          const list = all.filter(a => a.categoryId === c.id && !used.has(a.id)).slice(0, 4);
          if (!list.length) return '';
          return `<section class="sec-block" aria-labelledby="sb-${c.id}" data-anim>
            <header class="sec-head" style="--kc:var(--${escape(c.color)})"><h2 id="sb-${c.id}"><a href="#/seccion/${escape(c.id)}">${escape(c.name)}</a></h2><a class="small" href="#/seccion/${escape(c.id)}">Ver todo →</a></header>
            <div class="sec-grid">${story(list[0], 'card')}<div class="stack" style="gap:14px">${list.slice(1).map(a => story(a, 'row')).join('')}</div></div></section>`;
        }).join('')}
        ${premium.length ? `<section class="premium-strip card" data-anim><header class="row between"><h2>★ Para suscriptores</h2><a class="btn btn-primary btn-sm" href="#/planes">Ver planes</a></header><div class="grid-4">${premium.map(a => story(a, 'text')).join('')}</div></section>` : ''}
      </div>
      <aside class="sidebar">${mostRead()}${adSlot('sidebar')}${newsletterBox()}</aside>
    </div>
  </div>`;
}
