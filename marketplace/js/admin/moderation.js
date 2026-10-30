// Moderación de servicios: cola de revisión (aprobar / rechazar con motivo), pausar y destacar.
import { escape, money, date, toast, formModal } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, empty } from '../shared/kit.js';
import { user, category, GIG_STATUS, statusBadge, cover, gigRating, stars, PKGS, PKG_NAMES, settings } from '../shared/market.js';

const REASONS = ['Promete resultados engañosos o prohibidos', 'Descripción insuficiente o poco clara', 'Precios o paquetes incoherentes', 'Contenido copiado de otro vendedor', 'Categoría incorrecta'];

async function decide(db, me, g, ok) {
  if (ok) { db.update('gigs', g.id, { status: 'activo', moderationNote: '', moderatedBy: me.id }); db.log('moderacion', `Servicio aprobado: ${g.title}`, me.id); return toast('Servicio aprobado y publicado', 'success'); }
  const v = await formModal({ title: 'Rechazar servicio', fields: [{ name: 'reason', label: 'Motivo (se informa al freelancer)', type: 'select', options: REASONS }, { name: 'note', label: 'Comentario adicional', type: 'textarea' }], submit: 'Rechazar' });
  if (!v) return;
  db.update('gigs', g.id, { status: 'rechazado', moderationNote: v.reason + (v.note ? `: ${v.note}` : ''), moderatedBy: me.id });
  db.log('moderacion', `Servicio rechazado: ${g.title} (${v.reason})`, me.id); toast('Servicio rechazado', 'warning');
}

export function render(el, { db, me }) {
  const queue = db.query('gigs', g => g.status === 'pendiente').sort((a, b) => (b.flags || 0) - (a.flags || 0) || a.createdAt.localeCompare(b.createdAt));
  const rows = db.all('gigs').map(g => ({ ...g, fname: user(g.freelancerId)?.name || '', catName: category(g.categoryId).name, from: g.packages.basico.price, r: gigRating(g.id) }));
  const feat = settings().featured || [];
  el.innerHTML = `${pageHead('Moderación de servicios', `${queue.length} en cola · ${rows.filter(r => r.status === 'activo').length} publicados`)}
    <h3 class="mb-0">Cola de revisión</h3>
    <div class="grid-auto" style="grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr))">${queue.map(g => `<div class="card stack" style="gap:10px">
      <div class="gig-cover" style="border-radius:var(--radius-sm);border:var(--border-w) solid var(--line)">${cover(g)}</div>
      <div class="row between"><span class="small muted">${escape(category(g.categoryId).name)} · ${escape(user(g.freelancerId)?.name || '')}</span>${g.flags ? badge(`${g.flags} alertas automáticas`, 'danger') : badge('Nuevo', 'info')}</div>
      <b>${escape(g.title)}</b><p class="small mb-0">${escape(g.description)}</p>
      <div class="small muted">${PKGS.map(k => `${PKG_NAMES[k]} ${money(g.packages[k].price)}`).join(' · ')}</div>
      <div class="row"><button class="btn btn-primary btn-sm" data-ok="${g.id}">Aprobar</button><button class="btn btn-sm btn-danger" data-no="${g.id}">Rechazar</button><a class="btn btn-sm btn-ghost" href="index.html#/servicio/${g.id}" target="_blank">Vista previa ↗</a></div></div>`).join('') || `<div class="card">${empty('La cola está vacía ✓')}</div>`}</div>
    <h3 class="mb-0" style="margin-top:12px">Todos los servicios</h3><div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'all-gigs', rows, search: r => r.title + r.fname,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(GIG_STATUS).map(([k, v]) => [k, v[0]]) }, { key: 'categoryId', label: 'Categoría', options: db.all('categories').map(c => [c.id, c.name]) }],
    columns: [
      { key: 'title', label: 'Servicio', render: r => `<b>${escape(r.title)}</b>${feat.includes(r.id) ? ' ' + badge('Destacado', 'primary') : ''}<div class="small muted">${escape(r.fname)} · ${escape(r.catName)}</div>` },
      { key: 'from', label: 'Desde', render: r => money(r.from) },
      { key: 'rating', label: 'Valoración', sort: r => r.r.avg, render: r => `<span class="small">${stars(r.r.avg, r.r.count)}</span>` },
      { key: 'createdAt', label: 'Creado', render: r => `<span class="small">${date(r.createdAt)}</span>` },
      { key: 'status', label: 'Estado', render: r => statusBadge(GIG_STATUS, r.status) },
      { key: 'x', label: '', sort: false, render: r => `<div class="actions">${r.status === 'activo' ? '<button class="btn btn-sm btn-ghost" data-act="pause">Despublicar</button>' : r.status !== 'borrador' ? '<button class="btn btn-sm btn-ghost" data-act="approve">Publicar</button>' : ''}</div>` }
    ],
    onAction: async (act, r) => {
      const g = db.get('gigs', r.id);
      if (act === 'approve') return decide(db, me, g, true);
      const v = await formModal({ title: 'Despublicar servicio', fields: [{ name: 'reason', label: 'Motivo', type: 'select', options: REASONS }], submit: 'Despublicar' });
      if (!v) return;
      db.update('gigs', g.id, { status: 'rechazado', moderationNote: v.reason }); db.log('moderacion', `Servicio despublicado: ${g.title}`, me.id); toast('Servicio despublicado', 'warning');
    }
  });
  el.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => decide(db, me, db.get('gigs', b.dataset.ok), true));
  el.querySelectorAll('[data-no]').forEach(b => b.onclick = () => decide(db, me, db.get('gigs', b.dataset.no), false));
}
