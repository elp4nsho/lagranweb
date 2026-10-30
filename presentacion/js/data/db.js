// Base de datos y autenticación compartidas por el sitio público y el panel.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('nebula', { version: 4, seed });
export const auth = createAuth(db, { roles: { admin: 'Administrador', editor: 'Editor', sales: 'Ventas' } });

export const STAFF = ['admin', 'editor', 'sales'];

// Matriz de permisos: sección → roles con acceso.
export const PERMS = {
  dashboard: ['admin', 'editor', 'sales'],
  pages: ['admin', 'editor'],
  projects: ['admin', 'editor'],
  team: ['admin', 'editor'],
  testimonials: ['admin', 'editor'],
  posts: ['admin', 'editor'],
  media: ['admin', 'editor'],
  leads: ['admin', 'sales'],
  jobs: ['admin', 'editor'],
  applicants: ['admin', 'editor'],
  settings: ['admin'],
  users: ['admin'],
  activity: ['admin']
};
export const can = (user, perm) => !!user && (PERMS[perm] || []).includes(user.role);

export const settings = () => db.getValue('settings', {});
export const home = () => db.getValue('home', {});
export function patchValue(key, patch) {
  const cur = db.getValue(key, {});
  return db.setValue(key, typeof patch === 'function' ? patch(structuredClone(cur)) : { ...cur, ...patch });
}

export const LEAD_STATUS = {
  nuevo: ['Nuevo', 'info'], contactado: ['Contactado', 'primary'], propuesta: ['Propuesta enviada', 'warning'],
  negociacion: ['Negociación', 'warning'], ganado: ['Ganado', 'success'], perdido: ['Perdido', 'danger']
};
export const APP_STATUS = {
  nuevo: ['Nueva', 'info'], revision: ['En revisión', 'primary'], entrevista: ['Entrevista', 'warning'], oferta: ['Oferta', 'success'], descartado: ['Descartada', 'danger']
};
export const JOB_STATUS = { open: ['Abierta', 'success'], closed: ['Cerrada', 'danger'], draft: ['Borrador', ''] };
export const POST_STATUS = { published: ['Publicado', 'success'], draft: ['Borrador', ''], scheduled: ['Programado', 'info'] };

// Cálculo del presupuesto estimado del cotizador.
export function estimate({ services = [], size = 's', extras = [], rush = false }) {
  const p = settings().pricing || {};
  const mult = p.sizes?.[size]?.mult || 1;
  const base = services.reduce((s, id) => s + (db.get('services', id)?.basePrice || 0), 0) * mult;
  const ext = extras.reduce((s, id) => s + ((p.extras || []).find(e => e.id === id)?.price || 0), 0);
  const subtotal = base + ext;
  const total = subtotal * (rush ? 1 + (p.rush || 0) : 1);
  return { base, ext, subtotal, total, min: Math.round(total * .85 / 10000) * 10000, max: Math.round(total * 1.15 / 10000) * 10000 };
}
