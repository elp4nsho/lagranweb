// Seguimiento en vivo de la atención: fila, bahía, tareas, cronómetro y aprobación de recomendaciones.
import { escape, money, toast, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { branchById, branchLive, waitLabel, normPlate, ACTIVE, respondUpsell, elapsed, timeHM, dayLabel, userName, JOB_STATES } from '../shared/domain.js';
import { plate, carArt, jobStepper, boletaModal, stBadge } from '../shared/bits.js';
import { visitor } from './state.js';

const findJob = q => {
  if (!q) return null;
  const s = String(q).trim().toUpperCase();
  const byCode = db.find('jobs', j => j.code === s || j.code === 'PR-' + s);
  if (byCode) return byCode;
  const n = normPlate(s);
  const list = db.query('jobs', j => normPlate(j.plate) === n && j.status !== 'cancelado');
  return list.find(j => ACTIVE.includes(j.status)) || list.filter(j => j.status === 'reservado').sort((a, b) => a.bookedFor.localeCompare(b.bookedFor))[0] || list.sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''))[0] || null;
};
const mmss = m => `${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor((m * 60) % 60)).padStart(2, '0')}`;
const live = j => j.startedAt ? (Date.now() - new Date(j.startedAt)) / 6e4 : 0;

export function renderStatus(el, params = {}, query = {}) {
  const q = params.code || query.q || visitor.get().lastCode || '';
  let job = findJob(q);
  let timer;
  const paint = () => {
    job = job && db.get('jobs', job.id);
    const j = job;
    el.innerHTML = `<section class="section page-top"><div class="container narrow stack">
      <div data-anim><span class="eyebrow"><span class="live-dot"></span> Seguimiento en vivo</span><h1>Estado de mi auto</h1></div>
      <form class="card plate-form" data-q novalidate><label class="sr-only" for="st-q">Código o patente</label><input class="input" id="st-q" name="buscar" placeholder="Código PR-41234 o patente" value="${escape(j ? j.code : q)}"><button class="btn btn-primary">Buscar</button></form>
      ${!j ? (q ? '<div class="card empty"><span class="icon">🔎</span>No encontramos una atención con ese código o patente.</div>' : '<div class="card empty"><span class="icon">🚗</span>Ingresa el código de tu reserva o tu patente.</div>') : detail(j)}
    </div></section>`;
    el.querySelector('[data-q]').onsubmit = e => { e.preventDefault(); const v = e.target.elements.buscar.value; job = findJob(v); if (job) { visitor.set({ lastCode: job.code }); history.replaceState(null, '', '#/estado/' + job.code); } paint(); if (!job) toast('Sin resultados', 'warning'); };
  };
  const detail = j => {
    const b = branchById(j.branchId), bay = db.get('bays', j.bayId);
    const done = j.tasks.filter(t => t.d).length, pct = j.tasks.length ? Math.round(done / j.tasks.length * 100) : 0;
    const pend = j.upsells.filter(u => u.st === 'pendiente');
    const pos = j.status === 'en-fila' ? branchLive(j.branchId).positions[j.id] : null;
    return `<div class="card stack">
      <div class="track-head">${carArt(j.segment)}<div class="stack" style="gap:6px"><div class="row" style="gap:8px">${plate(j.plate)} ${stBadge(j.status)}</div><b>${escape(j.car)}</b><small class="muted">${escape(j.code)} · Sucursal ${escape(b?.name || '')}${j.bookedFor ? ` · reserva ${escape(dayLabel(j.bookedFor))} ${timeHM(j.bookedFor)}` : ''}</small></div></div>
      ${['cancelado', 'no-show'].includes(j.status) ? `<p class="callout bad">Esta atención figura como <b>${JOB_STATES[j.status].label}</b>. <a href="#/reservar?new=1">Reservar de nuevo</a></p>` : jobStepper(j)}
      ${j.status === 'reservado' ? `<p class="callout">Te esperamos el <b>${escape(dayLabel(j.bookedFor, { weekday: 'long', day: 'numeric', month: 'long' }))} a las ${timeHM(j.bookedFor)}</b>. Al llegar toca <a href="#/llegue?b=${j.branchId}">"Llegué"</a>.</p>` : ''}
      ${j.status === 'en-fila' ? `<div class="row between"><span>Posición en la fila: <b class="big-num">${pos?.pos ?? '—'}</b></span><span class="badge badge-warning">Entras a bahía en ${pos ? waitLabel(pos.wait) : 'breve'}</span></div>` : ''}
      ${j.status === 'en-bahia' ? `<div class="grid-3 small detail-grid"><div><span class="label">Bahía</span><b>${escape(bay?.name || '')}</b>${escape(bay?.type || '')}</div><div><span class="label">Técnico</span><b>${escape(userName(j.techId))}</b></div><div><span class="label">Tiempo en bahía</span><b class="timer" data-timer>${mmss(live(j))}</b>estimado ${j.est} min</div></div>
        <div class="stack" style="gap:6px"><div class="row between small"><span>Avance ${done}/${j.tasks.length} tareas</span><b>${pct}%</b></div><div class="progress"><i style="--v:${pct}%"></i></div></div>
        <ul class="task-list">${j.tasks.map(t => `<li class="${t.d ? 'done' : ''}"><span class="tick">${t.d ? '✓' : ''}</span>${escape(t.t)}</li>`).join('')}</ul>` : ''}
      ${j.status === 'listo' ? '<p class="callout ok">✅ <b>¡Tu auto está listo!</b> Pasa a caja para pagar y retirarlo. Te esperamos con las llaves.</p>' : ''}
      ${j.status === 'pagado' ? `<p class="callout ok">🏁 Entregado ${j.paidAt ? 'el ' + escape(dayLabel(j.paidAt)) + ' a las ' + timeHM(j.paidAt) : ''}. ¡Gracias por preferirnos!</p><button class="btn" data-boleta>🧾 Ver boleta N° ${escape(j.pay?.folio || '')}</button>` : ''}
    </div>
    ${pend.length ? `<div class="stack"><h2 style="margin:0;font-size:22px">🔔 El técnico recomienda</h2>${pend.map(u => `<div class="card upsell"><div class="row between nowrap"><b>${escape(u.icon || '💡')} ${escape(u.label)}</b><b class="price">${money(u.p)}</b></div>${u.note ? `<small class="muted">${escape(u.note)}</small>` : ''}<small class="muted">Si apruebas, se agrega a tu atención y lo hacemos ahora mismo.</small><div class="row"><button class="btn btn-primary" data-ok="${u.id}">✓ Aprobar</button><button class="btn btn-ghost" data-no="${u.id}">Ahora no</button></div></div>`).join('')}</div>` : ''}
    ${j.upsells.filter(u => u.st !== 'pendiente').length ? `<div class="stack" style="gap:8px">${j.upsells.filter(u => u.st !== 'pendiente').map(u => `<div class="card upsell st-${u.st}"><div class="row between"><span>${escape(u.icon || '💡')} ${escape(u.label)}</span><span class="badge ${u.st === 'aprobado' ? 'badge-success' : ''}">${u.st === 'aprobado' ? 'Aprobada' : u.st === 'rechazado' ? 'Rechazada' : 'Sin respuesta'}</span></div></div>`).join('')}</div>` : ''}
    <div class="card stack"><b>Detalle y precio</b><ul class="line-list">${j.items.map(i => `<li><span>${escape(i.n)}${i.up ? ' <small class="badge badge-success plain">recomendado</small>' : ''}${i.plan ? ' <small class="badge badge-info plain">plan</small>' : ''}</span><b>${i.plan ? '$0' : money(i.p)}</b></li>`).join('')}${j.discount ? `<li><span>Cupón ${escape(j.coupon)}</span><b class="text-success">−${money(j.discount)}</b></li>` : ''}</ul><div class="total-row"><span>Total</span><b>${money(j.total)}</b></div></div>`;
  };
  el.addEventListener('click', async e => {
    const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]');
    if (ok) { const u = job.upsells.find(x => x.id === ok.dataset.ok); if (await confirm(`¿Aprobar "${u.label}" por ${money(u.p)}?`, { title: 'Aprobar recomendación', ok: 'Aprobar' })) { respondUpsell(job.id, u.id, true, 'cliente (web)'); toast('Aprobado: el técnico ya lo ve en su bahía', 'success'); } }
    if (no) { respondUpsell(job.id, no.dataset.no, false, 'cliente (web)'); toast('Recomendación rechazada', 'info'); }
    if (e.target.closest('[data-boleta]')) boletaModal(job);
  });
  paint();
  timer = setInterval(() => { const t = el.querySelector('[data-timer]'); if (t && job) { const j = db.get('jobs', job.id); if (j) t.textContent = mmss(live(j)); } }, 1000);
  return { refresh: paint, destroy: () => clearInterval(timer) };
}
