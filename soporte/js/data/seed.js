// Datos semilla de Atiende · Fibra Austral (proveedor de internet ficticio del sur de Chile).
// Generados con rng() para que sean reproducibles: 6 meses de tickets, chats e incidentes.
import { rng } from '../../../assets/core/db.js';
import { PLANS, COMMUNES } from '../shared/constants.js';

const DAY = 864e5, MIN = 60000;
const iso = t => new Date(t).toISOString();

const FIRST = ['Daniela', 'Patricio', 'Carolina', 'Luis', 'Ximena', 'Héctor', 'Valeria', 'Claudio', 'Marta', 'Óscar', 'Paola', 'Ricardo', 'Natalia', 'Sergio', 'Bárbara', 'Mauricio', 'Lorena', 'Esteban', 'Gabriela', 'Alejandro', 'Soledad', 'Raúl', 'Javiera', 'Manuel', 'Verónica', 'Cristián', 'Elisa', 'Hugo', 'Fernanda', 'Iván'];
const LAST = ['Pérez', 'Oyarzo', 'Barría', 'Vera', 'Mansilla', 'Gallardo', 'Cárdenas', 'Soto', 'Uribe', 'Ruiz', 'Navarro', 'Bustamante', 'Hernández', 'Paredes', 'Almonacid', 'Alvarado', 'Leiva', 'Muñoz', 'Vargas', 'Sandoval', 'Igor', 'Millán', 'Aguilar', 'Toledo', 'Haro', 'Delgado'];
const strip = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const CATEGORIES = [
  { id: 'cat-int', name: 'Internet y WiFi', icon: 'wifi', description: 'Velocidad, cortes, router y cobertura WiFi.', order: 1 },
  { id: 'cat-fac', name: 'Facturación y pagos', icon: 'card', description: 'Boletas, medios de pago, cobros y convenios.', order: 2 },
  { id: 'cat-ins', name: 'Instalación y domicilio', icon: 'truck', description: 'Visitas técnicas, traslados y nuevas instalaciones.', order: 3 },
  { id: 'cat-tv', name: 'Televisión y streaming', icon: 'tv', description: 'Decodificador, canales y app Austral TV.', order: 4 },
  { id: 'cat-cta', name: 'Cuenta y contrato', icon: 'user', description: 'Cambio de plan, titularidad, término de contrato.', order: 5 },
  { id: 'cat-tel', name: 'Telefonía fija', icon: 'phone', description: 'Línea fija, tono y portabilidad.', order: 6 }
];

