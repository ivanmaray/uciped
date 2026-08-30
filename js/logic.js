// MATRIZ 1: Tabla auxiliar para neonatos y lactantes pequeños basada en PESO
// [peso_kg, ETT_sin_balón_mm, ETT_longitud_cm, sonda_aspiracion_fr, mascarilla_facial]
const MATRIZ_1 = [
  [0.7, 2.5, 7.5, 9, 5],
  [1.1, 2.5, 8.0, 9.5, 5],
  [1.6, 3.0, 8.5, 10, 6],
  [2.1, 3.0, 9.0, 10.5, 6],
  [2.6, 3.0, 9.5, 11, 6],
  [3.1, 3.0, 10.5, 13, 6]
];

// MATRIZ 2: Tabla base para seleccionar tamaños de material pediátrico por edad en días
// [edad_dias, ETT_con_balón_mm, ETT_oral_cm, ETT_nasal_cm, sonda_aspiracion_fr, sonda_vesical_fr, tubo_torax_fr]
const MATRIZ_2 = [
  [0, 3.5, 11, 14, 6, 6, 10],
  [90, 4.0, 12, 15, 8, 6, 10],
  [180, 4.0, 12.5, 15.5, 8, 6, 10],
  [365, 4.5, 13, 16, 10, 6, 12],
  [730, 5.0, 13.5, 16.5, 10, 8, 12],
  [1095, 5.0, 14, 17, 10, 8, 16],
  [1460, 5.5, 14.5, 17.5, 10, 8, 16],
  [1825, 5.5, 15, 18, 10, 8, 16],
  [2190, 6.0, 15.5, 18.5, 10, 8, 16],
  [2555, 6.0, 16, 19, 10, 8, 16],
  [2920, 6.5, 16.5, 19.5, 10, 8, 16],
  [3285, 6.5, 17, 20, 10, 8, 16],
  [3650, 7.0, 17.5, 20.5, 10, 10, 18],
  [4015, 7.0, 18, 21, 12, 10, 18],
  [4380, 7.5, 18.5, 21.5, 12, 10, 18],
  [4745, 7.5, 21, 24, 12, 10, 20],
  [5110, 8.0, 21, 24, 12, 12, 20]
];

// Función para buscar valores en MATRIZ 1 (basada en peso)
// Retorna un objeto con los valores para neonatos y lactantes pequeños
export function obtenerParametrosDeMATRIZ1(pesoEnKg) {
  // Buscar la fila más cercana por debajo
  let filaSeleccionada = MATRIZ_1[0];
  for (let i = 0; i < MATRIZ_1.length; i++) {
    if (MATRIZ_1[i][0] <= pesoEnKg) {
      filaSeleccionada = MATRIZ_1[i];
    } else {
      break;
    }
  }
  
  return {
    ettSinBalon: filaSeleccionada[1],
    ettLongitud: filaSeleccionada[2],
    sondaAspiracion: filaSeleccionada[3],
    mascarillaFacial: filaSeleccionada[4],
    pesoUsado: filaSeleccionada[0]
  };
}

// Función para buscar valores en MATRIZ 2
// Retorna un objeto con los valores para los diferentes dispositivos
export function obtenerParametrosDeMATRIZ2(edadEnYears) {
  // Convertir años a días
  const edadEnDias = Math.round(edadEnYears * 365.25);
  
  // Buscar la fila más cercana por debajo
  let filaSeleccionada = MATRIZ_2[0];
  for (let i = 0; i < MATRIZ_2.length; i++) {
    if (MATRIZ_2[i][0] <= edadEnDias) {
      filaSeleccionada = MATRIZ_2[i];
    } else {
      break;
    }
  }
  
  return {
    ettConBalon: filaSeleccionada[1],
    ettOral: filaSeleccionada[2],
    ettNasal: filaSeleccionada[3],
    sondaAspiracion: filaSeleccionada[4],
    sondaVesical: filaSeleccionada[5],
    tuboTorax: filaSeleccionada[6],
    edadDiasUsada: filaSeleccionada[0]
  };
}

