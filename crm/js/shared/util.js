// Utilidades del CRM: fechas, búsqueda de entidades, montos, scoring y CSV.
import { db } from '../data/db.js';
import { money, escape, downloadCSV, toast } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { IVA } from './constants.js';

export const DAY = 864e5;
export const monthKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const monthLabel = (key, long = false) => { const [y, m] = key.split('-').map(Number); return long ? `${MONTHS_L[m - 1]} ${y}` : MONTHS[m - 1]; };
export function lastMonths(n, offset = 0) {
  const out = [];
  const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i + offset); out.push(monthKey(x)); }
  return out;
}
export const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfWeek = d => { const x = startOfDay(d); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); };
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
export const toLocalInput = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
export const toDateInput = d => toLocalInput(d).slice(0, 10);
export const quarterStart = () => { const d = new Date(); return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1); };

export const moneyShort = n => {
  const a = Math.abs(n || 0);
  if (a >= 1e9) return '$' + (n / 1e9).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' mil M';
  if (a >= 1e6) return '$' + (n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' M';
  if (a >= 1e3) return '$' + Math.round(n / 1e3).toLocaleString('es-CL') + ' mil';
  return money(n);
};

// Búsquedas rápidas
export const userById = id => db.get('users', id);
export const userName = id => userById(id)?.name || 'Sin asignar';
export const companyName = id => db.get('companies', id)?.name || '—';
export const contactName = id => db.get('contacts', id)?.name || '—';
export const productName = id => db.get('products', id)?.name || 'Producto eliminado';
export const avatar = (u, size = 28) => u ? `<span class="avatar" style="--size:${size}px;--av:${escape(u.color || '#64748b')}" title="${escape(u.name)}">${escape(initials(u.name))}</span>` : `<span class="avatar avatar-empty" style="--size:${size}px" title="Sin asignar">?</span>`;
export const userChip = (id, size = 24) => { const u = userById(id); return `<span class="user-chip">${avatar(u, size)}<span>${escape(u ? u.name : 'Sin asignar')}</span></span>`; };
export const reps = () => db.query('users', u => u.role === 'ejecutivo' && u.active !== false);
export const sellers = () => db.query('users', u => u.active !== false && u.role !== 'admin');

// Cotizaciones
export const lineTotal = it => Math.round((+it.qty || 0) * (+it.price || 0) * (1 - (+it.discount || 0) / 100));
export function quoteTotals(items = []) {
  const net = items.reduce((s, it) => s + lineTotal(it), 0);
  const iva = Math.round(net * IVA);
  return { net, iva, total: net + iva };
}

// Scoring de leads (0-100): fuente + tamaño + datos completos + estado + actividad reciente.
export function leadScore(l) {
  const weights = db.getValue('settings', {}).scoring || {};
  let s = weights[l.source] ?? 10;
  s += { '1-10': 4, '11-50': 12, '51-200': 20, '201-500': 24, '500+': 28 }[l.size] || 8;
  if (l.phone) s += 8;
  if (l.email && !/gmail|hotmail|yahoo|outlook/i.test(l.email)) s += 8;
  if (l.message) s += 6;
  s += { nuevo: 0, contactado: 8, calificado: 18, descartado: -40, convertido: 20 }[l.status] || 0;
  const days = (Date.now() - new Date(l.createdAt)) / DAY;
  if (days < 7) s += 10; else if (days > 60) s -= 10;
  s += l.bonus || 0;
  return Math.max(0, Math.min(100, Math.round(s)));
}
export const scoreBadge = s => s >= 70 ? `<span class="badge badge-danger">Caliente · ${s}</span>` : s >= 45 ? `<span class="badge badge-warning">Tibio · ${s}</span>` : `<span class="badge badge-info">Frío · ${s}</span>`;

// Plantillas de correo con variables {{nombre}}, {{empresa}}, {{ejecutivo}}
export function fillTemplate(text, { contact, company, user } = {}) {
  return String(text || '')
    .replace(/\{\{nombre\}\}/g, contact ? contact.name.split(' ')[0] : 'cliente')
    .replace(/\{\{empresa\}\}/g, company ? company.name : 'tu empresa')
    .replace(/\{\{ejecutivo\}\}/g, user ? user.name : 'Equipo Pulso');
}

// CSV: detecta ; o , y respeta comillas.
export function parseCSV(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const split = line => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === sep && !q) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  return lines.map(split);
}
export function exportCSV(name, rows) {
  if (!rows.length) return toast('No hay filas para exportar', 'warning');
  downloadCSV(name, rows);
  toast(`Exportado ${name} (${rows.length} filas)`, 'success');
}
export const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
export const fileSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
