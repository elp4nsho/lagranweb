// Leads: bandeja, asignación manual o automática (round-robin por carga), estados y notas.
import { escape, toast, date, ago, dateTime, modal } from '../../../assets/core/ui.js';
import { notify } from '../data/db.js';
import { LSTATUS, badge } from '../shared/format.js';
import { pageHead, crudTable, editForm, kpi } from '../shared/kit.js';

export function leadModal(l, ctx, onDone) {
  const { db, user } = ctx;
  const p = db.get('properties', l.propertyId), pr = db.get('projects', l.projectId);
  const m = modal({ title: `Lead · ${l.name}`, size: 'lg', body: `<div class="stack">
    <div class="grid-2"><div><b>${escape(l.name)}</b><div class="muted small">${escape(l.email)} · ${escape(l.phone || 'sin teléfono')}</div><div class="small">Origen: ${escape(l.source)} · ${dateTime(l.createdAt)}</div></div>
    <div><span class="muted small">Interesado en</span><div><b>${escape(p?.title || pr?.name || '—')}</b></div><div class="muted small">${escape(p?.code || '')}</div></div></div>
    <div class="note">${escape(l.message)}</div>
    <div class="grid-2"><div class="field"><label for="lm-s">Estado</label><select class="select" id="lm-s">${Object.entries(LSTATUS).map(([k, v]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
    <div class="field"><label for="lm-a">Corredor</label><select class="select" id="lm-a"><option value="">Sin asignar</option>${db.query('agents', a => a.active).map(a => `<option value="${a.id}" ${a.id === l.agentId ? 'selected' : ''}>${escape(a.name)}</option>`).join('')}</select></div></div>
    <div><h4 style="margin:0 0 8px">Notas CRM</h4><div class="stack" style="gap:8px">${(l.notes || []).slice().reverse().map(n => `<div class="note"><div class="small muted">${escape(n.by)} · ${ago(n.at)}</div>${escape(n.text)}</div>`).join('') || '<p class="muted small">Sin notas.</p>'}</div>
    <div class="field" style="margin-top:10px"><label for="lm-n">Agregar nota</label><textarea class="textarea" id="lm-n" placeholder="Llamé al cliente, enviaré ficha…" style="min-height:70px"></textarea></div></div></div>`,
    foot: `<a class="btn btn-ghost" href="mailto:${escape(l.email)}">Escribir correo</a><button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" data-save>Guardar</button>` });
  m.el.querySelector('[data-save]').onclick = () => {
    const status = m.el.querySelector('#lm-s').value, agentId = m.el.querySelector('#lm-a').value || null, text = m.el.querySelector('#lm-n').value.trim();
    const notes = [...(l.notes || [])]; if (text) notes.push({ id: 'n' + Date.now(), at: new Date().toISOString(), by: user.name, text });
    db.update('leads', l.id, { status, agentId, notes });
    if (agentId !== l.agentId && agentId) { const ag = db.get('agents', agentId); if (ag?.userId) notify(ag.userId, `Se te asignó el lead de ${l.name}`, '#/leads/' + l.id); }
    if (status !== l.status) db.log('lead', `${l.name}: ${LSTATUS[l.status][0]} → ${LSTATUS[status][0]}`, user.id);
    toast('Lead actualizado', 'success'); m.close(); onDone && onDone();
  };
}

