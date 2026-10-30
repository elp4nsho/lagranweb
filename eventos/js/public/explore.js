// Descubrimiento de eventos con filtros por categoría, ciudad, fecha, precio y texto.
import { db } from '../data/db.js';
import { html, raw, $, $$, norm, debounce } from '../../../assets/core/ui.js';
import { CITIES, CATEGORIES } from '../data/seed.js';
import { eventCard, CAT_ICON } from '../shared/format.js';
import { venueOf, minPrice, isSoldOut } from '../shared/inventory.js';
import { upcoming } from './home.js';

function matchWhen(ev, when, from, to) {
  const d = new Date(ev.date), now = Date.now();
  if (when === 'semana') return d - now < 7 * 864e5;
  if (when === 'mes') return d - now < 30 * 864e5;
  if (when === 'finde') { const day = d.getDay(); return d - now < 8 * 864e5 && (day === 0 || day === 5 || day === 6); }
  if (from && d < new Date(from + 'T00:00')) return false;
  if (to && d > new Date(to + 'T23:59')) return false;
  return true;
}

export function renderExplore(app, q = {}) {
  const st = { cat: q.cat || '', city: q.city || '', when: q.when || '', q: q.q || '', from: q.from || '', to: q.to || '', sort: q.sort || 'fecha', avail: q.avail === '1' };
  app.innerHTML = html`<section class="section" style="padding-top:28px"><div class="container stack">
    <div><span class="eyebrow">Cartelera</span><h1 style="margin:0">${st.cat ? CATEGORIES[st.cat] : 'Todos los eventos'}</h1></div>
    <div class="explore">
      <aside class="filters card stack" aria-label="Filtros">
        <div class="field"><label for="fq">Buscar</label><input class="input" id="fq" type="search" value="${st.q}" placeholder="Nombre, artista, recinto…"></div>
        <div class="field"><span class="label">Categoría</span><div class="chips" id="fcat"><button class="chip ${st.cat ? '' : 'active'}" data-v="">Todas</button>${Object.entries(CATEGORIES).map(([k, l]) => raw(`<button class="chip ${st.cat === k ? 'active' : ''}" data-v="${k}">${CAT_ICON[k]} ${l}</button>`))}</div></div>
        <div class="field"><label for="fcity">Ciudad</label><select class="select" id="fcity"><option value="">Todas</option>${CITIES.map(c => raw(`<option ${st.city === c ? 'selected' : ''}>${c}</option>`))}</select></div>
        <div class="field"><label for="fwhen">Fecha</label><select class="select" id="fwhen"><option value="">Cualquiera</option><option value="semana" ${st.when === 'semana' ? 'selected' : ''}>Esta semana</option><option value="finde" ${st.when === 'finde' ? 'selected' : ''}>Este fin de semana</option><option value="mes" ${st.when === 'mes' ? 'selected' : ''}>Próximos 30 días</option></select></div>
        <div class="grid-2" style="gap:8px"><div class="field"><label for="ffrom">Desde</label><input class="input" type="date" id="ffrom" value="${st.from}"></div><div class="field"><label for="fto">Hasta</label><input class="input" type="date" id="fto" value="${st.to}"></div></div>
        <label class="check"><input type="checkbox" id="favail" ${st.avail ? 'checked' : ''}> Solo con entradas disponibles</label>
        <button class="btn btn-ghost btn-sm" id="fclear">Limpiar filtros</button>
      </aside>
      <div class="stack">
        <div class="row between"><span class="muted" id="fcount"></span>
          <label class="row" style="gap:8px"><span class="small muted">Ordenar</span><select class="select" id="fsort" style="width:auto"><option value="fecha">Fecha</option><option value="precio">Precio más bajo</option><option value="popular">Más vendidos</option></select></label></div>
        <div class="grid-auto" id="results"></div>
      </div>
    </div></div></section>`;
  $('#fsort').value = st.sort;
  const draw = () => {
    let list = upcoming().filter(e =>
      (!st.cat || e.category === st.cat) && (!st.city || e.city === st.city) && matchWhen(e, st.when, st.from, st.to) &&
      (!st.q || norm(`${e.title} ${e.lineup.map(l => l.name).join(' ')} ${venueOf(e)?.name} ${e.city}`).includes(norm(st.q))) && (!st.avail || !isSoldOut(e)));
    if (st.sort === 'precio') list.sort((a, b) => minPrice(a) - minPrice(b));
    if (st.sort === 'popular') { const c = id => db.count('tickets', t => t.eventId === id); list.sort((a, b) => c(b.id) - c(a.id)); }
    $('#fcount').textContent = `${list.length} evento${list.length === 1 ? '' : 's'}`;
    $('#results').innerHTML = list.length ? list.map(eventCard).join('') : '<div class="empty" style="grid-column:1/-1"><span class="icon">🔍</span>No encontramos eventos con esos filtros.</div>';
  };
  const sync = () => { const p = new URLSearchParams(Object.entries(st).filter(([k, v]) => v && !(k === 'sort' && v === 'fecha')).map(([k, v]) => [k, v === true ? '1' : v])); history.replaceState(null, '', '#/explorar' + (p.toString() ? '?' + p : '')); draw(); };
  $('#fq').addEventListener('input', debounce(e => { st.q = e.target.value; sync(); }, 200));
  $('#fcat').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; st.cat = b.dataset.v; $$('#fcat .chip').forEach(c => c.classList.toggle('active', c === b)); sync(); });
  $('#fcity').onchange = e => { st.city = e.target.value; sync(); };
  $('#fwhen').onchange = e => { st.when = e.target.value; sync(); };
  $('#ffrom').onchange = e => { st.from = e.target.value; st.when = ''; $('#fwhen').value = ''; sync(); };
  $('#fto').onchange = e => { st.to = e.target.value; st.when = ''; $('#fwhen').value = ''; sync(); };
  $('#favail').onchange = e => { st.avail = e.target.checked; sync(); };
  $('#fsort').onchange = e => { st.sort = e.target.value; sync(); };
  $('#fclear').onclick = () => { location.hash = '#/explorar'; };
  draw();
  return { update: draw };
}
