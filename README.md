🩺 Heart-Disease-Prediction-AI: Agente Predictivo de Riesgo Cardíaco
🚀 Visión General del Proyecto
Este proyecto implementa un Agente de Diagnóstico Médico basado en Inteligencia Artificial (IA) capaz de predecir el riesgo de sufrir enfermedades cardíacas en pacientes. El sistema fue desarrollado como un proyecto académico utilizando técnicas avanzadas de Machine Learning (ML) y Deep Learning (DL).

Curso: Inteligencia Artificial: Principios y Técnicas

Semestre: 2025-20

Universidad: Universidad Privada Antenor Orrego (UPAO)

Objetivo Principal: Asistir en la toma de decisiones clínicas, priorizando la sensibilidad (detección de casos positivos) y la interpretabilidad.

Nota: Este sistema es un proyecto académico de apoyo al diagnóstico y no debe reemplazar la evaluación ni el juicio clínico de un profesional de la salud certificado.

🧠 Modelo Predictivo Seleccionado
Basado en la experimentación, validación cruzada y el requisito de alta sensibilidad, el modelo seleccionado para el despliegue es el Random Forest Classifier.

Ficha Técnica y Métricas de Validación
Métrica	Resultado	Interpretación
AUC (Área Bajo la Curva)	0.994	Capacidad discriminatoria casi perfecta del modelo.
Sensibilidad (Recall)	96.63%	Capacidad alta para detectar pacientes enfermos (minimiza falsos negativos).
Exactitud (Accuracy)	96.12%	Precisión global del sistema en el conjunto de prueba.
Especificidad	95.49%	Capacidad para identificar correctamente a pacientes sanos.

Exportar a Hojas de cálculo

📊 Estructura del Dataset (Cleveland)
El modelo fue entrenado con el Heart Disease Dataset (Cleveland) y requiere la entrada de 13 variables clínicas para generar la predicción (target).

Variable	Tipo	Descripción	Unidad / Rango
age	Numérico	Edad del paciente	Años
sex	Categórico	Sexo (1 = hombre; 0 = mujer)	Binario
cp	Categórico	Tipo de dolor torácico	0 a 3
trestbps	Numérico	Presión arterial en reposo	mm Hg
chol	Numérico	Colesterol sérico	mg/dl
fbs	Binario	Azúcar en sangre en ayunas > 120 mg/dl	0 o 1
thalach	Numérico	Frecuencia cardíaca máxima alcanzada	lpm
exang	Binario	Angina inducida por ejercicio	0 o 1
oldpeak	Numérico	Depresión del segmento ST inducida por el ejercicio	mm
ca	Numérico	Vasos principales coloreados por fluoroscopia	0 a 3
thal	Categórico	Talasemia	3, 6, o 7
restecg, slope	Categórico	(Otros parámetros de ECG y ST)	0 a 2
target	Objetivo	Diagnóstico (0 = Sano / 1 = Enfermo)	N/A

Exportar a Hojas de cálculo

💻 Tecnologías y Fuentes de Datos
Esta sección detalla las herramientas y recursos esenciales utilizados para la experimentación, desarrollo y documentación del proyecto.

A. Entorno y Librerías de IA/ML
Categoría	Tecnología/Librería	Propósito y Función
Lenguaje Base	Python 3.10+	Lenguaje primario para el desarrollo del modelo.
ML/DL	Scikit-Learn, TensorFlow / Keras	Frameworks para la construcción y validación de los modelos Random Forest y Redes Neuronales.
Procesamiento	Pandas, Numpy	Gestión, limpieza y manipulación de los datos.
Interpretabilidad	SHAP (SHapley Additive exPlanations)	Herramienta esencial para la Interpretabilidad (XAI). Utilizada para explicar cómo cada parámetro contribuye a la predicción final.
Despliegue	Streamlit	Framework utilizado para crear el Dashboard de la interfaz web interactiva.

Exportar a Hojas de cálculo

B. Fuentes de Datos y Referencias Académicas
Recurso	Enlace o Referencia	Utilidad
Dataset Principal	UCI Machine Learning Repository: Heart Disease Data Set	Fuente de los 14 atributos clínicos (Cleveland) usados para el entrenamiento y validación del modelo.
Modelo Matemático Web	Regresión Logística Simplificada	Base teórica para el modelo heurístico (cálculo de riesgo) implementado en script.js.
Análisis Clínico	API de Google Gemini	Herramienta de IA utilizada para la generación de la Justificación Clínica estructurada y la explicación de Factores Clave.
👥 Equipo de Desarrollo
Este proyecto fue desarrollado con fines académicos para la Facultad de Ingeniería de la UPAO por:

Mirano Rios, Wilson Daniel

Alcántara Pérez, Ofcher Anghelo Estefano

Ordoñez Gonzales, Bruno Luis Angel

Tandaypan Segura, Matthew

Trelles Diaz, Frank Anderson

Castañeda Castillo, Estanis

Mendoza Santos, Piero

Ramírez Castillo, Lizeth
