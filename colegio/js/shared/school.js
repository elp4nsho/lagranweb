// Calendario escolar y constantes compartidas por todas las vistas del colegio.
const REAL = new Date();
// Año escolar chileno: marzo a diciembre. En verano se muestra el año recién terminado.
export const YEAR = REAL.getMonth() < 2 ? REAL.getFullYear() - 1 : REAL.getFullYear();
export const NOW = REAL.getMonth() < 2 ? new Date(YEAR, 11, 11, 10) : (REAL > new Date(YEAR, 11, 18) ? new Date(YEAR, 11, 18, 10) : REAL);

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
export const DAYS_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi'];
export const BLOCKS = [
  ['08:00', '09:00'], ['09:00', '10:00'], ['10:20', '11:20'],
  ['11:20', '12:20'], ['13:10', '14:10'], ['14:10', '15:10']
];
export const BREAK_AFTER = { 1: 'Recreo · 20 min', 3: 'Almuerzo · 50 min' };

export const LEVELS = { parvularia: 'Educación Parvularia', basica: 'Educación Básica', media: 'Educación Media' };
export const GRADES_APPLY = ['Pre-kínder', 'Kínder', '1° Básico', '2° Básico', '3° Básico', '4° Básico', '5° Básico', '6° Básico', '7° Básico', '8° Básico', 'I Medio', 'II Medio', 'III Medio'];

export const SUBJECT_TONES = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)', 'var(--info)', 'var(--danger)'];

export const ADM_STATUS = {
  recibida: ['Recibida', 'info'],
  revision: ['En revisión', 'warning'],
  entrevista: ['Entrevista agendada', 'primary'],
  aceptada: ['Aceptada', 'success'],
  espera: ['Lista de espera', 'warning'],
  rechazada: ['No seleccionada', 'danger'],
  matriculada: ['Matriculada', 'success']
};
export const ADM_FLOW = ['recibida', 'revision', 'entrevista', 'aceptada', 'matriculada'];

export const PAY_STATUS = { pagado: ['Pagado', 'success'], pendiente: ['Pendiente', 'warning'], vencido: ['Vencido', 'danger'], futuro: ['Por vencer', 'info'] };
export const MEET_STATUS = { solicitada: ['Solicitada', 'warning'], confirmada: ['Confirmada', 'success'], rechazada: ['Rechazada', 'danger'], realizada: ['Realizada', 'info'] };

export const ymd = d => { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const todayStr = () => ymd(NOW);
export const semesterOf = date => (new Date(date).getMonth() < 6 ? 1 : 2);
export const currentSemester = () => semesterOf(NOW);
export const isWeekday = d => { const w = new Date(d).getDay(); return w > 0 && w < 6; };
// Día escolar de referencia (si hoy es fin de semana, el viernes anterior).
export function schoolDay(d = NOW) {
  const x = new Date(d);
  while (!isWeekday(x)) x.setDate(x.getDate() - 1);
  return x;
}
export const dayIndex = d => (new Date(d).getDay() + 6) % 7; // 0 = lunes
export const monthLabel = m => new Date(m + '-15').toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