// Cálculos puros (sin DOM)
export function calcularPesoEstimado(edad) {
  if (!Number.isFinite(edad) || edad < 0 || edad > 18) {
    throw new RangeError('La edad debe estar entre 0 y 18 años');
  }
  let peso = 0;
  let formula = '';
  if (edad < 1) {
    const meses = Math.round(edad * 12);
    peso = 3.5 + (meses * 0.5);
    formula = `3.5 + (${meses} meses × 0.5)`;
  } else if (edad >= 1 && edad < 3) {
    peso = (edad * 2) + 9;
    formula = `(${edad} × 2) + 9`;
  } else if (edad >= 3 && edad < 6) {
    peso = (edad * 2) + 8;
    formula = `(${edad} × 2) + 8`;
  } else if (edad >= 6 && edad < 12) {
    peso = (edad * 3) + 7;
    formula = `(${edad} × 3) + 7`;
  } else if (edad >= 12 && edad <= 18) {
    peso = (edad * 3.5) + 10;
    formula = `(${edad} × 3.5) + 10`;
  }
  return { peso: peso.toFixed(1), formula };
}

const ERC_2025_VITAL_ANCHORS = [
  { age: 1 / 12, rrLow: 25, rrHigh: 60, hrLow: 110, hrHigh: 180, sbpP50: 75, sbpP10: 55, sbpP5: 50, mapP50: 55, mapP10: 45, mapP5: 40 },
  { age: 1, rrLow: 20, rrHigh: 50, hrLow: 100, hrHigh: 170, sbpP50: 95, sbpP10: 75, sbpP5: 70, mapP50: 70, mapP10: 55, mapP5: 50 },
  { age: 2, rrLow: 18, rrHigh: 40, hrLow: 90, hrHigh: 160, sbpP50: 98, sbpP10: 77, sbpP5: 73, mapP50: 73, mapP10: 58, mapP5: 53 },
  { age: 5, rrLow: 17, rrHigh: 30, hrLow: 70, hrHigh: 140, sbpP50: 100, sbpP10: 80, sbpP5: 75, mapP50: 75, mapP10: 60, mapP5: 55 },
  { age: 10, rrLow: 14, rrHigh: 25, hrLow: 60, hrHigh: 120, sbpP50: 110, sbpP10: 85, sbpP5: 80, mapP50: 75, mapP10: 60, mapP5: 55 },
  { age: 18, rrLow: 12, rrHigh: 20, hrLow: 60, hrHigh: 100, sbpP50: 120, sbpP10: 105, sbpP5: 90, mapP50: 75, mapP10: 65, mapP5: 60 },
];

export function obtenerSignosVitalesERC2025(edad) {
  if (!Number.isFinite(edad) || edad < 0 || edad > 18) {
    throw new RangeError('La edad debe estar entre 0 y 18 años');
  }

  const first = ERC_2025_VITAL_ANCHORS[0];
  const last = ERC_2025_VITAL_ANCHORS.at(-1);
  if (edad <= first.age) return { ...first };
  if (edad >= last.age) return { ...last };

  const upperIndex = ERC_2025_VITAL_ANCHORS.findIndex((anchor) => anchor.age >= edad);
  const lower = ERC_2025_VITAL_ANCHORS[upperIndex - 1];
  const upper = ERC_2025_VITAL_ANCHORS[upperIndex];
  if (edad === upper.age) return { ...upper };

  const ratio = (edad - lower.age) / (upper.age - lower.age);
  const result = { age: edad };
  for (const key of Object.keys(lower)) {
    if (key === 'age') continue;
    result[key] = Math.round(lower[key] + ((upper[key] - lower[key]) * ratio));
  }
  return result;
}

function validarEdadYPeso(edad, peso) {
  if (!Number.isFinite(edad) || edad < 0 || edad > 18) {
    throw new RangeError('La edad debe estar entre 0 y 18 años');
  }
  if (!Number.isFinite(peso) || peso <= 0 || peso > 300) {
    throw new RangeError('El peso debe ser mayor que 0 y no superar 300 kg');
  }
}

function redondearA0_5(valor) {
  return Math.round(valor * 2) / 2;
}

export function calcularTuboTraquealERC2025(edad, peso) {
  validarEdadYPeso(edad, peso);

  if (peso <= 3.1) {
    const neonatal = obtenerParametrosDeMATRIZ1(peso);
    return {
      sizeMm: neonatal.ettSinBalon,
      depthCm: neonatal.ettLongitud,
      cuffLabel: 'sin balón',
      source: 'tabla neonatal local por peso',
      depthSource: 'tabla neonatal local por peso',
      note: 'Esta rama usa una referencia neonatal local de tubo sin balón; si se dispone de tubo con balón, seleccionar el tamaño según fabricante y protocolo local. Confirmar siempre tamaño y posición tras la inserción.',
    };
  }

  if (edad <= 8) {
    const sizeMm = redondearA0_5((edad / 4) + 3.5);
    return {
      sizeMm,
      depthCm: redondearA0_5(sizeMm * 3),
      cuffLabel: 'con balón',
      source: 'fórmula ERC 2025 (edad/4 + 3,5)',
      depthSource: 'estimación local (3 × diámetro interno)',
      note: 'ERC 2025 respalda el diámetro hasta 8 años, pero no especifica esta fórmula de profundidad. Confirmar clínicamente, con ETCO₂ y radiografía.',
    };
  }

  const local = obtenerParametrosDeMATRIZ2(edad);
  return {
    sizeMm: local.ettConBalon,
    depthCm: local.ettOral,
    cuffLabel: 'con balón',
    source: 'tabla pediátrica local (>8 años)',
    depthSource: 'tabla pediátrica local (>8 años)',
    note: 'La fórmula ERC está validada solo hasta 8 años; confirmar tamaño y posición por protocolo local.',
  };
}

