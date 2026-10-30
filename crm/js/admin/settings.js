// Configuración del sistema: empresa, cotizaciones, probabilidades del pipeline y pesos del scoring.
import { db } from '../data/db.js';
import { escape, toast } from '../../../assets/core/ui.js';
import { STAGES, LEAD_SOURCES } from '../shared/constants.js';
import { pageHead, field } from '../app/components.js';

export function render(view, { user }) {
  const s = db.getValue('settings', {});
  view.innerHTML = `
    ${pageHead('Configuración', 'Parámetros generales del CRM')}
    <form class="stack" data-form novalidate>
      <section class="card stack"><h3 style="margin:0">Empresa y cotizaciones</h3>
        <div class="grid-2">${field('Razón social', `<input class="input" name="companyName" value="${escape(s.companyName || '')}">`)}${field('Validez de cotizaciones (días)', `<input class="input" type="number" min="1" name="quoteValidity" value="${s.quoteValidity || 30}">`)}</div>
        ${field('Notas al pie de la cotización', `<textarea class="textarea" name="quoteNotes" style="min-height:70px">${escape(s.quoteNotes || '')}</textarea>`)}
      </section>
      <section class="card stack"><h3 style="margin:0">Probabilidad por etapa (%)</h3><p class="muted small" style="margin:0">Se usa para calcular el forecast ponderado.</p>
        <div class="grid-3">${STAGES.map(st => field(st.name, `<input class="input" type="number" min="0" max="100" name="p_${st.id}" value="${s.probabilities?.[st.id] ?? st.prob}" ${['ganado', 'perdido'].includes(st.id) ? 'readonly' : ''}>`)).join('')}</div>
      </section>
      <section class="card stack"><h3 style="margin:0">Puntaje base por fuente de lead</h3><p class="muted small" style="margin:0">El scoring suma este valor + tamaño + datos completos + estado.</p>
        <div class="grid-4">${LEAD_SOURCES.map(src => field(src, `<input class="input" type="number" min="0" max="50" name="s_${src}" value="${s.scoring?.[src] ?? 10}">`)).join('')}</div>
      </section>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-save>Guardar configuración</button></div>
    </form>`;
  view.querySelector('[data-save]').onclick = e => {
    e.preventDefault();
    const f = view.querySelector('[data-form]').elements;
    const next = {
      ...s, companyName: f.companyName.value.trim(), quoteValidity: Math.max(1, +f.quoteValidity.value || 30), quoteNotes: f.quoteNotes.value,
      probabilities: Object.fromEntries(STAGES.map(st => [st.id, Math.max(0, Math.min(100, +f['p_' + st.id].value || 0))])),
      scoring: Object.fromEntries(LEAD_SOURCES.map(src => [src, Math.max(0, Math.min(50, +f['s_' + src].value || 0))]))
    };
    db.setValue('settings', next);
    db.log('configuración', 'Actualizó la configuración del sistema', user.id);
    toast('Configuración guardada', 'success');
  };
}
