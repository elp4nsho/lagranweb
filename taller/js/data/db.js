// Base de datos (localStorage) y autenticación de Mecánica Integral Los Andes.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { timeshift } from '../shared/timeshift.js';
import { seed } from './seed.js';

timeshift('taller');
export const db = createDB('taller', { version: 1, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Administrador', jefe: 'Jefe de taller', asesor: 'Asesor de servicio', mecanico: 'Mecánico', bodega: 'Bodega', aseguradora: 'Aseguradora', cliente: 'Cliente' }
});
export const HOME = { admin: 'admin.html', jefe: 'admin.html#/tablero', asesor: 'admin.html#/tablero', bodega: 'admin.html#/repuestos', mecanico: 'mecanico.html', aseguradora: 'aseguradora.html', cliente: 'index.html#/cuenta' };
