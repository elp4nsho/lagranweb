// Planes: CRUD (precio, calidad, pantallas, anuncios, beneficios). Se reflejan en la landing y en la cuenta.
import { db } from '../data/db.js';
import { html, raw, $, money, toast, confirm, formModal, escape } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';

export function render(el, { user }) {
  const draw = () => {
    const plans = db.all('plans').sort((a, b) => a.price - b.price);
    el.innerHTML = html`${raw(pageHead('Planes', 'Precios y beneficios. Los cambios se ven al instante en la landing.', '<button class="btn btn-primary" id="new">+ Nuevo plan</button>'))}
      <div class="grid-3">${plans.map(p => { const subs = db.count('users', u => u.role === 'suscriptor' && u.plan === p.id && u.subStatus === 'activa'); return raw(html`<div class="card stack" style="${p.active ? '' : 'opacity:.6'}">
        <div class="row between"><h3 style="margin:0">${p.name}</h3>${p.highlight ? raw('<span class="badge badge-primary">Destacado</span>') : ''}${p.active ? '' : raw('<span class="badge">Inactivo</span>')}</div>
        <div class="stat"><span class="value">${money(p.price)}</span><span class="label">${p.quality} · ${p.screens} pantalla(s) · ${p.ads ? 'con anuncios' : 'sin anuncios'}</span></div>
        <ul class="small" style="margin:0;padding-left:18px">${p.features.map(f => raw(`<li>${escape(f)}</li>`))}</ul>
        <span class="muted small">${subs} suscriptores activos · MRR ${money(subs * p.price)}</span>
        <div class="row" style="gap:6px"><button class="btn btn-sm" data-edit="${p.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${p.id}">Eliminar</button></div></div>`); })}</div>`;
  };
  async function edit(p = {}) {
    const r = await formModal({ title: p.id ? `Editar ${p.name}` : 'Nuevo plan', fields: [
      { name: 'name', label: 'Nombre', required: true, value: p.name },
      { name: 'price', label: 'Precio mensual (CLP)', type: 'number', required: true, value: p.price ?? 7990 },
      { name: 'quality', label: 'Calidad (texto)', value: p.quality || 'Full HD 1080p' },
      { name: 'maxQuality', label: 'Calidad máxima en el reproductor', type: 'select', options: ['480p', '720p', '1080p', '4K'], value: p.maxQuality || '1080p' },
      { name: 'screens', label: 'Pantallas simultáneas', type: 'number', value: p.screens ?? 2 },
      { name: 'features', label: 'Beneficios (uno por línea)', type: 'textarea', value: (p.features || []).join('\n') },
      { name: 'ads', label: 'Incluye anuncios', type: 'checkbox', value: !!p.ads },
      { name: 'highlight', label: 'Destacar como "Más elegido"', type: 'checkbox', value: !!p.highlight },
      { name: 'active', label: 'Disponible para nuevas altas', type: 'checkbox', value: p.active !== false }
    ] });
    if (!r) return;
    if (!(r.price > 0) || !(r.screens > 0)) return toast('Precio y pantallas deben ser mayores a 0', 'error');
    r.features = r.features.split('\n').map(s => s.trim()).filter(Boolean);
    if (r.highlight) db.query('plans', x => x.highlight && x.id !== p.id).forEach(x => db.update('plans', x.id, { highlight: false }));
    if (p.id) db.update('plans', p.id, r); else db.insert('plans', { ...r, downloads: true });
    db.log('planes', `Plan ${r.name}: ${money(r.price)}`, user.id); toast('Plan guardado', 'success');
  }
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'new') edit();
    if (b.dataset.edit) edit(db.get('plans', b.dataset.edit));
    if (b.dataset.del) {
      const p = db.get('plans', b.dataset.del);
      if (db.count('users', u => u.plan === p.id && u.subStatus !== 'cancelada')) return toast('Hay suscriptores en este plan: desactívalo en lugar de eliminarlo', 'warning');
      if (await confirm(`¿Eliminar el plan ${p.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('plans', p.id); db.log('planes', `Eliminado ${p.name}`, user.id); toast('Plan eliminado'); }
    }
  });
  draw();
  return { update: draw };
}
void $;
