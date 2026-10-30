// Datos semilla de Minera Altiplano · Inducción XR (empresa ficticia).
import { rng } from '../../../assets/core/db.js';
import { makeRut } from '../shared/rut.js';
import { ANCHORS } from '../shared/anchors.js';

const DAY = 864e5;
const iso = t => new Date(t).toISOString();
const pt = (anchor, title, text, id = anchor) => ({ id, anchor, title, text, pos: ANCHORS[anchor].pos, cam: ANCHORS[anchor].cam });

export const AREAS = ['Planta', 'Mina', 'Mantención', 'Logística', 'Administración'];

export function moduleSeed() {
  return [
    {
      id: 'bienvenida', order: 1, title: 'Bienvenida', mode: 'plant', minutes: 5, tags: ['3D', 'Guía virtual'], active: true,
      desc: 'Conoce a Ana, tu guía, la operación de la planta y nuestras Reglas que Salvan Vidas.',
      intro: 'Ana te acompañará en un recorrido guiado de 4 paradas. Puedes reproducirlo automáticamente o visitar cada parada a tu ritmo.',
      kicker: 'Parada', view: { cam: [-10, 16, 30], target: [0, 0, 2] },
      points: [
        pt('guia', '¡Hola! Soy Ana, tu guía', 'Bienvenida o bienvenido a Minera Altiplano. Durante esta inducción conocerás nuestra planta de procesamiento, los riesgos principales y cómo actuar ante una emergencia. Tu seguridad es lo primero.'),
        pt('planta', 'Nuestra planta Altiplano Norte', 'Aquí recibimos, chancamos y almacenamos mineral e insumos. La planta se divide en zonas: almacenamiento con racks, tránsito de grúas horquilla, chancado y pasillos peatonales demarcados.'),
        pt('operacion', 'Qué hacemos', 'El chancador reduce el tamaño del mineral y la correa transportadora lo lleva al acopio. Son equipos de alta energía: solo personal autorizado puede ingresar a la zona achurada.'),
        pt('reglas', 'Reglas que Salvan Vidas', '1) Usa siempre tu EPP. 2) Camina solo por pasillos peatonales. 3) Nunca intervengas un equipo sin bloqueo (LOTO). 4) Respeta la distancia con equipos móviles. 5) Si algo no es seguro, detén el trabajo y repórtalo.')
      ]
    },
    {
      id: 'epp', order: 2, title: 'Seguridad y EPP', mode: 'epp', minutes: 7, tags: ['3D', 'Interactivo'], active: true,
      desc: 'Equipa a un maniquí 3D con el Elemento de Protección Personal correcto para ingresar a planta.',
      intro: 'Selecciona los 5 elementos de protección obligatorios para ingresar a la planta. Cuidado: hay opciones que no corresponden. También puedes tocar una parte del cuerpo en el modelo para recibir una pista.',
      points: [
        { id: 'casco', title: 'Casco de seguridad', e: '⛑️', part: 'head', text: 'Protege la cabeza de golpes y caída de objetos. Debe tener barbiquejo y estar vigente.' },
        { id: 'lentes', title: 'Lentes de seguridad', e: '🥽', part: 'eyes', text: 'Protegen los ojos de partículas y proyecciones. Úsalos siempre, incluso sobre lentes ópticos (sobrelentes).' },
        { id: 'guantes', title: 'Guantes de seguridad', e: '🧤', part: 'hands', text: 'Previenen cortes, abrasiones y contacto con sustancias. Elige el tipo según la tarea.' },
        { id: 'zapatos', title: 'Zapatos de seguridad', e: '🥾', part: 'feet', text: 'Puntera y plantilla de acero protegen contra aplastamiento y perforación.' },
        { id: 'chaleco', title: 'Chaleco reflectante', e: '🦺', part: 'torso', text: 'Te hace visible para operadores de equipos móviles, de día y de noche.' }
      ],
      distractors: [
        { id: 'gorro', title: 'Gorro de lana', e: '🧶', text: 'Un gorro no protege contra impactos. En planta el casco es obligatorio (puedes usar una capucha bajo el casco).' },
        { id: 'audifonos', title: 'Audífonos con música', e: '🎧', text: 'Distraen e impiden oír alarmas y bocinas. Cuando hay ruido se usa protector auditivo certificado, no audífonos.' },
        { id: 'sandalias', title: 'Sandalias', e: '🩴', text: 'Dejan el pie expuesto a aplastamientos, cortes y derrames. Se requieren zapatos de seguridad.' }
      ],
      parts: {
        head: 'La cabeza puede recibir golpes o caída de objetos. ¿Qué la protege?',
        eyes: 'Los ojos están expuestos a polvo y proyección de partículas. ¿Qué elemento usarías?',
        hands: 'Las manos manipulan materiales con bordes y sustancias. ¿Cómo las proteges?',
        feet: 'Los pies pueden sufrir aplastamientos o perforaciones. ¿Qué calzado corresponde?',
        torso: 'Debes ser visible para los operadores de grúas horquilla. ¿Qué te ayuda?'
      }
    },
    {
      id: 'recorrido', order: 3, title: 'Recorrido por la planta', mode: 'plant', minutes: 10, tags: ['3D', 'VR'], active: true,
      desc: 'Explora la planta en 3D y descubre 7 puntos de interés: zonas de riesgo, equipos y salidas.',
      intro: 'Visita los puntos de interés. Toca los marcadores numerados en la escena o usa la lista. El modo «Recorrido guiado» anima la cámara entre cada punto.',
      kicker: 'Punto de interés', view: { cam: [-12, 20, 30], target: [0, 0, 0] },
      points: [
        pt('acceso', 'Control de acceso', 'Registra tu ingreso con tu credencial en el torniquete. Aquí se verifica que traigas tu EPP completo. Visitas siempre acompañadas.'),
        pt('pasillo', 'Pasillos peatonales', 'Las líneas amarillas delimitan el pasillo peatonal. Camina siempre dentro de él, sin usar el celular, y cruza solo por los pasos cebra.'),
        pt('racks', 'Zona de almacenamiento (racks)', 'Nunca escales un rack ni superes la carga máxima indicada en la placa. Si ves un montante dañado o una carga inestable, repórtalo de inmediato.'),
        pt('grua', 'Tránsito de grúas horquilla', 'Mantén al menos 3 metros de distancia de un equipo en movimiento y establece contacto visual con el operador antes de cruzar. El equipo móvil no siempre puede verte.'),
        pt('chancador', 'Chancador y correa transportadora', 'Zona restringida (achurado amarillo/negro). Antes de cualquier intervención se aplica bloqueo y etiquetado (LOTO) con candado personal. Nunca retires una guarda.'),
        pt('extintor', 'Extintores', 'Hay extintores PQS cada 15 a 20 m, señalizados en rojo. Para usarlo: retira el pasador, apunta a la base del fuego, aprieta la palanca y barre de lado a lado.'),
        pt('salida', 'Salidas de emergencia', 'Señalizadas en verde y con iluminación de emergencia. Nunca deben estar obstruidas ni bloqueadas con llave. Ubica siempre la salida más cercana a tu puesto.')
      ]
    },
    {
      id: 'emergencias', order: 4, title: 'Emergencias y evacuación', mode: 'plant', minutes: 8, tags: ['3D', 'Simulacro'], active: true,
      desc: 'Aprende el protocolo de evacuación y sigue la ruta animada hasta el punto de encuentro.',
      intro: 'Revisa los pasos del protocolo y luego ejecuta el simulacro: verás la ruta de evacuación animada desde la zona de chancado hasta el punto de encuentro.',
      kicker: 'Paso', route: true, extra: ['simulacro'], view: { cam: [-2, 24, 32], target: [8, 0, 2] },
      points: [
        pt('alarma', 'Reconoce la alarma', 'Sirena continua y balizas rojas = evacuación general. Mantén la calma y escucha las instrucciones por altavoz.'),
        pt('detener', 'Detén tu trabajo de forma segura', 'Detén el equipo que operas, deja las herramientas en un lugar seguro y no te detengas a buscar pertenencias.'),
        pt('ruta', 'Sigue la ruta de evacuación', 'Sigue las flechas verdes por el pasillo peatonal. Camina rápido, sin correr, y ayuda a quien lo necesite. Nunca uses un equipo móvil para evacuar.'),
        pt('salidaE', 'Sal por la salida de emergencia', 'Usa la salida más cercana. Si hay humo, avanza agachado. Una vez fuera, no vuelvas a entrar por ningún motivo.'),
        pt('encuentro', 'Dirígete al punto de encuentro', 'Repórtate con el líder de evacuación para el conteo de personas. Permanece allí hasta que se autorice el regreso.')
      ]
    },
    {
      id: 'evaluacion', order: 5, title: 'Evaluación final', mode: 'quiz', minutes: 10, tags: ['Quiz', 'Certificado'], active: true, quizCount: 10,
      desc: 'Preguntas sobre lo aprendido, tomadas del banco de preguntas. Con el puntaje mínimo obtienes tu certificado digital.'
    }
  ];
}

