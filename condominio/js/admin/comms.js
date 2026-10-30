// Avisos (CRUD, destacar, publicar en sitio) y votaciones (crear, abrir, cerrar, resultados ponderados).
import { escape, toast, confirm, date, ago } from '../../../assets/core/ui.js';
import { notify } from '../data/db.js';
import { POLLSTATUS, badge } from '../shared/format.js';
import { pageHead, crudTable, editForm } from '../shared/kit.js';
import { resultsHTML } from '../resident/board.js';

const ACATS = ['Comunidad', 'Mantención', 'Servicios', 'Áreas comunes', 'Asambleas', 'Convivencia', 'Gastos comunes', 'Seguridad'];

export function renderComms(el, p, query, ctx) {
  const { db, user } = ctx;
  const tab = query.tab === 'votaciones' ? 'votaciones' : 'avisos';
  el.innerHTML = `${pageHead('Avisos y votaciones', 'Comunicación con los residentes', `<button class="btn btn-primary" data-new>+ ${tab === 'avisos' ? 'Nuevo aviso' : 'Nueva votación'}</button>`)}
    <div class="tabs"><a class="tab ${tab === 'avisos' ? 'active' : ''}" href="#/comunicaciones">Avisos</a><a class="tab ${tab === 'votaciones' ? 'active' : ''}" href="#/comunicaciones?tab=votaciones">Votaciones</a></div><div data-body></div>`;
  const body = el.querySelector('[data-body]');
  if (tab === 'avisos') {
    const form = a => editForm({ title: a ? 'Editar aviso' : 'Nuevo aviso', values: a || { category: 'Comunidad', published: true, notify: true }, fields: [
      { name: 'title', label: 'Título', required: true, full: true }, { name: 'category', label: 'Categoría', type: 'select', options: ACATS },
      { name: 'body', label: 'Mensaje', type: 'textarea', full: true, required: true }, { name: 'published', label: 'Publicado en la app de residentes', type: 'checkbox' },
      { name: 'pinned', label: 'Destacado (fijado arriba)', type: 'checkbox' }, { name: 'public', label: 'Mostrar también en el sitio público', type: 'checkbox' },
      ...(a ? [] : [{ name: 'notify', label: 'Enviar notificación a todos los residentes', type: 'checkbox' }])] });
    const tbl = crudTable(body, {
      rows: () => db.all('announcements').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), search: a => `${a.title} ${a.body}`,
      filters: [{ key: 'category', label: 'Categoría', options: ACATS }, { key: 'published', label: 'Estado', options: [['true', 'Publicado'], ['false', 'Borrador']] }],
      columns: [
        { key: 'title', label: 'Aviso', render: a => `<b>${escape(a.title)}</b>${a.pinned ? ' 📌' : ''}<br><span class="muted small">${escape(a.body.slice(0, 90))}${a.body.length > 90 ? '…' : ''}</span>` },
        { key: 'category', label: 'Categoría' },
        { key: 'published', label: 'Estado', render: a => `<span class="badge ${a.published ? 'badge-success' : 'badge-warning'}">${a.published ? 'Publicado' : 'Borrador'}</span>${a.public ? ' <span class="badge plain">Sitio</span>' : ''}` },
        { key: 'createdAt', label: 'Fecha', render: a => `<span class="small">${date(a.createdAt)}</span>` },
        { key: 'id', label: '', sort: false, render: a => `<div class="actions">${a.published ? '' : `<button class="btn btn-sm btn-primary" data-pub="${a.id}">Publicar</button>`}<button class="btn btn-sm btn-ghost" data-edit="${a.id}">✎</button><button class="btn btn-sm btn-ghost" data-del="${a.id}">🗑</button></div>` }
      ],
      csv: { name: 'avisos.csv', map: a => ({ titulo: a.title, categoria: a.category, publicado: a.published ? 'sí' : 'no', fecha: a.createdAt }) }
    });
    el.querySelector('[data-new]').onclick = async () => {
      const r = await form(); if (!r) return;
      const { notify: n, ...data } = r;
      db.insert('announcements', { ...data, author: user.name });
      if (n && data.published) notify('*', `Nuevo aviso: ${data.title}`, '#/avisos');
      db.log('aviso', `${user.name} ${data.published ? 'publicó' : 'guardó'} el aviso «${data.title}»`, user.id); toast(data.published ? 'Aviso publicado' : 'Borrador guardado', 'success'); tbl.refresh();
    };
    body.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pub) { const a = db.get('announcements', b.dataset.pub); db.update('announcements', a.id, { published: true, createdAt: new Date().toISOString() }); notify('*', `Nuevo aviso: ${a.title}`, '#/avisos'); db.log('aviso', `${user.name} publicó «${a.title}»`, user.id); toast('Aviso publicado', 'success'); tbl.refresh(); }
      if (b.dataset.edit) { const a = db.get('announcements', b.dataset.edit), r = await form(a); if (r) { db.update('announcements', a.id, r); db.log('aviso', `${user.name} editó «${r.title}»`, user.id); toast('Aviso actualizado', 'success'); tbl.refresh(); } }
      if (b.dataset.del) { const a = db.get('announcements', b.dataset.del); if (await confirm(`¿Eliminar «${a.title}»?`, { danger: true, ok: 'Eliminar' })) { db.remove('announcements', a.id); toast('Aviso eliminado', 'success'); tbl.refresh(); } }
    });
    return;
  }
  const polls = db.all('polls').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  body.innerHTML = `<div class="stack">${polls.map(po => `<div class="card stack"><div class="row between"><div><h3 style="margin:0">${escape(po.title)}</h3><span class="muted small">${escape(po.description)}</span></div><span class="row" style="gap:6px">${badge(POLLSTATUS, po.status)}<span class="muted small">${po.status === 'cerrada' ? 'Cerró' : 'Cierra'} ${date(po.closesAt)}</span></span></div>
      ${po.status === 'borrador' ? `<ol class="small" style="margin:0">${po.options.map(o => `<li>${escape(o)}</li>`).join('')}</ol>` : resultsHTML(po, db)}
      <div class="row" style="gap:6px">${po.status === 'borrador' ? `<button class="btn btn-sm btn-primary" data-open="${po.id}">Abrir votación</button><button class="btn btn-sm" data-pedit="${po.id}">✎ Editar</button>` : ''}${po.status === 'abierta' ? `<button class="btn btn-sm" data-close="${po.id}">Cerrar votación</button>` : ''}<button class="btn btn-sm btn-ghost" data-pdel="${po.id}">🗑 Eliminar</button></div></div>`).join('') || '<div class="card empty">Sin votaciones.</div>'}</div>`;
  const pform = po => editForm({ title: po ? 'Editar votación' : 'Nueva votación', values: po ? { ...po, options: po.options.join('\n'), closesAt: po.closesAt.slice(0, 10) } : { closesAt: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10) }, fields: [
    { name: 'title', label: 'Pregunta / título', required: true, full: true }, { name: 'description', label: 'Descripción', type: 'textarea', full: true },
    { name: 'options', label: 'Opciones (una por línea)', type: 'textarea', full: true, required: true, placeholder: 'Aprobar\nRechazar\nAbstención' },
    { name: 'closesAt', label: 'Fecha de cierre', type: 'date', required: true }, { name: 'assemblyId', label: 'Asamblea asociada', type: 'select', options: [['', '—'], ...db.all('assemblies').map(a => [a.id, a.title])] }] });
  const clean = r => { const options = r.options.split('\n').map(s => s.trim()).filter(Boolean); if (options.length < 2) { toast('Ingresa al menos 2 opciones', 'warning'); return null; } return { ...r, options, closesAt: new Date(r.closesAt + 'T20:00').toISOString() }; };
  el.querySelector('[data-new]').onclick = async () => { const r = await pform(); const d = r && clean(r); if (d) { db.insert('polls', { ...d, status: 'borrador', votes: [] }); db.log('votación', `${user.name} creó la votación «${d.title}»`, user.id); toast('Votación creada en borrador', 'success'); ctx.refresh(); } };
  body.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.open) { const po = db.get('polls', b.dataset.open); db.update('polls', po.id, { status: 'abierta' }); notify('*', `Nueva votación abierta: ${po.title}`, '#/votaciones'); db.log('votación', `${user.name} abrió «${po.title}»`, user.id); toast('Votación abierta y residentes notificados', 'success'); ctx.refresh(); }
    if (b.dataset.close) { const po = db.get('polls', b.dataset.close); if (await confirm(`¿Cerrar «${po.title}»? No se aceptarán más votos.`, { ok: 'Cerrar votación' })) { db.update('polls', po.id, { status: 'cerrada', closesAt: new Date().toISOString() }); notify('*', `Resultados disponibles: ${po.title}`, '#/votaciones'); db.log('votación', `${user.name} cerró «${po.title}»`, user.id); toast('Votación cerrada', 'success'); ctx.refresh(); } }
    if (b.dataset.pedit) { const po = db.get('polls', b.dataset.pedit), r = await pform(po), d = r && clean(r); if (d) { db.update('polls', po.id, d); toast('Votación actualizada', 'success'); ctx.refresh(); } }
    if (b.dataset.pdel) { const po = db.get('polls', b.dataset.pdel); if (await confirm(`¿Eliminar «${po.title}» y sus ${po.votes.length} votos?`, { danger: true, ok: 'Eliminar' })) { db.remove('polls', po.id); toast('Votación eliminada', 'success'); ctx.refresh(); } }
  });
}
export { ago };
