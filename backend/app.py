import joblib
import pandas as pd
import numpy as np
import shap
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import io
import time
import random
# --- 1. Uygulamayı Başlat ve CORS'u Aktif Et ---
# (CORS, Next.js'in (localhost:3000) bu API (localhost:5000) ile konuşmasına izin verir)
app = Flask(__name__)
CORS(app)

# --- 2. Modelleri ve Gerekli Bilgileri Yükle ---
# (Modeller sadece sunucu başladığında 1 kez yüklenir, bu çok verimlidir)
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

try:
    loaded_explainer = joblib.load(os.path.join(MODEL_DIR, "RF_explainer_allCVD.bz2"))
    loaded_imputer = joblib.load(os.path.join(MODEL_DIR, "RF_imputer_allCVD.pkl"))
    loaded_scaler = joblib.load(os.path.join(MODEL_DIR, "RF_scaler_allCVD.pkl"))
except FileNotFoundError:
    print("HATA: Model dosyaları 'models/' klasöründe bulunamadı.")
    # Gerçek bir uygulamada burada sunucuyu durdurabilirsiniz.
    exit()


# --- 3. ÖZELLİK SIRALAMASI (ÇOK ÖNEMLİ) ---
# Paylaştığınız JSON dosyasına göre bu sırayı TAHMİN EDİYORUM.
# Lütfen hocanızdan DOĞRU SIRAYI teyit edin. Modelin beklediği sıra budur.
FEATURE_ORDER = [
    "anchor_age", "White Blood Cells", "Urea Nitrogen", "Neutrophils", "BMI",
    "Monocytes", "Glucose", "systolic", "MCH", "Calcium, Total", "Lymphocytes",
    "Creatinine", "Sodium", "diastolic", "PT", "imatinib_dose", "dasatinib_dose",
    "gender_encoded", "nilotinib_dose", "ponatinib_dose", "ruxolitinib_dose"
]

