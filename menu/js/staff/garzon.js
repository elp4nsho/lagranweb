// App del garzón: plano de mesas en vivo, tomar pedidos, avisos de platos listos y llamados.
import { escape, toast, modal, money, ago, time, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { tableState, TABLE_STATES, ITEM_STATES, sessionOrders, sessionTotals, sendOrder, openSession, attendCall, freeTable, patchItems, dishName, TAGS } from '../shared/logic.js';
import { floorHtml, legendHtml } from '../shared/floor.js';
import { chargeModal } from '../shared/charge.js';

let user;
try { user = auth.require(['admin', 'garzon', 'cajero']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
let tab = 'plano', zone = 'Todas', openSheet = null;

const readyItems = () => db.query('orders', o => !['pagado', 'cancelado'].includes(o.status)).flatMap(o => o.items.filter(i => i.status === 'listo').map(i => ({ o, i })));
const pendingCalls = () => db.query('calls', c => c.status === 'pendiente').sort((a, b) => a.createdAt.localeCompare(b.createdAt));

function render() {
  if (!user) return;
  const tables = db.all('tables').sort((a, b) => a.number - b.number);
  const ready = readyItems(), calls = pendingCalls();
  const alerts = ready.length + calls.length;
  const counts = Object.fromEntries(Object.keys(TABLE_STATES).map(k => [k, tables.filter(t => tableState(t) === k).length]));
  const shown = zone === 'Todas' ? tables : tables.filter(t => t.zone === zone);
  app.innerHTML = `<header class="kds-top waiter-top">
      <a class="brand" href="garzon.html"><span class="brand-mark" aria-hidden="true">🍽️</span><span class="brand-name">Salón</span></a>
      <span class="grow"></span>
      <button class="btn btn-sm ${alerts ? 'btn-accent' : ''}" data-tab="avisos" aria-label="Avisos">🔔 <b>${alerts}</b></button>
      <span class="avatar" style="--av:${escape(user.color)}" title="${escape(user.name)}">${escape(initials(user.name))}</span>
      ${user.role !== 'garzon' ? '<a class="btn btn-sm btn-ghost" href="admin.html">Panel</a>' : ''}
      <button class="btn btn-sm btn-ghost" data-out>Salir</button>
    </header>
    <div class="container waiter-wrap stack">
      <div class="tabs"><button class="tab ${tab === 'plano' ? 'active' : ''}" data-tab="plano">Plano</button><button class="tab ${tab === 'avisos' ? 'active' : ''}" data-tab="avisos">Avisos${alerts ? ` <span class="pill">${alerts}</span>` : ''}</button><button class="tab ${tab === 'lista' ? 'active' : ''}" data-tab="lista">Mesas</button></div>
      ${tab === 'plano' ? `
        <div class="live-grid">${Object.entries(counts).map(([k, n]) => `<div class="live-cell st-${k}"><b>${n}</b><small>${TABLE_STATES[k].label}</small></div>`).join('')}</div>
        <div class="row chips">${['Todas', 'Salón', 'Terraza', 'Barra'].map(z => `<button class="chip ${zone === z ? 'active' : ''}" data-zone="${z}">${z}</button>`).join('')}</div>
        <div class="card floor-card">${floorHtml(shown)}</div>${legendHtml()}`
      : tab === 'avisos' ? avisosHtml(ready, calls)
      : `<div class="grid-auto">${tables.map(t => { const s = tableState(t); const sess = t.sessionId && db.get('sessions', t.sessionId); return `<button class="card tcard st-${s}" data-t="${t.id}"><div class="row between"><b>Mesa ${t.number}</b><span class="badge badge-${TABLE_STATES[s].badge}">${TABLE_STATES[s].label}</span></div><small class="muted">${escape(t.zone)} · ${t.seats} puestos${sess ? ` · ${sess.guests} pers. · ${ago(sess.openedAt)}` : ''}</small>${sess ? `<b>${money(sessionTotals(sess.id).subtotal)}</b>` : ''}</button>`; }).join('')}</div>`}
    </div>`;
}

function avisosHtml(ready, calls) {
  return `<div class="grid-2">
    <section class="card stack"><h3 style="margin:0">🍽️ Platos listos para llevar (${ready.length})</h3>
      ${ready.length ? `<ul class="notif-list">${ready.map(({ o, i }) => `<li><span><b>Mesa ${o.tableNumber}</b> · ${i.qty}× ${escape(dishName(i))}<small class="muted d-block">#${o.number} · listo ${i.readyAt ? ago(i.readyAt) : ''}</small></span><button class="btn btn-sm btn-primary" data-deliver="${o.id}|${i.id}">Entregar</button></li>`).join('')}</ul>
        <button class="btn btn-sm" data-deliver-all>Entregar todo</button>` : '<p class="muted">Nada pendiente. 👌</p>'}
    </section>
    <section class="card stack"><h3 style="margin:0">🛎️ Llamados (${calls.length})</h3>
      ${calls.length ? `<ul class="notif-list">${calls.map(c => `<li><span><b>Mesa ${c.tableNumber}</b> · ${c.type === 'cuenta' ? 'pide la cuenta' : 'llama al garzón'}<small class="muted d-block">${ago(c.createdAt)}</small></span>${c.type === 'cuenta' ? `<button class="btn btn-sm btn-primary" data-charge-t="${c.tableId}">Cobrar</button>` : `<button class="btn btn-sm btn-primary" data-attend="${c.id}">Atender</button>`}</li>`).join('')}</ul>` : '<p class="muted">Sin llamados.</p>'}
    </section></div>`;
}

function tableSheet(tid) {
  const body = document.createElement('div');
  body.className = 'stack';
  const m = modal({ title: '', body, foot: '<span></span>', onClose: () => { openSheet = null; } });
  openSheet = { tid, paint };
  function paint() {
    const t = db.get('tables', tid);
    if (!t) { m.close(); return; }
    const s = tableState(t);
    const sess = t.sessionId && db.get('sessions', t.sessionId);
    const orders = sess ? sessionOrders(sess.id) : [];
    m.el.querySelector('.modal-head h3').textContent = `Mesa ${t.number} · ${t.zone}`;
    body.innerHTML = `<div class="row between"><span class="badge badge-${TABLE_STATES[s].badge}">${TABLE_STATES[s].label}</span><small class="muted">${t.seats} puestos${sess ? ` · ${sess.guests} personas · abierta ${time(sess.openedAt)}` : ''}</small></div>
      ${t.calling ? `<div class="callout small row between">🛎️ La mesa está llamando <button class="btn btn-sm btn-primary" data-attend-t="${t.id}">Atendido</button></div>` : ''}
      ${t.billRequested ? '<div class="callout small">🧾 Pidió la cuenta</div>' : ''}
      ${!sess ? `<div class="field"><label for="gs">Personas</label><select class="select" id="gs">${Array.from({ length: t.seats }, (_, i) => `<option ${i + 1 === Math.min(2, t.seats) ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>` : ''}
      ${orders.length ? orders.map(o => `<div class="order-mini"><div class="row between small"><b>#${o.number}</b><span class="muted">${time(o.createdAt)} · ${o.source === 'mesa' ? 'QR' : 'garzón'}</span></div>
        <ul class="item-status">${o.items.map(i => `<li><span>${i.qty}× ${escape(dishName(i))}${i.mods?.length ? ` <small class="muted">(${escape(i.mods.join(', '))})</small>` : ''}</span><span class="row nowrap" style="gap:6px"><span class="badge badge-${ITEM_STATES[i.status]?.badge}">${ITEM_STATES[i.status]?.label}</span>${i.status === 'listo' ? `<button class="btn btn-sm btn-primary" data-deliver="${o.id}|${i.id}">Entregar</button>` : ''}</span></li>`).join('')}</ul></div>`).join('')
        : sess ? '<p class="muted small">Mesa abierta, sin pedidos aún.</p>' : '<p class="muted small">Mesa libre.</p>'}
      ${sess ? `<div class="row between total-row"><span>Consumo</span><b>${money(sessionTotals(sess.id).subtotal)}</b></div>` : ''}`;
    m.el.querySelector('.modal-foot').innerHTML = !sess
      ? `<button class="btn" data-open>Abrir mesa</button><button class="btn btn-primary" data-take>Tomar pedido</button>`
      : `${!orders.length ? '<button class="btn btn-ghost" data-free>Liberar</button>' : ''}<a class="btn btn-ghost" href="index.html?mesa=${t.number}" target="_blank" rel="noopener">Ver como cliente</a><button class="btn" data-take>Agregar pedido</button><button class="btn btn-primary" data-charge ${orders.length ? '' : 'disabled'}>Cobrar</button>`;
  }
  m.el.addEventListener('click', async e => {
    const t = db.get('tables', tid);
    const b = e.target.closest('button'); if (!b) return;
    const guests = +(body.querySelector('#gs')?.value || 2);
    if (b.hasAttribute('data-open')) { openSession(tid, { guests, waiterId: user.id }); db.log('mesa', `Mesa ${t.number} abierta (${guests} pers.)`, user.id); toast(`Mesa ${t.number} abierta`, 'success'); paint(); }
    if (b.hasAttribute('data-take')) { m.close(); takeOrder(tid, guests); }
    if (b.hasAttribute('data-free')) { if (await confirm(`¿Liberar la mesa ${t.number}?`)) { freeTable(tid, user.id); m.close(); } }
    if (b.hasAttribute('data-charge')) { m.close(); chargeModal(t.sessionId, user); }
    if (b.dataset.attendT) { db.query('calls', c => c.tableId === tid && c.type === 'garzon' && c.status === 'pendiente').forEach(c => attendCall(c.id, user.id)); db.update('tables', tid, { calling: false }); toast('Llamado atendido', 'success'); }
  });
  paint();
}

function takeOrder(tid, guests) {
  const t = db.get('tables', tid);
  const ticket = [];
  let cat = db.all('categories').sort((a, b) => a.order - b.order)[0]?.id, q = '';
  const body = document.createElement('div');
  body.className = 'stack take-order';
  const m = modal({ title: `Pedido · Mesa ${t.number}`, size: 'lg', body, foot: '<span></span>' });
  const foot = m.el.querySelector('.modal-foot');
  const paint = () => {
    const cats = db.query('categories', c => c.active !== false).sort((a, b) => a.order - b.order);
    const dishes = db.query('dishes', d => !d.hidden && (q ? (d.name.es.toLowerCase().includes(q.toLowerCase())) : d.cat === cat));
    body.innerHTML = `<input class="input" type="search" placeholder="Buscar plato…" value="${escape(q)}" data-q aria-label="Buscar plato">
      <div class="row chips">${cats.map(c => `<button class="chip ${!q && c.id === cat ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${escape(c.name.es)}</button>`).join('')}</div>
      <div class="pick-grid">${dishes.map(d => `<button class="pick ${d.available === false ? 'is-out' : ''}" data-d="${d.id}" ${d.available === false ? 'disabled' : ''}><span class="dish-art xs" data-tone="${escape(d.tone)}" aria-hidden="true"><span>${escape(d.emoji)}</span></span><span class="grow"><b>${escape(d.name.es)}</b><small class="muted d-block">${money(d.price)} ${(d.tags || []).map(k => TAGS[k]?.icon).join('')}${d.available === false ? ' · AGOTADO' : ''}</small></span><span class="add-dot">${ticket.filter(l => l.dishId === d.id).reduce((a, l) => a + l.qty, 0) || '+'}</span></button>`).join('')}</div>
      ${ticket.length ? `<div class="card stack ticket-sum"><b>Comanda (${ticket.reduce((a, l) => a + l.qty, 0)} ítems)</b><ul class="bill-lines">${ticket.map((l, k) => `<li><span>${l.qty}× ${escape(db.get('dishes', l.dishId).name.es)}${l.mods.length ? ` <small class="muted">(${escape(l.mods.join(', '))})</small>` : ''}${l.note ? ` <small class="muted">📝 ${escape(l.note)}</small>` : ''}</span><span class="row nowrap" style="gap:6px"><b>${money(l.price * l.qty)}</b><button class="btn btn-icon btn-sm btn-ghost" data-rm="${k}" aria-label="Quitar">✕</button></span></li>`).join('')}</ul>
        <input class="input" placeholder="Nota general para cocina" data-note aria-label="Nota general"></div>` : ''}`;
    foot.innerHTML = `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-send ${ticket.length ? '' : 'disabled'}>Enviar a cocina · ${money(ticket.reduce((a, l) => a + l.price * l.qty, 0))}</button>`;
  };
  body.addEventListener('input', e => { if (e.target.matches('[data-q]')) { q = e.target.value; const pos = e.target.selectionStart; paint(); const i = body.querySelector('[data-q]'); i.focus(); i.setSelectionRange(pos, pos); } });
  body.addEventListener('click', e => {
    const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; q = ''; paint(); return; }
    const r = e.target.closest('[data-rm]'); if (r) { ticket.splice(+r.dataset.rm, 1); paint(); return; }
    const d = e.target.closest('[data-d]'); if (d) pickMods(db.get('dishes', d.dataset.d), line => { ticket.push(line); paint(); });
  });
  foot.addEventListener('click', e => {
    if (!e.target.closest('[data-send]')) return;
    const o = sendOrder(tid, ticket, { source: 'garzon', waiterId: user.id, guests, note: body.querySelector('[data-note]')?.value.trim() || '' });
    toast(`Pedido #${o.number} enviado · Mesa ${t.number}`, 'success');
    m.close();
  });
  paint();
}

function pickMods(d, done) {
  const groups = (d.mods || []).map(id => db.get('modGroups', id)).filter(Boolean);
  const body = document.createElement('form');
  body.className = 'stack';
  body.innerHTML = `${groups.map(g => `<fieldset class="mod-group" data-g="${g.id}"><legend><b>${escape(g.name.es)}</b> ${g.required ? '<span class="badge badge-warning plain">Obligatorio</span>' : ''}</legend>${g.options.map((o, i) => `<label class="mod-opt"><input type="${g.type === 'single' ? 'radio' : 'checkbox'}" name="g-${g.id}" value="${o.id}" ${g.type === 'single' && g.required && i === 0 ? 'checked' : ''}> <span>${escape(o.es)}</span>${o.price ? `<small class="muted">+${money(o.price)}</small>` : ''}</label>`).join('')}</fieldset>`).join('')}
    <div class="grid-2"><div class="field"><label for="pm-q">Cantidad</label><input class="input" id="pm-q" type="number" min="1" max="20" value="1"></div><div class="field"><label for="pm-n">Nota</label><input class="input" id="pm-n" placeholder="Sin cebolla…"></div></div>`;
  if (!groups.length) { done({ dishId: d.id, qty: 1, price: d.price, mods: [], note: '' }); toast(`${d.name.es} agregado`, 'success', 1200); return; }
  const m = modal({ title: d.name.es, body, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Agregar</button>' });
  m.el.querySelector('[data-ok]').onclick = () => {
    const sel = [];
    body.querySelectorAll('.mod-group').forEach(fs => fs.querySelectorAll('input:checked').forEach(i => sel.push(db.get('modGroups', fs.dataset.g).options.find(o => o.id === i.value))));
    const miss = groups.find(g => g.required && !body.querySelector(`[data-g="${g.id}"] input:checked`));
    if (miss) { toast(`Elige ${miss.name.es}`, 'warning'); return; }
    done({ dishId: d.id, qty: Math.max(1, +body.querySelector('#pm-q').value || 1), price: d.price + sel.reduce((a, o) => a + o.price, 0), mods: sel.map(o => o.es), note: body.querySelector('#pm-n').value.trim() });
    m.close();
  };
}

app.addEventListener('click', e => {
  const b = e.target.closest('button, [data-t]'); if (!b) return;
  if (b.dataset.tab) { tab = b.dataset.tab; render(); return; }
  if (b.dataset.zone) { zone = b.dataset.zone; render(); return; }
  if (b.hasAttribute('data-out')) { auth.logout(); location.href = 'login.html'; return; }
  if (b.dataset.t) { tableSheet(b.dataset.t); return; }
  if (b.dataset.attend) { attendCall(b.dataset.attend, user.id); toast('Llamado atendido', 'success'); return; }
  if (b.dataset.chargeT) { const t = db.get('tables', b.dataset.chargeT); if (t.sessionId) chargeModal(t.sessionId, user); return; }
  if (b.hasAttribute('data-deliver-all')) { readyItems().forEach(({ o, i }) => patchItems(o.id, x => x.id === i.id ? { status: 'entregado' } : null)); toast('Todo entregado', 'success'); }
});
// Entregar (también dentro de la ficha de mesa)
document.addEventListener('click', e => {
  const b = e.target.closest('[data-deliver]'); if (!b) return;
  const [oid, iid] = b.dataset.deliver.split('|');
  patchItems(oid, i => i.id === iid ? { status: 'entregado' } : null);
  toast('Entregado', 'success', 1200);
});

let seenReady = new Set(readyItems().map(x => x.i.id)), seenCalls = new Set(pendingCalls().map(c => c.id));
db.subscribe(() => {
  const r = readyItems(), c = pendingCalls();
  r.filter(x => !seenReady.has(x.i.id)).slice(0, 2).forEach(x => toast(`🍽️ Mesa ${x.o.tableNumber}: ${dishName(x.i)} listo`, 'success'));
  c.filter(x => !seenCalls.has(x.id)).forEach(x => toast(`🛎️ Mesa ${x.tableNumber} ${x.type === 'cuenta' ? 'pide la cuenta' : 'te llama'}`, 'warning'));
  seenReady = new Set(r.map(x => x.i.id)); seenCalls = new Set(c.map(x => x.id));
  if (openSheet) openSheet.paint();
  if (!document.querySelector('.modal-backdrop')) render();
});
setInterval(() => { if (!document.querySelector('.modal-backdrop')) render(); }, 30000);
render();
