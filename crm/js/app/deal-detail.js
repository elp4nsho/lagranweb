// Ficha del negocio: etapas, línea de tiempo, correos simulados, tareas, cotizador y archivos.
import { db, auth } from '../data/db.js';
import { escape, money, date, dateTime, ago, toast, confirm, modal } from '../../../assets/core/ui.js';
import { STAGES, stage, ACT_TYPES } from '../shared/constants.js';
import { can, canSeeDeal } from '../shared/perms.js';
import { userName, avatar, productName, quoteTotals, lineTotal, fillTemplate, fileSize, DAY } from '../shared/util.js';
import { pageHead, dealModal, changeStage, actIcon, activityModal, activityItem, wireActivityList, field, opt, openForm } from './components.js';
import { icon } from '../shared/icons.js';
import { notify } from '../shared/automation.js';

const ui = { tab: 'actividad', composer: 'nota', draft: {} };

export function render(view, ctx) {
  const user = ctx.user;
  const d = db.get('deals', ctx.params.id);
  if (!d || !canSeeDeal(d, user)) {
    view.innerHTML = `<div class="card empty"><span class="icon">${icon('shield', 40)}</span><h2>${d ? 'Este negocio pertenece a otro ejecutivo' : 'Negocio no encontrado'}</h2><a class="btn btn-primary" href="#/negocios">Volver a negocios</a></div>`;
    return;
  }
  if (ctx.query.tab) ui.tab = ctx.query.tab;
  if (ui.dealId !== d.id) { ui.dealId = d.id; ui.draft = { items: (d.items || []).map(x => ({ ...x })) }; if (!ctx.query.tab) ui.tab = 'actividad'; }
  const company = db.get('companies', d.companyId);
  const contact = db.get('contacts', d.contactId);
  const acts = db.query('activities', a => a.dealId === d.id);
  const tasks = acts.filter(a => a.type === 'tarea').sort((a, b) => Number(a.done) - Number(b.done) || a.dueAt.localeCompare(b.dueAt));
  const emails = acts.filter(a => a.type === 'email');
  const files = db.query('files', f => f.dealId === d.id);
  const quotes = db.query('quotes', q => q.dealId === d.id).sort((a, b) => b.number - a.number);
  const idx = STAGES.findIndex(s => s.id === d.stage);
  const lastChange = (d.history || []).at(-1);
  const daysInStage = lastChange ? Math.floor((Date.now() - new Date(lastChange.at)) / DAY) : 0;
  const probs = db.getValue('settings', {}).probabilities || {};

  view.innerHTML = `
    <a class="btn btn-ghost btn-sm back" href="#/negocios">${icon('back', 16)} Negocios</a>
    ${pageHead(d.title, `<a href="#/empresas/${d.companyId}">${escape(company?.name || '—')}</a> · ${money(d.amount)} · ${escape(userName(d.ownerId))}`, `
      <button class="btn" data-edit>${icon('edit', 16)} Editar</button>
      ${can('deals.delete') ? `<button class="btn btn-ghost" data-del aria-label="Eliminar negocio">${icon('trash', 16)}</button>` : ''}
      ${d.closedAt ? `<button class="btn" data-reopen>Reabrir</button>` : `<button class="btn btn-danger" data-lose>Perdido</button><button class="btn btn-primary" data-win>${icon('trophy', 16)} Ganado</button>`}`)}
    <div class="card stage-bar">
      <div class="stepper stepper-deal">${STAGES.filter(s => s.id !== 'perdido' || d.stage === 'perdido').map(s => {
        const i = STAGES.findIndex(x => x.id === s.id);
        const cls = d.stage === 'perdido' ? (s.id === 'perdido' ? 'on lost' : '') : i <= idx ? 'on' : '';
        return `<button class="step ${cls} ${s.id === d.stage ? 'current' : ''}" data-stage="${s.id}" ${s.id === d.stage ? 'aria-current="step"' : ''}>${s.name}</button>`;
      }).join('')}</div>
      <div class="row small muted" style="gap:18px;margin-top:10px">
        <span>${icon('clock', 14)} ${daysInStage} días en ${stage(d.stage).name}</span>
        <span>Probabilidad ${probs[d.stage] ?? stage(d.stage).prob}%</span>
        ${d.lostReason ? `<span class="badge badge-danger">Motivo: ${escape(d.lostReason)}</span>` : ''}
        ${d.closedAt ? `<span>Cerrado el ${date(d.closedAt)}</span>` : `<span>Cierre estimado ${date(d.closeDate)}</span>`}
      </div>
    </div>
    <div class="detail-grid">
      <div class="stack" style="min-width:0">
        <div class="tabs" role="tablist">
          ${[['actividad', 'Actividad', acts.filter(a => a.type !== 'tarea').length], ['tareas', 'Tareas', tasks.filter(t => !t.done).length], ['correo', 'Correos', emails.length], ['cotizacion', 'Cotización', quotes.length], ['archivos', 'Archivos', files.length]]
            .map(([k, l, c]) => `<button class="tab ${ui.tab === k ? 'active' : ''}" role="tab" aria-selected="${ui.tab === k}" data-tab="${k}">${l}${c ? ` <span class="tab-count">${c}</span>` : ''}</button>`).join('')}
        </div>
        <div data-pane></div>
      </div>
      <aside class="stack">
        <section class="card stack">
          <h3 style="margin:0">Detalles</h3>
          <ul class="kv small">
            <li><span>Monto</span><b>${money(d.amount)}</b></li>
            <li><span>Empresa</span><a href="#/empresas/${d.companyId}">${escape(company?.name || '—')}</a></li>
            <li><span>Industria</span><b>${escape(company?.industry || '—')}</b></li>
            <li><span>Origen</span><b>${escape(d.source || '—')}</b></li>
            <li><span>Creado</span><b>${date(d.createdAt)}</b></li>
            <li><span>Responsable</span><span class="user-chip">${avatar(db.get('users', d.ownerId), 22)}<span>${escape(userName(d.ownerId))}</span></span></li>
          </ul>
        </section>
        <section class="card stack">
          <h3 style="margin:0">Contacto principal</h3>
          ${contact ? `<div class="row" style="gap:10px;flex-wrap:nowrap">${avatar({ name: contact.name, color: '#475569' }, 38)}<div style="min-width:0"><a href="#/contactos/${contact.id}"><b>${escape(contact.name)}</b></a><br><small class="muted">${escape(contact.title || '')}</small></div></div>
            <ul class="kv small"><li><span>Correo</span><a href="mailto:${escape(contact.email)}" class="trunc">${escape(contact.email)}</a></li><li><span>Teléfono</span><b>${escape(contact.phone || '—')}</b></li></ul>
            <div class="row" style="gap:8px"><button class="btn btn-sm" data-quick="llamada">${icon('phone', 14)} Registrar llamada</button><button class="btn btn-sm" data-tab-go="correo">${icon('mail', 14)} Correo</button></div>` : '<p class="muted small">Sin contacto asociado. Edita el negocio para asignarlo.</p>'}
        </section>
        <section class="card stack">
          <h3 style="margin:0">Historial de etapas</h3>
          <ol class="history">${(d.history || []).map(h => `<li><b>${stage(h.stage).name}</b><small class="muted">${dateTime(h.at)}</small></li>`).reverse().join('')}</ol>
        </section>
      </aside>
    </div>`;

  const pane = view.querySelector('[data-pane]');
  const panes = { actividad: paneActivity, tareas: paneTasks, correo: paneEmail, cotizacion: paneQuote, archivos: paneFiles };
  (panes[ui.tab] || paneActivity)(pane, { d, acts, tasks, emails, files, quotes, contact, company, user });

  view.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { ui.tab = b.dataset.tab; render(view, { ...ctx, query: {} }); });
  view.querySelector('[data-tab-go]')?.addEventListener('click', e => { ui.tab = e.currentTarget.dataset.tabGo; render(view, { ...ctx, query: {} }); });
  view.querySelector('[data-quick]')?.addEventListener('click', () => { ui.tab = 'actividad'; ui.composer = 'llamada'; render(view, { ...ctx, query: {} }); view.querySelector('[data-composer] textarea')?.focus(); });
  view.querySelector('[data-edit]').onclick = () => dealModal({ deal: d });
  view.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => changeStage(d.id, b.dataset.stage));
  view.querySelector('[data-win]')?.addEventListener('click', () => changeStage(d.id, 'ganado'));
  view.querySelector('[data-lose]')?.addEventListener('click', () => changeStage(d.id, 'perdido'));
  view.querySelector('[data-reopen]')?.addEventListener('click', () => changeStage(d.id, 'negociacion'));
  view.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!await confirm(`¿Eliminar "${d.title}"? Se borrarán sus actividades y archivos.`, { danger: true, ok: 'Eliminar' })) return;
    db.query('activities', a => a.dealId === d.id).forEach(a => db.remove('activities', a.id));
    db.query('files', f => f.dealId === d.id).forEach(f => db.remove('files', f.id));
    db.remove('deals', d.id);
    db.log('negocio', `Eliminó el negocio "${d.title}"`, user.id);
    toast('Negocio eliminado', 'success');
    location.hash = '#/negocios';
  });
}

