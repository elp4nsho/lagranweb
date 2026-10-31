// Sitio público de Gallada: qué es una polla, simulador, unirse con código, verificar sorteo/comprobante y ayuda.
import { app, db, auth } from './app.js';
import * as L from './logic.js';
import * as V from './views.js';
import { joinHTML, mountJoin, findByCode, notFound } from './join.js';
import { html, raw, money, toast, escape } from '../../assets/core/ui.js';
import { emptyState } from '../../assets/core/blocks.js';

const S = () => app.settings();
const sec = (inner, cls = '') => html`<section class="section ${cls}"><div class="container">${raw(inner)}</div></section>`;
const head = (eyebrow, title, sub = '') => html`<div class="g-sec-head" data-anim><span class="eyebrow">${eyebrow}</span><h2>${title}</h2>${sub ? html`<p class="muted">${sub}</p>` : ''}</div>`;

// Ilustración: la gallada en ronda alrededor del pozo (tokens del estilo dentro del SVG)
const heroArt = () => `<svg class="g-hero-art" viewBox="0 0 360 360" role="img" aria-label="Ocho personas en ronda alrededor de un pozo de plata">
  <defs><radialGradient id="gpot" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--primary)"/></radialGradient></defs>
  <circle cx="180" cy="180" r="150" fill="none" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 8"/>
  <g class="g-ring">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, x = 180 + Math.cos(a) * 150, y = 180 + Math.sin(a) * 150; return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="24" fill="var(--surface)" stroke="${i === 0 ? 'var(--accent)' : 'var(--primary)'}" stroke-width="${i === 0 ? 5 : 3}"/><circle cy="-6" r="8" fill="${i === 0 ? 'var(--accent)' : 'var(--primary)'}" opacity=".85"/><path d="M-12 14 q12 -16 24 0" fill="${i === 0 ? 'var(--accent)' : 'var(--primary)'}" opacity=".85"/><text y="44" text-anchor="middle" font-size="13" font-weight="700" fill="var(--muted)">${i + 1}</text></g>`; }).join('')}</g>
  <g class="g-arrows" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, x1 = 180 + Math.cos(a) * 112, y1 = 180 + Math.sin(a) * 112, x2 = 180 + Math.cos(a) * 78, y2 = 180 + Math.sin(a) * 78; return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" opacity=".55"/>`; }).join('')}</g>
  <path d="M180 30 A150 150 0 0 1 286 74" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" marker-end="url(#ga)"/>
  <marker id="ga" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="var(--accent)"/></marker>
  <ellipse cx="180" cy="214" rx="62" ry="14" fill="var(--text)" opacity=".08"/>
  <path d="M128 168 h104 l-10 46 q-42 14 -84 0z" fill="url(#gpot)"/><ellipse cx="180" cy="168" rx="52" ry="12" fill="var(--primary)"/><ellipse cx="180" cy="166" rx="44" ry="8" fill="var(--accent)"/>
  <g class="g-coins"><circle cx="164" cy="150" r="11" fill="var(--warning)" stroke="var(--text)" stroke-opacity=".25"/><circle cx="190" cy="140" r="11" fill="var(--warning)" stroke="var(--text)" stroke-opacity=".25"/><circle cx="178" cy="124" r="11" fill="var(--warning)" stroke="var(--text)" stroke-opacity=".25"/><text x="178" y="129" text-anchor="middle" font-size="13" font-weight="800" fill="var(--text)" opacity=".7">$</text></g>
  <text x="180" y="200" text-anchor="middle" font-size="15" font-weight="800" fill="var(--on-primary)">POZO</text>
</svg>`;

function home(view) {
  const s = S(), ps = db.all('pollas');
  const moved = db.query('movements', m => m.type === 'aporte').reduce((t, m) => t + m.amount, 0);
  const done = db.query('payments', x => ['confirmado', 'regularizado'].includes(x.status)), onTime = done.filter(x => !(x.history || []).some(h => h.to === 'atrasado')).length;
  const sim = L.simulate({ amount: 50000, members: 10, freq: 'mensual', start: L.addDays(L.today(), 10) });
  view.innerHTML = html`<section class="section site-hero g-hero"><div class="container">
      <div class="hero-text stack">
        <span class="eyebrow">🐣 Gallada · pollas entre amigos</span>
        <h1>${s.tagline}</h1>
        <p class="lead muted">Organiza la polla de la pega, la familia o la feria sin cuadernos ni planillas: cada cuota, cada turno y cada pozo quedan anotados, con recordatorios por WhatsApp y un libro que siempre cuadra.</p>
        <div class="row"><a class="btn btn-primary btn-lg" href="#/simulador">Simular mi polla</a><a class="btn btn-lg" href="#/unirse">Tengo un código</a></div>
        <form class="g-hero-join" data-join novalidate><input class="input" name="code" placeholder="Código, ej: AROMOS-24" aria-label="Buscar polla por código"><button class="btn btn-accent" type="submit">Unirme</button></form>
        <p class="small muted">Gratis para organizar · Gallada no toca tu plata: se transfiere directo a quien organiza.</p>
      </div>
      <div class="hero-media">${raw(heroArt())}</div>
    </div></section>
    ${raw(sec(html`${head('Cómo funciona', 'Una polla, en cuatro pasos', 'Todos ponen lo mismo cada período y cada vez uno distinto se lleva el pozo completo, hasta que todos lo reciben una vez.')}
      <div class="grid-4 g-steps">${[['1', '👥', 'Arma la gallada', 'Define cuota, frecuencia y cupos. Invita con un código o un enlace por WhatsApp.'], ['2', '🎲', 'Asignen los turnos', 'Sorteo en vivo con semilla verificable, orden acordado, por llegada o remate.'], ['3', '💸', 'Paguen cada ronda', 'Cada quien informa su transferencia; la organización confirma y sale el comprobante.'], ['4', '🎉', 'Llega el pozo', 'Se entrega al turno de la ronda, que confirma en la app. ¡Y a la siguiente!']].map(([n, i, t, d]) => html`<article class="card g-step"><span class="g-step-n">${n}</span><span class="g-step-ico" aria-hidden="true">${i}</span><h3>${t}</h3><p class="muted">${d}</p></article>`)}</div>`))}
    ${raw(sec(html`<div class="g-split"><div data-anim>${raw(head('Ejemplo', `10 personas × ${money(50000)} mensual`, ''))}<p>Cada mes se juntan <b>${money(sim.pot)}</b>. En ${sim.rows.length} meses todos recibieron una vez y aportaron lo mismo: nadie gana ni pierde, pero quien necesita la plata antes la tiene <b>sin intereses de banco</b>.</p><p class="muted small">¿Y si hay remate? Quien quiere recibir antes ofrece un descuento que se reparte entre el resto: los últimos turnos ganan algo más.</p><a class="btn btn-primary" href="#/simulador">Probar con mis números</a></div>
      <div class="card g-mini-cal" data-anim>${sim.rows.slice(0, 5).map(r => html`<div class="g-mini-row"><span class="g-turn-n">${r.turn}</span><span>${L.fdateShort(r.date)}</span><b>${money(r.receives)}</b></div>`)}<div class="g-mini-row muted"><span class="g-turn-n">…</span><span>hasta ${L.fdate(sim.end)}</span><b>${money(sim.pot)}</b></div></div></div>`))}
    ${raw(sec(html`${head('Modalidades', 'Cada gallada a su manera')}
      <div class="grid-3 g-modes">${[['🎲', 'Sorteo verificable', 'Se sortea en vivo con una semilla pública. Cualquiera puede repetirlo en "Verificar" y obtener el mismo orden: cero sospechas.'], ['↕️', 'Orden fijo', 'Arrastra los cupos al orden que acordaron en la junta. Ideal para la familia.'], ['🏁', 'Por llegada', 'Quien se inscribe primero elige su turno en el calendario.'], ['🔨', 'Remate', 'Cada ronda se puja: el mayor descuento se lleva el pozo y ese descuento se reparte entre el resto.'], ['½', 'Medio cupo', 'Dos personas comparten un cupo: pagan la mitad cada una y se reparten el pozo, con el peso impar bien asignado.'], ['📅', 'Cualquier frecuencia', 'Semanal, quincenal (día 1 y 16), mensual respetando fin de mes, o cada N días.']].map(([i, t, d]) => html`<article class="card g-mode"><span class="g-mode-ico" aria-hidden="true">${i}</span><h3>${t}</h3><p class="muted">${d}</p></article>`)}</div>`))}
    ${raw(sec(html`<div class="g-split">${raw(`<div class="card g-feature-art" data-anim>${orgArt()}</div>`)}<div data-anim>${raw(head('Para quien organiza', 'Dormir tranquilo con la plata de otros'))}
      <ul class="g-ticks"><li><b>Quién pagó, quién no</b> y cuánto falta para el pozo, ronda a ronda.</li><li><b>Alertas de riesgo</b>: te avisamos si alguien que ya recibió dejó de pagar.</li><li><b>Recordatorios</b> por WhatsApp o correo con plantillas listas.</li><li><b>Libro con saldo</b> por persona: aportado vs recibido, multas, anticipos y la cuadratura automática.</li><li><b>Cambios de turno, reemplazos y fechas</b> con historial y aviso a todos.</li><li><b>Comprobantes imprimibles</b> de cada aporte y cada entrega.</li></ul></div></div>`))}
    ${raw(sec(html`<div class="grid-4 g-stats" data-anim>${[[ps.filter(p => p.status === 'en_curso').length, 'pollas en curso'], [money(moved), 'aportados y anotados'], [db.count('users', u => u.role !== 'admin'), 'personas en la gallada'], [`${done.length ? Math.round(onTime / done.length * 100) : 100}%`, 'de las cuotas se pagan a tiempo']].map(([v, l]) => html`<div class="card"><div class="stat"><span class="value">${v}</span><span class="label">${l}</span></div></div>`)}</div>`))}
    ${raw(sec(html`${head('La gallada opina', 'Pollas que sí terminan')}
      <div class="grid-3">${[['Marisol, Ñuñoa', 'Llevo años organizando la polla de la oficina en un cuaderno. Ahora cada uno ve su turno y yo ya no persigo a nadie: los recordatorios salen solos.'], ['Patricio, La Florida', 'Como tesorero, lo mejor es que el libro cuadra solo. Si falta un peso, la app te dice en qué ronda.'], ['Javiera, Maipú', 'Con mi pozo pinté la casa. Me encantó poder confirmar que lo recibí y tener el comprobante.']].map(([n, t]) => html`<blockquote class="card g-quote"><p>“${t}”</p><footer class="muted small">— ${n}</footer></blockquote>`)}</div>`))}
    ${raw(sec(html`<div class="card g-cta" data-anim><div><h2 style="margin:0">¿Te invitaron a una polla?</h2><p class="muted" style="margin:6px 0 0">Ingresa el código que te mandó quien organiza. Para probar, usa <b>AROMOS-24</b>.</p></div><form class="row" data-join novalidate><input class="input" name="code" placeholder="Código" aria-label="Buscar polla por código" style="flex:1;min-width:150px"><button class="btn btn-primary" type="submit">Ver la polla</button></form></div>`))}`;
  view.querySelectorAll('[data-join]').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); const c = f.code.value.trim(); if (!c) return toast('Escribe el código', 'warning'); location.hash = '#/unirse?code=' + encodeURIComponent(c.toUpperCase()); }));
}
const orgArt = () => `<svg viewBox="0 0 320 220" class="g-org-art" role="img" aria-label="Panel con la ronda actual: quién pagó y cuánto falta">
  <rect x="10" y="10" width="300" height="200" rx="14" fill="var(--surface)" stroke="var(--line)"/>
  <text x="28" y="40" font-size="14" font-weight="700" fill="var(--text)">Ronda 5 de 10</text><text x="292" y="40" font-size="12" text-anchor="end" fill="var(--muted)">en 4 días</text>
  <rect x="28" y="54" width="264" height="12" rx="6" fill="var(--line)"/><rect x="28" y="54" width="170" height="12" rx="6" fill="var(--success)"/><rect x="198" y="54" width="40" height="12" fill="var(--info)"/>
  ${[['Camila', 'success', 'Pagado'], ['Benjamín', 'danger', 'Atrasado'], ['Javiera', 'info', 'Por confirmar'], ['Luis', 'warning', 'Riesgo']].map(([n, t, l], i) => `<g transform="translate(28 ${88 + i * 30})"><circle cx="10" cy="0" r="10" fill="var(--primary)" opacity=".8"/><text x="28" y="5" font-size="13" fill="var(--text)">${n}</text><rect x="168" y="-10" width="96" height="20" rx="10" fill="var(--${t})" opacity=".2"/><text x="216" y="4" font-size="11" text-anchor="middle" font-weight="700" fill="var(--text)">${l}</text></g>`).join('')}
</svg>`;

function comoFunciona(view) {
  view.innerHTML = html`${raw(sec(html`${head('Guía', '¿Qué es una polla?', 'También le dicen "ronda", "junta" o "cadena". Es un ahorro y crédito entre personas de confianza, sin bancos ni intereses.')}
    <div class="g-split"><div class="stack">
      <p>Un grupo acuerda una <b>cuota</b> (por ejemplo $50.000) y una <b>frecuencia</b> (cada mes). En cada ronda todos pagan la cuota y <b>una persona recibe el pozo completo</b> (cuota × número de cupos). Se repite hasta que todos recibieron una vez.</p>
      <p>Quien recibe primero obtiene un "préstamo" sin intereses que va devolviendo con sus cuotas; quien recibe al final hizo un "ahorro" forzado. Por eso es clave que <b>nadie deje de pagar después de recibir</b>: Gallada te avisa apenas pasa.</p>
      <h3>Glosario</h3>
      <dl class="k-kv"><dt>Cupo</dt><dd>Un lugar en la polla. Puede ser de una persona o de dos (medio cupo).</dd><dt>Turno</dt><dd>La ronda en que ese cupo recibe el pozo.</dd><dt>Pozo</dt><dd>Lo que se junta en una ronda: cuota × cupos.</dd><dt>Gracia</dt><dd>Días después del vencimiento en que todavía se puede pagar sin multa.</dd><dt>Fondo común</dt><dd>Las multas: se reparten entre todos al cerrar la polla.</dd><dt>Cubrir</dt><dd>Cuando alguien adelanta la cuota de otro para no atrasar el pozo; queda como deuda con quien cubrió.</dd><dt>Remate</dt><dd>Pujar un descuento para recibir antes; ese descuento se reparte entre los demás.</dd></dl>
    </div><div class="card">${raw(flowArt())}</div></div>`))}
    ${raw(sec(html`${head('Roles', 'Quién hace qué en Gallada')}<div class="grid-4">${[['🧑‍💼', 'Organizador/a', 'Crea la polla, invita, asigna turnos, confirma pagos, entrega pozos, maneja morosos y reemplazos, y cierra.'], ['🧮', 'Tesorero/a', 'Co-organiza: confirma pagos, entrega pozos y envía recordatorios.'], ['🙋', 'Participante', 'Paga, ve el pozo y su turno, confirma cuando recibe, pide cambios de turno y conversa en el muro.'], ['🛡️', 'Plataforma', 'Revisa disputas, plantillas y la salud de todas las pollas.']].map(([i, t, d]) => html`<article class="card"><span class="g-mode-ico">${i}</span><h3>${t}</h3><p class="muted small">${d}</p></article>`)}</div><p class="small muted" style="margin-top:16px">¿Quieres verlo por dentro? <a href="login.html">Entra con una cuenta demo</a> de cada rol.</p>`))}`;
}
const flowArt = () => `<svg viewBox="0 0 320 240" role="img" aria-label="Flujo de una ronda: pagos, confirmación, pozo completo, entrega y recepción">
  ${[['Pagos informados', 'info'], ['Confirmados', 'primary'], ['Pozo completo', 'warning'], ['Entregado', 'accent'], ['Recibido ✓', 'success']].map(([t, c], i) => `<g transform="translate(20 ${18 + i * 44})"><rect width="200" height="32" rx="16" fill="var(--${c})" opacity=".18" stroke="var(--${c})"/><circle cx="16" cy="16" r="9" fill="var(--${c})"/><text x="34" y="21" font-size="13" font-weight="700" fill="var(--text)">${t}</text>${i < 4 ? `<path d="M100 34 v8" stroke="var(--muted)" stroke-width="2"/>` : ''}</g>`).join('')}
  <path d="M240 34 C300 34 300 214 240 214" fill="none" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 5"/><text x="300" y="128" font-size="11" fill="var(--muted)" transform="rotate(90 300 128)" text-anchor="middle">siguiente ronda</text>
</svg>`;

// ---------- Simulador ----------
function simulador(view, { query }) {
  const st = { amount: +query.monto || 50000, members: +query.cupos || 10, freq: query.frec || 'mensual', every: 10, start: L.addDays(L.today(), 7), remate: query.remate === '1', discountPct: 12 };
  view.innerHTML = html`${raw(sec(html`${head('Simulador', 'Arma tu polla y mira el calendario', 'Cambia los números: el pozo, las fechas y lo que gana o paga cada turno se recalculan al instante.')}
    <div class="g-sim"><form class="card g-sim-form" novalidate>
      <div class="field"><label for="s-a">Cuota por persona</label><input class="input" id="s-a" name="amount" type="number" min="1000" step="1000" value="${st.amount}"></div>
      <div class="field"><label for="s-m">Personas (cupos)</label><input class="input" id="s-m" name="members" type="number" min="2" max="40" value="${st.members}"><input type="range" min="2" max="30" value="${st.members}" name="mrange" aria-label="Personas"></div>
      <div class="field"><label for="s-f">Frecuencia</label><select class="select" id="s-f" name="freq">${Object.entries(L.FREQ).map(([k, f]) => html`<option value="${k}" ${k === st.freq ? raw('selected') : ''}>${f.label}</option>`)}</select></div>
      <div class="field" data-every hidden><label for="s-e">Cada cuántos días</label><input class="input" id="s-e" name="every" type="number" min="2" max="90" value="10"></div>
      <div class="field"><label for="s-s">Primera fecha</label><input class="input" id="s-s" name="start" type="date" value="${st.start}"></div>
      <label class="check"><input type="checkbox" name="remate" ${st.remate ? raw('checked') : ''}> Con remate (pujan por recibir antes)</label>
      <div class="field" data-disc><label for="s-d">Descuento del primer turno: <b data-dv>${st.discountPct}%</b> del pozo</label><input id="s-d" type="range" name="disc" min="0" max="30" value="${st.discountPct}"><small class="muted">Baja parejo hasta 0% en el último turno.</small></div>
    </form><div class="stack" data-out></div></div>`))}`;
  const f = view.querySelector('form'), out = view.querySelector('[data-out]');
  const paint = () => {
    st.amount = +f.amount.value; st.members = Math.max(2, Math.min(40, +f.members.value || 2)); st.freq = f.freq.value; st.every = +f.every.value || 10; st.start = f.start.value || L.today(); st.remate = f.remate.checked; st.discountPct = +f.disc.value;
    view.querySelector('[data-every]').hidden = st.freq !== 'cada_n';
    view.querySelector('[data-disc]').hidden = !st.remate;
    view.querySelector('[data-dv]').textContent = st.discountPct + '%';
    if (!(st.amount >= 1000)) { out.innerHTML = emptyState({ icon: '✏️', title: 'Ingresa una cuota de al menos $1.000' }); return; }
    const sim = L.simulate(st), maxAbs = Math.max(1, ...sim.rows.map(r => Math.abs(r.net)));
    out.innerHTML = html`<div class="grid-4 g-sim-kpis"><div class="card"><div class="stat"><span class="label">Pozo por ronda</span><span class="value">${money(sim.pot)}</span></div></div><div class="card"><div class="stat"><span class="label">Rondas</span><span class="value">${sim.rows.length}</span></div></div><div class="card"><div class="stat"><span class="label">Cada uno aporta</span><span class="value">${money(st.amount * sim.rows.length)}</span></div></div><div class="card"><div class="stat"><span class="label">Termina</span><span class="value g-small-val">${L.fdate(sim.end)}</span></div></div></div>
      ${st.remate ? html`<div class="card"><h3 style="margin-top:0">Quién gana y quién paga con remate</h3><svg class="g-netchart" viewBox="0 0 ${sim.rows.length * 30 + 20} 160" role="img" aria-label="Posición neta por turno"><line x1="10" x2="${sim.rows.length * 30 + 10}" y1="80" y2="80" stroke="var(--line)"/>${sim.rows.map((r, i) => { const h = Math.round(Math.abs(r.net) / maxAbs * 70); return `<g><title>Turno ${r.turn}: ${r.net >= 0 ? '+' : ''}${money(r.net)}</title><rect x="${14 + i * 30}" y="${r.net >= 0 ? 80 - h : 80}" width="22" height="${Math.max(1, h)}" rx="3" fill="var(--${r.net >= 0 ? 'success' : 'danger'})"/><text x="${25 + i * 30}" y="156" text-anchor="middle" font-size="10" fill="var(--muted)">${r.turn}</text></g>`; }).join('')}</svg><p class="small muted" style="margin:6px 0 0">Los primeros turnos "pagan" por recibir antes; los últimos reciben su parte de los descuentos. Suma total: ${money(sim.check)} (siempre cero: nada se pierde).</p></div>` : ''}
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Turno</th><th>Fecha</th><th class="k-num">Recibe</th>${st.remate ? raw('<th class="k-num">Descuento</th><th class="k-num">Le llega de remates</th>') : ''}<th class="k-num">Aporta en total</th><th class="k-num">Resultado</th></tr></thead><tbody>${sim.rows.map(r => html`<tr><td><span class="g-turn-n">${r.turn}</span></td><td class="k-nowrap">${L.fdateShort(r.date)} ${L.parseYmd(r.date).getFullYear()}</td><td class="k-num"><b>${money(r.receives)}</b></td>${st.remate ? html`<td class="k-num">${r.discount ? '−' + money(r.discount) : '—'}</td><td class="k-num">${money(r.reparto)}</td>` : ''}<td class="k-num">${money(r.paid)}</td><td class="k-num"><b class="${r.net > 0 ? 'g-ok' : r.net < 0 ? 'g-bad' : ''}">${V.signed(r.net)}</b></td></tr>`)}</tbody></table></div></div>
      <div class="card g-cta"><div><h3 style="margin:0">¿Te convence?</h3><p class="muted small" style="margin:4px 0 0">Crea la polla con estos números e invita a tu gallada.</p></div><a class="btn btn-primary" href="login.html?next=${encodeURIComponent('organizador.html#/pollas')}">Crear esta polla</a></div>`;
  };
  f.addEventListener('input', e => { if (e.target.name === 'mrange') f.members.value = e.target.value; if (e.target.name === 'members') f.mrange.value = e.target.value; paint(); });
  f.addEventListener('submit', e => e.preventDefault());
  paint();
  return { refresh() {} };
}

// ---------- Unirse ----------
function unirse(view, { query }) {
  const code = (query.code || '').toUpperCase(), p = code && findByCode(code), u = auth.current();
  const next = encodeURIComponent(`participante.html#/unirse?code=${code}`);
  view.innerHTML = html`${raw(sec(html`<div class="g-narrow stack">${head('Unirme', 'Únete a una polla con su código', 'Te lo envía quien organiza. Verás las reglas, la cuota y los cupos libres antes de comprometerte.')}
    <form class="card row" data-code novalidate><input class="input" name="code" value="${code}" placeholder="Ej: AROMOS-24" aria-label="Buscar polla por código" style="flex:1;min-width:160px;text-transform:uppercase"><button class="btn btn-primary" type="submit">Buscar</button></form>
    <div data-res>${p ? '' : code ? raw(notFound(code)) : raw(`<p class="small muted">¿Solo quieres mirar? Prueba con <a href="#/unirse?code=AROMOS-24">AROMOS-24</a> (inscripción abierta) o <a href="#/unirse?code=PEGA-482">PEGA-482</a> (en curso).</p>`)}</div></div>`))}`;
  view.querySelector('[data-code]').addEventListener('submit', e => { e.preventDefault(); const c = e.target.code.value.trim(); location.hash = '#/unirse?code=' + encodeURIComponent(c.toUpperCase()); });
  if (p) {
    const res = view.querySelector('[data-res]');
    res.innerHTML = joinHTML(p, u, { loginHref: `login.html?next=${next}`, registerHref: `#/registro?code=${encodeURIComponent(code)}` });
    mountJoin(res, p, u, m => { location.href = m.status === 'solicitud' ? 'participante.html#/pollas' : `participante.html#/pollas/${p.id}`; });
  }
}
function registro(view, { query }) {
  const code = (query.code || '').toUpperCase(), p = code && findByCode(code);
  view.innerHTML = html`${raw(sec(html`<div class="g-narrow">${head('Crear cuenta', 'Súmate a Gallada', p ? `Después te llevamos a unirte a "${p.name}".` : 'Gratis. Con tu cuenta puedes unirte a pollas y organizar las tuyas.')}
    <form class="card stack" data-reg novalidate>
      <div class="field"><label for="r-n">Nombre y apellido</label><input class="input" id="r-n" name="name" autocomplete="name" required></div>
      <div class="field"><label for="r-e">Correo</label><input class="input" id="r-e" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="r-t">Teléfono (WhatsApp)</label><input class="input" id="r-t" name="phone" type="tel" placeholder="+56 9 1234 5678"></div>
      <div class="field"><label for="r-p">Contraseña</label><input class="input" id="r-p" name="password" type="password" autocomplete="new-password" minlength="6" required><small class="muted">Mínimo 6 caracteres.</small></div>
      <label class="check"><input type="checkbox" name="org"> Quiero organizar mis propias pollas</label>
      <button class="btn btn-primary btn-lg" type="submit">Crear cuenta</button>
      <p class="small muted" style="margin:0">¿Ya tienes cuenta? <a href="login.html${code ? `?next=${encodeURIComponent('participante.html#/unirse?code=' + code)}` : ''}">Ingresa</a></p>
    </form></div>`))}`;
  const f = view.querySelector('[data-reg]');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const b = f.querySelector('[type=submit]');
    if (b.disabled) return;
    const name = f.name.value.trim(), email = f.email.value.trim(), pass = f.password.value;
    if (name.split(/\s+/).length < 2) return toast('Escribe nombre y apellido', 'warning');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Correo no válido', 'warning');
    if (pass.length < 6) return toast('La contraseña debe tener al menos 6 caracteres', 'warning');
    b.disabled = true; b.textContent = 'Creando…';
    try {
      const u = await auth.register({ name, email, password: pass, phone: f.phone.value.trim(), role: f.org.checked ? 'organizador' : 'participante', color: '#b45309', demo: false });
      toast(`¡Bienvenido/a, ${name.split(' ')[0]}!`, 'success');
      location.href = code ? `participante.html#/unirse?code=${encodeURIComponent(code)}` : app.homeFor(u);
    } catch (err) { toast(err.message, 'error'); b.disabled = false; b.textContent = 'Crear cuenta'; }
  });
}

