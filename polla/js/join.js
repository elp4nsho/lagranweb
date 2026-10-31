// Vista previa de una polla por código y formulario para unirse (la usan el sitio público y la app del participante).
import { html, raw, money, toast } from '../../assets/core/ui.js';
import { emptyState } from '../../assets/core/blocks.js';
import { db } from './app.js';
import * as L from './logic.js';
import * as V from './views.js';

export const findByCode = code => { const c = String(code || '').trim().toUpperCase(); return c ? db.find('pollas', p => p.code.toUpperCase() === c) : null; };

export function joinHTML(p, user, { loginHref, registerHref } = {}) {
  const taken = L.takenTurns(db, p), free = L.freeCupos(db, p), half = L.halfOpen(db, p), org = V.U(p.organizerId), rep = L.reputation(db, p.organizerId);
  const dates = L.schedule(p.startDate, p.frequency, p.cupos, p.everyDays);
  const already = user && db.find('members', m => m.pollaId === p.id && m.userId === user.id && ['activo', 'solicitud'].includes(m.status));
  const open = p.status === 'inscripcion';
  return html`<article class="card g-join">
    <header class="g-join-head"><span class="g-emoji big" aria-hidden="true">${p.emoji}</span><div style="min-width:0"><span class="eyebrow">Polla ${p.code}</span><h2 style="margin:2px 0">${p.name}</h2>${raw(L.POLLA.badge(p.status))}</div></header>
    <div class="g-join-nums">
      <div><small>Cuota</small><b>${money(p.amount)}</b><small>${L.freqLabel(p).toLowerCase()}</small></div>
      <div><small>Pozo</small><b>${money(L.potOf(p))}</b><small>por ronda</small></div>
      <div><small>Cupos libres</small><b>${free}${half ? ' + ½' : ''}</b><small>de ${p.cupos}</small></div>
      <div><small>Turnos</small><b>${L.MODE_ICON[p.mode]}</b><small>${L.MODES[p.mode]}</small></div>
    </div>
    <div class="g-join-org">${raw(V.av(org, 40))}<div><b>Organiza ${org?.name}</b><small class="muted" style="display:block">${rep.label} · ★ ${rep.score} · ${rep.organized} polla(s) cerrada(s) como organizador/a</small></div></div>
    <p class="small"><b>Calendario:</b> ${L.fdate(dates[0])} → ${L.fdate(dates.at(-1))} (${p.cupos} rondas). <b>Multa:</b> ${money(p.lateFee)} después de ${p.graceDays} día(s) de gracia.${p.allowHalf ? raw(' <b>Acepta medios cupos.</b>') : ''}${p.approval ? ' La organización aprueba cada inscripción.' : ''}</p>
    ${p.rules ? html`<details class="g-details"><summary>Reglas de la polla</summary><p class="g-pre small">${p.rules}</p></details>` : ''}
    ${!open ? raw(`<div class="g-alert is-warning">Esta polla no está recibiendo inscripciones (${L.POLLA.label(p.status).toLowerCase()}).</div>`)
      : already ? raw(`<div class="g-alert is-info">${already.status === 'solicitud' ? 'Tu solicitud está esperando aprobación.' : 'Ya eres parte de esta polla.'} <a href="participante.html#/pollas/${p.id}">Ver en mi app</a></div>`)
      : !user ? html`<div class="row g-join-cta"><a class="btn btn-primary btn-lg" href="${registerHref}">Crear cuenta y unirme</a><a class="btn btn-lg" href="${loginHref}">Ya tengo cuenta</a></div>`
      : free <= 0 && !half ? raw('<div class="g-alert is-warning">No quedan cupos libres.</div>')
      : html`<form class="stack g-join-form" data-join novalidate>
        ${p.allowHalf ? html`<fieldset class="g-seg"><legend>¿Cuánto quieres tomar?</legend>${free > 0 ? html`<label class="chip"><input type="radio" name="half" value="0" checked> Cupo completo · ${money(p.amount)}</label>` : ''}<label class="chip"><input type="radio" name="half" value="1" ${free <= 0 ? raw('checked') : ''}> Medio cupo · ${money(Math.ceil(p.amount / 2))}${half ? ' (completa un cupo)' : ' (busca pareja)'}</label></fieldset>` : ''}
        ${p.mode === 'llegada' ? html`<fieldset class="g-seg"><legend>Elige tu turno (el primero que llega escoge)</legend><div class="g-turn-pick">${dates.map((d, i) => { const t = i + 1, busy = taken.includes(t); return html`<label class="g-tp ${busy ? 'is-busy' : ''}"><input type="radio" name="turn" value="${t}" ${busy ? raw('disabled') : ''}><b>${t}</b><small>${L.fdateShort(d)}</small></label>`; })}</div></fieldset>` : p.mode === 'sorteo' ? raw('<p class="small muted">Los turnos se sortean en vivo cuando se completen los cupos, con una semilla que cualquiera puede verificar.</p>') : p.mode === 'remate' ? raw('<p class="small muted">Cada ronda se remata: quien ofrece más descuento recibe antes, y ese descuento se reparte entre los demás.</p>') : raw('<p class="small muted">La organización define el orden de los turnos.</p>')}
        <label class="check"><input type="checkbox" name="ok" required> Leí las reglas y me comprometo a pagar a tiempo</label>
        <button class="btn btn-primary btn-lg" type="submit">${p.approval ? 'Enviar solicitud' : 'Unirme a la polla'}</button>
      </form>`}
  </article>`;
}
export function mountJoin(el, p, user, onDone) {
  const f = el.querySelector('[data-join]');
  if (!f) return;
  f.addEventListener('submit', e => {
    e.preventDefault();
    const b = f.querySelector('[type=submit]');
    if (b.disabled) return;
    if (!f.ok.checked) return toast('Confirma que leíste las reglas', 'warning');
    const half = f.half ? f.querySelector('[name=half]:checked')?.value === '1' : false;
    const turn = p.mode === 'llegada' ? +(f.querySelector('[name=turn]:checked')?.value || 0) : null;
    if (p.mode === 'llegada' && !turn) return toast('Elige un turno libre', 'warning');
    b.disabled = true;
    try {
      const m = L.joinPolla(db, p.id, user.id, { half, turn, by: user.id, viaCode: true });
      toast(m.status === 'solicitud' ? 'Solicitud enviada a la organización' : '¡Listo! Ya eres parte de la polla 🐣', 'success');
      onDone && onDone(m);
    } catch (err) { toast(err.message, 'warning'); b.disabled = false; }
  });
}
export const notFound = code => emptyState({ icon: '🔎', title: 'No encontramos esa polla', text: `Revisa el código "${code}". Tiene la forma PALABRA-123 (ej: AROMOS-24).` });
