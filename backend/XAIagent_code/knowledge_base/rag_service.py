"""
RAG (Retrieval-Augmented Generation) Service for Clinical Guidelines
Handles PDF processing, embedding, and retrieval of clinical guideline content
"""
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import json

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
from config import OPENAI_API_KEY, OPENAI_MODEL


class RAGService:
    """
    RAG Service for clinical guidelines
    - Processes PDF documents
    - Creates embeddings
    - Stores in vector database
    - Retrieves relevant chunks for queries
    """
    
    def __init__(self, 
                 use_openai_embeddings: bool = True,
                 collection_name: str = "clinical_guidelines"):
        """
        Initialize RAG Service
        
        Args:
            use_openai_embeddings: Use OpenAI embeddings (True) or sentence-transformers (False)
            collection_name: Name of the ChromaDB collection
        """
        self.base_dir = Path(__file__).parent
        self.pdf_dir = self.base_dir / "pdfs"
        self.vector_db_dir = self.base_dir / "vector_db"
        
        # Ensure directories exist
        self.pdf_dir.mkdir(parents=True, exist_ok=True)
        self.vector_db_dir.mkdir(parents=True, exist_ok=True)
        
        self.collection_name = collection_name
        self.use_openai_embeddings = use_openai_embeddings
        
        # Initialize embeddings
        if use_openai_embeddings and OPENAI_AVAILABLE and OPENAI_API_KEY:
            self.embedding_client = OpenAI(api_key=OPENAI_API_KEY)
            self.embedding_model = "text-embedding-3-small"  # Cost-effective
            print("✓ Using OpenAI embeddings")
        elif SENTENCE_TRANSFORMERS_AVAILABLE:
            # Multi-language model that supports Dutch
            self.embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            self.embedding_client = None
            print("✓ Using sentence-transformers (multilingual) embeddings")
        else:
            raise ImportError("No embedding system available. Install openai or sentence-transformers.")
        
        # Initialize vector database
        if not CHROMA_AVAILABLE:
            raise ImportError("ChromaDB not installed. Run: pip install chromadb")
        
        self.client = chromadb.PersistentClient(
            path=str(self.vector_db_dir),
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get or create collection
        try:
            self.collection = self.client.get_collection(name=collection_name)
            print(f"✓ Loaded existing collection: {collection_name}")
        except:
            self.collection = self.client.create_collection(
                name=collection_name,
                metadata={"description": "Clinical guidelines for CVD risk assessment in CML patients"}
            )
            print(f"✓ Created new collection: {collection_name}")
    
    def extract_text_from_pdf(self, pdf_path: Path) -> List[Dict[str, Any]]:
        """
        Extract text from PDF file, preserving page information
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            List of dictionaries with 'text', 'page', 'source' keys
        """
        if not PDF_AVAILABLE:
            raise ImportError("PDF library not available. Install PyPDF2 or pdfplumber")
        
        chunks = []
        
        try:
            if USE_PDFPLUMBER:
                # Use pdfplumber for better text extraction
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
                # Use PyPDF2 as fallback
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
        Split text into overlapping chunks at paragraph level
        
        Args:
            text: Text to chunk
            chunk_size: Target chunk size in characters
            overlap: Overlap between chunks
            
        Returns:
            List of text chunks
        """
        # First, try to split by paragraphs
        paragraphs = text.split('\n\n')
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # If adding this paragraph would exceed chunk size, save current chunk
            if current_chunk and len(current_chunk) + len(para) > chunk_size:
                chunks.append(current_chunk.strip())
                # Start new chunk with overlap
                if overlap > 0 and len(current_chunk) > overlap:
                    current_chunk = current_chunk[-overlap:] + " " + para
                else:
                    current_chunk = para
            else:
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para
        
        # Add remaining chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def create_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Create embeddings for a list of texts
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        if self.use_openai_embeddings and self.embedding_client:
            # Use OpenAI embeddings
            response = self.embedding_client.embeddings.create(
                model=self.embedding_model,
                input=texts
            )
            return [item.embedding for item in response.data]
        else:
            # Use sentence-transformers
            embeddings = self.embedding_model.encode(texts, show_progress_bar=False)
            return embeddings.tolist()
    
    def process_pdf(self, pdf_path: Path, chunk_size: int = 1000) -> int:
        """
        Process a PDF file and add it to the vector database
        
        Args:
            pdf_path: Path to PDF file
            chunk_size: Target chunk size for text splitting
            
        Returns:
            Number of chunks added
        """
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        
        print(f"Processing PDF: {pdf_path.name}")
        
        # Extract text from PDF
        page_chunks = self.extract_text_from_pdf(pdf_path)
        
        if not page_chunks:
            print(f"Warning: No text extracted from {pdf_path.name}")
            return 0
        
        # Further chunk the text
        all_chunks = []
        for page_chunk in page_chunks:
            text_chunks = self.chunk_text(page_chunk['text'], chunk_size=chunk_size)
            for chunk in text_chunks:
                all_chunks.append({
                    'text': chunk,
                    'page': page_chunk['page'],
                    'source': page_chunk['source']
                })
        
        if not all_chunks:
            print(f"Warning: No chunks created from {pdf_path.name}")
            return 0
        
        # Create embeddings
        print(f"Creating embeddings for {len(all_chunks)} chunks...")
        texts = [chunk['text'] for chunk in all_chunks]
        embeddings = self.create_embeddings(texts)
        
        # Prepare metadata
        ids = [f"{pdf_path.stem}_{i}" for i in range(len(all_chunks))]
        metadatas = [
            {
                'source': chunk['source'],
                'page': chunk['page'],
                'chunk_index': i
            }
            for i, chunk in enumerate(all_chunks)
        ]
        
        # Add to collection
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )
        
        print(f"✓ Added {len(all_chunks)} chunks from {pdf_path.name}")
        return len(all_chunks)
    
    def process_all_pdfs(self, chunk_size: int = 1000) -> Dict[str, int]:
        """
        Process all PDF files in the pdfs directory
        
        Args:
            chunk_size: Target chunk size for text splitting
            
        Returns:
            Dictionary mapping PDF names to number of chunks added
        """
        pdf_files = list(self.pdf_dir.glob("*.pdf"))
        
        if not pdf_files:
            print(f"No PDF files found in {self.pdf_dir}")
            return {}
        
        results = {}
        for pdf_path in pdf_files:
            try:
                num_chunks = self.process_pdf(pdf_path, chunk_size=chunk_size)
                results[pdf_path.name] = num_chunks
            except Exception as e:
                print(f"Error processing {pdf_path.name}: {e}")
                results[pdf_path.name] = 0
        
        return results
    
    def retrieve(self, 
                 query: str, 
                 n_results: int = 5,
                 filter_metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Retrieve relevant chunks from the knowledge base
        
        Args:
            query: Search query
            n_results: Number of results to return
            filter_metadata: Optional metadata filters (e.g., {'source': 'guideline.pdf'})
            
        Returns:
            List of dictionaries with 'text', 'source', 'page', 'score' keys
        """
        # Create query embedding
        query_embedding = self.create_embeddings([query])[0]
        
        # Build where clause for filtering
        where = filter_metadata if filter_metadata else None
        
        # Query collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where
        )
        
        # Format results
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
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the collection
        
        Returns:
            Dictionary with collection statistics
        """
        count = self.collection.count()
        
        # Get unique sources
        if count > 0:
            # Sample some documents to get sources
            sample = self.collection.get(limit=min(100, count))
            sources = set()
            if sample['metadatas']:
                for meta in sample['metadatas']:
                    if 'source' in meta:
                        sources.add(meta['source'])
        else:
            sources = set()
        
        return {
            'total_chunks': count,
            'sources': list(sources),
            'num_sources': len(sources)
        }
    
    def clear_collection(self):
        """
        Clear all documents from the collection
        """
        self.client.delete_collection(name=self.collection_name)
        self.collection = self.client.create_collection(
            name=self.collection_name,
            metadata={"description": "Clinical guidelines for CVD risk assessment in CML patients"}
        )
        print(f"✓ Cleared collection: {self.collection_name}")


if __name__ == "__main__":
    # Test the RAG service
    print("Initializing RAG Service...")
    rag = RAGService(use_openai_embeddings=True)
    
    # Process all PDFs
    print("\nProcessing PDFs...")
    results = rag.process_all_pdfs()
    print(f"\nProcessing results: {results}")
    
    # Get stats
    stats = rag.get_collection_stats()
    print(f"\nCollection stats: {stats}")
    
    # Test retrieval
    print("\nTesting retrieval...")
    test_query = "What are the cardiovascular risk factors for CML patients?"
    results = rag.retrieve(test_query, n_results=3)
    print(f"\nRetrieved {len(results)} results:")
    for i, result in enumerate(results, 1):
        print(f"\n{i}. Source: {result['source']}, Page: {result['page']}")
        print(f"   Text: {result['text'][:200]}...")

