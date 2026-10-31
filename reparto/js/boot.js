// Arranque común de todas las páginas: renueva la demo si los datos son de otro día y mantiene viva
// la simulación de los conductores (una "jugada" al cargar y cada 20 s).
import { ensureFreshDay, tick } from './ops.js';

ensureFreshDay();
tick();
setInterval(() => { if (!document.hidden) tick(); }, 20000);
