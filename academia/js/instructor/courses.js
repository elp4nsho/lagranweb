// Cursos del instructor: listado, creación y editor (información, precio, currículo con orden ↑↓ y publicación).
import { crud, badge, html, escape, toast, pageHead, formDialog, confirm } from '../shared/admin-kit.js';
import { money } from '../../../assets/core/ui.js';
import { uid } from '../../../assets/core/db.js';
import { db } from '../data/db.js';
import { LEVELS, TONES } from '../data/seed.js';
import { getCategory, rating, studentsCount, lessonsOf, courseMinutes, fmtHours, COURSE, LESSON, notify } from '../data/model.js';

const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function renderMyCourses(el, _p, ctx) {
  crud(el, ctx, {
    key: 'my-courses', title: 'Mis cursos', subtitle: 'Crea un curso, arma su currículo y envíalo a revisión para publicarlo.', singular: 'curso', collection: 'courses',
    rows: () => db.query('courses', c => c.instructorId === ctx.user.id),
    search: c => c.title,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(COURSE).map(([k, v]) => [k, v[0]]) }],
    columns: [
      { key: 'title', label: 'Curso', render: c => html`<b>${c.emoji} ${c.title}</b><br><small class="muted">${getCategory(c.categoryId)?.name} · ${c.level} · ${lessonsOf(c).length} lecciones</small>` },
      { key: 'price', label: 'Precio', render: c => c.price ? money(c.salePrice || c.price) : 'Gratis' },
      { key: 'students', label: 'Estudiantes', value: c => studentsCount(c.id), align: 'center', render: c => String(studentsCount(c.id)) },
      { key: 'rating', label: 'Valoración', value: c => rating(c.id).avg, render: c => rating(c.id).count ? `★ ${rating(c.id).avg} (${rating(c.id).count})` : '—' },
      { key: 'status', label: 'Estado', render: c => badge(COURSE[c.status][0], COURSE[c.status][1]) }
    ],
    canEdit: false,
    canDelete: c => c.status === 'borrador' || c.status === 'rechazado',
    fields: () => [
      { name: 'title', label: 'Título del curso', required: true },
      { name: 'categoryId', label: 'Categoría', type: 'select', options: db.all('categories').map(c => [c.id, c.name]), half: true },
      { name: 'level', label: 'Nivel', type: 'select', options: LEVELS, half: true },
      { name: 'price', label: 'Precio (CLP, 0 = gratis)', type: 'number', value: 19990, min: 0, half: true },
      { name: 'emoji', label: 'Ícono (emoji)', value: '📘', half: true }
    ],
    validate: v => v.price < 0 ? { price: 'Precio no válido' } : db.find('courses', c => c.slug === slugify(v.title)) ? { title: 'Ya existe un curso con ese título' } : {},
    toRecord: v => ({
      ...v, slug: slugify(v.title), subtitle: 'Describe en una frase qué lograrán tus estudiantes', instructorId: ctx.user.id, salePrice: null, tone: TONES[db.count('courses') % TONES.length], status: 'borrador', featured: false, language: 'Español',
      description: 'Describe tu curso: a quién está dirigido, qué aprenderán y cómo está organizado.', learn: ['Primer objetivo de aprendizaje'], requirements: ['No necesitas experiencia previa'],
      sections: [{ id: uid('s'), title: 'Introducción', lessons: [{ id: uid('l'), title: 'Bienvenida al curso', type: 'video', minutes: 3, preview: true, resources: [] }] }]
    }),
    afterSave: (c, v, isNew) => { if (isNew) ctx.go(`/cursos/${c.id}`); },
    rowActions: [{ act: 'open', label: 'Editar', short: '✎ Editar', run: c => ctx.go(`/cursos/${c.id}`) }, { act: 'view', label: 'Ver página', short: '👁', run: c => window.open(`index.html#/curso/${c.slug}`, '_blank') }],
    onRow: c => ctx.go(`/cursos/${c.id}`),
    csv: c => ({ curso: c.title, estado: c.status, precio: c.price, estudiantes: studentsCount(c.id), valoracion: rating(c.id).avg })
  });
}

