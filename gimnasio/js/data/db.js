// "Backend" de Titán Fit: DB en localStorage + autenticación con roles.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';
import { ymd } from '../shared/dates.js';

export const db = createDB('gimnasio', { version: 2, seed });
// El horario y las reservas dependen del día: si la semilla es de otro día se regenera.
if (db.getValue('seededOn') !== ymd()) db.reset();

export const auth = createAuth(db, { roles: { admin: 'Administrador', recepcion: 'Recepción', entrenador: 'Entrenador', socio: 'Socio' } });
export const HOME_BY_ROLE = { admin: 'admin.html', recepcion: 'recepcion.html', entrenador: 'entrenador.html', socio: 'socio.html' };
