import { loadMeds } from './data.js?v=113';
import { calcularPesoEstimado, calcularEnergiasERC2025, calcularTuboTraquealERC2025, calcularTamanioLMA, calcularVentilacionInicialERC2025, obtenerParametrosDeMATRIZ1, obtenerParametrosDeMATRIZ2, obtenerSignosVitalesERC2025, urgenciaFormulas, urgenciaDosisPorKg, intubacionFormulas, intubacionDosisPorKg, formatDosis, calculatePureVolume } from './logic.js?v=114';
import { setPatientData, getPatientData, getWeightSource, setHeaderValues, clearPatientData } from './state.js?v=113';
import { compute, DRUGS, formatPerfusionForDisplay, PERFUSION_KEY_MAP } from './perfusiones.config.js?v=113';
import { setupFocusTrap } from './focus-trap.js?v=113';
import { announce } from './announcer.js?v=113';

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }
function valid(v){ return Number.isFinite(v) && v >= 0; }
function validAge(v){ return valid(v) && v <= 18; }
function validWeight(v){ return Number.isFinite(v) && v > 0 && v <= 300; }

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
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeForHtml(item)]));
  }
  return value;
}

let meds = null;
let medInfoDocListenerBound = false;

// Helper para mostrar modal de dosis
function showDosisModal(title, htmlContent) {
  const modal = document.getElementById('dosisModal');
  const modalTitle = document.getElementById('dosisModalTitle');
  const modalBody = document.getElementById('dosisModalBody');
  
  modalTitle.textContent = title;
  modalBody.innerHTML = htmlContent;
  modal.classList.add('active');
  
  // Setup close button (reset listeners each time)
  const closeBtn = modal.querySelector('.dosis-modal-close');
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  
  newCloseBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });
  
  // Close on backdrop click (single listener)
  modal.onclick = (e) => {
    if(e.target === modal) modal.classList.remove('active');
  };
  
  // Setup info buttons for each medicine
  setTimeout(() => {
    setupMedicineInfoButtons();
  }, 0);
}

// Helper para manejar popups de información de medicamentos
function setupMedicineInfoButtons() {
  const buttons = document.querySelectorAll('.med-info-btn');
  const closePopup = (popup, { restoreFocus = false } = {}) => {
    if (!popup) return;
    popup.classList.remove('active');
    popup.setAttribute('aria-hidden', 'true');
    const triggerId = popup.dataset.triggerId;
    const trigger = triggerId ? document.getElementById(triggerId) : null;
    trigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger?.focus();
  };

  buttons.forEach((btn, index) => {
    const popup = btn.closest('td')?.querySelector('.med-info-popup');
    if (!popup) return;
    const label = btn.closest('td')?.querySelector('strong')?.textContent?.trim() || 'medicamento';
    const buttonId = btn.id || `med-info-trigger-${index}`;
    const popupId = popup.id || `med-info-popup-${index}`;
    btn.id = buttonId;
    popup.id = popupId;
    btn.setAttribute('aria-label', `Ver detalles de ${label}`);
    btn.setAttribute('aria-expanded', String(popup.classList.contains('active')));
    btn.setAttribute('aria-controls', popupId);
    popup.setAttribute('role', 'region');
    popup.setAttribute('aria-label', `Detalles de ${label}`);
    popup.setAttribute('aria-hidden', String(!popup.classList.contains('active')));
    popup.dataset.triggerId = buttonId;
    popup.querySelector('.med-info-popup-close')?.setAttribute('aria-label', `Cerrar detalles de ${label}`);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !popup.classList.contains('active');
      
      // Cerrar otros popups abiertos
      document.querySelectorAll('.med-info-popup.active').forEach(p => {
        if(p !== popup) closePopup(p);
      });
      
      popup.classList.toggle('active', willOpen);
      popup.setAttribute('aria-hidden', String(!willOpen));
      btn.setAttribute('aria-expanded', String(willOpen));
    });
  });
  
  // Cerrar popup al hacer click en la X
  const closeButtons = document.querySelectorAll('.med-info-popup-close');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopup(btn.closest('.med-info-popup'), { restoreFocus: true });
    });
  });
  
  // Cerrar popup al hacer click fuera (solo una vez)
  if (!medInfoDocListenerBound) {
    document.addEventListener('click', (e) => {
      if(!e.target.closest('.med-info-btn') && !e.target.closest('.med-info-popup')) {
        document.querySelectorAll('.med-info-popup.active').forEach(p => {
          closePopup(p);
        });
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const popup = document.querySelector('.med-info-popup.active');
      if (popup) closePopup(popup, { restoreFocus: true });
    });
    medInfoDocListenerBound = true;
  }
}

export async function initUI(){
  // Mostrar disclaimer si no se ha aceptado antes
  showDisclaimerIfNeeded();
  // Los controles básicos deben estar operativos aunque la carga de datos tarde.
  setupDisclaimer();
  setupAccessibilityTraps();
  setupHeaderInputs();
  
  const loadedMeds = await loadMeds();
  meds = loadedMeds ? sanitizeForHtml(loadedMeds) : null;
  if (!meds) {
    console.warn('meds.json no se cargó. Mostrando placeholders.');
    const warn = document.getElementById('dataLoadWarning');
    if (warn) {
      warn.textContent = 'No se pudieron cargar los datos de medicamentos. No use las tablas farmacológicas hasta recuperar la conexión y recargar.';
      warn.classList.remove('hidden');
    }
  } else {
    const warn = document.getElementById('dataLoadWarning');
    if (warn) warn.classList.add('hidden');
  }
  // setupDosificacion(); // Desactivado temporalmente - requiere revisión de vías y presentaciones
  setupViaAerea();
  setupIntubacion();
  setupVentilacion();
  setupUrgencia();
  setupSignos();
  setupPerfusiones();
}

function showDisclaimerIfNeeded() {
  const accepted = localStorage.getItem('disclaimerAccepted');
  if (!accepted) {
    const modal = document.getElementById('disclaimerModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }
}

function setupDisclaimer() {
  const modal = document.getElementById('disclaimerModal');
  const acceptBtn = document.getElementById('acceptDisclaimerBtn');
  const showLink = document.getElementById('showDisclaimerLink');
  
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('disclaimerAccepted', 'true');
      modal.style.display = 'none';
    });
  }
  
  if (showLink) {
    showLink.addEventListener('click', (e) => {
      e.preventDefault();
      modal.style.display = 'flex';
    });
  }
}

