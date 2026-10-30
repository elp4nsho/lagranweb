// Pantalla de cocina (KDS): comandas por estación, temporizadores con color por atraso, bump y recall.
import { escape, toast, modal, time } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { settings, STATIONS, patchItems, dishName } from '../shared/logic.js';

let user;
try { user = auth.require(['admin', 'chef']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
const KEY = 'lgw:menu:kds-station';
let station = (() => { try { return localStorage.getItem(KEY) || 'all'; } catch (e) { return 'all'; } })();
let mobileCol = 'nuevo';
const RECALL_WINDOW = 20 * 6e4;

function tickets() {
  const now = Date.now();
  const out = [];
  db.query('orders', o => !['pagado', 'cancelado'].includes(o.status)).forEach(o => {
    const items = o.items.filter(i => i.status !== 'anulado' && (station === 'all' || i.station === station));
    if (!items.length) return;
    let col;
    if (items.every(i => ['listo', 'entregado'].includes(i.status))) {
      const last = Math.max(...items.map(i => +new Date(i.readyAt || o.createdAt)));
      if (items.every(i => i.status === 'entregado') && now - last > RECALL_WINDOW) return;
      if (now - last > 2 * RECALL_WINDOW) return;
      col = 'listo';
    } else col = items.some(i => i.status !== 'pendiente') ? 'prep' : 'nuevo';
    out.push({ o, items, col });
  });
  return out.sort((a, b) => a.o.createdAt.localeCompare(b.o.createdAt));
}

const elapsed = iso => Math.max(0, Math.floor((Date.now() - new Date(iso)) / 1000));
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const level = s => { const c = settings(); return s >= (c.kdsLate || 18) * 60 ? 'late' : s >= (c.kdsWarn || 10) * 60 ? 'warn' : 'ok'; };

function ticketHtml({ o, items, col }) {
  const s = elapsed(o.createdAt);
  const fresh = Date.now() - new Date(o.createdAt) < 20000;
  return `<article class="ticket lvl-${col === 'listo' ? 'done' : level(s)} ${fresh ? 'fresh' : ''}" data-o="${o.id}">
    <header class="ticket-head"><b>#${o.number}</b><span>Mesa ${o.tableNumber}</span><span class="timer" data-start="${o.createdAt}" ${col === 'listo' ? 'data-stop' : ''}>${col === 'listo' ? '✓ ' + time(items.map(i => i.readyAt).filter(Boolean).sort().pop() || o.createdAt) : fmt(s)}</span></header>
    <div class="ticket-meta small">${o.source === 'mesa' ? '📱 QR' : '🧑‍🍳 ' + escape(db.get('users', o.waiterId)?.name.split(' ')[0] || 'Garzón')} · ${time(o.createdAt)}</div>
    ${o.note ? `<div class="ticket-note small">📝 ${escape(o.note)}</div>` : ''}
    <ul class="ticket-items">${items.map(i => `<li class="ti st-${i.status}" ${col === 'prep' ? `data-item="${i.id}" role="button" tabindex="0" aria-pressed="${i.status === 'listo'}"` : ''}>
      <span class="ti-qty">${i.qty}×</span><span class="ti-name">${escape(dishName(i))}${station === 'all' ? ` <small class="muted">· ${escape(STATIONS[i.station] || '')}</small>` : ''}${i.mods?.length ? `<small class="d-block">${escape(i.mods.join(' · '))}</small>` : ''}${i.note ? `<small class="d-block ti-warn">⚠ ${escape(i.note)}</small>` : ''}</span>
      <span class="ti-check" aria-hidden="true">${i.status === 'listo' || i.status === 'entregado' ? '✓' : ''}</span></li>`).join('')}</ul>
    <footer class="ticket-foot">${col === 'nuevo' ? `<button class="btn btn-block" data-start-o="${o.id}">▶ Comenzar</button>` : col === 'prep' ? `<button class="btn btn-primary btn-block" data-bump="${o.id}">✓ Listo</button>` : `<button class="btn btn-ghost btn-block" data-recall="${o.id}">↺ Recuperar</button>`}</footer>
  </article>`;
}

function render() {
  if (!user) return;
  const list = tickets();
  const cols = [['nuevo', 'Nuevos', '🆕'], ['prep', 'En preparación', '🔥'], ['listo', 'Listos para servir', '✅']];
  const counts = Object.fromEntries(Object.keys(STATIONS).map(k => [k, db.query('orders', o => !['pagado', 'cancelado'].includes(o.status)).reduce((a, o) => a + o.items.filter(i => i.station === k && ['pendiente', 'preparando'].includes(i.status)).length, 0)]));
  const late = list.filter(t => t.col !== 'listo' && level(elapsed(t.o.createdAt)) === 'late').length;
  app.innerHTML = `<header class="kds-top">
      <a class="brand" href="${user.role === 'admin' ? 'admin.html' : 'cocina.html'}"><span class="brand-mark" aria-hidden="true">👨‍🍳</span><span class="brand-name">Cocina</span></a>
      <div class="row chips kds-stations" role="tablist" aria-label="Estación">
        <button class="chip ${station === 'all' ? 'active' : ''}" data-st="all">Todas</button>
        ${Object.entries(STATIONS).map(([k, v]) => `<button class="chip ${station === k ? 'active' : ''}" data-st="${k}">${escape(v)}${counts[k] ? ` <b>${counts[k]}</b>` : ''}</button>`).join('')}
      </div>
      <span class="grow"></span>
      ${late ? `<span class="badge badge-danger">${late} atrasados</span>` : ''}
      <button class="btn btn-sm" data-86>🚫 Agotados</button>
      <b class="clock mono" id="clock"></b>
      <span class="avatar" style="--av:${escape(user.color)}" title="${escape(user.name)}">${escape(initials(user.name))}</span>
      ${user.role === 'admin' ? '<a class="btn btn-sm btn-ghost" href="admin.html">Panel</a>' : ''}
      <button class="btn btn-sm btn-ghost" data-out>Salir</button>
    </header>
    <div class="tabs kds-mobile-tabs">${cols.map(([k, l]) => `<button class="tab ${mobileCol === k ? 'active' : ''}" data-mc="${k}">${l} (${list.filter(t => t.col === k).length})</button>`).join('')}</div>
    <main class="kds-board">${cols.map(([k, l, ic]) => `<section class="kds-col ${mobileCol === k ? 'm-show' : ''}" aria-label="${l}"><h2 class="kds-col-head">${ic} ${l} <span class="badge plain">${list.filter(t => t.col === k).length}</span></h2>
      <div class="kds-stack">${list.filter(t => t.col === k).map(ticketHtml).join('') || '<div class="empty small">Sin comandas</div>'}</div></section>`).join('')}</main>`;
  tick();
}

function tick() {
  const c = document.getElementById('clock');
  if (c) c.textContent = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.querySelectorAll('.timer[data-start]:not([data-stop])').forEach(t => {
    const s = elapsed(t.dataset.start);
    t.textContent = fmt(s);
    const card = t.closest('.ticket');
    const lv = level(s);
    if (!card.classList.contains('lvl-' + lv)) { card.classList.remove('lvl-ok', 'lvl-warn', 'lvl-late'); card.classList.add('lvl-' + lv); }
  });
}

function open86() {
  const body = document.createElement('div');
  const paint = () => {
    const cats = db.all('categories').sort((a, b) => a.order - b.order);
    body.innerHTML = `<p class="muted small">Lo que marques como agotado desaparece de los pedidos de las mesas al instante.</p>${cats.map(c => `<h4>${escape(c.icon + ' ' + c.name.es)}</h4><div class="stack" style="gap:6px">${db.query('dishes', d => d.cat === c.id).map(d => `<label class="row between avail-row"><span>${escape(d.emoji)} ${escape(d.name.es)}</span><span class="row" style="gap:8px">${d.available === false ? '<span class="badge badge-danger">Agotado</span>' : ''}<span class="switch"><input type="checkbox" data-av="${d.id}" ${d.available !== false ? 'checked' : ''} aria-label="Disponible ${escape(d.name.es)}"><span></span></span></span></label>`).join('')}</div>`).join('')}`;
  };
  paint();
  modal({ title: 'Disponibilidad de platos', body, foot: '<button class="btn btn-primary" data-close>Listo</button>' });
  body.addEventListener('change', e => {
    const s = e.target.closest('[data-av]'); if (!s) return;
    const d = db.get('dishes', s.dataset.av);
    db.update('dishes', d.id, { available: s.checked });
    db.log('carta', `${d.name.es} ${s.checked ? 'disponible' : 'AGOTADO'} (cocina)`, user.id);
    toast(`${d.name.es}: ${s.checked ? 'disponible' : 'agotado'}`, s.checked ? 'success' : 'warning');
    paint();
  });
}

app.addEventListener('click', e => {
  const b = e.target.closest('button, [data-item]');
  if (!b) return;
  if (b.dataset.st) { station = b.dataset.st; try { localStorage.setItem(KEY, station); } catch (err) { /* sin storage */ } render(); return; }
  if (b.dataset.mc) { mobileCol = b.dataset.mc; render(); return; }
  if (b.hasAttribute('data-86')) return open86();
  if (b.hasAttribute('data-out')) { auth.logout(); location.href = 'login.html'; return; }
  const inScope = i => station === 'all' || i.station === station;
  const now = new Date().toISOString();
  if (b.dataset.startO) { const o = db.get('orders', b.dataset.startO); patchItems(o.id, i => inScope(i) && i.status === 'pendiente' ? { status: 'preparando', startedAt: now } : null); db.log('cocina', `Comenzó pedido #${o.number}`, user.id); return; }
  if (b.dataset.bump) { const o = db.get('orders', b.dataset.bump); patchItems(o.id, i => inScope(i) && ['pendiente', 'preparando'].includes(i.status) ? { status: 'listo', readyAt: now } : null); db.log('cocina', `Pedido #${o.number} listo (Mesa ${o.tableNumber})`, user.id); toast(`#${o.number} listo · Mesa ${o.tableNumber}`, 'success', 1800); return; }
  if (b.dataset.recall) { const o = db.get('orders', b.dataset.recall); patchItems(o.id, i => inScope(i) && ['listo', 'entregado'].includes(i.status) ? { status: 'preparando', readyAt: null } : null); db.log('cocina', `Pedido #${o.number} recuperado`, user.id); toast(`#${o.number} devuelto a preparación`, 'info'); return; }
  if (b.dataset.item) {
    const oid = b.closest('.ticket').dataset.o;
    patchItems(oid, i => i.id === b.dataset.item ? (i.status === 'listo' ? { status: 'preparando', readyAt: null } : { status: 'listo', readyAt: now }) : null);
  }
});
app.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-item]')) { e.preventDefault(); e.target.click(); } });

let known = new Set(db.all('orders').map(o => o.id));
db.subscribe(() => {
  const now = db.all('orders');
  const fresh = now.filter(o => !known.has(o.id) && o.items.some(i => station === 'all' || i.station === station));
  if (fresh.length) toast(`🆕 Nueva comanda #${fresh[0].number} · Mesa ${fresh[0].tableNumber}`, 'info');
  known = new Set(now.map(o => o.id));
  if (document.querySelector('.modal-backdrop')) return;
  render();
});
setInterval(tick, 1000);
setInterval(() => { if (!document.querySelector('.modal-backdrop')) render(); }, 30000);
render();
