// Empresas: CRUD con filtros y ficha con sus contactos, negocios y actividad.
import { db, auth } from '../data/db.js';
import { escape, money, date, ago, toast, confirm, dataTable } from '../../../assets/core/ui.js';
import { INDUSTRIES, SIZES, CITIES, OPEN_STAGES } from '../shared/constants.js';
import { can, seesAll, canSeeDeal } from '../shared/perms.js';
import { userName, userChip, sellers, exportCSV, avatar, moneyShort } from '../shared/util.js';
import { pageHead, openForm, field, opt, stageBadge, dealModal, actIcon } from './components.js';
import { contactModal } from './contacts.js';
import { icon } from '../shared/icons.js';

const state = { industry: '', city: '' };

export function render(view, ctx) {
  if (ctx.params.id) return renderDetail(view, ctx.params.id, ctx.user);
  const deals = db.all('deals');
  const rows = db.query('companies', c => (!state.industry || c.industry === state.industry) && (!state.city || c.city === state.city)).map(c => {
    const ds = deals.filter(d => d.companyId === c.id);
    return { ...c, owner: userName(c.ownerId), contacts: db.count('contacts', x => x.companyId === c.id), openValue: ds.filter(d => OPEN_STAGES.includes(d.stage)).reduce((s, d) => s + d.amount, 0), won: ds.filter(d => d.stage === 'ganado').reduce((s, d) => s + d.amount, 0) };
  });
  view.innerHTML = `
    ${pageHead('Empresas', `${rows.length} cuentas`, `${can('export') ? `<button class="btn" data-export>${icon('upload', 16)} Exportar CSV</button>` : ''}<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva empresa</button>`)}
    <div class="card stack">
      <div class="row filters">
        <select class="select select-sm" data-ind aria-label="Industria"><option value="">Todas las industrias</option>${INDUSTRIES.map(i => opt(i, i, state.industry)).join('')}</select>
        <select class="select select-sm" data-city aria-label="Ciudad"><option value="">Todas las ciudades</option>${CITIES.map(i => opt(i, i, state.city)).join('')}</select>
      </div>
      <div data-table></div>
    </div>`;
  dataTable(view.querySelector('[data-table]'), {
    rows, pageSize: 12, search: c => `${c.name} ${c.rut} ${c.industry} ${c.city}`,
    columns: [
      { key: 'name', label: 'Empresa', render: c => `<a href="#/empresas/${c.id}"><b>${escape(c.name)}</b></a><br><small class="muted">${escape(c.rut || '')}</small>` },
      { key: 'industry', label: 'Industria' },
      { key: 'city', label: 'Ciudad' },
      { key: 'contacts', label: 'Contactos' },
      { key: 'openValue', label: 'Pipeline', render: c => c.openValue ? moneyShort(c.openValue) : '—' },
      { key: 'won', label: 'Ganado', render: c => c.won ? moneyShort(c.won) : '—' },
      { key: 'owner', label: 'Responsable', render: c => userChip(c.ownerId) }
    ],
    onRow: c => { location.hash = `#/empresas/${c.id}`; }
  });
  view.querySelector('[data-ind]').onchange = e => { state.industry = e.target.value; render(view, ctx); };
  view.querySelector('[data-city]').onchange = e => { state.city = e.target.value; render(view, ctx); };
  view.querySelector('[data-new]').onclick = () => companyModal();
  view.querySelector('[data-export]')?.addEventListener('click', () => exportCSV('empresas.csv', rows.map(c => ({ empresa: c.name, rut: c.rut, industria: c.industry, ciudad: c.city, tamano: c.size, web: c.website, telefono: c.phone, contactos: c.contacts, pipeline: c.openValue, ganado: c.won, responsable: c.owner }))));
}

export function companyModal(company = null, onSaved) {
  const user = auth.current();
  const c = company || { name: '', rut: '', industry: INDUSTRIES[0], city: 'Santiago', size: '11-50', website: '', phone: '', ownerId: user.id };
  openForm({
    title: company ? 'Editar empresa' : 'Nueva empresa',
    body: `${field('Razón social *', `<input class="input" name="name" value="${escape(c.name)}" required>`)}
      <div class="grid-2">
        ${field('RUT', `<input class="input" name="rut" value="${escape(c.rut || '')}" placeholder="76.123.456-7">`)}
        ${field('Industria', `<select class="select" name="industry">${INDUSTRIES.map(i => opt(i, i, c.industry)).join('')}</select>`)}
        ${field('Ciudad', `<select class="select" name="city">${CITIES.map(i => opt(i, i, c.city)).join('')}</select>`)}
        ${field('Tamaño', `<select class="select" name="size">${SIZES.map(i => opt(i, i + ' personas', c.size)).join('')}</select>`)}
        ${field('Sitio web', `<input class="input" name="website" value="${escape(c.website || '')}">`)}
        ${field('Teléfono', `<input class="input" name="phone" value="${escape(c.phone || '')}">`)}
      </div>
      ${field('Responsable', `<select class="select" name="ownerId">${(seesAll() ? sellers() : [user]).map(u => opt(u.id, u.name, c.ownerId)).join('')}</select>`)}`,
    onSubmit: (f, v) => {
      const dup = db.find('companies', x => x.name.toLowerCase() === v.name.trim().toLowerCase() && x.id !== company?.id);
      if (dup) { toast('Ya existe una empresa con ese nombre', 'warning'); return false; }
      const patch = { name: v.name.trim(), rut: v.rut.trim(), industry: v.industry, city: v.city, size: v.size, website: v.website.trim(), phone: v.phone.trim(), ownerId: v.ownerId };
      const saved = company ? db.update('companies', company.id, patch) : db.insert('companies', patch);
      db.log('empresa', `${company ? 'Editó' : 'Creó'} la empresa ${patch.name}`, user.id);
      toast(company ? 'Empresa actualizada' : 'Empresa creada', 'success');
      onSaved && onSaved(saved);
    }
  });
}

