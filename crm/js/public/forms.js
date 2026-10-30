// Captura de leads desde el sitio público: formulario de demo y descarga de guía (web-to-lead).
import { db } from '../data/db.js';
import { toast, escape } from '../../../assets/core/ui.js';
import { runAutomations } from '../shared/automation.js';
import { isEmail, leadScore } from '../shared/util.js';

// Crea el lead, ejecuta las automatizaciones y lo deja en la bitácora. Devuelve el lead.
export function createWebLead(data, source) {
  const existing = db.find('leads', l => l.email.toLowerCase() === data.email.toLowerCase() && !['convertido', 'descartado'].includes(l.status));
  if (existing) {
    db.update('leads', existing.id, { message: [existing.message, data.message].filter(Boolean).join('\n— '), bonus: (existing.bonus || 0) + 5 });
    db.log('sitio', `${data.name} volvió a escribir desde el sitio (${source})`);
    return { lead: db.get('leads', existing.id), repeated: true, fired: [] };
  }
  const lead = db.insert('leads', {
    name: data.name.trim(), email: data.email.trim(), company: data.company.trim(), phone: (data.phone || '').trim(), title: '', source, status: 'nuevo',
    size: data.size || '11-50', industry: 'Servicios profesionales', city: 'Santiago', interest: data.interest || 'Plan Crecimiento', message: (data.message || '').trim(), ownerId: null
  });
  db.log('sitio', `Nuevo lead desde el sitio (${source}): ${lead.name} · ${lead.company}`);
  const fired = runAutomations('lead.created', lead, 'lead');
  return { lead: db.get('leads', lead.id), repeated: false, fired };
}

function validate(form, fields) {
  let ok = true;
  fields.forEach(n => {
    const el = form.elements[n];
    const bad = el.type === 'checkbox' ? !el.checked : !el.value.trim() || (el.type === 'email' && !isEmail(el.value));
    el.classList.toggle('invalid', bad);
    if (bad) ok = false;
  });
  return ok;
}

export function wireForms(root) {
  root.addEventListener('submit', e => {
    const form = e.target;
    if (form.matches('[data-demo]')) {
      e.preventDefault();
      if (!validate(form, ['name', 'email', 'company', 'consent'])) return toast('Revisa los campos marcados', 'warning');
      const data = Object.fromEntries(new FormData(form).entries());
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = 'Enviando…';
      setTimeout(() => {
        const { lead, repeated, fired } = createWebLead(data, 'Demo web');
        const owner = lead.ownerId ? db.get('users', lead.ownerId) : null;
        form.outerHTML = `<div class="card stack demo-ok" role="status">
          <span class="ok-ico">✓</span><h3 style="margin:0">¡Gracias, ${escape(lead.name.split(' ')[0])}!</h3>
          <p style="margin:0">${repeated ? 'Ya teníamos tu solicitud; la actualizamos con tu nuevo mensaje.' : `Recibimos tu solicitud de demo para <b>${escape(lead.company)}</b>.`} ${owner ? `<b>${escape(owner.name)}</b> te contactará dentro de las próximas 24 horas hábiles.` : 'Un ejecutivo te contactará pronto.'}</p>
          <div class="sim-note small"><b>Detrás de escena (demo):</b> se creó el lead en Pulso CRM con puntaje ${leadScore(lead)}${fired.length ? ` y se ejecutaron ${fired.length} automatizaciones: ${fired.map(f => escape(f)).join(' · ')}` : ''}. <a href="login.html?next=app.html%23%2Fleads">Míralo en el CRM →</a></div>
        </div>`;
      }, 500);
    }
    if (form.matches('[data-guide]')) {
      e.preventDefault();
      if (!validate(form, ['name', 'email', 'company'])) return toast('Completa nombre, correo y empresa', 'warning');
      const data = Object.fromEntries(new FormData(form).entries());
      createWebLead({ ...data, message: 'Descargó la guía "10 claves para ordenar tu pipeline B2B"', interest: 'Plan Inicial' }, 'Formulario web');
      form.reset();
      form.querySelector('[data-guidemsg]').textContent = '¡Listo! Te enviamos la guía a tu correo (simulado).';
      toast('Guía enviada a tu correo', 'success');
    }
  });
}
