// Códigos QR por mesa (patrón SVG generado) listos para imprimir.
import { escape, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { qrSvg, settings } from '../shared/logic.js';

export default {
  id: 'qr', label: 'Códigos QR', icon: '🔳', group: 'Contenido', roles: ['admin'], watch: ['tables'],
  render(el) {
    const base = location.href.replace(/admin\.html.*$/, 'index.html');
    const tables = db.all('tables').sort((a, b) => a.number - b.number);
    el.innerHTML = `${pageHead('Códigos QR', 'Cada mesa tiene su enlace. Imprime y pega el código en la mesa: el comensal abre la carta con su mesa ya elegida.', '<button class="btn btn-sm btn-primary" data-print>🖨️ Imprimir todos</button>')}
      <div class="qr-grid">${tables.map(t => { const url = `${base}?mesa=${t.number}`; return `<div class="card qr-card stack">
        <span class="eyebrow">${escape(settings().name)}</span>
        ${qrSvg(url)}
        <b class="qr-num">Mesa ${t.number}</b><small class="muted">${escape(t.zone)} · ${t.seats} personas</small>
        <code class="qr-url">${escape(url.replace(/^https?:\/\//, ''))}</code>
        <div class="row no-print"><a class="btn btn-sm" href="${escape(url)}" target="_blank" rel="noopener">Abrir</a><button class="btn btn-sm btn-ghost" data-copy="${escape(url)}">Copiar enlace</button></div>
      </div>`; }).join('')}</div>`;
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-print]')) window.print();
      const c = e.target.closest('[data-copy]');
      if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); toast('Enlace copiado', 'success'); } catch (err) { toast(c.dataset.copy, 'info', 6000); } }
    });
  }
};
