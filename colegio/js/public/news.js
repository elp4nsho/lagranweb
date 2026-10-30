// Noticias y calendario de eventos públicos.
import { db } from '../data/db.js';
import { escape, date, norm } from '../../../assets/core/ui.js';
import { monthCalendar } from '../shared/kit.js';
import { NOW, YEAR } from '../shared/school.js';
import { newsThumb } from './art.js';
import { newsCard, eventItem } from './pages.js';

let cat = 'Todas', q = '';
const seen = new Set();
export function renderNoticias(el) {
  const all = db.query('news', n => n.published).sort((a, b) => b.date.localeCompare(a.date));
  const cats = ['Todas', ...new Set(all.map(n => n.category))];
  el.innerHTML = `
  <section class="page-hero"><div class="container" data-anim><span class="eyebrow">Noticias</span><h1>Lo que pasa en Los Aromos</h1></div></section>
  <section class="section" style="padding-top:12px"><div class="container stack">
    <div class="row between">
      <div class="row" style="gap:6px" role="group" aria-label="Categorías">${cats.map(c => `<button class="chip ${c === cat ? 'active' : ''}" data-cat="${escape(c)}">${escape(c)}</button>`).join('')}</div>
      <input class="input" type="search" placeholder="Buscar noticias…" style="max-width:260px" value="${escape(q)}" aria-label="Buscar noticias" data-q>
    </div>
    <div class="grid-3" data-list></div>
  </div></section>`;
  const list = el.querySelector('[data-list]');
  const paint = () => {
    const rows = all.filter(n => (cat === 'Todas' || n.category === cat) && (!q || norm(n.title + ' ' + n.excerpt).includes(norm(q))));
    list.innerHTML = rows.map(newsCard).join('') || '<div class="empty" style="grid-column:1/-1">No hay noticias que coincidan.</div>';
  };
  el.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { cat = b.dataset.cat; el.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('active', x === b)); paint(); }));
  el.querySelector('[data-q]').addEventListener('input', e => { q = e.target.value; paint(); });
  paint();
}

export function renderNoticia(el, id) {
  const n = db.get('news', id);
  if (!n || !n.published) { el.innerHTML = `<section class="section"><div class="container"><div class="empty"><h2>Noticia no disponible</h2><a class="btn btn-primary" href="#/noticias">Ver noticias</a></div></div></section>`; return; }
  if (!seen.has(id)) {
    seen.add(id);
    let before = false;
    try { before = !!sessionStorage.getItem('seen:' + id); sessionStorage.setItem('seen:' + id, 1); } catch (e) { /* sin storage */ }
    if (!before) db.update('news', id, { views: (n.views || 0) + 1 });
  }
  const more = db.query('news', x => x.published && x.id !== id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  el.innerHTML = `
  <section class="section" style="padding-top:32px"><div class="container">
    <a href="#/noticias" class="small">← Noticias</a>
    <article class="article" data-anim>
      <div class="row" style="gap:8px;margin-top:16px"><span class="badge badge-primary">${escape(n.category)}</span><span class="small muted">${date(n.date)} · ${escape(n.author)}</span></div>
      <h1 style="margin-top:12px">${escape(n.title)}</h1>
      <p class="lead">${escape(n.excerpt)}</p>
      <div class="thumb">${newsThumb(n.category, 3)}</div>
      <div class="article-body">${n.body.split(/\n\n+/).map(p => `<p>${escape(p)}</p>`).join('')}</div>
    </article>
    <h2 style="margin-top:48px">Más noticias</h2>
    <div class="grid-3">${more.map(newsCard).join('')}</div>
  </div></section>`;
}

let calMonth = null;
export function renderCalendario(el) {
  if (!calMonth) calMonth = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const evs = db.query('events', e => e.public);
  const inMonth = evs.filter(e => e.date.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).sort((a, b) => a.date.localeCompare(b.date));
  el.innerHTML = `
  <section class="page-hero"><div class="container" data-anim><span class="eyebrow">Calendario ${YEAR}</span><h1>Eventos y actividades</h1></div></section>
  <section class="section" style="padding-top:12px"><div class="container split">
    <div class="card">
      <div class="row between" style="margin-bottom:8px">
        <button class="btn btn-sm" data-m="-1" aria-label="Mes anterior">←</button>
        <div class="legend"><span><i class="k-academico"></i>Académico</span><span><i class="k-extra"></i>Extraprogramático</span><span><i class="k-reunion"></i>Reunión</span><span><i class="k-feriado"></i>Feriado</span></div>
        <button class="btn btn-sm" data-m="1" aria-label="Mes siguiente">→</button>
      </div>
      ${monthCalendar(y, m, evs.map(e => ({ date: e.date, label: e.title, kind: e.type })))}
    </div>
    <div class="card"><h3 style="text-transform:capitalize">${calMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</h3>
      <div class="stack" data-day-list>${inMonth.map(eventItem).join('') || '<p class="muted">Sin eventos este mes.</p>'}</div>
    </div>
  </div></section>`;
  el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { calMonth = new Date(y, m + +b.dataset.m, 1); renderCalendario(el); }));
  el.querySelectorAll('.cal-cell.has').forEach(c => c.addEventListener('click', () => {
    const list = evs.filter(e => e.date === c.dataset.date);
    el.querySelector('[data-day-list]').innerHTML = `<p class="small muted">${date(c.dataset.date + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' })}</p>` + list.map(e => `${eventItem(e)}<p class="small muted" style="margin:4px 0 0 72px">${escape(e.description || '')}</p>`).join('');
  }));
}
