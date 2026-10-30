// Automatizaciones (disparadores) que se aplican al crear un ticket: si condición → acción.
import { db } from '../data/db.js';
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { TRIGGER_FIELDS, TRIGGER_ACTIONS, PRIORITIES, PLANS, CHANNELS } from '../shared/constants.js';
import { pageHead } from '../shared/shell.js';
import { openForm, field, opt } from '../shared/forms.js';
import { catName, groupName } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const valueLabel = (f, v) => f === 'category' ? catName(v) : f === 'channel' ? CHANNELS[v] || v : v;
const actionLabel = (a, v) => a === 'group' ? groupName(v) : a === 'reply' ? '“' + String(v).slice(0, 60) + '…”' : v;

export function render(view, { user }) {
  const list = db.all('triggers');
  view.innerHTML = `${pageHead('Automatizaciones', 'Se ejecutan en orden cada vez que entra un ticket (formulario, portal, correo, chat o teléfono).', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva regla</button>`)}
    <div class="stack">${list.map(t => `<article class="card rule ${t.active ? '' : 'paused'}"><div class="rule-ico">${icon('bolt', 20)}</div>
      <div style="min-width:0"><div class="row" style="gap:8px"><h3 style="margin:0">${escape(t.name)}</h3><span class="badge ${t.active ? 'badge-success' : 'plain'}">${t.active ? 'Activa' : 'Pausada'}</span></div>
      <p class="rule-desc"><span class="rule-chip">SI</span> ${t.field ? `${escape(TRIGGER_FIELDS[t.field])} <b>${escape(valueLabel(t.field, t.value))}</b>` : 'entra cualquier ticket'} <span class="rule-chip">ENTONCES</span> ${escape(TRIGGER_ACTIONS[t.action])} <b>${escape(actionLabel(t.action, t.actionValue))}</b></p>
      <small class="muted">${t.runs || 0} ejecuciones</small></div>
      <div class="row" style="gap:6px"><label class="switch"><input type="checkbox" data-toggle="${t.id}" ${t.active ? 'checked' : ''} aria-label="Activar ${escape(t.name)}"><span></span></label><button class="btn btn-sm" data-edit="${t.id}" aria-label="Editar">${icon('edit', 14)}</button><button class="btn btn-sm btn-ghost" data-del="${t.id}" aria-label="Eliminar">${icon('trash', 14)}</button></div></article>`).join('')}</div>`;
  const form = t => openForm({
    title: t ? 'Editar regla' : 'Nueva regla', size: 'lg',
    body: `${field('Nombre *', `<input class="input" name="name" value="${escape(t?.name || '')}" required>`)}
      <div class="rule-builder"><span class="rule-chip">SI</span><div class="grid-2">${field('Condición', `<select class="select" name="field"><option value="">Cualquier ticket</option>${Object.entries(TRIGGER_FIELDS).map(([k, l]) => opt(k, l, t?.field)).join('')}</select>`)}${field('Valor', `<input class="input" name="value" value="${escape(t?.value || '')}" list="vals" placeholder="texto, cat-fac, urgente, plan…"><datalist id="vals">${[...db.all('categories').map(c => c.id), ...PRIORITIES.map(p => p.id), ...PLANS, ...Object.keys(CHANNELS)].map(v => `<option value="${escape(v)}">`).join('')}</datalist>`)}</div>
      <span class="rule-chip">ENTONCES</span><div class="grid-2">${field('Acción', `<select class="select" name="action">${Object.entries(TRIGGER_ACTIONS).map(([k, l]) => opt(k, l, t?.action)).join('')}</select>`)}${field('Valor de la acción', `<input class="input" name="actionValue" value="${escape(t?.actionValue || '')}" list="avals" placeholder="urgente, g-fac, etiqueta o texto"><datalist id="avals">${[...PRIORITIES.map(p => p.id), ...db.all('groups').map(g => g.id)].map(v => `<option value="${escape(v)}">`).join('')}</datalist>`)}</div></div>
      <small class="muted">Grupos: ${db.all('groups').map(g => `${g.id} = ${escape(g.name)}`).join(' · ')}</small>`,
    onSubmit: (f, v) => { const p = { name: v.name.trim(), field: v.field, value: v.value.trim(), action: v.action, actionValue: v.actionValue.trim() }; t ? db.update('triggers', t.id, p) : db.insert('triggers', { ...p, active: true, runs: 0 }); db.log('automatización', `${t ? 'Editó' : 'Creó'} la regla "${p.name}"`, user.id); toast('Regla guardada', 'success'); }
  });
  view.querySelector('[data-new]').onclick = () => form();
  view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => form(db.get('triggers', b.dataset.edit)));
  view.querySelectorAll('[data-toggle]').forEach(c => c.onchange = () => { db.update('triggers', c.dataset.toggle, { active: c.checked }); toast(c.checked ? 'Regla activada' : 'Regla pausada', 'success'); });
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const t = db.get('triggers', b.dataset.del); if (await confirm(`¿Eliminar "${t.name}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('triggers', t.id); toast('Regla eliminada', 'success'); } });
}
