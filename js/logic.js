// Cálculos puros (sin DOM)
export function calcularPesoEstimado(edad) {
  let peso = 0;
  let formula = '';
  if (edad < 1) {
    const meses = Math.round(edad * 12);
    peso = 3.5 + (meses * 0.5);
    formula = `3.5 + (${meses} meses × 0.5)`;
  } else if (edad >= 1 && edad < 3) {
    peso = (edad + 9) * 2;
    formula = `(${edad} + 9) × 2`;
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

export const intubacionFormulas = {
  atropina: (peso, dias=0) => (peso < 5 ? 0.1 : (peso < 30 ? peso*0.02 : 0.6)),
  fentanilo: (peso) => peso * 2,
  ketamina: (peso) => peso * 2,
  midazolam: (peso) => { const d = peso/10; return d > 10 ? 10 : d; },
  propofol: (peso) => peso * 2.5,
  succinilcolina: (peso, dias=0) => (dias <= 30*24 ? peso*2 : peso),
  rocuronio: (peso) => peso,
};

export function formatDosis(d) {
  let dosisFormato = parseFloat(d).toFixed(2);
  if (parseFloat(dosisFormato).toFixed(1).includes('.0')) {
    return parseFloat(d).toFixed(0);
  } else if (parseFloat(dosisFormato).toFixed(2).includes('.00')) {
    return parseFloat(d).toFixed(0);
  } else {
    return parseFloat(d).toFixed(1);
  }
}
