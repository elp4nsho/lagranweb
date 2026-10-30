// Datos semilla de Estudio Nébula (reproducibles con rng).
import { rng } from '../../../assets/core/db.js';
import { slug } from '../../../assets/core/ui.js';

const DAY = 864e5;
const iso = (daysAgo, r) => new Date(Date.now() - daysAgo * DAY - (r ? r() * DAY * .9 : 0)).toISOString();

export function seed() {
  const r = rng(2014);

  const users = [
    { id: 'u-admin', name: 'Camila Rojas', email: 'admin@nebula.cl', password: 'admin123', role: 'admin', color: '#c8102e', title: 'Directora creativa', demo: true, active: true, lastLogin: iso(0, r) },
    { id: 'u-editor', name: 'Tomás Vidal', email: 'editor@nebula.cl', password: 'editor123', role: 'editor', color: '#1d3557', title: 'Editor de contenidos', demo: true, active: true, lastLogin: iso(1, r) },
    { id: 'u-sales', name: 'Antonia Muñoz', email: 'ventas@nebula.cl', password: 'ventas123', role: 'sales', color: '#2d6a4f', title: 'Ejecutiva comercial', demo: true, active: true, lastLogin: iso(0, r) },
    { id: 'u-4', name: 'Ignacio Pérez', email: 'ignacio@nebula.cl', password: 'nebula2026', role: 'editor', color: '#7c3aed', title: 'Motion & 3D', active: true, lastLogin: iso(6, r) },
    { id: 'u-5', name: 'Florencia Díaz', email: 'florencia@nebula.cl', password: 'nebula2026', role: 'sales', color: '#b5651d', title: 'Cuentas', active: true, lastLogin: iso(3, r) },
    { id: 'u-6', name: 'Rodrigo Lagos', email: 'rodrigo@nebula.cl', password: 'nebula2026', role: 'editor', color: '#475569', title: 'Ex-practicante', active: false, lastLogin: iso(120, r) }
  ];

  const settings = {
    name: 'Estudio Nébula', tagline: 'Estudio creativo independiente', founded: 2014,
    email: 'hola@estudionebula.cl', phone: '+56 32 245 8810', whatsapp: '+56 9 8765 4321',
    address: 'Templeman 412, Cerro Alegre, Valparaíso', hours: 'Lun a vie, 9:00–18:00',
    social: { instagram: '@estudionebula', linkedin: 'estudio-nebula', behance: 'estudionebula', dribbble: 'nebula' },
    seo: { title: 'Estudio Nébula · Branding, producto digital y motion en Valparaíso', description: 'Estudio creativo independiente de branding, diseño web y motion. Estrategia afilada y diseño con oficio desde Valparaíso para el mundo.', keywords: 'branding, diseño web, motion, agencia creativa, Valparaíso, Chile' },
    announcement: { on: true, text: 'Nuevo: lanzamos nuestro programa de branding para pymes con 20% de descuento hasta diciembre.' },
    maintenance: false,
    pricing: {
      currency: 'CLP',
      sizes: { s: { label: 'Pequeño', mult: 1 }, m: { label: 'Mediano', mult: 1.6 }, l: { label: 'Grande', mult: 2.5 } },
      rush: 0.25,
      extras: [
        { id: 'copy', label: 'Redacción de contenidos', price: 650000 },
        { id: 'foto', label: 'Sesión fotográfica', price: 900000 },
        { id: 'mant', label: 'Mantención 6 meses', price: 1200000 },
        { id: 'capac', label: 'Capacitación al equipo', price: 380000 }
      ]
    }
  };

  const home = {
    hero: {
      eyebrow: 'Estudio creativo independiente · desde 2014',
      title: 'Hacemos marcas que se sienten',
      words: ['inevitables.', 'memorables.', 'humanas.', 'valientes.'],
      lead: 'Branding, producto digital y motion para equipos que quieren dejar huella. Estrategia afilada, diseño con oficio y una obsesión sana por los detalles.',
      ctaPrimary: 'Cotizar un proyecto', ctaSecondary: 'Ver trabajos'
    },
    stats: [
      { label: 'proyectos lanzados', value: 148, suffix: '+' },
      { label: 'años de oficio', value: 12, suffix: '' },
      { label: 'clientes que repiten', value: 97, suffix: '%' },
      { label: 'premios de diseño', value: 23, suffix: '' }
    ],
    about: {
      title: 'Un equipo pequeño con ambición grande',
      text: 'Somos diseñadoras, estrategas, desarrolladores y animadores trabajando desde Valparaíso para el mundo. Creemos en equipos compactos, conversaciones honestas y en que el buen diseño es, sobre todo, una forma de pensar.\n\nNo tenemos capas de cuentas ni intermediarios: hablas directamente con quienes hacen el trabajo.'
    },
    process: [
      { title: 'Descubrir', text: 'Entrevistas, auditoría y workshop para entender el negocio, la audiencia y el contexto.', duration: '1–2 semanas' },
      { title: 'Definir', text: 'Estrategia, posicionamiento y un brief creativo que todos firmamos con entusiasmo.', duration: '1 semana' },
      { title: 'Diseñar', text: 'Exploramos rutas, prototipamos y refinamos contigo en sesiones semanales.', duration: '3–6 semanas' },
      { title: 'Lanzar y crecer', text: 'Entregables, guías, desarrollo y acompañamiento post-lanzamiento para medir y mejorar.', duration: 'Continuo' }
    ],
    cta: { title: '¿Tienes una idea? Hagámosla real.', text: 'Cuéntanos sobre tu proyecto y te respondemos en menos de 48 horas hábiles.' },
    sections: { services: true, stats: true, work: true, about: true, process: true, testimonials: true, clients: true, blog: true, cta: true }
  };

  const services = [
    { id: 'sv-estr', title: 'Estrategia de marca', icon: '◎', desc: 'Investigación, posicionamiento, naming y arquitectura de marca para decidir con claridad.', tags: ['Workshops', 'Naming', 'Tono de voz'], basePrice: 2800000, order: 1, active: true },
    { id: 'sv-id', title: 'Identidad visual', icon: '◆', desc: 'Logotipos, sistemas tipográficos, paletas y guías que escalan desde una tarjeta hasta un edificio.', tags: ['Logo', 'Sistema', 'Brandbook'], basePrice: 3500000, order: 2, active: true },
    { id: 'sv-web', title: 'Diseño web y producto', icon: '▣', desc: 'Sitios y apps rápidos, accesibles y medibles. Del prototipo al lanzamiento con nuestro equipo dev.', tags: ['UX/UI', 'Desarrollo', 'Design systems'], basePrice: 5200000, order: 3, active: true },
    { id: 'sv-motion', title: 'Motion y contenido', icon: '◐', desc: 'Animación de marca, video corto y piezas para redes que mueven a la gente (literalmente).', tags: ['Motion', '3D', 'Social'], basePrice: 2400000, order: 4, active: true },
    { id: 'sv-pack', title: 'Packaging', icon: '⬡', desc: 'Envases que se ven bien en góndola, se sienten bien en la mano y cuidan el planeta.', tags: ['Estructural', 'Ilustración', 'Producción'], basePrice: 3100000, order: 5, active: true },
    { id: 'sv-cons', title: 'Consultoría de diseño', icon: '✦', desc: 'Acompañamos a equipos internos para ordenar procesos, sistemas y criterios de diseño.', tags: ['Mentorías', 'Auditoría', 'DesignOps'], basePrice: 1800000, order: 6, active: false }
  ];

  const categories = [
    { id: 'branding', name: 'Branding' }, { id: 'web', name: 'Web y producto' }, { id: 'motion', name: 'Motion' },
    { id: 'packaging', name: 'Packaging' }, { id: 'estrategia', name: 'Estrategia' }
  ];

  const PROJ = [
    ['Lumbre Café', 'Lumbre Café', 'branding', 'Identidad cálida para una tostaduría de especialidad que quería salir del cliché del café artesanal.', '☕'],
    ['Altamira Bank', 'Altamira Bank', 'web', 'Design system y sitio transaccional para un banco digital que habla como persona.', '🏦'],
    ['Festival Órbita', 'Festival Órbita', 'motion', 'Campaña animada y piezas sociales para el festival de música electrónica más grande del sur.', '🎛'],
    ['Verdeo', 'Verdeo Alimentos', 'branding', 'Naming e identidad para una marca de snacks vegetales con ambición regional.', '🌿'],
    ['Kumo Labs', 'Kumo Labs', 'web', 'Producto SaaS de analítica climática: UX de dashboards y marketing site.', '☁'],
    ['Ferromar', 'Ferromar Logística', 'motion', 'Identidad animada para una naviera centenaria que se reinventa.', '⚓'],
    ['Cerro Pantera', 'Viña Cerro Pantera', 'packaging', 'Etiquetas ilustradas para una línea de vinos de autor del Valle de Casablanca.', '🍷'],
    ['Mutual Sur', 'Mutual Sur', 'estrategia', 'Replanteamiento de marca y arquitectura de servicios para una mutual de salud.', '✚'],
    ['Pliegue', 'Editorial Pliegue', 'branding', 'Sistema gráfico flexible para una editorial independiente de poesía.', '📖'],
    ['Andes Outdoor', 'Andes Outdoor', 'web', 'E-commerce headless con contenido editorial para equipamiento de montaña.', '⛰'],
    ['Museo Mareas', 'Museo de las Mareas', 'motion', 'Piezas audiovisuales y señalética animada para un museo marítimo.', '🌊'],
    ['Taller Brote', 'Taller Brote', 'packaging', 'Packaging compostable para cosmética natural hecha a mano.', '🌱'],
    ['Quanta Energía', 'Quanta Energía', 'estrategia', 'Estrategia de marca empleadora y tono de voz para una energética solar.', '☀'],
    ['Rumbo App', 'Rumbo Movilidad', 'web', 'App de movilidad urbana: research, prototipos y diseño de interfaz.', '🚲'],
    ['Copihue Studio', 'Copihue Studio', 'branding', 'Rebranding para un estudio de animación con 20 años de historia.', '🌺'],
    ['Liga Puerto', 'Liga Puerto Básquetbol', 'motion', 'Gráfica de transmisión y openers para la liga regional de básquetbol.', '🏀'],
    ['Nido Coliving', 'Nido Coliving', 'branding', 'Marca, señalética y sitio para espacios de coliving en Santiago y Valparaíso.', '🏠'],
    ['Faro Datos', 'Fundación Faro', 'web', 'Plataforma de datos abiertos con visualizaciones para periodistas.', '📊']
  ];
  const cats = ['branding', 'web', 'motion', 'packaging', 'estrategia'];
  const svcByCat = { branding: ['Estrategia de marca', 'Identidad visual'], web: ['Diseño web y producto'], motion: ['Motion y contenido'], packaging: ['Packaging', 'Identidad visual'], estrategia: ['Estrategia de marca', 'Consultoría de diseño'] };
  const projects = PROJ.map(([title, client, category, summary, icon], i) => {
    const pal = ['primary', 'accent', 'info', 'success', 'warning', 'danger'];
    const c1 = pal[i % 6], c2 = pal[(i + 2) % 6];
    const shapes = ['orbit', 'grid', 'wave', 'blob', 'stripes', 'stack', 'sun', 'mesh'];
    return {
      id: 'p-' + slug(title), slug: slug(title), title, client, category, icon, summary,
      year: 2026 - Math.floor(i / 4), featured: i < 6, published: i !== 15, order: i + 1,
      services: svcByCat[category] || [],
      challenge: `${client} llegó con una pregunta clara: cómo destacar en un mercado saturado sin perder la esencia que los hizo crecer. Tenían una base de clientes fiel, pero su comunicación se había vuelto genérica y difícil de reconocer.`,
      solution: `Trabajamos en tres etapas: investigación con clientes y equipo interno, una plataforma estratégica con un concepto rector, y un sistema visual modular que el equipo de ${client} puede usar sin depender de nosotros. Cada decisión se probó en contexto real antes de cerrarla.`,
      results: [
        { label: 'Aumento en consultas', value: `+${r.int(30, 180)}%` },
        { label: 'Reconocimiento de marca', value: `${r.int(2, 4)}x` },
        { label: 'Semanas de proyecto', value: String(r.int(6, 16)) }
      ],
      tags: [svcByCat[category][0], r.pick(['Workshop', 'Ilustración', 'Tipografía', 'UX research', 'Animación 2D', '3D', 'Señalética', 'Fotografía'])],
      art: { c1, c2, shape: shapes[i % shapes.length], seed: i + 3 },
      gallery: [0, 1, 2, 3].map(g => ({ c1: pal[(i + g) % 6], c2: pal[(i + g + 3) % 6], shape: shapes[(i + g + 2) % shapes.length], seed: i * 10 + g, caption: ['Sistema de identidad', 'Aplicaciones', 'Detalle tipográfico', 'Piezas digitales'][g] })),
      createdAt: iso(20 + i * 18, r)
    };
  });

  const team = [
    ['Camila Rojas', 'Directora creativa', 'Diseñadora con 15 años liderando marcas en Chile y España. Fan de la tipografía y del mar.', ['Dirección de arte', 'Branding'], 'primary'],
    ['Tomás Vidal', 'Estrategia', 'Sociólogo convertido en estratega. Hace las preguntas incómodas que ordenan todo lo demás.', ['Investigación', 'Naming'], 'accent'],
    ['Antonia Muñoz', 'Diseño de producto', 'Diseña interfaces que la gente entiende a la primera. Ex-fintech, hoy obsesionada con la accesibilidad.', ['UX/UI', 'Design systems'], 'info'],
    ['Ignacio Pérez', 'Motion & 3D', 'Anima todo lo que se queda quieto. Viene del cine de animación y del VJing.', ['Motion', '3D'], 'success'],
    ['Florencia Díaz', 'Directora de cuentas', 'Se asegura de que los proyectos lleguen a tiempo y que nadie pierda el humor en el camino.', ['Gestión', 'Producción'], 'warning'],
    ['Matías Herrera', 'Desarrollo front-end', 'Convierte diseños en sitios rápidos y accesibles. Escribe CSS por placer.', ['Front-end', 'Performance'], 'danger'],
    ['Josefa Araya', 'Ilustración', 'Ilustradora y muralista. Sus personajes viven en etiquetas, muros y pantallas.', ['Ilustración', 'Packaging'], 'primary'],
    ['Benjamín Castro', 'Copywriter', 'Encuentra la palabra justa (y la cambia tres veces). Escribe tonos de voz y titulares.', ['Redacción', 'Tono de voz'], 'accent']
  ].map(([name, role, bio, skills, color], i) => ({ id: 't-' + slug(name), name, role, bio, skills, color, order: i + 1, active: true, linkedin: slug(name) }));

  const testimonials = [
    ['Nébula entendió nuestro negocio mejor que nosotros mismos. La nueva marca duplicó las consultas en tres meses.', 'Lucía Gaete', 'Fundadora', 'Lumbre Café', 'p-lumbre-cafe'],
    ['Rigurosos, rápidos y encantadores. Nuestro design system por fin habla un solo idioma en todo el producto.', 'Martín Soto', 'Head of Product', 'Altamira Bank', 'p-altamira-bank'],
    ['La campaña animada fue lo más compartido del festival. Volveremos a trabajar con ellos cada año.', 'Renata Fuentes', 'Directora', 'Festival Órbita', 'p-festival-orbita'],
    ['Nos ayudaron a nombrar algo que llevábamos años sin poder explicar. El naming fue un antes y un después.', 'Diego Carrasco', 'Gerente general', 'Verdeo Alimentos', 'p-verdeo'],
    ['Un equipo que escucha, propone y no tiene miedo de decirte que no. Justo lo que necesitábamos.', 'Paula Navarro', 'CMO', 'Kumo Labs', 'p-kumo-labs'],
    ['Las etiquetas se agotaron antes que el vino. Literal.', 'Andrés Bustos', 'Enólogo', 'Viña Cerro Pantera', 'p-cerro-pantera'],
    ['Profesionales, cercanos y muy buenos para bajar ideas complejas a algo simple.', 'Carolina Ibáñez', 'Directora de personas', 'Quanta Energía', 'p-quanta-energia'],
    ['El sitio carga rapidísimo y nuestras ventas online crecieron 40% en el primer trimestre.', 'Felipe Moraga', 'E-commerce manager', 'Andes Outdoor', 'p-andes-outdoor']
  ].map(([quote, author, role, company, projectId], i) => ({ id: 'tm-' + (i + 1), quote, author, role, company, projectId, rating: i === 6 ? 4 : 5, published: i !== 7 || true, order: i + 1 }));
  testimonials[6].published = false;

  const clients = ['Ferromar', 'Lumbre Café', 'Altamira Bank', 'Kumo Labs', 'Verdeo', 'Mutual Sur', 'Andes Outdoor', 'Quanta', 'Museo Mareas', 'Pliegue', 'Rumbo', 'Nido'].map((name, i) => ({ id: 'c-' + (i + 1), name, active: true, order: i + 1 }));

  // Blog / noticias
  const POSTS = [
    ['Por qué tu marca necesita un tono de voz (y cómo encontrarlo)', 'Estrategia', 'Una guía práctica para definir cómo habla tu marca, con ejercicios que usamos en nuestros workshops.'],
    ['Ganamos dos premios en la Bienal de Diseño', 'Noticias', 'Altamira Bank y Festival Órbita fueron reconocidos en las categorías de producto digital y motion.'],
    ['Design systems para equipos pequeños', 'Producto', 'No necesitas un equipo de 20 personas para tener un sistema de diseño útil. Te contamos cómo partir.'],
    ['Cinco errores comunes al hacer un rebranding', 'Branding', 'Cambiar de marca es emocionante, pero también riesgoso. Estos son los tropiezos que más vemos.'],
    ['Motion en la marca: más que logos que se mueven', 'Motion', 'La animación define personalidad. Así diseñamos principios de movimiento para nuestros clientes.'],
    ['Abrimos nuestra oficina en Santiago', 'Noticias', 'Después de 12 años en Valparaíso, sumamos un espacio en Barrio Italia para estar más cerca de nuestros clientes.'],
    ['Accesibilidad: el diseño que incluye vende más', 'Producto', 'Contraste, foco, lectores de pantalla: lo que todo sitio debería cumplir y por qué conviene.'],
    ['Packaging sustentable sin perder encanto', 'Packaging', 'Materiales compostables, tintas vegetales y estructuras inteligentes que cuidan el planeta.'],
    ['Cómo preparamos un workshop de marca', 'Estrategia', 'Agenda, dinámicas y materiales: abrimos la caja de herramientas de nuestro proceso de descubrimiento.'],
    ['Tipografía chilena que nos inspira', 'Branding', 'Un recorrido por fundiciones y diseñadores locales que están haciendo historia.'],
    ['Buscamos nuevos talentos para 2027', 'Noticias', 'Abrimos postulaciones para diseño de producto, motion y desarrollo front-end.'],
    ['Del brief al lanzamiento: anatomía de un proyecto web', 'Producto', 'Semana a semana, así se ve un proyecto de sitio web en Nébula.']
  ];
  const posts = POSTS.map(([title, category, excerpt], i) => ({
    id: 'b-' + (i + 1), slug: slug(title), title, category, excerpt,
    body: [
      excerpt,
      'En Nébula creemos que el buen diseño parte por las preguntas correctas. Antes de abrir cualquier programa, pasamos tiempo con los equipos, escuchamos a sus clientes y revisamos lo que ya existe. Esa etapa, que muchas veces se salta, es la que define si un proyecto funciona o no.',
      'Lo segundo es tener criterios compartidos. Un sistema —de marca, de producto o de contenido— no es un PDF bonito: es un acuerdo sobre cómo tomar decisiones. Cuando el equipo entiende el porqué, las piezas se vuelven consistentes casi solas.',
      'Por último, medimos. Cada lanzamiento viene con indicadores simples que revisamos a los 30, 60 y 90 días. Así aprendemos qué funciona y ajustamos sin dramas.',
      '¿Te interesa profundizar? Escríbenos y conversemos sobre cómo aplicar esto en tu organización.'
    ],
    authorId: team[i % team.length].id,
    status: i === 11 ? 'draft' : 'published', featured: i === 0 || i === 2,
    tags: [category.toLowerCase(), r.pick(['proceso', 'equipo', 'premios', 'tips', 'casos'])],
    readMin: r.int(3, 9), views: r.int(120, 4200),
    art: { c1: ['primary', 'accent', 'info', 'success'][i % 4], c2: ['warning', 'primary', 'danger', 'accent'][i % 4], shape: ['wave', 'orbit', 'grid', 'blob', 'sun', 'stack'][i % 6], seed: 40 + i },
    publishedAt: iso(4 + i * 13, r), createdAt: iso(6 + i * 13, r)
  }));

  const jobs = [
    { id: 'j-1', title: 'Diseñador/a de producto senior', area: 'Producto', location: 'Valparaíso', modality: 'Híbrido', type: 'Jornada completa', salary: '$2.400.000 – $3.000.000', status: 'open', description: 'Buscamos a alguien que lidere proyectos de UX/UI de punta a punta, desde la investigación hasta el handoff con desarrollo.', requirements: ['5+ años diseñando productos digitales', 'Portafolio con casos de proceso', 'Experiencia con design systems', 'Inglés intermedio'] },
    { id: 'j-2', title: 'Animador/a motion 2D', area: 'Motion', location: 'Remoto (Chile)', modality: 'Remoto', type: 'Jornada completa', salary: '$1.700.000 – $2.200.000', status: 'open', description: 'Te sumarás al equipo de motion para crear identidades animadas, piezas sociales y gráfica de transmisión.', requirements: ['After Effects avanzado', 'Nociones de 3D (Blender o C4D)', 'Reel actualizado', 'Atención al detalle'] },
    { id: 'j-3', title: 'Desarrollador/a front-end', area: 'Tecnología', location: 'Santiago', modality: 'Híbrido', type: 'Jornada completa', salary: '$2.000.000 – $2.700.000', status: 'open', description: 'Construirás sitios rápidos y accesibles junto al equipo de diseño. Valoramos el CSS bien escrito.', requirements: ['HTML, CSS y JavaScript sólidos', 'Experiencia con accesibilidad web', 'Git y buenas prácticas', 'Deseable: frameworks modernos'] },
    { id: 'j-4', title: 'Práctica profesional en diseño', area: 'Branding', location: 'Valparaíso', modality: 'Presencial', type: 'Práctica', salary: 'Asignación $450.000', status: 'open', description: 'Práctica de 4 meses acompañando proyectos de identidad y packaging.', requirements: ['Estudiante de último año de diseño', 'Ganas de aprender', 'Manejo de Illustrator e InDesign'] },
    { id: 'j-5', title: 'Ejecutivo/a de cuentas', area: 'Comercial', location: 'Santiago', modality: 'Híbrido', type: 'Jornada completa', salary: '$1.600.000 – $2.000.000 + bonos', status: 'closed', description: 'Gestionarás la relación con clientes y la planificación de proyectos.', requirements: ['3+ años en agencia', 'Excelente comunicación', 'Organización impecable'] },
    { id: 'j-6', title: 'Copywriter freelance', area: 'Contenido', location: 'Remoto', modality: 'Remoto', type: 'Freelance', salary: 'Por proyecto', status: 'draft', description: 'Redacción de tonos de voz, sitios web y campañas.', requirements: ['Portafolio de redacción', 'Ortografía impecable'] }
  ].map((j, i) => ({ ...j, slug: slug(j.title), createdAt: iso(10 + i * 9, r) }));

  const FIRST = ['Valentina', 'Martina', 'Sofía', 'Isidora', 'Catalina', 'Javiera', 'Fernanda', 'Constanza', 'Agustina', 'Trinidad', 'Benjamín', 'Vicente', 'Joaquín', 'Matías', 'Cristóbal', 'Sebastián', 'Felipe', 'Diego', 'Nicolás', 'Maximiliano', 'Gabriel', 'Emilia', 'Florencia', 'Amanda'];
  const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez'];
  const person = () => `${r.pick(FIRST)} ${r.pick(LAST)}`;
  const mail = (n, dom) => `${slug(n).replace('-', '.')}@${dom}`;

  const APP_ST = ['nuevo', 'revision', 'entrevista', 'oferta', 'descartado'];
  const applications = Array.from({ length: 42 }, (_, i) => {
    const job = jobs[r.int(0, 4)], name = person(), days = r.int(0, 80);
    const status = days < 5 ? 'nuevo' : r.pick(APP_ST);
    return {
      id: 'a-' + (i + 1), jobId: job.id, name, email: mail(name, r.pick(['gmail.com', 'outlook.com', 'correo.cl'])), phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`,
      portfolio: `behance.net/${slug(name)}`, message: r.pick(['Me encanta el trabajo de Nébula hace años, sería un sueño sumarme al equipo.', 'Adjunto mi portafolio con proyectos recientes. Disponibilidad inmediata.', 'Vengo del mundo editorial y quiero dar el salto a producto digital.', 'Tengo experiencia en agencias de Santiago y me interesa mucho la cultura de estudio pequeño.']),
      status, rating: r.int(0, 5), notes: status !== 'nuevo' ? [{ at: iso(days - 1 > 0 ? days - 1 : 0, r), user: 'u-admin', text: r.pick(['Buen portafolio, agendar llamada.', 'Revisar referencias.', 'Perfil más junior de lo esperado.', 'Excelente fit cultural.']) }] : [],
      createdAt: iso(days, r)
    };
  });

  const LEAD_ST = ['nuevo', 'contactado', 'propuesta', 'negociacion', 'ganado', 'perdido'];
  const COMP = ['Panadería Las Rosas', 'Clínica Dental Sonríe', 'Constructora Pacífico', 'Cervecería Bahía', 'Fundación Aprende', 'Transportes Ruta 5', 'Hotel Brisa Marina', 'Inmobiliaria Altos', 'Estudio Jurídico Prat', 'Café del Puerto', 'Startup Lince', 'Colegio Los Aromos', 'Tienda Telar', 'Agrícola Del Valle', 'Gimnasio Pulso', 'Librería Andén', 'Fintech Monedo', 'Pastelería Dulce Ola', 'Galería Arte Sur', 'Veterinaria Huellas'];
  const leads = Array.from({ length: 64 }, (_, i) => {
    const days = Math.floor(Math.pow(r(), 1.3) * 180), name = person(), company = r.pick(COMP);
    const type = r.bool(.55) ? 'cotizacion' : 'contacto';
    const svc = r.pick(services.slice(0, 5));
    const est = type === 'cotizacion' ? Math.round(svc.basePrice * r.pick([1, 1.6, 2.5]) * (1 + r() * .4) / 10000) * 10000 : 0;
    let status = days < 6 ? r.pick(['nuevo', 'nuevo', 'contactado']) : days < 30 ? r.pick(['contactado', 'propuesta', 'negociacion', 'ganado', 'ganado', 'perdido']) : r.pick(['ganado', 'perdido', 'ganado', 'propuesta', 'negociacion']);
    return {
      id: 'l-' + (i + 1), type, name, email: mail(name, slug(company).split('-')[0] + '.cl'), phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`,
      company, services: [svc.title], budget: type === 'cotizacion' ? '' : r.pick(['< $5M', '$5M – $15M', '> $15M']),
      estimate: est, value: est || r.int(15, 120) * 100000, size: r.pick(['s', 'm', 'l']), rush: r.bool(.2), timeline: r.pick(['1 mes', '2–3 meses', 'Sin apuro']),
      message: r.pick(['Queremos renovar nuestra marca para el aniversario de 20 años.', 'Necesitamos un sitio web nuevo que convierta mejor.', 'Buscamos una agencia para una campaña de lanzamiento en redes.', 'Nos interesa cotizar packaging para una nueva línea de productos.', 'Estamos abriendo una segunda sucursal y queremos ordenar la identidad.', 'Vimos su trabajo para Lumbre y nos encantó. ¿Conversamos?']),
      status, owner: r.pick(['u-sales', 'u-5', 'u-admin', null]), source: r.pick(['Sitio web', 'Sitio web', 'Instagram', 'Referido', 'LinkedIn']),
      notes: status !== 'nuevo' ? [{ at: iso(Math.max(0, days - 2), r), user: 'u-sales', text: r.pick(['Llamada inicial realizada, muy interesados.', 'Enviada propuesta v1.', 'Piden ajustar presupuesto.', 'Reunión agendada para el jueves.']) }] : [],
      createdAt: iso(days, r)
    };
  });

  const media = Array.from({ length: 30 }, (_, i) => {
    const pal = ['primary', 'accent', 'info', 'success', 'warning', 'danger'];
    const shapes = ['orbit', 'grid', 'wave', 'blob', 'stripes', 'stack', 'sun', 'mesh'];
    const folder = r.pick(['Proyectos', 'Blog', 'Equipo', 'Marca']);
    return { id: 'm-' + (i + 1), name: `${slug(folder)}-${String(i + 1).padStart(3, '0')}.svg`, folder, alt: `Ilustración ${shapes[i % 8]} ${i + 1}`, w: r.pick([1600, 1920, 1200, 2400]), h: r.pick([900, 1080, 1200, 1600]), size: r.int(80, 2400), art: { c1: pal[i % 6], c2: pal[(i * 5 + 1) % 6], shape: shapes[(i * 3) % 8], seed: 100 + i }, createdAt: iso(i * 5, r) };
  });

  // Tráfico diario de los últimos 180 días.
  const traffic = Array.from({ length: 180 }, (_, i) => {
    const d = 179 - i, dt = new Date(Date.now() - d * DAY), dow = dt.getDay();
    const base = 380 + i * 2.2 + (dow === 0 || dow === 6 ? -120 : 40);
    return { date: dt.toISOString().slice(0, 10), visits: Math.max(80, Math.round(base + r() * 160)) };
  });

  return { users, services, categories, projects, team, testimonials, clients, posts, jobs, applications, leads, media, settings, home, traffic };
}
