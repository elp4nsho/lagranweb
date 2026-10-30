// Helpers comunes: estados, avatares, empresa activa e índices de datos.
import { escape } from '../../../assets/core/ui.js';
import { today, dow, isWeekend } from './dates.js';

export const STATUS = {
  oficina: { label: 'En oficina', badge: 'badge-success' },
  reunion: { label: 'En reunión', badge: 'badge-warning' },
  remoto: { label: 'Remoto', badge: 'badge-info' },
  vacaciones: { label: 'Vacaciones', badge: '' }
};
export const STATUS_ORDER = ['oficina', 'reunion', 'remoto', 'vacaciones'];
export const statusBadge = s => `<span class="badge ${STATUS[s]?.badge || ''}">${STATUS[s]?.label || s}</span>`;

export const ROOM_TYPES = {
  meeting: 'Sala de reuniones', boardroom: 'Directorio', reception: 'Recepción', kitchen: 'Cocina', wc: 'Baños',
  lounge: 'Sala de estar', elevator: 'Ascensores', booths: 'Cabinas', it: 'TI · Bodega'
};
export const BOOKABLE = ['meeting', 'boardroom'];

export function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function initials(name = '') { const p = String(name).trim().split(/\s+/); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
export function avatar(p, size = 36, cls = '') {
  return `<span class="avatar ${cls}" style="--av:${escape(p?.color || 'var(--primary)')};--size:${size}px" aria-hidden="true">${escape(initials(p?.name || '?'))}</span>`;
}
export const areaTag = a => a ? `<span class="badge plain area-tag" style="--c:${escape(a.color)}"><i></i>${escape(a.name)}</span>` : '';

// Empresa activa (preferencia del visitante, no dato compartido).
const CO_KEY = 'oficina:co';
export function getCompanyId(db) {
  let id = null; try { id = localStorage.getItem(CO_KEY); } catch (e) { /* */ }
  const cos = db.all('companies');
  return cos.find(c => c.id === id) ? id : cos[0]?.id;
}
export function setCompanyId(id) { try { localStorage.setItem(CO_KEY, id); } catch (e) { /* */ } }

export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Índice de una empresa para una fecha: personas, puestos, reservas y estados.
export function buildIndex(db, companyId, date = today()) {
  const company = db.get('companies', companyId);
  const people = db.query('people', p => p.companyId === companyId);
  const areas = db.query('areas', a => a.companyId === companyId);
  const floors = db.query('floors', f => f.companyId === companyId).sort((a, b) => a.num - b.num);
  const byId = Object.fromEntries(people.map(p => [p.id, p]));
  const areaById = Object.fromEntries(areas.map(a => [a.id, a]));
  const desk = {};
  floors.forEach(f => (f.desks || []).forEach(d => { desk[d.id] = { desk: d, floor: f, zone: (f.zones || []).find(z => z.id === d.zoneId) || null }; }));
  const owner = {};
  people.forEach(p => { if (p.deskId && desk[p.deskId]) owner[p.deskId] = p; });
  const reports = {};
  people.forEach(p => { if (p.managerId) (reports[p.managerId] ||= []).push(p); });
  const res = db.query('reservations', r => r.companyId === companyId && r.date === date && r.status !== 'cancelada' && r.status !== 'liberada');
  const resByDesk = Object.fromEntries(res.map(r => [r.deskId, r]));
  const resByPerson = Object.fromEntries(res.map(r => [r.personId, r]));
  const leaves = db.query('leaves', l => l.companyId === companyId && l.from <= date && l.to >= date);
  const onLeave = new Set(leaves.map(l => l.personId));
  const isToday = date === today();

  const idx = {
    company, people, areas, floors, byId, areaById, desk, owner, reports, resByDesk, resByPerson, date,
    area: p => areaById[p?.areaId],
    colorOf: p => areaById[p?.areaId]?.color || '#64748b',
    statusOf(p) {
      const r = resByPerson[p.id];
      if (onLeave.has(p.id)) return 'vacaciones';
      if (isToday) return r && r.status === 'checkin' ? 'oficina' : p.status;
      if (isWeekend(date)) return 'remoto';
      if (r) return 'oficina';
      return (p.workDays || []).includes(dow(date)) && p.deskId ? 'oficina' : 'remoto';
    },
    seatOf(p) { const r = resByPerson[p.id]; return r ? r.deskId : (p.deskId && desk[p.deskId] ? p.deskId : null); },
    deskState(id) {
      const r = resByDesk[id];
      if (r && byId[r.personId]) return { state: r.status === 'checkin' ? 'checked' : 'res', person: byId[r.personId], res: r };
      const p = owner[id];
      if (p) { const s = idx.statusOf(p); return { state: s === 'oficina' ? 'occ' : s === 'reunion' ? 'meet' : 'away', person: p }; }
      const d = desk[id]?.desk;
      return { state: d && d.type === 'bloqueado' ? 'blocked' : 'free' };
    },
    whereText(p) {
      const sid = idx.seatOf(p);
      if (!sid) return `Remoto · ${p.city || company?.city || ''}`;
      const i = desk[sid];
      return `${i.floor.name} · ${i.desk.code}`;
    },
    search(q, limit) {
      const terms = norm(q.trim()).split(/\s+/).filter(Boolean);
      if (!terms.length) return [];
      const out = people.filter(p => { const h = norm([p.name, p.cargo, idx.area(p)?.name, (p.skills || []).join(' '), p.email, p.ext].join(' ')); return terms.every(t => h.includes(t)); })
        .sort((a, b) => (norm(a.name).startsWith(terms[0]) ? 0 : 1) - (norm(b.name).startsWith(terms[0]) ? 0 : 1) || a.name.localeCompare(b.name, 'es'));
      return limit ? out.slice(0, limit) : out;
    }
  };
  // Personas con color de su área (para avatares).
  people.forEach(p => { p.color = idx.colorOf(p); });
  return idx;
}

// Presencia en un día pasado (para gráficos): determinista según patrón y reservas.
export function presentOn(p, k, resSet, leaveFn) {
  if (isWeekend(k)) return false;
  if (leaveFn && leaveFn(p, k)) return false;
  if (resSet && resSet.has(p.id + '|' + k)) return true;
  if (!p.deskId) return false;
  if (!(p.workDays || []).includes(dow(k))) return hash(p.id + k) % 100 < 6;
  return hash(p.id + k) % 100 < 88;
}

export function rutDV(n) { let s = 0, m = 2; for (const c of String(n).split('').reverse()) { s += +c * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); }
export const fmtRut = n => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${rutDV(n)}`;
