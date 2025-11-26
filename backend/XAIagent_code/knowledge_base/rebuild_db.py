import sys
import os
from dotenv import load_dotenv

def find_and_load_env():
    """
    Bu fonksiyon .env dosyasını bulmak için şu anki klasörden başlayıp
    yukarı doğru (parent directories) arama yapar.
    """
    # Scriptin bulunduğu klasör (backend/knowledge_base)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Kontrol edilecek yollar listesi (Öncelik sırasına göre)
    check_paths = [
        os.path.join(current_dir, '.env'),                                  # 1. knowledge_base/.env
        os.path.join(os.path.dirname(current_dir), '.env'),                 # 2. backend/.env (En muhtemel)
        os.path.join(os.path.dirname(os.path.dirname(current_dir)), '.env') # 3. Root/.env
    ]
    
    env_found = False
    for path in check_paths:
        if os.path.exists(path):
            print(f"✅ Found .env file at: {path}")
            load_dotenv(path)
            env_found = True
            break
            
    if not env_found:
        print("⚠️ WARNING: Could not find .env file in any common directory.")
        print(f"Searched in: {check_paths}")

    # Backend klasörünü Python yoluna ekle (Importların çalışması için)
    # Genelde scriptin 2 üst klasörü Root, 1 üstü Backend'dir.
    backend_dir = os.path.dirname(current_dir)
    sys.path.append(backend_dir)
    
    return backend_dir

# 1. Env dosyasını bul ve yükle
backend_path = find_and_load_env()

# Import RAG Service (Env yüklendikten sonra import edilmeli)
try:
    from knowledge_base.rag_service import RAGService
except ImportError:
    # Eğer path sorunu olursa diye tekrar ekle
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from knowledge_base.rag_service import RAGService

def rebuild():
    print("\n🚀 Starting Database Rebuild Process...")
    
    # API Key Kontrolü (Hala yoksa durdur)
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("\n❌ CRITICAL ERROR: OPENAI_API_KEY still not found!")
        print("Please ensure you have a '.env' file inside the 'backend' folder.")
        print("Content should be: OPENAI_API_KEY=sk-proj-...")
        return

    print("🔑 API Key found. Initializing RAG Service...")

    # Initialize Service (Force OpenAI Embeddings)
    try:
        rag = RAGService(use_openai_embeddings=True)
        print("✅ RAG Service Initialized in OpenAI Mode (Dimension: 1536).")
    except Exception as e:
        print(f"❌ Failed to initialize RAG Service: {e}")
        return
    
    # 1. CLEANUP
    print("\n🗑️  Clearing old database collection...")
    rag.clear_collection()
    
    # 2. REPROCESSING
    print("\n📚 Reprocessing all PDFs with intelligent chunking...")
    rag.process_all_pdfs()
    
    print("\n✅ REBUILD COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    rebuild()