const Q = (moduleId, q, o, a, why, difficulty = 'media') => ({ moduleId, q, options: o, answer: a, why, difficulty, active: true });
function questionSeed() {
  return [
    Q('epp', '¿Qué elemento protege la cabeza ante la caída de objetos?', ['Gorro de lana', 'Casco de seguridad', 'Lentes de seguridad', 'Chaleco reflectante'], 1, 'El casco con barbiquejo es obligatorio en toda la planta.', 'baja'),
    Q('emergencias', '¿De qué color es la señalética de las salidas de emergencia?', ['Rojo', 'Amarillo', 'Verde', 'Azul'], 2, 'Verde indica condición segura: salidas, rutas de evacuación y puntos de encuentro.', 'baja'),
    Q('emergencias', 'Suena la alarma de evacuación. ¿Qué haces primero?', ['Termino mi tarea y luego salgo', 'Detengo mi trabajo de forma segura y sigo la ruta de evacuación', 'Voy a buscar mis pertenencias', 'Espero a ver si es un simulacro'], 1, 'Detén el trabajo de forma segura y evacúa de inmediato, sin buscar pertenencias.'),
    Q('recorrido', '¿Qué distancia mínima debes mantener con una grúa horquilla en movimiento?', ['50 cm', '1 metro', '3 metros', 'No hay distancia mínima'], 2, 'Al menos 3 metros, y contacto visual con el operador antes de cruzar.'),
    Q('recorrido', '¿Cómo se demarcan los pasillos peatonales en la planta?', ['Con líneas amarillas en el piso', 'Con conos rojos', 'No están demarcados', 'Con cinta azul'], 0, 'Las líneas amarillas delimitan por dónde se puede caminar con seguridad.', 'baja'),
    Q('recorrido', 'Antes de intervenir una máquina como el chancador, se debe:', ['Pedir a un compañero que vigile', 'Aplicar bloqueo y etiquetado (LOTO)', 'Retirar la guarda para ver mejor', 'Hacerlo rápido mientras está detenida'], 1, 'El bloqueo con candado personal evita que el equipo se energice durante la intervención.', 'alta'),
    Q('recorrido', 'Al usar un extintor, ¿hacia dónde debes apuntar?', ['A la parte alta de las llamas', 'Al humo', 'A la base del fuego', 'Al techo'], 2, 'Apuntar a la base del fuego ataca el combustible. Luego barre de lado a lado.'),
    Q('bienvenida', 'Detectas una condición insegura en tu área. ¿Qué corresponde?', ['Ignorarla si no es mi tarea', 'Detener el trabajo y reportarla a mi supervisor', 'Comentarla al final del turno', 'Sacarle una foto para redes sociales'], 1, 'Todas las personas tienen la facultad y el deber de detener un trabajo inseguro.'),
    Q('emergencias', 'Al llegar al punto de encuentro debes:', ['Retirarte a tu casa', 'Volver por tus herramientas', 'Reportarte con el líder de evacuación para el conteo', 'Esperar dentro de tu vehículo'], 2, 'El conteo permite saber si falta alguien y dirigir el rescate.'),
    Q('epp', '¿Por qué no se deben usar audífonos con música en la planta?', ['Porque se pueden perder', 'Porque impiden oír alarmas, bocinas y advertencias', 'Porque gastan batería', 'Sí se pueden usar a bajo volumen'], 1, 'Necesitas oír tu entorno. Ante ruido se usa protector auditivo certificado.'),
    Q('epp', 'Si usas lentes ópticos, ¿cómo proteges tus ojos en planta?', ['No necesito protección adicional', 'Con sobrelentes de seguridad certificados', 'Con lentes de sol', 'Me los saco y uso solo el casco'], 1, 'Los lentes ópticos no son EPP: se usan sobrelentes certificados.', 'media'),
    Q('epp', '¿Qué característica tiene el calzado de seguridad?', ['Suela de goma blanda', 'Puntera y plantilla resistentes', 'Debe ser de color negro', 'Caña baja para mayor movilidad'], 1, 'La puntera y la plantilla protegen contra aplastamiento y perforación.'),
    Q('epp', 'El chaleco reflectante sirve principalmente para:', ['Abrigarse en turnos de noche', 'Ser visible para operadores de equipos móviles', 'Identificar al supervisor', 'Guardar herramientas'], 1, 'La alta visibilidad reduce el riesgo de atropello.', 'baja'),
    Q('bienvenida', '¿Cuál de estas es una Regla que Salva Vidas?', ['Trabajar rápido para cumplir la meta', 'Nunca intervenir un equipo sin bloqueo', 'Usar el celular mientras camino', 'Tomar atajos entre racks'], 1, 'El bloqueo (LOTO) es una de nuestras reglas críticas.'),
    Q('bienvenida', '¿Quién puede detener un trabajo inseguro?', ['Solo el gerente', 'Solo el prevencionista', 'Cualquier persona', 'Nadie, se debe terminar la tarea'], 2, 'Toda persona tiene la facultad de detener un trabajo inseguro.', 'baja'),
    Q('recorrido', '¿Qué debes hacer si ves un montante de rack dañado?', ['Seguir trabajando con cuidado', 'Repararlo yo mismo', 'Reportarlo de inmediato y no cargar el rack', 'Apoyar más carga para estabilizarlo'], 2, 'Un montante dañado puede colapsar: se reporta y se bloquea el uso.'),
    Q('recorrido', '¿Cómo se ingresa a la planta en el control de acceso?', ['Saltando el torniquete si hay apuro', 'Con credencial y EPP completo', 'Sin registro si es por poco tiempo', 'Solo con casco'], 1, 'El registro con credencial y la verificación de EPP son obligatorios.', 'baja'),
    Q('emergencias', 'Si hay humo durante la evacuación, debes:', ['Correr erguido', 'Avanzar agachado, cerca del piso', 'Esperar en tu puesto', 'Usar el ascensor'], 1, 'El aire más limpio está cerca del piso.'),
    Q('emergencias', '¿Se puede volver a entrar a la planta para buscar pertenencias?', ['Sí, si es rápido', 'Solo con autorización del líder de evacuación', 'Sí, si no hay humo', 'Sí, por la salida más cercana'], 1, 'Nadie reingresa hasta que se autorice el regreso.', 'media'),
    Q('emergencias', '¿Se puede usar una grúa horquilla para evacuar?', ['Sí, es más rápido', 'Nunca', 'Solo el operador', 'Solo si hay heridos'], 1, 'Los equipos móviles no se usan para evacuar: aumentan el riesgo.', 'media'),
    Q('recorrido', 'La zona achurada amarillo/negro indica:', ['Zona de descanso', 'Zona restringida, solo personal autorizado', 'Estacionamiento', 'Ruta de evacuación'], 1, 'El achurado marca zonas de riesgo con acceso restringido.', 'baja'),
    Q('bienvenida', '¿Qué haces si tienes dudas sobre cómo realizar una tarea de forma segura?', ['La hago igual', 'Pregunto a mi supervisor antes de empezar', 'Busco un video en internet', 'Espero que otro la haga'], 1, 'Preguntar antes de actuar es parte de la cultura preventiva.'),
    Q('recorrido', '¿Cada cuántos metros aproximadamente hay extintores en planta?', ['Cada 100 m', 'Cada 15 a 20 m', 'Solo en la entrada', 'Uno por piso'], 1, 'La distancia máxima de recorrido hasta un extintor es de 15 a 20 m.', 'alta'),
    Q('epp', '¿Cuándo debes revisar tu EPP?', ['Una vez al año', 'Antes de cada uso', 'Solo si se rompe', 'Cuando lo pide el supervisor'], 1, 'La inspección previa detecta daños que anulan la protección.', 'media')
  ];
}

