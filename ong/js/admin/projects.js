// Proyectos y beneficiarios: presupuesto vs. ejecutado (desde gastos), campañas asociadas y estado.
import { db, campaignStats } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { CATEGORIES } from '../data/seed.js';
import { escape, money, num, date, toast, confirm, formModal } from '../../../assets/core/ui.js';

const PST = { 'Planificación': 'warning', 'En ejecución': 'success', 'Finalizado': 'info', 'Suspendido': 'danger' };
const spentOf = p => db.query('expenses', x => x.projectId === p.id && x.status === 'aprobado').reduce((s, x) => s + x.amount, 0);

async function edit(p, ctx) {
  const v = await formModal({ title: p ? `Editar ${p.name}` : 'Nuevo proyecto', size: 'lg', fields: [
    { name: 'name', label: 'Nombre', value: p?.name || '', required: true },
    { name: 'community', label: 'Comunidad / beneficiarios', value: p?.community || '', required: true },
    { name: 'region', label: 'Región', value: p?.region || '' },
    { name: 'type', label: 'Área', type: 'select', value: p?.type || CATEGORIES[0], options: CATEGORIES },
    { name: 'beneficiaries', label: 'Personas beneficiadas', type: 'number', value: p?.beneficiaries || 0 },
    { name: 'families', label: 'Familias', type: 'number', value: p?.families || 0 },
    { name: 'budget', label: 'Presupuesto (CLP)', type: 'number', value: p?.budget || 0 },
    { name: 'status', label: 'Estado', type: 'select', value: p?.status || 'Planificación', options: Object.keys(PST) },
    { name: 'lead', label: 'Responsable', value: p?.lead || ctx.user.name },
    { name: 'startDate', label: 'Inicio', type: 'date', value: p?.startDate || new Date().toISOString().slice(0, 10) },
    { name: 'summary', label: 'Descripción', type: 'textarea', value: p?.summary || '' }
  ] });
  if (!v) return;
  if (p) db.update('projects', p.id, v); else db.insert('projects', v);
  db.log(p ? 'Proyecto editado' : 'Proyecto creado', v.name, ctx.user.id); toast('Proyecto guardado', 'success');
}

export default {
  id: 'proyectos', label: 'Proyectos', ico: '🏡', group: 'Programas', roles: ['admin', 'coordinador', 'contador'],
  render(view, ctx) {
    const rows = db.all('projects').map(p => ({ ...p, spent: spentOf(p), campaigns: db.query('campaigns', c => c.projectId === p.id) }));
    const canEdit = ctx.role !== 'contador';
    view.innerHTML = `${pageHead('Proyectos y beneficiarios', 'La ejecución se calcula a partir de los gastos aprobados.', canEdit ? '<button class="btn btn-primary" data-new>＋ Nuevo proyecto</button>' : '')}
      <div class="kpis">
        ${kpi('Personas beneficiadas', num(rows.reduce((s, p) => s + (p.beneficiaries || 0), 0)), { ico: '👨‍👩‍👧' })}
        ${kpi('Familias', num(rows.reduce((s, p) => s + (p.families || 0), 0)), { ico: '🏡' })}
        ${kpi('Presupuesto total', money(rows.reduce((s, p) => s + p.budget, 0)), { ico: '📋' })}
        ${kpi('Ejecutado', money(rows.reduce((s, p) => s + p.spent, 0)), { ico: '✅' })}
      </div>
      <div class="grid-auto">${rows.map(p => { const pct = p.budget ? p.spent / p.budget * 100 : 0; return `<div class="card stack">
        <div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><div><b>${escape(p.name)}</b><br><span class="small muted">${escape(p.community)} · ${escape(p.region)}</span></div>${badge(p.status, PST[p.status])}</div>
        <p class="small" style="margin:0">${escape(p.summary)}</p>
        <div><div class="row between small"><span>Ejecutado ${money(p.spent)}</span><b>${Math.round(pct)}%</b></div><div class="progress"><i style="--v:${Math.min(100, pct)}%"></i></div><span class="small muted">Presupuesto ${money(p.budget)}</span></div>
        <dl class="kv small"><dt>Beneficiarios</dt><dd>${num(p.beneficiaries)}${p.families ? ` (${p.families} familias)` : ''}</dd><dt>Responsable</dt><dd>${escape(p.lead)}</dd><dt>Desde</dt><dd>${escape(date(p.startDate + 'T12:00'))}</dd>
          <dt>Campañas</dt><dd>${p.campaigns.map(c => `<a href="#/campanas/${c.id}">${escape(c.title)}</a> (${money(campaignStats(c).raised)})`).join(', ') || '—'}</dd></dl>
        ${canEdit ? `<div class="row" style="gap:6px"><button class="btn btn-sm" data-edit="${p.id}">Editar</button>${ctx.role === 'admin' ? `<button class="btn btn-sm btn-ghost" data-del="${p.id}">Eliminar</button>` : ''}</div>` : ''}
      </div>`; }).join('')}</div>
      <div class="card" id="tbl"></div>`;
    table(view.querySelector('#tbl'), {
      id: 'projects', rows, search: p => `${p.name} ${p.community} ${p.region}`,
      filters: [{ key: 'status', label: 'Estado', options: Object.keys(PST).map(s => [s, s]) }, { key: 'type', label: 'Área', options: CATEGORIES.map(c => [c, c]) }],
      columns: [{ key: 'name', label: 'Proyecto' }, { key: 'type', label: 'Área' }, { key: 'beneficiaries', label: 'Beneficiarios', render: p => num(p.beneficiaries) }, { key: 'budget', label: 'Presupuesto', render: p => money(p.budget) }, { key: 'spent', label: 'Ejecutado', render: p => money(p.spent) }, { key: 'status', label: 'Estado', render: p => badge(p.status, PST[p.status]) }],
      csv: { name: 'proyectos.csv', map: p => ({ proyecto: p.name, comunidad: p.community, region: p.region, area: p.type, beneficiarios: p.beneficiaries, familias: p.families, presupuesto: p.budget, ejecutado: p.spent, estado: p.status }) }
    });
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-new]')) edit(null, ctx);
      if (t.dataset.edit) edit(db.get('projects', t.dataset.edit), ctx);
      if (t.dataset.del) { const p = db.get('projects', t.dataset.del); if (await confirm(`¿Eliminar «${p.name}»?`, { danger: true, ok: 'Eliminar' })) { db.remove('projects', p.id); db.log('Proyecto eliminado', p.name, ctx.user.id); toast('Proyecto eliminado', 'success'); } }
    };
  }
};
