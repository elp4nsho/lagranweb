// Mini framework del panel: shell, navegación por rol, rutas protegidas,
// tablas con estado (búsqueda, filtros, orden, paginación, CSV) y helpers de UI.
import { escape, toast, downloadCSV, debounce, norm, wireAdminShell, ago } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { initials } from '../../../assets/core/auth.js';

// sections: [{ id, label, ico, group, roles: [...] | null, render(view, ctx), count?() }]
export function mountAdmin({ db, auth, brand, logo = '◆', siteHref = 'index.html', siteLabel = 'Ver sitio', sections, staffRoles, notifications = () => [], onReset }) {
  const user = auth.require(staffRoles, 'login.html');
  const shell = document.querySelector('.admin-shell');
  const sidebar = document.getElementById('sidebar');
  const view = document.getElementById('view');
  const topTitle = document.getElementById('topTitle');
  const topActions = document.getElementById('topActions');

  const me = () => auth.current() || user;
  const can = id => { const s = sections.find(x => x.id === id); return !!s && (!s.roles || s.roles.includes(me().role)); };
  let current = null;

  function renderNav() {
    const u = me();
    let lastGroup = null, out = `<a class="admin-brand" href="#/"><span class="logo">${logo}</span><span>${escape(brand)}</span></a>`;
    sections.filter(s => can(s.id) && !s.hidden).forEach(s => {
      if (s.group && s.group !== lastGroup) { out += `<div class="nav-section">${escape(s.group)}</div>`; lastGroup = s.group; }
      const c = s.count ? s.count() : 0;
      out += `<a class="nav-link" href="#/${s.id}"><span class="ico" aria-hidden="true">${s.ico || '•'}</span>${escape(s.label)}${c ? `<span class="count">${c}</span>` : ''}</a>`;
    });
    out += `<div class="nav-foot">
      <div class="row nav-user"><span class="avatar" style="--av:${escape(u.color || 'var(--primary)')}">${escape(initials(u.name))}</span>
      <span class="nav-user-txt"><b>${escape(u.name)}</b><small class="muted">${escape(auth.roleName(u.role))}</small></span></div>
      <a class="nav-link" href="${siteHref}" target="_blank" rel="noopener"><span class="ico">↗</span>${escape(siteLabel)}</a>
      <button class="nav-link nav-btn" data-logout type="button"><span class="ico">⎋</span>Cerrar sesión</button></div>`;
    sidebar.innerHTML = out;
    router && router.highlight(sidebar);
  }

  function renderTop() {
    const list = notifications();
    topActions.innerHTML = `
      <div class="notif-wrap">
        <button class="btn btn-ghost btn-icon notif-btn" type="button" aria-label="Notificaciones" aria-expanded="false" data-notif>🔔${list.length ? `<span class="notif-dot">${list.length}</span>` : ''}</button>
        <div class="notif-pop card" hidden>
          <b>Notificaciones</b>
          ${list.length ? list.map(n => `<a class="notif-item" href="${escape(n.href || '#/')}"><span class="badge badge-${n.type || 'info'} plain">${escape(n.tag || 'Aviso')}</span><span>${escape(n.text)}</span></a>`).join('') : '<p class="muted small">Todo al día ✓</p>'}
        </div>
      </div>
      <span class="avatar top-av" title="${escape(me().name)}" style="--av:${escape(me().color || 'var(--primary)')}">${escape(initials(me().name))}</span>`;
  }

  topActions.addEventListener('click', e => {
    const b = e.target.closest('[data-notif]');
    const pop = topActions.querySelector('.notif-pop');
    if (b) { pop.hidden = !pop.hidden; b.setAttribute('aria-expanded', String(!pop.hidden)); e.stopPropagation(); }
    else if (e.target.closest('.notif-item')) pop.hidden = true;
  });
  document.addEventListener('click', e => { const pop = topActions.querySelector('.notif-pop'); if (pop && !e.target.closest('.notif-wrap')) pop.hidden = true; });

  sidebar.addEventListener('click', e => {
    if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; }
  });

  function denied(s) {
    topTitle.textContent = 'Acceso restringido';
    view.innerHTML = `<div class="card empty"><span class="icon">🔒</span><h2>No tienes permiso</h2>
      <p>Tu rol <b>${escape(auth.roleName(me().role))}</b> no puede acceder a «${escape(s ? s.label : 'esta sección')}».</p>
      <a class="btn btn-primary" href="#/">Volver al inicio</a></div>`;
    toast('Sección restringida para tu rol', 'warning');
  }

  async function show(id, params = {}) {
    const s = sections.find(x => x.id === id);
    if (!s) { view.innerHTML = '<div class="card empty"><span class="icon">🧭</span><h2>Página no encontrada</h2><a class="btn" href="#/">Ir al inicio</a></div>'; return; }
    if (!can(id)) { current = null; return denied(s); }
    current = { s, params };
    topTitle.textContent = s.label;
    document.title = `${s.label} · ${brand}`;
    resetView();
    await s.render(view, ctx(params));
    router.highlight(sidebar);
  }

  // Las secciones usan view.onclick/onchange/...: se limpian en cada render para no duplicar handlers.
  function resetView() { ['onclick', 'onchange', 'oninput', 'onsubmit'].forEach(k => { view[k] = null; }); }

  function ctx(params) {
    return { params, user: me(), can, refresh, db, auth, role: me().role, sections };
  }

  function refresh() {
    if (!current) return;
    const y = window.scrollY;
    resetView();
    current.s.render(view, ctx(current.params));
    window.scrollTo(0, y);
  }

  const routes = { '/': () => router.go('/' + sections.find(s => can(s.id)).id) };
  sections.forEach(s => {
    routes['/' + s.id] = () => show(s.id);
    routes['/' + s.id + '/:id'] = ({ id }) => show(s.id, { id });
  });
  const router = createRouter(routes, { notFound: () => show('__none'), after: () => { renderNav(); window.scrollTo(0, 0); } });

  // Refresca la vista cuando cambian los datos (también desde el sitio público en otra pestaña),
  // salvo si el usuario está escribiendo o tiene un modal abierto.
  const onChange = debounce(change => {
    const u = auth.current();
    if (!u || !staffRoles.includes(u.role) || u.active === false) { location.replace('login.html'); return; }
    renderNav(); renderTop();
    const typing = document.activeElement && view.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (document.querySelector('.modal-backdrop') || typing || (current && current.s.live === false && change.type !== 'sync' && change.type !== 'reset')) return;
    refresh();
  }, 80);
  db.subscribe(onChange);

  wireAdminShell(shell);
  renderNav(); renderTop();
  router.start();
  return { router, refresh, can, me };
}

