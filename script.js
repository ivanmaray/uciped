// ============================================
// Funciones Auxiliares
// ============================================

function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}

function isValidInput(value) {
    return value !== '' && !isNaN(value) && value >= 0;
}

// ============================================
// Gestión de Tabs
// ============================================

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        
        // Remove active class from all buttons and panels
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked button and corresponding panel
        btn.classList.add('active');
        document.getElementById(tabName).classList.add('active');
    });
});

// ============================================
// CALCULADORA DE PESO
// ============================================

const edadInput = document.getElementById('edad');
const calcularPesoBtn = document.getElementById('calcularPeso');
const limpiarPesoBtn = document.getElementById('limpiarPeso');
const resultadoPesoDiv = document.getElementById('resultadoPeso');
const pesoResultado = document.getElementById('pesoResultado');
const detalleResultado = document.getElementById('detalleResultado');

function calcularPesoEstimado(edad) {
    let peso = 0;
    let formula = '';

    if (edad < 1) {
        // Meses
        const meses = edad * 12;
        peso = 3.5 + (meses * 0.5);
        formula = `3.5 + (${meses.toFixed(1)} meses × 0.5)`;
    } else if (edad >= 1 && edad < 3) {
        peso = (edad + 9) * 2;
        formula = `(${edad} + 9) × 2`;
    } else if (edad >= 3 && edad < 6) {
        peso = (edad * 2) + 8;
        formula = `(${edad} × 2) + 8`;
    } else if (edad >= 6 && edad < 12) {
        peso = (edad * 3) + 7;
        formula = `(${edad} × 3) + 7`;
    } else if (edad >= 12 && edad <= 18) {
        peso = (edad * 3.5) + 10;
        formula = `(${edad} × 3.5) + 10`;
    }

    return {
        peso: peso.toFixed(2),
        formula: formula
    };
}

calcularPesoBtn.addEventListener('click', () => {
    const edad = parseFloat(edadInput.value);

    if (!isValidInput(edad) || edad > 18) {
        alert('Por favor, ingrese una edad válida (0-18 años)');
        return;
    }

    const resultado = calcularPesoEstimado(edad);
    pesoResultado.textContent = resultado.peso;
    detalleResultado.textContent = `Fórmula aplicada: ${resultado.formula} = ${resultado.peso} kg`;

    showElement(resultadoPesoDiv);
});

limpiarPesoBtn.addEventListener('click', () => {
    edadInput.value = '';
    hideElement(resultadoPesoDiv);
});

// ============================================
// CALCULADORA DE DOSIFICACIÓN
// ============================================

const pesoActualInput = document.getElementById('pesoActual');
const medicamentoSelect = document.getElementById('medicamento');
const calcularDosisBtn = document.getElementById('calcularDosis');
const limpiarDosisBtn = document.getElementById('limpiarDosis');
const resultadoDosisDiv = document.getElementById('resultadoDosis');
const dosisResultado = document.getElementById('dosisResultado');
const unidadDosis = document.getElementById('unidadDosis');
const detalleDosis = document.getElementById('detalleDosis');

