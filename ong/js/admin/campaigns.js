// Campañas: CRUD, flujo de publicación, portada (ilustración), metas, actualizaciones y donantes.
import { db, campaignStats, CAMPAIGN_ST } from '../data/db.js';
import { CATEGORIES } from '../data/seed.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { coverArt } from '../shared/art.js';
import { escape, money, num, date, toast, confirm, formModal, slug } from '../../../assets/core/ui.js';

const TONES = [['0', 'Tono principal'], ['1', 'Acento'], ['2', 'Éxito (verde)'], ['3', 'Info (azul)'], ['4', 'Urgente (rojo)'], ['5', 'Advertencia (ámbar)']];

async function edit(c, ctx) {
  const v = await formModal({ title: c ? `Editar «${c.title}»` : 'Nueva campaña', size: 'lg', submit: c ? 'Guardar' : 'Crear borrador', fields: [
    { name: 'title', label: 'Título', value: c?.title || '', required: true },
    { name: 'category', label: 'Causa', type: 'select', value: c?.category || CATEGORIES[0], options: CATEGORIES },
    { name: 'region', label: 'Región', value: c?.region || '', required: true },
    { name: 'projectId', label: 'Proyecto asociado', type: 'select', value: c?.projectId || '', options: [['', 'Ninguno'], ...db.all('projects').map(p => [p.id, p.name])] },
    { name: 'goal', label: 'Meta (CLP)', type: 'number', value: c?.goal || 5_000_000, required: true },
    { name: 'startDate', label: 'Inicio', type: 'date', value: c?.startDate || new Date().toISOString().slice(0, 10), required: true },
    { name: 'endDate', label: 'Término', type: 'date', value: c?.endDate || new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10), required: true },
    { name: 'summary', label: 'Resumen (tarjeta)', type: 'textarea', value: c?.summary || '', required: true },
    { name: 'story', label: 'Historia (página de la campaña)', type: 'textarea', value: c?.story || '' },
    { name: 'cover', label: 'Portada (ilustración por causa · color)', type: 'select', value: String(c?.cover ?? 0), options: TONES, help: 'Placeholder de imagen: la ilustración usa la causa y el tono elegidos.' },
    { name: 'featured', label: 'Destacar en el inicio', type: 'checkbox', value: c ? c.featured : false },
    { name: 'urgent', label: 'Marcar como urgente', type: 'checkbox', value: c ? !!c.urgent : false }
  ] });
  if (!v) return;
  if (!(v.goal > 0)) return toast('La meta debe ser mayor a 0', 'warning');
  if (v.endDate < v.startDate) return toast('La fecha de término debe ser posterior al inicio', 'warning');
  v.cover = +v.cover;
  if (c) { db.update('campaigns', c.id, v); db.log('Campaña editada', v.title, ctx.user.id); toast('Campaña guardada', 'success'); }
  else { const n = db.insert('campaigns', { ...v, slug: slug(v.title), status: 'borrador', updates: [] }); db.log('Campaña creada', v.title, ctx.user.id); toast('Borrador creado: publícalo cuando esté listo', 'success'); location.hash = '#/campanas/' + n.id; }
}

function setStatus(c, status, ctx) {
  db.update('campaigns', c.id, { status });
  db.log('Campaña', `«${c.title}» → ${CAMPAIGN_ST[status][0]}`, ctx.user.id);
  toast(`Campaña ${CAMPAIGN_ST[status][0].toLowerCase()}`, status === 'publicada' ? 'success' : 'info');
}

