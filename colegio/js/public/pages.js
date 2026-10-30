// Páginas institucionales: inicio, proyecto educativo, niveles y contacto.
import { db } from '../data/db.js';
import { escape, date, toast } from '../../../assets/core/ui.js';
import { site, sortedCourses } from '../shared/academic.js';
import { NOW, ymd, LEVELS, YEAR } from '../shared/school.js';
import { heroArt, newsThumb, mapArt, LEVEL_ICONS } from './art.js';
import { formData } from '../shared/kit.js';

export const LEVEL_INFO = {
  parvularia: { tone: 'var(--accent)', range: 'Pre-kínder y Kínder', text: 'Aprendizaje a través del juego, el arte y la naturaleza, con educadoras y técnicos en cada sala y grupos reducidos.', items: ['Huerto y patio de exploración', 'Inglés desde Pre-kínder', 'Psicomotricidad y música'] },
  basica: { tone: 'var(--primary)', range: '1° a 8° Básico', text: 'Lectura, pensamiento matemático y ciencias con metodologías activas, proyectos interdisciplinarios y acompañamiento socioemocional.', items: ['Plan lector y biblioteca CRA', 'Talleres de robótica, coro y deportes', 'Programa de Integración Escolar (PIE)'] },
  media: { tone: 'var(--success)', range: 'I a IV Medio', text: 'Formación científico-humanista con electivos de profundización, preparación PAES y orientación vocacional personalizada.', items: ['Electivos de profundización', 'Preparación PAES y ensayos', 'Orientación vocacional y salidas a universidades'] }
};

export function newsCard(n, i = 0) {
  return `<a class="card hover news-card" href="#/noticias/${n.id}">
    <div class="thumb">${newsThumb(n.category, i)}</div>
    <span class="row" style="gap:8px"><span class="badge badge-primary">${escape(n.category)}</span><span class="small muted">${date(n.date)}</span></span>
    <h3>${escape(n.title)}</h3><p>${escape(n.excerpt)}</p></a>`;
}
export function eventItem(e) {
  const d = new Date(e.date + 'T12:00');
  return `<div class="event-item"><div class="date-box"><b>${d.getDate()}</b><span>${d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '')}</span></div>
    <div><b>${escape(e.title)}</b><div class="small muted">${{ academico: 'Académico', extra: 'Extraprogramático', reunion: 'Reunión', feriado: 'Feriado' }[e.type] || ''}${e.place ? ' · ' + escape(e.place) : ''}</div></div></div>`;
}

