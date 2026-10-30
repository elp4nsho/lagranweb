// Series / Películas por género, búsqueda con filtros y Mi lista.
import { html, raw, $, norm, debounce, toast } from '../../../assets/core/ui.js';
import { GENRES, RATINGS } from '../data/seed.js';
import { visibleTitles, toggleList, inList, ratingIdx } from '../shared/catalog.js';
import { tile } from './home.js';

const SORTS = { popular: (a, b) => b.trending - a.trending, nuevo: (a, b) => b.year - a.year || b.availableFrom.localeCompare(a.availableFrom), score: (a, b) => b.score - a.score, az: (a, b) => a.title.localeCompare(b.title) };

export function renderBrowse(el, ctx, type, q = {}) {
  const st = { genre: q.genero || '', sort: 'popular' };
  const draw = () => {
    const list = visibleTitles(ctx.profile).filter(t => t.type === type);
    const genres = GENRES.filter(g => list.some(t => t.genres.includes(g)));
    const items = list.filter(t => !st.genre || t.genres.includes(st.genre)).sort(SORTS[st.sort]);
    el.innerHTML = html`<section class="section" style="padding-top:24px"><div class="container stack">
      <div class="row between"><h1 style="margin:0">${type === 'serie' ? 'Series' : 'Películas'}</h1>
        <select class="select" id="sort" style="width:auto" aria-label="Ordenar"><option value="popular">Más populares</option><option value="nuevo">Más recientes</option><option value="score">Mejor valoradas</option><option value="az">A–Z</option></select></div>
      <div class="row genre-chips" style="gap:6px" id="gchips"><button class="chip ${st.genre ? '' : 'active'}" data-g="">Todos</button>${genres.map(g => raw(`<button class="chip ${st.genre === g ? 'active' : ''}" data-g="${g}">${g}</button>`))}</div>
      <div class="title-grid">${items.length ? raw(items.map(t => tile(t, `<span class="sub">${t.year} · ${t.genres.join(', ')}</span>`)).join('')) : raw('<div class="empty">No hay títulos en este género.</div>')}</div>
    </div></section>`;
    $('#sort', el).value = st.sort;
    $('#sort', el).onchange = e => { st.sort = e.target.value; draw(); };
    $('#gchips', el).onclick = e => { const b = e.target.closest('[data-g]'); if (b) { st.genre = b.dataset.g; draw(); } };
  };
  draw();
  return { update: c => { Object.assign(ctx, c); draw(); } };
}

export function renderSearch(el, ctx) {
  const st = { q: '', type: '', genre: '', rating: '', sort: 'popular' };
  el.innerHTML = html`<section class="section" style="padding-top:24px"><div class="container stack">
    <h1 style="margin:0">Buscar</h1>
    <input class="input" id="q" type="search" placeholder="Títulos, personas, géneros…" style="font-size:18px;min-height:52px" autofocus aria-label="Buscar">
    <div class="filters-bar">
      <select class="select" id="ft" aria-label="Tipo"><option value="">Series y películas</option><option value="serie">Series</option><option value="pelicula">Películas</option></select>
      <select class="select" id="fg" aria-label="Género"><option value="">Todos los géneros</option>${GENRES.map(g => raw(`<option>${g}</option>`))}</select>
      <select class="select" id="fr" aria-label="Clasificación"><option value="">Cualquier clasificación</option>${RATINGS.map(r => raw(`<option value="${r}">Hasta ${r}</option>`))}</select>
      <select class="select" id="fs" aria-label="Ordenar"><option value="popular">Más populares</option><option value="nuevo">Más recientes</option><option value="score">Mejor valoradas</option><option value="az">A–Z</option></select>
    </div>
    <p class="muted" id="count" style="margin:0"></p>
    <div class="title-grid" id="res"></div></div></section>`;
  const draw = () => {
    const items = visibleTitles(ctx.profile).filter(t => (!st.type || t.type === st.type) && (!st.genre || t.genres.includes(st.genre)) && (!st.rating || ratingIdx(t.maturity) <= ratingIdx(st.rating)) &&
      (!st.q || norm(`${t.title} ${t.cast.join(' ')} ${t.director} ${t.genres.join(' ')} ${t.synopsis}`).includes(norm(st.q)))).sort(SORTS[st.sort]);
    $('#count', el).textContent = st.q ? `${items.length} resultado(s) para "${st.q}"` : `${items.length} títulos`;
    $('#res', el).innerHTML = items.length ? items.map(t => tile(t, `<span class="sub">${t.type === 'serie' ? 'Serie' : 'Película'} · ${t.year} · ${t.maturity}</span>`)).join('') : '<div class="empty" style="grid-column:1/-1"><span class="icon">🔍</span>No encontramos coincidencias. Prueba con otro título, actor o género.</div>';
  };
  $('#q', el).addEventListener('input', debounce(e => { st.q = e.target.value.trim(); draw(); }, 180));
  [['#ft', 'type'], ['#fg', 'genre'], ['#fr', 'rating'], ['#fs', 'sort']].forEach(([s, k]) => { $(s, el).onchange = e => { st[k] = e.target.value; draw(); }; });
  draw();
  setTimeout(() => $('#q', el)?.focus(), 50);
  return { update: c => { Object.assign(ctx, c); draw(); } };
}

export function renderList(el, ctx) {
  const draw = () => {
    const vis = Object.fromEntries(visibleTitles(ctx.profile).map(t => [t.id, t]));
    const items = (ctx.profile.myList || []).map(id => vis[id]).filter(Boolean);
    el.innerHTML = html`<section class="section" style="padding-top:24px"><div class="container stack">
      <h1 style="margin:0">Mi lista</h1><p class="muted" style="margin:0">Perfil: ${ctx.profile.name}</p>
      <div class="title-grid">${items.length ? raw(items.map(t => `<div>${tile(t)}<button class="btn btn-sm btn-ghost" data-rm="${t.id}" style="margin-top:6px">✕ Quitar</button></div>`).join('')) : raw('<div class="empty" style="grid-column:1/-1"><span class="icon">＋</span>Tu lista está vacía. Agrega títulos con el botón “Mi lista”.</div>')}</div>
    </div></section>`;
    el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { toggleList(ctx.profile, b.dataset.rm); if (ctx.profile.preview) draw(); toast('Quitado de Mi lista'); });
  };
  draw();
  return { update: c => { Object.assign(ctx, c); draw(); } };
}
void inList;
