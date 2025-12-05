// ===== CONFIGURACIÓN Y CONSTANTES =====
const API_KEY = ""; // Reemplaza con tu API Key de Gemini. Necesaria para generar justificaciones clínicas por IA. Si está vacía, se usa una justificación de fallback.
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

// Nombres de las características del dataset de Cleveland, traducidos para una presentación más amigable en la UI y para el prompt de la IA.
const FEATURE_NAMES = {
    age: "Edad",
    sex: "Sexo",
    cp: "Tipo de Dolor Torácico", // Chest Pain Type
    trestbps: "Presión Arterial", // Resting Blood Pressure
    chol: "Colesterol", // Serum Cholesterol
    fbs: "Glucosa en Ayunas", // Fasting Blood Sugar
    restecg: "ECG en Reposo", // Resting Electrocardiographic Results
    thalach: "Frecuencia Cardíaca Máx.", // Maximum Heart Rate Achieved
    exang: "Angina por Ejercicio", // Exercise Induced Angina
    oldpeak: "Depresión ST", // ST Depression Induced by Exercise
    slope: "Pendiente ST", // Slope of the Peak Exercise ST Segment
    ca: "Vasos Principales", // Number of Major Vessels Colored by Fluoroscopy
    thal: "Talasemia" // Thalassemia (Blood Disorder)
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
// NUEVOS ELEMENTOS DE ANIMACIÓN (Overlay que cubre la pantalla al dar el resultado)
const riskAnimationOverlay = document.getElementById('riskAnimationOverlay');
const animationContent = document.getElementById('animationContent');
const allInputs = form.querySelectorAll('input, select');

// ===== VARIABLES GLOBALES =====
let currentPrediction = null; // Almacena temporalmente el último resultado de la predicción para poder guardarlo en el historial.
let predictionHistory = []; // Array que guarda las predicciones anteriores (limitado a 10 items).
let totalPredictions = 0; // Contador de predicciones realizadas.
let avgRisk = 0; // Riesgo promedio calculado de todas las predicciones en el historial.

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    // 1. Carga el historial y las estadísticas guardadas en el almacenamiento local.
    loadHistoryFromStorage();
    // 2. Muestra las estadísticas en el encabezado.
    updateStats();
    // 3. Verifica si el formulario inicial ya está completo para habilitar el botón.
    checkFormValidity();
    // 4. Configura todos los event listeners de la aplicación.
    setupEventListeners();
});

// ===== CONFIGURACIÓN DE EVENT LISTENERS =====
/**
 * Configura todos los escuchadores de eventos principales de la aplicación.
 */
function setupEventListeners() {
    // Validación dinámica del formulario: Habilita/Deshabilita el botón "Calcular" según si todos los campos están llenos.
    allInputs.forEach(input => {
        input.addEventListener('input', checkFormValidity);
        input.addEventListener('change', checkFormValidity);
    });

    // Submit del formulario: Inicia el proceso de predicción.
    form.addEventListener('submit', handleFormSubmit);

    // Botón de reinicio: Limpia el formulario y la vista de resultados.
    resetBtn.addEventListener('click', handleReset);

    // Botón de guardar en historial: Guarda la predicción actual en el almacenamiento local.
    saveToHistoryBtn.addEventListener('click', saveCurrentPrediction);
}

// ===== VALIDACIÓN DEL FORMULARIO =====
/**
 * Verifica si todos los campos del formulario tienen un valor válido.
 * Habilita o deshabilita el botón de cálculo y actualiza su texto.
 */
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
/**
 * Maneja el envío del formulario. Recolecta los datos de entrada
 * y comienza el proceso de predicción.
 * @param {Event} event - El evento de envío del formulario.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    // Recolectar datos del formulario como un objeto key: value.
    const data = {};
    allInputs.forEach(input => {
        // Convierte valores numéricos a float/int.
        const value = input.type === 'number' ? parseFloat(input.value) : parseInt(input.value);
        data[input.id] = value;
    });

    await handlePrediction(data);
}

// ===== PROCESO DE PREDICCIÓN (MODIFICADO) =====
/**
 * Flujo principal de la predicción: 1. Cálculo local, 2. Justificación IA, 3. Animación, 4. Display.
 * @param {Object} data - Los datos clínicos recolectados del formulario.
 */
