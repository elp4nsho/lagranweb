// Vacaciones y permisos: saldo, solicitud con validaciones, calendario y seguimiento.
import { escape, toast, date } from '../../../assets/core/ui.js';
import { REQ_TYPES, reqBadge } from '../shared/util.js';
import { vacationBalance, businessDays, fmtDays, DEFAULT_POLICY } from '../shared/vacation.js';
import { monthCal, monthLabel, shiftMonth } from '../shared/mcal.js';
import { today, addDays, fmtDay, daysBetween } from '../shared/dates.js';
import { smartTable } from '../shared/table.js';

let ym = today().slice(0, 7);
export const live = true;

export function validateRequest(db, me, v, policy) {
  const T = today();
  if (!v.from || !v.to) return 'Indica las fechas';
  if (v.to < v.from) return 'La fecha de término es anterior a la de inicio';
  if (v.type !== 'licencia' && v.from < T) return 'No puedes solicitar fechas pasadas';
  if (v.type === 'licencia' && daysBetween(v.from, T) > 7) return 'Las licencias se informan hasta 7 días después de su inicio';
  if (v.days <= 0) return 'El rango no incluye días hábiles';
  if (v.type === 'vacaciones') {
    if (daysBetween(T, v.from) < policy.anticipacionMin) return `Las vacaciones se solicitan con al menos ${policy.anticipacionMin} días de anticipación`;
    const bal = vacationBalance(db, me, policy);
    if (v.days > bal.available) return `Solo tienes ${fmtDays(bal.available)} disponibles`;
  }
  if (v.type === 'administrativo') {
    const usedAdm = db.query('requests', r => r.employeeId === me.id && r.type === 'administrativo' && ['aprobada', 'pendiente'].includes(r.status) && r.from.slice(0, 4) === v.from.slice(0, 4)).reduce((s, r) => s + r.days, 0);
    if (usedAdm + v.days > policy.adminDias) return `Te quedan ${policy.adminDias - usedAdm} días administrativos este año`;
  }
  const t = REQ_TYPES[v.type];
  if (t.max && v.days > t.max && v.type !== 'administrativo') return `Este permiso permite máximo ${t.max} días`;
  if (t.doc && !v.doc) return 'Adjunta el comprobante (licencia médica)';
  const clash = db.find('requests', r => r.employeeId === me.id && ['pendiente', 'aprobada'].includes(r.status) && r.from <= v.to && r.to >= v.from);
  if (clash) return `Se cruza con tu solicitud del ${fmtDay(clash.from)} (${REQ_TYPES[clash.type].label})`;
  return null;
}