// ---------- Verificar sorteo / comprobante ----------
function verificar(view, { query }) {
  const draws = db.query('pollas', p => p.draw).sort((a, b) => b.draw.at.localeCompare(a.draw.at));
  view.innerHTML = html`${raw(sec(html`${head('Transparencia', 'Verificar', 'Repite un sorteo con su semilla o comprueba que un comprobante es auténtico.')}
    <div class="grid-2 g-verify">
      <section class="card stack"><h3 style="margin:0">🎲 Verificar sorteo</h3>
        <form class="stack" data-draw novalidate>
          <div class="field"><label for="v-s">Semilla</label><input class="input" id="v-s" name="seed" aria-label="Buscar: semilla del sorteo" value="${query.seed || ''}" placeholder="Ej: ALERCE-4821-BOLDO"></div>
          <div class="field"><label for="v-l">Lista de cupos (uno por línea, en orden de código)</label><textarea class="textarea" id="v-l" name="list" aria-label="Buscar: lista de cupos" rows="6" placeholder="C01 Marisol Cárcamo&#10;C02 Patricio Vergara">${query.list || ''}</textarea></div>
          <button class="btn btn-primary" type="submit">Repetir sorteo</button>
        </form>
        <div data-draw-out></div>
        ${draws.length ? html`<div><small class="muted">Sorteos publicados:</small><ul class="g-list">${draws.map(p => html`<li><span style="flex:1;min-width:0"><b>${p.emoji} ${p.name}</b><small class="muted" style="display:block">${p.draw.seed}</small></span><button type="button" class="btn btn-sm" data-load="${p.id}">Cargar</button></li>`)}</ul></div>` : ''}
      </section>
      <section class="card stack"><h3 style="margin:0">🧾 Verificar comprobante</h3>
        <form class="row" data-rc novalidate><input class="input" name="code" value="${query.c || ''}" placeholder="Ej: CMP-10001 o ENT-5001" aria-label="Buscar comprobante por código" style="flex:1;min-width:150px;text-transform:uppercase"><button class="btn btn-primary" type="submit">Verificar</button></form>
        <div data-rc-out></div>
      </section>
    </div>`))}`;
  const f = view.querySelector('[data-draw]'), out = view.querySelector('[data-draw-out]');
  const run = () => {
    const seed = f.seed.value.trim(), list = f.list.value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!seed || list.length < 2) { out.innerHTML = '<p class="small muted">Ingresa la semilla y al menos dos cupos.</p>'; return; }
    const order = L.shuffle(list.map(label => ({ label })), seed);
    const match = draws.find(p => p.draw.seed === seed);
    const same = match && JSON.stringify(match.draw.order) === JSON.stringify(order.map(o => o.label));
    out.innerHTML = html`<ol class="g-turns is-compact">${order.map((o, i) => html`<li class="g-turn"><span class="g-turn-n">${i + 1}</span><span>${o.label}</span></li>`)}</ol>${match ? raw(same ? `<div class="g-alert is-ok">✓ Coincide exactamente con el sorteo publicado de "${escape(match.name)}".</div>` : `<div class="g-alert is-danger">✕ No coincide con el sorteo publicado de "${escape(match.name)}". Revisa que la lista esté completa y en orden.</div>`) : ''}`;
  };
  f.addEventListener('submit', e => { e.preventDefault(); run(); });
  view.querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', () => { const p = db.get('pollas', b.dataset.load); f.seed.value = p.draw.seed; f.list.value = p.draw.input.join('\n'); run(); }));
  if (query.seed && query.list) run();
  const rc = view.querySelector('[data-rc]'), rcOut = view.querySelector('[data-rc-out]');
  const check = () => { const c = rc.code.value.trim(); if (!c) return; rcOut.innerHTML = V.findReceipt(c) ? html`<div class="g-alert is-ok">✓ Comprobante auténtico registrado en Gallada.</div>${raw(V.receiptHTML(c, { publicView: true }))}` : V.receiptHTML(c); };
  rc.addEventListener('submit', e => { e.preventDefault(); check(); });
  if (query.c) check();
  return { refresh() {} };
}
function comprobante(view, { params }) { view.innerHTML = sec(`<div class="g-narrow">${V.receiptHTML(params.code, { publicView: true })}</div>`); }

