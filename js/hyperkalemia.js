import { getPatientData } from './state.js?v=113';
import { setupFocusTrap } from './focus-trap.js?v=113';

const round = (value, decimals = 2) => Number(value.toFixed(decimals));

export function calculateHyperkalemia(weightKg, potassium, options = {}) {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 300) {
    throw new RangeError('El peso debe estar entre 0 y 300 kg');
  }
  if (!Number.isFinite(potassium) || potassium <= 0 || potassium > 15) {
    throw new RangeError('El potasio debe estar entre 0 y 15 mmol/L');
  }

  const threshold = options.neonateUnder96h ? 7 : 6.5;
  const severe = potassium > threshold;
  const cardiacArrest = options.cardiacArrest === true;
  const urgent = severe || options.ecgChanges === true || cardiacArrest;
  // ERC 2025 indica 2,5–5 mg. Se concreta la elección mediante el corte
  // pediátrico por peso usado por RCH/PCH: <=25 kg 2,5 mg; >25 kg 5 mg.
  const salbutamolDoseMg = weightKg <= 25 ? 2.5 : 5;

  return {
    threshold,
    severe,
    urgent,
    cardiacArrest,
    calcium: options.ecgChanges && !cardiacArrest ? {
      gluconateMl: round(Math.min(weightKg * 0.5, 20)),
      salineMl: round(Math.min(weightKg * 0.5, 20)),
      finalVolumeMl: round(Math.min(weightKg * 1, 40)),
    } : null,
    shift: urgent ? {
      insulinUnits: round(Math.min(weightKg * 0.1, 10)),
      glucose10Ml: round(Math.min(weightKg * 5, 250)),
      nebulizedSalbutamolMg: salbutamolDoseMg,
      nebulizedSalbutamolMl: salbutamolDoseMg,
      nebulizedSalbutamolAmpoules: salbutamolDoseMg / 2.5,
      nebulizedRepeats: 5,
      ivSalbutamolMcg: round(weightKg * 5),
      ivSalbutamolMaxTotalMcg: round(weightKg * 15),
    } : null,
    bicarbonate: options.acidosis && !cardiacArrest ? {
      doseMEq: round(Math.min(weightKg, 50)),
      bicarbonate1Mml: round(Math.min(weightKg, 50)),
      salineMl: round(Math.min(weightKg, 50)),
    } : null,
    elimination: {
      furosemideMg: round(weightKg),
      furosemideApplicable: options.preservedRenalFunction === true,
      resinGramsPerDose: round(Math.min(weightKg * 0.25, 7.5)),
    },
  };
}

function format(value) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
}

