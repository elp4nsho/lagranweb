// Reproductor del curso: video simulado con progreso, lecturas, quizzes, tareas, notas, preguntas, recursos y reseña.
import { escape, toast, date, ago } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { getCourse, getUser, lessonsOf, enrollment, coursePct, completeLesson, logActivity, LESSON } from '../data/model.js';

let timer = null, tab = 'resumen';
export function leavePlayer() { clearInterval(timer); timer = null; }

export function openCourse(id) {
  const u = auth.current(), e = enrollment(u.id, id), c = getCourse(id);
  if (!e || !c) { location.replace('#/'); return; }
  const ls = lessonsOf(c);
  const next = ls.find(l => l.id === e.lastLessonId && !e.progress[l.id]) || ls.find(l => !e.progress[l.id]) || ls.find(l => l.id === e.lastLessonId) || ls[0];
  location.replace(`#/curso/${id}/${next.id}`);
}

const fakeText = (c, l) => `<div class="reading"><h3>${escape(l.title)}</h3>
  <p>En esta lectura de <b>${escape(c.title)}</b> repasamos las ideas centrales de la sección y te dejamos una guía para practicar por tu cuenta.</p>
  <p>Te recomendamos leer con calma, tomar notas en la pestaña <em>Notas</em> y descargar los recursos asociados. Si te surge una duda, publícala en <em>Preguntas</em>: tu instructor(a) y la comunidad te ayudarán.</p>
  <ul><li>Lee el material completo antes de la siguiente lección.</li><li>Intenta aplicar cada concepto en un ejemplo propio.</li><li>Comparte tus avances en la comunidad.</li></ul></div>`;

