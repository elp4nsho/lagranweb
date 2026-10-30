// Rendición de gastos: registro, aprobación y publicación. Los gastos aprobados y publicados alimentan /transparencia.
import { db, site } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { escape, money, date, toast, confirm, formModal, donutChart } from '../../../assets/core/ui.js';

const CATS = ['Programas', 'Operación', 'Recaudación'];
const XST = { aprobado: ['Aprobado', 'success'], pendiente: ['Pendiente', 'warning'], rechazado: ['Rechazado', 'danger'] };

async function edit(x, ctx) {
  const v = await formModal({ title: x ? 'Editar gasto' : 'Registrar gasto', fields: [
    { name: 'date', label: 'Fecha', type: 'date', value: x?.date || new Date().toISOString().slice(0, 10), required: true },
    { name: 'category', label: 'Categoría', type: 'select', value: x?.category || 'Programas', options: CATS },
    { name: 'projectId', label: 'Proyecto (si es de programa)', type: 'select', value: x?.projectId || '', options: [['', '—'], ...db.all('projects').map(p => [p.id, p.name])] },
    { name: 'description', label: 'Descripción', value: x?.description || '', required: true },
    { name: 'provider', label: 'Proveedor', value: x?.provider || '', required: true },
    { name: 'amount', label: 'Monto (CLP)', type: 'number', value: x?.amount || '', required: true },
    { name: 'published', label: 'Publicar en transparencia al aprobar', type: 'checkbox', value: x ? x.published : true }
  ] });
  if (!v) return;
  if (!(v.amount > 0)) return toast('Monto inválido', 'warning');
  if (v.category === 'Programas' && !v.projectId) return toast('Los gastos de programas deben indicar un proyecto', 'warning');
  if (x) db.update('expenses', x.id, v); else db.insert('expenses', { ...v, status: ctx.role === 'contador' || ctx.role === 'admin' ? 'aprobado' : 'pendiente' });
  db.log(x ? 'Gasto editado' : 'Gasto registrado', `${v.description} · ${money(v.amount)}`, ctx.user.id); toast('Gasto guardado', 'success');
}

