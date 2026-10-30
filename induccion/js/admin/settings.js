// Sitio y configuración: CMS del sitio público, parámetros del sistema y restablecimiento de datos.
import { pageHead, panel, escape, toast, confirm } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { site } from '../data/model.js';
import { SITE_DEFAULT } from '../data/seed.js';

const F = [
  ['heroEyebrow', 'Antetítulo del hero'], ['heroTitle', 'Título del hero'], ['heroHighlight', 'Título destacado (2ª línea)'], ['heroText', 'Texto del hero', 'textarea'], ['ctaText', 'Texto del botón principal'],
  ['announcement', 'Texto del aviso superior'], ['faena', 'Nombre de la faena'], ['contactEmail', 'Correo de contacto'], ['contactPhone', 'Teléfono de contacto'],
  ['signer', 'Firmante del certificado'], ['signerRole', 'Cargo del firmante'], ['reminderDays', 'Días de aviso antes del vencimiento', 'number']
];

export function renderSettings(el, _p, ctx) {
  const s = site();
  const field = ([k, l, t]) => `<div class="field ${t === 'textarea' || k === 'heroText' ? 'ak-full' : ''}"><label for="s-${k}">${l}</label>${t === 'textarea' ? `<textarea class="textarea" id="s-${k}" name="${k}">${escape(s[k])}</textarea>` : `<input class="input" id="s-${k}" name="${k}" type="${t || 'text'}" value="${escape(s[k])}">`}</div>`;
  el.innerHTML = pageHead('Sitio y configuración', 'Los cambios se publican al instante en el sitio público (ábrelo en otra pestaña para verlo).', '<a class="btn" href="index.html" target="_blank" rel="noopener">🌐 Ver sitio</a>') +
    `<form class="stack" data-form>
      ${panel('Portada del sitio público', `<div class="ak-form">${F.slice(0, 5).map(field).join('')}</div>`)}
      ${panel('Aviso superior', `<div class="ak-form"><label class="check ak-full"><input type="checkbox" name="announcementOn" ${s.announcementOn ? 'checked' : ''}> Mostrar aviso en el sitio público</label>${field(F[5])}</div>`)}
      ${panel('Datos generales y certificado', `<div class="ak-form">${F.slice(6).map(field).join('')}</div>`)}
      <div class="row"><button class="btn btn-primary">💾 Guardar y publicar</button><button class="btn btn-ghost" type="button" data-default>Restaurar textos por defecto</button></div>
    </form>
    ${panel('Zona de datos', `<p class="muted">Restablece la base de datos de demostración (trabajadores, planes, intentos, certificados y configuración).</p><button class="btn btn-danger" data-reset2>↺ Restablecer datos demo</button>`)}`;
  const form = el.querySelector('[data-form]');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = { ...s };
    F.forEach(([k, , t]) => { v[k] = t === 'number' ? Math.max(1, +form[k].value || 60) : form[k].value.trim(); });
    v.announcementOn = form.announcementOn.checked;
    if (!v.heroTitle) return toast('El título del hero es obligatorio', 'warning');
    db.setValue('site', v); db.log('sitio actualizado', 'Contenido del sitio público', ctx.user.id); toast('Cambios publicados en el sitio', 'success');
  });
  el.querySelector('[data-default]').onclick = async () => { if (await confirm('¿Restaurar los textos originales del sitio?')) { db.setValue('site', { ...SITE_DEFAULT }); db.log('sitio restaurado', 'Textos por defecto', ctx.user.id); toast('Textos restaurados', 'success'); } };
  el.querySelector('[data-reset2]').onclick = () => document.querySelector('[data-reset]').click();
}
