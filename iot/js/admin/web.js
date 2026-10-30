// Sitio web público (CMS): portada, planes, tarifa de energía y solicitudes de demo (leads).
import { db, site } from '../data/db.js';
import { money, ago, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { pageHead } from '../shared/common.js';

const st = { tab: 'portada' };
const save = (patch, u, what) => { db.setValue('site', { ...site(), ...patch }); db.log('cms', `${u.name} actualizó ${what}`, u.id); toast('Publicado en el sitio', 'success'); };

export function render(el, ctx) {
  const w = ctx.canWrite, u = ctx.user, s = site(), dis = w ? '' : 'disabled';
  const leads = db.all('leads').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  let body = '';
  if (st.tab === 'portada') body = h`<form class="card stack" data-f="hero">
    <div class="field"><label for="he">Antetítulo</label><input class="input" id="he" name="eyebrow" value="${s.hero.eyebrow}" ${dis}></div>
    <div class="field"><label for="ht">Título</label><input class="input" id="ht" name="title" value="${s.hero.title}" ${dis}></div>
    <div class="field"><label for="hs">Bajada</label><textarea class="textarea" id="hs" name="subtitle" ${dis}>${s.hero.subtitle}</textarea></div>
    <div class="grid-2"><div class="field"><label for="hc">Botón</label><input class="input" id="hc" name="cta" value="${s.hero.cta}" ${dis}></div><div class="field"><label for="hm">Correo de ventas</label><input class="input" id="hm" name="email" value="${s.contact.email}" ${dis}></div></div>
    <div class="field"><label for="tf">Tarifa energía (CLP/kWh, usada en reportes)</label><input class="input" type="number" id="tf" name="tariff" value="${s.tariff}" ${dis}></div>
    ${w ? raw('<div class="row"><button class="btn btn-primary">Publicar</button><a class="btn btn-ghost" href="index.html" target="_blank" rel="noopener">Ver sitio ↗</a></div>') : ''}</form>`;
  else if (st.tab === 'planes') body = h`${w ? raw('<div><button class="btn btn-sm btn-primary" data-newplan>+ Nuevo plan</button></div>') : ''}<div class="grid-3">${s.plans.map((p, i) => h`<div class="card stack ${p.featured ? 'plan featured' : ''}"><div class="row between"><b>${p.name}</b>${p.featured ? raw('<span class="badge badge-primary">Destacado</span>') : ''}</div><span class="big-value" style="font-size:26px">${p.price ? money(p.price) : 'A medida'}</span><span class="small muted">${p.devices}</span><ul class="small">${p.features.map(f => h`<li>${f}</li>`)}</ul>${w ? raw(`<div class="row"><button class="btn btn-sm" data-editplan="${i}">Editar</button><button class="btn btn-sm btn-ghost" data-delplan="${i}">Eliminar</button></div>`) : ''}</div>`)}</div>`;
  else body = h`<div class="table-wrap"><table class="table"><thead><tr><th>Contacto</th><th>Plan</th><th>Mensaje</th><th>Recibido</th><th>Estado</th></tr></thead><tbody>${leads.map(l => h`<tr><td><b>${l.name}</b><br><span class="small muted">${l.company} · ${l.email}</span></td><td>${l.plan}</td><td class="small">${l.message || '—'}</td><td>${ago(l.createdAt)}</td><td><select class="select" data-lead="${l.id}" ${dis} aria-label="Estado">${['nuevo', 'contactado', 'demo agendada', 'ganado', 'perdido'].map(x => h`<option ${l.status === x ? 'selected' : ''}>${x}</option>`)}</select></td></tr>`)}</tbody></table></div>${!leads.length ? raw('<div class="empty">Sin solicitudes.</div>') : ''}`;
  el.innerHTML = pageHead('Sitio web y leads', 'Lo que cambies aquí se ve al instante en la página de producto.', '', !w) + h`<div class="tabs">${[['portada', 'Portada'], ['planes', 'Planes y precios'], ['leads', `Solicitudes de demo (${leads.filter(l => l.status === 'nuevo').length} nuevas)`]].map(([k, l]) => h`<button class="tab ${st.tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`)}</div>` + body;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; ctx.refresh(); });
  if (!w) return;
  el.querySelector('[data-f="hero"]')?.addEventListener('submit', e => { e.preventDefault(); const f = e.target.elements; if (!f.title.value.trim()) return toast('El título no puede quedar vacío', 'warning'); save({ hero: { eyebrow: f.eyebrow.value.trim(), title: f.title.value.trim(), subtitle: f.subtitle.value.trim(), cta: f.cta.value.trim() || 'Ver demo' }, contact: { ...s.contact, email: f.email.value.trim() }, tariff: Math.max(1, +f.tariff.value) }, u, 'la portada del sitio'); });
  const planForm = p => formModal({ title: p ? 'Editar plan' : 'Nuevo plan', fields: [{ name: 'name', label: 'Nombre', required: true, value: p?.name }, { name: 'price', label: 'Precio mensual CLP (0 = a medida)', type: 'number', value: p?.price ?? 0 }, { name: 'devices', label: 'Capacidad', required: true, value: p?.devices }, { name: 'features', label: 'Características (separadas por ";")', value: p?.features.join('; ') }, { name: 'featured', label: 'Destacado', type: 'checkbox', value: p?.featured }] });
  const norm = v => ({ ...v, period: 'mes', features: String(v.features || '').split(';').map(x => x.trim()).filter(Boolean) });
  el.querySelector('[data-newplan]')?.addEventListener('click', async () => { const v = await planForm(); if (v) save({ plans: [...s.plans, { id: 'p' + Date.now(), ...norm(v) }] }, u, `el plan ${v.name}`); });
  el.querySelectorAll('[data-editplan]').forEach(b => b.onclick = async () => { const i = +b.dataset.editplan; const v = await planForm(s.plans[i]); if (v) save({ plans: s.plans.map((p, k) => k === i ? { ...p, ...norm(v) } : p) }, u, `el plan ${v.name}`); });
  el.querySelectorAll('[data-delplan]').forEach(b => b.onclick = async () => { const i = +b.dataset.delplan; if (await confirm(`¿Eliminar el plan ${s.plans[i].name}?`, { title: 'Eliminar plan', ok: 'Eliminar', danger: true })) save({ plans: s.plans.filter((_, k) => k !== i) }, u, 'los planes'); });
  el.querySelectorAll('[data-lead]').forEach(sel => sel.onchange = () => { db.update('leads', sel.dataset.lead, { status: sel.value }); sel.blur(); db.log('lead', `${u.name} marcó lead como "${sel.value}"`, u.id); toast('Lead actualizado', 'success'); });
}