const medicamentos = {
    // ANALGÉSICOS Y ANTIPIRÉTICOS
    paracetamol: {
        nombre: 'Paracetamol (Acetaminofén)',
        dosis: 15,
        unidad: 'mg',
        intervalo: 'cada 4-6 horas',
        maximo: 60,
        maxunidad: 'mg/kg/día',
        presentacion: '500 mg/5 mL (100 mg/mL)',
        dilucion: 'Usar sin diluir o diluir 1:1 con SF',
        via: 'IV, VO, rectal'
    },
    ibuprofeno: {
        nombre: 'Ibuprofeno',
        dosis: 10,
        unidad: 'mg',
        intervalo: 'cada 6-8 horas',
        maximo: 40,
        maxunidad: 'mg/kg/día',
        presentacion: '100 mg/5 mL',
        dilucion: 'Usar sin diluir',
        via: 'VO'
    },
    metamizol: {
        nombre: 'Metamizol (Dipirona)',
        dosis: 10,
        unidad: 'mg',
        intervalo: 'cada 6 horas',
        maximo: 40,
        maxunidad: 'mg/kg/día',
        presentacion: '500 mg/mL',
        dilucion: 'Diluir 1:4 con SF (125 mg/mL)',
        via: 'IV, IM, VO'
    },

    // ANTIBIÓTICOS BETA-LACTÁMICOS
    amoxicilina: {
        nombre: 'Amoxicilina',
        dosis: 25,
        unidad: 'mg',
        intervalo: 'cada 8 horas',
        maximo: 75,
        maxunidad: 'mg/kg/día',
        presentacion: '250 mg/5 mL',
        dilucion: 'Suspensión oral directa',
        via: 'VO'
    },
    amoxiclav: {
        nombre: 'Amoxicilina-Ácido Clavulánico',
        dosis: 25,
        unidad: 'mg',
        intervalo: 'cada 8 horas',
        maximo: 75,
        maxunidad: 'mg/kg/día',
        presentacion: '250/62.5 mg/5 mL',
        dilucion: 'Suspensión oral directa',
        via: 'VO'
    },
    cefadroxilo: {
        nombre: 'Cefadroxilo',
        dosis: 30,
        unidad: 'mg',
        intervalo: 'cada 12 horas',
        maximo: 60,
        maxunidad: 'mg/kg/día',
        presentacion: '250 mg/5 mL, 500 mg/5 mL',
        dilucion: 'Suspensión oral directa',
        via: 'VO'
    },
    cefotaxima: {
        nombre: 'Cefotaxima',
        dosis: 50,
        unidad: 'mg',
        intervalo: 'cada 6-8 horas',
        maximo: 200,
        maxunidad: 'mg/kg/día',
        presentacion: '500 mg vial',
        dilucion: 'Diluir vial en 5-10 mL SF, luego diluir 1:10 en SF',
        via: 'IV, IM'
    },
    ceftriaxona: {
        nombre: 'Ceftriaxona',
        dosis: 50,
        unidad: 'mg',
        intervalo: 'cada 12 horas',
        maximo: 100,
        maxunidad: 'mg/kg/día',
        presentacion: '500 mg, 1 g vial',
        dilucion: 'Diluir vial en 10 mL SF, luego 1:10',
        via: 'IV, IM'
    },
    ceftazidima: {
        nombre: 'Ceftazidima',
        dosis: 30,
        unidad: 'mg',
        intervalo: 'cada 8 horas',
        maximo: 90,
        maxunidad: 'mg/kg/día',
        presentacion: '500 mg, 1 g vial',
        dilucion: 'Diluir vial en 10 mL SF',
        via: 'IV, IM'
    },
    penicilina_g: {
        nombre: 'Penicilina G Sódica',
        dosis: 50000,
        unidad: 'U',
        intervalo: 'cada 4-6 horas',
        maximo: 300000,
        maxunidad: 'U/kg/día',
        presentacion: '1.000.000 U vial',
        dilucion: 'Diluir 1.000.000 U en 10 mL SF (100.000 U/mL)',
        via: 'IV, IM'
    },

    // ANTIBIÓTICOS MACRÓLIDOS
    azitromicina: {
        nombre: 'Azitromicina',
        dosis: 10,
        unidad: 'mg',
        intervalo: 'cada 24 horas',
        maximo: 10,
        maxunidad: 'mg/kg/día',
        presentacion: '200 mg/5 mL',
        dilucion: 'Suspensión oral directa',
        via: 'VO'
    },
    eritromicina: {
        nombre: 'Eritromicina',
        dosis: 12.5,
        unidad: 'mg',
        intervalo: 'cada 6 horas',
        maximo: 50,
        maxunidad: 'mg/kg/día',
        presentacion: '250 mg/5 mL',
        dilucion: 'Suspensión oral directa',
        via: 'VO, IV'
    },

    // AMINOGLUCÓSIDOS
    gentamicina: {
        nombre: 'Gentamicina',
        dosis: 7.5,
        unidad: 'mg',
        intervalo: 'cada 24 horas',
        maximo: 7.5,
        maxunidad: 'mg/kg/día',
        presentacion: '40 mg/mL',
        dilucion: 'Diluir 1:10 en SF (4 mg/mL)',
        via: 'IV, IM'
    },
    tobramicina: {
        nombre: 'Tobramicina',
        dosis: 10,
        unidad: 'mg',
        intervalo: 'cada 24 horas',
        maximo: 10,
        maxunidad: 'mg/kg/día',
        presentacion: '40 mg/mL',
        dilucion: 'Diluir 1:10 en SF',
        via: 'IV, IM'
    },

    // ANTIVIRALES
    aciclovir: {
        nombre: 'Aciclovir',
        dosis: 15,
        unidad: 'mg',
        intervalo: 'cada 8 horas',
        maximo: 45,
        maxunidad: 'mg/kg/día',
        presentacion: '200 mg/5 mL',
        dilucion: 'Suspensión oral directa',
        via: 'VO, IV'
    },
    oseltamivir: {
        nombre: 'Oseltamivir (Tamiflu)',
        dosis: 2,
        unidad: 'mg',
        intervalo: 'cada 12 horas',
        maximo: 4,
        maxunidad: 'mg/kg/día',
        presentacion: '6 mg/mL',
        dilucion: 'Suspensión oral directa',
        via: 'VO'
    },

    // ANTIFÚNGICOS
    fluconazol: {
        nombre: 'Fluconazol',
        dosis: 6,
        unidad: 'mg',
        intervalo: 'cada 24 horas',
        maximo: 6,
        maxunidad: 'mg/kg/día',
        presentacion: '2 mg/mL (200 mg/100 mL)',
        dilucion: 'Usar sin diluir o diluir 1:1 en SF',
        via: 'IV, VO'
    },
    nistatina: {
        nombre: 'Nistatina',
        dosis: 100000,
        unidad: 'U',
        intervalo: 'cada 6 horas',
        maximo: 400000,
        maxunidad: 'U/kg/día',
        presentacion: '100.000 U/mL',
        dilucion: 'Usar sin diluir (suspensión oral)',
        via: 'VO'
    },

    // CARDIOVASCULARES
    digoxina: {
        nombre: 'Digoxina',
        dosis: 0.01,
        unidad: 'mg',
        intervalo: 'cada 12 horas',
        maximo: 0.02,
        maxunidad: 'mg/kg/día',
        presentacion: '0.25 mg/mL',
        dilucion: 'Diluir 1:10 en SF',
        via: 'IV, VO'
    },
    dopamina: {
        nombre: 'Dopamina',
        dosis: 5,
        unidad: 'mcg/kg/min',
        intervalo: 'infusión continua',
        maximo: 20,
        maxunidad: 'mcg/kg/min',
        presentacion: '40 mg/mL',
        dilucion: 'Diluir en SF: 200 mg en 50 mL = 4 mg/mL',
        via: 'IV'
    },
    epinefrina: {
        nombre: 'Epinefrina',
        dosis: 0.01,
        unidad: 'mg',
        intervalo: 'cada 5-15 min según necesidad',
        maximo: 0.01,
        maxunidad: 'mg/dosis',
        presentacion: '1:1000 (1 mg/mL)',
        dilucion: 'Diluir 1:10 en SF para vía IV (0.1 mg/mL)',
        via: 'IV, IM, SC'
    },
    adrenalina_infusion: {
        nombre: 'Adrenalina (Infusión)',
        dosis: 0.05,
        unidad: 'mcg/kg/min',
        intervalo: 'infusión continua',
        maximo: 1,
        maxunidad: 'mcg/kg/min',
        presentacion: '1 mg/mL',
        dilucion: 'Diluir 1 mL en 50 mL SF = 20 mcg/mL',
        via: 'IV'
    },
    milrinona: {
        nombre: 'Milrinona',
        dosis: 0.25,
        unidad: 'mcg/kg/min',
        intervalo: 'infusión continua',
        maximo: 0.75,
        maxunidad: 'mcg/kg/min',
        presentacion: '1 mg/mL',
        dilucion: 'Diluir en SF o DW a concentración 50-200 mcg/mL',
        via: 'IV'
    },

    // SEDANTES
    midazolam: {
        nombre: 'Midazolam',
        dosis: 0.1,
        unidad: 'mg',
        intervalo: 'cada 2-4 horas',
        maximo: 0.3,
        maxunidad: 'mg/kg/dosis',
        presentacion: '5 mg/mL',
        dilucion: 'Diluir 1:4 en SF (1.25 mg/mL)',
        via: 'IV, IM, IN'
    },
    propofol: {
        nombre: 'Propofol',
        dosis: 2,
        unidad: 'mg',
        intervalo: 'inducción IV',
        maximo: 4,
        maxunidad: 'mg/kg',
        presentacion: '10 mg/mL',
        dilucion: 'Usar sin diluir',
        via: 'IV'
    },
    tiopental: {
        nombre: 'Tiopental',
        dosis: 5,
        unidad: 'mg',
        intervalo: 'inducción IV',
        maximo: 10,
        maxunidad: 'mg/kg',
        presentacion: '500 mg vial',
        dilucion: 'Diluir 500 mg en 10 mL SF = 50 mg/mL',
        via: 'IV, IM'
    },

    // ANALGÉSICOS OPIOIDES
    morfina: {
        nombre: 'Morfina',
        dosis: 0.1,
        unidad: 'mg',
        intervalo: 'cada 4-6 horas',
        maximo: 0.3,
        maxunidad: 'mg/kg/dosis',
        presentacion: '10 mg/mL',
        dilucion: 'Diluir 1:10 en SF',
        via: 'IV, IM, SC'
    },
    fentanilo: {
        nombre: 'Fentanilo',
        dosis: 1,
        unidad: 'mcg',
        intervalo: 'cada 2-4 horas',
        maximo: 5,
        maxunidad: 'mcg/kg/dosis',
        presentacion: '50 mcg/mL',
        dilucion: 'Diluir 1:10 en SF',
        via: 'IV, IM'
    },
    codeína: {
        nombre: 'Codeína',
        dosis: 0.5,
        unidad: 'mg',
        intervalo: 'cada 6 horas',
        maximo: 2,
        maxunidad: 'mg/kg/día',
        presentacion: '15 mg/5 mL',
        dilucion: 'Suspensión oral directa',
        via: 'VO'
    },

    // BRONCODILATADORES
    salbutamol: {
        nombre: 'Salbutamol',
        dosis: 0.1,
        unidad: 'mg',
        intervalo: 'según necesidad',
        maximo: 0.5,
        maxunidad: 'mg/dosis',
        presentacion: '100 mcg/dosis (inhalador)',
        dilucion: 'Usar directo inhalador o nebulizar',
        via: 'Inhalado'
    },
    ipratropio: {
        nombre: 'Ipratropio',
        dosis: 20,
        unidad: 'mcg',
        intervalo: 'cada 8 horas',
        maximo: 60,
        maxunidad: 'mcg/día',
        presentacion: '20 mcg/dosis (inhalador)',
        dilucion: 'Mezclar con salbutamol para nebulizar',
        via: 'Inhalado'
    },

    // DIURÉTICOS
    furosemida: {
        nombre: 'Furosemida (Lasix)',
        dosis: 1,
        unidad: 'mg',
        intervalo: 'cada 8-12 horas',
        maximo: 4,
        maxunidad: 'mg/kg/día',
        presentacion: '40 mg/mL',
        dilucion: 'Diluir 1:4 en SF',
        via: 'IV, IM, VO'
    },
    espironolactona: {
        nombre: 'Espironolactona',
        dosis: 1,
        unidad: 'mg',
        intervalo: 'cada 12 horas',
        maximo: 3,
        maxunidad: 'mg/kg/día',
        presentacion: '25 mg/5 mL',
        dilucion: 'Suspensión oral directa',
        via: 'VO'
    },

    // ANTICONVULSIVANTES
    fenitoína: {
        nombre: 'Fenitoína',
        dosis: 15,
        unidad: 'mg',
        intervalo: 'carga inicial',
        maximo: 15,
        maxunidad: 'mg/kg',
        presentacion: '50 mg/mL',
        dilucion: 'Diluir 1:5 en SF (debe usarse filtro)',
        via: 'IV lenta'
    },
    ácido_valproico: {
        nombre: 'Ácido Valproico',
        dosis: 15,
        unidad: 'mg',
        intervalo: 'cada 8 horas',
        maximo: 45,
        maxunidad: 'mg/kg/día',
        presentacion: '250 mg/5 mL',
        dilucion: 'Solución oral directa',
        via: 'VO'
    },
    levetiracetam: {
        nombre: 'Levetiracetam (Keppra)',
        dosis: 10,
        unidad: 'mg',
        intervalo: 'cada 12 horas',
        maximo: 30,
        maxunidad: 'mg/kg/día',
        presentacion: '100 mg/mL',
        dilucion: 'Solución oral directa',
        via: 'VO, IV'
    },

    // GLUCOCORTICOIDES
    dexametasona: {
        nombre: 'Dexametasona',
        dosis: 0.1,
        unidad: 'mg',
        intervalo: 'cada 6 horas',
        maximo: 0.3,
        maxunidad: 'mg/kg/día',
        presentacion: '4 mg/mL, 0.5 mg/5 mL',
        dilucion: 'Diluir 1:10 en SF',
        via: 'IV, IM, VO'
    },
    metilprednisolona: {
        nombre: 'Metilprednisolona',
        dosis: 2,
        unidad: 'mg',
        intervalo: 'cada 6-8 horas',
        maximo: 8,
        maxunidad: 'mg/kg/día',
        presentacion: '125 mg vial (500 mg vial)',
        dilucion: 'Diluir vial en 5-10 mL SF',
        via: 'IV, IM'
    },
    hidrocortisona: {
        nombre: 'Hidrocortisona',
        dosis: 5,
        unidad: 'mg',
        intervalo: 'cada 6 horas',
        maximo: 20,
        maxunidad: 'mg/kg/día',
        presentacion: '100 mg vial',
        dilucion: 'Diluir vial en 5-10 mL SF',
        via: 'IV, IM'
    },

    // ANTIBACTERIANOS TOPICOS
    benzocaína: {
        nombre: 'Benzocaína',
        dosis: 3,
        unidad: 'mg',
        intervalo: 'según necesidad',
        maximo: 7,
        maxunidad: 'mg/kg',
        presentacion: 'Spray 20% o crema',
        dilucion: 'Usar directamente sobre mucosa',
        via: 'Tópico'
    },

    // ANTIHISTAMÍNICOS
    loratadina: {
        nombre: 'Loratadina',
        dosis: 0.2,
        unidad: 'mg',
        intervalo: 'cada 24 horas',
        maximo: 0.2,
        maxunidad: 'mg/kg/día',
        presentacion: '5 mg/5 mL',
        dilucion: 'Solución oral directa',
        via: 'VO'
    },
    desloratadina: {
        nombre: 'Desloratadina',
        dosis: 0.15,
        unidad: 'mg',
        intervalo: 'cada 24 horas',
        maximo: 0.15,
        maxunidad: 'mg/kg/día',
        presentacion: '2.5 mg/5 mL',
        dilucion: 'Solución oral directa',
        via: 'VO'
    }
};

