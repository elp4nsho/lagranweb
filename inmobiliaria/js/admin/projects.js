// Proyectos nuevos: CRUD, publicación y tipologías.
import { escape, confirm, toast, money } from '../../../assets/core/ui.js';
import { uf } from '../data/db.js';
import { COMUNAS, comunaName, comunaById } from '../shared/geo.js';
import { fmtUF } from '../shared/format.js';
import { pageHead, crudTable, editForm } from '../shared/kit.js';

const STAGES = [['en verde', 'En verde'], ['en blanco', 'En blanco'], ['entrega inmediata', 'Entrega inmediata']];

export function renderProjects(el, { sub }, q, ctx) {
  const { db, user } = ctx;
  if (sub) return detail(el, sub, ctx);
  el.innerHTML = `${pageHead('Proyectos nuevos', 'Desarrollos inmobiliarios que se muestran en la sección Proyectos del sitio', '<button class="btn btn-primary" data-new>+ Nuevo proyecto</button>')}<div data-t></div>`;
  crudTable(el.querySelector('[data-t]'), {
    rows: () => db.all('projects'), search: p => `${p.name} ${p.developer} ${comunaName(p.comuna)}`,
    filters: [{ key: 'stage', label: 'Etapa', options: STAGES }, { key: 'comuna', label: 'Comuna', options: COMUNAS.map(c => [c.id, c.name]) }],
    columns: [
      { key: 'name', label: 'Proyecto', render: p => `<b>${escape(p.name)}</b><br><span class="muted small">${escape(p.developer)}</span>` },
      { key: 'comuna', label: 'Comuna', render: p => escape(comunaName(p.comuna)) },
      { key: 'stage', label: 'Etapa', render: p => `<span class="badge badge-info stage">${escape(p.stage)}</span>` },
      { key: 'fromUF', label: 'Desde', render: p => fmtUF(p.fromUF) },
      { key: 'units', label: 'Stock', render: p => `${p.typologies.reduce((s, t) => s + (+t.stock || 0), 0)} / ${p.units}` },
      { key: 'published', label: 'Sitio', render: p => `<label class="switch" title="Publicado"><input type="checkbox" data-pub="${p.id}" ${p.published ? 'checked' : ''}><span></span></label>` },
      { key: 'id', label: '', sort: false, render: p => `<div class="actions"><button class="btn btn-sm btn-ghost" data-edit="${p.id}" aria-label="Editar">✎</button><button class="btn btn-sm btn-ghost" data-del="${p.id}" aria-label="Eliminar">🗑</button></div>` }
    ],
    onRow: p => ctx.go('/proyectos/' + p.id),
    csv: { name: 'proyectos.csv', map: p => ({ nombre: p.name, inmobiliaria: p.developer, comuna: comunaName(p.comuna), etapa: p.stage, desde_uf: p.fromUF, unidades: p.units, publicado: p.published ? 'sí' : 'no' }) }
  });
  el.querySelector('[data-new]').onclick = async () => { const r = await form(null, ctx); if (r) ctx.go('/proyectos/' + r.id); };
  el.addEventListener('change', e => { const s = e.target.closest('[data-pub]'); if (s) { db.update('projects', s.dataset.pub, { published: s.checked }); db.log('proyecto', `${user.name} ${s.checked ? 'publicó' : 'ocultó'} ${db.get('projects', s.dataset.pub).name}`, user.id); toast(s.checked ? 'Proyecto visible en el sitio' : 'Proyecto oculto', 'success'); } });
  el.addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]'); if (ed) { if (await form(db.get('projects', ed.dataset.edit), ctx)) ctx.refresh(); return; }
    const d = e.target.closest('[data-del]');
    if (d && await confirm('¿Eliminar este proyecto?', { danger: true, ok: 'Eliminar' })) { const p = db.get('projects', d.dataset.del); db.remove('projects', p.id); db.log('proyecto', `${user.name} eliminó ${p.name}`, user.id); toast('Proyecto eliminado', 'success'); ctx.refresh(); }
  });
}

