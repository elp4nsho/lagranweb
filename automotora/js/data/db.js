// "Backend" de Autoplaza Pacífico: DB en localStorage + autenticación con roles.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';
import { ymd } from '../shared/util.js';

export const db = createDB('automotora', { version: 3, seed });
// Las agendas (taller, test drives) dependen del día: si la semilla es de otro día se regenera.
if (db.getValue('seededOn') !== ymd()) db.reset();

export const ROLES = { admin: 'Administrador', gerente: 'Gerente comercial', vendedor: 'Ejecutivo de ventas', analista: 'Analista de crédito', asesor: 'Asesor de servicio', cliente: 'Cliente' };
export const auth = createAuth(db, { roles: ROLES });
export const HOME_BY_ROLE = { admin: 'admin.html', gerente: 'admin.html', vendedor: 'vendedor.html', analista: 'credito.html', asesor: 'posventa.html', cliente: 'index.html#/cuenta' };
// Qué páginas puede abrir cada rol
export const PAGE_ROLES = { 'admin.html': ['admin', 'gerente'], 'vendedor.html': ['vendedor', 'gerente', 'admin'], 'credito.html': ['analista', 'gerente', 'admin'], 'posventa.html': ['asesor', 'admin'] };
