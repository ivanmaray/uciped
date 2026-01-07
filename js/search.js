/**
 * Módulo de búsqueda rápida de medicamentos
 * Busca en urgencia, intubación y perfusiones (excluye dosificación)
 */

import { getPatientData } from './state.js';

const ALLOWED_TYPES = new Set(['urgencia', 'intubacion', 'perfusiones']);

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
    const response = await fetch(`/data/meds.json?v=${Date.now()}`, { cache: 'no-store' });
    allMeds = await response.json();
    // Excluir explícitamente el set de dosificación del buscador
    allMeds.dosificacion = {};
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

  // Filtrar por tipos permitidos y limitar a 8 resultados
  return results.filter((r) => ALLOWED_TYPES.has(r.type)).slice(0, 8);
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
  if (!ALLOWED_TYPES.has(type)) return;
  const med = allMeds[type]?.[key];
  if (!med) return;

  const { peso } = getPatientData();
  const hasPeso = peso && peso > 0;

  const modal = document.getElementById('medDetailModal');
  const title = document.getElementById('medDetailTitle');
  const body = document.getElementById('medDetailBody');

  title.textContent = nombre || med.nombre || key;

  let html = '';

  // Advertencia si no hay peso (solo para medicamentos que necesitan cálculo)
  const necesitaPeso = (type === 'urgencia' || type === 'intubacion' || type === 'dosificacion') && med.dosis !== undefined;
  if (!hasPeso && necesitaPeso) {
    html += `
      <div class="med-detail-section" style="background-color: rgba(245, 158, 11, 0.1); border-left-color: var(--warning-color);">
        <div class="med-detail-label">⚠️ Advertencia</div>
        <div class="med-detail-value">
          Ingrese el peso del paciente para ver las dosis calculadas.
        </div>
      </div>
    `;
  }

  // PERFUSIONES: Tienen estructura diferente (dosis_min/max en mcg/kg/min - NO multiplicar por peso)
  if (type === 'perfusiones') {
    if (med.dosis_min !== undefined && med.dosis_max !== undefined) {
      const unidad = med.unidad || 'mcg/kg/min';
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Rango de Dosis</div>
          <div class="med-detail-value" style="font-size: 1.3em; font-weight: 700; color: var(--primary-color);">
            ${med.dosis_min}-${med.dosis_max} <span style="font-size: 0.8em;">${unidad}</span>
          </div>
        </div>
      `;
    }

    if (med.presentacion) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Presentación</div>
          <div class="med-detail-value">${med.presentacion}</div>
        </div>
      `;
    }

    if (med.concentraciones && Array.isArray(med.concentraciones)) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Concentraciones disponibles</div>
          <div class="med-detail-value">
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              ${med.concentraciones.map(c => `<li>${c.conc_mg_ml} mg/mL - ${c.desc}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    }

    if (med.dilucion) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Dilución</div>
          <div class="med-detail-value">${med.dilucion}</div>
        </div>
      `;
    }

    if (med.ml_h_equiv) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Equivalencia (ritmo perfusión)</div>
          <div class="med-detail-value" style="background-color: rgba(33, 150, 243, 0.1); color: #2196F3; font-weight: 600;">
            ${med.ml_h_equiv}
          </div>
        </div>
      `;
    }

    if (med.nota) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">⚠️ Nota Importante</div>
          <div class="med-detail-value" style="background-color: rgba(245, 158, 11, 0.1); color: var(--warning-color); border-left-color: var(--warning-color);">
            ${med.nota}
          </div>
        </div>
      `;
    }
  } 
  // URGENCIA / INTUBACIÓN / DOSIFICACIÓN: Cálculo con peso
  else {
    // Dosis calculada
    if (med.dosis !== undefined) {
      const dosisFormula = `${med.dosis} ${med.unidad || 'mg'}/kg`;
      const dosisCalculada = hasPeso ? (peso * med.dosis).toFixed(2) : '-';
      
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Dosis por kg</div>
          <div class="med-detail-value">
            <strong>${dosisFormula}</strong>
            ${hasPeso ? `<br><span style="font-size: 1.3em; font-weight: 700; color: var(--primary-color);">${dosisCalculada} ${med.unidad || 'mg'}</span>` : ''}
          </div>
        </div>
      `;
    } else if (med.dosis_min !== undefined && med.dosis_max !== undefined) {
      const dosisFormula = `${med.dosis_min}-${med.dosis_max} ${med.unidad || ''}`;
      
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Rango de Dosis</div>
          <div class="med-detail-value">
            <strong>${dosisFormula}</strong>
          </div>
        </div>
      `;
    }

    // Volumen calculado (solo para urgencia/intubacion con concentración)
    if (hasPeso && med.dosis && (med.concentracion_mg_ml || med.concentracion_mcg_ml)) {
      const dosisValor = peso * med.dosis;
      const concentracion = med.concentracion_mg_ml || med.concentracion_mcg_ml;
      const volumen = (dosisValor / concentracion).toFixed(2);
      
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Volumen a administrar</div>
          <div class="med-detail-value" style="font-size: 1.4em; font-weight: 700; color: #2196F3;">
            ${volumen} mL
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

    // Concentraciones (para medicamentos con múltiples opciones)
    if (med.concentraciones && Array.isArray(med.concentraciones)) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Concentraciones disponibles</div>
          <div class="med-detail-value">
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              ${med.concentraciones.map(c => `<li>${c.conc_mg_ml} mg/mL - ${c.desc}</li>`).join('')}
            </ul>
          </div>
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

    // Máximo (SOLO para dosificación, no para urgencia/intubacion)
    if (med.maximo && type === 'dosificacion') {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Dosis Máxima</div>
          <div class="med-detail-value">${med.maximo} ${med.maxunidad || med.unidad}</div>
        </div>
      `;
    }

    // Intervalo (SOLO para dosificación)
    if (med.intervalo && type === 'dosificacion') {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Intervalo</div>
          <div class="med-detail-value">${med.intervalo}</div>
        </div>
      `;
    }
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
