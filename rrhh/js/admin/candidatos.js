// ATS: pipeline kanban (arrastrar entre etapas), perfil del candidato, entrevistas,
// scorecards, notas y contratación (crea colaborador + onboarding).
import { escape, toast, date, modal, money } from '../../../assets/core/ui.js';
import { pageHead } from './common.js';
import { formDialog } from '../shared/form.js';
import { STAGES, STAGE_LABEL, initials } from '../shared/util.js';
import { today, addDays } from '../shared/dates.js';
import { AFP } from '../shared/payroll.js';

let jobF = '', q = '', showDiscarded = false;
const stars = n => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
const avg = sc => { const v = Object.values(sc.scores); return v.reduce((a, b) => a + b, 0) / v.length; };

export function moveStage(ctx, id, stage, extra = {}) {
  const { db } = ctx, a = db.get('applications', id);
  if (!a || a.stage === stage) return;
  if (stage === 'contratado') return hire(ctx, a);
  db.update('applications', id, { stage, ...extra, history: [...a.history, { stage, at: today(), by: ctx.user.name }] });
  db.log('ats', `Movió a ${a.name} a «${STAGE_LABEL[stage]}»`, ctx.user.id);
  toast(`${a.name} → ${STAGE_LABEL[stage]}`, 'success');
}
async function discard(ctx, id) {
  const v = await formDialog({ title: 'Descartar candidato', submit: 'Descartar', fields: [{ name: 'rejectReason', label: 'Motivo', type: 'select', span: 2, options: ['No cumple requisitos', 'Pretensiones fuera de rango', 'Eligió otra oferta', 'No se presentó', 'Otro candidato avanzó'] }, { name: 'notify', label: 'Enviar correo de cierre al candidato (simulado)', type: 'checkbox', value: true }] });
  if (!v) return;
  moveStage(ctx, id, 'descartado', { rejectReason: v.rejectReason });
}
async function hire(ctx, a) {
  const { db } = ctx, j = db.get('jobs', a.jobId);
  const v = await formDialog({ title: `Contratar a ${a.name}`, submit: 'Contratar y crear ficha', fields: [
    { name: 'html', type: 'html', html: `<p class="muted small" style="margin:0">Se creará su ficha de colaborador, el contrato pendiente de firma y un checklist de onboarding. Cargo: <b>${escape(j?.title || '')}</b>.</p>` },
    { name: 'hireDate', label: 'Fecha de ingreso', type: 'date', required: true }, { name: 'salary', label: 'Sueldo base', type: 'number', step: 10000, required: true },
    { name: 'contractType', label: 'Contrato', type: 'select', options: ['Plazo fijo', 'Indefinido'] }, { name: 'afp', label: 'AFP', type: 'select', options: Object.keys(AFP) }
  ], values: { hireDate: addDays(today(), 14), salary: Math.round((j?.salaryMin || 1000000) / 10000) * 10000, contractType: 'Plazo fijo', afp: 'Modelo' } });
  if (!v) return;
  const [first, ...rest] = a.name.split(' ');
  const dept = db.get('departments', j?.deptId);
  const e = db.insert('employees', { rut: a.rut, first, last: rest.join(' '), name: `${first} ${rest[0] || ''}`.trim(), gender: 'x', birth: '1995-01-01', email: `${first}.${(rest[0] || 'nuevo')}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() + '@grupocordillera.demo', phone: a.phone, address: '', comuna: '', location: j?.location === 'Santiago' ? 'Santiago · Casa matriz' : j?.location || 'Santiago · Casa matriz', deptId: j?.deptId, position: j?.title.replace('/a', '') || 'Nuevo cargo', managerId: dept?.headId || null, level: 3, hireDate: v.hireDate, contractType: v.contractType, contractEnd: v.contractType === 'Plazo fijo' ? addDays(v.hireDate, 90) : null, salary: v.salary, afp: v.afp, health: 'Fonasa', healthUF: 0, status: 'activo', exitDate: null, exitReason: '', jornada: '42 horas', color: dept?.color || '#3f51b5', vacCarry: 0, priorYears: 0, emergency: '', bank: '' });
  db.insert('documents', { employeeId: e.id, name: `Contrato de trabajo · ${v.contractType}`, type: 'Contrato', date: v.hireDate, size: '210 KB', signed: false });
  const tpl = db.getValue('onboardingTemplate', []);
  db.insert('onboarding', { employeeId: e.id, startDate: v.hireDate, buddyId: null, tasks: tpl.map((t, i) => ({ id: `t${i}`, title: t.title, owner: t.owner, due: addDays(v.hireDate, t.offset), done: false })) });
  db.update('applications', a.id, { stage: 'contratado', employeeId: e.id, history: [...a.history, { stage: 'contratado', at: today(), by: ctx.user.name }] });
  const hired = db.count('applications', x => x.jobId === a.jobId && x.stage === 'contratado');
  if (j && hired >= (j.openings || 1)) db.update('jobs', j.id, { status: 'cerrada' });
  db.log('ats', `Contrató a ${a.name} como ${j?.title} (ingreso ${v.hireDate})`, ctx.user.id);
  toast(`¡${first} contratado/a! Se creó su ficha y su onboarding.`, 'success', 4500);
}

export function render(el, ctx, _p, query = {}) {
  const { db } = ctx;
  if (query.job !== undefined && query.job !== jobF) jobF = query.job;
  const jobs = db.all('jobs');
  const apps = db.query('applications', a => (!jobF || a.jobId === jobF) && (!q || `${a.name} ${a.email} ${a.code}`.toLowerCase().includes(q.toLowerCase())));
  const cols = [...STAGES, ...(showDiscarded ? [['descartado', 'Descartado']] : [])];
  el.innerHTML = `${pageHead('Candidatos', `${apps.filter(a => !['descartado', 'contratado'].includes(a.stage)).length} en proceso · arrastra las tarjetas entre etapas`, '<button class="btn btn-primary" data-new>＋ Agregar candidato</button>')}
    <div class="tbl-tools"><input class="input tbl-q" type="search" data-q placeholder="Buscar candidato o código…" value="${escape(q)}" aria-label="Buscar candidato">
      <select class="select tbl-f" data-job aria-label="Vacante"><option value="">Todas las vacantes</option>${jobs.map(j => `<option value="${j.id}" ${j.id === jobF ? 'selected' : ''}>${escape(j.title)}${j.status !== 'publicada' ? ` (${j.status})` : ''}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" data-disc ${showDiscarded ? 'checked' : ''}> Mostrar descartados</label></div>
    <div class="kanban">${cols.map(([k, l]) => { const list = apps.filter(a => a.stage === k).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)); return `<section class="kcol" data-col="${k}" aria-label="${escape(l)}"><div class="kcol-h"><span>${escape(l)}</span><span class="badge">${list.length}</span></div>
      ${list.map(a => { const j = jobs.find(x => x.id === a.jobId); const i = STAGES.findIndex(s => s[0] === a.stage); return `<article class="kcard" draggable="true" data-card="${a.id}"><div class="row" style="flex-wrap:nowrap"><span class="avatar" style="--size:30px;--av:var(--accent)">${escape(initials(a.name))}</span><b>${escape(a.name)}</b></div><span class="muted">${escape(j?.title || '')}</span><div class="row between"><span class="stars" aria-label="${a.rating || 0} de 5">${stars(a.rating)}</span><span class="muted small">${escape(date(a.appliedAt + 'T12:00', { day: 'numeric', month: 'short' }))}</span></div>
        <div class="kcard-acts">${a.stage !== 'descartado' && a.stage !== 'contratado' ? `<button class="btn btn-ghost" data-disc-one="${a.id}" title="Descartar" aria-label="Descartar a ${escape(a.name)}">✕</button>` : ''}<a class="btn btn-ghost" href="#/candidatos/${a.id}">Perfil</a>${i >= 0 && i < STAGES.length - 1 && a.stage !== 'descartado' ? `<button class="btn" data-next="${a.id}" title="Avanzar a ${escape(STAGES[i + 1][1])}">→</button>` : ''}</div></article>`; }).join('') || '<p class="muted small" style="text-align:center">Sin candidatos</p>'}</section>`; }).join('')}</div>`;
  el.querySelector('[data-q]').addEventListener('input', e => { q = e.target.value; const pos = e.target.selectionStart; render(el, ctx, _p, {}); const n = el.querySelector('[data-q]'); n.focus(); n.setSelectionRange(pos, pos); });
  el.querySelector('[data-job]').onchange = e => { jobF = e.target.value; render(el, ctx, _p, {}); };
  el.querySelector('[data-disc]').onchange = e => { showDiscarded = e.target.checked; render(el, ctx, _p, {}); };
  el.querySelector('[data-new]').onclick = async () => {
    const v = await formDialog({ title: 'Agregar candidato', fields: [{ name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'phone', label: 'Teléfono' }, { name: 'rut', label: 'RUT' }, { name: 'jobId', label: 'Vacante', type: 'select', options: jobs.filter(j => j.status !== 'cerrada').map(j => [j.id, j.title]) }, { name: 'source', label: 'Fuente', type: 'select', options: ['Referido', 'LinkedIn', 'Portal de empleo', 'Headhunter'] }], values: { jobId: jobF || jobs[0]?.id } });
    if (!v) return;
    const n = Math.max(4800, ...db.all('applications').map(a => +String(a.code).split('-')[1] || 0)) + 1;
    db.insert('applications', { ...v, code: `GC-${n}`, linkedin: '', cvName: '', cvSize: '', cover: '', stage: 'postulado', rating: 0, appliedAt: today(), history: [{ stage: 'postulado', at: today(), by: ctx.user.name }], notes: [], rejectReason: '' });
    db.log('ats', `Agregó a ${v.name} al proceso`, ctx.user.id); toast('Candidato agregado', 'success');
  };
  el.onclick = e => {
    const n = e.target.closest('[data-next]'), d = e.target.closest('[data-disc-one]');
    if (n) { const a = db.get('applications', n.dataset.next); const i = STAGES.findIndex(s => s[0] === a.stage); moveStage(ctx, a.id, STAGES[i + 1][0]); }
    if (d) discard(ctx, d.dataset.discOne);
  };
  let dragId = null;
  el.querySelectorAll('[data-card]').forEach(c => {
    c.addEventListener('dragstart', e => { dragId = c.dataset.card; c.classList.add('dragging'); e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; });
    c.addEventListener('dragend', () => c.classList.remove('dragging'));
  });
  el.querySelectorAll('[data-col]').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('over'); const id = e.dataTransfer.getData('text/plain') || dragId; if (!id) return; col.dataset.col === 'descartado' ? discard(ctx, id) : moveStage(ctx, id, col.dataset.col); });
  });
}

