// Mis propiedades (corredor): captar, editar, enviar a revisión, reservar y cerrar.
import { escape, num, date } from '../../../assets/core/ui.js';
import { uf } from '../data/db.js';
import { PSTATUS, badge, mainPrice, altPrice, comunaName } from '../shared/format.js';
import { propertyArt } from '../shared/art.js';
import { pageHead, crudTable, timeline } from '../shared/kit.js';
import { propertyForm, wfButtons, runTransition, flowPills } from '../shared/propform.js';

export function renderListings(el, { sub }, ctx, { agent }) {
  const { db, user } = ctx, U = uf();
  const role = user.role === 'admin' ? 'admin' : 'corredor';
  if (sub) {
    const p = db.get('properties', sub);
    if (!p || p.agentId !== agent.id) { el.innerHTML = '<div class="card empty">Esta propiedad no está en tu cartera.</div>'; return; }
    el.innerHTML = `${pageHead(p.title, `${escape(p.code)} · ${escape(comunaName(p.comuna))}`, `<a class="btn btn-ghost" href="#/propiedades">← Volver</a><button class="btn" data-edit>✎ Editar</button>`)}
      <div class="card row between"><div class="row" style="gap:10px">${badge(PSTATUS, p.status)}${flowPills(p)}</div><div class="row" style="gap:6px">${wfButtons(p, role) || '<span class="muted small">Esperando acción del administrador</span>'}</div></div>
      <div class="split"><div class="card"><div style="border-radius:var(--radius-sm);overflow:hidden;aspect-ratio:16/9">${propertyArt(p, 'fachada')}</div><p style="margin-top:12px"><b>${mainPrice(p)}</b> <span class="muted">${altPrice(p, U)}</span> · ${num(p.views)} visitas a la ficha · ${db.count('leads', l => l.propertyId === p.id)} leads</p><p>${escape(p.description)}</p></div>
      <div class="card"><h3>Historial</h3>${timeline((p.history || []).slice().reverse().map(h => ({ title: escape(PSTATUS[h.to]?.[0] || h.to), meta: `${date(h.at)} · ${escape(h.by)}`, body: escape(h.note || '') })))}</div></div>`;
    el.querySelector('[data-edit]').onclick = async () => { if (await propertyForm(p, { agentId: agent.id })) ctx.refresh(); };
    el.querySelectorAll('[data-wf]').forEach(b => b.onclick = async () => { if (await runTransition(db.get('properties', p.id), b.dataset.wf)) ctx.refresh(); });
    return;
  }
  el.innerHTML = `${pageHead('Mis propiedades', 'Las nuevas captaciones quedan en borrador hasta que las envíes a revisión', '<button class="btn btn-primary" data-new>+ Captar propiedad</button>')}<div data-t></div>`;
  crudTable(el.querySelector('[data-t]'), {
    rows: () => db.query('properties', p => p.agentId === agent.id), search: p => `${p.code} ${p.title} ${p.address}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(PSTATUS).map(([k, v]) => [k, v[0]]) }, { key: 'op', label: 'Operación', options: [['venta', 'Venta'], ['arriendo', 'Arriendo']] }],
    columns: [
      { key: 'title', label: 'Propiedad', render: p => `<div class="cell-prop"><span class="th">${propertyArt(p, 'fachada', { label: false })}</span><div><b>${escape(p.title)}</b><span class="muted small">${escape(p.code)}</span></div></div>` },
      { key: 'price', label: 'Precio', render: p => `<b class="nowrap">${mainPrice(p)}</b>` },
      { key: 'status', label: 'Estado', render: p => badge(PSTATUS, p.status) },
      { key: 'views', label: 'Visitas', render: p => num(p.views) },
      { key: 'leads', label: 'Leads', sort: false, render: p => db.count('leads', l => l.propertyId === p.id) },
      { key: 'id', label: 'Acción', sort: false, render: p => `<div class="actions">${wfButtons(p, role).split('</button>').filter(Boolean).slice(0, 1).map(s => s + '</button>').join('')}</div>` }
    ],
    onRow: p => ctx.go('/propiedades/' + p.id),
    csv: { name: 'mi-cartera.csv', map: p => ({ codigo: p.code, titulo: p.title, precio: p.price, moneda: p.currency, estado: p.status, visitas: p.views }) }
  });
  el.querySelector('[data-new]').onclick = async () => { const r = await propertyForm(null, { agentId: agent.id }); if (r) ctx.go('/propiedades/' + r.id); };
  el.addEventListener('click', async e => { const w = e.target.closest('[data-wf]'); if (w) { if (await runTransition(db.get('properties', w.dataset.pid), w.dataset.wf)) ctx.refresh(); } });
  if (location.hash.includes('new=1')) { history.replaceState(null, '', '#/propiedades'); el.querySelector('[data-new]').click(); }
}
