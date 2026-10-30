// Modal de cobro (caja y garzón): propina, medio de pago y división de cuenta.
import { modal, money, escape, toast, sleep } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { settings, sessionOrders, sessionTotals, closeSession, dishName } from './logic.js';

export function chargeModal(sessionId, user, onDone) {
  const s = db.get('sessions', sessionId);
  if (!s) return;
  const cfg = settings();
  let tip = cfg.defaultTip ?? 10, split = 1, method = 'Tarjeta';
  const items = sessionOrders(sessionId).flatMap(o => o.items.filter(i => i.status !== 'anulado'));
  const body = document.createElement('div');
  body.className = 'stack';
  const paint = () => {
    const tot = sessionTotals(sessionId, tip);
    body.innerHTML = `
      <ul class="bill-lines">${items.map(i => `<li><span>${i.qty}× ${escape(dishName(i))}</span><b>${money(i.price * i.qty)}</b></li>`).join('') || '<li class="muted">Sin consumos</li>'}</ul>
      <div class="row between"><span>Subtotal</span><b>${money(tot.subtotal)}</b></div>
      <div class="stack" style="gap:6px"><span class="label">Propina sugerida</span><div class="row chips">${(cfg.tipOptions || [0, 10]).map(p => `<button class="chip ${p === tip ? 'active' : ''}" data-tip="${p}">${p ? p + '%' : 'Sin propina'}</button>`).join('')}</div></div>
      <div class="grid-2">
        <div class="field"><label for="ch-m">Medio de pago</label><select class="select" id="ch-m">${['Tarjeta', 'Efectivo', 'Transferencia', 'App'].map(x => `<option ${x === method ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label for="ch-s">Dividir entre</label><select class="select" id="ch-s">${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${i + 1 === split ? 'selected' : ''}>${i + 1} ${i ? 'personas' : 'persona'}</option>`).join('')}</select></div>
      </div>
      <div class="row between"><span>Propina (${tip}%)</span><b>${money(tot.tip)}</b></div>
      <div class="row between total-row"><span>Total a cobrar</span><b>${money(tot.total)}</b></div>
      ${split > 1 ? `<p class="callout small">Cada persona paga <b>${money(Math.ceil(tot.total / split / 10) * 10)}</b></p>` : ''}`;
  };
  paint();
  const m = modal({ title: `Cobrar mesa ${s.tableNumber}`, body, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-pay>Confirmar pago</button>' });
  body.addEventListener('click', e => { const b = e.target.closest('[data-tip]'); if (b) { tip = +b.dataset.tip; paint(); } });
  body.addEventListener('change', e => { if (e.target.id === 'ch-m') method = e.target.value; if (e.target.id === 'ch-s') { split = +e.target.value; paint(); } });
  m.el.querySelector('[data-pay]').onclick = async e => {
    e.target.disabled = true; e.target.innerHTML = '<span class="spinner"></span> Procesando…';
    await sleep(600);
    const done = closeSession(sessionId, { tipPct: tip, method, split, userId: user?.id });
    m.close();
    if (done) { toast(`Mesa ${s.tableNumber} cobrada: ${money(done.total)}`, 'success'); onDone && onDone(done); }
  };
}
