// Anuncios para el directorio público, la app de empleados y el kiosko.
import { escape, toast, date } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';

export const AUDIENCE = { todos: 'Todos (público, empleados y kiosko)', empleados: 'Solo app de empleados', kiosko: 'Solo kiosko de recepción' };

export function render(el, ctx) {
  const { db } = ctx;
  const cos = db.all('companies'), coName = id => cos.find(c => c.id === id)?.name || 'Todas las empresas';
  const fields = [
    { name: 'title', label: 'Título', required: true, span: 2 },
    { name: 'body', label: 'Mensaje', type: 'textarea', required: true, span: 2 },
    { name: 'audience', label: 'Dónde se muestra', type: 'select', options: Object.entries(AUDIENCE) },
    { name: 'companyId', label: 'Empresa', type: 'select', options: [['', 'Todas las empresas'], ...cos.map(c => [c.id, c.name])] },
    { name: 'pinned', label: 'Fijar arriba (destacado)', type: 'checkbox', span: 1 },
    { name: 'published', label: 'Publicado', type: 'checkbox', span: 1 }
  ];
  const rows = db.all('announcements').map(a => ({ ...a, coName: coName(a.companyId), aud: AUDIENCE[a.audience]?.split(' (')[0] || a.audience }));
  el.innerHTML = pageHead('Anuncios', 'Comunicados que aparecen al instante en el directorio, la app de empleados y el kiosko.', '<button class="btn btn-primary" data-act="new">＋ Nuevo anuncio</button>') + '<div data-t></div>';
  smartTable(el.querySelector('[data-t]'), {
    key: 'anuncios', rows, sort: 'date', dir: -1, search: r => `${r.title} ${r.body}`,
    filters: [{ key: 'aud', label: 'Audiencia', options: Object.keys(AUDIENCE).map(k => [k, AUDIENCE[k].split(' (')[0]]), test: (r, v) => r.audience === v }, { key: 'pub', label: 'Estado', options: [['1', 'Publicados'], ['0', 'Borradores']], test: (r, v) => !!r.published === (v === '1') }],
    columns: [
      { key: 'title', label: 'Anuncio', render: r => `<b>${r.pinned ? '📌 ' : ''}${escape(r.title)}</b><br><small class="muted">${escape(r.body.slice(0, 90))}${r.body.length > 90 ? '…' : ''}</small>` },
      { key: 'aud', label: 'Audiencia' }, { key: 'coName', label: 'Empresa' },
      { key: 'date', label: 'Fecha', render: r => `<span class="nowrap">${escape(date(r.date))}</span><br><small class="muted">${escape(r.author || '')}</small>` },
      { key: 'published', label: 'Estado', render: r => `<label class="switch" title="${r.published ? 'Despublicar' : 'Publicar'}"><input type="checkbox" data-pub="${r.id}" ${r.published ? 'checked' : ''} aria-label="Publicado"><span></span></label>` },
      { key: 'a', label: '', sort: false, render: r => `<div class="acts">${actBtn('edit', r.id, '✎', 'btn-ghost', 'Editar')}${actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar')}</div>` }
    ],
    csv: { filename: 'anuncios.csv', map: r => ({ titulo: r.title, mensaje: r.body, audiencia: r.aud, empresa: r.coName, publicado: r.published ? 'sí' : 'no', fecha: r.date.slice(0, 10) }) }
  });
  el.querySelector('[data-t]').addEventListener('change', e => {
    const s = e.target.closest('[data-pub]'); if (!s) return;
    const a = db.get('announcements', s.dataset.pub);
    db.update('announcements', a.id, { published: s.checked });
    db.log('anuncio', `${s.checked ? 'Publicó' : 'Despublicó'} «${a.title}»`, ctx.user.id);
    toast(s.checked ? 'Anuncio publicado' : 'Anuncio despublicado', 'success');
  });
  onActs(el, {
    new: async () => {
      const v = await formDialog({ title: 'Nuevo anuncio', fields, values: { audience: 'todos', published: true, companyId: '' } });
      if (!v) return;
      db.insert('announcements', { ...v, companyId: v.companyId || null, date: new Date().toISOString(), author: ctx.user.name });
      if (v.published && v.audience !== 'kiosko') db.query('users', u => u.personId && (!v.companyId || u.companyId === v.companyId)).forEach(u => db.insert('notifications', { personId: u.personId, text: `Nuevo anuncio: ${v.title}`, at: new Date().toISOString(), read: false, kind: 'anuncio' }));
      db.log('anuncio', `Creó el anuncio «${v.title}»${v.published ? ' (publicado)' : ' (borrador)'}`, ctx.user.id);
      toast(v.published ? 'Anuncio publicado' : 'Borrador guardado', 'success');
    },
    edit: async id => {
      const a = db.get('announcements', id);
      const v = await formDialog({ title: 'Editar anuncio', fields, values: { ...a, companyId: a.companyId || '' } });
      if (!v) return;
      db.update('announcements', id, { ...v, companyId: v.companyId || null });
      db.log('anuncio', `Editó el anuncio «${v.title}»`, ctx.user.id);
      toast('Anuncio actualizado', 'success');
    },
    del: id => { const a = db.get('announcements', id); confirmDelete(`el anuncio «${a.title}»`, () => db.remove('announcements', id), { db, user: ctx.user, log: `Eliminó el anuncio «${a.title}»` }); }
  });
}
