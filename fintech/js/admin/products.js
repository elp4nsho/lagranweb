// Productos, tarifas y contenidos del sitio público (CMS). Todo se refleja al instante en la landing.
import { db, site } from '../data/db.js';
import { money, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { pageHead } from './kit.js';

const st = { tab: 'tarifas' };
const save = (patch, staff, what) => { db.setValue('site', { ...site(), ...patch }); db.log('cms', `${staff.name} actualizó ${what} del sitio público`, staff.id); toast('Cambios publicados en el sitio', 'success'); };

export function render(el, ctx) {
  const ro = !ctx.canWrite, dis = ro ? 'disabled' : '';
  const s = site();
  const tabs = [['tarifas', 'Tarifas y límites'], ['sitio', 'Portada'], ['tarjetas', 'Tarjetas'], ['fondos', 'Fondos'], ['faq', 'Preguntas frecuentes']];
  let body = '';
  if (st.tab === 'tarifas') body = h`<form class="card stack" data-form="fees">
      <div class="table-wrap"><table class="table"><thead><tr><th>Concepto</th><th>Valor</th><th>Unidad</th></tr></thead><tbody>
      ${s.fees.map(f => h`<tr><td>${f.label}</td><td><input class="input" type="number" step="0.01" name="${f.id}" value="${f.value}" style="max-width:160px" ${dis} aria-label="${f.label}"></td><td>${f.unit === '%' ? '%' : 'CLP'}</td></tr>`)}
      </tbody></table></div>
      <div class="grid-3">
        <div class="field"><label for="ltd">Límite diario transferencias</label><input class="input" type="number" id="ltd" name="transferDaily" value="${s.limits.transferDaily}" ${dis}></div>
        <div class="field"><label for="lqr">Máximo por pago QR</label><input class="input" type="number" id="lqr" name="qrMax" value="${s.limits.qrMax}" ${dis}></div>
        <div class="field"><label for="lmax">Crédito máximo</label><input class="input" type="number" id="lmax" name="loanMax" value="${s.loan.max}" ${dis}></div>
      </div>
      ${ro ? '' : raw('<div class="row"><button class="btn btn-primary">Publicar tarifas</button><a class="btn btn-ghost" href="index.html#tarifas" target="_blank" rel="noopener">Ver en el sitio ↗</a></div>')}
    </form>`;
  else if (st.tab === 'sitio') body = h`<form class="card stack" data-form="hero">
      <div class="field"><label for="he">Antetítulo</label><input class="input" id="he" name="eyebrow" value="${s.hero.eyebrow}" ${dis}></div>
      <div class="field"><label for="ht">Título principal</label><input class="input" id="ht" name="title" value="${s.hero.title}" ${dis}></div>
      <div class="field"><label for="hs">Bajada</label><textarea class="textarea" id="hs" name="subtitle" ${dis}>${s.hero.subtitle}</textarea></div>
      <div class="field"><label for="hc">Texto del botón</label><input class="input" id="hc" name="cta" value="${s.hero.cta}" ${dis}></div>
      <div class="field"><label for="hn">Aviso de demo (cinta superior)</label><input class="input" id="hn" name="notice" value="${s.notice}" ${dis}></div>
      ${ro ? '' : raw('<div class="row"><button class="btn btn-primary">Publicar portada</button><a class="btn btn-ghost" href="index.html" target="_blank" rel="noopener">Ver sitio ↗</a></div>')}
    </form>`;
  else if (st.tab === 'tarjetas') {
    const ps = db.all('products').sort((a, b) => a.order - b.order);
    body = h`${ro ? '' : raw('<div><button class="btn btn-primary btn-sm" data-new="products">+ Nueva tarjeta</button></div>')}
      <div class="table-wrap"><table class="table"><thead><tr><th>Orden</th><th>Tarjeta</th><th>Tipo</th><th>Comisión anual</th><th>Destacada</th><th>Publicada</th><th></th></tr></thead><tbody>
      ${ps.map(p => h`<tr><td>${p.order}</td><td><b>${p.name}</b><br><span class="small muted">${p.perks.join(' · ')}</span></td><td>${p.kind}</td><td>${p.annualFee ? money(p.annualFee) : 'Sin costo'}</td><td>${p.featured ? '★' : ''}</td><td>${raw(p.active ? '<span class="badge badge-success">Sí</span>' : '<span class="badge">No</span>')}</td><td class="right nowrap">${ro ? '' : raw(`<button class="btn btn-sm btn-ghost" data-edit="products:${p.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="products:${p.id}" aria-label="Eliminar">🗑</button>`)}</td></tr>`)}
      </tbody></table></div>`;
  } else if (st.tab === 'fondos') {
    const fs = db.all('funds');
    body = h`${ro ? '' : raw('<div><button class="btn btn-primary btn-sm" data-new="funds">+ Nuevo fondo</button></div>')}
      <div class="table-wrap"><table class="table"><thead><tr><th>Fondo</th><th>Riesgo</th><th>Rent. anual</th><th>Volatilidad</th><th>Mínimo</th><th>Inversionistas</th><th>Publicado</th><th></th></tr></thead><tbody>
      ${fs.map(f => h`<tr><td><b>${f.name}</b><br><span class="small muted">${f.desc}</span></td><td>${f.risk}</td><td>${String(f.annual).replace('.', ',')}%</td><td>${f.vol}</td><td>${money(f.minInvest)}</td><td>${db.count('investments', i => i.fundId === f.id)}</td><td>${raw(f.active ? '<span class="badge badge-success">Sí</span>' : '<span class="badge">No</span>')}</td><td class="right nowrap">${ro ? '' : raw(`<button class="btn btn-sm btn-ghost" data-edit="funds:${f.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="funds:${f.id}" aria-label="Eliminar">🗑</button>`)}</td></tr>`)}
      </tbody></table></div>`;
  } else body = h`${ro ? '' : raw('<div><button class="btn btn-primary btn-sm" data-faq-new>+ Nueva pregunta</button></div>')}
      <div class="stack">${s.faq.map((f, i) => h`<div class="card"><div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><div><b>${f.q}</b><p class="muted small" style="margin:4px 0 0">${f.a}</p></div>${ro ? '' : raw(`<div class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn btn-sm btn-ghost" data-faq-up="${i}" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn btn-sm btn-ghost" data-faq-edit="${i}">Editar</button><button class="btn btn-sm btn-ghost" data-faq-del="${i}" aria-label="Eliminar">🗑</button></div>`)}</div></div>`)}</div>`;

  el.innerHTML = pageHead('Productos y tarifas', 'Contenido del sitio público. Los cambios se publican al instante.', '', ro) +
    h`<div class="tabs">${tabs.map(([k, l]) => h`<button class="tab ${st.tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`)}</div>` + body;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; render(el, ctx); });
  if (ro) return;
  const staff = ctx.user;

  el.querySelector('[data-form="fees"]')?.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target.elements;
    const fees = s.fees.map(x => ({ ...x, value: Math.max(0, +f[x.id].value) }));
    save({ fees, limits: { transferDaily: +f.transferDaily.value, qrMax: +f.qrMax.value }, loan: { ...s.loan, max: +f.loanMax.value } }, staff, 'las tarifas');
  });
  el.querySelector('[data-form="hero"]')?.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target.elements;
    if (!f.title.value.trim()) return toast('El título no puede quedar vacío', 'warning');
    save({ hero: { eyebrow: f.eyebrow.value.trim(), title: f.title.value.trim(), subtitle: f.subtitle.value.trim(), cta: f.cta.value.trim() || 'Abrir cuenta' }, notice: f.notice.value.trim() || 'Demo: dinero ficticio' }, staff, 'la portada');
  });
  const FIELDS = {
    products: p => [{ name: 'name', label: 'Nombre', required: true, value: p?.name }, { name: 'kind', label: 'Tipo', type: 'select', options: ['Débito', 'Crédito', 'Prepago'], value: p?.kind }, { name: 'annualFee', label: 'Comisión anual (CLP)', type: 'number', value: p?.annualFee ?? 0 }, { name: 'desc', label: 'Descripción', type: 'textarea', required: true, value: p?.desc }, { name: 'perks', label: 'Beneficios (separados por ";")', value: p?.perks?.join('; ') }, { name: 'order', label: 'Orden', type: 'number', value: p?.order ?? 9 }, { name: 'featured', label: 'Destacada', type: 'checkbox', value: p?.featured }, { name: 'active', label: 'Publicada', type: 'checkbox', value: p ? p.active : true }],
    funds: f => [{ name: 'name', label: 'Nombre', required: true, value: f?.name }, { name: 'risk', label: 'Perfil de riesgo', type: 'select', options: ['Conservador', 'Moderado', 'Agresivo'], value: f?.risk }, { name: 'annual', label: 'Rentabilidad anual (%)', type: 'number', step: '0.1', value: f?.annual ?? 5 }, { name: 'vol', label: 'Volatilidad (0–10)', type: 'number', step: '0.1', value: f?.vol ?? 1 }, { name: 'minInvest', label: 'Inversión mínima (CLP)', type: 'number', value: f?.minInvest ?? 5000 }, { name: 'desc', label: 'Descripción', value: f?.desc }, { name: 'active', label: 'Publicado', type: 'checkbox', value: f ? f.active : true }],
  };
  const LABEL = { products: 'tarjeta', funds: 'fondo' };
  const norm = (col, v) => col === 'products' ? { ...v, perks: String(v.perks || '').split(';').map(x => x.trim()).filter(Boolean) } : v;
  el.querySelectorAll('[data-new]').forEach(b => b.onclick = async () => {
    const col = b.dataset.new; const v = await formModal({ title: `Nuevo ${LABEL[col]}`, fields: FIELDS[col]() });
    if (!v) return; db.insert(col, norm(col, v)); db.log('cms', `${staff.name} creó ${LABEL[col]} "${v.name}"`, staff.id); toast('Creado y publicado', 'success');
  });
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
    const [col, id] = b.dataset.edit.split(':'); const row = db.get(col, id);
    const v = await formModal({ title: `Editar ${LABEL[col]}`, fields: FIELDS[col](row) });
    if (!v) return; db.update(col, id, norm(col, v)); db.log('cms', `${staff.name} editó ${LABEL[col]} "${v.name}"`, staff.id); toast('Cambios publicados', 'success');
  });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const [col, id] = b.dataset.del.split(':'); const row = db.get(col, id);
    if (col === 'funds' && db.count('investments', i => i.fundId === id)) return toast('No puedes eliminar un fondo con inversionistas. Despublícalo.', 'warning');
    if (!(await confirm(`¿Eliminar "${row.name}"?`, { title: 'Eliminar', ok: 'Eliminar', danger: true }))) return;
    db.remove(col, id); db.log('cms', `${staff.name} eliminó ${LABEL[col]} "${row.name}"`, staff.id); toast('Eliminado', 'info');
  });
  const faqForm = f => formModal({ title: f ? 'Editar pregunta' : 'Nueva pregunta', fields: [{ name: 'q', label: 'Pregunta', required: true, value: f?.q }, { name: 'a', label: 'Respuesta', type: 'textarea', required: true, value: f?.a }] });
  el.querySelector('[data-faq-new]')?.addEventListener('click', async () => { const v = await faqForm(); if (v) save({ faq: [...s.faq, v] }, staff, 'las preguntas frecuentes'); });
  el.querySelectorAll('[data-faq-edit]').forEach(b => b.onclick = async () => { const i = +b.dataset.faqEdit; const v = await faqForm(s.faq[i]); if (v) save({ faq: s.faq.map((x, k) => k === i ? v : x) }, staff, 'las preguntas frecuentes'); });
  el.querySelectorAll('[data-faq-del]').forEach(b => b.onclick = async () => { const i = +b.dataset.faqDel; if (await confirm(`¿Eliminar "${s.faq[i].q}"?`, { title: 'Eliminar pregunta', ok: 'Eliminar', danger: true })) save({ faq: s.faq.filter((_, k) => k !== i) }, staff, 'las preguntas frecuentes'); });
  el.querySelectorAll('[data-faq-up]').forEach(b => b.onclick = () => { const i = +b.dataset.faqUp; const f = [...s.faq]; [f[i - 1], f[i]] = [f[i], f[i - 1]]; save({ faq: f }, staff, 'el orden de las preguntas'); });
}