# --- 4. Tahmin Endpoint'ini Oluştur ---
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # 0. Simulated processing time (3-4 seconds)
        processing_time = random.uniform(3.0, 4.0)
        print(f"Processing request... (simulated time: {processing_time:.1f}s)")
        time.sleep(processing_time)
        
        # 1. ... (Veri alma - DEĞİŞİKLİK YOK) ...
        input_json = request.get_json()

        # 2. ... (DataFrame oluşturma - DEĞİŞİKLİK YOK) ...
        input_data_list = []
        for feature in FEATURE_ORDER:
            input_data_list.append(input_json.get(feature, None)) 
        input_df = pd.DataFrame([input_data_list], columns=FEATURE_ORDER)

        # 3. ... (Veri Ön İşleme - DEĞİŞİKLİK YOK) ...
        imputed_array = loaded_imputer.transform(input_df.values)
        imputed_df = pd.DataFrame(imputed_array, columns=FEATURE_ORDER)
        scaled_array = loaded_scaler.transform(imputed_df)
        scaled_df = pd.DataFrame(scaled_array, columns=FEATURE_ORDER)

        # 4. Tahmin ve SHAP Değerlerini Hesapla
        explanation = loaded_explainer(scaled_df)

        shap_values = explanation.values[0, :, 1]
        base_value = explanation.base_values[0, 1]
        prediction_probability = base_value + shap_values.sum()

        # --- YENİ BÖLÜM: TAM SHAP HTML OLUŞTURMA ---
        # 'imputed_df.iloc[0]' -> plot'ta gösterilecek ham değerler
        force_plot = shap.force_plot(
            base_value,
            shap_values,
            features=imputed_df.iloc[0], 
            show=False,
            matplotlib=False
        )

        # HTML'i diske kaydetmek yerine, hafızada bir dosyaya (StringIO) kaydet
        f = io.StringIO()
        shap.save_html(f, force_plot)
        # Hafızadaki dosyanın içeriğini string olarak al
        shap_html = f.getvalue()
        # -------------------------------------

        feature_values = imputed_df.iloc[0].values.tolist()

        # 5. Frontend'e göndermek için JSON yanıtı hazırla
        response = {
            "status": "success",
            "prediction": float(prediction_probability),
            "base_value": float(base_value),
            # Artık bunlara frontend'de ihtiyacımız yok ama gönderebiliriz
            "shap_values": shap_values.tolist(),     
            "feature_names": FEATURE_ORDER,          
            "feature_values": feature_values,        
            "shap_html": shap_html                   # <-- YENİ: Bu artık TAM BİR HTML DOSYASI
        }
        return jsonify(response)

    except Exception as e:
        print(f"HATA OLUŞTU: {e}") 
        import traceback
        traceback.print_exc() 
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# --- 4.1. Basit Tahmin Endpoint'ini Oluştur ---
@app.route('/api/predict-simple', methods=['POST'])
def predict_simple():
    try:
        # 0. Simulated processing time (3-4 seconds)
        processing_time = random.uniform(3.0, 4.0)
        print(f"Processing simple prediction request... (simulated time: {processing_time:.1f}s)")
        time.sleep(processing_time)
        
        # 1. Veri alma
        input_json = request.get_json()

        # 2. DataFrame oluşturma
        input_data_list = []
        for feature in FEATURE_ORDER:
            input_data_list.append(input_json.get(feature, None)) 
        input_df = pd.DataFrame([input_data_list], columns=FEATURE_ORDER)

        # 3. Veri Ön İşleme
        imputed_array = loaded_imputer.transform(input_df.values)
        imputed_df = pd.DataFrame(imputed_array, columns=FEATURE_ORDER)
        scaled_array = loaded_scaler.transform(imputed_df)
        scaled_df = pd.DataFrame(scaled_array, columns=FEATURE_ORDER)

        # 4. Sadece Tahmin (SHAP hesaplama yok)
        explanation = loaded_explainer(scaled_df)
        prediction_probability = explanation.base_values[0, 1] + explanation.values[0, :, 1].sum()

        # 5. Basit JSON yanıtı
        response = {
            "status": "success",
            "prediction": float(prediction_probability)
        }
        return jsonify(response)

    except Exception as e:
        print(f"HATA OLUŞTU (Simple): {e}") 
        import traceback
        traceback.print_exc() 
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# --- 4.5. Chatbot Endpoint ---
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        context = data.get('context', {})
        
        # Patient data ve risk skorundan context oluştur
        risk_score = context.get('riskScore', 'N/A')
        patient_data = context.get('patientData', {})
        
        # Mock AI response - Basit kural tabanlı sistem
        response_text = generate_chat_response(user_message, risk_score, patient_data)
        
        return jsonify({
            "status": "success",
            "response": response_text
        })
        
    except Exception as e:
        print(f"Chat error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

def generate_chat_response(user_message: str, risk_score: str, patient_data: dict) -> str:
    """Basit kural tabanlı chatbot response generator"""
    message_lower = user_message.lower()
    
    # Risk score questions
    if 'risk' in message_lower or 'risk score' in message_lower:
        score = float(risk_score) if risk_score != 'N/A' else 0
        if score > 70:
            return f"The patient's CVD risk score is {risk_score}%, indicating HIGH risk. This requires immediate monitoring and intervention. Recommendations: Regular ECG, cardiac enzyme monitoring, and consideration for emergency department evaluation."
        elif score > 50:
            return f"The patient's CVD risk score is {risk_score}%, indicating MODERATE risk. Routine follow-up and lifestyle modifications are recommended. Lipid profile, ECG, and physical activity assessment should be conducted."
        else:
            return f"The patient's CVD risk score is {risk_score}%, indicating LOW risk. Routine health screenings and preventive measures are sufficient."
    
    # SHAP values
    if 'contribution' in message_lower or 'importance' in message_lower or 'shap' in message_lower:
        return "SHAP values show how each feature contributes to the risk prediction. Positive values increase risk, while negative values decrease it. Patient management can be optimized by prioritizing features with the highest contribution."
    
    # Laboratory values
    if 'laboratory' in message_lower or 'lab' in message_lower or 'blood' in message_lower:
        return "Laboratory values play a critical role in CVD risk assessment. Lipid profiles (cholesterol, LDL, HDL), inflammatory markers, and organ function tests are particularly important. Abnormal values can increase risk factors."
    
    # General health recommendations
    if 'advice' in message_lower or 'recommendation' in message_lower or 'suggest' in message_lower:
        score = float(risk_score) if risk_score != 'N/A' else 0
        if score > 70:
            return "HIGH RISK patient recommendations: Urgent cardiologist consultation, statin therapy evaluation, aspirin prophylaxis, smoking cessation program, dietary and lifestyle modifications. Patient should seek immediate medical attention for any chest pain or shortness of breath."
        elif score > 50:
            return "MODERATE RISK patient recommendations: Regular lipid monitoring, at least 150 minutes of moderate-intensity physical activity per week, Mediterranean diet, smoking cessation, routine cardiovascular assessment."
        else:
            return "LOW RISK patient recommendations: Annual health screening, balanced diet, regular physical activity, blood pressure monitoring, and lifestyle modifications."
    
    # Default response
    responses = [
        "I can analyze the patient's condition based on CVD risk analysis results. You can ask about risk scores, SHAP values, or laboratory tests.",
        "I can provide information about patient data and risk analysis results. What would you like to know about?",
        "For more information about CVD risk score and SHAP analysis, you can ask about risk scores, laboratory values, or SHAP values."
    ]
    
    return responses[hash(user_message) % len(responses)]

# --- 5. Sunucuyu Başlat ---
if __name__ == '__main__':
    # 'host="0.0.0.0"' dışarıdan erişime izin verir (geliştirme için)
    # 'debug=True' kod değiştikçe sunucuyu yeniden başlatır
    app.run(host="0.0.0.0", port=5000, debug=True)