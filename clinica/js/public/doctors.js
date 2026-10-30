import { escape, norm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { activeSpecialties, activeDoctors, doctor, specialty, box, freeSlots, priceFor } from '../shared/domain.js';
import { ymd, addDays, DOW_S, fmtShort } from '../shared/dates.js';
import { templateSlots } from '../shared/slots.js';
import { icon } from '../shared/icons.js';
import { docCard } from './home.js';

const st = { esp: '', q: '', tele: false };

export function renderDoctors(el, _, query) {
  if (query.esp !== undefined) st.esp = query.esp;
  const specs = activeSpecialties();
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="section-head" data-anim><div><span class="eyebrow">Staff médico</span><h1>Directorio de profesionales</h1><p class="muted mb0">Revisa su experiencia, horarios y próximas horas disponibles.</p></div></div>
    <div class="card stack">
      <div class="row"><label class="search-box grow" style="max-width:none">${icon('search', 16)}<input class="input" type="search" placeholder="Buscar por nombre…" value="${escape(st.q)}" data-q aria-label="Buscar profesional"></label>
      <label class="check"><input type="checkbox" data-tele ${st.tele ? 'checked' : ''}> Solo telemedicina</label></div>
      <div class="row" style="gap:8px"><button class="chip ${!st.esp ? 'active' : ''}" data-esp="">Todas</button>${specs.map(s => `<button class="chip ${st.esp === s.id ? 'active' : ''}" data-esp="${s.id}">${escape(s.name)}</button>`).join('')}</div>
    </div>
    <div class="grid-auto" data-list></div>
  </div></section>`;
  const list = el.querySelector('[data-list]');
  const draw = () => {
    const docs = activeDoctors(st.esp || undefined).filter(d => (!st.tele || d.tele) && (!st.q || norm(d.name).includes(norm(st.q))));
    list.innerHTML = docs.length ? docs.map(docCard).join('') : `<div class="card empty" style="grid-column:1/-1">No encontramos profesionales con esos filtros.</div>`;
  };
  draw();
  el.querySelector('[data-q]').addEventListener('input', e => { st.q = e.target.value; draw(); });
  el.querySelector('[data-tele]').addEventListener('change', e => { st.tele = e.target.checked; draw(); });
  el.querySelectorAll('[data-esp]').forEach(b => b.addEventListener('click', () => { st.esp = b.dataset.esp; el.querySelectorAll('[data-esp]').forEach(x => x.classList.toggle('active', x === b)); draw(); }));
}

export function renderDoctor(el, { id }) {
  const d = doctor(id);
  if (!d || d.active === false) { el.innerHTML = `<section class="section"><div class="container empty"><h1>Profesional no disponible</h1><a class="btn" href="#/medicos">Volver al directorio</a></div></section>`; return; }
  const s = specialty(d.specialtyId), sc = d.schedule, slots = templateSlots(sc);
  const days = []; for (let i = 0; days.length < 6 && i < 21; i++) { const dt = addDays(ymd(), i); const f = freeSlots(d, dt); if (f.length) days.push([dt, f]); }
  el.innerHTML = `<section class="section"><div class="container stack">
    <a href="#/medicos" class="small">${icon('back', 14)} Directorio</a>
    <div class="card doc-hero" data-anim>
      <span class="avatar" style="--av:${d.color}">${escape(initials(d.name.replace(/^(Dra?\.|Ps\.|Nut\.)\s*/, '')))}</span>
      <div class="stack" style="gap:8px">
        <div><span class="eyebrow">${escape(s?.name || '')}</span><h1 class="mb0">${escape(d.name)}</h1></div>
        <p class="muted mb0">${escape(d.bio)}</p>
        <div class="tag-list"><span class="rating">${icon('star', 16)} ${d.rating}</span><span class="muted small">${d.reviews} opiniones</span>
        ${d.tele ? `<span class="badge badge-info">${icon('video', 12)} Atiende por telemedicina</span>` : ''}<span class="badge">${escape(box(d.boxId)?.name || 'Box por asignar')}</span><span class="badge">RUT ${escape(d.rut)}</span></div>
        <div class="row"><a class="btn btn-primary" href="#/reservar?esp=${d.specialtyId}&med=${d.id}">${icon('calendar', 16)} Reservar con ${escape(d.name.split(' ').slice(0, 2).join(' '))}</a></div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card stack">
        <h3 class="mb0">Horario de atención</h3>
        <div class="week-table">${[1, 2, 3, 4, 5, 6, 0].map(k => `<div class="d ${sc.days.includes(k) ? 'on' : 'off'}"><b>${DOW_S[k]}</b>${sc.days.includes(k) ? `${sc.start}<br>${sc.end}` : '—'}</div>`).join('')}</div>
        <p class="muted small mb0">Consultas de ${sc.slot} minutos · ${slots.length} cupos por jornada${sc.breakStart ? ` · Pausa ${sc.breakStart}–${sc.breakEnd}` : ''}</p>
        <div class="table-wrap"><table class="table"><tbody>
          <tr><td>Fonasa (copago bono)</td><td><b>${priceFor(d.specialtyId, 'fonasa-b').toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</b></td></tr>
          <tr><td>Isapre (copago estimado)</td><td><b>${priceFor(d.specialtyId, 'cordillera').toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</b></td></tr>
          <tr><td>Particular</td><td><b>${priceFor(d.specialtyId, 'particular').toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</b></td></tr>
        </tbody></table></div>
      </div>
      <div class="card stack">
        <h3 class="mb0">Próximas horas disponibles</h3>
        ${days.length ? days.map(([dt, f]) => `<div class="slot-group"><h4 style="text-transform:capitalize">${escape(fmtShort(dt))} · ${f.length} disponibles</h4><div class="slots">${f.slice(0, 8).map(t => `<a class="slot center" style="text-decoration:none" href="#/reservar?esp=${d.specialtyId}&med=${d.id}&fecha=${dt}&hora=${t}">${t}</a>`).join('')}</div></div>`).join('') : '<div class="empty">Sin horas en las próximas 3 semanas.</div>'}
      </div>
    </div>
  </div></section>`;
}
