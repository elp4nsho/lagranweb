// Leads y cotizaciones: bandeja, pipeline kanban (arrastrar y soltar), ficha con notas.
import { escape, toast, confirm, money, date, dateTime, ago } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, LEAD_STATUS, settings } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f, badge } from '../shared/admin-kit.js';

let view = 'table';
const owners = () => db.query('users', u => ['admin', 'sales'].includes(u.role) && u.active !== false);
const ownerName = id => db.get('users', id)?.name || 'Sin asignar';
const FLOW = ['nuevo', 'contactado', 'propuesta', 'negociacion', 'ganado'];

function setStatus(ctx, l, status) {
  if (l.status === status) return;
  db.update('leads', l.id, x => ({ status, notes: [...(x.notes || []), { at: new Date().toISOString(), user: ctx.user.id, text: `Estado: ${LEAD_STATUS[x.status][0]} → ${LEAD_STATUS[status][0]}`, system: true }] }));
  db.log('lead', `${l.name}: ${LEAD_STATUS[status][0]}`, ctx.user.id);
  toast(`Lead movido a “${LEAD_STATUS[status][0]}”`, status === 'ganado' ? 'success' : 'info');
}

function newLead(ctx) {
  formDialog({
    title: 'Nuevo lead manual',
    body: `<div class="grid-2">${f.text('name', 'Nombre', '', { required: true })}${f.text('company', 'Empresa', '')}</div>
      <div class="grid-2">${f.text('email', 'Correo', '', { required: true, type: 'email' })}${f.text('phone', 'Teléfono', '')}</div>
      <div class="grid-2">${f.select('service', 'Servicio', db.all('services').map(s => s.title))}${f.text('value', 'Valor estimado (CLP)', 3000000, { type: 'number' })}</div>
      <div class="grid-2">${f.select('source', 'Origen', ['Referido', 'LinkedIn', 'Instagram', 'Evento', 'Sitio web'])}${f.select('owner', 'Responsable', owners().map(u => [u.id, u.name]), ctx.user.id)}</div>
      ${f.area('message', 'Notas iniciales', '', { rows: 3 })}`,
    onSubmit: v => {
      db.insert('leads', { type: 'contacto', name: v.name, company: v.company, email: v.email, phone: v.phone, services: [v.service], value: v.value, estimate: 0, source: v.source, owner: v.owner, message: v.message, status: 'nuevo', notes: [] });
      db.log('lead', `Creó lead manual: ${v.name}`, ctx.user.id); toast('Lead creado', 'success');
    }
  });
}

