// Reglas de negocio compartidas: catálogo, precios y bonos, stock, leads, estados.
import { db, auth } from '../data/db.js';
import { tierFeatures } from '../data/catalog.js';
import { STAGES } from '../data/seed.js';
import { ymd, addDays, daysBetween, uiGet } from './util.js';
import { escape, money } from '../../../assets/core/ui.js';
export { STAGES };

export const settings = () => db.getValue('settings', {});
export const cms = () => db.getValue('cms', {});
export const brand = id => db.get('brands', id);
export const model = id => db.get('models', id);
export const showroom = id => db.get('showrooms', id) || SHOWROOM_FALLBACK(id);
const SHOWROOM_FALLBACK = id => ({ id, name: id, city: id });
export const user = id => db.get('users', id);
export const userName = id => user(id)?.name || '—';
export const version = (m, vid) => (typeof m === 'string' ? model(m) : m)?.versions.find(v => v.id === vid) || null;
export const color = (m, cid) => (typeof m === 'string' ? model(m) : m)?.colors.find(c => c.id === cid) || null;
export const features = v => v.features?.length ? v.features : tierFeatures(v.tier || 0);
export const modelLabel = (mid, vid) => { const m = model(mid); if (!m) return '—'; const v = vid && version(m, vid); return `${brand(m.brandId)?.name || ''} ${m.name}${v ? ' ' + v.name : ''}`; };
export const fromPrice = m => Math.min(...m.versions.map(v => v.price));
export const activeModels = () => db.query('models', m => m.status === 'activo' && brand(m.brandId)?.active !== false);
export const showrooms = () => db.all('showrooms').filter(s => s.active !== false);

export const SEGMENTS = { citycar: 'Citycar', sedan: 'Sedán', suv: 'SUV', pickup: 'Pickup', premium: 'Premium', electrico: 'Eléctrico' };
export const FUELS = { bencina: 'Bencina', diesel: 'Diésel', hibrido: 'Híbrido', phev: 'Híbrido enchufable', electrico: 'Eléctrico' };
export const BODIES = { hatch: 'Hatchback', sedan: 'Sedán', suv: 'SUV', pickup: 'Pickup' };
export const isGreen = m => ['hibrido', 'phev', 'electrico'].includes(m.fuel);

// ---------- Campañas y bonos ----------
export const campaignLive = (c, day = ymd()) => c.active && c.from <= day && c.to >= day;
export const campaignState = c => !c.active ? 'inactiva' : c.from > ymd() ? 'programada' : c.to < ymd() ? 'finalizada' : 'vigente';
export const campaignApplies = (c, m) => c.scope === 'todos' || (c.scope === 'marca' && c.brandId === m.brandId) || (c.scope === 'modelos' && c.modelIds.includes(m.id));
export const campaignsFor = (m, day) => db.query('campaigns', c => campaignLive(c, day) && campaignApplies(c, m));
export const CAMPAIGN_TYPES = { marca: 'Bono marca', financiamiento: 'Bono financiamiento', retoma: 'Bono retoma', regalo: 'Regalo' };
// Bonos en dinero según forma de pago y retoma (los "regalo" no descuentan del precio)
export function bonusesFor(m, { financing = false, tradeIn = false } = {}) {
  return campaignsFor(m).filter(c => c.type === 'marca' || (c.type === 'financiamiento' && financing) || (c.type === 'retoma' && tradeIn));
}
export const maxBonus = m => campaignsFor(m).filter(c => c.type !== 'regalo').reduce((s, c) => s + c.amount, 0);

