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
    console.log('[SEARCH] Datos cargados:', Object.keys(allMeds));
  } catch (error) {
    console.error('[SEARCH] Error cargando datos:', error);
  }
}

/**
 * Buscar medicamentos por nombre o palabra clave
 */
export function searchMeds(query) {
  if (!query || query.length < 2) return [];
  
  console.log('[SEARCH] Buscando:', query);

  const q = query.toLowerCase().trim();
  const results = [];

  // Buscar en urgencia
  Object.entries(allMeds.urgencia || {}).forEach(([key, med]) => {
    const nombre = med.nombre || key;
    if (nombre.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
      results.push({
        type: 'urgencia',
        key,
        nombre: nombre,
        category: 'Medicamentos de Urgencia'
      });
    }
  });

  // Buscar en intubación
  Object.entries(allMeds.intubacion || {}).forEach(([key, med]) => {
    const nombre = med.nombre || key;
    if (nombre.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
      results.push({
        type: 'intubacion',
        key,
        nombre: nombre,
        category: 'Medicamentos de Intubación'
      });
    }
  });

  // Buscar en perfusiones
  Object.entries(allMeds.perfusiones || {}).forEach(([key, med]) => {
    const nombre = med.nombre || key;
    if (nombre.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
      results.push({
        type: 'perfusiones',
        key,
        nombre: nombre,
        category: 'Perfusiones IV'
      });
    }
  });

  // Buscar en dosificación
  Object.entries(allMeds.dosificacion || {}).forEach(([key, med]) => {
    const nombre = med.nombre || key;
    if (nombre.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
      results.push({
        type: 'dosificacion',
        key,
        nombre: nombre,
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