function setupHeaderInputs(){
  const headerEdadInput = document.getElementById('headerEdadInput');
  const headerPesoInput = document.getElementById('headerPesoInput');
  const limpiarPacienteBtn = document.getElementById('limpiarPacienteBtn');
  const calcularHeroBtn = document.getElementById('calcularHeroBtn');
  const limpiarHeroBtn = document.getElementById('limpiarHeroBtn');
  const infoBtn = document.getElementById('infoBtn');
  const infoModal = document.getElementById('infoModal');
  const closeInfoModal = document.getElementById('closeInfoModal');
  const validationMessage = document.getElementById('patientValidationMessage');
  
  // Nuevo estimador
  const estimarPesoBtn = document.getElementById('estimarPesoBtn');
  const estimadorModal = document.getElementById('estimadorModal');
  const closeEstimadorModal = document.getElementById('closeEstimadorModal');
  const estimadorEdadInput = document.getElementById('estimadorEdadInput');
  const estimadorSlider = document.getElementById('estimadorSlider');
  const estimadorSliderValue = document.getElementById('estimadorSliderValue');
  const estimadorPesoResultado = document.getElementById('estimadorPesoResultado');
  const estimadorFormula = document.getElementById('estimadorFormula');
  const aplicarEstimacionBtn = document.getElementById('aplicarEstimacionBtn');
  const pesoOrigenBadge = document.getElementById('pesoOrigenBadge');
  
  if (!estimarPesoBtn) {
    console.error('ERROR: estimarPesoBtn no encontrado');
    return;
  }
  
  if (!estimadorModal) {
    console.error('ERROR: estimadorModal no encontrado');
    return;
  }

  // Helpers para disparar cálculo/limpieza según pestaña activa
  const calcMap = {
    viaaerea: 'calcularViaAerea',
    intubacion: 'calcularIntubacion',
    ventilacion: 'calcularVentilacion',
    urgencia: 'calcularUrgencia',
    perfusiones: 'calcularPerfusiones',
    // dosificacion: 'calcularDosis',
    signos: 'obtenerSignos'
  };

  const clearMap = {
    viaaerea: 'limpiarViaAerea',
    intubacion: 'limpiarIntubacion',
    ventilacion: 'limpiarVentilacion',
    urgencia: 'limpiarUrgencia',
    perfusiones: 'limpiarPerfusiones',
    // dosificacion: 'limpiarDosis',
    signos: null
  };

  function getActiveTab() {
    const activeBtn = document.querySelector('.tab-btn.active');
    return activeBtn ? activeBtn.getAttribute('data-tab') : null;
  }

  function triggerById(id){
    if(!id) return;
    const btn = document.getElementById(id);
    if(btn) btn.click();
  }

  function clearValidationMessage() {
    if (!validationMessage) return;
    validationMessage.textContent = '';
    validationMessage.classList.add('hidden');
  }

  function validateActiveCalculation(tab) {
    const edad = parseFloat(headerEdadInput.value);
    const peso = parseFloat(headerPesoInput.value);
    const requiresAge = ['viaaerea', 'intubacion', 'ventilacion', 'signos'].includes(tab);
    const requiresWeight = ['viaaerea', 'intubacion', 'ventilacion', 'urgencia', 'perfusiones'].includes(tab);
    const problems = [];

    if (requiresAge && !validAge(edad)) problems.push('una edad válida entre 0 y 18 años');
    if (requiresWeight && !validWeight(peso)) problems.push('un peso válido entre 0,1 y 300 kg');
    headerEdadInput.setAttribute('aria-invalid', String(requiresAge && !validAge(edad)));
    headerPesoInput.setAttribute('aria-invalid', String(requiresWeight && !validWeight(peso)));

    if (!problems.length) {
      clearValidationMessage();
      return true;
    }

    const message = `Para calcular ${tab === 'signos' ? 'signos vitales' : 'esta sección'}, introduzca ${problems.join(' y ')}.`;
    if (validationMessage) {
      validationMessage.textContent = message;
      validationMessage.classList.remove('hidden');
    }
    announce(message, 0);
    if (requiresAge && !validAge(edad)) headerEdadInput.focus();
    else if (requiresWeight && !validWeight(peso)) headerPesoInput.focus();
    return false;
  }

  function syncHeroActionState(tab = getActiveTab()) {
    if (calcularHeroBtn) {
      calcularHeroBtn.disabled = !calcMap[tab];
      calcularHeroBtn.title = calcMap[tab] ? 'Calcular pestaña activa' : 'Esta sección no necesita cálculo';
    }
    if (limpiarHeroBtn) {
      limpiarHeroBtn.disabled = !clearMap[tab];
      limpiarHeroBtn.title = clearMap[tab] ? 'Limpiar resultados de la pestaña activa' : 'No hay resultados que limpiar en esta sección';
    }
  }

  if (calcularHeroBtn) {
    calcularHeroBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      if (!validateActiveCalculation(tab)) return;
      triggerById(calcMap[tab]);
    });
  }

  if (limpiarHeroBtn) {
    limpiarHeroBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      triggerById(clearMap[tab]);
    });
  }

  if (limpiarPacienteBtn) {
    limpiarPacienteBtn.addEventListener('click', () => {
      clearPatientData();
      headerEdadInput.focus();
    });
  }

  document.addEventListener('tabChanged', (event) => syncHeroActionState(event.detail.tabName));
  syncHeroActionState();


  // Inputs de edad y peso
  function syncPatientAgeFromHeader() {
    const edad = parseFloat(headerEdadInput.value);
    const peso = parseFloat(headerPesoInput.value);
    headerEdadInput.setAttribute('aria-invalid', String(headerEdadInput.value !== '' && !validAge(edad)));
    clearValidationMessage();
    setPatientData(
      validAge(edad) ? edad : null,
      validWeight(peso) ? peso : null,
      { updateHeader: false }
    );
  }

  function syncPatientWeightFromHeader() {
    const edad = parseFloat(headerEdadInput.value);
    const peso = parseFloat(headerPesoInput.value);
    headerPesoInput.setAttribute('aria-invalid', String(headerPesoInput.value !== '' && !validWeight(peso)));
    clearValidationMessage();
    setPatientData(
      validAge(edad) ? edad : null,
      validWeight(peso) ? peso : null,
      { updateHeader: false, pesoOrigen: validWeight(peso) ? 'medido' : null }
    );
  }

  function renderWeightSource() {
    if (!pesoOrigenBadge) return;
    const source = getWeightSource();
    if (!source) {
      pesoOrigenBadge.textContent = '';
      pesoOrigenBadge.classList.add('hidden');
      return;
    }
    pesoOrigenBadge.textContent = source === 'estimado'
      ? 'Peso estimado: confirmar con peso medido o método por longitud'
      : 'Peso introducido manualmente';
    pesoOrigenBadge.classList.toggle('is-estimated', source === 'estimado');
    pesoOrigenBadge.classList.remove('hidden');
  }

  headerEdadInput.addEventListener('input', syncPatientAgeFromHeader);
  headerPesoInput.addEventListener('input', syncPatientWeightFromHeader);
  document.addEventListener('patientDataChanged', renderWeightSource);
  renderWeightSource();

  // Función para actualizar el estimador
  function actualizarEstimador() {
    const edad = parseFloat(estimadorSlider.value);
    const estimadorSliderUnit = document.getElementById('estimadorSliderUnit');
    
    if (edad < 1) {
      const meses = Math.round(edad * 12);
      estimadorSliderValue.textContent = meses;
      if (estimadorSliderUnit) estimadorSliderUnit.textContent = 'meses';
      estimadorEdadInput.value = edad.toFixed(2);
    } else {
      estimadorSliderValue.textContent = edad.toFixed(1);
      if (estimadorSliderUnit) estimadorSliderUnit.textContent = 'años';
      estimadorEdadInput.value = edad.toFixed(1);
    }
    
    const res = calcularPesoEstimado(edad);
    estimadorPesoResultado.textContent = res.peso;
    estimadorFormula.textContent = res.formula;
  }

  // Abrir modal del estimador
  estimarPesoBtn.addEventListener('click', () => {
    // Si ya hay edad, actualizar estimador con esa edad
    const edadActual = parseFloat(headerEdadInput.value);
    if(validAge(edadActual)) {
      estimadorSlider.value = edadActual;
    } else {
      // Sugerir edad 5 años como default
      estimadorSlider.value = 5;
    }
    estimadorModal.classList.remove('hidden');
    actualizarEstimador();
    // Foco automático para accesibilidad
    setTimeout(() => estimadorEdadInput.focus(), 100);
  });

  // Cerrar modal del estimador
  closeEstimadorModal.addEventListener('click', () => {
    estimadorModal.classList.add('hidden');
  });

  estimadorModal.addEventListener('click', (e) => {
    if(e.target === estimadorModal) {
      estimadorModal.classList.add('hidden');
    }
  });

  // Slider del estimador - actualizar en tiempo real
  estimadorSlider.addEventListener('input', actualizarEstimador);

  // Input manual del estimador
  estimadorEdadInput.addEventListener('change', () => {
    const edad = parseFloat(estimadorEdadInput.value);
    if(validAge(edad)) {
      estimadorSlider.value = edad;
      actualizarEstimador();
    }
  });

  // Aplicar estimación al paciente
  aplicarEstimacionBtn.addEventListener('click', () => {
    const edad = parseFloat(estimadorSlider.value);
    const peso = parseFloat(estimadorPesoResultado.textContent);
    
    if(validAge(edad) && validWeight(peso)) {
      headerEdadInput.value = edad;
      headerPesoInput.value = peso;
      setPatientData(edad, peso, { pesoOrigen: 'estimado' });
      
      estimadorModal.classList.add('hidden');
      
      // Feedback visual
      aplicarEstimacionBtn.innerHTML = '<i class="fas fa-check"></i> ¡Aplicado!';
      setTimeout(() => {
        aplicarEstimacionBtn.innerHTML = '<i class="fas fa-check"></i> Aplicar a Paciente';
      }, 1500);
    }
  });

  // Botón de información - Mostrar fórmulas
  infoBtn.addEventListener('click', () => {
    infoModal.classList.remove('hidden');
    // Foco automático al input de edad para accesibilidad
    setTimeout(() => {
      const edadInput = document.getElementById('edadModalInput');
      if(edadInput) edadInput.focus();
    }, 100);
  });

  closeInfoModal.addEventListener('click', () => {
    infoModal.classList.add('hidden');
  });

  infoModal.addEventListener('click', (e) => {
    if(e.target === infoModal) {
      infoModal.classList.add('hidden');
    }
  });
}

