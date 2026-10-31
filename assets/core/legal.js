// Política de privacidad base a partir de la ficha del cliente (PURO: lo usan el sitio y build-client).
// Plantilla orientada a la Ley 19.628 y a la Ley 21.719 de protección de datos personales (Chile),
// cuya entrada en vigencia plena es el 1 de diciembre de 2026. NO reemplaza la revisión de un abogado:
// ajusta finalidades, plazos y encargados (proveedores) a cada cliente antes de publicar.
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function privacyHtml({ brand = {}, legal = {}, contact = {}, backend = {}, domain = '' } = {}, { modules = [] } = {}) {
  const who = legal.razonSocial || brand.name || 'el responsable';
  const mail = legal.privacyEmail || contact.email || '';
  const has = id => modules.includes(id);
  const purposes = [
    'Responder los mensajes y cotizaciones que nos envías desde el sitio.',
    has('agenda') && 'Agendar, confirmar y recordarte tus horas de atención.',
    has('ordenes') && 'Registrar las órdenes de trabajo de tu vehículo e informarte su avance.',
    has('presupuestos') && 'Enviarte presupuestos y registrar tu aprobación o rechazo.',
    has('facturacion') && 'Emitir y conservar los documentos de venta, según exige la normativa tributaria.',
    has('portal') && 'Darte acceso a tu cuenta para revisar tus vehículos, órdenes y documentos.',
    'Administrar las cuentas del equipo y llevar una bitácora de seguridad (inicios de sesión y cambios).'
  ].filter(Boolean);
  const providers = [
    backend.kind === 'supabase' && 'Supabase (base de datos, autenticación y almacenamiento de archivos)',
    'el proveedor de hosting del sitio',
    'el proveedor de correo con el que enviamos avisos y enlaces de acceso'
  ].filter(Boolean);
  return `<article class="legal stack">
  <h1>Política de privacidad</h1>
  <p class="muted small">Última actualización: ${e(legal.updatedAt || new Date().toISOString().slice(0, 10))}</p>
  <h2>1. Responsable</h2>
  <p><b>${e(who)}</b>${legal.rut ? `, RUT ${e(legal.rut)}` : ''}${contact.address ? `, con domicilio en ${e(contact.address)}` : ''}, es responsable del tratamiento de los datos personales que se recogen en ${e(domain || 'este sitio')}.${mail ? ` Contacto para temas de privacidad: <a href="mailto:${e(mail)}">${e(mail)}</a>.` : ''}</p>
  <h2>2. Qué datos tratamos y para qué</h2>
  <p>Nombre, RUT (cuando corresponde), correo, teléfono, datos de tu vehículo (patente, marca, modelo, kilometraje) y el detalle de los servicios que nos solicitas. Los usamos para:</p>
  <ul>${purposes.map(p => `<li>${e(p)}</li>`).join('')}</ul>
  <p>La base de licitud es la ejecución del servicio que nos pides, el cumplimiento de obligaciones legales y, cuando lo indiquemos, tu consentimiento.</p>
  <h2>3. Con quién los compartimos</h2>
  <p>No vendemos tus datos. Los tratan, por encargo nuestro y solo para estos fines: ${providers.map(e).join('; ')}. Algunos de estos proveedores pueden almacenar datos fuera de Chile con garantías adecuadas.</p>
  <h2>4. Cuánto tiempo los guardamos</h2>
  <p>Mientras mantengas una relación con nosotros y, después, por los plazos que exija la ley (por ejemplo, la tributaria) o hasta que pidas su supresión cuando proceda.</p>
  <h2>5. Tus derechos</h2>
  <p>Puedes solicitar acceso, rectificación, supresión, oposición, portabilidad y bloqueo de tus datos${mail ? ` escribiendo a <a href="mailto:${e(mail)}">${e(mail)}</a>` : ''}. Responderemos dentro de los plazos legales. Si no quedas conforme, puedes recurrir a la Agencia de Protección de Datos Personales.</p>
  <h2>6. Seguridad</h2>
  <p>El sitio se sirve con HTTPS, el acceso al panel requiere cuenta personal y cada rol ve solo lo que necesita; los cambios quedan registrados en una bitácora.</p>
  <h2>7. Cookies y almacenamiento local</h2>
  <p>Usamos el almacenamiento del navegador solo para mantener tu sesión y tus preferencias. No usamos cookies de publicidad.</p>
</article>`;
}
