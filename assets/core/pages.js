// Páginas y secciones estándar que casi todas las apps repetían: login con cuentas demo,
// bitácora, usuarios y roles, configuración (con "Restablecer datos demo") y "Mi cuenta".
// Las secciones devuelven ítems de navegación para app.panel({ nav: [...] }).
//
//   nav: [ ..., { section: 'Sistema' },
//     usersSection(app, { roles: ['admin'] }),
//     settingsSection(app, { roles: ['admin'], groups: [{ title: 'Sitio', fields: [{ name: 'tagline', label: 'Eslogan' }] }] }),
//     logSection(app, { roles: ['admin'] }) ]

import { html, raw, escape, toast, confirm, dateTime, downloadCSV, norm, debounce, dataTable } from './ui.js';
import { pageHead, card, kpis, emptyState, badge } from './blocks.js';
import { resource, renderFields, readFields } from './resource.js';

// ---------- Login ----------
// app.login({ el, intro, demoText, registerHref, register }) pinta la página completa: formulario + cuentas demo.
// Tras entrar va a ?next= si el rol puede abrir esa página (app.pages), si no a app.homeFor(usuario).
// En producción no hay cuentas demo; con backend remoto aparece "Recibir un enlace por correo".
// register: { role, title, fields: [campos extra], before(values) → patch } agrega la pestaña "Crear cuenta".
export function loginPage(app, { el = document.getElementById('app') || document.body, title = 'Ingresar', intro = 'Usa tu correo y contraseña, o entra con una cuenta de prueba.', demoText = 'Cada rol ve un sistema distinto.', registerHref = '', siteHref = 'index.html', filter, register = null } = {}) {
  const { auth, brand = {} } = app;
  const next = new URLSearchParams(location.search).get('next');
  const go = u => {
    const page = next && next.split('#')[0];
    location.href = page && app.canOpen(page, u.role) ? next : app.homeFor(u);
  };
  const demo = auth.capabilities ? auth.capabilities.demo : true;
  const magic = !!auth.capabilities?.magicLink;
  if (!demo && intro === 'Usa tu correo y contraseña, o entra con una cuenta de prueba.') intro = magic ? 'Usa tu correo y contraseña, o pide un enlace de acceso a tu correo.' : 'Usa tu correo y contraseña.';
  // Vuelta desde un enlace mágico (o sesión ya abierta con backend): entra directo.
  const cur = auth.current();
  if (cur && auth.remote) { go(cur); return; }
  const regFields = register ? [{ name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, ...(register.fields || []), { name: 'password', label: 'Contraseña (mín. 8)', type: 'password', required: true, check: v => (String(v).length < 8 ? 'mínimo 8 caracteres' : '') }] : [];
  el.innerHTML = html`<main class="k-auth">
    <div class="k-auth-grid${demo ? '' : ' k-auth-single'}">
      <div class="card stack">
        <a class="brand-line" href="${siteHref}"><span class="logo" aria-hidden="true">${brand.logo || '◆'}</span><span>${brand.name || app.name}</span></a>
        ${register ? raw('<div class="tabs" role="tablist"><button type="button" class="tab active" data-tab="in">Ingresar</button><button type="button" class="tab" data-tab="reg">' + escape(register.title || 'Crear cuenta') + '</button></div>') : ''}
        <form class="stack" data-form="in" novalidate>
          <h1 style="margin:8px 0 0">${title}</h1>
          <p class="muted" style="margin:0">${next ? 'Inicia sesión con una cuenta autorizada para continuar.' : intro}</p>
          <div class="field"><label for="k-email">Correo</label><input class="input" id="k-email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="k-pass">Contraseña</label><input class="input" id="k-pass" name="password" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary btn-lg" type="submit">Ingresar</button>
          ${magic ? raw('<button class="btn btn-ghost" type="button" data-magic>✉️ Recibir un enlace de acceso por correo</button>') : ''}
          ${registerHref ? html`<a class="small" href="${registerHref}">¿No tienes cuenta? Regístrate</a>` : ''}
          <a class="small" href="${siteHref}">← Volver al sitio</a>
        </form>
        ${register ? raw(`<form class="stack" data-form="reg" hidden novalidate><h1 style="margin:8px 0 0">${escape(register.title || 'Crear cuenta')}</h1><div class="k-form">${renderFields(regFields, {})}</div><button class="btn btn-primary btn-lg" type="submit">Crear cuenta</button></form>`) : ''}
      </div>
      ${demo ? html`<section class="card stack">
        <span class="eyebrow">Cuentas demo</span>
        <h2 style="margin:0">Entra con un clic</h2>
        <p class="muted small" style="margin:0">${demoText}</p>
        <div data-demo></div>
      </section>` : ''}
    </div>
  </main>`;
  const demoBox = el.querySelector('[data-demo]');
  if (demoBox) auth.mountDemoLogin(demoBox, { onLogin: go, filter });
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('active', x === b));
    el.querySelectorAll('[data-form]').forEach(f => { f.hidden = f.dataset.form !== b.dataset.tab; });
  }));
  const form = el.querySelector('[data-form="in"]');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Ingresando…';
    try { go(await auth.login(f.email.value, f.password.value)); }
    catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Ingresar'; }
  });
  el.querySelector('[data-magic]')?.addEventListener('click', async e => {
    const email = form.email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Escribe tu correo primero', 'warning'); form.email.focus(); return; }
    e.target.disabled = true;
    try {
      const back = new URL('login.html' + (next ? `?next=${encodeURIComponent(next)}` : ''), location.href).href;
      await auth.magicLink(email, { redirectTo: back });
      toast('Te enviamos un enlace de acceso. Revisa tu correo.', 'success', 6000);
    } catch (err) { toast(err.message, 'error'); }
    e.target.disabled = false;
  });
  el.querySelector('[data-form="reg"]')?.addEventListener('submit', async e => {
    e.preventDefault();
    const { values, errors } = readFields(e.target, regFields);
    if (errors.length) return toast(errors[0].msg, 'warning');
    const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
    try {
      const extra = register.before && !auth.remote ? await register.before(values) : {};
      go(await auth.register({ ...values, role: register.role || 'cliente', ...(extra || {}) }));
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
  });
}