function setupPesoModal(){
  const modal = document.getElementById('formulasModal');
  const closeBtn = document.getElementById('closeFormulasModal');
  const edadInput = document.getElementById('edadModalInput');
  const edadSlider = document.getElementById('edadSlider');
  const calcBtn = document.getElementById('calcularPesoModal');
  const guardarBtn = document.getElementById('guardarPesoBtn');
  const limpiarBtn = document.getElementById('limpiarPesoModal');
  const resultBox = document.getElementById('resultadoPesoModal');
  const pesoRes = document.getElementById('pesoResultadoModal');
  const detalleRes = document.getElementById('detalleResultadoModal');
  const formulaText = document.getElementById('formulaText');
  const formulaCard = document.getElementById('formulaCard');

  // Funciones para obtener fórmulas
  const formulas = {
    '0-1': { range: '0 a 12 meses', text: 'Peso = 3.5 + (edad en meses × 0.5)' },
    '1-3': { range: '1 a 3 años', text: 'Peso = (edad en años × 2) + 9' },
    '3-6': { range: '3 a 6 años', text: 'Peso = (edad en años × 2) + 8' },
    '6-12': { range: '6 a 12 años', text: 'Peso = (edad en años × 3) + 7' },
    '12+': { range: 'Mayor de 12 años', text: 'Peso = (edad en años × 3.5) + 10' }
  };

  function getFormulaForAge(edad) {
    if(edad < 1) return formulas['0-1'];
    if(edad < 3) return formulas['1-3'];
    if(edad < 6) return formulas['3-6'];
    if(edad < 12) return formulas['6-12'];
    return formulas['12+'];
  }

  function updateFormulaDisplay(edad) {
    if(!validAge(edad)) {
      formulaText.textContent = '';
      formulaCard.querySelector('.formula-range').textContent = 'Selecciona una edad';
      return;
    }
    const formula = getFormulaForAge(edad);
    formulaCard.querySelector('.formula-range').textContent = formula.range;
    formulaText.textContent = formula.text;
  }

  // Sincronizar input y slider
  edadInput.addEventListener('input', () => {
    const edad = parseFloat(edadInput.value);
    if(validAge(edad)) {
      edadSlider.value = edad;
      updateFormulaDisplay(edad);
      // Auto-calcular mientras escribe
      const res = calcularPesoEstimado(edad);
      pesoRes.textContent = res.peso;
      detalleRes.innerHTML = `<strong>Cálculo realizado:</strong> ${res.formula} <br><strong>Resultado:</strong> ${res.peso} kg`;
      show(resultBox);
      show(guardarBtn);
    }
  });

  edadSlider.addEventListener('input', () => {
    edadInput.value = edadSlider.value;
    updateFormulaDisplay(parseFloat(edadSlider.value));
    // Auto-calcular al mover slider
    const res = calcularPesoEstimado(parseFloat(edadSlider.value));
    pesoRes.textContent = res.peso;
    detalleRes.innerHTML = `<strong>Cálculo realizado:</strong> ${res.formula} <br><strong>Resultado:</strong> ${res.peso} kg`;
    show(resultBox);
    show(guardarBtn);
  });

  // Modal handlers
  closeBtn.addEventListener('click', () => hide(modal));
  modal.addEventListener('click', (e) => {
    if(e.target === modal) hide(modal);
  });

  // Calcular peso (botón, ya no es necesario pero lo dejamos para compatibilidad)
  calcBtn.addEventListener('click', () => {
    const edad = parseFloat(edadInput.value);
    if(!validAge(edad)){
      alert('Por favor, ingrese una edad válida (0-18 años)'); 
      return; 
    }
    const res = calcularPesoEstimado(edad);
    pesoRes.textContent = res.peso;
    detalleRes.innerHTML = `<strong>Cálculo realizado:</strong> ${res.formula} <br><strong>Resultado:</strong> ${res.peso} kg`;
    show(resultBox);
    show(guardarBtn);
  });

  // Guardar peso en header
  guardarBtn.addEventListener('click', () => {
    const edad = parseFloat(edadInput.value);
    const pesoText = pesoRes.textContent;
    if(validAge(edad) && pesoText !== '-') {
      setHeaderValues(edad, parseFloat(pesoText), { pesoOrigen: 'estimado' });
      // No cerramos el modal, permitimos calcular más valores
      calcBtn.textContent = '✓ Guardado en el perfil';
      setTimeout(() => {
        calcBtn.innerHTML = '<i class="fas fa-calculator"></i> Calcular Peso';
      }, 2000);
    }
  });

  // Limpiar
  limpiarBtn.addEventListener('click', () => { 
    edadInput.value = ''; 
    edadSlider.value = '0';
    updateFormulaDisplay('');
    hide(resultBox);
    hide(guardarBtn);
  });

  edadInput.addEventListener('keypress', (e) => { 
    if(e.key === 'Enter') calcBtn.click(); 
  });
}

