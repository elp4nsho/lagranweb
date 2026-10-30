// Base de datos (localStorage) y autenticación de Pits Rápido.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { timeshift } from '../shared/timeshift.js';
import { seed } from './seed.js';

timeshift('lubricentro');
export const db = createDB('lubricentro', { version: 3, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Administrador', jefe: 'Jefe de sucursal', recepcion: 'Recepcionista', tecnico: 'Técnico', cliente: 'Cliente' }
});
export const STAFF = ['admin', 'jefe', 'recepcion', 'tecnico'];
export const HOME = { admin: 'admin.html', jefe: 'admin.html', recepcion: 'recepcion.html', tecnico: 'operario.html', cliente: 'index.html#/cuenta' };
