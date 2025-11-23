import streamlit as st
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

# Configuración de la página
st.set_page_config(page_title="Predicción Cardíaca IA", page_icon="🫀", layout="centered")

st.title("Sistema de Predicción de Riesgo Cardíaco")
st.markdown("Modelo de IA (Random Forest) - Despliegue Cloud")

# --- 1. CARGA Y ENTRENAMIENTO ROBUSTO ---
@st.cache_resource
def train_model():
    # 1. Cargar el archivo con manejo de errores
    try:
        df = pd.read_csv('heart_disease_uci.csv')
    except Exception as e:
        st.error(f"Error cargando el dataset. Asegúrate de que 'heart_disease_uci.csv' esté en GitHub. Detalle: {e}")
        st.stop()
        
    # --- LIMPIEZA PROFUNDA (Aquí estaba el error) ---
    
    # Reemplazar símbolos raros
    df.replace(['?', 'nan', 'NULL'], np.nan, inplace=True)
    
    # Eliminar columnas administrativas (ID, URL, Dataset) si existen
    cols_to_drop = ['id', 'dataset', 'url']
    df = df.drop(columns=[c for c in cols_to_drop if c in df.columns], errors='ignore')
    
    # Forzar conversión a numérico
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        
    # *** ELIMINAR COLUMNAS QUE SE QUEDARON VACÍAS ***
    # Esto soluciona el error "Shape mismatch". Si una columna es todo NaN, se va.
    df = df.dropna(axis=1, how='all')
    
    # Separar Target (Objetivo)
    target_col = 'num' if 'num' in df.columns else 'target'
    
    if target_col not in df.columns:
        st.error(f"No se encontró la columna objetivo '{target_col}'.")
        st.stop()
        
    # Limpiamos filas que no tengan el diagnóstico final
    df = df.dropna(subset=[target_col])
    
    # Definir X (Variables) e y (Resultado)
    X = df.drop(columns=[target_col])
    y = df[target_col].apply(lambda x: 1 if x > 0 else 0)
    
    # --- PROCESAMIENTO ---
    
    # 1. Imputación (Rellenar huecos con el promedio)
    imputer = SimpleImputer(strategy='mean')
    # Usamos fit_transform y reconstruimos el DF inmediatamente con las columnas correctas
    X_imputed = imputer.fit_transform(X)
    X = pd.DataFrame(X_imputed, columns=X.columns) # Ahora sí coinciden
    
    # Guardamos los nombres de las columnas finales que sobrevivieron
    feature_names = X.columns.tolist()
    
    # 2. Escalado
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # 3. Entrenamiento Random Forest
    model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    model.fit(X_scaled, y)
    
    return model, scaler, feature_names, imputer

# Ejecutamos el entrenamiento
model, scaler, feature_names, imputer = train_model()

# --- 2. INTERFAZ ---
st.sidebar.header("Datos del Paciente")

def user_input_features():
    data = {}
    
    # Generamos los inputs dinámicamente según las columnas que sobrevivieron
    for col in feature_names:
        # Valores por defecto médicos
        min_v, max_v, def_v = 0.0, 1.0, 0.0
        
        # Lógica simple para rangos
        if 'age' in col: min_v, max_v, def_v = 20.0, 100.0, 55.0
        elif 'trestbps' in col: min_v, max_v, def_v = 80.0, 200.0, 120.0
        elif 'chol' in col: min_v, max_v, def_v = 100.0, 600.0, 200.0
        elif 'thalach' in col: min_v, max_v, def_v = 60.0, 220.0, 150.0
        elif 'oldpeak' in col: min_v, max_v, def_v = 0.0, 10.0, 1.0
        elif 'ca' in col: min_v, max_v, def_v = 0.0, 4.0, 0.0
        elif 'cp' in col: min_v, max_v, def_v = 0.0, 4.0, 0.0
        
        val = st.sidebar.number_input(f"{col}", min_value=float(min_v), max_value=float(max_v), value=float(def_v))
        data[col] = val

    return pd.DataFrame(data, index=[0])

input_df = user_input_features()

# --- 3. PREDICCIÓN ---
st.divider()
st.subheader("Resultado del Diagnóstico")

if st.button('CALCULAR RIESGO'):
    # Aseguramos que el orden de columnas sea exacto
    input_df = input_df.reindex(columns=feature_names, fill_value=0)
    
    # 1. Imputar
    input_imputed = imputer.transform(input_df)
    
    # 2. Escalar
    input_scaled = scaler.transform(input_imputed)
    
    # 3. Predecir
    prediction = model.predict(input_scaled)
    prob = model.predict_proba(input_scaled)[0][1]
    
    st.metric(label="Probabilidad de Enfermedad", value=f"{prob:.1%}")
    
    if prob > 0.70:
        st.error("🚨 ALTO RIESGO: Se recomienda derivación a cardiología.")
    elif prob > 0.40:
        st.warning("⚠️ RIESGO MODERADO: Se sugiere monitoreo.")
    else:
        st.success("✅ BAJO RIESGO: Valores normales.")