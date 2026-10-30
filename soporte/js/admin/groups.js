// Grupos de agentes (equipos): integrantes, carga actual y edición.
import { db } from '../data/db.js';
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { isOpen } from '../shared/constants.js';
import { pageHead } from '../shared/shell.js';
import { openForm, field, opt } from '../shared/forms.js';
import { avatar } from '../shared/util.js';
import { icon } from '../shared/icons.js';

export function render(view, { user }) {
  const groups = db.all('groups');
  const staff = db.query('users', u => ['agente', 'supervisor'].includes(u.role) && u.active !== false);
  view.innerHTML = `${pageHead('Grupos', 'Los tickets se enrutan a un grupo según su categoría y las automatizaciones', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo grupo</button>`)}
    <div class="grid-auto">${groups.map(g => { const mem = staff.filter(u => (u.groupIds || []).includes(g.id)); const open = db.count('tickets', t => t.groupId === g.id && isOpen(t)); return `<article class="card stack">
      <div class="row between"><h3 style="margin:0">${escape(g.name)}</h3><span class="row" style="gap:4px"><button class="btn btn-sm" data-edit="${g.id}" aria-label="Editar">${icon('edit', 14)}</button><button class="btn btn-sm btn-ghost" data-del="${g.id}" aria-label="Eliminar">${icon('trash', 14)}</button></span></div>
      <p class="muted small" style="margin:0">${escape(g.description || '')}</p>
      <div class="row between"><div class="stat"><span class="label">Abiertos</span><span class="value">${open}</span></div><div class="stat"><span class="label">Por agente</span><span class="value">${mem.length ? (open / mem.length).toFixed(1) : '—'}</span></div></div>
      <div class="stack" style="gap:6px">${staff.map(u => `<label class="check"><input type="checkbox" data-mem="${g.id}:${u.id}" ${(u.groupIds || []).includes(g.id) ? 'checked' : ''}> ${avatar(u, 22)} ${escape(u.name)}</label>`).join('')}</div>
    </article>`; }).join('')}</div>`;
  const form = g => openForm({ title: g ? 'Editar grupo' : 'Nuevo grupo', body: `${field('Nombre *', `<input class="input" name="name" value="${escape(g?.name || '')}" required>`)}${field('Descripción', `<input class="input" name="description" value="${escape(g?.description || '')}">`)}`, onSubmit: (f, v) => { const p = { name: v.name.trim(), description: v.description.trim() }; g ? db.update('groups', g.id, p) : db.insert('groups', p); db.log('grupos', `${g ? 'Editó' : 'Creó'} el grupo ${p.name}`, user.id); toast('Grupo guardado', 'success'); } });
  view.querySelector('[data-new]').onclick = () => form();
  view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => form(db.get('groups', b.dataset.edit)));
  view.querySelectorAll('[data-mem]').forEach(c => c.onchange = () => { const [g, u] = c.dataset.mem.split(':'); db.update('users', u, x => ({ groupIds: c.checked ? [...new Set([...(x.groupIds || []), g])] : (x.groupIds || []).filter(y => y !== g) })); toast('Integrantes actualizados', 'success'); });
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const g = db.get('groups', b.dataset.del); if (db.count('tickets', t => t.groupId === g.id && isOpen(t))) return toast('El grupo tiene tickets abiertos; reasígnalos primero', 'warning'); if (await confirm(`¿Eliminar el grupo ${g.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('groups', g.id); toast('Grupo eliminado', 'success'); } });
}
