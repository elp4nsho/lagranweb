// Datos semilla de Brújula Noticias (medio ficticio). Reproducibles con rng().
import { rng } from '../../../assets/core/db.js';
import { slug } from '../../../assets/core/ui.js';

const DAY = 864e5;
const iso = ms => new Date(ms).toISOString();

const CATEGORIES = [
  { id: 'politica', name: 'Política', color: 'primary', description: 'Congreso, gobierno, regiones y la discusión pública que nos afecta a todos.', order: 1 },
  { id: 'economia', name: 'Economía', color: 'success', description: 'Mercados, empleo, emprendimiento y tu bolsillo.', order: 2 },
  { id: 'tecnologia', name: 'Tecnología', color: 'info', description: 'Innovación, ciencia y cultura digital desde Chile y el mundo.', order: 3 },
  { id: 'deportes', name: 'Deportes', color: 'warning', description: 'Fútbol, tenis, básquetbol y el deporte que se juega en los barrios.', order: 4 },
  { id: 'cultura', name: 'Cultura', color: 'accent', description: 'Libros, cine, música, artes escénicas y patrimonio.', order: 5 }
];

const HEADLINES = {
  politica: [
    ['Senado aprueba en general reforma al sistema de pensiones tras maratónica sesión', 'La iniciativa pasa ahora a la comisión de Trabajo, donde se discutirán las indicaciones del Ejecutivo.'],
    ['Gobernadores regionales exigen mayor autonomía fiscal en cumbre de Concepción', 'Los 16 gobernadores firmaron una declaración conjunta que será entregada al Ministerio de Hacienda.'],
    ['Encuesta Brújula: aprobación presidencial se mantiene estable en 38%', 'La seguridad y el costo de la vida siguen encabezando las preocupaciones ciudadanas.'],
    ['Comisión mixta destraba proyecto de ley de datos personales', 'El acuerdo crea una agencia autónoma con facultades fiscalizadoras y sancionatorias.'],
    ['Municipios costeros piden plan nacional ante marejadas', 'Alcaldes de cinco regiones advierten daños en infraestructura por más de 40 mil millones de pesos.'],
    ['Cámara despacha ley corta de seguridad municipal', 'La normativa permite a los inspectores municipales realizar controles preventivos coordinados.'],
    ['Partidos inician negociaciones para listas parlamentarias', 'Las directivas buscan cerrar acuerdos antes del plazo legal de inscripción de candidaturas.'],
    ['Contraloría detecta irregularidades en traspasos a fundaciones', 'El informe abarca convenios firmados entre 2022 y 2025 en tres regiones.'],
    ['Nueva ley de transparencia obligará a publicar agendas de autoridades', 'El registro de audiencias se ampliará a jefes de servicio y directivos de empresas públicas.'],
    ['Debate presidencial: los cinco momentos que marcaron la noche', 'Seguridad, vivienda y crecimiento dominaron un encuentro con más tensión que propuestas.'],
    ['Plebiscito comunal en Valparaíso define el futuro del borde costero', 'Los vecinos votarán entre tres alternativas de uso para los terrenos del antiguo puerto.']
  ],
  economia: [
    ['Banco Central mantiene la tasa de interés y anticipa recortes graduales', 'El consejo destacó la convergencia de la inflación hacia la meta del 3% en el horizonte de política.'],
    ['Precio del cobre alcanza su mayor nivel en dos años', 'La demanda asiática y las restricciones de oferta impulsan al metal rojo por sobre los US$ 4,8 la libra.'],
    ['Desempleo baja a 8,1% en el trimestre móvil', 'Comercio y construcción lideraron la creación de puestos de trabajo según el INE.'],
    ['Pymes exportadoras crecen 14% gracias a nuevos acuerdos comerciales', 'Los envíos de alimentos procesados y servicios digitales encabezan el aumento.'],
    ['Litio: Estado y privados firman acuerdo para nueva planta en Antofagasta', 'La inversión estimada supera los US$ 1.200 millones y generará 3 mil empleos en la construcción.'],
    ['Cuentas de la luz subirán 6% en enero, anuncia la CNE', 'El alza responde al ajuste semestral de tarifas y al costo de la energía en el mercado spot.'],
    ['Fintech chilenas captan récord de inversión de capital de riesgo', 'El sector levantó más de US$ 400 millones en lo que va del año, el doble que en 2025.'],
    ['IPC de octubre sorprende con variación de 0,2%', 'Alimentos y transporte moderaron su alza, mientras vivienda registró un incremento mayor al esperado.'],
    ['Retail anticipa ventas récord para el Cyber de noviembre', 'Las empresas esperan transacciones por más de US$ 600 millones en tres días.'],
    ['Cómo afecta el dólar a tus compras de fin de año', 'Explicamos qué productos son más sensibles al tipo de cambio y cuándo conviene comprar.'],
    ['Vino chileno conquista nuevos mercados en el sudeste asiático', 'Vietnam y Tailandia se convierten en destinos prometedores para las viñas del Valle Central.']
  ],
  tecnologia: [
    ['Startup chilena desarrolla IA para predecir incendios forestales', 'El sistema cruza datos satelitales, meteorológicos y de sensores en terreno con 72 horas de anticipación.'],
    ['Observatorio en el desierto de Atacama capta imagen inédita de una galaxia espiral', 'Astrónomas chilenas lideran el equipo internacional que procesó las observaciones.'],
    ['5G llega a 40 nuevas comunas: qué cambia para los usuarios', 'La cobertura alcanza al 78% de la población, según la Subsecretaría de Telecomunicaciones.'],
    ['Cable submarino transpacífico conectará Chile con Oceanía', 'El proyecto reducirá la latencia hacia Asia y posiciona al país como hub digital regional.'],
    ['Ciberataque afecta a servicios de una aseguradora: lo que se sabe', 'La empresa asegura que no hay evidencia de filtración de datos de tarjetas de crédito.'],
    ['Colegios públicos incorporan programación desde quinto básico', 'El plan piloto llegará a 300 establecimientos el próximo año escolar.'],
    ['Autos eléctricos duplican sus ventas en el último año', 'La baja de precios y la expansión de la red de carga impulsan la adopción.'],
    ['Científicos chilenos secuencian el genoma del alerce', 'El hallazgo abre nuevas posibilidades para la conservación de la especie milenaria.'],
    ['Guía práctica: cómo proteger tus cuentas con llaves de acceso', 'Las passkeys reemplazan a las contraseñas y ya funcionan en bancos y redes sociales.'],
    ['Hidrógeno verde: el primer barco chileno impulsado por amoníaco zarpa desde Mejillones', 'La embarcación de prueba recorrerá la costa norte durante seis semanas.']
  ],
  deportes: [
    ['La Roja vence a Perú y se ilusiona en las clasificatorias', 'Un doblete en el segundo tiempo selló un triunfo clave en el Estadio Nacional.'],
    ['Tenista chilena avanza a cuartos de final en Roland Garros juvenil', 'La raqueta de 17 años no ha cedido sets en todo el torneo.'],
    ['Clásico universitario termina en empate con polémica arbitral', 'El VAR anuló un gol en los descuentos y encendió la discusión en redes sociales.'],
    ['Liga de básquetbol femenino bate récord de asistencia', 'Más de 6 mil personas presenciaron la final en el Movistar Arena.'],
    ['Maratón de Santiago reunirá a 30 mil corredores', 'La organización anunció cambios en el recorrido y nuevos puntos de hidratación.'],
    ['Ciclista nacional gana etapa reina de la Vuelta a Colombia', 'La subida al Alto de Letras fue el escenario de una actuación histórica.'],
    ['Surf: Pichilemu recibe la fecha mundial de olas grandes', 'Los mejores surfistas del circuito llegan a Punta de Lobos para la temporada.'],
    ['Copa Chile: los cruces de semifinales quedaron definidos', 'Los partidos de ida se jugarán el próximo miércoles en regiones.'],
    ['Escuelas de fútbol barrial reciben fondos para infraestructura', 'El programa beneficiará a 120 clubes de 45 comunas del país.'],
    ['Nadadora paralímpica rompe récord sudamericano en Lima', 'Su marca en los 100 metros espalda la posiciona como candidata a medalla mundial.']
  ],
  cultura: [
    ['Festival de Teatro de Santiago anuncia su programación con 40 obras', 'La edición incluye compañías de once países y funciones gratuitas en espacios públicos.'],
    ['Novela de autora magallánica gana premio iberoamericano', 'El jurado destacó su retrato de la Patagonia y la memoria de las familias pioneras.'],
    ['Museo de Bellas Artes reabre sus salas tras restauración', 'La muestra inaugural reúne obras de pintoras chilenas del siglo XX nunca antes exhibidas.'],
    ['Cine chileno: documental sobre el Atacama se estrena en Berlín', 'La película sigue a tres generaciones de mujeres pirquineras en el desierto.'],
    ['La cueca urbana vive un renacer en los barrios de Valparaíso', 'Nuevas agrupaciones mezclan tradición con sonidos contemporáneos.'],
    ['Feria del Libro bate récord de público en su última jornada', 'Más de 250 mil personas visitaron los pabellones durante las dos semanas del evento.'],
    ['Patrimonio: ascensores de Valparaíso vuelven a funcionar', 'La restauración de tres ascensores históricos culminó tras cuatro años de obras.'],
    ['Orquesta juvenil de Temuco se presentará en Viena', 'Los 60 músicos mapuche y no mapuche viajarán en enero con apoyo de fondos culturales.'],
    ['Entrevista: el ilustrador que dibuja los barrios que desaparecen', 'Su nuevo libro recopila 200 fachadas de casas antiguas de Santiago.'],
    ['Lollapalooza Chile revela su cartel con fuerte presencia latinoamericana', 'El festival se realizará en marzo en el Parque O\'Higgins.']
  ]
};

