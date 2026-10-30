// Datos semilla de Andes+ (plataforma de streaming ficticia). Reproducibles con rng().
import { rng } from '../../../assets/core/db.js';

const DAY = 864e5;
const iso = ms => new Date(ms).toISOString();
export const GENRES = ['Drama', 'Comedia', 'Thriller', 'Ciencia ficción', 'Documental', 'Infantil', 'Terror', 'Romance', 'Acción', 'Aventura'];
export const RATINGS = ['TE', '7+', '13+', '16+', '18+'];
export const MOTIFS = ['montanas', 'ola', 'ciudad', 'estrellas', 'bosque', 'desierto', 'faro', 'volcan'];
export const DEVICES = ['Smart TV', 'Celular', 'Computador', 'Tablet', 'Consola'];

// [título, tipo, año, géneros, clasificación, motivo, temporadas|minutos, sinopsis, original]
const TITLES = [
  ['Altiplano', 'serie', 2025, ['Drama'], '16+', 'montanas', [8, 8], 'Una familia aymara enfrenta a una minera que amenaza el salar donde han vivido por generaciones.', true],
  ['Los Guardianes del Glaciar', 'serie', 2024, ['Aventura', 'Drama'], '13+', 'montanas', [6, 6, 6], 'Un grupo de guardaparques en Aysén descubre que el glaciar esconde algo más que hielo.', true],
  ['Puerto Frío', 'serie', 2026, ['Thriller'], '16+', 'faro', [7], 'En un pueblo pesquero de Magallanes, una detective investiga desapariciones que nadie quiere resolver.', true],
  ['La Última Estación', 'serie', 2025, ['Ciencia ficción'], '13+', 'estrellas', [8, 8], 'Tras un apagón global, los pasajeros del último tren al sur deben decidir en quién confiar.', true],
  ['Valparaíso Nocturno', 'serie', 2023, ['Thriller', 'Drama'], '18+', 'ciudad', [6, 6], 'Un taxista de los cerros queda atrapado entre dos bandas rivales del puerto.', true],
  ['Cocina de Mercado', 'serie', 2026, ['Documental'], 'TE', 'desierto', [10], 'Cocineras y cocineros de ferias de todo Chile comparten sus recetas y sus historias.', true],
  ['Patagonia Salvaje', 'serie', 2024, ['Documental', 'Aventura'], 'TE', 'bosque', [5, 5], 'Pumas, huemules y cóndores en el último gran territorio virgen del continente.', true],
  ['Liceo 33', 'serie', 2025, ['Comedia'], '13+', 'ciudad', [8, 8, 8], 'Un profesor de historia recién llegado intenta sobrevivir al curso más desordenado de Puente Alto.', true],
  ['El Clan Fuentealba', 'serie', 2022, ['Drama'], '16+', 'bosque', [10, 10], 'La muerte del patriarca desata una guerra por la viña familiar en el valle del Maule.', false],
  ['Nebulosa', 'serie', 2026, ['Ciencia ficción', 'Thriller'], '16+', 'estrellas', [6], 'Una astrónoma del observatorio de Paranal recibe una señal que solo ella puede descifrar.', true],
  ['Risas en la Micro', 'serie', 2024, ['Comedia'], '7+', 'ciudad', [12], 'Sketches filmados en el transporte público más impredecible del país.', false],
  ['Cóndor y Puma', 'serie', 2025, ['Infantil', 'Aventura'], 'TE', 'montanas', [10, 10], 'Dos amigos muy distintos recorren la cordillera ayudando a los animales en problemas.', true],
  ['Pequeños Exploradores', 'serie', 2023, ['Infantil'], 'TE', 'ola', [12], 'Niñas y niños descubren la ciencia detrás de las cosas de todos los días.', false],
  ['Señal Perdida', 'serie', 2025, ['Terror'], '18+', 'bosque', [6], 'Un equipo de radioaficionados capta voces en una frecuencia que no debería existir.', true],
  ['Mareas', 'serie', 2026, ['Romance', 'Drama'], '13+', 'ola', [8], 'Dos surfistas de Pichilemu se enamoran mientras compiten por el mismo campeonato.', true],
  ['Desierto Rojo', 'serie', 2024, ['Acción', 'Thriller'], '16+', 'desierto', [8, 8], 'Un ex carabinero se infiltra en una red de contrabando en la frontera norte.', false],
  ['El Faro del Fin del Mundo', 'pelicula', 2025, ['Drama', 'Aventura'], '13+', 'faro', 118, 'El último farero de la isla Diego Ramírez recibe una visita inesperada en plena tormenta.', true],
  ['Tormenta en Atacama', 'pelicula', 2024, ['Acción'], '16+', 'desierto', 104, 'Un rescate imposible en medio de la primera tormenta de nieve en el desierto en cien años.', true],
  ['Ruta 5', 'pelicula', 2023, ['Comedia', 'Aventura'], '13+', 'desierto', 97, 'Tres hermanos cruzan el país en una camioneta vieja para cumplir la última voluntad de su padre.', false],
  ['Noche de Brujas en Chiloé', 'pelicula', 2025, ['Terror'], '18+', 'bosque', 92, 'Un grupo de estudiantes ignora las leyendas locales durante un viaje a la isla.', true],
  ['La Pianista de Iquique', 'pelicula', 2022, ['Drama', 'Romance'], '13+', 'ola', 126, 'La historia de una prodigiosa pianista en la época del salitre.', false],
  ['Código Volcán', 'pelicula', 2026, ['Thriller', 'Ciencia ficción'], '16+', 'volcan', 110, 'Una vulcanóloga descubre que la erupción del Villarrica fue provocada.', true],
  ['Sol de Medianoche', 'pelicula', 2024, ['Romance'], '13+', 'estrellas', 101, 'Un verano en Puerto Williams cambia la vida de dos desconocidos.', false],
  ['Mi Abuela la Astronauta', 'pelicula', 2025, ['Infantil', 'Comedia'], 'TE', 'estrellas', 88, 'Una abuela jubilada se inscribe en un programa espacial y su nieta la entrena.', true],
  ['Kilómetro Cero', 'pelicula', 2023, ['Drama'], '16+', 'ciudad', 112, 'Un día en la vida de cinco personas que se cruzan en la Plaza de Armas de Santiago.', false],
  ['Huellas en la Nieve', 'pelicula', 2024, ['Aventura', 'Infantil'], '7+', 'montanas', 95, 'Una niña y su perro se pierden en Farellones y deben encontrar el camino a casa.', true],
  ['El Último Tren a Talca', 'pelicula', 2022, ['Drama', 'Comedia'], '7+', 'ciudad', 99, 'El ramal más antiguo del país está por cerrar y sus pasajeros no lo permitirán.', false],
  ['Dos Lunas', 'pelicula', 2026, ['Ciencia ficción', 'Romance'], '13+', 'estrellas', 107, 'Una noche aparece una segunda luna sobre el cielo de La Serena.', true],
  ['Aventura en Rapa Nui', 'pelicula', 2025, ['Infantil', 'Aventura'], 'TE', 'ola', 84, 'Tres primos buscan un moai perdido siguiendo el mapa de su bisabuelo.', true],
  ['Baile de Máscaras', 'pelicula', 2023, ['Thriller'], '16+', 'ciudad', 103, 'Un crimen en una fiesta de la alta sociedad de Viña del Mar.', false],
  ['Selva Fría', 'pelicula', 2024, ['Documental'], 'TE', 'bosque', 79, 'Un año en el bosque valdiviano, uno de los ecosistemas más antiguos del planeta.', true],
  ['Fuego Cruzado', 'pelicula', 2025, ['Acción'], '18+', 'volcan', 115, 'Dos agentes rivales deben trabajar juntos para detener un atentado en Concepción.', false],
  ['Carta a Mi Hija', 'pelicula', 2026, ['Drama'], '13+', 'ola', 96, 'Una pescadora de Caleta Tortel escribe la historia que nunca le contó a su hija.', true],
  ['Volcán de Risa', 'pelicula', 2024, ['Comedia'], '7+', 'volcan', 90, 'Un comediante fracasado organiza un festival en el pueblo más tranquilo del sur.', false],
  ['La Casa del Cerro', 'pelicula', 2022, ['Terror'], '16+', 'ciudad', 94, 'Una pareja compra una casona en Valparaíso a un precio sospechosamente bajo.', false],
  ['Pumas de Torres', 'pelicula', 2026, ['Documental'], 'TE', 'montanas', 82, 'Seguimos a una madre puma y sus crías durante dos años en Torres del Paine.', true]
];
const EP_WORDS = ['El regreso', 'La señal', 'Marea alta', 'Bajo cero', 'La herencia', 'Puerto seguro', 'Sin retorno', 'El pacto', 'Viento sur', 'La grieta', 'Luz roja', 'El testigo', 'Cenizas', 'Última llamada', 'El mapa', 'Tierra firme', 'La tormenta', 'Encrucijada', 'El silencio', 'Amanecer'];
// Elenco ficticio: se combinan nombres y apellidos para no usar personas reales.
const FN = ['Antonia', 'Daniel', 'Paola', 'Néstor', 'Blanca', 'Alfredo', 'Fernanda', 'Benjamín', 'Amparo', 'Roberto', 'Catalina', 'Gastón', 'Mariana', 'Luis', 'Daniela', 'Marcelo'];
const LN = ['Quilapán', 'Errázuriz', 'Mardones', 'Huenchullán', 'Bascuñán', 'Ojeda', 'Riquelme', 'Aravena', 'Cayupán', 'Larraín', 'Sanhueza', 'Paillalef', 'Villalobos', 'Opazo'];
const FIRST = ['Javiera', 'Matías', 'Catalina', 'Benjamín', 'Antonia', 'Vicente', 'Josefa', 'Tomás', 'Isidora', 'Agustín', 'Florencia', 'Martín', 'Emilia', 'Joaquín', 'Trinidad', 'Lucas', 'Fernanda', 'Diego', 'Valentina', 'Sebastián', 'Constanza', 'Ignacio', 'Francisca', 'Cristóbal', 'Amanda', 'Felipe', 'Renata', 'Gaspar', 'Maite', 'Bastián'];
const LAST = ['Rojas', 'Muñoz', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes'];
const COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#ea580c', '#16a34a', '#2563eb', '#db2777', '#0d9488', '#ca8a04', '#9333ea'];

export function seed() {
  const r = rng(777);
  const now = Date.now();
  const plans = [
    { id: 'basico', name: 'Básico', price: 5990, quality: 'HD 720p', maxQuality: '720p', screens: 1, downloads: false, ads: true, active: true, highlight: false, features: ['1 pantalla a la vez', 'Calidad HD 720p', 'Con anuncios breves'] },
    { id: 'estandar', name: 'Estándar', price: 8990, quality: 'Full HD 1080p', maxQuality: '1080p', screens: 2, downloads: true, ads: false, active: true, highlight: true, features: ['2 pantallas a la vez', 'Full HD 1080p', 'Sin anuncios', 'Descargas en 2 dispositivos'] },
    { id: 'premium', name: 'Premium', price: 11990, quality: '4K + HDR', maxQuality: '4K', screens: 4, downloads: true, ads: false, active: true, highlight: false, features: ['4 pantallas a la vez', '4K Ultra HD + HDR', 'Sin anuncios', 'Audio espacial', 'Descargas en 6 dispositivos'] }
  ];

  const titles = TITLES.map(([title, type, year, genres, maturity, motif, sz, synopsis, original], i) => {
    const id = 't' + (i + 1);
    const t = {
      id, title, type, year, genres, maturity, synopsis, original,
      art: { motif, hue: Math.round((i * 47) % 360 - 180) / 2, variant: i % 4 },
      cast: Array.from({ length: 4 }, (_, k) => `${FN[(i * 3 + k * 5) % FN.length]} ${LN[(i * 7 + k * 3) % LN.length]}`),
      director: `${FN[(i * 5 + 2) % FN.length]} ${LN[(i * 11 + 1) % LN.length]}`,
      score: Math.round((3.4 + r() * 1.5) * 10) / 10, trending: r.int(10, 100),
      status: 'publicado',
      availableFrom: iso(now - r.int(20, 400) * DAY),
      availableTo: r.bool(.15) ? iso(now + r.int(5, 40) * DAY) : null,
      createdAt: iso(now - r.int(20, 400) * DAY)
    };
    if (type === 'serie') {
      t.seasons = sz.map((n, s) => ({ n: s + 1, episodes: Array.from({ length: n }, (_, e) => ({ id: `${id}s${s + 1}e${e + 1}`, n: e + 1, title: EP_WORDS[(i + s * 3 + e) % EP_WORDS.length], duration: r.int(24, 55), synopsis: `Capítulo ${e + 1}: los personajes enfrentan nuevas pruebas mientras ${['un secreto sale a la luz', 'la tensión crece', 'el pasado vuelve', 'todo parece perdido', 'surge una alianza inesperada'][e % 5]}.` })) }));
    } else t.duration = sz;
    return t;
  });
  // Ventanas de licencia: un título próximo a estrenar y uno vencido
  titles[9].availableFrom = iso(now - 3 * DAY);
  titles[27].availableFrom = iso(now + 9 * DAY); titles[27].status = 'publicado';
  titles[34].availableTo = iso(now - 5 * DAY);
  titles[18].status = 'borrador';

  const users = [
    { id: 'u-admin', name: 'Sofía Lagos', email: 'admin@andesplus.cl', password: 'demo123', role: 'admin', color: '#e11d48', demo: true, active: true, createdAt: iso(now - 600 * DAY) },
    { id: 'u-editor', name: 'Martín Cárcamo', email: 'editor@andesplus.cl', password: 'demo123', role: 'editor', color: '#7c3aed', demo: true, active: true, createdAt: iso(now - 400 * DAY) },
    { id: 'u-soporte', name: 'Paula Reyes', email: 'soporte@andesplus.cl', password: 'demo123', role: 'soporte', color: '#0891b2', demo: true, active: true, createdAt: iso(now - 300 * DAY) },
    { id: 'u-sub', name: 'Javier Muñoz', email: 'javier@correo.cl', password: 'demo123', role: 'suscriptor', color: '#2563eb', demo: true, active: true, plan: 'estandar', subStatus: 'activa', joinedAt: iso(now - 340 * DAY), parentalPin: '1234', pinLevel: '18+',
      devices: [{ id: 'd1', name: 'Smart TV living', type: 'Smart TV', lastSeen: iso(now - 2 * 36e5) }, { id: 'd2', name: 'iPhone de Javier', type: 'Celular', lastSeen: iso(now - 20 * 36e5) }, { id: 'd3', name: 'Notebook', type: 'Computador', lastSeen: iso(now - 6 * DAY) }],
      card: { brand: 'Visa', last4: '4242' }, createdAt: iso(now - 340 * DAY) }
  ];
  // Suscriptores generados: altas en los últimos 14 meses, algunos cancelados.
  for (let i = 0; i < 150; i++) {
    const f = FIRST[i % FIRST.length], l = LAST[(i * 7 + 3) % LAST.length];
    const joined = now - Math.pow(r(), 0.8) * 420 * DAY;
    const plan = r.pick(['basico', 'estandar', 'estandar', 'premium', 'estandar', 'basico']);
    let subStatus = 'activa', cancelledAt = null;
    if (r.bool(.2)) { subStatus = 'cancelada'; cancelledAt = iso(joined + (now - joined) * (.3 + r() * .7)); }
    else if (r.bool(.05)) subStatus = 'morosa';
    else if (now - joined < 7 * DAY) subStatus = 'prueba';
    users.push({ id: 's' + i, name: `${f} ${l}`, email: `${f}.${l}${i}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@correo.cl', password: 'demo123', role: 'suscriptor', color: COLORS[i % COLORS.length], active: true, plan, subStatus, joinedAt: iso(joined), cancelledAt,
      devices: [{ id: 'd' + i, name: r.pick(DEVICES), type: r.pick(DEVICES), lastSeen: iso(now - r.int(1, 200) * 36e5) }], card: { brand: r.pick(['Visa', 'Mastercard']), last4: String(r.int(1000, 9999)) }, createdAt: iso(joined) });
  }

  const profiles = [
    { id: 'p1', userId: 'u-sub', name: 'Javier', color: '#2563eb', avatar: '🦊', kids: false, pin: '', myList: ['t3', 't10', 't17', 't22'], lang: 'es' },
    { id: 'p2', userId: 'u-sub', name: 'Carla', color: '#db2777', avatar: '🦉', kids: false, pin: '0000', myList: ['t15', 't21', 't23'], lang: 'es' },
    { id: 'p3', userId: 'u-sub', name: 'Niños', color: '#16a34a', avatar: '🐧', kids: true, pin: '', myList: ['t12', 't24', 't29'], lang: 'es' }
  ];

  // Progreso "continuar viendo" del suscriptor demo
  const progress = [];
  const addP = (profileId, tid, ep, frac, hoursAgo) => {
    const t = titles.find(x => x.id === tid);
    const e = ep && t.seasons.flatMap(s => s.episodes).find(x => x.id === ep);
    const duration = (e ? e.duration : t.duration) * 60;
    progress.push({ profileId, titleId: tid, episodeId: ep || null, position: Math.round(duration * frac), duration, updatedAt: iso(now - hoursAgo * 36e5), device: 'Smart TV' });
  };
  addP('p1', 't1', 't1s1e4', .42, 3); addP('p1', 't3', 't3s1e2', .7, 26); addP('p1', 't17', null, .25, 50); addP('p1', 't4', 't4s2e1', .1, 90);
  addP('p2', 't15', 't15s1e5', .55, 10); addP('p2', 't21', null, .8, 70);
  addP('p3', 't12', 't12s1e3', .3, 5); addP('p3', 't29', null, .6, 30);

  // Sesiones de visualización (para horas vistas, top títulos y dispositivos)
  const views = [];
  const subs = users.filter(u => u.role === 'suscriptor');
  const pop = titles.map(t => t.trending + (t.original ? 20 : 0));
  const popSum = pop.reduce((a, b) => a + b, 0);
  const pickTitle = () => { let x = r() * popSum; for (let i = 0; i < titles.length; i++) { x -= pop[i]; if (x <= 0) return titles[i]; } return titles[0]; };
  for (let i = 0; i < 1600; i++) {
    const u = r.pick(subs); const t = pickTitle();
    const start = Date.parse(u.joinedAt), end = u.cancelledAt ? Date.parse(u.cancelledAt) : now;
    const at = start + r() * (end - start);
    views.push({ userId: u.id, titleId: t.id, minutes: r.int(12, t.type === 'pelicula' ? t.duration : 110), device: r.pick(['Smart TV', 'Smart TV', 'Celular', 'Celular', 'Computador', 'Tablet', 'Consola']), createdAt: iso(at) });
  }

  const collections = [
    { id: 'c-cont', name: 'Continuar viendo', type: 'auto', source: 'continuar', order: 1, active: true },
    { id: 'c-trend', name: 'Tendencias en Andes+', type: 'auto', source: 'tendencias', order: 2, active: true },
    { id: 'c-orig', name: 'Originales Andes+', type: 'manual', titleIds: titles.filter(t => t.original).slice(0, 12).map(t => t.id), order: 3, active: true },
    { id: 'c-list', name: 'Mi lista', type: 'auto', source: 'milista', order: 4, active: true },
    { id: 'c-new', name: 'Recién agregados', type: 'auto', source: 'nuevos', order: 5, active: true },
    { id: 'c-thr', name: 'Thrillers que no te dejarán dormir', type: 'genre', genre: 'Thriller', order: 6, active: true },
    { id: 'c-com', name: 'Para reír', type: 'genre', genre: 'Comedia', order: 7, active: true },
    { id: 'c-doc', name: 'Documentales de nuestra tierra', type: 'genre', genre: 'Documental', order: 8, active: true },
    { id: 'c-kids', name: 'Para toda la familia', type: 'genre', genre: 'Infantil', order: 9, active: true },
    { id: 'c-sci', name: 'Ciencia ficción', type: 'genre', genre: 'Ciencia ficción', order: 10, active: true },
    { id: 'c-ter', name: 'Terror', type: 'genre', genre: 'Terror', order: 11, active: false }
  ];

  const tickets = [
    { userId: 's3', subject: 'No puedo reproducir en mi Smart TV', status: 'abierto', priority: 'alta', category: 'Reproducción', messages: [{ from: 'user', text: 'Desde ayer la app se queda cargando en el TV del living.', at: iso(now - 5 * 36e5) }], createdAt: iso(now - 5 * 36e5) },
    { userId: 's11', subject: 'Cobro duplicado en octubre', status: 'en_curso', priority: 'alta', category: 'Facturación', messages: [{ from: 'user', text: 'Me cobraron dos veces el plan Estándar este mes.', at: iso(now - 2 * DAY) }, { from: 'agent', agentId: 'u-soporte', text: 'Hola, ya revisamos tu caso: el segundo cobro será reversado en 5 días hábiles.', at: iso(now - 1 * DAY) }], createdAt: iso(now - 2 * DAY) },
    { userId: 'u-sub', subject: '¿Cuándo llega la temporada 2 de Puerto Frío?', status: 'resuelto', priority: 'baja', category: 'Catálogo', messages: [{ from: 'user', text: '¡Me encantó la serie! ¿Habrá segunda temporada?', at: iso(now - 9 * DAY) }, { from: 'agent', agentId: 'u-soporte', text: '¡Gracias! Pronto tendremos novedades, atento a tus notificaciones.', at: iso(now - 8 * DAY) }], createdAt: iso(now - 9 * DAY) },
    { userId: 's27', subject: 'Olvidé el PIN del perfil infantil', status: 'abierto', priority: 'media', category: 'Cuenta', messages: [{ from: 'user', text: 'Mi hijo cambió el PIN y no lo recordamos.', at: iso(now - 26 * 36e5) }], createdAt: iso(now - 26 * 36e5) },
    { userId: 's40', subject: 'Subtítulos desfasados en Nebulosa', status: 'en_curso', priority: 'media', category: 'Reproducción', messages: [{ from: 'user', text: 'En el capítulo 3 los subtítulos van 2 segundos atrasados.', at: iso(now - 3 * DAY) }], createdAt: iso(now - 3 * DAY) },
    { userId: 's52', subject: 'Quiero cambiar mi correo', status: 'resuelto', priority: 'baja', category: 'Cuenta', messages: [{ from: 'user', text: '¿Cómo cambio el correo de la cuenta?', at: iso(now - 15 * DAY) }, { from: 'agent', agentId: 'u-soporte', text: 'Puedes hacerlo desde Cuenta → Datos personales.', at: iso(now - 14 * DAY) }], createdAt: iso(now - 15 * DAY) }
  ];

  const _log = [
    { at: iso(now - 2 * 36e5), action: 'catálogo', detail: 'Se publicó "Nebulosa" (temporada 1)', user: 'u-editor' },
    { at: iso(now - 20 * 36e5), action: 'destacado', detail: 'Billboard actualizado: Puerto Frío', user: 'u-editor' },
    { at: iso(now - 30 * 36e5), action: 'soporte', detail: 'Ticket "Cobro duplicado en octubre" en curso', user: 'u-soporte' },
    { at: iso(now - 3 * DAY), action: 'planes', detail: 'Plan Premium: $11.990', user: 'u-admin' },
    { at: iso(now - 4 * DAY), action: 'colecciones', detail: 'Reordenadas las filas de la portada', user: 'u-editor' }
  ];

  return {
    _log, plans, titles, users, profiles, progress, views, collections, tickets, notifications: [],
    settings: {
      billboard: ['t3', 't10', 't1'],
      heroTitle: 'Historias que nacen en el sur del mundo',
      heroSubtitle: 'Series y películas originales, documentales y contenido para toda la familia. Cancela cuando quieras.',
      trialDays: 7,
      footerNote: 'Andes+ es una plataforma ficticia creada como demostración.'
    }
  };
}
