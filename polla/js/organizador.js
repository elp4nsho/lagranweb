// Panel de organización (organizador/a y tesorero/a): rondas, pagos, miembros, turnos, libro y recordatorios.
import { app, db, pollas, managed, me } from './app.js';
import * as L from './logic.js';
import * as V from './views.js';
import { accountSection } from '../../assets/core/pages.js';
import { pageHead, kpis, card, emptyState, kv, historyTimeline, timeline, activityFeed } from '../../assets/core/blocks.js';
import { html, raw, money, toast, confirm, modal, dateTime, ago, downloadCSV, barChart, escape } from '../../assets/core/ui.js';
import { fieldsModal } from '../../assets/core/resource.js';

const { tryDo, once, who, av } = V;
const deny = () => toast('Esto lo hace solo quien organiza la polla', 'warning');
const allow = (p, action) => (L.can(p, me(), action) ? true : (deny(), false));
const inviteURL = p => new URL(`index.html#/unirse?code=${encodeURIComponent(p.code)}`, location.href).href;
const copy = async text => { try { await navigator.clipboard.writeText(text); toast('Copiado al portapapeles', 'success'); } catch (e) { toast(text, 'info', 6000); } };
const tabLink = (p, id, label, cur, n) => html`<a class="tab ${cur === id ? 'active' : ''}" href="#/pollas/${p.id}?tab=${id}" ${cur === id ? raw('aria-current="page"') : ''}>${label}${n ? html` <span class="badge badge-danger">${n}</span>` : ''}</a>`;
const back = (href, label) => html`<a class="small g-back" href="${href}">← ${label}</a>`;
// El contenedor #view persiste entre rutas: los eventos delegados van en un envoltorio que se recrea.
const page = view => { const w = document.createElement('div'); w.className = 'g-page'; w.append(...view.childNodes); view.appendChild(w); return w; };
const monthOf = q => (/^\d{4}-\d{2}$/.test(q?.m || '') ? q.m : L.today(db).slice(0, 7));

// ======================= Resumen =======================
function dashboard(view, ctx) {
  const u = ctx.user, list = managed(u), active = list.filter(p => p.status === 'en_curso');
  const ids = new Set(list.map(p => p.id));
  const pays = db.query('payments', x => ids.has(x.pollaId));
  const month = L.today(db).slice(0, 7);
  const inMonth = db.query('movements', m => ids.has(m.pollaId) && m.type === 'aporte' && m.at.slice(0, 7) === month).reduce((s, m) => s + m.amount, 0);
  const expMonth = db.query('rounds', r => ids.has(r.pollaId) && r.dueDate.slice(0, 7) === month && r.status !== 'anulada').reduce((s, r) => s + L.roundStats(db, r).expected, 0);
  const risks = active.flatMap(p => L.risks(db, p.id).map(r => ({ ...r, p })));
  const upcoming = active.map(p => ({ p, r: L.nextPayout(db, p.id) })).filter(x => x.r).sort((a, b) => a.r.dueDate.localeCompare(b.r.dueDate));
  const signup = list.filter(p => ['inscripcion', 'borrador'].includes(p.status));
  view.innerHTML = html`${pageHead(`Hola, ${u.name.split(' ')[0]} 👋`, u.role === 'tesorero' ? 'Eres tesorero/a: confirmas pagos, entregas pozos y recuerdas cuotas.' : 'Así van tus pollas hoy.', pollas.can('create') ? '<button type="button" class="btn btn-primary" data-new>＋ Nueva polla</button>' : '')}
    ${raw(kpis([
      { label: 'Pollas en curso', value: active.length, icon: '🐣', href: '#/pollas', hint: `${signup.length} en preparación` },
      { label: 'Recaudado este mes', value: money(inMonth), icon: '💰', hint: expMonth ? `de ${money(expMonth)} esperados en rondas del mes` : 'sin rondas este mes' },
      { label: 'Pagos por confirmar', value: pays.filter(x => x.status === 'informado').length, icon: '🧾', href: '#/pagos', hint: money(pays.filter(x => x.status === 'informado').reduce((s, x) => s + x.amount, 0)) },
      { label: 'Cuotas atrasadas', value: pays.filter(x => x.status === 'atrasado').length, icon: '⏰', href: '#/riesgo', hint: `${pays.filter(x => x.status === 'cubierto').length} cubiertas por cobrar` },
      { label: 'Plata en caja', value: money(list.reduce((s, p) => s + L.cashOf(db, p.id).caja, 0)), icon: '🏦', hint: 'suma de todas tus pollas' }
    ]))}
    ${risks.filter(r => r.level === 'alto').length ? html`<div class="g-alert is-danger" role="alert"><b>⚠️ Alerta de riesgo:</b> ${risks.filter(r => r.level === 'alto').map(r => `${L.userName(db, r.member.userId)} (${r.p.name})`).join(', ')} ya recibió el pozo y dejó de pagar. <a href="#/riesgo">Revisar</a></div>` : ''}
    <div class="k-grid-main">
      <div class="stack">
        ${active.length ? active.map(p => { const r = L.currentRound(db, p.id); return raw(card(`${p.emoji} ${p.name}`, V.roundSummary(r, p), { actions: html`<div class="row" style="gap:6px">${r.status === 'completa' && L.can(p, u, 'entregas') ? html`<a class="btn btn-sm btn-primary" href="#/pollas/${p.id}/ronda/${r.id}">Entregar pozo</a>` : ''}<a class="btn btn-sm" href="#/pollas/${p.id}/ronda/${r.id}">Ver ronda</a></div>` })); })
          : raw(card('', emptyState({ icon: '🐣', title: 'No tienes pollas en curso', text: 'Crea una, comparte el código y parte cuando estén todos los cupos.', action: pollas.can('create') ? '<button type="button" class="btn btn-primary" data-new>Crear mi primera polla</button>' : '' })))}
        ${signup.length ? raw(card('En preparación', html`<ul class="g-list">${signup.map(p => { const n = db.count('slots', s => s.pollaId === p.id), req = db.count('members', m => m.pollaId === p.id && m.status === 'solicitud'); const next = p.status === 'borrador' ? 'Abrir inscripciones' : !L.isFull(db, p) ? `Faltan ${p.cupos - n + (L.halfOpen(db, p) ? 0 : 0)} cupo(s)` : p.mode === 'sorteo' && !p.draw ? '¡Listo para sortear!' : p.mode === 'fijo' && L.slotsOf(db, p.id).some(s => !s.turn) ? 'Ordena los turnos' : '¡Lista para iniciar!'; return html`<li><a href="#/pollas/${p.id}" class="g-row-link"><span class="g-emoji">${p.emoji}</span><span style="flex:1;min-width:0"><b>${p.name}</b><small class="muted" style="display:block">${L.POLLA.label(p.status)} · ${n}/${p.cupos} cupos · parte el ${L.fdate(p.startDate)}${req ? ` · ${req} solicitud(es)` : ''}</small>${raw(V.bar(V.pct(n, p.cupos)))}</span><span class="badge badge-info">${next}</span></a></li>`; })}</ul>`)) : ''}
      </div>
      <div class="stack">
        ${raw(card('Próximas entregas', upcoming.length ? html`<ul class="g-list">${upcoming.slice(0, 6).map(({ p, r }) => html`<li><a class="g-row-link" href="#/pollas/${p.id}/ronda/${r.id}"><span class="g-date"><b>${L.parseYmd(r.dueDate).getDate()}</b><small>${L.fdate(r.dueDate).split(' ')[1]}</small></span><span style="flex:1;min-width:0"><b>${money(L.potOf(p) - (r.discount || 0))}</b> → ${r.slotId ? L.slotLabel(db, db.get('slots', r.slotId)) : 'por rematar'}<small class="muted" style="display:block">${p.name} · ronda ${r.n} · ${L.relDay(r.dueDate, L.today(db))}</small></span>${raw(L.ROUND.badge(r.status))}</a></li>`)}</ul>` : '<p class="muted small">Nada por entregar.</p>'))}
        ${raw(card('Alertas', risks.length ? riskList(risks.slice(0, 5)) : '<p class="muted small">Sin alertas: todos al día 🎉</p>', { actions: risks.length ? '<a class="btn btn-sm btn-ghost" href="#/riesgo">Ver todo</a>' : '' }))}
        ${raw(card('Actividad reciente', activityFeed(db, { limit: 8 })))}
      </div>
    </div>`;
  view.querySelectorAll('[data-new]').forEach(b => b.addEventListener('click', () => pollas.form(null, ctx)));
}
function riskList(list) {
  return html`<ul class="g-risks">${list.map(r => html`<li class="lvl-${r.level}"><span class="badge badge-${r.level === 'alto' ? 'danger' : r.level === 'medio' ? 'warning' : 'info'}">Riesgo ${r.level}</span><div><a href="#/pollas/${r.p.id}/miembro/${r.member.id}"><b>${L.userName(db, r.member.userId)}</b></a> <small class="muted">· ${r.p.name}</small><p class="small" style="margin:2px 0 0">${r.text}</p>${r.debt ? html`<small class="g-bad">Deuda viva: ${money(r.debt)}</small>` : ''}</div></li>`)}</ul>`;
}

