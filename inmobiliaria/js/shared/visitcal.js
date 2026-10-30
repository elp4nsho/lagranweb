// Gestión de visitas con calendario mensual y lista (admin: todas; corredor: las suyas).
import { escape, toast, dateTime, time, modal, date } from '../../../assets/core/ui.js';
import { notify } from '../data/db.js';
import { VSTATUS, badge } from './format.js';
import { pageHead, crudTable, editForm, monthGrid, monthName, dayKey } from './kit.js';

const view = { y: new Date().getFullYear(), m: new Date().getMonth(), mode: 'cal' };

export function visitModal(v, ctx, done) {
  const { db, user } = ctx, p = db.get('properties', v.propertyId), ag = db.get('agents', v.agentId);
  const m = modal({ title: 'Visita', body: `<div class="stack">
      <div><b>${escape(p?.title || '')}</b><div class="muted small">${escape(p?.code || '')} · ${escape(p?.address || '')}</div></div>
      <div class="grid-2"><div><span class="muted small">Cliente</span><div><b>${escape(v.clientName)}</b></div><div class="small">${escape(v.email)} · ${escape(v.phone || '')}</div></div><div><span class="muted small">Fecha</span><div><b>${dateTime(v.date)}</b></div><div class="small">Corredor: ${escape(ag?.name || '')}</div></div></div>
      <div>${badge(VSTATUS, v.status)}</div>
      <div class="field"><label for="vm-f">Comentarios de la visita</label><textarea class="textarea" id="vm-f" style="min-height:70px">${escape(v.feedback || '')}</textarea></div></div>`,
    foot: `${v.status === 'pendiente' ? '<button class="btn btn-primary" data-s="confirmada">Confirmar</button>' : ''}${['pendiente', 'confirmada'].includes(v.status) ? '<button class="btn" data-s="realizada">Marcar realizada</button><button class="btn btn-danger" data-s="cancelada">Cancelar visita</button>' : ''}<button class="btn btn-ghost" data-s="">Guardar comentario</button>` });
  m.el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
    const status = b.dataset.s || v.status, feedback = m.el.querySelector('#vm-f').value.trim();
    db.update('visits', v.id, { status, feedback });
    if (status !== v.status) {
      db.log('visita', `Visita de ${v.clientName} a ${p?.code}: ${VSTATUS[status][0]}`, user.id);
      if (v.userId) notify(v.userId, `Tu visita a ${p?.title} del ${date(v.date)} fue ${VSTATUS[status][0].toLowerCase()}`, '#/cuenta/visitas');
      if (status === 'realizada' && v.leadId) { const l = db.get('leads', v.leadId); if (l && ['nuevo', 'contactado', 'visita'].includes(l.status)) db.update('leads', l.id, { status: 'visita' }); }
    }
    toast('Visita actualizada', 'success'); m.close(); done && done();
  });
}

