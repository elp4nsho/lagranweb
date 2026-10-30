// Políticas SLA por prioridad: objetivo de primera respuesta y de resolución.
import { db } from '../data/db.js';
import { toast, pct } from '../../../assets/core/ui.js';
import { PRIORITIES } from '../shared/constants.js';
import { pageHead } from '../shared/shell.js';
import { duration, DAY } from '../shared/util.js';
import { sla } from '../shared/tickets.js';

export function render(view, { user }) {
  const since = Date.now() - 30 * DAY;
  view.innerHTML = `${pageHead('Políticas SLA', 'Tiempos objetivo según prioridad (horario continuo). Se aplican a tickets nuevos y al cambiar la prioridad.')}
    <form class="stack" data-form novalidate>${PRIORITIES.slice().reverse().map(p => {
      const s = db.find('slas', x => x.priority === p.id);
      const ts = db.query('tickets', t => t.priority === p.id && new Date(t.createdAt) > since && (t.firstResponseAt || t.resolvedAt));
      const ok = ts.filter(t => { const x = sla(t); return x.first.met !== false && x.res.met !== false; }).length;
      return `<section class="card sla-row"><div><span class="badge badge-${p.badge}">${p.name}</span><p class="small muted" style="margin:6px 0 0">Cumplimiento 30 días: <b>${ts.length ? pct(ok / ts.length * 100) : '—'}</b> (${ts.length} tickets)</p></div>
        <div class="field"><label for="f-${p.id}">Primera respuesta (min)</label><input class="input" id="f-${p.id}" type="number" min="5" name="first-${p.id}" value="${s.first}"><small class="muted">${duration(s.first)}</small></div>
        <div class="field"><label for="r-${p.id}">Resolución (min)</label><input class="input" id="r-${p.id}" type="number" min="15" name="res-${p.id}" value="${s.resolution}"><small class="muted">${duration(s.resolution)}</small></div></section>`;
    }).join('')}<div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-save>Guardar políticas</button></div></form>`;
  view.querySelector('[data-save]').onclick = e => {
    e.preventDefault();
    const f = view.querySelector('[data-form]').elements;
    for (const p of PRIORITIES) {
      const first = +f['first-' + p.id].value, res = +f['res-' + p.id].value;
      if (!(first > 0 && res > first)) return toast(`Revisa ${p.name}: la resolución debe ser mayor que la primera respuesta`, 'warning');
    }
    PRIORITIES.forEach(p => { const s = db.find('slas', x => x.priority === p.id); db.update('slas', s.id, { first: +f['first-' + p.id].value, resolution: +f['res-' + p.id].value }); });
    db.log('sla', 'Actualizó las políticas SLA', user.id);
    toast('Políticas SLA guardadas', 'success');
  };
}
