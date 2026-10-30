// Datos semilla de Sentinela para la empresa ficticia "Acuícola Fiordo".
// Dos sitios: centro de cultivo de salmones en el mar y planta de proceso en tierra.
import { rng } from '../../../assets/core/db.js';

export function seed() {
  const r = rng(77);
  const now = Date.now();
  const iso = ms => new Date(ms).toISOString();

  const users = [
    { id: 'u-admin', name: 'Javiera Ortiz', email: 'admin@sentinela.demo', password: 'admin123', role: 'admin', color: '#16a34a', demo: true },
    { id: 'u-ing', name: 'Matías Cárcamo', email: 'ingeniero@sentinela.demo', password: 'ingeniero123', role: 'ingeniero', color: '#0891b2', demo: true },
    { id: 'u-op', name: 'Rosa Millán', email: 'operador@sentinela.demo', password: 'operador123', role: 'operador', color: '#d97706', demo: true },
    { id: 'u-ro', name: 'Felipe Andrade', email: 'lectura@sentinela.demo', password: 'lectura123', role: 'lectura', color: '#7c3aed', demo: true },
    { id: 'u-op2', name: 'Héctor Paillán', email: 'hpaillan@fiordo.demo', password: 'demo1234', role: 'operador', color: '#e11d48', demo: false },
    { id: 'u-op3', name: 'Camila Ñancupil', email: 'cnancupil@fiordo.demo', password: 'demo1234', role: 'operador', color: '#4f46e5', demo: false },
    { id: 'u-ing2', name: 'Ignacio Vera', email: 'ivera@fiordo.demo', password: 'demo1234', role: 'ingeniero', color: '#059669', demo: false },
  ].map(u => ({ active: true, createdAt: iso(now - r.int(60, 500) * 864e5), ...u }));

  const sites = [
    { id: 's-mar', name: 'Centro de cultivo Isla Huar', kind: 'cultivo', location: 'Seno de Reloncaví, Los Lagos', coords: '-41.62, -72.98', manager: 'u-ing', active: true },
    { id: 's-planta', name: 'Planta de proceso Chinquihue', kind: 'planta', location: 'Puerto Montt, Los Lagos', coords: '-41.50, -72.99', manager: 'u-ing2', active: true },
  ];

  const zones = [];
  for (let i = 0; i < 8; i++) zones.push({ id: `z-j${i + 1}`, siteId: 's-mar', name: `Jaula ${i + 1}`, kind: 'jaula', shape: 'circle', x: 150 + (i % 4) * 233, y: i < 4 ? 250 : 450, w: 120, h: 120 });
  zones.push({ id: 'z-ponton', siteId: 's-mar', name: 'Pontón de alimentación', kind: 'ponton', shape: 'rect', x: 380, y: 40, w: 240, h: 90 });
  zones.push({ id: 'z-ensilaje', siteId: 's-mar', name: 'Planta de ensilaje', kind: 'apoyo', shape: 'rect', x: 40, y: 40, w: 200, h: 90 });
  [['z-recep', 'Recepción de materia prima', 'proceso', 30, 30, 260, 200], ['z-linea', 'Línea de proceso y fileteo', 'proceso', 310, 30, 390, 200], ['z-frio1', 'Cámara de frío 1', 'frio', 720, 30, 250, 250], ['z-frio2', 'Cámara de frío 2', 'frio', 720, 300, 250, 270], ['z-comp', 'Sala de compresores', 'maquinas', 310, 250, 390, 150], ['z-elec', 'Sala eléctrica', 'electrica', 30, 250, 260, 150], ['z-riles', 'Planta de RILes', 'riles', 30, 420, 260, 150], ['z-desp', 'Despacho', 'proceso', 310, 420, 390, 150]]
    .forEach(([id, name, kind, x, y, w, h]) => zones.push({ id, siteId: 's-planta', name, kind, shape: 'rect', x, y, w, h }));

  const devices = [];
  let seq = 100;
  const fw = ['2.3.1', '2.4.0', '2.4.0', '2.4.2', '2.4.2', '2.4.2'];
  const add = (o) => {
    const z = zones.find(x => x.id === o.zoneId);
    const d = {
      id: 'd-' + (++seq), code: `${{ temperatura: 'TMP', oxigeno: 'OXI', ph: 'PH', energia: 'ENE', vibracion: 'VIB' }[o.type]}-${seq}`,
      siteId: z.siteId, x: Math.round(z.x + (z.shape === 'circle' ? 0 : z.w / 2) + r.int(-28, 28)), y: Math.round(z.y + (z.shape === 'circle' ? 0 : z.h / 2) + r.int(-22, 22)),
      model: { temperatura: 'SNT-T200', oxigeno: 'SNT-DO5 óptico', ph: 'SNT-PH3', energia: 'SNT-EM40 trifásico', vibracion: 'SNT-VX1 triaxial' }[o.type],
      firmware: r.pick(fw), battery: o.type === 'energia' ? null : r.int(18, 100), status: 'activo', installedAt: iso(now - r.int(30, 700) * 864e5),
      phase: r() * 6.28, period: r.int(600, 1500), offline: false, ...o,
    };
    devices.push(d);
    return d;
  };
  for (let i = 1; i <= 8; i++) {
    add({ type: 'oxigeno', zoneId: `z-j${i}`, name: `Oxígeno disuelto J${i}`, tag: 'agua', base: 8.1 + r.int(-3, 3) / 10, amp: .45, noise: .18, anomaly: i === 4 ? { every: 300, len: 85, delta: -3.8 } : null });
    add({ type: 'temperatura', zoneId: `z-j${i}`, name: `Temperatura agua J${i}`, tag: 'agua', base: 11.4 + r.int(-4, 4) / 10, amp: .5, noise: .12, anomaly: null });
    if ([1, 4, 7].includes(i)) add({ type: 'ph', zoneId: `z-j${i}`, name: `pH agua J${i}`, tag: 'agua', base: 7.7, amp: .08, noise: .04, anomaly: null });
  }
  add({ type: 'energia', zoneId: 'z-ponton', name: 'Generador pontón', tag: 'generador', base: 62, amp: 14, noise: 3, anomaly: null });
  add({ type: 'vibracion', zoneId: 'z-ponton', name: 'Soplador de alimento', tag: 'motor', base: 2.6, amp: .4, noise: .25, anomaly: null });
  add({ type: 'temperatura', zoneId: 'z-ensilaje', name: 'Estanque de ensilaje', tag: 'proceso', base: 14, amp: 1, noise: .2, anomaly: null });
  add({ type: 'temperatura', zoneId: 'z-recep', name: 'Temperatura recepción', tag: 'linea', base: 4.2, amp: .5, noise: .15, anomaly: null });
  add({ type: 'temperatura', zoneId: 'z-linea', name: 'Temperatura línea fileteo', tag: 'linea', base: 6.1, amp: .6, noise: .2, anomaly: null });
  add({ type: 'energia', zoneId: 'z-linea', name: 'Consumo línea de proceso', tag: 'linea', base: 118, amp: 22, noise: 6, anomaly: null });
  add({ type: 'temperatura', zoneId: 'z-frio1', name: 'Cámara 1 · sonda A', tag: 'camara', base: -19.2, amp: .6, noise: .25, anomaly: null });
  add({ type: 'temperatura', zoneId: 'z-frio1', name: 'Cámara 1 · sonda B', tag: 'camara', base: -18.8, amp: .6, noise: .25, anomaly: null });
  add({ type: 'temperatura', zoneId: 'z-frio2', name: 'Cámara 2 · sonda A', tag: 'camara', base: -19, amp: .7, noise: .3, anomaly: { every: 600, len: 150, delta: 6.2 } });
  add({ type: 'temperatura', zoneId: 'z-frio2', name: 'Cámara 2 · sonda B', tag: 'camara', base: -18.6, amp: .7, noise: .3, anomaly: null });
  add({ type: 'vibracion', zoneId: 'z-comp', name: 'Compresor amoníaco 1', tag: 'motor', base: 3.1, amp: .5, noise: .3, anomaly: null });
  add({ type: 'vibracion', zoneId: 'z-comp', name: 'Compresor amoníaco 2', tag: 'motor', base: 3.4, amp: .5, noise: .35, anomaly: { every: 420, len: 100, delta: 5.2 } });
  add({ type: 'vibracion', zoneId: 'z-comp', name: 'Compresor amoníaco 3', tag: 'motor', base: 2.9, amp: .4, noise: .3, anomaly: null });
  add({ type: 'energia', zoneId: 'z-comp', name: 'Consumo compresores', tag: 'frio', base: 145, amp: 18, noise: 5, anomaly: null });
  add({ type: 'energia', zoneId: 'z-elec', name: 'Tablero general planta', tag: 'general', base: 310, amp: 45, noise: 9, anomaly: null });
  add({ type: 'ph', zoneId: 'z-riles', name: 'pH efluente RILes', tag: 'riles', base: 7.2, amp: .25, noise: .08, anomaly: null });
  add({ type: 'temperatura', zoneId: 'z-desp', name: 'Andén de despacho', tag: 'linea', base: 3.8, amp: .7, noise: .2, anomaly: null });
  // Un par de equipos con problemas para que la vista luzca real.
  devices.find(d => d.name === 'pH agua J7').offline = true;
  devices.find(d => d.name === 'pH agua J7').lastSeen = iso(now - 7.5 * 36e5);
  devices.find(d => d.name === 'Temperatura agua J8').battery = 9;
  devices.find(d => d.name === 'Andén de despacho').status = 'mantenimiento';

  const rules = [
    { id: 'r-o2', name: 'Oxígeno crítico en jaulas', type: 'oxigeno', tag: 'agua', deviceId: '', op: '<', threshold: 5, duration: 15, severity: 'critica', notify: 'Turno de operación, Jefe de centro (SMS)', active: true },
    { id: 'r-o2w', name: 'Oxígeno bajo (preventivo)', type: 'oxigeno', tag: 'agua', deviceId: '', op: '<', threshold: 6.2, duration: 40, severity: 'media', notify: 'Turno de operación', active: false },
    { id: 'r-tagua', name: 'Temperatura del agua elevada', type: 'temperatura', tag: 'agua', deviceId: '', op: '>', threshold: 15, duration: 60, severity: 'alta', notify: 'Ingeniería, Veterinaria', active: true },
    { id: 'r-frio', name: 'Cámara de frío sobre -15 °C', type: 'temperatura', tag: 'camara', deviceId: '', op: '>', threshold: -15, duration: 20, severity: 'critica', notify: 'Mantención frío (SMS), Jefe de planta', active: true },
    { id: 'r-vib', name: 'Vibración excesiva (ISO 10816 zona C)', type: 'vibracion', tag: '', deviceId: '', op: '>', threshold: 7.1, duration: 10, severity: 'alta', notify: 'Mantención mecánica', active: true },
    { id: 'r-ph', name: 'pH efluente fuera de norma', type: 'ph', tag: 'riles', deviceId: '', op: '<', threshold: 6.5, duration: 30, severity: 'media', notify: 'Medio ambiente', active: true },
    { id: 'r-ene', name: 'Peak de demanda tablero general', type: 'energia', tag: '', deviceId: devices.find(d => d.name === 'Tablero general planta').id, op: '>', threshold: 355, duration: 90, severity: 'media', notify: 'Jefe de planta', active: true },
  ];

  const sevs = ['critica', 'alta', 'alta', 'media', 'media', 'baja'];
  const alarms = [];
  const ruleDevices = rule => devices.filter(d => rule.deviceId ? d.id === rule.deviceId : d.type === rule.type && (!rule.tag || d.tag === rule.tag));
  for (let i = 0; i < 46; i++) {
    const rule = r.pick(rules.filter(x => x.id !== 'r-o2w'));
    const dev = r.pick(ruleDevices(rule));
    const created = now - r.int(2, 30 * 24) * 36e5 - r.int(0, 59) * 6e4;
    const st = i < 2 ? 'reconocida' : r.bool(.08) ? 'reconocida' : 'resuelta';
    const v = rule.op === '>' ? rule.threshold + r.int(2, 30) / 10 * (rule.type === 'energia' ? 20 : 1) : rule.threshold - r.int(2, 25) / 10;
    alarms.push({ id: 'al' + i, code: `AL-${3200 + i}`, ruleId: rule.id, ruleName: rule.name, deviceId: dev.id, siteId: dev.siteId, value: Math.round(v * 100) / 100, threshold: rule.threshold, op: rule.op, severity: rule.severity || r.pick(sevs), status: st, assignee: r.pick(['u-op', 'u-op2', 'u-op3', 'u-ing']), comments: st === 'resuelta' ? [{ by: r.pick(['u-op', 'u-op2']), at: iso(created + 20 * 6e4), text: r.pick(['Se verifica en terreno, se activa aireación de emergencia.', 'Se revisa sensor y se recalibra.', 'Puerta de cámara quedó abierta durante carga, se cierra.', 'Rodamiento con desgaste, se programa cambio.', 'Falsa alarma por limpieza de sonda.']) }] : [], createdAt: iso(created), ackAt: iso(created + r.int(2, 15) * 6e4), resolvedAt: st === 'resuelta' ? iso(created + r.int(20, 240) * 6e4) : null, cleared: true });
  }
  alarms.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const orders = [];
  const tasks = ['Recalibrar sonda de oxígeno', 'Cambio de rodamiento compresor', 'Limpieza de sensores biofouling', 'Revisión sello puerta cámara', 'Reemplazo de batería sensor', 'Inspección termográfica tablero', 'Mantención preventiva generador', 'Cambio de membrana sensor pH'];
  for (let i = 0; i < 16; i++) {
    const dev = r.pick(devices);
    const st = r.pick(['abierta', 'en curso', 'completada', 'completada', 'completada']);
    const created = now - r.int(0, 25) * 864e5;
    const al = r.bool(.5) ? alarms.find(a => a.deviceId === dev.id) : null;
    orders.push({ id: 'wo' + i, code: `OT-${1500 + i}`, title: r.pick(tasks), deviceId: dev.id, alarmId: al?.id || null, priority: r.pick(['alta', 'media', 'media', 'baja']), status: st, assignee: r.pick(['u-op', 'u-op2', 'u-op3', 'u-ing2']), due: iso(created + r.int(1, 7) * 864e5).slice(0, 10), checklist: [{ text: 'Bloqueo y etiquetado (LOTO)', done: st !== 'abierta' }, { text: 'Ejecutar trabajo', done: st === 'completada' }, { text: 'Prueba de funcionamiento', done: st === 'completada' }], notes: '', createdAt: iso(created) });
  }
  alarms.forEach(a => { const o = orders.find(x => x.alarmId === a.id); if (o) a.workOrderId = o.id; });

  const shifts = [];
  const notes = ['Recambio de redes en jaula 3 sin novedades.', 'Alimentación normal, apetito alto en jaulas 1 y 2.', 'Se detecta baja de oxígeno en J4 durante la madrugada, se activa aireación.', 'Carga de camión refrigerado 2 completada a las 05:40.', 'Compresor 2 con ruido anómalo, se informa a mantención.', 'Corte de energía de 4 minutos, generador respondió OK.', 'Visita de inspección ambiental ficticia sin observaciones.', 'Limpieza de sondas de pH completada.', 'Temperatura cámara 2 subió por apertura prolongada de puerta.'];
  const authors = ['u-op', 'u-op2', 'u-op3'];
  for (let i = 0; i < 24; i++) shifts.push({ id: 'sh' + i, shift: ['A', 'B', 'C'][i % 3], author: r.pick(authors), siteId: r.pick(['s-mar', 's-planta']), text: r.pick(notes), tags: r.pick([['operación'], ['seguridad'], ['mantención'], ['alimentación'], []]), at: iso(now - i * 8 * 36e5 - r.int(0, 3) * 36e5), createdAt: iso(now - i * 8 * 36e5) });

  const firmware = [
    { id: 'fw1', version: '2.3.1', notes: 'Corrección de deriva térmica en sondas.', releasedAt: iso(now - 210 * 864e5), channel: 'estable' },
    { id: 'fw2', version: '2.4.0', notes: 'Nuevo modo de bajo consumo LoRaWAN.', releasedAt: iso(now - 120 * 864e5), channel: 'estable' },
    { id: 'fw3', version: '2.4.2', notes: 'Mejoras de seguridad TLS y reconexión.', releasedAt: iso(now - 45 * 864e5), channel: 'estable' },
    { id: 'fw4', version: '2.5.0-rc1', notes: 'Muestreo a 2 Hz y compresión de telemetría.', releasedAt: iso(now - 6 * 864e5), channel: 'beta' },
  ];
  const rollouts = [{ id: 'ro0', version: '2.4.2', deviceIds: devices.filter(d => d.firmware === '2.4.2').map(d => d.id), by: 'u-ing', startedAt: iso(now - 40 * 864e5), status: 'completado', failed: [] }];

  const apiKeys = [
    { id: 'k1', name: 'Integración SCADA planta', prefix: 'snt_live_8f2a', scopes: ['telemetria:leer', 'alarmas:leer'], createdBy: 'u-admin', lastUsed: iso(now - 4 * 6e4), active: true, createdAt: iso(now - 160 * 864e5) },
    { id: 'k2', name: 'Power BI reportería', prefix: 'snt_live_c19d', scopes: ['telemetria:leer', 'energia:leer'], createdBy: 'u-ing', lastUsed: iso(now - 9 * 36e5), active: true, createdAt: iso(now - 90 * 864e5) },
    { id: 'k3', name: 'Prueba proveedor (revocada)', prefix: 'snt_test_77b0', scopes: ['telemetria:leer'], createdBy: 'u-admin', lastUsed: iso(now - 50 * 864e5), active: false, createdAt: iso(now - 70 * 864e5) },
  ];

  const leads = [
    { id: 'ld1', name: 'Andrea Pozo', company: 'Mitílidos del Sur (ficticia)', email: 'apozo@mitilidos.demo', plan: 'Profesional', message: 'Queremos monitorear 12 long-lines de chorito.', status: 'nuevo', createdAt: iso(now - 2 * 864e5) },
    { id: 'ld2', name: 'Raúl Gatica', company: 'Frigorífico Austral Demo', email: 'rgatica@frigo.demo', plan: 'Empresa', message: 'Necesitamos alertas de cámaras de frío por SMS.', status: 'contactado', createdAt: iso(now - 9 * 864e5) },
  ];

  const site = {
    hero: { eyebrow: 'Plataforma IoT industrial', title: 'Ve tu operación en tiempo real, antes de que falle', subtitle: 'Sentinela conecta sensores de oxígeno, temperatura, pH, energía y vibración en un solo panel con alarmas inteligentes, mapas de planta y órdenes de trabajo.', cta: 'Ver demo en vivo' },
    tariff: 128,
    plans: [
      { id: 'p1', name: 'Inicial', price: 290000, period: 'mes', devices: 'Hasta 25 sensores', features: ['Panel en vivo y mapa de sitio', 'Alarmas por correo', 'Historial 30 días'], featured: false },
      { id: 'p2', name: 'Profesional', price: 790000, period: 'mes', devices: 'Hasta 150 sensores', features: ['Todo lo de Inicial', 'Alarmas SMS y escalamiento', 'Órdenes de trabajo', 'Historial 13 meses', 'API REST'], featured: true },
      { id: 'p3', name: 'Empresa', price: 0, period: 'mes', devices: 'Sensores ilimitados', features: ['Multi-sitio corporativo', 'Despliegue on-premise', 'SSO y auditoría', 'Soporte 24/7 en terreno'], featured: false },
    ],
    contact: { email: 'ventas@sentinela.demo', phone: '+56 65 2 000 000 (ficticio)' },
  };

  const _log = [];
  const acts = [['alarma', () => `Alarma reconocida en ${r.pick(devices).name}`], ['orden', () => `OT-${r.int(1500, 1515)} completada`], ['regla', () => 'Matías Cárcamo editó la regla "Vibración excesiva"'], ['firmware', () => 'Despliegue de firmware 2.4.2 completado'], ['login', u => `${u.name} inició sesión`], ['turno', () => 'Nueva entrada en bitácora de turno']];
  for (let i = 0; i < 50; i++) { const [action, fn] = r.pick(acts); const u = r.pick(users.slice(0, 4)); _log.push({ id: 'lg' + i, at: iso(now - (i * 7 + r.int(0, 6)) * 36e5), action, detail: fn(u), user: u.id }); }

  return { _log, users, sites, zones, devices, rules, alarms, orders, shifts, firmware, rollouts, apiKeys, leads, site };
}
