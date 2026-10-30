// Portal del paciente: login/registro, próximas horas, historial, recetas, exámenes, familia y datos.
import { escape, money, toast, confirm, formModal, date as fmtDate } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, HOME_BY_ROLE } from '../data/db.js';
import { PREVISIONES } from '../data/catalog.js';
import { doctor, specialty, patient, statusBadge, setStatus, prevision, isActive, findPatientByRut, settings, ageOf } from '../shared/domain.js';
import { ymd, parseYmd, fmtDay, MONTHS } from '../shared/dates.js';
import { validRut, fmtRut } from '../shared/rut.js';
import { downloadICS } from '../shared/ics.js';
import { openRx } from '../shared/docs.js';
import { icon } from '../shared/icons.js';
import { examRow, wireExams } from './results.js';

const TABS = [['proximas', 'Próximas horas', 'calendar'], ['historial', 'Historial', 'list'], ['recetas', 'Recetas', 'pill'], ['examenes', 'Exámenes', 'flask'], ['familia', 'Familia', 'users'], ['datos', 'Mis datos', 'user']];

export function renderPortal(el, { tab = 'proximas' } = {}) {
  const u = auth.current();
  if (!u) return authView(el);
  if (u.role !== 'paciente') {
    el.innerHTML = `<section class="section"><div class="container card empty"><h2>Hola, ${escape(u.name)}</h2><p>Tu cuenta es de <b>${escape(auth.roleName(u.role))}</b>. El portal es para pacientes.</p><div class="row" style="justify-content:center"><a class="btn btn-primary" href="${HOME_BY_ROLE[u.role]}">Ir a mi panel</a><button class="btn" data-out>Cerrar sesión</button></div></div></section>`;
    el.querySelector('[data-out]').onclick = () => { auth.logout(); location.hash = '#/portal'; location.reload(); };
    return;
  }
  const me = patient(u.patientId);
  if (!me) { el.innerHTML = '<section class="section"><div class="container card empty">No encontramos tu ficha de paciente.</div></section>'; return; }
  const fam = db.query('patients', p => p.holderId === me.id);
  const ids = [me.id, ...fam.map(p => p.id)];
  el.innerHTML = `<section class="section tight"><div class="container stack">
    <div class="card portal-head" data-anim>
      <span class="avatar" style="--av:${u.color || 'var(--primary)'}">${escape(initials(me.name))}</span>
      <div class="grow"><span class="eyebrow">Portal paciente</span><h2 class="mb0">Hola, ${escape(me.name.split(' ')[0])}</h2><span class="muted small">${escape(me.rut)} · ${escape(prevision(me.prevision).label)}${fam.length ? ` · ${fam.length} cargas` : ''}</span></div>
      <div class="row"><a class="btn btn-primary" href="#/reservar">${icon('plus', 16)} Nueva hora</a><button class="btn btn-ghost" data-logout>${icon('logout', 16)} Salir</button></div>
    </div>
    <div class="tabs" role="tablist">${TABS.map(([k, l, i]) => `<a class="tab ${tab === k ? 'active' : ''}" href="#/portal/${k}" role="tab" aria-selected="${tab === k}" style="text-decoration:none">${icon(i, 16)} ${l}</a>`).join('')}</div>
    <div data-tab></div>
  </div></section>`;
  el.querySelector('[data-logout]').onclick = () => { auth.logout(); location.hash = '#/'; location.reload(); };
  const body = el.querySelector('[data-tab]');
  ({ proximas, historial, recetas, examenes, familia, datos }[tab] || proximas)(body, me, ids, fam, u);
}

const dateChip = d => { const x = parseYmd(d); return `<span class="date-chip"><b>${x.getDate()}</b><small>${MONTHS[x.getMonth()].slice(0, 3)}</small></span>`; };

