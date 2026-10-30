// Correo: plantillas con variables, secuencias (cadencias simuladas) y bandeja de enviados.
import { db, auth } from '../data/db.js';
import { escape, date, dateTime, toast, confirm, dataTable, modal, norm, pct } from '../../../assets/core/ui.js';
import { can, seesAll, visibleActs } from '../shared/perms.js';
import { userName, companyName, fillTemplate, DAY } from '../shared/util.js';
import { pageHead, openForm, field, opt } from './components.js';
import { icon } from '../shared/icons.js';

export function render(view, ctx) {
  const tab = ctx.params.tab || 'plantillas';
  view.innerHTML = `
    ${pageHead('Correo y secuencias', 'Envíos simulados: nada sale de tu navegador')}
    <div class="tabs" role="tablist">${[['plantillas', 'Plantillas'], ['secuencias', 'Secuencias'], ['enviados', 'Enviados']].map(([k, l]) => `<a class="tab ${tab === k ? 'active' : ''}" role="tab" aria-selected="${tab === k}" href="#/correo/${k}">${l}</a>`).join('')}</div>
    <div data-pane></div>`;
  const pane = view.querySelector('[data-pane]');
  ({ plantillas: templates, secuencias: sequences, enviados: sent }[tab] || templates)(pane, ctx.user);
}

