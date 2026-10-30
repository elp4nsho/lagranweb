// Modales de citas compartidos por admin, recepción y médico: detalle con flujo de estados,
// cobro, recordatorio, reprogramación y creación de citas.
import { escape, money, modal, toast, confirm, dateTime } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { STATUS } from '../data/catalog.js';
import { doctor, specialty, patient, box, statusBadge, setStatus, notify, prevision, freeSlots, book, isActive, priceFor, activeDoctors } from './domain.js';
import { fmtDay, ymd } from './dates.js';
import { kv } from './shell.js';
import { icon } from './icons.js';

// Siguiente paso natural del flujo
export const NEXT = {
  reservada: [['confirmada', 'Confirmar', 'check'], ['en_espera', 'Check-in', 'pin']],
  confirmada: [['en_espera', 'Check-in (llegó)', 'pin']],
  en_espera: [['llamado', 'Llamar a box', 'megaphone']],
  llamado: [['en_atencion', 'Iniciar atención', 'steth']],
  en_atencion: [['atendida', 'Marcar atendida', 'check']]
};
export const PAY_METHODS = ['Bono Fonasa', 'Bono Isapre (IMED)', 'Débito', 'Crédito', 'Efectivo', 'Transferencia'];

export function openAppt(id) {
  const a = db.get('appointments', id);
  if (!a) return;
  const d = doctor(a.doctorId), p = patient(a.patientId);
  const m = modal({ title: `Cita ${a.code}`, size: 'lg', body: `
    <div class="row between" style="margin-bottom:12px">${statusBadge(a.status)}<span class="muted small">Creada ${escape(dateTime(a.createdAt))}${a.channel ? ' · ' + escape(a.channel) : ''}</span></div>
    <div class="grid-2">
      ${kv([['Paciente', `<a href="admin.html#/pacientes/${p?.id}">${escape(p?.name)}</a>`], ['RUT', escape(p?.rut)], ['Teléfono', escape(p?.phone)], ['Previsión', escape(prevision(a.prevision).label)], ['Motivo', escape(a.reason || '—')]])}
      ${kv([['Profesional', escape(d?.name)], ['Especialidad', escape(specialty(a.specialtyId)?.name)], ['Fecha', `<span style="text-transform:capitalize">${escape(fmtDay(a.date))}</span> · ${a.time}`], ['Modalidad', a.mode === 'tele' ? 'Telemedicina' : 'Presencial · ' + escape(box(a.boxId || d?.boxId)?.name || '')], ['Valor', `${money(a.price)} ${a.paid ? `<span class="badge badge-success">Pagado · ${escape(a.payMethod || '')}</span>` : '<span class="badge badge-warning">Pendiente</span>'}`]])}
    </div>
    ${a.checkinAt ? `<p class="small muted" style="margin-top:12px">Check-in ${escape(dateTime(a.checkinAt))}${a.calledAt ? ` · Llamado ${escape(dateTime(a.calledAt))}` : ''}</p>` : ''}
    ${a.note ? `<p class="small">Nota: ${escape(a.note)}</p>` : ''}`,
    foot: `${isActive(a) ? `<button class="btn btn-ghost btn-sm" data-cancel>${icon('x', 14)} Cancelar</button>${a.status !== 'en_atencion' ? '<button class="btn btn-ghost btn-sm" data-noshow>No asistió</button>' : ''}<button class="btn btn-sm" data-move>${icon('refresh', 14)} Reprogramar</button><button class="btn btn-sm" data-sms>${icon('bell', 14)} Recordar</button>` : ''}
      ${!a.paid && a.status !== 'cancelada' ? `<button class="btn btn-sm btn-accent" data-pay>${icon('money', 14)} Cobrar</button>` : ''}
      ${(NEXT[a.status] || []).map(([s, l, i]) => `<button class="btn btn-sm btn-primary" data-st="${s}">${icon(i, 14)} ${l}</button>`).join('')}` });
  const close = () => m.close();
  m.el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { setStatus(a, b.dataset.st); toast(`${a.code}: ${STATUS[b.dataset.st].label}`, 'success'); close(); });
  m.el.querySelector('[data-cancel]')?.addEventListener('click', async () => { close(); if (await confirm(`¿Cancelar la cita ${a.code} de ${p?.name}? Se notificará al paciente.`, { title: 'Cancelar cita', danger: true, ok: 'Cancelar cita' })) { setStatus(a, 'cancelada'); toast('Cita cancelada', 'success'); } });
  m.el.querySelector('[data-noshow]')?.addEventListener('click', () => { setStatus(a, 'no_show'); toast('Marcada como no asistió', 'warning'); close(); });
  m.el.querySelector('[data-sms]')?.addEventListener('click', () => { notify(a, 'sms'); notify(a, 'email'); toast('Recordatorio enviado por SMS y correo', 'success'); });
  m.el.querySelector('[data-pay]')?.addEventListener('click', () => { close(); payModal(a); });
  m.el.querySelector('[data-move]')?.addEventListener('click', () => { close(); moveModal(a); });
}

