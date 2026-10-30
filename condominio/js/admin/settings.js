// Configuración: datos de la comunidad, parámetros financieros y contenido del sitio público (CMS).
import { escape, toast, confirm, money } from '../../../assets/core/ui.js';
import { settings, saveSettings } from '../data/db.js';
import { pageHead } from '../shared/kit.js';

export function renderSettings(el, p, q, ctx) {
  const { db, user } = ctx, s = settings();
  const inp = (name, label, type = 'text', extra = '') => `<div class="field"><label for="cf-${name}">${label}</label><input class="input" id="cf-${name}" name="${name}" type="${type}" value="${escape(s[name] ?? '')}" ${extra}></div>`;
  el.innerHTML = `${pageHead('Configuración', 'Datos de la comunidad, finanzas y sitio público')}
    <div class="grid-2">
      <form class="card stack" data-f="comunidad"><h3 style="margin:0">Comunidad</h3>${inp('community', 'Nombre')}${inp('address', 'Dirección')}${inp('rut', 'RUT comunidad')}${inp('adminCompany', 'Empresa administradora')}<div class="grid-2">${inp('adminPhone', 'Teléfono administración')}${inp('conciergePhone', 'Teléfono conserjería')}</div>${inp('adminEmail', 'Correo administración', 'email')}<button class="btn btn-primary">Guardar</button></form>
      <form class="card stack" data-f="finanzas"><h3 style="margin:0">Parámetros financieros</h3><div class="grid-2">${inp('reservePct', 'Fondo de reserva (%)', 'number', 'step="0.5" min="0" max="20"')}${inp('interestPct', 'Interés por mora (% mensual)', 'number', 'step="0.1" min="0" max="5"')}${inp('dueDay', 'Día de vencimiento', 'number', 'min="1" max="28"')}${inp('waterPrice', 'Valor m³ de agua (CLP)', 'number', 'min="0"')}</div>${inp('bank', 'Cuenta para transferencias')}
        <p class="small muted" style="margin:0">El fondo de reserva se aplica a los nuevos períodos. El interés y vencimiento afectan de inmediato la morosidad.</p><button class="btn btn-primary">Guardar</button></form>
      <form class="card stack" data-f="sitio"><h3 style="margin:0">Sitio público (landing Vecindario)</h3>${inp('heroTitle', 'Título principal')}<div class="field"><label for="cf-heroSubtitle">Bajada</label><textarea class="textarea" id="cf-heroSubtitle" name="heroSubtitle" style="min-height:80px">${escape(s.heroSubtitle)}</textarea></div>
        <div class="grid-3">${(s.plans || []).map((pl, i) => `<div class="field"><label for="cf-plan${i}">Plan ${escape(pl.name)} ($/depto)</label><input class="input" id="cf-plan${i}" name="plan${i}" type="number" min="0" value="${pl.price}"></div>`).join('')}</div>
        <label class="check"><input type="checkbox" name="showAnnouncements" ${s.showAnnouncements !== false ? 'checked' : ''}> Mostrar avisos públicos en la landing</label>
        <div class="row"><button class="btn btn-primary">Publicar cambios</button><a class="btn" href="index.html" target="_blank" rel="noopener">Ver sitio ↗</a></div></form>
      <div class="card stack"><h3 style="margin:0">Datos de la demo</h3><p class="muted" style="margin:0">Restaura unidades, cobros, reservas, usuarios y configuración a los datos de ejemplo.</p><button class="btn btn-danger" data-reset>↺ Restablecer datos demo</button>
        <p class="small muted" style="margin:0">Base local <code>lgw:db:condominio</code> · ${db.count('units')} unidades · ${db.count('charges')} cobros (${money(db.all('charges').reduce((t, c) => t + c.total, 0))}) · ${db.count('users')} usuarios</p></div>
    </div>`;
  const forms = {
    comunidad: d => ({ community: d.community, address: d.address, rut: d.rut, adminCompany: d.adminCompany, adminPhone: d.adminPhone, conciergePhone: d.conciergePhone, adminEmail: d.adminEmail }),
    finanzas: d => { const x = { reservePct: +d.reservePct, interestPct: +d.interestPct, dueDay: +d.dueDay, waterPrice: +d.waterPrice, bank: d.bank }; if (!(x.dueDay >= 1 && x.dueDay <= 28)) { toast('Día de vencimiento entre 1 y 28', 'warning'); return null; } return x; },
    sitio: (d, f) => ({ heroTitle: d.heroTitle, heroSubtitle: d.heroSubtitle, showAnnouncements: f.showAnnouncements.checked, plans: (s.plans || []).map((pl, i) => ({ ...pl, price: +d['plan' + i] || pl.price })) })
  };
  el.querySelectorAll('[data-f]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault(); const patch = forms[f.dataset.f](Object.fromEntries(new FormData(f)), f); if (!patch) return;
    saveSettings(patch); db.log('configuración', `${user.name} actualizó ${f.dataset.f}`, user.id); toast('Cambios guardados', 'success');
  }));
  el.querySelector('[data-reset]').onclick = async () => { if (await confirm('Se borrarán todos los cambios hechos en este navegador.', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) { db.reset(); toast('Datos restablecidos', 'success'); setTimeout(() => location.reload(), 400); } };
}