// ---------- Actividad ----------
function paneActivity(pane, { d, acts, user }) {
  const timeline = acts.filter(a => a.type !== 'tarea' || a.done).sort((a, b) => (b.doneAt || b.dueAt).localeCompare(a.doneAt || a.dueAt));
  pane.innerHTML = `
    <section class="card stack" data-composer>
      <div class="seg">${['nota', 'llamada', 'reunion'].map(t => `<button class="seg-btn ${ui.composer === t ? 'active' : ''}" data-ctype="${t}">${icon(ACT_TYPES[t].ico, 14)} ${ACT_TYPES[t].name}</button>`).join('')}</div>
      ${ui.composer !== 'nota' ? `<input class="input" data-csubject placeholder="${ui.composer === 'llamada' ? 'Resumen de la llamada' : 'Tema de la reunión'}">` : ''}
      <textarea class="textarea" data-cbody placeholder="${ui.composer === 'nota' ? 'Escribe una nota interna sobre el negocio…' : 'Resultado, acuerdos y próximos pasos…'}" style="min-height:80px"></textarea>
      <div class="row between"><small class="muted">Se registra con fecha de hoy a tu nombre.</small><button class="btn btn-primary btn-sm" data-csave>Guardar ${ACT_TYPES[ui.composer].name.toLowerCase()}</button></div>
    </section>
    <section class="card">
      <div class="timeline">${timeline.map(a => `
        <div class="timeline-item ${a.type === 'sistema' ? 'sys' : ''}">${actIcon(a.type)}
          <div style="min-width:0"><div class="row between" style="gap:8px"><b>${escape(a.subject)}</b><small class="muted" title="${dateTime(a.doneAt || a.dueAt)}">${ago(a.doneAt || a.dueAt)}</small></div>
          ${a.body ? `<p class="tl-body">${escape(a.body)}</p>` : ''}
          <small class="muted">${ACT_TYPES[a.type]?.name || ''} · ${escape(userName(a.ownerId))}${a.type === 'email' ? (a.opened ? ' · <span class="ok">abierto</span>' : ' · no abierto') : ''}${a.auto ? ' · automático' : ''}</small></div>
        </div>`).join('') || '<div class="empty small">Sin actividad todavía</div>'}</div>
    </section>`;
  pane.querySelectorAll('[data-ctype]').forEach(b => b.onclick = () => { ui.composer = b.dataset.ctype; paneActivity(pane, { d, acts, user }); });
  pane.querySelector('[data-csave]').onclick = () => {
    const body = pane.querySelector('[data-cbody]').value.trim();
    const subj = pane.querySelector('[data-csubject]')?.value.trim();
    if (!body && !subj) return toast('Escribe algo antes de guardar', 'warning');
    const now = new Date().toISOString();
    db.insert('activities', { type: ui.composer, subject: subj || (ui.composer === 'nota' ? 'Nota' : ACT_TYPES[ui.composer].name), body, dealId: d.id, companyId: d.companyId, contactId: d.contactId, ownerId: user.id, done: true, dueAt: now, doneAt: now, reminded: true });
    db.log('actividad', `Registró ${ACT_TYPES[ui.composer].name.toLowerCase()} en "${d.title}"`, user.id);
    toast(`${ACT_TYPES[ui.composer].name} registrada`, 'success');
  };
}

