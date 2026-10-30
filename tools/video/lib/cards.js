// HTML de las tarjetas a pantalla completa (intro, capítulo, cierre). Se pintan dentro del
// shadow DOM de overlay.js, que trae los estilos (.num, h1, h2, .lead, .chips, .list, .url…).
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const brandRow = (txt = 'La Gran Web') => `<div class="brand"><i>←</i>${esc(txt)}</div>`;

/** { kicker, title, lead, chips: [[label, value]] | [label], foot } */
function introCard({ kicker = 'La Gran Web presenta', title, lead, chips = [], foot = '' }) {
  return `${brandRow(kicker)}<h1>${esc(title)}</h1><p class="lead">${esc(lead)}</p>
    ${chips.length ? `<div class="chips">${chips.map(c => Array.isArray(c) ? `<span><b>${esc(c[0])}</b>${esc(c[1])}</span>` : `<span>${esc(c)}</span>`).join('')}</div>` : ''}
    ${foot ? `<div class="foot">${esc(foot)}</div>` : ''}`;
}

function chapterCard(n, title, sub = '') {
  return `<div class="num">Capítulo ${n}</div><h2>${esc(title)}</h2>${sub ? `<p class="lead">${esc(sub)}</p>` : ''}`;
}

/** { title, lead, list: [], url, foot } */
function outroCard({ title, lead = '', list = [], url = '', foot = '' }) {
  return `${brandRow('La Gran Web')}<h2>${esc(title)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
    ${list.length ? `<ul class="list">${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${url ? `<div class="url">${esc(url)}</div>` : ''}${foot ? `<div class="foot">${esc(foot)}</div>` : ''}`;
}

module.exports = { introCard, chapterCard, outroCard, esc };
