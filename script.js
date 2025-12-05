// ===== CONFIGURACIÓN Y CONSTANTES =====
const API_KEY = ""; // Reemplaza con tu API Key de Gemini
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

// Nombres de características para el contexto médico
const FEATURE_NAMES = {
    age: "Edad",
    sex: "Sexo",
    cp: "Tipo de Dolor Torácico",
    trestbps: "Presión Arterial",
    chol: "Colesterol",
    fbs: "Glucosa en Ayunas",
    restecg: "ECG en Reposo",
    thalach: "Frecuencia Cardíaca Máx.",
    exang: "Angina por Ejercicio",
    oldpeak: "Depresión ST",
    slope: "Pendiente ST",
    ca: "Vasos Principales",
    thal: "Talasemia"
};

// ===== REFERENCIAS DOM =====
const form = document.getElementById('predictionForm');
const resultContainer = document.getElementById('resultContainer');
const riskCard = document.getElementById('riskCard');
const loading = document.getElementById('loading');
const initialMessage = document.getElementById('initialMessage');
const calculateBtn = document.getElementById('calculateBtn');
const buttonText = document.getElementById('buttonText');
const buttonSpinner = document.getElementById('buttonSpinner');
const resetBtn = document.getElementById('resetBtn');
const saveToHistoryBtn = document.getElementById('saveToHistory');
const historyList = document.getElementById('historyList');
const riskBar = document.getElementById('riskBar');
const totalPredictionsEl = document.getElementById('totalPredictions');
const avgRiskEl = document.getElementById('avgRisk');
// NUEVOS ELEMENTOS DE ANIMACIÓN
const riskAnimationOverlay = document.getElementById('riskAnimationOverlay');
const animationContent = document.getElementById('animationContent');
const allInputs = form.querySelectorAll('input, select');

// ===== VARIABLES GLOBALES =====
let currentPrediction = null;
let predictionHistory = [];
let totalPredictions = 0;
let avgRisk = 0;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    loadHistoryFromStorage();
    updateStats();
    checkFormValidity();
    setupEventListeners();
});

// ===== CONFIGURACIÓN DE EVENT LISTENERS =====
function setupEventListeners() {
    // Validación dinámica del formulario
    allInputs.forEach(input => {
        input.addEventListener('input', checkFormValidity);
        input.addEventListener('change', checkFormValidity);
    });

    // Submit del formulario
    form.addEventListener('submit', handleFormSubmit);

    // Botón de reinicio
    resetBtn.addEventListener('click', handleReset);

    // Botón de guardar en historial
    saveToHistoryBtn.addEventListener('click', saveCurrentPrediction);
}

// ===== VALIDACIÓN DEL FORMULARIO =====
function checkFormValidity() {
    let isComplete = true;

    allInputs.forEach(input => {
        if (!input.value || (input.type === 'number' && isNaN(parseFloat(input.value)))) {
            isComplete = false;
        }
    });

    if (isComplete) {
        calculateBtn.disabled = false;
        buttonText.textContent = 'Calcular Riesgo Cardíaco';
        calculateBtn.classList.remove('opacity-50');
    } else {
        calculateBtn.disabled = true;
        buttonText.textContent = 'Complete todos los campos';
        calculateBtn.classList.add('opacity-50');
    }
}

// ===== MANEJO DEL FORMULARIO =====
async function handleFormSubmit(event) {
    event.preventDefault();

    // Recolectar datos del formulario
    const data = {};
    allInputs.forEach(input => {
        const value = input.type === 'number' ? parseFloat(input.value) : parseInt(input.value);
        data[input.id] = value;
    });

    await handlePrediction(data);
}

