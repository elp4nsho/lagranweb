// Simulación de sensores y motor de alarmas.
// Cada lectura es una función determinista del tiempo: todas las pestañas ven los mismos
// valores, y el historial (1 h a 30 días) se reconstruye sin guardar telemetría.
import { db } from '../data/db.js';

export const TYPES = {
  temperatura: { label: 'Temperatura', unit: '°C', icon: '🌡️', dec: 1 },
  oxigeno: { label: 'Oxígeno disuelto', unit: 'mg/L', icon: '🫧', dec: 2 },
  ph: { label: 'pH', unit: 'pH', icon: '🧪', dec: 2 },
  energia: { label: 'Energía', unit: 'kW', icon: '⚡', dec: 0 },
  vibracion: { label: 'Vibración', unit: 'mm/s', icon: '〰️', dec: 2 },
};
export const SEVERITY = { critica: ['Crítica', 'danger'], alta: ['Alta', 'warning'], media: ['Media', 'info'], baja: ['Baja', 'primary'] };

const hashStr = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
const noise = (k, seed) => { const x = Math.sin(k * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x); };
function smooth(s, seed, step) { const k = Math.floor(s / step), f = s / step - k; const a = noise(k, seed), b = noise(k + 1, seed); return a + (b - a) * (f * f * (3 - 2 * f)); }

// Valor de un dispositivo en el instante t (ms). null si está sin conexión o inactivo.
export function value(d, t = Date.now()) {
  if (!d || d.offline || d.status === 'inactivo') return null;
  const s = t / 1000, seed = hashStr(d.id) * 1000;
  let v = d.base + d.amp * Math.sin((2 * Math.PI * s) / (d.period || 900) + (d.phase || 0));
  v += (smooth(s, seed, 4) - .5) * 2 * d.noise + (noise(Math.floor(s), seed + 3) - .5) * d.noise * .6;
  if (d.type === 'temperatura' && d.tag === 'agua') v += .6 * Math.sin((2 * Math.PI * (s / 86400)) - 1.2);
  if (d.type === 'energia') { const hr = new Date(t).getHours(); v *= hr >= 8 && hr < 20 ? 1.15 : .78; }
  if (d.anomaly) {
    const { every, len, delta } = d.anomaly;
    const pos = (s + seed) % every;
    if (pos < len) { const ramp = Math.min(1, pos / 12, (len - pos) / 12); v += delta * ramp; }
  }
  return v;
}

export function fmt(d, v) {
  if (v == null) return '—';
  const t = TYPES[d.type];
  return `${v.toFixed(t.dec).replace('.', ',')} ${t.unit}`;
}

// Reglas que aplican a un dispositivo.
export const rulesFor = (d, rules = db.all('rules')) => rules.filter(r => r.deviceId ? r.deviceId === d.id : r.type === d.type && (!r.tag || r.tag === d.tag));
const breached = (r, v) => (r.op === '>' ? v > r.threshold : v < r.threshold);

// Estado visual: ok | warn (cerca del umbral) | alarm | offline | maint
export function status(d, v = value(d), rules) {
  if (d.offline) return 'offline';
  if (d.status !== 'activo') return 'maint';
  const rs = rulesFor(d, rules).filter(r => r.active);
  if (rs.some(r => breached(r, v))) return 'alarm';
  if (rs.some(r => { const margin = Math.max(Math.abs(r.threshold) * .12, d.amp * 1.2); return r.op === '>' ? v > r.threshold - margin : v < r.threshold + margin; })) return 'warn';
  return 'ok';
}
export const STATUS_LABEL = { ok: ['Normal', 'success'], warn: ['Precaución', 'warning'], alarm: ['En alarma', 'danger'], offline: ['Sin conexión', 'primary'], maint: ['Mantención', 'info'] };
export const STATUS_COLOR = { ok: 'var(--success)', warn: 'var(--warning)', alarm: 'var(--danger)', offline: 'var(--muted)', maint: 'var(--info)' };

// Serie histórica: n puntos entre from y to.
export function history(d, from, to, n = 120) {
  const out = [], step = (to - from) / (n - 1);
  for (let i = 0; i < n; i++) { const t = from + i * step; out.push({ t, v: value(d, t) }); }
  return out;
}

// Energía diaria (kWh) de un medidor, reproducible por día.
export function dailyKwh(d, dayStart) {
  const k = Math.floor(dayStart / 864e5);
  const weekday = new Date(dayStart).getDay();
  const factor = weekday === 0 ? .72 : weekday === 6 ? .85 : 1;
  return Math.round(d.base * 24 * factor * (.9 + noise(k, hashStr(d.id) * 500) * .22));
}

// ---------- Motor de alarmas (corre en cada página operativa, 1 vez por segundo) ----------
const since = new Map();
export function tick(onAlarm) {
  const now = Date.now();
  const rules = db.query('rules', r => r.active);
  const devices = db.query('devices', d => d.status === 'activo' && !d.offline);
  const open = db.query('alarms', a => a.status !== 'resuelta');
  for (const d of devices) {
    const v = value(d, now);
    for (const r of rulesFor(d, rules)) {
      const key = r.id + '|' + d.id;
      const existing = open.find(a => a.ruleId === r.id && a.deviceId === d.id);
      if (breached(r, v)) {
        if (!since.has(key)) since.set(key, now);
        if (!existing && now - since.get(key) >= r.duration * 1000) {
          const a = db.insert('alarms', { code: `AL-${3200 + db.count('alarms')}`, ruleId: r.id, ruleName: r.name, deviceId: d.id, siteId: d.siteId, value: Math.round(v * 100) / 100, threshold: r.threshold, op: r.op, severity: r.severity, status: 'activa', assignee: null, comments: [], cleared: false, notify: r.notify });
          db.log('alarma', `${a.code} ${r.name} · ${d.name} = ${fmt(d, v)} (umbral ${r.op} ${r.threshold})`, null);
          onAlarm && onAlarm(a, d);
        } else if (existing && existing.cleared) db.update('alarms', existing.id, { cleared: false });
      } else {
        since.delete(key);
        if (existing && !existing.cleared) db.update('alarms', existing.id, { cleared: true, clearedAt: new Date().toISOString() });
      }
    }
  }
}

export function currentShift(d = new Date()) {
  const h = d.getHours();
  return h >= 7 && h < 15 ? 'A' : h >= 15 && h < 23 ? 'B' : 'C';
}
export const SHIFT_LABEL = { A: 'Turno A (07–15 h)', B: 'Turno B (15–23 h)', C: 'Turno C (23–07 h)' };