// ======================= Detalle de polla =======================
function pollaDetail(view, ctx) {
  const p = db.get('pollas', ctx.params.id), u = ctx.user;
  if (!p || !L.isStaff(p, u)) { view.innerHTML = emptyState({ icon: '🔎', title: 'Polla no encontrada', text: 'Puede que se haya eliminado o que no la gestiones.', action: '<a class="btn" href="#/pollas">← Pollas</a>' }); return; }
  const tab = ctx.query.tab || 'resumen', cfg = L.can(p, u, 'config');
  const req = db.count('members', m => m.pollaId === p.id && m.status === 'solicitud');
  const late = db.count('payments', x => x.pollaId === p.id && x.status === 'atrasado');
  const acts = [];
  if (cfg && p.status === 'borrador') acts.push('<button type="button" class="btn btn-primary" data-open>Abrir inscripciones</button>');
  if (p.status === 'inscripcion') acts.push('<button type="button" class="btn" data-invite>🔗 Invitar</button>');
  if (cfg && p.status === 'inscripcion') acts.push('<button type="button" class="btn btn-primary" data-start>▶ Iniciar polla</button>');
  if (p.status === 'en_curso' && L.can(p, u, 'recordatorios')) acts.push(`<a class="btn" href="#/recordatorios?polla=${p.id}">📣 Recordar</a>`);
  if (cfg && !['finalizada', 'cancelada'].includes(p.status)) acts.push('<button type="button" class="btn btn-ghost" data-edit>✎ Editar</button>');
  view.innerHTML = html`${back('#/pollas', 'Pollas')}
    ${pageHead(`${p.emoji} ${p.name}`, raw(`${L.POLLA.badge(p.status)} <span class="muted">· ${escape(p.code)} · ${escape(L.freqLabel(p))} · ${money(p.amount)} por cupo · ${escape(L.MODES[p.mode])}${p.treasurerId ? ' · tesorería: ' + escape(L.userName(db, p.treasurerId)) : ''}</span>`), acts.join(''))}
    <nav class="tabs g-tabs" aria-label="Secciones de la polla">${tabLink(p, 'resumen', 'Resumen', tab)}${p.status !== 'borrador' && p.status !== 'inscripcion' ? tabLink(p, 'rondas', 'Rondas', tab, late) : ''}${tabLink(p, 'miembros', 'Miembros', tab, req)}${tabLink(p, 'turnos', 'Turnos', tab)}${tabLink(p, 'libro', 'Libro', tab)}${tabLink(p, 'calendario', 'Calendario', tab)}${tabLink(p, 'muro', 'Muro', tab)}${tabLink(p, 'ajustes', 'Ajustes', tab)}</nav>
    <div class="g-tab-body" data-body></div>`;
  const body = view.querySelector('[data-body]');
  ({ resumen: tabResumen, rondas: tabRondas, miembros: tabMiembros, turnos: tabTurnos, libro: tabLibro, calendario: tabCal, muro: tabMuro, ajustes: tabAjustes }[tab] || tabResumen)(body, p, ctx);
  view.querySelector('[data-open]')?.addEventListener('click', e => once(e.currentTarget, () => tryDo(() => L.openPolla(db, p.id, u.id), 'Inscripciones abiertas: comparte el código')));
  view.querySelector('[data-invite]')?.addEventListener('click', () => inviteModal(p));
  view.querySelector('[data-start]')?.addEventListener('click', e => once(e.currentTarget, async () => { if (await confirm(`Se crearán ${p.cupos} rondas con sus cuotas y no se podrán cambiar cuota, frecuencia ni cupos. ¿Partimos?`, { title: `Iniciar ${p.name}`, ok: 'Iniciar polla' })) tryDo(() => L.startPolla(db, p.id, u.id), '¡La polla partió! 🎉'); }));
  view.querySelector('[data-edit]')?.addEventListener('click', () => pollas.form(p, ctx));
}
function inviteModal(p) {
  const url = inviteURL(p);
  const m = modal({ title: `Invitar a ${p.name}`, body: html`<div class="stack"><p class="muted" style="margin:0">Comparte el código o el enlace. Quien lo abra verá las reglas, la cuota y los cupos libres antes de unirse.</p>
    <div class="g-code-big"><small>Código</small><b>${p.code}</b></div>
    <div class="field"><label for="g-inv">Enlace</label><input class="input" id="g-inv" readonly value="${url}"></div>
    ${raw(V.bubble(`¡Hola! Te invito a la *${p.name}* 🐣 Cuota ${money(p.amount)} ${L.freqLabel(p).toLowerCase()}, pozo de ${money(L.potOf(p))}. Únete con el código *${p.code}* aquí: ${url}`))}</div>`,
    foot: '<button type="button" class="btn btn-ghost" data-close>Cerrar</button><button type="button" class="btn" data-c1>Copiar código</button><button type="button" class="btn btn-primary" data-c2>Copiar mensaje</button>' });
  m.el.querySelector('[data-c1]').onclick = () => copy(p.code);
  m.el.querySelector('[data-c2]').onclick = () => copy(`¡Hola! Te invito a la ${p.name} 🐣 Únete con el código ${p.code}: ${url}`);
}

function facts(p) {
  const dates = L.roundsOf(db, p.id);
  const end = dates.length ? dates.at(-1).dueDate : L.roundDate(p.startDate, p.frequency, p.cupos - 1, p.everyDays);
  return kv([['Cuota por cupo', money(p.amount)], ['Pozo por ronda', money(L.potOf(p))], ['Frecuencia', L.freqLabel(p)], ['Turnos', `${p.cupos} · ${L.MODES[p.mode]}${p.mode === 'remate' ? ` (puja máx. ${p.maxBidPct || 25}%)` : ''}`], ['Medios cupos', p.allowHalf ? 'Sí' : 'No'], ['Multa / gracia', `${money(p.lateFee)} · ${p.graceDays} día(s)`], ['Calendario', `${L.fdate(dates[0]?.dueDate || p.startDate)} → ${L.fdate(end)}`], ['Organiza', L.userName(db, p.organizerId)], ['Tesorería', p.treasurerId ? L.userName(db, p.treasurerId) : '—'], ['Inscripción', p.approval ? 'Con aprobación' : 'Libre con código']]);
}
function tabResumen(el, p, ctx) {
  const u = ctx.user;
  if (['borrador', 'inscripcion'].includes(p.status)) {
    const n = db.count('slots', s => s.pollaId === p.id), slots = L.slotsOf(db, p.id), req = db.count('members', m => m.pollaId === p.id && m.status === 'solicitud');
    const checks = [
      [p.status === 'inscripcion', 'Inscripciones abiertas', p.status === 'borrador' ? 'Ábrelas para que la gente se sume con el código' : `Código ${p.code}`],
      [L.isFull(db, p), `Cupos completos (${n}/${p.cupos})`, L.halfOpen(db, p) ? 'Hay un medio cupo esperando pareja' : n < p.cupos ? `Faltan ${p.cupos - n}` : 'Listo'],
      [!req, 'Solicitudes respondidas', req ? `${req} por responder en Miembros` : 'Ninguna pendiente'],
      [p.mode === 'remate' || (slots.length && slots.every(s => s.turn)), 'Turnos asignados', p.mode === 'remate' ? 'Se rematan ronda a ronda' : p.mode === 'sorteo' ? (p.draw ? `Sorteo hecho (${p.draw.seed})` : 'Haz el sorteo en la pestaña Turnos') : p.mode === 'fijo' ? 'Ordénalos en la pestaña Turnos' : 'Cada quien eligió al unirse'],
      [!!String(p.paymentInfo || '').trim(), 'Datos para pagar', p.paymentInfo ? 'Ingresados' : 'Agrégalos editando la polla']
    ];
    el.innerHTML = html`<div class="k-grid-main"><div class="stack">
      ${raw(card('Antes de partir', html`<ul class="g-checks big">${checks.map(([ok, t, d]) => html`<li class="${ok ? 'ok' : 'todo'}"><span aria-hidden="true">${ok ? '✓' : '○'}</span><div><b>${t}</b><small class="muted" style="display:block">${d}</small></div></li>`)}</ul>`, { sub: `La polla parte el ${L.fdate(p.startDate)}` }))}
      ${raw(card('Cupos', V.turnsList(p, {}), { actions: `<a class="btn btn-sm" href="#/pollas/${p.id}?tab=miembros">Gestionar miembros</a>` }))}
    </div><div class="stack">
      ${p.status === 'inscripcion' ? raw(card('Invitación', html`<div class="g-code-big"><small>Código para unirse</small><b>${p.code}</b></div><button type="button" class="btn btn-block" data-inv>🔗 Compartir invitación</button>`)) : ''}
      ${raw(card('Datos de la polla', facts(p)))}
    </div></div>`;
    el.querySelector('[data-inv]')?.addEventListener('click', () => inviteModal(p));
    return;
  }
  const r = L.currentRound(db, p.id), rec = L.reconcile(db, p.id), risks = L.risks(db, p.id).map(x => ({ ...x, p }));
  el.innerHTML = html`<div class="k-grid-main"><div class="stack">
      ${r && p.status === 'en_curso' ? raw(card('Ronda actual', html`${V.roundSummary(r, p)}${paymentsTable(p, r, u, { compact: true })}`, { actions: `<a class="btn btn-sm" href="#/pollas/${p.id}/ronda/${r.id}">Abrir ronda</a>` })) : ''}
      ${p.status === 'cancelada' && p.settlement ? raw(card('Liquidación por término anticipado', settlementTable(p.settlement), { sub: `Motivo: ${escape(p.history.at(-1)?.note || '')}` })) : ''}
      ${p.status === 'finalizada' ? raw(card('', emptyState({ icon: '🎉', title: 'Polla finalizada', text: `Se entregaron los ${p.cupos} pozos${rec.fondoOut ? ` y se repartieron ${money(rec.fondoOut)} del fondo común` : ''}. Todo cuadró.` }))) : ''}
      ${raw(card('Turnos', V.turnsList(p, { compact: true })))}
    </div><div class="stack">
      ${risks.length ? raw(card('Alertas de riesgo', riskList(risks))) : ''}
      <section class="card g-recon-mini ${rec.ok ? 'is-ok' : 'is-bad'}"><div class="row between"><b>${rec.ok ? '✓ Libro cuadrado' : '✕ Revisa el libro'}</b><a class="small" href="#/pollas/${p.id}?tab=libro">Ver libro</a></div><div class="g-recon-nums"><div><small>Caja</small><b>${money(rec.cash.caja)}</b></div><div><small>Fondo multas</small><b>${money(rec.fondo)}</b></div></div></section>
      ${raw(card('Datos de la polla', facts(p)))}
    </div></div>`;
  wirePayments(el, p, u);
}
function settlementTable(s) {
  return html`<div class="table-wrap"><table class="table"><thead><tr><th>Persona</th><th class="k-num">Aportó</th><th class="k-num">Recibió</th><th class="k-num">Se le devuelve</th><th class="k-num">Queda por recibir</th><th class="k-num">Debe</th></tr></thead><tbody>
    ${s.rows.map(r => html`<tr><td>${who(r.userId)}</td><td class="k-num">${money(r.aportado)}</td><td class="k-num">${money(r.recibido)}</td><td class="k-num g-ok">${r.refund ? money(r.refund) : '—'}</td><td class="k-num">${r.pendingIn ? money(r.pendingIn) : '—'}</td><td class="k-num ${r.owes ? 'g-bad' : ''}">${r.owes ? money(r.owes) : '—'}</td></tr>`)}
  </tbody></table></div><p class="small muted" style="margin:8px 0 0">Caja al cerrar: ${money(s.caja)}. Se devolvió en proporción a lo que se le debía a cada persona; quienes recibieron antes de pagar todo quedan debiendo la diferencia.</p>`;
}

