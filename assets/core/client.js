// Configuración por cliente (clients/<slug>/client.config.js) y su aplicación en el navegador.
// La parte de arriba es PURA (la usan también build-client y supabase-schema en Node).
//
//   // clients/taller-don-lucho/client.config.js
//   export default {
//     slug: 'taller-don-lucho', app: 'taller', mode: 'production', data: 'empty',
//     brand: { name: 'Taller Don Lucho', short: 'Don Lucho', logo: '🔧', colors: { primary: '#c2410c', accent: '#0ea5e9' } },
//     theme: 'nordic', layout: 'clasica',
//     modules: ['base'],                                   // + 'agenda', 'ordenes', …
//     backend: { kind: 'local' },                          // o { kind: 'supabase', url, anonKey, bucket }
//     domain: 'www.tallerdonlucho.cl',
//     contact: { email, phone, whatsapp, address, hours, city },
//     legal: { razonSocial, rut, giro, privacyEmail },
//     seo: { title, description },
//     accounts: [{ name, email, role: 'admin', password }], // solo backend local
//     settings: { heroTitle: '…' }                         // textos iniciales del sitio
//   };

const DEFAULTS = { mode: 'production', data: 'empty', layout: 'clasica', fonts: 'google', modules: null, backend: { kind: 'local' }, contact: {}, legal: {}, seo: {}, accounts: [], settings: {} };

// Normaliza y valida. Devuelve { config, errors: [...], warnings: [...] } (no lanza).
export function defineClient(input = {}) {
  // backend puede ser un objeto o el nombre de una entrada de `backends` ({ local: {…}, supabase: {…} }).
  const be = typeof input.backend === 'string' ? (input.backends || {})[input.backend] || { kind: input.backend } : input.backend;
  const c = { ...DEFAULTS, ...input, brand: { ...(input.brand || {}) }, backend: { ...DEFAULTS.backend, ...(be || {}) } };
  const errors = [], warnings = [];
  if (!c.slug || !/^[a-z0-9][a-z0-9-]*$/.test(c.slug)) errors.push('slug: obligatorio, solo minúsculas, números y guiones');
  if (!c.app) errors.push('app: obligatorio (p. ej. "taller")');
  if (!c.brand.name) errors.push('brand.name: obligatorio');
  if (!['production', 'demo'].includes(c.mode)) errors.push('mode: "production" o "demo"');
  if (!['empty', 'demo'].includes(c.data)) errors.push('data: "empty" o "demo"');
  if (!['local', 'supabase'].includes(c.backend.kind)) errors.push('backend.kind: "local" o "supabase"');
  if (c.backend.kind === 'supabase') {
    if (!c.backend.url || !c.backend.anonKey) errors.push('backend supabase: faltan url y anonKey');
    else if (/TU-PROYECTO|REEMPLAZAR|xxxx/i.test(c.backend.url + c.backend.anonKey)) warnings.push('backend supabase: url/anonKey son marcadores; reemplázalos antes de publicar');
    if (c.accounts?.some(a => a.password)) warnings.push('accounts[].password se ignora con Supabase: los usuarios entran con su correo (contraseña de Supabase Auth o enlace mágico)');
  }
  if (c.mode === 'production' && c.backend.kind === 'local') warnings.push('modo producción con backend local: el panel guarda los datos SOLO en el navegador de quien lo usa (sirve para un sitio vitrina, no para operar con datos reales)');
  if (c.mode === 'production' && c.backend.kind === 'local' && !c.accounts?.length) warnings.push('sin accounts: nadie podrá entrar al panel (agrega al menos un admin)');
  if (c.accounts?.some(a => /cambiar|demo123|123456/i.test(a.password || ''))) warnings.push('accounts: hay contraseñas de ejemplo; cámbialas antes de entregar');
  if (c.brand.colors?.primary && !parseHex(c.brand.colors.primary)) errors.push('brand.colors.primary: usa un color hex (#rrggbb)');
  if (c.domain && /^https?:/.test(c.domain)) c.domain = c.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  c.brand.short ||= c.brand.name;
  return { config: c, errors, warnings };
}

