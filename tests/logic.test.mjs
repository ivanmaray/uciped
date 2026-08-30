import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calcularEnergiasERC2025,
  calcularTamanioLMA,
  calcularTuboTraquealERC2025,
  calcularVentilacionInicialERC2025,
  calculatePureVolume,
  calcularPesoEstimado,
  intubacionFormulas,
  obtenerSignosVitalesERC2025,
  urgenciaFormulas,
} from '../js/logic.js';
import { compute, DRUGS, formatPerfusionForDisplay, PERFUSION_KEY_MAP } from '../js/perfusiones.config.js';
import { calculateHyperkalemia } from '../js/hyperkalemia.js';
import { readFile } from 'node:fs/promises';

const medsData = JSON.parse(await readFile(new URL('../data/meds.json', import.meta.url), 'utf8'));
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('las fórmulas rápidas visibles coinciden con el motor clínico actual', () => {
  assert.match(indexHtml, /\(edad\/4\) \+ 3,5 mm/);
  assert.doesNotMatch(indexHtml, /Diámetro = \(edad\/4\) \+ 4/);
  assert.doesNotMatch(indexHtml, /Cálculo de Calorías Diarias/);
  assert.match(indexHtml, /Cardioversión sincronizada: 1 → 2 → 4 J\/kg/);
});

test('meds.json y el motor central comparten rangos y claves de perfusión', () => {
  const entries = Object.values(medsData.perfusiones).flatMap((group) => Object.entries(group));
  assert.equal(entries.length, Object.keys(PERFUSION_KEY_MAP).length);

  for (const [jsonKey, med] of entries) {
    const engineKey = PERFUSION_KEY_MAP[jsonKey];
    assert.ok(engineKey, `falta mapeo central para ${jsonKey}`);
    const config = DRUGS.find((drug) => drug.key === engineKey);
    assert.ok(config?.usualRange, `falta rango central para ${engineKey}`);
    assert.equal(med.dosis_min, config.usualRange.min, `${jsonKey}: dosis_min divergente`);
    assert.equal(med.dosis_max, config.usualRange.max, `${jsonKey}: dosis_max divergente`);
    assert.equal(med.unidad.replace('UI', 'IU'), config.usualRange.unit, `${jsonKey}: unidad divergente`);
    assert.equal('dilucion' in med, false, `${jsonKey}: conserva dilución estática`);
    assert.equal('ml_h_equiv' in med, false, `${jsonKey}: conserva equivalencia estática`);
  }
});

test('la succinilcolina distingue menores de un año según ficha técnica', () => {
  assert.equal(intubacionFormulas.succinilcolina(10, 0.99), 20);
  assert.equal(intubacionFormulas.succinilcolina(10, 1), 10);
});

test('el estimador rechaza edades fuera del rango pediátrico', () => {
  assert.throws(() => calcularPesoEstimado(-1), RangeError);
  assert.throws(() => calcularPesoEstimado(19), RangeError);
  assert.equal(calcularPesoEstimado(5).peso, '18.0');
});

test('las fórmulas de urgencia producen resultados finitos y no negativos', () => {
  for (const peso of [0.5, 1, 5, 10, 30, 100, 300]) {
    for (const [nombre, formula] of Object.entries(urgenciaFormulas)) {
      const resultado = formula(peso);
      assert.ok(Number.isFinite(resultado), `${nombre} no es finito para ${peso} kg`);
      assert.ok(resultado >= 0, `${nombre} es negativo para ${peso} kg`);
    }
  }
});

test('la amiodarona aplica 5 mg/kg sin superar 300 mg', () => {
  assert.equal(urgenciaFormulas.amiodarona(10), 50);
  assert.equal(urgenciaFormulas.amiodarona(60), 300);
  assert.equal(urgenciaFormulas.amiodarona(60.1), 300);
  assert.equal(urgenciaFormulas.amiodarona(100), 300);
});

