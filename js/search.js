/**
 * Módulo de búsqueda rápida de medicamentos
 * Busca en urgencia, intubación y perfusiones (excluye dosificación)
 */

import { getPatientData } from './state.js?v=113';
import { calculatePureVolume, intubacionDosisPorKg, intubacionFormulas, urgenciaDosisPorKg, urgenciaFormulas } from './logic.js?v=114';
import { compute, DRUGS, formatPerfusionForDisplay, PERFUSION_KEY_MAP } from './perfusiones.config.js?v=113';
import { loadMeds } from './data.js?v=113';

const ALLOWED_TYPES = new Set(['urgencia', 'intubacion', 'perfusiones']);

let allMeds = {
  urgencia: {},
  intubacion: {},
  perfusiones: {},
  dosificacion: {}
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sanitizeForHtml(value) {
  if (typeof value === 'string') return escapeHtml(value);
  if (Array.isArray(value)) return value.map(sanitizeForHtml);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, sanitizeForHtml(item)]));
  }
  return value;
}

export function getConcentrationEntry(item) {
  const fields = [
    ['conc_mg_ml', 'mg/mL'],
    ['conc_mcg_ml', 'mcg/mL'],
    ['conc_g_ml', 'g/mL'],
    ['conc_mEq_ml', 'mEq/mL'],
  ];
  for (const [field, unit] of fields) {
    if (Number.isFinite(item?.[field]) && item[field] > 0) {
      return { value: item[field], unit };
    }
  }
  return null;
}

export function calculateWeightBasedDose(type, key, med, weightKg, ageYears = null) {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;

  if (type === 'urgencia' && urgenciaFormulas[key]) {
    return urgenciaFormulas[key](weightKg);
  }

  if (type === 'intubacion' && intubacionFormulas[key]) {
    if (key === 'succinilcolina' && (!Number.isFinite(ageYears) || ageYears < 0 || ageYears > 18)) {
      return null;
    }
    return intubacionFormulas[key](weightKg, ageYears);
  }

  const dosePerKg = med?.dosis ?? med?.dosis_kg;
  if (dosePerKg === undefined) return null;
  return weightKg * dosePerKg;
}

/**
 * Cargar datos de medicamentos
 */