// ---------- Tareas ----------
function paneTasks(pane, { d, tasks }) {
  pane.innerHTML = `<section class="card stack">
    <div class="row between"><h3 style="margin:0">Tareas del negocio</h3><button class="btn btn-primary btn-sm" data-add>${icon('plus', 14)} Nueva tarea</button></div>
    <div class="act-list" data-list>${tasks.map(t => activityItem(t, { showDeal: false })).join('') || '<div class="empty small">Sin tareas. Agenda el próximo paso para no perder el negocio.</div>'}</div>
    <div class="row" style="gap:8px">${['Enviar propuesta', 'Llamar para seguimiento', 'Agendar demo', 'Solicitar orden de compra'].map(s => `<button class="chip" data-preset="${s}">+ ${s}</button>`).join('')}</div>
  </section>`;
  wireActivityList(pane.querySelector('[data-list]'));
  pane.querySelector('[data-add]').onclick = () => activityModal({ defaults: { type: 'tarea', dealId: d.id, ownerId: d.ownerId } });
  pane.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => activityModal({ defaults: { type: 'tarea', subject: b.dataset.preset, dealId: d.id, ownerId: d.ownerId } }));
}

// ---------- Correo simulado ----------
function paneEmail(pane, { d, emails, company, contact, user }) {
  const contacts = db.query('contacts', c => c.companyId === d.companyId);
  const tpls = db.all('templates');
  pane.innerHTML = `<section class="card stack" data-mail>
      <h3 style="margin:0">Nuevo correo</h3>
      <div class="grid-2">
        ${field('Para', `<select class="select" name="to">${contacts.map(c => opt(c.id, `${c.name} <${c.email}>`, d.contactId)).join('') || '<option value="">Sin contactos en la empresa</option>'}</select>`)}
        ${field('Plantilla', `<select class="select" name="tpl"><option value="">— Escribir desde cero —</option>${tpls.map(t => opt(t.id, t.name)).join('')}</select>`)}
      </div>
      ${field('Asunto', '<input class="input" name="subject" placeholder="Asunto del correo">')}
      ${field('Mensaje', '<textarea class="textarea" name="body" style="min-height:150px"></textarea>')}
      <div class="row between"><small class="muted">Envío simulado: quedará en la línea de tiempo y verás cuándo se abre.</small><button class="btn btn-primary" data-send>${icon('mail', 16)} Enviar</button></div>
    </section>
    <section class="card stack">
      <h3 style="margin:0">Enviados (${emails.length})</h3>
      ${emails.sort((a, b) => b.dueAt.localeCompare(a.dueAt)).map(e => `<details class="mail-item"><summary><span class="row between" style="gap:8px;flex:1"><b>${escape(e.subject)}</b><span class="badge ${e.opened ? 'badge-success' : 'plain'}">${e.opened ? 'Abierto' : 'Enviado'}</span></span><small class="muted">${dateTime(e.dueAt)} · ${escape(userName(e.ownerId))}</small></summary><p class="tl-body">${escape(e.body || '')}</p></details>`).join('') || '<div class="empty small">Aún no hay correos</div>'}
    </section>`;
  const box = pane.querySelector('[data-mail]');
  const get = n => box.querySelector(`[name="${n}"]`);
  get('tpl').onchange = () => {
    const t = db.get('templates', get('tpl').value);
    if (!t) return;
    const c = db.get('contacts', get('to').value) || contact;
    get('subject').value = fillTemplate(t.subject, { contact: c, company, user });
    get('body').value = fillTemplate(t.body, { contact: c, company, user });
  };
  box.querySelector('[data-send]').onclick = () => {
    const to = db.get('contacts', get('to').value);
    if (!to) return toast('Selecciona un destinatario', 'warning');
    if (!get('subject').value.trim()) { get('subject').classList.add('invalid'); return toast('Escribe un asunto', 'warning'); }
    const now = new Date().toISOString();
    const row = db.insert('activities', { type: 'email', subject: get('subject').value.trim(), body: get('body').value, to: to.email, contactId: to.id, dealId: d.id, companyId: d.companyId, ownerId: user.id, done: true, dueAt: now, doneAt: now, reminded: true, opened: false, templateId: get('tpl').value || null });
    db.log('correo', `Envió "${row.subject}" a ${to.name}`, user.id);
    toast(`Correo enviado a ${to.name}`, 'success');
    // Simula que el cliente abre el correo unos segundos después.
    setTimeout(() => {
      if (!db.get('activities', row.id)) return;
      db.update('activities', row.id, { opened: true });
      notify(user.id, `${to.name} abrió tu correo "${row.subject}"`, `app.html#/negocios/${d.id}?tab=correo`);
      toast(`${to.name.split(' ')[0]} abrió tu correo`, 'info');
    }, 5000);
  };
}