function planSeed() {
  return [
    { id: 'p-igs', code: 'IGS', name: 'Inducción General de Seguridad', description: 'Programa obligatorio para todo el personal propio que ingresa a la Planta Altiplano Norte.', moduleIds: ['bienvenida', 'epp', 'recorrido', 'emergencias', 'evaluacion'], deadlineDays: 14, validityMonths: 12, passScore: 80, areas: [...AREAS], types: ['empleado'], practical: false, active: true, color: 'primary' },
    { id: 'p-ict', code: 'ICT', name: 'Inducción Contratistas', description: 'Inducción para empresas contratistas, con evaluación práctica en terreno aprobada por el supervisor.', moduleIds: ['bienvenida', 'epp', 'emergencias', 'evaluacion'], deadlineDays: 7, validityMonths: 6, passScore: 80, areas: [...AREAS], types: ['contratista'], practical: true, active: true, color: 'accent' },
    { id: 'p-rap', code: 'RAP', name: 'Reinducción Anual Planta', description: 'Actualización anual de riesgos críticos y protocolo de emergencia para áreas operativas.', moduleIds: ['recorrido', 'emergencias', 'evaluacion'], deadlineDays: 30, validityMonths: 12, passScore: 80, areas: ['Planta', 'Mantención'], types: ['empleado', 'contratista'], practical: false, active: true, color: 'info' },
    { id: 'p-oem', code: 'OEM', name: 'Tránsito y Equipos Móviles', description: 'Convivencia con grúas horquilla y camiones. Requiere evaluación práctica de conducción defensiva.', moduleIds: ['epp', 'recorrido', 'evaluacion'], deadlineDays: 21, validityMonths: 24, passScore: 85, areas: ['Logística', 'Mina'], types: ['empleado', 'contratista'], practical: true, active: true, color: 'warning' }
  ];
}

