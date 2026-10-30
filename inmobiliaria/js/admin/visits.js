// Visitas (admin): todas las visitas de todos los corredores.
import { renderVisitsView } from '../shared/visitcal.js';
export const renderVisits = (el, p, q, ctx) => renderVisitsView(el, ctx, { title: 'Visitas' });
