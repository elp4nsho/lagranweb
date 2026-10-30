// Datos semilla de Academia Faro (marketplace de cursos ficticio).
import { rng } from '../../../assets/core/db.js';

const DAY = 864e5;
const iso = t => new Date(t).toISOString();
const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const LEVELS = ['Principiante', 'Intermedio', 'Avanzado'];
export const TONES = ['primary', 'accent', 'success', 'info', 'warning', 'danger'];

const CATS = [
  ['programacion', 'Programación', '💻'], ['diseno', 'Diseño', '🎨'], ['negocios', 'Negocios', '📈'], ['marketing', 'Marketing', '📣'],
  ['datos', 'Datos', '📊'], ['fotografia', 'Fotografía', '📷'], ['idiomas', 'Idiomas', '🗣️'], ['bienestar', 'Bienestar', '🌿']
];

const INSTRUCTORS = [
  ['i-diego', 'Diego Fuentes', 'instructor@faro.cl', 'Desarrollador full stack · 12 años enseñando código', '#ea580c', 'programacion'],
  ['i-valeria', 'Valeria Rojas', 'valeria@faro.cl', 'Diseñadora UX/UI en estudios de Santiago y Lima', '#db2777', 'diseno'],
  ['i-tomas', 'Tomás Herrera', 'tomas@faro.cl', 'Ingeniero comercial y fundador de tres pymes', '#2563eb', 'negocios'],
  ['i-camila', 'Camila Pizarro', 'camila@faro.cl', 'Estratega de marketing digital para marcas chilenas', '#7c3aed', 'marketing'],
  ['i-ignacio', 'Ignacio Vega', 'ignacio@faro.cl', 'Científico de datos · Magíster en Estadística', '#0891b2', 'datos'],
  ['i-fernanda', 'Fernanda Lagos', 'fernanda@faro.cl', 'Fotógrafa documental y editora', '#16a34a', 'fotografia'],
  ['i-martina', 'Martina Silva', 'martina@faro.cl', 'Profesora de idiomas certificada (CELTA)', '#ca8a04', 'idiomas'],
  ['i-josefa', 'Josefa Araya', 'josefa@faro.cl', 'Instructora de yoga y nutricionista', '#0d9488', 'bienestar']
];

