// Reserva en línea: especialidad → profesional → día y hora → datos → confirmación.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { PREVISIONES } from '../data/catalog.js';
import { settings, activeSpecialties, activeDoctors, doctor, specialty, patient, freeSlots, nextAvailable, priceFor, book, setStatus, prevision, findPatientByRut, box } from '../shared/domain.js';
import { ymd, addDays, parseYmd, fmtDay, DOW_S, MONTHS } from '../shared/dates.js';
import { validRut, fmtRut } from '../shared/rut.js';
import { downloadICS, googleCalUrl } from '../shared/ics.js';
import { icon } from '../shared/icons.js';

const STEPS = ['Especialidad', 'Profesional', 'Día y hora', 'Tus datos', 'Confirmación'];
let st = fresh(), lastQuery = '';
function fresh() { return { step: 1, specialtyId: '', doctorId: '', mode: 'presencial', date: '', time: '', week: 0, forId: '', other: false, form: {}, result: null, rescheduleId: '' }; }

export function renderBooking(el, _, query) {
  const qs = JSON.stringify(query);
  if (qs !== lastQuery) {
    lastQuery = qs;
    if (Object.keys(query).length || st.step === 5) st = fresh();
    if (query.esp && specialty(query.esp)) { st.specialtyId = query.esp; st.step = 2; }
    if (query.med && doctor(query.med)) { const d = doctor(query.med); st.doctorId = d.id; st.specialtyId = d.specialtyId; st.step = 3; }
    if (query.modo === 'tele') st.mode = 'tele';
    if (query.fecha) { st.date = query.fecha; st.week = Math.max(0, Math.floor((parseYmd(query.fecha) - parseYmd(ymd())) / 864e5 / 7)); }
    if (query.hora && st.doctorId && freeSlots(doctor(st.doctorId), st.date).includes(query.hora)) { st.time = query.hora; st.step = 4; }
    if (query.re) { const a = db.get('appointments', query.re); if (a) { st.rescheduleId = a.id; st.forId = a.patientId; st.mode = a.mode; } }
  }
  draw(el);
}

function draw(el) {
  const s = settings();
  el.innerHTML = `<section class="section"><div class="container">
    <div class="section-head"><div><span class="eyebrow">Reserva en línea</span><h1 class="mb0">${st.rescheduleId ? 'Reagendar tu hora' : 'Reserva tu hora'}</h1></div>
    ${st.step > 1 && st.step < 5 ? `<button class="btn btn-ghost" data-back>${icon('back', 16)} Volver</button>` : ''}</div>
    ${st.rescheduleId ? `<div class="card" style="margin-bottom:16px">${icon('refresh', 16)} Estás cambiando la hora <b>${escape(db.get('appointments', st.rescheduleId)?.code || '')}</b>. La hora anterior se anulará al confirmar la nueva.</div>` : ''}
    <ol class="steps">${STEPS.map((t, i) => `<li class="${i + 1 < st.step ? 'done' : i + 1 === st.step ? 'current' : ''}">${t}</li>`).join('')}</ol>
    <div class="booking-layout">
      <div data-body></div>
      ${st.step < 5 ? `<aside class="card summary">${summary()}</aside>` : '<aside></aside>'}
    </div>
  </div></section>`;
  const body = el.querySelector('[data-body]');
  [step1, step2, step3, step4, step5][st.step - 1](body, el, s);
  el.querySelector('[data-back]')?.addEventListener('click', () => { st.step--; if (st.step === 3) st.time = ''; draw(el); });
}

