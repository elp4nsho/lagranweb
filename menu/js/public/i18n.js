// Textos de la app del comensal en español e inglés.
const T = {
  es: {
    table: 'Mesa', menu: 'Carta', myOrder: 'Mi pedido', bill: 'Cuenta', callWaiter: 'Llamar garzón', waiterCalled: 'Garzón avisado',
    search: 'Buscar plato…', filters: 'Filtros', clear: 'Limpiar', noResults: 'No hay platos con esos filtros.', soldOut: 'Agotado', popular: 'Favorito',
    required: 'Obligatorio', optional: 'Opcional', pickOne: 'Elige 1', pickMany: 'Elige los que quieras', note: 'Nota para la cocina', notePh: 'Ej: sin cebolla, salsa aparte…',
    add: 'Agregar', added: 'agregado', chooseReq: 'Elige una opción en', cart: 'Tu pedido', cartEmpty: 'Aún no agregas platos.', browse: 'Ver la carta',
    orderNote: 'Comentario general', orderNotePh: 'Ej: traer todo al mismo tiempo', guests: 'Personas en la mesa', subtotal: 'Subtotal', total: 'Total',
    send: 'Enviar a cocina', sent: 'Pedido enviado a cocina 🔥', viewCart: 'Ver pedido', each: 'c/u', remove: 'Quitar',
    statusTitle: 'Estado de tu pedido', noOrders: 'Todavía no envías pedidos desde esta mesa.', orderNo: 'Pedido', placed: 'Enviado',
    stEnviado: 'Recibido', stPreparando: 'En preparación', stListo: 'Listo para servir', stEntregado: 'Servido',
    keepOrdering: 'Seguir pidiendo', billTitle: 'Tu cuenta', tip: 'Propina', noTip: 'Sin propina', custom: 'Otra', split: 'Dividir la cuenta',
    people: 'personas', perPerson: 'Cada uno paga', method: 'Medio de pago', requestBill: 'Pedir la cuenta al garzón', billRequested: 'Cuenta solicitada. El garzón viene con la máquina.',
    payApp: 'Pagar ahora en la app', paying: 'Procesando pago…', paid: '¡Pago recibido! Gracias por venir', rateTitle: '¿Cómo estuvo todo?', food: 'Comida', service: 'Atención', ambience: 'Ambiente',
    comment: 'Comentario (opcional)', sendRating: 'Enviar opinión', thanksRating: '¡Gracias por tu opinión!', newVisit: 'Empezar nueva visita',
    nothingToPay: 'Aún no hay consumos en esta mesa.', closedNow: 'Cerrado ahora', openUntil: 'Abierto hasta las', orderingOff: 'Los pedidos desde la mesa están pausados. Llama al garzón.',
    waiterOnWay: 'El garzón va en camino', ready: '¡Tu plato está listo! Va a la mesa', card: 'Tarjeta', cash: 'Efectivo', transfer: 'Transferencia', app: 'App',
    viewOnly: 'Estás viendo la carta. Para pedir, escanea el QR de tu mesa.', even: 'Partes iguales', byItems: 'Por consumo', yourItems: 'Marca lo que consumiste', yourShare: 'Tu parte'
  },
  en: {
    table: 'Table', menu: 'Menu', myOrder: 'My order', bill: 'Bill', callWaiter: 'Call waiter', waiterCalled: 'Waiter notified',
    search: 'Search dishes…', filters: 'Filters', clear: 'Clear', noResults: 'No dishes match those filters.', soldOut: 'Sold out', popular: 'Favourite',
    required: 'Required', optional: 'Optional', pickOne: 'Pick 1', pickMany: 'Pick any', note: 'Note for the kitchen', notePh: 'E.g. no onion, sauce on the side…',
    add: 'Add', added: 'added', chooseReq: 'Please choose an option in', cart: 'Your order', cartEmpty: 'You haven\'t added anything yet.', browse: 'Browse the menu',
    orderNote: 'General comment', orderNotePh: 'E.g. bring everything together', guests: 'People at the table', subtotal: 'Subtotal', total: 'Total',
    send: 'Send to kitchen', sent: 'Order sent to the kitchen 🔥', viewCart: 'View order', each: 'each', remove: 'Remove',
    statusTitle: 'Your order status', noOrders: 'No orders sent from this table yet.', orderNo: 'Order', placed: 'Sent',
    stEnviado: 'Received', stPreparando: 'Cooking', stListo: 'Ready to serve', stEntregado: 'Served',
    keepOrdering: 'Keep ordering', billTitle: 'Your bill', tip: 'Tip', noTip: 'No tip', custom: 'Other', split: 'Split the bill',
    people: 'people', perPerson: 'Each pays', method: 'Payment method', requestBill: 'Ask the waiter for the bill', billRequested: 'Bill requested. Your waiter is on the way.',
    payApp: 'Pay now in the app', paying: 'Processing payment…', paid: 'Payment received! Thanks for coming', rateTitle: 'How was everything?', food: 'Food', service: 'Service', ambience: 'Ambience',
    comment: 'Comment (optional)', sendRating: 'Send review', thanksRating: 'Thanks for your feedback!', newVisit: 'Start a new visit',
    nothingToPay: 'Nothing on this table yet.', closedNow: 'Closed now', openUntil: 'Open until', orderingOff: 'Table ordering is paused. Please call your waiter.',
    waiterOnWay: 'Your waiter is on the way', ready: 'Your dish is ready! On its way', card: 'Card', cash: 'Cash', transfer: 'Transfer', app: 'App',
    viewOnly: 'You are browsing the menu. To order, scan your table\'s QR code.', even: 'Equal parts', byItems: 'By items', yourItems: 'Tick what you had', yourShare: 'Your share'
  }
};

const KEY = 'lgw:menu:lang';
let lang = (() => { try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'es'; } catch (e) { return 'es'; } })();

export const getLang = () => lang;
export function setLang(l) { lang = l === 'en' ? 'en' : 'es'; try { localStorage.setItem(KEY, lang); } catch (e) { /* sin storage */ } document.documentElement.lang = lang; }
export const t = k => T[lang][k] ?? T.es[k] ?? k;
export const tr = o => (o && typeof o === 'object' ? (o[lang] || o.es || '') : (o ?? ''));
document.documentElement.lang = lang;
