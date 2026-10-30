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

export function createAuth(db, { roles = {}, collection = 'users' } = {}) {
  const key = `lgw:session:${db.name}`;
  const read = () => { try { return localStorage.getItem(key); } catch (e) { return sessionMem; } };
  const write = v => { try { v ? localStorage.setItem(key, v) : localStorage.removeItem(key); } catch (e) { sessionMem = v; } };
  let sessionMem = null;

  const auth = {
    roles,
    roleName: r => roles[r] || r,
    current() {
      const id = read();
      return id ? db.get(collection, id) : null;
    },
    is(...rs) { const u = auth.current(); return !!u && rs.flat().includes(u.role); },
    async login(email, password) {
      return api(() => {
        const u = db.find(collection, x => x.email.toLowerCase() === String(email).trim().toLowerCase());
        if (!u || u.password !== password) throw new Error('Correo o contraseña incorrectos');
        if (u.active === false) throw new Error('Esta cuenta está desactivada');
        write(u.id);
        db.log('login', `${u.name} inició sesión`, u.id);
        return u;
      }, { latency: [300, 700] });
    },
    async register({ name, email, password, role = 'customer', ...rest }) {
      return api(() => {
        if (db.find(collection, x => x.email.toLowerCase() === email.toLowerCase())) throw new Error('Ese correo ya está registrado');
        const u = db.insert(collection, { name, email, password, role, active: true, ...rest });
        write(u.id);
        db.log('register', `Nueva cuenta: ${name}`, u.id);
        return u;
      });
    },
    loginAs(id) { write(id); return auth.current(); },
    logout() { const u = auth.current(); if (u) db.log('logout', `${u.name} cerró sesión`, u.id); write(null); },
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
    // Lista de cuentas de prueba para entrar con un clic.
    mountDemoLogin(el, { filter = () => true, onLogin } = {}) {
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
