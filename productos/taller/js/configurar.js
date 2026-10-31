// Configurador: arma un client.config.js a partir de los módulos del producto (../modules.js) y de los
// registros de estilos y disposiciones (theme-boot.js). No guarda nada en el servidor.
import { MODULES, PACKAGES } from '../modules.js';
import { resolveModules } from '../../../assets/core/modules.js';
import { escape, toast } from '../../../assets/core/ui.js';

const f = document.getElementById('f');
const themes = window.LGWTheme.list, layouts = window.LGWLayout.list;
const field = (name, label, value = '', type = 'text', extra = '') => `<div class="field"><label for="c-${name}">${label}</label><input class="input" id="c-${name}" name="${name}" type="${type}" value="${escape(value)}" ${extra}></div>`;
f.innerHTML = `
  <section class="card stack"><h3 style="margin:0">1. Paquete y módulos</h3>
    <div class="row">${PACKAGES.map(p => `<button type="button" class="btn btn-sm" data-pkg="${p.id}" title="${escape(p.desc)}">${escape(p.name)}</button>`).join('')}</div>
    <div class="stack" style="gap:8px">${MODULES.map(m => `<label class="mod" data-mod="${m.id}"><input type="checkbox" name="mod" value="${m.id}" ${m.base ? 'checked disabled' : ''}><b>${m.icon} ${escape(m.name)} <span class="badge">${escape(m.tier)}</span>${m.deps?.length ? ` <small style="display:inline">requiere ${m.deps.join(', ')}</small>` : ''}</b><small>${escape(m.description)}</small></label>`).join('')}</div></section>
  <section class="card"><h3 style="margin:0 0 10px">2. Cliente y marca</h3><div class="k-form">
    ${field('slug', 'Slug (carpeta)', 'taller-nuevo')}${field('name', 'Nombre', 'Taller Nuevo')}${field('short', 'Nombre corto', 'Nuevo')}${field('logo', 'Logo (emoji)', '🔧')}
    ${field('tagline', 'Bajada', 'Mecánica general y mantenciones')}${field('domain', 'Dominio', 'www.tallernuevo.cl')}
    ${field('primary', 'Color primario', '#2563eb', 'color')}${field('accent', 'Color de acento', '#f59e0b', 'color')}
    <div class="field"><label for="c-theme">Estilo</label><select class="select" id="c-theme" name="theme">${themes.map(t => `<option value="${t.id}" ${t.id === 'blueprint' ? 'selected' : ''}>${escape(t.name)} · ${escape(t.desc)}</option>`).join('')}</select></div>
    <div class="field"><label for="c-layout">Disposición</label><select class="select" id="c-layout" name="layout">${layouts.map(l => `<option value="${l.id}">${escape(l.name)}</option>`).join('')}</select></div>
    <label class="check"><input type="checkbox" name="usebrand" checked> Aplicar colores de marca sobre el estilo</label></div></section>
  <section class="card"><h3 style="margin:0 0 10px">3. Contacto y datos legales</h3><div class="k-form">
    ${field('email', 'Correo', 'contacto@tallernuevo.cl', 'email')}${field('phone', 'Teléfono', '+56 2 2000 0000', 'tel')}${field('whatsapp', 'WhatsApp', '+56 9 0000 0000', 'tel')}${field('address', 'Dirección', 'Av. Siempre Viva 123, Santiago')}
    ${field('hours', 'Horario', 'Lun–Vie 9:00–18:00')}${field('razon', 'Razón social', 'Taller Nuevo SpA')}${field('rut', 'RUT empresa', '76.000.000-0')}</div></section>
  <section class="card"><h3 style="margin:0 0 10px">4. Backend y primera cuenta</h3><div class="k-form">
    <div class="field"><label for="c-backend">Backend</label><select class="select" id="c-backend" name="backend"><option value="local">local (vitrina / un solo navegador)</option><option value="supabase">Supabase (datos reales, multiusuario)</option></select></div>
    ${field('sburl', 'Supabase URL', 'https://TU-PROYECTO.supabase.co')}${field('sbkey', 'Supabase anon key', 'REEMPLAZAR-anon-key')}
    ${field('admin', 'Nombre del admin', 'Administrador')}${field('adminEmail', 'Correo del admin', 'admin@tallernuevo.cl', 'email')}
    <div class="field"><label for="c-data">Datos iniciales</label><select class="select" id="c-data" name="data"><option value="empty">Vacío (solo catálogos)</option><option value="demo">Datos de demostración</option></select></div></div></section>`;