test('adenosina y adrenalina respetan los máximos ERC 2025', () => {
  assert.equal(urgenciaFormulas.adenosina(10), 1);
  assert.equal(urgenciaFormulas.adenosina(60), 6);
  assert.equal(urgenciaFormulas.adenosina(100), 6);
  assert.equal(urgenciaFormulas.adrenalina(10), 0.1);
  assert.equal(urgenciaFormulas.adrenalina(100), 1);
  assert.equal(urgenciaFormulas.adrenalina(300), 1);
});

test('flumazenilo mantiene 0.01 mg/kg hasta el máximo de 0.2 mg', () => {
  assert.equal(urgenciaFormulas.flumazenilo(10), 0.1);
  assert.equal(urgenciaFormulas.flumazenilo(19), 0.19);
  assert.equal(urgenciaFormulas.flumazenilo(20), 0.2);
  assert.equal(urgenciaFormulas.flumazenilo(100), 0.2);
});

test('urgencias actualizadas aplican dosis y máximos ERC 2025', () => {
  assert.equal(urgenciaFormulas.boloLiquidos(10), 100);
  assert.equal(urgenciaFormulas.boloLiquidos(50), 500);
  assert.equal(urgenciaFormulas.glucosa(10), 20);
  assert.equal(urgenciaFormulas.glucosa(100), 200);
  assert.equal(urgenciaFormulas.tranexamico(10), 150);
  assert.equal(urgenciaFormulas.tranexamico(100), 1000);
});

test('energías de desfibrilación y cardioversión siguen ERC 2025', () => {
  assert.deepEqual(calcularEnergiasERC2025(10), {
    defibInitialJ: 40,
    defibRefractoryJ: 80,
    cardioversionJ: [10, 20, 40],
  });
  assert.deepEqual(calcularEnergiasERC2025(100), {
    defibInitialJ: 200,
    defibRefractoryJ: 360,
    cardioversionJ: [100, 200, 400],
  });
});

test('signos vitales ERC 2025 cubren anclajes e interpolan sin huecos', () => {
  assert.deepEqual(obtenerSignosVitalesERC2025(5), {
    age: 5, rrLow: 17, rrHigh: 30, hrLow: 70, hrHigh: 140,
    sbpP50: 100, sbpP10: 80, sbpP5: 75, mapP50: 75, mapP10: 60, mapP5: 55,
  });
  const ageThree = obtenerSignosVitalesERC2025(3);
  assert.equal(ageThree.hrLow, 83);
  assert.equal(ageThree.hrHigh, 153);
  assert.equal(ageThree.rrLow, 18);
  assert.equal(ageThree.rrHigh, 37);
  assert.deepEqual(obtenerSignosVitalesERC2025(0), obtenerSignosVitalesERC2025(1 / 12));
  assert.throws(() => obtenerSignosVitalesERC2025(18.1), RangeError);
});

test('ventilación inicial usa peso, FR baja-normal y PEEP ERC 2025', () => {
  const vent = calcularVentilacionInicialERC2025(5, 10, 'VC');
  assert.match(vent.ventVt, /^60-80 mL/);
  assert.match(vent.ventFr, /^17 rpm/);
  assert.match(vent.ventPeep, /^5 cmH₂O/);
  assert.match(vent.ventFiO2, /SpO₂ 94-98%/);
  assert.match(vent.ventModeParams, /VC: Vt 60-80 mL; FR 17 rpm; PEEP 5/);
});

test('ventilación separa los límites PALICC-2 y rechaza modos inválidos', () => {
  const vent = calcularVentilacionInicialERC2025(10, 30, 'PC');
  assert.match(vent.ventPplat, /≤28/);
  assert.match(vent.ventPplat, /29-32/);
  assert.match(vent.ventDriving, /≤15/);
  assert.match(vent.ventModeParams, /^PC:/);
  assert.throws(() => calcularVentilacionInicialERC2025(5, 10, 'SIMV'), RangeError);
  assert.throws(() => calcularVentilacionInicialERC2025(19, 10), RangeError);
});

