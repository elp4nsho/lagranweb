// Panel de la fundación: secciones con permisos por rol (admin, coordinador, contador).
import { db, auth, STAFF } from '../data/db.js';
import { mountAdmin } from '../shared/admin-kit.js';
import dashboard from './dashboard.js';
import campaigns from './campaigns.js';
import donations from './donations.js';
import donors from './donors.js';
import subscriptions from './subscriptions.js';
import volunteers from './volunteers.js';
import projects from './projects.js';
import expenses from './expenses.js';
import comms from './communications.js';
import cms from './cms.js';
import users from './users.js';
import activity from './activity.js';
import settings from './settings.js';

const sections = [dashboard, campaigns, donations, donors, subscriptions, volunteers, projects, expenses, comms, cms, users, activity, settings];

mountAdmin({
  db, auth, brand: 'Raíces del Sur', logo: '🌱', siteHref: 'index.html', siteLabel: 'Ver sitio', sections, staffRoles: STAFF,
  notifications: () => {
    const u = auth.current(); if (!u) return [];
    const can = id => { const s = sections.find(x => x.id === id); return !s.roles || s.roles.includes(u.role); };
    const out = [];
    const post = db.count('volunteers', v => v.status === 'postulante');
    if (post && can('voluntariado')) out.push({ tag: 'Voluntarios', type: 'info', text: `${post} postulación(es) por revisar`, href: '#/voluntariado' });
    const pend = db.count('expenses', x => x.status === 'pendiente');
    if (pend && can('gastos')) out.push({ tag: 'Gastos', type: 'warning', text: `${pend} gasto(s) por aprobar`, href: '#/gastos' });
    const failed = db.count('donations', d => d.status === 'rechazada' && Date.now() - new Date(d.createdAt) < 30 * 864e5);
    if (failed && can('donaciones')) out.push({ tag: 'Pagos', type: 'danger', text: `${failed} pago(s) rechazado(s) en 30 días`, href: '#/donaciones' });
    const todayKey = new Date().toISOString().slice(0, 10);
    db.query('campaigns', c => c.status === 'publicada' && c.endDate >= todayKey && (new Date(c.endDate) - Date.now()) < 15 * 864e5).forEach(c => { if (can('campanas')) out.push({ tag: 'Campaña', type: 'primary', text: `«${c.title}» termina pronto (${c.endDate})`, href: '#/campanas/' + c.id }); });
    return out;
  }
});
