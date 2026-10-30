// Ubicaciones predefinidas de la planta 3D donde se pueden colocar puntos de interés.
// pos = posición del marcador; cam = posición de la cámara al enfocarlo.
export const ANCHORS = {
  guia: { name: 'Guía virtual (Ana)', pos: [-6, 2.1, 11], cam: [-3.2, 2.8, 16.5] },
  planta: { name: 'Vista general de la planta', pos: [0, 0.5, -2], cam: [2, 30, 26] },
  operacion: { name: 'Chancador (vista alta)', pos: [10, 4.5, -9], cam: [1, 10, 4] },
  reglas: { name: 'Pasillo central', pos: [2, 0.5, 6], cam: [8, 6, 17] },
  acceso: { name: 'Control de acceso', pos: [-8, 2.4, 14], cam: [-3, 6, 24] },
  pasillo: { name: 'Pasillo peatonal oeste', pos: [-15, 0.6, 6], cam: [-9, 5, 15] },
  racks: { name: 'Racks de almacenamiento', pos: [-12, 4.6, -7], cam: [-1, 10, 9] },
  grua: { name: 'Carril de grúas horquilla', pos: [-8, 3, 1.5], cam: [-1, 5, 10] },
  chancador: { name: 'Chancador y correa', pos: [10, 5, -9], cam: [3, 9, 3] },
  extintor: { name: 'Extintor muro este', pos: [21.3, 1.6, 1.5], cam: [14, 4, 7] },
  salida: { name: 'Salida de emergencia este', pos: [21.6, 3, 6], cam: [12, 5, 13] },
  alarma: { name: 'Baliza de alarma', pos: [0, 6.6, -14.4], cam: [2, 6, -2] },
  detener: { name: 'Zona de chancado (frente)', pos: [10, 2.2, -4.6], cam: [6, 5, 3] },
  ruta: { name: 'Ruta de evacuación', pos: [15, 0.8, 6], cam: [9, 5, 14] },
  salidaE: { name: 'Puerta de emergencia', pos: [22, 3, 6], cam: [16, 5, 13] },
  encuentro: { name: 'Punto de encuentro', pos: [30, 2.4, 12], cam: [24, 6, 20] },
  estanques: { name: 'Estanques de químicos', pos: [17, 4.6, 11.5], cam: [12, 7, 20] }
};
export const anchorOptions = () => Object.entries(ANCHORS).map(([k, a]) => [k, a.name]);
