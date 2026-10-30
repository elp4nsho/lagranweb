// Asambleas (programar, registrar quórum y acta) y documentos de la comunidad (CRUD).
import { escape, toast, confirm, date, dateTime } from '../../../assets/core/ui.js';
import { notify } from '../data/db.js';
import { pageHead, crudTable, editForm } from '../shared/kit.js';
import { DOC_CATS, openDoc } from '../resident/documents.js';

export function renderAssemblies(el, p, query, ctx) {
  const { db, user } = ctx;
  const tab = query.tab === 'documentos' ? 'documentos' : 'asambleas';
  el.innerHTML = `${pageHead('Asambleas y documentos', 'Citaciones, actas y documentos oficiales', `<button class="btn btn-primary" data-new>+ ${tab === 'asambleas' ? 'Programar asamblea' : 'Nuevo documento'}</button>`)}
    <div class="tabs"><a class="tab ${tab === 'asambleas' ? 'active' : ''}" href="#/asambleas">Asambleas</a><a class="tab ${tab === 'documentos' ? 'active' : ''}" href="#/asambleas?tab=documentos">Documentos</a></div><div data-body></div>`;
  const body = el.querySelector('[data-body]');
  if (tab === 'asambleas') {
    const list = db.all('assemblies').sort((a, b) => b.date.localeCompare(a.date));
    body.innerHTML = `<div class="stack">${list.map(a => { const doc = db.get('documents', a.docId), polls = db.query('polls', x => x.assemblyId === a.id);
      return `<div class="card stack" style="gap:8px"><div class="row between"><div><h3 style="margin:0">${escape(a.title)}</h3><span class="muted small">${dateTime(a.date)} · ${escape(a.place)} · ${a.type === 'ordinaria' ? 'Ordinaria' : 'Extraordinaria'}</span></div><span class="badge ${a.status === 'realizada' ? 'badge-success' : 'badge-info'}">${a.status === 'realizada' ? 'Realizada' : 'Programada'}</span></div>
        <p style="margin:0"><b>Tabla:</b> ${escape(a.agenda)}</p>
        ${a.status === 'realizada' ? `<p class="small" style="margin:0">Quórum: ${a.quorum}% de los derechos${doc ? ` · Acta: <button class="btn btn-sm btn-ghost" data-doc="${doc.id}">${escape(doc.title)}</button>` : ''}</p>` : ''}
        ${polls.length ? `<p class="small muted" style="margin:0">Votaciones asociadas: ${polls.map(x => escape(x.title)).join(', ')}</p>` : ''}
        <div class="row" style="gap:6px">${a.status === 'programada' ? `<button class="btn btn-sm" data-cite="${a.id}">✉ Enviar citación</button><button class="btn btn-sm btn-primary" data-done="${a.id}">Registrar realización y acta</button>` : ''}<button class="btn btn-sm btn-ghost" data-aedit="${a.id}">✎ Editar</button><button class="btn btn-sm btn-ghost" data-adel="${a.id}">🗑</button></div></div>`; }).join('')}</div>`;
    const aform = a => editForm({ title: a ? 'Editar asamblea' : 'Programar asamblea', values: a ? { ...a, date: a.date.slice(0, 16) } : { type: 'ordinaria', place: 'Sala multiuso', date: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 11) + '19:30' }, fields: [
      { name: 'title', label: 'Título', required: true, full: true }, { name: 'type', label: 'Tipo', type: 'select', options: [['ordinaria', 'Ordinaria'], ['extraordinaria', 'Extraordinaria']] },
      { name: 'date', label: 'Fecha y hora', type: 'datetime-local', required: true }, { name: 'place', label: 'Lugar', required: true }, { name: 'agenda', label: 'Tabla', type: 'textarea', full: true, required: true }] });
    el.querySelector('[data-new]').onclick = async () => { const r = await aform(); if (r) { db.insert('assemblies', { ...r, date: new Date(r.date).toISOString(), status: 'programada', quorum: null, docId: null }); db.log('asamblea', `${user.name} programó «${r.title}»`, user.id); toast('Asamblea programada', 'success'); ctx.refresh(); } };
    body.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.doc) openDoc(db.get('documents', b.dataset.doc));
      if (b.dataset.cite) { const a = db.get('assemblies', b.dataset.cite); notify('*', `Citación: ${a.title} el ${date(a.date)} en ${a.place}`, '#/documentos'); db.insert('announcements', { title: `Citación: ${a.title}`, body: `Se cita a ${a.type === 'ordinaria' ? 'asamblea ordinaria' : 'asamblea extraordinaria'} el ${dateTime(a.date)} en ${a.place}. Tabla: ${a.agenda}`, category: 'Asambleas', pinned: true, published: true, public: false, author: user.name }); db.log('asamblea', `${user.name} envió citación a «${a.title}»`, user.id); toast('Citación enviada y publicada en avisos', 'success'); }
      if (b.dataset.done) {
        const a = db.get('assemblies', b.dataset.done);
        const r = await editForm({ title: 'Registrar asamblea realizada', fields: [{ name: 'quorum', label: 'Quórum (% de derechos)', type: 'number', min: 0, max: 100, required: true }, { name: 'minutes', label: 'Acta (acuerdos)', type: 'textarea', full: true, required: true }] });
        if (!r) return;
        const doc = db.insert('documents', { title: `Acta ${a.title.toLowerCase()} ${new Date(a.date).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`, category: 'acta', content: `Asistencia: ${r.quorum}% de los derechos.\n\n${r.minutes}`, size: '24 KB', visible: true });
        db.update('assemblies', a.id, { status: 'realizada', quorum: r.quorum, docId: doc.id });
        notify('*', `Acta disponible: ${a.title}`, '#/documentos'); db.log('asamblea', `${user.name} registró acta de «${a.title}»`, user.id); toast('Asamblea registrada y acta publicada', 'success'); ctx.refresh();
      }
      if (b.dataset.aedit) { const a = db.get('assemblies', b.dataset.aedit), r = await aform(a); if (r) { db.update('assemblies', a.id, { ...r, date: new Date(r.date).toISOString() }); toast('Asamblea actualizada', 'success'); ctx.refresh(); } }
      if (b.dataset.adel) { if (await confirm('¿Eliminar esta asamblea?', { danger: true, ok: 'Eliminar' })) { db.remove('assemblies', b.dataset.adel); toast('Asamblea eliminada', 'success'); ctx.refresh(); } }
    });
    return;
  }
  const dform = d => editForm({ title: d ? 'Editar documento' : 'Nuevo documento', values: d || { category: 'otro', visible: true }, fields: [
    { name: 'title', label: 'Título', required: true, full: true }, { name: 'category', label: 'Categoría', type: 'select', options: Object.entries(DOC_CATS) },
    { name: 'visible', label: 'Visible para residentes', type: 'checkbox' }, { name: 'content', label: 'Contenido', type: 'textarea', full: true, required: true }] });
  const tbl = crudTable(body, {
    rows: () => db.all('documents').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), search: d => `${d.title} ${d.content}`,
    filters: [{ key: 'category', label: 'Categoría', options: Object.entries(DOC_CATS) }],
    columns: [
      { key: 'title', label: 'Documento', render: d => `<b>${escape(d.title)}</b><br><span class="muted small">${escape(d.size)}</span>` }, { key: 'category', label: 'Categoría', render: d => escape(DOC_CATS[d.category] || d.category) },
      { key: 'visible', label: 'Residentes', render: d => d.visible ? '<span class="badge badge-success">Visible</span>' : '<span class="badge">Oculto</span>' },
      { key: 'createdAt', label: 'Fecha', render: d => `<span class="small">${date(d.createdAt)}</span>` },
      { key: 'id', label: '', sort: false, render: d => `<div class="actions"><button class="btn btn-sm btn-ghost" data-dedit="${d.id}">✎</button><button class="btn btn-sm btn-ghost" data-ddel="${d.id}">🗑</button></div>` }
    ],
    onRow: d => openDoc(db.get('documents', d.id)),
    csv: { name: 'documentos.csv', map: d => ({ titulo: d.title, categoria: d.category, visible: d.visible ? 'sí' : 'no', fecha: d.createdAt }) }
  });
  el.querySelector('[data-new]').onclick = async () => { const r = await dform(); if (r) { db.insert('documents', { ...r, size: `${Math.max(4, Math.round(r.content.length / 40))} KB` }); db.log('documento', `${user.name} subió «${r.title}»`, user.id); toast('Documento publicado', 'success'); tbl.refresh(); } };
  body.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.dedit) { const d = db.get('documents', b.dataset.dedit), r = await dform(d); if (r) { db.update('documents', d.id, r); toast('Documento actualizado', 'success'); tbl.refresh(); } }
    if (b.dataset.ddel) { const d = db.get('documents', b.dataset.ddel); if (await confirm(`¿Eliminar «${d.title}»?`, { danger: true, ok: 'Eliminar' })) { db.remove('documents', d.id); db.log('documento', `${user.name} eliminó «${d.title}»`, user.id); toast('Documento eliminado', 'success'); tbl.refresh(); } }
  });
}