calcularDosisBtn.addEventListener('click', () => {
    const peso = parseFloat(pesoActualInput.value);
    const medicamento = medicamentoSelect.value;

    if (!isValidInput(peso)) {
        alert('Por favor, ingrese un peso válido');
        return;
    }

    if (medicamento === '') {
        alert('Por favor, seleccione un medicamento');
        return;
    }

    const med = medicamentos[medicamento];
    const dosis = (peso * med.dosis).toFixed(2);
    const maximo = (peso * med.maximo).toFixed(2);

    document.getElementById('nombreMedicamento').textContent = med.nombre;
    document.getElementById('dosisResultado').textContent = dosis;
    document.getElementById('unidadDosis').textContent = med.unidad;
    document.getElementById('maximoDosis').textContent = `${maximo} ${med.unidad}/${med.maxunidad.split('/')[1]}`;
    document.getElementById('intervaloDosis').textContent = med.intervalo;
    document.getElementById('presentacionDosis').textContent = med.presentacion;
    document.getElementById('diluccionDosis').textContent = med.dilucion;
    document.getElementById('viaDosis').textContent = med.via;
    
    detalleDosis.innerHTML = `
        <strong>Cálculo:</strong> ${peso} kg × ${med.dosis} ${med.unidad.split('/')[0]}/kg = ${dosis} ${med.unidad}<br>
        <small>⚠️ Máximo: ${maximo} ${med.unidad}/${med.maxunidad}</small>
    `;

    showElement(resultadoDosisDiv);
});