export function payModal(a) {
  const p = patient(a.patientId), t = prevision(a.prevision).type;
  const def = t === 'fonasa' ? 'Bono Fonasa' : t === 'isapre' ? 'Bono Isapre (IMED)' : 'Débito';
  const m = modal({ title: `Cobrar ${a.code}`, body: `<div class="stack">
    <div class="row between"><span>${escape(p?.name)}<br><small class="muted">${escape(prevision(a.prevision).label)} · ${escape(specialty(a.specialtyId)?.name)}</small></span><b style="font-size:26px">${money(a.price)}</b></div>
    <div class="field"><label for="pm">Medio de pago</label><select class="select" id="pm">${PAY_METHODS.map(x => `<option ${x === def ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="field" data-folio><label for="pf">Folio bono / N° operación</label><input class="input" id="pf" value="${t !== 'particular' ? 'B' + Math.floor(10000000 + Math.random() * 89999999) : ''}"></div>
    <p class="muted small mb0">${t === 'fonasa' ? 'Validación con huella simulada · Bono MLE nivel 3.' : t === 'isapre' ? 'Bono electrónico IMED emitido en línea (simulado).' : 'Pago particular, se emite boleta electrónica.'}</p></div>`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${icon('check', 16)} Registrar pago</button>` });
  m.el.querySelector('[data-ok]').onclick = () => {
    const method = m.el.querySelector('#pm').value, folio = m.el.querySelector('#pf').value;
    db.update('appointments', a.id, { paid: true, payMethod: method, folio, paidAt: new Date().toISOString(), cashier: auth.current()?.id });
    db.log('pago', `${a.code} · ${money(a.price)} · ${method}`, auth.current()?.id);
    toast(`Pago registrado: ${money(a.price)}`, 'success'); m.close();
  };
}

function slotOptions(docId, date, keep) {
  const f = freeSlots(doctor(docId), date);
  if (keep && !f.includes(keep)) f.unshift(keep);
  return f.length ? f.map(t => `<option>${t}</option>`).join('') : '<option value="">Sin horas</option>';
}

export function moveModal(a) {
  const m = modal({ title: `Reprogramar ${a.code}`, body: `<div class="stack">
    <div class="field"><label for="mv-d">Profesional</label><select class="select" id="mv-d">${activeDoctors(a.specialtyId).map(d => `<option value="${d.id}" ${d.id === a.doctorId ? 'selected' : ''}>${escape(d.name)}</option>`).join('')}</select></div>
    <div class="grid-2"><div class="field"><label for="mv-f">Fecha</label><input class="input" type="date" id="mv-f" min="${ymd()}" value="${a.date >= ymd() ? a.date : ymd()}"></div>
    <div class="field"><label for="mv-t">Hora</label><select class="select" id="mv-t"></select></div></div>
    <label class="check"><input type="checkbox" id="mv-n" checked> Notificar al paciente por SMS</label></div>`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button>` });
  const $d = m.el.querySelector('#mv-d'), $f = m.el.querySelector('#mv-f'), $t = m.el.querySelector('#mv-t');
  const fill = () => { $t.innerHTML = slotOptions($d.value, $f.value); };
  $d.onchange = fill; $f.onchange = fill; fill();
  m.el.querySelector('[data-ok]').onclick = () => {
    if (!$t.value) return toast('Elige una hora disponible', 'warning');
    const d = doctor($d.value);
    const row = db.update('appointments', a.id, { doctorId: d.id, date: $f.value, time: $t.value, boxId: null, status: a.status === 'no_show' ? 'reservada' : a.status });
    db.log('cita', `${a.code} reprogramada a ${$f.value} ${$t.value} con ${d.name}`, auth.current()?.id);
    if (m.el.querySelector('#mv-n').checked) notify(row, 'sms', 'recordatorio');
    toast('Cita reprogramada', 'success'); m.close();
  };
}

export function newApptModal({ patientId = '', doctorId = '', date = ymd(), walkIn = false } = {}) {
  const pats = db.all('patients').sort((a, b) => a.name.localeCompare(b.name));
  const docs = activeDoctors();
  const m = modal({ title: walkIn ? 'Agendar paciente (sobrecupo / presencial)' : 'Nueva cita', size: 'lg', body: `<div class="stack">
    <div class="field"><label for="na-p">Paciente</label><input class="input" list="na-pl" id="na-p" placeholder="Escribe nombre o RUT…" value="${escape(patient(patientId) ? `${patient(patientId).name} · ${patient(patientId).rut}` : '')}"><datalist id="na-pl">${pats.map(p => `<option value="${escape(p.name)} · ${escape(p.rut)}"></option>`).join('')}</datalist><small class="muted">¿Paciente nuevo? Créalo primero en Pacientes.</small></div>
    <div class="grid-2">
      <div class="field"><label for="na-d">Profesional</label><select class="select" id="na-d">${docs.map(d => `<option value="${d.id}" ${d.id === doctorId ? 'selected' : ''}>${escape(d.name)} · ${escape(specialty(d.specialtyId)?.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="na-m">Modalidad</label><select class="select" id="na-m"><option value="presencial">Presencial</option><option value="tele">Telemedicina</option></select></div>
      <div class="field"><label for="na-f">Fecha</label><input class="input" type="date" id="na-f" min="${ymd()}" value="${date}"></div>
      <div class="field"><label for="na-t">Hora</label><select class="select" id="na-t"></select></div>
    </div>
    <div class="field"><label for="na-r">Motivo</label><input class="input" id="na-r"></div>
    <div class="muted small" data-price></div></div>`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${icon('check', 16)} Agendar</button>` });
  const $ = s => m.el.querySelector(s);
  const findP = () => { const v = $('#na-p').value; return pats.find(p => v.includes(p.rut)) || pats.find(p => p.name === v); };
  const fill = () => {
    $('#na-t').innerHTML = slotOptions($('#na-d').value, $('#na-f').value);
    const d = doctor($('#na-d').value), p = findP();
    $('#na-m').querySelector('[value=tele]').disabled = !d.tele;
    if (!d.tele) $('#na-m').value = 'presencial';
    $('[data-price]').innerHTML = p ? `Valor: <b>${money(priceFor(d.specialtyId, p.prevision))}</b> (${escape(prevision(p.prevision).label)})` : '';
  };
  ['#na-d', '#na-f', '#na-p'].forEach(s => $(s).addEventListener('change', fill)); fill();
  return new Promise(resolve => {
    $('[data-ok]').onclick = () => {
      const p = findP();
      if (!p) return toast('Selecciona un paciente de la lista', 'warning');
      if (!$('#na-t').value) return toast('No hay hora disponible ese día', 'warning');
      try {
        const a = book({ doctorId: $('#na-d').value, date: $('#na-f').value, time: $('#na-t').value, mode: $('#na-m').value, reason: $('#na-r').value, patientId: p.id, by: walkIn ? 'recepción' : 'admin' });
        if (walkIn && a.date === ymd()) setStatus(a, 'en_espera');
        toast(`Cita ${a.code} agendada`, 'success'); m.close(); resolve(a);
      } catch (e) { toast(e.message, 'error'); }
    };
  });
}
