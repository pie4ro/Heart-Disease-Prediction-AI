import streamlit as st
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

# Configuración de la página
st.set_page_config(page_title="Predicción Cardíaca IA", page_icon="🫀")

st.title("🫀 Sistema de Predicción de Riesgo Cardíaco")
st.markdown("Modelo Random Forest entrenado con las **14 variables** del Dataset Cleveland.")

# --- 1. ENTRENAMIENTO DEL MODELO ---
@st.cache_resource
def train_model():
    # Cargar datos
    try:
        # engine='python' detecta automáticamente si usa comas o punto y coma
        df = pd.read_csv('heart_disease_uci.csv', sep=None, engine='python')
    except Exception as e:
        st.error(f"Error cargando CSV: {e}")
        st.stop()

    # Normalizar nombres de columnas (todo a minúsculas)
    df.columns = df.columns.str.lower()
    
    # Limpieza básica
    df.replace(['?', 'nan', 'null'], np.nan, inplace=True)
    
    # --- DEFINICIÓN DE LAS 14 VARIABLES ---
    
    # 13 Variables de Entrada (Features)
    features = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 
                'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
    
    # 1 Variable de Salida (Target/Diagnóstico)
    # Buscamos si se llama 'num' o 'target' (ambos son comunes en este dataset)
    target = 'num' if 'num' in df.columns else 'target'
    
    # Validación: ¿Están las 14?
    if target not in df.columns:
        st.error(f"Falta la variable número 14 (Target). Tus columnas son: {df.columns.tolist()}")
        st.stop()
        
    # Validamos que estén las 13 de entrada
    missing = [col for col in features if col not in df.columns]
    if missing:
        st.error(f"Faltan variables de entrada: {missing}")
        st.stop()

    # --- PROCESAMIENTO ---

    # Convertir las 13 entradas a números
    for col in features:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Convertir el Target a Binario (0: Sano, 1: Enfermo)
    # Si el valor es > 0 (1, 2, 3, 4) significa enfermo.
    y = df[target].apply(lambda x: 1 if x > 0 else 0)
    
    # Definir X (Solo las 13 columnas de entrada)
    X = df[features] 

    # Imputar (Rellenar huecos vacíos con el promedio)
    imputer = SimpleImputer(strategy='mean')
    X_imputed = imputer.fit_transform(X)

    # Escalar
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    # Entrenar Random Forest
    model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    model.fit(X_scaled, y)

    return model, scaler, imputer

# Ejecutar entrenamiento
model, scaler, imputer = train_model()

# --- 2. FORMULARIO PARA LAS 13 VARIABLES DE ENTRADA ---
st.sidebar.header("Datos del Paciente (13 Variables)")

def get_user_input():
    # 1. Age
    age = st.sidebar.number_input("1. Edad (age)", 20, 100, 55)
    
    # 2. Sex
    sex_opt = st.sidebar.selectbox("2. Sexo (sex)", ["Mujer (0)", "Hombre (1)"])
    sex = 1 if "Hombre" in sex_opt else 0
    
    # 3. CP
    cp = st.sidebar.selectbox("3. Dolor Torácico (cp)", [0, 1, 2, 3], index=3)
    
    # 4. Trestbps
    trestbps = st.sidebar.number_input("4. Presión Arterial (trestbps)", 80, 200, 120)
    
    # 5. Chol
    chol = st.sidebar.number_input("5. Colesterol (chol)", 100, 600, 200)
    
    # 6. FBS
    fbs_opt = st.sidebar.selectbox("6. Azúcar > 120 (fbs)", ["No (0)", "Sí (1)"])
    fbs = 1 if "Sí" in fbs_opt else 0
    
    # 7. Restecg
    restecg = st.sidebar.selectbox("7. ECG Reposo (restecg)", [0, 1, 2])
    
    # 8. Thalach
    thalach = st.sidebar.number_input("8. Frecuencia Cardíaca Máx (thalach)", 60, 220, 150)
    
    # 9. Exang
    exang_opt = st.sidebar.selectbox("9. Angina x Ejercicio (exang)", ["No (0)", "Sí (1)"])
    exang = 1 if "Sí" in exang_opt else 0
    
    # 10. Oldpeak
    oldpeak = st.sidebar.number_input("10. Depresión ST (oldpeak)", 0.0, 10.0, 1.0, step=0.1)
    
    # 11. Slope
    slope = st.sidebar.selectbox("11. Pendiente (slope)", [0, 1, 2], index=1)
    
    # 12. CA
    ca = st.sidebar.selectbox("12. Vasos (ca)", [0, 1, 2, 3])
    
    # 13. Thal
    thal = st.sidebar.selectbox("13. Talasemia (thal)", [3, 6, 7], index=0)

    # Variable 14 (Target) -> ¡Esa la predecimos nosotros!
    
    # Empaquetar datos
    data = {
        'age': age, 'sex': sex, 'cp': cp, 'trestbps': trestbps, 'chol': chol,
        'fbs': fbs, 'restecg': restecg, 'thalach': thalach, 'exang': exang,
        'oldpeak': oldpeak, 'slope': slope, 'ca': ca, 'thal': thal
    }
    
    return pd.DataFrame(data, index=[0])

input_df = get_user_input()

# --- 3. PREDICCIÓN DE LA VARIABLE 14 (TARGET) ---
st.divider()

if st.button("CALCULAR DIAGNÓSTICO (Variable 14)"):
    # Procesar inputs
    input_imputed = imputer.transform(input_df)
    input_scaled = scaler.transform(input_imputed)
    
    # Predecir
    prob = model.predict_proba(input_scaled)[0][1]
    
    st.subheader(f"Probabilidad de Riesgo: {prob:.1%}")
    
    if prob > 0.70:
        st.error("🚨 ALTO RIESGO DETECTADO (Positivo)")
    elif prob > 0.40:
        st.warning("⚠️ RIESGO MODERADO")
    else:
        st.success("✅ BAJO RIESGO (Negativo)")