// ---------- Bitácora ----------
export function logSection(app, { id = 'bitacora', label = 'Bitácora', icon = '📜', roles, pageSize = 15 } = {}) {
  return {
    id, label, icon, roles, watch: ['_log'],
    render(view) {
      const { db } = app;
      const names = Object.fromEntries(db.all('users').map(u => [u.id, u.name]));
      const actions = [...new Set(db.all('_log').map(l => l.action))].sort();
      const state = { q: '', a: '' };
      view.innerHTML = html`${pageHead(label, 'Últimos 300 eventos: inicios de sesión, altas, ediciones, cambios de estado y configuración.')}
        <section class="card"><div class="k-toolbar">
          <input class="input k-search" type="search" placeholder="Buscar en la bitácora…" aria-label="Buscar" data-q>
          <select class="select" data-a aria-label="Acción"><option value="">Acción: todas</option>${actions.map(a => html`<option>${a}</option>`)}</select>
          <span class="k-grow"></span><button type="button" class="btn btn-sm" data-csv>⇩ CSV</button>
        </div><div data-dt></div></section>`;
      const rows = () => db.all('_log').map(l => ({ ...l, uname: names[l.user] || (l.user ? '—' : 'Sitio web') }))
        .filter(l => (!state.a || l.action === state.a) && (!state.q || norm(`${l.action} ${l.detail} ${l.uname}`).includes(norm(state.q))));
      const dt = dataTable(view.querySelector('[data-dt]'), {
        rows: rows(), pageSize, empty: 'Aún no hay actividad registrada.',
        columns: [
          { key: 'at', label: 'Fecha', render: l => raw(`<small class="k-nowrap">${escape(dateTime(l.at))}</small>`) },
          { key: 'uname', label: 'Usuario' },
          { key: 'action', label: 'Acción', render: l => raw(badge(l.action)) },
          { key: 'detail', label: 'Detalle', sort: false }
        ]
      });
      const refresh = () => dt.update(rows());
      view.querySelector('[data-q]').addEventListener('input', debounce(e => { state.q = e.target.value; refresh(); }, 150));
      view.querySelector('[data-a]').addEventListener('change', e => { state.a = e.target.value; refresh(); });
      view.querySelector('[data-csv]').onclick = () => { const r = rows(); if (!r.length) return toast('No hay filas', 'warning'); downloadCSV('bitacora.csv', r.map(l => ({ fecha: l.at, usuario: l.uname, accion: l.action, detalle: l.detail }))); };
      return { refresh };
    }
  };
}

