// Catálogo: listado con filtros y editor completo (película/serie, temporadas y episodios, géneros,
// clasificación, carátula generada, ventana de licencia y estado de publicación).
import { db } from '../data/db.js';
import { html, raw, $, $$, toast, confirm, dataTable, date, escape } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV } from '../shared/admin-kit.js';
import { artCard } from '../shared/art.js';
import { GENRES, RATINGS, MOTIFS } from '../data/seed.js';
import { licenseState, episodesOf } from '../shared/catalog.js';

export const LIC = { vigente: ['success', 'Vigente'], por_vencer: ['warning', 'Por vencer'], vencido: ['danger', 'Vencido'], proximo: ['info', 'Próximo estreno'], borrador: ['', 'Borrador'] };
export const licBadge = t => { const [k, l] = LIC[licenseState(t)]; return `<span class="badge ${k ? 'badge-' + k : ''}">${l}</span>`; };

export function render(el, { query }) {
  const st = { type: '', genre: '', lic: query.lic || '' };
  el.innerHTML = html`${raw(pageHead('Catálogo', `${db.count('titles')} títulos · películas y series`, `${csvButton()}<a class="btn btn-primary" href="#/catalogo/nuevo">+ Nuevo título</a>`))}
    <div class="toolbar">
      <select class="select" id="ft" aria-label="Tipo"><option value="">Películas y series</option><option value="pelicula">Películas</option><option value="serie">Series</option></select>
      <select class="select" id="fg" aria-label="Género"><option value="">Todos los géneros</option>${GENRES.map(g => raw(`<option>${g}</option>`))}</select>
      <select class="select" id="fl" aria-label="Estado"><option value="">Todos los estados</option>${Object.entries(LIC).map(([k, [, l]]) => raw(`<option value="${k}">${l}</option>`))}</select>
    </div><div id="tbl"></div>`;
  $('#fl').value = st.lic;
  const views = db.all('views').reduce((a, v) => { a[v.titleId] = (a[v.titleId] || 0) + v.minutes; return a; }, {});
  const rows = () => db.query('titles', t => (!st.type || t.type === st.type) && (!st.genre || t.genres.includes(st.genre)) && (!st.lic || licenseState(t) === st.lic))
    .map(t => ({ ...t, lic: licenseState(t), hours: Math.round((views[t.id] || 0) / 60), eps: t.type === 'serie' ? episodesOf(t).length : 0 }));
  const tb = dataTable($('#tbl', el), {
    rows: rows(), pageSize: 10, search: r => `${r.title} ${r.genres.join(' ')} ${r.director} ${r.cast.join(' ')}`, onRow: r => (location.hash = `#/catalogo/${r.id}`),
    columns: [
      { key: 'title', label: 'Título', render: r => `<span class="row" style="gap:10px;flex-wrap:nowrap"><span class="thumb">${artCard(r, { title: false })}</span><span><b>${escape(r.title)}</b>${r.original ? ' <span class="badge badge-primary plain">Original</span>' : ''}<br><small class="muted">${r.type === 'serie' ? `Serie · ${r.seasons.length} temp. · ${r.eps} ep.` : `Película · ${r.duration} min`}</small></span></span>` },
      { key: 'year', label: 'Año' },
      { key: 'genres', label: 'Géneros', render: r => escape(r.genres.join(', ')) },
      { key: 'maturity', label: 'Edad', render: r => `<span class="badge plain">${r.maturity}</span>` },
      { key: 'hours', label: 'Horas vistas' },
      { key: 'lic', label: 'Estado', render: r => licBadge(r) + (r.availableTo ? `<br><small class="muted">hasta ${date(r.availableTo)}</small>` : '') }
    ]
  });
  const refresh = () => tb.update(rows());
  $('#ft').onchange = e => { st.type = e.target.value; refresh(); };
  $('#fg').onchange = e => { st.genre = e.target.value; refresh(); };
  $('#fl').onchange = e => { st.lic = e.target.value; refresh(); };
  wireCSV(el, 'catalogo.csv', () => rows().map(r => ({ id: r.id, titulo: r.title, tipo: r.type, anio: r.year, generos: r.genres.join('|'), clasificacion: r.maturity, original: r.original, estado: r.lic, disponible_desde: r.availableFrom, disponible_hasta: r.availableTo || '', horas_vistas: r.hours })));
  return { update: refresh };
}

