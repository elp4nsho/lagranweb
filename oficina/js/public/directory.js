// Directorio con búsqueda, filtros por área/habilidad/piso/estado y tarjetas.
import { escape } from '../../../assets/core/ui.js';
import { STATUS, STATUS_ORDER, areaTag, statusBadge, norm } from '../shared/util.js';
import { avatarDot } from './profile.js';

const f = { q: '', area: '', skill: '', floor: '', status: '', sort: 'name' };
export function resetFilters() { Object.assign(f, { q: '', area: '', skill: '', floor: '', status: '' }); }
const noAnim = el => el.querySelectorAll('.card').forEach(c => { c.__lgw = 1; });

function hl(text, terms) {
  const t = String(text);
  if (!terms.length) return escape(t);
  const n = norm(t); let out = '', pos = 0;
  const marks = terms.map(term => [n.indexOf(term), term.length]).filter(m => m[0] >= 0).sort((a, b) => a[0] - b[0]);
  marks.forEach(([i, len]) => { if (i < pos) return; out += escape(t.slice(pos, i)) + '<mark>' + escape(t.slice(i, i + len)) + '</mark>'; pos = i + len; });
  return out + escape(t.slice(pos));
}

function filtered(idx) {
  const terms = norm(f.q.trim()).split(/\s+/).filter(Boolean);
  const list = idx.people.filter(p => {
    if (f.area && p.areaId !== f.area) return false;
    if (f.skill && !(p.skills || []).includes(f.skill)) return false;
    if (f.status && idx.statusOf(p) !== f.status) return false;
    if (f.floor) { const sid = idx.seatOf(p); if (f.floor === 'remoto' ? sid : (!sid || idx.desk[sid].floor.id !== f.floor)) return false; }
    const h = norm([p.name, p.cargo, idx.area(p)?.name, (p.skills || []).join(' '), p.email, p.ext].join(' '));
    return terms.every(t => h.includes(t));
  });
  const by = { name: (a, b) => a.name.localeCompare(b.name, 'es'), area: (a, b) => (idx.area(a)?.name || '').localeCompare(idx.area(b)?.name || '', 'es') || a.level - b.level, status: (a, b) => STATUS_ORDER.indexOf(idx.statusOf(a)) - STATUS_ORDER.indexOf(idx.statusOf(b)) };
  return { list: list.sort((a, b) => by[f.sort](a, b) || a.name.localeCompare(b.name, 'es')), terms };
}

function card(ctx, p, terms) {
  const idx = ctx.idx, mgr = p.managerId ? idx.byId[p.managerId] : null, sid = idx.seatOf(p);
  const skillHit = terms.length ? (p.skills || []).filter(s => terms.some(t => norm(s).includes(t))) : [];
  return `<article class="card pcard">
    <button type="button" class="pcard-main" data-open="${p.id}" aria-label="Ver perfil de ${escape(p.name)}">${avatarDot(idx, p, 48)}<span style="min-width:0"><span class="nm">${hl(p.name, terms)}</span><span class="cg">${hl(p.cargo, terms)}</span></span></button>
    <div class="meta">${areaTag(idx.area(p))}${statusBadge(idx.statusOf(p))}${skillHit.map(s => `<span class="skill">${hl(s, terms)}</span>`).join('')}</div>
    <ul>
      <li>✉️ <a href="mailto:${escape(p.email)}">${escape(p.email)}</a></li>
      <li>☎️ Anexo <b>${escape(p.ext)}</b>${ctx.site.showPhones !== false ? ` · ${escape(p.phone)}` : ''}</li>
      <li>📍 ${escape(idx.whereText(p))}</li>
      <li>👤 ${mgr ? `Reporta a ${escape(mgr.name)}` : `Dirige ${escape(idx.company.name)}`}</li>
    </ul>
    <div class="actions"><button type="button" class="btn btn-sm" data-open="${p.id}">Perfil</button><button type="button" class="btn btn-sm btn-primary" data-locate="${p.id}" ${sid ? '' : 'disabled title="Sin puesto en la oficina hoy"'}>📍 Ver en el mapa</button></div>
  </article>`;
}