async function handlePrediction(data) {
    try {
        // 1. Mostrar loading y deshabilitar botón.
        showLoading();

        // 2. Calcular predicción local (INSTANTÁNEO) usando el modelo heurístico.
        const probability = calculateRiskProbability(data);

        // 3. Obtener justificación de IA (RÁPIDO - usando Gemini o fallback).
        const result = await getAIJustification(data, probability);

        // **!!! INICIAR ANIMACIÓN DE RIESGO !!!** (Efecto visual que cubre la pantalla)
        triggerRiskAnimation(result.riskLevel);

        // 4. Mostrar resultado (Añadimos un delay de 1.5 segundos, igual a la duración de la animación para sincronizar la UI).
        setTimeout(() => {
            displayResult(result);
        }, 1500);

        // 5. Guardar predicción actual para el botón "Guardar en Historial".
        currentPrediction = {
            data: data,
            result: result,
            timestamp: Date.now()
        };

        // 6. Actualizar las estadísticas globales.
        updatePredictionStats(probability);

    } catch (error) {
        console.error('Error en la predicción:', error);
        showError(error.message); // Muestra un mensaje de error en la tarjeta de resultados.
    }
}

// ===== CÁLCULO DE RIESGO (MODELO HEURÍSTICO OPTIMIZADO) =====
/**
 * Implementa un modelo heurístico (regresión logística simplificada)
 * para calcular la probabilidad de enfermedad cardíaca.
 * Los pesos se basan en coeficientes típicos de modelos entrenados con el dataset de Cleveland.
 * @param {Object} data - Los datos clínicos del paciente.
 * @returns {number} La probabilidad de riesgo entre 0.01 y 0.99.
 */
function calculateRiskProbability(data) {
    // Coeficientes basados en el dataset Cleveland (pesos)
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

    let score = 0; // La puntuación de riesgo (input de la función sigmoide).

    // CÁLCULO DE LA PUNTUACIÓN LINEAL (Score = Suma(peso * valor))
    score += data.age * weights.age;
    score += data.sex * weights.sex;
    // Ajuste para variables donde un valor más bajo es mejor (cp, restecg, thalach, slope).
    score += (3 - data.cp) * Math.abs(weights.cp); // Invertido: 3 es mejor, 0 es peor.
    score += data.trestbps * weights.trestbps;
    score += data.chol * weights.chol;
    score += data.fbs * weights.fbs;
    score += data.restecg * Math.abs(weights.restecg);
    score += (220 - data.thalach) * Math.abs(weights.thalach); // Invertido: Frecuencia más baja es peor.
    score += data.exang * weights.exang;
    score += data.oldpeak * weights.oldpeak;
    score += (2 - data.slope) * Math.abs(weights.slope); // Invertido: 2 es mejor (ascendente), 0 es peor (descendente).
    score += data.ca * weights.ca;

    // Talasemia ajustada (3=Normal, 6=Fijo, 7=Reversible -> 0, 2, 3)
    const thalAdjusted = data.thal === 7 ? 3 : (data.thal === 6 ? 2 : 0);
    score += thalAdjusted * weights.thal;

    // Normalización base (intercepto, ajustado empíricamente)
    score -= 4.5;

    // Función sigmoide para convertir el score lineal a una probabilidad (0 a 1)
    // P = 1 / (1 + e^(-score))
    const probability = 1 / (1 + Math.exp(-score));

    // Pequeña variación aleatoria para simular incertidumbre y evitar resultados idénticos.
    const variation = (Math.random() - 0.5) * 0.04;
    const finalProb = Math.min(0.99, Math.max(0.01, probability + variation)); // Limita la probabilidad entre 1% y 99%.

    return finalProb;
}

// ===== OBTENER JUSTIFICACIÓN DE IA (MODIFICADO) =====
/**
 * Determina el nivel de riesgo y genera la justificación clínica.
 * Utiliza la API de Gemini para la justificación si se proporciona una API_KEY.
 * @param {Object} data - Los datos clínicos.
 * @param {number} probability - La probabilidad de riesgo calculada.
 * @returns {Object} Un objeto con el resultado, el nivel de riesgo y la justificación.
 */