export function renderProfile(el, ctx, { id }) {
  const { db } = ctx, a = db.get('applications', id);
  if (!a) { el.innerHTML = '<div class="card empty">Candidato no encontrado. <a href="#/candidatos">Volver</a></div>'; return; }
  const j = db.get('jobs', a.jobId);
  const ints = db.query('interviews', x => x.applicationId === id).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  const scs = db.query('scorecards', x => x.applicationId === id);
  const scAvg = scs.length ? (scs.reduce((s, x) => s + avg(x), 0) / scs.length).toFixed(1).replace('.', ',') : '—';
  el.innerHTML = `${pageHead(a.name, `${escape(j?.title || '')} · ${escape(a.code)} · postuló el ${escape(date(a.appliedAt + 'T12:00'))}`, `<a class="btn btn-ghost" href="#/candidatos">← Pipeline</a>${a.stage !== 'descartado' && a.stage !== 'contratado' ? '<button class="btn" data-discard>Descartar</button>' : ''}`)}
    <div class="dash-grid">
      <div class="card span-4 stack">
        <div class="row" style="flex-wrap:nowrap"><span class="avatar" style="--size:56px;--av:var(--accent)">${escape(initials(a.name))}</span><div><b style="font-size:18px">${escape(a.name)}</b><div class="stars" aria-label="Valoración">${[1, 2, 3, 4, 5].map(n => `<button class="btn btn-ghost btn-sm" data-rate="${n}" aria-label="${n} estrellas" style="padding:0 2px;min-height:24px">${n <= (a.rating || 0) ? '★' : '☆'}</button>`).join('')}</div></div></div>
        <div class="field"><label for="stg">Etapa</label><select class="select" id="stg" data-stage>${[...STAGES, ['descartado', 'Descartado']].map(([k, l]) => `<option value="${k}" ${k === a.stage ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <dl class="kv"><dt>Correo</dt><dd>${escape(a.email)}</dd><dt>Teléfono</dt><dd>${escape(a.phone || '—')}</dd><dt>RUT</dt><dd>${escape(a.rut || '—')}</dd><dt>LinkedIn</dt><dd>${escape(a.linkedin || '—')}</dd><dt>Fuente</dt><dd>${escape(a.source)}</dd><dt>Pretensión</dt><dd>${a.expectedSalary ? money(a.expectedSalary) : '—'}</dd>${a.rejectReason ? `<dt>Descarte</dt><dd>${escape(a.rejectReason)}</dd>` : ''}${a.employeeId ? `<dt>Ficha</dt><dd><a href="#/colaboradores/${a.employeeId}">Ver colaborador</a></dd>` : ''}</dl>
        ${a.cvName ? `<button class="btn" data-cv>📄 Ver CV (${escape(a.cvName)})</button>` : '<p class="muted small">Sin CV adjunto.</p>'}
        ${a.cover ? `<blockquote class="muted" style="margin:0;border-left:3px solid var(--line);padding-left:10px">“${escape(a.cover)}”</blockquote>` : ''}
      </div>
      <div class="span-8 stack">
        <div class="card"><div class="card-h"><h3>Entrevistas</h3><button class="btn btn-sm btn-primary" data-int>＋ Agendar</button></div>${ints.map(x => `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>📅 <b>${escape(date(x.date + 'T12:00'))} ${escape(x.time)}</b> · ${escape(x.mode)} con ${escape(x.interviewer)}${x.notes ? `<br><small class="muted">${escape(x.notes)}</small>` : ''}</span>${x.date < today() ? '<span class="badge">Realizada</span>' : '<span class="badge badge-info">Agendada</span>'}</div>`).join('') || '<p class="muted">Sin entrevistas agendadas.</p>'}</div>
        <div class="card"><div class="card-h"><h3>Scorecards <span class="badge badge-primary">promedio ${scAvg}</span></h3><button class="btn btn-sm" data-sc>＋ Evaluar</button></div>${scs.map(s => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${escape(s.by)}</b> · <span class="badge ${s.recommendation === 'Avanzar' ? 'badge-success' : s.recommendation === 'Dudas' ? 'badge-warning' : 'badge-danger'}">${escape(s.recommendation)}</span><div class="row small muted" style="gap:12px;margin-top:4px">${Object.entries(s.scores).map(([k, v]) => `<span>${escape(k)}: <b>${v}</b></span>`).join('')}</div>${s.comment ? `<p class="small" style="margin:4px 0 0">${escape(s.comment)}</p>` : ''}</div>`).join('') || '<p class="muted">Aún no hay evaluaciones.</p>'}</div>
        <div class="card"><h3>Historial y notas</h3><ol class="timeline">${a.history.map(h => `<li class="${h.stage === 'descartado' ? 'bad' : 'done'}"><span class="dot"></span><b>${escape(STAGE_LABEL[h.stage])}</b><small>${escape(date(h.at + 'T12:00'))} · ${escape(h.by)}</small></li>`).join('')}</ol>
          ${(a.notes || []).map(n => `<p class="small" style="margin:6px 0">📝 ${escape(n.text)} <span class="muted">— ${escape(n.by)}, ${escape(date(n.at + 'T12:00'))}</span></p>`).join('')}
          <form class="row" data-note style="margin-top:8px"><input class="input" name="t" placeholder="Agregar nota interna…" aria-label="Nota" style="flex:1"><button class="btn" type="submit">Guardar nota</button></form></div>
      </div>
    </div>`;
  el.querySelector('[data-stage]').onchange = e => { const s = e.target.value; if (s === 'descartado') { discard(ctx, id); e.target.value = a.stage; } else moveStage(ctx, id, s); };
  el.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => { db.update('applications', id, { rating: +b.dataset.rate }); });
  el.querySelector('[data-discard]')?.addEventListener('click', () => discard(ctx, id));
  el.querySelector('[data-note]').addEventListener('submit', e => { e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return; db.update('applications', id, { notes: [...(a.notes || []), { text: t, by: ctx.user.name, at: today() }] }); toast('Nota guardada', 'success'); });
  el.querySelector('[data-cv]')?.addEventListener('click', () => modal({ title: a.cvName, size: 'lg', body: `<div class="payslip"><h2 style="margin:0">${escape(a.name)}</h2><p class="muted">${escape(a.email)} · ${escape(a.phone)} · ${escape(a.linkedin)}</p><h3>Experiencia</h3><p><b>${escape(j?.title?.replace('/a', '') || 'Profesional')}</b> · Empresa Ejemplo S.A. (2021 – actual)<br>Responsable de proyectos clave del área, coordinación con equipos y mejora de procesos.</p><p><b>Analista</b> · Compañía Demo Ltda. (2018 – 2021)</p><h3>Formación</h3><p>Título profesional · Universidad Ficticia de Chile</p><h3>Habilidades</h3><p>${escape((j?.requirements || []).slice(0, 3).join(' · '))}</p><p class="muted small">CV simulado generado para la demo.</p></div>` }));
  el.querySelector('[data-int]').onclick = async () => {
    const v = await formDialog({ title: 'Agendar entrevista', fields: [{ name: 'date', label: 'Fecha', type: 'date', required: true, min: today() }, { name: 'time', label: 'Hora', type: 'time', required: true }, { name: 'interviewer', label: 'Entrevistador/a', type: 'select', options: db.query('employees', e => e.level <= 2 && e.status === 'activo').map(e => e.name) }, { name: 'mode', label: 'Modalidad', type: 'select', options: ['Videollamada', 'Presencial', 'Telefónica'] }, { name: 'notes', label: 'Indicaciones', type: 'textarea', span: 2 }], values: { date: addDays(today(), 2), time: '10:00', interviewer: ctx.user.name } });
    if (!v) return;
    db.insert('interviews', { ...v, applicationId: id });
    if (a.stage === 'postulado') moveStage(ctx, id, 'entrevista');
    db.log('ats', `Agendó entrevista con ${a.name} el ${v.date} ${v.time}`, ctx.user.id);
    toast(`Entrevista agendada. Invitación enviada a ${a.email} (simulado)`, 'success');
  };
  el.querySelector('[data-sc]').onclick = async () => {
    const crit = ['Experiencia técnica', 'Comunicación', 'Ajuste cultural', 'Motivación'];
    const v = await formDialog({ title: `Scorecard · ${a.name}`, fields: [...crit.map(c => ({ name: c, label: `${c} (1–5)`, type: 'select', options: ['1', '2', '3', '4', '5'] })), { name: 'recommendation', label: 'Recomendación', type: 'select', options: ['Avanzar', 'Dudas', 'No avanzar'], span: 2 }, { name: 'comment', label: 'Comentario', type: 'textarea', span: 2 }], values: Object.fromEntries(crit.map(c => [c, '3'])) });
    if (!v) return;
    db.insert('scorecards', { applicationId: id, by: ctx.user.name, scores: Object.fromEntries(crit.map(c => [c, +v[c]])), recommendation: v.recommendation, comment: v.comment, at: today() });
    db.log('ats', `Registró scorecard de ${a.name}`, ctx.user.id); toast('Scorecard guardado', 'success');
  };
}