limpiarDosisBtn.addEventListener('click', () => {
    pesoActualInput.value = '';
    medicamentoSelect.value = '';
    hideElement(resultadoDosisDiv);
});

// ============================================
// INTUBACIÓN - Medicamentos
// ============================================

const pesoIntubacionInput = document.getElementById('pesoIntubacion');
const calcularIntubacionBtn = document.getElementById('calcularIntubacion');
const limpiarIntubacionBtn = document.getElementById('limpiarIntubacion');
const resultadoIntubacionDiv = document.getElementById('resultadoIntubacion');
const intubacionTableBody = document.getElementById('intubacionTableBody');

const medicamentosIntubacion = {
    atropina: {
        nombre: 'Atropina',
        dosis: (peso, dias) => {
            if (peso < 5) return 0.1;
            else if (peso < 30) return peso * 0.02;
            else return 0.6;
        },
        unidad: 'mg',
        presentacion: '0.5 mg/mL',
        dilucion: '1:10 en SF (0.05 mg/mL)'
    },
    fentanilo: {
        nombre: 'Fentanilo',
        dosis: (peso) => peso * 2,
        unidad: 'mcg',
        presentacion: '50 mcg/mL',
        dilucion: '1:10 en SF (5 mcg/mL)'
    },
    ketamina: {
        nombre: 'Ketamina',
        dosis: (peso) => peso * 2,
        unidad: 'mg',
        presentacion: '50 mg/mL',
        dilucion: 'Usar sin diluir o diluir 1:1'
    },
    midazolam: {
        nombre: 'Midazolam',
        dosis: (peso) => {
            let d = peso / 10;
            return d > 10 ? 10 : d;
        },
        unidad: 'mg',
        presentacion: '5 mg/mL',
        dilucion: '1:4 en SF (1.25 mg/mL)'
    },
    propofol: {
        nombre: 'Propofol',
        dosis: (peso) => peso * 2.5,
        unidad: 'mg',
        presentacion: '10 mg/mL',
        dilucion: 'Usar sin diluir'
    },
    succinilcolina: {
        nombre: 'Succinilcolina',
        dosis: (peso, dias) => {
            if (dias <= 30 * 24) return peso * 2;
            else return peso;
        },
        unidad: 'mg',
        presentacion: '100 mg/mL',
        dilucion: '1:10 en SF (10 mg/mL)'
    },
    rocuronio: {
        nombre: 'Rocuronio',
        dosis: (peso) => peso,
        unidad: 'mg',
        presentacion: '50 mg/5mL',
        dilucion: 'Usar sin diluir'
    }
};