test('tubo con balón usa la fórmula ERC hasta 8 años y explicita la fuente', () => {
  const child = calcularTuboTraquealERC2025(5, 18);
  assert.equal(child.sizeMm, 5);
  assert.equal(child.depthCm, 15);
  assert.equal(child.cuffLabel, 'con balón');
  assert.match(child.source, /ERC 2025/);
  assert.match(child.depthSource, /estimación local/);
  assert.match(child.note, /no especifica esta fórmula de profundidad/);

  const olderChild = calcularTuboTraquealERC2025(10, 30);
  assert.equal(olderChild.cuffLabel, 'con balón');
  assert.match(olderChild.source, />8 años/);
  assert.match(olderChild.note, /validada solo hasta 8 años/);
});

test('la rama neonatal identifica correctamente el tubo local sin balón', () => {
  const neonatal = calcularTuboTraquealERC2025(0, 3);
  assert.equal(neonatal.sizeMm, 3);
  assert.equal(neonatal.cuffLabel, 'sin balón');
  assert.match(neonatal.source, /tabla neonatal local/);
  assert.match(neonatal.depthSource, /tabla neonatal local/);
  assert.match(neonatal.note, /tubo sin balón/);
});

test('la interfaz declara el alcance neonatal de signos y vía aérea', () => {
  assert.match(indexHtml, /Para menores de 1 mes se muestra la referencia de 1 mes/);
  assert.match(indexHtml, /tabla neonatal local de tubo sin balón/);
  assert.match(indexHtml, /ERC 2025 no especifica esa fórmula/);
});

test('LMA completa los tamaños del fabricante para pesos altos', () => {
  assert.equal(calcularTamanioLMA(4.9), '1');
  assert.equal(calcularTamanioLMA(5), '1.5');
  assert.equal(calcularTamanioLMA(69.9), '4');
  assert.equal(calcularTamanioLMA(70), '5');
  assert.equal(calcularTamanioLMA(100), '5');
  assert.equal(calcularTamanioLMA(100.1), '6');
});

test('atropina respeta el mínimo local y el máximo ERC 2025 de 0.5 mg', () => {
  for (const formula of [urgenciaFormulas.atropina_urgencia, intubacionFormulas.atropina]) {
    assert.equal(formula(1), 0.1);
    assert.equal(formula(5), 0.1);
    assert.equal(formula(25), 0.5);
    assert.equal(formula(30), 0.5);
    assert.equal(formula(100), 0.5);
  }
});

test('el buscador reutiliza la fórmula de urgencia para amiodarona', async () => {
  const { calculateWeightBasedDose } = await import('../js/search.js');
  const med = { dosis: 5, unidad: 'mg' };
  assert.equal(calculateWeightBasedDose('urgencia', 'amiodarona', med, 100), 300);
});

test('el buscador aplica los máximos de adenosina y adrenalina', async () => {
  const { calculateWeightBasedDose } = await import('../js/search.js');
  assert.equal(calculateWeightBasedDose('urgencia', 'adenosina', { dosis: 0.1 }, 100), 6);
  assert.equal(calculateWeightBasedDose('urgencia', 'adrenalina', { dosis: 0.01 }, 300), 1);
});

test('el buscador aplica el máximo de atropina de urgencia', async () => {
  const { calculateWeightBasedDose } = await import('../js/search.js');
  assert.equal(calculateWeightBasedDose('urgencia', 'atropina_urgencia', { dosis: 0.02 }, 100), 0.5);
});

test('el buscador coincide con todas las fórmulas centrales de urgencia', async () => {
  const { calculateWeightBasedDose } = await import('../js/search.js');
  for (const peso of [1, 10, 19, 20, 50, 100, 300]) {
    for (const [key, formula] of Object.entries(urgenciaFormulas)) {
      const med = { dosis: 1, unidad: key === 'bicarbonato' ? 'mEq' : 'mg' };
      assert.equal(
        calculateWeightBasedDose('urgencia', key, med, peso),
        formula(peso),
        `${key} no coincide para ${peso} kg`
      );
    }
  }
});