// ---------- Helpers de vista ----------
export const pageHead = (title, sub = '', actions = '') => `
  <div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted page-sub">${sub}</p>` : ''}</div>
  ${actions ? `<div class="row page-actions">${actions}</div>` : ''}</div>`;

export const kpi = (label, value, { delta, up = true, sub = '', ico = '' } = {}) => `
  <div class="card kpi"><div class="stat">
    <span class="label">${ico ? `<span aria-hidden="true">${ico}</span> ` : ''}${escape(label)}</span>
    <span class="value">${escape(value)}</span>
    ${delta ? `<span class="delta ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${escape(delta)}</span>` : ''}
    ${sub ? `<span class="small muted">${sub}</span>` : ''}
  </div></div>`;

export const badge = (label, type = '') => `<span class="badge ${type ? 'badge-' + type : ''}">${escape(label)}</span>`;

export function delta(curr, prev) {
  if (!prev) return { delta: curr ? 'nuevo' : '', up: true };
  const d = ((curr - prev) / prev) * 100;
  return { delta: `${Math.abs(d).toFixed(1).replace('.', ',')}% vs. periodo anterior`, up: d >= 0 };
}

export function activityList(entries, users, limit = 12) {
  if (!entries.length) return '<p class="muted">Sin actividad registrada.</p>';
  return `<ul class="activity">${entries.slice(0, limit).map(l => {
    const u = users.find(x => x.id === l.user);
    return `<li><span class="act-dot"></span><div><b>${escape(l.action)}</b> · ${escape(l.detail)}<br><small class="muted">${u ? escape(u.name) + ' · ' : ''}${escape(ago(l.at))}</small></div></li>`;
  }).join('')}</ul>`;
}

// ---------- Tabla con estado persistente entre renders ----------
const tableState = {};
// opts: { id, rows, columns: [{ key, label, render?, value?, sort? }], search?(row)→string, filters?: [{ key, label, options: [[v,l]], test?(row, v) }],
//         pageSize, onRow?(row), empty, toolbar (html), csv?: { name, map(row)→obj } }
export function table(el, opts) {
  const { id, columns, search, filters = [], pageSize = 10, onRow, empty = 'Sin resultados', toolbar = '', csv } = opts;
  let rows = opts.rows;
  const st = tableState[id] || (tableState[id] = { q: '', f: {}, sort: opts.sort?.key || null, dir: opts.sort?.dir || 1, page: 0 });
  el.innerHTML = `
    <div class="tbl-tools">
      ${search ? `<input class="input tbl-q" type="search" placeholder="Buscar…" aria-label="Buscar" value="${escape(st.q)}">` : ''}
      ${filters.map(f => `<select class="select tbl-f" data-f="${escape(f.key)}" aria-label="${escape(f.label)}">
        <option value="">${escape(f.label)}: todos</option>
        ${f.options.map(([v, l]) => `<option value="${escape(v)}" ${st.f[f.key] === String(v) ? 'selected' : ''}>${escape(l)}</option>`).join('')}</select>`).join('')}
      <span class="tbl-spacer"></span>
      ${csv ? '<button class="btn btn-sm" type="button" data-csv>⇩ Exportar CSV</button>' : ''}${toolbar}
    </div>
    <div class="table-wrap"><table class="table">
      <thead><tr>${columns.map(c => `<th ${c.sort !== false ? `data-k="${escape(c.key)}" class="sortable" tabindex="0"` : ''}>${escape(c.label)}<span class="sort-ind"></span></th>`).join('')}</tr></thead>
      <tbody></tbody></table></div>
    <div class="tbl-pager"></div>`;
  const tbody = el.querySelector('tbody'), pager = el.querySelector('.tbl-pager');

  const valueOf = (r, k) => { const c = columns.find(x => x.key === k); return c && c.value ? c.value(r) : r[k]; };
  function list() {
    let out = rows.filter(r => !st.q || norm(search(r)).includes(norm(st.q)));
    filters.forEach(f => {
      const v = st.f[f.key];
      if (v) out = out.filter(r => (f.test ? f.test(r, v) : String(r[f.key]) === v));
    });
    if (st.sort) out.sort((a, b) => {
      const x = valueOf(a, st.sort), y = valueOf(b, st.sort);
      return (typeof x === 'string' ? x.localeCompare(y, 'es') : (x > y) - (x < y)) * st.dir;
    });
    return out;
  }
  function render() {
    const all = list();
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    st.page = Math.min(st.page, pages - 1);
    const slice = all.slice(st.page * pageSize, (st.page + 1) * pageSize);
    tbody.innerHTML = slice.length ? slice.map((r, i) => `<tr data-i="${i}" ${onRow ? 'class="clickable"' : ''}>${columns.map(c => `<td data-label="${escape(c.label)}">${c.render ? c.render(r) : escape(r[c.key])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}"><div class="empty">${escape(empty)}</div></td></tr>`;
    if (onRow) tbody.querySelectorAll('tr[data-i]').forEach(tr => tr.addEventListener('click', e => { if (!e.target.closest('button, a, input, select, label')) onRow(slice[+tr.dataset.i]); }));
    el.querySelectorAll('th[data-k]').forEach(th => { th.querySelector('.sort-ind').textContent = th.dataset.k === st.sort ? (st.dir > 0 ? ' ▲' : ' ▼') : ''; });
    pager.innerHTML = `<span>${all.length} registro${all.length === 1 ? '' : 's'}</span>
      <span class="row" style="gap:6px"><button class="btn btn-sm btn-ghost" type="button" data-p="-1" ${st.page === 0 ? 'disabled' : ''} aria-label="Anterior">←</button>
      <span>${st.page + 1} / ${pages}</span><button class="btn btn-sm btn-ghost" type="button" data-p="1" ${st.page >= pages - 1 ? 'disabled' : ''} aria-label="Siguiente">→</button></span>`;
    opts.afterRender && opts.afterRender(el, slice);
  }
  el.querySelector('.tbl-q')?.addEventListener('input', debounce(e => { st.q = e.target.value; st.page = 0; render(); }, 150));
  el.querySelectorAll('.tbl-f').forEach(s => s.addEventListener('change', () => { st.f[s.dataset.f] = s.value; st.page = 0; render(); }));
  const sortBy = th => { const k = th.dataset.k; st.dir = st.sort === k ? -st.dir : 1; st.sort = k; render(); };
  el.querySelector('thead').addEventListener('click', e => { const th = e.target.closest('th[data-k]'); if (th) sortBy(th); });
  el.querySelector('thead').addEventListener('keydown', e => { const th = e.target.closest('th[data-k]'); if (th && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); sortBy(th); } });
  pager.addEventListener('click', e => { const p = e.target.closest('[data-p]'); if (p) { st.page += +p.dataset.p; render(); } });
  el.querySelector('[data-csv]')?.addEventListener('click', () => {
    const data = list().map(csv.map);
    if (!data.length) return toast('No hay filas para exportar', 'warning');
    downloadCSV(csv.name, data);
    toast(`CSV exportado (${data.length} filas)`, 'success');
  });
  render();
  return { list, update(r) { rows = r; render(); } };
}