calcularIntubacionBtn.addEventListener('click', () => {
    const peso = parseFloat(pesoIntubacionInput.value);
    let diasGlobal = 0;
    if (!isValidInput(peso)) {
        alert('Por favor, ingrese un peso válido');
        return;
    }

    intubacionTableBody.innerHTML = '';
    
    for (const [key, med] of Object.entries(medicamentosIntubacion)) {
        let dosis;
        if (key === 'succinilcolina' || key === 'atropina') {
            dosis = med.dosis(peso, diasGlobal);
        } else {
            dosis = med.dosis(peso);
        }
        
        // Formatear dosis como en la web original
        let dosisFormato = parseFloat(dosis).toFixed(2);
        if (parseFloat(dosisFormato).toFixed(1).includes('.0')) {
            dosisFormato = parseFloat(dosis).toFixed(0);
        } else {
            dosisFormato = parseFloat(dosis).toFixed(1);
        }
        
        const row = `
            <tr>
                <td><strong>${med.nombre}</strong></td>
                <td class="dosis-col">${dosisFormato} ${med.unidad}</td>
                <td>${med.presentacion}</td>
                <td>${med.dilucion}</td>
            </tr>
        `;
        intubacionTableBody.innerHTML += row;
    }
    
    showElement(resultadoIntubacionDiv);
});

