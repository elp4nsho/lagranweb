// Diálogo para asignar un plan a uno o varios trabajadores (panel y supervisor).
import { formDialog, toast } from './admin-kit.js';
import { db } from '../data/db.js';
import { assignPlan, activeAssignment } from '../data/model.js';

export async function assignDialog(ctx, { userIds, pool } = {}) {
  const plans = db.query('plans', p => p.active !== false);
  const candidates = (pool || db.query('users', u => u.role === 'trabajador' && u.active !== false)).sort((a, b) => a.name.localeCompare(b.name));
  const fields = [
    { name: 'planId', label: 'Plan de inducción', type: 'select', options: plans.map(p => [p.id, `${p.code} · ${p.name}`]), required: true },
    { name: 'days', label: 'Plazo (días)', type: 'number', min: 1, max: 120, value: 14, half: true, help: 'Vacío = plazo por defecto del plan' },
    { name: 'note', label: 'Mensaje para el trabajador (opcional)', type: 'text', half: true }
  ];
  if (!userIds) fields.splice(1, 0, { name: 'users', label: `Trabajadores (${candidates.length})`, type: 'multi', options: candidates.map(u => [u.id, u.name]), required: true });
  const v = await formDialog({ title: 'Asignar inducción', fields, size: userIds ? '' : 'lg', submit: 'Asignar', intro: userIds ? `Se asignará a ${userIds.length === 1 ? db.get('users', userIds[0])?.name : userIds.length + ' trabajadores'}.` : '' });
  if (!v) return 0;
  const ids = userIds || v.users;
  let ok = 0, skipped = 0;
  ids.forEach(id => { if (activeAssignment(id, v.planId)) { skipped++; return; } if (assignPlan(id, v.planId, ctx.user.id, v.days || null)) ok++; });
  const plan = db.get('plans', v.planId);
  if (ok) { db.log('inducción asignada', `${plan.name} → ${ok} trabajador(es)`, ctx.user.id); toast(`Plan asignado a ${ok} trabajador(es)`, 'success'); }
  if (skipped) toast(`${skipped} ya tenía(n) esta inducción en curso`, 'warning');
  return ok;
}
