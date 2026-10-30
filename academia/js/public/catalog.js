// Catálogo con filtros (categoría, nivel, precio, rating), búsqueda y orden. El estado vive en el hash.
import { escape, norm, debounce } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { isPublic, rating, priceOf, studentsCount, getUser } from '../data/model.js';
import { LEVELS } from '../data/seed.js';
import { courseCard } from '../shared/bits.js';

const SORTS = [['pop', 'Más populares'], ['rating', 'Mejor evaluados'], ['new', 'Más recientes'], ['price-asc', 'Precio: menor a mayor'], ['price-desc', 'Precio: mayor a menor']];
const PRICES = [['', 'Todos'], ['gratis', 'Gratis'], ['pago', 'De pago'], ['lt20', 'Hasta $20.000'], ['20a35', '$20.000 – $35.000'], ['gt35', 'Más de $35.000']];

export function renderCatalog(view, query = {}) {
  const st = { q: query.q || '', cat: query.cat || '', nivel: query.nivel || '', precio: query.precio || '', rating: query.rating || '', orden: query.orden || 'pop' };
  const cats = db.query('categories', c => c.active !== false);
  view.innerHTML = `<section class="page"><div class="container">
    <div class="section-head"><div><span class="eyebrow">Catálogo</span><h1 style="margin:0">Todos los cursos</h1></div></div>
    <div class="catalog">
      <aside class="card filters" data-filters aria-label="Filtros">
        <div class="field"><label for="fq">Buscar</label><input class="input" id="fq" type="search" value="${escape(st.q)}" placeholder="Título, tema o instructor"></div>
        <div><h4>Categoría</h4><div class="opts"><label class="check"><input type="radio" name="cat" value="" ${!st.cat ? 'checked' : ''}> Todas</label>${cats.map(c => `<label class="check"><input type="radio" name="cat" value="${c.slug}" ${st.cat === c.slug ? 'checked' : ''}> ${escape(c.icon)} ${escape(c.name)}</label>`).join('')}</div></div>
        <div><h4>Nivel</h4><div class="opts"><label class="check"><input type="radio" name="nivel" value="" ${!st.nivel ? 'checked' : ''}> Todos</label>${LEVELS.map(l => `<label class="check"><input type="radio" name="nivel" value="${l}" ${st.nivel === l ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
        <div><h4>Precio</h4><div class="opts">${PRICES.map(([v, l]) => `<label class="check"><input type="radio" name="precio" value="${v}" ${st.precio === v ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
        <div><h4>Valoración</h4><div class="opts">${[['', 'Todas'], ['4.5', '4,5 o más ★'], ['4', '4,0 o más ★'], ['3', '3,0 o más ★']].map(([v, l]) => `<label class="check"><input type="radio" name="rating" value="${v}" ${st.rating === v ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
        <button class="btn btn-ghost" data-clear>Limpiar filtros</button>
      </aside>
      <div>
        <div class="catalog-top"><button class="btn filters-toggle" data-toggle>⚙ Filtros</button><span class="muted" data-count></span>
          <label class="row" style="gap:8px"><span class="small muted">Ordenar</span><select class="select" data-sort aria-label="Ordenar">${SORTS.map(([v, l]) => `<option value="${v}" ${st.orden === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
        <div class="grid-auto" data-results></div>
      </div>
    </div></div></section>`;
  const res = view.querySelector('[data-results]');
  const apply = () => {
    const cat = cats.find(c => c.slug === st.cat);
    let list = db.query('courses', c => isPublic(c)
      && (!st.q || norm(`${c.title} ${c.subtitle} ${getUser(c.instructorId)?.name}`).includes(norm(st.q)))
      && (!cat || c.categoryId === cat.id)
      && (!st.nivel || c.level === st.nivel)
      && (!st.rating || rating(c.id).avg >= +st.rating)
      && (() => { const p = priceOf(c); return !st.precio || (st.precio === 'gratis' ? p === 0 : st.precio === 'pago' ? p > 0 : st.precio === 'lt20' ? p > 0 && p <= 20000 : st.precio === '20a35' ? p > 20000 && p <= 35000 : p > 35000); })());
    const key = { pop: c => -studentsCount(c.id), rating: c => -rating(c.id).avg, new: c => -new Date(c.publishedAt), 'price-asc': c => priceOf(c), 'price-desc': c => -priceOf(c) }[st.orden];
    list.sort((a, b) => key(a) - key(b));
    view.querySelector('[data-count]').textContent = `${list.length} curso${list.length === 1 ? '' : 's'}`;
    res.innerHTML = list.length ? list.map(courseCard).join('') : '<div class="card empty" style="grid-column:1/-1"><span class="icon">🔍</span><p>No encontramos cursos con esos filtros.</p><button class="btn" data-clear>Limpiar filtros</button></div>';
    const qs = new URLSearchParams(Object.entries(st).filter(([k, v]) => v && !(k === 'orden' && v === 'pop'))).toString();
    history.replaceState(null, '', `#/cursos${qs ? '?' + qs : ''}`);
  };
  view.querySelector('[data-filters]').addEventListener('change', e => { if (e.target.name) { st[e.target.name] = e.target.value; apply(); } });
  view.querySelector('#fq').addEventListener('input', debounce(e => { st.q = e.target.value.trim(); apply(); }, 200));
  view.querySelector('[data-sort]').addEventListener('change', e => { st.orden = e.target.value; apply(); });
  view.querySelector('[data-toggle]').addEventListener('click', () => view.querySelector('[data-filters]').classList.toggle('open'));
  view.addEventListener('click', e => { if (e.target.closest('[data-clear]')) { location.hash = '#/cursos'; } });
  apply();
}