// ===== PROCESO DE PREDICCIÓN (MODIFICADO) =====
async function handlePrediction(data) {
    try {
        // Mostrar loading
        showLoading();

        // Calcular predicción local (INSTANTÁNEO)
        const probability = calculateRiskProbability(data);

        // Obtener justificación de IA (RÁPIDO)
        const result = await getAIJustification(data, probability);

        // **!!! INICIAR ANIMACIÓN DE RIESGO !!!**
        triggerRiskAnimation(result.riskLevel);

        // Mostrar resultado (Añadimos un delay de 1.5 segundos, igual a la duración de la animación)
        setTimeout(() => {
            displayResult(result);
        }, 1500);

        // Guardar predicción actual
        currentPrediction = {
            data: data,
            result: result,
            timestamp: Date.now()
        };

        // Actualizar estadísticas
        updatePredictionStats(probability);

    } catch (error) {
        console.error('Error en la predicción:', error);
        showError(error.message);
    }
}

// ===== CÁLCULO DE RIESGO (MODELO HEURÍSTICO OPTIMIZADO) =====
function calculateRiskProbability(data) {
    // Coeficientes basados en el dataset Cleveland
    const weights = {
        age: 0.015,
        sex: 0.25,
        cp: -0.20,
        trestbps: 0.006,
        chol: 0.002,
        fbs: 0.12,
        restecg: -0.08,
        thalach: -0.008,
        exang: 0.25,
        oldpeak: 0.18,
        slope: -0.12,
        ca: 0.30,
        thal: 0.18
    };

    let score = 0;

    // Normalización y ajustes
    score += data.age * weights.age;
    score += data.sex * weights.sex;
    score += (3 - data.cp) * Math.abs(weights.cp); // Invertido
    score += data.trestbps * weights.trestbps;
    score += data.chol * weights.chol;
    score += data.fbs * weights.fbs;
    score += data.restecg * Math.abs(weights.restecg);
    score += (220 - data.thalach) * Math.abs(weights.thalach); // Invertido
    score += data.exang * weights.exang;
    score += data.oldpeak * weights.oldpeak;
    score += (2 - data.slope) * Math.abs(weights.slope); // Invertido
    score += data.ca * weights.ca;

    // Talasemia ajustada
    const thalAdjusted = data.thal === 7 ? 3 : (data.thal === 6 ? 2 : 0);
    score += thalAdjusted * weights.thal;

    // Normalización base
    score -= 4.5;

    // Función sigmoide para probabilidad
    const probability = 1 / (1 + Math.exp(-score));

    // Pequeña variación aleatoria para simular incertidumbre
    const variation = (Math.random() - 0.5) * 0.04;
    const finalProb = Math.min(0.99, Math.max(0.01, probability + variation));

    return finalProb;
}

