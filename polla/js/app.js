// Gallada: configuración declarativa (datos, roles, páginas y recursos). La importan todas las páginas.
// La lógica de dinero y los estados viven en logic.js; la semilla que simula la historia, en seed.js.
import { defineApp } from '../../assets/core/app.js';
import { resource } from '../../assets/core/resource.js';
import { html, raw, money } from '../../assets/core/ui.js';
import { seed } from './seed.js';
import * as L from './logic.js';

export const app = defineApp({
  name: 'polla', version: 1, seed,
  brand: { name: 'Gallada', logo: '🐣' },
  roles: { admin: 'Administrador/a de plataforma', organizador: 'Organizador/a', tesorero: 'Tesorero/a', participante: 'Participante' },
  pages: {
    'admin.html': ['admin'],
    'organizador.html': ['organizador', 'tesorero', 'admin'],
    'participante.html': ['participante', 'organizador', 'tesorero', 'admin']
  },
  home: { admin: 'admin.html', organizador: 'organizador.html', tesorero: 'organizador.html', participante: 'participante.html' },
  settings: { tagline: 'La polla de siempre, ahora clara y al día', maxCupos: 30, minAmount: 5000, defaultGrace: 2, defaultFee: 2000, maxBidPct: 30, supportEmail: 'ayuda@gallada.cl', whatsapp: '+56 9 5555 0101' }
});
export const { db, auth } = app;
L.bindDB(db);
// Al abrir cualquier página: lo vencido pasa a "atrasado" (con su multa) y lo que se corrió de fecha vuelve a pendiente.
try { L.sweepLate(db); } catch (e) { console.error(e); }

export const EMOJIS = ['🐣', '💼', '👨‍👩‍👧', '🧺', '🎄', '🏔️', '✂️', '⚽', '🚕', '🧯', '🏠', '🎓', '🛠️', '🌮', '🎸', '🐶'];
export const me = () => auth.current();
// Pollas que la persona gestiona (organiza o es tesorera); el admin ve todas.
export const managed = (u = me()) => db.query('pollas', p => u && (u.role === 'admin' || p.organizerId === u.id || p.treasurerId === u.id));
export const joined = (u = me()) => { const ids = new Set(db.query('members', m => u && m.userId === u.id && m.status === 'activo').map(m => m.pollaId)); return db.query('pollas', p => ids.has(p.id)); };

