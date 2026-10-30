// Leads: listado con scoring, filtros y exportación; ficha con flujo de estados y conversión a negocio.
import { db, auth } from '../data/db.js';
import { escape, money, date, ago, toast, confirm, dataTable, norm } from '../../../assets/core/ui.js';
import { LEAD_SOURCES, LEAD_STATUS, leadStatus, SIZES, INDUSTRIES, CITIES } from '../shared/constants.js';
import { can, seesAll, visibleLeads } from '../shared/perms.js';
import { leadScore, scoreBadge, userChip, userName, sellers, exportCSV, isEmail, DAY } from '../shared/util.js';
import { pageHead, openForm, field, opt, actIcon, activityModal } from './components.js';
import { runAutomations, notify } from '../shared/automation.js';
import { icon } from '../shared/icons.js';

const state = { status: 'activos', source: '', owner: '' };

export function render(view, ctx) {
  if (ctx.params.id) return renderDetail(view, ctx.params.id, ctx.user);
  const user = ctx.user;
  const all = seesAll(user);
  let leads = visibleLeads(user).map(l => ({ ...l, score: leadScore(l), ownerName: userName(l.ownerId) }));
  const counts = Object.fromEntries(LEAD_STATUS.map(s => [s.id, leads.filter(l => l.status === s.id).length]));
  const rows = leads.filter(l =>
    (state.status === 'activos' ? !['descartado', 'convertido'].includes(l.status) : state.status === 'todos' || l.status === state.status) &&
    (!state.source || l.source === state.source) &&
    (!state.owner || (state.owner === 'none' ? !l.ownerId : l.ownerId === state.owner))
  ).sort((a, b) => b.score - a.score);

  view.innerHTML = `
    ${pageHead('Leads', `${rows.length} leads · ordenados por puntaje`, `${can('export') ? `<button class="btn" data-export>${icon('upload', 16)} Exportar CSV</button>` : ''}<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo lead</button>`)}
    <div class="card stack">
      <div class="row filters">
        ${[['activos', 'Activos'], ['nuevo', 'Nuevos'], ['contactado', 'Contactados'], ['calificado', 'Calificados'], ['convertido', 'Convertidos'], ['descartado', 'Descartados'], ['todos', 'Todos']].map(([k, l]) => `<button class="chip ${state.status === k ? 'active' : ''}" data-status="${k}">${l}${counts[k] != null ? ` <small>${counts[k]}</small>` : ''}</button>`).join('')}
      </div>
      <div class="row filters">
        <select class="select select-sm" data-source aria-label="Fuente"><option value="">Todas las fuentes</option>${LEAD_SOURCES.map(s => opt(s, s, state.source)).join('')}</select>
        <select class="select select-sm" data-owner aria-label="Responsable"><option value="">${all ? 'Todos los responsables' : 'Míos y sin asignar'}</option><option value="none" ${state.owner === 'none' ? 'selected' : ''}>Sin asignar</option>${(all ? sellers() : [user]).map(u => opt(u.id, u.name, state.owner)).join('')}</select>
      </div>
      <div data-table></div>
    </div>`;
  dataTable(view.querySelector('[data-table]'), {
    rows, pageSize: 12, search: l => `${l.name} ${l.company} ${l.email} ${l.city}`,
    columns: [
      { key: 'name', label: 'Lead', render: l => `<a href="#/leads/${l.id}"><b>${escape(l.name)}</b></a><br><small class="muted">${escape(l.company)}</small>` },
      { key: 'source', label: 'Fuente' },
      { key: 'status', label: 'Estado', render: l => `<span class="badge badge-${leadStatus(l.status).badge}">${leadStatus(l.status).name}</span>` },
      { key: 'score', label: 'Puntaje', render: l => `<div class="score-cell">${scoreBadge(l.score)}<div class="progress"><i style="--v:${l.score}%"></i></div></div>` },
      { key: 'ownerName', label: 'Responsable', render: l => userChip(l.ownerId) },
      { key: 'createdAt', label: 'Creado', render: l => `<span title="${date(l.createdAt)}">${ago(l.createdAt)}</span>` },
      { key: 'id', label: '', sort: false, render: l => ['convertido', 'descartado'].includes(l.status) ? '' : `<button class="btn btn-sm" data-convert="${l.id}">Convertir</button>` }
    ],
    onRow: l => { location.hash = `#/leads/${l.id}`; }
  });
  view.querySelectorAll('[data-status]').forEach(b => b.onclick = () => { state.status = b.dataset.status; render(view, ctx); });
  view.querySelector('[data-source]').onchange = e => { state.source = e.target.value; render(view, ctx); };
  view.querySelector('[data-owner]').onchange = e => { state.owner = e.target.value; render(view, ctx); };
  view.querySelector('[data-new]').onclick = () => leadModal();
  view.querySelector('[data-export]')?.addEventListener('click', () => exportCSV('leads.csv', rows.map(l => ({ nombre: l.name, empresa: l.company, email: l.email, telefono: l.phone, fuente: l.source, estado: leadStatus(l.status).name, puntaje: l.score, responsable: l.ownerName, creado: date(l.createdAt) }))));
  view.querySelector('[data-table]').addEventListener('click', e => { const b = e.target.closest('[data-convert]'); if (b) convertLead(b.dataset.convert); });
}

