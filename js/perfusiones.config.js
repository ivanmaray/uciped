/**
 * perfusiones.config.js
 * Motor de cálculo para perfusiones UCIP.
 * - Volúmenes: 50 ml (default); 100 ml (insulina).
 * - Modos: FIXED_TOTAL, WEIGHT_ADJUSTED_ANCHOR, FIXED_CONCENTRATION, WEIGHT_ADJUSTED_SPECIAL.
 * - Selección inteligente por peso y maxTotal.
 */

/** @typedef {"min" | "h"} TimeUnit */
/** @typedef {"mcg" | "mg" | "IU"} MassUnit */
/** @typedef {"mcg/kg/min" | "mcg/kg/h" | "mg/kg/h" | "IU/kg/h"} DoseUnit */
/** @typedef {"SSF" | "G5" | "SSF_or_G5"} Diluent */
/** @typedef {"FIXED_TOTAL" | "WEIGHT_ADJUSTED_ANCHOR" | "FIXED_CONCENTRATION" | "WEIGHT_ADJUSTED_SPECIAL"} ModeType */

/**
 * @typedef {Object} PreparationResult
 * @property {number} volumeMl
 * @property {{value: number, unit: MassUnit}} total
 * @property {{value: number, unit: string}} concentration  // "mcg/ml", "mg/ml", etc.
 * @property {Diluent} diluent
 * @property {string} [note]
 */

/**
 * @typedef {Object} ConversionResult
 * @property {number} dose
 * @property {DoseUnit} doseUnit
 */

/**
 * @typedef {Object} SelectCriteria
 * @property {number} [minWeightKg]
 * @property {number} [maxWeightKg]
 * @property {{value: number, unit: MassUnit}} [maxTotal]
 */

/**
 * @typedef {Object} ModeBase
 * @property {string} id
 * @property {ModeType} type
 * @property {Diluent} diluent
 * @property {number} volumeMl
 * @property {string} [note]
 * @property {SelectCriteria} [select]
 */

/**
 * @typedef {ModeBase & {type: "FIXED_TOTAL", total: {value: number, unit: MassUnit}}} FixedTotalMode
 * @typedef {ModeBase & {type: "FIXED_CONCENTRATION", concentration: {value: number, unit: string}}} FixedConcentrationMode
 * @typedef {ModeBase & {type: "WEIGHT_ADJUSTED_ANCHOR", anchorMlH: number, anchorDose: number, doseUnit: DoseUnit}} WeightAdjustedAnchorMode
 * @typedef {ModeBase & {type: "WEIGHT_ADJUSTED_SPECIAL", anchorMlH: number, anchorDose: number, doseUnit: DoseUnit, capTotal?: {value: number, unit: MassUnit}}} WeightAdjustedSpecialMode
 * @typedef {FixedTotalMode | FixedConcentrationMode | WeightAdjustedAnchorMode | WeightAdjustedSpecialMode} Mode
 */

/**
 * @typedef {Object} DrugConfig
 * @property {string} key
 * @property {string} displayName
 * @property {DoseUnit} doseUnit
 * @property {Mode[]} modes
 * @property {{min: number, max: number, unit: DoseUnit}} [usualRange]
 */

/**
 * @typedef {Object} ComputeInput
 * @property {string} drugKey
 * @property {number} weightKg
 * @property {number} [rateMlH]
 * @property {string} [modeId]
 */

/**
 * @typedef {Object} ComputeOutput
 * @property {string} drugKey
 * @property {string} displayName
 * @property {string} chosenModeId
 * @property {PreparationResult} preparation
 * @property {{rateMlH: number, conversion: ConversionResult}} [atRate]
 */

// ============ UTILIDADES UNIDADES ============

/**
 * @param {number} value
 * @param {MassUnit} unit
 * @returns {number} valor en mcg
 */
function toMcg(value, unit) {
  if (unit === "mcg") return value;
  if (unit === "mg") return value * 1000;
  throw new Error("IU no convertible a mcg");
}

/**
 * @param {number} value
 * @param {MassUnit} unit
 * @returns {number} valor en mg
 */
function toMg(value, unit) {
  if (unit === "mg") return value;
  if (unit === "mcg") return value / 1000;
  throw new Error("IU no convertible a mg");
}

/**
 * @param {DoseUnit} u
 * @returns {TimeUnit}
 */
function doseUnitTime(u) {
  if (u.endsWith("/min")) return "min";
  return "h";
}

/**
 * @param {DoseUnit} u
 * @returns {MassUnit}
 */
