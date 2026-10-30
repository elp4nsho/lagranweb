// Ofertas de trabajo (carreras).
import { escape, toast, confirm, date, slug } from '../../../assets/core/ui.js';
import { db, JOB_STATUS } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f, badge } from '../shared/admin-kit.js';

export function editJob(ctx, j = {}) {
  formDialog({
    title: j.id ? 'Editar oferta' : 'Nueva oferta', size: 'lg',
    body: `${f.text('title', 'Cargo', j.title, { required: true })}
      <div class="grid-3">${f.text('area', 'Área', j.area || 'Producto', { required: true })}${f.text('location', 'Ubicación', j.location || 'Valparaíso')}${f.select('modality', 'Modalidad', ['Presencial', 'Híbrido', 'Remoto'], j.modality || 'Híbrido')}</div>
      <div class="grid-3">${f.select('type', 'Tipo', ['Jornada completa', 'Media jornada', 'Freelance', 'Práctica'], j.type || 'Jornada completa')}${f.text('salary', 'Renta', j.salary || '')}${f.select('status', 'Estado', Object.entries(JOB_STATUS).map(([k, [l]]) => [k, l]), j.status || 'draft')}</div>
      ${f.area('description', 'Descripción', j.description, { required: true, rows: 3 })}
      ${f.area('requirements', 'Requisitos (uno por línea)', (j.requirements || []).join('\n'), { rows: 5 })}`,
    onSubmit: v => {
      const data = { ...v, slug: slug(v.title), requirements: v.requirements.split('\n').map(s => s.trim()).filter(Boolean) };
      if (j.id) db.update('jobs', j.id, data); else db.insert('jobs', data);
      db.log('oferta', `${j.id ? 'Editó' : 'Creó'} la oferta “${v.title}”`, ctx.user.id);
      toast(v.status === 'open' ? 'Oferta publicada en Carreras' : 'Oferta guardada', 'success');
    }
  });
}

export default {
  id: 'jobs', path: '/ofertas', label: 'Ofertas de trabajo', icon: '⚑', group: 'Talento', perm: 'jobs',
  render(el, ctx) {
    const apps = db.all('applications');
    el.innerHTML = `${pageHead('Ofertas de trabajo', `${db.count('jobs', j => j.status === 'open')} abiertas en la página de Carreras`, '<button class="btn btn-primary" data-new>＋ Nueva oferta</button>')}<div data-t></div>`;
    el.querySelector('[data-new]').onclick = () => editJob(ctx);
    table(el.querySelector('[data-t]'), {
      id: 'jobs', rows: db.all('jobs').map(j => ({ ...j, _apps: apps.filter(a => a.jobId === j.id).length, _new: apps.filter(a => a.jobId === j.id && a.status === 'nuevo').length })), sort: 'createdAt', dir: -1,
      search: j => `${j.title} ${j.area} ${j.location}`,
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(JOB_STATUS).map(([k, [l]]) => [k, l]) }, { key: 'modality', label: 'Modalidad', options: ['Presencial', 'Híbrido', 'Remoto'] }],
      columns: [
        { key: 'title', label: 'Cargo', render: j => `<b>${escape(j.title)}</b><br><small class="muted">${escape(j.area)} · ${escape(j.location)} · ${escape(j.modality)}</small>` },
        { key: 'type', label: 'Tipo' },
        { key: '_apps', label: 'Postulantes', render: j => `<a href="#/postulantes?job=${j.id}">${j._apps}</a>${j._new ? ` <span class="badge badge-info">${j._new} nuevas</span>` : ''}` },
        { key: 'createdAt', label: 'Publicada', render: j => date(j.createdAt) },
        { key: 'status', label: 'Estado', render: j => badge(j.status, JOB_STATUS) }
      ],
      actions: j => (j.status === 'open' ? actBtn('close', 'Cerrar oferta', '⏸') : actBtn('open', 'Abrir oferta', '▶')) + actBtn('edit', 'Editar', '✎') + actBtn('del', 'Eliminar', '🗑'),
      onRow: j => editJob(ctx, db.get('jobs', j.id)),
      onAction: async (a, j) => {
        const raw = db.get('jobs', j.id);
        if (a === 'edit') editJob(ctx, raw);
        if (a === 'open' || a === 'close') { db.update('jobs', j.id, { status: a === 'open' ? 'open' : 'closed' }); db.log('oferta', `${a === 'open' ? 'Abrió' : 'Cerró'} “${j.title}”`, ctx.user.id); toast(a === 'open' ? 'Oferta abierta' : 'Oferta cerrada', 'success'); }
        if (a === 'del' && await confirm(`¿Eliminar la oferta “${j.title}”? Las postulaciones se conservarán.`, { danger: true, ok: 'Eliminar' })) { db.remove('jobs', j.id); db.log('oferta', `Eliminó “${j.title}”`, ctx.user.id); toast('Oferta eliminada', 'success'); }
      },
      csv: { name: 'ofertas', map: j => ({ cargo: j.title, area: j.area, ubicacion: j.location, modalidad: j.modality, tipo: j.type, renta: j.salary, estado: JOB_STATUS[j.status][0], postulantes: j._apps }) }
    });
  }
};