let tab = 'info';
export function renderCourseEditor(el, { id }, ctx) {
  const c0 = db.get('courses', id);
  if (!c0 || (c0.instructorId !== ctx.user.id && ctx.user.role !== 'admin')) { el.innerHTML = '<div class="card empty"><h2>Curso no encontrado</h2><a class="btn btn-primary" href="#/cursos">Volver</a></div>'; return; }
  const d = JSON.parse(JSON.stringify(c0));
  const locked = d.status === 'revision';
  el.innerHTML = `<a class="ak-back" href="#/cursos">← Mis cursos</a>` + pageHead(`${d.emoji} ${d.title}`, `${COURSE[d.status][0]} · ${lessonsOf(d).length} lecciones · ${fmtHours(courseMinutes(d))}`, `<a class="btn" href="index.html#/curso/${d.slug}" target="_blank" rel="noopener">👁 Vista previa</a><button class="btn btn-primary" data-save ${locked ? 'disabled' : ''}>💾 Guardar cambios</button>`) +
    (locked ? '<div class="ak-note warn">El curso está en revisión: no se puede editar hasta que el equipo responda (o retíralo de revisión).</div>' : '') +
    (d.status === 'rechazado' && d.reviewNote ? `<div class="ak-note warn"><b>Observaciones del equipo:</b> ${escape(d.reviewNote)}</div>` : '') +
    `<div class="tabs" role="tablist">${[['info', 'Información'], ['precio', 'Precio'], ['curriculo', 'Currículo'], ['publicacion', 'Publicación']].map(([k, n]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}" role="tab" aria-selected="${tab === k}">${n}</button>`).join('')}</div><div data-box></div>`;
  const box = el.querySelector('[data-box]');
  const sync = () => {
    const f = box.querySelector('form[data-info]');
    if (f) Object.assign(d, { title: f.title.value.trim(), subtitle: f.subtitle.value.trim(), description: f.description.value.trim(), categoryId: f.categoryId.value, level: f.level.value, emoji: f.emoji.value.trim() || '📘', learn: f.learn.value.split('\n').map(s => s.trim()).filter(Boolean), requirements: f.requirements.value.split('\n').map(s => s.trim()).filter(Boolean) });
    const p = box.querySelector('form[data-price]');
    if (p) { d.price = Math.max(0, +p.price.value || 0); d.salePrice = +p.salePrice.value > 0 ? +p.salePrice.value : null; }
    box.querySelectorAll('[data-sec]').forEach(sEl => {
      const s = d.sections[+sEl.dataset.sec];
      s.title = sEl.querySelector('[data-stitle]').value.trim() || 'Sección';
      sEl.querySelectorAll('[data-les]').forEach(lEl => { const l = s.lessons[+lEl.dataset.les]; l.title = lEl.querySelector('[data-k=title]').value.trim() || 'Lección'; l.type = lEl.querySelector('[data-k=type]').value; l.minutes = Math.max(1, +lEl.querySelector('[data-k=minutes]').value || 1); l.preview = lEl.querySelector('[data-k=preview]').checked; });
    });
  };
  const paint = () => {
    el.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
    const dis = locked ? 'disabled' : '';
    if (tab === 'info') box.innerHTML = `<form class="card ak-form" data-info>
      <div class="field ak-full"><label for="ct">Título</label><input class="input" id="ct" name="title" value="${escape(d.title)}" ${dis}></div>
      <div class="field ak-full"><label for="cs">Subtítulo</label><input class="input" id="cs" name="subtitle" value="${escape(d.subtitle)}" ${dis}></div>
      <div class="field"><label for="cc">Categoría</label><select class="select" id="cc" name="categoryId" ${dis}>${db.all('categories').map(k => `<option value="${k.id}" ${k.id === d.categoryId ? 'selected' : ''}>${escape(k.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="cl">Nivel</label><select class="select" id="cl" name="level" ${dis}>${LEVELS.map(k => `<option ${k === d.level ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
      <div class="field"><label for="ce">Ícono de portada (emoji)</label><input class="input" id="ce" name="emoji" value="${escape(d.emoji)}" ${dis}></div>
      <div class="field ak-full"><label for="cd">Descripción</label><textarea class="textarea" id="cd" name="description" ${dis}>${escape(d.description)}</textarea></div>
      <div class="field"><label for="cw">Lo que aprenderán (uno por línea)</label><textarea class="textarea" id="cw" name="learn" ${dis}>${escape(d.learn.join('\n'))}</textarea></div>
      <div class="field"><label for="cr">Requisitos (uno por línea)</label><textarea class="textarea" id="cr" name="requirements" ${dis}>${escape(d.requirements.join('\n'))}</textarea></div></form>`;
    if (tab === 'precio') box.innerHTML = `<form class="card ak-form" data-price>
      <div class="field"><label for="pp">Precio de lista (CLP)</label><input class="input" id="pp" name="price" type="number" min="0" step="990" value="${d.price}" ${dis}><small class="muted">0 = curso gratuito.</small></div>
      <div class="field"><label for="ps">Precio de oferta (opcional)</label><input class="input" id="ps" name="salePrice" type="number" min="0" step="990" value="${d.salePrice || ''}" ${dis}><small class="muted">Debe ser menor al precio de lista.</small></div>
      <p class="ak-note ak-full">Recibes el 70% de cada venta (después de cupones). Ejemplo con el precio actual: <b>${money(Math.round((d.salePrice || d.price) * 0.7))}</b> por estudiante.</p></form>`;
    if (tab === 'curriculo') box.innerHTML = `<div class="card"><div class="row between" style="margin-bottom:12px"><div><h3 style="margin:0">Currículo</h3><small class="muted">Ordena secciones y lecciones con ↑ ↓. Marca «Muestra» para lecciones gratuitas.</small></div><button class="btn" data-add-sec ${dis}>＋ Sección</button></div>
      ${d.sections.map((s, i) => `<section class="cur-section" data-sec="${i}"><header><b>${i + 1}.</b><input class="input" data-stitle value="${escape(s.title)}" aria-label="Título de la sección ${i + 1}" ${dis}>
        <button class="btn btn-sm btn-ghost btn-x" data-sup="${i}" ${i === 0 || locked ? 'disabled' : ''} aria-label="Subir sección">↑</button><button class="btn btn-sm btn-ghost btn-x" data-sdown="${i}" ${i === d.sections.length - 1 || locked ? 'disabled' : ''} aria-label="Bajar sección">↓</button><button class="btn btn-sm btn-ghost btn-x ak-danger" data-srm="${i}" ${dis} aria-label="Eliminar sección">✕</button></header>
        <ul class="cur-lessons">${s.lessons.map((l, j) => `<li data-les="${j}"><span aria-hidden="true">${LESSON[l.type][0]}</span><input class="input grow" data-k="title" value="${escape(l.title)}" aria-label="Título de la lección" ${dis}>
          <select class="select" data-k="type" style="width:auto" aria-label="Tipo" ${dis}>${Object.entries(LESSON).map(([k, v]) => `<option value="${k}" ${k === l.type ? 'selected' : ''}>${v[1]}</option>`).join('')}</select>
          <input class="input" data-k="minutes" type="number" min="1" value="${l.minutes}" style="width:74px" aria-label="Minutos" ${dis}>
          <label class="check small"><input type="checkbox" data-k="preview" ${l.preview ? 'checked' : ''} ${dis}> Muestra</label>
          <button class="btn btn-sm btn-ghost btn-x" data-ledit="${i}:${j}" ${dis} title="Recursos y quiz">⚙</button><button class="btn btn-sm btn-ghost btn-x" data-lup="${i}:${j}" ${j === 0 || locked ? 'disabled' : ''} aria-label="Subir">↑</button><button class="btn btn-sm btn-ghost btn-x" data-ldown="${i}:${j}" ${j === s.lessons.length - 1 || locked ? 'disabled' : ''} aria-label="Bajar">↓</button><button class="btn btn-sm btn-ghost btn-x ak-danger" data-lrm="${i}:${j}" ${dis} aria-label="Eliminar">✕</button></li>`).join('')}</ul>
        <button class="btn btn-sm" data-add-les="${i}" style="margin-top:8px" ${dis}>＋ Lección</button></section>`).join('')}
      <p class="small muted">Total: ${d.sections.length} secciones · ${lessonsOf(d).length} lecciones · ${fmtHours(courseMinutes(d))}</p></div>`;
    if (tab === 'publicacion') {
      const checks = [[d.title.length >= 5, 'Título de al menos 5 caracteres'], [d.description.length >= 40, 'Descripción de al menos 40 caracteres'], [d.sections.length >= 2, 'Al menos 2 secciones'], [lessonsOf(d).length >= 5, 'Al menos 5 lecciones'], [lessonsOf(d).some(l => l.preview), 'Al menos una lección de muestra'], [d.learn.length >= 3, 'Al menos 3 objetivos de aprendizaje']];
      box.innerHTML = `<div class="card stack"><h3 style="margin:0">Estado: ${badge(COURSE[d.status][0], COURSE[d.status][1])}</h3>
        <ul class="ak-list">${checks.map(([ok, t]) => `<li><span>${ok ? '✅' : '⬜'}</span><span class="grow">${t}</span></li>`).join('')}</ul>
        <div class="row">${d.status === 'borrador' || d.status === 'rechazado' || d.status === 'archivado' ? `<button class="btn btn-primary" data-submit-review ${checks.every(c => c[0]) ? '' : 'disabled'}>Enviar a revisión</button>` : ''}
        ${d.status === 'revision' ? '<button class="btn" data-withdraw>Retirar de revisión</button>' : ''}${d.status === 'publicado' ? '<button class="btn btn-danger" data-archive>Despublicar (archivar)</button>' : ''}</div>
        <p class="small muted" style="margin:0">El equipo de Academia Faro revisa calidad de audio, contenido y descripción en 1 a 3 días hábiles.</p></div>`;
    }
  };
  paint();
  el.querySelector('[role=tablist]').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { sync(); tab = b.dataset.tab; paint(); } });
  const pair = v => v.split(':').map(Number);
  box.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const ds = b.dataset;
    if ('addSec' in ds || ds.sup || ds.sdown || ds.srm || ds.addLes || ds.lup || ds.ldown || ds.lrm || ds.ledit) sync();
    if ('addSec' in ds) d.sections.push({ id: uid('s'), title: 'Nueva sección', lessons: [{ id: uid('l'), title: 'Nueva lección', type: 'video', minutes: 5, preview: false, resources: [] }] });
    if (ds.sup) { const i = +ds.sup; [d.sections[i - 1], d.sections[i]] = [d.sections[i], d.sections[i - 1]]; }
    if (ds.sdown) { const i = +ds.sdown; [d.sections[i + 1], d.sections[i]] = [d.sections[i], d.sections[i + 1]]; }
    if (ds.srm) { if (d.sections.length <= 1) return toast('El curso necesita al menos una sección', 'warning'); if (!(await confirm('¿Eliminar la sección y sus lecciones?', { danger: true, ok: 'Eliminar' }))) return; d.sections.splice(+ds.srm, 1); }
    if (ds.addLes) d.sections[+ds.addLes].lessons.push({ id: uid('l'), title: 'Nueva lección', type: 'video', minutes: 5, preview: false, resources: [] });
    if (ds.lup) { const [i, j] = pair(ds.lup), L = d.sections[i].lessons; [L[j - 1], L[j]] = [L[j], L[j - 1]]; }
    if (ds.ldown) { const [i, j] = pair(ds.ldown), L = d.sections[i].lessons; [L[j + 1], L[j]] = [L[j], L[j + 1]]; }
    if (ds.lrm) { const [i, j] = pair(ds.lrm); if (d.sections[i].lessons.length <= 1) return toast('Cada sección necesita al menos una lección', 'warning'); d.sections[i].lessons.splice(j, 1); }
    if (ds.ledit) {
      const [i, j] = pair(ds.ledit), l = d.sections[i].lessons[j];
      const v = await formDialog({ title: `Lección: ${l.title}`, size: 'lg', fields: [
        { name: 'resources', label: 'Recursos descargables (uno por línea: nombre | tamaño)', type: 'textarea', value: (l.resources || []).map(r => `${r.name} | ${r.size || ''}`).join('\n') },
        ...(l.type === 'quiz' ? [{ name: 'quiz', label: 'Preguntas del quiz (una por línea: pregunta | opción A | opción B | opción C | opción D | letra correcta)', type: 'textarea', rows: 6, value: (l.quiz || []).map(q => [q.q, ...q.options, 'ABCD'[q.answer]].join(' | ')).join('\n') }] : [])
      ], validate: x => { if (x.quiz != null) { const bad = x.quiz.split('\n').filter(Boolean).find(line => { const p = line.split('|').map(s => s.trim()); return p.length !== 6 || !'ABCD'.includes(p[5].toUpperCase()) || !p[5]; }); if (bad) return { quiz: `Formato incorrecto en: «${bad.slice(0, 40)}…»` }; } return {}; } });
      if (!v) return;
      l.resources = v.resources.split('\n').map(s => s.trim()).filter(Boolean).map(s => { const [name, size] = s.split('|').map(x => x.trim()); return { name, size: size || '' }; });
      if (v.quiz != null) l.quiz = v.quiz.split('\n').filter(Boolean).map(line => { const p = line.split('|').map(s => s.trim()); return { q: p[0], options: p.slice(1, 5), answer: 'ABCD'.indexOf(p[5].toUpperCase()) }; });
      toast('Lección actualizada (recuerda guardar)', 'info');
    }
    if ('submitReview' in ds) { db.update('courses', d.id, { ...d, status: 'revision', submittedAt: new Date().toISOString(), reviewNote: null }); db.log('curso enviado a revisión', d.title, ctx.user.id); db.query('users', u => u.role === 'admin').forEach(a => notify(a.id, 'Curso por revisar', `${ctx.user.name} envió «${d.title}» a revisión.`, 'warning')); toast('Curso enviado a revisión', 'success'); return; }
    if ('withdraw' in ds) { db.update('courses', d.id, { status: 'borrador' }); db.log('curso retirado de revisión', d.title, ctx.user.id); toast('Curso retirado de revisión', 'info'); return; }
    if ('archive' in ds) { if (!(await confirm('El curso dejará de venderse. Los estudiantes inscritos mantienen su acceso.', { title: 'Despublicar', danger: true, ok: 'Despublicar' }))) return; db.update('courses', d.id, { status: 'archivado' }); db.log('curso archivado', d.title, ctx.user.id); toast('Curso despublicado', 'success'); return; }
    paint();
  });
  el.querySelector('[data-save]').onclick = () => {
    sync();
    if (d.title.length < 5) return toast('El título debe tener al menos 5 caracteres', 'warning');
    if (d.salePrice && d.salePrice >= d.price) return toast('El precio de oferta debe ser menor al de lista', 'warning');
    if (db.find('courses', x => x.slug === slugify(d.title) && x.id !== d.id)) return toast('Ya existe otro curso con ese título', 'warning');
    d.slug = d.status === 'publicado' ? d.slug : slugify(d.title);
    db.update('courses', d.id, d); db.log('curso editado', d.title, ctx.user.id); toast('Cambios guardados', 'success');
  };
}
