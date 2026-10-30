// Bitácora de conserjería: rondas con puntos de control, novedades e incidentes.
import { escape, dateTime, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/kit.js';

const POINTS = ['Hall Torre A', 'Hall Torre B', 'Subterráneo -1', 'Subterráneo -2', 'Piscina', 'Quinchos', 'Azotea', 'Perímetro'];
const TYPES = { ronda: ['Ronda', 'info'], novedad: ['Novedad', ''], incidente: ['Incidente', 'danger'] };
let filter = '';

export function renderLog(el, p, q, ctx) {
  const { db, user } = ctx;
  const list = db.query('logbook', l => !filter || l.type === filter).sort((a, b) => b.at.localeCompare(a.at));
  el.innerHTML = `${pageHead('Novedades y rondas', 'Libro de novedades digital de la conserjería')}
    <div class="split">
      <form class="card stack" data-add><h3 style="margin:0">Nuevo registro</h3>
        <div class="seg" role="group" aria-label="Tipo">${Object.entries(TYPES).map(([k, v], i) => `<button type="button" data-type="${k}" class="${i === 0 ? 'active' : ''}">${v[0]}</button>`).join('')}</div>
        <div data-points><span class="label">Puntos de control revisados</span><div class="grid-2" style="gap:6px;margin-top:6px">${POINTS.map(pt => `<label class="check small"><input type="checkbox" value="${pt}" checked> ${pt}</label>`).join('')}</div></div>
        <div class="field"><label for="lg-t">Detalle</label><textarea class="textarea" id="lg-t" name="text" placeholder="Ronda sin novedad / Se observa…"></textarea></div>
        <button class="btn btn-primary">Guardar en bitácora</button></form>
      <div class="card"><div class="row between"><h3 style="margin:0">Registros</h3><select class="select select-sm" data-filter aria-label="Filtrar"><option value="">Todos</option>${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${filter === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
        ${list.slice(0, 40).map(l => `<div class="list-row"><div style="min-width:0;flex:1 1 260px"><span class="badge ${TYPES[l.type][1] ? 'badge-' + TYPES[l.type][1] : ''}">${TYPES[l.type][0]}</span> <span class="muted small">${dateTime(l.at)} · ${escape(l.by)}</span><div>${escape(l.text)}</div>${l.checkpoints?.length ? `<div class="small muted">✓ ${l.checkpoints.map(escape).join(' · ')}</div>` : ''}</div></div>`).join('') || '<p class="muted">Sin registros.</p>'}</div>
    </div>`;
  let type = 'ronda';
  const f = el.querySelector('[data-add]');
  f.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { type = b.dataset.type; f.querySelectorAll('[data-type]').forEach(x => x.classList.toggle('active', x === b)); f.querySelector('[data-points]').hidden = type !== 'ronda'; });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const text = f.text.value.trim() || (type === 'ronda' ? 'Ronda completa sin novedad.' : '');
    if (!text) return toast('Describe la novedad', 'warning');
    const checkpoints = type === 'ronda' ? [...f.querySelectorAll('[data-points] input:checked')].map(i => i.value) : [];
    db.insert('logbook', { type, text, by: user.name, at: new Date().toISOString(), checkpoints });
    db.log('conserjería', `${user.name} registró ${TYPES[type][0].toLowerCase()}: ${text.slice(0, 60)}`, user.id);
    toast('Registro guardado', 'success'); ctx.refresh();
  });
  el.querySelector('[data-filter]').onchange = e => { filter = e.target.value; ctx.refresh(); };
}
