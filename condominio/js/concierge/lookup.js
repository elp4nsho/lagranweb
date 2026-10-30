// Búsqueda rápida de residentes por nombre, depto, RUT o patente.
import { escape, norm, debounce, dateTime } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/kit.js';

let q = '';
export function renderLookup(el, p, query, { db }) {
  el.innerHTML = `${pageHead('Buscar residente', 'Por nombre, departamento (ej: B-302), RUT o patente')}
    <input class="input big-input" style="text-transform:none;letter-spacing:0;text-align:left;font-size:18px!important" type="search" placeholder="Escribe para buscar…" value="${escape(q)}" data-q aria-label="Buscar residente"><div data-res class="grid-2"></div>`;
  const res = el.querySelector('[data-res]');
  const draw = () => {
    const s = norm(q.trim());
    if (s.length < 2) { res.innerHTML = '<p class="muted full">Ingresa al menos 2 caracteres.</p>'; return; }
    const units = db.all('units').filter(u => {
      const rs = db.query('residents', r => r.unitId === u.id);
      return norm(`${u.tower}-${u.number} ${u.tower}${u.number}`).includes(s) || rs.some(r => norm(`${r.name} ${r.rut} ${r.vehicles.join(' ')} ${r.phone}`).includes(s));
    }).slice(0, 12);
    res.innerHTML = units.map(u => {
      const rs = db.query('residents', r => r.unitId === u.id), pk = db.count('parcels', x => x.unitId === u.id && x.status === 'conserjeria');
      const exp = db.query('visitors', v => v.unitId === u.id && v.status === 'esperada');
      return `<div class="card"><div class="row between"><h3 style="margin:0">Depto ${u.tower}-${u.number}</h3><span class="badge plain">${u.occupancy === 'arrendatario' ? 'Arrendado' : 'Propietario'}</span></div>
        <p class="muted small">Piso ${u.floor} · ${u.m2} m² · ${u.parking} estac. · ${u.storage} bodega</p>
        ${rs.map(r => `<div class="list-row small"><span><b>${escape(r.name)}</b> ${r.titular ? '<span class="badge badge-primary plain">Titular</span>' : ''}<br><span class="muted">${escape(r.rut)} · ${escape(r.type)}</span></span><span class="right"><a href="tel:${escape(r.phone)}">${escape(r.phone)}</a>${r.vehicles.length ? `<br><span class="muted">🚗 ${r.vehicles.map(escape).join(', ')}</span>` : ''}</span></div>`).join('')}
        <div class="row small" style="gap:6px;margin-top:8px">${pk ? `<span class="badge badge-warning">${pk} encomienda(s)</span>` : ''}${exp.map(v => `<span class="badge badge-info">Visita: ${escape(v.name)} (${escape(v.date)})</span>`).join('')}</div></div>`;
    }).join('') || '<p class="muted full">Sin coincidencias.</p>';
  };
  el.querySelector('[data-q]').addEventListener('input', debounce(e => { q = e.target.value; draw(); }, 150));
  draw();
}
