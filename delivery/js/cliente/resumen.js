// Resumen del cliente: KPIs, envíos en curso, envíos que recibe y gráfico mensual.
import { db } from '../data/db.js';
import { html, raw, money, num, barChart, time, date } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/shell.js';
import { statusBadge, progressHtml, etaText } from '../shared/views.js';
import { ACTIVE_ST } from '../shared/sim.js';
import * as ops from '../shared/ops.js';

export function shipCard(s, href) {
  return html`<a class="card hover ship-card" href="${href}" style="text-decoration:none;color:inherit">
    <div class="row between"><b class="mono">${s.code}</b>${raw(statusBadge(s.status, ops.isLate(s)))}</div>
    <small class="muted">${s.sender.comuna} → ${s.receiver.comuna} · ${s.receiver.name}</small>
    <div data-p="${s.id}">${raw(progressHtml(s))}</div><small data-e="${s.id}">${etaText(s)}</small></a>`;
}

export function mountResumen(el, ctx) {
  const draw = () => {
    const c = ctx.customer();
    const mine = db.query('shipments', s => s.customerId === c.id);
    const active = mine.filter(s => ACTIVE_ST.includes(s.status));
    const t = ops.simNow(), m0 = new Date(t); m0.setDate(1); m0.setHours(0, 0, 0, 0);
    const month = mine.filter(s => Date.parse(s.createdAt) >= m0.getTime() && s.status !== 'cancelado');
    const due = db.query('invoices', i => i.customerId === c.id && ['pendiente', 'vencida'].includes(i.status)).reduce((a, i) => a + i.amount, 0);
    const incoming = db.query('shipments', s => (s.watchers || []).includes(c.id) && s.customerId !== c.id).slice(0, 4);
    const months = [];
    const w0 = new Date(t); w0.setHours(0, 0, 0, 0); w0.setDate(w0.getDate() - ((w0.getDay() + 6) % 7));
    for (let i = 7; i >= 0; i--) {
      const a = w0.getTime() - i * 7 * 864e5, b = a + 7 * 864e5;
      months.push({ label: new Date(a).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }), value: mine.filter(s => { const x = Date.parse(s.createdAt); return x >= a && x < b; }).length });
    }
    const delivered = mine.filter(s => s.status === 'entregado').sort((a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt)).slice(0, 6);
    el.innerHTML = html`${raw(pageHead(`Hola, ${ctx.user.name.split(' ')[0]}`, ctx.biz ? `Cuenta empresa ${c.plan || ''} · ${c.rut || ''}` : 'Tus envíos de un vistazo', `<a class="btn btn-primary" href="#/nuevo">＋ Nuevo envío</a>${ctx.biz ? '<a class="btn" href="#/masivo">⇪ Carga masiva</a>' : ''}`))}
    <div class="kpis">${raw(kpi('En curso', active.length))}${raw(kpi('Envíos este mes', num(month.length)))}${raw(kpi('Gasto del mes', money(month.reduce((a, s) => a + s.price + (s.tip || 0), 0))))}${raw(kpi(ctx.biz ? 'Saldo por pagar' : 'Pendiente de pago', money(due), due ? '<a class="small" href="#/facturas">Ver facturas →</a>' : '<span class="delta up">Al día</span>'))}</div>
    <div class="panel-grid">
      <div class="stack">
        <div class="card"><div class="card-title"><h3>Envíos en curso</h3><a class="small" href="#/envios?f=activos">Ver todos</a></div>
          ${active.length ? raw(`<div class="grid-auto">${active.map(s => shipCard(s, '#/envios/' + s.id)).join('')}</div>`) : raw('<div class="empty-inline">No tienes envíos en curso. <a href="#/nuevo">Crea uno</a>.</div>')}</div>
        ${incoming.length ? raw(html`<div class="card"><div class="card-title"><h3>Envíos que vas a recibir</h3></div><div class="grid-auto">${raw(incoming.map(s => shipCard(s, 'index.html#/rastrear/' + s.code)).join(''))}</div></div>`) : ''}
        <div class="card"><div class="card-title"><h3>Envíos por semana</h3></div>${raw(barChart(months, { height: 160 }))}</div>
      </div>
      <div class="card"><div class="card-title"><h3>Últimas entregas</h3></div><div class="list">
        ${delivered.length ? delivered.map(s => raw(html`<a class="list-item" href="#/envios/${s.id}" style="color:inherit;text-decoration:none"><span class="grow"><b>${s.receiver.name}</b><small class="muted">${s.code} · ${s.receiver.comuna} · ${date(s.deliveredAt)} ${time(s.deliveredAt)}</small></span>${s.rating ? raw(`<span class="stars">${'★'.repeat(s.rating.stars)}</span>`) : raw('<span class="badge badge-warning">Calificar</span>')}</a>`)) : raw('<div class="empty-inline">Aún no hay entregas.</div>')}
      </div></div>
    </div>`;
  };
  draw();
  return {
    refresh: draw,
    tick() { el.querySelectorAll('[data-p]').forEach(n => { const s = db.get('shipments', n.dataset.p); if (s) { n.innerHTML = progressHtml(s); const e = el.querySelector(`[data-e="${s.id}"]`); if (e) e.textContent = etaText(s); } }); }
  };
}
