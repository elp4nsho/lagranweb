// Producto "Taller" sobre el kernel: una sola definición, módulos activables por cliente.
// Lo importan todas las páginas (site, login, admin, portal).
import { defineApp } from '../../../assets/core/app.js';
import { adapterFor } from '../../../assets/core/client.js';
import product from '../product.js';
import client from './client.js';
import * as installers from './modules/index.js';

// Textos iniciales del sitio a partir de la ficha del cliente (luego se editan en Configuración).
const c = client.contact || {};
client.settings = {
  name: client.brand.name, short: client.brand.short,
  ...(client.brand.tagline ? { tagline: client.brand.tagline } : {}),
  ...Object.fromEntries(['phone', 'whatsapp', 'email', 'address', 'hours'].filter(k => c[k]).map(k => [k, c[k]])),
  ...(client.settings || {})
};

const modules = product.modules.map(m => ({ ...m, install: installers[m.id] }));
const adapter = await adapterFor(client.backend);

export const app = defineApp({
  name: product.dbName, version: 1,
  brand: { name: client.brand.name, logo: client.brand.logo || '🔧' },
  modules, client, adapter
});
export const { db, auth } = app;
app.res ||= {};
