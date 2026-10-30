// Núcleo de precios (sin dependencias de la DB para poder usarlo en la semilla).
// Precio = mano de obra/insumos por segmento + (si el servicio lleva aceite) litros × precio del aceite recomendado.
export function servicePrice(svc, veh, oils) {
  if (!svc) return 0;
  let p = (svc.prices && svc.prices[veh.segment]) || 0;
  if (svc.oil) {
    const oil = oils.find(o => o.id === veh.oil) || oils[0];
    p += Math.round((oil?.pricePerL || 0) * (veh.liters || 4) / 10) * 10;
  }
  return p;
}
export const pad = n => String(n).padStart(2, '0');
export const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
export const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return iso(new Date(y, m - 1, d + n)); };
export const today = () => iso(new Date());
export const normPlate = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export function fmtPlate(s) {
  const p = normPlate(s);
  if (/^[A-Z]{4}\d{2}$/.test(p)) return p.slice(0, 4) + '-' + p.slice(4);
  if (/^[A-Z]{2}\d{4}$/.test(p)) return p.slice(0, 2) + '-' + p.slice(2);
  return p;
}
export const validPlate = s => /^([A-Z]{4}\d{2}|[A-Z]{2}\d{4})$/.test(normPlate(s));
export function rutDV(n) { let s = 0, m = 2; for (const d of String(n).split('').reverse()) { s += +d * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); }
export const fmtRut = n => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${rutDV(n)}`;
