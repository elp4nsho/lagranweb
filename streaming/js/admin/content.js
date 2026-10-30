// Textos de la landing pública (CMS): título, bajada, días de prueba y pie de página.
import { db, settings } from '../data/db.js';
import { html, raw, $, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';

export function render(el, { user }) {
  const s = settings();
  el.innerHTML = html`${raw(pageHead('Landing y textos', 'Contenido de la página pública de suscripción.', '<a class="btn" href="index.html" target="_blank">Abrir landing ↗</a>'))}
    <form class="card stack" id="cms" style="max-width:760px">
      <div class="field"><label for="heroTitle">Título principal</label><input class="input" id="heroTitle" value="${s.heroTitle}"></div>
      <div class="field"><label for="heroSubtitle">Bajada</label><textarea class="textarea" id="heroSubtitle">${s.heroSubtitle}</textarea></div>
      <div class="grid-2"><div class="field"><label for="trialDays">Días de prueba gratis</label><input class="input" type="number" min="0" max="60" id="trialDays" value="${s.trialDays}"></div>
      <div class="field"><label for="footerNote">Nota del pie de página</label><input class="input" id="footerNote" value="${s.footerNote}"></div></div>
      <button class="btn btn-primary" style="align-self:flex-start">Publicar cambios</button></form>`;
  $('#cms').addEventListener('submit', e => {
    e.preventDefault();
    const v = { heroTitle: $('#heroTitle').value.trim(), heroSubtitle: $('#heroSubtitle').value.trim(), trialDays: Math.max(0, +$('#trialDays').value || 0), footerNote: $('#footerNote').value.trim() };
    if (!v.heroTitle) return toast('El título no puede quedar vacío', 'warning');
    db.setValue('settings', { ...settings(), ...v });
    db.log('landing', `Landing actualizada: "${v.heroTitle}"`, user.id);
    toast('Landing publicada', 'success');
  });
  return { static: true };
}
