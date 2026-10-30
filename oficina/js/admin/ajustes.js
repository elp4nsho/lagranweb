// Ajustes / CMS del sitio público y del kiosko + restablecer datos demo.
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { pageHead } from './common.js';

export function render(el, ctx) {
  const { db } = ctx, s = db.getValue('site', {});
  el.innerHTML = `${pageHead('Ajustes del sitio', 'Textos y opciones del directorio público y del kiosko. Los cambios se ven al instante.', '<a class="btn btn-ghost" href="index.html" target="_blank" rel="noopener">↗ Ver directorio</a>')}
    <div class="dash-grid">
      <form class="card span-8 stack" data-site>
        <h3>Directorio público</h3>
        <div class="field"><label for="s-ht">Título principal</label><input class="input" id="s-ht" name="heroTitle" value="${escape(s.heroTitle || '')}" required></div>
        <div class="field"><label for="s-hs">Bajada</label><textarea class="textarea" id="s-hs" name="heroSubtitle" rows="2">${escape(s.heroSubtitle || '')}</textarea></div>
        <label class="check"><input type="checkbox" name="showPhones" ${s.showPhones !== false ? 'checked' : ''}> Mostrar teléfonos móviles en el directorio público</label>
        <label class="check"><input type="checkbox" name="showOrg" ${s.showOrg !== false ? 'checked' : ''}> Mostrar organigrama público</label>
        <h3 style="margin-top:8px">Kiosko de recepción</h3>
        <div class="field"><label for="s-kw">Mensaje de bienvenida</label><input class="input" id="s-kw" name="kioskWelcome" value="${escape(s.kioskWelcome || '')}"></div>
        <div class="field"><label for="s-ks">Texto secundario</label><input class="input" id="s-ks" name="kioskSubtitle" value="${escape(s.kioskSubtitle || '')}"></div>
        <div class="field"><label for="s-wf">Wi-Fi de visitas (se imprime en la credencial)</label><input class="input" id="s-wf" name="wifi" value="${escape(s.wifi || '')}"></div>
        <div class="row"><button class="btn btn-primary" type="submit">Guardar ajustes</button><span class="muted small" data-saved></span></div>
      </form>
      <div class="stack span-4">
        <div class="card"><h3>Vista previa</h3><div class="card" style="box-shadow:none"><span class="eyebrow">Directorio</span><h2 data-prev-t style="font-size:24px;margin:6px 0">${escape(s.heroTitle || '')}</h2><p class="muted small" data-prev-s style="margin:0">${escape(s.heroSubtitle || '')}</p></div></div>
        <div class="card reset-box stack"><h3>Restablecer datos demo</h3><p class="muted small" style="margin:0">Vuelve todos los datos (empresas, planos, personas, reservas, visitas, usuarios y ajustes) a su estado inicial. Se cierra tu sesión.</p><button class="btn btn-danger" data-reset type="button">Restablecer datos demo</button></div>
      </div>
    </div>`;
  const f = el.querySelector('[data-site]');
  f.addEventListener('input', () => { el.querySelector('[data-prev-t]').textContent = f.heroTitle.value; el.querySelector('[data-prev-s]').textContent = f.heroSubtitle.value; });
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (!f.heroTitle.value.trim()) return toast('El título no puede quedar vacío', 'warning');
    db.setValue('site', { ...s, heroTitle: f.heroTitle.value.trim(), heroSubtitle: f.heroSubtitle.value.trim(), showPhones: f.showPhones.checked, showOrg: f.showOrg.checked, kioskWelcome: f.kioskWelcome.value.trim(), kioskSubtitle: f.kioskSubtitle.value.trim(), wifi: f.wifi.value.trim() });
    db.log('ajustes', 'Actualizó los textos del sitio y del kiosko', ctx.user.id);
    toast('Ajustes guardados y publicados', 'success');
  });
  el.querySelector('[data-reset]').onclick = async () => {
    if (!(await confirm('Se perderán todos los cambios hechos en esta demo. ¿Continuar?', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true }))) return;
    db.reset();
    try { localStorage.removeItem('lgw:session:oficina'); } catch (err) { /* */ }
    toast('Datos restablecidos', 'success');
    setTimeout(() => location.replace('login.html'), 600);
  };
}
