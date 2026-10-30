// Formulario en modal con más tipos de campo que formModal del núcleo.
// fields: [{ name, label, type, options, required, span: 2, help, placeholder, min, max, step }]
// tipos: text email tel number date time color password textarea select checkbox checkboxes file html
import { modal, escape, toast } from '../../../assets/core/ui.js';

function fieldHTML(fd, v) {
  const id = 'fd-' + fd.name, req = fd.required ? 'required' : '';
  const attrs = ['min', 'max', 'step', 'placeholder', 'pattern', 'maxlength', 'autocomplete'].filter(k => fd[k] != null).map(k => `${k}="${escape(fd[k])}"`).join(' ');
  let input;
  switch (fd.type) {
    case 'html': return `<div class="field span-${fd.span || 2}">${fd.html}</div>`;
    case 'textarea': input = `<textarea class="textarea" id="${id}" name="${fd.name}" ${req} ${attrs}>${escape(v ?? '')}</textarea>`; break;
    case 'select': input = `<select class="select" id="${id}" name="${fd.name}" ${req}>${fd.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(val)}" ${String(val) === String(v ?? '') ? 'selected' : ''}>${escape(lab)}</option>`; }).join('')}</select>`; break;
    case 'checkbox': return `<div class="field span-${fd.span || 2}"><label class="check"><input type="checkbox" name="${fd.name}" ${v ? 'checked' : ''}> ${escape(fd.label)}</label>${fd.help ? `<small class="muted">${escape(fd.help)}</small>` : ''}</div>`;
    case 'checkboxes': input = `<div class="row check-row" role="group" aria-label="${escape(fd.label)}">${fd.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<label class="check"><input type="checkbox" name="${fd.name}" value="${escape(val)}" ${(v || []).map(String).includes(String(val)) ? 'checked' : ''}> ${escape(lab)}</label>`; }).join('')}</div>`; break;
    case 'file': input = `<input class="input" id="${id}" name="${fd.name}" type="file" ${fd.accept ? `accept="${escape(fd.accept)}"` : ''}>`; break;
    default: input = `<input class="input" id="${id}" name="${fd.name}" type="${fd.type || 'text'}" value="${escape(v ?? '')}" ${req} ${attrs}>`;
  }
  return `<div class="field span-${fd.span || 1}"><label for="${id}">${escape(fd.label)}${fd.required ? ' *' : ''}</label>${input}${fd.help ? `<small class="muted">${escape(fd.help)}</small>` : ''}</div>`;
}

export function readForm(form, fields) {
  const out = {};
  fields.forEach(fd => {
    if (fd.type === 'html') return;
    const els = form.querySelectorAll(`[name="${fd.name}"]`);
    if (fd.type === 'checkbox') out[fd.name] = els[0].checked;
    else if (fd.type === 'checkboxes') out[fd.name] = [...els].filter(e => e.checked).map(e => (fd.numeric ? Number(e.value) : e.value));
    else if (fd.type === 'file') out[fd.name] = els[0].files[0] || null;
    else { const v = els[0].value.trim(); out[fd.name] = fd.type === 'number' ? (v === '' ? null : Number(v)) : v; }
  });
  return out;
}

export function formDialog({ title, fields, values = {}, submit = 'Guardar', size = '', cols = 2, validate, onOpen, extraFoot = '' }) {
  return new Promise(resolve => {
    let done = false;
    const f = document.createElement('form');
    f.className = `form-grid cols-${cols}`;
    f.noValidate = true;
    f.innerHTML = fields.map(fd => fieldHTML(fd, values[fd.name] ?? fd.value)).join('') + '<p class="form-error span-2" role="alert"></p>';
    const m = modal({ title, body: f, size, foot: `${extraFoot}<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-submit>${escape(submit)}</button>`, onClose: () => !done && resolve(null) });
    const go = e => {
      e && e.preventDefault();
      const out = readForm(f, fields);
      let bad = null;
      fields.forEach(fd => {
        const el = f.querySelector(`[name="${fd.name}"]`);
        if (!el || fd.type === 'checkbox' || fd.type === 'checkboxes' || fd.type === 'html') return;
        const miss = fd.required && (out[fd.name] === '' || out[fd.name] == null);
        const badEmail = fd.type === 'email' && out[fd.name] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out[fd.name]);
        el.classList.toggle('invalid', miss || badEmail);
        if ((miss || badEmail) && !bad) bad = [el, miss ? `Completa «${fd.label}»` : 'El correo no es válido'];
      });
      if (!bad && validate) { const msg = validate(out); if (msg) bad = [null, msg]; }
      if (bad) { f.querySelector('.form-error').textContent = bad[1]; bad[0]?.focus(); toast(bad[1], 'warning'); return; }
      done = true; m.close(); resolve(out);
    };
    f.addEventListener('submit', go);
    m.el.querySelector('[data-submit]').onclick = go;
    onOpen && onOpen(f, m);
  });
}