export function leadModal(lead = null) {
  const user = auth.current();
  const l = lead || { name: '', company: '', email: '', phone: '', title: '', source: 'Referido', status: 'nuevo', size: '11-50', industry: INDUSTRIES[0], city: 'Santiago', ownerId: user.role === 'ejecutivo' ? user.id : '', message: '' };
  const owners = can('leads.assign') ? sellers() : [user];
  openForm({
    title: lead ? 'Editar lead' : 'Nuevo lead', size: 'lg',
    body: `<div class="grid-2">
      ${field('Nombre *', `<input class="input" name="name" value="${escape(l.name)}" required>`)}
      ${field('Empresa *', `<input class="input" name="company" value="${escape(l.company)}" required>`)}
      ${field('Correo *', `<input class="input" type="email" name="email" value="${escape(l.email)}" required>`)}
      ${field('Teléfono', `<input class="input" name="phone" value="${escape(l.phone)}" placeholder="+56 9 …">`)}
      ${field('Cargo', `<input class="input" name="title" value="${escape(l.title || '')}">`)}
      ${field('Fuente', `<select class="select" name="source">${LEAD_SOURCES.map(s => opt(s, s, l.source)).join('')}</select>`)}
      ${field('Tamaño de empresa', `<select class="select" name="size">${SIZES.map(s => opt(s, s + ' personas', l.size)).join('')}</select>`)}
      ${field('Industria', `<select class="select" name="industry">${INDUSTRIES.map(s => opt(s, s, l.industry)).join('')}</select>`)}
      ${field('Ciudad', `<select class="select" name="city">${CITIES.map(s => opt(s, s, l.city)).join('')}</select>`)}
      ${field('Responsable', `<select class="select" name="ownerId"><option value="">Sin asignar</option>${owners.map(u => opt(u.id, u.name, l.ownerId)).join('')}</select>`)}
    </div>${field('Mensaje / necesidad', `<textarea class="textarea" name="message">${escape(l.message || '')}</textarea>`)}`,
    onSubmit: (f, v) => {
      if (!isEmail(v.email)) { f.email.classList.add('invalid'); toast('Correo no válido', 'warning'); return false; }
      const patch = { name: v.name.trim(), company: v.company.trim(), email: v.email.trim(), phone: v.phone.trim(), title: v.title, source: v.source, size: v.size, industry: v.industry, city: v.city, ownerId: v.ownerId || null, message: v.message };
      if (lead) {
        db.update('leads', lead.id, patch);
        if (patch.ownerId && patch.ownerId !== lead.ownerId) notify(patch.ownerId, `Se te asignó el lead ${patch.name}`, `app.html#/leads/${lead.id}`);
        toast('Lead actualizado', 'success');
      } else {
        const row = db.insert('leads', { ...patch, status: 'nuevo', interest: 'Plan Crecimiento' });
        db.log('lead', `Creó el lead ${row.name} (${row.company})`, user.id);
        runAutomations('lead.created', row, 'lead').forEach(m => toast(`Automatización · ${m}`, 'info', 4500));
        toast('Lead creado', 'success');
      }
    }
  });
}

function setStatus(lead, status) {
  db.update('leads', lead.id, { status });
  db.log('lead', `Lead ${lead.name}: ${leadStatus(lead.status).name} → ${leadStatus(status).name}`, auth.current().id);
  toast(`Lead marcado como ${leadStatus(status).name.toLowerCase()}`, 'success');
}

