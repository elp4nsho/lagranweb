// Reglas de reserva de puestos por empresa y barrios (zonas asociadas a áreas).
import { escape, toast } from '../../../assets/core/ui.js';
import { pageHead } from './common.js';
import { rulesFor } from '../shared/booking.js';

export function render(el, ctx) {
  const { db, idx } = ctx, r = rulesFor(db, idx.company.id);
  const zones = idx.floors.flatMap(f => f.zones.map(z => ({ z, f, desks: f.desks.filter(d => d.zoneId === z.id) })));
  el.innerHTML = `${pageHead('Reglas de reserva y barrios', `${escape(idx.company.name)} · se aplican de inmediato en la app de empleados.`)}
    <div class="dash-grid">
      <form class="card span-6 stack" data-rules>
        <h3>Reserva de puestos flexibles</h3>
        <div class="form-grid">
          <div class="field"><label for="r-days">Máximo de días de anticipación</label><input class="input" id="r-days" name="maxDaysAhead" type="number" min="0" max="60" value="${r.maxDaysAhead}"></div>
          <div class="field"><label for="r-week">Máximo de reservas por semana</label><input class="input" id="r-week" name="maxPerWeek" type="number" min="1" max="7" value="${r.maxPerWeek}"></div>
          <div class="field"><label for="r-dead">Hora límite de check-in</label><input class="input" id="r-dead" name="checkinDeadline" type="time" value="${r.checkinDeadline}"><small class="muted">Después se pueden liberar los puestos sin check-in.</small></div>
          <div class="field" style="justify-content:flex-end;gap:10px">
            <label class="check"><input type="checkbox" name="autoRelease" ${r.autoRelease ? 'checked' : ''}> Liberar no-shows automáticamente</label>
            <label class="check"><input type="checkbox" name="allowWeekends" ${r.allowWeekends ? 'checked' : ''}> Permitir fines de semana</label>
            <label class="check"><input type="checkbox" name="restrictNeighborhoods" ${r.restrictNeighborhoods ? 'checked' : ''}> Restringir por barrio (área)</label>
          </div>
        </div>
        <div class="row"><button class="btn btn-primary" type="submit">Guardar reglas</button><span class="muted small">Última edición: ${r.updatedAt ? escape(new Date(r.updatedAt).toLocaleString('es-CL')) : 'valores por defecto'}</span></div>
      </form>
      <div class="card span-6"><h3>Cómo funcionan</h3><ul class="log-list">
        <li>🗓️ <span>Las personas sin puesto fijo reservan puestos <b>flexibles</b> por día, hasta <b>${r.maxDaysAhead}</b> días antes.</span></li>
        <li>🔢 <span>Máximo <b>${r.maxPerWeek}</b> reservas por persona por semana y una por día.</span></li>
        <li>⏰ <span>Check-in hasta las <b>${escape(r.checkinDeadline)}</b>${r.autoRelease ? '; luego el puesto se libera' : ''}.</span></li>
        <li>🏘️ <span>${r.restrictNeighborhoods ? 'Solo se puede reservar en zonas abiertas o del barrio del área propia.' : 'Cualquier persona puede reservar en cualquier zona (barrios solo informativos).'}</span></li>
      </ul></div>
      <div class="card span-12"><div class="card-h"><h3>Barrios por zona</h3><a class="small" href="#/pisos">Editar zonas en el plano</a></div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>Piso</th><th>Zona</th><th>Puestos</th><th>Flexibles</th><th>Barrio (área)</th></tr></thead><tbody>
        ${zones.map(({ z, f, desks }) => `<tr><td>${escape(f.name)}</td><td>${escape(z.name)}</td><td>${desks.length}</td><td>${desks.filter(d => d.type === 'flexible').length}</td><td><select class="select select-sm" data-zone="${f.id}|${z.id}" aria-label="Barrio de ${escape(z.name)}" style="min-width:160px"><option value="">Abierta a todos</option>${idx.areas.map(a => `<option value="${a.id}" ${a.id === z.areaId ? 'selected' : ''}>${escape(a.name)}</option>`).join('')}</select></td></tr>`).join('')}
        </tbody></table></div></div>
    </div>`;
  el.querySelector('[data-rules]').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, all = db.getValue('rules', {});
    all[idx.company.id] = { maxDaysAhead: Math.max(0, +f.maxDaysAhead.value || 0), maxPerWeek: Math.max(1, +f.maxPerWeek.value || 1), checkinDeadline: f.checkinDeadline.value || '10:30', autoRelease: f.autoRelease.checked, allowWeekends: f.allowWeekends.checked, restrictNeighborhoods: f.restrictNeighborhoods.checked, updatedAt: new Date().toISOString() };
    db.setValue('rules', all);
    db.log('reglas', `Actualizó las reglas de reserva de ${idx.company.name}`, ctx.user.id);
    toast('Reglas guardadas', 'success');
  });
  el.querySelectorAll('[data-zone]').forEach(s => s.addEventListener('change', () => {
    const [fid, zid] = s.dataset.zone.split('|'), fl = db.get('floors', fid);
    db.update('floors', fid, { zones: fl.zones.map(z => z.id === zid ? { ...z, areaId: s.value || null } : z) });
    db.log('barrio', `Cambió el barrio de ${fl.name} · ${fl.zones.find(z => z.id === zid)?.name}`, ctx.user.id);
    toast('Barrio actualizado', 'success');
  }));
}
