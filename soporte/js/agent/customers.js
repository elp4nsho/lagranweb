// Clientes: listado y ficha con historial de tickets, CSAT y chats.
import { db } from '../data/db.js';
import { escape, date, ago, dataTable } from '../../../assets/core/ui.js';
import { status as statusOf, isOpen } from '../shared/constants.js';
import { pageHead, kpi } from '../shared/shell.js';
import { avatar, exportCSV } from '../shared/util.js';
import { icon } from '../shared/icons.js';
import { newTicketModal } from './ticket.js';

export function render(view, { params }) {
  if (params.id) return detail(view, params.id);
  const rows = db.query('users', u => u.role === 'cliente').map(u => { const ts = db.query('tickets', t => t.customerId === u.id); return { ...u, tickets: ts.length, open: ts.filter(isOpen).length, csat: avg(ts.filter(t => t.csat).map(t => t.csat.rating)) }; });
  view.innerHTML = `${pageHead('Clientes', `${rows.length} clientes con cuenta`, `<button class="btn" data-export>${icon('upload', 16)} CSV</button>`)}<div class="card" data-table></div>`;
  dataTable(view.querySelector('[data-table]'), {
    rows, pageSize: 15, search: u => `${u.name} ${u.email} ${u.rut} ${u.commune} ${u.plan}`,
    columns: [
      { key: 'name', label: 'Cliente', render: u => `<span class="user-chip">${avatar(u, 28)}<span><a href="#/clientes/${u.id}"><b>${escape(u.name)}</b></a><br><small class="muted">${escape(u.email)}</small></span></span>` },
      { key: 'plan', label: 'Plan' }, { key: 'commune', label: 'Comuna' }, { key: 'tickets', label: 'Tickets' },
      { key: 'open', label: 'Abiertos', render: u => u.open ? `<span class="badge badge-warning">${u.open}</span>` : '0' },
      { key: 'csat', label: 'CSAT', render: u => u.csat ? `${u.csat.toFixed(1)} ★` : '—' }
    ],
    onRow: u => { location.hash = `#/clientes/${u.id}`; }
  });
  view.querySelector('[data-export]').onclick = () => exportCSV('clientes.csv', rows.map(u => ({ nombre: u.name, correo: u.email, rut: u.rut, plan: u.plan, comuna: u.commune, tickets: u.tickets, abiertos: u.open })));
}
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

function detail(view, id) {
  const u = db.get('users', id);
  if (!u || u.role !== 'cliente') { view.innerHTML = '<div class="card empty"><h2>Cliente no encontrado</h2><a class="btn" href="#/clientes">Volver</a></div>'; return; }
  const ts = db.query('tickets', t => t.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const chats = db.query('chats', c => c.customerId === id || (c.email && c.email === u.email));
  const rated = ts.filter(t => t.csat);
  view.innerHTML = `<a class="btn btn-ghost btn-sm back" href="#/clientes">${icon('back', 16)} Clientes</a>
    ${pageHead(u.name, `${escape(u.plan || '')} · ${escape(u.address || '')}, ${escape(u.commune || '')}`, `<button class="btn btn-primary" data-new>${icon('plus', 16)} Ticket para este cliente</button>`)}
    <div class="grid-4">${kpi('Tickets', ts.length)}${kpi('Abiertos', ts.filter(isOpen).length)}${kpi('CSAT promedio', rated.length ? avg(rated.map(t => t.csat.rating)).toFixed(1) + ' ★' : '—')}${kpi('Cliente desde', `<span class="small-value">${date(u.createdAt, { month: 'short', year: 'numeric' })}</span>`)}</div>
    <div class="detail-grid"><section class="card stack"><h3 style="margin:0">Tickets</h3>
      <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Asunto</th><th>Estado</th><th>Creado</th><th>CSAT</th></tr></thead><tbody>${ts.map(t => `<tr><td class="mono">${t.number}</td><td><a href="#/ticket/${t.id}">${escape(t.subject)}</a></td><td><span class="badge badge-${statusOf(t.status).badge}">${statusOf(t.status).name}</span></td><td>${ago(t.createdAt)}</td><td>${t.csat ? '★'.repeat(t.csat.rating) : '—'}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty small">Sin tickets</div></td></tr>'}</tbody></table></div></section>
      <aside class="stack"><section class="card stack"><h3 style="margin:0">Datos</h3><ul class="kv small"><li><span>Correo</span><b class="trunc">${escape(u.email)}</b></li><li><span>Teléfono</span><b>${escape(u.phone || '—')}</b></li><li><span>RUT</span><b>${escape(u.rut || '—')}</b></li><li><span>Estado cuenta</span><b>${u.active === false ? 'Desactivada' : 'Activa'}</b></li></ul></section>
      <section class="card stack"><h3 style="margin:0">Chats (${chats.length})</h3>${chats.map(c => `<a href="#/chats" class="hist-row"><span>${escape(c.messages.find(m => m.from === 'cliente')?.body || 'Chat')}</span><small class="muted">${c.status} · ${ago(c.createdAt)}</small></a>`).join('') || '<small class="muted">Sin chats</small>'}</section>
      <section class="card stack"><h3 style="margin:0">Comentarios CSAT</h3>${rated.filter(t => t.csat.comment).map(t => `<p class="small" style="margin:0">${'★'.repeat(t.csat.rating)} “${escape(t.csat.comment)}”</p>`).join('') || '<small class="muted">Sin comentarios</small>'}</section></aside></div>`;
  view.querySelector('[data-new]').onclick = () => newTicketModal({ customerId: id });
}
