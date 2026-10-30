// Bitácora de actividad (db.log) con filtro por tipo y exportación.
import { db } from '../data/db.js';
import { $, raw, html } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV, activityList, usersById } from '../shared/admin-kit.js';

export function render(el) {
  const types = [...new Set(db.all('_log').map(l => l.action))].sort();
  el.innerHTML = html`${raw(pageHead('Actividad', 'Últimas 300 acciones en la plataforma', csvButton()))}
    <div class="toolbar"><select class="select" id="ftype" aria-label="Tipo"><option value="">Todas las acciones</option>${types.map(t => raw(`<option>${t}</option>`))}</select><input class="input" id="fq" type="search" placeholder="Filtrar texto…"></div>
    <div class="card" id="list"></div>`;
  const rows = () => db.all('_log').filter(l => (!$('#ftype').value || l.action === $('#ftype').value) && (!$('#fq').value || l.detail.toLowerCase().includes($('#fq').value.toLowerCase())));
  const draw = () => { const r = rows(); $('#list').innerHTML = activityList(r.slice(0, 120), usersById()) + (r.length > 120 ? `<p class="muted small">Mostrando 120 de ${r.length}</p>` : ''); };
  $('#ftype').onchange = draw; $('#fq').oninput = draw;
  wireCSV(el, 'actividad.csv', () => { const us = usersById(); return rows().map(l => ({ fecha: l.at, accion: l.action, detalle: l.detail, usuario: us[l.user]?.name || '' })); });
  draw();
  return { update: draw };
}
