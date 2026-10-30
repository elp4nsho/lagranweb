// Formulario de propiedad y flujo de estados, compartidos por panel admin y app de corredores.
import { formModal, toast, escape } from '../../../assets/core/ui.js';
import { db, auth, setStatus } from '../data/db.js';
import { COMUNAS, comunaById } from './geo.js';
import { TYPES, PSTATUS } from './format.js';
import { FEATURES } from '../data/seed.js';
import { editForm } from './kit.js';

export const TRANSITIONS = [
  { from: 'borrador', to: 'revision', label: 'Enviar a revisión', short: 'Enviar', roles: ['admin', 'editor', 'corredor'], tone: 'primary' },
  { from: 'revision', to: 'publicada', label: 'Aprobar y publicar', short: 'Aprobar', roles: ['admin', 'editor'], tone: 'primary' },
  { from: 'revision', to: 'borrador', label: 'Rechazar', roles: ['admin', 'editor'], tone: 'danger', note: true },
  { from: 'publicada', to: 'reservada', label: 'Marcar reservada', short: 'Reservar', roles: ['admin', 'editor', 'corredor'] },
  { from: 'publicada', to: 'borrador', label: 'Despublicar', roles: ['admin', 'editor'], note: true },
  { from: 'reservada', to: 'vendida', label: 'Cerrar venta', short: 'Vender', roles: ['admin', 'corredor'], tone: 'primary', op: 'venta' },
  { from: 'reservada', to: 'arrendada', label: 'Cerrar arriendo', short: 'Arrendar', roles: ['admin', 'corredor'], tone: 'primary', op: 'arriendo' },
  { from: 'reservada', to: 'publicada', label: 'Liberar reserva', roles: ['admin', 'editor', 'corredor'] },
  { from: 'vendida', to: 'publicada', label: 'Reabrir', roles: ['admin'], note: true },
  { from: 'arrendada', to: 'publicada', label: 'Reabrir', roles: ['admin'], note: true }
];
export const transitionsFor = (p, role) => TRANSITIONS.filter(t => t.from === p.status && t.roles.includes(role) && (!t.op || t.op === p.op));
export const FLOW = ['borrador', 'revision', 'publicada', 'reservada', 'cerrada'];
export function flowPills(p) {
  const idx = ['vendida', 'arrendada'].includes(p.status) ? 4 : FLOW.indexOf(p.status);
  return `<div class="wf">${FLOW.map((s, i) => `${i ? '<span class="arrow">→</span>' : ''}<span class="step-pill ${i <= idx ? 'on' : ''}">${i === 4 ? (p.op === 'venta' ? 'Vendida' : 'Arrendada') : PSTATUS[s][0]}</span>`).join('')}</div>`;
}
export const wfButtons = (p, role) => transitionsFor(p, role).map(t => `<button class="btn btn-sm ${t.tone ? 'btn-' + t.tone : ''}" data-wf="${t.to}" data-pid="${p.id}">${escape(t.label)}</button>`).join('');

export async function runTransition(p, to) {
  const t = TRANSITIONS.find(x => x.from === p.status && x.to === to);
  if (!t) return null;
  let note = '';
  if (t.note) {
    const r = await formModal({ title: t.label, submit: t.label, fields: [{ name: 'note', label: to === 'borrador' && p.status === 'revision' ? 'Motivo del rechazo (se notifica al propietario)' : 'Comentario', type: 'textarea', required: to === 'borrador' }] });
    if (!r) return null; note = r.note;
  }
  if (to === 'arrendada') {
    const r = await formModal({ title: 'Datos del contrato de arriendo', submit: 'Crear contrato', fields: [
      { name: 'tenantName', label: 'Nombre arrendatario', required: true }, { name: 'tenantRut', label: 'RUT arrendatario', required: true },
      { name: 'tenantEmail', label: 'Correo', type: 'email' }, { name: 'start', label: 'Inicio', type: 'date', value: new Date().toISOString().slice(0, 10), required: true },
      { name: 'months', label: 'Duración (meses)', type: 'select', options: ['12', '24', '36'], value: '12' }
    ] });
    if (!r) return null;
    const month = r.start.slice(0, 7);
    db.insert('contracts', { propertyId: p.id, ownerId: p.ownerId, agentId: p.agentId, tenantName: r.tenantName, tenantRut: r.tenantRut, tenantEmail: r.tenantEmail, tenantPhone: '', start: r.start, months: +r.months, rent: p.price, deposit: p.price, commission: Math.round(p.price * .5), status: 'vigente', payments: [{ month, amount: p.price, status: 'pendiente', paidAt: null, method: null }] });
    note = `Contrato con ${r.tenantName}`;
  }
  const row = setStatus(p, to, note);
  toast(`${p.code}: ${PSTATUS[to][0]}`, 'success');
  return row;
}

