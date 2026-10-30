// CMS: portada, contacto, condiciones comerciales, secciones visibles, auto del hero, testimonios y preguntas frecuentes.
import { escape, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { carArt, BODY_LABEL } from '../shared/car-art.js';

export default {
  id: 'contenido', label: 'Contenido del sitio', icon: '📝', group: 'Sistema', roles: ['admin'],
  watch: ['testimonials', 'faqs'],
  render(el, ctx) {
    const s = db.getValue('settings', {});
    const f = (k, l, type = 'text') => `<div class="field"><label for="cm-${k}">${l}</label>${type === 'textarea' ? `<textarea class="textarea" id="cm-${k}" name="${k}" style="min-height:80px">${escape(s[k] ?? '')}</textarea>` : `<input class="input" id="cm-${k}" name="${k}" type="${type}" value="${escape(s[k] ?? '')}">`}</div>`;
    const sw = (k, l) => `<label class="check"><input type="checkbox" name="${k}" ${s[k] ? 'checked' : ''}> ${l}</label>`;
    el.innerHTML = `${pageHead('Contenido del sitio', 'Los cambios se ven al instante en el sitio público (abre otra pestaña para comprobarlo)', '<a class="btn btn-sm" href="index.html" target="_blank" rel="noopener">Ver sitio ↗</a>')}
      <form class="grid-2" id="cms" novalidate style="align-items:start">
        <div class="card stack"><h3 style="margin:0">Portada</h3>${f('name', 'Nombre de la automotora')}${f('tagline', 'Bajada')}${f('heroTitle', 'Título principal')}${f('heroText', 'Texto de portada', 'textarea')}${f('announcement', 'Anuncio superior (vacío = oculto)')}
          <div class="grid-2"><div class="field"><label for="cm-body">Auto del hero</label><select class="select" id="cm-body" name="heroBody">${Object.entries(BODY_LABEL).map(([k, l]) => `<option value="${k}" ${s.heroCar?.body === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><label for="cm-col">Color</label><input class="input" id="cm-col" type="color" name="heroColor" value="${escape(s.heroCar?.color || '#8a8f93')}"></div></div><div class="car-frame" data-prev>${carArt(s.heroCar || {})}</div></div>
        <div class="stack"><div class="card stack"><h3 style="margin:0">Contacto</h3>${f('phone', 'Teléfono')}${f('whatsapp', 'WhatsApp')}${f('email', 'Correo', 'email')}${f('address', 'Dirección')}${f('hours', 'Horario')}</div>
          <div class="card stack"><h3 style="margin:0">Condiciones y secciones</h3><div class="grid-2">${f('deposit', 'Abono de reserva (CLP)', 'number')}${f('reserveDays', 'Días de reserva', 'number')}${f('warrantyMonths', 'Garantía (meses)', 'number')}${f('baseRate', 'Tasa mensual referencial (%)', 'number')}${f('minPie', 'Pie mínimo (%)', 'number')}${f('shipping', 'Despacho tienda (CLP)', 'number')}</div>
            ${sw('showPlans', 'Mostrar planes de mantención')}${sw('showStore', 'Mostrar tienda')}${sw('showTestimonials', 'Mostrar testimonios')}</div>
          <button class="btn btn-primary btn-lg">Guardar y publicar</button></div>
      </form>
      <div class="grid-2" style="align-items:start">
        <div class="card stack"><div class="row between"><h3 style="margin:0">Testimonios</h3><button class="btn btn-sm" data-addt>+ Agregar</button></div>${db.all('testimonials').map(t => `<div class="row between" style="gap:8px;border-bottom:1px solid var(--line);padding-bottom:8px"><span class="grow"><b>${escape(t.name)}</b> <small class="muted">${escape(t.city)} · ${'★'.repeat(t.rating)}</small><small class="d-block muted">${escape(t.text.slice(0, 90))}…</small></span><label class="switch"><input type="checkbox" data-tact="${t.id}" ${t.active ? 'checked' : ''} aria-label="Visible"><span></span></label><button class="btn btn-sm btn-ghost" data-edt="${t.id}">Editar</button><button class="btn btn-sm btn-ghost" data-delt="${t.id}" aria-label="Eliminar">🗑</button></div>`).join('')}</div>
        <div class="card stack"><div class="row between"><h3 style="margin:0">Preguntas frecuentes</h3><button class="btn btn-sm" data-addf>+ Agregar</button></div>${db.all('faqs').map(q => `<div class="row between" style="gap:8px;border-bottom:1px solid var(--line);padding-bottom:8px"><span class="grow"><b>${escape(q.q)}</b></span><label class="switch"><input type="checkbox" data-fact="${q.id}" ${q.active ? 'checked' : ''} aria-label="Visible"><span></span></label><button class="btn btn-sm btn-ghost" data-edf="${q.id}">Editar</button><button class="btn btn-sm btn-ghost" data-delf="${q.id}" aria-label="Eliminar">🗑</button></div>`).join('')}</div>
      </div>`;
    const form = el.querySelector('#cms');
    form.addEventListener('input', e => { if (['heroBody', 'heroColor'].includes(e.target.name)) el.querySelector('[data-prev]').innerHTML = carArt({ body: form.elements.heroBody.value, color: form.elements.heroColor.value }); });
    form.addEventListener('change', e => { if (e.target.name === 'heroBody') el.querySelector('[data-prev]').innerHTML = carArt({ body: form.elements.heroBody.value, color: form.elements.heroColor.value }); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const g = n => form.elements[n];
      if (!g('name').value.trim() || !g('heroTitle').value.trim()) { toast('Nombre y título son obligatorios', 'warning'); return; }
      const next = { ...s };
      ['name', 'tagline', 'heroTitle', 'heroText', 'announcement', 'phone', 'whatsapp', 'email', 'address', 'hours'].forEach(k => { next[k] = g(k).value.trim(); });
      ['deposit', 'reserveDays', 'warrantyMonths', 'baseRate', 'minPie', 'shipping'].forEach(k => { next[k] = Math.max(0, +g(k).value || 0); });
      if (next.minPie < 5 || next.minPie > 70 || next.baseRate <= 0) { toast('Revisa tasa y pie mínimo', 'warning'); return; }
      ['showPlans', 'showStore', 'showTestimonials'].forEach(k => { next[k] = g(k).checked; });
      next.heroCar = { ...(s.heroCar || {}), body: g('heroBody').value, color: g('heroColor').value };
      db.setValue('settings', next); db.log('contenido', 'Contenido del sitio actualizado', ctx.user.id); toast('Publicado en el sitio', 'success');
    });
    const editT = async t => { const v = await formModal({ title: t ? 'Editar testimonio' : 'Nuevo testimonio', fields: [{ name: 'name', label: 'Nombre', required: true, value: t?.name }, { name: 'city', label: 'Ciudad', required: true, value: t?.city }, { name: 'rating', label: 'Estrellas (1–5)', type: 'number', value: t?.rating || 5 }, { name: 'text', label: 'Testimonio', type: 'textarea', required: true, value: t?.text }, { name: 'active', label: 'Visible', type: 'checkbox', value: t ? t.active : true }] }); if (!v) return; v.rating = Math.min(5, Math.max(1, Math.round(v.rating || 5))); t ? db.update('testimonials', t.id, v) : db.insert('testimonials', v); db.log('contenido', `Testimonio ${t ? 'editado' : 'agregado'}: ${v.name}`, ctx.user.id); toast('Testimonio guardado', 'success'); };
    const editF = async q => { const v = await formModal({ title: q ? 'Editar pregunta' : 'Nueva pregunta', fields: [{ name: 'q', label: 'Pregunta', required: true, value: q?.q }, { name: 'a', label: 'Respuesta', type: 'textarea', required: true, value: q?.a }, { name: 'active', label: 'Visible', type: 'checkbox', value: q ? q.active : true }] }); if (!v) return; q ? db.update('faqs', q.id, v) : db.insert('faqs', v); db.log('contenido', `Pregunta frecuente ${q ? 'editada' : 'agregada'}`, ctx.user.id); toast('Pregunta guardada', 'success'); };
    el.addEventListener('click', async e => {
      const a = x => e.target.closest(`[${x}]`)?.getAttribute(x);
      let id;
      if (e.target.closest('[data-addt]')) return editT(null);
      if (e.target.closest('[data-addf]')) return editF(null);
      if ((id = a('data-edt'))) return editT(db.get('testimonials', id));
      if ((id = a('data-edf'))) return editF(db.get('faqs', id));
      if ((id = a('data-delt')) && await confirm('¿Eliminar testimonio?', { danger: true, ok: 'Eliminar' })) { db.remove('testimonials', id); toast('Eliminado', 'success'); }
      if ((id = a('data-delf')) && await confirm('¿Eliminar pregunta?', { danger: true, ok: 'Eliminar' })) { db.remove('faqs', id); toast('Eliminada', 'success'); }
    });
    el.addEventListener('change', e => { const t = e.target.closest('[data-tact]'), q = e.target.closest('[data-fact]'); if (t) db.update('testimonials', t.dataset.tact, { active: t.checked }); if (q) db.update('faqs', q.dataset.fact, { active: q.checked }); });
  }
};