function renderResults(result) {
  const severityText = result.cardiacArrest
    ? 'Parada cardiaca atribuible a hiperpotasemia — aplicar el algoritmo de PCR y tratar simultáneamente la causa reversible.'
    : result.severe
    ? `Hiperpotasemia grave según ERC 2025 (umbral: &gt;${result.threshold} mmol/L).`
    : result.urgent
      ? 'Tratamiento urgente por alteraciones en el ECG.'
      : `No supera el umbral ERC 2025 de hiperpotasemia grave (&gt;${result.threshold} mmol/L).`;

  let html = `
    <section class="hyperkalemia-status ${result.urgent ? 'is-urgent' : ''}">
      <strong>${severityText}</strong>
      <span>Suspender aportes de potasio, buscar y tratar la causa. Si precisa fluidoterapia, usar solución sin potasio.</span>
    </section>`;

  if (result.cardiacArrest) {
    html += `
      <section class="hyperkalemia-step is-first">
        <h3>Tratamiento específico durante la PCR · ERC 2025</h3>
        <p class="clinical-warning"><strong>No administrar calcio ni bicarbonato en la parada cardiaca causada por hiperpotasemia.</strong> Administrar insulina con glucosa y salbutamol IV simultáneamente, además del algoritmo estándar de reanimación.</p>
      </section>`;
  }

  if (!result.urgent) {
    html += `
      <section class="hyperkalemia-step">
        <h3>Reevaluación</h3>
        <p>Confirmar la muestra, ECG, función renal, glucemia y evolución del potasio. Aplicar el protocolo institucional si existe progresión clínica.</p>
      </section>`;
  }

  if (result.calcium) {
    html += `
      <section class="hyperkalemia-step is-first">
        <h3>1. Estabilizar membrana: gluconato cálcico 10%</h3>
        <div class="dose-highlight">${format(result.calcium.gluconateMl)} mL de gluconato + ${format(result.calcium.salineMl)} mL de SSF</div>
        <p>0,5 mL/kg (máximo 20 mL), dilución 1:1; volumen final ${format(result.calcium.finalVolumeMl)} mL. Pasar en 5 minutos con monitorización ECG continua.</p>
        <p class="clinical-warning">Repetir a los 10 minutos si persisten los cambios. Riesgo de extravasación y bradicardia; precaución con toxicidad digitálica. No administrar simultáneamente con bicarbonato.</p>
      </section>`;
  }

  if (result.shift) {
    html += `
      <section class="hyperkalemia-step">
        <h3>${result.cardiacArrest ? 'Tratamiento durante PCR' : `${result.calcium ? '2' : '1'}. Desplazamiento intracelular`} — iniciar simultáneamente</h3>
        <div class="hyperkalemia-dose-grid">
          <article>
            <strong>Insulina rápida + glucosa 10%</strong>
            <span>${format(result.shift.insulinUnits)} UI + ${format(result.shift.glucose10Ml)} mL</span>
            <small>0,1 UI/kg (máx. 10 UI) con SG10% 5 mL/kg (máx. 250 mL) durante 30 min.</small>
          </article>
          ${result.cardiacArrest ? '' : `<article>
            <strong>Salbutamol nebulizado · ERC 2025, concretado por peso</strong>
            <span>${format(result.shift.nebulizedSalbutamolMg)} mg = ${format(result.shift.nebulizedSalbutamolMl)} mL</span>
            <small>${format(result.shift.nebulizedSalbutamolAmpoules)} ${result.shift.nebulizedSalbutamolAmpoules === 1 ? 'ampolla' : 'ampollas'} de 2,5 mg/2,5 mL. Criterio: ≤25 kg → 2,5 mg; &gt;25 kg → 5 mg. Puede repetirse hasta ${result.shift.nebulizedRepeats} veces. Monitorizar taquicardia y temblor.</small>
          </article>`}
          <article>
            <strong>${result.cardiacArrest ? 'Salbutamol IV · durante PCR' : 'Alternativa IV si no es posible inhalar'}</strong>
            <span>${format(result.shift.ivSalbutamolMcg)} microgramos IV</span>
            <small>5 microgramos/kg en 5 min; repetir a los 15 min si es insuficiente. Máximo total ${format(result.shift.ivSalbutamolMaxTotalMcg)} microgramos.</small>
          </article>
        </div>
        <p class="clinical-warning">${result.cardiacArrest ? 'Monitorizar glucemia y potasio durante la reanimación cuando sea posible y de forma estrecha tras ROSC.' : 'Controlar glucemia y potasio cada 15 minutos durante 4 horas. Continuar después con aporte de glucosa según evolución.'}</p>
      </section>`;
  }

  html += `
    <section class="hyperkalemia-step">
      <h3>${result.cardiacArrest ? 'Tras ROSC o como soporte definitivo: eliminar potasio' : `${result.shift ? (result.calcium ? '3' : '2') : '1'}. Eliminar potasio`}</h3>
      <div class="hyperkalemia-dose-grid">
        <article class="${result.elimination.furosemideApplicable ? '' : 'is-not-applicable'}">
          <strong>Furosemida · protocolo local</strong>
          <span>${format(result.elimination.furosemideMg)} mg IV</span>
          <small>1 mg/kg. ${result.elimination.furosemideApplicable
            ? 'Opción habilitada al confirmar hidratación, diuresis y función renal conservadas.'
            : 'Dosis informativa: no administrar automáticamente sin confirmar hidratación, diuresis y función renal conservadas.'}</small>
        </article>
        <article><strong>Poliestirensulfonato cálcico · protocolo local</strong><span>${format(result.elimination.resinGramsPerDose)} g por dosis</span><small>0,25 g/kg cada 6 h; máximo calculado 7,5 g/dosis (30 g/día). Contraindicado en neonatos, íleo o posoperatorio intestinal.</small></article>
        <article><strong>Diálisis</strong><span>Valorar precozmente</span><small>Especialmente ante persistencia, anuria, insuficiencia renal o respuesta inadecuada.</small></article>
      </div>
    </section>`;

  if (result.bicarbonate) {
    html += `
      <section class="hyperkalemia-step bicarbonate-note">
        <h3>Bicarbonato sódico 1 M — solo si existe indicación por acidosis</h3>
        <div class="dose-highlight">${format(result.bicarbonate.bicarbonate1Mml)} mL de bicarbonato + ${format(result.bicarbonate.salineMl)} mL de SSF</div>
        <p>1 mEq/kg (máximo 50 mEq), diluido 1:1, IV en 10–15 minutos.</p>
        <p class="clinical-warning"><strong>ERC 2025 no recomienda bicarbonato de forma rutinaria para la hiperpotasemia.</strong> Usar únicamente si la acidosis supone una indicación clínica específica y conforme al protocolo institucional.</p>
      </section>`;
  }

  return html;
}

