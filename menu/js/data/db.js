// Base de datos y autenticación de Fogón Andino (compartidas por todas las páginas de la app).
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('menu', { version: 3, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Administrador', chef: 'Jefe de cocina', garzon: 'Garzón', cajero: 'Cajero' }
});

// Página de inicio según rol
export const HOME = { admin: 'admin.html', chef: 'cocina.html', garzon: 'garzon.html', cajero: 'admin.html#/caja' };
