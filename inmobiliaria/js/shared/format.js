// Constantes y formato del dominio inmobiliario.
import { money, num, escape } from '../../../assets/core/ui.js';
import { comunaName } from './geo.js';

export const OPS = { venta: 'Venta', arriendo: 'Arriendo' };
export const TYPES = { departamento: 'Departamento', casa: 'Casa', oficina: 'Oficina', local: 'Local comercial', terreno: 'Terreno' };
export const PSTATUS = {
  borrador: ['Borrador', ''], revision: ['En revisión', 'warning'], publicada: ['Publicada', 'success'], reservada: ['Reservada', 'info'],
  vendida: ['Vendida', 'primary'], arrendada: ['Arrendada', 'primary']
};
export const LSTATUS = {
  nuevo: ['Nuevo', 'danger'], contactado: ['Contactado', 'info'], visita: ['Visita agendada', 'primary'], negociacion: ['Negociación', 'warning'], ganado: ['Ganado', 'success'], perdido: ['Perdido', '']
};
export const VSTATUS = { pendiente: ['Pendiente', 'warning'], confirmada: ['Confirmada', 'info'], realizada: ['Realizada', 'success'], cancelada: ['Cancelada', 'danger'] };
export const PAYSTATUS = { pagado: ['Pagado', 'success'], pendiente: ['Pendiente', 'warning'], atrasado: ['Atrasado', 'danger'] };

export function badge(map, key) {
  const [label, tone] = map[key] || [key, ''];
  return `<span class="badge ${tone ? 'badge-' + tone : ''}">${escape(label)}</span>`;
}

const ufFmt = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const ufFmt2 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtUF = (n, dec = false) => 'UF ' + (dec ? ufFmt2 : ufFmt).format(n || 0);
export const toUF = (p, uf) => (p.currency === 'UF' ? p.price : p.price / uf);
export const toCLP = (p, uf) => (p.currency === 'UF' ? p.price * uf : p.price);
export const mainPrice = p => (p.currency === 'UF' ? fmtUF(p.price) : money(p.price));
export const altPrice = (p, uf) => (p.currency === 'UF' ? '≈ ' + money(p.price * uf) : '≈ ' + fmtUF(p.price / uf, true));
export const ufM2 = (p, uf) => (p.m2 ? toUF(p, uf) / p.m2 : 0);
export const specs = p => [p.dorms ? `${p.dorms} dorm.` : '', p.baths ? `${p.baths} baño${p.baths > 1 ? 's' : ''}` : '', `${num(p.m2)} m²`].filter(Boolean).join(' · ');
export { comunaName };

// Filtro de búsqueda compartido (resultados públicos y alertas de búsquedas guardadas).
export function matchQuery(p, q = {}, uf = 40000) {
  if (p.status !== 'publicada' && !(q.all && p.status === 'reservada')) return false;
  if (q.op && p.op !== q.op) return false;
  if (q.tipo && p.type !== q.tipo) return false;
  if (q.comuna && !String(q.comuna).split(',').includes(p.comuna)) return false;
  if (q.dorm && p.dorms < +q.dorm) return false;
  if (q.bano && p.baths < +q.bano) return false;
  if (q.m2 && p.m2 < +q.m2) return false;
  const unit = q.unit || 'UF';
  const val = unit === 'UF' ? toUF(p, uf) : toCLP(p, uf);
  if (q.min && val < +q.min) return false;
  if (q.max && val > +q.max) return false;
  if (q.q) {
    const s = `${p.title} ${p.address} ${comunaName(p.comuna)} ${p.code} ${p.features.join(' ')}`.toLowerCase();
    if (!s.includes(String(q.q).toLowerCase())) return false;
  }
  return true;
}
export function queryLabel(q = {}) {
  const parts = [q.op ? OPS[q.op] : 'Venta y arriendo', q.tipo ? TYPES[q.tipo] : '', q.comuna ? String(q.comuna).split(',').map(comunaName).join(', ') : '',
    q.dorm ? `${q.dorm}+ dorm.` : '', q.max ? `hasta ${q.unit === 'CLP' ? money(+q.max) : fmtUF(+q.max)}` : ''];
  return parts.filter(Boolean).join(' · ');
}
export const qs = obj => new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== '' && v != null)).toString();

// Dividendo mensual (sistema francés).
export function dividend(priceUF, downPct, rate, years) {
  const P = priceUF * (1 - downPct / 100), i = rate / 100 / 12, n = years * 12;
  if (P <= 0) return 0;
  return i === 0 ? P / n : (P * i) / (1 - Math.pow(1 + i, -n));
}
export const monthLabel = key => new Date(key + '-15').toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
