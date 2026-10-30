// Macros (respuestas predefinidas) con acciones: estado, prioridad y etiqueta.
import { db } from '../data/db.js';
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { STATUSES, PRIORITIES } from '../shared/constants.js';
import { pageHead } from '../shared/shell.js';
import { openForm, field, opt } from '../shared/forms.js';
import { icon } from '../shared/icons.js';

export function render(view, { user }) {
  const list = db.all('macros');
  view.innerHTML = `${pageHead('Macros', 'Respuestas predefinidas que los agentes aplican con un clic. Variables: {{nombre}}, {{agente}}, {{ticket}}', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva macro</button>`)}
    <div class="grid-auto">${list.map(m => `<article class="card stack"><div class="row between"><h3 style="margin:0">${escape(m.name)}</h3><span class="row" style="gap:4px"><button class="btn btn-sm" data-edit="${m.id}" aria-label="Editar">${icon('edit', 14)}</button><button class="btn btn-sm btn-ghost" data-del="${m.id}" aria-label="Eliminar">${icon('trash', 14)}</button></span></div>
      <p class="small muted tpl-body">${escape(m.body)}</p>
      <div class="row" style="gap:4px">${m.status ? `<span class="badge badge-info plain">→ ${STATUSES.find(s => s.id === m.status)?.name}</span>` : ''}${m.priority ? `<span class="badge badge-warning plain">Prioridad ${m.priority}</span>` : ''}${m.tag ? `<span class="tag">${escape(m.tag)}</span>` : ''}</div></article>`).join('')}</div>`;
  const form = m => openForm({
    title: m ? 'Editar macro' : 'Nueva macro', size: 'lg',
    body: `${field('Nombre *', `<input class="input" name="name" value="${escape(m?.name || '')}" required>`)}${field('Texto *', `<textarea class="textarea" name="body" required style="min-height:140px">${escape(m?.body || 'Hola {{nombre}}, ')}</textarea>`)}
      <div class="grid-3">${field('Cambiar estado a', `<select class="select" name="status"><option value="">(no cambiar)</option>${STATUSES.map(s => opt(s.id, s.name, m?.status)).join('')}</select>`)}${field('Prioridad', `<select class="select" name="priority"><option value="">(no cambiar)</option>${PRIORITIES.map(s => opt(s.id, s.name, m?.priority)).join('')}</select>`)}${field('Etiqueta', `<input class="input" name="tag" value="${escape(m?.tag || '')}">`)}</div>`,
    onSubmit: (f, v) => { const p = { name: v.name.trim(), body: v.body, status: v.status, priority: v.priority, tag: v.tag.trim() }; m ? db.update('macros', m.id, p) : db.insert('macros', p); db.log('macro', `${m ? 'Editó' : 'Creó'} la macro "${p.name}"`, user.id); toast('Macro guardada', 'success'); }
  });
  view.querySelector('[data-new]').onclick = () => form();
  view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => form(db.get('macros', b.dataset.edit)));
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const m = db.get('macros', b.dataset.del); if (await confirm(`¿Eliminar la macro "${m.name}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('macros', m.id); toast('Macro eliminada', 'success'); } });
}