function setupDosificacion(){
  const calcBtn = document.getElementById('calcularDosis');
  const clearBtn = document.getElementById('limpiarDosis');
  const box = document.getElementById('resultadoDosis');

  const ds = meds?.dosificacion || null;

  // Función para ejecutar el cálculo
  function doCalculate() {
    const { peso } = getPatientData();
    
    if(!validWeight(peso) || !ds){
      hide(box);
      return; 
    }

    // Agrupar medicamentos por grupo
    const grupos = {};
    for(const key of Object.keys(ds)){
      const med = ds[key];
      const grp = med.grupo || 'OTROS';
      if(!grupos[grp]) grupos[grp] = [];
      grupos[grp].push({ key, ...med });
    }

    // Generar HTML por grupos
    let html = '';
    for(const [grupo, medicamentos] of Object.entries(grupos)){
      html += `<h3>${grupo}</h3>`;
      html += `<table class="medicines-table medicines-table-dosificacion">
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Dosis</th>
            <th>Máximo</th>
            <th>Intervalo</th>
            <th>Presentación</th>
            <th>Dilución</th>
          </tr>
        </thead>
        <tbody>`;
      
      for(const med of medicamentos){
        const dosis = (peso * med.dosis).toFixed(2);
        const maximo = (peso * med.maximo).toFixed(2);
        const presentacionText = med.presentacion || 'Revisar presentación';
        const dilucionText = med.dilucion || 'Revisar dilución';
        
        html += `<tr class="med-row" data-med-key="${med.key}">
          <td>
            <div class="med-name">
              <strong>${med.nombre}</strong>
              <button class="med-info-btn" title="Ver detalles">
                <i class="fas fa-info-circle"></i>
              </button>
              <div class="med-info-popup">
                <button class="med-info-popup-close"><i class="fas fa-times"></i></button>
                <div class="med-info-title">${med.nombre}</div>
                <div class="med-info-row">
                  <div class="med-info-label">Dosis:</div>
                  <div class="med-info-value">${dosis} ${med.unidad}</div>
                </div>
                <div class="med-info-row">
                  <div class="med-info-label">Máximo:</div>
                  <div class="med-info-value">${maximo} ${med.unidad}/${med.maxunidad || ''}</div>
                </div>
                <div class="med-info-row">
                  <div class="med-info-label">Intervalo:</div>
                  <div class="med-info-value">${med.intervalo || '-'}</div>
                </div>
                <div class="med-info-row">
                  <div class="med-info-label">Presentación:</div>
                  <div class="med-info-value">${presentacionText}</div>
                </div>
                <div class="med-info-row">
                  <div class="med-info-label">Dilución:</div>
                  <div class="med-info-value">${dilucionText}</div>
                </div>
                <div class="med-info-row">
                  <div class="med-info-label">Vía:</div>
                  <div class="med-info-value">${med.via || '-'}</div>
                </div>
              </div>
            </div>
          </td>
          <td class="dosis-col">${dosis} ${med.unidad}</td>
          <td>${maximo} ${med.unidad}/${med.maxunidad || ''}</td>
          <td>${med.intervalo || '-'}</td>
          <td>${presentacionText}</td>
          <td>${dilucionText}</td>
        </tr>`;
      }
      
      html += `</tbody></table>`;
    }

    box.innerHTML = html;
    setupMedicineInfoButtons();
    show(box);
  }

  calcBtn.addEventListener('click', doCalculate);
  
  // Auto-calculate cuando cambias de tab
  document.addEventListener('tabChanged', (e) => {
    if(e.detail.tabName === 'dosificacion') {
      doCalculate();
    }
  });
  
  // Auto-calculate al cambiar peso del paciente
  document.addEventListener('patientDataChanged', () => {
    doCalculate();
  });

  clearBtn.addEventListener('click', () => { hide(box); });
}