// [titulo, subtítulo, cat, instructor, nivel, precio, oferta, emoji, keywords[4], estado]
const COURSES = [
  ['Python desde cero', 'Aprende a programar con el lenguaje más amigable del mundo', 'programacion', 'i-diego', 0, 29990, 19990, '🐍', ['Variables y tipos de datos', 'Condicionales y ciclos', 'Funciones y módulos', 'Automatiza una planilla'], 'publicado'],
  ['JavaScript moderno', 'ES2024 explicado con ejemplos reales del día a día', 'programacion', 'i-diego', 1, 34990, 0, '⚡', ['Arrow functions y destructuring', 'Promesas y async/await', 'Módulos ES', 'Consume una API pública'], 'publicado'],
  ['React para principiantes', 'Construye interfaces con componentes, estado y hooks', 'programacion', 'i-diego', 1, 39990, 29990, '⚛️', ['Componentes y props', 'useState y useEffect', 'Rutas y formularios', 'Despliega tu app'], 'publicado'],
  ['APIs con Node.js', 'Diseña y publica una API REST segura', 'programacion', 'i-diego', 2, 44990, 0, '🟢', ['Express y rutas', 'Bases de datos y modelos', 'Autenticación con tokens', 'Pruebas y despliegue'], 'publicado'],
  ['Diseño UX/UI práctico', 'Investiga, prototipa y valida productos digitales', 'diseno', 'i-valeria', 0, 32990, 0, '🧭', ['Entrevistas a usuarios', 'Arquitectura de información', 'Wireframes', 'Pruebas de usabilidad'], 'publicado'],
  ['Figma de cero a pro', 'Domina componentes, variantes y prototipos', 'diseno', 'i-valeria', 1, 27990, 19990, '🖌️', ['Frames y auto layout', 'Componentes y variantes', 'Sistemas de diseño', 'Prototipos interactivos'], 'publicado'],
  ['Ilustración digital', 'Crea personajes y escenas con tu tablet', 'diseno', 'i-valeria', 0, 24990, 0, '✏️', ['Formas básicas', 'Color y luz', 'Texturas', 'Tu primer personaje'], 'publicado'],
  ['Emprende tu negocio online', 'Del modelo de negocio a tus primeras ventas', 'negocios', 'i-tomas', 0, 0, 0, '🚀', ['Lienzo de modelo de negocio', 'Validación con clientes', 'Precios y costos', 'Tu tienda en una semana'], 'publicado'],
  ['Finanzas personales para todos', 'Presupuesto, ahorro e inversión sin enredos', 'negocios', 'i-tomas', 0, 19990, 14990, '💰', ['Presupuesto 50/30/20', 'Deudas inteligentes', 'Fondos mutuos y APV', 'Plan a 5 años'], 'publicado'],
  ['Excel para la gestión', 'Tablas dinámicas, fórmulas y dashboards', 'negocios', 'i-tomas', 1, 24990, 0, '📗', ['BUSCARX y SI', 'Tablas dinámicas', 'Gráficos efectivos', 'Dashboard de ventas'], 'publicado'],
  ['Marketing digital 360', 'Estrategia completa para pymes chilenas', 'marketing', 'i-camila', 0, 34990, 24990, '🎯', ['Buyer persona', 'Embudo de conversión', 'Email marketing', 'Medición con KPIs'], 'publicado'],
  ['Instagram para emprendedores', 'Contenido que vende sin perder tu estilo', 'marketing', 'i-camila', 0, 17990, 0, '📱', ['Perfil que convierte', 'Reels y carruseles', 'Calendario de contenido', 'Publicidad básica'], 'publicado'],
  ['SEO práctico', 'Posiciona tu sitio en Google paso a paso', 'marketing', 'i-camila', 1, 29990, 0, '🔎', ['Investigación de palabras clave', 'SEO on-page', 'Enlaces y autoridad', 'Search Console'], 'publicado'],
  ['Análisis de datos con Power BI', 'De la planilla al dashboard interactivo', 'datos', 'i-ignacio', 1, 39990, 32990, '📊', ['Power Query', 'Modelo de datos', 'Medidas DAX', 'Publica tu informe'], 'publicado'],
  ['SQL para análisis', 'Consulta bases de datos como un profesional', 'datos', 'i-ignacio', 0, 29990, 0, '🗄️', ['SELECT y WHERE', 'JOIN entre tablas', 'Agregaciones', 'Funciones de ventana'], 'publicado'],
  ['Machine Learning básico', 'Modelos predictivos con Python y scikit-learn', 'datos', 'i-ignacio', 2, 49990, 0, '🤖', ['Regresión lineal', 'Clasificación', 'Validación cruzada', 'Proyecto de predicción'], 'publicado'],
  ['Fotografía con tu celular', 'Fotos increíbles con lo que ya tienes en el bolsillo', 'fotografia', 'i-fernanda', 0, 14990, 9990, '📸', ['Composición', 'Luz natural', 'Retratos', 'Edición en el teléfono'], 'publicado'],
  ['Edición en Lightroom', 'Flujo de trabajo y revelado profesional', 'fotografia', 'i-fernanda', 1, 27990, 0, '🌄', ['Catálogo y organización', 'Revelado básico', 'Ajustes locales', 'Presets propios'], 'publicado'],
  ['Inglés para el trabajo', 'Reuniones, correos y entrevistas con confianza', 'idiomas', 'i-martina', 1, 32990, 0, '🇬🇧', ['Small talk', 'Correos profesionales', 'Presentaciones', 'Entrevistas laborales'], 'publicado'],
  ['Portugués inicial', 'Comunícate en tu próximo viaje a Brasil', 'idiomas', 'i-martina', 0, 19990, 0, '🇧🇷', ['Saludos y presentaciones', 'Pronunciación', 'En el restaurante', 'De viaje'], 'publicado'],
  ['Mindfulness en 21 días', 'Una práctica breve diaria para vivir con más calma', 'bienestar', 'i-josefa', 0, 0, 0, '🧘', ['Respiración consciente', 'Escaneo corporal', 'Atención plena al comer', 'Hábito sostenible'], 'publicado'],
  ['Cocina saludable chilena', 'Recetas de siempre, más livianas y ricas', 'bienestar', 'i-josefa', 0, 15990, 0, '🥗', ['Despensa saludable', 'Legumbres al día', 'Postres sin azúcar', 'Menú semanal'], 'publicado'],
  ['Yoga para la oficina', 'Alivia espalda y cuello en 10 minutos', 'bienestar', 'i-josefa', 0, 12990, 0, '🪑', ['Postura y respiración', 'Cuello y hombros', 'Espalda baja', 'Rutina de pausa activa'], 'publicado'],
  ['TypeScript sin miedo', 'Tipos que te ayudan en vez de estorbar', 'programacion', 'i-diego', 1, 34990, 0, '🔷', ['Tipos básicos', 'Interfaces y genéricos', 'Configuración del proyecto', 'Migra un proyecto JS'], 'borrador'],
  ['Crea tu propio podcast', 'Graba, edita y publica tu primer episodio', 'marketing', 'i-camila', 0, 22990, 0, '🎙️', ['Formato y guion', 'Grabación en casa', 'Edición de audio', 'Distribución en plataformas'], 'revision'],
  ['Excel avanzado: macros y VBA', 'Automatiza tareas repetitivas en minutos', 'negocios', 'i-tomas', 2, 36990, 0, '🧮', ['Grabadora de macros', 'Variables y ciclos en VBA', 'Formularios', 'Automatiza un reporte'], 'revision']
];