function proximas(body, me, ids) {
  const list = db.query('appointments', a => ids.includes(a.patientId) && isActive(a) && a.date >= ymd()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  body.innerHTML = `<div class="card">${list.length ? list.map(a => { const d = doctor(a.doctorId); return `<div class="appt-item">${dateChip(a.date)}
    <div class="info"><b>${escape(d?.name)} · ${escape(specialty(a.specialtyId)?.name)}</b><span class="muted small" style="text-transform:capitalize">${escape(fmtDay(a.date))} · ${a.time} · ${a.mode === 'tele' ? 'Telemedicina' : 'Presencial'} · ${escape(patient(a.patientId)?.name.split(' ')[0])}</span><div class="small">Código <b class="mono">${a.code}</b> · ${money(a.price)}</div></div>
    ${statusBadge(a.status)}
    <div class="acts">${a.status === 'reservada' ? `<button class="btn btn-sm btn-primary" data-conf="${a.id}">Confirmar</button>` : ''}${a.mode === 'tele' ? `<a class="btn btn-sm btn-accent" href="#/telemedicina/${a.code}">${icon('video', 14)} Sala</a>` : ''}
      <button class="btn btn-sm btn-ghost btn-icon" data-ics="${a.id}" title="Agregar al calendario" aria-label="Agregar al calendario">${icon('calendar', 16)}</button>
      <a class="btn btn-sm btn-ghost" href="#/reservar?re=${a.id}&med=${a.doctorId}">Reagendar</a><button class="btn btn-sm btn-ghost" data-cancel="${a.id}">Anular</button></div></div>`; }).join('')
    : `<div class="empty">${icon('calendar', 40)}<p>No tienes horas agendadas.</p><a class="btn btn-primary" href="#/reservar">Reservar hora</a></div>`}</div>`;
  body.querySelectorAll('[data-conf]').forEach(b => b.onclick = () => { setStatus(db.get('appointments', b.dataset.conf), 'confirmada'); toast('Asistencia confirmada', 'success'); });
  body.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => {
    const a = db.get('appointments', b.dataset.cancel);
    if (await confirm(`¿Anular la hora del ${fmtDay(a.date)} a las ${a.time}?`, { title: 'Anular hora', ok: 'Anular', danger: true })) { setStatus(a, 'cancelada'); toast('Hora anulada', 'success'); }
  });
  body.querySelectorAll('[data-ics]').forEach(b => b.onclick = () => { const a = db.get('appointments', b.dataset.ics), d = doctor(a.doctorId); downloadICS(`hora-${a.code}.ics`, { uid: a.code + '@alerce.demo', date: a.date, time: a.time, duration: d.schedule.slot, title: `${specialty(a.specialtyId).name} · ${d.name}`, location: settings().address, description: `Código ${a.code}` }); });
}

function historial(body, me, ids) {
  const list = db.query('appointments', a => ids.includes(a.patientId) && !isActive(a)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  body.innerHTML = `<div class="card">${list.length ? list.map(a => { const r = db.find('records', x => x.appointmentId === a.id); return `<div class="appt-item">${dateChip(a.date)}
    <div class="info"><b>${escape(doctor(a.doctorId)?.name)} · ${escape(specialty(a.specialtyId)?.name)}</b><span class="muted small">${escape(patient(a.patientId)?.name)} · ${a.time} · ${a.mode === 'tele' ? 'Telemedicina' : 'Presencial'}</span>
    ${r ? `<div class="small">${r.diagnosis.map(x => `<code>${escape(x.code)}</code> ${escape(x.name)}`).join(', ')}<br><span class="muted">${escape(r.indications)}</span></div>` : ''}</div>
    ${statusBadge(a.status)}${r?.prescription?.length ? `<button class="btn btn-sm" data-rx="${r.id}">${icon('pill', 14)} Receta</button>` : ''}</div>`; }).join('') : '<div class="empty">Aún no tienes atenciones.</div>'}</div>`;
  body.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => openRx(db.get('records', b.dataset.rx)));
}

function recetas(body, me, ids) {
  const list = db.query('records', r => ids.includes(r.patientId) && r.prescription?.length).sort((a, b) => b.date.localeCompare(a.date));
  body.innerHTML = `<div class="grid-auto">${list.map(r => `<div class="card stack"><div class="row between"><b>${escape(fmtDate(r.date))}</b><span class="badge ${r.date >= ymd().slice(0, 8) + '01' ? 'badge-success' : ''}">${escape(patient(r.patientId)?.name.split(' ')[0])}</span></div>
    <ul style="margin:0;padding-left:18px">${r.prescription.map(x => `<li><b>${escape(x.drug)}</b><br><span class="small muted">${escape(x.dose)} ${escape(x.freq)} · ${x.days} días</span></li>`).join('')}</ul>
    <span class="small muted">${escape(doctor(r.doctorId)?.name)}</span><button class="btn btn-sm" data-rx="${r.id}">${icon('print', 14)} Ver / imprimir</button></div>`).join('') || '<div class="card empty">No tienes recetas emitidas.</div>'}</div>`;
  body.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => openRx(db.get('records', b.dataset.rx)));
}

