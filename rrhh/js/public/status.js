// Consulta del estado de una postulación (código + correo).
import { escape, date } from '../../../assets/core/ui.js';
import { STAGES, PUBLIC_STAGE } from '../shared/util.js';

export function render(el, ctx, _p, q = {}) {
  const { db } = ctx;
  el.innerHTML = `<section class="container section" style="padding-top:32px"><div style="max-width:720px;margin:0 auto" class="stack">
    <div><span class="eyebrow">Seguimiento</span><h1 style="margin:6px 0">Estado de tu postulación</h1><p class="muted">Ingresa el código que recibiste al postular y tu correo.</p></div>
    <form class="card row" data-f novalidate style="align-items:flex-end">
      <div class="field" style="flex:1 1 160px"><label for="st-code">Código</label><input class="input" id="st-code" name="code" placeholder="GC-4821" value="${escape(q.code || '')}" required></div>
      <div class="field" style="flex:2 1 220px"><label for="st-email">Correo</label><input class="input" id="st-email" name="email" type="email" value="${escape(q.email || '')}" required></div>
      <button class="btn btn-primary" type="submit">Consultar</button>
    </form>
    <div data-res></div>
    <p class="muted small">¿Probando la demo? Usa un código de ejemplo: <button type="button" class="btn btn-sm btn-ghost" data-sample>Cargar ejemplo</button></p>
  </div></section>`;
  const form = el.querySelector('[data-f]'), res = el.querySelector('[data-res]');
  const lookup = () => {
    const code = form.code.value.trim().toUpperCase(), email = form.email.value.trim().toLowerCase();
    if (!code || !email) { res.innerHTML = '<div class="card empty">Completa el código y el correo.</div>'; return; }
    const a = db.find('applications', x => x.code.toUpperCase() === code && x.email.toLowerCase() === email);
    if (!a) { res.innerHTML = '<div class="card empty"><span class="icon">🔎</span>No encontramos una postulación con esos datos. Revisa el código y el correo.</div>'; return; }
    const j = db.get('jobs', a.jobId);
    const reached = new Map(a.history.map(h => [h.stage, h.at]));
    const order = STAGES.map(s => s[0]), curIdx = order.indexOf(a.stage);
    res.innerHTML = `<div class="card stack"><div class="row between"><div><b style="font-size:18px">${escape(j?.title || 'Vacante')}</b><div class="muted small">${escape(a.name)} · postulaste el ${escape(date(a.appliedAt + 'T12:00'))}</div></div><span class="badge ${a.stage === 'descartado' ? '' : a.stage === 'contratado' ? 'badge-success' : 'badge-primary'}">${escape(PUBLIC_STAGE[a.stage])}</span></div>
      <ol class="timeline">${STAGES.map(([k], i) => { const at = reached.get(k); const cls = a.stage === 'descartado' ? (at ? 'done' : '') : i < curIdx ? 'done' : i === curIdx ? 'current' : ''; return `<li class="${cls}"><span class="dot"></span><b>${escape(PUBLIC_STAGE[k])}</b><small>${at ? escape(date(at + 'T12:00')) : 'Pendiente'}</small></li>`; }).join('')}${a.stage === 'descartado' ? `<li class="bad"><span class="dot"></span><b>Proceso cerrado</b><small>Gracias por postular. Guardaremos tu perfil para futuras oportunidades.</small></li>` : ''}</ol></div>`;
  };
  form.addEventListener('submit', e => { e.preventDefault(); lookup(); });
  el.querySelector('[data-sample]').onclick = () => { const a = db.all('applications').find(x => ['entrevista', 'prueba'].includes(x.stage)) || db.all('applications')[0]; form.code.value = a.code; form.email.value = a.email; lookup(); };
  if (q.code && q.email) lookup();
}
