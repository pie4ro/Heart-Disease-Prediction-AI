import streamlit as st
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer # <--- IMPORTANTE: Para rellenar datos

# Configuración de la página
st.set_page_config(page_title="Predicción Cardíaca IA", page_icon="🫀", layout="centered")

st.title("🫀 Sistema de Predicción de Riesgo Cardíaco")
st.markdown("Modelo de IA (Random Forest) con Imputación de Datos Automática.")

# --- 1. CARGA Y ENTRENAMIENTO ROBUSTO ---
@st.cache_resource
def train_model():
    # Intentamos cargar el dataset
    file_path = 'heart_disease_uci.csv'
    
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        st.error(f"Error crítico cargando el archivo: {e}")
        st.stop()
        
    # --- LIMPIEZA INTELIGENTE ---
    # 1. Reemplazar caracteres de error comunes
    df.replace(['?', 'nan', 'NULL'], np.nan, inplace=True)
    
    # 2. Eliminar columnas administrativas si existen
    cols_to_drop = ['id', 'dataset', 'url']
    df = df.drop(columns=[c for c in cols_to_drop if c in df.columns], errors='ignore')
    
    # 3. Convertir todo a números (lo que no sea número se vuelve NaN)
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # 4. SEPARAR X e y (Target)
    target_col = 'num' if 'num' in df.columns else 'target'
    
    if target_col not in df.columns:
        st.error(f"No se encontró la columna objetivo '{target_col}' en el dataset.")
        st.stop()
        
    # Separamos filas donde NO tenemos el target (esas sí las borramos porque no sirven para entrenar)
    df = df.dropna(subset=[target_col])
    
    X = df.drop(columns=[target_col])
    y = df[target_col].apply(lambda x: 1 if x > 0 else 0)
    
    # 5. IMPUTACIÓN (LA SOLUCIÓN AL ERROR)
    # En lugar de borrar filas, rellenamos los huecos con el promedio de la columna
    imputer = SimpleImputer(strategy='mean')
    X_imputed = imputer.fit_transform(X)
    
    # Convertimos de vuelta a DataFrame para mantener nombres de columnas
    X = pd.DataFrame(X_imputed, columns=X.columns)
    feature_names = X.columns.tolist()
    
    # 6. ESCALADO
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # 7. ENTRENAMIENTO
    model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    model.fit(X_scaled, y)
    
    return model, scaler, feature_names, imputer

# Ejecutar entrenamiento
model, scaler, feature_names, imputer = train_model()

# --- 2. INTERFAZ ---
st.sidebar.header("Datos del Paciente")

def user_input_features():
    # Diccionario para guardar inputs
    data = {}
    
    # Generamos sliders automáticos basados en las columnas reales del CSV
    # Esto evita errores si faltan columnas
    for col in feature_names:
        # Valores por defecto y rangos aproximados médicos
        min_val = 0.0
        max_val = 1.0
        default = 0.0
        
        if 'age' in col: max_val=100.0; default=55.0; min_val=20.0
        elif 'trestbps' in col: max_val=200.0; default=120.0; min_val=80.0
        elif 'chol' in col: max_val=600.0; default=200.0; min_val=100.0
        elif 'thalach' in col: max_val=220.0; default=150.0; min_val=60.0
        elif 'oldpeak' in col: max_val=10.0; default=1.0
        elif 'sex' in col: max_val=1.0; default=1.0
        elif 'cp' in col: max_val=4.0; default=0.0
        
        # Input numérico genérico para máxima compatibilidad
        val = st.sidebar.number_input(f"{col}", min_value=float(min_val), max_value=float(max_val), value=float(default))
        data[col] = val

    return pd.DataFrame(data, index=[0])

input_df = user_input_features()

# --- 3. PREDICCIÓN ---
st.divider()
st.subheader("Resultado del Diagnóstico")

if st.button('CALCULAR RIESGO'):
    # 1. Imputar (por seguridad, aunque el input usuario suele estar completo)
    input_imputed = imputer.transform(input_df)
    
    # 2. Escalar
    input_scaled = scaler.transform(input_imputed)
    
    # 3. Predecir
    prediction = model.predict(input_scaled)
    prob = model.predict_proba(input_scaled)[0][1]
    
    if prob > 0.70:
        st.error(f"🚨 ALTO RIESGO: {prob:.2%}")
    elif prob > 0.40:
        st.warning(f"⚠️ RIESGO MODERADO: {prob:.2%}")
    else:
        st.success(f"✅ BAJO RIESGO: {prob:.2%}")