function examenes(body, me, ids) {
  const list = db.query('exams', e => ids.includes(e.patientId)).sort((a, b) => b.date.localeCompare(a.date));
  body.innerHTML = `<div class="card">${list.map(examRow).join('') || '<div class="empty">No tienes exámenes registrados.</div>'}</div>`;
  wireExams(body);
}

function familia(body, me, ids, fam) {
  body.innerHTML = `<div class="card"><div class="card-title"><h3>Cargas familiares</h3><button class="btn btn-primary btn-sm" data-add>${icon('plus', 14)} Agregar</button></div>
    ${fam.length ? fam.map(p => `<div class="appt-item"><span class="avatar">${escape(initials(p.name))}</span><div class="info"><b>${escape(p.name)}</b><span class="muted small">${escape(p.relation || '')} · ${escape(p.rut)} · ${ageOf(p.birth)} años · ${escape(prevision(p.prevision).label)}</span></div>
      <div class="acts"><a class="btn btn-sm" href="#/reservar">Reservar</a><button class="btn btn-sm btn-ghost" data-del="${p.id}">Quitar</button></div></div>`).join('') : '<div class="empty">Agrega a tus hijos o familiares para reservarles horas.</div>'}</div>`;
  body.querySelector('[data-add]').onclick = async () => {
    const v = await formModal({ title: 'Agregar carga familiar', fields: [
      { name: 'name', label: 'Nombre completo', required: true }, { name: 'rut', label: 'RUT', required: true, placeholder: '12.345.678-5' },
      { name: 'birth', label: 'Fecha de nacimiento', type: 'date', required: true },
      { name: 'relation', label: 'Relación', type: 'select', options: ['Hijo', 'Hija', 'Cónyuge', 'Madre', 'Padre', 'Otro'] },
      { name: 'prevision', label: 'Previsión', type: 'select', options: PREVISIONES.map(p => [p.id, p.label]), value: me.prevision }] });
    if (!v) return;
    if (!validRut(v.rut)) return toast('RUT inválido', 'error');
    const ex = findPatientByRut(v.rut);
    if (ex) { db.update('patients', ex.id, { holderId: me.id, relation: v.relation }); }
    else db.insert('patients', { ...v, rut: fmtRut(v.rut), holderId: me.id, phone: me.phone, email: me.email, sex: /Hija|Madre/.test(v.relation) ? 'F' : 'M' });
    db.log('paciente', `${me.name} agregó carga: ${v.name}`, auth.current()?.id);
    toast('Carga familiar agregada', 'success');
  };
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (await confirm('¿Quitar esta carga de tu cuenta? Su ficha clínica se conserva.', { title: 'Quitar carga', danger: true, ok: 'Quitar' })) { db.update('patients', b.dataset.del, { holderId: null }); toast('Carga quitada', 'success'); }
  });
}

function datos(body, me, ids, fam, u) {
  body.innerHTML = `<div class="grid-2"><form class="card stack" data-f novalidate><h3 class="mb0">Datos personales</h3>
    <div class="field"><label>Nombre</label><input class="input" value="${escape(me.name)}" disabled></div>
    <div class="field"><label for="d-email">Correo</label><input class="input" id="d-email" name="email" type="email" value="${escape(me.email || '')}"></div>
    <div class="field"><label for="d-phone">Celular</label><input class="input" id="d-phone" name="phone" value="${escape(me.phone || '')}"></div>
    <div class="field"><label for="d-prev">Previsión</label><select class="select" id="d-prev" name="prevision">${PREVISIONES.map(p => `<option value="${p.id}" ${me.prevision === p.id ? 'selected' : ''}>${escape(p.label)}</option>`).join('')}</select></div>
    <div class="field"><label for="d-all">Alergias</label><input class="input" id="d-all" name="allergies" value="${escape(me.allergies || '')}"></div>
    <button class="btn btn-primary">Guardar cambios</button></form>
    <form class="card stack" data-p novalidate><h3 class="mb0">Cambiar contraseña</h3>
    <div class="field"><label for="d-p1">Contraseña actual</label><input class="input" id="d-p1" name="cur" type="password" autocomplete="current-password"></div>
    <div class="field"><label for="d-p2">Nueva contraseña</label><input class="input" id="d-p2" name="next" type="password" autocomplete="new-password"></div>
    <button class="btn">Actualizar contraseña</button>
    <p class="muted small mb0">${icon('shield', 14)} Tus datos clínicos son confidenciales (Ley 20.584).</p></form></div>`;
  body.querySelector('[data-f]').onsubmit = e => {
    e.preventDefault(); const f = e.target;
    db.update('patients', me.id, { email: f.email.value.trim(), phone: f.phone.value.trim(), prevision: f.prevision.value, allergies: f.allergies.value.trim() });
    toast('Datos actualizados', 'success');
  };
  body.querySelector('[data-p]').onsubmit = e => {
    e.preventDefault(); const f = e.target;
    if (f.cur.value !== u.password) return toast('La contraseña actual no coincide', 'error');
    if (f.next.value.length < 6) return toast('La nueva contraseña debe tener al menos 6 caracteres', 'warning');
    db.update('users', u.id, { password: f.next.value }); f.reset(); toast('Contraseña actualizada', 'success');
  };
}

