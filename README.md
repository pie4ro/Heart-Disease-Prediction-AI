# Heart-Disease-Prediction-AI
Sistema de predicción de riesgo de enfermedades cardíacas utilizando técnicas de Machine Learning (Random Forest) y Deep Learning. Proyecto académico basado en el dataset Cleveland de la UCI.
# Modelo Predictivo de Enfermedades Cardíacas (IA) 🫀

> **Curso:** Inteligencia Artificial: Principios y Técnicas  
> **Semestre:** 2025-20  
> **Universidad:** Universidad Privada Antenor Orrego (UPAO)

## Descripción del Proyecto
Este proyecto implementa un **Agente de Diagnóstico Médico** basado en Inteligencia Artificial capaz de predecir el riesgo de sufrir enfermedades cardíacas. El sistema analiza datos clínicos históricos utilizando técnicas de **Machine Learning (Random Forest)** y **Deep Learning (Redes Neuronales)** para identificar patrones complejos de riesgo cardiovascular.

El modelo final seleccionado (Random Forest) ha sido desplegado para asistir en la toma de decisiones clínicas, priorizando la sensibilidad (detección de casos positivos) y la interpretabilidad.

## Ficha Técnica del Modelo
Basado en la experimentación y validación cruzada, el modelo seleccionado para producción es el **Random Forest Classifier**.

| Métrica | Resultado | Interpretación |
| :--- | :--- | :--- |
| **AUC (Área Bajo la Curva)** | **0.994** | Capacidad discriminatoria casi perfecta. |
| **Sensibilidad (Recall)** | **96.63%** | Alta capacidad para detectar pacientes enfermos (pocos falsos negativos). |
| **Exactitud (Accuracy)** | **96.12%** | Precisión global del sistema. |
| **Especificidad** | **95.49%** | Capacidad para identificar correctamente a pacientes sanos. |

## Estructura del Dataset
El proyecto utiliza el **Heart Disease Dataset (Cleveland)** del repositorio UCI Machine Learning. El sistema requiere las siguientes 14 variables clínicas de entrada:

| Variable | Descripción | Tipo |
| :--- | :--- | :--- |
| `age` | Edad del paciente | Numérico |
| `sex` | Sexo (1 = hombre; 0 = mujer) | Categórico |
| `cp` | Tipo de dolor torácico (0-3) | Categórico |
| `trestbps` | Presión arterial en reposo (mm Hg) | Numérico |
| `chol` | Colesterol sérico (mg/dl) | Numérico |
| `fbs` | Azúcar en sangre en ayunas > 120 mg/dl (1 = verdaero; 0 = falso) | Binario |
| `restecg` | Resultados electrocardiográficos en reposo (0-2) | Categórico |
| `thalach` | Frecuencia cardíaca máxima alcanzada | Numérico |
| `exang` | Angina inducida por ejercicio (1 = sí; 0 = no) | Binario |
| `oldpeak` | Depresión del ST inducida por el ejercicio | Numérico |
| `slope` | Pendiente del segmento ST pico del ejercicio (0-2) | Categórico |
| `ca` | Número de vasos principales coloreados por fluoroscopia (0-3) | Numérico |
| `thal` | Talasemia (3 = normal; 6 = defecto fijo; 7 = defecto reversible) | Categórico |
| `target` | **Diagnóstico (0 = Sano / 1 = Enfermo)** | Objetivo |

## Tecnologías Utilizadas
* **Lenguaje:** Python 3.10+
* **Machine Learning:** Scikit-Learn (Random Forest, SVM)
* **Deep Learning:** TensorFlow / Keras (Sequential API)
* **Procesamiento de Datos:** Pandas, Numpy
* **Interpretabilidad (XAI):** SHAP (SHapley Additive exPlanations)
* **Despliegue:** Streamlit

## 👥 Equipo de Desarrollo
* Mirano Rios, Wilson Daniel
* Alcántara Pérez, Ofcher Anghelo Estefano
* Ordoñez Gonzales, Bruno Luis Angel
* Tandaypan Segura, Matthew
* Trelles Diaz, Frank Anderson
* Castañeda Castillo, Estanis
* Mendoza Santos, Piero
* Ramírez Castillo, Lizeth

---
*Este proyecto fue desarrollado con fines académicos para la Facultad de Ingeniería de la UPAO.*
