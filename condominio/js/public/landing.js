// Landing pública de la plataforma Vecindario, con datos en vivo de la comunidad demo.
import { escape, money, ago, debounce } from '../../../assets/core/ui.js';
import { db, auth, settings, homeFor } from '../data/db.js';
import { icon } from '../shared/icons.js';
import { pctFmt, periodLabel } from '../shared/format.js';

const FEATURES = [
  ['money', 'Gastos comunes claros', 'Cálculo por alícuota, detalle del prorrateo y pago en línea con comprobante.'],
  ['calendar', 'Reservas de espacios', 'Quinchos, sala multiuso y piscina con calendario, reglas y cobro automático.'],
  ['qr', 'Visitas con código QR', 'Pre-autoriza a tus visitas y la conserjería valida el acceso en segundos.'],
  ['box', 'Encomiendas', 'Aviso inmediato cuando llega un paquete y registro de quién lo retiró.'],
  ['wrench', 'Mantención', 'Reporta incidencias, sigue su estado y conoce al proveedor asignado.'],
  ['vote', 'Votaciones', 'Consultas y votaciones ponderadas por alícuota para preparar las asambleas.'],
  ['megaphone', 'Avisos y documentos', 'Reglamentos, actas y comunicados siempre a mano.'],
  ['shield', 'Conserjería digital', 'Bitácora de novedades, rondas y búsqueda rápida de residentes.']
];