const FIRST = ['Camila', 'Matías', 'Valentina', 'Benjamín', 'Javiera', 'Vicente', 'Fernanda', 'Martín', 'Constanza', 'Diego', 'Catalina', 'Joaquín', 'Antonia', 'Tomás', 'Francisca', 'Sebastián', 'Daniela', 'Cristóbal', 'Paula', 'Felipe', 'Ignacia', 'Nicolás', 'Isidora', 'Gonzalo', 'Macarena', 'Rodrigo', 'Bárbara', 'Ignacio', 'Carla', 'Pablo', 'Rocío', 'Esteban', 'Daniela', 'Luis', 'Karen', 'Héctor', 'Yasna', 'Patricio', 'Marcela', 'Claudio'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Mamani', 'Quispe', 'Choque', 'Condori', 'Cortés', 'Carrasco'];
const CARGOS = { Planta: ['Operador de chancado', 'Operador de planta', 'Ayudante de planta', 'Jefe de turno'], Mina: ['Operador de camión', 'Operador de cargador', 'Perforista', 'Tronador'], Mantención: ['Mecánico', 'Eléctrico', 'Soldador', 'Lubricador'], Logística: ['Operador de grúa horquilla', 'Bodeguero', 'Despachador', 'Conductor'], Administración: ['Analista', 'Asistente administrativo', 'Ingeniero de procesos', 'Practicante'] };
const COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#16a34a', '#ea580c', '#2563eb', '#db2777', '#0d9488', '#ca8a04', '#4f46e5'];
const slugMail = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '.');

