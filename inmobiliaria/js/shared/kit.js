// Piezas reutilizables de los paneles: shell con permisos por rol, tablas CRUD, formularios y calendario.
import { createRouter } from '../../../assets/core/router.js';
import { html, raw, escape, dataTable, downloadCSV, modal, toast, confirm, wireAdminShell, $, debounce } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';

export const pageHead = (title, sub = '', actions = '') => `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div><div class="row" style="gap:8px">${actions}</div></div>`;
export const kpi = (label, value, delta = '', up = true) => `<div class="card"><div class="stat"><span class="label">${escape(label)}</span><span class="value">${escape(value)}</span>${delta ? `<span class="delta ${up ? 'up' : 'down'}">${escape(delta)}</span>` : ''}</div></div>`;
export const avatar = (name, color, size = 32) => `<span class="avatar" style="--av:${escape(color || 'var(--primary)')};--size:${size}px">${escape(initials(name))}</span>`;
export const forbidden = () => `<div class="card empty"><span class="icon">🔒</span><h2>Sin permiso</h2><p>Tu rol no tiene acceso a esta sección. Pide a un administrador que ajuste tus permisos.</p><a class="btn" href="#/">Volver al inicio</a></div>`;

// ---------- Shell con navegación filtrada por rol ----------
export function mountShell({ root = document.getElementById('app'), auth, db, brand, logo, sections, user, links = '', subtitle = '', onReset }) {
  const allowed = s => !s.roles || s.roles.includes(user.role);
  const groups = [];
  sections.forEach(s => { if (s.hidden) return; let g = groups.find(x => x.name === (s.group || '')); if (!g) groups.push(g = { name: s.group || '', items: [] }); g.items.push(s); });
  root.innerHTML = `<div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Navegación">
      <a class="admin-brand" href="#/"><span class="logo">${escape(logo)}</span><span>${escape(brand)}${subtitle ? `<small class="side-sub">${escape(subtitle)}</small>` : ''}</span></a>
      ${groups.map(g => `${g.name ? `<div class="nav-section">${escape(g.name)}</div>` : ''}${g.items.filter(allowed).map(s => `<a class="nav-link" href="#/${s.id}" data-sec="${s.id}"><span class="ico" aria-hidden="true">${s.ico}</span>${escape(s.label)}<span class="count" data-count="${s.id}" hidden></span></a>`).join('')}`).join('')}
      <div class="side-foot">
        <div class="row" style="gap:10px;flex-wrap:nowrap">${avatar(user.name, user.color, 36)}<div style="min-width:0"><b class="ellipsis">${escape(user.name)}</b><small class="muted ellipsis">${escape(auth.roleName(user.role))}</small></div></div>
        ${links}
        <button class="btn btn-sm btn-ghost btn-block" data-logout>Cerrar sesión</button>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="btn btn-ghost btn-icon admin-burger" aria-label="Abrir menú">☰</button>
        <strong class="top-title"></strong>
        <div class="row top-actions" style="gap:8px;margin-left:auto"><span class="badge badge-primary role-badge">${escape(auth.roleName(user.role))}</span>${onReset ? '<button class="btn btn-sm btn-ghost" data-reset title="Volver a los datos de ejemplo">↺ <span class="hide-sm">Restablecer demo</span></button>' : ''}</div>
      </header>
      <main class="admin-content" id="view" tabindex="-1"></main>
    </div></div>`;
  wireAdminShell(root.querySelector('.admin-shell'));
  let view = $('#view', root);
  const title = $('.top-title', root);
  const freshView = () => { const n = document.createElement('main'); n.className = 'admin-content'; n.id = 'view'; n.tabIndex = -1; view.replaceWith(n); view = n; ctx.view = n; return n; };
  root.querySelector('[data-logout]').onclick = () => { auth.logout(); location.href = 'login.html'; };
  root.querySelector('[data-reset]')?.addEventListener('click', async () => {
    if (!(await confirm('Se borrarán todos los cambios y se restaurarán los datos de ejemplo.', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true }))) return;
    onReset();
  });

  const ctx = {
    db, auth, user, view,
    can: id => { const s = sections.find(x => x.id === id); return !!s && allowed(s); },
    refresh: () => router.refresh(),
    go: p => router.go(p)
  };
  function show(s, params, query) {
    title.textContent = s.label;
    document.title = `${s.label} · ${brand}`;
    freshView();
    if (!allowed(s)) { view.innerHTML = forbidden(); toast('No tienes permiso para esa sección', 'warning'); return; }
    try { s.render(view, params || {}, query || {}, ctx); } catch (e) { console.error(e); view.innerHTML = `<div class="card empty">Error al cargar la sección: ${escape(e.message)}</div>`; }
  }
  const routes = { '/': (p, q) => { const first = sections.find(s => allowed(s) && !s.hidden); router.current.path = '/' + first.id; show(first, p, q); } };
  sections.forEach(s => {
    routes['/' + s.id] = (p, q) => show(s, p, q);
    routes['/' + s.id + '/:sub'] = (p, q) => show(s, p, q);
  });
  const router = createRouter(routes, {
    notFound: () => { freshView(); view.innerHTML = `<div class="card empty"><h2>Página no encontrada</h2><a class="btn" href="#/">Ir al inicio</a></div>`; },
    after: () => { router.highlight(root.querySelector('.admin-sidebar')); if (router.current.path === '/' ) root.querySelector('.nav-link')?.classList.add('active'); view.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  });
  const counts = () => sections.forEach(s => {
    const el = root.querySelector(`[data-count="${s.id}"]`);
    if (!el || !s.count) return;
    const n = s.count(); el.hidden = !n; el.textContent = n;
  });
  const reRender = debounce(() => router.refresh(), 120);
  db.subscribe(ch => {
    const u = auth.current();
    if (!u || u.active === false || !u.role || u.role !== user.role) { location.href = 'login.html'; return; }
    counts();
    if (ch.type === 'sync' || ch.type === 'reset') {
      const a = document.activeElement;
      if (document.querySelector('.modal-backdrop') || (a && view.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) return;
      reRender();
    }
  });
  counts();
  router.start();
  return ctx;
}

// ---------- Tabla CRUD con filtros, búsqueda, orden, paginación y CSV ----------
export function crudTable(el, { rows, columns, search, filters = [], pageSize = 10, onRow, csv, actions = '', empty = 'Sin resultados' }) {
  const state = Object.fromEntries(filters.map(f => [f.key, f.value ?? '']));
  el.innerHTML = `<div class="toolbar">
      <div class="row filters" style="gap:8px">${filters.map(f => `<select class="select select-sm" data-f="${f.key}" aria-label="${escape(f.label)}"><option value="">${escape(f.label)}: todos</option>${f.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(v)}" ${String(state[f.key]) === String(v) ? 'selected' : ''}>${escape(l)}</option>`; }).join('')}</select>`).join('')}</div>
      <div class="row" style="gap:8px">${csv ? '<button class="btn btn-sm" data-csv>⇩ Exportar CSV</button>' : ''}${actions}</div>
    </div><div data-dt></div>`;
  const list = () => (typeof rows === 'function' ? rows() : rows).filter(r => filters.every(f => !state[f.key] || (f.fn ? f.fn(r, state[f.key]) : String(r[f.key]) === String(state[f.key]))));
  const dt = dataTable(el.querySelector('[data-dt]'), { rows: list(), columns, pageSize, search, onRow, empty });
  el.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { state[s.dataset.f] = s.value; dt.update(list()); }));
  el.querySelector('[data-csv]')?.addEventListener('click', () => {
    const data = list().map(csv.map);
    if (!data.length) return toast('No hay filas para exportar', 'warning');
    downloadCSV(csv.name, data); toast(`Exportadas ${data.length} filas`, 'success');
  });
  return { refresh: () => dt.update(list()), rows: list };
}

// ---------- Formulario en modal con grilla de 2 columnas ----------
// fields: [{ name, label, type, options, required, full, help, min, max, step, placeholder }] | { section: 'Título' }
export function editForm({ title, fields, values = {}, submit = 'Guardar', size = 'lg', extra = '' }) {
  return new Promise(resolve => {
    let done = false;
    const f = document.createElement('form');
    f.className = 'form-grid'; f.noValidate = true;
    f.innerHTML = fields.map(fd => {
      if (fd.section) return `<h4 class="form-sec full">${escape(fd.section)}</h4>`;
      const id = 'ef-' + fd.name, v = values[fd.name] ?? fd.value ?? '', req = fd.required ? 'required' : '';
      const attrs = ['min', 'max', 'step', 'placeholder'].filter(k => fd[k] != null).map(k => `${k}="${escape(fd[k])}"`).join(' ');
      let input;
      if (fd.type === 'textarea') input = `<textarea class="textarea" id="${id}" name="${fd.name}" ${req} ${attrs}>${escape(v)}</textarea>`;
      else if (fd.type === 'select') input = `<select class="select" id="${id}" name="${fd.name}" ${req}>${fd.options.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${escape(ol)}</option>`; }).join('')}</select>`;
      else if (fd.type === 'checkbox') return `<label class="check ${fd.full ? 'full' : ''}"><input type="checkbox" name="${fd.name}" ${v ? 'checked' : ''}> ${escape(fd.label)}</label>`;
      else if (fd.type === 'chips') return `<div class="field full"><span class="label">${escape(fd.label)}</span><div class="row chips" style="gap:6px" data-chips="${fd.name}">${fd.options.map(o => `<button type="button" class="chip ${(v || []).includes(o) ? 'active' : ''}" data-v="${escape(o)}" aria-pressed="${(v || []).includes(o)}">${escape(o)}</button>`).join('')}</div></div>`;
      else input = `<input class="input" id="${id}" name="${fd.name}" type="${fd.type || 'text'}" value="${escape(v)}" ${req} ${attrs}>`;
      return `<div class="field ${fd.full ? 'full' : ''}"><label for="${id}">${escape(fd.label)}${fd.required ? ' *' : ''}</label>${input}${fd.help ? `<small class="muted">${escape(fd.help)}</small>` : ''}</div>`;
    }).join('') + extra;
    f.addEventListener('click', e => { const c = e.target.closest('[data-chips] .chip'); if (c) { c.classList.toggle('active'); c.setAttribute('aria-pressed', c.classList.contains('active')); } });
    const m = modal({ title, body: f, size, foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-submit>${escape(submit)}</button>`, onClose: () => !done && resolve(null) });
    const go = e => {
      e && e.preventDefault();
      let ok = true; const out = {};
      fields.forEach(fd => {
        if (fd.section) return;
        if (fd.type === 'chips') { out[fd.name] = [...f.querySelectorAll(`[data-chips="${fd.name}"] .chip.active`)].map(c => c.dataset.v); return; }
        const el = f.elements[fd.name];
        if (fd.type === 'checkbox') { out[fd.name] = el.checked; return; }
        const val = el.value.trim();
        const bad = (fd.required && !val) || (fd.type === 'email' && val && !/^\S+@\S+\.\S+$/.test(val));
        el.classList.toggle('invalid', bad); if (bad) ok = false;
        out[fd.name] = fd.type === 'number' ? (val === '' ? null : Number(val)) : val;
      });
      if (!ok) { toast('Revisa los campos marcados', 'warning'); return; }
      done = true; m.close(); resolve(out);
    };
    f.addEventListener('submit', go);
    m.el.querySelector('[data-submit]').onclick = go;
  });
}

// ---------- Calendario mensual ----------
export const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
export function monthGrid(year, month, cell) {
  const first = new Date(year, month, 1), start = (first.getDay() + 6) % 7, days = new Date(year, month + 1, 0).getDate();
  const today = dayKey(new Date());
  let out = WEEKDAYS.map(w => `<div class="cal-h">${w}</div>`).join('');
  for (let i = 0; i < start; i++) out += '<div class="cal-d empty"></div>';
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d), k = dayKey(date);
    out += `<div class="cal-d ${k === today ? 'today' : ''}" data-day="${k}"><span class="cal-n">${d}</span>${cell(date, k) || ''}</div>`;
  }
  return `<div class="cal">${out}</div>`;
}
export const monthName = (y, m) => new Date(y, m, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

export const timeline = items => `<ol class="timeline">${items.map(i => `<li><span class="tl-dot"></span><div><b>${i.title}</b><div class="muted small">${i.meta}</div>${i.body ? `<div>${i.body}</div>` : ''}</div></li>`).join('')}</ol>`;

export { html, raw, escape, toast, confirm, modal };
