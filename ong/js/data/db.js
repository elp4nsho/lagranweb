// "Backend" de Fundación Raíces del Sur: compartido por el sitio, la cuenta de donantes/voluntarios y el panel.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('ong', { version: 3, seed });
export const auth = createAuth(db, { roles: { admin: 'Administrador', coordinador: 'Coordinador', contador: 'Contador', voluntario: 'Voluntario', donante: 'Donante' } });
export const STAFF = ['admin', 'coordinador', 'contador'];

export const site = () => db.getValue('site');
export const today = () => new Date().toISOString().slice(0, 10);
export const ok = d => d.status === 'aprobada';

export const CAMPAIGN_ST = { borrador: ['Borrador', ''], publicada: ['Publicada', 'success'], pausada: ['Pausada', 'warning'], finalizada: ['Finalizada', 'info'] };
export const DONATION_ST = { aprobada: ['Aprobada', 'success'], rechazada: ['Rechazada', 'danger'], reembolsada: ['Reembolsada', 'warning'] };
export const SUB_ST = { activa: ['Activa', 'success'], pausada: ['Pausada', 'warning'], cancelada: ['Cancelada', 'danger'] };

export function campaignStats(c) {
  const list = db.query('donations', d => d.campaignId === c.id && ok(d));
  const raised = list.reduce((s, d) => s + d.amount, 0);
  const donors = new Set(list.map(d => d.donorId || d.email)).size;
  const daysLeft = Math.ceil((new Date(c.endDate + 'T23:59:59') - Date.now()) / 864e5);
  return { raised, donors, count: list.length, pct: c.goal ? raised / c.goal * 100 : 0, daysLeft, list };
}
export const publicCampaigns = () => db.query('campaigns', c => ['publicada', 'finalizada'].includes(c.status)).sort((a, b) => (a.status === 'finalizada') - (b.status === 'finalizada') || (b.featured - a.featured) || (!!b.urgent - !!a.urgent));
export const campaignName = id => id ? (db.get('campaigns', id)?.title || 'Campaña eliminada') : 'Fondo general';

export function donorStats(donorId) {
  const list = db.query('donations', d => d.donorId === donorId && ok(d));
  const total = list.reduce((s, d) => s + d.amount, 0);
  const last = list.map(d => d.createdAt).sort().pop() || '';
  const sub = db.find('subscriptions', s => s.donorId === donorId && s.status === 'activa');
  return { total, count: list.length, last, sub, list };
}
export function segmentOf(donor) {
  const st = donorStats(donor.id);
  if (donor.type === 'empresa') return 'Empresa';
  if (st.total >= 400000) return 'Mayor';
  if (st.sub) return 'Recurrente';
  if (!st.count) return 'Prospecto';
  if (Date.now() - new Date(st.last) > 180 * 864e5) return 'Inactivo';
  return st.count === 1 ? 'Primera vez' : 'Ocasional';
}
export const SEGMENTS = ['Mayor', 'Recurrente', 'Empresa', 'Ocasional', 'Primera vez', 'Inactivo', 'Prospecto'];

export function nextReceipt() {
  const y = new Date().getFullYear();
  const max = db.all('donations').filter(d => d.receiptNo && d.receiptNo.startsWith(`RS-${y}`)).reduce((m, d) => Math.max(m, +d.receiptNo.slice(8)), 0);
  return `RS-${y}-${String(max + 1).padStart(5, '0')}`;
}

// Busca o crea la ficha del donante en el CRM.
export function upsertDonor({ name, email, phone = '', region = '' }) {
  let d = db.find('donors', x => x.email.toLowerCase() === email.toLowerCase());
  if (!d) d = db.insert('donors', { name, email, phone, region, type: 'persona', tags: [], notes: [] });
  return d;
}

export function nextChargeDate(day) {
  const n = new Date(); n.setDate(Math.min(28, day));
  if (n.getTime() <= Date.now()) n.setMonth(n.getMonth() + 1);
  return n.toISOString().slice(0, 10);
}

export const totals = () => {
  const year = String(new Date().getFullYear());
  const dons = db.query('donations', d => ok(d) && d.createdAt.startsWith(year));
  return { raisedYear: dons.reduce((s, d) => s + d.amount, 0), donorsYear: new Set(dons.map(d => d.donorId)).size, monthly: db.count('subscriptions', s => s.status === 'activa'), volunteers: db.count('volunteers', v => v.status === 'activo') };
};
