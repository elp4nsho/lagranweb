// Documentos de la comunidad: reglamentos, actas, presupuestos y contratos.
import { escape, date, modal, toast } from '../../../assets/core/ui.js';
import { icon } from '../shared/icons.js';
import { pageHead } from '../shared/kit.js';

export const DOC_CATS = { reglamento: 'Reglamentos', acta: 'Actas', presupuesto: 'Presupuestos', contrato: 'Contratos', otro: 'Otros' };
export function openDoc(d) {
  const m = modal({ title: d.title, size: 'lg', body: `<p class="muted small">${escape(DOC_CATS[d.category] || d.category)} · ${date(d.createdAt)} · ${escape(d.size)}</p><div style="white-space:pre-line">${escape(d.content)}</div>`, foot: '<button class="btn" data-dl>Descargar</button><button class="btn btn-primary" data-close>Cerrar</button>' });
  m.el.querySelector('[data-dl]').onclick = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`${d.title}\n\n${d.content}`], { type: 'text/plain' })); a.download = d.title.replace(/[^\wáéíóúñ ]+/gi, '').replace(/\s+/g, '-').toLowerCase() + '.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Documento descargado', 'success');
  };
}
export function renderDocuments(el, p, q, { db }) {
  const docs = db.query('documents', d => d.visible).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const assemblies = db.all('assemblies').sort((a, b) => b.date.localeCompare(a.date));
  el.innerHTML = `${pageHead('Documentos', 'Reglamentos, actas de asamblea y documentos oficiales de la comunidad')}
    ${assemblies.filter(a => a.status === 'programada').map(a => `<div class="banner tone-info"><div><h3>${escape(a.title)}</h3><p>${date(a.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${escape(a.place)} · ${escape(a.agenda)}</p></div></div>`).join('')}
    ${Object.entries(DOC_CATS).map(([k, label]) => { const ds = docs.filter(d => d.category === k); return ds.length ? `<div class="card"><h3>${label}</h3>${ds.map(d => `<div class="list-row"><span class="row" style="gap:10px;flex-wrap:nowrap"><span class="icon-tile">${icon('doc', 20)}</span><span><b>${escape(d.title)}</b><br><span class="muted small">${date(d.createdAt)} · ${escape(d.size)}</span></span></span><button class="btn btn-sm" data-doc="${d.id}">Ver</button></div>`).join('')}</div>` : ''; }).join('')}`;
  el.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => openDoc(db.get('documents', b.dataset.doc)));
}