function setupViaAerea(){
  const calcBtn = document.getElementById('calcularViaAerea');
  const clearBtn = document.getElementById('limpiarViaAerea');
  const resultadoDiv = document.getElementById('resultadoViaAerea');
  
  // Función para calcular parámetros de vía aérea usando MATRIZ 1 o MATRIZ 2
  function calculateAirway(edad, peso) {
    const tubo = calcularTuboTraquealERC2025(edad, peso);
    const ettSize = `#${tubo.sizeMm} mm (${tubo.cuffLabel}) · ${tubo.source}`;
    const ettDepth = `${tubo.depthCm} cm inicial · ${tubo.depthSource} · confirmar con ETCO₂ y radiografía`;
    const matrizMaterial = peso <= 3.1
      ? obtenerParametrosDeMATRIZ1(peso)
      : obtenerParametrosDeMATRIZ2(edad);
    const sondaAspiracion = `${matrizMaterial.sondaAspiracion} Fr`;
    
    // Laryngoscope blade (basado en edad)
    let laryngoBlade = '2 recta o curva';
    if (edad < 1) laryngoBlade = '0-1 recta';
    else if (edad < 2) laryngoBlade = '1 recta';
    else if (edad < 5) laryngoBlade = '2 recta o curva';
    else if (edad < 12) laryngoBlade = '2-3 curva';
    else laryngoBlade = '3-4 curva';
    
    const lmaSize = calcularTamanioLMA(peso);
    
    // Desfibrilación ERC 2025: 4 J/kg; considerar hasta 8 J/kg tras >5 choques.
    const energies = calcularEnergiasERC2025(peso);
    const defibInitial = energies.defibInitialJ.toFixed(0);
    const defibRefractory = energies.defibRefractoryJ.toFixed(0);
    const defibDose = `${defibInitial} J inicial (4 J/kg; límite adulto 120-200 J) · refractaria: hasta ${defibRefractory} J`;
    
    // Cardioversión sincronizada ERC 2025: 1 J/kg, duplicar hasta 4 J/kg.
    const [cardio1, cardio2, cardio3] = energies.cardioversionJ.map((value) => value.toFixed(0));
    const cardioversionDose = `${cardio1} J → ${cardio2} J → ${cardio3} J`;
    
    // Sonda vesical y tubo de tórax (de MATRIZ 2, no aplica para MATRIZ 1)
    let sondaVesical, tuboTorax;
    if (peso > 3.1) {
      const matriz2 = obtenerParametrosDeMATRIZ2(edad);
      sondaVesical = `${matriz2.sondaVesical} Fr`;
      tuboTorax = `${matriz2.tuboTorax} Fr`;
    } else {
      // Para neonatos muy pequeños, usar valores estándar básicos
      sondaVesical = '6 Fr';
      tuboTorax = '10 Fr';
    }
    
    return {
      ettSize,
      ettDepth,
      laryngoBlade,
      lmaSize: `Tamaño ${lmaSize} (LMA™; confirmar tabla del dispositivo)`,
      defibDose,
      cardioversionDose,
      sondaVesical,
      sondaAspiracion,
      tuboTorax
    };
  }
  
  // Función para ejecutar el cálculo
  function doCalculate() {
    const { peso, edad } = getPatientData();
    if(!validWeight(peso)){
      hide(resultadoDiv);
      return; 
    }
    
    // Calcular parámetros de vía aérea
    if (validAge(edad)) {
      const airway = calculateAirway(edad, peso);
      document.getElementById('ettSize').textContent = airway.ettSize;
      document.getElementById('ettDepth').textContent = airway.ettDepth;
      document.getElementById('laryngoBlade').textContent = airway.laryngoBlade;
      document.getElementById('lmaSize').textContent = airway.lmaSize;
      document.getElementById('defibDose').textContent = airway.defibDose;
      document.getElementById('cardioversionDose').textContent = airway.cardioversionDose;
      document.getElementById('sondaVesical').textContent = airway.sondaVesical;
      document.getElementById('sondaAspiracion').textContent = airway.sondaAspiracion;
      document.getElementById('tuboTorax').textContent = airway.tuboTorax;
      show(resultadoDiv);
    }
  }
  
  calcBtn.addEventListener('click', doCalculate);
  
  // Auto-calculate cuando cambias de tab
  document.addEventListener('tabChanged', (e) => {
    if(e.detail.tabName === 'viaaerea') {
      doCalculate();
    }
  });
  
  // Auto-calculate al cambiar peso
  document.addEventListener('patientDataChanged', () => {
    doCalculate();
  });
  
  clearBtn.addEventListener('click', () => {
    hide(resultadoDiv);
  });
}

