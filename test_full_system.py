import sys
import os
from dotenv import load_dotenv

# --- 1. Environment Variable Yükleme (EN ÖNEMLİ KISIM) ---
# Script root'ta çalışıyor, .env dosyası muhtemelen 'backend/.env' içinde.
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_env_path = os.path.join(current_dir, 'backend', '.env')

if os.path.exists(backend_env_path):
    print(f"✅ .env dosyası bulundu: {backend_env_path}")
    load_dotenv(backend_env_path)
else:
    # Belki root dizindedir, onu deneyelim
    print("ℹ️  backend/.env bulunamadı, ana dizindeki .env deneniyor...")
    load_dotenv()

# Kontrol edelim
if not os.getenv("OPENAI_API_KEY"):
    print("\n❌ KRİTİK HATA: OPENAI_API_KEY bulunamadı!")
    print("Lütfen 'backend' klasörü içinde '.env' dosyanızın olduğundan ve içinde:")
    print("OPENAI_API_KEY=sk-proj-xxxx... şeklinde anahtarınızın yazılı olduğundan emin olun.")
    sys.exit(1)

# --- 2. Yolları Ayarlama ---
# backend klasörünü Python yoluna ekle
sys.path.append(os.path.join(current_dir, 'backend'))

# --- 3. Agent Import ---
try:
    from backend.XAIagent_code.agents.knowledge_agent import KnowledgeAgent
except ImportError as e:
    # Alternatif import yolu (bazı IDE yapılandırmaları için)
    sys.path.append(current_dir)
    from backend.XAIagent_code.knowledge_agent import KnowledgeAgent

def test_system():
    print("\n🤖 Başlatılıyor: Knowledge Agent...")
    try:
        agent = KnowledgeAgent()
        print("✅ Agent başarıyla başlatıldı.")
    except Exception as e:
        print(f"❌ Başlatma Hatası: {e}")
        return

    # TEST 1: PubMed
    print("\n------------------------------------------------")
    print("🔬 TEST 1: PubMed Entegrasyonu (Dasatinib & Kalp)")
    print("------------------------------------------------")
    q1 = "Does Dasatinib increase cardiovascular risk?"
    print(f"Soru Soruluyor: {q1} ...")
    
    try:
        ans1 = agent.answer_question(q1)
        print(f"\nCEVAP:\n{ans1[:500]}...\n(Devamı kesildi)")
        
        if "PubMed" in ans1 or "Article" in ans1 or "Ref" in ans1 or "Dasatinib" in ans1:
            print("\n✅ BAŞARILI: Mantıklı bir cevap döndü.")
        else:
            print("\n⚠️ UYARI: Cevap döndü ama kaynak belirtilmemiş olabilir.")
    except Exception as e:
        print(f"❌ PubMed Test Hatası: {e}")

    # TEST 2: PDF (RAG)
    print("\n------------------------------------------------")
    print("📄 TEST 2: PDF RAG Entegrasyonu (Kılavuzlar)")
    print("------------------------------------------------")
    q2 = "What do the guidelines say about initial assessment for CML?"
    print(f"Soru Soruluyor: {q2} ...")
    
    try:
        ans2 = agent.answer_question(q2)
        print(f"\nCEVAP:\n{ans2[:500]}...\n(Devamı kesildi)")
        
        if "Guideline" in ans2 or "Source" in ans2 or "recommend" in ans2.lower():
            print("\n✅ BAŞARILI: PDF/Kılavuz bazlı cevap döndü.")
        else:
            print("\n⚠️ UYARI: Cevap döndü ama PDF kaynağı net değil.")
    except Exception as e:
        print(f"❌ RAG Test Hatası: {e}")

if __name__ == "__main__":
    test_system()