// Cotizador público: usa las tarifas y zonas que define el panel (db.pricing).
import { html, raw, money, escape } from '../../../assets/core/ui.js';
import { coveredComunas, ZONE_KEYS } from '../shared/pricing.js';
import * as ops from '../shared/ops.js';

export function comunaOptions(P, selected, placeholder) {
  const list = coveredComunas(P);
  return (placeholder ? `<option value="">${escape(placeholder)}</option>` : '') + ZONE_KEYS.map(z => {
    const cs = list.filter(c => P.comunaZone[c.n] === z).sort((a, b) => a.n.localeCompare(b.n, 'es'));
    return cs.length ? `<optgroup label="${escape(P.zones[z].name)}">${cs.map(c => `<option ${c.n === selected ? 'selected' : ''}>${escape(c.n)}</option>`).join('')}</optgroup>` : '';
  }).join('');
}
export function sizeOptions(P, name, selected = 'M') {
  return Object.entries(P.sizes).map(([k, s]) => html`<label class="sizeopt"><input type="radio" name="${name}" value="${k}" ${k === selected ? 'checked' : ''}><span><i class="box" style="width:${s.box[0]}px;height:${s.box[1]}px"></i><b>${s.name}</b><small>${s.max}</small></span></label>`).join('');
}
export function serviceOptions(P, name, selected = 'estandar') {
  return Object.entries(P.services).filter(([, s]) => s.active !== false).map(([k, s]) => html`<label class="segopt"><input type="radio" name="${name}" value="${k}" ${k === selected ? 'checked' : ''}><span>${s.name}<small>${s.desc}</small></span></label>`).join('');
}
export function rulesNote(P) {
  const act = (P.rules || []).filter(r => r.active && ['lluvia', 'nocturno'].includes(r.kind));
  return act.length ? act.map(r => html`<span class="badge ${r.pct > 0 ? 'badge-warning' : 'badge-success'}">${r.name}: ${r.pct > 0 ? '+' : ''}${r.pct}%</span>`).join(' ') : '';
}

export function mountCalc(el) {
  let st = { from: 'Providencia', to: 'Las Condes', size: 'M', service: 'estandar' };
  const draw = () => {
    const P = ops.pricing();
    el.innerHTML = html`<div class="grid-2 calc-grid">
      <form class="card stack calc" data-anim>
        <div class="calc-route">
          <div class="field"><label for="c-from">Comuna de origen</label><select class="select" id="c-from" name="from">${raw(comunaOptions(P, st.from))}</select></div>
          <button type="button" class="btn btn-icon btn-ghost calc-swap" aria-label="Intercambiar origen y destino">⇅</button>
          <div class="field"><label for="c-to">Comuna de destino</label><select class="select" id="c-to" name="to">${raw(comunaOptions(P, st.to))}</select></div>
        </div>
        <fieldset class="field"><legend class="label">Tamaño del paquete</legend><div class="sizes">${raw(sizeOptions(P, 'size', st.size))}</div></fieldset>
        <fieldset class="field"><legend class="label">Servicio</legend><div class="seg">${raw(serviceOptions(P, 'service', st.service))}</div></fieldset>
        <div class="quote-out" aria-live="polite"></div>
        <a class="btn btn-primary btn-lg btn-block calc-go" href="#/solicitar">Solicitar con estos datos →</a>
      </form>
      <div class="stack">
        <div class="table-wrap" data-anim><table class="table"><thead><tr><th>Tamaño</th><th>Hasta</th><th>Base</th></tr></thead><tbody>
          ${Object.values(P.sizes).map(s => raw(html`<tr><td><b>${s.name}</b></td><td>${s.max}</td><td>${money(s.base)}</td></tr>`))}
        </tbody></table></div>
        <div class="card stack" data-anim style="gap:10px">
          <b>Cómo calculamos</b>
          <p class="muted small" style="margin:0">Base por tamaño + ${money(P.perKm)} por km + recargo de zona, por el factor del servicio (Express ×${String(P.services.express.mult).replace('.', ',')}). Mínimo ${money(P.minPrice)}. IVA incluido.</p>
          <div class="row" style="gap:6px">${raw(ZONE_KEYS.map(z => html`<span class="badge zone-${z}">${P.zones[z].name.split('·')[0]}: ${P.zones[z].extra ? '+' + money(P.zones[z].extra) : 'sin recargo'}</span>`).join(''))}</div>
          ${rulesNote(P) ? raw(`<div class="row" style="gap:6px">${rulesNote(P)}</div>`) : ''}
        </div>
      </div></div>`;
    const f = el.querySelector('form');
    const update = () => {
      st = { from: f.from.value, to: f.to.value, size: f.size.value, service: f.service.value };
      const q = ops.quoteFor(st.from, st.to, st.size, st.service);
      const out = el.querySelector('.quote-out');
      if (!q) { out.innerHTML = '<p class="muted">Selecciona comunas con cobertura.</p>'; return; }
      out.innerHTML = html`<div class="quote"><div class="q-main"><small>Precio final</small><b data-price>${money(q.price)}</b></div>
        <div><small>Distancia</small><b>${String(q.km).replace('.', ',')} km</b></div><div><small>Entrega</small><b>${st.service === 'programado' ? 'Mañana' : '~' + q.totalMin + ' min'}</b></div></div>
        <p class="muted small" style="margin:0">Retiro en ~${q.pickupMin} min · ${P.zones[q.zone].name}${q.breakdown.rules.length ? ' · ' + q.breakdown.rules.map(r => `${r.name} ${r.pct > 0 ? '+' : ''}${r.pct}%`).join(', ') : ''}</p>`;
      el.querySelector('.calc-go').href = `#/solicitar?from=${encodeURIComponent(st.from)}&to=${encodeURIComponent(st.to)}&size=${st.size}&service=${st.service}`;
    };
    f.addEventListener('change', update);
    f.addEventListener('submit', e => e.preventDefault());
    el.querySelector('.calc-swap').onclick = () => { const a = f.from.value; f.from.value = f.to.value; f.to.value = a; update(); };
    update();
  };
  draw();
  let sig = JSON.stringify(ops.pricing());
  return { refresh() { const n = JSON.stringify(ops.pricing()); if (n !== sig) { sig = n; draw(); } } };
}
