// Módulo base (siempre activo): sitio público (portada, servicios, contacto, privacidad), panel con
// resumen, servicios del sitio (CMS), mensajes de contacto, usuarios y roles, configuración y bitácora.
import { resource } from '../../../../assets/core/resource.js';
import { usersSection, settingsSection, logSection } from '../../../../assets/core/pages.js';
import { pageHead, kpis, card, activityFeed, emptyState } from '../../../../assets/core/blocks.js';
import { html, raw, escape, money, toast } from '../../../../assets/core/ui.js';
import { privacyHtml } from '../../../../assets/core/legal.js';
import { LEAD, OFFICE } from '../shared.js';

export function install(app) {
  const { db } = app;
  const R = (app.res ||= {});
  const S = () => app.settings();

  const services = R.services = resource(app, {
    collection: 'services', id: 'servicios', singular: 'servicio', plural: 'Servicios del sitio', icon: '🛠️',
    intro: 'Lo que se publica en el sitio. Desactiva un servicio para ocultarlo sin borrarlo.',
    subtitle: s => s.cat,
    fields: [
      { name: 'name', label: 'Nombre', required: true, search: true },
      { name: 'icon', label: 'Ícono (emoji)', default: '🔧', table: false },
      { name: 'cat', label: 'Categoría', type: 'select', options: ['Mecánica', 'Carrocería', 'Mantención', 'Otro'], filter: true },
      { name: 'from', label: 'Desde (CLP, 0 = a cotizar)', type: 'money' },
      { name: 'desc', label: 'Descripción', type: 'textarea', required: true },
      { name: 'bullets', label: 'Puntos destacados', type: 'tags' },
      { name: 'order', label: 'Orden', type: 'number', min: 0, default: 10 },
      { name: 'active', label: 'Publicado', type: 'bool', toggle: true, default: true }
    ],
    sort: (a, b) => (a.order || 0) - (b.order || 0),
    permissions: { create: ['admin'], edit: ['admin'], delete: ['admin'] }
  });

  const leads = R.leads = resource(app, {
    collection: 'leads', id: 'mensajes', singular: 'mensaje', plural: 'Mensajes', icon: '✉️',
    intro: 'Mensajes del formulario de contacto del sitio.',
    subtitle: l => l.email,
    fields: [
      { name: 'name', label: 'Nombre', required: true, search: true },
      { name: 'email', label: 'Correo', type: 'email', search: true },
      { name: 'phone', label: 'Teléfono', type: 'tel' },
      { name: 'message', label: 'Mensaje', type: 'textarea', required: true },
      { name: 'status', label: 'Estado', type: 'status', machine: LEAD }
    ],
    permissions: { create: false, edit: OFFICE, delete: ['admin'] },
    count: () => db.count('leads', l => l.status === 'nuevo'),
    detail: true
  });

  // ---------- Panel ----------
  function dashboard(view, ctx) {
    const widgets = app.ordered('dashboard').filter(w => !w.roles || w.roles.includes(ctx.user.role));
    const s = S();
    view.innerHTML = html`${pageHead(`Hola, ${ctx.user.name.split(' ')[0]}`, `${s.name} · ${new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}`)}
      ${raw(kpis(app.kpis(ctx)))}
      <div class="tl-widgets">${widgets.map(w => raw(`<div class="${w.wide ? 'k-wide' : ''}">${w.render(ctx)}</div>`))}</div>`;
    widgets.forEach(w => w.mount && w.mount(view, ctx));
  }
  const panelRoles = Object.keys(app.roles).filter(r => r !== 'cliente');
  app.contribute('admin.html', { id: '', label: 'Resumen', icon: '📊', roles: panelRoles, render: dashboard }, { slot: 'inicio' });
  app.contribute('admin.html', [services.section({ roles: ['admin'] }), leads.section({ roles: OFFICE })], { slot: 'sitio' });
  app.contribute('admin.html', [
    usersSection(app, { roles: ['admin'], extraFields: [
      ...(app.has('ordenes') ? [{ name: 'specialty', label: 'Especialidad (mecánicos)', table: false }] : []),
      ...(app.has('portal') ? [{ name: 'customerId', label: 'Ficha de cliente (rol Cliente)', type: 'ref', ref: 'customers', table: false }] : [])
    ] }),
    settingsSection(app, { roles: ['admin'], groups: [
      { title: 'Identidad', fields: [{ name: 'name', label: 'Nombre del taller', required: true }, { name: 'short', label: 'Nombre corto' }, { name: 'tagline', label: 'Bajada / eslogan', wide: true }] },
      { title: 'Portada', fields: [{ name: 'heroTitle', label: 'Título principal', wide: true }, { name: 'heroText', label: 'Texto de la portada', type: 'textarea' }, { name: 'announcement', label: 'Aviso superior (vacío = sin aviso)', wide: true }, { name: 'guarantee', label: 'Garantía', wide: true }] },
      { title: 'Contacto', fields: [{ name: 'address', label: 'Dirección', wide: true }, { name: 'phone', label: 'Teléfono', type: 'tel' }, { name: 'whatsapp', label: 'WhatsApp', type: 'tel' }, { name: 'email', label: 'Correo', type: 'email' }, { name: 'hours', label: 'Horario', wide: true }] }
    ] }),
    logSection(app, { roles: ['admin'] })
  ], { slot: 'sistema' });
  app.contribute('kpis', [
    { order: 90, roles: OFFICE, kpi: () => ({ label: 'Mensajes nuevos', value: db.count('leads', l => l.status === 'nuevo'), icon: '✉️', href: '#/mensajes' }) },
    { order: 95, roles: ['admin'], kpi: () => ({ label: 'Servicios publicados', value: db.count('services', s => s.active), icon: '🛠️', href: '#/servicios' }) },
    { order: 96, roles: ['admin'], kpi: () => ({ label: 'Usuarios activos', value: db.count('users', u => u.active !== false), icon: '🛡️', href: '#/usuarios' }) }
  ]);
  app.contribute('dashboard', [
    { order: 80, roles: OFFICE, render: () => card('Últimos mensajes', db.all('leads').slice(0, 4).map(l => `<p style="margin:0 0 10px"><b>${escape(l.name)}</b> ${LEAD.badge(l.status)}<br><small class="muted">${escape(l.message)}</small></p>`).join('') || '<p class="muted small">Sin mensajes.</p>', { actions: '<a class="btn btn-sm" href="#/mensajes">Ver todos</a>' }) },
    { order: 99, roles: ['admin'], wide: true, render: () => card('Actividad reciente', activityFeed(db)) }
  ]);

  // ---------- Sitio público ----------
  const activeServices = () => db.query('services', s => s.active).sort((a, b) => (a.order || 0) - (b.order || 0));
  const svcCard = s => `<a class="card hover svc-card" href="#/servicios/${escape(s.id)}" style="text-decoration:none;color:inherit"><span class="svc-ico" aria-hidden="true">${escape(s.icon || '🔧')}</span><h3 style="margin:0">${escape(s.name)}</h3><p class="small muted" style="margin:0">${escape(s.desc)}</p><span class="small">${s.from ? `desde <b>${money(s.from)}</b>` : '<b>A cotizar</b>'}</span></a>`;
  app.contribute('site:home', [
    { order: 0, render: () => { const s = S(); const media = app.ordered('site:hero')[0]; return `<section class="section site-hero"><div class="container hero-grid"><div class="hero-text stack" data-anim>
        <span class="eyebrow">${escape(s.tagline || '')}</span><h1>${escape(s.heroTitle || s.name)}</h1><p class="lead">${escape(s.heroText || '')}</p>
        <div class="row">${app.has('agenda') ? '<a class="btn btn-primary btn-lg" href="#/agendar">Agendar hora</a>' : '<a class="btn btn-primary btn-lg" href="#/contacto">Cotizar</a>'}<a class="btn btn-lg" href="#/servicios">Ver servicios</a></div></div>
        <div class="hero-media card stack" data-anim data-anim-delay="150">${media ? media.render() : `<b>📍 ${escape(s.address || '')}</b><span class="small">🕘 ${escape(s.hours || '')}</span><span class="small">📞 ${escape(s.phone || '')}${s.whatsapp ? ` · 💬 ${escape(s.whatsapp)}` : ''}</span><a class="btn btn-primary" href="#/contacto">Escríbenos</a>`}</div></div></section>`; }, mount: (el) => app.ordered('site:hero')[0]?.mount?.(el) },
    { order: 20, render: () => `<section class="section band"><div class="container stack"><div class="row between" data-anim><div><span class="eyebrow">Servicios</span><h2>Lo que hacemos</h2></div><a class="btn" href="#/servicios">Ver todos →</a></div><div class="grid-4">${activeServices().slice(0, 8).map(svcCard).join('')}</div></div></section>` },
    { order: 90, render: () => { const s = S(); return `<section class="section"><div class="container grid-2" style="align-items:center"><div data-anim><span class="eyebrow">Garantía</span><h2>Respaldamos cada trabajo</h2><p class="muted">${escape(s.guarantee || '')}</p><a class="btn" href="#/contacto">Contáctanos</a></div><div class="card stack"><b>📍 ${escape(s.address || '')}</b><span class="small">🕘 ${escape(s.hours || '')}</span><span class="small">📞 ${escape(s.phone || '')}${s.whatsapp ? ` · 💬 ${escape(s.whatsapp)}` : ''}</span></div></div></section>`; } }
  ]);
  const page = (title, body, wide = false) => `<section class="section"><div class="container stack" style="max-width:${wide ? 1100 : 760}px">${title ? `<h1>${escape(title)}</h1>` : ''}${body}</div></section>`;
  app.contribute('site:routes', [
    { path: '/servicios', render: view => { view.innerHTML = page('Servicios', `<div class="grid-3">${activeServices().map(svcCard).join('') || emptyState({ title: 'Pronto publicaremos nuestros servicios' })}</div>`, true); } },
    { path: '/servicios/:id', render: (view, { params }) => {
      const s = db.get('services', params.id);
      view.innerHTML = s && s.active ? page('', `<a class="small" href="#/servicios">← Servicios</a><span class="svc-ico" style="font-size:52px">${escape(s.icon || '🔧')}</span><h1 style="margin:0">${escape(s.name)}</h1><p class="lead">${escape(s.desc)}</p>${(s.bullets || []).length ? `<ul>${s.bullets.map(b => `<li>${escape(b)}</li>`).join('')}</ul>` : ''}<p>${s.from ? `Desde <b>${money(s.from)}</b> (IVA incluido, referencial)` : 'Precio según evaluación.'}</p><div class="row">${app.has('agenda') ? `<a class="btn btn-primary" href="#/agendar?s=${escape(s.id)}">Agendar hora</a>` : ''}<a class="btn" href="#/contacto">Consultar</a></div>`)
        : page('', emptyState({ icon: '🔎', title: 'Servicio no encontrado', action: '<a class="btn" href="#/servicios">Ver servicios</a>' }));
    } },
    { path: '/contacto', render: view => {
      const s = S();
      view.innerHTML = page('Contacto', `<div class="grid-2"><form class="card stack" novalidate data-contact>
          <div class="field"><label for="ct-n">Nombre</label><input class="input" id="ct-n" name="name" required autocomplete="name"></div>
          <div class="field"><label for="ct-e">Correo</label><input class="input" id="ct-e" name="email" type="email" required autocomplete="email"></div>
          <div class="field"><label for="ct-p">Teléfono</label><input class="input" id="ct-p" name="phone" type="tel" autocomplete="tel"></div>
          <div class="field"><label for="ct-m">Mensaje</label><textarea class="textarea" id="ct-m" name="message" required></textarea></div>
          <button class="btn btn-primary">Enviar mensaje</button><p class="small muted" style="margin:0">Al enviar aceptas nuestra <a href="#/privacidad">política de privacidad</a>.</p></form>
        <div class="card stack"><b>${escape(s.name)}</b><span>📍 ${escape(s.address || '')}</span><span>📞 ${escape(s.phone || '')}</span>${s.whatsapp ? `<span>💬 ${escape(s.whatsapp)}</span>` : ''}${s.email ? `<span>✉️ <a href="mailto:${escape(s.email)}">${escape(s.email)}</a></span>` : ''}<span>🕘 ${escape(s.hours || '')}</span></div></div>`, true);
      view.querySelector('[data-contact]').onsubmit = e => {
        e.preventDefault();
        const f = e.target, v = Object.fromEntries(new FormData(f));
        if (v.name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email) || v.message.trim().length < 5) return toast('Completa nombre, un correo válido y tu mensaje', 'warning');
        db.insert('leads', { ...v, status: 'nuevo' });
        db.log('mensaje', `Mensaje de ${v.name} desde el sitio`, app.auth.current()?.id || null);
        f.reset();
        toast('¡Gracias! Te responderemos a la brevedad.', 'success');
      };
    } },
    { path: '/privacidad', render: view => { view.innerHTML = page('', privacyHtml(app.client || {}, { modules: app.modules.map(m => m.id) })); } }
  ]);
}
