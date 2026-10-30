// Voluntariado: postulación, calendario de actividades e inscripción a cupos.
import { db, auth } from '../data/db.js';
import { monthCalendar } from '../shared/calendar.js';
import { escape, date, modal, toast } from '../../../assets/core/ui.js';

const SKILLS = ['Construcción', 'Educación', 'Salud', 'Logística', 'Comunicaciones', 'Plantación', 'Cocina', 'Fotografía'];
let cal = (() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })();

function myVolunteer() {
  const u = auth.current();
  if (!u) return null;
  return u.volunteerId ? db.get('volunteers', u.volunteerId) : db.find('volunteers', v => v.email.toLowerCase() === u.email.toLowerCase());
}

function enroll(a, v) {
  const fresh = db.get('activities', a.id);
  if (fresh.enrolled.includes(v.id)) return toast('Ya estás inscrito en esta actividad', 'info');
  if (fresh.enrolled.length >= fresh.slots) return toast('No quedan cupos', 'error');
  db.update('activities', a.id, { enrolled: [...fresh.enrolled, v.id] });
  db.log('Inscripción voluntariado', `${v.name} → ${a.title} (${a.date})`, auth.current()?.id || null);
  toast(`¡Listo! Quedaste inscrito en «${a.title}»`, 'success');
}

