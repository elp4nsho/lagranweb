// Inicio: hero editable, impacto, campañas destacadas, uso de fondos, voluntariado y noticias.
import { db, site, publicCampaigns, totals, ok } from '../data/db.js';
import { campaignCard } from './campaigns.js';
import { escape, money, num, date, ago, donutChart } from '../../../assets/core/ui.js';

export default function home(el) {
  const s = site(), t = totals();
  const featured = publicCampaigns().filter(c => c.status === 'publicada').slice(0, 3);
  const exp = db.query('expenses', x => x.published && x.status === 'aprobado' && Date.now() - new Date(x.date) < 365 * 864e5);
  const byCat = ['Programas', 'Operación', 'Recaudación'].map(k => ({ label: k, value: Math.round(exp.filter(x => x.category === k).reduce((a, x) => a + x.amount, 0) / 1e6) }));
  const totalExp = exp.reduce((a, x) => a + x.amount, 0) || 1;
  const progPct = Math.round(exp.filter(x => x.category === 'Programas').reduce((a, x) => a + x.amount, 0) / totalExp * 100);
  const acts = db.query('activities', a => a.status === 'abierta' && a.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const news = db.query('news', n => n.status === 'publicada').sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3);
  const recent = db.query('donations', ok).slice(0, 6);

  el.innerHTML = `
  <section class="hero site-hero">
    <div class="container hero-grid">
      <div class="stack hero-text" data-anim>
        <span class="eyebrow">${escape(s.heroEyebrow)}</span>
        <h1>${escape(s.heroTitle)}</h1>
        <p class="lead muted">${escape(s.heroText)}</p>
        <div class="row"><a class="btn btn-primary btn-lg" href="#/donar">Donar ahora ♥</a><a class="btn btn-lg" href="#/voluntariado">Ser voluntario</a></div>
        <p class="small muted">🔒 Pago seguro simulado · 📄 Certificado al instante · 📊 100% transparente</p>
      </div>
      <div class="hero-art hero-media" data-anim="zoomIn" aria-hidden="true">
        <svg viewBox="0 0 420 360" class="hero-svg">
          <circle cx="300" cy="90" r="46" class="sun"/>
          <path d="M0 250 Q110 170 220 230 T420 210 V360 H0Z" class="hill1"/>
          <path d="M0 290 Q140 240 260 280 T420 270 V360 H0Z" class="hill2"/>
          <g class="tree" transform="translate(80 150)"><rect x="-5" y="60" width="10" height="40"/><path d="M0 0 l40 70 h-80z"/></g>
          <g class="tree t2" transform="translate(140 175)"><rect x="-4" y="44" width="8" height="30"/><path d="M0 0 l30 52 h-60z"/></g>
          <g class="tree" transform="translate(350 160)"><rect x="-5" y="56" width="10" height="36"/><path d="M0 0 l36 64 h-72z"/></g>
          <path d="M230 130 C 214 158 200 172 200 190 a30 30 0 0 0 60 0 C 260 172 246 158 230 130Z" class="drop"/>
          <path d="M190 330 q30 -40 60 0" class="sprout"/><path d="M220 330 v-38 M220 300 q-18 -4 -22 -22 q18 2 22 22z M220 296 q16 -6 22 -22 q-18 0 -22 22z" class="sprout"/>
        </svg>
      </div>
    </div>
  </section>

  <section class="impact h-impact"><div class="container grid-4">
    ${s.impact.map(i => `<div class="card impact-card" data-anim><span class="imp-ico" aria-hidden="true">${escape(i.icon)}</span><b class="imp-val">${escape(i.value)}</b><span class="muted small">${escape(i.label)}</span></div>`).join('')}
  </div>
  <div class="container live-strip small muted">En ${new Date().getFullYear()}: <b>${money(t.raisedYear)}</b> recaudados · <b>${num(t.donorsYear)}</b> donantes · <b>${num(t.monthly)}</b> socios mensuales · <b>${num(t.volunteers)}</b> voluntarios activos</div></section>

  <section class="section h-camps"><div class="container stack">
    <div class="row between" data-anim><div><span class="eyebrow">Campañas activas</span><h2 style="margin:0">Tu aporte, directo al territorio</h2></div><a class="btn" href="#/campanas">Ver todas →</a></div>
    <div class="grid-3 camp-grid">${featured.map(campaignCard).join('')}</div>
  </div></section>

  <section class="section tint h-transp"><div class="container split-2">
    <div class="stack" data-anim><span class="eyebrow">Transparencia</span><h2 style="margin:0">${progPct}% de cada peso va directo a los programas</h2>
      <p class="muted">Publicamos cada gasto aprobado, por proyecto y proveedor. Nuestra meta es mantener los gastos de operación bajo el ${s.overheadGoal}%.</p>
      <div><a class="btn btn-primary" href="#/transparencia">Ver en qué se usa tu donación</a></div></div>
    <div class="card" data-anim>${donutChart(byCat, { label: `${progPct}%` })}<p class="small muted" style="margin:10px 0 0">Millones de pesos, últimos 12 meses.</p></div>
  </div></section>

  <section class="section h-monthly"><div class="container split-2">
    <div class="card monthly-band stack" data-anim>
      <span class="eyebrow">Socio mensual</span><h2 style="margin:0">Desde $3.000 al mes</h2><p class="muted" style="margin:0">${escape(s.monthlyPitch)}</p>
      <div><a class="btn btn-primary" href="#/donar?type=mensual">Quiero ser socio</a></div></div>
    <div class="stack" data-anim><div class="row between"><h3 style="margin:0">Próximas actividades</h3><a class="small" href="#/voluntariado">Calendario →</a></div>
      ${acts.map(a => `<a class="card act-row hover" href="#/voluntariado"><span class="date-chip"><b>${new Date(a.date + 'T12:00').getDate()}</b><small>${escape(new Date(a.date + 'T12:00').toLocaleDateString('es-CL', { month: 'short' }))}</small></span><span><b>${escape(a.title)}</b><br><span class="small muted">${escape(a.place)} · ${a.slots - a.enrolled.length} cupos</span></span></a>`).join('') || '<p class="muted">Pronto publicaremos nuevas actividades.</p>'}</div>
  </div></section>

  <section class="section tint h-news"><div class="container stack">
    <div class="row between" data-anim><div><span class="eyebrow">Noticias</span><h2 style="margin:0">Lo que está pasando</h2></div><a class="btn" href="#/noticias">Todas las noticias</a></div>
    <div class="grid-3 news-grid">${news.map(n => `<a class="card hover news-card" href="#/noticias/${n.id}"><span class="badge badge-primary plain">${escape(n.category)}</span><h3>${escape(n.title)}</h3><p class="muted small">${escape(n.excerpt)}</p><span class="small muted">${escape(date(n.publishedAt))}</span></a>`).join('')}</div>
  </div></section>

  <section class="section h-donors"><div class="container stack">
    <h2 style="margin:0" data-anim>Gracias a quienes donaron hoy</h2>
    <div class="donor-ticker">${recent.map(d => `<span class="badge plain">♥ ${d.anonymous ? 'Anónimo' : escape(d.donorName.split(' ')[0])} · ${money(d.amount)} · ${escape(ago(d.createdAt))}</span>`).join('')}</div>
  </div></section>`;
}