export function renderPlayer(view, courseId, lessonId) {
  leavePlayer();
  const u = auth.current(), c = getCourse(courseId);
  let e = enrollment(u.id, courseId);
  if (!c || !e) { view.innerHTML = '<div class="card empty"><h2>No estás inscrito en este curso</h2><a class="btn btn-primary" href="index.html#/cursos">Ver catálogo</a></div>'; return; }
  const ls = lessonsOf(c), idx = ls.findIndex(l => l.id === lessonId);
  if (idx < 0) { openCourse(courseId); return; }
  const l = ls[idx], prev = ls[idx - 1], next = ls[idx + 1];
  const sec = c.sections.find(s => s.lessons.includes(l));
  db.update('enrollments', e.id, { lastLessonId: l.id, lastActivityAt: new Date().toISOString() });
  e = db.get('enrollments', e.id);
  const done = !!e.progress[l.id];
  view.innerHTML = `
    <div class="player-top"><div><a class="back" href="#/" style="text-decoration:none;font-size:14px">← Mis cursos</a><h1>${escape(c.title)}</h1></div>
      <div class="row" style="gap:10px;min-width:220px;flex-wrap:nowrap"><div class="progress" style="flex:1"><i style="--v:${coursePct(e)}%" data-cpct></i></div><b class="small" data-cpct-t>${coursePct(e)}%</b></div></div>
    <div class="player">
      <div class="stack" style="gap:0">
        <div class="lesson-box" data-box></div>
        <div class="lesson-actions">
          ${prev ? `<a class="btn" href="#/curso/${c.id}/${prev.id}">← Anterior</a>` : '<span></span>'}
          <div class="row" style="gap:8px"><button class="btn ${done ? 'btn-ghost' : ''}" data-done ${done ? 'disabled' : ''}>${done ? '✓ Completada' : 'Marcar como completada'}</button>
          ${next ? `<a class="btn btn-primary" href="#/curso/${c.id}/${next.id}">Siguiente →</a>` : e.completedAt ? '<a class="btn btn-primary" href="#/certificados">Ver certificado 🎓</a>' : ''}</div>
        </div>
        <div class="tabs ak-tabs" role="tablist">${[['resumen', 'Resumen'], ['notas', 'Notas'], ['preguntas', 'Preguntas'], ['recursos', 'Recursos'], ['resena', 'Reseña']].map(([k, n]) => `<button class="tab ${tab === k ? 'active' : ''}" role="tab" aria-selected="${tab === k}" data-tab="${k}">${n}</button>`).join('')}</div>
        <div data-tabbox></div>
      </div>
      <aside class="card outline" aria-label="Contenido del curso"><h3>Contenido</h3>
        ${c.sections.map(s => `<div class="sec">${escape(s.title)}</div>${s.lessons.map(x => `<a href="#/curso/${c.id}/${x.id}" class="${x.id === l.id ? 'current' : ''} ${e.progress[x.id] ? 'done' : ''}" ${x.id === l.id ? 'aria-current="true"' : ''}><span class="ck">${e.progress[x.id] ? '✓' : LESSON[x.type][0]}</span><span class="grow">${escape(x.title)}<br><small>${LESSON[x.type][1]} · ${x.minutes} min</small></span></a>`).join('')}`).join('')}
      </aside>
    </div>`;
  const box = view.querySelector('[data-box]');
  const finish = (extra) => {
    const res = completeLesson(e.id, l.id, extra);
    if (res?.completed) toast(`¡Terminaste el curso! Certificado ${res.cert.code} emitido 🎓`, 'success', 5000);
    else toast('Lección completada · +10 XP', 'success');
    renderPlayer(view, courseId, lessonId);
  };
  view.querySelector('[data-done]').onclick = () => finish();

  // ----- contenido según tipo -----
  if (l.type === 'video') {
    const total = l.minutes * 60;
    let pos = Math.min(total, e.watch?.[l.id] || 0), speed = 8, playing = false;
    box.innerHTML = `<div class="video"><span class="vtitle">${escape(sec.title)} · ${escape(l.title)}</span><button class="play" data-play aria-label="Reproducir">▶</button>
      <div class="vbar"><button data-toggle aria-label="Reproducir o pausar">▶</button><span data-time></span><span class="progress"><i data-vp style="--v:0%"></i></span>
      <select data-speed aria-label="Velocidad"><option value="1">1x</option><option value="2">2x</option><option value="8" selected>8x (demo)</option><option value="30">30x</option></select></div></div>`;
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const paint = () => { box.querySelector('[data-vp]').style.setProperty('--v', (pos / total * 100) + '%'); box.querySelector('[data-time]').textContent = `${fmt(pos)} / ${fmt(total)}`; box.querySelector('[data-toggle]').textContent = playing ? '❚❚' : '▶'; box.querySelector('[data-play]').hidden = playing; };
    const save = () => db.update('enrollments', e.id, row => ({ watch: { ...(row.watch || {}), [l.id]: Math.round(pos) } }));
    const toggle = () => {
      playing = !playing;
      if (playing) {
        let tick = 0;
        timer = setInterval(() => {
          pos = Math.min(total, pos + speed * 0.5); tick++;
          if (tick % 20 === 0) logActivity(u.id, 1);
          paint();
          if (pos >= total * 0.9 && !db.get('enrollments', e.id).progress[l.id]) { clearInterval(timer); playing = false; save(); finish(); return; }
          if (pos >= total) { clearInterval(timer); playing = false; save(); paint(); }
        }, 500);
      } else { clearInterval(timer); save(); }
      paint();
    };
    box.querySelector('[data-play]').onclick = toggle; box.querySelector('[data-toggle]').onclick = toggle;
    box.querySelector('[data-speed]').onchange = ev => { speed = +ev.target.value; };
    paint();
  } else if (l.type === 'lectura') {
    box.innerHTML = `<div class="card">${fakeText(c, l)}${l.resources?.length ? `<p><b>Recursos de esta lección:</b> ${l.resources.map(r => escape(r.name)).join(', ')} (pestaña Recursos).</p>` : ''}</div>`;
  } else if (l.type === 'quiz') {
    const qs = l.quiz || [];
    const prevScore = e.quizScores?.[l.id];
    box.innerHTML = `<form class="card" data-quiz><span class="eyebrow">Quiz · aprueba con 70%</span><h2 style="font-size:22px">${escape(l.title)}</h2>${prevScore != null ? `<p class="ak-note">Tu mejor puntaje: <b>${prevScore}%</b></p>` : ''}
      ${qs.map((q, i) => `<fieldset style="margin-bottom:14px"><legend style="font-weight:700;margin-bottom:8px">${i + 1}. ${escape(q.q)}</legend>${q.options.map((o, k) => `<label class="opt"><input type="radio" name="q${i}" value="${k}"> ${escape(o)}</label>`).join('')}</fieldset>`).join('')}
      <p data-res style="font-weight:700"></p><button class="btn btn-primary">Enviar respuestas</button></form>`;
    box.querySelector('[data-quiz]').addEventListener('submit', ev => {
      ev.preventDefault();
      const f = ev.target;
      if (qs.some((q, i) => !f[`q${i}`].value)) return toast('Responde todas las preguntas', 'warning');
      let ok = 0;
      qs.forEach((q, i) => { const v = +f[`q${i}`].value; if (v === q.answer) ok++; f.querySelectorAll(`[name=q${i}]`).forEach((inp, k) => { inp.disabled = true; inp.closest('.opt').classList.toggle('correct', k === q.answer); inp.closest('.opt').classList.toggle('wrong', k === v && v !== q.answer); }); });
      const score = Math.round(ok / qs.length * 100);
      const best = Math.max(score, prevScore || 0);
      f.querySelector('[data-res]').textContent = `Resultado: ${score}% (${ok}/${qs.length}) ${score >= 70 ? '✓ ¡Aprobado!' : '— Necesitas 70%. Inténtalo de nuevo.'}`;
      f.querySelector('button').textContent = 'Reintentar'; f.querySelector('button').type = 'button';
      f.querySelector('button').onclick = () => renderPlayer(view, courseId, lessonId);
      const scores = { ...(db.get('enrollments', e.id).quizScores || {}), [l.id]: best };
      if (score >= 70) setTimeout(() => finish({ quizScores: scores }), 900); else db.update('enrollments', e.id, { quizScores: scores });
    });
  } else {
    const sub = e.assignments?.[l.id];
    box.innerHTML = `<div class="card stack"><span class="eyebrow">Tarea práctica</span><h2 style="font-size:22px;margin:0">${escape(l.title)}</h2>
      <p class="muted" style="margin:0">Aplica lo aprendido en un proyecto propio y súbelo (PDF, imagen o ZIP, máx. 20 MB). Tu instructor(a) podrá revisarlo.</p>
      ${sub ? `<div class="ak-note">📎 Entregaste <b>${escape(sub.fileName)}</b> (${escape(sub.size)}) el ${date(sub.at)} · Estado: <b>${escape(sub.status)}</b>${sub.feedback ? `<br>Comentario: ${escape(sub.feedback)}` : ''}</div>` : ''}
      <label class="dropzone" data-drop><input type="file" hidden data-file><span style="font-size:30px">⬆</span><br><b>${sub ? 'Reemplazar entrega' : 'Arrastra tu archivo o haz clic para elegirlo'}</b></label>
      <div data-up hidden><div class="progress"><i data-upb style="--v:0%"></i></div><small class="muted" data-upt></small></div></div>`;
    const input = box.querySelector('[data-file]'), dz = box.querySelector('[data-drop]');
    const upload = file => {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) return toast('El archivo supera los 20 MB', 'error');
      const up = box.querySelector('[data-up]'); up.hidden = false;
      let p = 0;
      const t = setInterval(() => {
        p = Math.min(100, p + 12 + Math.random() * 18);
        box.querySelector('[data-upb]').style.setProperty('--v', p + '%'); box.querySelector('[data-upt]').textContent = `Subiendo ${escape(file.name)}… ${Math.round(p)}%`;
        if (p >= 100) {
          clearInterval(t);
          const size = file.size > 1048576 ? `${(file.size / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
          const assignments = { ...(db.get('enrollments', e.id).assignments || {}), [l.id]: { fileName: file.name, size, at: new Date().toISOString(), status: 'entregada' } };
          db.log('tarea entregada', `${u.name} · ${c.title}`, u.id);
          finish({ assignments });
        }
      }, 180);
    };
    input.onchange = () => upload(input.files[0]);
    dz.addEventListener('dragover', ev => { ev.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', ev => { ev.preventDefault(); dz.classList.remove('drag'); upload(ev.dataTransfer.files[0]); });
  }

  // ----- pestañas -----
  const tb = view.querySelector('[data-tabbox]');
  const paintTab = () => {
    view.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
    const fresh = db.get('enrollments', e.id);
    if (tab === 'resumen') tb.innerHTML = `<div class="card"><h3>${escape(l.title)}</h3><p class="muted" style="margin:0">${LESSON[l.type][1]} · ${l.minutes} min · Sección «${escape(sec.title)}». Lección ${idx + 1} de ${ls.length}.</p></div>`;
    if (tab === 'notas') {
      const all = Object.entries(fresh.notes || {}).filter(([k, v]) => v && k !== l.id);
      tb.innerHTML = `<div class="card stack"><div class="field"><label for="note">Mis notas de esta lección (privadas)</label><textarea class="textarea" id="note" data-note placeholder="Escribe aquí lo más importante…">${escape(fresh.notes?.[l.id] || '')}</textarea></div><div class="row"><button class="btn btn-primary" data-save-note>Guardar nota</button></div>
        ${all.length ? `<h4 style="margin:6px 0 0">Otras notas del curso</h4><ul class="ak-list">${all.map(([k, v]) => `<li><div class="grow"><b>${escape(ls.find(x => x.id === k)?.title || '')}</b><small>${escape(v)}</small></div><a class="btn btn-sm btn-ghost" href="#/curso/${c.id}/${k}">Ir</a></li>`).join('')}</ul>` : ''}</div>`;
      tb.querySelector('[data-save-note]').onclick = () => { db.update('enrollments', e.id, row => ({ notes: { ...row.notes, [l.id]: tb.querySelector('[data-note]').value.trim() } })); toast('Nota guardada', 'success'); paintTab(); };
    }
    if (tab === 'preguntas') {
      const qs = db.query('questions', q => q.courseId === c.id).sort((a, b) => (b.lessonId === l.id) - (a.lessonId === l.id) || new Date(b.createdAt) - new Date(a.createdAt));
      tb.innerHTML = `<div class="card stack"><form class="stack" data-ask><h3 style="margin:0">Haz una pregunta</h3><input class="input" name="title" placeholder="Resumen de tu pregunta" aria-label="Título"><textarea class="textarea" name="body" placeholder="Describe tu duda con detalle" aria-label="Detalle"></textarea><div class="row"><button class="btn btn-primary">Publicar pregunta</button></div></form>
        <div>${qs.length ? qs.map(q => { const a = getUser(q.userId); return `<div class="qa-item"><div class="row between"><b>${escape(q.title)}</b>${q.resolved ? '<span class="badge badge-success">Resuelta</span>' : q.answers.length ? '<span class="badge badge-info">Respondida</span>' : '<span class="badge badge-warning">Sin respuesta</span>'}</div><p style="margin:4px 0">${escape(q.body)}</p><small class="muted">${escape(a?.name || '')} · ${ago(q.createdAt)} · ${escape(ls.find(x => x.id === q.lessonId)?.title || '')}</small>${q.answers.map(x => `<div class="qa-answer"><b>${escape(getUser(x.userId)?.name || '')}${x.instructor ? ' · Instructor' : ''}</b><br>${escape(x.body)}</div>`).join('')}</div>`; }).join('') : '<p class="muted">Aún no hay preguntas en este curso.</p>'}</div></div>`;
      tb.querySelector('[data-ask]').addEventListener('submit', ev => {
        ev.preventDefault();
        const f = ev.target;
        if (f.title.value.trim().length < 5 || f.body.value.trim().length < 10) return toast('Escribe un título y una descripción más completos', 'warning');
        db.insert('questions', { courseId: c.id, lessonId: l.id, userId: u.id, title: f.title.value.trim(), body: f.body.value.trim(), answers: [], resolved: false });
        db.insert('notifications', { userId: c.instructorId, title: `Nueva pregunta en ${c.title}`, text: f.title.value.trim(), kind: 'warning', read: false, at: new Date().toISOString() });
        db.log('pregunta publicada', `${u.name} · ${c.title}`, u.id);
        toast('Pregunta publicada. Te avisaremos cuando respondan.', 'success'); paintTab();
      });
    }
    if (tab === 'recursos') {
      const rs = ls.flatMap(x => (x.resources || []).map(r => ({ ...r, lesson: x })));
      tb.innerHTML = `<div class="card">${rs.length ? `<ul class="ak-list">${rs.map((r, i) => `<li><span aria-hidden="true">📎</span><div class="grow"><b>${escape(r.name)}</b><small>${escape(r.size || '')} · ${escape(r.lesson.title)}</small></div><button class="btn btn-sm" data-dl="${i}">Descargar</button></li>`).join('')}</ul>` : '<p class="muted">Este curso no tiene recursos descargables.</p>'}</div>`;
      tb.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => {
        const r = rs[+b.dataset.dl];
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([`Academia Faro · ${c.title}\nRecurso: ${r.name}\nLección: ${r.lesson.title}\n\n(Archivo de demostración.)`], { type: 'text/plain' }));
        a.download = r.name.replace(/\.\w+$/, '') + '.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast('Descarga iniciada', 'success');
      });
    }
    if (tab === 'resena') {
      const mine = db.find('reviews', r => r.userId === u.id && r.courseId === c.id);
      tb.innerHTML = `<form class="card stack" data-rev><h3 style="margin:0">${mine ? 'Edita tu reseña' : '¿Qué te está pareciendo el curso?'}</h3>
        <div class="row" role="radiogroup" aria-label="Valoración">${[1, 2, 3, 4, 5].map(n => `<label class="chip ${mine?.rating === n ? 'active' : ''}"><input type="radio" name="rating" value="${n}" ${mine?.rating === n ? 'checked' : ''} style="position:absolute;opacity:0">${'★'.repeat(n)}</label>`).join('')}</div>
        <textarea class="textarea" name="text" placeholder="Cuéntale a otros estudiantes tu experiencia" aria-label="Reseña">${escape(mine?.text || '')}</textarea>
        ${mine?.status === 'pendiente' ? '<p class="small muted" style="margin:0">Tu reseña está en moderación.</p>' : ''}<div class="row"><button class="btn btn-primary">Publicar reseña</button></div></form>`;
      const f = tb.querySelector('[data-rev]');
      f.addEventListener('change', () => f.querySelectorAll('.chip').forEach(ch => ch.classList.toggle('active', ch.querySelector('input').checked)));
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const rating = +(f.rating.value || 0);
        if (!rating) return toast('Elige una valoración de 1 a 5 estrellas', 'warning');
        if (f.text.value.trim().length < 10) return toast('Escribe al menos 10 caracteres', 'warning');
        const rec = { rating, text: f.text.value.trim(), status: rating <= 2 ? 'pendiente' : 'publicada' };
        if (mine) db.update('reviews', mine.id, rec); else db.insert('reviews', { courseId: c.id, userId: u.id, ...rec });
        db.log('reseña publicada', `${u.name} · ${c.title} · ${rating}★`, u.id);
        toast(rec.status === 'pendiente' ? 'Gracias. Tu reseña será revisada por el equipo.' : '¡Gracias por tu reseña! +15 XP', 'success'); paintTab();
      });
    }
  };
  view.querySelector('[role=tablist]').addEventListener('click', ev => { const b = ev.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; paintTab(); } });
  paintTab();
}
