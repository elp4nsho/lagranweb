// Panel de la plataforma: todas las pollas, personas, disputas, plantillas, configuración y bitácora.
import { app, db, templates, reports } from './app.js';
import * as L from './logic.js';
import * as V from './views.js';
import { resource } from '../../assets/core/resource.js';
import { usersSection, settingsSection, logSection } from '../../assets/core/pages.js';
import { pageHead, kpis, card, chartCard, activityFeed, kv, historyTimeline } from '../../assets/core/blocks.js';
import { byMonth, countBy } from '../../assets/core/domain.js';
import { html, raw, money, barChart, donutChart, escape } from '../../assets/core/ui.js';

const ADMIN = ['admin'];
const { who } = V;

function dashboard(view) {
  const ps = db.all('pollas'), active = ps.filter(p => p.status === 'en_curso');
  const aportes = db.query('movements', m => m.type === 'aporte');
  const pays = db.query('payments', x => L.pollaOf(db, x.pollaId)?.status === 'en_curso');
  const due = pays.filter(x => { const r = db.get('rounds', x.roundId); return r && r.dueDate <= L.today(db); });
  const lateRate = due.length ? Math.round(due.filter(x => ['atrasado', 'cubierto'].includes(x.status)).length / due.length * 1000) / 10 : 0;
  const risky = active.flatMap(p => L.risks(db, p.id).filter(r => r.level === 'alto').map(r => ({ ...r, p })));
  const bad = ps.filter(p => !L.reconcile(db, p.id).ok);
  view.innerHTML = html`${pageHead('Plataforma', 'Salud de todas las pollas de Gallada.')}
    ${raw(kpis([
      { label: 'Pollas en curso', value: active.length, icon: '🐣', href: '#/pollas', hint: `${ps.length} en total` },
      { label: 'Personas', value: db.count('users', u => u.role !== 'admin'), icon: '👥', href: '#/usuarios', hint: `${db.count('users', u => u.role === 'organizador')} organizan` },
      { label: 'Plata en circulación', value: money(ps.reduce((s, p) => s + L.cashOf(db, p.id).caja, 0)), icon: '🏦', hint: 'en las cajas de las pollas' },
      { label: 'Aportado (30 días)', value: money(aportes.filter(m => Date.now() - new Date(m.at) < 30 * 864e5).reduce((s, m) => s + m.amount, 0)), icon: '💰' },
      { label: 'Morosidad', value: `${lateRate}%`, icon: '⏰', up: false, hint: 'cuotas vencidas atrasadas o cubiertas' },
      { label: 'Disputas abiertas', value: db.count('reports', r => r.status !== 'resuelto' && r.status !== 'descartado'), icon: '⚖️', href: '#/disputas' }
    ]))}
    ${bad.length ? html`<div class="g-alert is-danger">✕ ${bad.length} polla(s) con el libro descuadrado: ${bad.map(p => p.name).join(', ')}</div>` : html`<div class="g-alert is-ok">✓ Los libros de las ${ps.length} pollas cuadran (revisión automática de ingresos, egresos, rondas y multas).</div>`}
    <div class="k-grid-main">
      ${raw(chartCard('Aportes confirmados por mes', barChart(byMonth(aportes, 'at', m => m.amount, 8), { format: money })))}
      ${raw(chartCard('Pollas por modalidad', donutChart(countBy(ps, 'mode', k => L.MODES[k]), { label: ps.length })))}
    </div>
    <div class="k-grid-main">
      ${raw(card('Riesgo alto en la plataforma', risky.length ? html`<ul class="g-risks">${risky.map(r => html`<li class="lvl-alto"><span class="badge badge-danger">alto</span><div><b>${L.userName(db, r.member.userId)}</b> <small class="muted">· ${r.p.name} (${L.userName(db, r.p.organizerId)})</small><p class="small" style="margin:2px 0 0">${r.text}</p></div></li>`)}</ul>` : '<p class="muted small">Nadie en riesgo alto.</p>'))}
      ${raw(card('Actividad reciente', activityFeed(db, { limit: 8 })))}
    </div>`;
}