function summary() {
  const sp = specialty(st.specialtyId), d = doctor(st.doctorId);
  const prev = currentPrevision();
  const price = sp ? priceFor(sp.id, prev) : 0;
  return `<h3>Resumen</h3>
    <div class="line"><span>Especialidad</span><span>${escape(sp?.name || '—')}</span></div>
    <div class="line"><span>Profesional</span><span>${escape(d?.name || '—')}</span></div>
    <div class="line"><span>Modalidad</span><span>${st.mode === 'tele' ? 'Telemedicina' : 'Presencial'}</span></div>
    <div class="line"><span>Fecha</span><span style="text-transform:capitalize">${st.date ? escape(fmtDay(st.date)) : '—'}</span></div>
    <div class="line"><span>Hora</span><span>${st.time || '—'}</span></div>
    <div class="line"><span>Previsión</span><span>${escape(prevision(prev).label)}</span></div>
    <div class="line"><span>Valor a pagar</span><span style="font-size:18px">${sp ? money(price) : '—'}</span></div>
    <p class="muted small mb0">${icon('shield', 14)} Pagas en recepción o con bono electrónico. Puedes anular sin costo hasta ${settings().cancelHours} h antes.</p>`;
}
function currentPrevision() {
  if (st.forId) return patient(st.forId)?.prevision || 'particular';
  return st.form.prevision || 'fonasa-b';
}

function step1(body, el) {
  body.innerHTML = `<div class="card"><h3>¿Qué especialidad necesitas?</h3><div class="pick-grid">
    ${activeSpecialties().map(s => `<button class="pick ${st.specialtyId === s.id ? 'sel' : ''}" data-id="${s.id}"><span class="icon-bubble">${icon(s.icon, 22)}</span><span><b>${escape(s.name)}</b><small>${activeDoctors(s.id).length} profesionales · desde ${money(s.prices.fonasa)}</small></span></button>`).join('')}
  </div></div>`;
  body.querySelectorAll('.pick').forEach(b => b.onclick = () => { if (st.specialtyId !== b.dataset.id) st.doctorId = ''; st.specialtyId = b.dataset.id; st.step = 2; draw(el); });
}

function step2(body, el, s) {
  const docs = activeDoctors(st.specialtyId).filter(d => st.mode !== 'tele' || d.tele);
  const anyTele = activeDoctors(st.specialtyId).some(d => d.tele) && s.teleEnabled;
  if (!anyTele) st.mode = 'presencial';
  body.innerHTML = `<div class="card stack">
    <div class="row between"><h3 class="mb0">Elige profesional</h3>
    ${anyTele ? `<div class="mode-switch" role="group" aria-label="Modalidad"><button class="chip ${st.mode === 'presencial' ? 'active' : ''}" data-mode="presencial">${icon('pin', 14)} Presencial</button><button class="chip ${st.mode === 'tele' ? 'active' : ''}" data-mode="tele">${icon('video', 14)} Telemedicina</button></div>` : ''}</div>
    <div class="pick-grid">
    ${docs.map(d => { const nx = nextAvailable(d, s.bookingDays); return `<button class="pick ${st.doctorId === d.id ? 'sel' : ''}" data-id="${d.id}" ${nx ? '' : 'disabled'}><span class="avatar" style="--av:${d.color}">${escape(initials(d.name.replace(/^(Dra?\.|Ps\.|Nut\.)\s*/, '')))}</span><span><b>${escape(d.name)}</b><small>${nx ? `Próxima: ${escape(fmtDay(nx.date, { weekday: 'short', day: 'numeric', month: 'short' }))} ${nx.time}` : 'Sin horas disponibles'}</small><small>${icon('star', 12)} ${d.rating}${d.tele ? ' · Telemedicina' : ''}</small></span></button>`; }).join('') || '<div class="empty">No hay profesionales con esa modalidad.</div>'}
    </div>
    ${docs.length > 1 ? `<button class="btn btn-ghost wrap" data-first>${icon('clock', 16)} Quiero la primera hora disponible con cualquier profesional</button>` : ''}
  </div>`;
  body.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { st.mode = b.dataset.mode; if (st.mode === 'tele' && st.doctorId && !doctor(st.doctorId).tele) st.doctorId = ''; draw(el); });
  body.querySelectorAll('.pick').forEach(b => b.onclick = () => { st.doctorId = b.dataset.id; st.date = ''; st.time = ''; st.week = 0; st.step = 3; draw(el); });
  body.querySelector('[data-first]')?.addEventListener('click', () => {
    const best = docs.map(d => ({ d, nx: nextAvailable(d, s.bookingDays) })).filter(x => x.nx).sort((a, b) => (a.nx.date + a.nx.time).localeCompare(b.nx.date + b.nx.time))[0];
    if (!best) return toast('No hay horas disponibles', 'warning');
    Object.assign(st, { doctorId: best.d.id, date: best.nx.date, time: best.nx.time, step: 4 });
    draw(el);
  });
}