const OTHER_KW = COURSES.flatMap(c => c[8]);

function curriculum(r, title, kw, courseIdx) {
  let n = 0;
  const L = (t, type, minutes, extra = {}) => ({ id: `l${courseIdx}-${n++}`, title: t, type, minutes, preview: false, resources: [], ...extra });
  const quiz = (count) => Array.from({ length: count }, (_, i) => {
    const right = kw[(i + courseIdx) % 4];
    const wrong = []; while (wrong.length < 3) { const w = r.pick(OTHER_KW); if (!kw.includes(w) && !wrong.includes(w)) wrong.push(w); }
    const opts = [...wrong]; const at = r.int(0, 3); opts.splice(at, 0, right);
    return { q: `¿Cuál de estos temas forma parte de «${title}»?`, options: opts, answer: at };
  });
  return [
    { id: `s${courseIdx}-0`, title: 'Bienvenida e introducción', lessons: [L('Bienvenida al curso', 'video', 3, { preview: true }), L('Cómo aprovechar este curso', 'lectura', 4, { preview: true }), L('Herramientas que usaremos', 'video', 6, { resources: [{ name: 'Guía de instalación.pdf', size: '1,2 MB' }] })] },
    { id: `s${courseIdx}-1`, title: 'Fundamentos', lessons: [L('Conceptos clave', 'video', 8), L(kw[0], 'video', r.int(7, 14)), L(kw[1], 'video', r.int(8, 16), { resources: [{ name: `Apuntes - ${kw[1]}.pdf`, size: '840 KB' }] }), L('Quiz: fundamentos', 'quiz', 5, { quiz: quiz(3) })] },
    { id: `s${courseIdx}-2`, title: 'Manos a la obra', lessons: [L(kw[2], 'video', r.int(9, 18)), L(kw[3], 'video', r.int(10, 20)), L('Material descargable', 'lectura', 5, { resources: [{ name: 'Plantillas del curso.zip', size: '4,6 MB' }, { name: 'Checklist.pdf', size: '320 KB' }] }), L('Tarea: tu primer proyecto', 'tarea', 30)] },
    { id: `s${courseIdx}-3`, title: 'Proyecto final y cierre', lessons: [L('Proyecto guiado paso a paso', 'video', r.int(15, 25)), L('Errores comunes y cómo evitarlos', 'video', 9), L('Quiz final', 'quiz', 8, { quiz: quiz(4) }), L('Próximos pasos', 'lectura', 3)] }
  ];
}