export async function propertyForm(p = null, { agentId = null } = {}) {
  const agents = db.query('agents', a => a.active || a.id === p?.agentId);
  const owners = db.all('owners');
  const v = p ? { ...p } : { op: 'venta', type: 'departamento', comuna: 'providencia', currency: 'UF', dorms: 2, baths: 2, parking: 1, storage: 0, features: [], agentId: agentId || agents[0]?.id, ownerId: owners[0]?.id, orientation: 'Norte' };
  const r = await editForm({ title: p ? `Editar ${p.code}` : 'Nueva propiedad', values: v, submit: p ? 'Guardar cambios' : 'Crear borrador', fields: [
    { section: 'Publicación' },
    { name: 'title', label: 'Título', required: true, full: true, placeholder: 'Departamento 2D2B luminoso en Providencia' },
    { name: 'op', label: 'Operación', type: 'select', options: [['venta', 'Venta'], ['arriendo', 'Arriendo']] },
    { name: 'type', label: 'Tipo', type: 'select', options: Object.entries(TYPES) },
    { name: 'price', label: 'Precio', type: 'number', required: true, min: 0, help: 'UF para venta, CLP mensual para arriendo (se ajusta según moneda)' },
    { name: 'currency', label: 'Moneda', type: 'select', options: ['UF', 'CLP'] },
    { section: 'Ubicación' },
    { name: 'comuna', label: 'Comuna', type: 'select', options: COMUNAS.map(c => [c.id, c.name]) },
    { name: 'address', label: 'Dirección', required: true },
    { section: 'Características' },
    { name: 'm2', label: 'Superficie útil (m²)', type: 'number', required: true, min: 1 }, { name: 'm2Total', label: 'Superficie total (m²)', type: 'number', min: 1 },
    { name: 'dorms', label: 'Dormitorios', type: 'number', min: 0 }, { name: 'baths', label: 'Baños', type: 'number', min: 0 },
    { name: 'parking', label: 'Estacionamientos', type: 'number', min: 0 }, { name: 'storage', label: 'Bodegas', type: 'number', min: 0 },
    { name: 'year', label: 'Año construcción', type: 'number', min: 1900 }, { name: 'floor', label: 'Piso', type: 'number', min: 0 },
    { name: 'orientation', label: 'Orientación', type: 'select', options: ['Norte', 'Nororiente', 'Oriente', 'Norponiente', 'Poniente', 'Sur'] },
    { name: 'expenses', label: 'Gastos comunes (CLP)', type: 'number', min: 0 },
    { name: 'features', label: 'Características', type: 'chips', options: FEATURES },
    { name: 'description', label: 'Descripción', type: 'textarea', full: true },
    { section: 'Gestión' },
    { name: 'agentId', label: 'Corredor', type: 'select', options: agents.map(a => [a.id, a.name]) },
    { name: 'ownerId', label: 'Propietario', type: 'select', options: owners.map(o => [o.id, o.name]) }
  ] });
  if (!r) return null;
  ['m2Total', 'dorms', 'baths', 'parking', 'storage', 'expenses'].forEach(k => { r[k] = r[k] || 0; });
  if (!r.m2Total) r.m2Total = r.m2;
  if (agentId) r.agentId = agentId;
  const u = auth.current();
  if (p) {
    const row = db.update('properties', p.id, r);
    db.log('propiedad', `${u.name} editó ${p.code}`, u.id);
    toast('Propiedad actualizada', 'success');
    return row;
  }
  const c = comunaById(r.comuna), n = db.count('properties');
  const now = new Date().toISOString();
  const row = db.insert('properties', { ...r, code: 'HA-' + (2100 + n * 7 + 5), status: 'borrador', featured: false, views: 0, x: c.x + Math.round(Math.random() * 24 - 12), y: c.y + Math.round(Math.random() * 20 - 10), art: n % 6, publishedAt: null, statusAt: now, history: [{ at: now, to: 'borrador', by: u.name, note: 'Ficha creada' }] });
  db.log('propiedad', `${u.name} creó ${row.code}`, u.id);
  toast(`Borrador ${row.code} creado`, 'success');
  return row;
}
