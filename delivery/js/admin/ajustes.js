// Ajustes y CMS: textos del sitio público, contacto, FAQ, operación/simulación y datos demo.
import { db } from '../data/db.js';
import { html, raw, toast, confirm, escape } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import * as ops from '../shared/ops.js';

export function mountAjustes(el, ctx) {
  let s = JSON.parse(JSON.stringify(ops.settings()));
  const f = (k, label, type = 'text') => html`<div class="field"><label for="st-${k}">${label}</label>${type === 'textarea' ? raw(html`<textarea class="textarea" id="st-${k}" data-k="${k}" style="min-height:80px">${s[k] || ''}</textarea>`) : raw(html`<input class="input" id="st-${k}" data-k="${k}" type="${type}" value="${s[k] ?? ''}">`)}</div>`;
  function render() {
    el.innerHTML = html`${raw(pageHead('Ajustes y CMS', 'Lo que edites aquí cambia el sitio público al guardar.', '<a class="btn" href="index.html" target="_blank" rel="noopener">Ver sitio ↗</a><button class="btn btn-primary" data-save>Guardar cambios</button>'))}
    <div class="panel-grid"><div class="stack">
      <div class="card stack"><div class="card-title"><h3>Portada</h3></div>${raw(f('heroEyebrow', 'Antetítulo'))}${raw(f('heroTitle', 'Título principal'))}${raw(f('heroSubtitle', 'Bajada', 'textarea'))}${raw(f('heroCta', 'Texto del botón principal'))}</div>
      <div class="card stack"><div class="card-title"><h3>Anuncio superior</h3><label class="check"><span class="switch"><input type="checkbox" data-k="showAnnouncement" ${s.showAnnouncement ? 'checked' : ''}><span></span></span> Mostrar</label></div>${raw(f('announcement', 'Texto del anuncio'))}</div>
      <div class="card stack"><div class="card-title"><h3>Secciones</h3></div>${raw(f('businessTitle', 'Título empresas'))}${raw(f('businessText', 'Texto empresas', 'textarea'))}${raw(f('courierTitle', 'Título repartidores'))}${raw(f('courierText', 'Texto repartidores', 'textarea'))}</div>
      <div class="card stack"><div class="card-title"><h3>Preguntas frecuentes</h3><button class="btn btn-sm" data-addfaq>＋ Pregunta</button></div>
        ${(s.faqs || []).map((q, i) => raw(html`<div class="faq-edit stack"><div class="row" style="flex-wrap:nowrap"><input class="input grow" data-faq="${i}" data-fk="q" value="${q.q}" aria-label="Pregunta ${i + 1}"><button class="btn btn-sm btn-ghost" data-delfaq="${i}" aria-label="Eliminar pregunta">🗑</button></div><textarea class="textarea" data-faq="${i}" data-fk="a" style="min-height:60px" aria-label="Respuesta ${i + 1}">${q.a}</textarea></div>`))}</div>
    </div><div class="stack">
      <div class="card stack"><div class="card-title"><h3>Contacto</h3></div>${raw(f('phone', 'Teléfono'))}${raw(f('email', 'Correo', 'email'))}${raw(f('address', 'Dirección'))}${raw(f('hours', 'Horario'))}</div>
      <div class="card stack"><div class="card-title"><h3>Operación y simulación</h3></div>
        <label class="check"><span class="switch"><input type="checkbox" data-k="autoAssign" ${s.autoAssign ? 'checked' : ''}><span></span></span> Asignación automática al repartidor más cercano</label>
        <div class="field"><label for="st-offer">Segundos para aceptar una oferta</label><input class="input" id="st-offer" type="number" min="5" max="120" data-k="offerSeconds" value="${s.offerSeconds}"></div>
        <label class="check"><span class="switch"><input type="checkbox" data-k="simGenerate" ${s.simGenerate ? 'checked' : ''}><span></span></span> Generar pedidos simulados automáticamente</label>
        <div class="field"><label for="st-max">Máximo de envíos activos simulados</label><input class="input" id="st-max" type="number" min="2" max="40" data-k="simMaxActive" value="${s.simMaxActive}"></div>
        <div class="field"><label>Velocidad del reloj</label><div class="chips" data-speed>${[['p', 'Pausa'], ['1', '1×'], ['3', '3×'], ['10', '10×']].map(([k, l]) => raw(html`<button class="chip" data-sp="${k}">${l}</button>`))}</div></div></div>
      <div class="card stack"><div class="card-title"><h3>Datos de demostración</h3></div><p class="muted small" style="margin:0">Todo vive en el navegador (localStorage) y se comparte entre las pestañas abiertas del sitio, el portal, la app y esta consola.</p>
        <div class="row"><button class="btn" data-export>⇩ Respaldo JSON</button><button class="btn btn-danger" data-reset>Restablecer datos demo</button></div></div>
    </div></div>`;
    syncSpeed();
  }
  const syncSpeed = () => { const c = db.getValue('clock') || {}; el.querySelectorAll('[data-sp]').forEach(b => b.classList.toggle('active', c.paused ? b.dataset.sp === 'p' : b.dataset.sp === String(c.speed || 1))); };
  el.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k) s[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value;
    if (t.dataset.faq) s.faqs[+t.dataset.faq][t.dataset.fk] = t.value;
  });
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-save]')) {
      if (!s.heroTitle?.trim()) { toast('El título principal no puede quedar vacío', 'warning'); return; }
      s.faqs = (s.faqs || []).filter(q => q.q.trim());
      db.setValue('settings', { ...ops.settings(), ...s });
      db.log('cms', 'Contenido del sitio y ajustes actualizados', ctx.user.id);
      toast('Cambios guardados y publicados', 'success');
    }
    if (e.target.closest('[data-addfaq]')) { s.faqs = [...(s.faqs || []), { q: 'Nueva pregunta', a: 'Respuesta' }]; render(); }
    const d = e.target.closest('[data-delfaq]'); if (d) { s.faqs.splice(+d.dataset.delfaq, 1); render(); }
    const sp = e.target.closest('[data-sp]'); if (sp) { ops.setClock(sp.dataset.sp === 'p' ? { paused: true } : { speed: +sp.dataset.sp, paused: false }); db.log('simulación', `Reloj: ${sp.textContent}`, ctx.user.id); syncSpeed(); }
    if (e.target.closest('[data-export]')) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(db.export(), null, 1)], { type: 'application/json' }));
      a.download = `rayo-respaldo-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    if (e.target.closest('[data-reset]') && await confirm('Se borrarán todos los cambios y se regenerarán los datos de demostración (usuarios, envíos, tarifas, contenido). ¿Continuar?', { title: 'Restablecer datos demo', danger: true, ok: 'Restablecer' })) {
      const me = ctx.user.id;
      db.reset();
      if (!db.get('users', me)) { location.href = 'login.html'; return; }
      db.log('sistema', 'Datos de demostración restablecidos', me);
      toast('Datos restablecidos', 'success');
      setTimeout(() => location.reload(), 600);
    }
  });
  render();
  return { refresh: syncSpeed };
}
