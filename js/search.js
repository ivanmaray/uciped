/**
 * Módulo de búsqueda rápida de medicamentos
 * Busca en urgencia, intubación, perfusiones y dosificación
 */

let allMeds = {
  urgencia: {},
  intubacion: {},
  perfusiones: {},
  dosificacion: {}
};

/**
 * Cargar datos de medicamentos
 */
export async function initSearch() {
  try {
    const response = await fetch('/data/meds.json');
    allMeds = await response.json();
  } catch (error) {
    console.error('Error cargando datos para búsqueda:', error);
  }
}

/**
 * Buscar medicamentos por nombre o palabra clave
 */
export function searchMeds(query) {
  if (!query || query.length < 2) return [];

  const q = query.toLowerCase().trim();
  const results = [];

  // Buscar en urgencia
  Object.entries(allMeds.urgencia || {}).forEach(([key, med]) => {
    if (med.nombre.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
      results.push({
        type: 'urgencia',
        key,
        nombre: med.nombre,
        category: 'Medicamentos de Urgencia'
      });
    }
  });

  // Buscar en intubación
  Object.entries(allMeds.intubacion || {}).forEach(([key, med]) => {
    if (med.nombre.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
      results.push({
        type: 'intubacion',
        key,
        nombre: med.nombre,
        category: 'Medicamentos de Intubación'
      });
    }
  });

  // Buscar en perfusiones
  Object.entries(allMeds.perfusiones || {}).forEach(([key, med]) => {
    if (med.nombre.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
      results.push({
        type: 'perfusiones',
        key,
        nombre: med.nombre,
        category: 'Perfusiones IV'
      });
    }
  });

  // Buscar en dosificación
  Object.entries(allMeds.dosificacion || {}).forEach(([key, med]) => {
    if (med.nombre.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
      results.push({
        type: 'dosificacion',
        key,
        nombre: med.nombre,
        category: med.grupo || 'Otros'
      });
    }
  });

  // Limitar a 8 resultados
  return results.slice(0, 8);
}

/**
 * Obtener tab correspondiente al tipo de medicamento
 */
export function getTabForType(type) {
  const tabMap = {
    urgencia: 'tab-urgencia',
    intubacion: 'tab-intubacion',
    perfusiones: 'tab-perfusiones',
    dosificacion: 'tab-dosificacion'
  };
  return tabMap[type] || 'tab-urgencia';
}

/**
 * Obtener el elemento de fila de medicamento correspondiente
 */
export function getMedRow(type, key) {
  // Buscar en el DOM el elemento correspondiente
  // Los elementos tienen data-med-key con el key del medicamento
  const row = document.querySelector(`[data-med-key="${key}"]`);
  return row;
}

/**
 * Desplazar a un medicamento
 */
export function scrollToMed(type, key) {
  const row = getMedRow(type, key);
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Agregar clase de highlight temporal
    row.classList.add('search-highlight');
    setTimeout(() => row.classList.remove('search-highlight'), 2000);
  }
}
