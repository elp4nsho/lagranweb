// Configuración del sitio (CMS): portada, proyecto educativo, contacto, admisión y aranceles.
import { escape, toast, confirm as ask } from '../../../assets/core/ui.js';
import { pageHead, formData } from '../shared/kit.js';
import { db, auth } from '../data/db.js';
import { GRADES_APPLY } from '../shared/school.js';

export async function resetDemo() {
  if (!await ask('Se borrarán todos los cambios y se cargarán nuevamente los datos de demostración. Tu sesión se mantiene si tu cuenta existe en la semilla.', { title: 'Restablecer datos demo', danger: true, ok: 'Restablecer' })) return;
  const me = auth.current();
  db.reset();
  db.log('sistema', 'Datos de demostración restablecidos', me && db.get('users', me.id) ? me.id : null);
  toast('Datos demo restablecidos', 'success');
  if (!auth.current()) location.replace('login.html');
}

export function render(el, { me }) {
  const st = db.getValue('site');
  const field = (name, label, val, type = 'text') => `<div class="field"><label for="st-${name}">${label}</label>${type === 'textarea' ? `<textarea class="textarea" id="st-${name}" name="${name}">${escape(val ?? '')}</textarea>` : `<input class="input" id="st-${name}" name="${name}" type="${type}" value="${escape(val ?? '')}">`}</div>`;
  el.innerHTML = `
    ${pageHead('Configuración del sitio', 'Los cambios se publican al instante en el sitio del colegio', `<a class="btn btn-ghost btn-sm" href="index.html" target="_blank">Ver sitio ↗</a>`)}
    <form class="stack" id="site-form" novalidate>
      <div class="card stack"><h3 class="mb-0">Portada</h3>
        <div class="form-grid">
          <div class="full">${field('heroTitle', 'Título principal', st.heroTitle)}</div>
          <div class="full">${field('heroSubtitle', 'Subtítulo', st.heroSubtitle, 'textarea')}</div>
          ${field('heroCta', 'Texto del botón', st.heroCta)}
          ${field('announcement', 'Barra de aviso (vacío = oculta)', st.announcement)}
          <label class="check"><input type="checkbox" name="showStats" ${st.showStats ? 'checked' : ''}> Mostrar cifras en la portada</label>
        </div></div>
      <div class="card stack"><h3 class="mb-0">Proyecto educativo</h3>
        <div class="form-grid">
          <div class="full">${field('mission', 'Misión', st.mission, 'textarea')}</div>
          <div class="full">${field('vision', 'Visión', st.vision, 'textarea')}</div>
          ${(st.values || []).map((v, i) => `<div class="field"><label for="st-vt${i}">Sello ${i + 1}</label><input class="input" id="st-vt${i}" name="vt${i}" value="${escape(v.title)}"><input class="input" name="vx${i}" value="${escape(v.text)}" aria-label="Descripción sello ${i + 1}"></div>`).join('')}
        </div></div>
      <div class="card stack"><h3 class="mb-0">Contacto</h3>
        <div class="form-grid">${field('name', 'Nombre del colegio', st.name)}${field('city', 'Comuna / ciudad', st.city)}${field('address', 'Dirección', st.address)}${field('phone', 'Teléfono', st.phone)}${field('email', 'Correo', st.email, 'email')}${field('hours', 'Horario de atención', st.hours)}</div></div>
      <div class="card stack"><h3 class="mb-0">Admisión y aranceles</h3>
        <div class="form-grid">
          <label class="check"><span class="switch"><input type="checkbox" name="admissionsOpen" ${st.admissionsOpen ? 'checked' : ''}><span></span></span> Postulaciones abiertas</label>
          ${field('admissionYear', 'Año de admisión', st.admissionYear, 'number')}
          ${field('monthlyFee', 'Mensualidad (CLP)', st.monthlyFee, 'number')}
          ${field('enrollmentFee', 'Matrícula (CLP)', st.enrollmentFee, 'number')}
        </div>
        <span class="label">Vacantes por curso</span>
        <div class="vac-grid">${GRADES_APPLY.map((g, i) => `<label class="vac" for="vac${i}"><span>${escape(g)}</span><input class="input" id="vac${i}" name="vac_${i}" type="number" min="0" value="${st.vacancies?.[g] ?? 0}" style="width:72px;min-height:34px;padding:4px 8px"></label>`).join('')}</div>
      </div>
      <div class="row between"><button type="button" class="btn btn-danger" data-reset>↺ Restablecer datos demo</button><button class="btn btn-primary btn-lg" type="submit">Guardar y publicar</button></div>
    </form>`;
  el.querySelector('#site-form').addEventListener('submit', e => {
    e.preventDefault();
    const v = formData(e.currentTarget);
    if (!v.heroTitle || !v.name) return toast('El nombre y el título no pueden quedar vacíos', 'warning');
    const next = {
      ...st, heroTitle: v.heroTitle, heroSubtitle: v.heroSubtitle, heroCta: v.heroCta, announcement: v.announcement, showStats: !!v.showStats,
      mission: v.mission, vision: v.vision, values: (st.values || []).map((x, i) => ({ title: v['vt' + i] || x.title, text: v['vx' + i] || x.text })),
      name: v.name, city: v.city, address: v.address, phone: v.phone, email: v.email, hours: v.hours,
      admissionsOpen: !!v.admissionsOpen, admissionYear: Number(v.admissionYear) || st.admissionYear, monthlyFee: Number(v.monthlyFee) || 0, enrollmentFee: Number(v.enrollmentFee) || 0,
      vacancies: Object.fromEntries(GRADES_APPLY.map((g, i) => [g, Math.max(0, Number(v['vac_' + i]) || 0)]))
    };
    db.setValue('site', next);
    db.log('sitio', 'Configuración del sitio actualizada', me.id);
    toast('Sitio actualizado. Los cambios ya están publicados.', 'success');
  });
  el.querySelector('[data-reset]').onclick = resetDemo;
}
