// App móvil del inspector: cola de autos, checklist de 150 puntos por categoría (aprobado / observación / falla),
// notas y fotos (simuladas). Al finalizar publica el informe de certificación en la ficha del auto.
import { escape, toast, confirm, date, debounce } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { INSPECTION, CAR_STATES } from '../data/catalog.js';
import { carTitle, kmFmt, branchById, statusBadge, inspectionSummary, setCarStatus } from '../shared/domain.js';
import { carArt } from '../shared/car-art.js';

let user;
try { user = auth.require(['admin', 'gerente', 'inspector']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
let draft = null, openCat = 0;

const top = () => `<header class="role-top"><span class="brand-mark" aria-hidden="true">✓</span><div class="grow"><b>Inspección</b><small class="muted d-block">${escape(user.name)} · ${escape(branchById(user.branchId)?.name || auth.roleName(user.role))}</small></div>
  ${user.role !== 'inspector' ? '<a class="btn btn-sm btn-ghost" href="admin.html#/inventario">Panel</a>' : ''}<span class="avatar" style="--av:${escape(user.color)}">${escape(initials(user.name))}</span><button class="btn btn-sm btn-ghost" data-out>Salir</button></header>`;

function queue() {
  const pend = db.query('cars', c => ['evaluacion', 'reacondicionamiento'].includes(c.status)).sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt));
  const done = db.query('inspections', i => i.status === 'completada' && Date.now() - new Date(i.at) < 30 * 864e5).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const card = c => { const ins = c.inspectionId && db.get('inspections', c.inspectionId), s = ins && inspectionSummary(ins); const prog = s ? 150 - s.pend : 0;
    return `<a class="card stack" href="#/auto/${c.id}" style="text-decoration:none;color:var(--text);gap:6px"><div class="row between"><b class="mono">${escape(c.stock)}</b>${statusBadge(CAR_STATES, c.status)}</div>
      <div class="row" style="flex-wrap:nowrap"><span style="width:110px;flex:none">${carArt({ body: c.body, color: c.color })}</span><span><b>${escape(carTitle(c))}</b><small class="muted d-block">${kmFmt(c.km)} · ${escape(branchById(c.branchId)?.name || '')}</small></span></div>
      ${c.status === 'reacondicionamiento' && s?.f ? `<small style="color:var(--danger)">${s.f} falla(s) por reinspeccionar tras el reacondicionamiento</small>` : ''}
      <div class="progress"><i style="--v:${Math.round(prog / 150 * 100)}%"></i></div><small class="muted">${ins ? (ins.status === 'completada' ? 'Inspección completada' : `En curso · ${prog}/150 puntos`) : 'Sin iniciar'}</small></a>`; };
  app.innerHTML = `${top()}<main class="role-wrap mobile"><div class="grid-2"><div class="card stat"><span class="label">Por inspeccionar</span><span class="value">${pend.length}</span></div><div class="card stat"><span class="label">Completadas 30 d</span><span class="value">${db.count('inspections', i => i.status === 'completada' && Date.now() - new Date(i.at) < 30 * 864e5)}</span></div></div>
    <h2 style="margin:0">Cola de inspección</h2>${pend.map(card).join('') || '<div class="card empty">Sin autos pendientes.</div>'}
    <h2 style="margin:0">Últimas completadas</h2>${done.map(i => { const c = db.get('cars', i.carId); return c ? `<div class="card row between"><span><b>${escape(carTitle(c))}</b><small class="muted d-block">${date(i.at)} · ${escape(c.stock)}</small></span><span class="badge badge-success">${inspectionSummary(i).score}%</span></div>` : ''; }).join('')}</main>`;
}

function ensureDraft(c) {
  let ins = c.inspectionId && db.get('inspections', c.inspectionId);
  if (!ins) { ins = db.insert('inspections', { carId: c.id, inspectorId: user.id, at: new Date().toISOString(), status: 'en-curso', results: '-'.repeat(150), notes: {}, photos: {} }); db.update('cars', c.id, { inspectionId: ins.id }); db.log('inspeccion', `Inspección iniciada: ${c.stock} ${carTitle(c)}`, user.id); }
  if (!draft || draft.id !== ins.id) {
    const res = [...ins.results];
    if (ins.status === 'completada' && c.status === 'reacondicionamiento') res.forEach((r, i) => { if (r === 'f') res[i] = '-'; }); // reinspección de fallas
    draft = { id: ins.id, carId: c.id, res, notes: { ...(ins.notes || {}) }, photos: { ...(ins.photos || {}) } };
  }
  return ins;
}
const save = debounce(() => { if (draft) db.update('inspections', draft.id, { results: draft.res.join(''), notes: draft.notes, photos: draft.photos, inspectorId: user.id }); }, 600);

