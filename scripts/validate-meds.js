#!/usr/bin/env node
/**
 * Quick validator for data/meds.json
 * - Checks required fields and numeric ranges
 * - Exits with code 1 on any error
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'meds.json');

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

function nonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

function err(list, where, msg) {
  list.push(`${where}: ${msg}`);
}

function validateCommon(med, where, errors) {
  if (!nonEmptyString(med.nombre || '')) {
    err(errors, where, 'nombre faltante');
  }

  // Validate numeric dose-related fields when present
  const numericFields = [
    'dosis',
    'dosis_kg',
    'dosis_min',
    'dosis_max',
    'dosis_fija',
    'concentracion_mg_ml',
    'concentracion_mcg_ml',
    'concentracion_mEq_ml',
    'factor_dilucion'
  ];
  numericFields.forEach((k) => {
    if (k in med && med[k] !== null && !isNum(med[k])) {
      err(errors, `${where}.${k}`, 'debe ser numérico');
    }
  });

  if (isNum(med.dosis_min) && isNum(med.dosis_max) && med.dosis_min > med.dosis_max) {
    err(errors, where, 'dosis_min mayor que dosis_max');
  }

  // At least some dosing signal
  const hasDose = ['dosis', 'dosis_kg', 'dosis_min', 'dosis_max', 'dosis_fija'].some((k) => isNum(med[k]));
  const hasVolumeFlag = med.es_volumen_puro === true;
  if (!hasDose && !hasVolumeFlag) {
    err(errors, where, 'sin campo de dosis (dosis/dosis_kg/dosis_min/dosis_max) ni es_volumen_puro');
  }

  // Validate concentrations array if present
  if (Array.isArray(med.concentraciones)) {
    med.concentraciones.forEach((c, idx) => {
      const hasConc = isNum(c.conc_mg_ml) || isNum(c.conc_g_ml) || isNum(c.conc_mcg_ml) || isNum(c.conc_mEq_ml);
      if (!hasConc) {
        err(errors, `${where}.concentraciones[${idx}]`, 'falta concentración numérica (conc_mg_ml, conc_g_ml, conc_mcg_ml, conc_mEq_ml)');
      }
      if (!nonEmptyString(c.desc || '')) {
        err(errors, `${where}.concentraciones[${idx}].desc`, 'descripción faltante');
      }
    });
  }
}

function validateIntubacion(intubacion, errors) {
  Object.entries(intubacion || {}).forEach(([key, med]) => {
    const where = `intubacion.${key}`;
    validateCommon(med, where, errors);
    if (!nonEmptyString(med.unidad || '')) {
      err(errors, where, 'unidad faltante');
    }
    if ('dosis_kg' in med && !isNum(med.dosis_kg)) {
      err(errors, `${where}.dosis_kg`, 'debe ser numérico');
    }
  });
}

function validateUrgencia(urgencia, errors) {
  Object.entries(urgencia || {}).forEach(([key, med]) => {
    const where = `urgencia.${key}`;
    validateCommon(med, where, errors);
    if ('dosis' in med && !isNum(med.dosis)) {
      err(errors, `${where}.dosis`, 'debe ser numérico');
    }
  });
}

function validatePerfusiones(perfusiones, errors) {
  Object.entries(perfusiones || {}).forEach(([grupo, meds]) => {
    Object.entries(meds || {}).forEach(([key, med]) => {
      const where = `perfusiones.${grupo}.${key}`;
      validateCommon(med, where, errors);
      if (!isNum(med.dosis_min) || !isNum(med.dosis_max)) {
        err(errors, where, 'dosis_min y dosis_max son obligatorios y numéricos');
      } else if (med.dosis_min <= 0 || med.dosis_max <= 0) {
        err(errors, where, 'dosis_min y dosis_max deben ser > 0');
      } else if (med.dosis_min > med.dosis_max) {
        err(errors, where, 'dosis_min mayor que dosis_max');
      }
      if (!nonEmptyString(med.unidad || '')) {
        err(errors, where, 'unidad faltante');
      }
    });
  });
}

function main() {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const errors = [];

  if (!data || typeof data !== 'object') {
    console.error('meds.json no es un objeto válido');
    process.exit(1);
  }

  validateIntubacion(data.intubacion, errors);
  validateUrgencia(data.urgencia, errors);
  validatePerfusiones(data.perfusiones, errors);

  if (errors.length) {
    console.error('Errores de validación encontrados:');
    errors.forEach((e) => console.error(' -', e));
    process.exit(1);
  }

  console.log('✔ meds.json válido');
}

main();
