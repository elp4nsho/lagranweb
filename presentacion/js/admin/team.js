// Equipo: CRUD de integrantes que aparecen en la portada y en “Estudio”.
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f, badge } from '../shared/admin-kit.js';
import { PALETTE, COLOR_NAMES } from '../shared/art.js';

function edit(ctx, t = {}) {
  formDialog({
    title: t.id ? `Editar a ${t.name}` : 'Nuevo integrante',
    body: `<div class="grid-2">${f.text('name', 'Nombre', t.name, { required: true })}${f.text('role', 'Cargo', t.role, { required: true })}</div>
      ${f.area('bio', 'Biografía breve', t.bio, { rows: 3, required: true })}
      ${f.text('skills', 'Habilidades (coma)', (t.skills || []).join(', '))}
      <div class="grid-3">${f.select('color', 'Color del avatar', PALETTE.map(p => [p, COLOR_NAMES[p]]), t.color || 'primary')}${f.text('order', 'Orden', t.order || db.count('team') + 1, { type: 'number' })}${f.text('linkedin', 'LinkedIn', t.linkedin)}</div>
      ${f.sw('active', 'Visible en el sitio', t.id ? t.active : true)}`,
    onSubmit: v => {
      const data = { ...v, skills: v.skills.split(',').map(s => s.trim()).filter(Boolean) };
      if (t.id) db.update('team', t.id, data); else db.insert('team', data);
      db.log('equipo', `${t.id ? 'Editó' : 'Agregó'} a ${v.name}`, ctx.user.id);
      toast('Integrante guardado', 'success');
    }
  });
}

export default {
  id: 'team', path: '/equipo', label: 'Equipo', icon: '☺', group: 'Contenido', perm: 'team',
  render(el, ctx) {
    el.innerHTML = `${pageHead('Equipo', `${db.count('team', t => t.active)} personas visibles en el sitio`, '<button class="btn btn-primary" data-new>＋ Nuevo integrante</button>')}<div data-t></div>`;
    el.querySelector('[data-new]').onclick = () => edit(ctx);
    table(el.querySelector('[data-t]'), {
      id: 'team', rows: db.all('team'), sort: 'order', search: t => `${t.name} ${t.role} ${(t.skills || []).join(' ')}`,
      filters: [{ key: 'active', label: 'Estado', options: [['true', 'Visible'], ['false', 'Oculto']], test: (t, v) => String(!!t.active) === v }],
      columns: [
        { key: 'order', label: '#' },
        { key: 'name', label: 'Nombre', render: t => `<div class="cell-main"><span class="avatar" style="--av:var(--${escape(t.color)})">${escape(initials(t.name))}</span><span><b>${escape(t.name)}</b><small>${escape(t.role)}</small></span></div>` },
        { key: 'skills', label: 'Habilidades', sort: false, render: t => (t.skills || []).map(s => `<span class="badge plain">${escape(s)}</span>`).join(' ') },
        { key: 'active', label: 'Estado', render: t => badge(t.active ? 'on' : 'off', { on: ['Visible', 'success'], off: ['Oculto', ''] }) }
      ],
      actions: () => actBtn('up', 'Subir', '↑') + actBtn('edit', 'Editar', '✎') + actBtn('toggle', 'Mostrar/ocultar', '◐') + actBtn('del', 'Eliminar', '🗑'),
      onRow: t => edit(ctx, t),
      onAction: async (a, t) => {
        if (a === 'edit') edit(ctx, t);
        if (a === 'toggle') { db.update('team', t.id, { active: !t.active }); toast(t.active ? 'Oculto del sitio' : 'Visible en el sitio', 'info'); }
        if (a === 'up') { const sorted = db.all('team').sort((x, y) => x.order - y.order); const i = sorted.findIndex(x => x.id === t.id); if (i > 0) { db.update('team', t.id, { order: sorted[i - 1].order }); db.update('team', sorted[i - 1].id, { order: t.order }); } }
        if (a === 'del' && await confirm(`¿Eliminar a ${t.name} del equipo?`, { danger: true, ok: 'Eliminar' })) { db.remove('team', t.id); db.log('equipo', `Eliminó a ${t.name}`, ctx.user.id); toast('Integrante eliminado', 'success'); }
      },
      csv: { name: 'equipo', map: t => ({ nombre: t.name, cargo: t.role, habilidades: (t.skills || []).join(', '), visible: t.active ? 'sí' : 'no' }) }
    });
  }
};