export function convertLead(id) {
  const user = auth.current();
  const l = db.get('leads', id);
  if (!l) return;
  const match = db.find('companies', c => norm(c.name) === norm(l.company));
  openForm({
    title: `Convertir lead · ${l.name}`, submit: 'Convertir en negocio',
    body: `<p class="muted">Se creará ${match ? 'el contacto en la empresa existente' : 'la empresa, el contacto'} y un negocio en el pipeline.</p>
      ${field('Empresa', match ? `<input class="input" value="${escape(match.name)} (existente)" disabled>` : `<input class="input" name="company" value="${escape(l.company)}" required>`)}
      ${field('Nombre del negocio *', `<input class="input" name="title" value="${escape(l.company)} · ${escape(l.interest || 'Licencias')}" required>`)}
      <div class="grid-2">
        ${field('Monto estimado (CLP)', `<input class="input" type="number" name="amount" min="0" step="100000" value="${{ '1-10': 2, '11-50': 5, '51-200': 12, '201-500': 24, '500+': 40 }[l.size] * 1000000 || 5000000}">`)}
        ${field('Etapa inicial', `<select class="select" name="stage">${opt('prospeccion', 'Prospección')}${opt('calificado', 'Calificado', 'calificado')}</select>`)}
      </div>
      ${field('Responsable', `<select class="select" name="ownerId">${(can('leads.assign') ? sellers() : [user]).map(u => opt(u.id, u.name, l.ownerId || user.id)).join('')}</select>`)}`,
    onSubmit: (f, v) => {
      const now = new Date().toISOString();
      const company = match || db.insert('companies', { name: v.company.trim(), industry: l.industry, size: l.size, city: l.city, rut: '', website: '', phone: l.phone, ownerId: v.ownerId });
      const contact = db.find('contacts', c => c.email.toLowerCase() === l.email.toLowerCase()) || db.insert('contacts', { name: l.name, email: l.email, phone: l.phone, title: l.title || '', companyId: company.id, ownerId: v.ownerId, tags: [] });
      const deal = db.insert('deals', { title: v.title.trim(), companyId: company.id, contactId: contact.id, ownerId: v.ownerId, stage: v.stage, amount: +v.amount || 0, items: [], source: l.source, closeDate: new Date(Date.now() + 45 * DAY).toISOString(), closedAt: null, history: [{ stage: v.stage, at: now }], leadId: l.id });
      db.query('activities', a => a.leadId === l.id).forEach(a => db.update('activities', a.id, { dealId: deal.id, companyId: company.id }));
      db.insert('activities', { type: 'sistema', subject: `Negocio creado desde el lead ${l.name}`, dealId: deal.id, companyId: company.id, ownerId: user.id, done: true, dueAt: now, doneAt: now, reminded: true });
      db.update('leads', l.id, { status: 'convertido', dealId: deal.id, ownerId: v.ownerId });
      db.log('lead', `Convirtió el lead ${l.name} en el negocio "${deal.title}"`, user.id);
      runAutomations('deal.stage', deal, 'deal');
      toast('Lead convertido en negocio', 'success');
      location.hash = `#/negocios/${deal.id}`;
    }
  });
}

