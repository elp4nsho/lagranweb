// Base de datos y autenticación de Vecindario (Comunidad Plaza Ñuñoa).
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';
import { owed, isOverdue } from '../shared/format.js';

export const db = createDB('condominio', { version: 2, seed });
export const ROLES = { administrador: 'Administrador', comite: 'Comité de administración', conserje: 'Conserje', residente: 'Residente' };
export const auth = createAuth(db, { roles: ROLES });
export const settings = () => db.getValue('settings', {});
export const saveSettings = patch => db.setValue('settings', { ...settings(), ...patch });

export function homeFor(u) {
  if (!u) return 'index.html';
  return { administrador: 'admin.html', comite: 'admin.html', conserje: 'conserjeria.html', residente: 'residente.html' }[u.role] || 'index.html';
}
export const PAGE_ROLES = { 'admin.html': ['administrador', 'comite'], 'conserjeria.html': ['conserje', 'administrador'], 'residente.html': ['residente', 'comite'] };

// Avisos a todos los residentes de una unidad (o a toda la comunidad con unitId '*').
export const notify = (unitId, text, link = '') => db.insert('notifications', { unitId, text, link, read: false });
export const isPublished = period => db.find('periods', p => p.period === period)?.status === 'publicado';
export const unitDebt = (unitId, s = settings()) => db.query('charges', c => c.unitId === unitId && !c.paid && isPublished(c.period)).reduce((t, c) => t + owed(c, s), 0);
export const overdueCharges = (unitId, s = settings()) => db.query('charges', c => c.unitId === unitId && isOverdue(c, s));
export const unitName = id => { const u = db.get('units', id); return u ? `${u.tower}-${u.number}` : id || 'Área común'; };
export const residentsOf = unitId => db.query('residents', r => r.unitId === unitId);