// ---------- Configuraciones (código compartible) ----------
// modelo~versión~color~llanta~packs(,)~accesorios(,)
export const encodeConfig = c => [c.modelId, c.versionId, c.colorId, c.wheelId, (c.packIds || []).join(','), (c.accIds || []).join(',')].join('~');
export function decodeConfig(code) {
  const [modelId, versionId, colorId, wheelId, packs = '', accs = ''] = String(code).split('~');
  const m = model(modelId); if (!m) return null;
  return {
    modelId, versionId: version(m, versionId) ? versionId : m.versions[0].id, colorId: color(m, colorId) ? colorId : m.colors[0].id,
    wheelId: m.wheels.find(w => w.id === wheelId) ? wheelId : m.wheels[0].id,
    packIds: packs.split(',').filter(p => m.packs.some(x => x.id === p)), accIds: accs.split(',').filter(a => db.get('accessories', a))
  };
}
export const accessoriesFor = m => db.query('accessories', a => a.active !== false && (!a.applies.length || a.applies.includes(m.segment) || a.applies.includes(m.fuel) || (a.applies.includes('suv') && m.body === 'suv') || (a.applies.includes('pickup') && m.body === 'pickup')));
export function priceConfig(c, opts = {}) {
  const m = model(c.modelId), v = version(m, c.versionId), col = color(m, c.colorId), w = m.wheels.find(x => x.id === c.wheelId) || m.wheels[0];
  const packs = m.packs.filter(p => c.packIds?.includes(p.id)), accs = (c.accIds || []).map(a => db.get('accessories', a)).filter(Boolean);
  const lines = [[`Versión ${v.name}`, v.price], [`Color ${col.name}`, col.price], [w.name, w.price], ...packs.map(p => [p.name, p.price]), ...accs.map(a => [a.name, a.price])];
  const list = lines.reduce((s, l) => s + l[1], 0);
  const bonuses = bonusesFor(m, opts);
  const bonus = bonuses.reduce((s, b) => s + b.amount, 0);
  const gifts = campaignsFor(m).filter(x => x.type === 'regalo');
  return { m, v, col, w, packs, accs, lines, list, bonuses, bonus, gifts, total: list - bonus };
}

// ---------- Stock ----------
export const UNIT_STATUS = { transito: ['En tránsito', 'info'], stock: ['En stock', 'success'], reservado: ['Reservado', 'warning'], vendido: ['Vendido', 'primary'], entregado: ['Entregado', 'muted'] };
export function stockFor(modelId, { versionId, colorId, showroomId } = {}) {
  const units = db.query('units', u => u.modelId === modelId && (!versionId || u.versionId === versionId) && (!colorId || u.colorId === colorId) && (!showroomId || u.showroomId === showroomId));
  const inStock = units.filter(u => u.status === 'stock'), transit = units.filter(u => u.status === 'transito').sort((a, b) => a.eta.localeCompare(b.eta));
  return { inStock, transit, units, label: inStock.length ? 'stock' : transit.length ? 'transito' : 'pedido', eta: transit[0]?.eta };
}
export function stockBadge(s) {
  if (s.label === 'stock') return `<span class="badge badge-success">${s.inStock.length} en stock</span>`;
  if (s.label === 'transito') return `<span class="badge badge-info">En tránsito · llega ${new Date(s.eta + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</span>`;
  return '<span class="badge badge-warning">A pedido · 60–90 días</span>';
}
export const daysInStock = u => u.arrivedAt ? daysBetween(u.arrivedAt, ymd()) : 0;

// ---------- Leads ----------
export const STAGE_LABEL = { nuevo: 'Nuevo', contactado: 'Contactado', test_drive: 'Test drive', cotizacion: 'Cotización', negociacion: 'Negociación', credito: 'Crédito', vendido: 'Vendido', perdido: 'Perdido' };
export const STAGE_TONE = { nuevo: 'info', contactado: 'primary', test_drive: 'primary', cotizacion: 'warning', negociacion: 'warning', credito: 'info', vendido: 'success', perdido: 'danger' };
export const stageBadge = s => `<span class="badge badge-${STAGE_TONE[s] || 'info'}">${STAGE_LABEL[s] || s}</span>`;
export const SOURCE_LABEL = { web: 'Sitio web', showroom: 'Showroom', telefono: 'Teléfono', redes: 'Redes sociales', evento: 'Evento', referido: 'Referido' };
export const isOpenLead = l => !['vendido', 'perdido'].includes(l.stage);