function step3(body, el, s) {
  const d = doctor(st.doctorId), today = ymd(), max = s.bookingDays || 21;
  const start = addDays(today, st.week * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const counts = Object.fromEntries(days.map(x => [x, x <= addDays(today, max) ? freeSlots(d, x).length : 0]));
  if (!st.date || !days.includes(st.date)) st.date = days.find(x => counts[x]) || '';
  const free = st.date ? freeSlots(d, st.date) : [];
  const am = free.filter(t => t < '13:00'), pm = free.filter(t => t >= '13:00');
  const sd = parseYmd(start), ed = parseYmd(days[6]);
  body.innerHTML = `<div class="card stack">
    <h3 class="mb0">Elige día y hora · ${escape(d.name)}</h3>
    <div class="cal-nav"><button class="btn btn-sm btn-ghost" data-w="-1" ${st.week === 0 ? 'disabled' : ''} aria-label="Semana anterior">${icon('back', 16)}</button>
      <b>${sd.getDate()} ${MONTHS[sd.getMonth()].slice(0, 3)} – ${ed.getDate()} ${MONTHS[ed.getMonth()].slice(0, 3)}</b>
      <button class="btn btn-sm btn-ghost" data-w="1" ${(st.week + 1) * 7 > max ? 'disabled' : ''} aria-label="Semana siguiente">${icon('arrow', 16)}</button></div>
    <div class="days-strip">${days.map(x => { const dd = parseYmd(x); return `<button class="day-btn ${x === st.date ? 'sel' : ''}" data-d="${x}" ${counts[x] ? '' : 'disabled'}><small>${DOW_S[dd.getDay()]}</small><b>${dd.getDate()}</b><span class="n">${counts[x] ? counts[x] + ' hrs' : '—'}</span></button>`; }).join('')}</div>
    ${st.date ? `<div><p class="muted" style="text-transform:capitalize">${escape(fmtDay(st.date))} · ${st.mode === 'tele' ? 'Telemedicina' : escape(box(d.boxId)?.name || '')}</p>
      ${am.length ? `<div class="slot-group"><h4>Mañana</h4><div class="slots">${am.map(t => `<button class="slot ${st.time === t ? 'sel' : ''}" data-t="${t}">${t}</button>`).join('')}</div></div>` : ''}
      ${pm.length ? `<div class="slot-group"><h4>Tarde</h4><div class="slots">${pm.map(t => `<button class="slot ${st.time === t ? 'sel' : ''}" data-t="${t}">${t}</button>`).join('')}</div></div>` : ''}
      ${!free.length ? '<div class="empty">Sin horas este día.</div>' : ''}</div>`
      : `<div class="empty">No hay horas esta semana. Prueba la siguiente →</div>`}
  </div>`;
  body.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { st.week += +b.dataset.w; st.date = ''; draw(el); });
  body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { st.date = b.dataset.d; st.time = ''; draw(el); });
  body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { st.time = b.dataset.t; st.step = 4; draw(el); });
}

