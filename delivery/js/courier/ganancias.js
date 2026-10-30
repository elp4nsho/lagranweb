// Ganancias del repartidor: hoy, semana, mes y gráfico de los últimos 14 días.
import { db } from '../data/db.js';
import { html, raw, money, barChart, time, date } from '../../../assets/core/ui.js';
import { earningOf } from './offer.js';
import * as ops from '../shared/ops.js';

export function mountGanancias(el, ctx) {
  let sig = '';
  const draw = () => {
    const c = ctx.courier();
    const done = db.query('shipments', s => s.courierId === c.id && s.status === 'entregado');
    const ns = done.length + ':' + c.id; if (ns === sig) return; sig = ns;
    const t = ops.simNow(), d0 = new Date(t); d0.setHours(0, 0, 0, 0);
    const w0 = d0.getTime() - ((d0.getDay() + 6) % 7) * 864e5;
    const m0 = new Date(d0); m0.setDate(1);
    const sum = from => done.filter(s => Date.parse(s.deliveredAt) >= from).reduce((a, s) => a + earningOf(s), 0);
    const days = [];
    for (let i = 13; i >= 0; i--) { const a = d0.getTime() - i * 864e5; days.push({ label: new Date(a).toLocaleDateString('es-CL', { weekday: 'narrow' }), value: done.filter(s => { const x = Date.parse(s.deliveredAt); return x >= a && x < a + 864e5; }).reduce((q, s) => q + earningOf(s), 0) }); }
    const tips = done.filter(s => Date.parse(s.deliveredAt) >= m0.getTime()).reduce((a, s) => a + (s.tip || 0), 0);
    const recent = done.sort((a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt)).slice(0, 12);
    const nextPay = new Date(d0); nextPay.setDate(nextPay.getDate() + ((5 - nextPay.getDay() + 7) % 7 || 7));
    el.innerHTML = html`<div class="kpis rider-kpis">
      <div class="card stat"><span class="label">Hoy</span><span class="value">${money(sum(d0.getTime()))}</span></div>
      <div class="card stat"><span class="label">Esta semana</span><span class="value">${money(sum(w0))}</span></div>
      <div class="card stat"><span class="label">Este mes</span><span class="value">${money(sum(m0.getTime()))}</span><span class="small muted">Propinas: ${money(tips)}</span></div></div>
    <div class="card"><div class="card-title"><h3>Últimos 14 días</h3></div>${raw(barChart(days, { height: 150, format: money }))}</div>
    <div class="card row between"><div><b>Próximo pago</b><br><small class="muted">${date(nextPay)} · transferencia a cuenta registrada</small></div><b>${money(sum(w0))}</b></div>
    <div class="card"><div class="card-title"><h3>Detalle reciente</h3><span class="muted small">Te quedas con el ${ops.pricing().courierShare}% + propinas</span></div><div class="list">
      ${recent.map(s => raw(html`<div class="list-item"><span class="grow"><b>${s.sender.comuna} → ${s.receiver.comuna}</b><small class="muted">${s.code} · ${date(s.deliveredAt)} ${time(s.deliveredAt)}${s.tip ? ' · propina ' + money(s.tip) : ''}</small></span><b>${money(earningOf(s))}</b></div>`))}</div></div>`;
  };
  draw();
  return { refresh: draw };
}
