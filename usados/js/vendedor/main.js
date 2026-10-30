// App del vendedor: bandeja de leads, agenda semanal de test drives/visitas, cotizaciones, contratos y mis ventas.
import { escape, money, ago, date, toast } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { LEAD_TYPES, LEAD_STATES, SLOTS } from '../data/catalog.js';
import { carName, statusBadge, branchById, userById } from '../shared/domain.js';
import { leadDetail, contractDoc, quoteDoc } from '../shared/sales.js';
import { ymd, addDays, fmtDay, DAY } from '../shared/util.js';

let user;
try { user = auth.require(['admin', 'gerente', 'vendedor']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
let scope = user?.role === 'vendedor' ? 'mine' : 'all', type = '';
const TONE = { 'test-drive': 'primary', visita: 'info', tasacion: 'warning', reserva: 'success', financiamiento: 'accent', contacto: 'info' };

function top(active) {
  return `<header class="role-top"><span class="brand-mark" aria-hidden="true">✓</span><div class="grow"><b>Ventas</b><small class="muted d-block">${escape(user.name)} · ${escape(branchById(user.branchId)?.name || auth.roleName(user.role))}</small></div>
    <nav class="row" style="gap:4px" aria-label="Secciones"><a class="btn btn-sm ${active === 'inbox' ? 'btn-primary' : 'btn-ghost'}" href="#/">Bandeja</a><a class="btn btn-sm ${active === 'agenda' ? 'btn-primary' : 'btn-ghost'}" href="#/agenda">Agenda</a><a class="btn btn-sm ${active === 'ventas' ? 'btn-primary' : 'btn-ghost'}" href="#/ventas">Mis ventas</a></nav>
    ${user.role !== 'vendedor' ? '<a class="btn btn-sm btn-ghost hide-sm" href="admin.html">Panel</a>' : ''}<span class="avatar hide-sm" style="--av:${escape(user.color)}">${escape(initials(user.name))}</span><button class="btn btn-sm btn-ghost" data-out>Salir</button></header>`;
}
const visible = l => scope === 'all' || (scope === 'mine' ? l.sellerId === user.id : !l.sellerId);
function inbox() {
  const all = db.all('leads'), mine = all.filter(l => l.sellerId === user.id), m30 = mine.filter(l => Date.now() - new Date(l.createdAt) < 30 * DAY);
  const list = all.filter(l => visible(l) && (!type || l.type === type) && !['ganado', 'perdido'].includes(l.status)).sort((a, b) => (a.status === 'nuevo' ? 0 : 1) - (b.status === 'nuevo' ? 0 : 1) || b.createdAt.localeCompare(a.createdAt));
  const salesM = db.query('sales', s => s.sellerId === user.id && s.date.slice(0, 7) === ymd().slice(0, 7));
  app.innerHTML = `${top('inbox')}<main class="role-wrap">
    <div class="kpi-grid"><div class="card stat"><span class="label">Nuevos sin atender</span><span class="value">${all.filter(l => l.status === 'nuevo' && (l.sellerId === user.id || !l.sellerId)).length}</span></div><div class="card stat"><span class="label">En negociación</span><span class="value">${mine.filter(l => l.status === 'negociacion').length}</span></div>
      <div class="card stat"><span class="label">Ventas del mes</span><span class="value">${salesM.length}</span><span class="delta up">${money(salesM.reduce((a, s) => a + s.price, 0))}</span></div><div class="card stat"><span class="label">Conversión 30 d</span><span class="value">${m30.length ? Math.round(m30.filter(l => l.status === 'ganado').length / m30.length * 100) : 0}%</span></div></div>
    <div class="row between"><div class="tabs"><button class="tab ${scope === 'mine' ? 'active' : ''}" data-scope="mine">Mis leads</button><button class="tab ${scope === 'free' ? 'active' : ''}" data-scope="free">Sin asignar (${all.filter(l => !l.sellerId && !['ganado', 'perdido'].includes(l.status)).length})</button><button class="tab ${scope === 'all' ? 'active' : ''}" data-scope="all">Todos</button></div>
      <select class="select sm" id="ltype" aria-label="Tipo de lead"><option value="">Todos los tipos</option>${Object.entries(LEAD_TYPES).map(([k, t]) => `<option value="${k}" ${type === k ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}</select></div>
    <div class="stack" style="gap:8px">${list.slice(0, 40).map(l => `<div class="card lead-row ${l.status === 'nuevo' ? 'unread' : ''}" role="button" tabindex="0" data-lead="${l.id}"><span style="font-size:22px" aria-hidden="true">${LEAD_TYPES[l.type]?.icon || '•'}</span>
      <span style="min-width:0"><b>${escape(l.name)}</b> <small class="muted">· ${escape(LEAD_TYPES[l.type]?.label || '')}${l.carId ? ' · ' + escape(carName(db.get('cars', l.carId))) : ''}</small><small class="muted d-block">${ago(l.createdAt)}${l.scheduledAt ? ' · 📅 ' + fmtDay(l.scheduledAt.slice(0, 10), { weekday: true }) + ' ' + l.scheduledAt.slice(11) : ''}${l.quote ? ' · 💼 cotizado' : ''}${l.sellerId && l.sellerId !== user.id ? ' · ' + escape(userById(l.sellerId)?.name || '') : ''}</small></span>
      <span class="row" style="gap:6px">${statusBadge(LEAD_STATES, l.status)}${!l.sellerId ? `<button class="btn btn-sm btn-primary" data-take="${l.id}">Tomar</button>` : ''}</span></div>`).join('') || '<div class="card empty">Bandeja al día. 🎉</div>'}</div></main>`;
}
function agenda() {
  const days = Array.from({ length: 6 }, (_, i) => ymd(addDays(new Date(), i)));
  const evs = db.query('leads', l => l.scheduledAt && days.includes(l.scheduledAt.slice(0, 10)) && (user.role !== 'vendedor' || l.sellerId === user.id || !l.sellerId) && l.status !== 'perdido');
  app.innerHTML = `${top('agenda')}<main class="role-wrap"><div class="row between"><h1 style="margin:0">Agenda de la semana</h1><span class="muted small">${evs.length} citas · test drives, visitas e inspecciones de tasación</span></div>
    <div class="card"><div class="week-cal"><div class="h"></div>${days.map(d => `<div class="h">${fmtDay(d, { weekday: true })}</div>`).join('')}
    ${SLOTS.map(s => `<div class="h">${s}</div>${days.map(d => `<div>${evs.filter(l => l.scheduledAt === `${d}T${s}`).map(l => `<a class="ev tone-${TONE[l.type]}" href="#/lead/${l.id}"><b>${LEAD_TYPES[l.type]?.icon} ${escape(l.name.split(' ')[0])}</b><br><small class="muted">${l.carId ? escape(carName(db.get('cars', l.carId))) : escape(LEAD_TYPES[l.type]?.label || '')}</small></a>`).join('')}</div>`).join('')}`).join('')}</div></div>
    <div class="row small muted" style="gap:14px">${Object.entries(LEAD_TYPES).filter(([k]) => ['test-drive', 'visita', 'tasacion'].includes(k)).map(([k, t]) => `<span>${t.icon} ${t.label}</span>`).join('')}</div></main>`;
}
function ventas() {
  const mine = db.query('sales', s => user.role !== 'vendedor' || s.sellerId === user.id).sort((a, b) => b.date.localeCompare(a.date));
  const quotes = db.query('leads', l => l.quote && (user.role !== 'vendedor' || l.sellerId === user.id) && !['ganado', 'perdido'].includes(l.status));
  app.innerHTML = `${top('ventas')}<main class="role-wrap">
    <h2 style="margin:0">Cotizaciones abiertas (${quotes.length})</h2>
    <div class="stack" style="gap:8px">${quotes.map(l => `<div class="card row between"><span><b>${escape(l.name)}</b> · ${escape(carName(db.get('cars', l.carId)))}<small class="muted d-block">${escape(l.quote.code)} · ${date(l.quote.at)} · ${money(l.quote.total)}</small></span><span class="row"><button class="btn btn-sm" data-q="${l.id}">Ver</button><button class="btn btn-sm btn-primary" data-lead="${l.id}">Gestionar</button></span></div>`).join('') || '<p class="muted">Sin cotizaciones abiertas.</p>'}</div>
    <h2 style="margin:0">Ventas (${mine.length})</h2>
    <div class="table-wrap"><table class="table"><thead><tr><th>Venta</th><th>Fecha</th><th>Auto</th><th>Comprador</th><th>Precio</th><th>Margen</th><th></th></tr></thead><tbody>${mine.slice(0, 30).map(s => `<tr><td class="mono">${s.code}</td><td>${date(s.date)}</td><td>${escape(carName(db.get('cars', s.carId)))}</td><td>${escape(s.name)}</td><td>${money(s.price)}</td><td>${money(s.margin)}</td><td><button class="btn btn-sm" data-contract="${s.id}">Contrato</button></td></tr>`).join('')}</tbody></table></div></main>`;
}
const router = user && createRouter({ '/': () => inbox(), '/agenda': () => agenda(), '/ventas': () => ventas(), '/lead/:id': ({ id }) => { inbox(); const m = leadDetail(id, user); const back = new MutationObserver(() => { if (!document.body.contains(m.el)) { back.disconnect(); history.replaceState(null, '', '#/'); } }); back.observe(document.body, { childList: true }); } }, { notFound: () => router.go('/') });
app.addEventListener('click', e => {
  const t = e.target.closest('[data-take]');
  if (t) { e.stopPropagation(); const l = db.get('leads', t.dataset.take); db.update('leads', l.id, { sellerId: user.id, status: l.status === 'nuevo' ? 'contactado' : l.status }); db.log('leads', `${user.name} tomó el lead de ${l.name}`, user.id); toast('Lead asignado a ti', 'success'); return; }
  const l = e.target.closest('[data-lead]'); if (l) { leadDetail(l.dataset.lead, user); return; }
  const s = e.target.closest('[data-scope]'); if (s) { scope = s.dataset.scope; inbox(); return; }
  const c = e.target.closest('[data-contract]'); if (c) { contractDoc(db.get('sales', c.dataset.contract)); return; }
  const q = e.target.closest('[data-q]'); if (q) { quoteDoc(db.get('leads', q.dataset.q)); return; }
  if (e.target.closest('[data-out]')) { auth.logout(); location.href = 'login.html'; }
});
app.addEventListener('keydown', e => { if (e.key === 'Enter') { const l = e.target.closest('[data-lead]'); if (l) leadDetail(l.dataset.lead, user); } });
app.addEventListener('change', e => { if (e.target.id === 'ltype') { type = e.target.value; inbox(); } });
if (user) {
  db.subscribe(() => { if (document.querySelector('.modal-backdrop')) return; const y = scrollY; const p = router.current?.pattern; if (p === '/lead/:id') return; router.refresh(); scrollTo(0, y); });
  new MutationObserver(() => { if (!document.querySelector('.modal-backdrop') && router.current?.pattern !== '/lead/:id') { const y = scrollY; ({ '/': inbox, '/agenda': agenda, '/ventas': ventas }[router.current?.pattern] || (() => {}))(); scrollTo(0, y); } }).observe(document.body, { childList: true });
  router.start();
}
