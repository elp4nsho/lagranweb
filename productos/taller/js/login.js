// Ingreso del equipo y de clientes. Con el portal activo, los clientes pueden crear su cuenta.
import { app } from './app.js';

app.login({
  demoText: 'Cada rol ve un panel distinto según los módulos activos.',
  register: app.has('portal') ? {
    role: 'cliente', title: 'Crear cuenta de cliente',
    fields: [{ name: 'phone', label: 'Celular', type: 'tel', required: true }],
    // Modo local: creamos la ficha de cliente aquí. Con Supabase la crea el trigger lgw_handle_new_user.
    before: v => {
      const c = app.db.find('customers', x => String(x.email || '').toLowerCase() === v.email.toLowerCase()) || app.db.insert('customers', { name: v.name, email: v.email, phone: v.phone, rut: '', address: '', notes: 'Registrado desde el portal' });
      return { customerId: c.id };
    }
  } : null
});