// ---------- Cotizador ----------
function paneQuote(pane, { d, quotes, user }) {
  const products = db.query('products', p => p.active !== false);
  const items = ui.draft.items;
  const t = quoteTotals(items);
  const dirty = JSON.stringify(items) !== JSON.stringify(d.items || []);
  pane.innerHTML = `<section class="card stack">
      <div class="row between"><h3 style="margin:0">Productos del negocio</h3>${dirty ? '<span class="badge badge-warning">Cambios sin guardar</span>' : ''}</div>
      <div class="table-wrap"><table class="table quote-table"><thead><tr><th>Producto</th><th>Cant.</th><th>Precio unit.</th><th>Desc. %</th><th>Total</th><th></th></tr></thead><tbody>
        ${items.map((it, i) => `<tr data-i="${i}">
          <td><select class="select select-sm" data-f="productId" aria-label="Producto">${products.concat(products.some(p => p.id === it.productId) ? [] : [{ id: it.productId, name: productName(it.productId) }]).map(p => opt(p.id, p.name, it.productId)).join('')}</select></td>
          <td><input class="input select-sm num-in" type="number" min="1" data-f="qty" value="${it.qty}" aria-label="Cantidad"></td>
          <td><input class="input select-sm money-in" type="number" min="0" step="1000" data-f="price" value="${it.price}" aria-label="Precio"></td>
          <td><input class="input select-sm num-in" type="number" min="0" max="100" data-f="discount" value="${it.discount || 0}" aria-label="Descuento"></td>
          <td class="nowrap"><b>${money(lineTotal(it))}</b></td>
          <td><button class="btn btn-ghost btn-icon btn-sm" data-rm="${i}" aria-label="Quitar línea">${icon('x', 14)}</button></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty small">Agrega productos del catálogo para armar la cotización</div></td></tr>'}
      </tbody></table></div>
      <div class="row between quote-foot">
        <button class="btn btn-sm" data-addline>${icon('plus', 14)} Agregar producto</button>
        <ul class="kv totals"><li><span>Neto</span><b>${money(t.net)}</b></li><li><span>IVA 19%</span><b>${money(t.iva)}</b></li><li class="grand"><span>Total</span><b>${money(t.total)}</b></li></ul>
      </div>
      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn" data-save ${dirty ? '' : 'disabled'}>Guardar en el negocio</button>
        <button class="btn btn-primary" data-gen ${items.length ? '' : 'disabled'}>${icon('print', 16)} Generar cotización</button>
      </div>
      <small class="muted">Al guardar, el monto del negocio pasa a ser el neto (${money(t.net)}).</small>
    </section>
    <section class="card stack">
      <h3 style="margin:0">Cotizaciones emitidas</h3>
      ${quotes.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>N°</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>${quotes.map(q => {
        const tt = quoteTotals(q.items);
        return `<tr><td>#${q.number}</td><td>${date(q.createdAt)}</td><td>${money(tt.total)}</td><td><select class="select select-sm" data-qstatus="${q.id}" aria-label="Estado de la cotización">${['borrador', 'enviada', 'aceptada', 'rechazada'].map(s => opt(s, s[0].toUpperCase() + s.slice(1), q.status)).join('')}</select></td><td><a class="btn btn-sm" href="quote.html?id=${q.id}" target="_blank" rel="noopener">${icon('ext', 14)} Ver</a></td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="empty small">Todavía no se emiten cotizaciones</div>'}
    </section>`;
  const rerender = () => paneQuote(pane, { d, quotes, user });
  pane.querySelector('tbody').addEventListener('change', e => {
    const tr = e.target.closest('tr[data-i]'); const f = e.target.dataset.f;
    if (!tr || !f) return;
    const it = items[+tr.dataset.i];
    if (f === 'productId') { it.productId = e.target.value; it.price = db.get('products', it.productId)?.price || it.price; }
    else it[f] = Math.max(0, +e.target.value || 0);
    if (f === 'discount') it.discount = Math.min(100, it.discount);
    rerender();
  });
  pane.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { items.splice(+b.dataset.rm, 1); rerender(); });
  pane.querySelector('[data-addline]').onclick = () => { const p = products[0]; items.push({ productId: p.id, qty: 1, price: p.price, discount: 0 }); rerender(); };
  const save = () => {
    db.update('deals', d.id, { items: items.map(x => ({ ...x })), amount: quoteTotals(items).net });
    db.log('negocio', `Actualizó la cotización de "${d.title}" (${money(quoteTotals(items).net)} neto)`, user.id);
  };
  pane.querySelector('[data-save]').onclick = () => { save(); toast('Productos guardados y monto actualizado', 'success'); };
  pane.querySelector('[data-gen]').onclick = () => {
    save();
    const number = db.getValue('quoteSeq', 1000) + 1;
    db.setValue('quoteSeq', number);
    const q = db.insert('quotes', { number, dealId: d.id, items: items.map(x => ({ ...x })), validDays: db.getValue('settings', {}).quoteValidity || 30, status: 'borrador', createdBy: user.id });
    db.insert('activities', { type: 'sistema', subject: `Cotización #${number} generada (${money(quoteTotals(items).total)} con IVA)`, dealId: d.id, companyId: d.companyId, ownerId: user.id, done: true, dueAt: q.createdAt, doneAt: q.createdAt, reminded: true });
    db.log('cotización', `Generó la cotización #${number} para "${d.title}"`, user.id);
    toast(`Cotización #${number} generada`, 'success');
    const w = window.open(`quote.html?id=${q.id}`, '_blank');
    if (!w) modal({ title: 'Cotización lista', body: `<p>Abre la vista imprimible:</p><a class="btn btn-primary" href="quote.html?id=${q.id}" target="_blank" rel="noopener">Abrir cotización #${number}</a>` });
  };
  pane.querySelectorAll('[data-qstatus]').forEach(s => s.onchange = () => { db.update('quotes', s.dataset.qstatus, { status: s.value }); toast('Estado de la cotización actualizado', 'success'); });
}

// ---------- Archivos (simulados: solo metadatos) ----------
function paneFiles(pane, { d, files, user }) {
  pane.innerHTML = `<section class="card stack">
    <label class="dropzone" data-dz>
      <input type="file" multiple data-file hidden>
      ${icon('upload', 28)}<b>Arrastra archivos o haz clic para adjuntar</b><small class="muted">Simulado: se guardan nombre, tamaño y autor (no el contenido)</small>
    </label>
    <div class="file-list">${files.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(f => `<div class="file-row">${icon('file', 20)}<div style="min-width:0;flex:1"><b class="trunc">${escape(f.name)}</b><small class="muted">${fileSize(f.size)} · ${escape(userName(f.uploadedBy))} · ${date(f.createdAt)}</small></div>
      <button class="btn btn-ghost btn-sm" data-dl="${f.id}">Descargar</button><button class="btn btn-ghost btn-icon btn-sm" data-rmf="${f.id}" aria-label="Eliminar archivo">${icon('trash', 14)}</button></div>`).join('') || '<div class="empty small">Sin archivos adjuntos</div>'}</div>
  </section>`;
  const add = list => {
    [...list].forEach(f => db.insert('files', { dealId: d.id, name: f.name, size: f.size || 1024, uploadedBy: user.id }));
    if (list.length) { db.log('archivo', `Adjuntó ${list.length} archivo(s) a "${d.title}"`, user.id); toast(`${list.length} archivo(s) adjuntado(s)`, 'success'); }
  };
  const dz = pane.querySelector('[data-dz]');
  pane.querySelector('[data-file]').onchange = e => add(e.target.files);
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); add(e.dataTransfer.files); });
  pane.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => toast('Descarga simulada: en esta demo no se guarda el contenido del archivo', 'info'));
  pane.querySelectorAll('[data-rmf]').forEach(b => b.onclick = async () => { if (await confirm('¿Eliminar este archivo?', { danger: true, ok: 'Eliminar' })) { db.remove('files', b.dataset.rmf); toast('Archivo eliminado', 'success'); } });
}
