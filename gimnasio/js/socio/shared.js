// Utilidades compartidas de la app del socio.
import { escape, money, modal, toast, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { PAY_METHODS } from '../data/catalog.js';
import { plan, branch, discipline, trainer, klass, occupancy, myBooking, bookClass, cancelBooking, registerPayment, planPrice, settings, classStart } from '../shared/domain.js';
import { fmtDay, addDays, ymd, diffDays } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function classModal(m, classId, date) {
  const c = klass(classId), d = discipline(c.disciplineId), t = trainer(c.trainerId), o = occupancy(c, date), mine = myBooking(m.id, c.id, date);
  const hoursTo = (classStart(c, date) - Date.now()) / 36e5;
  const md = modal({ title: d.name, body: `<div class="stack">
    <p class="muted mb0">${escape(d.desc)}</p>
    <div class="table-wrap"><table class="table"><tbody>
      <tr><td>Fecha</td><td style="text-transform:capitalize"><b>${escape(fmtDay(date))} · ${c.time}</b> (${c.duration} min)</td></tr>
      <tr><td>Sede / sala</td><td>${escape(branch(c.branchId)?.name)} · ${escape(c.room)}</td></tr>
      <tr><td>Entrenador/a</td><td>${escape(t?.name)}</td></tr>
      <tr><td>Cupos</td><td>${o.taken} / ${c.capacity}${o.wait ? ` · ${o.wait} en lista de espera` : ''}</td></tr>
    </tbody></table></div>
    <div class="progress"><i style="--v:${Math.min(100, o.pct)}%"></i></div>
    ${mine ? `<p class="mb0"><b>${mine.status === 'espera' ? 'Estás en la lista de espera.' : 'Tienes tu cupo reservado ✓'}</b>${hoursTo < settings().cancelHours ? ` <span class="muted small">(cancelar con menos de ${settings().cancelHours} h cuenta como inasistencia)</span>` : ''}</p>` : ''}
  </div>`, foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${mine ? `<button class="btn btn-danger" data-cancel>Cancelar reserva</button>` : `<button class="btn btn-primary" data-book>${o.free ? 'Reservar cupo' : 'Unirme a la lista de espera'}</button>`}` });
  md.el.querySelector('[data-book]')?.addEventListener('click', () => {
    try { const b = bookClass(m, c, date); toast(b.status === 'espera' ? 'Quedaste en lista de espera. Te avisaremos si se libera un cupo.' : '¡Cupo reservado!', b.status === 'espera' ? 'warning' : 'success'); md.close(); }
    catch (e) { toast(e.message, 'error'); }
  });
  md.el.querySelector('[data-cancel]')?.addEventListener('click', () => { cancelBooking(mine); toast('Reserva cancelada', 'success'); md.close(); });
}

export function payModal(m, { amount = planPrice(m), concept } = {}) {
  const p = plan(m.planId);
  concept ||= `${m.billing === 'anual' ? 'Anualidad' : 'Mensualidad'} ${p.name}`;
  const md = modal({ title: 'Pagar membresía', body: `<div class="stack">
    <div class="row between"><span>${escape(concept)}<br><small class="muted">${escape(m.name)} · ${m.code}</small></span><b style="font-size:26px">${money(amount)}</b></div>
    <div class="field"><label for="pm">Medio de pago</label><select class="select" id="pm">${PAY_METHODS.filter(x => x !== 'Efectivo').map(x => `<option>${x}</option>`).join('')}</select></div>
    <p class="muted small mb0">${icon('lock', 14)} Pago simulado (Webpay de prueba). No se realizan cargos.</p></div>`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${icon('check', 16)} Pagar ${money(amount)}</button>` });
  return new Promise(res => {
    md.el.querySelector('[data-ok]').onclick = async () => {
      const b = md.el.querySelector('[data-ok]'); b.disabled = true; b.innerHTML = '<span class="spinner"></span> Procesando…';
      await new Promise(r => setTimeout(r, 700));
      const next = registerPayment(m, { amount, concept, method: md.el.querySelector('#pm').value });
      toast(`Pago aprobado. Próximo vencimiento: ${next}`, 'success'); md.close(); res(true);
    };
  });
}

// Puntaje de un desafío. Para "clases" se suman asistencias registradas + visitas estimadas a clases
// (la asistencia histórica de clases se guarda agregada por sesión).
export function challengeScore(ch, memberId) {
  const inRange = x => x >= ch.start && x <= ch.end + 'T99';
  const visits = db.count('checkins', k => k.memberId === memberId && inRange(k.at));
  if (ch.metric === 'checkins') return visits;
  return db.count('bookings', b => b.memberId === memberId && b.status === 'asistio' && inRange(b.date)) + Math.round(visits * .45);
}
export function leaderboard(ch) {
  const ids = [...new Set(db.query('checkins', k => k.at >= ch.start && k.at <= ch.end + 'T99').map(k => k.memberId))];
  return ids.map(id => ({ id, score: challengeScore(ch, id) })).sort((a, b) => b.score - a.score);
}
export const daysLeft = d => diffDays(d, ymd());
