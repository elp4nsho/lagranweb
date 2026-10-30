// Ficha de plato con modificadores, cantidad y nota.
import { modal, toast, money, escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { TAGS } from '../shared/logic.js';
import { t, tr } from './i18n.js';
import { cart } from './cart.js';

export function dishArt(d, cls = '') {
  return `<div class="dish-art ${cls}" data-tone="${escape(d.tone || 'primary')}" aria-hidden="true"><span>${escape(d.emoji || '🍽️')}</span></div>`;
}
export function tagList(d) {
  return (d.tags || []).map(k => TAGS[k] ? `<span class="tag-pill" title="${escape(tr(TAGS[k]))}">${TAGS[k].icon} <span>${escape(tr(TAGS[k]))}</span></span>` : '').join('');
}

export function selText(sel, lang) {
  return sel.map(([gid, oid]) => { const g = db.get('modGroups', gid); const o = g?.options.find(x => x.id === oid); return o ? (lang ? (o[lang] || o.es) : o.es) : ''; }).filter(Boolean);
}
export function selExtra(sel) {
  return sel.reduce((s, [gid, oid]) => s + (db.get('modGroups', gid)?.options.find(x => x.id === oid)?.price || 0), 0);
}

export function openDish(d, { canOrder = true } = {}) {
  const groups = (d.mods || []).map(id => db.get('modGroups', id)).filter(Boolean);
  let qty = 1;
  const body = document.createElement('div');
  body.className = 'stack dish-sheet';
  body.innerHTML = `
    ${dishArt(d, 'lg')}
    <div class="stack" style="gap:6px">
      <div class="row" style="gap:6px">${d.popular ? `<span class="badge badge-primary">★ ${escape(t('popular'))}</span>` : ''}${tagList(d)}</div>
      <p class="muted" style="margin:0">${escape(tr(d.desc))}</p>
      <b class="price-lg">${money(d.price)}</b>
    </div>
    ${groups.map(g => `
      <fieldset class="mod-group" data-g="${g.id}" data-type="${g.type}" data-req="${g.required ? 1 : 0}">
        <legend><b>${escape(tr(g.name))}</b> <span class="badge ${g.required ? 'badge-warning' : ''} plain">${escape(g.required ? t('required') : t('optional'))}</span> <small class="muted">${escape(g.type === 'single' ? t('pickOne') : t('pickMany'))}</small></legend>
        ${g.options.map(o => `<label class="mod-opt"><input type="${g.type === 'single' ? 'radio' : 'checkbox'}" name="g-${g.id}" value="${o.id}"> <span>${escape(tr(o))}</span>${o.price ? `<small class="muted">+${money(o.price)}</small>` : ''}</label>`).join('')}
      </fieldset>`).join('')}
    ${canOrder ? `<div class="field"><label for="dish-note">${escape(t('note'))}</label><input class="input" id="dish-note" maxlength="120" placeholder="${escape(t('notePh'))}"></div>` : `<p class="callout small">${escape(t('viewOnly'))}</p>`}`;
  const foot = canOrder ? `<div class="qty" role="group" aria-label="Cantidad"><button class="btn btn-icon btn-sm" data-q="-1" aria-label="Menos">−</button><b data-qty>1</b><button class="btn btn-icon btn-sm" data-q="1" aria-label="Más">+</button></div>
    <button class="btn btn-primary" data-add>${escape(t('add'))} · <span data-sum>${money(d.price)}</span></button>` : `<button class="btn" data-close>OK</button>`;
  const m = modal({ title: tr(d.name), body, foot });
  if (!canOrder) return;
  const read = () => {
    const sel = [];
    body.querySelectorAll('.mod-group').forEach(fs => fs.querySelectorAll('input:checked').forEach(i => sel.push([fs.dataset.g, i.value])));
    return sel;
  };
  const sum = () => { m.el.querySelector('[data-sum]').textContent = money((d.price + selExtra(read())) * qty); m.el.querySelector('[data-qty]').textContent = qty; };
  body.addEventListener('change', sum);
  m.el.querySelector('.modal-foot').addEventListener('click', e => {
    const q = e.target.closest('[data-q]');
    if (q) { qty = Math.max(1, Math.min(20, qty + +q.dataset.q)); sum(); return; }
    if (!e.target.closest('[data-add]')) return;
    const sel = read();
    const missing = groups.find(g => g.required && !sel.some(([gid]) => gid === g.id));
    if (missing) {
      const fs = body.querySelector(`[data-g="${missing.id}"]`);
      fs.classList.add('invalid'); fs.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(`${t('chooseReq')} "${tr(missing.name)}"`, 'warning');
      return;
    }
    cart.add({ dishId: d.id, qty, price: d.price + selExtra(sel), sel, sig: JSON.stringify(sel), note: body.querySelector('#dish-note').value.trim() });
    toast(`${tr(d.name)} ${t('added')}`, 'success', 1800);
    m.close();
  });
}
