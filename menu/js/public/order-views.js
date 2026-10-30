// Carrito, estado del pedido en vivo y cuenta (propina, dividir, pagar, calificar).
import { modal, toast, money, escape, time, sleep } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { settings, sendOrder, sessionOrders, sessionTotals, lineTotal, callWaiter, closeSession, ITEM_STATES, dishName } from '../shared/logic.js';
import { t, tr, getLang } from './i18n.js';
import { cart } from './cart.js';
import { selText, dishArt } from './dish-modal.js';

// ---------- Carrito ----------
export function openCart(ctx) {
  const body = document.createElement('div');
  body.className = 'stack';
  const m = modal({ title: t('cart'), body, foot: '<span></span>' });
  const foot = m.el.querySelector('.modal-foot');
  const paint = () => {
    const lines = cart.lines();
    if (!lines.length) {
      body.innerHTML = `<div class="empty"><span class="icon">🛒</span>${escape(t('cartEmpty'))}</div>`;
      foot.innerHTML = `<button class="btn btn-primary" data-close>${escape(t('browse'))}</button>`;
      return;
    }
    const s = ctx.session();
    body.innerHTML = `<ul class="cart-list">${lines.map(l => {
      const d = db.get('dishes', l.dishId);
      return `<li class="cart-line">${dishArt(d, 'sm')}<div class="grow"><b>${escape(tr(d.name))}</b>${l.sel.length ? `<small class="muted d-block">${escape(selText(l.sel, getLang()).join(' · '))}</small>` : ''}${l.note ? `<small class="muted d-block">📝 ${escape(l.note)}</small>` : ''}<small class="muted">${money(l.price)} ${escape(t('each'))}</small></div>
        <div class="qty"><button class="btn btn-icon btn-sm" data-k="${l.key}" data-d="-1" aria-label="${escape(t('remove'))}">−</button><b>${l.qty}</b><button class="btn btn-icon btn-sm" data-k="${l.key}" data-d="1" aria-label="+">+</button></div></li>`;
    }).join('')}</ul>
      <div class="grid-2">
        ${!s ? `<div class="field"><label for="c-guests">${escape(t('guests'))}</label><select class="select" id="c-guests">${Array.from({ length: Math.max(2, ctx.table().seats) }, (_, i) => `<option ${i + 1 === Math.min(2, ctx.table().seats) ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>` : ''}
        <div class="field"><label for="c-note">${escape(t('orderNote'))}</label><input class="input" id="c-note" maxlength="140" placeholder="${escape(t('orderNotePh'))}"></div>
      </div>
      <div class="row between total-row"><span>${escape(t('subtotal'))}</span><b>${money(cart.total())}</b></div>`;
    foot.innerHTML = `<button class="btn btn-ghost" data-close>${escape(t('keepOrdering'))}</button><button class="btn btn-primary" data-send ${settings().orderingEnabled === false ? 'disabled' : ''}>${escape(t('send'))} · ${money(cart.total())}</button>`;
  };
  body.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const l = cart.lines().find(x => x.key === b.dataset.k); cart.setQty(b.dataset.k, l.qty + +b.dataset.d); paint(); });
  foot.addEventListener('click', async e => {
    const b = e.target.closest('[data-send]'); if (!b) return;
    b.disabled = true; b.innerHTML = '<span class="spinner"></span>';
    await sleep(500);
    const guests = +(body.querySelector('#c-guests')?.value || 0) || undefined;
    const items = cart.lines().map(l => ({ dishId: l.dishId, qty: l.qty, price: l.price, mods: selText(l.sel), note: l.note }));
    const o = sendOrder(ctx.table().id, items, { source: 'mesa', note: body.querySelector('#c-note')?.value.trim() || '', guests });
    ctx.remember(o.sessionId);
    cart.clear();
    m.close();
    toast(`${t('sent')} · #${o.number}`, 'success');
    location.hash = '#/pedido';
  });
  paint();
}

