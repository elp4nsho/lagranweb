// Base de datos y autenticación de Pulso CRM (compartidas por sitio público, app y administración).
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('crm', { version: 1, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Administrador', gerente: 'Gerente comercial', ejecutivo: 'Ejecutivo de ventas' }
});
export const ROLE_IDS = ['admin', 'gerente', 'ejecutivo'];