function renderDetail(view, id, user) {
  const c = db.get('companies', id);
  if (!c) { view.innerHTML = '<div class="card empty"><h2>Empresa no encontrada</h2><a class="btn" href="#/empresas">Volver</a></div>'; return; }
  const contacts = db.query('contacts', x => x.companyId === id);
  const deals = db.query('deals', d => d.companyId === id);
  const mine = deals.filter(d => canSeeDeal(d, user));
  const acts = db.query('activities', a => a.companyId === id && a.done && a.type !== 'sistema' && (!a.dealId || mine.some(d => d.id === a.dealId))).sort((a, b) => b.dueAt.localeCompare(a.dueAt)).slice(0, 12);
  const won = deals.filter(d => d.stage === 'ganado').reduce((s, d) => s + d.amount, 0);
  view.innerHTML = `
    <a class="btn btn-ghost btn-sm back" href="#/empresas">${icon('back', 16)} Empresas</a>
    ${pageHead(c.name, `${escape(c.industry)} · ${escape(c.city)} · ${escape(c.size)} personas`, `<button class="btn" data-edit>${icon('edit', 16)} Editar</button>${can('deals.delete') ? `<button class="btn btn-ghost" data-del aria-label="Eliminar empresa">${icon('trash', 16)}</button>` : ''}<button class="btn btn-primary" data-deal>${icon('plus', 16)} Negocio</button>`)}
    <div class="grid-4">
      <div class="card kpi"><div class="stat"><span class="label">Contactos</span><span class="value">${contacts.length}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Negocios abiertos</span><span class="value">${deals.filter(d => OPEN_STAGES.includes(d.stage)).length}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Ganado histórico</span><span class="value">${moneyShort(won)}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Cliente desde</span><span class="value small-value">${date(c.createdAt, { month: 'short', year: 'numeric' })}</span></div></div>
    </div>
    <div class="detail-grid">
      <div class="stack" style="min-width:0">
        <section class="card stack">
          <div class="row between"><h3 style="margin:0">Negocios</h3></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Negocio</th><th>Etapa</th><th>Monto</th><th>Ejecutivo</th></tr></thead><tbody>
            ${deals.map(d => `<tr><td>${canSeeDeal(d, user) ? `<a href="#/negocios/${d.id}"><b>${escape(d.title)}</b></a>` : `<b>${escape(d.title)}</b> <small class="muted">(de otro ejecutivo)</small>`}</td><td>${stageBadge(d.stage)}</td><td>${money(d.amount)}</td><td>${avatar(db.get('users', d.ownerId), 24)}</td></tr>`).join('') || '<tr><td colspan="4"><div class="empty small">Sin negocios</div></td></tr>'}
          </tbody></table></div>
        </section>
        <section class="card stack">
          <h3 style="margin:0">Actividad reciente</h3>
          <div class="timeline">${acts.map(a => `<div class="timeline-item">${actIcon(a.type)}<div style="min-width:0"><b>${escape(a.subject)}</b><br><small class="muted">${ago(a.dueAt)} · ${escape(userName(a.ownerId))}</small></div></div>`).join('') || '<div class="empty small">Sin actividad</div>'}</div>
        </section>
      </div>
      <aside class="stack">
        <section class="card stack">
          <h3 style="margin:0">Datos</h3>
          <ul class="kv small"><li><span>RUT</span><b>${escape(c.rut || '—')}</b></li><li><span>Web</span><b class="trunc">${escape(c.website || '—')}</b></li><li><span>Teléfono</span><b>${escape(c.phone || '—')}</b></li><li><span>Responsable</span>${userChip(c.ownerId, 22)}</li></ul>
        </section>
        <section class="card stack">
          <div class="row between"><h3 style="margin:0">Contactos</h3><button class="btn btn-sm" data-addc>${icon('plus', 14)} Agregar</button></div>
          ${contacts.map(x => `<a class="contact-row" href="#/contactos/${x.id}">${avatar({ name: x.name, color: '#475569' }, 32)}<span style="min-width:0"><b>${escape(x.name)}</b><small class="muted trunc">${escape(x.title || '')} · ${escape(x.email)}</small></span></a>`).join('') || '<div class="empty small">Sin contactos</div>'}
        </section>
      </aside>
    </div>`;
  view.querySelector('[data-edit]').onclick = () => companyModal(c);
  view.querySelector('[data-deal]').onclick = () => dealModal({ defaults: { companyId: id, title: `${c.name} · ` }, onSaved: d => { location.hash = `#/negocios/${d.id}`; } });
  view.querySelector('[data-addc]').onclick = () => contactModal(null, { companyId: id });
  view.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (deals.length) return toast('No puedes eliminar una empresa con negocios asociados', 'warning');
    if (!await confirm(`¿Eliminar ${c.name} y sus ${contacts.length} contactos?`, { danger: true, ok: 'Eliminar' })) return;
    contacts.forEach(x => db.remove('contacts', x.id));
    db.remove('companies', id);
    db.log('empresa', `Eliminó la empresa ${c.name}`, user.id);
    toast('Empresa eliminada', 'success');
    location.hash = '#/empresas';
  });
}
