// Cálculo SIMULADO de remuneraciones chilenas (valores referenciales 2026, no oficiales).
export const PARAMS = { uf: 39850, utm: 69800, imm: 539000, topeImponibleUF: 89.9, topeCesantiaUF: 135.1, jornada: 42, colacion: 60000, movilizacion: 40000, retencionHonorarios: 0.1525 };
export const AFP = { Capital: 11.44, Cuprum: 11.44, Habitat: 11.27, Modelo: 10.58, PlanVital: 11.16, Provida: 11.45, Uno: 10.46 };
export const ISAPRES = ['Fonasa', 'Isapre Andina', 'Isapre Pacífico', 'Isapre Austral', 'Isapre Cumbre'];
// Tabla de impuesto único de segunda categoría (en UTM): [desde, hasta, factor, rebaja]
const TAX = [[0, 13.5, 0, 0], [13.5, 30, .04, .54], [30, 50, .08, 1.74], [50, 70, .135, 4.49], [70, 90, .23, 11.14], [90, 120, .304, 17.8], [120, 310, .35, 23.92], [310, Infinity, .4, 39.42]];

export function impuestoUnico(base, p = PARAMS) {
  const u = base / p.utm, t = TAX.find(r => u > r[0] && u <= r[1]) || TAX[0];
  return Math.max(0, Math.round((u * t[2] - t[3]) * p.utm));
}

// emp: { salary, afp, health, healthUF, contractType }; extras: { horasExtra, bonos, otrosDesc, anticipo }
export function calcPayslip(emp, period, extras = {}, p = PARAMS) {
  const base = Math.round(emp.salary || 0);
  const he = extras.horasExtra || 0, bonos = extras.bonos || 0, otros = extras.otrosDesc || 0, anticipo = extras.anticipo || 0;
  if (emp.contractType === 'Honorarios') {
    const bruto = base + bonos, ret = Math.round(bruto * p.retencionHonorarios);
    return { period, honorarios: true, base, gratificacion: 0, horasExtraHrs: 0, horasExtra: 0, bonos, colacion: 0, movilizacion: 0, imponible: 0, noImponible: 0, totalHaberes: bruto, afpName: '—', afpRate: 0, afp: 0, healthName: '—', salud: 0, cesantia: 0, tributable: bruto, impuesto: ret, otrosDesc: otros, anticipo, totalDescuentos: ret + otros + anticipo, liquido: bruto - ret - otros - anticipo, costoEmpresa: bruto };
  }
  const gratificacion = Math.round(Math.min(base * .25, 4.75 * p.imm / 12));
  const valorHora = base / 30 * 28 / (p.jornada * 4);
  const horasExtra = Math.round(valorHora * 1.5 * he);
  const imponible = base + gratificacion + horasExtra + bonos;
  const tope = p.topeImponibleUF * p.uf, impAfp = Math.min(imponible, tope);
  const afpRate = AFP[emp.afp] || 11.27, afp = Math.round(impAfp * afpRate / 100);
  const legal7 = Math.round(impAfp * .07);
  const salud = emp.health === 'Fonasa' ? legal7 : Math.max(legal7, Math.round((emp.healthUF || 0) * p.uf));
  const indef = emp.contractType !== 'Plazo fijo';
  const cesantia = indef ? Math.round(Math.min(imponible, p.topeCesantiaUF * p.uf) * .006) : 0;
  const tributable = Math.max(0, imponible - afp - Math.min(salud, legal7) - cesantia);
  const impuesto = impuestoUnico(tributable, p);
  const colacion = p.colacion, movilizacion = p.movilizacion, noImponible = colacion + movilizacion;
  const totalHaberes = imponible + noImponible;
  const totalDescuentos = afp + salud + cesantia + impuesto + otros + anticipo;
  const empleador = Math.round(impAfp * .0162) + Math.round(Math.min(imponible, p.topeCesantiaUF * p.uf) * (indef ? .024 : .03)) + Math.round(impAfp * .0093) + Math.round(impAfp * .01);
  return { period, base, gratificacion, horasExtraHrs: he, horasExtra, bonos, colacion, movilizacion, imponible, noImponible, totalHaberes, afpName: emp.afp, afpRate, afp, healthName: emp.health, healthUF: emp.healthUF || 0, salud, cesantia, tributable, impuesto, otrosDesc: otros, anticipo, totalDescuentos, liquido: totalHaberes - totalDescuentos, costoEmpresa: totalHaberes + empleador, aportesEmpleador: empleador };
}

// Una liquidación se guarda como sus "entradas" (compacto); el detalle se calcula al leer.
export const slipRecord = (e, period, ex = {}, createdAt = new Date().toISOString()) => ({ employeeId: e.id, period, salary: e.salary, afp: e.afp, health: e.health, healthUF: e.healthUF, contractType: e.contractType, position: e.position, deptId: e.deptId, horasExtra: ex.horasExtra || 0, bonos: ex.bonos || 0, otrosDesc: ex.otrosDesc || 0, anticipo: ex.anticipo || 0, createdAt });
export const slipDetail = s => calcPayslip(s, s.period, s);