// ---- tabla de pagos de una ronda con acciones ----
function paymentsTable(p, r, u, { compact = false } = {}) {
  const pays = db.query('payments', x => x.roundId === r.id && x.status !== 'anulado').sort((a, b) => ['atrasado', 'informado', 'rechazado', 'pendiente', 'cubierto', 'confirmado', 'regularizado'].indexOf(a.status) - ['atrasado', 'informado', 'rechazado', 'pendiente', 'cubierto', 'confirmado', 'regularizado'].indexOf(b.status) || L.userName(db, a.userId).localeCompare(L.userName(db, b.userId)));
  const canPay = L.can(p, u, 'pagos'), live = p.status === 'en_curso';
  const A = (act, id, label, cls = '') => html`<button type="button" class="btn btn-sm ${cls}" data-pact="${act}" data-id="${id}">${label}</button>`;
  return html`<div class="table-wrap" style="margin-top:12px"><table class="table g-pays"><thead><tr><th>Persona</th><th class="k-num">Cuota</th><th>Estado</th>${compact ? '' : raw('<th>Detalle</th>')}<th></th></tr></thead><tbody>
  ${pays.map(x => {
    const fee = x.feeWaived ? 0 : x.lateFee || 0, m = db.get('members', x.memberId), s = m && L.slotOfMember(db, m);
    const acts = !canPay || !live ? [] : x.status === 'informado' ? [A('ok', x.id, '✓ Confirmar', 'btn-primary'), A('no', x.id, 'Rechazar', 'btn-ghost')]
      : ['pendiente', 'atrasado', 'rechazado'].includes(x.status) ? (compact ? [A('cash', x.id, 'Registrar pago'), A('remind', x.id, '📣', 'btn-ghost')] : [A('cash', x.id, 'Registrar pago'), A('cover', x.id, 'Cubrir', 'btn-ghost'), fee ? A('waive', x.id, 'Condonar multa', 'btn-ghost') : '', A('remind', x.id, '📣', 'btn-ghost')])
        : x.status === 'cubierto' ? [A('settle', x.id, x.debtReported ? '✓ Regularizar (avisó pago)' : 'Regularizar deuda', x.debtReported ? 'btn-primary' : '')] : [];
    return html`<tr class="st-${x.status}"><td><a class="g-link" href="#/pollas/${p.id}/miembro/${x.memberId}">${who(x.userId)}</a>${s?.half ? html`<small class="muted" style="display:block">medio cupo ${s.code}</small>` : ''}</td>
      <td class="k-num">${money(x.amount)}${fee ? html`<small class="g-bad" style="display:block">+ multa ${money(fee)}</small>` : x.feeWaived ? html`<small class="muted" style="display:block">multa condonada</small>` : ''}</td>
      <td>${raw(L.PAY.badge(x.status))}</td>
      ${compact ? '' : html`<td class="small">${x.status === 'informado' ? html`${x.method === 'efectivo' ? '💵 Efectivo' : `🏦 ${x.ref || 'sin N°'}`}${x.file ? html` · 📎 ${x.file}` : ''}<small class="muted" style="display:block">informado ${ago(x.reportedAt)}</small>` : x.receipt ? html`<a href="#/comprobante/${x.receipt}">${x.receipt}</a><small class="muted" style="display:block">${dateTime(x.confirmedAt)}</small>` : x.status === 'cubierto' ? html`Cubrió ${L.userName(db, x.coveredBy)}` : x.status === 'rechazado' ? (x.history.at(-1)?.note || '') : ''}</td>`}
      <td><div class="k-acts g-wrap-acts">${acts}</div></td></tr>`;
  })}</tbody></table></div>`;
}
// Acciones sobre cuotas (delegadas). Los permisos se revisan con la polla de cada pago.
function wirePayments(el, _p, u) {
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-pact]');
    if (!b) return;
    const x = db.get('payments', b.dataset.id);
    const p = x && L.pollaOf(db, x.pollaId);
    if (!x || !allow(p, b.dataset.pact === 'remind' ? 'recordatorios' : 'pagos')) return;
    const name = L.userName(db, x.userId), r = db.get('rounds', x.roundId);
    const run = fn => once(b, fn);
    ({
      ok: () => run(() => { const c = tryDo(() => L.confirmPayment(db, x.id, u.id)); if (c) toast(`Pago de ${name} confirmado · ${c}`, 'success'); }),
      no: () => run(async () => { const v = await fieldsModal({ title: `Rechazar pago de ${name}`, size: '', submit: 'Rechazar', fields: [{ name: 'note', label: 'Motivo (lo verá la persona)', type: 'textarea', required: true, placeholder: 'Ej: no llegó la transferencia, el monto no calza' }] }); if (v) tryDo(() => L.rejectPayment(db, x.id, u.id, v.note), 'Pago rechazado y persona avisada'); }),
      cash: () => run(async () => { const v = await fieldsModal({ title: `Registrar pago de ${name} · ronda ${r.n}`, size: '', submit: 'Registrar y confirmar', intro: `Total: <b>${money(x.amount + (x.feeWaived ? 0 : x.lateFee || 0))}</b>${x.lateFee && !x.feeWaived ? ' (incluye multa)' : ''}`, fields: [{ name: 'method', label: 'Medio', type: 'select', required: true, options: [['efectivo', 'Efectivo'], ['transferencia', 'Transferencia']] }, { name: 'ref', label: 'N° de operación (si es transferencia)' }] }); if (v) { db.update('payments', x.id, { method: v.method, ref: v.ref }); const c = tryDo(() => L.confirmPayment(db, x.id, u.id, { method: v.method })); if (c) toast(`Registrado · comprobante ${c}`, 'success'); } }),
      cover: () => run(async () => {
        const staff = [p.organizerId, p.treasurerId].filter(Boolean);
        const v = await fieldsModal({ title: `Cubrir la cuota de ${name}`, size: '', submit: 'Cubrir cuota', intro: `Alguien adelanta <b>${money(x.amount)}</b> para que el pozo de la ronda ${r.n} no se atrase. ${escape(name)} queda debiéndole esa cuota${x.lateFee && !x.feeWaived ? ' más la multa' : ''}.`,
          fields: [{ name: 'by', label: 'Quién adelanta la plata', type: 'select', required: true, options: [...staff, ...L.membersOf(db, p.id).map(m => m.userId).filter(id => !staff.includes(id) && id !== x.userId)].map(id => [id, L.userName(db, id)]) }, { name: 'note', label: 'Nota', placeholder: 'Ej: no contesta, se acordó cubrir' }] });
        if (v) tryDo(() => L.coverPayment(db, x.id, v.by, u.id, v.note), 'Cuota cubierta: queda registrada la deuda');
      }),
      settle: () => run(async () => { if (await confirm(`${name} paga ${money(x.amount + (x.feeWaived ? 0 : x.lateFee || 0))} y se le devuelve el anticipo a ${L.userName(db, x.coveredBy)}.`, { title: 'Regularizar deuda', ok: 'Regularizar' })) { const c = tryDo(() => L.settleDebt(db, x.id, u.id)); if (c) toast(`Deuda regularizada · ${c}`, 'success'); } }),
      waive: () => run(async () => { const v = await fieldsModal({ title: `Condonar multa de ${name}`, size: '', submit: 'Condonar', fields: [{ name: 'note', label: 'Motivo', placeholder: 'Ej: se le cayó el banco ese día' }] }); if (v) tryDo(() => L.waiveFee(db, x.id, u.id, v.note), 'Multa condonada'); }),
      remind: () => remindOne(p, x.userId, u)
    }[b.dataset.pact] || (() => {}))();
  });
}
async function remindOne(p, userId, u) {
  if (!allow(p, 'recordatorios')) return;
  const tpls = db.query('templates', t => t.active !== false);
  const late = db.find('payments', x => x.pollaId === p.id && x.userId === userId && x.status === 'atrasado');
  const def = (late ? tpls.find(t => t.name.includes('atrasada')) : tpls.find(t => t.channel === 'whatsapp')) || tpls[0];
  const v = await fieldsModal({ title: `Recordar a ${L.userName(db, userId)}`, size: '', submit: 'Enviar', intro: html`${raw(V.bubble(L.renderTemplate(def.text, L.reminderVars(db, p.id, userId)), def.channel))}`,
    fields: [{ name: 'tpl', label: 'Plantilla', type: 'select', required: true, options: tpls.map(t => [t.id, `${t.name} (${t.channel === 'email' ? 'correo' : 'WhatsApp'})`]), default: def.id }] });
  if (v) tryDo(() => L.sendReminders(db, { pollaId: p.id, userIds: [userId], templateId: v.tpl, by: u.id }), 'Recordatorio enviado (simulado)');
}

// ---- Rondas ----
function tabRondas(el, p) {
  const rounds = L.roundsOf(db, p.id);
  el.innerHTML = rounds.length ? html`<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Fecha</th><th>Recibe</th><th style="min-width:160px">Recaudación</th><th>Estado</th><th></th></tr></thead><tbody>
    ${rounds.map(r => { const st = L.roundStats(db, r), s = r.slotId && db.get('slots', r.slotId); return html`<tr data-href="#/pollas/${p.id}/ronda/${r.id}" style="cursor:pointer"><td><b>${r.n}</b></td><td class="k-nowrap">${L.fdate(r.dueDate)}${(r.dateChanges || []).length ? html` <span class="badge badge-warning" title="Fecha original: ${L.fdate(r.originalDate)}">movida</span>` : ''}</td><td>${s ? L.slotLabel(db, s) : html`<span class="muted">${p.mode === 'remate' ? 'por rematar' : '—'}</span>`}${r.discount ? html`<small class="muted" style="display:block">descuento ${money(r.discount)}</small>` : ''}</td><td><small>${money(st.collected)} / ${money(st.expected)}</small>${raw(V.bar(st.pct, st.late.length ? 'danger' : ''))}</td><td>${raw(L.ROUND.badge(r.status))}${st.late.length ? html` <span class="badge badge-danger">${st.late.length} atrasada(s)</span>` : ''}</td><td><a class="btn btn-sm btn-ghost" href="#/pollas/${p.id}/ronda/${r.id}">Abrir</a></td></tr>`; })}
  </tbody></table></div></section>` : emptyState({ icon: '📅', title: 'Las rondas se crean al iniciar la polla' });
  el.querySelectorAll('[data-href]').forEach(tr => tr.addEventListener('click', e => { if (!e.target.closest('a,button')) location.hash = tr.dataset.href; }));
}

