// Lógica de negocio compartida entre la app del cliente y el back-office.
import { db, site } from '../data/db.js';
import { pmt, rutDV, fmtRut, BILLERS, CATEGORIES } from '../data/seed.js';
import { rng } from '../../../assets/core/db.js';
import { money } from '../../../assets/core/ui.js';

export { pmt, rutDV, fmtRut, BILLERS, CATEGORIES };

export const ACCOUNT_LABEL = { vista: 'Cuenta Vista', ahorro: 'Cuenta de Ahorro', credito: 'Tarjeta de Crédito' };
export const CAT_ICON = { Supermercado: '🛒', Restaurantes: '🍽️', Transporte: '🚌', Servicios: '💡', Entretención: '🎬', Salud: '🩺', Compras: '🛍️', Educación: '🎓', Transferencias: '↔️', Ingresos: '💰', Ahorro: '🐷', Inversiones: '📈', Créditos: '🏦', Pagos: '🧾' };

export function validRut(s) {
  const clean = String(s).replace(/[.\s-]/g, '').toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(clean)) return false;
  return rutDV(clean.slice(0, -1)) === clean.slice(-1);
}
export function normalizeRut(s) {
  const clean = String(s).replace(/[.\s-]/g, '').toUpperCase();
  return fmtRut(clean.slice(0, -1));
}

export const accountsOf = uid => db.query('accounts', a => a.userId === uid);
export const account = (uid, type) => db.find('accounts', a => a.userId === uid && a.type === type);
export const creditAvailable = acc => Math.max(0, (acc.limit || 0) - (acc.balance || 0));
export const maskCard = n => `•••• •••• •••• ${String(n).slice(-4)}`;

export function notify(userId, title, body, kind = 'info') {
  return db.insert('notifications', { userId, title, body, kind, read: false, at: new Date().toISOString() });
}

// Registra un movimiento y mueve saldos. Para crédito el "balance" es la deuda usada.
export function postTx(acc, { amount, desc, category, type, counterpart = '', channel = 'app', status = 'ok', meta }) {
  const tx = db.insert('transactions', { userId: acc.userId, accountId: acc.id, date: new Date().toISOString(), amount, desc, category, type, counterpart, channel, status, meta });
  if (status !== 'rechazada') {
    db.update('accounts', acc.id, a => ({ balance: a.type === 'credito' ? a.balance - amount : a.balance + amount }));
  }
  return tx;
}

// Motor antifraude: evalúa reglas activas sobre un movimiento recién creado.
// Devuelve { held, alerts }. Las reglas con acción "retener" dejan el movimiento retenido.
export function evaluateFraud(tx, { newRecipient = false } = {}) {
  const rules = db.query('fraudRules', r => r.active);
  const amount = Math.abs(tx.amount);
  const hour = new Date(tx.date).getHours();
  const hits = [];
  for (const r of rules) {
    if (r.channel !== 'todos' && r.channel !== tx.type) continue;
    let hit = false;
    if (r.type === 'monto') hit = amount >= r.threshold;
    else if (r.type === 'nuevo_destinatario') hit = newRecipient && amount >= r.threshold;
    else if (r.type === 'horario') hit = hour < 6 && amount >= r.threshold;
    else if (r.type === 'velocidad') {
      const since = Date.now() - r.windowMin * 6e4;
      hit = db.count('transactions', t => t.userId === tx.userId && t.amount < 0 && (r.channel === 'todos' || t.type === r.channel) && new Date(t.date).getTime() >= since) >= r.count;
    }
    if (hit) hits.push(r);
  }
  const alerts = hits.map(r => db.insert('alerts', {
    txId: tx.id, userId: tx.userId, ruleId: r.id, ruleName: r.name, severity: r.severity, amount,
    score: Math.min(99, 40 + Math.round(amount / 60000) + (r.severity === 'alta' ? 25 : r.severity === 'media' ? 12 : 0)),
    status: 'abierta', resolution: '', assignee: null, notes: [],
  }));
  const held = hits.some(r => r.action === 'retener');
  if (held) {
    db.update('transactions', tx.id, { status: 'retenida' });
    notify(tx.userId, 'Operación retenida por seguridad', `Tu operación por ${money(amount)} quedó en revisión. Un analista la validará pronto.`, 'seguridad');
  }
  if (alerts.length) db.log('fraude', `${alerts.length} alerta(s) por ${money(amount)} · ${hits.map(h => h.name).join(', ')}`, tx.userId);
  return { held, alerts };
}

