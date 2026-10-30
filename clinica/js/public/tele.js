// Telemedicina: sala de espera virtual con video simulado y chat (compartido con la app del médico).
import { escape, toast, time as fmtTime } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { doctor, specialty, patient, setStatus, firstName, isActive } from '../shared/domain.js';
import { fmtDay, ymd } from '../shared/dates.js';
import { sameRut, fmtRut } from '../shared/rut.js';
import { icon } from '../shared/icons.js';

const REPLIES = ['Perfecto, cuéntame un poco más: ¿desde cuándo tienes estos síntomas?', 'Entiendo. ¿Has tomado algún medicamento para eso?', 'Muy bien. Te voy a dejar indicaciones y la receta en tu portal de paciente.', 'Si los síntomas empeoran, acude a urgencia. ¿Tienes alguna otra duda?', 'Gracias a ti. Que estés muy bien, cuídate.'];
let room = null; // { id, joined, cam, mic, startedAt, replyIdx, timers: [] }

function clearRoom() { if (room) { room.timers.forEach(clearTimeout); room.unsub && room.unsub(); clearInterval(room.tick); } room = null; }

export function renderTele(el, params = {}) {
  clearRoom();
  const u = auth.current();
  let a = params.code ? db.find('appointments', x => x.code === params.code.toUpperCase()) : null;
  // Paciente con sesión: entra directo a sus horas (o las de su familia)
  if (a && u?.role === 'paciente') {
    const p = patient(a.patientId);
    if (p && (p.id === u.patientId || p.holderId === u.patientId)) return enter(el, a);
  }
  const mine = u?.role === 'paciente' ? db.query('appointments', x => x.mode === 'tele' && isActive(x) && x.date >= ymd() && [u.patientId, ...db.query('patients', p => p.holderId === u.patientId).map(p => p.id)].includes(x.patientId)).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time)) : [];
  el.innerHTML = `<section class="section"><div class="container stack" style="max-width:860px">
    <div data-anim><span class="eyebrow">Telemedicina</span><h1 class="mb0">Sala de espera virtual</h1><p class="muted">Conéctate 10 minutos antes de tu hora desde el computador o celular. Necesitas cámara, micrófono y buena conexión.</p></div>
    ${mine.length ? `<div class="card"><h3>Tus próximas teleconsultas</h3>${mine.map(x => `<div class="appt-item"><div class="info"><b>${escape(doctor(x.doctorId)?.name)}</b><span class="muted small" style="text-transform:capitalize">${escape(fmtDay(x.date))} · ${x.time} · ${escape(patient(x.patientId)?.name)}</span></div><a class="btn btn-accent btn-sm" href="#/telemedicina/${x.code}">${icon('video', 14)} Entrar</a></div>`).join('')}</div>` : ''}
    <form class="card stack" novalidate>
      <div class="grid-2">
        <div class="field"><label for="t-code">Código de reserva</label><input class="input" id="t-code" name="code" value="${escape(params.code || '')}" placeholder="AL-XXXX" style="text-transform:uppercase"></div>
        <div class="field"><label for="t-rut">RUT del paciente</label><input class="input" id="t-rut" name="rut" placeholder="12.345.678-5"></div>
      </div>
      <div class="row between"><button class="btn btn-primary" type="submit">${icon('video', 16)} Entrar a la sala</button><span class="muted small">Demo: <b>AL-TELE</b> · RUT <b>16.543.210-K</b></span></div>
    </form>
    <div class="grid-3">
      <div class="card"><span class="icon-bubble">${icon('video', 20)}</span><h3 style="margin-top:10px">Cámara y micrófono</h3><p class="muted small mb0">Autoriza el acceso cuando el navegador lo pida.</p></div>
      <div class="card"><span class="icon-bubble">${icon('file', 20)}</span><h3 style="margin-top:10px">Ten tus exámenes</h3><p class="muted small mb0">Puedes compartirlos por el chat de la sala.</p></div>
      <div class="card"><span class="icon-bubble">${icon('pill', 20)}</span><h3 style="margin-top:10px">Receta digital</h3><p class="muted small mb0">Queda disponible en tu portal al terminar.</p></div>
    </div>
  </div></section>`;
  const f = el.querySelector('form');
  f.elements.rut.addEventListener('blur', e => { if (e.target.value) e.target.value = fmtRut(e.target.value); });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const x = db.find('appointments', y => y.code === f.elements.code.value.trim().toUpperCase());
    if (!x || !sameRut(patient(x.patientId)?.rut, f.elements.rut.value)) return toast('Código o RUT incorrectos', 'error');
    enter(el, x);
  });
}

