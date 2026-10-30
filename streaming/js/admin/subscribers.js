// Suscriptores: filtros por estado/plan, ficha con perfiles, dispositivos e historial; cambio de plan y estado.
import { db, notify } from '../data/db.js';
import { html, raw, $, money, toast, confirm, formModal, dataTable, modal, date, dateTime, escape } from '../../../assets/core/ui.js';
import { pageHead, kpi, csvButton, wireCSV, userChip } from '../shared/admin-kit.js';

export const SUB_ST = { activa: 'success', prueba: 'info', morosa: 'warning', cancelada: 'danger' };
export const subBadge = s => `<span class="badge badge-${SUB_ST[s] || 'info'}">${escape(s || '—')}</span>`;

export function render(el, { user, query }) {
  const st = { status: '', plan: '' };
  const plans = () => Object.fromEntries(db.all('plans').map(p => [p.id, p]));
  el.innerHTML = html`${raw(pageHead('Suscriptores', 'Cuentas de clientes y su suscripción', csvButton()))}
    <div class="kpis" id="skpi"></div>
    <div class="toolbar"><div class="row" style="gap:6px" id="schips"><button class="chip active" data-s="">Todos</button>${Object.keys(SUB_ST).map(s => raw(`<button class="chip" data-s="${s}">${s}</button>`))}</div>
      <select class="select" id="fp" aria-label="Plan"><option value="">Todos los planes</option>${db.all('plans').map(p => raw(`<option value="${p.id}">${escape(p.name)}</option>`))}</select></div>
    <div id="tbl"></div>`;
  const rows = () => { const P = plans(); return db.query('users', u => u.role === 'suscriptor' && (!st.status || u.subStatus === st.status) && (!st.plan || u.plan === st.plan)).map(u => ({ ...u, planName: P[u.plan]?.name || '—', price: P[u.plan]?.price || 0, profiles: db.count('profiles', p => p.userId === u.id), hours: Math.round(db.query('views', v => v.userId === u.id).reduce((s, v) => s + v.minutes, 0) / 60) })); };
  const drawKpi = () => {
    const subs = db.query('users', u => u.role === 'suscriptor'), P = plans();
    const by = s => subs.filter(u => u.subStatus === s).length;
    $('#skpi', el).innerHTML = kpi('Activas', String(by('activa'))) + kpi('En prueba', String(by('prueba'))) + kpi('Morosas', String(by('morosa'))) + kpi('ARPU', money(subs.filter(u => u.subStatus === 'activa').reduce((s, u) => s + (P[u.plan]?.price || 0), 0) / Math.max(1, by('activa'))));
  };
  const t = dataTable($('#tbl', el), {
    rows: rows().sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)), pageSize: 12, search: r => `${r.name} ${r.email}`, onRow: r => show(r.id),
    columns: [
      { key: 'name', label: 'Suscriptor', render: r => userChip(r) },
      { key: 'planName', label: 'Plan', render: r => `${escape(r.planName)}<br><small class="muted">${money(r.price)}/mes</small>` },
      { key: 'subStatus', label: 'Estado', render: r => subBadge(r.subStatus) },
      { key: 'joinedAt', label: 'Alta', render: r => date(r.joinedAt) },
      { key: 'profiles', label: 'Perfiles' },
      { key: 'hours', label: 'Horas vistas' },
      { key: 'id', label: '', sort: false, render: r => `<button class="btn btn-sm btn-ghost" data-edit="${r.id}">Gestionar</button>` }
    ]
  });
  if (query.q) { const i = el.querySelector('[data-q]'); i.value = query.q; i.dispatchEvent(new Event('input')); }
  const refresh = () => { t.update(rows().sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))); drawKpi(); };
  el.querySelector('#schips').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; st.status = b.dataset.s; el.querySelectorAll('#schips .chip').forEach(c => c.classList.toggle('active', c === b)); refresh(); };
  $('#fp', el).onchange = e => { st.plan = e.target.value; refresh(); };

  function show(id) {
    const u = db.get('users', id), P = plans();
    const profs = db.query('profiles', p => p.userId === id);
    const views = db.query('views', v => v.userId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
    const tks = db.query('tickets', x => x.userId === id);
    const m = modal({ title: u.name, size: 'lg', body: `<div class="stack">
      <div class="kv"><div><small>Correo</small>${escape(u.email)}</div><div><small>Plan</small>${escape(P[u.plan]?.name)} · ${money(P[u.plan]?.price)}</div><div><small>Estado</small>${subBadge(u.subStatus)}</div><div><small>Alta</small>${date(u.joinedAt)}</div><div><small>Pago</small>${escape(u.card?.brand || '')} •••• ${escape(u.card?.last4 || '')}</div><div><small>Control parental</small>${u.parentalPin ? 'PIN desde ' + escape(u.pinLevel) : 'Desactivado'}</div></div>
      <h3 style="margin:0">Perfiles</h3><div class="row">${profs.map(p => `<span class="badge plain">${p.avatar} ${escape(p.name)}${p.kids ? ' · infantil' : ''}${p.pin ? ' · 🔒' : ''}</span>`).join('') || '<span class="muted">Sin perfiles</span>'}</div>
      <h3 style="margin:0">Dispositivos</h3><ul class="mini-list">${(u.devices || []).map(d => `<li><span>${escape(d.name)} <small class="muted">(${escape(d.type)})</small></span><small class="muted">${dateTime(d.lastSeen)}</small></li>`).join('')}</ul>
      <h3 style="margin:0">Últimas reproducciones</h3><ul class="mini-list">${views.map(v => `<li><span>${escape(db.get('titles', v.titleId)?.title || '—')}</span><small class="muted">${v.minutes} min · ${escape(v.device)} · ${date(v.createdAt)}</small></li>`).join('') || '<li class="muted">Sin actividad</li>'}</ul>
      ${tks.length ? `<p class="small muted">${tks.length} ticket(s) de soporte · <a href="#/soporte">ver</a></p>` : ''}</div>`,
      foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn" id="m-dev">Cerrar sesiones</button><button class="btn btn-primary" id="m-edit">Cambiar plan / estado</button>' });
    m.el.querySelector('#m-edit').onclick = () => { m.close(); edit(u); };
    m.el.querySelector('#m-dev').onclick = async () => { if (!await confirm('¿Cerrar la sesión en todos los dispositivos de este cliente?', { ok: 'Cerrar sesiones' })) return; db.update('users', u.id, { devices: [] }); db.log('soporte', `Sesiones cerradas: ${u.name}`, user.id); toast('Sesiones cerradas'); m.close(); };
  }
  async function edit(u) {
    const r = await formModal({ title: `Suscripción de ${u.name}`, fields: [
      { name: 'plan', label: 'Plan', type: 'select', options: db.all('plans').map(p => [p.id, `${p.name} · ${money(p.price)}`]), value: u.plan },
      { name: 'subStatus', label: 'Estado', type: 'select', options: Object.keys(SUB_ST), value: u.subStatus },
      { name: 'credit', label: 'Abonar días gratis (compensación)', type: 'number', value: 0 },
      { name: 'note', label: 'Nota interna / mensaje al cliente', type: 'textarea', value: '' }
    ] });
    if (!r) return;
    const patch = { plan: r.plan, subStatus: r.subStatus };
    if (r.subStatus === 'cancelada' && u.subStatus !== 'cancelada') patch.cancelledAt = new Date().toISOString();
    if (r.subStatus !== 'cancelada') patch.cancelledAt = null;
    db.update('users', u.id, patch);
    db.log('suscriptores', `${u.name}: plan ${r.plan}, estado ${r.subStatus}${r.credit ? `, +${r.credit} días` : ''}`, user.id);
    if (r.credit > 0 || r.note) notify(u.id, r.note || `Te abonamos ${r.credit} días gratis en Andes+.`);
    toast('Suscripción actualizada', 'success');
  }
  el.addEventListener('click', e => { const b = e.target.closest('[data-edit]'); if (b) edit(db.get('users', b.dataset.edit)); });
  wireCSV(el, 'suscriptores.csv', () => rows().map(r => ({ id: r.id, nombre: r.name, correo: r.email, plan: r.planName, precio: r.price, estado: r.subStatus, alta: r.joinedAt, baja: r.cancelledAt || '', perfiles: r.profiles, horas: r.hours })));
  drawKpi();
  return { update: refresh };
}