function renderDetail(view, id, user) {
  const l = db.get('leads', id);
  if (!l || (!seesAll(user) && l.ownerId && l.ownerId !== user.id)) { view.innerHTML = `<div class="card empty"><h2>Lead no encontrado</h2><a class="btn" href="#/leads">Volver a leads</a></div>`; return; }
  const score = leadScore(l);
  const st = leadStatus(l.status);
  const acts = db.query('activities', a => a.leadId === id).sort((a, b) => b.dueAt.localeCompare(a.dueAt));
  const weights = db.getValue('settings', {}).scoring || {};
  const steps = ['nuevo', 'contactado', 'calificado'];
  view.innerHTML = `
    <a class="btn btn-ghost btn-sm back" href="#/leads">${icon('back', 16)} Leads</a>
    ${pageHead(l.name, `${escape(l.title || 'Contacto')} en <b>${escape(l.company)}</b> · ${escape(l.city || '')}`, `
      <button class="btn" data-edit>${icon('edit', 16)} Editar</button>
      ${can('deals.delete') ? `<button class="btn btn-ghost" data-del>${icon('trash', 16)}</button>` : ''}
      ${['convertido', 'descartado'].includes(l.status) ? '' : `<button class="btn btn-primary" data-convert>${icon('arrow', 16)} Convertir en negocio</button>`}`)}
    <div class="detail-grid">
      <div class="stack">
        <section class="card stack">
          <div class="row between"><h3 style="margin:0">Estado</h3><span class="badge badge-${st.badge}">${st.name}</span></div>
          ${l.status === 'convertido' ? `<p>Este lead se convirtió en negocio. ${l.dealId && db.get('deals', l.dealId) ? `<a href="#/negocios/${l.dealId}">Ver negocio →</a>` : ''}</p>`
            : l.status === 'descartado' ? `<p class="muted">Lead descartado.</p><button class="btn btn-sm" data-set="nuevo">Reabrir lead</button>`
            : `<div class="stepper">${steps.map((s, i) => `<button class="step ${steps.indexOf(l.status) >= i ? 'on' : ''}" data-set="${s}">${leadStatus(s).name}</button>`).join('')}</div>
               <div class="row"><button class="btn btn-sm btn-ghost" data-set="descartado">Descartar lead</button></div>`}
        </section>
        <section class="card stack">
          <div class="row between"><h3 style="margin:0">Actividad</h3><button class="btn btn-sm" data-log>${icon('plus', 14)} Registrar</button></div>
          ${l.message ? `<div class="timeline-item">${actIcon('nota')}<div><b>Mensaje del formulario</b><p style="margin:4px 0 0">${escape(l.message)}</p><small class="muted">${date(l.createdAt)}</small></div></div>` : ''}
          ${acts.map(a => `<div class="timeline-item">${actIcon(a.type)}<div><b>${escape(a.subject)}</b>${a.body ? `<p style="margin:4px 0 0;white-space:pre-line">${escape(a.body)}</p>` : ''}<small class="muted">${date(a.dueAt)} · ${escape(userName(a.ownerId))}${a.done ? '' : ' · pendiente'}</small></div></div>`).join('') || (l.message ? '' : '<div class="empty small">Sin actividad registrada</div>')}
        </section>
      </div>
      <aside class="stack">
        <section class="card stack">
          <h3 style="margin:0">Puntaje</h3>
          ${scoreBadge(score)}
          <div class="progress"><i style="--v:${score}%"></i></div>
          <ul class="kv small">
            <li><span>Fuente (${escape(l.source)})</span><b>+${weights[l.source] ?? 10}</b></li>
            <li><span>Tamaño (${escape(l.size)})</span><b>+${{ '1-10': 4, '11-50': 12, '51-200': 20, '201-500': 24, '500+': 28 }[l.size] || 8}</b></li>
            <li><span>Teléfono</span><b>${l.phone ? '+8' : '0'}</b></li>
            <li><span>Correo corporativo</span><b>${l.email && !/gmail|hotmail|yahoo|outlook/i.test(l.email) ? '+8' : '0'}</b></li>
            <li><span>Estado</span><b>${{ nuevo: 0, contactado: 8, calificado: 18, descartado: -40, convertido: 20 }[l.status]}</b></li>
          </ul>
        </section>
        <section class="card stack">
          <h3 style="margin:0">Datos</h3>
          <ul class="kv small">
            <li><span>Correo</span><a href="mailto:${escape(l.email)}">${escape(l.email)}</a></li>
            <li><span>Teléfono</span><b>${escape(l.phone || '—')}</b></li>
            <li><span>Industria</span><b>${escape(l.industry || '—')}</b></li>
            <li><span>Tamaño</span><b>${escape(l.size)} personas</b></li>
            <li><span>Interés</span><b>${escape(l.interest || '—')}</b></li>
            <li><span>Creado</span><b>${date(l.createdAt)}</b></li>
          </ul>
          <div class="field"><label>Responsable</label>
            ${can('leads.assign') ? `<select class="select" data-assign><option value="">Sin asignar</option>${sellers().map(u => opt(u.id, u.name, l.ownerId)).join('')}</select>`
              : l.ownerId ? userChip(l.ownerId) : `<button class="btn btn-sm" data-take>Tomar este lead</button>`}
          </div>
        </section>
      </aside>
    </div>`;
  view.querySelector('[data-edit]').onclick = () => leadModal(l);
  view.querySelector('[data-convert]')?.addEventListener('click', () => convertLead(id));
  view.querySelectorAll('[data-set]').forEach(b => b.onclick = () => setStatus(l, b.dataset.set));
  view.querySelector('[data-log]').onclick = () => openForm({
    title: 'Registrar actividad del lead',
    body: `${field('Tipo', `<select class="select" name="type">${opt('llamada', 'Llamada')}${opt('email', 'Correo')}${opt('nota', 'Nota')}${opt('reunion', 'Reunión')}</select>`)}${field('Asunto *', '<input class="input" name="subject" required>')}${field('Detalle', '<textarea class="textarea" name="body"></textarea>')}`,
    onSubmit: (f, v) => {
      const now = new Date().toISOString();
      db.insert('activities', { type: v.type, subject: v.subject, body: v.body, leadId: id, ownerId: user.id, done: true, dueAt: now, doneAt: now, reminded: true });
      if (l.status === 'nuevo') db.update('leads', id, { status: 'contactado' });
      toast('Actividad registrada', 'success');
    }
  });
  view.querySelector('[data-assign]')?.addEventListener('change', e => {
    db.update('leads', id, { ownerId: e.target.value || null });
    if (e.target.value) notify(e.target.value, `Se te asignó el lead ${l.name}`, `app.html#/leads/${id}`);
    db.log('lead', `Asignó el lead ${l.name} a ${userName(e.target.value)}`, user.id);
    toast('Responsable actualizado', 'success');
  });
  view.querySelector('[data-take]')?.addEventListener('click', () => { db.update('leads', id, { ownerId: user.id }); toast('El lead ahora es tuyo', 'success'); });
  view.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!await confirm(`¿Eliminar el lead ${l.name}?`, { danger: true, ok: 'Eliminar' })) return;
    db.remove('leads', id); db.log('lead', `Eliminó el lead ${l.name}`, user.id); toast('Lead eliminado', 'success'); location.hash = '#/leads';
  });
}
