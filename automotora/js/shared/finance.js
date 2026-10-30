// Motor financiero: cuota, CAE, costo total y pre-evaluación crediticia simulada.
import { hash, rutClean } from './util.js';
export const IVA = .19;
export const KINDS = { contado: 'Contado', convencional: 'Crédito convencional', inteligente: 'Compra Inteligente', leasing: 'Leasing empresas' };

const annuity = (C, i, n) => i === 0 ? C / n : C * i / (1 - Math.pow(1 + i, -n));
// TIR mensual por bisección: monto recibido vs flujo de pagos
function irr(received, flows) {
  let lo = 0, hi = .2;
  const npv = r => flows.reduce((s, f, k) => s + f / Math.pow(1 + r, k + 1), 0) - received;
  for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; npv(mid) > 0 ? (lo = mid) : (hi = mid); }
  return (lo + hi) / 2;
}
export const plazosOf = p => Object.keys(p.rates || {}).map(Number).sort((a, b) => a - b);

// simulate({ product, price, pie, plazo, tradeIn, rate? })
export function simulate({ product, price, pie = 0, plazo, tradeIn = 0, rate }) {
  const down = Math.min(price, pie + tradeIn);
  if (!product || product.type === 'contado') return { kind: 'contado', price, down, total: price, cuota: 0, n: 0, financed: 0, cae: 0, rows: [] };
  const n = plazo || plazosOf(product)[0];
  const i = (rate ?? product.rates[n] ?? Object.values(product.rates)[0]) / 100;
  if (product.type === 'leasing') {
    const neto = price / (1 + IVA), netDown = down / (1 + IVA), financed = Math.max(0, neto - netDown) + (product.fees || 0);
    const cuotaNeta = financed / ((1 - Math.pow(1 + i, -n)) / i + Math.pow(1 + i, -(n + 1))); // + opción de compra = 1 cuota
    const flows = Array(n + 1).fill(cuotaNeta);
    const total = netDown + cuotaNeta * (n + 1);
    return { kind: 'leasing', price, neto, down, financed, n, i, cuota: cuotaNeta, cuotaIva: cuotaNeta * (1 + IVA), option: cuotaNeta, total, totalIva: total * (1 + IVA), ivaRecuperable: total * IVA, cae: irr(financed - (product.fees || 0), flows) * 12 * 100, rows: [['Valor neto (sin IVA)', neto], ['Pie neto', netDown], ['Monto financiado', financed], [`${n} cuotas + opción de compra`, cuotaNeta]] };
  }
  const P = Math.max(0, price - down);
  const timbres = P * Math.min(.008, .00066 * n);
  const C = P + (product.fees || 0) + timbres;
  const seguro = C * (product.insurancePct || 0) / 100;
  let vfmg = 0, cuota;
  if (product.type === 'inteligente') {
    vfmg = price * (product.vfmg?.[n] ?? 45) / 100;
    cuota = annuity(C - vfmg / Math.pow(1 + i, n + 1), i, n) + seguro;
  } else cuota = annuity(C, i, n) + seguro;
  const flows = [...Array(n).fill(cuota), ...(vfmg ? [vfmg] : [])];
  const cae = irr(P, flows) * 12 * 100;
  const total = down + cuota * n + vfmg;
  return { kind: product.type, price, down, financed: P, credit: C, n, i, cuota, vfmg, seguro, timbres, fees: product.fees || 0, cae, total, interest: total - price,
    rows: [['Precio', price], ['Pie + retoma', down], ['Saldo a financiar', P], ['Gastos operacionales', product.fees || 0], ['Impuesto de timbres', timbres], ['Monto bruto del crédito', C]] };
}

// Pre-evaluación con RUT y renta (simulada, determinística por RUT)
export function preEvaluate({ rut, renta, cuota, otherDebt = 0, employment = 'dependiente', seniority = 2, piePct = 20 }) {
  const h = hash(rutClean(rut));
  const history = 560 + (h % 260);              // "historial comercial" 560–819
  const load = (cuota + otherDebt) / Math.max(1, renta);
  let score = history + Math.min(10, seniority) * 7 + (piePct - 20) * 2.5 - (employment === 'independiente' ? 35 : 0) - Math.max(0, load - .25) * 900;
  if (renta < 500000) score -= 120;
  score = Math.round(Math.max(300, Math.min(960, score)));
  const decision = score >= 650 && load <= .35 ? 'preaprobada' : score >= 530 && load <= .5 ? 'condiciones' : 'rechazada';
  const conditions = decision === 'condiciones' ? (load > .35 ? `Aumentar el pie para bajar la carga financiera (hoy ${Math.round(load * 100)}%)` : 'Requiere aval o codeudor') : '';
  return { score, load, history, decision, conditions, dicom: h % 17 === 0 };
}
export const scoreTone = s => s >= 650 ? 'success' : s >= 530 ? 'warning' : 'danger';