test('el buscador coincide con todas las fórmulas centrales de intubación', async () => {
  const { calculateWeightBasedDose } = await import('../js/search.js');
  for (const peso of [1, 10, 50, 100, 300]) {
    for (const edad of [0, 0.99, 1, 2, 10, 18]) {
      for (const [key, formula] of Object.entries(intubacionFormulas)) {
        assert.equal(
          calculateWeightBasedDose('intubacion', key, { dosis_kg: 1 }, peso, edad),
          formula(peso, edad),
          `${key} no coincide para ${peso} kg y ${edad} años`
        );
      }
    }
  }
});

test('el buscador reutiliza las fórmulas de intubación', async () => {
  const { calculateWeightBasedDose } = await import('../js/search.js');
  assert.equal(calculateWeightBasedDose('intubacion', 'fentanilo', { dosis_kg: 2 }, 10), 20);
  assert.equal(calculateWeightBasedDose('intubacion', 'atropina', { dosis_kg: 0.02 }, 100), 0.5);
  assert.equal(calculateWeightBasedDose('intubacion', 'succinilcolina', { dosis_kg: 1 }, 10, 0.99), 20);
  assert.equal(calculateWeightBasedDose('intubacion', 'succinilcolina', { dosis_kg: 1 }, 10, 1), 10);
  assert.equal(calculateWeightBasedDose('intubacion', 'succinilcolina', { dosis_kg: 1 }, 10), null);
});

test('bicarbonato distingue dosis, fármaco y volumen final 1:1', () => {
  const meta = {
    unidad_especial: 'mEq',
    es_volumen_puro: true,
    concentracion_mEq_ml: 1,
    factor_dilucion: 2,
  };
  assert.deepEqual(calculatePureVolume(meta, 10), {
    drugVolumeMl: 10,
    diluentVolumeMl: 10,
    finalVolumeMl: 20,
  });
  assert.deepEqual(calculatePureVolume(meta, 50), {
    drugVolumeMl: 50,
    diluentVolumeMl: 50,
    finalVolumeMl: 100,
  });
});

test('el buscador calcula bicarbonato aunque la dosis viva en la fórmula central', async () => {
  const { calculateWeightBasedDose } = await import('../js/search.js');
  assert.equal(calculateWeightBasedDose('urgencia', 'bicarbonato', { unidad: 'mEq' }, 10), 10);
  assert.equal(calculateWeightBasedDose('urgencia', 'bicarbonato', { unidad: 'mEq' }, 100), 50);
});

test('todas las preparaciones de perfusión son finitas y positivas', () => {
  for (const peso of [0.5, 1, 5, 10, 30, 34, 40, 49, 100, 300]) {
    for (const drug of DRUGS) {
      const { preparation } = compute(DRUGS, { drugKey: drug.key, weightKg: peso });
      assert.ok(Number.isFinite(preparation.total.value));
      assert.ok(Number.isFinite(preparation.concentration.value));
      assert.ok(preparation.total.value > 0);
      assert.ok(preparation.concentration.value > 0);
    }
  }
});

test('milrinona cambia a la preparación fija sin dejar pesos sin cálculo', () => {
  const adjusted = compute(DRUGS, { drugKey: 'milrinone', weightKg: 33 });
  assert.equal(adjusted.chosenModeId, 'anchor_0p5_mcgkgmin_at_1mlh');
  assert.equal(adjusted.preparation.total.value, 49500);
  assert.equal(adjusted.preparation.total.unit, 'mcg');

  for (const weightKg of [34, 40, 49, 50]) {
    const fixed = compute(DRUGS, { drugKey: 'milrinone', weightKg });
    assert.equal(fixed.chosenModeId, 'fixed_50mg_50ml');
    assert.equal(fixed.preparation.total.value, 50);
    assert.equal(fixed.preparation.concentration.value, 1);
  }
});

test('insulina calcula la preparación ajustada y la equivalencia por peso', () => {
  for (const weightKg of [3, 10, 40, 100]) {
    const result = compute(DRUGS, { drugKey: 'insulin', weightKg, rateMlH: 1 });
    assert.equal(result.chosenModeId, 'adjusted_0p01IUkgH_at_1mlh');
    assert.equal(result.preparation.volumeMl, 100);
    assert.equal(result.preparation.total.value, weightKg);
    assert.equal(result.preparation.total.unit, 'IU');
    assert.equal(result.atRate.conversion.dose, 0.01);
    assert.equal(result.atRate.conversion.doseUnit, 'IU/kg/h');
  }
});

