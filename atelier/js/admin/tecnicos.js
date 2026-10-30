// Técnicos: especialidad, nivel, certificaciones con vencimiento, productividad y carga actual.
import { escape, toast, formModal, confirm, date } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { techs, vehicleName, vehicleById, woState } from '../shared/domain.js';
import { COLORS } from '../data/catalog.js';
import { DAY } from '../shared/util.js';

async function editTech(t, ctx) {
  const v = await formModal({ title: t ? `Editar · ${t.name}` : 'Nuevo técnico', fields: [
    { name: 'name', label: 'Nombre', required: true, value: t?.name }, { name: 'email', label: 'Correo', type: 'email', required: true, value: t?.email },
    { name: 'specialty', label: 'Especialidad', required: true, value: t?.specialty }, { name: 'level', label: 'Nivel', type: 'select', options: ['Técnico', 'Senior', 'Master'], value: t?.level || 'Técnico' }, { name: 'active', label: 'Activo', type: 'checkbox', value: t ? t.active !== false : true }] });
  if (!v) return;
  if (db.find('users', u => u.email.toLowerCase() === v.email.toLowerCase() && u.id !== t?.id)) { toast('Correo ya registrado', 'warning'); return; }
  if (t) db.update('users', t.id, v); else db.insert('users', { ...v, role: 'tecnico', password: 'demo123', demo: false, color: COLORS[db.count('users') % COLORS.length], certs: [] });
  db.log('tecnicos', `${t ? 'Técnico editado' : 'Técnico creado'}: ${v.name}`, ctx.user.id); toast('Técnico guardado (clave inicial demo123)', 'success');
}
async function addCert(t, ctx) {
  const v = await formModal({ title: `Certificación · ${t.name}`, fields: [{ name: 'name', label: 'Certificación', required: true }, { name: 'issuer', label: 'Emisor', required: true }, { name: 'exp', label: 'Vence', type: 'date', required: true }] });
  if (!v) return;
  db.update('users', t.id, { certs: [...(t.certs || []), v] }); db.log('tecnicos', `${t.name}: certificación ${v.name}`, ctx.user.id); toast('Certificación agregada', 'success');
}
const certBadge = exp => { const d = (new Date(exp) - Date.now()) / DAY; return d < 0 ? '<span class="badge badge-danger">Vencida</span>' : d < 60 ? `<span class="badge badge-warning">Vence en ${Math.ceil(d)} d</span>` : '<span class="badge badge-success">Vigente</span>'; };

export default {
  id: 'tecnicos', label: 'Técnicos y certificaciones', icon: '🧑‍🔧', group: 'Equipo', roles: ['admin', 'gerente'],
  watch: ['users', 'workOrders'],
  render(el, ctx) {
    const list = db.query('users', u => u.role === 'tecnico');
    const ws = db.all('workOrders'), d30 = ws.filter(w => w.status === 'entregada' && Date.now() - new Date(w.deliveredAt) < 30 * DAY);
    const expiring = list.flatMap(t => (t.certs || []).filter(c => (new Date(c.exp) - Date.now()) / DAY < 60)).length;
    el.innerHTML = `${pageHead('Técnicos y certificaciones', 'Especialidades, vigencia de certificaciones y carga de trabajo', '<button class="btn btn-primary btn-sm" data-new>+ Técnico</button>')}
      <div class="kpi-grid">${kpi('Técnicos activos', String(techs().length))}${kpi('Certificaciones por vencer', String(expiring), 'en los próximos 60 días', !expiring)}${kpi('Horas facturadas (30 d)', String(Math.round(d30.reduce((a, w) => a + (w.laborHours || 0), 0))))}</div>
      <div class="grid-auto">${list.map(t => {
        const mine = d30.filter(w => w.techId === t.id), hrs = mine.reduce((a, w) => a + (w.laborHours || 0), 0), logged = mine.reduce((a, w) => a + (w.loggedMins || 0), 0) / 60;
        const active = ws.filter(w => w.techId === t.id && !['entregada', 'cancelada', 'agendada'].includes(w.status));
        const eff = logged ? Math.round(hrs / logged * 100) : 0;
        return `<div class="card stack"><div class="row" style="gap:10px"><span class="avatar" style="--av:${escape(t.color)}">${escape(t.name.split(' ').map(x => x[0]).join('').slice(0, 2))}</span><span class="grow"><b>${escape(t.name)}</b>${t.active === false ? ' <span class="badge">Inactivo</span>' : ''}<small class="muted d-block">${escape(t.specialty || '')} · ${escape(t.level || '')}</small></span><button class="btn btn-sm btn-ghost" data-edit="${t.id}">Editar</button></div>
          <div class="grid-3 small"><div><span class="label">Productividad</span><br><b>${Math.round(hrs / (22 * 7.5) * 100)}%</b></div><div><span class="label">Eficiencia</span><br><b>${eff}%</b></div><div><span class="label">OT activas</span><br><b>${active.length}</b></div></div>
          <div class="progress"><i style="--v:${Math.min(100, Math.round(hrs / (22 * 7.5) * 100))}%"></i></div>
          <div class="stack" style="gap:4px"><div class="row between"><span class="label">Certificaciones</span><button class="btn btn-sm btn-ghost" data-cert="${t.id}">+ Agregar</button></div>
            ${(t.certs || []).map((c, i) => `<div class="row between small" style="gap:6px"><span>${escape(c.name)}<small class="muted d-block">${escape(c.issuer)} · vence ${date(c.exp + 'T12:00:00')}</small></span><span class="row" style="gap:4px">${certBadge(c.exp)}<button class="btn btn-sm btn-ghost" data-delc="${t.id}|${i}" aria-label="Quitar">✕</button></span></div>`).join('') || '<small class="muted">Sin certificaciones</small>'}</div>
          ${active.length ? `<div class="small"><span class="label">En curso</span>${active.map(w => `<div>${escape(w.code)} · ${escape(vehicleName(vehicleById(w.vehicleId)))} <span class="badge badge-${woState(w.status).badge}">${escape(woState(w.status).label)}</span></div>`).join('')}</div>` : ''}</div>`;
      }).join('')}</div>`;
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-new]')) return editTech(null, ctx);
      const ed = e.target.closest('[data-edit]'); if (ed) return editTech(db.get('users', ed.dataset.edit), ctx);
      const c = e.target.closest('[data-cert]'); if (c) return addCert(db.get('users', c.dataset.cert), ctx);
      const d = e.target.closest('[data-delc]'); if (d) { const [id, i] = d.dataset.delc.split('|'); const t = db.get('users', id); if (await confirm(`¿Quitar ${t.certs[+i].name}?`, { danger: true, ok: 'Quitar' })) db.update('users', id, { certs: t.certs.filter((_, k) => k !== +i) }); }
    });
  }
};