function ayuda() {
  const s = S();
  return (view) => {
    const faq = [
      ['¿Gallada guarda mi plata?', 'No. Las cuotas se transfieren directamente a la cuenta de quien organiza (o al tesorero/a). Gallada anota cada pago, emite comprobantes y lleva el libro, pero nunca custodia dinero.'],
      ['¿Qué pasa si alguien no paga?', `Pasado el plazo + los días de gracia, la cuota queda "atrasada" y se aplica la multa de la polla. La organización puede recordarle por WhatsApp, cubrir la cuota para no atrasar el pozo (la persona queda debiéndole) o, si aún no recibe, reemplazarla por alguien que herede su turno.`],
      ['¿Y si alguien recibe el pozo y deja de pagar?', 'Es el riesgo más grave de una polla. Gallada lo marca como "riesgo alto" en el panel de la organización apenas pasa, y su reputación baja para las próximas pollas.'],
      ['¿Cómo sé que el sorteo no está arreglado?', 'Cada sorteo publica su semilla. Con la semilla y la lista de cupos cualquiera puede repetirlo en "Verificar" y obtener exactamente el mismo orden.'],
      ['¿Cómo funciona el remate?', 'En cada ronda quienes aún no reciben pueden ofrecer un descuento. Gana el mayor; recibe el pozo menos su descuento, y ese descuento se reparte en partes iguales entre los demás cupos. Si nadie puja, se sortea.'],
      ['¿Qué es un medio cupo?', 'Dos personas comparten un cupo: cada una paga la mitad de la cuota y recibe la mitad del pozo. Si la cuota es impar, el peso extra lo paga y lo recibe la primera persona inscrita, para que todo cuadre al peso.'],
      ['¿Qué pasa con las multas?', 'Van a un fondo común que se reparte en partes iguales entre todos los cupos al cerrar la polla. La organización puede condonar una multa si hay una buena razón.'],
      ['¿Se puede cambiar la fecha de una ronda?', 'Sí, la organización puede moverla (por ejemplo por un feriado) y elegir si se corren las siguientes. Todos reciben el aviso con el motivo.'],
      ['¿Qué pasa si la polla se termina antes?', 'Se hace una liquidación: la plata en caja se devuelve a quienes aportaron más de lo que recibieron, en proporción a lo que se les debe, y queda registrada la deuda de quienes ya recibieron.'],
      ['¿Cómo se calcula mi reputación?', 'Con tus pagos a tiempo, atrasos, cuotas que otros tuvieron que cubrir y las pollas que terminaste. Las organizaciones la ven cuando pides unirte.']
    ];
    view.innerHTML = sec(html`${head('Ayuda', 'Preguntas frecuentes')}<div class="g-narrow stack">${faq.map(([q, a], i) => html`<details class="card g-faq" ${i === 0 ? raw('open') : ''}><summary>${q}</summary><p class="muted">${a}</p></details>`)}<div class="card"><h3 style="margin-top:0">¿Otra duda?</h3><p class="muted">Escríbenos a <b>${s.supportEmail}</b> o por WhatsApp al <b>${s.whatsapp}</b>.</p></div></div>`);
  };
}

app.site({
  nav: [['Inicio', '#/'], ['Cómo funciona', '#/como-funciona'], ['Simulador', '#/simulador'], ['Unirme', '#/unirse'], ['Verificar', '#/verificar'], ['Ayuda', '#/ayuda']],
  footer: `<div class="g-foot"><div><b>🐣 Gallada</b><p class="small">Pollas claras y al día. Demo simulada en el navegador: ningún dato sale de tu equipo.</p></div><div class="small"><a href="#/simulador">Simulador</a> · <a href="#/verificar">Verificar sorteo</a> · <a href="#/ayuda">Ayuda</a> · <a href="login.html">Ingresar</a></div><div class="small muted">© ${new Date().getFullYear()} Gallada · ${escape(app.settings().supportEmail)}</div></div>`,
  routes: {
    '/': home, '/como-funciona': comoFunciona, '/simulador': simulador, '/unirse': unirse, '/registro': registro,
    '/verificar': verificar, '/comprobante/:code': comprobante, '/ayuda': ayuda()
  }
});
