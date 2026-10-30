// Sitio público de empleos: inicio, vacantes con filtros, detalle + postulación y estado.
import { db, auth } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { mountTopbar } from '../shared/topnav.js';
import * as home from './home.js';
import * as jobs from './jobs.js';
import * as job from './job.js';
import * as status from './status.js';

const view = document.getElementById('view');
const ctx = { db, auth, go: p => router.go(p), get site() { return db.getValue('site', {}); } };
const top = mountTopbar(document.getElementById('topbar'), { auth, links: [{ href: '#/', label: 'Inicio' }, { href: '#/empleos', label: 'Empleos' }, { href: '#/estado', label: 'Estado de postulación' }] });
let active = null;
const show = (mod, params = {}, query = {}) => { active = { mod, params, query }; mod.render(view, ctx, params, query); top.redraw(); router.highlight(document.getElementById('topbar')); if (!query.keep) window.scrollTo(0, 0); };
const router = createRouter({
  '/': () => show(home), '/empleos': (p, q) => show(jobs, p, q), '/empleos/:id': p => show(job, p), '/estado': (p, q) => show(status, p, q)
}, { notFound: () => router.go('/') });
db.subscribe(() => { if (!active || document.querySelector('.modal-backdrop')) return; const ae = document.activeElement; if (ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && view.contains(ae)) return; active.mod.render(view, ctx, active.params, { ...active.query, keep: 1 }); });
router.start();
