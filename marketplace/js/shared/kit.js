// Componentes propios de la app construidos sobre el núcleo compartido (solo tokens + clases del kit).
import { escape, html, raw, norm, debounce } from '../../../assets/core/ui.js';
import { initials as initialsSafe } from '../../../assets/core/auth.js';

export { html, raw, escape };

// ---------------------------------------------------------------------------
// Tabla con búsqueda, filtros, orden, paginación y acciones por fila.
// El estado (búsqueda, filtros, página) se conserva entre re-renders por `id`.
// ---------------------------------------------------------------------------
const tableState = new Map();
export function smartTable(el, {
  id = 'tbl', rows, columns, pageSize = 10, search, filters = [], empty = 'Sin resultados',
  onRow, onAction, toolbar = '', rowClass
}) {
  const st = tableState.get(id) || { q: '', f: {}, sortKey: null, dir: 1, page: 0 };
  tableState.set(id, st);
  el.innerHTML = `
    <div class="tbl-tools">
      ${search ? `<input class="input tbl-q" type="search" placeholder="Buscar…" aria-label="Buscar" value="${escape(st.q)}">` : ''}
      ${filters.map((f, i) => `<select class="select tbl-f" data-f="${i}" aria-label="${escape(f.label)}">
        <option value="">${escape(f.label)}: todos</option>
        ${f.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(v)}" ${String(st.f[f.key] ?? '') === String(v) ? 'selected' : ''}>${escape(l)}</option>`; }).join('')}
      </select>`).join('')}
      <span class="tbl-extra">${toolbar}</span>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr>${columns.map(c => `<th ${c.sort !== false ? `data-k="${c.key}" class="sortable"` : ''} ${c.align ? `style="text-align:${c.align}"` : ''}>${escape(c.label)}<span class="sort-ind"></span></th>`).join('')}</tr></thead><tbody></tbody></table></div>
    <div class="tbl-pager small muted"></div>`;
  const tbody = el.querySelector('tbody'), pager = el.querySelector('.tbl-pager');
  let current = [];
  const sortVal = (r, k) => { const c = columns.find(x => x.key === k); const v = typeof c?.sort === 'function' ? c.sort(r) : r[k]; return typeof v === 'string' ? norm(v) : v ?? ''; };
  function filtered() {
    return rows.filter(r => {
      if (st.q && search && !norm(search(r)).includes(norm(st.q))) return false;
      for (const f of filters) {
        const v = st.f[f.key];
        if (v === undefined || v === '') continue;
        if (f.test ? !f.test(r, v) : String(r[f.key]) !== String(v)) return false;
      }
      return true;
    });
  }
  function render() {
    let list = filtered();
    if (st.sortKey) list.sort((a, b) => { const x = sortVal(a, st.sortKey), y = sortVal(b, st.sortKey); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    st.page = Math.min(st.page, pages - 1);
    current = list.slice(st.page * pageSize, st.page * pageSize + pageSize);
    tbody.innerHTML = current.length ? current.map((r, i) => `<tr data-i="${i}" class="${onRow ? 'clickable ' : ''}${rowClass ? rowClass(r) : ''}">${columns.map(c => `<td ${c.align ? `style="text-align:${c.align}"` : ''} data-label="${escape(c.label)}">${c.render ? c.render(r) : escape(r[c.key])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}"><div class="empty">${escape(empty)}</div></td></tr>`;
    el.querySelectorAll('th[data-k]').forEach(th => { th.querySelector('.sort-ind').textContent = th.dataset.k === st.sortKey ? (st.dir > 0 ? ' ▲' : ' ▼') : ''; });
    const nums = [];
    for (let p = 0; p < pages; p++) if (p === 0 || p === pages - 1 || Math.abs(p - st.page) <= 1) nums.push(p); else if (nums.at(-1) !== '…') nums.push('…');
    pager.innerHTML = `<span>${list.length} registro${list.length === 1 ? '' : 's'}</span>
      <span class="row" style="gap:4px">
        <button class="btn btn-sm btn-ghost" data-p="${st.page - 1}" ${st.page === 0 ? 'disabled' : ''} aria-label="Anterior">←</button>
        ${nums.map(n => n === '…' ? '<span class="muted">…</span>' : `<button class="btn btn-sm ${n === st.page ? 'btn-primary' : 'btn-ghost'}" data-p="${n}">${n + 1}</button>`).join('')}
        <button class="btn btn-sm btn-ghost" data-p="${st.page + 1}" ${st.page >= pages - 1 ? 'disabled' : ''} aria-label="Siguiente">→</button>
      </span>`;
  }
  el.querySelector('.tbl-q')?.addEventListener('input', debounce(e => { st.q = e.target.value; st.page = 0; render(); }, 150));
  el.querySelectorAll('.tbl-f').forEach(s => s.addEventListener('change', () => { st.f[filters[+s.dataset.f].key] = s.value; st.page = 0; render(); }));
  el.querySelector('thead').addEventListener('click', e => { const k = e.target.closest('th')?.dataset.k; if (!k) return; st.dir = st.sortKey === k ? -st.dir : 1; st.sortKey = k; render(); });
  pager.addEventListener('click', e => { const p = e.target.closest('[data-p]'); if (p && !p.disabled) { st.page = +p.dataset.p; render(); } });
  tbody.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-i]'); if (!tr) return;
    const row = current[+tr.dataset.i];
    const act = e.target.closest('[data-act]');
    if (act) { onAction && onAction(act.dataset.act, row, act); return; }
    if (onRow && !e.target.closest('button, a, input, select, label')) onRow(row);
  });
  render();
  return { update(r) { rows = r; render(); }, filtered };
}