const PARA = {
  politica: ['La votación se extendió hasta pasada la medianoche, luego de que distintas bancadas solicitaran segunda discusión para varios artículos.', 'Desde el oficialismo valoraron el avance, mientras la oposición anunció que presentará indicaciones para modificar los puntos más controvertidos.', 'Analistas consultados por Brújula coinciden en que el escenario legislativo será clave para la agenda de los próximos meses.', 'En regiones, autoridades locales han insistido en que las decisiones se toman lejos de los territorios y sin considerar sus particularidades.', 'El Ejecutivo comprometió urgencia para el proyecto y espera despacharlo antes del receso legislativo de febrero.', 'La discusión también abrió un debate sobre el financiamiento y los plazos de implementación de las medidas propuestas.'],
  economia: ['Los economistas consultados estiman que el escenario seguirá siendo desafiante durante el primer semestre del próximo año.', 'El dato se ubicó en línea con las expectativas del mercado, lo que fue bien recibido por los inversionistas en la Bolsa de Santiago.', 'Para los hogares, el impacto se sentirá principalmente en el costo de los créditos y en los precios de bienes importados.', 'Gremios empresariales valoraron la señal, aunque advirtieron que persisten desafíos en productividad y permisos de inversión.', 'Las proyecciones para el próximo año apuntan a un crecimiento de entre 2% y 2,5%, según el último informe de política monetaria.', 'El sector exportador, en tanto, observa con atención la evolución del tipo de cambio y la demanda de sus principales socios comerciales.'],
  tecnologia: ['El desarrollo fue posible gracias a la colaboración entre universidades, el Estado y empresas tecnológicas locales.', 'Los expertos advierten que la adopción masiva dependerá de la infraestructura disponible y de la alfabetización digital de la población.', 'La iniciativa se suma a otros proyectos que buscan posicionar a Chile como un polo de innovación en América Latina.', 'Según sus creadores, el sistema podrá escalar a otros países de la región durante los próximos dos años.', 'Especialistas en ciberseguridad recomiendan actualizar los dispositivos y activar la verificación en dos pasos.', 'El financiamiento provino en parte de fondos públicos de investigación y de inversionistas ángeles chilenos.'],
  deportes: ['El técnico destacó el compromiso del plantel y adelantó que habrá rotaciones para el próximo compromiso.', 'La hinchada respondió con un estadio prácticamente lleno y un ambiente que no se veía desde hace varias temporadas.', 'Con este resultado, el equipo escala posiciones en la tabla y depende de sí mismo para alcanzar sus objetivos.', 'La preparación incluyó meses de entrenamiento en altura y un trabajo específico con el cuerpo médico.', 'Los dirigentes anunciaron que las entradas para la próxima fecha saldrán a la venta este lunes.', 'El deporte formativo sigue siendo la base de estos logros, coinciden entrenadores y exdeportistas.'],
  cultura: ['La programación contempla actividades para todo público, talleres y conversatorios con los artistas.', 'Los organizadores destacaron el aumento de público joven y la descentralización de las actividades.', 'La obra dialoga con la memoria, el territorio y las tensiones de una sociedad en transformación.', 'Para la crítica especializada, se trata de uno de los trabajos más sólidos de la escena local en la última década.', 'Las entradas tendrán precios diferenciados para estudiantes y personas mayores, además de funciones gratuitas.', 'El proyecto contó con apoyo del Fondo de Fomento y de la red de espacios culturales de la región.']
};
const QUOTES = [
  ['Esto es un paso importante, pero todavía queda mucho por hacer.', 'Daniela Fuenzalida, académica'],
  ['La ciudadanía exige respuestas concretas y no solo diagnósticos.', 'Hernán Bascuñán, analista'],
  ['Estamos muy orgullosos del trabajo de todo el equipo.', 'Valeria Contreras, directora del proyecto'],
  ['Los datos muestran una tendencia clara que no podemos ignorar.', 'Jorge Pizarro, economista'],
  ['Queremos que esto llegue a todos los rincones del país.', 'Catalina Moya, coordinadora nacional']
];
const LISTS = [['Qué cambia desde mañana', 'Plazos de implementación', 'Quiénes son los beneficiados', 'Dónde informarse'], ['Revisa tus cuentas periódicamente', 'Compara precios antes de comprar', 'Evita endeudarte en cuotas largas'], ['Contexto internacional', 'Impacto en regiones', 'Próximos pasos']];