export async function initSearch() {
  const loaded = await loadMeds();
  if (!loaded) return false;
  // Excluir explícitamente el set de dosificación sin mutar el objeto compartido.
  allMeds = { ...loaded, dosificacion: {} };
  return true;
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
  Object.values(allMeds.perfusiones || {}).forEach((grupo) => {
    Object.entries(grupo || {}).forEach(([key, med]) => {
      const nombre = med.nombre || key;
      if (nombre.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
        results.push({ type: 'perfusiones', key, nombre, category: 'Perfusiones IV' });
      }
    });
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
  const safeKey = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key.replace(/[^a-zA-Z0-9_-]/g, '');
  const row = document.querySelector(`[data-med-key="${safeKey}"]`);
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
  } else {
    console.warn('No se encontró la fila solicitada:', { type, key });
  }
}

/**
 * Mostrar medicamento en modal de detalle
 */
export function showMedDetail(type, key, nombre) {
  if (!ALLOWED_TYPES.has(type)) return;
  const rawMed = type === 'perfusiones'
    ? Object.values(allMeds.perfusiones || {}).map((grupo) => grupo?.[key]).find(Boolean)
    : allMeds[type]?.[key];
  if (!rawMed) return;
  const med = sanitizeForHtml(rawMed);

  const { peso, edad } = getPatientData();
  const hasPeso = peso && peso > 0;
  const hasEdad = Number.isFinite(edad) && edad >= 0 && edad <= 18;

  const modal = document.getElementById('medDetailModal');
  const title = document.getElementById('medDetailTitle');
  const body = document.getElementById('medDetailBody');

  title.textContent = nombre || rawMed.nombre || key;

  let html = '';

  // Advertencia si no hay peso (solo para medicamentos que necesitan cálculo)
  const necesitaPeso = (type === 'urgencia' && Boolean(urgenciaFormulas[key])) ||
    (type === 'intubacion' && Boolean(intubacionFormulas[key])) ||
    (type === 'perfusiones' && Boolean(PERFUSION_KEY_MAP[key]));
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

  if (type === 'intubacion' && key === 'succinilcolina' && hasPeso && !hasEdad) {
    html += `
      <div class="med-detail-section" style="background-color: rgba(245, 158, 11, 0.1); border-left-color: var(--warning-color);">
        <div class="med-detail-label">⚠️ Falta la edad</div>
        <div class="med-detail-value">Ingrese la edad para escoger entre 2 mg/kg en menores de 1 año y 1 mg/kg desde 1 año.</div>
      </div>
    `;
  }

  // PERFUSIONES: Tienen estructura diferente (dosis_min/max en mcg/kg/min - NO multiplicar por peso)
  if (type === 'perfusiones') {
    const drugKey = PERFUSION_KEY_MAP[key];
    const drugCfg = DRUGS.find((drug) => drug.key === drugKey);
    const perfusionDisplay = hasPeso && drugCfg
      ? formatPerfusionForDisplay(drugCfg, compute(DRUGS, { drugKey, weightKg: peso }), peso)
      : null;

    if (perfusionDisplay || (med.dosis_min !== undefined && med.dosis_max !== undefined)) {
      const rangeText = perfusionDisplay?.rangeText || `${med.dosis_min}-${med.dosis_max} ${med.unidad || 'mcg/kg/min'}`;
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Rango de Dosis</div>
          <div class="med-detail-value" style="font-size: 1.3em; font-weight: 700; color: var(--primary-color);">
            ${rangeText}
          </div>
        </div>
      `;
    }

    if (perfusionDisplay) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Dosis absoluta calculada</div>
          <div class="med-detail-value">${perfusionDisplay.absoluteHourlyText}</div>
        </div>
        <div class="med-detail-section">
          <div class="med-detail-label">Ritmo con esta preparación</div>
          <div class="med-detail-value" style="font-weight: 700; color: #2196F3;">${perfusionDisplay.rateText}</div>
        </div>
      `;
    }

    if (perfusionDisplay?.presentationText || med.presentacion) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Presentación</div>
          <div class="med-detail-value">${perfusionDisplay?.presentationText || med.presentacion}</div>
        </div>
      `;
    }

    if (med.concentraciones && Array.isArray(med.concentraciones)) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Concentraciones disponibles</div>
          <div class="med-detail-value">
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              ${med.concentraciones.map((c) => {
                const concentration = getConcentrationEntry(c);
                return `<li>${concentration ? `${concentration.value} ${concentration.unit}` : 'Concentración no válida'} - ${c.desc}</li>`;
              }).join('')}
            </ul>
          </div>
        </div>
      `;
    }

    if (perfusionDisplay?.preparationText) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Preparación calculada</div>
          <div class="med-detail-value">${perfusionDisplay.preparationText}</div>
        </div>
      `;
    }

    if (perfusionDisplay?.equivalenceText) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Equivalencia (ritmo perfusión)</div>
          <div class="med-detail-value" style="background-color: rgba(33, 150, 243, 0.1); color: #2196F3; font-weight: 600;">
            ${perfusionDisplay.equivalenceText}
          </div>
        </div>
      `;
    }

    if (perfusionDisplay?.rateWarningText) {
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">⚠️ Comprobar ritmo</div>
          <div class="med-detail-value perfusion-warning">${perfusionDisplay.rateWarningText}</div>
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
    const calculatedDose = hasPeso
      ? calculateWeightBasedDose(type, key, med, peso, edad)
      : null;
    const dosePerKg = med.dosis ?? med.dosis_kg;
    const doseFormulaText = type === 'urgencia'
      ? urgenciaDosisPorKg[key]
      : intubacionDosisPorKg[key];

    // Dosis calculada
    if (doseFormulaText || dosePerKg !== undefined) {
      const dosisFormula = doseFormulaText
        ? `${doseFormulaText}`
        : `${dosePerKg} ${med.unidad || 'mg'}/kg`;
      const dosisCalculada = calculatedDose !== null ? calculatedDose.toFixed(2) : '-';
      
      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Dosis por kg</div>
          <div class="med-detail-value">
            <strong>${dosisFormula}</strong>
            ${calculatedDose !== null ? `<br><span style="font-size: 1.3em; font-weight: 700; color: var(--primary-color);">${dosisCalculada} ${med.unidad || 'mg'}</span>` : ''}
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

    // Volumen calculado usando la misma preparación que la tabla principal
    if (calculatedDose !== null && med.es_volumen_puro) {
      const volume = calculatePureVolume(med, calculatedDose);
      const breakdown = volume.diluentVolumeMl > 0
        ? `<br><small>${volume.drugVolumeMl.toFixed(2)} mL de fármaco + ${volume.diluentVolumeMl.toFixed(2)} mL de diluyente</small>`
        : '';

      html += `
        <div class="med-detail-section">
          <div class="med-detail-label">Volumen final a administrar</div>
          <div class="med-detail-value" style="font-size: 1.4em; font-weight: 700; color: #2196F3;">
            ${volume.finalVolumeMl.toFixed(2)} mL${breakdown}
          </div>
        </div>
      `;
    } else if (calculatedDose !== null && (med.concentracion_mg_ml || med.concentracion_mcg_ml)) {
      const dosisValor = calculatedDose;
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
      let concHtml = `
        <div class="med-detail-section">
          <div class="med-detail-label">Concentraciones disponibles</div>
          <div class="med-detail-value">
      `;
      
      // Si hay dosis y peso, calcular volumen para cada concentración
      if (calculatedDose !== null) {
        const dosisValor = calculatedDose;
        concHtml += `<div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #eee;">
          <strong style="color: var(--primary-color); font-size: 1.1em;">Dosis: ${dosisValor.toFixed(2)} ${med.unidad || 'mg'}</strong>
        </div>`;
        concHtml += `<ul style="margin: 0; padding-left: 20px; line-height: 1.8;">`;
        med.concentraciones.forEach(c => {
          const concentration = getConcentrationEntry(c);
          if (!concentration) return;
          const vol = (dosisValor / concentration.value).toFixed(2);
          concHtml += `<li><strong>${concentration.value} ${concentration.unit}</strong> (${c.desc})<br><span style="color: #2196F3; font-weight: 600;">→ ${vol} mL</span></li>`;
        });
        concHtml += `</ul>`;
      } else {
        // Sin peso, solo mostrar concentraciones
        concHtml += `<ul style="margin: 0; padding-left: 20px; line-height: 1.6;">`;
        med.concentraciones.forEach(c => {
          const concentration = getConcentrationEntry(c);
          if (!concentration) return;
          concHtml += `<li>${concentration.value} ${concentration.unit} - ${c.desc}</li>`;
        });
        concHtml += `</ul>`;
      }
      
      concHtml += `
          </div>
        </div>
      `;
      html += concHtml;
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
      <button id="medDetailGoToTable" class="med-detail-btn med-detail-btn-primary">
        <i class="fas fa-arrow-right"></i> Ir a la tabla
      </button>
      <button id="medDetailCloseAction" class="med-detail-btn med-detail-btn-secondary">
        <i class="fas fa-times"></i> Cerrar
      </button>
    </div>
  `;

  body.innerHTML = html;
  body.querySelector('#medDetailGoToTable')?.addEventListener('click', () => {
    const tabName = getTabForType(type);
    document.querySelector(`button[data-tab="${tabName}"]`)?.click();
    modal.classList.remove('active');
    setTimeout(() => scrollToMed(type, key), 0);
  });
  body.querySelector('#medDetailCloseAction')?.addEventListener('click', () => {
    modal.classList.remove('active');
  });
  modal.classList.add('active');
}