test('perfusiones muestran dosis absoluta, ritmo y equivalencia desde un único cálculo', () => {
  const drug = DRUGS.find(({ key }) => key === 'adrenaline_central');
  const result = compute(DRUGS, { drugKey: drug.key, weightKg: 18 });
  assert.deepEqual(formatPerfusionForDisplay(drug, result, 18), {
    rangeText: '0.01-1.5 mcg/kg/min',
    absoluteHourlyText: '10.8-1620 mcg/h',
    rateText: '0.1-15 mL/h',
    presentationText: '1 mg/mL',
    preparationText: '5.4 mg hasta 50 mL con SSF o G5%',
    equivalenceText: '1 mL/h = 0.1 mcg/kg/min',
    rateWarningText: '',
  });
});

test('perfusiones avisan cuando la preparación produce ritmos extremos', () => {
  const rocuronio = DRUGS.find((drug) => drug.key === 'rocuronium');
  const rocuronioDisplay = formatPerfusionForDisplay(
    rocuronio,
    compute(DRUGS, { drugKey: 'rocuronium', weightKg: 1 }),
    1
  );
  assert.match(rocuronioDisplay.rateWarningText, /ritmo extremo/);

  const fentanilo = DRUGS.find((drug) => drug.key === 'fentanyl');
  const fentaniloDisplay = formatPerfusionForDisplay(
    fentanilo,
    compute(DRUGS, { drugKey: 'fentanyl', weightKg: 10 }),
    10
  );
  assert.equal(fentaniloDisplay.rateWarningText, '');
});

test('insulina para CAD usa el rango ISPAD y conserva la preparación ajustada', () => {
  const drug = DRUGS.find(({ key }) => key === 'insulin');
  const result = compute(DRUGS, { drugKey: drug.key, weightKg: 10 });
  const display = formatPerfusionForDisplay(drug, result, 10);
  assert.equal(display.rangeText, '0.05-0.1 UI/kg/h');
  assert.equal(display.absoluteHourlyText, '0.5-1 UI/h');
  assert.equal(display.rateText, '5-10 mL/h');
  assert.equal(PERFUSION_KEY_MAP.insulina_perf, 'insulin');
});

test('el motor de perfusiones rechaza peso y ritmo inválidos', () => {
  assert.throws(() => compute(DRUGS, { drugKey: 'insulin', weightKg: 0 }), RangeError);
  assert.throws(() => compute(DRUGS, { drugKey: 'insulin', weightKg: 301 }), RangeError);
  assert.throws(() => compute(DRUGS, { drugKey: 'insulin', weightKg: 10, rateMlH: -1 }), RangeError);
});

test('el buscador encuentra medicamentos dentro de grupos de perfusiones', async () => {
  const meds = (await import('../data/meds.json', { with: { type: 'json' } })).default;
  globalThis.fetch = async () => ({ ok: true, json: async () => structuredClone(meds) });
  const { initSearch, searchMeds } = await import('../js/search.js');
  await initSearch();
  const results = searchMeds('fentanilo');
  assert.ok(results.some((item) => item.type === 'perfusiones' && item.key === 'fentanilo_perf'));
});

test('el buscador reconoce concentraciones en gramos sin producir NaN', async () => {
  const { getConcentrationEntry } = await import('../js/search.js');
  assert.deepEqual(getConcentrationEntry({ conc_g_ml: 0.2 }), { value: 0.2, unit: 'g/mL' });
  assert.deepEqual(getConcentrationEntry({ conc_mg_ml: 10 }), { value: 10, unit: 'mg/mL' });
  assert.equal(getConcentrationEntry({}), null);
});

