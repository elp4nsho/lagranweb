// Moderación de comentarios: cola, aprobación/rechazo/spam (individual y masivo).
import { escape, toast, ago, dateTime } from '../../../assets/core/ui.js';
import { db, settings } from '../data/db.js';
import { pageHead, badge } from '../shared/admin-kit.js';

const CST = { pending: ['Pendiente', 'warning'], approved: ['Aprobado', 'success'], rejected: ['Rechazado', 'danger'], spam: ['Spam', 'danger'] };
let filter = 'pending', q = '';
const SPAMMY = /gana dinero|seguidores|visita mi perfil|compra|http/i;

export default {
  id: 'comments', path: '/comentarios', label: 'Comentarios', icon: '💬', group: 'Audiencia', perm: 'comments',
  render(el, ctx) {
    const all = db.all('comments').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const list = all.filter(c => (filter === 'all' || c.status === filter) && (!q || (c.text + c.name).toLowerCase().includes(q.toLowerCase())));
    const mod = settings().comments || {};
    el.innerHTML = `${pageHead('Moderación de comentarios', `Modo: ${mod.moderation === 'pre' ? 'pre-moderación (se publican tras aprobar)' : 'post-moderación (se publican de inmediato)'}${ctx.can('settings') ? ' · <a href="#/ajustes">cambiar</a>' : ''}`)}
      <div class="tbl-toolbar"><div class="row" style="gap:6px">${[['pending', 'Pendientes'], ['approved', 'Aprobados'], ['rejected', 'Rechazados'], ['spam', 'Spam'], ['all', 'Todos']].map(([k, l]) => `<button class="chip ${filter === k ? 'active' : ''}" data-f="${k}">${l} (${k === 'all' ? all.length : all.filter(c => c.status === k).length})</button>`).join('')}</div>
        <input class="input tbl-search" type="search" placeholder="Buscar en comentarios…" value="${escape(q)}" data-q aria-label="Buscar comentarios"><span class="tbl-spacer"></span>
        <label class="check small"><input type="checkbox" data-all> Seleccionar todo</label>
        <button class="btn btn-sm" data-bulk="approved">✓ Aprobar</button><button class="btn btn-sm" data-bulk="rejected">✕ Rechazar</button><button class="btn btn-sm btn-danger" data-bulk="spam">⚠ Spam</button></div>
      <div class="stack" style="gap:10px">${list.slice(0, 60).map(c => { const a = db.get('articles', c.articleId); const sus = SPAMMY.test(c.text); return `
        <article class="card row" style="align-items:flex-start;flex-wrap:nowrap;gap:12px" data-c="${c.id}">
          <input type="checkbox" class="check" data-sel="${c.id}" aria-label="Seleccionar comentario de ${escape(c.name)}" style="margin-top:4px;accent-color:var(--primary);width:18px;height:18px">
          <div class="stack" style="gap:6px;flex:1;min-width:0">
            <div class="row between" style="gap:8px"><span class="small"><b>${escape(c.name)}</b> <span class="muted">· ${ago(c.createdAt)} · en <a href="index.html#/articulo/${escape(a?.slug || '')}" target="_blank" rel="noopener">${escape(a?.title || 'artículo eliminado')}</a></span></span><span class="row" style="gap:6px">${sus ? '<span class="badge badge-danger plain">Posible spam</span>' : ''}${badge(c.status, CST)}</span></div>
            <p style="margin:0">${escape(c.text)}</p>
            <div class="inline-actions">${c.status !== 'approved' ? `<button class="btn btn-sm btn-primary" data-set="approved">✓ Aprobar</button>` : ''}${c.status !== 'rejected' ? `<button class="btn btn-sm" data-set="rejected">✕ Rechazar</button>` : ''}${c.status !== 'spam' ? `<button class="btn btn-sm" data-set="spam">⚠ Spam</button>` : ''}<button class="btn btn-sm btn-ghost" data-set="delete" title="${dateTime(c.createdAt)}">🗑 Eliminar</button></div>
          </div></article>`; }).join('') || '<div class="card empty"><span class="icon">✓</span>No hay comentarios en esta bandeja.</div>'}</div>
      ${list.length > 60 ? `<p class="small muted">Mostrando 60 de ${list.length}. Usa la búsqueda para acotar.</p>` : ''}`;
    const set = (ids, st) => {
      ids.forEach(id => (st === 'delete' ? db.remove('comments', id) : db.update('comments', id, { status: st })));
      db.log('moderación', `${ids.length} comentario(s) → ${st === 'delete' ? 'eliminado' : CST[st][0]}`, ctx.user.id);
      toast(`${ids.length} comentario(s) ${st === 'delete' ? 'eliminado(s)' : 'marcado(s) como ' + CST[st][0].toLowerCase()}`, 'success');
    };
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; this.render(el, ctx); });
    el.querySelector('[data-q]').onchange = e => { q = e.target.value; this.render(el, ctx); };
    el.querySelector('[data-all]').onchange = e => el.querySelectorAll('[data-sel]').forEach(c => (c.checked = e.target.checked));
    el.querySelectorAll('[data-bulk]').forEach(b => b.onclick = () => { const ids = [...el.querySelectorAll('[data-sel]:checked')].map(c => c.dataset.sel); if (!ids.length) return toast('Selecciona al menos un comentario', 'warning'); set(ids, b.dataset.bulk); });
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => set([b.closest('[data-c]').dataset.c], b.dataset.set));
  }
};
