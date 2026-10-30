// Lista de asistentes por evento: búsqueda, estado de ingreso, check-in manual y CSV.
import { db } from '../data/db.js';
import { html, raw, $, money, toast, dataTable, dateTime, escape } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV, kpi } from '../shared/admin-kit.js';
import { badge } from '../shared/format.js';
import { venueOf } from '../shared/inventory.js';
import { seatInfo } from '../shared/venue.js';

export function render(el, { org, user, query }) {
  const evs = db.query('events', e => e.organizerId === org.id && ['publicado', 'finalizado'].includes(e.status)).sort((a, b) => b.date.localeCompare(a.date));
  const st = { event: query.event || evs.find(e => e.status === 'publicado')?.id || evs[0]?.id || '', status: '' };
  el.innerHTML = html`${raw(pageHead('Asistentes', 'Entradas emitidas por evento', csvButton()))}
    <div class="toolbar"><select class="select" id="fev" aria-label="Evento" style="max-width:340px">${evs.map(e => raw(html`<option value="${e.id}" ${e.id === st.event ? 'selected' : ''}>${e.title}</option>`))}</select>
      <select class="select" id="fst" aria-label="Estado"><option value="">Todos</option><option value="valido">Sin ingresar</option><option value="usado">Ingresados</option><option value="reventa">En reventa</option><option value="anulado">Anuladas</option></select></div>
    <div class="kpis" id="akpi"></div><div id="tbl"></div>`;
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u]));
  const rows = () => {
    const ev = db.get('events', st.event); if (!ev) return [];
    const v = venueOf(ev);
    return db.query('tickets', t => t.eventId === ev.id && (!st.status || t.status === st.status)).map(t => ({ ...t, holder: users[t.ownerId]?.name || '—', email: users[t.ownerId]?.email || '', tier: ev.tiers.find(x => x.id === t.tierId)?.name || '', place: t.seat ? seatInfo(v, t.seat)?.label || t.seat : 'General' }));
  };
  const drawKpi = () => {
    const all = db.query('tickets', t => t.eventId === st.event && t.status !== 'anulado');
    const used = all.filter(t => t.status === 'usado').length;
    $('#akpi').innerHTML = kpi('Entradas emitidas', String(all.length)) + kpi('Ingresados', `${used} (${all.length ? Math.round(used / all.length * 100) : 0}%)`) + kpi('Recaudación', money(all.reduce((s, t) => s + t.price, 0)));
  };
  const t = dataTable($('#tbl', el), {
    rows: rows(), pageSize: 15, search: r => `${r.holder} ${r.email} ${r.code} ${r.place}`,
    columns: [
      { key: 'holder', label: 'Titular', render: r => `${escape(r.holder)}<br><small class="muted">${escape(r.email)}</small>` },
      { key: 'code', label: 'Código', render: r => `<span class="mono">${r.code}</span>` },
      { key: 'tier', label: 'Tipo' },
      { key: 'place', label: 'Ubicación' },
      { key: 'status', label: 'Estado', render: r => badge(r.status) + (r.scannedAt ? `<br><small class="muted">${dateTime(r.scannedAt)}</small>` : '') },
      { key: 'id', label: '', sort: false, render: r => (r.status === 'valido' ? `<button class="btn btn-sm btn-ghost" data-in="${r.id}">Marcar ingreso</button>` : '') }
    ]
  });
  if (query.q) { const i = el.querySelector('[data-q]'); i.value = query.q; i.dispatchEvent(new Event('input')); }
  const refresh = () => { t.update(rows()); drawKpi(); };
  $('#fev').onchange = e => { st.event = e.target.value; refresh(); };
  $('#fst').onchange = e => { st.status = e.target.value; refresh(); };
  el.addEventListener('click', e => { const b = e.target.closest('[data-in]'); if (!b) return; const tk = db.update('tickets', b.dataset.in, { status: 'usado', scannedAt: new Date().toISOString(), scannedBy: user.id }); db.log('check-in manual', `${tk.code}`, user.id); toast('Ingreso registrado', 'success'); });
  wireCSV(el, 'asistentes.csv', () => rows().map(r => ({ titular: r.holder, correo: r.email, codigo: r.code, tipo: r.tier, ubicacion: r.place, precio: r.price, estado: r.status, ingreso: r.scannedAt || '' })));
  drawKpi();
  return { update: refresh };
}