function setupIntubacion(){
  const calcBtn = document.getElementById('calcularIntubacion');
  const clearBtn = document.getElementById('limpiarIntubacion');
  const resultadoDiv = document.getElementById('resultadoIntubacion');
  
  // Función para ejecutar el cálculo
  function doCalculate() {
    const { peso, edad } = getPatientData();
    if(!validWeight(peso) || !validAge(edad) || !meds?.intubacion){
      hide(resultadoDiv);
      return; 
    }
    
    let tableHTML = `
      <table class="medicines-table medicines-table-intubacion">
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Dosis</th>
            <th>Volumen (mL)</th>
            <th>Presentación</th>
            <th>Dilución</th>
          </tr>
        </thead>
        <tbody>`;
    
    const ds = meds?.intubacion ?? null;
    for(const key of Object.keys(intubacionFormulas)){
      const calc = intubacionFormulas[key];
      const dosis_valor = calc(peso, edad);
      const dosis = formatDosis(dosis_valor);
      const meta = ds ? ds[key] : { nombre: key, unidad: '', presentacion: '', dilucion: '' };
      const dosisPorKg = intubacionDosisPorKg[key] || '';
      const dosisDisplay = dosisPorKg ? `${dosis} ${meta.unidad || ''} <small>(${dosisPorKg})</small>` : `${dosis} ${meta.unidad || ''}`;
      if (!meta) {
        console.warn('Intubación: no hay metadata para', key);
      }
      const presentacionText = meta.presentacion && meta.presentacion.trim() !== '' ? meta.presentacion : 'Revisar presentación';
      const dilucionText = meta.dilucion && meta.dilucion.trim() !== '' ? meta.dilucion : 'Revisar dilución';
      
      // Calcular volumen en mL basado en dosis y concentración
      let volumeML = '-';
      let volumeMLHtml = '-';
      let concentracionDisplay = '';
      let presentacionDisplay = presentacionText;
      let presentacionDisplayHtml = presentacionText;
      
      // Check si hay múltiples concentraciones
      if (meta.concentraciones && Array.isArray(meta.concentraciones)) {
        // Display all concentrations in separate lines
        let volumesArray = [];
        let presentacionesArray = [];
        for (const concObj of meta.concentraciones) {
          const vol = (dosis_valor / concObj.conc_mg_ml).toFixed(2);
          volumesArray.push(`${vol} mL (${concObj.desc})`);
          presentacionesArray.push(concObj.desc);
        }
        volumeML = volumesArray.join('\n');
        volumeMLHtml = volumesArray.map(v => `<div>${v}</div>`).join('');
        presentacionDisplay = presentacionesArray.join('\n');
        presentacionDisplayHtml = presentacionesArray.map(p => `<div>${p}</div>`).join('');
        concentracionDisplay = 'Múltiples opciones disponibles';
      } else {
        // Single concentration
        let concentracion = meta.concentracion_mg_ml || meta.concentracion_mcg_ml;
        if (concentracion && dosis_valor > 0) {
          volumeML = (dosis_valor / concentracion).toFixed(2);
          volumeMLHtml = volumeML;
          concentracionDisplay = `${concentracion} ${meta.unidad || ''}/mL`;
        }
        presentacionDisplayHtml = presentacionText;
      }
      
      tableHTML += `
        <tr class="med-row" data-med-key="${key}">
          <td>
            <div class="med-name">
              <strong>${meta.nombre || key}</strong>
              <button class="med-info-btn" title="Ver detalles">
                <i class="fas fa-info-circle"></i>
              </button>
              <div class="med-info-popup">
                <button class="med-info-popup-close"><i class="fas fa-times"></i></button>
                <div class="med-info-title">${meta.nombre || key}</div>
                <div class="med-info-row">
                  <div class="med-info-label">Dosis (${meta.unidad}):</div>
                  <div class="med-info-value">${dosis}</div>
                </div>
                <div class="med-info-row">
                  <div class="med-info-label">Volumen (mL):</div>
                  <div class="med-info-value">${volumeMLHtml}</div>
                </div>
                ${concentracionDisplay ? `<div class="med-info-row">
                  <div class="med-info-label">Concentración:</div>
                  <div class="med-info-value">${concentracionDisplay}</div>
                </div>` : ''}
                <div class="med-info-row">
                  <div class="med-info-label">Presentación:</div>
                  <div class="med-info-value">${presentacionDisplayHtml}</div>
                </div>
                <div class="med-info-row">
                  <div class="med-info-label">Dilución:</div>
                  <div class="med-info-value">${dilucionText}</div>
                </div>
                ${meta.nota ? `<div class="med-info-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                  <div class="med-info-label">Nota:</div>
                  <div class="med-info-value" style="font-size: 0.9em; color: #666;">${meta.nota}</div>
                </div>` : ''}
              </div>
            </div>
          </td>
          <td class="dosis-col">${dosisDisplay}</td>
          <td class="dosis-col" style="font-weight: 600; color: #2196F3;">${volumeMLHtml}</td>
          <td>${presentacionDisplayHtml}</td>
          <td>${dilucionText}</td>
        </tr>`;
    }
    
    tableHTML += `
        </tbody>
      </table>`;
    
    resultadoDiv.innerHTML = tableHTML;
    setupMedicineInfoButtons();
    show(resultadoDiv);
  }
  
  calcBtn.addEventListener('click', doCalculate);
  
  // Auto-calculate cuando cambias de tab
  document.addEventListener('tabChanged', (e) => {
    if(e.detail.tabName === 'intubacion') {
      doCalculate();
    }
  });
  
  // Auto-calculate al cambiar peso
  document.addEventListener('patientDataChanged', () => {
    doCalculate();
  });
  
  clearBtn.addEventListener('click', () => {
    hide(resultadoDiv);
  });
}

function setupVentilacion(){
  const calcBtn = document.getElementById('calcularVentilacion');
  const clearBtn = document.getElementById('limpiarVentilacion');
  const resultadoDiv = document.getElementById('resultadoVentilacion');
  const warningDiv = document.getElementById('ventilacionWarning');
  const modeSelect = document.getElementById('ventModeSelect');

  function doCalculate() {
    const { peso, edad } = getPatientData();
    if(!validWeight(peso)) {
      hide(resultadoDiv);
      hide(warningDiv);
      return;
    }

    if(!validAge(edad)) {
      hide(resultadoDiv);
      show(warningDiv);
      return;
    }

    hide(warningDiv);
    const modo = modeSelect ? modeSelect.value : 'VC';
    const vent = calcularVentilacionInicialERC2025(edad, peso, modo);

    document.getElementById('ventModeParams').textContent = vent.ventModeParams;
    document.getElementById('ventVt').textContent = vent.ventVt;
    document.getElementById('ventFr').textContent = vent.ventFr;
    document.getElementById('ventPeep').textContent = vent.ventPeep;
    document.getElementById('ventFiO2').textContent = vent.ventFiO2;
    document.getElementById('ventIe').textContent = vent.ventIe;
    document.getElementById('ventPip').textContent = vent.ventPip;
    document.getElementById('ventPs').textContent = vent.ventPs;
    document.getElementById('ventPplat').textContent = vent.ventPplat;
    document.getElementById('ventDriving').textContent = vent.ventDriving;
    document.getElementById('ventFlow').textContent = vent.ventFlow;
    document.getElementById('ventTrigger').textContent = vent.ventTrigger;
    document.getElementById('ventAlarmVm').textContent = vent.ventAlarmVm;
    document.getElementById('ventApnea').textContent = vent.ventApnea;
    show(resultadoDiv);
  }

  calcBtn.addEventListener('click', doCalculate);

  document.addEventListener('tabChanged', (e) => {
    if(e.detail.tabName === 'ventilacion') {
      doCalculate();
    }
  });

  document.addEventListener('patientDataChanged', () => {
    doCalculate();
  });

  if (modeSelect) {
    modeSelect.addEventListener('change', () => {
      doCalculate();
    });
  }

  clearBtn.addEventListener('click', () => {
    hide(resultadoDiv);
    hide(warningDiv);
  });
}

