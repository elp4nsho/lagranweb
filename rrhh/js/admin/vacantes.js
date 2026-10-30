// Vacantes: CRUD, publicación en el sitio de empleos y métricas por vacante.
import { escape, toast, money, date } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';
import { today, addDays } from '../shared/dates.js';

const ST = { publicada: 'badge-success', borrador: 'badge-warning', cerrada: '' };
export function render(el, ctx) {
  const { db } = ctx;
  const depts = db.all('departments'), emps = db.query('employees', e => e.status !== 'desvinculado');
  const rows = db.all('jobs').map(j => { const apps = db.query('applications', a => a.jobId === j.id); return { ...j, dept: depts.find(d => d.id === j.deptId)?.name || '', n: apps.length, active: apps.filter(a => !['descartado', 'contratado'].includes(a.stage)).length, hired: apps.filter(a => a.stage === 'contratado').length }; });
  const fields = [
    { name: 'title', label: 'Título del cargo', required: true, span: 2 },
    { name: 'deptId', label: 'Área', type: 'select', options: depts.map(d => [d.id, d.name]) }, { name: 'location', label: 'Ciudad', type: 'select', options: ['Santiago', 'Antofagasta', 'Concepción', 'Remoto'] },
    { name: 'modality', label: 'Modalidad', type: 'select', options: ['Presencial', 'Híbrido', 'Remoto'] }, { name: 'type', label: 'Jornada', type: 'select', options: ['Jornada completa', 'Jornada completa · turnos', 'Part-time', 'Práctica'] },
    { name: 'salaryMin', label: 'Renta bruta desde', type: 'number', step: 10000, required: true }, { name: 'salaryMax', label: 'Renta bruta hasta', type: 'number', step: 10000, required: true },
    { name: 'openings', label: 'N.º de vacantes', type: 'number', min: 1, max: 20 }, { name: 'deadline', label: 'Postulación hasta', type: 'date' },
    { name: 'recruiterId', label: 'Reclutador/a responsable', type: 'select', options: emps.filter(e => e.deptId === 'd-per').map(e => [e.id, e.name]) },
    { name: 'status', label: 'Estado', type: 'select', options: [['borrador', 'Borrador'], ['publicada', 'Publicada'], ['cerrada', 'Cerrada']] },
    { name: 'description', label: 'Descripción', type: 'textarea', required: true, span: 2 },
    { name: 'requirements', label: 'Requisitos (uno por línea)', type: 'textarea', span: 2 }, { name: 'benefits', label: 'Beneficios (uno por línea)', type: 'textarea', span: 2 }
  ];
  const toForm = j => ({ ...j, requirements: (j.requirements || []).join('\n'), benefits: (j.benefits || []).join('\n') });
  const fromForm = v => ({ ...v, requirements: v.requirements.split('\n').map(s => s.trim()).filter(Boolean), benefits: v.benefits.split('\n').map(s => s.trim()).filter(Boolean) });
  const validate = v => v.salaryMax < v.salaryMin ? 'La renta máxima debe ser mayor a la mínima' : null;
  el.innerHTML = pageHead('Vacantes', `${rows.filter(r => r.status === 'publicada').length} publicadas en el sitio de empleos`, '<a class="btn btn-ghost" href="index.html#/empleos" target="_blank" rel="noopener">↗ Ver sitio</a><button class="btn btn-primary" data-act="new">＋ Nueva vacante</button>') + '<div data-t></div>';
  smartTable(el.querySelector('[data-t]'), {
    key: 'jobs', rows, sort: 'publishedAt', dir: -1, search: r => `${r.title} ${r.dept} ${r.location}`,
    filters: [{ key: 'st', label: 'Estado', options: [['publicada', 'Publicada'], ['borrador', 'Borrador'], ['cerrada', 'Cerrada']], test: (r, v) => r.status === v }, { key: 'dp', label: 'Área', options: depts.map(d => [d.id, d.name]), test: (r, v) => r.deptId === v }],
    columns: [
      { key: 'title', label: 'Vacante', render: r => `<b>${escape(r.title)}</b><br><small class="muted">${escape(r.dept)} · ${escape(r.location)} · ${escape(r.modality)}</small>` },
      { key: 'salaryMin', label: 'Renta', render: r => `<span class="nowrap">${money(r.salaryMin)} – ${money(r.salaryMax)}</span>` },
      { key: 'n', label: 'Postulantes', render: r => `<a href="#/candidatos?job=${r.id}">${r.n}</a> <small class="muted">(${r.active} en proceso)</small>` },
      { key: 'publishedAt', label: 'Publicada', render: r => r.publishedAt ? escape(date(r.publishedAt + 'T12:00')) : '—' },
      { key: 'status', label: 'Estado', render: r => `<span class="badge ${ST[r.status]}">${escape(r.status)}</span>` },
      { key: 'a', label: '', sort: false, render: r => `<div class="acts">${r.status !== 'publicada' ? actBtn('pub', r.id, 'Publicar', 'btn-primary') : actBtn('close', r.id, 'Cerrar')}${actBtn('edit', r.id, '✎', 'btn-ghost', 'Editar')}${actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar')}</div>` }
    ],
    csv: { filename: 'vacantes.csv', map: r => ({ vacante: r.title, area: r.dept, ciudad: r.location, modalidad: r.modality, renta_min: r.salaryMin, renta_max: r.salaryMax, postulantes: r.n, contratados: r.hired, estado: r.status }) }
  });
  onActs(el, {
    new: async () => { const v = await formDialog({ title: 'Nueva vacante', fields, size: 'lg', validate, values: { deptId: 'd-tec', location: 'Santiago', modality: 'Híbrido', type: 'Jornada completa', openings: 1, status: 'borrador', deadline: addDays(today(), 30), recruiterId: ctx.user.employeeId, salaryMin: 1000000, salaryMax: 1400000 } }); if (!v) return; db.insert('jobs', { ...fromForm(v), publishedAt: v.status === 'publicada' ? today() : null }); db.log('vacante', `Creó la vacante ${v.title} (${v.status})`, ctx.user.id); toast(v.status === 'publicada' ? 'Vacante publicada en el sitio' : 'Vacante guardada como borrador', 'success'); },
    edit: async id => { const j = db.get('jobs', id); const v = await formDialog({ title: `Editar ${j.title}`, fields, size: 'lg', validate, values: toForm(j) }); if (!v) return; db.update('jobs', id, { ...fromForm(v), publishedAt: v.status === 'publicada' ? (j.publishedAt || today()) : j.publishedAt }); db.log('vacante', `Editó la vacante ${v.title}`, ctx.user.id); toast('Vacante actualizada', 'success'); },
    pub: id => { const j = db.get('jobs', id); db.update('jobs', id, { status: 'publicada', publishedAt: today() }); db.log('vacante', `Publicó ${j.title}`, ctx.user.id); toast('Vacante publicada: ya aparece en el sitio de empleos', 'success'); },
    close: id => { const j = db.get('jobs', id); db.update('jobs', id, { status: 'cerrada' }); db.log('vacante', `Cerró ${j.title}`, ctx.user.id); toast('Vacante cerrada', 'success'); },
    del: id => { const j = db.get('jobs', id); confirmDelete(`la vacante «${j.title}» y sus postulaciones`, () => { db.query('applications', a => a.jobId === id).forEach(a => db.remove('applications', a.id)); db.remove('jobs', id); }, { db, user: ctx.user, log: `Eliminó la vacante ${j.title}` }); }
  });
}