// ---------- Colores de marca → tokens del kit ----------
function parseHex(h) { const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h || '').trim()); if (!m) return null; let s = m[1]; if (s.length === 3) s = [...s].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); }
const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(parseHex(a)), lum(parseHex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = rgb => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => hex(parseHex(a).map((v, i) => v + (parseHex(b)[i] - v) * t));
const onColor = c => (contrast(c, '#ffffff') >= contrast(c, '#111111') ? '#ffffff' : '#111111');

// CSS que pisa los tokens de color del estilo elegido con los de la marca (más específico que [data-theme]).
export function brandCss(brand = {}) {
  const { primary, accent } = brand.colors || {};
  if (!parseHex(primary) && !parseHex(accent)) return '';
  const out = [];
  if (parseHex(primary)) out.push(`--primary:${primary}`, `--primary-2:${mix(primary, '#ffffff', 0.22)}`, `--on-primary:${onColor(primary)}`);
  if (parseHex(accent)) out.push(`--accent:${accent}`, `--on-accent:${onColor(accent)}`);
  return `html[data-brand][data-theme]{${out.join(';')}}`;
}

// ---------- Navegador ----------
// Aplica marca, estilo y disposición. En un build el HTML ya trae todo fijo (data-lock); en desarrollo
// (vista previa de un cliente dentro de productos/<app>/) se aplica en caliente sin guardar.
export function applyClient(c) {
  if (typeof document === 'undefined' || !c) return;
  const root = document.documentElement;
  root.dataset.mode = c.mode;
  root.setAttribute('data-brand', '');
  const css = brandCss(c.brand);
  let st = document.querySelector('style[data-lgw-brand]');
  if (css && !st) { st = document.createElement('style'); st.setAttribute('data-lgw-brand', ''); document.head.appendChild(st); }
  if (st) st.textContent = css;
  if (!root.hasAttribute('data-lock')) {
    if (c.theme && window.LGWTheme?.use) window.LGWTheme.use(c.theme);
    if (c.layout && window.LGWLayout?.use) window.LGWLayout.use(c.layout);
  }
}

// Vista previa en desarrollo: ?cliente=<slug> carga clients/<slug>/client.config.js; ?modulos=a,b
// arma un cliente de demo con esos módulos; ?cliente= (vacío) vuelve a la demo completa. La elección se
// recuerda en sessionStorage para navegar entre páginas. build-client REEMPLAZA el archivo que llama a
// esta función por la configuración fija del cliente, así que nada de esto llega a producción.
export async function devClient({ app, clientsBase, fallback }) {
  const KEY = `lgw:preview:${app}`;
  const q = new URLSearchParams(location.search);
  let pick = null;
  try { pick = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (q.has('cliente')) pick = q.get('cliente') ? { cliente: q.get('cliente') } : null;
  if (q.has('modulos')) pick = q.get('modulos') ? { modulos: q.get('modulos') } : null;
  try { pick ? sessionStorage.setItem(KEY, JSON.stringify(pick)) : sessionStorage.removeItem(KEY); } catch (e) {}
  let cfg = { ...fallback };
  if (pick?.cliente) {
    try {
      const mod = await import(new URL(`${pick.cliente}/client.config.js`, new URL(clientsBase, location.href)).href);
      // En vista previa: datos de demo y backend local (salvo ?backend=supabase), para poder probar sin servidor.
      cfg = { ...mod.default, data: 'demo', backend: q.get('backend') === 'supabase' ? (mod.default.backends?.supabase || mod.default.backend) : { kind: 'local' }, preview: true };
    } catch (e) { console.warn('[cliente] no se pudo cargar', pick.cliente, e); }
  } else if (pick?.modulos) {
    const ids = pick.modulos.split(',').map(s => s.trim()).filter(Boolean);
    cfg = { ...fallback, slug: 'mods-' + ids.join('-'), modules: ids, preview: true };
  }
  const { config, errors } = defineClient(cfg);
  if (errors.length) console.warn('[cliente]', errors.join(' · '));
  return config;
}

// Adaptador de datos según backend. El de Supabase se carga a pedido (y build-client lo reemplaza por
// un stub en los clientes locales, para no publicar ni un byte de supabase-js si no se usa).
export async function adapterFor(backend = {}, opts = {}) {
  if (backend.kind !== 'supabase') return null; // null = local por defecto
  const { supabaseAdapter } = await import('./store/supabase.js');
  return supabaseAdapter({ ...backend, ...opts });
}
