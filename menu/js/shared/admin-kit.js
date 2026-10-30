// Mini framework del panel: shell, navegación por rol, rutas protegidas y utilidades de vistas.
import { html, raw, escape, dataTable, downloadCSV, wireAdminShell, confirm, toast, debounce } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { initials } from '../../../assets/core/auth.js';

export function mountAdmin({ root, db, auth, brand, logo = '★', sections, links = [], counts = () => ({}), loginUrl = 'login.html' }) {
  const user = auth.current();
  const can = id => { const s = sections.find(x => x.id === id); return !!s && (!s.roles || s.roles.includes(auth.current()?.role)); };
  const allowed = sections.filter(s => can(s.id));
  const groups = [...new Set(allowed.map(s => s.group || 'General'))];
  root.innerHTML = `<div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Menú del panel">
      <div class="admin-brand"><span class="logo">${escape(logo)}</span><span>${escape(brand)}</span></div>
      ${groups.map(g => `<div class="nav-section">${escape(g)}</div>${allowed.filter(s => (s.group || 'General') === g).map(s => `<a class="nav-link" href="#/${s.id}" data-sec="${s.id}"><span class="ico" aria-hidden="true">${s.icon}</span>${escape(s.label)}<span class="count" hidden></span></a>`).join('')}`).join('')}
      ${links.length ? `<div class="nav-section">Apps</div>${links.filter(l => !l.roles || l.roles.includes(user.role)).map(l => `<a class="nav-link" href="${l.href}"><span class="ico" aria-hidden="true">${l.icon}</span>${escape(l.label)}</a>`).join('')}` : ''}
      <div class="side-user">
        <span class="avatar" style="--av:${escape(user.color || 'var(--primary)')}">${escape(initials(user.name))}</span>
        <span class="grow"><b>${escape(user.name)}</b><small class="muted d-block">${escape(auth.roleName(user.role))}</small></span>
        <button class="btn btn-ghost btn-icon btn-sm" data-logout title="Cerrar sesión" aria-label="Cerrar sesión">⎋</button>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="btn btn-icon admin-burger" aria-label="Abrir menú">☰</button>
        <b class="top-title" id="topTitle"></b>
        <span class="grow"></span>
        <button class="btn btn-sm btn-ghost" data-reset title="Restablecer datos demo">↺<span class="hide-sm"> Restablecer demo</span></button>
        <button class="btn btn-sm" data-logout><span class="hide-sm">Salir</span><span class="show-sm" aria-hidden="true">⎋</span></button>
      </header>
      <main class="admin-content" id="content" tabindex="-1"></main>
    </div>
  </div>`;
  wireAdminShell(root.querySelector('.admin-shell'));
  const content = root.querySelector('#content');
  let active = null;

  root.addEventListener('click', async e => {
    if (e.target.closest('[data-logout]')) { auth.logout(); location.href = loginUrl; }
    if (e.target.closest('[data-reset]')) {
      if (await confirm('Se borrarán todos los cambios y se cargarán los datos de demostración originales.', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) {
        const uid = auth.current()?.id;
        db.reset();
        if (!db.get('users', uid)) { auth.logout(); location.href = loginUrl; return; }
        db.log('reset', 'Datos de demostración restablecidos', uid);
        toast('Datos restablecidos', 'success');
        router.refresh();
      }
    }
  });

  function paintCounts() {
    const c = counts();
    root.querySelectorAll('.nav-link[data-sec]').forEach(a => {
      const n = c[a.dataset.sec], b = a.querySelector('.count');
      b.hidden = !n; b.textContent = n || '';
    });
  }

  const forbidden = s => `<div class="card empty"><span class="icon">🔒</span><h2>Acceso restringido</h2><p>Tu rol (<b>${escape(auth.roleName(auth.current().role))}</b>) no tiene permiso para ver <b>${escape(s?.label || 'esta sección')}</b>.</p><a class="btn btn-primary" href="#/${allowed[0]?.id || ''}">Ir a mi inicio</a></div>`;

  async function show(id, params = {}, query = {}) {
    const s = sections.find(x => x.id === id);
    const u = auth.current();
    if (!u || u.active === false) { auth.logout(); location.href = loginUrl; return; }
    root.querySelector('#topTitle').textContent = s ? s.label : 'No encontrado';
    if (!s) { content.innerHTML = '<div class="card empty"><span class="icon">🧭</span>Sección no encontrada.</div>'; active = null; return; }
    if (!can(id)) { content.innerHTML = forbidden(s); active = null; return; }
    const ctx = { params, query, user: u, can, db, auth, refresh: () => show(id, params, query) };
    content.replaceChildren();
    const box = document.createElement('div'); box.className = 'stack sec-' + id; content.appendChild(box);
    active = { s, box, ctx, res: (await s.render(box, ctx)) || {} };
    document.title = `${s.label} · ${brand}`;
    paintCounts();
  }

  const table = {};
  sections.forEach(s => { table['/' + s.id] = (p, q) => show(s.id, p, q); table['/' + s.id + '/:sub'] = (p, q) => show(s.id, p, q); });
  table['/'] = () => router.go('/' + (allowed[0]?.id || ''));
  const router = createRouter(table, { notFound: () => show(null), after: () => router.highlight(root.querySelector('.admin-sidebar')) });

  // Acumula los cambios entre repintados (el debounce solo recibiría el último)
  let queued = new Set();
  const flush = debounce(() => {
    paintCounts();
    if (!active) { queued.clear(); return; }
    if (document.querySelector('.modal-backdrop')) return; // no repintar bajo un modal abierto (se reintenta al cerrar)
    const ae = document.activeElement;
    if (ae && content.contains(ae) && ae.matches('input:not([type=checkbox]):not([type=search]), textarea, select')) { queued.clear(); return; } // no borrar lo que se está escribiendo
    const w = active.s.watch;
    const hit = queued.has('*') || !w || [...queued].some(c => w.includes(c));
    queued.clear();
    if (hit) active.res.refresh ? active.res.refresh() : show(active.s.id, active.ctx.params, active.ctx.query);
  }, 120);
  const onChange = change => {
    const t = change?.type;
    queued.add(t === 'reset' || t === 'sync' ? '*' : t === 'log' ? '_log' : t === 'value' ? 'settings' : change?.col);
    flush();
  };
  db.subscribe(onChange);
  // Al cerrar un modal, aplicar los cambios que quedaron en cola
  new MutationObserver(() => { if (!document.querySelector('.modal-backdrop') && queued.size) flush(); }).observe(document.body, { childList: true });

  router.start();
  return { router, can, paintCounts };
}

// ---------- Utilidades de vistas ----------
export const pageHead = (title, sub = '', actions = '') => `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div><div class="row">${actions}</div></div>`;
export const badge = (map, v) => { const m = map[v] || { label: v, badge: '' }; return `<span class="badge ${m.badge ? 'badge-' + m.badge : ''}">${escape(m.label)}</span>`; };
export const kpi = (label, value, delta = '', up = true) => `<div class="card stat kpi"><span class="label">${escape(label)}</span><span class="value">${escape(value)}</span>${delta ? `<span class="delta ${up ? 'up' : 'down'}">${escape(delta)}</span>` : ''}</div>`;

// Tabla con filtros (selects), búsqueda, orden, paginación y exportación CSV.
// opts: { rows: () => [], columns, filters: [{ key, label, options: [[v, l]], test?(row, v) }], search(row), onRow, csv: { name, map(row) }, pageSize, actions }
export function smartTable(el, opts) {
  const state = Object.fromEntries((opts.filters || []).map(f => [f.key, f.value ?? '']));
  el.innerHTML = `<div class="row table-tools">
      ${(opts.filters || []).map(f => `<select class="select sm" data-f="${f.key}" aria-label="${escape(f.label)}"><option value="">${escape(f.label)}: todos</option>${f.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(v)}" ${String(state[f.key]) === String(v) ? 'selected' : ''}>${escape(l)}</option>`; }).join('')}</select>`).join('')}
      <span class="grow"></span>
      ${opts.csv ? '<button class="btn btn-sm" data-csv>⇩ CSV</button>' : ''}
      ${opts.actions || ''}
    </div><div data-dt></div>`;
  // Los interruptores dentro de una fila no deben abrir el detalle de la fila
  el.addEventListener('click', e => { if (e.target.closest('.switch, .no-row')) e.stopPropagation(); }, true);
  const filtered = () => opts.rows().filter(r => (opts.filters || []).every(f => !state[f.key] || (f.test ? f.test(r, state[f.key]) : String(r[f.key]) === String(state[f.key]))));
  const dt = dataTable(el.querySelector('[data-dt]'), { rows: filtered(), columns: opts.columns, pageSize: opts.pageSize || 10, search: opts.search, onRow: opts.onRow, empty: opts.empty || 'Sin resultados' });
  el.querySelector('.table-tools').addEventListener('change', e => { const s = e.target.closest('[data-f]'); if (!s) return; state[s.dataset.f] = s.value; dt.update(filtered()); });
  el.querySelector('[data-csv]')?.addEventListener('click', () => {
    const rows = filtered();
    if (!rows.length) { toast('No hay filas para exportar', 'warning'); return; }
    downloadCSV(`${opts.csv.name}-${new Date().toISOString().slice(0, 10)}.csv`, rows.map(opts.csv.map));
    toast(`Exportadas ${rows.length} filas`, 'success');
  });
  return { refresh: () => dt.update(filtered()), state };
}

// Formulario personalizado en modal: devuelve el <form> y un close
export { html, raw };
