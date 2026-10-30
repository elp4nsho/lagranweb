// Catálogos fijos del centro médico.
export const PREVISIONES = [
  { id: 'fonasa-a', label: 'Fonasa · Tramo A', type: 'fonasa' },
  { id: 'fonasa-b', label: 'Fonasa · Tramo B', type: 'fonasa' },
  { id: 'fonasa-c', label: 'Fonasa · Tramo C', type: 'fonasa' },
  { id: 'fonasa-d', label: 'Fonasa · Tramo D', type: 'fonasa' },
  { id: 'cordillera', label: 'Isapre Cordillera', type: 'isapre' },
  { id: 'austral', label: 'Isapre Austral Salud', type: 'isapre' },
  { id: 'vitalia', label: 'Isapre Vitalia', type: 'isapre' },
  { id: 'pacifico', label: 'Isapre Pacífico', type: 'isapre' },
  { id: 'particular', label: 'Particular (sin previsión)', type: 'particular' }
];
export const PREV_TYPES = { fonasa: 'Fonasa', isapre: 'Isapre', particular: 'Particular' };

export const STATUS = {
  reservada: { label: 'Reservada', badge: 'info' },
  confirmada: { label: 'Confirmada', badge: 'primary' },
  en_espera: { label: 'En sala de espera', badge: 'warning' },
  llamado: { label: 'Llamado', badge: 'warning' },
  en_atencion: { label: 'En atención', badge: 'primary' },
  atendida: { label: 'Atendida', badge: 'success' },
  no_show: { label: 'No asistió', badge: 'danger' },
  cancelada: { label: 'Cancelada', badge: '' }
};
export const ACTIVE_STATUS = ['reservada', 'confirmada', 'en_espera', 'llamado', 'en_atencion'];

export const CIE10 = [
  ['Z00.0', 'Examen médico general'], ['J00', 'Rinofaringitis aguda (resfriado común)'], ['J02.9', 'Faringitis aguda'],
  ['J20.9', 'Bronquitis aguda'], ['J45.9', 'Asma no especificada'], ['I10', 'Hipertensión esencial (primaria)'],
  ['I48', 'Fibrilación auricular'], ['E11.9', 'Diabetes mellitus tipo 2 sin complicaciones'], ['E66.9', 'Obesidad'],
  ['E03.9', 'Hipotiroidismo'], ['E78.5', 'Hiperlipidemia'], ['K29.7', 'Gastritis'], ['K58.9', 'Síndrome de colon irritable'],
  ['M54.5', 'Lumbago'], ['M25.5', 'Dolor articular'], ['S93.4', 'Esguince de tobillo'], ['L20.9', 'Dermatitis atópica'],
  ['L70.0', 'Acné vulgar'], ['H10.9', 'Conjuntivitis'], ['H52.1', 'Miopía'], ['H66.9', 'Otitis media'],
  ['F41.1', 'Trastorno de ansiedad generalizada'], ['F32.0', 'Episodio depresivo leve'], ['G43.9', 'Migraña'],
  ['N39.0', 'Infección de vías urinarias'], ['Z34.9', 'Supervisión de embarazo normal'], ['R51', 'Cefalea'], ['Z71.3', 'Consejería nutricional']
];

export const DRUGS = ['Paracetamol 500 mg', 'Ibuprofeno 400 mg', 'Amoxicilina 500 mg', 'Losartán 50 mg', 'Metformina 850 mg',
  'Levotiroxina 50 mcg', 'Omeprazol 20 mg', 'Loratadina 10 mg', 'Salbutamol inhalador 100 mcg', 'Sertralina 50 mg',
  'Atorvastatina 20 mg', 'Ciclobenzaprina 10 mg', 'Prednisona 20 mg', 'Ácido fólico 1 mg', 'Betametasona crema 0,05%'];

// [nombre, unidad, mínimo, máximo]
export const EXAMS = {
  'Hemograma completo': [['Hemoglobina', 'g/dL', 12, 16], ['Hematocrito', '%', 36, 46], ['Leucocitos', 'x10³/µL', 4.5, 11], ['Plaquetas', 'x10³/µL', 150, 400]],
  'Perfil lipídico': [['Colesterol total', 'mg/dL', 0, 200], ['HDL', 'mg/dL', 40, 90], ['LDL', 'mg/dL', 0, 130], ['Triglicéridos', 'mg/dL', 0, 150]],
  'Glicemia y HbA1c': [['Glicemia en ayunas', 'mg/dL', 70, 100], ['Hemoglobina glicosilada', '%', 4, 5.7]],
  'Perfil tiroideo': [['TSH', 'µUI/mL', 0.4, 4.5], ['T4 libre', 'ng/dL', 0.8, 1.8]],
  'Orina completa': [['pH', '', 5, 8], ['Densidad', '', 1.005, 1.03], ['Leucocitos', '/campo', 0, 5]],
  'Perfil bioquímico': [['Creatinina', 'mg/dL', 0.6, 1.2], ['Nitrógeno ureico', 'mg/dL', 7, 20], ['Ácido úrico', 'mg/dL', 2.5, 7]]
};
