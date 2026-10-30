import { escape, money, toast, confirm, formModal, dateTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { plan, activePlans, statusBadge, settings, planPrice } from '../shared/domain.js';
import { pageHead, kv } from '../shared/shell.js';
import { ymd, addDays } from '../shared/dates.js';
import { icon } from '../shared/icons.js';
import { payModal } from './shared.js';

export function renderPayments(v, _, __, { m, user }) {
  const p = plan(m.planId), s = settings();
  const pays = db.query('payments', x => x.memberId === m.id).sort((a, b) => b.at.localeCompare(a.at));
  v.innerHTML = `${pageHead('Pagos y membresía')}
  <div class="grid-main">
    <div class="card"><h3>Historial de pagos</h3><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Concepto</th><th>Medio</th><th>Monto</th><th>Estado</th></tr></thead><tbody>
      ${pays.map(x => `<tr><td class="nowrap"><small>${escape(dateTime(x.at))}</small></td><td>${escape(x.concept)}</td><td><small>${escape(x.method)}</small></td><td><b>${money(x.amount)}</b></td><td>${x.status === 'pagado' ? '<span class="badge badge-success">Pagado</span>' : '<span class="badge badge-danger">Rechazado</span>'}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Sin pagos</td></tr>'}
    </tbody></table></div></div>
    <div class="stack">
      <div class="card">${kv([['Plan', `${escape(p.name)} (${escape(m.billing)})`], ['Valor', money(planPrice(m))], ['Estado', statusBadge(m.status)], ['Próximo pago', escape(m.nextDue)], ['Socio desde', escape(m.since)], m.freezeUntil && m.status === 'congelado' ? ['Congelado hasta', escape(m.freezeUntil)] : null])}
        <div class="row" style="margin-top:14px">${m.status !== 'congelado' ? `<button class="btn btn-primary btn-sm" data-pay>${icon('card', 14)} ${m.status === 'moroso' ? 'Pagar deuda' : 'Adelantar pago'}</button>` : ''}</div></div>
      <div class="card stack"><h3 class="mb0">${icon('snow', 18)} Congelar membresía</h3>
        <p class="muted small mb0">Pausa tu plan por viaje o lesión (hasta ${s.freezeMaxDays} días, cargo ${money(s.freezeFee)}). Tu fecha de pago se corre.</p>
        ${m.status === 'congelado' ? `<button class="btn" data-unfreeze>Reactivar ahora</button>` : `<button class="btn" data-freeze ${m.status !== 'activo' ? 'disabled' : ''}>Congelar</button>`}</div>
      <div class="card stack"><h3 class="mb0">Cambiar de plan</h3>
        <select class="select" data-plan aria-label="Nuevo plan">${activePlans().map(x => `<option value="${x.id}" ${x.id === m.planId ? 'selected' : ''}>${escape(x.name)} · ${money(x.monthly)}/mes</option>`).join('')}</select>
        <button class="btn" data-change>Solicitar cambio</button></div>
    </div>
  </div>`;
  v.querySelector('[data-pay]')?.addEventListener('click', () => payModal(m));
  v.querySelector('[data-freeze]')?.addEventListener('click', async () => {
    const r = await formModal({ title: 'Congelar membresía', submit: `Congelar (${money(s.freezeFee)})`, fields: [{ name: 'days', label: `Días (7 a ${s.freezeMaxDays})`, type: 'number', value: 14, required: true }, { name: 'reason', label: 'Motivo', type: 'select', options: ['Viaje', 'Lesión', 'Trabajo', 'Otro'] }] });
    if (!r) return;
    const days = Math.round(r.days);
    if (days < 7 || days > s.freezeMaxDays) return toast(`Debe ser entre 7 y ${s.freezeMaxDays} días`, 'warning');
    db.update('members', m.id, { status: 'congelado', freezeUntil: addDays(ymd(), days), nextDue: addDays(m.nextDue, days) });
    db.insert('payments', { memberId: m.id, amount: s.freezeFee, concept: `Congelamiento ${days} días (${r.reason})`, method: 'Tarjeta crédito', at: new Date().toISOString(), status: 'pagado' });
    db.log('congelamiento', `${m.name} congeló ${days} días`, user.id); toast('Membresía congelada', 'success');
  });
  v.querySelector('[data-unfreeze]')?.addEventListener('click', async () => {
    if (!await confirm('¿Reactivar tu membresía hoy?', { title: 'Reactivar', ok: 'Reactivar' })) return;
    db.update('members', m.id, { status: 'activo', freezeUntil: '' }); db.log('congelamiento', `${m.name} reactivó su plan`, user.id); toast('¡Bienvenido/a de vuelta!', 'success');
  });
  v.querySelector('[data-change]').onclick = async () => {
    const np = plan(v.querySelector('[data-plan]').value);
    if (np.id === m.planId) return toast('Ya tienes ese plan', 'info');
    if (!await confirm(`Cambiar a ${np.name} (${money(np.monthly)}/mes). El nuevo valor se cobra desde tu próximo pago.`, { title: 'Cambiar plan', ok: 'Confirmar' })) return;
    db.update('members', m.id, { planId: np.id }); db.log('plan', `${m.name} cambió a ${np.name}`, user.id); toast(`Ahora tienes el plan ${np.name}`, 'success');
  };
}
