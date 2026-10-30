// "Backend" del centro médico: DB en localStorage + autenticación con roles.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';
import { ymd } from '../shared/dates.js';

export const db = createDB('clinica', { version: 3, seed });
// Las agendas dependen del día de hoy: si la semilla es de otro día se regenera
// (así siempre hay pacientes en la sala de espera y horas disponibles).
if (db.getValue('seededOn') !== ymd()) db.reset();

export const auth = createAuth(db, { roles: { admin: 'Administrador', recepcion: 'Recepción', medico: 'Médico', paciente: 'Paciente' } });

// A dónde va cada rol después de entrar
export const HOME_BY_ROLE = { admin: 'admin.html', recepcion: 'recepcion.html', medico: 'medico.html', paciente: 'index.html#/portal' };
