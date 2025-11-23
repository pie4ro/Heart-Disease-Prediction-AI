import streamlit as st
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

# --- CONFIGURACIÓN DE LA PÁGINA ---
st.set_page_config(page_title="Predicción Cardíaca IA", page_icon="🫀", layout="centered")

st.title("Sistema de Predicción de Riesgo Cardíaco")
st.markdown("Modelo Random Forest entrenado con las **14 variables** del Dataset Cleveland.")

# --- 1. ENTRENAMIENTO DEL MODELO (Robusto a errores) ---
@st.cache_resource
def train_model():
    try:
        # Carga flexible (detecta separadores automáticamente)
        df = pd.read_csv('heart_disease_uci.csv', sep=None, engine='python')
    except Exception as e:
        st.error(f"Error cargando el CSV: {e}")
        st.stop()

    # --- CORRECCIÓN DE NOMBRES DE COLUMNAS ---
    df.columns = df.columns.str.lower().str.strip()
    
    # Mapa de corrección para errores comunes en el CSV
    renames = {
        'thalch': 'thalach',    # Tu error específico
        'thalachh': 'thalach',  # Otro error común
        'chest pain type': 'cp',
        'resting bp': 'trestbps',
        'cholesterol': 'chol'
    }
    df.rename(columns=renames, inplace=True)
    
    # Limpieza de valores nulos
    df.replace(['?', 'nan', 'null'], np.nan, inplace=True)
    
    # Lista oficial de las 13 variables de entrada
    features = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 
                'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
    
    # Detección del Target
    target = 'num' if 'num' in df.columns else 'target'
    
    # Verificación de columnas
    missing = [col for col in features if col not in df.columns]
    if missing:
        st.error(f"Faltan columnas en el CSV: {missing}")
        st.stop()

    # Procesamiento numérico
    for col in features:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Filtrar filas sin diagnóstico
    if target in df.columns:
        df = df.dropna(subset=[target])
        
    # Definir X (Entrada) e y (Salida)
    y = df[target].apply(lambda x: 1 if x > 0 else 0)
    X = df[features] 

    # Imputar (Rellenar huecos)
    imputer = SimpleImputer(strategy='mean')
    X_imputed = imputer.fit_transform(X)

    # Escalar
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    # Entrenar Random Forest
    model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    model.fit(X_scaled, y)

    return model, scaler, imputer

# Ejecutar entrenamiento al iniciar
model, scaler, imputer = train_model()

# --- 2. FORMULARIO DE ENTRADA (Sidebar) ---
st.sidebar.header("Datos Clínicos del Paciente")

def get_user_input():
    # Entradas manuales para garantizar el orden correcto (13 variables)
    age = st.sidebar.number_input("Edad", 20, 100, 55)
    sex = 1 if st.sidebar.selectbox("Sexo", ["Mujer", "Hombre"]) == "Hombre" else 0
    cp = st.sidebar.selectbox("Dolor Torácico (cp)", [0, 1, 2, 3], index=3)
    trestbps = st.sidebar.number_input("Presión Arterial (mm Hg)", 80, 200, 120)
    chol = st.sidebar.number_input("Colesterol (mg/dl)", 100, 600, 200)
    fbs = 1 if st.sidebar.selectbox("Azúcar > 120 mg/dl", ["No", "Sí"]) == "Sí" else 0
    restecg = st.sidebar.selectbox("ECG Reposo", [0, 1, 2])
    thalach = st.sidebar.number_input("Frecuencia Cardíaca Máx", 60, 220, 150)
    exang = 1 if st.sidebar.selectbox("Angina x Ejercicio", ["No", "Sí"]) == "Sí" else 0
    oldpeak = st.sidebar.number_input("Depresión ST", 0.0, 10.0, 1.0, step=0.1)
    slope = st.sidebar.selectbox("Pendiente ST (slope)", [0, 1, 2], index=1)
    ca = st.sidebar.selectbox("Vasos Fluoroscopia (0-3)", [0, 1, 2, 3])
    thal = st.sidebar.selectbox("Talasemia", [3, 6, 7], index=0)

    # Creamos el DataFrame con el orden EXACTO que espera el modelo
    data = {
        'age': age, 'sex': sex, 'cp': cp, 'trestbps': trestbps, 'chol': chol,
        'fbs': fbs, 'restecg': restecg, 'thalach': thalach, 'exang': exang,
        'oldpeak': oldpeak, 'slope': slope, 'ca': ca, 'thal': thal
    }
    return pd.DataFrame(data, index=[0])

input_df = get_user_input()

# --- 3. PREDICCIÓN Y VISUALIZACIÓN ---
st.divider()
st.subheader("Diagnóstico del Sistema")

if st.button("CALCULAR RIESGO"):
    # Preprocesar la entrada del usuario
    input_imputed = imputer.transform(input_df)
    input_scaled = scaler.transform(input_imputed)
    
    # Obtener probabilidad
    prob = model.predict_proba(input_scaled)[0][1]
    
    st.info(f"Probabilidad calculada por el modelo: **{prob:.1%}**")
    st.write("---")

    # Layout de columnas: Imagen a la izquierda, Texto a la derecha
    col_img, col_txt = st.columns([1, 3])

    # Lógica de Semáforo con Imágenes
    if prob > 0.70:
        # --- ALTO RIESGO ---
        with col_img:
            # ¡IMPORTANTE! Reemplaza este link con el tuyo de 'alto.png'
            st.image("https://github.com/pie4ro/Heart-Disease-Prediction-AI/blob/main/alto_mal.png?raw=true", width=120)
        with col_txt:
            st.error("### 🚨 ALTO RIESGO DETECTADO")
            st.write("**Interpretación:** El paciente presenta un patrón clínico severo compatible con enfermedad cardíaca.")
            st.write("**Acción:** Se recomienda derivación inmediata a cardiología.")

    elif prob > 0.40:
        # --- RIESGO MODERADO ---
        with col_img:
            # ¡IMPORTANTE! Reemplaza este link con el tuyo de 'medio.png'
            st.image("https://github.com/pie4ro/Heart-Disease-Prediction-AI/blob/main/medio.png?raw=true", width=120)
        with col_txt:
            st.warning("### ⚠️ RIESGO MODERADO")
            st.write("**Interpretación:** Existen factores de riesgo considerables.")
            st.write("**Acción:** Se sugiere monitoreo periódico y exámenes complementarios.")

    else:
        # --- BAJO RIESGO ---
        with col_img:
            # ¡IMPORTANTE! Reemplaza este link con el tuyo de 'bajo.png'
            st.image("https://github.com/pie4ro/Heart-Disease-Prediction-AI/blob/main/bajo.png?raw=true", width=120)
        with col_txt:
            st.success("### ✅ BAJO RIESGO")
            st.write("**Interpretación:** Valores dentro del rango normal.")
            st.write("**Acción:** Control rutinario anual. Mantener hábitos saludables.")