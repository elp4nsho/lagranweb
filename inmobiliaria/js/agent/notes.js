// Notas CRM: todas las notas del corredor en orden cronológico, con alta rápida.
import { escape, toast, ago, dateTime } from '../../../assets/core/ui.js';
import { LSTATUS, badge } from '../shared/format.js';
import { pageHead } from '../shared/kit.js';

export function renderNotes(el, { db, user, refresh }, { agent }) {
  const leads = db.query('leads', l => l.agentId === agent.id);
  const notes = leads.flatMap(l => (l.notes || []).map(n => ({ ...n, lead: l }))).sort((a, b) => b.at.localeCompare(a.at));
  el.innerHTML = `${pageHead('Notas CRM', `${notes.length} notas en ${leads.length} leads`)}
    <form class="card form-grid" data-add>
      <div class="field"><label for="n-l">Lead</label><select class="select" id="n-l" name="lead">${leads.filter(l => !['ganado', 'perdido'].includes(l.status)).map(l => `<option value="${l.id}">${escape(l.name)} · ${escape(LSTATUS[l.status][0])}</option>`).join('')}</select></div>
      <div class="field"><label for="n-t">Nota</label><input class="input" id="n-t" name="text" placeholder="Ej: envié tasación comparativa" required></div>
      <div class="full"><button class="btn btn-primary">Guardar nota</button></div></form>
    <div class="card">${notes.slice(0, 60).map(n => `<div class="list-row"><div style="min-width:0;flex:1 1 300px"><b>${escape(n.lead.name)}</b> ${badge(LSTATUS, n.lead.status)}<div>${escape(n.text)}</div><span class="muted small">${escape(n.by)} · ${dateTime(n.at)}</span></div><a class="btn btn-sm" href="#/leads/${n.lead.id}">Abrir lead</a></div>`).join('') || '<p class="empty">Sin notas aún.</p>'}</div>`;
  el.querySelector('[data-add]').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target, text = f.text.value.trim(); if (!text || !f.lead.value) return toast('Escribe la nota', 'warning');
    const l = db.get('leads', f.lead.value);
    db.update('leads', l.id, { notes: [...(l.notes || []), { id: 'n' + Date.now(), at: new Date().toISOString(), by: user.name, text }] });
    toast('Nota guardada', 'success'); refresh();
  });
}
