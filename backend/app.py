import joblib
import pandas as pd
import numpy as np
import shap
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

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
        # 1. Frontend'den gelen JSON verisini al
        input_json = request.get_json()
        
        # 2. JSON'ı listeye, sonra DataFrame'e dönüştür (Doğru sıra ile)
        # Gelen JSON'ın {'feature1': value1, 'feature2': value2} formatında olduğunu varsayıyoruz
        
        # Gelen veriyi (tek bir hasta) doğru sıraya diz
        input_data_list = []
        for feature in FEATURE_ORDER:
            # Eğer frontend'den bir değer gelmezse 'None' (NaN) ata
            input_data_list.append(input_json.get(feature, None)) 

        # Tek satırlık bir DataFrame oluştur
        input_df = pd.DataFrame([input_data_list], columns=FEATURE_ORDER)

        # 3. Veri Ön İşleme (Imputer -> Scaler SIRA TEYİDİ GEREKİR)
        # *** TAHMİNİ SIRA: Önce eksik veriyi doldur, SONRA ölçekle ***
        # Lütfen bu sırayı hocanızla TEYİT EDİN.
        data_imputed = loaded_imputer.transform(input_df)
        data_scaled = loaded_scaler.transform(data_imputed)

        # 4. Tahmin ve SHAP Değerlerini Hesapla
        explanation = loaded_explainer(data_scaled)

        # "Class 1" (Muhtemelen "CVD Var") için değerleri al
        prediction_probability = explanation.output_values[0][1]
        shap_values = explanation.values[0][:, 1]
        base_value = loaded_explainer.expected_value[1]
        
        # Ham veriyi (impute edilmiş ama ölçeklenmemiş) al
        # Bu, SHAP plot'ta '56.0' gibi değerleri göstermek için kullanılır
        unscaled_data = loaded_imputer.transform(input_df)
        feature_values = unscaled_data[0].tolist()

        # 5. Frontend'e göndermek için JSON yanıtı hazırla
        response = {
            "status": "success",
            "prediction": float(prediction_probability), # Tahmin olasılığı
            "base_value": float(base_value),            # SHAP base value
            "shap_values": shap_values.tolist(),        # SHAP değerleri listesi
            "feature_names": FEATURE_ORDER,             # Özellik isimleri
            "feature_values": feature_values            # Hastanın (doldurulmuş) verisi
        }
        return jsonify(response)

    except Exception as e:
        # Bir hata olursa frontend'e bildir
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# --- 5. Sunucuyu Başlat ---
if __name__ == '__main__':
    # 'host="0.0.0.0"' dışarıdan erişime izin verir (geliştirme için)
    # 'debug=True' kod değiştikçe sunucuyu yeniden başlatır
    app.run(host="0.0.0.0", port=5000, debug=True)