// ---------- Plantillas ----------
function templates(pane, user) {
  const edit = can('templates.edit');
  const list = db.all('templates');
  pane.innerHTML = `<div class="row between"><p class="muted" style="margin:0">Variables disponibles: <code>{{nombre}}</code> <code>{{empresa}}</code> <code>{{ejecutivo}}</code></p>${edit ? `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva plantilla</button>` : ''}</div>
    <div class="grid-auto">${list.map(t => `<article class="card stack tpl-card">
      <div class="row between"><span class="badge plain">${escape(t.category || 'General')}</span><small class="muted">${db.count('activities', a => a.templateId === t.id)} envíos</small></div>
      <h3 style="margin:0">${escape(t.name)}</h3>
      <p class="muted small" style="margin:0"><b>Asunto:</b> ${escape(t.subject)}</p>
      <p class="small tpl-body">${escape(t.body)}</p>
      <div class="row" style="gap:6px;margin-top:auto"><button class="btn btn-sm" data-preview="${t.id}">Vista previa</button>${edit ? `<button class="btn btn-sm" data-edit="${t.id}">${icon('edit', 14)} Editar</button><button class="btn btn-sm btn-ghost" data-del="${t.id}" aria-label="Eliminar plantilla">${icon('trash', 14)}</button>` : ''}</div>
    </article>`).join('') || '<div class="empty">Sin plantillas</div>'}</div>`;
  pane.querySelector('[data-new]')?.addEventListener('click', () => templateModal());
  pane.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => templateModal(db.get('templates', b.dataset.edit)));
  pane.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const t = db.get('templates', b.dataset.del);
    if (db.all('sequences').some(s => s.steps.some(st => st.templateId === t.id))) return toast('La plantilla se usa en una secuencia', 'warning');
    if (await confirm(`¿Eliminar la plantilla "${t.name}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('templates', t.id); db.log('plantilla', `Eliminó la plantilla ${t.name}`, user.id); toast('Plantilla eliminada', 'success'); }
  });
  pane.querySelectorAll('[data-preview]').forEach(b => b.onclick = () => {
    const t = db.get('templates', b.dataset.preview);
    const sample = { contact: { name: 'Francisca Morales' }, company: { name: 'Viña Los Aromos' }, user };
    modal({ title: 'Vista previa', size: 'lg', body: `<div class="mail-preview"><div class="mail-meta"><span class="muted">Para:</span> francisca@vinalosaromos.cl<br><span class="muted">Asunto:</span> <b>${escape(fillTemplate(t.subject, sample))}</b></div><div class="mail-text">${escape(fillTemplate(t.body, sample))}</div></div>` });
  });
}
function templateModal(t = null) {
  const user = auth.current();
  openForm({
    title: t ? 'Editar plantilla' : 'Nueva plantilla', size: 'lg',
    body: `<div class="grid-2">${field('Nombre *', `<input class="input" name="name" value="${escape(t?.name || '')}" required>`)}${field('Categoría', `<select class="select" name="category">${['Prospección', 'Seguimiento', 'Propuesta', 'Nutrición', 'Cierre'].map(c => opt(c, c, t?.category)).join('')}</select>`)}</div>
      ${field('Asunto *', `<input class="input" name="subject" value="${escape(t?.subject || '')}" required>`)}
      ${field('Cuerpo *', `<textarea class="textarea" name="body" style="min-height:200px" required>${escape(t?.body || 'Hola {{nombre}}:\n\n\n\nSaludos,\n{{ejecutivo}}')}</textarea>`)}
      <small class="muted">Usa {{nombre}}, {{empresa}} y {{ejecutivo}} para personalizar.</small>`,
    onSubmit: (f, v) => {
      const patch = { name: v.name.trim(), category: v.category, subject: v.subject.trim(), body: v.body };
      t ? db.update('templates', t.id, patch) : db.insert('templates', patch);
      db.log('plantilla', `${t ? 'Editó' : 'Creó'} la plantilla ${patch.name}`, user.id);
      toast('Plantilla guardada', 'success');
    }
  });
}

// ---------- Secuencias ----------
function sequences(pane, user) {
  const edit = can('templates.edit');
  const list = db.all('sequences');
  pane.innerHTML = `<div class="row between"><p class="muted" style="margin:0">Cadencias de correos que avanzan solas. Pulsa “Procesar envíos” para simular el paso del tiempo.</p>${edit ? `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva secuencia</button>` : ''}</div>
  <div class="stack">${list.map(s => {
    const active = s.enrolled.filter(e => !e.done).length;
    return `<article class="card stack">
      <div class="row between"><div class="row" style="gap:10px"><h3 style="margin:0">${escape(s.name)}</h3><span class="badge ${s.active ? 'badge-success' : 'plain'}">${s.active ? 'Activa' : 'Pausada'}</span></div>
        <div class="row" style="gap:6px">${edit ? `<label class="switch" title="Activar/pausar"><input type="checkbox" data-toggle="${s.id}" ${s.active ? 'checked' : ''} aria-label="Activar secuencia"><span></span></label>` : ''}
          <button class="btn btn-sm" data-enroll="${s.id}">Inscribir contactos</button>
          <button class="btn btn-sm btn-primary" data-run="${s.id}" ${s.active ? '' : 'disabled'}>${icon('play', 14)} Procesar envíos</button>
          ${edit ? `<button class="btn btn-sm btn-ghost" data-edit="${s.id}" aria-label="Editar secuencia">${icon('edit', 14)}</button>` : ''}</div></div>
      <div class="seq-steps">${s.steps.map((st, i) => `<div class="seq-step"><span class="seq-n">${i + 1}</span><div><b>Día ${st.day}</b><br><small class="muted">${escape(db.get('templates', st.templateId)?.name || 'Plantilla eliminada')}</small></div></div>`).join('<span class="seq-arrow">→</span>')}</div>
      <div class="grid-4 seq-stats">
        <div class="stat"><span class="label">Inscritos activos</span><span class="value">${active}</span></div>
        <div class="stat"><span class="label">Enviados</span><span class="value">${s.sent || 0}</span></div>
        <div class="stat"><span class="label">Apertura</span><span class="value">${pct(s.sent ? s.opens / s.sent * 100 : 0)}</span></div>
        <div class="stat"><span class="label">Respuesta</span><span class="value">${pct(s.sent ? s.replies / s.sent * 100 : 0)}</span></div>
      </div>
      <details><summary class="small">Ver inscritos (${s.enrolled.length})</summary>
        <div class="table-wrap" style="margin-top:10px"><table class="table"><thead><tr><th>Contacto</th><th>Empresa</th><th>Progreso</th><th>Inicio</th></tr></thead><tbody>
        ${s.enrolled.map(e => { const c = db.get('contacts', e.contactId); return c ? `<tr><td><a href="#/contactos/${c.id}">${escape(c.name)}</a></td><td>${escape(companyName(c.companyId))}</td><td>${e.done ? '<span class="badge badge-success">Completada</span>' : `Paso ${Math.min(e.step + 1, s.steps.length)} de ${s.steps.length}`}</td><td>${date(e.startedAt)}</td></tr>` : ''; }).join('')}
        </tbody></table></div></details>
    </article>`;
  }).join('')}</div>`;
  pane.querySelector('[data-new]')?.addEventListener('click', () => sequenceModal());
  pane.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => sequenceModal(db.get('sequences', b.dataset.edit)));
  pane.querySelectorAll('[data-toggle]').forEach(c => c.onchange = () => { db.update('sequences', c.dataset.toggle, { active: c.checked }); toast(c.checked ? 'Secuencia activada' : 'Secuencia pausada', 'success'); });
  pane.querySelectorAll('[data-run]').forEach(b => b.onclick = () => runSequence(b.dataset.run, user));
  pane.querySelectorAll('[data-enroll]').forEach(b => b.onclick = () => enrollModal(b.dataset.enroll, user));
}
function runSequence(id, user) {
  const s = db.get('sequences', id);
  let sent = 0, opens = 0;
  const enrolled = s.enrolled.map(e => {
    if (e.done) return e;
    const st = s.steps[e.step];
    const tpl = st && db.get('templates', st.templateId);
    const c = db.get('contacts', e.contactId);
    if (!tpl || !c) return { ...e, done: true };
    const company = db.get('companies', c.companyId);
    const owner = db.get('users', c.ownerId) || user;
    const opened = Math.random() < .55;
    const deal = db.find('deals', d => d.contactId === c.id && !d.closedAt);
    db.insert('activities', { type: 'email', subject: fillTemplate(tpl.subject, { contact: c, company, user: owner }), body: fillTemplate(tpl.body, { contact: c, company, user: owner }), to: c.email, contactId: c.id, companyId: c.companyId, dealId: deal?.id || null, ownerId: owner.id, done: true, dueAt: new Date().toISOString(), doneAt: new Date().toISOString(), reminded: true, opened, templateId: tpl.id, sequenceId: s.id, auto: true });
    sent++; if (opened) opens++;
    const step = e.step + 1;
    return { ...e, step, done: step >= s.steps.length };
  });
  if (!sent) return toast('No hay envíos pendientes en esta secuencia', 'info');
  db.update('sequences', id, { enrolled, sent: (s.sent || 0) + sent, opens: (s.opens || 0) + opens, replies: (s.replies || 0) + Math.round(sent * Math.random() * .15) });
  db.log('secuencia', `Procesó "${s.name}": ${sent} correos enviados`, user.id);
  toast(`${sent} correos enviados · ${opens} abiertos`, 'success');
}
function enrollModal(id, user) {
  const s = db.get('sequences', id);
  const contacts = db.query('contacts', c => !s.enrolled.some(e => e.contactId === c.id) && (seesAll(user) || c.ownerId === user.id));
  const m = modal({
    title: `Inscribir en “${s.name}”`, size: 'lg',
    body: `<input class="input" type="search" placeholder="Buscar contacto…" data-q style="margin-bottom:12px"><div class="check-list" data-list>${contacts.map(c => `<label class="check" data-name="${escape(norm(c.name + ' ' + companyName(c.companyId)))}"><input type="checkbox" value="${c.id}"> ${escape(c.name)} <small class="muted">· ${escape(companyName(c.companyId))}</small></label>`).join('') || '<div class="empty small">Todos tus contactos ya están inscritos</div>'}</div>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Inscribir seleccionados</button>'
  });
  m.el.querySelector('[data-q]').oninput = e => { const q = norm(e.target.value); m.el.querySelectorAll('[data-name]').forEach(l => { l.hidden = q && !l.dataset.name.includes(q); }); };
  m.el.querySelector('[data-ok]').onclick = () => {
    const ids = [...m.el.querySelectorAll('input[type=checkbox]:checked')].map(i => i.value);
    if (!ids.length) return toast('Selecciona al menos un contacto', 'warning');
    db.update('sequences', id, x => ({ enrolled: [...x.enrolled, ...ids.map(cid => ({ contactId: cid, step: 0, startedAt: new Date().toISOString(), done: false }))] }));
    db.log('secuencia', `Inscribió ${ids.length} contactos en "${s.name}"`, user.id);
    toast(`${ids.length} contactos inscritos`, 'success');
    m.close();
  };
}
function sequenceModal(s = null) {
  const user = auth.current();
  const tpls = db.all('templates');
  const steps = s ? s.steps.map(x => ({ ...x })) : [{ day: 0, templateId: tpls[0]?.id }];
  const stepsHtml = () => steps.map((st, i) => `<div class="row step-row" data-i="${i}" style="gap:8px;flex-wrap:nowrap"><span class="seq-n">${i + 1}</span><input class="input select-sm num-in" type="number" min="0" value="${st.day}" data-f="day" aria-label="Día"><select class="select select-sm" data-f="templateId" aria-label="Plantilla">${tpls.map(t => opt(t.id, t.name, st.templateId)).join('')}</select><button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm="${i}" aria-label="Quitar paso">${icon('x', 14)}</button></div>`).join('');
  openForm({
    title: s ? 'Editar secuencia' : 'Nueva secuencia', size: 'lg',
    body: `${field('Nombre *', `<input class="input" name="name" value="${escape(s?.name || '')}" required>`)}<div class="field"><label>Pasos (día desde la inscripción → plantilla)</label><div class="stack" style="gap:8px" data-steps>${stepsHtml()}</div><button type="button" class="btn btn-sm" data-add style="align-self:flex-start">${icon('plus', 14)} Agregar paso</button></div>`,
    extraFoot: s ? '<button type="button" class="btn btn-danger" data-delseq style="margin-right:auto">Eliminar</button>' : '',
    onOpen: (f, m) => {
      const box = f.querySelector('[data-steps]');
      const sync = () => box.querySelectorAll('[data-i]').forEach(r => { const st = steps[+r.dataset.i]; st.day = +r.querySelector('[data-f=day]').value || 0; st.templateId = r.querySelector('[data-f=templateId]').value; });
      f.querySelector('[data-add]').onclick = () => { sync(); steps.push({ day: (steps.at(-1)?.day || 0) + 3, templateId: tpls[0]?.id }); box.innerHTML = stepsHtml(); };
      box.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b && steps.length > 1) { sync(); steps.splice(+b.dataset.rm, 1); box.innerHTML = stepsHtml(); } });
      box.addEventListener('change', sync);
      m.el.querySelector('[data-delseq]')?.addEventListener('click', async () => { if (await confirm('¿Eliminar la secuencia?', { danger: true, ok: 'Eliminar' })) { db.remove('sequences', s.id); toast('Secuencia eliminada', 'success'); m.close(); } });
    },
    onSubmit: (f, v) => {
      f.querySelectorAll('[data-i]').forEach(r => { const st = steps[+r.dataset.i]; st.day = +r.querySelector('[data-f=day]').value || 0; st.templateId = r.querySelector('[data-f=templateId]').value; });
      steps.sort((a, b) => a.day - b.day);
      if (s) db.update('sequences', s.id, { name: v.name.trim(), steps });
      else db.insert('sequences', { name: v.name.trim(), steps, active: true, enrolled: [], sent: 0, opens: 0, replies: 0 });
      db.log('secuencia', `${s ? 'Editó' : 'Creó'} la secuencia ${v.name.trim()}`, user.id);
      toast('Secuencia guardada', 'success');
    }
  });
}

