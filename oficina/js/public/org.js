// Organigrama por áreas con búsqueda que resalta y expande ramas.
import { escape } from '../../../assets/core/ui.js';
import { areaTag } from '../shared/util.js';
import { avatarDot } from './profile.js';

const collapsed = {};
let q = '';

export function render(el, ctx) {
  const idx = ctx.idx, reps = id => idx.reports[id] || [];
  const ceo = idx.people.find(p => !p.managerId);
  if (!ceo) { el.innerHTML = '<div class="empty card">Sin personas registradas.</div>'; return; }
  const direct = reps(ceo.id);
  const staff = direct.filter(p => !reps(p.id).length && p.areaId === ceo.areaId);
  const heads = direct.filter(p => !staff.includes(p));
  const countAll = p => reps(p.id).reduce((n, r) => n + 1 + countAll(r), 0);
  const node = (p, cls = '') => { const n = reps(p.id).length; return `<button type="button" class="onode ${cls}" style="--c:${escape(p.color)}" data-open="${p.id}" data-pid="${p.id}">${avatarDot(idx, p, 34)}<span><span class="nm">${escape(p.name)}</span><span class="sub">${escape(p.cargo)}${n ? ` · ${n} a cargo` : ''}</span></span></button>`; };
  const tree = p => { const r = reps(p.id); return r.length ? `<ul class="org-list">${r.map(x => `<li>${node(x)}${tree(x)}</li>`).join('')}</ul>` : ''; };
  const allCollapsed = heads.every(h => collapsed[h.id]);
  el.innerHTML = `<section class="stack">
    <div class="row between"><p class="muted" style="margin:0">${escape(idx.company.name)} · ${idx.people.length} personas · ${heads.length} áreas</p>
      <div class="row gap-sm"><input class="input" type="search" data-oq placeholder="Resaltar persona…" value="${escape(q)}" aria-label="Resaltar en el organigrama" style="max-width:260px"><button class="btn btn-sm" type="button" data-all>${allCollapsed ? 'Expandir todo' : 'Contraer todo'}</button></div></div>
    <div class="card org-wrap"><div class="org">
      <div class="org-top">${node(ceo, 'ceo')}${staff.length ? `<div class="org-staff">${staff.map(s => node(s)).join('')}</div>` : ''}</div>
      <div class="org-vline"></div>
      <div class="org-cols">${heads.map(h => { const n = countAll(h); return `<div class="org-col"><div class="org-col-h">${areaTag(idx.area(h))}${node(h)}${n ? `<button type="button" class="org-toggle" data-toggle="${h.id}" aria-expanded="${!collapsed[h.id]}">${collapsed[h.id] ? '▸' : '▾'} ${n} persona${n === 1 ? '' : 's'}</button>` : ''}</div><div ${collapsed[h.id] ? 'hidden' : ''}>${tree(h)}</div></div>`; }).join('')}</div>
    </div></div></section>`;
  const apply = () => {
    const hits = q.trim() ? idx.search(q) : null, ids = new Set((hits || []).map(p => p.id));
    if (hits) {
      let changed = false;
      hits.forEach(p => { let m = p; while (m.managerId) { const up = idx.byId[m.managerId]; if (up && !up.managerId && collapsed[m.id]) { collapsed[m.id] = false; changed = true; } m = up || {}; } });
      if (changed) { render(el, ctx); const i = el.querySelector('[data-oq]'); i.focus(); i.setSelectionRange(q.length, q.length); return; }
    }
    el.querySelectorAll('.onode').forEach(n => { n.classList.toggle('match', !!hits && ids.has(n.dataset.pid)); n.classList.toggle('nomatch', !!hits && !ids.has(n.dataset.pid)); });
    if (hits?.length) el.querySelector('.onode.match')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  };
  apply();
  el.querySelector('[data-oq]').addEventListener('input', e => { q = e.target.value; apply(); });
  el.onclick = e => {
    const t = e.target.closest('[data-toggle]'), o = e.target.closest('[data-open]');
    if (t) { collapsed[t.dataset.toggle] = !collapsed[t.dataset.toggle]; render(el, ctx); }
    else if (e.target.closest('[data-all]')) { const c = !heads.every(h => collapsed[h.id]); heads.forEach(h => { collapsed[h.id] = c; }); render(el, ctx); }
    else if (o) ctx.openProfile(o.dataset.open);
  };
}