function setupSignos(){
  const obtenerSignosBtn = document.getElementById('obtenerSignos');
  const resultadoSignosDiv = document.getElementById('resultadoSignos');
  const fcElement = document.getElementById('fc');
  const frElement = document.getElementById('fr');
  const pasElement = document.getElementById('pas');
  const padElement = document.getElementById('pad');
  const ageReferenceNote = document.getElementById('signosAgeReference');

  function obtenerReferenciasSignosVitales(edad) {
    const erc = obtenerSignosVitalesERC2025(edad);
    return {
      fc: `${erc.hrLow}-${erc.hrHigh} lpm`,
      fr: `${erc.rrLow}-${erc.rrHigh} rpm`,
      pas: `${erc.sbpP5} / ${erc.sbpP10} / ${erc.sbpP50} mmHg`,
      pad: 'No especificada en la tabla ERC 2025',
      pam: `${erc.mapP5} / ${erc.mapP10} / ${erc.mapP50} mmHg`,
      spo2: 'ERC 2025: 94-98% si previamente sano; individualizar según patología',
      temperatura: 'Objetivo local orientativo: 36.5-37.5 °C',
      glucemia: 'ERC 2025: tratar <70 mg/dL con síntomas o <54 mg/dL sin síntomas',
      diuresis: `Objetivo local orientativo: ${edad < 2 ? '>2 mL/kg/h' : edad < 12 ? '>1 mL/kg/h' : '>0.5 mL/kg/h'}`,
      relleno: 'Orientativo: <2 segundos; interpretar en contexto',
      glasgow: edad < 2 ? 'Orientativo: 15 (escala pediátrica modificada)' : 'Orientativo: 15'
    };
  }

  function renderSignos({ announceResult = false } = {}) {
    const { edad } = getPatientData();
    if (!validAge(edad)) return false;
    const signos = obtenerReferenciasSignosVitales(edad);
    const usesOneMonthReference = edad < (1 / 12);
    ageReferenceNote.textContent = usesOneMonthReference
      ? 'Menor de 1 mes: ERC 2025 no publica una fila neonatal en la tabla 2. Se muestran como referencia los valores de 1 mes; interpretar según edad gestacional, transición neonatal y protocolo local.'
      : '';
    ageReferenceNote.classList.toggle('hidden', !usesOneMonthReference);
    fcElement.textContent = signos.fc;
    frElement.textContent = signos.fr;
    pasElement.textContent = signos.pas;
    padElement.textContent = signos.pad;
    document.getElementById('pam').textContent = signos.pam;
    document.getElementById('spo2').textContent = signos.spo2;
    document.getElementById('temperatura').textContent = signos.temperatura;
    document.getElementById('glucemia').textContent = signos.glucemia;
    document.getElementById('diuresis').textContent = signos.diuresis;
    document.getElementById('relleno').textContent = signos.relleno;
    document.getElementById('glasgow').textContent = signos.glasgow;
    show(resultadoSignosDiv);
    if (announceResult) {
      announce(`Signos vitales ERC 2025 para ${edad} años: FC ${signos.fc}, FR ${signos.fr}, PAS ${signos.pas}`);
    }
    return true;
  }

  obtenerSignosBtn.addEventListener('click', () => {
    if (!renderSignos({ announceResult: true })) {
      alert('Por favor, ingrese una edad válida (0-18 años)');
    }
  });
  
  // Auto-calculate cuando cambias de tab
  document.addEventListener('tabChanged', (e) => {
    if(e.detail.tabName === 'signos') {
      renderSignos();
    }
  });
  
  // Auto-calculate al cambiar peso/edad del paciente
  document.addEventListener('patientDataChanged', () => {
    if (!renderSignos()) {
      hide(resultadoSignosDiv);
    }
  });
}

