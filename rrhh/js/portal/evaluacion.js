// Desempeño: autoevaluación del ciclo abierto e historial de resultados.
import { escape, toast, date } from '../../../assets/core/ui.js';
import { today } from '../shared/dates.js';

export const live = false;
export const scaleHTML = (name, val, max = 5) => `<div class="scale" role="radiogroup" aria-label="${escape(name)}">${Array.from({ length: max }, (_, i) => `<label><input type="radio" name="${escape(name)}" value="${i + 1}" ${val === i + 1 ? 'checked' : ''}><span>${i + 1}</span></label>`).join('')}</div>`;
const avg = sc => { const v = Object.values(sc || {}); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : 0; };
export const LEVEL = n => n >= 4.5 ? 'Sobresaliente' : n >= 3.8 ? 'Supera lo esperado' : n >= 3 ? 'Cumple lo esperado' : 'En desarrollo';

export function render(el, ctx) {
  const { db } = ctx, me = ctx.me;
  const cycle = db.find('cycles', c => c.status === 'abierto');
  let rev = cycle && db.find('reviews', r => r.cycleId === cycle.id && r.employeeId === me.id);
  const past = db.query('reviews', r => r.employeeId === me.id && r.final != null).map(r => ({ r, c: db.get('cycles', r.cycleId) }));
  const comps = cycle?.competencies || [];
  el.innerHTML = `<div class="page-head"><div><h1>Desempeño</h1><p class="muted" style="margin:4px 0 0">Escala 1 a 5: 1 = en desarrollo · 3 = cumple lo esperado · 5 = sobresaliente.</p></div></div>
    ${!cycle ? '<div class="card empty"><span class="icon">🎯</span>No hay un ciclo de evaluación abierto.</div>' : `
    <form class="card stack" data-self>
      <div class="card-h" style="margin:0"><div><h3>${escape(cycle.name)}</h3><span class="muted small">Plazo: ${escape(date(cycle.to + 'T12:00'))}</span></div>${rev?.self ? `<span class="badge badge-success">Enviada el ${escape(date(rev.self.at + 'T12:00'))}</span>` : '<span class="badge badge-warning">Pendiente</span>'}</div>
      <div>${comps.map(c => `<div class="score-row"><span><b>${escape(c)}</b></span>${scaleHTML(c, rev?.self?.scores?.[c])}</div>`).join('')}</div>
      <div class="field"><label for="ev-c">Logros del periodo</label><textarea class="textarea" id="ev-c" name="comment" rows="3">${escape(rev?.self?.comment || '')}</textarea></div>
      <div class="field"><label for="ev-g">Objetivos y necesidades de desarrollo</label><textarea class="textarea" id="ev-g" name="goals" rows="2">${escape(rev?.self?.goals || '')}</textarea></div>
      <div class="row"><button class="btn btn-primary" type="submit">${rev?.self ? 'Actualizar autoevaluación' : 'Enviar autoevaluación'}</button>${rev?.manager ? `<span class="badge badge-info">Tu jefatura ya evaluó: ${avg(rev.manager.scores)}</span>` : '<span class="muted small">Tu jefatura completará su evaluación después.</span>'}</div>
    </form>`}
    <div class="card"><h3>Resultados anteriores</h3>${past.length ? past.map(({ r, c }) => `<div class="score-row"><span><b>${escape(c?.name || '')}</b><br><small class="muted">${escape(r.manager?.comment || '')}</small></span><span><span class="badge badge-primary">${String(r.final).replace('.', ',')} · ${LEVEL(r.final)}</span></span></div>`).join('') : '<p class="muted">Aún no tienes evaluaciones cerradas.</p>'}</div>`;
  el.querySelector('[data-self]')?.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, scores = {};
    for (const c of comps) { const v = f.querySelector(`[name="${CSS.escape(c)}"]:checked`); if (!v) return toast(`Califica «${c}»`, 'warning'); scores[c] = +v.value; }
    const self = { scores, comment: f.comment.value.trim(), goals: f.goals.value.trim(), at: today() };
    if (rev) db.update('reviews', rev.id, { self }); else rev = db.insert('reviews', { cycleId: cycle.id, employeeId: me.id, managerId: me.managerId, self, manager: null, final: null });
    if (me.managerId) ctx.notify(me.managerId, `${me.name} envió su autoevaluación (${cycle.name}).`);
    db.log('desempeño', `${me.name} envió su autoevaluación`, ctx.user.id);
    toast('Autoevaluación enviada a tu jefatura', 'success');
    render(el, ctx);
  });
}
export { avg };
