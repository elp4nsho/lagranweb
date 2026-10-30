// Inicio del residente: saldo, encomiendas, próximas reservas, votaciones y notificaciones.
import { escape, money, ago, date } from '../../../assets/core/ui.js';
import { settings, unitDebt, isPublished } from '../data/db.js';
import { periodLabel, dueDate, badge, TSTATUS } from '../shared/format.js';
import { icon } from '../shared/icons.js';
import { pageHead } from '../shared/kit.js';

export function renderHome(el, p, q, { db, user }, { unit }) {
  const s = settings();
  const debt = unitDebt(unit.id, s);
  const unpaid = db.query('charges', c => isPublished(c.period) && c.unitId === unit.id && !c.paid).sort((a, b) => a.period.localeCompare(b.period));
  const parcels = db.query('parcels', x => x.unitId === unit.id && x.status === 'conserjeria');
  const books = db.query('bookings', b => b.unitId === unit.id && b.status === 'confirmada' && b.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date));
  const polls = db.query('polls', x => x.status === 'abierta' && !x.votes.some(v => v.unitId === unit.id));
  const tickets = db.query('tickets', t => t.unitId === unit.id && !['cerrado'].includes(t.status)).slice(0, 3);
  const notifs = db.query('notifications', n => n.unitId === unit.id || n.unitId === '*').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const ann = db.query('announcements', a => a.published).sort((a, b) => (b.pinned - a.pinned) || b.createdAt.localeCompare(a.createdAt))[0];
  el.innerHTML = `${pageHead(`Hola, ${user.name.split(' ')[0]}`, `${escape(s.community)} · Torre ${unit.tower}, depto ${unit.number} · alícuota ${unit.alicuota.toLocaleString('es-CL')}%`)}
    <div class="grid-2">
      <div class="card stack" style="gap:8px"><span class="muted small">Saldo pendiente</span><span class="money-big">${money(debt)}</span>
        ${unpaid.length ? `<span class="small">${unpaid.map(c => periodLabel(c.period)).join(', ')} · vence ${date(dueDate(unpaid.at(-1).period, s.dueDay))}</span><div class="row"><a class="btn btn-primary" href="#/gastos?pagar=1">Pagar ahora</a><a class="btn" href="#/gastos">Ver detalle</a></div>` : '<span class="badge badge-success">Estás al día. ¡Gracias!</span>'}</div>
      <div class="card"><h3>Avisos para ti</h3>${notifs.map(n => `<a class="list-row small" href="${escape(n.link || '#/')}" data-read="${n.id}" style="color:var(--text);text-decoration:none"><span>${n.read ? '' : '<b>• </b>'}${escape(n.text)}</span><span class="muted nowrap">${ago(n.createdAt)}</span></a>`).join('') || '<p class="muted">Sin notificaciones.</p>'}</div>
    </div>
    <div class="tile-grid">
      <a class="card tile" href="#/encomiendas"><span class="icon-tile">${icon('box', 22)}</span><span><b>${parcels.length} encomienda${parcels.length === 1 ? '' : 's'}</b><span class="muted small">en conserjería</span></span></a>
      <a class="card tile" href="#/reservas"><span class="icon-tile">${icon('calendar', 22)}</span><span><b>${books.length ? escape(db.get('spaces', books[0].spaceId)?.name) : 'Sin reservas'}</b><span class="muted small">${books.length ? date(books[0].date + 'T12:00') + ' · ' + books[0].slot : 'Reserva quinchos y piscina'}</span></span></a>
      <a class="card tile" href="#/visitas"><span class="icon-tile">${icon('qr', 22)}</span><span><b>Autorizar visita</b><span class="muted small">Genera un código QR</span></span></a>
      <a class="card tile" href="#/votaciones"><span class="icon-tile">${icon('vote', 22)}</span><span><b>${polls.length ? polls.length + ' votación pendiente' : 'Votaciones'}</b><span class="muted small">${polls.length ? escape(polls[0].title) : 'Sin votaciones abiertas'}</span></span></a>
    </div>
    <div class="grid-2">
      ${ann ? `<div class="card ann ${ann.pinned ? 'pinned' : ''}"><span class="badge plain">${escape(ann.category)}</span><h3 style="margin-top:8px">${escape(ann.title)}</h3><p class="muted">${escape(ann.body)}</p><a class="btn btn-sm" href="#/avisos">Ver todos los avisos</a></div>` : ''}
      <div class="card"><div class="row between"><h3 style="margin:0">Mis solicitudes</h3><a class="btn btn-sm" href="#/incidencias?nueva=1">+ Reportar</a></div>${tickets.map(t => `<a class="list-row" href="#/incidencias/${t.id}" style="color:var(--text);text-decoration:none"><span><b>#${t.number}</b> ${escape(t.title)}</span>${badge(TSTATUS, t.status)}</a>`).join('') || '<p class="muted">No tienes solicitudes abiertas.</p>'}</div>
    </div>`;
  el.querySelectorAll('[data-read]').forEach(a => a.addEventListener('click', () => db.update('notifications', a.dataset.read, { read: true })));
}
