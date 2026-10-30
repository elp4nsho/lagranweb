// Seguimiento en línea de la OT: línea de tiempo de 8 etapas, avance de tareas y próximos pasos.
import { escape, money, toast, dateTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { otByCode, normPlate, totals, userName, fmtKm, dayLabel, timeHM, taskMin } from '../shared/domain.js';
import { plate, stBadge, timelineHTML, fuelGauge, invoiceModal } from '../shared/bits.js';
import { otLookup } from './home.js';

export function renderTrack(el, params = {}) {
  const paint = () => {
    const o = params.code ? otByCode(params.code) : null;
    if (!o) {
      el.innerHTML = `<section class="section page-top"><div class="container narrow stack"><div data-anim><span class="eyebrow"><span class="live-dot"></span> En línea</span><h1>Sigue tu orden de trabajo</h1><p class="lead">Ingresa el código de OT o la patente. Verás cada etapa con fecha y hora, quién la hizo y cuánto falta.</p></div><div class="card" data-lk></div>${params.code ? '<p class="callout bad">No encontramos esa OT.</p>' : ''}</div></section>`;
      otLookup(el.querySelector('[data-lk]'), { cta: 'Buscar' });
      return;
    }
    const t = totals(o), done = o.tasks.filter(x => x.done).length;
    const pend = o.budget.filter(i => i.st === 'pendiente' && o.budgetSentAt);
    const inv = o.invoiceId ? db.get('invoices', o.invoiceId) : null;
    const late = o.status !== 'entregado' && Date.parse(o.promisedAt) < Date.now();
    el.innerHTML = `<section class="section page-top"><div class="container stack">
      <div class="row between" data-anim><div><span class="eyebrow"><span class="live-dot"></span> Seguimiento ${escape(o.code)}</span><h1 style="margin:0">${escape(o.car)}</h1></div><div class="row">${plate(o.plate)} ${stBadge(o.status)}</div></div>
      ${pend.length ? `<p class="callout warn">🔔 Tienes <b>${pend.length} ítem(s)</b> del presupuesto esperando tu aprobación. <a class="btn btn-sm btn-primary" href="#/presupuesto/${o.code}">Revisar y aprobar</a></p>` : ''}
      ${o.status === 'listo' ? `<p class="callout ok">✅ <b>¡Tu auto está listo!</b> Puedes retirarlo en horario de atención. Saldo a pagar: <b>${money(t.balance)}</b>.</p>` : ''}
      <div class="track-grid">
        <div class="card stack"><h2 style="margin:0;font-size:20px">Etapas</h2>${o.status === 'cancelada' ? '<p class="callout bad">OT cancelada.</p>' : ''}${timelineHTML(o)}</div>
        <div class="stack">
          <div class="card stack"><div class="grid-2 small detail-grid"><div><span class="label">Asesor</span><b>${escape(userName(o.advisorId))}</b></div><div><span class="label">Mecánico</span><b>${escape(o.mechanicId ? userName(o.mechanicId) : 'Por asignar')}</b></div>
            <div><span class="label">Ingreso</span><b>${escape(dayLabel(o.createdAt))} ${timeHM(o.createdAt)}</b>${fmtKm(o.km)} · ${fuelGauge(o.fuel)}</div><div><span class="label">Entrega comprometida</span><b class="${late ? 'text-danger' : ''}">${escape(dayLabel(o.promisedAt, { weekday: 'long', day: 'numeric', month: 'short' }))}</b>${late ? 'reprogramando' : ''}</div></div></div>
          ${o.tasks.length ? `<div class="card stack"><div class="row between"><b>Trabajos</b><span class="small">${done}/${o.tasks.length}</span></div><div class="progress"><i style="--v:${done / o.tasks.length * 100}%"></i></div><ul class="task-list">${o.tasks.map(x => `<li class="${x.done ? 'done' : ''}"><span class="tick">${x.done ? '✓' : x.run ? '▶' : ''}</span>${escape(x.desc)}${x.run ? ' <span class="badge badge-primary plain">en curso</span>' : ''}</li>`).join('')}</ul></div>` : ''}
          <div class="card stack"><b>Montos</b><div class="inv-tot" style="justify-self:stretch"><div><span>Total aprobado</span><b>${money(t.approved)}</b></div>${t.claim ? `<div><span>Tu deducible</span><b>${money(t.claim.deductible)}</b></div>` : ''}<div><span>Abono pagado</span><b>${money(t.deposit)}</b></div><div class="big"><span>Saldo al retirar</span><b>${money(t.balance)}</b></div></div>
            ${inv ? `<button class="btn" data-inv>🧾 Ver ${inv.kind} N° ${inv.number}</button>` : ''}${o.budget.length ? `<a class="btn btn-ghost" href="#/presupuesto/${o.code}">Ver presupuesto</a>` : ''}</div>
        </div>
      </div>
    </div></section>`;
    el.querySelector('[data-inv]')?.addEventListener('click', () => invoiceModal(inv));
  };
  paint();
  return { refresh: paint };
}
export { normPlate, toast, dateTime, taskMin };