// Asignación automática según las reglas del panel
export function assignSeller(showroomId, brandId) {
  const rules = db.getValue('leadRules', {});
  let sellers = db.query('users', u => u.role === 'vendedor' && u.active !== false && u.showroomId === showroomId);
  if (!sellers.length) sellers = db.query('users', u => u.role === 'vendedor' && u.active !== false);
  if (!sellers.length) return null;
  if (rules.preferBrandSpecialist) { const sp = sellers.filter(u => u.brands?.includes(brandId)); if (sp.length) sellers = sp; }
  const load = u => db.count('leads', l => l.sellerId === u.id && isOpenLead(l));
  if (rules.maxOpen) { const ok = sellers.filter(u => load(u) < rules.maxOpen); if (ok.length) sellers = ok; }
  if (rules.mode === 'carga') return sellers.sort((a, b) => load(a) - load(b))[0].id;
  if (rules.mode === 'manual') return null;
  const idx = { ...(rules.rrIndex || {}) }, i = (idx[showroomId] || 0) % sellers.length;
  idx[showroomId] = i + 1;
  db.setValue('leadRules', { ...rules, rrIndex: idx });
  return sellers[i].id;
}
export function createLead(data) {
  const rules = db.getValue('leadRules', {});
  const m = model(data.modelId);
  const sellerId = rules.autoAssign !== false ? assignSeller(data.showroomId, m?.brandId) : null;
  const stage = data.stage || 'nuevo';
  const lead = db.insert('leads', {
    source: 'web', type: 'cotizacion', temp: 'tibio', value: m ? (version(m, data.versionId) || m.versions[0]).price : 0, ...data,
    stage, maxStage: STAGES.indexOf(stage), sellerId, customerId: data.customerId || auth.current()?.id || null,
    timeline: [{ at: new Date().toISOString(), kind: 'sistema', text: data.note || 'Lead creado desde el sitio web.', by: null }, ...(sellerId ? [{ at: new Date().toISOString(), kind: 'sistema', text: `Asignado automáticamente a ${userName(sellerId)}.`, by: null }] : [])]
  });
  db.log('lead', `Nuevo lead ${lead.name} · ${modelLabel(lead.modelId)}`);
  return lead;
}
export function addTimeline(leadId, kind, text, by = auth.current()?.id) {
  db.update('leads', leadId, l => ({ timeline: [...(l.timeline || []), { at: new Date().toISOString(), kind, text, by }] }));
}
export function moveLead(leadId, stage, extra = {}) {
  const l = db.get('leads', leadId); if (!l || l.stage === stage) return;
  const from = l.stage; // db.update modifica el registro en su lugar: guardar la etapa anterior antes
  db.update('leads', leadId, { stage, maxStage: Math.max(l.maxStage || 0, stage === 'perdido' ? 0 : STAGES.indexOf(stage)), ...extra });
  addTimeline(leadId, 'etapa', `Etapa: ${STAGE_LABEL[from]} → ${STAGE_LABEL[stage]}${extra.lostReason ? ` (${extra.lostReason})` : ''}`);
}

// ---------- Estados con badge ----------
const B = (map) => s => { const [t, tone] = map[s] || [s, 'info']; return `<span class="badge badge-${tone}">${escape(t)}</span>`; };
export const QUOTE_STATUS = { borrador: ['Borrador', 'info'], enviada: ['Enviada', 'primary'], pendiente_aprobacion: ['Requiere aprobación', 'warning'], aprobada: ['Aprobada', 'success'], rechazada: ['Descuento rechazado', 'danger'], aceptada: ['Aceptada', 'success'], vencida: ['Vencida', 'danger'] };
export const quoteBadge = B(QUOTE_STATUS);
export const FIN_STATUS = { recibida: ['Recibida', 'info'], en_evaluacion: ['En evaluación', 'warning'], aprobada: ['Aprobada', 'success'], aprobada_condiciones: ['Aprobada con condiciones', 'warning'], rechazada: ['Rechazada', 'danger'], preaprobada: ['Pre-aprobada', 'primary'] };
export const finBadge = B(FIN_STATUS);
export const TD_STATUS = { agendado: ['Agendado', 'primary'], realizado: ['Realizado', 'success'], no_asistio: ['No asistió', 'danger'], cancelado: ['Cancelado', 'danger'] };
export const tdBadge = B(TD_STATUS);
export const APPT_STATUS = { agendada: ['Agendada', 'info'], recepcionada: ['Recepcionada', 'primary'], en_proceso: ['En proceso', 'warning'], esperando_repuestos: ['Esperando repuestos', 'danger'], lista: ['Lista para retiro', 'success'], entregada: ['Entregada', 'success'], cancelada: ['Cancelada', 'danger'] };
export const apptBadge = B(APPT_STATUS);
export const OT_FLOW = ['recepcionada', 'en_proceso', 'esperando_repuestos', 'lista', 'entregada'];
export const APPT_TYPES = { mantencion: 'Mantención por pauta', reparacion: 'Reparación / falla', diagnostico: 'Diagnóstico', carroceria: 'Desabolladura y pintura', recall: 'Campaña de seguridad (recall)' };
export const TRADE_STATUS = { estimada: ['Estimada online', 'info'], inspeccion: ['Inspección agendada', 'primary'], ofertada: ['Oferta enviada', 'warning'], aceptada: ['Aceptada', 'success'], rechazada: ['Rechazada', 'danger'], recibida: ['Recibida en parte de pago', 'success'] };
export const tradeBadge = B(TRADE_STATUS);
export const SALE_STATUS = { por_entregar: ['Por entregar', 'warning'], facturado: ['Facturado', 'info'], entregado: ['Entregado', 'success'] };
export const saleBadge = B(SALE_STATUS);
export const unitBadge = s => { const [t, tone] = UNIT_STATUS[s] || [s, 'info']; return `<span class="badge ${tone === 'muted' ? '' : 'badge-' + tone}">${t}</span>`; };
export const FIN_LABEL = { contado: 'Contado', convencional: 'Crédito convencional', inteligente: 'Compra Inteligente', leasing: 'Leasing' };