function inspect(id) {
  const c = db.get('cars', id);
  if (!c) { app.innerHTML = `${top()}<main class="role-wrap mobile"><div class="card empty">Auto no encontrado.</div></main>`; return; }
  ensureDraft(c);
  const r = draft.res, done = r.filter(x => x !== '-').length;
  app.innerHTML = `${top()}<main class="role-wrap mobile">
    <a href="#/" class="small">← Cola</a>
    <div class="row" style="flex-wrap:nowrap"><span style="width:120px;flex:none">${carArt({ body: c.body, color: c.color })}</span><div><b class="mono">${escape(c.stock)}</b><h1 style="margin:0;font-size:22px">${escape(carTitle(c))}</h1><small class="muted">${kmFmt(c.km)} · ${escape(c.plate)}</small></div></div>
    <div class="card stack" style="gap:6px;position:sticky;top:64px;z-index:5"><div class="row between"><b>${done} / 150 puntos</b><span class="row" style="gap:4px"><span class="badge badge-success">${r.filter(x => x === 'p').length} ✓</span><span class="badge badge-warning">${r.filter(x => x === 'o').length} !</span><span class="badge badge-danger">${r.filter(x => x === 'f').length} ✕</span></span></div><div class="progress"><i style="--v:${Math.round(done / 150 * 100)}%"></i></div></div>
    ${INSPECTION.map(([cat, items], ci) => { const seg = r.slice(ci * 15, ci * 15 + 15), n = seg.filter(x => x !== '-').length; return `<details class="card cat-block" style="padding:0" ${openCat === ci ? 'open' : ''} data-cat="${ci}"><summary><span>${escape(cat)}</span><span class="row" style="gap:6px">${seg.includes('f') ? '<span class="badge badge-danger">falla</span>' : ''}<span class="badge ${n === 15 ? 'badge-success' : ''}">${n}/15</span></span></summary>
      <div style="padding:0 14px 10px"><button class="btn btn-sm" data-allok="${ci}">✓ Pendientes de esta categoría como aprobados</button></div>
      ${items.map((name, k) => { const i = ci * 15 + k, v = r[i]; return `<div class="pt-row"><span>${escape(name)}</span><span class="seg" role="group" aria-label="${escape(name)}">${[['p', '✓', 'Aprobado'], ['o', '!', 'Observación'], ['f', '✕', 'Falla']].map(([s, ic, l]) => `<button type="button" class="${s} ${v === s ? 'on' : ''}" data-pt="${i}|${s}" aria-label="${l}" aria-pressed="${v === s}">${ic}</button>`).join('')}</span>
        ${v === 'o' || v === 'f' ? `<div class="pt-extra"><input class="input sm" style="flex:1 1 180px" data-note="${i}" placeholder="Detalle para el informe" value="${escape(draft.notes[i] || '')}"><button type="button" class="btn btn-sm" data-photo="${i}">📷 ${draft.photos[i] || 0}</button></div>` : ''}</div>`; }).join('')}</details>`; }).join('')}
    <button class="btn btn-primary btn-lg btn-block" data-finish ${done < 150 ? 'disabled' : ''}>${done < 150 ? `Faltan ${150 - done} puntos` : 'Finalizar y publicar informe'}</button></main>`;
}
function finish(id) {
  const c = db.get('cars', id), fails = draft.res.filter(x => x === 'f').length;
  const results = draft.res.join(''), score = Math.round(draft.res.filter(x => x === 'p').length / 150 * 1000) / 10;
  db.update('inspections', draft.id, { results, notes: draft.notes, photos: draft.photos, status: 'completada', at: new Date().toISOString(), inspectorId: user.id, score });
  if (fails) {
    const recon = [...(c.recon || []), ...draft.res.map((x, i) => x === 'f' ? { desc: `Reparar: ${INSPECTION[Math.floor(i / 15)][1][i % 15]}`, amount: 0 } : null).filter(Boolean).filter(n => !(c.recon || []).some(r => r.desc === n.desc))];
    db.update('cars', id, { recon });
    if (c.status !== 'reacondicionamiento') setCarStatus(id, 'reacondicionamiento', user.id, `${fails} falla(s) en inspección`);
    toast(`Informe guardado: ${fails} falla(s) enviadas a reacondicionamiento`, 'warning', 4000);
  } else {
    setCarStatus(id, 'certificado', user.id, `inspección ${score}%`);
    toast(`¡Certificado! Puntaje ${score}%. Listo para publicar.`, 'success', 4000);
  }
  db.log('inspeccion', `Inspección finalizada ${c.stock}: ${score}% · ${fails} fallas`, user.id);
  draft = null; location.hash = '#/';
}
const router = user && createRouter({ '/': () => queue(), '/auto/:id': ({ id }) => inspect(id) }, { notFound: () => router.go('/') });
const keep = fn => { const y = scrollY; fn(); scrollTo(0, y); };
app.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const id = router.current?.params?.id;
  if (b.hasAttribute('data-out')) { auth.logout(); location.href = 'login.html'; return; }
  if (b.dataset.pt) { const [i, s] = b.dataset.pt.split('|'); draft.res[+i] = draft.res[+i] === s ? '-' : s; openCat = Math.floor(+i / 15); save(); keep(() => inspect(id)); }
  if (b.dataset.allok) { const ci = +b.dataset.allok; for (let i = ci * 15; i < ci * 15 + 15; i++) if (draft.res[i] === '-') draft.res[i] = 'p'; openCat = Math.min(9, ci + 1); save(); keep(() => inspect(id)); }
  if (b.dataset.photo) { const i = +b.dataset.photo; draft.photos[i] = (draft.photos[i] || 0) + 1; save(); toast('Foto adjuntada (simulada)', 'success', 1200); keep(() => inspect(id)); }
  if (b.hasAttribute('data-finish')) {
    const miss = draft.res.map((x, i) => (x === 'o' || x === 'f') && !draft.notes[i] ? i : null).filter(x => x != null);
    if (miss.length) { toast(`Agrega un detalle a ${miss.length} observación(es)/falla(s)`, 'warning'); return; }
    if (await confirm('Se publicará el informe de certificación en la ficha del auto.', { title: 'Finalizar inspección', ok: 'Finalizar' })) finish(id);
  }
});
app.addEventListener('input', e => { const n = e.target.closest('[data-note]'); if (n) { draft.notes[+n.dataset.note] = n.value; save(); } });
app.addEventListener('toggle', e => { const d = e.target.closest?.('[data-cat]'); if (d && d.open) openCat = +d.dataset.cat; }, true);
if (user) {
  db.subscribe(() => { if (document.querySelector('.modal-backdrop') || router.current?.pattern === '/auto/:id') return; keep(() => router.refresh()); });
  router.start();
}
