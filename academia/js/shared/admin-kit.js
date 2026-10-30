// Kit de panel: shell con navegación por roles, tablas con filtros, CRUD genérico,
// formularios en modal con validación, KPIs, usuarios/roles y bitácora.
// Construido sobre el núcleo compartido (assets/core). Solo usa tokens y clases del kit.
import { html, raw, escape, toast, modal, confirm, downloadCSV, wireAdminShell, norm, debounce, date, dateTime, ago, $, $$ } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { initials } from '../../../assets/core/auth.js';

export { html, raw, escape, toast, modal, confirm, downloadCSV, norm, date, dateTime, ago, $, $$, initials };

export const badge = (text, kind = '') => html`<span class="badge ${kind ? 'badge-' + kind : ''}">${text}</span>`;
export const avatar = (u, size = 32) => html`<span class="avatar" style="--av:${u?.color || 'var(--primary)'};--size:${size}px">${initials(u?.name || '?')}</span>`;
export const person = (u, sub = '') => u ? html`<span class="ak-person">${raw(avatar(u))}<span><b>${u.name}</b>${sub ? raw(`<small class="muted">${escape(sub)}</small>`) : ''}</span></span>` : '<span class="muted">—</span>';
export const pctBar = (v) => html`<span class="ak-pct"><span class="progress"><i style="--v:${Math.round(v)}%"></i></span><b>${Math.round(v)}%</b></span>`;

// ---------- KPIs y tarjetas ----------
export function kpis(list) {
  return `<div class="ak-kpis">${list.map(k => `<div class="card"><div class="stat"><span class="label">${escape(k.label)}</span><span class="value">${escape(k.value)}</span>${k.delta != null ? `<span class="delta ${k.up === false ? 'down' : k.up ? 'up' : ''}">${escape(k.delta)}</span>` : ''}${k.hint ? `<span class="small muted">${escape(k.hint)}</span>` : ''}</div></div>`).join('')}</div>`;
}
export const panel = (title, body, extra = '') => `<section class="card ak-panel"><div class="row between ak-panel-head"><h3>${escape(title)}</h3>${extra}</div>${body}</section>`;
export const dl = (pairs) => `<dl class="ak-dl">${pairs.filter(Boolean).map(([k, v]) => `<dt>${escape(k)}</dt><dd>${v ?? '—'}</dd>`).join('')}</dl>`;
export function pageHead(title, sub = '', actions = '') {
  return `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${escape(sub)}</p>` : ''}</div><div class="row" style="gap:8px">${actions}</div></div>`;
}
export const denied = (msg = 'Tu rol no tiene permiso para ver esta sección.') =>
  `<div class="card empty"><span class="icon" aria-hidden="true">🔒</span><h2>Acceso restringido</h2><p>${escape(msg)}</p><a class="btn btn-primary" href="#/">Volver al inicio</a></div>`;

// ---------- Tabla con búsqueda, filtros, orden y paginación (estado persistente) ----------
const tableState = new Map();
export function table(el, { key, rows, columns, search, filters = [], pageSize = 10, onRow, toolbar = '', empty = 'Sin resultados', selectable }) {
  const st = tableState.get(key) || { q: '', f: {}, sort: null, dir: 1, page: 0 };
  tableState.set(key, st);
  el.innerHTML = `<div class="ak-toolbar">
      ${search ? `<input class="input ak-search" type="search" placeholder="Buscar…" aria-label="Buscar" value="${escape(st.q)}" data-q>` : ''}
      ${filters.map(f => `<select class="select ak-filter" data-f="${f.key}" aria-label="${escape(f.label)}"><option value="">${escape(f.label)}: todos</option>${f.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(v)}" ${String(st.f[f.key] ?? '') === String(v) ? 'selected' : ''}>${escape(l)}</option>`; }).join('')}</select>`).join('')}
      <span class="ak-toolbar-extra">${toolbar}</span>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr>${columns.map(c => `<th ${c.sort !== false ? `data-k="${c.key}" class="ak-sortable"` : ''} ${c.align ? `style="text-align:${c.align}"` : ''}>${escape(c.label)}<span class="ak-sort" data-arrow="${c.key}"></span></th>`).join('')}</tr></thead><tbody></tbody></table></div>
    <div class="row between small muted ak-pager" data-pager></div>`;
  const tbody = el.querySelector('tbody'), pager = el.querySelector('[data-pager]');
  let current = [];
  const filtered = () => {
    let list = rows.filter(r => (!st.q || norm(search(r)).includes(norm(st.q))) && filters.every(f => !st.f[f.key] || (f.test ? f.test(r, st.f[f.key]) : String(r[f.key]) === String(st.f[f.key]))));
    if (st.sort) {
      const col = columns.find(c => c.key === st.sort);
      const val = col?.value || (r => r[st.sort]);
      list = list.slice().sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'es', { numeric: true })) * st.dir; });
    }
    return list;
  };
  const render = () => {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    st.page = Math.min(st.page, pages - 1);
    current = list.slice(st.page * pageSize, st.page * pageSize + pageSize);
    tbody.innerHTML = current.length ? current.map((r, i) => `<tr data-i="${i}" ${onRow ? 'class="ak-click"' : ''}>${columns.map(c => `<td ${c.align ? `style="text-align:${c.align}"` : ''} data-label="${escape(c.label)}">${c.render ? c.render(r) : escape(r[c.key])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}"><div class="empty">${escape(empty)}</div></td></tr>`;
    pager.innerHTML = `<span>${list.length} registro${list.length === 1 ? '' : 's'}</span><span class="row" style="gap:6px"><button class="btn btn-sm btn-ghost" data-p="-1" ${st.page === 0 ? 'disabled' : ''} aria-label="Página anterior">←</button><span>${st.page + 1} / ${pages}</span><button class="btn btn-sm btn-ghost" data-p="1" ${st.page >= pages - 1 ? 'disabled' : ''} aria-label="Página siguiente">→</button></span>`;
    el.querySelectorAll('[data-arrow]').forEach(s => { s.textContent = s.dataset.arrow === st.sort ? (st.dir > 0 ? ' ▲' : ' ▼') : ''; });
  };
  el.querySelector('[data-q]')?.addEventListener('input', debounce(e => { st.q = e.target.value; st.page = 0; render(); }, 150));
  el.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { st.f[s.dataset.f] = s.value; st.page = 0; render(); }));
  el.querySelector('thead').addEventListener('click', e => { const k = e.target.closest('th')?.dataset.k; if (!k) return; st.dir = st.sort === k ? -st.dir : 1; st.sort = k; render(); });
  pager.addEventListener('click', e => { const p = e.target.closest('[data-p]'); if (p) { st.page += +p.dataset.p; render(); } });
  tbody.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-i]'); if (!tr) return;
    const row = current[+tr.dataset.i];
    const act = e.target.closest('[data-act]');
    if (act) { e.stopPropagation(); el.dispatchEvent(new CustomEvent('row-action', { bubbles: true, detail: { action: act.dataset.act, row } })); return; }
    if (onRow && !e.target.closest('button, a, input, select, label')) onRow(row);
  });
  render();
  return { filtered, render };
}

