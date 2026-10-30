// Motor de automatizaciones simulado: reglas si/entonces que reaccionan a eventos del CRM.
import { db } from '../data/db.js';
import { TRIGGERS, ACTIONS } from './constants.js';
import { reps, fillTemplate, DAY } from './util.js';

export function notify(userId, text, link = '') {
  if (!userId) return;
  db.insert('notifications', { userId, text, link, read: false });
}

function matches(cond, obj) {
  if (!cond || !cond.field) return true;
  const v = obj[cond.field];
  const target = cond.value;
  switch (cond.op) {
    case 'in': return String(target).split(',').map(s => s.trim().toLowerCase()).includes(String(v ?? '').toLowerCase());
    case 'gt': return Number(v) > Number(target);
    case 'lt': return Number(v) < Number(target);
    case 'eq': return String(v ?? '').toLowerCase() === String(target).toLowerCase();
    default: return true;
  }
}
export function describeRule(a) {
  const ops = { in: 'es uno de', gt: 'mayor que', lt: 'menor que', eq: 'igual a' };
  const cond = a.condition && a.condition.field ? ` y ${a.condition.field} ${ops[a.condition.op] || a.condition.op} ${a.condition.value}` : '';
  return `Si ${TRIGGERS[a.trigger]?.toLowerCase() || a.trigger}${cond} → ${ACTIONS[a.action]?.toLowerCase() || a.action}`;
}

// Ejecuta las reglas activas para un evento. kind: 'lead' | 'deal' | 'activity'.
export function runAutomations(trigger, obj, kind, { dryRun = false } = {}) {
  const fired = [];
  db.query('automations', a => a.active && a.trigger === trigger).forEach(a => {
    if (!matches(a.condition, obj)) return;
    const msg = dryRun ? describeRule(a) : execute(a, obj, kind);
    if (!msg) return;
    fired.push(`${a.name}: ${msg}`);
    if (!dryRun) {
      db.update('automations', a.id, x => ({ runs: (x.runs || 0) + 1, lastRun: new Date().toISOString() }));
      db.log('automatización', `${a.name} → ${msg}`);
    }
  });
  return fired;
}

function execute(a, obj, kind) {
  const col = kind === 'lead' ? 'leads' : kind === 'deal' ? 'deals' : 'activities';
  const p = a.params || {};
  const fresh = db.get(col, obj.id) || obj;
  switch (a.action) {
    case 'assign': {
      if (fresh.ownerId) return null;
      const list = reps();
      if (!list.length) return null;
      const i = db.getValue('rrIndex', 0) % list.length;
      db.setValue('rrIndex', i + 1);
      db.update(col, obj.id, { ownerId: list[i].id });
      notify(list[i].id, `Se te asignó ${kind === 'lead' ? 'el lead' : 'el negocio'} ${fresh.name || fresh.title}`, kind === 'lead' ? 'app.html#/leads' : `app.html#/negocios/${obj.id}`);
      return `asignado a ${list[i].name}`;
    }
    case 'task': {
      const owner = (db.get(col, obj.id) || obj).ownerId;
      db.insert('activities', {
        type: 'tarea', subject: p.subject || 'Seguimiento', ownerId: owner || null, done: false, reminded: false, reminder: 60,
        dueAt: new Date(Date.now() + (p.days ?? 1) * DAY).toISOString(), body: 'Creada automáticamente',
        dealId: kind === 'deal' ? obj.id : obj.dealId || null, leadId: kind === 'lead' ? obj.id : null, companyId: obj.companyId || null, auto: true
      });
      return `tarea "${p.subject || 'Seguimiento'}" creada`;
    }
    case 'email': {
      const tpl = db.get('templates', p.templateId);
      if (!tpl) return null;
      const contact = kind === 'lead' ? { name: fresh.name } : db.get('contacts', fresh.contactId);
      const company = kind === 'lead' ? { name: fresh.company } : db.get('companies', fresh.companyId);
      const user = db.get('users', fresh.ownerId);
      db.insert('activities', {
        type: 'email', subject: fillTemplate(tpl.subject, { contact, company, user }), body: fillTemplate(tpl.body, { contact, company, user }),
        ownerId: fresh.ownerId || null, done: true, doneAt: new Date().toISOString(), dueAt: new Date().toISOString(), templateId: tpl.id,
        dealId: kind === 'deal' ? obj.id : null, leadId: kind === 'lead' ? obj.id : null, companyId: fresh.companyId || null, opened: false, auto: true, to: fresh.email || ''
      });
      return `correo "${tpl.name}" enviado`;
    }
    case 'notify': {
      db.query('users', u => u.role === 'gerente' && u.active !== false).forEach(u => notify(u.id, `${a.name}: ${fresh.title || fresh.name || fresh.subject}`, kind === 'deal' ? `app.html#/negocios/${obj.id}` : 'app.html#/'));
      return 'gerencia notificada';
    }
    case 'score': {
      if (kind !== 'lead') return null;
      db.update('leads', obj.id, x => ({ bonus: (x.bonus || 0) + 10 }));
      return '+10 puntos de scoring';
    }
  }
  return null;
}