const A = (id, categoryId, title, tags, body, extra = {}) => ({ id, categoryId, title, tags, body, status: 'publicado', ...extra });
const ARTICLES = [
  A('a-lento', 'cat-int', 'Mi internet está lento: qué revisar primero', ['velocidad', 'lento', 'wifi', 'speedtest'], `Si sientes que tu conexión está más lenta de lo normal, sigue estos pasos antes de llamarnos.\n## 1. Mide la velocidad por cable\n- Conecta un computador al router con cable de red.\n- Entra a velocidad.fibraustral.cl y realiza la prueba.\n- Si por cable obtienes al menos el 80% de tu plan, el problema está en el WiFi.\n## 2. Reinicia el router\n- Desenchúfalo 30 segundos y vuelve a enchufarlo.\n- Espera 3 minutos a que la luz PON quede fija en verde.\n## 3. Revisa cuántos equipos están conectados\nVarias descargas o streaming 4K simultáneos pueden saturar la red. Desde la app Mi Fibra puedes ver los dispositivos conectados.\n\nSi después de esto la velocidad sigue baja, abre un ticket indicando el resultado de la prueba por cable.`),
  A('a-router', 'cat-int', 'Cómo reiniciar el router de fibra correctamente', ['router', 'reiniciar', 'luces', 'ont'], `Reiniciar el router soluciona la mayoría de los problemas de conexión.\n- Desenchufa el router de la corriente (no uses el botón Reset).\n- Espera 30 segundos.\n- Vuelve a enchufarlo y espera entre 2 y 3 minutos.\n## ¿Qué significan las luces?\n- PON verde fija: la fibra está bien conectada.\n- LOS roja parpadeando: no llega señal de fibra. Revisa que el cable verde no esté doblado y abre un ticket.\n- Internet apagada: el router no se autenticó; reinícialo nuevamente.`),
  A('a-wifi-clave', 'cat-int', 'Cambiar el nombre y la clave de mi red WiFi', ['wifi', 'clave', 'contraseña', 'ssid'], `Puedes cambiar el nombre (SSID) y la contraseña de tu WiFi desde la app Mi Fibra.\n- Abre la app y entra a Mi red > WiFi.\n- Edita el nombre y la clave (mínimo 8 caracteres).\n- Guarda: todos los equipos se desconectarán y deberás reconectarlos con la nueva clave.\n\nTambién puedes hacerlo entrando a 192.168.1.1 desde un navegador con el usuario impreso en la etiqueta del router.`),
  A('a-cobertura', 'cat-int', 'Mejorar la cobertura WiFi en toda la casa', ['wifi', 'cobertura', 'repetidor', 'mesh'], `Las paredes gruesas y la distancia reducen la señal WiFi.\n- Ubica el router en un lugar alto y central, lejos del microondas.\n- Usa la red de 5 GHz cerca del router y la de 2,4 GHz en piezas lejanas.\n- Para casas de más de 80 m² recomendamos el equipo Mesh Austral, que puedes agregar desde $2.990 al mes.`),
  A('a-corte', 'cat-int', 'No tengo internet: cómo saber si es una falla masiva', ['corte', 'sin internet', 'falla', 'estado'], `Antes de reportar, revisa la página de estado del servicio: ahí publicamos las fallas masivas por comuna y su avance.\n- Si hay un incidente activo en tu zona, no necesitas abrir un ticket: te avisaremos cuando se resuelva.\n- Si no hay incidentes, reinicia el router y revisa la luz LOS.\n- Si la luz LOS está roja, abre un ticket y agendaremos una visita técnica.`),
  A('a-boleta', 'cat-fac', 'Cómo descargar mi boleta electrónica', ['boleta', 'factura', 'descargar', 'pdf'], `Tus boletas están disponibles en el portal de clientes y en la app Mi Fibra.\n- Ingresa a Mi cuenta > Boletas.\n- Selecciona el mes y presiona Descargar PDF.\n\nLas boletas se emiten el día 1 de cada mes y vencen el día 15.`),
  A('a-pagos', 'cat-fac', 'Medios de pago disponibles', ['pago', 'pagar', 'transferencia', 'pac', 'pat'], `Puedes pagar tu cuenta de las siguientes formas:\n- Pago automático con tarjeta de crédito (PAT) o cuenta corriente (PAC).\n- Botón de pago en el portal con tarjetas de débito y crédito.\n- Transferencia bancaria indicando tu RUT en el comentario.\n- Cajas vecinas y sucursales de servicio.\n\nEl pago se refleja en un máximo de 48 horas hábiles.`),
  A('a-cobro', 'cat-fac', 'Me cobraron un monto distinto al de mi plan', ['cobro', 'monto', 'boleta', 'proporcional'], `Las diferencias más comunes se deben a:\n- Cobro proporcional del primer mes o de un cambio de plan.\n- Arriendo de equipos adicionales (decodificadores o Mesh).\n- Intereses por pago atrasado.\n\nSi aun así no reconoces el cobro, abre un ticket en la categoría Facturación adjuntando tu boleta.`),
  A('a-convenio', 'cat-fac', 'Repactar una deuda o solicitar un convenio de pago', ['deuda', 'convenio', 'corte', 'repactar'], `Si tienes boletas vencidas puedes solicitar un convenio de hasta 6 cuotas sin interés.\n- El servicio se repone dentro de 2 horas desde que se firma el convenio.\n- Solicítalo abriendo un ticket de Facturación o por chat.`),
  A('a-traslado', 'cat-ins', 'Trasladar el servicio a un nuevo domicilio', ['traslado', 'mudanza', 'domicilio', 'cambio'], `Si te cambias de casa puedes llevar tu plan contigo sin costo, siempre que tengamos cobertura en la nueva dirección.\n- Verifica cobertura en fibraustral.cl/cobertura.\n- Solicita el traslado con al menos 5 días hábiles de anticipación.\n- Un técnico instalará la fibra en tu nuevo domicilio; lleva contigo el router.`),
  A('a-visita', 'cat-ins', 'Qué esperar de una visita técnica', ['visita', 'tecnico', 'instalacion', 'horario'], `Nuestras visitas se agendan en bloques de mañana (9 a 13 h) o tarde (14 a 18 h).\n- Te enviaremos un SMS cuando el técnico vaya en camino.\n- Debe haber un adulto mayor de 18 años en el domicilio.\n- El técnico se identifica con credencial y uniforme de Fibra Austral.\n\nPuedes reagendar respondiendo el SMS o desde tu ticket.`),
  A('a-instalacion', 'cat-ins', 'Plazos de instalación de un servicio nuevo', ['instalacion', 'plazo', 'nuevo', 'contratar'], `Una vez firmado el contrato, la instalación se agenda en un plazo de 2 a 5 días hábiles según tu comuna. En Chiloé el plazo puede extenderse a 7 días hábiles.`),
  A('a-deco', 'cat-tv', 'El decodificador muestra "Sin señal"', ['tv', 'decodificador', 'sin señal', 'hdmi'], `Revisa lo siguiente:\n- Que el televisor esté en la entrada HDMI correcta.\n- Que el decodificador esté conectado al router (cable de red o WiFi).\n- Reinicia el decodificador desconectándolo 30 segundos.\n\nSi el mensaje persiste, abre un ticket indicando el código de error que aparece en pantalla.`),
  A('a-app-tv', 'cat-tv', 'Ver Austral TV en el celular y Smart TV', ['app', 'tv', 'streaming', 'smart tv'], `Con tu plan con TV incluyes la app Austral TV para hasta 3 dispositivos simultáneos.\n- Descárgala en Google Play, App Store o la tienda de tu Smart TV.\n- Ingresa con el mismo correo y clave del portal de clientes.`),
  A('a-plan', 'cat-cta', 'Cambiar de plan', ['plan', 'cambio', 'velocidad', 'upgrade'], `Puedes subir de plan cuando quieras y el cambio se aplica en menos de 2 horas, sin visita técnica.\n- Para bajar de plan debes haber cumplido 6 meses en el plan actual.\n- El cobro se ajusta de forma proporcional en tu próxima boleta.`),
  A('a-titular', 'cat-cta', 'Cambiar el titular del servicio', ['titular', 'contrato', 'traspaso'], `El cambio de titular requiere que ambas personas firmen el formulario de traspaso. Abre un ticket adjuntando la cédula de identidad del titular actual y del nuevo titular.`),
  A('a-baja', 'cat-cta', 'Dar de baja el servicio', ['baja', 'terminar', 'contrato', 'retiro'], `Puedes terminar tu contrato en cualquier momento, sin multas, según la Ley del Consumidor.\n- Solicita la baja por ticket o por teléfono.\n- Coordina la devolución del router en una sucursal o con retiro a domicilio.\n- Recibirás una boleta final proporcional.`),
  A('a-clave-portal', 'cat-cta', 'Recuperar la clave del portal de clientes', ['clave', 'portal', 'contraseña', 'acceso'], `En la página de inicio de sesión presiona “¿Olvidaste tu contraseña?” e ingresa tu correo. Recibirás un enlace válido por 30 minutos.`),
  A('a-tono', 'cat-tel', 'Mi teléfono fijo no tiene tono', ['telefono', 'tono', 'fijo'], `El teléfono fijo funciona a través del router.\n- Verifica que el teléfono esté conectado al puerto TEL1 del router.\n- Prueba con otro aparato telefónico.\n- Reinicia el router.\n\nSi sigue sin tono, abre un ticket en la categoría Telefonía.`),
  A('a-portabilidad', 'cat-tel', 'Portabilidad numérica a Fibra Austral', ['portabilidad', 'numero', 'telefono'], `Puedes traer tu número fijo desde otra compañía. El proceso demora 3 días hábiles y no tiene costo.`),
  A('a-ipv6', 'cat-int', 'Configuración avanzada: IP fija y apertura de puertos', ['ip fija', 'puertos', 'nat', 'gamer'], `La IP fija está disponible en los planes Empresa. Para abrir puertos en planes hogar entra a 192.168.1.1 > Avanzado > NAT.`, { status: 'borrador' })
];