function doseUnitMass(u) {
  if (u.startsWith("mcg/")) return "mcg";
  if (u.startsWith("mg/")) return "mg";
  if (u.startsWith("IU/")) return "IU";
  throw new Error(`DoseUnit desconocida: ${u}`);
}

/**
 * Convierte un "anchorDose" (por kg y tiempo) en "masa absoluta por hora" para un peso dado.
 * @param {number} dose
 * @param {DoseUnit} doseUnit
 * @param {number} weightKg
 * @returns {{value: number, unit: MassUnit, per: string}}
 */
function absRatePerHourFromDose(dose, doseUnit, weightKg) {
  const mass = doseUnitMass(doseUnit);
  const time = doseUnitTime(doseUnit);
  if (time === "h") {
    return { value: dose * weightKg, unit: mass, per: "h" };
  }
  // por minuto -> por hora
  return { value: dose * weightKg * 60, unit: mass, per: "h" };
}

// ============ MOTOR PRINCIPAL ============

/**
 * Elige el primer modo elegible según peso y maxTotal.
 * @param {Mode[]} modes
 * @param {number} weightKg
 * @returns {Mode | undefined}
 */
function chooseMode(modes, weightKg) {
  for (const m of modes) {
    // Filtro por peso
    if (m.select?.minWeightKg != null && weightKg < m.select.minWeightKg)
      continue;
    if (m.select?.maxWeightKg != null && weightKg > m.select.maxWeightKg)
      continue;

    // Filtro por maxTotal (solo aplicable a modos que calculan total)
    if (
      m.select?.maxTotal &&
      (m.type === "WEIGHT_ADJUSTED_ANCHOR" || m.type === "WEIGHT_ADJUSTED_SPECIAL")
    ) {
      const prep = computePreparation(m, weightKg);
      const max = m.select.maxTotal;

      // Comparar en misma unidad
      if (max.unit !== prep.total.unit) {
        if (max.unit === "mcg" && prep.total.unit === "mg") {
          const prepMcg = toMcg(prep.total.value, "mg");
          if (prepMcg > max.value) continue;
        } else if (max.unit === "mg" && prep.total.unit === "mcg") {
          const prepMg = toMg(prep.total.value, "mcg");
          if (prepMg > max.value) continue;
        }
        // IU no se convierte; si no comparable, no filtramos
      } else {
        if (prep.total.value > max.value) continue;
      }
    }

    return m;
  }
  return undefined;
}

/**
 * Computa la preparación para un modo y peso.
 * @param {Mode} mode
 * @param {number} weightKg
 * @returns {PreparationResult}
 */
function computePreparation(mode, weightKg) {
  const V = mode.volumeMl;

  if (mode.type === "FIXED_TOTAL") {
    const total = mode.total;
    const concVal = total.value / V;
    return {
      volumeMl: V,
      total,
      concentration: { value: concVal, unit: `${total.unit}/ml` },
      diluent: mode.diluent,
      note: mode.note,
    };
  }

  if (mode.type === "FIXED_CONCENTRATION") {
    const conc = mode.concentration;
    const unit = conc.unit.split("/")[0];
    const totalVal = conc.value * V;
    return {
      volumeMl: V,
      total: { value: totalVal, unit },
      concentration: conc,
      diluent: mode.diluent,
      note: mode.note,
    };
  }

  if (mode.type === "WEIGHT_ADJUSTED_ANCHOR") {
    const absRateH = absRatePerHourFromDose(
      mode.anchorDose,
      mode.doseUnit,
      weightKg
    );
    const concVal = absRateH.value / mode.anchorMlH;
    const unit = absRateH.unit;
    const totalVal = concVal * V;
    return {
      volumeMl: V,
      total: { value: totalVal, unit },
      concentration: { value: concVal, unit: `${unit}/ml` },
      diluent: mode.diluent,
      note: mode.note,
    };
  }

  // WEIGHT_ADJUSTED_SPECIAL
  const absRateH = absRatePerHourFromDose(mode.anchorDose, mode.doseUnit, weightKg);
  let concVal = absRateH.value / mode.anchorMlH;
  const unit = absRateH.unit;
  let totalVal = concVal * V;

  if (mode.capTotal && mode.capTotal.unit === unit && totalVal > mode.capTotal.value) {
    totalVal = mode.capTotal.value;
  }
  const finalConcVal = totalVal / V;

  return {
    volumeMl: V,
    total: { value: totalVal, unit },
    concentration: { value: finalConcVal, unit: `${unit}/ml` },
    diluent: mode.diluent,
    note: mode.note,
  };
}

