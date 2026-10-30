// Vende o permuta tu auto: tasación instantánea (marca/modelo/año/km/estado → rango de oferta) y agenda de inspección.
import { money, escape, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { BRANDS, MODELS, CONDITIONS, SLOTS } from '../data/catalog.js';
import { valuate, nextCode, kmFmt } from '../shared/domain.js';
import { nextWorkdays, fmtDay } from '../shared/util.js';

let S = null;
export function renderSell(el) {
  if (!S || S.done) S = { step: 0 };
  const u = auth.current(), me = u?.role === 'cliente' ? u : null;
  const draw = () => {
    const branches = db.query('branches', b => b.active);
    el.innerHTML = `<section class="section"><div class="container stack">
      <div class="sec-head"><div><span class="eyebrow">Vende o permuta</span><h1 style="margin:0">¿Cuánto vale tu auto?</h1><p class="lead">Oferta referencial en 1 minuto. La confirmamos con una inspección gratuita y te pagamos en 24 horas (o la usamos como pie).</p></div></div>
      <ol class="steps"><li class="${S.step > 0 ? 'done' : 'on'}">Tu auto</li><li class="${S.step > 1 ? 'done' : S.step === 1 ? 'on' : ''}">Oferta</li><li class="${S.step > 2 ? 'done' : S.step === 2 ? 'on' : ''}">Inspección</li></ol>
      ${S.step === 0 ? `<form class="card stack narrow" id="vf" novalidate>
        <div class="grid-2"><div class="field"><label for="vf-b">Marca</label><select class="select" id="vf-b" name="brand" required><option value="">Elige la marca</option>${[...BRANDS, 'Otra'].map(b => `<option ${S.brand === b ? 'selected' : ''}>${escape(b)}</option>`).join('')}</select></div>
          <div class="field"><label for="vf-m">Modelo</label><input class="input" id="vf-m" name="model" list="vf-ml" value="${escape(S.model || '')}" placeholder="Ej: Yaris"><datalist id="vf-ml">${MODELS.map(m => `<option value="${escape(m.model)}">`).join('')}</datalist></div>
          <div class="field"><label for="vf-y">Año</label><select class="select" id="vf-y" name="year">${Array.from({ length: 16 }, (_, i) => 2025 - i).map(y => `<option ${+S.year === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
          <div class="field"><label for="vf-k">Kilometraje (km)</label><input class="input" id="vf-k" name="km" type="number" min="0" step="1000" value="${escape(S.km || '')}" placeholder="Ej: 65000"></div></div>
        <span class="label">Estado general</span><div class="opt-grid">${Object.entries(CONDITIONS).map(([k, [l]], i) => `<label class="opt"><input type="radio" name="condition" value="${k}" ${(S.condition || 'bueno') === k ? 'checked' : ''}><span><b>${l}</b><small>${['Como nuevo, sin detalles', 'Detalles menores de uso', 'Rayones o desgaste visible', 'Choques o fallas mecánicas'][i]}</small></span></label>`).join('')}</div>
        <button class="btn btn-primary btn-lg">Ver mi oferta</button></form>` : ''}
      ${S.step === 1 ? `<div class="card stack narrow"><div class="offer-box"><span class="label">Oferta referencial por tu ${escape(S.brand)} ${escape(S.model)} ${S.year} · ${kmFmt(S.km)}</span><div class="price-xl" style="margin:8px 0">${money(S.offer.min)} – ${money(S.offer.max)}</div><small class="muted">Valor de mercado estimado ${money(S.offer.market)}${S.offer.known ? '' : ' (modelo fuera de catálogo: estimación por marca)'}</small></div>
        <ul class="legal-list small"><li>✅ Pagamos por transferencia en 24 h o lo usamos como pie</li><li>✅ Nos hacemos cargo de la transferencia y de la prenda si existe</li><li>✅ Oferta válida por 7 días</li></ul>
        <div class="row between"><button class="btn btn-ghost" data-back>← Cambiar datos</button><button class="btn btn-primary btn-lg" data-next>Agendar inspección gratis</button></div></div>` : ''}
      ${S.step === 2 ? `<form class="card stack narrow" id="vi" novalidate><h3 style="margin:0">Agenda la inspección (30 minutos)</h3>
        <div class="grid-3"><div class="field"><label for="vi-b">Sucursal</label><select class="select" id="vi-b" name="branch">${branches.map(b => `<option value="${b.id}">${escape(b.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="vi-d">Día</label><select class="select" id="vi-d" name="date">${nextWorkdays(8).map(d => `<option value="${d}">${fmtDay(d, { weekday: true })}</option>`).join('')}</select></div>
          <div class="field"><label for="vi-s">Hora</label><select class="select" id="vi-s" name="slot">${SLOTS.map(s => `<option>${s}</option>`).join('')}</select></div></div>
        <div class="grid-3"><div class="field"><label for="vi-n">Nombre</label><input class="input" id="vi-n" name="name" value="${escape(me?.name || '')}"></div><div class="field"><label for="vi-e">Correo</label><input class="input" id="vi-e" type="email" name="email" value="${escape(me?.email || '')}"></div><div class="field"><label for="vi-p">Teléfono</label><input class="input" id="vi-p" type="tel" name="phone" value="${escape(me?.phone || '')}"></div></div>
        <label class="check"><input type="checkbox" name="tradein"> Quiero usarlo como parte de pago de un auto certificado</label>
        <div class="row between"><button type="button" class="btn btn-ghost" data-back>← Volver</button><button class="btn btn-primary btn-lg">Confirmar inspección</button></div></form>` : ''}
      ${S.step === 3 ? `<div class="card stack success-hero narrow"><span class="big-ico">🏷️</span><h2 style="margin:0">¡Inspección agendada!</h2><p class="lead">Código <b class="mono">${S.done.code}</b> · ${fmtDay(S.done.date, { weekday: true })} a las ${S.done.slot} en ${escape(S.done.branch)}.</p><p class="muted">Trae el padrón, el permiso de circulación y las dos llaves.</p><div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/autos">Ver autos certificados</a>${me ? '<a class="btn" href="#/cuenta">Mi cuenta</a>' : ''}</div></div>` : ''}
    </div></section>`;
  };
  el.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, v = Object.fromEntries(new FormData(f));
    if (f.id === 'vf') {
      if (!v.brand) { toast('Elige la marca', 'warning'); return; }
      if (v.model.trim().length < 1) { toast('Indica el modelo', 'warning'); return; }
      if (!(+v.km >= 0) || v.km === '' || +v.km > 600000) { toast('Indica un kilometraje válido', 'warning'); return; }
      Object.assign(S, { brand: v.brand, model: v.model.trim(), year: +v.year, km: +v.km, condition: v.condition || 'bueno' });
      S.offer = valuate(S);
      const val = db.insert('valuations', { code: nextCode('valuations', 'TS-', 800), brand: S.brand, model: S.model, year: S.year, km: S.km, condition: S.condition, offerMin: S.offer.min, offerMax: S.offer.max, name: me?.name || '', email: me?.email || '', phone: me?.phone || '', status: 'cotizada', branchId: 'b1' });
      S.valId = val.id; S.step = 1; draw(); scrollTo(0, 0);
    }
    if (f.id === 'vi') {
      if (v.name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(v.email) || v.phone.replace(/\D/g, '').length < 8) { toast('Completa nombre, correo y teléfono válidos', 'warning'); return; }
      const val = db.update('valuations', S.valId, { name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), status: 'agendada', branchId: v.branch, appointmentAt: `${v.date}T${v.slot}`, tradeIn: !!v.tradein });
      db.insert('leads', { type: 'tasacion', carId: null, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), rut: '', status: 'nuevo', sellerId: null, source: 'web', scheduledAt: `${v.date}T${v.slot}`, branchId: v.branch, valuationId: S.valId, notes: [{ at: new Date().toISOString(), by: null, text: `Tasación ${val.code}: ${S.brand} ${S.model} ${S.year}, ${kmFmt(S.km)}. Oferta ${money(S.offer.min)}–${money(S.offer.max)}${v.tradein ? ' · parte de pago' : ''}.` }] });
      db.log('tasaciones', `Inspección de tasación agendada ${val.code}: ${S.brand} ${S.model} ${S.year}`, u?.id || null);
      S.done = { code: val.code, date: v.date, slot: v.slot, branch: db.get('branches', v.branch)?.name }; S.step = 3; draw(); scrollTo(0, 0);
      toast('Inspección agendada', 'success');
    }
  });
  el.addEventListener('click', e => { if (e.target.closest('[data-back]')) { S.step = Math.max(0, S.step - 1); draw(); } if (e.target.closest('[data-next]')) { S.step = 2; draw(); scrollTo(0, 0); } });
  draw();
  return { live: false };
}