// ===== OBTENER JUSTIFICACIÓN DE IA (MODIFICADO) =====
async function getAIJustification(data, probability) {
    const probPct = (probability * 100).toFixed(1);

    // Determinar nivel de riesgo
    let riskLevel, riskTitle, emoji, riskClass;

    if (probability >= 0.65) {
        riskLevel = 'high';
        riskTitle = 'ALTO RIESGO DETECTADO';
        emoji = '🚨';
        riskClass = 'risk-card-high';
    } else if (probability >= 0.35) {
        riskLevel = 'moderate';
        riskTitle = 'RIESGO MODERADO';
        emoji = '⚠️';
        riskClass = 'risk-card-moderate';
    } else {
        riskLevel = 'low';
        riskTitle = 'BAJO RIESGO';
        emoji = '✅';
        riskClass = 'risk-card-low';
    }

    // Si no hay API key, usar justificación automática
    if (!API_KEY) {
        const autoJustification = generateAutoJustification(data, probability, riskLevel);
        return {
            probability,
            probPct,
            riskLevel,
            riskTitle,
            emoji,
            riskClass,
            justification: autoJustification // La justificación es una cadena HTML en el fallback
        };
    }

    // Preparar datos para la IA
    const dataDescription = formatDataForAI(data);

    // **PROMPT DEL SISTEMA MEJORADO**
    const systemPrompt = `Eres un cardiólogo virtual. Tu objetivo es proporcionar un análisis clínico conciso, profesional y estructurado. Tu respuesta debe estar formateada como un fragmento HTML (sin las etiquetas <html>/<body>) con tres secciones principales usando etiquetas <p> con <strong>negritas</strong> y saltos de línea (<br>):
1.  **ANÁLISIS DE RIESGO**: Evalúa la probabilidad porcentual.
2.  **FACTORES CLAVE**: Menciona los 2 a 3 parámetros más críticos (ej., colesterol alto, angina, vasos oprimidos) que influyen en el resultado.
3.  **RECOMENDACIÓN CLÍNICA**: Da una recomendación médica clara basada en el nivel de riesgo (e.g., control anual, consulta inmediata, ajuste de dieta).
Asegúrate de que la salida sea un solo string HTML válido.`;

    const userQuery = `Analiza los siguientes parámetros clínicos con un riesgo predicho de ${probPct}% (Nivel: ${riskLevel.toUpperCase()}):

${dataDescription}`;

    try {
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                temperature: 0.4, // Bajar temperatura para respuestas más deterministas y estructuradas
                maxOutputTokens: 500
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Error en API: ${response.status}`);
        }

        const result = await response.json();
        const justification = result.candidates?.[0]?.content?.parts?.[0]?.text ||
            generateAutoJustification(data, probability, riskLevel);

        return {
            probability,
            probPct,
            riskLevel,
            riskTitle,
            emoji,
            riskClass,
            justification
        };

    } catch (error) {
        console.error('Error en API Gemini:', error);
        // Fallback a justificación automática
        const autoJustification = generateAutoJustification(data, probability, riskLevel);
        return {
            probability,
            probPct,
            riskLevel,
            riskTitle,
            emoji,
            riskClass,
            justification: autoJustification
        };
    }
}

// ===== FORMATEAR DATOS PARA IA (Sin cambios) =====
function formatDataForAI(data) {
    const formatted = [];

    for (const [key, value] of Object.entries(data)) {
        let displayValue = value;

        if (key === 'sex') {
            displayValue = value === 1 ? 'Masculino' : 'Femenino';
        } else if (key === 'cp') {
            const cpTypes = ['Asintomático', 'Angina Atípica', 'Dolor No Anginal', 'Angina Típica'];
            displayValue = cpTypes[value] || value;
        } else if (key === 'fbs' || key === 'exang') {
            displayValue = value === 1 ? 'Sí' : 'No';
        } else if (key === 'restecg') {
            const ecgTypes = ['Normal', 'Anormalidad ST-T', 'Hipertrofia Ventricular'];
            displayValue = ecgTypes[value] || value;
        } else if (key === 'slope') {
            const slopeTypes = ['Descendente', 'Horizontal', 'Ascendente'];
            displayValue = slopeTypes[value] || value;
        } else if (key === 'thal') {
            const thalTypes = {3: 'Normal', 6: 'Defecto Fijo', 7: 'Defecto Reversible'};
            displayValue = thalTypes[value] || value;
        }

        formatted.push(`${FEATURE_NAMES[key]}: ${displayValue}`);
    }

    return formatted.join('\n');
}

// ===== JUSTIFICACIÓN AUTOMÁTICA (FALLBACK MEJORADO) =====
function generateAutoJustification(data, probability, riskLevel) {
    const factors = [];

    // Mapeo de valores de datos a descripciones claras
    const descriptiveData = {
        'cp': ['Angina Típica', 'Angina Atípica', 'Dolor No Anginal', 'Asintomático'][3 - data.cp],
        'thal': ['Normal', 'Defecto Fijo', 'Defecto Reversible'][data.thal === 7 ? 2 : (data.thal === 6 ? 1 : 0)],
        'slope': ['Descendente', 'Horizontal', 'Ascendente'][data.slope],
    };


    // 1. Identificar factores de riesgo principales (Críticos con mayor peso)
    if (data.ca >= 2) factors.push(`${data.ca} vasos principales afectados`);
    if (data.oldpeak >= 2.0) factors.push(`Depresión ST severa (${data.oldpeak} mm)`);
    if (data.exang === 1) factors.push('Angina inducida por ejercicio (isquemia)');
    if (data.cp === 3) factors.push('Dolor Torácico de Angina Típica');
    if (data.thalach < 120 && data.age > 50) factors.push('Frecuencia Cardíaca Máx. Baja para la edad');
    if (data.trestbps >= 140) factors.push(`Presión Arterial Elevada (${data.trestbps} mm Hg)`);
    if (data.chol >= 240) factors.push(`Colesterol alto (${data.chol} mg/dl)`);
    if (data.age >= 60) factors.push('Edad avanzada');
    if (data.fbs === 1) factors.push('Glucosa en ayunas elevada');

    // 2. Construir la justificación estructurada con HTML
    let analysis = '';
    let factorsList = '';
    let recommendation = '';
    const probPct = (probability * 100).toFixed(1);

    // ANÁLISIS DE RIESGO
    if (riskLevel === 'high') {
        analysis = `<p><strong>ANÁLISIS DE RIESGO:</strong> Se ha determinado un riesgo del ${probPct}% de enfermedad cardíaca significativa. Esta predicción indica una alta necesidad de intervención inmediata.</p>`;
    } else if (riskLevel === 'moderate') {
        analysis = `<p><strong>ANÁLISIS DE RIESGO:</strong> Existe un riesgo moderado del ${probPct}%. Los parámetros sugieren precaución y la necesidad de monitoreo y cambios en el estilo de vida.</p>`;
    } else {
        analysis = `<p><strong>ANÁLISIS DE RIESGO:</strong> El riesgo es bajo (${probPct}%). La mayoría de los indicadores clínicos se encuentran en rangos saludables o aceptables.</p>`;
    }

    // FACTORES CLAVE
    if (factors.length > 0) {
        factorsList = `<p><strong>FACTORES CLAVE:</strong> Los principales parámetros que influyen en el resultado son: ${factors.slice(0, 3).join('; ')}.</p>`;
    } else {
        factorsList = `<p><strong>FACTORES CLAVE:</strong> No se identificaron factores de riesgo críticos fuera de lo normal en los datos proporcionados.</p>`;
    }

    // RECOMENDACIÓN CLÍNICA
    if (riskLevel === 'high') {
        recommendation = `<p><strong>RECOMENDACIÓN CLÍNICA:</strong> Busque una consulta **inmediata** con un cardiólogo. Se requieren pruebas avanzadas (e.g., angiografía) para confirmar el diagnóstico y planificar el tratamiento.</p>`;
    } else if (riskLevel === 'moderate') {
        recommendation = `<p><strong>RECOMENDACIÓN CLÍNICA:</strong> Programe una evaluación completa con su médico de cabecera en las próximas semanas. Inicie cambios estrictos en dieta y ejercicio.</p>`;
    } else {
        recommendation = `<p><strong>RECOMENDACIÓN CLÍNICA:</strong> Mantenga un estilo de vida saludable. Realice chequeos cardiológicos preventivos al menos una vez al año para seguimiento.</p>`;
    }

    return analysis + factorsList + recommendation;
}


// ===== MOSTRAR Y OCULTAR ANIMACIÓN DE RIESGO (Sin cambios) =====
function triggerRiskAnimation(riskLevel) {
    // Definir el emoji según el nivel de riesgo
    let emoji;
    if (riskLevel === 'high') {
        emoji = '🚨';
    } else if (riskLevel === 'moderate') {
        emoji = '⚠️';
    } else {
        emoji = '💚';
    }

    // 1. Inyectar el emoji y aplicar clases de riesgo
    animationContent.innerHTML = `<span class="overlay-emoji">${emoji}</span>`;

    // 2. Resetear clases y activar
    riskAnimationOverlay.className = 'risk-overlay active';
    animationContent.className = 'overlay-content';
    riskAnimationOverlay.classList.add(riskLevel);
    animationContent.classList.add(riskLevel);

    // 3. Desactivar después de 1.5 segundos
    setTimeout(() => {
        riskAnimationOverlay.classList.remove('active');

        // Quitar las clases y el contenido después de la transición de opacidad (0.3s)
        setTimeout(() => {
            riskAnimationOverlay.className = 'risk-overlay';
            animationContent.className = 'overlay-content';
            animationContent.innerHTML = ''; // Limpiar el emoji
        }, 500);
    }, 1500);
}

// ===== MOSTRAR LOADING (MODIFICADO) =====
function showLoading() {
    initialMessage.classList.add('hidden');
    resultContainer.classList.add('hidden');
    loading.classList.remove('hidden');

    // Asegurarse que la animación de overlay esté oculta en el estado de carga inicial
    riskAnimationOverlay.classList.remove('active');

    calculateBtn.disabled = true;
    buttonText.classList.add('hidden');
    buttonSpinner.classList.add('active');
}

// ===== MOSTRAR RESULTADO (Sin cambios) =====
function displayResult(result) {
    // Ocultar loading
    loading.classList.add('hidden');

    // Renderizar tarjeta de riesgo
    renderRiskCard(result);

    // Animar barra de riesgo
    animateRiskBar(result.probability);

    // Mostrar contenedor de resultados
    resultContainer.classList.remove('hidden');

    // Restaurar botón
    calculateBtn.disabled = false;
    buttonText.classList.remove('hidden');
    buttonSpinner.classList.remove('active');
    checkFormValidity();
}

// ===== RENDERIZAR TARJETA DE RIESGO (MODIFICADO PARA HTML) =====
function renderRiskCard(result) {
    riskCard.className = `risk-card ${result.riskClass}`;

    // La justificación ahora es HTML, por lo que usamos innerHTML
    riskCard.innerHTML = `
        <div class="risk-header">
            <span class="risk-emoji">${result.emoji}</span>
            <h3 class="risk-title">${result.riskTitle}</h3>
        </div>
        <div class="risk-percentage">${result.probPct}%</div>
        <div class="risk-justification">
            <h4>Justificación Clínica</h4>
            ${result.justification}
        </div>
    `;
}

// ===== ANIMAR BARRA DE RIESGO (Sin cambios) =====
function animateRiskBar(probability) {
    // Reset
    riskBar.style.width = '0%';

    // Animar después de un pequeño delay
    setTimeout(() => {
        const percentage = Math.max(5, probability * 100);
        riskBar.style.width = `${percentage}%`;
    }, 100);
}

// ===== MOSTRAR ERROR (Sin cambios) =====
function showError(message) {
    loading.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    riskCard.className = 'risk-card risk-card-high';
    riskCard.innerHTML = `
        <div class="risk-header">
            <span class="risk-emoji">❌</span>
            <h3 class="risk-title">ERROR EN LA PREDICCIÓN</h3>
        </div>
        <div class="risk-justification">
            <h4>Mensaje de Error</h4>
            <p>${message}</p>
            <p style="margin-top: 1rem; font-size: 0.875rem;">
                Por favor, verifica tu API Key de Gemini o intenta nuevamente.
            </p>
        </div>
    `;

    calculateBtn.disabled = false;
    buttonText.classList.remove('hidden');
    buttonSpinner.classList.remove('active');
}

// ===== REINICIAR FORMULARIO (Sin cambios) =====
function handleReset() {
    form.reset();
    checkFormValidity();

    initialMessage.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    loading.classList.add('hidden');

    riskBar.style.width = '0%';
    currentPrediction = null;
}

// ===== GUARDAR PREDICCIÓN EN HISTORIAL (Sin cambios) =====
function saveCurrentPrediction() {
    if (!currentPrediction) return;

    const historyItem = {
        id: Date.now(),
        timestamp: currentPrediction.timestamp,
        probability: currentPrediction.result.probability,
        riskLevel: currentPrediction.result.riskLevel,
        probPct: currentPrediction.result.probPct,
        data: currentPrediction.data
    };

    predictionHistory.unshift(historyItem);

    // Limitar historial a 10 items
    if (predictionHistory.length > 10) {
        predictionHistory = predictionHistory.slice(0, 10);
    }

    saveHistoryToStorage();
    renderHistory();

    // Feedback visual
    saveToHistoryBtn.textContent = '✓ Guardado en Historial';
    setTimeout(() => {
        saveToHistoryBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
            </svg>
            Guardar en Historial
        `;
    }, 2000);
}