const LOCKED = ['amount', 'frequency', 'everyDays', 'startDate', 'cupos', 'mode', 'allowHalf'];
export const pollas = resource(app, {
  collection: 'pollas', id: 'pollas', singular: 'polla', plural: 'Mis pollas', feminine: true, icon: '🐣', listTitle: 'Pollas',
  intro: 'Crea una polla, invita con su código y sigue cada ronda. Las que organizas y en las que eres tesorero/a.',
  title: p => `${p.emoji || '🐣'} ${p.name}`, subtitle: p => `${p.code} · ${L.freqLabel(p)} · ${money(p.amount)}`,
  fields: [
    { name: 'name', label: 'Nombre de la polla', required: true, search: true, placeholder: 'Ej: Polla de la oficina', check: v => (v.length < 4 ? 'muy corto' : '') },
    { name: 'emoji', label: 'Ícono', type: 'select', options: EMOJIS.map(e => [e, e]), table: false, default: '🐣' },
    { name: 'code', label: 'Código', form: false, search: true },
    { name: 'amount', label: 'Cuota por cupo', type: 'money', required: true, min: 1000, help: 'Lo que aporta cada cupo en cada ronda (pesos enteros).' },
    { name: 'frequency', label: 'Frecuencia', type: 'select', required: true, options: Object.entries(L.FREQ).map(([k, f]) => [k, f.label]), default: 'mensual', filter: true },
    { name: 'everyDays', label: 'Cada cuántos días', type: 'number', min: 2, max: 90, table: false, help: 'Solo si la frecuencia es "Cada N días" (ej: 10).' },
    { name: 'startDate', label: 'Primera fecha de pago', type: 'date', required: true, table: false },
    { name: 'cupos', label: 'Cupos (turnos)', type: 'number', required: true, min: 2, max: 40, default: 10, render: (v, p) => `${db.count('slots', s => s.pollaId === p.id)}/${v}` },
    { name: 'mode', label: 'Asignación de turnos', type: 'select', required: true, options: Object.entries(L.MODES), default: 'sorteo', table: false, filter: true },
    { name: 'maxBidPct', label: 'Puja máxima (% del pozo)', type: 'number', min: 1, max: 50, default: 25, table: false, help: 'Solo para remate.' },
    { name: 'lateFee', label: 'Multa por atraso', type: 'money', default: 2000, table: false, help: 'Va al fondo común; se reparte al cerrar.' },
    { name: 'graceDays', label: 'Días de gracia', type: 'number', min: 0, max: 15, default: 2, table: false },
    { name: 'allowHalf', label: 'Acepta medios cupos (dos personas comparten uno)', type: 'bool', table: false },
    { name: 'approval', label: 'Aprobar cada inscripción', type: 'bool', table: false },
    { name: 'treasurerId', label: 'Tesorero/a (opcional)', type: 'ref', ref: 'users', refFilter: u => u.role !== 'admin' && u.id !== me()?.id, table: false, help: 'Puede confirmar pagos, entregar pozos y enviar recordatorios.' },
    { name: 'paymentInfo', label: 'Datos para pagar', type: 'textarea', placeholder: 'Banco, tipo y número de cuenta, RUT, correo', table: false },
    { name: 'rules', label: 'Reglas de la polla', type: 'textarea', table: false, placeholder: 'Plazos, multas, qué pasa si alguien no paga…' },
    { name: 'status', label: 'Estado', form: false, render: v => L.POLLA.badge(v), csv: false },
    { name: 'organizerId', label: 'Organiza', type: 'ref', ref: 'users', form: false, table: false }
  ],
  filters: [{ key: 'status', label: 'Estado', options: L.POLLA.options(), test: (p, v) => p.status === v }],
  rows: () => managed(),
  sort: (a, b) => ['en_curso', 'inscripcion', 'borrador', 'finalizada', 'cancelada'].indexOf(a.status) - ['en_curso', 'inscripcion', 'borrador', 'finalizada', 'cancelada'].indexOf(b.status) || a.name.localeCompare(b.name),
  permissions: { create: ['organizador', 'admin'], edit: ['organizador', 'admin'], delete: ['organizador', 'admin'] },
  defaults: () => { const s = app.settings(); return { lateFee: s.defaultFee, graceDays: s.defaultGrace, startDate: L.addDays(L.today(), 14), maxBidPct: 25, emoji: '🐣' }; },
  validate(v, row) {
    const s = app.settings(), u = me();
    if (row && u.role !== 'admin' && row.organizerId !== u.id) return 'Solo quien organiza puede editar la polla';
    if (v.cupos > s.maxCupos) return `Máximo ${s.maxCupos} cupos por polla (configuración de la plataforma)`;
    if (v.amount < s.minAmount) return `La cuota mínima es ${money(s.minAmount)}`;
    if (v.frequency === 'cada_n' && !(v.everyDays >= 2)) return 'Indica cada cuántos días se paga';
    if (v.mode === 'remate' && v.maxBidPct > s.maxBidPct) return `La puja máxima no puede pasar de ${s.maxBidPct}%`;
    if (!row && v.startDate < L.today()) return 'La primera fecha no puede estar en el pasado';
    if (row && !['borrador', 'inscripcion'].includes(row.status) && LOCKED.some(k => String(v[k] ?? '') !== String(row[k] ?? ''))) return 'Con la polla en curso solo se cambian nombre, reglas, datos de pago, multa, gracia y tesorero/a';
    if (row && v.cupos < db.count('slots', x => x.pollaId === row.id)) return 'Ya hay más cupos ocupados que eso';
    return null;
  },
  beforeSave: (v, row) => {
    if (v.frequency !== 'cada_n') v.everyDays = null;
    if (row) return v;
    const u = me(), at = new Date().toISOString();
    return { ...v, code: L.joinCode(db, v.name), organizerId: u.id, status: 'borrador', statusAt: at, history: [{ at, from: null, to: 'borrador', by: u.id, note: '' }] };
  },
  afterSave: (p, { isNew }) => { if (isNew) location.hash = `#/pollas/${p.id}?tab=ajustes`; },
  canDelete: p => (['borrador', 'inscripcion'].includes(p.status) && !db.count('members', m => m.pollaId === p.id && m.status === 'activo' && m.userId !== p.organizerId) ? true : 'Solo se eliminan pollas sin participantes que aún no parten. Si ya partió, usa "Terminar antes".'),
  afterDelete: p => { db.query('slots', s => s.pollaId === p.id).forEach(s => db.remove('slots', s.id)); db.query('members', m => m.pollaId === p.id).forEach(m => db.remove('members', m.id)); },
  csv: p => ({ codigo: p.code, nombre: p.name, estado: L.POLLA.label(p.status), cuota: p.amount, frecuencia: L.freqLabel(p), cupos: p.cupos, ocupados: db.count('slots', s => s.pollaId === p.id), modalidad: L.MODES[p.mode], organiza: L.userName(db, p.organizerId), caja: L.cashOf(db, p.id).caja }),
  detail: true,
  count: () => managed().filter(p => p.status === 'inscripcion' && db.count('members', m => m.pollaId === p.id && m.status === 'solicitud')).length
});