// ---------- Usuarios y roles ----------
// Un resource sobre `users` con protecciones: correo único, no te puedes quitar el rol ni desactivar.
// extraFields: campos propios de la app (p. ej. { name: 'branchId', type: 'ref', ref: 'branches' }).
export function usersSection(app, { id = 'usuarios', label = 'Usuarios y roles', icon = '🛡️', roles, adminRole = 'admin', extraFields = [], permissions = {} } = {}) {
  const { db, auth } = app;
  const COLORS = ['#4f46e5', '#0891b2', '#db2777', '#059669', '#ea580c', '#7c3aed'];
  const users = resource(app, {
    collection: 'users', id, singular: 'usuario', plural: label, icon, newLabel: 'Nuevo usuario', log: 'usuario',
    intro: auth.remote ? 'Cuentas de acceso y sus permisos. Al crear un usuario se le invita por correo: entra con "Recibir un enlace" en el login (o con la contraseña que defina en Supabase Auth).' : app.production ? 'Cuentas de acceso y sus permisos.' : 'Cuentas de acceso y sus permisos. Las marcadas como demo aparecen en el login.',
    subtitle: u => u.email,
    fields: [
      { name: 'name', label: 'Nombre', required: true, search: true },
      { name: 'email', label: 'Correo', type: 'email', required: true, search: true, table: false },
      ...(auth.remote ? [] : [{ name: 'password', label: 'Contraseña', required: true, table: false, detail: false, csv: false, default: app.production ? '' : 'demo123', help: app.production ? 'Mínimo 8 caracteres. Modo local: queda guardada en este navegador.' : '' }]),
      { name: 'role', label: 'Rol', type: 'select', required: true, filter: true, options: () => Object.entries(auth.roles) },
      ...extraFields,
      ...(app.production || auth.remote ? [] : [{ name: 'demo', label: 'Cuenta demo (botón en el login)', type: 'bool', table: false }]),
      { name: 'active', label: 'Activa', type: 'bool', toggle: true, default: true, filter: true }
    ],
    permissions,
    defaults: () => ({ active: true, color: COLORS[db.count('users') % COLORS.length] }),
    validate(v, row, ctx) {
      if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== row?.id)) return 'Ese correo ya está en uso';
      const me = ctx?.user || auth.current();
      if (row && row.id === me?.id && (v.role !== row.role || !v.active)) return 'No puedes cambiar tu propio rol ni desactivarte';
      return null;
    },
    canDelete: (u, ctx) => (u.id === (ctx?.user || auth.current())?.id ? 'No puedes eliminar tu propia cuenta' : u.role === adminRole && db.count('users', x => x.role === adminRole) <= 1 ? 'Debe quedar al menos un administrador' : true),
    csv: u => ({ nombre: u.name, correo: u.email, rol: auth.roleName(u.role), activo: u.active !== false ? 'sí' : 'no' })
  });
  const item = users.section({ roles });
  const list = item.render;
  item.render = (view, ctx) => {
    const r = list(view, ctx);
    const strip = document.createElement('div');
    strip.innerHTML = kpis(Object.entries(auth.roles).filter(([k]) => !app.production || db.count('users', u => u.role === k) || k === adminRole).map(([k, l]) => ({ label: l, value: db.count('users', u => u.role === k) })));
    view.querySelector('.page-head').after(strip.firstElementChild);
    return r;
  };
  item.resource = users;
  return item;
}

