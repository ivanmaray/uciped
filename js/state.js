// Global state manager
export const state = {
  edad: null,
  peso: null,
  pesoOrigen: null,
};

export function setPatientData(edad, peso, { updateHeader = true, pesoOrigen } = {}) {
  state.edad = Number.isFinite(edad) && edad >= 0 && edad <= 18 ? edad : null;
  state.peso = Number.isFinite(peso) && peso > 0 && peso <= 300 ? peso : null;
  if (state.peso === null) {
    state.pesoOrigen = null;
  } else if (pesoOrigen !== undefined) {
    state.pesoOrigen = pesoOrigen === 'estimado' ? 'estimado' : 'medido';
  }
  if (updateHeader) updateHeaderDisplay();
  
  // Disparar evento cuando cambia el peso o edad
  document.dispatchEvent(new CustomEvent('patientDataChanged', { 
    detail: { edad: state.edad, peso: state.peso, pesoOrigen: state.pesoOrigen }
  }));
}

export function getPatientData() {
  return { edad: state.edad, peso: state.peso };
}

export function getWeightSource() {
  return state.pesoOrigen;
}

function updateHeaderDisplay() {
  const headerEdadInput = document.getElementById('headerEdadInput');
  const headerPesoInput = document.getElementById('headerPesoInput');
  if (headerEdadInput) headerEdadInput.value = state.edad !== null ? state.edad : '';
  if (headerPesoInput) headerPesoInput.value = state.peso !== null ? state.peso : '';
  headerEdadInput?.setAttribute?.('aria-invalid', 'false');
  headerPesoInput?.setAttribute?.('aria-invalid', 'false');
}

export function clearPatientData() {
  setPatientData(null, null);
  document.dispatchEvent(new CustomEvent('patientDataCleared'));
}

export function getHeaderValues() {
  const headerEdadInput = document.getElementById('headerEdadInput');
  const headerPesoInput = document.getElementById('headerPesoInput');
  return {
    edad: headerEdadInput ? parseFloat(headerEdadInput.value) : null,
    peso: headerPesoInput ? parseFloat(headerPesoInput.value) : null
  };
}

export function setHeaderValues(edad, peso, { pesoOrigen = 'medido' } = {}) {
  const headerEdadInput = document.getElementById('headerEdadInput');
  const headerPesoInput = document.getElementById('headerPesoInput');
  if (headerEdadInput) headerEdadInput.value = edad !== null ? edad : '';
  if (headerPesoInput) headerPesoInput.value = peso !== null ? peso : '';
  setPatientData(edad, peso, { pesoOrigen });
}
