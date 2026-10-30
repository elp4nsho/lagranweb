// Mis visitas: invitar (pre-registrar) visitas y ver su estado en recepción.
import { escape, toast, time } from '../../../assets/core/ui.js';
import { formDialog } from '../shared/form.js';
import { today, fmtDay } from '../shared/dates.js';
import { VISIT_REASONS, VISIT_BADGE, VISIT_LABEL, registerVisit } from '../shared/visits.js';

export function render(el, ctx) {
  const { db, idx } = ctx, me = ctx.me, T = today();
  const mine = db.query('visitors', v => v.hostId === me.id).sort((a, b) => (b.date + b.expectedAt).localeCompare(a.date + a.expectedAt));
  const next = mine.filter(v => v.date >= T && v.status !== 'salió').reverse(), past = mine.filter(v => !(v.date >= T && v.status !== 'salió')).slice(0, 12);
  const row = v => `<div class="visit-item ${v.status === 'salió' ? 'gone' : ''}"><div class="info"><b>${escape(v.name)}</b><small>${escape(v.org || 'Particular')} · ${escape(v.reason)} · ${escape(fmtDay(v.date))} ${v.checkIn ? time(v.checkIn) : escape(v.expectedAt)}</small></div><span class="badge ${VISIT_BADGE[v.status]}">${VISIT_LABEL[v.status]}</span>${v.status === 'esperada' ? `<button class="btn btn-sm btn-ghost" data-cancel="${v.id}">Cancelar</button>` : ''}</div>`;
  el.innerHTML = `<div class="page-head"><div><h1 style="font-size:clamp(24px,4vw,34px)">Mis visitas</h1><p class="muted" style="margin:0">Pre-registra a tus invitados: recepción los verá en el kiosko y te avisaremos cuando lleguen.</p></div><button class="btn btn-primary" data-new>＋ Invitar visita</button></div>
    <div class="dash-grid"><div class="card span-6"><h3>Próximas y en curso</h3><div class="visit-list">${next.map(row).join('') || '<p class="muted">Sin visitas agendadas.</p>'}</div></div>
    <div class="card span-6"><h3>Historial</h3><div class="visit-list">${past.map(row).join('') || '<p class="muted">Sin historial.</p>'}</div></div></div>`;
  el.querySelector('[data-new]').onclick = async () => {
    const v = await formDialog({ title: 'Invitar visita', fields: [
      { name: 'name', label: 'Nombre completo', required: true, span: 2 }, { name: 'org', label: 'Empresa / organización' }, { name: 'email', label: 'Correo (le enviaremos la invitación)', type: 'email' },
      { name: 'date', label: 'Fecha', type: 'date', required: true, min: T }, { name: 'expectedAt', label: 'Hora', type: 'time', required: true },
      { name: 'reason', label: 'Motivo', type: 'select', options: VISIT_REASONS, span: 2 }
    ], values: { date: T, expectedAt: '15:00', reason: 'Reunión' }, submit: 'Enviar invitación' });
    if (!v) return;
    registerVisit(db, idx, { ...v, hostId: me.id }, ctx.user, { pre: true });
    toast(`Invitación registrada${v.email ? ` y enviada a ${v.email} (simulado)` : ''}`, 'success');
  };
  el.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => { const v = db.get('visitors', b.dataset.cancel); db.remove('visitors', v.id); db.log('visita', `${me.name} canceló la visita de ${v.name}`, ctx.user.id); toast('Visita cancelada', 'success'); });
}
