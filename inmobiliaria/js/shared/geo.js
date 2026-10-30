// Geografía estilizada de Santiago: centros aproximados de comunas en un lienzo 600×540
// (norte arriba). El mapa se dibuja como celdas de Voronoi recortadas al contorno de la ciudad.
export const COMUNAS = [
  { id: 'lo-barnechea', name: 'Lo Barnechea', x: 492, y: 92, uf: 92, rent: 13500, streets: ['Av. La Dehesa', 'Camino Los Trapenses', 'Av. El Rodeo', 'Camino El Alba'] },
  { id: 'vitacura', name: 'Vitacura', x: 405, y: 150, uf: 112, rent: 15800, streets: ['Av. Vitacura', 'Av. Alonso de Córdova', 'Av. Kennedy', 'Luis Pasteur'] },
  { id: 'las-condes', name: 'Las Condes', x: 462, y: 214, uf: 98, rent: 14800, streets: ['Av. Apoquindo', 'Av. Manquehue', 'Av. Cristóbal Colón', 'Av. Los Dominicos'] },
  { id: 'huechuraba', name: 'Huechuraba', x: 262, y: 92, uf: 64, rent: 11800, streets: ['Av. Pedro Fontova', 'Av. El Salto', 'Av. Recoleta Norte', 'Los Libertadores'] },
  { id: 'recoleta', name: 'Recoleta', x: 290, y: 168, uf: 50, rent: 10800, streets: ['Av. Recoleta', 'Dominica', 'Av. Perú', 'Santos Dumont'] },
  { id: 'independencia', name: 'Independencia', x: 226, y: 178, uf: 52, rent: 10900, streets: ['Av. Independencia', 'Gamero', 'Maruri', 'Av. Fermín Vivaceta'] },
  { id: 'providencia', name: 'Providencia', x: 358, y: 228, uf: 88, rent: 14200, streets: ['Av. Providencia', 'Av. Los Leones', 'Av. Pedro de Valdivia', 'Av. Suecia'] },
  { id: 'santiago', name: 'Santiago', x: 262, y: 246, uf: 57, rent: 11600, streets: ['Av. Libertador B. O\'Higgins', 'San Diego', 'Lord Cochrane', 'Santa Isabel'] },
  { id: 'estacion-central', name: 'Estación Central', x: 178, y: 262, uf: 49, rent: 10600, streets: ['Av. Ecuador', 'Las Rejas Norte', 'Av. 5 de Abril', 'San Borja'] },
  { id: 'maipu', name: 'Maipú', x: 92, y: 330, uf: 43, rent: 9800, streets: ['Av. Pajaritos', 'Av. 5 de Abril', 'Av. Américo Vespucio', 'Av. Los Pajaritos Sur'] },
  { id: 'nunoa', name: 'Ñuñoa', x: 352, y: 292, uf: 74, rent: 12900, streets: ['Av. Irarrázaval', 'Av. Grecia', 'Av. Pedro de Valdivia', 'Av. Antonio Varas'] },
  { id: 'la-reina', name: 'La Reina', x: 444, y: 286, uf: 78, rent: 12400, streets: ['Av. Larraín', 'Av. Ossa', 'Av. Príncipe de Gales', 'Av. Echeñique'] },
  { id: 'penalolen', name: 'Peñalolén', x: 452, y: 356, uf: 55, rent: 10800, streets: ['Av. Grecia Oriente', 'Av. Tobalaba', 'Av. Consistorial', 'Av. Las Parcelas'] },
  { id: 'macul', name: 'Macul', x: 362, y: 356, uf: 60, rent: 11200, streets: ['Av. Macul', 'Av. Quilín', 'Av. Departamental', 'Av. Los Olmos'] },
  { id: 'san-miguel', name: 'San Miguel', x: 262, y: 330, uf: 60, rent: 11300, streets: ['Gran Avenida', 'Av. Carlos Valdovinos', 'Llano Subercaseaux', 'Av. Salesianos'] },
  { id: 'la-cisterna', name: 'La Cisterna', x: 250, y: 404, uf: 47, rent: 10100, streets: ['Gran Avenida J. M. Carrera', 'Av. Fernández Albano', 'Av. Lo Ovalle', 'Av. Goycolea'] },
  { id: 'la-florida', name: 'La Florida', x: 370, y: 424, uf: 52, rent: 10400, streets: ['Av. Vicuña Mackenna', 'Av. La Florida', 'Av. Walker Martínez', 'Av. Departamental'] },
  { id: 'puente-alto', name: 'Puente Alto', x: 378, y: 494, uf: 37, rent: 8900, streets: ['Av. Concha y Toro', 'Av. San Carlos', 'Av. Gabriela', 'Av. Eyzaguirre'] }
];
export const comunaById = id => COMUNAS.find(c => c.id === id);
export const comunaName = id => comunaById(id)?.name || id;

export const OUTLINE = [[40, 300], [66, 246], [140, 206], [176, 140], [214, 70], [292, 36], [372, 70], [462, 26], [562, 54], [572, 138], [532, 198], [514, 262], [512, 334], [484, 404], [446, 470], [418, 532], [330, 534], [304, 466], [222, 456], [186, 410], [118, 396], [46, 372]];

// Recorte de Sutherland–Hodgman por el semiplano más cercano a a que a b.
function clipHalf(poly, a, b) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = b[0] - a[0], ny = b[1] - a[1];
  const side = p => (p[0] - mx) * nx + (p[1] - my) * ny; // <0 → lado de a
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
let cells;
export function comunaCells() {
  if (cells) return cells;
  cells = COMUNAS.map(c => {
    let poly = OUTLINE.slice();
    for (const o of COMUNAS) if (o !== c) poly = clipHalf(poly, [c.x, c.y], [o.x, o.y]);
    return { id: c.id, d: 'M' + poly.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z' };
  });
  return cells;
}
