// Políticas de vacaciones y permisos (afectan el cálculo de saldos y validaciones).
import { toast, escape } from '../../../assets/core/ui.js';
import { pageHead } from './common.js';
import { DEFAULT_POLICY, entitlement, vacationBalance, fmtDays } from '../shared/vacation.js';
import { REQ_TYPES } from '../shared/util.js';

export function render(el, ctx) {
  const { db } = ctx, p = { ...DEFAULT_POLICY, ...db.getValue('policy', {}) };
  const act = db.query('employees', e => e.status !== 'desvinculado');
  const totalAvail = act.reduce((s, e) => s + Math.max(0, vacationBalance(db, e, p).available), 0);
  const prog = act.filter(e => entitlement(e, p) > p.diasBase).length;
  el.innerHTML = `${pageHead('Políticas de vacaciones y permisos', 'Basadas en el Código del Trabajo (15 días hábiles + feriado progresivo). Valores editables para la demo.')}
    <div class="dash-grid">
      <form class="card span-8 form-grid" data-pol>
        <h3 class="span-2" style="margin:0">Vacaciones</h3>
        <div class="field"><label for="pb">Días hábiles base por año</label><input class="input" id="pb" name="diasBase" type="number" min="15" max="30" value="${p.diasBase}"></div>
        <div class="field"><label for="pm">Máximo acumulable</label><input class="input" id="pm" name="maxAcumulado" type="number" min="15" max="60" value="${p.maxAcumulado}"></div>
        <div class="field"><label for="pp">Progresivo desde (años totales)</label><input class="input" id="pp" name="progresivoDesdeAnios" type="number" min="5" max="20" value="${p.progresivoDesdeAnios}"></div>
        <div class="field"><label for="pc">+1 día cada (años)</label><input class="input" id="pc" name="progresivoCadaAnios" type="number" min="1" max="5" value="${p.progresivoCadaAnios}"></div>
        <div class="field"><label for="pa">Anticipación mínima (días)</label><input class="input" id="pa" name="anticipacionMin" type="number" min="0" max="30" value="${p.anticipacionMin}"></div>
        <div class="field"><label for="pr">Aprobación</label><select class="select" id="pr" name="aprobacion"><option value="jefatura" ${p.aprobacion === 'jefatura' ? 'selected' : ''}>Jefatura directa</option><option value="rrhh" ${p.aprobacion === 'rrhh' ? 'selected' : ''}>Jefatura y luego RRHH</option></select></div>
        <h3 class="span-2" style="margin:8px 0 0">Permisos</h3>
        <div class="field"><label for="pd">Días administrativos por año</label><input class="input" id="pd" name="adminDias" type="number" min="0" max="6" value="${p.adminDias}"></div>
        <label class="check" style="align-self:end"><input type="checkbox" name="medioDia" ${p.medioDia ? 'checked' : ''}> Permitir medio día administrativo</label>
        <div class="span-2"><button class="btn btn-primary" type="submit">Guardar políticas</button></div>
      </form>
      <div class="span-4 stack">
        <div class="card kpi"><div class="stat"><span class="label">Saldo total por usar</span><span class="value">${Math.round(totalAvail)} días</span><span class="delta">pasivo de vacaciones de ${act.length} personas</span></div></div>
        <div class="card kpi"><div class="stat"><span class="label">Con feriado progresivo</span><span class="value">${prog}</span></div></div>
        <div class="card"><h3>Tipos de permiso</h3><ul class="log-list">${Object.values(REQ_TYPES).map(t => `<li>${t.ico}<span>${escape(t.label)}<small>${t.paid ? 'Con goce' : 'Sin goce'}${t.max ? ` · máx. ${t.max} días` : ''}${t.doc ? ' · requiere documento' : ''}</small></span></li>`).join('')}</ul></div>
      </div>
    </div>`;
  el.querySelector('[data-pol]').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, num = n => Math.max(0, +f[n].value || 0);
    db.setValue('policy', { diasBase: Math.max(15, num('diasBase')), maxAcumulado: num('maxAcumulado'), progresivoDesdeAnios: num('progresivoDesdeAnios'), progresivoCadaAnios: Math.max(1, num('progresivoCadaAnios')), anticipacionMin: num('anticipacionMin'), aprobacion: f.aprobacion.value, adminDias: num('adminDias'), medioDia: f.medioDia.checked });
    db.log('política', 'Actualizó la política de vacaciones y permisos', ctx.user.id);
    toast('Políticas guardadas: los saldos se recalcularon', 'success');
  });
}
export { fmtDays };