// ---------- Posventa ----------
export const plansFor = brandId => db.query('servicePlans', p => p.brandId === brandId).sort((a, b) => a.km - b.km);
export function nextPlan(brandId, km) { const l = plansFor(brandId); return l.find(p => p.km > km) || l.at(-1); }
export function nextService(v) {
  const step = (brand(v.brandId)?.plan?.[0] || 10) * 1000, months = brand(v.brandId)?.plan?.[1] || 12;
  const nextKm = (Math.floor((v.lastServiceKm ?? 0) / step) + 1) * step;
  const byDate = addDays(v.lastServiceDate || v.purchaseDate, Math.round(months * 30.4));
  const kmLeft = nextKm - v.km, daysLeft = daysBetween(ymd(), byDate);
  return { nextKm, byDate, kmLeft, daysLeft, due: kmLeft < 1500 || daysLeft < 30, plan: nextPlan(v.brandId, nextKm - 1) };
}
export function recallsFor(v) {
  return db.query('recalls', r => r.active && r.brand === v.brandId && r.models.includes(v.modelId) && v.year >= r.yearFrom && v.year <= r.yearTo)
    .filter(r => !(v.recallsDone || []).includes(r.code));
}
export function warrantyFor(v) {
  const b = brand(v.brandId); if (!b) return null;
  const until = addDays(v.purchaseDate, Math.round(b.warrantyYears * 365.25));
  return { years: b.warrantyYears, km: b.warrantyKm, until, active: until >= ymd() && v.km < b.warrantyKm, kmLeft: b.warrantyKm - v.km };
}
// Ocupación del taller: citas activas / (bahías × franjas)
export function workshopLoad(showroomId, date) {
  const sr = showroom(showroomId), slots = settings().workshopSlots?.length || 12;
  const n = db.count('appointments', a => a.showroomId === showroomId && a.date === date && a.status !== 'cancelada');
  return { n, cap: Math.round((sr.bays || 8) * slots / 4), pct: Math.min(100, Math.round(n / Math.max(1, (sr.bays || 8) * slots / 4) * 100)) };
}
export const vehicleOf = a => a.vehicleId ? db.get('vehicles', a.vehicleId) : null;
export const otTotal = ot => (ot.lines || []).reduce((s, l) => s + l.price * l.qty, 0) + (ot.upsellItems || []).filter(u => u.status === 'aceptado').reduce((s, u) => s + u.price, 0);

export const tag = (t, tone = '') => `<span class="badge plain ${tone ? 'badge-' + tone : ''}">${escape(t)}</span>`;
export const priceTag = n => `<span class="price">${money(n)}</span>`;
export const compareList = () => uiGet('compare', []);
// Color "de vitrina" de cada modelo (variado entre modelos, evita el blanco base)
export function showColor(m) { let h = 0; for (const c of m.id) h = (h * 31 + c.charCodeAt(0)) >>> 0; const l = m.colors.length; return l > 1 ? m.colors[1 + h % (l - 1)] : m.colors[0]; }