export function seed() {
  const r = rng(1810);
  const now = Date.now();

  const users = [
    { id: 'u-admin', name: 'Ana Torres', email: 'admin@brujula.cl', password: 'admin123', role: 'admin', color: '#111111', demo: true, active: true },
    { id: 'u-editor', name: 'Carolina Méndez', email: 'editora@brujula.cl', password: 'editora123', role: 'editor', color: '#9c2f2f', demo: true, active: true },
    { id: 'u-periodista', name: 'Rodrigo Saavedra', email: 'periodista@brujula.cl', password: 'periodista123', role: 'periodista', color: '#2f6d4f', demo: true, active: true },
    { id: 'u-lector', name: 'Diego Fuentes', email: 'lector@brujula.cl', password: 'lector123', role: 'lector', color: '#3b5b9c', demo: true, active: true, saved: [], newsletter: true },
    { id: 'u-lectora', name: 'Fernanda Rojas', email: 'lectora@brujula.cl', password: 'lectora123', role: 'lector', color: '#8a4f9e', demo: true, active: true, saved: [], newsletter: false },
    { id: 'u-p2', name: 'Javiera Ortúzar', email: 'javiera@brujula.cl', password: 'brujula2026', role: 'periodista', color: '#2f5f9c', active: true },
    { id: 'u-p3', name: 'Felipe Cárcamo', email: 'felipe@brujula.cl', password: 'brujula2026', role: 'periodista', color: '#b8741a', active: true },
    { id: 'u-p4', name: 'Isidora Leiva', email: 'isidora@brujula.cl', password: 'brujula2026', role: 'periodista', color: '#9e3f6d', active: true },
    { id: 'u-p5', name: 'Martín Aguirre', email: 'martin@brujula.cl', password: 'brujula2026', role: 'periodista', color: '#555555', active: false }
  ];

  const authors = [
    { id: 'a-carolina', name: 'Carolina Méndez', userId: 'u-editor', beat: 'Editora jefa · Política', bio: 'Periodista de la U. de Chile. Fue corresponsal en Buenos Aires y hoy dirige la mesa central de Brújula.', color: 'primary', twitter: '@caromendez' },
    { id: 'a-rodrigo', name: 'Rodrigo Saavedra', userId: 'u-periodista', beat: 'Economía y mercados', bio: 'Cubre economía hace 12 años. Le gusta explicar las cifras con ejemplos de la vida diaria.', color: 'success', twitter: '@rsaavedra' },
    { id: 'a-javiera', name: 'Javiera Ortúzar', userId: 'u-p2', beat: 'Tecnología y ciencia', bio: 'Periodista científica. Escribe sobre astronomía, clima e innovación desde el norte de Chile.', color: 'info', twitter: '@javiortuzar' },
    { id: 'a-felipe', name: 'Felipe Cárcamo', userId: 'u-p3', beat: 'Deportes', bio: 'Relator radial convertido en cronista. Ha cubierto tres Copas América y dos Juegos Olímpicos.', color: 'warning', twitter: '@fcarcamo' },
    { id: 'a-isidora', name: 'Isidora Leiva', userId: 'u-p4', beat: 'Cultura', bio: 'Crítica de cine y teatro. Coordina la sección de libros y el podcast cultural de Brújula.', color: 'accent', twitter: '@isileiva' },
    { id: 'a-martin', name: 'Martín Aguirre', userId: 'u-p5', beat: 'Política y regiones', bio: 'Reportero de regiones. Ha recorrido las 16 regiones contando historias de sus comunidades.', color: 'danger', twitter: '@maguirre' },
    { id: 'a-paula', name: 'Paula Riquelme', userId: null, beat: 'Columnista invitada', bio: 'Economista y académica. Escribe cada quincena sobre desigualdad y políticas públicas.', color: 'success', twitter: '@priquelme' },
    { id: 'a-redaccion', name: 'Redacción Brújula', userId: null, beat: 'Equipo de prensa', bio: 'Notas elaboradas por el equipo de la mesa central con información de agencias y fuentes oficiales.', color: 'primary', twitter: '@brujulanoticias' }
  ].map(a => ({ ...a, slug: slug(a.name) }));

  const byCat = { politica: ['a-carolina', 'a-martin', 'a-redaccion'], economia: ['a-rodrigo', 'a-paula', 'a-redaccion'], tecnologia: ['a-javiera', 'a-redaccion'], deportes: ['a-felipe', 'a-redaccion'], cultura: ['a-isidora', 'a-redaccion'] };
  const TAGS = {
    politica: ['congreso', 'gobierno', 'regiones', 'elecciones', 'seguridad'],
    economia: ['banco-central', 'empleo', 'cobre', 'pymes', 'inflacion'],
    tecnologia: ['inteligencia-artificial', 'ciencia', 'ciberseguridad', 'astronomia', 'innovacion'],
    deportes: ['futbol', 'la-roja', 'tenis', 'basquetbol', 'atletismo'],
    cultura: ['libros', 'cine', 'teatro', 'musica', 'patrimonio']
  };
  const tagSet = new Set();
  const PAL = ['primary', 'accent', 'info', 'success', 'warning', 'danger'];
  const SHAPES = ['orbit', 'grid', 'wave', 'blob', 'stripes', 'stack', 'sun', 'mesh'];

  const articles = [];
  let k = 0;
  for (const cat of CATEGORIES) {
    HEADLINES[cat.id].forEach(([title, dek], i) => {
      k++;
      const pool = PARA[cat.id];
      const tags = [r.pick(TAGS[cat.id]), r.pick(TAGS[cat.id])].filter((t, j, a) => a.indexOf(t) === j);
      tags.forEach(t => tagSet.add(t));
      const q = r.pick(QUOTES);
      const blocks = [
        { type: 'p', text: `${dek} ${pool[i % pool.length]}` },
        { type: 'p', text: `${pool[(i + 1) % pool.length]} ${pool[(i + 2) % pool.length]}` },
        { type: 'h2', text: r.pick(['Los detalles', 'Qué dicen los expertos', 'El contexto', 'Lo que viene', 'Las reacciones']) },
        { type: 'p', text: `${pool[(i + 3) % pool.length]} Según cifras recopiladas por Brújula, el fenómeno se ha intensificado durante **los últimos meses**.` },
        { type: 'quote', text: q[0], cite: q[1] },
        { type: 'p', text: pool[(i + 4) % pool.length] },
        { type: 'img', art: { c1: PAL[k % 6], c2: PAL[(k + 3) % 6], shape: SHAPES[(k + 2) % 8], seed: k * 7 }, caption: 'Imagen referencial. Archivo Brújula.' },
        { type: 'h2', text: 'Claves para entender' },
        { type: 'list', items: r.pick(LISTS) },
        { type: 'p', text: `${pool[(i + 5) % pool.length]} _Brújula seguirá informando sobre este tema._` }
      ];
      // Estados: la mayoría publicada, algunos en flujo editorial.
      let status = 'published';
      let ageDays = Math.pow(r(), 1.6) * 110 + 0.05;
      const authorId = r.pick(byCat[cat.id]);
      if (i === HEADLINES[cat.id].length - 1) status = 'draft';
      if (i === HEADLINES[cat.id].length - 2 && k % 2) status = 'review';
      if (cat.id === 'economia' && i === 8) status = 'scheduled';
      const publishAt = status === 'scheduled' ? now + (1 + r() * 3) * DAY : now - ageDays * DAY;
      const views = status === 'published' ? Math.round((800 + r() * 18000) * (1 / (1 + ageDays / 30)) + r() * 1200) : 0;
      articles.push({
        id: 'ar-' + k, slug: slug(title), title, dek, categoryId: cat.id, tags, authorId,
        status, publishAt: iso(publishAt), publishedAt: status === 'published' ? iso(publishAt) : null,
        premium: r.bool(.28), breaking: status === 'published' && ageDays < 2.5 && r.bool(.7), featured: false,
        cover: { c1: PAL[(k * 5) % 6], c2: PAL[(k + 2) % 6], shape: SHAPES[k % 8], seed: k + 11 },
        blocks, views, seoDescription: dek,
        editorNote: status === 'draft' && k % 3 === 0 ? 'Falta contrastar cifras con la fuente oficial.' : '',
        history: [{ at: iso(publishAt - DAY * .3), user: users.find(u => u.id === authors.find(a => a.id === authorId).userId)?.id || 'u-editor', action: 'Creó el borrador' }].concat(status === 'published' ? [{ at: iso(publishAt), user: 'u-editor', action: 'Publicó' }] : status === 'review' ? [{ at: iso(now - DAY * .2), user: users.find(u => u.id === authors.find(a => a.id === authorId).userId)?.id || 'u-editor', action: 'Envió a revisión' }] : []),
        createdAt: iso(publishAt - DAY * .4), updatedAt: iso(Math.min(now, publishAt))
      });
    });
  }
  // Destacados: el más reciente de Política y uno de Economía/Tecnología.
  const pub = articles.filter(a => a.status === 'published').sort((a, b) => b.publishAt.localeCompare(a.publishAt));
  pub.slice(0, 3).forEach(a => { a.featured = true; });
  pub[0].breaking = true; pub[0].premium = false;
  // El periodista demo tiene un borrador propio y uno devuelto con nota.
  const mine = articles.filter(a => a.authorId === 'a-rodrigo');
  if (mine[0]) { mine[0].status = 'draft'; mine[0].publishedAt = null; mine[0].views = 0; mine[0].featured = false; mine[0].breaking = false; mine[0].editorNote = 'Buen enfoque. Agrega la proyección del Banco Central y una cita de un gremio pyme.'; }

  const tags = [...tagSet].map(t => ({ id: t, name: t.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) }));

  // Lectores generados (para comentarios y suscripciones)
  const FIRST = ['Valentina', 'Martina', 'Sofía', 'Isidora', 'Catalina', 'Javiera', 'Constanza', 'Agustina', 'Benjamín', 'Vicente', 'Joaquín', 'Matías', 'Cristóbal', 'Sebastián', 'Felipe', 'Nicolás', 'Tomás', 'Antonia', 'Ignacio', 'Camila', 'Pablo', 'Francisca', 'Andrés', 'Daniela'];
  const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Vergara'];
  const readers = Array.from({ length: 60 }, (_, i) => {
    const name = `${r.pick(FIRST)} ${r.pick(LAST)}`;
    return { id: 'r-' + (i + 1), name, email: `${slug(name).replace('-', '.')}${i}@${r.pick(['gmail.com', 'outlook.com', 'correo.cl'])}`, password: 'lector2026', role: 'lector', color: ['#3b5b9c', '#2f6d4f', '#9c2f2f', '#8a4f9e', '#b8741a'][i % 5], active: true, saved: [], createdAt: iso(now - r() * 300 * DAY) };
  });
  users.push(...readers);

  const plans = [
    { id: 'pl-mensual', name: 'Digital mensual', price: 4990, period: 'mes', features: ['Acceso ilimitado a artículos premium', 'Newsletter exclusivo de la mañana', 'Sin publicidad intrusiva'], highlight: false, active: true, order: 1 },
    { id: 'pl-anual', name: 'Digital anual', price: 49900, period: 'año', features: ['Todo lo del plan mensual', 'Dos meses gratis', 'Acceso a la edición en PDF', 'Invitaciones a eventos Brújula'], highlight: true, active: true, order: 2 },
    { id: 'pl-total', name: 'Total + papel', price: 12990, period: 'mes', features: ['Todo lo digital', 'Edición impresa fin de semana', 'Revista mensual Brújula Ideas', 'Descuentos con socios culturales'], highlight: false, active: true, order: 3 }
  ];

  // Suscripciones y pagos (historial de 10 meses)
  const subscriptions = [], payments = [];
  const subUsers = [...readers.slice(0, 48), users.find(u => u.id === 'u-lector')];
  subUsers.forEach((u, i) => {
    const plan = u.id === 'u-lector' ? plans[1] : r.pick([plans[0], plans[0], plans[0], plans[1], plans[2]]);
    const start = u.id === 'u-lector' ? now - 120 * DAY : now - (5 + Math.pow(r(), .8) * 290) * DAY;
    const cancelled = u.id !== 'u-lector' && r.bool(.16);
    const end = cancelled ? Math.min(now - DAY, start + (30 + r() * Math.max(1, (now - start) / DAY - 30)) * DAY) : null;
    const status = cancelled ? 'cancelled' : (r.bool(.06) ? 'past_due' : 'active');
    const s = { id: 'sub-' + (i + 1), userId: u.id, planId: plan.id, status, amount: plan.price, startedAt: iso(start), cancelledAt: end ? iso(Math.min(end, now)) : null, renewsAt: iso(start + Math.ceil((now - start) / (30 * DAY)) * 30 * DAY), card: `•••• ${r.int(1000, 9999)}`, createdAt: iso(start) };
    subscriptions.push(s);
    const stepDays = plan.period === 'año' ? 365 : 30;
    for (let t = start; t < (end || now); t += stepDays * DAY) payments.push({ id: `pay-${i}-${Math.round(t / DAY)}`, subscriptionId: s.id, userId: u.id, planId: plan.id, amount: plan.price, status: 'paid', createdAt: iso(t) });
  });
  users.find(u => u.id === 'u-lector').subscriptionId = 'sub-' + subUsers.length;

  // Comentarios
  const COMMENTS = ['Muy buen artículo, se agradece el contexto.', 'Me gustaría saber más sobre cómo afectará esto a las regiones.', 'Excelente cobertura, como siempre.', '¿Alguien sabe dónde puedo revisar el informe completo?', 'No estoy de acuerdo con el enfoque, faltó la otra mirada.', 'Por fin una nota que explica las cosas con claridad.', 'Esto debería haberse hecho hace años.', 'Interesante, pero los datos de la encuesta me parecen discutibles.', 'Gracias por la guía, me sirvió mucho.', 'Ojalá hagan un seguimiento de este tema.', 'Qué orgullo para Chile 👏', 'Habría que ver la letra chica.'];
  const SPAM = ['GANA DINERO DESDE CASA visita mi perfil!!!', 'Compra seguidores baratos aquí →'];
  const comments = [];
  pub.forEach((a, i) => {
    const n = r.int(0, 6);
    for (let j = 0; j < n; j++) {
      const u = r.pick(readers);
      const at = new Date(a.publishAt).getTime() + r() * Math.max(DAY * .2, now - new Date(a.publishAt).getTime()) * .5;
      const st = r() < .78 ? 'approved' : r() < .6 ? 'pending' : 'rejected';
      comments.push({ id: `c-${i}-${j}`, articleId: a.id, userId: u.id, name: u.name, text: r.pick(COMMENTS), status: st, likes: st === 'approved' ? r.int(0, 40) : 0, createdAt: iso(Math.min(now - 60000, at)) });
    }
  });
  comments.push({ id: 'c-spam-1', articleId: pub[1].id, userId: null, name: 'promo_ventas', text: SPAM[0], status: 'pending', likes: 0, createdAt: iso(now - 3600e3) });
  comments.push({ id: 'c-spam-2', articleId: pub[2].id, userId: null, name: 'seguidores4u', text: SPAM[1], status: 'pending', likes: 0, createdAt: iso(now - 7200e3) });
  comments.push({ id: 'c-mine-1', articleId: pub[0].id, userId: 'u-lector', name: 'Diego Fuentes', text: 'Muy completa la nota. ¿Habrá cobertura en vivo de la votación en sala?', status: 'approved', likes: 12, createdAt: iso(now - 5 * 3600e3) });

  // Newsletter
  const subscribers = Array.from({ length: 220 }, (_, i) => {
    const name = `${r.pick(FIRST)} ${r.pick(LAST)}`;
    return { id: 'ns-' + (i + 1), email: `${slug(name).replace('-', '_')}${i}@${r.pick(['gmail.com', 'outlook.com', 'correo.cl', 'empresa.cl'])}`, name, lists: r.bool(.7) ? ['diario', 'semanal'] : [r.pick(['diario', 'semanal'])], status: r.bool(.9) ? 'active' : 'unsubscribed', source: r.pick(['Portada', 'Artículo', 'Registro', 'Evento']), createdAt: iso(now - Math.pow(r(), .7) * 240 * DAY) };
  });
  subscribers.push({ id: 'ns-lector', email: 'lector@brujula.cl', name: 'Diego Fuentes', lists: ['diario'], status: 'active', source: 'Registro', createdAt: iso(now - 100 * DAY) });
  const campaigns = Array.from({ length: 9 }, (_, i) => {
    const sent = now - (i * 6 + 1) * DAY, rec = 160 + r.int(0, 50);
    return { id: 'cp-' + (i + 1), subject: ['Las 5 noticias que debes saber hoy', 'Resumen semanal: lo más leído', 'Edición especial: elecciones', 'Economía en 3 minutos', 'Lo mejor de la cultura este fin de semana'][i % 5], list: i % 2 ? 'semanal' : 'diario', intro: 'Buenos días. Esto es lo que necesitas saber para empezar el día informado.', articleIds: pub.slice(i, i + 4).map(a => a.id), status: 'sent', sentAt: iso(sent), recipients: rec, opens: Math.round(rec * (.38 + r() * .2)), clicks: Math.round(rec * (.08 + r() * .08)), createdAt: iso(sent - DAY * .3) };
  });
  campaigns.unshift({ id: 'cp-draft', subject: 'Borrador: especial Cyber', list: 'diario', intro: 'Todo lo que debes saber antes de comprar.', articleIds: [], status: 'draft', sentAt: null, recipients: 0, opens: 0, clicks: 0 });

  const ads = [
    { id: 'ad-1', slot: 'home-top', advertiser: 'Banco Austral', title: 'Tu cuenta digital en 5 minutos', text: 'Sin costo de mantención el primer año.', cta: 'Abrir cuenta', active: true, impressions: 182400, clicks: 1460, start: iso(now - 40 * DAY), end: iso(now + 20 * DAY), art: { c1: 'info', c2: 'primary', shape: 'wave', seed: 3 } },
    { id: 'ad-2', slot: 'sidebar', advertiser: 'Viña Los Robles', title: 'Reserva de familia 2022', text: 'Despacho gratis en Santiago.', cta: 'Comprar', active: true, impressions: 96300, clicks: 870, start: iso(now - 25 * DAY), end: iso(now + 35 * DAY), art: { c1: 'danger', c2: 'warning', shape: 'sun', seed: 8 } },
    { id: 'ad-3', slot: 'article-inline', advertiser: 'Universidad del Pacífico', title: 'Postula a magísteres 2027', text: 'Becas de hasta 50% de arancel.', cta: 'Postular', active: true, impressions: 140200, clicks: 2100, start: iso(now - 15 * DAY), end: iso(now + 45 * DAY), art: { c1: 'accent', c2: 'info', shape: 'grid', seed: 12 } },
    { id: 'ad-4', slot: 'footer', advertiser: 'Aerolínea Cóndor', title: 'Vuela al sur desde $29.990', text: 'Puerto Montt, Punta Arenas y Balmaceda.', cta: 'Ver vuelos', active: true, impressions: 60500, clicks: 410, start: iso(now - 10 * DAY), end: iso(now + 10 * DAY), art: { c1: 'success', c2: 'info', shape: 'orbit', seed: 5 } },
    { id: 'ad-5', slot: 'sidebar', advertiser: 'Seguros Faro', title: 'Seguro de hogar desde $8.990', text: 'Cotiza en línea.', cta: 'Cotizar', active: false, impressions: 22000, clicks: 95, start: iso(now - 90 * DAY), end: iso(now - 30 * DAY), art: { c1: 'warning', c2: 'primary', shape: 'stack', seed: 9 } }
  ];

  const traffic = Array.from({ length: 120 }, (_, i) => {
    const d = 119 - i, dt = new Date(now - d * DAY), dow = dt.getDay();
    const base = 21000 + i * 75 + (dow === 0 || dow === 6 ? -5200 : 1800) + (i % 29 === 0 ? 14000 : 0);
    const views = Math.round(base + r() * 5200);
    return { id: 't-' + i, date: dt.toISOString().slice(0, 10), views, visitors: Math.round(views * (.55 + r() * .08)), politica: .27, economia: .22, tecnologia: .18, deportes: .2, cultura: .13 };
  });

  const settings = {
    name: 'Brújula Noticias', tagline: 'Periodismo que orienta', city: 'Santiago', founded: 2009,
    email: 'contacto@brujula.cl', phone: '+56 2 2940 1100', address: 'Av. Providencia 1208, of. 501, Providencia',
    social: { x: '@brujulanoticias', instagram: '@brujula.cl', youtube: 'BrujulaTV', tiktok: '@brujula' },
    ticker: { on: true, manual: '' },
    paywall: { on: true, previewBlocks: 2 },
    comments: { on: true, moderation: 'pre' },
    newsletterText: 'Las 5 noticias más importantes del día, cada mañana a las 7:00.',
    seo: { title: 'Brújula Noticias · Periodismo que orienta', description: 'Noticias de Chile y el mundo: política, economía, tecnología, deportes y cultura. Periodismo independiente desde 2009.' }
  };

  return { users, authors, categories: CATEGORIES, tags, articles, comments, plans, subscriptions, payments, subscribers, campaigns, ads, traffic, settings };
}
