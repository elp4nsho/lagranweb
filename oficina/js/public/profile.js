// Ficha de una persona (modal) con ubicación, contacto, jefatura y equipo.
import { modal, escape, toast } from '../../../assets/core/ui.js';
import { avatar, areaTag, statusBadge } from '../shared/util.js';
import { miniMap } from '../shared/floorplan.js';

export function personLink(idx, q) {
  return `<button type="button" class="person-link" data-open="${q.id}">${avatarDot(idx, q, 34)}<span><span class="nm">${escape(q.name)}</span><span class="sub">${escape(q.cargo)}</span></span></button>`;
}
export function avatarDot(idx, p, size = 40) {
  const st = idx.statusOf(p);
  return avatar(p, size).replace('</span>', `<i class="st-dot ${st}" title="${st}"></i></span>`);
}

export function openProfile(ctx, id, { onLocate } = {}) {
  const idx = ctx.idx, p = idx.byId[id];
  if (!p) return toast('No encontramos a esa persona', 'warning');
  const site = ctx.site || {};
  const mgr = p.managerId ? idx.byId[p.managerId] : null;
  const reps = idx.reports[p.id] || [];
  const sid = idx.seatOf(p), r = idx.resByPerson[p.id];
  let loc;
  if (sid) {
    const i = idx.desk[sid];
    loc = `<div class="loc-card"><div><span class="muted small">${r ? (r.status === 'checkin' ? 'Puesto flexible hoy (check-in)' : 'Reserva de hoy') : 'Puesto asignado'}</span><strong>${escape(i.floor.name)} · ${escape(i.desk.code)}</strong><span class="muted small">${escape(i.zone?.name || '')}</span></div><button type="button" class="btn btn-primary" data-locate="${p.id}">📍 Ver en el mapa</button></div>
      <div style="margin-top:10px">${miniMap(i.floor, idx, sid, { w: 520, h: 300 })}</div>`;
  } else {
    loc = `<div class="loc-card"><div><span class="muted small">Sin puesto asignado hoy</span><strong>${p.remoteOnly ? 'Trabajo remoto' : 'Puesto flexible (sin reserva hoy)'}</strong><span class="muted small">${escape(p.city || '')}</span></div></div>`;
  }
  const body = `
    <div class="profile-hero">${avatarDot(idx, p, 72)}<div><h2>${escape(p.name)}</h2><div class="muted">${escape(p.cargo)}</div><div class="row gap-sm" style="margin-top:6px">${areaTag(idx.area(p))}${statusBadge(idx.statusOf(p))}</div></div></div>
    ${p.bio ? `<p>${escape(p.bio)}</p>` : ''}
    <div class="profile-sec"><h3>Ubicación</h3>${loc}</div>
    <div class="profile-sec"><h3>Contacto</h3><dl class="kv">
      <dt>Correo</dt><dd><a href="mailto:${escape(p.email)}">${escape(p.email)}</a> <button type="button" class="btn btn-sm btn-ghost" data-copy="${escape(p.email)}">Copiar</button></dd>
      ${site.showPhones !== false ? `<dt>Teléfono</dt><dd>${escape(p.phone)}</dd>` : ''}
      <dt>Anexo</dt><dd><b>${escape(p.ext)}</b></dd>
      <dt>Ciudad</dt><dd>${escape(p.city || '')}</dd>
      <dt>En la empresa</dt><dd>Desde ${escape(p.since)}</dd>
      <dt>Días en oficina</dt><dd>${(p.workDays || []).length ? p.workDays.map(d => ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie'][d]).join(', ') : 'Remoto'}</dd>
    </dl></div>
    <div class="profile-sec"><h3>Jefatura</h3>${mgr ? personLink(idx, mgr) : `<p class="muted small">Máxima autoridad de ${escape(idx.company.name)}.</p>`}</div>
    ${reps.length ? `<div class="profile-sec"><h3>Equipo directo (${reps.length})</h3><div class="plist">${reps.map(q => personLink(idx, q)).join('')}</div></div>` : ''}
    <div class="profile-sec"><h3>Habilidades</h3><div class="row gap-sm">${(p.skills || []).map(s => `<span class="skill">${escape(s)}</span>`).join('')}</div></div>`;
  const m = modal({ title: 'Perfil', body, size: 'lg' });
  m.el.addEventListener('click', e => {
    const o = e.target.closest('[data-open]'), l = e.target.closest('[data-locate]'), c = e.target.closest('[data-copy]');
    if (o) { m.close(); openProfile(ctx, o.dataset.open, { onLocate }); }
    else if (l) { m.close(); (onLocate || ctx.locate)(l.dataset.locate); }
    else if (c) { navigator.clipboard?.writeText(c.dataset.copy).then(() => toast('Copiado al portapapeles', 'success'), () => toast('No se pudo copiar', 'warning')); }
  });
  return m;
}