function list(el, ctx) {
  const leads = db.all('leads');
  const open = leads.filter(l => !['ganado', 'perdido'].includes(l.status));
  el.innerHTML = `${pageHead('Leads y cotizaciones', `${leads.filter(l => l.status === 'nuevo').length} nuevos · pipeline abierto ${money(open.reduce((s, l) => s + (l.value || 0), 0))}`, `<div class="tabs" role="tablist" style="border:0"><button class="tab ${view === 'table' ? 'active' : ''}" data-view="table">☰ Bandeja</button><button class="tab ${view === 'kanban' ? 'active' : ''}" data-view="kanban">▥ Pipeline</button></div><button class="btn btn-primary" data-new>＋ Nuevo lead</button>`)}<div data-body></div>`;
  el.querySelector('[data-new]').onclick = () => newLead(ctx);
  el.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; list(el, ctx); });
  const body = el.querySelector('[data-body]');
  if (view === 'table') {
    table(body, {
      id: 'leads', rows: leads, sort: 'createdAt', dir: -1, pageSize: 12, search: l => `${l.name} ${l.company} ${l.email} ${(l.services || []).join(' ')}`,
      filters: [
        { key: 'status', label: 'Estado', options: Object.entries(LEAD_STATUS).map(([k, [l]]) => [k, l]) },
        { key: 'type', label: 'Tipo', options: [['cotizacion', 'Cotización'], ['contacto', 'Contacto']] },
        { key: 'owner', label: 'Responsable', options: [['none', 'Sin asignar'], ...owners().map(u => [u.id, u.name])], test: (l, v) => (v === 'none' ? !l.owner : l.owner === v) },
        { key: 'source', label: 'Origen', options: [...new Set(leads.map(l => l.source))] }
      ],
      columns: [
        { key: 'name', label: 'Contacto', render: l => `<div class="cell-main"><span class="avatar" style="--size:32px">${escape(initials(l.name))}</span><span><b>${escape(l.name)}</b><small>${escape(l.company || l.email)}</small></span></div>` },
        { key: 'type', label: 'Tipo', render: l => `<span class="badge plain">${l.type === 'cotizacion' ? 'Cotización' : 'Contacto'}</span>` },
        { key: 'services', label: 'Servicio', value: l => (l.services || []).join(', '), render: l => `<span class="small">${escape((l.services || []).join(', '))}</span>` },
        { key: 'value', label: 'Valor', render: l => (l.value ? money(l.value) : '—') },
        { key: 'owner', label: 'Responsable', value: l => ownerName(l.owner), render: l => `<span class="small">${escape(ownerName(l.owner))}</span>` },
        { key: 'createdAt', label: 'Recibido', render: l => `<span class="small" title="${dateTime(l.createdAt)}">${ago(l.createdAt)}</span>` },
        { key: 'status', label: 'Estado', render: l => badge(l.status, LEAD_STATUS) }
      ],
      actions: () => actBtn('open', 'Abrir', '→') + actBtn('del', 'Eliminar', '🗑'),
      onRow: l => ctx.go(`/leads/${l.id}`),
      onAction: async (a, l) => {
        if (a === 'open') ctx.go(`/leads/${l.id}`);
        if (a === 'del' && await confirm(`¿Eliminar el lead de ${l.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('leads', l.id); db.log('lead', `Eliminó lead de ${l.name}`, ctx.user.id); toast('Lead eliminado', 'success'); }
      },
      csv: { name: 'leads', map: l => ({ fecha: date(l.createdAt), nombre: l.name, empresa: l.company, correo: l.email, telefono: l.phone, tipo: l.type, servicios: (l.services || []).join(', '), valor: l.value, estado: LEAD_STATUS[l.status][0], responsable: ownerName(l.owner), origen: l.source }) }
    });
  } else {
    body.innerHTML = `<p class="small muted">Arrastra las tarjetas entre columnas para cambiar el estado.</p><div class="kanban">${Object.entries(LEAD_STATUS).map(([k, [l, t]]) => {
      const items = leads.filter(x => x.status === k).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return `<section class="kan-col" data-col="${k}" aria-label="${l}"><header><span>${badge(k, LEAD_STATUS)}</span><span class="muted">${items.length} · ${money(items.reduce((s, x) => s + (x.value || 0), 0))}</span></header>
        ${items.slice(0, 30).map(x => `<a class="kan-card" draggable="true" data-lead="${x.id}" href="#/leads/${x.id}"><b>${escape(x.name)}</b><span class="muted">${escape(x.company || '')}</span><div class="row between" style="margin-top:6px"><span>${x.value ? money(x.value) : '—'}</span><small class="muted">${ago(x.createdAt)}</small></div></a>`).join('')}</section>`;
    }).join('')}</div>`;
    let drag = null;
    body.addEventListener('dragstart', e => { const c = e.target.closest('[data-lead]'); if (c) { drag = c.dataset.lead; e.dataTransfer.setData('text/plain', drag); } });
    body.addEventListener('dragover', e => { const col = e.target.closest('[data-col]'); if (col) { e.preventDefault(); body.querySelectorAll('.kan-col').forEach(c => c.classList.toggle('over', c === col)); } });
    body.addEventListener('drop', e => { const col = e.target.closest('[data-col]'); if (!col || !drag) return; e.preventDefault(); const l = db.get('leads', drag); if (l) setStatus(ctx, l, col.dataset.col); drag = null; });
    body.addEventListener('dragend', () => body.querySelectorAll('.kan-col').forEach(c => c.classList.remove('over')));
  }
}

function detail(el, ctx, id) {
  const l = db.get('leads', id);
  if (!l) { el.innerHTML = `<div class="card empty"><h2>Lead no encontrado</h2><a class="btn" href="#/leads">Volver</a></div>`; return; }
  const p = settings().pricing || {};
  const idx = FLOW.indexOf(l.status);
  const nextSt = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
  el.innerHTML = `${pageHead(l.name, `<a href="#/leads">← Leads</a> · ${l.type === 'cotizacion' ? 'Cotización web' : 'Contacto'} recibido ${dateTime(l.createdAt)}`, `${badge(l.status, LEAD_STATUS)}${nextSt ? `<button class="btn btn-primary" data-next="${nextSt}">Avanzar a “${LEAD_STATUS[nextSt][0]}” →</button>` : ''}`)}
    <div class="card"><div class="row" style="gap:6px">${Object.entries(LEAD_STATUS).map(([k, [lab]]) => `<button class="chip ${l.status === k ? 'active' : ''}" data-status="${k}">${lab}</button>`).join('')}</div></div>
    <div class="detail-grid">
      <div class="stack">
        <div class="card"><h3>Datos de contacto</h3><dl class="dl">
          <div><dt>Nombre</dt><dd>${escape(l.name)}</dd></div><div><dt>Empresa</dt><dd>${escape(l.company || '—')}</dd></div>
          <div><dt>Correo</dt><dd><a href="mailto:${escape(l.email)}">${escape(l.email)}</a></dd></div><div><dt>Teléfono</dt><dd>${escape(l.phone || '—')}</dd></div>
          <div><dt>Origen</dt><dd>${escape(l.source || '—')}</dd></div><div><dt>Servicios</dt><dd>${escape((l.services || []).join(', '))}</dd></div>
          ${l.type === 'cotizacion' ? `<div><dt>Alcance</dt><dd>${escape(p.sizes?.[l.size]?.label || l.size || '—')}${l.rush ? ' · urgente' : ''}</dd></div><div><dt>Extras</dt><dd>${escape((l.extras || []).map(x => (p.extras || []).find(e => e.id === x)?.label || x).join(', ') || '—')}</dd></div><div><dt>Plazo</dt><dd>${escape(l.timeline || '—')}</dd></div><div><dt>Estimación web</dt><dd><b>${money(l.estimate)}</b></dd></div>` : `<div><dt>Presupuesto</dt><dd>${escape(l.budget || '—')}</dd></div>`}
        </dl>${l.message ? `<hr><p class="small muted" style="margin:0 0 4px">Mensaje</p><p>${escape(l.message)}</p>` : ''}</div>
        <div class="card"><h3>Notas y seguimiento</h3>
          <ul class="notes">${(l.notes || []).slice().reverse().map(n => `<li><small>${escape(ownerName(n.user))} · ${dateTime(n.at)}</small>${n.system ? `<i class="muted">${escape(n.text)}</i>` : escape(n.text)}</li>`).join('') || '<li class="muted">Aún no hay notas.</li>'}</ul>
          <form class="stack" data-note novalidate style="gap:8px"><textarea class="textarea" name="text" rows="2" placeholder="Agregar nota (llamada, reunión, acuerdo…)" required aria-label="Nueva nota"></textarea><div class="row"><button class="btn btn-primary btn-sm">Agregar nota</button><button type="button" class="btn btn-sm" data-mail>✉ Enviar correo (simulado)</button></div></form></div>
      </div>
      <div class="stack">
        <div class="card stack"><h3>Gestión</h3>
          ${f.select('owner', 'Responsable', [['', 'Sin asignar'], ...owners().map(u => [u.id, u.name])], l.owner || '')}
          <div class="field"><label for="lv">Valor del negocio (CLP)</label><div class="row" style="gap:8px;flex-wrap:nowrap"><input class="input" id="lv" type="number" value="${l.value || 0}" data-value><button class="btn" data-save-value>Guardar</button></div></div>
        </div>
        <div class="card stack"><h3>Acciones</h3><button class="btn" data-prop>⇪ Generar propuesta (PDF simulado)</button><button class="btn btn-danger" data-del>Eliminar lead</button></div>
      </div>
    </div>`;
  el.querySelector('[data-next]')?.addEventListener('click', e => setStatus(ctx, l, e.target.dataset.next));
  el.querySelectorAll('[data-status]').forEach(b => b.onclick = () => setStatus(ctx, l, b.dataset.status));
  el.querySelector('[name="owner"]').onchange = e => { db.update('leads', l.id, { owner: e.target.value || null }); db.log('lead', `Asignó ${l.name} a ${ownerName(e.target.value)}`, ctx.user.id); toast('Responsable actualizado', 'success'); };
  el.querySelector('[data-save-value]').onclick = () => { db.update('leads', l.id, { value: Number(el.querySelector('[data-value]').value) || 0 }); toast('Valor actualizado', 'success'); };
  el.querySelector('[data-note]').onsubmit = e => {
    e.preventDefault();
    const text = e.target.text.value.trim(); if (!text) return e.target.text.classList.add('invalid');
    db.update('leads', l.id, x => ({ notes: [...(x.notes || []), { at: new Date().toISOString(), user: ctx.user.id, text }] }));
    db.log('lead', `Nota en ${l.name}`, ctx.user.id); toast('Nota agregada', 'success');
  };
  el.querySelector('[data-mail]').onclick = () => formDialog({
    title: `Correo a ${l.name}`, submit: 'Enviar',
    body: `${f.text('to', 'Para', l.email, { required: true })}${f.text('subject', 'Asunto', `Tu proyecto con ${settings().name}`, { required: true })}${f.area('body', 'Mensaje', `Hola ${l.name.split(' ')[0]}:\n\nGracias por escribirnos. Nos encantaría agendar una llamada de 30 minutos para conocer mejor tu proyecto.\n\nSaludos,\n${ctx.user.name}`, { rows: 7 })}`,
    onSubmit: v => { db.update('leads', l.id, x => ({ notes: [...(x.notes || []), { at: new Date().toISOString(), user: ctx.user.id, text: `✉ Correo enviado: “${v.subject}”` }], status: x.status === 'nuevo' ? 'contactado' : x.status })); toast('Correo enviado (simulado)', 'success'); }
  });
  el.querySelector('[data-prop]').onclick = () => { db.update('leads', l.id, x => ({ status: ['nuevo', 'contactado'].includes(x.status) ? 'propuesta' : x.status, notes: [...(x.notes || []), { at: new Date().toISOString(), user: ctx.user.id, text: `Propuesta generada por ${money(x.value)}` }] })); toast('Propuesta generada y adjuntada', 'success'); };
  el.querySelector('[data-del]').onclick = async () => { if (await confirm(`¿Eliminar el lead de ${l.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('leads', l.id); db.log('lead', `Eliminó lead de ${l.name}`, ctx.user.id); toast('Lead eliminado', 'success'); ctx.go('/leads'); } };
}

export default {
  id: 'leads', path: '/leads', label: 'Leads y cotizaciones', icon: '✉', group: 'Comercial', perm: 'leads',
  render(el, ctx, params) { params.id ? detail(el, ctx, params.id) : list(el, ctx); }
};
