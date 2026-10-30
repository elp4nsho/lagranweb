// Base de datos y autenticación de Hogar Austral (compartidas por sitio, panel y app de corredores).
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';
import { matchQuery, queryLabel } from '../shared/format.js';

export const db = createDB('inmobiliaria', { version: 3, seed });
export const ROLES = { admin: 'Administrador', editor: 'Editor de contenidos', corredor: 'Corredor', propietario: 'Propietario', cliente: 'Cliente' };
export const auth = createAuth(db, { roles: ROLES });

export const settings = () => db.getValue('settings', {});
export const saveSettings = patch => db.setValue('settings', { ...settings(), ...patch });
export const uf = () => Number(settings().uf) || 40000;

// Página de inicio de cada rol después del login.
export function homeFor(u) {
  if (!u) return 'index.html';
  return { admin: 'admin.html', editor: 'admin.html', corredor: 'agente.html' }[u.role] || 'index.html#/cuenta';
}
export const PAGE_ROLES = { 'admin.html': ['admin', 'editor'], 'agente.html': ['corredor', 'admin'] };

export function notify(userId, text, link = '') {
  if (userId) db.insert('notifications', { userId, text, link, read: false });
}

// Cambio de estado con historial, avisos al propietario y alertas de búsquedas guardadas.
export function setStatus(p, to, note = '', by = auth.current()?.name || 'Sistema') {
  const from = p.status;
  if (from === to) return p;
  const patch = { status: to, statusAt: new Date().toISOString(), history: [...(p.history || []), { at: new Date().toISOString(), from, to, by, note }] };
  if (to === 'publicada' && !p.publishedAt) patch.publishedAt = new Date().toISOString();
  const row = db.update('properties', p.id, patch);
  db.log('propiedad', `${p.code}: ${from} → ${to}${note ? ' (' + note + ')' : ''}`, auth.current()?.id);
  const owner = db.get('owners', p.ownerId);
  const label = { publicada: 'fue publicada', borrador: 'volvió a borrador', reservada: 'quedó reservada', vendida: 'se vendió', arrendada: 'se arrendó', revision: 'está en revisión' }[to];
  if (owner?.userId && label) notify(owner.userId, `Tu propiedad ${p.code} ${label}${note ? ': ' + note : ''}`, '#/cuenta/propiedades');
  if (to === 'publicada') alertSearches(row);
  return row;
}
export function alertSearches(p) {
  db.query('savedSearches', s => s.alerts && matchQuery(p, s.query, uf())).forEach(s => {
    notify(s.userId, `Nueva propiedad coincide con «${s.name || queryLabel(s.query)}»: ${p.title}`, '#/propiedad/' + p.id);
  });
}
