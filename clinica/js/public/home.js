import { escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { settings, activeSpecialties, activeDoctors, specialty, nextAvailable } from '../shared/domain.js';
import { fmtShort } from '../shared/dates.js';
import { icon } from '../shared/icons.js';
import { money } from '../../../assets/core/ui.js';
import { heroArt, mapArt } from './art.js';

export function specCard(s) {
  const n = activeDoctors(s.id).length;
  return `<a class="card hover spec-card" href="#/especialidades/${s.id}">
    <span class="icon-bubble">${icon(s.icon, 24)}</span>
    <h3 class="mb0">${escape(s.name)}</h3>
    <p>${escape(s.desc)}</p>
    <span class="meta"><span class="muted">${n} profesional${n === 1 ? '' : 'es'}</span><span>Fonasa desde <b>${money(s.prices.fonasa)}</b></span></span>
  </a>`;
}
export function docCard(d) {
  const s = specialty(d.specialtyId), nx = nextAvailable(d, 14);
  return `<article class="card hover doc-card">
    <div class="top"><span class="avatar" style="--av:${d.color}">${escape(initials(d.name.replace(/^(Dra?\.|Ps\.|Nut\.)\s*/, '')))}</span>
      <div><h3>${escape(d.name)}</h3><span class="muted small">${escape(s?.name || '')}</span><div class="small"><span class="rating">${icon('star', 14)} ${d.rating}</span> <span class="muted">(${d.reviews} opiniones)</span></div></div></div>
    <p class="bio">${escape(d.bio)}</p>
    <div class="tag-list">${d.tele ? `<span class="badge badge-info">${icon('video', 12)} Telemedicina</span>` : ''}${nx ? `<span class="badge badge-success">Próxima: ${escape(fmtShort(nx.date))} ${nx.time}</span>` : '<span class="badge">Sin horas próximas</span>'}</div>
    <div class="foot"><a class="btn btn-ghost btn-sm" href="#/medicos/${d.id}">Ver perfil</a><a class="btn btn-primary btn-sm" href="#/reservar?esp=${d.specialtyId}&med=${d.id}">Reservar</a></div>
  </article>`;
}

export function renderHome(el) {
  const s = settings(), specs = activeSpecialties(), docs = activeDoctors();
  const attended = db.count('appointments', a => a.status === 'atendida');
  el.innerHTML = `
  <section class="hero"><div class="container hero-grid">
    <div data-anim>
      <span class="eyebrow">${escape(s.tagline)}</span>
      <h1>${escape(s.heroTitle)}</h1>
      <p class="lead">${escape(s.heroText)}</p>
      <div class="row">
        <a class="btn btn-primary btn-lg" href="#/reservar">${icon('calendar', 18)} Reservar hora</a>
        ${s.teleEnabled ? `<a class="btn btn-lg" href="#/telemedicina">${icon('video', 18)} Telemedicina</a>` : ''}
      </div>
      <div class="hero-badges"><span class="badge badge-success">Convenio Fonasa</span><span class="badge badge-primary">Isapres</span><span class="badge badge-info">Bono electrónico IMED</span></div>
    </div>
    <div class="hero-art" data-anim data-anim-delay="150">${heroArt()}</div>
  </div></section>

  <section class="container quick" aria-label="Accesos rápidos">
    <a href="#/reservar"><div class="card hover"><span class="icon-bubble">${icon('calendar', 22)}</span><span><b>Reservar hora</b><small class="muted">En 4 pasos, 24/7</small></span></div></a>
    <a href="#/telemedicina"><div class="card hover"><span class="icon-bubble accent">${icon('video', 22)}</span><span><b>Telemedicina</b><small class="muted">Entra a tu sala virtual</small></span></div></a>
    <a href="#/resultados"><div class="card hover"><span class="icon-bubble">${icon('flask', 22)}</span><span><b>Resultados</b><small class="muted">Descarga tus exámenes</small></span></div></a>
    <a href="#/mi-hora"><div class="card hover"><span class="icon-bubble accent">${icon('edit', 22)}</span><span><b>Mi hora</b><small class="muted">Confirmar, anular o cambiar</small></span></div></a>
  </section>

  <section class="section"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Especialidades</span><h2>Todo lo que tu familia necesita</h2></div><a class="btn btn-ghost" href="#/especialidades">Ver todas ${icon('arrow', 16)}</a></div>
    <div class="grid-auto">${specs.slice(0, 8).map(specCard).join('')}</div>
  </div></section>

  <section class="section tight"><div class="container grid-4">
    <div class="card stat" data-anim><span class="label">Especialistas</span><span class="value">${docs.length}</span><span class="muted small">en ${specs.length} especialidades</span></div>
    <div class="card stat" data-anim data-anim-delay="80"><span class="label">Atenciones recientes</span><span class="value">${attended.toLocaleString('es-CL')}</span><span class="muted small">últimas 6 semanas</span></div>
    <div class="card stat" data-anim data-anim-delay="160"><span class="label">Satisfacción</span><span class="value">4,8 / 5</span><span class="muted small">encuesta post atención</span></div>
    <div class="card stat" data-anim data-anim-delay="240"><span class="label">Espera promedio</span><span class="value">9 min</span><span class="muted small">en sala, con check-in</span></div>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Nuestro equipo</span><h2>Profesionales destacados</h2></div><a class="btn btn-ghost" href="#/medicos">Ver directorio ${icon('arrow', 16)}</a></div>
    <div class="grid-auto">${docs.slice(0, 4).map(docCard).join('')}</div>
  </div></section>

  <section class="section tight"><div class="container grid-2">
    <div class="card stack" data-anim>
      <span class="eyebrow">Cómo llegar</span><h2 class="mb0">Estamos en Ñuñoa</h2>
      <p class="muted mb0">${icon('pin', 16)} ${escape(s.address)}<br>${icon('clock', 16)} ${escape(s.hours)}<br>${icon('phone', 16)} ${escape(s.phone)} · WhatsApp ${escape(s.whatsapp)}</p>
      ${mapArt()}
    </div>
    <div class="card stack" data-anim data-anim-delay="120">
      <span class="eyebrow">Previsión</span><h2 class="mb0">Atendemos Fonasa, Isapres y particulares</h2>
      <p class="muted">Compra tu bono en recepción con huella o en línea. El valor que ves al reservar es tu copago estimado según tu previsión.</p>
      <div class="table-wrap"><table class="table"><thead><tr><th>Especialidad</th><th>Fonasa</th><th>Isapre</th><th>Particular</th></tr></thead><tbody>
      ${specs.slice(0, 5).map(x => `<tr><td>${escape(x.name)}</td><td>${money(x.prices.fonasa)}</td><td>${money(x.prices.isapre)}</td><td>${money(x.prices.particular)}</td></tr>`).join('')}
      </tbody></table></div>
      <a class="btn btn-primary" href="#/reservar">Reservar ahora</a>
    </div>
  </div></section>`;
}
