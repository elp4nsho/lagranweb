// Propiedades: CRUD, flujo de aprobación (borrador → revisión → publicada → reservada → vendida/arrendada) y ficha interna.
import { escape, confirm, toast, money, date, dateTime, num } from '../../../assets/core/ui.js';
import { uf } from '../data/db.js';
import { COMUNAS, comunaName } from '../shared/geo.js';
import { OPS, TYPES, PSTATUS, LSTATUS, VSTATUS, badge, mainPrice, altPrice, ufM2, fmtUF, specs } from '../shared/format.js';
import { propertyArt, floorPlan } from '../shared/art.js';
import { pageHead, crudTable, timeline } from '../shared/kit.js';
import { propertyForm, wfButtons, runTransition, flowPills, transitionsFor } from '../shared/propform.js';

const firstWf = (p, role) => { const t = transitionsFor(p, role)[0]; return t ? `<button class="btn btn-sm ${t.tone ? 'btn-' + t.tone : ''}" data-wf="${t.to}" data-pid="${p.id}">${escape(t.short || t.label)}</button>` : ''; };

export function renderProperties(el, { sub }, query, ctx) {
  if (sub) return detail(el, sub, ctx);
  const { db, user } = ctx;
  const U = uf();
  const status = query.status || '';
  const all = db.all('properties');
  el.innerHTML = `${pageHead('Propiedades', `${all.length} fichas · ${all.filter(p => p.status === 'revision').length} esperando aprobación`, '<button class="btn btn-primary" data-new>+ Nueva propiedad</button>')}
    <div class="row" style="gap:6px">${[['', 'Todas'], ...Object.entries(PSTATUS).map(([k, v]) => [k, v[0]])].map(([k, l]) => `<a class="chip ${status === k ? 'active' : ''}" href="#/propiedades${k ? '?status=' + k : ''}">${l} <b>${k ? all.filter(p => p.status === k).length : all.length}</b></a>`).join('')}</div>
    <div data-table></div>`;
  const agents = db.all('agents');
  crudTable(el.querySelector('[data-table]'), {
    rows: () => db.query('properties', p => !status || p.status === status),
    search: p => `${p.code} ${p.title} ${p.address} ${comunaName(p.comuna)}`,
    filters: [
      { key: 'op', label: 'Operación', options: Object.entries(OPS) },
      { key: 'type', label: 'Tipo', options: Object.entries(TYPES) },
      { key: 'comuna', label: 'Comuna', options: COMUNAS.map(c => [c.id, c.name]) },
      { key: 'agentId', label: 'Corredor', options: agents.map(a => [a.id, a.name]) }
    ],
    columns: [
      { key: 'title', label: 'Propiedad', render: p => `<div class="cell-prop"><span class="th">${propertyArt(p, 'fachada', { label: false })}</span><div><b>${escape(p.title)}</b><span class="muted small">${escape(p.code)} · ${escape(comunaName(p.comuna))}</span></div></div>` },
      { key: 'price', label: 'Precio', render: p => `<span class="nowrap"><b>${mainPrice(p)}</b></span><br><span class="muted small nowrap">${altPrice(p, U)}</span>` },
      { key: 'm2', label: 'm²', render: p => num(p.m2) },
      { key: 'status', label: 'Estado', render: p => badge(PSTATUS, p.status) },
      { key: 'agentId', label: 'Corredor', render: p => escape(agents.find(a => a.id === p.agentId)?.name || '—') },
      { key: 'views', label: 'Visitas', render: p => num(p.views) },
      { key: 'statusAt', label: 'Actualizada', render: p => `<span class="nowrap small">${date(p.statusAt || p.createdAt)}</span>` },
      { key: 'id', label: 'Acciones', sort: false, render: p => `<div class="actions">${firstWf(p, user.role)}<button class="btn btn-sm btn-ghost" data-edit="${p.id}" aria-label="Editar">✎</button>${user.role === 'admin' ? `<button class="btn btn-sm btn-ghost" data-del="${p.id}" aria-label="Eliminar">🗑</button>` : ''}</div>` }
    ],
    onRow: p => ctx.go('/propiedades/' + p.id),
    csv: { name: 'propiedades.csv', map: p => ({ codigo: p.code, titulo: p.title, operacion: p.op, tipo: p.type, comuna: comunaName(p.comuna), precio: p.price, moneda: p.currency, m2: p.m2, dormitorios: p.dorms, banos: p.baths, estado: p.status, corredor: agents.find(a => a.id === p.agentId)?.name || '', visitas: p.views }) }
  });
  el.querySelector('[data-new]').onclick = async () => { const r = await propertyForm(); if (r) ctx.go('/propiedades/' + r.id); };
  if (query.new) { history.replaceState(null, '', '#/propiedades'); el.querySelector('[data-new]').click(); }
  el.addEventListener('click', async e => {
    const w = e.target.closest('[data-wf]');
    if (w) { e.stopPropagation(); if (await runTransition(db.get('properties', w.dataset.pid), w.dataset.wf)) ctx.refresh(); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) { if (await propertyForm(db.get('properties', ed.dataset.edit))) ctx.refresh(); return; }
    const d = e.target.closest('[data-del]');
    if (d) {
      const p = db.get('properties', d.dataset.del);
      if (await confirm(`¿Eliminar ${p.code} «${p.title}»? Esta acción no se puede deshacer.`, { title: 'Eliminar propiedad', ok: 'Eliminar', danger: true })) {
        db.remove('properties', p.id); db.log('propiedad', `${user.name} eliminó ${p.code}`, user.id); toast('Propiedad eliminada', 'success'); ctx.refresh();
      }
    }
  });
}