async function getAIJustification(data, probability) {
    const probPct = (probability * 100).toFixed(1);

    // Determinar nivel de riesgo (se utiliza un sistema de umbrales)
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

    // Fallback: Si no hay API key, usa la justificación automática pre-programada.
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

    // Preparar datos para el prompt de la IA.
    const dataDescription = formatDataForAI(data);

    // **PROMPT DEL SISTEMA MEJORADO**: Guía a la IA para actuar como un cardiólogo virtual.
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
                temperature: 0.4, // Baja temperatura para respuestas más deterministas y estructuradas.
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
        // Extrae el texto de la respuesta o usa el fallback si la respuesta es incompleta.
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
        // Fallback en caso de error de red o de la API.
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
/**
 * Convierte los valores numéricos/codificados del formulario a descripciones de texto claras
 * para ser incluidas en el prompt de la IA.
 * @param {Object} data - Los datos clínicos.
 * @returns {string} Una cadena con cada característica y su valor legible (e.g., "Edad: 55").
 */
function formatDataForAI(data) {
    const formatted = [];

    for (const [key, value] of Object.entries(data)) {
        let displayValue = value;

        // Mapeo de valores codificados a texto (basado en la documentación del dataset).
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
/**
 * Genera una justificación clínica predefinida en formato HTML.
 * Se utiliza cuando la API_KEY de Gemini no está configurada o falla.
 * @param {Object} data - Los datos clínicos.
 * @param {number} probability - La probabilidad de riesgo.
 * @param {string} riskLevel - El nivel de riesgo ('low', 'moderate', 'high').
 * @returns {string} Un fragmento HTML con el análisis, factores clave y recomendación.
 */
function generateAutoJustification(data, probability, riskLevel) {
    const factors = [];

    // Lógica simplificada para identificar factores de riesgo clave
    if (data.ca >= 2) factors.push(`${data.ca} vasos principales afectados`);
    if (data.oldpeak >= 2.0) factors.push(`Depresión ST severa (${data.oldpeak} mm)`);
    if (data.exang === 1) factors.push('Angina inducida por ejercicio (isquemia)');
    if (data.cp === 3) factors.push('Dolor Torácico de Angina Típica');
    if (data.thalach < 120 && data.age > 50) factors.push('Frecuencia Cardíaca Máx. Baja para la edad');
    if (data.trestbps >= 140) factors.push(`Presión Arterial Elevada (${data.trestbps} mm Hg)`);
    if (data.chol >= 240) factors.push(`Colesterol alto (${data.chol} mg/dl)`);
    if (data.age >= 60) factors.push('Edad avanzada');
    if (data.fbs === 1) factors.push('Glucosa en ayunas elevada');

    // Construir la justificación estructurada con HTML
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
        // Muestra hasta 3 factores principales.
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
/**
 * Activa la animación visual en pantalla completa (overlay)
 * para señalar el nivel de riesgo de forma impactante.
 * @param {string} riskLevel - 'low', 'moderate', o 'high'.
 */
function triggerRiskAnimation(riskLevel) {
    // Define el emoji basado en el nivel de riesgo
    let emoji;
    if (riskLevel === 'high') {
        emoji = '🚨';
    } else if (riskLevel === 'moderate') {
        emoji = '⚠️';
    } else {
        emoji = '💚';
    }

    // 1. Inyectar el emoji y aplicar clases de riesgo para estilos y animaciones CSS.
    animationContent.innerHTML = `<span class="overlay-emoji">${emoji}</span>`;

    // 2. Resetear clases y activar el overlay.
    riskAnimationOverlay.className = 'risk-overlay active';
    animationContent.className = 'overlay-content';
    riskAnimationOverlay.classList.add(riskLevel);
    animationContent.classList.add(riskLevel);

    // 3. Desactivar después de 1.5 segundos (sincronizado con la duración de la animación en CSS).
    setTimeout(() => {
        riskAnimationOverlay.classList.remove('active');

        // Limpia las clases y el contenido después de que la transición de opacidad termine (en CSS es 0.4s + 0.1s de margen).
        setTimeout(() => {
            riskAnimationOverlay.className = 'risk-overlay';
            animationContent.className = 'overlay-content';
            animationContent.innerHTML = ''; // Limpiar el emoji
        }, 500);
    }, 1500);
}

// ===== MOSTRAR LOADING (MODIFICADO) =====
/**
 * Muestra el estado de carga y oculta el mensaje inicial y los resultados.
 */
function showLoading() {
    initialMessage.classList.add('hidden');
    resultContainer.classList.add('hidden');
    loading.classList.remove('hidden');

    // Asegura que el overlay de la animación esté oculto mientras se carga.
    riskAnimationOverlay.classList.remove('active');

    // Deshabilita y muestra el spinner en el botón de calcular.
    calculateBtn.disabled = true;
    buttonText.classList.add('hidden');
    buttonSpinner.classList.add('active');
}

// ===== MOSTRAR RESULTADO (Sin cambios) =====
/**
 * Oculta el estado de carga y muestra el contenedor de resultados.
 * @param {Object} result - El objeto de resultado de la predicción.
 */
function displayResult(result) {
    // Ocultar loading
    loading.classList.add('hidden');

    // Renderizar tarjeta de riesgo con el resultado de la IA/Fallback.
    renderRiskCard(result);

    // Animar barra de riesgo para mostrar la probabilidad.
    animateRiskBar(result.probability);

    // Mostrar contenedor de resultados
    resultContainer.classList.remove('hidden');

    // Restaurar el botón a su estado normal (Habilitado si el formulario sigue completo).
    calculateBtn.disabled = false;
    buttonText.classList.remove('hidden');
    buttonSpinner.classList.remove('active');
    checkFormValidity();
}

// ===== RENDERIZAR TARJETA DE RIESGO (MODIFICADO PARA HTML) =====
/**
 * Renderiza la tarjeta principal de resultados, incluyendo la justificación clínica.
 * @param {Object} result - El objeto de resultado de la predicción.
 */
function renderRiskCard(result) {
    // Aplica la clase de estilo (low, moderate, high)
    riskCard.className = `risk-card ${result.riskClass}`;

    // La justificación es HTML, por lo que se usa innerHTML directamente.
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
/**
 * Controla la animación CSS de la barra de riesgo para que se extienda
 * visualmente hasta el porcentaje calculado.
 * @param {number} probability - Probabilidad entre 0 y 1.
 */
function animateRiskBar(probability) {
    // Reset para que la animación se dispare de nuevo.
    riskBar.style.width = '0%';

    // Animar después de un pequeño delay para asegurar el reset.
    setTimeout(() => {
        // Asegura un mínimo de 5% para que la barra sea visible incluso con riesgo muy bajo.
        const percentage = Math.max(5, probability * 100);
        riskBar.style.width = `${percentage}%`;
    }, 100);
}

// ===== MOSTRAR ERROR (Sin cambios) =====
/**
 * Muestra un mensaje de error en la tarjeta de resultados.
 * @param {string} message - El mensaje de error a mostrar.
 */
function showError(message) {
    // Oculta loading y muestra el contenedor de resultados
    loading.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    // Muestra la tarjeta con estilo de "high risk" para destacar el error.
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

    // Restaura el botón.
    calculateBtn.disabled = false;
    buttonText.classList.remove('hidden');
    buttonSpinner.classList.remove('active');
}

// ===== REINICIAR FORMULARIO (Sin cambios) =====
/**
 * Limpia el formulario y resetea la vista a su estado inicial.
 */
function handleReset() {
    form.reset();
    checkFormValidity(); // Re-chequea la validez (deshabilita el botón).

    // Muestra el mensaje inicial y oculta los resultados.
    initialMessage.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    loading.classList.add('hidden');

    // Resetea la barra de riesgo y la predicción actual.
    riskBar.style.width = '0%';
    currentPrediction = null;
}

// ===== GUARDAR PREDICCIÓN EN HISTORIAL (Sin cambios) =====
/**
 * Guarda la predicción almacenada en `currentPrediction` en el historial.
 * Limita el historial a los 10 elementos más recientes.
 */
function saveCurrentPrediction() {
    if (!currentPrediction) return; // No hace nada si no hay una predicción reciente.

    const historyItem = {
        id: Date.now(), // ID único basado en el timestamp.
        timestamp: currentPrediction.timestamp,
        probability: currentPrediction.result.probability,
        riskLevel: currentPrediction.result.riskLevel,
        probPct: currentPrediction.result.probPct,
        data: currentPrediction.data
    };

    predictionHistory.unshift(historyItem); // Agrega al inicio para que el más reciente esté primero.

    // Limitar historial a 10 items
    if (predictionHistory.length > 10) {
        predictionHistory = predictionHistory.slice(0, 10);
    }

    saveHistoryToStorage(); // Guarda el array actualizado en localStorage.
    renderHistory(); // Re-renderiza la lista.

    // Feedback visual al usuario de que se guardó.
    saveToHistoryBtn.textContent = '✓ Guardado en Historial';
    setTimeout(() => {
        // Restaura el contenido original del botón.
        saveToHistoryBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
            </svg>
            Guardar en Historial
        `;
    }, 2000);
}

// ===== RENDERIZAR HISTORIAL (Sin cambios) =====
/**
 * Renderiza la lista completa del historial de predicciones.
 */
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

        // Crea el markup HTML para cada elemento del historial.
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
/**
 * Traduce el nivel de riesgo ('low', 'moderate', 'high') a una etiqueta legible.
 * @param {string} riskLevel - El nivel de riesgo.
 * @returns {string} La etiqueta de riesgo.
 */
function getRiskLabel(riskLevel) {
    const labels = {
        'low': 'Bajo Riesgo',
        'moderate': 'Riesgo Moderado',
        'high': 'Alto Riesgo'
    };
    return labels[riskLevel] || riskLevel;
}

// ===== CARGAR ITEM DEL HISTORIAL (Sin cambios) =====
/**
 * Carga los datos de un elemento del historial de vuelta al formulario.
 * Está disponible globalmente (window.loadHistoryItem).
 * @param {number} id - ID del elemento del historial.
 */
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

    // Scroll al formulario para que el usuario vea los datos cargados.
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== ELIMINAR ITEM DEL HISTORIAL (Sin cambios) =====
/**
 * Elimina un elemento del historial.
 * Está disponible globalmente (window.deleteHistoryItem).
 * @param {Event} event - El evento de click para evitar la propagación (que cargaría el item).
 * @param {number} id - ID del elemento a eliminar.
 */
window.deleteHistoryItem = function(event, id) {
    event.stopPropagation(); // Previene que se active el evento 'loadHistoryItem' del contenedor padre.

    // Filtra el array para excluir el elemento con el ID dado.
    predictionHistory = predictionHistory.filter(h => h.id !== id);
    saveHistoryToStorage();
    renderHistory();
    updateStats();
}

// ===== ACTUALIZAR ESTADÍSTICAS (Sin cambios) =====
/**
 * Calcula y actualiza las estadísticas globales (total de predicciones y riesgo promedio).
 * @param {number} probability - La probabilidad de la última predicción.
 */
function updatePredictionStats(probability) {
    totalPredictions++;

    // Recalcula el promedio de riesgo.
    const totalRisk = predictionHistory.reduce((sum, item) => sum + item.probability, 0) + probability;
    // La nueva cantidad es el historial actual + la predicción recién hecha.
    avgRisk = totalRisk / (predictionHistory.length + 1);

    updateStats();
}

/**
 * Muestra las estadísticas globales en la interfaz (header).
 */
function updateStats() {
    totalPredictionsEl.textContent = totalPredictions;
    avgRiskEl.textContent = `${(avgRisk * 100).toFixed(1)}%`;
}

// ===== ALMACENAMIENTO LOCAL (Sin cambios) =====
/**
 * Guarda el historial y las estadísticas en el localStorage del navegador.
 */
function saveHistoryToStorage() {
    try {
        localStorage.setItem('cardiacPredictionHistory', JSON.stringify(predictionHistory));
        localStorage.setItem('cardiacTotalPredictions', totalPredictions.toString());
        localStorage.setItem('cardiacAvgRisk', avgRisk.toString());
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }
}

/**
 * Carga el historial y las estadísticas desde el localStorage.
 */
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
        // Si hay un error, inicializa las variables a cero.
        predictionHistory = [];
        totalPredictions = 0;
        avgRisk = 0;
    }
}

// ===== EXPORTAR DATOS (FUNCIONALIDAD ADICIONAL) (Sin cambios) =====
/**
 * Permite al usuario descargar el historial de predicciones como un archivo JSON.
 * Está disponible globalmente (window.exportHistory).
 */
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

// Hace la función de exportar accesible globalmente, por si se añade un botón en el HTML.
window.exportHistory = exportHistory;