function authView(el) {
  el.innerHTML = `<section class="section"><div class="container grid-2" style="align-items:start">
    <form class="card stack" data-login novalidate>
      <span class="eyebrow">Portal paciente</span><h2 class="mb0">Ingresa a tu cuenta</h2>
      <div class="field"><label for="l-email">Correo</label><input class="input" id="l-email" name="email" type="email" autocomplete="email"></div>
      <div class="field"><label for="l-pass">Contraseña</label><input class="input" id="l-pass" name="password" type="password" autocomplete="current-password"></div>
      <button class="btn btn-primary">Ingresar</button>
      <div class="muted small">Cuenta de prueba:</div><div data-demo></div>
      <a class="small" href="login.html">¿Eres funcionario? Acceso del equipo</a>
    </form>
    <form class="card stack" data-reg novalidate>
      <span class="eyebrow">¿Primera vez?</span><h2 class="mb0">Crea tu cuenta</h2>
      <div class="grid-2">
        <div class="field"><label for="g-name">Nombre completo</label><input class="input" id="g-name" name="name" autocomplete="name"></div>
        <div class="field"><label for="g-rut">RUT</label><input class="input" id="g-rut" name="rut" placeholder="12.345.678-5"></div>
        <div class="field"><label for="g-birth">Nacimiento</label><input class="input" id="g-birth" name="birth" type="date"></div>
        <div class="field"><label for="g-prev">Previsión</label><select class="select" id="g-prev" name="prevision">${PREVISIONES.map(p => `<option value="${p.id}">${escape(p.label)}</option>`).join('')}</select></div>
        <div class="field"><label for="g-email">Correo</label><input class="input" id="g-email" name="email" type="email" autocomplete="email"></div>
        <div class="field"><label for="g-phone">Celular</label><input class="input" id="g-phone" name="phone"></div>
      </div>
      <div class="field"><label for="g-pass">Contraseña (mín. 6)</label><input class="input" id="g-pass" name="password" type="password" autocomplete="new-password"></div>
      <button class="btn btn-accent">Crear cuenta</button>
    </form>
  </div></section>`;
  auth.mountDemoLogin(el.querySelector('[data-demo]'), { filter: u => u.role === 'paciente', onLogin: () => { location.hash = '#/portal'; location.reload(); } });
  el.querySelector('[data-login]').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    try { const u = await auth.login(f.email.value, f.password.value); if (u.role !== 'paciente') { location.href = HOME_BY_ROLE[u.role]; return; } location.reload(); }
    catch (err) { toast(err.message, 'error'); }
  };
  const reg = el.querySelector('[data-reg]');
  reg.rut.addEventListener('blur', () => { if (reg.rut.value) reg.rut.value = fmtRut(reg.rut.value); });
  reg.onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const v = Object.fromEntries(['name', 'rut', 'birth', 'prevision', 'email', 'phone', 'password'].map(k => [k, f[k].value.trim()]));
    if (v.name.length < 5) return toast('Ingresa tu nombre completo', 'warning');
    if (!validRut(v.rut)) return toast('RUT inválido', 'warning');
    if (!/^\S+@\S+\.\S+$/.test(v.email)) return toast('Correo inválido', 'warning');
    if (v.password.length < 6) return toast('La contraseña debe tener al menos 6 caracteres', 'warning');
    let p = findPatientByRut(v.rut);
    if (db.find('users', x => x.patientId && p && x.patientId === p.id)) return toast('Ese RUT ya tiene una cuenta. Ingresa con tu correo.', 'warning');
    try {
      if (!p) p = db.insert('patients', { name: v.name, rut: fmtRut(v.rut), birth: v.birth, prevision: v.prevision, email: v.email, phone: v.phone });
      await auth.register({ name: v.name, email: v.email, password: v.password, role: 'paciente', patientId: p.id, color: '#0891b2' });
      toast('¡Cuenta creada! Bienvenido/a', 'success');
      location.reload();
    } catch (err) { toast(err.message, 'error'); }
  };
}