const toDate = s => (s ? s.slice(0, 10) : '');
export function editor(el, { user, params }) {
  const isNew = params.id === 'nuevo';
  const orig = isNew ? null : db.get('titles', params.id);
  if (!isNew && !orig) { el.innerHTML = '<div class="empty">Título no encontrado. <a href="#/catalogo">Volver</a></div>'; return; }
  const d = orig ? JSON.parse(JSON.stringify(orig)) : { title: '', type: 'pelicula', year: new Date().getFullYear(), genres: ['Drama'], maturity: '13+', synopsis: '', cast: [], director: '', original: true, status: 'borrador', score: 4, trending: 50, duration: 95, seasons: [], art: { motif: 'montanas', hue: 0, variant: 0 }, availableFrom: new Date().toISOString(), availableTo: null };
  const draw = () => {
    el.innerHTML = html`<a href="#/catalogo" class="small">← Catálogo</a>${raw(pageHead(isNew ? 'Nuevo título' : d.title, isNew ? 'Completa la ficha y publícalo' : `ID ${d.id} · ${d.type === 'serie' ? 'Serie' : 'Película'}`, !isNew ? `<a class="btn" href="app.html#/titulo/${d.id}" target="_blank">Ver en la app ↗</a><button class="btn btn-danger" id="del">Eliminar</button>` : ''))}
    <div class="grid-2" style="align-items:start">
      <div class="card stack">
        <div class="grid-2"><div class="field"><label for="e-title">Título *</label><input class="input" id="e-title" value="${d.title}"></div>
          <div class="field"><label for="e-type">Tipo</label><select class="select" id="e-type"><option value="pelicula" ${d.type === 'pelicula' ? 'selected' : ''}>Película</option><option value="serie" ${d.type === 'serie' ? 'selected' : ''}>Serie</option></select></div></div>
        <div class="grid-2"><div class="field"><label for="e-year">Año</label><input class="input" type="number" id="e-year" value="${d.year}"></div>
          <div class="field"><label for="e-mat">Clasificación</label><select class="select" id="e-mat">${RATINGS.map(r => raw(`<option ${d.maturity === r ? 'selected' : ''}>${r}</option>`))}</select></div></div>
        <div class="field"><span class="label">Géneros</span><div class="row" style="gap:6px" id="e-genres">${GENRES.map(g => raw(`<button type="button" class="chip ${d.genres.includes(g) ? 'active' : ''}" data-g="${g}">${g}</button>`))}</div></div>
        <div class="field"><label for="e-syn">Sinopsis</label><textarea class="textarea" id="e-syn">${d.synopsis}</textarea></div>
        <div class="grid-2"><div class="field"><label for="e-cast">Elenco (separado por comas)</label><input class="input" id="e-cast" value="${d.cast.join(', ')}"></div><div class="field"><label for="e-dir">Dirección</label><input class="input" id="e-dir" value="${d.director}"></div></div>
        ${d.type === 'pelicula' ? raw(`<div class="field"><label for="e-dur">Duración (min)</label><input class="input" type="number" id="e-dur" value="${d.duration || 90}"></div>`) : ''}
        <div class="grid-2"><div class="field"><label for="e-score">Valoración (1–5)</label><input class="input" type="number" step=".1" min="1" max="5" id="e-score" value="${d.score}"></div><div class="field"><label for="e-trend">Popularidad (0–100)</label><input class="input" type="number" min="0" max="100" id="e-trend" value="${d.trending}"></div></div>
        <label class="check"><input type="checkbox" id="e-orig" ${d.original ? 'checked' : ''}> Original Andes+</label>
      </div>
      <div class="stack">
        <div class="card stack"><h3 style="margin:0">Carátula generada</h3><div id="e-prev">${raw(artCard(d))}</div>
          <div class="grid-2"><div class="field"><label for="e-motif">Motivo</label><select class="select" id="e-motif">${MOTIFS.map(m => raw(`<option ${d.art.motif === m ? 'selected' : ''}>${m}</option>`))}</select></div>
            <div class="field"><label for="e-var">Degradé</label><select class="select" id="e-var">${[0, 1, 2, 3].map(v => raw(`<option value="${v}" ${d.art.variant === v ? 'selected' : ''}>Variante ${v + 1}</option>`))}</select></div></div>
          <div class="field"><label for="e-hue">Tono (${d.art.hue}°)</label><input type="range" id="e-hue" min="-90" max="90" value="${d.art.hue}" style="accent-color:var(--primary)"></div></div>
        <div class="card stack"><h3 style="margin:0">Publicación y licencia</h3>
          <div class="field"><label for="e-status">Estado</label><select class="select" id="e-status"><option value="publicado" ${d.status === 'publicado' ? 'selected' : ''}>Publicado</option><option value="borrador" ${d.status === 'borrador' ? 'selected' : ''}>Borrador (oculto)</option></select></div>
          <div class="grid-2"><div class="field"><label for="e-from">Disponible desde</label><input class="input" type="date" id="e-from" value="${toDate(d.availableFrom)}"></div><div class="field"><label for="e-to">Disponible hasta</label><input class="input" type="date" id="e-to" value="${toDate(d.availableTo)}"></div></div>
          <small class="muted">Fuera de la ventana de licencia el título desaparece automáticamente de la app.</small></div>
      </div>
    </div>
    ${d.type === 'serie' ? raw(html`<div class="card stack"><div class="row between"><h3 style="margin:0">Temporadas y episodios</h3><button class="btn btn-sm" id="addS">+ Temporada</button></div>
      ${d.seasons.length ? '' : raw('<p class="muted">Aún no hay temporadas.</p>')}
      ${d.seasons.map((s, si) => raw(html`<div class="season-box"><div class="row between"><b>Temporada ${s.n}</b><span class="row" style="gap:6px"><button class="btn btn-sm" data-adde="${si}">+ Episodio</button><button class="btn btn-sm btn-ghost" data-rms="${si}">Eliminar temporada</button></span></div>
        ${s.episodes.map((e, ei) => raw(html`<div class="ep-edit"><span class="muted">E${e.n}</span><input class="input" data-ep="${si}:${ei}:title" value="${e.title}" aria-label="Título del episodio"><input class="input" type="number" data-ep="${si}:${ei}:duration" value="${e.duration}" aria-label="Minutos"><button class="btn btn-ghost btn-icon btn-sm" data-rme="${si}:${ei}" aria-label="Quitar episodio">✕</button></div>`))}</div>`))}</div>`) : ''}
    <div class="row" style="justify-content:flex-end"><a class="btn btn-ghost" href="#/catalogo">Cancelar</a><button class="btn btn-primary btn-lg" id="save">Guardar título</button></div>`;
    wire();
  };
  const collect = () => {
    d.title = $('#e-title').value.trim(); d.year = +$('#e-year').value; d.maturity = $('#e-mat').value; d.synopsis = $('#e-syn').value.trim();
    d.cast = $('#e-cast').value.split(',').map(s => s.trim()).filter(Boolean); d.director = $('#e-dir').value.trim();
    if ($('#e-dur')) d.duration = +$('#e-dur').value || 90;
    d.score = Math.max(1, Math.min(5, +$('#e-score').value || 4)); d.trending = Math.max(0, Math.min(100, +$('#e-trend').value || 0));
    d.original = $('#e-orig').checked; d.status = $('#e-status').value;
    d.availableFrom = $('#e-from').value ? new Date($('#e-from').value + 'T00:00').toISOString() : new Date().toISOString();
    d.availableTo = $('#e-to').value ? new Date($('#e-to').value + 'T23:59').toISOString() : null;
    d.art = { motif: $('#e-motif').value, variant: +$('#e-var').value, hue: +$('#e-hue').value };
    $$('[data-ep]', el).forEach(i => { const [si, ei, k] = i.dataset.ep.split(':'); d.seasons[+si].episodes[+ei][k] = k === 'duration' ? +i.value || 30 : i.value; });
  };
  const renum = () => { d.seasons.forEach((s, si) => { s.n = si + 1; s.episodes.forEach((e, ei) => { e.n = ei + 1; e.id = e.id || `${d.id || 'nx'}s${s.n}e${e.n}${Math.random().toString(36).slice(2, 5)}`; }); }); };
  function wire() {
    const prev = () => { collect(); $('#e-prev').innerHTML = artCard(d); $('label[for="e-hue"]').textContent = `Tono (${d.art.hue}°)`; };
    ['#e-motif', '#e-var', '#e-hue', '#e-title'].forEach(s => $(s).addEventListener('input', prev));
    $('#e-orig').addEventListener('change', prev);
    $('#e-type').onchange = e => { collect(); d.type = e.target.value; if (d.type === 'serie' && !d.seasons.length) d.seasons = [{ n: 1, episodes: [{ n: 1, title: 'Piloto', duration: 45, synopsis: '' }] }]; renum(); draw(); };
    $('#e-genres').onclick = e => { const b = e.target.closest('[data-g]'); if (!b) return; const g = b.dataset.g; d.genres = d.genres.includes(g) ? d.genres.filter(x => x !== g) : [...d.genres, g]; b.classList.toggle('active'); };
    $('#addS')?.addEventListener('click', () => { collect(); d.seasons.push({ n: d.seasons.length + 1, episodes: [{ n: 1, title: 'Episodio 1', duration: 45, synopsis: '' }] }); renum(); draw(); });
    $$('[data-adde]', el).forEach(b => b.onclick = () => { collect(); const s = d.seasons[+b.dataset.adde]; s.episodes.push({ n: s.episodes.length + 1, title: `Episodio ${s.episodes.length + 1}`, duration: 45, synopsis: '' }); renum(); draw(); });
    $$('[data-rms]', el).forEach(b => b.onclick = () => { collect(); d.seasons.splice(+b.dataset.rms, 1); renum(); draw(); });
    $$('[data-rme]', el).forEach(b => b.onclick = () => { collect(); const [si, ei] = b.dataset.rme.split(':').map(Number); d.seasons[si].episodes.splice(ei, 1); if (!d.seasons[si].episodes.length) d.seasons.splice(si, 1); renum(); draw(); });
    $('#del')?.addEventListener('click', async () => {
      if (!await confirm(`¿Eliminar "${orig.title}" del catálogo? Se quitará de colecciones y del billboard.`, { danger: true, ok: 'Eliminar' })) return;
      db.remove('titles', orig.id);
      db.query('collections', c => (c.titleIds || []).includes(orig.id)).forEach(c => db.update('collections', c.id, { titleIds: c.titleIds.filter(x => x !== orig.id) }));
      db.log('catálogo', `Eliminado "${orig.title}"`, user.id); toast('Título eliminado'); location.hash = '#/catalogo';
    });
    $('#save').onclick = () => {
      collect();
      if (!d.title) { $('#e-title').classList.add('invalid'); return toast('El título es obligatorio', 'warning'); }
      if (!d.genres.length) return toast('Elige al menos un género', 'warning');
      if (d.availableTo && Date.parse(d.availableTo) <= Date.parse(d.availableFrom)) return toast('La fecha de término debe ser posterior al inicio', 'warning');
      if (d.type === 'serie' && !d.seasons.length) return toast('Una serie necesita al menos una temporada', 'warning');
      const row = { ...d };
      if (row.type === 'pelicula') delete row.seasons; else delete row.duration;
      if (isNew) { const r = db.insert('titles', row); db.log('catálogo', `Nuevo título "${r.title}" (${r.status})`, user.id); toast('Título creado', 'success'); location.hash = `#/catalogo/${r.id}`; }
      else { db.update('titles', orig.id, row); db.log('catálogo', `Editado "${row.title}"`, user.id); toast('Cambios guardados · ya se ven en la app', 'success'); }
    };
  }
  draw();
  return { static: true };
}