limpiarIntubacionBtn.addEventListener('click', () => {
    pesoIntubacionInput.value = '';
    hideElement(resultadoIntubacionDiv);
});

// ============================================
// URGENCIA - Medicamentos Emergencia
// ============================================

const pesoUrgenciaInput = document.getElementById('pesoUrgencia');
const calcularUrgenciaBtn = document.getElementById('calcularUrgencia');
const limpiarUrgenciaBtn = document.getElementById('limpiarUrgencia');
const resultadoUrgenciaDiv = document.getElementById('resultadoUrgencia');
const urgenciaTableBody = document.getElementById('urgenciaTableBody');

const medicamentosUrgencia = {
    adenosina: {
        nombre: 'Adenosina',
        dosis: (peso) => peso < 10 ? peso / 10 : peso / 10,
        unidad: 'mg',
        presentacion: '3 mg/mL',
        dilucion: 'Diluir en SF',
        nota: 'IV rápida'
    },
    adrenalina: {
        nombre: 'Adrenalina',
        dosis: (peso) => peso < 10 ? peso / 100 : peso / 100,
        unidad: 'mg',
        presentacion: '1 mg/mL',
        dilucion: 'Diluir 1:10 en SF',
        nota: 'IV, IO'
    },
    amiodarona: {
        nombre: 'Amiodarona',
        dosis: (peso) => peso > 60 ? 60 : peso * 5,
        unidad: 'mg',
        presentacion: '50 mg/mL',
        dilucion: 'Diluir en SF',
        nota: 'IV en bolo'
    },
    atropina_urgencia: {
        nombre: 'Atropina (Urgencia)',
        dosis: (peso) => {
            if (peso < 5) return 0.1;
            else if (peso < 30) return peso * 0.02;
            else return 0.6;
        },
        unidad: 'mg',
        presentacion: '0.5 mg/mL',
        dilucion: 'Diluir 1:10 en SF',
        nota: 'Mínimo 0.1 mg'
    },
    bicarbonato: {
        nombre: 'Bicarbonato 1M',
        dosis: (peso) => peso < 50 ? peso : 50,
        unidad: 'mL',
        presentacion: '1 M (84 mg/10mL)',
        dilucion: 'Usar sin diluir',
        nota: 'IV lenta'
    },
    boloLiquidos: {
        nombre: 'Bolo de Líquidos',
        dosis: (peso) => peso < 50 ? peso * 2 * 10 : 1000,
        unidad: 'mL',
        presentacion: 'SF o Ringer',
        dilucion: 'Usar directamente',
        nota: 'IV rápida'
    },
    flumazenilo: {
        nombre: 'Flumazenilo',
        dosis: (peso) => peso < 20 ? peso * 0.01 : 0.1,
        unidad: 'mg',
        presentacion: '0.1 mg/mL',
        dilucion: 'Diluir en SF',
        nota: 'Antagonista benzodiacepinas'
    },
    gluconato: {
        nombre: 'Gluconato Cálcico',
        dosis: (peso) => peso < 40 ? peso * 0.5 : 20,
        unidad: 'mL',
        presentacion: '100 mg/mL',
        dilucion: 'Diluir 1:1 en SF',
        nota: 'Hipercalemia'
    },
    glucosa: {
        nombre: 'Glucosa 10%',
        dosis: (peso) => peso < 50 ? peso * 2 : 100,
        unidad: 'mL',
        presentacion: '100 mg/mL',
        dilucion: 'Usar directamente',
        nota: 'Hipoglucemia'
    },
    manitol: {
        nombre: 'Manitol',
        dosis: (peso) => peso * 0.5,
        unidad: 'g',
        presentacion: '200 mg/mL',
        dilucion: 'Usar sin diluir',
        nota: 'Edema cerebral'
    },
    naloxona: {
        nombre: 'Naloxona',
        dosis: (peso) => peso * 0.01,
        unidad: 'mg',
        presentacion: '1 mg/mL',
        dilucion: 'Diluir en SF',
        nota: 'Antagonista opioides'
    },
    salinoHiper: {
        nombre: 'Salino Hipertónico',
        dosis: (peso) => peso > 50 ? 250 : peso * 5,
        unidad: 'mL',
        presentacion: 'NaCl 3% o 7.5%',
        dilucion: 'Usar directamente',
        nota: 'Shock hipovolémico'
    },
    sulfatoMg: {
        nombre: 'Sulfato de Magnesio',
        dosis: (peso) => peso < 40 ? peso * 50 : 2000,
        unidad: 'mg',
        presentacion: '500 mg/mL',
        dilucion: 'Diluir 1:4 en SF',
        nota: 'Convulsiones'
    },
    tranexamico: {
        nombre: 'Ácido Tranexámico',
        dosis: (peso) => peso < 100 ? peso * 1.5 * 10 : 1500,
        unidad: 'mg',
        presentacion: '500 mg/5mL',
        dilucion: 'Usar directamente',
        nota: 'Hemorragia'
    }
};