export function seed() {
  const r = rng(77);
  const now = Date.now();

  // ---------- Equipo ----------
  const groups = [
    { id: 'g-n1', name: 'Soporte técnico N1', description: 'Primera línea: conectividad, WiFi, equipos.', color: '#2b8de0' },
    { id: 'g-fac', name: 'Facturación', description: 'Cobros, boletas, convenios y contratos.', color: '#6bbf1f' },
    { id: 'g-ter', name: 'Terreno e instalaciones', description: 'Visitas técnicas, traslados y fibra.', color: '#ff7a00' }
  ];
  const staff = [
    { id: 'u-admin', name: 'Andrea Vidal', email: 'admin@fibraustral.cl', role: 'admin', color: '#7c3aed', groupIds: [], title: 'Jefa de Experiencia de Clientes', demo: true },
    { id: 'u-sup', name: 'Jorge Mansilla', email: 'supervisor@fibraustral.cl', role: 'supervisor', color: '#0f766e', groupIds: ['g-n1', 'g-fac', 'g-ter'], title: 'Supervisor de soporte', demo: true },
    { id: 'u-cam', name: 'Camila Oyarzún', email: 'agente@fibraustral.cl', role: 'agente', color: '#e11d48', groupIds: ['g-n1'], title: 'Agente N1', demo: true },
    { id: 'u-fel', name: 'Felipe Barrientos', email: 'felipe@fibraustral.cl', role: 'agente', color: '#2563eb', groupIds: ['g-n1'], title: 'Agente N1' },
    { id: 'u-roc', name: 'Rocío Cárcamo', email: 'rocio@fibraustral.cl', role: 'agente', color: '#ca8a04', groupIds: ['g-fac'], title: 'Agente de facturación' },
    { id: 'u-tom', name: 'Tomás Alvarado', email: 'tomas@fibraustral.cl', role: 'agente', color: '#059669', groupIds: ['g-ter'], title: 'Coordinador de terreno' },
    { id: 'u-mar', name: 'Marcela Ruiz', email: 'marcela@fibraustral.cl', role: 'agente', color: '#db2777', groupIds: ['g-fac', 'g-n1'], title: 'Agente multiskill', active: false }
  ].map(u => ({ password: 'demo123', active: true, createdAt: iso(now - r.int(200, 900) * DAY), ...u }));
  const agents = ['u-cam', 'u-fel', 'u-roc', 'u-tom', 'u-sup'];

  const customers = [];
  for (let i = 0; i < 46; i++) {
    const fn = i === 0 ? 'Daniela' : r.pick(FIRST), ln = i === 0 ? 'Pérez' : r.pick(LAST);
    customers.push({
      id: i === 0 ? 'u-cli' : 'c' + i, name: `${fn} ${ln}${i === 0 ? ' Soto' : ''}`, role: 'cliente', password: 'demo123', active: true,
      email: i === 0 ? 'cliente@correo.cl' : `${strip(fn)}.${strip(ln)}${r.int(1, 99)}@${r.pick(['correo.cl', 'gmail.com', 'outlook.com', 'mail.cl'])}`,
      demo: i === 0, color: r.pick(['#475569', '#64748b', '#0e7490', '#7c2d12', '#4d7c0f', '#6d28d9']),
      phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, rut: `${r.int(9, 22)}.${r.int(100, 999)}.${r.int(100, 999)}-${r.pick(['1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'])}`,
      plan: i === 0 ? 'Fibra 600 + TV' : r.pick(PLANS), commune: i === 0 ? 'Puerto Varas' : r.pick(COMMUNES), address: `${r.pick(['Av. Gramado', 'Los Notros', 'Calle Santa Rosa', 'Pasaje Los Ulmos', 'Av. Salvador Allende', 'Camino a Ensenada', 'Calle Imperial', 'Los Arrayanes'])} ${r.int(100, 2900)}`,
      createdAt: iso(now - r.int(60, 1500) * DAY)
    });
  }
  const users = [...staff, ...customers];

  // ---------- SLA ----------
  const slas = [
    { id: 'sla-u', priority: 'urgente', first: 30, resolution: 240 },
    { id: 'sla-a', priority: 'alta', first: 60, resolution: 480 },
    { id: 'sla-n', priority: 'normal', first: 240, resolution: 1440 },
    { id: 'sla-b', priority: 'baja', first: 480, resolution: 2880 }
  ];
  const slaOf = p => slas.find(s => s.priority === p);

  // ---------- Tickets ----------
  const POOL = {
    'cat-int': [['Internet muy lento en las noches', 'Desde hace una semana la velocidad baja mucho después de las 20:00. Por cable me da 90 Mbps y tengo plan de 600.'], ['Sin internet desde esta mañana', 'El router tiene la luz LOS en rojo y no hay conexión. Ya lo reinicié dos veces.'], ['El WiFi no llega al segundo piso', 'En el dormitorio del segundo piso casi no hay señal. ¿Qué opciones tengo?'], ['Cortes intermitentes cada hora', 'La conexión se corta por uno o dos minutos varias veces al día. Trabajo desde la casa y es urgente.'], ['No puedo cambiar la clave del WiFi', 'La app Mi Fibra me da error al guardar la nueva clave.']],
    'cat-fac': [['Cobro duplicado en mi boleta', 'En la boleta de este mes aparece dos veces el cargo del plan. Adjunto la boleta.'], ['No puedo descargar mi boleta', 'El portal muestra un error al intentar descargar la boleta de septiembre.'], ['Solicito convenio de pago', 'Tengo dos boletas atrasadas y quiero repactar en cuotas.'], ['Pagué pero sigue apareciendo deuda', 'Hice una transferencia hace 3 días y el portal sigue mostrando la deuda.']],
    'cat-ins': [['Solicitud de traslado de servicio', 'Me cambio de casa el próximo mes dentro de Puerto Montt. ¿Cómo hago el traslado?'], ['Técnico no llegó a la visita', 'Tenía visita agendada en el bloque de la mañana y nadie llegó ni avisó.'], ['Reagendar instalación', 'No podré estar en casa el día de la instalación, necesito cambiar la fecha.']],
    'cat-tv': [['Decodificador sin señal', 'El decodificador muestra "Sin señal" desde ayer en todos los canales.'], ['No puedo entrar a la app Austral TV', 'La app dice que mi cuenta no tiene TV contratada, pero sí la tengo.']],
    'cat-cta': [['Quiero subir a 940 Mbps', 'Me interesa cambiarme al plan de 940 Mbps. ¿Cuánto quedaría pagando?'], ['Cambio de titular por fallecimiento', 'El titular del servicio era mi padre, necesito traspasarlo a mi nombre.'], ['Dar de baja el servicio', 'Me voy del país y necesito terminar el contrato.']],
    'cat-tel': [['Teléfono fijo sin tono', 'El teléfono fijo no tiene tono desde el cambio de router.']]
  };
  const GROUP_OF = { 'cat-int': 'g-n1', 'cat-tv': 'g-n1', 'cat-tel': 'g-n1', 'cat-fac': 'g-fac', 'cat-cta': 'g-fac', 'cat-ins': 'g-ter' };
  const AGENT_OF = { 'g-n1': ['u-cam', 'u-fel', 'u-cam'], 'g-fac': ['u-roc'], 'g-ter': ['u-tom'] };
  const REPLIES = ['Hola {n}, gracias por escribirnos. Revisé tu servicio y ya estamos trabajando en esto. Te mantendré informado por este medio.', 'Hola {n}, lamento las molestias. ¿Podrías indicarme el resultado de una prueba de velocidad por cable para descartar el WiFi?', 'Hola {n}, ya aplicamos el ajuste en nuestros sistemas. ¿Puedes confirmar si se solucionó?', 'Hola {n}, agendamos una visita técnica para el próximo bloque disponible. Recibirás un SMS de confirmación.'];
  const CLOSERS = ['¡Listo! Gracias por la ayuda, ya funciona.', 'Perfecto, quedó solucionado.', 'Gracias, confirmo que ya está bien.', 'Ok, quedo atento.'];
  const tickets = [];
  let num = 10230;
  const N = 560;
  for (let i = 0; i < N; i++) {
    const cat = r.pick(['cat-int', 'cat-int', 'cat-int', 'cat-fac', 'cat-fac', 'cat-ins', 'cat-tv', 'cat-cta', 'cat-tel']);
    const [subject, body] = r.pick(POOL[cat]);
    const cust = i < 5 ? customers[0] : customers[r.int(1, customers.length - 1)];
    // 5 tickets del cliente demo, ~20 abiertos recientes y el resto repartido en 6 meses.
    let st, ageMin;
    if (i < 5) { st = ['resuelto', 'pendiente', 'abierto', 'cerrado', 'nuevo'][i]; ageMin = [2 * 1440, 1500, 300, 40 * 1440, 25][i]; }
    else if (i < 25) { st = r.pick(['nuevo', 'abierto', 'abierto', 'pendiente', 'espera', 'abierto']); ageMin = ['pendiente', 'espera'].includes(st) ? r.int(1440, 3 * 1440) : r.int(10, 640); }
    else { ageMin = r.int(3 * 1440, 182 * 1440); st = ageMin < 14 * 1440 ? r.pick(['resuelto', 'cerrado']) : 'cerrado'; }
    const created = now - ageMin * MIN;
    const prio = /Sin internet|Cortes|no llegó/.test(subject) ? r.pick(['alta', 'urgente', 'alta']) : r.pick(['normal', 'normal', 'baja', 'alta']);
    const group = GROUP_OF[cat];
    const policy = slaOf(prio);
    const channel = r.pick(['web', 'portal', 'portal', 'email', 'chat', 'telefono']);
    const assignee = st === 'nuevo' ? (r.bool(.3) ? r.pick(AGENT_OF[group]) : null) : r.pick(AGENT_OF[group]);
    const n = cust.name.split(' ')[0];
    const messages = [{ id: 'm' + i + 'a', authorId: cust.id, kind: 'public', body, at: iso(created), attachments: r.bool(.15) ? [{ name: r.pick(['boleta.pdf', 'foto_router.jpg', 'captura_speedtest.png']), size: r.int(80, 900) * 1024 }] : [] }];
    // Tiempo de primera respuesta: a veces fuera de SLA
    const frt = Math.round(policy.first * (r.bool(.86) ? .15 + r() * .8 : 1.1 + r() * 1.5));
    let firstResponseAt = null, resolvedAt = null;
    if (st !== 'nuevo' && created + frt * MIN < now) {
      firstResponseAt = created + frt * MIN;
      messages.push({ id: 'm' + i + 'b', authorId: assignee, kind: 'public', body: r.pick(REPLIES).replace('{n}', n), at: iso(firstResponseAt), attachments: [] });
      if (r.bool(.35)) messages.push({ id: 'm' + i + 'n', authorId: assignee, kind: 'internal', body: r.pick(['Revisé la OLT: niveles de potencia óptica OK.', 'Cliente con historial de reclamos, ofrecer descuento si corresponde.', 'Escalado a terreno, falta confirmar bloque.', 'Validar pago en el sistema de recaudación.']), at: iso(firstResponseAt + 5 * MIN), attachments: [] });
      if (['resuelto', 'cerrado'].includes(st)) {
        const res = Math.min(now - 30 * MIN, firstResponseAt + Math.round(policy.resolution * (r.bool(.8) ? .2 + r() * .7 : 1.1 + r()) * MIN));
        messages.push({ id: 'm' + i + 'c', authorId: cust.id, kind: 'public', body: r.pick(CLOSERS), at: iso(Math.max(firstResponseAt + MIN, res - 20 * MIN)), attachments: [] });
        resolvedAt = res;
      } else if (st === 'pendiente') {
        messages.push({ id: 'm' + i + 'c', authorId: assignee, kind: 'public', body: `Hola ${n}, necesitamos que nos confirmes un horario para la visita técnica o el resultado de la prueba solicitada. Quedamos atentos.`, at: iso(firstResponseAt + 30 * MIN), attachments: [] });
      }
    } else if (st !== 'nuevo') st = 'nuevo';
    const t = {
      id: 't' + i, number: num + N - i, subject, categoryId: cat, priority: prio, status: st, channel, customerId: cust.id, assigneeId: st === 'nuevo' && !firstResponseAt ? (assignee && r.bool(.5) ? assignee : null) : assignee, groupId: group,
      tags: r.bool(.3) ? [r.pick(['reiterado', 'vip', 'masivo', 'fibra-cortada', 'facturacion'])] : [], messages, createdAt: iso(created), updatedAt: messages.at(-1).at,
      firstResponseDue: iso(created + policy.first * MIN), resolutionDue: iso(created + policy.resolution * MIN),
      firstResponseAt: firstResponseAt ? iso(firstResponseAt) : null, resolvedAt: resolvedAt ? iso(resolvedAt) : null
    };
    if (resolvedAt && r.bool(.62) && i !== 0) {
      const rating = r.pick([5, 5, 5, 4, 4, 4, 3, 2, 5, 1]);
      t.csat = { rating, comment: rating >= 4 ? r.pick(['Muy buena atención, rápida.', 'Resolvieron todo por chat.', '', 'Excelente disposición del agente.']) : r.pick(['Tardaron mucho en responder.', 'Tuve que explicar el problema varias veces.', '']), at: iso(resolvedAt + 3600000) };
    }
    tickets.push(t);
  }
  // Ticket pensado para fusionar: duplicado del mismo cliente.
  const dup = tickets.find(t => t.status === 'abierto' && t.customerId !== 'u-cli');
  if (dup) tickets.push({ ...JSON.parse(JSON.stringify(dup)), id: 't-dup', number: num + N + 1, subject: dup.subject + ' (otra vez)', status: 'nuevo', assigneeId: null, firstResponseAt: null, messages: [{ ...dup.messages[0], id: 'mdup', body: 'Escribo de nuevo porque sigo con el mismo problema. ' + dup.messages[0].body, at: iso(now - 50 * MIN) }], createdAt: iso(now - 50 * MIN), updatedAt: iso(now - 50 * MIN), firstResponseDue: iso(now - 50 * MIN + slaOf(dup.priority).first * MIN), resolutionDue: iso(now - 50 * MIN + slaOf(dup.priority).resolution * MIN), tags: ['reiterado'] });

  // ---------- Base de conocimiento ----------
  const articles = ARTICLES.map((a, i) => ({ ...a, authorId: r.pick(['u-sup', 'u-cam', 'u-roc', 'u-admin']), views: r.int(80, 4200), helpfulYes: r.int(10, 320), helpfulNo: r.int(1, 60), featured: ['a-lento', 'a-corte', 'a-boleta', 'a-traslado', 'a-router', 'a-pagos'].includes(a.id), createdAt: iso(now - r.int(60, 500) * DAY), editedAt: iso(now - (i + 1) * 3 * DAY) }));

  // ---------- Macros ----------
  const macros = [
    { id: 'mc1', name: 'Solicitar prueba de velocidad por cable', body: 'Hola {{nombre}}, para ayudarte mejor necesitamos que realices una prueba de velocidad conectando un computador al router con cable en velocidad.fibraustral.cl y nos envíes una captura del resultado. ¡Gracias!', status: 'pendiente', priority: '', tag: 'velocidad' },
    { id: 'mc2', name: 'Agendar visita técnica', body: 'Hola {{nombre}}, agendamos una visita técnica en tu domicilio. Recibirás un SMS con el bloque horario y te avisaremos cuando el técnico vaya en camino.', status: 'espera', priority: '', tag: 'visita' },
    { id: 'mc3', name: 'Falla masiva en tu zona', body: 'Hola {{nombre}}, existe una falla masiva que afecta tu sector y nuestros equipos ya están trabajando en terreno. Puedes seguir el avance en la página de estado: estado.fibraustral.cl. Te avisaremos apenas se normalice.', status: 'espera', priority: 'alta', tag: 'masivo' },
    { id: 'mc4', name: 'Caso resuelto', body: 'Hola {{nombre}}, confirmamos que tu caso quedó resuelto. Si vuelves a tener problemas solo responde este mensaje. ¡Que tengas un buen día!', status: 'resuelto', priority: '', tag: '' },
    { id: 'mc5', name: 'Enviar enlace de boleta', body: 'Hola {{nombre}}, puedes descargar tus boletas en el portal de clientes, sección Mi cuenta > Boletas. Te dejo también la guía: Cómo descargar mi boleta electrónica.', status: 'resuelto', priority: '', tag: 'facturacion' },
    { id: 'mc6', name: 'Convenio de pago aprobado', body: 'Hola {{nombre}}, tu convenio de pago fue aprobado en 6 cuotas sin interés. El servicio se repondrá dentro de las próximas 2 horas.', status: 'resuelto', priority: '', tag: 'convenio' }
  ];
  const triggers = [
    { id: 'tr1', name: 'Cortes totales como urgentes', field: 'subject', value: 'sin internet', action: 'priority', actionValue: 'urgente', active: true, runs: 41 },
    { id: 'tr2', name: 'Facturación al grupo de cobranzas', field: 'category', value: 'cat-fac', action: 'group', actionValue: 'g-fac', active: true, runs: 63 },
    { id: 'tr3', name: 'Clientes empresa con prioridad alta', field: 'plan', value: 'Fibra Empresa 1 Gbps', action: 'priority', actionValue: 'alta', active: true, runs: 12 },
    { id: 'tr4', name: 'Acuse de recibo automático', field: '', value: '', action: 'reply', actionValue: 'Recibimos tu solicitud y un agente te responderá dentro del plazo de atención. Mientras tanto, revisa nuestro centro de ayuda.', active: true, runs: 158 },
    { id: 'tr5', name: 'Avisar a supervisión por urgentes', field: 'priority', value: 'urgente', action: 'notify', actionValue: '', active: true, runs: 19 },
    { id: 'tr6', name: 'Etiquetar mudanzas', field: 'subject', value: 'traslado', action: 'tag', actionValue: 'traslado', active: false, runs: 7 }
  ];

  // ---------- Estado del servicio ----------
  const services = [
    { id: 's-int', name: 'Internet fibra hogar', group: 'Conectividad' },
    { id: 's-emp', name: 'Internet empresas', group: 'Conectividad' },
    { id: 's-tv', name: 'Televisión y Austral TV', group: 'Entretención' },
    { id: 's-tel', name: 'Telefonía fija', group: 'Conectividad' },
    { id: 's-pag', name: 'Portal de pagos', group: 'Plataformas' },
    { id: 's-app', name: 'App Mi Fibra', group: 'Plataformas' }
  ];
  const incidents = [];
  const titles = { 's-int': ['Corte de fibra troncal en {c}', 'Lentitud en horario punta en {c}', 'Falla eléctrica en nodo {c}'], 's-emp': ['Intermitencia en enlaces dedicados'], 's-tv': ['Canales HD sin señal', 'Austral TV no carga en Smart TV'], 's-tel': ['Llamadas salientes con error'], 's-pag': ['Botón de pago no disponible', 'Lentitud en el portal de pagos'], 's-app': ['Error al iniciar sesión en la app'] };
  for (let i = 0; i < 16; i++) {
    const svc = r.pick(['s-int', 's-int', 's-int', 's-tv', 's-pag', 's-app', 's-tel', 's-emp']);
    const start = now - r.int(3, 88) * DAY - r.int(0, 600) * MIN;
    const dur = r.int(25, 420) * MIN;
    const impact = r.pick(['menor', 'menor', 'mayor', 'mayor', 'critico']);
    const c = r.pick(COMMUNES);
    incidents.push({
      id: 'i' + i, title: r.pick(titles[svc]).replace('{c}', c), serviceIds: [svc], impact, status: 'resuelto', region: c,
      updates: [
        { at: iso(start), status: 'investigando', body: 'Estamos investigando reportes de clientes afectados.' },
        { at: iso(start + dur * .4), status: 'identificado', body: 'Identificamos la causa y enviamos una cuadrilla a terreno.' },
        { at: iso(start + dur), status: 'resuelto', body: 'El servicio se encuentra normalizado. Lamentamos las molestias.' }
      ], createdAt: iso(start), resolvedAt: iso(start + dur)
    });
  }
  incidents.unshift({
    id: 'i-live', title: 'Lentitud de navegación en Puerto Varas y Llanquihue', serviceIds: ['s-int'], impact: 'mayor', status: 'identificado', region: 'Puerto Varas',
    updates: [
      { at: iso(now - 95 * MIN), status: 'investigando', body: 'Recibimos reportes de lentitud en sectores de Puerto Varas y Llanquihue.' },
      { at: iso(now - 40 * MIN), status: 'identificado', body: 'Un equipo de agregación presenta saturación. Estamos redistribuyendo el tráfico; estimamos normalizar antes de 2 horas.' }
    ], createdAt: iso(now - 95 * MIN), resolvedAt: null
  });

  // ---------- Chats ----------
  const chats = [
    { id: 'ch1', visitorId: 'v-demo1', name: 'Héctor Gallardo', email: 'hgallardo@correo.cl', customerId: null, status: 'esperando', agentId: null, createdAt: iso(now - 6 * MIN), messages: [
      { from: 'bot', body: '¡Hola! Soy Austral, el asistente virtual. ¿En qué te puedo ayudar?', at: iso(now - 6 * MIN) },
      { from: 'cliente', body: 'el decodificador dice sin señal', at: iso(now - 5 * MIN) },
      { from: 'bot', body: 'Encontré esta guía que podría ayudarte: El decodificador muestra "Sin señal". ¿Te sirvió?', at: iso(now - 5 * MIN), articles: ['a-deco'] },
      { from: 'cliente', body: 'No, ya lo reinicié. Quiero hablar con una persona', at: iso(now - 4 * MIN) },
      { from: 'bot', body: 'Te estoy derivando con un agente. El tiempo de espera estimado es de 3 minutos.', at: iso(now - 4 * MIN) }
    ] },
    { id: 'ch2', visitorId: 'v-demo2', name: 'Paola Navarro', email: 'pnavarro@gmail.com', customerId: null, status: 'cerrado', agentId: 'u-cam', createdAt: iso(now - 2 * DAY), closedAt: iso(now - 2 * DAY + 14 * MIN), messages: [
      { from: 'bot', body: '¡Hola! Soy Austral, el asistente virtual. ¿En qué te puedo ayudar?', at: iso(now - 2 * DAY) },
      { from: 'cliente', body: 'como pago mi boleta', at: iso(now - 2 * DAY + MIN) },
      { from: 'bot', body: 'Encontré estas guías: Medios de pago disponibles · Cómo descargar mi boleta electrónica. ¿Te sirvió?', at: iso(now - 2 * DAY + MIN), articles: ['a-pagos', 'a-boleta'] },
      { from: 'cliente', body: 'Sí, gracias', at: iso(now - 2 * DAY + 2 * MIN) }
    ] }
  ];

  const notifications = [
    { userId: 'u-cam', text: 'Te asignaron un ticket urgente: Sin internet desde esta mañana', link: 'agente.html#/', read: false },
    { userId: 'u-sup', text: '3 tickets con SLA en riesgo en Soporte técnico N1', link: 'agente.html#/?vista=sla', read: false },
    { userId: 'u-sup', text: 'Nuevo chat en espera: Héctor Gallardo', link: 'agente.html#/chats', read: false },
    { userId: 'u-admin', text: 'Incidente activo publicado en la página de estado', link: 'admin.html#/incidentes', read: true }
  ].map((n, k) => ({ ...n, id: 'n' + k, createdAt: iso(now - (k + 1) * 47 * MIN) }));

  const help = {
    heroTitle: '¿En qué te podemos ayudar?',
    heroSubtitle: 'Busca en nuestras guías, revisa el estado del servicio o escríbenos. Respondemos en minutos.',
    banner: { on: true, text: 'Estamos atendiendo una lentitud en Puerto Varas y Llanquihue. Revisa el avance en la página de estado.', tone: 'warning' },
    phone: '600 360 4000', hours: 'Lunes a domingo de 8:00 a 22:00 · Fallas técnicas 24/7', whatsapp: '+56 9 4000 3600',
    chatEnabled: true, botName: 'Austral', botGreeting: '¡Hola! Soy Austral, el asistente virtual de Fibra Austral. Cuéntame tu problema y busco una solución.',
    contactCategories: ['cat-int', 'cat-fac', 'cat-ins', 'cat-tv', 'cat-cta', 'cat-tel']
  };

  return { users, groups, categories: CATEGORIES, articles, tickets, macros, slas, triggers, services, incidents, chats, notifications, subscribers: [{ id: 'sb1', email: 'vecinos.llanquihue@correo.cl', serviceIds: ['s-int'], createdAt: iso(now - 20 * DAY) }], votes: [], help, ticketSeq: 10230 + 562 };
}