async function form(p, { db, user }) {
  const r = await editForm({ title: p ? 'Editar proyecto' : 'Nuevo proyecto', values: p ? { ...p, amenities: p.amenities.join(', ') } : { stage: 'en blanco', comuna: 'nunoa', published: false, units: 100 }, fields: [
    { name: 'name', label: 'Nombre', required: true }, { name: 'developer', label: 'Inmobiliaria', required: true },
    { name: 'comuna', label: 'Comuna', type: 'select', options: COMUNAS.map(c => [c.id, c.name]) }, { name: 'address', label: 'Dirección', required: true },
    { name: 'stage', label: 'Etapa', type: 'select', options: STAGES }, { name: 'delivery', label: 'Entrega', placeholder: '2do semestre 2027' },
    { name: 'units', label: 'Unidades totales', type: 'number', min: 1 }, { name: 'amenities', label: 'Equipamiento (separado por comas)' },
    { name: 'description', label: 'Descripción', type: 'textarea', full: true },
    { name: 'published', label: 'Publicado en el sitio', type: 'checkbox' }, { name: 'featured', label: 'Destacado en portada', type: 'checkbox' }
  ] });
  if (!r) return null;
  r.amenities = r.amenities.split(',').map(s => s.trim()).filter(Boolean);
  if (p) { db.update('projects', p.id, r); db.log('proyecto', `${user.name} editó ${r.name}`, user.id); toast('Proyecto guardado', 'success'); return p; }
  const c = comunaById(r.comuna);
  const row = db.insert('projects', { ...r, typologies: [{ name: 'Tipo A · 2D2B', dorms: 2, baths: 2, m2: 58, fromUF: Math.round(58 * c.uf / 10) * 10, stock: 10 }], fromUF: Math.round(58 * c.uf / 10) * 10, art: db.count('projects') % 6, x: c.x, y: c.y });
  db.log('proyecto', `${user.name} creó ${r.name}`, user.id); toast('Proyecto creado', 'success');
  return row;
}

function detail(el, id, ctx) {
  const { db, user } = ctx, U = uf(), p = db.get('projects', id);
  if (!p) { el.innerHTML = '<div class="card empty">Proyecto no encontrado.</div>'; return; }
  const leads = db.query('leads', l => l.projectId === p.id);
  el.innerHTML = `${pageHead(p.name, `${escape(p.developer)} · ${escape(comunaName(p.comuna))} · ${escape(p.stage)}`, `<a class="btn btn-ghost" href="#/proyectos">← Volver</a><a class="btn" target="_blank" rel="noopener" href="index.html#/proyecto/${p.id}">Ver en sitio ↗</a><button class="btn" data-edit>✎ Editar</button>`)}
    <div class="card"><div class="row between"><h3 style="margin:0">Tipologías</h3><button class="btn btn-sm btn-primary" data-add>+ Tipología</button></div>
      <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Nombre</th><th>Dorm.</th><th>Baños</th><th>m²</th><th>Desde UF</th><th>CLP aprox.</th><th>Stock</th><th></th></tr></thead><tbody>
      ${p.typologies.map((t, i) => `<tr><td>${escape(t.name)}</td><td>${t.dorms}</td><td>${t.baths}</td><td>${t.m2}</td><td>${fmtUF(t.fromUF)}</td><td>${money(t.fromUF * U)}</td><td>${t.stock}</td><td class="actions"><button class="btn btn-sm btn-ghost" data-tedit="${i}">✎</button><button class="btn btn-sm btn-ghost" data-tdel="${i}">🗑</button></td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h3>Cotizaciones recibidas (${leads.length})</h3>${leads.length ? leads.map(l => `<div class="list-row small"><span><b>${escape(l.name)}</b> · ${escape(l.email)} · ${escape(l.message)}</span><span class="muted">${new Date(l.createdAt).toLocaleDateString('es-CL')}</span></div>`).join('') : '<p class="muted">Aún no hay cotizaciones.</p>'}</div>`;
  const save = typologies => { db.update('projects', p.id, { typologies, fromUF: Math.min(...typologies.map(t => t.fromUF)) }); db.log('proyecto', `${user.name} actualizó tipologías de ${p.name}`, user.id); toast('Tipologías guardadas', 'success'); ctx.refresh(); };
  const tform = async (t = {}) => editForm({ title: t.name ? 'Editar tipología' : 'Nueva tipología', size: '', values: t, fields: [
    { name: 'name', label: 'Nombre', required: true, full: true }, { name: 'dorms', label: 'Dormitorios', type: 'number', min: 0, required: true }, { name: 'baths', label: 'Baños', type: 'number', min: 1, required: true },
    { name: 'm2', label: 'm²', type: 'number', min: 1, required: true }, { name: 'fromUF', label: 'Precio desde (UF)', type: 'number', min: 1, required: true }, { name: 'stock', label: 'Stock', type: 'number', min: 0, required: true }] });
  el.querySelector('[data-edit]').onclick = async () => { if (await form(p, ctx)) ctx.refresh(); };
  el.querySelector('[data-add]').onclick = async () => { const t = await tform(); if (t) save([...p.typologies, t]); };
  el.querySelectorAll('[data-tedit]').forEach(b => b.onclick = async () => { const t = await tform(p.typologies[+b.dataset.tedit]); if (t) save(p.typologies.map((x, i) => i === +b.dataset.tedit ? t : x)); });
  el.querySelectorAll('[data-tdel]').forEach(b => b.onclick = async () => { if (p.typologies.length < 2) return toast('El proyecto necesita al menos una tipología', 'warning'); if (await confirm('¿Eliminar tipología?', { danger: true, ok: 'Eliminar' })) save(p.typologies.filter((x, i) => i !== +b.dataset.tdel)); });
}
