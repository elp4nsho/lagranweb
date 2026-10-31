// Autenticación simulada con roles. Los usuarios viven en la colección `users` de la DB
// de la app: { id, name, email, password, role, avatar? }.
//
//   import { createAuth } from '../../assets/core/auth.js';
//   export const auth = createAuth(db, { roles: { admin: 'Administrador', editor: 'Editor', customer: 'Cliente' } });
//   auth.login(email, pass) → user | throws
//   auth.require(['admin', 'editor'], 'login.html')   // protege páginas del panel
//   auth.mountDemoLogin(el, { onLogin })               // botones "entrar como…"

import { api } from './db.js';
import { escape } from './ui.js';

// auth.require() corta la ejecución lanzando 'auth-redirect' mientras redirige al login;
// no es un error real, así que no lo dejamos llegar a la consola.
const isRedirect = r => r && (r === 'auth-redirect' || r.message === 'auth-redirect');
window.addEventListener('error', e => { if (isRedirect(e.error)) e.preventDefault(); });
window.addEventListener('unhandledrejection', e => { if (isRedirect(e.reason)) e.preventDefault(); });

// Proveedor remoto (opcional): si el adaptador de la base trae `auth` (store/supabase.js), la sesión
// la maneja el backend (Supabase Auth: correo + contraseña o enlace mágico) y `current()` devuelve el
// perfil de `users` cuyo `authId` es el usuario autenticado. Sin proveedor: sesión simulada en localStorage.
//   provider = { session() → { id, email } | null, signIn(email, pass), magicLink(email, { redirectTo }),
//                signUp(email, pass, meta), signOut(), capabilities: { password, magicLink, register } }
export function createAuth(db, { roles = {}, collection = 'users', provider = null, demo = true } = {}) {
  const remote = provider || db.adapter?.auth || null;
  const key = `lgw:session:${db.name}`;
  const read = () => { try { return localStorage.getItem(key); } catch (e) { return sessionMem; } };
  const write = v => { try { v ? localStorage.setItem(key, v) : localStorage.removeItem(key); } catch (e) { sessionMem = v; } };
  let sessionMem = null;
  const byEmail = email => db.find(collection, x => String(x.email || '').toLowerCase() === String(email).trim().toLowerCase());

  const auth = {
    roles,
    remote: !!remote,
    // Qué ofrece el login: contraseña siempre; enlace mágico solo con backend; demo solo en modo demo local.
    capabilities: { password: true, magicLink: !!remote?.capabilities?.magicLink, register: true, demo: demo && !remote },
    roleName: r => roles[r] || r,
    current() {
      if (remote) {
        const s = remote.session();
        return s ? db.find(collection, u => u.authId === s.id) || null : null;
      }
      const id = read();
      return id ? db.get(collection, id) : null;
    },
    is(...rs) { const u = auth.current(); return !!u && rs.flat().includes(u.role); },
    async login(email, password) {
      if (remote) {
        await remote.signIn(String(email).trim(), password);
        await db.refresh(); // con sesión, RLS deja ver otras filas
        const u = auth.current();
        if (!u) { await remote.signOut(); throw new Error('Tu cuenta no tiene acceso a este sistema. Pide a un administrador que te invite.'); }
        if (u.active === false) { await remote.signOut(); throw new Error('Esta cuenta está desactivada'); }
        db.log('login', `${u.name} inició sesión`, u.id);
        return u;
      }
      return api(() => {
        const u = byEmail(email);
        if (!u || u.password !== password) throw new Error('Correo o contraseña incorrectos');
        if (u.active === false) throw new Error('Esta cuenta está desactivada');
        write(u.id);
        db.log('login', `${u.name} inició sesión`, u.id);
        return u;
      }, { latency: [300, 700] });
    },
    // Enlace mágico por correo (solo con backend). redirectTo = página a la que vuelve (login.html?next=…).
    async magicLink(email, { redirectTo } = {}) {
      if (!remote?.magicLink) throw new Error('El acceso por enlace requiere el backend Supabase');
      await remote.magicLink(String(email).trim(), { redirectTo });
      return true;
    },
    async register({ name, email, password, role = 'customer', ...rest }) {
      if (remote) {
        // El perfil (y el registro ligado, p. ej. el cliente) lo crea el trigger lgw_handle_new_user en la base.
        await remote.signUp(String(email).trim(), password, { name, ...rest });
        await db.refresh();
        const u = auth.current();
        if (!u) throw new Error('Revisa tu correo para confirmar la cuenta y luego ingresa.');
        return u;
      }
      return api(() => {
        if (byEmail(email)) throw new Error('Ese correo ya está registrado');
        const u = db.insert(collection, { name, email, password, role, active: true, ...rest });
        write(u.id);
        db.log('register', `Nueva cuenta: ${name}`, u.id);
        return u;
      });
    },
    loginAs(id) { if (remote) throw new Error('loginAs no existe con backend remoto'); write(id); return auth.current(); },
    logout() {
      const u = auth.current();
      if (u) db.log('logout', `${u.name} cerró sesión`, u.id);
      if (remote) remote.signOut(); else write(null);
    },
    // Redirige si no hay sesión o el rol no está permitido. Devuelve el usuario.
    require(allowed, redirect = 'login.html') {
      const u = auth.current();
      if (!u || (allowed && !allowed.includes(u.role))) {
        const back = encodeURIComponent(location.pathname.split('/').pop() + location.hash);
        location.replace(`${redirect}${redirect.includes('?') ? '&' : '?'}next=${back}`);
        throw new Error('auth-redirect');
      }
      return u;
    },
    // Lista de cuentas de prueba para entrar con un clic (nada en producción ni con backend remoto).
    mountDemoLogin(el, { filter = () => true, onLogin } = {}) {
      if (!auth.capabilities.demo) { el.hidden = true; return; }
      const users = db.query(collection, u => u.demo && filter(u));
      el.classList.add('demo-accounts');
      el.innerHTML = users.map(u => `
        <button type="button" class="demo-account" data-id="${u.id}">
          <span class="avatar" style="--av:${u.color || 'var(--primary)'}">${escape(initials(u.name))}</span>
          <span><b>${escape(u.name)}</b><small>${escape(auth.roleName(u.role))} · ${escape(u.email)} · clave: ${escape(u.password)}</small></span>
        </button>`).join('');
      el.addEventListener('click', e => {
        const b = e.target.closest('.demo-account');
        if (!b) return;
        const u = auth.loginAs(b.dataset.id);
        db.log('login', `${u.name} inició sesión (demo)`, u.id);
        onLogin ? onLogin(u) : location.reload();
      });
    }
  };
  return auth;
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
