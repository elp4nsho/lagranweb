// Automatizaciones si/entonces: alta, edición, activar/pausar y prueba en seco.
import { db, auth } from '../data/db.js';
import { escape, ago, toast, confirm, modal } from '../../../assets/core/ui.js';
import { TRIGGERS, ACTIONS, LEAD_SOURCES } from '../shared/constants.js';
import { describeRule } from '../shared/automation.js';
import { pageHead, openForm, field, opt } from '../app/components.js';
import { icon } from '../shared/icons.js';

const FIELDS = { source: 'Fuente del lead', amount: 'Monto del negocio', stage: 'Etapa', size: 'Tamaño de empresa', industry: 'Industria' };

export function render(view, { user }) {
  const list = db.all('automations');
  const log = (db.getValue('_log', []) || []).filter(l => l.action === 'automatización').slice(0, 10);
  view.innerHTML = `
    ${pageHead('Automatizaciones', `${list.filter(a => a.active).length} reglas activas`, `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva regla</button>`)}
    <div class="stack">${list.map(a => `<article class="card rule ${a.active ? '' : 'paused'}">
      <div class="rule-ico">${icon('bolt', 20)}</div>
      <div class="rule-main"><div class="row" style="gap:8px"><h3 style="margin:0">${escape(a.name)}</h3><span class="badge ${a.active ? 'badge-success' : 'plain'}">${a.active ? 'Activa' : 'Pausada'}</span></div>
        <p class="rule-desc"><span class="rule-chip">SI</span> ${escape(TRIGGERS[a.trigger])}${a.condition?.field ? ` <span class="rule-chip">Y</span> ${escape(FIELDS[a.condition.field] || a.condition.field)} ${{ in: 'es', gt: '>', lt: '<', eq: '=' }[a.condition.op]} <b>${escape(a.condition.value)}</b>` : ''} <span class="rule-chip">ENTONCES</span> ${escape(ACTIONS[a.action])}${a.params?.subject ? `: “${escape(a.params.subject)}”` : ''}${a.params?.templateId ? `: ${escape(db.get('templates', a.params.templateId)?.name || '')}` : ''}</p>
        <small class="muted">${a.runs || 0} ejecuciones · última ${a.lastRun ? ago(a.lastRun) : 'nunca'}</small></div>
      <div class="row rule-actions" style="gap:6px">
        <label class="switch" title="Activar/pausar"><input type="checkbox" data-toggle="${a.id}" ${a.active ? 'checked' : ''} aria-label="Activar ${escape(a.name)}"><span></span></label>
        <button class="btn btn-sm" data-test="${a.id}">Probar</button>
        <button class="btn btn-sm" data-edit="${a.id}" aria-label="Editar">${icon('edit', 14)}</button>
        <button class="btn btn-sm btn-ghost" data-del="${a.id}" aria-label="Eliminar">${icon('trash', 14)}</button>
      </div></article>`).join('')}</div>
    <section class="card stack"><h3 style="margin:0">Últimas ejecuciones</h3>
      ${log.map(l => `<div class="row between small"><span>${escape(l.detail)}</span><span class="muted">${ago(l.at)}</span></div>`).join('') || '<p class="muted small" style="margin:0">Aún no hay ejecuciones en esta sesión. Envía el formulario de demo del sitio público para ver reglas en acción.</p>'}
    </section>`;
  view.querySelector('[data-new]').onclick = () => ruleModal();
  view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => ruleModal(db.get('automations', b.dataset.edit)));
  view.querySelectorAll('[data-toggle]').forEach(c => c.onchange = () => { db.update('automations', c.dataset.toggle, { active: c.checked }); db.log('automatizaciones', `${c.checked ? 'Activó' : 'Pausó'} "${db.get('automations', c.dataset.toggle).name}"`, user.id); toast(c.checked ? 'Regla activada' : 'Regla pausada', 'success'); });
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const a = db.get('automations', b.dataset.del); if (await confirm(`¿Eliminar la regla "${a.name}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('automations', a.id); db.log('automatizaciones', `Eliminó "${a.name}"`, user.id); toast('Regla eliminada', 'success'); } });
  view.querySelectorAll('[data-test]').forEach(b => b.onclick = () => {
    const a = db.get('automations', b.dataset.test);
    const sample = a.trigger === 'lead.created' ? db.all('leads')[0] : db.all('deals').find(d => d.amount > 15000000) || db.all('deals')[0];
    const cond = a.condition?.field ? sample[a.condition.field] : null;
    modal({ title: 'Prueba en seco', body: `<div class="stack"><p>${escape(describeRule(a))}</p><div class="card" style="box-shadow:none"><small class="muted">Registro de ejemplo</small><br><b>${escape(sample.name || sample.title)}</b>${a.condition?.field ? `<br><small>${escape(FIELDS[a.condition.field] || a.condition.field)}: <b>${escape(cond)}</b></small>` : ''}</div><p>Resultado: <b>${matchesTxt(a, sample) ? 'la regla se ejecutaría ✓' : 'la condición no se cumple, no se ejecutaría'}</b></p><small class="muted">La prueba no modifica datos.</small></div>` });
  });
}
function matchesTxt(a, obj) {
  const c = a.condition;
  if (!c || !c.field) return true;
  const v = obj[c.field];
  if (c.op === 'in') return String(c.value).split(',').map(s => s.trim().toLowerCase()).includes(String(v ?? '').toLowerCase());
  if (c.op === 'gt') return +v > +c.value;
  if (c.op === 'lt') return +v < +c.value;
  return String(v).toLowerCase() === String(c.value).toLowerCase();
}

function ruleModal(a = null) {
  const user = auth.current();
  const tpls = db.all('templates');
  openForm({
    title: a ? 'Editar regla' : 'Nueva regla', size: 'lg',
    body: `${field('Nombre *', `<input class="input" name="name" value="${escape(a?.name || '')}" required placeholder="Ej: Asignar leads de eventos">`)}
      <div class="rule-builder">
        <span class="rule-chip">SI</span>${field('Evento', `<select class="select" name="trigger">${Object.entries(TRIGGERS).map(([k, l]) => opt(k, l, a?.trigger)).join('')}</select>`)}
        <span class="rule-chip">Y</span>
        <div class="grid-3">
          ${field('Campo (opcional)', `<select class="select" name="cfield"><option value="">Sin condición</option>${Object.entries(FIELDS).map(([k, l]) => opt(k, l, a?.condition?.field)).join('')}</select>`)}
          ${field('Operador', `<select class="select" name="cop">${[['in', 'es uno de'], ['eq', 'igual a'], ['gt', 'mayor que'], ['lt', 'menor que']].map(([k, l]) => opt(k, l, a?.condition?.op)).join('')}</select>`)}
          ${field('Valor', `<input class="input" name="cvalue" value="${escape(a?.condition?.value ?? '')}" placeholder="${escape(LEAD_SOURCES.slice(0, 2).join(','))}">`)}
        </div>
        <span class="rule-chip">ENTONCES</span>
        <div class="grid-2">
          ${field('Acción', `<select class="select" name="action">${Object.entries(ACTIONS).map(([k, l]) => opt(k, l, a?.action)).join('')}</select>`)}
          ${field('Plantilla (para correos)', `<select class="select" name="templateId">${tpls.map(t => opt(t.id, t.name, a?.params?.templateId)).join('')}</select>`)}
          ${field('Asunto de la tarea', `<input class="input" name="subject" value="${escape(a?.params?.subject || 'Seguimiento')}">`)}
          ${field('Vence en (días)', `<input class="input" type="number" min="0" name="days" value="${a?.params?.days ?? 1}">`)}
        </div>
      </div>
      <label class="check"><input type="checkbox" name="active" ${a?.active === false ? '' : 'checked'}> Regla activa</label>`,
    onSubmit: (f, v) => {
      const params = v.action === 'email' ? { templateId: v.templateId } : v.action === 'task' ? { subject: v.subject.trim() || 'Seguimiento', days: +v.days || 0 } : {};
      const patch = { name: v.name.trim(), trigger: v.trigger, condition: v.cfield ? { field: v.cfield, op: v.cop, value: ['gt', 'lt'].includes(v.cop) ? Number(v.cvalue) || 0 : v.cvalue.trim() } : null, action: v.action, params, active: !!v.active };
      a ? db.update('automations', a.id, patch) : db.insert('automations', { ...patch, runs: 0, lastRun: null });
      db.log('automatizaciones', `${a ? 'Editó' : 'Creó'} la regla "${patch.name}"`, user.id);
      toast('Regla guardada', 'success');
    }
  });
}
