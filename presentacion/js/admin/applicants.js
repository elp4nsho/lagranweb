// Postulantes: tabla filtrable por oferta y ficha con evaluación, notas y estado.
import { escape, toast, confirm, date, dateTime, ago } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, APP_STATUS } from '../data/db.js';
import { pageHead, table, actBtn, badge } from '../shared/admin-kit.js';

const jobTitle = id => db.get('jobs', id)?.title || 'Oferta eliminada';
const userName = id => db.get('users', id)?.name || 'Sistema';

function list(el, ctx) {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const rows = db.all('applications');
  el.innerHTML = `${pageHead('Postulantes', `${rows.filter(a => a.status === 'nuevo').length} postulaciones nuevas por revisar`)}
    <div class="grid-4">${Object.entries(APP_STATUS).slice(0, 4).map(([k, [l]]) => `<div class="card"><div class="stat"><span class="label">${l}</span><span class="value">${rows.filter(a => a.status === k).length}</span></div></div>`).join('')}</div><div data-t></div>`;
  const t = table(el.querySelector('[data-t]'), {
    id: 'applicants', rows, sort: 'createdAt', dir: -1, search: a => `${a.name} ${a.email} ${jobTitle(a.jobId)}`,
    filters: [
      { key: 'jobId', label: 'Oferta', options: db.all('jobs').map(j => [j.id, j.title]) },
      { key: 'status', label: 'Estado', options: Object.entries(APP_STATUS).map(([k, [l]]) => [k, l]) }
    ],
    columns: [
      { key: 'name', label: 'Postulante', render: a => `<div class="cell-main"><span class="avatar" style="--size:32px;--av:var(--accent)">${escape(initials(a.name))}</span><span><b>${escape(a.name)}</b><small>${escape(a.email)}</small></span></div>` },
      { key: 'jobId', label: 'Oferta', value: a => jobTitle(a.jobId), render: a => `<span class="small">${escape(jobTitle(a.jobId))}</span>` },
      { key: 'rating', label: 'Evaluación', render: a => `<span class="stars">${'★'.repeat(a.rating || 0)}${'☆'.repeat(5 - (a.rating || 0))}</span>` },
      { key: 'createdAt', label: 'Fecha', render: a => `<span class="small">${ago(a.createdAt)}</span>` },
      { key: 'status', label: 'Estado', render: a => badge(a.status, APP_STATUS) }
    ],
    actions: () => actBtn('open', 'Abrir', '→') + actBtn('del', 'Eliminar', '🗑'),
    onRow: a => ctx.go(`/postulantes/${a.id}`),
    onAction: async (act, a) => {
      if (act === 'open') ctx.go(`/postulantes/${a.id}`);
      if (act === 'del' && await confirm(`¿Eliminar la postulación de ${a.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('applications', a.id); db.log('postulación', `Eliminó postulación de ${a.name}`, ctx.user.id); toast('Postulación eliminada', 'success'); }
    },
    csv: { name: 'postulantes', map: a => ({ fecha: date(a.createdAt), nombre: a.name, correo: a.email, telefono: a.phone, oferta: jobTitle(a.jobId), portafolio: a.portfolio, evaluacion: a.rating, estado: APP_STATUS[a.status][0] }) }
  });
  if (q.get('job')) { const s = el.querySelector('[data-f="jobId"]'); if (s) { s.value = q.get('job'); s.dispatchEvent(new Event('change')); } }
}

function detail(el, ctx, id) {
  const a = db.get('applications', id);
  if (!a) { el.innerHTML = `<div class="card empty"><h2>Postulación no encontrada</h2><a class="btn" href="#/postulantes">Volver</a></div>`; return; }
  el.innerHTML = `${pageHead(a.name, `<a href="#/postulantes">← Postulantes</a> · ${escape(jobTitle(a.jobId))}`, badge(a.status, APP_STATUS))}
    <div class="card"><div class="row" style="gap:6px">${Object.entries(APP_STATUS).map(([k, [l]]) => `<button class="chip ${a.status === k ? 'active' : ''}" data-status="${k}">${l}</button>`).join('')}</div></div>
    <div class="detail-grid">
      <div class="stack"><div class="card"><h3>Postulación</h3><dl class="dl">
        <div><dt>Correo</dt><dd><a href="mailto:${escape(a.email)}">${escape(a.email)}</a></dd></div><div><dt>Teléfono</dt><dd>${escape(a.phone || '—')}</dd></div>
        <div><dt>Portafolio</dt><dd>${escape(a.portfolio || '—')}</dd></div><div><dt>CV</dt><dd>${a.cv ? `📎 ${escape(a.cv)}` : `📎 cv-${escape(a.name.split(' ')[0].toLowerCase())}.pdf`}</dd></div>
        <div><dt>Recibida</dt><dd>${dateTime(a.createdAt)}</dd></div></dl>
        ${a.message ? `<hr><p>${escape(a.message)}</p>` : ''}</div>
        <div class="card"><h3>Notas del equipo</h3><ul class="notes">${(a.notes || []).slice().reverse().map(n => `<li><small>${escape(userName(n.user))} · ${dateTime(n.at)}</small>${escape(n.text)}</li>`).join('') || '<li class="muted">Sin notas.</li>'}</ul>
        <form class="row" data-note style="gap:8px;flex-wrap:nowrap"><input class="input" name="text" placeholder="Agregar nota…" aria-label="Nueva nota" required><button class="btn btn-primary">Agregar</button></form></div></div>
      <div class="stack"><div class="card stack"><h3>Evaluación</h3><div class="row" role="radiogroup" aria-label="Evaluación" style="gap:4px">${[1, 2, 3, 4, 5].map(n => `<button class="btn btn-ghost btn-icon stars" data-rate="${n}" aria-label="${n} estrellas">${n <= (a.rating || 0) ? '★' : '☆'}</button>`).join('')}</div>
        <button class="btn" data-invite>📅 Invitar a entrevista</button><button class="btn btn-danger" data-del>Eliminar</button></div></div>
    </div>`;
  const setSt = st => { db.update('applications', a.id, x => ({ status: st, notes: [...(x.notes || []), { at: new Date().toISOString(), user: ctx.user.id, text: `Estado → ${APP_STATUS[st][0]}` }] })); db.log('postulación', `${a.name}: ${APP_STATUS[st][0]}`, ctx.user.id); toast(`Estado: ${APP_STATUS[st][0]}`, 'success'); };
  el.querySelectorAll('[data-status]').forEach(b => b.onclick = () => setSt(b.dataset.status));
  el.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => { db.update('applications', a.id, { rating: +b.dataset.rate }); toast('Evaluación guardada', 'success'); });
  el.querySelector('[data-note]').onsubmit = e => { e.preventDefault(); const t = e.target.text.value.trim(); if (!t) return; db.update('applications', a.id, x => ({ notes: [...(x.notes || []), { at: new Date().toISOString(), user: ctx.user.id, text: t }] })); toast('Nota agregada', 'success'); };
  el.querySelector('[data-invite]').onclick = () => { setSt('entrevista'); toast(`Invitación enviada a ${a.email} (simulado)`, 'info'); };
  el.querySelector('[data-del]').onclick = async () => { if (await confirm(`¿Eliminar la postulación de ${a.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('applications', a.id); toast('Eliminada', 'success'); ctx.go('/postulantes'); } };
}

export default {
  id: 'applicants', path: '/postulantes', label: 'Postulantes', icon: '☷', group: 'Talento', perm: 'applicants',
  render(el, ctx, params) { params.id ? detail(el, ctx, params.id) : list(el, ctx); }
};