calcularUrgenciaBtn.addEventListener('click', () => {
    const peso = parseFloat(pesoUrgenciaInput.value);
    
    if (!isValidInput(peso)) {
        alert('Por favor, ingrese un peso válido');
        return;
    }

    urgenciaTableBody.innerHTML = '';
    
    for (const [key, med] of Object.entries(medicamentosUrgencia)) {
        let dosis = med.dosis(peso);
        
        // Formatear dosis como en la web original
        let dosisFormato = parseFloat(dosis).toFixed(2);
        if (parseFloat(dosisFormato).toFixed(1).includes('.0')) {
            dosisFormato = parseFloat(dosis).toFixed(0);
        } else if (parseFloat(dosisFormato).toFixed(2).includes('.00')) {
            dosisFormato = parseFloat(dosis).toFixed(0);
        } else {
            dosisFormato = parseFloat(dosis).toFixed(1);
        }
        
        const row = `
            <tr>
                <td><strong>${med.nombre}</strong></td>
                <td class="dosis-col">${dosisFormato} ${med.unidad}</td>
                <td>${med.presentacion}</td>
                <td><strong>${med.dilucion}</strong><br><small>${med.nota}</small></td>
            </tr>
        `;
        urgenciaTableBody.innerHTML += row;
    }
    
    showElement(resultadoUrgenciaDiv);
});

limpiarUrgenciaBtn.addEventListener('click', () => {
    pesoUrgenciaInput.value = '';
    hideElement(resultadoUrgenciaDiv);
});

// ============================================
// PERFUSIONES CONTINUAS
// ============================================

const pesoPerfusionesInput = document.getElementById('pesoPerfusiones');
const calcularPerfusionesBtn = document.getElementById('calcularPerfusiones');
const limpiarPerfusionesBtn = document.getElementById('limpiarPerfusiones');
const resultadoPerfusionesDiv = document.getElementById('resultadoPerfusiones');
const perfusionesInoTableBody = document.getElementById('perfusionesInoTableBody');
const perfusionesSedoTableBody = document.getElementById('perfusionesSedoTableBody');

const perfusionesInotrópicas = {
    adrenalina_periferico: {
        nombre: 'Adrenalina (periférica)',
        dosis: '0.05-1 mcg/kg/min',
        presentacion: '1 mg/mL - Diluir en SF'
    },
    adrenalina_central: {
        nombre: 'Adrenalina (central)',
        dosis: '0.05-1.5 mcg/kg/min',
        presentacion: '1 mg/mL - Diluir en SF'
    },
    dopamina_periferico: {
        nombre: 'Dopamina (periférica)',
        dosis: '2-10 mcg/kg/min',
        presentacion: '40 mg/mL - Diluir 200 mg en 50 mL'
    },
    dopamina_central: {
        nombre: 'Dopamina (central)',
        dosis: '2-15 mcg/kg/min',
        presentacion: '40 mg/mL - Diluir 200 mg en 50 mL'
    },
    noradrenalina: {
        nombre: 'Noradrenalina',
        dosis: '0.05-1.5 mcg/kg/min',
        presentacion: '4 mg/mL - Diluir en SF'
    },
    milrinona: {
        nombre: 'Milrinona',
        dosis: '0.25-0.75 mcg/kg/min',
        presentacion: '1 mg/mL'
    },
    labetalol: {
        nombre: 'Labetalol',
        dosis: '0.25-3 mg/kg/min',
        presentacion: '5 mg/mL'
    },
    amiodarona_inf: {
        nombre: 'Amiodarona',
        dosis: '5-15 mcg/kg/min',
        presentacion: '50 mg/mL'
    },
    insulina: {
        nombre: 'Insulina',
        dosis: '0.05-2 U/kg/h',
        presentacion: '100 U/mL'
    }
};

