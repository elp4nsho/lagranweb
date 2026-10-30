// Configuración: valor UF (afecta todas las conversiones), parámetros del simulador y datos de contacto.
import { escape, toast, money, confirm } from '../../../assets/core/ui.js';
import { settings, saveSettings } from '../data/db.js';
import { fmtUF } from '../shared/format.js';
import { pageHead } from '../shared/kit.js';

export function renderSettings(el, p, q, ctx) {
  const { db, user } = ctx, s = settings();
  const sample = db.find('properties', x => x.currency === 'UF' && x.status === 'publicada');
  el.innerHTML = `${pageHead('Configuración', 'Parámetros generales del sistema')}
    <div class="grid-2">
      <form class="card stack" data-uf>
        <h3 style="margin:0">Valor de la UF</h3>
        <p class="muted small" style="margin:0">Se usa para convertir precios UF ↔ CLP en todo el sitio, el simulador hipotecario y los filtros por precio.</p>
        <div class="grid-2"><div class="field"><label for="s-uf">Valor UF (CLP)</label><input class="input" id="s-uf" name="uf" type="number" step="0.01" min="1" value="${s.uf}" required></div>
        <div class="field"><label for="s-ufd">Fecha</label><input class="input" id="s-ufd" name="ufDate" type="date" value="${escape(s.ufDate)}"></div></div>
        ${sample ? `<div class="spec"><small>Ejemplo: ${escape(sample.code)}</small><b data-ex>${fmtUF(sample.price)} = ${money(sample.price * s.uf)}</b></div>` : ''}
        <button class="btn btn-primary">Actualizar UF</button>
      </form>
      <form class="card stack" data-calc>
        <h3 style="margin:0">Simulador hipotecario</h3>
        <div class="grid-3"><div class="field"><label for="s-r">Tasa (%)</label><input class="input" id="s-r" name="rate" type="number" step="0.01" min="0" value="${s.rate}"></div>
        <div class="field"><label for="s-y">Años</label><input class="input" id="s-y" name="years" type="number" min="5" max="40" value="${s.years}"></div>
        <div class="field"><label for="s-d">Pie (%)</label><input class="input" id="s-d" name="downPct" type="number" min="10" max="50" step="5" value="${s.downPct}"></div></div>
        <button class="btn btn-primary">Guardar parámetros</button>
      </form>
      <form class="card stack" data-contact>
        <h3 style="margin:0">Datos de contacto</h3>
        <div class="field"><label for="s-ph">Teléfono</label><input class="input" id="s-ph" name="phone" value="${escape(s.phone)}"></div>
        <div class="field"><label for="s-em">Correo</label><input class="input" id="s-em" name="email" type="email" value="${escape(s.email)}"></div>
        <div class="field"><label for="s-wa">WhatsApp</label><input class="input" id="s-wa" name="whatsapp" value="${escape(s.whatsapp)}"></div>
        <div class="field"><label for="s-ad">Dirección casa matriz</label><input class="input" id="s-ad" name="address" value="${escape(s.address)}"></div>
        <button class="btn btn-primary">Guardar contacto</button>
      </form>
      <div class="card stack"><h3 style="margin:0">Datos de la demo</h3><p class="muted">Restaura todas las propiedades, leads, usuarios y configuración a los datos de ejemplo. Se pierden los cambios hechos en este navegador.</p><button class="btn btn-danger" data-reset>↺ Restablecer datos demo</button>
        <p class="small muted">Base de datos local: <code>lgw:db:inmobiliaria</code> · ${db.count('properties')} propiedades · ${db.count('leads')} leads · ${db.count('users')} usuarios</p></div>
    </div>`;
  const bind = (sel, fn, msg) => el.querySelector(sel).addEventListener('submit', e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); const patch = fn(d); if (!patch) return; saveSettings(patch); db.log('configuración', `${user.name}: ${msg}`, user.id); toast(msg, 'success'); ctx.refresh(); });
  bind('[data-uf]', d => { const v = +d.uf; if (!(v > 1000)) { toast('Ingresa un valor UF válido', 'warning'); return null; } return { uf: v, ufDate: d.ufDate }; }, 'Valor UF actualizado');
  bind('[data-calc]', d => ({ rate: +d.rate, years: +d.years, downPct: +d.downPct }), 'Parámetros del simulador guardados');
  bind('[data-contact]', d => d, 'Datos de contacto guardados');
  el.querySelector('#s-uf').oninput = e => { const x = el.querySelector('[data-ex]'); if (x && sample) x.textContent = `${fmtUF(sample.price)} = ${money(sample.price * (+e.target.value || 0))}`; };
  el.querySelector('[data-reset]').onclick = async () => { if (await confirm('Se borrarán todos los cambios.', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) { db.reset(); toast('Datos restablecidos', 'success'); setTimeout(() => location.reload(), 400); } };
}