const pollasAdmin = resource(app, {
  collection: 'pollas', id: 'pollas', singular: 'polla', plural: 'Todas las pollas', feminine: true, icon: '🐣', readonly: true, log: false,
  intro: 'Vista de supervisión. Para operar una polla, ábrela en el panel de organización.',
  title: p => `${p.emoji} ${p.name}`, subtitle: p => `${p.code} · ${L.userName(db, p.organizerId)}`,
  fields: [
    { name: 'name', label: 'Polla', search: true },
    { name: 'organizerId', label: 'Organiza', type: 'ref', ref: 'users', filter: false },
    { name: 'amount', label: 'Cuota', type: 'money' },
    { name: 'frequency', label: 'Frecuencia', type: 'select', options: Object.entries(L.FREQ).map(([k, f]) => [k, f.label]), render: (v, p) => escape(L.freqLabel(p)) },
    { name: 'mode', label: 'Modalidad', type: 'select', options: Object.entries(L.MODES), filter: true },
    { name: 'status', label: 'Estado', type: 'select', options: L.POLLA.options(), filter: true, render: v => L.POLLA.badge(v) },
    { name: 'code', label: 'Código', search: true, table: false }
  ],
  columns: cols => { cols.splice(cols.length - 1, 0, { key: 'caja', label: 'Caja', sort: false, render: p => raw(`<span class="k-num" style="display:block">${money(L.cashOf(db, p.id).caja)}</span>`) }, { key: 'libro', label: 'Libro', sort: false, render: p => raw(L.reconcile(db, p.id).ok ? '<span class="badge badge-success">✓ cuadra</span>' : '<span class="badge badge-danger">✕</span>') }); return cols; },
  csv: p => ({ codigo: p.code, nombre: p.name, organiza: L.userName(db, p.organizerId), estado: L.POLLA.label(p.status), cuota: p.amount, cupos: p.cupos, modalidad: L.MODES[p.mode], caja: L.cashOf(db, p.id).caja, cuadra: L.reconcile(db, p.id).ok ? 'sí' : 'no' }),
  detail: {
    render: p => {
      const cur = L.currentRound(db, p.id);
      return html`${cur && p.status === 'en_curso' ? raw(card('Ronda actual', V.roundSummary(cur, p))) : ''}${raw(V.reconcileCard(p.id))}${raw(card('Posiciones', V.positionsTable(p.id)))}`;
    },
    aside: p => html`${raw(card('Acciones', `<a class="btn btn-block" href="organizador.html#/pollas/${p.id}">⚙️ Abrir en organización</a>`))}${raw(card('Turnos', V.turnsList(p, { compact: true })))}${raw(card('Historial', historyTimeline(p.history || [], L.POLLA, { users: id => L.userName(db, id) })))}`
  }
});

const users = usersSection(app, {
  roles: ADMIN,
  extraFields: [
    { name: 'phone', label: 'Teléfono', type: 'tel', table: false },
    { name: 'rut', label: 'RUT', type: 'rut', table: false, search: true },
    { name: 'comuna', label: 'Comuna', search: true },
    { name: 'rep', label: 'Reputación', form: false, detail: false, csv: false, render: (v, u) => (u.role === 'admin' ? '—' : V.repBadge(u.id)) }
  ]
});

app.panel({
  page: 'admin.html', sub: 'Plataforma',
  topbar: '<a class="btn btn-sm" href="organizador.html">⚙️ Organización</a>',
  nav: [
    { section: 'Plataforma' },
    { id: '', label: 'Resumen', icon: '📊', render: dashboard },
    pollasAdmin.section(),
    users,
    reports.section(),
    { section: 'Configuración' },
    templates.section(),
    settingsSection(app, { groups: [
      { title: 'Sitio público', fields: [{ name: 'tagline', label: 'Eslogan de la portada', required: true, wide: true }, { name: 'supportEmail', label: 'Correo de ayuda', type: 'email' }, { name: 'whatsapp', label: 'WhatsApp de ayuda', type: 'tel' }] },
      { title: 'Reglas de la plataforma', sub: 'Se validan al crear o editar cualquier polla.', fields: [{ name: 'maxCupos', label: 'Máximo de cupos por polla', type: 'number', min: 2, max: 60, required: true }, { name: 'minAmount', label: 'Cuota mínima', type: 'money', required: true }, { name: 'maxBidPct', label: 'Puja máxima en remate (%)', type: 'number', min: 1, max: 60, required: true }, { name: 'defaultGrace', label: 'Días de gracia sugeridos', type: 'number', min: 0, max: 15 }, { name: 'defaultFee', label: 'Multa sugerida', type: 'money' }] }
    ] }),
    logSection(app)
  ]
});
