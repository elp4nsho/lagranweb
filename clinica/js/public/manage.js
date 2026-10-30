// Gestionar una hora: confirmar, anular, reagendar (con código + RUT).
import { escape, money, toast, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { STATUS } from '../data/catalog.js';
import { settings, doctor, specialty, patient, box, statusBadge, setStatus, prevision, isActive } from '../shared/domain.js';
import { fmtDay, toMin } from '../shared/dates.js';
import { sameRut, fmtRut } from '../shared/rut.js';
import { downloadICS } from '../shared/ics.js';
import { icon } from '../shared/icons.js';

let found = null;

export function renderManage(el, _, query) {
  el.innerHTML = `<section class="section"><div class="container stack" style="max-width:820px">
    <div data-anim><span class="eyebrow">Mi hora</span><h1 class="mb0">Confirma, anula o cambia tu hora</h1></div>
    <form class="card stack" novalidate data-find>
      <div class="grid-2">
        <div class="field"><label for="m-code">Código de reserva</label><input class="input" id="m-code" name="code" placeholder="AL-XXXX" value="${escape(query.code || found?.code || '')}" style="text-transform:uppercase"></div>
        <div class="field"><label for="m-rut">RUT del paciente</label><input class="input" id="m-rut" name="rut" placeholder="12.345.678-5" value="${escape(found ? patient(found.patientId)?.rut : '')}"></div>
      </div>
      <div class="row between"><button class="btn btn-primary" type="submit">${icon('search', 16)} Buscar mi hora</button><span class="muted small">Demo: código <b>AL-7K2Q</b> · RUT <b>16.543.210-K</b></span></div>
    </form>
    <div data-result></div>
  </div></section>`;
  const form = el.querySelector('[data-find]');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const code = form.elements.code.value.trim().toUpperCase(), rut = form.elements.rut.value;
    const a = db.find('appointments', x => x.code === code);
    if (!a || !sameRut(patient(a.patientId)?.rut, rut)) { found = null; show(el); return toast('No encontramos una hora con esos datos', 'error'); }
    found = a; show(el);
  });
  form.elements.rut.addEventListener('blur', e => { if (e.target.value) e.target.value = fmtRut(e.target.value); });
  show(el);
}

function show(el) {
  const box_ = el.querySelector('[data-result]');
  if (!found) { box_.innerHTML = ''; return; }
  const a = db.get('appointments', found.id); found = a;
  const d = doctor(a.doctorId), p = patient(a.patientId), sp = specialty(a.specialtyId), s = settings();
  const hoursLeft = (new Date(`${a.date}T${a.time}:00`) - Date.now()) / 36e5;
  const canCancel = isActive(a) && a.status !== 'en_atencion' && hoursLeft > (s.cancelHours || 0);
  box_.innerHTML = `<div class="card stack" data-anim>
    <div class="row between"><div><span class="muted small">Código</span><h2 class="mb0 mono">${escape(a.code)}</h2></div>${statusBadge(a.status)}</div>
    <div class="table-wrap"><table class="table"><tbody>
      <tr><td>Paciente</td><td><b>${escape(p.name)}</b></td></tr>
      <tr><td>Profesional</td><td>${escape(d.name)} · ${escape(sp.name)}</td></tr>
      <tr><td>Fecha</td><td style="text-transform:capitalize"><b>${escape(fmtDay(a.date))} · ${a.time}</b></td></tr>
      <tr><td>Modalidad</td><td>${a.mode === 'tele' ? 'Telemedicina' : `Presencial · ${escape(box(d.boxId)?.name || '')}`}</td></tr>
      <tr><td>Valor</td><td>${money(a.price)} · ${escape(prevision(a.prevision).label)} ${a.paid ? '<span class="badge badge-success">Pagado</span>' : ''}</td></tr>
    </tbody></table></div>
    ${isActive(a) ? `<div class="row">
      ${a.status === 'reservada' ? `<button class="btn btn-primary" data-confirm>${icon('check', 16)} Confirmar asistencia</button>` : ''}
      ${a.mode === 'tele' ? `<a class="btn btn-accent" href="#/telemedicina/${a.code}">${icon('video', 16)} Entrar a sala virtual</a>` : ''}
      <button class="btn" data-ics>${icon('calendar', 16)} Agregar al calendario</button>
      ${canCancel ? `<a class="btn" href="#/reservar?re=${a.id}&med=${a.doctorId}">${icon('refresh', 16)} Reagendar</a><button class="btn btn-danger" data-cancel>${icon('x', 16)} Anular hora</button>` : `<span class="muted small">Ya no es posible anular en línea (menos de ${s.cancelHours} h). Llama al ${escape(s.phone)}.</span>`}
    </div>` : `<p class="muted mb0">Esta hora está ${escape(STATUS[a.status]?.label.toLowerCase())}. <a href="#/reservar">Reservar una nueva hora</a></p>`}
  </div>`;
  box_.querySelector('[data-confirm]')?.addEventListener('click', () => { setStatus(a, 'confirmada'); toast('¡Gracias! Tu asistencia quedó confirmada', 'success'); show(el); });
  box_.querySelector('[data-cancel]')?.addEventListener('click', async () => {
    if (!await confirm(`¿Anular tu hora del ${fmtDay(a.date)} a las ${a.time}? El cupo quedará disponible para otro paciente.`, { title: 'Anular hora', ok: 'Sí, anular', danger: true })) return;
    setStatus(a, 'cancelada'); toast('Hora anulada. Te enviamos un correo de confirmación.', 'success'); show(el);
  });
  box_.querySelector('[data-ics]')?.addEventListener('click', () => downloadICS(`hora-${a.code}.ics`, { uid: `${a.code}@alerce.demo`, date: a.date, time: a.time, duration: d.schedule.slot, title: `${sp.name} · ${d.name}`, location: s.address, description: `Código ${a.code}` }));
}