function detail(el, id, ctx) {
  const { db, user } = ctx, U = uf();
  const p = db.get('properties', id);
  if (!p) { el.innerHTML = '<div class="card empty">Propiedad no encontrada. <a href="#/propiedades">Volver</a></div>'; return; }
  const agent = db.get('agents', p.agentId), owner = db.get('owners', p.ownerId);
  const leads = db.query('leads', l => l.propertyId === p.id), visits = db.query('visits', v => v.propertyId === p.id);
  const contract = db.find('contracts', c => c.propertyId === p.id && c.status === 'vigente');
  const s = db.getValue('settings', {});
  el.innerHTML = `${pageHead(p.title, `${escape(p.code)} · ${escape(p.address)}, ${escape(comunaName(p.comuna))}`, `<a class="btn btn-ghost" href="#/propiedades">← Volver</a><a class="btn" href="index.html#/propiedad/${p.id}" target="_blank" rel="noopener">Ver en sitio ↗</a><button class="btn" data-edit="${p.id}">✎ Editar</button>`)}
    <div class="card stack" style="gap:12px"><div class="row between"><div class="row" style="gap:10px">${badge(PSTATUS, p.status)}${flowPills(p)}</div><div class="row" style="gap:6px">${wfButtons(p, user.role) || '<span class="muted small">Sin acciones disponibles para tu rol</span>'}</div></div>
      ${p.status === 'publicada' ? `<label class="check"><input type="checkbox" data-feat ${(s.featuredIds || []).includes(p.id) ? 'checked' : ''}> Destacar en la portada del sitio</label>` : ''}</div>
    <div class="split">
      <div class="stack">
        <div class="grid-2"><div style="border-radius:var(--radius);overflow:hidden;aspect-ratio:16/10">${propertyArt(p, 'fachada')}</div><div class="plan-box">${floorPlan(p)}</div></div>
        <div class="card"><div class="spec-grid">${[['Operación', OPS[p.op]], ['Tipo', TYPES[p.type]], ['Precio', mainPrice(p)], ['Equivalente', altPrice(p, U)], ['Superficie', `${p.m2} / ${p.m2Total} m²`], ['UF/m²', fmtUF(ufM2(p, U), true)], ['Programa', specs(p)], ['Estac. / bodega', `${p.parking} / ${p.storage}`], ['Gastos comunes', p.expenses ? money(p.expenses) : '—'], ['Visitas a la ficha', num(p.views)]].map(([k, v]) => `<div class="spec"><small>${k}</small><b>${escape(v)}</b></div>`).join('')}</div>
          <p style="margin-top:14px">${escape(p.description)}</p><div class="feature-list">${p.features.map(f => `<span class="chip">${escape(f)}</span>`).join('')}</div></div>
        <div class="card"><h3>Leads (${leads.length})</h3>${leads.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Origen</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>${leads.slice(0, 8).map(l => `<tr><td>${escape(l.name)}<br><span class="muted small">${escape(l.email)}</span></td><td>${escape(l.source)}</td><td>${badge(LSTATUS, l.status)}</td><td class="nowrap small">${date(l.createdAt)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin leads aún.</p>'}</div>
        <div class="card"><h3>Visitas (${visits.length})</h3>${visits.length ? visits.slice(0, 8).map(v => `<div class="list-row small"><span>${dateTime(v.date)} · ${escape(v.clientName)}</span>${badge(VSTATUS, v.status)}</div>`).join('') : '<p class="muted">Sin visitas.</p>'}</div>
      </div>
      <div class="stack">
        <div class="card"><h3>Corredor asignado</h3><select class="select" data-agent>${db.all('agents').map(a => `<option value="${a.id}" ${a.id === p.agentId ? 'selected' : ''}>${escape(a.name)}</option>`).join('')}</select><p class="muted small" style="margin:8px 0 0">${escape(agent?.email || '')} · ${escape(agent?.phone || '')}</p></div>
        <div class="card"><h3>Propietario</h3>${owner ? `<b>${escape(owner.name)}</b><div class="muted small">${escape(owner.rut || '')} · ${escape(owner.email)} · ${escape(owner.phone || '')}</div>${owner.notes ? `<p class="small" style="margin:8px 0 0">${escape(owner.notes)}</p>` : ''}` : '<p class="muted">Sin propietario.</p>'}</div>
        ${contract ? `<div class="card"><h3>Contrato vigente</h3><p class="small">${escape(contract.tenantName)} · desde ${date(contract.start)} · ${money(contract.rent)}/mes</p><a class="btn btn-sm" href="#/contratos/${contract.id}">Ver cobranza</a></div>` : ''}
        <div class="card"><h3>Historial de estados</h3>${timeline((p.history || []).slice().reverse().map(h => ({ title: escape(PSTATUS[h.to]?.[0] || h.to), meta: `${dateTime(h.at)} · ${escape(h.by || '')}`, body: h.note ? escape(h.note) : '' })))}</div>
      </div>
    </div>`;
  el.querySelector('[data-agent]').onchange = e => { db.update('properties', p.id, { agentId: e.target.value }); db.log('propiedad', `${p.code} reasignada a ${db.get('agents', e.target.value).name}`, user.id); toast('Corredor reasignado', 'success'); };
  el.querySelector('[data-feat]')?.addEventListener('change', e => {
    const ids = new Set(s.featuredIds || []); e.target.checked ? ids.add(p.id) : ids.delete(p.id);
    db.setValue('settings', { ...db.getValue('settings'), featuredIds: [...ids] }); db.log('cms', `${p.code} ${e.target.checked ? 'destacada' : 'quitada de destacadas'}`, user.id); toast('Portada actualizada', 'success');
  });
  el.querySelector('[data-edit]').onclick = async () => { if (await propertyForm(p)) ctx.refresh(); };
  el.querySelectorAll('[data-wf]').forEach(b => b.onclick = async () => { if (await runTransition(db.get('properties', p.id), b.dataset.wf)) ctx.refresh(); });
}
