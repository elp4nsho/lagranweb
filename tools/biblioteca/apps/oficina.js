// Biblioteca de vistas de ¿Quién es quién? (/oficina).
// Cada vista: id, título, sección (rol), url (relativa a la carpeta de la app), cuenta demo si
// requiere ingreso, pasos opcionales (`setup`) y los textos (descripción + "puede hacer").
// Los textos salen del código de la app: si cambia una pantalla, actualiza aquí su descripción.

const U = { admin: 'u-admin', rrhh: 'u-rrhh', recepcion: 'u-recepcion', empleado: 'u-nebula' };
const head = '.page-head';
const firstRow = '#content tbody tr >> nth=0';

module.exports = {
  dir: 'oficina',
  name: '¿Quién es quién?',
  kind: 'Directorio y mapa de oficina compartida',
  theme: 'aurora',
  description: 'Edificio de oficinas compartido por varias empresas con directorio público, mapa de puestos y organigrama, app del empleado para reservar puestos y salas, kiosko de recepción de visitas y panel de administración con editor de planos.',
  accounts: {
    'u-admin': { name: 'Carla Muñoz', role: 'Administrador', email: 'admin@quienesquien.demo', password: 'demo123' },
    'u-rrhh': { name: 'Rodrigo Fuentes', role: 'RRHH', email: 'rrhh@quienesquien.demo', password: 'demo123' },
    'u-recepcion': { name: 'Daniela Pizarro', role: 'Recepción', email: 'recepcion@quienesquien.demo', password: 'demo123' },
    'u-nebula': { name: 'Andrés Rojas', role: 'Empleado', email: 'andres.rojas@nebulalabs.demo', password: 'demo123' }
  },
  sections: [
    { id: 'publico', label: 'Sitio público', desc: 'Directorio, mapa y organigrama de la empresa elegida, sin iniciar sesión.' },
    { id: 'empleado', label: 'Empleado', desc: 'Mi espacio: estado del día, reserva de puestos y salas, equipo, calendario, visitas y perfil.' },
    { id: 'recepcion', label: 'Recepción', desc: 'Kiosko de visitas con credencial y registro de visitas del panel.' },
    { id: 'rrhh', label: 'RRHH', desc: 'Personas, áreas, asignación de puestos y bitácora.' },
    { id: 'admin', label: 'Administrador', desc: 'Empresas, pisos y editor de planos, reglas de reserva, usuarios y ajustes del sitio.' }
  ],

  // Bloque aparte de la biblioteca: el cliente elige UNA disposición y UN estilo para su proyecto.
  looks: {
    title: 'Elige el look de tu proyecto',
    note: 'Las capturas de arriba usan el estilo "Aurora" y la disposición clásica. Tu proyecto se entrega con el look que elijas: una de estas 3 disposiciones de página combinada con uno de los 30 estilos visuales del catálogo (colores, tipografías y bordes), adaptado a tu marca.',
    url: 'index.html#/',
    waitFor: '[data-open]',
    items: [
      { id: 'clasica', group: 'Disposición', label: 'Clásica', desc: 'Barra superior y secciones apiladas.', layout: 'clasica' },
      { id: 'revista', group: 'Disposición', label: 'Revista', desc: 'Cabecera centrada tipo diario y columnas asimétricas.', layout: 'revista' },
      { id: 'app', group: 'Disposición', label: 'App', desc: 'Navegación lateral fija y mosaicos.', layout: 'app' },
      { id: 'noir', group: 'Estilo', label: 'Noir Neón', desc: 'Oscuro con acentos brillantes.', theme: 'noir' },
      { id: 'editorial', group: 'Estilo', label: 'Editorial', desc: 'Serif de revista impresa.', theme: 'editorial' },
      { id: 'brutal', group: 'Estilo', label: 'Brutalista', desc: 'Bordes gruesos y contraste alto.', theme: 'brutal' }
    ]
  },

  views: [
    // ================= Sitio público =================
    {
      id: 'directorio', section: 'publico', title: 'Directorio', url: 'index.html#/', waitFor: '[data-open]', mobile: true,
      description: 'Directorio de la empresa elegida con buscador, filtros y tarjetas de cada persona con su estado del día, contacto, puesto y jefatura. Arriba, cifras de asistencia y anuncios fijados.',
      actions: ['Cambiar de empresa del edificio', 'Buscar por nombre, cargo, área o habilidad', 'Filtrar por área, habilidad, piso y estado (oficina, reunión, remoto, vacaciones)', 'Abrir el perfil de una persona', 'Ubicar su puesto en el mapa']
    },
    {
      id: 'perfil', section: 'publico', kind: 'modal', from: 'Botón "Perfil" de una tarjeta del directorio', title: 'Perfil de persona', url: 'index.html#/', waitFor: '[data-open]',
      setup: async h => { await h.click('[data-open]'); await h.modal(); },
      description: 'Ficha con cargo, área, estado de hoy, contacto, jefatura, equipo a cargo, habilidades y un mini plano con la ubicación de su puesto.',
      actions: ['Ver cómo contactarla', 'Saber dónde se sienta y si vino hoy', 'Navegar a su jefatura o a su equipo', 'Ubicarla en el mapa']
    },
    {
      id: 'mapa', section: 'publico', title: 'Mapa de la oficina', url: 'index.html#/mapa', waitFor: '.fp', mobile: true,
      description: 'Plano interactivo por piso con salas, puestos fijos y flexibles y quién está sentado en cada uno, con ocupación del día y leyenda.',
      actions: ['Cambiar de piso', 'Buscar y ubicar a una persona en el plano', 'Acercar, alejar y arrastrar el plano', 'Ver ocupación, puestos libres y reservas flexibles', 'Ir a reservar un puesto']
    },
    {
      id: 'mapa-ubicar', section: 'publico', title: 'Ubicar a una persona', url: 'index.html#/mapa?p=nebula-1', waitFor: '.fp',
      description: 'El mapa al llegar desde "Ver en el mapa": abre el piso correcto y destaca el puesto de la persona.',
      actions: ['Ver el puesto destacado en su piso', 'Abrir el perfil desde el plano', 'Buscar a otra persona']
    },
    {
      id: 'organigrama', section: 'publico', title: 'Organigrama', url: 'index.html#/organigrama', waitFor: '#view .card, #view [data-open]',
      description: 'Organigrama de la empresa desde la gerencia hasta cada área, con jefaturas, cantidad de personas y buscador que resalta a alguien.',
      actions: ['Recorrer la estructura por áreas', 'Expandir o contraer ramas', 'Resaltar a una persona', 'Abrir el perfil de cualquiera']
    },
    {
      id: 'login', section: 'publico', title: 'Ingreso', url: 'login.html', waitFor: '.demo-account', mobile: true,
      description: 'Ingreso con cuentas de prueba para cada rol. Cada uno abre una app distinta: panel, recepción (kiosko) o espacio del empleado.',
      actions: ['Ingresar con correo y contraseña', 'Entrar con un clic como administración, RRHH, recepción o empleado', 'Volver al directorio público']
    },

    // ================= Empleado =================
    {
      id: 'empleado-inicio', section: 'empleado', login: U.empleado, title: 'Inicio del empleado', url: 'empleado.html#/', waitFor: '.page-head, h1', mobile: true,
      description: 'Inicio de "Mi espacio" con el estado del día, el puesto de hoy, próximas reservas, la agenda del día, quién de su equipo está en la oficina y anuncios.',
      actions: ['Declarar dónde trabaja hoy (oficina, reunión, remoto, vacaciones)', 'Ver o reservar su puesto del día', 'Revisar próximas reservas y agenda', 'Ver dónde está su equipo hoy', 'Leer anuncios y notificaciones']
    },
    {
      id: 'empleado-reservar', section: 'empleado', login: U.empleado, title: 'Reservar puesto', url: 'empleado.html#/reservas', waitFor: '.book-stage', mobile: true,
      description: 'Reserva de puesto flexible: se elige un día y se toca un puesto libre en el plano. Respeta las reglas del edificio (anticipación, máximo semanal, barrios por área).',
      actions: ['Elegir el día con los puestos libres de cada uno', 'Cambiar de piso y acercar el plano', 'Reservar un puesto con un toque', 'Ver y cancelar sus reservas', 'Revisar las reglas de reserva']
    },
    {
      id: 'empleado-salas', section: 'empleado', login: U.empleado, title: 'Salas de reuniones', url: 'empleado.html#/salas', waitFor: '.rcal-s',
      description: 'Agenda de las salas por día en bloques de media hora. Las reservas propias aparecen destacadas.',
      actions: ['Cambiar de día', 'Ver la ocupación de cada sala', 'Reservar un bloque libre', 'Editar o cancelar sus reuniones']
    },
    {
      id: 'empleado-sala', section: 'empleado', login: U.empleado, kind: 'modal', from: 'Clic en un bloque libre de la agenda de salas', title: 'Reservar sala', url: 'empleado.html#/salas', waitFor: '.rcal-s',
      setup: async h => { await h.click('[data-d="1"]'); await h.wait('.rcal-s:not(.past)'); await h.click('.rcal-s:not(.past) >> nth=12'); await h.modal(); },
      description: 'Reserva de una sala con título, horario de inicio y término y asistentes. Avisa si choca con otra reunión.',
      actions: ['Escribir el título de la reunión', 'Ajustar inicio y término', 'Indicar asistentes', 'Guardar la reserva']
    },
    {
      id: 'empleado-equipo', section: 'empleado', login: U.empleado, title: 'Mi equipo', url: 'empleado.html#/equipo', waitFor: '.page-head',
      description: 'Su jefatura y las personas de su área con estado del día, puesto, correo y anexo.',
      actions: ['Ver a su jefatura', 'Ver quién del área está en la oficina, en reunión o remoto', 'Contactar a cualquiera']
    },
    {
      id: 'empleado-calendario', section: 'empleado', login: U.empleado, title: 'Calendario del equipo', url: 'empleado.html#/calendario', waitFor: '.page-head',
      description: 'Planificación semanal de quién va a la oficina, según patrones de días habituales, reservas y vacaciones.',
      actions: ['Ver la semana de su área, su equipo directo o la empresa', 'Cambiar de semana', 'Coordinar días presenciales con su equipo']
    },
    {
      id: 'empleado-visitas', section: 'empleado', login: U.empleado, title: 'Mis visitas', url: 'empleado.html#/visitas', waitFor: '.page-head',
      description: 'Visitas pre-registradas por el empleado e historial. Recepción las ve en el kiosko y le avisa cuando llegan.',
      actions: ['Invitar una visita', 'Ver las próximas y en curso', 'Revisar el historial de visitas']
    },
    {
      id: 'empleado-invitar', section: 'empleado', login: U.empleado, kind: 'modal', from: 'Botón "Invitar visita" en Mis visitas', title: 'Invitar visita', url: 'empleado.html#/visitas', waitFor: '.page-head',
      setup: async h => { await h.click('button:has-text("Invitar visita")'); await h.modal(); },
      description: 'Pre-registro de una visita con nombre, documento, empresa, fecha, hora y motivo.',
      actions: ['Ingresar los datos de la visita', 'Elegir fecha, hora y motivo', 'Dejarla esperada en recepción']
    },
    {
      id: 'empleado-perfil', section: 'empleado', login: U.empleado, title: 'Mi perfil', url: 'empleado.html#/perfil', waitFor: '.page-head',
      description: 'Datos que sus colegas ven en el directorio: teléfono, ciudad, pronombres, habilidades, presentación y días habituales en la oficina. Cargo y área los mantiene RRHH.',
      actions: ['Actualizar teléfono, ciudad y pronombres', 'Escribir su presentación y habilidades', 'Marcar sus días habituales en la oficina', 'Cambiar la contraseña', 'Ver su ficha pública']
    },

    // ================= Recepción =================
    {
      id: 'kiosko', section: 'recepcion', login: U.recepcion, title: 'Kiosko de recepción', url: 'recepcion.html', waitFor: '[data-form]', mobile: true,
      description: 'Pantalla de recepción para registrar visitas: buscar al anfitrión, completar los datos y emitir la credencial. Al lado, visitas esperadas, en el edificio y que ya salieron.',
      actions: ['Buscar a quién se visita por nombre o área', 'Registrar la visita con documento, empresa y motivo', 'Hacer check-in de visitas pre-registradas', 'Marcar salidas', 'Pasar a modo kiosko a pantalla completa']
    },
    {
      id: 'kiosko-credencial', section: 'recepcion', login: U.recepcion, kind: 'modal', from: 'Botón "Registrar y obtener credencial" del kiosko', title: 'Credencial de visita', url: 'recepcion.html', waitFor: '[data-form]',
      setup: async h => {
        await h.fill('#v-name', 'Laura Méndez Soto'); await h.fill('#v-doc', '16.482.335-K'); await h.fill('#v-org', 'Consultora Pampa');
        await h.page.locator('#v-host').selectOption({ index: 3 }); await h.check('[data-form] [name="ok"]');
        await h.click('[data-form] button[type="submit"], [data-form] .btn-primary'); await h.modal();
      },
      description: 'Credencial imprimible con nombre, empresa, anfitrión, piso, hora de ingreso y la red Wi-Fi de visitas. El anfitrión recibe el aviso de llegada.',
      actions: ['Imprimir la credencial', 'Ver anfitrión, piso y hora de ingreso', 'Entregar los datos de Wi-Fi de visitas']
    },
    {
      id: 'recepcion-visitas', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'RRHH', 'Recepción'], title: 'Registro de visitas', url: 'admin.html#/visitas', waitFor: firstRow,
      description: 'Registro de visitas del panel con indicadores del día, permanencia promedio y la tabla de visitas con anfitrión, motivo y estado.',
      actions: ['Registrar una llegada o pre-registrar una visita', 'Hacer check-in y marcar salidas', 'Reimprimir credenciales', 'Filtrar por periodo, estado y motivo', 'Abrir el kiosko y exportar a CSV']
    },
    {
      id: 'recepcion-registrar', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'RRHH', 'Recepción'], kind: 'modal', from: 'Botón "Registrar llegada" en Visitas', title: 'Registrar llegada de visita', url: 'admin.html#/visitas', waitFor: firstRow,
      setup: async h => { await h.click('[data-act="new"]'); await h.modal(); },
      description: 'Registro manual de una visita que llega, con anfitrión, motivo y datos de identificación.',
      actions: ['Ingresar nombre, documento y empresa', 'Elegir anfitrión y motivo', 'Registrar el ingreso y emitir la credencial']
    },
    {
      id: 'recepcion-anuncios', section: 'recepcion', login: U.recepcion, roles: ['Administrador', 'RRHH', 'Recepción'], title: 'Anuncios', url: 'admin.html#/anuncios', waitFor: firstRow,
      description: 'Comunicados con audiencia (todos, app de empleados o kiosko), empresa, fecha y estado. Aparecen al instante en el directorio, la app y el kiosko.',
      actions: ['Crear y editar anuncios', 'Elegir audiencia y empresa', 'Fijar anuncios arriba', 'Publicar u ocultar', 'Exportar a CSV']
    },

    // ================= RRHH =================
    {
      id: 'rrhh-dashboard', section: 'rrhh', login: U.rrhh, roles: ['Administrador', 'RRHH', 'Recepción'], title: 'Dashboard', url: 'admin.html#/', waitFor: head, mobile: true,
      description: 'Indicadores de la empresa elegida: personas, presentes hoy, ocupación de puestos, puestos libres, visitas y salas reservadas, con tendencia de asistencia y ocupación por piso y por día.',
      actions: ['Cambiar de empresa del edificio', 'Ver asistencia y ocupación de hoy', 'Seguir la tendencia semanal de uso de puestos', 'Revisar ocupación por piso y por día de la semana', 'Ir a las visitas de hoy']
    },
    {
      id: 'rrhh-personas', section: 'rrhh', login: U.rrhh, roles: ['Administrador', 'RRHH'], title: 'Personas', url: 'admin.html#/empleados', waitFor: firstRow,
      description: 'Nómina de la empresa con área, estado de hoy, puesto, correo y anexo.',
      actions: ['Buscar y filtrar por área, estado y tipo de puesto', 'Crear o editar personas', 'Importar personas desde CSV', 'Abrir la ficha de una persona', 'Exportar a CSV']
    },
    {
      id: 'rrhh-persona', section: 'rrhh', login: U.rrhh, roles: ['Administrador', 'RRHH'], title: 'Ficha de persona', url: 'admin.html#/empleados/nebula-1', waitFor: head,
      description: 'Ficha interna con datos laborales, jefatura, puesto asignado, reservas, vacaciones y equipo a cargo.',
      actions: ['Editar cargo, área y jefatura', 'Asignar o cambiar el puesto', 'Registrar vacaciones', 'Ver reservas y equipo a cargo']
    },
    {
      id: 'rrhh-importar', section: 'rrhh', login: U.rrhh, roles: ['Administrador', 'RRHH'], kind: 'modal', from: 'Botón "Importar CSV" en Personas', title: 'Importar personas desde CSV', url: 'admin.html#/empleados', waitFor: firstRow,
      setup: async h => { await h.click('[data-act="import"]'); await h.modal(); await h.click('.modal [data-sample]'); await h.pause(300); },
      description: 'Carga masiva de personas pegando o subiendo un CSV, con ejemplo de formato y vista previa de lo que se va a crear.',
      actions: ['Pegar filas o subir un archivo', 'Cargar un ejemplo', 'Revisar la vista previa con errores', 'Importar las filas válidas']
    },
    {
      id: 'rrhh-areas', section: 'rrhh', login: U.rrhh, roles: ['Administrador', 'RRHH'], title: 'Áreas y equipos', url: 'admin.html#/areas', waitFor: firstRow,
      description: 'Áreas de la empresa con color, jefatura, cantidad de personas y presentes hoy. Los colores se usan en el mapa, el directorio y el organigrama.',
      actions: ['Crear y editar áreas', 'Asignar la jefatura', 'Elegir el color del área', 'Ver a las personas de un área']
    },
    {
      id: 'rrhh-puestos', section: 'rrhh', login: U.rrhh, roles: ['Administrador', 'RRHH'], title: 'Puestos y reservas', url: 'admin.html#/asignacion', waitFor: firstRow,
      description: 'Asignación de puestos fijos por persona y listado de reservas flexibles, con acceso a la asignación directa sobre el plano.',
      actions: ['Asignar o quitar un puesto fijo', 'Filtrar por asignación y área', 'Ver y crear reservas flexibles', 'Asignar puestos en el plano', 'Exportar a CSV']
    },
    {
      id: 'rrhh-bitacora', section: 'rrhh', login: U.rrhh, roles: ['Administrador', 'RRHH'], title: 'Bitácora', url: 'admin.html#/bitacora', waitFor: head,
      description: 'Registro de acciones del sistema: reservas, visitas, cambios de personas, planos y ajustes.',
      actions: ['Filtrar por acción y usuario', 'Buscar en el registro', 'Exportar a CSV']
    },

    // ================= Administrador =================
    {
      id: 'admin-empresas', section: 'admin', login: U.admin, title: 'Empresas', url: 'admin.html#/empresas', waitFor: firstRow,
      description: 'Empresas que comparten el edificio, cada una con su dominio, personas, pisos, puestos y estado.',
      actions: ['Crear una empresa', 'Editar datos y dominio', 'Gestionar una empresa (cambia el contexto del panel)', 'Activar o desactivar', 'Exportar a CSV']
    },
    {
      id: 'admin-pisos', section: 'admin', login: U.admin, title: 'Pisos y planos', url: 'admin.html#/pisos', waitFor: head,
      description: 'Pisos de la empresa con miniatura del plano, puestos asignados y flexibles, salas y zonas.',
      actions: ['Crear un piso desde una plantilla', 'Abrir el editor de planos', 'Renombrar, duplicar o eliminar pisos']
    },
    {
      id: 'admin-editor', section: 'admin', login: U.admin, title: 'Editor de planos', url: 'admin.html#/pisos/nebula-f1', waitFor: '.fp, svg',
      description: 'Editor visual del piso: se agregan, mueven y redimensionan salas, puestos y zonas, y se define el tipo de cada puesto.',
      actions: ['Agregar salas, puestos y zonas', 'Mover y redimensionar con el mouse', 'Marcar puestos como fijos o flexibles', 'Deshacer cambios y guardar el plano']
    },
    {
      id: 'admin-reglas', section: 'admin', login: U.admin, title: 'Reglas y barrios', url: 'admin.html#/reglas', waitFor: head,
      description: 'Reglas de reserva de puestos flexibles (anticipación, máximo semanal, hora límite de check-in, liberación automática, fines de semana) y asignación de cada zona a un área como barrio.',
      actions: ['Ajustar anticipación y máximo de reservas', 'Fijar la hora límite de check-in', 'Activar liberación automática de no-shows', 'Asignar zonas como barrios de un área']
    },
    {
      id: 'admin-salas', section: 'admin', login: U.admin, roles: ['Administrador', 'RRHH', 'Recepción'], title: 'Salas de reuniones', url: 'admin.html#/salas', waitFor: '.rcal-s',
      description: 'Agenda de todas las salas por día con las reservas de toda la empresa y la lista de reuniones del día.',
      actions: ['Ver la ocupación de todas las salas', 'Reservar a nombre de alguien', 'Editar o eliminar reservas', 'Exportar las reservas del día']
    },
    {
      id: 'admin-usuarios', section: 'admin', login: U.admin, title: 'Usuarios y roles', url: 'admin.html#/usuarios', waitFor: firstRow,
      description: 'Cuentas de acceso con rol, persona asociada, último acceso y estado, con la descripción de qué puede hacer cada rol.',
      actions: ['Crear usuarios y asignar rol', 'Vincular un usuario a una persona del directorio', 'Activar o desactivar cuentas', 'Exportar a CSV']
    },
    {
      id: 'admin-ajustes', section: 'admin', login: U.admin, title: 'Ajustes del sitio', url: 'admin.html#/ajustes', waitFor: head,
      description: 'Textos del directorio público, visibilidad de teléfonos y organigrama, mensajes del kiosko y Wi-Fi de visitas, con vista previa y restablecimiento de datos demo.',
      actions: ['Editar título y bajada del directorio', 'Mostrar u ocultar teléfonos y organigrama', 'Configurar los textos del kiosko y el Wi-Fi', 'Restablecer los datos de demostración']
    }
  ]
};