function step4(body, el) {
  const u = auth.current();
  const me = u?.role === 'paciente' ? patient(u.patientId) : null;
  const family = me ? [me, ...db.query('patients', p => p.holderId === me.id)] : [];
  if (me && !st.forId && !st.other) st.forId = me.id;
  const f = st.form;
  body.innerHTML = `<form class="card stack" novalidate>
    <h3 class="mb0">¿Para quién es la hora?</h3>
    ${family.length ? `<div class="pick-grid">${family.map(p => `<button type="button" class="pick ${st.forId === p.id ? 'sel' : ''}" data-for="${p.id}"><span class="avatar">${escape(initials(p.name))}</span><span><b>${escape(p.name)}</b><small>${escape(p.relation || 'Titular')} · ${escape(prevision(p.prevision).label)}</small></span></button>`).join('')}
      <button type="button" class="pick ${st.other ? 'sel' : ''}" data-other><span class="icon-bubble">${icon('plus', 20)}</span><span><b>Otra persona</b><small>Ingresar datos</small></span></button></div>` : `<p class="muted mb0">¿Ya eres paciente? <a href="#/portal">Ingresa a tu portal</a> para reservar más rápido.</p>`}
    ${!family.length || st.other || (!st.forId && !me) ? `
    <div class="grid-2">
      <div class="field"><label for="b-rut">RUT *</label><input class="input" id="b-rut" name="rut" placeholder="12.345.678-5" value="${escape(f.rut || '')}" autocomplete="off"><small class="muted" data-rutmsg></small></div>
      <div class="field"><label for="b-name">Nombre completo *</label><input class="input" id="b-name" name="name" value="${escape(f.name || '')}" autocomplete="name"></div>
      <div class="field"><label for="b-birth">Fecha de nacimiento</label><input class="input" id="b-birth" name="birth" type="date" value="${escape(f.birth || '')}" max="${ymd()}"></div>
      <div class="field"><label for="b-prev">Previsión *</label><select class="select" id="b-prev" name="prevision">${PREVISIONES.map(p => `<option value="${p.id}" ${(f.prevision || 'fonasa-b') === p.id ? 'selected' : ''}>${escape(p.label)}</option>`).join('')}</select></div>
      <div class="field"><label for="b-email">Correo *</label><input class="input" id="b-email" name="email" type="email" value="${escape(f.email || '')}" autocomplete="email"></div>
      <div class="field"><label for="b-phone">Celular *</label><input class="input" id="b-phone" name="phone" type="tel" placeholder="+56 9 1234 5678" value="${escape(f.phone || '')}" autocomplete="tel"></div>
    </div>` : ''}
    <div class="field"><label for="b-reason">Motivo de consulta (opcional)</label><textarea class="textarea" id="b-reason" name="reason" style="min-height:70px">${escape(f.reason || '')}</textarea></div>
    <label class="check"><input type="checkbox" name="terms" ${f.terms ? 'checked' : ''}> Acepto las condiciones de reserva y el tratamiento de mis datos de salud.</label>
    <div class="row"><button class="btn btn-primary btn-lg" type="submit">${icon('check', 18)} Confirmar reserva</button><span class="muted small">Recibirás la confirmación por correo y SMS.</span></div>
  </form>`;
  const form = body.querySelector('form');
  body.querySelectorAll('[data-for]').forEach(b => b.onclick = () => { st.forId = b.dataset.for; st.other = false; draw(el); });
  body.querySelector('[data-other]')?.addEventListener('click', () => { st.forId = ''; st.other = true; draw(el); });
  const sync = () => { [...form.elements].forEach(i => { if (i.name) f[i.name] = i.type === 'checkbox' ? i.checked : i.value; }); };
  form.addEventListener('input', sync);
  sync();
  form.elements.prevision?.addEventListener('change', () => { sync(); el.querySelector('.summary').innerHTML = summary(); });
  const rut = form.elements.rut;
  rut?.addEventListener('blur', () => {
    if (!rut.value) return;
    rut.value = fmtRut(rut.value); sync();
    const ok = validRut(rut.value), msg = body.querySelector('[data-rutmsg]');
    rut.classList.toggle('invalid', !ok);
    const known = ok && findPatientByRut(rut.value);
    msg.textContent = !ok ? 'RUT inválido' : known ? '¡Hola de nuevo! Encontramos tu ficha.' : '';
    if (known) { for (const k of ['name', 'email', 'phone', 'birth', 'prevision']) { if (!form.elements[k].value || k === 'prevision') { form.elements[k].value = known[k] || ''; } } sync(); el.querySelector('.summary').innerHTML = summary(); }
  });
  form.addEventListener('submit', e => {
    e.preventDefault(); sync();
    const usingForm = !!form.elements.rut;
    let bad = [];
    if (usingForm) {
      if (!validRut(f.rut)) bad.push('rut');
      if (!f.name || f.name.trim().length < 5) bad.push('name');
      if (!/^\S+@\S+\.\S+$/.test(f.email || '')) bad.push('email');
      if (!f.phone || f.phone.replace(/\D/g, '').length < 8) bad.push('phone');
      ['rut', 'name', 'email', 'phone'].forEach(k => form.elements[k].classList.toggle('invalid', bad.includes(k)));
    }
    if (bad.length) return toast('Revisa los campos marcados', 'warning');
    if (!f.terms) return toast('Debes aceptar las condiciones de reserva', 'warning');
    try {
      const a = book({ doctorId: st.doctorId, date: st.date, time: st.time, mode: st.mode, reason: f.reason || '',
        patientId: usingForm ? null : st.forId,
        patientData: usingForm ? { rut: f.rut, name: f.name.trim(), birth: f.birth, email: f.email.trim(), phone: f.phone.trim(), prevision: f.prevision, sex: '' } : null });
      if (st.rescheduleId) { const old = db.get('appointments', st.rescheduleId); if (old) setStatus(old, 'cancelada', { note: `Reagendada a ${a.code}` }); }
      st.result = a.id; st.step = 5; draw(el);
      toast('¡Reserva confirmada!', 'success');
    } catch (err) { toast(err.message, 'error'); st.step = 3; st.time = ''; draw(el); }
  });
}