// ---------- Formularios en modal ----------
// fields: { name, label, type: text|email|number|password|date|textarea|select|checkbox|multi|color|heading, options, required, help, half, placeholder, min, max, step, value }
export function formDialog({ title, fields, values = {}, validate, submit = 'Guardar', size = '', intro = '' }) {
  return new Promise(resolve => {
    let done = false;
    const f = document.createElement('form');
    f.className = 'ak-form';
    f.noValidate = true;
    const opt = o => (Array.isArray(o) ? o : [o, o]);
    f.innerHTML = (intro ? `<p class="muted ak-full">${intro}</p>` : '') + fields.map(fd => {
      const id = 'akf-' + fd.name + '-' + Math.random().toString(36).slice(2, 6);
      const v = values[fd.name] ?? fd.value ?? (fd.type === 'multi' ? [] : '');
      const cls = fd.half ? 'field' : 'field ak-full';
      const req = fd.required ? ' *' : '';
      if (fd.type === 'heading') return `<h4 class="ak-full ak-form-h">${escape(fd.label)}</h4>`;
      if (fd.type === 'checkbox') return `<div class="${cls}"><label class="check"><input type="checkbox" name="${fd.name}" ${v ? 'checked' : ''}> ${escape(fd.label)}</label>${fd.help ? `<small class="muted">${escape(fd.help)}</small>` : ''}</div>`;
      let input;
      if (fd.type === 'textarea') input = `<textarea class="textarea" id="${id}" name="${fd.name}" ${fd.rows ? `rows="${fd.rows}"` : ''} placeholder="${escape(fd.placeholder || '')}">${escape(v)}</textarea>`;
      else if (fd.type === 'select') input = `<select class="select" id="${id}" name="${fd.name}">${fd.options.map(o => { const [ov, ol] = opt(o); return `<option value="${escape(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${escape(ol)}</option>`; }).join('')}</select>`;
      else if (fd.type === 'multi') input = `<div class="ak-multi" id="${id}" role="group">${fd.options.map(o => { const [ov, ol] = opt(o); return `<label class="check"><input type="checkbox" name="${fd.name}" value="${escape(ov)}" ${v.map(String).includes(String(ov)) ? 'checked' : ''}> ${escape(ol)}</label>`; }).join('')}</div>`;
      else input = `<input class="input" id="${id}" name="${fd.name}" type="${fd.type || 'text'}" value="${escape(v)}" ${fd.min != null ? `min="${fd.min}"` : ''} ${fd.max != null ? `max="${fd.max}"` : ''} ${fd.step ? `step="${fd.step}"` : ''} placeholder="${escape(fd.placeholder || '')}" ${fd.autocomplete ? `autocomplete="${fd.autocomplete}"` : ''}>`;
      return `<div class="${cls}" data-field="${fd.name}"><label for="${id}">${escape(fd.label)}${req}</label>${input}${fd.help ? `<small class="muted">${escape(fd.help)}</small>` : ''}<small class="error" data-err="${fd.name}"></small></div>`;
    }).join('');
    const m = modal({ title, body: f, size, foot: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-submit>${escape(submit)}</button>`, onClose: () => !done && resolve(null) });
    const read = () => {
      const out = {};
      fields.forEach(fd => {
        if (fd.type === 'heading') return;
        if (fd.type === 'checkbox') { out[fd.name] = f.elements[fd.name].checked; return; }
        if (fd.type === 'multi') { out[fd.name] = $$(`input[name="${fd.name}"]:checked`, f).map(i => i.value); return; }
        const val = f.elements[fd.name].value.trim();
        out[fd.name] = fd.type === 'number' ? (val === '' ? 0 : Number(val)) : val;
      });
      return out;
    };
    const go = async e => {
      e && e.preventDefault();
      const out = read();
      const errs = {};
      fields.forEach(fd => { if (fd.required && (fd.type === 'multi' ? !out[fd.name].length : out[fd.name] === '' || out[fd.name] == null)) errs[fd.name] = 'Campo obligatorio'; });
      if (validate) { const r = await validate(out); if (typeof r === 'string') { toast(r, 'warning'); return; } Object.assign(errs, r || {}); }
      $$('[data-err]', f).forEach(s => { s.textContent = errs[s.dataset.err] || ''; });
      $$('.input, .select, .textarea', f).forEach(i => i.classList.toggle('invalid', !!errs[i.name]));
      if (Object.keys(errs).length) { toast('Revisa los campos marcados', 'warning'); return; }
      done = true; m.close(); resolve(out);
    };
    f.addEventListener('submit', go);
    m.el.querySelector('[data-submit]').onclick = go;
  });
}

// ---------- CRUD genérico ----------
// cfg: { key, title, subtitle, singular, collection, rows(), columns, search, filters, fields(row), toRecord(values,row),
//        validate(values,row), canCreate, canEdit(row), canDelete(row), rowActions:[{act,label,show(row),run(row)}], onRow(row), csv(row), headActions }
export function crud(el, ctx, cfg) {
  const { db } = ctx;
  const rows = cfg.rows ? cfg.rows() : db.all(cfg.collection);
  const canCreate = cfg.canCreate !== false;
  const editable = r => (typeof cfg.canEdit === 'function' ? cfg.canEdit(r) : cfg.canEdit !== false);
  const deletable = r => (typeof cfg.canDelete === 'function' ? cfg.canDelete(r) : cfg.canDelete !== false);
  const actionsCol = {
    key: '_actions', label: 'Acciones', sort: false, align: 'right',
    render: r => `<span class="ak-actions">${(cfg.rowActions || []).filter(a => !a.show || a.show(r)).map(a => `<button class="btn btn-sm btn-ghost" data-act="${a.act}" title="${escape(a.label)}">${escape(a.icon ? a.icon + ' ' : '')}${escape(a.short ?? a.label)}</button>`).join('')}${editable(r) && cfg.fields ? `<button class="btn btn-sm btn-ghost" data-act="edit" aria-label="Editar">✎ Editar</button>` : ''}${deletable(r) ? `<button class="btn btn-sm btn-ghost ak-danger" data-act="delete" aria-label="Eliminar">🗑</button>` : ''}</span>`
  };
  el.innerHTML = pageHead(cfg.title, cfg.subtitle,
    `${cfg.headActions || ''}${cfg.csv ? `<button class="btn" data-csv>⬇ CSV</button>` : ''}${canCreate && cfg.fields ? `<button class="btn btn-primary" data-new>＋ Nuevo ${escape(cfg.singular || '')}</button>` : ''}`) + `<div data-table></div>`;
  const t = table(el.querySelector('[data-table]'), { key: cfg.key, rows, columns: [...cfg.columns, actionsCol], search: cfg.search, filters: cfg.filters, onRow: cfg.onRow, pageSize: cfg.pageSize || 10 });
  const edit = async row => {
    const values = await formDialog({ title: row ? `Editar ${cfg.singular || ''}` : `Nuevo ${cfg.singular || ''}`, fields: cfg.fields(row), values: row ? (cfg.toForm ? cfg.toForm(row) : row) : {}, validate: v => cfg.validate && cfg.validate(v, row), size: cfg.size || '' });
    if (!values) return;
    const rec = cfg.toRecord ? cfg.toRecord(values, row) : values;
    if (row) { db.update(cfg.collection, row.id, rec); db.log(`${cfg.singular || 'registro'} editado`, rec.name || rec.title || rec.code || row.id, ctx.user.id); toast('Cambios guardados', 'success'); cfg.afterSave && cfg.afterSave(row, values); }
    else { const n = db.insert(cfg.collection, rec); db.log(`${cfg.singular || 'registro'} creado`, rec.name || rec.title || rec.code || n.id, ctx.user.id); toast(`${cfg.singular ? cfg.singular[0].toUpperCase() + cfg.singular.slice(1) : 'Registro'} creado`, 'success'); cfg.afterSave && cfg.afterSave(n, values, true); }
  };
  el.querySelector('[data-new]')?.addEventListener('click', () => edit(null));
  el.querySelector('[data-csv]')?.addEventListener('click', () => { const list = t.filtered(); if (!list.length) return toast('No hay filas para exportar', 'warning'); downloadCSV(`${cfg.key}-${new Date().toISOString().slice(0, 10)}.csv`, list.map(cfg.csv)); toast(`${list.length} filas exportadas a CSV`, 'success'); });
  el.addEventListener('row-action', async e => {
    const { action, row } = e.detail;
    if (action === 'edit') return edit(row);
    if (action === 'delete') {
      if (cfg.beforeDelete) { const msg = cfg.beforeDelete(row); if (msg) return toast(msg, 'warning'); }
      if (!(await confirm(`¿Eliminar «${row.name || row.title || row.code || 'registro'}»? Esta acción no se puede deshacer.`, { title: 'Eliminar', ok: 'Eliminar', danger: true }))) return;
      db.remove(cfg.collection, row.id); db.log(`${cfg.singular || 'registro'} eliminado`, row.name || row.title || row.code || row.id, ctx.user.id); toast('Eliminado', 'success');
      return;
    }
    const a = (cfg.rowActions || []).find(x => x.act === action);
    a && a.run(row);
  });
  return { edit };
}

// ---------- Shell del panel ----------
// sections: [{ group, path, label, ico, roles, count?(), routes: { '/x': (el, params, ctx) => {}, '/x/:id': ... } }]
export function mountShell({ db, auth, brand, logo = '◆', allow, sections, loginUrl = 'login.html', links = [], onReset }) {
  let user;
  try { user = auth.require(allow, loginUrl); } catch (e) { return null; } // redirige al login sin error no capturado
  const ctx = { db, auth, user, can: (roles) => !roles || roles.includes(auth.current()?.role), go: p => router.go(p) };
  const root = document.getElementById('root') || document.body.appendChild(document.createElement('div'));
  root.innerHTML = `<div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Navegación del panel">
      <div class="admin-brand"><span class="logo" aria-hidden="true">${logo}</span><span>${escape(brand)}</span></div>
      <nav data-nav></nav>
      <div class="ak-side-foot">
        ${links.map(l => `<a class="nav-link" href="${l.href}" ${l.blank ? 'target="_blank" rel="noopener"' : ''}><span class="ico" aria-hidden="true">${l.ico || '↗'}</span>${escape(l.label)}</a>`).join('')}
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="btn btn-ghost btn-icon admin-burger" aria-label="Abrir menú">☰</button>
        <div class="ak-crumb muted small" data-crumb></div>
        <div class="row ak-top-actions">
          <button class="btn btn-ghost btn-sm" data-reset title="Restablecer datos demo">↺ <span class="ak-hide-sm">Restablecer demo</span></button>
          <div class="ak-user">${avatar(user, 32)}<span class="ak-hide-sm"><b>${escape(user.name)}</b><small class="muted">${escape(auth.roleName(user.role))}</small></span></div>
          <button class="btn btn-sm" data-logout>Salir</button>
        </div>
      </header>
      <main class="admin-content" id="main" tabindex="-1"></main>
    </div>
  </div>`;
  const shell = $('.admin-shell');
  wireAdminShell(shell);
  const main = $('#main');
  const role = () => auth.current()?.role;
  const visible = () => sections.filter(s => !s.roles || s.roles.includes(role()));
  const renderNav = () => {
    let g = null;
    $('[data-nav]').innerHTML = visible().map(s => {
      const head = s.group && s.group !== g ? `<div class="nav-section">${escape(s.group)}</div>` : '';
      g = s.group;
      const c = s.count ? s.count() : 0;
      return `${head}<a class="nav-link" href="#${s.path}"><span class="ico" aria-hidden="true">${s.ico}</span>${escape(s.label)}${c ? `<span class="count">${c}</span>` : ''}</a>`;
    }).join('');
    router.highlight($('[data-nav]'));
  };
  const routes = {};
  sections.forEach(s => Object.entries(s.routes).forEach(([p, fn]) => {
    routes[p] = params => {
      const u = auth.current();
      if (!u || u.active === false) { location.replace(loginUrl); return; }
      ctx.user = u;
      $('[data-crumb]').textContent = s.label;
      if (s.roles && !s.roles.includes(u.role)) { main.innerHTML = denied(); toast('No tienes permiso para esa sección', 'error'); return; }
      // Contenedor nuevo en cada render: los listeners de la vista anterior no se acumulan.
      const view = document.createElement('div');
      view.className = 'ak-view';
      main.replaceChildren(view);
      fn(view, params, ctx);
    };
  }));
  const router = createRouter(routes, {
    notFound: () => { main.innerHTML = `<div class="card empty"><span class="icon">🧭</span><h2>Página no encontrada</h2><a class="btn btn-primary" href="#${visible()[0]?.path || '/'}">Ir al inicio</a></div>`; },
    after: () => { renderNav(); }
  });
  let last = location.hash;
  router.start();
  window.addEventListener('hashchange', () => { if (location.hash !== last) { last = location.hash; main.focus({ preventScroll: true }); window.scrollTo(0, 0); } });
  const refresh = debounce(() => {
    const u = auth.current();
    if (!u || u.active === false || (allow && !allow.includes(u.role))) { location.replace(loginUrl); return; }
    if (document.querySelector('.modal-backdrop')) { renderNav(); return; } // no repintar bajo un modal abierto
    const y = window.scrollY;
    router.refresh();
    window.scrollTo(0, y);
  }, 60);
  db.subscribe(ch => { if (ch && ch.type === 'log') { renderNav(); return; } refresh(); });
  shell.addEventListener('click', async e => {
    if (e.target.closest('[data-logout]')) { auth.logout(); location.href = loginUrl; }
    if (e.target.closest('[data-reset]')) {
      if (!(await confirm('Se borrarán todos los cambios y se cargarán los datos de demostración originales. Tu sesión se mantendrá si tu usuario existe en la semilla.', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true }))) return;
      const email = auth.current()?.email;
      db.reset();
      const again = db.find('users', u => u.email === email);
      if (again) auth.loginAs(again.id);
      onReset && onReset();
      toast('Datos de demostración restablecidos', 'success');
      router.refresh();
    }
  });
  ctx.router = router;
  return ctx;
}

// ---------- Usuarios y roles ----------
export function usersSection(el, ctx, { roles, extraFields = () => [], extraColumns = [], roleKinds = {}, filterRoles, title = 'Usuarios y roles', subtitle = 'Crea cuentas, asigna roles y desactiva accesos.' }) {
  const { db, auth } = ctx;
  const colors = ['#e11d48', '#0891b2', '#7c3aed', '#16a34a', '#ea580c', '#2563eb', '#db2777', '#0d9488'];
  crud(el, ctx, {
    key: 'users-' + db.name, title, subtitle, singular: 'usuario', collection: 'users',
    rows: () => db.all('users').filter(u => !filterRoles || filterRoles.includes(u.role)),
    search: u => `${u.name} ${u.email} ${u.rut || ''}`,
    filters: [
      { key: 'role', label: 'Rol', options: Object.entries(roles) },
      { key: 'active', label: 'Estado', options: [['1', 'Activos'], ['0', 'Inactivos']], test: (u, v) => (u.active !== false) === (v === '1') }
    ],
    columns: [
      { key: 'name', label: 'Nombre', render: u => person(u, u.email) },
      { key: 'role', label: 'Rol', render: u => badge(roles[u.role] || u.role, roleKinds[u.role] || 'primary') },
      ...extraColumns,
      { key: 'active', label: 'Estado', render: u => u.active === false ? badge('Inactivo', 'danger') : badge('Activo', 'success') },
      { key: 'createdAt', label: 'Alta', render: u => date(u.createdAt) }
    ],
    fields: u => [
      { name: 'name', label: 'Nombre completo', required: true, half: true },
      { name: 'email', label: 'Correo', type: 'email', required: true, half: true },
      { name: 'role', label: 'Rol', type: 'select', options: Object.entries(roles), half: true },
      { name: 'password', label: u ? 'Nueva clave (opcional)' : 'Clave', type: 'text', required: !u, half: true },
      ...extraFields(u),
      { name: 'active', label: 'Cuenta activa', type: 'checkbox', value: true }
    ],
    toForm: u => ({ ...u, password: '' }),
    validate: (v, u) => {
      const e = {};
      if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) e.email = 'Correo no válido';
      if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== u?.id)) e.email = 'Ya existe un usuario con ese correo';
      if (u && u.id === ctx.user.id && v.role !== u.role) e.role = 'No puedes cambiar tu propio rol';
      if (u && u.id === ctx.user.id && !v.active) return 'No puedes desactivar tu propia cuenta';
      return e;
    },
    toRecord: (v, u) => { const r = { ...v }; if (!r.password) delete r.password; if (!u) r.color = colors[db.count('users') % colors.length]; return r; },
    canDelete: u => u.id !== ctx.user.id,
    rowActions: [
      { act: 'toggle', label: 'Activar/desactivar', short: '⏻', show: u => u.id !== ctx.user.id, run: u => { db.update('users', u.id, { active: u.active === false }); db.log(u.active === false ? 'usuario activado' : 'usuario desactivado', u.name, ctx.user.id); toast(u.active === false ? 'Usuario activado' : 'Usuario desactivado', 'success'); } }
    ],
    csv: u => ({ nombre: u.name, correo: u.email, rol: roles[u.role] || u.role, estado: u.active === false ? 'Inactivo' : 'Activo', alta: date(u.createdAt) })
  });
}

// ---------- Bitácora ----------
export function activitySection(el, a, b) {
  const ctx = b || a; // admite (el, ctx) o firma de ruta (el, params, ctx)
  const { db } = ctx;
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u]));
  const rows = db.all('_log');
  el.innerHTML = pageHead('Bitácora de actividad', 'Registro de acciones realizadas en el sistema (últimas 300).', `<button class="btn" data-csv>⬇ CSV</button>`) + '<div data-t></div>';
  const t = table(el.querySelector('[data-t]'), {
    key: 'log-' + db.name, rows, pageSize: 15,
    search: r => `${r.action} ${r.detail} ${users[r.user]?.name || ''}`,
    filters: [{ key: 'action', label: 'Acción', options: [...new Set(rows.map(r => r.action))].sort() }],
    columns: [
      { key: 'at', label: 'Fecha', render: r => `<span title="${escape(dateTime(r.at))}">${escape(ago(r.at))}</span>` },
      { key: 'user', label: 'Usuario', render: r => users[r.user] ? person(users[r.user]) : '<span class="muted">Sistema</span>', value: r => users[r.user]?.name || '' },
      { key: 'action', label: 'Acción', render: r => badge(r.action, 'info') },
      { key: 'detail', label: 'Detalle' }
    ]
  });
  el.querySelector('[data-csv]').onclick = () => { downloadCSV('bitacora.csv', t.filtered().map(r => ({ fecha: dateTime(r.at), usuario: users[r.user]?.name || 'Sistema', accion: r.action, detalle: r.detail }))); toast('Bitácora exportada', 'success'); };
}

// Agrupa por mes (últimos n meses) → [{ label, value }]
export function byMonth(rows, getDate, n = 8, getValue = () => 1) {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''), value: 0 });
  }
  const idx = Object.fromEntries(out.map((o, i) => [o.key, i]));
  rows.forEach(r => { const d = new Date(getDate(r)); const k = `${d.getFullYear()}-${d.getMonth()}`; if (k in idx) out[idx[k]].value += getValue(r); });
  return out;
}
