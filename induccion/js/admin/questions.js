// Banco de preguntas: CRUD con alternativas y respuesta correcta.
import { crud, badge, html, escape, formDialog } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { modulesSorted, getModule } from '../data/model.js';

const DIFF = { baja: ['Baja', 'success'], media: ['Media', 'warning'], alta: ['Alta', 'danger'] };

export function renderQuestions(el, _p, ctx) {
  const mods = modulesSorted().filter(m => m.mode !== 'quiz');
  const stats = q => { const all = db.all('attempts').filter(t => t.answers).flatMap(t => t.answers).filter(a => a.q === q.id); return all.length ? Math.round(all.filter(a => a.ok).length / all.length * 100) : null; };
  crud(el, ctx, {
    key: 'questions', title: 'Banco de preguntas', subtitle: 'Las evaluaciones toman preguntas al azar de los módulos del plan. Marca la alternativa correcta.', singular: 'pregunta', collection: 'questions', size: 'lg',
    rows: () => db.all('questions').map(q => ({ ...q, _hit: stats(q) })),
    search: q => `${q.q} ${q.options.join(' ')}`,
    filters: [
      { key: 'moduleId', label: 'Módulo', options: mods.map(m => [m.id, m.title]) },
      { key: 'difficulty', label: 'Dificultad', options: Object.entries(DIFF).map(([k, v]) => [k, v[0]]) },
      { key: 'active', label: 'Estado', options: [['1', 'Activas'], ['0', 'Inactivas']], test: (q, v) => (q.active !== false) === (v === '1') }
    ],
    columns: [
      { key: 'q', label: 'Pregunta', render: q => html`<b>${q.q}</b><br><small class="muted">✓ ${q.options[q.answer]}</small>` },
      { key: 'moduleId', label: 'Módulo', render: q => escape(getModule(q.moduleId)?.title || '—') },
      { key: 'difficulty', label: 'Dificultad', render: q => badge(DIFF[q.difficulty]?.[0] || '—', DIFF[q.difficulty]?.[1]) },
      { key: '_hit', label: '% acierto', value: q => q._hit ?? -1, render: q => q._hit == null ? '<span class="muted">—</span>' : `${q._hit}%` },
      { key: 'active', label: 'Estado', render: q => q.active === false ? badge('Inactiva', 'danger') : badge('Activa', 'success') }
    ],
    fields: () => [
      { name: 'q', label: 'Enunciado', type: 'textarea', required: true },
      { name: 'o0', label: 'Alternativa A', required: true, half: true }, { name: 'o1', label: 'Alternativa B', required: true, half: true },
      { name: 'o2', label: 'Alternativa C', required: true, half: true }, { name: 'o3', label: 'Alternativa D', required: true, half: true },
      { name: 'answer', label: 'Alternativa correcta', type: 'select', options: [['0', 'A'], ['1', 'B'], ['2', 'C'], ['3', 'D']], half: true },
      { name: 'moduleId', label: 'Módulo / tema', type: 'select', options: mods.map(m => [m.id, m.title]), half: true },
      { name: 'difficulty', label: 'Dificultad', type: 'select', options: Object.entries(DIFF).map(([k, v]) => [k, v[0]]), half: true, value: 'media' },
      { name: 'why', label: 'Explicación (se muestra al responder)', type: 'textarea' },
      { name: 'active', label: 'Activa (puede salir en evaluaciones)', type: 'checkbox', value: true }
    ],
    toForm: q => ({ ...q, o0: q.options[0], o1: q.options[1], o2: q.options[2], o3: q.options[3], answer: String(q.answer) }),
    validate: v => new Set([v.o0, v.o1, v.o2, v.o3].map(s => s.toLowerCase())).size < 4 ? { o3: 'Las alternativas deben ser distintas' } : {},
    toRecord: v => ({ q: v.q, options: [v.o0, v.o1, v.o2, v.o3], answer: +v.answer, moduleId: v.moduleId, difficulty: v.difficulty, why: v.why, active: v.active, title: v.q.slice(0, 40) }),
    rowActions: [{ act: 'preview', label: 'Previsualizar', short: '👁', run: q => formDialog({ title: 'Vista previa', fields: [{ name: 'x', label: q.q, type: 'select', options: q.options.map((o, i) => [i, `${'ABCD'[i]}) ${o}${i === q.answer ? '  ✓' : ''}`]) }], submit: 'Cerrar', intro: escape(q.why || '') }) }],
    csv: q => ({ pregunta: q.q, a: q.options[0], b: q.options[1], c: q.options[2], d: q.options[3], correcta: 'ABCD'[q.answer], modulo: getModule(q.moduleId)?.title || '', dificultad: q.difficulty, acierto: q._hit == null ? '' : q._hit + '%', estado: q.active === false ? 'Inactiva' : 'Activa' })
  });
}