function enter(el, a) {
  if (a.mode !== 'tele') { el.innerHTML = `<section class="section"><div class="container card empty"><h2>Esta hora es presencial</h2><p>La hora ${escape(a.code)} se atiende en el centro médico.</p><a class="btn" href="#/mi-hora?code=${a.code}">Ver mi hora</a></div></section>`; return; }
  if (!isActive(a)) { el.innerHTML = `<section class="section"><div class="container card empty"><h2>La sala no está disponible</h2><p>Esta teleconsulta está ${a.status === 'atendida' ? 'finalizada' : 'anulada'}.</p><a class="btn" href="#/portal">Ir a mi portal</a></div></section>`; return; }
  const d = doctor(a.doctorId), p = patient(a.patientId);
  clearRoom();
  room = { id: a.id, joined: a.status === 'en_atencion', cam: true, mic: true, startedAt: Date.now(), replyIdx: 0, timers: [] };
  if (['reservada', 'confirmada'].includes(a.status)) setStatus(a, 'en_espera');
  if (!db.count('telechat', m => m.appointmentId === a.id)) say('sistema', 'Sistema', `${firstName(p.name)} entró a la sala de espera virtual.`);
  el.innerHTML = `<section class="section tight"><div class="container stack">
    <div class="row between"><div><span class="eyebrow">Teleconsulta · ${escape(a.code)}</span><h2 class="mb0">${escape(d.name)}</h2><span class="muted" style="text-transform:capitalize">${escape(specialty(a.specialtyId)?.name)} · ${escape(fmtDay(a.date))} · ${a.time}</span></div>
    <a class="btn btn-ghost" href="#/telemedicina" data-leave>${icon('logout', 16)} Salir de la sala</a></div>
    <div class="tele-grid">
      <div class="card"><div class="video" data-video></div>
        <div class="video-controls">
          <button class="btn" data-cam>${icon('video', 16)} <span>Cámara</span></button>
          <button class="btn" data-mic>${icon('mic', 16)} <span>Micrófono</span></button>
          <button class="btn" data-test>${icon('bell', 16)} Probar sonido</button>
          <button class="btn btn-danger" data-end>${icon('x', 16)} Finalizar</button>
        </div></div>
      <div class="card chat"><div class="card-title"><h3>Chat de la consulta</h3><span class="badge badge-success">Cifrado</span></div>
        <div class="chat-log" data-log aria-live="polite"></div>
        <form class="chat-form" data-chat><input class="input" name="t" placeholder="Escribe un mensaje…" autocomplete="off" aria-label="Mensaje"><button class="btn btn-primary btn-icon" aria-label="Enviar">${icon('arrow', 18)}</button></form>
      </div>
    </div>
  </div></section>`;
  const video = el.querySelector('[data-video]'), log = el.querySelector('[data-log]');
  const drawVideo = () => {
    const cur = db.get('appointments', a.id);
    if (cur && cur.status === 'en_atencion') room.joined = true;
    const secs = Math.floor((Date.now() - (room.joinedAt || Date.now())) / 1000);
    video.innerHTML = room.joined
      ? `<span class="label badge badge-danger"><span class="pulse-dot"></span> En llamada · ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}</span>
         <div class="center"><span class="avatar big-avatar" style="--av:${d.color}">${escape(initials(d.name.replace(/^(Dra?\.|Ps\.|Nut\.)\s*/, '')))}</span><p class="mb0" style="margin-top:10px"><b>${escape(d.name)}</b></p></div>
         <div class="self">${room.cam ? `<span class="avatar">${escape(initials(p.name))}</span>` : icon('video', 22)}</div>`
      : `<div class="wait"><div class="spinner" style="width:42px;height:42px"></div><h3 style="margin-top:14px">Esperando a ${escape(d.name.split(' ').slice(0, 2).join(' '))}</h3><p class="muted mb0">Eres el <b>${room.pos || 1}°</b> en la fila. Te conectaremos automáticamente.</p></div>
         <div class="self">${room.cam ? `<span class="avatar">${escape(initials(p.name))}</span>` : icon('video', 22)}</div>`;
  };
  const drawLog = () => {
    const msgs = db.query('telechat', m => m.appointmentId === a.id).sort((x, y) => x.at.localeCompare(y.at));
    log.innerHTML = msgs.map(m => `<div class="msg ${m.from === 'paciente' ? 'me' : m.from === 'sistema' ? 'sys' : ''}">${m.from !== 'sistema' ? `<small>${escape(m.name)} · ${fmtTime(m.at)}</small>` : ''}${escape(m.text)}</div>`).join('');
    log.scrollTop = log.scrollHeight;
  };
  room.pos = 2;
  drawVideo(); drawLog();
  room.tick = setInterval(() => { if (!document.body.contains(video)) return clearRoom(); drawVideo(); }, 1000);
  const later = (ms, fn) => room.timers.push(setTimeout(() => { if (room && document.body.contains(video)) fn(); }, ms));
  later(2500, () => say('sistema', 'Sistema', 'Tu profesional fue notificado. La conexión se hará en breve.'));
  later(5000, () => { room.pos = 1; drawVideo(); });
  later(room.joined ? 0 : 9000, () => {
    if (!room.joined) { room.joined = true; setStatus(db.get('appointments', a.id), 'en_atencion', { boxId: 'b8' }); }
    room.joinedAt = Date.now();
    say('medico', d.name, `Hola ${firstName(p.name)}, soy ${d.name.split(' ').slice(0, 2).join(' ')}. ¿Me escuchas bien? Cuéntame el motivo de tu consulta.`, true);
    drawVideo();
  });
  room.unsub = db.subscribe(ch => { if (!document.body.contains(log)) return clearRoom(); if (ch.type === 'log') return; drawLog(); });
  el.querySelector('[data-chat]').addEventListener('submit', e => {
    e.preventDefault();
    const t = e.target.elements.t.value.trim();
    if (!t) return;
    say('paciente', p.name, t);
    e.target.reset();
    if (room.joined) later(2200, () => say('medico', d.name, REPLIES[Math.min(room.replyIdx++, REPLIES.length - 1)], true));
  });
  const toggle = (k, btn) => { room[k] = !room[k]; btn.classList.toggle('btn-danger', !room[k]); btn.querySelector('span').textContent = (k === 'cam' ? 'Cámara' : 'Micrófono') + (room[k] ? '' : ' (off)'); drawVideo(); };
  el.querySelector('[data-cam]').onclick = e => toggle('cam', e.currentTarget);
  el.querySelector('[data-mic]').onclick = e => toggle('mic', e.currentTarget);
  el.querySelector('[data-test]').onclick = () => { beep(); toast('Si escuchaste un tono, tu audio funciona', 'info'); };
  el.querySelector('[data-end]').onclick = () => {
    say('sistema', 'Sistema', `${firstName(p.name)} salió de la llamada.`);
    clearRoom();
    el.querySelector('.tele-grid').innerHTML = `<div class="card ticket stack" style="grid-column:1/-1"><div class="check-big">${icon('check', 32)}</div><h2 class="mb0">Llamada finalizada</h2><p class="muted">Tu profesional cerrará la ficha y dejará indicaciones y receta en tu portal.</p><div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/portal">Ir a mi portal</a><a class="btn" href="#/">Volver al inicio</a></div></div>`;
  };
  el.querySelector('[data-leave]').addEventListener('click', clearRoom);
}

function say(from, name, text, auto = false) { db.insert('telechat', { appointmentId: room?.id, from, name, text, at: new Date().toISOString(), auto }); }
function beep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(); const o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 660; g.gain.value = .08; o.start(); o.stop(c.currentTime + .35); } catch (e) { /* sin audio */ } }