/**
 * Calcula dosis (en drugDoseUnit) a un flujo dado.
 * @param {PreparationResult} prep
 * @param {DoseUnit} drugDoseUnit
 * @param {number} weightKg
 * @param {number} rateMlH
 * @returns {ConversionResult}
 */
function doseAtRate(prep, drugDoseUnit, weightKg, rateMlH) {
  const massUnit = doseUnitMass(drugDoseUnit);
  const timeUnit = doseUnitTime(drugDoseUnit);

  const concMassUnit = prep.concentration.unit.split("/")[0];
  let conc = prep.concentration.value;

  if (concMassUnit !== massUnit) {
    if (concMassUnit === "mg" && massUnit === "mcg") conc = toMcg(conc, "mg");
    else if (concMassUnit === "mcg" && massUnit === "mg") conc = toMg(conc, "mcg");
  }

  const absPerHour = rateMlH * conc;
  if (timeUnit === "h") {
    return {
      dose: absPerHour / weightKg,
      doseUnit: drugDoseUnit,
    };
  } else {
    const absPerMin = absPerHour / 60;
    return {
      dose: absPerMin / weightKg,
      doseUnit: drugDoseUnit,
    };
  }
}

/**
 * Motor principal: calcula preparación y dosis para un fármaco.
 * @param {DrugConfig[]} cfg
 * @param {ComputeInput} input
 * @returns {ComputeOutput}
 */
function compute(cfg, input) {
  const drug = cfg.find((d) => d.key === input.drugKey);
  if (!drug) throw new Error(`Drug no encontrado: ${input.drugKey}`);

  const weightKg = input.weightKg;
  const rateMlH = input.rateMlH;

  const modes = drug.modes;
  const chosen = input.modeId
    ? modes.find((m) => m.id === input.modeId)
    : chooseMode(modes, weightKg);

  if (!chosen) {
    throw new Error(`No hay modo elegible para ${drug.key} con peso ${weightKg} kg`);
  }

  const preparation = computePreparation(chosen, weightKg);

  const out = {
    drugKey: drug.key,
    displayName: drug.displayName,
    chosenModeId: chosen.id,
    preparation,
  };

  if (typeof rateMlH === "number") {
    out.atRate = {
      rateMlH,
      conversion: doseAtRate(preparation, drug.doseUnit, weightKg, rateMlH),
    };
  }

  return out;
}

// ============ CONFIGURACIÓN DE FÁRMACOS ============