export default {
  id: 'gastos', label: 'Gastos y transparencia', ico: '📑', group: 'Finanzas', roles: ['admin', 'contador'],
  count: () => db.count('expenses', x => x.status === 'pendiente'),
  render(view, ctx) {
    const rows = db.all('expenses');
    const year = rows.filter(x => x.status === 'aprobado' && Date.now() - new Date(x.date) < 365 * 864e5);
    const tot = year.reduce((s, x) => s + x.amount, 0) || 1;
    const byCat = CATS.map(c => ({ label: c, value: Math.round(year.filter(x => x.category === c).reduce((s, x) => s + x.amount, 0) / 1e6) }));
    const overhead = Math.round(year.filter(x => x.category !== 'Programas').reduce((s, x) => s + x.amount, 0) / tot * 100);
    const projects = Object.fromEntries(db.all('projects').map(p => [p.id, p.name]));
    view.innerHTML = `${pageHead('Gastos y transparencia', 'Solo los gastos <b>aprobados y publicados</b> aparecen en la página pública de transparencia.', '<a class="btn" href="index.html#/transparencia" target="_blank" rel="noopener">Ver página pública ↗</a><button class="btn btn-primary" data-new>＋ Registrar gasto</button>')}
      <div class="dash-grid">
        <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          ${kpi('Gasto 12 meses', money(tot), { ico: '💸' })}
          ${kpi('Gasto indirecto', overhead + '%', { ico: overhead <= site().overheadGoal ? '✅' : '⚠️', sub: `meta: menos de ${site().overheadGoal}%` })}
          ${kpi('Por aprobar', String(rows.filter(x => x.status === 'pendiente').length), { ico: '⏳' })}
          ${kpi('Sin publicar', String(rows.filter(x => x.status === 'aprobado' && !x.published).length), { ico: '🙈' })}
        </div>
        <div class="card"><div class="card-title"><h3>Distribución (MM$)</h3></div>${donutChart(byCat, { label: (100 - overhead) + '%' })}</div>
      </div>
      <div class="card" id="tbl"></div>`;
    table(view.querySelector('#tbl'), {
      id: 'expenses', rows, pageSize: 12, sort: { key: 'date', dir: -1 },
      search: x => `${x.description} ${x.provider} ${projects[x.projectId] || ''}`,
      filters: [
        { key: 'category', label: 'Categoría', options: CATS.map(c => [c, c]) },
        { key: 'status', label: 'Estado', options: Object.entries(XST).map(([k, v]) => [k, v[0]]) },
        { key: 'projectId', label: 'Proyecto', options: Object.entries(projects) },
        { key: 'published', label: 'Publicación', options: [['true', 'Publicado'], ['false', 'No publicado']], test: (x, v) => String(!!x.published) === v }
      ],
      columns: [
        { key: 'date', label: 'Fecha', render: x => escape(date(x.date + 'T12:00')) },
        { key: 'description', label: 'Descripción', render: x => `<b>${escape(x.description)}</b><br><small class="muted">${escape(x.provider)}${x.projectId ? ' · ' + escape(projects[x.projectId] || '') : ''}</small>` },
        { key: 'category', label: 'Categoría', render: x => `<span class="badge plain">${escape(x.category)}</span>` },
        { key: 'amount', label: 'Monto', render: x => `<b>${money(x.amount)}</b>` },
        { key: 'status', label: 'Estado', render: x => badge(...XST[x.status]) },
        { key: 'published', label: 'Público', render: x => `<label class="switch" title="Publicar en transparencia"><input type="checkbox" data-pub="${x.id}" ${x.published ? 'checked' : ''} ${x.status !== 'aprobado' ? 'disabled' : ''} aria-label="Publicado"><span></span></label>` },
        { key: 'act', label: '', sort: false, render: x => `<div class="t-actions">${x.status === 'pendiente' ? `<button class="btn btn-sm btn-primary" data-ok="${x.id}">Aprobar</button><button class="btn btn-sm btn-ghost" data-no="${x.id}">Rechazar</button>` : ''}<button class="btn btn-sm btn-ghost" data-edit="${x.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${x.id}" aria-label="Eliminar">✕</button></div>` }
      ],
      csv: { name: 'gastos.csv', map: x => ({ fecha: x.date, categoria: x.category, proyecto: projects[x.projectId] || '', descripcion: x.description, proveedor: x.provider, monto: x.amount, estado: x.status, publicado: x.published ? 'sí' : 'no' }) }
    });
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-new]')) edit(null, ctx);
      if (t.dataset.edit) edit(db.get('expenses', t.dataset.edit), ctx);
      if (t.dataset.ok) { const x = db.update('expenses', t.dataset.ok, { status: 'aprobado' }); db.log('Gasto aprobado', `${x.description} · ${money(x.amount)}`, ctx.user.id); toast('Gasto aprobado', 'success'); }
      if (t.dataset.no) { const x = db.update('expenses', t.dataset.no, { status: 'rechazado', published: false }); db.log('Gasto rechazado', x.description, ctx.user.id); toast('Gasto rechazado', 'warning'); }
      if (t.dataset.del) { const x = db.get('expenses', t.dataset.del); if (await confirm(`¿Eliminar «${x.description}»?`, { danger: true, ok: 'Eliminar' })) { db.remove('expenses', x.id); db.log('Gasto eliminado', x.description, ctx.user.id); toast('Gasto eliminado', 'success'); } }
    };
    view.onchange = e => { const id = e.target.dataset.pub; if (!id) return; const x = db.update('expenses', id, { published: e.target.checked }); db.log('Transparencia', `${x.description}: ${x.published ? 'publicado' : 'oculto'}`, ctx.user.id); toast(x.published ? 'Publicado en transparencia' : 'Oculto de transparencia', 'success'); };
  }
};
