// Comunicados masivos a apoderados con acuse de recibo.
import { escape, modal, toast, confirm as ask, downloadCSV, date, dateTime } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, formData } from '../shared/kit.js';
import { sortedCourses, audienceLabel, audienceGuardians, user } from '../shared/academic.js';
import { LEVELS } from '../shared/school.js';

function editModal(db, me, c = null) {
  const courses = sortedCourses();
  const m = modal({
    title: c ? 'Editar comunicado' : 'Nuevo comunicado', size: 'lg',
    body: `<form class="form-grid" novalidate>
      <div class="field full"><label for="cm-t">Título *</label><input class="input" id="cm-t" name="title" required value="${escape(c?.title || '')}"></div>
      <div class="field full"><label for="cm-b">Mensaje *</label><textarea class="textarea" id="cm-b" name="body" required style="min-height:150px">${escape(c?.body || '')}</textarea></div>
      <div class="field"><label for="cm-a">Destinatarios</label><select class="select" id="cm-a" name="audience">${[['todos', 'Toda la comunidad'], ['nivel', 'Un nivel'], ['curso', 'Un curso']].map(([v, l]) => `<option value="${v}" ${c?.audience === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field" data-tw><label for="cm-g">Nivel / curso</label><select class="select" id="cm-g" name="target"></select></div>
      <label class="check"><input type="checkbox" name="requireAck" ${c?.requireAck ?? true ? 'checked' : ''}> Solicitar acuse de recibo</label>
      <p class="small muted full mb-0" data-reach></p>
    </form>`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn" data-draft>Guardar borrador</button><button class="btn btn-primary" data-pub>Publicar y enviar</button>`
  });
  const f = m.el.querySelector('form');
  const fill = () => {
    const a = f.elements.audience.value;
    m.el.querySelector('[data-tw]').classList.toggle('hide', a === 'todos');
    f.elements.target.innerHTML = a === 'nivel' ? Object.entries(LEVELS).map(([k, l]) => `<option value="${k}" ${c?.target === k ? 'selected' : ''}>${l}</option>`).join('') : courses.map(x => `<option value="${x.id}" ${c?.target === x.id ? 'selected' : ''}>${escape(x.name)}</option>`).join('');
    reach();
  };
  const reach = () => { const a = f.elements.audience.value; m.el.querySelector('[data-reach]').textContent = `Llegará a ${audienceGuardians({ audience: a, target: a === 'todos' ? null : f.elements.target.value }).length} apoderados en sus apps Aula360.`; };
  f.elements.audience.onchange = fill; f.elements.target.onchange = reach; fill();
  const save = status => {
    const v = formData(f);
    if (!v.title || !v.body) { f.elements.title.classList.toggle('invalid', !v.title); f.elements.body.classList.toggle('invalid', !v.body); return toast('Título y mensaje son obligatorios', 'warning'); }
    const data = { title: v.title, body: v.body, audience: v.audience, target: v.audience === 'todos' ? null : v.target, requireAck: !!v.requireAck, status };
    if (c) db.update('communications', c.id, { ...data, ...(status === 'publicado' && c.status !== 'publicado' ? { at: new Date().toISOString() } : {}) });
    else db.insert('communications', { ...data, authorId: me.id, at: new Date().toISOString(), reads: {} });
    db.log('comunicado', `${status === 'publicado' ? 'Publicado' : 'Borrador'}: ${v.title}`, me.id);
    toast(status === 'publicado' ? 'Comunicado publicado y enviado' : 'Borrador guardado', 'success');
    m.close();
  };
  m.el.querySelector('[data-draft]').onclick = () => save('borrador');
  m.el.querySelector('[data-pub]').onclick = () => save('publicado');
}

function readsModal(db, me, c) {
  const gs = audienceGuardians(c).map(id => user(id)).filter(Boolean);
  const read = gs.filter(g => c.reads?.[g.id]), unread = gs.filter(g => !c.reads?.[g.id]);
  const m = modal({
    title: `Acuse de recibo · ${c.title}`, size: 'lg',
    body: `<div class="stack"><div class="row"><span class="badge badge-success">${read.length} leídos</span><span class="badge badge-warning">${unread.length} sin leer</span></div>
      <div class="progress"><i style="--v:${gs.length ? read.length / gs.length * 100 : 0}%"></i></div>
      <div class="grid-2"><div><h4>Leído</h4><ul class="list compact">${read.map(g => `<li class="small"><span>${escape(g.name)}<br><span class="muted">${dateTime(c.reads[g.id])}</span></span></li>`).join('') || '<li class="muted small">Nadie aún</li>'}</ul></div>
      <div><h4>Sin leer</h4><ul class="list compact">${unread.slice(0, 60).map(g => `<li class="small">${escape(g.name)}</li>`).join('') || '<li class="muted small">Todos leyeron 🎉</li>'}</ul></div></div></div>`,
    foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${unread.length ? '<button class="btn btn-primary" data-remind>Enviar recordatorio</button>' : ''}`
  });
  m.el.querySelector('[data-remind]')?.addEventListener('click', () => { db.log('comunicado', `Recordatorio enviado a ${unread.length} apoderados: ${c.title}`, me.id); toast(`Recordatorio enviado a ${unread.length} apoderados`, 'success'); m.close(); });
}

export function render(el, { db, me }) {
  const rows = db.all('communications').map(c => { const n = audienceGuardians(c).length, r = Object.keys(c.reads || {}).length; return { ...c, aud: audienceLabel(c), total: n, nread: r, pct: n ? Math.round(Math.min(r, n) / n * 100) : 0, author: user(c.authorId)?.name || '' }; });
  el.innerHTML = `${pageHead('Comunicados', 'Mensajes masivos a las familias con acuse de recibo', `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-new>+ Nuevo comunicado</button>`)}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'comms', rows, search: r => r.title + r.body + r.aud,
    filters: [{ key: 'status', label: 'Estado', options: [['publicado', 'Publicados'], ['borrador', 'Borradores']] }, { key: 'audience', label: 'Destino', options: [['todos', 'Toda la comunidad'], ['nivel', 'Nivel'], ['curso', 'Curso']] }],
    columns: [
      { key: 'title', label: 'Comunicado', render: r => `<b>${escape(r.title)}</b><div class="small muted">${escape(r.author)} · ${date(r.at)}</div>` },
      { key: 'aud', label: 'Destinatarios' },
      { key: 'pct', label: 'Lectura', render: r => r.status === 'publicado' ? `<span class="small">${r.nread}/${r.total} · ${r.pct}%</span><div class="progress" style="width:110px"><i style="--v:${r.pct}%"></i></div>` : '<span class="muted small">—</span>' },
      { key: 'status', label: 'Estado', render: r => r.status === 'publicado' ? badge('Publicado', 'success') : badge('Borrador', 'warning') },
      { key: 'x', label: '', sort: false, render: r => `<div class="actions">${r.status === 'publicado' ? '<button class="btn btn-sm btn-ghost" data-act="reads">Acuses</button>' : '<button class="btn btn-sm btn-ghost" data-act="pub">Publicar</button>'}<button class="btn btn-sm btn-ghost" data-act="edit">Editar</button><button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button></div>` }
    ],
    onAction: async (act, r) => {
      const c = db.get('communications', r.id);
      if (act === 'edit') return editModal(db, me, c);
      if (act === 'reads') return readsModal(db, me, c);
      if (act === 'pub') { db.update('communications', c.id, { status: 'publicado', at: new Date().toISOString() }); db.log('comunicado', `Publicado: ${c.title}`, me.id); return toast('Comunicado publicado', 'success'); }
      if (await ask(`¿Eliminar "${c.title}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('communications', c.id); db.log('comunicado', `Eliminado: ${c.title}`, me.id); toast('Comunicado eliminado', 'success'); }
    }
  });
  el.querySelector('[data-new]').onclick = () => editModal(db, me);
  el.querySelector('[data-csv]').onclick = () => downloadCSV('comunicados.csv', rows.map(r => ({ titulo: r.title, destinatarios: r.aud, fecha: r.at.slice(0, 10), estado: r.status, leidos: r.nread, total: r.total })));
}