// Lee un <form> a objeto simple.
export function formData(form) {
  const out = {};
  [...form.elements].forEach(el => {
    if (!el.name) return;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
    else if (el.type === 'number') out[el.name] = el.value === '' ? '' : Number(el.value);
    else out[el.name] = el.value.trim();
  });
  return out;
}

// Mini gráfico de embudo (barras horizontales proporcionales).
export function funnel(steps, fmt = v => v) {
  const max = Math.max(1, ...steps.map(s => s.value));
  return `<div class="funnel">${steps.map((s, i) => {
    const prev = i ? steps[i - 1].value : null;
    const rate = prev ? ((s.value / prev) * 100).toFixed(1).replace('.', ',') + '%' : '';
    return `<div class="funnel-row"><div class="row between small"><b>${escape(s.label)}</b><span>${escape(fmt(s.value))}${rate ? ` <span class="muted">· ${rate}</span>` : ''}</span></div>
      <div class="funnel-bar"><i style="--v:${Math.max(2, (s.value / max) * 100)}%"></i></div></div>`;
  }).join('')}</div>`;
}

// Barras horizontales con etiqueta (ranking).
export function hbars(items, fmt = v => v) {
  const max = Math.max(1, ...items.map(i => i.value));
  return `<div class="hbars">${items.map(i => `<div class="hbar"><span class="hbar-l">${i.swatch ? `<i class="sw" style="--sw:${escape(i.swatch)}"></i>` : ''}${escape(i.label)}</span>
    <span class="hbar-t"><i style="--v:${(i.value / max) * 100}%"></i></span><b>${escape(fmt(i.value))}</b></div>`).join('')}</div>`;
}