/** @type {DrugConfig[]} */
const DRUGS = [
  // INOTRÓPICOS / VASOACTIVOS

  {
    key: "adrenaline_peripheral",
    displayName: "Adrenalina vía periférica",
    doseUnit: "mcg/kg/min",
    usualRange: { min: 0.01, max: 1.5, unit: "mcg/kg/min" },
    modes: [
      {
        id: "fixed_1mg_50ml",
        type: "FIXED_TOTAL",
        volumeMl: 50,
        diluent: "SSF",
        total: { value: 1, unit: "mg" },
        note: "Fija: 1 mg c.s.p. 50 ml (20 mcg/ml).",
      },
    ],
  },

  {
    key: "adrenaline_central",
    displayName: "Adrenalina vía central",
    doseUnit: "mcg/kg/min",
    usualRange: { min: 0.01, max: 1.5, unit: "mcg/kg/min" },
    modes: [
      {
        id: "anchor_0p1_mcgkgmin_at_1mlh",
        type: "WEIGHT_ADJUSTED_ANCHOR",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        anchorMlH: 1,
        anchorDose: 0.1,
        doseUnit: "mcg/kg/min",
        note: "Ajustada: 1 ml/h = 0,1 mcg/kg/min. Total (mg) = 0,3 × peso.",
      },
    ],
  },

  {
    key: "noradrenaline_peripheral",
    displayName: "Noradrenalina vía periférica",
    doseUnit: "mcg/kg/min",
    usualRange: { min: 0.1, max: 1, unit: "mcg/kg/min" },
    modes: [
      {
        id: "fixed_1mg_50ml",
        type: "FIXED_TOTAL",
        volumeMl: 50,
        diluent: "SSF",
        total: { value: 1, unit: "mg" },
        note: "Fija: 1 mg c.s.p. 50 ml (20 mcg/ml).",
      },
    ],
  },

  {
    key: "noradrenaline_central",
    displayName: "Noradrenalina vía central",
    doseUnit: "mcg/kg/min",
    usualRange: { min: 0.1, max: 1, unit: "mcg/kg/min" },
    modes: [
      {
        id: "anchor_0p1_mcgkgmin_at_1mlh",
        type: "WEIGHT_ADJUSTED_ANCHOR",
        volumeMl: 50,
        diluent: "G5",
        anchorMlH: 1,
        anchorDose: 0.1,
        doseUnit: "mcg/kg/min",
        note: "Ajustada: 1 ml/h = 0,1 mcg/kg/min. Total (mg) = 0,3 × peso.",
      },
    ],
  },

  {
    key: "dopamine_peripheral",
    displayName: "Dopamina vía periférica",
    doseUnit: "mcg/kg/min",
    usualRange: { min: 5, max: 20, unit: "mcg/kg/min" },
    modes: [
      {
        id: "anchor_1_mcgkgmin_at_1mlh",
        type: "WEIGHT_ADJUSTED_ANCHOR",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        anchorMlH: 1,
        anchorDose: 1,
        doseUnit: "mcg/kg/min",
        note: "Ajustada: 1 ml/h = 1 mcg/kg/min. Total (mg) = 3 × peso.",
      },
    ],
  },

  {
    key: "dopamine_central",
    displayName: "Dopamina vía central",
    doseUnit: "mcg/kg/min",
    usualRange: { min: 5, max: 20, unit: "mcg/kg/min" },
    modes: [
      {
        id: "anchor_10_mcgkgmin_at_1mlh",
        type: "WEIGHT_ADJUSTED_ANCHOR",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        anchorMlH: 1,
        anchorDose: 10,
        doseUnit: "mcg/kg/min",
        note: "Ajustada: 1 ml/h = 10 mcg/kg/min. Total (mg) = 30 × peso.",
      },
    ],
  },

  {
    key: "amiodarone",
    displayName: "Amiodarona",
    doseUnit: "mcg/kg/min",
    usualRange: { min: 5, max: 15, unit: "mcg/kg/min" },
    modes: [
      {
        id: "peds_anchor_5_mcgkgmin_at_1mlh_cap_300mg",
        type: "WEIGHT_ADJUSTED_SPECIAL",
        volumeMl: 50,
        diluent: "G5",
        anchorMlH: 1,
        anchorDose: 5,
        doseUnit: "mcg/kg/min",
        capTotal: { value: 300, unit: "mg" },
        select: { maxWeightKg: 10 },
        note: "Pedi pequeño: 1 ml/h = 5 mcg/kg/min (mg = 15 × peso), tope 300 mg.",
      },
      {
        id: "fixed_300mg_50ml",
        type: "FIXED_TOTAL",
        volumeMl: 50,
        diluent: "G5",
        total: { value: 300, unit: "mg" },
        note: "Fija: 300 mg c.s.p. 50 ml (6 mg/ml).",
      },
    ],
  },

  {
    key: "milrinone",
    displayName: "Milrinona",
    doseUnit: "mcg/kg/min",
    usualRange: { min: 0.3, max: 1, unit: "mcg/kg/min" },
    modes: [
      {
        id: "anchor_0p5_mcgkgmin_at_1mlh",
        type: "WEIGHT_ADJUSTED_ANCHOR",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        anchorMlH: 1,
        anchorDose: 0.5,
        doseUnit: "mcg/kg/min",
        select: { maxTotal: { value: 50, unit: "mg" } },
        note: "Ajustada: 1 ml/h ≈ 0,5 mcg/kg/min (mg = 1,5 × peso).",
      },
      {
        id: "fixed_50mg_50ml",
        type: "FIXED_TOTAL",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        total: { value: 50, unit: "mg" },
        select: { minWeightKg: 50 },
        note: "Tope: 50 mg c.s.p. 50 ml.",
      },
    ],
  },

  {
    key: "labetalol",
    displayName: "Labetalol",
    doseUnit: "mg/kg/h",
    usualRange: { min: 0.5, max: 3, unit: "mg/kg/h" },
    modes: [
      {
        id: "fixed_200mg_50ml",
        type: "FIXED_TOTAL",
        volumeMl: 50,
        diluent: "G5",
        total: { value: 200, unit: "mg" },
        select: { maxWeightKg: 10 },
        note: "Peso bajo: 200 mg c.s.p. 50 ml (4 mg/ml).",
      },
      {
        id: "fixed_250mg_50ml",
        type: "FIXED_TOTAL",
        volumeMl: 50,
        diluent: "G5",
        total: { value: 250, unit: "mg" },
        note: "Estándar: 250 mg c.s.p. 50 ml (5 mg/ml).",
      },
    ],
  },

  // SEDOANALGESIA / PARALIZANTE

  {
    key: "fentanyl",
    displayName: "Fentanilo",
    doseUnit: "mcg/kg/h",
    usualRange: { min: 1, max: 5, unit: "mcg/kg/h" },
    modes: [
      {
        id: "adjusted_1mcgkgH_at_1mlh",
        type: "WEIGHT_ADJUSTED_ANCHOR",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        anchorMlH: 1,
        anchorDose: 1,
        doseUnit: "mcg/kg/h",
        select: { maxTotal: { value: 2000, unit: "mcg" } },
        note: "Ajustada: 1 ml/h = 1 mcg/kg/h. Total (mcg) = 50 × peso.",
      },
      {
        id: "pure_50mcgml",
        type: "FIXED_CONCENTRATION",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        concentration: { value: 50, unit: "mcg/ml" },
        note: "Puro: 50 mcg/ml (2500 mcg/50 ml).",
      },
    ],
  },

  {
    key: "ketamine",
    displayName: "Ketamina",
    doseUnit: "mg/kg/h",
    usualRange: { min: 0.5, max: 2, unit: "mg/kg/h" },
    modes: [
      {
        id: "adjusted_1mgkgH_at_1mlh",
        type: "WEIGHT_ADJUSTED_ANCHOR",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        anchorMlH: 1,
        anchorDose: 1,
        doseUnit: "mg/kg/h",
        select: { maxTotal: { value: 2000, unit: "mg" } },
        note: "Ajustada: 1 ml/h = 1 mg/kg/h. Total (mg) = 50 × peso.",
      },
      {
        id: "pure_50mgml",
        type: "FIXED_CONCENTRATION",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        concentration: { value: 50, unit: "mg/ml" },
        note: "Puro: 50 mg/ml.",
      },
    ],
  },

  {
    key: "midazolam",
    displayName: "Midazolam",
    doseUnit: "mg/kg/h",
    usualRange: { min: 0.05, max: 0.3, unit: "mg/kg/h" },
    modes: [
      {
        id: "adjusted_0p1mgkgH_at_1mlh",
        type: "WEIGHT_ADJUSTED_ANCHOR",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        anchorMlH: 1,
        anchorDose: 0.1,
        doseUnit: "mg/kg/h",
        select: { maxTotal: { value: 200, unit: "mg" } },
        note: "Ajustada: 1 ml/h = 0,10 mg/kg/h. Total (mg) = 5 × peso.",
      },
      {
        id: "pure_5mgml",
        type: "FIXED_CONCENTRATION",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        concentration: { value: 5, unit: "mg/ml" },
        note: "Puro: 5 mg/ml (250 mg/50 ml).",
      },
    ],
  },

  {
    key: "rocuronium",
    displayName: "Rocuronio",
    doseUnit: "mg/kg/h",
    usualRange: { min: 0.3, max: 1, unit: "mg/kg/h" },
    modes: [
      {
        id: "fixed_240mg_50ml_small",
        type: "FIXED_TOTAL",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        total: { value: 240, unit: "mg" },
        select: { maxWeightKg: 10 },
        note: "Peso bajo: 240 mg c.s.p. 50 ml.",
      },
      {
        id: "pure_10mgml",
        type: "FIXED_CONCENTRATION",
        volumeMl: 50,
        diluent: "SSF_or_G5",
        concentration: { value: 10, unit: "mg/ml" },
        note: "Puro: 10 mg/ml (500 mg/50 ml).",
      },
    ],
  },

  {
    key: "insulin",
    displayName: "Insulina",
    doseUnit: "IU/kg/h",
    usualRange: { min: 0.02, max: 0.1, unit: "IU/kg/h" },
    modes: [
      {
        id: "adjusted_0p01IUkgH_at_1mlh",
        type: "WEIGHT_ADJUSTED_ANCHOR",
        volumeMl: 100,
        diluent: "SSF",
        anchorMlH: 1,
        anchorDose: 0.01,
        doseUnit: "IU/kg/h",
        note: "Ajustada: 1 ml/h = 0,01 UI/kg/h. Total UI = peso (kg). Purgar.",
      },
    ],
  },
];

// ============ EXPORT ============

// ES6 exports para navegador
export {
  compute,
  DRUGS,
  toMcg,
  toMg,
  doseUnitTime,
  doseUnitMass,
  absRatePerHourFromDose,
  chooseMode,
  computePreparation,
  doseAtRate,
};

// CommonJS para Node.js (testing)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    compute,
    DRUGS,
    toMcg,
    toMg,
    doseUnitTime,
    doseUnitMass,
    absRatePerHourFromDose,
    chooseMode,
    computePreparation,
    doseAtRate,
  };
}
