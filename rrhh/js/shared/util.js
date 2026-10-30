// Helpers comunes del portal de RRHH.
import { escape } from '../../../assets/core/ui.js';

export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function initials(name = '') { const p = String(name).trim().split(/\s+/); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
export const avatar = (p, size = 36) => `<span class="avatar" style="--av:${escape(p?.color || 'var(--primary)')};--size:${size}px" aria-hidden="true">${escape(initials(p?.name || '?'))}</span>`;
export const personCell = (p, sub) => p ? `<span class="cell-person">${avatar(p, 32)}<span><b>${escape(p.name)}</b><small>${escape(sub ?? p.position ?? '')}</small></span></span>` : '<span class="muted">—</span>';
export function rutDV(n) { let s = 0, m = 2; for (const c of String(n).split('').reverse()) { s += +c * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); }
export const fmtRut = n => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${rutDV(n)}`;
export function validRut(r) { const c = String(r).replace(/[.\s-]/g, '').toUpperCase(); if (!/^\d{7,8}[\dK]$/.test(c)) return false; return rutDV(c.slice(0, -1)) === c.slice(-1); }
export const COMPANY = { name: 'Grupo Cordillera', rut: '76.543.210-K', address: 'Av. Apoquindo 4800, Las Condes (ficticia)', domain: 'grupocordillera.demo' };

export const REQ_TYPES = {
  vacaciones: { label: 'Vacaciones', ico: '🏖️', paid: true, balance: true },
  administrativo: { label: 'Día administrativo', ico: '📄', paid: true, max: 2 },
  sin_goce: { label: 'Permiso sin goce', ico: '⏸️', paid: false },
  licencia: { label: 'Licencia médica', ico: '🩺', paid: true, doc: true },
  matrimonio: { label: 'Permiso por matrimonio/AUC', ico: '💍', paid: true, max: 5 },
  nacimiento: { label: 'Permiso por nacimiento', ico: '👶', paid: true, max: 5 },
  duelo: { label: 'Permiso por fallecimiento', ico: '🕯️', paid: true, max: 7 }
};
export const REQ_STATUS = { pendiente: ['Pendiente', 'badge-warning'], aprobada: ['Aprobada', 'badge-success'], rechazada: ['Rechazada', 'badge-danger'], anulada: ['Anulada', ''] };
export const reqBadge = s => `<span class="badge ${REQ_STATUS[s]?.[1] || ''}">${REQ_STATUS[s]?.[0] || s}</span>`;
export const STAGES = [['postulado', 'Postulado'], ['entrevista', 'Entrevista'], ['prueba', 'Prueba técnica'], ['oferta', 'Oferta'], ['contratado', 'Contratado']];
export const STAGE_LABEL = Object.fromEntries([...STAGES, ['descartado', 'Descartado']]);
export const PUBLIC_STAGE = { postulado: 'Recibida · en revisión', entrevista: 'Entrevistas', prueba: 'Evaluación técnica', oferta: 'Oferta laboral', contratado: '¡Contratado/a!', descartado: 'Proceso cerrado' };
export const EMP_STATUS = { activo: ['Activo', 'badge-success'], licencia: ['Con licencia', 'badge-warning'], desvinculado: ['Desvinculado', ''] };
export const empBadge = s => `<span class="badge ${EMP_STATUS[s]?.[1] || ''}">${EMP_STATUS[s]?.[0] || s}</span>`;

// Número a palabras (para el líquido de la liquidación).
const U = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
function under1000(n) {
  if (n === 0) return ''; if (n === 100) return 'cien';
  const c = Math.floor(n / 100), r = n % 100;
  const rest = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' y ' + U[r % 10] : '');
  return [C[c], rest].filter(Boolean).join(' ');
}
export function toWords(n) {
  n = Math.round(n);
  if (n === 0) return 'cero';
  const mill = Math.floor(n / 1e6), th = Math.floor((n % 1e6) / 1000), rest = n % 1000;
  return [mill ? (mill === 1 ? 'un millón' : under1000(mill) + ' millones') : '', th ? (th === 1 ? 'mil' : under1000(th) + ' mil') : '', under1000(rest)].filter(Boolean).join(' ');
}
