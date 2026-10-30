// Recordatorios: campañas SMS / WhatsApp / correo con audiencias (vencidos, próximos, planes, inscritos),
// envío simulado con bitácora de mensajes e inscripciones del sitio.
import { escape, toast, confirm, formModal, date, dateTime, num, barChart } from '../../../assets/core/ui.js';
import { pageHead, smartTable, tabs, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { dueInfo, today, carLabel } from '../shared/domain.js';

const CH = { whatsapp: '💬 WhatsApp', sms: '📱 SMS', email: '✉️ Correo' };
const AUD = { vencidos: 'Mantención vencida', proximos: 'Próximos a vencer (30 días)', plan: 'Con saldo de plan', suscritos: 'Inscritos en el sitio', todos: 'Todos los clientes con permiso' };
let tab = 'campanas';

export function audience(key, channel) {
  const ok = c => c && (channel === 'whatsapp' ? c.optWa : channel === 'sms' ? c.optSms : c.optEmail && c.email);
  const cust = id => db.get('customers', id);
  if (key === 'suscritos') return db.query('signups', s => s.channel === channel || channel !== 'email').map(s => ({ name: s.name, to: channel === 'email' ? s.email : s.phone, plate: s.plate, auto: '', km: '' })).filter(x => x.to);
  if (key === 'plan') return db.query('planPurchases', p => p.status === 'activo' && p.expiresAt >= today()).map(p => ({ c: cust(p.customerId), v: db.get('vehicles', p.vehicleId) })).filter(x => ok(x.c)).map(x => ({ name: x.c.name, to: channel === 'email' ? x.c.email : x.c.phone, plate: x.v?.plate || '', auto: carLabel(x.v), km: x.v?.nextDueKm || '' }));
  return db.all('vehicles').filter(v => { if (key === 'todos') return true; const d = dueInfo(v); return key === 'vencidos' ? d.tone === 'danger' : d.tone === 'warning'; })
    .map(v => ({ c: cust(v.customerId), v })).filter(x => ok(x.c)).map(x => ({ name: x.c.name, to: channel === 'email' ? x.c.email : x.c.phone, plate: x.v.plate, auto: `${x.v.make} ${x.v.model}`, km: x.v.nextDueKm }));
}
const fill = (t, a) => t.replace(/\{nombre\}/g, a.name.split(' ')[0]).replace(/\{auto\}/g, a.auto || 'auto').replace(/\{patente\}/g, a.plate).replace(/\{km\}/g, a.km);

async function editCampaign(c, ctx) {
  const v = await formModal({ title: c ? c.name : 'Nueva campaña', fields: [
    { name: 'name', label: 'Nombre', required: true, value: c?.name }, { name: 'channel', label: 'Canal', type: 'select', options: Object.entries(CH), value: c?.channel || 'whatsapp' },
    { name: 'audience', label: 'Audiencia', type: 'select', options: Object.entries(AUD), value: c?.audience || 'vencidos' },
    { name: 'message', label: 'Mensaje', type: 'textarea', required: true, value: c?.message || 'Hola {nombre}, a tu {auto} ({patente}) le toca su cambio de aceite. Reserva en pitsrapido.cl', help: 'Variables: {nombre} {auto} {patente} {km}' }] });
  if (!v) return;
  c ? db.update('campaigns', c.id, v) : db.insert('campaigns', { ...v, status: 'borrador', sent: 0, delivered: 0, clicks: 0, bookings: 0, sentAt: '' });
  db.log('campañas', `Campaña ${c ? 'editada' : 'creada'}: ${v.name}`, ctx.user.id); toast('Campaña guardada', 'success');
}
async function send(c, ctx) {
  const aud = audience(c.audience, c.channel);
  if (!aud.length) { toast('La audiencia está vacía', 'warning'); return; }
  if (!await confirm(`Se enviarán ${aud.length} mensajes por ${CH[c.channel]}. Ejemplo:\n\n"${fill(c.message, aud[0])}"`, { title: `Enviar "${c.name}"`, ok: `Enviar ${aud.length}` })) return;
  const now = Date.now();
  aud.slice(0, 25).forEach((a, i) => db.insert('messages', { campaignId: c.id, channel: c.channel, to: a.to, name: a.name, text: fill(c.message, a), status: Math.random() < .95 ? 'entregado' : 'fallido', at: new Date(now + i * 1000).toISOString() }));
  const delivered = Math.round(aud.length * .95);
  db.update('campaigns', c.id, { status: 'enviada', sent: aud.length, delivered, clicks: Math.round(delivered * .22), bookings: Math.round(delivered * .07), sentAt: new Date().toISOString() });
  const msgs = db.all('messages'); if (msgs.length > 220) msgs.slice(220).forEach(m => db.remove('messages', m.id));
  db.log('campañas', `"${c.name}" enviada a ${aud.length} contactos (${c.channel})`, ctx.user.id);
  toast(`Enviados ${aud.length} mensajes (simulado)`, 'success');
}

export default {
  id: 'recordatorios', label: 'Recordatorios', icon: '🔔', group: 'Comercial', roles: ['admin', 'jefe'], watch: ['campaigns', 'messages', 'signups'],
  render(el, ctx) {
    const cs = db.all('campaigns').filter(c => c.status === 'enviada');
    const sent = cs.reduce((s, c) => s + c.sent, 0), dlv = cs.reduce((s, c) => s + c.delivered, 0), clk = cs.reduce((s, c) => s + c.clicks, 0), bk = cs.reduce((s, c) => s + c.bookings, 0);
    el.innerHTML = `${pageHead('Recordatorios y campañas', 'Mensajes simulados: no se envía nada real', tab === 'campanas' ? '<button class="btn btn-primary btn-sm" data-new>+ Campaña</button>' : '')}
      <div class="kpi-grid">${kpi('Mensajes enviados', num(sent))}${kpi('Entregados', `${Math.round(dlv / Math.max(1, sent) * 100)}%`)}${kpi('Clics', `${Math.round(clk / Math.max(1, dlv) * 100)}%`)}${kpi('Reservas generadas', num(bk))}${kpi('Vencidos hoy', num(audience('vencidos', 'whatsapp').length), '', true, 'con WhatsApp')}</div>
      ${tabs([['campanas', 'Campañas'], ['mensajes', 'Bitácora de mensajes'], ['inscritos', 'Inscritos del sitio']], tab)}<div data-list></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); });
    el.querySelector('[data-new]')?.addEventListener('click', () => editCampaign(null, ctx));
    const box = el.querySelector('[data-list]');
    if (tab === 'mensajes') return smartTable(box, { rows: () => db.all('messages').map(m => ({ ...m, camp: db.get('campaigns', m.campaignId)?.name || 'Transaccional' })), filters: [{ key: 'channel', label: 'Canal', options: Object.entries(CH) }, { key: 'status', label: 'Estado', options: ['entregado', 'leído', 'fallido'] }], search: r => `${r.name} ${r.to} ${r.text}`, columns: [{ key: 'at', label: 'Fecha', render: r => `<span class="nowrap">${dateTime(r.at)}</span>` }, { key: 'channel', label: 'Canal', render: r => CH[r.channel] }, { key: 'name', label: 'Para', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.to)}</small>` }, { key: 'text', label: 'Mensaje', render: r => `<div class="msg-bubble">${escape(r.text)}</div>` }, { key: 'camp', label: 'Campaña' }, { key: 'status', label: 'Estado', render: r => `<span class="badge ${r.status === 'fallido' ? 'badge-danger' : 'badge-success'}">${escape(r.status)}</span>` }], csv: { name: 'mensajes', map: r => ({ fecha: r.at, canal: r.channel, nombre: r.name, destino: r.to, mensaje: r.text, estado: r.status }) } });
    if (tab === 'inscritos') return smartTable(box, { rows: () => db.all('signups'), filters: [{ key: 'channel', label: 'Canal', options: Object.entries(CH) }], search: r => `${r.name} ${r.plate} ${r.phone}`, columns: [{ key: 'createdAt', label: 'Fecha', render: r => date(r.createdAt) }, { key: 'name', label: 'Nombre' }, { key: 'plate', label: 'Patente', render: r => `<span class="plate">${escape(r.plate)}</span>` }, { key: 'phone', label: 'Celular' }, { key: 'email', label: 'Correo' }, { key: 'channel', label: 'Canal', render: r => CH[r.channel] }, { key: 'every', label: 'Por', render: r => r.every === 'km' ? 'Kilometraje' : 'Fecha' }, { key: 'id', label: '', sort: false, render: r => `<button class="btn btn-sm btn-ghost no-row" data-dels="${r.id}" aria-label="Eliminar">🗑</button>` }], csv: { name: 'inscritos', map: r => ({ fecha: r.createdAt, nombre: r.name, patente: r.plate, celular: r.phone, correo: r.email, canal: r.channel }) }, onRow: () => {} });
    box.innerHTML = `<div class="grid-2">${db.all('campaigns').map(c => { const n = c.status === 'borrador' ? audience(c.audience, c.channel).length : c.sent; return `<div class="card stack" style="gap:8px">
      <div class="row between"><b>${escape(c.name)}</b><span class="badge ${c.status === 'enviada' ? 'badge-success' : ''}">${c.status === 'enviada' ? 'Enviada ' + date(c.sentAt) : 'Borrador'}</span></div>
      <small class="muted">${CH[c.channel]} · ${escape(AUD[c.audience])} · ${num(n)} contactos</small>
      <div class="msg-bubble">${escape(c.message)}</div>
      ${c.status === 'enviada' ? barChart([{ label: 'Enviados', value: c.sent }, { label: 'Entregados', value: c.delivered }, { label: 'Clics', value: c.clicks }, { label: 'Reservas', value: c.bookings }], { height: 110 }) : ''}
      <div class="row"><button class="btn btn-sm ${c.status === 'borrador' ? 'btn-primary' : ''}" data-send="${c.id}">${c.status === 'borrador' ? 'Enviar ahora' : 'Reenviar'}</button><button class="btn btn-sm" data-edit="${c.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${c.id}" aria-label="Eliminar">🗑</button></div></div>`; }).join('')}</div>`;
    box.onclick = async e => {
      const s = e.target.closest('[data-send]'); if (s) send(db.get('campaigns', s.dataset.send), ctx);
      const ed = e.target.closest('[data-edit]'); if (ed) editCampaign(db.get('campaigns', ed.dataset.edit), ctx);
      const d = e.target.closest('[data-del]'); if (d && await confirm('¿Eliminar campaña?', { danger: true, ok: 'Eliminar' })) { db.remove('campaigns', d.dataset.del); db.log('campañas', 'Campaña eliminada', ctx.user.id); }
    };
    return {};
  }
};
export { };
document.addEventListener('click', e => { const d = e.target.closest('[data-dels]'); if (d) { db.remove('signups', d.dataset.dels); toast('Inscripción eliminada', 'success'); } });