function openActivity(a) {
  const left = a.slots - a.enrolled.length;
  const past = a.status !== 'abierta';
  const me = myVolunteer();
  const mine = me && a.enrolled.includes(me.id);
  const project = a.projectId ? db.get('projects', a.projectId) : null;
  const form = !me && !past && left > 0 ? `<form class="stack" id="enForm" novalidate style="gap:10px"><hr>
      <b>Inscríbete</b><div class="grid-2"><div class="field"><label for="en-name">Nombre</label><input class="input" id="en-name" name="name" required></div>
      <div class="field"><label for="en-email">Correo</label><input class="input" id="en-email" name="email" type="email" required></div></div>
      <p class="small muted" style="margin:0">Si ya eres voluntario usaremos tu ficha; si no, te registraremos como postulante.</p></form>` : '';
  const m = modal({ title: a.title, body: `<div class="stack">
      <div class="row small" style="gap:6px"><span class="badge badge-primary">${escape(a.type)}</span><span class="badge ${past ? '' : left > 0 ? 'badge-success' : 'badge-danger'}">${past ? 'Realizada' : left > 0 ? `${left} cupos` : 'Sin cupos'}</span>${mine ? '<span class="badge badge-info">Inscrito ✓</span>' : ''}</div>
      <dl class="kv"><dt>Fecha</dt><dd>${escape(date(a.date + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${escape(a.start)} (${a.hours} h)</dd><dt>Lugar</dt><dd>${escape(a.place)}</dd><dt>Coordina</dt><dd>${escape(a.coordinator)}</dd>${project ? `<dt>Proyecto</dt><dd>${escape(project.name)}</dd>` : ''}</dl>
      <p style="margin:0">${escape(a.description)}</p>${form}</div>`,
    foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${!past && left > 0 && !mine ? '<button class="btn btn-primary" data-enroll>Inscribirme</button>' : ''}` });
  m.el.querySelector('[data-enroll]')?.addEventListener('click', () => {
    let v = me;
    if (!v) {
      const f = m.el.querySelector('#enForm'), name = f.name.value.trim(), email = f.email.value.trim();
      f.name.classList.toggle('invalid', !name); f.email.classList.toggle('invalid', !/^\S+@\S+\.\S+$/.test(email));
      if (!name || !/^\S+@\S+\.\S+$/.test(email)) return toast('Completa nombre y correo', 'warning');
      v = db.find('volunteers', x => x.email.toLowerCase() === email.toLowerCase()) || db.insert('volunteers', { name, email, phone: '', region: '', skills: [a.type], availability: 'Fines de semana', status: 'postulante', hours: 0 });
    }
    m.close(); enroll(a, v);
  });
}

export default function volunteer(el) {
  const acts = db.all('activities');
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = acts.filter(a => a.status === 'abierta' && a.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date));
  const me = myVolunteer();
  const events = acts.map(a => ({ id: a.id, date: a.date, title: a.title, cls: a.status !== 'abierta' ? 'past' : a.enrolled.length >= a.slots ? 'full' : me && a.enrolled.includes(me.id) ? 'mine' : '' }));
  el.innerHTML = `<section class="page-hero"><div class="container stack" data-anim>
      <span class="eyebrow">Voluntariado</span><h1>Pon tus manos donde está tu corazón</h1>
      <p class="muted lead">Mingas de construcción, plantaciones, tutorías y emergencias. No necesitas experiencia: te capacitamos, te trasladamos y te aseguramos.</p>
      ${me ? `<p class="badge badge-success">Hola ${escape(me.name.split(' ')[0])}: llevas ${me.hours} horas de voluntariado 🙌</p>` : ''}</div></section>
  <section class="section pt0"><div class="container vol-layout">
    <div class="card">${monthCalendar(cal.y, cal.m, events)}
      <div class="row small muted cal-legend"><span><i class="lg-dot"></i> Abierta</span><span><i class="lg-dot mine"></i> Inscrito</span><span><i class="lg-dot full"></i> Sin cupos</span><span><i class="lg-dot past"></i> Realizada</span></div></div>
    <div class="stack"><h3 style="margin:0">Próximas actividades</h3>
      ${upcoming.slice(0, 6).map(a => `<button type="button" class="card act-row hover" data-ev="${a.id}"><span class="date-chip"><b>${new Date(a.date + 'T12:00').getDate()}</b><small>${escape(new Date(a.date + 'T12:00').toLocaleDateString('es-CL', { month: 'short' }))}</small></span>
        <span class="grow"><b>${escape(a.title)}</b><br><span class="small muted">${escape(a.place)} · ${escape(a.start)}</span></span>
        <span class="badge ${a.slots - a.enrolled.length > 0 ? 'badge-success' : 'badge-danger'}">${Math.max(0, a.slots - a.enrolled.length)} cupos</span></button>`).join('') || '<p class="muted">No hay actividades abiertas.</p>'}</div>
  </div></section>
  <section class="section tint"><div class="container split-2">
    <div class="stack" data-anim><span class="eyebrow">Postula</span><h2 style="margin:0">Súmate al equipo de voluntarios</h2>
      <ul class="checks"><li>Inducción online de 1 hora</li><li>Seguro de accidentes durante las actividades</li><li>Traslado y alimentación en terreno</li><li>Certificado de horas de voluntariado</li></ul></div>
    <form class="card stack" id="volForm" novalidate>
      <div class="grid-2"><div class="field"><label for="v-name">Nombre completo</label><input class="input" id="v-name" name="name" required></div>
      <div class="field"><label for="v-email">Correo</label><input class="input" id="v-email" name="email" type="email" required></div>
      <div class="field"><label for="v-phone">Teléfono</label><input class="input" id="v-phone" name="phone"></div>
      <div class="field"><label for="v-region">Región</label><input class="input" id="v-region" name="region"></div></div>
      <div class="field"><span class="label">¿En qué te gustaría ayudar?</span><div class="row chips">${SKILLS.map(s => `<label class="check small"><input type="checkbox" name="skills" value="${s}"> ${s}</label>`).join('')}</div></div>
      <div class="field"><label for="v-av">Disponibilidad</label><select class="select" id="v-av" name="availability"><option>Fines de semana</option><option>Semana</option><option>Vacaciones</option><option>Solo emergencias</option></select></div>
      <button class="btn btn-primary" type="submit">Enviar postulación</button></form>
  </div></section>`;
  el.onclick = e => {
    const c = e.target.closest('[data-cal]');
    if (c) { cal.m += +c.dataset.cal; if (cal.m < 0) { cal.m = 11; cal.y--; } if (cal.m > 11) { cal.m = 0; cal.y++; } volunteer(el); return; }
    const ev = e.target.closest('[data-ev]');
    if (ev) openActivity(db.get('activities', ev.dataset.ev));
  };
  const f = el.querySelector('#volForm');
  f.onsubmit = e => {
    e.preventDefault();
    const name = f.name.value.trim(), email = f.email.value.trim();
    f.name.classList.toggle('invalid', !name); f.email.classList.toggle('invalid', !/^\S+@\S+\.\S+$/.test(email));
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return toast('Completa nombre y correo', 'warning');
    if (db.find('volunteers', v => v.email.toLowerCase() === email.toLowerCase())) return toast('Ya existe una postulación con ese correo', 'info');
    const skills = [...f.querySelectorAll('[name=skills]:checked')].map(x => x.value);
    db.insert('volunteers', { name, email, phone: f.phone.value.trim(), region: f.region.value.trim(), skills, availability: f.availability.value, status: 'postulante', hours: 0 });
    db.log('Postulación voluntariado', `${name} (${skills.join(', ') || 'sin preferencia'})`);
    toast('¡Gracias! Te contactaremos para la inducción.', 'success');
  };
}
