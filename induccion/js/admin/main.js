// Panel de administración (admin y prevencionista). Cada sección vive en su propio módulo.
import { mountShell, activitySection } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { assignmentStatus, certStatus } from '../data/model.js';
import { renderDashboard } from './dashboard.js';
import { renderLearners, renderLearner } from './learners.js';
import { renderCompanies } from './companies.js';
import { renderPlans, renderPlanEditor } from './plans.js';
import { renderModules, renderModuleEditor } from './modules.js';
import { renderQuestions } from './questions.js';
import { renderAssignments } from './assignments.js';
import { renderEvaluations } from './evaluations.js';
import { renderCertificates } from './certificates.js';
import { renderReports } from './reports.js';
import { renderUsers } from './users.js';
import { renderSettings } from './settings.js';

const STAFF = ['admin', 'prevencionista'];
const ADMIN = ['admin'];
mountShell({
  db, auth, brand: 'Inducción XR', logo: '⛰', allow: STAFF,
  links: [{ href: 'index.html', label: 'Ver sitio público', ico: '🌐', blank: true }, { href: 'verificar.html', label: 'Verificador público', ico: '✔', blank: true }],
  sections: [
    { group: 'General', path: '/', label: 'Dashboard', ico: '📊', routes: { '/': renderDashboard } },
    { group: 'Personas', path: '/trabajadores', label: 'Trabajadores', ico: '👷', routes: { '/trabajadores': renderLearners, '/trabajadores/:id': renderLearner } },
    { group: 'Personas', path: '/empresas', label: 'Empresas contratistas', ico: '🏢', routes: { '/empresas': renderCompanies } },
    { group: 'Contenido', path: '/planes', label: 'Planes de inducción', ico: '🗂', routes: { '/planes': renderPlans, '/planes/:id': renderPlanEditor } },
    { group: 'Contenido', path: '/modulos', label: 'Módulos 3D', ico: '🧊', routes: { '/modulos': renderModules, '/modulos/:id': renderModuleEditor } },
    { group: 'Contenido', path: '/preguntas', label: 'Banco de preguntas', ico: '❓', routes: { '/preguntas': renderQuestions } },
    { group: 'Seguimiento', path: '/asignaciones', label: 'Asignaciones', ico: '📌', count: () => db.count('assignments', a => assignmentStatus(a) === 'vencida'), routes: { '/asignaciones': renderAssignments } },
    { group: 'Seguimiento', path: '/evaluaciones', label: 'Evaluaciones', ico: '📝', count: () => db.count('assignments', a => a.practical?.status === 'pendiente'), routes: { '/evaluaciones': renderEvaluations } },
    { group: 'Seguimiento', path: '/certificados', label: 'Certificados', ico: '📜', count: () => db.count('certificates', c => certStatus(c) === 'por_vencer'), routes: { '/certificados': renderCertificates } },
    { group: 'Seguimiento', path: '/reportes', label: 'Reportes', ico: '📈', routes: { '/reportes': renderReports } },
    { group: 'Sistema', path: '/usuarios', label: 'Usuarios y roles', ico: '🔐', roles: ADMIN, routes: { '/usuarios': renderUsers } },
    { group: 'Sistema', path: '/configuracion', label: 'Sitio y configuración', ico: '⚙', roles: ADMIN, routes: { '/configuracion': renderSettings } },
    { group: 'Sistema', path: '/actividad', label: 'Bitácora', ico: '🕑', routes: { '/actividad': activitySection } }
  ]
});