export function calcularTamanioLMA(peso) {
  if (!Number.isFinite(peso) || peso <= 0 || peso > 300) {
    throw new RangeError('El peso debe ser mayor que 0 y no superar 300 kg');
  }
  if (peso < 5) return '1';
  if (peso < 10) return '1.5';
  if (peso < 20) return '2';
  if (peso < 30) return '2.5';
  if (peso < 50) return '3';
  if (peso < 70) return '4';
  if (peso <= 100) return '5';
  return '6';
}

export function calcularVentilacionInicialERC2025(edad, peso, modo = 'VC') {
  validarEdadYPeso(edad, peso);
  if (!['VC', 'PC', 'PSV'].includes(modo)) {
    throw new RangeError('El modo debe ser VC, PC o PSV');
  }

  const vitales = obtenerSignosVitalesERC2025(edad);
  const vtMin = (peso * 6).toFixed(0);
  const vtMax = (peso * 8).toFixed(0);
  const frecuenciaInicial = vitales.rrLow;
  const ventVt = `${vtMin}-${vtMax} mL (6-8 mL/kg de peso ideal)`;
  const ventFr = `${frecuenciaInicial} rpm inicial (límite bajo del rango normal ${vitales.rrLow}-${vitales.rrHigh})`;
  const ventPeep = '5 cmH₂O inicial; titular PEEP/FiO₂ al mínimo soporte eficaz';
  const ventFiO2 = '1,0 si existe fallo respiratorio, circulatorio o neurológico; titular pronto a SpO₂ 94-98% si previamente sano';
  const ventIe = 'Individualizar según curvas; prolongar espiración si hay obstrucción o auto-PEEP';
  const ventPip = 'Sin objetivo fijo por edad: mínima presión que logre Vt y ventilación adecuados';
  const ventPs = 'Mínima PS que reduzca el trabajo respiratorio y alcance el Vt objetivo';
  const ventPplat = 'PARDS: ≤28 cmH₂O; 29-32 si baja distensibilidad de pared torácica';
  const ventDriving = 'PARDS: ≤15 cmH₂O, medida en condiciones estáticas';
  const ventFlow = 'Individualizar; comprobar curvas y retorno del flujo espiratorio a basal';
  const ventTrigger = 'Individualizar para evitar autodisparo, asincronía y esfuerzo excesivo';
  const ventAlarmVm = 'Individualizar desde Vt espirado, FR, fugas y valores basales; no existe un rango universal';
  const ventApnea = `Configurar tiempo de apnea según paciente/dispositivo y backup inicial ${frecuenciaInicial} rpm`;

  let ventModeParams;
  if (modo === 'PC') {
    ventModeParams = `PC: ajustar presión para Vt ${vtMin}-${vtMax} mL; FR ${frecuenciaInicial} rpm; PEEP 5 cmH₂O`;
  } else if (modo === 'PSV') {
    ventModeParams = `PSV: PS mínima eficaz; PEEP 5 cmH₂O; backup inicial ${frecuenciaInicial} rpm`;
  } else {
    ventModeParams = `VC: Vt ${vtMin}-${vtMax} mL; FR ${frecuenciaInicial} rpm; PEEP 5 cmH₂O`;
  }

  return {
    ventModeParams,
    ventVt,
    ventFr,
    ventPeep,
    ventFiO2,
    ventIe,
    ventPip,
    ventPs,
    ventPplat,
    ventDriving,
    ventFlow,
    ventTrigger,
    ventAlarmVm,
    ventApnea,
  };
}