function list(view, ctx) {
  const rows = db.all('campaigns').map(c => ({ ...c, ...campaignStats(c) }));
  view.innerHTML = `${pageHead('Campañas', `${rows.filter(c => c.status === 'publicada').length} publicadas · ${rows.filter(c => c.status === 'borrador').length} borradores`, '<button class="btn btn-primary" data-new>＋ Nueva campaña</button>')}
    <div class="kpis">
      ${kpi('Recaudado en campañas activas', money(rows.filter(c => c.status === 'publicada').reduce((s, c) => s + c.raised, 0)), { ico: '💚' })}
      ${kpi('Meta total activa', money(rows.filter(c => c.status === 'publicada').reduce((s, c) => s + c.goal, 0)), { ico: '🎯' })}
      ${kpi('Donantes únicos', num(new Set(db.query('donations', d => d.campaignId && d.status === 'aprobada').map(d => d.donorId)).size), { ico: '👥' })}
      ${kpi('Metas cumplidas', num(rows.filter(c => c.pct >= 100).length), { ico: '🏆' })}
    </div><div class="card" id="tbl"></div>`;
  table(view.querySelector('#tbl'), {
    id: 'campaigns', rows, sort: { key: 'pct', dir: -1 },
    search: c => `${c.title} ${c.region} ${c.category}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(CAMPAIGN_ST).map(([k, v]) => [k, v[0]]) }, { key: 'category', label: 'Causa', options: CATEGORIES.map(c => [c, c]) }],
    columns: [
      { key: 'title', label: 'Campaña', render: c => `<b>${escape(c.title)}</b>${c.featured ? ' <span class="badge badge-primary plain">Destacada</span>' : ''}${c.urgent ? ' <span class="badge badge-danger plain">Urgente</span>' : ''}<br><small class="muted">${escape(c.category)} · ${escape(c.region)}</small>` },
      { key: 'raised', label: 'Recaudado', render: c => `${money(c.raised)}<br><small class="muted">de ${money(c.goal)}</small>` },
      { key: 'pct', label: 'Avance', render: c => `<div style="min-width:110px"><div class="progress"><i style="--v:${Math.min(100, c.pct)}%"></i></div><small>${Math.round(c.pct)}% · ${c.donors} donantes</small></div>` },
      { key: 'endDate', label: 'Término', render: c => `${escape(date(c.endDate + 'T12:00'))}<br><small class="muted">${c.daysLeft >= 0 ? c.daysLeft + ' días' : 'vencida'}</small>` },
      { key: 'status', label: 'Estado', render: c => badge(...CAMPAIGN_ST[c.status]) },
      { key: 'act', label: '', sort: false, render: c => `<div class="t-actions">${c.status === 'borrador' || c.status === 'pausada' ? `<button class="btn btn-sm btn-primary" data-pub="${c.id}">Publicar</button>` : ''}<a class="btn btn-sm btn-ghost" href="#/campanas/${c.id}">Ver</a></div>` }
    ],
    onRow: c => { location.hash = '#/campanas/' + c.id; },
    csv: { name: 'campanas.csv', map: c => ({ campana: c.title, causa: c.category, region: c.region, meta: c.goal, recaudado: c.raised, avance: Math.round(c.pct) + '%', donantes: c.donors, inicio: c.startDate, termino: c.endDate, estado: c.status }) }
  });
  view.onclick = e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('[data-new]')) edit(null, ctx);
    if (t.dataset.pub) setStatus(db.get('campaigns', t.dataset.pub), 'publicada', ctx);
  };
}

function detail(view, ctx, id) {
  const c = db.get('campaigns', id);
  if (!c) { view.innerHTML = '<div class="card empty"><h2>Campaña no encontrada</h2><a class="btn" href="#/campanas">Volver</a></div>'; return; }
  const s = campaignStats(c);
  const topDonors = Object.values(s.list.reduce((m, d) => { const k = d.donorId || d.email; m[k] = m[k] || { name: d.donorName, id: d.donorId, total: 0, n: 0 }; m[k].total += d.amount; m[k].n++; return m; }, {})).sort((a, b) => b.total - a.total).slice(0, 8);
  view.innerHTML = `${pageHead(c.title, `${escape(c.category)} · ${escape(c.region)} · ${badge(...CAMPAIGN_ST[c.status])}`, `<a class="btn btn-ghost" href="#/campanas">← Campañas</a>${c.status !== 'borrador' ? `<a class="btn" href="index.html#/campanas/${c.id}" target="_blank" rel="noopener">Ver pública ↗</a>` : ''}<button class="btn" data-edit>Editar</button>`)}
    <div class="detail-grid">
      <div class="stack">
        <div class="card" style="padding:0;overflow:hidden;aspect-ratio:5/2">${coverArt(c)}</div>
        <div class="kpis">
          ${kpi('Recaudado', money(s.raised), { sub: `${Math.round(s.pct)}% de ${money(c.goal)}` })}${kpi('Donantes', num(s.donors), { sub: `${s.count} aportes` })}
          ${kpi('Aporte promedio', money(s.count ? s.raised / s.count : 0))}${kpi('Plazo', s.daysLeft >= 0 ? s.daysLeft + ' días' : 'Vencida', { sub: escape(date(c.endDate + 'T12:00')) })}
        </div>
        <div class="card stack"><div class="card-title" style="margin:0"><h3>Actualizaciones públicas</h3><button class="btn btn-sm btn-primary" data-upd>＋ Publicar actualización</button></div>
          ${[...c.updates].sort((a, b) => b.date.localeCompare(a.date)).map(u => `<div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><div><b>${escape(u.title)}</b> <span class="small muted">· ${escape(date(u.date))}</span><br><span class="small">${escape(u.text)}</span></div><button class="btn btn-sm btn-ghost" data-rmupd="${u.id}" aria-label="Eliminar actualización">✕</button></div>`).join('') || '<p class="muted small" style="margin:0">Sin actualizaciones. Contar avances aumenta las donaciones.</p>'}</div>
      </div>
      <div class="stack">
        <div class="card stack"><h3 style="margin:0">Estado</h3>
          <div class="row" style="gap:8px">
            ${c.status !== 'publicada' && c.status !== 'finalizada' ? '<button class="btn btn-primary" data-st="publicada">Publicar</button>' : ''}
            ${c.status === 'publicada' ? '<button class="btn" data-st="pausada">Pausar</button><button class="btn" data-st="finalizada">Finalizar</button>' : ''}
            ${c.status === 'finalizada' ? '<button class="btn" data-st="publicada">Reabrir</button>' : ''}
            ${c.status !== 'borrador' ? '<button class="btn btn-ghost" data-st="borrador">Pasar a borrador</button>' : ''}
          </div>
          <label class="check"><input type="checkbox" data-flag="featured" ${c.featured ? 'checked' : ''}> Destacada en el inicio</label>
          <label class="check"><input type="checkbox" data-flag="urgent" ${c.urgent ? 'checked' : ''}> Urgente</label>
        </div>
        <div class="card"><h3>Principales donantes</h3>${topDonors.map(d => `<div class="sum-line"><span>${d.id ? `<a href="#/donantes/${d.id}">${escape(d.name)}</a>` : escape(d.name)} <small class="muted">×${d.n}</small></span><b>${money(d.total)}</b></div>`).join('') || '<p class="muted small">Aún sin donaciones.</p>'}</div>
        ${ctx.role === 'admin' ? `<button class="btn btn-danger" data-del>${s.count ? 'Eliminar (tiene donaciones: se conservarán en el libro)' : 'Eliminar campaña'}</button>` : ''}
      </div>
    </div>`;
  view.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('[data-edit]')) edit(c, ctx);
    if (t.dataset.st) setStatus(c, t.dataset.st, ctx);
    if (t.matches('[data-upd]')) {
      const v = await formModal({ title: 'Nueva actualización', fields: [{ name: 'title', label: 'Título', required: true }, { name: 'text', label: 'Texto', type: 'textarea', required: true }] });
      if (!v) return;
      db.update('campaigns', c.id, { updates: [...c.updates, { id: 'u' + Date.now().toString(36), date: new Date().toISOString(), ...v }] });
      db.log('Campaña actualizada', `${c.title}: ${v.title}`, ctx.user.id); toast('Actualización publicada', 'success');
    }
    if (t.dataset.rmupd && await confirm('¿Eliminar esta actualización?', { danger: true, ok: 'Eliminar' })) { db.update('campaigns', c.id, { updates: c.updates.filter(u => u.id !== t.dataset.rmupd) }); toast('Eliminada', 'success'); }
    if (t.matches('[data-del]') && await confirm(`¿Eliminar «${c.title}»?`, { danger: true, ok: 'Eliminar' })) { db.remove('campaigns', c.id); db.log('Campaña eliminada', c.title, ctx.user.id); toast('Campaña eliminada', 'success'); location.hash = '#/campanas'; }
  };
  view.onchange = e => { const f = e.target.dataset.flag; if (!f) return; db.update('campaigns', c.id, { [f]: e.target.checked }); toast('Guardado', 'success'); };
}

export default {
  id: 'campanas', label: 'Campañas', ico: '📣', group: 'Recaudación', roles: ['admin', 'coordinador'],
  count: () => db.count('campaigns', c => c.status === 'borrador'),
  render(view, ctx) { ctx.params.id ? detail(view, ctx, ctx.params.id) : list(view, ctx); }
};
