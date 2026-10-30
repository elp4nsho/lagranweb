// CMS del sitio de empleos + restablecer datos demo.
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { pageHead } from './common.js';

export function render(el, ctx) {
  const { db } = ctx, s = db.getValue('site', {});
  el.innerHTML = `${pageHead('Sitio de empleos', 'Textos del sitio público de empleos. Se publican al instante.', '<a class="btn btn-ghost" href="index.html" target="_blank" rel="noopener">↗ Ver sitio</a>')}
    <div class="dash-grid">
      <form class="card span-8 stack" data-site>
        <div class="field"><label for="s-t">Título principal</label><input class="input" id="s-t" name="heroTitle" value="${escape(s.heroTitle || '')}"></div>
        <div class="field"><label for="s-s">Bajada</label><textarea class="textarea" id="s-s" name="heroSubtitle" rows="2">${escape(s.heroSubtitle || '')}</textarea></div>
        <div class="field"><label for="s-a">Quiénes somos</label><textarea class="textarea" id="s-a" name="about" rows="3">${escape(s.about || '')}</textarea></div>
        <div class="field"><label for="s-b">Beneficios (uno por línea)</label><textarea class="textarea" id="s-b" name="benefits" rows="5">${escape((s.benefits || []).join('\n'))}</textarea></div>
        <div class="field"><label for="s-v">Valores (uno por línea)</label><textarea class="textarea" id="s-v" name="values" rows="3">${escape((s.values || []).join('\n'))}</textarea></div>
        <div class="field"><label for="s-c">Correo de contacto</label><input class="input" id="s-c" name="contact" type="email" value="${escape(s.contact || '')}"></div>
        <div><button class="btn btn-primary" type="submit">Guardar y publicar</button></div>
      </form>
      <div class="span-4 stack"><div class="card reset-box stack"><h3>Restablecer datos demo</h3><p class="muted small" style="margin:0">Vuelve colaboradores, liquidaciones, solicitudes, vacantes, candidatos, encuestas, usuarios y textos a su estado inicial. Se cierra tu sesión.</p><button class="btn btn-danger" type="button" data-reset>Restablecer datos demo</button></div></div>
    </div>`;
  el.querySelector('[data-site]').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, lines = t => t.split('\n').map(x => x.trim()).filter(Boolean);
    if (!f.heroTitle.value.trim()) return toast('El título no puede quedar vacío', 'warning');
    db.setValue('site', { ...s, heroTitle: f.heroTitle.value.trim(), heroSubtitle: f.heroSubtitle.value.trim(), about: f.about.value.trim(), benefits: lines(f.benefits.value), values: lines(f.values.value), contact: f.contact.value.trim() });
    db.log('ajustes', 'Actualizó los textos del sitio de empleos', ctx.user.id);
    toast('Sitio de empleos actualizado', 'success');
  });
  el.querySelector('[data-reset]').onclick = async () => {
    if (!(await confirm('Se perderán todos los cambios hechos en esta demo. ¿Continuar?', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true }))) return;
    db.reset(); try { localStorage.removeItem('lgw:session:rrhh'); } catch (err) { /* */ }
    toast('Datos restablecidos', 'success'); setTimeout(() => location.replace('login.html'), 600);
  };
}