// Plantillas de mensajes (WhatsApp / correo) que usan los recordatorios.
export const templates = resource(app, {
  collection: 'templates', id: 'plantillas', singular: 'plantilla', plural: 'Plantillas de mensajes', feminine: true, icon: '💬',
  intro: 'Textos que la organización usa para recordar pagos. Variables: {nombre} {polla} {monto} {fecha} {ronda} {turno} {pozo} {deuda} {codigo} {datos} {organizador}.',
  subtitle: t => (t.channel === 'email' ? 'Correo' : 'WhatsApp'),
  fields: [
    { name: 'name', label: 'Nombre', required: true, search: true },
    { name: 'channel', label: 'Canal', type: 'select', required: true, options: [['whatsapp', 'WhatsApp'], ['email', 'Correo']], filter: true },
    { name: 'text', label: 'Texto', type: 'textarea', required: true, search: true, check: v => (v.length > 700 ? 'máximo 700 caracteres' : '') },
    { name: 'active', label: 'Disponible para organizadores', type: 'bool', toggle: true, default: true }
  ],
  columns: cols => { cols.splice(2, 0, { key: 'preview', label: 'Vista previa', sort: false, render: t => raw(`<span class="small muted g-clamp">${html`${L.renderTemplate(t.text, SAMPLE)}`}</span>`) }); return cols; },
  permissions: { create: ['admin'], edit: ['admin'], delete: ['admin'] },
  canDelete: t => (db.count('outbox', o => o.templateId === t.id) ? 'Ya se usó en recordatorios: desactívala en vez de eliminarla' : true)
});
export const SAMPLE = { nombre: 'Javiera', polla: 'Polla de la Pega', monto: '$100.000', fecha: '15 nov 2026', ronda: 5, turno: 7, pozo: '$1.000.000', deuda: '$105.000', codigo: 'PEGA-482', datos: 'Banco de Chile 00-123-45678-09', organizador: 'Marisol' };

// Disputas y reportes entre participantes y organizaciones (los resuelve la plataforma).
export const REPORT_KIND = [['no_pago', 'No paga sus cuotas'], ['no_entrega', 'No entregó el pozo / devolución'], ['fraude', 'Sospecha de fraude'], ['otro', 'Otro']];
export const reports = resource(app, {
  collection: 'reports', id: 'disputas', singular: 'reporte', plural: 'Disputas y reportes', icon: '⚖️',
  intro: 'Reclamos que levantan participantes u organizaciones. Cambia el estado para dejar la resolución registrada.',
  title: r => r.code, subtitle: r => L.pollaOf(db, r.pollaId)?.name || '',
  fields: [
    { name: 'code', label: 'Código', form: false, search: true },
    { name: 'pollaId', label: 'Polla', type: 'ref', ref: 'pollas', required: true, refLabel: p => p.name },
    { name: 'kind', label: 'Motivo', type: 'select', options: REPORT_KIND, required: true, filter: true },
    { name: 'reporterId', label: 'Reporta', type: 'ref', ref: 'users', required: true },
    { name: 'againstId', label: 'Contra', type: 'ref', ref: 'users' },
    { name: 'text', label: 'Detalle', type: 'textarea', required: true, search: true },
    { name: 'status', label: 'Estado', type: 'status', machine: L.REPORT }
  ],
  permissions: { create: ['admin'], delete: ['admin'] },
  beforeSave: (v, row) => (row ? v : { ...v, code: nextReport() }),
  log: 'disputa',
  count: () => db.count('reports', r => r.status === 'abierto'),
  detail: {
    aside: r => {
      const p = L.pollaOf(db, r.pollaId);
      if (!p) return '';
      const rec = L.reconcile(db, p.id), rep = r.againstId ? L.reputation(db, r.againstId) : null;
      return html`<section class="card"><div class="k-card-head"><h3>Contexto</h3></div>
        <p class="small" style="margin:0 0 8px"><b>${p.emoji} ${p.name}</b> · ${L.POLLA.label(p.status)}</p>
        <p class="small muted" style="margin:0 0 8px">Caja ${money(rec.cash.caja)} · ${rec.ok ? 'libro cuadrado ✓' : 'el libro NO cuadra'}</p>
        ${rep ? html`<p class="small" style="margin:0">Reputación de ${L.userName(db, r.againstId)}: <span class="badge badge-${rep.tone}">${rep.score} · ${rep.label}</span></p>` : ''}
        <p style="margin:12px 0 0"><a class="btn btn-sm" href="organizador.html#/pollas/${p.id}?tab=libro">Ver libro de la polla</a></p></section>`;
    }
  }
});

const nextReport = () => { const n = db.getValue('_seq:rep', 300) + 1; db.setValue('_seq:rep', n); return `REP-${n}`; };
// Un participante u organizador levanta un reporte desde su panel.
export function createReport({ pollaId, reporterId, againstId = '', kind, text }) {
  if (!String(text || '').trim() || text.trim().length < 15) throw new Error('Cuenta un poco más qué pasó (mínimo 15 caracteres)');
  const at = new Date().toISOString();
  const r = db.insert('reports', { code: nextReport(), pollaId, reporterId, againstId, kind, text: text.trim(), status: 'abierto', statusAt: at, history: [{ at, from: null, to: 'abierto', by: reporterId, note: '' }] });
  db.log('disputa', `${r.code}: ${L.userName(db, reporterId)} reporta en ${L.pollaOf(db, pollaId)?.code}`, reporterId);
  db.query('users', u => u.role === 'admin').forEach(a => L.notify(db, a.id, { pollaId, title: `Nuevo reporte ${r.code}`, text: text.trim().slice(0, 120), link: `admin.html#/disputas/${r.id}`, kind: 'alerta' }));
  return r;
}