export function initHyperkalemia() {
  const modal = document.getElementById('hyperkalemiaModal');
  const openBtn = document.getElementById('openHyperkalemiaBtn');
  const closeBtn = document.getElementById('closeHyperkalemiaBtn');
  const calculateBtn = document.getElementById('calculateHyperkalemiaBtn');
  const cardiacArrestEl = document.getElementById('hyperkalemiaCardiacArrest');
  const ecgEl = document.getElementById('hyperkalemiaEcg');
  const acidosisEl = document.getElementById('hyperkalemiaAcidosis');
  const potassiumEl = document.getElementById('hyperkalemiaPotassium');
  const neonateEl = document.getElementById('hyperkalemiaNeonate');
  const renalEl = document.getElementById('hyperkalemiaRenal');
  const weightEl = document.getElementById('hyperkalemiaWeight');
  const resultsEl = document.getElementById('hyperkalemiaResults');
  if (!modal || !openBtn || !closeBtn || !calculateBtn || !resultsEl) return;

  setupFocusTrap(modal);

  const close = () => modal.classList.add('hidden');
  openBtn.addEventListener('click', () => {
    const { peso } = getPatientData();
    weightEl.textContent = Number.isFinite(peso) ? format(peso) : '—';
    resultsEl.classList.add('hidden');
    modal.classList.remove('hidden');
  });
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  cardiacArrestEl?.addEventListener('change', () => {
    const disabled = cardiacArrestEl.checked;
    for (const input of [ecgEl, acidosisEl]) {
      if (!input) continue;
      if (disabled) input.checked = false;
      input.disabled = disabled;
    }
  });

  document.addEventListener('patientDataCleared', () => {
    weightEl.textContent = '—';
    if (potassiumEl) potassiumEl.value = '';
    for (const input of [cardiacArrestEl, ecgEl, acidosisEl, neonateEl, renalEl]) {
      if (!input) continue;
      input.checked = false;
      input.disabled = false;
    }
    resultsEl.innerHTML = '';
    resultsEl.classList.add('hidden');
  });

  calculateBtn.addEventListener('click', () => {
    const { peso } = getPatientData();
    const potassium = Number.parseFloat(potassiumEl.value.replace(',', '.'));
    try {
      const result = calculateHyperkalemia(peso, potassium, {
        ecgChanges: document.getElementById('hyperkalemiaEcg').checked,
        neonateUnder96h: document.getElementById('hyperkalemiaNeonate').checked,
        acidosis: document.getElementById('hyperkalemiaAcidosis').checked,
        preservedRenalFunction: document.getElementById('hyperkalemiaRenal').checked,
        cardiacArrest: cardiacArrestEl?.checked === true,
      });
      resultsEl.innerHTML = renderResults(result);
    } catch (error) {
      resultsEl.innerHTML = `<div class="clinical-warning">${error.message}. Introduce primero un peso válido en la cabecera y el valor actual de potasio.</div>`;
    }
    resultsEl.classList.remove('hidden');
  });
}
