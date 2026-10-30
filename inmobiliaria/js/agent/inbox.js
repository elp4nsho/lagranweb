// Bandeja de leads del corredor: lista + detalle con pipeline, notas CRM y acciones rápidas.
import { escape, toast, ago, dateTime, formModal, norm } from '../../../assets/core/ui.js';
import { LSTATUS, badge, mainPrice } from '../shared/format.js';
import { pageHead } from '../shared/kit.js';

let filter = 'abiertos', q = '';
export function renderInbox(el, { sub }, query, ctx, { agent }) {
  const { db, user } = ctx;
  const all = db.query('leads', l => l.agentId === agent.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const list = all.filter(l => (filter === 'todos' || (filter === 'abiertos' ? !['ganado', 'perdido'].includes(l.status) : l.status === filter)) && (!q || norm(`${l.name} ${l.email} ${l.message}`).includes(norm(q))));
  const cur = db.get('leads', sub) || list[0];
  el.innerHTML = `${pageHead('Bandeja de leads', `${all.filter(l => l.status === 'nuevo').length} nuevos · ${all.length} en total`)}
    <div class="row" style="gap:6px">${[['abiertos', 'Abiertos'], ['nuevo', 'Nuevos'], ['negociacion', 'Negociación'], ['ganado', 'Ganados'], ['perdido', 'Perdidos'], ['todos', 'Todos']].map(([k, l]) => `<button class="chip ${filter === k ? 'active' : ''}" data-filter="${k}">${l}</button>`).join('')}</div>
    <div class="inbox">
      <div class="card inbox-list"><div style="padding:10px"><input class="input" type="search" placeholder="Buscar lead…" value="${escape(q)}" data-q></div>
        ${list.map(l => `<button class="inbox-item ${cur && l.id === cur.id ? 'active' : ''}" data-lead="${l.id}"><div class="row between" style="gap:6px"><b>${escape(l.name)}</b>${badge(LSTATUS, l.status)}</div><div class="muted">${escape(db.get('properties', l.propertyId)?.code || db.get('projects', l.projectId)?.name || '')} · ${ago(l.createdAt)}</div><div class="small ellipsis">${escape(l.message)}</div></button>`).join('') || '<p class="empty">Sin leads en este filtro.</p>'}</div>
      <div data-detail></div>
    </div>`;
  const det = el.querySelector('[data-detail]');
  if (cur && cur.agentId === agent.id) {
    const p = db.get('properties', cur.propertyId), pr = db.get('projects', cur.projectId);
    const stages = ['nuevo', 'contactado', 'visita', 'negociacion', 'ganado'];
    det.innerHTML = `<div class="card stack">
      <div class="row between"><div><h2 style="margin:0">${escape(cur.name)}</h2><span class="muted small">${escape(cur.email)} · ${escape(cur.phone || 'sin teléfono')} · origen ${escape(cur.source)} · ${dateTime(cur.createdAt)}</span></div>
        <div class="row" style="gap:6px"><a class="btn btn-sm" href="tel:${escape(cur.phone || '')}">📞 Llamar</a><a class="btn btn-sm" href="https://wa.me/${escape((cur.phone || '').replace(/\D/g, ''))}" target="_blank" rel="noopener">💬 WhatsApp</a><a class="btn btn-sm" href="mailto:${escape(cur.email)}">✉️ Correo</a></div></div>
      <div class="wf">${stages.map((s, i) => `${i ? '<span class="arrow">→</span>' : ''}<button class="step-pill ${stages.indexOf(cur.status) >= i ? 'on' : ''}" data-stage="${s}" style="cursor:pointer;font:inherit;font-size:12px;font-weight:700">${LSTATUS[s][0]}</button>`).join('')}<button class="btn btn-sm btn-ghost" data-stage="perdido">Marcar perdido</button></div>
      <div class="note"><b>Mensaje:</b> ${escape(cur.message)}</div>
      ${p ? `<div class="list-row"><span><b>${escape(p.code)}</b> · ${escape(p.title)}</span><span class="row" style="gap:6px"><b>${mainPrice(p)}</b><a class="btn btn-sm" href="index.html#/propiedad/${p.id}" target="_blank" rel="noopener">Ficha ↗</a></span></div>` : pr ? `<div class="list-row"><span>Proyecto <b>${escape(pr.name)}</b></span></div>` : ''}
      <div><h3>Notas CRM</h3><form class="row" data-note style="flex-wrap:nowrap"><input class="input" name="text" placeholder="Agregar nota: llamé, envié ficha, pidió rebaja…" aria-label="Nota"><button class="btn btn-primary">Agregar</button></form>
        <div class="stack" style="gap:8px;margin-top:10px">${(cur.notes || []).slice().reverse().map(n => `<div class="note"><div class="small muted">${escape(n.by)} · ${ago(n.at)}</div>${escape(n.text)}</div>`).join('') || '<p class="muted small">Aún no hay notas.</p>'}</div></div>
      ${p ? '<button class="btn" data-visit>📅 Agendar visita con este lead</button>' : ''}
    </div>`;
    const save = (patch, msg) => { db.update('leads', cur.id, patch); toast(msg, 'success'); ctx.go('/leads/' + cur.id); };
    det.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { if (b.dataset.stage === cur.status) return; db.log('lead', `${user.name}: ${cur.name} → ${LSTATUS[b.dataset.stage][0]}`, user.id); save({ status: b.dataset.stage }, `Estado: ${LSTATUS[b.dataset.stage][0]}`); });
    det.querySelector('[data-note]').addEventListener('submit', e => { e.preventDefault(); const t = e.target.text.value.trim(); if (!t) return; save({ notes: [...(cur.notes || []), { id: 'n' + Date.now(), at: new Date().toISOString(), by: user.name, text: t }], status: cur.status === 'nuevo' ? 'contactado' : cur.status }, 'Nota agregada'); });
    det.querySelector('[data-visit]')?.addEventListener('click', async () => {
      const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(16, 0, 0, 0);
      const r = await formModal({ title: `Visita · ${p.code}`, submit: 'Agendar', fields: [{ name: 'when', label: 'Fecha y hora', type: 'datetime-local', required: true, value: new Date(t - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16) }] });
      if (!r) return;
      db.insert('visits', { propertyId: p.id, agentId: agent.id, clientName: cur.name, email: cur.email, phone: cur.phone, leadId: cur.id, date: new Date(r.when).toISOString(), status: 'confirmada', userId: cur.userId || null, feedback: '' });
      db.log('visita', `${user.name} agendó visita con ${cur.name}`, user.id);
      save({ status: 'visita' }, 'Visita agendada');
    });
  } else det.innerHTML = '<div class="card empty">Selecciona un lead.</div>';
  el.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; ctx.go('/leads'); });
  el.querySelectorAll('[data-lead]').forEach(b => b.onclick = () => ctx.go('/leads/' + b.dataset.lead));
  const qi = el.querySelector('[data-q]');
  qi.addEventListener('change', () => { q = qi.value; ctx.refresh(); });
  qi.addEventListener('keydown', e => { if (e.key === 'Enter') { q = qi.value; ctx.refresh(); } });
}