const v = () => Object.fromEntries(new FormData(f));
const chosen = () => [...f.querySelectorAll('[name=mod]:checked')].map(i => i.value);
function syncDeps() {
  const { ids, added } = resolveModules(MODULES, chosen());
  f.querySelectorAll('[name=mod]').forEach(i => { if (ids.includes(i.value)) i.checked = true; i.closest('.mod').classList.toggle('dep', added.includes(i.value)); });
}
function render() {
  syncDeps();
  const x = v(), mods = chosen().filter(id => !MODULES.find(m => m.id === id).base);
  const backend = x.backend === 'supabase' ? `'supabase',\n  backends: {\n    local: { kind: 'local' },\n    supabase: { kind: 'supabase', url: ${JSON.stringify(x.sburl)}, anonKey: ${JSON.stringify(x.sbkey)}, bucket: 'archivos' }\n  }` : `{ kind: 'local' }`;
  const cfg = `// Generado con productos/taller/configurar.html
export default {
  slug: ${JSON.stringify(x.slug)},
  app: 'taller',
  mode: 'production',
  data: ${JSON.stringify(x.data)},
  brand: {
    name: ${JSON.stringify(x.name)}, short: ${JSON.stringify(x.short)}, logo: ${JSON.stringify(x.logo)},
    tagline: ${JSON.stringify(x.tagline)}${x.usebrand ? `,\n    colors: { primary: '${x.primary}', accent: '${x.accent}' }` : ''}
  },
  theme: '${x.theme}',
  layout: '${x.layout}',
  modules: ${JSON.stringify(mods.length ? mods : ['base'])},
  backend: ${backend},
  domain: ${JSON.stringify(x.domain)},
  contact: { email: ${JSON.stringify(x.email)}, phone: ${JSON.stringify(x.phone)}, whatsapp: ${JSON.stringify(x.whatsapp)}, address: ${JSON.stringify(x.address)}, hours: ${JSON.stringify(x.hours)} },
  legal: { razonSocial: ${JSON.stringify(x.razon)}, rut: ${JSON.stringify(x.rut)}, privacyEmail: ${JSON.stringify(x.email)} },
  seo: { title: ${JSON.stringify(`${x.name} · ${x.tagline}`)}, description: ${JSON.stringify(`${x.name}: ${x.tagline}.`)} },
  accounts: [{ name: ${JSON.stringify(x.admin)}, email: ${JSON.stringify(x.adminEmail)}, role: 'admin'${x.backend === 'local' ? ", password: 'CAMBIAR-esta-clave'" : ''} }]
};
`;
  document.getElementById('out').textContent = cfg;
  document.getElementById('cmd').textContent = `mkdir -p clients/${x.slug}   # y guarda ahí client.config.js\nnode tools/build-client.mjs ${x.slug}${x.backend === 'supabase' ? ` --backend=supabase\nnode tools/supabase-schema.mjs ${x.slug}\nnode tools/supabase-import.mjs ${x.slug}` : ''}\nnode tools/serve-dist.mjs dist/${x.slug}${x.backend === 'supabase' ? '-supabase' : ''}`;
  document.getElementById('prev').href = `index.html?modulos=${(mods.length ? mods : ['base']).join(',')}`;
  return cfg;
}
f.addEventListener('input', render); f.addEventListener('change', render);
f.addEventListener('click', e => { const b = e.target.closest('[data-pkg]'); if (!b) return; const p = PACKAGES.find(x => x.id === b.dataset.pkg); f.querySelectorAll('[name=mod]').forEach(i => { if (!i.disabled) i.checked = p.modules.includes(i.value); }); render(); });
document.getElementById('copy').onclick = () => navigator.clipboard.writeText(render()).then(() => toast('Copiado', 'success'), () => toast('No se pudo copiar', 'warning'));
document.getElementById('dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([render()], { type: 'text/javascript' })); a.download = 'client.config.js'; a.click(); };
render();
