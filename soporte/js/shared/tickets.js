// Operaciones de tickets compartidas por el centro de ayuda, el portal y la consola:
// creación con SLA y disparadores, respuestas, cambios de estado, fusión, macros, SLA y CSAT.
import { db, auth } from '../data/db.js';
import { uid } from '../../../assets/core/db.js';
import { status as statusOf, priority as prioOf, isOpen, TRIGGER_ACTIONS } from './constants.js';
import { MIN, userName, groupName, catName, duration } from './util.js';

export function notify(userId, text, link = '') { if (userId) db.insert('notifications', { userId, text, link, read: false }); }
const notifyStaff = (roles, text, link) => db.query('users', u => roles.includes(u.role) && u.active !== false).forEach(u => notify(u.id, text, link));
const sysMsg = body => ({ id: uid('m'), authorId: null, kind: 'system', body, at: new Date().toISOString(), attachments: [] });

// ---------- SLA ----------
export function slaTimes(priority, from = Date.now()) {
  const p = db.find('slas', s => s.priority === priority) || { first: 240, resolution: 1440 };
  return { firstResponseDue: new Date(from + p.first * MIN).toISOString(), resolutionDue: new Date(from + p.resolution * MIN).toISOString() };
}
// Estado SLA de un ticket: objetivo activo, minutos restantes, en riesgo o vencido.
export function sla(t) {
  const now = Date.now();
  const first = { due: t.firstResponseDue, done: !!t.firstResponseAt, met: t.firstResponseAt ? new Date(t.firstResponseAt) <= new Date(t.firstResponseDue) : null };
  const res = { due: t.resolutionDue, done: !!t.resolvedAt, met: t.resolvedAt ? new Date(t.resolvedAt) <= new Date(t.resolutionDue) : null };
  if (!isOpen(t) || t.status === 'pendiente') return { first, res, active: null, risk: false, breached: false, label: t.status === 'pendiente' ? 'En pausa (esperando al cliente)' : res.met === false || first.met === false ? 'SLA incumplido' : 'SLA cumplido' };
  const target = !first.done ? { kind: 'Primera respuesta', due: first.due, total: new Date(first.due) - new Date(t.createdAt) } : { kind: 'Resolución', due: res.due, total: new Date(res.due) - new Date(t.createdAt) };
  const left = (new Date(target.due) - now) / MIN;
  const breached = left < 0;
  const risk = !breached && (left < 60 || left * MIN < target.total * .25);
  return { first, res, active: target, left, risk, breached, label: breached ? `${target.kind} vencida hace ${duration(-left)}` : `${target.kind} vence en ${duration(left)}` };
}
export const slaBadge = t => { const s = sla(t); if (!s.active) return `<span class="badge plain sla-badge">${s.label}</span>`; return `<span class="badge ${s.breached ? 'badge-danger' : s.risk ? 'badge-warning' : 'badge-success'} sla-badge" title="${s.label}">${s.breached ? 'Vencido' : s.risk ? 'En riesgo' : 'A tiempo'} · ${duration(s.left)}</span>`; };

// ---------- Disparadores (automatizaciones) ----------
function applyTriggers(t) {
  const fired = [];
  const cust = t.customerId ? db.get('users', t.customerId) : null;
  db.query('triggers', tr => tr.active).forEach(tr => {
    let ok = true;
    if (tr.field === 'subject') ok = t.subject.toLowerCase().includes(String(tr.value).toLowerCase()) || (t.messages[0]?.body || '').toLowerCase().includes(String(tr.value).toLowerCase());
    else if (tr.field === 'plan') ok = cust?.plan === tr.value;
    else if (tr.field) ok = String(t[tr.field]) === String(tr.value);
    if (!ok) return;
    switch (tr.action) {
      case 'priority': if (prioOf(tr.actionValue).w > prioOf(t.priority).w || tr.field) { t.priority = tr.actionValue; Object.assign(t, slaTimes(t.priority, new Date(t.createdAt).getTime())); } break;
      case 'group': t.groupId = tr.actionValue; break;
      case 'tag': if (!t.tags.includes(tr.actionValue)) t.tags.push(tr.actionValue); break;
      case 'notify': notifyStaff(['supervisor', 'admin'], `${tr.name}: #${t.number} ${t.subject}`, `agente.html#/ticket/${t.id}`); break;
      case 'reply': t.messages.push({ id: uid('m'), authorId: null, kind: 'auto', body: tr.actionValue, at: new Date().toISOString(), attachments: [] }); break;
    }
    fired.push(`${tr.name} (${TRIGGER_ACTIONS[tr.action].toLowerCase()}${tr.actionValue && tr.action !== 'reply' ? ' ' + (tr.action === 'group' ? groupName(tr.actionValue) : tr.actionValue) : ''})`);
    db.update('triggers', tr.id, x => ({ runs: (x.runs || 0) + 1 }));
  });
  if (fired.length) t.messages.push({ ...sysMsg(`Automatizaciones aplicadas: ${fired.join(' · ')}`), kind: 'system' });
  return fired;
}