function paintResults(el, ctx, animate) {
  const idx = ctx.idx, r = filtered(idx);
  const counts = {}; idx.people.forEach(p => { const s = idx.statusOf(p); counts[s] = (counts[s] || 0) + 1; });
  el.querySelector('[data-chips]').innerHTML = STATUS_ORDER.map(s => `<button type="button" class="chip ${f.status === s ? 'active' : ''}" data-status="${s}" aria-pressed="${f.status === s}">${STATUS[s].label} <b>${counts[s] || 0}</b></button>`).join('');
  el.querySelector('[data-count]').textContent = r.list.length === idx.people.length ? `${idx.people.length} personas en ${idx.company.name}` : `${r.list.length} de ${idx.people.length} personas`;
  const grid = el.querySelector('[data-grid]');
  grid.innerHTML = r.list.length ? r.list.map(p => card(ctx, p, r.terms)).join('') : '<div class="empty card"><span class="icon">🔍</span><b>Sin resultados</b><p>Prueba con otro nombre, área o habilidad.</p><button class="btn btn-sm" type="button" data-clear>Limpiar filtros</button></div>';
  if (!animate) noAnim(grid);
}

export function render(el, ctx) {
  const idx = ctx.idx;
  const skills = [...new Set(idx.people.flatMap(p => p.skills || []))].sort((a, b) => a.localeCompare(b, 'es'));
  el.innerHTML = `<section class="stack">
    <div class="filters" role="search">
      <input class="input" type="search" data-q placeholder="Buscar por nombre, cargo, área o habilidad…  ( / )" value="${escape(f.q)}" aria-label="Buscar personas">
      <select class="select" data-f="area" aria-label="Área"><option value="">Todas las áreas</option>${idx.areas.map(a => `<option value="${a.id}" ${f.area === a.id ? 'selected' : ''}>${escape(a.name)}</option>`).join('')}</select>
      <select class="select" data-f="skill" aria-label="Habilidad"><option value="">Todas las habilidades</option>${skills.map(s => `<option ${f.skill === s ? 'selected' : ''}>${escape(s)}</option>`).join('')}</select>
      <select class="select" data-f="floor" aria-label="Piso"><option value="">Todos los pisos</option>${idx.floors.map(fl => `<option value="${fl.id}" ${f.floor === fl.id ? 'selected' : ''}>${escape(fl.name)}</option>`).join('')}<option value="remoto" ${f.floor === 'remoto' ? 'selected' : ''}>Sin puesto hoy</option></select>
      <select class="select" data-f="sort" aria-label="Ordenar"><option value="name">Orden: nombre</option><option value="area" ${f.sort === 'area' ? 'selected' : ''}>Orden: área</option><option value="status" ${f.sort === 'status' ? 'selected' : ''}>Orden: estado</option></select>
      <button class="btn btn-ghost btn-sm" type="button" data-clear>Limpiar</button>
    </div>
    <div class="row between"><div class="chips" data-chips role="group" aria-label="Filtrar por estado"></div><span class="muted small" data-count aria-live="polite"></span></div>
    <div class="pgrid" data-grid></div>
  </section>`;
  paintResults(el, ctx, true);
  el.querySelector('[data-q]').addEventListener('input', e => { f.q = e.target.value; paintResults(el, ctx); });
  el.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { f[s.dataset.f] = s.value; paintResults(el, ctx); }));
  el.onclick = e => {
    const st = e.target.closest('[data-status]'), o = e.target.closest('[data-open]'), l = e.target.closest('[data-locate]');
    if (st) { f.status = f.status === st.dataset.status ? '' : st.dataset.status; paintResults(el, ctx); }
    else if (o) ctx.openProfile(o.dataset.open);
    else if (l && !l.disabled) ctx.locate(l.dataset.locate);
    else if (e.target.closest('[data-clear]')) { resetFilters(); render(el, ctx); }
  };
  if (!document.__qqSlash) {
    document.__qqSlash = true;
    document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { const q = document.querySelector('[data-q]'); if (q) { e.preventDefault(); q.focus(); } } });
  }
}
export function update(el, ctx) { if (el.querySelector('[data-grid]')) paintResults(el, ctx); else render(el, ctx); }
