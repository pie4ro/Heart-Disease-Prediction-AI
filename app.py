import streamlit as st
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

# Configuración
st.set_page_config(page_title="Predicción Cardíaca IA", page_icon="🫀")
st.title("🫀 Sistema de Predicción de Riesgo Cardíaco")

@st.cache_resource
def train_model():
    try:
        df = pd.read_csv('heart_disease_uci.csv', sep=None, engine='python')
    except Exception as e:
        st.error(f"Error cargando CSV: {e}")
        st.stop()

    # --- CORRECCIÓN DE NOMBRES (Aquí estaba el problema) ---
    df.columns = df.columns.str.lower().str.strip()
    
    # Mapa de correcciones: Cambiamos tu 'thalch' por 'thalach'
    renames = {
        'thalch': 'thalach',   # <--- ESTA ES LA CORRECCIÓN CLAVE PARA TI
        'thalachh': 'thalach',
        'chest pain type': 'cp',
        'resting bp': 'trestbps',
        'cholesterol': 'chol'
    }
    df.rename(columns=renames, inplace=True)
    # -------------------------------------------------------

    # Limpieza
    df.replace(['?', 'nan', 'null'], np.nan, inplace=True)
    
    # Variables oficiales
    features = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 
                'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
    
    # Detectar target
    target = 'num' if 'num' in df.columns else 'target'
    
    # Validación final
    missing = [col for col in features if col not in df.columns]
    if missing:
        st.error(f"❌ Siguen faltando columnas: {missing}")
        st.write("Columnas actuales corregidas:", df.columns.tolist())
        st.stop()

    # Procesamiento
    for col in features:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    if target in df.columns:
        df = df.dropna(subset=[target])
        
    y = df[target].apply(lambda x: 1 if x > 0 else 0)
    X = df[features] 

    imputer = SimpleImputer(strategy='mean')
    X_imputed = imputer.fit_transform(X)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    model.fit(X_scaled, y)

    return model, scaler, imputer

# Entrenar
model, scaler, imputer = train_model()

# --- INTERFAZ ---
st.sidebar.header("Datos del Paciente")

def get_user_input():
    age = st.sidebar.number_input("Edad", 20, 100, 55)
    sex = 1 if st.sidebar.selectbox("Sexo", ["Mujer", "Hombre"]) == "Hombre" else 0
    cp = st.sidebar.selectbox("Dolor Torácico (cp)", [0, 1, 2, 3], index=3)
    trestbps = st.sidebar.number_input("Presión Arterial", 80, 200, 120)
    chol = st.sidebar.number_input("Colesterol", 100, 600, 200)
    fbs = 1 if st.sidebar.selectbox("Azúcar > 120", ["No", "Sí"]) == "Sí" else 0
    restecg = st.sidebar.selectbox("ECG Reposo", [0, 1, 2])
    thalach = st.sidebar.number_input("Frecuencia Cardíaca Máx", 60, 220, 150)
    exang = 1 if st.sidebar.selectbox("Angina x Ejercicio", ["No", "Sí"]) == "Sí" else 0
    oldpeak = st.sidebar.number_input("Depresión ST", 0.0, 10.0, 1.0, step=0.1)
    slope = st.sidebar.selectbox("Pendiente (slope)", [0, 1, 2], index=1)
    ca = st.sidebar.selectbox("Vasos (ca)", [0, 1, 2, 3])
    thal = st.sidebar.selectbox("Talasemia (thal)", [3, 6, 7], index=0)

    data = {
        'age': age, 'sex': sex, 'cp': cp, 'trestbps': trestbps, 'chol': chol,
        'fbs': fbs, 'restecg': restecg, 'thalach': thalach, 'exang': exang,
        'oldpeak': oldpeak, 'slope': slope, 'ca': ca, 'thal': thal
    }
    return pd.DataFrame(data, index=[0])

input_df = get_user_input()

st.divider()
if st.button("CALCULAR RIESGO"):
    input_imputed = imputer.transform(input_df)
    input_scaled = scaler.transform(input_imputed)
    prob = model.predict_proba(input_scaled)[0][1]
    
    st.subheader(f"Probabilidad: {prob:.1%}")
    if prob > 0.70: st.error("🚨 ALTO RIESGO")
    elif prob > 0.40: st.warning("⚠️ RIESGO MODERADO")
    else: st.success("✅ BAJO RIESGO")