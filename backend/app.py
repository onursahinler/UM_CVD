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

# --- 5. Sunucuyu Başlat ---
if __name__ == '__main__':
    # 'host="0.0.0.0"' dışarıdan erişime izin verir (geliştirme için)
    # 'debug=True' kod değiştikçe sunucuyu yeniden başlatır
    app.run(host="0.0.0.0", port=5000, debug=True)