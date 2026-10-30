// Compañeros: mi jefatura, mi equipo y buscador de toda la empresa.
import { escape } from '../../../assets/core/ui.js';
import { avatar, statusBadge, areaTag } from '../shared/util.js';
import { openProfile } from '../public/profile.js';

let q = '';
export function render(el, ctx) {
  const { db, idx } = ctx, me = idx.byId[ctx.me.id];
  const pctx = { idx, site: db.getValue('site', {}), locate: id => { location.href = `index.html#/mapa?p=${encodeURIComponent(id)}`; } };
  const mgr = idx.byId[me.managerId], reps = idx.reports[me.id] || [];
  const team = idx.people.filter(p => p.areaId === me.areaId && p.id !== me.id && p.id !== mgr?.id);
  const card = p => `<div class="card pcard"><button type="button" class="pcard-main" data-open="${p.id}">${avatar(p, 44)}<span style="min-width:0"><span class="nm">${escape(p.name)}</span><span class="cg">${escape(p.cargo)}</span></span></button><div class="meta">${statusBadge(idx.statusOf(p))}<span class="badge plain">📍 ${escape(idx.whereText(p))}</span></div><ul><li>✉️ <a href="mailto:${escape(p.email)}">${escape(p.email)}</a></li><li>☎️ Anexo <b>${escape(p.ext)}</b></li></ul></div>`;
  const results = q.trim() ? idx.search(q, 24) : [];
  el.innerHTML = `<div class="page-head"><div><h1 style="font-size:clamp(24px,4vw,34px)">Mi equipo</h1><p class="muted" style="margin:0">${areaTag(idx.area(me))} ${team.length + 1} personas en tu área</p></div></div>
    ${mgr ? `<section class="stack"><h3>Mi jefatura</h3><div class="pgrid">${card(mgr)}</div></section>` : ''}
    ${reps.length ? `<section class="stack"><h3>Me reportan (${reps.length})</h3><div class="pgrid">${reps.map(card).join('')}</div></section>` : ''}
    <section class="stack"><h3>Mi área</h3><div class="pgrid">${team.filter(p => !reps.includes(p)).map(card).join('') || '<p class="muted">Sin más personas en tu área.</p>'}</div></section>
    <section class="stack"><h3>Buscar en ${escape(idx.company.name)}</h3><input class="input" type="search" data-q placeholder="Nombre, cargo, habilidad…" value="${escape(q)}" aria-label="Buscar colegas"><div class="pgrid" data-res>${results.map(card).join('')}</div></section>`;
  el.querySelectorAll('.card').forEach(c => { c.__lgw = 1; });
  el.querySelector('[data-q]').addEventListener('input', e => { q = e.target.value; const r = el.querySelector('[data-res]'); r.innerHTML = (q.trim() ? idx.search(q, 24) : []).map(card).join(''); r.querySelectorAll('.card').forEach(c => { c.__lgw = 1; }); });
  el.onclick = e => { const o = e.target.closest('[data-open]'); if (o) openProfile(pctx, o.dataset.open); };
}