export function renderLeads(el, { sub }, q, ctx) {
  const { db, user } = ctx;
  const agents = db.query('agents', a => a.active);
  const leads = db.all('leads');
  const unassigned = leads.filter(l => !l.agentId);
  const load = a => db.count('leads', l => l.agentId === a.id && !['ganado', 'perdido'].includes(l.status));
  el.innerHTML = `${pageHead('Leads', 'Distribución y seguimiento de interesados', `<button class="btn" data-auto ${unassigned.length ? '' : 'disabled'}>⚡ Distribuir ${unassigned.length} sin asignar</button><button class="btn btn-primary" data-new>+ Nuevo lead</button>`)}
    <div class="kpis">${kpi('Sin asignar', unassigned.length, 'requieren corredor', !unassigned.length)}${kpi('Nuevos (7 días)', leads.filter(l => Date.now() - new Date(l.createdAt) < 7 * 864e5).length)}${kpi('En negociación', leads.filter(l => l.status === 'negociacion').length)}${kpi('Ganados (total)', leads.filter(l => l.status === 'ganado').length)}</div>
    <div class="card"><h3>Carga por corredor</h3><div class="grid-3">${agents.map(a => { const n = load(a); return `<div><div class="row between small"><span>${escape(a.name)}</span><b>${n}</b></div><div class="progress"><i style="--v:${Math.min(100, n * 4)}%"></i></div></div>`; }).join('')}</div></div>
    <div data-t></div>`;
  const tbl = crudTable(el.querySelector('[data-t]'), {
    rows: () => db.all('leads'), search: l => `${l.name} ${l.email} ${l.message} ${db.get('properties', l.propertyId)?.code || ''}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(LSTATUS).map(([k, v]) => [k, v[0]]) }, { key: 'agentId', label: 'Corredor', options: [['__none', 'Sin asignar'], ...db.all('agents').map(a => [a.id, a.name])], fn: (l, v) => v === '__none' ? !l.agentId : l.agentId === v },
      { key: 'source', label: 'Origen', options: ['web', 'portal', 'teléfono', 'referido', 'redes'] }],
    columns: [
      { key: 'name', label: 'Interesado', render: l => `<b>${escape(l.name)}</b><br><span class="muted small">${escape(l.email)}</span>` },
      { key: 'propertyId', label: 'Propiedad', render: l => { const p = db.get('properties', l.propertyId), pr = db.get('projects', l.projectId); return `<span class="small">${escape(p ? p.code + ' · ' + p.title : pr ? 'Proyecto ' + pr.name : '—')}</span>`; } },
      { key: 'source', label: 'Origen' },
      { key: 'status', label: 'Estado', render: l => badge(LSTATUS, l.status) },
      { key: 'agentId', label: 'Corredor', render: l => `<select class="select select-sm" data-assign="${l.id}" aria-label="Asignar corredor"><option value="">— Sin asignar —</option>${agents.map(a => `<option value="${a.id}" ${a.id === l.agentId ? 'selected' : ''}>${escape(a.name)}</option>`).join('')}</select>` },
      { key: 'createdAt', label: 'Recibido', render: l => `<span class="small nowrap" title="${dateTime(l.createdAt)}">${ago(l.createdAt)}</span>` }
    ],
    onRow: l => leadModal(db.get('leads', l.id), ctx, () => tbl.refresh()),
    csv: { name: 'leads.csv', map: l => ({ nombre: l.name, correo: l.email, telefono: l.phone, propiedad: db.get('properties', l.propertyId)?.code || '', origen: l.source, estado: LSTATUS[l.status][0], corredor: db.get('agents', l.agentId)?.name || '', fecha: date(l.createdAt) }) }
  });
  el.addEventListener('change', e => {
    const s = e.target.closest('[data-assign]'); if (!s) return;
    const l = db.get('leads', s.dataset.assign), ag = db.get('agents', s.value);
    db.update('leads', l.id, { agentId: s.value || null, status: l.status });
    if (ag?.userId) notify(ag.userId, `Se te asignó el lead de ${l.name}`, '#/leads/' + l.id);
    db.log('lead', `${l.name} asignado a ${ag?.name || 'nadie'}`, user.id); toast(ag ? `Asignado a ${ag.name}` : 'Lead sin asignar', 'success');
  });
  el.querySelector('[data-auto]').onclick = () => {
    const loads = Object.fromEntries(agents.map(a => [a.id, load(a)]));
    let n = 0;
    db.query('leads', l => !l.agentId).forEach(l => {
      const p = db.get('properties', l.propertyId);
      // Prioriza al corredor de la propiedad si su carga no supera el promedio; si no, el de menor carga.
      const avg = Object.values(loads).reduce((s, v) => s + v, 0) / agents.length;
      let id = p && loads[p.agentId] !== undefined && loads[p.agentId] <= avg ? p.agentId : Object.entries(loads).sort((a, b) => a[1] - b[1])[0][0];
      loads[id]++; n++;
      db.update('leads', l.id, { agentId: id });
      const ag = db.get('agents', id); if (ag?.userId) notify(ag.userId, `Se te asignó el lead de ${l.name}`, '#/leads/' + l.id);
    });
    db.log('lead', `${user.name} distribuyó ${n} leads automáticamente`, user.id);
    toast(`${n} leads distribuidos según carga`, 'success'); ctx.refresh();
  };
  el.querySelector('[data-new]').onclick = async () => {
    const r = await editForm({ title: 'Nuevo lead', fields: [
      { name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'phone', label: 'Teléfono' },
      { name: 'source', label: 'Origen', type: 'select', options: ['teléfono', 'referido', 'portal', 'web', 'redes'] },
      { name: 'propertyId', label: 'Propiedad', type: 'select', options: db.query('properties', p => ['publicada', 'reservada'].includes(p.status)).map(p => [p.id, `${p.code} · ${p.title}`]) },
      { name: 'agentId', label: 'Corredor', type: 'select', options: [['', 'Sin asignar'], ...agents.map(a => [a.id, a.name])] },
      { name: 'message', label: 'Mensaje / necesidad', type: 'textarea', full: true }] });
    if (!r) return;
    db.insert('leads', { ...r, agentId: r.agentId || null, status: 'nuevo', notes: [], userId: null });
    db.log('lead', `${user.name} registró lead de ${r.name}`, user.id); toast('Lead creado', 'success'); ctx.refresh();
  };
  if (sub) { const l = db.get('leads', sub); if (l) leadModal(l, ctx, () => tbl.refresh()); }
}
