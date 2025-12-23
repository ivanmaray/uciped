import { loadMeds } from './data.js';
import { calcularPesoEstimado, obtenerParametrosDeMATRIZ1, obtenerParametrosDeMATRIZ2, urgenciaFormulas, intubacionFormulas, formatDosis } from './logic.js';
import { setPatientData, getPatientData, setHeaderValues } from './state.js';
import { compute, DRUGS } from './perfusiones.config.js';

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }
function valid(v){ return v !== '' && !isNaN(v) && v >= 0; }

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
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const popup = btn.closest('td').querySelector('.med-info-popup');
      
      // Cerrar otros popups abiertos
      document.querySelectorAll('.med-info-popup.active').forEach(p => {
        if(p !== popup) p.classList.remove('active');
      });
      
      popup.classList.toggle('active');
    });
  });
  
  // Cerrar popup al hacer click en la X
  const closeButtons = document.querySelectorAll('.med-info-popup-close');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.closest('.med-info-popup').classList.remove('active');
    });
  });
  
  // Cerrar popup al hacer click fuera (solo una vez)
  if (!medInfoDocListenerBound) {
    document.addEventListener('click', (e) => {
      if(!e.target.closest('.med-info-btn') && !e.target.closest('.med-info-popup')) {
        document.querySelectorAll('.med-info-popup.active').forEach(p => {
          p.classList.remove('active');
        });
      }
    });
    medInfoDocListenerBound = true;
  }
}