export function calcularEnergiasERC2025(peso) {
  if (!Number.isFinite(peso) || peso <= 0 || peso > 300) {
    throw new RangeError('El peso debe ser mayor que 0 y no superar 300 kg');
  }
  return {
    defibInitialJ: Math.min(peso * 4, 200),
    defibRefractoryJ: Math.min(peso * 8, 360),
    cardioversionJ: [peso, peso * 2, peso * 4],
  };
}

export const urgenciaFormulas = {
  adenosina: (peso) => Math.min(peso * 0.1, 6),
  adrenalina: (peso) => Math.min(peso * 0.01, 1),
  amiodarona: (peso) => Math.min(peso * 5, 300),
  atropina_urgencia: (peso) => Math.min(Math.max(peso * 0.02, 0.1), 0.5),
  bicarbonato: (peso) => peso < 50 ? peso : 50,
  boloLiquidos: (peso) => peso * 10,
  flumazenilo: (peso) => Math.min(peso * 0.01, 0.2),
  gluconato: (peso) => peso < 40 ? peso*0.5 : 20,
  glucosa: (peso) => peso * 2,
  manitol: (peso) => peso * 0.5,
  naloxona: (peso) => peso * 0.01,
  salinoHiper: (peso) => peso > 50 ? 250 : peso*5,
  sulfatoMg: (peso) => peso < 40 ? peso*50 : 2000,
  tranexamico: (peso) => Math.min(peso * 15, 1000),
};

// Factores de dosis por kg para mostrar en la tabla
export const urgenciaDosisPorKg = {
  adenosina: '0.1 mg/kg',
  adrenalina: '0.01 mg/kg',
  amiodarona: '5 mg/kg',
  atropina_urgencia: '0.02 mg/kg',
  bicarbonato: '1 mEq/kg',
  boloLiquidos: '10 mL/kg por bolo',
  flumazenilo: '0.01 mg/kg (máx. 0.2 mg)',
  gluconato: '0.5 mL/kg',
  glucosa: '2 mL/kg',
  manitol: '0.5 g/kg',
  naloxona: '0.01 mg/kg',
  salinoHiper: '5 mL/kg',
  sulfatoMg: '50 mg/kg',
  tranexamico: '15 mg/kg (máx. 1 g)',
};

export function calculatePureVolume(meta, doseValue) {
  if (!meta?.es_volumen_puro || !Number.isFinite(doseValue) || doseValue < 0) return null;

  const doseUnit = meta.unidad_especial || meta.unidad;
  const concentration = meta.concentracion_mEq_ml || meta.concentracion_mg_ml ||
    meta.concentracion_mcg_ml || meta.concentracion_g_ml;
  const drugVolumeMl = doseUnit !== 'mL' && concentration
    ? doseValue / concentration
    : doseValue;
  const factorDilucion = meta.factor_dilucion || 1;
  const finalVolumeMl = drugVolumeMl * factorDilucion;

  return {
    drugVolumeMl,
    diluentVolumeMl: finalVolumeMl - drugVolumeMl,
    finalVolumeMl,
  };
}

export const intubacionFormulas = {
  atropina: (peso) => Math.min(Math.max(peso * 0.02, 0.1), 0.5),
  fentanilo: (peso) => peso * 2,
  ketamina: (peso) => peso * 2,
  midazolam: (peso) => { const d = peso/10; return d > 10 ? 10 : d; },
  propofol: (peso) => peso * 2.5,
  // Anectine 50 mg/mL: 2 mg/kg en neonatos/lactantes y 1 mg/kg en niños mayores.
  succinilcolina: (peso, edadAnios) => edadAnios < 1 ? peso * 2 : peso,
  rocuronio: (peso) => peso,
};

// Factores de dosis por kg para mostrar en la tabla de intubación
export const intubacionDosisPorKg = {
  atropina: '0.02 mg/kg',
  fentanilo: '2 mcg/kg',
  ketamina: '2 mg/kg',
  midazolam: '0.1 mg/kg (máx. 10 mg)',
  propofol: '2.5 mg/kg',
  succinilcolina: '2 mg/kg <1 año; 1 mg/kg ≥1 año',
  rocuronio: '1 mg/kg',
};

export function formatDosis(d) {
  const val = parseFloat(d);
  
  // Si es entero (ej: 90.00), mostrar sin decimales
  if (val === Math.floor(val)) {
    return val.toFixed(0);
  }
  
  // Si tiene 1 decimal significativo (ej: 1.8), mostrar con 1 decimal
  if ((val * 10) === Math.floor(val * 10)) {
    return val.toFixed(1);
  }
  
  // Para valores con 2 decimales significativos (ej: 0.18, 1.25), mostrar 2 decimales
  return val.toFixed(2);
}