// ---------- Estado ----------
const STEPS = ['enviado', 'preparando', 'listo', 'entregado'];
export function renderStatus(el, ctx) {
  const s = ctx.session();
  const orders = s ? sessionOrders(s.id) : [];
  const tb = ctx.table();
  el.innerHTML = `<div class="container stack narrow page-pad">
    <div class="row between"><h2 style="margin:0">${escape(t('statusTitle'))}</h2>${tb.calling ? `<span class="badge badge-warning">${escape(t('waiterCalled'))}</span>` : ''}</div>
    ${!orders.length ? `<div class="card empty"><span class="icon">🧾</span>${escape(t('noOrders'))}<div style="margin-top:12px"><a class="btn btn-primary" href="#/">${escape(t('browse'))}</a></div></div>` : orders.slice().reverse().map(o => {
      const idx = STEPS.indexOf(o.status === 'pagado' ? 'entregado' : o.status);
      return `<article class="card stack order-card" data-anim>
        <div class="row between"><b>${escape(t('orderNo'))} #${o.number}</b><small class="muted">${escape(t('placed'))} ${time(o.createdAt)}</small></div>
        <ol class="steps">${STEPS.map((st, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}"><span>${i < idx ? '✓' : i + 1}</span><small>${escape(t('st' + st[0].toUpperCase() + st.slice(1)))}</small></li>`).join('')}</ol>
        <ul class="item-status">${o.items.map(i => `<li><span>${i.qty}× ${escape(dishName(i, getLang()))}${i.mods?.length ? ` <small class="muted">(${escape(i.mods.join(', '))})</small>` : ''}</span><span class="badge badge-${ITEM_STATES[i.status]?.badge || 'info'}">${escape(getLang() === 'en' ? ITEM_STATES[i.status]?.en : ITEM_STATES[i.status]?.label)}</span></li>`).join('')}</ul>
      </article>`;
    }).join('')}
    ${orders.length ? `<div class="row"><a class="btn" href="#/">${escape(t('keepOrdering'))}</a><a class="btn btn-primary" href="#/cuenta">${escape(t('bill'))} · ${money(sessionTotals(s.id).subtotal)}</a></div>` : ''}
  </div>`;
}

// ---------- Cuenta ----------
const billState = { tip: null, split: 1, mode: 'even', mine: new Set(), method: 'card' };
export function renderBill(el, ctx) {
  const cfg = settings();
  if (billState.tip == null) billState.tip = cfg.defaultTip ?? 10;
  const tb = ctx.table();
  const s = ctx.session();
  const last = ctx.lastSession();
  // Sesión recién pagada → agradecimiento + calificación
  if (!s && last && last.status === 'pagada') return renderThanks(el, ctx, last);
  const orders = s ? sessionOrders(s.id) : [];
  if (!orders.length) { el.innerHTML = `<div class="container narrow page-pad"><div class="card empty"><span class="icon">🧾</span>${escape(t('nothingToPay'))}<div style="margin-top:12px"><a class="btn btn-primary" href="#/">${escape(t('browse'))}</a></div></div></div>`; return; }
  const items = orders.flatMap(o => o.items.filter(i => i.status !== 'anulado').map(i => ({ ...i, oid: o.id })));
  const sub = lineTotal(items);
  const tip = Math.round(sub * billState.tip / 100 / 10) * 10;
  const total = sub + tip;
  const mineSub = items.filter(i => billState.mine.has(i.id)).reduce((a, i) => a + i.price * i.qty, 0);
  const share = billState.mode === 'even' ? Math.ceil(total / billState.split / 10) * 10 : Math.round(mineSub * (1 + billState.tip / 100) / 10) * 10;
  const methods = [['card', '💳'], ['cash', '💵'], ['transfer', '🏦']];
  el.innerHTML = `<div class="container narrow stack page-pad">
    <h2 style="margin:0">${escape(t('billTitle'))} · ${escape(t('table'))} ${tb.number}</h2>
    ${tb.billRequested ? `<p class="callout">🧾 ${escape(t('billRequested'))}</p>` : ''}
    <div class="card stack">
      <ul class="bill-lines">${items.map(i => `<li>${billState.mode === 'items' ? `<label class="check"><input type="checkbox" data-mine="${i.id}" ${billState.mine.has(i.id) ? 'checked' : ''}>` : '<span>'}<span>${i.qty}× ${escape(dishName(i, getLang()))}</span>${billState.mode === 'items' ? '</label>' : '</span>'}<b>${money(i.price * i.qty)}</b></li>`).join('')}</ul>
      <div class="row between"><span>${escape(t('subtotal'))}</span><b>${money(sub)}</b></div>
      <div class="stack" style="gap:8px"><span class="label">${escape(t('tip'))}</span>
        <div class="row chips">${(cfg.tipOptions || [0, 10, 15, 20]).map(p => `<button class="chip ${billState.tip === p ? 'active' : ''}" data-tip="${p}">${p ? p + '%' : escape(t('noTip'))}</button>`).join('')}</div>
      </div>
      <div class="row between"><span>${escape(t('tip'))} (${billState.tip}%)</span><b>${money(tip)}</b></div>
      <div class="row between total-row"><span>${escape(t('total'))}</span><b>${money(total)}</b></div>
    </div>
    <div class="card stack">
      <div class="row between"><b>${escape(t('split'))}</b>
        <div class="tabs mini"><button class="tab ${billState.mode === 'even' ? 'active' : ''}" data-mode="even">${escape(t('even'))}</button><button class="tab ${billState.mode === 'items' ? 'active' : ''}" data-mode="items">${escape(t('byItems'))}</button></div></div>
      ${billState.mode === 'even' ? `<div class="row between"><div class="qty"><button class="btn btn-icon btn-sm" data-split="-1" aria-label="-">−</button><b>${billState.split}</b><button class="btn btn-icon btn-sm" data-split="1" aria-label="+">+</button></div><span class="muted">${escape(t('people'))}</span></div>` : `<p class="muted small" style="margin:0">${escape(t('yourItems'))}</p>`}
      <div class="row between total-row"><span>${escape(billState.mode === 'even' ? t('perPerson') : t('yourShare'))}</span><b>${money(share)}</b></div>
    </div>
    <div class="card stack">
      <span class="label">${escape(t('method'))}</span>
      <div class="row chips">${methods.map(([k, ic]) => `<button class="chip ${billState.method === k ? 'active' : ''}" data-method="${k}">${ic} ${escape(t(k))}</button>`).join('')}</div>
      <div class="grid-2">
        <button class="btn btn-block" data-request ${tb.billRequested ? 'disabled' : ''}>🧾 ${escape(t('requestBill'))}</button>
        <button class="btn btn-primary btn-block" data-pay ${billState.method !== 'card' ? 'disabled' : ''}>${escape(t('payApp'))}</button>
      </div>
    </div>
  </div>`;
  el.onclick = async e => {
    const b = e.target.closest('button, input');
    if (!b) return;
    if (b.dataset.tip != null) billState.tip = +b.dataset.tip;
    else if (b.dataset.split) billState.split = Math.max(1, Math.min(12, billState.split + +b.dataset.split));
    else if (b.dataset.mode) billState.mode = b.dataset.mode;
    else if (b.dataset.method) billState.method = b.dataset.method;
    else if (b.dataset.mine) { b.checked ? billState.mine.add(b.dataset.mine) : billState.mine.delete(b.dataset.mine); }
    else if (b.hasAttribute('data-request')) { callWaiter(tb.id, 'cuenta'); toast(t('billRequested'), 'success'); return; }
    else if (b.hasAttribute('data-pay')) {
      b.disabled = true; b.innerHTML = `<span class="spinner"></span> ${escape(t('paying'))}`;
      await sleep(1100);
      closeSession(s.id, { tipPct: billState.tip, method: 'App', split: billState.mode === 'even' ? billState.split : 1 });
      toast(t('paid'), 'success');
      return;
    } else return;
    renderBill(el, ctx);
  };
}

function renderThanks(el, ctx, sess) {
  const done = db.find('ratings', r => r.sessionId === sess.id);
  const stars = { food: 5, service: 5, ambience: 5 };
  el.innerHTML = `<div class="container narrow stack page-pad">
    <div class="card stack center-text" data-anim="bounceIn"><span class="big-emoji">🎉</span><h2 style="margin:0">${escape(t('paid'))}</h2><p class="muted" style="margin:0">${escape(t('total'))}: <b>${money(sess.total)}</b> · ${escape(sess.method || '')}</p></div>
    ${done ? `<div class="card center-text">${escape(t('thanksRating'))} ${'★'.repeat(done.stars)}</div>` : `<form class="card stack" id="rate">
      <h3 style="margin:0">${escape(t('rateTitle'))}</h3>
      ${['food', 'service', 'ambience'].map(k => `<div class="row between"><span>${escape(t(k))}</span><div class="stars" data-k="${k}" role="radiogroup" aria-label="${escape(t(k))}">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star on" data-n="${n}" aria-label="${n}">★</button>`).join('')}</div></div>`).join('')}
      <div class="field"><label for="r-com">${escape(t('comment'))}</label><textarea class="textarea" id="r-com" maxlength="300"></textarea></div>
      <button class="btn btn-primary">${escape(t('sendRating'))}</button>
    </form>`}
    <button class="btn btn-ghost" data-new>${escape(t('newVisit'))}</button>
  </div>`;
  el.onclick = e => {
    const st = e.target.closest('.star');
    if (st) { const box = st.parentElement; stars[box.dataset.k] = +st.dataset.n; box.querySelectorAll('.star').forEach(x => x.classList.toggle('on', +x.dataset.n <= +st.dataset.n)); return; }
    if (e.target.closest('[data-new]')) { ctx.remember(null); location.hash = '#/'; }
  };
  el.querySelector('#rate')?.addEventListener('submit', e => {
    e.preventDefault();
    const avg = Math.round((stars.food + stars.service + stars.ambience) / 3);
    db.insert('ratings', { sessionId: sess.id, tableNumber: sess.tableNumber, ...stars, stars: avg, comment: el.querySelector('#r-com').value.trim(), published: avg >= 4 });
    db.log('opinión', `Mesa ${sess.tableNumber} calificó con ${avg}★`);
    toast(t('thanksRating'), 'success');
    renderThanks(el, ctx, sess);
  });
}