function setupPerfusiones(){
  const calcBtn = document.getElementById('calcularPerfusiones');
  const clearBtn = document.getElementById('limpiarPerfusiones');
  const resultadoDiv = document.getElementById('resultadoPerfusiones');
  const groups = [
    { dataGroup: 'inotr\u00f3picos', tableBody: document.getElementById('perfusionesInoTableBody') },
    { dataGroup: 'sedoanalgesia', tableBody: document.getElementById('perfusionesSedoTableBody') },
    { dataGroup: 'insulina', tableBody: document.getElementById('perfusionesMetabolicasTableBody') },
  ];

  function renderGroup(group, peso) {
    group.tableBody.innerHTML = '';
    const groupMeds = meds?.perfusiones?.[group.dataGroup] || {};

    for (const [medKey, med] of Object.entries(groupMeds)) {
      const drugKey = PERFUSION_KEY_MAP[medKey];
      const drugConfig = DRUGS.find((drug) => drug.key === drugKey);
      if (!drugKey || !drugConfig) {
        console.warn('Perfusion sin configuracion central:', medKey);
        continue;
      }

      try {
        const result = compute(DRUGS, { drugKey, weightKg: peso });
        const display = formatPerfusionForDisplay(drugConfig, result, peso);
        const row = [
          '<tr class="med-row" data-med-key="', medKey, '">',
          '<td><strong>', result.displayName, '</strong></td>',
          '<td class="dosis-col">', display.rangeText, '</td>',
          '<td class="dosis-col">', display.absoluteHourlyText, '</td>',
          '<td>', display.rateText, '</td>',
          '<td>', display.presentationText, '</td>',
          '<td>', display.preparationText, '<br><small><strong>Equivalencia:</strong> ', display.equivalenceText, '</small>',
          display.rateWarningText ? '<br><small class="perfusion-warning"><strong>Ritmo:</strong> ' + display.rateWarningText + '</small>' : '',
          med.nota ? '<br><small class="perfusion-warning"><strong>Seguridad:</strong> ' + med.nota + '</small>' : '',
          '</td>',
          '</tr>',
        ].join('');
        group.tableBody.insertAdjacentHTML('beforeend', row);
      } catch (error) {
        console.warn('Error calculando ' + drugKey + ':', error.message);
      }
    }
  }

  function doCalculate() {
    const { peso } = getPatientData();
    if (!validWeight(peso) || !meds?.perfusiones) {
      hide(resultadoDiv);
      return;
    }

    groups.forEach((group) => renderGroup(group, peso));
    show(resultadoDiv);
  }

  calcBtn.addEventListener('click', doCalculate);
  document.addEventListener('tabChanged', (event) => {
    if (event.detail.tabName === 'perfusiones') doCalculate();
  });
  document.addEventListener('patientDataChanged', doCalculate);
  clearBtn.addEventListener('click', () => hide(resultadoDiv));
}
function setupUrgencia(){
  const calcBtn = document.getElementById('calcularUrgencia');
  const clearBtn = document.getElementById('limpiarUrgencia');
  const resultadoDiv = document.getElementById('resultadoUrgencia');
  
  // Función para ejecutar el cálculo
  function doCalculate() {
    const { peso } = getPatientData();
    if(!validWeight(peso) || !meds?.urgencia){
      hide(resultadoDiv);
      return; 
    }
    
    let tableHTML = `
      <table class="medicines-table medicines-table-urgencia">
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Dosis</th>
            <th>Volumen</th>
            <th>Presentación</th>
            <th>Dilución</th>
          </tr>
        </thead>
        <tbody>`;
    
    const ds = meds?.urgencia ?? null;
    for(const key of Object.keys(urgenciaFormulas)){
      const calc = urgenciaFormulas[key];
      const dosis_valor = calc(peso);
      const dosis = formatDosis(dosis_valor);
      const meta = ds ? ds[key] : { nombre: key, unidad: '', presentacion: '', dilucion: '', nota: '' };
      const dosisPorKg = urgenciaDosisPorKg[key] || '';
      const dosisDisplay = dosisPorKg ? `${dosis} ${meta.unidad || ''} <small>(${dosisPorKg})</small>` : `${dosis} ${meta.unidad || ''}`;
      if (!meta) {
        console.warn('Urgencia: no hay metadata para', key);
      }
      const presentacionText = meta.presentacion && meta.presentacion.trim() !== '' ? meta.presentacion : 'Revisar presentación';
      const dilucionText = meta.dilucion && meta.dilucion.trim() !== '' ? meta.dilucion : 'Revisar dilución';
      
      // Calcular volumen
      let volumeML = '-';
      let volumeMLHtml = '-';
      let volumeIncludesUnit = false;
      if (meta.es_volumen_puro) {
        const volume = calculatePureVolume(meta, dosis_valor);
        volumeML = formatDosis(volume.finalVolumeMl);
        if (volume.diluentVolumeMl > 0) {
          volumeMLHtml = `<strong>${formatDosis(volume.finalVolumeMl)} mL final</strong><br><small>${formatDosis(volume.drugVolumeMl)} mL de fármaco + ${formatDosis(volume.diluentVolumeMl)} mL de diluyente</small>`;
          volumeIncludesUnit = true;
        } else {
          volumeMLHtml = formatDosis(volume.finalVolumeMl);
        }
      } else if (meta.concentraciones && Array.isArray(meta.concentraciones)) {
        // Múltiples concentraciones (como manitol 10% y 20%)
        let volumesArray = [];
        for (const concObj of meta.concentraciones) {
          // Buscar la unidad correcta (conc_g_ml, conc_mg_ml, etc)
          let concValue = concObj.conc_g_ml || concObj.conc_mg_ml || concObj.conc_mEq_ml || concObj.conc_mcg_ml;
          const vol = (dosis_valor / concValue).toFixed(2);
          volumesArray.push(`${vol} mL (${concObj.desc})`);
        }
        volumeML = volumesArray.join('\n');
        volumeMLHtml = volumesArray.map(v => `<div>${v}</div>`).join('');
        volumeIncludesUnit = true;
      } else {
        // Buscar cualquier tipo de concentración (mg_ml, mEq_ml, g_ml, etc)
        let concentracion = meta.concentracion_mg_ml || 
                           meta.concentracion_mEq_ml || 
                           meta.concentracion_g_ml ||
                           meta.concentracion_mcg_ml;
        if (concentracion && dosis_valor > 0) {
          const vol = (dosis_valor / concentracion).toFixed(2);
          volumeML = vol;
          volumeMLHtml = vol;
        }
      }
      
      tableHTML += `
        <tr class="med-row" data-med-key="${key}">
          <td>
            <div class="med-name">
              <strong>${meta.nombre || key}</strong>
              <button class="med-info-btn" title="Ver detalles">
                <i class="fas fa-info-circle"></i>
              </button>
              <div class="med-info-popup">
                <button class="med-info-popup-close"><i class="fas fa-times"></i></button>
                <div class="med-info-title">${meta.nombre || key}</div>
                <div class="med-info-row">
                  <div class="med-info-label">Dosis:</div>
                  <div class="med-info-value">${dosis} ${meta.unidad || ''}</div>
                </div>
                ${volumeML !== '-' ? `<div class="med-info-row">
                  <div class="med-info-label">Volumen:</div>
                  <div class="med-info-value">${volumeMLHtml}${volumeIncludesUnit ? '' : ' mL'}</div>
                </div>` : ''}
                <div class="med-info-row">
                  <div class="med-info-label">Presentación:</div>
                  <div class="med-info-value">${presentacionText}</div>
                </div>
                <div class="med-info-row">
                  <div class="med-info-label">Dilución:</div>
                  <div class="med-info-value"><strong>${dilucionText}</strong><br><small>${meta.nota || ''}</small></div>
                </div>
              </div>
            </div>
          </td>
          <td class="dosis-col">${dosisDisplay}</td>
          <td class="dosis-col" style="font-weight: 600; color: #2196F3;">${volumeMLHtml}${volumeIncludesUnit ? '' : ' mL'}</td>
          <td>${presentacionText}</td>
          <td><strong>${dilucionText}</strong><br><small>${meta.nota || ''}</small></td>
        </tr>`;
    }
    
    tableHTML += `
        </tbody>
      </table>`;
    
    resultadoDiv.innerHTML = tableHTML;
    setupMedicineInfoButtons();
    show(resultadoDiv);
  }
  
  calcBtn.addEventListener('click', doCalculate);
  
  // Auto-calculate cuando cambias de tab
  document.addEventListener('tabChanged', (e) => {
    if(e.detail.tabName === 'urgencia') {
      doCalculate();
    }
  });
  
  // Auto-calculate al cambiar peso
  document.addEventListener('patientDataChanged', () => {
    doCalculate();
  });
  
  clearBtn.addEventListener('click', () => {
    hide(resultadoDiv);
  });
}

function setupAccessibilityTraps() {
  // Setup focus trap para todos los modales
  const modals = [
    'infoModal',
    'formulasModal',
    'estimadorModal',
    'dosisModal',
    'medDetailModal',
    'disclaimerModal'
  ];

  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (modal) {
      setupFocusTrap(modal);
    }
  });

  const resultRegions = [
    ['resultadoViaAerea', 'Resultados de vía aérea'],
    ['resultadoIntubacion', 'Resultados de medicamentos de intubación'],
    ['resultadoVentilacion', 'Resultados de ventilación'],
    ['resultadoUrgencia', 'Resultados de medicamentos de urgencia'],
    ['resultadoPerfusiones', 'Resultados de perfusiones'],
  ];
  resultRegions.forEach(([id, label]) => {
    const region = document.getElementById(id);
    if (!region) return;
    region.setAttribute('role', 'region');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-label', label);
  });
}