// ===== RENDERIZAR HISTORIAL (Sin cambios) =====
function renderHistory() {
    if (predictionHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-history">No hay evaluaciones guardadas</p>';
        return;
    }

    historyList.innerHTML = predictionHistory.map(item => {
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="history-item" onclick="loadHistoryItem(${item.id})">
                <div class="history-info">
                    <span class="history-date">${formattedDate}</span>
                    <span class="history-risk ${item.riskLevel}">${item.probPct}% - ${getRiskLabel(item.riskLevel)}</span>
                </div>
                <button class="history-delete" onclick="deleteHistoryItem(event, ${item.id})">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
}

// ===== OBTENER ETIQUETA DE RIESGO (Sin cambios) =====
function getRiskLabel(riskLevel) {
    const labels = {
        'low': 'Bajo Riesgo',
        'moderate': 'Riesgo Moderado',
        'high': 'Alto Riesgo'
    };
    return labels[riskLevel] || riskLevel;
}

// ===== CARGAR ITEM DEL HISTORIAL (Sin cambios) =====
window.loadHistoryItem = function(id) {
    const item = predictionHistory.find(h => h.id === id);
    if (!item) return;

    // Cargar datos en el formulario
    for (const [key, value] of Object.entries(item.data)) {
        const input = document.getElementById(key);
        if (input) {
            input.value = value;
        }
    }

    // Scroll al formulario
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== ELIMINAR ITEM DEL HISTORIAL (Sin cambios) =====
window.deleteHistoryItem = function(event, id) {
    event.stopPropagation();

    predictionHistory = predictionHistory.filter(h => h.id !== id);
    saveHistoryToStorage();
    renderHistory();
    updateStats();
}

// ===== ACTUALIZAR ESTADÍSTICAS (Sin cambios) =====
function updatePredictionStats(probability) {
    totalPredictions++;

    // Calcular promedio de riesgo
    const totalRisk = predictionHistory.reduce((sum, item) => sum + item.probability, 0) + probability;
    avgRisk = totalRisk / (predictionHistory.length + 1);

    updateStats();
}

function updateStats() {
    totalPredictionsEl.textContent = totalPredictions;
    avgRiskEl.textContent = `${(avgRisk * 100).toFixed(1)}%`;
}

// ===== ALMACENAMIENTO LOCAL (Sin cambios) =====
function saveHistoryToStorage() {
    try {
        localStorage.setItem('cardiacPredictionHistory', JSON.stringify(predictionHistory));
        localStorage.setItem('cardiacTotalPredictions', totalPredictions.toString());
        localStorage.setItem('cardiacAvgRisk', avgRisk.toString());
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }
}

function loadHistoryFromStorage() {
    try {
        const savedHistory = localStorage.getItem('cardiacPredictionHistory');
        const savedTotal = localStorage.getItem('cardiacTotalPredictions');
        const savedAvg = localStorage.getItem('cardiacAvgRisk');

        if (savedHistory) {
            predictionHistory = JSON.parse(savedHistory);
            renderHistory();
        }

        if (savedTotal) {
            totalPredictions = parseInt(savedTotal);
        }

        if (savedAvg) {
            avgRisk = parseFloat(savedAvg);
        }
    } catch (error) {
        console.error('Error al cargar desde localStorage:', error);
        predictionHistory = [];
        totalPredictions = 0;
        avgRisk = 0;
    }
}

// ===== EXPORTAR DATOS (FUNCIONALIDAD ADICIONAL) (Sin cambios) =====
function exportHistory() {
    if (predictionHistory.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const dataStr = JSON.stringify(predictionHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historial-cardiopredict-${Date.now()}.json`;
    link.click();
}

// Hacer disponible globalmente si es necesario
window.exportHistory = exportHistory;