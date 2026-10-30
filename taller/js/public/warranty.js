// Consulta de garantías por patente o código GAR-xxxx, con solicitud de revisión en garantía.
import { escape, toast, formModal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { normPlate } from '../shared/domain.js';
import { warrantyHTML } from '../shared/bits.js';

let q = '';
export function renderWarranty(el) {
  const paint = () => {
    const s = q.trim().toUpperCase();
    const list = s ? db.query('warranties', w => w.code === s || normPlate(w.plate) === normPlate(s)).sort((a, b) => b.until.localeCompare(a.until)) : [];
    el.innerHTML = `<section class="section page-top"><div class="container narrow stack">
      <div data-anim><span class="eyebrow">Garantías</span><h1>Consulta tu garantía</h1><p class="lead">Todos nuestros trabajos tienen garantía escrita: de 3 a 24 meses según el tipo de reparación.</p></div>
      <form class="card plate-form" novalidate data-f><label class="sr-only" for="w-q">Patente o código</label><input class="input" id="w-q" name="buscar" placeholder="Patente o GAR-3310" value="${escape(q)}"><button class="btn btn-primary">Consultar</button></form>
      ${s ? (list.length ? list.map(w => `${warrantyHTML(w)}${w.until >= new Date().toISOString().slice(0, 10) ? `<button class="btn btn-sm" data-claim="${w.id}" style="justify-self:start">Solicitar revisión en garantía</button>` : ''}${(w.claims || []).map(c => `<p class="callout small">📝 ${escape(c.text)} · <b>${escape(c.status)}</b></p>`).join('')}`).join('') : '<div class="card empty"><span class="icon">🔎</span>No hay garantías para esa patente o código.</div>') : '<p class="small muted">Prueba con la patente <b>PRWT-63</b> o con el código de tu documento.</p>'}
      <div class="grid-3">${[['🔧', 'Mecánica', '6 a 12 meses'], ['🎨', 'Pintura', '24 meses'], ['⚙️', 'Motor y caja', '12 meses']].map(([i, t, d]) => `<div class="card"><span class="svc-ico">${i}</span><b class="d-block">${t}</b><small class="muted">${d}</small></div>`).join('')}</div>
    </div></section>`;
    el.querySelector('[data-f]').onsubmit = e => { e.preventDefault(); q = e.target.elements.buscar.value; paint(); };
  };
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-claim]'); if (!b) return;
    const v = await formModal({ title: 'Revisión en garantía', fields: [{ name: 'text', label: '¿Qué problema notas?', type: 'textarea', required: true }, { name: 'phone', label: 'Celular de contacto', required: true }] });
    if (!v) return;
    const w = db.get('warranties', b.dataset.claim);
    db.update('warranties', w.id, { claims: [...(w.claims || []), { at: new Date().toISOString(), text: v.text, phone: v.phone, status: 'recibida' }] });
    db.log('garantia', `${w.code} · solicitud de revisión: ${v.text}`, null);
    toast('Solicitud recibida: te contactaremos para agendar', 'success');
  });
  paint();
  return { refresh: paint };
}