// ---------- Enviados ----------
function sent(pane, user) {
  const list = visibleActs(user).filter(a => a.type === 'email').sort((a, b) => b.dueAt.localeCompare(a.dueAt)).map(a => ({ ...a, owner: userName(a.ownerId), company: companyName(a.companyId), status: a.opened ? 1 : 0 }));
  const last30 = list.filter(a => new Date(a.dueAt) > Date.now() - 30 * DAY);
  pane.innerHTML = `<div class="grid-3">
      <div class="card kpi"><div class="stat"><span class="label">Enviados (30 días)</span><span class="value">${last30.length}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Tasa de apertura</span><span class="value">${pct(last30.length ? last30.filter(a => a.opened).length / last30.length * 100 : 0)}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Automáticos</span><span class="value">${last30.filter(a => a.auto).length}</span></div></div>
    </div><div class="card" data-table></div>`;
  dataTable(pane.querySelector('[data-table]'), {
    rows: list, pageSize: 12, search: a => `${a.subject} ${a.company} ${a.owner} ${a.to || ''}`,
    columns: [
      { key: 'subject', label: 'Asunto', render: a => `<b>${escape(a.subject)}</b><br><small class="muted">${escape(a.to || a.company)}</small>` },
      { key: 'company', label: 'Empresa' },
      { key: 'owner', label: 'Remitente' },
      { key: 'dueAt', label: 'Fecha', render: a => dateTime(a.dueAt) },
      { key: 'status', label: 'Estado', render: a => `<span class="badge ${a.opened ? 'badge-success' : 'plain'}">${a.opened ? 'Abierto' : 'Enviado'}</span>${a.auto ? ' <span class="badge badge-info plain">Auto</span>' : ''}` }
    ],
    onRow: a => modal({ title: a.subject, size: 'lg', body: `<div class="mail-preview"><div class="mail-meta"><span class="muted">De:</span> ${escape(a.owner)}<br><span class="muted">Para:</span> ${escape(a.to || '—')}<br><span class="muted">Fecha:</span> ${dateTime(a.dueAt)}</div><div class="mail-text">${escape(a.body || '')}</div></div>${a.dealId ? `<a class="btn" href="#/negocios/${a.dealId}" data-close>Ir al negocio</a>` : ''}` })
  });
}