// ---- Miembros ----
function tabMiembros(el, p, ctx) {
  const u = ctx.user, cfg = L.can(p, u, 'config');
  const members = L.membersOf(db, p.id), reqs = db.query('members', m => m.pollaId === p.id && m.status === 'solicitud'), gone = db.query('members', m => m.pollaId === p.id && ['reemplazado', 'retirado'].includes(m.status));
  const open = ['borrador', 'inscripcion'].includes(p.status), live = p.status === 'en_curso';
  el.innerHTML = html`<div class="stack">
    ${reqs.length ? raw(card(`Solicitudes para unirse (${reqs.length})`, html`<ul class="g-list">${reqs.map(m => { const rep = L.reputation(db, m.userId); return html`<li class="g-req">${raw(av(V.U(m.userId), 38))}<div style="flex:1;min-width:0"><b>${L.userName(db, m.userId)}</b> ${raw(V.repBadge(m.userId))}<small class="muted" style="display:block">${m.wantHalf ? 'Medio cupo' : 'Cupo completo'}${m.wantTurn ? ` · quiere el turno ${m.wantTurn}` : ''} · ${rep.pollas} polla(s), ${rep.onTime}/${rep.done} pagos a tiempo · ${ago(m.joinedAt)}</small></div>${cfg ? html`<div class="row" style="gap:6px"><button type="button" class="btn btn-sm btn-primary" data-acc="${m.id}">Aceptar</button><button type="button" class="btn btn-sm btn-ghost" data-rej="${m.id}">Rechazar</button></div>` : ''}</li>`; })}</ul>`, { sub: 'Revisa su reputación en otras pollas antes de aceptar.' })) : ''}
    <section class="card"><div class="k-card-head"><div><h3>Miembros (${members.length})</h3><p>${db.count('slots', s => s.pollaId === p.id)}/${p.cupos} cupos ocupados${L.halfOpen(db, p) ? ' · hay un medio cupo esperando pareja' : ''}</p></div><div class="row" style="gap:6px">${cfg && open ? raw('<button type="button" class="btn btn-sm btn-primary" data-add>＋ Sumar participante</button>') : ''}<button type="button" class="btn btn-sm" data-csv>⇩ CSV</button></div></div>
      ${members.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Persona</th><th>Cupo</th><th>Turno</th><th class="k-num">Cuota</th>${live ? raw('<th>Pagos</th><th class="k-num">Deuda</th>') : ''}<th></th></tr></thead><tbody>
      ${members.sort((a, b) => (L.slotOfMember(db, a)?.turn ?? 99) - (L.slotOfMember(db, b)?.turn ?? 99)).map(m => { const s = L.slotOfMember(db, m), pays = db.query('payments', x => x.memberId === m.id), paid = pays.filter(x => L.PAID.includes(x.status)).length, debt = L.debtOf(db, p.id, m.userId), got = L.received(db, s); return html`<tr><td><a class="g-link" href="#/pollas/${p.id}/miembro/${m.id}">${who(m.userId)}</a> ${raw(V.repBadge(m.userId))}${m.userId === p.organizerId ? raw(' <span class="badge badge-primary">organiza</span>') : m.userId === p.treasurerId ? raw(' <span class="badge badge-info">tesorería</span>') : ''}${m.replaces ? html`<small class="muted" style="display:block">reemplazó a ${L.userName(db, db.get('members', m.replaces)?.userId)}</small>` : ''}</td><td>${s?.code}${s?.half ? raw(' <span class="badge">½</span>') : ''}</td><td>${s?.turn ?? '—'}${got ? raw(' <span class="badge badge-success">recibió</span>') : ''}</td><td class="k-num">${money(L.cuotaOf(db, m))}</td>${live ? html`<td><small>${paid}/${pays.length}</small>${raw(V.bar(V.pct(paid, pays.length)))}</td><td class="k-num">${debt ? html`<b class="g-bad">${money(debt)}</b>` : '—'}</td>` : ''}<td><div class="k-acts">${cfg && (open || live) ? html`<button type="button" class="btn btn-sm btn-ghost" data-rep="${m.id}" title="Reemplazar">⇄ Reemplazar</button>` : ''}${cfg && open && m.userId !== p.organizerId ? html`<button type="button" class="btn btn-sm btn-ghost" data-out="${m.id}" title="Retirar">✕</button>` : ''}</div></td></tr>`; })}
      </tbody></table></div>` : raw(emptyState({ icon: '👥', title: 'Aún no se suma nadie', text: p.status === 'borrador' ? 'Abre las inscripciones y comparte el código.' : `Comparte el código ${p.code}.` }))}
    </section>
    ${gone.length ? raw(card('Historial de salidas', timeline(gone.map(m => ({ at: m.leftAt || m.updatedAt, title: `${L.userName(db, m.userId)} · ${m.status === 'reemplazado' ? 'reemplazado/a' : 'se retiró'}`, text: m.replacedBy ? `por ${L.userName(db, db.get('members', m.replacedBy)?.userId)}${m.note ? ' · ' + m.note : ''}` : m.note || '' }))))) : ''}
  </div>`;
  el.querySelectorAll('[data-acc]').forEach(b => b.addEventListener('click', () => once(b, () => tryDo(() => L.approveRequest(db, b.dataset.acc, u.id, true), 'Solicitud aceptada'))));
  el.querySelectorAll('[data-rej]').forEach(b => b.addEventListener('click', () => once(b, async () => { const v = await fieldsModal({ title: 'Rechazar solicitud', size: '', submit: 'Rechazar', fields: [{ name: 'note', label: 'Mensaje para la persona', placeholder: 'Ej: ya completamos los cupos con la familia' }] }); if (v) tryDo(() => L.approveRequest(db, b.dataset.rej, u.id, false, v.note), 'Solicitud rechazada'); })));
  el.querySelectorAll('[data-out]').forEach(b => b.addEventListener('click', () => once(b, async () => { if (await confirm(`¿Retirar a ${L.userName(db, db.get('members', b.dataset.out).userId)} de la polla?`, { title: 'Retirar', ok: 'Retirar', danger: true })) tryDo(() => L.removeMember(db, b.dataset.out, u.id), 'Retirado/a'); })));
  el.querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => replaceModal(p, db.get('members', b.dataset.rep), u)));
  el.querySelector('[data-add]')?.addEventListener('click', () => addMemberModal(p, u));
  el.querySelector('[data-csv]').addEventListener('click', () => downloadCSV(`${p.code}-miembros.csv`, members.map(m => { const s = L.slotOfMember(db, m), pos = L.positions(db, p.id).find(x => x.userId === m.userId) || {}; return { nombre: L.userName(db, m.userId), correo: V.U(m.userId)?.email, telefono: V.U(m.userId)?.phone, cupo: s?.code, turno: s?.turn ?? '', cuota: L.cuotaOf(db, m), aportado: pos.aportado || 0, recibido: pos.recibido || 0, neto: pos.net || 0, deuda: L.debtOf(db, p.id, m.userId) }; })));
}
function userOptions(p) {
  const inside = new Set(db.query('members', m => m.pollaId === p.id && ['activo', 'solicitud'].includes(m.status)).map(m => m.userId));
  return db.query('users', x => x.role !== 'admin' && x.active !== false && !inside.has(x.id)).sort((a, b) => a.name.localeCompare(b.name)).map(x => [x.id, `${x.name} · ★ ${L.reputation(db, x.id).score}`]);
}
function newUser(v) {
  if (!v.newName || v.newName.trim().length < 3) throw new Error('Escribe el nombre de la persona nueva');
  const email = (v.newEmail || '').trim().toLowerCase() || `${v.newName.trim().toLowerCase().normalize('NFD').replace(/[^a-z]+/g, '.')}${Math.floor(Math.random() * 900 + 100)}@correo.cl`;
  if (db.find('users', x => x.email.toLowerCase() === email)) throw new Error('Ya existe una cuenta con ese correo: elígela de la lista');
  const nu = db.insert('users', { name: v.newName.trim(), email, phone: v.newPhone || '', password: 'demo123', role: 'participante', color: ['#b45309', '#0f766e', '#be123c', '#4338ca'][db.count('users') % 4], demo: false, active: true });
  db.log('usuario', `Cuenta creada por invitación: ${nu.name}`, me()?.id);
  return nu.id;
}
async function addMemberModal(p, u) {
  const free = Array.from({ length: p.cupos }, (_, i) => i + 1).filter(t => !L.takenTurns(db, p).includes(t));
  await fieldsModal({ title: `Sumar a ${p.name}`, submit: 'Sumar', intro: 'Elige una cuenta existente o crea una nueva (recibirá una invitación simulada).',
    fields: [
      { name: 'userId', label: 'Persona existente', type: 'select', options: userOptions(p) },
      { name: 'newName', label: '…o nombre de alguien nuevo' }, { name: 'newPhone', label: 'Teléfono', type: 'tel' }, { name: 'newEmail', label: 'Correo', type: 'email' },
      p.allowHalf ? { name: 'half', label: 'Medio cupo (comparte con otra persona)', type: 'bool' } : null,
      p.mode === 'llegada' ? { name: 'turn', label: 'Turno', type: 'select', options: free.map(t => [t, `Turno ${t}`]) } : null
    ].filter(Boolean),
    onSubmit: v => { try { const uid = v.userId || newUser(v); L.joinPolla(db, p.id, uid, { half: !!v.half, turn: v.turn ? +v.turn : null, by: u.id, viaCode: false }); toast('Sumado/a a la polla', 'success'); return true; } catch (e) { return e.message; } } });
}
async function replaceModal(p, m, u) {
  const s = L.slotOfMember(db, m);
  if (p.status === 'en_curso' && L.received(db, s)) return toast('Este cupo ya recibió el pozo: no se puede traspasar. Cubre sus cuotas y registra la deuda.', 'warning');
  const paid = db.query('movements', x => x.pollaId === p.id && x.memberId === m.id && x.type === 'aporte').reduce((t, x) => t + x.amount, 0);
  await fieldsModal({ title: `Reemplazar a ${L.userName(db, m.userId)} (${s.code}${s.turn ? ', turno ' + s.turn : ''})`, submit: 'Reemplazar',
    intro: p.status === 'en_curso' ? `La persona nueva hereda el cupo, el turno y las cuotas que faltan. ${paid ? `Además devuelve <b>${money(paid)}</b> que ${escape(L.userName(db, m.userId))} ya aportó (queda en el libro como traspaso).` : ''}` : 'La persona nueva toma el cupo tal cual.',
    fields: [{ name: 'userId', label: 'Persona existente', type: 'select', options: userOptions(p) }, { name: 'newName', label: '…o nombre de alguien nuevo' }, { name: 'newPhone', label: 'Teléfono', type: 'tel' }, { name: 'newEmail', label: 'Correo', type: 'email' }, { name: 'note', label: 'Motivo', type: 'textarea', required: true, placeholder: 'Ej: se cambió de ciudad' }],
    onSubmit: v => { try { const uid = v.userId || newUser(v); L.replaceMember(db, m.id, uid, { by: u.id, note: v.note }); toast('Reemplazo registrado', 'success'); return true; } catch (e) { return e.message; } } });
}

// ---- Turnos ----
function tabTurnos(el, p, ctx) {
  const u = ctx.user, cfg = L.can(p, u, 'config'), pre = ['borrador', 'inscripcion'].includes(p.status);
  if (p.mode === 'sorteo' && pre && !p.draw) {
    const full = L.isFull(db, p), input = L.drawInput(db, p.id);
    el.innerHTML = html`<div class="k-grid-main"><section class="card"><div class="k-card-head"><div><h3>🎲 Sorteo verificable</h3><p>El orden sale de una semilla pública: cualquiera puede repetirlo y obtener lo mismo.</p></div></div>
      <div data-stage>${full ? html`<ol class="g-draw-input">${input.map(x => html`<li>${x.label}</li>`)}</ol>` : raw(emptyState({ icon: '🪑', title: 'Faltan cupos', text: `Para sortear deben estar los ${p.cupos} cupos ocupados (${db.count('slots', s => s.pollaId === p.id)} hoy).` }))}</div>
      ${full && cfg ? raw('<div class="row" style="margin-top:14px"><button type="button" class="btn btn-primary btn-lg" data-draw>🎲 Realizar sorteo en vivo</button></div>') : ''}
    </section><section class="card"><h3 style="margin-top:0">¿Cómo funciona?</h3><ol class="small g-howto"><li>La lista de cupos se ordena por código (C01, C02…).</li><li>Se genera una semilla al azar, por ejemplo <code>COPIHUE-4821-ALERCE</code>, y se publica.</li><li>Con esa semilla se baraja la lista (algoritmo Fisher–Yates con un generador determinista).</li><li>Cualquiera puede pegar la semilla y la lista en <a href="index.html#/verificar">Verificar sorteo</a> y obtener el mismo orden.</li></ol></section></div>`;
    el.querySelector('[data-draw]')?.addEventListener('click', e => once(e.currentTarget, async () => {
      if (!await confirm('El resultado es definitivo y queda publicado con su semilla.', { title: 'Realizar sorteo', ok: 'Sortear' })) return;
      const seed = L.newSeed(), input2 = L.drawInput(db, p.id), order = L.shuffle(input2, seed);
      e.currentTarget?.remove?.();
      V.drawStage(el.querySelector('[data-stage]'), order, { seed, onDone: () => { tryDo(() => L.draw(db, p.id, u.id, seed), '¡Sorteo listo! Todos fueron notificados'); } });
    }));
    return;
  }
  if (p.mode === 'fijo' && pre) {
    let order = L.slotsOf(db, p.id).sort((a, b) => (a.turn ?? 999) - (b.turn ?? 999) || a.code.localeCompare(b.code)).map(s => s.id);
    const paint = () => {
      el.querySelector('[data-order]').innerHTML = order.map((id, i) => { const s = db.get('slots', id); return html`<li class="g-drag" draggable="${cfg ? 'true' : 'false'}" data-sid="${id}"><span class="g-turn-n">${i + 1}</span><span class="g-turn-who">${V.avStack(V.holders(s).map(m => V.U(m.userId)))}<b>${L.slotLabel(db, s)}</b></span><span class="row" style="gap:4px">${cfg ? html`<button type="button" class="btn btn-sm btn-ghost btn-icon" data-up="${i}" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="btn btn-sm btn-ghost btn-icon" data-down="${i}" aria-label="Bajar" ${i === order.length - 1 ? 'disabled' : ''}>↓</button>` : ''}<span class="g-grip" aria-hidden="true">⋮⋮</span></span></li>`; }).join('');
    };
    el.innerHTML = html`<section class="card"><div class="k-card-head"><div><h3>↕️ Orden de turnos</h3><p>Arrastra o usa las flechas. El primero recibe el ${L.fdate(p.startDate)}.</p></div>${cfg ? raw('<button type="button" class="btn btn-primary" data-save>Guardar orden</button>') : ''}</div>
      ${order.length ? raw('<ol class="g-turns g-dnd" data-order></ol>') : raw(emptyState({ icon: '🪑', title: 'Aún no hay cupos tomados' }))}</section>`;
    if (!order.length) return;
    paint();
    const list = el.querySelector('[data-order]');
    let dragId = null;
    list.addEventListener('dragstart', e => { dragId = e.target.closest('[data-sid]')?.dataset.sid; e.dataTransfer.effectAllowed = 'move'; e.target.classList.add('is-drag'); });
    list.addEventListener('dragover', e => { e.preventDefault(); });
    list.addEventListener('drop', e => { e.preventDefault(); const to = e.target.closest('[data-sid]')?.dataset.sid; if (!dragId || !to || dragId === to) return; const a = order.indexOf(dragId), b = order.indexOf(to); order.splice(b, 0, order.splice(a, 1)[0]); paint(); });
    list.addEventListener('dragend', () => list.querySelectorAll('.is-drag').forEach(x => x.classList.remove('is-drag')));
    list.addEventListener('click', e => { const up = e.target.closest('[data-up]'), dn = e.target.closest('[data-down]'); const i = up ? +up.dataset.up : dn ? +dn.dataset.down : -1; if (i < 0) return; const j = up ? i - 1 : i + 1; [order[i], order[j]] = [order[j], order[i]]; paint(); });
    el.querySelector('[data-save]')?.addEventListener('click', e => once(e.currentTarget, () => tryDo(() => L.setOrder(db, p.id, order, u.id), 'Orden guardado')));
    return;
  }
  const d = p.draw;
  el.innerHTML = html`<div class="k-grid-main"><section class="card"><div class="k-card-head"><div><h3>Turnos</h3><p>${L.MODES[p.mode]}${p.mode === 'llegada' ? ' · cada quien eligió su turno al unirse' : ''}</p></div></div>${V.turnsList(p, {})}</section>
    <div class="stack">${d ? raw(card('🎲 Sorteo', html`<div class="g-draw-seed"><small>Semilla</small><code>${d.seed}</code></div><p class="small muted">Realizado ${dateTime(d.at)} por ${L.userName(db, d.by)}.</p><a class="btn btn-sm" href="index.html#/verificar?seed=${encodeURIComponent(d.seed)}&list=${encodeURIComponent(d.input.join('\n'))}">Verificar en el sitio</a>`)) : ''}
    ${p.mode === 'remate' && p.status === 'en_curso' ? raw(card('🔨 Remate', html`<p class="small muted" style="margin-top:0">Cada ronda se adjudica a la mejor puja (descuento). El descuento se reparte en partes iguales entre los demás cupos al entregar el pozo.</p>${(() => { const r = L.roundsOf(db, p.id).find(x => !x.slotId); return r ? html`<a class="btn btn-sm btn-primary" href="#/pollas/${p.id}/ronda/${r.id}">Ver pujas de la ronda ${r.n} (${(r.bids || []).length})</a>` : ''; })()}`)) : ''}
    ${raw(card('Cambios de turno', swapsMini(p)))}</div></div>`;
}
function swapsMini(p) {
  const list = db.query('swaps', s => s.pollaId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!list.length) return '<p class="small muted">Nadie ha pedido cambios.</p>';
  return html`<ul class="g-list">${list.slice(0, 5).map(s => html`<li><span style="flex:1"><b>${L.userName(db, s.fromUserId)}</b> turno ${s.fromTurn} ↔ ${s.toTurn} ${L.slotLabel(db, db.get('slots', s.toSlotId))}</span>${raw(L.SWAP.badge(s.status))}</li>`)}</ul><a class="small" href="#/cambios">Gestionar solicitudes</a>`;
}

// ---- Libro ----
function tabLibro(el, p) {
  el.innerHTML = html`<div class="stack">${raw(V.reconcileCard(p.id))}
    ${raw(card('Posición de cada persona', V.positionsTable(p.id, { href: uid => { const m = db.find('members', x => x.pollaId === p.id && x.userId === uid); return m ? `#/pollas/${p.id}/miembro/${m.id}` : '#'; } })))}
    ${raw(card('Libro de movimientos', V.ledgerTable(p.id), { sub: 'Cada peso que entra o sale de la caja, con su saldo acumulado', actions: '<button type="button" class="btn btn-sm" data-csv>⇩ CSV</button>' }))}</div>`;
  el.querySelector('[data-csv]').addEventListener('click', () => { let caja = 0; const rows = L.movesOf(db, p.id).map(m => { caja += m.dir === 'in' ? m.amount : -m.amount; return { fecha: m.at, tipo: L.MOVE[m.type].label, ronda: db.get('rounds', m.roundId)?.n ?? '', persona: L.userName(db, m.userId), entra: m.dir === 'in' ? m.amount : '', sale: m.dir === 'out' ? m.amount : '', caja, nota: m.note, comprobante: m.ref || '' }; }); if (!rows.length) return toast('Sin movimientos', 'warning'); downloadCSV(`${p.code}-libro.csv`, rows); toast(`Exportados ${rows.length} movimientos`, 'success'); });
}
function tabCal(el, p, ctx) { el.innerHTML = card('', V.calendar(V.pollaEvents([p], { link: (pp, r) => `#/pollas/${pp.id}/ronda/${r.id}` }), monthOf(ctx.query), `#/pollas/${p.id}?tab=calendario`)); }
function tabMuro(el, p, ctx) { el.innerHTML = card('Muro de la gallada', V.wallHTML(p.id, ctx.user, { staff: true }), { sub: 'Todos los miembros lo ven en su app' }); V.mountWall(el, p.id, ctx.user); }

