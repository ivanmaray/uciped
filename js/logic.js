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
  } else {
    // Para edades > 18 o casos no contemplados
    peso = 3.5;
    formula = '3.5 (recién nacido)';
  }
  return { peso: peso.toFixed(1), formula };
}

export const urgenciaFormulas = {
  adenosina: (peso) => peso < 10 ? peso/10 : peso/10,
  adrenalina: (peso) => peso < 10 ? peso/100 : peso/100,
  amiodarona: (peso) => peso > 60 ? 60 : peso * 5,
  atropina_urgencia: (peso) => (peso < 5 ? 0.1 : (peso < 30 ? peso*0.02 : 0.6)),
  bicarbonato: (peso) => peso < 50 ? peso : 50,
  boloLiquidos: (peso) => peso < 50 ? peso*2*10 : 1000,
  flumazenilo: (peso) => peso < 20 ? peso*0.01 : 0.1,
  gluconato: (peso) => peso < 40 ? peso*0.5 : 20,
  glucosa: (peso) => peso < 50 ? peso*2 : 100,
  manitol: (peso) => peso * 0.5,
  naloxona: (peso) => peso * 0.01,
  salinoHiper: (peso) => peso > 50 ? 250 : peso*5,
  sulfatoMg: (peso) => peso < 40 ? peso*50 : 2000,
  tranexamico: (peso) => peso < 100 ? peso*1.5*10 : 1500,
};

// Factores de dosis por kg para mostrar en la tabla
export const urgenciaDosisPorKg = {
  adenosina: '0.1 mg/kg',
  adrenalina: '0.01 mg/kg',
  amiodarona: '5 mg/kg',
  atropina_urgencia: '0.02 mg/kg',
  bicarbonato: '1 mEq/kg',
  boloLiquidos: '20 mL/kg',
  flumazenilo: '0.01 mg/kg',
  gluconato: '0.5 mL/kg',
  glucosa: '2 mL/kg',
  manitol: '0.5 g/kg',
  naloxona: '0.01 mg/kg',
  salinoHiper: '5 mL/kg',
  sulfatoMg: '50 mg/kg',
  tranexamico: '15 mg/kg',
};

export const intubacionFormulas = {
  atropina: (peso, dias=0) => (peso < 5 ? 0.1 : (peso < 30 ? peso*0.02 : 0.6)),
  fentanilo: (peso) => peso * 2,
  ketamina: (peso) => peso * 2,
  midazolam: (peso) => { const d = peso/10; return d > 10 ? 10 : d; },
  propofol: (peso) => peso * 2.5,
  succinilcolina: (peso, dias=0) => (dias <= 30*24 ? peso*2 : peso),
  rocuronio: (peso) => peso,
};

// Factores de dosis por kg para mostrar en la tabla de intubación
export const intubacionDosisPorKg = {
  atropina: '0.02 mg/kg',
  fentanilo: '2 mcg/kg',
  ketamina: '2 mg/kg',
  midazolam: '0.1 mg/kg',
  propofol: '2.5 mg/kg',
  succinilcolina: '1-2 mg/kg',
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
