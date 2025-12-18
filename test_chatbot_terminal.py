#!/usr/bin/env python3
"""
Terminal Chatbot Test Script
Backend API'yi çalıştırıp terminalden chatbot ile konuşmak için
"""

import requests
import json
import sys

# Backend API URL
API_URL = "http://localhost:5000/api/chat"

# Örnek hasta verisi (isteğe bağlı, gerçek test için kullanılabilir)
SAMPLE_PATIENT_DATA = {
    "anchor_age": 65,
    "White Blood Cells": 7.5,
    "Urea Nitrogen": 15.2,
    "Neutrophils": 4.5,
    "BMI": 28.5,
    "Monocytes": 0.6,
    "Glucose": 95,
    "systolic": 140,
    "MCH": 30,
    "Calcium, Total": 9.5,
    "Lymphocytes": 2.0,
    "Creatinine": 1.2,
    "Sodium": 140,
    "diastolic": 90,
    "PT": 12.5,
    "imatinib_dose": 400,
    "dasatinib_dose": 0,
    "gender_encoded": 1,
    "nilotinib_dose": 0,
    "ponatinib_dose": 0,
    "ruxolitinib_dose": 0
}

SAMPLE_RISK_SCORE = "45.5"
SAMPLE_SHAP_VALUES = {
    "anchor_age": 0.15,
    "BMI": 0.08,
    "systolic": 0.12,
    "Creatinine": 0.05
}

def test_api_connection():
    """API'nin çalışıp çalışmadığını kontrol et"""
    try:
        # Basit bir health check için predict-simple endpoint'ini deneyelim
        response = requests.get("http://localhost:5000/", timeout=2)
        return True
    except requests.exceptions.ConnectionError:
        print("❌ HATA: Backend API'ye bağlanılamıyor!")
        print("   Lütfen backend'i çalıştırdığınızdan emin olun:")
        print("   cd backend && python app.py")
        return False
    except Exception as e:
        print(f"❌ Bağlantı hatası: {e}")
        return False

def send_chat_message(message, use_patient_data=False, use_guideline_sources=True, use_pubmed_sources=True):
    """Chatbot'a mesaj gönder"""
    context = {
        "useGuidelineSources": use_guideline_sources,
        "usePubmedSources": use_pubmed_sources
    }
    
    # Eğer hasta verisi kullanmak istiyorsak
    if use_patient_data:
        context["riskScore"] = SAMPLE_RISK_SCORE
        context["patientData"] = SAMPLE_PATIENT_DATA
        context["shapValues"] = SAMPLE_SHAP_VALUES
    
    payload = {
        "message": message,
        "context": context
    }
    
    try:
        response = requests.post(API_URL, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if data.get("status") == "success":
            return data.get("response", "Cevap alınamadı")
        else:
            return f"Hata: {data.get('message', 'Bilinmeyen hata')}"
    except requests.exceptions.Timeout:
        return "⏱️  Zaman aşımı: API yanıt vermedi (30 saniye)"
    except requests.exceptions.RequestException as e:
        return f"❌ İstek hatası: {e}"

def interactive_chat():
    """İnteraktif chat modu"""
    print("=" * 60)
    print("🤖 CVD Risk Analysis Chatbot - Terminal Test")
    print("=" * 60)
    print("\nKomutlar:")
    print("  /help          - Yardım menüsü")
    print("  /patient       - Örnek hasta verisi ile test et")
    print("  /nopatient     - Hasta verisi olmadan test et")
    print("  /guidelines    - Klinik kılavuz kaynaklarını aç/kapat")
    print("  /pubmed        - PubMed kaynaklarını aç/kapat")
    print("  /quit veya /exit - Çıkış")
    print("\n" + "=" * 60 + "\n")
    
    # API bağlantısını kontrol et
    if not test_api_connection():
        return
    
    print("✅ Backend API'ye bağlandı!\n")
    
    # Varsayılan ayarlar
    use_patient_data = False
    use_guideline_sources = True
    use_pubmed_sources = True
    
    print("💡 İpucu: Soru sormak için direkt yazın, komutlar için '/' ile başlayın\n")
    
    while True:
        try:
            user_input = input("Siz: ").strip()
            
            if not user_input:
                continue
            
            # Komut kontrolü
            if user_input.startswith("/"):
                command = user_input.lower()
                
                if command in ["/quit", "/exit", "/q"]:
                    print("\n👋 Görüşmek üzere!")
                    break
                
                elif command == "/help":
                    print("\n📖 Komutlar:")
                    print("  /patient       - Örnek hasta verisi ile test")
                    print("  /nopatient     - Hasta verisi olmadan test")
                    print("  /guidelines    - Klinik kılavuz kaynaklarını toggle")
                    print("  /pubmed        - PubMed kaynaklarını toggle")
                    print("  /quit          - Çıkış")
                    print()
                
                elif command == "/patient":
                    use_patient_data = True
                    print("✅ Örnek hasta verisi aktif")
                    print(f"   Risk Score: {SAMPLE_RISK_SCORE}%")
                    print()
                
                elif command == "/nopatient":
                    use_patient_data = False
                    print("✅ Hasta verisi kullanılmıyor")
                    print()
                
                elif command == "/guidelines":
                    use_guideline_sources = not use_guideline_sources
                    status = "✅ AÇIK" if use_guideline_sources else "❌ KAPALI"
                    print(f"{status} - Klinik kılavuz kaynakları")
                    print()
                
                elif command == "/pubmed":
                    use_pubmed_sources = not use_pubmed_sources
                    status = "✅ AÇIK" if use_pubmed_sources else "❌ KAPALI"
                    print(f"{status} - PubMed kaynakları")
                    print()
                
                else:
                    print(f"❌ Bilinmeyen komut: {command}")
                    print("   /help yazarak komutları görebilirsiniz\n")
                
                continue
            
            # Normal mesaj gönder
            print("\n🤔 Düşünüyor...")
            response = send_chat_message(
                user_input, 
                use_patient_data=use_patient_data,
                use_guideline_sources=use_guideline_sources,
                use_pubmed_sources=use_pubmed_sources
            )
            
            print(f"\n🤖 Chatbot: {response}\n")
            print("-" * 60 + "\n")
            
        except KeyboardInterrupt:
            print("\n\n👋 Görüşmek üzere!")
            break
        except Exception as e:
            print(f"\n❌ Hata: {e}\n")

def quick_test():
    """Hızlı test - birkaç örnek soru"""
    print("=" * 60)
    print("🚀 Hızlı Test Modu")
    print("=" * 60)
    
    if not test_api_connection():
        return
    
    test_questions = [
        "What is cardiovascular disease?",
        "Explain the risk factors for CVD",
        "What is Dasatinib?",
    ]
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n📝 Soru {i}: {question}")
        print("🤔 Düşünüyor...")
        response = send_chat_message(question, use_patient_data=False)
        print(f"🤖 Cevap: {response[:200]}...")
        print("-" * 60)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "quick":
        quick_test()
    else:
        interactive_chat()

