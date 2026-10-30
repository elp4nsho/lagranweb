// Contactos: CRUD relacionado con empresas, etiquetas, secuencias y ficha con historial.
import { db, auth } from '../data/db.js';
import { escape, money, date, ago, toast, confirm, dataTable } from '../../../assets/core/ui.js';
import { can, seesAll, canSeeDeal } from '../shared/perms.js';
import { userName, userChip, sellers, exportCSV, avatar, companyName, isEmail } from '../shared/util.js';
import { pageHead, openForm, field, opt, stageBadge, actIcon, activityModal } from './components.js';
import { icon } from '../shared/icons.js';

const state = { company: '', tag: '' };

export function render(view, ctx) {
  if (ctx.params.id) return renderDetail(view, ctx.params.id, ctx.user);
  const comps = db.all('companies').sort((a, b) => a.name.localeCompare(b.name));
  const rows = db.query('contacts', c => (!state.company || c.companyId === state.company) && (!state.tag || (c.tags || []).includes(state.tag)))
    .map(c => ({ ...c, company: companyName(c.companyId), owner: userName(c.ownerId) }));
  view.innerHTML = `
    ${pageHead('Contactos', `${rows.length} personas`, `${can('export') ? `<button class="btn" data-export>${icon('upload', 16)} Exportar CSV</button>` : ''}${can('import') ? `<a class="btn" href="#/importar">Importar</a>` : ''}<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo contacto</button>`)}
    <div class="card stack">
      <div class="row filters">
        <select class="select select-sm" data-comp aria-label="Empresa"><option value="">Todas las empresas</option>${comps.map(c => opt(c.id, c.name, state.company)).join('')}</select>
        ${[['', 'Todos'], ['decisor', 'Decisores'], ['influenciador', 'Influenciadores'], ['importado', 'Importados']].map(([k, l]) => `<button class="chip ${state.tag === k ? 'active' : ''}" data-tag="${k}">${l}</button>`).join('')}
      </div>
      <div data-table></div>
    </div>`;
  dataTable(view.querySelector('[data-table]'), {
    rows, pageSize: 15, search: c => `${c.name} ${c.email} ${c.company} ${c.title}`,
    columns: [
      { key: 'name', label: 'Nombre', render: c => `<span class="user-chip">${avatar({ name: c.name, color: '#475569' }, 28)}<span><a href="#/contactos/${c.id}"><b>${escape(c.name)}</b></a><br><small class="muted">${escape(c.title || '')}</small></span></span>` },
      { key: 'company', label: 'Empresa', render: c => `<a href="#/empresas/${c.companyId}">${escape(c.company)}</a>` },
      { key: 'email', label: 'Correo' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'tags', label: 'Etiquetas', sort: false, render: c => (c.tags || []).map(t => `<span class="badge plain">${escape(t)}</span>`).join(' ') },
      { key: 'owner', label: 'Responsable', render: c => userChip(c.ownerId, 22) }
    ],
    onRow: c => { location.hash = `#/contactos/${c.id}`; }
  });
  view.querySelector('[data-comp]').onchange = e => { state.company = e.target.value; render(view, ctx); };
  view.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => { state.tag = b.dataset.tag; render(view, ctx); });
  view.querySelector('[data-new]').onclick = () => contactModal();
  view.querySelector('[data-export]')?.addEventListener('click', () => exportCSV('contactos.csv', rows.map(c => ({ nombre: c.name, correo: c.email, telefono: c.phone, cargo: c.title, empresa: c.company, etiquetas: (c.tags || []).join(' '), responsable: c.owner }))));
}

export function contactModal(contact = null, defaults = {}) {
  const user = auth.current();
  const c = contact || { name: '', email: '', phone: '', title: '', companyId: '', ownerId: user.id, tags: [], ...defaults };
  const comps = db.all('companies').sort((a, b) => a.name.localeCompare(b.name));
  openForm({
    title: contact ? 'Editar contacto' : 'Nuevo contacto',
    body: `<div class="grid-2">
      ${field('Nombre completo *', `<input class="input" name="name" value="${escape(c.name)}" required>`)}
      ${field('Cargo', `<input class="input" name="title" value="${escape(c.title || '')}">`)}
      ${field('Correo *', `<input class="input" type="email" name="email" value="${escape(c.email)}" required>`)}
      ${field('Teléfono', `<input class="input" name="phone" value="${escape(c.phone || '')}">`)}
      ${field('Empresa *', `<select class="select" name="companyId" required><option value="">Selecciona…</option>${comps.map(x => opt(x.id, x.name, c.companyId)).join('')}</select>`)}
      ${field('Responsable', `<select class="select" name="ownerId">${(seesAll() ? sellers() : [user]).map(u => opt(u.id, u.name, c.ownerId)).join('')}</select>`)}
    </div>
    <div class="row"><label class="check"><input type="checkbox" name="decisor" ${(c.tags || []).includes('decisor') ? 'checked' : ''}> Decisor</label><label class="check"><input type="checkbox" name="influenciador" ${(c.tags || []).includes('influenciador') ? 'checked' : ''}> Influenciador</label></div>`,
    onSubmit: (f, v) => {
      if (!isEmail(v.email)) { f.email.classList.add('invalid'); toast('Correo no válido', 'warning'); return false; }
      if (db.find('contacts', x => x.email.toLowerCase() === v.email.trim().toLowerCase() && x.id !== contact?.id)) { toast('Ya existe un contacto con ese correo', 'warning'); return false; }
      const tags = (c.tags || []).filter(t => !['decisor', 'influenciador'].includes(t)).concat(v.decisor ? ['decisor'] : [], v.influenciador ? ['influenciador'] : []);
      const patch = { name: v.name.trim(), title: v.title.trim(), email: v.email.trim(), phone: v.phone.trim(), companyId: v.companyId, ownerId: v.ownerId, tags };
      contact ? db.update('contacts', contact.id, patch) : db.insert('contacts', patch);
      db.log('contacto', `${contact ? 'Editó' : 'Creó'} el contacto ${patch.name}`, user.id);
      toast(contact ? 'Contacto actualizado' : 'Contacto creado', 'success');
    }
  });
}