export async function initUI(){
  // Mostrar disclaimer si no se ha aceptado antes
  showDisclaimerIfNeeded();
  
  meds = await loadMeds();
  if (!meds) {
    console.warn('meds.json no se cargó. Mostrando placeholders.');
    const warn = document.getElementById('dataLoadWarning');
    if (warn) {
      warn.textContent = 'No se pudo cargar datos de medicamentos. Se muestran placeholders.';
      warn.classList.remove('hidden');
    }
  } else {
    console.log('meds.json cargado correctamente:', meds);
    const warn = document.getElementById('dataLoadWarning');
    if (warn) warn.classList.add('hidden');
  }
  setupHeaderInputs();
  // setupDosificacion(); // Desactivado temporalmente - requiere revisión de vías y presentaciones
  setupViaAerea();
  setupIntubacion();
  setupVentilacion();
  setupUrgencia();
  setupSignos();
  setupPerfusiones();
  setupDisclaimer();
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
  console.log('setupHeaderInputs iniciando...');
  
  const headerEdadInput = document.getElementById('headerEdadInput');
  const headerPesoInput = document.getElementById('headerPesoInput');
  const limpiarPacienteBtn = document.getElementById('limpiarPacienteBtn');
  const calcularHeroBtn = document.getElementById('calcularHeroBtn');
  const limpiarHeroBtn = document.getElementById('limpiarHeroBtn');
  const infoBtn = document.getElementById('infoBtn');
  const infoModal = document.getElementById('infoModal');
  const closeInfoModal = document.getElementById('closeInfoModal');
  
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
  
  console.log('Elementos encontrados:', { estimarPesoBtn, estimadorModal });
  
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

  if (calcularHeroBtn) {
    calcularHeroBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      triggerById(calcMap[tab]);
    });
  }

  if (limpiarHeroBtn) {
    limpiarHeroBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      triggerById(clearMap[tab]);
    });
  }


  // Inputs de edad y peso
  headerEdadInput.addEventListener('change', () => {
    const edad = parseFloat(headerEdadInput.value);
    const peso = parseFloat(headerPesoInput.value);
    if(valid(edad)) setPatientData(edad, peso || null);
  });

  headerPesoInput.addEventListener('change', () => {
    const edad = parseFloat(headerEdadInput.value);
    const peso = parseFloat(headerPesoInput.value);
    if(valid(peso)) setPatientData(edad || null, peso);
  });

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
    if(valid(edadActual)) {
      estimadorSlider.value = edadActual;
    } else {
      // Sugerir edad 5 años como default
      estimadorSlider.value = 5;
    }
    estimadorModal.classList.remove('hidden');
    actualizarEstimador();
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
    if(valid(edad) && edad <= 18) {
      estimadorSlider.value = edad;
      actualizarEstimador();
    }
  });

  // Aplicar estimación al paciente
  aplicarEstimacionBtn.addEventListener('click', () => {
    const edad = parseFloat(estimadorSlider.value);
    const peso = parseFloat(estimadorPesoResultado.textContent);
    
    if(valid(edad) && valid(peso)) {
      headerEdadInput.value = edad;
      headerPesoInput.value = peso;
      setPatientData(edad, peso);
      
      estimadorModal.classList.add('hidden');
      
      // Disparar recálculo en todos los tabs
      document.dispatchEvent(new CustomEvent('pesoApplied', { detail: { edad, peso } }));
      
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
    '1-3': { range: '1 a 3 años', text: 'Peso = (edad en años + 9) × 2' },
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
    if(!valid(edad)) {
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
    if(valid(edad) && edad <= 18) {
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
    if(!valid(edad) || edad > 18){ 
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
    if(valid(edad) && pesoText !== '-') {
      setHeaderValues(edad, parseFloat(pesoText));
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
    
    if(!valid(peso) || !ds){ 
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
      html += `<table class="medicines-table">
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
        
        html += `<tr class="med-row">
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
  
  // Auto-calculate cuando aplicas peso desde header
  document.addEventListener('pesoApplied', () => {
    doCalculate();
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
    // Decidir qué matriz usar: MATRIZ 1 para neonatos/lactantes pequeños, MATRIZ 2 para el resto
    let ettSize, ettDepth, sondaAspiracion;
    
    // MATRIZ 1 se usa para neonatos y lactantes muy pequeños (peso <= 3.1 kg)
    if (peso <= 3.1) {
      const matriz1 = obtenerParametrosDeMATRIZ1(peso);
      const ettSinBalon = matriz1.ettSinBalon;
      ettSize = `#${ettSinBalon} mm`;
      ettDepth = matriz1.ettLongitud;
      sondaAspiracion = `${matriz1.sondaAspiracion} Fr`;
    } else {
      // MATRIZ 2 para el resto de población pediátrica
      const matriz2 = obtenerParametrosDeMATRIZ2(edad);
      const ettCuffed = matriz2.ettConBalon;
      ettSize = `#${ettCuffed} mm (con balón)`;
      ettDepth = matriz2.ettOral;
      sondaAspiracion = `${matriz2.sondaAspiracion} Fr`;
    }
    
    // Laryngoscope blade (basado en edad)
    let laryngoBlade = '2 recta o curva';
    if (edad < 1) laryngoBlade = '0-1 recta';
    else if (edad < 2) laryngoBlade = '1 recta';
    else if (edad < 5) laryngoBlade = '2 recta o curva';
    else if (edad < 12) laryngoBlade = '2-3 curva';
    else laryngoBlade = '3-4 curva';
    
    // LMA size (basado en peso)
    let lmaSize = '2';
    if (peso < 5) lmaSize = '1';
    else if (peso < 10) lmaSize = '1.5';
    else if (peso < 20) lmaSize = '2';
    else if (peso < 30) lmaSize = '2.5';
    else if (peso < 50) lmaSize = '3';
    else lmaSize = '4';
    
    // Defibrillation (2-4 J/kg)
    const defibMin = (peso * 2).toFixed(0);
    const defibMax = (peso * 4).toFixed(0);
    const defibDose = `${defibMin} - ${defibMax} J`;
    
    // Cardioversion (0.5 → 1 → 2 J/kg)
    const cardio1 = (peso * 0.5).toFixed(0);
    const cardio2 = (peso * 1).toFixed(0);
    const cardio3 = (peso * 2).toFixed(0);
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
      ettDepth: `${ettDepth} cm`,
      laryngoBlade,
      lmaSize: `Tamaño ${lmaSize}`,
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
    if(peso === null || !valid(peso)){ 
      hide(resultadoDiv);
      return; 
    }
    
    // Calcular parámetros de vía aérea
    if (valid(edad)) {
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
  
  // Auto-calculate cuando aplicas peso desde header
  document.addEventListener('pesoApplied', () => {
    doCalculate();
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
    if(peso === null || !valid(peso)){ 
      hide(resultadoDiv);
      return; 
    }
    
    let tableHTML = `
      <table class="medicines-table">
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Dosis (mg/mcg)</th>
            <th>Volumen (mL)</th>
            <th>Presentación</th>
            <th>Dilución</th>
          </tr>
        </thead>
        <tbody>`;
    
    const ds = meds?.intubacion ?? null;
    console.log('Intubación: meds cargados?', !!meds, 'ds keys:', ds ? Object.keys(ds) : 'null');
    for(const key of Object.keys(intubacionFormulas)){
      const calc = intubacionFormulas[key];
      const dosis_valor = calc(peso, 0);
      const dosis = formatDosis(dosis_valor);
      const meta = ds ? ds[key] : { nombre: key, unidad: '', presentacion: '', dilucion: '' };
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
        <tr class="med-row">
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
          <td class="dosis-col">${dosis} ${meta.unidad || ''}</td>
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
  
  // Auto-calculate cuando aplicas peso desde header
  document.addEventListener('pesoApplied', () => {
    doCalculate();
  });
  
  // Auto-calculate al cambiar peso
  document.addEventListener('patientDataChanged', () => {
    doCalculate();
  });
  
  // Auto-calculate cuando aplicas peso desde header
  document.addEventListener('pesoApplied', () => {
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
  const modeSelect = document.getElementById('ventModeSelect');

  function calcularVentilacion(edad, peso, modo) {
    const vtMin = (peso * 6).toFixed(0);
    const vtMax = (peso * 8).toFixed(0);
    const ventVt = `${vtMin}-${vtMax} mL (6-8 mL/kg)`;

    let ventFr = '12-20 rpm';
    if (edad < 1) ventFr = '30-40 rpm';
    else if (edad < 5) ventFr = '25-35 rpm';
    else if (edad < 12) ventFr = '20-30 rpm';
    else ventFr = '12-20 rpm';

    const ventPeep = '5-8 cmH2O (subir si hipoxemia/atelectasia)';
    const ventFiO2 = '0.60-1.0, bajar progresivo a SpO2 92-97%';
    const ventIe = '1:2 (1:1.5 si obstrucción; 1:3 si auto-PEEP)';

    let ventPip = '20-26 cmH2O (ajustar para Vt objetivo)';
    if (edad < 1) ventPip = '16-22 cmH2O (RN/lactante)';
    else if (edad < 5) ventPip = '18-24 cmH2O';
    else if (edad < 12) ventPip = '20-26 cmH2O';
    else ventPip = '22-28 cmH2O (evitar >30)';

    let ventPs = '8-12 cmH2O (modo soporte)';
    if (edad < 1) ventPs = '10-12 cmH2O';
    else if (edad < 5) ventPs = '8-12 cmH2O';
    else if (edad < 12) ventPs = '8-10 cmH2O';
    else ventPs = '6-8 cmH2O';

    const ventPplat = '<28 cmH2O (ideal <26)';
    const ventDriving = '<15 cmH2O (ideal <12)';
    const ventFlow = '6-8 L/min (hasta 10-12 si alta demanda/fugas)';
    const ventTrigger = '-1 a -2 cmH2O o 1-2 L/min (evitar auto-disparo)';

    // VM objetivo y alarmas
    const vtMid = peso * 7; // mL
    let frMid = 16;
    if (edad < 1) frMid = 35;
    else if (edad < 5) frMid = 30;
    else if (edad < 12) frMid = 25;
    const vmTarget = (vtMid / 1000 * frMid);
    const vmLow = (vmTarget * 0.8).toFixed(1);
    const vmHigh = (vmTarget * 1.2).toFixed(1);
    const ventAlarmVm = `${vmLow}-${vmHigh} L/min (80-120% de ${vmTarget.toFixed(1)} L/min)`;

    // Apnea/backup
    let apneaTime = '20-25 s';
    if (edad < 1) apneaTime = '10-15 s';
    else if (edad < 5) apneaTime = '15-20 s';
    const backupFr = frMid;
    const ventApnea = `Apnea ${apneaTime}; backup ${backupFr} rpm (Vt 6-7 mL/kg)`;

    let ventModeParams = '';
    if (modo === 'PC') {
      ventModeParams = `PC: Pinsp 14-18 cmH2O sobre PEEP (ajustar a Vt 6-7 mL/kg), FR ${ventFr}, I:E ${ventIe}`;
    } else if (modo === 'PSV') {
      ventModeParams = `PSV: PS ${ventPs}, PEEP ${ventPeep}, trigger ${ventTrigger}, flujo ${ventFlow}, backup FR ${backupFr} rpm`;
    } else {
      ventModeParams = `VC: Vt 6-7 mL/kg, FR ${ventFr}, flujo ${ventFlow}, I:E ${ventIe}`;
    }

    return {
      ventVt,
      ventFr,
      ventPeep,
      ventFiO2,
      ventIe,
      ventPip,
      ventPs,
      ventPplat,
      ventDriving,
      ventFlow,
      ventTrigger,
      ventModeParams,
      ventAlarmVm,
      ventApnea,
    };
  }

  function doCalculate() {
    const { peso, edad } = getPatientData();
    if(!valid(peso)) {
      hide(resultadoDiv);
      return;
    }

    const edadValida = valid(edad) ? edad : 0;
    const modo = modeSelect ? modeSelect.value : 'VC';
    const vent = calcularVentilacion(edadValida, peso, modo);

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

  document.addEventListener('pesoApplied', () => {
    doCalculate();
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
  });
}

function setupSignos(){
  const edadSignosInput = document.getElementById('edadSignos');
  const obtenerSignosBtn = document.getElementById('obtenerSignos');
  const resultadoSignosDiv = document.getElementById('resultadoSignos');
  const fcElement = document.getElementById('fc');
  const frElement = document.getElementById('fr');
  const pasElement = document.getElementById('pas');
  const padElement = document.getElementById('pad');

  function obtenerReferenciasSignosVitales(edad) {
    let referencias = {};
    if (edad < 1) {
      referencias = {
        fc: '100-160 lpm',
        fr: '30-60 rpm',
        pas: '50-70 mmHg',
        pad: '25-45 mmHg',
        pam: '35-55 mmHg (edad + 40)',
        spo2: '≥92% (≥95% si cardiopatía)',
        temperatura: '36.5-37.5 °C',
        glucemia: '70-100 mg/dL (RN: 40-60 primeras 24h)',
        diuresis: '>2 mL/kg/h (mínimo 1.5)',
        relleno: '<2 segundos',
        glasgow: '15 (escala modificada <2 años)'
      };
    } else if (edad >= 1 && edad < 2) {
      referencias = {
        fc: '90-150 lpm',
        fr: '25-50 rpm',
        pas: '80-100 mmHg',
        pad: '55-65 mmHg',
        pam: '65-75 mmHg',
        spo2: '≥92% (≥95% si patología respiratoria)',
        temperatura: '36.5-37.5 °C',
        glucemia: '70-110 mg/dL',
        diuresis: '>2 mL/kg/h',
        relleno: '<2 segundos',
        glasgow: '15 (escala modificada)'
      };
    } else if (edad >= 2 && edad < 5) {
      referencias = {
        fc: '80-130 lpm',
        fr: '20-40 rpm',
        pas: '95-105 mmHg',
        pad: '60-70 mmHg',
        pam: '70-80 mmHg',
        spo2: '≥92% (≥95% óptimo)',
        temperatura: '36.5-37.5 °C',
        glucemia: '70-110 mg/dL',
        diuresis: '>1 mL/kg/h',
        relleno: '<2 segundos',
        glasgow: '15 (escala adulta)'
      };
    } else if (edad >= 5 && edad < 12) {
      referencias = {
        fc: '70-110 lpm',
        fr: '18-30 rpm',
        pas: '100-120 mmHg',
        pad: '65-75 mmHg',
        pam: '75-90 mmHg',
        spo2: '≥92% (≥95% óptimo)',
        temperatura: '36.5-37.5 °C',
        glucemia: '70-110 mg/dL',
        diuresis: '>1 mL/kg/h',
        relleno: '<2 segundos',
        glasgow: '15'
      };
    } else if (edad >= 12) {
      referencias = {
        fc: '60-100 lpm',
        fr: '16-20 rpm',
        pas: '110-135 mmHg',
        pad: '65-85 mmHg',
        pam: '80-95 mmHg',
        spo2: '≥92% (≥95% óptimo)',
        temperatura: '36.5-37.5 °C',
        glucemia: '70-110 mg/dL (adulto: 70-100)',
        diuresis: '>0.5 mL/kg/h (adulto)',
        relleno: '<2 segundos',
        glasgow: '15'
      };
    }
    return referencias;
  }

  obtenerSignosBtn.addEventListener('click', () => {
    const edad = parseFloat(edadSignosInput.value);
    if (!valid(edad) || edad > 18) {
      alert('Por favor, ingrese una edad válida (0-18 años)');
      return;
    }
    const signos = obtenerReferenciasSignosVitales(edad);
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
  });
  
  // Auto-calculate cuando cambias de tab
  document.addEventListener('tabChanged', (e) => {
    if(e.detail.tabName === 'signos') {
      const { edad } = getPatientData();
      if(valid(edad)) {
        const signos = obtenerReferenciasSignosVitales(edad);
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
      }
    }
  });
  
  // Auto-calculate al cambiar peso/edad del paciente
  document.addEventListener('patientDataChanged', () => {
    const { edad } = getPatientData();
    if(valid(edad)) {
      const signos = obtenerReferenciasSignosVitales(edad);
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
    }
  });
  
  edadSignosInput.addEventListener('keypress', (e)=>{ if(e.key==='Enter') obtenerSignosBtn.click(); });
}

function setupPerfusiones(){
  const calcBtn = document.getElementById('calcularPerfusiones');
  const clearBtn = document.getElementById('limpiarPerfusiones');
  const resultadoDiv = document.getElementById('resultadoPerfusiones');
  const inoTableBody = document.getElementById('perfusionesInoTableBody');
  const sedoTableBody = document.getElementById('perfusionesSedoTableBody');

  // Mapeo de keys en meds.json a keys en DRUGS
  const INOTROPICOS_MAP = {
    adrenalina_periferico: 'adrenaline_peripheral',
    adrenalina_central: 'adrenaline_central',
    noradrenalina_periferico: 'noradrenaline_peripheral',
    noradrenalina_central: 'noradrenaline_central',
    dopamina_periferico: 'dopamine_peripheral',
    dopamina_central: 'dopamine_central',
    amiodarona_perf: 'amiodarone',
    milrinona: 'milrinone',
    labetalol: 'labetalol',
  };

  const SEDOANALGESIA_MAP = {
    fentanilo_perf: 'fentanyl',
    ketamina_perf: 'ketamine',
    midazolam_perf: 'midazolam',
    rocuronio_perf: 'rocuronium',
    // La insulina está en un grupo aparte en meds.json ("insulina"). La manejamos abajo.
  };

  // Función para ejecutar el cálculo
  function doCalculate() {
    const { peso } = getPatientData();
    if(!peso || !valid(peso)) {
      hide(resultadoDiv);
      return;
    }
    
    inoTableBody.innerHTML = '';
    sedoTableBody.innerHTML = '';

    // ===== INOTRÓPICOS =====
    for (const [medKey, drugKey] of Object.entries(INOTROPICOS_MAP)) {
      const med = meds?.perfusiones?.inotrópicos?.[medKey];
      if (!med) continue;

      try {
        const result = compute(DRUGS, { drugKey, weightKg: peso });
        const prep = result.preparation;
        const drugCfg = DRUGS.find(d => d.key === drugKey);
        const doseUnit = drugCfg?.doseUnit || med.unidad || '';
        const range = (med.dosis_min && med.dosis_max)
          ? `${med.dosis_min}-${med.dosis_max} ${doseUnit}`
          : (med.rango || '-');
        
        // Calcular dosis por hora usando la preparación
        // Nota: si el doseUnit incluye "/kg/", NO multiplicar por peso (ya está por kg)
        let dosePerHour = '-';
        if (med.dosis_min && med.dosis_max) {
          if (doseUnit.includes('/min')) {
            const min = (med.dosis_min * 60).toFixed(2);
            const max = (med.dosis_max * 60).toFixed(2);
            const unit = doseUnit.replace('/min', '/h');
            dosePerHour = `${min}-${max} ${unit}`;
          } else if (doseUnit.includes('/h')) {
            dosePerHour = `${med.dosis_min.toFixed(2)}-${med.dosis_max.toFixed(2)} ${doseUnit}`;
          }
        }

        // Ritmo (mL/h): MULTIPLICAR por peso si la unidad incluye /kg/
        // Convertir concentración a las mismas unidades que el doseUnit
        let ritmoText = '-';
        if (med.dosis_min && med.dosis_max) {
          let concVal = prep.concentration.value;
          const concUnit = prep.concentration.unit.split('/')[0]; // mcg, mg, etc.
          const doseUnitMass = doseUnit.split('/')[0]; // mcg, mg, IU, etc.
          
          // Convertir concentración a la unidad del doseUnit si es necesario
          if (concUnit !== doseUnitMass) {
            if (concUnit === 'mg' && doseUnitMass === 'mcg') {
              concVal = concVal * 1000; // mg -> mcg
            } else if (concUnit === 'mcg' && doseUnitMass === 'mg') {
              concVal = concVal / 1000; // mcg -> mg
            }
          }
          
          let minMlH = 0, maxMlH = 0;
          
          if (doseUnit.includes('/min')) {
            // e.g., mcg/kg/min -> convertir a /h Y MULTIPLICAR por peso
            minMlH = (med.dosis_min * peso * 60) / concVal;
            maxMlH = (med.dosis_max * peso * 60) / concVal;
          } else {
            // e.g., mcg/kg/h, mg/kg/h -> MULTIPLICAR por peso
            minMlH = (med.dosis_min * peso) / concVal;
            maxMlH = (med.dosis_max * peso) / concVal;
          }
          ritmoText = `${minMlH.toFixed(2)}-${maxMlH.toFixed(2)} mL/h`;
        }

        // Presentación y Dilución con equivalencia calculada
        // Mostrar solo la concentración comercial original
        const presentacion = prep.commercialPresentation || `${prep.concentration.value} ${prep.concentration.unit}`;
        const diluent = prep.diluent === 'SSF_or_G5' ? 'SSF o G5' : prep.diluent;
        const dilucion = `c.s.p. ${prep.volumeMl} mL ${diluent}`;

        // Calcular equivalencia: 1 mL/h = ? dosis/kg
        let concValEq = prep.concentration.value;
        const concUnitEq = prep.concentration.unit.split('/')[0];
        const doseUnitMassEq = doseUnit.split('/')[0];
        
        if (concUnitEq !== doseUnitMassEq) {
          if (concUnitEq === 'mg' && doseUnitMassEq === 'mcg') {
            concValEq = concValEq * 1000;
          } else if (concUnitEq === 'mcg' && doseUnitMassEq === 'mg') {
            concValEq = concValEq / 1000;
          }
        }
        
        let equivalencia = '';
        if (doseUnit.includes('/min')) {
          const eqPerH = concValEq;
          const eqPerMin = (eqPerH / 60).toFixed(2);
          const eqPerKgMin = (eqPerMin / peso).toFixed(2);
          equivalencia = `1 mL/h = ${eqPerKgMin} ${doseUnit}`;
        } else {
          const eqPerH = concValEq;
          const eqPerKgH = (eqPerH / peso).toFixed(2);
          equivalencia = `1 mL/h = ${eqPerKgH} ${doseUnit}`;
        }
        
        let row = `<tr><td><strong>${result.displayName}</strong></td><td class="dosis-col">${range}</td><td class="dosis-col">${dosePerHour}</td><td>${ritmoText}</td><td>${presentacion}</td><td>${dilucion}<br><small><strong>Equivalencia:</strong> ${equivalencia}</small></td></tr>`;
        inoTableBody.insertAdjacentHTML('beforeend', row);
      } catch (e) {
        console.warn(`Error calculando ${drugKey}:`, e.message);
      }
    }

    // ===== SEDOANALGESIA =====
    for (const [medKey, drugKey] of Object.entries(SEDOANALGESIA_MAP)) {
      const med = meds?.perfusiones?.sedoanalgesia?.[medKey] || meds?.perfusiones?.insulina?.[medKey];
      if (!med) continue;

      try {
        const result = compute(DRUGS, { drugKey, weightKg: peso });
        const prep = result.preparation;
        const drugCfg = DRUGS.find(d => d.key === drugKey);
        const doseUnit = drugCfg?.doseUnit || med.unidad || '';
        const range = (med.dosis_min && med.dosis_max)
          ? `${med.dosis_min}-${med.dosis_max} ${doseUnit}`
          : (med.rango || '-');
        
        // Calcular dosis por hora
        // Nota: si el doseUnit incluye "/kg/", NO multiplicar por peso para "dosis/h"
        let dosePerHour = '-';
        if (med.dosis_min && med.dosis_max) {
          if (doseUnit.includes('/min')) {
            const min = (med.dosis_min * 60).toFixed(2);
            const max = (med.dosis_max * 60).toFixed(2);
            const unit = doseUnit.replace('/min', '/h');
            dosePerHour = `${min}-${max} ${unit}`;
          } else {
            dosePerHour = `${med.dosis_min.toFixed(2)}-${med.dosis_max.toFixed(2)} ${doseUnit}`;
          }
        }

        // Ritmo (mL/h): MULTIPLICAR por peso si la unidad incluye /kg/
        // Convertir concentración a las mismas unidades que el doseUnit
        let ritmoText = '-';
        if (med.dosis_min && med.dosis_max) {
          let concVal = prep.concentration.value;
          const concUnit = prep.concentration.unit.split('/')[0]; // mcg, mg, etc.
          const doseUnitMass = doseUnit.split('/')[0]; // mcg, mg, IU, etc.
          
          // Convertir concentración a la unidad del doseUnit si es necesario
          if (concUnit !== doseUnitMass) {
            if (concUnit === 'mg' && doseUnitMass === 'mcg') {
              concVal = concVal * 1000; // mg -> mcg
            } else if (concUnit === 'mcg' && doseUnitMass === 'mg') {
              concVal = concVal / 1000; // mcg -> mg
            }
          }
          
          let minMlH = 0, maxMlH = 0;
          
          if (doseUnit.includes('/min')) {
            // e.g., mcg/kg/min -> convertir a /h Y MULTIPLICAR por peso
            minMlH = (med.dosis_min * peso * 60) / concVal;
            maxMlH = (med.dosis_max * peso * 60) / concVal;
          } else {
            // e.g., mcg/kg/h, mg/kg/h -> MULTIPLICAR por peso
            minMlH = (med.dosis_min * peso) / concVal;
            maxMlH = (med.dosis_max * peso) / concVal;
          }
          ritmoText = `${minMlH.toFixed(2)}-${maxMlH.toFixed(2)} mL/h`;
        }

        // Presentación y Dilución con equivalencia calculada
        // Mostrar solo la concentración comercial original
        const presentacion = prep.commercialPresentation || `${prep.concentration.value} ${prep.concentration.unit}`;
        const diluent = prep.diluent === 'SSF_or_G5' ? 'SSF o G5' : prep.diluent;
        const dilucion = `c.s.p. ${prep.volumeMl} mL ${diluent}`;

        // Calcular equivalencia: 1 mL/h = ? dosis/kg
        let concValEqSedo = prep.concentration.value;
        const concUnitEqSedo = prep.concentration.unit.split('/')[0];
        const doseUnitMassEqSedo = doseUnit.split('/')[0];
        
        if (concUnitEqSedo !== doseUnitMassEqSedo) {
          if (concUnitEqSedo === 'mg' && doseUnitMassEqSedo === 'mcg') {
            concValEqSedo = concValEqSedo * 1000;
          } else if (concUnitEqSedo === 'mcg' && doseUnitMassEqSedo === 'mg') {
            concValEqSedo = concValEqSedo / 1000;
          }
        }
        
        let equivalenciaSedo = '';
        if (doseUnit.includes('/min')) {
          const eqPerH = concValEqSedo;
          const eqPerMin = (eqPerH / 60).toFixed(2);
          const eqPerKgMin = (eqPerMin / peso).toFixed(2);
          equivalenciaSedo = `1 mL/h = ${eqPerKgMin} ${doseUnit}`;
        } else {
          const eqPerH = concValEqSedo;
          const eqPerKgH = (eqPerH / peso).toFixed(2);
          equivalenciaSedo = `1 mL/h = ${eqPerKgH} ${doseUnit}`;
        }
        
        let row = `<tr><td><strong>${result.displayName}</strong></td><td class="dosis-col">${range}</td><td class="dosis-col">${dosePerHour}</td><td>${ritmoText}</td><td>${presentacion}</td><td>${dilucion}<br><small><strong>Equivalencia:</strong> ${equivalenciaSedo}</small></td></tr>`;
        sedoTableBody.insertAdjacentHTML('beforeend', row);
      } catch (e) {
        console.warn(`Error calculando ${drugKey}:`, e.message);
      }
    }

    show(resultadoDiv);
  }

  calcBtn.addEventListener('click', doCalculate);
  
  // Auto-calculate cuando cambias de tab
  document.addEventListener('tabChanged', (e) => {
    if(e.detail.tabName === 'perfusiones') {
      doCalculate();
    }
  });
  
  // Auto-calculate cuando aplicas peso desde header
  document.addEventListener('pesoApplied', () => {
    doCalculate();
  });
  
  // Auto-calculate al cambiar peso
  document.addEventListener('patientDataChanged', () => {
    doCalculate();
  });
  
  clearBtn.addEventListener('click', ()=>{ hide(resultadoDiv); });
}
function setupUrgencia(){
  const calcBtn = document.getElementById('calcularUrgencia');
  const clearBtn = document.getElementById('limpiarUrgencia');
  const resultadoDiv = document.getElementById('resultadoUrgencia');
  
  // Función para ejecutar el cálculo
  function doCalculate() {
    const { peso } = getPatientData();
    if(peso === null || !valid(peso)){ 
      hide(resultadoDiv);
      return; 
    }
    
    let tableHTML = `
      <table class="medicines-table">
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
    console.log('Urgencia: meds cargados?', !!meds, 'ds keys:', ds ? Object.keys(ds) : 'null');
    for(const key of Object.keys(urgenciaFormulas)){
      const calc = urgenciaFormulas[key];
      const dosis_valor = calc(peso);
      const dosis = formatDosis(dosis_valor);
      const meta = ds ? ds[key] : { nombre: key, unidad: '', presentacion: '', dilucion: '', nota: '' };
      if (!meta) {
        console.warn('Urgencia: no hay metadata para', key);
      }
      const presentacionText = meta.presentacion && meta.presentacion.trim() !== '' ? meta.presentacion : 'Revisar presentación';
      const dilucionText = meta.dilucion && meta.dilucion.trim() !== '' ? meta.dilucion : 'Revisar dilución';
      
      // Calcular volumen
      let volumeML = '-';
      let volumeMLHtml = '-';
      if (meta.es_volumen_puro) {
        // Para medicamentos que se dan en volumen puro (bolos, etc)
        volumeML = dosis;
        volumeMLHtml = dosis;
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
        <tr class="med-row">
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
                  <div class="med-info-value">${volumeMLHtml} mL</div>
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
          <td class="dosis-col">${dosis} ${meta.unidad || ''}</td>
          <td class="dosis-col" style="font-weight: 600; color: #2196F3;">${volumeMLHtml} mL</td>
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
  
  // Auto-calculate cuando aplicas peso desde header
  document.addEventListener('pesoApplied', () => {
    doCalculate();
  });
  
  // Auto-calculate al cambiar peso
  document.addEventListener('patientDataChanged', () => {
    doCalculate();
  });
  
  clearBtn.addEventListener('click', () => {
    hide(resultadoDiv);
  });
}
