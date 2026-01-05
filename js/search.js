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
    urgencia: 'urgencia',
    intubacion: 'intubacion',
    perfusiones: 'perfusiones',
    dosificacion: 'urgencia' // fallback porque la pestaña de dosificación está desactivada
  };
  return tabMap[type] || 'urgencia';
}

/**
 * Obtener el elemento de fila de medicamento correspondiente
 */
export function getMedRow(type, key) {
  // Buscar en el DOM el elemento correspondiente
  // Los elementos tienen data-med-key con el key del medicamento
  console.log('[getMedRow] Buscando selector: [data-med-key="${key}"]');
  const row = document.querySelector(`[data-med-key="${key}"]`);
  return row;
}

/**
 * Desplazar a un medicamento
 */
export function scrollToMed(type, key) {
  console.log('[scrollToMed] Buscando fila con data-med-key="${key}"');
  const row = getMedRow(type, key);
  if (row) {
    console.log('[scrollToMed] ✓ Fila encontrada, scrolling a:', row);
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Agregar clase de highlight temporal
    row.classList.add('search-highlight');
    setTimeout(() => row.classList.remove('search-highlight'), 2000);
  } else {
    console.warn('[scrollToMed] ✗ No se encontró fila con data-med-key="${key}"');
    // Listar todas las filas disponibles
    const allRows = document.querySelectorAll('[data-med-key]');
    console.log('[scrollToMed] Filas disponibles:', Array.from(allRows).map(r => r.getAttribute('data-med-key')));
  }
}

/**
 * Mostrar medicamento en modal de detalle
 */
export function showMedDetail(type, key, nombre) {
  const med = allMeds[type]?.[key];
  if (!med) return;

  const modal = document.getElementById('medDetailModal');
  const title = document.getElementById('medDetailTitle');
  const body = document.getElementById('medDetailBody');

  title.textContent = nombre || med.nombre || key;

  let html = '';

  // Dosis
  if (med.dosis || med.dosis_min || med.dosis_max) {
    html += `
      <div class="med-detail-section">
        <div class="med-detail-label">Dosis</div>
        <div class="med-detail-value">
          ${med.dosis ? med.dosis + ' ' + (med.unidad || '') : 
            med.dosis_min ? med.dosis_min + '-' + med.dosis_max + ' ' + (med.unidad || '') : 
            '-'}
        </div>
      </div>
    `;
  }

  // Concentración
  if (med.concentracion_mg_ml || med.concentracion_mcg_ml) {
    html += `
      <div class="med-detail-section">
        <div class="med-detail-label">Concentración</div>
        <div class="med-detail-value">
          ${med.concentracion_mg_ml ? med.concentracion_mg_ml + ' mg/mL' : ''}
          ${med.concentracion_mcg_ml ? med.concentracion_mcg_ml + ' mcg/mL' : ''}
        </div>
      </div>
    `;
  }

  // Presentación
  if (med.presentacion) {
    html += `
      <div class="med-detail-section">
        <div class="med-detail-label">Presentación</div>
        <div class="med-detail-value">${med.presentacion}</div>
      </div>
    `;
  }

  // Dilución
  if (med.dilucion) {
    html += `
      <div class="med-detail-section">
        <div class="med-detail-label">Dilución</div>
        <div class="med-detail-value">${med.dilucion}</div>
      </div>
    `;
  }

  // Nota
  if (med.nota) {
    html += `
      <div class="med-detail-section">
        <div class="med-detail-label">Nota</div>
        <div class="med-detail-value">${med.nota}</div>
      </div>
    `;
  }

  // Botones de acción
  html += `
    <div class="med-detail-buttons">
      <button class="med-detail-btn med-detail-btn-primary" onclick="
        const tab = '${type === 'dosificacion' ? 'urgencia' : type}';
        const tabBtn = document.querySelector(\`button[data-tab='\${tab}']\`);
        if (tabBtn) tabBtn.click();
        document.getElementById('medDetailModal').classList.remove('active');
      ">
        <i class="fas fa-arrow-right"></i> Ir a la tabla
      </button>
      <button class="med-detail-btn med-detail-btn-secondary" onclick="
        document.getElementById('medDetailModal').classList.remove('active');
      ">
        <i class="fas fa-times"></i> Cerrar
      </button>
    </div>
  `;

  body.innerHTML = html;
  modal.classList.add('active');
}