function renderDetail(view, id, user) {
  const c = db.get('contacts', id);
  if (!c) { view.innerHTML = '<div class="card empty"><h2>Contacto no encontrado</h2><a class="btn" href="#/contactos">Volver</a></div>'; return; }
  const deals = db.query('deals', d => d.contactId === id);
  const acts = db.query('activities', a => a.contactId === id && a.type !== 'sistema' && (!a.dealId || canSeeDeal(db.get('deals', a.dealId), user))).sort((a, b) => b.dueAt.localeCompare(a.dueAt)).slice(0, 15);
  const seqs = db.all('sequences');
  const enrolled = seqs.filter(s => s.enrolled.some(e => e.contactId === id));
  view.innerHTML = `
    <a class="btn btn-ghost btn-sm back" href="#/contactos">${icon('back', 16)} Contactos</a>
    ${pageHead(c.name, `${escape(c.title || 'Contacto')} en <a href="#/empresas/${c.companyId}">${escape(companyName(c.companyId))}</a>`, `<button class="btn" data-edit>${icon('edit', 16)} Editar</button>${can('deals.delete') ? `<button class="btn btn-ghost" data-del aria-label="Eliminar contacto">${icon('trash', 16)}</button>` : ''}<button class="btn btn-primary" data-act>${icon('calendar', 16)} Agendar</button>`)}
    <div class="detail-grid">
      <div class="stack" style="min-width:0">
        <section class="card stack"><h3 style="margin:0">Negocios</h3>
          ${deals.map(d => `<div class="row between"><span>${canSeeDeal(d, user) ? `<a href="#/negocios/${d.id}"><b>${escape(d.title)}</b></a>` : `<b>${escape(d.title)}</b>`}</span><span class="row" style="gap:8px">${stageBadge(d.stage)}<b>${money(d.amount)}</b></span></div>`).join('') || '<div class="empty small">Sin negocios asociados</div>'}
        </section>
        <section class="card stack"><h3 style="margin:0">Historial</h3>
          <div class="timeline">${acts.map(a => `<div class="timeline-item">${actIcon(a.type)}<div style="min-width:0"><b>${escape(a.subject)}</b>${a.body ? `<p class="tl-body">${escape(a.body)}</p>` : ''}<small class="muted">${ago(a.dueAt)} · ${escape(userName(a.ownerId))}${a.done ? '' : ' · pendiente'}</small></div></div>`).join('') || '<div class="empty small">Sin actividad</div>'}</div>
        </section>
      </div>
      <aside class="stack">
        <section class="card stack"><h3 style="margin:0">Datos</h3>
          <ul class="kv small"><li><span>Correo</span><a class="trunc" href="mailto:${escape(c.email)}">${escape(c.email)}</a></li><li><span>Teléfono</span><b>${escape(c.phone || '—')}</b></li><li><span>Etiquetas</span><span>${(c.tags || []).map(t => `<span class="badge plain">${escape(t)}</span>`).join(' ') || '—'}</span></li><li><span>Responsable</span>${userChip(c.ownerId, 22)}</li><li><span>Creado</span><b>${date(c.createdAt)}</b></li></ul>
        </section>
        <section class="card stack"><h3 style="margin:0">Secuencias</h3>
          ${enrolled.map(s => { const e = s.enrolled.find(x => x.contactId === id); return `<div class="row between"><span>${escape(s.name)}</span><span class="badge ${e.done ? 'badge-success' : 'badge-info'}">${e.done ? 'Completada' : `Paso ${e.step + 1}/${s.steps.length}`}</span></div>`; }).join('') || '<p class="muted small" style="margin:0">No está inscrito en secuencias.</p>'}
          <div class="row" style="gap:8px;flex-wrap:nowrap"><select class="select select-sm" data-seq aria-label="Secuencia">${seqs.filter(s => s.active && !enrolled.includes(s)).map(s => opt(s.id, s.name)).join('') || '<option value="">Sin secuencias disponibles</option>'}</select><button class="btn btn-sm" data-enroll>Inscribir</button></div>
        </section>
      </aside>
    </div>`;
  view.querySelector('[data-edit]').onclick = () => contactModal(c);
  view.querySelector('[data-act]').onclick = () => activityModal({ defaults: { type: 'llamada', subject: `Llamar a ${c.name.split(' ')[0]}`, contactId: id, companyId: c.companyId } });
  view.querySelector('[data-enroll]').onclick = () => {
    const sid = view.querySelector('[data-seq]').value;
    if (!sid) return;
    db.update('sequences', sid, s => ({ enrolled: [...s.enrolled, { contactId: id, step: 0, startedAt: new Date().toISOString(), done: false }] }));
    db.log('secuencia', `Inscribió a ${c.name} en una secuencia`, user.id);
    toast('Contacto inscrito en la secuencia', 'success');
  };
  view.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!await confirm(`¿Eliminar a ${c.name}?`, { danger: true, ok: 'Eliminar' })) return;
    db.query('deals', d => d.contactId === id).forEach(d => db.update('deals', d.id, { contactId: null }));
    db.remove('contacts', id); db.log('contacto', `Eliminó el contacto ${c.name}`, user.id); toast('Contacto eliminado', 'success'); location.hash = '#/contactos';
  });
}
