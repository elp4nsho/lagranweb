// CMS del sitio público: portada, banners, cursos destacados, aviso y parámetros comerciales.
import { pageHead, panel, escape, toast, confirm, formDialog } from '../shared/admin-kit.js';
import { uid } from '../../../assets/core/db.js';
import { db } from '../data/db.js';
import { site } from '../data/model.js';
import { SITE_DEFAULT, TONES } from '../data/seed.js';

export function renderSite(el, _p, ctx) {
  const s = site();
  const pub = db.query('courses', c => c.status === 'publicado');
  const save = (patch, msg = 'Cambios publicados en el sitio') => { db.setValue('site', { ...site(), ...patch }); db.log('sitio actualizado', Object.keys(patch).join(', '), ctx.user.id); toast(msg, 'success'); };
  const fld = (k, l, t = 'text', full) => `<div class="field ${full ? 'ak-full' : ''}"><label for="s-${k}">${l}</label>${t === 'textarea' ? `<textarea class="textarea" id="s-${k}" name="${k}">${escape(s[k])}</textarea>` : `<input class="input" id="s-${k}" name="${k}" type="${t}" value="${escape(s[k])}">`}</div>`;
  el.innerHTML = pageHead('Sitio (CMS)', 'Todo lo que cambies aquí se ve al instante en la portada pública.', '<a class="btn" href="index.html" target="_blank" rel="noopener">🌐 Ver sitio</a>') +
    `<form data-hero>${panel('Portada', `<div class="ak-form">${fld('heroEyebrow', 'Antetítulo')}${fld('heroTitle', 'Título')}${fld('heroHighlight', 'Título destacado')}${fld('ctaText', 'Texto del botón de búsqueda')}${fld('heroText', 'Texto', 'textarea', true)}
      <label class="check ak-full"><input type="checkbox" name="announcementOn" ${s.announcementOn ? 'checked' : ''}> Mostrar aviso superior</label>${fld('announcement', 'Aviso superior', 'text', true)}
      ${fld('supportEmail', 'Correo de soporte', 'email')}${fld('refundDays', 'Días para reembolso', 'number')}${fld('commission', 'Comisión de la plataforma (%)', 'number')}</div><div class="row" style="margin-top:14px"><button class="btn btn-primary">💾 Guardar portada</button></div>`)}</form>` +
    panel('Banners promocionales (carrusel)', `<ol class="ak-order">${(s.banners || []).map((b, i) => `<li><span class="num">${i + 1}</span><div class="grow"><b>${escape(b.title)}</b> ${b.active === false ? '<span class="badge">Oculto</span>' : ''}<br><small class="muted">${escape(b.text)} · ${escape(b.cta)} → ${escape(b.href)}</small></div>
      <button class="btn btn-sm btn-ghost" data-bup="${i}" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button class="btn btn-sm btn-ghost" data-bdown="${i}" ${i < s.banners.length - 1 ? '' : 'disabled'} aria-label="Bajar">↓</button><button class="btn btn-sm btn-ghost" data-bedit="${i}">✎</button><button class="btn btn-sm btn-ghost ak-danger" data-brm="${i}" aria-label="Eliminar">✕</button></li>`).join('') || '<li class="muted">Sin banners.</li>'}</ol>`, '<button class="btn btn-sm" data-badd>＋ Banner</button>') +
    `<form data-feat>${panel('Cursos destacados en portada', `<div class="ak-multi">${pub.map(c => `<label class="check"><input type="checkbox" name="f" value="${c.id}" ${s.featuredIds.includes(c.id) ? 'checked' : ''}> ${escape(c.emoji)} ${escape(c.title)}</label>`).join('')}</div><div class="row" style="margin-top:14px"><button class="btn btn-primary">💾 Guardar destacados</button></div>`)}</form>` +
    panel('Restablecer', '<div class="row"><button class="btn btn-ghost" data-def>Restaurar textos por defecto</button><button class="btn btn-danger" data-reset2>↺ Restablecer datos demo</button></div>');
  el.querySelector('[data-hero]').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    if (!f.heroTitle.value.trim()) return toast('El título es obligatorio', 'warning');
    const c = +f.commission.value; if (c < 0 || c > 90) return toast('Comisión entre 0 y 90%', 'warning');
    save({ heroEyebrow: f.heroEyebrow.value.trim(), heroTitle: f.heroTitle.value.trim(), heroHighlight: f.heroHighlight.value.trim(), heroText: f.heroText.value.trim(), ctaText: f.ctaText.value.trim() || 'Buscar', announcementOn: f.announcementOn.checked, announcement: f.announcement.value.trim(), supportEmail: f.supportEmail.value.trim(), refundDays: Math.max(0, +f.refundDays.value || 0), commission: c });
  });
  el.querySelector('[data-feat]').addEventListener('submit', e => {
    e.preventDefault();
    const ids = [...e.target.querySelectorAll('input:checked')].map(i => i.value);
    if (ids.length < 3) return toast('Elige al menos 3 cursos destacados', 'warning');
    db.all('courses').forEach(c => { if (!!c.featured !== ids.includes(c.id)) db.update('courses', c.id, { featured: ids.includes(c.id) }); });
    save({ featuredIds: ids }, 'Destacados actualizados');
  });
  const bannerForm = b => formDialog({ title: b ? 'Editar banner' : 'Nuevo banner', values: b || { tone: 'primary', active: true, href: '#/cursos' }, fields: [{ name: 'title', label: 'Título', required: true }, { name: 'text', label: 'Texto', required: true }, { name: 'cta', label: 'Texto del botón', required: true, half: true }, { name: 'href', label: 'Enlace', required: true, half: true, help: 'Ej: #/cursos?cat=diseno' }, { name: 'tone', label: 'Color', type: 'select', options: TONES, half: true }, { name: 'active', label: 'Visible', type: 'checkbox' }] });
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const list = [...(site().banners || [])];
    if ('badd' in b.dataset) { const v = await bannerForm(); if (v) save({ banners: [...list, { id: uid('b'), ...v }] }, 'Banner agregado'); }
    if (b.dataset.bedit) { const i = +b.dataset.bedit, v = await bannerForm(list[i]); if (v) { list[i] = { ...list[i], ...v }; save({ banners: list }, 'Banner actualizado'); } }
    if (b.dataset.bup) { const i = +b.dataset.bup; [list[i - 1], list[i]] = [list[i], list[i - 1]]; save({ banners: list }, 'Orden actualizado'); }
    if (b.dataset.bdown) { const i = +b.dataset.bdown; [list[i + 1], list[i]] = [list[i], list[i + 1]]; save({ banners: list }, 'Orden actualizado'); }
    if (b.dataset.brm) { if (await confirm('¿Eliminar el banner?', { danger: true, ok: 'Eliminar' })) { list.splice(+b.dataset.brm, 1); save({ banners: list }, 'Banner eliminado'); } }
    if ('def' in b.dataset) { if (await confirm('¿Restaurar textos, banners y destacados por defecto?')) save({ ...SITE_DEFAULT }, 'Contenido restaurado'); }
    if ('reset2' in b.dataset) document.querySelector('[data-reset]').click();
  });
}