const FIRST = ['Sofía', 'Mateo', 'Isidora', 'Agustín', 'Florencia', 'Benjamín', 'Emilia', 'Lucas', 'Josefina', 'Martín', 'Antonella', 'Vicente', 'Trinidad', 'Joaquín', 'Amanda', 'Maximiliano', 'Renata', 'Tomás', 'Julieta', 'Gaspar', 'Catalina', 'Facundo', 'Maite', 'León', 'Javiera', 'Cristóbal', 'Rafaela', 'Bastián', 'Laura', 'Alonso'];
const LAST = ['Muñoz', 'González', 'Rojas', 'Díaz', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'López', 'Fuentes', 'Torres', 'Araya', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Carrasco', 'Cortés', 'Núñez'];
const COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#16a34a', '#ea580c', '#2563eb', '#db2777', '#0d9488', '#ca8a04', '#4f46e5'];
const REVIEWS = {
  5: ['Excelente curso, muy claro y práctico. Lo recomiendo 100%.', 'El profe explica increíble, aprendí muchísimo en pocas semanas.', 'Justo lo que necesitaba para mi trabajo. Los ejercicios son buenísimos.', 'Muy completo y bien estructurado. Ya estoy aplicando lo aprendido.', '¡Me encantó! Los proyectos hacen toda la diferencia.'],
  4: ['Muy buen curso, aunque algunas lecciones podrían ser más cortas.', 'Buen contenido y material descargable útil. Faltó un poco más de práctica.', 'Recomendado. Algunas partes van rápido pero se puede repetir.', 'Bien explicado, me sirvió para ordenar mis ideas.'],
  3: ['Correcto, pero esperaba más ejemplos avanzados.', 'El contenido está bien, el audio de algunas clases se escucha bajo.'],
  2: ['Me pareció muy básico para el precio.'],
  1: ['No era lo que esperaba, el nivel no corresponde a la descripción.']
};
const QUESTIONS = [
  ['No me funciona el ejemplo de la lección', 'Seguí los pasos pero me aparece un error al final. ¿Alguien más tuvo este problema?'],
  ['¿Dónde descargo el material?', 'No encuentro el archivo de recursos que se menciona en el video.'],
  ['Duda sobre el ejercicio', '¿El ejercicio se puede resolver de otra forma o tiene que ser exactamente como en el video?'],
  ['¿Recomiendas algún libro complementario?', 'Me gustaría profundizar más en este tema. ¿Qué lectura recomiendas?'],
  ['¿El certificado tiene validez?', '¿Puedo agregar el certificado a mi perfil de LinkedIn?'],
  ['Consulta sobre la tarea', '¿Cuál es el formato esperado para entregar la tarea?']
];
const ANSWERS = ['¡Buena pregunta! Revisa el minuto 4 del video: ahí explico ese paso con más detalle.', 'Ya subí el archivo a la sección de recursos de la lección. ¡Gracias por avisar!', 'Sí, hay varias formas válidas. Lo importante es que el resultado sea el mismo.', 'Te recomiendo la documentación oficial y practicar con proyectos pequeños.', 'Sí, el certificado incluye un código verificable que puedes compartir.'];

export function seed() {
  const r = rng(7);
  const now = Date.now();
  const categories = CATS.map(([id, name, icon], i) => ({ id: 'c-' + id, slug: id, name, icon, tone: TONES[i % TONES.length], active: true, description: `Cursos de ${name.toLowerCase()} creados por especialistas.` }));
  const users = [
    { id: 'u-admin', name: 'Ana Torres', email: 'admin@faro.cl', password: 'admin123', role: 'admin', color: '#7c3aed', demo: true, active: true, createdAt: iso(now - 500 * DAY) },
    { id: 'u-soporte', name: 'Pablo Reyes', email: 'soporte@faro.cl', password: 'sop123', role: 'soporte', color: '#0891b2', demo: true, active: true, createdAt: iso(now - 420 * DAY) },
    ...INSTRUCTORS.map(([id, name, email, headline, color, cat], i) => ({ id, name, email, password: 'inst123', role: 'instructor', color, demo: i === 0, active: true, headline, bio: `${headline}. Ha formado a miles de estudiantes en Latinoamérica con un enfoque práctico, cercano y basado en proyectos reales.`, specialty: 'c-' + cat, payoutMethod: 'Transferencia · Banco Estado', createdAt: iso(now - (480 - i * 20) * DAY) })),
    { id: 'u-sofia', name: 'Sofía Muñoz', email: 'estudiante@faro.cl', password: 'est123', role: 'estudiante', color: '#e11d48', demo: true, active: true, city: 'Valparaíso', createdAt: iso(now - 200 * DAY) }
  ];
  for (let i = 0; i < 90; i++) {
    const name = `${r.pick(FIRST)} ${r.pick(LAST)}`;
    users.push({ id: 's' + i, name, email: `${slugify(name).replace('-', '.')}${i}@correo.cl`, password: 'est123', role: 'estudiante', color: COLORS[i % COLORS.length], active: r() > 0.03, city: r.pick(['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Temuco', 'Antofagasta', 'Puerto Montt', 'Rancagua']), createdAt: iso(now - r.int(5, 330) * DAY) });
  }

  const courses = COURSES.map(([title, subtitle, cat, inst, lvl, price, sale, emoji, kw, status], i) => {
    const sections = curriculum(r, title, kw, i);
    const minutes = sections.flatMap(s => s.lessons).reduce((t, l) => t + l.minutes, 0);
    const created = now - r.int(150, 420) * DAY;
    return {
      id: 'k' + i, slug: slugify(title), title, subtitle, categoryId: 'c-' + cat, instructorId: inst, level: LEVELS[lvl], price, salePrice: sale || null, emoji, tone: TONES[i % TONES.length],
      description: `${subtitle}. En este curso avanzarás paso a paso, con lecciones breves, ejercicios prácticos y un proyecto final que podrás mostrar. Incluye material descargable, quizzes para medir tu avance y certificado verificable al terminar.`,
      learn: kw.concat(['Aplicar lo aprendido en un proyecto real', 'Resolver problemas frecuentes con confianza']),
      requirements: lvl === 0 ? ['No necesitas experiencia previa', 'Un computador con conexión a internet'] : ['Conocimientos básicos del área', 'Ganas de practicar'],
      language: 'Español', minutes, sections, status, featured: [0, 4, 8, 13, 16, 20].includes(i),
      createdAt: iso(created), publishedAt: status === 'publicado' ? iso(created + 10 * DAY) : null, submittedAt: status === 'revision' ? iso(now - r.int(1, 4) * DAY) : null
    };
  });
  const published = courses.filter(c => c.status === 'publicado');
  const priceOf = c => c.salePrice || c.price;

  const coupons = [
    { id: 'cp1', code: 'BIENVENIDA', type: 'pct', value: 20, minTotal: 0, uses: 41, maxUses: 500, expiresAt: iso(now + 90 * DAY), active: true, description: '20% en tu primera compra' },
    { id: 'cp2', code: 'FARO10', type: 'monto', value: 10000, minTotal: 30000, uses: 18, maxUses: 200, expiresAt: iso(now + 30 * DAY), active: true, description: '$10.000 en compras sobre $30.000' },
    { id: 'cp3', code: 'CYBER50', type: 'pct', value: 50, minTotal: 0, uses: 120, maxUses: 120, expiresAt: iso(now - 20 * DAY), active: false, description: 'Cyber Day (finalizado)' },
    { id: 'cp4', code: 'PYTHON', type: 'pct', value: 30, minTotal: 0, uses: 9, maxUses: 100, expiresAt: iso(now + 60 * DAY), active: true, courseId: 'k0', description: '30% en Python desde cero' }
  ];

  const orders = [], enrollments = [], reviews = [], questions = [], certificates = [], activity = [], notifications = [];
  const students = users.filter(u => u.role === 'estudiante' && u.id !== 'u-sofia');
  const enrolled = new Set();
  const lessonsOf = c => c.sections.flatMap(s => s.lessons);
  const certCode = () => 'FARO-' + Math.floor(r() * 36 ** 6).toString(36).toUpperCase().padStart(6, '0');
  const enroll = (u, c, orderId, at, pct) => {
    const ls = lessonsOf(c), k = Math.round(ls.length * pct);
    const progress = Object.fromEntries(ls.slice(0, k).map(l => [l.id, true]));
    const e = { id: `e-${u.id}-${c.id}`, userId: u.id, courseId: c.id, orderId, enrolledAt: iso(at), progress, lastLessonId: ls[Math.min(k, ls.length - 1)].id, notes: {}, quizScores: {}, assignments: {}, lastActivityAt: iso(Math.min(now - 3600e3, at + r.int(1, 40) * DAY)) };
    if (k >= ls.length) { e.completedAt = iso(Math.min(now - 3600e3, at + r.int(10, 60) * DAY)); certificates.push({ id: 'cert-' + e.id, code: certCode(), userId: u.id, courseId: c.id, issuedAt: e.completedAt }); }
    ls.slice(0, k).filter(l => l.type === 'quiz').forEach(l => { e.quizScores[l.id] = r.pick([67, 75, 100, 100]); });
    enrollments.push(e); enrolled.add(`${u.id}|${c.id}`);
    return e;
  };

  let on = 1000;
  for (let i = 0; i < 340; i++) {
    const u = r.pick(students);
    // Más ventas en meses recientes
    const age = Math.floor(Math.pow(r(), 1.6) * 300) + 1;
    const at = now - age * DAY - r.int(0, 20) * 36e5;
    const n = r() < 0.2 ? 2 : 1;
    const items = [];
    for (let k = 0; k < n; k++) { const c = r() < 0.35 ? r.pick(published.filter(x => x.featured)) : r.pick(published); if (!enrolled.has(`${u.id}|${c.id}`) && !items.find(x => x.courseId === c.id)) items.push({ courseId: c.id, price: priceOf(c), title: c.title }); }
    if (!items.length) continue;
    const subtotal = items.reduce((t, x) => t + x.price, 0);
    const cp = subtotal > 0 && r() < 0.18 ? (r() < 0.6 ? coupons[0] : coupons[1].minTotal <= subtotal ? coupons[1] : coupons[0]) : null;
    const discount = cp ? (cp.type === 'pct' ? Math.round(subtotal * cp.value / 100) : Math.min(subtotal, cp.value)) : 0;
    const roll = r();
    const status = subtotal === 0 ? 'pagado' : roll < 0.04 ? 'reembolsado' : roll < 0.06 && age < 12 ? 'reembolso_solicitado' : roll < 0.08 ? 'fallido' : 'pagado';
    const o = { id: 'o' + i, number: on++, userId: u.id, items, subtotal, discount, total: subtotal - discount, couponCode: cp?.code || null, status, method: subtotal === 0 ? 'Gratis' : r.pick(['Tarjeta de crédito', 'Tarjeta de crédito', 'Webpay', 'Transferencia']), createdAt: iso(at) };
    if (status === 'reembolsado') { o.refundReason = r.pick(['El curso no cumplió mis expectativas', 'Compra duplicada', 'Problemas técnicos']); o.refundedAt = iso(at + 3 * DAY); }
    if (status === 'reembolso_solicitado') o.refundReason = r.pick(['El nivel es muy básico para mí', 'Me equivoqué de curso', 'No tengo tiempo para hacerlo']);
    orders.push(o);
    if (status === 'pagado' || status === 'reembolso_solicitado') items.forEach(x => {
      const c = courses.find(cc => cc.id === x.courseId);
      const pct = age > 60 ? (r() < 0.5 ? 1 : r()) : r() * (age / 60);
      const e = enroll(u, c, o.id, at, Math.min(1, pct));
      const done = Object.keys(e.progress).length / lessonsOf(c).length;
      if (done > 0.3 && r() < 0.55) {
        const rating = r() < 0.55 ? 5 : r() < 0.75 ? 4 : r() < 0.7 ? 3 : r() < 0.6 ? 2 : 1;
        reviews.push({ id: `rv-${e.id}`, courseId: c.id, userId: u.id, rating, text: r.pick(REVIEWS[rating]), status: r() < 0.05 ? 'pendiente' : 'publicada', reported: rating <= 2 && r() < 0.5, createdAt: iso(Math.min(now - 3600e3, at + r.int(5, 50) * DAY)) });
      }
      if (r() < 0.12) {
        const [t, b] = r.pick(QUESTIONS), ls = lessonsOf(c), l = r.pick(ls.slice(0, Math.max(1, Object.keys(e.progress).length)));
        const qa = { id: `q-${e.id}`, courseId: c.id, lessonId: l.id, userId: u.id, title: t, body: b, createdAt: iso(Math.min(now - 7200e3, at + r.int(1, 20) * DAY)), answers: [], resolved: false };
        if (r() < 0.65) { qa.answers.push({ userId: c.instructorId, body: r.pick(ANSWERS), at: iso(new Date(qa.createdAt).getTime() + r.int(2, 48) * 36e5), instructor: true }); qa.resolved = r() < 0.8; }
        questions.push(qa);
      }
    });
  }

  // Sofía (estudiante demo)
  const sofia = users.find(u => u.id === 'u-sofia');
  const sOrders = [[['k0', 'k17'], 120], [['k10'], 40], [['k20'], 18], [['k14'], 3]];
  sOrders.forEach(([ids, age], i) => {
    const at = now - age * DAY;
    const items = ids.map(id => { const c = courses.find(x => x.id === id); return { courseId: id, price: priceOf(c), title: c.title }; });
    const subtotal = items.reduce((t, x) => t + x.price, 0);
    const o = { id: 'o-sofia-' + i, number: on++, userId: 'u-sofia', items, subtotal, discount: i === 0 ? Math.round(subtotal * 0.2) : 0, couponCode: i === 0 ? 'BIENVENIDA' : null, status: 'pagado', method: subtotal ? 'Tarjeta de crédito' : 'Gratis', createdAt: iso(at) };
    o.total = o.subtotal - o.discount;
    orders.push(o);
    items.forEach(x => { const c = courses.find(cc => cc.id === x.courseId); enroll(sofia, c, o.id, at, { k0: 1, k17: 0.5, k10: 0.7, k20: 0.36, k14: 0.07 }[c.id]); });
  });
  const eSof = enrollments.find(e => e.id === 'e-u-sofia-k10');
  eSof.notes = { 'l10-4': 'Embudo: atracción → consideración → conversión → fidelización. Revisar métricas de cada etapa.' };
  eSof.lastActivityAt = iso(now - 3 * 36e5);
  reviews.push({ id: 'rv-sofia', courseId: 'k0', userId: 'u-sofia', rating: 5, text: 'Nunca había programado y terminé automatizando planillas de mi trabajo. ¡Gracias Diego!', status: 'publicada', createdAt: iso(now - 70 * DAY) });
  questions.push({ id: 'q-sofia', courseId: 'k10', lessonId: 'l10-5', userId: 'u-sofia', title: '¿Cuántos correos por semana recomiendas?', body: 'Para una tienda pequeña, ¿cuál es una buena frecuencia de envío sin cansar a los suscriptores?', createdAt: iso(now - 2 * DAY), answers: [], resolved: false });
  for (let d = 0; d < 6; d++) activity.push({ userId: 'u-sofia', date: new Date(now - d * DAY).toISOString().slice(0, 10), minutes: r.int(12, 45) });
  [9, 10, 14, 15, 16, 22, 30].forEach(d => activity.push({ userId: 'u-sofia', date: new Date(now - d * DAY).toISOString().slice(0, 10), minutes: r.int(10, 30) }));
  notifications.push(
    { userId: 'u-sofia', title: '¡Nuevo curso de tu instructora favorita!', text: 'Camila Pizarro está preparando «Crea tu propio podcast».', at: iso(now - DAY), read: false, kind: 'info' },
    { userId: 'i-diego', title: 'Nueva pregunta en Python desde cero', text: 'Tienes preguntas sin responder de tus estudiantes.', at: iso(now - 5 * 36e5), read: false, kind: 'warning' }
  );

  // Pagos a instructores: meses cerrados pagados, mes anterior pendiente.
  const payouts = [];
  const share = 0.7;
  for (let m = 1; m <= 9; m++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    INSTRUCTORS.forEach(([id]) => {
      const amount = Math.round(orders.filter(o => o.status === 'pagado' && o.createdAt.slice(0, 7) === period).flatMap(o => o.items.map(x => ({ ...x, f: o.total / (o.subtotal || 1) }))).filter(x => courses.find(c => c.id === x.courseId).instructorId === id).reduce((t, x) => t + x.price * x.f * share, 0));
      if (amount > 0) payouts.push({ id: `po-${id}-${period}`, instructorId: id, period, amount, status: m === 1 ? 'pendiente' : 'pagado', paidAt: m === 1 ? null : iso(new Date(d.getFullYear(), d.getMonth() + 1, 10).getTime()), method: 'Transferencia' });
    });
  }

  return { categories, users, courses, coupons, orders, enrollments, reviews, questions, certificates, activity, notifications, payouts, site: { ...SITE_DEFAULT } };
}

export const SITE_DEFAULT = {
  heroEyebrow: 'Aprende con quienes saben hacer',
  heroTitle: 'Ilumina tu próximo',
  heroHighlight: 'paso profesional',
  heroText: 'Cursos online prácticos, en español y hechos en Chile. Aprende a tu ritmo, con proyectos reales y certificado verificable.',
  ctaText: 'Explorar cursos',
  announcementOn: true,
  announcement: 'Usa el cupón BIENVENIDA y obtén 20% de descuento en tu primera compra.',
  banners: [
    { id: 'b1', title: 'Semana de la programación', text: 'Python, JavaScript y React con hasta 35% de descuento.', cta: 'Ver cursos', href: '#/cursos?cat=programacion', tone: 'primary', active: true },
    { id: 'b2', title: 'Enseña en Academia Faro', text: 'Comparte lo que sabes y gana el 70% de cada venta.', cta: 'Postular como instructor', href: 'login.html', tone: 'accent', active: true },
    { id: 'b3', title: 'Cursos gratuitos', text: 'Empieza hoy con Mindfulness o Emprende tu negocio online.', cta: 'Ver gratuitos', href: '#/cursos?precio=gratis', tone: 'success', active: true }
  ],
  featuredIds: ['k0', 'k4', 'k8', 'k13', 'k16', 'k20'],
  commission: 30,
  refundDays: 14,
  supportEmail: 'ayuda@academiafaro.cl'
};
