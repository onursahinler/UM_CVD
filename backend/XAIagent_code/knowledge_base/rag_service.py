"""
RAG (Retrieval-Augmented Generation) Service for Clinical Guidelines
Fixed: Better chunking logic and duplication prevention
"""
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
import hashlib

# PDF Processing
USE_PDFPLUMBER = False
try:
    import pdfplumber
    PDF_AVAILABLE = True
    USE_PDFPLUMBER = True
except ImportError:
    try:
        import PyPDF2
        PDF_AVAILABLE = True
    except ImportError:
        PDF_AVAILABLE = False

# Vector Database
try:
    import chromadb
    from chromadb.config import Settings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

# Embeddings
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Multi-language support
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))
from config import OPENAI_API_KEY

class RAGService:
    """
    RAG Service for clinical guidelines
    """
    
    def __init__(self, 
                 use_openai_embeddings: bool = True,
                 collection_name: str = "clinical_guidelines"):
        
        self.base_dir = Path(__file__).parent
        self.pdf_dir = self.base_dir / "pdfs"
        self.vector_db_dir = self.base_dir / "vector_db"
        
        self.pdf_dir.mkdir(parents=True, exist_ok=True)
        self.vector_db_dir.mkdir(parents=True, exist_ok=True)
        
        self.collection_name = collection_name
        self.use_openai_embeddings = use_openai_embeddings
        
        # Initialize embeddings
        if use_openai_embeddings and OPENAI_AVAILABLE and OPENAI_API_KEY:
            self.embedding_client = OpenAI(api_key=OPENAI_API_KEY)
            self.embedding_model = "text-embedding-3-small"
            print("✓ Using OpenAI embeddings")
        elif SENTENCE_TRANSFORMERS_AVAILABLE:
            self.embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            self.embedding_client = None
            print("✓ Using sentence-transformers embeddings")
        else:
            raise ImportError("No embedding system available.")
        
        if not CHROMA_AVAILABLE:
            raise ImportError("ChromaDB not installed.")
        
        self.client = chromadb.PersistentClient(
            path=str(self.vector_db_dir),
            settings=Settings(anonymized_telemetry=False)
        )
        
        try:
            self.collection = self.client.get_collection(name=collection_name)
            print(f"✓ Loaded existing collection: {collection_name}")
        except:
            self.collection = self.client.create_collection(
                name=collection_name,
                metadata={"description": "Clinical guidelines for CVD risk assessment"}
            )
            print(f"✓ Created new collection: {collection_name}")
    
    def extract_text_from_pdf(self, pdf_path: Path) -> List[Dict[str, Any]]:
        """Extract text from PDF file."""
        if not PDF_AVAILABLE:
            raise ImportError("PDF library not available.")
        
        chunks = []
        try:
            if USE_PDFPLUMBER:
                with pdfplumber.open(pdf_path) as pdf:
                    for page_num, page in enumerate(pdf.pages, start=1):
                        text = page.extract_text()
                        if text and text.strip():
                            chunks.append({
                                'text': text.strip(),
                                'page': page_num,
                                'source': pdf_path.name
                            })
            else:
                with open(pdf_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page_num, page in enumerate(pdf_reader.pages, start=1):
                        text = page.extract_text()
                        if text and text.strip():
                            chunks.append({
                                'text': text.strip(),
                                'page': page_num,
                                'source': pdf_path.name
                            })
        except Exception as e:
            print(f"Error extracting text from {pdf_path}: {e}")
            return []
        
        return chunks
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """
        Split text into overlapping chunks respecting word boundaries.
        Fixes the issue where words were cut in half.
        """
        if not text:
            return []
            
        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + chunk_size
            
            # If we are not at the end of the text, try to find a natural break point
            if end < text_len:
                # Look for the last period or newline in the chunk window to break safely
                # If not found, look for the last space
                last_period = text.rfind('. ', start, end)
                last_newline = text.rfind('\n', start, end)
                last_space = text.rfind(' ', start, end)
                
                if last_period != -1 and last_period > start + (chunk_size * 0.5):
                    end = last_period + 1
                elif last_newline != -1 and last_newline > start + (chunk_size * 0.5):
                    end = last_newline
                elif last_space != -1:
                    end = last_space
            
            # Extract chunk and clean it
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start pointer forward, subtracting overlap
            # Ensure we don't get stuck in an infinite loop
            step = max(1, end - start - overlap)
            start += step
            
            # Optimization: Snap 'start' to the nearest space to avoid starting with half a word
            if start < text_len:
                 next_space = text.find(' ', start)
                 if next_space != -1 and next_space - start < 20: # Only adjust if space is close
                     start = next_space + 1

        return chunks
    
    def create_embeddings(self, texts: List[str]) -> List[List[float]]:
        if self.use_openai_embeddings and self.embedding_client:
            # Clean newlines which can negatively affect embeddings
            cleaned_texts = [t.replace("\n", " ") for t in texts]
            response = self.embedding_client.embeddings.create(
                model=self.embedding_model,
                input=cleaned_texts
            )
            return [item.embedding for item in response.data]
        else:
            embeddings = self.embedding_model.encode(texts, show_progress_bar=False)
            return embeddings.tolist()
    
    def _is_file_processed(self, filename: str) -> bool:
        """Check if a file has already been processed in the DB."""
        try:
            # Query for just one result with this source
            result = self.collection.get(
                where={"source": filename},
                limit=1
            )
            return len(result['ids']) > 0
        except Exception:
            return False

    def process_pdf(self, pdf_path: Path, chunk_size: int = 1000, force_reprocess: bool = False) -> int:
        """
        Process a PDF file and add it to the vector database.
        Includes duplication check.
        """
        if not pdf_path.exists():
            print(f"Error: PDF not found: {pdf_path}")
            return 0
            
        # Check if already processed
        if not force_reprocess and self._is_file_processed(pdf_path.name):
            print(f"Skipping {pdf_path.name} (already in database)")
            return 0
        
        print(f"Processing PDF: {pdf_path.name}")
        
        # If reprocessing, delete old chunks first
        if force_reprocess and self._is_file_processed(pdf_path.name):
            print(f"Removing old entries for {pdf_path.name}...")
            self.collection.delete(where={"source": pdf_path.name})

        # Extract text
        page_chunks = self.extract_text_from_pdf(pdf_path)
        
        if not page_chunks:
            print(f"Warning: No text extracted from {pdf_path.name}")
            return 0
        
        # Create Chunks
        all_chunks = []
        for page_chunk in page_chunks:
            text_chunks = self.chunk_text(page_chunk['text'], chunk_size=chunk_size)
            for i, chunk in enumerate(text_chunks):
                all_chunks.append({
                    'text': chunk,
                    'page': page_chunk['page'],
                    'source': page_chunk['source'],
                    'chunk_id': i
                })
        
        if not all_chunks:
            return 0
        
        print(f"Creating embeddings for {len(all_chunks)} chunks...")
        
        # Process in batches to avoid API limits
        batch_size = 100
        total_chunks = len(all_chunks)
        
        for i in range(0, total_chunks, batch_size):
            batch = all_chunks[i:i + batch_size]
            texts = [c['text'] for c in batch]
            embeddings = self.create_embeddings(texts)
            
            ids = [f"{pdf_path.stem}_p{c['page']}_{c['chunk_id']}_{i+j}" for j, c in enumerate(batch)]
            metadatas = [
                {'source': c['source'], 'page': c['page']} 
                for c in batch
            ]
            
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas
            )
            print(f"  Processed batch {i//batch_size + 1}/{(total_chunks-1)//batch_size + 1}")
        
        print(f"✓ Successfully added {total_chunks} chunks from {pdf_path.name}")
        return total_chunks
    
    def process_all_pdfs(self, chunk_size: int = 1000) -> Dict[str, int]:
        """Process all PDF files in the pdfs directory"""
        pdf_files = list(self.pdf_dir.glob("*.pdf"))
        
        if not pdf_files:
            print(f"No PDF files found in {self.pdf_dir}")
            return {}
        
        results = {}
        for pdf_path in pdf_files:
            try:
                # Force reprocess set to False to avoid duplication on restart
                num_chunks = self.process_pdf(pdf_path, chunk_size=chunk_size, force_reprocess=False)
                if num_chunks > 0:
                    results[pdf_path.name] = num_chunks
            except Exception as e:
                print(f"Error processing {pdf_path.name}: {e}")
                results[pdf_path.name] = 0
        
        return results
    
    def retrieve(self, 
                 query: str, 
                 n_results: int = 5,
                 filter_metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Retrieve relevant chunks."""
        try:
            query_embedding = self.create_embeddings([query])[0]
            
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=filter_metadata
            )
            
            formatted_results = []
            if results['documents'] and len(results['documents'][0]) > 0:
                for i in range(len(results['documents'][0])):
                    formatted_results.append({
                        'text': results['documents'][0][i],
                        'source': results['metadatas'][0][i].get('source', 'unknown'),
                        'page': results['metadatas'][0][i].get('page', 0),
                        'distance': results['distances'][0][i] if 'distances' in results else None
                    })
            
            return formatted_results
        except Exception as e:
            print(f"Retrieval error: {e}")
            return []

    def clear_collection(self):
        """Clear all documents from the collection"""
        try:
            self.client.delete_collection(name=self.collection_name)
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "Clinical guidelines"}
            )
            print(f"✓ Cleared collection: {self.collection_name}")
        except Exception as e:
            print(f"Error clearing collection: {e}")

if __name__ == "__main__":
    # Testing Code
    if not os.getenv("OPENAI_API_KEY"):
        print("Set OPENAI_API_KEY to test")
    else:
        rag = RAGService()
        
        # 1. Process PDFs (Only new ones)
        print("\n--- Processing PDFs ---")
        rag.process_all_pdfs()
        
        # 2. Test Search
        print("\n--- Testing Search ---")
        # Use a keyword query like our new Agent does
        query = "Dasatinib cardiovascular side effects"
        results = rag.retrieve(query, n_results=3)
        
        for i, res in enumerate(results, 1):
            print(f"\nResult {i} (Source: {res['source']}, Page: {res['page']}):")
            print(f"{res['text'][:200]}...")