// ---------------------------------------------------------------------------
// Shell de panel (admin y apps por rol) sobre .admin-shell del núcleo.
// nav: [{ section, items: [{ href, label, ico, count?: () => n }] }]
// ---------------------------------------------------------------------------
export function mountShell({ brand, sub = '', logo = '★', nav, user, roleName, siteHref = 'index.html', siteLabel = 'Ver sitio', onLogout, footExtra = '' }) {
  (document.getElementById('app') || document.body).innerHTML = `
  <div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Menú principal">
      <a class="admin-brand" href="${siteHref}"><span class="logo" aria-hidden="true">${escape(logo)}</span><span class="brand-txt">${escape(brand)}<small class="muted">${escape(sub)}</small></span></a>
      <nav class="shell-nav"></nav>
      <div class="sidebar-foot">
        ${footExtra}
        <div class="row user-chip" style="gap:10px;flex-wrap:nowrap">
          <span class="avatar" style="--av:${escape(user.color || 'var(--primary)')}">${escape(initialsSafe(user.name))}</span>
          <span class="small" style="min-width:0"><b class="ellipsis">${escape(user.name)}</b><span class="muted ellipsis">${escape(roleName)}</span></span>
        </div>
        <button class="btn btn-sm btn-ghost btn-block" data-logout>Cerrar sesión</button>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="btn admin-burger btn-icon" aria-label="Abrir menú">☰</button>
        <b class="topbar-title ellipsis"></b>
        <span class="spacer"></span>
        <span class="topbar-extra row" style="gap:8px"></span>
        <a class="btn btn-ghost btn-sm hide-sm" href="${siteHref}">${escape(siteLabel)}</a>
      </header>
      <main class="admin-content" id="view" tabindex="-1"></main>
    </div>
  </div>`;
  const navEl = document.querySelector('.shell-nav');
  const renderNav = () => {
    navEl.innerHTML = nav.map(s => `${s.section ? `<div class="nav-section">${escape(s.section)}</div>` : ''}${s.items.map(it => {
      const c = it.count ? it.count() : 0;
      return `<a class="nav-link" href="${it.href}"><span class="ico" aria-hidden="true">${it.ico || '•'}</span>${escape(it.label)}${c ? `<span class="count">${c}</span>` : ''}</a>`;
    }).join('')}`).join('');
  };
  renderNav();
  document.querySelector('[data-logout]').addEventListener('click', onLogout);
  return {
    view: document.getElementById('view'),
    renderNav,
    setTitle: t => { document.querySelector('.topbar-title').textContent = t; },
    topExtra: document.querySelector('.topbar-extra')
  };
}