function step5(body) {
  const a = db.get('appointments', st.result);
  if (!a) { body.innerHTML = '<div class="card empty">Reserva no encontrada.</div>'; return; }
  const d = doctor(a.doctorId), p = patient(a.patientId), sp = specialty(a.specialtyId), s = settings();
  const ev = { uid: `${a.code}@alerce.demo`, date: a.date, time: a.time, duration: d.schedule.slot, title: `${sp.name} · ${d.name}`, location: a.mode === 'tele' ? 'Telemedicina (sala virtual)' : `${s.name}, ${s.address}`, description: `Código de reserva ${a.code}. Paciente ${p.name}.` };
  body.innerHTML = `<div class="card ticket stack" data-anim="bounceIn">
    <div class="check-big">${icon('check', 36)}</div>
    <h2 class="mb0">¡Tu hora está reservada!</h2>
    <p class="muted mb0">Guarda tu código para confirmar, anular o entrar a la sala virtual.</p>
    <div><span class="code">${escape(a.code)}</span></div>
    <div class="table-wrap" style="text-align:left"><table class="table"><tbody>
      <tr><td>Paciente</td><td><b>${escape(p.name)}</b></td></tr>
      <tr><td>Profesional</td><td><b>${escape(d.name)}</b> · ${escape(sp.name)}</td></tr>
      <tr><td>Fecha y hora</td><td style="text-transform:capitalize"><b>${escape(fmtDay(a.date))} · ${a.time}</b></td></tr>
      <tr><td>Lugar</td><td>${a.mode === 'tele' ? 'Telemedicina · entra 10 minutos antes' : `${escape(box(d.boxId)?.name || '')} · ${escape(s.address)}`}</td></tr>
      <tr><td>Valor</td><td><b>${money(a.price)}</b> (${escape(prevision(a.prevision).label)})</td></tr>
    </tbody></table></div>
    <div class="row" style="justify-content:center">
      <button class="btn btn-primary" data-ics>${icon('download', 16)} Agregar al calendario (.ics)</button>
      <a class="btn" href="${googleCalUrl(ev)}" target="_blank" rel="noopener">${icon('calendar', 16)} Google Calendar</a>
      ${a.mode === 'tele' ? `<a class="btn btn-accent" href="#/telemedicina/${a.code}">${icon('video', 16)} Sala virtual</a>` : ''}
    </div>
    <p class="small muted mb0">${icon('mail', 14)} Enviamos la confirmación a ${escape(p.email || 'tu correo')}.</p>
    <div class="row" style="justify-content:center"><a class="btn btn-ghost btn-sm" href="#/mi-hora?code=${a.code}">Gestionar esta hora</a><a class="btn btn-ghost btn-sm" href="#/reservar?nueva=1">Nueva reserva</a></div>
  </div>`;
  body.querySelector('[data-ics]').onclick = () => { downloadICS(`hora-${a.code}.ics`, ev); toast('Archivo de calendario descargado', 'success'); };
}