const perfusionesSedoanalgesia = {
    fentanilo_inf: {
        nombre: 'Fentanilo',
        dosis: '1-2 mcg/kg/h',
        presentacion: '50 mcg/mL'
    },
    ketamina_inf: {
        nombre: 'Ketamina',
        dosis: '1-2 mg/kg/h',
        presentacion: '50 mg/mL'
    },
    midazolam_inf: {
        nombre: 'Midazolam',
        dosis: '0.05-0.1 mg/kg/h',
        presentacion: '5 mg/mL'
    },
    rocuronio_inf: {
        nombre: 'Rocuronio',
        dosis: '0.01-0.02 mg/kg/min',
        presentacion: '50 mg/5mL'
    }
};

calcularPerfusionesBtn.addEventListener('click', () => {
    const peso = parseFloat(pesoPerfusionesInput.value);
    
    if (!isValidInput(peso)) {
        alert('Por favor, ingrese un peso válido');
        return;
    }

    perfusionesInoTableBody.innerHTML = '';
    perfusionesSedoTableBody.innerHTML = '';
    
    for (const [key, med] of Object.entries(perfusionesInotrópicas)) {
        const row = `
            <tr>
                <td><strong>${med.nombre}</strong></td>
                <td class="dosis-col">${med.dosis}</td>
                <td>${med.presentacion}</td>
            </tr>
        `;
        perfusionesInoTableBody.innerHTML += row;
    }

    for (const [key, med] of Object.entries(perfusionesSedoanalgesia)) {
        const row = `
            <tr>
                <td><strong>${med.nombre}</strong></td>
                <td class="dosis-col">${med.dosis}</td>
                <td>${med.presentacion}</td>
            </tr>
        `;
        perfusionesSedoTableBody.innerHTML += row;
    }
    
    showElement(resultadoPerfusionesDiv);
});

limpiarPerfusionesBtn.addEventListener('click', () => {
    pesoPerfusionesInput.value = '';
    hideElement(resultadoPerfusionesDiv);
});

// Event listeners para Enter en nuevas secciones
pesoIntubacionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calcularIntubacionBtn.click();
});

pesoUrgenciaInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calcularUrgenciaBtn.click();
});

pesoPerfusionesInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calcularPerfusionesBtn.click();
});

// ============================================
// SIGNOS VITALES
// ============================================

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
            pad: '25-45 mmHg'
        };
    } else if (edad >= 1 && edad < 2) {
        referencias = {
            fc: '90-150 lpm',
            fr: '25-50 rpm',
            pas: '80-100 mmHg',
            pad: '55-65 mmHg'
        };
    } else if (edad >= 2 && edad < 5) {
        referencias = {
            fc: '80-130 lpm',
            fr: '20-40 rpm',
            pas: '95-105 mmHg',
            pad: '60-70 mmHg'
        };
    } else if (edad >= 5 && edad < 12) {
        referencias = {
            fc: '70-110 lpm',
            fr: '18-30 rpm',
            pas: '100-120 mmHg',
            pad: '65-75 mmHg'
        };
    } else if (edad >= 12) {
        referencias = {
            fc: '60-100 lpm',
            fr: '16-20 rpm',
            pas: '110-135 mmHg',
            pad: '65-85 mmHg'
        };
    }

    return referencias;
}

obtenerSignosBtn.addEventListener('click', () => {
    const edad = parseFloat(edadSignosInput.value);

    if (!isValidInput(edad) || edad > 18) {
        alert('Por favor, ingrese una edad válida (0-18 años)');
        return;
    }

    const signos = obtenerReferenciasSignosVitales(edad);

    fcElement.textContent = signos.fc;
    frElement.textContent = signos.fr;
    pasElement.textContent = signos.pas;
    padElement.textContent = signos.pad;

    showElement(resultadoSignosDiv);
});

// ============================================
// Event Listeners para Enter
// ============================================

edadInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calcularPesoBtn.click();
});

pesoActualInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calcularDosisBtn.click();
});

edadSignosInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') obtenerSignosBtn.click();
});

// ============================================
// Inicialización
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('UCI Pediatría - Calculadora Clínica iniciada');
    // Enfoque automático en el primer input
    edadInput.focus();
});
