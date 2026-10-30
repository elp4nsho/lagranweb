// Comunicados internos publicados por RRHH.
import { escape, date } from '../../../assets/core/ui.js';
let cat = '';
export function render(el, ctx) {
  const all = ctx.db.query('announcements', a => a.published).sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));
  const cats = [...new Set(all.map(a => a.category))];
  const list = all.filter(a => !cat || a.category === cat);
  el.innerHTML = `<div class="page-head"><div><h1>Comunicados</h1></div><div class="chips">${['', ...cats].map(c => `<button class="chip ${cat === c ? 'active' : ''}" data-cat="${escape(c)}">${escape(c || 'Todos')}</button>`).join('')}</div></div>
    <div class="stack">${list.map(a => `<article class="card"><div class="row between"><h3 style="margin:0">${a.pinned ? '📌 ' : ''}${escape(a.title)}</h3><span class="badge plain">${escape(a.category)}</span></div><p style="margin:10px 0">${escape(a.body)}</p><small class="muted">${escape(date(a.date))} · ${escape(a.author)}</small></article>`).join('') || '<div class="card empty">Sin comunicados.</div>'}</div>`;
  el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; render(el, ctx); });
}