// ---------- Crear ----------
const GROUP_OF = { 'cat-int': 'g-n1', 'cat-tv': 'g-n1', 'cat-tel': 'g-n1', 'cat-fac': 'g-fac', 'cat-cta': 'g-fac', 'cat-ins': 'g-ter' };
export function createTicket({ subject, body, categoryId = 'cat-int', priority = 'normal', channel = 'web', customerId = null, guest = null, attachments = [], actorId = null, assigneeId = null }) {
  const number = db.getValue('ticketSeq', 10400);
  db.setValue('ticketSeq', number + 1);
  const now = new Date().toISOString();
  const t = {
    id: uid('t'), number, subject: subject.trim(), categoryId, priority, status: assigneeId ? 'abierto' : 'nuevo', channel, customerId, guest, assigneeId, groupId: GROUP_OF[categoryId] || 'g-n1', tags: [],
    messages: [{ id: uid('m'), authorId: customerId, guestName: guest?.name, kind: 'public', body: body.trim(), at: now, attachments }],
    ...slaTimes(priority), firstResponseAt: null, resolvedAt: null, createdAt: now, updatedAt: now
  };
  const fired = applyTriggers(t);
  const row = db.insert('tickets', t);
  db.log('ticket', `Nuevo ticket #${number} (${catName(categoryId)}) vía ${channel}: ${t.subject}`, actorId || customerId);
  const g = db.get('groups', t.groupId);
  db.query('users', u => u.role === 'agente' && u.active !== false && (u.groupIds || []).includes(t.groupId)).slice(0, 3).forEach(u => notify(u.id, `Nuevo ticket en ${g?.name || 'tu grupo'}: #${number} ${t.subject}`, `agente.html#/ticket/${row.id}`));
  return { ticket: row, fired };
}

// ---------- Mensajes ----------
export function addMessage(id, { authorId, kind = 'public', body, attachments = [] }) {
  const t = db.get('tickets', id);
  if (!t) return null;
  const author = db.get('users', authorId);
  const staff = author && author.role !== 'cliente';
  const now = new Date().toISOString();
  const msg = { id: uid('m'), authorId, kind, body: body.trim(), at: now, attachments };
  const patch = { messages: [...t.messages, msg], updatedAt: now };
  if (staff && kind === 'public') {
    if (!t.firstResponseAt) patch.firstResponseAt = now;
    if (t.status === 'nuevo') patch.status = 'abierto';
    if (!t.assigneeId) patch.assigneeId = authorId;
  }
  if (!staff) {
    if (['pendiente', 'resuelto', 'espera'].includes(t.status)) { patch.status = 'abierto'; patch.resolvedAt = null; patch.messages.push(sysMsg(t.status === 'resuelto' ? 'El cliente respondió: ticket reabierto' : 'El cliente respondió')); }
    if (t.status === 'cerrado') return null;
    notify(t.assigneeId, `${author?.name || 'El cliente'} respondió el ticket #${t.number}`, `agente.html#/ticket/${id}`);
  } else if (kind === 'public' && t.customerId) notify(t.customerId, `Nueva respuesta en tu ticket #${t.number}`, `portal.html#/ticket/${id}`);
  db.update('tickets', id, patch);
  if (staff) db.log('ticket', `${kind === 'internal' ? 'Nota interna' : 'Respuesta'} en #${t.number}`, authorId);
  return msg;
}