// Puntaje de crédito simulado con desglose (para la evaluación de créditos).
export function scoreLoan(user, amount, term) {
  const income = user?.income || 500000;
  const monthly = pmt(amount, (site().fees?.find(f => f.id === 'tasaCredito')?.value || 1.2) / 100, term);
  const burden = monthly / income;
  const ageMonths = user ? (Date.now() - new Date(user.createdAt)) / (30 * 864e5) : 0;
  const balances = accountsOf(user?.id).filter(a => a.type !== 'credito').reduce((s, a) => s + a.balance, 0);
  const parts = [
    { label: 'Ingresos declarados', pts: Math.min(260, Math.round(income / 10000)) },
    { label: 'Carga financiera (cuota / renta)', pts: Math.round(Math.max(0, 1 - burden / .45) * 220) },
    { label: 'Antigüedad como cliente', pts: Math.min(150, Math.round(ageMonths * 8)) },
    { label: 'Saldos promedio', pts: Math.min(150, Math.round(balances / 40000)) },
    { label: 'Comportamiento y riesgo', pts: user?.risk === 'alto' ? 20 : user?.risk === 'medio' ? 70 : 120 },
  ];
  const score = Math.max(300, Math.min(999, 300 + parts.reduce((s, p) => s + p.pts, 0) * .75 | 0));
  return { score, parts, monthly: Math.round(monthly), burden };
}
export const scoreBand = s => (s >= 750 ? ['Bajo riesgo', 'success'] : s >= 600 ? ['Riesgo medio', 'warning'] : ['Riesgo alto', 'danger']);

// Serie mensual simulada (reproducible) del valor cuota de un fondo.
export function fundSeries(fund, months = 12) {
  const r = rng([...fund.id].reduce((s, c) => s + c.charCodeAt(0), 7));
  let v = 1000;
  const out = [];
  const d = new Date(); d.setDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    v *= 1 + fund.annual / 1200 + (r() - .5) * fund.vol / 50;
    out.push({ label: m.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''), value: Math.round(v * 100) / 100 });
  }
  return out;
}
export function investmentValue(inv) {
  const fund = db.get('funds', inv.fundId);
  if (!fund) return inv.amount;
  const days = (Date.now() - new Date(inv.since)) / 864e5;
  const r = rng(inv.id.length * 31 + Math.round(inv.amount / 1000));
  return Math.round(inv.amount * (1 + (fund.annual / 100) * days / 365 + (r() - .4) * fund.vol / 100));
}

export function monthKey(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; }
export function lastMonths(n) {
  const out = [], d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const m = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push({ key: monthKey(m), label: m.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '') }); }
  return out;
}

export const STATUS_BADGE = {
  ok: ['Aprobada', 'success'], pendiente: ['Pendiente', 'warning'], retenida: ['Retenida', 'warning'], rechazada: ['Rechazada', 'danger'], revertida: ['Revertida', 'danger'],
  activa: ['Activa', 'success'], congelada: ['Congelada', 'info'], bloqueada: ['Bloqueada', 'danger'], inactiva: ['Inactiva', 'warning'], 'en revisión': ['En revisión', 'warning'], cerrada: ['Cerrada', 'primary'],
  aprobado: ['Aprobado', 'success'], rechazado: ['Rechazado', 'danger'], solicitado: ['Solicitado', 'info'], 'en evaluación': ['En evaluación', 'warning'], desembolsado: ['Desembolsado', 'primary'],
  abierta: ['Abierta', 'danger'], 'en investigación': ['En investigación', 'warning'],
  abierto: ['Abierto', 'danger'], 'en curso': ['En curso', 'warning'], 'esperando cliente': ['Esperando cliente', 'info'], resuelto: ['Resuelto', 'success'],
  alta: ['Alta', 'danger'], media: ['Media', 'warning'], baja: ['Baja', 'info'],
  pagada: ['Pagada', 'success'],
};
export function badge(status) {
  const [label, kind] = STATUS_BADGE[status] || [status, 'primary'];
  return `<span class="badge badge-${kind}">${label}</span>`;
}

// Código 2FA simulado: se "envía por SMS" (toast) y se valida en un modal.
export function newOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }

// Patrón tipo QR (decorativo) a partir de un texto, dibujado con currentColor.
export function qrSvg(text, size = 220) {
  let h = 0; for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const r = rng(h), n = 25, cell = 10;
  let rects = '';
  const finder = (x, y) => `<path fill-rule="evenodd" d="M${x * cell} ${y * cell}h${7 * cell}v${7 * cell}h${-7 * cell}z M${(x + 1) * cell} ${(y + 1) * cell}v${5 * cell}h${5 * cell}v${-5 * cell}z"/><rect x="${(x + 2) * cell}" y="${(y + 2) * cell}" width="${3 * cell}" height="${3 * cell}"/>`;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const inFinder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    if (!inFinder && r() > .52) rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`;
  }
  return `<svg viewBox="-10 -10 ${n * cell + 20} ${n * cell + 20}" width="${size}" height="${size}" class="qr" fill="currentColor" role="img" aria-label="Código QR de pago">${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}${rects}</svg>`;
}