export function renderHome(el) {
  const st = site();
  const news = db.query('news', n => n.published).sort((a, b) => b.date.localeCompare(a.date) || (b.featured - a.featured)).slice(0, 3);
  const today = ymd(NOW);
  const events = db.query('events', e => e.public && e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const nStudents = db.count('students', s => s.status === 'activo');
  const nTeachers = db.count('users', u => u.role === 'profesor' && u.active !== false);
  el.innerHTML = `
  <section class="hero"><div class="container hero-grid">
    <div data-anim>
      <span class="eyebrow">${escape(st.name)} · ${escape(st.city)}</span>
      <h1>${escape(st.heroTitle)}</h1>
      <p class="lead">${escape(st.heroSubtitle)}</p>
      <div class="row">
        <a class="btn btn-primary btn-lg" href="#/admision">${escape(st.heroCta)}</a>
        <a class="btn btn-lg" href="#/proyecto">Conoce el proyecto</a>
      </div>
      ${st.showStats ? `<div class="hero-stats">
        <div><b>${YEAR - st.founded}</b><span>años de historia</span></div>
        <div><b>${nStudents}</b><span>estudiantes en ${escape(st.platform)}</span></div>
        <div><b>${nTeachers}</b><span>docentes</span></div>
        <div><b>${Math.round(nStudents / Math.max(1, db.count('courses')))}</b><span>estudiantes por curso</span></div>
      </div>` : ''}
    </div>
    <div class="hero-art" data-anim="zoomIn">${heroArt()}</div>
  </div></section>

  <section class="section alt"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Niveles</span><h2>De Pre-kínder a IV Medio</h2></div><a class="btn btn-ghost" href="#/niveles">Ver niveles →</a></div>
    <div class="grid-3">${Object.entries(LEVEL_INFO).map(([k, v]) => `<div class="card hover" style="--tone:${v.tone}"><div class="tile-icon" aria-hidden="true">${LEVEL_ICONS[k]}</div><h3>${LEVELS[k]}</h3><p class="small muted" style="margin-top:-6px">${v.range}</p><p>${escape(v.text)}</p></div>`).join('')}</div>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Actualidad</span><h2>Noticias del colegio</h2></div><a class="btn btn-ghost" href="#/noticias">Todas las noticias →</a></div>
    <div class="grid-3">${news.map(newsCard).join('')}</div>
  </div></section>

  <section class="section alt"><div class="container split">
    <div class="card" data-anim>
      <div class="card-head"><h3>Próximos eventos</h3><a class="btn btn-sm btn-ghost" href="#/calendario">Calendario</a></div>
      <div class="stack">${events.map(eventItem).join('') || '<p class="muted">No hay eventos próximos.</p>'}</div>
    </div>
    <div class="card stack" data-anim="bounceIn" style="--tone:var(--primary)">
      <span class="eyebrow">Admisión ${st.admissionYear}</span>
      <h3>${st.admissionsOpen ? 'Postulaciones abiertas' : 'Postulaciones cerradas'}</h3>
      <p class="muted">${st.admissionsOpen ? 'Completa el formulario en línea en 10 minutos y sigue el estado de tu postulación con tu código.' : 'El proceso de postulación se encuentra cerrado. Revisa las fechas del próximo proceso.'}</p>
      <div class="row"><a class="btn btn-primary" href="#/admision/postular">Postular en línea</a><a class="btn btn-ghost" href="#/admision/estado">Consultar estado</a></div>
    </div>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Sellos</span><h2>Lo que nos mueve</h2></div></div>
    <div class="grid-4">${(st.values || []).map((v, i) => `<div class="card"><span class="pill-num">${i + 1}</span><h3 style="margin-top:12px">${escape(v.title)}</h3><p class="muted mb-0">${escape(v.text)}</p></div>`).join('')}</div>
  </div></section>`;
}

export function renderProyecto(el) {
  const st = site();
  const team = db.query('users', u => ['admin', 'utp'].includes(u.role) && u.active !== false);
  el.innerHTML = `
  <section class="page-hero"><div class="container" data-anim><span class="eyebrow">Proyecto educativo institucional</span><h1>Educación con raíces y alas</h1><p class="lead">Somos una comunidad laica, mixta e inclusiva fundada en ${st.founded}. Creemos en una educación que cuida a las personas y al entorno.</p></div></section>
  <section class="section" style="padding-top:24px"><div class="container stack">
    <div class="grid-2">
      <div class="card"><span class="eyebrow">Misión</span><p class="quote">${escape(st.mission)}</p></div>
      <div class="card"><span class="eyebrow">Visión</span><p class="quote">${escape(st.vision)}</p></div>
    </div>
    <h2 data-anim style="margin-top:24px">Nuestros sellos</h2>
    <div class="grid-4">${(st.values || []).map(v => `<div class="card hover"><h3>${escape(v.title)}</h3><p class="muted mb-0">${escape(v.text)}</p></div>`).join('')}</div>
    <div class="split" style="margin-top:24px">
      <div class="card" data-anim><h3>Nuestra historia</h3><ul class="timeline">
        <li class="done"><b>${st.founded}</b><div class="muted">Un grupo de familias de Peñalolén funda el colegio con 3 cursos.</div></li>
        <li class="done"><b>2004</b><div class="muted">Se inaugura la Educación Media y el gimnasio techado.</div></li>
        <li class="done"><b>2016</b><div class="muted">Programa de Integración Escolar y huerto pedagógico.</div></li>
        <li class="current"><b>${YEAR}</b><div class="muted">Lanzamos ${escape(st.platform)}, nuestra plataforma de gestión y comunicación con las familias.</div></li>
      </ul></div>
      <div class="card" data-anim><h3>Equipo directivo</h3><ul class="list">${team.map(u => `<li><span class="avatar" style="--av:${escape(u.color)}">${escape(u.name.split(' ').map(w => w[0]).join('').slice(0, 2))}</span><span><b>${escape(u.name)}</b><br><span class="small muted">${escape(u.title || '')}</span></span></li>`).join('')}</ul></div>
    </div>
  </div></section>`;
}

export function renderNiveles(el) {
  const courses = sortedCourses();
  el.innerHTML = `
  <section class="page-hero"><div class="container" data-anim><span class="eyebrow">Niveles</span><h1>Una trayectoria completa</h1><p class="lead">Acompañamos a cada estudiante desde sus primeros juegos hasta su egreso, con jornada completa y talleres por la tarde.</p></div></section>
  <section class="section" style="padding-top:24px"><div class="container stack">
    ${Object.entries(LEVEL_INFO).map(([k, v]) => `
      <div class="card" style="--tone:${v.tone}">
        <div class="grid-2" style="align-items:start">
          <div><div class="tile-icon" aria-hidden="true">${LEVEL_ICONS[k]}</div><h2>${LEVELS[k]}</h2><p class="muted">${v.range}</p><p>${escape(v.text)}</p></div>
          <div class="stack" style="gap:10px"><b>Destacados</b><ul class="list compact">${v.items.map(i => `<li>✓ ${escape(i)}</li>`).join('')}</ul>
            <b>Cursos ${YEAR}</b><div class="row" style="gap:6px">${courses.filter(c => c.level === k).map(c => `<span class="chip">${escape(c.name)}</span>`).join('')}</div></div>
        </div>
      </div>`).join('')}
    <div class="card"><h3>Horario de la jornada</h3><p class="muted mb-0">Ingreso 7:45 · Clases de 8:00 a 15:10 · Talleres extraprogramáticos de 15:30 a 17:00 · Almuerzo en casino con alternativa vegetariana.</p></div>
  </div></section>`;
}

export function renderContacto(el) {
  const st = site();
  el.innerHTML = `
  <section class="page-hero"><div class="container" data-anim><span class="eyebrow">Contacto</span><h1>Conversemos</h1><p class="lead">Escríbenos y la secretaría responderá dentro de 2 días hábiles.</p></div></section>
  <section class="section" style="padding-top:24px"><div class="container grid-2" style="align-items:start">
    <form class="card stack" id="contact-form" novalidate>
      <div class="form-grid">
        <div class="field"><label for="c-name">Nombre *</label><input class="input" id="c-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="c-email">Correo *</label><input class="input" id="c-email" name="email" type="email" required autocomplete="email"></div>
        <div class="field full"><label for="c-subject">Asunto</label><select class="select" id="c-subject" name="subject"><option>Consulta general</option><option>Admisión</option><option>Certificados</option><option>Visita al colegio</option><option>Otro</option></select></div>
        <div class="field full"><label for="c-msg">Mensaje *</label><textarea class="textarea" id="c-msg" name="message" required></textarea></div>
      </div>
      <button class="btn btn-primary" type="submit">Enviar mensaje</button>
    </form>
    <div class="stack">
      <div class="map-art" data-anim>${mapArt()}</div>
      <div class="card"><dl class="dl"><dt>Dirección</dt><dd>${escape(st.address)}</dd><dt>Teléfono</dt><dd>${escape(st.phone)}</dd><dt>Correo</dt><dd>${escape(st.email)}</dd><dt>Horario</dt><dd>${escape(st.hours)}</dd></dl></div>
    </div>
  </div></section>`;
  el.querySelector('#contact-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget, v = formData(f);
    let ok = true;
    ['name', 'email', 'message'].forEach(k => { const bad = !v[k] || (k === 'email' && !/^\S+@\S+\.\S+$/.test(v[k])); f.elements[k].classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return toast('Revisa los campos marcados', 'warning');
    db.insert('contacts', { ...v, status: 'nuevo' });
    db.log('contacto', `Mensaje web de ${v.name}: ${v.subject}`);
    f.reset();
    toast('¡Mensaje enviado! Te responderemos pronto.', 'success');
  });
}
