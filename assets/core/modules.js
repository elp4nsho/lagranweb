// Módulos (feature toggles) de una app del kernel. Archivo PURO (sin DOM): lo usan defineApp() en el
// navegador y las herramientas de producción en Node (build-client, supabase-schema, el configurador).
//
// Un módulo declara qué aporta; defineApp() solo instala los activos:
//   {
//     id: 'agenda', name: 'Agenda y citas', description: '…',
//     base: true,                         // siempre activo (solo el módulo base)
//     deps: ['clientes'],                 // se activan solos si activas este
//     roles: { asesor: 'Asesor de servicio' },
//     pages: { 'admin.html': ['asesor'] },// guardas por página (se unen entre módulos)
//     home: { asesor: 'admin.html#/citas' },
//     settings: { slotMinutes: 60 },      // valores por defecto de app.settings()
//     collections: { appointments: { label, read, insert, update, delete, own, index, lookup, files } },
//     catalog: ['services'],              // colecciones que se conservan en producción con data: 'empty'
//     seed(ctx) → { coleccion: [...] },   // semilla de demo (ctx.has(id), ctx.data, ctx.rng(n))
//     install(app)                        // código de navegador: recursos, menú, sitio, KPIs (ver app.js)
//   }
// Sin `modules` (apps antiguas, reparto, polla) todo queda como siempre: no hay nada que filtrar.

// Activa los módulos pedidos + el base + sus dependencias (recursivo), en el orden en que se declararon.
// enabled: undefined/null = todos. Devuelve { active: [módulos], ids: [...], added: [ids agregados por dependencia], unknown: [...] }
export function resolveModules(modules = [], enabled = null) {
  const byId = Object.fromEntries(modules.map(m => [m.id, m]));
  const want = new Set();
  const unknown = [], added = [];
  const add = (id, viaDep) => {
    const m = byId[id];
    if (!m) { unknown.push(id); return; }
    if (want.has(id)) return;
    want.add(id);
    if (viaDep) added.push(id);
    (m.deps || []).forEach(d => add(d, true));
  };
  modules.filter(m => m.base).forEach(m => add(m.id, false));
  (enabled == null ? modules.map(m => m.id) : [enabled].flat()).forEach(id => add(id, false));
  const active = modules.filter(m => want.has(m.id));
  return { active, ids: active.map(m => m.id), added: added.filter(id => !(enabled || []).includes(id) && !byId[id]?.base), unknown };
}

// Une lo que declaran los módulos activos: roles, páginas (unión de roles), home, settings, colecciones.
export function mergeModules(active) {
  const roles = {}, pages = {}, home = {}, settings = {}, collections = {}, pageOwners = {};
  for (const m of active) {
    Object.assign(roles, m.roles || {});
    for (const [p, rs] of Object.entries(m.pages || {})) pages[p] = [...new Set([...(pages[p] || []), ...rs])];
    Object.assign(home, m.home || {});
    Object.assign(settings, m.settings || {});
    for (const [c, def] of Object.entries(m.collections || {})) collections[c] = { ...(collections[c] || {}), ...def, module: collections[c]?.module || m.id };
  }
  return { roles, pages, home, settings, collections };
}

// Páginas que SOLO declaran módulos inactivos: quedan bloqueadas (en un build ni siquiera se copian).
export function blockedPages(all, active) {
  const on = new Set(active.map(m => m.id));
  const owners = {};
  all.forEach(m => Object.keys(m.pages || {}).forEach(p => (owners[p] ||= []).push(m.id)));
  return Object.keys(owners).filter(p => !owners[p].some(id => on.has(id)));
}

// Firma corta del conjunto activo (va en la versión de la base local: cambiar módulos = semilla nueva).
export const modulesKey = ids => ids.join('+');
