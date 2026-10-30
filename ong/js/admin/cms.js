// Sitio (CMS): textos del inicio, cifras de impacto, montos sugeridos y datos de contacto.
import { db, site } from '../data/db.js';
import { pageHead } from '../shared/admin-kit.js';
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { SITE_SEED } from '../data/seed.js';

const inp = (n, l, v, a = '') => `<div class="field"><label for="s-${n}">${l}</label><input class="input" id="s-${n}" name="${n}" value="${escape(v ?? '')}" ${a}></div>`;
const area = (n, l, v) => `<div class="field"><label for="s-${n}">${l}</label><textarea class="textarea" id="s-${n}" name="${n}" style="min-height:80px">${escape(v ?? '')}</textarea></div>`;

function render(view, ctx) {
  const s = site();
  view.innerHTML = `${pageHead('Sitio (CMS)', 'Los cambios se publican al instante en el sitio público.', '<a class="btn" href="index.html" target="_blank" rel="noopener">Ver sitio ↗</a><button class="btn btn-ghost" data-restore>Restaurar textos</button>')}
    <form class="stack" id="siteForm" novalidate>
      <div class="split" style="align-items:start">
        <div class="card stack"><h3 style="margin:0">Portada</h3>
          ${inp('heroEyebrow', 'Antetítulo', s.heroEyebrow)}${inp('heroTitle', 'Título principal', s.heroTitle, 'required')}${area('heroText', 'Texto de portada', s.heroText)}${area('mission', 'Misión (pie de página)', s.mission)}</div>
        <div class="card stack"><h3 style="margin:0">Cifras de impacto</h3>
          ${s.impact.map((i, k) => `<div class="cms-item"><div class="row"><input class="input ico" name="ico${k}" value="${escape(i.icon)}" aria-label="Ícono ${k + 1}"><input class="input" name="val${k}" value="${escape(i.value)}" aria-label="Cifra ${k + 1}" style="max-width:120px"><input class="input" name="lab${k}" value="${escape(i.label)}" aria-label="Etiqueta ${k + 1}"></div></div>`).join('')}</div>
      </div>
      <div class="split" style="align-items:start">
        <div class="card stack"><h3 style="margin:0">Donaciones</h3>
          ${inp('presetsOnce', 'Montos sugeridos donación única (separados por coma)', s.presetsOnce.join(', '))}
          ${inp('presetsMonthly', 'Montos sugeridos mensual', s.presetsMonthly.join(', '))}
          ${area('monthlyPitch', 'Texto para socios mensuales', s.monthlyPitch)}
          ${inp('overheadGoal', 'Meta de gasto indirecto (%)', s.overheadGoal, 'type="number" min="0" max="100"')}
          ${inp('certificateNote', 'Nota al pie del certificado', s.certificateNote)}</div>
        <div class="card stack"><h3 style="margin:0">Contacto</h3>
          ${inp('contactEmail', 'Correo', s.contactEmail, 'type="email"')}${inp('phone', 'Teléfono', s.phone)}${inp('address', 'Dirección', s.address)}</div>
      </div>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-primary btn-lg" type="submit">Guardar y publicar</button></div>
    </form>`;
  const f = view.querySelector('#siteForm');
  f.onsubmit = e => {
    e.preventDefault();
    const g = n => f.elements[n].value.trim();
    const nums = n => g(n).split(',').map(x => Math.round(+x.replace(/\D/g, ''))).filter(x => x >= 1000).slice(0, 6);
    if (!g('heroTitle')) return toast('El título no puede quedar vacío', 'warning');
    const once = nums('presetsOnce'), monthly = nums('presetsMonthly');
    if (once.length < 2 || monthly.length < 2) return toast('Indica al menos 2 montos sugeridos de $1.000 o más', 'warning');
    db.setValue('site', { ...s, heroEyebrow: g('heroEyebrow'), heroTitle: g('heroTitle'), heroText: g('heroText'), mission: g('mission'),
      impact: s.impact.map((_, k) => ({ icon: g('ico' + k), value: g('val' + k), label: g('lab' + k) })),
      presetsOnce: once, presetsMonthly: monthly, monthlyPitch: g('monthlyPitch'), overheadGoal: +g('overheadGoal') || 15, certificateNote: g('certificateNote'),
      contactEmail: g('contactEmail'), phone: g('phone'), address: g('address') });
    db.log('Sitio actualizado', 'Textos y configuración del sitio público', ctx.user.id);
    toast('Sitio actualizado', 'success');
  };
  view.onclick = async e => {
    if (e.target.closest('[data-restore]') && await confirm('¿Restaurar todos los textos del sitio a los originales?', { ok: 'Restaurar' })) {
      db.setValue('site', SITE_SEED()); db.log('Sitio actualizado', 'Textos restaurados', ctx.user.id); toast('Textos restaurados', 'success'); render(view, ctx);
    }
  };
}

export default { id: 'sitio', label: 'Sitio (CMS)', ico: '🖋️', group: 'Comunicación', roles: ['admin', 'coordinador'], live: false, render };