export function render(el, ctx) {
  const { db } = ctx, me = ctx.me, policy = { ...DEFAULT_POLICY, ...db.getValue('policy', {}) };
  const bal = vacationBalance(db, me, policy);
  const mine = db.query('requests', r => r.employeeId === me.id);
  const T = today();
  el.innerHTML = `<div class="page-head"><div><h1>Vacaciones y permisos</h1><p class="muted" style="margin:4px 0 0">Tu jefatura (${escape(db.get('employees', me.managerId)?.name || 'RRHH')}) recibe la solicitud y te notificamos la respuesta.</p></div></div>
    <div class="dash-grid">
      <div class="card span-4 stack"><h3 style="margin:0">Saldo de vacaciones</h3><div class="balance"><span class="big">${String(bal.available).replace('.', ',')}</span><span class="muted">días hábiles<br>disponibles</span></div>
        <div class="progress"><i style="--v:${Math.min(100, Math.max(0, bal.available / Math.max(1, bal.accrued) * 100))}%"></i></div>
        <dl class="kv"><dt>Derecho anual</dt><dd>${bal.entitlement} días${bal.entitlement > 15 ? ' (incluye progresivos)' : ''}</dd><dt>Arrastre año anterior</dt><dd>${fmtDays(bal.carry)}</dd><dt>Devengado a la fecha</dt><dd>${fmtDays(bal.accrued)}</dd><dt>Usados ${T.slice(0, 4)}</dt><dd>${fmtDays(bal.used)}</dd><dt>En trámite</dt><dd>${fmtDays(bal.pending)}</dd></dl></div>
      <form class="card span-8 form-grid" data-req novalidate>
        <h3 class="span-2" style="margin:0">Nueva solicitud</h3>
        <div class="field"><label for="rq-type">Tipo</label><select class="select" id="rq-type" name="type">${Object.entries(REQ_TYPES).map(([k, t]) => `<option value="${k}">${t.ico} ${escape(t.label)}</option>`).join('')}</select></div>
        <div class="field"><label>Días hábiles</label><div class="input" data-days style="display:flex;align-items:center;font-weight:700">—</div></div>
        <div class="field"><label for="rq-from">Desde</label><input class="input" id="rq-from" name="from" type="date" min="${addDays(T, -7)}" value="${addDays(T, policy.anticipacionMin + 2)}"></div>
        <div class="field"><label for="rq-to">Hasta</label><input class="input" id="rq-to" name="to" type="date" value="${addDays(T, policy.anticipacionMin + 4)}"></div>
        <label class="check span-2" data-half hidden><input type="checkbox" name="half"> Solo medio día</label>
        <div class="field span-2" data-docbox hidden><label for="rq-doc">Comprobante (PDF o imagen)</label><input class="input" id="rq-doc" name="doc" type="file" accept=".pdf,image/*"></div>
        <div class="field span-2"><label for="rq-reason">Motivo / comentario</label><input class="input" id="rq-reason" name="reason" placeholder="Opcional"></div>
        <p class="form-error span-2" data-err role="alert"></p>
        <div class="span-2 row"><button class="btn btn-primary" type="submit">Enviar solicitud</button><span class="muted small" data-hint></span></div>
      </form>
      <div class="card span-12"><div class="card-h"><h3>Mi calendario</h3><div class="row gap-sm"><button class="btn btn-sm" data-m="-1" aria-label="Mes anterior">←</button><b>${escape(monthLabel(ym))}</b><button class="btn btn-sm" data-m="1" aria-label="Mes siguiente">→</button></div></div>
        ${monthCal(ym, k => mine.filter(r => ['aprobada', 'pendiente'].includes(r.status) && r.from <= k && r.to >= k).map(r => ({ label: REQ_TYPES[r.type].label, cls: r.status === 'pendiente' ? 'pend' : r.type === 'licencia' ? 'lic' : '' })))}</div>
      <div class="card span-12"><h3>Historial</h3><div data-t></div></div>
    </div>`;
  const f = el.querySelector('[data-req]');
  const calc = () => {
    const type = f.type.value, half = f.half.checked && type === 'administrativo';
    el.querySelector('[data-half]').hidden = type !== 'administrativo' || !policy.medioDia;
    el.querySelector('[data-docbox]').hidden = !REQ_TYPES[type].doc;
    if (type === 'administrativo' && f.to.value !== f.from.value) f.to.value = f.from.value;
    const days = half ? .5 : type === 'licencia' ? Math.max(0, daysBetween(f.from.value, f.to.value) + 1) : businessDays(f.from.value, f.to.value);
    el.querySelector('[data-days]').textContent = f.from.value && f.to.value ? fmtDays(days) : '—';
    el.querySelector('[data-hint]').textContent = type === 'vacaciones' ? `Quedarían ${fmtDays(Math.max(0, bal.available - days))}` : REQ_TYPES[type].paid ? 'Con goce de remuneración' : 'Sin goce: se descuenta de la remuneración';
    return days;
  };
  f.addEventListener('input', calc); f.addEventListener('change', calc); calc();
  f.addEventListener('submit', e => {
    e.preventDefault();
    const days = calc();
    const v = { type: f.type.value, from: f.from.value, to: f.to.value, days, reason: f.reason.value.trim(), doc: f.doc.files[0]?.name || null };
    const err = validateRequest(db, me, v, policy);
    el.querySelector('[data-err]').textContent = err || '';
    if (err) return toast(err, 'warning', 4000);
    db.insert('requests', { employeeId: me.id, ...v, status: 'pendiente', approverId: me.managerId, comment: '' });
    if (me.managerId) ctx.notify(me.managerId, `${me.name} solicitó ${REQ_TYPES[v.type].label.toLowerCase()} (${fmtDays(days)}) desde el ${fmtDay(v.from)}.`);
    db.log('solicitud', `${me.name} solicitó ${REQ_TYPES[v.type].label} ${v.from} → ${v.to}`, ctx.user.id);
    ym = v.from.slice(0, 7);
    toast('Solicitud enviada a tu jefatura', 'success');
  });
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { ym = shiftMonth(ym, +b.dataset.m); render(el, ctx); });
  smartTable(el.querySelector('[data-t]'), {
    key: 'p-req', rows: mine.map(r => ({ ...r, tl: REQ_TYPES[r.type]?.label })), sort: 'createdAt', dir: -1, pageSize: 8,
    filters: [{ key: 'status', label: 'Estado', options: [['pendiente', 'Pendiente'], ['aprobada', 'Aprobada'], ['rechazada', 'Rechazada'], ['anulada', 'Anulada']], test: (r, v) => r.status === v }],
    columns: [
      { key: 'tl', label: 'Tipo', render: r => `${REQ_TYPES[r.type]?.ico} ${escape(r.tl)}` },
      { key: 'from', label: 'Fechas', render: r => `${escape(fmtDay(r.from))}${r.to !== r.from ? ` → ${escape(fmtDay(r.to))}` : ''}` },
      { key: 'days', label: 'Días', render: r => String(r.days).replace('.', ',') },
      { key: 'status', label: 'Estado', render: r => reqBadge(r.status) + (r.comment ? `<br><small class="muted">“${escape(r.comment)}”</small>` : '') },
      { key: 'createdAt', label: 'Solicitada', render: r => escape(date(r.createdAt)) },
      { key: 'a', label: '', sort: false, render: r => r.status === 'pendiente' ? `<button class="btn btn-sm btn-ghost" data-cancel="${r.id}">Anular</button>` : '' }
    ]
  });
  el.querySelector('[data-t]').addEventListener('click', e => { const b = e.target.closest('[data-cancel]'); if (!b) return; db.update('requests', b.dataset.cancel, { status: 'anulada' }); db.log('solicitud', `${me.name} anuló una solicitud`, ctx.user.id); toast('Solicitud anulada', 'success'); });
}