test('la preparación local de NaCl al 3% usa proporciones aritméticamente correctas', async () => {
  const meds = (await import('../data/meds.json', { with: { type: 'json' } })).default;
  const preparation = meds.urgencia.salinoHiper.dilucion;
  assert.match(preparation, /15 mL de NaCl 20% \+ 85 mL de SSF/);
  assert.match(preparation, /75 mL de NaCl 20% \+ 425 mL de SSF/);
  assert.equal((15 * 0.2) / 100, 0.03);
});

test('hiperpotasemia calcula los máximos ERC 2025', () => {
  const result = calculateHyperkalemia(100, 6.8, { ecgChanges: true });
  assert.equal(result.severe, true);
  assert.equal(result.calcium.gluconateMl, 20);
  assert.equal(result.shift.insulinUnits, 10);
  assert.equal(result.shift.glucose10Ml, 250);
  assert.equal(result.shift.nebulizedSalbutamolMg, 5);
  assert.equal(result.shift.nebulizedSalbutamolMl, 5);
  assert.equal(result.shift.nebulizedSalbutamolAmpoules, 2);
  assert.equal(result.elimination.furosemideMg, 100);
  assert.equal(result.elimination.furosemideApplicable, false);
});

test('hiperpotasemia aplica el umbral neonatal y condiciona el bicarbonato', () => {
  const belowNeonatalThreshold = calculateHyperkalemia(3, 6.8, { neonateUnder96h: true });
  assert.equal(belowNeonatalThreshold.severe, false);
  assert.equal(belowNeonatalThreshold.shift, null);
  assert.equal(belowNeonatalThreshold.bicarbonate, null);

  const withAcidosis = calculateHyperkalemia(3, 7.1, {
    neonateUnder96h: true,
    acidosis: true,
  });
  assert.equal(withAcidosis.severe, true);
  assert.deepEqual(withAcidosis.bicarbonate, { doseMEq: 3, bicarbonate1Mml: 3, salineMl: 3 });
});

test('hiperpotasemia escoge la dosis nebulizada según 25 kg', () => {
  const lowDose = calculateHyperkalemia(25, 6.8);
  assert.equal(lowDose.shift.nebulizedSalbutamolAmpoules, 1);
  assert.equal(lowDose.shift.nebulizedSalbutamolMg, 2.5);
  const highDose = calculateHyperkalemia(25.1, 6.8);
  assert.equal(highDose.shift.nebulizedSalbutamolAmpoules, 2);
  assert.equal(highDose.shift.nebulizedSalbutamolMg, 5);
});

test('hiperpotasemia en parada cardiaca bloquea calcio y bicarbonato', () => {
  const result = calculateHyperkalemia(10, 7, {
    cardiacArrest: true,
    ecgChanges: true,
    acidosis: true,
  });
  assert.equal(result.cardiacArrest, true);
  assert.equal(result.urgent, true);
  assert.equal(result.calcium, null);
  assert.equal(result.bicarbonate, null);
  assert.equal(result.shift.insulinUnits, 1);
  assert.equal(result.shift.glucose10Ml, 50);
  assert.equal(result.shift.ivSalbutamolMcg, 50);
});

test('limpiar paciente borra edad y peso y notifica a todos los módulos', async () => {
  const originalDocument = globalThis.document;
  const originalCustomEvent = globalThis.CustomEvent;
  const inputs = {
    headerEdadInput: { value: '' },
    headerPesoInput: { value: '' },
  };
  const events = [];

  globalThis.document = {
    getElementById: (id) => inputs[id] || null,
    dispatchEvent: (event) => events.push(event),
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  try {
    const { setPatientData, clearPatientData, getPatientData } = await import('../js/state.js');
    setPatientData(5, 18);
    clearPatientData();

    assert.deepEqual(getPatientData(), { edad: null, peso: null });
    assert.equal(inputs.headerEdadInput.value, '');
    assert.equal(inputs.headerPesoInput.value, '');
    assert.equal(events.at(-2).type, 'patientDataChanged');
    assert.deepEqual(events.at(-2).detail, { edad: null, peso: null, pesoOrigen: null });
    assert.equal(events.at(-1).type, 'patientDataCleared');
  } finally {
    globalThis.document = originalDocument;
    globalThis.CustomEvent = originalCustomEvent;
  }
});