export function renderVisitsView(el, ctx, { agentId = null, title = 'Visitas' } = {}) {
  const { db, user } = ctx;
  const mine = v => !agentId || v.agentId === agentId;
  const list = () => db.query('visits', mine);
  const all = list();
  const next7 = all.filter(v => { const t = new Date(v.date) - Date.now(); return t > 0 && t < 7 * 864e5 && v.status !== 'cancelada'; });
  el.innerHTML = `${pageHead(title, `${next7.length} visitas en los próximos 7 días · ${all.filter(v => v.status === 'pendiente').length} por confirmar`, `<div class="seg"><button data-mode="cal" class="${view.mode === 'cal' ? 'active' : ''}">Calendario</button><button data-mode="list" class="${view.mode === 'list' ? 'active' : ''}">Lista</button></div><button class="btn btn-primary" data-new>+ Agendar visita</button>`)}<div data-body></div>`;
  const body = el.querySelector('[data-body]');
  if (view.mode === 'cal') {
    const byDay = {};
    all.forEach(v => { const k = dayKey(new Date(v.date)); (byDay[k] = byDay[k] || []).push(v); });
    body.innerHTML = `<div class="card"><div class="row between" style="margin-bottom:12px"><button class="btn btn-sm" data-mv="-1" aria-label="Mes anterior">←</button><h3 style="margin:0;text-transform:capitalize">${monthName(view.y, view.m)}</h3><button class="btn btn-sm" data-mv="1" aria-label="Mes siguiente">→</button></div>
      ${monthGrid(view.y, view.m, (d, k) => (byDay[k] || []).sort((a, b) => a.date.localeCompare(b.date)).map(v => `<button class="cal-ev s-${v.status}" data-v="${v.id}" title="${escape(v.clientName)} · ${VSTATUS[v.status][0]}">${time(v.date)} ${escape(v.clientName.split(' ')[0])}</button>`).join(''))}
      <div class="row small muted" style="margin-top:10px;gap:14px">${Object.entries(VSTATUS).map(([k, v]) => `<span class="row" style="gap:6px"><i class="cal-ev s-${k}" style="width:14px;height:10px;padding:0"></i>${v[0]}</span>`).join('')}</div></div>`;
    body.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { view.m += +b.dataset.mv; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } ctx.refresh(); });
  } else {
    crudTable(body, {
      rows: list, search: v => `${v.clientName} ${v.email} ${db.get('properties', v.propertyId)?.code || ''}`,
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(VSTATUS).map(([k, v]) => [k, v[0]]) }, { key: 'when', label: 'Período', options: [['futuras', 'Próximas'], ['pasadas', 'Pasadas']], fn: (v, val) => val === 'futuras' ? new Date(v.date) > new Date() : new Date(v.date) <= new Date() },
        ...(agentId ? [] : [{ key: 'agentId', label: 'Corredor', options: db.all('agents').map(a => [a.id, a.name]) }])],
      columns: [
        { key: 'date', label: 'Fecha', render: v => `<span class="nowrap">${dateTime(v.date)}</span>` },
        { key: 'clientName', label: 'Cliente', render: v => `<b>${escape(v.clientName)}</b><br><span class="muted small">${escape(v.phone || v.email)}</span>` },
        { key: 'propertyId', label: 'Propiedad', render: v => `<span class="small">${escape(db.get('properties', v.propertyId)?.code || '')} · ${escape(db.get('properties', v.propertyId)?.title || '')}</span>` },
        ...(agentId ? [] : [{ key: 'agentId', label: 'Corredor', render: v => escape(db.get('agents', v.agentId)?.name || '') }]),
        { key: 'status', label: 'Estado', render: v => badge(VSTATUS, v.status) }
      ],
      onRow: v => visitModal(db.get('visits', v.id), ctx, () => ctx.refresh()),
      csv: { name: 'visitas.csv', map: v => ({ fecha: dateTime(v.date), cliente: v.clientName, correo: v.email, propiedad: db.get('properties', v.propertyId)?.code, corredor: db.get('agents', v.agentId)?.name, estado: v.status, comentario: v.feedback }) }
    });
  }
  el.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) visitModal(db.get('visits', b.dataset.v), ctx, () => ctx.refresh()); });
  el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { view.mode = b.dataset.mode; ctx.refresh(); });
  el.querySelector('[data-new]').onclick = async () => {
    const props = db.query('properties', p => ['publicada', 'reservada'].includes(p.status) && (!agentId || p.agentId === agentId));
    const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(11, 0, 0, 0);
    const r = await editForm({ title: 'Agendar visita', values: { when: new Date(t - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16) }, fields: [
      { name: 'propertyId', label: 'Propiedad', type: 'select', options: props.map(p => [p.id, `${p.code} · ${p.title}`]), full: true },
      { name: 'clientName', label: 'Cliente', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'phone', label: 'Teléfono' },
      { name: 'when', label: 'Fecha y hora', type: 'datetime-local', required: true }] });
    if (!r) return;
    const p = db.get('properties', r.propertyId);
    db.insert('visits', { propertyId: p.id, agentId: p.agentId, clientName: r.clientName, email: r.email, phone: r.phone, leadId: null, date: new Date(r.when).toISOString(), status: 'confirmada', userId: null, feedback: '' });
    db.log('visita', `${user.name} agendó visita de ${r.clientName} a ${p.code}`, user.id); toast('Visita agendada', 'success');
    const d = new Date(r.when); view.y = d.getFullYear(); view.m = d.getMonth(); ctx.refresh();
  };
}