function render() {
  const s = settings(), u = auth.current();
  const lastPer = db.query('periods', p => p.status === 'publicado').sort((a, b) => b.period.localeCompare(a.period))[0];
  const ch = lastPer ? db.query('charges', c => c.period === lastPer.period) : [];
  const rate = ch.length ? ch.filter(c => c.paid).reduce((t, c) => t + c.total, 0) / ch.reduce((t, c) => t + c.total, 0) * 100 : 0;
  const anns = db.query('announcements', a => a.published && a.public).sort((a, b) => (b.pinned - a.pinned) || b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const openPoll = db.find('polls', p => p.status === 'abierta');
  document.getElementById('app').innerHTML = `
  <header class="site-head"><div class="container">
    <a class="brand" href="#"><span class="mark">${icon('home', 22)}</span><span>Vecindario<small>Comunidades conectadas</small></span></a>
    <nav class="site-nav" style="display:flex;position:static;flex-direction:row;padding:0;background:none;box-shadow:none;border:0">
      <a class="nl hide-sm" href="#funciones">Funciones</a><a class="nl hide-sm" href="#planes">Planes</a>
      ${u ? `<a class="btn btn-primary btn-sm" href="${homeFor(u)}">Ir a mi panel</a>` : '<a class="btn btn-primary btn-sm" href="login.html">Ingresar</a>'}
    </nav></div></header>
  <main>
  <section class="l-hero"><div class="container">
    <div data-anim>
      <span class="eyebrow">Plataforma para condominios</span>
      <h1>${escape(s.heroTitle)}</h1>
      <p class="muted" style="font-size:1.12em;max-width:580px">${escape(s.heroSubtitle)}</p>
      <div class="row"><a class="btn btn-primary btn-lg" href="login.html">Probar la demo</a><a class="btn btn-lg" href="#funciones">Ver funciones</a></div>
      <p class="small muted" style="margin-top:14px">Demo en vivo: <b>${escape(s.community)}</b> · ${escape(s.address)}</p>
    </div>
    <div class="phone" data-anim="zoomIn" aria-hidden="true"><div class="notch"><i></i></div><div class="scr">
      <div class="row between"><b>Hola, Fernanda</b><span class="badge badge-primary plain">B-302</span></div>
      <div class="card"><span class="muted small">Gasto común ${lastPer ? periodLabel(lastPer.period).toLowerCase() : ''}</span><div class="money-big" style="font-size:26px">${money(db.find('charges', c => c.unitId === 'B-302' && c.period === lastPer?.period)?.total || 0)}</div><span class="btn btn-primary btn-sm" style="margin-top:8px">Pagar ahora</span></div>
      <div class="card row" style="gap:10px;flex-wrap:nowrap"><span class="icon-tile">${icon('box')}</span><span class="small"><b>Encomienda en conserjería</b><br>Mercado Envíos · hace 5 h</span></div>
      <div class="card row" style="gap:10px;flex-wrap:nowrap"><span class="icon-tile">${icon('qr')}</span><span class="small"><b>Visita autorizada</b><br>Ricardo Soto · hoy</span></div>
      ${openPoll ? `<div class="card small"><b>Votación abierta</b><br>${escape(openPoll.title)}</div>` : ''}
    </div></div>
  </div></section>

  <section class="container" data-anim><div class="stat-strip">
    ${[[db.count('units'), 'departamentos en la demo'], [pctFmt(rate), `recaudación ${lastPer ? periodLabel(lastPer.period).toLowerCase() : ''}`], [db.count('bookings', b => b.status !== 'cancelada'), 'reservas gestionadas'], [db.count('parcels'), 'encomiendas registradas']].map(([v, l]) => `<div class="card"><div class="stat"><span class="value">${escape(v)}</span><span class="label">${escape(l)}</span></div></div>`).join('')}
  </div></section>

  <section class="section" id="funciones"><div class="container stack">
    <div data-anim><span class="eyebrow">Funciones</span><h2>Todo lo que tu comunidad necesita</h2></div>
    <div class="grid-4">${FEATURES.map(([ic, t, d]) => `<div class="card feature"><span class="icon-tile">${icon(ic, 22)}</span><h3 style="font-size:17px">${t}</h3><p class="muted small" style="margin:0">${d}</p></div>`).join('')}</div>
  </div></section>

  ${s.showAnnouncements !== false && anns.length ? `<section class="section" style="padding-top:0"><div class="container stack">
    <div data-anim><span class="eyebrow">Así se ve un muro de avisos</span><h2>Últimos avisos de ${escape(s.community)}</h2></div>
    <div class="grid-3">${anns.map(a => `<article class="card ann ${a.pinned ? 'pinned' : ''}"><div class="row between"><span class="badge plain">${escape(a.category)}</span>${a.pinned ? '<span class="badge badge-warning">Destacado</span>' : ''}</div><h3 style="margin-top:10px">${escape(a.title)}</h3><p class="muted small">${escape(a.body)}</p><span class="small muted">${ago(a.createdAt)}</span></article>`).join('')}</div>
  </div></section>` : ''}

  <section class="section" style="padding-top:0"><div class="container">
    <div class="card" data-anim style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:24px">
      ${[['Administración', 'Calcula y publica los gastos comunes en minutos, controla la morosidad y gestiona proveedores.', 'administrador'], ['Comité', 'Revisa cuentas, prepara asambleas y conoce los resultados de cada votación.', 'comite'], ['Conserjería', 'Registra visitas, encomiendas y novedades desde un tablet en la recepción.', 'conserje'], ['Residentes', 'Paga, reserva, autoriza visitas y reporta problemas desde el celular.', 'residente']]
        .map(([t, d]) => `<div><h3>${t}</h3><p class="muted small" style="margin:0">${d}</p></div>`).join('')}
    </div></div></section>

  <section class="section" id="planes" style="padding-top:0"><div class="container stack">
    <div data-anim style="text-align:center"><span class="eyebrow">Planes</span><h2>Precio por departamento, sin letra chica</h2><p class="muted">Valores mensuales + IVA. Sin costo de implementación para comunidades sobre 40 unidades.</p></div>
    <div class="grid-3">${(s.plans || []).map(p => `<div class="card plan-card ${p.highlight ? 'hl' : ''}"><div class="row between"><h3 style="margin:0">${escape(p.name)}</h3>${p.highlight ? '<span class="badge badge-primary">Más elegido</span>' : ''}</div>
      <div style="margin-top:14px"><span class="plan-price">${money(p.price)}</span> <span class="muted small">/ depto al mes</span></div>
      <ul class="small">${p.features.map(f => `<li>${escape(f)}</li>`).join('')}</ul><a class="btn ${p.highlight ? 'btn-primary' : ''} btn-block" href="login.html">Probar demo</a></div>`).join('')}</div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="container faq" style="max-width:820px" data-anim>
    <h2>Preguntas frecuentes</h2>
    ${[['¿Cumple con la Ley de Copropiedad 21.442?', 'Sí: prorrateo por alícuota, fondo de reserva, rendición de cuentas mensual y actas disponibles para los copropietarios.'], ['¿Cómo pagan los residentes?', 'Con tarjeta o transferencia desde la app. En esta demo los pagos son simulados.'], ['¿Qué pasa con los vecinos sin smartphone?', 'La conserjería y la administración pueden registrar pagos, visitas y encomiendas por ellos.'], ['¿Puedo probarlo ahora?', 'Sí, entra a la demo con cualquiera de los cuatro roles: administrador, comité, conserje o residente.']].map(([q, a]) => `<details><summary>${q}</summary><p class="muted" style="margin:8px 0 0">${a}</p></details>`).join('')}
  </div></section>
  </main>
  <footer class="site-foot"><div class="container grid-3">
    <div><a class="brand" href="#"><span class="mark">${icon('home', 20)}</span>Vecindario</a><p class="small muted" style="margin-top:10px">Plataforma ficticia creada como demo. Datos simulados en tu navegador.</p></div>
    <div><h4>Demo</h4><a href="login.html">Ingresar con un rol</a><a href="residente.html">App residentes</a><a href="conserjeria.html">Conserjería</a><a href="admin.html">Administración</a></div>
    <div><h4>Comunidad demo</h4><span class="small">${escape(s.community)}</span><br><span class="small muted">${escape(s.address)}</span><br><span class="small muted">Administra: ${escape(s.adminCompany)}</span></div>
  </div></footer>`;
}
render();
db.subscribe(debounce(render, 150));