// ---------- Cambios de campos con traza ----------
export function updateTicket(id, patch, actorId = auth.current()?.id) {
  const t = db.get('tickets', id);
  if (!t) return null;
  const notes = [];
  const out = { ...patch };
  if (patch.status && patch.status !== t.status) {
    notes.push(`Estado: ${statusOf(t.status).name} → ${statusOf(patch.status).name}`);
    if (patch.status === 'resuelto' || patch.status === 'cerrado') out.resolvedAt = t.resolvedAt || new Date().toISOString();
    else out.resolvedAt = null;
    if (patch.status === 'resuelto' && t.customerId) notify(t.customerId, `Tu ticket #${t.number} fue resuelto. ¿Nos cuentas cómo te atendimos?`, `portal.html#/ticket/${id}`);
  }
  if (patch.priority && patch.priority !== t.priority) { notes.push(`Prioridad: ${prioOf(t.priority).name} → ${prioOf(patch.priority).name}`); Object.assign(out, slaTimes(patch.priority, new Date(t.createdAt).getTime())); }
  if ('assigneeId' in patch && patch.assigneeId !== t.assigneeId) { notes.push(`Asignado a ${userName(patch.assigneeId)}`); if (patch.assigneeId && patch.assigneeId !== actorId) notify(patch.assigneeId, `Te asignaron el ticket #${t.number}: ${t.subject}`, `agente.html#/ticket/${id}`); }
  if (patch.groupId && patch.groupId !== t.groupId) notes.push(`Grupo: ${groupName(patch.groupId)}`);
  if (patch.categoryId && patch.categoryId !== t.categoryId) notes.push(`Categoría: ${catName(patch.categoryId)}`);
  if (notes.length) out.messages = [...t.messages, { ...sysMsg(`${userName(actorId)} · ${notes.join(' · ')}`) }];
  out.updatedAt = new Date().toISOString();
  db.update('tickets', id, out);
  if (notes.length) db.log('ticket', `#${t.number}: ${notes.join(', ')}`, actorId);
  return db.get('tickets', id);
}

// ---------- Fusión ----------
export function mergeTickets(sourceId, targetId, actorId) {
  const s = db.get('tickets', sourceId), t = db.get('tickets', targetId);
  if (!s || !t || s.id === t.id) return false;
  const moved = s.messages.filter(m => m.kind !== 'system').map(m => ({ ...m, id: uid('m'), mergedFrom: s.number }));
  const msgs = [...t.messages, ...moved].sort((a, b) => a.at.localeCompare(b.at));
  msgs.push(sysMsg(`Se fusionó el ticket #${s.number} en este ticket (${userName(actorId)})`));
  db.update('tickets', t.id, { messages: msgs, tags: [...new Set([...t.tags, ...s.tags])], updatedAt: new Date().toISOString() });
  db.update('tickets', s.id, { status: 'cerrado', mergedInto: t.id, resolvedAt: new Date().toISOString(), messages: [...s.messages, sysMsg(`Fusionado en el ticket #${t.number}`)] });
  db.log('ticket', `Fusionó #${s.number} en #${t.number}`, actorId);
  return true;
}

// ---------- Macros ----------
export function fillMacro(text, t) {
  const c = t.customerId ? db.get('users', t.customerId) : t.guest;
  const agent = auth.current();
  return String(text || '').replace(/\{\{nombre\}\}/g, c ? c.name.split(' ')[0] : 'cliente').replace(/\{\{agente\}\}/g, agent ? agent.name.split(' ')[0] : 'el equipo').replace(/\{\{ticket\}\}/g, '#' + t.number);
}

// ---------- CSAT ----------
export function rateTicket(id, rating, comment = '') {
  const t = db.get('tickets', id);
  db.update('tickets', id, { csat: { rating, comment, at: new Date().toISOString() }, messages: [...t.messages, sysMsg(`El cliente calificó la atención con ${rating}/5${comment ? `: “${comment}”` : ''}`)] });
  notify(t.assigneeId, `Calificación ${rating}/5 en el ticket #${t.number}`, `agente.html#/ticket/${id}`);
  db.log('csat', `Ticket #${t.number} calificado con ${rating}/5`, t.customerId);
}