// ---------- Configuración ----------
// Guarda en db.setValue(key) los campos de `groups` y ofrece exportar los datos y restablecer la demo.
export function settingsSection(app, { id = 'config', label = 'Configuración', icon = '⚙️', roles, key = 'settings', groups = [], reset = true, onSave } = {}) {
  const { db, auth } = app;
  return {
    id, label, icon, roles, watch: [],
    render(view) {
      const s = app.settings ? app.settings() : db.getValue(key, {});
      const groupsAll = [...groups, ...(app.contributions ? app.contributions('settings') : [])];
      const all = groupsAll.flatMap(g => g.fields);
      const canReset = reset && app.canReset !== false;
      view.innerHTML = html`${pageHead(label, 'Los cambios se reflejan de inmediato en el sitio y quedan en la bitácora.')}
        <form class="stack" novalidate>
          ${groupsAll.map(g => raw(card(g.title, `<div class="k-form">${renderFields(g.fields, s)}</div>`, { sub: g.sub || '' })))}
          ${groupsAll.length ? raw('<div class="row"><button class="btn btn-primary btn-lg" type="submit">Guardar configuración</button></div>') : ''}
        </form>
        <div class="grid-2">
          ${raw(card('Datos', `<p class="muted small">Descarga una copia de ${app.production ? 'los datos visibles para tu cuenta' : 'toda la base de datos de esta demo'} (JSON).${app.db?.adapter?.kind === 'supabase' ? ' El respaldo completo se hace con pg_dump (ver docs/OPERACION.md).' : ''}</p><button type="button" class="btn" data-export>⇩ Exportar datos</button>`))}
          ${canReset ? raw(card('Restablecer datos demo', '<p class="muted small">Borra todos los cambios hechos en esta demo y vuelve a cargar los datos de ejemplo.</p><button type="button" class="btn btn-danger" data-reset>↺ Restablecer datos demo</button>')) : ''}
        </div>`;
      view.querySelector('form').addEventListener('submit', e => {
        e.preventDefault();
        const { values, errors } = readFields(e.target, all);
        if (errors.length) return toast(errors[0].msg, 'warning');
        const out = { ...(db.getValue(key, {}) || {}), ...values };
        db.setValue(key, out);
        db.log('config', `${label} actualizada`, auth.current()?.id);
        onSave && onSave(out);
        toast('Configuración guardada', 'success');
      });
      view.querySelector('[data-export]').onclick = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(db.export(), null, 2)], { type: 'application/json' }));
        a.download = `${db.name}-datos.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      };
      view.querySelector('[data-reset]')?.addEventListener('click', () => resetDemo(app));
    }
  };
}

// Restablecer con confirmación; si el usuario actual ya no existe tras el reset, vuelve al login.
export async function resetDemo(app, { loginHref = 'login.html' } = {}) {
  const { db, auth } = app;
  if (!await confirm('Se borrarán todos los cambios y se cargarán los datos de ejemplo nuevamente.', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) return false;
  const uid = auth.current()?.id;
  db.reset();
  if (uid && !db.get('users', uid)) { auth.logout(); location.href = loginHref; return true; }
  db.log('reset', 'Datos de demostración restablecidos', uid);
  toast('Datos demo restablecidos', 'success');
  return true;
}

// ---------- Mi cuenta ----------
export function accountSection(app, { id = 'cuenta', label = 'Mi cuenta', icon = '👤', roles, fields = [] } = {}) {
  const { db, auth } = app;
  const base = [{ name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, ...fields, { name: 'password', label: 'Contraseña', required: true }];
  return {
    id, label, icon, roles, watch: [],
    render(view, ctx) {
      const u = db.get('users', ctx.user.id);
      view.innerHTML = html`${pageHead(label, `${auth.roleName(u.role)} · cuenta creada el ${dateTime(u.createdAt)}`)}
        ${raw(card('Datos personales', `<form novalidate><div class="k-form">${renderFields(base, u)}</div><div class="row" style="margin-top:14px"><button class="btn btn-primary" type="submit">Guardar</button></div></form>`))}`;
      view.querySelector('form').addEventListener('submit', e => {
        e.preventDefault();
        const { values, errors } = readFields(e.target, base);
        if (errors.length) return toast(errors[0].msg, 'warning');
        if (db.find('users', x => x.email.toLowerCase() === values.email.toLowerCase() && x.id !== u.id)) return toast('Ese correo ya está en uso', 'error');
        db.update('users', u.id, values);
        db.log('cuenta', `${values.name} actualizó sus datos`, u.id);
        toast('Datos guardados', 'success');
      });
    }
  };
}

export { emptyState };
