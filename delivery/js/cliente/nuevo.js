// Nuevo envío desde el portal (con libreta de direcciones y pago simulado).
import { db } from '../data/db.js';
import { html, raw, money, toast, confirm } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { shipmentFormHtml, wireShipmentForm } from '../public/request.js';
import * as ops from '../shared/ops.js';

export function mountNuevo(el, ctx, q = {}) {
  const c = ctx.customer();
  const addresses = db.query('addresses', a => a.customerId === c.id);
  const P = ops.pricing();
  const rep = q.repeat ? db.get('shipments', q.repeat) : null;
  el.innerHTML = html`${raw(pageHead('Nuevo envío', ctx.biz ? 'Se carga a la factura mensual de tu empresa (−10%).' : 'Pagas con tarjeta al confirmar.'))}
    <form class="req-grid" novalidate>${raw('<div class="stack">' + shipmentFormHtml(P, rep ? { from: rep.sender.comuna, to: rep.receiver.comuna, size: rep.size, service: rep.service } : {}, { addresses, prefix: 'n' }) + '</div>')}
    <aside class="card stack req-summary"><b>Resumen</b><div data-sum></div><button class="btn btn-primary btn-lg btn-block">${ctx.biz ? 'Crear envío' : 'Pagar y crear envío'}</button></aside></form>`;
  const form = el.querySelector('form');
  if (rep) {
    const f = form.elements;
    f.sname.value = rep.sender.name; f.sphone.value = rep.sender.phone || ''; f.saddr.value = rep.sender.addr;
    f.rname.value = rep.receiver.name; f.rphone.value = rep.receiver.phone || ''; f.raddr.value = rep.receiver.addr; f.notes.value = rep.notes || '';
  }
  const sum = () => {
    const d = fw.read(), qt = ops.quoteFor(d.sender.comuna, d.receiver.comuna, d.size, d.service, { business: ctx.biz });
    el.querySelector('[data-sum]').innerHTML = !qt ? '<p class="muted">Sin cobertura</p>' : html`<dl class="kv small"><dt>Ruta</dt><dd>${d.sender.comuna} → ${d.receiver.comuna}</dd><dt>Distancia</dt><dd>${String(qt.km).replace('.', ',')} km</dd><dt>Retiro</dt><dd>~${qt.pickupMin} min</dd><dt>Entrega</dt><dd>~${qt.totalMin} min</dd>${qt.breakdown.rules.map(r => raw(html`<dt>${r.name}</dt><dd>${r.pct > 0 ? '+' : ''}${r.pct}%</dd>`))}</dl><div class="total"><span>Total</span><b>${money(qt.price + d.tip)}</b></div>`;
  };
  const fw = wireShipmentForm(form, addresses, sum);
  sum();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!fw.validate()) return;
    const d = fw.read(), qt = ops.quoteFor(d.sender.comuna, d.receiver.comuna, d.size, d.service, { business: ctx.biz });
    if (!ctx.biz && !(await confirm(`Se cobrarán ${money(qt.price + d.tip)} a tu tarjeta terminada en 4242 (simulado).`, { title: 'Confirmar pago', ok: 'Pagar' }))) return;
    const s = ops.createShipment({ ...d, customerId: c.id, channel: 'portal' }, { by: ctx.user.id, business: ctx.biz });
    db.log('envío creado', `${s.code} desde portal (${c.name})`, ctx.user.id);
    ops.feed(`Nuevo envío ${s.code} de ${c.name}`, 'info', s.id);
    toast(`Envío ${s.code} creado`, 'success');
    ctx.go('/envios/' + s.id);
  });
}
