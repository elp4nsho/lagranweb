// Renderizador de bloques de artículo (lo usan el sitio público y la vista previa del editor).
import { escape } from '../../../assets/core/ui.js';
import { inline } from '../data/db.js';
import { art } from './art.js';

const il = s => inline(s || '', escape);

export function renderBlock(b) {
  switch (b.type) {
    case 'h2': return `<h2>${il(b.text)}</h2>`;
    case 'h3': return `<h3>${il(b.text)}</h3>`;
    case 'quote': return `<blockquote class="pull-quote"><p>${il(b.text)}</p>${b.cite ? `<cite>— ${escape(b.cite)}</cite>` : ''}</blockquote>`;
    case 'img': return `<figure class="article-figure">${art(b.art, { ratio: '16/9', label: b.caption || 'Imagen' })}${b.caption ? `<figcaption>${escape(b.caption)}</figcaption>` : ''}</figure>`;
    case 'list': { const tag = b.ordered ? 'ol' : 'ul'; return `<${tag} class="article-list">${(b.items || []).filter(Boolean).map(i => `<li>${il(i)}</li>`).join('')}</${tag}>`; }
    case 'callout': return `<aside class="callout"><b>Dato clave</b><p>${il(b.text)}</p></aside>`;
    case 'divider': return `<hr class="article-hr">`;
    default: return `<p>${il(b.text)}</p>`;
  }
}

export const renderBlocks = (blocks = [], limit = Infinity) => blocks.slice(0, limit).map(renderBlock).join('');

export const BLOCK_TYPES = {
  p: 'Párrafo', h2: 'Título', h3: 'Subtítulo', quote: 'Cita', img: 'Imagen', list: 'Lista', callout: 'Destacado', divider: 'Separador'
};
