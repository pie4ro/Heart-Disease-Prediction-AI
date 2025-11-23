import streamlit as st
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Configuración de la página
st.set_page_config(page_title="Predicción Cardíaca IA", page_icon="🫀", layout="centered")

# Título y Descripción
st.title("🫀 Sistema de Predicción de Riesgo Cardíaco")
st.markdown("""
Esta aplicación utiliza un modelo de **Random Forest** entrenado con el dataset de Cleveland 
para predecir la probabilidad de enfermedad cardíaca en tiempo real.
""")

# --- 1. CARGA Y ENTRENAMIENTO AUTOMÁTICO ---
@st.cache_resource
def train_model():
    # Cargamos el dataset directamente desde tu repositorio o local
    # Asegúrate que el nombre del archivo coincida con el que subiste a GitHub
    try:
        df = pd.read_csv('heart_disease_uci.csv') 
    except:
        st.error("No se encontró el archivo 'heart_disease_uci.csv' en el repositorio.")
        st.stop()
    
    # Preprocesamiento básico (Simulado para producción)
    # Convertimos variables categóricas si es necesario o eliminamos nulos
    df = df.dropna()
    
    # Definir X e y (Asumiendo que la columna objetivo es 'num' o 'target')
    # Ajusta 'num' si tu csv tiene otro nombre para el target
    target_col = 'num' if 'num' in df.columns else 'target'
    
    X = df.drop(columns=[target_col, 'id', 'dataset'], errors='ignore')
    y = df[target_col].apply(lambda x: 1 if x > 0 else 0) # Convertir a binario
    
    # Guardamos nombres de columnas para el input
    feature_names = X.columns.tolist()
    
    # Escalado
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Entrenamiento Random Forest
    model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    model.fit(X_scaled, y)
    
    return model, scaler, feature_names

# Entrenamos el modelo al iniciar la app
model, scaler, feature_names = train_model()

# --- 2. FORMULARIO DE ENTRADA (SIDEBAR) ---
st.sidebar.header("Datos Clínicos del Paciente")

def user_input_features():
    age = st.sidebar.slider('Edad', 20, 90, 54)
    sex_label = st.sidebar.selectbox('Sexo', ('Hombre', 'Mujer'))
    sex = 1 if sex_label == 'Hombre' else 0
    
    cp_label = st.sidebar.selectbox('Tipo de Dolor Torácico (cp)', 
                                    ('Típico', 'Atípico', 'No Anginal', 'Asintomático'))
    cp_map = {'Típico': 0, 'Atípico': 1, 'No Anginal': 2, 'Asintomático': 3}
    cp = cp_map[cp_label]
    
    trestbps = st.sidebar.slider('Presión Arterial (trestbps)', 90, 200, 120)
    chol = st.sidebar.slider('Colesterol (chol)', 100, 600, 200)
    
    fbs_label = st.sidebar.selectbox('Glucosa en Ayunas > 120 mg/dl', ('No', 'Sí'))
    fbs = 1 if fbs_label == 'Sí' else 0
    
    restecg = st.sidebar.selectbox('Resultados ECG Reposo', (0, 1, 2))
    thalach = st.sidebar.slider('Frecuencia Cardíaca Máx.', 60, 220, 150)
    
    exang_label = st.sidebar.selectbox('Angina por Ejercicio', ('No', 'Sí'))
    exang = 1 if exang_label == 'Sí' else 0
    
    oldpeak = st.sidebar.slider('Depresión del ST (oldpeak)', 0.0, 6.0, 1.0)
    slope = st.sidebar.selectbox('Pendiente ST (slope)', (0, 1, 2))
    ca = st.sidebar.selectbox('Vasos Fluoroscopia (ca)', (0, 1, 2, 3))
    
    thal_label = st.sidebar.selectbox('Talasemia (thal)', ('Normal', 'Defecto Fijo', 'Reversible'))
    thal_map = {'Normal': 3, 'Defecto Fijo': 6, 'Reversible': 7}
    thal = thal_map[thal_label]

    # Crear diccionario con los datos
    data = {
        'age': age, 'sex': sex, 'cp': cp, 'trestbps': trestbps, 'chol': chol,
        'fbs': fbs, 'restecg': restecg, 'thalach': thalach, 'exang': exang,
        'oldpeak': oldpeak, 'slope': slope, 'ca': ca, 'thal': thal
    }
    
    # Asegurarnos de tener todas las columnas que espera el modelo (si faltara alguna en el csv original)
    features = pd.DataFrame(data, index=[0])
    return features

input_df = user_input_features()

# --- 3. PANEL PRINCIPAL Y PREDICCIÓN ---
st.subheader('Resumen de Datos Ingresados')
st.write(input_df)

st.divider()

if st.button('EJECUTAR DIAGNÓSTICO IA'):
    # Escalar datos de entrada
    input_scaled = scaler.transform(input_df)
    
    # Predicción
    prediction = model.predict(input_scaled)
    probability = model.predict_proba(input_scaled)[0][1]
    
    st.subheader('Resultados del Análisis:')
    
    if probability > 0.70:
        st.error(f"🚨 ALTO RIESGO DETECTADO: {(probability*100):.2f}%")
        st.write("El modelo identifica patrones consistentes con enfermedad cardíaca. Se sugiere derivación inmediata.")
    elif probability > 0.40:
        st.warning(f"⚠️ RIESGO MODERADO: {(probability*100):.2f}%")
        st.write("Existen factores de riesgo. Se recomienda monitoreo.")
    else:
        st.success(f"✅ BAJO RIESGO: {(probability*100):.2f}%")
        st.write("Perfil compatible con paciente sano.")