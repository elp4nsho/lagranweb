// Semillas del producto Taller por módulo: CATÁLOGOS (se conservan en producción) + datos de demo
// (seed-demo.js, que build-client vacía en producción con data: 'empty'). PURO: sin DOM.
// Reutiliza el catálogo de la demo histórica (taller/js/data/catalog.js).
import { SERVICES, PARTS } from '../../taller/js/data/catalog.js';
import * as demo from './seed-demo.js';

export function seedBase(ctx) {
  const services = SERVICES.map((s, i) => ({ id: 'svc-' + s.id, name: s.name, icon: s.icon, cat: s.cat, from: s.from, desc: s.desc, bullets: s.bullets, order: i + 1, active: true }));
  return { services, ...demo.demoBase(ctx) };
}
export function seedInventario(ctx) {
  const r = ctx.rng(66);
  const suppliers = [['pv1', 'Filtros y Lubricantes Ñuble', 'Filtros y aceites'], ['pv2', 'Frenotec Repuestos', 'Frenos'], ['pv3', 'Motorpartes Santa Rosa', 'Motor y eléctrico'], ['pv4', 'Suspensiones del Sur', 'Suspensión'], ['pv5', 'FríoAuto Distribuidora', 'Aire acondicionado'], ['pv6', 'Carrocerías y Pinturas Lircay', 'Pintura y carrocería']]
    .map(([id, name, cat], i) => ({ id, name, cat, contact: `ventas@${name.split(' ')[0].toLowerCase()}.cl`, phone: `+56 2 2777 0${i + 1}0${i + 1}`, days: r.int(1, 3) }));
  const parts = PARTS.map(([sku, name, cat, price, cost, min, stock, sup]) => ({ id: 'p-' + sku, sku, name, cat, price, cost, min, stock, supplierId: sup, location: `R${r.int(1, 6)}-${r.pick('ABCD')}${r.int(1, 5)}`, active: true }));
  parts[3].stock = 2; parts[8].stock = 1;
  return { parts, suppliers, ...demo.demoInventario(ctx) };
}
export const seedClientes = ctx => demo.demoClientes(ctx);
export const seedAgenda = ctx => demo.demoAgenda(ctx);
export const seedOrdenes = ctx => demo.demoOrdenes(ctx);
export const seedPresupuestos = ctx => demo.demoPresupuestos(ctx);
export const seedPortal = ctx => demo.demoPortal(ctx);
export const seedFacturacion = ctx => demo.demoFacturacion(ctx);
