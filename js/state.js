// Global state manager
export const state = {
  edad: null,
  peso: null,
};

export function setPatientData(edad, peso) {
  state.edad = edad;
  state.peso = peso;
  updateHeaderDisplay();
  
  // Disparar evento cuando cambia el peso o edad
  document.dispatchEvent(new CustomEvent('patientDataChanged', { 
    detail: { edad, peso } 
  }));
}

export function getPatientData() {
  return { edad: state.edad, peso: state.peso };
}

function updateHeaderDisplay() {
  const headerEdadInput = document.getElementById('headerEdadInput');
  const headerPesoInput = document.getElementById('headerPesoInput');
  if (headerEdadInput) headerEdadInput.value = state.edad !== null ? state.edad : '';
  if (headerPesoInput) headerPesoInput.value = state.peso !== null ? state.peso : '';
}

export function clearPatientData() {
  state.edad = null;
  state.peso = null;
  updateHeaderDisplay();
}

export function getHeaderValues() {
  const headerEdadInput = document.getElementById('headerEdadInput');
  const headerPesoInput = document.getElementById('headerPesoInput');
  return {
    edad: headerEdadInput ? parseFloat(headerEdadInput.value) : null,
    peso: headerPesoInput ? parseFloat(headerPesoInput.value) : null
  };
}

export function setHeaderValues(edad, peso) {
  const headerEdadInput = document.getElementById('headerEdadInput');
  const headerPesoInput = document.getElementById('headerPesoInput');
  if (headerEdadInput) headerEdadInput.value = edad !== null ? edad : '';
  if (headerPesoInput) headerPesoInput.value = peso !== null ? peso : '';
  setPatientData(edad, peso);
}