// ---- Ajustes / ciclo de vida ----
function tabAjustes(el, p, ctx) {
  const u = ctx.user, cfg = L.can(p, u, 'config');
  const rounds = L.roundsOf(db, p.id), allDone = rounds.length && rounds.every(r => ['entregada', 'confirmada'].includes(r.status));
  el.innerHTML = html`<div class="k-grid-main"><div class="stack">
      ${raw(card('Datos de la polla', facts(p), { actions: cfg && !['finalizada', 'cancelada'].includes(p.status) ? '<button type="button" class="btn btn-sm" data-edit>✎ Editar</button>' : '' }))}
      ${raw(card('Reglas', `<p class="g-pre">${escape(p.rules || 'Sin reglas escritas.')}</p><p class="small muted"><b>Para pagar:</b> ${escape(p.paymentInfo || '—')}</p>`))}
      ${raw(card('Historial de estados', historyTimeline(p.history || [], L.POLLA, { users: id => L.userName(db, id) })))}
    </div><div class="stack">
      ${cfg ? raw(card('Acciones', html`<div class="stack" style="gap:10px">
        ${p.status === 'inscripcion' ? html`<button type="button" class="btn" data-draft>↩ Volver a borrador (cerrar inscripciones)</button>` : ''}
        ${p.status === 'en_curso' ? html`<button type="button" class="btn btn-primary" data-finish ${allDone ? '' : 'disabled'}>🏁 Finalizar y repartir fondo</button><small class="muted">${allDone ? 'Todos los pozos entregados.' : `Se habilita cuando se entreguen las ${p.cupos} rondas.`}</small>` : ''}
        ${!['finalizada', 'cancelada'].includes(p.status) ? html`<button type="button" class="btn btn-danger" data-cancel>⏹ Terminar antes (liquidar)</button><small class="muted">Devuelve la caja a quienes aportaron más de lo recibido y deja registrada la deuda del resto.</small>` : ''}
        ${['borrador', 'inscripcion'].includes(p.status) ? html`<button type="button" class="btn btn-ghost" data-del>🗑 Eliminar polla</button>` : ''}
        ${['finalizada', 'cancelada'].includes(p.status) ? html`<p class="muted small">La polla está cerrada: queda solo para consulta.</p>` : ''}
      </div>`)) : raw(card('Acciones', '<p class="muted small">Solo quien organiza cambia reglas o cierra la polla.</p>'))}
      ${raw(card('Reportar un problema', '<p class="small muted">Si algo no anda bien (alguien no paga, una disputa), avísale a la plataforma.</p><button type="button" class="btn btn-sm" data-report>⚖️ Levantar reporte</button>'))}
    </div></div>`;
  el.querySelector('[data-edit]')?.addEventListener('click', () => pollas.form(p, ctx));
  el.querySelector('[data-draft]')?.addEventListener('click', e => once(e.currentTarget, () => tryDo(() => L.POLLA.move(db, 'pollas', p.id, 'borrador', { by: u.id, note: 'Inscripciones cerradas', log: 'polla', title: x => x.name }), 'Volvió a borrador')));
  el.querySelector('[data-finish]')?.addEventListener('click', e => once(e.currentTarget, async () => { const rec = L.reconcile(db, p.id); if (await confirm(`Se reparten ${money(rec.fondo)} del fondo común entre los ${p.cupos} cupos y la polla queda cerrada.`, { title: 'Finalizar polla', ok: 'Finalizar' })) tryDo(() => L.finishPolla(db, p.id, u.id), '¡Polla finalizada! 🎉'); }));
  el.querySelector('[data-cancel]')?.addEventListener('click', () => cancelModal(p, u));
  el.querySelector('[data-del]')?.addEventListener('click', async () => { if (await pollas.remove(p, ctx)) location.hash = '#/pollas'; });
  el.querySelector('[data-report]')?.addEventListener('click', () => V.reportModal(p, u));
}
async function cancelModal(p, u) {
  const pre = p.status === 'en_curso' ? L.settlementPreview(db, p.id) : null;
  await fieldsModal({ title: `Terminar ${p.name} antes de tiempo`, submit: 'Terminar y liquidar',
    intro: pre ? html`<span class="g-alert is-danger" style="display:block">Caja disponible: <b>${money(pre.caja)}</b> · se le debe a la gallada: <b>${money(pre.totalOwed)}</b></span>${raw(settlementTable({ ...pre, rows: pre.rows }))}` : 'La polla aún no parte: se cancela sin movimientos de plata.',
    fields: [{ name: 'note', label: 'Motivo (lo verán todos)', type: 'textarea', required: true }],
    onSubmit: v => { try { L.cancelPolla(db, p.id, u.id, v.note); toast('Polla terminada y liquidada', 'success'); return true; } catch (e) { return e.message; } } });
}
// ======================= Detalle de ronda =======================
function roundDetail(view, ctx) {
  const p = db.get('pollas', ctx.params.id), r = db.get('rounds', ctx.params.rid), u = ctx.user;
  if (!p || !r || r.pollaId !== p.id || !L.isStaff(p, u)) { view.innerHTML = emptyState({ icon: '🔎', title: 'Ronda no encontrada', action: '<a class="btn" href="#/pollas">← Pollas</a>' }); return; }
  const slot = r.slotId && db.get('slots', r.slotId), live = p.status === 'en_curso';
  const acts = [];
  if (live && r.status === 'completa' && L.can(p, u, 'entregas')) acts.push('<button type="button" class="btn btn-primary" data-pay>💸 Entregar pozo</button>');
  if (live && r.status === 'entregada' && L.can(p, u, 'entregas')) acts.push('<button type="button" class="btn" data-rcpt>✓ Marcar recepción confirmada</button>');
  if (live && p.mode === 'remate' && !r.slotId && L.can(p, u, 'config')) acts.push('<button type="button" class="btn btn-primary" data-award>🔨 Adjudicar ronda</button>');
  if (live && !['entregada', 'confirmada', 'anulada'].includes(r.status) && L.can(p, u, 'config')) acts.push('<button type="button" class="btn btn-ghost" data-date>📅 Cambiar fecha</button>');
  if (live && L.roundStats(db, r).pays.some(x => ['pendiente', 'atrasado', 'rechazado'].includes(x.status)) && L.can(p, u, 'recordatorios')) acts.push(`<a class="btn btn-ghost" href="#/recordatorios?polla=${p.id}&ronda=${r.id}">📣 Recordar pendientes</a>`);
  const moves = db.query('movements', m => m.roundId === r.id && ['pago_pozo', 'reparto_remate'].includes(m.type));
  const bids = (r.bids || []).slice().sort((a, b) => b.amount - a.amount || a.at.localeCompare(b.at));
  view.innerHTML = html`${back(`#/pollas/${p.id}?tab=rondas`, p.name)}
    ${pageHead(`Ronda ${r.n} · ${p.name}`, raw(`${L.ROUND.badge(r.status)} <span class="muted">· ${escape(L.fdate(r.dueDate))}${slot ? ' · recibe ' + escape(L.slotLabel(db, slot)) : ''}</span>`), acts.join(''))}
    <div class="k-grid-main"><div class="stack">
      ${raw(card('', V.roundSummary(r, p)))}
      <section class="card"><div class="k-card-head"><h3>Cuotas de la ronda</h3></div>${raw(paymentsTable(p, r, u))}</section>
      ${p.mode === 'remate' ? raw(card('🔨 Pujas', bids.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Cupo</th><th class="k-num">Descuento ofrecido</th><th class="k-num">Recibiría</th><th>Cuándo</th></tr></thead><tbody>${bids.map((b, i) => html`<tr class="${r.slotId === b.slotId ? 'g-win' : ''}"><td>${i + 1}</td><td>${L.slotLabel(db, db.get('slots', b.slotId))}${r.slotId === b.slotId ? raw(' <span class="badge badge-success">ganó</span>') : ''}</td><td class="k-num">${money(b.amount)}</td><td class="k-num">${money(L.potOf(p) - b.amount)}</td><td><small>${dateTime(b.at)}</small></td></tr>`)}</tbody></table></div>` : `<p class="muted small">${r.slotId ? escape(r.awardNote || '') : 'Aún no hay pujas. Si nadie puja, al adjudicar se sortea entre los cupos que no han recibido.'}</p>`, { sub: r.slotId ? escape(r.awardNote || '') : `Puja máxima ${p.maxBidPct || 25}% del pozo (${money(Math.floor(L.potOf(p) * (p.maxBidPct || 25) / 100))})` })) : ''}
      ${moves.length ? raw(card('Entrega y reparto', html`<ul class="g-list">${moves.map(m => html`<li><span style="flex:1">${who(m.userId)}<small class="muted" style="display:block">${L.MOVE[m.type].label}</small></span><b>${money(m.amount)}</b></li>`)}</ul>${r.receipt ? html`<a class="btn btn-sm" href="#/comprobante/${r.receipt}">🧾 Comprobante ${r.receipt}</a>` : ''}`, { sub: `Total ${money(moves.reduce((s, m) => s + m.amount, 0))} = pozo recaudado` })) : ''}
    </div><div class="stack">
      ${raw(card('Historial', historyTimeline(r.history || [], L.ROUND, { users: id => L.userName(db, id) })))}
      ${(r.dateChanges || []).length ? raw(card('Cambios de fecha', timeline([...r.dateChanges].reverse().map(c => ({ at: c.at, title: `${L.fdate(c.from)} → ${L.fdate(c.to)}`, text: c.note, who: L.userName(db, c.by) }))))) : ''}
    </div></div>`;
  wirePayments(page(view), p, u);
  view.querySelector('[data-pay]')?.addEventListener('click', () => payoutModal(p, r, u));
  view.querySelector('[data-rcpt]')?.addEventListener('click', e => once(e.currentTarget, async () => { if (await confirm('Úsalo si quien recibió confirmó por otro medio (llamada, en persona).', { title: 'Confirmar recepción', ok: 'Confirmar' })) tryDo(() => L.confirmReceipt(db, r.id, u.id, { byStaff: true }), 'Recepción confirmada'); }));
  view.querySelector('[data-award]')?.addEventListener('click', e => once(e.currentTarget, async () => { const top = bids[0]; if (await confirm(top ? `Gana ${L.slotLabel(db, db.get('slots', top.slotId))} con ${money(top.amount)} de descuento.` : 'No hay pujas: se sorteará entre los cupos que aún no reciben.', { title: `Adjudicar ronda ${r.n}`, ok: 'Adjudicar' })) { const w = tryDo(() => L.award(db, r.id, u.id)); if (w) toast(`Ronda ${r.n} adjudicada a ${L.slotLabel(db, w)}`, 'success'); } }));
  view.querySelector('[data-date]')?.addEventListener('click', () => fieldsModal({ title: `Cambiar fecha · ronda ${r.n}`, size: '', submit: 'Cambiar fecha', intro: `Fecha actual: <b>${L.fdate(r.dueDate)}</b>. Todos los miembros serán notificados.`,
    fields: [{ name: 'date', label: 'Nueva fecha', type: 'date', required: true, default: L.addDays(r.dueDate, 7) }, { name: 'shift', label: 'Correr también las rondas siguientes', type: 'bool' }, { name: 'note', label: 'Motivo', type: 'textarea', required: true, placeholder: 'Ej: feriado, el pago de sueldos se atrasó' }],
    onSubmit: v => { try { L.changeDate(db, r.id, v.date, { shift: v.shift, note: v.note, by: u.id }); toast('Fecha actualizada', 'success'); return true; } catch (e) { return e.message; } } }));
}
async function payoutModal(p, r, u) {
  const st = L.roundStats(db, r), slot = db.get('slots', r.slotId), hs = V.holders(slot), net = st.collected - (r.discount || 0), parts = L.splitInt(net, hs.map(() => 1));
  const others = L.slotsOf(db, p.id).filter(s => s.id !== slot.id), per = L.splitInt(r.discount || 0, others.map(() => 1));
  const recv = V.U(hs[0].userId);
  await fieldsModal({ title: `Entregar pozo · ronda ${r.n}`, submit: `Entregar ${money(net)}`,
    intro: html`<span class="g-paybox"><span>Pozo recaudado</span><b>${money(st.collected)}</b>${r.discount ? html`<small>− ${money(r.discount)} de descuento de remate (se reparte: ${money(per[0] || 0)} por cupo aprox.)</small>` : ''}</span>
      <span class="g-list" style="display:block;margin:8px 0">${hs.map((m, i) => html`<span class="row between" style="padding:4px 0"><span>${who(m.userId)}</span><b>${money(parts[i])}</b></span>`)}</span>
      <span class="g-bankbox"><b>Datos de ${recv?.name}</b><br>${recv?.bank || 'Cuenta no registrada'} · ${recv?.rut || ''}</span>`,
    fields: [{ name: 'method', label: 'Medio', type: 'select', required: true, options: [['transferencia', 'Transferencia'], ['efectivo', 'Efectivo']] }, { name: 'ref', label: 'N° de operación' }],
    onSubmit: v => { try { const c = L.payout(db, r.id, u.id, v); toast(`Pozo entregado · comprobante ${c}`, 'success'); return true; } catch (e) { return e.message; } } });
}

// ======================= Detalle de miembro =======================
function memberDetail(view, ctx) {
  const p = db.get('pollas', ctx.params.id), m = db.get('members', ctx.params.mid), u = ctx.user;
  if (!p || !m || m.pollaId !== p.id || !L.isStaff(p, u)) { view.innerHTML = emptyState({ icon: '🔎', title: 'Miembro no encontrado', action: '<a class="btn" href="#/pollas">← Pollas</a>' }); return; }
  const person = V.U(m.userId), s = L.slotOfMember(db, m), rep = L.reputation(db, m.userId), pos = L.positions(db, p.id).find(x => x.userId === m.userId) || { aportado: 0, recibido: 0, net: 0, debt: 0 };
  const pays = db.query('payments', x => x.memberId === m.id).map(x => ({ x, r: db.get('rounds', x.roundId) })).sort((a, b) => a.r.n - b.r.n);
  const risk = L.risks(db, p.id).find(x => x.member.id === m.id);
  view.innerHTML = html`${back(`#/pollas/${p.id}?tab=miembros`, p.name)}
    ${pageHead(person.name, raw(`${s ? escape(s.code) + (s.half ? ' · medio cupo' : '') + ' · turno ' + (s.turn ?? '—') : ''} · ${escape(m.status)} ${V.repBadge(m.userId)}`), m.status === 'activo' ? `${L.can(p, u, 'recordatorios') ? '<button type="button" class="btn" data-remind>📣 Recordar</button>' : ''}${L.can(p, u, 'config') && ['inscripcion', 'en_curso'].includes(p.status) ? '<button type="button" class="btn btn-ghost" data-replace>⇄ Reemplazar</button>' : ''}<button type="button" class="btn btn-ghost" data-report>⚖️ Reportar</button>` : '')}
    ${risk ? html`<div class="g-alert ${risk.level === 'alto' ? 'is-danger' : 'is-warning'}"><b>Riesgo ${risk.level}:</b> ${risk.text}</div>` : ''}
    ${raw(kpis([{ label: 'Aportado', value: money(pos.aportado), icon: '⬆️' }, { label: 'Recibido', value: money(pos.recibido), icon: '⬇️' }, { label: 'Posición neta', value: V.signed(pos.net), icon: '⚖️', hint: pos.net > 0 ? 'recibió antes: le queda por pagar' : pos.net < 0 ? 'le toca recibir' : 'parejo' }, { label: 'Deuda viva', value: money(pos.debt), icon: '⏰' }]))}
    <div class="k-grid-main"><div class="stack">
      ${raw(card('Cuotas en esta polla', pays.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Ronda</th><th>Vence</th><th class="k-num">Monto</th><th>Estado</th><th>Comprobante</th></tr></thead><tbody>${pays.map(({ x, r }) => html`<tr><td><a href="#/pollas/${p.id}/ronda/${r.id}">R${r.n}</a></td><td class="k-nowrap">${L.fdate(r.dueDate)}</td><td class="k-num">${money(x.amount)}${x.lateFee && !x.feeWaived ? html`<small class="g-bad" style="display:block">+${money(x.lateFee)}</small>` : ''}</td><td>${raw(L.PAY.badge(x.status))}</td><td>${x.receipt ? html`<a href="#/comprobante/${x.receipt}">${x.receipt}</a>` : '—'}</td></tr>`)}</tbody></table></div>` : '<p class="muted small">La polla aún no parte.</p>'))}
      ${raw(card('Sus movimientos', V.ledgerTable(p.id, { userId: m.userId })))}
    </div><div class="stack">
      ${raw(card('Datos', kv([['Correo', person.email], ['Teléfono', person.phone], ['RUT', person.rut], ['Comuna', person.comuna], ['Banco', person.bank], ['Se unió', dateTime(m.joinedAt)]])))}
      ${raw(card('Reputación en Gallada', html`<div class="g-rep"><b class="g-rep-n">${rep.score}</b><div>${raw(V.stars(rep.stars))}<small class="muted" style="display:block">${rep.label}</small></div></div>${kv([['Pollas', rep.pollas], ['Terminadas', rep.completed], ['Pagos a tiempo', `${rep.onTime}/${rep.done}`], ['Con atraso', rep.late], ['Cubiertos por otros', rep.covered]])}`))}
    </div></div>`;
  view.querySelector('[data-remind]')?.addEventListener('click', () => remindOne(p, m.userId, u));
  view.querySelector('[data-replace]')?.addEventListener('click', () => replaceModal(p, m, u));
  view.querySelector('[data-report]')?.addEventListener('click', () => V.reportModal(p, u, m.userId));
}

// ======================= Pagos por confirmar =======================
function pagosView(view, ctx) {
  const u = ctx.user, ids = new Set(managed(u).filter(p => L.can(p, u, 'pagos')).map(p => p.id));
  const rep = db.query('payments', x => ids.has(x.pollaId) && x.status === 'informado').sort((a, b) => (a.reportedAt || '').localeCompare(b.reportedAt || ''));
  const debts = db.query('payments', x => ids.has(x.pollaId) && x.status === 'cubierto');
  const row = x => { const p = L.pollaOf(db, x.pollaId), r = db.get('rounds', x.roundId), fee = x.feeWaived ? 0 : x.lateFee || 0; return { x, p, r, fee }; };
  view.innerHTML = html`${pageHead('Pagos por confirmar', 'Revisa cada comprobante contra tu cartola y confirma. Cada confirmación genera un comprobante y entra al libro.', rep.length ? `<button type="button" class="btn btn-primary" data-all>✓ Confirmar seleccionados</button>` : '')}
    <section class="card">${rep.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th><input type="checkbox" data-chkall aria-label="Seleccionar todos"></th><th>Persona</th><th>Polla · ronda</th><th class="k-num">Monto</th><th>Comprobante</th><th>Informado</th><th></th></tr></thead><tbody>
      ${rep.map(row).map(({ x, p, r, fee }) => html`<tr><td><input type="checkbox" data-chk="${x.id}" aria-label="Seleccionar"></td><td>${who(x.userId)}</td><td><a href="#/pollas/${p.id}/ronda/${r.id}">${p.emoji} ${p.name}</a><small class="muted" style="display:block">ronda ${r.n} · vence ${L.fdate(r.dueDate)}</small></td><td class="k-num"><b>${money(x.amount + fee)}</b>${fee ? html`<small class="muted" style="display:block">incl. multa ${money(fee)}</small>` : ''}</td><td class="small">${x.method === 'efectivo' ? '💵 Efectivo' : html`🏦 N° ${x.ref || '—'}`}${x.file ? html`<small style="display:block">📎 ${x.file}</small>` : ''}</td><td><small>${ago(x.reportedAt)}</small></td><td><div class="k-acts"><button type="button" class="btn btn-sm btn-primary" data-pact="ok" data-id="${x.id}">Confirmar</button><button type="button" class="btn btn-sm btn-ghost" data-pact="no" data-id="${x.id}">Rechazar</button></div></td></tr>`)}
    </tbody></table></div>` : raw(emptyState({ icon: '✅', title: 'Nada por confirmar', text: 'Cuando alguien informe un pago aparecerá aquí.' }))}</section>
    ${debts.length ? raw(card(`Deudas por cuotas cubiertas (${debts.length})`, html`<div class="table-wrap"><table class="table"><thead><tr><th>Persona</th><th>Polla · ronda</th><th class="k-num">Debe</th><th>Cubrió</th><th></th></tr></thead><tbody>${debts.map(row).map(({ x, p, r, fee }) => html`<tr><td>${who(x.userId)}${x.debtReported ? html`<small class="g-info" style="display:block">avisó que pagó ${ago(x.debtReported.at)}${x.debtReported.ref ? ` · N° ${x.debtReported.ref}` : ''}</small>` : ''}</td><td>${p.name} · R${r.n}</td><td class="k-num">${money(x.amount + fee)}</td><td>${L.userName(db, x.coveredBy)}</td><td><button type="button" class="btn btn-sm" data-pact="settle" data-id="${x.id}">Regularizar</button></td></tr>`)}</tbody></table></div>`, { sub: 'Alguien adelantó la cuota; al regularizar se le devuelve el anticipo.' })) : ''}`;
  wirePayments(page(view), null, u);
  view.querySelector('[data-chkall]')?.addEventListener('change', e => view.querySelectorAll('[data-chk]').forEach(c => { c.checked = e.target.checked; }));
  view.querySelector('[data-all]')?.addEventListener('click', e => once(e.currentTarget, () => {
    const sel = [...view.querySelectorAll('[data-chk]:checked')].map(c => c.dataset.chk);
    if (!sel.length) return toast('Selecciona al menos un pago', 'warning');
    let n = 0; sel.forEach(id => { const x = db.get('payments', id); if (x?.status === 'informado' && tryDo(() => L.confirmPayment(db, id, u.id))) n++; });
    toast(`${n} pago${n === 1 ? '' : 's'} confirmado${n === 1 ? '' : 's'}`, 'success');
  }));
}

// ======================= Morosos y riesgo =======================
function riesgoView(view, ctx) {
  const u = ctx.user, list = managed(u).filter(p => p.status === 'en_curso'), ids = new Set(list.map(p => p.id));
  const risks = list.flatMap(p => L.risks(db, p.id).map(r => ({ ...r, p })));
  const late = db.query('payments', x => ids.has(x.pollaId) && x.status === 'atrasado').map(x => ({ x, p: L.pollaOf(db, x.pollaId), r: db.get('rounds', x.roundId) })).sort((a, b) => a.r.dueDate.localeCompare(b.r.dueDate));
  view.innerHTML = html`${pageHead('Morosos y riesgo', 'Quien ya recibió el pozo y deja de pagar es el riesgo más grave: actúa rápido (recordar, cubrir, reemplazar si aún no recibe).')}
    ${raw(kpis([{ label: 'Riesgo alto', value: risks.filter(r => r.level === 'alto').length, icon: '🔴' }, { label: 'Riesgo medio', value: risks.filter(r => r.level === 'medio').length, icon: '🟠' }, { label: 'Cuotas atrasadas', value: late.length, icon: '⏰', hint: money(late.reduce((s, o) => s + o.x.amount + (o.x.feeWaived ? 0 : o.x.lateFee || 0), 0)) }, { label: 'Deuda por cuotas cubiertas', value: money(db.query('payments', x => ids.has(x.pollaId) && x.status === 'cubierto').reduce((s, x) => s + x.amount, 0)), icon: '🤝' }]))}
    <div class="k-grid-main">
      ${raw(card('Cuotas atrasadas', late.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Persona</th><th>Polla</th><th>Venció</th><th class="k-num">Debe</th><th></th></tr></thead><tbody>${late.map(({ x, p, r }) => html`<tr><td><a class="g-link" href="#/pollas/${p.id}/miembro/${x.memberId}">${who(x.userId)}</a></td><td>${p.emoji} ${p.name} · R${r.n}</td><td><small>${L.fdate(r.dueDate)}<br>${L.relDay(r.dueDate, L.today(db))}</small></td><td class="k-num"><b class="g-bad">${money(x.amount + (x.feeWaived ? 0 : x.lateFee || 0))}</b></td><td><div class="k-acts"><button type="button" class="btn btn-sm" data-pact="remind" data-id="${x.id}">📣</button><button type="button" class="btn btn-sm btn-ghost" data-pact="cover" data-id="${x.id}">Cubrir</button></div></td></tr>`)}</tbody></table></div>` : '<p class="muted small">Sin atrasos 🎉</p>'))}
      ${raw(card('Alertas', risks.length ? riskList(risks) : '<p class="muted small">Sin alertas.</p>'))}
    </div>`;
  wirePayments(page(view), null, u);
}

// ======================= Solicitudes (cambios de turno + inscripciones) =======================
function cambiosView(view, ctx) {
  const u = ctx.user, ids = new Set(managed(u).filter(p => L.can(p, u, 'config')).map(p => p.id));
  const sw = db.query('swaps', s => ids.has(s.pollaId)).sort((a, b) => ['aceptado', 'solicitado'].indexOf(b.status) - ['aceptado', 'solicitado'].indexOf(a.status) || b.createdAt.localeCompare(a.createdAt));
  const reqs = db.query('members', m => ids.has(m.pollaId) && m.status === 'solicitud');
  view.innerHTML = html`${pageHead('Solicitudes', 'Cambios de turno entre miembros e inscripciones por aprobar.')}
    ${raw(card('Inscripciones por aprobar', reqs.length ? html`<ul class="g-list">${reqs.map(m => { const p = L.pollaOf(db, m.pollaId); return html`<li class="g-req">${raw(av(V.U(m.userId), 36))}<div style="flex:1;min-width:0"><b>${L.userName(db, m.userId)}</b> ${raw(V.repBadge(m.userId))}<small class="muted" style="display:block">${p.emoji} ${p.name} · ${m.wantHalf ? 'medio cupo' : 'cupo completo'}${m.wantTurn ? ` · turno ${m.wantTurn}` : ''}</small></div><div class="row" style="gap:6px"><button type="button" class="btn btn-sm btn-primary" data-acc="${m.id}">Aceptar</button><a class="btn btn-sm btn-ghost" href="#/pollas/${p.id}?tab=miembros">Ver</a></div></li>`; })}</ul>` : '<p class="muted small">Ninguna.</p>'))}
    <section class="card"><div class="k-card-head"><h3>Cambios de turno</h3></div>${sw.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Polla</th><th>Pide</th><th>Cambio</th><th>Con</th><th>Estado</th><th></th></tr></thead><tbody>${sw.map(s => { const p = L.pollaOf(db, s.pollaId); return html`<tr><td>${p.emoji} ${p.name}</td><td>${who(s.fromUserId)}${s.message ? html`<small class="muted" style="display:block">"${s.message}"</small>` : ''}</td><td><b>${s.fromTurn} ↔ ${s.toTurn}</b></td><td>${L.slotLabel(db, db.get('slots', s.toSlotId))}</td><td>${raw(L.SWAP.badge(s.status))}</td><td><div class="k-acts">${s.status === 'aceptado' ? html`<button type="button" class="btn btn-sm btn-primary" data-sw="aprobado" data-id="${s.id}">Aprobar</button>` : ''}${['solicitado', 'aceptado'].includes(s.status) ? html`<button type="button" class="btn btn-sm btn-ghost" data-sw="rechazado" data-id="${s.id}">Rechazar</button>` : ''}</div></td></tr>`; })}</tbody></table></div>` : raw(emptyState({ icon: '🔁', title: 'Sin solicitudes de cambio' }))}</section>`;
  view.querySelectorAll('[data-acc]').forEach(b => b.addEventListener('click', () => once(b, () => tryDo(() => L.approveRequest(db, b.dataset.acc, u.id, true), 'Solicitud aceptada'))));
  view.querySelectorAll('[data-sw]').forEach(b => b.addEventListener('click', () => once(b, async () => {
    let note = '';
    if (b.dataset.sw === 'rechazado') { const v = await fieldsModal({ title: 'Rechazar cambio de turno', size: '', submit: 'Rechazar', fields: [{ name: 'note', label: 'Motivo', type: 'textarea', required: true }] }); if (!v) return; note = v.note; }
    tryDo(() => L.answerSwap(db, b.dataset.id, b.dataset.sw, u.id, note), b.dataset.sw === 'aprobado' ? 'Cambio aprobado: turnos intercambiados' : 'Cambio rechazado');
  })));
}

// ======================= Recordatorios =======================
function recordatoriosView(view, ctx) {
  const u = ctx.user, t0 = L.today(db);
  const urgent = p => db.count('payments', x => x.pollaId === p.id && (x.status === 'atrasado' || (['pendiente', 'rechazado'].includes(x.status) && L.diffDays(db.get('rounds', x.roundId).dueDate, t0) <= 7)));
  const list = managed(u).filter(p => p.status === 'en_curso' && L.can(p, u, 'recordatorios')).sort((a, b) => urgent(b) - urgent(a));
  const tpls = db.query('templates', t => t.active !== false);
  const outbox = db.query('outbox', o => list.some(p => p.id === o.pollaId) || o.by === u.id).sort((a, b) => b.at.localeCompare(a.at));
  if (!list.length) { view.innerHTML = html`${pageHead('Recordatorios')}${raw(emptyState({ icon: '📣', title: 'No tienes pollas en curso', text: 'Los recordatorios se envían a quienes tienen cuotas pendientes.' }))}`; return; }
  const state = { pid: list.some(p => p.id === ctx.query.polla) ? ctx.query.polla : list[0].id, tpl: tpls[0]?.id };
  view.innerHTML = html`${pageHead('Recordatorios', 'Mensajes de WhatsApp o correo simulados: se registran, le llegan como notificación a cada persona y quedan en el historial.')}
    <div class="k-grid-main"><section class="card"><div class="k-form">
      <div class="field"><label for="r-p">Polla</label><select class="select" id="r-p" data-p>${list.map(p => html`<option value="${p.id}" ${p.id === state.pid ? raw('selected') : ''}>${p.emoji} ${p.name}</option>`)}</select></div>
      <div class="field"><label for="r-t">Plantilla</label><select class="select" id="r-t" data-t>${tpls.map(t => html`<option value="${t.id}">${t.name} · ${t.channel === 'email' ? 'correo' : 'WhatsApp'}</option>`)}</select></div>
    </div><h3 style="margin:18px 0 8px">Para quién</h3><div data-who></div><div class="row" style="margin-top:14px"><button type="button" class="btn btn-primary" data-send>📣 Enviar recordatorios</button></div></section>
    <section class="card"><h3 style="margin-top:0">Vista previa</h3><div data-prev></div></section></div>
    ${raw(card('Historial de envíos', outbox.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Para</th><th>Canal</th><th>Polla</th><th>Mensaje</th></tr></thead><tbody>${outbox.slice(0, 40).map(o => html`<tr><td><small class="k-nowrap">${dateTime(o.at)}</small></td><td>${who(o.userId)}</td><td>${o.channel === 'email' ? '✉️' : '🟢'}</td><td><small>${L.pollaOf(db, o.pollaId)?.name}</small></td><td><small class="g-clamp">${o.text}</small></td></tr>`)}</tbody></table></div>` : '<p class="muted small">Aún no se envían recordatorios.</p>', { actions: outbox.length ? '<button type="button" class="btn btn-sm" data-csv>⇩ CSV</button>' : '' }))}`;
  const paintWho = () => {
    const p = L.pollaOf(db, state.pid), people = L.membersOf(db, p.id).map(m => {
      const open = db.query('payments', x => x.memberId === m.id && ['pendiente', 'atrasado', 'rechazado'].includes(x.status)).map(x => ({ x, r: db.get('rounds', x.roundId) })).sort((a, b) => a.r.n - b.r.n);
      const near = open.find(o => o.x.status === 'atrasado' || L.diffDays(o.r.dueDate, L.today(db)) <= 7 || (ctx.query.ronda && o.r.id === ctx.query.ronda));
      return { m, open, near };
    }).sort((a, b) => !!b.near - !!a.near);
    view.querySelector('[data-who]').innerHTML = html`<ul class="g-checklist">${people.map(({ m, open, near }) => html`<li><label class="check"><input type="checkbox" value="${m.userId}" ${near ? raw('checked') : ''}> ${L.userName(db, m.userId)}</label><small class="muted">${open.length ? html`${open[0].x.status === 'atrasado' ? raw('<b class="g-bad">atrasado</b> · ') : ''}R${open[0].r.n} vence ${L.fdate(open[0].r.dueDate)}` : 'al día'}</small></li>`)}</ul>`;
    paintPrev();
  };
  const sel = () => [...view.querySelectorAll('[data-who] input:checked')].map(i => i.value);
  const paintPrev = () => {
    const t = db.get('templates', state.tpl), ids = sel();
    view.querySelector('[data-prev]').innerHTML = t ? (ids.length ? html`${raw(V.bubble(L.renderTemplate(t.text, L.reminderVars(db, state.pid, ids[0])), t.channel))}<p class="small muted">Para ${L.userName(db, ids[0])}${ids.length > 1 ? ` y ${ids.length - 1} persona(s) más (cada mensaje usa sus propios datos)` : ''}.</p>` : '<p class="muted small">Marca al menos una persona.</p>') : '<p class="muted small">No hay plantillas activas.</p>';
  };
  view.querySelector('[data-p]').addEventListener('change', e => { state.pid = e.target.value; paintWho(); });
  view.querySelector('[data-t]').addEventListener('change', e => { state.tpl = e.target.value; paintPrev(); });
  view.querySelector('[data-who]').addEventListener('change', paintPrev);
  view.querySelector('[data-send]').addEventListener('click', e => once(e.currentTarget, () => { const ids = sel(); const out = tryDo(() => L.sendReminders(db, { pollaId: state.pid, userIds: ids, templateId: state.tpl, by: u.id })); if (out) toast(`${ids.length} recordatorio${ids.length === 1 ? '' : 's'} enviado${ids.length === 1 ? '' : 's'}`, 'success'); }));
  view.querySelector('[data-csv]')?.addEventListener('click', () => downloadCSV('recordatorios.csv', outbox.map(o => ({ fecha: o.at, para: L.userName(db, o.userId), canal: o.channel, polla: L.pollaOf(db, o.pollaId)?.name, mensaje: o.text }))));
  paintWho();
  return { refresh: () => {} }; // no repintar mientras se arma el envío
}

// ======================= Calendario y notificaciones =======================
function calendarioView(view, ctx) {
  const list = managed(ctx.user).filter(p => ['en_curso', 'inscripcion'].includes(p.status));
  view.innerHTML = html`${pageHead('Calendario', 'Todas las fechas de pago y entrega de tus pollas.')}${raw(card('', V.calendar(V.pollaEvents(list, { link: (p, r) => `#/pollas/${p.id}/ronda/${r.id}` }), monthOf(ctx.query), '#/calendario')))}`;
}
function notifView(view, ctx) {
  view.innerHTML = html`${pageHead('Notificaciones', '', '<button type="button" class="btn btn-sm" data-all>Marcar todas como leídas</button>')}${raw(card('', V.notifList(ctx.user.id, { page: 'organizador.html' })))}`;
  V.mountNotifs(view);
  view.querySelector('[data-all]').onclick = () => db.query('notifs', n => n.userId === ctx.user.id && !n.read).forEach(n => db.update('notifs', n.id, { read: true }));
}
function receiptView(view, ctx) {
  view.innerHTML = html`<a class="small g-back g-noprint" href="javascript:history.back()">← Volver</a>${raw(V.receiptHTML(ctx.params.code))}`;
  V.mountPrint(view);
}

const pollasItem = pollas.section({ label: 'Pollas', icon: '🐣' });
pollasItem.watch = null;
pollasItem.routes = { ':id': { label: 'Polla', render: pollaDetail }, ':id/ronda/:rid': { label: 'Ronda', render: roundDetail }, ':id/miembro/:mid': { label: 'Miembro', render: memberDetail } };
const staffIds = u => new Set(managed(u).map(p => p.id));

app.panel({
  page: 'organizador.html', sub: 'Organización',
  topbar: '<a class="btn btn-sm" href="participante.html">🙋 Mis aportes</a>',
  nav: [
    { section: 'Gestión' },
    { id: '', label: 'Resumen', icon: '📊', render: dashboard },
    pollasItem,
    { id: 'pagos', label: 'Pagos por confirmar', icon: '🧾', render: pagosView, count: () => { const s = staffIds(me()); return db.count('payments', x => s.has(x.pollaId) && x.status === 'informado'); } },
    { id: 'riesgo', label: 'Morosos y riesgo', icon: '⚠️', render: riesgoView, count: () => { const s = staffIds(me()); return db.count('payments', x => s.has(x.pollaId) && x.status === 'atrasado'); } },
    { id: 'cambios', label: 'Solicitudes', icon: '🔁', roles: ['organizador', 'admin'], render: cambiosView, count: () => { const s = staffIds(me()); return db.count('swaps', x => s.has(x.pollaId) && x.status === 'aceptado') + db.count('members', m => s.has(m.pollaId) && m.status === 'solicitud'); } },
    { id: 'recordatorios', label: 'Recordatorios', icon: '📣', render: recordatoriosView, watch: ['outbox'] },
    { id: 'calendario', label: 'Calendario', icon: '📅', render: calendarioView },
    { id: 'comprobante', label: 'Comprobante', icon: '🧾', hidden: true, render: receiptView, routes: { ':code': { label: 'Comprobante', render: receiptView } } },
    { section: 'Tú' },
    { id: 'notificaciones', label: 'Notificaciones', icon: '🔔', render: notifView, count: () => V.unread(me()?.id) },
    { href: 'participante.html', label: 'Mis aportes', icon: '🙋' },
    accountSection(app, { fields: [{ name: 'phone', label: 'Teléfono', type: 'tel' }, { name: 'bank', label: 'Cuenta para recibir pozos' }] })
  ]
});
