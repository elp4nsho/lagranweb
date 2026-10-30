// Utilidades de Atiende: formato, avatares, duraciones, markdown simple, búsqueda en la base de conocimiento.
import { db } from '../data/db.js';
import { escape, downloadCSV, toast, norm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';

export const MIN = 60000, DAY = 864e5;
export const userById = id => db.get('users', id);
export const userName = id => userById(id)?.name || 'Sin asignar';
export const groupName = id => db.get('groups', id)?.name || 'Sin grupo';
export const catName = id => db.get('categories', id)?.name || 'General';
export const avatar = (u, size = 28) => u ? `<span class="avatar" style="--size:${size}px;--av:${escape(u.color || '#64748b')}" title="${escape(u.name)}">${escape(initials(u.name))}</span>` : `<span class="avatar avatar-empty" style="--size:${size}px" title="Sin asignar">?</span>`;
export const userChip = (id, size = 24) => { const u = userById(id); return `<span class="user-chip">${avatar(u, size)}<span>${escape(u ? u.name : 'Sin asignar')}</span></span>`; };
export const agents = () => db.query('users', u => ['agente', 'supervisor'].includes(u.role) && u.active !== false);
export const requester = t => t.customerId ? userById(t.customerId) : (t.guest ? { name: t.guest.name, email: t.guest.email, guest: true, color: '#64748b' } : null);

export function duration(min) {
  const m = Math.abs(Math.round(min));
  if (m < 60) return `${m} min`;
  if (m < 1440) { const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h`; }
  const d = Math.floor(m / 1440), h = Math.round((m % 1440) / 60); return h ? `${d} d ${h} h` : `${d} d`;
}
export const median = arr => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); const k = Math.floor(s.length / 2); return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
export const startOfWeek = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const monthKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const monthLabel = k => M[+k.split('-')[1] - 1];
export const lastMonths = n => { const out = []; const d = new Date(); d.setDate(1); for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); out.push(monthKey(x)); } return out; };
export const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
export const fileSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
export function exportCSV(name, rows) {
  if (!rows.length) return toast('No hay filas para exportar', 'warning');
  downloadCSV(name, rows); toast(`Exportado ${name} (${rows.length} filas)`, 'success');
}

// Markdown mínimo para artículos: "## título", "- viñeta", **negrita**, párrafos.
export function md(text) {
  const lines = String(text || '').split('\n');
  let out = '', list = false;
  const inline = s => escape(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[(.+?)\]\((https?:\/\/[^\s)]+|#[^\s)]*)\)/g, '<a href="$2">$1</a>');
  lines.forEach(l => {
    const t = l.trim();
    if (t.startsWith('- ')) { if (!list) { out += '<ul>'; list = true; } out += `<li>${inline(t.slice(2))}</li>`; return; }
    if (list) { out += '</ul>'; list = false; }
    if (t.startsWith('## ')) out += `<h3>${inline(t.slice(3))}</h3>`;
    else if (t) out += `<p>${inline(t)}</p>`;
  });
  if (list) out += '</ul>';
  return out;
}
export const excerpt = (text, n = 140) => { const s = String(text || '').replace(/##\s|-\s|\*\*/g, '').replace(/\n+/g, ' '); return s.length > n ? s.slice(0, n).trim() + '…' : s; };

// Búsqueda por relevancia en artículos publicados.
const STOP = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'mi', 'me', 'en', 'no', 'que', 'y', 'un', 'una', 'con', 'por', 'para', 'se', 'es', 'como', 'tengo', 'hola', 'al', 'lo', 'su', 'muy', 'esta', 'está']);
export function searchArticles(q, { limit = 10, includeDrafts = false } = {}) {
  const words = norm(q).split(/[^a-z0-9ñ]+/).filter(w => w.length > 2 && !STOP.has(w));
  if (!words.length) return [];
  return db.query('articles', a => includeDrafts || a.status === 'publicado').map(a => {
    const title = norm(a.title), tags = norm((a.tags || []).join(' ')), body = norm(a.body);
    let s = 0;
    words.forEach(w => { const stem = w.length > 5 ? w.slice(0, -1) : w; if (title.includes(stem)) s += 6; if (tags.includes(stem)) s += 4; if (body.includes(stem)) s += 1; });
    return { a, s };
  }).filter(x => x.s > 0).sort((x, y) => y.s - x.s || y.a.views - x.a.views).slice(0, limit).map(x => x.a);
}
