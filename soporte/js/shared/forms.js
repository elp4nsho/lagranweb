// Formularios en modal con HTML libre + helpers de campos.
import { modal, toast, escape } from '../../../assets/core/ui.js';

export function openForm({ title, body, submit = 'Guardar', size = '', onSubmit, onOpen, extraFoot = '' }) {
  const f = document.createElement('form');
  f.className = 'stack';
  f.noValidate = true;
  f.innerHTML = body;
  const m = modal({ title, body: f, size, foot: `${extraFoot}<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-submit>${escape(submit)}</button>` });
  const go = async e => {
    e && e.preventDefault();
    let ok = true;
    f.querySelectorAll('[required]').forEach(el => { const bad = !String(el.value).trim(); el.classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return toast('Completa los campos obligatorios', 'warning');
    const data = Object.fromEntries(new FormData(f).entries());
    f.querySelectorAll('input[type=checkbox][name]').forEach(cb => { data[cb.name] = cb.checked; });
    const res = await onSubmit(f, data);
    if (res !== false) m.close();
  };
  f.addEventListener('submit', go);
  m.el.querySelector('[data-submit]').onclick = go;
  onOpen && onOpen(f, m);
  return m;
}
export const opt = (val, label, sel) => `<option value="${escape(val)}" ${String(val) === String(sel ?? '') ? 'selected' : ''}>${escape(label)}</option>`;
export const field = (label, inner, cls = '') => `<div class="field ${cls}"><label>${escape(label)}</label>${inner}</div>`;
// Selector de archivos simulado: devuelve [{name,size}] sin guardar el contenido.
export const filesOf = input => [...(input?.files || [])].map(f => ({ name: f.name, size: f.size || 1024 }));
