// Encomiendas del residente: pendientes de retiro e historial.
import { escape, dateTime, ago } from '../../../assets/core/ui.js';
import { PARSTATUS, badge } from '../shared/format.js';
import { icon } from '../shared/icons.js';
import { pageHead } from '../shared/kit.js';

export function renderParcels(el, p, q, { db }, { unit }) {
  const list = db.query('parcels', x => x.unitId === unit.id).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const pending = list.filter(x => x.status === 'conserjeria');
  el.innerHTML = `${pageHead('Encomiendas', `${pending.length} esperando retiro en conserjería`)}
    ${pending.length ? `<div class="tile-grid">${pending.map(x => `<div class="card tile"><span class="icon-tile">${icon('box', 22)}</span><span><b>${escape(x.carrier)}</b><span class="small">${escape(x.size)} · llegó ${ago(x.receivedAt)}</span><span class="muted small">Recibió ${escape(x.receivedBy)}${x.note ? ' · ' + escape(x.note) : ''}</span></span></div>`).join('')}</div>
      <p class="small muted">Retira en conserjería con tu carnet. Horario: todos los días, 24 horas.</p>` : '<div class="card empty"><span class="icon">📦</span>No tienes encomiendas pendientes.</div>'}
    <div class="card"><h3>Historial</h3><div class="table-wrap"><table class="table"><thead><tr><th>Remitente</th><th>Tamaño</th><th>Recibida</th><th>Entregada</th><th>Estado</th></tr></thead><tbody>
    ${list.slice(0, 25).map(x => `<tr><td>${escape(x.carrier)}<br><span class="muted small">#${escape(x.tracking)}</span></td><td>${escape(x.size)}</td><td class="small">${dateTime(x.receivedAt)}</td><td class="small">${x.deliveredAt ? `${dateTime(x.deliveredAt)}<br>${escape(x.deliveredTo || '')}` : '—'}</td><td>${badge(PARSTATUS, x.status)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Sin encomiendas.</td></tr>'}</tbody></table></div></div>`;
}