export function seed() {
  const r = rng(2026);
  const now = Date.now();
  const modules = moduleSeed();
  const plans = planSeed();
  const companies = [
    { id: 'c-ma', name: 'Minera Altiplano', rut: '96.512.340-1', kind: 'propia', contact: 'Gerencia de Personas', email: 'personas@altiplano.cl', phone: '+56 55 241 0000', active: true },
    { id: 'c-sa', name: 'Servicios Andinos Ltda.', rut: '77.120.450-3', kind: 'contratista', contact: 'Loreto Vidal', email: 'contacto@serviciosandinos.cl', phone: '+56 9 8123 4411', active: true, service: 'Aseo y mantención de instalaciones' },
    { id: 'c-mc', name: 'Montajes Cordillera SpA', rut: '76.884.210-K', kind: 'contratista', contact: 'Hernán Bustos', email: 'hbustos@montajescordillera.cl', phone: '+56 9 7712 0098', active: true, service: 'Montaje industrial y estructuras' },
    { id: 'c-ts', name: 'Transportes Salar Norte', rut: '78.443.120-5', kind: 'contratista', contact: 'Ximena Ugarte', email: 'operaciones@salarnorte.cl', phone: '+56 9 6650 2231', active: true, service: 'Transporte de mineral e insumos' },
    { id: 'c-ip', name: 'Ingeniería Puna', rut: '76.301.778-2', kind: 'contratista', contact: 'Andrés Lagos', email: 'alagos@ingpuna.cl', phone: '+56 9 9003 1180', active: true, service: 'Ingeniería eléctrica y control' },
    { id: 'c-at', name: 'Aseo Industrial Tamarugo', rut: '77.905.660-8', kind: 'contratista', contact: 'Mónica Rivera', email: 'mrivera@tamarugo.cl', phone: '+56 9 5541 7720', active: false, service: 'Limpieza industrial' }
  ];

  const users = [
    { id: 'u-admin', name: 'Valentina Quispe', email: 'admin@altiplano.cl', password: 'admin123', role: 'admin', color: '#7c3aed', demo: true, active: true, area: 'Administración', companyId: 'c-ma', cargo: 'Gerenta de Personas', createdAt: iso(now - 400 * DAY) },
    { id: 'u-prev', name: 'Rodrigo Mamani', email: 'prevencion@altiplano.cl', password: 'prev123', role: 'prevencionista', color: '#ea580c', demo: true, active: true, area: 'Administración', companyId: 'c-ma', cargo: 'Experto en prevención de riesgos', createdAt: iso(now - 380 * DAY) },
    { id: 'u-sup', name: 'Carolina Flores', email: 'supervisor@altiplano.cl', password: 'super123', role: 'supervisor', color: '#0891b2', demo: true, active: true, area: 'Planta', companyId: 'c-ma', cargo: 'Supervisora de planta', createdAt: iso(now - 360 * DAY) },
    { id: 'u-sup2', name: 'Jorge Cáceres', email: 'jcaceres@altiplano.cl', password: 'super123', role: 'supervisor', color: '#16a34a', active: true, area: 'Mina', companyId: 'c-ma', cargo: 'Supervisor de mina', createdAt: iso(now - 350 * DAY) },
    { id: 'u-sup3', name: 'Patricia Ayala', email: 'payala@altiplano.cl', password: 'super123', role: 'supervisor', color: '#db2777', active: true, area: 'Mantención', companyId: 'c-ma', cargo: 'Supervisora de mantención', createdAt: iso(now - 340 * DAY) },
    { id: 'u-sup4', name: 'Mauricio Tapia', email: 'mtapia@altiplano.cl', password: 'super123', role: 'supervisor', color: '#ca8a04', active: true, area: 'Logística', companyId: 'c-ma', cargo: 'Jefe de logística', createdAt: iso(now - 330 * DAY) },
    { id: 'u-cam', name: 'Camila Rojas Soto', email: 'camila.rojas@altiplano.cl', password: '1234', rut: '12.345.678-5', role: 'trabajador', color: '#e11d48', demo: true, active: true, area: 'Planta', companyId: 'c-ma', type: 'empleado', cargo: 'Operadora de planta', supervisorId: 'u-sup', createdAt: iso(now - 300 * DAY) },
    { id: 'u-mat', name: 'Matías Soto Araya', email: 'msoto@montajescordillera.cl', password: '1234', rut: makeRut(16789432), role: 'trabajador', color: '#2563eb', demo: true, active: true, area: 'Planta', companyId: 'c-mc', type: 'contratista', cargo: 'Montajista', supervisorId: 'u-sup', createdAt: iso(now - 40 * DAY) }
  ];
  const supByArea = { Planta: 'u-sup', Mina: 'u-sup2', Mantención: 'u-sup3', Logística: 'u-sup4', Administración: 'u-sup' };
  const usedRut = new Set(users.map(u => u.rut));
  for (let i = 0; i < 58; i++) {
    const name = `${r.pick(FIRST)} ${r.pick(LAST)} ${r.pick(LAST)}`;
    const area = r() < 0.08 ? 'Administración' : r.pick(AREAS.slice(0, 4));
    const company = r() < 0.55 ? companies[0] : r.pick(companies.slice(1));
    let rut; do { rut = makeRut(r.int(9_000_000, 25_999_999)); } while (usedRut.has(rut)); usedRut.add(rut);
    const domain = company.kind === 'propia' ? 'altiplano.cl' : company.email.split('@')[1];
    const [f, l] = name.split(' ');
    users.push({
      id: 'w' + i, name, email: `${slugMail(f)}.${slugMail(l)}${i}@${domain}`.replace(/\.+/g, '.'), password: '1234', rut, role: 'trabajador', color: COLORS[i % COLORS.length],
      active: company.active ? r() > 0.05 : false, area, companyId: company.id, type: company.kind === 'propia' ? 'empleado' : 'contratista',
      cargo: r.pick(CARGOS[area]), supervisorId: supByArea[area], createdAt: iso(now - r.int(20, 330) * DAY)
    });
  }

  // Asignaciones, intentos, certificados
  const assignments = [], attempts = [], certificates = [], notifications = [];
  const qCount = 10;
  const checkpoints = m => m.mode === 'quiz' ? ['aprobado'] : [...m.points.map(p => p.id), ...(m.extra || [])];
  const modById = Object.fromEntries(modules.map(m => [m.id, m]));
  const code = (plan, t) => `MA-${plan.code}-${new Date(t).getFullYear()}-${Math.floor(r() * 36 ** 5).toString(36).toUpperCase().padStart(5, '0')}`;
  const fullProgress = plan => Object.fromEntries(plan.moduleIds.map(id => [id, checkpoints(modById[id])]));
  const timeFor = plan => Object.fromEntries(plan.moduleIds.map(id => [id, Math.max(2, Math.round(modById[id].minutes * (0.7 + r() * 0.9)))]));
  const addAttempts = (a, plan, user, endT, finalPass) => {
    const n = finalPass ? (r() < 0.72 ? 1 : r() < 0.7 ? 2 : 3) : r.int(1, 2);
    for (let k = 0; k < n; k++) {
      const last = k === n - 1;
      const pass = last && finalPass;
      const correct = pass ? r.int(Math.ceil(plan.passScore / 10), 10) : r.int(4, Math.ceil(plan.passScore / 10) - 1);
      attempts.push({ userId: user.id, assignmentId: a.id, planId: plan.id, score: correct * 10, correct, total: qCount, passed: pass, at: iso(endT - (n - 1 - k) * DAY * r.int(1, 3) - r.int(1, 8) * 36e5), durationSec: r.int(240, 900) });
    }
  };

  const issue = (a, plan, user, t, score) => {
    const exp = new Date(t); exp.setMonth(exp.getMonth() + plan.validityMonths);
    const c = { id: 'cert-' + a.id, code: code(plan, t), userId: user.id, planId: plan.id, assignmentId: a.id, issuedAt: iso(t), expiresAt: exp.toISOString(), score, status: 'vigente' };
    certificates.push(c);
    a.certificateId = c.id;
    return c;
  };

  let n = 0;
  users.filter(u => u.role === 'trabajador' && !['u-cam', 'u-mat'].includes(u.id)).forEach(u => {
    const eligible = plans.filter(p => p.types.includes(u.type) && p.areas.includes(u.area));
    const main = eligible.find(p => p.id === (u.type === 'contratista' ? 'p-ict' : 'p-igs'));
    const picks = [main, ...eligible.filter(p => p !== main && r() < 0.4)].filter(Boolean);
    picks.forEach(plan => {
      const created = new Date(u.createdAt).getTime();
      const start = Math.min(now - 2 * DAY, created + r.int(0, 20) * DAY + (plan === main ? 0 : r.int(10, 120) * DAY));
      let assignedAt = Math.min(start, now - DAY);
      let dueAt = assignedAt + plan.deadlineDays * DAY;
      let a = { id: 'a' + (n++), userId: u.id, planId: plan.id, assignedBy: u.supervisorId, assignedAt: iso(assignedAt), dueAt: iso(dueAt), progress: {}, time: {}, quizPassed: false, bestScore: 0, practical: plan.practical ? { status: 'no_iniciada' } : null, createdAt: iso(assignedAt) };
      const roll = r();
      let age = (now - assignedAt) / DAY;
      if (roll >= 0.66 && r() < 0.75) {
        // Las asignaciones aún abiertas suelen ser recientes (algunas quedan vencidas para seguimiento).
        const recent = now - r.int(1, Math.max(2, plan.deadlineDays - 1)) * DAY;
        assignedAt = recent; dueAt = recent + plan.deadlineDays * DAY;
        a.assignedAt = a.createdAt = iso(assignedAt); a.dueAt = iso(dueAt);
      }
      if (roll < 0.66 && age > 3) {
        // completada
        const done = Math.min(now - 3600e3, assignedAt + r.int(1, Math.max(2, plan.deadlineDays + 3)) * DAY);
        a.progress = fullProgress(plan); a.time = timeFor(plan); a.startedAt = iso(assignedAt + 0.4 * DAY);
        const score = r.int(Math.ceil(plan.passScore / 10), 10) * 10;
        addAttempts(a, plan, u, done, true);
        a.quizPassed = true; a.bestScore = score;
        if (plan.practical && r() < 0.4 && now - done < 60 * DAY) {
          a.practical = { status: 'pendiente', requestedAt: iso(done) };
        } else {
          if (plan.practical) a.practical = { status: 'aprobada', by: u.supervisorId, at: iso(done + DAY), notes: r.pick(['Ejecuta la tarea según procedimiento.', 'Buen uso de EPP y bloqueo.', 'Cumple estándar. Reforzar orden y aseo.', 'Sin observaciones.']) };
          a.completedAt = iso(done + (plan.practical ? DAY : 0));
          issue(a, plan, u, done + (plan.practical ? DAY : 0), score);
        }
      } else if (roll < 0.8) {
        // en curso
        const ids = plan.moduleIds.filter(id => modById[id].mode !== 'quiz');
        const k = r.int(1, ids.length);
        ids.slice(0, k).forEach((id, i) => { const cps = checkpoints(modById[id]); a.progress[id] = i < k - 1 ? cps : cps.slice(0, r.int(1, cps.length)); a.time[id] = Math.max(1, Math.round(modById[id].minutes * (0.5 + r()))); });
        a.startedAt = iso(assignedAt + r.int(0, 2) * DAY);
        if (r() < 0.3) addAttempts(a, plan, u, now - r.int(1, 5) * DAY, false);
      } else if (roll < 0.9) {
        // pendiente sin iniciar
      } else {
        // reprobada y vencida o en reintento
        a.progress = fullProgress(plan); delete a.progress.evaluacion; a.time = timeFor(plan); a.startedAt = iso(assignedAt + DAY);
        addAttempts(a, plan, u, Math.min(now - DAY, assignedAt + 4 * DAY), false);
        a.bestScore = 60;
      }
      assignments.push(a);
    });
  });

  // Camila: IGS en curso + RAP del año pasado por vencer
  const igs = plans[0], rap = plans[2], ict = plans[1];
  const camA = { id: 'a-cam-igs', userId: 'u-cam', planId: igs.id, assignedBy: 'u-sup', assignedAt: iso(now - 5 * DAY), dueAt: iso(now + 9 * DAY), progress: { bienvenida: checkpoints(modById.bienvenida), epp: ['casco', 'lentes', 'zapatos'] }, time: { bienvenida: 6, epp: 4 }, quizPassed: false, bestScore: 0, practical: null, startedAt: iso(now - 4 * DAY), createdAt: iso(now - 5 * DAY) };
  const camOld = { id: 'a-cam-rap', userId: 'u-cam', planId: rap.id, assignedBy: 'u-sup', assignedAt: iso(now - 352 * DAY), dueAt: iso(now - 322 * DAY), progress: fullProgress(rap), time: timeFor(rap), quizPassed: true, bestScore: 90, practical: null, startedAt: iso(now - 350 * DAY), completedAt: iso(now - 340 * DAY), createdAt: iso(now - 352 * DAY) };
  assignments.unshift(camA, camOld);
  attempts.push({ userId: 'u-cam', assignmentId: camOld.id, planId: rap.id, score: 90, correct: 9, total: 10, passed: true, at: camOld.completedAt, durationSec: 512 });
  const cc = issue(camOld, rap, users.find(u => u.id === 'u-cam'), now - 340 * DAY, 90);
  cc.code = 'MA-RAP-2025-7QX4K';
  // Matías: ICT con evaluación práctica pendiente
  const matA = { id: 'a-mat-ict', userId: 'u-mat', planId: ict.id, assignedBy: 'u-sup', assignedAt: iso(now - 6 * DAY), dueAt: iso(now + DAY), progress: fullProgress(ict), time: timeFor(ict), quizPassed: true, bestScore: 90, practical: { status: 'pendiente', requestedAt: iso(now - DAY) }, startedAt: iso(now - 5 * DAY), createdAt: iso(now - 6 * DAY) };
  assignments.unshift(matA);
  attempts.push({ userId: 'u-mat', assignmentId: matA.id, planId: ict.id, score: 70, correct: 7, total: 10, passed: false, at: iso(now - 2 * DAY), durationSec: 610 }, { userId: 'u-mat', assignmentId: matA.id, planId: ict.id, score: 90, correct: 9, total: 10, passed: true, at: iso(now - DAY), durationSec: 470 });

  // Algunos certificados revocados
  certificates.filter((_, i) => i % 37 === 5).forEach(c => { c.status = 'revocado'; c.revokedReason = 'Reemplazado por nueva inducción'; });

  notifications.push(
    { userId: 'u-cam', title: 'Nueva inducción asignada', text: 'Carolina Flores te asignó «Inducción General de Seguridad». Plazo: 14 días.', at: iso(now - 5 * DAY), read: true, kind: 'info' },
    { userId: 'u-cam', title: 'Tu certificación vence pronto', text: 'Tu certificado de «Reinducción Anual Planta» vence en menos de un mes. Tu supervisora fue notificada.', at: iso(now - DAY), read: false, kind: 'warning' },
    { userId: 'u-mat', title: 'Evaluación práctica pendiente', text: 'Aprobaste la evaluación teórica. Coordina con tu supervisora la evaluación práctica en terreno.', at: iso(now - DAY), read: false, kind: 'info' }
  );

  return { users, companies, modules, plans, questions: questionSeed(), assignments, attempts, certificates, notifications, site: { ...SITE_DEFAULT } };
}

export const SITE_DEFAULT = {
  heroEyebrow: 'Inducción corporativa en 3D y realidad virtual',
  heroTitle: 'Conoce la faena',
  heroHighlight: 'antes de pisarla.',
  heroText: 'Recorre una planta virtual, equípate con tu EPP sobre un modelo 3D y practica la evacuación sin riesgos. Desde tu navegador, tu celular o un visor Meta Quest.',
  ctaText: 'Comenzar mi inducción',
  announcementOn: true,
  announcement: 'Nuevo: reinducción anual 2026 disponible para Planta y Mantención.',
  faena: 'Planta Altiplano Norte',
  contactEmail: 'induccion@altiplano.cl',
  contactPhone: '+56 55 241 0000',
  reminderDays: 60,
  signer: 'Valentina Quispe M.',
  signerRole: 'Gerencia de Personas'
};
