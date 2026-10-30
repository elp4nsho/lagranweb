// Catálogo con búsqueda, filtros (categoría, talla, color, precio, oferta, stock) y orden.
import { html, raw, norm, money, debounce } from '../../../assets/core/ui.js';
import { db, productRating, productStock, category } from '../data/db.js';
import { productCard, visibleProducts, emptyState } from './parts.js';

const st = { sizes: new Set(), colors: new Set(), sale: false, stock: false, max: 0, sort: 'relevancia', open: false };

export function renderCatalog(view, query) {
  const cats = db.query('categories', c => c.active).sort((a, b) => a.order - b.order);
  const all = visibleProducts();
  const cat = cats.find(c => c.slug === query.cat) || null;
  const q = query.q || '';
  const sizes = [...new Set(all.flatMap(p => p.sizes))];
  const colors = [...new Map(all.flatMap(p => p.colors).map(c => [c.name, c])).values()];
  const maxPrice = Math.max(...all.map(p => p.price), 10000);
  if (!st.max || st.max > maxPrice) st.max = maxPrice;

  view.innerHTML = html`<section class="section tight catalog-page"><div class="container">
    <nav class="small muted" aria-label="Migas"><a href="#/">Inicio</a> / ${cat ? raw(html`<a href="#/catalogo">Catálogo</a> / ${cat.name}`) : 'Catálogo'}</nav>
    <div class="section-head" style="margin-top:8px"><div><h1 style="margin:0">${cat ? cat.name : q ? `Resultados para “${q}”` : 'Toda la colección'}</h1>${cat ? raw(html`<p class="muted" style="margin:4px 0 0">${cat.description}</p>`) : ''}</div></div>
    <div class="catalog">
      <aside class="filters card ${st.open ? 'open' : ''}" aria-label="Filtros">
        <div><h4>Categoría</h4><div class="filter-list">
          <a class="chip ${!cat ? 'active' : ''}" href="#/catalogo${q ? '?q=' + encodeURIComponent(q) : ''}">Todo</a>
          ${cats.map(c => raw(html`<a class="chip ${cat?.id === c.id ? 'active' : ''}" href="#/catalogo?cat=${c.slug}${q ? '&q=' + encodeURIComponent(q) : ''}">${c.name}</a>`))}
        </div></div>
        <div><h4>Talla</h4><div class="chips">${sizes.map(s => raw(html`<button class="chip ${st.sizes.has(s) ? 'active' : ''}" data-size="${s}">${s}</button>`))}</div></div>
        <div><h4>Color</h4><div class="chips">${colors.map(c => raw(html`<button class="swatch" data-color="${c.name}" aria-pressed="${st.colors.has(c.name)}" title="${c.name}" aria-label="${c.name}" style="background:${c.hex}"></button>`))}</div></div>
        <div><h4>Precio máximo: <span data-maxl>${money(st.max)}</span></h4><input type="range" min="5000" max="${maxPrice}" step="1000" value="${st.max}" data-max style="width:100%;accent-color:var(--primary)"></div>
        <div class="stack" style="gap:8px">
          <label class="check"><input type="checkbox" data-sale ${st.sale ? 'checked' : ''}> Solo ofertas</label>
          <label class="check"><input type="checkbox" data-stock ${st.stock ? 'checked' : ''}> Solo con stock</label>
        </div>
        <button class="btn btn-ghost btn-sm" data-clear>Limpiar filtros</button>
      </aside>
      <div>
        <div class="toolbar">
          <button class="btn btn-sm filters-toggle" data-toggle>☰ Filtros</button>
          <input class="input grow" type="search" placeholder="Buscar en el catálogo…" value="${q}" data-q aria-label="Buscar">
          <select class="select" data-sort aria-label="Ordenar">
            ${[['relevancia', 'Relevancia'], ['precio-asc', 'Precio: menor a mayor'], ['precio-desc', 'Precio: mayor a menor'], ['nuevos', 'Más nuevos'], ['valorados', 'Mejor valorados'], ['vendidos', 'Más vendidos']].map(([v, l]) => raw(`<option value="${v}" ${st.sort === v ? 'selected' : ''}>${l}</option>`))}
          </select>
        </div>
        <p class="small muted" data-count></p>
        <div class="products" data-results></div>
      </div>
    </div>
  </div></section>`;

  const results = view.querySelector('[data-results]'), count = view.querySelector('[data-count]');
  let term = q;
  function draw() {
    let list = all.filter(p =>
      (!cat || p.categoryId === cat.id) &&
      (!term || norm(`${p.name} ${p.description} ${category(p.categoryId)?.name} ${p.colors.map(c => c.name).join(' ')} ${(p.tags || []).join(' ')}`).includes(norm(term))) &&
      (!st.sizes.size || p.variants.some(v => st.sizes.has(v.size) && v.stock > 0)) &&
      (!st.colors.size || p.colors.some(c => st.colors.has(c.name))) &&
      p.price <= st.max && (!st.sale || p.comparePrice > p.price) && (!st.stock || productStock(p) > 0));
    const by = {
      'precio-asc': (a, b) => a.price - b.price, 'precio-desc': (a, b) => b.price - a.price,
      nuevos: (a, b) => b.createdAt.localeCompare(a.createdAt), valorados: (a, b) => productRating(b).avg - productRating(a).avg,
      vendidos: (a, b) => b.sold - a.sold, relevancia: (a, b) => (b.featured - a.featured) || (b.sold - a.sold)
    };
    list.sort(by[st.sort]);
    count.textContent = `${list.length} producto${list.length === 1 ? '' : 's'}`;
    results.innerHTML = list.length ? list.map(productCard).join('')
      : emptyState('🔍', 'No encontramos productos', 'Prueba con otros filtros o una búsqueda distinta.', '<button class="btn" data-clear>Limpiar filtros</button>');
  }
  draw();

  view.addEventListener('click', e => {
    const s = e.target.closest('[data-size]'), c = e.target.closest('[data-color]');
    if (s) { const v = s.dataset.size; st.sizes.has(v) ? st.sizes.delete(v) : st.sizes.add(v); s.classList.toggle('active'); draw(); }
    if (c) { const v = c.dataset.color; st.colors.has(v) ? st.colors.delete(v) : st.colors.add(v); c.setAttribute('aria-pressed', st.colors.has(v)); draw(); }
    if (e.target.closest('[data-clear]')) { st.sizes.clear(); st.colors.clear(); st.sale = st.stock = false; st.max = 0; st.sort = 'relevancia'; history.replaceState(null, '', '#/catalogo'); const fresh = document.createElement('div'); view.replaceWith(fresh); renderCatalog(fresh, {}); }
    if (e.target.closest('[data-toggle]')) { st.open = !st.open; view.querySelector('.filters').classList.toggle('open', st.open); }
  });
  view.querySelector('[data-q]').addEventListener('input', debounce(e => { term = e.target.value; draw(); }, 180));
  view.querySelector('[data-sort]').addEventListener('change', e => { st.sort = e.target.value; draw(); });
  view.querySelector('[data-max]').addEventListener('input', e => { st.max = +e.target.value; view.querySelector('[data-maxl]').textContent = money(st.max); draw(); });
  view.querySelector('[data-sale]').addEventListener('change', e => { st.sale = e.target.checked; draw(); });
  view.querySelector('[data-stock]').addEventListener('change', e => { st.stock = e.target.checked; draw(); });
}
