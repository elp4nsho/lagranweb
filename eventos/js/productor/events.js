// Mis eventos (listado), creación con asistente y edición.
import { db } from '../data/db.js';
import { html, raw, $, money, num, toast, dataTable, confirm } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV } from '../shared/admin-kit.js';
import { badge, fmtDay, fmtHour, catName } from '../shared/format.js';
import { eventStats, venueOf } from '../shared/inventory.js';
import { mountWizard, saveEvent } from '../shared/event-wizard.js';

export function render(el, { org, user }) {
  el.innerHTML = `${pageHead('Mis eventos', org.name, `${csvButton()}<a class="btn btn-primary" href="#/nuevo">+ Crear evento</a>`)}<div id="tbl"></div>`;
  const rows = () => db.query('events', e => e.organizerId === org.id).map(e => { const s = eventStats(e); return { ...e, venue: venueOf(e)?.name, sold: s.sold, cap: s.capacity, revenue: s.revenue, pct: s.pct }; }).sort((a, b) => b.date.localeCompare(a.date));
  const t = dataTable($('#tbl', el), {
    rows: rows(), search: r => `${r.title} ${r.venue} ${r.city}`, onRow: r => (location.hash = `#/eventos/${r.id}`),
    columns: [
      { key: 'title', label: 'Evento', render: r => html`<b>${r.title}</b><br><small class="muted">${catName(r.category)} · ${r.venue}</small>` },
      { key: 'date', label: 'Fecha', render: r => `${fmtDay(r.date)} · ${fmtHour(r.date)}` },
      { key: 'status', label: 'Estado', render: r => badge(r.status) + (r.status === 'rechazado' && r.rejectReason ? `<br><small class="muted">${r.rejectReason}</small>` : '') },
      { key: 'pct', label: 'Vendidas', render: r => `${num(r.sold)} / ${num(r.cap)}<div class="progress" style="width:90px"><i style="--v:${Math.min(100, r.pct)}%"></i></div>` },
      { key: 'revenue', label: 'Recaudación', render: r => money(r.revenue) },
      { key: 'id', label: '', sort: false, render: r => `<span class="row" style="gap:4px;flex-wrap:nowrap">${['borrador', 'rechazado', 'pendiente', 'publicado'].includes(r.status) ? `<a class="btn btn-sm btn-ghost" href="#/eventos/${r.id}/editar">Editar</a>` : ''}${r.status === 'borrador' || r.status === 'rechazado' ? `<button class="btn btn-sm btn-primary" data-send="${r.id}">Enviar</button>` : ''}${!r.sold && r.status !== 'publicado' ? `<button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button>` : ''}</span>` }
    ]
  });
  el.addEventListener('click', async e => {
    const s = e.target.closest('[data-send]');
    if (s) { const ev = db.update('events', s.dataset.send, { status: 'pendiente', rejectReason: '' }); db.log('evento enviado', `${ev.title} enviado a aprobación`, user.id); db.query('users', u => u.role === 'admin').forEach(a => db.insert('notifications', { userId: a.id, text: `${org.name} envió "${ev.title}" a aprobación.`, read: false })); toast('Enviado a aprobación', 'success'); }
    const d = e.target.closest('[data-del]');
    if (d && await confirm('¿Eliminar este evento?', { danger: true, ok: 'Eliminar' })) { const ev = db.get('events', d.dataset.del); db.remove('events', ev.id); db.log('evento eliminado', ev.title, user.id); toast('Evento eliminado'); }
  });
  wireCSV(el, 'mis-eventos.csv', () => rows().map(r => ({ evento: r.title, fecha: r.date, recinto: r.venue, estado: r.status, vendidas: r.sold, capacidad: r.cap, recaudacion: r.revenue })));
  return { update: () => t.update(rows()) };
}

function notifyAdmins(text) { db.query('users', u => u.role === 'admin').forEach(a => db.insert('notifications', { userId: a.id, text, read: false })); }

export function create(el, { org, user }) {
  el.innerHTML = `${pageHead('Crear evento', 'Completa los pasos y envíalo a aprobación')}<div id="wiz"></div>`;
  mountWizard($('#wiz', el), { organizerId: org.id,
    onCancel: () => (location.hash = '#/eventos'),
    onSave: (d, promos, submit) => {
      const ev = saveEvent(d, promos, { status: submit ? 'pendiente' : 'borrador', user });
      if (submit) notifyAdmins(`${org.name} envió "${ev.title}" a aprobación.`);
      toast(submit ? 'Evento enviado a aprobación' : 'Borrador guardado', 'success'); location.hash = `#/eventos/${ev.id}`;
    } });
  return { static: true };
}

export function edit(el, { org, user, params }) {
  const ev = db.get('events', params.id);
  el.innerHTML = `<a class="small" href="#/eventos/${ev.id}">← Volver</a>${pageHead('Editar evento', ev.title)}${ev.status === 'publicado' ? '<div class="card small">El evento está publicado: los cambios se aplican de inmediato en el sitio.</div>' : ''}<div id="wiz"></div>`;
  mountWizard($('#wiz', el), { event: ev, organizerId: org.id,
    onCancel: () => (location.hash = `#/eventos/${ev.id}`),
    onSave: (d, promos, submit) => {
      const status = ev.status === 'publicado' ? (submit ? 'publicado' : 'borrador') : submit ? 'pendiente' : 'borrador';
      saveEvent(d, promos, { status, user });
      if (status === 'pendiente') notifyAdmins(`${org.name} envió "${d.title}" a aprobación.`);
      toast('Evento guardado', 'success'); location.hash = `#/eventos/${ev.id}`;
    } });
  return { static: true };
}