// ---------------------------------------------------------------------------
// Pequeños helpers de presentación
// ---------------------------------------------------------------------------
export const badge = (text, kind = '') => `<span class="badge ${kind ? 'badge-' + kind : ''}">${escape(text)}</span>`;
export const pageHead = (title, sub = '', actions = '') => `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div><div class="row" style="gap:8px">${actions}</div></div>`;
export const statCard = (label, value, extra = '', delta = '') => `<div class="card"><div class="stat"><span class="label">${escape(label)}</span><span class="value">${value}</span>${delta}${extra ? `<span class="small muted">${extra}</span>` : ''}</div></div>`;
export const empty = (text, icon = '∅') => `<div class="empty"><span class="icon" aria-hidden="true">${icon}</span>${escape(text)}</div>`;
export const avatar = (u, size = 36) => `<span class="avatar" style="--size:${size}px;--av:${escape(u?.color || 'var(--primary)')}">${escape(initialsSafe(u?.name || '?'))}</span>`;
export const denied = (msg = 'Tu rol no tiene permiso para ver esta sección.') => `<div class="card denied"><div class="empty"><span class="icon" aria-hidden="true">⛔</span><h2>Acceso restringido</h2><p>${escape(msg)}</p><a class="btn btn-primary" href="#/">Volver al inicio</a></div></div>`;

// Barras horizontales (ranking / embudo) con .progress del kit.
export function hBars(items, { format = v => v, max } = {}) {
  const m = max ?? Math.max(1, ...items.map(i => i.value));
  return `<div class="hbars">${items.map(i => `<div class="hbar"><div class="row between small"><span>${escape(i.label)}</span><b>${escape(format(i.value))}</b></div><div class="progress ${i.cls || ''}"><i style="--v:${Math.max(2, (i.value / m) * 100).toFixed(1)}%"></i></div></div>`).join('')}</div>`;
}

// Calendario mensual. items: [{ date: 'YYYY-MM-DD', label, kind }]
export function monthCalendar(year, month, items, { title = true } = {}) {
  const first = new Date(year, month, 1), days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const today = ymd(new Date());
  const by = {};
  items.forEach(it => { (by[it.date] ||= []).push(it); });
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<div class="cal-cell out"></div>');
  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const list = by[key] || [];
    cells.push(`<div class="cal-cell ${key === today ? 'today' : ''} ${list.length ? 'has' : ''}" data-date="${key}"><span class="cal-d">${d}</span>${list.slice(0, 3).map(it => `<span class="cal-ev ${it.kind ? 'k-' + it.kind : ''}" title="${escape(it.label)}">${escape(it.label)}</span>`).join('')}${list.length > 3 ? `<span class="cal-more">+${list.length - 3}</span>` : ''}</div>`);
  }
  const name = first.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  return `<div class="cal">${title ? `<div class="cal-title">${escape(name)}</div>` : ''}<div class="cal-grid">${['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => `<div class="cal-h">${d}</div>`).join('')}${cells.join('')}</div></div>`;
}

export function ymd(d) { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// Imprime solo el HTML dado (informes, boletas) usando @media print de app.css.
export function printHTML(inner) {
  let root = document.querySelector('.print-root');
  if (!root) { root = document.createElement('div'); root.className = 'print-root'; document.body.appendChild(root); }
  root.innerHTML = inner;
  document.documentElement.classList.add('printing');
  const done = () => { document.documentElement.classList.remove('printing'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1500);
}

// Lee un <form> a objeto.
export function formData(form) {
  const out = {};
  new FormData(form).forEach((v, k) => { out[k] = typeof v === 'string' ? v.trim() : v; });
  form.querySelectorAll('input[type=checkbox][name]').forEach(c => { if (!c.value || c.value === 'on') out[c.name] = c.checked; });
  return out;
}

// Re-render seguro tras cambios en la DB: no pisa formularios en edición ni modales abiertos.
export function liveRender(db, fn, { delay = 60 } = {}) {
  let t;
  db.subscribe(() => {
    clearTimeout(t);
    t = setTimeout(() => {
      const a = document.activeElement;
      if (document.querySelector('.modal-backdrop')) return;
      if (a && a.matches('input:not([type=checkbox]):not([type=radio]), textarea, select') && a.closest('#view, main') && a.closest('form')) return;
      fn();
    }, delay);
  });
}
